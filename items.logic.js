/**
 * items.logic.js  v2
 * ─────────────────────────────────────────────────────────────────────────────
 * SOURCE OF TRUTH: estado, filtros, helpers de HTML para a aba de itens.
 * Carregado APÓS app.js (que define items[], cart{}, formatKK, etc.)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ═══════════════════════════════════════════════════════════════════════════
   ESTADO
   ═══════════════════════════════════════════════════════════════════════════ */

window.itemsState = {
  searchQuery:   '',
  activeFilter:  'all',
  initialRender: true,
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAPEAMENTOS PUROS
   ═══════════════════════════════════════════════════════════════════════════ */

var ITEM_BANNER_TYPE_MAP = [
  { url: 'zpRe43i', type: 'water'    },
  { url: 'GleRjiM', type: 'steel'    },
  { url: 'GvD1Mtq', type: 'rock'     },
  { url: 'ASiZi1K', type: 'psychic'  },
  { url: 'xfX0ReE', type: 'poison'   },
  { url: 'w2ChsIe', type: 'normal'   },
  { url: 'ssFz0sA', type: 'ice'      },
  { url: 'JPcD2l3', type: 'ground'   },
  { url: 'O8TONGE', type: 'fire'     },
  { url: 'YjKxtoE', type: 'grass'    },
  { url: 'Yv2WEYc', type: 'electric' },
  { url: '7Luj4az', type: 'dark'     },
  { url: 'o7JWbaN', type: 'dragon'   },
  { url: 'HuybbPn', type: 'ghost'    },
  { url: 'j3HaXTh', type: 'fairy'    },
  { url: 'npGjQae', type: 'flying'   },
  { url: 'V4IXR51', type: 'bug'      },
  { url: 'OKsJXh7', type: 'fighting' },
];

var ITEM_TYPE_COLORS = {
  fire: '#ff6a00', water: '#00aaff', electric: '#ffe600', grass: '#44cc00',
  ice: '#80e8ff', psychic: '#ff44bb', ghost: '#9900ff', dragon: '#ffaa00',
  dark: '#6666cc', fairy: '#ff66bb', poison: '#aa00cc', ground: '#cc8800',
  rock: '#aa8855', bug: '#99cc00', flying: '#aabbff', steel: '#ccddee',
  normal: '#bbbbbb', fighting: '#ff4400',
};

var ITEM_TIER_FILTERS = ['t1','t2','t3','t4','t5','hard','mark'];

function getItemTag(item) {
  var n = (item.name || '').toLowerCase();
  if (n.includes('shiny'))   return 'shiny';
  if (n.includes('orb'))     return 'orb';
  if (n.includes('essence')) return 'essence';
  return 'normal';
}

function getItemPokeType(bannerImage) {
  if (!bannerImage) return null;
  var m = ITEM_BANNER_TYPE_MAP.find(function(x) { return bannerImage.includes(x.url); });
  return m ? m.type : null;
}

function getItemPriceColor(item) {
  var tag  = getItemTag(item);
  var type = getItemPokeType(item.bannerImage);
  if (type && ITEM_TYPE_COLORS[type]) return ITEM_TYPE_COLORS[type];
  if (tag === 'shiny') return '#ffd166';
  return '#4a9aff';
}

/* ═══════════════════════════════════════════════════════════════════════════
   FILTRO
   ═══════════════════════════════════════════════════════════════════════════ */

function filterItems(query, filter) {
  return items.filter(function(item) {
    var tag  = getItemTag(item);
    var tier = (item.tier || '').toLowerCase();
    var matchQ = !query || item.name.toLowerCase().includes(query);
    var isTier = ITEM_TIER_FILTERS.includes(filter);
    var matchF =
      filter === 'all'
      || (isTier  && tier === filter)
      || (!isTier && filter === 'normal' && !item.tier && tag === 'normal')
      || (!isTier && filter !== 'normal' && tag === filter);
    return matchQ && matchF;
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   HTML BUILDERS (novo layout horizontal)
   ═══════════════════════════════════════════════════════════════════════════ */

function buildItemBannerHtml(item) {
  if (!item.bannerImage && !item.banner) return '';
  if (item.bannerImage) {
    return '<div class="item-card-banner has-img">' +
      '<img src="' + item.bannerImage + '" alt="tipo" loading="lazy" onerror="this.parentElement.style.display=\'none\'" />' +
      '</div>';
  }
  return '<div class="item-card-banner text-only">' + item.banner + '</div>';
}

function buildItemTierHtml(tier) {
  if (!tier) return '';
  var cfg = {
    t1: { label: 'T1', cls: 'item-tier-t1' },
    t2: { label: 'T2', cls: 'item-tier-t2' },
    t3: { label: 'T3', cls: 'item-tier-t3' },
    t4: { label: 'T4', cls: 'item-tier-t4' },
    t5: { label: 'T5', cls: 'item-tier-t5' },
    hard: { label: 'HARD', cls: 'item-tier-hard' },
    mark: { label: 'MARK', cls: 'item-tier-mark' },
  }[tier.toLowerCase()];
  if (!cfg) return '';
  return '<span class="item-tier-tag ' + cfg.cls + '">' + cfg.label + '</span>';
}

function buildItemEvoHtml(evo) {
  if (!evo) return '';
  var cfg = {
    evo1: { label: 'EVO 1', cls: '' },
    evo2: { label: 'EVO 2', cls: '' },
    evo3: { label: 'EVO 3', cls: 'item-evo-3' },
  }[(evo || '').toLowerCase()];
  if (!cfg) return '';
  return '<span class="item-evo-tag ' + cfg.cls + '">' + cfg.label + '</span>';
}

function buildItemPriceHtml(item, typeColor) {
  if (item.price === null || item.price === undefined) {
    return '<div class="item-price-block"><span class="item-price-none">sem preço</span></div>';
  }
  if (item.price === 0) {
    return '<div class="item-price-block"><span class="item-price-free">Grátis</span></div>';
  }
  var priceData = (typeof formatKK === 'function') ? formatKK(item.price) : null;
  if (!priceData) {
    return '<div class="item-price-block"><span class="item-price-none">sem preço</span></div>';
  }
  return (
    '<div class="item-price-block">' +
      '<div class="item-price-main">' +
        '<span class="item-price-kk" style="color:' + typeColor + ';text-shadow:0 0 16px ' + typeColor + '44">' + priceData.label + '</span>' +
        '<span class="item-price-brl">' + priceData.brl + '</span>' +
      '</div>' +
      '<div class="item-price-total-row">' +
        '<span class="item-price-total-label">total</span>' +
        '<span class="item-price-total-kk" style="color:' + typeColor + '66" id="item-total-kk-' + item._idx + '">' + priceData.label + '</span>' +
        '<span class="item-price-total-brl" id="item-total-brl-' + item._idx + '">' + priceData.brl + '</span>' +
      '</div>' +
    '</div>'
  );
}

function buildItemPackFooterHtml(item) {
  var i = item._idx;
  var p500  = (item.price !== null && item.price > 0) ? formatKK(item.price * 500)  : null;
  var p1000 = (item.price !== null && item.price > 0) ? formatKK(item.price * 1000) : null;

  var lbl500 = p500
    ? '<span class="item-pack-btn-qty">+500</span><span class="item-pack-btn-price">' + p500.label + '</span><span class="item-pack-btn-brl">' + p500.brl + '</span>'
    : '<span class="item-pack-btn-qty">+500</span>';

  var lbl1000 = p1000
    ? '<span class="item-pack-btn-qty">+1000</span><span class="item-pack-btn-price">' + p1000.label + '</span><span class="item-pack-btn-brl">' + p1000.brl + '</span>'
    : '<span class="item-pack-btn-qty">+1000</span>';

  return (
    '<div class="item-pack-group">' +
      '<button class="item-pack-btn item-pack-btn-500" id="itembtn-500-' + i + '" onclick="addPackToCart(' + i + ',500)">' + lbl500 + '</button>' +
      '<button class="item-pack-btn item-pack-btn-1000" onclick="addPackToCart(' + i + ',1000)">' + lbl1000 + '</button>' +
    '</div>'
  );
}

function buildItemManualFooterHtml(item) {
  var i      = item._idx;
  var inCart = (typeof cart !== 'undefined') && cart[i] > 0;
  return (
    '<input type="number" class="item-qty-input" id="item-qty-' + i + '" value="1" min="1" max="100000"' +
      ' oninput="var v=parseInt(this.value,10);this.value=(isNaN(v)||v<1)?1:(v>100000?100000:v);itemUpdateTotalPrice(' + i + ',this.value)"' +
      ' onkeydown="if(event.key===\'-\'||event.key===\'e\')event.preventDefault()" />' +
    '<div class="item-cta-group">' +
      '<button class="item-add-btn' + (inCart ? ' added' : '') + '" id="item-addbtn-' + i + '" onclick="itemAddToCart(' + i + ')">' +
        '<span id="item-addbtn-label-' + i + '">' + (inCart ? ('✓ ' + cart[i].toLocaleString()) : 'Adicionar') + '</span>' +
      '</button>' +
      (inCart
        ? '<button class="item-rem-btn" id="item-rembtn-' + i + '" onclick="itemRemoveFromCart(' + i + ')" title="Remover">✕</button>'
        : '<span id="item-rembtn-' + i + '"></span>'
      ) +
    '</div>'
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CART BRIDGE
   ═══════════════════════════════════════════════════════════════════════════ */

function itemUpdateTotalPrice(i, rawVal) {
  var qty  = Math.max(1, parseInt(rawVal, 10) || 1);
  var item = items[i];
  if (!item || item.price === null || item.price === undefined) return;
  var data = (typeof formatKK === 'function') ? formatKK(item.price * qty) : null;
  if (!data) return;
  var kkEl  = document.getElementById('item-total-kk-'  + i);
  var brlEl = document.getElementById('item-total-brl-' + i);
  if (kkEl)  kkEl.textContent  = data.label;
  if (brlEl) brlEl.textContent = data.brl;
}

function itemAddToCart(i) {
  var input = document.getElementById('item-qty-' + i);
  var val   = parseInt(input ? input.value : 1, 10);
  if (isNaN(val) || val < 1) val = 1;
  if (val > 100000) val = 100000;

  cart[i] = (cart[i] || 0) + val;

  if (items[i] && items[i].price === null && typeof showNoPriceToast === 'function') {
    showNoPriceToast(items[i].name);
  }

  if (typeof updateCartBadge === 'function') updateCartBadge();

  var btn = document.getElementById('item-addbtn-' + i);
  var lbl = document.getElementById('item-addbtn-label-' + i);
  if (btn) { btn.classList.add('added', 'just-added'); setTimeout(function() { btn.classList.remove('just-added'); }, 250); }
  if (lbl) lbl.textContent = '✓ ' + cart[i].toLocaleString();

  var remSlot = document.getElementById('item-rembtn-' + i);
  if (remSlot && remSlot.tagName === 'SPAN') {
    var remBtn       = document.createElement('button');
    remBtn.className = 'item-rem-btn';
    remBtn.id        = 'item-rembtn-' + i;
    remBtn.title     = 'Remover do carrinho';
    remBtn.textContent = '✕';
    remBtn.onclick   = function() { itemRemoveFromCart(i); };
    remSlot.replaceWith(remBtn);
  }

  var overlay = document.getElementById('cart-overlay');
  if (overlay && overlay.classList.contains('open') && typeof renderCart === 'function') renderCart();
}

function itemRemoveFromCart(i) {
  delete cart[i];

  var btn = document.getElementById('item-addbtn-' + i);
  var lbl = document.getElementById('item-addbtn-label-' + i);
  if (btn) btn.classList.remove('added');
  if (lbl) lbl.textContent = 'Adicionar';

  var remBtn = document.getElementById('item-rembtn-' + i);
  if (remBtn && remBtn.tagName === 'BUTTON') {
    var span = document.createElement('span');
    span.id  = 'item-rembtn-' + i;
    remBtn.replaceWith(span);
  }

  if (typeof updateCartBadge === 'function') updateCartBadge();
  if (typeof renderCart === 'function') renderCart();
}
