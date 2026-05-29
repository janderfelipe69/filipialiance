// ============================================================
// toast.js — Sistema Global de Toasts
// FILIPI / PokeAlliance
//
// API pública:
//   window.showToast(message, type)
//
// Tipos: 'success' | 'error' | 'warning' | 'info'
//
// Exemplo:
//   showToast("Serviço iniciado!", "success")
//   showToast("Erro ao salvar pedido", "error")
//
// Design: dark blue · neon glow · glassmorphism
// Posição: canto superior direito · stack automático
// Duração: 4s · fecha automático · botão de fechar
//
// ⚠ INDEPENDENTE — não altera nenhum outro módulo.
//    Não entra em conflito com #pa-toast-container
//    de orders-notifications.js (usa ID próprio).
// ============================================================

(function () {
  'use strict';

  // ── Constantes ──────────────────────────────────────────────────────────
  const CONTAINER_ID   = 'global-toast-container';
  const DURATION_MS    = 4000;
  const MAX_VISIBLE    = 5;          // limite de toasts simultâneos na tela

  // ── Paleta por tipo ──────────────────────────────────────────────────────
  const TOAST_TYPES = {
    success: {
      color:  '#22d3a5',
      glow:   'rgba(34,211,165,0.35)',
      border: 'rgba(34,211,165,0.28)',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
               <polyline points="20 6 9 17 4 12"/>
             </svg>`,
    },
    error: {
      color:  '#f0476b',
      glow:   'rgba(240,71,107,0.35)',
      border: 'rgba(240,71,107,0.28)',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
               <circle cx="12" cy="12" r="10"/>
               <line x1="12" y1="8" x2="12" y2="12"/>
               <line x1="12" y1="16" x2="12.01" y2="16"/>
             </svg>`,
    },
    warning: {
      color:  '#fbbf24',
      glow:   'rgba(251,191,36,0.35)',
      border: 'rgba(251,191,36,0.28)',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
               <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
               <line x1="12" y1="9" x2="12" y2="13"/>
               <line x1="12" y1="17" x2="12.01" y2="17"/>
             </svg>`,
    },
    info: {
      color:  '#60aaff',
      glow:   'rgba(58,140,255,0.35)',
      border: 'rgba(58,140,255,0.28)',
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
               <circle cx="12" cy="12" r="10"/>
               <line x1="12" y1="16" x2="12" y2="12"/>
               <line x1="12" y1="8" x2="12.01" y2="8"/>
             </svg>`,
    },
  };

  // ── CSS injetado uma única vez ───────────────────────────────────────────
  const CSS = `
    #${CONTAINER_ID} {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      max-width: 360px;
      width: calc(100vw - 32px);
    }

    .gt-toast {
      pointer-events: all;
      position: relative;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 40px 12px 14px;
      border-radius: 14px;
      background: rgba(6, 11, 26, 0.97);
      border: 1px solid var(--gt-border);
      box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.6),
        0 0 24px var(--gt-glow),
        0 0 0 1px rgba(255, 255, 255, 0.03),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      overflow: hidden;
      cursor: default;
      animation: gt-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      transition: transform 0.18s ease, opacity 0.18s ease, box-shadow 0.18s ease;
      will-change: transform, opacity;
    }

    .gt-toast:hover {
      transform: translateX(-4px);
      box-shadow:
        0 12px 40px rgba(0, 0, 0, 0.7),
        0 0 32px var(--gt-glow),
        0 0 0 1px rgba(255, 255, 255, 0.04),
        inset 0 1px 0 rgba(255, 255, 255, 0.06);
    }

    .gt-toast.gt-exit {
      animation: gt-out 0.32s cubic-bezier(0.55, 0, 1, 0.45) both;
      pointer-events: none;
    }

    @keyframes gt-in {
      from {
        opacity: 0;
        transform: translateX(calc(100% + 20px)) scale(0.88);
      }
      to {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }

    @keyframes gt-out {
      from {
        opacity: 1;
        transform: translateX(0) scale(1);
        max-height: 120px;
        margin-bottom: 0;
      }
      to {
        opacity: 0;
        transform: translateX(calc(100% + 20px)) scale(0.88);
        max-height: 0;
        padding-top: 0;
        padding-bottom: 0;
        margin-bottom: 0;
      }
    }

    /* Ícone */
    .gt-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--gt-border);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--gt-color);
      box-shadow: 0 0 14px var(--gt-glow);
      margin-top: 1px;
    }

    /* Corpo */
    .gt-body {
      flex: 1;
      min-width: 0;
    }

    .gt-msg {
      font-size: 13.5px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
      line-height: 1.45;
      word-break: break-word;
    }

    /* Botão fechar */
    .gt-close {
      position: absolute;
      top: 10px;
      right: 10px;
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.25);
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s, background 0.15s;
      line-height: 1;
    }

    .gt-close:hover {
      color: rgba(255, 255, 255, 0.7);
      background: rgba(255, 255, 255, 0.07);
    }

    /* Barra de progresso */
    .gt-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: rgba(255, 255, 255, 0.04);
    }

    .gt-bar-fill {
      height: 100%;
      background: var(--gt-color);
      opacity: 0.55;
      width: 100%;
      transform-origin: left;
      animation: gt-progress linear forwards;
    }

    @keyframes gt-progress {
      from { width: 100%; }
      to   { width: 0%; }
    }

    /* Linha neon superior decorativa */
    .gt-toast::before {
      content: '';
      position: absolute;
      top: 0;
      left: 16px;
      right: 16px;
      height: 1px;
      background: linear-gradient(
        90deg,
        transparent,
        var(--gt-color),
        transparent
      );
      opacity: 0.5;
    }

    /* ── Mobile ──────────────────────────────────────────────── */
    @media (max-width: 600px) {
      #${CONTAINER_ID} {
        top: 12px;
        right: 0;
        left: 0;
        width: 100%;
        max-width: 100%;
        padding: 0 12px;
        align-items: stretch;
      }

      .gt-toast {
        border-radius: 12px;
        padding: 12px 38px 10px 12px;
      }
    }
  `;

  // ── Inicialização ────────────────────────────────────────────────────────

  let _container = null;

  function _injectStyles() {
    if (document.getElementById('gt-styles')) return;
    const style = document.createElement('style');
    style.id = 'gt-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function _ensureContainer() {
    if (_container && document.contains(_container)) return _container;
    _container = document.getElementById(CONTAINER_ID);
    if (!_container) {
      _container = document.createElement('div');
      _container.id = CONTAINER_ID;
      _container.setAttribute('aria-live', 'polite');
      _container.setAttribute('aria-label', 'Notificações');
      document.body.appendChild(_container);
    }
    return _container;
  }

  // ── Dismiss ──────────────────────────────────────────────────────────────

  function _dismiss(toast) {
    if (toast._dismissed) return;
    toast._dismissed = true;
    clearTimeout(toast._timer);
    toast.classList.add('gt-exit');
    // Remove após animação; fallback em 400ms caso animação não dispare
    const remove = () => { if (toast.parentNode) toast.remove(); };
    toast.addEventListener('animationend', remove, { once: true });
    setTimeout(remove, 400);
  }

  // ── Criação do toast ─────────────────────────────────────────────────────

  /**
   * Exibe um toast global.
   * @param {string} message  — Texto da mensagem
   * @param {string} type     — 'success' | 'error' | 'warning' | 'info'
   */
  function showToast(message, type) {
    _injectStyles();
    const container = _ensureContainer();

    // Garante tipo válido
    const cfg = TOAST_TYPES[type] || TOAST_TYPES.info;

    // Limita toasts visíveis: remove o mais antigo se exceder
    const existing = container.querySelectorAll('.gt-toast:not(.gt-exit)');
    if (existing.length >= MAX_VISIBLE) {
      _dismiss(existing[0]);
    }

    // Cria elemento
    const toast = document.createElement('div');
    toast.className = 'gt-toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-atomic', 'true');
    toast.style.setProperty('--gt-color',  cfg.color);
    toast.style.setProperty('--gt-glow',   cfg.glow);
    toast.style.setProperty('--gt-border', cfg.border);

    toast.innerHTML = `
      <div class="gt-icon">${cfg.icon}</div>
      <div class="gt-body">
        <div class="gt-msg">${_escapeHtml(message)}</div>
      </div>
      <button class="gt-close" aria-label="Fechar notificação">
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none"
             stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <line x1="1" y1="1" x2="13" y2="13"/>
          <line x1="13" y1="1" x2="1"  y2="13"/>
        </svg>
      </button>
      <div class="gt-bar">
        <div class="gt-bar-fill" style="animation-duration:${DURATION_MS}ms"></div>
      </div>
    `;

    // Botão fechar
    toast.querySelector('.gt-close').addEventListener('click', (e) => {
      e.stopPropagation();
      _dismiss(toast);
    });

    // Auto close
    toast._timer = setTimeout(() => _dismiss(toast), DURATION_MS);

    container.appendChild(toast);
    return toast; // retorna referência caso quem chamou queira fechar antes
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
  //   window.showToast(message, type)
  //   showToast(message, type)        ← funciona diretamente
  //
  window.showToast = showToast;

  // Namespace alternativo, caso prefira:
  //   Toast.show(message, type)
  window.Toast = { show: showToast };

})();
