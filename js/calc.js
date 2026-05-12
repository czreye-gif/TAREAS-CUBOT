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
  mode: 'ret', // 'ret' | 'std'

  // ── HTML principal ──────────────────────────────────────
  render() {
    return `
      <div class="calc-panel" id="ret-calc-panel">

        <!-- SWITCH DE MODO -->
        <div class="calc-mode-switch">
          <button class="calc-mode-btn active" data-mode="ret">📊 Retenciones</button>
          <button class="calc-mode-btn" data-mode="std">🔢 Normal</button>
        </div>

        <!-- PANEL RETENCIONES -->
        <div id="calc-ret-view">
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
        <div id="calc-std-view" style="display:none; flex-direction:column; gap:6px;">

          <!-- Sub-switch Normal / RPN -->
          <div class="calc-sub-switch">
            <button class="calc-sub-btn active" data-submode="normal">Normal</button>
            <button class="calc-sub-btn" data-submode="rpn">RPN</button>
          </div>

          <!-- NORMAL VIEW -->
          <div id="calc-normal-inner">
            <div class="calc-std-main-area">
              <div class="calc-std-display">
                <div class="calc-std-expr" id="calc-std-expr"></div>
                <div class="calc-std-screen" id="calc-std-screen">0</div>
              </div>
              <div class="calc-std-pad">
                <button class="calc-key calc-key-fn" data-std="(">(</button>
                <button class="calc-key calc-key-fn" data-std=")">)</button>
                <button class="calc-key calc-key-fn" data-std="AC">AC</button>
                <button class="calc-key calc-key-fn" data-std="back">⌫</button>
                
                <button class="calc-key calc-key-fn" data-std="C" style="grid-column: span 2;">C</button>
                <button class="calc-key calc-key-op" data-std="×">×</button>
                <button class="calc-key calc-key-op" data-std="÷">÷</button>
                <button class="calc-key" data-std="7">7</button>
                <button class="calc-key" data-std="8">8</button>
                <button class="calc-key" data-std="9">9</button>
                <button class="calc-key calc-key-op" data-std="×">×</button>
                <button class="calc-key" data-std="4">4</button>
                <button class="calc-key" data-std="5">5</button>
                <button class="calc-key" data-std="6">6</button>
                <button class="calc-key calc-key-op" data-std="−">−</button>
                <button class="calc-key" data-std="1">1</button>
                <button class="calc-key" data-std="2">2</button>
                <button class="calc-key" data-std="3">3</button>
                <button class="calc-key calc-key-op" data-std="+">+</button>
                <button class="calc-key" data-std="0">0</button>
                <button class="calc-key" data-std=".">.</button>
                <button class="calc-key calc-key-fn" data-std="+/-">+/-</button>
                <button class="calc-key calc-key-eq" data-std="=">=</button>
              </div>
              <button class="calc-main-copy-btn" onclick="RetCalc.copyTapeToNote(this.closest('.calc-container'))">
                📋 COPIAR TIRA A NOTA
              </button>
            </div>

            <!-- TIRA DE HISTORIAL -->
            <div class="calc-history-container">
              <div class="calc-history-header" style="padding:8px; border-bottom:1px solid #e0d9b5; background:#f0f0f0; font-size:0.65rem; font-weight:800; display:flex; justify-content:space-between; align-items:center;">
                <span>TIRA DE AUDITORÍA</span>
                <button class="tape-copy-btn" id="tape-copy" style="background:none; border:none; color:var(--primary); cursor:pointer; padding:2px;" title="Copiar Tira a Nota">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                </button>
              </div>
              <div class="calc-history-tape" id="std-tape" style="flex:1; overflow-y:auto; padding:10px 5px;">
                <div style="text-align:center; opacity:0.3; font-size:0.6rem;">*** TIRA LISTA ***</div>
              </div>
            </div>
          </div>

          <!-- RPN VIEW -->
          <div id="calc-rpn-inner" style="display:none; flex-direction:column; gap:8px;">
            <div class="calc-rpn-stack" id="calc-rpn-stack">
              <div class="rpn-row" id="rpn-t"><span class="rpn-lbl">T:</span><span class="rpn-val">0</span></div>
              <div class="rpn-row" id="rpn-z"><span class="rpn-lbl">Z:</span><span class="rpn-val">0</span></div>
              <div class="rpn-row" id="rpn-y"><span class="rpn-lbl">Y:</span><span class="rpn-val">0</span></div>
              <div class="rpn-row rpn-x" id="rpn-x"><span class="rpn-lbl">X:</span><span class="rpn-val rpn-x-val" id="rpn-x-val">0</span></div>
            </div>
            <div class="calc-rpn-pad">
              <!-- Row 1 -->
              <button class="calc-key calc-key-fn rpn-fn" data-rpn="CHS"><span class="rpn-main">CHS</span><span class="rpn-sub">+/−</span></button>
              <button class="calc-key rpn-num" data-rpn="7"><span class="rpn-main">7</span></button>
              <button class="calc-key rpn-num" data-rpn="8"><span class="rpn-main">8</span></button>
              <button class="calc-key rpn-num" data-rpn="9"><span class="rpn-main">9</span></button>
              <button class="calc-key calc-key-op" data-rpn="÷">÷</button>
              <!-- Row 2 -->
              <button class="calc-key calc-key-fn rpn-fn" data-rpn="SWAP"><span class="rpn-main">XY</span><span class="rpn-sub">swap</span></button>
              <button class="calc-key rpn-num" data-rpn="4"><span class="rpn-main">4</span></button>
              <button class="calc-key rpn-num" data-rpn="5"><span class="rpn-main">5</span></button>
              <button class="calc-key rpn-num" data-rpn="6"><span class="rpn-main">6</span></button>
              <button class="calc-key calc-key-op" data-rpn="×">×</button>
              <!-- Row 3: ENTER tall -->
              <button class="calc-key calc-key-enter" data-rpn="ENTER">E<br>N<br>T<br>E<br>R</button>
              <button class="calc-key rpn-num" data-rpn="1"><span class="rpn-main">1</span></button>
              <button class="calc-key rpn-num" data-rpn="2"><span class="rpn-main">2</span></button>
              <button class="calc-key rpn-num" data-rpn="3"><span class="rpn-main">3</span></button>
              <button class="calc-key calc-key-op" data-rpn="−">−</button>
              <!-- Row 4 (ENTER continues col 1) -->
              <button class="calc-key rpn-num" data-rpn="0"><span class="rpn-main">0</span></button>
              <button class="calc-key rpn-num" data-rpn="."><span class="rpn-main">.</span></button>
              <button class="calc-key calc-key-fn rpn-fn" data-rpn="DROP"><span class="rpn-main">DROP</span><span class="rpn-sub">del</span></button>
              <button class="calc-key calc-key-op" data-rpn="+">+</button>
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
    if (btnCopyTape) btnCopyTape.onclick = () => this.copyTapeToNote(container);

    // Copy buttons
    const btnCopyRet = container.querySelector('#calc-copy-ret');
    if (btnCopyRet) btnCopyRet.onclick = () => this.copyToNote('ret');

    const btnCopyStd = container.querySelector('#calc-copy-std');
    if (btnCopyStd) btnCopyStd.onclick = () => this.copyToNote('std');
  },

  copyTapeToNote(container) {
    const tape = container.querySelector('#std-tape');
    const rows = tape.querySelectorAll('.tape-row');
    if (rows.length === 0) {
      if (typeof UI !== 'undefined') UI.toast('La tira está vacía', 'warning');
      return;
    }

    let tableRowsHtml = '';
    rows.forEach(row => {
      const label = row.querySelector('.tape-label').textContent.trim() || '---';
      const value = row.querySelector('.tape-value').textContent.trim();
      const op    = row.querySelector('.tape-op').textContent.trim() || '';
      const isTotal = row.classList.contains('total');
      
      tableRowsHtml += `
        <tr style="${isTotal ? 'background:#f0f0f0; font-weight:bold;' : 'border-bottom:1px solid #eee;'}">
          <td style="padding:6px; border:1px solid #ddd; color:#003366; font-style:italic;">${label}</td>
          <td style="padding:6px; border:1px solid #ddd; text-align:right; font-family:monospace;">${value}</td>
          <td style="padding:6px; border:1px solid #ddd; text-align:center; font-weight:bold; color:#c00;">${op}</td>
        </tr>
      `;
    });

    let html = `
      <div class="rt-table-wrapper" style="margin:15px 0;">
        <table style="width:100%; border-collapse:collapse; background:#fdfcf0; font-family:var(--font-main); font-size:0.85rem; border:1px solid #ccc;">
          <thead style="background:#eee;">
            <tr>
              <th style="padding:8px; border:1px solid #ccc; text-align:left;">CONCEPTO</th>
              <th style="padding:8px; border:1px solid #ccc; text-align:right;">CIFRA</th>
              <th style="padding:8px; border:1px solid #ccc; text-align:center;">OP</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </div><br>
    `;

    const event = new CustomEvent('calc:copy', { detail: { html } });
    window.dispatchEvent(event);
    if (typeof UI !== 'undefined') UI.toast('Tabla de 3 columnas copiada', 'success');
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
        <table class="rt-table" style="width:100%; border-collapse:collapse; margin:10px 0;">
          <tr style="background:rgba(99,102,241,0.1)">
            <th style="border:1px solid var(--border); padding:8px; text-align:left;">Concepto</th>
            <th style="border:1px solid var(--border); padding:8px; text-align:right;">Importe</th>
          </tr>
          <tr>
            <td style="border:1px solid var(--border); padding:8px;">Subtotal</td>
            <td style="border:1px solid var(--border); padding:8px; text-align:right;">${s}</td>
          </tr>
          <tr>
            <td style="border:1px solid var(--border); padding:8px;">IVA (${this.ivaRate}%)</td>
            <td style="border:1px solid var(--border); padding:8px; text-align:right;">${iva}</td>
          </tr>
          ${this.isrRate > 0 ? `<tr>
            <td style="border:1px solid var(--border); padding:8px; color:var(--danger)">Ret. ISR (${this.isrRate}%)</td>
            <td style="border:1px solid var(--border); padding:8px; text-align:right; color:var(--danger)">-${isr}</td>
          </tr>` : ''}
          ${this.retIvaRate > 0 ? `<tr>
            <td style="border:1px solid var(--border); padding:8px; color:var(--danger)">Ret. IVA (${this.retIvaRate.toFixed(2)}%)</td>
            <td style="border:1px solid var(--border); padding:8px; text-align:right; color:var(--danger)">-${riva}</td>
          </tr>` : ''}
          <tr style="font-weight:bold; background:rgba(99,102,241,0.05)">
            <td style="border:1px solid var(--border); padding:8px;">TOTAL</td>
            <td style="border:1px solid var(--border); padding:8px; text-align:right; color:var(--primary-light)">${t}</td>
          </tr>
        </table><br>
      `;
    } else {
      html = `<span style="color:#003366; font-weight:bold;">${this._stdFmt(this.stdDisplay)}</span>`;
    }

    const event = new CustomEvent('calc:copy', { detail: { html } });
    window.dispatchEvent(event);
    if (typeof UI !== 'undefined') UI.toast('Cálculo listo para insertar', 'success');
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

  stdSubMode: 'normal',
  rpnStack: [0, 0, 0, 0],
  rpnEntry: '0',
  rpnEntryActive: false,

  _initStd(container) {
    container.querySelectorAll('.calc-sub-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.stdSubMode = btn.dataset.submode;
        container.querySelectorAll('.calc-sub-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const ni = container.querySelector('#calc-normal-inner');
        const ri = container.querySelector('#calc-rpn-inner');
        if (this.stdSubMode === 'normal') {
          ni.style.display = 'block'; ri.style.display = 'none';
        } else {
          ni.style.display = 'none'; ri.style.display = 'flex';
        }
      });
    });
    container.querySelectorAll('[data-std]').forEach(btn => {
      btn.addEventListener('click', () => this._handleStdKey(btn.dataset.std, container));
    });
    container.querySelectorAll('[data-rpn]').forEach(btn => {
      btn.addEventListener('click', () => this._handleRpnKey(btn.dataset.rpn, container));
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
        let rawExpr = this.stdDisplay.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
        const val = Function('"use strict"; return (' + rawExpr + ')')() || 0;

        const opToUse = this.stdOp || '+';
        this._addHistoryLine(`${opToUse} ${this.stdDisplay}`, container);
        
        // Crear la línea de total si no existe y recalcular
        this._addHistoryLine(`= 0`, container, true);
        this.recalculateTape(container); 
        
        this.stdOp = null;
        this.stdPrev = null;
        this.stdDisplay = '0';
        this.stdWaitingNext = true;
        if (expr) expr.textContent = '';
      } catch (e) {
        if (typeof UI !== 'undefined') UI.toast('Error al cerrar cuenta', 'error');
      }
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

  _handleRpnKey(key, container) {
    if (key === 'C') {
      this.rpnStack = [0,0,0,0]; this.rpnEntry = '0'; this.rpnEntryActive = false;
    } else if (key === 'ENTER') {
      const x = parseFloat(this.rpnEntry);
      this.rpnStack[0] = this.rpnStack[1];
      this.rpnStack[1] = this.rpnStack[2];
      this.rpnStack[2] = this.rpnStack[3];
      this.rpnStack[3] = x;
      this.rpnEntryActive = false;
    } else if (key === 'DROP') {
      this.rpnStack[3] = this.rpnStack[2];
      this.rpnStack[2] = this.rpnStack[1];
      this.rpnStack[1] = this.rpnStack[0];
      this.rpnStack[0] = 0;
      this.rpnEntry = String(this.rpnStack[3]);
    } else if (key === 'SWAP') {
      const tmp = this.rpnStack[3];
      this.rpnStack[3] = this.rpnStack[2];
      this.rpnStack[2] = tmp;
      this.rpnEntry = String(this.rpnStack[3]);
    } else if (key === 'CHS') {
      const v = parseFloat(this.rpnEntry) * -1;
      this.rpnEntry = String(v);
      this.rpnStack[3] = v;
    } else if (['+','−','×','÷'].includes(key)) {
      const x = parseFloat(this.rpnEntry);
      const y = this.rpnStack[2];
      let result;
      if (key === '+') result = y + x;
      if (key === '−') result = y - x;
      if (key === '×') result = y * x;
      if (key === '÷') result = x !== 0 ? y / x : 0;
      this.rpnStack[3] = result;
      this.rpnStack[2] = this.rpnStack[1];
      this.rpnStack[1] = this.rpnStack[0];
      this.rpnStack[0] = 0;
      this.rpnEntry = String(result);
      this.rpnEntryActive = false;
    } else if (key === '.') {
      if (!this.rpnEntryActive) { this.rpnEntry = '0.'; this.rpnEntryActive = true; }
      else if (!this.rpnEntry.includes('.')) this.rpnEntry += '.';
    } else {
      if (!this.rpnEntryActive) { this.rpnEntry = key; this.rpnEntryActive = true; }
      else { this.rpnEntry = this.rpnEntry === '0' ? key : this.rpnEntry + key; }
      this.rpnStack[3] = parseFloat(this.rpnEntry);
    }
    this._renderRpnStack(container);
  },

  _renderRpnStack(c) {
    ['t','z','y'].forEach((lbl, i) => {
      const el = c.querySelector(`#rpn-${lbl} .rpn-val`);
      if (el) el.textContent = this._stdFmt(this.rpnStack[i]);
    });
    const xEl = c.querySelector('#rpn-x-val');
    if (xEl) xEl.textContent = this._stdFmt(this.rpnEntry);
  }
};
