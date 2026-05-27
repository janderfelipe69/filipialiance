// ============================================================
// marketplace-trade.js — Filipi Marketplace M4
// PokeAlliance Shop
//
// Responsável por:
//   • Iniciar negociação (rpc_start_negotiation)
//   • Badge "N conversas" no card do listing
//   • Painel de compradores por listing
//   • Realtime de trade_sessions
// ============================================================

;(function (global) {
  'use strict';

  if (global.MarketplaceTrade) return;

  var SB_URL = global.SUPABASE_URL || '';
  var SB_KEY = global.SUPABASE_KEY || '';

  function _jwt()    { return typeof Session!=='undefined'&&Session.getAccessToken?Session.getAccessToken():null; }
  function _user()   { return typeof Session!=='undefined'?Session.getCurrentUser():null; }
  function _isAdmin(){ return typeof Session!=='undefined'&&Session.isAdmin&&Session.isAdmin(); }
  function _esc(s)   { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _tel(c,d) { if(global.PA&&global.PA.telemetry) global.PA.telemetry.push(c,d); }
  function _toast(m,t){ if(typeof showToast==='function') showToast(m,t||'info'); }
  function _emit(ev,p){ if(global.PA&&global.PA.hooks&&global.PA.hooks.emit) try{global.PA.hooks.emit(ev,p);}catch(_){} }

  var _pendingLocks = {};

  // ── Fetch sessions for a listing (seller view) ─────────────
  async function fetchListingSessions(listingId) {
    var jwt = _jwt(); if (!jwt) return [];
    try {
      var res = await fetch(
        SB_URL + '/rest/v1/trade_sessions'
          + '?listing_id=eq.' + listingId
          + '&status=in.(active,open)'
          + '&order=last_message_at.desc.nullslast'
          + '&select=*,buyer:buyer_id(id,nickname,avatar)',
        { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + jwt } }
      );
      if (!res.ok) return [];
      return await res.json();
    } catch(e) { return []; }
  }

  // ── Badge: show conversation count on seller's card ─────────
  function updateConvBadge(listingId, count) {
    var card = global.document.querySelector('[data-listing-id="' + listingId + '"]');
    if (!card) return;
    var existing = card.querySelector('.mk-conv-badge');
    if (count > 0) {
      if (!existing) {
        existing = global.document.createElement('div');
        existing.className = 'mk-conv-badge';
        existing.setAttribute('onclick',
          'event.stopPropagation();MarketplaceTrade.openBuyerPanel("' + _esc(listingId) + '")');
        card.querySelector('.mk-card-top').appendChild(existing);
      }
      existing.textContent = count + (count === 1 ? ' conversa' : ' conversas');
    } else if (existing) {
      existing.remove();
    }
  }

  // ── Buyer panel: inline list of open negotiations ────────────
  var _openPanels = {};

  async function openBuyerPanel(listingId) {
    var card = global.document.querySelector('[data-listing-id="' + listingId + '"]');
    if (!card) return;

    // Toggle
    var existing = card.querySelector('.mk-buyer-panel');
    if (existing) { existing.remove(); delete _openPanels[listingId]; return; }

    var sessions = await fetchListingSessions(listingId);

    var panel = global.document.createElement('div');
    panel.className = 'mk-buyer-panel';
    panel.innerHTML = sessions.length === 0
      ? '<div class="mk-buyer-panel-empty">Nenhuma negociação aberta.</div>'
      : sessions.map(function(s) {
          var buyer = s.buyer || {};
          var unread = s.unread_seller || 0;
          return '<div class="mk-buyer-row" data-session="' + _esc(s.id) + '">'
            + '<div class="mk-buyer-avatar">'
            + (buyer.avatar ? '<img src="' + _esc(buyer.avatar) + '" alt="" onerror="this.style.display=\'none\'">' : '👤')
            + '</div>'
            + '<span class="mk-buyer-name">' + _esc(buyer.nickname || '—') + '</span>'
            + (unread > 0 ? '<span class="mk-buyer-unread">' + unread + '</span>' : '')
            + '</div>';
        }).join('');

    // Click each row → open chat window
    var listing = (global.PA && global.PA.marketplace && global.PA.marketplace.listings || [])
      .find(function(l){ return l.id === listingId; });
    var listingName = listing ? (listing.pokemon_name || '—') : '—';

    Array.prototype.forEach.call(panel.querySelectorAll('.mk-buyer-row'), function(row) {
      row.addEventListener('click', function() {
        var sid = row.getAttribute('data-session');
        var sess = sessions.find(function(s){ return s.id === sid; });
        if (typeof MarketplaceChat !== 'undefined') {
          MarketplaceChat.open(sid, listingId, {
            listingName: listingName,
            buyerName:   (sess && sess.buyer && sess.buyer.nickname) || '—',
            isSeller:    true,
          });
        }
        panel.remove();
        delete _openPanels[listingId];
      });
    });

    card.appendChild(panel);
    _openPanels[listingId] = panel;
  }

  // ── Start negotiation (buyer) ────────────────────────────────
  async function startNegotiation(listingId) {
    var user = _user();
    if (!user) { _toast('Faça login para negociar.', 'info'); return; }
    if (_pendingLocks[listingId]) return;
    _pendingLocks[listingId] = true;

    var card = global.document.querySelector('[data-listing-id="' + listingId + '"]');
    var btn  = card && card.querySelector('.mk-btn--negotiate');
    var orig = btn ? btn.textContent : '🤝 Negociar';
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Abrindo...'; }

    try {
      var res = await fetch(SB_URL + '/rest/v1/rpc/rpc_start_negotiation', {
        method: 'POST',
        headers: { 'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+_jwt() },
        body: JSON.stringify({ p_listing_id: listingId }),
      });
      var raw = await res.text();

      if (!res.ok) {
        console.error('[PA.marketplace.trade] RPC error', { fn:'rpc_start_negotiation', status:res.status, raw:raw });
        _toast('Erro ao iniciar negociação.', 'error');
        return;
      }

      var data = null;
      try { data = JSON.parse(raw); } catch(_) {}
      console.log('[PA.marketplace.trade] rpc_start_negotiation result:', data);

      if (data && data.success) {
        var listing = (global.PA&&global.PA.marketplace&&global.PA.marketplace.listings||[])
          .find(function(l){ return l.id === listingId; });

        if (typeof MarketplaceChat !== 'undefined') {
          MarketplaceChat.open(data.session_id, listingId, {
            listingName: listing ? listing.pokemon_name : '—',
            isSeller:    false,
            reused:      !!data.reused,
          });
        }
        if (!data.reused) _toast('✅ Conversa iniciada!', 'success');
        _emit('marketplace:trade_started', { listingId: listingId, sessionId: data.session_id });
        _tel('mk-trade-started', { listingId: listingId });
      } else {
        var errMap = {
          listing_unavailable:    'Este anúncio não está mais disponível.',
          cannot_buy_own_listing: 'Você não pode negociar seu próprio anúncio.',
          not_authenticated:      'Faça login para negociar.',
        };
        _toast(errMap[(data&&data.error)] || 'Não foi possível iniciar.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = orig; }
      }
    } catch(err) {
      console.error('[PA.marketplace.trade] startNegotiation error:', err.message);
      _toast('Erro ao iniciar negociação.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = orig; }
    } finally {
      delete _pendingLocks[listingId];
    }
  }

  // ── Realtime: trade_sessions ─────────────────────────────────
  function _initRealtime() {
    global.document.addEventListener('trade_sessions:changed', function(e) {
      try {
        var d = (e&&e.detail)||{};
        var tipo = d.event; var record = d.record||{};
        var user = _user(); if (!user) return;

        console.log('[trade_session]', { event: tipo, session: record });

        // Seller: new session opened on MY listing → refresh badge
        if (tipo === 'INSERT' && record.seller_id === user.id) {
          _refreshBadge(record.listing_id);
          _toast('💬 Novo comprador quer negociar!', 'info');
          if (typeof MarketplaceInbox !== 'undefined') MarketplaceInbox.refresh();
        }

        // UPDATE on a session I'm in
        if (tipo === 'UPDATE') {
          if (record.seller_id === user.id) _refreshBadge(record.listing_id);
          if (typeof MarketplaceInbox !== 'undefined') MarketplaceInbox.refresh();
        }
      } catch(err) {}
    });
  }

  async function _refreshBadge(listingId) {
    var sessions = await fetchListingSessions(listingId);
    updateConvBadge(listingId, sessions.length);
  }

  // ── Init ──────────────────────────────────────────────────────
  global.document.addEventListener('DOMContentLoaded', function() {
    _initRealtime();
    if (global.PA && global.PA.lifecycle) {
      global.PA.lifecycle.registerCleanup('marketplace-trade', function() {
        _pendingLocks = {};
      });
    }
  });

  global.MarketplaceTrade = {
    startNegotiation:  startNegotiation,
    openBuyerPanel:    openBuyerPanel,
    updateConvBadge:   updateConvBadge,
    fetchListingSessions: fetchListingSessions,
    getStats: function() {
      return { pendingLocks: Object.keys(_pendingLocks).length };
    },
  };

}(window));
