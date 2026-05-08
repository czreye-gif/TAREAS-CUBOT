// ============================================================
// app.js — Controlador principal, router SPA, notificaciones
// ============================================================

const app = {
  currentView: 'today',
  selectedDate: new Date().toISOString().split('T')[0],
  alarmInterval: null,

  init() {
    console.log("App initializing...");
    
    // 1. Vincular Tema inmediatamente (lo más importante ahora)
    this.bindTheme();

    // 2. Otras vinculaciones con try-catch para evitar que un error rompa todo
    try { this.bindNavigation(); } catch(e) { console.error("Error bindNavigation", e); }
    try { this.bindSidebar(); } catch(e) { console.error("Error bindSidebar", e); }
    try { this.bindExportImport(); } catch(e) { console.error("Error bindExportImport", e); }
    try { this.bindFilters(); } catch(e) { console.error("Error bindFilters", e); }
    
    try { if (typeof Tasks !== 'undefined') Tasks.initForm(); } catch(e) { console.error("Error Tasks.init", e); }
    try { if (typeof Calendar !== 'undefined') Calendar.init(); } catch(e) { console.error("Error Calendar.init", e); }
    try { if (typeof Agenda !== 'undefined') Agenda.init(); } catch(e) { console.error("Error Agenda.init", e); }
    try { if (typeof Timeline !== 'undefined') Timeline.init(); } catch(e) { console.error("Error Timeline.init", e); }
    try { if (typeof Dashboard !== 'undefined') Dashboard.init(); } catch(e) { console.error("Error Dashboard.init", e); }
    try { if (typeof UI !== 'undefined') UI.initDragAndDrop(); } catch(e) { console.error("Error UI.init", e); }
    
    // Inicializar editor de notas principal
    try {
      if (typeof RichEditor !== 'undefined') {
        RichEditor.init('#task-description', '#main-editor-toolbar');
      }
    } catch(e) { console.error("Error RichEditor.init", e); }
    
    try { if (typeof Notes !== 'undefined') Notes.init(); } catch(e) { console.error("Error Notes.init", e); }

    this.navigate('today');
    this.startAlarmChecker();
    this.requestNotificationPermission();

    // Eventos globales
    this.bindGlobalEvents();

    // Sidebar colapsado por defecto
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.add('collapsed');

    console.log("App initialized.");
  },

  bindTheme() {
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (!themeBtn) {
      console.warn("No se encontró el botón de tema #btn-theme-toggle");
      return;
    }

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

    // Restaurar
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);

    // Bindeo DIRECTO al elemento para máxima seguridad
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
    
    // Hash navigation
    window.addEventListener('hashchange', () => {
      const hash = location.hash.slice(1);
      if (hash) this.navigate(hash, true);
    });
  },

  // ... rest of the app methods (navigate, renderView, etc.) ...
  // (Assuming they are fine as they are essentially SPA router logic)
};

// ... include other app methods here to avoid breaking the file ...
