/* ================================================================
   filter-smart.js
   Esconde automaticamente as opções de filtro que não têm itens
   nas abas de ITENS e CAPTURA.
   Carregue APÓS app.js e dados.js no index.html.
================================================================ */
(function () {

  /* ── Utilitário: recalcula e esconde options vazias ──────────── */

  /**
   * updateSelectOptions(selectId, getValuesFn)
   * - selectId     : id do <select>
   * - getValuesFn  : função que retorna um Set<string> com os valores
   *                  que existem nos dados
   * Garante que "all" sempre fique visível.
   * Se o valor selecionado sumiu dos dados, volta para "all".
   */
  function updateSelectOptions(selectId, getValuesFn) {
    const sel = document.getElementById(selectId);
    if (!sel) return;

    const existing = getValuesFn();

    Array.from(sel.options).forEach(function (opt) {
      const v = opt.value;
      if (v === 'all') { opt.style.display = ''; return; } // sempre visível
      const hasData = existing.has(v);
      opt.style.display = hasData ? '' : 'none';
    });

    /* Se o valor atual ficou oculto, volta para "all" */
    const chosen = sel.options[sel.selectedIndex];
    if (chosen && chosen.style.display === 'none') {
      sel.value = 'all';
    }
  }

  /* ── ITENS: calcula values que existem no array `items` ──────── */
  function getItensTags() {
    const set = new Set();
    if (typeof items === 'undefined') return set;

    items.forEach(function (item) {
      const tier = (item.tier || '').toLowerCase();
      const name = (item.name || '').toLowerCase();

      // tiers explícitos
      if (tier) set.add(tier);

      // tags especiais calculadas pelo app.js (getTag logic)
      if (name.includes('shiny'))   set.add('shiny');
      if (name.includes('orb'))     set.add('orb');
      if (name.includes('essence')) set.add('essence');

      // "normal" = sem tier e sem tag especial
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
    const set = new Set();
    if (typeof POKEMONS === 'undefined') return set;

    let hasDive = false;
    let hasNone = false;

    POKEMONS.forEach(function (p) {
      if (p.tag)  set.add(p.tag.toLowerCase());
      if (p.dive) hasDive = true;
      if (!p.tag) hasNone = true;
    });

    if (hasDive) set.add('dive');
    if (hasNone) set.add('none');

    return set;
  }

  /* ── Patch de render(): atualiza o select depois de renderizar ── */
  function patchRender() {
    var _origRender = window.render;
    window.render = function () {
      if (_origRender) _origRender.apply(this, arguments);
      updateSelectOptions('filter', getItensTags);
    };
  }

  function patchRenderCaptura() {
    var _origRenderCaptura = window.renderCaptura;
    window.renderCaptura = function () {
      if (_origRenderCaptura) _origRenderCaptura.apply(this, arguments);
      updateSelectOptions('captura-filter', getCapturaTags);
    };
  }

  /* ── Init ────────────────────────────────────────────────────── */
  function init() {
    patchRender();
    patchRenderCaptura();

    /* Aplica imediatamente na primeira carga */
    updateSelectOptions('filter',         getItensTags);
    updateSelectOptions('captura-filter', getCapturaTags);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
