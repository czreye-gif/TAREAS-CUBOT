/**
 * UI Manager — Métodos de interfaz, fechas, toasts, modales y utilidades
 * CORREGIDO: se agregaron toast, confirm, modal, pickDate, format*, categoryIcon,
 *            priorityColor, priorityLabel, initDragAndDrop.
 *            Se eliminó initNavigation duplicada (app.js la maneja).
 */
const UI = {

  // ─── 1. UTILIDADES DE FECHA ────────────────────────────────────────────────

  dates: {
    getToday: () => new Date().toLocaleDateString('sv-SE'),
    display: (dateStr) => {
      if (!dateStr) return '';
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    }
  },

  formatMonthYear(year, month) {
    return new Date(year, month, 1).toLocaleDateString('es-MX', {
      month: 'long', year: 'numeric'
    }).replace(/^\w/, c => c.toUpperCase());
  },

  formatDateLong(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  },

  formatDateShort(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short'
    });
  },

  formatTime(isoStr) {
    if (!isoStr) return '';
    try {
      return new Date(isoStr).toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return ''; }
  },

  // ─── 2. CATEGORÍAS Y PRIORIDADES ──────────────────────────────────────────

  categoryIcon(cat) {
    const icons = { trabajo: '💼', personal: '👤', salud: '❤️', otro: '📌' };
    return icons[cat] || '📌';
  },

  priorityColor(p) {
    const map = { 
      'A': '#ef4444', 'high': '#ef4444', 
      'B': '#f59e0b', 'medium': '#f59e0b', 
      'C': '#eab308', 'low': '#eab308', 
      'D': '#3b82f6', 
      'E': '#9ca3af' 
    };
    return map[p] || '#eab308';
  },

  priorityLabel(p) {
    const map = { 
      'A': 'A (Muy Alta)', 'high': 'A (Muy Alta)', 
      'B': 'B (Media)', 'medium': 'B (Media)', 
      'C': 'C (Baja)', 'low': 'C (Baja)', 
      'D': 'D (Delegar)', 
      'E': 'E (Eliminar)' 
    };
    return map[p] || 'C (Baja)';
  },

  // ─── 3. TOAST ─────────────────────────────────────────────────────────────

  toast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      Object.assign(container.style, {
        position: 'fixed', bottom: '24px', right: '24px',
        zIndex: '99999', display: 'flex', flexDirection: 'column', gap: '8px',
        pointerEvents: 'none'
      });
      document.body.appendChild(container);
    }

    const colors = {
      success: '#10b981', error: '#ef4444',
      warning: '#f59e0b', info: '#3b82f6'
    };
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

    const toast = document.createElement('div');
    Object.assign(toast.style, {
      background: colors[type] || colors.info,
      color: '#fff',
      padding: '12px 18px',
      borderRadius: '10px',
      fontSize: '0.9rem',
      fontWeight: '500',
      boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
      maxWidth: '320px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      transform: 'translateX(0)',
      opacity: '1',
      pointerEvents: 'auto'
    });
    toast.textContent = (icons[type] || '') + ' ' + message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // ─── 4. CONFIRM ───────────────────────────────────────────────────────────

  confirm(title, message) {
    return new Promise(resolve => {
      const overlay = this._makeOverlay();
      overlay.innerHTML = `
        <div class="ui-modal-box">
          <h3 class="ui-modal-title">${this._esc(title)}</h3>
          <p class="ui-modal-msg">${this._esc(message)}</p>
          <div class="ui-modal-actions">
            <button id="ui-cancel" class="btn btn-secondary">Cancelar</button>
            <button id="ui-ok" class="btn btn-primary" style="background:#ef4444">Confirmar</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#ui-cancel').onclick = () => { overlay.remove(); resolve(false); };
      overlay.querySelector('#ui-ok').onclick    = () => { overlay.remove(); resolve(true); };
      overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
    });
  },

  // ─── 5. MODAL GENÉRICO ────────────────────────────────────────────────────

  modal(title, contentHTML, buttons = []) {
    return new Promise(resolve => {
      const overlay = this._makeOverlay();
      const btnsHTML = buttons.map((b, i) =>
        `<button class="btn ${b.class || 'btn-secondary'}" data-idx="${i}">${this._esc(b.label)}</button>`
      ).join('');
      overlay.innerHTML = `
        <div class="ui-modal-box">
          <h3 class="ui-modal-title">${this._esc(title)}</h3>
          <div class="ui-modal-content">${contentHTML}</div>
          <div class="ui-modal-actions">${btnsHTML}</div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelectorAll('[data-idx]').forEach(btn => {
        btn.onclick = () => { overlay.remove(); resolve(parseInt(btn.dataset.idx)); };
      });
      overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(-1); } };
    });
  },

  // ─── 6. PICK DATE ─────────────────────────────────────────────────────────

  pickDate(currentDate) {
    const html = `<input type="date" id="pick-date-input" class="input-field" value="${currentDate || ''}"
                    style="width:100%;padding:10px;border-radius:8px;
                           background:var(--surface-2,#2a2a3e);border:1px solid var(--border,#333);
                           color:var(--text,#fff)">`;
    return this.modal('Reagendar Tarea', html, [
      { label: 'Cancelar', class: 'btn-secondary' },
      { label: 'Aplicar',  class: 'btn-primary'   }
    ]).then(result => {
      if (result === 1) {
        const input = document.getElementById('pick-date-input');
        return input ? input.value : null;
      }
      return null;
    });
  },

  // ─── 7. SALUDO DINÁMICO ───────────────────────────────────────────────────

  updateGreeting() {
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('today-greeting');
    if (!greetingEl) return;
    if (hour < 12)      greetingEl.textContent = 'Buenos días, César ☀️';
    else if (hour < 19) greetingEl.textContent = 'Buenas tardes, César 🌤️';
    else                greetingEl.textContent = 'Buenas noches, César 🌙';
  },

  // ─── 8. DRAG & DROP ───────────────────────────────────────────────────────

  initDragAndDrop() {
    document.addEventListener('dragstart', (e) => {
      const card = e.target.closest('[data-task-id]');
      if (!card) return;
      e.dataTransfer.setData('text/plain', card.dataset.taskId);
      card.classList.add('dragging');
    });

    document.addEventListener('dragend', (e) => {
      const card = e.target.closest('[data-task-id]');
      if (card) card.classList.remove('dragging');
      document.querySelectorAll('.drop-zone').forEach(z => {
        z.classList.remove('dash-drag-active', 'dash-drop-hover', 'drag-over');
      });
    });

    document.querySelectorAll('.drop-zone').forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        document.querySelectorAll('.drop-zone').forEach(z => {
          z.classList.remove('dash-drag-active', 'dash-drop-hover', 'drag-over');
        });
        const taskId = e.dataTransfer.getData('text/plain');
        const zoneType = zone.dataset.zone;
        if (!taskId || !zoneType) return;
        const today = new Date().toLocaleDateString('sv-SE');
        const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('sv-SE');
        storage.moveTask(taskId, zoneType === 'today' ? today : tomorrow);
        if (typeof app !== 'undefined') app.refreshCurrentView();
      });
    });
  },

  // ─── 9. HELPERS PRIVADOS ──────────────────────────────────────────────────

  _makeOverlay() {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'fixed', inset: '0',
      background: 'rgba(0,0,0,0.65)',
      zIndex: '10000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px'
    });
    if (!document.getElementById('ui-modal-styles')) {
      const style = document.createElement('style');
      style.id = 'ui-modal-styles';
      style.textContent = `
        .ui-modal-box{background:var(--surface,#1e1e2e);border-radius:14px;padding:28px;
          max-width:420px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,0.6);}
        .ui-modal-title{margin:0 0 10px;font-size:1.1rem;color:var(--text,#fff)}
        .ui-modal-msg{margin:0 0 22px;color:var(--muted,#888);font-size:0.9rem;line-height:1.5}
        .ui-modal-content{margin-bottom:20px}
        .ui-modal-actions{display:flex;gap:8px;justify-content:flex-end}
      `;
      document.head.appendChild(style);
    }
    return el;
  },

  _esc(s) {
    const d = document.createElement('div');
    d.textContent = String(s || '');
    return d.innerHTML;
  }
};

// ─── INICIALIZACIÓN ───────────────────────────────────────────────────────────
// app.js y dashboard.js manejan la navegación, el formulario y el saludo.
document.addEventListener('DOMContentLoaded', () => {
  // UI.updateGreeting() eliminado: dashboard.renderHeader() ya lo hace con fecha incluida.
});
