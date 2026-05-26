// ============================================================
// js/items/items-controller.js — Items Controller v1
// PokeAlliance Shop — FASE 5
//
// OBJETIVO:
//   Centralizar ownership de #items-grid em PA.items.render().
//   Emitir hook 'items:rendered' após cada render.
//   NÃO altera HTML dos cards, addToCart, cart nem preços.
//
// COMPATIBILIDADE:
//   window.renderItems permanece como compat wrapper.
//
// CARREGUE: após js/runtime/hooks.js e items.render.js.
// ============================================================

;(function (global) {
  'use strict';

  if (!global.PA) {
    console.warn('[ItemsController] PA não encontrado.');
    return;
  }
  if (global.PA.items) return; // singleton

  var _log  = function() { if (global.PA_DEBUG) console.log.apply(console, ['[PA.items]'].concat([].slice.call(arguments))); };
  var _warn = function() { console.warn.apply(console, ['[PA.items ⚠️]'].concat([].slice.call(arguments))); };

  var _coreRender = null;

  /**
   * Executa renderItems e emite hook 'items:rendered'.
   */
  function render() {
    if (typeof _coreRender !== 'function') {
      _warn('render() chamado mas renderizador core não está pronto.');
      return;
    }

    var t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    _coreRender();
    var dur = typeof performance !== 'undefined' ? performance.now() - t0 : 0;

    if (global.PA.renderRegistry) {
      global.PA.renderRegistry.trackExternalRender('items-grid', dur);
    }

    if (global.PA.hooks) {
      global.PA.hooks.emit('items:rendered', { durationMs: dur });
    }

    if (typeof global.PA.telemetry === 'object') {
      global.PA.telemetry.push('render', { fn: 'PA.items.render', durationMs: dur.toFixed(1) });
    }

    _log('render() in', dur.toFixed(1) + 'ms');
  }

  function refresh() { render(); }

  global.PA.items = { render: render, refresh: refresh };

  // ── Bootstrap ─────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {

      if (typeof global.renderItems === 'function') {
        _coreRender = global.renderItems;

        // Compat wrapper: renderItems → PA.items.render()
        global.renderItems = function renderItems() {
          global.PA.items.render();
        };

        // Atualiza ownership no render registry
        if (global.PA.renderRegistry) {
          if (global.PA.renderRegistry._registry['items-grid']) {
            global.PA.renderRegistry._registry['items-grid'].owner = 'items-controller.js';
            global.PA.renderRegistry._registry['items-grid'].render = render;
          } else {
            global.PA.renderRegistry.register({
              container: 'items-grid',
              owner:     'items-controller.js',
              render:    render,
            });
          }
        }

        if (global.PA.runtime) {
          global.PA.runtime.trackWrapper('renderItems', 'items-controller.js', 'compat-wrapper', _coreRender);
        }

        _log('Controller inicializado. window.renderItems → PA.items.render()');
      } else {
        _warn('window.renderItems não encontrado — controller não instalado.');
      }

    }, 150); // após items.render.js DOMContentLoaded
  });

  _log('items-controller.js v1 carregado.');

}(window));
