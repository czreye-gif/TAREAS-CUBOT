/**
 * Editor Enriquecido — Lógica de formato, tablas y autocompletado
 */
const RichEditor = {
  
  init(editorSelector, toolbarSelector) {
    const editor = document.querySelector(editorSelector);
    const toolbar = document.querySelector(toolbarSelector);
    if (!editor || !toolbar) return;

    // Pre-seleccionar fuente si el editor ya tiene una
    const fontSelect = toolbar.querySelector('.rt-font-select');
    if (fontSelect) {
      const currentFont = editor.style.fontFamily || "'Roboto', sans-serif";
      // Normalizar para comparación
      const options = Array.from(fontSelect.options);
      const matching = options.find(opt => opt.value.includes(currentFont.replace(/['"]/g, '')));
      if (matching) fontSelect.value = matching.value;

      fontSelect.onchange = (e) => {
        editor.style.fontFamily = e.target.value;
      };
    }

    // Bind format buttons
    toolbar.querySelectorAll('.rt-btn[data-command]').forEach(btn => {
      btn.onmousedown = (e) => {
        e.preventDefault();
        const cmd = btn.dataset.command;
        if (cmd === 'insertTable') {
          this.insertTable(editor);
        } else if (cmd === 'insertDateTime') {
          this.insertDateTime(editor);
        } else if (cmd === 'addTableRow') {
          this.addTableRow(editor);
        } else if (cmd === 'removeTableRow') {
          this.removeTableRow(editor);
        } else if (cmd === 'insertCheckbox') {
          this.insertCheckbox(editor);
        } else if (cmd === 'hiliteColor') {
          document.execCommand('hiliteColor', false, btn.dataset.value || '#00e5ff');
        } else {
          document.execCommand(cmd, false, null);
        }
        editor.focus();
      };
    });

    // Check cursor position for table buttons
    const checkCursor = () => {
      const selection = window.getSelection();
      let isTable = false;
      if (selection.rangeCount > 0) {
        let node = selection.anchorNode;
        if (node && node.nodeType === 3) node = node.parentNode;
        if (node && node.closest && node.closest('table')) {
          isTable = true;
        }
      }
      
      const rowBtns = toolbar.querySelectorAll('.rt-table-row-btn');
      rowBtns.forEach(btn => {
        btn.style.display = isTable ? 'inline-flex' : 'none';
      });
    };

    editor.addEventListener('keyup', checkCursor);
    editor.addEventListener('mouseup', checkCursor);
    editor.addEventListener('input', checkCursor);

    // Bind hashtag autocomplete
    this._bindHashtag(editor);

    // Bind table resizing
    this._initTableResizing(editor);

    // Bind highlighter tool (Palette logic)
    toolbar.querySelectorAll('.rt-highlighter-wrapper').forEach(wrapper => {
      const btn = wrapper.querySelector('.rt-highlighter-btn');
      const arrow = wrapper.querySelector('.rt-highlighter-arrow');
      const palette = wrapper.querySelector('.rt-color-palette');
      const indicator = wrapper.querySelector('.rt-color-indicator');
      
      if (!btn || !palette || !arrow) return;

      // Cargar color persistente
      const savedColor = localStorage.getItem('rt-last-hilite') || '#00e5ff';
      btn.dataset.value = savedColor;
      if (indicator) indicator.style.background = (savedColor === 'transparent' ? 'transparent' : savedColor);
      
      // Sincronizar color de selección inicial
      const setSelectionColor = (color) => {
        let selectionColor = 'rgba(0, 120, 215, 0.3)';
        if (color && color !== 'transparent') {
          // Si el color es hex (e.g. #00e5ff), le añadimos transparencia 'aa'
          selectionColor = color.startsWith('#') ? (color + 'aa') : color;
        }
        editor.style.setProperty('--rt-selection-color', selectionColor, 'important');
      };
      setSelectionColor(savedColor);

      // Click main: toggle active state and apply current color
      btn.onmousedown = (e) => {
        e.preventDefault();
        const color = btn.dataset.value;
        
        // Toggle active state
        const isActive = wrapper.classList.toggle('rt-highlighter-active');
        
        // Apply immediately if there is a selection
        const selection = window.getSelection();
        if (selection.rangeCount > 0 && selection.toString().length > 0) {
          document.execCommand('hiliteColor', false, color === 'transparent' ? '#fdf3c0' : color);
        }
        
        editor.focus();
        palette.classList.remove('show');
      };

      // Click arrow: show palette
      arrow.onclick = (e) => {
        e.preventDefault();
        palette.classList.toggle('show');
      };

      // Color options logic
      palette.querySelectorAll('.rt-color-opt').forEach(opt => {
        opt.onclick = (e) => {
          e.stopPropagation();
          const color = opt.dataset.value;
          btn.dataset.value = color;
          if (indicator) indicator.style.background = (color === 'transparent' ? 'transparent' : color);
          
          // Actualizar color de selección dinámicamente
          setSelectionColor(color);

          // Guardar color persistente
          localStorage.setItem('rt-last-hilite', color);
          
          // ACTIVAR marcador automáticamente al elegir color
          wrapper.classList.add('rt-highlighter-active');
          
          // Aplicar a selección actual SOLO si no está vacía
          const selection = window.getSelection();
          if (selection.rangeCount > 0 && selection.toString().length > 0) {
            document.execCommand('hiliteColor', false, color === 'transparent' ? '#fdf3c0' : color);
          }
          
          palette.classList.remove('show');
          editor.focus();
        };
      });

      // Close palette when clicking outside
      document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) palette.classList.remove('show');
      });

    // ── MODO MARCADOR REAL (Auto-Highlight & Auto-Clear) ──
    const autoHighlight = () => {
      const selection = window.getSelection();
      
      // Si la selección está vacía, nos aseguramos de que el comando hiliteColor no esté "pegado" al cursor
      if (!selection.rangeCount || selection.toString().length === 0) {
        return;
      }

      // SOLO si el marcador está activo en ESTE toolbar
      if (!toolbar.querySelector('.rt-highlighter-wrapper.rt-highlighter-active')) {
        return;
      }

      const btn = toolbar.querySelector('.rt-highlighter-btn');
      const color = btn ? btn.dataset.value : null;
      if (!color) return;
      
      if (color === 'transparent') {
        // Modo Borrador: aplicamos el color de fondo del post-it para "limpiar"
        document.execCommand('hiliteColor', false, '#fdf3c0');
      } else {
        // Modo Marcador: aplicamos el color neón activo
        document.execCommand('hiliteColor', false, color);
      }
    };

    // Evitar duplicar listeners si se re-inicializa el mismo editor
    if (!editor.dataset.rtListeners) {
      editor.addEventListener('mouseup', autoHighlight);
      editor.addEventListener('touchend', autoHighlight);
      editor.dataset.rtListeners = 'true';
    }
    });

    // ── Auto-abrir ventana flotante al hacer foco en el editor ──
    // Solo para editores fuera de modales y que no sean de QuickNotes
    if (!editor.closest('.ui-modal-box') && !editor.id.includes('focus') && !editor.id.startsWith('qn-editor-')) {
      editor.addEventListener('focus', () => {
        // Pequeña pausa para evitar disparos accidentales
        setTimeout(() => {
          if (document.activeElement === editor && !document.querySelector('.rt-focus-overlay')) {
            this.enterFocusMode(editor, toolbar);
          }
        }, 80);
      }, { once: false });
    }

    // Convert to Task Logic
    const convertBtn = toolbar.querySelector('.rt-convert-btn');
    if (convertBtn) {
      const isNote = editor.dataset.type === 'note';
      convertBtn.style.display = isNote ? 'block' : 'none';
      convertBtn.onclick = (e) => {
        e.preventDefault();
        const taskId = editor.dataset.taskId;
        if (typeof Tasks !== 'undefined') Tasks.convertNoteToTask(taskId);
      };
    }

    // Share logic in editor
    const shareBtn = toolbar.querySelector('.rt-share-btn');
    if (shareBtn) {
      shareBtn.onclick = (e) => {
        e.preventDefault();
        const taskId = editor.dataset.taskId;
        if (taskId && typeof Tasks !== 'undefined') {
          Tasks.shareNote(taskId);
        } else {
          UI.toast('Guarda la nota antes de compartirla', 'warning');
        }
      };
    }

    // ── Herramientas de Imagen y Pegado ──
    this._bindImageTools(editor);
  },

  enterFocusMode(originalEditor, originalToolbar) {
    const folio  = originalEditor.dataset.folio  || 'NUEVA';
    const taskId = originalEditor.dataset.taskId || '';
    const font   = originalEditor.style.fontFamily || 'var(--font-notes)';

    // Recuperar dimensiones persistentes
    const savedDim = JSON.parse(localStorage.getItem('rt-focus-dim') || '{}');
    const initW = savedDim.w || '98%';
    const initH = savedDim.h || '98vh';
    const initCalcW = savedDim.calcW || '300px';

    const overlay = document.createElement('div');
    overlay.className = 'rt-focus-overlay';
    overlay.innerHTML = `
      <div class="rt-focus-window" id="rt-focus-win" style="width:${initW}; height:${initH}; max-width:none;">
        <div class="rt-focus-header" id="rt-focus-hdr">
          <span>📝 Nota: ${folio}</span>
          <div style="display:flex;gap:6px;align-items:center">
            <button class="rt-calc-toggle" title="Calculadora de Retenciones">🧮 Calc</button>
            ${taskId ? `<button class="rt-share-focus">Compartir</button>` : ''}
          </div>
        </div>
        <div class="rt-focus-body">
          <div class="rt-note-pane">
            <div class="rt-toolbar" id="focus-toolbar">${originalToolbar.innerHTML}</div>
            <div class="rt-editor postit-note" contenteditable="true" id="focus-editor"
                 data-task-id="${taskId}" data-folio="${folio}"
                 style="font-family:${font}">${originalEditor.innerHTML}</div>
          </div>
          <div class="rt-gutter" id="rt-focus-gutter" style="display:none"></div>
          <div class="rt-calc-pane" id="rt-calc-pane" style="display:none; width:${initCalcW}">
            ${typeof RetCalc !== 'undefined' ? RetCalc.render(false) : '<p style="padding:20px;color:var(--muted)">Calculadora no disponible</p>'}
          </div>
        </div>
        <div class="rt-resizer" id="rt-focus-resizer"></div>
      </div>`;

    document.body.appendChild(overlay);

    const win         = overlay.querySelector('#rt-focus-win');
    const hdr         = overlay.querySelector('#rt-focus-hdr');
    const focusEditor = overlay.querySelector('#focus-editor');
    const focusTB     = overlay.querySelector('#focus-toolbar');
    const calcPane    = overlay.querySelector('#rt-calc-pane');
    const gutter      = overlay.querySelector('#rt-focus-gutter');
    const resizer     = overlay.querySelector('#rt-focus-resizer');
    const calcToggle  = overlay.querySelector('.rt-calc-toggle');
    const shareBtn    = overlay.querySelector('.rt-share-focus');

    // Clean focus-toolbar
    focusTB.querySelectorAll('.rt-expand-btn,.rt-convert-btn').forEach(b => b.remove());
    this.init('#focus-editor', '#focus-toolbar');

    // Init calculator
    if (typeof RetCalc !== 'undefined' && calcPane) RetCalc.init(calcPane);

    setTimeout(() => focusEditor.focus(), 50);

    // ── PERSISTENCIA ─────────────────────────────────────────────
    const saveDimensions = () => {
      localStorage.setItem('rt-focus-dim', JSON.stringify({
        w: win.style.width,
        h: win.style.height,
        calcW: calcPane.style.width
      }));
    };

    // ── DRAG (MOVER) ─────────────────────────────────────────────
    hdr.style.cursor = 'grab';
    let dragging = false, sx, sy, sl, st;

    const startDrag = (cx, cy) => {
      const r = win.getBoundingClientRect();
      dragging = true;
      win.style.cssText += `;position:fixed;left:${r.left}px;top:${r.top}px;margin:0;transform:none`;
      overlay.style.alignItems = 'flex-start';
      overlay.style.justifyContent = 'flex-start';
      sx = cx; sy = cy; sl = r.left; st = r.top;
      hdr.style.cursor = 'grabbing';
    };
    const moveDrag = (cx, cy) => {
      if (!dragging) return;
      const ml = window.innerWidth  - win.offsetWidth;
      const mt = window.innerHeight - 60;
      win.style.left = Math.max(0, Math.min(ml, sl + cx - sx)) + 'px';
      win.style.top  = Math.max(0, Math.min(mt, st + cy - sy)) + 'px';
    };
    const endDrag = () => { dragging = false; hdr.style.cursor = 'grab'; };

    hdr.addEventListener('mousedown', e => { if (!e.target.closest('button')) { startDrag(e.clientX, e.clientY); e.preventDefault(); } });
    hdr.addEventListener('touchstart', e => { if (!e.target.closest('button')) startDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });

    // ── RESIZE (VENTANA) ─────────────────────────────────────────
    let resizing = false, rsX, rsY, rsW, rsH;
    const startResize = (cx, cy) => {
      resizing = true;
      rsX = cx; rsY = cy;
      rsW = win.offsetWidth;
      rsH = win.offsetHeight;
      document.body.style.cursor = 'nwse-resize';
    };
    const moveResize = (cx, cy) => {
      if (!resizing) return;
      win.style.width  = (rsW + (cx - rsX)) + 'px';
      win.style.height = (rsH + (cy - rsY)) + 'px';
    };
    const endResize = () => { if (resizing) { resizing = false; document.body.style.cursor = ''; saveDimensions(); } };

    resizer.addEventListener('mousedown', e => { startResize(e.clientX, e.clientY); e.preventDefault(); e.stopPropagation(); });
    resizer.addEventListener('touchstart', e => { startResize(e.touches[0].clientX, e.touches[0].clientY); e.stopPropagation(); }, { passive: true });

    // ── GUTTER (CALCULADORA) ─────────────────────────────────────
    let gutterDragging = false, gX, gW;
    const startGutter = (cx) => {
      gutterDragging = true;
      gX = cx;
      gW = calcPane.offsetWidth;
      gutter.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
    };
    const moveGutter = (cx) => {
      if (!gutterDragging) return;
      const newW = gW - (cx - gX);
      calcPane.style.width = Math.max(240, Math.min(500, newW)) + 'px';
    };
    const endGutter = () => { if (gutterDragging) { gutterDragging = false; gutter.classList.remove('dragging'); document.body.style.cursor = ''; saveDimensions(); } };

    gutter.addEventListener('mousedown', e => { startGutter(e.clientX); e.preventDefault(); });
    gutter.addEventListener('touchstart', e => { startGutter(e.touches[0].clientX); }, { passive: true });

    // ── EVENTOS GLOBALES ─────────────────────────────────────────
    const onMouseMove = e => {
      if (dragging) moveDrag(e.clientX, e.clientY);
      if (resizing) moveResize(e.clientX, e.clientY);
      if (gutterDragging) moveGutter(e.clientX);
    };
    const onTouchMove = e => {
      if (dragging) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
      if (resizing) moveResize(e.touches[0].clientX, e.touches[0].clientY);
      if (gutterDragging) moveGutter(e.touches[0].clientX);
    };
    const onEnd = () => {
      endDrag();
      endResize();
      endGutter();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onEnd);

    // ── CALCULATOR TOGGLE ────────────────────────────────────────
    const toggleCalc = (show) => {
      calcPane.style.display = show ? 'flex' : 'none';
      gutter.style.display = show ? 'flex' : 'none';
      calcToggle.classList.toggle('active', show);
    };

    if (calcToggle) {
      calcToggle.addEventListener('click', () => {
        const isHidden = calcPane.style.display === 'none';
        toggleCalc(isHidden);
      });
    }

    // ── CLOSE ────────────────────────────────────────────────────
    const closeFn = () => {
      originalEditor.innerHTML = focusEditor.innerHTML;
      const fs = focusTB.querySelector('.rt-font-select');
      if (fs) originalEditor.style.fontFamily = fs.value;
      
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onEnd);
      overlay.remove();
    };

    overlay.addEventListener('click', e => { if (e.target === overlay) closeFn(); });
    if (shareBtn) shareBtn.onclick = () => { if (typeof Tasks !== 'undefined') Tasks.shareNote(taskId); };
  },

  insertCheckbox(editor) {
    const html = `<input type="checkbox" class="rt-editor-checkbox" style="width:18px; height:18px; vertical-align:middle; cursor:pointer; accent-color:var(--primary); margin-right:6px"> `;
    document.execCommand('insertHTML', false, html);
  },

  insertTable(editor) {
    const tableHTML = `
      <br>
      <table class="rt-table" style="table-layout: fixed; width: 100%;">
        <tbody>
          <tr><td style="width: 50%;"><br></td><td style="width: 50%;"><br></td></tr>
          <tr><td><br></td><td><br></td></tr>
        </tbody>
      </table>
      <br>
    `;
    document.execCommand('insertHTML', false, tableHTML);
  },

  addTableRow(editor) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    let node = selection.anchorNode;
    if (node && node.nodeType === 3) node = node.parentNode;
    
    if (node && node.closest) {
      const tr = node.closest('tr');
      if (tr) {
        const tdCount = tr.querySelectorAll('td, th').length;
        const newTr = document.createElement('tr');
        for(let i = 0; i < tdCount; i++) {
          const td = document.createElement('td');
          td.innerHTML = '<br>';
          newTr.appendChild(td);
        }
        tr.parentNode.insertBefore(newTr, tr.nextSibling);
      }
    }
  },

  removeTableRow(editor) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    let node = selection.anchorNode;
    if (node && node.nodeType === 3) node = node.parentNode;
    
    if (node && node.closest) {
      const tr = node.closest('tr');
      const table = node.closest('table');
      if (tr && table) {
        tr.remove();
        if (table.querySelectorAll('tr').length === 0) {
          table.remove();
        }
      }
    }
  },

  insertDateTime(editor) {
    const now = new Date();
    const formattedDateTime = now.toLocaleString('es-ES', { 
      day: 'numeric', month: 'long', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
    document.execCommand('insertText', false, `${formattedDateTime} `);
  },

  _bindHashtag(editor) {
    let dropdown = document.getElementById('rt-autocomplete-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'rt-autocomplete-dropdown';
      dropdown.className = 'rt-autocomplete-dropdown';
      document.body.appendChild(dropdown);
    }

    let activeIndex = -1;

    const getCaretCoordinates = () => {
      const sel = window.getSelection();
      if (!sel.rangeCount) return null;
      const range = sel.getRangeAt(0).cloneRange();
      const rect = range.getBoundingClientRect();
      return { x: rect.left, y: rect.bottom + window.scrollY };
    };

    const getHashtagContext = () => {
      const sel = window.getSelection();
      if (!sel.rangeCount) return null;
      const node = sel.anchorNode;
      if (node.nodeType !== 3) return null; // Only text nodes
      
      const text = node.textContent;
      const offset = sel.anchorOffset;
      const before = text.substring(0, offset);
      const hashIdx = before.lastIndexOf('#');
      
      if (hashIdx === -1) return null;
      // Ensure # is at start or after space/newline
      if (hashIdx > 0 && !/\s/.test(before[hashIdx - 1])) return null;
      
      const query = before.substring(hashIdx + 1);
      if (/\s/.test(query)) return null; // No spaces in tag
      
      return { node, hashIdx, query: query.toLowerCase(), rawQuery: query, fullLen: query.length + 1 };
    };

    const showDropdown = (ctx) => {
      const allTags = storage.getAllTags().sort((a, b) => a.name.localeCompare(b.name, 'es'));
      const filtered = ctx.query
        ? allTags.filter(t => t.name.toLowerCase().includes(ctx.query))
        : allTags;

      if (filtered.length === 0 && ctx.query.length < 3) { hideDropdown(); return; }
      if (ctx.query.length < 3 && filtered.length > 0 && !ctx.query) { hideDropdown(); return; }
      if (ctx.query.length > 0 && ctx.query.length < 3) {
         // Show only if there are matches? User said "tres primeras letras"
         // I'll show it only if query.length >= 3 or if it's just #
      }

      // Requirement: "tres primeras letras"
      if (ctx.query.length < 3 && ctx.query.length > 0) { hideDropdown(); return; }

      let html = '';
      if (filtered.length === 0) {
        html = `<div class="rt-ac-item active" data-action="create" data-name="${ctx.rawQuery}">+ Crear "${ctx.rawQuery}"</div>`;
        activeIndex = 0;
      } else {
        activeIndex = 0;
        html = filtered.map((tag, i) => `
          <div class="rt-ac-item ${i === 0 ? 'active' : ''}" data-id="${tag.id}" data-name="${tag.name}">
            <span style="width:8px;height:8px;border-radius:50%;background:${tag.color};display:inline-block;margin-right:8px"></span>
            ${tag.name}
          </div>
        `).join('');
      }

      const coords = getCaretCoordinates();
      if (coords) {
        dropdown.style.left = coords.x + 'px';
        dropdown.style.top = coords.y + 'px';
        dropdown.innerHTML = html;
        dropdown.classList.add('show');
      }

      dropdown.querySelectorAll('.rt-ac-item').forEach(item => {
        item.onmousedown = (e) => {
          e.preventDefault();
          selectTag(item.dataset.id, item.dataset.name, ctx);
        };
      });
    };

    const hideDropdown = () => {
      dropdown.classList.remove('show');
      activeIndex = -1;
    };

    const selectTag = (id, name, ctx) => {
      const node = ctx.node;
      const text = node.textContent;
      const before = text.substring(0, ctx.hashIdx);
      const after = text.substring(ctx.hashIdx + ctx.fullLen);
      
      const tag = storage.getTag(id);
      const color = tag ? tag.color : '#6366f1';
      
      const chip = document.createElement('span');
      chip.className = 'rt-tag-chip';
      chip.contentEditable = 'false';
      chip.dataset.id = id;
      chip.style.cssText = `background:${color}; color:white; padding:2px 8px; border-radius:6px; font-size:0.8rem; margin:0 2px; font-weight:600; display:inline-flex; align-items:center; user-select:none`;
      chip.textContent = '#' + name;

      const parent = node.parentNode;
      const next = node.nextSibling;
      
      parent.removeChild(node);
      if (before) parent.insertBefore(document.createTextNode(before), next);
      parent.insertBefore(chip, next);
      
      const afterNode = document.createTextNode(' ' + after);
      parent.insertBefore(afterNode, next);
      
      const sel = window.getSelection();
      const range = document.createRange();
      range.setStart(afterNode, 1);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      
      hideDropdown();
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    };

    editor.addEventListener('input', (e) => {
      const ctx = getHashtagContext();
      if (ctx) showDropdown(ctx);
      else hideDropdown();
    });

    editor.addEventListener('keydown', (e) => {
      if (!dropdown.classList.contains('show')) return;
      const items = dropdown.querySelectorAll('.rt-ac-item');
      if (items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % items.length;
        items.forEach((it, i) => it.classList.toggle('active', i === activeIndex));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + items.length) % items.length;
        items.forEach((it, i) => it.classList.toggle('active', i === activeIndex));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const item = items[activeIndex];
        if (item) {
          if (item.dataset.action === 'create') {
             const newTag = storage.createTag(item.dataset.name, '#6366f1');
             selectTag(newTag.id, newTag.name, getHashtagContext());
          } else {
             selectTag(item.dataset.id, item.dataset.name, getHashtagContext());
          }
        }
      } else if (e.key === 'Escape') {
        hideDropdown();
      }
    });

    editor.addEventListener('blur', () => setTimeout(hideDropdown, 200));
  },

  // Extrae etiquetas de un texto/html
  extractTags(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const foundTags = new Set();
    
    // 1. From chips
    tmp.querySelectorAll('.rt-tag-chip').forEach(chip => {
      if (chip.dataset.id) foundTags.add(chip.dataset.id);
    });
    
    // 2. From text hashtags
    const text = tmp.innerText || '';
    const regex = /#[\w\u00C0-\u017F]+/g;
    const matches = text.match(regex);
    if (matches) {
      const allTags = storage.getAllTags();
      matches.forEach(m => {
        const name = m.substring(1).toLowerCase();
        const t = allTags.find(x => x.name.toLowerCase() === name);
        if (t) foundTags.add(t.id);
      });
    }
    
    return Array.from(foundTags);
  },

  // ---- Redimensionado de Tablas ----
  _initTableResizing(editor) {
    let isResizing = false;
    let startX, startY, startWidth, startHeight, targetCell, type;

    // Hit detection for mouse
    editor.addEventListener('mousemove', (e) => {
      if (isResizing) return;
      const td = e.target.closest('td, th');
      if (!td) return;

      const rect = td.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const border = 10;

      if (x > rect.width - border) {
        td.style.cursor = 'col-resize';
      } else if (y > rect.height - border) {
        td.style.cursor = 'row-resize';
      } else {
        td.style.cursor = '';
      }
    });

    const startResize = (clientX, clientY, td) => {
      const rect = td.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const border = 20; // Hit area larger for touch

      if (x > rect.width - border) {
        type = 'width';
        targetCell = td;
      } else if (y > rect.height - border) {
        type = 'height';
        targetCell = td;
      } else {
        return false;
      }

      isResizing = true;
      startX = clientX;
      startY = clientY;
      startWidth = td.offsetWidth;
      startHeight = td.offsetHeight;
      document.body.style.cursor = type === 'width' ? 'col-resize' : 'row-resize';
      return true;
    };

    const doResize = (clientX, clientY) => {
      if (!isResizing || !targetCell) return;
      if (type === 'width') {
        const delta = clientX - startX;
        targetCell.style.width = Math.max(40, startWidth + delta) + 'px';
        const table = targetCell.closest('table');
        if (table) table.style.tableLayout = 'fixed';
      } else {
        const delta = clientY - startY;
        targetCell.style.height = Math.max(30, startHeight + delta) + 'px';
      }
    };

    const stopResize = () => {
      isResizing = false;
      targetCell = null;
      document.body.style.cursor = '';
    };

    // Mouse Events
    editor.addEventListener('mousedown', (e) => {
      const td = e.target.closest('td, th');
      if (td && startResize(e.clientX, e.clientY, td)) {
        e.preventDefault();
        const onMouseMove = (me) => doResize(me.clientX, me.clientY);
        const onMouseUp = () => {
          stopResize();
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      }
    });

    // Touch Events (For Cubot Tablet)
    editor.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      const td = e.target.closest('td, th');
      if (td && startResize(touch.clientX, touch.clientY, td)) {
        e.preventDefault();
        const onTouchMove = (te) => {
          if (isResizing) {
            te.preventDefault();
            doResize(te.touches[0].clientX, te.touches[0].clientY);
          }
        };
        const onTouchEnd = () => {
          stopResize();
          window.removeEventListener('touchmove', onTouchMove);
          window.removeEventListener('touchend', onTouchEnd);
        };
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);
      }
    }, { passive: false });
  },
  
  _bindImageTools(editor) {
    // 1. Manejar Pegado de Imágenes
    editor.addEventListener('paste', (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      let imageFound = false;

      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          imageFound = true;
          const blob = item.getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => {
            const html = `<img src="${event.target.result}" style="width:300px; height:auto;">`;
            document.execCommand('insertHTML', false, html);
            editor.dispatchEvent(new Event('input', { bubbles: true }));
          };
          reader.readAsDataURL(blob);
        }
      }

      // Si procesamos una imagen, evitamos que el navegador pegue la original gigante
      if (imageFound) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    // 2. Detectar Click/Touch en Imágenes para mostrar herramientas
    const handleImgAction = (e) => {
      if (e.target.tagName === 'IMG') {
        // En tablets, el click puede ser caprichoso, usamos esto
        this._showImageMenu(e.target, editor);
      } else {
        // Si hacemos clic en cualquier otra parte del editor, ocultamos el menú
        if (!e.target.closest('.rt-img-tools')) {
          this._hideImageMenu();
        }
      }
    };

    editor.addEventListener('mousedown', handleImgAction);
    editor.addEventListener('touchstart', handleImgAction, { passive: true });
  },

  _showImageMenu(img, editor) {
    this._hideImageMenu(); // Limpiar si hay uno abierto

    img.classList.add('selected');
    
    const menu = document.createElement('div');
    menu.className = 'rt-img-tools';
    menu.innerHTML = `
      <button class="rt-img-btn" data-size="25%">25%</button>
      <button class="rt-img-btn" data-size="50%">50%</button>
      <button class="rt-img-btn" data-size="75%">75%</button>
      <button class="rt-img-btn" data-size="100%">100%</button>
      <div style="width:1px; background:#444; margin:0 4px"></div>
      <button class="rt-img-btn danger" data-action="delete">Eliminar</button>
    `;

    document.body.appendChild(menu);

    // Posicionar el menú sobre la imagen
    const rect = img.getBoundingClientRect();
    const menuWidth = menu.offsetWidth || 220;
    const menuHeight = menu.offsetHeight || 40;
    
    let left = (rect.left + rect.width / 2 - menuWidth / 2);
    let top = (rect.top + window.scrollY - menuHeight - 10);

    // Evitar que se salga por la izquierda
    if (left < 10) left = 10;
    // Evitar que se salga por la derecha
    if (left + menuWidth > window.innerWidth - 10) left = window.innerWidth - menuWidth - 10;

    menu.style.left = left + 'px';
    menu.style.top = top + 'px';

    // Eventos del menú
    menu.querySelectorAll('.rt-img-btn').forEach(btn => {
      const runAction = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (btn.dataset.size) {
          // Aplicamos el tamaño con !important para sobreescribir cualquier otro estilo
          img.style.setProperty('width', btn.dataset.size, 'important');
          img.style.setProperty('height', 'auto', 'important');
        } else if (btn.dataset.action === 'delete') {
          img.remove();
        }
        
        this._hideImageMenu();
        // Disparar evento de cambio para que se guarde la nota
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      };

      btn.onmousedown = runAction;
      btn.ontouchstart = runAction;
    });

    // Cerrar al hacer clic fuera
    const closeHandler = (e) => {
      if (!menu.contains(e.target) && e.target !== img) {
        this._hideImageMenu();
        document.removeEventListener('mousedown', closeHandler);
      }
    };
    document.addEventListener('mousedown', closeHandler);
    
    this._activeImageMenu = menu;
  },

  _hideImageMenu() {
    if (this._activeImageMenu) {
      this._activeImageMenu.remove();
      this._activeImageMenu = null;
    }
    document.querySelectorAll('.rt-editor img.selected, .qn-editor img.selected').forEach(img => {
      img.classList.remove('selected');
    });
  }
};

// Listener GLOBAL ÚNICO para la calculadora (Evita pegado doble)
window.addEventListener('calc:copy', (e) => {
  const active = document.activeElement;
  let target = null;

  if (active && (active.classList.contains('rt-editor') || active.classList.contains('qn-editor'))) {
    target = active;
  } else {
    target = document.getElementById('focus-editor') || 
             document.getElementById('note-ta') || 
             document.querySelector('.qn-sheet.active .qn-editor');
  }

  if (target) {
    const scrollPos = target.scrollTop;
    target.focus();
    document.execCommand('insertHTML', false, e.detail.html);
    target.scrollTop = scrollPos;
    
    // Disparar guardado automático si estamos en QuickNotes
    if (typeof QuickNotes !== 'undefined' && target.classList.contains('qn-editor')) {
      QuickNotes.triggerAutoSave();
    }
  }
});
