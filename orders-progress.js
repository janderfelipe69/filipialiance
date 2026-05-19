// ============================================================
// orders-progress.js — Cálculos, utilitários e FILA DINÂMICA
// PokeAlliance Shop — Sistema de Rastreamento de Pedidos
//
// MUDANÇA ARQUITETURAL v2:
//   Adicionado sistema de fila de processamento:
//   - ACTIVE_STATUSES: define quais status compõem a fila
//   - INACTIVE_STATUSES: define quais são ignorados na fila
//   - calcQueuePosition(): posição visual dinâmica (não usa ID do banco)
//   - calcETA(): tempo estimado baseado APENAS nos pedidos ativos
//   - getActiveQueue(): retorna fila limpa e ordenada
// ============================================================

const OrdersProgress = (() => {

  // ── Status Ativos (compõem a fila de processamento) ───────────────────
  // Apenas estes status ocupam posição e afetam o ETA.
  const ACTIVE_STATUSES = new Set(['pendente', 'em_andamento', 'parcial']);

  // ── Status Inativos (ignorados completamente na fila) ─────────────────
  const INACTIVE_STATUSES = new Set(['concluido', 'cancelado', 'deleted']);

  // ── Tempo médio estimado por pedido na fila (em minutos) ──────────────
  // Ajuste este valor conforme a velocidade real de processamento.
  const AVG_MINUTES_PER_ORDER = 10;

  // ── Configuração de Status ────────────────────────────────────────────

  const STATUS_CONFIG = {
    pendente: {
      label: 'Aguardando',
      color: '#f5c542',
      glow: 'rgba(245,197,66,0.4)',
      textColor: '#ffd166',
      icon: '⏳',
      bg: 'rgba(245,197,66,0.08)',
      border: 'rgba(245,197,66,0.25)',
      order: 1,
      active: true,
    },
    em_andamento: {
      label: 'Em Andamento',
      color: '#3a8cff',
      glow: 'rgba(58,140,255,0.45)',
      textColor: '#60aaff',
      icon: '⚡',
      bg: 'rgba(58,140,255,0.08)',
      border: 'rgba(58,140,255,0.25)',
      order: 2,
      active: true,
    },
    parcial: {
      label: 'Em Preparação',
      color: '#a855f7',
      glow: 'rgba(168,85,247,0.45)',
      textColor: '#c084fc',
      icon: '🔮',
      bg: 'rgba(168,85,247,0.08)',
      border: 'rgba(168,85,247,0.25)',
      order: 3,
      active: true,
    },
    concluido: {
      label: 'Concluído',
      color: '#22c55e',
      glow: 'rgba(34,197,94,0.45)',
      textColor: '#4ade80',
      icon: '✅',
      bg: 'rgba(34,197,94,0.08)',
      border: 'rgba(34,197,94,0.25)',
      order: 5,
      active: false,
    },
    cancelado: {
      label: 'Cancelado',
      color: '#ef4444',
      glow: 'rgba(239,68,68,0.35)',
      textColor: '#f87171',
      icon: '✕',
      bg: 'rgba(239,68,68,0.07)',
      border: 'rgba(239,68,68,0.2)',
      order: 6,
      active: false,
    },
  };

  function getStatusConfig(status) {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pendente;
  }

  function getAllStatuses() {
    return Object.entries(STATUS_CONFIG).map(([key, val]) => ({ key, ...val }));
  }

  // ── Verificação de Status ──────────────────────────────────────────────

  /**
   * Retorna true se o status ocupa posição na fila ativa.
   */
  function isActiveStatus(status) {
    return ACTIVE_STATUSES.has(status);
  }

  /**
   * Retorna true se o pedido deve ser completamente ignorado na fila.
   */
  function isInactiveStatus(status) {
    return INACTIVE_STATUSES.has(status);
  }

  // ── Sistema de Fila Dinâmica ───────────────────────────────────────────

  /**
   * Retorna a fila de pedidos ativos, ordenada por data de criação.
   * Exclui completamente pedidos concluídos/cancelados/excluídos.
   *
   * @param {Array} allOrders - Todos os pedidos do storage
   * @returns {Array} - Apenas pedidos ativos, ordenados do mais antigo ao mais novo
   */
  function getActiveQueue(allOrders) {
    return allOrders
      .filter(o => isActiveStatus(o.status))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  /**
   * Calcula a posição dinâmica visual de um pedido na fila.
   * NÃO usa o ID do banco de dados. Retorna null para pedidos inativos.
   *
   * Exemplo: pedidos ativos com IDs [8, 12, 15, 20] no banco
   *   → posições visuais: #1, #2, #3, #4
   *   Se o pedido 12 for concluído: [8, 15, 20] → #1, #2, #3 (sem buraco)
   *
   * @param {string} orderId - ID interno do pedido (pode ser 'sb_8', UUID, etc.)
   * @param {Array}  allOrders - Todos os pedidos
   * @returns {number|null} - Posição na fila (1-indexed) ou null se inativo
   */
  function calcQueuePosition(orderId, allOrders) {
    const queue = getActiveQueue(allOrders);
    const idx = queue.findIndex(o => o.id === orderId);
    if (idx === -1) return null; // pedido inativo ou não encontrado
    return idx + 1; // 1-indexed
  }

  /**
   * Calcula o ETA (tempo estimado de atendimento) para um pedido.
   * Baseado EXCLUSIVAMENTE nos pedidos ativos à frente na fila.
   * Pedidos concluídos/cancelados NÃO afetam o cálculo.
   *
   * Lógica:
   *   posição 1 (próximo) → ≤ AVG_MINUTES_PER_ORDER minutos
   *   posição N           → (N - 1) × AVG_MINUTES_PER_ORDER minutos
   *
   * @param {string} orderId  - ID do pedido
   * @param {Array}  allOrders - Todos os pedidos
   * @returns {{ minutes: number, label: string, position: number }|null}
   */
  function calcETA(orderId, allOrders) {
    const queue = getActiveQueue(allOrders);
    const idx = queue.findIndex(o => o.id === orderId);
    if (idx === -1) return null;

    const position = idx + 1;
    const minutesAhead = idx * AVG_MINUTES_PER_ORDER; // pedidos à frente × tempo médio

    let label;
    if (position === 1) {
      label = 'Próximo da fila';
    } else if (minutesAhead < 60) {
      label = `~${minutesAhead} min`;
    } else {
      const h = Math.floor(minutesAhead / 60);
      const m = minutesAhead % 60;
      label = m > 0 ? `~${h}h ${m}min` : `~${h}h`;
    }

    return {
      position,
      queueSize: queue.length,
      minutes: minutesAhead,
      label,
    };
  }

  /**
   * Formata a posição da fila para exibição.
   * Ex: 1 → "#1", 4 → "#4"
   */
  function formatQueuePosition(position) {
    if (position === null || position === undefined) return null;
    return '#' + position;
  }

  // ── Cálculos de Progresso ──────────────────────────────────────────────

  /**
   * Calcula progresso geral de um pedido (0-100).
   */
  function calcOrderProgress(order) {
    if (!order.items || !order.items.length) return 0;
    const total = order.items.reduce((s, it) => s + it.qtdTotal, 0);
    const done = order.items.reduce((s, it) => s + it.qtdEntregue, 0);
    return total === 0 ? 0 : Math.round((done / total) * 100);
  }

  /**
   * Progresso de um item individual (0-100).
   */
  function calcItemProgress(item) {
    if (!item.qtdTotal) return 0;
    return Math.round((item.qtdEntregue / item.qtdTotal) * 100);
  }

  /**
   * Verifica se usuário pode cancelar um pedido.
   */
  function canUserCancel(order, userId) {
    return order.userId === userId && order.status === 'pendente';
  }

  /**
   * Formata número de pedido com padding (para uso interno/admin).
   * A UI pública deve usar formatQueuePosition() para exibir posição na fila.
   */
  function formatOrderNumber(num) {
    return '#' + String(num).padStart(4, '0');
  }

  /**
   * Formata data relativa (ex: "há 2h", "ontem", "há 3 dias").
   */
  function formatRelativeTime(isoString) {
    if (!isoString) return '';
    const diff = Date.now() - new Date(isoString).getTime();
    const min = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (min < 1) return 'agora';
    if (min < 60) return `há ${min}min`;
    if (h < 24) return `há ${h}h`;
    if (d === 1) return 'ontem';
    if (d < 7) return `há ${d} dias`;
    return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  /**
   * Formata data completa.
   */
  function formatDate(isoString) {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  /**
   * Gera cor da barra de progresso baseada no percentual.
   */
  function progressBarColor(pct) {
    if (pct >= 100) return '#22c55e';
    if (pct >= 60) return '#a855f7';
    if (pct >= 30) return '#3a8cff';
    return '#f5c542';
  }

  return {
    // Constantes de fila
    ACTIVE_STATUSES,
    INACTIVE_STATUSES,
    AVG_MINUTES_PER_ORDER,

    // Configuração de status
    STATUS_CONFIG,
    getStatusConfig,
    getAllStatuses,
    isActiveStatus,
    isInactiveStatus,

    // Sistema de fila dinâmica
    getActiveQueue,
    calcQueuePosition,
    calcETA,
    formatQueuePosition,

    // Progresso
    calcOrderProgress,
    calcItemProgress,
    canUserCancel,
    formatOrderNumber,
    formatRelativeTime,
    formatDate,
    progressBarColor,
  };
})();
