// ============================================================
// dashboard.js — Dashboard Diario con buscador mejorado
// ============================================================

const Dashboard = {

  // ── Estado de filtros ──────────────────────────────────────
  filters: {
    text:     '',   // búsqueda libre por título/descripción
    date:     null, // 'YYYY-MM-DD' exacto
    tagIds:   [],   // IDs de etiquetas seleccionadas (AND)
    shortcut: null  // 'today' | 'tomorrow' | 'week' | null
  },

  // ── Inicialización ─────────────────────────────────────────
  init() {
    this._bindSearch();
    this.setupDragAndDrop();
    this.render();
  },

  render() {
    this.renderHeader();
    this.renderRatios();
    this.renderTaskLists();
  },

  // ── Cabecera con saludo y fecha ────────────────────────────
  renderHeader() {
    const d    = new Date();
    const hour = d.getHours();
    let greeting = 'Buenos días';
    if (hour >= 12 && hour < 19) greeting = 'Buenas tardes';
    if (hour >= 19)               greeting = 'Buenas noches';

    const fechaLarga = d.toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const subtitle = document.getElementById('today-greeting');
    if (subtitle) subtitle.textContent = `${greeting}, hoy es ${fechaLarga}`;
  },

  // ── KPIs / ratios ──────────────────────────────────────────
  renderRatios() {
    const todayDate = storage._todayStr();
    const allTasks  = storage.getAllTasks();
    const todayTasks = allTasks.filter(t => t.date === todayDate);

    const totalToday     = todayTasks.length;
    const completedToday = todayTasks.filter(t => t.completed).length;
    const overdueTasks   = allTasks.filter(t => t.date && t.date < todayDate && !t.completed);
    const highPriority   = todayTasks.filter(t => t.priority === 'high' && !t.completed);

    const progress = totalToday === 0 ? 0 : Math.round((completedToday / totalToday) * 100);

    const circle  = document.getElementById('dash-circle-progress');
    const textProg = document.getElementById('dash-text-progress');
    const subProg  = document.getElementById('dash-ratio-subtitle');
    if (circle)   circle.setAttribute('stroke-dasharray', `${progress}, 100`);
    if (textProg) textProg.textContent = `${progress}%`;
    if (subProg)  subProg.textContent  = `${completedToday} / ${totalToday} completadas`;

    const elOverdue = document.getElementById('dash-stat-overdue');
    const elHigh    = document.getElementById('dash-stat-high');
    const elDone    = document.getElementById('dash-stat-done');
    if (elOverdue) elOverdue.textContent = overdueTasks.length;
    if (elHigh)    elHigh.textContent    = highPriority.length;
    if (elDone)    elDone.textContent    = completedToday;
  },

  // ── Listas de tareas con filtros aplicados ─────────────────
  renderTaskLists() {
    const todayDate    = storage._todayStr();
    const tomorrowDate = new Date(Date.now() + 86400000).toLocaleDateString('sv-SE');
    const allTasks     = storage.getAllTasks();
    const hasFilters   = this._hasActiveFilters();

    let urgentTasks, todayTasks, tomorrowTasks;

    if (hasFilters) {
      // Con filtros: buscar en TODAS las tareas y mostrar en una sola sección
      const filtered = this._applyFilters(allTasks);
      this._renderFilteredResults(filtered);
      this._renderActiveChips(filtered.length);
      return;
    }

    // Sin filtros: vista normal por columnas
    urgentTasks   = allTasks.filter(t =>
      (t.date && t.date < todayDate && !t.completed) ||
      (t.date === todayDate && t.priority === 'high' && !t.completed)
    );
    todayTasks    = allTasks.filter(t =>
      t.date === todayDate && !(t.priority === 'high' && !t.completed)
    );
    tomorrowTasks = allTasks.filter(t => t.date === tomorrowDate);

    this._renderList('dash-urgent-list',   urgentTasks,   'No hay tareas urgentes ni vencidas. 🎉');
    this._renderList('dash-today-list',    todayTasks,    'No hay más tareas para hoy.');
    this._renderList('dash-tomorrow-list', tomorrowTasks, 'No hay tareas programadas para mañana.');
    this._renderActiveChips(null);
    this.bindEvents();
  },

  _renderFilteredResults(tasks) {
    // Ocultar columna mañana y mostrar todos los resultados en "Mi Día"
    const urgentList   = document.getElementById('dash-urgent-list');
    const todayList    = document.getElementById('dash-today-list');
    const tomorrowList = document.getElementById('dash-tomorrow-list');

    if (urgentList)   urgentList.innerHTML   = '';
    if (tomorrowList) tomorrowList.innerHTML = '';

    if (todayList) {
      if (tasks.length === 0) {
        todayList.innerHTML = '<div class="tl-empty" style="text-align:left;padding-left:0">No se encontraron tareas con esos filtros.</div>';
      } else {
        todayList.innerHTML = tasks.map(t => {
          try { return typeof Timeline !== 'undefined' ? Timeline._renderCard(t) : this._simpleCard(t); }
          catch(e) { return this._simpleCard(t); }
        }).join('');
      }
    }
    this.bindEvents();
  },

  _renderList(containerId, tasks, emptyMsg) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (tasks.length === 0) {
      el.innerHTML = `<div class="tl-empty" style="text-align:left;padding-left:0">${emptyMsg}</div>`;
    } else {
      el.innerHTML = tasks.map(t => {
        try { return typeof Timeline !== 'undefined' ? Timeline._renderCard(t) : this._simpleCard(t); }
        catch(e) { return this._simpleCard(t); }
      }).join('');
    }
  },

  _simpleCard(t) {
    return `<div class="tl-card" data-task-id="${t.id}" style="padding:10px 14px;margin-bottom:8px;border-radius:10px;background:var(--surface,#1e1e2e);border:1px solid var(--border,#2a2a4a);">
      <div style="display:flex;align-items:center;gap:10px">
        <button data-action="toggle" data-id="${t.id}" style="background:none;border:2px solid var(--primary,#6366f1);border-radius:50%;width:20px;height:20px;cursor:pointer;flex-shrink:0;${t.completed?'background:var(--primary,#6366f1)':''}"></button>
        <span style="${t.completed?'text-decoration:line-through;color:var(--muted)':'color:var(--text,#fff)'}">${t.title}</span>
        <span style="margin-left:auto;font-size:0.75rem;color:var(--muted,#888)">${t.date||''}</span>
      </div>
    </div>`;
  },

  // ── Lógica de filtros ──────────────────────────────────────
  _hasActiveFilters() {
    const { text, date, tagIds, shortcut } = this.filters;
    return !!(text || date || tagIds.length > 0 || shortcut);
  },

  _applyFilters(tasks) {
    const { text, date, tagIds, shortcut } = this.filters;
    const today    = storage._todayStr();
    const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('sv-SE');
    const weekEnd  = new Date(Date.now() + 6 * 86400000).toLocaleDateString('sv-SE');

    return tasks.filter(t => {
      // Texto libre
      if (text) {
        const inTitle = t.title?.toLowerCase().includes(text);
        const inDesc  = t.description?.toLowerCase().includes(text);
        if (!inTitle && !inDesc) return false;
      }
      // Fecha exacta
      if (date && t.date !== date) return false;
      // Shortcuts
      if (shortcut === 'today'    && t.date !== today)                         return false;
      if (shortcut === 'tomorrow' && t.date !== tomorrow)                      return false;
      if (shortcut === 'week'     && (!t.date || t.date < today || t.date > weekEnd)) return false;
      // Etiquetas (debe tener TODAS)
      if (tagIds.length > 0) {
        const taskTags = t.tags || [];
        if (!tagIds.every(id => taskTags.includes(id))) return false;
      }
      return true;
    });
  },

  // ── Chips de filtros activos + contador ───────────────────
  _renderActiveChips(resultCount) {
    const container = document.getElementById('search-active-chips');
    const countEl   = document.getElementById('search-results-count');
    const clearAll  = document.getElementById('search-clear-all');
    if (!container) return;

    const chips = [];

    if (this.filters.text) {
      chips.push({ label: `"${this.filters.text}"`, color: '#3b82f6', remove: () => {
        this.filters.text = '';
        const el = document.getElementById('dashboard-search');
        const c  = document.getElementById('clear-text');
        if (el) el.value = '';
        if (c)  c.style.display = 'none';
      }});
    }

    const shortcutLabels = { today: 'Hoy', tomorrow: 'Mañana', week: 'Esta semana' };
    if (this.filters.shortcut) {
      chips.push({ label: shortcutLabels[this.filters.shortcut], color: '#8b5cf6', remove: () => {
        this.filters.shortcut = null;
        document.querySelectorAll('.dsh-btn').forEach(b => b.classList.remove('active'));
      }});
    } else if (this.filters.date) {
      const label = new Date(this.filters.date + 'T12:00:00')
        .toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
      chips.push({ label, color: '#8b5cf6', remove: () => {
        this.filters.date = null;
        const el = document.getElementById('dashboard-date-filter');
        const c  = document.getElementById('clear-date');
        if (el) el.value = '';
        if (c)  c.style.display = 'none';
      }});
    }

    this.filters.tagIds.forEach(id => {
      const tag = storage.getTag(id);
      if (!tag) return;
      chips.push({ label: `🏷 ${tag.name}`, color: tag.color, remove: () => {
        this.filters.tagIds = this.filters.tagIds.filter(x => x !== id);
        const c = document.getElementById('clear-tags');
        if (c) c.style.display = this.filters.tagIds.length ? 'block' : 'none';
      }});
    });

    const hasFilters = chips.length > 0;
    if (clearAll) clearAll.style.display = hasFilters ? 'inline-block' : 'none';

    container.innerHTML = chips.map((chip, i) => `
      <span class="active-filter-chip" style="background:${chip.color}22;border:1px solid ${chip.color}66;color:${chip.color}">
        ${chip.label}
        <span class="chip-remove" data-chip="${i}" style="cursor:pointer;margin-left:2px;opacity:.8"> ×</span>
      </span>`).join('');

    container.querySelectorAll('.chip-remove').forEach(btn => {
      btn.onclick = () => { chips[parseInt(btn.dataset.chip)].remove(); this.render(); };
    });

    if (countEl) {
      if (hasFilters && resultCount !== null) {
        countEl.textContent  = `${resultCount} resultado${resultCount !== 1 ? 's' : ''}`;
        countEl.style.display = 'inline';
      } else {
        countEl.style.display = 'none';
      }
    }
  },

  // ── Binding de controles de búsqueda ──────────────────────
  _bindSearch() {
    // Texto libre
    const textInput = document.getElementById('dashboard-search');
    const clearText = document.getElementById('clear-text');
    if (textInput) {
      textInput.addEventListener('input', () => {
        this.filters.text = textInput.value.trim().toLowerCase();
        if (clearText) clearText.style.display = this.filters.text ? 'block' : 'none';
        this.render();
      });
    }
    if (clearText) clearText.onclick = () => {
      if (textInput) textInput.value = '';
      this.filters.text = '';
      clearText.style.display = 'none';
      this.render();
    };

    // Fecha exacta
    const dateInput = document.getElementById('dashboard-date-filter');
    const clearDate = document.getElementById('clear-date');
    if (dateInput) {
      dateInput.addEventListener('change', () => {
        this.filters.date     = dateInput.value || null;
        this.filters.shortcut = null;
        document.querySelectorAll('.dsh-btn').forEach(b => b.classList.remove('active'));
        if (clearDate) clearDate.style.display = this.filters.date ? 'block' : 'none';
        this.render();
      });
    }
    if (clearDate) clearDate.onclick = () => {
      if (dateInput) dateInput.value = '';
      this.filters.date = null;
      clearDate.style.display = 'none';
      this.render();
    };

    // Shortcuts de fecha
    document.querySelectorAll('.dsh-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = btn.dataset.shortcut;
        document.querySelectorAll('.dsh-btn').forEach(b => b.classList.remove('active'));

        if (s === 'all') {
          this.filters.shortcut = null;
          this.filters.date     = null;
          if (dateInput) dateInput.value = '';
          if (clearDate) clearDate.style.display = 'none';
        } else if (this.filters.shortcut === s) {
          this.filters.shortcut = null; // toggle off
        } else {
          this.filters.shortcut = s;
          this.filters.date     = null;
          if (dateInput) dateInput.value = '';
          if (clearDate) clearDate.style.display = 'none';
          btn.classList.add('active');
        }
        this.render();
      });
    });

    // Etiquetas con autocompletado
    this._bindTagSearch();

    // Limpiar todo
    const clearAll = document.getElementById('search-clear-all');
    if (clearAll) clearAll.onclick = () => this._clearAllFilters();
  },

  _bindTagSearch() {
    const input    = document.getElementById('dashboard-tag-search');
    const dropdown = document.getElementById('tag-search-dropdown');
    const clearBtn = document.getElementById('clear-tags');
    if (!input || !dropdown) return;

    const show = (query) => {
      const all     = storage.getAllTags();
      const q       = query.toLowerCase().trim();
      const matches = q ? all.filter(t => t.name.toLowerCase().includes(q)) : all;

      if (matches.length === 0) { dropdown.style.display = 'none'; return; }

      dropdown.innerHTML = matches.map(tag => {
        const active = this.filters.tagIds.includes(tag.id);
        return `<div class="tag-drop-item" data-tag-id="${tag.id}">
          <span class="tag-dot" style="background:${tag.color}"></span>
          <span>${tag.name}</span>
          ${active ? '<span class="tag-drop-check" style="margin-left:auto;color:var(--primary,#6366f1)">✓</span>' : ''}
        </div>`;
      }).join('');
      dropdown.style.display = 'block';

      dropdown.querySelectorAll('.tag-drop-item').forEach(item => {
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          const id = item.dataset.tagId;
          this.filters.tagIds = this.filters.tagIds.includes(id)
            ? this.filters.tagIds.filter(x => x !== id)
            : [...this.filters.tagIds, id];
          input.value = '';
          dropdown.style.display = 'none';
          if (clearBtn) clearBtn.style.display = this.filters.tagIds.length ? 'block' : 'none';
          this.render();
        });
      });
    };

    input.addEventListener('input', () => show(input.value));
    input.addEventListener('focus', () => show(input.value));
    input.addEventListener('blur',  () => setTimeout(() => { dropdown.style.display = 'none'; }, 200));
    if (clearBtn) clearBtn.onclick = () => {
      input.value          = '';
      this.filters.tagIds  = [];
      clearBtn.style.display = 'none';
      dropdown.classList.remove('show');
      this.render();
    };
  },

  _clearAllFilters() {
    this.filters = { text: '', date: null, tagIds: [], shortcut: null };
    ['dashboard-search', 'dashboard-date-filter', 'dashboard-tag-search'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['clear-text', 'clear-date', 'clear-tags'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    document.querySelectorAll('.dsh-btn').forEach(b => b.classList.remove('active'));
    this.render();
  },

  // ── Eventos de tarjetas ────────────────────────────────────
  bindEvents() {
    ['dash-urgent-list', 'dash-today-list', 'dash-tomorrow-list'].forEach(listId => {
      const container = document.getElementById(listId);
      if (!container) return;

      // Hacer tarjetas arrastrables
      container.querySelectorAll('.tl-card').forEach(card => {
        card.setAttribute('draggable', 'true');
        card.style.cursor = 'grab';
      });

      // Acciones de botones
      container.querySelectorAll('[data-action]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const { action, id } = btn.dataset;
          if (action === 'toggle')     Tasks.toggleTask(id);
          if (action === 'edit')       Tasks.editTask(id);
          if (action === 'delete')     Tasks.deleteTask(id);
          if (action === 'show-notes') Tasks.showNotes(id);
        };
      });
    });

    // Re-inicializar drop zones (por si se re-renderizó)
    document.querySelectorAll('.drop-zone').forEach(zone => {
      zone.ondragover = (e) => { e.preventDefault(); zone.classList.add('dash-drop-hover'); };
      zone.ondragleave = () => zone.classList.remove('dash-drop-hover');
      zone.ondrop = (e) => {
        e.preventDefault();
        zone.classList.remove('dash-drop-hover');
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) this.handleDrop(taskId, zone.dataset.zone);
      };
    });
  },

  // ── Drag & drop ───────────────────────────────────────────
  setupDragAndDrop() {
    document.addEventListener('dragstart', e => {
      const card = e.target.closest('.tl-card');
      if (!card || !card.dataset.taskId) return;
      e.dataTransfer.setData('text/plain', card.dataset.taskId);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });
    document.addEventListener('dragend', e => {
      const card = e.target.closest('.tl-card');
      if (card) card.classList.remove('dragging');
    });
  },

  handleDrop(taskId, zoneName) {
    const task = storage.getTask(taskId);
    if (!task) return;
    const targetDate = zoneName === 'tomorrow'
      ? new Date(Date.now() + 86400000).toLocaleDateString('sv-SE')
      : storage._todayStr();
    if (task.date !== targetDate) {
      storage.moveTask(taskId, targetDate);
      UI.toast(`Tarea movida a ${zoneName === 'today' ? 'Hoy' : 'Mañana'}`, 'success');
      this.render();
    }
  }
};

// ── Auto-init independiente ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => Dashboard.init(), 50);
});
