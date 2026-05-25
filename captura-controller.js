// ============================================================
// js/captura/captura-controller.js — Captura Controller v1
// PokeAlliance Shop — FASE 5
//
// OBJETIVO:
//   Ser o ÚNICO owner de #captura-grid.
//   Centralizar renderCaptura em PA.captura.render().
//   Emitir hook 'captura:rendered' para que filter-smart
//   possa reagir SEM monkey patch.
//
// COMPATIBILIDADE:
//   window.renderCaptura permanece existindo como compat wrapper.
//   Comportamento visual 100% idêntico.
//
// CARREGUE: após js/runtime/render-registry.js e js/runtime/hooks.js,
//           e APÓS captura-redesign.js (que define o renderizador real).
// ============================================================

;(function (global) {
  'use strict';

  if (!global.PA) {
    console.warn('[CapturaController] PA não encontrado.');
    return;
  }
  if (global.PA.captura) return; // singleton

  var _log  = function() { if (global.PA_DEBUG) console.log.apply(console, ['[PA.captura]'].concat([].slice.call(arguments))); };
  var _warn = function() { console.warn.apply(console, ['[PA.captura ⚠️]'].concat([].slice.call(arguments))); };
  var _ts   = function() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()).toFixed(1) + 'ms'; };

  // ── Referência ao renderizador real (captura-redesign.js) ─────────────
  // Capturada no DOMContentLoaded, quando captura-redesign já executou.
  var _coreRender = null;

  /**
   * Executa o render real de #captura-grid.
   * Internamente chama o renderizador de captura-redesign.js.
   * Após completar, emite PA.hooks 'captura:rendered'.
   */
  function render() {
    if (typeof _coreRender !== 'function') {
      _warn('render() chamado mas renderizador core não está pronto.');
      return;
    }

    var t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    _coreRender();
    var dur = typeof performance !== 'undefined' ? performance.now() - t0 : 0;

    // Registra no render registry (se disponível)
    if (global.PA.renderRegistry) {
      global.PA.renderRegistry.trackExternalRender('captura-grid', dur);
    }

    // Emite hook para que filter-smart e outros módulos reajam
    if (global.PA.hooks) {
      global.PA.hooks.emit('captura:rendered', { durationMs: dur });
    }

    if (typeof global.PA.telemetry === 'object') {
      global.PA.telemetry.push('render', { fn: 'PA.captura.render', durationMs: dur.toFixed(1) });
    }

    _log('render() completed in', dur.toFixed(1) + 'ms');
  }

  /**
   * Alias de render() para compatibilidade semântica.
   */
  function refresh() { render(); }

  /**
   * Aplica filtros e re-renderiza.
   * Compatível com o comportamento atual de renderCaptura.
   */
  function applyFilters() { render(); }

  // ── Expõe API no namespace PA ─────────────────────────────────────────
  global.PA.captura = {
    render:       render,
    refresh:      refresh,
    applyFilters: applyFilters,
  };

  // ── Bootstrap: captura referência e instala compat wrapper ────────────
  document.addEventListener('DOMContentLoaded', function () {

    // Captura o renderizador final (após captura-redesign + filter-smart wrapparam)
    // Usamos setTimeout para garantir que TODOS os DOMContentLoaded já rodaram
    // (filter-smart também roda no DOMContentLoaded)
    setTimeout(function () {

      // Neste ponto, window.renderCaptura é:
      //   filter-smart wrapper → captura-redesign → DOM
      //
      // Capturamos ESSA versão completa como _coreRender.
      // Assim PA.captura.render() reproduz exatamente o mesmo pipeline.
      if (typeof global.renderCaptura === 'function') {
        _coreRender = global.renderCaptura;

        // Substitui window.renderCaptura por compat wrapper que passa por PA.captura.render()
        // Isso garante que qualquer chamada futura a renderCaptura também emite o hook.
        global.renderCaptura = function renderCaptura() {
          PA.captura.render();
        };

        // Registra no render registry como owner
        if (global.PA.renderRegistry) {
          // Override do registro feito por render-registry.js (agora o owner é o controller)
          if (global.PA.renderRegistry._registry['captura-grid']) {
            global.PA.renderRegistry._registry['captura-grid'].owner = 'captura-controller.js';
            global.PA.renderRegistry._registry['captura-grid'].render = render;
          } else {
            global.PA.renderRegistry.register({
              container: 'captura-grid',
              owner:     'captura-controller.js',
              render:    render,
            });
          }
        }

        // Registra o wrapper no guard system
        if (global.PA.runtime) {
          global.PA.runtime.trackWrapper('renderCaptura', 'captura-controller.js', 'compat-wrapper', _coreRender);
        }

        _log('Controller inicializado. window.renderCaptura → PA.captura.render()');

      } else {
        _warn('window.renderCaptura não encontrado — controller não pôde ser instalado.');
      }

    }, 100); // aguarda outros DOMContentLoaded handlers (filter-smart, etc.)

  });

  _log('captura-controller.js v1 carregado.');

}(window));
