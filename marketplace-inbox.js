// ============================================================
// marketplace-inbox.js — Filipi Marketplace M4
// PokeAlliance Shop
//
// Central de negociações:
//   • Badge global no botão 💬
//   • Drawer com todas as sessões do usuário
//   • Realtime: nova msg / nova sessão → atualiza
//   • Histórico de vendas concluídas
// ============================================================

;(function (global) {
  'use strict';

  if (global.MarketplaceInbox) return;

  var SB_URL = global.SUPABASE_URL || '';
  var SB_KEY = global.SUPABASE_KEY || '';

  function _jwt()  { return typeof Session!=='undefined'&&Session.getAccessToken?Session.getAccessToken():null; }
  function _user() { return typeof Session!=='undefined'?Session.getCurrentUser():null; }
  function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _tel(c,d) { if(global.PA&&global.PA.telemetry) global.PA.telemetry.push(c,d); }
  function _toast(m,t){ if(typeof showToast==='function') showToast(m,t||'info'); }

  var _sessions    = [];
  var _unread      = 0;
  var _panelEl     = null;
  var _visible     = false;

  // ── Fetch all sessions for current user ──────────────────────
  async function refresh() {
    var user = _user(); var jwt = _jwt();
    if (!user || !jwt) return;
    try {
      var res = await fetch(
        SB_URL + '/rest/v1/trade_sessions'
          + '?or=(buyer_id.eq.' + user.id + ',seller_id.eq.' + user.id + ')'
          + '&status=in.(active,open,sold,closed,cancelled)'
          + '&order=last_message_at.desc.nullslast,updated_at.desc'
          + '&limit=50'
          + '&select=*,listing:listing_id(id,pokemon_name,status),buyer:buyer_id(id,nickname,avatar),seller:seller_id(id,nickname,avatar)',
        { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + jwt } }
      );
      if (!res.ok) return;
      var data = await res.json();
      _sessions = Array.isArray(data) ? data : [];

      // Calculate unread
      var uid = user.id;
      _unread = _sessions.reduce(function(sum, s) {
        return sum + (s.buyer_id === uid ? (s.unread_buyer || 0) : (s.unread_seller || 0));
      }, 0);

      _updateBadge();
      if (_visible) _renderPanel();
    } catch(e) {}
  }

  // ── Badge ─────────────────────────────────────────────────────
  function _updateBadge() {
    var badge = global.document.getElementById('mk-inbox-badge');
    if (!badge) return;
    if (_unread > 0) {
      badge.textContent = _unread > 99 ? '99+' : String(_unread);
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }

  // ── Notify incoming message (when chat window not open) ──────
  function notifyNewMessage(record) {
    var user = _user(); if (!user) return;
    if (record.sender_id === user.id) return;
    var s = _sessions.find(function(s){ return s.id === record.session_id; });
    if (!s) { refresh(); return; }
    var sender = s.buyer_id === record.sender_id
      ? (s.buyer && s.buyer.nickname)
      : (s.seller && s.seller.nickname);
    _toast('💬 ' + (sender || 'Nova mensagem') + ': ' + String(record.content||record.body||'').slice(0,60), 'info');
    _unread++;
    _updateBadge();
    if (_visible) _renderPanel();
  }

  // ── Time formatting ───────────────────────────────────────────
  function _ago(iso) {
    if (!iso) return '';
    var ms = Date.now() - new Date(iso).getTime();
    if (ms < 60000)  return 'agora';
    var m = Math.floor(ms/60000);
    if (m < 60)  return m + 'm';
    var h = Math.floor(m/60);
    if (h < 24)  return h + 'h';
    return Math.floor(h/24) + 'd';
  }

  // ── Panel HTML ────────────────────────────────────────────────
  function _buildRow(session) {
    var user     = _user();
    var uid      = user ? user.id : null;
    var isBuyer  = uid && session.buyer_id === uid;
    var other    = isBuyer ? (session.seller || {}) : (session.buyer || {});
    var listing  = session.listing || {};
    var unread   = isBuyer ? (session.unread_buyer||0) : (session.unread_seller||0);
    var statusLabel = { active:'Ativa', open:'Aberta', sold:'Vendido', closed:'Fechado', cancelled:'Cancelado' }[session.status] || session.status;
    var ts = session.last_message_at || session.updated_at;

    return '<div class="mk-inbox-row mk-is-' + _esc(session.status) + '" data-session="' + _esc(session.id) + '" data-listing="' + _esc(session.listing_id) + '">'
      + '<div class="mk-inbox-avatar">'
      + (other.avatar ? '<img src="' + _esc(other.avatar) + '" alt="" onerror="this.style.display=\'none\'">' : '<div class="mk-inbox-avatar-fallback">👤</div>')
      + '</div>'
      + '<div class="mk-inbox-info">'
      +   '<div class="mk-inbox-pokemon">' + _esc(listing.pokemon_name || '—') + '</div>'
      +   '<div class="mk-inbox-meta">'
      +     (isBuyer ? 'Comprando de' : 'Venda para') + ' <strong>' + _esc(other.nickname || '—') + '</strong>'
      +   '</div>'
      + '</div>'
      + '<div class="mk-inbox-right">'
      +   '<span class="mk-inbox-time">' + _ago(ts) + '</span>'
      +   (unread > 0 ? '<span class="mk-buyer-unread">' + unread + '</span>' : '')
      +   '<span class="mk-inbox-status mk-is-' + _esc(session.status) + '">' + statusLabel + '</span>'
      + '</div>'
      + '</div>';
  }

  function _renderPanel() {
    if (!_panelEl) return;
    var active   = _sessions.filter(function(s){ return s.status === 'open' || s.status === 'active'; });
    var historic = _sessions.filter(function(s){ return s.status === 'sold' || s.status === 'closed' || s.status === 'cancelled'; });

    var html = '<div class="mk-inbox-panel">'
      + '<div class="mk-inbox-header">'
      +   '<span class="mk-inbox-title">💬 Negociações</span>'
      +   '<button class="mk-modal-close" onclick="MarketplaceInbox.hide()">✕</button>'
      + '</div>'
      + '<div class="mk-inbox-list">'
      + (active.length
          ? '<div class="mk-inbox-section-label">Abertas</div>' + active.map(_buildRow).join('')
          : '<div class="mk-inbox-empty">Nenhuma negociação aberta.</div>')
      + (historic.length
          ? '<div class="mk-inbox-section-label" style="margin-top:8px;opacity:.5">Histórico</div>' + historic.map(_buildRow).join('')
          : '')
      + '</div>'
      + '</div>';

    _panelEl.innerHTML = html;

    Array.prototype.forEach.call(_panelEl.querySelectorAll('.mk-inbox-row'), function(row) {
      row.addEventListener('click', function() {
        var sid      = row.getAttribute('data-session');
        var lid      = row.getAttribute('data-listing');
        openSession(sid, lid);
      });
    });
  }

  function openSession(sessionId, listingId) {
    if (!sessionId) return;
    var user = _user(); if (!user) return;
    var session  = _sessions.find(function(s){ return s.id === sessionId; });
    var listing  = (global.PA&&global.PA.marketplace&&global.PA.marketplace.listings||[])
      .find(function(l){ return l.id === listingId; });

    if (typeof MarketplaceChat !== 'undefined') {
      MarketplaceChat.open(sessionId, listingId, {
        listingName: listing ? listing.pokemon_name : (session&&session.listing&&session.listing.pokemon_name)||'—',
        buyerName:   session && session.buyer && session.buyer.nickname || '—',
        isSeller:    session ? session.seller_id === user.id : false,
      });
    }
    hide();
  }

  function show() {
    if (!_panelEl) {
      _panelEl = global.document.createElement('div');
      _panelEl.id = 'mk-inbox-wrap';
      global.document.body.appendChild(_panelEl);
    }
    _panelEl.style.display = '';
    _visible = true;
    _renderPanel();
    refresh();
  }

  function hide() {
    if (_panelEl) _panelEl.style.display = 'none';
    _visible = false;
  }

  function toggle() { _visible ? hide() : show(); }

  // ── Realtime ──────────────────────────────────────────────────
  function _initRealtime() {
    global.document.addEventListener('trade_sessions:changed', function(e) {
      var d=(e&&e.detail)||{};
      var r=d.record||{};
      var u=_user(); if(!u) return;
      if(r.buyer_id===u.id||r.seller_id===u.id) refresh();
    });

    global.document.addEventListener('trade_messages:changed', function(e) {
      var d=(e&&e.detail)||{};
      if(d.event!=='INSERT') return;
      var r=d.record||{};
      var chat = global.MarketplaceChat;
      if(chat && chat.getActiveSessionId() === r.session_id) return; // window is open
      notifyNewMessage(r);
    });
  }

  global.document.addEventListener('DOMContentLoaded', function() {
    _initRealtime();
    if (_user()) refresh();
    if (typeof Session !== 'undefined' && Session.onAuthChange) {
      Session.onAuthChange(function(ev) {
        if (ev === 'login')  { _sessions=[]; _unread=0; _updateBadge(); refresh(); }
        if (ev === 'logout') { _sessions=[]; _unread=0; _updateBadge(); hide(); }
      });
    }
  });

  global.MarketplaceInbox = {
    show:              show,
    hide:              hide,
    toggle:            toggle,
    refresh:           refresh,
    openSession:       openSession,
    notifyNewMessage:  notifyNewMessage,
    getUnread:         function(){ return _unread; },
  };

}(window));
