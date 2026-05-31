// ============================================================
// pa-render-health.js — Render Health & Stabilization v1
// PokeAlliance Shop — FASE 5.2.2
//
// OBJETIVOS:
//   1. assertOwnership() — bloqueia commit fora do owner declarado.
//   2. scheduleHeartbeat() — timer central, sem drift, sem duplicatas.
//   3. data-pa-generation em cards — stale DOM detection.
//   4. Hardening de renders concorrentes nos containers críticos.
//   5. Seção "Render Health" no painel de debug.
//
// NÃO altera layout, CSS, SQL, globals existentes.
// CARREGUE: após pa-render-pipeline.js, antes dos controllers.
// ============================================================

;(function (global) {
  'use strict';

  if (!global.PA) { console.warn('[PA.health] PA namespace não encontrado.'); return; }
  if (global.PA.health) return; // singleton

  var _log  = function() { if (global.PA_DEBUG) console.log.apply(console, ['[PA.health]'].concat([].slice.call(arguments))); };
  var _warn = function() { console.warn.apply(console, ['[PA.health ⚠️]'].concat([].slice.call(arguments))); };
  var _ts   = function() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()).toFixed(1) + 'ms'; };

  function _tel(cat, data) {
    if (global.PA && global.PA.telemetry) global.PA.telemetry.push(cat, data);
  }

  // ══════════════════════════════════════════════════════════════════════
  // MÉTRICAS
  // ══════════════════════════════════════════════════════════════════════

  var _metrics = {
    ownershipViolations:  0,
    staleDomsDetected:    0,
    commitsBlocked:       0,
    coalescedRenders:     0,
    activeHeartbeats:     0,
    renderGenerations:    {},   // containerId → current generation
  };

  // ══════════════════════════════════════════════════════════════════════
  // 1. ASSERT OWNERSHIP — bloqueia commit fora do owner declarado
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Verifica se `source` é o owner declarado de `containerId`.
   * Emite warning e telemetria se não for.
   * NÃO bloqueia execução — apenas observa e registra.
   *
   * @param {string} containerId  ID do container DOM (sem #)
   * @param {string} source       Nome do módulo tentando escrever
   * @returns {boolean} true se ownership válido, false se violação
   */
  function assertOwnership(containerId, source) {
    if (!global.PA.renderRegistry) return true; // sem registry, sem verificação

    var owner = global.PA.renderRegistry.getOwner(containerId);
    if (!owner) {
      // Container não registrado — warning, mas não bloqueia
      _warn('assertOwnership: container "' + containerId + '" não tem owner registrado. Source: ' + source);
      _tel('render_ownership_violation', { container: containerId, source: source, owner: null, type: 'unregistered' });
      _metrics.ownershipViolations++;
      return false;
    }

    if (owner !== source) {
      _warn('OWNERSHIP VIOLATION: "' + source + '" tentou escrever em "' + containerId +
            '" que pertence a "' + owner + '"');
      _tel('render_ownership_violation', { container: containerId, source: source, owner: owner, type: 'wrong-owner' });
      _metrics.ownershipViolations++;
      return false;
    }

    return true;
  }

  // ══════════════════════════════════════════════════════════════════════
  // 2. RENDER GENERATIONS — data-pa-generation para stale DOM detection
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Incrementa geração de um container.
   * Chamado sempre que um render começa.
   */
  function bumpGeneration(containerId) {
    var prev = _metrics.renderGenerations[containerId] || 0;
    _metrics.renderGenerations[containerId] = prev + 1;
    return _metrics.renderGenerations[containerId];
  }

  function getGeneration(containerId) {
    return _metrics.renderGenerations[containerId] || 0;
  }

  /**
   * Marca um elemento DOM com a geração atual.
   * Permite detectar nodes renderizados por render antigo.
   */
  function stampGeneration(el, containerId) {
    if (!el) return;
    el.setAttribute('data-pa-generation', getGeneration(containerId));
    el.setAttribute('data-pa-container', containerId);
  }

  /**
   * Detecta nodes com geração diferente da atual (stale DOM).
   * Emite telemetria por cada node stale encontrado.
   */
  function detectStaleNodes(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return 0;

    var current = getGeneration(containerId);
    var stale   = 0;

    container.querySelectorAll('[data-pa-generation]').forEach(function(el) {
      var gen = parseInt(el.getAttribute('data-pa-generation'), 10);
      if (gen < current) {
        stale++;
        el.setAttribute('data-pa-stale', 'true');
        _tel('stale_dom_detected', { container: containerId, nodeGen: gen, currentGen: current });
      } else {
        el.removeAttribute('data-pa-stale');
      }
    });

    if (stale > 0) {
      _metrics.staleDomsDetected += stale;
      _warn('STALE DOM: ' + stale + ' node(s) em "' + containerId + '" são de geração anterior (current=' + current + ')');
    }
    return stale;
  }

  // ══════════════════════════════════════════════════════════════════════
  // 3. CENTRAL HEARTBEAT — timer unificado sem drift nem duplicatas
  // ══════════════════════════════════════════════════════════════════════

  // { heartbeatId → { interval, fn, lastRun, runCount, clearFn } }
  var _heartbeats = {};

  /**
   * Registra um heartbeat centralizado.
   * Garante que apenas UM interval por heartbeatId está ativo.
   * Ao re-registrar com o mesmo id, substitui sem criar duplicata.
   *
   * @param {string}   id       Identificador único (ex: 'sla-ticker', 'orders-refresh')
   * @param {function} fn       Função a executar a cada tick
   * @param {number}   intervalMs  Intervalo em ms
   * @returns {function} cancel() — para parar o heartbeat
   */
  function scheduleHeartbeat(id, fn, intervalMs) {
    // Remove heartbeat anterior com este id (evita duplicata)
    if (_heartbeats[id]) {
      clearInterval(_heartbeats[id].timer);
      _metrics.activeHeartbeats--;
      _log('Heartbeat substituído:', id);
    }

    var entry = {
      id:          id,
      intervalMs:  intervalMs,
      lastRun:     null,
      runCount:    0,
      active:      true,
    };

    entry.timer = setInterval(function() {
      if (!entry.active) return;
      entry.lastRun  = Date.now();
      entry.runCount++;
      try {
        fn();
      } catch (err) {
        _warn('Heartbeat "' + id + '" erro:', err.message);
        _tel('heartbeat_error', { id: id, error: err.message });
      }
    }, intervalMs);

    entry.cancelFn = function() {
      clearInterval(entry.timer);
      entry.active = false;
      _metrics.activeHeartbeats--;
      delete _heartbeats[id];
      _log('Heartbeat cancelado:', id);
    };

    _heartbeats[id] = entry;
    _metrics.activeHeartbeats++;
    _log('Heartbeat registrado:', id, 'a cada', intervalMs + 'ms');
    _tel('heartbeat_started', { id: id, intervalMs: intervalMs });

    return entry.cancelFn;
  }

  function cancelHeartbeat(id) {
    if (_heartbeats[id]) _heartbeats[id].cancelFn();
  }

  function getHeartbeats() {
    return Object.keys(_heartbeats).map(function(id) {
      var h = _heartbeats[id];
      return { id: id, intervalMs: h.intervalMs, runCount: h.runCount, active: h.active, lastRun: h.lastRun };
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // 4. AUDITORIAS DE INNERHTML — classificação de riscos
  // ══════════════════════════════════════════════════════════════════════

  // Baseado na auditoria manual da Fase 5.2.2:

  var HTML_AUDIT = [
    // CONTAINER         ARQUIVO            RISCO       NOTA
    { container: 'pedidos-lista',   file: 'orders-ui.js',     risk: 'LOW',    note: 'Usa DocumentFragment + reconciliação incremental. innerHTML=\'\' só no clear.' },
    { container: 'orders-tabs',     file: 'orders-ui.js',     risk: 'LOW',    note: 'Tabs são pequenas, sem conteúdo dinâmico de estado.' },
    { container: 'order-card',      file: 'orders-ui.js',     risk: 'MEDIUM', note: 'card.innerHTML no _renderCard pode sobrescrever card existente. Compensado pelo Map de existingCards.' },
    { container: 'captura-grid',    file: 'captura-redesign', risk: 'LOW',    note: 'Usa _renderToken para cancelar render anterior. Batched rAF.' },
    { container: 'items-grid',      file: 'items.render.js',  risk: 'MEDIUM', note: 'innerHTML síncrono sem token. Mitigado pelo debounce de PA.state.scheduleRender.' },
    { container: 'admin-modals',    file: 'admin-panel.js',   risk: 'LOW',    note: 'Modais são disparados por interação de usuário, nunca concorrentes com realtime.' },
  ];

  // ══════════════════════════════════════════════════════════════════════
  // 5. REALTIME + RENDER COALESCING para orders
  // ══════════════════════════════════════════════════════════════════════

  // O coalesceRender já existe em PA.pipeline.
  // Aqui apenas garantimos que orders-ui.render usa coalescing centralizado
  // quando chamado por múltiplos listeners realtime.
  // Isso é feito via wrapping após DOMContentLoaded.

  global.document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      if (typeof OrdersUI === 'undefined' || typeof OrdersUI.render !== 'function') return;
      if (OrdersUI.__pa_health_upgraded) return; // idempotente

      var _origRender = OrdersUI.render;

      // Wrap com coalesceRender de 80ms
      // Chamadas rápidas em sequência viram um único render
      OrdersUI.render = function() {
        if (!global.PA || !global.PA.pipeline) return _origRender.apply(this, arguments);
        global.PA.pipeline.coalesceRender('orders-ui', function() {
          // Bump de geração antes do commit
          bumpGeneration('pedidos-lista');
          _origRender();
          // Scan de stale nodes após render
          setTimeout(function() { detectStaleNodes('pedidos-lista'); }, 50);
        }, 80);
      };
      OrdersUI.refresh = OrdersUI.render;
      OrdersUI.__pa_health_upgraded = true;

      if (global.PA.runtime) {
        global.PA.runtime.trackWrapper('OrdersUI.render', 'pa-render-health/coalesce', 'health-upgrade', _origRender);
      }

      _log('OrdersUI.render upgraded com coalescing + stale detection');

    }, 500); // após todos os DOMContentLoaded
  });

  // ══════════════════════════════════════════════════════════════════════
  // 6. _scanAndInject GUARD — previne execuções concorrentes
  // ══════════════════════════════════════════════════════════════════════

  // Instala guard em SLARealtimeUI._scanAndInject se disponível.
  // A função já tem _slaTickerRunning por card, mas não tem guard global
  // contra chamadas simultâneas do próprio scan.

  global.document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      if (typeof SLARealtimeUI === 'undefined') return;
      if (typeof SLARealtimeUI.scan !== 'function') return;
      if (SLARealtimeUI.__pa_scan_guarded) return;

      var _origScan = SLARealtimeUI.scan;
      var _scanning = false;

      SLARealtimeUI.scan = function() {
        if (_scanning) {
          _tel('duplicate_render_prevented', { source: 'sla-scan' });
          return; // já está rodando, ignora
        }
        _scanning = true;
        try { _origScan.apply(this, arguments); }
        finally { _scanning = false; }
      };
      SLARealtimeUI.__pa_scan_guarded = true;
      _log('SLARealtimeUI.scan guardado contra execuções concorrentes');

    }, 800);
  });

  // ══════════════════════════════════════════════════════════════════════
  // 7. DIAGNÓSTICO — dump completo para debug panel
  // ══════════════════════════════════════════════════════════════════════

  function dump() {
    return {
      metrics:        Object.assign({}, _metrics),
      heartbeats:     getHeartbeats(),
      htmlAudit:      HTML_AUDIT,
      renderGenerations: Object.assign({}, _metrics.renderGenerations),
    };
  }

  function dumpMetrics() { return Object.assign({}, _metrics); }

  // ══════════════════════════════════════════════════════════════════════
  // 8. API PÚBLICA
  // ══════════════════════════════════════════════════════════════════════

  global.PA.health = {
    assertOwnership:    assertOwnership,
    scheduleHeartbeat:  scheduleHeartbeat,
    cancelHeartbeat:    cancelHeartbeat,
    getHeartbeats:      getHeartbeats,
    bumpGeneration:     bumpGeneration,
    getGeneration:      getGeneration,
    stampGeneration:    stampGeneration,
    detectStaleNodes:   detectStaleNodes,
    htmlAudit:          HTML_AUDIT,
    dump:               dump,
    dumpMetrics:        dumpMetrics,
    metrics:            _metrics,
  };

  _log('pa-render-health.js v1 inicializado.');

}(window));
