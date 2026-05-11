/**
 * QuickNotes — Módulo de Toma de Nota (Block de Notas Rápidas)
 * Permite gestionar una colección de notas rápidas con efecto de block
 */
const QuickNotes = {
  currentIndex: 0,
  notes: [],
  autoSaveTimer: null,

  init() {
    console.log("QuickNotes: Iniciando...");
    this.notes = storage.getQuickNotes();
    if (this.notes.length === 0) {
      this.createNewNote();
    }
    this.currentIndex = this.notes.length - 1;

    this.applyPersistedDimensions();
    this.bindEvents();
    this.initCalculator();
    this.render();
  },

  applyPersistedDimensions() {
    const saved = JSON.parse(localStorage.getItem('qn-dim') || '{}');
    const container = document.querySelector('.qn-container');
    const calcPane = document.getElementById('qn-calc-pane');
    if (container) {
      if (saved.w) container.style.width = saved.w;
      if (saved.h) container.style.height = saved.h;
    }
    if (calcPane && saved.calcW) {
      calcPane.style.width = saved.calcW;
      calcPane.style.minWidth = saved.calcW;
    }
  },

  saveDimensions() {
    const container = document.querySelector('.qn-container');
    const calcPane = document.getElementById('qn-calc-pane');
    if (container && calcPane) {
      localStorage.setItem('qn-dim', JSON.stringify({
        w: container.style.width,
        h: container.style.height,
        calcW: calcPane.style.width
      }));
    }
  },

  bindEvents() {
    const btnAdd = document.getElementById('qn-add-btn');
    const btnPrev = document.getElementById('qn-prev');
    const btnNext = document.getElementById('qn-next');
    const btnShare = document.getElementById('qn-share-img');

    if (btnAdd) btnAdd.onclick = () => this.createNewNote();
    if (btnPrev) btnPrev.onclick = () => this.navigate(-1);
    if (btnNext) btnNext.onclick = () => this.navigate(1);
    if (btnShare) btnShare.onclick = () => this.shareAsImage();

    // Resize Window logic
    const resizer = document.getElementById('qn-resizer');
    const container = document.querySelector('.qn-container');
    if (resizer && container) {
      this._bindResizer(resizer, container);
    }

    // Gutter logic
    const gutter = document.getElementById('qn-gutter');
    const calcPane = document.getElementById('qn-calc-pane');
    if (gutter && calcPane) {
      this._bindGutter(gutter, calcPane);
    }

    // Listener para la calculadora
    window.addEventListener('calc:copy', (e) => {
      if (app.currentView === 'quick-notes') {
        const editor = document.querySelector('.qn-sheet.active .qn-editor');
        if (editor) {
          editor.focus();
          document.execCommand('insertHTML', false, e.detail.html);
          this.triggerAutoSave();
        }
      }
    });
  },

  initCalculator() {
    const calcContainer = document.getElementById('qn-calc-container');
    if (calcContainer && typeof RetCalc !== 'undefined') {
      calcContainer.innerHTML = RetCalc.render();
      RetCalc.init(calcContainer);
    }
  },

  createNewNote() {
    const note = storage.createQuickNote('');
    this.notes = storage.getQuickNotes();
    this.currentIndex = this.notes.length - 1;
    this.render();
  },

  navigate(dir) {
    const newIdx = this.currentIndex + dir;
    if (newIdx >= 0 && newIdx < this.notes.length) {
      this.currentIndex = newIdx;
      this.render();
    }
  },

  deleteNote(id) {
    if (confirm('¿Eliminar esta hoja del block?')) {
      storage.deleteQuickNote(id);
      this.notes = storage.getQuickNotes();
      if (this.notes.length === 0) {
        this.createNewNote();
      } else {
        this.currentIndex = Math.min(this.currentIndex, this.notes.length - 1);
        this.render();
      }
      UI.toast('Nota eliminada', 'info');
    }
  },

  triggerAutoSave() {
    if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      const activeSheet = document.querySelector('.qn-sheet.active');
      if (activeSheet) {
        const id = activeSheet.dataset.id;
        const content = activeSheet.querySelector('.qn-editor').innerHTML;
        storage.updateQuickNote(id, content);
      }
    }, 1000);
  },

  render() {
    const container = document.getElementById('qn-block');
    const counter = document.getElementById('qn-counter');
    if (!container) return;

    this.notes = storage.getQuickNotes();
    
    container.innerHTML = '';
    
    this.notes.forEach((note, index) => {
      const isActive = index === this.currentIndex;
      const sheet = document.createElement('div');
      sheet.className = `qn-sheet postit-note ${isActive ? 'active' : ''}`;
      sheet.dataset.id = note.id;
      sheet.style.zIndex = index;
      
      // Estilo de "hojeado"
      if (index < this.currentIndex) {
        sheet.classList.add('flipped-left');
      } else if (index > this.currentIndex) {
        sheet.classList.add('flipped-right');
      }

      sheet.innerHTML = `
        <div class="qn-sheet-header">
          <div class="rt-toolbar" id="qn-toolbar-${note.id}" style="padding:4px; border-bottom:1px solid rgba(0,0,0,0.05); margin-bottom:8px; display:${isActive ? 'flex' : 'none'}">
            <button type="button" class="rt-btn" data-command="bold" title="Negrita"><b>B</b></button>
            <button type="button" class="rt-btn" data-command="italic" title="Cursiva"><i>I</i></button>
            <button type="button" class="rt-btn" data-command="underline" title="Subrayado"><u>U</u></button>
            
            <div class="rt-highlighter-wrapper">
              <button type="button" class="rt-btn rt-highlighter-btn" data-value="#00e5ff" title="Aplicar Marcador">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m9 11-6 6v3h9l3-3"/>
                  <path d="m22 12-4.6-4.6a2 2 0 0 0-2.8 0l-5.2 5.2a2 2 0 0 0 0 2.8l4.6 4.6a2 2 0 0 0 2.8 0l5.2-5.2a2 2 0 0 0 0-2.8Z"/>
                  <path d="M18 10l-4.5 4.5"/>
                </svg>
                <div class="rt-color-indicator" style="background:#00e5ff"></div>
              </button>
              <button type="button" class="rt-btn rt-highlighter-arrow" title="Cambiar Color">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div class="rt-color-palette">
                <div class="rt-color-opt" data-value="#00e5ff" style="background:#00e5ff" title="Cian"></div>
                <div class="rt-color-opt" data-value="#ff00ff" style="background:#ff00ff" title="Magenta"></div>
                <div class="rt-color-opt" data-value="#ccff00" style="background:#ccff00" title="Lima"></div>
                <div class="rt-color-opt" data-value="#ff9100" style="background:#ff9100" title="Naranja"></div>
                <div class="rt-color-opt clear-opt" data-value="transparent" title="Quitar Marcador"></div>
              </div>
            </div>

            <div class="rt-divider"></div>
            <button type="button" class="rt-btn" data-command="insertUnorderedList" title="Lista con viñetas">•</button>
            <button type="button" class="rt-btn" data-command="insertCheckbox" title="Insertar Checkbox">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
            </button>
            <button type="button" class="rt-btn" data-command="insertTable" title="Insertar Tabla">▦</button>
          </div>
          <span style="margin-left:auto; font-size:0.75rem; color:rgba(0,0,0,0.4)">${new Date(note.createdAt).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })}</span>
        </div>
        <div class="qn-editor" id="qn-editor-${note.id}" contenteditable="true" placeholder="Escribe algo rápido aquí...">${note.content}</div>
        <div class="qn-sheet-footer">
          <button class="qn-delete-btn" title="Eliminar Nota">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      container.appendChild(sheet);

      // Initialize Rich Editor for this sheet
      if (typeof RichEditor !== 'undefined') {
        RichEditor.init(`#qn-editor-${note.id}`, `#qn-toolbar-${note.id}`);
      }

      // Eventos de la hoja
      const editor = sheet.querySelector('.qn-editor');
      editor.oninput = () => this.triggerAutoSave();
      
      const delBtn = sheet.querySelector('.qn-delete-btn');
      delBtn.onclick = (e) => {
        e.stopPropagation();
        this.deleteNote(note.id);
      };

      container.appendChild(sheet);
    });

    if (counter) {
      counter.textContent = `${this.currentIndex + 1} / ${this.notes.length}`;
    }
  },

  shareAsImage() {
    const activeSheet = document.querySelector('.qn-sheet.active');
    if (!activeSheet) return;

    UI.toast('Generando imagen...', 'info');
    
    // Ocultar el botón de borrar temporalmente para la foto
    const delBtn = activeSheet.querySelector('.qn-delete-btn');
    if (delBtn) delBtn.style.visibility = 'hidden';

    html2canvas(activeSheet, {
      backgroundColor: null,
      scale: 2,
      logging: false,
      useCORS: true
    }).then(canvas => {
      if (delBtn) delBtn.style.visibility = 'visible';
      
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `nota_rapida_${new Date().getTime()}.png`;
      link.href = imgData;
      link.click();
      UI.toast('Imagen descargada', 'success');
    }).catch(err => {
      console.error("Error shareAsImage", err);
      UI.toast('Error al generar imagen', 'error');
    });
  },

  // ── LOGICA DE REDIMENSIONADO ───────────────────────────────────

  _bindResizer(resizer, win) {
    let resizing = false, rsX, rsY, rsW, rsH;

    const start = (cx, cy) => {
      resizing = true;
      rsX = cx; rsY = cy;
      rsW = win.offsetWidth;
      rsH = win.offsetHeight;
      document.body.style.cursor = 'nwse-resize';
    };
    const move = (cx, cy) => {
      if (!resizing) return;
      win.style.width  = (rsW + (cx - rsX)) + 'px';
      win.style.height = (rsH + (cy - rsY)) + 'px';
    };
    const stop = () => {
      if (resizing) {
        resizing = false;
        document.body.style.cursor = '';
        this.saveDimensions();
      }
    };

    resizer.addEventListener('mousedown', e => { start(e.clientX, e.clientY); e.preventDefault(); });
    resizer.addEventListener('touchstart', e => { start(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });

    window.addEventListener('mousemove', e => move(e.clientX, e.clientY));
    window.addEventListener('touchmove', e => move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchend', stop);
  },

  _bindGutter(gutter, calcPane) {
    let dragging = false, gX, gW;

    const start = (cx) => {
      dragging = true;
      gX = cx;
      gW = calcPane.offsetWidth;
      gutter.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
    };
    const move = (cx) => {
      if (!dragging) return;
      const delta = cx - gX;
      const newW = gW - delta; // Invertido porque está a la derecha
      const finalW = Math.max(240, Math.min(500, newW));
      calcPane.style.width = finalW + 'px';
      calcPane.style.minWidth = finalW + 'px';
    };
    const stop = () => {
      if (dragging) {
        dragging = false;
        gutter.classList.remove('dragging');
        document.body.style.cursor = '';
        this.saveDimensions();
      }
    };

    gutter.addEventListener('mousedown', e => { start(e.clientX); e.preventDefault(); });
    gutter.addEventListener('touchstart', e => { start(e.touches[0].clientX); }, { passive: true });

    window.addEventListener('mousemove', e => move(e.clientX));
    window.addEventListener('touchmove', e => move(e.touches[0].clientX), { passive: true });
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchend', stop);
  }
};
