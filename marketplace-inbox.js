// ============================================================
// marketplace-inbox.js — Filipi Marketplace M4.1
// PokeAlliance Shop
// Central de negociações com realtime via MarketplaceChannels.
// ============================================================

;(function (global) {
  'use strict';

  if (global.MarketplaceInbox) return;

  var SB_URL = global.SUPABASE_URL || '';
  var SB_KEY = global.SUPABASE_KEY || '';

  function _jwt()  { return typeof Session!=='undefined'&&Session.getAccessToken?Session.getAccessToken():null; }
  function _user() { return typeof Session!=='undefined'?Session.getCurrentUser():null; }
  function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _toast(m,t){ if(typeof showToast==='function') showToast(m,t||'info'); }

  var _sessions = [];
  var _unread   = 0;
  var _panelEl  = null;
  var _visible  = false;
  var _msgHandler = null;
  var _sesHandler = null;

  async function refresh() {
    var user = _user(); var jwt = _jwt();
    if (!user || !jwt) return;
    try {
      var res = await fetch(
        SB_URL + '/rest/v1/trade_sessions'
          + '?or=(buyer_id.eq.' + user.id + ',seller_id.eq.' + user.id + ')'
          + '&status=in.(open,active,sold,closed,cancelled)'
          + '&order=last_message_at.desc.nullslast,updated_at.desc'
          + '&limit=50'
          + '&select=*,listing:listing_id(id,pokemon_name,status),buyer:buyer_id(id,nickname,avatar),seller:seller_id(id,nickname,avatar)',
        { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + jwt } }
      );
      if (!res.ok) return;
      var data = await res.json();
      _sessions = Array.isArray(data) ? data : [];
      var uid = user.id;
      _unread = _sessions.reduce(function(sum, s) {
        return sum + (s.buyer_id === uid ? (s.unread_buyer||0) : (s.unread_seller||0));
      }, 0);
      _updateBadge();
      if (_visible) _render();
    } catch(e) {}
  }

  function notifyNewMessage(record) {
    var user = _user(); if (!user || record.sender_id === user.id) return;
    var s = _sessions.find(function(s){ return s.id === record.session_id; });
    var senderName = s
      ? (s.buyer_id === record.sender_id ? (s.buyer&&s.buyer.nickname) : (s.seller&&s.seller.nickname))
      : null;
    _toast('💬 ' + (senderName||'Nova mensagem') + ': ' + String(record.content||record.body||'').slice(0,60), 'info');
    _unread++;
    _updateBadge();
    if (_visible) _render();
  }

  function _updateBadge() {
    var b = global.document.getElementById('mk-inbox-badge');
    if (!b) return;
    if (_unread > 0) { b.textContent = _unread > 99 ? '99+' : String(_unread); b.style.display = ''; }
    else b.style.display = 'none';
  }

  function _ago(iso) {
    if (!iso) return '';
    var ms = Date.now() - new Date(iso).getTime();
    if (ms < 60000) return 'agora';
    var m = Math.floor(ms/60000); if (m < 60) return m+'m';
    var h = Math.floor(m/60); if (h < 24) return h+'h';
    return Math.floor(h/24)+'d';
  }

  function _buildRow(s) {
    var user = _user(); if (!user) return '';
    var isBuyer = s.buyer_id === user.id;
    var other   = isBuyer ? (s.seller||{}) : (s.buyer||{});
    var listing = s.listing || {};
    var unread  = isBuyer ? (s.unread_buyer||0) : (s.unread_seller||0);
    var lbl     = { open:'Aberta', active:'Ativa', sold:'Vendido', closed:'Fechado', cancelled:'Cancelado' }[s.status]||s.status;
    return '<div class="mk-inbox-row mk-is-' + _esc(s.status) + '" data-session="' + _esc(s.id) + '" data-listing="' + _esc(s.listing_id||'') + '">'
      + '<div class="mk-inbox-avatar">'
      + (other.avatar ? '<img src="' + _esc(other.avatar) + '" alt="" onerror="this.style.display=\'none\'">' : '<div class="mk-inbox-avatar-fallback">👤</div>')
      + '</div>'
      + '<div class="mk-inbox-info">'
      +   '<div class="mk-inbox-pokemon">' + _esc(listing.pokemon_name||'—') + '</div>'
      +   '<div class="mk-inbox-meta">' + (isBuyer?'Comprando de':'Venda para') + ' <strong>' + _esc(other.nickname||'—') + '</strong></div>'
      + '</div>'
      + '<div class="mk-inbox-right">'
      +   '<span class="mk-inbox-time">' + _ago(s.last_message_at||s.updated_at) + '</span>'
      +   (unread > 0 ? '<span class="mk-buyer-unread">' + unread + '</span>' : '')
      +   '<span class="mk-inbox-status mk-is-' + _esc(s.status) + '">' + lbl + '</span>'
      + '</div>'
      + '</div>';
  }

  function _render() {
    if (!_panelEl) return;
    var active = _sessions.filter(function(s){ return s.status==='open'||s.status==='active'; });
    var hist   = _sessions.filter(function(s){ return s.status!=='open'&&s.status!=='active'; });
    var html = '<div class="mk-inbox-panel">'
      + '<div class="mk-inbox-header"><span class="mk-inbox-title">💬 Negociações</span>'
      +   '<button class="mk-modal-close" onclick="MarketplaceInbox.hide()">✕</button></div>'
      + '<div class="mk-inbox-list">'
      + (active.length
        ? '<div class="mk-inbox-section-label">Abertas</div>' + active.map(_buildRow).join('')
        : '<div class="mk-inbox-empty">Nenhuma negociação aberta.</div>')
      + (hist.length
        ? '<div class="mk-inbox-section-label" style="opacity:.5">Histórico</div>' + hist.map(_buildRow).join('')
        : '')
      + '</div></div>';
    _panelEl.innerHTML = html;

    Array.prototype.forEach.call(_panelEl.querySelectorAll('.mk-inbox-row'), function(row) {
      row.addEventListener('click', function() {
        openSession(row.getAttribute('data-session'), row.getAttribute('data-listing'));
      });
    });
  }

  function openSession(sessionId, listingId) {
    if (!sessionId) return;
    var user    = _user(); if (!user) return;
    var session = _sessions.find(function(s){ return s.id === sessionId; });
    var listing = (global.PA&&global.PA.marketplace&&global.PA.marketplace.listings||[])
      .find(function(l){ return l.id === listingId; });
    if (typeof MarketplaceChat !== 'undefined') {
      MarketplaceChat.open(sessionId, listingId, {
        listingName: (session&&session.listing&&session.listing.pokemon_name) || (listing&&listing.pokemon_name) || '—',
        buyerName:   (session&&session.buyer&&session.buyer.nickname)||'—',
        isSeller:    session ? session.seller_id === user.id : false,
      });
    }
    hide();
  }

  function show() {
    if (!_panelEl) { _panelEl = global.document.createElement('div'); _panelEl.id = 'mk-inbox-wrap'; global.document.body.appendChild(_panelEl); }
    _panelEl.style.display = '';
    _visible = true; _render(); refresh();
  }

  function hide() { if (_panelEl) _panelEl.style.display = 'none'; _visible = false; }
  function toggle() { _visible ? hide() : show(); }

  function _initRealtime() {
    var ch = global.MarketplaceChannels;
    if (!ch) return;

    _sesHandler = function(event, record) {
      var user = _user(); if (!user) return;
      if (record.buyer_id === user.id || record.seller_id === user.id) refresh();
    };
    ch.register('sessions:*', _sesHandler);

    _msgHandler = function(event, record) {
      if (event !== 'INSERT') return;
      var chat = global.MarketplaceChat;
      if (chat && chat.getActiveSessionId() === record.session_id) return; // window open
      notifyNewMessage(record);
    };
    ch.register('messages:*', _msgHandler);

    console.log('[subscription create] MarketplaceInbox realtime registered');
  }

  global.document.addEventListener('DOMContentLoaded', function() {
    _initRealtime();
    if (_user()) refresh();
    if (typeof Session !== 'undefined' && Session.onAuthChange) {
      Session.onAuthChange(function(ev) {
        if (ev==='login')  { _sessions=[]; _unread=0; _updateBadge(); refresh(); }
        if (ev==='logout') { _sessions=[]; _unread=0; _updateBadge(); hide(); }
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

  global.MarketplaceInbox = {
    show: show, hide: hide, toggle: toggle,
    refresh: refresh, openSession: openSession,
    notifyNewMessage: notifyNewMessage,
    getUnread: function(){ return _unread; },
  };

}(window));
