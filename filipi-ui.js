// ============================================================
// filipi-ui.js — Sistema Unificado de UI — FILIPI / PokeAlliance
// ============================================================
//
// Este arquivo é o ponto central do sistema de UI.
// Ele ESTENDE (não substitui) toast.js e confirm-modal.js.
//
// DEPENDE DE (devem vir antes no HTML):
//   <script src="toast.js"></script>
//   <script src="confirm-modal.js"></script>
//   <script src="filipi-ui.js"></script>   ← este arquivo
//
// ── API PÚBLICA COMPLETA ──────────────────────────────────────
//
//  TOASTS
//   showToast(msg, type)          → já existe em toast.js
//   showSuccess(msg)              → toast verde   ✓
//   showError(msg)                → toast vermelho ✓
//   showWarning(msg)              → toast amarelo  ✓
//   showInfo(msg)                 → toast azul     ✓
//
//  MODAIS
//   showConfirmModal(opts)        → já existe em confirm-modal.js
//   confirmAction(title, msg, opts?) → atalho semântico → Promise<boolean>
//
//  PROMPT CUSTOMIZADO
//   promptInput(opts)             → input premium → Promise<string|null>
//     opts.title        — título do modal
//     opts.message      — texto descritivo (opcional)
//     opts.placeholder  — placeholder do input
//     opts.defaultValue — valor inicial
//     opts.confirmText  — texto do botão (default: 'Confirmar')
//     opts.cancelText   — texto cancelar  (default: 'Cancelar')
//     opts.type         — 'info' | 'warning' | 'danger' | 'success'
//     opts.maxLength    — limite de caracteres (default: 500)
//     opts.inputType    — 'text' | 'number' | 'email' (default: 'text')
//     opts.required     — true = não permite enviar vazio (default: true)
//     opts.validate     — fn(value) → string|null  (null = ok, string = erro)
//
//  MODAIS DE FEEDBACK
//   showAlertModal(opts)          → modal de alerta (sem cancelar)
//     opts.title, opts.message, opts.type, opts.confirmText
//
// ── COMPATIBILIDADE ───────────────────────────────────────────
//
//   Todos os confirm() nativos do projeto já foram substituídos
//   por showConfirmModal() nos arquivos do projeto.
//   Este arquivo garante fallback seguro caso os módulos anteriores
//   não tenham carregado.
//
// ── DESIGN ────────────────────────────────────────────────────
//   dark blue · neon blue · glassmorphism · animações suaves
//   estilo premium gaming · responsivo · sem bibliotecas externas
//
// ============================================================

(function () {
  'use strict';

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  PALETA COMPARTILHADA                                        ║
  // ╚══════════════════════════════════════════════════════════════╝

  const PALETTE = {
    success: {
      color:  '#22d3a5',
      glow:   'rgba(34,211,165,0.38)',
      border: 'rgba(34,211,165,0.30)',
      dimBg:  'rgba(34,211,165,0.07)',
      label:  'SUCESSO',
    },
    error: {
      color:  '#f0476b',
      glow:   'rgba(240,71,107,0.38)',
      border: 'rgba(240,71,107,0.30)',
      dimBg:  'rgba(240,71,107,0.07)',
      label:  'ERRO',
    },
    warning: {
      color:  '#fbbf24',
      glow:   'rgba(251,191,36,0.38)',
      border: 'rgba(251,191,36,0.30)',
      dimBg:  'rgba(251,191,36,0.07)',
      label:  'ATENÇÃO',
    },
    info: {
      color:  '#60aaff',
      glow:   'rgba(96,170,255,0.38)',
      border: 'rgba(96,170,255,0.30)',
      dimBg:  'rgba(58,140,255,0.07)',
      label:  'INFORMAÇÃO',
    },
    danger: {
      color:  '#f0476b',
      glow:   'rgba(240,71,107,0.38)',
      border: 'rgba(240,71,107,0.30)',
      dimBg:  'rgba(240,71,107,0.07)',
      label:  'AÇÃO DESTRUTIVA',
    },
  };

  // SVG icons por tipo
  const ICONS = {
    success: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>`,
    error: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>`,
    warning: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>`,
    info: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>`,
    danger: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>`,
  };

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  UTILIDADES INTERNAS                                         ║
  // ╚══════════════════════════════════════════════════════════════╝

  function _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Gerenciador de foco: garante que apenas um modal por vez receba eventos
  let _activeModalCount = 0;

  function _closeWithAnimation(overlay, resolve, value) {
    if (overlay._closing) return;
    overlay._closing = true;
    overlay.classList.add('fui-closing');
    _activeModalCount = Math.max(0, _activeModalCount - 1);

    const finish = () => {
      if (overlay.parentNode) overlay.remove();
      resolve(value);
    };
    overlay.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, 320); // fallback
  }

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  CSS GLOBAL — injetado uma única vez                         ║
  // ╚══════════════════════════════════════════════════════════════╝

  const GLOBAL_CSS = `
    /* ── Overlay base ──────────────────────────────────────────── */
    .fui-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000001;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(4, 6, 14, 0.74);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      animation: fui-overlay-in 0.22s ease both;
    }

    .fui-overlay.fui-closing {
      animation: fui-overlay-out 0.28s ease both;
    }

    @keyframes fui-overlay-in  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fui-overlay-out { from { opacity: 1; } to { opacity: 0; } }

    /* ── Card base ─────────────────────────────────────────────── */
    .fui-card {
      position: relative;
      width: 100%;
      max-width: 420px;
      padding: 36px 28px 28px;
      border-radius: 20px;
      background: linear-gradient(
        155deg,
        rgba(8, 14, 32, 0.98) 0%,
        rgba(6, 10, 24, 0.98) 100%
      );
      border: 1px solid var(--fui-border);
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.03),
        0 8px 40px rgba(0,0,0,0.7),
        0 0 60px var(--fui-glow),
        inset 0 1px 0 rgba(255,255,255,0.06);
      backdrop-filter: blur(32px);
      -webkit-backdrop-filter: blur(32px);
      text-align: center;
      animation: fui-card-in 0.36s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      overflow: hidden;
    }

    .fui-closing .fui-card {
      animation: fui-card-out 0.28s cubic-bezier(0.55, 0, 1, 0.45) both;
    }

    @keyframes fui-card-in {
      from { opacity: 0; transform: scale(0.88) translateY(24px); }
      to   { opacity: 1; transform: scale(1)    translateY(0);    }
    }

    @keyframes fui-card-out {
      from { opacity: 1; transform: scale(1)    translateY(0);    }
      to   { opacity: 0; transform: scale(0.88) translateY(16px); }
    }

    /* Linha neon topo */
    .fui-card::before {
      content: '';
      position: absolute;
      top: 0; left: 10%; right: 10%;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--fui-color), transparent);
      opacity: 0.6;
    }

    /* Brilho de fundo sutil */
    .fui-card::after {
      content: '';
      position: absolute;
      top: -60px; left: 50%;
      transform: translateX(-50%);
      width: 200px; height: 160px;
      background: radial-gradient(ellipse, var(--fui-glow) 0%, transparent 70%);
      pointer-events: none;
    }

    /* ── Type label ────────────────────────────────────────────── */
    .fui-type-label {
      position: absolute;
      top: 14px; left: 50%;
      transform: translateX(-50%);
      font-family: 'Rajdhani', 'Segoe UI', sans-serif;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 3px;
      color: var(--fui-color);
      opacity: 0.65;
      white-space: nowrap;
      z-index: 1;
    }

    /* ── Ícone ─────────────────────────────────────────────────── */
    .fui-icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px; height: 64px;
      border-radius: 50%;
      background: var(--fui-dim-bg);
      border: 1.5px solid var(--fui-border);
      color: var(--fui-color);
      box-shadow: 0 0 24px var(--fui-glow), inset 0 1px 0 rgba(255,255,255,0.07);
      margin-bottom: 18px;
      position: relative;
      z-index: 1;
    }

    /* ── Título ────────────────────────────────────────────────── */
    .fui-title {
      font-family: 'Cinzel', 'Georgia', serif;
      font-size: 17px;
      font-weight: 700;
      color: rgba(255,255,255,0.94);
      margin: 0 0 10px;
      line-height: 1.3;
      position: relative;
      z-index: 1;
    }

    /* ── Divisor ───────────────────────────────────────────────── */
    .fui-divider {
      width: 40px; height: 1px;
      background: linear-gradient(90deg, transparent, var(--fui-color), transparent);
      opacity: 0.35;
      margin: 0 auto 18px;
      position: relative;
      z-index: 1;
    }

    /* ── Mensagem ──────────────────────────────────────────────── */
    .fui-message {
      font-family: 'Rajdhani', 'Segoe UI', sans-serif;
      font-size: 14.5px;
      color: rgba(255,255,255,0.60);
      line-height: 1.55;
      margin: 0 0 24px;
      position: relative;
      z-index: 1;
    }

    /* ── Ações ─────────────────────────────────────────────────── */
    .fui-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
      position: relative;
      z-index: 1;
    }

    .fui-btn {
      flex: 1;
      max-width: 160px;
      padding: 11px 16px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(255,255,255,0.05);
      color: rgba(255,255,255,0.65);
      font-family: 'Rajdhani', 'Segoe UI', sans-serif;
      font-size: 13.5px;
      font-weight: 600;
      letter-spacing: 0.5px;
      cursor: pointer;
      transition: all 0.18s ease;
      backdrop-filter: blur(8px);
    }

    .fui-btn:hover {
      background: rgba(255,255,255,0.09);
      color: rgba(255,255,255,0.85);
      transform: translateY(-1px);
    }

    .fui-btn:active {
      transform: translateY(0);
    }

    .fui-btn--primary {
      background: var(--fui-dim-bg);
      border-color: var(--fui-border);
      color: var(--fui-color);
      box-shadow: 0 0 16px var(--fui-glow), inset 0 1px 0 rgba(255,255,255,0.08);
    }

    .fui-btn--primary:hover {
      background: rgba(255,255,255,0.07);
      box-shadow: 0 0 28px var(--fui-glow), 0 4px 20px rgba(0,0,0,0.4);
      transform: translateY(-2px);
      color: var(--fui-color);
    }

    .fui-btn--solo {
      max-width: 200px;
    }

    /* ── Input (prompt) ────────────────────────────────────────── */
    .fui-input-wrap {
      position: relative;
      margin-bottom: 18px;
      z-index: 1;
    }

    .fui-input {
      width: 100%;
      box-sizing: border-box;
      padding: 12px 16px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 10px;
      color: rgba(255,255,255,0.88);
      font-family: 'Rajdhani', 'Segoe UI', sans-serif;
      font-size: 15px;
      outline: none;
      transition: border-color 0.18s, box-shadow 0.18s;
      caret-color: var(--fui-color);
    }

    .fui-input::placeholder {
      color: rgba(255,255,255,0.22);
    }

    .fui-input:focus {
      border-color: var(--fui-border);
      box-shadow: 0 0 0 3px var(--fui-glow), inset 0 1px 0 rgba(255,255,255,0.04);
    }

    .fui-input--error {
      border-color: rgba(240,71,107,0.6) !important;
      box-shadow: 0 0 0 3px rgba(240,71,107,0.18) !important;
    }

    .fui-input-error-msg {
      display: none;
      font-family: 'Rajdhani', 'Segoe UI', sans-serif;
      font-size: 12px;
      color: #f0476b;
      margin-top: 6px;
      text-align: left;
      padding-left: 2px;
    }

    .fui-input-error-msg.visible {
      display: block;
      animation: fui-shake 0.3s ease;
    }

    @keyframes fui-shake {
      0%, 100% { transform: translateX(0); }
      25%       { transform: translateX(-4px); }
      75%       { transform: translateX(4px); }
    }

    .fui-char-count {
      font-family: 'Rajdhani', 'Segoe UI', sans-serif;
      font-size: 11px;
      color: rgba(255,255,255,0.22);
      text-align: right;
      margin-top: 5px;
    }

    .fui-char-count.fui-char-warn { color: #fbbf24; }
    .fui-char-count.fui-char-limit { color: #f0476b; }

    /* ── Mobile ────────────────────────────────────────────────── */
    @media (max-width: 480px) {
      .fui-card {
        padding: 28px 18px 22px;
        border-radius: 16px;
      }

      .fui-title { font-size: 15px; }
      .fui-message { font-size: 13.5px; }

      .fui-actions {
        flex-direction: column-reverse;
        gap: 8px;
      }

      .fui-btn,
      .fui-btn--solo {
        max-width: 100%;
        width: 100%;
      }
    }
  `;

  function _injectGlobalStyles() {
    if (document.getElementById('fui-global-styles')) return;
    const style = document.createElement('style');
    style.id = 'fui-global-styles';
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
  }

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  FÁBRICA DE OVERLAY                                          ║
  // ╚══════════════════════════════════════════════════════════════╝

  function _buildOverlay(type) {
    const cfg = PALETTE[type] || PALETTE.info;
    const overlay = document.createElement('div');
    overlay.className = 'fui-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.setProperty('--fui-color',  cfg.color);
    overlay.style.setProperty('--fui-glow',   cfg.glow);
    overlay.style.setProperty('--fui-border', cfg.border);
    overlay.style.setProperty('--fui-dim-bg', cfg.dimBg);
    return { overlay, cfg };
  }

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  1 · TOASTS HELPERS                                          ║
  // ╚══════════════════════════════════════════════════════════════╝

  /**
   * Exibe toast de sucesso.
   * @param {string} msg
   */
  function showSuccess(msg) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, 'success');
    }
  }

  /**
   * Exibe toast de erro.
   * @param {string} msg
   */
  function showError(msg) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, 'error');
    }
  }

  /**
   * Exibe toast de aviso.
   * @param {string} msg
   */
  function showWarning(msg) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, 'warning');
    }
  }

  /**
   * Exibe toast informativo.
   * @param {string} msg
   */
  function showInfo(msg) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, 'info');
    }
  }

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  2 · confirmAction — atalho semântico                        ║
  // ╚══════════════════════════════════════════════════════════════╝

  /**
   * Atalho para showConfirmModal com API simplificada.
   *
   * @param {string} title   — Título da ação
   * @param {string} message — Descrição
   * @param {Object} [opts]  — { type, confirmText, cancelText }
   * @returns {Promise<boolean>}
   *
   * @example
   *   const ok = await confirmAction('Excluir item?', 'Esta ação não pode ser desfeita.', { type: 'danger' });
   */
  async function confirmAction(title, message, opts = {}) {
    const fn = window.showConfirmModal;
    if (typeof fn === 'function') {
      return fn({
        title,
        message,
        type:        opts.type        || 'warning',
        confirmText: opts.confirmText || 'Confirmar',
        cancelText:  opts.cancelText  || 'Cancelar',
      });
    }
    // Fallback de segurança (nunca deve ocorrer em produção)
    return window.confirm(`${title}\n\n${message}`);
  }

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  3 · promptInput — substitui window.prompt()                 ║
  // ╚══════════════════════════════════════════════════════════════╝

  /**
   * Modal de input premium — substitui window.prompt().
   *
   * @param {Object} opts
   * @param {string}   opts.title         — Título do modal
   * @param {string}   [opts.message]     — Texto descritivo
   * @param {string}   [opts.placeholder] — Placeholder do input
   * @param {string}   [opts.defaultValue]— Valor inicial
   * @param {string}   [opts.confirmText] — Texto do botão confirmar (default: 'Confirmar')
   * @param {string}   [opts.cancelText]  — Texto cancelar (default: 'Cancelar')
   * @param {string}   [opts.type]        — 'info'|'success'|'warning'|'danger'
   * @param {number}   [opts.maxLength]   — Limite de caracteres (default: 500)
   * @param {string}   [opts.inputType]   — 'text'|'number'|'email' (default: 'text')
   * @param {boolean}  [opts.required]    — Não permite enviar vazio (default: true)
   * @param {Function} [opts.validate]    — fn(value) → string|null
   * @returns {Promise<string|null>}      — string com valor ou null (cancelou)
   */
  function promptInput(opts = {}) {
    _injectGlobalStyles();

    const {
      title        = 'Digite o valor',
      message      = '',
      placeholder  = '',
      defaultValue = '',
      confirmText  = 'Confirmar',
      cancelText   = 'Cancelar',
      type         = 'info',
      maxLength    = 500,
      inputType    = 'text',
      required     = true,
      validate     = null,
    } = opts;

    const { overlay, cfg } = _buildOverlay(type);

    return new Promise((resolve) => {
      const showCharCount = maxLength <= 200;

      overlay.innerHTML = `
        <div class="fui-card" role="document">
          <div class="fui-type-label">${_escapeHtml(cfg.label)}</div>

          <div class="fui-icon-wrap">
            ${ICONS[type] || ICONS.info}
          </div>

          <h2 class="fui-title" id="fui-prompt-title">${_escapeHtml(title)}</h2>

          <div class="fui-divider"></div>

          ${message
            ? `<p class="fui-message">${_escapeHtml(message)}</p>`
            : ''
          }

          <div class="fui-input-wrap">
            <input
              class="fui-input"
              id="fui-prompt-input"
              type="${_escapeHtml(inputType)}"
              placeholder="${_escapeHtml(placeholder)}"
              maxlength="${maxLength}"
              value="${_escapeHtml(defaultValue)}"
              autocomplete="off"
              autocorrect="off"
              spellcheck="false"
              aria-labelledby="fui-prompt-title"
            >
            <div class="fui-input-error-msg" id="fui-prompt-error"></div>
            ${showCharCount
              ? `<div class="fui-char-count" id="fui-char-count">0 / ${maxLength}</div>`
              : ''
            }
          </div>

          <div class="fui-actions">
            <button class="fui-btn" id="fui-prompt-cancel">${_escapeHtml(cancelText)}</button>
            <button class="fui-btn fui-btn--primary" id="fui-prompt-confirm">${_escapeHtml(confirmText)}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      _activeModalCount++;

      const inputEl   = overlay.querySelector('#fui-prompt-input');
      const confirmBtn = overlay.querySelector('#fui-prompt-confirm');
      const cancelBtn  = overlay.querySelector('#fui-prompt-cancel');
      const errorMsg   = overlay.querySelector('#fui-prompt-error');
      const charCount  = overlay.querySelector('#fui-char-count');

      // Foco no input
      setTimeout(() => {
        inputEl.focus();
        // Seleciona tudo se tiver valor padrão
        if (defaultValue) {
          inputEl.select();
        }
      }, 80);

      // Atualiza contador de caracteres
      function _updateCharCount() {
        if (!charCount) return;
        const len = inputEl.value.length;
        charCount.textContent = `${len} / ${maxLength}`;
        charCount.className = 'fui-char-count';
        if (len >= maxLength)          charCount.classList.add('fui-char-limit');
        else if (len >= maxLength * 0.85) charCount.classList.add('fui-char-warn');
      }

      if (charCount) {
        _updateCharCount();
        inputEl.addEventListener('input', _updateCharCount);
      }

      // Validação
      function _showError(msg) {
        inputEl.classList.add('fui-input--error');
        errorMsg.textContent = msg;
        errorMsg.classList.add('visible');
        // Reset error class after animation
        setTimeout(() => errorMsg.style.animation = '', 400);
      }

      function _clearError() {
        inputEl.classList.remove('fui-input--error');
        errorMsg.classList.remove('visible');
      }

      inputEl.addEventListener('input', _clearError);

      function _tryConfirm() {
        const val = inputEl.value;

        if (required && !val.trim()) {
          _showError('Este campo é obrigatório.');
          inputEl.focus();
          return;
        }

        if (validate) {
          const err = validate(val);
          if (err) {
            _showError(err);
            inputEl.focus();
            return;
          }
        }

        _closeWithAnimation(overlay, resolve, val);
      }

      function _tryCancel() {
        _closeWithAnimation(overlay, resolve, null);
      }

      confirmBtn.addEventListener('click', _tryConfirm);
      cancelBtn.addEventListener('click',  _tryCancel);

      // Fechar ao clicar fora
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) _tryCancel();
      });

      // Teclado
      const onKey = (e) => {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', onKey);
          _tryCancel();
        }
        if (e.key === 'Enter' && e.target === inputEl) {
          _tryConfirm();
        }
        // Tab trap
        if (e.key === 'Tab' && overlay.contains(e.target)) {
          const focusable = [inputEl, cancelBtn, confirmBtn];
          const idx = focusable.indexOf(document.activeElement);
          e.preventDefault();
          focusable[(idx + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length].focus();
        }
      };
      document.addEventListener('keydown', onKey);

      // Remove listener ao fechar
      overlay.addEventListener('animationend', () => {
        if (overlay._closing) document.removeEventListener('keydown', onKey);
      });
    });
  }

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  4 · showAlertModal — alerta sem cancelar (substitui alert())║
  // ╚══════════════════════════════════════════════════════════════╝

  /**
   * Modal de alerta (somente OK — substitui window.alert()).
   *
   * @param {Object|string} opts — string = só mensagem, objeto = { title, message, type, confirmText }
   * @returns {Promise<void>}
   *
   * @example
   *   await showAlertModal('Pedido enviado com sucesso!');
   *   await showAlertModal({ title: 'Erro', message: 'Falha na conexão.', type: 'error' });
   */
  function showAlertModal(opts) {
    _injectGlobalStyles();

    // Aceita string simples como atalho
    if (typeof opts === 'string') {
      opts = { message: opts };
    }

    const {
      title       = 'Aviso',
      message     = '',
      confirmText = 'OK',
      type        = 'info',
    } = opts;

    const { overlay } = _buildOverlay(type);
    const cfg = PALETTE[type] || PALETTE.info;

    return new Promise((resolve) => {
      overlay.innerHTML = `
        <div class="fui-card" role="document">
          <div class="fui-type-label">${_escapeHtml(cfg.label)}</div>

          <div class="fui-icon-wrap">
            ${ICONS[type] || ICONS.info}
          </div>

          <h2 class="fui-title">${_escapeHtml(title)}</h2>

          <div class="fui-divider"></div>

          ${message
            ? `<p class="fui-message">${_escapeHtml(message)}</p>`
            : ''
          }

          <div class="fui-actions">
            <button class="fui-btn fui-btn--primary fui-btn--solo" id="fui-alert-ok">${_escapeHtml(confirmText)}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      _activeModalCount++;

      const okBtn = overlay.querySelector('#fui-alert-ok');
      setTimeout(() => okBtn.focus(), 50);

      const onClose = () => _closeWithAnimation(overlay, resolve, undefined);

      okBtn.addEventListener('click', onClose);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) onClose();
      });

      const onKey = (e) => {
        if (e.key === 'Escape' || e.key === 'Enter') {
          document.removeEventListener('keydown', onKey);
          onClose();
        }
      };
      document.addEventListener('keydown', onKey);

      overlay.addEventListener('animationend', () => {
        if (overlay._closing) document.removeEventListener('keydown', onKey);
      });
    });
  }

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  5 · EXPOSIÇÃO GLOBAL                                        ║
  // ╚══════════════════════════════════════════════════════════════╝

  // Toasts helper
  window.showSuccess  = showSuccess;
  window.showError    = showError;
  window.showWarning  = showWarning;
  window.showInfo     = showInfo;

  // Modais
  window.confirmAction  = confirmAction;
  window.promptInput    = promptInput;
  window.showAlertModal = showAlertModal;

  // Namespace FilipiUI (opcional — acesso como FilipiUI.confirmAction(...))
  window.FilipiUI = {
    // Toasts
    toast:      (msg, type) => window.showToast?.(msg, type),
    success:    showSuccess,
    error:      showError,
    warning:    showWarning,
    info:       showInfo,

    // Modais
    confirm:    (opts)         => window.showConfirmModal?.(opts),
    confirmAction,
    prompt:     promptInput,
    alert:      showAlertModal,
  };

  // Garantia: se toast.js não carregou por algum motivo, cria stubs seguros
  if (typeof window.showToast !== 'function') {
    window.showToast = function (msg, type) {
      console.warn('[FilipiUI] toast.js não carregou. Mensagem:', type?.toUpperCase(), msg);
    };
  }

  // Garantia: se confirm-modal.js não carregou, usa showAlertModal + resolve(true) como fallback
  if (typeof window.showConfirmModal !== 'function') {
    window.showConfirmModal = async function (opts) {
      await showAlertModal({ title: opts?.title || 'Confirmar', message: opts?.message, type: opts?.type || 'warning' });
      return true; // fallback permissivo
    };
    console.warn('[FilipiUI] confirm-modal.js não carregou. Usando fallback de showConfirmModal.');
  }

})();
