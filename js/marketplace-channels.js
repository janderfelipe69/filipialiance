// ============================================================
// marketplace-channels.js — Filipi Marketplace M4.1
// PokeAlliance Shop
//
// CHANNEL REGISTRY GLOBAL — window.MarketplaceChannels
//
// Responsável por:
//   • Registrar / remover listeners por canal lógico
//   • Despachar eventos recebidos do realtime-manager para
//     handlers específicos registrados por session_id ou listing_id
//   • Deduplicação por (table, event, record.id)
//   • Cleanup automático ao fechar janelas / trocar aba
//   • Zero subscriptions duplicadas
// ============================================================

;(function (global) {
  'use strict';

  if (global.MarketplaceChannels) return; // singleton

  // ── Registry ─────────────────────────────────────────────────
  // Map: channelKey → Set of handler functions
  // channelKey examples:
  //   'messages:SESSION_ID'   — mensagens de uma sessão específica
  //   'sessions:LISTING_ID'   — sessões de um listing
  //   'sessions:*'            — todas as sessões do usuário
  //   'listings:*'            — todos os listings
  var _registry = {};
  var _seenKeys = new Set(); // global dedup across all handlers

  function register(channelKey, handlerFn) {
    if (!_registry[channelKey]) _registry[channelKey] = new Set();
    _registry[channelKey].add(handlerFn);
    console.log('[CHANNEL REGISTER]', channelKey,
      '(total handlers:', _registry[channelKey].size, ')');
  }

  function unregister(channelKey, handlerFn) {
    if (!_registry[channelKey]) return;
    _registry[channelKey].delete(handlerFn);
    if (_registry[channelKey].size === 0) delete _registry[channelKey];
    console.log('[channel cleanup] unregistered', channelKey);
  }

  function unregisterAll(channelKey) {
    delete _registry[channelKey];
    console.log('[channel cleanup] unregisteredAll', channelKey);
  }

  function cleanup() {
    var count = Object.keys(_registry).length;
    _registry = {};
    _seenKeys.clear();
    console.log('[channel cleanup] cleanup — removed', count, 'channels');
  }

  // ── Dispatch helpers ─────────────────────────────────────────
  function _dispatch(channelKey, event, record) {
    var handlers = _registry[channelKey];
    if (!handlers || !handlers.size) return;
    console.log('[CHANNEL EMIT]', channelKey, event, record && record.id);
    handlers.forEach(function(fn) {
      try { fn(event, record); } catch(e) {
        console.warn('[channel cleanup] handler error on', channelKey, e.message);
      }
    });
  }

  // ── Wire to realtime-manager CustomEvents ────────────────────
  // IMPORTANTE: o realtime-manager despacha em window (global.dispatchEvent),
  // então escutamos em window (global), NÃO em document — senão os eventos de
  // realtime nunca chegam e o chat só atualiza ao recarregar a página.
  global.addEventListener('trade_messages:changed', function(e) {
    var d = (e&&e.detail)||{};
    var record = d.record||{};
    if (!record.id || !record.session_id) return;

    var dedup = 'tm:' + d.event + ':' + record.id;
    if (_seenKeys.has(dedup)) return;
    _seenKeys.add(dedup);
    if (_seenKeys.size > 2000) {
      var iter = _seenKeys.values();
      for (var i = 0; i < 500; i++) _seenKeys.delete(iter.next().value);
    }

    console.log('[trade message]', { event: d.event, id: record.id, session: record.session_id });
    _dispatch('messages:' + record.session_id, d.event, record);
    _dispatch('messages:*', d.event, record);
  });

  global.addEventListener('trade_sessions:changed', function(e) {
    var d = (e&&e.detail)||{};
    var record = d.record||{};
    if (!record.id) return;

    var dedup = 'ts:' + d.event + ':' + record.id + ':' + (record.updated_at||'');
    if (_seenKeys.has(dedup)) return;
    _seenKeys.add(dedup);

    console.log('[trade session]', { event: d.event, id: record.id, status: record.status });
    if (record.listing_id) _dispatch('sessions:' + record.listing_id, d.event, record);
    _dispatch('sessions:*', d.event, record);
  });

  global.addEventListener('marketplace_listings:changed', function(e) {
    var d = (e&&e.detail)||{};
    var record = d.record||{};
    if (!record.id) return;

    // For DELETE, updated_at is not in the payload — use timestamp-based dedup
    var dedup = d.event === 'DELETE'
      ? 'ml:DELETE:' + record.id
      : 'ml:' + d.event + ':' + record.id + ':' + (record.updated_at||'');
    if (_seenKeys.has(dedup)) return;
    _seenKeys.add(dedup);

    console.log('[listing update]', { event: d.event, id: record.id, status: record.status });
    _dispatch('listings:' + record.id, d.event, record);
    _dispatch('listings:*', d.event, record);
  });

  // ── Cleanup on unload only ───────────────────────────────────
  // NOTE: visibilitychange cleanup was intentionally removed.
  // Killing 'messages:*' handlers on tab hide caused realtime messages
  // received while the tab was backgrounded to be silently dropped —
  // the handler was gone by the time the user returned.
  if (global.window && typeof global.window.addEventListener === 'function') global.window.addEventListener('beforeunload', cleanup);

  console.log('[subscription create] MarketplaceChannels initialized');

  // Passo 5C.2 — expõe consulta ao _seenKeys para coordenação com marketplace.js
  // Permite que marketplace.js verifique se um evento já foi roteado para sub-canais
  // antes de disparar um re-render completo (evita render após trade.js já manipulou DOM).
  function hasProcessed(dedupKey) {
    return _seenKeys.has(dedupKey);
  }

  global.MarketplaceChannels = {
    register:        register,
    unregister:      unregister,
    unregisterAll:   unregisterAll,
    cleanup:         cleanup,
    hasProcessed:    hasProcessed,
    getKeys:         function() { return Object.keys(_registry); },
    getHandlerCount: function() {
      return Object.keys(_registry).reduce(function(sum, k) {
        return sum + (_registry[k] ? _registry[k].size : 0);
      }, 0);
    },
  };

}(window));
