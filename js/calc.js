/**
 * Calculadora Dual: Retenciones MX + Normal
 * Modo switch integrado en el panel
 */
const RetCalc = {
  // ── Retenciones state ──────────────────────────────────
  ivaRate: 16, isrRate: 1.25, retIvaRate: 0,
  subtotalCents: 0, totalCents: 0,
  activeInput: 'subtotal',

  // ── Calculadora normal state ────────────────────────────
  stdDisplay: '0',
  stdPrev: null,
  stdOp: null,
  stdWaitingNext: false,
  stdHistory: [], // Tira de papel historial

  // ── Modo activo ─────────────────────────────────────────
  mode: 'std', // 'ret' | 'std'

  // ── HTML principal ──────────────────────────────────────
  render(showRet = true) {
    return `
      <div class="calc-panel" id="ret-calc-panel">

        <!-- SWITCH DE MODO -->
        <div class="calc-mode-switch" style="${showRet ? '' : 'display:none'}">
          <button class="calc-mode-btn" data-mode="ret">RETENCIONES</button>
          <button class="calc-mode-btn active" data-mode="std">NORMAL</button>
        </div>

        <!-- PANEL RETENCIONES -->
        <div id="calc-ret-view" style="display:none">
          <div class="calc-inputs">
            <div class="calc-input-group active-input" id="cig-sub" data-field="subtotal">
              <label class="calc-lbl">SUB-TOTAL</label>
              <input id="calc-subtotal" class="calc-inp" value="0.00" readonly>
            </div>
            <div class="calc-input-group" id="cig-tot" data-field="total">
              <label class="calc-lbl">TOTAL NETO</label>
              <input id="calc-total" class="calc-inp calc-inp-neon" value="0.00" readonly>
            </div>
          </div>

          <div class="calc-selectors">
            <div class="calc-sel-group">
              <label class="calc-lbl">IVA</label>
              <div class="calc-pills" data-rate="iva">
                <button class="calc-pill" data-value="0">0%</button>
                <button class="calc-pill" data-value="10">10%</button>
                <button class="calc-pill active" data-value="16">16%</button>
              </div>
            </div>
            <div class="calc-sel-group">
              <label class="calc-lbl">RET. ISR</label>
              <div class="calc-pills" data-rate="isr">
                <button class="calc-pill" data-value="0">0%</button>
                <button class="calc-pill active" data-value="1.25">1.25%</button>
                <button class="calc-pill" data-value="10">10%</button>
              </div>
            </div>
            <div class="calc-sel-group">
              <label class="calc-lbl">RET. IVA</label>
              <div class="calc-pills" data-rate="retIva">
                <button class="calc-pill active" data-value="0">0%</button>
                <button class="calc-pill" data-value="10.6667">10.67%</button>
              </div>
            </div>
          </div>

          <div class="calc-numpad">
            <button class="calc-key" data-key="7">7</button>
            <button class="calc-key" data-key="8">8</button>
            <button class="calc-key" data-key="9">9</button>
            <button class="calc-key" data-key="4">4</button>
            <button class="calc-key" data-key="5">5</button>
            <button class="calc-key" data-key="6">6</button>
            <button class="calc-key" data-key="1">1</button>
            <button class="calc-key" data-key="2">2</button>
            <button class="calc-key" data-key="3">3</button>
            <button class="calc-key calc-key-wide" data-key="0">0</button>
            <button class="calc-key calc-key-del" data-key="del">⌫</button>
          </div>

          <div class="calc-results" style="background:var(--surface); border:1px solid var(--border); padding:6px; border-radius:8px; margin-top:4px; display:flex; flex-direction:column; gap:2px;">
            <div class="calc-res-row"><span>Base</span><span id="cr-base" style="color:var(--text)">$0.00</span></div>
            <div class="calc-res-row"><span>IVA</span><span id="cr-iva" style="color:var(--text)">$0.00</span></div>
            <div class="calc-res-row"><span>Ret. ISR</span><span id="cr-isr" class="calc-danger">-$0.00</span></div>
            <div class="calc-res-row"><span>Ret. IVA</span><span id="cr-riva" class="calc-danger">-$0.00</span></div>
            <div class="calc-res-divider" style="background:var(--border); opacity:0.5;"></div>
            <div class="calc-res-row calc-res-total"><span>TOTAL</span><span id="cr-total" style="color:var(--primary-light); font-weight:800;">$0.00</span></div>
          </div>

          <div style="display:flex; gap:12px; margin-top:10px;">
            <button class="calc-clear-btn" id="calc-clear" style="flex:1; font-size:0.7rem; padding:6px;">LIMPIAR</button>
            <button class="calc-copy-btn" id="calc-copy-ret" style="flex:2; background:var(--success); color:white; border-radius:8px; font-weight:800; font-size:0.8rem; border:none; cursor:pointer; box-shadow:0 4px 12px rgba(16,185,129,0.3); padding:6px;">📋 COPIAR A NOTA</button>
          </div>
        </div>

        <!-- PANEL CALCULADORA NORMAL -->
        <div id="calc-std-view" style="display:flex; flex-direction:column; gap:6px;">

          <!-- NORMAL VIEW -->
          <div id="calc-normal-inner">
            <div class="calc-std-main-area">
              <div class="calc-std-display">
                <div class="calc-std-expr" id="calc-std-expr"></div>
                <div class="calc-std-screen" id="calc-std-screen">0</div>
              </div>
              <div class="calc-std-pad">
                <!-- Fila 1 -->
                <button class="calc-key calc-key-fn" data-std="AC">AC</button>
                <button class="calc-key calc-key-fn" data-std="C">C</button>
                <button class="calc-key calc-key-fn" data-std="(">(</button>
                <button class="calc-key calc-key-fn" data-std=")">)</button>
                <button class="calc-key calc-key-fn" data-std="back">⌫</button>
                
                <!-- Fila 2 -->
                <button class="calc-key" data-std="7">7</button>
                <button class="calc-key" data-std="8">8</button>
                <button class="calc-key" data-std="9">9</button>
                <button class="calc-key calc-key-op" data-std="%">%</button>
                <button class="calc-key calc-key-op" data-std="÷">÷</button>

                <!-- Fila 3 -->
                <button class="calc-key" data-std="4">4</button>
                <button class="calc-key" data-std="5">5</button>
                <button class="calc-key" data-std="6">6</button>
                <button class="calc-key calc-key-fn" data-std="+/-">+/-</button>
                <button class="calc-key calc-key-op" data-std="×">×</button>

                <!-- Fila 4 -->
                <button class="calc-key" data-std="1">1</button>
                <button class="calc-key" data-std="2">2</button>
                <button class="calc-key" data-std="3">3</button>
                <button class="calc-key" data-std=".">.</button>
                <button class="calc-key calc-key-op" data-std="−">−</button>

                <!-- Fila 5 -->
                <button class="calc-key" data-std="0" style="grid-column: span 2;">0</button>
                <button class="calc-key calc-key-eq" data-std="=" style="grid-column: span 2;">=</button>
                <button class="calc-key calc-key-op" data-std="+">+</button>
              </div>
              </div> <!-- calc-std-main-area -->

              <!-- TIRA DE HISTORIAL -->
              <div class="calc-history-container" style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
                <div class="calc-history-header" style="padding:4px 8px; border-bottom:1px solid #e0d9b5; background:#f0f0f0; font-size:0.6rem; font-weight:800; display:flex; justify-content:space-between; align-items:center;">
                  <span style="opacity:0.6;">TIRA DE AUDITORÍA</span>
                  <button class="tape-copy-btn" id="tape-copy" style="background:var(--primary); border:none; color:white; border-radius:4px; cursor:pointer; padding:4px 15px; font-size:0.65rem; font-weight:bold; display:flex; align-items:center; gap:6px; min-width:110px; justify-content:center;" title="Copiar Tira a Nota">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                    COPIAR A NOTA
                  </button>
                </div>
              <div class="calc-history-tape" id="std-tape" style="flex:1; overflow-y:auto; padding:10px 5px;">
                <div style="text-align:center; opacity:0.3; font-size:0.6rem;">*** TIRA LISTA ***</div>
              </div>
            </div>
          </div>

          </div>

        </div>

      </div>
    `;
  },

  // ── Inicialización ──────────────────────────────────────
  init(container) {
    // Mode switch
    container.querySelectorAll('.calc-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.mode = btn.dataset.mode;
        container.querySelectorAll('.calc-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const retView = container.querySelector('#calc-ret-view');
        const stdView = container.querySelector('#calc-std-view');
        if (this.mode === 'ret') {
          retView.style.display = 'block';
          stdView.style.display = 'none';
        } else {
          retView.style.display = 'none';
          stdView.style.display = 'flex';
        }
      });
    });

    this._initRet(container);
    this._initStd(container);

    // Tape actions
    const btnClearTape = container.querySelector('#tape-clear');
    if (btnClearTape) btnClearTape.onclick = () => {
      this.stdHistory = [];
      const tape = container.querySelector('#std-tape');
      if (tape) tape.innerHTML = '<div style="text-align:center; opacity:0.3; font-size:0.6rem;">*** TIRA LIMPIA ***</div>';
    };

    const btnCopyTape = container.querySelector('#tape-copy');
    if (btnCopyTape) btnCopyTape.onclick = (e) => {
      e.stopPropagation();
      this.copyTapeToNote(container);
    };

    // Copy buttons
    const btnCopyRet = container.querySelector('#calc-copy-ret');
    if (btnCopyRet) btnCopyRet.onclick = () => this.copyToNote('ret');

    const btnCopyStd = container.querySelector('#calc-copy-std');
    if (btnCopyStd) btnCopyStd.onclick = () => this.copyToNote('std');
  },

  _addHistoryLine(line, container, isTotal = false) {
    const tape = container.querySelector('#std-tape');
    if (tape) {
      // 1. Si es una petición de TOTAL y ya existe una fila de total, solo la actualizamos
      let totalRow = tape.querySelector('.tape-row.total');
      if (isTotal && totalRow) {
        totalRow.querySelector('.tape-value').innerText = line.replace(/^=/, '').trim();
        return;
      }

      const rowEl = document.createElement('div');
      rowEl.className = 'tape-row' + (isTotal ? ' total' : '');
      
      const opMatch = line.match(/^([+−×÷=])/);
      const op = opMatch ? opMatch[1] : '';
      const expr = line.replace(/^[+−×÷=]/, '').trim();

      rowEl.innerHTML = `
        <div class="tape-label" contenteditable="true" spellcheck="false"></div>
        <div class="tape-value" ${!isTotal ? 'contenteditable="true"' : ''} spellcheck="false">${expr}</div>
        <div class="tape-op" ${!isTotal ? 'contenteditable="true"' : ''} spellcheck="false">${op}</div>
      `;
      
      if (!isTotal) {
        rowEl.querySelector('.tape-value').addEventListener('input', () => this.recalculateTape(container));
        rowEl.querySelector('.tape-op').addEventListener('input', () => this.recalculateTape(container));
        
        // 2. Si hay un total, insertamos la nueva fila ANTES del total para que siempre quede al final
        if (totalRow) {
          tape.insertBefore(rowEl, totalRow);
        } else {
          tape.appendChild(rowEl);
        }
      } else {
        // Es la primera vez que se crea el total
        tape.appendChild(rowEl);
      }
      
      tape.scrollTop = tape.scrollHeight;
      // 3. Recalcular inmediatamente para que el total sea "tiempo real"
      this.recalculateTape(container);
    }
  },

  recalculateTape(container) {
    const tape = container.querySelector('#std-tape');
    const rows = tape.querySelectorAll('.tape-row');
    let runningTotal = 0;

    rows.forEach((row, index) => {
      const valEl = row.querySelector('.tape-value');
      const opEl  = row.querySelector('.tape-op');
      const valText = valEl.innerText.trim();
      const opText  = opEl.innerText.trim();
      
      if (row.classList.contains('total')) {
        valEl.innerText = this._stdFmt(runningTotal);
        opEl.innerText = '=';
      } else {
        // EVALUAR la expresión de la celda (puede ser un número o una fórmula compleja)
        let result = 0;
        try {
          const cleanExpr = valText.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '');
          if (cleanExpr) {
            result = Function('"use strict"; return (' + cleanExpr + ')')() || 0;
          }
        } catch(e) { result = 0; }

        const op = opText || '+';

        if (index === 0 && !opText) {
          runningTotal = result;
        } else {
          if (op === '+') runningTotal += result;
          else if (op === '−') runningTotal -= result;
          else if (op === '×') runningTotal *= result;
          else if (op === '÷') runningTotal = (result !== 0) ? runningTotal / result : 0;
        }
      }
    });
    return runningTotal;
  },

  copyTapeToNote(container) {
    const tape = container.querySelector('#std-tape');
    if (!tape) return;
    
    const rows = tape.querySelectorAll('.tape-row');
    if (rows.length === 0) return;

    let html = `
      <div class="rt-table-wrapper" style="margin:15px 0;">
        <table class="rt-calc-table" style="width:100%; border-collapse:collapse; font-family:Courier, monospace; font-size:18px; border:2px solid #ccc; background:white;">
          <thead style="background:#f0f0f0;">
            <tr>
              <th style="padding:8px; border:1px solid #ccc; text-align:left;">Detalle</th>
              <th style="padding:8px; border:1px solid #ccc; text-align:right;">Importe</th>
              <th style="padding:8px; border:1px solid #ccc; text-align:center;">Op</th>
            </tr>
          </thead>
          <tbody>
    `;

    rows.forEach(row => {
      if (row.innerText.includes('TIRA')) return;
      const label = row.querySelector('.tape-label').innerText.trim();
      const value = row.querySelector('.tape-value').innerText.trim();
      const op    = row.querySelector('.tape-op').innerText.trim();
      const isTotal = row.classList.contains('total');
      
      html += `
        <tr style="${isTotal ? 'font-weight:bold; background:#f9f9f9; border-top:2px solid #ccc;' : ''}">
          <td style="padding:6px 10px; border:1px solid #eee;">${label || '-'}</td>
          <td style="padding:6px 10px; border:1px solid #eee; text-align:right; font-family:monospace;">${value}</td>
          <td style="padding:6px 10px; border:1px solid #eee; text-align:center; font-weight:bold;">${op}</td>
        </tr>
      `;
    });

    html += '</tbody></table></div><br>';

    const event = new CustomEvent('calc:copy', { detail: { html } });
    window.dispatchEvent(event);
    if (typeof UI !== 'undefined') UI.toast('Tira copiada al bloc', 'success');
  },

  clearTape(container) {
    if (confirm('¿Vaciar la tira de auditoría?')) {
      this.stdHistory = [];
      const tape = container.querySelector('#std-tape');
      if (tape) tape.innerHTML = '<div style="text-align:center; opacity:0.3; font-size:0.6rem;">*** TIRA VACÍA ***</div>';
      this.stdDisplay = '0';
      this.stdOp = null;
      const expr = container.querySelector('#calc-std-expr');
      const screen = container.querySelector('#calc-std-screen');
      if (expr) expr.textContent = '';
      if (screen) screen.textContent = '0';
    }
  },

  copyToNote(type) {
    let html = '';
    if (type === 'ret') {
      const s = this._fmt(this.subtotalCents / 100);
      const iva = this._fmt(this.subtotalCents * this.ivaRate / 10000);
      const isr = this._fmt(this.subtotalCents * this.isrRate / 10000);
      const riva = this._fmt(this.subtotalCents * this.retIvaRate / 10000);
      const t = this._fmt(this.totalCents / 100);

      html = `
        <table class="rt-table" style="width:100%; border-collapse:collapse; margin:10px 0; background:white; font-size:18px;">
          <tr style="background:rgba(99,102,241,0.1)">
            <th style="border:1px solid #ccc; padding:8px; text-align:left;">Concepto</th>
            <th style="border:1px solid #ccc; padding:8px; text-align:right;">Importe</th>
          </tr>
          <tr>
            <td style="border:1px solid #eee; padding:8px;">Subtotal</td>
            <td style="border:1px solid #eee; padding:8px; text-align:right;">${s}</td>
          </tr>
          <tr>
            <td style="border:1px solid #eee; padding:8px;">IVA (${this.ivaRate}%)</td>
            <td style="border:1px solid #eee; padding:8px; text-align:right;">${iva}</td>
          </tr>
          ${this.isrRate > 0 ? `<tr>
            <td style="border:1px solid #eee; padding:8px; color:#ef4444">Ret. ISR (${this.isrRate}%)</td>
            <td style="border:1px solid #eee; padding:8px; text-align:right; color:#ef4444">-${isr}</td>
          </tr>` : ''}
          ${this.retIvaRate > 0 ? `<tr>
            <td style="border:1px solid #eee; padding:8px; color:#ef4444">Ret. IVA (${this.retIvaRate.toFixed(2)}%)</td>
            <td style="border:1px solid #eee; padding:8px; text-align:right; color:#ef4444">-${riva}</td>
          </tr>` : ''}
          <tr style="font-weight:bold; background:rgba(99,102,241,0.05)">
            <td style="border:1px solid #ccc; padding:8px;">TOTAL</td>
            <td style="border:1px solid #ccc; padding:8px; text-align:right; color:#4f46e5">${t}</td>
          </tr>
        </table><br>
      `;
    } else {
      html = `<span style="color:#003366; font-weight:bold; font-size:20px;">${this._stdFmt(this.stdDisplay)}</span>`;
    }

    const event = new CustomEvent('calc:copy', { detail: { html } });
    window.dispatchEvent(event);
    if (typeof UI !== 'undefined') UI.toast('Insertado en nota', 'success');
  },

  _initRet(container) {
    container.querySelectorAll('.calc-pills').forEach(group => {
      group.querySelectorAll('.calc-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          group.querySelectorAll('.calc-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const v = parseFloat(btn.dataset.value);
          if (group.dataset.rate === 'iva')    this.ivaRate    = v;
          if (group.dataset.rate === 'isr')    this.isrRate    = v;
          if (group.dataset.rate === 'retIva') this.retIvaRate = v;
          this.calcForward(container);
        });
      });
    });

    ['sub','tot'].forEach(k => {
      const el = container.querySelector(`#cig-${k}`);
      if (el) el.addEventListener('click', () => {
        this.activeInput = el.dataset.field;
        container.querySelectorAll('.calc-input-group').forEach(g => g.classList.remove('active-input'));
        el.classList.add('active-input');
      });
    });

    container.querySelectorAll('.calc-key[data-key]').forEach(btn => {
      btn.addEventListener('click', () => this._handleRetKey(btn.dataset.key, container));
    });

    const clearBtn = container.querySelector('#calc-clear');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      this.subtotalCents = 0; this.totalCents = 0;
      this._updateDisplays(container);
      this._setResults(0, 0, 0, 0, 0, container);
    });
  },

  _handleRetKey(key, container) {
    let c = this.activeInput === 'subtotal' ? this.subtotalCents : this.totalCents;
    if (key === 'del') { c = Math.floor(c / 10); }
    else if (String(c).length < 13) { c = c * 10 + parseInt(key); }
    if (this.activeInput === 'subtotal') { this.subtotalCents = c; this.calcForward(container); }
    else { this.totalCents = c; this.calcBackward(container); }
    this._updateDisplays(container);
  },

  calcForward(container) {
    const s = this.subtotalCents / 100;
    const iva = s * this.ivaRate / 100;
    const isr = s * this.isrRate / 100;
    const rv  = s * this.retIvaRate / 100;
    const t   = s + iva - isr - rv;
    this.totalCents = Math.round(t * 100);
    this._setResults(s, iva, isr, rv, t, container);
    this._updateDisplays(container);
  },

  calcBackward(container) {
    const t = this.totalCents / 100;
    const f = 1 + this.ivaRate/100 - this.isrRate/100 - this.retIvaRate/100;
    const s = f !== 0 ? t / f : 0;
    const iva = s * this.ivaRate / 100;
    const isr = s * this.isrRate / 100;
    const rv  = s * this.retIvaRate / 100;
    this.subtotalCents = Math.round(s * 100);
    this._setResults(s, iva, isr, rv, t, container);
    this._updateDisplays(container);
  },

  _fmt(n)  { return '$' + n.toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2}); },
  _fmtI(c) { const n=c/100; return n.toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}); },

  _updateDisplays(c) {
    if (!c) return;
    const s = c.querySelector('#calc-subtotal');
    const t = c.querySelector('#calc-total');
    if (s) s.value = this._fmtI(this.subtotalCents);
    if (t) t.value = this._fmtI(this.totalCents);
  },

  _setResults(s, iva, isr, rv, t, c) {
    if (!c) return;
    const set = (id, v) => { const el = c.querySelector(id); if (el) el.textContent = v; };
    set('#cr-base',  this._fmt(s));
    set('#cr-iva',   this._fmt(iva));
    set('#cr-isr',   '-' + this._fmt(isr));
    set('#cr-riva',  '-' + this._fmt(rv));
    set('#cr-total', this._fmt(t));
  },

  _initStd(container) {
    container.querySelectorAll('[data-std]').forEach(btn => {
      btn.addEventListener('click', () => this._handleStdKey(btn.dataset.std, container));
    });
    
    // Soporte para teclado físico
    window.addEventListener('keydown', (e) => this._handleKeyboard(e, container));
  },

  _handleStdKey(key, container) {
    const screen = container.querySelector('#calc-std-screen');
    const expr   = container.querySelector('#calc-std-expr');
    if (!screen) return;

    if (key === 'AC') {
      this.stdDisplay = '0'; this.stdPrev = null; this.stdOp = null; this.stdWaitingNext = false;
      if (expr) expr.textContent = '';
      const tape = container.querySelector('#std-tape');
      if (tape) tape.innerHTML = '<div style="text-align:center; opacity:0.3; font-size:0.6rem;">*** TIRA REINICIADA ***</div>';
    } else if (key === 'C') {
      this.stdDisplay = '0';
    } else if (key === 'back') {
      if (this.stdDisplay.length > 1) this.stdDisplay = this.stdDisplay.slice(0, -1);
      else this.stdDisplay = '0';
    } else if (['+','−','×','÷'].includes(key)) {
      if (this.stdDisplay.includes('(') || this.stdDisplay.includes(')')) {
        this.stdDisplay += key;
      } else {
        try {
          // Si acabamos de dar "=" y presionamos un operador, queremos CONTINUAR
          // No agregamos el número otra vez a la tira porque ya es el "Total" de arriba
          if (this.stdWaitingNext) {
            this.stdOp = key;
            // Mantenemos stdWaitingNext en true para que el próximo número REEMPLACE al total
            if (expr) expr.textContent = `${this.stdDisplay} ${key}`;
            return;
          }

          const formulaToRecord = this.stdDisplay.trim();
          const tape = container.querySelector('#std-tape');
          const rows = tape.querySelectorAll('.tape-row');
          
          if (rows.length === 0 || (rows.length === 1 && rows[0].innerText.includes('TIRA'))) {
            tape.innerHTML = '';
            this._addHistoryLine(formulaToRecord, container);
            this._addHistoryLine('= 0', container, true);
          } else {
            const opToUse = this.stdOp || '+';
            this._addHistoryLine(`${opToUse} ${formulaToRecord}`, container);
          }

          this.stdOp = key;
          this.stdDisplay = '0';
          if (expr) expr.textContent = `${formulaToRecord} ${key}`;
          this.recalculateTape(container);
        } catch(e) {}
      }
    } else if (key === '=') {
      try {
        const formulaToRecord = this.stdDisplay.trim();
        const opToUse = this.stdOp || '+';
        
        // 1. Agregar el último número/operación a la tira
        this._addHistoryLine(`${opToUse} ${formulaToRecord}`, container);
        
        // 2. Asegurar línea de total
        this._addHistoryLine(`= 0`, container, true);
        
        // 3. Obtener el total real recalculado de la tira
        const total = this.recalculateTape(container); 
        
        // 4. Mostrar el total en el dial
        this.stdOp = null;
        this.stdPrev = null;
        this.stdDisplay = String(this._stdFmt(total));
        this.stdWaitingNext = true;
        if (expr) expr.textContent = '';
      } catch (e) {
        console.error("Error al cerrar cuenta", e);
      }
    } else if (key === '%') {
      try {
        let rawExpr = this.stdDisplay.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '');
        const val = Function('"use strict"; return (' + rawExpr + ')')() || 0;
        this.stdDisplay = String(this._stdFmt(val / 100));
      } catch (e) {}
    } else if (key === '+/-') {
      if (this.stdDisplay.startsWith('−')) {
        this.stdDisplay = this.stdDisplay.substring(1);
      } else if (this.stdDisplay !== '0') {
        this.stdDisplay = '−' + this.stdDisplay;
      }
    } else {
      if (this.stdWaitingNext && !['+','−','×','÷'].includes(key)) {
        this.stdDisplay = key;
        this.stdWaitingNext = false;
      } else {
        if (this.stdDisplay === '0' && !['+','−','×','÷','.',')'].includes(key)) {
          this.stdDisplay = key;
        } else {
          this.stdDisplay += key;
        }
        this.stdWaitingNext = false;
      }
    }
    screen.textContent = this.stdDisplay;
  },

  _handleKeyboard(e, container) {
    // Si el usuario está escribiendo en cualquier input o campo editable fuera de la calculadora, ignorar
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.getAttribute('contenteditable')) {
      // Excepción: si es uno de los campos de la tira de auditoría, queremos que funcione el teclado pero el navegador ya lo maneja
      return;
    }
    
    const stdView = container.querySelector('#calc-std-view');
    const retView = container.querySelector('#calc-ret-view');

    const keyMap = {
      '0': '0', '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
      '.': '.', '+': '+', '-': '−', '*': '×', '/': '÷',
      '(': '(', ')': ')', 'Enter': '=', '=': '=',
      'Backspace': 'back', 'Delete': 'C', 'Escape': 'AC'
    };

    const key = keyMap[e.key];
    if (!key) return;

    e.preventDefault();

    // DESPACHAR AL PANEL ACTIVO
    if (stdView && stdView.style.display !== 'none') {
      this._handleStdKey(key, container);
    } else if (retView && retView.style.display !== 'none') {
      // Para retenciones, mapeamos las teclas a su lógica específica
      if (['0','1','2','3','4','5','6','7','8','9','.'].includes(key)) {
        this._handleRetKey(key, container);
      } else if (key === 'back') {
        this._handleRetKey('back', container);
      } else if (key === 'AC' || key === 'C') {
        // En retenciones usamos el botón de limpiar general
        const clearBtn = container.querySelector('#calc-clear');
        if (clearBtn) clearBtn.click();
      } else if (key === '=') {
        // Podríamos disparar la copia a nota o similar
        const copyBtn = container.querySelector('#calc-copy-ret');
        if (copyBtn) copyBtn.click();
      }
    }
  },

  _stdFmt(n) {
    const num = parseFloat(n);
    if (isNaN(num)) return String(n);
    return num.toLocaleString('es-MX', { maximumFractionDigits: 4 });
  },

};
