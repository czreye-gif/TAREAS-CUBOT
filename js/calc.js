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

          <div class="calc-results">
            <div class="calc-res-divider"></div>
            <div class="calc-res-row"><span>Subtotal/IVA</span><span id="cr-iva-combined">$0.00 / $0.00</span></div>
            <div class="calc-res-row"><span>Retenciones</span><span id="cr-ret-combined" class="calc-danger">-$0.00</span></div>
            <div class="calc-res-divider"></div>
            <div class="calc-res-row calc-res-total"><span>TOTAL</span><span id="cr-total">$0.00</span></div>
          </div>

          <div style="display:flex; gap:8px; margin-top:8px;">
            <button class="calc-clear-btn" id="calc-clear" style="flex:1">LIMPIAR</button>
            <button class="calc-copy-btn" id="calc-copy-ret" style="flex:1.5; background:var(--success); color:white; border-radius:8px; font-weight:700; font-size:0.75rem; border:none; cursor:pointer; box-shadow:0 4px 12px rgba(16,185,129,0.3)">📋 COPIAR A NOTA</button>
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
            <div class="calc-std-display">
              <div class="calc-std-expr" id="calc-std-expr"></div>
              <div class="calc-std-screen" id="calc-std-screen">0</div>
            </div>
            <div class="calc-std-pad">
              <button class="calc-key calc-key-fn" data-std="C">C</button>
              <button class="calc-key calc-key-fn" data-std="+/-">+/−</button>
              <button class="calc-key calc-key-fn" data-std="%">%</button>
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
              <button class="calc-key calc-key-wide" data-std="0">0</button>
              <button class="calc-key" data-std=".">.</button>
              <button class="calc-key calc-key-eq" data-std="=">=</button>
            </div>
            <button id="calc-copy-std" style="width:100%; margin-top:8px; padding:10px; background:var(--primary); color:white; border-radius:8px; font-weight:700; font-size:0.75rem; border:none; cursor:pointer">📋 COPIAR RESULTADO A NOTA</button>
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

    // Copy buttons
    const btnCopyRet = container.querySelector('#calc-copy-ret');
    if (btnCopyRet) btnCopyRet.onclick = () => this.copyToNote('ret');

    const btnCopyStd = container.querySelector('#calc-copy-std');
    if (btnCopyStd) btnCopyStd.onclick = () => this.copyToNote('std');
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
      html = `<p><b>Resultado:</b> ${this._stdFmt(this.stdDisplay)}</p>`;
    }

    // Trigger event to be caught by the editor
    const event = new CustomEvent('calc:copy', { detail: { html } });
    window.dispatchEvent(event);
    if (typeof UI !== 'undefined') UI.toast('Cálculo listo para insertar', 'success');
  },

  // ── Calculadora Retenciones ─────────────────────────────
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
    set('#cr-iva-combined', `${this._fmt(s)} / ${this._fmt(iva)}`);
    set('#cr-ret-combined', `-${this._fmt(isr + rv)}`);
    set('#cr-total', this._fmt(t));
  },

  // ── Calculadora Normal + RPN ────────────────────────────
  stdSubMode: 'normal', // 'normal' | 'rpn'
  rpnStack: [0, 0, 0, 0], // [T, Z, Y, X]
  rpnEntry: '0',
  rpnEntryActive: false,

  _initStd(container) {
    // Sub-switch Normal / RPN
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
    // Normal keys
    container.querySelectorAll('[data-std]').forEach(btn => {
      btn.addEventListener('click', () => this._handleStdKey(btn.dataset.std, container));
    });
    // RPN keys
    container.querySelectorAll('[data-rpn]').forEach(btn => {
      btn.addEventListener('click', () => this._handleRpnKey(btn.dataset.rpn, container));
    });
  },

  _handleStdKey(key, container) {
    const screen = container.querySelector('#calc-std-screen');
    const expr   = container.querySelector('#calc-std-expr');
    if (!screen) return;

    if (key === 'C') {
      this.stdDisplay = '0'; this.stdPrev = null;
      this.stdOp = null; this.stdWaitingNext = false;
      if (expr) expr.textContent = '';
    } else if (key === '+/-') {
      this.stdDisplay = String(parseFloat(this.stdDisplay) * -1);
    } else if (key === '%') {
      this.stdDisplay = String(parseFloat(this.stdDisplay) / 100);
    } else if (['+','−','×','÷'].includes(key)) {
      this.stdPrev = parseFloat(this.stdDisplay);
      this.stdOp = key;
      this.stdWaitingNext = true;
      if (expr) expr.textContent = `${this._stdFmt(this.stdPrev)} ${key}`;
    } else if (key === '=') {
      if (this.stdOp !== null && this.stdPrev !== null) {
        const curr = parseFloat(this.stdDisplay);
        if (expr) expr.textContent = `${this._stdFmt(this.stdPrev)} ${this.stdOp} ${this._stdFmt(curr)} =`;
        let result;
        if (this.stdOp === '+') result = this.stdPrev + curr;
        if (this.stdOp === '−') result = this.stdPrev - curr;
        if (this.stdOp === '×') result = this.stdPrev * curr;
        if (this.stdOp === '÷') result = curr !== 0 ? this.stdPrev / curr : 'Error';
        this.stdDisplay = String(result);
        this.stdPrev = null; this.stdOp = null; this.stdWaitingNext = false;
      }
    } else if (key === '.') {
      if (this.stdWaitingNext) { this.stdDisplay = '0.'; this.stdWaitingNext = false; return; }
      if (!this.stdDisplay.includes('.')) this.stdDisplay += '.';
    } else {
      // Digit
      if (this.stdWaitingNext) { this.stdDisplay = key; this.stdWaitingNext = false; }
      else { this.stdDisplay = this.stdDisplay === '0' ? key : this.stdDisplay + key; }
    }

    screen.textContent = this._stdFmt(this.stdDisplay);
  },

  _stdFmt(n) {
    const num = parseFloat(n);
    if (isNaN(num)) return String(n);
    const s = String(n);
    if (s.includes('.')) return parseFloat(num.toFixed(8)).toLocaleString('es-MX');
    return num.toLocaleString('es-MX');
  },

  // ── RPN Calculator ─────────────────────────────────────
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
