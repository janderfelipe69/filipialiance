// ============================================================
// pedidos.js — Integração Supabase para salvar pedidos
// Substitui sendToWhatsApp() e sendToDiscord()
// Adicione ao index.html DEPOIS de app.js:
//   <script src="pedidos.js"></script>
// ============================================================

const SUPABASE_URL = 'https://xzmefefcfwhlkmqrkxcd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bWVmZWZjZndobGttcXJreGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTA5MTEsImV4cCI6MjA5NDE4NjkxMX0.i9ESDqCP9fDdQrK0e-TkchbEJrAlZ6qhKh8-Yu6axAg';

// ── helpers internos ──────────────────────────────────────────────────────────

function _pedidos_toBRL(raw) {
  return (raw / 1000000 * KK_TO_BRL).toFixed(2);
}

function _pedidos_getNick() {
  const nickInput = document.getElementById('cart-nick-input');
  return nickInput ? nickInput.value.trim() : '';
}

function _pedidos_showNickError() {
  const wrap = document.getElementById('nick-field-wrap');
  const err  = document.getElementById('nick-error');
  if (wrap) { wrap.classList.remove('error'); void wrap.offsetWidth; wrap.classList.add('error'); }
  if (err)  err.classList.add('visible');
  const nickInput = document.getElementById('cart-nick-input');
  if (nickInput) nickInput.focus();
}

function _pedidos_showToast(titulo, msg) {
  const toast      = document.getElementById('no-price-toast');
  const toastMsg   = document.getElementById('no-price-toast-msg');
  const toastTitle = toast ? toast.querySelector('.toast-title') : null;
  if (!toast) return;
  if (toastTitle) toastTitle.textContent = titulo;
  if (toastMsg)   toastMsg.textContent   = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    if (toastTitle) toastTitle.textContent = 'Atenção — item sem preço!';
  }, 5000);
}

function _pedidos_buildItens(keys) {
  return keys.map(k => {
    const item    = items[k];
    const qty     = cart[k];
    const unitRaw = item.price || 0;
    const totRaw  = unitRaw * qty;
    return {
      nome:       item.name,
      tier:       item.tier   || '',
      quantidade: qty,
      preco_unit_raw:  unitRaw,
      preco_unit_kk:   unitRaw  > 0 ? (formatKK(unitRaw)?.label  || '—') : '—',
      preco_unit_brl:  unitRaw  > 0 ? 'R$ ' + _pedidos_toBRL(unitRaw).replace('.', ',')  : '—',
      preco_total_raw: totRaw,
      preco_total_kk:  totRaw   > 0 ? (formatKK(totRaw)?.label   || '—') : '—',
      preco_total_brl: totRaw   > 0 ? 'R$ ' + _pedidos_toBRL(totRaw).replace('.', ',')  : '—',
    };
  });
}

function _pedidos_buildPayload(nick, itens, grandTotalRaw, grandTotalFinal) {
  const TAXA_THRESHOLD = 10000000;
  const hasTaxa = grandTotalRaw > 0 && grandTotalRaw < TAXA_THRESHOLD;

  // modo de pagamento
  const mode = typeof _currentPayMode !== 'undefined' ? _currentPayMode : 'brl';
  let pagamento_modo  = mode;
  let pagamento_kk    = null;
  let pagamento_brl   = null;

  if (mode === 'kk') {
    const kkD = formatKK(typeof _payTotalKk !== 'undefined' ? _payTotalKk : grandTotalFinal);
    pagamento_kk = kkD ? kkD.label : null;
  } else if (mode === 'brl') {
    pagamento_brl = 'R$ ' + (grandTotalFinal / 1000000 * KK_TO_BRL).toFixed(2).replace('.', ',');
  } else if (mode === 'mix') {
    const kkVal  = parseFloat(document.getElementById('mix-kk-input')?.value)  || 0;
    const brlVal = parseFloat(document.getElementById('mix-brl-input')?.value) || 0;
    const kkD    = kkVal > 0 ? formatKK(kkVal * 1000000) : null;
    pagamento_kk  = kkD ? kkD.label : null;
    pagamento_brl = brlVal > 0 ? 'R$ ' + brlVal.toFixed(2).replace('.', ',') : null;
  }

  return {
    nick_jogo:        nick,
    itens:            itens,
    subtotal_kk:      grandTotalRaw  > 0 ? (formatKK(grandTotalRaw)?.label   || '—') : '—',
    subtotal_brl:     grandTotalRaw  > 0 ? 'R$ ' + _pedidos_toBRL(grandTotalRaw).replace('.', ',')  : '—',
    taxa_servico:     hasTaxa,
    total_kk:         grandTotalFinal > 0 ? (formatKK(grandTotalFinal)?.label || '—') : '—',
    total_brl:        grandTotalFinal > 0 ? 'R$ ' + _pedidos_toBRL(grandTotalFinal).replace('.', ',') : '—',
    pagamento_modo,
    pagamento_kk,
    pagamento_brl,
    status:           'pendente',
  };
}

async function _pedidos_salvar(payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/pedidos`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer':        'return=representation',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error('Supabase error ' + res.status + ': ' + txt);
  }

  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? data[0] : data;
}

// ── função principal chamada pelo botão Finalizar ─────────────────────────────

async function sendToWhatsApp() {
  const keys = Object.keys(cart).filter(k => cart[k] > 0);
  if (!keys.length) return;

  const nick = _pedidos_getNick();
  if (!nick) { _pedidos_showNickError(); return; }

  // monta dados de total (mesma lógica do app.js)
  const TAXA_THRESHOLD = 10000000;
  const TAXA_VALOR     = 5000000;
  const grandTotalRaw  = keys.reduce((s, k) => s + (items[k]?.price ? items[k].price * cart[k] : 0), 0);
  const hasTaxa        = grandTotalRaw > 0 && grandTotalRaw < TAXA_THRESHOLD;
  const grandTotalFinal = hasTaxa ? grandTotalRaw + TAXA_VALOR : grandTotalRaw;

  const itens   = _pedidos_buildItens(keys);
  const payload = _pedidos_buildPayload(nick, itens, grandTotalRaw, grandTotalFinal);

  // visual: desabilita botão enquanto salva
  const btn = document.querySelector('.send-whatsapp-btn, [onclick="sendToWhatsApp()"]');
  const originalLabel = btn ? btn.innerHTML : null;
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Salvando...'; }

  try {
    const saved = await _pedidos_salvar(payload);
    const pedidoId = saved?.id ? ('#' + String(saved.id).padStart(4, '0')) : '';

    // limpa carrinho
    Object.keys(cart).forEach(k => delete cart[k]);
    if (typeof updateCartBadge === 'function') updateCartBadge();
    if (typeof closeCart      === 'function') closeCart();

    _pedidos_showToast(
      '✅ Pedido enviado! ' + pedidoId,
      'Seu pedido foi registrado com sucesso. Aguarde o contato do vendedor para confirmar a entrega.'
    );
  } catch (err) {
    console.error('[pedidos.js]', err);
    _pedidos_showToast(
      '❌ Erro ao salvar pedido',
      'Não foi possível registrar o pedido. Verifique sua conexão e tente novamente.'
    );
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = originalLabel; }
  }
}

// ── sendToDiscord agora também salva no banco (sem abrir o Discord) ───────────

async function sendToDiscord() {
  // Redireciona para a mesma lógica — um único banco de pedidos
  await sendToWhatsApp();
}
