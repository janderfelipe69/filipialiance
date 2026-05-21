// ============================================================
// orders-ui.js — Renderização da aba Pedidos
// PokeAlliance Shop — Sistema de Rastreamento de Pedidos
//
// MUDANÇA ARQUITETURAL v2 — FILA DE PROCESSAMENTO:
//   - A fila exibe SOMENTE pedidos ativos (pendente, em_andamento, parcial)
//   - Pedidos concluídos/cancelados são EXCLUÍDOS da fila principal
//   - A posição exibida (#1, #2...) é calculada dinamicamente,
//     sem usar o ID real do PostgreSQL
//   - ETA calculado apenas com base nos pedidos ativos à frente
//   - Aba "Histórico" separada para pedidos concluídos/cancelados
// ============================================================

const OrdersUI = (() => {
  let _state = {
    tab: 'queue',         // 'queue' | 'history'
    filter: 'all',        // 'all' | 'mine'
    status: 'all',        // filtra dentro da aba ativa
    search: '',
    expandedPanels: new Set(),
    expandedHistory: new Set(),
    // PATCH 5.3: view mode — 'list' mantém comportamento existente; 'kanban' delega ao OrdersKanban
    viewMode: 'list',
  };

  // ── Inicialização ──────────────────────────────────────────────────────

  function init() {
    OrdersAdmin.injectStyles();
    _injectStyles();
    _setupTopbar();

    // PATCH 5.4: kanban só para admin, só se OrdersKanban estiver carregado
    // Feature flag: window.PA_KANBAN_ENABLED = true (setado externamente ou aqui)
    // Para habilitar: adicionar <script>window.PA_KANBAN_ENABLED=true;</script> antes dos scripts
    const isAdmin = typeof OrdersAdmin !== 'undefined' ? OrdersAdmin.isCurrentUserAdmin() : false;
    const kanbanAvailable = typeof OrdersKanban !== 'undefined';
    const flagEnabled = !!window.PA_KANBAN_ENABLED;

    if (kanbanAvailable && flagEnabled && isAdmin) {
      _state.viewMode = 'kanban';
      OrdersKanban.init();
      console.log('[OrdersUI] 🗂 Modo kanban ativado para admin.');
    }

    _ensureKanbanContainer();
    _injectViewToggle();
    render();

    if (typeof Session !== 'undefined') {
      Session.onAuthChange(() => {
        // Re-avalia acesso ao kanban quando sessão muda
        const nowAdmin = typeof OrdersAdmin !== 'undefined' ? OrdersAdmin.isCurrentUserAdmin() : false;
        if (!nowAdmin && _state.viewMode === 'kanban') {
          _state.viewMode = 'list';
        }
        render();
      });
    }

    if (window.OrdersNotifications && typeof OrdersNotifications.init === 'function') {
      OrdersNotifications.init();
    }

    if (typeof OrdersStorage !== 'undefined') {
      OrdersStorage.migrateLegacyOrders();
    }
  }

  // ── Setup do Topbar ────────────────────────────────────────────────────

  function _setupTopbar() {
    const topbarRight = document.querySelector('.pedidos-topbar-right');
    if (!topbarRight) return;

    const statusSelect = document.getElementById('pedidos-status-filter');
    if (statusSelect) {
      statusSelect.onchange = () => {
        _state.status = statusSelect.value;
        render();
      };
    }

    const myBtn = document.getElementById('pedidos-my-filter');
    if (myBtn) {
      myBtn.onclick = () => {
        const isActive = myBtn.classList.toggle('active');
        _state.filter = isActive ? 'mine' : 'all';
        render();
      };
    }

    const searchInput = document.getElementById('pedidos-search');
    if (searchInput) {
      searchInput.oninput = () => {
        _state.search = searchInput.value;
        render();
      };
    }

    const refreshBtn = document.querySelector('.pedidos-refresh-btn');
    if (refreshBtn) {
      refreshBtn.onclick = () => {
        if (typeof pedidosCarregar === 'function') {
          pedidosCarregar();
        } else {
          render();
        }
        if (window.OrdersNotifications && typeof OrdersNotifications.show === 'function') {
          OrdersNotifications.show('Lista de pedidos atualizada.', 'info', 2500);
        }
      };
    }
  }

  // ── Render Principal ───────────────────────────────────────────────────

  function render() {
    // PATCH 5.3: se modo kanban estiver ativo, delega e retorna
    if (_state.viewMode === 'kanban' && typeof OrdersKanban !== 'undefined') {
      const kanbanEl = document.getElementById('pedidos-kanban');
      const listaEl  = document.getElementById('pedidos-lista');
      const loadingEl = document.getElementById('pedidos-loading');
      const emptyEl  = document.getElementById('pedidos-empty');
      if (kanbanEl)  kanbanEl.style.display  = '';
      if (listaEl)   listaEl.style.display   = 'none';
      if (loadingEl) loadingEl.style.display  = 'none';
      if (emptyEl)   emptyEl.style.display    = 'none';
      OrdersKanban.render();
      return;
    }

    // ── Modo lista (comportamento original — não alterado) ───────────────
    const lista = document.getElementById('pedidos-lista');
    const kanbanEl = document.getElementById('pedidos-kanban');
    if (kanbanEl) kanbanEl.style.display = 'none';
    if (lista) lista.style.display = '';

    const loading = document.getElementById('pedidos-loading');
    const empty = document.getElementById('pedidos-empty');
    const erro = document.getElementById('pedidos-erro');
    if (!lista) return;

    if (loading) loading.style.display = 'none';
    if (erro) erro.style.display = 'none';

    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    const isAdmin = typeof OrdersAdmin !== 'undefined' ? OrdersAdmin.isCurrentUserAdmin() : false;

    // ── Todos os pedidos brutos do storage ──────────────────────────────
    const allOrders = OrdersStorage.getAllOrders();

    // ── Fila ativa: SOMENTE pedidos com status ativo ────────────────────
    // A posição dinâmica é calculada a partir desta lista.
    const activeQueue = OrdersProgress.getActiveQueue(allOrders);

    // ── Histórico: pedidos inativos (concluídos, cancelados) ─────────────
    const historyOrders = allOrders
      .filter(o => OrdersProgress.isInactiveStatus(o.status_v3 || o.status))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // ── Seleciona qual lista renderizar conforme a aba ativa ─────────────
    // Admin vê ambas as abas; usuário comum vê só a fila (seus pedidos ativos)
    let baseList = _state.tab === 'history' ? historyOrders : activeQueue;

    // ── Filtros adicionais ───────────────────────────────────────────────
    if (_state.filter === 'mine' && user) {
      baseList = baseList.filter(o => o.userId === user.id || o.nickname === user.nickname);
    }
    if (_state.status !== 'all') {
      baseList = baseList.filter(o =>
        OrdersProgress.normalizeStatus(o.status_v3 || o.status) === _state.status
      );
    }
    if (_state.search.trim()) {
      const q = _state.search.trim().toLowerCase();
      baseList = baseList.filter(o => {
        // Busca por item ou número: sempre permitida
        const matchItem = (o.items || []).some(it => it.name.toLowerCase().includes(q));
        const matchNum  = String(o.orderNumber).includes(q);
        if (matchItem || matchNum) return true;
        // Busca por nick: respeita privacidade
        if (typeof QueuePrivacy !== 'undefined') {
          return QueuePrivacy.canSearchByNick(q, o, user);
        }
        return o.nickname.toLowerCase().includes(q);
      });
    }

    // ── Tabs ─────────────────────────────────────────────────────────────
    _renderTabs(activeQueue.length, historyOrders.length, isAdmin);

    // ── Badge de contagem ────────────────────────────────────────────────
    const badge = document.getElementById('pedidos-count-badge');
    if (badge) {
      if (_state.tab === 'queue') {
        badge.textContent = `${activeQueue.length} na fila`;
      } else {
        badge.textContent = `${historyOrders.length} pedido${historyOrders.length !== 1 ? 's' : ''}`;
      }
    }

    if (!baseList.length) {
      lista.innerHTML = '';
      if (empty) {
        empty.style.display = 'flex';
        const emptyMsg = empty.querySelector('.pedidos-empty-msg');
        if (emptyMsg) {
          emptyMsg.textContent = _state.tab === 'queue'
            ? 'Nenhum pedido aguardando atendimento'
            : 'Nenhum pedido no histórico';
        }
      }
      return;
    }

    if (empty) empty.style.display = 'none';

    // ── Renderiza cards ───────────────────────────────────────────────────
    const existingCards = new Map();
    lista.querySelectorAll('.order-card[data-order-id]').forEach(el => {
      existingCards.set(el.dataset.orderId, el);
    });

    const frag = document.createDocumentFragment();
    baseList.forEach(order => {
      // Passa a fila ativa para calcular posição e ETA
      const el = _renderCard(order, user, isAdmin, activeQueue, existingCards.get(order.id));
      frag.appendChild(el);
      existingCards.delete(order.id);
      if (window.OrdersNotifications && typeof OrdersNotifications.flushUnreadNotifications === 'function') {
        OrdersNotifications.flushUnreadNotifications(order);
      }
    });

    existingCards.forEach(el => el.remove());
    lista.innerHTML = '';
    lista.appendChild(frag);
  }

  // ── Renderização das Tabs ──────────────────────────────────────────────

  function _renderTabs(queueCount, historyCount, isAdmin) {
    let tabsEl = document.getElementById('orders-tabs');
    if (!tabsEl) {
      tabsEl = document.createElement('div');
      tabsEl.id = 'orders-tabs';
      tabsEl.className = 'orders-tabs';
      const lista = document.getElementById('pedidos-lista');
      if (lista && lista.parentNode) {
        lista.parentNode.insertBefore(tabsEl, lista);
      }
    }

    // Admin vê histórico; usuário normal vê só a fila
    tabsEl.innerHTML = `
      <button class="orders-tab ${_state.tab === 'queue' ? 'active' : ''}"
              onclick="OrdersUI._setTab('queue')">
        <span class="orders-tab-icon">⚡</span>
        Fila Ativa
        ${queueCount > 0 ? `<span class="orders-tab-badge">${queueCount}</span>` : ''}
      </button>
      ${isAdmin ? `
      <button class="orders-tab ${_state.tab === 'history' ? 'active' : ''}"
              onclick="OrdersUI._setTab('history')">
        <span class="orders-tab-icon">📋</span>
        Histórico
        ${historyCount > 0 ? `<span class="orders-tab-badge orders-tab-badge--muted">${historyCount}</span>` : ''}
      </button>
      ` : ''}
    `;
  }

  function _setTab(tab) {
    _state.tab = tab;
    _state.status = 'all'; // reset do filtro de status ao trocar aba
    render();
  }

  // ── Renderização de Card ───────────────────────────────────────────────

  function _renderCard(order, user, isAdmin, activeQueue, existingEl) {
    const cfg = OrdersProgress.getStatusConfig(order.status_v3 || order.status);
    const progress = OrdersProgress.calcOrderProgress(order);
    const relTime = OrdersProgress.formatRelativeTime(order.createdAt);
    const isOwner = user && (order.userId === user.id);
    const panelOpen = _state.expandedPanels.has(order.id);
    const histOpen = _state.expandedHistory.has(order.id);
    const unreadCount = order.notifications ? order.notifications.filter(n => !n.read && isOwner).length : 0;
    const canCancel = user && OrdersProgress.canUserCancel(order, user.id);

    // ── Posição na fila — fonte única de verdade ──────────────────────
    // activeQueue já está ordenado por created_at ASC pelo getActiveQueue().
    // Nunca usar ID do banco como proxy de ordem.
    const posIdx   = activeQueue.findIndex(o => o.id === order.id);
    const position = posIdx !== -1 ? posIdx + 1 : null;

    // ETA por posição não implementado nesta etapa (aguarda Etapa SLA).
    // Mostramos apenas a posição na fila para waiting_queue.
    const eta = null;

    const card = document.createElement('div');

    // Cards no histórico recebem classe adicional de opacidade reduzida
    const isInHistory = OrdersProgress.isInactiveStatus(order.status_v3 || order.status);
    const statusKey = OrdersProgress.normalizeStatus(order.status_v3 || order.status);
    card.className = `order-card order-card--${statusKey}${isInHistory ? ' order-card--inactive' : ''}`;
    card.dataset.orderId = order.id;
    card.style.cssText = `--status-color:${cfg.color}; --status-glow:${cfg.glow};`;

    card.innerHTML = `
      <!-- Card Header -->
      <div class="order-card-header">
        <div class="order-card-header-left">
          <!-- Posição na fila (dinâmica) ou número do pedido (histórico) -->
          ${position !== null ? `
            <div class="order-queue-position" title="Posição na fila de atendimento">
              <span class="order-queue-pos-num">#${position}</span>
              <span class="order-queue-pos-label">na fila</span>
            </div>
          ` : `
            <div class="order-card-num">${OrdersProgress.formatOrderNumber(order.orderNumber)}</div>
          `}
          <div class="order-card-nick">
            ${typeof QueuePrivacy !== 'undefined'
              ? QueuePrivacy.buildNickHTML(order, user)
              : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>${_escHtml(order.nickname)}${isOwner ? '<span class="order-card-you-badge">você</span>' : ''}`
            }
          </div>
        </div>
        <div class="order-card-header-right">
          ${unreadCount > 0 ? `<span class="order-card-notif-dot">${unreadCount}</span>` : ''}
          <span class="order-status-badge order-status-badge--${statusKey}">
            <span class="order-status-icon">${cfg.icon}</span>
            <span>${cfg.label}</span>
          </span>
          <span class="order-card-time">${relTime}</span>
        </div>
      </div>

      <!-- ETA (apenas para pedidos ativos na fila) -->
      ${eta !== null ? `
        <div class="order-eta-bar">
          <div class="order-eta-queue">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span class="order-eta-label">ETA: <strong>${eta.label}</strong></span>
          </div>
          <div class="order-eta-position">
            Posição <strong>${position}</strong> de <strong>${activeQueue.length}</strong> na fila
          </div>
        </div>
      ` : ''}

      <!-- Progresso Geral -->
      <div class="order-progress-section">
        <div class="order-progress-header">
          <span class="order-progress-label">Progresso</span>
          <span class="order-progress-pct" style="color:${OrdersProgress.progressBarColor(progress)}">${progress}%</span>
        </div>
        <div class="order-progress-bar">
          <div class="order-progress-fill" style="width:${progress}%; background:linear-gradient(90deg, ${OrdersProgress.progressBarColor(progress)}, ${cfg.color}); box-shadow: 0 0 8px ${cfg.glow};"></div>
        </div>
      </div>

      <!-- Itens -->
      <div class="order-items-section">
        ${_renderItems(order.items)}
      </div>

      ${order.observations ? `
      <div class="order-obs">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        ${_escHtml(order.observations)}
      </div>
      ` : ''}

      <!-- Footer -->
      <div class="order-card-footer">
        <div class="order-card-footer-left">
          ${isAdmin ? `
          <button class="order-card-admin-toggle ${panelOpen ? 'active' : ''}"
                  onclick="OrdersUI._toggleAdminPanel('${order.id}')">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
            Admin
          </button>
          ` : ''}
          ${(order.history && order.history.length > 1) ? `
          <button class="order-card-hist-toggle ${histOpen ? 'active' : ''}"
                  onclick="OrdersUI._toggleHistory('${order.id}')">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.91"/></svg>
            Histórico
          </button>
          ` : ''}
        </div>
        <div class="order-card-footer-right">
          ${canCancel ? `
          <button class="order-card-cancel-btn"
                  onclick="OrdersUI._cancelOwnOrder('${order.id}')">
            Cancelar Pedido
          </button>
          ` : ''}
        </div>
      </div>

      <!-- Painel Admin (colapsável) -->
      ${isAdmin && panelOpen ? OrdersAdmin.renderAdminPanel(order) : ''}

      <!-- Timeline Histórico (colapsável) -->
      ${histOpen ? _renderTimeline(order.history) : ''}
    `;

    return card;
  }

  // ── Renderização de Itens ──────────────────────────────────────────────

  function _renderItems(items) {
    if (!items || !items.length) {
      return '<div class="order-items-empty">Sem itens registrados</div>';
    }

    return items.map(item => {
      const pct = OrdersProgress.calcItemProgress(item);
      const barColor = OrdersProgress.progressBarColor(pct);
      const isDone = item.concluido;

      return `
        <div class="order-item ${isDone ? 'order-item--done' : ''} ${pct > 0 && !isDone ? 'order-item--partial' : ''}">
          <div class="order-item-info">
            <span class="order-item-name">${_escHtml(item.name)}</span>
            ${isDone ? '<span class="order-item-check-mark">✓</span>' : ''}
          </div>
          <div class="order-item-progress">
            ${item.qtdTotal > 1 ? `
              <div class="order-item-bar-wrap">
                <div class="order-item-bar">
                  <div class="order-item-bar-fill"
                       style="width:${pct}%; background:${barColor}; box-shadow: 0 0 6px ${barColor}40;"></div>
                </div>
                <span class="order-item-qty ${isDone ? 'order-item-qty--done' : ''}"
                      style="color:${isDone ? '#4ade80' : barColor}">
                  ${item.qtdEntregue}/${item.qtdTotal}
                </span>
              </div>
            ` : `
              <span class="${isDone ? 'order-item-qty-simple done' : 'order-item-waiting-label'}" style="${isDone ? 'color:#4ade80' : ''}">
                ${isDone ? '✓ entregue' : 'Aguardando início'}
              </span>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Renderização da Timeline ───────────────────────────────────────────

  function _renderTimeline(history) {
    if (!history || !history.length) return '';

    const entries = history.slice().reverse().map((h, i) => {
      const isFirst = i === 0;
      const iconMap = {
        created:       { icon: '🟢', color: '#22c55e' },
        status_change: { icon: '🔄', color: '#3a8cff' },
        item_progress: { icon: '📦', color: '#a855f7' },
        observation:   { icon: '💬', color: '#f5c542' },
        migrated:      { icon: '📁', color: 'rgba(255,255,255,0.3)' },
      };
      const ev = iconMap[h.event] || { icon: '•', color: 'rgba(255,255,255,0.3)' };

      return `
        <div class="order-timeline-entry ${isFirst ? 'latest' : ''}">
          <div class="order-timeline-dot" style="color:${ev.color}; text-shadow:0 0 6px ${ev.color};">${ev.icon}</div>
          <div class="order-timeline-content">
            <div class="order-timeline-label">${_escHtml(h.label)}</div>
            <div class="order-timeline-meta">
              ${h.by ? `<span>${_escHtml(h.by)}</span>` : ''}
              <span>${OrdersProgress.formatRelativeTime(h.at)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="order-timeline">
        <div class="order-timeline-title">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.91"/></svg>
          Histórico
        </div>
        <div class="order-timeline-list">${entries}</div>
      </div>
    `;
  }

  // ── Interações ─────────────────────────────────────────────────────────

  function _toggleAdminPanel(orderId) {
    if (_state.expandedPanels.has(orderId)) {
      _state.expandedPanels.delete(orderId);
    } else {
      _state.expandedPanels.add(orderId);
    }
    render();
  }

  function _toggleHistory(orderId) {
    if (_state.expandedHistory.has(orderId)) {
      _state.expandedHistory.delete(orderId);
    } else {
      _state.expandedHistory.add(orderId);
    }
    render();
  }

  async function _cancelOwnOrder(orderId) {
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) return;

    const order = OrdersStorage.getOrderById(orderId);
    if (!order) return;

    if (!OrdersProgress.canUserCancel(order, user.id)) {
      if (window.OrdersNotifications && typeof OrdersNotifications.show === 'function') {
        OrdersNotifications.show('Não é possível cancelar este pedido.', 'cancelado', 3000);
      }
      return;
    }

    const confirmed = await showConfirmModal({
      title: 'Cancelar Pedido',
      message: 'Deseja cancelar seu pedido? Esta ação não pode ser desfeita.',
      confirmText: 'Cancelar Pedido',
      cancelText: 'Voltar',
      type: 'danger'
    });
    if (!confirmed) return;

    OrdersStorage.updateStatus(orderId, 'cancelado', user.nickname);
    if (window.OrdersNotifications && typeof OrdersNotifications.show === 'function') {
      OrdersNotifications.show(`Pedido cancelado.`, 'cancelado');
    }
    render();
  }

  // ── Utilitário ─────────────────────────────────────────────────────────

  function _escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── PATCH 5.3: Kanban helpers ──────────────────────────────────────────

  // Cria o container #pedidos-kanban no DOM se ainda não existir.
  // Inserido logo antes de #pedidos-lista — sem remover nada do HTML.
  function _ensureKanbanContainer() {
    if (document.getElementById('pedidos-kanban')) return;
    const lista = document.getElementById('pedidos-lista');
    if (!lista) return;
    const kanban = document.createElement('div');
    kanban.id = 'pedidos-kanban';
    kanban.style.display = 'none'; // começa oculto; render() decide o que mostrar
    lista.parentNode.insertBefore(kanban, lista);
  }

  // Injeta o botão de alternância kanban/lista na topbar existente.
  // Só aparece para admins com OrdersKanban disponível e flag ativa.
  function _injectViewToggle() {
    const isAdmin = typeof OrdersAdmin !== 'undefined' ? OrdersAdmin.isCurrentUserAdmin() : false;
    if (!isAdmin || typeof OrdersKanban === 'undefined' || !window.PA_KANBAN_ENABLED) return;
    if (document.getElementById('kb-view-toggle')) return;

    const topbarRight = document.querySelector('.pedidos-topbar-right');
    if (!topbarRight) return;

    const btn = document.createElement('button');
    btn.id = 'kb-view-toggle';
    btn.className = 'kb-view-toggle' + (_state.viewMode === 'kanban' ? ' active' : '');
    btn.title = 'Alternar entre lista e kanban';
    btn.innerHTML = _state.viewMode === 'kanban'
      ? '☰ Lista'
      : '⊞ Kanban';
    btn.onclick = () => _toggleViewMode();

    // Insere antes do botão de refresh
    const refreshBtn = topbarRight.querySelector('.pedidos-refresh-btn');
    if (refreshBtn) {
      topbarRight.insertBefore(btn, refreshBtn);
    } else {
      topbarRight.appendChild(btn);
    }
  }

  function _toggleViewMode() {
    const isAdmin = typeof OrdersAdmin !== 'undefined' ? OrdersAdmin.isCurrentUserAdmin() : false;
    if (!isAdmin) return; // segurança extra

    _state.viewMode = _state.viewMode === 'kanban' ? 'list' : 'kanban';

    // Atualiza o botão
    const btn = document.getElementById('kb-view-toggle');
    if (btn) {
      btn.classList.toggle('active', _state.viewMode === 'kanban');
      btn.innerHTML = _state.viewMode === 'kanban' ? '☰ Lista' : '⊞ Kanban';
    }

    render();
  }

  // ── Estilos ─────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('orders-ui-styles')) return;
    const style = document.createElement('style');
    style.id = 'orders-ui-styles';
    style.textContent = `
      /* ─── Pedidos Page ───────────────────────────────────────────── */
      .pedidos-page { padding: 16px 0 80px; }

      /* ─── Tabs de Fila / Histórico ───────────────────────────────── */
      .orders-tabs {
        display: flex;
        gap: 6px;
        margin-bottom: 16px;
        padding: 0 4px;
      }
      .orders-tab {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.04);
        color: rgba(255,255,255,0.45);
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        font-family: var(--font-body, sans-serif);
        letter-spacing: 0.3px;
      }
      .orders-tab:hover {
        background: rgba(255,255,255,0.07);
        color: rgba(255,255,255,0.75);
      }
      .orders-tab.active {
        background: rgba(58,140,255,0.12);
        border-color: rgba(58,140,255,0.3);
        color: #60aaff;
        box-shadow: 0 0 12px rgba(58,140,255,0.1);
      }
      .orders-tab-icon { font-size: 13px; }
      .orders-tab-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        border-radius: 9px;
        background: rgba(58,140,255,0.2);
        color: #60aaff;
        font-size: 10px;
        font-weight: 700;
        font-family: var(--font-mono, monospace);
      }
      .orders-tab-badge--muted {
        background: rgba(255,255,255,0.07);
        color: rgba(255,255,255,0.3);
      }

      /* ─── My Filter Button ───────────────────────────────────────── */
      .pedidos-my-filter-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 12px;
        height: 36px;
        border-radius: 9px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.04);
        color: rgba(255,255,255,0.45);
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        font-family: var(--font-body, sans-serif);
        white-space: nowrap;
      }
      .pedidos-my-filter-btn:hover { background: rgba(96,170,255,0.1); color: #60aaff; border-color: rgba(96,170,255,0.3); }
      .pedidos-my-filter-btn.active { background: rgba(96,170,255,0.15); color: #60aaff; border-color: rgba(96,170,255,0.4); box-shadow: 0 0 12px rgba(96,170,255,0.15); }

      /* ─── Order Card ─────────────────────────────────────────────── */
      #pedidos-lista {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .order-card {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 16px;
        padding: 18px 20px;
        transition: border-color 0.3s, box-shadow 0.3s, transform 0.2s;
        position: relative;
        overflow: hidden;
        animation: card-in 0.35s cubic-bezier(0.4,0,0.2,1) both;
      }
      .order-card::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 16px;
        background: radial-gradient(ellipse at top left, var(--status-glow, transparent) 0%, transparent 60%);
        opacity: 0.15;
        pointer-events: none;
        transition: opacity 0.3s;
      }
      .order-card:hover { border-color: color-mix(in srgb, var(--status-color, #fff) 30%, rgba(255,255,255,0.1)); box-shadow: 0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04); transform: translateY(-1px); }
      .order-card:hover::before { opacity: 0.25; }
      .order-card--inactive { opacity: 0.6; }
      .order-card--inactive:hover { opacity: 0.8; }

      @keyframes card-in {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .order-card--pendente     { border-left: 3px solid rgba(245,197,66,0.5); }
      .order-card--em_andamento { border-left: 3px solid rgba(58,140,255,0.55); }
      .order-card--parcial      { border-left: 3px solid rgba(168,85,247,0.55); }
      .order-card--concluido    { border-left: 3px solid rgba(34,197,94,0.55); }
      .order-card--cancelado    { border-left: 3px solid rgba(239,68,68,0.4); }
      /* status_v3 — fonte de verdade */
      .order-card--waiting_queue { border-left: 3px solid rgba(245,197,66,0.5); }
      .order-card--in_progress   { border-left: 3px solid rgba(58,140,255,0.55); }
      .order-card--completed     { border-left: 3px solid rgba(34,197,94,0.55); }
      .order-card--cancelled     { border-left: 3px solid rgba(239,68,68,0.4); }

      /* ─── Posição na Fila ─────────────────────────────────────────── */
      .order-queue-position {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-width: 42px;
        height: 42px;
        border-radius: 10px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        padding: 4px 8px;
        flex-shrink: 0;
      }
      .order-queue-pos-num {
        font-family: var(--font-mono, monospace);
        font-size: 15px;
        font-weight: 800;
        color: var(--status-color, #fff);
        text-shadow: 0 0 10px var(--status-glow, transparent);
        line-height: 1;
        letter-spacing: -0.5px;
      }
      .order-queue-pos-label {
        font-size: 8px;
        font-weight: 600;
        color: rgba(255,255,255,0.3);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        line-height: 1;
        margin-top: 2px;
      }

      /* ─── ETA Bar ─────────────────────────────────────────────────── */
      .order-eta-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 7px 12px;
        border-radius: 9px;
        background: rgba(58,140,255,0.06);
        border: 1px solid rgba(58,140,255,0.12);
        margin-bottom: 12px;
        flex-wrap: wrap;
      }
      .order-eta-queue {
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: var(--font-body, sans-serif);
        font-size: 11px;
        color: rgba(255,255,255,0.5);
      }
      .order-eta-queue svg { color: #60aaff; flex-shrink: 0; }
      .order-eta-label { color: rgba(255,255,255,0.6); }
      .order-eta-label strong { color: #60aaff; }
      .order-eta-position {
        font-family: var(--font-mono, monospace);
        font-size: 10px;
        color: rgba(255,255,255,0.3);
      }
      .order-eta-position strong { color: rgba(255,255,255,0.55); }

      /* ─── Card Header ─────────────────────────────────────────────── */
      .order-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
        flex-wrap: wrap;
      }
      .order-card-header-left { display: flex; align-items: center; gap: 10px; }
      .order-card-header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

      .order-card-num {
        font-family: var(--font-mono, monospace);
        font-size: 14px;
        font-weight: 700;
        color: var(--status-color, #fff);
        text-shadow: 0 0 10px var(--status-glow, transparent);
        letter-spacing: 0.5px;
        white-space: nowrap;
      }

      .order-card-nick {
        display: flex;
        align-items: center;
        gap: 5px;
        font-family: var(--font-body, sans-serif);
        font-size: 13px;
        font-weight: 600;
        color: rgba(255,255,255,0.75);
      }

      .order-card-you-badge {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.5px;
        padding: 2px 6px;
        border-radius: 4px;
        background: rgba(96,170,255,0.15);
        color: #60aaff;
        text-transform: uppercase;
      }

      .order-card-notif-dot {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        border-radius: 9px;
        background: #ef4444;
        color: #fff;
        font-size: 9px;
        font-weight: 700;
        padding: 0 5px;
        animation: badge-pulse 2s ease-in-out infinite;
        font-family: var(--font-mono, monospace);
      }
      @keyframes badge-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
      }

      .order-card-time {
        font-family: var(--font-mono, monospace);
        font-size: 10px;
        color: rgba(255,255,255,0.25);
        white-space: nowrap;
      }

      /* ─── Status Badge ────────────────────────────────────────────── */
      .order-status-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.3px;
        font-family: var(--font-body, sans-serif);
        white-space: nowrap;
      }
      .order-status-badge--pendente     { background:rgba(245,197,66,0.12); color:#ffd166; border:1px solid rgba(245,197,66,0.25); }
      .order-status-badge--em_andamento { background:rgba(58,140,255,0.12); color:#60aaff; border:1px solid rgba(58,140,255,0.3); box-shadow:0 0 10px rgba(58,140,255,0.15); }
      .order-status-badge--parcial      { background:rgba(168,85,247,0.12); color:#c084fc; border:1px solid rgba(168,85,247,0.3); box-shadow:0 0 10px rgba(168,85,247,0.15); }
      .order-status-badge--concluido    { background:rgba(34,197,94,0.12); color:#4ade80; border:1px solid rgba(34,197,94,0.3); }
      .order-status-badge--cancelado    { background:rgba(239,68,68,0.1); color:#f87171; border:1px solid rgba(239,68,68,0.2); }
      /* status_v3 — fonte de verdade */
      .order-status-badge--waiting_queue { background:rgba(245,197,66,0.12); color:#ffd166; border:1px solid rgba(245,197,66,0.25); }
      .order-status-badge--in_progress   { background:rgba(58,140,255,0.12); color:#60aaff; border:1px solid rgba(58,140,255,0.3); box-shadow:0 0 10px rgba(58,140,255,0.15); }
      .order-status-badge--completed     { background:rgba(34,197,94,0.12); color:#4ade80; border:1px solid rgba(34,197,94,0.3); }
      .order-status-badge--cancelled     { background:rgba(239,68,68,0.1); color:#f87171; border:1px solid rgba(239,68,68,0.2); }

      .order-status-icon { font-size: 12px; }

      /* ─── Progress Bar ────────────────────────────────────────────── */
      .order-progress-section { margin-bottom: 14px; }
      .order-progress-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
      .order-progress-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: rgba(255,255,255,0.3); font-family: var(--font-mono, monospace); }
      .order-progress-pct { font-size: 12px; font-weight: 700; font-family: var(--font-mono, monospace); transition: color 0.4s; }
      .order-progress-bar { height: 5px; border-radius: 3px; background: rgba(255,255,255,0.06); overflow: hidden; }
      .order-progress-fill { height: 100%; border-radius: 3px; transition: width 0.6s cubic-bezier(0.4,0,0.2,1), background 0.4s; min-width: 3px; }

      /* ─── Items ────────────────────────────────────────────────────── */
      .order-items-section { display: flex; flex-direction: column; gap: 7px; margin-bottom: 14px; }
      .order-items-empty { font-size: 12px; color: rgba(255,255,255,0.25); }
      .order-item {
        display: flex; align-items: center; justify-content: space-between; gap: 10px;
        padding: 8px 12px; border-radius: 9px;
        background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
        transition: background 0.3s, border-color 0.3s;
      }
      .order-item--done { background: rgba(34,197,94,0.06); border-color: rgba(34,197,94,0.12); }
      .order-item--partial { border-color: rgba(168,85,247,0.12); }
      .order-item-info { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
      .order-item-name { font-family: var(--font-body, sans-serif); font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.75); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .order-item--done .order-item-name { color: rgba(34,197,94,0.85); text-decoration: line-through; text-decoration-color: rgba(34,197,94,0.3); }
      .order-item-check-mark { color: #4ade80; font-size: 13px; font-weight: 700; flex-shrink: 0; animation: check-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both; text-shadow: 0 0 8px rgba(74,222,128,0.6); }
      @keyframes check-pop { from { transform: scale(0) rotate(-45deg); opacity: 0; } to { transform: scale(1) rotate(0deg); opacity: 1; } }
      .order-item-progress { flex-shrink: 0; }
      .order-item-bar-wrap { display: flex; align-items: center; gap: 7px; }
      .order-item-bar { width: 60px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.06); overflow: hidden; }
      .order-item-bar-fill { height: 100%; border-radius: 2px; transition: width 0.5s cubic-bezier(0.4,0,0.2,1), background 0.4s; }
      .order-item-qty { font-family: var(--font-mono, monospace); font-size: 10px; font-weight: 700; white-space: nowrap; transition: color 0.3s; }
      .order-item-qty--done { color: #4ade80 !important; }
      .order-item-qty-simple { font-family: var(--font-mono, monospace); font-size: 10px; font-weight: 700; white-space: nowrap; }
      .order-item-qty-simple.done { color: #4ade80 !important; }
      .order-item-waiting-label { font-size: 10px; font-weight: 400; color: rgba(255,255,255,0.32); font-style: italic; white-space: nowrap; letter-spacing: 0.01em; }

      /* ─── Observation ─────────────────────────────────────────────── */
      .order-obs {
        display: flex; align-items: flex-start; gap: 7px; padding: 9px 12px; border-radius: 9px;
        background: rgba(255,215,100,0.05); border: 1px solid rgba(255,215,100,0.1);
        font-family: var(--font-body, sans-serif); font-size: 12px; color: rgba(255,215,100,0.7); line-height: 1.5; margin-bottom: 12px;
      }
      .order-obs svg { flex-shrink: 0; margin-top: 2px; }

      /* ─── Card Footer ─────────────────────────────────────────────── */
      .order-card-footer {
        display: flex; align-items: center; justify-content: space-between; gap: 8px;
        padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05); flex-wrap: wrap;
      }
      .order-card-footer-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .order-card-footer-right { display: flex; align-items: center; gap: 8px; }
      .order-card-hist-toggle {
        display: flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 7px;
        background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
        color: rgba(255,255,255,0.4); font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
        text-transform: uppercase; cursor: pointer; transition: all 0.2s; font-family: var(--font-body, sans-serif);
      }
      .order-card-hist-toggle:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7); }
      .order-card-hist-toggle.active { background: rgba(96,170,255,0.1); color: #60aaff; border-color: rgba(96,170,255,0.25); }
      .order-card-cancel-btn {
        padding: 5px 12px; border-radius: 7px; background: rgba(239,68,68,0.08);
        border: 1px solid rgba(239,68,68,0.2); color: #f87171; font-size: 11px; font-weight: 700;
        cursor: pointer; transition: all 0.2s; font-family: var(--font-body, sans-serif); letter-spacing: 0.3px;
      }
      .order-card-cancel-btn:hover { background: rgba(239,68,68,0.15); box-shadow: 0 0 12px rgba(239,68,68,0.2); }

      /* ─── Timeline ────────────────────────────────────────────────── */
      .order-timeline { margin-top: 14px; padding: 14px; background: rgba(0,0,0,0.15); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); animation: oa-expand 0.2s ease both; }
      .order-timeline-title { font-family: var(--font-title, 'Cinzel', serif); font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.3); margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
      .order-timeline-list { display: flex; flex-direction: column; gap: 10px; }
      .order-timeline-entry { display: flex; gap: 10px; align-items: flex-start; }
      .order-timeline-dot { font-size: 13px; flex-shrink: 0; margin-top: 1px; }
      .order-timeline-content { flex: 1; }
      .order-timeline-label { font-size: 12px; color: rgba(255,255,255,0.65); font-family: var(--font-body, sans-serif); font-weight: 500; line-height: 1.4; }
      .order-timeline-entry.latest .order-timeline-label { color: rgba(255,255,255,0.85); font-weight: 600; }
      .order-timeline-meta { display: flex; gap: 8px; margin-top: 2px; font-size: 10px; color: rgba(255,255,255,0.25); font-family: var(--font-mono, monospace); }
      @keyframes oa-expand { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

      /* ─── Empty State ─────────────────────────────────────────────── */
      #pedidos-empty {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 10px; padding: 60px 20px; color: rgba(255,255,255,0.3); font-family: var(--font-body, sans-serif); text-align: center;
      }
      #pedidos-empty div:first-child { font-size: 44px; }

      /* ─── Mobile ──────────────────────────────────────────────────── */
      @media (max-width: 600px) {
        .order-card { padding: 14px; border-radius: 12px; }
        .order-card-header { gap: 8px; }
        .order-queue-pos-num { font-size: 13px; }
        .order-queue-position { min-width: 36px; height: 36px; }
        .order-card-nick { font-size: 12px; }
        .order-status-badge { font-size: 10px; padding: 3px 8px; }
        .order-item-bar { width: 44px; }
        .pedidos-topbar-right { gap: 6px; }
        .pedidos-my-filter-btn span { display: none; }
        .pedidos-my-filter-btn { padding: 0 10px; }
        .order-eta-bar { gap: 6px; }
        .order-eta-position { display: none; }
        .orders-tabs { gap: 4px; }
        .orders-tab { padding: 7px 12px; font-size: 11px; }
      }
    `;
    document.head.appendChild(style);
  }

  // ── API Pública ────────────────────────────────────────────────────────

  return {
    init,
    render,
    refresh: render,
    _setTab,
    _toggleAdminPanel,
    _toggleHistory,
    _cancelOwnOrder,
    _toggleViewMode, // PATCH 5.3: exposto para uso externo se necessário
  };
})();

// ── Inicialização ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  setTimeout(function () {
    try {
      OrdersUI.init();
    } catch(e) {
      console.error('[OrdersUI] Falha na inicialização:', e);
    }
  }, 150);
});