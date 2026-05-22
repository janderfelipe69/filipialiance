/**
 * items.logic.js
 * ─────────────────────────────────────────────────────────────────────────────
 * SOURCE OF TRUTH para todo o estado da aba de itens.
 *
 * REGRA: nenhum outro arquivo declara variáveis de estado de itens da UI.
 * A lógica de carrinho (cart, addToCart, removeFromCart) permanece em app.js
 * pois é compartilhada com pacotes e outros módulos.
 *
 * Carregado APÓS app.js (que define items, cart, formatKK, getTag, etc.)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ═══════════════════════════════════════════════════════════════════════════
   ESTADO CENTRALIZADO
   ═══════════════════════════════════════════════════════════════════════════ */

window.itemsState = {
  searchQuery:    '',     // string — termo atual de busca
  activeFilter:   'all',  // string — filtro ativo (tier/tag/all)
  initialRender:  true,   // boolean — controla animação de entrada
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAPEAMENTOS PUROS (sem estado, sem DOM)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Retorna a tag visual do item: 'shiny' | 'orb' | 'essence' | 'normal'
 * Replica getTag() de app.js com escopo local para desacoplamento.
 */
function getItemTag(item) {
  var n = (item.name || '').toLowerCase();
  if (n.includes('shiny'))   return 'shiny';
  if (n.includes('orb'))     return 'orb';
  if (n.includes('essence')) return 'essence';
  return 'normal';
}

/** Mapa de URL fragment → tipo pokémon (para cor dinâmica do preço) */
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

/** Paleta de cores por tipo pokémon */
var ITEM_TYPE_COLORS = {
  fire:     '#ff6a00',
  water:    '#00aaff',
  electric: '#ffe600',
  grass:    '#44cc00',
  ice:      '#80e8ff',
  psychic:  '#ff44bb',
  ghost:    '#9900ff',
  dragon:   '#ffaa00',
  dark:     '#6666cc',
  fairy:    '#ff66bb',
  poison:   '#aa00cc',
  ground:   '#cc8800',
  rock:     '#aa8855',
  bug:      '#99cc00',
  flying:   '#aabbff',
  steel:    '#ccddee',
  normal:   '#bbbbbb',
  fighting: '#ff4400',
};

/** Tier filters reconhecidos */
var ITEM_TIER_FILTERS = ['t1','t2','t3','t4','t5','hard','mark'];

/**
 * Retorna o tipo pokémon de um item a partir da bannerImage URL.
 * @param {string} bannerImage
 * @returns {string|null}
 */
function getItemPokeType(bannerImage) {
  if (!bannerImage) return null;
  var match = ITEM_BANNER_TYPE_MAP.find(function(m) {
    return bannerImage.includes(m.url);
  });
  return match ? match.type : null;
}

/**
 * Retorna a cor primária para o preço de um item.
 * @param {object} item
 * @returns {string} cor hex/css
 */
function getItemPriceColor(item) {
  var tag      = getItemTag(item);
  var pokeType = getItemPokeType(item.bannerImage);
  if (pokeType && ITEM_TYPE_COLORS[pokeType]) return ITEM_TYPE_COLORS[pokeType];
  if (tag === 'shiny') return '#ffd166';
  return '#60aaff';
}

/* ═══════════════════════════════════════════════════════════════════════════
   FILTRO E BUSCA
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Aplica busca + filtro sobre o array global `items`.
 * @param {string} query  — texto de busca (já em lowercase)
 * @param {string} filter — valor do select de filtro
 * @returns {Array} itens visíveis
 */
function filterItems(query, filter) {
  return items.filter(function(item) {
    var tag  = getItemTag(item);
    var tier = (item.tier || '').toLowerCase();

    var matchQ = !query || item.name.toLowerCase().includes(query);

    var isTierFilter = ITEM_TIER_FILTERS.includes(filter);
    var matchF =
      filter === 'all'
      || (isTierFilter && tier === filter)
      || (!isTierFilter && filter === 'normal' && !item.tier && tag === 'normal')
      || (!isTierFilter && filter !== 'normal' && tag === filter);

    return matchQ && matchF;
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS DE HTML PARCIAL
   (small pieces sem estrutura de card completo)
   ═══════════════════════════════════════════════════════════════════════════ */

/** Gera HTML do banner tag (acima da imagem) */
function buildItemBannerHtml(item) {
  if (!item.bannerImage && !item.banner) return '';
  if (item.bannerImage) {
    return '<div class="item-card-banner has-img"><img src="' + item.bannerImage +
      '" alt="tipo" loading="lazy" onerror="this.parentElement.style.display=\'none\'" /></div>';
  }
  return '<div class="item-card-banner text-only">' + item.banner + '</div>';
}

/** Gera HTML da tier tag */
function buildItemTierHtml(tier) {
  if (!tier) return '';
  var cfg = {
    t1:   { label: 'T1',   cls: 'item-tier-t1'   },
    t2:   { label: 'T2',   cls: 'item-tier-t2'   },
    t3:   { label: 'T3',   cls: 'item-tier-t3'   },
    t4:   { label: 'T4',   cls: 'item-tier-t4'   },
    t5:   { label: 'T5',   cls: 'item-tier-t5'   },
    hard: { label: 'HARD', cls: 'item-tier-hard' },
    mark: { label: 'MARK', cls: 'item-tier-mark' },
  }[tier.toLowerCase()];
  if (!cfg) return '';
  return '<span class="item-tier-tag ' + cfg.cls + '">' + cfg.label + '</span>';
}

/** Gera HTML da evo tag */
function buildItemEvoHtml(evo) {
  if (!evo) return '';
  var cfg = {
    evo1: { label: 'EVO 1', cls: 'item-evo-1' },
    evo2: { label: 'EVO 2', cls: 'item-evo-2' },
    evo3: { label: 'EVO 3', cls: 'item-evo-3' },
  }[evo.toLowerCase()];
  if (!cfg) return '';
  return '<span class="item-evo-tag ' + cfg.cls + '">' + cfg.label + '</span>';
}

/** Gera HTML do bloco de preço (unit + total) */
function buildItemPriceHtml(item, typeColor) {
  var priceData = (typeof formatKK === 'function') ? formatKK(item.price) : null;
  if (!priceData) {
    return '<div class="item-price-block"><span class="item-price-none">sem preço</span></div>';
  }
  var dimColor = typeColor + 'aa';
  return (
    '<div class="item-price-block">' +
      '<div class="item-price-row">' +
        '<span class="item-price-label">Unit.</span>' +
        '<span class="item-price-kk" style="color:' + typeColor + ';text-shadow:0 0 10px ' + typeColor + '55">' + priceData.label + '</span>' +
        '<span class="item-price-brl" style="color:' + dimColor + '">' + priceData.brl + '</span>' +
      '</div>' +
      '<div class="item-price-sep" style="background:linear-gradient(90deg,' + typeColor + '33,transparent 80%)"></div>' +
      '<div class="item-price-row" id="item-total-row-' + item._idx + '">' +
        '<span class="item-price-label">Total</span>' +
        '<span class="item-price-total-kk" style="color:' + typeColor + '99" id="item-total-kk-' + item._idx + '">' + priceData.label + '</span>' +
        '<span class="item-price-total-brl" id="item-total-brl-' + item._idx + '">' + priceData.brl + '</span>' +
      '</div>' +
    '</div>'
  );
}

/** Gera HTML dos botões de pack (+500 / +1000) */
function buildItemPackFooterHtml(item, typeColor) {
  var priceData    = (typeof formatKK === 'function') ? formatKK(item.price) : null;
  var pack500Data  = item.price ? formatKK(item.price * 500)  : null;
  var pack1000Data = item.price ? formatKK(item.price * 1000) : null;
  var i = item._idx;

  var p500Label = pack500Data
    ? '<span class="item-pack-btn-qty">+500</span><span class="item-pack-btn-price">' + pack500Data.label + '</span><span class="item-pack-btn-brl">' + pack500Data.brl + '</span>'
    : '<span class="item-pack-btn-qty">+500</span>';

  var p1000Label = pack1000Data
    ? '<span class="item-pack-btn-qty">+1000</span><span class="item-pack-btn-price">' + pack1000Data.label + '</span><span class="item-pack-btn-brl">' + pack1000Data.brl + '</span>'
    : '<span class="item-pack-btn-qty">+1000</span>';

  return (
    '<div class="item-pack-footer">' +
      '<button class="item-pack-btn item-pack-btn-500" id="itembtn-500-' + i + '" onclick="addPackToCart(' + i + ', 500)">' + p500Label + '</button>' +
      '<button class="item-pack-btn item-pack-btn-1000" onclick="addPackToCart(' + i + ', 1000)">' + p1000Label + '</button>' +
    '</div>'
  );
}

/** Gera HTML do footer manual (qty input + add button + remove inline) */
function buildItemManualFooterHtml(item) {
  var i      = item._idx;
  var inCart = (typeof cart !== 'undefined') && cart[i] > 0;
  return (
    '<div class="item-manual-footer">' +
      '<input type="number" class="item-qty-input" id="item-qty-' + i + '" value="1" min="1" max="100000"' +
        ' oninput="const v=parseInt(this.value,10);this.value=(isNaN(v)||v<1)?1:(v>100000?100000:v);itemUpdateTotalPrice(' + i + ',this.value)"' +
        ' onkeydown="if(event.key===\'-\'||event.key===\'e\')event.preventDefault()" />' +
      '<div class="item-footer-added" style="flex:1">' +
        '<button class="item-add-btn' + (inCart ? ' added' : '') + '" id="item-addbtn-' + i + '" onclick="itemAddToCart(' + i + ')" style="flex:1">' +
          '<span id="item-addbtn-label-' + i + '">' + (inCart ? ('✓ ' + cart[i].toLocaleString()) : '⬟ Adicionar') + '</span>' +
        '</button>' +
        (inCart
          ? '<button class="item-rem-btn" id="item-rembtn-' + i + '" onclick="itemRemoveFromCart(' + i + ')" title="Remover do carrinho">&#x2715;</button>'
          : '<span id="item-rembtn-' + i + '"></span>'
        ) +
      '</div>' +
    '</div>'
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PONTOS DE ENTRADA DE EVENTOS (bridge para cart em app.js)
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Atualiza display de preço total quando qty muda.
 * Bridge para a lógica em app.js (updateTotalPrice) usando novos IDs.
 */
function itemUpdateTotalPrice(i, rawVal) {
  var qty  = Math.max(1, parseInt(rawVal, 10) || 1);
  var item = items[i];
  if (!item || !item.price) return;
  var total = item.price * qty;
  var data  = (typeof formatKK === 'function') ? formatKK(total) : null;
  if (!data) return;
  var kkEl  = document.getElementById('item-total-kk-' + i);
  var brlEl = document.getElementById('item-total-brl-' + i);
  if (kkEl)  kkEl.textContent  = data.label;
  if (brlEl) brlEl.textContent = data.brl;
}

/**
 * Adiciona item ao carrinho via input de qty.
 * Atualiza botões com os IDs novos do módulo.
 */
function itemAddToCart(i) {
  var input = document.getElementById('item-qty-' + i);
  var val   = parseInt(input ? input.value : 1, 10);
  if (isNaN(val) || val < 1) val = 1;
  if (val > 100000) val = 100000;

  cart[i] = (cart[i] || 0) + val;

  if (items[i] && !items[i].price && typeof showNoPriceToast === 'function') {
    showNoPriceToast(items[i].name);
  }

  if (typeof updateCartBadge === 'function') updateCartBadge();

  // Atualiza botão do módulo de itens
  var btn = document.getElementById('item-addbtn-' + i);
  var lbl = document.getElementById('item-addbtn-label-' + i);
  if (btn) {
    btn.classList.add('added');
    btn.classList.add('just-added');
    setTimeout(function() { btn.classList.remove('just-added'); }, 300);
  }
  if (lbl) lbl.textContent = '✓ ' + cart[i].toLocaleString();

  // Troca span vazio por botão de remover
  var remSlot = document.getElementById('item-rembtn-' + i);
  if (remSlot && remSlot.tagName === 'SPAN') {
    var remBtn       = document.createElement('button');
    remBtn.className = 'item-rem-btn';
    remBtn.id        = 'item-rembtn-' + i;
    remBtn.title     = 'Remover do carrinho';
    remBtn.innerHTML = '&#x2715;';
    remBtn.onclick   = function() { itemRemoveFromCart(i); };
    remSlot.replaceWith(remBtn);
  }

  var overlay = document.getElementById('cart-overlay');
  if (overlay && overlay.classList.contains('open') && typeof renderCart === 'function') {
    renderCart();
  }
}

/**
 * Remove item do carrinho e reseta botões do módulo.
 */
function itemRemoveFromCart(i) {
  delete cart[i];

  var btn = document.getElementById('item-addbtn-' + i);
  var lbl = document.getElementById('item-addbtn-label-' + i);
  if (btn) btn.classList.remove('added');
  if (lbl) lbl.textContent = '⬟ Adicionar';

  var remBtn = document.getElementById('item-rembtn-' + i);
  if (remBtn && remBtn.tagName === 'BUTTON') {
    var span = document.createElement('span');
    span.id  = 'item-rembtn-' + i;
    remBtn.replaceWith(span);
  }

  if (typeof updateCartBadge === 'function') updateCartBadge();
  if (typeof renderCart === 'function') renderCart();
}
