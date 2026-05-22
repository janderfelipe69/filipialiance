/**
 * items.render.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsabilidade única: construir e injetar HTML da aba de itens.
 *
 * Depende de:
 *   • app.js          — items[], cart{}, formatKK(), getShowdownSprite(),
 *                       getShowdownStaticSprite(), openWikiLookup(),
 *                       addPackToCart()
 *   • items.logic.js  — filterItems(), getItemTag(), getItemPriceColor(),
 *                       getItemPokeType(), build*Html helpers,
 *                       itemAddToCart(), itemRemoveFromCart(),
 *                       itemUpdateTotalPrice()
 *   • items.css / items.animations.css — classes visuais
 *
 * NÃO lê nem escreve em: render(), updateTotalPrice(), addToCart(),
 * removeFromCart() do app.js — esses permanecem para uso de outros módulos.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ═══════════════════════════════════════════════════════════════════════════
   BUILDER DE CARD INDIVIDUAL
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Constrói o HTML completo de um item-card.
 * @param {object}  item         — objeto do array items[]
 * @param {boolean} animateIn    — se true, adiciona classe card-anim
 * @returns {string} HTML
 */
function buildItemCardHtml(item, animateIn) {
  var i         = item._idx;
  var tag       = getItemTag(item);
  var pokeType  = getItemPokeType(item.bannerImage);
  var typeColor = getItemPriceColor(item);

  // Imagem: GIF vs estático
  var isGif   = item.image && /\.gif$/i.test(item.image);
  var imgSrc  = isGif
    ? (typeof getShowdownStaticSprite === 'function' ? getShowdownStaticSprite(item.name) : item.image)
    : item.image;
  var imgGif  = isGif
    ? (typeof getShowdownSprite === 'function' ? getShowdownSprite(item.name) : '')
    : '';

  var imgHtml = item.image
    ? (
        '<div class="item-img-wrap">' +
          '<img class="item-img' + (isGif ? ' item-img--gif' : '') + '"' +
               ' src="' + imgSrc + '"' +
               (isGif ? ' data-gif="' + imgGif + '"' : '') +
               ' alt="' + item.name + '"' +
               ' loading="lazy" decoding="async"' +
               ' onerror="this.parentElement.style.display=\'none\'" />' +
        '</div>'
      )
    : '';

  // Nome + botão wiki
  var safeName  = item.name.replace(/'/g, "\\'");
  var nameHtml  =
    '<div class="item-card-name">' +
      item.name +
      '<button class="item-wiki-btn" onclick="openWikiLookup(\'' + safeName + '\', event)" title="Ver drops na Wiki">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
          '<circle cx="11" cy="11" r="7"/>' +
          '<line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
        '</svg>' +
      '</button>' +
    '</div>';

  // Classes do card
  var cardCls = 'item-card';
  if (tag === 'shiny')  cardCls += ' is-shiny';
  if (animateIn)        cardCls += ' card-anim';

  var dataType = pokeType ? ' data-type="' + pokeType + '"' : '';

  return (
    '<div class="' + cardCls + '"' + dataType + '>' +
      buildItemBannerHtml(item) +
      imgHtml +
      nameHtml +
      buildItemTierHtml(item.tier) +
      buildItemEvoHtml(item.evo) +
      buildItemPriceHtml(item, typeColor) +
      buildItemPackFooterHtml(item, typeColor) +
      buildItemManualFooterHtml(item) +
    '</div>'
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PONTO DE ENTRADA — renderItems()
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Lê estado de itemsState, filtra, renderiza e injeta no DOM.
 * Substitui completamente o render() legado para a aba de itens.
 */
function renderItems() {
  var q       = document.getElementById('items-search').value.toLowerCase();
  var f       = document.getElementById('items-filter').value;
  var grid    = document.getElementById('items-grid');
  var counter = document.getElementById('items-count-label');

  if (!grid) return;

  // Persistir estado
  itemsState.searchQuery  = q;
  itemsState.activeFilter = f;

  var visible = filterItems(q, f);

  // Atualiza contador
  if (counter) counter.textContent = visible.length + ' itens';

  // Estado vazio
  if (!visible.length) {
    grid.innerHTML =
      '<div class="items-empty">' +
        '<span class="items-empty-icon">⬡</span>' +
        'Nenhum item encontrado.' +
      '</div>';
    itemsState.initialRender = false;
    return;
  }

  var animate = itemsState.initialRender;

  grid.innerHTML = visible.map(function(item) {
    return buildItemCardHtml(item, animate);
  }).join('');

  // Após primeira renderização, não animar novamente
  itemsState.initialRender = false;
}

/* ═══════════════════════════════════════════════════════════════════════════
   INICIALIZAÇÃO
   Aguarda o DOM estar pronto para registrar eventos e fazer render inicial.
   ═══════════════════════════════════════════════════════════════════════════ */

(function initItemsModule() {
  var searchEl = document.getElementById('items-search');
  var filterEl = document.getElementById('items-filter');

  if (searchEl) {
    var _itemsSearchTimer;
    searchEl.addEventListener('input', function() {
      clearTimeout(_itemsSearchTimer);
      _itemsSearchTimer = setTimeout(renderItems, 150);
    });
  }

  if (filterEl) {
    filterEl.addEventListener('change', renderItems);
  }

  // Render inicial
  renderItems();
})();
