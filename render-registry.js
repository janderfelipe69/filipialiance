// ============================================================
// js/runtime/render-registry.js — DOM Ownership Registry v1
// PokeAlliance Shop — FASE 5
//
// OBJETIVO:
//   Centralizar ownership dos containers DOM.
//   Detectar conflitos de múltiplos writers.
//   Proteger contra render storms.
//   NÃO substitui renderizadores existentes nesta fase.
//
// CARREGUE: após pa-compat.js, antes dos módulos de render.
// ============================================================

;(function (global) {
  'use strict';

  if (!global.PA) {
    console.warn('[RenderRegistry] PA namespace não encontrado. pa-compat.js deve ser carregado antes.');
    return;
  }

  if (global.PA.renderRegistry) return; // singleton

  var _log  = function() { if (global.PA_DEBUG) console.log.apply(console, ['[RenderRegistry]'].concat([].slice.call(arguments))); };
  var _warn = function() { console.warn.apply(console, ['[PA RenderRegistry ⚠️]'].concat([].slice.call(arguments))); };
  var _ts   = function() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()).toFixed(1) + 'ms'; };

  // ── Registro central ─────────────────────────────────────────────────
  // { containerId → { owner, render, destroy, renderCount, lastRenderTs, avgMs, conflicts[] } }
  var _registry = {};

  // ── Storm protection ─────────────────────────────────────────────────
  var _STORM_THRESHOLD_MS = 16;   // 2 renders em < 16ms = storm
  var _stormWarnings = 0;

  // ── API ──────────────────────────────────────────────────────────────

  /**
   * Registra um owner para um container DOM.
   * Se o container já tiver owner, emite warning e NÃO sobrescreve.
   *
   * @param {Object} opts
   *   .id        {string}   ID único do registro (slug do módulo)
   *   .container {string}   ID do elemento DOM (#captura-grid → 'captura-grid')
   *   .owner     {string}   Nome do módulo dono
   *   .render    {function} Função de render (referência, não chamada aqui)
   *   .destroy   {function} Função de cleanup (opcional)
   */
  function register(opts) {
    if (!opts || !opts.container || !opts.owner) {
      _warn('register: opts inválido —', opts);
      return false;
    }
    var cid = opts.container;

    if (_registry[cid]) {
      // Conflito de ownership
      var conflict = { challenger: opts.owner, ts: _ts() };
      _registry[cid].conflicts.push(conflict);

      _warn('OWNERSHIP CONFLICT: container "' + cid + '" já pertence a "' + _registry[cid].owner +
            '". "' + opts.owner + '" tentou registrar. NÃO sobrescrito.');

      if (typeof global.PA.telemetry === 'object') {
        global.PA.telemetry.push('render-conflict', {
          container:   cid,
          owner:       _registry[cid].owner,
          challenger:  opts.owner,
          ts:          _ts(),
        });
      }
      return false;
    }

    _registry[cid] = {
      id:           opts.id || opts.owner,
      owner:        opts.owner,
      render:       opts.render   || null,
      destroy:      opts.destroy  || null,
      renderCount:  0,
      lastRenderTs: null,
      totalMs:      0,
      stormCount:   0,
      conflicts:    [],
    };

    _log('Registered:', cid, '→ owner:', opts.owner);
    if (typeof global.PA.telemetry === 'object') {
      global.PA.telemetry.push('render-register', { container: cid, owner: opts.owner });
    }
    return true;
  }

  /**
   * Solicita render de um container registrado.
   * Inclui storm protection: se chamado < _STORM_THRESHOLD_MS após o anterior,
   * emite warning mas NÃO bloqueia (renderizações legítimas não são impedidas).
   */
  function requestRender(containerId, callerHint) {
    var r = _registry[containerId];
    if (!r) {
      _warn('requestRender: container "' + containerId + '" não registrado.');
      return false;
    }
    if (typeof r.render !== 'function') {
      _warn('requestRender: "' + containerId + '" não tem função de render registrada.');
      return false;
    }

    var now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // Storm detection
    if (r.lastRenderTs !== null && (now - r.lastRenderTs) < _STORM_THRESHOLD_MS) {
      r.stormCount++;
      _stormWarnings++;
      _warn('RENDER STORM: "' + containerId + '" renderizando ' + (r.stormCount) + 'x em rápida sucessão (' +
            (now - r.lastRenderTs).toFixed(1) + 'ms desde último). Caller: ' + (callerHint || 'desconhecido'));
      if (typeof global.PA.telemetry === 'object') {
        global.PA.telemetry.push('render-storm', {
          container: containerId,
          interval:  (now - r.lastRenderTs).toFixed(1) + 'ms',
          count:     r.stormCount,
        });
      }
    }

    var t0 = now;
    try {
      r.render();
    } catch (err) {
      _warn('requestRender: erro em render de "' + containerId + '":', err.message);
      return false;
    }
    var dur = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;

    r.renderCount++;
    r.lastRenderTs = now;
    r.totalMs += dur;

    if (typeof global.PA.telemetry === 'object') {
      global.PA.telemetry.push('render-request', {
        container: containerId,
        owner:     r.owner,
        durationMs: dur.toFixed(1),
        count:     r.renderCount,
        caller:    callerHint || null,
      });
    }
    return true;
  }

  /**
   * Retorna o owner de um container (ou null).
   */
  function getOwner(containerId) {
    return _registry[containerId] ? _registry[containerId].owner : null;
  }

  /**
   * Retorna snapshot completo do registry para diagnóstico.
   */
  function dump() {
    var result = {};
    Object.keys(_registry).forEach(function (cid) {
      var r = _registry[cid];
      result[cid] = {
        owner:       r.owner,
        renders:     r.renderCount,
        avgMs:       r.renderCount > 0 ? (r.totalMs / r.renderCount).toFixed(1) + 'ms' : '—',
        storms:      r.stormCount,
        conflicts:   r.conflicts.length,
        lastRender:  r.lastRenderTs ? r.lastRenderTs.toFixed(0) + 'ms' : 'nunca',
      };
    });
    return result;
  }

  /**
   * Retorna só os conflitos detectados.
   */
  function dumpConflicts() {
    var result = {};
    Object.keys(_registry).forEach(function (cid) {
      if (_registry[cid].conflicts.length > 0) {
        result[cid] = {
          owner:     _registry[cid].owner,
          conflicts: _registry[cid].conflicts,
        };
      }
    });
    return result;
  }

  // ── Atualiza render stats de fora (para renders que não passam por requestRender) ──
  function trackExternalRender(containerId, durationMs) {
    var r = _registry[containerId];
    if (!r) return;
    var now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    if (r.lastRenderTs !== null && (now - r.lastRenderTs) < _STORM_THRESHOLD_MS) {
      r.stormCount++;
      if (typeof global.PA.telemetry === 'object') {
        global.PA.telemetry.push('render-storm', { container: containerId, source: 'external' });
      }
    }
    r.renderCount++;
    r.lastRenderTs = now;
    r.totalMs += (durationMs || 0);
  }

  // ── Expõe API no namespace PA ─────────────────────────────────────────
  global.PA.renderRegistry = {
    register:           register,
    requestRender:      requestRender,
    getOwner:           getOwner,
    dump:               dump,
    dumpConflicts:      dumpConflicts,
    trackExternalRender: trackExternalRender,
    // Acesso direto ao registry raw (apenas leitura)
    _registry:          _registry,
  };

  // ── Registro dos containers oficiais (ownership declarado) ─────────────
  // Registrado no DOMContentLoaded para garantir que os módulos já executaram.
  document.addEventListener('DOMContentLoaded', function () {
    // Containers e seus owners declarados (baseado na análise da Fase 2)
    var declarations = [
      { container: 'captura-grid',    owner: 'captura-redesign.js' },
      { container: 'items-grid',      owner: 'items.render.js'     },
      { container: 'pkg-sidebar-list',owner: 'packages.render.js'  },
      { container: 'pkg-detail',      owner: 'packages.render.js'  },
      { container: 'wiki-grid',       owner: 'app.js/renderWiki'   },
      { container: 'tab-pedidos',     owner: 'orders-ui.js'        },
    ];

    declarations.forEach(function (d) {
      register({ container: d.container, owner: d.owner, id: d.owner });
    });

    // wn-content é criado dinamicamente por wiki-nav.js — registrar depois
    setTimeout(function () {
      var wn = document.getElementById('wn-content');
      if (wn) {
        register({ container: 'wn-content', owner: 'wiki-nav.js' });
      }
    }, 1000);

    _log('Ownership registry inicializado com', declarations.length, 'containers declarados.');
  });

  _log('render-registry.js v1 carregado.');

}(window));
