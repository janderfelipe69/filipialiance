// ============================================================
// marketplace-inbox.js — Filipi Marketplace M3.3
// PokeAlliance Shop
//
// RESPONSABILIDADES:
//   • Painel "Minhas Negociações" (buyer + seller)
//   • Badge de não-lidas no tab Marketplace
//   • Fetch de sessões ativas do usuário
//   • Realtime: nova mensagem → badge + toast → painel atualiza
//   • Abre chat diretamente de uma sessão existente
//   • Seller é notificado quando buyer inicia negociação
// ============================================================

;(function (global) {
  'use strict';

  if (global.MarketplaceInbox) return; // singleton

  var _log  = function () { console.log.apply(console,  ['[PA.marketplace]', '[inbox]'].concat([].slice.call(arguments))); };
  var _warn = function () { console.warn.apply(console, ['[PA.marketplace ⚠]', '[inbox]'].concat([].slice.call(arguments))); };

  var SB_URL = global.SUPABASE_URL || '';
  var SB_KEY = global.SUPABASE_KEY || '';

  function _jwt()  { return typeof Session !== 'undefined' && Session.getAccessToken ? Session.getAccessToken() : null; }
  function _user() { return typeof Session !== 'undefined' ? Session.getCurrentUser() : null; }
  function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _tel(cat, data) { if (global.PA && global.PA.telemetry) global.PA.telemetry.push(cat, data); }
  function _toast(msg, type) { if (typeof showToast === 'function') showToast(msg, type || 'info'); }

  // ── State ─────────────────────────────────────────────────────
  var _sessions     = [];      // trade_sessions with last message
  var _unreadCount  = 0;
  var _panelEl      = null;
  var _panelVisible = false;
  var _fetchTs      = 0;       // last fetch timestamp

  // ── Fetch sessions ────────────────────────────────────────────
  async function fetchSessions() {
    var user = _user();
    var jwt  = _jwt();
    if (!user || !jwt) return;

    try {
      // Join: trade_sessions + last message + listing info
      var url = SB_URL + '/rest/v1/trade_sessions'
        + '?or=(buyer_id.eq.' + user.id + ',seller_id.eq.' + user.id + ')'
        + '&status=in.(active,negotiating,completed,cancelled,refused)'
        + '&order=updated_at.desc'
        + '&limit=30'
        + '&select=*'
          + ',listing:listing_id(id,pokemon_name,pokemon_slug,status)'
          + ',buyer:buyer_id(id,nickname,avatar)'
          + ',seller:seller_id(id,nickname,avatar)';

      var res = await fetch(url, {
        headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + jwt }
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();

      _sessions = Array.isArray(data) ? data : [];
      _log('[trade_session] fetched', _sessions.length, 'sessions');

      // Fetch unread count via RPC
      await _fetchUnreadCount();

      if (_panelVisible) _renderPanel();
    } catch (e) {
      _warn('fetchSessions error:', e.message);
    }
  }

  async function _fetchUnreadCount() {
    var jwt = _jwt();
    if (!jwt) return;
    try {
      var res = await fetch(SB_URL + '/rest/v1/rpc/rpc_count_unread_trade_messages', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'apikey':SB_KEY, 'Authorization':'Bearer '+jwt },
        body: '{}',
      });
      if (!res.ok) return;
      var n = await res.json();
      _unreadCount = typeof n === 'number' ? n : 0;
      _updateBadge();
      _log('[trade_session] unread count:', _unreadCount);
    } catch (e) {
      _warn('_fetchUnreadCount error:', e.message);
    }
  }

  async function _markSeen(sessionId) {
    var jwt = _jwt();
    if (!jwt || !sessionId) return;
    try {
      await fetch(SB_URL + '/rest/v1/rpc/rpc_mark_messages_seen', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'apikey':SB_KEY, 'Authorization':'Bearer '+jwt },
        body: JSON.stringify({ p_session_id: sessionId }),
      });
      // Refresh count after marking seen
      await _fetchUnreadCount();
    } catch (e) {}
  }

  // ── Badge ─────────────────────────────────────────────────────
  function _updateBadge() {
    var badge = global.document.getElementById('mk-inbox-badge');
    if (!badge) return;
    if (_unreadCount > 0) {
      badge.textContent = _unreadCount > 99 ? '99+' : String(_unreadCount);
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }

  // ── Time formatting ───────────────────────────────────────────
  function _timeAgo(isoStr) {
    if (!isoStr) return '';
    var ms = Date.now() - new Date(isoStr).getTime();
    if (ms < 60000)  return 'agora';
    var m = Math.floor(ms / 60000);
    if (m < 60)  return m + 'm';
    var h = Math.floor(m / 60);
    if (h < 24)  return h + 'h';
    return Math.floor(h / 24) + 'd';
  }

  // ── Panel HTML ────────────────────────────────────────────────
  function _buildSessionRow(session) {
    var user  = _user();
    var isMe  = user && user.id;
    var isBuyer  = isMe && session.buyer_id  === user.id;
    var listing  = session.listing  || {};
    var buyer    = session.buyer    || {};
    var seller   = session.seller   || {};
    var other    = isBuyer ? seller : buyer;
    var pokemon  = listing.pokemon_name || '(Pokémon)';
    var statusCls = session.status === 'active' ? 'mk-is-active' : 'mk-is-closed';
    var statusLabel = { active:'Ativa', completed:'Concluída', cancelled:'Cancelada', refused:'Recusada', expired:'Expirada' }[session.status] || session.status;
    var role  = isBuyer ? 'Comprando' : 'Vendendo';

    return '<div class="mk-inbox-row ' + statusCls + '" data-session-id="' + _esc(session.id) + '" data-listing-id="' + _esc(session.listing_id) + '">'
      + '<div class="mk-inbox-avatar">'
      +   (other.avatar ? '<img src="' + _esc(other.avatar) + '" alt="" onerror="this.style.display=\'none\'">' : '<div class="mk-inbox-avatar-fallback">👤</div>')
      + '</div>'
      + '<div class="mk-inbox-info">'
      +   '<div class="mk-inbox-pokemon">' + _esc(pokemon) + '</div>'
      +   '<div class="mk-inbox-meta">'
      +     '<span class="mk-inbox-role">' + role + '</span>'
      +     ' com <strong>' + _esc(other.nickname || '—') + '</strong>'
      +   '</div>'
      + '</div>'
      + '<div class="mk-inbox-right">'
      +   '<span class="mk-inbox-time">' + _timeAgo(session.updated_at) + '</span>'
      +   '<span class="mk-inbox-status mk-is-' + _esc(session.status) + '">' + statusLabel + '</span>'
      + '</div>'
      + '</div>';
  }

  function _buildPanelHtml() {
    var rows = _sessions.length
      ? _sessions.map(_buildSessionRow).join('')
      : '<div class="mk-inbox-empty">Nenhuma negociação ainda.</div>';

    return '<div class="mk-inbox-panel" id="mk-inbox-panel">'
      + '<div class="mk-inbox-header">'
      +   '<span class="mk-inbox-title">💬 Minhas Negociações</span>'
      +   '<button class="mk-modal-close" onclick="MarketplaceInbox.hide()">✕</button>'
      + '</div>'
      + '<div class="mk-inbox-list" id="mk-inbox-list">' + rows + '</div>'
      + '</div>';
  }

  // ── Render / update panel ──────────────────────────────────────
  function _renderPanel() {
    if (!_panelEl) return;
    _panelEl.innerHTML = _buildPanelHtml();

    // Bind row clicks
    Array.prototype.forEach.call(
      _panelEl.querySelectorAll('.mk-inbox-row'),
      function(row) {
        row.addEventListener('click', function () {
          var sessionId = row.getAttribute('data-session-id');
          var listingId = row.getAttribute('data-listing-id');
          openSession(sessionId, listingId);
        });
      }
    );
  }

  // ── Show / hide panel ──────────────────────────────────────────
  function show() {
    if (!_panelEl) {
      _panelEl = global.document.createElement('div');
      _panelEl.id = 'mk-inbox-wrap';
      global.document.body.appendChild(_panelEl);
    }
    _panelEl.style.display = '';
    _panelVisible = true;
    _renderPanel();
    fetchSessions();
    _log('Inbox aberto');
  }

  function hide() {
    if (_panelEl) _panelEl.style.display = 'none';
    _panelVisible = false;
    _log('Inbox fechado');
  }

  function toggle() {
    _panelVisible ? hide() : show();
  }

  // ── Open a specific session ────────────────────────────────────
  function openSession(sessionId, listingId) {
    if (!sessionId) return;
    _markSeen(sessionId);
    hide();
    if (typeof MarketplaceChat !== 'undefined') {
      MarketplaceChat.open(sessionId, listingId);
      console.log('[trade_session] opened from inbox', { sessionId: sessionId, listingId: listingId });
    }
  }

  // ── Realtime handlers ─────────────────────────────────────────
  function _onTradeSessionChanged(e) {
    var detail  = (e && e.detail) || {};
    var tipo    = detail.event;
    var record  = detail.record || {};
    var user    = _user();
    if (!user) return;

    console.log('[trade_session]', { event: tipo, session: record });

    // Seller: new negotiation started on MY listing
    if (tipo === 'INSERT' && (record.status === 'active' || record.status === 'negotiating') && record.seller_id === user.id) {
      _log('Seller notified of new negotiation');
      _toast('💬 ' + (record.buyer_nickname || 'Um comprador') + ' quer negociar!', 'info');
      _tel('marketplace-inbox-seller-notified', { sessionId: record.id });
      fetchSessions();
    }

    // Any update to a session I'm in
    if ((record.buyer_id === user.id || record.seller_id === user.id)) {
      fetchSessions();
    }
  }

  function _onTradeMessageChanged(e) {
    var detail  = (e && e.detail) || {};
    var tipo    = detail.event;
    var record  = detail.record || {};
    var user    = _user();
    if (!user) return;

    console.log('[incoming_message]', { event: tipo, msg: record });

    if (tipo !== 'INSERT') return;
    if (record.sender_id === user.id) return; // own message — skip

    console.log('[trade_subscribe]', { sessionId: record.session_id, content: record.content });

    // Find the session this message belongs to
    var session = _sessions.find(function(s){ return s.id === record.session_id; });
    if (!session) {
      // Not in state yet — fetch to pick up new sessions
      fetchSessions();
      return;
    }

    // Increment unread if chat is not open for this session
    if (typeof MarketplaceChat === 'undefined' || MarketplaceChat.getActiveSessionId() !== record.session_id) {
      _unreadCount++;
      _updateBadge();

      // Toast notification
      var sender = session.buyer_id === record.sender_id
        ? (session.buyer && session.buyer.nickname)
        : (session.seller && session.seller.nickname);
      _toast('💬 ' + _esc(sender || 'Nova mensagem') + ': ' + String(record.content || '').slice(0, 60), 'info');
    }

    // Update session's updated_at locally for panel ordering
    _sessions = _sessions.map(function(s) {
      return s.id === record.session_id
        ? Object.assign({}, s, { updated_at: record.created_at })
        : s;
    }).sort(function(a,b){ return new Date(b.updated_at) - new Date(a.updated_at); });

    if (_panelVisible) _renderPanel();
  }

  // ── Init ──────────────────────────────────────────────────────
  function init() {
    global.document.addEventListener('trade_sessions:changed', _onTradeSessionChanged);
    global.document.addEventListener('trade_messages:changed', _onTradeMessageChanged);

    // Initial fetch when session is available
    if (_user()) {
      fetchSessions();
    }

    // Auth change — re-fetch when user logs in
    if (typeof Session !== 'undefined' && Session.onAuthChange) {
      Session.onAuthChange(function(event) {
        if (event === 'login') {
          _sessions = [];
          _unreadCount = 0;
          _updateBadge();
          fetchSessions();
        } else if (event === 'logout') {
          _sessions = [];
          _unreadCount = 0;
          _updateBadge();
          if (_panelEl) _panelEl.style.display = 'none';
          _panelVisible = false;
        }
      });
    }

    _log('marketplace-inbox.js v1 pronto');
  }

  global.document.addEventListener('DOMContentLoaded', function() {
    try { init(); } catch(e) { _warn('init error:', e.message); }
  });

  // ── Public API ────────────────────────────────────────────────
  global.MarketplaceInbox = {
    show:         show,
    hide:         hide,
    toggle:       toggle,
    openSession:  openSession,
    refresh:      fetchSessions,
    getUnread:    function() { return _unreadCount; },
  };

}(window));
