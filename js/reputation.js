// ============================================================
// reputation.js — Reputação do vendedor + entrega (print/confirmação)
// Mercadão Aliance
//
// • Badge de reputação nos cards do marketplace (⭐ média + nº entregas).
// • Modal do VENDEDOR para enviar o print da entrega (após "Venda Efetuada").
// • Modal do COMPRADOR para confirmar recebimento + avaliar (1..5★).
//
// Backend (já migrado):
//   submit_delivery(listing_id, session_id, pokemon_name, proof_url, server)
//   confirm_delivery(id, rating, review)
//   sellers_reputation(ids[])  -> [{seller_id, confirmed, rated, avg_rating}]
//   my_pending_deliveries()    -> entregas pendentes do comprador logado
// ============================================================

;(function (global) {
  'use strict';

  var SB_URL = global.SUPABASE_URL;
  var SB_KEY = global.SUPABASE_KEY;

  function _jwt() {
    return (typeof Session !== 'undefined' && Session.getAccessToken) ? Session.getAccessToken() : null;
  }
  function _headers(auth) {
    var tok = (auth && _jwt()) || SB_KEY;
    return { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': 'Bearer ' + tok };
  }
  function _rpc(name, body, auth) {
    return fetch(SB_URL + '/rest/v1/rpc/' + name, {
      method: 'POST', headers: _headers(auth), body: JSON.stringify(body || {}),
    }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  function _world() { return (global.PA && global.PA.world && global.PA.world.get()) || 'Moon'; }
  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]; }); }

  // ════════════════════════════════════════════════════════════
  // 1) BADGES DE REPUTAÇÃO NOS CARDS
  // ════════════════════════════════════════════════════════════
  var _repCache = {};   // seller_id -> {confirmed, avg_rating}

  function _badgeHtml(rep) {
    if (!rep || !rep.confirmed) {
      return '<span class="mk-rep-badge mk-rep-badge--new" title="Sem entregas confirmadas ainda">🆕 Novo</span>';
    }
    var star = rep.avg_rating != null ? ('⭐ ' + rep.avg_rating) : '⭐ —';
    return '<span class="mk-rep-badge" title="' + rep.confirmed + ' entrega(s) confirmada(s)">'
      + star + ' · ' + rep.confirmed + '✓</span>';
  }

  function _injectBadges() {
    var cards = document.querySelectorAll('#marketplace-list .mk-card[data-seller]');
    if (!cards.length) return;
    cards.forEach(function (card) {
      var sid = card.getAttribute('data-seller');
      if (!sid) return;
      var rep = _repCache[sid];
      if (rep === undefined) return; // ainda não carregado
      var existing = card.querySelector('.mk-rep-badge-wrap');
      var html = '<div class="mk-rep-badge-wrap">' + _badgeHtml(rep) + '</div>';
      if (existing) existing.outerHTML = html;
      else card.insertAdjacentHTML('afterbegin', html);
    });
  }

  function refreshBadges() {
    var cards = document.querySelectorAll('#marketplace-list .mk-card[data-seller]');
    var ids = {};
    cards.forEach(function (c) { var s = c.getAttribute('data-seller'); if (s) ids[s] = 1; });
    var list = Object.keys(ids);
    if (!list.length) return;
    var missing = list.filter(function (id) { return _repCache[id] === undefined; });
    if (!missing.length) { _injectBadges(); return; }
    _rpc('sellers_reputation', { p_ids: missing }).then(function (rows) {
      // marca todos como carregados (mesmo os sem registro → reputação zero)
      missing.forEach(function (id) { _repCache[id] = { confirmed: 0, rated: 0, avg_rating: null }; });
      if (Array.isArray(rows)) rows.forEach(function (r) {
        _repCache[r.seller_id] = { confirmed: r.confirmed || 0, rated: r.rated || 0, avg_rating: r.avg_rating };
      });
      _injectBadges();
    });
  }

  // Observa a lista do marketplace e atualiza os badges (debounce)
  function _observeMarketplace() {
    var container = document.getElementById('marketplace-list');
    if (!container) return;
    var t = null;
    new MutationObserver(function () {
      clearTimeout(t); t = setTimeout(refreshBadges, 150);
    }).observe(container, { childList: true, subtree: false });
    refreshBadges();
  }

  // ════════════════════════════════════════════════════════════
  // 2) MODAL: VENDEDOR ENVIA O PRINT DA ENTREGA
  // ════════════════════════════════════════════════════════════
  function _overlay(id) {
    var el = document.getElementById(id);
    if (el) return el;
    el = document.createElement('div');
    el.id = id; el.className = 'rep-overlay';
    el.addEventListener('click', function (e) { if (e.target === el) el.classList.remove('open'); });
    document.body.appendChild(el);
    return el;
  }

  function openDeliveryModal(opts) {
    opts = opts || {};
    var el = _overlay('rep-deliv-overlay');
    el.classList.add('open');
    el.innerHTML =
      '<div class="rep-modal">'
      + '<button class="rep-close" aria-label="Fechar">✕</button>'
      + '<div class="rep-head"><span class="rep-title">📦 Print da entrega</span>'
      +   '<span class="rep-sub">' + _esc(opts.pokemonName || 'Item vendido') + ' → ' + _esc(opts.buyerName || 'comprador') + '</span></div>'
      + '<p class="rep-hint">Cole o link da imagem (Imgur) com o print da entrega. O comprador vai confirmar e te avaliar.</p>'
      + '<input type="url" class="rep-input" id="rep-proof-input" placeholder="https://i.imgur.com/abc123.png">'
      + '<div class="rep-preview" id="rep-proof-preview" style="display:none"><img id="rep-proof-img" alt="preview"></div>'
      + '<div class="rep-actions">'
      +   '<button class="mk-btn mk-btn--ghost" id="rep-deliv-skip">Agora não</button>'
      +   '<button class="mk-btn mk-btn--primary" id="rep-deliv-send">Enviar print</button>'
      + '</div>'
      + '</div>';

    var input = el.querySelector('#rep-proof-input');
    var prev  = el.querySelector('#rep-proof-preview');
    var img   = el.querySelector('#rep-proof-img');
    input.addEventListener('input', function () {
      var v = input.value.trim();
      if (/^https?:\/\/.+\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(v) || /imgur\.com/i.test(v)) {
        img.src = v; prev.style.display = 'block';
      } else { prev.style.display = 'none'; }
    });
    el.querySelector('.rep-close').addEventListener('click', function () { el.classList.remove('open'); });
    el.querySelector('#rep-deliv-skip').addEventListener('click', function () { el.classList.remove('open'); });
    el.querySelector('#rep-deliv-send').addEventListener('click', function () {
      var url = input.value.trim();
      if (!url) { if (typeof showToast === 'function') showToast('Cole o link do print.', 'error'); return; }
      var btn = el.querySelector('#rep-deliv-send'); btn.disabled = true; btn.textContent = 'Enviando…';
      _rpc('submit_delivery', {
        p_listing_id: opts.listingId || null,
        p_session_id: opts.sessionId || null,
        p_pokemon_name: opts.pokemonName || null,
        p_proof_url: url,
        p_server: _world(),
      }, true).then(function (res) {
        if (res) {
          if (typeof showToast === 'function') showToast('Print enviado! Aguardando confirmação do comprador.', 'success');
          el.classList.remove('open');
        } else {
          btn.disabled = false; btn.textContent = 'Enviar print';
          if (typeof showToast === 'function') showToast('Não foi possível enviar. Tente de novo.', 'error');
        }
      });
    });
  }

  // ════════════════════════════════════════════════════════════
  // 3) MODAL: COMPRADOR CONFIRMA + AVALIA
  // ════════════════════════════════════════════════════════════
  function openConfirmModal(deliv) {
    deliv = deliv || {};
    var el = _overlay('rep-confirm-overlay');
    el.classList.add('open');
    var stars = [1,2,3,4,5].map(function (n) {
      return '<button class="rep-star" data-star="' + n + '" type="button">★</button>';
    }).join('');
    el.innerHTML =
      '<div class="rep-modal">'
      + '<button class="rep-close" aria-label="Fechar">✕</button>'
      + '<div class="rep-head"><span class="rep-title">✅ Confirmar entrega</span>'
      +   '<span class="rep-sub">' + _esc(deliv.pokemon_name || 'Item') + '</span></div>'
      + (deliv.proof_url
          ? '<div class="rep-preview"><img src="' + _esc(deliv.proof_url) + '" alt="print da entrega"></div>'
          : '<p class="rep-hint">O vendedor marcou a venda como entregue.</p>')
      + '<p class="rep-hint">Como foi sua experiência com o vendedor?</p>'
      + '<div class="rep-stars" id="rep-stars">' + stars + '</div>'
      + '<textarea class="rep-input rep-textarea" id="rep-review" placeholder="Comentário (opcional)"></textarea>'
      + '<div class="rep-actions">'
      +   '<button class="mk-btn mk-btn--ghost" id="rep-confirm-cancel">Fechar</button>'
      +   '<button class="mk-btn mk-btn--primary" id="rep-confirm-ok" disabled>Confirmar e avaliar</button>'
      + '</div>'
      + '</div>';

    var chosen = 0;
    var starEls = el.querySelectorAll('.rep-star');
    starEls.forEach(function (s) {
      s.addEventListener('click', function () {
        chosen = parseInt(s.getAttribute('data-star'), 10);
        starEls.forEach(function (x) {
          x.classList.toggle('on', parseInt(x.getAttribute('data-star'), 10) <= chosen);
        });
        el.querySelector('#rep-confirm-ok').disabled = false;
      });
    });
    el.querySelector('.rep-close').addEventListener('click', function () { el.classList.remove('open'); });
    el.querySelector('#rep-confirm-cancel').addEventListener('click', function () { el.classList.remove('open'); });
    el.querySelector('#rep-confirm-ok').addEventListener('click', function () {
      if (!chosen) return;
      var review = el.querySelector('#rep-review').value.trim() || null;
      var btn = el.querySelector('#rep-confirm-ok'); btn.disabled = true; btn.textContent = 'Enviando…';
      _rpc('confirm_delivery', { p_id: deliv.id, p_rating: chosen, p_review: review }, true).then(function (ok) {
        if (ok) {
          if (typeof showToast === 'function') showToast('Obrigado! Entrega confirmada e avaliada.', 'success');
          el.classList.remove('open');
          // limpa cache de reputação do vendedor p/ atualizar o badge
          if (deliv.seller_id) delete _repCache[deliv.seller_id];
          refreshBadges();
        } else {
          btn.disabled = false; btn.textContent = 'Confirmar e avaliar';
          if (typeof showToast === 'function') showToast('Não foi possível confirmar.', 'error');
        }
      });
    });
  }

  // Verifica entregas pendentes do comprador logado e abre o modal da primeira
  function checkPending() {
    if (!_jwt()) return;
    _rpc('my_pending_deliveries', {}, true).then(function (rows) {
      if (Array.isArray(rows) && rows.length) openConfirmModal(rows[0]);
    });
  }

  // ── Init ────────────────────────────────────────────────────
  function _start() {
    _observeMarketplace();
    // checa pendências após a sessão estar pronta
    if (typeof Session !== 'undefined' && Session.ready) {
      Session.ready().then(function () { setTimeout(checkPending, 1500); });
    } else {
      setTimeout(checkPending, 3000);
    }
    global.addEventListener('pa:server-change', function () { _repCache = {}; refreshBadges(); });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') document.querySelectorAll('.rep-overlay.open').forEach(function (o) { o.classList.remove('open'); });
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _start);
  else _start();

  global.PA = global.PA || {};
  global.PA.reputation = {
    refreshBadges: refreshBadges,
    openDeliveryModal: openDeliveryModal,
    openConfirmModal: openConfirmModal,
    checkPending: checkPending,
  };

})(typeof window !== 'undefined' ? window : this);
