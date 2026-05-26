// ============================================================
// js/runtime/hooks.js — Hook System Explícito v1
// PokeAlliance Shop — FASE 5
//
// OBJETIVO:
//   Substituir monkey patches por hooks explícitos registráveis.
//   Emissores declaram o evento; ouvintes registram callbacks.
//   Coexiste com wrappers existentes — NÃO os remove nesta fase.
//
// EVENTOS OFICIAIS:
//   captura:rendered    items:rendered    packages:rendered
//   pedidos:rendered    wiki:rendered     tab:changed
//   cart:updated
//
// CARREGUE: após pa-compat.js, antes dos módulos de render.
// ============================================================

;(function (global) {
  'use strict';

  if (!global.PA) {
    console.warn('[Hooks] PA namespace não encontrado.');
    return;
  }
  if (global.PA.hooks) return; // singleton

  var _log  = function() { if (global.PA_DEBUG) console.log.apply(console, ['[PA.hooks]'].concat([].slice.call(arguments))); };
  var _warn = function() { console.warn.apply(console, ['[PA.hooks ⚠️]'].concat([].slice.call(arguments))); };
  var _ts   = function() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()).toFixed(1) + 'ms'; };

  // Eventos oficiais (declaração de contrato)
  var OFFICIAL_EVENTS = [
    'captura:rendered', 'items:rendered', 'packages:rendered',
    'pedidos:rendered', 'wiki:rendered', 'tab:changed', 'cart:updated',
  ];

  // ── Registro de handlers: { eventName → [ { id, fn, ts, callCount } ] } ──
  var _handlers = {};

  // ── Telemetria de execução ─────────────────────────────────────────────
  var _emitLog = [];   // últimas 200 emissões
  var _EMIT_MAX = 200;

  function _logEmit(eventName, payload, duration) {
    var entry = { event: eventName, ts: _ts(), durationMs: duration };
    _emitLog.push(entry);
    if (_emitLog.length > _EMIT_MAX) _emitLog.shift();
    if (typeof global.PA.telemetry === 'object') {
      global.PA.telemetry.push('hook-emit', entry);
    }
  }

  // ── API ──────────────────────────────────────────────────────────────

  /**
   * Registra um callback para um evento de hook.
   * id deve ser único por evento — re-registrar com mesmo id substitui.
   *
   * @param {string}   eventName  Ex: 'captura:rendered'
   * @param {string}   id         Identificador único (ex: 'filter-smart/captura')
   * @param {function} fn         Callback(payload)
   */
  function on(eventName, id, fn) {
    if (typeof fn !== 'function') {
      _warn('on: fn deve ser uma função para', eventName, id);
      return;
    }

    if (!_handlers[eventName]) _handlers[eventName] = [];

    // Verifica se já existe com este id (substitui)
    var existing = _handlers[eventName].findIndex(function (h) { return h.id === id; });
    var entry = { id: id, fn: fn, ts: _ts(), callCount: 0 };

    if (existing !== -1) {
      _warn('on: id "' + id + '" já registrado para "' + eventName + '" — substituindo.');
      _handlers[eventName][existing] = entry;
    } else {
      _handlers[eventName].push(entry);
    }

    // Warning se evento não é oficial
    if (OFFICIAL_EVENTS.indexOf(eventName) === -1) {
      _warn('on: evento "' + eventName + '" não é oficial. Eventos suportados: ' + OFFICIAL_EVENTS.join(', '));
    }

    _log('on:', eventName, '← id:', id);
    if (typeof global.PA.telemetry === 'object') {
      global.PA.telemetry.push('hook-on', { event: eventName, id: id });
    }
  }

  /**
   * Remove um callback registrado.
   */
  function off(eventName, id) {
    if (!_handlers[eventName]) return;
    var before = _handlers[eventName].length;
    _handlers[eventName] = _handlers[eventName].filter(function (h) { return h.id !== id; });
    var removed = before - _handlers[eventName].length;
    if (removed === 0) _warn('off: id "' + id + '" não encontrado para "' + eventName + '".');
    _log('off:', eventName, 'id:', id, removed ? '✅' : '⚠️ não encontrado');
  }

  /**
   * Emite um evento de hook, executando todos os callbacks registrados.
   * Isola erros por callback — um hook falhando não para os outros.
   *
   * @param {string} eventName
   * @param {*}      [payload]   Dado opcional passado a cada callback
   */
  function emit(eventName, payload) {
    var handlers = _handlers[eventName];
    if (!handlers || handlers.length === 0) {
      _log('emit:', eventName, '(sem handlers)');
      _logEmit(eventName, payload, 0);
      return;
    }

    var t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    var errors = 0;

    handlers.forEach(function (h) {
      try {
        h.fn(payload);
        h.callCount++;
      } catch (err) {
        errors++;
        _warn('emit: erro no handler "' + h.id + '" para "' + eventName + '":', err.message);
        if (typeof global.PA.telemetry === 'object') {
          global.PA.telemetry.push('hook-error', {
            event: eventName, id: h.id, error: err.message,
          });
        }
      }
    });

    var dur = typeof performance !== 'undefined' ? performance.now() - t0 : 0;
    _log('emit:', eventName, '→', handlers.length, 'handlers,', dur.toFixed(1) + 'ms',
         errors > 0 ? '(' + errors + ' erros)' : '');
    _logEmit(eventName, payload, dur);
  }

  /**
   * Retorna handlers ativos por evento (diagnóstico).
   */
  function status() {
    var result = {};
    OFFICIAL_EVENTS.forEach(function (evt) {
      result[evt] = (_handlers[evt] || []).map(function (h) {
        return { id: h.id, calls: h.callCount, registered: h.ts };
      });
    });
    return result;
  }

  /**
   * Lista handlers órfãos (registrados mas nunca chamados após 10s boot).
   */
  function orphans() {
    var result = [];
    Object.keys(_handlers).forEach(function (evt) {
      _handlers[evt].forEach(function (h) {
        if (h.callCount === 0) result.push({ event: evt, id: h.id, registered: h.ts });
      });
    });
    return result;
  }

  function getEmitLog() { return _emitLog.slice(); }

  // ── Expõe no namespace PA ───────────────────────────────────────────────
  global.PA.hooks = {
    on:          on,
    off:         off,
    emit:        emit,
    status:      status,
    orphans:     orphans,
    getEmitLog:  getEmitLog,
    EVENTS:      OFFICIAL_EVENTS,
  };

  _log('hooks.js v1 carregado. Eventos oficiais:', OFFICIAL_EVENTS.join(', '));

  // Diagnóstico de hooks órfãos após 15s
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      var o = orphans();
      if (o.length > 0) {
        _warn('HOOKS ÓRFÃOS (nunca chamados): ' + o.map(function (h) {
          return h.event + '/' + h.id;
        }).join(', '));
      }
    }, 15000);
  });

}(window));
