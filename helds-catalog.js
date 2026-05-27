// ============================================================
// helds-catalog.js — Filipi Marketplace M1
// PokeAlliance Shop
//
// Carrega o catálogo de helds do banco e o expõe para
// seletores do modal de criação.
// Zero side effects no sistema atual.
// ============================================================

;(function (global) {
  'use strict';

  if (global.HeldsCatalog) return; // singleton

  var _log  = function () { console.log.apply(console,  ['[PA.marketplace]', '[helds]'].concat(Array.prototype.slice.call(arguments))); };
  var _warn = function () { console.warn.apply(console, ['[PA.marketplace ⚠]', '[helds]'].concat(Array.prototype.slice.call(arguments))); };

  var SB_URL = global.SUPABASE_URL || '';
  var SB_KEY = global.SUPABASE_KEY || '';

  var _catalog = { X: [], Y: [], all: [] };
  var _loaded = false;
  var _loading = false;
  var _callbacks = [];

  function _jwt() {
    return typeof Session !== 'undefined' && Session.getAccessToken
      ? Session.getAccessToken() : null;
  }

  async function load() {
    if (_loaded)  { return _catalog; }
    if (_loading) { return new Promise(function(r){ _callbacks.push(r); }); }
    _loading = true;

    try {
      var jwt = _jwt();
      var headers = { 'apikey': SB_KEY };
      if (jwt) headers['Authorization'] = 'Bearer ' + jwt;

      var res = await fetch(
        SB_URL + '/rest/v1/helds_catalog?is_active=eq.true&order=sort_order.asc,name.asc&select=*',
        { headers: headers }
      );
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();

      _catalog.all = Array.isArray(data) ? data : [];
      _catalog.X   = _catalog.all.filter(function (h) { return h.category === 'X'; });
      _catalog.Y   = _catalog.all.filter(function (h) { return h.category === 'Y'; });
      _loaded  = true;
      _loading = false;
      _log('Carregados:', _catalog.all.length, 'helds (X:', _catalog.X.length, '/ Y:', _catalog.Y.length + ')');

      // Notifica quem estava aguardando
      _callbacks.forEach(function (cb) { try { cb(_catalog); } catch (_) {} });
      _callbacks = [];
      return _catalog;
    } catch (err) {
      _loading = false;
      _warn('Erro ao carregar helds_catalog:', err.message);
      _callbacks.forEach(function (cb) { try { cb(_catalog); } catch (_) {} });
      _callbacks = [];
      return _catalog;
    }
  }

  function getByCategory(cat) { return cat === 'X' ? _catalog.X : _catalog.Y; }
  function getAll()            { return _catalog.all; }
  function getById(id)         { return _catalog.all.find(function(h){ return h.id === id; }) || null; }
  function isLoaded()          { return _loaded; }

  global.HeldsCatalog = { load: load, getByCategory: getByCategory, getAll: getAll, getById: getById, isLoaded: isLoaded };
  _log('helds-catalog.js v1 pronto');

}(window));
