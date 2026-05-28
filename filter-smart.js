/* ================================================================
   filter-smart.js — v2 (Fase 5: sem monkey patches)
   Esconde automaticamente as opções de filtro que não têm itens
   nas abas de ITENS e CAPTURA.

   MUDANÇA FASE 5:
   - Removidos os monkey patches de window.renderCaptura e window.render.
   - Agora reage via PA.hooks ('captura:rendered', 'items:rendered').
   - Se PA.hooks não estiver disponível, usa fallback de compat
     que mantém comportamento idêntico ao anterior.
   - Comportamento VISUAL 100% idêntico.

   Carregue APÓS app.js, dados.js, pa-compat.js e js/runtime/hooks.js.
================================================================ */
(function () {

  /* ── Utilitário: recalcula e esconde options vazias ──────────── */
  function updateSelectOptions(selectId, getValuesFn) {
    var sel = document.getElementById(selectId);
    if (!sel) return;

    var existing = getValuesFn();

    Array.from(sel.options).forEach(function (opt) {
      var v = opt.value;
      if (v === 'all') { opt.style.display = ''; return; }
      var hasData = existing.has(v);
      opt.style.display = hasData ? '' : 'none';
    });

    var chosen = sel.options[sel.selectedIndex];
    if (chosen && chosen.style.display === 'none') {
      sel.value = 'all';
    }
  }

  /* ── ITENS: calcula values que existem no array `items` ──────── */
  function getItensTags() {
    var set = new Set();
    if (typeof items === 'undefined') return set;

    items.forEach(function (item) {
      var tier = (item.tier || '').toLowerCase();
      var name = (item.name || '').toLowerCase();

      if (tier) set.add(tier);

      if (name.includes('shiny'))   set.add('shiny');
      if (name.includes('orb'))     set.add('orb');
      if (name.includes('essence')) set.add('essence');

      if (!tier &&
          !name.includes('shiny') &&
          !name.includes('orb') &&
          !name.includes('essence')) {
        set.add('normal');
      }
    });

    return set;
  }

  /* ── CAPTURA: calcula tags que existem no array `POKEMONS` ────── */
  function getCapturaTags() {
    var set = new Set();
    if (typeof POKEMONS === 'undefined') return set;

    var hasDive = false;
    var hasNone = false;

    POKEMONS.forEach(function (p) {
      if (p.tag)  set.add(p.tag.toLowerCase());
      if (p.dive) hasDive = true;
      if (!p.tag) hasNone = true;
    });

    if (hasDive) set.add('dive');
    if (hasNone) set.add('none');

    return set;
  }

  /* ── Atualiza selects (chamada pública — usada por hooks e fallback) ── */
  function syncCapturaFilter() {
    updateSelectOptions('captura-filter', getCapturaTags);
  }

  function syncItemsFilter() {
    updateSelectOptions('filter', getItensTags);
  }

  /* ── Init ────────────────────────────────────────────────────── */
  function init() {
    /* Aplica imediatamente na primeira carga */
    syncItemsFilter();
    syncCapturaFilter();

    /* ── FASE 5: usar PA.hooks se disponível (sem monkey patch) ── */
    if (window.PA && window.PA.hooks) {
      window.PA.hooks.on('captura:rendered', 'filter-smart/captura', syncCapturaFilter);
      window.PA.hooks.on('items:rendered',   'filter-smart/items',   syncItemsFilter);

      if (window.PA_DEBUG) {
        console.log('[filter-smart v2] Usando PA.hooks — sem monkey patches.');
      }
      return;
    }

    /* ── FALLBACK: se PA.hooks não estiver pronto, usa compat wrapper ──
       Mantém comportamento original para garantir funcionamento mesmo
       se hooks.js não foi carregado. Emite warning para diagnóstico. */
    console.warn('[filter-smart] PA.hooks não disponível — usando fallback com wrappers. ' +
                 'Carregar js/runtime/hooks.js antes de filter-smart.js para eliminar monkey patches.');

    var _origRenderCaptura = window.renderCaptura;
    window.renderCaptura = function () {
      if (_origRenderCaptura) _origRenderCaptura.apply(this, arguments);
      syncCapturaFilter();
    };

    /* window.render pode não existir — guard seguro */
    var _origRender = window.render;
    if (typeof _origRender === 'function') {
      window.render = function () {
        _origRender.apply(this, arguments);
        syncItemsFilter();
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Expõe funções de sync para uso externo (diagnóstico) */
  window._filterSmartSync = {
    captura: syncCapturaFilter,
    items:   syncItemsFilter,
  };

})();
