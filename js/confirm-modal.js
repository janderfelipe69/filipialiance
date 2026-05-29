// ============================================================
// confirm-modal.js — Modal de Confirmação Global
// FILIPI / PokeAlliance
//
// API pública:
//   window.showConfirmModal(options) → Promise<boolean>
//
// Opções:
//   title        {string}  — Título do modal
//   message      {string}  — Mensagem de descrição
//   confirmText  {string}  — Texto do botão confirmar  (default: 'Confirmar')
//   cancelText   {string}  — Texto do botão cancelar   (default: 'Cancelar')
//   type         {string}  — 'success' | 'warning' | 'danger' | 'info'
//
// Exemplo:
//   const ok = await showConfirmModal({
//     title: "Concluir serviço?",
//     message: "O pedido sairá da fila principal.",
//     confirmText: "Concluir",
//     cancelText: "Cancelar",
//     type: "success"
//   });
//   if (ok) { /* confirmado */ }
//
// Design: dark blue · neon glow · blur backdrop · Cinzel + Rajdhani
// ⚠ INDEPENDENTE — não altera nenhum outro módulo.
//    Não entra em conflito com toasts nem outros modais existentes.
// ============================================================

(function () {
  'use strict';

  // ── Paleta por tipo ──────────────────────────────────────────────────────
  const MODAL_TYPES = {
    success: {
      color:   '#22d3a5',
      glow:    'rgba(34,211,165,0.38)',
      border:  'rgba(34,211,165,0.30)',
      dimBg:   'rgba(34,211,165,0.07)',
      label:   'CONFIRMAÇÃO',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
               <polyline points="22 4 12 14.01 9 11.01"/>
             </svg>`,
    },
    warning: {
      color:   '#fbbf24',
      glow:    'rgba(251,191,36,0.38)',
      border:  'rgba(251,191,36,0.30)',
      dimBg:   'rgba(251,191,36,0.07)',
      label:   'ATENÇÃO',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
               <line x1="12" y1="9" x2="12" y2="13"/>
               <line x1="12" y1="17" x2="12.01" y2="17"/>
             </svg>`,
    },
    danger: {
      color:   '#f0476b',
      glow:    'rgba(240,71,107,0.38)',
      border:  'rgba(240,71,107,0.30)',
      dimBg:   'rgba(240,71,107,0.07)',
      label:   'AÇÃO DESTRUTIVA',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <circle cx="12" cy="12" r="10"/>
               <line x1="15" y1="9" x2="9" y2="15"/>
               <line x1="9" y1="9" x2="15" y2="15"/>
             </svg>`,
    },
    info: {
      color:   '#60aaff',
      glow:    'rgba(96,170,255,0.38)',
      border:  'rgba(96,170,255,0.30)',
      dimBg:   'rgba(58,140,255,0.07)',
      label:   'INFORMAÇÃO',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <circle cx="12" cy="12" r="10"/>
               <line x1="12" y1="16" x2="12" y2="12"/>
               <line x1="12" y1="8" x2="12.01" y2="8"/>
             </svg>`,
    },
  };

  // ── CSS injetado uma única vez ───────────────────────────────────────────
  const CSS = `
    /* ── Overlay ─────────────────────────────────────────────────────────── */
    #cm-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: rgba(4, 6, 14, 0.72);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      animation: cm-overlay-in 0.22s ease both;
    }

    #cm-overlay.cm-closing {
      animation: cm-overlay-out 0.22s ease both;
    }

    @keyframes cm-overlay-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    @keyframes cm-overlay-out {
      from { opacity: 1; }
      to   { opacity: 0; }
    }

    /* ── Modal card ──────────────────────────────────────────────────────── */
    #cm-card {
      position: relative;
      background: linear-gradient(155deg, #0d1628 0%, #080f1e 55%, #0a1220 100%);
      border: 1px solid var(--cm-border);
      border-radius: 20px;
      padding: 36px 32px 28px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow:
        0 0 60px var(--cm-glow),
        0 24px 64px rgba(0, 0, 0, 0.7),
        0 0 0 1px rgba(255, 255, 255, 0.03),
        inset 0 1px 0 rgba(255, 255, 255, 0.06);
      overflow: hidden;
      animation: cm-card-in 0.34s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    #cm-overlay.cm-closing #cm-card {
      animation: cm-card-out 0.22s cubic-bezier(0.55, 0, 1, 0.45) both;
    }

    @keyframes cm-card-in {
      from {
        opacity: 0;
        transform: translateY(28px) scale(0.94);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes cm-card-out {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(14px) scale(0.96);
      }
    }

    /* Linha neon superior */
    #cm-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 2px;
      background: linear-gradient(90deg,
        transparent 0%,
        var(--cm-color) 40%,
        var(--cm-color) 60%,
        transparent 100%
      );
      opacity: 0.8;
    }

    /* Brilho radial no topo */
    #cm-card::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at 50% -10%,
        var(--cm-dim-bg) 0%,
        transparent 65%
      );
      pointer-events: none;
    }

    /* ── Label de tipo ───────────────────────────────────────────────────── */
    #cm-type-label {
      font-family: 'Space Mono', 'Courier New', monospace;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 3px;
      color: var(--cm-color);
      text-transform: uppercase;
      opacity: 0.75;
      margin-bottom: 16px;
    }

    /* ── Ícone ───────────────────────────────────────────────────────────── */
    #cm-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--cm-dim-bg);
      border: 1.5px solid var(--cm-border);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      color: var(--cm-color);
      box-shadow:
        0 0 20px var(--cm-glow),
        0 0 40px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.07);
      position: relative;
      z-index: 1;
    }

    /* Pulso sutil no ícone */
    #cm-icon-wrap::before {
      content: '';
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      border: 1px solid var(--cm-color);
      opacity: 0.2;
      animation: cm-pulse 2.5s ease-in-out infinite;
    }

    @keyframes cm-pulse {
      0%, 100% { transform: scale(1); opacity: 0.2; }
      50%       { transform: scale(1.12); opacity: 0.08; }
    }

    /* ── Título ──────────────────────────────────────────────────────────── */
    #cm-title {
      font-family: 'Cinzel', 'Georgia', serif;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #dde8ff;
      margin-bottom: 10px;
      line-height: 1.3;
      position: relative;
      z-index: 1;
    }

    /* ── Mensagem ────────────────────────────────────────────────────────── */
    #cm-message {
      font-family: 'Rajdhani', 'Segoe UI', sans-serif;
      font-size: 14.5px;
      font-weight: 500;
      color: rgba(170, 195, 235, 0.75);
      line-height: 1.55;
      margin-bottom: 28px;
      position: relative;
      z-index: 1;
    }

    /* ── Botões ──────────────────────────────────────────────────────────── */
    #cm-actions {
      display: flex;
      gap: 10px;
      position: relative;
      z-index: 1;
    }

    .cm-btn {
      flex: 1;
      padding: 11px 16px;
      border-radius: 10px;
      font-family: 'Rajdhani', 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      cursor: pointer;
      border: 1px solid transparent;
      transition:
        transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
        box-shadow 0.15s ease,
        opacity 0.15s ease,
        background 0.15s ease;
      outline: none;
    }

    .cm-btn:active {
      transform: scale(0.96) !important;
    }

    /* Cancelar */
    #cm-btn-cancel {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.10);
      color: rgba(170, 195, 235, 0.65);
    }

    #cm-btn-cancel:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.18);
      color: rgba(200, 220, 255, 0.85);
      transform: translateY(-1px);
    }

    /* Confirmar */
    #cm-btn-confirm {
      background: var(--cm-dim-bg);
      border-color: var(--cm-border);
      color: var(--cm-color);
      box-shadow: 0 0 16px var(--cm-glow), inset 0 1px 0 rgba(255,255,255,0.08);
    }

    #cm-btn-confirm:hover {
      background: rgba(255, 255, 255, 0.07);
      box-shadow: 0 0 28px var(--cm-glow), 0 4px 20px rgba(0,0,0,0.4);
      transform: translateY(-2px);
    }

    /* ── Separador decorativo ────────────────────────────────────────────── */
    #cm-divider {
      width: 40px;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--cm-color), transparent);
      opacity: 0.35;
      margin: 0 auto 24px;
      position: relative;
      z-index: 1;
    }

    /* ── Mobile ──────────────────────────────────────────────────────────── */
    @media (max-width: 480px) {
      #cm-card {
        padding: 28px 20px 22px;
        border-radius: 16px;
      }

      #cm-title {
        font-size: 16px;
      }

      #cm-message {
        font-size: 13.5px;
      }

      #cm-actions {
        flex-direction: column-reverse;
        gap: 8px;
      }

      .cm-btn {
        width: 100%;
        padding: 12px 16px;
      }
    }
  `;

  // ── Injetar CSS ──────────────────────────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById('cm-styles')) return;
    const style = document.createElement('style');
    style.id = 'cm-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // ── Fechar com animação ──────────────────────────────────────────────────
  function _closeWithAnimation(overlay, resolve, value) {
    overlay.classList.add('cm-closing');

    const finish = () => {
      if (overlay.parentNode) overlay.remove();
      resolve(value);
    };

    overlay.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, 300); // fallback
  }

  // ── Função principal ─────────────────────────────────────────────────────

  /**
   * Exibe um modal de confirmação.
   *
   * @param {Object}  options
   * @param {string}  options.title        — Título
   * @param {string}  options.message      — Mensagem descritiva
   * @param {string}  [options.confirmText] — Texto do botão confirmar (default: 'Confirmar')
   * @param {string}  [options.cancelText]  — Texto do botão cancelar  (default: 'Cancelar')
   * @param {string}  [options.type]        — 'success' | 'warning' | 'danger' | 'info'
   * @returns {Promise<boolean>}
   */
  function showConfirmModal(options) {
    _injectStyles();

    const {
      title       = 'Confirmar ação?',
      message     = '',
      confirmText = 'Confirmar',
      cancelText  = 'Cancelar',
      type        = 'info',
    } = options || {};

    const cfg = MODAL_TYPES[type] || MODAL_TYPES.info;

    return new Promise((resolve) => {
      // ── Overlay ──
      const overlay = document.createElement('div');
      overlay.id = 'cm-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'cm-title');
      overlay.setAttribute('aria-describedby', 'cm-message');

      // ── CSS vars no overlay ──
      overlay.style.setProperty('--cm-color',   cfg.color);
      overlay.style.setProperty('--cm-glow',    cfg.glow);
      overlay.style.setProperty('--cm-border',  cfg.border);
      overlay.style.setProperty('--cm-dim-bg',  cfg.dimBg);

      // ── HTML ──
      overlay.innerHTML = `
        <div id="cm-card">
          <div id="cm-type-label">${_escapeHtml(cfg.label)}</div>

          <div id="cm-icon-wrap">
            ${cfg.icon}
          </div>

          <h2 id="cm-title">${_escapeHtml(title)}</h2>

          <div id="cm-divider"></div>

          ${message
            ? `<p id="cm-message">${_escapeHtml(message)}</p>`
            : `<p id="cm-message" style="display:none"></p>`
          }

          <div id="cm-actions">
            <button class="cm-btn" id="cm-btn-cancel">${_escapeHtml(cancelText)}</button>
            <button class="cm-btn" id="cm-btn-confirm">${_escapeHtml(confirmText)}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      // ── Foco acessível ──
      const confirmBtn = overlay.querySelector('#cm-btn-confirm');
      const cancelBtn  = overlay.querySelector('#cm-btn-cancel');
      setTimeout(() => confirmBtn.focus(), 50);

      // ── Handlers ──
      const onConfirm = () => _closeWithAnimation(overlay, resolve, true);
      const onCancel  = () => _closeWithAnimation(overlay, resolve, false);

      confirmBtn.addEventListener('click', onConfirm);
      cancelBtn.addEventListener('click',  onCancel);

      // Fechar ao clicar no overlay (fora do card)
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) onCancel();
      });

      // Fechar com Escape
      const onKey = (e) => {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', onKey);
          onCancel();
        }
        // Tab trap dentro do modal
        if (e.key === 'Tab') {
          e.preventDefault();
          if (document.activeElement === confirmBtn) {
            cancelBtn.focus();
          } else {
            confirmBtn.focus();
          }
        }
      };
      document.addEventListener('keydown', onKey);

      // Remove listener de teclado ao fechar
      overlay.addEventListener('animationend', () => {
        if (overlay.classList.contains('cm-closing')) {
          document.removeEventListener('keydown', onKey);
        }
      });
    });
  }

  // ── Utilitário ───────────────────────────────────────────────────────────
  function _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Exposição global ─────────────────────────────────────────────────────
  //
  // Disponível como:
  //   window.showConfirmModal(options) → Promise<boolean>
  //   ConfirmModal.show(options)       → Promise<boolean>  (namespace alternativo)
  //
  window.showConfirmModal = showConfirmModal;
  window.ConfirmModal = { show: showConfirmModal };

})();
