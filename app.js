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
var _respawnSearchTimer, _questsSearchTimer, _rocketsSearchTimer;

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
  if (tab === 'npcs') {
    // Abre a sub-aba de NPC's e renderiza a categoria ativa (padrão: rockets)
    var activeNpcBtn = document.querySelector('.npc-subcat-btn.active');
    var activeSubcat = activeNpcBtn ? activeNpcBtn.getAttribute('data-subcat') || 'rockets' : 'rockets';
    switchNpcSubcat(activeSubcat, activeNpcBtn);
  }
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

  // ── Modo Lista ─────────────────────────────────────────────────────────────
  // Thumbnail estática pequena ao lado do nome.
  // Clique na linha abre o modal (com GIF animado) — igual ao comportamento anterior.
  // Muito mais leve: zero GIFs simultâneos rodando na tela.
  grid.innerHTML = '<div class="captura-list">' + filtered.map((poke) => {
    const idx = poke._idx;
    const pokeType = getTypeFromBanner(poke.bannerImage);
    const typeColor = pokeType && TYPE_COLORS[pokeType] ? TYPE_COLORS[pokeType] : 'var(--accent)';
    const typeClass = pokeType ? ` type-${pokeType}` : '';

    // Thumbnail: sempre usa sprite estático (PNG) — sem GIF na lista
    const thumbSrc = getShowdownStaticSprite(poke.name);
    const fallbackSrc = poke.image && !/\.gif$/i.test(poke.image) ? poke.image : '';

    const diveMultiplier = poke.dive ? 1.30 : 1.0;
    const effectivePrice = poke.price ? Math.round(poke.price * diveMultiplier) : poke.price;
    const priceData = formatKK(effectivePrice);
    const priceHtml = priceData
      ? `<span class="captura-list-price-kk" style="color:${typeColor}">${priceData.label}</span>
         <span class="captura-list-price-brl">${priceData.brl}</span>`
      : `<span class="price-none">sem preço</span>`;

    const tagsHtml = [
      poke.tag ? getCapturaTagHtml(poke.tag) : '',
      poke.dive ? getCapturaTagHtml('dive') : '',
    ].join('');

    // Banner de tipo (ícone pequeno)
    const typeIconHtml = poke.bannerImage
      ? `<img class="captura-list-type-icon" src="${poke.bannerImage}" alt="" loading="lazy" onerror="this.style.display='none'" />`
      : '';

    return `<div class="captura-list-row" style="--type-color:${typeColor}" onclick="openCapturaModal(${idx})">
      <img class="captura-list-thumb"
           src="${thumbSrc}"
           ${fallbackSrc ? `onerror="this.src='${fallbackSrc}'"` : `onerror="this.style.opacity='0'"`}
           alt="${poke.name}"
           loading="lazy" />
      <div class="captura-list-info">
        <span class="captura-list-name">${poke.name}</span>
        <div class="captura-list-tags">${tagsHtml}${typeIconHtml}</div>
      </div>
      <div class="captura-list-price">${priceHtml}</div>
      <button class="captura-list-catch-btn" onclick="event.stopPropagation();openCapturaModal(${idx})">⬟</button>
    </div>`;
  }).join('') + '</div>';
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
          const multLabel = '';
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
    ${(function() {
      const pokeType = getTypeFromBanner(poke.bannerImage);
      const typeColor = pokeType && TYPE_COLORS[pokeType] ? TYPE_COLORS[pokeType] : '#ffd166';
      return buildDropsHtml(poke.name, typeColor);
    })()}
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
{ src: "https://i.imgur.com/NhV6uXy.jpeg",  name: "Shiny Tentacruel — Qzarny",        date: "03/05/2026" },
{ src: "https://i.imgur.com/QnneBym.jpeg",  name: "Shiny Qwilfish — Akahitaka",        date: "03/05/2026" },
{ src: "https://i.imgur.com/SwibeCC.jpeg",  name: "Shiny Qwilfish — Akahitaka",        date: "03/05/2026" },
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

// ===================== POKEMON DROP MAP =====================
// Constrói mapa reverso: pokémonName (lowercase) → [{ name, price }]
const _pokeDropMap = (function() {
  const map = {};
  const priceMap = {};
  RAW.forEach(function(entry) {
    const name = entry[0];
    const price = entry[2] || 0;
    if (name) priceMap[name.toLowerCase()] = price;
  });
  RAW_WIKI.forEach(function(entry) {
    const itemName = entry[0];
    const price = priceMap[itemName.toLowerCase()] || 0;
    for (let i = 1; i < entry.length; i++) {
      const poke = entry[i];
      if (!poke || !poke.trim()) continue;
      const key = poke.trim().toLowerCase();
      if (!map[key]) map[key] = [];
      map[key].push({ name: itemName, price: price });
    }
  });
  return map;
})();

function getPokeDrops(pokeName) {
  const key = pokeName.trim().toLowerCase();
  const keyNoShiny = key.replace(/^shiny\s+/, '');
  return _pokeDropMap[key] || _pokeDropMap[keyNoShiny] || [];
}

function buildDropsHtml(pokeName, typeColor) {
  const drops = getPokeDrops(pokeName);
  if (!drops.length) return '';
  const color = typeColor || '#ffd166';
  const colorDim = color + '22';
  const colorBorder = color + '40';
  const chips = drops.map(function(drop) {
    const priceLabel = drop.price ? formatKK(drop.price) : null;
    const priceHtml = priceLabel
      ? '<span style="font-size:10px;color:rgba(255,255,255,0.38);margin-left:4px">' + priceLabel.label + '</span>'
      : '';
    return '<div style="background:' + colorDim + ';border:1px solid ' + colorBorder + ';border-radius:7px;padding:4px 9px;display:inline-flex;align-items:center;gap:3px">'
      + '<span style="font-size:11px;color:' + color + ';font-weight:600;font-family:var(--font-display,inherit)">' + drop.name + '</span>'
      + priceHtml
      + '</div>';
  }).join('');
  return '<div style="margin-top:12px;border-top:1px solid rgba(255,255,255,0.07);padding-top:11px">'
    + '<div style="font-size:10px;letter-spacing:1.5px;color:rgba(255,255,255,0.35);text-align:center;margin-bottom:8px;font-weight:600;font-family:var(--font-display,inherit)">ITENS DROPADOS</div>'
    + '<div style="display:flex;flex-wrap:wrap;gap:5px;justify-content:center">' + chips + '</div>'
    + '</div>';
}

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
// ===================== CAPTURA LIST MODE CSS =====================
(function injectCapturaListStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* Garante que o container do grid vire bloco ao exibir a lista */
    #captura-grid:has(.captura-list) {
      display: block !important;
      grid-template-columns: unset !important;
    }
    .captura-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 4px 0;
      width: 100%;
      box-sizing: border-box;
      grid-column: 1 / -1;
    }
    /* Neutraliza qualquer classe de tipo global que pinte o fundo */
    .captura-list-row[class],
    .captura-list-row {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
      padding: 10px 14px !important;
      background: rgba(255,255,255,0.04) !important;
      border: 1px solid rgba(255,255,255,0.07) !important;
      border-left: 3px solid var(--type-color, #60aaff) !important;
      border-radius: 10px !important;
      cursor: pointer !important;
      transition: background 0.15s, border-color 0.15s, transform 0.12s !important;
      position: relative !important;
      overflow: hidden !important;
      color: #ffffff !important;
      box-shadow: none !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    /* Glow sutil no fundo vindo da esquerda com a cor do tipo */
    .captura-list-row::after {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 120px;
      background: linear-gradient(90deg, color-mix(in srgb, var(--type-color, #60aaff) 12%, transparent), transparent);
      pointer-events: none;
    }
    .captura-list-row:hover {
      background: rgba(255,255,255,0.07) !important;
      border-left-color: var(--type-color, #60aaff) !important;
      border-color: color-mix(in srgb, var(--type-color, #60aaff) 40%, rgba(255,255,255,0.1)) !important;
      transform: translateX(3px) !important;
      box-shadow: 0 2px 16px color-mix(in srgb, var(--type-color, #60aaff) 15%, transparent) !important;
    }
    .captura-list-row:active {
      transform: translateX(1px) scale(0.995) !important;
    }
    .captura-list-thumb {
      width: 48px !important;
      height: 48px !important;
      object-fit: contain !important;
      flex-shrink: 0 !important;
      image-rendering: pixelated !important;
      filter: drop-shadow(0 2px 8px rgba(0,0,0,0.6)) !important;
      z-index: 1;
    }
    .captura-list-info {
      flex: 1 !important;
      min-width: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 4px !important;
      z-index: 1;
    }
    .captura-list-name {
      font-family: var(--font-display, inherit) !important;
      font-size: 14px !important;
      font-weight: 700 !important;
      color: #ffffff !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      letter-spacing: 0.4px !important;
      text-shadow: 0 1px 4px rgba(0,0,0,0.8) !important;
    }
    .captura-list-tags {
      display: flex !important;
      align-items: center !important;
      gap: 5px !important;
      flex-wrap: wrap !important;
    }
    .captura-list-type-icon {
      width: 16px !important;
      height: 16px !important;
      object-fit: contain !important;
      opacity: 0.85 !important;
      vertical-align: middle !important;
    }
    .captura-list-price {
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-end !important;
      gap: 2px !important;
      flex-shrink: 0 !important;
      z-index: 1;
    }
    .captura-list-price-kk {
      font-family: var(--font-mono, monospace) !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      letter-spacing: 0.5px !important;
    }
    .captura-list-price-brl {
      font-family: var(--font-body, inherit) !important;
      font-size: 10px !important;
      color: rgba(255,255,255,0.45) !important;
    }
    .captura-list-catch-btn {
      flex-shrink: 0 !important;
      background: color-mix(in srgb, var(--type-color, #60aaff) 15%, transparent) !important;
      border: 1px solid color-mix(in srgb, var(--type-color, #60aaff) 60%, transparent) !important;
      color: var(--type-color, #60aaff) !important;
      border-radius: 8px !important;
      width: 34px !important;
      height: 34px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 15px !important;
      cursor: pointer !important;
      transition: background 0.15s, box-shadow 0.15s !important;
      z-index: 1;
    }
    .captura-list-catch-btn:hover {
      background: var(--type-color, #60aaff) !important;
      color: #000 !important;
      box-shadow: 0 0 12px color-mix(in srgb, var(--type-color, #60aaff) 70%, transparent) !important;
    }
    @media (max-width: 480px) {
      .captura-list-thumb { width: 38px !important; height: 38px !important; }
      .captura-list-name  { font-size: 13px !important; }
      .captura-list-price-kk { font-size: 12px !important; }
    }
  `;
  document.head.appendChild(style);
})();
// ============================================================
// NPC's → Rockets
// Estrutura: { name, wins, pokemons: [{ name, reward }] }
// reward = nome do Pokémon shiny recompensa (buscado em POKEMONS para tag)
// ============================================================

const RAW_ROCKETS = [
  // SHADOW
  { name: 'Shadow', wins: null, pokemons: [
    { name: 'Feraligatr',       reward: 'sh Raichu'    },
    { name: 'Shiny Gengar',     reward: 'sh Sandslash' },
    { name: 'Alakazam',         reward: 'Scizor'       },
    { name: 'Shiny Crobat',     reward: 'sh Golem'     },
    { name: 'Muk',              reward: 'sh Marowak'   },
    { name: 'Houndoom',         reward: 'sh Starmie'   },
  ]},
  // FROST
  { name: 'Frost', wins: null, pokemons: [
    { name: 'Misdreavus',       reward: 'sh Persian'   },
    { name: 'Magcargo',         reward: 'sh Starmie'   },
    { name: 'Hypno',            reward: 'Scizor'       },
    { name: 'Gligar',           reward: 'sh Jynx'      },
    { name: 'Houndour',         reward: 'sh Hitmontop' },
    { name: 'Murkrow',          reward: 'sh Golem'     },
  ]},
  // THORN
  { name: 'Thorn', wins: null, pokemons: [
    { name: 'Shiny Arbok',      reward: 'sh Sandslash' },
    { name: 'Shiny Golbat',     reward: 'sh Golem'     },
    { name: 'Shiny Hypno',      reward: 'Scizor'       },
    { name: 'Shiny Haunter',    reward: 'sh Persian'   },
    { name: 'Shiny Murkrow',    reward: 'sh Jynx'      },
    { name: 'Houndoom',         reward: 'sh Starmie'   },
  ]},
  // CIPHER
  { name: 'Cipher', wins: null, pokemons: [
    { name: 'Feraligatr',       reward: 'sh Raichu'    },
    { name: 'Shiny Persian',    reward: 'sh Hitmontop' },
    { name: 'Venusaur',         reward: 'sh Pidgeot'   },
    { name: 'Electabuzz',       reward: 'sh Sandslash' },
    { name: 'Typhlosion',       reward: 'sh Starmie'   },
    { name: 'Meganium',         reward: 'sh Arcanine'  },
  ]},
  // PHOENIX
  { name: 'Phoenix', wins: null, pokemons: [
    { name: 'Charizard',        reward: 'sh Golem'     },
    { name: 'Shiny Blastoise',  reward: 'sh Venusaur'  },
    { name: 'Venusaur',         reward: 'sh Pidgeot'   },
    { name: 'Shiny Electrode',  reward: 'sh Sandslash' },
    { name: 'Shiny Magneton',   reward: 'sh Arcanine'  },
    { name: 'Blastoise',        reward: 'sh Raichu'    },
  ]},
  // SCYTHE
  { name: 'Scythe', wins: null, pokemons: [
    { name: 'Scyther',          reward: 'sh Arcanine'  },
    { name: 'Shiny Ampharos',   reward: 'sh Golem'     },
    { name: 'Shiny Raichu',     reward: 'sh Sandslash' },
    { name: 'Nidoqueen',        reward: 'sh Jynx'      },
    { name: 'Arcanine',         reward: 'sh Starmie'   },
    { name: 'Shiny Houndoom',   reward: 'sh Hitmontop' },
  ]},
  // MIRAGE
  { name: 'Mirage', wins: null, pokemons: [
    { name: 'Charizard',        reward: 'sh Golem'     },
    { name: 'Shiny Charizard',  reward: 'sh Starmie'   },
    { name: 'Venusaur',         reward: 'sh Pidgeot'   },
    { name: 'Shiny Venusaur',   reward: 'sh Arcanine'  },
    { name: 'Blastoise',        reward: 'sh Venusaur'  },
    { name: 'Shiny Blastoise',  reward: 'sh Raichu'    },
  ]},
  // ZEPHYR
  { name: 'Zephyr', wins: null, pokemons: [
    { name: 'Typhlosion',       reward: 'sh Golem'     },
    { name: 'Shiny Typhlosion', reward: 'sh Starmie'   },
    { name: 'Meganium',         reward: 'sh Pidgeot'   },
    { name: 'Shiny Meganium',   reward: 'sh Arcanine'  },
    { name: 'Feraligatr',       reward: 'sh Venusaur'  },
    { name: 'Shiny Feraligatr', reward: 'sh Raichu'    },
  ]},
  // OBSIDIAN
  { name: 'Obsidian', wins: null, pokemons: [
    { name: 'Shiny Gyarados',   reward: 'sh Raichu'    },
    { name: 'Shiny Persian',    reward: 'sh Hitmontop' },
    { name: 'Shiny Machamp',    reward: 'sh Pidgeot'   },
    { name: 'Shiny Kingdra',    reward: 'sh Clefable'  },
    { name: 'Shiny Pidgeot',    reward: 'sh Golem'     },
    { name: 'Shiny Scizor',     reward: 'sh Arcanine'  },
  ]},
  // VORTEX
  { name: 'Vortex', wins: null, pokemons: [
    { name: 'Shiny Ninetales',  reward: 'sh Starmie'   },
    { name: 'Shiny Magneton',   reward: 'sh Arcanine'  },
    { name: 'Shiny Kabutops',   reward: 'sh Venusaur'  },
    { name: 'Shiny Omastar',    reward: 'sh Raichu'    },
    { name: 'Shiny Pidgeot',    reward: 'sh Golem'     },
    { name: 'Shiny Ampharos',   reward: 'sh Sandslash' },
  ]},
  // TEMPEST
  { name: 'Tempest', wins: null, pokemons: [
    { name: 'Shiny Magmar',     reward: 'sh Starmie'   },
    { name: 'Shiny Snorlax',    reward: 'sh Hitmontop' },
    { name: 'Shiny Mime',       reward: 'Scizor'       },
    { name: 'Shiny Pupitar',    reward: 'sh Venusaur'  },
    { name: 'Shiny Umbreon',    reward: 'sh Clefable'  },
    { name: 'Shiny Misdreavus', reward: 'sh Persian'   },
  ]},
  // ECLIPSE
  { name: 'Eclipse', wins: null, pokemons: [
    { name: 'Shiny Dragonair',  reward: 'sh Clefable'  },
    { name: 'Shiny Arcanine',   reward: 'sh Starmie'   },
    { name: 'Shiny Espeon',     reward: 'sh Persian'   },
    { name: 'Shiny Pinsir',     reward: 'sh Pidgeot'   },
    { name: 'Shiny Tauros',     reward: 'sh Hitmontop' },
    { name: 'Shiny Skarmory',   reward: 'sh Arcanine'  },
  ]},
  // GIOVANNI (especial)
  { name: 'Giovanni', wins: 130, pokemons: [
    { name: 'Shiny Nidoqueen',  reward: 'sh Sandslash' },
    { name: 'Shiny Persian',    reward: 'Machamp'      },
    { name: 'Shiny Rhydon',     reward: 'sh Venusaur'  },
    { name: 'Shiny Nidoking',   reward: 'sh Jynx'      },
    { name: 'Shiny Kangaskhan', reward: 'sh Hitmontop' },
    { name: 'Shiny Dugtrio',    reward: 'Gyarados'     },
  ]},
];

// Helper: busca tag/tier de um Pokémon pelo nome no array POKEMONS
function getRocketRewardData(pokeName) {
  // Normaliza: "sh Raichu" → "Shiny Raichu", "sh Golem" → "Shiny Golem", etc.
  var normalized = pokeName.replace(/^sh\s+/i, 'Shiny ');
  var found = POKEMONS.find(function(p) {
    return p.name.toLowerCase() === normalized.toLowerCase();
  });
  return found || null;
}

function getShowdownSpriteRocket(name) {
  var isShiny = /^shiny\s+/i.test(name);
  var n = toShowdownName(name);
  var base = 'https://play.pokemonshowdown.com/sprites/' + (isShiny ? 'gen5-shiny/' : 'gen5/') + n + '.png';
  return base;
}

var _rocketsRendered = false;

// ── Tipos por Pokémon (Gen 1-2 relevantes para o jogo) ───────────────────────
var POKE_TYPES = {
  // Water
  'feraligatr':['water'],'shiny feraligatr':['water'],'gyarados':['water','flying'],'shiny gyarados':['water','flying'],
  'starmie':['water','psychic'],'shiny starmie':['water','psychic'],'politoad':['water'],'shiny politoad':['water'],
  'vaporeon':['water'],'shiny vaporeon':['water'],'lapras':['water','ice'],'shiny lapras':['water','ice'],
  'slowking':['water','psychic'],'shiny slowking':['water','psychic'],'mantine':['water','flying'],'shiny mantine':['water','flying'],
  'qwilfish':['water','poison'],'shiny qwilfish':['water','poison'],'kingdra':['dragon','water'],'shiny kingdra':['dragon','water'],
  'magmar':['fire'],'shiny magmar':['fire'],
  // Fire
  'charizard':['fire','flying'],'shiny charizard':['fire','flying'],'typhlosion':['fire'],'shiny typhlosion':['fire'],
  'flareon':['fire'],'shiny flareon':['fire'],'ninetales':['fire'],'shiny ninetales':['fire'],
  'rapidash':['fire'],'shiny rapidash':['fire'],'magcargo':['fire','rock'],'shiny magcargo':['fire','rock'],
  'houndoom':['dark','fire'],'houndour':['dark','fire'],
  // Grass
  'venusaur':['grass','poison'],'shiny venusaur':['grass','poison'],'meganium':['grass'],'shiny meganium':['grass'],
  'exeggutor':['grass','psychic'],'shiny exeggutor':['grass','psychic'],'victreebel':['grass','poison'],'shiny victreebel':['grass','poison'],
  'vileplume':['grass','poison'],'shiny vileplume':['grass','poison'],'tangela':['grass'],'shiny tangela':['grass'],
  'bellossom':['grass'],'shiny bellossom':['grass'],'tangrowth':['grass'],'shiny tangrowth':['grass'],
  // Electric
  'raichu':['electric'],'shiny raichu':['electric'],'ampharos':['electric'],'shiny ampharos':['electric'],
  'electrode':['electric'],'shiny electrode':['electric'],'magneton':['electric','steel'],'shiny magneton':['electric','steel'],
  'jolteon':['electric'],'shiny jolteon':['electric'],'electabuzz':['electric'],'luxray':['electric'],'shiny luxray':['electric'],
  // Psychic
  'alakazam':['psychic'],'hypno':['psychic'],'espeon':['psychic'],'shiny espeon':['psychic'],
  'xatu':['psychic','flying'],'shiny xatu':['psychic','flying'],'slowking':['water','psychic'],
  'mr. mime':['psychic'],'shiny mime':['psychic'],
  // Ghost/Dark
  'gengar':['ghost','poison'],'shiny gengar':['ghost','poison'],'misdreavus':['ghost'],'shiny misdreavus':['ghost'],
  'haunter':['ghost','poison'],'shiny haunter':['ghost','poison'],'dusknoir':['ghost'],'shiny dusknoir':['ghost'],
  'umbreon':['dark'],'shiny umbreon':['dark'],
  // Fighting
  'machamp':['fighting'],'shiny machamp':['fighting'],'hitmonchan':['fighting'],'shiny hitmonchan':['fighting'],
  'hitmonlee':['fighting'],'shiny hitmonlee':['fighting'],'hitmontop':['fighting'],'shiny hitmontop':['fighting'],
  'primeape':['fighting'],'shiny primeape':['fighting'],'heracross':['bug','fighting'],'shiny heracross':['bug','fighting'],
  'poliwrath':['water','fighting'],'shiny poliwrath':['water','fighting'],
  // Normal/Flying
  'pidgeot':['normal','flying'],'shiny pidgeot':['normal','flying'],'fearow':['normal','flying'],'shiny fearow':['normal','flying'],
  'dodrio':['normal','flying'],'shiny dodrio':['normal','flying'],'kangaskhan':['normal'],'shiny kangaskhan':['normal'],
  'snorlax':['normal'],'shiny snorlax':['normal'],'muk':['poison'],'shiny muk':['poison'],
  // Ground/Rock
  'golem':['rock','ground'],'shiny golem':['rock','ground'],'marowak':['ground'],'shiny marowak':['ground'],
  'nidoking':['poison','ground'],'shiny nidoking':['poison','ground'],'nidoqueen':['poison','ground'],'shiny nidoqueen':['poison','ground'],
  'rhydon':['ground','rock'],'shiny rhydon':['ground','rock'],'dugtrio':['ground'],'shiny dugtrio':['ground'],
  'omastar':['rock','water'],'shiny omastar':['rock','water'],'kabutops':['rock','water'],'shiny kabutops':['rock','water'],
  // Steel/Ice
  'scizor':['bug','steel'],'shiny scizor':['bug','steel'],'steelix':['steel','ground'],'shiny steelix':['steel','ground'],
  'skarmory':['steel','flying'],'shiny skarmory':['steel','flying'],'onix':['rock','ground'],'shiny onix':['rock','ground'],
  'jynx':['ice','psychic'],'shiny jynx':['ice','psychic'],'pinsir':['bug'],'shiny pinsir':['bug'],
  // Poison/Bug
  'arbok':['poison'],'shiny arbok':['poison'],'crobat':['poison','flying'],'shiny crobat':['poison','flying'],
  'ariados':['bug','poison'],'shiny ariados':['bug','poison'],'tentacruel':['water','poison'],'shiny tentacruel':['water','poison'],
  'toxicroak':['poison','fighting'],'shiny toxicroak':['poison','fighting'],
  // Dragon
  'dragonair':['dragon'],'shiny dragonair':['dragon'],
  // Others
  'tauros':['normal'],'shiny tauros':['normal'],'persian':['normal'],'shiny persian':['normal'],
  'gligar':['ground','flying'],'arcanine':['fire'],'shiny arcanine':['fire'],
  'blastoise':['water'],'shiny blastoise':['water'],'pupitar':['rock','ground'],'shiny pupitar':['rock','ground'],
  'murkrow':['dark','flying'],'shiny murkrow':['dark','flying'],'ninetales':['fire'],'shiny ninetales':['fire'],
};

// Tabela completa de multiplicadores de dano por tipo atacante vs tipo defensor
// 0 = imune, 0.5 = resistente, 1 = neutro, 2 = fraco
var TYPE_CHART = {
  normal:   { fighting:2, ghost:0 },
  fire:     { fire:0.5, water:2, grass:0.5, ice:0.5, ground:2, rock:2, bug:0.5, steel:0.5, fairy:0.5 },
  water:    { fire:0.5, water:0.5, electric:2, grass:2, ice:0.5, steel:0.5 },
  electric: { electric:0.5, ground:2, flying:0.5, steel:0.5 },
  grass:    { fire:2, water:0.5, electric:0.5, grass:0.5, ice:2, poison:2, ground:0.5, flying:2, bug:2 },
  ice:      { fire:2, ice:0.5, fighting:2, rock:2, steel:2 },
  fighting: { flying:2, psychic:2, bug:0.5, rock:0.5, dark:0.5, fairy:2 },
  poison:   { fighting:0.5, poison:0.5, ground:2, bug:0.5, grass:0.5, psychic:2, fairy:0.5 },
  ground:   { water:2, electric:0, grass:2, ice:2, poison:0.5, rock:0.5 },
  flying:   { electric:2, grass:0.5, ice:2, fighting:0.5, ground:0, bug:0.5, rock:2 },
  psychic:  { fighting:0.5, psychic:0.5, bug:2, ghost:2, dark:2 },
  bug:      { fire:2, grass:0.5, fighting:0.5, ground:0.5, flying:2, rock:2 },
  rock:     { normal:0.5, fire:0.5, water:2, grass:2, fighting:2, poison:0.5, ground:2, flying:0.5, steel:2 },
  ghost:    { normal:0, fighting:0, poison:0.5, bug:0.5, ghost:2, dark:2 },
  dragon:   { fire:0.5, water:0.5, electric:0.5, grass:0.5, ice:2, dragon:2, fairy:2 },
  dark:     { fighting:2, psychic:0, bug:2, ghost:0.5, dark:0.5, fairy:2 },
  steel:    { normal:0.5, fire:2, water:0.5, electric:0.5, grass:0.5, ice:0.5, fighting:2, poison:0, ground:2, flying:0.5, psychic:0.5, bug:0.5, rock:0.5, dragon:0.5, steel:0.5, fairy:0.5 },
  fairy:    { fighting:0.5, bug:0.5, dark:0.5, poison:2, steel:2, dragon:0 },
};

// Calcula as fraquezas reais considerando duplo tipo (resistências cancelam fraquezas)
function getPokeWeaknesses(pokeName) {
  var types = POKE_TYPES[pokeName.toLowerCase()] || [];
  if (!types.length) return [];

  var allAttackTypes = ['normal','fire','water','electric','grass','ice','fighting','poison',
                        'ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];

  var weaknesses = [];
  allAttackTypes.forEach(function(atk) {
    var mult = 1;
    types.forEach(function(def) {
      var row = TYPE_CHART[def];
      if (row && row[atk] !== undefined) mult *= row[atk];
    });
    if (mult > 1) weaknesses.push(atk);
  });
  return weaknesses;
}

// Pokémons no POKEMONS array por tipo principal (para sugerir counters)
var TYPE_COUNTERS = {
  water:    ['electric','grass'],
  fire:     ['water','rock','ground'],
  grass:    ['fire','ice','flying','bug','poison'],
  electric: ['ground'],
  psychic:  ['dark','ghost','bug'],
  ghost:    ['ghost','dark'],
  dark:     ['fighting','fairy','bug'],
  fighting: ['psychic','flying'],
  poison:   ['ground','psychic'],
  ground:   ['water','grass','ice'],
  flying:   ['electric','ice','rock'],
  rock:     ['water','grass','fighting','ground'],
  ice:      ['fire','fighting','rock','steel'],
  dragon:   ['ice','fairy','dragon'],
  steel:    ['fire','fighting','ground'],
  normal:   ['fighting'],
  bug:      ['fire','flying','rock'],
};

// Tipo de cada Pokémon disponível no POKEMONS (para counters)
var POKE_TYPE_MAIN = {
  'shiny ampharos':'electric','shiny arbok':'poison','shiny ariados':'bug','shiny bellossom':'grass',
  'shiny blastoise':'water','shiny charizard':'fire','shiny crobat':'poison','shiny donphan':'ground',
  'shiny dugtrio':'ground','shiny espeon':'psychic','shiny exeggutor':'grass','shiny farfetch\'d':'normal',
  'shiny fearow':'normal','shiny feraligatr':'water','shiny flareon':'fire','shiny golem':'rock',
  'shiny gyarados':'water','shiny hitmonchan':'fighting','shiny hitmonlee':'fighting','shiny hitmontop':'fighting',
  'shiny jolteon':'electric','shiny jynx':'ice','shiny kingdra':'dragon','shiny lapras':'water',
  'shiny machamp':'fighting','shiny magcargo':'fire','shiny magneton':'electric','shiny mantine':'water',
  'shiny marowak':'ground','shiny meganium':'grass','shiny misdreavus':'ghost','shiny muk':'poison',
  'shiny nidoking':'poison','shiny nidoqueen':'poison','shiny ninetales':'fire','shiny onix':'rock',
  'shiny persian':'normal','shiny pidgeot':'normal','shiny politoad':'water','shiny poliwrath':'water',
  'shiny primeape':'fighting','shiny qwilfish':'water','shiny raichu':'electric','shiny rapidash':'fire',
  'shiny rhydon':'ground','shiny sandslash':'ground','shiny scizor':'steel','shiny skarmory':'steel',
  'shiny slowking':'water','shiny starmie':'water','shiny steelix':'steel','shiny tangela':'grass',
  'shiny tangrowth':'grass','shiny tentacruel':'water','shiny torterra':'grass','shiny toxicroak':'poison',
  'shiny typhlosion':'fire','shiny umbreon':'dark','shiny vaporeon':'water','shiny venusaur':'grass',
  'shiny victreebel':'grass','shiny vileplume':'grass','shiny xatu':'psychic','shiny dodrio':'normal',
  'shiny heracross':'bug','shiny arcanine':'fire','shiny kangaskhan':'normal','shiny delibird':'ice',
  'shiny dusknoir':'ghost','shiny espeon':'psychic','shiny luxray':'electric','shiny dragonair':'dragon',
  'shiny pinsir':'bug','shiny tauros':'normal','shiny electrode':'electric',
  'dusknoir':'ghost','luxray':'electric','tangrowth':'grass','torterra':'grass','shiny machamp':'fighting',
};



function getCountersFromPOKEMONS(pokeName) {
  var weaknesses = getPokeWeaknesses(pokeName);
  if (!weaknesses.length) return [];
  var results = [];
  POKEMONS.forEach(function(p) {
    // Usa o tipo do banner (tipo que o Pokémon realmente usa no servidor)
    var pType = getTypeFromBanner(p.bannerImage);
    if (pType && weaknesses.indexOf(pType) !== -1) {
      results.push(p);
    }
  });
  // Ordena por tier: t1 > t2 > t3 > super-raro
  var tierOrder = { 't1':1,'t2':2,'t3':3,'t4':4,'t5':5,'super-raro':0,'hard':6,'mark':7 };
  results.sort(function(a,b) {
    return (tierOrder[a.tag]||9) - (tierOrder[b.tag]||9);
  });
  return results;
}

function getRocketsUsingPokemon(pokeName) {
  var norm = pokeName.toLowerCase();
  var found = [];
  RAW_ROCKETS.forEach(function(rocket) {
    rocket.pokemons.forEach(function(entry) {
      if (entry.name.toLowerCase() === norm) {
        found.push(rocket.name);
      }
    });
  });
  return found;
}

function openRocketPokeInfo(pokeName) {
  var existing = document.getElementById('rocket-poke-modal');
  if (existing) existing.remove();

  var counters = getCountersFromPOKEMONS(pokeName);
  var usedBy   = getRocketsUsingPokemon(pokeName);
  var weaknesses = getPokeWeaknesses(pokeName);
  var types = (POKE_TYPES[pokeName.toLowerCase()] || []);
  var spriteUrl = getShowdownSpriteRocket(pokeName);

  var TCFG = {
    't1':{'label':'T1','cls':'tier-t1'},'t2':{'label':'T2','cls':'tier-t2'},'t3':{'label':'T3','cls':'tier-t3'},
    't4':{'label':'T4','cls':'tier-t4'},'t5':{'label':'T5','cls':'tier-t5'},'hard':{'label':'HARD','cls':'tier-hard'},
    'mark':{'label':'MARK','cls':'tier-mark'},'super-raro':{'label':'SUPER RARO','cls':'tier-super-raro'},
  };

  var TYPE_COLORS_LOCAL = {
    fire:'#f97316',water:'#3b82f6',grass:'#22c55e',electric:'#eab308',psychic:'#ec4899',
    ghost:'#8b5cf6',dark:'#6b7280',fighting:'#ef4444',poison:'#a855f7',ground:'#b45309',
    flying:'#7dd3fc',rock:'#a3a3a3',ice:'#67e8f9',dragon:'#6366f1',steel:'#94a3b8',
    normal:'#d4d4d4',bug:'#84cc16',fairy:'#f9a8d4',
  };

  var typeChips = types.map(function(t) {
    var c = TYPE_COLORS_LOCAL[t] || '#aaa';
    return '<span style="background:'+c+';color:#000;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase;">'+t+'</span>';
  }).join(' ');

  var weakChips = weaknesses.map(function(t) {
    var c = TYPE_COLORS_LOCAL[t] || '#aaa';
    return '<span style="background:'+c+'22;border:1px solid '+c+';color:'+c+';font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase;">'+t+'</span>';
  }).join(' ');

  var usedByHtml = usedBy.length
    ? usedBy.map(function(n){return '<span class="rpoke-rocket-tag">🚀 '+n+'</span>';}).join('')
    : '<span style="color:#666;font-size:12px">Nenhum</span>';

  var counterCards = counters.length
    ? counters.map(function(p) {
        var tc = TCFG[p.tag] ? '<span class="tier-tag '+TCFG[p.tag].cls+'">'+TCFG[p.tag].label+'</span>' : '';
        var spr = getShowdownSpriteRocket(p.name);
        var gif = p.image || '';
        var mainSrc = gif || spr;
        var isShinyCounter = /^sh\s+/i.test(p.name) || /^shiny\s+/i.test(p.name);
        var counterLookup = p.name.replace(/^sh\s+/i,'').replace(/^shiny\s+/i,'').trim().toLowerCase().replace(/\s+/g,'-');
        var counterTypes = POKE_TYPES[counterLookup] || [];
        var counterTypeChips = counterTypes.map(function(t) {
          var bm = BANNER_TYPE_MAP.find(function(m) { return m.type === t; });
          return bm ? '<img src="https://i.imgur.com/'+bm.url+'.png" alt="'+t+'" title="'+t+'" style="width:16px;height:16px;object-fit:contain;border-radius:3px" loading="lazy" />' : '';
        }).join('');
        var counterDisplayName = isShinyCounter
          ? '<span style="color:#ffd166;font-weight:700">✨ '+p.name+'</span>'
          : p.name;
        return '<div class="rpoke-counter-card">' +
          '<img src="'+mainSrc+'" alt="'+p.name+'" onerror="this.src=\''+spr+'\';this.onerror=null;" />' +
          '<div class="rpoke-counter-name">'+counterDisplayName+'</div>' +
          (counterTypeChips ? '<div style="display:flex;flex-wrap:wrap;gap:2px;justify-content:center">'+counterTypeChips+'</div>' : '') +
          '<div>'+tc+'</div>' +
        '</div>';
      }).join('')
    : '<div style="color:#666;font-size:12px;padding:8px">Nenhum counter encontrado no catálogo.</div>';

  var modal = document.createElement('div');
  modal.id = 'rocket-poke-modal';
  modal.innerHTML =
    '<div class="rpoke-backdrop" onclick="document.getElementById(\'rocket-poke-modal\').remove()"></div>' +
    '<div class="rpoke-panel">' +
      '<button class="rpoke-close" onclick="document.getElementById(\'rocket-poke-modal\').remove()">✕</button>' +
      '<div class="rpoke-header">' +
        '<img class="rpoke-main-sprite" src="'+spriteUrl+'" alt="'+pokeName+'" onerror="this.style.opacity=\'0.3\'" />' +
        '<div class="rpoke-title-block">' +
          '<div class="rpoke-poke-name">'+pokeName+'</div>' +
          '<div class="rpoke-chips">'+typeChips+'</div>' +
        '</div>' +
      '</div>' +

      '<div class="rpoke-section-label">⚔️ Fraquezas</div>' +
      '<div class="rpoke-chips-row">'+(weakChips||'<span style="color:#666;font-size:12px">Sem fraquezas conhecidas</span>')+'</div>' +

      '<div class="rpoke-section-label">🚀 Usado pelos Rockets</div>' +
      '<div class="rpoke-usedby">'+usedByHtml+'</div>' +

      '<div class="rpoke-section-label">✅ Pokémons recomendados para batalhar</div>' +
      '<div class="rpoke-counters-grid">'+counterCards+'</div>' +
    '</div>';

  document.body.appendChild(modal);
}

// ===================== NPC SUB-CATEGORIAS =====================
function switchNpcSubcat(subcat, btn) {
  document.querySelectorAll('.npc-subcat-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.npc-subcat-content').forEach(function(el) { el.style.display = 'none'; });
  var panel = document.getElementById('npc-tab-' + subcat);
  if (panel) panel.style.display = 'block';
  if (subcat === 'rockets') renderRockets();
  if (subcat === 'officers') renderOfficers();
}

function renderRockets() {
  var grid = document.getElementById('rockets-grid');
  if (!grid) return;

  var q = (document.getElementById('rockets-search') ? document.getElementById('rockets-search').value : '').toLowerCase().trim();

  var filtered = RAW_ROCKETS.filter(function(r) {
    return !q || r.name.toLowerCase().includes(q);
  });

  document.getElementById('rockets-count-label').textContent = filtered.length + ' rockets';

  if (!filtered.length) {
    grid.innerHTML = '<div class="wiki-empty-state"><span class="empty-icon">🚀</span><span class="empty-label">Nenhum Rocket encontrado.</span></div>';
    return;
  }

  grid.innerHTML = filtered.map(function(rocket, idx) {
    var isGiovanni = rocket.name === 'Giovanni';

    var pokeCards = rocket.pokemons.map(function(entry) {
      var pokeName = entry.name;
      var rewardKey = entry.reward;
      var rewardData = getRocketRewardData(rewardKey);
      var rewardName = rewardKey.replace(/^sh\s+/i, 'Shiny ');
      var rewardTag = rewardData ? rewardData.tag : null;
      var rewardImg = rewardData ? rewardData.image : null;
      var TCFG = {
        't1':{'label':'T1','cls':'tier-t1'},'t2':{'label':'T2','cls':'tier-t2'},'t3':{'label':'T3','cls':'tier-t3'},
        't4':{'label':'T4','cls':'tier-t4'},'t5':{'label':'T5','cls':'tier-t5'},'hard':{'label':'HARD','cls':'tier-hard'},
        'mark':{'label':'MARK','cls':'tier-mark'},'super-raro':{'label':'SUPER RARO','cls':'tier-super-raro'},
      };
      var tagHtml = rewardTag && TCFG[rewardTag.toLowerCase()]
        ? '<span class="tier-tag '+TCFG[rewardTag.toLowerCase()].cls+'">'+TCFG[rewardTag.toLowerCase()].label+'</span>'
        : '';
      var spriteUrl    = getShowdownSpriteRocket(pokeName);
      var rewardSpriteUrl = rewardImg || getShowdownSpriteRocket(rewardName);

      var isShinyPoke = /^sh\s+/i.test(pokeName) || /^shiny\s+/i.test(pokeName);
      var displayPokeName = isShinyPoke
        ? '<span style="color:#ffd166;font-weight:700">✨ '+pokeName+'</span>'
        : '<span style="color:var(--text-muted,#aab)">'+pokeName+'</span>';
      var lookupKeyRocket = pokeName.replace(/^sh\s+/i,'').replace(/^shiny\s+/i,'').trim().toLowerCase().replace(/\s+/g,'-');
      var typesRocket = POKE_TYPES[lookupKeyRocket] || [];
      var typeChipsRocket = typesRocket.map(function(t) {
        var bm = BANNER_TYPE_MAP.find(function(m) { return m.type === t; });
        return bm ? '<img src="https://i.imgur.com/'+bm.url+'.png" alt="'+t+'" title="'+t+'" style="width:18px;height:18px;object-fit:contain;border-radius:3px" loading="lazy" />' : '';
      }).join('');

      return '<div class="rocket-poke-card" style="flex-direction:column;gap:4px" onclick="openRocketPokeInfo(\''+pokeName.replace(/'/g,"\\'")+'\')" title="Ver info de '+pokeName+'">' +
        '<img class="rocket-poke-sprite" src="'+spriteUrl+'" alt="'+pokeName+'" loading="lazy" onerror="this.src=\'https://play.pokemonshowdown.com/sprites/gen5/substitute.png\'" />' +
        '<div class="rocket-poke-name" style="font-size:11px;text-align:center;line-height:1.2">'+displayPokeName+'</div>' +
        (typeChipsRocket ? '<div style="display:flex;flex-wrap:wrap;gap:3px;justify-content:center;margin-top:2px">'+typeChipsRocket+'</div>' : '') +
        '<div class="rocket-poke-info-hint">🔍 ver info</div>' +
      '</div>';
    }).join('');

    var winsNote = rocket.wins ? '<span class="rocket-wins-note">🏆 Requer '+rocket.wins+' batalhas contra os demais Rockets</span>' : '';
    var headerClass = isGiovanni ? 'rocket-row-header giovanni-header' : 'rocket-row-header';

    return '<div class="rocket-row'+(isGiovanni?' giovanni-row':'')+'" id="rocket-row-'+idx+'">' +
      '<div class="'+headerClass+'" onclick="toggleRocketRow('+idx+')">' +
        '<span class="rocket-row-icon">'+(isGiovanni?'👑':'🚀')+'</span>' +
        '<span class="rocket-row-name">'+rocket.name+'</span>' +
        (winsNote?winsNote:'') +
        '<svg class="rocket-row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' +
      '</div>' +
      '<div class="rocket-row-panel">' +
        '<div class="rocket-poke-grid">'+pokeCards+'</div>' +
      '</div>' +
    '</div>';
  }).join('');

  if (!document.getElementById('npcs-css')) {
    var npcStyle = document.createElement('style');
    npcStyle.id = 'npcs-css';
    npcStyle.textContent = `
      .npc-subcats {
        display: flex;
        gap: 8px;
        padding: 12px 0 4px;
        flex-wrap: wrap;
      }
      .npc-subcat-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 7px 18px;
        background: rgba(255,255,255,0.04);
        border: 1px solid var(--border, #2a2f45);
        border-radius: 20px;
        color: var(--muted, #8899aa);
        font-family: var(--font-title, inherit);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        transition: all 0.18s;
      }
      .npc-subcat-btn:hover {
        background: rgba(96,170,255,0.08);
        border-color: rgba(96,170,255,0.35);
        color: #fff;
      }
      .npc-subcat-btn.active {
        background: rgba(96,170,255,0.12);
        border-color: rgba(96,170,255,0.6);
        color: #60aaff;
      }
      .npc-subcat-content { display: none; }
      .npc-subcat-content:first-of-type { display: block; }
    `;
    document.head.appendChild(npcStyle);
  }

  if (!document.getElementById('rockets-css')) {
    var style = document.createElement('style');
    style.id = 'rockets-css';
    style.textContent = `
      #rockets-grid { padding: 8px 0; }
      .rocket-row { border: 1px solid var(--border, #2a2f45); border-radius: 10px; margin-bottom: 10px; overflow: hidden; background: var(--card-bg, #161b2e); transition: box-shadow 0.2s; }
      .rocket-row:hover { box-shadow: 0 0 12px rgba(96,170,255,0.15); }
      .giovanni-row { border-color: #f5c518 !important; box-shadow: 0 0 18px rgba(245,197,24,0.18); }
      .rocket-row-header { display: flex; align-items: center; gap: 10px; padding: 13px 16px; cursor: pointer; user-select: none; transition: background 0.15s; }
      .rocket-row-header:hover { background: rgba(255,255,255,0.04); }
      .giovanni-header { background: linear-gradient(90deg, rgba(245,197,24,0.12) 0%, transparent 100%); }
      .rocket-row-icon { font-size: 18px; }
      .rocket-row-name { font-weight: 700; font-size: 15px; flex: 1; }
      .rocket-wins-note { font-size: 11px; color: #f5c518; background: rgba(245,197,24,0.1); border-radius: 5px; padding: 2px 8px; white-space: nowrap; }
      .rocket-row-chevron { width: 18px; height: 18px; stroke: var(--muted, #8899aa); transition: transform 0.2s; }
      .rocket-row.open .rocket-row-chevron { transform: rotate(180deg); }
      .rocket-row-panel { display: none; padding: 4px 12px 14px; border-top: 1px solid var(--border, #2a2f45); }
      .rocket-row.open .rocket-row-panel { display: block; }
      .rocket-poke-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; margin-top: 10px; }
      .rocket-poke-card { background: rgba(255,255,255,0.03); border: 1px solid var(--border, #2a2f45); border-radius: 8px; padding: 10px 8px; display: flex; align-items: center; gap: 6px; justify-content: space-between; transition: background 0.15s, border-color 0.15s; cursor: pointer; }
      .rocket-poke-card:hover { background: rgba(96,170,255,0.08); border-color: rgba(96,170,255,0.4); }
      .rocket-poke-enemy, .rocket-poke-reward { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; }
      .rocket-poke-sprite { width: 56px; height: 56px; image-rendering: pixelated; object-fit: contain; }
      .reward-sprite { filter: drop-shadow(0 0 6px rgba(96,170,255,0.35)); }
      .rocket-poke-name, .rocket-poke-reward-name { font-size: 11px; text-align: center; color: var(--text-muted, #aab); line-height: 1.2; }
      .rocket-poke-reward-name { color: var(--accent, #60aaff); font-weight: 600; }
      .rocket-poke-tags { margin-top: 3px; }
      .rocket-poke-arrow { font-size: 16px; color: var(--muted, #556); flex-shrink: 0; }
      .rocket-poke-info-hint { font-size: 9px; color: rgba(96,170,255,0.5); margin-top: 2px; }
      .rocket-poke-card:hover .rocket-poke-info-hint { color: rgba(96,170,255,0.9); }
      .tier-super-raro { background: linear-gradient(90deg,#a855f7,#ec4899); color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; }

      /* ── Modal Pokémon Info ── */
      .rpoke-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 9000; }
      .rpoke-panel { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); z-index: 9001; background: #0f1628; border: 1px solid #2a2f45; border-radius: 14px; width: min(520px, 94vw); max-height: 85vh; overflow-y: auto; padding: 20px 20px 24px; box-shadow: 0 8px 40px rgba(0,0,0,0.6); }
      .rpoke-close { position: absolute; top: 12px; right: 14px; background: none; border: none; color: #aaa; font-size: 18px; cursor: pointer; padding: 4px 8px; border-radius: 6px; transition: background 0.15s; }
      .rpoke-close:hover { background: rgba(255,255,255,0.08); color: #fff; }
      .rpoke-header { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
      .rpoke-main-sprite { width: 80px; height: 80px; image-rendering: pixelated; }
      .rpoke-poke-name { font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 6px; }
      .rpoke-chips { display: flex; flex-wrap: wrap; gap: 4px; }
      .rpoke-section-label { font-size: 11px; font-weight: 700; color: #60aaff; text-transform: uppercase; letter-spacing: 0.08em; margin: 14px 0 7px; }
      .rpoke-chips-row { display: flex; flex-wrap: wrap; gap: 5px; }
      .rpoke-usedby { display: flex; flex-wrap: wrap; gap: 6px; }
      .rpoke-rocket-tag { background: rgba(96,170,255,0.1); border: 1px solid rgba(96,170,255,0.3); color: #60aaff; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
      .rpoke-counters-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; margin-top: 4px; }
      .rpoke-counter-card { background: rgba(255,255,255,0.03); border: 1px solid #2a2f45; border-radius: 8px; padding: 8px 4px; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: background 0.15s; }
      .rpoke-counter-card:hover { background: rgba(96,170,255,0.07); }
      .rpoke-counter-card img { width: 52px; height: 52px; image-rendering: pixelated; cursor: pointer; }
      .rpoke-counter-name { font-size: 10px; text-align: center; color: #ccd; line-height: 1.2; }

      @media (max-width: 480px) {
        .rocket-poke-grid { grid-template-columns: 1fr 1fr; }
        .rocket-poke-sprite { width: 44px; height: 44px; }
        .rpoke-counters-grid { grid-template-columns: repeat(3, 1fr); }
      }
    `;
    document.head.appendChild(style);
  }
}

function toggleRocketRow(idx) {
  var row = document.getElementById('rocket-row-' + idx);
  if (!row) return;
  var isOpen = row.classList.contains('open');
  document.querySelectorAll('.rocket-row.open').forEach(function(r) { r.classList.remove('open'); });
  if (!isOpen) row.classList.add('open');
}

// ===================== OFFICERS =====================

// Tipo temático de cada Officer → banner image URL
var OFFICER_TYPE_BANNER = {
  'Officer Blaze':    'https://i.imgur.com/O8TONGE.png',  // fire
  'Officer Marina':   'https://i.imgur.com/zpRe43i.png',  // water
  'Sergeant Volt':    'https://i.imgur.com/Yv2WEYc.png',  // electric
  'Captain Verdant':  'https://i.imgur.com/YjKxtoE.png',  // grass
  'Inspector Frost':  'https://i.imgur.com/ssFz0sA.png',  // ice
  'Commander Mind':   'https://i.imgur.com/ASiZi1K.png',  // psychic
  'Warden Shade':     'https://i.imgur.com/7Luj4az.png',  // dark
  'Lieutenant Alloy': 'https://i.imgur.com/GleRjiM.png',  // steel
  'Marshal Boulder':  'https://i.imgur.com/GvD1Mtq.png',  // rock
  'Detective Terra':  'https://i.imgur.com/JPcD2l3.png',  // ground
  'Chief Toxin':      'https://i.imgur.com/xfX0ReE.png',  // poison
  'Ranger Strike':    'https://i.imgur.com/OKsJXh7.png',  // fighting
  'Captain Chitin':   'https://i.imgur.com/V4IXR51.png',  // bug
};

// Tipo temático de cada Officer (para calcular fraquezas/counters no modal)
var OFFICER_TYPE_KEY = {
  'Officer Blaze':    'fire',
  'Officer Marina':   'water',
  'Sergeant Volt':    'electric',
  'Captain Verdant':  'grass',
  'Inspector Frost':  'ice',
  'Commander Mind':   'psychic',
  'Warden Shade':     'dark',
  'Lieutenant Alloy': 'steel',
  'Marshal Boulder':  'rock',
  'Detective Terra':  'ground',
  'Chief Toxin':      'poison',
  'Ranger Strike':    'fighting',
  'Captain Chitin':   'bug',
};

var RAW_OFFICERS = [
  { name: 'Officer Blaze',    icon: '🔥', rank: 'officer',
    pokemons: ['sh Charizard','sh Magmar','sh Flareon','sh Typhlosion','sh Ninetales','sh Arcanine'] },
  { name: 'Officer Marina',   icon: '💧', rank: 'officer',
    pokemons: ['sh Feraligatr','sh Lapras','sh Gyarados','sh Vaporeon','sh Starmie','sh Blastoise'] },
  { name: 'Sergeant Volt',    icon: '⚡', rank: 'sergeant',
    pokemons: ['sh Magneton','sh Ampharos','sh Lanturn','sh Electabuzz','sh Raichu','sh Jolteon'] },
  { name: 'Captain Verdant',  icon: '🌿', rank: 'captain',
    pokemons: ['sh Meganium','sh Vileplume','sh Venusaur','sh Exeggutor','sh Victreebel','sh Jumpluff'] },
  { name: 'Inspector Frost',  icon: '❄️', rank: 'inspector',
    pokemons: ['sh Piloswine','sh Cloyster','sh Jynx','sh Lapras','sh Dewgong','sh Sneasel'] },
  { name: 'Commander Mind',   icon: '🔮', rank: 'commander',
    pokemons: ['sh Starmie','sh Alakazam','sh Espeon','sh Exeggutor','sh Mr. Mime','sh Xatu'] },
  { name: 'Warden Shade',     icon: '👻', rank: 'warden',
    pokemons: ['Houndoom','sh Sneasel','Tyranitar','sh Houndoom','sh Tyranitar','sh Umbreon'] },
  { name: 'Lieutenant Alloy', icon: '⚙️', rank: 'lieutenant',
    pokemons: ['sh Scizor','sh Magneton','sh Skarmory','sh Steelix','sh Forretress','Scizor'] },
  { name: 'Marshal Boulder',  icon: '🪨', rank: 'marshal',
    pokemons: ['sh Omastar','sh Golem','sh Tyranitar','sh Sudowoodo','sh Kabutops','sh Rhydon'] },
  { name: 'Detective Terra',  icon: '🌍', rank: 'detective',
    pokemons: ['sh Nidoqueen','sh Nidoking','sh Marowak','sh Sandslash','sh Donphan','sh Dugtrio'] },
  { name: 'Chief Toxin',      icon: '☠️', rank: 'chief',
    pokemons: ['sh Weezing','sh Muk','sh Nidoking','sh Crobat','sh Toxicroak','sh Vileplume'] },
  { name: 'Ranger Strike',    icon: '🥊', rank: 'ranger',
    pokemons: ['sh Primeape','sh Machamp','sh Heracross','sh Hitmonchan','sh Poliwrath','sh Hitmonlee'] },
  { name: 'Captain Chitin',   icon: '🪲', rank: 'captain',
    pokemons: ['sh Forretress','sh Ariados','sh Scyther','sh Scizor','sh Pinsir','sh Heracross'] },
];

var OFFICER_RANK_CONFIG = {
  officer:    { color: '#3b82f6', label: 'Officer'    },
  sergeant:   { color: '#22c55e', label: 'Sergeant'   },
  captain:    { color: '#f59e0b', label: 'Captain'    },
  inspector:  { color: '#60a5fa', label: 'Inspector'  },
  commander:  { color: '#a855f7', label: 'Commander'  },
  warden:     { color: '#6b7280', label: 'Warden'     },
  lieutenant: { color: '#94a3b8', label: 'Lieutenant' },
  marshal:    { color: '#b45309', label: 'Marshal'    },
  detective:  { color: '#ec4899', label: 'Detective'  },
  chief:      { color: '#ef4444', label: 'Chief'      },
  ranger:     { color: '#84cc16', label: 'Ranger'     },
};

var _officersSearchTimer;

function officerPokeKey(rawName) {
  return rawName.replace(/^sh\s+/i, 'shiny ').toLowerCase().trim();
}

function getOfficerSprite(rawName) {
  var isShiny = /^sh\s+/i.test(rawName);
  var n = toShowdownName((isShiny ? 'shiny ' : '') + rawName.replace(/^sh\s+/i, ''));
  return isShiny
    ? 'https://play.pokemonshowdown.com/sprites/ani-shiny/' + n + '.gif'
    : 'https://play.pokemonshowdown.com/sprites/ani/' + n + '.gif';
}

function getOfficerFallbackSprite(rawName) {
  var isShiny = /^sh\s+/i.test(rawName);
  var n = toShowdownName((isShiny ? 'shiny ' : '') + rawName.replace(/^sh\s+/i, ''));
  return isShiny
    ? 'https://play.pokemonshowdown.com/sprites/gen5-shiny/' + n + '.png'
    : 'https://play.pokemonshowdown.com/sprites/gen5/' + n + '.png';
}

function renderOfficers() {
  var grid = document.getElementById('officers-grid');
  if (!grid) return;

  var q = (document.getElementById('officers-search') ? document.getElementById('officers-search').value : '').toLowerCase().trim();
  var filtered = RAW_OFFICERS.filter(function(o) { return !q || o.name.toLowerCase().includes(q); });

  document.getElementById('officers-count-label').textContent = filtered.length + ' officers';

  if (!filtered.length) {
    grid.innerHTML = '<div class="wiki-empty-state"><span class="empty-icon">👮</span><span class="empty-label">Nenhum Officer encontrado.</span></div>';
    return;
  }

  grid.innerHTML = filtered.map(function(officer, idx) {
    var rankCfg   = OFFICER_RANK_CONFIG[officer.rank] || { color: '#60aaff', label: officer.rank };
    var isHighRank = (officer.rank === 'captain' || officer.rank === 'commander' || officer.rank === 'chief' || officer.rank === 'marshal');
    var bannerUrl  = OFFICER_TYPE_BANNER[officer.name];

    var rankBadge = '<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase;background:'+rankCfg.color+'22;border:1px solid '+rankCfg.color+';color:'+rankCfg.color+'">'+rankCfg.label+'</span>';

    // Banner de tipo no header — substitui o ícone/emoji à esquerda
    var typeBannerHtml = bannerUrl
      ? '<img src="'+bannerUrl+'" alt="tipo" style="width:28px;height:28px;object-fit:contain;border-radius:4px;flex-shrink:0" loading="lazy" />'
      : '<span class="rocket-row-icon">'+officer.icon+'</span>';

    var pokeCards = officer.pokemons.map(function(rawName) {
      var isShiny   = /^sh\s+/i.test(rawName);
      var lookupKey = officerPokeKey(rawName);
      var types     = POKE_TYPES[lookupKey] || [];
      var spriteUrl = getOfficerSprite(rawName);
      var fallback  = getOfficerFallbackSprite(rawName);

      // Chips de tipo usando imagem do banner
      var typeChips = types.map(function(t) {
        var bannerImg = BANNER_TYPE_MAP.find(function(m) { return m.type === t; });
        if (bannerImg) {
          return '<img src="https://i.imgur.com/'+bannerImg.url+'.png" alt="'+t+'" title="'+t+'" '+
            'style="width:18px;height:18px;object-fit:contain;border-radius:3px" loading="lazy" />';
        }
        return '';
      }).join('');

      var displayName = isShiny
        ? '<span style="color:#ffd166;font-weight:700">✨ '+rawName+'</span>'
        : '<span style="color:var(--text-muted,#aab)">'+rawName+'</span>';

      return '<div class="rocket-poke-card" style="flex-direction:column;gap:4px;cursor:pointer" '+
        'onclick="openOfficerPokeInfo(\''+rawName.replace(/'/g,"\\'")+'\''+')" title="Ver info de '+rawName+'">' +
        '<img class="rocket-poke-sprite" src="'+spriteUrl+'" alt="'+rawName+'" loading="lazy" '+
          'onerror="this.src=\''+fallback+'\';this.onerror=function(){this.src=\'https://play.pokemonshowdown.com/sprites/gen5/substitute.png\'}" />' +
        '<div class="rocket-poke-name" style="font-size:11px;text-align:center;line-height:1.2">'+displayName+'</div>' +
        (typeChips ? '<div style="display:flex;flex-wrap:wrap;gap:3px;justify-content:center;margin-top:2px">'+typeChips+'</div>' : '') +
        '<div class="rocket-poke-info-hint">🔍 ver info</div>' +
      '</div>';
    }).join('');

    return '<div class="rocket-row" id="officer-row-'+idx+'" '+
      'style="'+(isHighRank ? 'border-color:'+rankCfg.color+'88!important;box-shadow:0 0 14px '+rankCfg.color+'22;' : '')+'">' +
      '<div class="rocket-row-header" onclick="toggleOfficerRow('+idx+')" '+
        'style="'+(isHighRank ? 'background:linear-gradient(90deg,'+rankCfg.color+'18 0%,transparent 100%);' : '')+'">' +
        typeBannerHtml +
        '<span class="rocket-row-name">'+officer.name+'</span>' +
        rankBadge +
        '<svg class="rocket-row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' +
      '</div>' +
      '<div class="rocket-row-panel">' +
        '<div class="rocket-poke-grid">'+pokeCards+'</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function toggleOfficerRow(idx) {
  var row = document.getElementById('officer-row-' + idx);
  if (!row) return;
  var isOpen = row.classList.contains('open');
  document.querySelectorAll('#officers-grid .rocket-row.open').forEach(function(r) { r.classList.remove('open'); });
  if (!isOpen) row.classList.add('open');
}

function openOfficerPokeInfo(rawName) {
  var existing = document.getElementById('officer-poke-modal');
  if (existing) existing.remove();

  var lookupKey  = officerPokeKey(rawName);
  var isShiny    = /^sh\s+/i.test(rawName);
  var counters   = getCountersFromPOKEMONS(lookupKey);
  var weaknesses = getPokeWeaknesses(lookupKey);
  var types      = POKE_TYPES[lookupKey] || [];
  var spriteUrl  = getOfficerSprite(rawName);
  var fallback   = getOfficerFallbackSprite(rawName);

  // Qual Officer usa este Pokémon
  var usedBy = [];
  RAW_OFFICERS.forEach(function(o) {
    o.pokemons.forEach(function(p) {
      if (p.toLowerCase() === rawName.toLowerCase()) usedBy.push(o.name);
    });
  });

  var TCFG = {
    't1':{'label':'T1','cls':'tier-t1'},'t2':{'label':'T2','cls':'tier-t2'},'t3':{'label':'T3','cls':'tier-t3'},
    't4':{'label':'T4','cls':'tier-t4'},'t5':{'label':'T5','cls':'tier-t5'},'hard':{'label':'HARD','cls':'tier-hard'},
    'mark':{'label':'MARK','cls':'tier-mark'},'super-raro':{'label':'SUPER RARO','cls':'tier-super-raro'},
  };
  var TC = {
    fire:'#f97316',water:'#3b82f6',grass:'#22c55e',electric:'#eab308',psychic:'#ec4899',
    ghost:'#8b5cf6',dark:'#6b7280',fighting:'#ef4444',poison:'#a855f7',ground:'#b45309',
    flying:'#7dd3fc',rock:'#a3a3a3',ice:'#67e8f9',dragon:'#6366f1',steel:'#94a3b8',
    normal:'#d4d4d4',bug:'#84cc16',fairy:'#f9a8d4',
  };

  // Tipo chips com imagem banner no modal
  var typeChips = types.map(function(t) {
    var bannerImg = BANNER_TYPE_MAP.find(function(m) { return m.type === t; });
    var c = TC[t] || '#aaa';
    if (bannerImg) {
      return '<span style="display:inline-flex;align-items:center;gap:4px;background:'+c+'22;border:1px solid '+c+';border-radius:6px;padding:3px 8px">'+
        '<img src="https://i.imgur.com/'+bannerImg.url+'.png" alt="'+t+'" style="width:16px;height:16px;object-fit:contain" />'+
        '<span style="color:'+c+';font-size:10px;font-weight:700;text-transform:uppercase">'+t+'</span>'+
      '</span>';
    }
    return '<span style="background:'+c+';color:#000;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase">'+t+'</span>';
  }).join(' ');

  var weakChips = weaknesses.map(function(t) {
    var bannerImg = BANNER_TYPE_MAP.find(function(m) { return m.type === t; });
    var c = TC[t] || '#aaa';
    if (bannerImg) {
      return '<span style="display:inline-flex;align-items:center;gap:4px;background:'+c+'22;border:1px solid '+c+';border-radius:6px;padding:3px 8px">'+
        '<img src="https://i.imgur.com/'+bannerImg.url+'.png" alt="'+t+'" style="width:16px;height:16px;object-fit:contain" />'+
        '<span style="color:'+c+';font-size:10px;font-weight:700;text-transform:uppercase">'+t+'</span>'+
      '</span>';
    }
    return '<span style="background:'+c+'22;border:1px solid '+c+';color:'+c+';font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase">'+t+'</span>';
  }).join(' ');

  var usedByHtml = usedBy.length
    ? usedBy.map(function(n) {
        var b = OFFICER_TYPE_BANNER[n];
        return '<span class="rpoke-rocket-tag" style="display:inline-flex;align-items:center;gap:5px">'+
          (b ? '<img src="'+b+'" style="width:16px;height:16px;object-fit:contain" />' : '👮')+
          n+'</span>';
      }).join('')
    : '<span style="color:#666;font-size:12px">Nenhum</span>';

  var counterCards = counters.length
    ? counters.map(function(p) {
        var tc = TCFG[p.tag] ? '<span class="tier-tag '+TCFG[p.tag].cls+'">'+TCFG[p.tag].label+'</span>' : '';
        var spr = getShowdownSpriteRocket(p.name);
        var mainSrc = p.image || spr;
        var isShinyCounter = /^sh\s+/i.test(p.name) || /^shiny\s+/i.test(p.name);
        var counterLookup = p.name.replace(/^sh\s+/i,'').replace(/^shiny\s+/i,'').trim().toLowerCase().replace(/\s+/g,'-');
        var counterTypes = POKE_TYPES[counterLookup] || [];
        var counterTypeChips = counterTypes.map(function(t) {
          var bm = BANNER_TYPE_MAP.find(function(m) { return m.type === t; });
          return bm ? '<img src="https://i.imgur.com/'+bm.url+'.png" alt="'+t+'" title="'+t+'" style="width:16px;height:16px;object-fit:contain;border-radius:3px" loading="lazy" />' : '';
        }).join('');
        var counterDisplayName = isShinyCounter
          ? '<span style="color:#ffd166;font-weight:700">✨ '+p.name+'</span>'
          : p.name;
        return '<div class="rpoke-counter-card">'+
          '<img src="'+mainSrc+'" alt="'+p.name+'" onerror="this.src=\''+spr+'\';this.onerror=null;" />'+
          '<div class="rpoke-counter-name">'+counterDisplayName+'</div>'+
          (counterTypeChips ? '<div style="display:flex;flex-wrap:wrap;gap:2px;justify-content:center">'+counterTypeChips+'</div>' : '') +
          '<div>'+tc+'</div>'+
        '</div>';
      }).join('')
    : '<div style="color:#666;font-size:12px;padding:8px">Nenhum counter encontrado no catálogo.</div>';

  var displayName = isShiny ? '<span style="color:#ffd166">✨ '+rawName+'</span>' : rawName;

  var modal = document.createElement('div');
  modal.id = 'officer-poke-modal';
  modal.innerHTML =
    '<div class="rpoke-backdrop" onclick="document.getElementById(\'officer-poke-modal\').remove()"></div>'+
    '<div class="rpoke-panel">'+
      '<button class="rpoke-close" onclick="document.getElementById(\'officer-poke-modal\').remove()">✕</button>'+
      '<div class="rpoke-header">'+
        '<img class="rpoke-main-sprite" src="'+spriteUrl+'" alt="'+rawName+'" '+
          'onerror="this.src=\''+fallback+'\';this.onerror=function(){this.style.opacity=\'0.3\'}" />'+
        '<div class="rpoke-title-block">'+
          '<div class="rpoke-poke-name">'+displayName+'</div>'+
          '<div class="rpoke-chips" style="flex-wrap:wrap;gap:5px">'+typeChips+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="rpoke-section-label">⚔️ Fraquezas</div>'+
      '<div class="rpoke-chips-row" style="flex-wrap:wrap;gap:5px">'+(weakChips||'<span style="color:#666;font-size:12px">Sem fraquezas conhecidas</span>')+'</div>'+
      '<div class="rpoke-section-label">👮 Usado pelos Officers</div>'+
      '<div class="rpoke-usedby">'+usedByHtml+'</div>'+
      '<div class="rpoke-section-label">✅ Pokémons recomendados para batalhar</div>'+
      '<div class="rpoke-counters-grid">'+counterCards+'</div>'+
    '</div>';

  document.body.appendChild(modal);
}
