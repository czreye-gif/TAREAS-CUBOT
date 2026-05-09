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

    // Focus Mode Logic (Manual Trigger via Button)
    const expandBtn = toolbar.querySelector('.rt-expand-btn');
    if (expandBtn) {
      expandBtn.onclick = (e) => {
        e.preventDefault();
        this.enterFocusMode(editor, toolbar);
      };
    }

    // Convert to Task Logic
    const convertBtn = toolbar.querySelector('.rt-convert-btn');
    if (convertBtn) {
      const isNote = editor.dataset.type === 'note';
      convertBtn.style.display = isNote ? 'block' : 'none';
      convertBtn.onclick = (e) => {
        e.preventDefault();
        const taskId = editor.id === 'focus-editor' ? editor._originalId : editor.dataset.taskId;
        if (typeof Tasks !== 'undefined') Tasks.convertNoteToTask(taskId);
      };
    }

    // Share logic in editor
    const shareBtn = toolbar.querySelector('.rt-share-btn');
    if (shareBtn) {
      shareBtn.onclick = (e) => {
        e.preventDefault();
        const taskId = editor.id === 'focus-editor' ? editor._originalId : editor.dataset.taskId;
        if (taskId && typeof Tasks !== 'undefined') {
          Tasks.shareNote(taskId);
        } else {
          // If no taskId, share current content as text/image (temp)
          UI.toast('Guarda la nota antes de compartirla completamente', 'warning');
        }
      };
    }
  },

  enterFocusMode(originalEditor, originalToolbar) {
    const folio = originalEditor.dataset.folio || 'NUEVA';
    const overlay = document.createElement('div');
    overlay.className = 'rt-focus-overlay';
    overlay.innerHTML = `
      <div class="rt-focus-window">
        <div class="rt-focus-header">
          <span>📝 Nota Folio: ${folio}</span>
          <div style="display:flex; gap:8px">
            <button class="rt-share-focus" style="background:var(--primary); color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer">Compartir</button>
            <button class="rt-close-focus">MINIMIZAR ESCALA</button>
          </div>
        </div>
        <div class="rt-toolbar" id="focus-toolbar">
          ${originalToolbar.innerHTML}
        </div>
        <div class="rt-editor postit-note" contenteditable="true" id="focus-editor">
          ${originalEditor.innerHTML}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const focusEditor = overlay.querySelector('#focus-editor');
    const focusToolbar = overlay.querySelector('#focus-toolbar');
    const closeBtn = overlay.querySelector('.rt-close-focus');

    // Remove the EXPAND/CONVERT buttons from focus toolbar to avoid recursion/confusion
    const innerExpandBtn = focusToolbar.querySelector('.rt-expand-btn');
    if (innerExpandBtn) innerExpandBtn.remove();
    const innerConvertBtn = focusToolbar.querySelector('.rt-convert-btn');
    if (innerConvertBtn) innerConvertBtn.remove();

    // Re-bind toolbar in focus mode
    focusEditor._originalId = originalEditor.id === 'task-description' ? null : originalEditor.dataset.taskId;
    this.init('#focus-editor', '#focus-toolbar');
    
    // Focus the new editor
    setTimeout(() => focusEditor.focus(), 50);

    closeBtn.onclick = () => {
      originalEditor.innerHTML = focusEditor.innerHTML;
      overlay.remove();
      originalEditor.focus();
    };

    const shareFocusBtn = overlay.querySelector('.rt-share-focus');
    if (shareFocusBtn) {
      shareFocusBtn.onclick = () => {
        const taskId = focusEditor._originalId;
        if (taskId && typeof Tasks !== 'undefined') Tasks.shareNote(taskId);
        else UI.toast('Guarda los cambios primero', 'warning');
      };
    }
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
  }
};
