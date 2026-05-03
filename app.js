// ============================================================
// app.js — Lógica do PokeAlliance Shop
// Depende de: dados.js (deve ser carregado antes)
// ============================================================

function formatKK(raw) {
  if (!raw || raw <= 0) return null;
  let label = '';
  if (raw >= 1000000000) {
    const v = raw / 1000000000;
    label = (v % 1 === 0 ? v.toFixed(0) : parseFloat(v.toFixed(2))) + 'kkk';
  } else if (raw >= 1000000) {
    const v = raw / 1000000;
    label = (v % 1 === 0 ? v.toFixed(0) : parseFloat(v.toFixed(2))) + 'kk';
  } else if (raw >= 1000) {
    const v = raw / 1000;
    label = (v % 1 === 0 ? v.toFixed(0) : parseFloat(v.toFixed(2))) + 'k';
  } else {
    label = raw.toString();
  }
  const brl = (raw / 1000000 * KK_TO_BRL).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return { label, brl };
}

const items = [];
const seen = new Set();
RAW.forEach(([name, image, price, tier, evo]) => {
  const key = name + '|' + (image || '');
  if (!seen.has(key)) { seen.add(key); items.push({ name, image: image || '', price: price || 0, tier: tier || '', evo: evo || '' }); }
});
// Store original index on each item for O(1) lookup
items.forEach((item, i) => { item._idx = i; });

document.getElementById('total-count').textContent = items.length + ' itens no índice';

const cart = {};
let pkgCartCount = {};
let _searchTimer;
let _capturaSearchTimer;
let _initialRender = true;

function getTag(item) {
  const n = item.name.toLowerCase();
  if (n.includes('shiny')) return 'shiny';
  if (n.includes('orb')) return 'orb';
  if (n.includes('essence')) return 'essence';
  return 'normal';
}


const TIER_CONFIG = {
  t1:   { label: 'T1',   cls: 'tier-t1' },
  t2:   { label: 'T2',   cls: 'tier-t2' },
  t3:   { label: 'T3',   cls: 'tier-t3' },
  t4:   { label: 'T4',   cls: 'tier-t4' },
  t5:   { label: 'T5',   cls: 'tier-t5' },
  hard: { label: 'HARD', cls: 'tier-hard' },
  mark: { label: 'MARK', cls: 'tier-mark' },
};

function getTierHtml(tier) {
  if (!tier) return '';
  const t = tier.toLowerCase();
  const cfg = TIER_CONFIG[t];
  if (!cfg) return '';
  return `<span class="tier-tag ${cfg.cls}">${cfg.label}</span>`;
}

function getEvoHtml(evo) {
  if (!evo) return '';
  const map = {
    evo1: { label: 'EVO 1', cls: 'evo-1' },
    evo2: { label: 'EVO 2', cls: 'evo-2' },
    evo3: { label: 'EVO 3', cls: 'evo-3' },
  };
  const cfg = map[evo.toLowerCase()];
  if (!cfg) return '';
  return `<span class="evo-tag ${cfg.cls}">${cfg.label}</span>`;
}

// ── getBannerHtml ──────────────────────────────────────────────────────────
// Gera a tag de banner exibida ACIMA da imagem do Pokémon.
// Campos do item que ela lê:
//   item.banner        → texto da tag  (string, obrigatório para mostrar)
//   item.bannerImage   → URL da imagem de fundo (opcional)
//
// Exemplos de uso no array `items`:
//   banner: "Evento Especial"
//   banner: "Novo!", bannerImage: "https://..."
// ──────────────────────────────────────────────────────────────────────────
function getBannerHtml(item) {
  if (!item.bannerImage && !item.banner) return "";
  if (item.bannerImage) {
    return `<div class="card-banner-tag has-img"><img src="${item.bannerImage}" alt="tipo" loading="lazy" onerror="this.parentElement.style.display='none'" /></div>`;
  }
  return `<div class="card-banner-tag text-only">${item.banner}</div>`;
}


// ── Mapa URL → tipo ─────────────────────────────────────────────────────────

const TYPE_COLORS = {
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
const BANNER_TYPE_MAP = [
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

function getTypeFromBanner(bannerImage) {
  if (!bannerImage) return null;
  const match = BANNER_TYPE_MAP.find(m => bannerImage.includes(m.url));
  return match ? match.type : null;
}

function buildParticlesHtml(type) {
  if (!type) return '';
  const count = 8;
  let spans = '';
  for (let i = 0; i < count; i++) {
    const x     = (10 + Math.random() * 80).toFixed(1) + '%';
    const size  = (4 + Math.random() * 5).toFixed(1) + 'px';
    const dur   = (1.8 + Math.random() * 2).toFixed(2) + 's';
    const delay = (Math.random() * 2.5).toFixed(2) + 's';
    const drift = ((Math.random() - 0.5) * 30).toFixed(1) + 'px';
    spans += `<span style="--x:${x};--size:${size};--dur:${dur};--delay:${delay};--drift:${drift}"></span>`;
  }
  return `<div class="type-particles type-${type}">${spans}</div>`;
}

function render() {
  const q = document.getElementById('search').value.toLowerCase();
  const f = document.getElementById('filter').value;
  const grid = document.getElementById('grid');

  const visible = items.filter((item) => {
    const tag = getTag(item);
    const tier = (item.tier || '').toLowerCase();
    const matchQ = !q || item.name.toLowerCase().includes(q);
    const isTierFilter = ['t1','t2','t3','t4','t5','hard','mark'].includes(f);
    const matchF = f === 'all'
      || (isTierFilter && tier === f)
      || (!isTierFilter && f === 'normal' && !item.tier && tag === 'normal')
      || (!isTierFilter && !['normal'].includes(f) && tag === f);
    return matchQ && matchF;
  });

  document.getElementById('count-label').textContent = visible.length + ' itens';

  if (!visible.length) {
    grid.innerHTML = '<div class="no-results">Nenhum item encontrado.</div>';
    return;
  }

  grid.innerHTML = visible.map((item, vi) => {
    const i = item._idx;
    const tag = getTag(item);
    const inCart = cart[i] > 0;
    const src = '';
    const priceData = formatKK(item.price);
    const pack500Data = item.price ? formatKK(item.price * 500) : null;
    const pack1000Data = item.price ? formatKK(item.price * 1000) : null;

    // Cor do tipo para os preços
    const pokeType = getTypeFromBanner(item.bannerImage);
    const typeColor = (pokeType && TYPE_COLORS[pokeType]) ? TYPE_COLORS[pokeType] : (tag === 'shiny' ? '#ffd166' : '#60aaff');
    const typeColorDim = typeColor + 'aa'; // ~67% opacity via hex

    const priceHtml = priceData
      ? `<div class="price-block">
          <div class="price-row">
            <span class="price-label">Unit.</span>
            <span class="price-kk" style="color:${typeColor};text-shadow:0 0 10px ${typeColor}55">${priceData.label}</span>
            <span class="price-brl" style="color:${typeColorDim}">${priceData.brl}</span>
          </div>
          <div class="price-sep" style="background:linear-gradient(90deg,${typeColor}33,transparent 80%)"></div>
          <div class="price-row" id="total-row-${i}">
            <span class="price-label">Total</span>
            <span class="price-total-kk" style="color:${typeColor}99" id="total-kk-${i}">${priceData.label}</span>
            <span class="price-total-brl" id="total-brl-${i}">${priceData.brl}</span>
          </div>
        </div>`
      : `<div class="item-price"><span class="price-none">sem preço</span></div>`;
    const isGif = item.image && /\.gif$/i.test(item.image);
    const imgSrc = isGif ? getShowdownStaticSprite(item.name) : item.image;
    const imgGif = isGif ? getShowdownSprite(item.name) : '';
    const imgHtml = item.image
      ? `<div class="item-img-wrap">
           <img class="card-img${isGif ? ' card-img--gif' : ''}"
                src="${imgSrc}"
                ${isGif ? `data-gif="${imgGif}"` : ''}
                alt="${item.name}"
                loading="lazy" decoding="async"
                onerror="this.parentElement.style.display='none'" />
         </div>`
      : '';
    const pack500Label = pack500Data ? `<span class="pack-btn-qty">+500</span><span class="pack-btn-price">${pack500Data.label}</span><span class="pack-btn-brl">${pack500Data.brl}</span>` : `<span class="pack-btn-qty">+500</span>`;
    const pack1000Label = pack1000Data ? `<span class="pack-btn-qty">+1000</span><span class="pack-btn-price">${pack1000Data.label}</span><span class="pack-btn-brl">${pack1000Data.brl}</span>` : `<span class="pack-btn-qty">+1000</span>`;
    const animClass = _initialRender ? ' card-anim' : '';
    const dataType = pokeType ? ` data-type="${pokeType}"` : '';
    return `<div class="card${tag === 'shiny' ? ' is-shiny' : ''}${animClass}"${dataType}>
      ${getBannerHtml(item)}
      ${imgHtml}
      <div class="item-name">${item.name}<button class="wiki-lookup-btn" onclick="openWikiLookup('${item.name.replace(/'/g,"\\'")}', event)" title="Ver drops na Wiki"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button></div>
      ${getTierHtml(item.tier)}
      ${getEvoHtml(item.evo)}
      ${src}
      ${priceHtml}
      <div class="card-footer pack-footer">
        <button class="pack-btn pack-btn-500" id="addbtn-${i}" onclick="addPackToCart(${i}, 500)">
          ${pack500Label}
        </button>
        <button class="pack-btn pack-btn-1000" onclick="addPackToCart(${i}, 1000)">
          ${pack1000Label}
        </button>
      </div>
      <div class="card-footer manual-footer">
        <input type="number" id="qty-${i}" value="1" min="1" max="100000" oninput="const v=parseInt(this.value,10); this.value=(isNaN(v)||v<1)?1:(v>100000?100000:v); updateTotalPrice(${i}, this.value)" onkeydown="if(event.key==='-'||event.key==='e')event.preventDefault()" />
        <div class="card-footer-added" style="flex:1">
          <button class="add-btn${inCart ? ' added' : ''}" id="manualaddbtn-${i}" onclick="addToCart(${i})" style="flex:1">
            <span id="addbtn-label-${i}">${inCart ? '✓ ' + cart[i].toLocaleString() : '⬟ Adicionar'}</span>
          </button>
          ${inCart ? `<button class="inline-rem-btn" id="rembtn-${i}" onclick="removeFromCart(${i})" title="Remover do carrinho">&#x2715;</button>` : `<span id="rembtn-${i}"></span>`}
        </div>
      </div>
    </div>`;
  }).join('');
  _initialRender = false;
}

function updateTotalPrice(i, rawVal) {
  const qty = Math.max(1, parseInt(rawVal, 10) || 1);
  const item = items[i];
  if (!item || !item.price) return;
  const totalPrice = item.price * qty;
  const data = formatKK(totalPrice);
  if (!data) return;
  const kkEl = document.getElementById('total-kk-' + i);
  const brlEl = document.getElementById('total-brl-' + i);
  if (kkEl) kkEl.textContent = data.label;
  if (brlEl) brlEl.textContent = data.brl;
}


function onNickInput() {
  const wrap = document.getElementById('nick-field-wrap');
  const err  = document.getElementById('nick-error');
  if (wrap) wrap.classList.remove('error');
  if (err)  err.classList.remove('visible');
}

function sendToWhatsApp() {
  const keys = Object.keys(cart).filter(k => cart[k] > 0);
  if (!keys.length) return;

  // Valida nick obrigatorio
  const nickInput = document.getElementById('cart-nick-input');
  const nick = nickInput ? nickInput.value.trim() : '';
  if (!nick) {
    const wrap = document.getElementById('nick-field-wrap');
    const err  = document.getElementById('nick-error');
    if (wrap) { wrap.classList.remove('error'); void wrap.offsetWidth; wrap.classList.add('error'); }
    if (err)  err.classList.add('visible');
    if (nickInput) nickInput.focus();
    return;
  }

  function toBRL(raw) {
    return (raw / 1000000 * KK_TO_BRL).toFixed(2);
  }
  // Helper que ja entrega o valor com virgula decimal
  function fmt(raw) {
    return toBRL(raw).replace('.', ',');
  }

  const rows = ['PEDIDO DE SERVICO', 'Nick no jogo: ' + nick, 'Item;Quantidade;Valor Unitario;Valor Total'];
  let grandTotalBRL = 0;

  keys.forEach(k => {
    const item = items[k];
    const qty      = cart[k];
    const unitRaw  = item.price || 0;
    const totalRaw = unitRaw * qty;
    const unitBRL  = unitRaw  > 0 ? fmt(unitRaw)  : '0,00';
    const totalBRL = totalRaw > 0 ? fmt(totalRaw) : '0,00';
    grandTotalBRL += totalRaw > 0 ? parseFloat(toBRL(totalRaw)) : 0;
    rows.push(`${item.name};${qty};${unitBRL};${totalBRL}`);
  });

  const grandTotalRaw = keys.reduce((s, k) => {
    const item = items[k];
    return s + (item && item.price ? item.price * cart[k] : 0);
  }, 0);

  const TAXA_THRESHOLD = 10000000;
  const TAXA_VALOR     = 5000000;
  const hasTaxa = grandTotalRaw > 0 && grandTotalRaw < TAXA_THRESHOLD;
  if (hasTaxa) {
    const taxaNum = parseFloat(toBRL(TAXA_VALOR));
    const taxaStr = taxaNum.toFixed(2).replace('.', ',');
    grandTotalBRL += taxaNum;
    rows.push(`Taxa de servico (pedido abaixo de 10kk);1;${taxaStr};${taxaStr}`);
  }

  // Grand total com vírgula
  const grandTotalStr = grandTotalBRL.toFixed(2).replace('.', ',');
  rows.push(`TOTAL GERAL;;;${grandTotalStr}`);

  const mode = _currentPayMode;
  if (mode === 'kk') {
    const kkD = formatKK(_payTotalKk);
    if (kkD) rows.push(`\nPagamento: ${kkD.label} KK (moeda do jogo)`);
  } else if (mode === 'brl') {
    rows.push(`\nPagamento: R$ ${grandTotalStr} via PIX`);
  } else if (mode === 'mix') {
    const kkVal  = parseFloat(document.getElementById('mix-kk-input').value) || 0;
    const brlVal = parseFloat(document.getElementById('mix-brl-input').value) || 0;
    if (kkVal > 0 || brlVal > 0) {
      const kkD    = formatKK(kkVal * 1000000);
      const brlStr = brlVal.toFixed(2).replace('.', ',');
      rows.push(`\nPagamento misto: ${kkD ? kkD.label : '0'} KK + R$ ${brlStr} via PIX`);
    }
  }

  const msg  = rows.join('\n');
  const phone = '5565999911832';
  const url   = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);
  window.open(url, '_blank');
}

function sendToDiscord() {
  const keys = Object.keys(cart).filter(k => cart[k] > 0);
  if (!keys.length) return;

  const nickInput = document.getElementById('cart-nick-input');
  const nick = nickInput ? nickInput.value.trim() : '';
  if (!nick) {
    const wrap = document.getElementById('nick-field-wrap');
    const err  = document.getElementById('nick-error');
    if (wrap) { wrap.classList.remove('error'); void wrap.offsetWidth; wrap.classList.add('error'); }
    if (err)  err.classList.add('visible');
    if (nickInput) nickInput.focus();
    return;
  }

  function toBRL(raw) { return (raw / 1000000 * KK_TO_BRL).toFixed(2); }
  function fmt(raw)   { return toBRL(raw).replace('.', ','); }

  const lines = ['**PEDIDO DE SERVIÇO**', `**Nick no jogo:** ${nick}`, '```'];
  lines.push('Item                          | Qtd | Unit.   | Total');
  lines.push('------------------------------|-----|---------|--------');

  let grandTotalBRL = 0;
  keys.forEach(k => {
    const item = items[k];
    const qty      = cart[k];
    const unitRaw  = item.price || 0;
    const totalRaw = unitRaw * qty;
    const unitBRL  = unitRaw  > 0 ? 'R$' + fmt(unitRaw)  : 'R$0,00';
    const totalBRL = totalRaw > 0 ? 'R$' + fmt(totalRaw) : 'R$0,00';
    grandTotalBRL += totalRaw > 0 ? parseFloat(toBRL(totalRaw)) : 0;
    lines.push(`${item.name.padEnd(30)}| ${String(qty).padEnd(3)} | ${unitBRL.padEnd(7)} | ${totalBRL}`);
  });

  const grandTotalRaw = keys.reduce((s, k) => {
    const item = items[k];
    return s + (item && item.price ? item.price * cart[k] : 0);
  }, 0);

  const TAXA_THRESHOLD = 10000000;
  const TAXA_VALOR     = 5000000;
  const hasTaxa = grandTotalRaw > 0 && grandTotalRaw < TAXA_THRESHOLD;
  if (hasTaxa) {
    const taxaNum = parseFloat(toBRL(TAXA_VALOR));
    const taxaStr = 'R$' + taxaNum.toFixed(2).replace('.', ',');
    grandTotalBRL += taxaNum;
    lines.push(`Taxa de serviço (abaixo 10kk) |  1  | ${taxaStr.padEnd(7)} | ${taxaStr}`);
  }

  const grandTotalStr = 'R$' + grandTotalBRL.toFixed(2).replace('.', ',');
  lines.push('');
  lines.push(`TOTAL GERAL: ${grandTotalStr}`);
  lines.push('```');

  const mode = _currentPayMode;
  if (mode === 'kk') {
    const kkD = formatKK(_payTotalKk);
    if (kkD) lines.push(`**Pagamento:** ${kkD.label} KK (moeda do jogo)`);
  } else if (mode === 'brl') {
    lines.push(`**Pagamento:** ${grandTotalStr} via PIX`);
  } else if (mode === 'mix') {
    const kkVal  = parseFloat(document.getElementById('mix-kk-input').value) || 0;
    const brlVal = parseFloat(document.getElementById('mix-brl-input').value) || 0;
    if (kkVal > 0 || brlVal > 0) {
      const kkD    = formatKK(kkVal * 1000000);
      const brlStr = 'R$' + brlVal.toFixed(2).replace('.', ',');
      lines.push(`**Pagamento misto:** ${kkD ? kkD.label : '0'} KK + ${brlStr} via PIX`);
    }
  }

  const msg = lines.join('\n');
  navigator.clipboard.writeText(msg).then(() => {
    const discordUrl = 'https://discord.com/users/304012234420518914';
    window.open(discordUrl, '_blank');
    // Toast de confirmação
    const toast = document.getElementById('no-price-toast');
    const toastMsg = document.getElementById('no-price-toast-msg');
    const toastTitle = toast ? toast.querySelector('.toast-title') : null;
    if (toast) {
      if (toastTitle) toastTitle.textContent = '✅ Pedido copiado!';
      if (toastMsg) toastMsg.textContent = 'O pedido foi copiado. Cole no chat do Discord com Ctrl+V!';
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
        if (toastTitle) toastTitle.textContent = 'Atenção — item sem preço!';
      }, 4000);
    }
  }).catch(() => {
    // Fallback: abre o Discord mesmo assim
    window.open('https://discord.com/users/304012234420518914', '_blank');
  });
}

// ===================== TOAST SEM PREÇO =====================
let _toastTimer = null;
function showNoPriceToast(itemName) {
  const toast = document.getElementById('no-price-toast');
  const msg   = document.getElementById('no-price-toast-msg');
  if (!toast) return;
  if (msg) msg.textContent = '"' + itemName + '" ainda não tem valor definido. O total do carrinho será ajustado assim que o preço for estabelecido.';
  toast.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('show'), 5000);
}

function addPackToCart(i, qty) {
  cart[i] = (cart[i] || 0) + qty;
  if (!items[i].price) showNoPriceToast(items[i].name);
  updateCartBadge();
  // Atualiza botão 500 como "added" e mostra quantidade total
  const btn = document.getElementById('addbtn-' + i);
  if (btn) btn.classList.add('added');
  // Mostra botão remover inline se ainda não estiver visível
  const remSlot = document.getElementById('rembtn-' + i);
  if (remSlot && remSlot.tagName === 'SPAN') {
    const remBtn = document.createElement('button');
    remBtn.className = 'inline-rem-btn';
    remBtn.id = 'rembtn-' + i;
    remBtn.title = 'Remover do carrinho';
    remBtn.innerHTML = '\u2715';
    remBtn.onclick = () => removeFromCart(i);
    remSlot.replaceWith(remBtn);
  }
  if (document.getElementById('cart-overlay').classList.contains('open')) renderCart();
}

function addToCart(i) {
  const input = document.getElementById('qty-' + i);
  let val = parseInt(input ? input.value : 1, 10);
  if (isNaN(val) || val < 1) val = 1;
  if (val > 100000) val = 100000;
  cart[i] = (cart[i] || 0) + val;
  // Avisa se o item não tem preço definido
  if (!items[i].price) {
    showNoPriceToast(items[i].name);
  }
  updateCartBadge();
  // Atualiza label do botão com a quantidade total no carrinho
  const btn = document.getElementById('addbtn-' + i);
  const lbl = document.getElementById('addbtn-label-' + i);
  if (btn) { btn.classList.add('added'); }
  if (lbl) { lbl.textContent = '\u2713 ' + cart[i].toLocaleString(); }
  // Mostra botão remover inline se ainda não estiver visível
  const remSlot = document.getElementById('rembtn-' + i);
  if (remSlot && remSlot.tagName === 'SPAN') {
    const remBtn = document.createElement('button');
    remBtn.className = 'inline-rem-btn';
    remBtn.id = 'rembtn-' + i;
    remBtn.title = 'Remover do carrinho';
    remBtn.innerHTML = '\u2715';
    remBtn.onclick = () => removeFromCart(i);
    remSlot.replaceWith(remBtn);
  }
  // Atualiza carrinho se estiver aberto
  if (document.getElementById('cart-overlay').classList.contains('open')) {
    renderCart();
  }
}

function updateCartBadge() {
  const keys = Object.keys(cart).filter(k => cart[k] > 0);
  const total = keys.reduce((s, k) => s + cart[k], 0);
  const text = total.toLocaleString();
  const badge = document.getElementById('cart-count-badge');
  if (badge) {
    badge.textContent = text;
    const headerBtn = badge.closest('button');
    if (headerBtn) {
      headerBtn.classList.remove('bump');
      void headerBtn.offsetWidth;
      headerBtn.classList.add('bump');
    }
  }
}

function openCart() {
  renderCart();
  document.getElementById('cart-overlay').classList.add('open');
}

function closeCart() {
  document.getElementById('cart-overlay').classList.remove('open');
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('cart-overlay')) closeCart();
}

function renderCart() {
  const list = document.getElementById('cart-list');
  const footer = document.getElementById('cart-footer');
  const keys = Object.keys(cart).filter(k => cart[k] > 0);

  if (!keys.length) {
    const warnBannerEmpty = document.getElementById('cart-no-price-warning');
    if (warnBannerEmpty) warnBannerEmpty.classList.remove('visible');
    list.innerHTML = `<div class="cart-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
      <span>Carrinho vazio</span>
    </div>`;
    footer.style.display = 'none';
    return;
  }

  const total = keys.reduce((s, k) => s + cart[k], 0);
  const grandTotalRaw = keys.reduce((s, k) => {
    const item = items[k];
    return s + (item && item.price ? item.price * cart[k] : 0);
  }, 0);
  document.getElementById('cart-total-num').textContent = total.toLocaleString();
  footer.style.display = 'block';

  const TAXA_THRESHOLD = 10000000; // 10kk
  const TAXA_VALOR = 5000000;      // 5kk

  // Update grand total in footer
  const gtKkEl = document.getElementById('cart-grand-kk');
  const gtBrlEl = document.getElementById('cart-grand-brl');
  const gtKkFinalEl = document.getElementById('cart-grand-kk-final');
  const taxaRow = document.getElementById('cart-taxa-row');
  const taxaAviso = document.getElementById('cart-taxa-aviso');
  const totalFinalRow = document.getElementById('cart-total-final-row');
  if (grandTotalRaw > 0) {
    const hasTaxa = grandTotalRaw < TAXA_THRESHOLD;
    const grandTotalFinal = hasTaxa ? grandTotalRaw + TAXA_VALOR : grandTotalRaw;
    const gtData = formatKK(grandTotalRaw);
    const gtFinalData = formatKK(grandTotalFinal);
    if (gtKkEl) gtKkEl.textContent = gtData.label;
    // BRL is always based on final total
    if (gtBrlEl) gtBrlEl.textContent = formatKK(grandTotalFinal).brl;
    if (taxaAviso) taxaAviso.style.display = hasTaxa ? 'flex' : 'none';
    if (taxaRow) taxaRow.style.display = hasTaxa ? 'flex' : 'none';
    if (totalFinalRow) totalFinalRow.style.display = hasTaxa ? 'flex' : 'none';
    if (gtKkFinalEl && hasTaxa) gtKkFinalEl.textContent = gtFinalData.label;
    document.getElementById('cart-grand-total-block').style.display = 'block';
    // Atualiza painel de pagamento
    updatePayDisplay(grandTotalRaw, grandTotalFinal, parseFloat((grandTotalFinal / 1000000 * 1.70).toFixed(2)));
  } else {
    document.getElementById('cart-grand-total-block').style.display = 'none';
    if (taxaAviso) taxaAviso.style.display = 'none';
  }

  // Verifica itens sem preço e exibe aviso
  const noPriceItems = keys.filter(k => !items[k].price);
  const warnBanner = document.getElementById('cart-no-price-warning');
  const warnList   = document.getElementById('cart-warn-items-list');
  if (warnBanner) {
    if (noPriceItems.length > 0) {
      warnBanner.classList.add('visible');
      if (warnList) warnList.textContent = 'Sem preço: ' + noPriceItems.map(k => items[k].name).join(', ');
    } else {
      warnBanner.classList.remove('visible');
      if (warnList) warnList.textContent = '';
    }
  }

  list.innerHTML = keys.map(k => {
    const item = items[k];
    const isCaptura = !!item._capturaId;
    const imgHtml = isCaptura && item.image
      ? `<img src="${item.image}" style="width:38px;height:38px;object-fit:contain;border-radius:6px;background:rgba(0,0,0,0.25);flex-shrink:0" onerror="this.style.display='none'" />`
      : '';
    const ballHtml = isCaptura && item._ballEmoji
      ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--gold);font-family:var(--font-mono)">${item._ballEmoji.replace('width:40px;height:40px','width:18px;height:18px')}</span>`
      : '';
    const itemTotalRaw = item.price ? item.price * cart[k] : 0;
    const priceBlock = itemTotalRaw > 0
      ? (() => {
          const unitData = formatKK(item.price);
          const totalData = formatKK(itemTotalRaw);
          return `<div class="cart-price-block">
            <span class="cart-price-kk">${totalData.label}</span>
            <span class="cart-price-brl">${totalData.brl}</span>
            <span style="font-family:var(--font-mono);font-size:10px;color:var(--muted)">unit: ${unitData.label}</span>
          </div>`;
        })()
      : '';
    return `<div class="cart-row">
      <div style="display:flex;align-items:center;gap:8px;min-width:0">
        ${imgHtml}
        <div style="min-width:0">
          <div class="cart-row-name" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">${item.name} ${ballHtml}</div>
        </div>
      </div>
      <div class="cart-row-right">
        ${priceBlock}
        <span class="cart-qty">×${cart[k].toLocaleString()}</span>
        <button class="rem-btn" onclick="removeFromCart(${k})">&#x2715;</button>
      </div>
    </div>`;
  }).join('');
}

// ===================== PAYMENT MODE =====================
let _payTotalKk = 0;  // total final em KK (após taxa)
let _payTotalBrl = 0; // total final em BRL
let _currentPayMode = 'kk';

function setPayMode(mode) {
  _currentPayMode = mode;
  document.querySelectorAll('.pay-mode-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.pay-mode-btn.' + mode).classList.add('active');
  document.querySelectorAll('.pay-block').forEach(b => b.classList.remove('active'));
  document.getElementById('pay-block-' + mode).classList.add('active');
  if (mode === 'mix') syncMixInputs();
}

function updatePayDisplay(totalKkRaw, totalFinalKkRaw, totalFinalBrl) {
  _payTotalKk  = totalFinalKkRaw;
  _payTotalBrl = totalFinalBrl;

  // KK block
  const kkData = formatKK(totalFinalKkRaw);
  document.getElementById('pay-kk-total').textContent    = kkData ? kkData.label : '—';
  document.getElementById('pay-kk-brl-hint').textContent = kkData ? 'equivale a ' + kkData.brl : '';

  // BRL block
  const brlStr = (totalFinalBrl).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const kkHint = kkData ? kkData.label + ' KK' : '—';
  document.getElementById('pay-brl-total').textContent    = brlStr;
  document.getElementById('pay-brl-kk-hint').textContent  = 'equivale a ' + kkHint;

  // Mix: reset inputs quando o total muda
  if (_currentPayMode === 'mix') syncMixInputs(true);
  else {
    document.getElementById('mix-kk-input').value  = '';
    document.getElementById('mix-brl-input').value = '';
    document.getElementById('mix-balance').textContent = 'Preencha os valores acima';
    document.getElementById('mix-balance').className   = 'pay-mix-balance';
  }
}

function syncMixInputs(reset) {
  if (reset) {
    document.getElementById('mix-kk-input').value  = '';
    document.getElementById('mix-brl-input').value = '';
    document.getElementById('mix-balance').textContent = 'Preencha os valores acima';
    document.getElementById('mix-balance').className   = 'pay-mix-balance';
  }
}

function onMixKkChange(val) {
  const kkPaid  = Math.max(0, parseFloat(val) || 0);
  // kk inserido é em unidades de kk (ex: 5 = 5kk = 5_000_000)
  const kkPaidRaw = kkPaid * 1000000;
  const remaining = _payTotalBrl - (kkPaidRaw / 1000000 * 1.70);
  const brlLeft = Math.max(0, _payTotalBrl - (kkPaidRaw / 1000000 * 1.70));
  // Atualiza campo BRL
  document.getElementById('mix-brl-input').value = brlLeft > 0 ? brlLeft.toFixed(2) : '0.00';
  updateMixBalance(kkPaidRaw, brlLeft);
}

function onMixBrlChange(val) {
  const brlPaid = Math.max(0, parseFloat(val) || 0);
  const brlLeft = Math.max(0, _payTotalBrl - brlPaid);
  // converte o restante em KK
  const kkLeft  = brlLeft / 1.70; // 1kk = R$1.70
  document.getElementById('mix-kk-input').value = kkLeft > 0 ? kkLeft.toFixed(4) : '0';
  updateMixBalance(kkLeft * 1000000, brlPaid);
}

function updateMixBalance(kkPaidRaw, brlPaid) {
  const totalPaidBrl = (kkPaidRaw / 1000000 * 1.70) + brlPaid;
  const diff = totalPaidBrl - _payTotalBrl;
  const el   = document.getElementById('mix-balance');
  const kkData = formatKK(kkPaidRaw);
  const brlStr = brlPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  if (Math.abs(diff) < 0.01) {
    el.textContent = '✓ Pagamento completo: ' + (kkData ? kkData.label + ' KK' : '0') + ' + ' + brlStr;
    el.className = 'pay-mix-balance ok';
  } else if (diff < 0) {
    const falta = Math.abs(diff).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    el.textContent = 'Falta ' + falta + ' para completar';
    el.className = 'pay-mix-balance';
  } else {
    const excesso = diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    el.textContent = 'Excedendo ' + excesso + ' do total';
    el.className = 'pay-mix-balance over';
  }
}

function removeFromCart(i) {
  delete cart[i];
  // Reseta botão adicionar
  const btn = document.getElementById('addbtn-' + i);
  const lbl = document.getElementById('addbtn-label-' + i);
  if (btn) { btn.classList.remove('added'); }
  if (lbl) { lbl.textContent = 'Adicionar'; }
  // Remove botão inline de remover, volta para span vazio
  const remBtn = document.getElementById('rembtn-' + i);
  if (remBtn && remBtn.tagName === 'BUTTON') {
    const span = document.createElement('span');
    span.id = 'rembtn-' + i;
    remBtn.replaceWith(span);
  }
  updateCartBadge();
  renderCart();
}

function clearCart() {
  Object.keys(cart).forEach(k => {
    const btn = document.getElementById('addbtn-' + k);
    const lbl = document.getElementById('addbtn-label-' + k);
    if (btn) { btn.classList.remove('added'); }
    if (lbl) { lbl.textContent = 'Adicionar'; }
    const remBtn = document.getElementById('rembtn-' + k);
    if (remBtn && remBtn.tagName === 'BUTTON') {
      const span = document.createElement('span');
      span.id = 'rembtn-' + k;
      remBtn.replaceWith(span);
    }
    delete cart[k];
  });
  // Reseta botões de pacote
  pkgCartCount = {};
  PACKAGES.forEach((_, pi) => {
    const pkgBtn = document.getElementById('pkgbtn-' + pi);
    const pkgLbl = document.getElementById('pkgbtn-label-' + pi);
    if (pkgBtn) { pkgBtn.classList.remove('added'); }
    if (pkgLbl) { pkgLbl.textContent = '+ Adicionar ao Carrinho'; }
    const pkgRemBtn = document.getElementById('pkgrem-' + pi);
    if (pkgRemBtn && pkgRemBtn.tagName === 'BUTTON') {
      const span = document.createElement('span');
      span.id = 'pkgrem-' + pi;
      pkgRemBtn.replaceWith(span);
    }
  });
  updateCartBadge();
  renderCart();
}

// ===================== TABS =====================
function switchTab(tab, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  btn.classList.add('active');
  if (tab === 'pacotes') renderPackages();
  if (tab === 'captura') renderCaptura();
  if (tab === 'wiki') renderWiki();
}

// ===================== WIKI =====================
let _wikiSearchTimer;
let _wikiRendered = false;

// Build wiki data from RAW_WIKI
function buildWikiData() {
  var seen = new Set();
  return RAW_WIKI.map(function(entry) {
    var name = entry[0];
    var sources = entry.slice(1).filter(function(s) { return s && s.trim() !== ''; });
    return { name: name, sources: sources };
  }).filter(function(item) {
    if (item.sources.length === 0) return false;
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });
}

function renderWiki() {
  var grid = document.getElementById('wiki-grid');
  if (!grid) return;
  var q = (document.getElementById('wiki-search') ? document.getElementById('wiki-search').value : '').toLowerCase().trim();
  var wikiItems = buildWikiData();

  var filtered = wikiItems.filter(function(item) {
    if (item.sources.length === 0) return false;
    if (!q) return true;
    return item.name.toLowerCase().includes(q) ||
           item.sources.some(function(s) { return s.toLowerCase().includes(q); });
  });

  document.getElementById('wiki-count-label').textContent = filtered.length + ' itens';

  if (!filtered.length) {
    grid.innerHTML = '<div class="wiki-no-results">Nenhum item encontrado.</div>';
    return;
  }

  grid.innerHTML = filtered.map(function(item, idx) {
    var sourcesLabel = item.sources.join(', ');
    var pokeCards = item.sources.map(function(pokeName) {
      var sprite = getShowdownSprite(pokeName);
      return '<div class="wiki-poke-card">' +
        '<img class="wiki-poke-sprite" src="' + sprite + '" alt="' + pokeName + '" ' +
        'onerror="this.src=\'https://play.pokemonshowdown.com/sprites/gen5/' + toShowdownName(pokeName) + '.png\'" />' +
        '<div class="wiki-poke-name">' + pokeName + '</div>' +
        '</div>';
    }).join('');

    return '<div class="wiki-row" id="wiki-row-' + idx + '">' +
      '<div class="wiki-row-header" onclick="toggleWikiRow(' + idx + ')">' +
        '<span class="wiki-row-num">' + (idx + 1) + '</span>' +
        '<span class="wiki-row-name">' + item.name + '</span>' +
        '<svg class="wiki-row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' +
      '</div>' +
      '<div class="wiki-row-panel">' + pokeCards + '</div>' +
    '</div>';
  }).join('');
}

function toggleWikiRow(idx) {
  var row = document.getElementById('wiki-row-' + idx);
  if (!row) return;
  var isOpen = row.classList.contains('open');
  // fecha todos
  document.querySelectorAll('.wiki-row.open').forEach(function(r) { r.classList.remove('open'); });
  // abre o clicado se estava fechado
  if (!isOpen) row.classList.add('open');
}

// ===================== WIKI SUB-TABS =====================
var _currentWikiTab = 'itens';
var _respawnSearchTimer, _questsSearchTimer;

function switchWikiTab(tab, btn) {
  _currentWikiTab = tab;
  // botões
  document.querySelectorAll('.wiki-subtab-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  // painéis
  document.querySelectorAll('.wiki-subtab-content').forEach(function(el) { el.style.display = 'none'; });
  var panel = document.getElementById('wiki-tab-' + tab);
  if (panel) panel.style.display = 'block';
  // renderiza a sub-aba
  if (tab === 'itens') renderWiki();
  if (tab === 'respawn') renderRespawn();
  if (tab === 'quests') renderQuests();
}

// ===================== DADOS DE RESPAWN =====================
// Estrutura: { name: 'NomePokemon', mapImg: 'URL ou null', location: 'Nome do Local' }
// Para adicionar um pokémon, adicione um objeto aqui:
var RAW_RESPAWN = [
  // Exemplo — remova ou edite conforme necessário:
  // { name: 'Bulbasaur', mapImg: null, location: 'Viridian Forest' },
  // { name: 'Charmander', mapImg: null, location: 'Mt. Ember' },
];

function renderRespawn() {
  var grid = document.getElementById('respawn-grid');
  if (!grid) return;
  var q = (document.getElementById('respawn-search') ? document.getElementById('respawn-search').value : '').toLowerCase().trim();

  var filtered = RAW_RESPAWN.filter(function(p) {
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || (p.location && p.location.toLowerCase().includes(q));
  });

  document.getElementById('respawn-count-label').textContent = filtered.length + ' Pokémon';

  if (!filtered.length) {
    grid.innerHTML = '<div class="wiki-empty-state"><span class="empty-icon">🗺️</span><span class="empty-label">Nenhum Pokémon de respawn cadastrado ainda.</span></div>';
    return;
  }

  grid.innerHTML = filtered.map(function(poke, idx) {
    var sprite = getShowdownSprite(poke.name);
    var fallback = 'https://play.pokemonshowdown.com/sprites/gen5/' + toShowdownName(poke.name) + '.png';
    var mapContent = poke.mapImg
      ? '<img class="respawn-map-img" src="' + poke.mapImg + '" alt="Mapa ' + poke.name + '" />'
      : '<div class="respawn-map-placeholder"><span class="placeholder-icon">🗺️</span><span>Mapa em breve</span></div>';
    var locationTag = poke.location
      ? '<div class="respawn-location-tag">📍 ' + poke.location + '</div>'
      : '';
    return '<div class="respawn-row" id="respawn-row-' + idx + '">' +
      '<div class="respawn-row-header" onclick="toggleRespawnRow(' + idx + ')">' +
        '<span class="respawn-row-num">' + (idx + 1) + '</span>' +
        '<img class="respawn-row-sprite" src="' + sprite + '" alt="' + poke.name + '" onerror="this.src=\'' + fallback + '\'" />' +
        '<span class="respawn-row-name">' + poke.name + '</span>' +
        '<svg class="respawn-row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' +
      '</div>' +
      '<div class="respawn-row-panel">' +
        '<div class="respawn-panel-inner">' +
          '<img class="respawn-sprite-big" src="' + sprite + '" alt="' + poke.name + '" onerror="this.src=\'' + fallback + '\'" />' +
          mapContent +
        '</div>' +
        locationTag +
      '</div>' +
    '</div>';
  }).join('');
}

function toggleRespawnRow(idx) {
  var row = document.getElementById('respawn-row-' + idx);
  if (!row) return;
  var isOpen = row.classList.contains('open');
  document.querySelectorAll('.respawn-row.open').forEach(function(r) { r.classList.remove('open'); });
  if (!isOpen) row.classList.add('open');
}

// ===================== DADOS DE QUESTS =====================
// Estrutura: { name: 'Nome da Quest', icon: '⚔️', description: 'Texto descritivo', img: 'URL ou null' }
// Para adicionar uma quest, adicione um objeto aqui:
var RAW_QUESTS = [
  // Exemplo — remova ou edite conforme necessário:
  // { name: 'A Grande Caçada', icon: '⚔️', description: 'Derrote 10 Pokémons selvagens na Viridian Forest.', img: null },
  // { name: 'Coletor de Itens', icon: '📦', description: 'Colete 5 Potions e leve ao NPC do Centro Pokémon.', img: null },
];

function renderQuests() {
  var grid = document.getElementById('quests-grid');
  if (!grid) return;
  var q = (document.getElementById('quests-search') ? document.getElementById('quests-search').value : '').toLowerCase().trim();

  var filtered = RAW_QUESTS.filter(function(quest) {
    if (!q) return true;
    return quest.name.toLowerCase().includes(q) || (quest.description && quest.description.toLowerCase().includes(q));
  });

  document.getElementById('quests-count-label').textContent = filtered.length + ' quests';

  if (!filtered.length) {
    grid.innerHTML = '<div class="wiki-empty-state"><span class="empty-icon">📜</span><span class="empty-label">Nenhuma quest cadastrada ainda.</span></div>';
    return;
  }

  grid.innerHTML = filtered.map(function(quest, idx) {
    var imgContent = quest.img
      ? '<img class="quest-image" src="' + quest.img + '" alt="Como fazer: ' + quest.name + '" />'
      : '<div class="quest-image-placeholder"><span class="placeholder-icon">🖼️</span><span>Imagem em breve</span></div>';
    return '<div class="quest-row" id="quest-row-' + idx + '">' +
      '<div class="quest-row-header" onclick="toggleQuestRow(' + idx + ')">' +
        '<span class="quest-row-num">' + (idx + 1) + '</span>' +
        '<span class="quest-row-icon">' + (quest.icon || '📜') + '</span>' +
        '<span class="quest-row-name">' + quest.name + '</span>' +
        '<svg class="quest-row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' +
      '</div>' +
      '<div class="quest-row-panel">' +
        '<p class="quest-description">' + (quest.description || '') + '</p>' +
        imgContent +
      '</div>' +
    '</div>';
  }).join('');
}

function toggleQuestRow(idx) {
  var row = document.getElementById('quest-row-' + idx);
  if (!row) return;
  var isOpen = row.classList.contains('open');
  document.querySelectorAll('.quest-row.open').forEach(function(r) { r.classList.remove('open'); });
  if (!isOpen) row.classList.add('open');
}

// Correções de nome: chave = como está no dado, valor = nome correto do Showdown
var SHOWDOWN_NAME_FIXES = {
  'grambull': 'granbull',
  'politoad': 'politoed',
};

function toShowdownName(name) {
  var n = name
    .replace(/^shiny\s+/i, '')
    .replace(/['']/g, '')
    .replace(/[éèê]/g, 'e')
    .toLowerCase()
    .trim();

  // Aplica correções manuais de nome
  if (SHOWDOWN_NAME_FIXES[n]) n = SHOWDOWN_NAME_FIXES[n];

  // Mega Charizard X → charizard-mega-x
  // Mega Charizard Y → charizard-mega-y
  // Mega Heracross   → heracross-mega
  var megaXY = n.match(/^mega\s+(.+?)\s+(x|y)$/);
  if (megaXY) return megaXY[1].replace(/\s+/g, '') + '-mega-' + megaXY[2];

  var megaBase = n.match(/^mega\s+(.+)$/);
  if (megaBase) return megaBase[1].replace(/\s+/g, '') + '-mega';

  return n.replace(/\s+/g, '');
}

function getShowdownSprite(pokeName) {
  var isShiny = /^shiny\s+/i.test(pokeName);
  var n = toShowdownName(pokeName);
  return isShiny
    ? 'https://play.pokemonshowdown.com/sprites/ani-shiny/' + n + '.gif'
    : 'https://play.pokemonshowdown.com/sprites/ani/' + n + '.gif';
}

function getShowdownStaticSprite(pokeName) {
  var isShiny = /^shiny\s+/i.test(pokeName);
  var n = toShowdownName(pokeName);
  return isShiny
    ? 'https://play.pokemonshowdown.com/sprites/dex-shiny/' + n + '.png'
    : 'https://play.pokemonshowdown.com/sprites/dex/' + n + '.png';
}


// ===================== PACOTES — LAYOUT RPG =====================
let currentPkg = null;
let currentPkgState = [];
let activePkgIdx = null;
// pkgCartCount já declarado globalmente acima

// Ícones por tipo de pacote (heurística pelo nome)
function getPkgIcon(name) {
  const img = (url) => `<img src="${url}" style="width:40px;height:40px;object-fit:contain" />`;
  const n = name.toLowerCase();
  // Gym e Reduces primeiro (mais especificos, evita conflito com water/speed)
  if (n.startsWith('reduces') || n.startsWith('reduce')) return img('https://i.imgur.com/zpRe43i.png');
  if (n.includes('viridian'))  return img('https://i.imgur.com/AvX9Hbj.png');
  if (n.includes('cinnabar'))  return img('https://i.imgur.com/RsJe7OO.png');
  if (n.includes('pewter'))    return img('https://i.imgur.com/ViA3uQO.png');
  if (n.includes('cerulean'))  return img('https://i.imgur.com/uCRmZvq.png');
  if (n.includes('vermilion')) return img('https://i.imgur.com/GEfwZ4B.png');
  if (n.includes('celadon'))   return img('https://i.imgur.com/ocPJIHg.png');
  if (n.includes('fuchsia'))   return img('https://i.imgur.com/i8U2tWd.png');
  if (n.includes('saffron'))   return img('https://i.imgur.com/dzVfRLq.png');
  if (n.startsWith('gym'))     return img('https://i.imgur.com/XyBY6d2.png');
  if (n.includes('speed'))                        return img('https://i.imgur.com/ODTCGEc.gif');
  if (n.includes('hp'))                           return img('https://i.imgur.com/QhZ8LL5.gif');
  if (n.includes('water'))                        return img('https://i.imgur.com/zpRe43i.png');
  if (n.includes('steel') || n.includes('metal')) return img('https://i.imgur.com/GleRjiM.png');
  if (n.includes('rock'))                         return img('https://i.imgur.com/GvD1Mtq.png');
  if (n.includes('psychic'))                      return img('https://i.imgur.com/ASiZi1K.png');
  if (n.includes('poison'))                       return img('https://i.imgur.com/xfX0ReE.png');
  if (n.includes('normal'))                       return img('https://i.imgur.com/w2ChsIe.png');
  if (n.includes('ice'))                          return img('https://i.imgur.com/ssFz0sA.png');
  if (n.includes('ground'))                       return img('https://i.imgur.com/JPcD2l3.png');
  if (n.includes('fire'))                         return img('https://i.imgur.com/O8TONGE.png');
  if (n.includes('grass'))                        return img('https://i.imgur.com/YjKxtoE.png');
  if (n.includes('electric'))                     return img('https://i.imgur.com/Yv2WEYc.png');
  if (n.includes('dark'))                         return img('https://i.imgur.com/7Luj4az.png');
  if (n.includes('dragon'))                       return img('https://i.imgur.com/o7JWbaN.png');
  if (n.includes('ghost'))                        return img('https://i.imgur.com/HuybbPn.png');
  if (n.includes('fairy'))                        return img('https://i.imgur.com/j3HaXTh.png');
  if (n.includes('flying'))                       return img('https://i.imgur.com/npGjQae.png');
  if (n.includes('bug'))                          return img('https://i.imgur.com/V4IXR51.png');
  if (n.includes('fighting') || n.includes('figthing')) return img('https://i.imgur.com/OKsJXh7.png');
  return img('https://i.imgur.com/zpRe43i.png');
}

function getPkgItemData(itemName) {
  return items.find(i => i.name.toLowerCase() === itemName.toLowerCase()) || null;
}

function getPkgAllItems(pkg) {
  return (pkg.slots || []).flat();
}
function getPkgTotal(pkg, pi) {
  const src = (pi !== undefined) ? getPkgActiveItems(pkg, pi) : getPkgAllItems(pkg);
  return src.reduce((sum, [name, qty]) => {
    const item = getPkgItemData(name);
    return sum + (item && item.price ? item.price * qty : 0);
  }, 0);
}

// Categoria ativa na sidebar de pacotes
let activePkgCat = 'all';

function getPkgCategory(name) {
  const n = name.toLowerCase();
  if (n.startsWith('talent')) return 'talent';
  if (n.startsWith('gym'))    return 'gym';
  if (n.startsWith('full'))   return 'full';
  if (n.startsWith('reduces') || n.startsWith('reduce')) return 'reduces';
  return 'outros';
}

const PKG_CAT_META = {
  all:     { label: 'Todos',    icon: '📦' },
  talent:  { label: 'Talents',  icon: '✨' },
  gym:     { label: 'Gym',      icon: '<img src="https://i.imgur.com/XyBY6d2.png" style="width:20px;height:20px;object-fit:contain" />' },
  full:    { label: 'Full',     icon: '⚡' },
  reduces: { label: 'Reduces',  icon: '<img src="https://i.imgur.com/KgwwD7D.png" style="width:20px;height:20px;object-fit:contain" />' },
  outros:  { label: 'Outros',   icon: '🎲' },
};

function renderPkgCatTabs() {
  const el = document.getElementById('pkg-cat-tabs');
  if (!el) return;
  // Descobrir quais categorias existem
  const cats = ['all', ...new Set(PACKAGES.map(p => getPkgCategory(p.name)))];
  el.innerHTML = cats.map(cat => {
    const count = cat === 'all' ? PACKAGES.length : PACKAGES.filter(p => getPkgCategory(p.name) === cat).length;
    const meta = PKG_CAT_META[cat] || { label: cat, icon: '📌' };
    return `<button class="pkg-cat-btn${activePkgCat === cat ? ' active' : ''}" onclick="selectPkgCat('${cat}')">
      <span class="pkg-cat-icon">${meta.icon}</span>
      ${meta.label}
      <span class="pkg-cat-count">${count}</span>
    </button>`;
  }).join('');
}

function selectPkgCat(cat) {
  activePkgCat = cat;
  // Se pacote ativo não pertence à nova categoria, deseleciona
  if (activePkgIdx !== null && cat !== 'all') {
    if (getPkgCategory(PACKAGES[activePkgIdx].name) !== cat) {
      activePkgIdx = null;
      document.getElementById('pkg-detail').innerHTML = `
        <div class="pkg-detail-empty" id="pkg-detail-empty">
          <div class="pkg-detail-empty-icon">📋</div>
          <div class="pkg-detail-empty-text">Selecione um pacote</div>
        </div>`;
    }
  }
  renderPackages();
}

function renderPackages() {
  const sidebarList = document.getElementById('pkg-sidebar-list');
  if (!sidebarList) return;

  renderPkgCatTabs();

  if (!PACKAGES.length) {
    sidebarList.innerHTML = '<div style="padding:16px;font-family:var(--font-mono);font-size:11px;color:var(--muted);text-align:center">Nenhum pacote</div>';
    return;
  }

  const filtered = PACKAGES.map((pkg, pi) => ({ pkg, pi }))
    .filter(({ pkg }) => activePkgCat === 'all' || getPkgCategory(pkg.name) === activePkgCat);

  sidebarList.innerHTML = filtered.map(({ pkg, pi }) => {
    const icon = getPkgIcon(pkg.name);
    const isActive = activePkgIdx === pi;
    const added = pkgCartCount && pkgCartCount[pi] ? pkgCartCount[pi] : 0;
    const glowClass = added ? ' is-in-cart' : '';
    return `<div class="pkg-sidebar-item${isActive ? ' active' : ''}${glowClass}" onclick="selectPkg(${pi})">
      ${added ? `<div class="pkg-card-cart-badge">✓ ×${added}</div>` : ''}
      <div class="pkg-sidebar-item-icon">${icon}</div>
      <div class="pkg-sidebar-item-info">
        <div class="pkg-sidebar-item-name">${pkg.name}</div>
        <div class="pkg-sidebar-item-sub">${getPkgAllItems(pkg).length} ${getPkgAllItems(pkg).length === 1 ? 'item' : 'itens'}</div>
      </div>
    </div>`;
  }).join('');

  if (activePkgIdx !== null) renderPkgDetail(activePkgIdx);
}

function selectPkg(pi) {
  activePkgIdx = pi;
  renderPackages();
  renderPkgDetail(pi);
}

// Slot ativo por pacote
const activeSlotByPkg = {};
// disabledPkgItems[pi] = Set de chaves "si:itemName" desativados
const disabledPkgItems = {};

function pkgItemKey(si, name) { return si + ':' + name; }

function isPkgItemDisabled(pi, si, name) {
  return disabledPkgItems[pi] && disabledPkgItems[pi].has(pkgItemKey(si, name));
}

function togglePkgItem(pi, si, name) {
  if (!disabledPkgItems[pi]) disabledPkgItems[pi] = new Set();
  const key = pkgItemKey(si, name);
  if (disabledPkgItems[pi].has(key)) disabledPkgItems[pi].delete(key);
  else disabledPkgItems[pi].add(key);
  renderPkgDetail(pi);
}

function getPkgActiveItems(pkg, pi) {
  // Retorna apenas itens não desativados de todos os slots
  return (pkg.slots || []).flatMap((slot, si) =>
    slot.filter(([name]) => !isPkgItemDisabled(pi, si, name))
  );
}

function getSlotLabel(pkg, si) {
  const n = pkg.name.toLowerCase();
  if (n.includes('talent')) return 'Talent ' + (si + 1);
  if (n.includes('gym'))    return 'Slot ' + (si + 1);
  if (n.includes('full'))   return 'Slot ' + (si + 1);
  return 'Slot ' + (si + 1);
}

function renderPkgDetail(pi) {
  const detail = document.getElementById('pkg-detail');
  const pkg = PACKAGES[pi];
  const totalRaw = getPkgTotal(pkg, pi);
  const totalData = totalRaw > 0 ? formatKK(totalRaw) : null;
  const added = pkgCartCount && pkgCartCount[pi] ? pkgCartCount[pi] : 0;
  const allItems = getPkgAllItems(pkg);
  const slots = pkg.slots || [allItems];
  const hasSlots = slots.length > 1;

  if (activeSlotByPkg[pi] === undefined) activeSlotByPkg[pi] = 0;
  const si = Math.min(activeSlotByPkg[pi], slots.length - 1);
  const currentSlot = slots[si];

  // Slot tabs — mostra preço só dos itens ativos do slot
  const slotTabsHtml = hasSlots ? `
    <div class="pkg-slot-tabs" id="pkg-slot-tabs-${pi}">
      ${slots.map((slot, idx) => {
        const slotTotal = slot.reduce((s, [n, q]) => {
          if (isPkgItemDisabled(pi, idx, n)) return s;
          const it = getPkgItemData(n);
          return s + (it && it.price ? it.price * q : 0);
        }, 0);
        const slotData = slotTotal > 0 ? formatKK(slotTotal) : null;
        const disabledCount = slot.filter(([n]) => isPkgItemDisabled(pi, idx, n)).length;
        const noPriceCount = slot.filter(([n]) => {
          if (isPkgItemDisabled(pi, idx, n)) return false;
          const it = getPkgItemData(n);
          return !it || !it.price;
        }).length;
        const noPriceWarn = noPriceCount > 0
          ? `<span class="pkg-slot-no-price-warn">⚠ ${noPriceCount} s/preço</span>`
          : '';
        const hasNoPriceCls = noPriceCount > 0 ? ' has-no-price' : '';
        return `<button class="pkg-slot-btn${idx === si ? ' active' : ''}${disabledCount === slot.length ? ' all-disabled' : ''}${hasNoPriceCls}" onclick="selectPkgSlot(${pi}, ${idx})">
          <span class="pkg-slot-btn-label">${getSlotLabel(pkg, idx)}</span>
          ${slotData ? `<span class="pkg-slot-btn-price">${slotData.label}</span>` : ''}
          <span class="pkg-slot-btn-count">${slot.length - disabledCount}/${slot.length} itens</span>
          ${noPriceWarn}
        </button>`;
      }).join('')}
    </div>` : '';

  // Rows — clicáveis para ativar/desativar
  const rowsHtml = currentSlot.map(([name, qty]) => {
    const disabled = isPkgItemDisabled(pi, si, name);
    const item = getPkgItemData(name);
    const lineTotal = !disabled && item && item.price && qty > 0 ? item.price * qty : 0;
    const priceData = lineTotal > 0 ? formatKK(lineTotal) : null;
    return `<div class="pkg-detail-row${disabled ? ' row-disabled' : ''}" onclick="togglePkgItem(${pi}, ${si}, '${name.replace(/'/g,"\'")}')">
      <div class="pkg-detail-row-icon">${disabled ? '○' : '◆'}</div>
      <span class="pkg-detail-row-name">${name}<button class="wiki-lookup-btn" onclick="openWikiLookup('${name.replace(/'/g,"\\'")}', event)" title="Ver drops na Wiki"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></button></span>
      <div class="pkg-detail-row-right">
        <span class="pkg-detail-row-price">${disabled ? '<span class="row-disabled-label">removido</span>' : (priceData ? priceData.label : '—')}</span>
        <span class="pkg-detail-row-qty">×${qty.toLocaleString()}</span>
        <span class="pkg-row-toggle-btn">${disabled ? '↩' : '✕'}</span>
      </div>
    </div>`;
  }).join('');

  const addedClass = added ? ' added' : '';
  const addedLabel = added ? `✓ Adicionado ×${added}` : '+ Adicionar ao Carrinho';
  const activeCount = getPkgActiveItems(pkg, pi).length;
  const totalCount = allItems.length;
  const countLabel = activeCount < totalCount
    ? `${activeCount}/${totalCount} itens ativos · ${slots.length} ${slots.length === 1 ? 'slot' : 'slots'}`
    : `${totalCount} itens · ${slots.length} ${slots.length === 1 ? 'slot' : 'slots'}`;

  detail.innerHTML = `
    <div class="pkg-detail-header">
      <div class="pkg-detail-title">${pkg.name}</div>
      <div class="pkg-detail-meta">
        <span class="pkg-detail-count">${countLabel}</span>
        ${totalData ? `<span class="pkg-detail-price">${totalData.label} · ${totalData.brl}</span>` : ''}
      </div>
    </div>
    ${slotTabsHtml}
    <div class="pkg-detail-body" id="pkg-detail-body-${pi}">${rowsHtml}</div>
    <div class="pkg-detail-footer">
      <div class="pkg-detail-total-block">
        ${totalData ? `
          <span class="pkg-detail-total-label">Total ativo</span>
          <span class="pkg-detail-total-kk">${totalData.label}</span>
          <span class="pkg-detail-total-brl">${totalData.brl}</span>
        ` : '<span class="pkg-detail-total-label" style="color:var(--muted)">preço não definido</span>'}
      </div>
      <div id="pkgrem-detail-${pi}"></div>
      <button class="pkg-detail-add-btn${addedClass}" id="pkgbtn-detail-${pi}" onclick="addPackageToCartDirect(${pi})">
        ${addedLabel}
      </button>
    </div>`;

  if (added) {
    const remSlot = document.getElementById('pkgrem-detail-' + pi);
    if (remSlot) {
      remSlot.innerHTML = `<button class="pkg-detail-rem-btn" onclick="removePackageFromCart(${pi})" title="Remover do carrinho">✕</button>`;
    }
  }
}

function selectPkgSlot(pi, si) {
  activeSlotByPkg[pi] = si;
  renderPkgDetail(pi);
}

function openPkgModal(pi) {
  // Compatibilidade — agora abre inline
  selectPkg(pi);
}

function renderPkgModalRows() {
  // Mantido para compatibilidade
  if (activePkgIdx !== null) renderPkgDetail(activePkgIdx);
}

function updatePkgQty(idx, val) {
  const qty = Math.max(0, parseInt(val, 10) || 0);
  currentPkgState[idx].qty = qty;
  const item = getPkgItemData(currentPkgState[idx].name);
  const lineTotal = item && item.price && qty > 0 ? item.price * qty : 0;
  const priceEl = document.getElementById('pkg-price-' + idx);
  if (priceEl) priceEl.textContent = lineTotal > 0 ? formatKK(lineTotal).label : '—';
  updatePkgTotal();
}

function removePkgItem(idx) {
  currentPkgState[idx].qty = 0;
  const row = document.getElementById('pkg-row-' + idx);
  if (row) row.classList.add('removed');
  const priceEl = document.getElementById('pkg-price-' + idx);
  if (priceEl) priceEl.textContent = '—';
  updatePkgTotal();
}

function updatePkgTotal() {
  let totalRaw = 0;
  currentPkgState.forEach(entry => {
    const item = getPkgItemData(entry.name);
    if (item && item.price && entry.qty > 0) totalRaw += item.price * entry.qty;
  });
  const totalBlock = document.getElementById('pkg-modal-total');
  if (totalBlock) {
    if (totalRaw > 0) {
      const td = formatKK(totalRaw);
      const kkEl = document.getElementById('pkg-modal-kk');
      const brlEl = document.getElementById('pkg-modal-brl');
      if (kkEl) kkEl.textContent = td.label;
      if (brlEl) brlEl.textContent = td.brl;
      totalBlock.style.display = 'flex';
    } else {
      totalBlock.style.display = 'none';
    }
  }
}

function closePkgModal() {
  const overlay = document.getElementById('pkg-overlay');
  if (overlay) overlay.classList.remove('open');
  currentPkg = null;
  currentPkgState = [];
}

function handlePkgOverlayClick(e) {
  if (e.target === document.getElementById('pkg-overlay')) closePkgModal();
}

function addPackageToCart() {
  if (currentPkg === null) return;
  currentPkgState.forEach(entry => {
    if (!entry.qty || entry.qty <= 0) return;
    const idx = items.findIndex(i => i.name.toLowerCase() === entry.name.toLowerCase());
    if (idx === -1) return;
    cart[idx] = (cart[idx] || 0) + entry.qty;
  });
  updateCartBadge();
  closePkgModal();
}

function addPackageToCartDirect(pi) {
  pkgCartCount = pkgCartCount || {};
  pkgCartCount[pi] = (pkgCartCount[pi] || 0) + 1;

  let noPriceNames = [];
  getPkgActiveItems(PACKAGES[pi], pi).forEach(([name, qty]) => {
    if (!qty || qty <= 0) return;
    const idx = items.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
    if (idx === -1) return;
    cart[idx] = (cart[idx] || 0) + qty;
    if (!items[idx].price) noPriceNames.push(name);
    const btn = document.getElementById('addbtn-' + idx);
    const lbl = document.getElementById('addbtn-label-' + idx);
    if (btn) btn.classList.add('added');
    if (lbl) lbl.textContent = '\u2713 ' + cart[idx].toLocaleString();
    const remSlot = document.getElementById('rembtn-' + idx);
    if (remSlot && remSlot.tagName === 'SPAN') {
      const remBtn = document.createElement('button');
      remBtn.className = 'inline-rem-btn';
      remBtn.id = 'rembtn-' + idx;
      remBtn.title = 'Remover do carrinho';
      remBtn.innerHTML = '\u2715';
      remBtn.onclick = () => removeFromCart(idx);
      remSlot.replaceWith(remBtn);
    }
  });

  if (noPriceNames.length > 0) {
    const toast = document.getElementById('no-price-toast');
    const msg = document.getElementById('no-price-toast-msg');
    if (toast && msg) {
      msg.textContent = 'O pacote contém ' + noPriceNames.length + ' item(ns) sem preço definido: ' + noPriceNames.join(', ') + '. O total será ajustado quando os preços forem estabelecidos.';
      toast.classList.add('show');
      clearTimeout(_toastTimer);
      _toastTimer = setTimeout(() => toast.classList.remove('show'), 6000);
    }
  }
  updateCartBadge();

  // Atualiza detalhe inline
  if (activePkgIdx === pi) renderPkgDetail(pi);
  renderPackages();
}

function removePackageFromCart(pi) {
  pkgCartCount = pkgCartCount || {};
  getPkgAllItems(PACKAGES[pi]).forEach(([name]) => {
    const idx = items.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
    if (idx === -1) return;
    delete cart[idx];
    const btn = document.getElementById('addbtn-' + idx);
    const lbl = document.getElementById('addbtn-label-' + idx);
    if (btn) { btn.classList.remove('added'); }
    if (lbl) { lbl.textContent = 'Adicionar'; }
    const remBtn = document.getElementById('rembtn-' + idx);
    if (remBtn && remBtn.tagName === 'BUTTON') {
      const span = document.createElement('span');
      span.id = 'rembtn-' + idx;
      remBtn.replaceWith(span);
    }
  });
  delete pkgCartCount[pi];
  updateCartBadge();
  if (document.getElementById('cart-overlay').classList.contains('open')) {
    renderCart();
  }
  // Atualiza detalhe inline se estiver visível
  if (activePkgIdx === pi) renderPkgDetail(pi);
  renderPackages();
}

// ===================== VISUAL FX =====================


// --- Click Ripple + Sparks ---
(function() {
  const root = document.getElementById('ripple-root');
  const COLORS = ['rgba(58,140,255,0.7)','rgba(240,180,41,0.7)','rgba(96,170,255,0.7)','rgba(255,209,102,0.6)'];
  document.addEventListener('click', e => {
    const x = e.clientX, y = e.clientY;
    const col = COLORS[Math.floor(Math.random()*COLORS.length)];
    // Main ripple
    const r = document.createElement('div');
    r.className = 'click-ripple';
    const sz = 120 + Math.random()*80;
    Object.assign(r.style, {
      left: x+'px', top: y+'px',
      width: sz+'px', height: sz+'px',
      background: `radial-gradient(circle, ${col} 0%, transparent 70%)`,
      border: `1.5px solid ${col}`
    });
    root.appendChild(r);
    setTimeout(() => r.remove(), 700);
    // Sparks
    const numSparks = 8 + Math.floor(Math.random()*6);
    for (let i = 0; i < numSparks; i++) {
      const s = document.createElement('div');
      s.className = 'click-sparks';
      const angle = (i / numSparks) * Math.PI * 2;
      const dist  = 30 + Math.random() * 50;
      const tx    = Math.cos(angle) * dist;
      const ty    = Math.sin(angle) * dist;
      const sz2   = 2 + Math.random()*3;
      Object.assign(s.style, {
        left: x+'px', top: y+'px',
        width: sz2+'px', height: sz2+'px',
        background: col,
        borderRadius: '50%',
        transition: `transform 0.5s ease-out, opacity 0.5s ease-out`
      });
      root.appendChild(s);
      requestAnimationFrame(() => {
        s.style.transform = `translate(${tx}px, ${ty}px) scale(0)`;
        s.style.opacity   = '0';
      });
      setTimeout(() => s.remove(), 550);
    }
  });
})();

// --- Card 3D Tilt REMOVIDO (causava jank: getBoundingClientRect em todos os cards a cada mousemove) ---
// Shine div ainda é injetado para o efeito CSS funcionar
(function() {
  function injectShine() {
    document.querySelectorAll('.card:not([data-shine])').forEach(function(card) {
      card.setAttribute('data-shine','1');
      var shine = document.createElement('div');
      shine.className = 'card-shine';
      card.appendChild(shine);
    });
  }
  var obs = new MutationObserver(injectShine);
  obs.observe(document.getElementById('grid'), { childList: true, subtree: true });
  var pkgSidebar = document.getElementById('pkg-sidebar-list');
  if (pkgSidebar) obs.observe(pkgSidebar, { childList: true, subtree: true });
  var capturaGrid = document.getElementById('captura-grid');
  if (capturaGrid) obs.observe(capturaGrid, { childList: true, subtree: true });
  injectShine();
})();


// --- WebGL plasma shader REMOVIDO (causava jank no scroll) ---
(function() {
  var canvas = document.getElementById('shader-canvas');
  if (canvas) canvas.style.display = 'none';
})();

// --- Floating ambient particles REMOVIDAS (causavam repaint constante) ---

// --- Add burst animation on addToCart ---
const _origAddToCart = addToCart;
addToCart = function(i) {
  _origAddToCart(i);
  const card = document.querySelector(`#addbtn-${i}`)?.closest('.card');
  if (card) { card.classList.remove('burst'); void card.offsetWidth; card.classList.add('burst'); }
};

// ===================== CAPTURA =====================
// Formato: { name: "Nome", price: <raw kk igual RAW>, image: "url" }
// Exemplos de preço: 1000000 = 1kk | 5000000 = 5kk | 500000 = 500k | 0 = sem preço
const POKEMONS = [
{ name: "Shiny Ampharos",    price: 38000000,  tag: "t1",         image: "https://i.imgur.com/DecvtNB.gif", bannerImage: "https://i.imgur.com/Yv2WEYc.png" },
{ name: "Shiny Arbok",       price: 5000000,   tag: "t3",         image: "https://i.imgur.com/Lx8tTwy.gif", bannerImage: "https://i.imgur.com/xfX0ReE.png" },
{ name: "Shiny Ariados",     price: 5000000,   tag: "t3",         image: "https://i.imgur.com/4qVdNjM.gif", bannerImage: "https://i.imgur.com/V4IXR51.png" },
{ name: "Shiny Bellossom",   price: 5000000,   tag: "t3",         image: "https://i.imgur.com/vo0GY2X.gif", bannerImage: "https://i.imgur.com/YjKxtoE.png" },
{ name: "Shiny Blastoise",   price: 38000000,  tag: "t1",         image: "https://i.imgur.com/9iQ7wNL.gif", bannerImage: "https://i.imgur.com/zpRe43i.png" },
{ name: "Shiny Charizard", price: 38000000, tag: "t1", image: "https://i.imgur.com/SrQU5gi.gif", bannerImage: "https://i.imgur.com/O8TONGE.png" },
{ name: "Shiny Crobat",      price: 10000000,   tag: "t2",         image: "https://i.imgur.com/agzGxZH.gif", bannerImage: "https://i.imgur.com/npGjQae.png" },
{ name: "Shiny Donphan",     price: 10000000,   tag: "t2",         image: "https://i.imgur.com/9xd9h6l.gif", bannerImage: "https://i.imgur.com/JPcD2l3.png" },
{ name: "Shiny Dugtrio",     price: 5000000,   tag: "t3",         image: "https://i.imgur.com/F9jJz0e.gif", bannerImage: "https://i.imgur.com/JPcD2l3.png" },
{ name: "Shiny Dusknoir",    price: 170000000, tag: "super-raro", image: "https://i.imgur.com/A0bWaq4.gif", bannerImage: "https://i.imgur.com/HuybbPn.png" },
{ name: "Shiny Espeon",      price: 42000000,  tag: "t1",         image: "https://i.imgur.com/Zws7DJo.gif", bannerImage: "https://i.imgur.com/ASiZi1K.png" },
{ name: "Shiny Exeggutor",   price: 10000000,   tag: "t2",         image: "https://i.imgur.com/OpvTaP1.gif", bannerImage: "https://i.imgur.com/YjKxtoE.png" },
{ name: "Shiny Farfetch'd",  price: 38000000,  tag: "t1",         image: "https://i.imgur.com/Vo6volA.gif", bannerImage: "https://i.imgur.com/npGjQae.png" },
{ name: "Shiny Fearow",      price: 5000000,   tag: "t3",         image: "https://i.imgur.com/wNR2Ija.gif", bannerImage: "https://i.imgur.com/npGjQae.png" },
{ name: "Shiny Feraligatr",  price: 38000000,  tag: "t1",         image: "https://i.imgur.com/DP4YWT1.gif", bannerImage: "https://i.imgur.com/zpRe43i.png" },
{ name: "Shiny Flareon",     price: 38000000,  tag: "t1",         image: "https://i.imgur.com/9UowZtR.gif", bannerImage: "https://i.imgur.com/O8TONGE.png" },
{ name: "Shiny Florges",     price: 170000000, tag: "super-raro", image: "https://i.imgur.com/fynxTta.gif", bannerImage: "https://i.imgur.com/j3HaXTh.png" },
{ name: "Shiny Golem",       price: 38000000,  tag: "t1",         image: "https://i.imgur.com/6Wphle1.gif", bannerImage: "https://i.imgur.com/GvD1Mtq.png" },
{ name: "Shiny Grambull",    price: 10000000,   tag: "t2",         image: "https://i.imgur.com/lPlawhM.gif", bannerImage: "https://i.imgur.com/j3HaXTh.png" },
{ name: "Shiny Hitmonchan",  price: 38000000,  tag: "t1",         image: "https://i.imgur.com/5XHDbmn.gif", bannerImage: "https://i.imgur.com/OKsJXh7.png" },
{ name: "Shiny Hitmonlee",   price: 38000000,  tag: "t1",         image: "https://i.imgur.com/uzewWkj.gif", bannerImage: "https://i.imgur.com/OKsJXh7.png" },
{ name: "Shiny Hitmontop",   price: 38000000,  tag: "t1",         image: "https://i.imgur.com/YWsKw3O.gif", bannerImage: "https://i.imgur.com/OKsJXh7.png" },
{ name: "Shiny Jolteon",     price: 38000000,  tag: "t1",         image: "https://i.imgur.com/3Jc5ZUX.gif", bannerImage: "https://i.imgur.com/Yv2WEYc.png" },
{ name: "Shiny Jynx",        price: 38000000,  tag: "t1",         image: "https://i.imgur.com/VNGVJBo.gif", bannerImage: "https://i.imgur.com/ssFz0sA.png" },
{ name: "Shiny Luxray",      price: 170000000, tag: "super-raro", image: "https://i.imgur.com/sWnyJd1.gif", bannerImage: "https://i.imgur.com/Yv2WEYc.png" },
{ name: "Shiny Magneton",    price: 10000000,   tag: "t2",         image: "https://i.imgur.com/ZcDUckg.gif", bannerImage: "https://i.imgur.com/GleRjiM.png" },
{ name: "Shiny Meganium",    price: 38000000,  tag: "t1",         image: "https://i.imgur.com/eJvTQJ7.gif", bannerImage: "https://i.imgur.com/YjKxtoE.png" },
{ name: "Shiny Nidoking",    price: 38000000,  tag: "t1",         image: "https://i.imgur.com/xeDriFy.gif", bannerImage: "https://i.imgur.com/xfX0ReE.png" },
{ name: "Shiny Nidoqueen",   price: 38000000,  tag: "t1",         image: "https://i.imgur.com/iIMkTqF.gif", bannerImage: "https://i.imgur.com/JPcD2l3.png" },
{ name: "Shiny Ninetales",   price: 38000000,  tag: "t1",         image: "https://i.imgur.com/u0sGCqg.gif", bannerImage: "https://i.imgur.com/O8TONGE.png" },
{ name: "Shiny Pidgeot",     price: 38000000,  tag: "t1",         image: "https://i.imgur.com/pHY01e0.gif", bannerImage: "https://i.imgur.com/npGjQae.png" },
{ name: "Shiny Politoad",    price: 38000000,  tag: "t1",         image: "https://i.imgur.com/yLbIDLz.gif", bannerImage: "https://i.imgur.com/zpRe43i.png" },
{ name: "Shiny Poliwrath",   price: 38000000,  tag: "t1",         image: "https://i.imgur.com/W6WAMQH.gif", bannerImage: "https://i.imgur.com/OKsJXh7.png" },
{ name: "Shiny Primeape",    price: 5000000,   tag: "t3",         image: "https://i.imgur.com/14eRtXp.gif", bannerImage: "https://i.imgur.com/OKsJXh7.png" },
{ name: "Shiny Raichu",      price: 38000000,  tag: "t1",         image: "https://i.imgur.com/EbsLav0.gif", bannerImage: "https://i.imgur.com/Yv2WEYc.png" },
{ name: "Shiny Rhydon",      price: 10000000,   tag: "t2",         image: "https://i.imgur.com/N0xE5Jd.gif", bannerImage: "https://i.imgur.com/JPcD2l3.png" },
{ name: "Shiny Sandslash",   price: 5000000,   tag: "t3",         image: "https://i.imgur.com/KXpdDgh.gif", bannerImage: "https://i.imgur.com/JPcD2l3.png" },
{ name: "Shiny Starmie",     price: 10000000,   tag: "t2",         image: "https://i.imgur.com/y0z0Tkt.gif", bannerImage: "https://i.imgur.com/zpRe43i.png" },
{ name: "Shiny Steelix",     price: 38000000,  tag: "t1",         image: "https://i.imgur.com/zY5AuG0.gif", bannerImage: "https://i.imgur.com/JPcD2l3.png" },
{ name: "Shiny Magcargo",     price: 38000000,  tag: "t1",         image: "https://i.imgur.com/dGiBfxE.gif", bannerImage: "https://i.imgur.com/GvD1Mtq.png" },
{ name: "Shiny Tangela",     price: 10000000,   tag: "t2",         image: "https://i.imgur.com/CkrSdpJ.gif", bannerImage: "https://i.imgur.com/YjKxtoE.png" },
{ name: "Shiny Heracross",     price: 15000000,   tag: "t2",         image: "https://i.imgur.com/r1hdJz1.gif", bannerImage: "https://i.imgur.com/OKsJXh7.png" },
{ name: "Shiny Onix",     price: 10000000,   tag: "t2",         image: "https://i.imgur.com/VO2wrSz.gif", bannerImage: "https://i.imgur.com/GvD1Mtq.png" },
{ name: "Shiny Tangrowth",   price: 170000000, tag: "super-raro", image: "https://i.imgur.com/Ep4wVmN.gif", bannerImage: "https://i.imgur.com/YjKxtoE.png" },
{ name: "Shiny Tentacruel",  price: 38000000,  tag: "t1", dive: true, image: "https://i.imgur.com/I9J30Si.gif", bannerImage: "https://i.imgur.com/xfX0ReE.png" },
{ name: "Shiny Torterra",    price: 170000000, tag: "super-raro", image: "https://i.imgur.com/yp3SFUz.gif", bannerImage: "https://i.imgur.com/JPcD2l3.png" },
{ name: "Shiny Machamp",    price: 170000000, tag: "super-raro", image: "https://i.imgur.com/rVgDyg7.gif", bannerImage: "https://i.imgur.com/OKsJXh7.png" },
{ name: "Shiny Typhlosion",  price: 38000000,  tag: "t1",         image: "https://i.imgur.com/2BtRLDx.gif", bannerImage: "https://i.imgur.com/O8TONGE.png" },
{ name: "Shiny Umbreon",     price: 42000000,  tag: "t1",         image: "https://i.imgur.com/G5vLr8q.gif", bannerImage: "https://i.imgur.com/7Luj4az.png" },
{ name: "Shiny Vaporeon",    price: 38000000,  tag: "t1",         image: "https://i.imgur.com/ZiHkl9v.gif", bannerImage: "https://i.imgur.com/zpRe43i.png" },
{ name: "Shiny Venusaur",    price: 38000000,  tag: "t1",         image: "https://i.imgur.com/gmZVZIS.gif", bannerImage: "https://i.imgur.com/YjKxtoE.png" },
{ name: "Shiny Victreebel",  price: 5000000,   tag: "t3",         image: "https://i.imgur.com/Wz5rU8G.gif", bannerImage: "https://i.imgur.com/YjKxtoE.png" },
{ name: "Shiny Vileplume",   price: 10000000,   tag: "t2",         image: "https://i.imgur.com/62jbqox.gif", bannerImage: "https://i.imgur.com/YjKxtoE.png" },
{ name: "Shiny Xatu",        price: 10000000,   tag: "t2",         image: "https://i.imgur.com/I3KwmrR.gif", bannerImage: "https://i.imgur.com/HuybbPn.png" },
{ name: "Dusknoir",          price: 32000000,  tag: "t1",         image: "https://i.imgur.com/yIyXLpT.gif", bannerImage: "https://i.imgur.com/HuybbPn.png" },
{ name: "Luxray",            price: 32000000,  tag: "t1",         image: "https://i.imgur.com/vLUBjp6.gif", bannerImage: "https://i.imgur.com/Yv2WEYc.png" },
{ name: "Tangrowth",         price: 32000000,  tag: "t1",         image: "https://i.imgur.com/EpEQ1Wx.gif", bannerImage: "https://i.imgur.com/YjKxtoE.png" },
{ name: "Torterra",          price: 32000000,  tag: "t1",         image: "https://i.imgur.com/PBn3OXz.gif", bannerImage: "https://i.imgur.com/JPcD2l3.png" },
{ name: "Shiny Dodrio",  price: 38000000,  tag: "t1",         image: "https://i.imgur.com/X5uC13u.gif", bannerImage: "https://i.imgur.com/npGjQae.png" },
{ name: "Shiny Kingdra",    price: 170000000, tag: "super-raro", image: "https://i.imgur.com/ZPszNYT.gif", bannerImage: "https://i.imgur.com/zpRe43i.png" },
 <!-- { name: "Shiny Kabutops",  price: 38000000,  tag: "t1",         image: "https://i.imgur.com/t7vEAaB.gif" }, -->
{ name: "Shiny Arcanine",    price: 170000000, tag: "super-raro", image: "https://i.imgur.com/BqakQU0.gif", bannerImage: "https://i.imgur.com/O8TONGE.png" },
{ name: "Shiny Kangaskhan",  price: 170000000,  tag: "super-raro",         image: "https://i.imgur.com/wgjSoja.gif", bannerImage: "https://i.imgur.com/OKsJXh7.png" },
{ name: "Shiny Lapras",  price: 38000000,  tag: "t1",         image: "https://i.imgur.com/nVzbMx2.gif", bannerImage: "https://i.imgur.com/ssFz0sA.png" },
{ name: "Shiny Qwilfish",     price: 10000000,   tag: "t3",         image: "https://i.imgur.com/FYlu9Rd.gif", bannerImage: "https://i.imgur.com/xfX0ReE.png" },
{ name: "Shiny Slowking",  price: 38000000,  tag: "t1",         image: "https://i.imgur.com/koy11aG.gif", bannerImage: "https://i.imgur.com/ASiZi1K.png" },
{ name: "Shiny Skarmory",  price: 170000000,  tag: "super-raro",         image: "https://i.imgur.com/B2l8aVE.gif", bannerImage: "https://i.imgur.com/GleRjiM.png" },
{ name: "Shiny Toxicroak",  price: 170000000,  tag: "super-raro",         image: "https://i.imgur.com/BUSWRd6.gif", bannerImage: "https://i.imgur.com/xfX0ReE.png" },
{ name: "Shiny Misdreavus",  price: 170000000,  tag: "super-raro",         image: "https://i.imgur.com/mgtoi05.gif", bannerImage: "https://i.imgur.com/HuybbPn.png" },
{ name: "Shiny Rapidash",  price: 38000000,  tag: "t1",         image: "https://i.imgur.com/1dWZFHK.gif", bannerImage: "https://i.imgur.com/Yv2WEYc.png" },
{ name: "Shiny Muk",  price: 38000000,  tag: "t1",         image: "https://i.imgur.com/zWWBobI.gif", bannerImage: "https://i.imgur.com/xfX0ReE.png" },
{ name: "Shiny Marowak",  price: 38000000,  tag: "t1",         image: "https://i.imgur.com/ZzOu7hp.gif", bannerImage: "https://i.imgur.com/JPcD2l3.png" },
{ name: "Shiny Mantine",  price: 38000000,  tag: "t1",         image: "https://i.imgur.com/wfiogx3.gif", bannerImage: "https://i.imgur.com/npGjQae.png" },
{ name: "Shiny Delibird",     price: 10000000,   tag: "t3",         image: "https://i.imgur.com/HC4VMvm.gif", bannerImage: "https://i.imgur.com/ssFz0sA.png" },
];
// Store original index for O(1) lookup
POKEMONS.forEach((p, i) => { p._idx = i; });

// Injeta bannerImage nos items a partir do POKEMONS
POKEMONS.forEach(p => {
  if (!p.bannerImage) return;
  const item = items.find(it => it.name === p.name);
  if (item) item.bannerImage = p.bannerImage;
});

const BALLS = [
  { id: "ultra",    name: "Ultra Ball",    emoji: '<img src="https://i.imgur.com/D5T6Dgw.png" style="width:40px;height:40px;object-fit:contain" />', color: "var(--gold)",        mult: 1.0 },
  { id: "premier",  name: "Premier Ball",  emoji: '<img src="https://i.imgur.com/sIwvw2L.png" style="width:40px;height:40px;object-fit:contain" />', color: "var(--gold)",        mult: 1.3 },
  { id: "alliance", name: "Alliance Ball", emoji: '<img src="https://i.imgur.com/QFXUD5f.png" style="width:40px;height:40px;object-fit:contain" />', color: "var(--gold)",        mult: 1.5 },
];

let currentCapturaIdx = null;
let selectedBall = null;

function getCapturaTagHtml(tag) {
  if (!tag) return '';
  const labels = {
    't1': 'T1', 't2': 'T2', 't3': 'T3', 't4': 'T4', 't5': 'T5', 't6': 'T6',
    'super-raro': 'Super Raro', 'ultra-raro': 'Ultra Raro', 'raro': 'Raro',
    'legendary': 'Legendary', 'mythical': 'Mítico', 'dive': '<img src="https://i.imgur.com/zpRe43i.png" style="height:14px;vertical-align:middle;margin-right:4px;"> Dive'
  };
  const label = labels[tag];
  if (!label) return '';
  return `<span class="captura-tag ctag-${tag}">${label}</span>`;
}

function renderCaptura() {
  const grid = document.getElementById('captura-grid');
  const q = (document.getElementById('captura-search')?.value || '').toLowerCase();
  const tagFilter = (document.getElementById('captura-filter')?.value || 'all');
  const typeFilter = window._capturaTypeFilter || 'all';
  const filtered = POKEMONS.filter(p => {
    const matchSearch = !q || p.name.toLowerCase().includes(q);
    const matchTag = tagFilter === 'all' ? true
      : tagFilter === 'dive' ? !!p.dive
      : tagFilter === 'none' ? !p.tag
      : p.tag === tagFilter;
    const pokeType = getTypeFromBanner(p.bannerImage);
    const matchType = typeFilter === 'all' ? true : pokeType === typeFilter;
    return matchSearch && matchTag && matchType;
  });
  document.getElementById('captura-count-label').textContent = filtered.length + (filtered.length === 1 ? ' pokémon' : ' pokémons');
  if (!filtered.length) {
    grid.innerHTML = '<div class="no-results">Nenhum Pokémon encontrado.</div>';
    return;
  }
  grid.innerHTML = filtered.map((poke) => {
    const idx = poke._idx;
    const pokeType = getTypeFromBanner(poke.bannerImage);
    const typeClass = pokeType ? ` type-${pokeType}` : '';
    const particlesHtml = buildParticlesHtml(pokeType);
    const diveMultiplier = poke.dive ? 1.30 : 1.0;
    const effectivePrice = poke.price ? Math.round(poke.price * diveMultiplier) : poke.price;
    const priceData = formatKK(effectivePrice);
    const priceHtml = priceData
      ? `<div class="captura-card-price">
           <span class="captura-price-kk">${priceData.label}</span>
           <span class="captura-price-brl">${priceData.brl}</span>
         </div>`
      : `<div class="captura-card-price"><span class="price-none">sem preço</span></div>`;
    const typeColor = pokeType && TYPE_COLORS[pokeType] ? TYPE_COLORS[pokeType] : '';
    const typeStyle = typeColor ? ` style="--type-color:${typeColor}"` : '';
    return `<div class="captura-card${typeClass}"${typeStyle} onclick="openCapturaModal(${idx})">
      ${particlesHtml}
      ${getBannerHtml(poke)}
      ${(()=>{ const g=/\.gif$/i.test(poke.image); const src=g?getShowdownStaticSprite(poke.name):poke.image; const gif=g?getShowdownSprite(poke.name):''; return `<img class="captura-card-img${g?' captura-img--gif':''}" src="${src}" ${g?`data-gif="${gif}"`:'loading="lazy"'} alt="${poke.name}" onerror="this.parentElement.style.minHeight='96px'">`; })()}
      <div class="captura-card-name">${poke.name}</div>
      ${getCapturaTagHtml(poke.tag)}
      ${poke.dive ? getCapturaTagHtml('dive') : ''}
      ${priceHtml}
      <button class="captura-catch-btn">⬟ Capturar</button>
    </div>`;
  }).join('');
}

function openCapturaModal(idx) {
  currentCapturaIdx = idx;
  selectedBall = null;
  const poke = POKEMONS[idx];
  const diveMultiplier = poke.dive ? 1.30 : 1.0;
  const effectiveBasePrice = poke.price ? Math.round(poke.price * diveMultiplier) : poke.price;
  const priceData = formatKK(effectiveBasePrice);
  document.getElementById('captura-modal-title').textContent = poke.name;
  const body = document.getElementById('captura-modal-body');
  body.innerHTML = `
    <div class="captura-modal-img-wrap">
      <img class="captura-modal-pokemon-img" src="${poke.image}" alt="${poke.name}" onerror="this.style.display='none'" />
    </div>
    <div class="captura-modal-info">
      <div class="captura-modal-poke-name">${poke.name}</div>
      <div style="margin-top:6px;display:flex;justify-content:center;gap:6px;flex-wrap:wrap">
        ${poke.tag ? getCapturaTagHtml(poke.tag) : ''}
        ${poke.dive ? getCapturaTagHtml('dive') : ''}
      </div>
      ${poke.dive ? `<div style="margin-top:6px;font-family:var(--font-body);font-size:11px;color:#00e5ff;opacity:0.8;letter-spacing:1px;text-align:center"><img src="https://i.imgur.com/zpRe43i.png" style="height:12px;vertical-align:middle;margin-right:4px;"> Pokémon em Dive — +30% aplicado</div>` : ''}
      ${priceData ? `
      <div class="captura-modal-price-block">
        <span class="captura-modal-price-kk">${priceData.label}</span>
        <span class="captura-modal-price-sep">·</span>
        <span class="captura-modal-price-brl">${priceData.brl}</span>
      </div>` : ''}
    </div>
    <div class="captura-ball-section">
      <div class="captura-ball-label">Escolha a Poké Ball</div>
      <div class="captura-ball-options">
        ${BALLS.map(ball => {
          const ballPrice = effectiveBasePrice ? Math.round(effectiveBasePrice * ball.mult) : 0;
          const ballPriceData = formatKK(ballPrice);
          const multLabel = ball.mult === 1.0 ? '' : `<span class="ball-mult">×${ball.mult}</span>`;
          return `
          <button class="captura-ball-btn" data-ball="${ball.id}" onclick="selectBall('${ball.id}')">
            <span class="captura-ball-check" style="color:${ball.color}">✓</span>
            <span class="captura-ball-icon">${ball.emoji}</span>
            <span class="captura-ball-name">${ball.name}</span>
            ${multLabel}
            ${ballPriceData ? `<span class="ball-price-kk" style="color:${ball.color}">${ballPriceData.label}</span>
            <span class="ball-price-brl">${ballPriceData.brl}</span>` : ''}
          </button>`;
        }).join('')}
      </div>
    </div>
    <div class="captura-modal-price-selected" id="captura-price-selected" style="display:none">
      <span class="captura-price-sel-label">Total com ball selecionada</span>
      <div class="captura-price-sel-vals">
        <span class="captura-price-sel-kk" id="captura-price-sel-kk">—</span>
        <span class="captura-price-sel-brl" id="captura-price-sel-brl">—</span>
      </div>
    </div>
    <div class="captura-success-msg" id="captura-success-msg">
      <span>🎉</span>
      <span id="captura-success-text">Captura confirmada!</span>
    </div>
    <button class="captura-confirm-btn" id="captura-confirm-btn" onclick="confirmCaptura()" disabled>
      <span>⬟ Confirmar Captura</span>
    </button>
  `;
  document.getElementById('captura-overlay').classList.add('open');
}

function selectBall(ballId) {
  selectedBall = ballId;
  document.querySelectorAll('.captura-ball-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.ball === ballId);
  });
  const confirmBtn = document.getElementById('captura-confirm-btn');
  if (confirmBtn) confirmBtn.disabled = false;
  const msg = document.getElementById('captura-success-msg');
  if (msg) msg.classList.remove('show');

  // Atualiza bloco de preço final
  if (currentCapturaIdx !== null) {
    const poke = POKEMONS[currentCapturaIdx];
    const ball = BALLS.find(b => b.id === ballId);
    const diveMultiplier = poke.dive ? 1.30 : 1.0;
    const effectiveBase = poke.price ? Math.round(poke.price * diveMultiplier) : 0;
    const finalPrice = effectiveBase ? Math.round(effectiveBase * ball.mult) : 0;
    const priceData = formatKK(finalPrice);
    const selBlock = document.getElementById('captura-price-selected');
    const selKk    = document.getElementById('captura-price-sel-kk');
    const selBrl   = document.getElementById('captura-price-sel-brl');
    if (selBlock && priceData) {
      selKk.textContent  = priceData.label;
      selBrl.textContent = priceData.brl;
      selBlock.style.display = 'flex';
    }
  }
}

function confirmCaptura() {
  if (!selectedBall || currentCapturaIdx === null) return;
  const poke = POKEMONS[currentCapturaIdx];
  const ball = BALLS.find(b => b.id === selectedBall);
  const diveMultiplier = poke.dive ? 1.30 : 1.0;
  const effectiveBasePrice = poke.price ? Math.round(poke.price * diveMultiplier) : 0;
  const finalPrice = effectiveBasePrice ? Math.round(effectiveBasePrice * ball.mult) : 0;
  const priceData  = formatKK(finalPrice);
  const priceStr   = priceData ? ` · ${priceData.label} (${priceData.brl})` : '';

  // ── Adiciona ao carrinho ──
  // Monta um nome descritivo: "Shiny Charizard (Alliance Ball)"
  const cartItemName = `${poke.name} (${ball.name})`;
  // Verifica se já existe um item idêntico no array items
  let cartKey = items.findIndex(it => it._capturaId === `${currentCapturaIdx}_${selectedBall}`);
  if (cartKey === -1) {
    // Cria novo item dinâmico no array items
    items.push({
      name: cartItemName,
      price: finalPrice,
      image: poke.image,
      _capturaId: `${currentCapturaIdx}_${selectedBall}`,
      _ballEmoji: ball.emoji,
      _ballName: ball.name,
    });
    cartKey = items.length - 1;
  }
  cart[cartKey] = (cart[cartKey] || 0) + 1;
  updateCartBadge();
  if (!finalPrice) showNoPriceToast(cartItemName);

  const msg = document.getElementById('captura-success-msg');
  const btn = document.getElementById('captura-confirm-btn');
  if (msg) {
    msg.querySelector('#captura-success-text').textContent = `${poke.name} capturado com ${ball.name}${priceStr}!`;
    msg.classList.add('show');
  }
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span>✓ Captura Registrada</span>`;
    btn.style.borderColor = 'rgba(37,211,102,0.5)';
    btn.style.color = '#25d366';
  }
  setTimeout(() => closeCapturaModal(), 2600);
}

function closeCapturaModal() {
  document.getElementById('captura-overlay').classList.remove('open');
  currentCapturaIdx = null;
  selectedBall = null;
}

function handleCapturaOverlayClick(e) {
  if (e.target === document.getElementById('captura-overlay')) closeCapturaModal();
}

render();


// ── GIF Hover Manager ────────────────────────────────────────────────────────
// Padrão: PNG estático (leve, zero GPU).
// Hover: troca pelo GIF animado do Showdown. Mouseleave: volta ao PNG.
(function GifHoverManager() {
  'use strict';

  function bindCard(card) {
    if (card._gifBound) return;
    card._gifBound = true;

    var img = card.querySelector('img[data-gif]');
    if (!img) return;

    card.addEventListener('mouseenter', function() {
      img.src = img.dataset.gif;
    });
    card.addEventListener('mouseleave', function() {
      img.src = getShowdownStaticSprite(img.alt);
    });
  }

  function bindAll() {
    document.querySelectorAll('.card, .captura-card').forEach(bindCard);
  }

  bindAll();

  var mo = new MutationObserver(bindAll);
  var gridEl = document.getElementById('grid');
  var capturaGridEl = document.getElementById('captura-grid');
  if (gridEl)        mo.observe(gridEl,        { childList: true });
  if (capturaGridEl) mo.observe(capturaGridEl, { childList: true });
})();

// ── Performance: pausa animações de cards fora da viewport ──────────────────
// Cards fora da tela recebem `will-change: auto` e param de consumir GPU.
// Assim só os cards visíveis ficam "ativos".
(function setupCardVisibilityObserver() {
  if (!window.IntersectionObserver) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const img = entry.target.querySelector('img');
      if (img) {
        // Fora da tela: remove promoção de layer e animações
        img.style.willChange = 'auto'; // GIFs: will-change:transform não afeta animação nativa
      }
      // Para as pseudo-animações CSS dos cards fora da tela
      entry.target.style.willChange = entry.isIntersecting ? 'transform, box-shadow' : 'auto';
      // Controla partículas de tipo via classe CSS (pausa quando fora da tela)
      entry.target.classList.toggle('in-view', entry.isIntersecting);
    });
  }, { rootMargin: '120px 0px' }); // 120px de margem = pré-carrega um pouco antes

  // Observa cards iniciais e re-observa a cada render
  function observeCards() {
    document.querySelectorAll('.card, .captura-card').forEach(c => observer.observe(c));
  }

  // Intercepta render para re-observar após cada atualização
  const _origRender = render;
  window.render = function() {
    _origRender.apply(this, arguments);
    requestAnimationFrame(observeCards);
  };
  requestAnimationFrame(observeCards);
})();

// ===================== ENTREGAS =====================
// ============================================================
//  ▼▼▼  ADICIONE SUAS FOTOS AQUI  ▼▼▼
//
//  Coloque as imagens em uma pasta chamada  "entregas"
//  na mesma pasta do index.html, depois adicione cada
//  foto no array abaixo seguindo o modelo:
//
//  { src: "entregas/nome-do-arquivo.jpg",
//    name: "Descrição da entrega",
//    date: "DD/MM/AAAA" },
//
//  Também aceita caminhos absolutos do Windows, ex:
//  { src: "file:///C:/Users/Filipi/fotos/entrega1.jpg", ... }
// ============================================================
const ENTREGAS = [
{ src: "https://i.imgur.com/tU7Djq7.jpeg",  name: "Itens de Talentos — Recall Stark",     date: "16/04/2026" },
{ src: "https://i.imgur.com/nJyeTHn.jpeg",  name: "Shiny Charizard — Gambitt",   date: "21/04/2026" },
{ src: "https://i.imgur.com/5ilqaVR.jpeg",  name: "Itens de Talentos — Saga",        date: "21/04/2026" },
{ src: "https://i.imgur.com/Tu97b05.jpeg",  name: "Itens de Talentos — Jonaspedreiro",        date: "23/04/2026" },
{ src: "https://i.imgur.com/5BbSBo4.png",  name: "Itens de Talentos — K A M I",        date: "26/04/2026" },
{ src: "https://i.imgur.com/EQopeNt.png",  name: "Itens de Talentos / Shiny Heracross — Bihi",        date: "26/04/2026" },
{ src: "https://i.imgur.com/H0KsS8J.png",  name: "Shiny Tentacruel — Qzarny",        date: "27/04/2026" },
{ src: "https://i.imgur.com/UrD74CU.png",  name: "Itens de Talentos — Bllaack",        date: "01/05/2026" },
{ src: "https://i.imgur.com/6UPPwCx.png",  name: "Shiny Starmie — Bllaack",        date: "01/05/2026" },
];
// ============================================================

let _lightboxIdx = 0;

function renderEntregas() {
  const grid = document.getElementById('entregas-grid');
  const countLabel = document.getElementById('entregas-count-label');
  if (!grid) return;

  const n = ENTREGAS.length;
  if (countLabel) countLabel.textContent = n + (n === 1 ? ' entrega' : ' entregas');

  if (!n) {
    grid.innerHTML = `<div class="entregas-empty">
      <div class="entregas-empty-icon">📷</div>
      <div class="entregas-empty-text">Nenhuma entrega ainda</div>
      <div class="entregas-empty-sub">Adicione as fotos no array ENTREGAS[] dentro do script</div>
    </div>`;
    return;
  }

  grid.innerHTML = ENTREGAS.map((item, idx) => `
    <div class="entrega-card" onclick="openEntregaLightbox(${idx})">
      <img src="${item.src}" alt="${item.name}" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
      <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:40px;background:var(--surface3)">📦</div>
      <div class="entrega-card-overlay">
        <div>
          <div class="entrega-card-label">${item.name}</div>
          <div class="entrega-card-date">${item.date}</div>
        </div>
      </div>
      <div class="entrega-card-badge">✓ Entregue</div>
    </div>`).join('');
}

function openEntregaLightbox(idx) {
  _lightboxIdx = idx;
  document.getElementById('entrega-lightbox').classList.add('open');
  _updateLightboxContent();
}

function _updateLightboxContent() {
  const item = ENTREGAS[_lightboxIdx];
  if (!item) return;
  document.getElementById('entrega-lightbox-img').src = item.src;
  document.getElementById('entrega-lightbox-caption').textContent =
    item.name + ' · ' + item.date + '  (' + (_lightboxIdx + 1) + '/' + ENTREGAS.length + ')';
}

function navEntregaLightbox(dir) {
  _lightboxIdx = (_lightboxIdx + dir + ENTREGAS.length) % ENTREGAS.length;
  _updateLightboxContent();
}

function closeEntregaLightbox(e) {
  if (e && e.type === 'click') {
    const inner = document.querySelector('.entrega-lightbox-inner');
    if (inner && inner.contains(e.target) && !e.target.classList.contains('entrega-lightbox-close')) return;
  }
  document.getElementById('entrega-lightbox').classList.remove('open');
}

document.addEventListener('keydown', e => {
  const lb = document.getElementById('entrega-lightbox');
  if (!lb || !lb.classList.contains('open')) return;
  if (e.key === 'ArrowLeft')  navEntregaLightbox(-1);
  if (e.key === 'ArrowRight') navEntregaLightbox(1);
  if (e.key === 'Escape')     lb.classList.remove('open');
});

const _origSwitchTab = switchTab;
switchTab = function(tab, btn) {
  _origSwitchTab(tab, btn);
  if (tab === 'entregas') renderEntregas();
};

// Sticky offset — mede header e tabs e expõe como variáveis CSS
function updateStickyOffsets() {
  const header = document.querySelector('header');
  const tabsNav = document.querySelector('.tabs-nav');
  const hh = header ? header.getBoundingClientRect().height : 0;
  const th = tabsNav ? tabsNav.getBoundingClientRect().height : 0;
  document.documentElement.style.setProperty('--header-h', hh + 'px');
  document.documentElement.style.setProperty('--tabs-h', th + 'px');
}
updateStickyOffsets();
window.addEventListener('resize', updateStickyOffsets);

// ===================== TYPE DROPDOWN =====================
window._capturaTypeFilter = 'all';

function toggleTypeDropdown(e) {
  e.stopPropagation();
  const dd = document.getElementById('type-dropdown');
  dd.classList.toggle('open');
}

function selectTypeFilter(type, btn) {
  window._capturaTypeFilter = type;

  // Update active state on items
  document.querySelectorAll('.type-dropdown-item').forEach(el => el.classList.remove('active'));
  btn.classList.add('active');

  // Update button display
  const icon = document.getElementById('type-dropdown-icon');
  const label = document.getElementById('type-dropdown-label');
  if (type === 'all') {
    icon.innerHTML = '<span class="type-dropdown-all-dot"></span>';
    label.textContent = 'Tipo';
  } else {
    const img = btn.querySelector('img');
    const name = btn.querySelector('span:last-child').textContent;
    icon.innerHTML = `<img src="${img.src}" alt="${type}">`;
    label.textContent = name;
  }

  // Close dropdown
  document.getElementById('type-dropdown').classList.remove('open');

  // Re-render
  renderCaptura();
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
  const dd = document.getElementById('type-dropdown');
  if (dd && !dd.contains(e.target)) dd.classList.remove('open');
});

// ===================== WIKI LOOKUP POPUP =====================
function openWikiLookup(itemName, e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  var overlay = document.getElementById('wiki-popup-overlay');
  var title = document.getElementById('wiki-popup-title');
  var sub = document.getElementById('wiki-popup-sub');
  var grid = document.getElementById('wiki-popup-grid');
  var empty = document.getElementById('wiki-popup-empty');

  title.textContent = itemName;

  // Busca na RAW_WIKI
  var entry = RAW_WIKI.find(function(e) {
    return e[0].toLowerCase() === itemName.toLowerCase();
  });
  var sources = entry ? entry.slice(1).filter(function(s) { return s && s.trim(); }) : [];

  if (!sources.length) {
    grid.innerHTML = '';
    grid.style.display = 'none';
    sub.textContent = 'Nenhum drop registrado';
    empty.style.display = 'block';
    empty.textContent = 'Nenhum Pokémon registrado para este item.';
  } else {
    sub.textContent = sources.length + ' Pokémon' + (sources.length > 1 ? ' dropam' : ' dropa') + ' este item';
    empty.style.display = 'none';
    grid.style.display = 'flex';
    grid.innerHTML = sources.map(function(pokeName) {
      var sprite = getShowdownSprite(pokeName);
      var fallback = 'https://play.pokemonshowdown.com/sprites/gen5/' + toShowdownName(pokeName) + '.png';
      return '<div class="wiki-popup-card">' +
        '<img src="' + sprite + '" alt="' + pokeName + '" onerror="this.src=\'' + fallback + '\'" />' +
        '<div class="wiki-popup-card-name">' + pokeName + '</div>' +
        '</div>';
    }).join('');
  }

  overlay.classList.add('open');
}

function closeWikiPopup() {
  document.getElementById('wiki-popup-overlay').classList.remove('open');
}

document.addEventListener('DOMContentLoaded', function() {
  var overlay = document.getElementById('wiki-popup-overlay');
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeWikiPopup();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeWikiPopup();
  });
});