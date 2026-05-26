// ============================================================
// sla-realtime-ui.js — v1
// PokeAlliance Shop
//
// Sistema visual premium de SLA/Timer Realtime para pedidos.
// Estética: sci-fi neon / MMORPG dashboard / SaaS moderno.
//
// FUNCIONALIDADES:
//   - Barra de SLA animada com glow dinâmico
//   - Badge LIVE pulsante nos cards in_progress
//   - Mini ring timer circular
//   - Timer decorrido calculado a partir de started_at (persistente)
//   - Estados visuais: on_track (azul) → warning (amarelo) → overdue (vermelho pulsante)
//   - Timeline visual do pedido (criado → iniciado → andamento → finalizado)
//   - Tooltip detalhado ao hover
//   - Tick automático a cada minuto (sem reload)
//   - Duração real ao completar (concluído em Xd / com atraso +Xd)
//
// INTEGRAÇÃO:
//   - Não altera nenhuma lógica existente
//   - Injeta HTML/CSS em cards já renderizados pelo OrdersUI
//   - Escuta CustomEvent 'pedidos:changed' para atualizar automaticamente
//   - Escuta OrdersUI.render() via MutationObserver nos cards
//
// DEPENDÊNCIAS:
//   orders-progress.js  → calcETA, calcSLA, normalizeStatus
//   orders-ui.js        → deve carregar antes (gera os cards)
//   realtime-manager.js → (opcional) escuta pedidos:changed
//
// ORDEM NO HTML:
//   <script src="orders-ui.js"></script>
//   ...
//   <script src="sla-realtime-ui.js"></script>
// ============================================================

;(function (global) {
  'use strict';

  // ══════════════════════════════════════════════════════════
  // CONSTANTES DE DESIGN
  // ══════════════════════════════════════════════════════════

  var COLORS = {
    on_track:   { bar: '#3a8cff', glow: 'rgba(58,140,255,0.6)',  text: '#60aaff', ring: '#3a8cff', badge: '#3a8cff' },
    within_max: { bar: '#f5c542', glow: 'rgba(245,197,66,0.6)',  text: '#ffd166', ring: '#f5c542', badge: '#f5c542' },
    overdue:    { bar: '#ef4444', glow: 'rgba(239,68,68,0.7)',   text: '#f87171', ring: '#ef4444', badge: '#ef4444' },
    completed:  { bar: '#22c55e', glow: 'rgba(34,197,94,0.5)',   text: '#4ade80', ring: '#22c55e', badge: '#22c55e' },
    late:       { bar: '#ef4444', glow: 'rgba(239,68,68,0.5)',   text: '#f87171', ring: '#ef4444', badge: '#ef4444' },
  };

  // Threshold (% do SLA) para mudar estado visual
  var WARNING_THRESHOLD = 0.75;  // amarelo a partir de 75%

  // ══════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════

  // FASE 5.2.1: _fmtDuration delega para PA.pipeline.formatDuration (engine central).
  // Mantém lógica local idêntica como fallback para garantir compatibilidade total.
  function _fmtDuration(ms) {
    if (window.PA && window.PA.pipeline && typeof window.PA.pipeline.formatDuration === 'function') {
      if (window.PA.telemetry) window.PA.telemetry.push('temporal_engine_used', { module: 'sla-realtime-ui' });
      return window.PA.pipeline.formatDuration(ms);
    }
    // Fallback local (comportamento idêntico ao engine central)
    if (!ms || ms < 0) return '0m';
    var totalMin = Math.floor(Math.abs(ms) / 60000);
    var d = Math.floor(totalMin / 1440);
    var h = Math.floor((totalMin % 1440) / 60);
    var m = totalMin % 60;
    var parts = [];
    if (d > 0) parts.push(d + 'd');
    if (h > 0) parts.push(h + 'h');
    if (d === 0) parts.push(m + 'm');
    return parts.join(' ') || '0m';
  }

  function _fmtDate(isoStr) {
    if (!isoStr) return '—';
    var d = new Date(isoStr);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function _calcSLAMs(order) {
    // Primeiro usa sla_hours do banco; fallback em sla_min_days/sla_max_days; fallback no tipo
    if (order.sla_hours) return order.sla_hours * 3600000;
    var slaMax = order.sla_max_days || order.sla_min_days;
    if (slaMax) return slaMax * 86400000;
    // Fallback pelo tipo de serviço
    var type = order.service_type || 'normal_package';
    var qty  = parseInt(order.service_quantity || 1, 10);
    if (type === 'pokemon_sr') return qty * 45 * 86400000;
    return qty * 7 * 86400000; // normal_package: 7 dias por pacote
  }

  function _getSLAState(elapsedMs, slaMs) {
    var pct = slaMs > 0 ? elapsedMs / slaMs : 1;
    if (pct > 1)                   return 'overdue';
    if (pct >= WARNING_THRESHOLD)  return 'within_max';
    return 'on_track';
  }

  // Calcula dados SLA completos para um pedido
  function _slaData(order) {
    var startedAt = order.started_at || order.startedAt;
    if (!startedAt) return null;

    var slaMs     = _calcSLAMs(order);
    var startMs   = new Date(startedAt).getTime();
    var now       = Date.now();
    var elapsedMs = now - startMs;
    var remainMs  = slaMs - elapsedMs;
    var pct       = Math.min(100, Math.round((elapsedMs / slaMs) * 100));
    var state     = _getSLAState(elapsedMs, slaMs);
    var colors    = COLORS[state];

    return {
      startedAt:   startedAt,
      slaMs:       slaMs,
      elapsedMs:   elapsedMs,
      remainMs:    remainMs,
      pct:         pct,
      state:       state,
      colors:      colors,
      elapsedFmt:  _fmtDuration(elapsedMs),
      remainFmt:   remainMs > 0 ? _fmtDuration(remainMs) : _fmtDuration(-remainMs),
      overdue:     remainMs <= 0,
    };
  }

  // ══════════════════════════════════════════════════════════
  // SVG RING TIMER
  // (mini circular progress, 32x32px)
  // ══════════════════════════════════════════════════════════

  function _buildRingHTML(pct, color, glow) {
    var r = 12;
    var circ = 2 * Math.PI * r; // ~75.4
    var fill = circ * (1 - pct / 100);
    var dasharray = circ.toFixed(1);
    var dashoffset = fill.toFixed(1);
    return (
      '<svg class="sla-ring" width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="16" cy="16" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="3"/>' +
        '<circle cx="16" cy="16" r="' + r + '" fill="none"' +
          ' stroke="' + color + '"' +
          ' stroke-width="3"' +
          ' stroke-linecap="round"' +
          ' stroke-dasharray="' + dasharray + '"' +
          ' stroke-dashoffset="' + dashoffset + '"' +
          ' transform="rotate(-90 16 16)"' +
          ' style="filter:drop-shadow(0 0 4px ' + glow + '); transition: stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1), stroke 0.6s;"/>' +
      '</svg>'
    );
  }

  // ══════════════════════════════════════════════════════════
  // BADGE LIVE
  // ══════════════════════════════════════════════════════════

  function _buildLiveBadgeHTML(color) {
    return (
      '<span class="sla-live-badge" style="--badge-color:' + color + '">' +
        '<span class="sla-live-dot"></span>' +
        'LIVE' +
      '</span>'
    );
  }

  // ══════════════════════════════════════════════════════════
  // TOOLTIP
  // ══════════════════════════════════════════════════════════

  function _buildTooltipContent(order, sla) {
    var slaHours = order.sla_hours || Math.round(sla.slaMs / 3600000);
    var lines = [
      '⏱ Iniciado: ' + _fmtDate(order.started_at),
      '⌛ Decorrido: ' + sla.elapsedFmt,
      '📋 SLA total: ' + slaHours + 'h (' + Math.round(slaHours / 24) + 'd)',
    ];
    if (sla.overdue) {
      lines.push('🔴 Expirado há: ' + sla.remainFmt);
    } else {
      lines.push('🟢 Restante: ' + sla.remainFmt);
      lines.push('📅 Prazo: ' + _fmtDate(new Date(new Date(order.started_at).getTime() + sla.slaMs).toISOString()));
    }
    lines.push('📊 Consumido: ' + sla.pct + '%');
    return lines.join('\n');
  }

  // ══════════════════════════════════════════════════════════
  // TIMELINE DO PEDIDO
  // ══════════════════════════════════════════════════════════

  function _buildTimelineHTML(order) {
    var status = typeof OrdersProgress !== 'undefined'
      ? OrdersProgress.normalizeStatus(order.status_v3 || order.status)
      : (order.status_v3 || order.status || 'waiting_queue');

    var steps = [
      {
        key:    'created',
        icon:   '✓',
        label:  'Pedido criado',
        ts:     order.createdAt || order.created_at,
        done:   true,
      },
      {
        key:    'started',
        icon:   order.started_at ? '✓' : '○',
        label:  'Serviço iniciado',
        ts:     order.started_at,
        done:   !!order.started_at,
        active: status === 'in_progress' && !order.completed_at,
      },
      {
        key:    'progress',
        icon:   status === 'in_progress' ? '⏳' : (status === 'completed' ? '✓' : '○'),
        label:  'Em andamento',
        ts:     null,
        done:   status === 'completed',
        active: status === 'in_progress',
      },
      {
        key:    'done',
        icon:   order.completed_at ? '✓' : '□',
        label:  'Finalizado',
        ts:     order.completed_at || order.completedAt,
        done:   !!order.completed_at,
      },
    ];

    var html = '<div class="sla-timeline">';
    html += '<div class="sla-timeline-title">⚡ Timeline do Serviço</div>';
    html += '<div class="sla-timeline-steps">';

    steps.forEach(function (step, i) {
      var cls = 'sla-tl-step';
      if (step.done)   cls += ' done';
      if (step.active) cls += ' active';

      html += '<div class="' + cls + '">';

      // Linha conectora (não no último)
      if (i < steps.length - 1) {
        html += '<div class="sla-tl-line' + (step.done ? ' done' : '') + '"></div>';
      }

      html += '<div class="sla-tl-dot">' + step.icon + '</div>';
      html += '<div class="sla-tl-content">';
      html += '<div class="sla-tl-label">' + step.label + '</div>';
      if (step.ts) {
        html += '<div class="sla-tl-ts">' + _fmtDate(step.ts) + '</div>';
      } else if (step.active) {
        html += '<div class="sla-tl-ts active">agora</div>';
      }
      html += '</div>';
      html += '</div>';
    });

    html += '</div></div>';
    return html;
  }

  // ══════════════════════════════════════════════════════════
  // BLOCO SLA PRINCIPAL (injeta no card)
  // ══════════════════════════════════════════════════════════

  function _buildSLABlockHTML(order, sla) {
    var c = sla.colors;
    var ringHTML  = _buildRingHTML(sla.pct, c.ring, c.glow);
    var liveHTML  = _buildLiveBadgeHTML(c.badge);
    var statusLabel = sla.overdue
      ? '⚠ SLA expirado há ' + sla.remainFmt
      : (sla.state === 'within_max'
          ? '⚡ ' + sla.remainFmt + ' restantes'
          : '✅ ' + sla.remainFmt + ' restantes');

    var tooltipTxt = _buildTooltipContent(order, sla);

    var barExtra = sla.overdue
      ? ' sla-bar--overdue'
      : (sla.state === 'within_max' ? ' sla-bar--warning' : '');

    var html = (
      '<div class="sla-block" data-sla-id="' + (order._supabaseId || order.orderNumber || order.id) + '"' +
        ' title="' + tooltipTxt.replace(/"/g, '&quot;') + '">' +

        // Top row: ring + info + live badge
        '<div class="sla-top">' +
          ringHTML +
          '<div class="sla-info">' +
            '<div class="sla-elapsed" style="color:' + c.text + '">' +
              '<span class="sla-elapsed-num" data-sla-elapsed>' + sla.elapsedFmt + '</span>' +
              '<span class="sla-elapsed-label"> decorridos</span>' +
            '</div>' +
            '<div class="sla-status-label" style="color:' + c.text + '">' + statusLabel + '</div>' +
          '</div>' +
          liveHTML +
        '</div>' +

        // Barra de progresso SLA
        '<div class="sla-bar-wrap">' +
          '<div class="sla-bar-header">' +
            '<span class="sla-bar-label">SLA</span>' +
            '<span class="sla-bar-pct" style="color:' + c.text + '" data-sla-pct>' + sla.pct + '%</span>' +
          '</div>' +
          '<div class="sla-bar' + barExtra + '">' +
            '<div class="sla-bar-track">' +
              '<div class="sla-bar-fill" data-sla-fill' +
                ' style="width:' + sla.pct + '%;' +
                ' background:linear-gradient(90deg,' + c.bar + ',' + c.glow + ');' +
                ' box-shadow:0 0 12px ' + c.glow + ';' +
                ' --bar-color:' + c.bar + ';' +
                ' --bar-glow:' + c.glow + '">' +
                '<div class="sla-bar-shimmer"></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

      '</div>'
    );

    return html;
  }

  // Bloco para pedido CONCLUÍDO
  function _buildCompletedBlockHTML(order) {
    var durMin = order.actual_duration_minutes;
    var wasLate = order.expired === true;
    var durMs = null;

    if (durMin) {
      durMs = durMin * 60000;
    } else if (order.started_at && (order.completed_at || order.completedAt)) {
      var completedTs = order.completed_at || order.completedAt;
      durMs = new Date(completedTs).getTime() - new Date(order.started_at).getTime();
    }

    if (!durMs) return '';

    var durFmt = _fmtDuration(durMs);
    var slaMs  = _calcSLAMs(order);
    var overMs = durMs - slaMs;
    var overFmt = overMs > 0 ? _fmtDuration(overMs) : '';

    var c = wasLate ? COLORS.late : COLORS.completed;

    return (
      '<div class="sla-block sla-block--completed">' +
        '<div class="sla-top">' +
          '<div class="sla-completed-icon" style="color:' + c.text + '">' +
            (wasLate ? '⚠' : '✅') +
          '</div>' +
          '<div class="sla-info">' +
            '<div class="sla-elapsed" style="color:' + c.text + '">' +
              (wasLate
                ? 'Concluído com atraso <span class="sla-late-badge">+' + overFmt + '</span>'
                : 'Concluído em <strong>' + durFmt + '</strong>'
              ) +
            '</div>' +
            '<div class="sla-status-label" style="color:rgba(255,255,255,0.4);">' +
              _fmtDate(order.completed_at || order.completedAt) +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  // ══════════════════════════════════════════════════════════
  // INJECTOR — aplica nos cards do DOM
  // ══════════════════════════════════════════════════════════

  function _injectIntoCard(cardEl, order) {
    var status = typeof OrdersProgress !== 'undefined'
      ? OrdersProgress.normalizeStatus(order.status_v3 || order.status)
      : (order.status_v3 || order.status);

    // Remove bloco anterior se existir
    var existing = cardEl.querySelector('.sla-block, .sla-timeline');
    if (existing) existing.remove();

    var slaHTML = '';
    var timelineHTML = '';

    if (status === 'in_progress' && order.started_at) {
      var sla = _slaData(order);
      if (sla) {
        slaHTML = _buildSLABlockHTML(order, sla);
        timelineHTML = _buildTimelineHTML(order);

        // Adiciona classe visual ao card conforme estado do SLA
        cardEl.classList.remove('sla-state--on_track', 'sla-state--within_max', 'sla-state--overdue');
        cardEl.classList.add('sla-state--' + sla.state);

        // Intensifica o border-left
        var borderColor = {
          on_track:   'rgba(58,140,255,0.8)',
          within_max: 'rgba(245,197,66,0.8)',
          overdue:    'rgba(239,68,68,0.9)',
        }[sla.state] || 'rgba(58,140,255,0.8)';
        cardEl.style.borderLeftColor = borderColor;
        cardEl.style.borderLeftWidth = '3px';
      }
    } else if (status === 'completed' && order.started_at) {
      slaHTML = _buildCompletedBlockHTML(order);
      timelineHTML = _buildTimelineHTML(order);
    }

    if (!slaHTML) return;

    // Injeta SLA block DEPOIS da barra de progresso existente
    var progressSection = cardEl.querySelector('.order-progress-section');
    if (progressSection) {
      progressSection.insertAdjacentHTML('afterend', slaHTML);
    } else {
      // Fallback: antes dos itens
      var itemsSection = cardEl.querySelector('.order-items-section');
      if (itemsSection) itemsSection.insertAdjacentHTML('beforebegin', slaHTML);
    }

    // Timeline: injeta antes do footer
    if (timelineHTML) {
      var footer = cardEl.querySelector('.order-card-footer');
      if (footer) footer.insertAdjacentHTML('beforebegin', timelineHTML);
    }

    // Agenda ticker para cards in_progress
    if (status === 'in_progress') {
      _scheduleTick(cardEl, order);
    }
  }

  // ── Ticker: atualiza elapsed e barra a cada minuto ────────────────────
  function _scheduleTick(cardEl, order) {
    // Guarda orderId no element para reconciliação
    var orderId = order._supabaseId || order.orderNumber || order.id;

    // Impede múltiplos tickers no mesmo card
    if (cardEl._slaTickerRunning) return;
    cardEl._slaTickerRunning = true;

    var iv = setInterval(function () {
      // Para se o card saiu do DOM
      if (!document.contains(cardEl)) { clearInterval(iv); cardEl._slaTickerRunning = false; return; }

      // Fase 5.2.3 T2: pausa ticker para cards fora da viewport (virtual SLA)
      if (cardEl._slaTickerPaused) return;

      var sla = _slaData(order);
      if (!sla) { clearInterval(iv); cardEl._slaTickerRunning = false; return; }

      // Atualiza elapsed text
      var elapsedEl = cardEl.querySelector('[data-sla-elapsed]');
      if (elapsedEl) elapsedEl.textContent = sla.elapsedFmt;

      // Atualiza pct
      var pctEl = cardEl.querySelector('[data-sla-pct]');
      if (pctEl) pctEl.textContent = sla.pct + '%';

      // Atualiza barra fill
      var fillEl = cardEl.querySelector('[data-sla-fill]');
      if (fillEl) {
        fillEl.style.width = sla.pct + '%';
        var c = sla.colors;
        fillEl.style.background = 'linear-gradient(90deg,' + c.bar + ',' + c.glow + ')';
        fillEl.style.boxShadow  = '0 0 12px ' + c.glow;
      }

      // Atualiza ring
      var ringFill = cardEl.querySelector('.sla-ring circle:last-child');
      if (ringFill) {
        var r     = 12;
        var circ  = 2 * Math.PI * r;
        var offs  = circ * (1 - sla.pct / 100);
        ringFill.setAttribute('stroke-dashoffset', offs.toFixed(1));
        ringFill.setAttribute('stroke', sla.colors.ring);
      }

      // Muda classe de estado se necessário
      var prevState = ['on_track','within_max','overdue'].find(function (s) {
        return cardEl.classList.contains('sla-state--' + s);
      });
      if (prevState !== sla.state) {
        cardEl.classList.remove('sla-state--' + prevState);
        cardEl.classList.add('sla-state--' + sla.state);
      }

    }, 60000); // tick a cada 60s

    // Cleanup quando card sair do DOM
    var obs = new MutationObserver(function () {
      if (!document.contains(cardEl)) {
        clearInterval(iv);
        obs.disconnect();
        cardEl._slaTickerRunning = false;
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  // ══════════════════════════════════════════════════════════
  // SCAN: percorre todos os cards e injeta
  // ══════════════════════════════════════════════════════════

  function _scanAndInject() {
    var cards = document.querySelectorAll('.order-card');
    if (!cards.length) return;

    cards.forEach(function (cardEl) {
      var orderId = cardEl.dataset.orderId;
      if (!orderId) return;

      // Recupera o pedido do OrdersStorage
      var order = null;
      if (typeof OrdersStorage !== 'undefined' && typeof OrdersStorage.getOrderById === 'function') {
        order = OrdersStorage.getOrderById(orderId);
      }
      if (!order) return;

      // Só injeta em cards que tenham o started_at
      var status = typeof OrdersProgress !== 'undefined'
        ? OrdersProgress.normalizeStatus(order.status_v3 || order.status)
        : (order.status_v3 || order.status);

      if (status !== 'in_progress' && status !== 'completed') return;

      _injectIntoCard(cardEl, order);
    });
  }

  // ══════════════════════════════════════════════════════════
  // OBSERVER: detecta quando OrdersUI re-renderiza os cards
  // ══════════════════════════════════════════════════════════

  function _attachObserver() {
    var lista = document.getElementById('pedidos-lista');
    if (!lista) {
      // Aguarda o container aparecer
      setTimeout(_attachObserver, 500);
      return;
    }

    var obs = new MutationObserver(function (mutations) {
      var hasNewCards = mutations.some(function (m) {
        return Array.from(m.addedNodes).some(function (n) {
          return n.nodeType === 1 && (n.classList.contains('order-card') || n.querySelector('.order-card'));
        });
      });
      if (hasNewCards) {
        // Pequeno delay para garantir que o innerHTML do card está completo
        setTimeout(_scanAndInject, 80);
      }
    });

    obs.observe(lista, { childList: true, subtree: true });

    // Scan inicial
    setTimeout(_scanAndInject, 200);
  }

  // ══════════════════════════════════════════════════════════
  // ESTILOS CSS
  // ══════════════════════════════════════════════════════════

  function _injectStyles() {
    if (document.getElementById('sla-realtime-ui-styles')) return;
    var style = document.createElement('style');
    style.id = 'sla-realtime-ui-styles';
    style.textContent = [

      /* ── CARD STATES ───────────────────────────────── */
      '.sla-state--overdue {',
      '  animation: sla-pulse-red 2.4s ease-in-out infinite;',
      '}',
      '@keyframes sla-pulse-red {',
      '  0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }',
      '  50%      { box-shadow: 0 0 0 6px rgba(239,68,68,0.18), 0 0 20px rgba(239,68,68,0.08); }',
      '}',
      '.sla-state--within_max {',
      '  box-shadow: 0 0 0 1px rgba(245,197,66,0.15);',
      '}',

      /* ── SLA BLOCK ──────────────────────────────────── */
      '.sla-block {',
      '  margin: 10px 0 8px;',
      '  padding: 12px 14px;',
      '  border-radius: 12px;',
      '  background: rgba(255,255,255,0.025);',
      '  border: 1px solid rgba(255,255,255,0.07);',
      '  position: relative;',
      '  overflow: hidden;',
      '}',
      '.sla-block::before {',
      '  content:"";',
      '  position:absolute;',
      '  inset:0;',
      '  background: linear-gradient(135deg, rgba(58,140,255,0.04) 0%, transparent 60%);',
      '  pointer-events:none;',
      '}',
      '.sla-block--completed {',
      '  background: rgba(34,197,94,0.04);',
      '  border-color: rgba(34,197,94,0.15);',
      '}',

      /* ── TOP ROW ───────────────────────────────────── */
      '.sla-top {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 10px;',
      '  margin-bottom: 10px;',
      '}',
      '.sla-info {',
      '  flex: 1;',
      '  min-width: 0;',
      '}',
      '.sla-elapsed {',
      '  font-size: 13px;',
      '  font-weight: 700;',
      '  font-family: var(--font-mono, "SF Mono", "Fira Code", monospace);',
      '  letter-spacing: 0.02em;',
      '  line-height: 1.3;',
      '}',
      '.sla-elapsed-label {',
      '  font-size: 10px;',
      '  font-weight: 400;',
      '  opacity: 0.5;',
      '  letter-spacing: 0.04em;',
      '}',
      '.sla-status-label {',
      '  font-size: 11px;',
      '  margin-top: 2px;',
      '  font-weight: 600;',
      '  letter-spacing: 0.01em;',
      '  font-family: var(--font-body, sans-serif);',
      '}',
      '.sla-completed-icon {',
      '  font-size: 22px;',
      '  line-height: 1;',
      '  flex-shrink: 0;',
      '}',
      '.sla-late-badge {',
      '  display: inline-block;',
      '  background: rgba(239,68,68,0.15);',
      '  color: #f87171;',
      '  border: 1px solid rgba(239,68,68,0.3);',
      '  border-radius: 6px;',
      '  padding: 1px 6px;',
      '  font-size: 11px;',
      '  font-weight: 700;',
      '  font-family: var(--font-mono, monospace);',
      '  margin-left: 4px;',
      '}',

      /* ── LIVE BADGE ────────────────────────────────── */
      '.sla-live-badge {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 4px;',
      '  padding: 3px 8px;',
      '  border-radius: 20px;',
      '  background: rgba(0,0,0,0.3);',
      '  border: 1px solid var(--badge-color, #3a8cff);',
      '  color: var(--badge-color, #3a8cff);',
      '  font-size: 9px;',
      '  font-weight: 800;',
      '  font-family: var(--font-mono, monospace);',
      '  letter-spacing: 0.12em;',
      '  flex-shrink: 0;',
      '  box-shadow: 0 0 8px rgba(58,140,255,0.2);',
      '  transition: border-color 0.5s, color 0.5s;',
      '}',
      '.sla-live-dot {',
      '  width: 5px;',
      '  height: 5px;',
      '  border-radius: 50%;',
      '  background: currentColor;',
      '  animation: sla-blink 1.4s ease-in-out infinite;',
      '  flex-shrink: 0;',
      '}',
      '@keyframes sla-blink {',
      '  0%,100% { opacity:1; transform:scale(1); }',
      '  50%      { opacity:0.3; transform:scale(0.7); }',
      '}',

      /* ── RING ──────────────────────────────────────── */
      '.sla-ring {',
      '  flex-shrink: 0;',
      '  filter: drop-shadow(0 0 3px rgba(58,140,255,0.4));',
      '  transition: filter 0.5s;',
      '}',

      /* ── PROGRESS BAR ──────────────────────────────── */
      '.sla-bar-wrap { position: relative; }',
      '.sla-bar-header {',
      '  display: flex;',
      '  justify-content: space-between;',
      '  align-items: center;',
      '  margin-bottom: 5px;',
      '}',
      '.sla-bar-label {',
      '  font-size: 9px;',
      '  font-weight: 700;',
      '  text-transform: uppercase;',
      '  letter-spacing: 0.1em;',
      '  color: rgba(255,255,255,0.3);',
      '  font-family: var(--font-mono, monospace);',
      '}',
      '.sla-bar-pct {',
      '  font-size: 11px;',
      '  font-weight: 700;',
      '  font-family: var(--font-mono, monospace);',
      '  transition: color 0.6s;',
      '}',
      '.sla-bar { position: relative; }',
      '.sla-bar-track {',
      '  height: 7px;',
      '  border-radius: 4px;',
      '  background: rgba(255,255,255,0.06);',
      '  overflow: hidden;',
      '  position: relative;',
      '}',
      '.sla-bar-fill {',
      '  height: 100%;',
      '  border-radius: 4px;',
      '  min-width: 4px;',
      '  position: relative;',
      '  transition: width 1.2s cubic-bezier(0.4,0,0.2,1), background 0.8s, box-shadow 0.8s;',
      '  overflow: hidden;',
      '}',
      '.sla-bar-shimmer {',
      '  position: absolute;',
      '  inset: 0;',
      '  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 45%, transparent 100%);',
      '  background-size: 200% 100%;',
      '  animation: sla-shimmer 2.2s linear infinite;',
      '}',
      '@keyframes sla-shimmer {',
      '  0%   { background-position: 200% 0; }',
      '  100% { background-position: -200% 0; }',
      '}',

      /* ── OVERDUE bar glow pulse ─────────────────────── */
      '.sla-bar--overdue .sla-bar-fill {',
      '  animation: sla-bar-throb 1.8s ease-in-out infinite;',
      '}',
      '@keyframes sla-bar-throb {',
      '  0%,100% { box-shadow: 0 0 8px rgba(239,68,68,0.5); }',
      '  50%      { box-shadow: 0 0 18px rgba(239,68,68,0.9), 0 0 28px rgba(239,68,68,0.3); }',
      '}',
      '.sla-bar--warning .sla-bar-fill {',
      '  animation: sla-bar-warn 2.5s ease-in-out infinite;',
      '}',
      '@keyframes sla-bar-warn {',
      '  0%,100% { box-shadow: 0 0 8px rgba(245,197,66,0.4); }',
      '  50%      { box-shadow: 0 0 14px rgba(245,197,66,0.7); }',
      '}',

      /* ── TIMELINE ──────────────────────────────────── */
      '.sla-timeline {',
      '  margin: 10px 0 8px;',
      '  padding: 12px 14px;',
      '  border-radius: 12px;',
      '  background: rgba(255,255,255,0.02);',
      '  border: 1px solid rgba(255,255,255,0.06);',
      '}',
      '.sla-timeline-title {',
      '  font-size: 9px;',
      '  font-weight: 800;',
      '  text-transform: uppercase;',
      '  letter-spacing: 0.12em;',
      '  color: rgba(255,255,255,0.25);',
      '  font-family: var(--font-mono, monospace);',
      '  margin-bottom: 12px;',
      '}',
      '.sla-timeline-steps {',
      '  display: flex;',
      '  flex-direction: row;',
      '  align-items: flex-start;',
      '  gap: 0;',
      '}',
      '.sla-tl-step {',
      '  display: flex;',
      '  flex-direction: column;',
      '  align-items: center;',
      '  flex: 1;',
      '  position: relative;',
      '}',
      '.sla-tl-line {',
      '  position: absolute;',
      '  top: 10px;',
      '  left: calc(50% + 10px);',
      '  right: calc(-50% + 10px);',
      '  height: 2px;',
      '  background: rgba(255,255,255,0.08);',
      '  border-radius: 1px;',
      '  z-index: 0;',
      '}',
      '.sla-tl-line.done {',
      '  background: linear-gradient(90deg, rgba(34,197,94,0.5), rgba(58,140,255,0.4));',
      '}',
      '.sla-tl-dot {',
      '  width: 22px;',
      '  height: 22px;',
      '  border-radius: 50%;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  font-size: 10px;',
      '  font-weight: 700;',
      '  border: 1.5px solid rgba(255,255,255,0.1);',
      '  background: rgba(255,255,255,0.05);',
      '  color: rgba(255,255,255,0.3);',
      '  z-index: 1;',
      '  position: relative;',
      '  transition: all 0.3s;',
      '  flex-shrink: 0;',
      '}',
      '.sla-tl-step.done .sla-tl-dot {',
      '  border-color: rgba(34,197,94,0.5);',
      '  background: rgba(34,197,94,0.1);',
      '  color: #4ade80;',
      '  box-shadow: 0 0 8px rgba(34,197,94,0.2);',
      '}',
      '.sla-tl-step.active .sla-tl-dot {',
      '  border-color: rgba(58,140,255,0.7);',
      '  background: rgba(58,140,255,0.12);',
      '  color: #60aaff;',
      '  box-shadow: 0 0 10px rgba(58,140,255,0.35);',
      '  animation: sla-ring-pulse 2s ease-in-out infinite;',
      '}',
      '@keyframes sla-ring-pulse {',
      '  0%,100% { box-shadow: 0 0 6px rgba(58,140,255,0.3); }',
      '  50%      { box-shadow: 0 0 14px rgba(58,140,255,0.6), 0 0 0 4px rgba(58,140,255,0.08); }',
      '}',
      '.sla-tl-content {',
      '  text-align: center;',
      '  margin-top: 5px;',
      '}',
      '.sla-tl-label {',
      '  font-size: 9px;',
      '  font-weight: 600;',
      '  color: rgba(255,255,255,0.35);',
      '  font-family: var(--font-body, sans-serif);',
      '  letter-spacing: 0.01em;',
      '  line-height: 1.3;',
      '  max-width: 60px;',
      '  word-break: break-word;',
      '}',
      '.sla-tl-step.done .sla-tl-label  { color: rgba(255,255,255,0.6); }',
      '.sla-tl-step.active .sla-tl-label { color: #60aaff; }',
      '.sla-tl-ts {',
      '  font-size: 8px;',
      '  font-family: var(--font-mono, monospace);',
      '  color: rgba(255,255,255,0.2);',
      '  margin-top: 2px;',
      '}',
      '.sla-tl-ts.active {',
      '  color: rgba(96,170,255,0.7);',
      '  animation: sla-blink 1.8s infinite;',
      '}',

      /* ── HOVER TOOLTIP (native) ─────────────────────── */
      '.sla-block[title]:hover {',
      '  border-color: rgba(255,255,255,0.12);',
      '}',

    ].join('\n');

    document.head.appendChild(style);
  }

  // ══════════════════════════════════════════════════════════
  // BOOTSTRAP
  // ══════════════════════════════════════════════════════════

  function _bootstrap() {
    _injectStyles();
    _attachObserver();

    // Escuta pedidos:changed para re-scan imediato
    global.addEventListener('pedidos:changed', function () {
      setTimeout(_scanAndInject, 120);
    });

    // Scan inicial após a aba de pedidos ser exibida
    global.addEventListener('orders:refresh', function () {
      setTimeout(_scanAndInject, 120);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _bootstrap, { once: true });
  } else {
    _bootstrap();
  }

  // ── API Pública ──────────────────────────────────────────
  global.SLARealtimeUI = {
    scan:  _scanAndInject,
    style: _injectStyles,
  };

  console.log('[SLARealtimeUI] módulo carregado.');

})(window);
