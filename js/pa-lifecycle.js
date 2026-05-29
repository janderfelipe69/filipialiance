// ============================================================
// pa-lifecycle.js — PokeAlliance Shop · M3.2 Stabilization
//
// CENTRALIZA:
//   S1  PA.lifecycle  — cleanup por scope
//   S5  PA.listeners  — safeBind (dedup via WeakMap)
//   S6  PA.timers     — timer registry (setTimeout/setInterval/RAF)
//   S3  PA.reconnectRecovery — reconexão segura
//   S4  PA.domAudit   — stale node detector
//   S8  PA.health.memorySnapshot — memory audit
//   S9  window.PA_DEBUG_STRESS — stress test
//   S10 PA.uiRecovery — failsafe repair
//   S11 PA.marketplace.paginationState
//   S14 debug panel expansion
//
// CARREGUE: após pa-render-health.js, antes dos módulos marketplace.
// ZERO side effects em módulos já existentes.
// ============================================================

;(function (global) {
  'use strict';

  if (!global.PA) { console.warn('[PA.lifecycle] PA namespace não encontrado.'); return; }
  if (global.PA.lifecycle) return; // singleton

  function _log()  { console.log.apply(console,  ['[PA.lifecycle]'].concat([].slice.call(arguments))); }
  function _warn() { console.warn.apply(console, ['[PA.lifecycle ⚠]'].concat([].slice.call(arguments))); }
  function _tel(cat, data) { if (global.PA.telemetry) global.PA.telemetry.push(cat, data); }


  // ══════════════════════════════════════════════════════════════
  // S1 — LIFECYCLE: cleanup registry por scope
  // ══════════════════════════════════════════════════════════════

  var _cleanupRegistry = {};  // scope → [fn, ...]

  function registerCleanup(scope, fn) {
    if (typeof fn !== 'function') return;
    if (!_cleanupRegistry[scope]) _cleanupRegistry[scope] = [];
    _cleanupRegistry[scope].push(fn);
  }

  function cleanup(scope) {
    var fns = _cleanupRegistry[scope] || [];
    fns.forEach(function(fn) {
      try { fn(); } catch (e) { _warn('cleanup error [' + scope + ']:', e.message); }
    });
    _cleanupRegistry[scope] = [];
    _log('cleanup scope:', scope);
  }

  function cleanupAll() {
    Object.keys(_cleanupRegistry).forEach(function(scope) { cleanup(scope); });
    _log('cleanupAll executed');
  }


  // ══════════════════════════════════════════════════════════════
  // S5 — LISTENER DEDUP ENGINE
  // safeBind(el, type, handler, key): previne duplicate listeners.
  // Usa WeakMap: elemento → Map(key → handler)
  // ══════════════════════════════════════════════════════════════

  var _listenerMap = new WeakMap();  // el → Map(key → {type, handler})
  var _listenerCount = 0;

  function safeBind(el, type, handler, key, scope) {
    if (!el || typeof handler !== 'function') return;
    key = key || (type + ':' + (handler.name || 'anon'));

    if (!_listenerMap.has(el)) _listenerMap.set(el, new Map());
    var elMap = _listenerMap.get(el);

    // Remove existing listener with same key
    if (elMap.has(key)) {
      var prev = elMap.get(key);
      try { el.removeEventListener(prev.type, prev.handler); } catch (_) {}
      _log('safeBind: replaced listener [' + key + '] on', el.tagName || 'window');
    }

    el.addEventListener(type, handler);
    elMap.set(key, { type: type, handler: handler });
    _listenerCount++;

    // Register cleanup for scope
    if (scope) {
      registerCleanup(scope, function() {
        try { el.removeEventListener(type, handler); } catch (_) {}
        if (_listenerMap.has(el)) _listenerMap.get(el).delete(key);
      });
    }
  }

  function safeUnbind(el, key) {
    if (!el || !_listenerMap.has(el)) return;
    var elMap = _listenerMap.get(el);
    if (!elMap.has(key)) return;
    var entry = elMap.get(key);
    try { el.removeEventListener(entry.type, entry.handler); } catch (_) {}
    elMap.delete(key);
    _listenerCount = Math.max(0, _listenerCount - 1);
  }

  function getListenerCount() { return _listenerCount; }


  // ══════════════════════════════════════════════════════════════
  // S6 — TIMER REGISTRY
  // All timers registered here; cleared by scope on cleanup.
  // ══════════════════════════════════════════════════════════════

  var _timers = {};      // id → { type, scope, cleared }
  var _timerSeq = 0;

  function createTimeout(fn, delay, scope) {
    var id = ++_timerSeq;
    var realId = global.setTimeout(function() {
      if (_timers[id]) _timers[id].cleared = true;
      try { fn(); } catch (e) { _warn('timeout error:', e.message); }
    }, delay);
    _timers[id] = { type: 'timeout', realId: realId, scope: scope, cleared: false };
    if (scope) registerCleanup(scope, function() { clearTimer(id); });
    return id;
  }

  function createInterval(fn, delay, scope) {
    var id = ++_timerSeq;
    var realId = global.setInterval(function() {
      try { fn(); } catch (e) { _warn('interval error:', e.message); }
    }, delay);
    _timers[id] = { type: 'interval', realId: realId, scope: scope, cleared: false };
    if (scope) registerCleanup(scope, function() { clearTimer(id); });
    return id;
  }

  function createRAF(fn, scope) {
    var id = ++_timerSeq;
    if (global.document.visibilityState === 'hidden') {
      // Defer RAF when tab hidden — use timeout fallback
      var realId = global.setTimeout(fn, 100);
      _timers[id] = { type: 'raf-deferred', realId: realId, scope: scope, cleared: false };
    } else {
      var realId = global.requestAnimationFrame(function() {
        if (_timers[id]) _timers[id].cleared = true;
        try { fn(); } catch (e) { _warn('RAF error:', e.message); }
      });
      _timers[id] = { type: 'raf', realId: realId, scope: scope, cleared: false };
    }
    if (scope) registerCleanup(scope, function() { clearTimer(id); });
    return id;
  }

  function clearTimer(id) {
    var t = _timers[id];
    if (!t || t.cleared) return;
    t.cleared = true;
    try {
      if (t.type === 'timeout' || t.type === 'raf-deferred') global.clearTimeout(t.realId);
      else if (t.type === 'interval') global.clearInterval(t.realId);
      else if (t.type === 'raf') global.cancelAnimationFrame && global.cancelAnimationFrame(t.realId);
    } catch (_) {}
  }

  function clearScope(scope) {
    Object.keys(_timers).forEach(function(id) {
      if (_timers[id].scope === scope) clearTimer(id);
    });
  }

  function getActiveTimerCount() {
    return Object.values(_timers).filter(function(t) { return !t.cleared; }).length;
  }


  // ══════════════════════════════════════════════════════════════
  // S2 — REALTIME PACKET VERSIONING (shouldApplyRealtime)
  // Stored here + exposed on PA.state for backward compat.
  // ══════════════════════════════════════════════════════════════

  var _latestVersions = {};  // entityKey → updatedAt ISO string

  function shouldApplyRealtime(entityKey, updatedAt) {
    if (!updatedAt) return true;
    var latest = _latestVersions[entityKey];
    if (!latest) { _latestVersions[entityKey] = updatedAt; return true; }
    if (updatedAt > latest) { _latestVersions[entityKey] = updatedAt; return true; }
    _log('shouldApplyRealtime: stale packet for', entityKey, '— ignored');
    _tel('realtime-stale-packet', { entityKey: entityKey, received: updatedAt, latest: latest });
    return false;
  }

  function clearVersionCache(entityKey) {
    if (entityKey) delete _latestVersions[entityKey];
    else _latestVersions = {};
  }

  // Extend PA.state if available
  global.document.addEventListener('DOMContentLoaded', function() {
    if (global.PA.state) {
      global.PA.state.shouldApplyRealtime = shouldApplyRealtime;
      global.PA.state.clearVersionCache   = clearVersionCache;
    }
  });


  // ══════════════════════════════════════════════════════════════
  // S3 — RECONNECT RECOVERY
  // ══════════════════════════════════════════════════════════════

  var _reconnectRecovery = {
    _lastRun:   0,
    _runCount:  0,
    _throttleMs: 15000,
  };

  async function runReconnectRecovery(reason) {
    var now = Date.now();
    if (now - _reconnectRecovery._lastRun < _reconnectRecovery._throttleMs) {
      _log('reconnectRecovery throttled');
      return;
    }
    _reconnectRecovery._lastRun = now;
    _reconnectRecovery._runCount++;

    _log('reconnectRecovery #' + _reconnectRecovery._runCount + ' reason:', reason);
    _tel('reconnect-recovery', { count: _reconnectRecovery._runCount, reason: reason });

    try {
      // 1. Orphan locks
      if (global.MarketplaceTrade && typeof global.MarketplaceTrade.recoverOrphanLocks === 'function') {
        await global.MarketplaceTrade.recoverOrphanLocks();
      }

      // 2. Chat reconnect re-fetch (handled in marketplace-chat.js via realtime:status)

      // 3. Marketplace state resync (light fetch, no full reload)
      if (global.PA.marketplace && typeof global.PA.marketplace.fetch === 'function') {
        global.PA.marketplace.fetch(true);
      }

      // 4. DOM audit
      detectStaleNodes();

    } catch (e) {
      _warn('reconnectRecovery error:', e.message);
    }
  }

  // Listen for realtime reconnect
  global.document.addEventListener('realtime:status', function(e) {
    var status = (e.detail || {}).status;
    if (status === 'connected') {
      runReconnectRecovery('realtime:connected');
    }
  });

  // Listen for visibility change
  global.document.addEventListener('visibilitychange', function() {
    if (global.document.visibilityState === 'visible') {
      runReconnectRecovery('visibilitychange');
    }
  });


  // ══════════════════════════════════════════════════════════════
  // S4 — DOM STALE DETECTOR
  // ══════════════════════════════════════════════════════════════

  function detectStaleNodes() {
    if (!global.PA_DEBUG) return;
    var issues = [];

    // Orphan lock overlays (overlay present but card status != locked)
    Array.prototype.forEach.call(
      global.document.querySelectorAll('.mk-lock-overlay'),
      function(el) {
        var card = el.closest('[data-status]');
        if (!card || card.getAttribute('data-status') !== 'locked') {
          issues.push({ type: 'orphan-overlay', el: el.className, parent: card ? card.getAttribute('data-listing-id') : 'none' });
          el.remove();
        }
      }
    );

    // Duplicate chat panels
    var chats = global.document.querySelectorAll('#mk-chat-panel');
    if (chats.length > 1) {
      issues.push({ type: 'duplicate-chat', count: chats.length });
      Array.prototype.forEach.call(chats, function(c, i) { if (i > 0) c.remove(); });
    }

    // Duplicate negotiate buttons on same card
    Array.prototype.forEach.call(
      global.document.querySelectorAll('[data-listing-id]'),
      function(card) {
        var btns = card.querySelectorAll('.mk-btn--negotiate');
        if (btns.length > 1) {
          issues.push({ type: 'duplicate-negotiate-btn', listingId: card.getAttribute('data-listing-id') });
          Array.prototype.forEach.call(btns, function(b, i) { if (i > 0) b.remove(); });
        }
      }
    );

    // Stale skeletons (visible > 10s)
    Array.prototype.forEach.call(
      global.document.querySelectorAll('.pa-skeleton[data-skeleton-ts]'),
      function(el) {
        var ts = parseInt(el.getAttribute('data-skeleton-ts') || '0', 10);
        if (Date.now() - ts > 10000) {
          issues.push({ type: 'stale-skeleton', age: Date.now() - ts });
          el.remove();
        }
      }
    );

    if (issues.length) {
      console.table(issues);
      _tel('dom-stale-detected', { count: issues.length });
    } else {
      _log('detectStaleNodes: clean');
    }
    return issues;
  }


  // ══════════════════════════════════════════════════════════════
  // S7 — VISIBILITY OPTIMIZATION
  // Pause cosmetic timers when tab hidden.
  // ══════════════════════════════════════════════════════════════

  var _hiddenSince = null;

  global.document.addEventListener('visibilitychange', function() {
    if (global.document.visibilityState === 'hidden') {
      _hiddenSince = Date.now();
      // Pause all PA.timers RAF-type when hidden
      Object.keys(_timers).forEach(function(id) {
        var t = _timers[id];
        if (!t.cleared && t.type === 'raf' && t.scope && t.scope.includes('cosmetic')) {
          clearTimer(id);
        }
      });
    } else {
      if (_hiddenSince) {
        var hiddenMs = Date.now() - _hiddenSince;
        _hiddenSince = null;
        _log('Tab visible again after', Math.round(hiddenMs / 1000) + 's hidden');
        if (hiddenMs > 30000) {
          // Was hidden long enough that state may be stale
          runReconnectRecovery('long-hidden:' + Math.round(hiddenMs / 1000) + 's');
        }
      }
    }
  });

  function isTabVisible() {
    return global.document.visibilityState !== 'hidden';
  }


  // ══════════════════════════════════════════════════════════════
  // S8 — MEMORY SNAPSHOT
  // ══════════════════════════════════════════════════════════════

  function memorySnapshot() {
    var snapshot = {
      ts: Date.now(),
      timers: {
        active:   getActiveTimerCount(),
        total:    Object.keys(_timers).length,
      },
      listeners: {
        registered: _listenerCount,
      },
      marketplace: {
        listings:      (global.PA.marketplace && global.PA.marketplace.listings || []).length,
        activeSessions: global.MarketplaceTrade ? Object.keys(global.MarketplaceTrade.getActiveSessions()).length : 0,
      },
      dom: {
        total:         global.document.querySelectorAll('*').length,
        cards:         global.document.querySelectorAll('[data-listing-id]').length,
        lockedCards:   global.document.querySelectorAll('[data-status="locked"]').length,
        overlays:      global.document.querySelectorAll('.mk-lock-overlay').length,
        chatPanels:    global.document.querySelectorAll('#mk-chat-panel').length,
        skeletons:     global.document.querySelectorAll('.pa-skeleton').length,
      },
      realtime: {
        versionCache:  Object.keys(_latestVersions).length,
        reconnects:    _reconnectRecovery._runCount,
      },
      chat: global.MarketplaceChat && global.MarketplaceChat.getStats ? global.MarketplaceChat.getStats() : {},
      trade: global.MarketplaceTrade && global.MarketplaceTrade.getStats ? global.MarketplaceTrade.getStats() : {},
    };

    if (global.PA_DEBUG) {
      console.group('[PA.lifecycle] Memory Snapshot');
      console.table(snapshot.timers);
      console.table(snapshot.dom);
      console.table(snapshot.realtime);
      console.groupEnd();
    }

    _tel('memory-snapshot', snapshot);
    return snapshot;
  }


  // ══════════════════════════════════════════════════════════════
  // S9 — STRESS TEST (manual only)
  // ══════════════════════════════════════════════════════════════

  function _stressTest() {
    _log('PA_DEBUG_STRESS: starting stress simulation');
    var listings = [];
    for (var i = 0; i < 200; i++) {
      listings.push({
        id: 'stress-' + i, seller_id: 'user-1', listing_type: 'pokemon',
        pokemon_name: 'Pikachu ' + i, pokemon_slug: 'pikachu-' + i,
        pokemon_types: ['electric'], stars: (i % 6), boost: (i % 71),
        price_kk: 1000000 * (i + 1), status: i % 5 === 0 ? 'locked' : 'active',
        created_at: new Date().toISOString(),
      });
    }
    if (global.PA.marketplace) {
      global.PA.marketplace.listings = listings;
      if (typeof MarketplaceRender !== 'undefined') {
        MarketplaceRender.render(listings, { type: 'all', search: '' });
      }
    }
    var startMs = Date.now();
    _log('PA_DEBUG_STRESS: rendered 200 listings in', Date.now() - startMs, 'ms');
    _log('PA_DEBUG_STRESS: DOM nodes after render:', global.document.querySelectorAll('*').length);
  }

  global.PA_DEBUG_STRESS = _stressTest;


  // ══════════════════════════════════════════════════════════════
  // S10 — UI RECOVERY (failsafe incremental repair)
  // ══════════════════════════════════════════════════════════════

  function repairUI() {
    _log('uiRecovery.repair() initiated');
    var repaired = 0;

    // 1. Remove orphan overlays
    Array.prototype.forEach.call(
      global.document.querySelectorAll('.mk-lock-overlay'),
      function(el) {
        var card = el.closest('[data-status]');
        if (!card || card.getAttribute('data-status') !== 'locked') {
          el.remove(); repaired++;
        }
      }
    );

    // 2. Fix buttons stuck in loading state
    Array.prototype.forEach.call(
      global.document.querySelectorAll('.mk-btn--negotiate:disabled'),
      function(btn) {
        var card = btn.closest('[data-status]');
        if (card && card.getAttribute('data-status') === 'active') {
          btn.disabled = false;
          btn.textContent = '🤝 Negociar';
          repaired++;
        }
      }
    );

    // 3. Remove duplicate chat panels
    var panels = global.document.querySelectorAll('#mk-chat-panel');
    Array.prototype.forEach.call(panels, function(p, i) {
      if (i > 0) { p.remove(); repaired++; }
    });

    // 4. Clear stale skeletons
    Array.prototype.forEach.call(
      global.document.querySelectorAll('.pa-skeleton'),
      function(el) {
        var ts = parseInt(el.getAttribute('data-skeleton-ts') || '0', 10);
        if (!ts || Date.now() - ts > 8000) { el.remove(); repaired++; }
      }
    );

    _log('uiRecovery.repair() fixed', repaired, 'issues');
    _tel('ui-recovery', { repaired: repaired });
    return repaired;
  }


  // ══════════════════════════════════════════════════════════════
  // S11 — PAGINATION STATE FOUNDATION
  // ══════════════════════════════════════════════════════════════

  var _paginationState = {
    cursor:       null,     // last fetched item's created_at for cursor pagination
    hasMore:      true,     // whether more listings exist
    pageSize:     50,       // listings per page
    totalFetched: 0,
    loading:      false,
    // Virtual render threshold: above this, use virtual list
    virtualThreshold: 100,
  };

  // Attach to PA.marketplace once available
  global.document.addEventListener('DOMContentLoaded', function() {
    if (global.PA.marketplace) {
      global.PA.marketplace.paginationState = _paginationState;
    }
  });


  // ══════════════════════════════════════════════════════════════
  // S12 — OFFLINE SAFETY MODE
  // Enhances the basic offline detection in marketplace-trade.js
  // with marketplace-wide button disabling.
  // ══════════════════════════════════════════════════════════════

  function setOfflineMode(offline) {
    var selectors = [
      '.mk-btn--negotiate', '.mk-btn--primary[onclick*="publish"]',
      '.mk-btn--primary[onclick*="saveEdit"]', '#mk-chat-send',
      '.mk-btn[onclick*="cancel"]',
    ];
    selectors.forEach(function(sel) {
      Array.prototype.forEach.call(
        global.document.querySelectorAll(sel),
        function(btn) {
          if (offline) {
            btn.setAttribute('data-was-enabled', btn.disabled ? '0' : '1');
            btn.disabled = true;
          } else {
            if (btn.getAttribute('data-was-enabled') === '1') {
              btn.disabled = false;
              btn.removeAttribute('data-was-enabled');
            }
          }
        }
      );
    });
  }

  var _winTarget = (global.window && global.window !== global) ? global.window : global;
  if (_winTarget && typeof _winTarget.addEventListener === 'function') {
    _winTarget.addEventListener('online',  function() { setOfflineMode(false); });
    _winTarget.addEventListener('offline', function() { setOfflineMode(true);  });
  }


  // ══════════════════════════════════════════════════════════════
  // S14 — DEBUG PANEL EXTRA SECTION
  // pa-compat.js calls PA.lifecycle.debugSection()
  // ══════════════════════════════════════════════════════════════

  function debugSection() {
    var snap = memorySnapshot();
    return {
      'Realtime Stability': {
        'version cache entries': snap.realtime.versionCache,
        'recovery runs':         snap.realtime.reconnects,
        'timer RAF paused':      global.document.visibilityState === 'hidden' ? 'yes' : 'no',
      },
      'Memory Snapshot': {
        'active timers':    snap.timers.active,
        'DOM nodes':        snap.dom.total,
        'cards':            snap.dom.cards,
        'locked cards':     snap.dom.lockedCards,
        'overlays':         snap.dom.overlays,
        'chat panels':      snap.dom.chatPanels,
      },
      'Listener Registry': {
        'registered':  snap.listeners.registered,
      },
      'Timer Registry': {
        'active':  snap.timers.active,
        'total':   snap.timers.total,
      },
    };
  }


  // ══════════════════════════════════════════════════════════════
  // Boot
  // ══════════════════════════════════════════════════════════════

  global.document.addEventListener('DOMContentLoaded', function() {
    // Augment PA.health with memorySnapshot
    if (global.PA.health) {
      global.PA.health.memorySnapshot = memorySnapshot;
      global.PA.health.detectStaleMarketplace = detectStaleNodes;
    }

    // Register debug section
    if (!global.PA.debug) global.PA.debug = {};
    if (!global.PA.debug.extraSections) global.PA.debug.extraSections = [];
    global.PA.debug.extraSections.push({
      title: 'pa-lifecycle',
      getHTML: debugSection,
    });

    _log('pa-lifecycle.js v1 pronto');
    _tel('boot', { module: 'PA.lifecycle' });
  });


  // ══════════════════════════════════════════════════════════════
  // Public API
  // ══════════════════════════════════════════════════════════════

  global.PA.lifecycle = {
    registerCleanup: registerCleanup,
    cleanup:         cleanup,
    cleanupAll:      cleanupAll,
    debugSection:    debugSection,
  };

  global.PA.listeners = {
    safeBind:          safeBind,
    safeUnbind:        safeUnbind,
    getListenerCount:  getListenerCount,
  };

  global.PA.timers = {
    createTimeout:       createTimeout,
    createInterval:      createInterval,
    createRAF:           createRAF,
    clearTimer:          clearTimer,
    clearScope:          clearScope,
    getActiveTimerCount: getActiveTimerCount,
    isTabVisible:        isTabVisible,
  };

  global.PA.reconnectRecovery = {
    run:      runReconnectRecovery,
    getStats: function() { return { runCount: _reconnectRecovery._runCount, lastRun: _reconnectRecovery._lastRun }; },
  };

  global.PA.domAudit = {
    detectStaleNodes: detectStaleNodes,
  };

  global.PA.uiRecovery = {
    repair: repairUI,
  };

  global.PA.realtimeVersions = {
    shouldApply: shouldApplyRealtime,
    clear:       clearVersionCache,
  };

  _log('pa-lifecycle.js bootstrap — namespaces ready');

}(window));
