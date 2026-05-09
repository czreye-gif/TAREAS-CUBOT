    input.addEventListener('input', () => show(input.value));
    input.addEventListener('focus', () => show(input.value));
    input.addEventListener('blur',  () => setTimeout(() => { dropdown.style.display = 'none'; }, 200));
    if (clearBtn) clearBtn.onclick = () => {
      input.value          = '';
      this.filters.tagIds  = [];
      clearBtn.style.display = 'none';
      dropdown.classList.remove('show');
      this.render();
    };
  },

  // ── Eventos de tarjetas ────────────────────────────────────
  bindEvents() {
    ['dash-urgent-list', 'dash-today-list', 'dash-tomorrow-list'].forEach(listId => {
      const container = document.getElementById(listId);
      if (!container) return;

      // Hacer tarjetas arrastrables
      container.querySelectorAll('.tl-card').forEach(card => {
        card.setAttribute('draggable', 'true');
        card.style.cursor = 'grab';
      });
    });

    // Re-inicializar drop zones (por si se re-renderizó)
    document.querySelectorAll('.drop-zone').forEach(zone => {
      zone.ondragover = (e) => {
        e.preventDefault();
        zone.classList.add('dash-drop-hover');
      };
      zone.ondragleave = (e) => {
        if (e.relatedTarget && zone.contains(e.relatedTarget)) return;
        zone.classList.remove('dash-drop-hover');
      };
      zone.ondrop = (e) => {
        e.preventDefault();
        document.querySelectorAll('.drop-zone').forEach(z => {
          z.classList.remove('dash-drag-active', 'dash-drop-hover', 'drag-over');
        });
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) this.handleDrop(taskId, zone.dataset.zone);
      };
    });
  },
