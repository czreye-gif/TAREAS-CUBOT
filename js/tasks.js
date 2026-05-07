// ============================================================
// tasks.js — Renderizado de tareas, formulario, subtareas
// ============================================================

const Tasks = {

  currentFilter: 'all',

  // ---- Renderizar lista de tareas ----

  renderTaskList(containerId, dateStr, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let tasks = storage.getTasksByDate(dateStr);

    // Filtro
    const filter = options.filter || this.currentFilter;
    if (filter === 'pending') tasks = tasks.filter(t => !t.completed);
    else if (filter === 'completed') tasks = tasks.filter(t => t.completed);

    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>Sin tareas</h3>
          <p>${filter === 'completed' ? 'No hay tareas completadas' : 'No hay tareas para este día'}</p>
          ${!options.hideAdd ? '<button class="btn btn-primary btn-add-empty" onclick="app.navigate(\'new-task\')">+ Nueva Tarea</button>' : ''}
        </div>
      `;
      return;
    }

    container.innerHTML = tasks.map(task => this._renderTaskCard(task, options)).join('');
    this._bindTaskEvents(container);
  },

  _renderTaskCard(task, options = {}) {
    const subtasksHTML = this._renderSubtasks(task);
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const completedSubs = hasSubtasks ? task.subtasks.filter(s => s.completed).length : 0;
    const totalSubs = hasSubtasks ? task.subtasks.length : 0;
    const progressPct = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;

    const alarmBadge = task.alarm ? `<span class="badge badge-alarm" title="Alarma: ${new Date(task.alarm).toLocaleString('es-MX')}">🔔</span>` : '';
    const deadlineBadge = task.deadline ? `<span class="badge badge-deadline" title="Fecha límite: ${task.deadline}">📅 ${UI.formatDateShort(task.deadline)}</span>` : '';
    const codeBadge = `<span class="badge badge-code" title="Código de tarea">${task.code || '---'}</span>`;
    const tagPills = (task.tags || []).map(tid => {
      const tag = storage.getTag(tid);
      return tag ? `<span class="tag-pill-card"><span style="width:7px;height:7px;border-radius:50%;background:${tag.color};display:inline-block;flex-shrink:0"></span>${this._escapeHTML(tag.name)}</span>` : '';
    }).join('');

    const isOverdue = !task.completed && (
      (task.deadline && task.deadline < storage._todayStr()) ||
      (task.date < storage._todayStr())
    );

    return `
      <div class="task-card ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''} priority-${task.priority}"
           data-task-id="${task.id}" data-draggable data-date="${task.date}">
        <div class="task-card-header">
          <div class="drag-handle" title="Arrastrar para reagendar">⠿</div>
          <button class="task-check ${task.completed ? 'checked' : ''}" data-action="toggle" data-id="${task.id}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              ${task.completed ? '<polyline points="20,6 9,17 4,12"/>' : ''}
            </svg>
          </button>
          <div class="task-info">
            <div class="task-title-row">
              <h4 class="task-title">${this._escapeHTML(task.title)}</h4>
              ${tagPills ? `<div class="task-tag-row">${tagPills}</div>` : ''}
            </div>
            <div class="task-meta">
              ${codeBadge}
              ${task.timeStart ? `<span class="task-time">${task.timeStart}${task.timeEnd ? ' - ' + task.timeEnd : ''}</span>` : ''}
              <span class="task-category">${UI.categoryIcon(task.category)}</span>
              <span class="task-priority-dot" style="background:${UI.priorityColor(task.priority)}" title="${UI.priorityLabel(task.priority)}"></span>
              ${alarmBadge}${deadlineBadge}
            </div>
          </div>
          <div class="task-actions">
            <button class="task-action-btn" data-action="reschedule" data-id="${task.id}" title="Reagendar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              </svg>
            </button>
            <button class="task-action-btn danger" data-action="delete" data-id="${task.id}" title="Eliminar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        </div>
        <button class="task-notes-btn ${(task.description || (task.attachments && task.attachments.length > 0)) ? 'has-notes' : 'no-notes'}" data-action="show-notes" data-id="${task.id}" title="${(task.description || (task.attachments && task.attachments.length > 0)) ? 'Ver / editar notas' : 'Agregar nota'}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          ${(task.description || (task.attachments && task.attachments.length > 0)) ? 'Notas' : '+ Nota'}
        </button>
        ${task.description ? `<div class="task-notes-content" id="notes-${task.id}" style="display:none">
          <p class="task-description">${this._escapeHTML(task.description)}</p>
        </div>` : ''}
        ${hasSubtasks ? `
          <div class="subtask-section">
            <div class="subtask-progress">
              <div class="progress-bar"><div class="progress-fill" style="width:${progressPct}%"></div></div>
              <span class="progress-label">${completedSubs}/${totalSubs}</span>
            </div>
            <div class="subtask-list" data-task-id="${task.id}">
              ${subtasksHTML}
            </div>
          </div>
        ` : ''}
        <div class="subtask-add" data-task-id="${task.id}">
          <button class="btn-add-subtask" data-action="add-subtask" data-id="${task.id}">+ Subtarea</button>
        </div>
      </div>
    `;
  },

  _renderSubtasks(task) {
    if (!task.subtasks || task.subtasks.length === 0) return '';
    return task.subtasks.map(sub => `
      <div class="subtask-item ${sub.completed ? 'completed' : ''}" data-subtask-id="${sub.id}">
        <button class="subtask-check ${sub.completed ? 'checked' : ''}"
                data-action="toggle-sub" data-task-id="${task.id}" data-sub-id="${sub.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            ${sub.completed ? '<polyline points="20,6 9,17 4,12"/>' : ''}
          </svg>
        </button>
        <span class="subtask-title">${this._escapeHTML(sub.title)}</span>
        <button class="subtask-delete" data-action="delete-sub" data-task-id="${task.id}" data-sub-id="${sub.id}">&times;</button>
      </div>
    `).join('');
  },

  // ---- Eventos de tarjetas ----

  _bindTaskEvents(container) {
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        switch (action) {
          case 'toggle': this.toggleTask(id); break;
          case 'edit': this.editTask(id); break;
          case 'delete': this.deleteTask(id); break;
          case 'reschedule': this.rescheduleTask(id); break;
          case 'add-subtask': this.promptAddSubtask(id); break;
          case 'toggle-sub': this.toggleSubtask(btn.dataset.taskId, btn.dataset.subId); break;
          case 'delete-sub': this.deleteSubtask(btn.dataset.taskId, btn.dataset.subId); break;
          case 'show-notes': this.showNotes(id); break;
        }
      };
    });
  },

  // ---- Acciones de tareas ----

  showNotes(id) {
    const task = storage.getTask(id);
    if (!task) return;
    const attachments = [...(task.attachments || [])];

    // ── Construir modal ──────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px';

    const box = document.createElement('div');
    box.style.cssText = 'background:#1e1e2e;border-radius:14px;padding:24px;width:100%;max-width:520px;max-height:88vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,0.7);display:flex;flex-direction:column;gap:14px';

    box.innerHTML = `
      <h3 style="margin:0;font-size:1rem;color:#e2e8f0">📋 Notas — ${this._escapeHTML(task.title)}</h3>

      <textarea id="note-ta" placeholder="Escribe las notas de esta tarea..." style="
        width:100%;min-height:110px;resize:vertical;padding:12px;
        background:#16213e;border:1px solid #6366f1;border-radius:8px;
        color:#e2e8f0;font-size:0.9rem;line-height:1.6;font-family:inherit;
        outline:none;box-sizing:border-box">${this._escapeHTML(task.description || '')}</textarea>

      <div id="att-list" style="display:flex;flex-direction:column;gap:8px"></div>

      <div style="display:flex;gap:10px;align-items:stretch">
        <label id="clip-btn" style="
          flex:1;display:flex;align-items:center;justify-content:center;gap:8px;
          padding:12px;border-radius:10px;cursor:pointer;
          border:2px solid #6366f1;background:rgba(99,102,241,0.15);
          color:#a5b4fc;font-size:0.85rem;font-weight:600;
          transition:all .15s">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" stroke-width="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
          </svg>
          Adjuntar archivo
          <input id="att-input" type="file" accept="image/*,application/pdf,.pdf" multiple style="display:none">
        </label>

        <div id="paste-zone" style="
          flex:1;display:flex;align-items:center;justify-content:center;gap:8px;
          padding:12px;border-radius:10px;cursor:pointer;
          border:2px dashed #4b5563;background:rgba(75,85,99,0.1);
          color:#9ca3af;font-size:0.85rem;font-weight:600;
          transition:all .15s;text-align:center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
          </svg>
          Ctrl+V para pegar imagen
        </div>
      </div>

      <div id="att-err" style="color:#ef4444;font-size:0.75rem;display:none"></div>

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">
        <button id="note-cancel" style="padding:8px 18px;border-radius:8px;border:1px solid #374151;background:transparent;color:#e2e8f0;cursor:pointer;font-size:0.875rem">Cancelar</button>
        <button id="note-save"   style="padding:8px 18px;border-radius:8px;border:none;background:#6366f1;color:#fff;cursor:pointer;font-size:0.875rem;font-weight:600">💾 Guardar</button>
      </div>`;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // ── Render adjuntos ──────────────────────────────────────
    const attList = box.querySelector('#att-list');
    const errEl   = box.querySelector('#att-err');

    const renderAtts = () => {
      attList.innerHTML = attachments.map((att, i) => `
        <div style="background:#16213e;border:1px solid #2d3748;border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:6px">
          ${att.type.startsWith('image/')
            ? `<img src="${att.data}" style="max-width:100%;max-height:160px;border-radius:6px;object-fit:contain">`
            : `<div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:1.4rem">📄</span>
                <div>
                  <div style="font-size:0.8rem;color:#e2e8f0">${att.name}</div>
                  <a href="${att.data}" download="${att.name}" style="font-size:0.7rem;color:#818cf8">⬇ Descargar PDF</a>
                </div>
               </div>`
          }
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:0.7rem;color:#6b7280">${att.name}</span>
            <button data-i="${i}" style="background:#7f1d1d;border:none;color:#fca5a5;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:0.75rem">✕ Quitar</button>
          </div>
        </div>`).join('');
      attList.querySelectorAll('[data-i]').forEach(btn => {
        btn.onclick = () => { attachments.splice(+btn.dataset.i, 1); renderAtts(); };
      });
    };
    renderAtts();

    // ── Procesar archivo ─────────────────────────────────────
    const addFile = (file) => new Promise(resolve => {
      if (file.size > 2 * 1024 * 1024) {
        errEl.style.display = 'block';
        errEl.textContent = `"${file.name}" es mayor a 2MB.`;
        return resolve(false);
      }
      errEl.style.display = 'none';
      const fr = new FileReader();
      fr.onload = e => {
        attachments.push({ name: file.name, type: file.type, data: e.target.result });
        renderAtts();
        resolve(true);
      };
      fr.readAsDataURL(file);
    });

    // ── Input de archivo ─────────────────────────────────────
    const attInput = box.querySelector('#att-input');
    box.querySelector('#clip-btn').onmouseover = function(){ this.style.background='rgba(99,102,241,0.3)'; };
    box.querySelector('#clip-btn').onmouseout  = function(){ this.style.background='rgba(99,102,241,0.15)'; };
    attInput.onchange = async () => {
      for (const f of attInput.files) await addFile(f);
      attInput.value = '';
    };

    // ── Pegar desde portapapeles (Ctrl+V en cualquier parte del modal) ──
    const pasteZone = box.querySelector('#paste-zone');
    const handlePaste = async (e) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imgItem = items.find(it => it.type.startsWith('image/'));
      if (!imgItem) return;
      e.preventDefault();
      const file = imgItem.getAsFile();
      if (!file) return;
      pasteZone.style.borderColor = '#6366f1';
      pasteZone.style.background  = 'rgba(99,102,241,0.15)';
      pasteZone.style.color = '#a5b4fc';
      pasteZone.innerHTML = '⏳ Procesando...';
      const ok = await addFile(new File([file], `imagen_${Date.now()}.png`, { type: file.type }));
      pasteZone.style.borderColor = ok ? '#10b981' : '#ef4444';
      pasteZone.innerHTML = ok ? '✅ Imagen pegada' : '❌ Error';
      setTimeout(() => {
        pasteZone.style.borderColor = '#4b5563';
        pasteZone.style.background  = 'rgba(75,85,99,0.1)';
        pasteZone.style.color = '#9ca3af';
        pasteZone.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/></svg> Ctrl+V para pegar imagen`;
      }, 2000);
    };
    box.addEventListener('paste', handlePaste);

    // Click en zona de pegado también abre explorador
    pasteZone.onclick = () => attInput.click();

    // ── Botones ──────────────────────────────────────────────
    box.querySelector('#note-cancel').onclick = () => overlay.remove();
    box.querySelector('#note-save').onclick = () => {
      const text = box.querySelector('#note-ta').value;
      storage.updateTask(id, { description: text, attachments: [...attachments] });
      UI.toast('Nota guardada', 'success');
      overlay.remove();
      app.refreshCurrentView();
    };
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

    // Focus
    setTimeout(() => box.querySelector('#note-ta')?.focus(), 80);
  },

  cancelForm() {
    this.resetForm();
    app.navigate('today');
  },

  toggleTask(id) {
    storage.toggleTask(id);
    app.refreshCurrentView();
  },

  async deleteTask(id) {
    const confirmed = await UI.confirm('Eliminar tarea', '¿Estás seguro de que deseas eliminar esta tarea?');
    if (confirmed) {
      storage.deleteTask(id);
      UI.toast('Tarea eliminada', 'success');
      app.refreshCurrentView();
    }
  },

  async rescheduleTask(id) {
    const task = storage.getTask(id);
    if (!task) return;
    const newDate = await UI.pickDate(task.date);
    if (newDate && newDate !== task.date) {
      storage.moveTask(id, newDate);
      UI.toast(`Tarea movida al ${UI.formatDateShort(newDate)}`, 'success');
      app.refreshCurrentView();
    }
  },

  editTask(id) {
    const task = storage.getTask(id);
    if (!task) return;
    app.navigate('new-task');
    setTimeout(() => this.fillForm(task), 100);
  },

  // ---- Subtareas ----

  async promptAddSubtask(taskId) {
    const html = `<input type="text" id="subtask-input" class="input-field" placeholder="Nombre de la subtarea" autofocus>`;
    const result = await UI.modal('Nueva Subtarea', html, [
      { label: 'Cancelar', class: 'btn-secondary' },
      { label: 'Agregar', class: 'btn-primary' }
    ]);
    if (result === 1) {
      const input = document.getElementById('subtask-input');
      const title = input ? input.value.trim() : '';
      if (title) {
        storage.addSubtask(taskId, title);
        app.refreshCurrentView();
      }
    }
  },

  toggleSubtask(taskId, subId) {
    storage.toggleSubtask(taskId, subId);
    app.refreshCurrentView();
  },

  deleteSubtask(taskId, subId) {
    storage.deleteSubtask(taskId, subId);
    app.refreshCurrentView();
  },

  // ---- Formulario de creación / edición ----

  initForm() {
    const form = document.getElementById('task-form');
    if (!form) return;
    // CORRECCIÓN: evitar agregar el listener más de una vez
    if (!form._submitBound) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitForm();
      });
      form._submitBound = true;
    }
    // Set default date
    const dateInput = document.getElementById('task-date');
    if (dateInput && !dateInput.value) {
      dateInput.value = app.selectedDate || storage._todayStr();
    }
    // Reset editing
    form.dataset.editId = '';

    // Subtask management in form
    const addSubBtn = document.getElementById('form-add-subtask');
    if (addSubBtn) {
      addSubBtn.onclick = () => this.addFormSubtask();
    }
    // Init selected tags display + hashtag autocomplete
    this._formSelectedTags = [];
    this._renderSelectedTags();
    this._renderQuickTags();
    this._formAttachments = [];
    this._renderFormAtts();
    this._initFormAttachments();
    this._initTagAutocomplete('task-title');
    this._initTagAutocomplete('task-description');
  },

  // ---- Chips de etiquetas asignadas bajo el título ----

  // ---- Adjuntos en formulario ----
  _formAttachments: [],

  _renderFormAtts() {
    const list = document.getElementById('form-att-list');
    if (!list) return;
    list.innerHTML = this._formAttachments.map((att, i) => `
      <div style="background:#16213e;border:1px solid #2d3748;border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:6px">
        ${att.type.startsWith('image/')
          ? `<img src="${att.data}" style="max-width:100%;max-height:120px;border-radius:6px;object-fit:contain">`
          : `<div style="display:flex;align-items:center;gap:8px"><span style="font-size:1.3rem">📄</span><span style="font-size:0.8rem;color:#e2e8f0">${att.name}</span></div>`
        }
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:0.7rem;color:#6b7280">${att.name}</span>
          <button type="button" data-att-i="${i}" style="background:#7f1d1d;border:none;color:#fca5a5;border-radius:6px;padding:2px 8px;cursor:pointer;font-size:0.75rem">✕ Quitar</button>
        </div>
      </div>`).join('');
    list.querySelectorAll('[data-att-i]').forEach(btn => {
      btn.onclick = () => { this._formAttachments.splice(+btn.dataset.attI, 1); this._renderFormAtts(); };
    });
  },

  _addFormFile(file) {
    return new Promise(resolve => {
      const errEl = document.getElementById('form-att-err');
      if (file.size > 2 * 1024 * 1024) {
        if (errEl) { errEl.style.display = 'block'; errEl.textContent = `"${file.name}" supera 2MB.`; }
        return resolve(false);
      }
      if (errEl) errEl.style.display = 'none';
      const fr = new FileReader();
      fr.onload = e => {
        this._formAttachments.push({ name: file.name, type: file.type, data: e.target.result });
        this._renderFormAtts();
        resolve(true);
      };
      fr.readAsDataURL(file);
    });
  },

  _initFormAttachments() {
    const input     = document.getElementById('form-att-input');
    const pasteZone = document.getElementById('form-paste-zone');
    const form      = document.getElementById('task-form');
    if (!input || !pasteZone || !form) return;

    input.onchange = async () => {
      for (const f of input.files) await this._addFormFile(f);
      input.value = '';
    };

    pasteZone.onclick = () => input.click();

    if (!form._attPasteBound) {
      form._attPasteBound = true;
      form.addEventListener('paste', async (e) => {
        const img = Array.from(e.clipboardData?.items || []).find(it => it.type.startsWith('image/'));
        if (!img) return;
        e.preventDefault();
        const file = img.getAsFile();
        if (!file) return;
        pasteZone.style.borderColor = '#6366f1';
        pasteZone.style.color = '#a5b4fc';
        pasteZone.textContent = '⏳ Procesando...';
        await this._addFormFile(new File([file], `img_${Date.now()}.png`, { type: file.type }));
        pasteZone.style.borderColor = '#10b981';
        pasteZone.textContent = '✅ Imagen pegada';
        setTimeout(() => {
          pasteZone.style.borderColor = '#4b5563';
          pasteZone.style.color = '#9ca3af';
          pasteZone.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/></svg> Ctrl+V pegar imagen`;
        }, 2000);
      });
    }
  },

  _renderQuickTags() {
    this._renderSelectedTags();
  },

  _renderSelectedTags() {
    const container = document.getElementById('form-tags-selected');
    if (!container) return;
    if (this._formSelectedTags.length === 0) {
      container.innerHTML = '<span style="color:var(--muted);font-size:0.8rem;font-style:italic">Sin etiquetas asignadas</span>';
      return;
    }
    container.innerHTML = this._formSelectedTags.map(tagId => {
      const tag = storage.getTag(tagId);
      if (!tag) return '';
      return `<span class="tag-selected-pill" data-tag-id="${tag.id}" style="background:${tag.color}">
        ${this._escapeHTML(tag.name)}
        <button type="button" class="tag-remove-btn" title="Quitar">&times;</button>
      </span>`;
    }).join('');
    container.querySelectorAll('.tag-remove-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const tagId = btn.parentElement.dataset.tagId;
        this._formSelectedTags = this._formSelectedTags.filter(id => id !== tagId);
        this._renderSelectedTags();
      };
    });
  },

  _addTagToForm(tagId) {
    if (!this._formSelectedTags.includes(tagId)) {
      this._formSelectedTags.push(tagId);
      this._renderSelectedTags();
    }
  },

  // ---- Hashtag Autocomplete ----

  _initTagAutocomplete(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.removeEventListener('input', input._tagHandler);
    input.removeEventListener('keydown', input._tagKeyHandler);
    input.removeEventListener('blur', input._tagBlurHandler);

    let dropdown = document.getElementById(`tag-dropdown-${inputId}`);
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = `tag-dropdown-${inputId}`;
      dropdown.className = 'tag-autocomplete-dropdown';
      input.parentElement.style.position = 'relative';
      input.parentElement.appendChild(dropdown);
    }

    let activeIndex = -1;

    const getHashtagContext = () => {
      const val = input.value;
      const pos = input.selectionStart;
      const before = val.substring(0, pos);
      const hashIdx = before.lastIndexOf('#');
      if (hashIdx === -1) return null;
      if (hashIdx > 0 && before[hashIdx - 1] !== ' ' && before[hashIdx - 1] !== '\n') return null;
      const query = before.substring(hashIdx + 1);
      if (query.includes(' ') || query.includes('\n')) return null;
      return { hashIdx, query: query.toLowerCase(), rawQuery: before.substring(hashIdx + 1), fullLen: query.length + 1 };
    };

    const showDropdown = (ctx) => {
      const allTags = storage.getAllTags().sort((a, b) => a.name.localeCompare(b.name, 'es'));
      const filtered = ctx.query
        ? allTags.filter(t => t.name.toLowerCase().includes(ctx.query))
        : allTags;

      let html = '';

      if (filtered.length === 0 && ctx.rawQuery.length > 0) {
        // No matches — offer to create
        html = `<button type="button" class="tag-ac-item tag-ac-create active" data-action="create" data-name="${this._escapeHTML(ctx.rawQuery)}">
          <span class="tag-ac-dot" style="background:var(--primary)">+</span>
          <span class="tag-ac-name">Crear "<strong>${this._escapeHTML(ctx.rawQuery)}</strong>"</span>
        </button>`;
        activeIndex = 0;
      } else {
        activeIndex = 0;
        html = filtered.map((tag, i) =>
          `<button type="button" class="tag-ac-item ${i === 0 ? 'active' : ''}" data-tag-id="${tag.id}" data-tag-name="${this._escapeHTML(tag.name)}">
            <span class="tag-ac-dot" style="background:${tag.color}"></span>
            <span class="tag-ac-name">${this._escapeHTML(tag.name)}</span>
          </button>`
        ).join('');

        // Add create option at the bottom if user typed something
        if (ctx.rawQuery.length > 0) {
          const exactMatch = filtered.some(t => t.name.toLowerCase() === ctx.query);
          if (!exactMatch) {
            html += `<button type="button" class="tag-ac-item tag-ac-create" data-action="create" data-name="${this._escapeHTML(ctx.rawQuery)}">
              <span class="tag-ac-dot" style="background:var(--primary)">+</span>
              <span class="tag-ac-name">Crear "<strong>${this._escapeHTML(ctx.rawQuery)}</strong>"</span>
            </button>`;
          }
        }
      }

      dropdown.innerHTML = html;
      dropdown.classList.add('show');

      // Click handlers
      dropdown.querySelectorAll('.tag-ac-item').forEach(item => {
        item.onmousedown = (e) => {
          e.preventDefault();
          if (item.dataset.action === 'create') {
            createAndSelect(item.dataset.name, ctx);
          } else {
            selectTag(item.dataset.tagId, item.dataset.tagName, ctx);
          }
        };
      });
    };

    const hideDropdown = () => {
      dropdown.classList.remove('show');
      dropdown.innerHTML = '';
      activeIndex = -1;
    };

    const selectTag = (tagId, tagName, ctx) => {
      // Remove #query from input
      const val = input.value;
      const before = val.substring(0, ctx.hashIdx);
      const after = val.substring(ctx.hashIdx + ctx.fullLen);
      input.value = before + after;
      input.focus();
      input.selectionStart = input.selectionEnd = ctx.hashIdx;

      // Add to selected tags
      this._addTagToForm(tagId);
      UI.toast(`Etiqueta "${tagName}" agregada`, 'success');
      hideDropdown();
    };

    const createAndSelect = (name, ctx) => {
      const colors = app._tagColors || ['#6366f1'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const tag = storage.createTag(name, color);

      // Remove #query from input
      const val = input.value;
      const before = val.substring(0, ctx.hashIdx);
      const after = val.substring(ctx.hashIdx + ctx.fullLen);
      input.value = before + after;
      input.focus();
      input.selectionStart = input.selectionEnd = ctx.hashIdx;

      this._addTagToForm(tag.id);
      UI.toast(`Etiqueta "${name}" creada y agregada`, 'success');
      hideDropdown();
    };

    input._tagHandler = () => {
      const ctx = getHashtagContext();
      if (ctx) {
        showDropdown(ctx);
      } else {
        hideDropdown();
      }
    };

    input._tagKeyHandler = (e) => {
      if (!dropdown.classList.contains('show')) return;
      const items = dropdown.querySelectorAll('.tag-ac-item');
      if (items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % items.length;
        items.forEach((it, i) => it.classList.toggle('active', i === activeIndex));
        items[activeIndex].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + items.length) % items.length;
        items.forEach((it, i) => it.classList.toggle('active', i === activeIndex));
        items[activeIndex].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (activeIndex >= 0 && activeIndex < items.length) {
          e.preventDefault();
          const item = items[activeIndex];
          const ctx = getHashtagContext();
          if (!ctx) return;
          if (item.dataset.action === 'create') {
            createAndSelect(item.dataset.name, ctx);
          } else {
            selectTag(item.dataset.tagId, item.dataset.tagName, ctx);
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideDropdown();
      }
    };

    input._tagBlurHandler = () => {
      setTimeout(() => hideDropdown(), 200);
    };

    input.addEventListener('input', input._tagHandler);
    input.addEventListener('keydown', input._tagKeyHandler);
    input.addEventListener('blur', input._tagBlurHandler);
  },

  addFormSubtask() {
    const input = document.getElementById('form-subtask-input');
    const list = document.getElementById('form-subtask-list');
    if (!input || !list) return;
    const title = input.value.trim();
    if (!title) return;
    const id = Date.now().toString(36);
    const item = document.createElement('div');
    item.className = 'form-subtask-item';
    item.dataset.id = id;
    item.innerHTML = `
      <span>${this._escapeHTML(title)}</span>
      <button type="button" class="subtask-remove" onclick="this.parentElement.remove()">&times;</button>
    `;
    list.appendChild(item);
    input.value = '';
    input.focus();
  },

  fillForm(task) {
    const form = document.getElementById('task-form');
    if (!form) return;
    form.dataset.editId = task.id;
    document.getElementById('task-title').value = task.title || '';
    document.getElementById('task-description').value = task.description || '';
    document.getElementById('task-date').value = task.date || '';
    document.getElementById('task-time-start').value = task.timeStart || '';
    document.getElementById('task-time-end').value = task.timeEnd || '';
    document.getElementById('task-priority').value = task.priority || 'medium';
    document.getElementById('task-category').value = task.category || 'otro';
    document.getElementById('task-deadline').value = task.deadline || '';
    document.getElementById('task-alarm').value = task.alarm ? task.alarm.slice(0, 16) : '';

    // Recurrence
    const recType = document.getElementById('task-recurrence');
    const recUntil = document.getElementById('task-rec-until');
    if (task.recurrence) {
      recType.value = task.recurrence.type;
      recUntil.value = task.recurrence.until || '';
    } else {
      recType.value = 'none';
      recUntil.value = '';
    }

    // Subtasks
    const list = document.getElementById('form-subtask-list');
    list.innerHTML = '';
    (task.subtasks || []).forEach(sub => {
      const item = document.createElement('div');
      item.className = 'form-subtask-item';
      item.dataset.id = sub.id;
      item.innerHTML = `
        <span>${this._escapeHTML(sub.title)}</span>
        <button type="button" class="subtask-remove" onclick="this.parentElement.remove()">&times;</button>
      `;
      list.appendChild(item);
    });

    // Update title
    document.getElementById('form-title').textContent = 'Editar Tarea';
    document.getElementById('form-submit-btn').textContent = 'Guardar Cambios';

    // Tags
    this._formSelectedTags = [...(task.tags || [])];
    this._renderSelectedTags();
    this._renderQuickTags();
    // Adjuntos
    this._formAttachments = [...(task.attachments || [])];
    this._renderFormAtts();
  },

  resetForm() {
    const form = document.getElementById('task-form');
    if (!form) return;
    form.reset();
    form.dataset.editId = '';
    document.getElementById('task-date').value = storage._todayStr();
    document.getElementById('form-subtask-list').innerHTML = '';
    document.getElementById('form-title').textContent = 'Nueva Tarea';
    document.getElementById('form-submit-btn').textContent = 'Crear Tarea';
    this._formSelectedTags = [];
    this._renderSelectedTags();
    this._renderQuickTags();
    this._formAttachments = [];
    this._renderFormAtts();
  },

  submitForm() {
    const form = document.getElementById('task-form');
    const title = document.getElementById('task-title').value.trim();
    if (!title) {
      UI.toast('El título es obligatorio', 'warning');
      return;
    }

    // Collect subtasks from form
    const subtaskEls = document.querySelectorAll('#form-subtask-list .form-subtask-item');
    const subtasks = Array.from(subtaskEls).map(el => ({
      id: el.dataset.id || storage._id(),
      title: el.querySelector('span').textContent,
      completed: false
    }));

    const recType = document.getElementById('task-recurrence').value;
    const recurrence = recType !== 'none' ? {
      type: recType,
      until: document.getElementById('task-rec-until').value || null
    } : null;

    const alarmVal = document.getElementById('task-alarm').value;

    // Collect selected tags
    const selectedTags = this._formSelectedTags || [];

    const taskData = {
      title,
      description: document.getElementById('task-description').value.trim(),
      date: document.getElementById('task-date').value,
      timeStart: document.getElementById('task-time-start').value,
      timeEnd: document.getElementById('task-time-end').value,
      priority: document.getElementById('task-priority').value,
      category: document.getElementById('task-category').value,
      deadline: document.getElementById('task-deadline').value || null,
      alarm: alarmVal ? new Date(alarmVal).toISOString() : null,
      recurrence,
      tags: selectedTags,
      subtasks,
      attachments: this._formAttachments || []
    };

    const editId = form.dataset.editId;
    if (editId) {
      storage.updateTask(editId, taskData);
      UI.toast('Tarea actualizada', 'success');
    } else {
      // Handle recurrence - create multiple tasks
      if (recurrence) {
        this._createRecurringTasks(taskData);
      } else {
        storage.createTask(taskData);
      }
      UI.toast('Tarea creada', 'success');
    }

    this.resetForm();
    app.navigate('today');
  },

  _createRecurringTasks(taskData) {
    const startDate = new Date(taskData.date + 'T12:00:00');
    const endDate = taskData.recurrence.until
      ? new Date(taskData.recurrence.until + 'T12:00:00')
      : new Date(startDate.getFullYear(), 11, 31); // End of year

    let current = new Date(startDate);
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const data = { ...taskData, date: dateStr, recurrence: null };
      data.subtasks = taskData.subtasks.map(s => ({ ...s, id: storage._id() }));
      storage.createTask(data);

      switch (taskData.recurrence.type) {
        case 'daily': current.setDate(current.getDate() + 1); break;
        case 'weekly': current.setDate(current.getDate() + 7); break;
        case 'monthly': current.setMonth(current.getMonth() + 1); break;
      }
    }
  },

  // ---- Stats Cards ----

  renderStats(containerId, dateStr) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const stats = storage.getStatsForDate(dateStr);
    const overdue = storage.getOverdueTasks().length;

    container.innerHTML = `
      <div class="stat-card stat-total">
        <div class="stat-icon">📋</div>
        <div class="stat-value">${stats.total}</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="stat-card stat-pending">
        <div class="stat-icon">⏳</div>
        <div class="stat-value">${stats.pending}</div>
        <div class="stat-label">Pendientes</div>
      </div>
      <div class="stat-card stat-completed">
        <div class="stat-icon">✅</div>
        <div class="stat-value">${stats.completed}</div>
        <div class="stat-label">Completadas</div>
      </div>
      <div class="stat-card stat-overdue">
        <div class="stat-icon">🔴</div>
        <div class="stat-value">${overdue}</div>
        <div class="stat-label">Vencidas</div>
      </div>
    `;
  },

  // ---- Utilidades ----

  _escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
