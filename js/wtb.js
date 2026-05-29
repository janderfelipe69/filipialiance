// ============================================================
// wtb.js — Aba "Procura" (Want to Buy)
// Estado global, fetch de listings e realtime.
// ============================================================

;(function (global) {
  'use strict';
  if (global.WTB) return;

  var SB_URL = global.SUPABASE_URL || '';
  var SB_KEY = global.SUPABASE_KEY || '';

  function _jwt() { return typeof Session !== 'undefined' && Session.getAccessToken ? Session.getAccessToken() : null; }

  var _state = {
    listings: [],
    loading:  false,
    filters:  { type: 'all', ball: 'all', search: '' },
  };

  function _headers() {
    var token = _jwt() || SB_KEY;
    return { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + token };
  }

  function _render() {
    if (typeof WTBRender !== 'undefined') {
      WTBRender.render(_state.listings, _state.filters);
    }
  }

  async function fetchListings() {
    _state.loading = true;
    _render();
    try {
      var url = SB_URL + '/rest/v1/wtb_listings?status=eq.active&order=created_at.desc&select=*';
      var res = await fetch(url, { headers: _headers() });
      var data = await res.json().catch(function () { return []; });
      _state.listings = Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn('[WTB] fetchListings error:', e);
      _state.listings = [];
    } finally {
      _state.loading = false;
      _render();
    }
  }

  // ── Realtime ──────────────────────────────────────────────────
  function _subscribeRealtime() {
    var sb = global.supabase || (global.PA && global.PA.supabase);
    if (!sb || typeof sb.channel !== 'function') return;

    sb.channel('wtb-listings-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wtb_listings' },
        function (payload) {
          var ev  = payload.eventType;
          var row = payload.new || {};
          var old = payload.old || {};

          if (ev === 'INSERT' && row.status === 'active') {
            var exists = _state.listings.some(function (l) { return l.id === row.id; });
            if (!exists) _state.listings = [row].concat(_state.listings);

          } else if (ev === 'UPDATE') {
            if (row.status !== 'active') {
              _state.listings = _state.listings.filter(function (l) { return l.id !== row.id; });
            } else {
              var found = false;
              _state.listings = _state.listings.map(function (l) {
                if (l.id === row.id) { found = true; return row; }
                return l;
              });
              if (!found) _state.listings = [row].concat(_state.listings);
            }

          } else if (ev === 'DELETE') {
            _state.listings = _state.listings.filter(function (l) { return l.id !== old.id; });
          }

          _render();
        })
      .subscribe();
  }

  // ── Filtros ───────────────────────────────────────────────────
  function setFilter(key, val) {
    _state.filters[key] = val;
    _render();
  }

  // ── Filtro de tipo (handler global para event-handlers.js) ───
  global._wtbTypeFilter = function (btn, type) {
    document.querySelectorAll('.mk-filter-chip[data-wtb-type]').forEach(function (b) {
      b.classList.toggle('active', b === btn);
    });
    setFilter('type', type);
  };

  // ── Filtro de bola (handler global para event-handlers.js) ────
  global._wtbBallFilter = function (btn, ball) {
    document.querySelectorAll('.mk-ball-chip[data-wtb-ball]').forEach(function (b) {
      b.classList.toggle('active', b === btn);
    });
    setFilter('ball', ball);
  };

  // ── Init ──────────────────────────────────────────────────────
  function init() {
    fetchListings();
    _subscribeRealtime();
  }

  // ── Inicializa quando a aba WTB é ativada pela primeira vez ───
  var _inited = false;
  document.addEventListener('tabActivated', function (e) {
    if (e.detail && e.detail.tab === 'wtb' && !_inited) {
      _inited = true;
      init();
    }
  });

  // Fallback: se nenhum evento de tab chegar em 3s, inicia mesmo assim
  setTimeout(function () {
    if (!_inited) { _inited = true; init(); }
  }, 3000);

  global.WTB = {
    get state() { return _state; },
    init:      init,
    fetch:     fetchListings,
    setFilter: setFilter,
    render:    _render,
  };

  console.log('[WTB] wtb.js carregado');
}(window));
