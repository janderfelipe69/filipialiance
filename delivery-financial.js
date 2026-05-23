// ============================================================
// delivery-financial.js — Controle financeiro de entregas
// PokeAlliance Shop
//
// Depende de: supabase-client.js, session.js, delivery-system.js
// Adiciona ao DeliveryGallery:
//   - modal de pagamento ao finalizar entrega
//   - modal de edição de entrega
//   - badges financeiros nos cards
// ============================================================
;(function (global) {
  'use strict';

  // ── Config ──────────────────────────────────────────────────
  var SB_URL = global.SUPABASE_URL;
  var SB_KEY = global.SUPABASE_KEY;

  var PAYMENT_LABELS = { kk: '💎 KK', real: '💵 REAL', dd: '🟡 DD' };
  var PAYMENT_COLORS = { kk: '#4a9aff', real: '#22c55e', dd: '#f59e0b' };

  function getJwt() {
    return typeof Session !== 'undefined' && Session.getAccessToken
      ? Session.getAccessToken() : null;
  }

  function isAdmin() {
    return typeof Session !== 'undefined' && Session.isAdmin && Session.isAdmin();
  }

  function sbFetch(method, path, body) {
    var jwt = getJwt();
    if (!jwt) return Promise.reject(new Error('Sessão expirada'));
    return fetch(SB_URL + '/rest/v1/' + path, {
      method: method,
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SB_KEY,
        'Authorization': 'Bearer ' + jwt,
        'Prefer':        'return=representation',
      },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function(r) {
      if (!r.ok) return r.text().then(function(t) { throw new Error(t.slice(0,200)); });
      return r.json().catch(function() { return {}; });
    });
  }

  // ── CSS ──────────────────────────────────────────────────────
  var css = document.createElement('style');
  css.textContent = [
    // Badges
    '.df-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.03em;white-space:nowrap}',
    '.df-badge-kk{background:rgba(74,154,255,.15);color:#4a9aff;border:1px solid rgba(74,154,255,.3)}',
    '.df-badge-real{background:rgba(34,197,94,.12);color:#22c55e;border:1px solid rgba(34,197,94,.25)}',
    '.df-badge-dd{background:rgba(245,158,11,.12);color:#f59e0b;border:1px solid rgba(245,158,11,.25)}',
    '.df-badge-none{background:rgba(255,255,255,.04);color:#666;border:1px solid rgba(255,255,255,.08)}',
    // Botões admin nos cards
    '.df-edit-btn{margin-top:8px;width:100%;padding:5px;border-radius:6px;border:1px solid rgba(74,154,255,.3);background:rgba(74,154,255,.07);color:#7eb3ff;font-size:12px;cursor:pointer}',
    '.df-edit-btn:hover{background:rgba(74,154,255,.15)}',
    // Modal
    '#df-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}',
    '#df-modal{background:#13162a;border:1px solid #2a2d45;border-radius:14px;padding:24px;width:100%;max-width:440px;max-height:90vh;overflow-y:auto;color:#e0e4ff}',
    '#df-modal h3{margin:0 0 18px;font-size:1.1rem;color:#7eb3ff}',
    '.df-field-label{font-size:12px;color:#888;margin-top:14px;margin-bottom:4px;display:block}',
    '.df-field{width:100%;padding:9px 11px;background:#0d0f1e;border:1px solid #2a2d45;border-radius:7px;color:#e0e4ff;font-size:14px;box-sizing:border-box}',
    '.df-field:focus{outline:none;border-color:#4a9aff}',
    '.df-payment-row{display:flex;gap:8px;margin-top:4px}',
    '.df-pay-btn{flex:1;padding:8px;border-radius:7px;border:2px solid transparent;background:#0d0f1e;color:#888;font-size:13px;cursor:pointer;text-align:center;transition:all .15s}',
    '.df-pay-btn.active-kk{border-color:#4a9aff;background:rgba(74,154,255,.1);color:#4a9aff;font-weight:700}',
    '.df-pay-btn.active-real{border-color:#22c55e;background:rgba(34,197,94,.1);color:#22c55e;font-weight:700}',
    '.df-pay-btn.active-dd{border-color:#f59e0b;background:rgba(245,158,11,.1);color:#f59e0b;font-weight:700}',
    '.df-modal-footer{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}',
    '.df-btn-cancel{padding:8px 18px;border-radius:7px;border:1px solid #333;background:transparent;color:#888;cursor:pointer}',
    '.df-btn-save{padding:8px 20px;border-radius:7px;border:none;background:#4a9aff;color:#fff;font-weight:700;cursor:pointer}',
    '.df-btn-save:hover{background:#3a8aef}',
    '.df-value-hint{font-size:11px;color:#4a9aff;margin-top:3px}',
  ].join('\n');
  document.head.appendChild(css);

  // ── Helpers de conversão ─────────────────────────────────────
  function rawToKk(raw)  { var cfg = global.APP_CONFIG||{}; return raw ? raw / (cfg.raw_per_kk||1e6) : 0; }
  function rawToReal(raw){ var cfg = global.APP_CONFIG||{}; return rawToKk(raw) * (cfg.kk_to_brl||1.70); }
  function rawToDd(raw)  { var cfg = global.APP_CONFIG||{}; var brl = rawToReal(raw); return brl ? brl / (cfg.dd_to_brl||0.70) : 0; }
  function fmt(n, dec)   { return (n||0).toLocaleString('pt-BR',{minimumFractionDigits:dec||2,maximumFractionDigits:dec||2}); }

  // ── Badge HTML ───────────────────────────────────────────────
  function buildBadge(entry) {
    if (!entry.payment_method) return '<span class="df-badge df-badge-none">sem pagamento</span>';
    var m = entry.payment_method;
    var val = m === 'kk'   ? fmt(entry.payment_value_kk, 2) + ' KK'
            : m === 'dd'   ? fmt(entry.payment_value_dd, 2) + ' DD'
            : 'R$ ' + fmt(entry.payment_value, 2);
    return '<span class="df-badge df-badge-' + m + '">' + PAYMENT_LABELS[m] + ' ' + val + '</span>';
  }

  // ── Injeta badges nos cards já renderizados ──────────────────
  function injectBadgesIntoCards() {
    if (!global.DeliveryGallery || !global.DeliveryGallery._data) return;
    global.DeliveryGallery._data.forEach(function(entry) {
      var card = document.querySelector('[data-delivery-id="' + entry.id + '"]');
      if (!card) return;
      var existing = card.querySelector('.df-badge-wrap');
      if (existing) existing.remove();
      var wrap = document.createElement('div');
      wrap.className = 'df-badge-wrap';
      wrap.style.cssText = 'margin-top:6px';
      wrap.innerHTML = buildBadge(entry);
      // Injeta botão de editar para admin
      if (isAdmin()) {
        wrap.innerHTML += '<button class="df-edit-btn" onclick="DeliveryFinancial.openEditModal(\'' + entry.id + '\')">✏️ Editar pagamento</button>';
      }
      var footer = card.querySelector('.dg-card-footer, .dg-card-body, .dg-card');
      if (footer) footer.appendChild(wrap);
      else card.appendChild(wrap);
    });
  }

  // ── Modal base ───────────────────────────────────────────────
  function closeModal() {
    var el = document.getElementById('df-modal-overlay');
    if (el) el.remove();
  }

  function openModal(titleHtml, bodyHtml, onSave) {
    closeModal();
    var overlay = document.createElement('div');
    overlay.id = 'df-modal-overlay';
    overlay.innerHTML =
      '<div id="df-modal">' +
        '<h3>' + titleHtml + '</h3>' +
        '<div id="df-modal-body">' + bodyHtml + '</div>' +
        '<div class="df-modal-footer">' +
          '<button class="df-btn-cancel" id="df-btn-cancel">Cancelar</button>' +
          '<button class="df-btn-save"   id="df-btn-save">Salvar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });
    document.getElementById('df-btn-cancel').onclick = closeModal;
    document.getElementById('df-btn-save').onclick   = onSave;
  }

  // ── Modal de pagamento (ao finalizar entrega) ─────────────────
  // Chamado por delivery-system.js antes de marcar como entregue
  function openPaymentModal(entry, onConfirm) {
    var priceRaw  = entry.price_raw || 0;
    var suggested = {
      real: rawToReal(priceRaw),
      kk:   rawToKk(priceRaw),
      dd:   rawToDd(priceRaw),
    };

    var body =
      '<p style="color:#aaa;font-size:13px;margin:0 0 4px">Serviço: <strong style="color:#e0e4ff">' + (entry.service_name || entry.pokemon_name || '—') + '</strong></p>' +
      '<label class="df-field-label">Forma de pagamento *</label>' +
      '<div class="df-payment-row">' +
        '<button class="df-pay-btn" data-pay="real" onclick="DeliveryFinancial._selectPay(this,\'real\')">💵 REAL</button>' +
        '<button class="df-pay-btn" data-pay="kk"   onclick="DeliveryFinancial._selectPay(this,\'kk\')">💎 KK</button>' +
        '<button class="df-pay-btn" data-pay="dd"   onclick="DeliveryFinancial._selectPay(this,\'dd\')">🟡 DD</button>' +
      '</div>' +
      '<label class="df-field-label">Valor recebido *</label>' +
      '<input class="df-field" id="df-pay-value" type="number" step="0.01" min="0" placeholder="0.00">' +
      '<div class="df-value-hint" id="df-pay-hint"></div>' +
      '<label class="df-field-label">Observação (opcional)</label>' +
      '<input class="df-field" id="df-pay-obs" placeholder="ex: pago via pix, etc.">';

    openModal('💳 Registrar Pagamento', body, function() {
      var method = document.querySelector('.df-pay-btn.active-real, .df-pay-btn.active-kk, .df-pay-btn.active-dd');
      if (!method) { alert('Selecione a forma de pagamento'); return; }
      var m   = method.dataset.pay;
      var val = parseFloat(document.getElementById('df-pay-value').value);
      if (!val || val <= 0) { alert('Informe o valor recebido'); return; }
      var obs = document.getElementById('df-pay-obs').value.trim();
      closeModal();
      onConfirm({ method: m, value: val, obs: obs });
    });

    // Preenche sugestão quando seleciona método
    global.DeliveryFinancial._selectPay = function(btn, method) {
      document.querySelectorAll('.df-pay-btn').forEach(function(b) {
        b.className = 'df-pay-btn';
      });
      btn.classList.add('active-' + method);
      var hint = document.getElementById('df-pay-hint');
      var inp  = document.getElementById('df-pay-value');
      if (!priceRaw) { hint.textContent = ''; return; }
      var s = suggested[method];
      hint.textContent = 'Sugerido: ' + fmt(s, method === 'real' ? 2 : 4) + (method === 'real' ? ' BRL' : method === 'kk' ? ' KK' : ' DD');
      if (!inp.value) inp.value = s.toFixed(method === 'real' ? 2 : 4);
    };
  }

  // ── Modal de edição de entrega existente ─────────────────────
  function openEditModal(deliveryId) {
    var entry = global.DeliveryGallery && global.DeliveryGallery._data
      ? global.DeliveryGallery._data.find(function(e) { return e.id === deliveryId; })
      : null;
    if (!entry) { alert('Entrega não encontrada'); return; }

    var body =
      '<label class="df-field-label">Forma de pagamento</label>' +
      '<div class="df-payment-row">' +
        '<button class="df-pay-btn' + (entry.payment_method === 'real' ? ' active-real' : '') + '" data-pay="real" onclick="DeliveryFinancial._selectPay(this,\'real\')">💵 REAL</button>' +
        '<button class="df-pay-btn' + (entry.payment_method === 'kk'   ? ' active-kk'   : '') + '" data-pay="kk"   onclick="DeliveryFinancial._selectPay(this,\'kk\')">💎 KK</button>' +
        '<button class="df-pay-btn' + (entry.payment_method === 'dd'   ? ' active-dd'   : '') + '" data-pay="dd"   onclick="DeliveryFinancial._selectPay(this,\'dd\')">🟡 DD</button>' +
      '</div>' +
      '<label class="df-field-label">Valor recebido</label>' +
      '<input class="df-field" id="df-pay-value" type="number" step="0.01" value="' + (entry.payment_value||entry.payment_value_kk||entry.payment_value_dd||'') + '">' +
      '<div class="df-value-hint" id="df-pay-hint"></div>' +
      '<label class="df-field-label">Observação</label>' +
      '<input class="df-field" id="df-pay-obs" value="' + (entry.obs_financeiro||'') + '">' +
      '<label class="df-field-label">Data da entrega</label>' +
      '<input class="df-field" id="df-pay-date" type="datetime-local" value="' + (entry.delivered_at ? entry.delivered_at.slice(0,16) : '') + '">';

    openModal('✏️ Editar Entrega', body, function() {
      var methodBtn = document.querySelector('.df-pay-btn.active-real, .df-pay-btn.active-kk, .df-pay-btn.active-dd');
      var m   = methodBtn ? methodBtn.dataset.pay : entry.payment_method;
      var val = parseFloat(document.getElementById('df-pay-value').value) || null;
      var obs = document.getElementById('df-pay-obs').value.trim() || null;
      var dt  = document.getElementById('df-pay-date').value || null;

      var updates = { obs_financeiro: obs };
      if (m)   updates.payment_method = m;
      if (val) {
        updates.payment_value    = m === 'real' ? val : null;
        updates.payment_value_kk = m === 'kk'   ? val : null;
        updates.payment_value_dd = m === 'dd'   ? val : null;
      }
      if (dt) updates.delivered_at = new Date(dt).toISOString();

      sbFetch('PATCH', 'delivery_proofs?id=eq.' + deliveryId, updates)
        .then(function() {
          // Atualiza entry local
          Object.assign(entry, updates);
          closeModal();
          injectBadgesIntoCards();
          showToastDF('Entrega atualizada ✓', true);
        })
        .catch(function(e) { showToastDF('Erro: ' + e.message, false); });
    });

    // Setup _selectPay para edição
    global.DeliveryFinancial._selectPay = function(btn, method) {
      document.querySelectorAll('.df-pay-btn').forEach(function(b) { b.className = 'df-pay-btn'; });
      btn.classList.add('active-' + method);
      var hint = document.getElementById('df-pay-hint');
      hint.textContent = '';
    };
  }

  // ── Salva pagamento ao finalizar entrega ─────────────────────
  // Chamada por delivery-system após confirmar entrega
  function savePaymentOnDelivery(deliveryId, paymentData) {
    var updates = {
      payment_method:    paymentData.method,
      payment_value:     paymentData.method === 'real' ? paymentData.value : null,
      payment_value_kk:  paymentData.method === 'kk'   ? paymentData.value : null,
      payment_value_dd:  paymentData.method === 'dd'   ? paymentData.value : null,
      obs_financeiro:    paymentData.obs || null,
      delivered_at:      new Date().toISOString(),
    };
    return sbFetch('PATCH', 'delivery_proofs?id=eq.' + deliveryId, updates);
  }

  // ── Toast simples ─────────────────────────────────────────────
  function showToastDF(msg, ok) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
      'background:' + (ok ? '#1a3a1a' : '#3a1a1a') + ';color:#fff;' +
      'padding:10px 20px;border-radius:8px;z-index:10001;font-size:13px;pointer-events:none';
    document.body.appendChild(t);
    setTimeout(function() { t.remove(); }, 3000);
  }

  // ── Hook no DeliveryGallery para injetar badges após render ──
  document.addEventListener('db:ready', function() {
    setTimeout(injectBadgesIntoCards, 500);
  });

  // Reinjeta sempre que a galeria renderizar
  var _origRefresh = null;
  function _hookGallery() {
    if (global.DeliveryGallery && global.DeliveryGallery.refresh && !global.DeliveryGallery._dfHooked) {
      global.DeliveryGallery._dfHooked = true;
      var orig = global.DeliveryGallery.refresh.bind(global.DeliveryGallery);
      global.DeliveryGallery.refresh = function() {
        return orig().then(function() { setTimeout(injectBadgesIntoCards, 200); });
      };
    }
  }
  document.addEventListener('db:ready', function() { setTimeout(_hookGallery, 400); });

  // ── API pública ───────────────────────────────────────────────
  global.DeliveryFinancial = {
    openPaymentModal:    openPaymentModal,
    openEditModal:       openEditModal,
    savePaymentOnDelivery: savePaymentOnDelivery,
    injectBadges:        injectBadgesIntoCards,
    _selectPay:          function() {},  // substituído dinamicamente
  };

  console.log('[DeliveryFinancial] ✅ módulo carregado');

}(window));
