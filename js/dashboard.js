// ============================================================
// dashboard.js — Dashboard Diario con buscador mejorado
// ============================================================

const Dashboard = {

  // ── Estado de filtros ──────────────────────────────────────
  filters: {
    query:    '',   // búsqueda universal
    shortcut: null  // 'today' | 'tomorrow' | 'week' | null
  },

  // ── Inicialización ─────────────────────────────────────────
  // ── Mini calendario lateral ────────────────────────────────
  _scYear:  new Date().getFullYear(),
  _scMonth: new Date().getMonth(),

  _initSideCal() {
    const prev = document.getElementById('sc-prev');
    const next = document.getElementById('sc-next');
    const todayBtn = document.getElementById('sc-today-btn');
    if (!prev || !next) return;

    prev.onclick = () => {
      this._scMonth--;
      if (this._scMonth < 0) { this._scMonth = 11; this._scYear--; }
      this._renderSideCal();
    };
    next.onclick = () => {
      this._scMonth++;
      if (this._scMonth > 11) { this._scMonth = 0; this._scYear++; }
      this._renderSideCal();
    };
    if (todayBtn) todayBtn.onclick = () => {
      const now = new Date();
      this._scYear  = now.getFullYear();
      this._scMonth = now.getMonth();
      this._renderSideCal();
      todayBtn.style.background = 'var(--primary,#6366f1)';
      todayBtn.style.color = '#fff';
      todayBtn.style.borderColor = 'var(--primary,#6366f1)';
      setTimeout(() => {
        todayBtn.style.background = 'transparent';
        todayBtn.style.color = 'var(--muted,#888)';
        todayBtn.style.borderColor = 'var(--border,#2a2a4a)';
      }, 800);
    };

    this._renderSideCal();
  },

  _renderSideCal() {
    const label = document.getElementById('sc-month-label');
    const list  = document.getElementById('sc-days');
    if (!label || !list) return;

    const year  = this._scYear;
    const month = this._scMonth;
    const today = storage._todayStr();

    // Nombre del mes
    const monthName = new Date(year, month, 1).toLocaleDateString('es-MX', { month: 'short' }).toUpperCase();
    label.innerHTML = `${monthName}<br><span style="font-size:0.58rem;color:var(--muted,#888);font-weight:400">${year}</span>`;

    // Task counts para el mes
    const taskCounts = storage.getTaskCountByDay(year, month);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const DAYS = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
    let html = '';

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const d       = new Date(year, month, day);
      const dow     = d.getDay(); // 0=dom,6=sab
      const isToday   = dateStr === today;
      const isWeekend = dow === 0 || dow === 6;
      const counts    = taskCounts[day];
      const hasTasks  = counts && counts.total > 0;
      const allDone   = hasTasks && counts.completed === counts.total;

      let indicatorHTML = '';
      if (hasTasks) {
        const dotColor = allDone ? '#10b981' : (counts.pending > 0 ? '#6366f1' : '#f59e0b');
        indicatorHTML = `<span style="width:5px;height:5px;border-radius:50%;background:${dotColor};display:inline-block;flex-shrink:0"></span>`;
      }

      const dayColor = isToday
        ? '#fff'
        : isWeekend ? '#ef4444' : 'var(--text,#e2e8f0)';

      const bg = isToday
        ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
        : 'transparent';

      html += `
        <div onclick="SideCal.select('${dateStr}')" style="
          display:flex;flex-direction:column;align-items:center;
          padding:5px 4px;cursor:pointer;border-radius:8px;
          margin:1px 6px;background:${bg};
          transition:background .15s;position:relative"
          onmouseover="if(!this.classList.contains('sc-today'))this.style.background='rgba(99,102,241,0.15)'"
          onmouseout="if(!this.classList.contains('sc-today'))this.style.background='${isToday?bg:'transparent'}'">
          <span style="font-size:0.55rem;font-weight:700;color:${isToday?'rgba(255,255,255,0.7)':isWeekend?'#ef4444':'var(--muted,#888)'};letter-spacing:.3px">${DAYS[dow]}</span>
          <span style="font-size:1rem;font-weight:${isToday?'800':'500'};color:${dayColor};line-height:1.2">${day}</span>
          <div style="height:6px;display:flex;align-items:center;justify-content:center">
            ${indicatorHTML}
          </div>
        </div>`;
    }

    list.innerHTML = html;

    // Scroll a hoy si está en este mes
    requestAnimationFrame(() => {
      const now = new Date();
      if (year === now.getFullYear() && month === now.getMonth()) {
        const dayEls = list.querySelectorAll('div[onclick]');
        const todayIdx = now.getDate() - 1;
        if (dayEls[todayIdx]) {
          dayEls[todayIdx].scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
    });
  },

  init() {
    this._bindSearch();
    this.setupDragAndDrop();
    this._initSideCal();
    this.render();
  },

  render() {
    this.renderHeader();
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
      const filtered = this._applyFilters(allTasks);
      this._renderFilteredResults(filtered);
      this._renderActiveChips(filtered.length);
      return;
    }

    // Pendientes (más nuevas arriba) → completadas al final
    const sortCompletedLast = (a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      // Dentro del mismo grupo, las más nuevas arriba (createdAt desc)
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    };

    urgentTasks = allTasks.filter(t =>
      (t.date && t.date < todayDate && !t.completed) ||
      (t.date === todayDate && t.priority === 'high' && !t.completed)
    ).sort(sortCompletedLast);
    todayTasks = allTasks.filter(t =>
      t.date === todayDate && !(t.priority === 'high' && !t.completed)
    ).sort(sortCompletedLast);
    tomorrowTasks = allTasks.filter(t => t.date === tomorrowDate).sort(sortCompletedLast);

    this._renderList('dash-urgent-list',   urgentTasks,   'No hay tareas urgentes ni vencidas. 🎉');
    this._renderList('dash-today-list',    todayTasks,    'No hay más tareas para hoy.');
    this._renderList('dash-tomorrow-list', tomorrowTasks, 'No hay tareas programadas para mañana.');
    this._renderActiveChips(null);
    this.bindEvents();
  },

  _renderFilteredResults(tasks) {
    // Cuando hay filtros, mostrar todo en "Mi Día" y vaciar las otras
    const urgentList   = document.getElementById('dash-urgent-list');
    const todayList    = document.getElementById('dash-today-list');
    const tomorrowList = document.getElementById('dash-tomorrow-list');

    // Ordenar: completadas al final, más recientes arriba
    const sorted = [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    if (urgentList)   urgentList.innerHTML   = '';
    if (tomorrowList) tomorrowList.innerHTML = '';

    if (todayList) {
      if (sorted.length === 0) {
        todayList.innerHTML = '<div class="tl-empty" style="text-align:left;padding-left:0">No se encontraron tareas con esos filtros.</div>';
      } else {
        todayList.innerHTML = sorted.map(t => {
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
        <span style="font-size:0.7rem;color:var(--muted)">${t.code||''}</span>
        <span style="${t.completed?'text-decoration:line-through;color:var(--muted)':'color:var(--text,#fff)'}">${t.title}</span>
        <span style="margin-left:auto;font-size:0.75rem;color:var(--muted,#888)">${t.date||''}</span>
      </div>
    </div>`;
  },

  _hasActiveFilters() {
    return !!(this.filters.query || this.filters.shortcut);
  },

  // ── Parsea la query y devuelve filtros aplicables ──
  _parseQuery(query) {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    // Detectar folio (T-1234 o t1234)
    const folioMatch = q.match(/^t-?(\d+)$/i);
    if (folioMatch) {
      return { type: 'folio', value: 't-' + folioMatch[1].padStart(4, '0') };
    }

    // Detectar fecha YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(q)) {
      return { type: 'date', value: q };
    }

    // Palabras de fecha en español
    const today    = storage._todayStr();
    const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('sv-SE');
    const yest     = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE');
    if (q === 'hoy') return { type: 'date', value: today };
    if (q === 'mañana' || q === 'manana') return { type: 'date', value: tomorrow };
    if (q === 'ayer') return { type: 'date', value: yest };

    // Texto libre
    return { type: 'text', value: q };
  },

  _applyFilters(tasks) {
    const { query, shortcut } = this.filters;
    const today    = storage._todayStr();
    const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('sv-SE');
    const weekEnd  = new Date(Date.now() + 6 * 86400000).toLocaleDateString('sv-SE');
    const parsed   = query ? this._parseQuery(query) : null;
    const q        = (query || '').toLowerCase().trim();

    return tasks.filter(t => {
      // Shortcut de fecha
      if (shortcut === 'today'    && t.date !== today)    return false;
      if (shortcut === 'tomorrow' && t.date !== tomorrow) return false;
      if (shortcut === 'week'     && (!t.date || t.date < today || t.date > weekEnd)) return false;

      // Búsqueda universal
      if (q) {
        // Folio exacto: comparar en lowercase de ambos lados
        if (parsed?.type === 'folio') {
          if ((t.code || '').toLowerCase() === parsed.value) return true;
          return false;
        }
        // Fecha exacta
        if (parsed?.type === 'date' && t.date === parsed.value) return true;

        // Buscar en TODOS los campos (cualquier match es válido)
        const inTitle = (t.title || '').toLowerCase().includes(q);
        const inDesc  = (t.description || '').toLowerCase().includes(q);
        const inCode  = (t.code || '').toLowerCase().includes(q);
        const inDate  = (t.date || '').toLowerCase().includes(q);
        const inTags  = (t.tags || []).some(tid => {
          const tag = storage.getTag(tid);
          return tag && tag.name.toLowerCase().includes(q);
        });
        // Fecha en formato legible
        let inDateText = false;
        if (t.date) {
          try {
            const dateLong  = new Date(t.date + 'T12:00:00').toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric', weekday:'long' }).toLowerCase();
            const dateShort = new Date(t.date + 'T12:00:00').toLocaleDateString('es-MX', { day:'numeric', month:'short' }).toLowerCase();
            inDateText = dateLong.includes(q) || dateShort.includes(q);
          } catch {}
        }

        if (!(inTitle || inDesc || inCode || inDate || inTags || inDateText)) return false;
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

    if (this.filters.query) {
      chips.push({ label: `🔍 "${this.filters.query}"`, color: '#3b82f6', remove: () => {
        this.filters.query = '';
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
    }

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

  // ── Binding de la barra única ─────────────────────────────
  _bindSearch() {
    const input  = document.getElementById('dashboard-search');
    const clearX = document.getElementById('clear-text');
    if (input) {
      input.addEventListener('input', () => {
        this.filters.query = input.value.trim();
        if (clearX) clearX.style.display = this.filters.query ? 'block' : 'none';
        this.render();
      });
    }
    if (clearX) clearX.onclick = () => {
      if (input) input.value = '';
      this.filters.query = '';
      clearX.style.display = 'none';
      this.render();
    };

    // Shortcuts de fecha
    document.querySelectorAll('.dsh-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = btn.dataset.shortcut;
        document.querySelectorAll('.dsh-btn').forEach(b => b.classList.remove('active'));
        if (s === 'all') {
          this.filters.shortcut = null;
        } else if (this.filters.shortcut === s) {
          this.filters.shortcut = null;
        } else {
          this.filters.shortcut = s;
          btn.classList.add('active');
        }
        this.render();
      });
    });

    // Limpiar todo
    const clearAll = document.getElementById('search-clear-all');
    if (clearAll) clearAll.onclick = () => this._clearAllFilters();
  },

  _clearAllFilters() {
    this.filters = { query: '', shortcut: null };
    const el = document.getElementById('dashboard-search');
    const c  = document.getElementById('clear-text');
    if (el) el.value = '';
    if (c)  c.style.display = 'none';
    document.querySelectorAll('.dsh-btn').forEach(b => b.classList.remove('active'));
    this.render();
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

// ── SideCal: handler de selección de día ──────────────────
const SideCal = {
  select(dateStr) {
    app.selectedDate = dateStr;
    app.navigate('day');
  }
};

// Re-render del mini cal cuando se regresa a Hoy
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (typeof Dashboard !== 'undefined') Dashboard._renderSideCal();
  }, 80);
});
