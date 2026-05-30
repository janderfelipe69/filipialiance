// ============================================================
// server-world.js — Mundo/Servidor ativo (Moon / Sun)
// Mercadão Aliance
//
// Fonte única de verdade para qual servidor o usuário está vendo.
// Persistido em localStorage. Qualquer player troca livremente.
//
// API global:
//   PA.world.get()      -> 'Moon' | 'Sun'
//   PA.world.set(w)     -> define e dispara 'pa:server-change'
//   PA.world.toggle()   -> alterna Moon<->Sun
//   PA.world.is(w)      -> boolean
//
// Evento:
//   window 'pa:server-change' { detail: { world, prev } }
//
// Atributo aplicado em <html> e <body>: data-server="moon"|"sun"
// (usado pelo CSS para trocar o acento azul->dourado)
//
// Carregue ANTES dos módulos de dados (marketplace.js, wtb.js).
// ============================================================

;(function (global) {
  'use strict';

  var KEY   = 'pa_world';
  var VALID = ['Moon', 'Sun'];

  function _read() {
    var v = null;
    try { v = localStorage.getItem(KEY); } catch (_) {}
    return VALID.indexOf(v) >= 0 ? v : 'Moon';
  }

  function _write(w) {
    try { localStorage.setItem(KEY, w); } catch (_) {}
  }

  function get() { return _read(); }
  function is(w) { return _read() === w; }

  function _apply(w) {
    var slug = w.toLowerCase();
    var el = document.documentElement;
    if (el) el.setAttribute('data-server', slug);
    if (document.body) document.body.setAttribute('data-server', slug);
    _syncUI(w);
  }

  function set(w) {
    if (VALID.indexOf(w) < 0) return;
    var prev = _read();
    _write(w);
    _apply(w);
    if (prev !== w) {
      try {
        global.dispatchEvent(new CustomEvent('pa:server-change', { detail: { world: w, prev: prev } }));
      } catch (_) {}
    }
  }

  function toggle() { set(_read() === 'Moon' ? 'Sun' : 'Moon'); }

  // ── UI do switcher no header ────────────────────────────────
  var ICON = {
    Moon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    Sun:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/></svg>'
  };

  function _renderSwitch(mount) {
    var cur = _read();
    mount.innerHTML =
      '<button class="world-opt" data-world="Moon" type="button" aria-label="Mundo Moon">' +
        ICON.Moon + '<span>Moon</span>' +
        '<b class="world-count" data-count-for="Moon" title="Postagens ativas"></b>' +
      '</button>' +
      '<button class="world-opt" data-world="Sun" type="button" aria-label="Mundo Sun">' +
        ICON.Sun + '<span>Sun</span>' +
        '<b class="world-count" data-count-for="Sun" title="Postagens ativas"></b>' +
      '</button>';
    mount.classList.add('world-switch');
    Array.prototype.forEach.call(mount.querySelectorAll('.world-opt'), function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-world') === cur);
      btn.addEventListener('click', function () {
        set(btn.getAttribute('data-world'));
      });
    });
  }

  function _syncUI(w) {
    var mount = document.getElementById('server-switch');
    if (!mount) return;
    if (!mount.querySelector('.world-opt')) { _renderSwitch(mount); return; }
    Array.prototype.forEach.call(mount.querySelectorAll('.world-opt'), function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-world') === w);
    });
  }

  // Atualiza os contadores de postagens nas opções do switcher
  // counts = { Moon: <n>, Sun: <n> }
  function setCounts(counts) {
    if (!counts) return;
    VALID.forEach(function (w) {
      var el = document.querySelector('.world-count[data-count-for="' + w + '"]');
      if (el && counts[w] != null) el.textContent = counts[w];
    });
  }

  var _api = { get: get, set: set, toggle: toggle, is: is, setCounts: setCounts, VALID: VALID };

  function _expose() {
    global.PA = global.PA || {};
    global.PA.world = _api;
  }

  function _init() {
    // Re-afirma a API após todos os scripts síncronos (pa-compat reseta PA).
    _expose();
    var mount = document.getElementById('server-switch');
    if (mount) _renderSwitch(mount);
    _apply(_read());
  }

  // Aplica o atributo o quanto antes (evita flash de tema errado)
  _apply(_read());

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  _expose();

})(typeof window !== 'undefined' ? window : this);
