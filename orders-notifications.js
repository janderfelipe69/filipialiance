// ============================================================
// orders-notifications.js — Sistema de Notificações
// PokeAlliance Shop — Sistema de Rastreamento de Pedidos
// ============================================================

const OrdersNotifications = (() => {
  let _container = null;
  let _queue = [];
  let _isProcessing = false;
  let _bellBadge = null;

  // ── Inicialização ──────────────────────────────────────────────────────

  function init() {
    _ensureContainer();
    _renderBell();
    _refreshBell();

    // Observa mudanças de sessão para atualizar badge
    if (typeof Session !== 'undefined') {
      Session.onAuthChange((event) => {
        _refreshBell();
      });
    }
  }

  function _ensureContainer() {
    if (document.getElementById('orders-notif-container')) {
      _container = document.getElementById('orders-notif-container');
      return;
    }
    _container = document.createElement('div');
    _container.id = 'orders-notif-container';
    _container.setAttribute('aria-live', 'polite');
    _container.setAttribute('aria-label', 'Notificações');
    document.body.appendChild(_container);

    // Estilos do container e notificações
    if (!document.getElementById('orders-notif-styles')) {
      const style = document.createElement('style');
      style.id = 'orders-notif-styles';
      style.textContent = `
        #orders-notif-container {
          position: fixed;
          bottom: 24px;
          right: 20px;
          z-index: 99999;
          display: flex;
          flex-direction: column-reverse;
          gap: 10px;
          pointer-events: none;
          max-width: 340px;
          width: calc(100vw - 32px);
        }

        .orders-notif {
          pointer-events: all;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 14px;
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          background: rgba(10, 14, 30, 0.92);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04);
          animation: notif-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          cursor: pointer;
          transition: transform 0.15s ease, opacity 0.15s ease;
          will-change: transform, opacity;
          max-width: 340px;
        }
        .orders-notif:hover {
          transform: translateX(-4px);
        }
        .orders-notif.notif-exit {
          animation: notif-out 0.3s cubic-bezier(0.55, 0, 1, 0.45) both;
        }

        @keyframes notif-in {
          from { opacity: 0; transform: translateX(120%) scale(0.9); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes notif-out {
          from { opacity: 1; transform: translateX(0) scale(1); max-height: 200px; }
          to   { opacity: 0; transform: translateX(120%) scale(0.85); max-height: 0; padding: 0; margin: 0; }
        }

        .orders-notif-icon {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .orders-notif-body {
          flex: 1;
          min-width: 0;
        }
        .orders-notif-title {
          font-family: var(--font-title, 'Cinzel', serif);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          margin-bottom: 3px;
          opacity: 0.7;
        }
        .orders-notif-msg {
          font-family: var(--font-body, 'Rajdhani', sans-serif);
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.9);
          line-height: 1.4;
          word-break: break-word;
        }
        .orders-notif-time {
          font-size: 10px;
          color: rgba(255,255,255,0.3);
          margin-top: 4px;
          font-family: var(--font-mono, monospace);
        }

        .orders-notif-close {
          background: none;
          border: none;
          color: rgba(255,255,255,0.3);
          cursor: pointer;
          padding: 2px;
          font-size: 12px;
          line-height: 1;
          flex-shrink: 0;
          transition: color 0.15s;
        }
        .orders-notif-close:hover { color: rgba(255,255,255,0.7); }

        /* Tipo: pendente */
        .orders-notif--pendente .orders-notif-icon { background: rgba(245,197,66,0.15); color: #ffd166; box-shadow: 0 0 12px rgba(245,197,66,0.3); }
        .orders-notif--pendente .orders-notif-title { color: #ffd166; }
        .orders-notif--pendente { border-color: rgba(245,197,66,0.2); }

        /* Tipo: em_andamento */
        .orders-notif--em_andamento .orders-notif-icon { background: rgba(58,140,255,0.15); color: #60aaff; box-shadow: 0 0 12px rgba(58,140,255,0.3); }
        .orders-notif--em_andamento .orders-notif-title { color: #60aaff; }
        .orders-notif--em_andamento { border-color: rgba(58,140,255,0.2); }

        /* Tipo: parcial / item_progress */
        .orders-notif--parcial .orders-notif-icon,
        .orders-notif--item_progress .orders-notif-icon { background: rgba(168,85,247,0.15); color: #c084fc; box-shadow: 0 0 12px rgba(168,85,247,0.3); }
        .orders-notif--parcial .orders-notif-title,
        .orders-notif--item_progress .orders-notif-title { color: #c084fc; }
        .orders-notif--parcial,
        .orders-notif--item_progress { border-color: rgba(168,85,247,0.2); }

        /* Tipo: concluido / item_done */
        .orders-notif--concluido .orders-notif-icon,
        .orders-notif--item_done .orders-notif-icon { background: rgba(34,197,94,0.15); color: #4ade80; box-shadow: 0 0 12px rgba(34,197,94,0.3); }
        .orders-notif--concluido .orders-notif-title,
        .orders-notif--item_done .orders-notif-title { color: #4ade80; }
        .orders-notif--concluido,
        .orders-notif--item_done { border-color: rgba(34,197,94,0.2); }

        /* Tipo: cancelado */
        .orders-notif--cancelado .orders-notif-icon { background: rgba(239,68,68,0.15); color: #f87171; box-shadow: 0 0 12px rgba(239,68,68,0.3); }
        .orders-notif--cancelado .orders-notif-title { color: #f87171; }
        .orders-notif--cancelado { border-color: rgba(239,68,68,0.2); }

        /* Bell badge */
        .orders-bell-btn {
          position: relative;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 9px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: rgba(255,255,255,0.5);
          transition: all 0.2s;
        }
        .orders-bell-btn:hover { background: rgba(58,140,255,0.15); color: #60aaff; border-color: rgba(58,140,255,0.3); }
        .orders-bell-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 16px;
          height: 16px;
          border-radius: 8px;
          background: #ef4444;
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          font-family: var(--font-mono, monospace);
          border: 2px solid var(--bg-main, #060a14);
          animation: badge-pulse 2s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes badge-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }

        @media (max-width: 480px) {
          #orders-notif-container { bottom: 16px; right: 12px; max-width: calc(100vw - 24px); }
          .orders-notif { padding: 12px 14px; }
          .orders-notif-msg { font-size: 12px; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // ── Bell (sino de notificações) ────────────────────────────────────────

  function _renderBell() {
    // Injeta botão no topbar de pedidos se existir
    const topbarRight = document.querySelector('.pedidos-topbar-right');
    if (topbarRight && !document.getElementById('orders-bell-btn')) {
      const bell = document.createElement('button');
      bell.id = 'orders-bell-btn';
      bell.className = 'orders-bell-btn pedidos-refresh-btn';
      bell.title = 'Notificações';
      bell.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      `;
      bell.onclick = _openNotifPanel;
      topbarRight.insertBefore(bell, topbarRight.firstChild);
      _bellBadge = null;
    }
  }

  function _refreshBell() {
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) return;

    const count = typeof OrdersStorage !== 'undefined' ? OrdersStorage.getUnreadCount(user.id) : 0;
    const bellBtn = document.getElementById('orders-bell-btn');
    if (!bellBtn) return;

    const existing = bellBtn.querySelector('.orders-bell-badge');
    if (count > 0) {
      if (existing) {
        existing.textContent = count > 99 ? '99+' : count;
      } else {
        const badge = document.createElement('span');
        badge.className = 'orders-bell-badge';
        badge.textContent = count > 99 ? '99+' : count;
        bellBtn.appendChild(badge);
      }
    } else {
      if (existing) existing.remove();
    }
  }

  function _openNotifPanel() {
    // Por ora abre a aba de pedidos e filtra "meus pedidos"
    if (typeof switchTab === 'function') {
      const btn = document.querySelector('.tab-btn--pedidos') || document.querySelector('[onclick*="pedidos"]');
      switchTab('pedidos', btn);
    }
    // Ativa filtro "meus pedidos"
    setTimeout(() => {
      const myBtn = document.getElementById('pedidos-my-filter');
      if (myBtn && !myBtn.classList.contains('active')) myBtn.click();
    }, 100);
  }

  // ── Exibição de Notificações ───────────────────────────────────────────

  const TYPE_CONFIG = {
    pendente:      { icon: '⏳', title: 'Pedido Pendente' },
    em_andamento:  { icon: '⚡', title: 'Em Andamento' },
    parcial:       { icon: '🔮', title: 'Entrega Parcial' },
    concluido:     { icon: '✅', title: 'Pedido Concluído' },
    cancelado:     { icon: '✕', title: 'Cancelado' },
    item_progress: { icon: '📦', title: 'Progresso Atualizado' },
    item_done:     { icon: '✓', title: 'Item Entregue' },
    info:          { icon: 'ℹ', title: 'Informação' },
  };

  /**
   * Exibe uma notificação toast.
   * @param {string} msg - Mensagem principal
   * @param {string} [type] - Tipo (pendente | em_andamento | parcial | concluido | cancelado | item_progress | item_done | info)
   * @param {number} [duration] - Duração em ms (padrão 5000)
   */
  function show(msg, type, duration) {
    _ensureContainer();
    type = type || 'info';
    duration = duration || 5000;

    const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info;
    const el = document.createElement('div');
    el.className = `orders-notif orders-notif--${type}`;
    el.setAttribute('role', 'alert');
    el.innerHTML = `
      <div class="orders-notif-icon">${cfg.icon}</div>
      <div class="orders-notif-body">
        <div class="orders-notif-title">${cfg.title}</div>
        <div class="orders-notif-msg">${msg}</div>
        <div class="orders-notif-time">${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
      <button class="orders-notif-close" aria-label="Fechar">✕</button>
    `;

    el.querySelector('.orders-notif-close').onclick = (e) => {
      e.stopPropagation();
      _dismiss(el);
    };
    el.onclick = () => {
      if (typeof switchTab === 'function') {
        const btn = document.querySelector('.tab-btn--pedidos');
        switchTab('pedidos', btn);
      }
      _dismiss(el);
    };

    _container.appendChild(el);

    // Auto-dismiss
    const timer = setTimeout(() => _dismiss(el), duration);
    el._dismissTimer = timer;

    _refreshBell();
  }

  function _dismiss(el) {
    if (!el || !el.parentNode) return;
    clearTimeout(el._dismissTimer);
    el.classList.add('notif-exit');
    el.addEventListener('animationend', () => el.remove(), { once: true });
    setTimeout(() => { if (el.parentNode) el.remove(); }, 400);
  }

  /**
   * Dispara notificações não lidas de um pedido para o usuário atual.
   */
  function flushUnreadNotifications(order) {
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user || order.userId !== user.id) return;

    const unread = order.notifications.filter(n => !n.read);
    if (!unread.length) return;

    // Mostra a mais recente apenas para não spam
    const latest = unread[unread.length - 1];
    show(latest.msg, latest.type || 'info');

    // Marca como lidas
    if (typeof OrdersStorage !== 'undefined') {
      OrdersStorage.markNotificationsRead(order.id, user.id);
    }
    _refreshBell();
  }

  /**
   * Notifica quando pedido muda de status (chamado pelo admin).
   */
  function notifyStatusChange(order, newStatus) {
    const cfg = OrdersProgress.getStatusConfig(newStatus);
    const num = OrdersProgress.formatOrderNumber(order.orderNumber);
    show(`Pedido ${num} agora está: ${cfg.label}`, newStatus);
    _refreshBell();
  }

  return {
    init,
    show,
    flushUnreadNotifications,
    notifyStatusChange,
    refreshBell: _refreshBell,
  };
})();
