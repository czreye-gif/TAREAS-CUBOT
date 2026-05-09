/**
 * Calculadora de Retenciones Fiscales MX
 * Convertida de Python/Tkinter a JavaScript
 */
const RetCalc = {
  ivaRate: 16, isrRate: 1.25, retIvaRate: 0,
  subtotalCents: 0, totalCents: 0,
  activeInput: 'subtotal',

  render() {
    return `
      <div class="calc-panel" id="ret-calc-panel">
        <div class="calc-header-bar">
          <span class="calc-title">🧮 CZREYE CALC</span>
          <span class="calc-sub">RETENCIONES MX</span>
        </div>

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
          <div class="calc-res-row"><span>Base</span><span id="cr-base">$0.00</span></div>
          <div class="calc-res-row"><span>IVA</span><span id="cr-iva">$0.00</span></div>
          <div class="calc-res-row"><span>Ret. ISR</span><span id="cr-isr" class="calc-danger">-$0.00</span></div>
          <div class="calc-res-row"><span>Ret. IVA</span><span id="cr-riva" class="calc-danger">-$0.00</span></div>
          <div class="calc-res-divider"></div>
          <div class="calc-res-row calc-res-total"><span>TOTAL</span><span id="cr-total">$0.00</span></div>
        </div>

        <button class="calc-clear-btn" id="calc-clear">C — LIMPIAR</button>
      </div>
    `;
  },

  init(container) {
    // Pills
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

    // Input toggle
    ['sub','tot'].forEach(k => {
      const el = container.querySelector(`#cig-${k}`);
      if (el) el.addEventListener('click', () => {
        this.activeInput = el.dataset.field;
        container.querySelectorAll('.calc-input-group').forEach(g => g.classList.remove('active-input'));
        el.classList.add('active-input');
      });
    });

    // Numpad
    container.querySelectorAll('.calc-key').forEach(btn => {
      btn.addEventListener('click', () => this._handleKey(btn.dataset.key, container));
    });

    // Clear
    const clearBtn = container.querySelector('#calc-clear');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      this.subtotalCents = 0; this.totalCents = 0;
      this._updateDisplays(container);
      this._setResults(0, 0, 0, 0, 0, container);
    });
  },

  _handleKey(key, container) {
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

  _fmt(n) { return '$' + n.toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2}); },
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
    set('#cr-base', this._fmt(s));
    set('#cr-iva',  this._fmt(iva));
    set('#cr-isr',  '-' + this._fmt(isr));
    set('#cr-riva', '-' + this._fmt(rv));
    set('#cr-total',this._fmt(t));
  }
};
