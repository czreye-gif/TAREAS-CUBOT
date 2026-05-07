// ============================================================
// agenda.js — Vista de agenda semanal con columnas verticales
//             Drag & drop táctil entre días
// ============================================================

const Agenda = {
  startDate: null, // first visible date
  daysVisible: 7,
  dragState: null,
  ghost: null,

  init() {
    // Default to current week (Monday start)
    const now = new Date();
    const dow = now.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    this.startDate = new Date(now);
    this.startDate.setDate(now.getDate() + mondayOffset);

    document.getElementById('agenda-prev').onclick = () => this.shiftDays(-7);
    document.getElementById('agenda-next').onclick = () => this.shiftDays(7);
    document.getElementById('agenda-today-btn').onclick = () => {
      this.init(); // reset to current week
      this.render();
    };

    // Touch drag handlers for agenda
    const container = document.getElementById('agenda-columns');
    container.addEventListener('touchstart', (e) => this._touchStart(e), { passive: false });
    container.addEventListener('touchmove', (e) => this._touchMove(e), { passive: false });
    container.addEventListener('touchend', (e) => this._touchEnd(e), { passive: false });

    // Mouse drag
    container.addEventListener('mousedown', (e) => this._mouseDown(e));
    document.addEventListener('mousemove', (e) => this._mouseMove(e));
    document.addEventListener('mouseup', (e) => this._mouseUp(e));
  },

  render() {
    const container = document.getElementById('agenda-columns');
    if (!container) return;

    // Layout horizontal: filas por día, tareas en línea
    container.style.cssText = 'display:flex;flex-direction:column;gap:6px;overflow-y:auto;max-height:calc(100vh - 200px);';

    const today = storage._todayStr();
    let html = '';

    for (let i = 0; i < this.daysVisible; i++) {
      const d = new Date(this.startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toLocaleDateString("sv-SE");
      const isToday = dateStr === today;
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const dayName = d.toLocaleDateString("es-MX", { weekday: "short" }).toUpperCase();
      const dayNum  = d.getDate();
      const monthName = d.toLocaleDateString("es-MX", { month: "short" });
      const tasks   = storage.getTasksByDate(dateStr);
      const pending = tasks.filter(t => !t.completed).length;

      html += `
        <div class="agenda-row ${isToday ? "agenda-row-today" : ""} ${isWeekend ? "agenda-row-weekend" : ""}" data-date="${dateStr}">
          <div class="agenda-row-label">
            <div class="agenda-row-dayname">${dayName}</div>
            <div class="agenda-row-daynum ${isToday ? "agenda-row-today-num" : ""}">${dayNum}</div>
            <div class="agenda-row-month">${monthName}</div>
            ${pending > 0 ? `<span class="agenda-row-badge">${pending}</span>` : ""}
          </div>
          <div class="agenda-row-tasks" data-date="${dateStr}">
            ${tasks.length === 0
              ? '<span class="agenda-row-empty">Sin tareas</span>'
              : tasks.map(t => this._renderRowCard(t)).join("")
            }
            <button class="agenda-row-add" onclick="app.selectedDate=\'${dateStr}\'; app.navigate(\'new-task\')" title="Nueva tarea">+</button>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;

    const endD = new Date(this.startDate);
    endD.setDate(endD.getDate() + this.daysVisible - 1);
    const label = document.getElementById("agenda-range-label");
    if (label) {
      label.textContent = `${UI.formatDateShort(this.startDate.toLocaleDateString("sv-SE"))} — ${UI.formatDateShort(endD.toLocaleDateString("sv-SE"))}`;
    }

    this._bindDragAndDrop();
  },

  _renderRowCard(task) {
    const pColor = UI.priorityColor(task.priority);
    const tagPills = (task.tags || []).map(tid => {
      const tag = storage.getTag(tid);
      return tag ? `<span class="tag-pill-card"><span style="width:7px;height:7px;border-radius:50%;background:${tag.color};display:inline-block;flex-shrink:0"></span>${tag.name}</span>` : "";
    }).join("");

    return `
      <div class="agenda-row-card ${task.completed ? "agenda-row-done" : ""}"
           data-task-id="${task.id}" data-date="${task.date}"
           style="border-left:3px solid ${pColor};cursor:grab"
           draggable="true">
        <div class="agenda-row-card-inner">
          ${task.timeStart ? `<span class="agenda-row-time">${task.timeStart}</span>` : ""}
          <span class="agenda-row-title">${this._esc(task.title)}</span>
          ${tagPills}
        </div>
      </div>
    `;
  },

  _bindDragAndDrop() {
    // Dragstart en tarjetas
    document.querySelectorAll('.agenda-row-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.dataset.taskId);
        e.dataTransfer.effectAllowed = 'move';
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
    });

    // Drop zones en cada fila de tareas
    document.querySelectorAll('.agenda-row-tasks').forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('agenda-drop-hover');
      });
      zone.addEventListener('dragleave', () => zone.classList.remove('agenda-drop-hover'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('agenda-drop-hover');
        const taskId = e.dataTransfer.getData('text/plain');
        const newDate = zone.dataset.date;
        if (!taskId || !newDate) return;
        const task = storage.getTask(taskId);
        if (task && task.date !== newDate) {
          storage.moveTask(taskId, newDate);
          UI.toast(`Tarea movida al ${UI.formatDateShort(newDate)}`, 'success');
          this.render();
        }
      });
    });
  },

  shiftDays(n) {
    this.startDate.setDate(this.startDate.getDate() + n);
    this.render();
  },

  // ==================== TOUCH DRAG & DROP ====================

  _getCard(el) {
    return el.closest ? el.closest('.agenda-card') : null;
  },

  _touchStart(e) {
    const card = this._getCard(e.target);
    if (!card) return;
    const touch = e.touches[0];
    this.dragState = {
      el: card,
      taskId: card.dataset.taskId,
      startX: touch.clientX,
      startY: touch.clientY,
      dragging: false,
      timer: setTimeout(() => {
        this.dragState.dragging = true;
        this._startDrag(card, touch.clientX, touch.clientY);
        navigator.vibrate && navigator.vibrate(50);
      }, 350)
    };
  },

  _touchMove(e) {
    if (!this.dragState) return;
    const touch = e.touches[0];
    if (!this.dragState.dragging) {
      const dx = Math.abs(touch.clientX - this.dragState.startX);
      const dy = Math.abs(touch.clientY - this.dragState.startY);
      if (dx > 8 || dy > 8) {
        clearTimeout(this.dragState.timer);
        this.dragState = null;
      }
      return;
    }
    e.preventDefault();
    this._moveDrag(touch.clientX, touch.clientY);
  },

  _touchEnd(e) {
    if (!this.dragState) return;
    clearTimeout(this.dragState.timer);
    if (this.dragState.dragging) {
      const touch = e.changedTouches[0];
      this._endDrag(touch.clientX, touch.clientY);
    }
    this.dragState = null;
  },

  _mouseDown(e) {
    const card = this._getCard(e.target);
    if (!card) return;
    // Only drag on left click
    if (e.button !== 0) return;
    e.preventDefault();
    this.dragState = { el: card, taskId: card.dataset.taskId, dragging: true };
    this._startDrag(card, e.clientX, e.clientY);
  },

  _mouseMove(e) {
    if (!this.dragState || !this.dragState.dragging) return;
    e.preventDefault();
    this._moveDrag(e.clientX, e.clientY);
  },

  _mouseUp(e) {
    if (!this.dragState || !this.dragState.dragging) return;
    this._endDrag(e.clientX, e.clientY);
    this.dragState = null;
  },

  _startDrag(card, x, y) {
    card.classList.add('dragging');
    this.ghost = card.cloneNode(true);
    this.ghost.classList.add('agenda-drag-ghost');
    this.ghost.style.width = card.offsetWidth + 'px';
    document.body.appendChild(this.ghost);
    this._moveDrag(x, y);

    // Mark all columns as drop targets
    document.querySelectorAll('.agenda-col-body').forEach(col => {
      col.classList.add('drop-zone');
    });
  },

  _moveDrag(x, y) {
    if (!this.ghost) return;
    this.ghost.style.left = (x - 30) + 'px';
    this.ghost.style.top = (y - 15) + 'px';

    // Highlight column under cursor
    document.querySelectorAll('.agenda-col-body.drop-hover').forEach(c => c.classList.remove('drop-hover'));
    const elUnder = document.elementFromPoint(x, y);
    if (elUnder) {
      const col = elUnder.closest('.agenda-col-body');
      if (col) col.classList.add('drop-hover');
    }
  },

  _endDrag(x, y) {
    // Cleanup ghost
    if (this.ghost) {
      this.ghost.remove();
      this.ghost = null;
    }
    // Cleanup classes
    document.querySelectorAll('.agenda-card.dragging').forEach(c => c.classList.remove('dragging'));
    document.querySelectorAll('.agenda-col-body').forEach(col => {
      col.classList.remove('drop-zone', 'drop-hover');
    });

    // Find drop target
    const elUnder = document.elementFromPoint(x, y);
    if (!elUnder || !this.dragState) return;
    const col = elUnder.closest('.agenda-col-body');
    if (!col) return;

    const newDate = col.dataset.date;
    const taskId = this.dragState.taskId;
    const task = storage.getTask(taskId);

    if (task && task.date !== newDate) {
      storage.moveTask(taskId, newDate);
      UI.toast(`${task.code || 'Tarea'} → ${UI.formatDateShort(newDate)}`, 'success');
      this.render();
    }
  },

  _esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
};
