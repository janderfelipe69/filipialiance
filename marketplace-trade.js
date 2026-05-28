// ============================================================
// marketplace-trade.js — Filipi Marketplace M4.1
// PokeAlliance Shop
//
// • startNegotiation (sem lock)
// • Badge de conversas por listing
// • Painel de compradores
// • Realtime via MarketplaceChannels
// ============================================================

;(function (global) {
  'use strict';

  if (global.MarketplaceTrade) return;

  var SB_URL = global.SUPABASE_URL || '';
  var SB_KEY = global.SUPABASE_KEY || '';

  function _jwt()    { return typeof Session!=='undefined'&&Session.getAccessToken?Session.getAccessToken():null; }
  function _user()   { return typeof Session!=='undefined'?Session.getCurrentUser():null; }
  function _esc(s)   { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _tel(c,d) { if(global.PA&&global.PA.telemetry) global.PA.telemetry.push(c,d); }
  function _toast(m,t){ if(typeof showToast==='function') showToast(m,t||'info'); }
  function _emit(ev,p){ if(global.PA&&global.PA.hooks&&global.PA.hooks.emit) try{global.PA.hooks.emit(ev,p);}catch(_){} }

  var _pendingLocks   = {};
  var _sessionHandler = null; // MarketplaceChannels handler for sessions:*
  var _listingHandler = null; // MarketplaceChannels handler for listings:*

  // ── Fetch sessions for a listing ─────────────────────────────
  async function fetchListingSessions(listingId) {
    var jwt = _jwt(); if (!jwt) return [];
    try {
      var res = await fetch(
        SB_URL + '/rest/v1/trade_sessions'
          + '?listing_id=eq.' + listingId
          + '&status=in.(open,active)'
          + '&order=last_message_at.desc.nullslast'
          + '&select=id,buyer_id,unread_seller,last_message_at,buyer:buyer_id(id,nickname,avatar)',
        { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + jwt } }
      );
      if (!res.ok) return [];
      return await res.json();
    } catch(e) { return []; }
  }

  // ── Badge: conversation count on seller's card ────────────────
  function refreshBadge(listingId) {
    fetchListingSessions(listingId).then(function(sessions) {
      updateConvBadge(listingId, sessions.length, sessions);
    });
  }

  function updateConvBadge(listingId, count, sessions) {
    var card = global.document.querySelector('[data-listing-id="' + _esc(listingId) + '"]');
    if (!card) return;
    var existing = card.querySelector('.mk-conv-badge');

    if (count > 0) {
      // Total unread across all sessions
      var totalUnread = (sessions||[]).reduce(function(s,sess){ return s + (sess.unread_seller||0); }, 0);

      if (!existing) {
        existing = global.document.createElement('div');
        existing.className = 'mk-conv-badge';
        var top = card.querySelector('.mk-card-top');
        if (top) top.appendChild(existing);
      }
      existing.textContent = count + (count===1?' conversa':' conversas') + (totalUnread > 0 ? ' ('+totalUnread+' novas)' : '');
      existing.setAttribute('data-open-trades', listingId);
    } else if (existing) {
      existing.remove();
    }
  }

  // ── Buyer panel ───────────────────────────────────────────────
  async function openBuyerPanel(listingId) {
    var card = global.document.querySelector('[data-listing-id="' + _esc(listingId) + '"]');
    if (!card) return;

    var existing = card.querySelector('.mk-buyer-panel');
    if (existing) { existing.remove(); return; }

    var sessions = await fetchListingSessions(listingId);
    var listing  = (global.PA&&global.PA.marketplace&&global.PA.marketplace.listings||[])
      .find(function(l){ return l.id === listingId; });
    var listingName = listing ? listing.pokemon_name : '—';

    var panel = global.document.createElement('div');
    panel.className = 'mk-buyer-panel';

    if (!sessions.length) {
      panel.innerHTML = '<div class="mk-buyer-panel-empty">Nenhuma negociação aberta.</div>';
    } else {
      panel.innerHTML = sessions.map(function(s) {
        var b = s.buyer || {};
        var unread = s.unread_seller || 0;
        return '<div class="mk-buyer-row" data-session="' + _esc(s.id) + '">'
          + '<div class="mk-buyer-avatar">'
          + (b.avatar ? '<img src="' + _esc(b.avatar) + '" alt="" onerror="this.style.display=\'none\'">' : '👤')
          + '</div>'
          + '<span class="mk-buyer-name">' + _esc(b.nickname || '—') + '</span>'
          + (unread > 0 ? '<span class="mk-buyer-unread">' + unread + '</span>' : '')
          + '</div>';
      }).join('');

      Array.prototype.forEach.call(panel.querySelectorAll('.mk-buyer-row'), function(row) {
        row.addEventListener('click', function() {
          var sid  = row.getAttribute('data-session');
          var sess = sessions.find(function(s){ return s.id === sid; });
          if (typeof MarketplaceChat !== 'undefined') {
            MarketplaceChat.open(sid, listingId, {
              listingName: listingName,
              buyerName:   (sess&&sess.buyer&&sess.buyer.nickname)||'—',
              isSeller:    true,
            });
          }
          panel.remove();
        });
      });
    }

    // Close on outside click
    setTimeout(function() {
      global.document.addEventListener('click', function _closePanel(e) {
        if (!panel.contains(e.target)) { panel.remove(); global.document.removeEventListener('click', _closePanel); }
      });
    }, 50);

    card.appendChild(panel);
    card.style.position = 'relative'; // ensure panel positions correctly
  }

  // ── Start negotiation ─────────────────────────────────────────
  async function startNegotiation(listingId) {
    var user = _user();
    if (!user) { _toast('Faça login para negociar.', 'info'); return; }
    if (_pendingLocks[listingId]) return;
    _pendingLocks[listingId] = true;

    var card = global.document.querySelector('[data-listing-id="' + listingId + '"]');
    var btn  = card && card.querySelector('.mk-btn--negotiate');
    var orig = btn ? btn.textContent : '🤝 Negociar';
    if (btn) { btn.disabled = true; btn.textContent = '⏳...'; }

    try {
      var res = await fetch(SB_URL + '/rest/v1/rpc/rpc_start_negotiation', {
        method: 'POST',
        headers: { 'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+_jwt() },
        body: JSON.stringify({ p_listing_id: listingId }),
      });
      var raw = await res.text();
      if (!res.ok) {
        console.error('[trade session] start error', { status: res.status, body: raw });
        _toast('Erro ao iniciar negociação.', 'error');
        return;
      }
      var data = null; try { data = JSON.parse(raw); } catch(_){}
      console.log('[trade session]', { event: 'start', result: data });

      if (data && data.success) {
        var listing = (global.PA&&global.PA.marketplace&&global.PA.marketplace.listings||[])
          .find(function(l){ return l.id === listingId; });
        if (typeof MarketplaceChat !== 'undefined') {
          MarketplaceChat.open(data.session_id, listingId, {
            listingName: listing ? listing.pokemon_name : '—',
            isSeller:    false,
          });
        }
        if (!data.reused) _toast('✅ Conversa iniciada!', 'success');
        _emit('marketplace:trade_started', { listingId: listingId, sessionId: data.session_id });
        _tel('mk-trade-started', { listingId: listingId });
      } else {
        var errMap = {
          listing_unavailable:    'Este anúncio não está disponível.',
          cannot_buy_own_listing: 'Você não pode negociar seu próprio anúncio.',
          not_authenticated:      'Faça login para negociar.',
        };
        _toast(errMap[(data&&data.error)]||'Não foi possível iniciar.', 'error');
        if (btn) { btn.disabled = false; btn.textContent = orig; }
      }
    } catch(e) {
      console.error('[trade session] startNegotiation exception:', e.message);
      _toast('Erro ao iniciar negociação.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = orig; }
    } finally {
      delete _pendingLocks[listingId];
    }
  }

  // ── Realtime via MarketplaceChannels ──────────────────────────
  function _initRealtime() {
    var ch = global.MarketplaceChannels;
    if (!ch) return;

    // Sessions: new/updated session → refresh badge for seller
    _sessionHandler = function(event, record) {
      var user = _user(); if (!user) return;
      if (record.seller_id === user.id) {
        refreshBadge(record.listing_id);
        if (event === 'INSERT') {
          _toast('💬 Novo comprador quer negociar!', 'info');
          if (typeof MarketplaceInbox !== 'undefined') MarketplaceInbox.refresh();
        }
      }
      if (event === 'UPDATE' && (record.buyer_id === user.id || record.seller_id === user.id)) {
        if (typeof MarketplaceInbox !== 'undefined') MarketplaceInbox.refresh();
      }
    };
    ch.register('sessions:*', _sessionHandler);

    // Listings: if listing sold → remove card
    _listingHandler = function(event, record) {
      // Handle DELETE (rpc_delete_listing fired a real DELETE)
      if (event === 'DELETE' && record.id) {
        var lEl = global.document.querySelector('[data-listing-id="' + record.id + '"]');
        if (lEl) {
          lEl.style.transition = 'opacity .25s';
          lEl.style.opacity = '0';
          setTimeout(function(){ lEl.remove(); }, 260);
        }
        if (global.PA && global.PA.marketplace) {
          global.PA.marketplace.listings = (global.PA.marketplace.listings||[])
            .filter(function(l){ return l.id !== record.id; });
        }
        // Close any open chat windows for this listing
        if (typeof MarketplaceChat !== 'undefined' && MarketplaceChat.getWindowsByListing) {
          MarketplaceChat.getWindowsByListing(record.id).forEach(function(w){ w.destroy(); });
        }
        if (typeof MarketplaceInbox !== 'undefined') MarketplaceInbox.refresh();
        return;
      }
      if (event !== 'UPDATE' || record.status !== 'sold') return;
      if (!global.PA || !global.PA.marketplace) return;
      var listings = global.PA.marketplace.listings || [];
      var exists = listings.some(function(l){ return l.id === record.id; });
      if (!exists) return;
      console.log('[listing update]', { event: 'sold', id: record.id });
      global.PA.marketplace.listings = listings.filter(function(l){ return l.id !== record.id; });
      var lEl = global.document.querySelector('[data-listing-id="' + record.id + '"]');
      if (lEl) {
        lEl.style.transition = 'opacity .3s, transform .3s';
        lEl.style.opacity = '0';
        setTimeout(function(){ lEl.remove(); }, 300);
      }
      if (typeof MarketplaceInbox !== 'undefined') MarketplaceInbox.refresh();
    };
    ch.register('listings:*', _listingHandler);

    console.log('[subscription create] MarketplaceTrade realtime registered');
  }

  // ── Event delegation for conv badge clicks ──────────────────
  // One listener on document — never rebinds when cards morph
  global.document.addEventListener('click', function(e) {
    var badge = e.target.closest('[data-open-trades]');
    if (!badge) return;
    e.stopPropagation();
    var listingId = badge.getAttribute('data-open-trades');
    if (listingId) openBuyerPanel(listingId);
  });

  global.document.addEventListener('DOMContentLoaded', function() {
    _initRealtime();
    if (global.PA && global.PA.lifecycle) {
      global.PA.lifecycle.registerCleanup('marketplace-trade', function() {
        if (global.MarketplaceChannels && _sessionHandler) global.MarketplaceChannels.unregister('sessions:*', _sessionHandler);
        if (global.MarketplaceChannels && _listingHandler) global.MarketplaceChannels.unregister('listings:*', _listingHandler);
        _pendingLocks = {};
      });
    }
  });

  global.MarketplaceTrade = {
    startNegotiation:     startNegotiation,
    openBuyerPanel:       openBuyerPanel,
    updateConvBadge:      updateConvBadge,
    refreshBadge:         refreshBadge,
    fetchListingSessions: fetchListingSessions,
    getStats: function() { return { pendingLocks: Object.keys(_pendingLocks).length }; },
  };

}(window));
