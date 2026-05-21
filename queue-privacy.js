// ============================================================
// queue-privacy.js — v1 — PRIVACIDADE DA FILA DE PEDIDOS
// PokeAlliance Shop
//
// OBJETIVO:
//   Usuários comuns NÃO veem nicknames de outros clientes.
//   Admins continuam vendo tudo normalmente.
//
// REGRAS:
//   - admin           → nick real sempre
//   - próprio pedido  → "VOCÊ" (badge destacado)
//   - outro usuário   → "Treinador" (anônimo)
//
// INTEGRAÇÃO:
//   Chamado por orders-ui.js, orders-kanban.js e delivery-system.js.
//   Exporta QueuePrivacy.maskNick(nick, orderId, userId, currentUser)
//
// LOGS:
//   [QueuePrivacy] admin detectado
//   [QueuePrivacy] pedido do próprio usuário
//   [QueuePrivacy] ocultando nick
// ============================================================

const QueuePrivacy = (() => {
  'use strict';

  // Nomes genéricos rotativos para anonimização — adiciona variedade visual
  // sem revelar identidade. O índice é derivado do início do ID (determinístico).
  const ANON_LABELS = [
    'Treinador',
    'Treinador',
    'Cliente',
    'Treinador',
    'Aventureiro',
    'Treinador',
    'Treinador',
    'Cliente',
  ];

  /**
   * Retorna um label anônimo determinístico baseado no ID do pedido.
   * Mesmo pedido sempre recebe o mesmo label — sem flickering.
   */
  function _anonLabel(orderId) {
    if (!orderId) return 'Treinador';
    // Soma dos char codes do id → índice estável
    const sum = String(orderId).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return ANON_LABELS[sum % ANON_LABELS.length];
  }

  /**
   * Detecta se o usuário atual é admin.
   * Usa Session.isAdmin() se disponível; fallback para role direto.
   */
  function _isAdmin(currentUser) {
    if (typeof Session !== 'undefined' && typeof Session.isAdmin === 'function') {
      return Session.isAdmin();
    }
    return currentUser?.role === 'admin';
  }

  /**
   * Detecta se o pedido pertence ao usuário logado.
   * Compara por userId (UUID) e, como fallback, por nickname.
   */
  function _isOwner(order, currentUser) {
    if (!currentUser || !order) return false;
    if (order.userId && currentUser.id && order.userId === currentUser.id) return true;
    if (order.user_id && currentUser.id && order.user_id === currentUser.id) return true;
    // fallback por nickname (compatibilidade com pedidos legados sem userId)
    if (order.nickname && currentUser.nickname && order.nickname === currentUser.nickname) return true;
    return false;
  }

  /**
   * maskNick — função principal.
   *
   * @param {object} order       — objeto do pedido (deve ter .nickname, .userId)
   * @param {object} currentUser — usuário logado (pode ser null)
   * @returns {{ label: string, isOwner: boolean, isAdmin: boolean, masked: boolean }}
   */
  function maskNick(order, currentUser) {
    const admin = _isAdmin(currentUser);
    const owner = _isOwner(order, currentUser);
    const realNick = order.nickname || order.nick_jogo || order.cliente_nick || '—';

    if (admin) {
      console.log('[QueuePrivacy] admin detectado — exibindo nick real:', realNick);
      return { label: realNick, isOwner: owner, isAdmin: true, masked: false };
    }

    if (owner) {
      console.log('[QueuePrivacy] pedido do próprio usuário — exibindo VOCÊ');
      return { label: realNick, isOwner: true, isAdmin: false, masked: false };
    }

    // Usuário comum vendo pedido de terceiro
    const anon = _anonLabel(order.id || order.orderNumber);
    console.log('[QueuePrivacy] ocultando nick:', realNick, '→', anon);
    return { label: anon, isOwner: false, isAdmin: false, masked: true };
  }

  /**
   * maskNickSimple — versão que retorna apenas a string do label.
   * Para uso rápido onde não precisa de metadados.
   */
  function maskNickSimple(order, currentUser) {
    return maskNick(order, currentUser).label;
  }

  /**
   * buildNickHTML — gera o HTML completo do nick com badge "VOCÊ" se necessário.
   * Usado diretamente nos templates de card.
   *
   * @param {object} order
   * @param {object} currentUser
   * @param {object} [opts]
   * @param {boolean} [opts.showYouBadge=true]   — exibe badge "você"
   * @param {boolean} [opts.showIcon=true]        — exibe ícone de usuário
   * @returns {string} HTML pronto para inserir
   */
  function buildNickHTML(order, currentUser, opts = {}) {
    const { label, isOwner, isAdmin, masked } = maskNick(order, currentUser);
    const showYouBadge = opts.showYouBadge !== false;
    const showIcon     = opts.showIcon     !== false;

    const iconSVG = showIcon
      ? `<svg class="qp-nick-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`
      : '';

    // Badge "VOCÊ" — só para o próprio usuário
    const youBadge = (isOwner && showYouBadge)
      ? `<span class="qp-you-badge">você</span>`
      : '';

    // Badge admin (ícone discreto para indicar que está vendo nick real de terceiro)
    const adminBadge = (isAdmin && !isOwner)
      ? `<span class="qp-admin-badge" title="Visível apenas para admins">👁</span>`
      : '';

    // Classe CSS extra para nicks mascarados (estilo diferenciado)
    const maskedClass = masked ? ' qp-nick--masked' : '';

    const escLabel = _esc(label);

    return `<span class="qp-nick${maskedClass}">${iconSVG}${escLabel}${youBadge}${adminBadge}</span>`;
  }

  /**
   * buildYouBadge — retorna só o badge "você" se for owner.
   * Para casos onde o nick já está sendo exibido separadamente.
   */
  function buildYouBadge(order, currentUser) {
    const { isOwner } = maskNick(order, currentUser);
    return isOwner ? `<span class="qp-you-badge">você</span>` : '';
  }

  /**
   * shouldShowNick — retorna true se o nick real deve ser exibido.
   * Atalho para condicionais simples.
   */
  function shouldShowNick(order, currentUser) {
    const r = maskNick(order, currentUser);
    return r.isAdmin || r.isOwner;
  }

  /**
   * filterSearchByPrivacy — filtra a busca por nick respeitando privacidade.
   * Usuário comum só pode buscar pelo próprio nick; admin busca qualquer um.
   */
  function canSearchByNick(query, order, currentUser) {
    if (!query) return true;
    const admin = _isAdmin(currentUser);
    if (admin) return true; // admin pode buscar qualquer nick

    // Usuário comum só pode "achar" o próprio pedido por nick
    const owner = _isOwner(order, currentUser);
    return owner;
  }

  // ── Injeção de estilos ──────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('qp-styles')) return;
    const s = document.createElement('style');
    s.id = 'qp-styles';
    s.textContent = `
/* ══════════════════════════════════════════════
   QueuePrivacy — estilos de nick
   ══════════════════════════════════════════════ */

/* Container genérico do nick */
.qp-nick {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.75);
  white-space: nowrap;
}

.qp-nick-icon {
  flex-shrink: 0;
  opacity: 0.6;
}

/* Nick mascarado (usuário anônimo) — tom levemente diferente */
.qp-nick--masked {
  color: rgba(255,255,255,0.38);
  font-style: italic;
  font-weight: 500;
}
.qp-nick--masked .qp-nick-icon {
  opacity: 0.3;
}

/* Badge "VOCÊ" — destaque azul */
.qp-you-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(96,170,255,0.15);
  border: 1px solid rgba(96,170,255,0.25);
  color: #60aaff;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  font-style: normal;
}

/* Badge admin 👁 — discreto */
.qp-admin-badge {
  font-size: 10px;
  opacity: 0.45;
  cursor: default;
  font-style: normal;
}

/* Compatibilidade: substitui .order-card-you-badge e .kb-you-badge */
.order-card-you-badge,
.kb-you-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(96,170,255,0.15);
  border: 1px solid rgba(96,170,255,0.25);
  color: #60aaff;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}
    `;
    document.head.appendChild(s);
  }

  // ── Utilitário interno ──────────────────────────────────────────────────
  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Auto-injeção de estilos quando o módulo carrega
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles);
  } else {
    injectStyles();
  }

  // ── API Pública ─────────────────────────────────────────────────────────
  return {
    maskNick,
    maskNickSimple,
    buildNickHTML,
    buildYouBadge,
    shouldShowNick,
    canSearchByNick,
    injectStyles,
  };
})();
