/**
 * items.render.js  v2 — pipeline completo e autossuficiente
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsabilidade: construir, injetar e gerenciar TODA a UI da aba de itens.
 *
 * Inclui (migrado do app.js):
 *   • renderItems()               — render principal
 *   • buildItemCardHtml()         — builder de card
 *   • _itemsInjectShine()         — injetor do div .card-shine (CSS 3D)
 *   • _itemsGifHoverManager()     — swap PNG ↔ GIF no hover
 *   • _itemsVisibilityObserver()  — IntersectionObserver de performance
 *   • _itemsBurstOnAdd()          — animação de burst ao adicionar
 *
 * app.js NÃO controla mais nenhum desses comportamentos para .item-card.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ═══════════════════════════════════════════════════════════════════════════
   BUILDER DE CARD INDIVIDUAL
   ═══════════════════════════════════════════════════════════════════════════ */

function buildItemCardHtml(item, animateIn) {
  var i         = item._idx;
  var tag       = getItemTag(item);
  var pokeType  = getItemPokeType(item.bannerImage);
  var typeColor = getItemPriceColor(item);

  // Imagem: GIF vs estático
  var isGif  = item.image && /\.gif$/i.test(item.image);
  var imgSrc = isGif
    ? (typeof getShowdownStaticSprite === 'function' ? getShowdownStaticSprite(item.name) : item.image)
    : item.image;
  var imgGif = isGif
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

  var safeName = item.name.replace(/'/g, "\\'");
  var nameHtml =
    '<div class="item-card-name">' +
      item.name +
      '<button class="item-wiki-btn" onclick="openWikiLookup(\'' + safeName + '\', event)" title="Ver drops na Wiki">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
          '<circle cx="11" cy="11" r="7"/>' +
          '<line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
        '</svg>' +
      '</button>' +
    '</div>';

  var cardCls  = 'item-card';
  if (tag === 'shiny') cardCls += ' is-shiny';
  if (animateIn)       cardCls += ' card-anim';

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
   RENDER PRINCIPAL
   ═══════════════════════════════════════════════════════════════════════════ */

function renderItems() {
  var q       = document.getElementById('items-search').value.toLowerCase();
  var f       = document.getElementById('items-filter').value;
  var grid    = document.getElementById('items-grid');
  var counter = document.getElementById('items-count-label');

  if (!grid) return;

  itemsState.searchQuery  = q;
  itemsState.activeFilter = f;

  var visible = filterItems(q, f);

  if (counter) counter.textContent = visible.length + ' itens';

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

  itemsState.initialRender = false;

  // Pós-render: re-executar efeitos visuais nos novos cards
  requestAnimationFrame(function() {
    _itemsInjectShine();
    _itemsGifBind();
    _itemsObserveCards();
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHINE INJECTOR  (div .card-shine para efeito CSS de hover)
   ═══════════════════════════════════════════════════════════════════════════ */

function _itemsInjectShine() {
  document.querySelectorAll('.item-card:not([data-shine])').forEach(function(card) {
    card.setAttribute('data-shine', '1');
    var shine = document.createElement('div');
    shine.className = 'card-shine';
    card.appendChild(shine);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   GIF HOVER MANAGER  (PNG estático ↔ GIF animado no hover)
   ═══════════════════════════════════════════════════════════════════════════ */

function _itemsGifBind() {
  document.querySelectorAll('.item-card').forEach(function(card) {
    if (card._gifBound) return;
    card._gifBound = true;
    var img = card.querySelector('img[data-gif]');
    if (!img) return;
    card.addEventListener('mouseenter', function() {
      img.src = img.dataset.gif;
    });
    card.addEventListener('mouseleave', function() {
      if (typeof getShowdownStaticSprite === 'function') {
        img.src = getShowdownStaticSprite(img.alt);
      }
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   INTERSECTION OBSERVER  (pausa animações de cards fora da viewport)
   ═══════════════════════════════════════════════════════════════════════════ */

var _itemsIObs = null;

function _itemsSetupVisibilityObserver() {
  if (!window.IntersectionObserver) return;
  _itemsIObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      var img = entry.target.querySelector('img');
      if (img) img.style.willChange = 'auto';
      entry.target.style.willChange = entry.isIntersecting ? 'transform, box-shadow' : 'auto';
      entry.target.classList.toggle('in-view', entry.isIntersecting);
    });
  }, { rootMargin: '120px 0px' });
}

function _itemsObserveCards() {
  if (!_itemsIObs) return;
  document.querySelectorAll('.item-card').forEach(function(c) {
    _itemsIObs.observe(c);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   BURST ANIMATION  (anel de glow ao adicionar item ao carrinho)
   Sobrescreve itemAddToCart com wrapper que dispara a animação.
   ═══════════════════════════════════════════════════════════════════════════ */

function _itemsSetupBurst() {
  var _base = itemAddToCart;
  itemAddToCart = function(i) {
    _base(i);
    var card = document.querySelector('#item-addbtn-' + i);
    if (card) {
      var c = card.closest('.item-card');
      if (c) { c.classList.remove('burst'); void c.offsetWidth; c.classList.add('burst'); }
    }
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   INICIALIZAÇÃO
   ═══════════════════════════════════════════════════════════════════════════ */

(function initItemsModule() {
  // Eventos de busca e filtro
  var searchEl = document.getElementById('items-search');
  var filterEl = document.getElementById('items-filter');

  if (searchEl) {
    var _timer;
    searchEl.addEventListener('input', function() {
      clearTimeout(_timer);
      _timer = setTimeout(renderItems, 150);
    });
  }

  if (filterEl) {
    filterEl.addEventListener('change', renderItems);
  }

  // Configura observers e efeitos
  _itemsSetupVisibilityObserver();
  _itemsSetupBurst();

  // Render inicial
  renderItems();
})();
