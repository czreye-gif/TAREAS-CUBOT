// ============================================================
// ui_config.js — Persistencia de layout y dimensiones de modales
// ============================================================

const UIConfig = {
  defaults: {
    width: 770,
    height: 90,
    position: 'center' // flex-start, center, flex-end
  },

  init() {
    this.load();
    this.bindEvents();
  },

  load() {
    const saved = localStorage.getItem('task-modal-config');
    const config = saved ? JSON.parse(saved) : this.defaults;
    this.apply(config);
    this.updateInputs(config);
  },

  apply(config) {
    const modal = document.getElementById('view-new-task');
    const container = modal ? modal.querySelector('.form-container') : null;

    if (modal) {
      modal.style.justifyContent = config.position || 'center';
      // Si la posición no es centro, quitamos el padding-left que tenía el modal original para tablets
      if (config.position !== 'center') {
        modal.style.paddingLeft = '20px';
        modal.style.paddingRight = '20px';
      } else {
        modal.style.paddingLeft = '5%';
        modal.style.paddingRight = '5%';
      }
    }

    if (container) {
      container.style.maxWidth = `${config.width}px`;
      container.style.maxHeight = `${config.height}vh`;
    }
  },

  updateInputs(config) {
    const wInp = document.getElementById('config-width');
    const hInp = document.getElementById('config-height');
    const wVal = document.getElementById('config-width-val');
    const hVal = document.getElementById('config-height-val');

    if (wInp) wInp.value = config.width;
    if (hInp) hInp.value = config.height;
    if (wVal) wVal.textContent = `${config.width}px`;
    if (hVal) hVal.textContent = `${config.height}%`;

    // Botones de posición
    document.querySelectorAll('.btn-config-pos').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.pos === config.position);
      if (btn.dataset.pos === config.position) {
        btn.style.background = 'var(--primary)';
        btn.style.color = 'white';
      } else {
        btn.style.background = 'rgba(255,255,255,0.05)';
        btn.style.color = 'var(--text)';
      }
    });
  },

  bindEvents() {
    const btnToggle = document.getElementById('btn-modal-config');
    const panel = document.getElementById('modal-config-panel');
    const btnClose = document.querySelector('.btn-close-config');
    const btnSave = document.getElementById('btn-save-modal-config');

    if (btnToggle) {
      btnToggle.onclick = (e) => {
        e.stopPropagation();
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      };
    }

    if (btnClose) {
      btnClose.onclick = () => panel.style.display = 'none';
    }

    // Sliders en tiempo real
    const wInp = document.getElementById('config-width');
    const hInp = document.getElementById('config-height');
    
    if (wInp) {
      wInp.oninput = () => {
        const val = wInp.value;
        document.getElementById('config-width-val').textContent = `${val}px`;
        const container = document.querySelector('#view-new-task .form-container');
        if (container) container.style.maxWidth = `${val}px`;
      };
    }

    if (hInp) {
      hInp.oninput = () => {
        const val = hInp.value;
        document.getElementById('config-height-val').textContent = `${val}%`;
        const container = document.querySelector('#view-new-task .form-container');
        if (container) container.style.maxHeight = `${val}vh`;
      };
    }

    // Botones de posición
    document.querySelectorAll('.btn-config-pos').forEach(btn => {
      btn.onclick = () => {
        const pos = btn.dataset.pos;
        const modal = document.getElementById('view-new-task');
        if (modal) modal.style.justifyContent = pos;
        
        // Actualizar UI botones
        document.querySelectorAll('.btn-config-pos').forEach(b => {
          b.style.background = 'rgba(255,255,255,0.05)';
          b.style.color = 'var(--text)';
        });
        btn.style.background = 'var(--primary)';
        btn.style.color = 'white';
        btn.dataset.active = 'true';
      };
    });

    if (btnSave) {
      btnSave.onclick = () => {
        const activePosBtn = Array.from(document.querySelectorAll('.btn-config-pos')).find(b => b.style.background.includes('var(--primary)') || b.style.background.includes('rgb(99, 102, 241)'));
        const config = {
          width: parseInt(wInp.value),
          height: parseInt(hInp.value),
          position: activePosBtn ? activePosBtn.dataset.pos : 'center'
        };
        localStorage.setItem('task-modal-config', JSON.stringify(config));
        panel.style.display = 'none';
        UI.toast('Configuración guardada', 'success');
      };
    }
  }
};

// Auto-inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => UIConfig.init());
