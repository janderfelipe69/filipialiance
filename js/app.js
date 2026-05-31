// ============================================================
// app.js — Lógica do PokeAlliance Shop
// Depende de: dados.js (deve ser carregado antes)
// ============================================================

function formatKK(raw) {
  if (raw === null || raw === undefined || raw <= 0) return null;
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

function _calcCapturaFinalPrice(poke, ball) {
  const diveMultiplier = poke.dive ? 1.30 : 1.0;
  const effectiveBase  = (poke.price !== null && poke.price !== undefined) ? Math.round(poke.price * diveMultiplier) : 0;
  const rawFinalPrice  = effectiveBase ? Math.round(effectiveBase * ball.mult) : 0;
  return (ball.minPrice && rawFinalPrice > 0) ? Math.max(rawFinalPrice, ball.minPrice) : rawFinalPrice;
}

// Garante que items e window.items são o MESMO array
// db-bootstrap popula via window.items; código legacy usa variável local `items`
if (!window.items) window.items = [];
var items = window.items;
const seen = new Set();
RAW.forEach(([name, image, price, tier, evo]) => {
  const key = name + '|' + (image || '');
  if (!seen.has(key)) { seen.add(key); items.push({ name, image: image || '', price: (price !== undefined && price !== null) ? Number(price) : null, tier: tier || '', evo: evo || '' }); }
});
// Store original index on each item for O(1) lookup
items.forEach((item, i) => { item._idx = i; });

var _totalCountEl = document.getElementById('total-count');
if (_totalCountEl) _totalCountEl.textContent = items.length + ' itens no índice';

const cart = {};
let pkgCartCount = {};
let _capturaSearchTimer;

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




// onNickInput removida — campo de nick removido do formulário (etapa 2)
// nickname vem automaticamente de Session.getCurrentUser().nickname

// ============================================================
// Supabase — configuração
// FASE 4: constantes locais removidas — usar window.SUPABASE_URL/KEY
// definidos por supabase-client.js (carregado antes de app.js).
// ============================================================
var SUPABASE_URL = window.SUPABASE_URL;
var SUPABASE_KEY = window.SUPABASE_KEY;

// ── helpers compartilhados pelas duas funções ─────────────────────────────────

// _getCartNick e _validateNick removidas — campo de nick removido do formulário (etapa 2)
// nick vem de Session.getCurrentUser() em sendToWhatsApp()

function _calcTotais(keys) {
  const TAXA_THRESHOLD = 10000000;
  const TAXA_VALOR     = 5000000;
  const grandTotalRaw   = keys.reduce((s, k) => s + (PriceLayer.getItemPriceRaw(items[k]) * (cart[k] || 0)), 0);
  const hasTaxa         = grandTotalRaw > 0 && grandTotalRaw < TAXA_THRESHOLD;
  const grandTotalFinal = hasTaxa ? grandTotalRaw + TAXA_VALOR : grandTotalRaw;
  return { grandTotalRaw, grandTotalFinal, hasTaxa, TAXA_VALOR };
}

function _buildPagamentoInfo(grandTotalFinal) {
  const mode = _currentPayMode;
  let pagamento_modo = mode;
  let pagamento_kk   = null;
  let pagamento_brl  = null;
  let pagamento_dd   = null;

  if (mode === 'kk') {
    const kkD = formatKK(_payTotalKk || grandTotalFinal);
    pagamento_kk = kkD ? kkD.label : null;
  } else if (mode === 'brl') {
    pagamento_brl = (grandTotalFinal / 1000000 * KK_TO_BRL)
      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  } else if (mode === 'dd') {
    // DD sempre inteiro — Math.round obrigatório
    const totalBrl = grandTotalFinal / 1000000 * KK_TO_BRL;
    pagamento_dd = brlToDd(totalBrl);
  } else if (mode === 'mix') {
    const kkVal  = parseFloat(document.getElementById('mix-kk-input')?.value)  || 0;
    const brlVal = parseFloat(document.getElementById('mix-brl-input')?.value) || 0;
    const kkD    = kkVal > 0 ? formatKK(kkVal * 1000000) : null;
    pagamento_kk  = kkD  ? kkD.label : null;
    pagamento_brl = brlVal > 0
      ? brlVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : null;
  }
  return { pagamento_modo, pagamento_kk, pagamento_brl, pagamento_dd };
}

function _showToastMsg(titulo, msg) {
  // Usa o sistema global de toasts (toast.js) para feedback de pedido.
  if (typeof showToast === 'function') {
    const type = titulo.startsWith('✅') ? 'success' : 'error';
    showToast(titulo + (msg ? ' — ' + msg : ''), type);
    return;
  }
  // Fallback: cria toast temporário
  const fb = document.createElement('div');
  fb.style.cssText = 'position:fixed;bottom:32px;right:20px;z-index:99999;'
    + 'background:rgba(6,11,26,.97);border:1px solid rgba(255,255,255,.12);'
    + 'border-radius:12px;padding:13px 18px;font-family:Rajdhani,sans-serif;'
    + 'font-size:14px;font-weight:600;color:#dde8ff;max-width:340px;'
    + 'box-shadow:0 8px 32px rgba(0,0,0,.6);';
  fb.textContent = titulo + (msg ? ' — ' + msg : '');
  document.body.appendChild(fb);
  setTimeout(() => {
    fb.style.transition = 'opacity .35s,transform .35s';
    fb.style.opacity = '0';
    fb.style.transform = 'translateY(8px)';
    setTimeout(() => fb.remove(), 380);
  }, 5000);
}

async function _salvarPedidoSupabase(payload) {
  const token = (typeof Session !== 'undefined' && Session.isLoggedIn())
    ? Session.getAccessToken()
    : null;
  if (!token) throw new Error('Usuário não autenticado — faça login antes de enviar um pedido.');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/pedidos`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_KEY,
      'Authorization': 'Bearer ' + token,
      'Prefer':        'return=representation',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error('Supabase ' + res.status + ': ' + txt);
  }
  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? data[0] : data;
}

function _limparCarrinhoAposPedido() {
  // Remove também os slots virtuais de captura do items[]
  _limparCapturaSlots();
  Object.keys(cart).forEach(k => delete cart[k]);
  updateCartBadge();
  closeCart();
}

// ── sendToWhatsApp — agora salva no Supabase ──────────────────────────────────

async function sendToWhatsApp() {
  const keys = Object.keys(cart).filter(k => cart[k] > 0);
  if (!keys.length) return;

  // ── Validação de sessão (v3) ─────────────────────────────────────────
  // Bloqueia pedido se usuário não estiver logado.
  // Session.isLoggedIn() checa _currentUser + _accessToken ao mesmo tempo.
  if (typeof Session === 'undefined' || !Session.isLoggedIn()) {
    console.warn('[sendToWhatsApp] Nao autenticado — abrindo modal de login.');
    if (typeof AuthModal !== 'undefined') AuthModal.open('login');
    return;
  }
  // Fallback seguro: se nickname nao vier do perfil, usa email como identificador
  const _sessionUser = Session.getCurrentUser();
  const nick = (_sessionUser && (_sessionUser.nickname || _sessionUser.email)) || '—';

  const { grandTotalRaw, grandTotalFinal, hasTaxa, TAXA_VALOR } = _calcTotais(keys);

  const itensPedido = keys.map(k => {
    const item    = items[k];
    const qty     = cart[k];
    const unitRaw = item.price ?? 0;
    const totRaw  = unitRaw * qty;

    // Base comum para todos os itens
    const base = {
      nome:            item.name,
      tier:            item.tier || '',
      quantidade:      qty,
      preco_unit_raw:  unitRaw,
      preco_unit_kk:   unitRaw > 0 ? (formatKK(unitRaw)?.label || '—') : '—',
      preco_unit_brl:  unitRaw > 0
        ? (unitRaw / 1000000 * KK_TO_BRL).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : '—',
      preco_total_raw: totRaw,
      preco_total_kk:  totRaw  > 0 ? (formatKK(totRaw)?.label  || '—') : '—',
      preco_total_brl: totRaw  > 0
        ? (totRaw / 1000000 * KK_TO_BRL).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : '—',
    };

    // Campos extras para itens de captura (Fase 5.3 — unificado)
    if (item._capturaId) {
      // Gera item_ref único para este pokémon usando o índice no array de capturas
      // Este item_ref é gravado no JSONB e usado depois por startCaptureItem/completeCaptureItem
      const captIdx = keys.filter(k2 => parseInt(k2,10) < parseInt(k,10) && items[parseInt(k2,10)] && items[parseInt(k2,10)]._capturaId).length;
      const itemRefForBanco = item._capturaId.replace('ccp_','').slice(0,8)
        ? ('ORD_PK_' + (captIdx + 1))
        : ('ORD_PK_' + (captIdx + 1));

      Object.assign(base, {
        // item_ref escrito no banco — permite startCaptureItem/completeCaptureItem encontrar o item
        item_ref:    itemRefForBanco,
        id:          itemRefForBanco, // alias — compatível com lookup legado
        type:        'capture',
        pokemon:     item.pokemon || (item._pokeData && item._pokeData.name) || '',
        ball:        item.ball_name || (item._ball && item._ball.name) || '',
        ball_type:   item.ball_type || (item._ball && item._ball.id) || '',
        drops:       (typeof getPokeDrops === 'function' && item._pokeData)
                       ? getPokeDrops(item._pokeData.name).map(function(d){ return d.name; })
                       : [],
        status:      'pending',
        started_at:  null,
        completed_at: null,
        actual_duration_minutes: null,
      });
    }

    return base;
  });

  // Determina service_type quando há capturas: pokemon_sr supera normal_package
  const hasCapturas = keys.some(k => items[k] && items[k]._capturaId);
  const hasSRCaptura = hasCapturas && keys.some(k => {
    const it = items[k];
    if (!it || !it._capturaId) return false;
    const tag = (it.tier || '').toLowerCase();
    return tag === 'super-raro' || tag === 'sr';
  });

  const { pagamento_modo, pagamento_kk, pagamento_brl, pagamento_dd } = _buildPagamentoInfo(grandTotalFinal);

  // service_type: se há captura SR → pokemon_sr; se só captura normal → normal_package; misto → mixed
  const _serviceType = hasSRCaptura ? 'pokemon_sr'
    : hasCapturas ? 'normal_package'
    : null; // null = pedido de itens/pacotes normais (sem service_type específico)

  const payload = {
    nick_jogo:        nick,
    itens:            itensPedido,
    subtotal_kk:      grandTotalRaw  > 0 ? (formatKK(grandTotalRaw)?.label  || '—') : '—',
    subtotal_brl:     grandTotalRaw  > 0
      ? (grandTotalRaw  / 1000000 * KK_TO_BRL).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : '—',
    taxa_servico:     hasTaxa,
    total_kk:         grandTotalFinal > 0 ? (formatKK(grandTotalFinal)?.label || '—') : '—',
    total_brl:        grandTotalFinal > 0
      ? (grandTotalFinal / 1000000 * KK_TO_BRL).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : '—',
    pagamento_modo,
    pagamento_kk,
    pagamento_brl,
    pagamento_dd:     pagamento_dd || null,
    status:           'pendente',
    status_v3:        'waiting_queue',
    user_id:          _sessionUser ? (_sessionUser.id || null) : null,
    // Campos de captura (só presentes quando o carrinho tem pokémons)
    ...(hasCapturas ? {
      service_type:     _serviceType,
      tipo_servico:     _serviceType,
      service_quantity: keys.filter(k => items[k] && items[k]._capturaId).length,
      composite_order:  keys.filter(k => items[k] && items[k]._capturaId).length > 1,
      item_count:       keys.filter(k => items[k] && items[k]._capturaId).length,
    } : {}),
  };

  // Desabilita botão durante o envio
  const btn = document.querySelector('[onclick="sendToWhatsApp()"]');
  const originalLabel = btn ? btn.innerHTML : null;
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Salvando...'; }

  try {
    const saved   = await _salvarPedidoSupabase(payload);
    const pedidoId = saved?.id ? ' #' + String(saved.id).padStart(4, '0') : '';
    _limparCarrinhoAposPedido();
    _showToastMsg(
      '✅ Pedido enviado!' + pedidoId,
      'Seu pedido foi registrado com sucesso. Aguarde o contato do vendedor para confirmar a entrega.'
    );
  } catch (err) {
    console.error('[Supabase]', err);
    _showToastMsg(
      '❌ Erro ao salvar pedido',
      'Não foi possível registrar o pedido. Verifique sua conexão e tente novamente.'
    );
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = originalLabel; }
  }
}

// ── sendToDiscord — redireciona para o mesmo fluxo Supabase ──────────────────

async function sendToDiscord() {
  await sendToWhatsApp();
}


function addPackToCart(i, qty) {
  cart[i] = (cart[i] || 0) + qty;
  updateCartBadge();
  // Atualiza botões do módulo de itens (novos IDs)
  const btn500 = document.getElementById('itembtn-500-' + i);
  if (btn500) btn500.classList.add('added');
  const addBtn = document.getElementById('item-addbtn-' + i);
  const addLbl = document.getElementById('item-addbtn-label-' + i);
  if (addBtn) addBtn.classList.add('added');
  if (addLbl) addLbl.textContent = '✓ ' + cart[i].toLocaleString();
  // Troca span vazio por botão de remover
  const remSlot = document.getElementById('item-rembtn-' + i);
  if (remSlot && remSlot.tagName === 'SPAN') {
    const remBtn = document.createElement('button');
    remBtn.className = 'item-rem-btn';
    remBtn.id = 'item-rembtn-' + i;
    remBtn.title = 'Remover do carrinho';
    remBtn.innerHTML = '\u2715';
    remBtn.onclick = () => itemRemoveFromCart(i);
    remSlot.replaceWith(remBtn);
  }
  if (document.getElementById('cart-overlay').classList.contains('open')) renderCart();
}

function addToCart(i) {
  // Delega para itemAddToCart do módulo de itens quando disponível
  if (typeof itemAddToCart === 'function') {
    itemAddToCart(i);
    return;
  }
  // Fallback legacy
  const input = document.getElementById('item-qty-' + i);
  let val = parseInt(input ? input.value : 1, 10);
  if (isNaN(val) || val < 1) val = 1;
  if (val > 100000) val = 100000;
  cart[i] = (cart[i] || 0) + val;
  updateCartBadge();
  if (document.getElementById('cart-overlay').classList.contains('open')) renderCart();
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
  // Popula o display do nick com o nickname da conta logada
  const _nickEl = document.getElementById('cart-nick-display');
  if (_nickEl) {
    const _u = (typeof Session !== 'undefined') ? Session.getCurrentUser() : null;
    _nickEl.textContent = (_u && (_u.nickname || _u.email)) ? (_u.nickname || _u.email) : '— faça login para pedir';
  }
  renderCart();
  document.getElementById('cart-overlay').classList.add('open');
}

function closeCart() {
  document.getElementById('cart-overlay').classList.remove('open');
}

// Utilitário compartilhado: fecha o overlay apenas quando o clique é no fundo,
// não no modal interno (event.target === event.currentTarget).
function overlayDismiss(event, closeFn) {
  if (event.target === event.currentTarget) closeFn();
}

function handleOverlayClick(e)         { overlayDismiss(e, closeCart); }

function renderCart() {
  const list = document.getElementById('cart-list');
  const footer = document.getElementById('cart-footer');
  const keys = Object.keys(cart).filter(k => cart[k] > 0);

  if (!keys.length) {
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
    return s + (item && item.price !== null ? (item.price ?? 0) * cart[k] : 0);
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
    updatePayDisplay(grandTotalRaw, grandTotalFinal, parseFloat((grandTotalFinal / 1000000 * KK_TO_BRL).toFixed(2)));
  } else {
    document.getElementById('cart-grand-total-block').style.display = 'none';
    if (taxaAviso) taxaAviso.style.display = 'none';
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
    const itemTotalRaw = PriceLayer.getItemPriceRaw(item) * cart[k];
    const priceBlock = itemTotalRaw > 0
      ? (() => {
          const unitData = PriceLayer.fmtKK(item.price);
          const totalData = PriceLayer.fmtKK(itemTotalRaw);
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

  // DD block — sempre inteiro, Math.round obrigatório
  const _ddRate = (window.APP_CONFIG && window.APP_CONFIG.dd_to_brl) || DD_TO_BRL || 0.70;
  const ddTotal = Math.round(totalFinalBrl / _ddRate);
  const ddEl = document.getElementById('pay-dd-total');
  const ddHintEl = document.getElementById('pay-dd-brl-hint');
  if (ddEl)     ddEl.textContent     = ddTotal > 0 ? ddTotal.toLocaleString('pt-BR') + ' DD' : '—';
  if (ddHintEl) ddHintEl.textContent = ddTotal > 0 ? 'equivale a ' + totalFinalBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';

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
  const remaining = _payTotalBrl - (kkPaidRaw / 1000000 * KK_TO_BRL);
  const brlLeft = Math.max(0, _payTotalBrl - (kkPaidRaw / 1000000 * KK_TO_BRL));
  // Atualiza campo BRL
  document.getElementById('mix-brl-input').value = brlLeft > 0 ? brlLeft.toFixed(2) : '0.00';
  updateMixBalance(kkPaidRaw, brlLeft);
}

function onMixBrlChange(val) {
  const brlPaid = Math.max(0, parseFloat(val) || 0);
  const brlLeft = Math.max(0, _payTotalBrl - brlPaid);
  // converte o restante em KK
  const kkLeft  = brlLeft / KK_TO_BRL; // lê de financial_config via APP_CONFIG
  document.getElementById('mix-kk-input').value = kkLeft > 0 ? kkLeft.toFixed(4) : '0';
  updateMixBalance(kkLeft * 1000000, brlPaid);
}

function updateMixBalance(kkPaidRaw, brlPaid) {
  const totalPaidBrl = (kkPaidRaw / 1000000 * KK_TO_BRL) + brlPaid;
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
  // Reseta botões do módulo de itens (novos IDs)
  const addBtn = document.getElementById('item-addbtn-' + i);
  const addLbl = document.getElementById('item-addbtn-label-' + i);
  if (addBtn) addBtn.classList.remove('added');
  if (addLbl) addLbl.textContent = 'Adicionar';
  const remBtn = document.getElementById('item-rembtn-' + i);
  if (remBtn && remBtn.tagName === 'BUTTON') {
    const span = document.createElement('span');
    span.id = 'item-rembtn-' + i;
    remBtn.replaceWith(span);
  }
  // Reseta botão pack-500
  const btn500 = document.getElementById('itembtn-500-' + i);
  if (btn500) btn500.classList.remove('added');
  // Limpa slot de captura do items[] se for item de captura
  const _CAPTURA_BASE = 900000;
  if (parseInt(i, 10) >= _CAPTURA_BASE && items[i] && items[i]._capturaId) {
    delete items[i];
  }
  updateCartBadge();
  renderCart();
}

function clearCart() {
  Object.keys(cart).forEach(k => {
    const addBtn = document.getElementById('item-addbtn-' + k);
    const addLbl = document.getElementById('item-addbtn-label-' + k);
    if (addBtn) addBtn.classList.remove('added');
    if (addLbl) addLbl.textContent = 'Adicionar';
    const remBtn = document.getElementById('item-rembtn-' + k);
    if (remBtn && remBtn.tagName === 'BUTTON') {
      const span = document.createElement('span');
      span.id = 'item-rembtn-' + k;
      remBtn.replaceWith(span);
    }
    const btn500 = document.getElementById('itembtn-500-' + k);
    if (btn500) btn500.classList.remove('added');
    delete cart[k];
  });
  // Reseta botões de pacote
  pkgCartCount = {};
  if (window.pkgState) { pkgState.cartCount = {}; window.pkgCartCount = pkgState.cartCount; }
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
  if (tab === 'pacotes') {
    // Define altura real para o pkg-main-area funcionar com overflow:hidden
    var tabEl = document.getElementById('tab-pacotes');
    if (tabEl) {
      var hh = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72;
      var th = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tabs-h')) || 44;
      tabEl.style.height = (window.innerHeight - hh - th) + 'px';
      tabEl.style.overflow = 'hidden';
    }
    if (window.__dbReady) renderPackages();
    else document.addEventListener('db:ready', function() { renderPackages(); }, { once: true });
  }
  if (tab === 'captura') {
    if (window.__dbReady) renderCaptura();
    else document.addEventListener('db:ready', function() { renderCaptura(); }, { once: true });
  }
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
var _respawnSearchTimer, _questsSearchTimer, _rocketsSearchTimer, _officersSearchTimer, _hazardSearchTimer;

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
  if (tab === 'brokes') renderBrokes();
  if (tab === 'hazard') renderHazard();
  if (tab === 'npcs') {
    // Abre a sub-aba de NPC's e renderiza a categoria ativa (padrão: rockets)
    var activeNpcBtn = document.querySelector('.npc-subcat-btn.active');
    var activeSubcat = activeNpcBtn ? activeNpcBtn.getAttribute('data-subcat') || 'rockets' : 'rockets';
    switchNpcSubcat(activeSubcat, activeNpcBtn);
  }
  if (tab === 'starcalc') renderStarCalc();
  if (tab === 'punchingbag') renderPunchingBag();
  if (tab === 'roupasspeed') renderRoupasSpeed();
  if (tab === 'talents') renderTalents();
  if (tab === 'tokens') renderTokens();
}

// ===================== WIKI: BROKES =====================
function renderBrokes() {
  var el = document.getElementById('wiki-brokes-content');
  if (!el) return;
  el.innerHTML = `
  <div class="brokes-page">
    <!-- Hero -->
    <div class="brokes-hero">
      <div class="brokes-hero-icon">💥</div>
      <div class="brokes-hero-title">Sistema de Brokes</div>
      <div class="brokes-hero-sub">Entenda o sistema de brokes e aumente suas chances de captura</div>
    </div>

    <!-- Tabela de Max Brokes por Tier -->
    <div class="brokes-section">
      <div class="brokes-section-title">
        <span class="brokes-section-icon">📊</span>
        Max Brokes por Tier
      </div>
      <div class="brokes-section-note">Válido apenas para Shinys — Pokémon normal não tem max.</div>
      <div class="brokes-table-wrap">
        <table class="brokes-table">
          <thead>
            <tr>
              <th>Tier</th>
              <th>Max Broke</th>
              <th>Equivale a</th>
            </tr>
          </thead>
          <tbody>
            <tr class="tier-mythical-row">
              <td><span class="ctag-mythical captura-tag">Mítico</span></td>
              <td class="broke-val-cell"><span class="broke-question">?</span><span class="broke-tbd">A ser confirmado</span></td>
              <td class="broke-equiv">—</td>
            </tr>
            <tr>
              <td><span class="ctag-legendary captura-tag">Legendary</span></td>
              <td class="broke-val-cell"><span class="broke-number">22.535</span><span class="broke-unit">UB</span></td>
              <td class="broke-equiv">Premier Ball: ~29.295 · Alliance: ~33.802</td>
            </tr>
            <tr>
              <td><span class="ctag-ultra-raro captura-tag">Ultra Raro</span></td>
              <td class="broke-val-cell"><span class="broke-number">9.100</span><span class="broke-unit">UB</span></td>
              <td class="broke-equiv">Premier Ball: ~11.830 · Alliance: ~13.650</td>
            </tr>
            <tr>
              <td><span class="ctag-super-raro captura-tag">Super Raro</span></td>
              <td class="broke-val-cell"><span class="broke-number">3.512</span><span class="broke-unit">UB</span></td>
              <td class="broke-equiv">Premier Ball: ~4.565 · Alliance: ~5.268</td>
            </tr>
            <tr>
              <td><span class="ctag-t1 captura-tag">T1</span></td>
              <td class="broke-val-cell"><span class="broke-number">1.280</span><span class="broke-unit">UB</span></td>
              <td class="broke-equiv">Premier Ball: ~1.664 · Alliance: ~1.920</td>
            </tr>
            <tr>
              <td><span class="ctag-t2 captura-tag">T2</span></td>
              <td class="broke-val-cell"><span class="broke-approx">~</span><span class="broke-number">900</span><span class="broke-unit">UB</span></td>
              <td class="broke-equiv">Premier Ball: ~1.170 · Alliance: ~1.350</td>
            </tr>
            <tr>
              <td><span class="ctag-t3 captura-tag">T3</span></td>
              <td class="broke-val-cell"><span class="broke-approx">~</span><span class="broke-number">700</span><span class="broke-unit">UB</span></td>
              <td class="broke-equiv">Premier Ball: ~910 · Alliance: ~1.050</td>
            </tr>
            <tr>
              <td><span class="ctag-t4 captura-tag">T4</span></td>
              <td class="broke-val-cell"><span class="broke-approx">~</span><span class="broke-number">600</span><span class="broke-unit">UB</span></td>
              <td class="broke-equiv">Premier Ball: ~780 · Alliance: ~900</td>
            </tr>
            <tr>
              <td><span class="ctag-t5 captura-tag">T5</span></td>
              <td class="broke-val-cell"><span class="broke-approx">~</span><span class="broke-number">400</span><span class="broke-unit">UB</span></td>
              <td class="broke-equiv">Premier Ball: ~520 · Alliance: ~600</td>
            </tr>
            <tr>
              <td><span class="ctag-t6 captura-tag">T6</span></td>
              <td class="broke-val-cell"><span class="broke-approx">~</span><span class="broke-number">200</span><span class="broke-unit">UB</span></td>
              <td class="broke-equiv">Premier Ball: ~260 · Alliance: ~300</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Rates das bolas -->
    <div class="brokes-section">
      <div class="brokes-section-title">
        <span class="brokes-section-icon">⚾</span>
        Rates das Poké Balls
      </div>
      <div class="brokes-balls-grid">
        <div class="brokes-ball-card">
          <div class="brokes-ball-emoji"><img src="https://i.imgur.com/D5T6Dgw.png" style="width:48px;height:48px;object-fit:contain" /></div>
          <div class="brokes-ball-name">Ultra Ball</div>
          <div class="brokes-ball-rate rate-ub">4x</div>
          <div class="brokes-ball-desc">Rate base para captura</div>
        </div>
        <div class="brokes-ball-card">
          <div class="brokes-ball-emoji"><img src="https://i.imgur.com/sIwvw2L.png" style="width:48px;height:48px;object-fit:contain" /></div>
          <div class="brokes-ball-name">Premier Ball</div>
          <div class="brokes-ball-rate rate-pb">4x</div>
          <div class="brokes-ball-desc">Conta como 1ª bola jogada. Contabiliza para brokes totais.</div>
        </div>
        <div class="brokes-ball-card">
          <div class="brokes-ball-emoji"><img src="https://i.imgur.com/QFXUD5f.png" style="width:48px;height:48px;object-fit:contain" /></div>
          <div class="brokes-ball-name">Alliance Ball</div>
          <div class="brokes-ball-rate rate-ab">5x</div>
          <div class="brokes-ball-desc">Conta como 1ª bola jogada. Contabiliza para brokes totais.</div>
        </div>
        <div class="brokes-ball-card brokes-ball-card--elemental">
          <div class="brokes-ball-emoji">🌀</div>
          <div class="brokes-ball-name">Elemental Ball</div>
          <div class="brokes-ball-rate rate-el">5x</div>
          <div class="brokes-ball-desc">Rate aumentado com vantagem elemental</div>
        </div>
      </div>
    </div>

    <!-- Observações importantes -->
    <div class="brokes-section">
      <div class="brokes-section-title">
        <span class="brokes-section-icon">📋</span>
        Regras & Observações
      </div>
      <div class="brokes-obs-list">
        <div class="brokes-obs-item">
          <span class="brokes-obs-num">1</span>
          <span class="brokes-obs-text">Premier Ball e Alliance Ball contam sempre como a <strong>primeira bola jogada</strong>.</span>
        </div>
        <div class="brokes-obs-item">
          <span class="brokes-obs-num">2</span>
          <span class="brokes-obs-text">Premier Ball e Alliance Ball contam para a <strong>contagem de brokes totais</strong>.</span>
        </div>
        <div class="brokes-obs-item">
          <span class="brokes-obs-num">3</span>
          <span class="brokes-obs-text">O max é um valor <strong>não oficial</strong> descoberto pela comunidade, e <strong>pode mudar a qualquer momento</strong>.</span>
        </div>
        <div class="brokes-obs-item brokes-obs-item--highlight">
          <span class="brokes-obs-num">4</span>
          <span class="brokes-obs-text"><strong>As brokes são pra shinys.</strong> Pokémon normal não tem max.</span>
        </div>
        <div class="brokes-obs-item">
          <span class="brokes-obs-num">5</span>
          <span class="brokes-obs-text">Chegar na <strong>máxima não garante o catch</strong>. A chance só fica muito mais alta.</span>
        </div>
        <div class="brokes-obs-item">
          <span class="brokes-obs-num">6</span>
          <span class="brokes-obs-text">O <strong>sistema de mérito</strong> considera o total de brokes. Os rates não têm nada a ver com ele.</span>
        </div>
      </div>
    </div>
  </div>
  `;
}

// ===================== DADOS DE RESPAWN =====================
// RAW_RESPAWN é definido em respawn_patch_modal.js
// Certifique-se de que respawn_patch_modal.js é carregado ANTES de app.js no index.html


// ── CSS para os novos cards ──────────────────────────────────────────
(function injectRespawnCSS() {
  if (document.getElementById('respawn-v2-css')) return;
  var s = document.createElement('style');
  s.id = 'respawn-v2-css';
  s.textContent = `
/* ── Layout geral ── */
#respawn-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px;
  padding: 4px 0 20px;
}

/* ── Card base ── */
.rsp-card-v2 {
  position: relative;
  border-radius: 18px;
  border: 1.5px solid var(--rsp-card-border, rgba(255,255,255,0.10));
  background: var(--rsp-card-bg, rgba(255,255,255,0.03));
  overflow: hidden;
  cursor: pointer;
  transition: transform .22s, border-color .22s, box-shadow .22s, background .22s;
  user-select: none;
}
.rsp-card-v2::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% -5%, var(--rsp-glow-c, rgba(100,180,255,0.08)), transparent 70%);
  pointer-events: none;
}
.rsp-card-v2:hover {
  transform: translateY(-3px);
  border-color: var(--rsp-accent, rgba(100,180,255,0.4));
  box-shadow: 0 8px 32px var(--rsp-shadow, rgba(100,180,255,0.15));
}
.rsp-card-v2.open {
  border-color: var(--rsp-accent, rgba(100,180,255,0.5));
  box-shadow: 0 0 40px var(--rsp-shadow, rgba(100,180,255,0.2)), 0 6px 30px rgba(0,0,0,0.5);
  background: var(--rsp-card-bg-open, rgba(255,255,255,0.05));
}

/* ── Sprite wrapper ── */
.rsp-sprite-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  padding: 10px 8px 4px;
  position: relative;
}
.rsp-sprite-static, .rsp-sprite-anim {
  max-width: 96px;
  max-height: 96px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 4px 10px var(--rsp-shadow, rgba(100,180,255,0.25)));
  transition: opacity .25s;
}
.rsp-sprite-anim {
  position: absolute;
  opacity: 0;
  transition: opacity .25s;
}
.rsp-card-v2.open .rsp-sprite-static { opacity: 0; }
.rsp-card-v2.open .rsp-sprite-anim   { opacity: 1; }

/* ── Info area ── */
.rsp-card-foot {
  padding: 6px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.rsp-card-name {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 13px;
  font-weight: 700;
  color: var(--rsp-accent, #fff);
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rsp-type-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.rsp-type-badge {
  font-family: var(--font-body, sans-serif);
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 8px;
  border: 1px solid;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.rsp-wildscape-dot {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: rgba(255,255,255,0.4);
  font-family: var(--font-mono, monospace);
}
.rsp-wildscape-dot::before {
  content: '';
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #ffcc44;
  box-shadow: 0 0 5px #ffcc44aa;
  flex-shrink: 0;
}

/* ── Expanded panel ── */
.rsp-expanded-panel {
  max-height: 0;
  overflow: hidden;
  transition: max-height .45s cubic-bezier(.4,0,.2,1), opacity .3s;
  opacity: 0;
}
.rsp-card-v2.open .rsp-expanded-panel {
  max-height: 520px;
  opacity: 1;
}
.rsp-panel-inner {
  padding: 0 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rsp-sep-line {
  height: 1px;
  background: linear-gradient(90deg, var(--rsp-accent, rgba(100,180,255,0.3)), transparent);
  margin-bottom: 2px;
}
.rsp-loc-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 11px;
  color: rgba(255,255,255,0.55);
  font-family: var(--font-body, sans-serif);
  line-height: 1.4;
}
.rsp-loc-icon { flex-shrink: 0; font-size: 13px; }
.rsp-map-frame {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--rsp-accent, rgba(100,180,255,0.2));
  line-height: 0;
  background: rgba(0,0,0,0.25);
}
.rsp-map-frame img {
  width: 100%;
  height: auto;
  display: block;
  max-height: 280px;
  object-fit: cover;
}
.rsp-map-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-family: var(--font-body, sans-serif);
  color: var(--rsp-accent, #60aaff);
  text-decoration: none;
  opacity: 0.8;
  transition: opacity .15s;
  padding: 4px 0;
}
.rsp-map-link:hover { opacity: 1; }
.rsp-wildscape-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-family: var(--font-body, sans-serif);
  color: #ffcc44;
  text-decoration: none;
  opacity: 0.8;
  transition: opacity .15s;
}
.rsp-wildscape-link:hover { opacity: 1; }
.rsp-map-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 16px;
  color: rgba(255,255,255,0.2);
  font-size: 11px;
  font-family: var(--font-body, sans-serif);
  border-radius: 10px;
  border: 1px dashed rgba(255,255,255,0.1);
  background: rgba(0,0,0,0.15);
}
.rsp-map-placeholder-icon { font-size: 20px; }

/* ── List mode override ── */
.respawn-list-mode #respawn-grid {
  grid-template-columns: 1fr;
}
.respawn-list-mode .rsp-card-v2 {
  display: flex;
  flex-direction: row;
  align-items: center;
  border-radius: 14px;
}
.respawn-list-mode .rsp-sprite-wrap {
  width: 70px;
  height: 56px;
  flex-shrink: 0;
  padding: 6px;
}
.respawn-list-mode .rsp-card-foot {
  flex-direction: row;
  align-items: center;
  flex: 1;
  gap: 10px;
  padding: 10px 14px 10px 0;
}
.respawn-list-mode .rsp-card-name { min-width: 120px; font-size: 14px; }
.respawn-list-mode .rsp-expanded-panel { display: none !important; }

/* ── View toggle ── */
.rsp-view-toggle {
  display: flex;
  gap: 6px;
  margin-left: auto;
}
.rsp-view-btn {
  width: 32px; height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all .15s;
}
.rsp-view-btn.active, .rsp-view-btn:hover {
  border-color: rgba(100,180,255,0.4);
  color: #fff;
  background: rgba(100,180,255,0.08);
}
`;
  document.head.appendChild(s);
})();

// ===================== DADOS DE QUESTS =====================
// Estrutura: { name: 'Nome da Quest', icon: '⚔️', description: 'Texto descritivo', img: 'URL ou null' }
// Para adicionar uma quest, adicione um objeto aqui:
// =====================================================================
// QUESTS — estrutura detalhada
// Campos suportados:
//   name        string  — nome da quest
//   icon        string  — emoji do ícone
//   level       number  — nível mínimo requerido
//   reward      string  — HTML/texto da recompensa
//   rewardDesc  string  — descrição extra da recompensa
//   start       string  — HTML/texto de onde e como iniciar
//   drop        string  — HTML/texto do que dropar/coletar
//   puzzle      string  — HTML/texto do puzzle (opcional)
//   puzzleImg   string  — URL da imagem do puzzle (opcional)
//   steps       array   — passos extras [{icon, text}]
//   notes       string  — observações extras
// =====================================================================
var RAW_QUESTS = [
  {
    name: 'Lucky Amulet',
    icon: '🍀',
    level: 250,
    reward: 'Lucky Amulet',
    rewardDesc: 'Amuleto que permite equipar um held <strong>X-Lucky</strong>, com efeito em todos os seus Pokémons. O held terá <strong>50% da efetividade padrão</strong> e não combina com o Lucky do próprio Pokémon — vale apenas o maior bônus.',
    start: 'Vá até as <strong>docas ao sul de Olivine</strong> e fale com o NPC <span class="quest-npc">Captain Willy</span>.',
    drop: 'Willy pedirá para você resgatar o <strong>Valentine Gold Token</strong>.<br><br>Este item é dropado pelo <strong>Tentacruel</strong> apenas em <span class="quest-tag-hunt">hunt normal</span> (não funciona em wildscape).<br><br>Após dropar, entregue o item ao <strong>Captain Willy</strong>.',
    puzzle: 'Após entregar o token, vá até o <strong>DIVE à direita de Vermilion</strong>.<br><br>Lá você encontrará o puzzle. Após completar o puzzle, você receberá o <strong>Lucky Amulet</strong>.<br><br><em>⚠️ Atenção: duas peças da primeira linha do puzzle foram trocadas propositalmente no spoiler abaixo.</em>',
    puzzleImg: 'https://i.imgur.com/biG8VIv.png',
    steps: [
      { icon: '🗺️', text: 'Alcance o <strong>Level 250</strong> antes de iniciar.' },
      { icon: '🚢', text: 'Vá até as <strong>docas ao sul de Olivine</strong> e fale com o NPC <span class="quest-npc">Captain Willy</span>.' },
      { icon: '🎣', text: 'Farme o <strong>Valentine Gold Token</strong> com o <strong>Tentacruel</strong> (hunt normal, não wildscape).' },
      { icon: '📦', text: 'Entregue o <strong>Valentine Gold Token</strong> ao <strong>Captain Willy</strong>.' },
      { icon: '🌊', text: 'Use o <strong>DIVE à direita de Vermilion</strong> e complete o puzzle subaquático.' },
      { icon: '🍀', text: 'Receba o <strong>Lucky Amulet</strong> como recompensa.' },
    ],
    notes: 'O Lucky Amulet funciona para todos os Pokémons, mas tem apenas 50% da eficácia do held X-Lucky equipado. Ele não combina com o Lucky que o Pokémon já tiver — vale apenas o maior bônus.',
  },
  {
    name: 'Vernaccio\'s Paint Cans',
    icon: '🎨',
    level: null,
    reward: '1.000.000 de EXP + 50 Alliance Ball',
    rewardDesc: 'Vernaccio agradecerá pela recuperação dos baldes e como recompensa você receberá <strong>1.000.000 de EXP</strong> e <strong>50 Alliance Balls</strong>.',
    start: 'Vá até <strong>Cianwood</strong> e encontre o NPC <span class="quest-npc">Vernaccio</span>.' +
           '<div class="quest-location-img-wrap"><span class="quest-location-label">📍 Localização do NPC</span>' +
           '<img class="quest-reward-img" src="https://i.imgur.com/MoXRqT0.png" alt="Localização Vernaccio" loading="lazy" /></div>' +
           '<br>Ele irá contar que alguns baldes foram roubados pelos Smeargles e pedirá que você os recupere.',
    parts: [
      {
        title: 'Etapa 1 — Falar com Vernaccio em Cianwood',
        icon: '💬',
        intro: 'Vá até o NPC <span class="quest-npc">Vernaccio</span> na cidade de <strong>Cianwood</strong> e dialogue com ele.<br><br>Ele irá contar que seus preciosos baldes de tinta foram roubados pelos Smeargles e espalhados pelos estúdios de arte abandonados da região. Ele precisa recuperar os baldes <strong>Azul, Vermelho, Verde e Amarelo</strong> para completar sua obra-prima.',
        locationImg: 'https://i.imgur.com/b0Q70hc.png',
        drops: [],
        delivery: null,
      },
      {
        title: 'Etapa 2 — Coletar os Baldes de Tinta',
        icon: '🪣',
        intro: 'Trace uma rota para recolher os 4 baldes. Rota recomendada: <strong>Cianwood → Golden Rod → Ecruteak</strong>, retornando a Cianwood para finalizar.<br><br>⚠️ <strong>Atenção:</strong> Em Golden Rod há <strong>2 baldes</strong> para coletar.<br><br>' +
               '<strong>📍 Localização em Cianwood:</strong><br><br>' +
               '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
               '<img class="quest-reward-img" src="https://i.imgur.com/HY6qcYI.png" alt="Cianwood mapa 1" loading="lazy" style="flex:1;min-width:140px;max-width:280px;border-radius:10px;" />' +
               '<img class="quest-reward-img" src="https://i.imgur.com/dqoFCmD.png" alt="Cianwood mapa 2" loading="lazy" style="flex:1;min-width:140px;max-width:280px;border-radius:10px;" />' +
               '</div>',
        locationImg: undefined,
        drops: [],
        delivery: null,
      },
      {
        title: 'Etapa 2b — Baldes em Golden Rod',
        icon: '🗺️',
        intro: '⚠️ <strong>ATENÇÃO:</strong> Aqui há <strong>2 baldes</strong> para serem coletados.<br><br>' +
               '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
               '<img class="quest-reward-img" src="https://i.imgur.com/YsJqsqu.png" alt="Golden Rod mapa 1" loading="lazy" style="flex:1;min-width:140px;max-width:280px;border-radius:10px;" />' +
               '<img class="quest-reward-img" src="https://i.imgur.com/yt1J9Nj.png" alt="Golden Rod mapa 2" loading="lazy" style="flex:1;min-width:140px;max-width:280px;border-radius:10px;" />' +
               '</div>',
        locationImg: undefined,
        drops: [],
        delivery: null,
      },
      {
        title: 'Etapa 2c — Balde em Ecruteak',
        icon: '🗺️',
        intro: 'Localização do balde em <strong>Ecruteak City</strong>:<br><br>' +
               '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
               '<img class="quest-reward-img" src="https://i.imgur.com/rh6R3G5.png" alt="Ecruteak mapa 1" loading="lazy" style="flex:1;min-width:140px;max-width:280px;border-radius:10px;" />' +
               '<img class="quest-reward-img" src="https://i.imgur.com/qd6QAz7.png" alt="Ecruteak mapa 2" loading="lazy" style="flex:1;min-width:140px;max-width:280px;border-radius:10px;" />' +
               '</div>',
        locationImg: undefined,
        drops: [],
        delivery: null,
      },
      {
        title: 'Etapa 3 — Entregar os Baldes',
        icon: '✅',
        intro: 'Após coletar os <strong>4 baldes</strong>, retorne ao NPC <span class="quest-npc">Vernaccio</span> em <strong>Cianwood</strong>. Ele irá lhe entregar a recompensa final.',
        locationImg: undefined, // sem placeholder aqui
        drops: [],
        delivery: null,
      },
    ],
    steps: [
      { icon: '🗺️', text: 'Vá até <strong>Cianwood</strong> e fale com o NPC <span class="quest-npc">Vernaccio</span>.' },
      { icon: '🪣', text: 'Colete o balde de tinta em <strong>Cianwood</strong>.' },
      { icon: '🪣', text: 'Vá até <strong>Golden Rod</strong> e colete os <strong>2 baldes</strong> de lá.' },
      { icon: '🪣', text: 'Vá até <strong>Ecruteak</strong> e colete o balde restante.' },
      { icon: '🔁', text: 'Retorne a <strong>Cianwood</strong> e entregue todos os baldes ao <span class="quest-npc">Vernaccio</span>.' },
      { icon: '🎁', text: 'Receba a recompensa: <strong>1.000.000 de EXP</strong> e <strong>50 Alliance Balls</strong>.' },
    ],
    info: [
      { label: 'Início da quest',      value: 'Cianwood' },
      { label: 'Localizações extras',  value: 'Cianwood, Ecruteak, Golden Rod' },
      { label: 'Nível de dificuldade', value: '🟢 Baixa' },
      { label: 'Requisitos',           value: 'Um Pokémon com <strong>Fly</strong> e um Pokémon para matar os Smeargles espalhados pelas hunts.' },
    ],
    notes: 'Leve um Pokémon com <strong>Fly</strong> para agilizar o trajeto entre as cidades. Os Smeargles ficam dentro das hunts — tenha um Pokémon de batalha preparado para eliminá-los.',
  },
  {
    name: 'Flint Quest',
    icon: '🏚️',
    items: ['Onix Tail', 'Stone Rocks', 'Horn Drill', 'Rock Plate', 'Crystal Stones', 'Metal Stones'],
    reward: '3 Ancient Stones + 500K EXP + Estante à escolha',
    rewardDesc: 'Flint agradecerá por toda a ajuda e como recompensa você receberá <strong>3 Ancient Stones</strong>, <strong>500K de EXP</strong> e poderá escolher uma das <strong>estantes da casa de Flint</strong> como presente.',
    rewardImg: null, // coloque a URL da imagem da recompensa aqui
    start: 'Encontre o NPC <span class="quest-npc">Flint</span> ao <strong>sul de Pewter</strong>, na floresta de Viridian.' +
           '<div class="quest-location-img-wrap"><span class="quest-location-label">📍 Localização</span>' +
           '<div class="quest-img-placeholder" data-slot="flint-location">📷 Imagem — adicione a URL em <code>rewardImg</code></div></div>' +
           '<br>Fale com ele usando o comando <span class="quest-cmd">hi</span>, depois digite <span class="quest-cmd">help</span> para iniciar a quest.',
    parts: [
      {
        title: 'Parte 1 — Coleta de Materiais',
        icon: '🧱',
        intro: 'Flint pedirá que você colete os seguintes materiais para iniciar a reconstrução da casa:',
        locationImg: null, // imagem desta etapa (opcional)
        drops: [
          { qty: 150, item: 'Onix Tail',   source: 'Onix',   locationImg: null },
          { qty: 200, item: 'Stone Rocks',  source: 'Golem',  locationImg: null },
          { qty: 200, item: 'Horn Drill',   source: 'Rhydon', locationImg: null },
          { qty:  50, item: 'Rock Plate',   source: 'Pupitar',locationImg: null },
        ],
        delivery: 'Com todos os itens em mãos, retorne até o <span class="quest-npc">Flint</span> e fale com ele para entregar os materiais. Ele agradecerá e irá até sua casa para iniciar a reconstrução.',
      },
      {
        title: 'Parte 2 — Reconstrução da Casa',
        icon: '🏡',
        intro: 'Vá até a <strong>casa de Flint</strong>, ainda em Viridian.',
        locationImg: null, // imagem da casa (adicione a URL aqui)
        drops: [
          { qty: 10, item: 'Crystal Stones', source: null, locationImg: null },
          { qty: 10, item: 'Metal Stones',   source: null, locationImg: null },
        ],
        delivery: 'Fale com o <span class="quest-npc">Flint</span> usando <span class="quest-cmd">hi</span>. Quando ele perguntar se você está pronto, responda com <span class="quest-cmd">yes</span> e entregue os materiais.',
      },
    ],
    steps: [
      { icon: '🗺️', text: 'Vá ao <strong>sul de Pewter</strong>, na floresta de Viridian, e encontre o NPC <span class="quest-npc">Flint</span>.' },
      { icon: '💬', text: 'Fale com ele usando <span class="quest-cmd">hi</span> e em seguida <span class="quest-cmd">help</span> para iniciar.' },
      { icon: '🧱', text: 'Colete <strong>150 Onix Tail</strong> (Onix), <strong>200 Stone Rocks</strong> (Golem), <strong>200 Horn Drill</strong> (Rhydon) e <strong>50 Rock Plate</strong> (Pupitar).' },
      { icon: '📦', text: 'Retorne ao <span class="quest-npc">Flint</span> e entregue todos os materiais da Parte 1.' },
      { icon: '🏡', text: 'Vá até a <strong>casa de Flint</strong> em Viridian e fale com ele novamente usando <span class="quest-cmd">hi</span>.' },
      { icon: '🔨', text: 'Responda <span class="quest-cmd">yes</span> e entregue <strong>10 Crystal Stones</strong> e <strong>10 Metal Stones</strong>.' },
      { icon: '🎁', text: 'Receba as recompensas: <strong>3 Ancient Stones</strong>, <strong>500K EXP</strong> e uma estante à escolha.' },
    ],
    notes: 'Para agilizar a coleta da Parte 1, foque nas melhores localizações para cada Pokémon. Certifique-se de estar preparado antes de iniciar, pois Flint poderá solicitar itens e tarefas adicionais.',
  },
];

// ── CSS injetado para quests rich ─────────────────────────────────────
(function () {
  if (document.getElementById('quest-rich-css')) return;
  var s = document.createElement('style');
  s.id = 'quest-rich-css';
  s.textContent = `
/* ── Quest card ── */
.quest-row {
  background: linear-gradient(160deg, rgba(18,26,50,0.97) 0%, rgba(8,13,28,0.99) 100%);
  border: 1px solid rgba(255,210,80,0.12);
  border-radius: 18px;
  overflow: hidden;
  margin-bottom: 14px;
  transition: border-color 0.25s, box-shadow 0.25s;
  position: relative;
}
.quest-row::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255,210,80,0.5), transparent);
  border-radius: 18px 18px 0 0;
  opacity: 0;
  transition: opacity 0.25s;
}
.quest-row:hover, .quest-row.open {
  border-color: rgba(255,210,80,0.30);
  box-shadow: 0 0 32px rgba(255,210,80,0.07), 0 8px 32px rgba(0,0,0,0.5);
}
.quest-row:hover::before, .quest-row.open::before { opacity: 1; }

/* ── Header ── */
.quest-row-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 22px;
  cursor: pointer;
  user-select: none;
  position: relative;
}
.quest-row-num {
  font-family: var(--font-mono, monospace);
  font-size: 11px;
  font-weight: 700;
  color: rgba(255,210,80,0.35);
  letter-spacing: 1px;
  min-width: 20px;
}
.quest-row-icon {
  font-size: 22px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 8px rgba(255,210,80,0.4));
}
.quest-row-name {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 16px;
  font-weight: 700;
  color: #f0d060;
  letter-spacing: 0.6px;
  flex: 1;
  text-shadow: 0 0 20px rgba(255,210,80,0.2);
}
.quest-row-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.quest-level-badge {
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  font-weight: 700;
  color: #60aaff;
  background: rgba(96,170,255,0.1);
  border: 1px solid rgba(96,170,255,0.25);
  border-radius: 20px;
  padding: 3px 10px;
  letter-spacing: 0.8px;
  white-space: nowrap;
}
.quest-row-chevron {
  width: 18px; height: 18px;
  color: rgba(255,210,80,0.4);
  flex-shrink: 0;
  transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), color 0.2s;
}
.quest-row.open .quest-row-chevron {
  transform: rotate(180deg);
  color: #f0d060;
}

/* ── Panel (expandido) ── */
.quest-row-panel {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.5s cubic-bezier(0.4,0,0.2,1);
}
.quest-row.open .quest-row-panel {
  max-height: 2400px;
}
.quest-panel-inner {
  padding: 0 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  border-top: 1px solid rgba(255,210,80,0.08);
  margin-top: 0;
  padding-top: 22px;
}

/* ── Seção ── */
.quest-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.quest-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: rgba(255,210,80,0.6);
}
.quest-section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255,210,80,0.12);
}
.quest-section-icon { font-size: 13px; }

/* ── Reward box ── */
.quest-reward-box {
  background: rgba(255,210,80,0.05);
  border: 1px solid rgba(255,210,80,0.18);
  border-left: 3px solid #f0d060;
  border-radius: 12px;
  padding: 14px 18px;
}
.quest-reward-name {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 15px;
  font-weight: 700;
  color: #f0d060;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.quest-reward-desc {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
  color: rgba(255,255,255,0.65);
  line-height: 1.6;
}
.quest-reward-desc strong { color: rgba(255,255,255,0.9); }

/* ── Info box genérico ── */
.quest-info-box {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  padding: 14px 18px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
  color: rgba(255,255,255,0.65);
  line-height: 1.7;
}
.quest-info-box strong { color: rgba(255,255,255,0.9); }
.quest-info-box em { color: rgba(255,180,50,0.8); font-style: normal; }

/* ── Steps ── */
.quest-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.quest-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  padding: 11px 15px;
  transition: background 0.2s, border-color 0.2s;
}
.quest-step:hover {
  background: rgba(255,210,80,0.04);
  border-color: rgba(255,210,80,0.12);
}
.quest-step-num {
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  font-weight: 700;
  color: rgba(255,210,80,0.4);
  min-width: 18px;
  padding-top: 1px;
}
.quest-step-icon {
  font-size: 15px;
  flex-shrink: 0;
  padding-top: 0px;
  line-height: 1.4;
}
.quest-step-text {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
  color: rgba(255,255,255,0.7);
  line-height: 1.55;
  flex: 1;
}
.quest-step-text strong { color: rgba(255,255,255,0.92); }

/* ── Puzzle image ── */
.quest-puzzle-img-wrap {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08);
  position: relative;
}
.quest-puzzle-img-wrap img {
  width: 100%;
  display: block;
  border-radius: 14px;
}
.quest-puzzle-spoiler-label {
  position: absolute;
  top: 10px; left: 10px;
  background: rgba(0,0,0,0.75);
  border: 1px solid rgba(255,210,80,0.3);
  color: rgba(255,210,80,0.85);
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 3px 10px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
}

/* ── Notes box ── */
.quest-notes-box {
  background: rgba(96,170,255,0.04);
  border: 1px solid rgba(96,170,255,0.15);
  border-left: 3px solid rgba(96,170,255,0.5);
  border-radius: 12px;
  padding: 12px 18px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12.5px;
  color: rgba(255,255,255,0.55);
  line-height: 1.6;
}
.quest-notes-box strong { color: rgba(255,255,255,0.8); }

/* ── Info grid (ficha resumida) ── */
.quest-info-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid rgba(255,210,80,0.1);
  border-radius: 12px;
  overflow: hidden;
}
.quest-info-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.15s;
}
.quest-info-row:last-child { border-bottom: none; }
.quest-info-row:hover { background: rgba(255,210,80,0.03); }
.quest-info-row-label {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: rgba(255,210,80,0.55);
  min-width: 140px;
  flex-shrink: 0;
}
.quest-info-row-value {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
  color: rgba(255,255,255,0.7);
  line-height: 1.5;
}
.quest-info-row-value strong { color: rgba(255,255,255,0.9); }

/* ── Inline tags ── */
.quest-npc {
  color: #60d0ff;
  font-weight: 700;
}
.quest-tag-hunt {
  display: inline-block;
  background: rgba(100,229,160,0.1);
  border: 1px solid rgba(100,229,160,0.3);
  color: #66e5a0;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 20px;
  letter-spacing: 0.5px;
  font-family: var(--font-mono, monospace);
}

@media (max-width: 600px) {
  .quest-row-name { font-size: 13px; }
  .quest-panel-inner { padding: 0 14px 20px; padding-top: 16px; gap: 16px; }
  .quest-reward-box, .quest-info-box, .quest-notes-box { padding: 11px 14px; }
}

/* ── Parte header ── */
.quest-part-header {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 16px;
  background: rgba(255,210,80,0.05);
  border: 1px solid rgba(255,210,80,0.14);
  border-radius: 10px;
  margin-bottom: 10px;
}
.quest-part-icon { font-size: 16px; }
.quest-part-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 12px;
  font-weight: 700;
  color: rgba(255,210,80,0.75);
  letter-spacing: 0.8px;
}

/* ── Drop table ── */
.quest-drop-table {
  width: 100%;
  border-collapse: collapse;
  border-radius: 10px;
  overflow: hidden;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
}
.quest-drop-table thead tr {
  background: rgba(255,255,255,0.04);
}
.quest-drop-table thead th {
  padding: 8px 12px;
  text-align: left;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.3);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.quest-drop-table tbody tr {
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.15s;
}
.quest-drop-table tbody tr:last-child { border-bottom: none; }
.quest-drop-table tbody tr:hover { background: rgba(255,210,80,0.03); }
.quest-drop-table td { padding: 9px 12px; vertical-align: middle; }
.quest-drop-qty {
  font-family: var(--font-mono, monospace);
  font-size: 12px;
  font-weight: 700;
  color: #f0d060;
  white-space: nowrap;
  width: 60px;
}
.quest-drop-item {
  color: rgba(255,255,255,0.85);
  font-weight: 600;
}
.quest-drop-source {
  color: rgba(255,255,255,0.38);
  font-size: 11.5px;
}
.quest-drop-source strong { color: rgba(255,255,255,0.55); }
.quest-drop-loc {
  text-align: right;
  width: 80px;
}
.quest-loc-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #60aaff;
  background: rgba(96,170,255,0.08);
  border: 1px solid rgba(96,170,255,0.2);
  border-radius: 20px;
  padding: 3px 9px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  text-decoration: none;
}
.quest-loc-btn:hover {
  background: rgba(96,170,255,0.16);
  border-color: rgba(96,170,255,0.4);
}
.quest-loc-placeholder {
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  color: rgba(255,255,255,0.15);
  font-style: italic;
}

/* ── Image placeholder ── */
.quest-img-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255,255,255,0.025);
  border: 1.5px dashed rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 28px 20px;
  margin-top: 10px;
  font-family: var(--font-mono, monospace);
  font-size: 11px;
  color: rgba(255,255,255,0.2);
  text-align: center;
}
.quest-img-placeholder code {
  color: rgba(255,210,80,0.4);
  font-size: 10px;
}

/* ── Reward image ── */
.quest-reward-img {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  margin-top: 10px;
  display: block;
}

/* ── Cmd tag ── */
.quest-cmd {
  display: inline-block;
  background: rgba(160,212,255,0.08);
  border: 1px solid rgba(160,212,255,0.22);
  color: #a0d4ff;
  font-family: var(--font-mono, monospace);
  font-size: 11px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 6px;
  letter-spacing: 0.3px;
}

/* ── Delivery note ── */
.quest-delivery-note {
  background: rgba(102,229,160,0.04);
  border: 1px solid rgba(102,229,160,0.12);
  border-left: 3px solid rgba(102,229,160,0.4);
  border-radius: 10px;
  padding: 11px 15px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
  color: rgba(255,255,255,0.6);
  line-height: 1.6;
  margin-top: 8px;
}
.quest-delivery-note strong { color: rgba(255,255,255,0.85); }
  `;
  document.head.appendChild(s);
})();

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
    // ── Header
    var levelBadge = quest.level
      ? '<span class="quest-level-badge">LVL ' + quest.level + '+</span>'
      : '';

    // ── Recompensa
    var rewardSection = '';
    if (quest.reward) {
      rewardSection =
        '<div class="quest-section">' +
          '<div class="quest-section-title"><span class="quest-section-icon">🎁</span> Recompensa</div>' +
          '<div class="quest-reward-box">' +
            '<div class="quest-reward-name">🍀 ' + quest.reward + '</div>' +
            (quest.rewardDesc ? '<div class="quest-reward-desc">' + quest.rewardDesc + '</div>' : '') +
          '</div>' +
        '</div>';
    }

    // ── Pré-requisito
    var prereqSection = '';
    if (quest.level) {
      prereqSection =
        '<div class="quest-section">' +
          '<div class="quest-section-title"><span class="quest-section-icon">📋</span> Pré-requisito</div>' +
          '<div class="quest-info-box">Level mínimo: <strong>' + quest.level + '</strong></div>' +
        '</div>';
    }

    // ── Info (ficha resumida — início, locais, dificuldade, requisitos)
    var infoSection = '';
    if (quest.info && quest.info.length) {
      var infoRows = quest.info.map(function(row) {
        return '<div class="quest-info-row">' +
          '<span class="quest-info-row-label">' + row.label + '</span>' +
          '<span class="quest-info-row-value">' + row.value + '</span>' +
        '</div>';
      }).join('');
      infoSection =
        '<div class="quest-section">' +
          '<div class="quest-section-title"><span class="quest-section-icon">📋</span> Informações</div>' +
          '<div class="quest-info-grid">' + infoRows + '</div>' +
        '</div>';
    }

    // ── Início
    var startSection = '';
    if (quest.start) {
      startSection =
        '<div class="quest-section">' +
          '<div class="quest-section-title"><span class="quest-section-icon">📍</span> Início</div>' +
          '<div class="quest-info-box">' + quest.start + '</div>' +
        '</div>';
    }

    // ── Drop
    var dropSection = '';
    if (quest.drop) {
      dropSection =
        '<div class="quest-section">' +
          '<div class="quest-section-title"><span class="quest-section-icon">⚔️</span> Drop</div>' +
          '<div class="quest-info-box">' + quest.drop + '</div>' +
        '</div>';
    }

    // ── Puzzle
    var puzzleSection = '';
    if (quest.puzzle || quest.puzzleImg) {
      var puzzleImgHtml = '';
      if (quest.puzzleImg) {
        puzzleImgHtml =
          '<div class="quest-puzzle-img-wrap">' +
            '<span class="quest-puzzle-spoiler-label">⚠ SPOILER</span>' +
            '<img src="' + quest.puzzleImg + '" alt="Spoiler do Puzzle" loading="lazy" />' +
          '</div>';
      }
      puzzleSection =
        '<div class="quest-section">' +
          '<div class="quest-section-title"><span class="quest-section-icon">🧩</span> Puzzle</div>' +
          (quest.puzzle ? '<div class="quest-info-box">' + quest.puzzle + '</div>' : '') +
          puzzleImgHtml +
        '</div>';
    }

    // ── Passo a passo
    var stepsSection = '';
    if (quest.steps && quest.steps.length) {
      var stepsHtml = quest.steps.map(function(step, si) {
        return '<div class="quest-step">' +
          '<span class="quest-step-num">0' + (si + 1) + '</span>' +
          '<span class="quest-step-icon">' + step.icon + '</span>' +
          '<span class="quest-step-text">' + step.text + '</span>' +
        '</div>';
      }).join('');
      stepsSection =
        '<div class="quest-section">' +
          '<div class="quest-section-title"><span class="quest-section-icon">📌</span> Passo a Passo</div>' +
          '<div class="quest-steps">' + stepsHtml + '</div>' +
        '</div>';
    }

    // ── Observações
    var notesSection = '';
    if (quest.notes) {
      notesSection =
        '<div class="quest-section">' +
          '<div class="quest-section-title"><span class="quest-section-icon">💡</span> Observações</div>' +
          '<div class="quest-notes-box">' + quest.notes + '</div>' +
        '</div>';
    }

    // ── Recompensa com imagem (override para quests com rewardImg)
    if (quest.reward && quest.rewardImg !== undefined) {
      var rewardImgHtml = quest.rewardImg
        ? '<img class="quest-reward-img" src="' + quest.rewardImg + '" alt="Recompensa" loading="lazy" />'
        : '<div class="quest-img-placeholder">📷 Imagem da recompensa — substitua <code>rewardImg: null</code> pela URL</div>';
      rewardSection =
        '<div class="quest-section">' +
          '<div class="quest-section-title"><span class="quest-section-icon">🎁</span> Recompensa</div>' +
          '<div class="quest-reward-box">' +
            '<div class="quest-reward-name">🏆 ' + quest.reward + '</div>' +
            (quest.rewardDesc ? '<div class="quest-reward-desc">' + quest.rewardDesc + '</div>' : '') +
            rewardImgHtml +
          '</div>' +
        '</div>';
    }

    // ── Partes (parts)
    var partsSection = '';
    if (quest.parts && quest.parts.length) {
      partsSection = quest.parts.map(function(part, pi) {
        // Drop table
        var tableHtml = '';
        if (part.drops && part.drops.length) {
          var rows = part.drops.map(function(d) {
            var locHtml = d.locationImg
              ? '<a class="quest-loc-btn" href="' + d.locationImg + '" target="_blank">📍 VER</a>'
              : '<span class="quest-loc-placeholder">a definir</span>';
            var sourceHtml = d.source
              ? 'Drop de <strong>' + d.source + '</strong>'
              : '<span style="color:rgba(255,255,255,0.25)">—</span>';
            return '<tr>' +
              '<td class="quest-drop-qty">×' + d.qty + '</td>' +
              '<td class="quest-drop-item">' + d.item + '</td>' +
              '<td class="quest-drop-source">' + sourceHtml + '</td>' +
              '<td class="quest-drop-loc">' + locHtml + '</td>' +
            '</tr>';
          }).join('');
          tableHtml =
            '<table class="quest-drop-table">' +
              '<thead><tr>' +
                '<th>QTD</th><th>ITEM</th><th>FONTE</th><th style="text-align:right">LOCAL</th>' +
              '</tr></thead>' +
              '<tbody>' + rows + '</tbody>' +
            '</table>';
        }

        // Location image placeholder
        var locImgHtml = '';
        if (part.locationImg !== undefined) {
          locImgHtml = part.locationImg
            ? '<img class="quest-reward-img" src="' + part.locationImg + '" alt="Localização" loading="lazy" />'
            : '<div class="quest-img-placeholder">📷 Imagem desta etapa — substitua <code>locationImg: null</code> pela URL</div>';
        }

        return '<div class="quest-section">' +
          '<div class="quest-section-title">' +
            '<span class="quest-section-icon">' + (part.icon || '📦') + '</span> ' + part.title +
          '</div>' +
          (part.intro ? '<div class="quest-info-box" style="margin-bottom:0">' + part.intro + '</div>' : '') +
          locImgHtml +
          tableHtml +
          (part.delivery ? '<div class="quest-delivery-note">✅ ' + part.delivery + '</div>' : '') +
        '</div>';
      }).join('');
    }

    return (
      '<div class="quest-row" id="quest-row-' + idx + '">' +
        '<div class="quest-row-header" onclick="toggleQuestRow(' + idx + ')">' +
          '<span class="quest-row-num">' + String(idx + 1).padStart(2, '0') + '</span>' +
          '<span class="quest-row-icon">' + (quest.icon || '📜') + '</span>' +
          '<span class="quest-row-name">' + quest.name + '</span>' +
          '<div class="quest-row-meta">' +
            levelBadge +
            '<svg class="quest-row-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>' +
          '</div>' +
        '</div>' +
        '<div class="quest-row-panel">' +
          '<div class="quest-panel-inner">' +
            rewardSection +
            prereqSection +
            infoSection +
            startSection +
            dropSection +
            partsSection +
            puzzleSection +
            stepsSection +
            notesSection +
          '</div>' +
        '</div>' +
      '</div>'
    );
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
  'charmelion': 'charmeleon',
  'nidoran-f':  'nidoranf',
  'nidoran-m':  'nidoranm',
  'ho-oh':      'hooh',
  'porygon-z':  'porygonz',
  'mime jr.':   'mimejr',
  'grambull': 'granbull',
  'politoad': 'politoed',
  'mr. mime': 'mrmime',
  'mr.mime':  'mrmime',
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
// Estado centralizado em window.pkgState (packages.logic.js).
// currentPkg / currentPkgState: usados apenas pelo modal legado abaixo.
let currentPkg = null;
let currentPkgState = [];
// activePkgIdx, activePkgCat, activeSlotByPkg, disabledPkgItems → pkgState
// pkgCartCount → pkgState.cartCount (alias definido em packages.logic.js)

// getPkgTypeColor, getPkgIcon → packages.logic.js
function getPkgItemData(itemName) {
  return items.find(i => i.name.toLowerCase() === itemName.toLowerCase()) || null;
}

function getPkgAllItems(pkg) {
  return (pkg.slots || []).flat();
}
// getPkgTotal → packages.logic.js



function updatePkgQty(idx, val) {
  const qty = Math.max(0, parseInt(val, 10) || 0);
  currentPkgState[idx].qty = qty;
  const item = getPkgItemData(currentPkgState[idx].name);
  const lineTotal = item && item.price !== null && item.price > 0 && qty > 0 ? item.price * qty : 0;
  const priceEl = document.getElementById('pkg-price-' + idx);
  if (priceEl) {
    if (lineTotal === 0 && item && item.price === 0) {
      priceEl.textContent = 'Grátis';
    } else if (lineTotal > 0) {
      priceEl.textContent = formatKK(lineTotal).label;
    } else {
      priceEl.textContent = '—';
    }
  }
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
    if (item && item.price !== null && item.price > 0 && entry.qty > 0) totalRaw += item.price * entry.qty;
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

function handlePkgOverlayClick(e)      { overlayDismiss(e, closePkgModal); }

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
  if (window.pkgState) pkgState.cartCount[pi] = pkgCartCount[pi];

  getPkgActiveItems(PACKAGES[pi], pi).forEach(([name, qty]) => {
    if (!qty || qty <= 0) return;
    const idx = items.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
    if (idx === -1) return;
    cart[idx] = (cart[idx] || 0) + qty;
    const addBtn = document.getElementById('item-addbtn-' + idx);
    const addLbl = document.getElementById('item-addbtn-label-' + idx);
    if (addBtn) addBtn.classList.add('added');
    if (addLbl) addLbl.textContent = '\u2713 ' + cart[idx].toLocaleString();
    const remSlot = document.getElementById('item-rembtn-' + idx);
    if (remSlot && remSlot.tagName === 'SPAN') {
      const remBtn = document.createElement('button');
      remBtn.className = 'item-rem-btn';
      remBtn.id = 'item-rembtn-' + idx;
      remBtn.title = 'Remover do carrinho';
      remBtn.innerHTML = '\u2715';
      remBtn.onclick = () => itemRemoveFromCart(idx);
      remSlot.replaceWith(remBtn);
    }
  });

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
    const addBtn2 = document.getElementById('item-addbtn-' + idx);
    const addLbl2 = document.getElementById('item-addbtn-label-' + idx);
    if (addBtn2) { addBtn2.classList.remove('added'); }
    if (addLbl2) { addLbl2.textContent = 'Adicionar'; }
    const remBtn = document.getElementById('item-rembtn-' + idx);
    if (remBtn && remBtn.tagName === 'BUTTON') {
      const span = document.createElement('span');
      span.id = 'item-rembtn-' + idx;
      remBtn.replaceWith(span);
    }
  });
  delete pkgCartCount[pi];
  if (window.pkgState) delete pkgState.cartCount[pi];
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


// --- WebGL plasma shader REMOVIDO (causava jank no scroll) ---
(function() {
  var canvas = document.getElementById('shader-canvas');
  if (canvas) canvas.style.display = 'none';
})();

// --- Floating ambient particles REMOVIDAS (causavam repaint constante) ---


// ===================== BROKE DATA =====================
// Tabela de max brokes por tier (para shinys)
const BROKE_DATA = {
  't1':         { max: 1280,    label: '1.280 UB' },
  't2':         { max: 900,     label: '~900 UB',  approx: true },
  't3':         { max: 700,     label: '~700 UB',  approx: true },
  't4':         { max: 600,     label: '~600 UB',  approx: true },
  't5':         { max: 400,     label: '~400 UB',  approx: true },
  't6':         { max: 200,     label: '~200 UB',  approx: true },
  'super-raro': { max: 3512,   label: '3.512 UB' },
  'ultra-raro': { max: 9100,   label: '9.100 UB' },
  'legendary':  { max: 22535,  label: '22.535 UB' },
  'mythical':   { max: null,   label: '? UB' },
};

function getBrokeForTag(tag) {
  if (!tag) return null;
  return BROKE_DATA[tag] || null;
}

// ===================== CAPTURA =====================
// Formato: { name: "Nome", price: <raw kk igual RAW>, image: "url" }
// POKEMONS migrado para Supabase (catalog_pokemons)
// db-bootstrap.js popula window.POKEMONS[] automaticamente
// Garante que POKEMONS e window.POKEMONS são o MESMO array
if (!window.POKEMONS) window.POKEMONS = [];
var POKEMONS = window.POKEMONS;
// Store original index for O(1) lookup
POKEMONS.forEach((p, i) => { p._idx = i; });

// Injeta bannerImage nos items a partir do POKEMONS
POKEMONS.forEach(p => {
  if (!p.bannerImage) return;
  const item = items.find(it => it.name === p.name);
  if (item) item.bannerImage = p.bannerImage;
});

const BALLS = [
  { id: "ultra",    name: "Ultra Ball",    emoji: '<img src="https://i.imgur.com/D5T6Dgw.png" style="width:40px;height:40px;object-fit:contain" />', color: "var(--gold)",  mult: 1.0 },
  { id: "premier",  name: "Premier Ball",  emoji: '<img src="https://i.imgur.com/sIwvw2L.png" style="width:40px;height:40px;object-fit:contain" />', color: "#e8e8e8",     mult: 0.6 },
  { id: "alliance", name: "Alliance Ball", emoji: '<img src="https://i.imgur.com/QFXUD5f.png" style="width:40px;height:40px;object-fit:contain" />', color: "#b67fff",     mult: 0.6 },
];

// ── Regras de ETA por raridade (captura) ────────────────────────────────────
const CAPTURE_ETA_RULES = {
  default:    { minDays: 7,  maxDays: 7  },  // 7 dias fixos por pacote
  super_rare: { minDays: 45, maxDays: 45 },  // 45 dias fixos por unidade
};

function _getCapturaEta(poke) {
  if (poke && poke.tag === 'super-raro') return CAPTURE_ETA_RULES.super_rare;
  return CAPTURE_ETA_RULES.default;
}

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
    const effectivePrice = (poke.price !== null && poke.price !== undefined) ? Math.round(poke.price * diveMultiplier) : poke.price;
    const priceData = formatKK(effectivePrice);
    const priceHtml = priceData
      ? `<span class="captura-list-price-kk" style="color:${typeColor}">${priceData.label}</span>
         <span class="captura-list-price-brl">${priceData.brl}</span>`
      : (poke.price === null || poke.price === undefined)
        ? `<span class="price-none">sem preço</span>`
        : `<span class="price-free">Grátis</span>`;

    const tagsHtml = [
      poke.tag ? getCapturaTagHtml(poke.tag) : '',
      poke.dive ? getCapturaTagHtml('dive') : '',
    ].join('');

    // Banner de tipo (ícone pequeno)
    const typeIconHtml = poke.bannerImage
      ? `<img class="captura-list-type-icon" src="${poke.bannerImage}" alt="" loading="lazy" onerror="this.style.display='none'" />`
      : '';

    const brokeInfo = getBrokeForTag(poke.tag);
    const brokeHtml = brokeInfo
      ? `<div class="captura-list-broke"><span class="broke-icon">💥</span><span class="broke-label">Max Broke</span><span class="broke-val">${brokeInfo.label}</span></div>`
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
        ${brokeHtml}
      </div>
      <div class="captura-list-price">${priceHtml}</div>
      <button class="captura-list-catch-btn" onclick="event.stopPropagation();openCapturaModal(${idx})">⬟</button>
    </div>`;
  }).join('') + '</div>';
}

function openCapturaModal(idx) {
  currentCapturaIdx = idx;
  selectedBall = 'ultra'; // única ball disponível — pré-selecionada
  const poke = POKEMONS[idx];
  const ball = BALLS[0]; // Ultra Ball
  const diveMultiplier = poke.dive ? 1.30 : 1.0;
  const effectiveBasePrice = (poke.price !== null && poke.price !== undefined) ? Math.round(poke.price * diveMultiplier) : poke.price;
  const finalPrice = _calcCapturaFinalPrice(poke, ball);
  const priceData = formatKK(finalPrice);
  const pokeType = getTypeFromBanner(poke.bannerImage);
  const typeColor = pokeType && TYPE_COLORS[pokeType] ? TYPE_COLORS[pokeType] : '#ffd166';

  document.getElementById('captura-modal-title').textContent = poke.name;
  const body = document.getElementById('captura-modal-body');
  body.innerHTML = `
    <div class="captura-modal-img-wrap">
      <img class="captura-modal-pokemon-img" src="${typeof getShowdownSprite === 'function' ? getShowdownSprite(poke.name) : ''}" alt="${poke.name}" onerror="this.style.opacity='0.3'" />
    </div>
    <div class="captura-modal-info">
      <div class="captura-modal-poke-name">${poke.name}</div>
      <div style="margin-top:6px;display:flex;justify-content:center;gap:6px;flex-wrap:wrap">
        ${poke.tag ? getCapturaTagHtml(poke.tag) : ''}
        ${poke.dive ? getCapturaTagHtml('dive') : ''}
      </div>
      ${poke.dive ? `<div style="margin-top:8px;font-family:var(--font-body);font-size:11px;color:#00e5ff;opacity:0.8;letter-spacing:1px;text-align:center"><img src="https://i.imgur.com/zpRe43i.png" style="height:12px;vertical-align:middle;margin-right:4px;"> Pokémon em Dive — +30% aplicado</div>` : ''}
      ${priceData ? `
      <div class="captura-modal-price-block">
        <span class="captura-modal-price-kk">${priceData.label}</span>
        <span class="captura-modal-price-sep">·</span>
        <span class="captura-modal-price-brl">${priceData.brl}</span>
      </div>` : '<div class="captura-modal-price-block" style="color:var(--muted)">Preço a definir</div>'}
    </div>
    ${buildDropsHtml(poke.name, typeColor)}
    ${(function() {
      const eta = _getCapturaEta(poke);
      return `<div class="captura-sla-info">
        <span class="captura-sla-icon">⏱</span>
        <span>Tempo estimado: <strong>${eta.minDays === eta.maxDays ? eta.minDays + ' dias' : eta.minDays + ' a ' + eta.maxDays + ' dias'}</strong> após início do serviço</span>
      </div>`;
    })()}
    <div class="captura-success-msg" id="captura-success-msg">
      <span>🎉</span>
      <span id="captura-success-text">Pedido registrado!</span>
    </div>
    <button class="captura-confirm-btn" id="captura-confirm-btn" onclick="confirmCaptura()">
      <span>⬟ Adicionar aos Pedidos</span>
    </button>
  `;
  document.getElementById('captura-overlay').classList.add('open');
}

function selectBall(ballId) {
  // Ultra Ball apenas — mantido para compatibilidade de chamadas antigas
  selectedBall = ballId;
}


// ── _addCapturaToMainCart — integra captura no carrinho principal (Fase 5.3 unificado) ──
// Adiciona um pokémon diretamente no cart[] + items[] existentes.
// Usa o slot dinâmico em items[] para não conflitar com itens do catálogo.
// O carrinho exibe o item via renderCart() que já suporta _capturaId.
function _addCapturaToMainCart(pokeData, ball, finalPrice, priceData) {
  if (!pokeData) return null;

  // Gera slot único em items[] para este item de captura
  // Usa índice a partir de 900000 para não conflitar com catálogo real
  const _CAPTURA_BASE = 900000;
  const capturaId = 'cap_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

  // Encontra próximo slot livre >= CAPTURA_BASE
  let slot = _CAPTURA_BASE;
  while (items[slot] !== undefined) slot++;

  // Monta item de captura com campos necessários para renderCart() e sendToWhatsApp()
  const tag = (pokeData.tag || '').toLowerCase();
  const tierLabel = tag === 'super-raro' || tag === 'sr' ? 'SR'
    : tag === 't1' ? 'T1'
    : tag === 't2' ? 'T2'
    : tag === 't3' ? 'T3'
    : (pokeData.tag ? pokeData.tag.toUpperCase() : '');

  // Nome público: oculta identidade do pokémon para outros usuários (QueuePrivacy)
  const publicName = tierLabel
    ? 'Captura ' + tierLabel + ' · ' + ball.name
    : 'Captura · ' + ball.name;

  // Ball emoji SVG (reutilizado do BallsSelector se disponível)
  let ballEmoji = '';
  if (typeof BallsSelector !== 'undefined' && typeof BallsSelector.getBallSvg === 'function') {
    ballEmoji = BallsSelector.getBallSvg(ball.id) || '';
  }

  items[slot] = {
    name:        publicName,               // exibido no carrinho
    image:       pokeData.image || '',     // imagem do pokémon (privada — só para o dono)
    price:       finalPrice,               // preço calculado
    tier:        pokeData.tag || '',       // tier original
    // Campos de captura
    _capturaId:  capturaId,               // marca como item de captura
    _pokeData:   pokeData,                // dados completos do pokémon
    _ball:       ball,                    // ball escolhida
    _ballEmoji:  ballEmoji,
    _priceData:  priceData,
    // Campos para sendToWhatsApp payload
    type:        'capture',
    pokemon:     pokeData.name,
    ball_name:   ball.name,
    ball_type:   ball.id,
  };

  // Adiciona ao cart com qty=1
  cart[slot] = 1;
  updateCartBadge();

  // Re-renderiza cart se estiver aberto
  if (document.getElementById('cart-overlay') &&
      document.getElementById('cart-overlay').classList.contains('open')) {
    renderCart();
  }

  // Abre o carrinho para o usuário ver o item adicionado
  setTimeout(function() { openCart(); }, 300);

  if (window.PA && window.PA.telemetry) {
    window.PA.telemetry.push('state_mutation', {
      prop: 'cart', op: 'capture-add', slot: slot, capturaId: capturaId,
    });
  }

  return { slot: slot, capturaId: capturaId, item: items[slot] };
}

// Limpa slots de captura do items[] quando o carrinho é limpo
// (necessário para não vazar slots entre sessões)
const _origLimparCarrinho = typeof _limparCarrinhoAposPedido === 'function'
  ? _limparCarrinhoAposPedido : null;

function _limparCapturaSlots() {
  const _CAPTURA_BASE = 900000;
  Object.keys(items).forEach(function(k) {
    if (parseInt(k, 10) >= _CAPTURA_BASE && items[k] && items[k]._capturaId) {
      delete items[k];
    }
  });
}

// ── confirmCaptura — v5 — Adiciona ao CapturaCart (Fase 5.3) ─────────────────
// MUDANÇA: Em vez de submeter pedido direto, adiciona ao carrinho de captura.
// O usuário pode acumular múltiplos pokémons e enviar como pedido composto.
// RETROCOMPATIBILIDADE: CapturaCart.checkout() usa o mesmo _salvarPedidoSupabase().
// ──────────────────────────────────────────────────────────────────────────────
async function confirmCaptura() {
  if (currentCapturaIdx === null) return;

  // ── 1. Sessão obrigatória ─────────────────────────────────────────────────
  const user = (typeof Session !== 'undefined' && Session.isLoggedIn())
    ? Session.getCurrentUser() : null;
  if (!user) {
    if (typeof AuthModal !== 'undefined') AuthModal.open('login');
    return;
  }

  // ── Lê ball escolhida no BallsSelector (fallback: ultra) ─────────────────
  const _ballId = (window._selectedBallType && window._selectedBallIdx === currentCapturaIdx)
    ? window._selectedBallType : 'ultra';
  const ball = BALLS.find(b => b.id === _ballId) || BALLS[0];
  // Limpa estado global após leitura
  window._selectedBallType   = null;
  window._selectedBallPrices = null;
  window._selectedBallIdx    = null;

  const pokeData   = POKEMONS[currentCapturaIdx];
  const finalPrice = _calcCapturaFinalPrice(pokeData, ball);
  const priceData  = formatKK(finalPrice);

  // ── 2. Adiciona ao carrinho principal unificado (Fase 5.3 — arquitetura corrigida) ─
  const cartEntry = _addCapturaToMainCart(pokeData, ball, finalPrice, priceData);
  if (!cartEntry) {
    console.error('[confirmCaptura] _addCapturaToMainCart falhou.');
    return;
  }

  // Feedback visual no modal
  const btn = document.getElementById('captura-confirm-btn');
  const msg = document.getElementById('captura-success-msg');
  if (btn) {
    btn.innerHTML = '<span>✓ Adicionado ao Carrinho</span>';
    btn.style.borderColor = 'rgba(37,211,102,0.5)';
    btn.style.color = '#25d366';
  }
  if (msg) {
    const totalCaptura = Object.keys(cart).filter(k =>
      items[parseInt(k,10)] && items[parseInt(k,10)]._capturaId
    ).length;
    const txtEl = document.getElementById('captura-success-text');
    if (txtEl) txtEl.textContent = pokeData.name + ' adicionado ao carrinho! (' + totalCaptura + ' captura' + (totalCaptura !== 1 ? 's' : '') + ')';
    msg.classList.add('show');
  }

  // Fecha modal após 1.2s para o usuário poder adicionar mais pokémons
  setTimeout(() => closeCapturaModal(), 1200);
}

// ── _confirmCapturaLegacy — comportamento original v4 (fallback) ─────────────
// Preservado intacto para garantir zero regressão caso CapturaCart não carregue.
async function _confirmCapturaLegacy(pokeData, ball, finalPrice, priceData, user) {
  const nick = (user.nickname || user.email) || 'Anônimo';
  const drops = (typeof getPokeDrops === 'function') ? getPokeDrops(pokeData.name) : [];
  const tag = (pokeData.tag || '').toLowerCase();
  const isSR = (tag === 'super-raro' || tag === 'sr');
  const serviceType = isSR ? 'pokemon_sr' : 'normal_package';

  const itemSupabase = {
    nome:           pokeData.name + ' (' + ball.name + ')',
    quantidade:     1,
    type:           'capture',
    pokemon:        pokeData.name,
    tier:           pokeData.tag || '',
    ball:           ball.name,
    ball_type:      ball.id,
    preco_unit_raw: finalPrice || 0,
    preco_unit_kk:  priceData ? priceData.label : '—',
    preco_unit_brl: priceData ? priceData.brl   : '—',
    drops:          drops.map(d => d.name),
    status:         'pending',
    started_at:     null,
    completed_at:   null,
    actual_duration_minutes: null,
  };

  const subtotalRaw = finalPrice || 0;
  const subtotalKK  = priceData ? priceData.label : '—';
  const subtotalBRL = subtotalRaw > 0
    ? (subtotalRaw / 1000000 * KK_TO_BRL).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';
  const _calcPriceBRL = subtotalRaw > 0 ? Math.round(subtotalRaw / 1000000 * KK_TO_BRL * 100) / 100 : 0;

  const payload = {
    user_id: user.id || null, nick_jogo: nick, status: 'pendente', status_v3: 'waiting_queue',
    tipo_servico: serviceType, service_type: serviceType, service_quantity: 1,
    started_at: null, sla_min_days: null, sla_max_days: null,
    itens: [itemSupabase],
    subtotal_kk: subtotalKK, subtotal_brl: subtotalBRL,
    total_kk: subtotalKK, total_brl: subtotalBRL, taxa_servico: false,
    ball_type: ball.id, calculated_price_brl: _calcPriceBRL,
    calculated_price_kk: finalPrice || 0, calculated_price_dd: 0,
    ball_returned: false, client_supplied_balls: true,
  };

  const _ballFields = ['ball_type','calculated_price_brl','calculated_price_kk',
    'calculated_price_dd','ball_returned','client_supplied_balls'];

  const btn = document.getElementById('captura-confirm-btn');
  const msg = document.getElementById('captura-success-msg');
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Registrando...'; }

  try {
    let saved;
    try { saved = await _salvarPedidoSupabase(payload); }
    catch (ballErr) {
      if (ballErr.message && ballErr.message.includes('ball_')) {
        const fallback = Object.assign({}, payload);
        _ballFields.forEach(f => delete fallback[f]);
        saved = await _salvarPedidoSupabase(fallback);
      } else { throw ballErr; }
    }
    const pedidoId = saved?.id ? ' #' + String(saved.id).padStart(4, '0') : '';
    if (typeof OrdersNotifications !== 'undefined') {
      OrdersNotifications.show(`Pedido${pedidoId} criado! Aguarde confirmação.`, 'pendente', 6000);
    }
    if (typeof pedidosCarregar === 'function') setTimeout(() => pedidosCarregar(), 300);
    else if (typeof OrdersUI !== 'undefined') setTimeout(() => OrdersUI.refresh(), 300);

    const priceStr = priceData ? ` · ${priceData.label} (${priceData.brl})` : '';
    if (msg) {
      const txtEl = document.getElementById('captura-success-text');
      if (txtEl) txtEl.textContent = `${pokeData.name} adicionado aos pedidos${priceStr}!`;
      msg.classList.add('show');
    }
    if (btn) { btn.innerHTML = '<span>✓ Adicionado aos Pedidos</span>'; btn.style.borderColor = 'rgba(37,211,102,0.5)'; btn.style.color = '#25d366'; }
    setTimeout(() => closeCapturaModal(), 2200);
  } catch (err) {
    console.error('[confirmCaptura LEGACY] ❌ Falha:', err);
    if (btn) { btn.disabled = false; btn.innerHTML = '<span>⬟ Tentar Novamente</span>'; }
    if (typeof showToast === 'function') showToast('Erro ao registrar: ' + err.message, 'error');
  }
}
function closeCapturaModal() {
  document.getElementById('captura-overlay').classList.remove('open');
  currentCapturaIdx = null;
  selectedBall = null;
}

function handleCapturaOverlayClick(e)  { overlayDismiss(e, closeCapturaModal); }

// renderItems() é chamado por items.render.js (initItemsModule)

// ── GIF Hover Manager — apenas captura (items geridos por items.render.js) ──
(function GifHoverManager() {
  'use strict';

  function bindCard(card) {
    if (card._gifBound) return;
    card._gifBound = true;
    var img = card.querySelector('img[data-gif]');
    if (!img) return;
    card.addEventListener('mouseenter', function() { img.src = img.dataset.gif; });
    card.addEventListener('mouseleave', function() { img.src = getShowdownStaticSprite(img.alt); });
  }

  function bindAll() {
    document.querySelectorAll('.captura-card').forEach(bindCard);
  }

  bindAll();

  var mo = new MutationObserver(bindAll);
  var capturaGridEl = document.getElementById('captura-grid');
  if (capturaGridEl) mo.observe(capturaGridEl, { childList: true });
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
{ src: "https://i.imgur.com/0mAPijC.png",  name: "Shiny Crobat - Itens de Talento — Zripper",        date: "04/05/2026" },
{ src: "https://i.imgur.com/tCKCggp.png",  name: "Shiny Persian — Bihi, quem pegou foi o amigo",        date: "04/05/2026" },
{ src: "https://i.imgur.com/8c7IkrQ.png",  name: "Itens de talento — Saga",        date: "05/05/2026" },
{ src: "https://i.imgur.com/tCKCggp.png",  name: "Shiny Qwilfish — Saga",        date: "05/05/2026" },
{ src: "https://i.imgur.com/tCKCggp.png",  name: "Shiny Qwilfish — Saga, ultimo de uma encomenda de 4 shinys",        date: "05/05/2026" },
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

  // Parse date DD/MM/YYYY → sortable number YYYYMMDD
  function parseDateVal(d) {
    if (!d) return 0;
    const parts = d.split('/');
    if (parts.length !== 3) return 0;
    return parseInt(parts[2] + parts[1] + parts[0], 10);
  }

  // Format date for display: DD/MM/YYYY → "DD de Mês de YYYY"
  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  function formatDateLabel(d) {
    if (!d) return d;
    const parts = d.split('/');
    if (parts.length !== 3) return d;
    const mes = MESES[parseInt(parts[1], 10) - 1] || parts[1];
    return `${parseInt(parts[0], 10)} de ${mes} de ${parts[2]}`;
  }

  // Group by date, most recent first
  const groups = {};
  const groupOrder = [];
  ENTREGAS.forEach((item, idx) => {
    const key = item.date || 'Sem data';
    if (!groups[key]) {
      groups[key] = [];
      groupOrder.push(key);
    }
    groups[key].push({ item, idx });
  });

  // Sort groups: most recent first
  groupOrder.sort((a, b) => parseDateVal(b) - parseDateVal(a));

  let html = '';
  groupOrder.forEach(dateKey => {
    const entries = groups[dateKey];
    html += `
    <div class="entregas-date-group">
      <div class="entregas-date-header">
        <div class="entregas-date-line"></div>
        <div class="entregas-date-pill">
          <span class="entregas-date-icon">📅</span>
          <span class="entregas-date-text">${formatDateLabel(dateKey)}</span>
          <span class="entregas-date-count">${entries.length} ${entries.length === 1 ? 'entrega' : 'entregas'}</span>
        </div>
        <div class="entregas-date-line"></div>
      </div>
      <div class="entregas-date-grid">
        ${entries.map(({ item, idx }) => `
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
        </div>`).join('')}
      </div>
    </div>`;
  });

  grid.innerHTML = html;
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

// ── Registro do hook de entregas ──────────────────────────────────────────
// nav-runtime.js é carregado DEPOIS de app.js, então NavRuntime não existe
// no momento do DOMContentLoaded de app.js. Esta função aguarda NavRuntime
// ficar disponível antes de registrar o hook, e também garante a renderização
// ao entrar diretamente via URL hash (#entregas).

function registerEntregasHook() {
  // NavRuntime já chama renderEntregas() diretamente no switchTab (linha ~134).
  // O hook aqui é uma camada extra para garantir o caso de entrada via URL hash
  // e quaisquer caminhos alternativos de navegação.
  if (typeof NavRuntime !== 'undefined' && typeof NavRuntime.onTabSwitch === 'function') {
    NavRuntime.onTabSwitch('after', 'app-entregas', function (tab) {
      if (tab === 'entregas' && typeof renderEntregas === 'function') renderEntregas();
    });
    // Se a aba entregas já está ativa agora (entrada direta via #entregas),
    // renderiza imediatamente.
    if (typeof renderEntregas === 'function') {
      var hash = window.location.hash.replace(/^#/, '').toLowerCase();
      if (hash === 'entregas') renderEntregas();
    }
    return true; // registrado com sucesso
  }
  return false; // NavRuntime ainda não disponível
}

// Tenta registrar imediatamente. Se NavRuntime ainda não existir,
// faz retries leves com intervalo curto até ele estar disponível.
(function () {
  if (registerEntregasHook()) return;
  var attempts = 0;
  var maxAttempts = 20; // até ~2s de espera (20 × 100ms)
  var interval = setInterval(function () {
    attempts++;
    if (registerEntregasHook() || attempts >= maxAttempts) {
      clearInterval(interval);
    }
  }, 100);
})();

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
    const price = (entry[2] !== undefined && entry[2] !== null) ? Number(entry[2]) : null;
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
    const priceLabel = (drop.price !== null && drop.price > 0) ? formatKK(drop.price) : null;
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
// Substituído pelo item-card-popup.js — função redefinida lá
function openWikiLookup(itemName, e) { /* substituído por item-card-popup.js */ }
function closeWikiPopup() {}
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
