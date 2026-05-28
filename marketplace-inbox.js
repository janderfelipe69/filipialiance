// ============================================================
// marketplace-inbox.js — Filipi Marketplace M5
// PokeAlliance Shop
//
// M5: painel lateral REMOVIDO.
// Esta função mantém apenas:
//   • badge de unread no botão 💬
//   • contagem de mensagens não lidas
//   • notificação toast quando janela está fechada
//   • refresh do contador via realtime
//
// O fluxo de negociação agora é 100% via:
//   Badge no card → openBuyerPanel → ChatWindow draggable
// ============================================================

;(function (global) {
  'use strict';

  if (global.MarketplaceInbox) return;

  var SB_URL = global.SUPABASE_URL || '';
  var SB_KEY = global.SUPABASE_KEY || '';

  function _jwt()  { return typeof Session!=='undefined'&&Session.getAccessToken?Session.getAccessToken():null; }
  function _user() { return typeof Session!=='undefined'?Session.getCurrentUser():null; }
  function _toast(m,t){ if(typeof showToast==='function') showToast(m,t||'info'); }

  var _unread    = 0;
  var _sesHandler = null;
  var _msgHandler = null;

  // ── Fetch unread count ────────────────────────────────────────
  async function refresh() {
    var user = _user(); var jwt = _jwt();
    if (!user || !jwt) return;
    try {
      var res = await fetch(
        SB_URL + '/rest/v1/trade_sessions'
          + '?or=(buyer_id.eq.' + user.id + ',seller_id.eq.' + user.id + ')'
          + '&status=in.(open,active)'
          + '&select=buyer_id,seller_id,unread_buyer,unread_seller',
        { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + jwt } }
      );
      if (!res.ok) return;
      var data = await res.json();
      var uid = user.id;
      _unread = (Array.isArray(data) ? data : []).reduce(function(sum, s) {
        return sum + (s.buyer_id === uid ? (s.unread_buyer||0) : (s.unread_seller||0));
      }, 0);
      _updateBadge();
    } catch(e) {}
  }

  function _updateBadge() {
    var b = global.document.getElementById('mk-inbox-badge');
    if (!b) return;
    if (_unread > 0) { b.textContent = _unread > 99 ? '99+' : String(_unread); b.style.display = ''; }
    else b.style.display = 'none';
  }

  // Toast when message arrives and no chat window is open for that session
  function notifyNewMessage(record) {
    var user = _user(); if (!user || record.sender_id === user.id) return;
    _unread++;
    _updateBadge();
    _toast('💬 Nova mensagem na negociação', 'info');
  }

  // ── Realtime ──────────────────────────────────────────────────
  function _initRealtime() {
    var ch = global.MarketplaceChannels;
    if (!ch) return;

    _sesHandler = function(event, record) {
      var u = _user(); if (!u) return;
      if (record.buyer_id === u.id || record.seller_id === u.id) refresh();
    };
    ch.register('sessions:*', _sesHandler);

    _msgHandler = function(event, record) {
      if (event !== 'INSERT') return;
      var chat = global.MarketplaceChat;
      // Only notify if the chat window for this session is NOT open
      if (chat && chat.getActiveSessionId && chat.getActiveSessionId() === record.session_id) return;
      // Also check if any window is open for this session
      if (chat && chat.getStats && chat.getStats().openWindows > 0) {
        // At least one window open — check if it's for this session
        // The ChatWindow itself will handle the append; we just update badge
      }
      notifyNewMessage(record);
    };
    ch.register('messages:*', _msgHandler);
  }

  global.document.addEventListener('DOMContentLoaded', function() {
    _initRealtime();
    if (_user()) refresh();
    if (typeof Session !== 'undefined' && Session.onAuthChange) {
      Session.onAuthChange(function(ev) {
        if (ev === 'login')  { _unread = 0; _updateBadge(); refresh(); }
        if (ev === 'logout') { _unread = 0; _updateBadge(); }
      });
    }
    if (global.PA && global.PA.lifecycle) {
      global.PA.lifecycle.registerCleanup('marketplace-inbox', function() {
        var ch = global.MarketplaceChannels;
        if (ch && _sesHandler) ch.unregister('sessions:*', _sesHandler);
        if (ch && _msgHandler) ch.unregister('messages:*', _msgHandler);
      });
    }
  });

  // Stub show/hide/toggle for backward compat (inbox panel removed)
  function _noop() {}

  global.MarketplaceInbox = {
    refresh:           refresh,
    notifyNewMessage:  notifyNewMessage,
    getUnread:         function() { return _unread; },
    // Removed panel — these are stubs for backward compat
    show:   _noop,
    hide:   _noop,
    toggle: _noop,
    openSession: function(sessionId, listingId) {
      // Directly open a chat window (used by any legacy code that called openSession)
      if (typeof MarketplaceChat !== 'undefined') {
        MarketplaceChat.open(sessionId, listingId, {});
      }
    },
  };

}(window));
