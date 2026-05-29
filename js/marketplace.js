// ============================================================
// marketplace.js — Filipi Marketplace M1
// PokeAlliance Shop
//
// RESPONSABILIDADES:
//   • Inicializar o namespace PA.marketplace
//   • Gerenciar estado dos listings via PA.state
//   • Fetch com abort, debounce e stale guard
//   • Registrar no render-registry
//   • Escutar realtime via CustomEvent (pedido por realtime-manager)
//   • Emitir eventos via PA.hooks
//
// DEPENDÊNCIAS (ordem no HTML):
//   pa-compat.js → pa-state.js → pa-render-pipeline.js → pa-hardening.js
//   → realtime-manager.js → marketplace.js → marketplace-render.js
//   → marketplace-create.js → helds-catalog.js → pokemon-selector.js
//
// ZERO SIDE EFFECTS em módulos já existentes.
// ============================================================

;(function (global) {
  'use strict';

  if (global.PA && global.PA.marketplace) return; // singleton

  // ── Logs padronizados ────────────────────────────────────────
  var _log  = function () { console.log.apply(console,  ['[PA.marketplace]'].concat(Array.prototype.slice.call(arguments))); };
  var _warn = function () { console.warn.apply(console, ['[PA.marketplace ⚠]'].concat(Array.prototype.slice.call(arguments))); };

  var SB_URL = global.SUPABASE_URL || '';
  var SB_KEY = global.SUPABASE_KEY || '';

  function _jwt() {
    return typeof Session !== 'undefined' && Session.getAccessToken
      ? Session.getAccessToken()
      : null;
  }

  function _headers() {
    var h = { 'apikey': SB_KEY };
    var jwt = _jwt();
    if (jwt) h['Authorization'] = 'Bearer ' + jwt;
    return h;
  }

  function _tel(cat, data) {
    if (global.PA && global.PA.telemetry) global.PA.telemetry.push(cat, data);
  }

  // ── Estado interno ────────────────────────────────────────────
  var _state = {
    initialized:  false,
    listings:     [],       // array canônico de listings
    filters:      { type: 'all', search: '' },
    loading:      false,
    lastFetch:    0,
    fetchAbort:   null,     // AbortController ativo
  };

  // Expõe no namespace global PA.marketplace
  if (!global.PA) global.PA = {};
  global.PA.marketplace = _state;

  // ── Register com render-registry ─────────────────────────────
  function _registerWithRegistry() {
    if (typeof global.PA.renderRegistry === 'undefined' &&
        typeof global.RenderRegistry   === 'undefined') return;
    var registry = global.PA.renderRegistry || global.RenderRegistry;
    if (typeof registry.register !== 'function') return;

    registry.register({
      container: 'marketplace-list',
      owner:     'PA.marketplace',
      render:    function () {
        if (typeof MarketplaceRender !== 'undefined') {
          MarketplaceRender.render(_state.listings, _state.filters);
        }
      },
    });
    _log('Registrado no render-registry');
  }

  // ── PA.hooks: adiciona eventos oficiais ──────────────────────
  function _registerHookEvents() {
    if (!global.PA || !global.PA.hooks) return;
    var hooks = global.PA.hooks;
    if (!hooks.EVENTS) return;

    var toAdd = [
      'marketplace:listing_created',
      'marketplace:listing_updated',
      'marketplace:listing_deleted',
    ];
    toAdd.forEach(function (evt) {
      if (hooks.EVENTS.indexOf(evt) === -1) hooks.EVENTS.push(evt);
    });
    _log('Eventos marketplace registrados no PA.hooks');
  }

  // ── Fetch listings ────────────────────────────────────────────
  var _fetchDebounceTimer = null;
  var _fetchSeq = 0;      // stale guard

  function fetchListings(force) {
    // Debounce: consolida chamadas rápidas em 1 request
    clearTimeout(_fetchDebounceTimer);
    _fetchDebounceTimer = setTimeout(function () {
      _doFetch(force);
    }, 80);
  }

  async function _doFetch(force) {
    if (!SB_URL || !SB_KEY) { _warn('Supabase não configurado'); return; }

    // Stale guard: não refaz fetch se < 5s sem forçar
    var now = Date.now();
    if (!force && (now - _state.lastFetch) < 5000) {
      _log('[PA.marketplace.fetch] skipped — dados recentes');
      return;
    }

    // Cancela fetch anterior
    if (_state.fetchAbort) {
      try { _state.fetchAbort.abort(); } catch (_) {}
    }
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    _state.fetchAbort = controller;
    var seq = ++_fetchSeq;

    _state.loading = true;
    _triggerRender('loading');

    try {
      var url = SB_URL + '/rest/v1/marketplace_listings'
        + '?status=eq.active'
        + '&order=updated_at.desc'
        + '&limit=100'
        + '&select=*,helds_x:held_x_id(id,name,sprite_url,category,rarity,description,bonus),helds_y:held_y_id(id,name,sprite_url,category,rarity,description,bonus)';

      var opts = { headers: _headers() };
      if (controller) opts.signal = controller.signal;

      _log('[PA.marketplace.fetch] GET listings');
      var res = await fetch(url, opts);

      // Stale guard: se chegou resposta de request obsoleto, descarta
      if (seq !== _fetchSeq) { _log('[PA.marketplace.fetch] stale response — descartada'); return; }

      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();

      _state.listings = Array.isArray(data) ? data : [];
      _state.lastFetch = Date.now();
      _state.loading = false;
      _log('[PA.marketplace.fetch] ' + _state.listings.length + ' listings carregados');
      // Refresh conversation badges for seller's own listings
      var me = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
      if (me && typeof MarketplaceTrade !== 'undefined') {
        _state.listings.forEach(function(l) {
          if (l.seller_id === me.id) {
            MarketplaceTrade.fetchListingSessions(l.id).then(function(sessions) {
              MarketplaceTrade.updateConvBadge(l.id, sessions.length, sessions);
            });
          }
        });
      }
      _tel('marketplace-fetch', { count: _state.listings.length });
      _triggerRender('fetch-complete');

    } catch (err) {
      if (err && err.name === 'AbortError') { _log('[PA.marketplace.fetch] abortado'); return; }
      _warn('[PA.marketplace.fetch] erro:', err.message);
      _state.loading = false;
      _triggerRender('fetch-error');
    }
  }

  // ── Trigger render via coalesceRender ────────────────────────
  function _triggerRender(reason) {
    if (typeof MarketplaceRender === 'undefined') return;
    if (global.PA && global.PA.pipeline && typeof global.PA.pipeline.coalesceRender === 'function') {
      global.PA.pipeline.coalesceRender('marketplace-list', function () {
        MarketplaceRender.render(_state.listings, _state.filters);
      }, 120);
    } else {
      // Fallback sem coalesceRender
      setTimeout(function () {
        MarketplaceRender.render(_state.listings, _state.filters);
      }, 0);
    }
    _log('[PA.marketplace.render] trigger via', reason);
  }

  // ── Realtime: escuta CustomEvent emitido pelo realtime-manager ──
  // NOTA: o realtime-manager despacha em window (global.dispatchEvent), então
  // escutamos em window — não em document (senão o evento nunca chega).
  function _initRealtime() {
    global.addEventListener('marketplace_listings:changed', function (e) {
      try {
        var detail  = e.detail || {};
        var tipo    = detail.event;   // 'INSERT' | 'UPDATE' | 'DELETE'
        var record  = detail.record  || {};

        _log('[PA.marketplace.realtime]', tipo, record.id);

        // S2: realtime packet versioning (M3.2)
        var _rv = global.PA && global.PA.realtimeVersions;
        var entityKey = 'listing:' + record.id;
        if (_rv && !_rv.shouldApply(entityKey, record.updated_at || record.created_at)) {
          return; // stale packet — ignore
        }

        if (tipo === 'INSERT') {
          var exists = _state.listings.some(function (l) { return l.id === record.id; });
          if (!exists) {
            _state.listings.unshift(record);
            _emitHook('marketplace:listing_created', record);
          }
        } else if (tipo === 'UPDATE') {
          var idx = _state.listings.findIndex(function (l) { return l.id === record.id; });
          // Soft-delete: status cancelled/deleted/sold → remover do estado como se fosse DELETE
          var _isInactive = record.status && record.status !== 'active';
          if (_isInactive) {
            _state.listings = _state.listings.filter(function (l) { return l.id !== record.id; });
            _emitHook('marketplace:listing_deleted', record);
          } else if (idx !== -1) {
            _state.listings[idx] = Object.assign({}, _state.listings[idx], record);
            _emitHook('marketplace:listing_updated', record);
          } else {
            _state.listings.unshift(record);
            _emitHook('marketplace:listing_updated', record);
          }
        } else if (tipo === 'DELETE') {
          _state.listings = _state.listings.filter(function (l) { return l.id !== record.id; });
          _emitHook('marketplace:listing_deleted', record);
        }

        // Passo 5C.2 — coordenação com marketplace-channels.js para evitar render
        // completo quando trade.js já manipulou o DOM via 'listings:*'.
        //
        // Para DELETE:
        //   trade.js (via channels) faz fade-out (260ms) + remove elemento.
        //   render completo de marketplace.js (80ms) reconstruiria o DOM antes
        //   do fade-out terminar, cancelando a animação visualmente.
        //   → Pular _triggerRender se channels.js já processou o DELETE.
        //
        // Para INSERT/UPDATE:
        //   trade.js não manipula DOM diretamente — render completo é necessário.
        //   → Sempre renderizar.
        //
        // Se MarketplaceChannels não estiver presente: renderizar normalmente (sem regressão).
        var _mcSkipRender = false;
        if (tipo === 'DELETE') {
          var _mcDedupKey = 'ml:DELETE:' + record.id;
          _mcSkipRender = typeof global.MarketplaceChannels !== 'undefined' &&
            typeof global.MarketplaceChannels.hasProcessed === 'function' &&
            global.MarketplaceChannels.hasProcessed(_mcDedupKey);
          if (_mcSkipRender) {
            _log('[PA.marketplace.realtime] DELETE', record.id,
              '— trade.js tratou o DOM via channels, pulando re-render completo');
          }
        }

        if (!_mcSkipRender) {
          _triggerRender('realtime-' + tipo);
        }
      } catch (err) {
        _warn('[PA.marketplace.realtime] erro ao processar evento:', err.message);
      }
    });

    _log('[PA.marketplace.realtime] listener registrado');
  }

  function _emitHook(eventName, payload) {
    if (global.PA && global.PA.hooks && typeof global.PA.hooks.emit === 'function') {
      try { global.PA.hooks.emit(eventName, payload); } catch (_) {}
    }
  }

  // ── Tab activation: inicializa ao entrar na aba ───────────────
  function _onTabActivated() {
    if (!_state.initialized) {
      _state.initialized = true;
      _registerWithRegistry();
      fetchListings(true);
      if (typeof HeldsCatalog !== 'undefined') {
        HeldsCatalog.load();
        // Render "+ Held" admin button if admin
        setTimeout(function() {
          if (typeof HeldsCatalog.renderAdminButton === 'function') HeldsCatalog.renderAdminButton();
        }, 100);
      }
      _log('Tab marketplace ativada — inicialização completa');
    } else {
      fetchListings(false);
      if (typeof HeldsCatalog !== 'undefined' && typeof HeldsCatalog.renderAdminButton === 'function') {
        HeldsCatalog.renderAdminButton();
      }
    }
  }

  // ── Filtros ───────────────────────────────────────────────────
  function setFilter(key, value) {
    if (_state.filters[key] === value) return;
    _state.filters[key] = value;
    _triggerRender('filter-change');
  }

  // ── API pública ───────────────────────────────────────────────
  Object.assign(global.PA.marketplace, {
    fetch:          fetchListings,
    setFilter:      setFilter,
    onTabActivated: _onTabActivated,
    getListings:    function () { return _state.listings; },
  });

  // ── Boot ─────────────────────────────────────────────────────
  global.document.addEventListener('DOMContentLoaded', function () {
    // Register timer/abort cleanup with PA.lifecycle
    if (global.PA && global.PA.lifecycle) {
      global.PA.lifecycle.registerCleanup('marketplace', function() {
        if (_state.fetchAbort) { try { _state.fetchAbort.abort(); } catch(_) {} }
        if (_fetchDebounceTimer) { clearTimeout(_fetchDebounceTimer); _fetchDebounceTimer = null; }
      });
    }
    try {
      _registerHookEvents();
      _initRealtime();
      _log('marketplace.js v1 pronto — aguardando ativação da tab');
    } catch (err) {
      _warn('Erro na inicialização:', err.message);
    }
  });

}(window));

// ── Helpers de filtro do marketplace ─────────────────────────────────────
function _mkFilter(btn, type) {
  document.querySelectorAll('.mk-filter-chip').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  if (window.PA && window.PA.marketplace) window.PA.marketplace.setFilter('type', type);
}
function _mkSearch(q) {
  if (window.PA && window.PA.marketplace) window.PA.marketplace.setFilter('search', q);
}
