// ============================================================
// orders-kanban.js — v1 — Painel Kanban Operacional
// PokeAlliance Shop
//
// ARQUITETURA:
//   Módulo completamente independente. Não substitui orders-ui.js.
//   Ativado por feature flag: window.PA_KANBAN_ENABLED = true
//   (setada em orders-ui.js somente para admins logados).
//
// DEPENDÊNCIAS (devem estar carregadas antes):
//   orders-storage.js, orders-progress.js, orders-admin.js, session.js
//
// DEPLOY SEGURO:
//   Remover o script tag = rollback instantâneo sem side effects.
//
// CONGELADO (não tocar):
//   auth, JWT, role, policies, trigger, signup, ETA/SLA
//
// COLUNAS:
//   waiting_queue | in_progress | completed | cancelled
//   Ordenação: created_at ASC (nunca ID do banco)
// ============================================================

const OrdersKanban = (() => {
  'use strict';

  // ── Estado interno ─────────────────────────────────────────────────────
  const _state = {
    search:       '',
    filterMine:   false,
    initialized:  false,
  };

  // ── Configuração das colunas ───────────────────────────────────────────
  const COLUMNS = [
    {
      key:       'waiting_queue',
      label:     'Waiting queue',
      color:     '#f5c542',
      colorDim:  'rgba(245,197,66,0.12)',
      colorBorder: 'rgba(245,197,66,0.3)',
    },
    {
      key:       'in_progress',
      label:     'In progress',
      color:     '#3a8cff',
      colorDim:  'rgba(58,140,255,0.12)',
      colorBorder: 'rgba(58,140,255,0.3)',
    },
    {
      key:       'completed',
      label:     'Completed',
      color:     '#22c55e',
      colorDim:  'rgba(34,197,94,0.12)',
      colorBorder: 'rgba(34,197,94,0.3)',
    },
    {
      key:       'cancelled',
      label:     'Cancelled',
      color:     '#ef4444',
      colorDim:  'rgba(239,68,68,0.1)',
      colorBorder: 'rgba(239,68,68,0.25)',
    },
  ];

  // ── Init ───────────────────────────────────────────────────────────────

  function init() {
    if (_state.initialized) return;
    _state.initialized = true;
    _injectStyles();
    _setupSearchSync();
    console.log('[OrdersKanban] ✅ Módulo inicializado.');
  }

  // ── Sincroniza busca com topbar existente ──────────────────────────────
  // Reutiliza o input de busca que já existe no HTML — sem criar elementos novos.

  function _setupSearchSync() {
    const input = document.getElementById('pedidos-search');
    if (input) {
      input.addEventListener('input', () => {
        _state.search = input.value;
        render();
      }, { passive: true });
    }
    const myBtn = document.getElementById('pedidos-my-filter');
    if (myBtn) {
      myBtn.addEventListener('click', () => {
        _state.filterMine = myBtn.classList.contains('active');
        render();
      }, { passive: true });
    }
  }

  // ── Render principal ───────────────────────────────────────────────────

  function render() {
    const container = document.getElementById('pedidos-kanban');
    if (!container) return;

    const user    = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    const isAdmin = typeof OrdersAdmin !== 'undefined' ? OrdersAdmin.isCurrentUserAdmin() : false;

    // Fonte de dados: OrdersStorage (já sincronizado pelo pedidos.js)
    const allOrders = typeof OrdersStorage !== 'undefined' ? OrdersStorage.getAllOrders() : [];

    // Fila ativa ordenada por created_at ASC — posição na fila
    const activeQueue = _getActiveQueue(allOrders);

    // Aplica filtros globais
    let filtered = _applyFilters(allOrders, user);

    // Badge de contagem na topbar
    const badge = document.getElementById('pedidos-count-badge');
    if (badge) {
      const queueCount = activeQueue.length;
      badge.textContent = queueCount + ' na fila';
    }

    // Renderiza cada coluna
    container.innerHTML = COLUMNS.map(col => {
      const orders = filtered
        .filter(o => OrdersProgress.normalizeStatus(o.status_v3 || o.status) === col.key)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      return _renderColumn(col, orders, user, isAdmin, activeQueue);
    }).join('');
  }

  // ── Filtros ────────────────────────────────────────────────────────────

  function _getActiveQueue(orders) {
    return orders
      .filter(o => {
        const s = OrdersProgress.normalizeStatus(o.status_v3 || o.status);
        return s === 'waiting_queue' || s === 'in_progress';
      })
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  function _applyFilters(orders, user) {
    let list = orders;

    if (_state.filterMine && user) {
      list = list.filter(o => o.userId === user.id);
    }

    if (_state.search.trim()) {
      const q = _state.search.trim().toLowerCase();
      list = list.filter(o =>
        (typeof QueuePrivacy !== 'undefined'
          ? QueuePrivacy.canSearchByNick(q, o, user)
          : (o.nickname || '').toLowerCase().includes(q)) ||
        String(o.orderNumber || '').includes(q)
      );
    }

    return list;
  }

  // ── Renderização de coluna ─────────────────────────────────────────────

  function _renderColumn(col, orders, user, isAdmin, activeQueue) {
    const cards = orders.map(o =>
      _renderCard(o, col, user, isAdmin, activeQueue)
    ).join('');

    const isEmpty = orders.length === 0;

    return `
      <div class="kb-column" data-status="${col.key}">
        <div class="kb-col-header" style="border-bottom: 2px solid ${col.colorBorder}">
          <span class="kb-col-title" style="color:${col.color}">${_esc(col.label)}</span>
          <span class="kb-col-count" style="background:${col.colorDim}; color:${col.color}">${orders.length}</span>
        </div>
        <div class="kb-col-body">
          ${isEmpty
            ? `<div class="kb-empty">nenhum pedido</div>`
            : cards
          }
        </div>
      </div>
    `;
  }

  // ── Renderização de card ───────────────────────────────────────────────

  function _renderCard(order, col, user, isAdmin, activeQueue) {
    const status    = OrdersProgress.normalizeStatus(order.status_v3 || order.status);
    const cfg       = OrdersProgress.getStatusConfig(status);
    const isOwner   = user && order.userId === user.id;
    const supabaseId = order._supabaseId || order.orderNumber;

    // Posição na fila (somente para ativos, por created_at ASC)
    const posIdx  = activeQueue.findIndex(o => o.id === order.id);
    const position = posIdx !== -1 ? posIdx + 1 : null;

    // Tempo aguardando
    const waitingTime = _formatWaiting(order.createdAt);

    // Data formatada
    const dateStr = _formatDate(order.createdAt);

    // Tipo e quantidade de serviço
    const serviceLabel = _serviceLabel(order.service_type, order.service_quantity);

    // SLA info (somente in_progress com started_at)
    let slaHTML = '';
    if (status === 'in_progress' && order.started_at && order.sla_min_days) {
      slaHTML = `<div class="kb-card-sla">
        SLA: ${order.sla_min_days}~${order.sla_max_days}d
        · início: ${_formatDate(order.started_at)}
      </div>`;
    }

    // Ações admin
    let actionsHTML = '';
    if (isAdmin) {
      if (status === 'waiting_queue') {
        actionsHTML = `
          <div class="kb-card-actions">
            <button class="kb-btn kb-btn--start"
                    onclick="OrdersAdmin.startService(${supabaseId})">
              ▶ Iniciar
            </button>
            <button class="kb-btn kb-btn--cancel"
                    onclick="OrdersAdmin.cancelOrder(${supabaseId})">
              ✕ Cancelar
            </button>
          </div>`;
      } else if (status === 'in_progress') {
        actionsHTML = `
          <div class="kb-card-actions">
            <button class="kb-btn kb-btn--complete"
                    onclick="OrdersAdmin.completeService(${supabaseId})">
              ✓ Concluir
            </button>
            <button class="kb-btn kb-btn--cancel"
                    onclick="OrdersAdmin.cancelOrder(${supabaseId})">
              ✕ Cancelar
            </button>
          </div>`;
      }
    }

    // Cancelar próprio pedido (usuário comum)
    let cancelOwnHTML = '';
    if (!isAdmin && isOwner && status === 'waiting_queue') {
      cancelOwnHTML = `
        <div class="kb-card-actions">
          <button class="kb-btn kb-btn--cancel"
                  onclick="OrdersUI._cancelOwnOrder('${_esc(order.id)}')">
            ✕ Cancelar meu pedido
          </button>
        </div>`;
    }

    // Badge "você" + privacidade do nick
    // QueuePrivacy mascara nicks de terceiros para usuários comuns
    const youBadge = isOwner
      ? `<span class="kb-you-badge">você</span>`
      : '';

    // Posição badge
    const posBadge = position !== null
      ? `<span class="kb-pos-badge" title="Posição na fila">#${position}</span>`
      : '';

    return `
      <div class="kb-card kb-card--${status}" style="--col-color:${col.color}">
        <div class="kb-card-header">
          <div class="kb-card-header-left">
            ${posBadge}
            ${typeof QueuePrivacy !== 'undefined'
              ? QueuePrivacy.buildNickHTML(order, user, { showIcon: false })
              : `<span class="kb-card-nick">${_esc(order.nickname)}</span>${youBadge}`
            }
          </div>
          <span class="kb-card-time" title="${dateStr}">${waitingTime}</span>
        </div>

        ${serviceLabel ? `<div class="kb-card-service">${_esc(serviceLabel)}</div>` : ''}

        ${slaHTML}

        ${actionsHTML}
        ${cancelOwnHTML}
      </div>
    `;
  }

  // ── Helpers de formatação ──────────────────────────────────────────────

  function _formatWaiting(iso) {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60)  return `há ${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `há ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `há ${days}d`;
  }

  function _formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function _serviceLabel(type, qty) {
    if (!type) return null;
    const labels = {
      normal_package: 'Pacote Normal',
      pokemon_sr:     'Pokémon SR',
    };
    const label = labels[type] || type;
    return qty && qty > 1 ? `${label} × ${qty}` : label;
  }

  function _esc(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Injeção de estilos ─────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('kb-styles')) return;
    const style = document.createElement('style');
    style.id = 'kb-styles';
    style.textContent = `
      /* Este CSS é importado de orders-kanban.css quando disponível.
         Este bloco inline é o fallback caso o CSS externo não carregue. */
    `;
    document.head.appendChild(style);
  }

  // ── API pública ────────────────────────────────────────────────────────

  return {
    init,
    render,
    refresh: render,
  };

})();
