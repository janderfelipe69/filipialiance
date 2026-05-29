// ============================================================
// pa-render-pipeline.js — Transactional Render Pipeline v1
// PokeAlliance Shop — FASE 5.2
//
// OBJETIVOS:
//   1. Render pipeline atômico: snapshot → render → commit único.
//   2. Locks por container: sem reentrada, sem render concorrente.
//   3. Stale render detection: versão do snapshot vs estado atual.
//   4. Realtime coalescing: N eventos → 1 render consistente.
//   5. Temporal engine centralizado: computeServiceDuration() é
//      a ÚNICA fonte de verdade para durações de serviço.
//
// COMPATIBILIDADE:
//   Todos os globals, hooks, PA.state, PA.renderRegistry
//   permanecem funcionando sem alteração.
//
// CARREGUE: após pa-state.js, antes dos controllers.
// ============================================================

;(function (global) {
  'use strict';

  if (!global.PA) { console.warn('[PA.pipeline] PA não encontrado.'); return; }
  if (global.PA.pipeline) return; // singleton

  var _log  = function() { if (global.PA_DEBUG) console.log.apply(console, ['[PA.pipeline]'].concat([].slice.call(arguments))); };
  var _warn = function() { console.warn.apply(console, ['[PA.pipeline ⚠️]'].concat([].slice.call(arguments))); };
  var _ts   = function() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()).toFixed(1) + 'ms'; };

  function _tel(cat, data) {
    if (global.PA && global.PA.telemetry) global.PA.telemetry.push(cat, data);
  }

  // ══════════════════════════════════════════════════════════════════════
  // 1. TEMPORAL ENGINE — única fonte de verdade para durações de serviço
  //
  // REGRA: "Concluído em Xd Yh" SEMPRE usa started_at, NUNCA created_at.
  //
  // Hierarquia de fontes (decrescente de confiança):
  //   1. actual_duration_minutes (banco — mais preciso)
  //   2. completed_at - started_at (calculado de timestamps)
  //   3. null (não há dados suficientes)
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Formata milissegundos em string legível.
   * "1d 4h", "3h 22m", "45m"
   */
  function formatDuration(ms) {
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

  /**
   * computeServiceDuration(order) — ÚNICA função que calcula duração de serviço.
   *
   * Retorna {
   *   durationMs:   number|null,  — duração em ms (null se não calculável)
   *   durationFmt:  string|null,  — ex: "2d 4h" (null se não calculável)
   *   source:       string,       — 'actual_minutes'|'timestamps'|'none'
   *   startedAt:    string|null,  — timestamp usado como início
   *   completedAt:  string|null,  — timestamp usado como fim
   *   warning:      string|null,  — aviso se fallback problemático foi usado
   * }
   *
   * ⚠️ NUNCA usa created_at para duração de serviço.
   */
  function computeServiceDuration(order) {
    if (!order) return { durationMs: null, durationFmt: null, source: 'none', startedAt: null, completedAt: null, warning: 'order is null' };

    // FONTE 1: actual_duration_minutes (persistido pelo banco — mais confiável)
    if (order.actual_duration_minutes) {
      var ms1 = parseFloat(order.actual_duration_minutes) * 60000;
      if (ms1 > 0) {
        return {
          durationMs:  ms1,
          durationFmt: formatDuration(ms1),
          source:      'actual_minutes',
          startedAt:   order.started_at || order.startedAt || null,
          completedAt: order.completed_at || order.completedAt || null,
          warning:     null,
        };
      }
    }

    // FONTE 2: completed_at - started_at (timestamps do banco)
    var startedAt   = order.started_at  || order.startedAt  || null;
    var completedAt = order.completed_at || order.completedAt || null;

    if (startedAt && completedAt) {
      var tStart = new Date(startedAt).getTime();
      var tEnd   = new Date(completedAt).getTime();
      if (!isNaN(tStart) && !isNaN(tEnd) && tEnd > tStart) {
        var ms2 = tEnd - tStart;
        return {
          durationMs:  ms2,
          durationFmt: formatDuration(ms2),
          source:      'timestamps',
          startedAt:   startedAt,
          completedAt: completedAt,
          warning:     null,
        };
      }
    }

    // FONTE 3: Não há dados suficientes
    var warning = null;
    // Detecta uso incorreto de created_at (audit guard)
    if (!startedAt && order.created_at) {
      warning = 'started_at ausente — created_at NÃO deve ser usado para duração de serviço';
      _warn('computeServiceDuration: ' + warning + ' | order id:', order.id || order.orderNumber);
      _tel('legacy_duration_blocked', { orderId: order.id, reason: 'no_started_at', created_at: order.created_at });
    }

    return {
      durationMs:  null,
      durationFmt: null,
      source:      'none',
      startedAt:   startedAt,
      completedAt: completedAt,
      warning:     warning,
    };
  }

  /**
   * computeElapsed(order) — tempo decorrido desde started_at até agora.
   * Usado para pedidos em andamento (não concluídos).
   * Retorna { elapsedMs, elapsedFmt, startedAt } ou null.
   */
  function computeElapsed(order) {
    var startedAt = order.started_at || order.startedAt || null;
    if (!startedAt) return null;
    var tStart = new Date(startedAt).getTime();
    if (isNaN(tStart)) return null;
    var elapsedMs = Date.now() - tStart;
    return {
      elapsedMs:  elapsedMs,
      elapsedFmt: formatDuration(elapsedMs),
      startedAt:  startedAt,
    };
  }

  /**
   * Alias legado para compatibilidade — redireciona para computeServiceDuration.
   * @deprecated Use computeServiceDuration()
   */
  function getServiceDuration(order) {
    return computeServiceDuration(order);
  }

  // ══════════════════════════════════════════════════════════════════════
  // 2. RENDER LOCKS — proteção contra reentrada e renders concorrentes
  // ══════════════════════════════════════════════════════════════════════

  // { containerId → { locked: bool, generation: int, queue: [] } }
  var _locks = {};

  function _getLock(containerId) {
    if (!_locks[containerId]) {
      _locks[containerId] = { locked: false, generation: 0, queued: null };
    }
    return _locks[containerId];
  }

  /**
   * Executa renderFn com lock no container.
   * Se já estiver locked, cancela o anterior e agenda o novo (coalescing).
   *
   * @param {string}   containerId
   * @param {function} renderFn   — deve ser síncrono ou retornar Promise
   * @param {Object}   opts       — { priority: 'high'|'normal' }
   */
  function withLock(containerId, renderFn, opts) {
    var lock = _getLock(containerId);

    if (lock.locked) {
      // Render em andamento: faz coalescing — o render mais recente vence
      lock.queued = renderFn;
      _tel('render_lock_contention', { container: containerId });
      _log('Lock contention em', containerId, '— coalescing agendado');
      return;
    }

    lock.locked = true;
    lock.generation++;
    var myGeneration = lock.generation;

    _tel('render_started', { container: containerId, generation: myGeneration });

    try {
      renderFn();
    } catch (err) {
      _warn('withLock: erro em render de "' + containerId + '":', err.message);
      _tel('render_cancelled', { container: containerId, reason: 'error', error: err.message });
    } finally {
      lock.locked = false;
      _tel('render_committed', { container: containerId, generation: myGeneration });

      // Executa render coalescido se houver
      if (lock.queued) {
        var next = lock.queued;
        lock.queued = null;
        _log('Executando render coalescido para', containerId);
        setTimeout(function() { withLock(containerId, next, opts); }, 0);
      }
    }
  }

  /**
   * Versão assíncrona de withLock para renders com Promises ou rAF.
   */
  function withLockAsync(containerId, renderFn) {
    var lock = _getLock(containerId);

    if (lock.locked) {
      lock.queued = renderFn;
      _tel('render_lock_contention', { container: containerId, async: true });
      return Promise.resolve();
    }

    lock.locked = true;
    lock.generation++;
    var myGeneration = lock.generation;

    _tel('render_started', { container: containerId, generation: myGeneration, async: true });

    return Promise.resolve()
      .then(function() { return renderFn(); })
      .then(function() {
        _tel('render_committed', { container: containerId, generation: myGeneration });
      })
      .catch(function(err) {
        _warn('withLockAsync: erro em "' + containerId + '":', err.message);
        _tel('render_cancelled', { container: containerId, reason: 'error' });
      })
      .finally(function() {
        lock.locked = false;
        if (lock.queued) {
          var next = lock.queued;
          lock.queued = null;
          setTimeout(function() { withLockAsync(containerId, next); }, 0);
        }
      });
  }

  function getLockStatus() {
    var result = {};
    Object.keys(_locks).forEach(function(cid) {
      var l = _locks[cid];
      result[cid] = { locked: l.locked, generation: l.generation, hasQueued: !!l.queued };
    });
    return result;
  }

  // ══════════════════════════════════════════════════════════════════════
  // 3. STALE RENDER DETECTION — versão do snapshot vs estado atual
  // ══════════════════════════════════════════════════════════════════════

  // Contador de versão por array global — incrementa em cada replaceArray
  var _stateVersions = { items: 0, POKEMONS: 0, PACKAGES: 0 };

  function bumpVersion(arrayName) {
    _stateVersions[arrayName] = (_stateVersions[arrayName] || 0) + 1;
    _log('Version bump:', arrayName, '→', _stateVersions[arrayName]);
  }

  function getVersion(arrayName) {
    return _stateVersions[arrayName] || 0;
  }

  /**
   * Cria um "render ticket" com snapshot frozen e versão atual.
   * O render deve verificar se o ticket ainda é válido antes de commitar.
   */
  function createRenderTicket(arrayNames) {
    var versions = {};
    (arrayNames || []).forEach(function(name) {
      versions[name] = getVersion(name);
    });
    return {
      versions:   versions,
      createdAt:  Date.now(),
      isStale:    function() {
        return Object.keys(this.versions).some(function(name) {
          return getVersion(name) !== versions[name];
        });
      },
    };
  }

  /**
   * DOM commit atômico com verificação de staleness.
   * Se o ticket ficar stale antes do commit, cancela e agenda re-render.
   */
  function atomicCommit(containerId, ticket, commitFn, reRenderFn) {
    if (ticket && ticket.isStale()) {
      _warn('atomicCommit: snapshot stale para "' + containerId + '" — cancelando commit');
      _tel('stale_render_detected', { container: containerId, age: Date.now() - ticket.createdAt });

      if (typeof reRenderFn === 'function') {
        setTimeout(reRenderFn, 16); // re-render no próximo frame
      }
      return false;
    }

    try {
      commitFn();
      _tel('render_committed', { container: containerId, stale: false });
      return true;
    } catch (err) {
      _warn('atomicCommit: erro:', err.message);
      return false;
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 4. DOM COMMIT HELPERS — commit consistente via DocumentFragment
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Commit seguro de HTML em um container.
   * Usa innerHTML em uma operação única (não incremental).
   *
   * @param {Element} container
   * @param {string}  html
   * @param {Object}  ticket  — render ticket para staleness check
   * @param {function} reRender — chamado se stale
   */
  function commitHTML(container, html, ticket, reRender) {
    if (!container) { _warn('commitHTML: container nulo'); return false; }

    if (ticket && ticket.isStale()) {
      _tel('stale_render_detected', { container: container.id, op: 'commitHTML' });
      if (reRender) setTimeout(reRender, 16);
      return false;
    }

    container.innerHTML = html;
    return true;
  }

  /**
   * Commit de DocumentFragment de forma atômica.
   * Limpa container e faz um único appendChild do fragment.
   */
  function commitFragment(container, fragment, ticket, reRender) {
    if (!container || !fragment) { _warn('commitFragment: container ou fragment nulo'); return false; }

    if (ticket && ticket.isStale()) {
      _tel('stale_render_detected', { container: container.id, op: 'commitFragment' });
      if (reRender) setTimeout(reRender, 16);
      return false;
    }

    container.innerHTML = '';
    container.appendChild(fragment);
    return true;
  }

  // ══════════════════════════════════════════════════════════════════════
  // 5. REALTIME COALESCING — N eventos → 1 render
  // ══════════════════════════════════════════════════════════════════════

  var _coalescers = {}; // { key → { timer, count } }

  /**
   * Agrupa múltiplos eventos realtime em um único render.
   * @param {string}   key       Identificador do coalescer (ex: 'orders')
   * @param {function} renderFn  Função a executar (apenas a última chamada conta)
   * @param {number}   delayMs   Janela de coalescing (padrão: 80ms)
   */
  function coalesceRender(key, renderFn, delayMs) {
    delayMs = delayMs || 80;
    if (!_coalescers[key]) _coalescers[key] = { timer: null, count: 0 };
    var c = _coalescers[key];

    clearTimeout(c.timer);
    c.count++;

    c.timer = setTimeout(function() {
      var n = c.count;
      c.count = 0;
      if (n > 1) {
        _log('Coalescing:', key, n + ' eventos → 1 render');
        _tel('duplicate_render_prevented', { key: key, prevented: n - 1 });
      }
      _tel('render_started', { key: key, coalesced: n });
      try {
        renderFn();
      } catch (err) {
        _warn('coalesceRender: erro em "' + key + '":', err.message);
      }
    }, delayMs);
  }

  // ══════════════════════════════════════════════════════════════════════
  // 6. INTEGRAÇÃO COM render-registry
  // ══════════════════════════════════════════════════════════════════════

  // Registra bump de versão ao substituir arrays via PA.state
  global.document.addEventListener('DOMContentLoaded', function() {
    // Intercepta PA.state.replaceArray para bumpar versão
    if (global.PA.state && global.PA.state.replaceArray) {
      var _origReplace = global.PA.state.replaceArray;
      global.PA.state.replaceArray = function(name, newArr, caller) {
        var result = _origReplace(name, newArr, caller);
        if (result) bumpVersion(name);
        return result;
      };
    }
    // Bump em db:ready (arrays foram recarregados)
    global.document.addEventListener('db:ready', function() {
      bumpVersion('items');
      bumpVersion('POKEMONS');
      bumpVersion('PACKAGES');
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // 7. UPGRADE DOS CONTROLLERS — adiciona locks e tickets
  // ══════════════════════════════════════════════════════════════════════

  global.document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      _upgradeController('captura', 'captura-grid', ['POKEMONS']);
      _upgradeController('items', 'items-grid', ['items']);
    }, 200);
  });

  function _upgradeController(controllerName, containerId, arrayDeps) {
    var ctrl = global.PA[controllerName];
    if (!ctrl || !ctrl.render) {
      _warn('_upgradeController: PA.' + controllerName + ' não encontrado.');
      return;
    }

    var _origRender = ctrl.render;
    var _upgraded = false;

    ctrl.render = function() {
      if (_upgraded) return _origRender.apply(this, arguments); // evita loop

      var ticket = createRenderTicket(arrayDeps);

      withLock(containerId, function() {
        var stale = ticket.isStale();
        if (stale) {
          _warn('pipeline: ticket stale antes do render de ' + containerId + ' — prosseguindo com estado atual');
          _tel('stale_render_detected', { container: containerId, source: controllerName });
        }
        _tel('render_started', { container: containerId, controller: controllerName, stale: stale });
        _origRender();
        _tel('render_committed', { container: containerId, controller: controllerName });
        _tel('temporal_engine_used', { controller: controllerName });
      });
    };

    if (global.PA.runtime) {
      global.PA.runtime.trackWrapper('PA.' + controllerName + '.render', 'pa-render-pipeline/lock', 'pipeline-lock', _origRender);
    }

    _log('Controller upgraded com pipeline lock:', controllerName, '→', containerId);
  }

  // ══════════════════════════════════════════════════════════════════════
  // 7b. SUSPICIOUS DURATION DETECTOR (TAREFA 4)
  // Detecta quando created_at - completed_at diverge muito de
  // started_at - completed_at, indicando que alguém pode ter usado
  // o timestamp errado para calcular duração de serviço.
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Verifica se um pedido tem divergência suspeita entre as duas janelas temporais.
   * Emite telemetria se created_at → completed_at for muito diferente de
   * started_at → completed_at.
   *
   * @param {Object} order
   * @param {number} thresholdMs  Diferença mínima para ser "suspeita" (padrão: 1h)
   */
  function detectSuspiciousDuration(order, thresholdMs) {
    if (!order) return null;
    thresholdMs = thresholdMs || 3600000; // 1 hora

    var createdAt   = order.created_at   || order.createdAt   || null;
    var startedAt   = order.started_at   || order.startedAt   || null;
    var completedAt = order.completed_at || order.completedAt || null;

    if (!completedAt) return null; // só faz sentido para pedidos concluídos
    if (!createdAt || !startedAt) return null; // sem ambos os timestamps, sem comparação

    var tCreated   = new Date(createdAt).getTime();
    var tStarted   = new Date(startedAt).getTime();
    var tCompleted = new Date(completedAt).getTime();

    if (isNaN(tCreated) || isNaN(tStarted) || isNaN(tCompleted)) return null;

    var durationFromCreated = tCompleted - tCreated;  // janela ERRADA (longa)
    var durationFromStarted = tCompleted - tStarted;  // janela CORRETA (serviço real)

    var diff = Math.abs(durationFromCreated - durationFromStarted);

    if (diff > thresholdMs) {
      var result = {
        orderId:             order.id || order.orderNumber,
        createdDuration:     formatDuration(durationFromCreated),
        startedDuration:     formatDuration(durationFromStarted),
        diffMs:              diff,
        diffFmt:             formatDuration(diff),
        createdAt:           createdAt,
        startedAt:           startedAt,
        completedAt:         completedAt,
      };
      _tel('suspicious_duration', result);
      _warn('SUSPICIOUS DURATION: pedido ' + result.orderId +
            ' — usando created_at mostraria ' + result.createdDuration +
            ' mas o correto (started_at) é ' + result.startedDuration +
            ' (diferença: ' + result.diffFmt + ')');
      return result;
    }
    return null;
  }

  /**
   * Roda o detector em um array de pedidos.
   * Útil para auditoria em lote.
   */
  function auditOrdersDuration(orders) {
    if (!Array.isArray(orders)) return [];
    return orders
      .map(function(o) { return detectSuspiciousDuration(o); })
      .filter(Boolean);
  }

  // ══════════════════════════════════════════════════════════════════════
  // 8. API PÚBLICA

  global.PA.pipeline = {
    // Temporal engine
    computeServiceDuration:   computeServiceDuration,
    computeElapsed:           computeElapsed,
    formatDuration:           formatDuration,
    getServiceDuration:       getServiceDuration, // legado
    detectSuspiciousDuration: detectSuspiciousDuration,
    auditOrdersDuration:      auditOrdersDuration,

    // Render locks
    withLock:               withLock,
    withLockAsync:          withLockAsync,
    getLockStatus:          getLockStatus,

    // Stale detection
    createRenderTicket:     createRenderTicket,
    atomicCommit:           atomicCommit,
    bumpVersion:            bumpVersion,
    getVersion:             getVersion,

    // DOM commit helpers
    commitHTML:             commitHTML,
    commitFragment:         commitFragment,

    // Realtime coalescing
    coalesceRender:         coalesceRender,

    // Diagnóstico
    dumpLocks:              getLockStatus,
  };

  // Expõe temporal engine globalmente para compatibilidade com templates
  // que possam chamar computeServiceDuration() diretamente.
  if (!global.computeServiceDuration) {
    global.computeServiceDuration = computeServiceDuration;
    _log('computeServiceDuration exposto globalmente.');
  }

  _log('pa-render-pipeline.js v1 inicializado.');

}(window));
