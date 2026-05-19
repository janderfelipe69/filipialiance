// ============================================================
// orders-progress.js — v3 — Sistema Real de Fila de Serviços
// PokeAlliance Shop
//
// ARQUITETURA v3 — REGRAS FUNDAMENTAIS:
//
//   1. O countdown NUNCA começa no created_at.
//      Ele começa SOMENTE quando started_at é definido (admin inicia).
//
//   2. A fila é ordenada por created_at ASC — ordem cronológica ABSOLUTA.
//      Quem pediu primeiro aparece primeiro, SEMPRE.
//      Mesmo que o admin inicie outro pedido fora de ordem,
//      a POSIÇÃO NA FILA reflete a ordem de criação.
//
//   3. ETA só existe para pedidos in_progress (com started_at).
//      Para waiting_queue: mostra posição na fila, sem countdown.
//
//   4. SLA é baseado no tipo de serviço:
//      - normal_package: 4~7 dias por pacote (somam)
//      - pokemon_sr:     25~40 dias por unidade (somam)
//
// ESTADOS VÁLIDOS:
//   waiting_queue → in_progress → completed
//                              ↘ cancelled
//
// ============================================================

const OrdersProgress = (() => {

  // ── Constantes de Status ───────────────────────────────────────────────

  // Status que aparecem na fila principal (aba Queue)
  const ACTIVE_STATUSES = new Set(['waiting_queue', 'in_progress']);

  // Status que vão para o histórico (aba History)
  const INACTIVE_STATUSES = new Set(['completed', 'cancelled']);

  // ── SLA por tipo de serviço ────────────────────────────────────────────
  // Fonte de verdade para cálculos de ETA. Espelha a função calc_sla_days() do banco.
  const SLA_CONFIG = {
    normal_package: {
      label:       'Pacote Normal',
      minPerUnit:  4,   // dias mínimos por pacote
      maxPerUnit:  7,   // dias máximos por pacote
      icon:        '📦',
      description: '4~7 dias por pacote',
    },
    pokemon_sr: {
      label:       'Pokémon SR',
      minPerUnit:  25,  // dias mínimos por unidade
      maxPerUnit:  40,  // dias máximos por unidade
      icon:        '✨',
      description: '25~40 dias por unidade',
    },
  };

  // ── Configuração visual de Status ─────────────────────────────────────
  const STATUS_CONFIG = {
    waiting_queue: {
      label:     'Na Fila',
      color:     '#f5c542',
      glow:      'rgba(245,197,66,0.4)',
      textColor: '#ffd166',
      icon:      '⏳',
      bg:        'rgba(245,197,66,0.08)',
      border:    'rgba(245,197,66,0.25)',
      active:    true,
      // Pedido existe mas SLA ainda NÃO correu
      // Exibe: posição na fila, sem countdown
    },
    in_progress: {
      label:     'Em Andamento',
      color:     '#3a8cff',
      glow:      'rgba(58,140,255,0.45)',
      textColor: '#60aaff',
      icon:      '⚡',
      bg:        'rgba(58,140,255,0.08)',
      border:    'rgba(58,140,255,0.25)',
      active:    true,
      // Admin iniciou o serviço — SLA CORRE A PARTIR DO started_at
      // Exibe: countdown real baseado em started_at
    },
    completed: {
      label:     'Concluído',
      color:     '#22c55e',
      glow:      'rgba(34,197,94,0.45)',
      textColor: '#4ade80',
      icon:      '✅',
      bg:        'rgba(34,197,94,0.08)',
      border:    'rgba(34,197,94,0.25)',
      active:    false,
    },
    cancelled: {
      label:     'Cancelado',
      color:     '#ef4444',
      glow:      'rgba(239,68,68,0.35)',
      textColor: '#f87171',
      icon:      '✕',
      bg:        'rgba(239,68,68,0.07)',
      border:    'rgba(239,68,68,0.2)',
      active:    false,
    },
  };

  // ── Retrocompatibilidade com código legado ─────────────────────────────
  // Mapeia status antigos que podem vir do banco (campo status original)
  // para os novos estados v3. Usado durante período de transição.
  const LEGACY_STATUS_MAP = {
    pendente:     'waiting_queue',
    confirmado:   'waiting_queue',
    preparacao:   'in_progress',
    em_andamento: 'in_progress',
    parcial:      'in_progress',
    entregue:     'completed',
    concluido:    'completed',
    cancelado:    'cancelled',
    deleted:      'cancelled',
  };

  /**
   * Normaliza status: se vier um status legado, converte para v3.
   * Se já for v3, retorna como está.
   */
  function normalizeStatus(rawStatus) {
    if (!rawStatus) return 'waiting_queue';
    if (STATUS_CONFIG[rawStatus]) return rawStatus;
    return LEGACY_STATUS_MAP[rawStatus] || 'waiting_queue';
  }

  // ── Cálculo de SLA ─────────────────────────────────────────────────────

  /**
   * Calcula os dias de SLA para um tipo e quantidade de serviço.
   * Espelha a função calc_sla_days() do banco — ambos devem estar em sync.
   *
   * @param {string} serviceType  - 'normal_package' | 'pokemon_sr'
   * @param {number} qty          - Quantidade de unidades/pacotes
   * @returns {{ minDays: number, maxDays: number, label: string }}
   *
   * Exemplos:
   *   normal_package, qty=1 → { minDays:4,  maxDays:7,  label:"4~7 dias" }
   *   normal_package, qty=3 → { minDays:12, maxDays:21, label:"12~21 dias" }
   *   pokemon_sr, qty=2     → { minDays:50, maxDays:80, label:"50~80 dias" }
   */
  function calcSLA(serviceType, qty) {
    const cfg = SLA_CONFIG[serviceType] || SLA_CONFIG.normal_package;
    const n = Math.max(1, parseInt(qty, 10) || 1);
    const minDays = cfg.minPerUnit * n;
    const maxDays = cfg.maxPerUnit * n;
    return {
      minDays,
      maxDays,
      label: `${minDays}~${maxDays} dias`,
    };
  }

  // ── Sistema de Fila ────────────────────────────────────────────────────

  /**
   * Retorna a fila ativa ordenada por created_at ASC.
   * ORDEM CRONOLÓGICA ABSOLUTA — baseada em milissegundos.
   * Quem pediu primeiro aparece primeiro, SEMPRE.
   *
   * IMPORTANTE: A ordem de exibição na fila NÃO muda baseada em qual
   * pedido o admin escolheu iniciar primeiro. Um pedido pode estar em
   * in_progress mas aparece na posição #3 se foi criado em 3º lugar.
   */
  function getActiveQueue(allOrders) {
    return allOrders
      .filter(o => isActiveStatus(normalizeStatus(o.status_v3 || o.status)))
      .sort((a, b) => {
        // Ordenação por created_at com precisão de milissegundo
        const ta = new Date(a.createdAt || a.created_at).getTime();
        const tb = new Date(b.createdAt || b.created_at).getTime();
        if (ta !== tb) return ta - tb;
        // Desempate por ID (estável se mesmo milissegundo — improvável mas seguro)
        return String(a.id).localeCompare(String(b.id));
      });
  }

  /**
   * Calcula a posição de um pedido na fila ativa.
   * Retorna null para pedidos inativos (completed/cancelled).
   *
   * Posição é baseada em created_at ASC — NÃO no ID do banco.
   * Pedidos concluídos saem da fila e as posições se re-numeram automaticamente.
   */
  function calcQueuePosition(orderId, allOrders) {
    const queue = getActiveQueue(allOrders);
    const idx = queue.findIndex(o => o.id === orderId);
    return idx === -1 ? null : idx + 1;
  }

  // ── Cálculo de ETA ─────────────────────────────────────────────────────

  /**
   * Calcula o ETA para um pedido.
   *
   * REGRA: ETA só existe se o pedido estiver in_progress E tiver started_at.
   * Para waiting_queue: retorna null (sem ETA — SLA não começou).
   *
   * O ETA é calculado com base em:
   *   eta_min = started_at + sla_min_days
   *   eta_max = started_at + sla_max_days
   *
   * @param {Object} order - O pedido completo
   * @returns {Object|null} - Objeto ETA ou null se não aplicável
   */
  function calcETA(order) {
    const status = normalizeStatus(order.status_v3 || order.status);

    // ETA só existe para pedidos que foram INICIADOS
    if (status !== 'in_progress') return null;

    const startedAt = order.started_at || order.startedAt;
    if (!startedAt) return null; // Segurança: in_progress sem started_at (não deveria acontecer)

    const slaMin = order.sla_min_days || order.slaMinDays;
    const slaMax = order.sla_max_days || order.slaMaxDays;

    if (!slaMin || !slaMax) {
      // Fallback: recalcula se não tiver SLA salvo
      const sla = calcSLA(order.service_type || 'normal_package', order.service_quantity || 1);
      return _buildETA(new Date(startedAt), sla.minDays, sla.maxDays);
    }

    return _buildETA(new Date(startedAt), slaMin, slaMax);
  }

  /**
   * Constrói o objeto ETA com todas as informações de exibição.
   * @private
   */
  function _buildETA(startedAt, minDays, maxDays) {
    const now = Date.now();
    const startMs = startedAt.getTime();
    const elapsedMs = now - startMs;
    const elapsedDays = elapsedMs / 86400000;

    const etaMinDate = new Date(startMs + minDays * 86400000);
    const etaMaxDate = new Date(startMs + maxDays * 86400000);

    const daysRemainingMin = minDays - elapsedDays;
    const daysRemainingMax = maxDays - elapsedDays;

    // Progresso percentual (baseado no máximo para ser conservador)
    const progressPct = Math.min(100, Math.round((elapsedDays / maxDays) * 100));

    // Status do SLA
    let slaStatus;
    if (elapsedDays > maxDays) {
      slaStatus = 'overdue';    // Passou do prazo máximo
    } else if (elapsedDays > minDays) {
      slaStatus = 'within_max'; // Passou do mínimo mas dentro do máximo
    } else {
      slaStatus = 'on_track';   // Dentro do prazo mínimo
    }

    // Label amigável
    let label;
    if (slaStatus === 'overdue') {
      const daysOver = Math.ceil(elapsedDays - maxDays);
      label = `Atrasado ${daysOver}d`;
    } else {
      const dMin = Math.ceil(daysRemainingMin);
      const dMax = Math.ceil(daysRemainingMax);
      if (dMin <= 0 && dMax > 0) {
        label = `Até ${dMax}d restantes`;
      } else if (dMin > 0) {
        label = `${dMin}~${dMax} dias restantes`;
      } else {
        label = 'Concluindo em breve';
      }
    }

    return {
      startedAt,
      minDays,
      maxDays,
      etaMinDate,
      etaMaxDate,
      elapsedDays: Math.round(elapsedDays * 10) / 10,
      daysRemainingMin: Math.max(0, Math.ceil(daysRemainingMin)),
      daysRemainingMax: Math.max(0, Math.ceil(daysRemainingMax)),
      progressPct,
      slaStatus,   // 'on_track' | 'within_max' | 'overdue'
      label,
      etaMinLabel: _formatDate(etaMinDate),
      etaMaxLabel: _formatDate(etaMaxDate),
    };
  }

  // ── Formatação de Datas ────────────────────────────────────────────────

  function _formatDate(date) {
    if (!date) return '';
    return date.toLocaleDateString('pt-BR', {
      day:   '2-digit',
      month: '2-digit',
      year:  'numeric',
    });
  }

  function formatRelativeTime(isoString) {
    if (!isoString) return '';
    const diff = Date.now() - new Date(isoString).getTime();
    const min  = Math.floor(diff / 60000);
    const h    = Math.floor(diff / 3600000);
    const d    = Math.floor(diff / 86400000);
    if (min < 1)  return 'agora';
    if (min < 60) return `há ${min}min`;
    if (h < 24)   return `há ${h}h`;
    if (d === 1)  return 'ontem';
    if (d < 7)    return `há ${d} dias`;
    return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  function formatDate(isoString) {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function formatQueuePosition(position) {
    if (position === null || position === undefined) return null;
    return '#' + position;
  }

  // ── Verificação de Status ──────────────────────────────────────────────

  function isActiveStatus(status) {
    return ACTIVE_STATUSES.has(normalizeStatus(status));
  }

  function isInactiveStatus(status) {
    return INACTIVE_STATUSES.has(normalizeStatus(status));
  }

  // ── Cálculos de Progresso (itens) ─────────────────────────────────────

  function calcOrderProgress(order) {
    if (!order.items || !order.items.length) return 0;
    const total = order.items.reduce((s, it) => s + (it.qtdTotal || 1), 0);
    const done  = order.items.reduce((s, it) => s + (it.qtdEntregue || 0), 0);
    return total === 0 ? 0 : Math.round((done / total) * 100);
  }

  function calcItemProgress(item) {
    if (!item.qtdTotal) return 0;
    return Math.round(((item.qtdEntregue || 0) / item.qtdTotal) * 100);
  }

  function progressBarColor(pct) {
    if (pct >= 100) return '#22c55e';
    if (pct >= 60)  return '#a855f7';
    if (pct >= 30)  return '#3a8cff';
    return '#f5c542';
  }

  function canUserCancel(order, userId) {
    return order.userId === userId
      && normalizeStatus(order.status_v3 || order.status) === 'waiting_queue';
  }

  function formatOrderNumber(num) {
    return '#' + String(num).padStart(4, '0');
  }

  // ── API Pública ────────────────────────────────────────────────────────

  return {
    // Constantes
    ACTIVE_STATUSES,
    INACTIVE_STATUSES,
    SLA_CONFIG,
    STATUS_CONFIG,

    // Status
    normalizeStatus,
    isActiveStatus,
    isInactiveStatus,
    getStatusConfig: (s) => STATUS_CONFIG[normalizeStatus(s)] || STATUS_CONFIG.waiting_queue,
    getAllStatuses: () => Object.entries(STATUS_CONFIG).map(([key, val]) => ({ key, ...val })),

    // Fila
    getActiveQueue,
    calcQueuePosition,
    formatQueuePosition,

    // SLA e ETA (a parte mais importante da v3)
    calcSLA,
    calcETA,

    // Progresso de itens
    calcOrderProgress,
    calcItemProgress,
    canUserCancel,
    progressBarColor,

    // Formatação
    formatOrderNumber,
    formatRelativeTime,
    formatDate,
  };
})();
