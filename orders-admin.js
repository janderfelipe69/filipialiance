// ============================================================
// orders-admin.js — Ações Administrativas
// PokeAlliance Shop — Sistema de Rastreamento de Pedidos
//
// MUDANÇA IMPORTANTE:
//   A verificação de admin agora usa EXCLUSIVAMENTE o campo
//   `role` vindo de public.users (banco de dados).
//   Não há mais ADMIN_NICKNAMES hardcoded — isso era inseguro.
//
// Para promover alguém a admin, execute no SQL Editor do Supabase:
//   UPDATE users SET role = 'admin' WHERE email = 'email@exemplo.com';
// ============================================================

const OrdersAdmin = (() => {

  // ── Verificação de Permissão ──────────────────────────────────────────────
  // Role vem EXCLUSIVAMENTE do banco via Session.getCurrentUser().
  // Não há mais lista de nicknames hardcoded — foi removida por segurança.

  function isAdmin(user) {
    if (!user) return false;
    // A role 'admin' vem APENAS do campo public.users.role no banco de dados.
    // Nunca confiar em role do localStorage, frontend ou parâmetro de URL.
    return user.role === 'admin';
  }

  function isCurrentUserAdmin() {
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    return isAdmin(user);
  }

  // ── Painel Inline de Admin ────────────────────────────────────────────────

  /**
   * Gera o HTML do painel de controles admin inserido inline no card.
   */
  function renderAdminPanel(order) {
    const cfg = OrdersProgress.STATUS_CONFIG;
    const allStatuses = Object.entries(cfg).map(([key, val]) => `
      <button class="oa-status-opt ${order.status === key ? 'active' : ''}"
              data-status="${key}"
              style="--s-color:${val.color}; --s-bg:${val.bg}; --s-border:${val.border};"
              onclick="OrdersAdmin.setStatus('${order.id}', '${key}')">
        <span class="oa-status-dot"></span>
        ${val.icon} ${val.label}
      </button>
    `).join('');

    const itemRows = (order.items || []).map(item => {
      const pct = OrdersProgress.calcItemProgress(item);
      return `
        <div class="oa-item-row" data-item-id="${item.id}">
          <span class="oa-item-name">${item.name}</span>
          <div class="oa-item-controls">
            <input
              type="number"
              class="oa-item-qty-input"
              min="0"
              max="${item.qtdTotal}"
              value="${item.qtdEntregue}"
              aria-label="Entregues de ${item.name}"
              onchange="OrdersAdmin.updateItemQty('${order.id}', '${item.id}', this.value)"
            />
            <span class="oa-item-total">/ ${item.qtdTotal}</span>
            <div class="oa-item-mini-bar">
              <div class="oa-item-mini-fill" style="width:${pct}%; background:${OrdersProgress.progressBarColor(pct)}"></div>
            </div>
            ${item.concluido ? '<span class="oa-item-check">✓</span>' : ''}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="oa-panel" id="oa-panel-${order.id}">
        <div class="oa-panel-header">
          <span class="oa-panel-title">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
            Controles Admin
          </span>
        </div>

        <div class="oa-section">
          <div class="oa-section-label">Status</div>
          <div class="oa-status-grid">${allStatuses}</div>
        </div>

        ${order.items && order.items.length ? `
        <div class="oa-section">
          <div class="oa-section-label">Progresso dos Itens</div>
          <div class="oa-items-list">${itemRows}</div>
        </div>
        ` : ''}

        <div class="oa-section">
          <div class="oa-section-label">Observação</div>
          <textarea class="oa-obs-input" placeholder="Adicione uma observação..."
                    maxlength="300"
                    onblur="OrdersAdmin.saveObservation('${order.id}', this.value)"
          >${order.observations || ''}</textarea>
        </div>

        <div class="oa-actions">
          <button class="oa-btn oa-btn--complete" onclick="OrdersAdmin.completeOrder('${order.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Concluir
          </button>
          <button class="oa-btn oa-btn--cancel" onclick="OrdersAdmin.cancelOrder('${order.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Cancelar
          </button>
          <button class="oa-btn oa-btn--delete" onclick="OrdersAdmin.deleteOrder('${order.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
            Excluir
          </button>
        </div>
      </div>
    `;
  }

  // ── Ações Admin ───────────────────────────────────────────────────────────

  function setStatus(orderId, status) {
    if (!isCurrentUserAdmin()) {
      console.warn('[OrdersAdmin] ⛔ Acesso negado: usuário não é admin.');
      return;
    }
    const admin = Session.getCurrentUser();
    const result = OrdersStorage.updateStatus(orderId, status, admin.nickname);
    if (result.success) {
      OrdersNotifications.notifyStatusChange(result.order, status);
      if (typeof OrdersUI !== 'undefined') OrdersUI.refresh();
    }
  }

  function updateItemQty(orderId, itemId, rawQty) {
    if (!isCurrentUserAdmin()) return;
    const qty = parseInt(rawQty, 10);
    if (isNaN(qty)) return;
    const admin = Session.getCurrentUser();
    const result = OrdersStorage.updateItemProgress(orderId, itemId, qty, admin.nickname);
    if (result.success) {
      if (typeof OrdersUI !== 'undefined') OrdersUI.refresh();
    }
  }

  function saveObservation(orderId, text) {
    if (!isCurrentUserAdmin()) return;
    const admin = Session.getCurrentUser();
    OrdersStorage.addObservation(orderId, text, admin.nickname);
  }

  function completeOrder(orderId) {
    if (!isCurrentUserAdmin()) return;
    const order = OrdersStorage.getOrderById(orderId);
    if (!order) return;

    const admin = Session.getCurrentUser();
    const result = OrdersStorage.updateStatus(orderId, 'concluido', admin.nickname);
    if (result.success) {
      result.order.items.forEach(item => {
        OrdersStorage.updateItemProgress(orderId, item.id, item.qtdTotal, admin.nickname);
      });
      OrdersNotifications.show(`Pedido ${OrdersProgress.formatOrderNumber(order.orderNumber)} concluído!`, 'concluido');
      if (typeof OrdersUI !== 'undefined') OrdersUI.refresh();
    }
  }

  function cancelOrder(orderId) {
    if (!isCurrentUserAdmin()) return;
    const order = OrdersStorage.getOrderById(orderId);
    if (!order) return;

    if (!confirm(`Cancelar pedido ${OrdersProgress.formatOrderNumber(order.orderNumber)} de ${order.nickname}?`)) return;

    const admin = Session.getCurrentUser();
    const result = OrdersStorage.updateStatus(orderId, 'cancelado', admin.nickname);
    if (result.success) {
      OrdersNotifications.show(`Pedido ${OrdersProgress.formatOrderNumber(order.orderNumber)} cancelado.`, 'cancelado');
      if (typeof OrdersUI !== 'undefined') OrdersUI.refresh();
    }
  }

  function deleteOrder(orderId) {
    if (!isCurrentUserAdmin()) return;
    const order = OrdersStorage.getOrderById(orderId);
    if (!order) return;

    if (!confirm(`Excluir PERMANENTEMENTE o pedido ${OrdersProgress.formatOrderNumber(order.orderNumber)}? Esta ação não pode ser desfeita.`)) return;

    OrdersStorage.deleteOrder(orderId);
    OrdersNotifications.show('Pedido excluído.', 'info');
    if (typeof OrdersUI !== 'undefined') OrdersUI.refresh();
  }

  // ── Estilos do Painel Admin ───────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('orders-admin-styles')) return;
    const style = document.createElement('style');
    style.id = 'orders-admin-styles';
    style.textContent = `
      /* ── Admin Panel ── */
      .oa-panel {
        margin-top: 14px;
        border-radius: 12px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,215,100,0.15);
        padding: 14px;
        animation: oa-expand 0.25s cubic-bezier(0.4,0,0.2,1) both;
        box-shadow: 0 0 20px rgba(255,200,50,0.05) inset;
      }
      @keyframes oa-expand {
        from { opacity: 0; transform: translateY(-8px) scale(0.98); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }

      .oa-panel-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 14px;
        padding-bottom: 10px;
        border-bottom: 1px solid rgba(255,215,100,0.1);
      }
      .oa-panel-title {
        font-family: var(--font-title, 'Cinzel', serif);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: rgba(255,215,100,0.7);
        display: flex;
        align-items: center;
        gap: 5px;
      }

      .oa-section { margin-bottom: 14px; }
      .oa-section-label {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        color: rgba(255,255,255,0.3);
        margin-bottom: 8px;
        font-family: var(--font-mono, monospace);
      }

      .oa-status-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 6px;
      }
      .oa-status-opt {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 10px;
        border-radius: 8px;
        background: var(--s-bg, rgba(255,255,255,0.05));
        border: 1px solid var(--s-border, rgba(255,255,255,0.08));
        color: rgba(255,255,255,0.6);
        font-size: 12px;
        font-family: var(--font-body, sans-serif);
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
      }
      .oa-status-opt:hover, .oa-status-opt.active {
        background: var(--s-bg, rgba(255,255,255,0.05));
        border-color: var(--s-color, #fff);
        color: var(--s-color, #fff);
        box-shadow: 0 0 10px color-mix(in srgb, var(--s-color, transparent) 30%, transparent);
      }
      .oa-status-dot {
        width: 7px; height: 7px;
        border-radius: 50%;
        background: var(--s-color, #fff);
        flex-shrink: 0;
        box-shadow: 0 0 6px var(--s-color, transparent);
      }

      .oa-items-list { display: flex; flex-direction: column; gap: 8px; }
      .oa-item-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
      }
      .oa-item-name {
        font-family: var(--font-body, sans-serif);
        font-size: 12px;
        color: rgba(255,255,255,0.7);
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .oa-item-controls {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .oa-item-qty-input {
        width: 44px;
        height: 26px;
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 6px;
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        text-align: center;
        padding: 0 4px;
        font-family: var(--font-mono, monospace);
        outline: none;
        transition: border-color 0.2s;
      }
      .oa-item-qty-input:focus { border-color: rgba(96,170,255,0.5); }
      .oa-item-total { font-size: 11px; color: rgba(255,255,255,0.3); font-family: var(--font-mono, monospace); }

      .oa-item-mini-bar {
        width: 40px;
        height: 4px;
        border-radius: 2px;
        background: rgba(255,255,255,0.07);
        overflow: hidden;
      }
      .oa-item-mini-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.4s ease;
      }
      .oa-item-check {
        color: #4ade80;
        font-size: 12px;
        font-weight: 700;
        animation: check-pop 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
      }
      @keyframes check-pop {
        from { transform: scale(0) rotate(-30deg); opacity: 0; }
        to   { transform: scale(1) rotate(0); opacity: 1; }
      }

      .oa-obs-input {
        width: 100%;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 8px;
        color: rgba(255,255,255,0.75);
        font-size: 12px;
        font-family: var(--font-body, sans-serif);
        padding: 9px 12px;
        resize: vertical;
        min-height: 60px;
        max-height: 120px;
        outline: none;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      .oa-obs-input:focus { border-color: rgba(96,170,255,0.4); }
      .oa-obs-input::placeholder { color: rgba(255,255,255,0.2); }

      .oa-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 4px;
      }
      .oa-btn {
        flex: 1;
        min-width: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid transparent;
        cursor: pointer;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        font-family: var(--font-body, sans-serif);
        transition: all 0.2s;
      }
      .oa-btn--complete {
        background: rgba(34,197,94,0.1);
        border-color: rgba(34,197,94,0.3);
        color: #4ade80;
      }
      .oa-btn--complete:hover { background: rgba(34,197,94,0.2); box-shadow: 0 0 12px rgba(34,197,94,0.3); }
      .oa-btn--cancel {
        background: rgba(245,197,66,0.08);
        border-color: rgba(245,197,66,0.2);
        color: #ffd166;
      }
      .oa-btn--cancel:hover { background: rgba(245,197,66,0.15); box-shadow: 0 0 12px rgba(245,197,66,0.2); }
      .oa-btn--delete {
        background: rgba(239,68,68,0.08);
        border-color: rgba(239,68,68,0.2);
        color: #f87171;
      }
      .oa-btn--delete:hover { background: rgba(239,68,68,0.15); box-shadow: 0 0 12px rgba(239,68,68,0.25); }

      .order-card-admin-toggle {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 5px 10px;
        border-radius: 7px;
        background: rgba(255,215,100,0.07);
        border: 1px solid rgba(255,215,100,0.15);
        color: rgba(255,215,100,0.7);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        cursor: pointer;
        transition: all 0.2s;
        font-family: var(--font-body, sans-serif);
      }
      .order-card-admin-toggle:hover {
        background: rgba(255,215,100,0.12);
        color: #ffd166;
        border-color: rgba(255,215,100,0.3);
      }
      .order-card-admin-toggle.active {
        background: rgba(255,215,100,0.12);
        color: #ffd166;
        border-color: rgba(255,215,100,0.35);
      }

      /* Badge de role no dropdown do header */
      .auth-dropdown-role-badge {
        display: inline-block;
        margin-top: 4px;
        padding: 2px 8px;
        border-radius: 4px;
        background: rgba(255,215,100,0.12);
        border: 1px solid rgba(255,215,100,0.25);
        color: #ffd166;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }

      @media (max-width: 480px) {
        .oa-status-grid { grid-template-columns: 1fr 1fr; }
        .oa-item-row { flex-direction: column; align-items: flex-start; }
        .oa-item-controls { width: 100%; }
        .oa-item-name { font-size: 11px; }
      }
    `;
    document.head.appendChild(style);
  }

  return {
    isAdmin,
    isCurrentUserAdmin,
    renderAdminPanel,
    setStatus,
    updateItemQty,
    saveObservation,
    completeOrder,
    cancelOrder,
    deleteOrder,
    injectStyles,
  };
})();
