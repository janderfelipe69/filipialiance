// ============================================================
// market-hub.js — Hub unificado do Marketplace
// Mercadão Aliance
//
// Une as três formas de postar numa só aba:
//   🏷️ Vendendo   (marketplace_listings)
//   🔍 Procurando (wtb_listings — conteúdo realocado da antiga aba Procura)
//   🛠️ Services   (service_listings)
//
// Realoca o DOM da antiga aba #tab-wtb para dentro do Marketplace (#hub-buy),
// mantendo todos os IDs/listeners intactos.
// ============================================================

;(function (global) {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var _kind = 'sell';
  var _wtbInited = false;
  var _svcInited = false;

  function _relocateWtb() {
    var src = $('tab-wtb');
    var dst = $('hub-buy');
    if (!src || !dst) return;
    var wrap = src.querySelector('.mk-wrap');
    if (wrap && wrap.parentNode !== dst) dst.appendChild(wrap);
  }

  function _show(kind) {
    _kind = kind;
    ['sell', 'buy', 'service'].forEach(function (k) {
      var el = $('hub-' + k);
      if (el) el.style.display = (k === kind) ? '' : 'none';
    });
    document.querySelectorAll('#hub-kind .hub-kind-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-kind') === kind);
    });

    if (kind === 'buy' && global.WTB) {
      if (!_wtbInited) { _wtbInited = true; global.WTB.init(); }
      else global.WTB.fetch();
    } else if (kind === 'service' && global.Services) {
      if (!_svcInited) { _svcInited = true; global.Services.activate(); }
      else global.Services.fetch(true);
    }
  }

  function _init() {
    _relocateWtb();

    document.querySelectorAll('#hub-kind .hub-kind-btn').forEach(function (b) {
      b.addEventListener('click', function () { _show(b.getAttribute('data-kind')); });
    });

    // Services: criar / meus / busca
    var sc = $('svc-btn-create');
    if (sc) sc.addEventListener('click', function () { global.Services && global.Services.openCreate(); });

    var sm = $('svc-chip-mine');
    var allc = document.querySelector('#svc-filters [data-svc-scope="all"]');
    if (sm) sm.addEventListener('click', function () {
      var on = !(global.Services && global.Services.isMine());
      var applied = global.Services && global.Services.toggleMine(on);
      sm.classList.toggle('active', !!applied);
      if (allc) allc.classList.toggle('active', !applied);
    });
    if (allc) allc.addEventListener('click', function () {
      if (global.Services && global.Services.isMine()) global.Services.toggleMine(false);
      allc.classList.add('active');
      if (sm) sm.classList.remove('active');
    });
    var ss = $('svc-search');
    if (ss) ss.addEventListener('input', function () { global.Services && global.Services.setSearch(this.value); });

    _show('sell');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _init);
  else _init();

  global.MarketHub = { show: _show };

})(window);
