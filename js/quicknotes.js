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
    // No mover el index si ya estamos en una sesión activa
    if (this.currentIndex === 0) this.currentIndex = this.notes.length - 1;

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
        calcW: calcPane.offsetWidth + 'px'
      }));
    }
  },

  bindEvents() {
    const btnAdd = document.getElementById('qn-add-btn');
    const btnPrev = document.getElementById('qn-prev');
    const btnNext = document.getElementById('qn-next');
    const btnFirst = document.getElementById('qn-first');
    const btnLast = document.getElementById('qn-last');
    const btnShare = document.getElementById('qn-share-btn');
    const btnClose = document.getElementById('qn-close-btn');

    if (btnAdd) btnAdd.onclick = () => this.createNewNote();
    if (btnPrev) btnPrev.onclick = () => this.navigate(-1);
    if (btnNext) btnNext.onclick = () => this.navigate(1);
    if (btnFirst) btnFirst.onclick = () => { this.currentIndex = 0; this.render(); };
    if (btnLast) btnLast.onclick = () => { this.currentIndex = this.notes.length - 1; this.render(); };
    if (btnShare) btnShare.onclick = () => this.shareNote();
    if (btnClose) btnClose.onclick = () => app.navigate('today');

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

  },

  initCalculator() {
    const calcContainer = document.getElementById('qn-calc-container');
    if (calcContainer && typeof RetCalc !== 'undefined') {
      calcContainer.innerHTML = RetCalc.render(true);
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
    const tabsContainer = document.getElementById('qn-tabs');
    if (!container) return;

    this.notes = storage.getQuickNotes();
    
    // OPTIMIZACIÓN: Si el número de hojas no ha cambiado, solo alternamos visibilidad
    // para no perder el foco ni la posición del cursor.
    const existingSheets = container.querySelectorAll('.qn-sheet');
    if (existingSheets.length === this.notes.length) {
      existingSheets.forEach((sheet, index) => {
        const isActive = index === this.currentIndex;
        sheet.classList.toggle('active', isActive);
        sheet.classList.remove('flipped-left', 'flipped-right');
        if (index < this.currentIndex) sheet.classList.add('flipped-left');
        else if (index > this.currentIndex) sheet.classList.add('flipped-right');
        
        // Mostrar/Ocultar toolbar
        const toolbar = sheet.querySelector('.rt-toolbar');
        if (toolbar) toolbar.style.display = isActive ? 'flex' : 'none';
        
        // Auto-focus al editor de la hoja activa
        if (isActive) {
          const editor = sheet.querySelector('.qn-editor');
          if (editor && document.activeElement !== editor) {
            this.moveCursorToEnd(editor);
          }
        }
      });
      this.renderTabs(tabsContainer);
      return;
    }
    
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
            <button type="button" class="rt-btn" data-command="insertOrderedList" title="Lista numerada">1.</button>
            <button type="button" class="rt-btn" data-command="insertCheckbox" title="Insertar Checkbox">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
            </button>
            
            <div class="rt-divider"></div>
            <button type="button" class="rt-btn" data-command="insertTable" title="Insertar Tabla">▦</button>
            <button type="button" class="rt-btn" data-command="insertDateTime" title="Insertar Fecha y Hora">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </button>

            <select class="rt-btn rt-font-select" title="Fuente de la nota" style="width:auto; padding:0 8px; font-size:0.7rem; font-weight:600; background:var(--bg2); border:1px solid var(--border); margin-left:4px">
              <option value="'Roboto', sans-serif">Roboto</option>
              <option value="'Inter', sans-serif">Inter</option>
              <option value="'Montserrat', sans-serif">Montserrat</option>
              <option value="'Kalam', cursive">Manuscrita</option>
            </select>

            <button type="button" class="rt-btn rt-share-btn" title="Compartir nota" style="margin-left:auto; color:var(--primary)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 12v8a2 2 0 0 02 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>
              </svg>
            </button>
          </div>
          <span style="margin-left:auto; font-size:0.75rem; color:rgba(0,0,0,0.4); display:${isActive ? 'none' : 'block'}">${new Date(note.createdAt).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })}</span>
        </div>
        <div class="qn-editor" id="qn-editor-${note.id}" contenteditable="true" role="textbox" aria-multiline="true" placeholder="Escribe algo rápido aquí...">${note.content}</div>
        <div class="qn-sheet-footer">
          <button class="qn-delete-btn" title="Eliminar Nota">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

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
      
      // Auto-focus si es la activa recién creada
      if (isActive) this.moveCursorToEnd(editor);
    });

    this.renderTabs(tabsContainer);
  },

  renderTabs(tabsContainer) {
    if (!tabsContainer) return;
    tabsContainer.innerHTML = this.notes.map((note, index) => `
      <div class="qn-tab ${index === this.currentIndex ? 'active' : ''}" data-index="${index}">
        Hoja ${index + 1}
      </div>
    `).join('');

    tabsContainer.querySelectorAll('.qn-tab').forEach(tab => {
      tab.onclick = () => {
        this.currentIndex = parseInt(tab.dataset.index);
        this.render();
      };
    });

    // Auto-scroll para mantener la pestaña activa visible
    const activeTab = tabsContainer.querySelector('.qn-tab.active');
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  },

  moveCursorToEnd(el) {
    el.focus();
    if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  },

  shareNote() {
    const activeSheet = document.querySelector('.qn-sheet.active');
    if (!activeSheet) return;
    this.shareAsPDF(activeSheet);
  },

  shareAsPDF(activeSheet) {
    UI.toast('Generando PDF...', 'info');
    
    const delBtn = activeSheet.querySelector('.qn-delete-btn');
    if (delBtn) delBtn.style.visibility = 'hidden';

    // Usamos opciones para asegurar que capture fuera del viewport visible
    html2canvas(activeSheet, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (clonedDoc) => {
        const clonedSheet = clonedDoc.querySelector('.qn-sheet.active');
        if (clonedSheet) {
          // 1. Limpieza visual total
          clonedSheet.style.background = '#ffffff';
          clonedSheet.style.backgroundImage = 'none';
          clonedSheet.style.boxShadow = 'none';
          clonedSheet.style.color = '#000';
          clonedSheet.classList.remove('postit-note');
          
          // 2. Expandir TODO el contenido para que no haya scroll
          const editor = clonedSheet.querySelector('.qn-editor');
          if (editor) {
            editor.style.height = 'auto';
            editor.style.maxHeight = 'none';
            editor.style.overflow = 'visible';
            editor.style.color = '#000';
            editor.style.padding = '20px'; // Un poco de margen extra
          }

          // 3. Quitar elementos de UI que no queremos en el PDF
          const footer = clonedSheet.querySelector('.qn-sheet-footer');
          if (footer) footer.style.display = 'none';
          
          const title = clonedSheet.querySelector('.qn-sheet-title');
          if (title) title.style.color = '#000';

          // 4. Asegurar que el contenedor del clon permita crecer
          clonedSheet.style.height = 'auto';
          clonedSheet.style.minHeight = 'auto';
        }
      }
    }).then(canvas => {
      if (delBtn) delBtn.style.visibility = 'visible';
      
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pageWidth - 20; 
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`Nota_Cubot_${new Date().getTime()}.pdf`);
      
      UI.toast('PDF generado con éxito', 'success');
    }).catch(err => {
      console.error("Error shareAsPDF", err);
      UI.toast('Error al generar PDF', 'error');
      if (delBtn) delBtn.style.visibility = 'visible';
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
      const maxW = window.innerWidth * 0.4;
      const finalW = Math.max(240, Math.min(maxW, newW));
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
