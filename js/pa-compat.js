// ============================================================
// pa-compat.js — Camada de Compatibilidade e Telemetria v1
// PokeAlliance Shop — FASE 3
//
// PRINCÍPIO ABSOLUTO:
//   Este arquivo NÃO altera comportamento funcional.
//   NÃO remove globals existentes.
//   NÃO modifica fluxo de execução.
//   APENAS observa, registra e protege.
//
// DEVE SER CARREGADO:
//   APÓS supabase-client.js, db-bootstrap.js, dados.js,
//   price-layer.js, app.js — mas ANTES de session.js.
//   Inserir no index.html imediatamente após app.js.
//
// ATIVAÇÃO DO PAINEL DE DEBUG:
//   window.PA_DEBUG = true  (no console ou antes deste script)
//   Atalho: Ctrl+Shift+P   (toggle do painel)
//
// VERSÃO: 1.0.0
// ============================================================

;(function (global) {
  'use strict';

  // ── Guarda de singleton ────────────────────────────────────────────────
  if (global.PA && global.PA.__version) {
    console.warn('[PA] pa-compat.js já inicializado — ignorando re-carregamento.');
    return;
  }

  // ── Timestamp de boot ──────────────────────────────────────────────────
  var _t0 = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  // ══════════════════════════════════════════════════════════════════════
  // 1. NAMESPACE CENTRAL
  // ══════════════════════════════════════════════════════════════════════

  // Preserva sub-namespaces registrados ANTES do pa-compat (ex.: PA.world
  // do server-world.js, carregado bem no início). Sem isso, este reset
  // duro apagaria o switcher de servidor.
  var _priorPA = global.PA || {};

  global.PA = {
    __version: '1.0.0',
    __loadedAt: _t0,

    // Sub-namespaces (preenchidos abaixo)
    runtime:   {},
    compat:    {},
    state:     {},
    events:    {},
    debug:     {},
    telemetry: {},
    guards:    {},
  };

  // Reanexa chaves pré-existentes que não fazem parte da estrutura acima
  Object.keys(_priorPA).forEach(function (k) {
    if (!(k in global.PA)) global.PA[k] = _priorPA[k];
  });

  var PA = global.PA;

  // ── Logger interno ─────────────────────────────────────────────────────
  function _log()  { if (global.PA_DEBUG) console.log.apply(console,  ['[PA]'].concat([].slice.call(arguments))); }
  function _warn() {                      console.warn.apply(console, ['[PA ⚠️]'].concat([].slice.call(arguments))); }
  function _err()  {                      console.error.apply(console,['[PA 🔴]'].concat([].slice.call(arguments))); }
  function _ts()   { return ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - _t0).toFixed(1) + 'ms'; }


  // ══════════════════════════════════════════════════════════════════════
  // 2. BOOT PHASE TRACKER
  // Timestamps reais de cada fase crítica do boot.
  // ══════════════════════════════════════════════════════════════════════

  PA.runtime.boot = {
    domParsed:      { done: false, ts: null },
    domReady:       { done: false, ts: null },
    dbReady:        { done: false, ts: null },
    sessionReady:   { done: false, ts: null },
    realtimeReady:  { done: false, ts: null },
    wikiReady:      { done: false, ts: null },
    ordersReady:    { done: false, ts: null },
    appStable:      { done: false, ts: null },
  };

  // Registra fase com timestamp
  PA.runtime.markPhase = function(phase) {
    var b = PA.runtime.boot[phase];
    if (!b) { _warn('markPhase: fase desconhecida:', phase); return; }
    if (b.done) return; // idempotente
    b.done = true;
    b.ts = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    b.elapsed = (b.ts - _t0).toFixed(1) + 'ms';
    _log('Boot phase:', phase, '@', b.elapsed);
    PA.telemetry.push('boot', { phase: phase, elapsed: b.elapsed });
  };

  // domParsed: marcado após telemetria estar pronta (linha abaixo da seção 3)

  // domReady: DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function () {
    PA.runtime.markPhase('domReady');
  }, { once: true });

  // dbReady: intercepta o evento
  document.addEventListener('db:ready', function () {
    PA.runtime.markPhase('dbReady');
    // Verifica se items foi carregado
    if (!global.items || !global.items.length) {
      _warn('db:ready disparado mas window.items está vazio — possível falha de fetch.');
    }
    if (!global.APP_CONFIG) {
      _warn('db:ready disparado mas window.APP_CONFIG não existe — financial_config não carregado.');
    }
    if (!global.KK_TO_BRL) {
      _warn('db:ready disparado mas window.KK_TO_BRL não definido — preços podem estar errados.');
    }
  }, { once: true });


  // ══════════════════════════════════════════════════════════════════════
  // 3. TELEMETRIA CENTRAL
  // Buffer circular de eventos de runtime para diagnóstico.
  // ══════════════════════════════════════════════════════════════════════

  var _telBuffer = [];
  var _TEL_MAX = 500;

  PA.telemetry.push = function (category, data) {
    var entry = {
      t: _ts(),
      cat: category,
      data: data,
    };
    _telBuffer.push(entry);
    if (_telBuffer.length > _TEL_MAX) _telBuffer.shift();
    return entry;
  };

  PA.telemetry.getAll = function () { return _telBuffer.slice(); };

  PA.telemetry.getByCategory = function (cat) {
    return _telBuffer.filter(function (e) { return e.cat === cat; });
  };

  PA.telemetry.summary = function () {
    var counts = {};
    _telBuffer.forEach(function (e) {
      counts[e.cat] = (counts[e.cat] || 0) + 1;
    });
    return counts;
  };

  // Agora que telemetria está pronta, marca fase domParsed
  PA.runtime.markPhase('domParsed');


  // ══════════════════════════════════════════════════════════════════════
  // 4. RUNTIME REGISTRY
  // Mapa de TUDO que foi registrado em runtime.
  // ══════════════════════════════════════════════════════════════════════

  PA.runtime.registry = {
    functions:  {},   // nome → array de { owner, ts, original }
    wrappers:   [],   // histórico de wrappings
    listeners:  [],   // listeners registrados via PA.events
    intervals:  [],   // intervals rastreados
    timeouts:   [],   // timeouts rastreados
    renders:    [],   // renders rastreados
    mutations:  [],   // mutações de globals rastreadas
  };

  // Registra um wrapper no registry
  PA.runtime.trackWrapper = function (fnName, owner, type, originalRef) {
    var entry = {
      fn:       fnName,
      owner:    owner || 'unknown',
      type:     type  || 'wrap',
      ts:       _ts(),
      original: !!originalRef,
    };
    PA.runtime.registry.wrappers.push(entry);
    if (!PA.runtime.registry.functions[fnName]) {
      PA.runtime.registry.functions[fnName] = [];
    }
    PA.runtime.registry.functions[fnName].push(entry);
    _log('Wrapper registrado:', fnName, 'por', owner);
    PA.telemetry.push('wrapper', entry);
    return entry;
  };


  // ══════════════════════════════════════════════════════════════════════
  // 5. WRAPPER GUARDS — detecção de sobrescrita de funções críticas
  // ══════════════════════════════════════════════════════════════════════

  var _guardedFunctions = {};

  PA.guards.watch = function (fnName, owner) {
    if (_guardedFunctions[fnName]) return; // já observado

    // Snapshot da referência atual
    var _currentRef = global[fnName];
    _guardedFunctions[fnName] = {
      name:      fnName,
      watchers:  [owner],
      history:   [{ ref: _currentRef, ts: _ts(), owner: owner || 'initial' }],
    };

    // Define getter/setter observável no window
    // IMPORTANTE: usa Object.defineProperty apenas se a propriedade é configurável
    var desc = Object.getOwnPropertyDescriptor(global, fnName);
    if (desc && !desc.configurable) {
      _warn('guards.watch: ' + fnName + ' não é configurável — watch sem setter');
      return;
    }

    var _val = _currentRef;

    Object.defineProperty(global, fnName, {
      configurable: true,
      enumerable:   true,
      get: function () { return _val; },
      set: function (newVal) {
        var g = _guardedFunctions[fnName];
        var prevRef = _val;
        _val = newVal;

        // Registra no histórico
        var entry = { ref: newVal, ts: _ts(), prev: prevRef };
        g.history.push(entry);
        PA.runtime.trackWrapper(fnName, 'setter-detected', 'override', prevRef);

        // Aviso se mais de 2 sobrescritas
        if (g.history.length > 2) {
          _warn('guards: ' + fnName + ' foi sobrescrito ' + (g.history.length - 1) + 'x — histórico de wrappers disponível em PA.guards.history("' + fnName + '")');
        }

        PA.telemetry.push('guard-write', { fn: fnName, ts: _ts() });
      },
    });

    _log('Guard instalado em:', fnName);
  };

  PA.guards.history = function (fnName) {
    var g = _guardedFunctions[fnName];
    if (!g) { _warn('guards.history: ' + fnName + ' não está sendo observado'); return []; }
    return g.history.slice();
  };

  PA.guards.status = function () {
    var result = {};
    Object.keys(_guardedFunctions).forEach(function (fn) {
      var g = _guardedFunctions[fn];
      result[fn] = {
        writes:  g.history.length - 1,
        current: typeof global[fn],
        history: g.history.map(function (h) { return { ts: h.ts, owner: h.owner || 'unknown' }; }),
      };
    });
    return result;
  };

  // Protege as funções críticas identificadas na Fase 2
  // (após DOMContentLoaded para garantir que já foram definidas)
  document.addEventListener('DOMContentLoaded', function () {
    var _criticalFns = [
      'switchTab', 'sendToWhatsApp', 'renderCaptura',
      'renderItems', 'renderPackages', 'pedidosCarregar',
      'openCart', 'closeCart', 'openCapturaModal',
    ];
    _criticalFns.forEach(function (fn) {
      if (typeof global[fn] === 'function') {
        PA.guards.watch(fn, 'pa-compat/DCL');
      }
    });
    _log('Guards instalados em', _criticalFns.filter(function (fn) { return typeof global[fn] === 'function'; }).length, 'funções críticas');
  });


  // ══════════════════════════════════════════════════════════════════════
  // 6. STATE GUARDS — proteção de globals de estado crítico
  // Detecta troca de identidade de array e overwrites destrutivos.
  // ══════════════════════════════════════════════════════════════════════

  var _stateRefs = {};

  PA.guards.watchState = function (propName, owner) {
    var _currentVal = global[propName];
    _stateRefs[propName] = {
      name:       propName,
      identity:   _currentVal,  // referência original
      isArray:    Array.isArray(_currentVal),
      owner:      owner || 'initial',
      history:    [{ ts: _ts(), action: 'init', isArray: Array.isArray(_currentVal) }],
    };

    var desc = Object.getOwnPropertyDescriptor(global, propName);
    if (desc && !desc.configurable) {
      _warn('guards.watchState: ' + propName + ' não configurável — somente snapshot');
      return;
    }

    var _val = _currentVal;

    Object.defineProperty(global, propName, {
      configurable: true,
      enumerable:   true,
      get: function () { return _val; },
      set: function (newVal) {
        var s = _stateRefs[propName];
        var wasArray = Array.isArray(_val);
        var isArrayNow = Array.isArray(newVal);

        // Detecta troca de identidade de array (problema crítico para items)
        if (wasArray && isArrayNow && newVal !== s.identity) {
          _err('STATE GUARD: window.' + propName + ' foi substituído por NOVO array! ' +
               'Módulos com referência antiga perderão sincronização. ' +
               'Isso deve ser investigado imediatamente.');
        }

        // Detecta sobrescrita de objeto por não-objeto
        if (typeof _val === 'object' && _val !== null && typeof newVal !== 'object') {
          _warn('STATE GUARD: window.' + propName + ' trocado de ' + typeof _val + ' para ' + typeof newVal);
        }

        var entry = { ts: _ts(), newType: typeof newVal, isArray: isArrayNow };
        s.history.push(entry);
        PA.telemetry.push('state-write', { prop: propName, ts: _ts() });

        _val = newVal;
      },
    });
  };

  // Instala após DOMContentLoaded (quando as vars já existem)
  document.addEventListener('DOMContentLoaded', function () {
    ['items', 'POKEMONS', 'PACKAGES', 'APP_CONFIG'].forEach(function (p) {
      PA.guards.watchState(p, 'pa-compat/DCL');
    });
    _log('State guards instalados');
  });


  // ══════════════════════════════════════════════════════════════════════
  // 7. EVENT BUS COMPATÍVEL
  // Wrapper sobre document/window CustomEvent com telemetria.
  // NÃO substitui os eventos existentes — apenas monitora.
  // ══════════════════════════════════════════════════════════════════════

  var _eventLog    = [];
  var _listenerMap = {};  // eventName → count
  var _EVT_MAX     = 200;

  PA.events._log = function (name, target) {
    var entry = { name: name, target: target, ts: _ts() };
    _eventLog.push(entry);
    if (_eventLog.length > _EVT_MAX) _eventLog.shift();
    PA.telemetry.push('event', entry);
  };

  // Monitora eventos sem substituir os existentes
  PA.events.monitor = function (eventName, target) {
    var tgt = target || document;
    tgt.addEventListener(eventName, function (e) {
      PA.events._log(eventName, tgt === document ? 'document' : 'window');
      _listenerMap[eventName] = (_listenerMap[eventName] || 0) + 1;
    });
    _log('Monitorando evento:', eventName, 'em', tgt === document ? 'document' : 'window');
  };

  // API compatível (internamente usa CustomEvent)
  PA.events.emit = function (name, detail, target) {
    var tgt = target || document;
    tgt.dispatchEvent(new CustomEvent(name, { detail: detail, bubbles: false }));
    PA.events._log(name + ':emit', tgt === document ? 'document' : 'window');
  };

  PA.events.on = function (name, fn, target, opts) {
    var tgt = target || document;
    tgt.addEventListener(name, fn, opts || {});
    PA.runtime.registry.listeners.push({ event: name, ts: _ts(), target: tgt === document ? 'document' : 'window' });
    _log('Listener registrado:', name);
  };

  PA.events.off = function (name, fn, target) {
    var tgt = target || document;
    tgt.removeEventListener(name, fn);
  };

  PA.events.getLog    = function () { return _eventLog.slice(); };
  PA.events.getCounts = function () { return Object.assign({}, _listenerMap); };

  // Instala monitores nos eventos críticos
  document.addEventListener('DOMContentLoaded', function () {
    ['db:ready', 'wikiModuleOpen', 'wikiModuleClose', 'wikiModulesReady'].forEach(function (evt) {
      PA.events.monitor(evt, document);
    });
    ['pedidos:changed', 'delivery:changed', 'orders:refresh', 'orders:deleted',
     'realtime:status', 'affiliate:service_changed', 'affiliate:notification'].forEach(function (evt) {
      PA.events.monitor(evt, global);
    });
    _log('Monitores de eventos instalados');

    // Detecta orders:deleted sem listener
    global.addEventListener('orders:deleted', function () {
      _warn('EVENT ORFÃO: orders:deleted foi emitido mas não há listeners reais para ele. ' +
            'Verificar se algum módulo deveria escutar este evento.');
    });
  });


  // ══════════════════════════════════════════════════════════════════════
  // 8. RENDER TELEMETRY
  // Rastreia chamadas de render sem alterar comportamento.
  // ══════════════════════════════════════════════════════════════════════

  var _renderStats = {};  // fnName → { calls, lastTs, totalMs, dupes }

  PA.telemetry.trackRender = function (fnName, durationMs, callerHint) {
    if (!_renderStats[fnName]) {
      _renderStats[fnName] = { calls: 0, lastTs: null, totalMs: 0, dupes: 0, lastCaller: null };
    }
    var s = _renderStats[fnName];
    var now = _ts();

    // Detecta renders em cascata: mesmo fn chamado < 50ms após o anterior
    if (s.lastTs !== null && parseFloat(now) - parseFloat(s.lastTs) < 50) {
      s.dupes++;
      _warn('RENDER STORM: ' + fnName + ' chamado ' + (s.dupes + 1) + 'x em rápida sucessão (' + now + '). Possível loop visual.');
    }

    s.calls++;
    s.lastTs    = now;
    s.totalMs  += (durationMs || 0);
    s.lastCaller = callerHint || null;

    PA.telemetry.push('render', { fn: fnName, calls: s.calls, durationMs: durationMs || 0 });
  };

  PA.telemetry.getRenderStats = function () {
    return Object.assign({}, _renderStats);
  };

  // Wrapa funções de render para instrumentação — APENAS após DCL
  document.addEventListener('DOMContentLoaded', function () {
    var _renderFns = ['renderItems', 'renderCaptura', 'renderPackages', 'renderWiki'];

    _renderFns.forEach(function (fnName) {
      var orig = global[fnName];
      if (typeof orig !== 'function') return;

      global[fnName] = function () {
        var t1 = (typeof performance !== 'undefined') ? performance.now() : 0;
        orig.apply(this, arguments);
        var dur = (typeof performance !== 'undefined') ? (performance.now() - t1).toFixed(1) : 0;
        PA.telemetry.trackRender(fnName, parseFloat(dur));
      };

      // Registra como wrapper de telemetria (não como mudança de comportamento)
      PA.runtime.trackWrapper(fnName, 'pa-compat/render-telemetry', 'telemetry', orig);
    });

    _log('Render telemetry instalada para', _renderFns.length, 'funções');
  });


  // ══════════════════════════════════════════════════════════════════════
  // 9. POLL / INTERVAL MONITOR
  // Detecta loops perigosos sem cleanup.
  // ══════════════════════════════════════════════════════════════════════

  var _activeIntervals = [];
  var _activeTimeouts  = [];
  var _origSetInterval = global.setInterval;
  var _origSetTimeout  = global.setTimeout;
  var _origClearInterval = global.clearInterval;

  // Sobrescreve setInterval para rastrear loops
  global.setInterval = function (fn, delay) {
    var id = _origSetInterval.apply(global, arguments);
    var entry = {
      id:    id,
      delay: delay,
      ts:    _ts(),
      fn:    (fn && fn.name) ? fn.name : 'anonymous',
      calls: 0,
      stack: (new Error()).stack ? (new Error()).stack.split('\n')[2] : 'n/a',
    };

    // Wrapa fn para contar execuções
    var _rawArgs = [].slice.call(arguments);
    _rawArgs[0] = function () {
      entry.calls++;
      entry.lastCall = _ts();
      // Aviso se muitas execuções sem cleanup esperado
      if (entry.calls > 0 && entry.calls % 100 === 0) {
        _warn('INTERVAL ALTO: id=' + id + ' (' + entry.fn + ') executou ' + entry.calls + 'x — delay=' + delay + 'ms. Verificar se tem clearInterval.');
      }
      return fn.apply(this, arguments);
    };
    // Re-registra com fn wrappada (necessário para contagem)
    global.clearInterval(id);
    var newId = _origSetInterval.apply(global, _rawArgs);
    entry.id = newId;

    _activeIntervals.push(entry);
    PA.runtime.registry.intervals.push(entry);
    return newId;
  };

  // Sobrescreve clearInterval para remover do tracking
  global.clearInterval = function (id) {
    _origClearInterval.apply(global, arguments);
    var idx = _activeIntervals.findIndex(function (e) { return e.id === id; });
    if (idx !== -1) {
      _activeIntervals[idx].cleared = true;
      _activeIntervals[idx].clearedAt = _ts();
    }
  };

  PA.telemetry.getIntervals = function () {
    return _activeIntervals.filter(function (e) { return !e.cleared; });
  };

  PA.telemetry.getPolls = function () {
    // Retorna apenas intervals que parecem polls (delay <= 5000ms e ainda ativos)
    return PA.telemetry.getIntervals().filter(function (e) { return e.delay <= 5000; });
  };


  // ══════════════════════════════════════════════════════════════════════
  // 10. SAFE COMPAT LAYER
  // Utilitários para fases futuras usarem sem quebrar legado.
  // ══════════════════════════════════════════════════════════════════════

  PA.compat.safeCall = function (fn, context, args, fallback) {
    if (typeof fn !== 'function') {
      _warn('safeCall: função não existe ou não é function — ignorando');
      if (typeof fallback === 'function') fallback();
      return;
    }
    try {
      return fn.apply(context || null, args || []);
    } catch (err) {
      _err('safeCall: erro capturado em', fn.name || 'anonymous', ':', err.message);
      PA.telemetry.push('safe-call-error', { fn: fn.name, error: err.message });
      if (typeof fallback === 'function') fallback(err);
    }
  };

  PA.compat.safeRender = function (fnName, context, args) {
    var fn = global[fnName];
    if (typeof fn !== 'function') {
      _warn('safeRender: ' + fnName + ' não definido — render ignorado');
      return;
    }
    var t1 = (typeof performance !== 'undefined') ? performance.now() : 0;
    try {
      fn.apply(context || null, args || []);
      var dur = (typeof performance !== 'undefined') ? performance.now() - t1 : 0;
      PA.telemetry.trackRender(fnName, dur, 'safeRender');
    } catch (err) {
      _err('safeRender: erro em', fnName, ':', err.message);
      PA.telemetry.push('render-error', { fn: fnName, error: err.message });
    }
  };

  PA.compat.safeListener = function (target, event, fn, opts) {
    if (!target || typeof target.addEventListener !== 'function') {
      _warn('safeListener: target inválido para', event);
      return function () {};
    }
    try {
      target.addEventListener(event, fn, opts || {});
      PA.runtime.registry.listeners.push({ event: event, ts: _ts(), target: target === document ? 'document' : 'window' });
      return function () { target.removeEventListener(event, fn); };
    } catch (err) {
      _err('safeListener: erro ao registrar', event, ':', err.message);
      return function () {};
    }
  };

  PA.compat.safeWrap = function (fnName, owner, wrapFn) {
    var orig = global[fnName];
    if (typeof orig !== 'function') {
      _warn('safeWrap: ' + fnName + ' não existe — wrap ignorado');
      return false;
    }
    if (typeof wrapFn !== 'function') {
      _warn('safeWrap: wrapFn não é função para', fnName);
      return false;
    }
    var wrapped = wrapFn(orig);
    if (typeof wrapped !== 'function') {
      _warn('safeWrap: wrapFn deve retornar uma função para', fnName);
      return false;
    }
    global[fnName] = wrapped;
    PA.runtime.trackWrapper(fnName, owner, 'safeWrap', orig);
    return true;
  };

  PA.compat.safeMutation = function (label, fn) {
    var t1 = (typeof performance !== 'undefined') ? performance.now() : 0;
    try {
      fn();
      var dur = (typeof performance !== 'undefined') ? (performance.now() - t1).toFixed(1) : 0;
      PA.telemetry.push('mutation', { label: label, durationMs: parseFloat(dur) });
      PA.runtime.registry.mutations.push({ label: label, ts: _ts() });
      _log('Mutation:', label, 'em', dur + 'ms');
    } catch (err) {
      _err('safeMutation: erro em "' + label + '":', err.message);
      PA.telemetry.push('mutation-error', { label: label, error: err.message });
    }
  };


  // ══════════════════════════════════════════════════════════════════════
  // 11. ALIASES DE COMPATIBILIDADE (state snapshot)
  // Cria referências no namespace PA sem remover globals.
  // ══════════════════════════════════════════════════════════════════════

  document.addEventListener('DOMContentLoaded', function () {
    // State aliases — leituras ao vivo dos globals
    Object.defineProperty(PA.state, 'items', {
      get: function () { return global.items; },
      configurable: true,
    });
    Object.defineProperty(PA.state, 'cart', {
      get: function () { return global.cart; },
      configurable: true,
    });
    Object.defineProperty(PA.state, 'pkgState', {
      get: function () { return global.pkgState; },
      configurable: true,
    });
    Object.defineProperty(PA.state, 'itemsState', {
      get: function () { return global.itemsState; },
      configurable: true,
    });
    Object.defineProperty(PA.state, 'kkToBrl', {
      get: function () { return global.KK_TO_BRL; },
      configurable: true,
    });
    Object.defineProperty(PA.state, 'appConfig', {
      get: function () { return global.APP_CONFIG; },
      configurable: true,
    });
    Object.defineProperty(PA.state, 'sessionReady', {
      get: function () { return global.SESSION_READY; },
      configurable: true,
    });

    // Runtime aliases — funções ao vivo
    Object.defineProperty(PA.runtime, 'switchTab', {
      get: function () { return global.switchTab; },
      configurable: true,
    });
    Object.defineProperty(PA.runtime, 'sendToWhatsApp', {
      get: function () { return global.sendToWhatsApp; },
      configurable: true,
    });
    Object.defineProperty(PA.runtime, 'renderCaptura', {
      get: function () { return global.renderCaptura; },
      configurable: true,
    });

    _log('Aliases de compatibilidade criados em PA.state e PA.runtime');
  });


  // ══════════════════════════════════════════════════════════════════════
  // 12. SESSION TRACKER
  // Monitora mudanças de sessão sem interferir.
  // ══════════════════════════════════════════════════════════════════════

  document.addEventListener('DOMContentLoaded', function () {
    if (typeof Session === 'undefined') {
      _warn('Session não disponível em DOMContentLoaded — session tracker não instalado');
      return;
    }

    Session.onAuthChange(function (event, user) {
      PA.runtime.markPhase('sessionReady');
      PA.telemetry.push('session', {
        event: event,
        role:  user ? user.role  : null,
        nick:  user ? (user.nickname || user.email || '?') : null,
      });
      _log('Session event:', event, user ? (user.nickname || user.email) : '(sem user)');
    });
  });


  // ══════════════════════════════════════════════════════════════════════
  // 13. REALTIME TRACKER
  // ══════════════════════════════════════════════════════════════════════

  document.addEventListener('DOMContentLoaded', function () {
    global.addEventListener('realtime:status', function (e) {
      var status = e && e.detail && e.detail.status;
      if (status === 'connected') PA.runtime.markPhase('realtimeReady');
      PA.telemetry.push('realtime', { status: status });
    });
    global.addEventListener('wikiModulesReady', function () {
      PA.runtime.markPhase('wikiReady');
    });
  });


  // ══════════════════════════════════════════════════════════════════════
  // 14. VALIDAÇÃO DE BOOT — warnings de race conditions
  // ══════════════════════════════════════════════════════════════════════

  // Aguarda 5s após DCL e verifica fases incompletas
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      var b = PA.runtime.boot;

      if (!b.dbReady.done) {
        _err('BOOT TIMEOUT: db:ready não disparou em 5s após DCL. ' +
             'Verifique a conexão com Supabase e db-bootstrap.js.');
      }

      if (!b.sessionReady.done) {
        _warn('BOOT: Session.init() não completou em 5s após DCL. ' +
              'Usuário pode estar sem sessão ativa (normal) ou há erro de auth.');
      }

      if (global.items && global.items.length === 0 && b.dbReady.done) {
        _warn('BOOT: db:ready disparou mas window.items está vazio. ' +
              'catalog_items pode estar vazio no banco.');
      }

      // Verifica duplicata de SUPABASE_URL
      // app.js declara `const SUPABASE_URL` local — diferente de window.SUPABASE_URL
      // Não é detectável via window, mas registramos o aviso como diagnóstico
      _warn('ATENÇÃO ARQUITETURAL: app.js declara SUPABASE_URL/KEY localmente (linha 181). ' +
            'Isso duplica supabase-client.js. Corrigir na Fase 4: usar window.SUPABASE_URL.');

      PA.telemetry.push('boot-check', {
        dbReady:      b.dbReady.done,
        sessionReady: b.sessionReady.done,
        itemsCount:   global.items ? global.items.length : 0,
      });

    }, 5000);
  });


  // ══════════════════════════════════════════════════════════════════════
  // 15. DEBUG PANEL — ativado via window.PA_DEBUG = true ou Ctrl+Shift+P
  // ══════════════════════════════════════════════════════════════════════

  var _panel = null;
  var _panelVisible = false;

  PA.debug.show = function () {
    if (_panel) { _panel.style.display = 'block'; _panelVisible = true; return; }

    var el = document.createElement('div');
    el.id = 'pa-debug-panel';
    el.style.cssText = [
      'position:fixed', 'bottom:0', 'right:0', 'z-index:2147483647',
      'width:420px', 'max-height:60vh', 'overflow:auto',
      'background:#0a0e1a', 'color:#c2c0b6', 'font-family:monospace', 'font-size:11px',
      'border-top:1px solid rgba(58,140,255,.4)', 'border-left:1px solid rgba(58,140,255,.4)',
      'padding:10px', 'line-height:1.5',
    ].join(';');
    document.body.appendChild(el);
    _panel = el;
    _panelVisible = true;
    PA.debug.refresh();

    // Auto-refresh a cada 2s quando visível
    _origSetInterval(function () {
      if (_panelVisible && _panel) PA.debug.refresh();
    }, 2000);
  };

  PA.debug.hide = function () {
    if (_panel) { _panel.style.display = 'none'; _panelVisible = false; }
  };

  PA.debug.toggle = function () {
    if (_panelVisible) PA.debug.hide(); else PA.debug.show();
  };

  PA.debug.refresh = function () {
    if (!_panel || !_panelVisible) return;

    var b   = PA.runtime.boot;
    var now = _ts();

    function _phase(name) {
      var p = b[name];
      return (p.done ? '✅' : '⏳') + ' ' + name + (p.elapsed ? ' (' + p.elapsed + ')' : '');
    }

    function _row(label, value) {
      return '<div style="display:flex;gap:8px;border-bottom:1px solid rgba(255,255,255,.06);padding:2px 0">' +
        '<span style="color:rgba(58,140,255,.8);min-width:130px">' + label + '</span>' +
        '<span style="color:#e8e8e4">' + value + '</span>' +
        '</div>';
    }

    var guardsStatus = PA.guards.status();
    var renders = PA.telemetry.getRenderStats();
    var polls   = PA.telemetry.getPolls();
    var events  = PA.events.getCounts();
    var tel     = PA.telemetry.summary();

    var wrapperCounts = {};
    PA.runtime.registry.wrappers.forEach(function (w) {
      wrapperCounts[w.fn] = (wrapperCounts[w.fn] || 0) + 1;
    });

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
      '<b style="color:#3a8cff;font-size:12px">PA Debug v' + PA.__version + '</b>' +
      '<span style="color:rgba(255,255,255,.4)">' + now + ' total</span>' +
      '<button onclick="PA.debug.hide()" style="background:none;border:1px solid rgba(255,255,255,.2);color:#c2c0b6;cursor:pointer;padding:1px 6px;border-radius:3px">✕</button>' +
      '</div>';

    // Boot phases
    html += '<div style="color:rgba(255,255,255,.5);font-size:10px;margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">Boot Phases</div>';
    ['domParsed','domReady','dbReady','sessionReady','realtimeReady','wikiReady','ordersReady','appStable'].forEach(function (p) {
      html += _row(p, b[p].done ? ('✅ ' + b[p].elapsed) : '⏳ pendente');
    });

    // State
    html += '<div style="color:rgba(255,255,255,.5);font-size:10px;margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">Estado</div>';
    html += _row('window.items', (global.items ? global.items.length : 0) + ' itens');
    html += _row('window.POKEMONS', (global.POKEMONS ? global.POKEMONS.length : 0) + ' pokémons');
    html += _row('KK_TO_BRL', global.KK_TO_BRL || 'undefined ⚠️');
    html += _row('SESSION_READY', global.SESSION_READY ? '✅ true' : '⏳ false');
    html += _row('__dbReady', global.__dbReady ? '✅ true' : '⏳ false');
    html += _row('cart items', global.cart ? Object.keys(global.cart).length : 0);

    // Wrappers
    html += '<div style="color:rgba(255,255,255,.5);font-size:10px;margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">Wrappers</div>';
    Object.keys(wrapperCounts).forEach(function (fn) {
      var n = wrapperCounts[fn];
      html += _row(fn, n + 'x' + (n > 2 ? ' ⚠️ ALTO' : ''));
    });

    // Renders
    html += '<div style="color:rgba(255,255,255,.5);font-size:10px;margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">Renders</div>';
    Object.keys(renders).forEach(function (fn) {
      var s = renders[fn];
      html += _row(fn, s.calls + 'x' + (s.dupes > 0 ? ' (' + s.dupes + ' dupes ⚠️)' : ''));
    });

    // Events
    html += '<div style="color:rgba(255,255,255,.5);font-size:10px;margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">Eventos monitorados</div>';
    Object.keys(events).forEach(function (evt) {
      html += _row(evt, events[evt] + 'x');
    });

    // Active polls
    if (polls.length > 0) {
      html += '<div style="color:rgba(255,255,255,.5);font-size:10px;margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">Polls ativos (' + polls.length + ')</div>';
      polls.slice(0, 5).forEach(function (p) {
        html += _row(p.fn, 'cada ' + p.delay + 'ms, ' + p.calls + 'x chamado');
      });
    }

    // Telemetria summary
    html += '<div style="color:rgba(255,255,255,.5);font-size:10px;margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">Telemetria</div>';
    Object.keys(tel).forEach(function (cat) {
      html += _row(cat, tel[cat] + ' registros');
    });

    // DOM Ownership (Fase 5)
    if (global.PA.renderRegistry) {
      var dump = global.PA.renderRegistry.dump();
      var conflicts = global.PA.renderRegistry.dumpConflicts();
      html += '<div style="color:rgba(255,255,255,.5);font-size:10px;margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">DOM Ownership</div>';
      Object.keys(dump).forEach(function (cid) {
        var d = dump[cid];
        var hasConflict = conflicts[cid];
        var label = '#' + cid;
        var val = d.owner + ' | ' + d.renders + 'x' +
          (d.storms > 0 ? ' ⚠️ ' + d.storms + ' storms' : '') +
          (hasConflict ? ' 🔴 conflito!' : '');
        html += _row(label, val);
      });
      if (Object.keys(conflicts).length > 0) {
        html += '<div style="color:#e24b4a;font-size:10px;padding:2px 0">⚠️ ' +
                Object.keys(conflicts).length + ' conflito(s) de ownership detectado(s)</div>';
      }
    }

    // Hooks status (Fase 5)
    if (global.PA.hooks) {
      var hookStatus = global.PA.hooks.status();
      var hookTotal = Object.values(hookStatus).reduce(function(s, arr) { return s + arr.length; }, 0);
      html += '<div style="color:rgba(255,255,255,.5);font-size:10px;margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">Hooks (' + hookTotal + ')</div>';
      Object.keys(hookStatus).forEach(function (evt) {
        if (hookStatus[evt].length > 0) {
          html += _row(evt, hookStatus[evt].map(function(h) { return h.id + '(' + h.calls + 'x)'; }).join(', '));
        }
      });
    }

    // State Selectors (Fase 5.1)
    if (global.PA.state && typeof global.PA.state.getCacheDump === 'function') {
      var cacheDump = global.PA.state.getCacheDump();
      var cacheKeys = Object.keys(cacheDump);
      if (cacheKeys.length > 0) {
        html += '<div style="color:rgba(255,255,255,.5);font-size:10px;margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">Selectors (' + cacheKeys.length + ')</div>';
        cacheKeys.slice(0, 6).forEach(function (k) {
          var c = cacheDump[k];
          var label = k.length > 24 ? k.slice(0, 24) + '…' : k;
          html += _row(label, (c.valid ? '✅' : '⏳') + ' hits:' + c.hits + ' ' + c.durationMs + 'ms');
        });
      }
      var stateWarnings = global.PA.state.dumpWarnings ? global.PA.state.dumpWarnings() : [];
      if (stateWarnings.length > 0) {
        html += _row('state warnings', stateWarnings.length + ' (PA.state.dumpWarnings())');
      }
    }

    // Pipeline Locks (Fase 5.2)
    if (global.PA.pipeline) {
      var locks = global.PA.pipeline.getLockStatus();
      var lockKeys = Object.keys(locks);
      if (lockKeys.length > 0) {
        html += '<div style="color:rgba(255,255,255,.5);font-size:10px;margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">Pipeline Locks</div>';
        lockKeys.forEach(function(cid) {
          var l = locks[cid];
          html += _row('#' + cid,
            (l.locked ? '🔒 LOCKED' : '✅ free') +
            ' gen:' + l.generation +
            (l.hasQueued ? ' ⏳ queued' : ''));
        });
        var staleCount = PA.telemetry.getByCategory('stale_render_detected').length;
        var prevented  = PA.telemetry.getByCategory('duplicate_render_prevented').length;
        if (staleCount > 0) html += _row('stale renders', staleCount + ' detectados');
        if (prevented  > 0) html += _row('dupes prevented', prevented);
      }
    }

    // Temporal Engine (Fase 5.2.1)
    if (global.PA.telemetry) {
      var temporalUses    = PA.telemetry.getByCategory('temporal_engine_used').length;
      var legacyBlocked   = PA.telemetry.getByCategory('legacy_duration_blocked').length;
      var suspiciousDur   = PA.telemetry.getByCategory('suspicious_duration').length;
      if (temporalUses > 0 || legacyBlocked > 0 || suspiciousDur > 0) {
        html += '<div style="color:rgba(255,255,255,.5);font-size:10px;margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">Temporal Engine</div>';
        html += _row('engine uses', temporalUses + 'x computeServiceDuration');
        if (legacyBlocked > 0)  html += _row('legacy blocked', legacyBlocked + ' ⚠️ (sem started_at)');
        if (suspiciousDur > 0)  html += _row('suspicious', suspiciousDur + ' 🔴 duração divergente');
        // Mostra o último cálculo temporal se houver
        var lastTel = PA.telemetry.getByCategory('temporal_engine_used').slice(-1)[0];
        if (lastTel) html += _row('último uso', '@' + lastTel.t + ' ' + (lastTel.data.module || lastTel.data.controller || ''));
      }
    }

    // Render Health (Fase 5.2.2)
    if (global.PA.health) {
      var healthM = global.PA.health.dumpMetrics();
      var beats   = global.PA.health.getHeartbeats();
      html += '<div style="color:rgba(255,255,255,.5);font-size:10px;margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">Render Health</div>';
      if (healthM.ownershipViolations > 0) html += _row('ownership violations', healthM.ownershipViolations + ' 🔴');
      else                                 html += _row('ownership', '✅ sem violações');
      if (healthM.staleDomsDetected > 0)   html += _row('stale DOMs', healthM.staleDomsDetected + ' ⚠️');
      html += _row('heartbeats ativos', beats.length);
      beats.forEach(function(b) {
        html += _row('⏱ ' + b.id, b.runCount + 'x cada ' + b.intervalMs + 'ms');
      });
      Object.keys(healthM.renderGenerations).forEach(function(cid) {
        html += _row('#' + cid + ' gen', 'g' + healthM.renderGenerations[cid]);
      });
    }

    // Hardening section (Fase 5.2.3)
    if (global.PA.hardening && typeof global.PA.hardening.debugSection === 'function') {
      var hSec = global.PA.hardening.debugSection();
      Object.keys(hSec).forEach(function(sectionName) {
        html += '<div style="color:rgba(255,255,255,.5);font-size:10px;margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">' + sectionName + '</div>';
        var fields = hSec[sectionName];
        Object.keys(fields).forEach(function(k) {
          html += _row(k, fields[k] !== undefined ? String(fields[k]) : '—');
        });
      });
    }

    // PA.lifecycle stability (M3.2)
    if (global.PA && global.PA.lifecycle && typeof global.PA.lifecycle.debugSection === 'function') {
      var lcSec = global.PA.lifecycle.debugSection();
      Object.keys(lcSec).forEach(function(sectionName) {
        html += '<div style="color:rgba(255,255,255,.5);font-size:10px;margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">' + sectionName + '</div>';
        var fields = lcSec[sectionName];
        Object.keys(fields).forEach(function(k) {
          html += _row(k, fields[k] !== undefined ? String(fields[k]) : '—');
        });
      });
    }

    // Marketplace Stability M3.1
    if (global.MarketplaceTrade) {
      var mt = global.MarketplaceTrade;
      var stats = mt.getStats ? mt.getStats() : {};
      html += '<div style="color:rgba(255,255,255,.5);font-size:10px;margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">Marketplace Stability</div>';
      html += _row('online', stats.isOnline ? '✅' : '❌ OFFLINE');
      html += _row('sessões ativas', stats.activeSessions || 0);
      html += _row('locks pendentes', stats.pendingLocks || 0);
      html += _row('timer ativo', stats.timerActive ? '⏱ sim' : 'não');
      html += _row('reconnects', stats.reconnectCount || 0);
      html += _row('stale packets', stats.stalePackets || 0);
      if (global.PA.telemetry) {
        html += _row('orphan unlocks', global.PA.telemetry.getByCategory('marketplace-orphan-unlock').length);
        html += _row('trade started', global.PA.telemetry.getByCategory('marketplace-trade-started').length);
        html += _row('morph trade', global.PA.telemetry.getByCategory('marketplace-trade-morph').length);
      }
    }
    if (global.MarketplaceChat) {
      var mc = global.MarketplaceChat;
      var chatStats = mc.getStats ? mc.getStats() : {};
      html += '<div style="color:rgba(255,255,255,.5);font-size:10px;margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">Chat Stability</div>';
      html += _row('sessão ativa', chatStats.activeSessionId ? '✅ ' + String(chatStats.activeSessionId).slice(0,8) + '...' : 'nenhuma');
      html += _row('msgs vistas', chatStats.seenMsgCount || 0);
      html += _row('dedup hits', chatStats.dedupHits || 0);
      html += _row('reconexões chat', chatStats.reconnectCount || 0);
      html += _row('submitting', chatStats.submitting ? '⏳ sim' : 'não');
    }

    // Marketplace M2
    if (global.PA && global.PA.marketplace) {
      var mk = global.PA.marketplace;
      var mkListings = (mk.listings||[]).length;
      html += '<div style="color:rgba(255,255,255,.5);font-size:10px;margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">Marketplace</div>';
      html += _row('listings carregados', mkListings);
      html += _row('loading', mk.loading ? '⏳ sim' : 'não');
      html += _row('filtro tipo', mk.filters && mk.filters.type || 'all');
      if (global.PA.telemetry) {
        html += _row('renders', global.PA.telemetry.getByCategory('marketplace-render').length + 'x');
        html += _row('realtime events', global.PA.telemetry.getByCategory('marketplace-realtime').length + 'x');
        html += _row('listings criados', global.PA.telemetry.getByCategory('marketplace-listing-created').length + 'x');
      }
    }

    // Capture Items UX (Fase 5.3.2)
    if (global.PA.telemetry) {
      var ciRenders    = PA.telemetry.getByCategory('capture_item_render').length;
      var ciMorphs     = PA.telemetry.getByCategory('capture_item_morph').length;
      var ciUploads    = PA.telemetry.getByCategory('capture_item_upload').length;
      var ciPartial    = PA.telemetry.getByCategory('partial_delivery_completed').length;
      var ciProgress   = PA.telemetry.getByCategory('partial_delivery_progress').length;
      if (ciRenders + ciMorphs + ciUploads + ciPartial > 0) {
        html += '<div style="color:rgba(255,255,255,.5);font-size:10px;margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">Capture Items UX</div>';
        if (ciRenders > 0) html += _row('renders', ciRenders + 'x');
        if (ciMorphs  > 0) html += _row('morphs', ciMorphs  + 'x (re-renders evitados)');
        if (ciUploads > 0) html += _row('uploads', ciUploads + 'x');
        if (ciPartial > 0) {
          var ciAllDone = PA.telemetry.getByCategory('partial_delivery_progress').filter(function(e){ return e.data && e.data.allDone; }).length;
          html += _row('itens concluídos', ciPartial + 'x (' + ciAllDone + ' pedidos fechados)');
        }
      }
    }

    // Recent warnings (últimos 5 da telemetria de erros)
    var errs = PA.telemetry.getByCategory('safe-call-error')
      .concat(PA.telemetry.getByCategory('render-error'))
      .concat(PA.telemetry.getByCategory('mutation-error'))
      .concat(PA.telemetry.getByCategory('render-conflict'))
      .concat(PA.telemetry.getByCategory('snapshot_conflict'))
      .concat(PA.telemetry.getByCategory('stale_render_detected'))
      .slice(-5);
    if (errs.length > 0) {
      html += '<div style="color:#e24b4a;font-size:10px;margin:6px 0 3px;text-transform:uppercase;letter-spacing:1px">Erros recentes</div>';
      errs.forEach(function (e) {
        html += '<div style="color:#f09595;font-size:10px;padding:1px 0">@' + e.t + ' ' + (e.data.fn || e.data.label || e.data.container || e.data.prop || '') + ': ' + (e.data.error || e.data.challenger || e.data.reason || '') + '</div>';
      });
    }


    _panel.innerHTML = html;
  };

  // Keyboard shortcut Ctrl+Shift+P
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      PA.debug.toggle();
    }
  });

  // Auto-mostra se PA_DEBUG = true ao carregar
  document.addEventListener('DOMContentLoaded', function () {
    if (global.PA_DEBUG) PA.debug.show();
  });


  // ══════════════════════════════════════════════════════════════════════
  // 16. DIAGNÓSTICO INICIAL — warnings arquiteturais conhecidos
  // Executados após DCL para garantir que os módulos estão carregados.
  // ══════════════════════════════════════════════════════════════════════

  document.addEventListener('DOMContentLoaded', function () {

    // W01: enviarPedido duplicada no HTML — ambas redirecionam para sendToWhatsApp
    _warn('W01 [HTML] enviarPedido() definida 2x no index.html (linhas ~2270 e ~2310). ' +
          'A segunda versão sobrescreve a primeira. Correção: remover a primeira definição.');

    // W02: .send-order-btn CSS duplicado no HTML
    _warn('W02 [HTML] .send-order-btn CSS definido 2x no index.html. ' +
          'Correção de custo zero: remover um dos blocos <style>.');

    // W03: 4 CSS fora do <head>
    _warn('W03 [CSS] 4 stylesheets carregados dentro do <body> (orders-kanban, mobile, responsive-fix, captura-toolbar). ' +
          'Causam FOUC. Correção segura: mover para o <head>.');

    // W04: url-hash.js existe mas não é carregado
    _warn('W04 [LEGACY] url-hash.js existe no diretório mas não é referenciado no index.html. ' +
          'Foi substituído por nav-runtime.js. Documentar e eventualmente remover.');

    // W05: orders:deleted é evento órfão
    _warn('W05 [EVENT] orders:deleted é emitido por orders-admin.js em 2 lugares, ' +
          'mas nenhum módulo tem listener para este evento. ' +
          'Verificar se algum módulo deveria escutar (ex: OrdersUI, sla-realtime-ui).');

    // W06: KK_TO_BRL race condition
    _warn('W06 [RACE] window.KK_TO_BRL não existe até db-bootstrap completar. ' +
          'formatKK() e cálculos de preço chamados antes de db:ready retornarão NaN. ' +
          'Mitigação: sempre aguardar db:ready antes de calcular preços.');

    // W07: admin-panel registra db:ready sem { once }
    _warn('W07 [LISTENERS] admin-panel.js registra 4 listeners document.addEventListener("db:ready") sem { once }. ' +
          'Se db:ready disparar 2x (cenário de retry), switchTab será wrappado 2x. ' +
          'Correção: adicionar { once: true } nesses listeners.');

    // W08: tierlist-popup poll sem limite
    _warn('W08 [POLL] tierlist-popup.js usa setTimeout recursivo para encontrar renderTierList ' +
          'sem limite de tentativas. Se renderTierList nunca existir, o poll é infinito.');

    _log('Diagnóstico inicial completo — veja warnings no console.');
    PA.telemetry.push('diagnostics', { warnings: 8, ts: _ts() });
  });


  // ══════════════════════════════════════════════════════════════════════
  // INICIALIZAÇÃO FINAL
  // ══════════════════════════════════════════════════════════════════════

  _log('pa-compat.js v' + PA.__version + ' inicializado @', _ts());
  _log('Atalho de debug: Ctrl+Shift+P  |  window.PA_DEBUG=true');

}(window));
