// ============================================================
// notes.js — Lógica para la Biblioteca de Notas
// ============================================================

const Notes = {
  activeTags: [],
  searchQuery: '',
  dateFilter: '',
  typeFilter: 'all',

  init() {
    // Cargar fuente guardada
    const savedFont = localStorage.getItem('notes-font') || "'Roboto', sans-serif";
    document.documentElement.style.setProperty('--font-notes', savedFont);
    const fontSelector = document.getElementById('notes-font-selector');
    if (fontSelector) {
      fontSelector.value = savedFont;
      fontSelector.onchange = (e) => {
        const font = e.target.value;
        document.documentElement.style.setProperty('--font-notes', font);
        localStorage.setItem('notes-font', font);
      };
    }

    const searchInput = document.getElementById('notes-search-input');
    const dateInput = document.getElementById('notes-date-filter');
    const typeInput = document.getElementById('notes-type-filter');
    
    if (searchInput) {
      searchInput.oninput = (e) => {
        const val = e.target.value.toLowerCase();
        if (val.length >= 3 || val.length === 0) {
          this.searchQuery = val;
          this.render();
        }
      };
    }

    if (dateInput) {
      dateInput.onchange = (e) => {
        this.dateFilter = e.target.value;
        this.render();
      };
    }

    if (typeInput) {
      typeInput.onchange = (e) => {
        this.typeFilter = e.target.value;
        this.render();
      };
    }

    this.renderTagFilters();
    this.render();
  },

  renderTagFilters() {
    const container = document.getElementById('notes-tag-filters');
    if (!container) return;

    const tags = storage.getTags();
    container.innerHTML = tags.map(tag => `
      <span class="tag-filter-pill ${this.activeTags.includes(tag.id) ? 'active' : ''}" 
            data-id="${tag.id}" 
            style="--tag-color: ${tag.color}">
        ${tag.name}
      </span>
    `).join('');

    container.querySelectorAll('.tag-filter-pill').forEach(pill => {
      pill.onclick = () => {
        const id = pill.dataset.id;
        if (this.activeTags.includes(id)) {
          this.activeTags = this.activeTags.filter(t => t !== id);
        } else {
          this.activeTags.push(id);
        }
        this.renderTagFilters();
        this.render();
      };
    });
  },

  createNewNote() {
    // Las notas independientes se crean con un tipo especial y Folio N-XXXX
    const newNote = storage.createTask({
      type: 'note',
      title: 'Nota Independiente',
      description: '<div><br></div>',
      date: storage._todayStr()
    });
    
    // Abrir inmediatamente para editar
    Tasks.showNotes(newNote.id);
    this.render();
  },

  render() {
    const grid = document.getElementById('notes-grid');
    if (!grid) return;

    let tasks = storage.getAllTasks();

    // Filtrar: notas independientes, con descripción, O con archivos adjuntos
    tasks = tasks.filter(t => 
      t.type === 'note' || 
      (t.description && t.description.length > 0) ||
      (t.attachments && t.attachments.length > 0)
    );

    // Aplicar Filtros (Búsqueda, Fecha, Etiquetas, TIPO)
    tasks = tasks.filter(t => {
      const matchSearch = !this.searchQuery || 
        t.title.toLowerCase().includes(this.searchQuery) || 
        (t.code && t.code.toLowerCase().includes(this.searchQuery)) || 
        (t.description && t.description.toLowerCase().includes(this.searchQuery));

      const matchDate = !this.dateFilter || t.date === this.dateFilter;

      const matchTags = this.activeTags.length === 0 || 
        this.activeTags.every(tid => (t.tags || []).includes(tid));
      
      const matchType = this.typeFilter === 'all' || t.type === this.typeFilter;

      return matchSearch && matchDate && matchTags && matchType;
    });

    // Ordenar por fecha descendente
    tasks.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (tasks.length === 0) {
      grid.innerHTML = `
        <div style="padding: 40px; text-align: center; color: var(--muted)">
          <div style="font-size: 3rem; margin-bottom: 10px">📂</div>
          <p>No hay notas que mostrar.</p>
        </div>
      `;
      return;
    }

    // Agrupar por fecha
    const groups = {};
    tasks.forEach(t => {
      const d = t.date || 'Sin fecha';
      if (!groups[d]) groups[d] = [];
      groups[d].push(t);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    grid.innerHTML = sortedDates.map(date => {
      const dateFormatted = (date === 'Sin fecha') ? 'Sin fecha' : UI.formatDateLong(date);
      const notesInDate = groups[date];

      return `
        <div class="note-timeline-group">
          <div class="note-timeline-date">${dateFormatted}</div>
          ${notesInDate.map(t => {
            const isIndNote = t.type === 'note';
            const snippet = this._getSnippet(t.description);
            const folioColor = isIndNote ? '#ff3399' : 'var(--warning)';
            const atts = t.attachments || [];
            const hasAtts = atts.length > 0;

            // Generar previews de adjuntos
            const attHTML = hasAtts ? `
              <div class="note-attachments-row">
                ${atts.map(att => {
                  if (att.type && att.type.startsWith('image/')) {
                    return `<img src="${att.data}" class="note-att-thumb" alt="${att.name || 'imagen'}" title="${att.name || 'imagen'}">`;
                  } else {
                    return `<div class="note-att-file" title="${att.name || 'archivo'}">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                      <span>${att.name || 'archivo'}</span>
                    </div>`;
                  }
                }).join('')}
              </div>
            ` : '';

            return `
              <div class="note-compact-card ${isIndNote ? 'postit-pink' : 'postit-yellow'}" onclick="Tasks.showNotes('${t.id}')">
                <div class="note-line-1">${t.title || 'Sin título'}</div>
                <div class="note-line-2">
                  <span style="color:${folioColor}; font-weight:700">${t.code || '---'}</span>
                  <span>${UI.formatTime(t.createdAt)}</span>
                  ${hasAtts ? `<span class="note-att-badge">📎 ${atts.length}</span>` : ''}
                  <button class="note-card-share" onclick="event.stopPropagation(); Tasks.shareNote('${t.id}')" title="Compartir" style="margin-left:auto; background:none; border:none; color:var(--primary); cursor:pointer; padding:0; display:flex; align-items:center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
                    </svg>
                  </button>
                </div>
                <div class="note-line-3">${snippet}</div>
                ${attHTML}
                <div class="note-line-4">
                  ${(t.tags || []).map(tid => {
                    const tag = storage.getTag(tid);
                    return tag ? `<span class="tag-pill-card" style="font-size:0.65rem; padding:1px 6px; border-radius:4px; display:inline-flex; align-items:center; gap:3px; background:rgba(0,0,0,0.05); color:var(--text); border:1px solid var(--border)">
                      <span style="width:6px; height:6px; border-radius:50%; background:${tag.color}"></span>
                      ${tag.name}
                    </span>` : '';
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }).join('');
  },

  _getSnippet(html) {
    if (!html) return 'Sin contenido...';
    // Quitar etiquetas HTML y tomar la primera línea real
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const text = tmp.innerText || tmp.textContent || '';
    const firstLine = text.split('\n').map(l => l.trim()).find(l => l.length > 0);
    return firstLine || 'Sin contenido...';
  }
};
