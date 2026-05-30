// ============================================================
// services.js — "Faço service" (ofertas de serviço da comunidade)
// Mercadão Aliance — view dentro do hub do Marketplace
//
// Tabela: service_listings (provider_id, title, description, price_kk, server, status)
// Separado por mundo (Moon/Sun), expira em 7 dias (cron), com "Meus" + Renovar.
// ============================================================

;(function (global) {
  'use strict';
  if (global.Services) return;

  var SB_URL = global.SUPABASE_URL || '';
  var SB_KEY = global.SUPABASE_KEY || '';

  function _jwt() { return (typeof Session !== 'undefined' && Session.getAccessToken) ? Session.getAccessToken() : null; }
  function _me()  { return typeof Session !== 'undefined' ? Session.getCurrentUser() : null; }
  function _world() { return (global.PA && global.PA.world && global.PA.world.get()) || 'Moon'; }
  function _headers() { return { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + (_jwt() || SB_KEY) }; }
  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]; }); }
  function _fmtKk(n) { if (n == null) return null; var m = n/1000000; return (m>=1?(Math.round(m*10)/10)+'kk':Math.round(n/1000)+'k'); }

  var _state = { listings: [], mineListings: [], mine: false, search: '', loading: false, inited: false };

  function _list() { return _state.mine ? _state.mineListings : _state.listings; }

  function _card(s) {
    var me = _me();
    var isOwner = !!(me && s.provider_id === me.id);
    var nick = s.provider_nickname || 'Provedor';
    var price = _fmtKk(s.price_kk);
    var status = s.status || 'active';
    var actions = '';
    if (isOwner) {
      var renew = (status === 'expired')
        ? '<button class="mk-btn mk-btn--primary mk-btn--sm" onclick="Services&&Services.renew(\'' + _esc(s.id) + '\')">♻️ Renovar</button>' : '';
      actions = '<div class="mk-card-actions">' + renew
        + '<button class="mk-btn mk-btn--danger-ghost mk-btn--sm" onclick="Services&&Services.cancel(\'' + _esc(s.id) + '\')">✕ Cancelar</button></div>';
    }
    var badge = status === 'expired' ? '<span class="mk-status-badge mk-status--expired">Expirado</span>'
              : status === 'cancelled' ? '<span class="mk-status-badge mk-status--cancelled">Cancelado</span>'
              : '<span class="mk-status-badge mk-status--active">Ativo</span>';
    return '<div class="svc-card">'
      + '<div class="svc-card-head"><span class="svc-card-title">🛠️ ' + _esc(s.title) + '</span>' + badge + '</div>'
      + (s.description ? '<div class="svc-card-desc">' + _esc(s.description) + '</div>' : '')
      + '<div class="svc-card-foot">'
      +   '<span class="svc-card-provider">por <b>' + _esc(nick) + '</b></span>'
      +   (price ? '<span class="svc-card-price">◈ ' + price + '</span>' : '<span class="svc-card-price svc-card-price--neg">A combinar</span>')
      + '</div>'
      + actions
      + '</div>';
  }

  function render() {
    var box = document.getElementById('service-list');
    if (!box) return;
    var arr = _list().filter(function (s) {
      if (!_state.mine && s.status !== 'active') return false;
      if (_state.mine && s.status === 'deleted') return false;
      if (_state.search) return (s.title || '').toLowerCase().includes(_state.search.toLowerCase());
      return true;
    });
    if (_state.loading && !arr.length) { box.innerHTML = '<div class="svc-empty">Carregando…</div>'; return; }
    if (!arr.length) {
      box.innerHTML = '<div class="svc-empty">Nenhum service ' + (_state.mine ? 'seu ' : '') + 'no mundo ' + _world() + '.<br><span>Ofereça o seu e a comunidade te encontra.</span></div>';
      return;
    }
    box.innerHTML = '<div class="svc-grid">' + arr.map(_card).join('') + '</div>';
  }

  function _rpc(name, body) {
    return fetch(SB_URL + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: Object.assign(_headers(), { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body || {}),
    }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; });
  }

  function fetch_(force) {
    _state.loading = true; render();
    return _rpc('list_services', { p_server: _world() }).then(function (d) {
      _state.listings = Array.isArray(d) ? d : [];
      _state.loading = false; render();
    });
  }

  function fetchMine() {
    var me = _me(); if (!me) return Promise.resolve();
    return _rpc('list_my_services', { p_server: _world() }).then(function (d) {
      _state.mineListings = Array.isArray(d) ? d : []; render();
    });
  }

  function toggleMine(on) {
    var me = _me();
    if (on && !me) { if (typeof showToast === 'function') showToast('Faça login para ver seus services.', 'info'); return false; }
    _state.mine = !!on;
    if (_state.mine) fetchMine(); else render();
    return _state.mine;
  }

  function setSearch(q) { _state.search = q || ''; render(); }

  function _refreshActive() { if (_state.mine) fetchMine(); else fetch_(true); }

  function cancel(id) {
    if (!_jwt()) return;
    fetch(SB_URL + '/rest/v1/service_listings?id=eq.' + id, {
      method: 'PATCH',
      headers: Object.assign(_headers(), { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }),
      body: JSON.stringify({ status: 'cancelled', updated_at: new Date().toISOString() }),
    }).then(function () { if (typeof showToast === 'function') showToast('Service cancelado.', 'success'); _refreshActive(); });
  }

  function renew(id) {
    if (!_jwt()) return;
    fetch(SB_URL + '/rest/v1/rpc/renew_service_listing', {
      method: 'POST', headers: Object.assign(_headers(), { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ p_id: id }),
    }).then(function (r) { return r.json(); }).then(function (ok) {
      if (ok && typeof showToast === 'function') showToast('Service renovado por mais 7 dias!', 'success');
      _refreshActive();
    });
  }

  // ── Modal de criação ────────────────────────────────────────
  function openCreate() {
    var me = _me();
    if (!me) { if (typeof showToast === 'function') showToast('Faça login para oferecer um service.', 'info'); return; }
    var el = document.getElementById('svc-create-overlay') || (function () {
      var d = document.createElement('div'); d.id = 'svc-create-overlay'; d.className = 'rep-overlay';
      d.addEventListener('click', function (e) { if (e.target === d) d.classList.remove('open'); });
      document.body.appendChild(d); return d;
    })();
    el.classList.add('open');
    el.innerHTML =
      '<div class="rep-modal">'
      + '<button class="rep-close" aria-label="Fechar">✕</button>'
      + '<div class="rep-head"><span class="rep-title">🛠️ Oferecer service</span>'
      +   '<span class="rep-sub">Mundo ' + _world() + '</span></div>'
      + '<input class="rep-input" id="svc-f-title" maxlength="80" placeholder="Título (ex: Faço EV training, Boost de level...)">'
      + '<textarea class="rep-input rep-textarea" id="svc-f-desc" maxlength="500" placeholder="Descrição do serviço (opcional)"></textarea>'
      + '<input class="rep-input" id="svc-f-price" type="number" min="0" placeholder="Preço em kk (deixe vazio = a combinar)">'
      + '<div class="rep-actions">'
      +   '<button class="mk-btn mk-btn--ghost" id="svc-f-cancel">Cancelar</button>'
      +   '<button class="mk-btn mk-btn--primary" id="svc-f-save">Publicar</button>'
      + '</div>'
      + '</div>';
    el.querySelector('.rep-close').addEventListener('click', function () { el.classList.remove('open'); });
    el.querySelector('#svc-f-cancel').addEventListener('click', function () { el.classList.remove('open'); });
    el.querySelector('#svc-f-save').addEventListener('click', function () {
      var title = el.querySelector('#svc-f-title').value.trim();
      var desc  = el.querySelector('#svc-f-desc').value.trim();
      var pkk   = el.querySelector('#svc-f-price').value.trim();
      if (!title) { if (typeof showToast === 'function') showToast('Dê um título ao service.', 'error'); return; }
      var btn = el.querySelector('#svc-f-save'); btn.disabled = true; btn.textContent = 'Publicando…';
      var payload = {
        provider_id: me.id, title: title, description: desc || null,
        price_kk: pkk ? Math.round(Number(pkk) * 1000000) : null,
        server: _world(), status: 'active',
      };
      fetch(SB_URL + '/rest/v1/service_listings', {
        method: 'POST',
        headers: Object.assign(_headers(), { 'Content-Type': 'application/json', 'Prefer': 'return=representation' }),
        body: JSON.stringify(payload),
      }).then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function () {
        if (typeof showToast === 'function') showToast('Service publicado!', 'success');
        el.classList.remove('open');
        _refreshActive();
      }).catch(function () {
        btn.disabled = false; btn.textContent = 'Publicar';
        if (typeof showToast === 'function') showToast('Não foi possível publicar.', 'error');
      });
    });
  }

  function activate() {
    if (!_state.inited) { _state.inited = true; }
    fetch_(true);
  }

  global.addEventListener('pa:server-change', function () {
    var sub = document.getElementById('svc-subtitle');
    if (sub) sub.textContent = 'Serviços da comunidade — Mundo ' + _world();
    if (_state.inited) _refreshActive();
  });

  global.Services = {
    activate: activate, fetch: fetch_, toggleMine: toggleMine, isMine: function () { return _state.mine; },
    setSearch: setSearch, cancel: cancel, renew: renew, openCreate: openCreate, render: render,
  };

  console.log('[Services] services.js carregado');
})(window);
