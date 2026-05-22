/**
 * items.render.js  v3 — redesign horizontal
 * ─────────────────────────────────────────────────────────────────────────────
 * Pipeline completo e autossuficiente da aba de itens.
 * Nenhuma dependência visual em app.js.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ═══════════════════════════════════════════════════════════════════════════
   CARD BUILDER  — novo layout horizontal
   ═══════════════════════════════════════════════════════════════════════════

   ┌────────────────────────────────────────────────────┐
   │ [IMG]  NOME ITEM  [wiki]        [TIER] [EVO] [BNR] │
   │        PREÇO GRANDE   brl                          │
   │        total —    brl total                        │
   ├────────────────────────────────────────────────────┤
   │ [+500] [+1000]  ···  [QTY] [ ADICIONAR ]  [✕]     │
   └────────────────────────────────────────────────────┘
   ═══════════════════════════════════════════════════════════════════════════ */

function buildItemCardHtml(item, animateIn) {
  var i         = item._idx;
  var tag       = getItemTag(item);
  var pokeType  = getItemPokeType(item.bannerImage);
  var typeColor = getItemPriceColor(item);

  // imagem
  var isGif  = item.image && /\.gif$/i.test(item.image);
  var imgSrc = isGif
    ? (typeof getShowdownStaticSprite === 'function' ? getShowdownStaticSprite(item.name) : item.image)
    : item.image;
  var imgGif = isGif && typeof getShowdownSprite === 'function' ? getShowdownSprite(item.name) : '';

  var imgHtml = item.image
    ? ('<img class="item-img' + (isGif ? ' item-img--gif' : '') + '"' +
        ' src="' + imgSrc + '"' +
        (isGif ? ' data-gif="' + imgGif + '"' : '') +
        ' alt="' + item.name + '"' +
        ' loading="lazy" decoding="async"' +
        ' onerror="this.parentElement.style.display=\'none\'" />')
    : '';

  var safeName = item.name.replace(/'/g, "\\'");

  // tags row
  var tagsHtml =
    '<div class="item-tags-row">' +
      buildItemTierHtml(item.tier) +
      buildItemEvoHtml(item.evo) +
      buildItemBannerHtml(item) +
    '</div>';

  // card classes
  var cls = 'item-card';
  if (tag === 'shiny') cls += ' is-shiny';
  if (animateIn)       cls += ' card-anim';
  var dataType = pokeType ? ' data-type="' + pokeType + '"' : '';

  return (
    '<div class="' + cls + '"' + dataType + '>' +

      // ── body (image + info) ──
      '<div class="item-card-body">' +

        // image column
        '<div class="item-img-col">' + imgHtml + '</div>' +

        // info column
        '<div class="item-info-col">' +
          '<div class="item-card-header">' +
            '<div class="item-card-name">' +
              item.name +
              '<button class="item-wiki-btn" onclick="openWikiLookup(\'' + safeName + '\',event)" title="Wiki">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
                  '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
                '</svg>' +
              '</button>' +
            '</div>' +
          '</div>' +
          tagsHtml +
          buildItemPriceHtml(item, typeColor) +
        '</div>' +
      '</div>' +

      // ── divider ──
      '<div class="item-card-divider"></div>' +

      // ── footer (pack + qty + add) ──
      '<div class="item-card-footer">' +
        buildItemPackFooterHtml(item) +
        buildItemManualFooterHtml(item) +
      '</div>' +

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
        '<div class="items-empty-icon">⬡</div>' +
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

  requestAnimationFrame(function() {
    _itemsInjectShine();
    _itemsGifBind();
    _itemsObserveCards();
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   EFEITOS VISUAIS  (geridos aqui, não no app.js)
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Shine div ──────────────────────────────────────────────────────────────
function _itemsInjectShine() {
  document.querySelectorAll('.item-card:not([data-shine])').forEach(function(card) {
    card.setAttribute('data-shine', '1');
    var div = document.createElement('div');
    div.className = 'card-shine';
    card.appendChild(div);
  });
}

// ── GIF hover ──────────────────────────────────────────────────────────────
function _itemsGifBind() {
  document.querySelectorAll('.item-card').forEach(function(card) {
    if (card._gifBound) return;
    card._gifBound = true;
    var img = card.querySelector('img[data-gif]');
    if (!img) return;
    card.addEventListener('mouseenter', function() { img.src = img.dataset.gif; });
    card.addEventListener('mouseleave', function() {
      if (typeof getShowdownStaticSprite === 'function') img.src = getShowdownStaticSprite(img.alt);
    });
  });
}

// ── IntersectionObserver ───────────────────────────────────────────────────
var _itemsIObs = null;

function _itemsSetupVisibilityObserver() {
  if (!window.IntersectionObserver) return;
  _itemsIObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      e.target.style.willChange = e.isIntersecting ? 'transform' : 'auto';
      e.target.classList.toggle('in-view', e.isIntersecting);
    });
  }, { rootMargin: '100px 0px' });
}

function _itemsObserveCards() {
  if (!_itemsIObs) return;
  document.querySelectorAll('.item-card').forEach(function(c) { _itemsIObs.observe(c); });
}

// ── Burst on add ───────────────────────────────────────────────────────────
function _itemsSetupBurst() {
  var _base = itemAddToCart;
  itemAddToCart = function(i) {
    _base(i);
    var btn = document.getElementById('item-addbtn-' + i);
    if (btn) {
      var card = btn.closest('.item-card');
      if (card) { card.classList.remove('burst'); void card.offsetWidth; card.classList.add('burst'); }
    }
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   INICIALIZAÇÃO
   ═══════════════════════════════════════════════════════════════════════════ */

(function initItemsModule() {
  var searchEl = document.getElementById('items-search');
  var filterEl = document.getElementById('items-filter');

  if (searchEl) {
    var _t;
    searchEl.addEventListener('input', function() {
      clearTimeout(_t);
      _t = setTimeout(renderItems, 150);
    });
  }

  if (filterEl) filterEl.addEventListener('change', renderItems);

  _itemsSetupVisibilityObserver();
  _itemsSetupBurst();

  renderItems();
})();
