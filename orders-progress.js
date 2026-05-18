// ============================================================
// orders-progress.js — Cálculos e utilitários de progresso
// PokeAlliance Shop — Sistema de Rastreamento de Pedidos
// ============================================================

const OrdersProgress = (() => {

  // ── Configuração de Status ─────────────────────────────────────────────

  const STATUS_CONFIG = {
    pendente: {
      label: 'Pendente',
      color: '#f5c542',
      glow: 'rgba(245,197,66,0.4)',
      textColor: '#ffd166',
      icon: '⏳',
      bg: 'rgba(245,197,66,0.08)',
      border: 'rgba(245,197,66,0.25)',
      order: 1,
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
    },
    parcial: {
      label: 'Parcialmente Entregue',
      color: '#a855f7',
      glow: 'rgba(168,85,247,0.45)',
      textColor: '#c084fc',
      icon: '🔮',
      bg: 'rgba(168,85,247,0.08)',
      border: 'rgba(168,85,247,0.25)',
      order: 3,
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
    },
  };

  function getStatusConfig(status) {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pendente;
  }

  function getAllStatuses() {
    return Object.entries(STATUS_CONFIG).map(([key, val]) => ({ key, ...val }));
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
   * Formata número de pedido com padding.
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
    STATUS_CONFIG,
    getStatusConfig,
    getAllStatuses,
    calcOrderProgress,
    calcItemProgress,
    canUserCancel,
    formatOrderNumber,
    formatRelativeTime,
    formatDate,
    progressBarColor,
  };
})();
