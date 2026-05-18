// ============================================================
// orders-storage.js — Camada de persistência de pedidos
// PokeAlliance Shop — Sistema de Rastreamento de Pedidos
//
// ARQUITETURA: única camada que toca localStorage para pedidos.
// Preparada para migração ao Supabase: basta reimplementar mantendo a API pública.
//
// Ordem de pedido (estrutura completa):
// {
//   id, userId, nickname, createdAt, status,
//   items: [{ id, name, qtdTotal, qtdEntregue, concluido }],
//   progress: number (0-100),
//   notifications: [],
//   history: [],
//   cancelledAt, completedAt, observations
// }
// ============================================================

const OrdersStorage = (() => {
  const KEYS = {
    ORDERS: 'pa_orders_v2',
    NOTIF_READ: 'pa_notif_read_v1',
  };

  // Contadores sequenciais
  function _nextOrderNumber() {
    const orders = getAllOrders();
    if (!orders.length) return 1;
    const nums = orders.map(o => parseInt(o.orderNumber || 0, 10));
    return Math.max(...nums) + 1;
  }

  // ── Leitura / Escrita ──────────────────────────────────────────────────

  function getAllOrders() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.ORDERS) || '[]');
    } catch { return []; }
  }

  function _saveAllOrders(orders) {
    try {
      localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
      return true;
    } catch { return false; }
  }

  // ── API Pública ────────────────────────────────────────────────────────

  /**
   * Cria um novo pedido.
   * @param {{ userId, nickname, items: Array<{name, qtdTotal}> }}
   * @returns {{ success, order }}
   */
  function createOrder({ userId, nickname, items }) {
    const orders = getAllOrders();
    const orderNumber = _nextOrderNumber();

    const normalizedItems = (items || []).map((item, idx) => ({
      id: `item_${Date.now()}_${idx}`,
      name: item.name || item.item || String(item),
      qtdTotal: parseInt(item.quantity || item.qtd || item.qtdTotal || 1, 10),
      qtdEntregue: 0,
      concluido: false,
    }));

    const now = new Date().toISOString();
    const newOrder = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
      orderNumber,
      userId: userId || null,
      nickname: nickname || 'Anônimo',
      createdAt: now,
      status: 'pendente', // pendente | em_andamento | parcial | concluido | cancelado
      items: normalizedItems,
      progress: 0,
      notifications: [],
      history: [{ at: now, event: 'created', label: 'Pedido criado', by: nickname }],
      cancelledAt: null,
      completedAt: null,
      observations: '',
    };

    orders.push(newOrder);
    _saveAllOrders(orders);
    return { success: true, order: newOrder };
  }

  /**
   * Busca pedido por ID.
   */
  function getOrderById(id) {
    return getAllOrders().find(o => o.id === id) || null;
  }

  /**
   * Busca pedidos de um usuário específico.
   */
  function getOrdersByUser(userId) {
    return getAllOrders().filter(o => o.userId === userId);
  }

  /**
   * Atualiza status de um pedido. Registra histórico automaticamente.
   * @param {string} id
   * @param {string} status
   * @param {string} [by] - Quem alterou
   */
  function updateStatus(id, status, by) {
    const orders = getAllOrders();
    const idx = orders.findIndex(o => o.id === id);
    if (idx === -1) return { success: false };

    const now = new Date().toISOString();
    const labels = {
      pendente: 'Pedido marcado como Pendente',
      em_andamento: 'Pedido em Andamento',
      parcial: 'Entrega Parcial iniciada',
      concluido: 'Pedido Concluído',
      cancelado: 'Pedido Cancelado',
    };

    orders[idx].status = status;
    orders[idx].history.push({ at: now, event: 'status_change', label: labels[status] || status, by: by || 'sistema' });

    if (status === 'cancelado') orders[idx].cancelledAt = now;
    if (status === 'concluido') orders[idx].completedAt = now;

    // Adiciona notificação para o dono do pedido
    orders[idx].notifications.push({
      id: Date.now().toString(36),
      at: now,
      read: false,
      msg: labels[status] || `Status: ${status}`,
      type: status,
    });

    _saveAllOrders(orders);
    return { success: true, order: orders[idx] };
  }

  /**
   * Atualiza progresso de itens individualmente.
   * @param {string} orderId
   * @param {string} itemId
   * @param {number} qtdEntregue
   * @param {string} [by]
   */
  function updateItemProgress(orderId, itemId, qtdEntregue, by) {
    const orders = getAllOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) return { success: false };

    const itemIdx = orders[idx].items.findIndex(it => it.id === itemId);
    if (itemIdx === -1) return { success: false };

    const item = orders[idx].items[itemIdx];
    const clampedQtd = Math.min(Math.max(0, qtdEntregue), item.qtdTotal);
    item.qtdEntregue = clampedQtd;
    item.concluido = clampedQtd >= item.qtdTotal;

    const now = new Date().toISOString();
    orders[idx].history.push({
      at: now,
      event: 'item_progress',
      label: `${item.name}: ${clampedQtd}/${item.qtdTotal} entregues`,
      by: by || 'admin',
    });

    // Notificação
    orders[idx].notifications.push({
      id: Date.now().toString(36),
      at: now,
      read: false,
      msg: `${clampedQtd}x ${item.name} ${item.concluido ? 'entregues ✓' : `entregues (${clampedQtd}/${item.qtdTotal})`}`,
      type: item.concluido ? 'item_done' : 'item_progress',
    });

    // Recalcula progresso geral
    orders[idx].progress = _calcProgress(orders[idx].items);

    // Auto-status
    const allDone = orders[idx].items.every(it => it.concluido);
    const anyDone = orders[idx].items.some(it => it.qtdEntregue > 0);
    if (allDone && orders[idx].status !== 'concluido' && orders[idx].status !== 'cancelado') {
      orders[idx].status = 'concluido';
      orders[idx].completedAt = now;
      orders[idx].notifications.push({
        id: (Date.now() + 1).toString(36),
        at: now,
        read: false,
        msg: `Seu pedido #${String(orders[idx].orderNumber).padStart(4, '0')} foi concluído! 🎉`,
        type: 'concluido',
      });
    } else if (anyDone && !allDone && orders[idx].status === 'em_andamento') {
      orders[idx].status = 'parcial';
    }

    _saveAllOrders(orders);
    return { success: true, order: orders[idx] };
  }

  /**
   * Adiciona observação ao pedido.
   */
  function addObservation(orderId, text, by) {
    const orders = getAllOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) return { success: false };

    const now = new Date().toISOString();
    orders[idx].observations = text;
    orders[idx].history.push({ at: now, event: 'observation', label: `Obs: ${text}`, by: by || 'admin' });
    _saveAllOrders(orders);
    return { success: true, order: orders[idx] };
  }

  /**
   * Exclui pedido (somente admin).
   */
  function deleteOrder(orderId) {
    const orders = getAllOrders().filter(o => o.id !== orderId);
    _saveAllOrders(orders);
    return { success: true };
  }

  /**
   * Marca notificações como lidas para um usuário.
   */
  function markNotificationsRead(orderId, userId) {
    const orders = getAllOrders();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) return;
    orders[idx].notifications.forEach(n => { n.read = true; });
    _saveAllOrders(orders);
  }

  /**
   * Retorna contagem de notificações não lidas de um usuário.
   */
  function getUnreadCount(userId) {
    const orders = getAllOrders().filter(o => o.userId === userId);
    let count = 0;
    orders.forEach(o => {
      count += o.notifications.filter(n => !n.read).length;
    });
    return count;
  }

  // ── Utilitário interno ─────────────────────────────────────────────────

  function _calcProgress(items) {
    if (!items || !items.length) return 0;
    const total = items.reduce((s, it) => s + it.qtdTotal, 0);
    const done = items.reduce((s, it) => s + it.qtdEntregue, 0);
    return total === 0 ? 0 : Math.round((done / total) * 100);
  }

  // ── Migração de dados legados ──────────────────────────────────────────
  // Importa pedidos do formato antigo (pa_pedidos_v1) se existirem

  function migrateLegacyOrders() {
    const legacyKey = 'pa_pedidos_v1';
    const raw = localStorage.getItem(legacyKey);
    if (!raw) return;

    try {
      const legacyOrders = JSON.parse(raw);
      const existing = getAllOrders();
      const existingIds = new Set(existing.map(o => o.id));
      let added = 0;

      legacyOrders.forEach(lo => {
        if (existingIds.has(lo.id)) return;
        const items = (lo.items || []).map((it, i) => ({
          id: `item_legacy_${lo.id}_${i}`,
          name: typeof it === 'string' ? it : (it.item || it.name || String(it)),
          qtdTotal: parseInt(it.quantity || it.qtd || 1, 10),
          qtdEntregue: 0,
          concluido: false,
        }));

        const migrated = {
          id: lo.id || Date.now().toString(36) + Math.random().toString(36).slice(2),
          orderNumber: lo.orderNumber || lo.num || added + 1,
          userId: lo.userId || null,
          nickname: lo.nickname || lo.nick || 'Anônimo',
          createdAt: lo.createdAt || lo.timestamp || new Date().toISOString(),
          status: _mapLegacyStatus(lo.status),
          items,
          progress: 0,
          notifications: [],
          history: [{ at: lo.createdAt || new Date().toISOString(), event: 'migrated', label: 'Importado do sistema legado', by: 'sistema' }],
          cancelledAt: null,
          completedAt: null,
          observations: lo.obs || '',
        };
        existing.push(migrated);
        added++;
      });

      if (added > 0) {
        _saveAllOrders(existing);
        localStorage.removeItem(legacyKey);
      }
    } catch (e) {
      console.warn('[OrdersStorage] Falha ao migrar pedidos legados:', e);
    }
  }

  function _mapLegacyStatus(s) {
    if (!s) return 'pendente';
    const m = { pendente: 'pendente', confirmado: 'em_andamento', entregue: 'concluido', cancelado: 'cancelado' };
    return m[s] || 'pendente';
  }

  // ── Exporta API pública ───────────────────────────────────────────────

  return {
    getAllOrders,
    createOrder,
    getOrderById,
    getOrdersByUser,
    updateStatus,
    updateItemProgress,
    addObservation,
    deleteOrder,
    markNotificationsRead,
    getUnreadCount,
    migrateLegacyOrders,
    // debug
    _getAllOrders: getAllOrders,
  };
})();
