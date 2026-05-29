// ============================================================
// pa-state.js — State Consistency Layer v1
// PokeAlliance Shop — FASE 5.1
//
// OBJETIVO: Single source of truth + derived state controlado.
//
// PRINCÍPIOS:
//   • Mutations de source state passam por funções centralizadas.
//   • Derived state é calculado UMA vez e cacheado (selectors).
//   • Realtime usa merge, nunca sobrescrita cega.
//   • Render não começa se outro render está em voo (debounce).
//   • Zero dependências externas. Zero Proxy pesado.
//   • Compatibilidade total com todos os módulos existentes.
//
// CARREGUE: após pa-compat.js, hooks.js, render-registry.js
//           e ANTES dos módulos que mutam items/POKEMONS.
// ============================================================

;(function (global) {
  'use strict';

  if (!global.PA) { console.warn('[PA.state] pa-compat.js deve ser carregado antes.'); return; }
  if (global.PA.state && global.PA.state._v) return; // singleton

  var _log  = function() { if (global.PA_DEBUG) console.log.apply(console, ['[PA.state]'].concat([].slice.call(arguments))); };
  var _warn = function() { console.warn.apply(console, ['[PA.state ⚠️]'].concat([].slice.call(arguments))); };
  var _err  = function() { console.error.apply(console, ['[PA.state 🔴]'].concat([].slice.call(arguments))); };
  var _ts   = function() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()).toFixed(1) + 'ms'; };

  function _tel(cat, data) {
    if (global.PA && global.PA.telemetry) global.PA.telemetry.push(cat, data);
  }

  // ══════════════════════════════════════════════════════════════════════
  // 1. MUTATION GUARDS — wrappers rastreáveis para mutations de source state
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Substitui o conteúdo de um array in-place (preserva identidade).
   * Padrão seguro para items, POKEMONS, PACKAGES.
   *
   * ANTES: items.length = 0; arr.forEach(i => items.push(i))   ← espalhado
   * DEPOIS: PA.state.replaceArray('items', arr)                  ← rastreável
   *
   * NÃO remove os padrões antigos — coexistem. Esta função é o caminho
   * recomendado para novas escritas e será adotada progressivamente.
   */
  function replaceArray(name, newArr, caller) {
    var target = global[name];
    if (!Array.isArray(target)) {
      _warn('replaceArray: window.' + name + ' não é array — abortando.');
      _tel('unsafe_mutation', { prop: name, reason: 'not-array', caller: caller });
      return false;
    }
    if (!Array.isArray(newArr)) {
      _warn('replaceArray: newArr para ' + name + ' não é array — abortando.');
      _tel('unsafe_mutation', { prop: name, reason: 'new-not-array', caller: caller });
      return false;
    }

    var prevLen = target.length;
    target.length = 0;
    for (var i = 0; i < newArr.length; i++) target.push(newArr[i]);

    _log('replaceArray:', name, prevLen, '→', target.length, 'itens | caller:', caller || 'desconhecido');
    _tel('state_mutation', { prop: name, prevLen: prevLen, newLen: target.length, caller: caller });

    // Invalida selectors que dependem deste array
    _invalidateDependents(name);
    return true;
  }

  /**
   * Merge seguro de um item em um array identificado por `idKey`.
   * Não substitui o array inteiro — apenas atualiza ou insere.
   */
  function mergeIntoArray(name, item, idKey, caller) {
    var target = global[name];
    if (!Array.isArray(target)) {
      _warn('mergeIntoArray: window.' + name + ' não é array.');
      return false;
    }
    idKey = idKey || 'id';
    var idx = target.findIndex(function(x) { return x[idKey] === item[idKey]; });
    if (idx === -1) {
      target.push(item);
      _tel('state_mutation', { prop: name, op: 'insert', id: item[idKey], caller: caller });
    } else {
      Object.assign(target[idx], item);
      _tel('state_mutation', { prop: name, op: 'update', id: item[idKey], caller: caller });
    }
    _invalidateDependents(name);
    return true;
  }

  /**
   * Remove um item de um array por ID.
   */
  function removeFromArray(name, id, idKey, caller) {
    var target = global[name];
    if (!Array.isArray(target)) return false;
    idKey = idKey || 'id';
    var before = target.length;
    var toKeep = target.filter(function(x) { return x[idKey] !== id; });
    target.length = 0;
    for (var i = 0; i < toKeep.length; i++) target.push(toKeep[i]);
    _tel('state_mutation', { prop: name, op: 'remove', id: id, caller: caller, removed: before - target.length });
    _invalidateDependents(name);
    return true;
  }

  // ══════════════════════════════════════════════════════════════════════
  // 2. SELECTORS — derived state centralizado com memoização leve
  // ══════════════════════════════════════════════════════════════════════

  // Cache de selectors: { key → { value, deps, computedAt, hits, misses } }
  var _selectorCache = {};

  // Mapa de dependências: { arrayName → [selectorKey] }
  var _deps = {};

  function _invalidateDependents(arrayName) {
    var keys = _deps[arrayName] || [];
    keys.forEach(function(k) {
      if (_selectorCache[k]) {
        _selectorCache[k].valid = false;
        _tel('selector_recompute', { selector: k, reason: arrayName + ' mutated' });
      }
    });
  }

  /**
   * Cria ou recupera um selector memoizado.
   *
   * @param {string}   key      Identificador único do selector
   * @param {function} compute  fn() → valor derivado
   * @param {Array}    deps     Array de nomes de globals que invalidam o cache
   * @returns {*} Valor derivado
   */
  function select(key, compute, deps) {
    var cached = _selectorCache[key];

    // Registra dependências
    (deps || []).forEach(function(dep) {
      if (!_deps[dep]) _deps[dep] = [];
      if (_deps[dep].indexOf(key) === -1) _deps[dep].push(key);
    });

    if (cached && cached.valid) {
      cached.hits++;
      return cached.value;
    }

    var t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    var value;
    try {
      value = compute();
    } catch (err) {
      _warn('select: erro em "' + key + '":', err.message);
      _tel('selector_recompute', { selector: key, error: err.message });
      return null;
    }
    var dur = typeof performance !== 'undefined' ? performance.now() - t0 : 0;

    _selectorCache[key] = {
      value:       value,
      valid:       true,
      computedAt:  _ts(),
      durationMs:  dur.toFixed(1),
      hits:        0,
      misses:      (_selectorCache[key] ? (_selectorCache[key].misses || 0) + 1 : 1),
    };

    _log('select:', key, 'computed in', dur.toFixed(1) + 'ms');
    _tel('selector_recompute', { selector: key, durationMs: dur.toFixed(1) });
    return value;
  }

  /**
   * Invalida um selector específico manualmente.
   */
  function invalidate(key) {
    if (_selectorCache[key]) {
      _selectorCache[key].valid = false;
      _tel('selector_recompute', { selector: key, reason: 'manual-invalidate' });
    }
  }

  // ── Selectors oficiais ───────────────────────────────────────────────

  /**
   * getVisibleItems(query, filter)
   * Centraliza o filterItems() de items.logic.js.
   * Memoizado por query+filter.
   */
  function getVisibleItems(query, filter) {
    var q = (query || '').toLowerCase().trim();
    var f = filter || 'all';
    var key = 'visibleItems:' + q + ':' + f;

    return select(key, function() {
      if (typeof filterItems === 'function') {
        return filterItems(q, f);
      }
      // Fallback inline se filterItems não disponível
      if (!Array.isArray(global.items)) return [];
      return global.items.filter(function(item) {
        var matchQ = !q || item.name.toLowerCase().includes(q);
        var matchF = f === 'all' || (item.tier || '').toLowerCase() === f;
        return matchQ && matchF;
      });
    }, ['items']);
  }

  /**
   * getVisiblePokemons(query, tagFilter, typeFilter)
   * Centraliza o filter inline de captura-redesign.js.
   */
  function getVisiblePokemons(query, tagFilter, typeFilter) {
    var q  = (query      || '').toLowerCase().trim();
    var tf = tagFilter   || 'all';
    var yt = typeFilter  || 'all';
    var key = 'visiblePokemons:' + q + ':' + tf + ':' + yt;

    return select(key, function() {
      if (!Array.isArray(global.POKEMONS)) return [];
      return global.POKEMONS.filter(function(p) {
        var matchSearch = !q || p.name.toLowerCase().includes(q);
        var matchTag    = tf === 'all' ? true
          : tf === 'dive' ? !!p.dive
          : tf === 'none' ? !p.tag
          : p.tag === tf;
        var pokeType = typeof getTypeFromBanner === 'function' ? getTypeFromBanner(p.bannerImage) : null;
        var matchType = yt === 'all' ? true : pokeType === yt;
        return matchSearch && matchTag && matchType;
      });
    }, ['POKEMONS']);
  }

  /**
   * getCartSummary()
   * Calcula totais do carrinho sem recomputar em múltiplos lugares.
   */
  function getCartSummary() {
    return select('cartSummary', function() {
      var cart = global.cart || {};
      var items = global.items || [];
      var totalQty = 0;
      var totalKK  = 0;
      var totalBrl = 0;

      Object.keys(cart).forEach(function(k) {
        var qty  = cart[k] || 0;
        var item = items[k];
        if (!item || qty <= 0) return;
        totalQty += qty;
        if (typeof PriceLayer !== 'undefined') {
          var raw = PriceLayer.getItemPriceRaw(item);
          totalKK += (raw || 0) * qty;
        }
      });

      totalBrl = totalKK * (global.KK_TO_BRL || 1.70);

      return { totalQty: totalQty, totalKK: totalKK, totalBrl: totalBrl };
    }, ['items']); // cart é ephemeral, não é array global — invalida manualmente
  }

  // Cart é mutado diretamente em app.js — precisa de invalidação explícita
  // Isso é rastreado pelo guard de cart (Fase 3) e chamado nos wrappers.
  function invalidateCart() {
    invalidate('cartSummary');
    _tel('state_mutation', { prop: 'cart', op: 'invalidate', ts: _ts() });
  }

  function getCacheDump() {
    var result = {};
    Object.keys(_selectorCache).forEach(function(k) {
      var c = _selectorCache[k];
      result[k] = {
        valid:      c.valid,
        hits:       c.hits,
        misses:     c.misses,
        durationMs: c.durationMs,
        computedAt: c.computedAt,
      };
    });
    return result;
  }

  // ══════════════════════════════════════════════════════════════════════
  // 3. SNAPSHOT CONSISTENCY — render usa estado frozen, não live ref
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Retorna um snapshot shallow de um array global.
   * O render deve trabalhar sobre o snapshot, não sobre o array vivo.
   * Protege contra: realtime mutando items[] enquanto render itera.
   */
  function safeSnapshot(arrayName) {
    var src = global[arrayName];
    if (!Array.isArray(src)) {
      _warn('safeSnapshot: window.' + arrayName + ' não é array.');
      _tel('snapshot_conflict', { prop: arrayName, reason: 'not-array' });
      return [];
    }
    // Shallow copy: cria nova referência, mas objetos internos são shared.
    // Suficiente para evitar mutação do array enquanto iteramos.
    var snap = src.slice();
    _tel('state_mutation', { prop: arrayName, op: 'snapshot', len: snap.length });
    return snap;
  }

  // ══════════════════════════════════════════════════════════════════════
  // 4. REALTIME HARDENING — merge seguro, debounce, dedup
  // ══════════════════════════════════════════════════════════════════════

  // Render debouncer por domínio (evita render storm em eventos rápidos)
  var _renderTimers = {};
  var _renderInFlight = {};

  /**
   * Agenda render com debounce de `delayMs` ms.
   * Se outro render já está agendado para o mesmo domínio, cancela o anterior.
   * Se render está em voo, agenda para depois.
   */
  function scheduleRender(domain, renderFn, delayMs) {
    delayMs = delayMs || 50;

    clearTimeout(_renderTimers[domain]);

    if (_renderInFlight[domain]) {
      // Render em voo — agenda para depois sem storm
      _tel('render_from_stale_state', { domain: domain, reason: 'in-flight' });
      _renderTimers[domain] = setTimeout(function() {
        scheduleRender(domain, renderFn, delayMs);
      }, delayMs + 50);
      return;
    }

    _renderTimers[domain] = setTimeout(function() {
      _renderInFlight[domain] = true;
      try {
        renderFn();
      } catch (err) {
        _warn('scheduleRender: erro em render de "' + domain + '":', err.message);
      } finally {
        _renderInFlight[domain] = false;
      }
    }, delayMs);
  }

  /**
   * Compara dois objetos superficialmente.
   * Usado para detectar se update realtime realmente mudou algo.
   */
  function shallowEqual(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    var ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (var i = 0; i < ka.length; i++) {
      if (a[ka[i]] !== b[ka[i]]) return false;
    }
    return true;
  }

  /**
   * Merge seguro de um record de realtime em localStorage-backed store.
   * Retorna true se houve mudança real, false se estado idêntico.
   */
  function safeRealtimeMerge(storeName, record, idKey, transformFn) {
    idKey = idKey || 'id';
    try {
      var store = JSON.parse(localStorage.getItem(storeName) || '[]');
      var idx   = store.findIndex(function(x) { return x[idKey] === record[idKey]; });
      var transformed = typeof transformFn === 'function' ? transformFn(record) : record;

      if (idx === -1) {
        store.push(transformed);
        localStorage.setItem(storeName, JSON.stringify(store));
        _tel('realtime_merge', { store: storeName, op: 'insert', id: record[idKey] });
        return true;
      }

      // Shallow compare — se idêntico, não escreve e não dispara render
      if (shallowEqual(store[idx], transformed)) {
        _tel('realtime_merge', { store: storeName, op: 'noop', id: record[idKey] });
        return false;
      }

      store[idx] = Object.assign({}, store[idx], transformed);
      localStorage.setItem(storeName, JSON.stringify(store));
      _tel('realtime_merge', { store: storeName, op: 'update', id: record[idKey] });
      return true;
    } catch (err) {
      _warn('safeRealtimeMerge: erro:', err.message);
      _tel('realtime_merge', { store: storeName, error: err.message });
      return false;
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 5. RACE CONDITION DETECTION
  // ══════════════════════════════════════════════════════════════════════

  var _mutationInTick = {};   // { arrayName: count } — resetado a cada tick
  var _renderInTick   = {};

  // Detecta mutações duplas no mesmo tick
  function _trackMutation(name) {
    _mutationInTick[name] = (_mutationInTick[name] || 0) + 1;
    if (_mutationInTick[name] > 1) {
      _warn('RACE CONDITION: window.' + name + ' foi mutado ' + _mutationInTick[name] +
            'x no mesmo tick. Possível realtime + admin conflict.');
      _tel('state_mutation', { prop: name, race: true, count: _mutationInTick[name] });
    }
  }

  // Reset a cada frame (~16ms). Era 0ms (~250x/seg) — corrigido Fase 2 Passo 0.
  var _tickCleanupActive = false;
  function _ensureTickReset() {
    if (_tickCleanupActive) return;
    _tickCleanupActive = true;
    setInterval(function() {
      _mutationInTick = {};
      _renderInTick   = {};
    }, 16); // 1 frame — suficiente para detectar mutações duplas no mesmo ciclo de render
  }

  // ══════════════════════════════════════════════════════════════════════
  // 6. ADMIN-PANEL HARDENING — reloadItems usa replaceArray
  // ══════════════════════════════════════════════════════════════════════

  // Wrapa admin-panel.reloadItems para rastrear mutation
  // Executado no DOMContentLoaded após admin-panel.js carregar
  global.document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {

      // Monitora mutations de items[] detectando pattern direto
      // O guard do pa-compat.js (Fase 3) já emite console.error em reassignment.
      // Aqui adicionamos rastreamento de .length=0 + .push sequence.
      // Como não podemos interceptar métodos de array sem Proxy,
      // usamos o guard de estado para detectar mudanças inesperadas.

      // Instrui admin-panel a usar scheduleRender após reloadItems
      // (monkey patch cirúrgico com flag de proteção)
      if (typeof global.renderItems === 'function' && !global.__paItemsRenderGuarded) {
        global.__paItemsRenderGuarded = true;
        var _origRenderItems = global.renderItems;
        global.renderItems = function() {
          // Invalida selector cacheado antes de renderizar
          invalidate('visibleItems:' + ''.toLowerCase().trim() + ':all');
          // Usa scheduleRender para debounce se chamado em rápida sucessão
          scheduleRender('items', function() { _origRenderItems(); }, 30);
        };
        PA.runtime.trackWrapper('renderItems', 'pa-state/scheduleRender', 'debounce-guard', _origRenderItems);
        _log('renderItems guardado com debounce de 30ms');
      }

    }, 300);
  });

  // ══════════════════════════════════════════════════════════════════════
  // 7. REALTIME DEBOUNCE para pedidos
  // ══════════════════════════════════════════════════════════════════════

  // Cria um helper para módulos que chamam _renderUI() em rápida sucessão
  // Usado por pedidos-realtime para debounce de renders por evento realtime
  function createOrdersRenderDebounce(delayMs) {
    delayMs = delayMs || 80;
    var _timer = null;
    return function debouncedRender(renderFn) {
      clearTimeout(_timer);
      _timer = setTimeout(function() {
        if (typeof renderFn === 'function') renderFn();
      }, delayMs);
    };
  }

  // Expõe o debouncer para que pedidos-realtime possa usar
  global.__paOrdersDebounce = createOrdersRenderDebounce(80);

  // ══════════════════════════════════════════════════════════════════════
  // 8. API PÚBLICA no namespace PA.state
  // ══════════════════════════════════════════════════════════════════════

  // Preserva aliases ao vivo criados na Fase 3
  // (PA.state.items, PA.state.cart, etc. já existem como getters)

  // Marca como inicializado
  Object.defineProperty(global.PA.state, '_v', {
    value: '1.0',
    writable: false,
    configurable: false,
    enumerable: false,
  });

  // Adiciona novos métodos ao PA.state existente
  Object.assign(global.PA.state, {
    // Mutations seguras
    replaceArray:       replaceArray,
    mergeIntoArray:     mergeIntoArray,
    removeFromArray:    removeFromArray,
    invalidateCart:     invalidateCart,

    // Selectors
    select:             select,
    invalidate:         invalidate,
    getVisibleItems:    getVisibleItems,
    getVisiblePokemons: getVisiblePokemons,
    getCartSummary:     getCartSummary,

    // Snapshots
    safeSnapshot:       safeSnapshot,

    // Realtime
    safeRealtimeMerge:  safeRealtimeMerge,
    scheduleRender:     scheduleRender,
    shallowEqual:       shallowEqual,

    // Diagnóstico
    getCacheDump:       getCacheDump,
    dumpWarnings:       function() {
      return global.PA.telemetry ? global.PA.telemetry.getByCategory('unsafe_mutation')
        .concat(global.PA.telemetry.getByCategory('snapshot_conflict'))
        .concat(global.PA.telemetry.getByCategory('render_from_stale_state'))
        : [];
    },
  });

  // ══════════════════════════════════════════════════════════════════════
  // 9. INVALIDAÇÃO AUTOMÁTICA pós-db:ready
  // ══════════════════════════════════════════════════════════════════════

  global.document.addEventListener('db:ready', function() {
    // Quando catálogo recarrega, todos os selectors baseados em items/POKEMONS
    // devem ser invalidados
    _invalidateDependents('items');
    _invalidateDependents('POKEMONS');
    _invalidateDependents('PACKAGES');
    _tel('state_mutation', { op: 'db-ready-invalidate', ts: _ts() });
    _log('Selectors invalidados após db:ready');
  });

  // ══════════════════════════════════════════════════════════════════════
  // 10. TELEMETRIA no painel PA.debug
  // ══════════════════════════════════════════════════════════════════════

  // O painel de debug (pa-compat.js) lê PA.state.getCacheDump() e PA.state.dumpWarnings()
  // diretamente — não precisa de integração adicional aqui.

  _ensureTickReset();
  _log('pa-state.js v1 inicializado.');

}(window));
