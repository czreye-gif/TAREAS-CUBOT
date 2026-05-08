// ============================================================
// app.js — Controlador principal, router SPA, notificaciones
// ============================================================

const app = {
  currentView: 'today',
  selectedDate: new Date().toISOString().split('T')[0],
  alarmInterval: null,

  init() {
    console.log("App: Iniciando...");
    
    // 1. Vincular Tema (Lo primero para evitar saltos de color)
    this.bindTheme();

    // 2. Vincular Sidebar y Navegación
    try { this.bindSidebar(); } catch(e) { console.error("App: Error bindSidebar", e); }
    try { this.bindNavigation(); } catch(e) { console.error("App: Error bindNavigation", e); }
    try { this.bindExportImport(); } catch(e) { console.error("App: Error bindExportImport", e); }
    try { this.bindFilters(); } catch(e) { console.error("App: Error bindFilters", e); }
    
    // 3. Inicializar módulos externos
    try { if (typeof Tasks !== 'undefined') Tasks.initForm(); } catch(e) { console.error("App: Error Tasks.initForm", e); }
    try { if (typeof Calendar !== 'undefined') Calendar.init(); } catch(e) { console.error("App: Error Calendar.init", e); }
    try { if (typeof Agenda !== 'undefined') Agenda.init(); } catch(e) { console.error("App: Error Agenda.init", e); }
    try { if (typeof Timeline !== 'undefined') Timeline.init(); } catch(e) { console.error("App: Error Timeline.init", e); }
    try { if (typeof Dashboard !== 'undefined') Dashboard.init(); } catch(e) { console.error("App: Error Dashboard.init", e); }
    try { if (typeof UI !== 'undefined') UI.initDragAndDrop(); } catch(e) { console.error("App: Error UI.initDragAndDrop", e); }
    
    // 4. Inicializar Editor y Notas
    try {
      if (typeof RichEditor !== 'undefined') {
        RichEditor.init('#task-description', '#main-editor-toolbar');
      }
    } catch(e) { console.error("App: Error RichEditor.init", e); }
    try { if (typeof Notes !== 'undefined') Notes.init(); } catch(e) { console.error("App: Error Notes.init", e); }

    // 5. Configuración final
    this.navigate('today');
    this.startAlarmChecker();
    this.requestNotificationPermission();

    // 6. Eventos globales
    this.bindGlobalEvents();

    // 7. Sidebar colapsado por defecto
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.add('collapsed');

    console.log("App: Lista y operativa.");
  },

  bindTheme() {
    const themeBtn = document.getElementById('btn-theme-toggle');
    const iconSun = document.getElementById('icon-theme-sun');
    const iconMoon = document.getElementById('icon-theme-moon');
    const themeLabel = document.getElementById('theme-label');

    const applyTheme = (theme) => {
      const isLight = theme === 'light';
      const root = document.documentElement;
      if (isLight) {
        root.classList.add('light-theme');
        if (iconSun) iconSun.style.display = 'none';
        if (iconMoon) iconMoon.style.display = 'block';
        if (themeLabel) themeLabel.textContent = 'Modo Noche';
      } else {
        root.classList.remove('light-theme');
        if (iconSun) iconSun.style.display = 'block';
        if (iconMoon) iconMoon.style.display = 'none';
        if (themeLabel) themeLabel.textContent = 'Modo Día';
      }
      localStorage.setItem('theme', theme);
    };

    if (themeBtn) {
      themeBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isLight = document.documentElement.classList.contains('light-theme');
        const next = isLight ? 'dark' : 'light';
        applyTheme(next);
        if (typeof UI !== 'undefined' && UI.toast) {
          UI.toast(`Modo ${next === 'light' ? 'Día' : 'Noche'} activado`, 'info');
        }
      };
    }

    // Carga inicial
    const saved = localStorage.getItem('theme') || 'dark';
    applyTheme(saved);
  },

  bindGlobalEvents() {
    document.addEventListener('dblclick', (e) => {
      const card = e.target.closest('[data-task-id]');
      if (!card || e.target.closest('[data-action], button')) return;
      const taskId = card.dataset.taskId;
      if (taskId && typeof Tasks !== 'undefined') Tasks.editTask(taskId);
    });

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="show-notes"]');
      if (!btn) return;
      e.stopPropagation();
      e.preventDefault();
      if (typeof Tasks !== 'undefined') Tasks.showNotes(btn.dataset.id);
    });
    
    window.addEventListener('hashchange', () => {
      const hash = location.hash.slice(1);
      if (hash) this.navigate(hash, true);
    });
  },

  bindNavigation() {
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = btn.dataset.view;
        this.navigate(view);
        // Cerrar sidebar móvil
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('show');
      });
    });

    const fab = document.getElementById('fab-new-task');
    if (fab) {
      fab.onclick = () => {
        if (this.currentView === 'notes') {
          if (typeof Notes !== 'undefined') Notes.createNewNote();
        } else {
          this.navigate('new-task');
        }
      };
    }
  },

  bindSidebar() {
    const toggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (toggle && sidebar && overlay) {
      toggle.onclick = () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
      };
      overlay.onclick = () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
      };
    }
  },

  bindExportImport() {
    const btnExp = document.getElementById('btn-export');
    const btnImp = document.getElementById('btn-import');
    const inpFile = document.getElementById('import-file');
    if (btnExp) btnExp.onclick = () => { storage.exportJSON(); UI.toast('Exportado', 'success'); };
    if (btnImp) btnImp.onclick = () => inpFile.click();
    if (inpFile) inpFile.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        await storage.importJSON(file);
        UI.toast('Importado', 'success');
        this.refreshCurrentView();
      } catch (err) { UI.toast('Error', 'error'); }
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
    if (view === 'day' && !this.selectedDate) this.selectedDate = storage._todayStr();
    if (view === 'new-task') {
      Tasks.resetForm();
      const di = document.getElementById('task-date');
      if (di) di.value = storage._todayStr();
    }
    this.currentView = view;
    if (!fromHash) location.hash = view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const ve = document.getElementById(`view-${view}`);
    if (ve) ve.classList.add('active');
    document.querySelectorAll('.nav-btn[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    const titles = { 'today':'Hoy','calendar':'Calendario','agenda':'Agenda','day':'Detalle','new-task':'Nueva Tarea','tags':'Etiquetas','completed':'Terminadas','notes':'Notas' };
    const mt = document.getElementById('mobile-title');
    if (mt) mt.textContent = titles[view] || 'Tareas';
    this.renderView(view);
  },

  renderView(view) {
    switch (view) {
      case 'today': this.renderToday(); break;
      case 'calendar': Calendar.render(); break;
      case 'month-list': Timeline.render(); break;
      case 'agenda': Agenda.render(); break;
      case 'day': this.renderDayDetail(); break;
      case 'new-task': Tasks.initForm(); break;
      case 'tags': this.renderTagsView(); break;
      case 'completed': Tasks.renderCompletedTasks('completed-tasks-list'); break;
      case 'notes': if (typeof Notes !== 'undefined') Notes.render(); break;
    }
  },

  renderToday() { if (typeof Dashboard !== 'undefined') Dashboard.render(); },
  renderDayDetail() {
    const ds = this.selectedDate || storage._todayStr();
    const te = document.getElementById('day-date-title');
    if (te) te.textContent = UI.formatDateLong(ds);
    Tasks.renderStats('day-stats', ds);
    Tasks.renderTaskList('day-tasks', ds);
    const pb = document.getElementById('day-prev');
    const nb = document.getElementById('day-next');
    if (pb) pb.onclick = () => { const d = new Date(this.selectedDate + 'T12:00:00'); d.setDate(d.getDate()-1); this.selectedDate = d.toISOString().split('T')[0]; this.renderDayDetail(); };
    if (nb) nb.onclick = () => { const d = new Date(this.selectedDate + 'T12:00:00'); d.setDate(d.getDate()+1); this.selectedDate = d.toISOString().split('T')[0]; this.renderDayDetail(); };
  },
  refreshCurrentView() { this.renderView(this.currentView); },
  renderTagsView(q = '') { if (typeof Tasks !== 'undefined') Tasks.renderTagsView?.(q); },
  requestNotificationPermission() { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); },
  startAlarmChecker() { this.alarmInterval = setInterval(() => this.checkAlarms(), 30000); this.checkAlarms(); },
  checkAlarms() { const al = storage.getPendingAlarms(); al.forEach(t => { this.showNotification(t); storage.updateTask(t.id, { alarm: null }); }); },
  showNotification(t) { UI.toast(`🔔 ${t.title}`, 'warning', 6000); if ('Notification' in window && Notification.permission === 'granted') { new Notification('⏰ Recordatorio', { body: t.title, icon: 'icons/icon-192.png' }); } }
};

document.addEventListener('DOMContentLoaded', () => app.init());
