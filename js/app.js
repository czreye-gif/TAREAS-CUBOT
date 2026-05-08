// ============================================================
// app.js — Controlador principal, router SPA, notificaciones
// ============================================================

const app = {
  currentView: 'today',
  selectedDate: new Date().toISOString().split('T')[0],
  alarmInterval: null,

  init() {
    this.bindNavigation();
    this.bindSidebar();
    this.bindExportImport();
    this.bindFilters();
    try { Tasks.initForm(); }    catch(e) { console.error('Tasks.initForm:', e); }
    try { Calendar.init(); }     catch(e) { console.error('Calendar.init:', e); }
    try { Agenda.init(); }       catch(e) { console.error('Agenda.init:', e); }
    try { Timeline.init(); }     catch(e) { console.error('Timeline.init:', e); }
    try { if (typeof Dashboard !== 'undefined') Dashboard.init(); } catch(e) { console.error('Dashboard.init:', e); }
    try { UI.initDragAndDrop(); } catch(e) { console.error('DragDrop:', e); }
    this.navigate('today');
    this.startAlarmChecker();
    this.requestNotificationPermission();

    // Doble clic en cualquier tarjeta de tarea → editar
    document.addEventListener('dblclick', (e) => {
      const card = e.target.closest('[data-task-id]');
      if (!card) return;
      // Evitar conflicto si hicieron doble clic en un botón de acción
      if (e.target.closest('[data-action], button')) return;
      const taskId = card.dataset.taskId;
      if (taskId) Tasks.editTask(taskId);
    });

    // Clic en ícono de notas → abrir nota (global, cubre todas las vistas)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="show-notes"]');
      if (!btn) return;
      e.stopPropagation();
      e.preventDefault();
      Tasks.showNotes(btn.dataset.id);
    });


    // Handle hash navigation
    window.addEventListener('hashchange', () => {
      const hash = location.hash.slice(1);
      if (hash) this.navigate(hash, true);
    });
  },

  // ---- Navegación ----

  bindNavigation() {
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = btn.dataset.view;
        this.navigate(view);
        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('show');
      });
    });
  },

  bindSidebar() {
    const toggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (toggle) {
      toggle.onclick = () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
      };
    }
    if (overlay) {
      overlay.onclick = () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
      };
    }
  },

  bindExportImport() {
    document.getElementById('btn-export').onclick = () => {
      storage.exportJSON();
      UI.toast('Archivo exportado correctamente', 'success');
    };

    document.getElementById('btn-import').onclick = () => {
      document.getElementById('import-file').click();
    };

    document.getElementById('import-file').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await storage.importJSON(file);
        UI.toast('Datos importados correctamente', 'success');
        this.refreshCurrentView();
      } catch (err) {
        UI.toast(err.message || 'Error al importar', 'error');
      }
      e.target.value = '';
    };
  },

  bindFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Tasks.currentFilter = btn.dataset.filter;
        this.refreshCurrentView();
      };
    });
  },

  navigate(view, fromHash = false) {
    if (view === 'day' && !this.selectedDate) {
      this.selectedDate = storage._todayStr();
    }

    // Handle new-task: reset form
    if (view === 'new-task') {
      Tasks.resetForm();
      const dateInput = document.getElementById('task-date');
      if (dateInput) dateInput.value = storage._todayStr();
    }

    this.currentView = view;
    if (!fromHash) location.hash = view;

    // Update views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const viewEl = document.getElementById(`view-${view}`);
    if (viewEl) {
      viewEl.classList.add('active');
      viewEl.style.animation = 'fadeSlideIn 0.3s ease';
    }

    // Update nav buttons
    document.querySelectorAll('.nav-btn[data-view]').forEach(b => {
      b.classList.toggle('active', b.dataset.view === view);
    });

    // Update mobile title
    const titles = {
      'today': 'Hoy',
      'calendar': 'Calendario',
      'agenda': 'Agenda',
      'day': 'Detalle del Día',
      'new-task': 'Nueva Tarea',
      'tags': 'Etiquetas'
    };
    const mobileTitle = document.getElementById('mobile-title');
    if (mobileTitle) mobileTitle.textContent = titles[view] || 'Tareas';

    // Render view content
    this.renderView(view);
  },

  renderView(view) {
    switch (view) {
      case 'today':
        this.renderToday();
        break;
      case 'calendar':
        Calendar.render();
        break;
      case 'month-list':
        Timeline.render();
        break;
      case 'agenda':
        Agenda._expandedDays = {}; // Resetear: todos los días colapsados al entrar
        Agenda.render();
        break;
      case 'day':
        this.renderDayDetail();
        break;
      case 'new-task':
        Tasks.initForm();
        break;
      case 'tags':
        this.renderTagsView();
        break;
    }
  },

  renderToday() {
    if (typeof Dashboard !== 'undefined') {
      Dashboard.render();
    }
  },

  renderDayDetail() {
    const dateStr = this.selectedDate || storage._todayStr();
    const titleEl = document.getElementById('day-date-title');
    if (titleEl) titleEl.textContent = UI.formatDateLong(dateStr);

    Tasks.renderStats('day-stats', dateStr);
    Tasks.renderTaskList('day-tasks', dateStr);

    // Update back/forward navigation
    const prevBtn = document.getElementById('day-prev');
    const nextBtn = document.getElementById('day-next');
    if (prevBtn) {
      prevBtn.onclick = () => {
        const d = new Date(this.selectedDate + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        this.selectedDate = d.toISOString().split('T')[0];
        this.renderDayDetail();
      };
    }
    if (nextBtn) {
      nextBtn.onclick = () => {
        const d = new Date(this.selectedDate + 'T12:00:00');
        d.setDate(d.getDate() + 1);
        this.selectedDate = d.toISOString().split('T')[0];
        this.renderDayDetail();
      };
    }
  },

  refreshCurrentView() {
    this.renderView(this.currentView);
  },

  _getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días! ☀️';
    if (hour < 18) return '¡Buenas tardes! 🌤️';
    return '¡Buenas noches! 🌙';
  },

  // ---- Gestión de Etiquetas ----

  _tagColors: [
    '#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981',
    '#14b8a6','#06b6d4','#0ea5e9','#3b82f6','#6366f1','#8b5cf6','#a855f7',
    '#d946ef','#ec4899','#f43f5e','#fb7185','#64748b','#78716c'
  ],

  renderTagsView(searchQuery = '') {
    const list = document.getElementById('tags-list');
    const countEl = document.getElementById('tags-count');
    let tags = storage.getAllTags().sort((a, b) => a.name.localeCompare(b.name, 'es'));
    if (!list) return;

    if (countEl) countEl.textContent = tags.length;

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      tags = tags.filter(t => t.name.toLowerCase().includes(q));
    }

    if (tags.length === 0) {
      list.innerHTML = searchQuery
        ? '<p style="color:var(--muted);font-size:0.85rem">No se encontraron etiquetas.</p>'
        : '<p style="color:var(--muted);font-size:0.85rem">No hay etiquetas creadas aún.</p>';
    } else {
      list.innerHTML = tags.map(tag => `
        <div class="tag-manage-item" data-id="${tag.id}">
          <span class="tag-pill" style="background:${tag.color}">${this._escTag(tag.name)}</span>
          <div class="tag-manage-actions">
            <input type="text" class="tag-edit-name" value="${this._escTag(tag.name)}" style="width:120px">
            <input type="color" class="tag-edit-color" value="${tag.color}">
            <button class="btn-tag-save" title="Guardar">💾</button>
            <button class="btn-tag-delete" title="Eliminar">🗑️</button>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('.tag-manage-item').forEach(item => {
        const id = item.dataset.id;
        item.querySelector('.btn-tag-save').onclick = () => {
          const name = item.querySelector('.tag-edit-name').value.trim();
          const color = item.querySelector('.tag-edit-color').value;
          if (name) {
            storage.updateTag(id, { name, color });
            UI.toast('Etiqueta actualizada', 'success');
            this.renderTagsView(document.getElementById('tags-search')?.value || '');
          }
        };
        item.querySelector('.btn-tag-delete').onclick = async () => {
          const ok = await UI.confirm('Eliminar etiqueta', '¿Eliminar esta etiqueta de todas las tareas?');
          if (ok) {
            storage.deleteTag(id);
            UI.toast('Etiqueta eliminada', 'success');
            this.renderTagsView(document.getElementById('tags-search')?.value || '');
          }
        };
      });
    }

    // Create single tag
    const createBtn = document.getElementById('tag-create-btn');
    if (createBtn) {
      createBtn.onclick = () => {
        const name = document.getElementById('tag-name-input').value.trim();
        const color = document.getElementById('tag-color-input').value;
        if (!name) { UI.toast('Escribe un nombre', 'warning'); return; }
        storage.createTag(name, color);
        document.getElementById('tag-name-input').value = '';
        UI.toast('Etiqueta creada', 'success');
        this.renderTagsView();
      };
    }

    // Bulk import
    const bulkBtn = document.getElementById('tag-bulk-btn');
    if (bulkBtn) {
      bulkBtn.onclick = () => this._bulkImportTags();
    }

    // Search
    const searchInput = document.getElementById('tags-search');
    if (searchInput) {
      searchInput.oninput = () => {
        this.renderTagsView(searchInput.value);
      };
    }
  },

  _bulkImportTags() {
    const textarea = document.getElementById('tag-bulk-input');
    const status = document.getElementById('tag-bulk-status');
    if (!textarea) return;
    const raw = textarea.value.trim();
    if (!raw) { UI.toast('Pega tus etiquetas en el área de texto', 'warning'); return; }

    // Parse: split by newlines, then by commas if single line
    let lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    // If only 1 line with commas and no color codes, split by comma
    if (lines.length === 1 && lines[0].includes(',') && !lines[0].includes('#')) {
      lines = lines[0].split(',').map(l => l.trim()).filter(Boolean);
    }

    const existing = storage.getAllTags().map(t => t.name.toLowerCase());
    let created = 0, skipped = 0;

    lines.forEach((line, i) => {
      let name, color;
      // Check for "name, #color" format
      const colorMatch = line.match(/^(.+?),\s*(#[0-9a-fA-F]{3,8})\s*$/);
      if (colorMatch) {
        name = colorMatch[1].trim();
        color = colorMatch[2];
      } else {
        name = line.replace(/,\s*$/, '').trim();
        color = this._tagColors[i % this._tagColors.length];
      }

      if (!name) return;
      if (existing.includes(name.toLowerCase())) {
        skipped++;
        return;
      }

      storage.createTag(name, color);
      existing.push(name.toLowerCase());
      created++;
    });

    textarea.value = '';
    if (status) status.textContent = `✅ ${created} creadas${skipped > 0 ? `, ${skipped} duplicadas omitidas` : ''}`;
    UI.toast(`${created} etiquetas importadas`, 'success');
    this.renderTagsView();
  },

  _escTag(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; },

  // ---- Alarmas / Notificaciones ----

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  },

  startAlarmChecker() {
    // Check every 30 seconds
    this.alarmInterval = setInterval(() => this.checkAlarms(), 30000);
    this.checkAlarms();
  },

  checkAlarms() {
    const alarms = storage.getPendingAlarms();
    alarms.forEach(task => {
      this.showNotification(task);
      // Mark alarm as fired by clearing it
      storage.updateTask(task.id, { alarm: null });
    });
  },

  showNotification(task) {
    // In-app toast
    UI.toast(`🔔 ${task.title}`, 'warning', 6000);

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⏰ Recordatorio de Tarea', {
        body: task.title + (task.description ? '\n' + task.description : ''),
        icon: 'icons/icon-192.png',
        tag: task.id,
        vibrate: [200, 100, 200]
      });
    }
  }
};

// ---- Start app when DOM ready ----
document.addEventListener('DOMContentLoaded', () => app.init());
