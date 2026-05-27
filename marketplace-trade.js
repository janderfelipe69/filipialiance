// ============================================================
// marketplace-trade.js — Filipi Marketplace M3.1 (Hardening)
// PokeAlliance Shop
//
// CHANGES M3.1:
//   • pendingLocks cleanup on pagehide/unload
//   • BroadcastChannel multi-tab sync (M3.1)
//   • sessionStorage restore pós-refresh
//   • orphan lock recovery scan
//   • offline/online detection + UI freeze
//   • timer RAF cleanup on session close
//   • rollback hardening (overlay always removed on failure)
//   • auth logout cleanup
//   • detectStaleNodes integration
//   • reconnect telemetry
// ============================================================

;(function (global) {
  'use strict';

  if (global.MarketplaceTrade) return; // singleton

  var _log  = function () { console.log.apply(console,  ['[PA.marketplace]', '[trade]'].concat([].slice.call(arguments))); };
  var _warn = function () { console.warn.apply(console, ['[PA.marketplace ⚠]', '[trade]'].concat([].slice.call(arguments))); };

  var SB_URL = global.SUPABASE_URL || '';
  var SB_KEY = global.SUPABASE_KEY || '';

  function _jwt()    { return typeof Session !== 'undefined' && Session.getAccessToken ? Session.getAccessToken() : null; }
  function _user()   { return typeof Session !== 'undefined' ? Session.getCurrentUser() : null; }
  function _isAdmin(){ return typeof Session !== 'undefined' && Session.isAdmin && Session.isAdmin(); }
  function _esc(s)   { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _tel(cat, data) { if (global.PA && global.PA.telemetry) global.PA.telemetry.push(cat, data); }
  function _toast(msg, type) { if (typeof showToast === 'function') showToast(msg, type || 'info'); }
  function _emit(evt, payload) {
    if (global.PA && global.PA.hooks && typeof global.PA.hooks.emit === 'function') {
      try { global.PA.hooks.emit(evt, payload); } catch (_) {}
    }
  }

  // ── State ───────────────────────────────────────────────────
  var _state = {
    activeSessions: {},   // listingId → session record
    pendingLocks:   {},   // listingId → true (submit guard)
    timerRAFId:     null, // single RAF for all timers
    isOnline:       global.navigator ? global.navigator.onLine !== false : true,
    reconnectCount: 0,
    orphanCheckTs:  0,    // last orphan check timestamp
    stalePackets:   0,    // deduplicated realtime packets
  };

  // ── SESSION STORAGE — restore across refresh ─────────────────
  var _SS_KEY = 'mk_active_trade';

  function _persistSession(listingId, session) {
    try {
      global.sessionStorage.setItem(_SS_KEY, JSON.stringify({
        listingId:  listingId,
        session_id: session.id || session.session_id,
        expires_at: session.expires_at,
        ts:         Date.now(),
      }));
    } catch (_) {}
  }

  function _clearPersistedSession() {
    try { global.sessionStorage.removeItem(_SS_KEY); } catch (_) {}
  }

  function _restoreSession() {
    try {
      var raw = global.sessionStorage.getItem(_SS_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      // Only restore if < 15 min old and not expired
      if (Date.now() - data.ts > 14 * 60 * 1000) { _clearPersistedSession(); return null; }
      if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
        _clearPersistedSession(); return null;
      }
      return data;
    } catch (_) { return null; }
  }

  // ── BROADCAST CHANNEL — multi-tab sync ───────────────────────
  var _bc = null;

  function _initBroadcast() {
    if (!global.BroadcastChannel) return;
    try {
      _bc = new global.BroadcastChannel('mk_marketplace');
      _bc.onmessage = function(e) {
        var msg = e.data || {};
        _log('[PA.marketplace.trade] broadcast received:', msg.type);
        if (msg.type === 'trade_started' && msg.listingId) {
          _state.activeSessions[msg.listingId] = msg.session;
          _morphToLocked(msg.listingId, msg.session);
        } else if (msg.type === 'trade_cancelled' && msg.listingId) {
          delete _state.activeSessions[msg.listingId];
          _morphToActive(msg.listingId);
        } else if (msg.type === 'trade_sold' && msg.listingId) {
          _morphToSold(msg.listingId);
        }
      };
    } catch (e) { _warn('BroadcastChannel init failed:', e.message); }
  }

  function _broadcast(type, payload) {
    if (!_bc) return;
    try { _bc.postMessage(Object.assign({ type: type }, payload)); } catch (_) {}
  }

  // ── ONLINE/OFFLINE ────────────────────────────────────────────
  function _setOnlineState(online) {
    _state.isOnline = online;
    var bar = global.document.getElementById('mk-offline-bar');
    if (!online) {
      if (!bar) {
        bar = global.document.createElement('div');
        bar.id = 'mk-offline-bar';
        bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:20000;background:#7f1d1d;color:#fca5a5;font-size:12px;text-align:center;padding:6px;font-family:var(--font-body,sans-serif)';
        bar.textContent = '⚠️ Sem conexão — funcionalidades de negociação pausadas';
        global.document.body.appendChild(bar);
      }
      // Disable all negotiate buttons
      Array.prototype.forEach.call(
        global.document.querySelectorAll('.mk-btn--negotiate'),
        function(btn) { btn.disabled = true; btn.setAttribute('data-offline-disabled', '1'); }
      );
      _tel('marketplace-offline', {});
    } else {
      if (bar) bar.remove();
      // Re-enable buttons that were disabled by offline
      Array.prototype.forEach.call(
        global.document.querySelectorAll('.mk-btn--negotiate[data-offline-disabled]'),
        function(btn) {
          btn.removeAttribute('data-offline-disabled');
          // Only re-enable if card is not locked/sold
          var card = btn.closest('[data-status]');
          if (!card || card.getAttribute('data-status') === 'active') btn.disabled = false;
        }
      );
      // Resync on reconnect
      _onReconnect();
      _tel('marketplace-online', {});
    }
  }

  async function _onReconnect() {
    _state.reconnectCount++;
    _log('[PA.marketplace.trade] reconnect #' + _state.reconnectCount);
    _tel('marketplace-reconnect', { count: _state.reconnectCount });
    // Light resync: re-fetch listings if tab is visible
    if (global.document.visibilityState !== 'hidden' &&
        global.PA && global.PA.marketplace) {
      global.PA.marketplace.fetch && global.PA.marketplace.fetch(true);
    }
    await recoverOrphanLocks();
  }

  // ── RPC helper ───────────────────────────────────────────────
  async function _rpc(fn, params) {
    // DEBUG LOG (BUG 2 diagnosis)
    console.log('[captureItems.race] _rpc call', { fn: fn, params: params, hasJwt: !!_jwt() });

    var res = await fetch(SB_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SB_KEY,
        'Authorization': 'Bearer ' + _jwt(),
      },
      body: JSON.stringify(params || {}),
    });
    var raw = await res.text();

    // ALWAYS log raw response for 400/500 — critical for diagnosing RPC errors
    if (!res.ok) {
      console.error('[PA.marketplace.trade] RPC error', {
        fn:     fn,
        status: res.status,
        raw:    raw,
        params: params,
      });
    }

    var data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch (_) {}
    if (!res.ok) {
      var errMsg = (data && (data.message || data.hint || data.details))
        || raw
        || ('HTTP ' + res.status);
      throw new Error(errMsg);
    }
    return data;
  }

  // ── Find card ─────────────────────────────────────────────────
  function _findCard(listingId) {
    return global.document.querySelector('[data-listing-id="' + listingId + '"]');
  }

  // ── Morph: locked ─────────────────────────────────────────────
  function _morphToLocked(listingId, session) {
    var card = _findCard(listingId);
    if (!card) return;
    if (card.getAttribute('data-status') === 'locked') return; // already locked

    card.setAttribute('data-status', 'locked');
    card.className = 'mk-card mk-card--locked';

    var badge = card.querySelector('.mk-status-badge');
    if (badge) { badge.className = 'mk-status-badge mk-status--locked'; badge.textContent = 'EM NEGOCIAÇÃO'; }

    var negBtn = card.querySelector('.mk-btn--negotiate');
    if (negBtn) { negBtn.disabled = true; negBtn.textContent = '⏳ Em negociação'; }

    // Remove any stale overlay first, then add fresh one
    var staleOverlay = card.querySelector('.mk-lock-overlay');
    if (staleOverlay) staleOverlay.remove();

    var overlay = global.document.createElement('div');
    overlay.className = 'mk-lock-overlay';
    overlay.innerHTML = '<div class="mk-lock-badge">🔒 EM NEGOCIAÇÃO</div>'
      + '<div class="mk-lock-timer" data-expires="' + _esc(session ? (session.expires_at || '') : '') + '">...</div>';
    card.appendChild(overlay);
    _startTimerRAF();

    console.log('[PA.marketplace.trade] morphed', listingId, '→ locked');
    _tel('marketplace-trade-morph', { listingId: listingId, toStatus: 'locked' });
  }

  // ── Morph: active (unlock) ────────────────────────────────────
  function _morphToActive(listingId) {
    var card = _findCard(listingId);
    if (!card) return;

    card.setAttribute('data-status', 'active');
    card.className = 'mk-card mk-card--active';

    var badge = card.querySelector('.mk-status-badge');
    if (badge) { badge.className = 'mk-status-badge mk-status--active'; badge.textContent = 'À venda'; }

    var negBtn = card.querySelector('.mk-btn--negotiate');
    if (negBtn && _state.isOnline) { negBtn.disabled = false; negBtn.textContent = '🤝 Negociar'; }

    var overlay = card.querySelector('.mk-lock-overlay');
    if (overlay) overlay.remove();

    _updateListingStatus(listingId, 'active');
    _stopTimerRAFIfNoTimers();
    console.log('[PA.marketplace.trade] morphed', listingId, '→ active');
  }

  function _morphToSold(listingId) {
    var card = _findCard(listingId);
    if (!card) return;
    card.setAttribute('data-status', 'sold');
    card.className = 'mk-card mk-card--sold';
    var badge = card.querySelector('.mk-status-badge');
    if (badge) { badge.className = 'mk-status-badge mk-status--sold'; badge.textContent = 'Vendido'; }
    var overlay = card.querySelector('.mk-lock-overlay');
    if (overlay) overlay.remove();
    _updateListingStatus(listingId, 'sold');
  }

  // ── Update PA.marketplace state without full re-render ────────
  function _updateListingStatus(listingId, newStatus) {
    if (!global.PA || !global.PA.marketplace) return;
    var listings = global.PA.marketplace.listings || [];
    var changed = false;
    global.PA.marketplace.listings = listings.map(function(l) {
      if (l.id !== listingId) return l;
      changed = true;
      return Object.assign({}, l, { status: newStatus });
    });
    if (changed && typeof MarketplaceRender !== 'undefined' &&
        global.PA.pipeline && global.PA.pipeline.coalesceRender) {
      global.PA.pipeline.coalesceRender('marketplace-list', function() {
        MarketplaceRender.render(global.PA.marketplace.listings, global.PA.marketplace.filters || {});
      }, 300);
    }
  }

  // ── Timer RAF: single manager for ALL timers ─────────────────
  // M3.1: _stopTimerRAFIfNoTimers prevents orphan RAFs
  function _startTimerRAF() {
    if (_state.timerRAFId) return;
    function _tick() {
      var timers = global.document.querySelectorAll('.mk-lock-timer[data-expires]');
      var hasAny = false;
      Array.prototype.forEach.call(timers, function(el) {
        var expiresAt = el.getAttribute('data-expires');
        if (!expiresAt) return;
        var ms = new Date(expiresAt).getTime() - Date.now();
        if (ms <= 0) {
          el.textContent = 'Expirando...';
          _checkExpiredSessions();
        } else {
          hasAny = true;
          var m = Math.floor(ms / 60000);
          var s = Math.floor((ms % 60000) / 1000);
          el.textContent = '⏱ ' + m + ':' + (s < 10 ? '0' : '') + s;
        }
      });
      _state.timerRAFId = hasAny ? setTimeout(_tick, 1000) : null;
    }
    _state.timerRAFId = setTimeout(_tick, 0);
  }

  function _stopTimerRAFIfNoTimers() {
    var timers = global.document.querySelectorAll('.mk-lock-timer[data-expires]');
    if (timers.length === 0 && _state.timerRAFId) {
      clearTimeout(_state.timerRAFId);
      _state.timerRAFId = null;
    }
  }

  function _stopAllTimers() {
    if (_state.timerRAFId) { clearTimeout(_state.timerRAFId); _state.timerRAFId = null; }
  }

  // ── Orphan lock recovery (T2) ─────────────────────────────────
  var _orphanCheckRunning = false;
  async function recoverOrphanLocks() {
    if (_orphanCheckRunning) return;
    var now = Date.now();
    if (now - _state.orphanCheckTs < 30000) return; // throttle 30s
    _state.orphanCheckTs = now;
    _orphanCheckRunning  = true;

    try {
      // Scan all locked cards in DOM
      var lockedCards = global.document.querySelectorAll('[data-status="locked"][data-listing-id]');
      if (!lockedCards.length) { _orphanCheckRunning = false; return; }

      _log('[PA.marketplace.trade] orphan scan:', lockedCards.length, 'locked cards');

      // Fetch active sessions from Supabase
      var jwt = _jwt();
      if (!jwt) { _orphanCheckRunning = false; return; }

      var lockIds = Array.prototype.map.call(lockedCards, function(c){ return c.getAttribute('data-listing-id'); });
      var res = await fetch(
        SB_URL + '/rest/v1/trade_sessions?status=eq.active&listing_id=in.(' + lockIds.join(',') + ')&select=listing_id,expires_at',
        { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + jwt } }
      );
      if (!res.ok) { _orphanCheckRunning = false; return; }

      var activeSessions = await res.json();
      var activeListingIds = (activeSessions || []).map(function(s){ return s.listing_id; });

      // Find orphans: locked in DOM but no active session
      Array.prototype.forEach.call(lockedCards, function(card) {
        var listingId = card.getAttribute('data-listing-id');
        if (activeListingIds.indexOf(listingId) === -1) {
          _warn('[PA.marketplace.trade] orphan lock found for listing', listingId, '— unlocking');
          delete _state.activeSessions[listingId];
          _morphToActive(listingId);
          _tel('marketplace-orphan-unlock', { listingId: listingId });
        }
      });
    } catch (err) {
      _warn('[PA.marketplace.trade] recoverOrphanLocks error:', err.message);
    } finally {
      _orphanCheckRunning = false;
    }
  }

  // ── Expiry check (throttled, not polled) ──────────────────────
  var _expiryCheckTs = 0;
  async function _checkExpiredSessions() {
    var now = Date.now();
    if (now - _expiryCheckTs < 30000) return;
    _expiryCheckTs = now;
    try {
      await _rpc('expire_trade_sessions', {});
      _log('[PA.marketplace.trade] expire_trade_sessions called');
    } catch (e) { _warn('expire_trade_sessions error:', e.message); }
  }

  // ══════════════════════════════════════════════════════════════
  // START NEGOTIATION — hardened
  // ══════════════════════════════════════════════════════════════
  async function startNegotiation(listingId) {
    if (!_state.isOnline) { _toast('Sem conexão. Aguarde reconectar.', 'error'); return; }

    var user = _user();
    if (!user) { _toast('Faça login para negociar.', 'info'); return; }

    if (_state.pendingLocks[listingId]) {
      _warn('[PA.marketplace.trade] pendingLock active for', listingId);
      return;
    }
    _state.pendingLocks[listingId] = true;

    var card   = _findCard(listingId);
    var btn    = card ? card.querySelector('.mk-btn--negotiate') : null;
    var origText = btn ? btn.textContent : '🤝 Negociar';
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Iniciando...'; }

    var result = null;
    try {
      if (global.PA && global.PA.pipeline && global.PA.pipeline.withLockAsync) {
        await global.PA.pipeline.withLockAsync('mk-trade-' + listingId, async function() {
          result = await _rpc('rpc_start_negotiation', { p_listing_id: listingId });
        });
      } else {
        result = await _rpc('rpc_start_negotiation', { p_listing_id: listingId });
      }
      // Debug: log exactly what was sent
      console.log('[PA.marketplace.trade] rpc_start_negotiation sent', {
        listingId: listingId,
        authUser: _user() ? _user().id : null,
        payload: { p_listing_id: listingId },
        rpcName: 'rpc_start_negotiation',
      });

      console.log('[PA.marketplace.trade] rpc_start_negotiation result:', result);

      if (result && result.success) {
        var session = { session_id: result.session_id, expires_at: result.expires_at, buyer_id: user.id };
        _state.activeSessions[listingId] = session;
        _persistSession(listingId, { id: result.session_id, expires_at: result.expires_at });
        _morphToLocked(listingId, session);
        _broadcast('trade_started', { listingId: listingId, session: session });
        _emit('marketplace:trade_started', { listingId: listingId, session: session });
        _tel('marketplace-trade-started', { listingId: listingId });
        _toast('✅ Negociação iniciada!', 'success');

        if (typeof MarketplaceChat !== 'undefined') {
          MarketplaceChat.open(result.session_id, listingId);
        }
      } else {
        var errMap = {
          listing_unavailable:    'Este anúncio já está em negociação.',
          already_in_negotiation: 'Você já está em uma negociação ativa.',
          cooldown_active:        'Você está em cooldown. Aguarde.',
          not_authenticated:      'Faça login para negociar.',
          cannot_buy_own_listing: 'Você não pode comprar seu próprio anúncio.',
        };
        var err = (result && result.error) || 'unknown';
        _toast(errMap[err] || 'Não foi possível iniciar a negociação.', 'error');
        // ROLLBACK: always restore button
        if (btn) { btn.disabled = false; btn.textContent = origText; }
      }
    } catch (err) {
      _warn('[PA.marketplace.trade] startNegotiation error:', err.message);
      _toast('Erro ao iniciar negociação.', 'error');
      // ROLLBACK: always restore on exception
      if (btn) { btn.disabled = false; btn.textContent = origText; }
    } finally {
      // CRITICAL: always clean pendingLock, even on throw
      delete _state.pendingLocks[listingId];
    }
  }

  // ── Cancel negotiation ────────────────────────────────────────
  async function cancelNegotiation(sessionId, listingId, reason) {
    if (!sessionId) return;
    try {
      var result = await _rpc('rpc_cancel_negotiation', { p_session_id: sessionId, p_reason: reason || null });
      if (result && result.success) {
        delete _state.activeSessions[listingId];
        _clearPersistedSession();
        _morphToActive(listingId);
        _broadcast('trade_cancelled', { listingId: listingId });
        _emit('marketplace:trade_cancelled', { sessionId: sessionId, listingId: listingId });
        if (typeof MarketplaceChat !== 'undefined') MarketplaceChat.close();
        _toast('Negociação cancelada.', 'info');
      } else {
        _toast((result && result.error) || 'Erro ao cancelar.', 'error');
      }
    } catch (err) {
      _warn('cancelNegotiation error:', err.message);
      _toast('Erro ao cancelar negociação.', 'error');
    }
  }

  // ── Admin tools ───────────────────────────────────────────────
  async function adminMarkSold(listingId) {
    if (!_isAdmin()) return;
    try {
      var res = await fetch(SB_URL + '/rest/v1/marketplace_listings?id=eq.' + listingId, {
        method: 'PATCH',
        headers: { 'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+_jwt(),'Prefer':'return=minimal' },
        body: JSON.stringify({ status: 'sold', sold_at: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      _morphToSold(listingId);
      _broadcast('trade_sold', { listingId: listingId });
      _toast('Marcado como vendido.', 'success');
    } catch (e) { _toast('Erro: ' + e.message, 'error'); }
  }

  async function adminForceUnlock(listingId, sessionId) {
    if (!_isAdmin()) return;
    try {
      if (sessionId) {
        await _rpc('rpc_cancel_negotiation', { p_session_id: sessionId, p_reason: 'admin_force_unlock' });
      } else {
        await fetch(SB_URL + '/rest/v1/marketplace_listings?id=eq.' + listingId, {
          method: 'PATCH',
          headers: { 'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+_jwt(),'Prefer':'return=minimal' },
          body: JSON.stringify({ status: 'active' }),
        });
      }
      delete _state.activeSessions[listingId];
      _morphToActive(listingId);
      _broadcast('trade_cancelled', { listingId: listingId });
      _toast('Listing desbloqueado.', 'success');
    } catch (e) { _toast('Erro: ' + e.message, 'error'); }
  }

  // ── Realtime: escuta trade_sessions:changed ───────────────────
  // M3.1: dedup via _seenTradeEvents Set
  var _seenTradeEvents = new Set();
  var SEEN_MAX = 200;

  function _initRealtime() {
    global.document.addEventListener('trade_sessions:changed', function(e) {
      try {
        var detail = e.detail || {};
        var tipo   = detail.event;
        var record = detail.record || {};
        var lId    = record.listing_id;

        // Dedup
        var key = tipo + ':' + record.id + ':' + (record.updated_at || record.created_at || '');
        if (_seenTradeEvents.has(key)) { _state.stalePackets++; return; }
        _seenTradeEvents.add(key);
        if (_seenTradeEvents.size > SEEN_MAX) {
          var iter = _seenTradeEvents.values();
          _seenTradeEvents.delete(iter.next().value);
        }

        console.log('[PA.marketplace.trade] realtime trade_sessions:', tipo, record.status);

        if (tipo === 'INSERT' && record.status === 'active') {
          _state.activeSessions[lId] = record;
          _morphToLocked(lId, record);
          _emit('marketplace:trade_started', { listingId: lId, session: record });
        } else if (tipo === 'UPDATE') {
          if (['cancelled','expired','refused','completed'].indexOf(record.status) !== -1) {
            delete _state.activeSessions[lId];
            _morphToActive(lId);
            _clearPersistedSession();
            _emit('marketplace:trade_cancelled', { listingId: lId });
            if (record.status === 'expired') _emit('marketplace:trade_expired', { listingId: lId });
          }
        }
        _tel('marketplace-realtime-trade', { tipo: tipo, status: record.status });
      } catch (err) {
        _warn('realtime trade_sessions error:', err.message);
      }
    });
  }

  // ── Cleanup: logout, pagehide, visibility ────────────────────
  function _cleanup() {
    _stopAllTimers();
    _state.pendingLocks = {};  // M3.1: clear orphan locks on unload
    if (_bc) { try { _bc.close(); } catch(_) {} _bc = null; }
    _log('[PA.marketplace.trade] cleanup executed');
  }

  // ── Boot ──────────────────────────────────────────────────────
  global.document.addEventListener('DOMContentLoaded', function() {
    try {
      _initRealtime();
      _initBroadcast();

      // M3.2: Use PA.listeners.safeBind for dedup on window events
      var _bindFn = (global.PA && global.PA.listeners) ? global.PA.listeners.safeBind : function(el,t,fn){ el.addEventListener(t,fn); };
      _bindFn(global.window, 'online',       function() { _setOnlineState(true);  }, 'mk-trade:online',  'marketplace-trade');
      _bindFn(global.window, 'offline',      function() { _setOnlineState(false); }, 'mk-trade:offline', 'marketplace-trade');
      _bindFn(global.window, 'pagehide',     _cleanup,                               'mk-trade:pagehide','marketplace-trade');
      _bindFn(global.window, 'beforeunload', function() { _state.pendingLocks = {}; },'mk-trade:unload',  'marketplace-trade');

      // M3.2: register cleanup scope
      if (global.PA && global.PA.lifecycle) {
        global.PA.lifecycle.registerCleanup('marketplace-trade', function() {
          _cleanup();
          _stopAllTimers();
        });
      }

      // Logout cleanup
      if (typeof Session !== 'undefined' && Session.onAuthChange) {
        Session.onAuthChange(function() {
          var u = _user();
          if (!u) { _cleanup(); _clearPersistedSession(); }
        });
      }

      // Restore session after refresh
      var restored = _restoreSession();
      if (restored) {
        _log('[PA.marketplace.trade] restoring session from sessionStorage', restored);
        _state.activeSessions[restored.listingId] = {
          session_id: restored.session_id,
          expires_at: restored.expires_at,
        };
        // Will morph when card renders (orphan recovery handles the case where card doesn't exist yet)
        setTimeout(function() {
          _morphToLocked(restored.listingId, { expires_at: restored.expires_at });
          recoverOrphanLocks(); // validate that session is still active
        }, 500);
      }

      // Visibility change: re-sync when tab becomes visible
      global.document.addEventListener('visibilitychange', function() {
        if (global.document.visibilityState === 'visible') {
          recoverOrphanLocks();
        }
      });

      _log('marketplace-trade.js M3.1 pronto');
    } catch (err) {
      _warn('Erro na inicialização:', err.message);
    }
  });

  // ── Public API ───────────────────────────────────────────────
  global.MarketplaceTrade = {
    startNegotiation:   startNegotiation,
    cancelNegotiation:  cancelNegotiation,
    adminMarkSold:      adminMarkSold,
    adminForceUnlock:   adminForceUnlock,
    recoverOrphanLocks: recoverOrphanLocks,
    // Debug
    getActiveSessions:  function() { return Object.assign({}, _state.activeSessions); },
    getPendingLocks:    function() { return Object.keys(_state.pendingLocks); },
    getStats: function() {
      return {
        reconnectCount:   _state.reconnectCount,
        stalePackets:     _state.stalePackets,
        isOnline:         _state.isOnline,
        timerActive:      !!_state.timerRAFId,
        activeSessions:   Object.keys(_state.activeSessions).length,
        pendingLocks:     Object.keys(_state.pendingLocks).length,
      };
    },
  };

}(window));
