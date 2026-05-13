// ============================================================
// timeline.js — Timeline vertical de días con drag & drop
// ============================================================

const Timeline = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  dragState: null,
  ghost: null,

  init() {
    document.getElementById('tl-prev').onclick = () => this.changeMonth(-1);
    document.getElementById('tl-next').onclick = () => this.changeMonth(1);
    document.getElementById('tl-today-btn').onclick = () => this.goToToday();

    // Touch drag handlers
    const container = document.getElementById('timeline-container');
    container.addEventListener('touchstart', (e) => this._touchStart(e), { passive: false });
    container.addEventListener('touchmove', (e) => this._touchMove(e), { passive: false });
    container.addEventListener('touchend', (e) => this._touchEnd(e), { passive: false });
    // Mouse drag
    container.addEventListener('mousedown', (e) => this._mouseDown(e));
    document.addEventListener('mousemove', (e) => this._mouseMove(e));
    document.addEventListener('mouseup', (e) => this._mouseUp(e));
    // Prevent context menu on drag handles
    container.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.tl-card-grip')) e.preventDefault();
    });
  },

  render() {
    this.renderTitle();
    this.renderDays();
    // Scroll to today if it's in the current month
    setTimeout(() => this.scrollToToday(), 100);
  },

  renderTitle() {
    const el = document.getElementById('tl-month-title');
    if (el) el.textContent = UI.formatMonthYear(this.currentYear, this.currentMonth);
  },

  renderDays() {
    const container = document.getElementById('timeline-container');
    if (!container) return;

    const today = storage._todayStr();
    const year = this.currentYear;
    const month = this.currentMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Contenedor horizontal
    container.style.cssText = 'display:flex;flex-direction:row;gap:8px;overflow-x:auto;overflow-y:hidden;padding-bottom:12px;align-items:flex-start;max-height:calc(100vh - 220px);';

    let html = '';
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const d = new Date(year, month, day);
      const dayName = d.toLocaleDateString('es-MX', { weekday: 'short' }).toUpperCase();
      const isToday = dateStr === today;
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const tasks = storage.getTasksByDate(dateStr);
      const pending   = tasks.filter(t => !t.completed).length;
      const completed = tasks.filter(t => t.completed).length;

      html += `
        <div class="tl-col ${isToday ? 'tl-col-today' : ''} ${isWeekend ? 'tl-col-weekend' : ''}"
             id="tl-day-${dateStr}" data-date="${dateStr}">
          <div class="tl-col-header">
            <span class="tl-col-dayname">${dayName}</span>
            <span class="tl-col-daynum ${isToday ? 'tl-today-num' : ''}">${day}</span>
            ${isToday ? '<span class="tl-col-hoy">HOY</span>' : ''}
            <div class="tl-col-badges">
              ${pending   > 0 ? `<span class="tl-badge tl-badge-pending">${pending}</span>`   : ''}
              ${completed > 0 ? `<span class="tl-badge tl-badge-done">${completed}</span>`     : ''}
            </div>
            <button class="tl-add-btn" onclick="app.selectedDate='${dateStr}'; app.navigate('new-task')" title="Nueva tarea">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
          <div class="tl-col-body tl-day-body" data-date="${dateStr}">
            ${tasks.length === 0
              ? '<div class="tl-empty">—</div>'
              : tasks.map(t => this._renderCard(t)).join('')
            }
          </div>
        </div>
      `;
    }

    container.innerHTML = html;

    // Redundante: Ahora usamos onclick directo en el HTML
  },

  _renderCard(task, options = {}) {
    const code = task.code || '---';
    const pColor = UI.priorityColor(task.priority);
    const catIcon = UI.categoryIcon(task.category);
    const hasSubs = task.subtasks && task.subtasks.length > 0;
    const subsDone = hasSubs ? task.subtasks.filter(s => s.completed).length : 0;
    const subsTotal = hasSubs ? task.subtasks.length : 0;
    const progressPct = subsTotal > 0 ? Math.round((subsDone/subsTotal)*100) : 0;
    const tagPills = (task.tags || []).map(tid => {
      const tag = storage.getTag(tid);
      return tag ? `<span class="tag-pill-card"><span style="width:7px;height:7px;border-radius:50%;background:${tag.color};display:inline-block;flex-shrink:0"></span>${this._esc(tag.name)}</span>` : '';
    }).join('');

    const isExpanded = (typeof Tasks !== 'undefined' && Tasks.expandedTaskIds) ? Tasks.expandedTaskIds.has(task.id) : false;

    return `
      <div class="tl-card ${task.completed ? 'tl-completed' : ''} priority-${task.priority}"
           data-task-id="${task.id}" data-date="${task.date}">
        <div class="tl-card-grip" style="pointer-events: auto;"><span style="pointer-events: none;">⠿</span></div>
        ${!hasSubs ? `
          <button class="tl-card-check ${task.completed ? 'checked' : ''}" onclick="event.stopPropagation(); Tasks.toggleTask('${task.id}')">
            ${task.completed ? '✓' : ''}
          </button>
        ` : `
          <button class="subtask-toggle-btn ${progressPct === 100 ? 'all-done' : ''} ${isExpanded ? 'expanded' : ''}" 
                  onclick="event.stopPropagation(); Tasks._toggleSubtaskCollapse(this)"
                  title="${subsDone}/${subsTotal} subtareas completadas">
            <svg class="subtask-toggle-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="pointer-events:none">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
            <svg class="subtask-toggle-ring" width="28" height="28" viewBox="0 0 36 36" style="pointer-events:none">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border)" stroke-width="3"/>
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="${progressPct === 100 ? 'var(--success)' : 'var(--primary)'}" stroke-width="3"
                      stroke-dasharray="${Math.round(progressPct * 0.97)} 100"
                      stroke-linecap="round" transform="rotate(-90 18 18)"
                      style="transition:stroke-dasharray 0.4s"/>
            </svg>
          </button>
        `}
        <div class="tl-card-body" onclick="Tasks.editTask('${task.id}')">
          <div class="tl-card-top">
            <span class="tl-card-code">${code}</span>
            <span class="tl-card-title">${this._esc(task.title)}</span>
          </div>
          <div class="tl-card-meta">
            ${options.showDate ? `<span class="tl-card-date" style="font-size:0.6rem; color:var(--primary-light); font-weight:700; background:rgba(99,102,241,0.1); padding:1px 5px; border-radius:3px; margin-right:6px">📅 ${task.date}</span>` : ''}
            ${task.timeStart ? `<span class="tl-card-time">${task.timeStart}${task.timeEnd ? '-' + task.timeEnd : ''}</span>` : ''}
            ${task.alarm ? '<span class="tl-card-alarm">🔔</span>' : ''}
            <button class="tl-notes-btn ${(task.description || (task.attachments && task.attachments.length > 0)) ? 'has-notes' : 'no-notes'}" 
                    onclick="event.stopPropagation(); Tasks.showNotes('${task.id}')" title="${(task.description || (task.attachments && task.attachments.length > 0)) ? 'Ver/editar notas' : 'Agregar nota'}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events:none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </button>
            <span class="tl-card-priority" style="background:${pColor}" title="${UI.priorityLabel(task.priority)}">${UI.priorityLetter(task.priority)}</span>
            ${tagPills}
          </div>
          ${hasSubs ? `
            <div class="tl-subtask-section ${isExpanded ? '' : 'subtask-collapsed'}">
              <div class="tl-subtask-list">
                ${task.subtasks.map(sub => `
                  <div class="subtask-item ${sub.completed ? 'completed' : ''}" data-subtask-id="${sub.id}">
                    <button class="subtask-check ${sub.completed ? 'checked' : ''}"
                            onclick="event.stopPropagation(); Tasks.toggleSubtask('${task.id}', '${sub.id}')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="pointer-events:none">
                        ${sub.completed ? '<polyline points="20,6 9,17 4,12"/>' : ''}
                      </svg>
                    </button>
                    <span class="subtask-title" onclick="event.stopPropagation(); Tasks.editTask('${task.id}')">${this._esc(sub.title)}</span>
                    <button class="subtask-delete" onclick="event.stopPropagation(); Tasks.deleteSubtask('${task.id}', '${sub.id}')">&times;</button>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
        <div class="tl-card-actions">
          <button onclick="event.stopPropagation(); Tasks.deleteTask('${task.id}')" title="Eliminar">✕</button>
        </div>
      </div>
    `;
  },

  // ---- Navigation ----

  changeMonth(delta) {
    this.currentMonth += delta;
    if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
    if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
    this.render();
  },

  goToToday() {
    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth();
    this.render();
  },

  scrollToToday() {
    const today = storage._todayStr();
    const el = document.getElementById(`tl-day-${today}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  },

  // ==================== TOUCH DRAG & DROP ====================

  _getCard(el) { return el.closest ? el.closest('.tl-card') : null; },

  _touchStart(e) {
    const card = this._getCard(e.target);
    if (!card) return;
    
    if (e.target.closest('.tl-card-grip')) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    this.dragState = {
      el: card, taskId: card.dataset.taskId,
      startX: touch.clientX, startY: touch.clientY,
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
      if (dx > 8 || dy > 8) { clearTimeout(this.dragState.timer); this.dragState = null; }
      return;
    }
    e.preventDefault();
    this._moveDrag(touch.clientX, touch.clientY);
  },

  _touchEnd(e) {
    if (!this.dragState) return;
    clearTimeout(this.dragState.timer);
    if (this.dragState.dragging) {
      this._endDrag(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    }
    this.dragState = null;
  },

  _mouseDown(e) {
    const grip = e.target.closest('.tl-card-grip');
    if (!grip) return;
    const card = this._getCard(e.target);
    if (!card || e.button !== 0) return;
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
    this.ghost.classList.add('tl-drag-ghost');
    this.ghost.style.width = card.offsetWidth + 'px';
    document.body.appendChild(this.ghost);
    this._moveDrag(x, y);
    document.querySelectorAll('.tl-day-body').forEach(z => z.classList.add('tl-drop-zone'));
  },

  _moveDrag(x, y) {
    if (!this.ghost) return;
    this.ghost.style.left = (x - 40) + 'px';
    this.ghost.style.top = (y - 15) + 'px';
    const under = document.elementFromPoint(x, y);
    const newZone = under ? under.closest('.tl-day-body') : null;
    
    if (this._currentHoverZone !== newZone) {
      if (this._currentHoverZone) this._currentHoverZone.classList.remove('tl-drop-hover');
      if (newZone) newZone.classList.add('tl-drop-hover');
      this._currentHoverZone = newZone;
    }

    // Auto-scroll when near edges
    const container = document.getElementById('timeline-container');
    const rect = container.getBoundingClientRect();
    if (y < rect.top + 60) container.scrollTop -= 8;
    if (y > rect.bottom - 60) container.scrollTop += 8;
  },

  _endDrag(x, y) {
    if (this.ghost) { this.ghost.remove(); this.ghost = null; }
    document.querySelectorAll('.tl-card.dragging').forEach(c => c.classList.remove('dragging'));
    document.querySelectorAll('.tl-day-body').forEach(z => z.classList.remove('tl-drop-zone', 'tl-drop-hover'));

    const under = document.elementFromPoint(x, y);
    if (!under || !this.dragState) return;
    const zone = under.closest('.tl-day-body');
    if (!zone) return;

    const newDate = zone.dataset.date;
    const taskId = this.dragState.taskId;
    const task = storage.getTask(taskId);
    if (task && task.date !== newDate) {
      storage.moveTask(taskId, newDate);
      UI.toast(`${task.code || 'Tarea'} → ${UI.formatDateShort(newDate)}`, 'success');
      this.renderDays();
    }
  },

  _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
};
