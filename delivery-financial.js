// ============================================================
// delivery-financial.js — Controle financeiro de entregas
// ============================================================
;(function (global) {
  'use strict';

  var SB_URL = global.SUPABASE_URL;
  var SB_KEY = global.SUPABASE_KEY;

  var PAYMENT_LABELS = { kk: '💎 KK', real: '💵 REAL', dd: '🟡 DD' };

  // ── Taxas de conversão (lidas do APP_CONFIG) ──────────────
  function getConfig() {
    var cfg = global.APP_CONFIG || {};
    return {
      kkRate: cfg.kk_to_brl || 1.70,
      ddRate: cfg.dd_to_brl || 0.70,
    };
  }

  // ── Cálculo canônico: BRL → método ───────────────────────
  // KK: decimal permitido (ex: 38.00)
  // DD: sempre inteiro via Math.round
  function calcValue(brl, method) {
    if (!brl || brl <= 0) return 0;
    var cfg = getConfig();
    switch (method) {
      case 'real': return Number(parseFloat(brl).toFixed(2));
      case 'kk':   return Number((brl / cfg.kkRate).toFixed(2));
      case 'dd':   return Math.round(brl / cfg.ddRate);
      default:     return 0;
    }
  }

  function fmtBrl(n) {
    return 'R$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function fmtKk(n) { return (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' KK'; }
  function fmtDd(n) { return Math.round(n || 0) + ' DD'; }

  // ── Busca price_brl no catálogo pelo nome do serviço ─────
  // Ordem de busca: POKEMONS → items → fallback null
  function _lookupCatalogPrice(entry) {
    var name = (entry.pokemon_name || entry.service_name || '').trim().toLowerCase();
    if (!name) return null;

    // 1. catalog_pokemons
    var pokemons = global.POKEMONS || [];
    for (var i = 0; i < pokemons.length; i++) {
      if ((pokemons[i].name || '').trim().toLowerCase() === name) {
        return pokemons[i].price_brl || null;
      }
    }

    // 2. catalog_items
    var items = global.items || [];
    for (var j = 0; j < items.length; j++) {
      if ((items[j].name || '').trim().toLowerCase() === name) {
        return items[j].price_brl || null;
      }
    }

    return null;
  }

  // ── Formata data para exibição ────────────────────────────
  function _fmtDate(iso) {
    if (!iso) return null;
    try {
      var d    = new Date(iso);
      var dd   = String(d.getDate()).padStart(2, '0');
      var mm   = String(d.getMonth() + 1).padStart(2, '0');
      var yyyy = d.getFullYear();
      var hh   = String(d.getHours()).padStart(2, '0');
      var min  = String(d.getMinutes()).padStart(2, '0');
      return dd + '/' + mm + '/' + yyyy + ' às ' + hh + ':' + min;
    } catch (_) { return null; }
  }

  // ── Auth ──────────────────────────────────────────────────
  function getJwt() {
    return (typeof Session !== 'undefined' && Session.getAccessToken) ? Session.getAccessToken() : null;
  }
  function isAdmin() {
    return typeof Session !== 'undefined' && Session.isAdmin && Session.isAdmin();
  }
  function getJwtAsync() {
    if (typeof Session === 'undefined') return Promise.resolve(null);
    return Session.ready().then(function() { return getJwt(); });
  }

  // ── Supabase PATCH ────────────────────────────────────────
  function sbPatch(id, updates) {
    return getJwtAsync().then(function(jwt) {
      if (!jwt) throw new Error('Sessão expirada');
      return fetch(SB_URL + '/rest/v1/delivery_proofs?id=eq.' + id, {
        method: 'PATCH',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        SB_KEY,
          'Authorization': 'Bearer ' + jwt,
          'Prefer':        'return=representation',
        },
        body: JSON.stringify(updates),
      });
    }).then(function(r) {
      if (!r.ok) return r.text().then(function(t) { throw new Error(t.slice(0, 200)); });
      return r.json().catch(function() { return {}; });
    });
  }

  // ── CSS ───────────────────────────────────────────────────
  var css = document.createElement('style');
  css.textContent = [
    '.dg-card-financial{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)}',
    '.df-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.03em}',
    '.df-badge-kk{background:rgba(74,154,255,.15);color:#4a9aff;border:1px solid rgba(74,154,255,.3)}',
    '.df-badge-real{background:rgba(34,197,94,.12);color:#22c55e;border:1px solid rgba(34,197,94,.25)}',
    '.df-badge-dd{background:rgba(245,158,11,.12);color:#f59e0b;border:1px solid rgba(245,158,11,.25)}',
    '.df-badge-none{background:rgba(255,255,255,.04);color:#555;border:1px solid rgba(255,255,255,.08);font-style:italic}',
    '.df-edit-btn{margin-top:7px;width:100%;padding:5px 10px;border-radius:6px;border:1px solid rgba(74,154,255,.25);background:rgba(74,154,255,.06);color:#7eb3ff;font-size:11px;cursor:pointer;text-align:center}',
    '.df-edit-btn:hover{background:rgba(74,154,255,.15)}',
    // Modal
    '#df-overlay{position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}',
    '#df-modal{background:#13162a;border:1px solid #2a2d45;border-radius:14px;padding:24px;width:100%;max-width:420px;color:#e0e4ff}',
    '#df-modal h3{margin:0 0 4px;font-size:1.05rem;color:#7eb3ff}',
    '.df-service-row{font-size:12px;color:#888;margin:0 0 18px}',
    '.df-service-row strong{color:#c0c8ff}',
    '.df-price-row{font-size:11px;color:#555;margin-bottom:16px}',
    // Botões de método — maiores, com valor exibido abaixo
    '.df-methods{display:flex;gap:8px;margin-bottom:16px}',
    '.df-meth{flex:1;padding:12px 6px 10px;border-radius:9px;border:2px solid #1e2035;background:#0d0f1e;color:#555;font-size:11px;cursor:pointer;text-align:center;transition:all .15s;line-height:1.3}',
    '.df-meth:hover{border-color:#333;color:#aaa}',
    '.df-meth .df-meth-label{font-size:13px;font-weight:700;display:block;margin-bottom:3px}',
    '.df-meth .df-meth-val{font-size:11px;opacity:.75;display:block}',
    '.df-meth.sel-real{border-color:#22c55e;background:rgba(34,197,94,.1);color:#22c55e}',
    '.df-meth.sel-kk{border-color:#4a9aff;background:rgba(74,154,255,.1);color:#4a9aff}',
    '.df-meth.sel-dd{border-color:#f59e0b;background:rgba(245,158,11,.1);color:#f59e0b}',
    '.df-lbl{font-size:11px;color:#777;margin-top:12px;margin-bottom:4px;display:block}',
    '.df-inp{width:100%;padding:9px 11px;background:#0d0f1e;border:1px solid #2a2d45;border-radius:7px;color:#e0e4ff;font-size:14px;box-sizing:border-box}',
    '.df-inp:focus{outline:none;border-color:#4a9aff}',
    '.df-date-info{margin:14px 0 0;font-size:11px;color:#555}',
    '.df-date-info span{color:#7eb3ff}',
    '.df-footer{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}',
    '.df-btn-cancel{padding:8px 16px;border-radius:7px;border:1px solid #2a2d45;background:transparent;color:#777;cursor:pointer}',
    '.df-btn-save{padding:8px 20px;border-radius:7px;border:none;background:#4a9aff;color:#fff;font-weight:700;cursor:pointer}',
    '.df-btn-save:hover{background:#3a8aef}',
    '.df-btn-save:disabled{opacity:.45;cursor:default}',
    '.df-btn-remove{padding:8px 14px;border-radius:7px;border:1px solid rgba(255,80,80,.3);background:rgba(255,80,80,.06);color:#ff9090;cursor:pointer;margin-right:auto}',
    '.df-no-price{font-size:12px;color:#f59e0b;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:7px;padding:10px 12px;margin-bottom:14px}',
  ].join('\n');
  document.head.appendChild(css);

  // ── Badge HTML no card ────────────────────────────────────
  function buildBadgeHtml(entry) {
    var m = entry.payment_method;
    if (!m) return '<span class="df-badge df-badge-none">sem pagamento</span>';
    var val = m === 'kk'  ? fmtKk(entry.payment_value_kk)
            : m === 'dd'  ? fmtDd(entry.payment_value_dd)
            : fmtBrl(entry.payment_value);
    return '<span class="df-badge df-badge-' + m + '">' + PAYMENT_LABELS[m] + ' · ' + val + '</span>';
  }

  // SEGURANÇA: dados financeiros sao EXCLUSIVOS para admin.
  // Badge de pagamento e botao de edicao NUNCA chegam ao cliente.
  function buildCardSection(entry, adminFlag) {
    // Dupla verificacao: adminFlag (caller) E isAdmin() (sessao atual).
    // Ambos precisam ser true - previne bypass via estado desatualizado.
    var adminConfirmed = (adminFlag === true) && isAdmin();
    if (!adminConfirmed) return ''; // cliente: zero dados financeiros
    var badge   = buildBadgeHtml(entry);
    var editBtn = '<button class="df-edit-btn" onclick="event.stopPropagation();DeliveryFinancial.openEditModal(\'' + entry.id + '\')">✏️ Editar pagamento</button>';
    return badge + editBtn;
  }

  function refreshCardSection(entryId) {
    var entry = _findEntry(entryId);
    if (!entry) return;
    var card = document.querySelector('[data-delivery-id="' + entryId + '"]');
    if (!card) {
      var el = document.getElementById('dg-fin-' + entryId);
      if (el) el.innerHTML = buildCardSection(entry, isAdmin());
      return;
    }
    var fin = card.querySelector('.dg-card-financial') || document.getElementById('dg-fin-' + entryId);
    if (fin) fin.innerHTML = buildCardSection(entry, isAdmin());
  }

  function _findEntry(id) {
    return global.DeliveryGallery && global.DeliveryGallery._data
      ? global.DeliveryGallery._data.find(function(e) { return e.id === id; })
      : null;
  }

  // ── Modal ─────────────────────────────────────────────────
  function closeModal() {
    var el = document.getElementById('df-overlay');
    if (el) el.remove();
  }

  // Abre o modal de pagamento.
  // entry: { id, service_name, pokemon_name, price_brl, payment_method,
  //          payment_value, payment_value_kk, payment_value_dd,
  //          obs_financeiro, delivered_at, created_at }
  function openModal(entry, title, onSave) {
    closeModal();

    // 1. Busca o preço: primeiro no entry (já salvo), depois no catálogo
    var priceBrl = entry.price_brl
      ? parseFloat(entry.price_brl)
      : _lookupCatalogPrice(entry);

    // 2. Calcula os 3 valores fixos do catálogo
    var prices = priceBrl ? {
      real: calcValue(priceBrl, 'real'),
      kk:   calcValue(priceBrl, 'kk'),
      dd:   calcValue(priceBrl, 'dd'),
    } : null;

    // 3. Método já registrado (edição) ou nenhum (novo)
    var currentMethod = entry.payment_method || '';

    // 4. Data da entrega — só exibição
    var dateLabel = _fmtDate(entry.delivered_at || entry.created_at || null);

    var serviceLabel = entry.service_name || entry.pokemon_name || '—';

    // ── Monta HTML dos botões de método ──────────────────────
    function _methBtn(m, icon, label) {
      var val  = prices ? (m === 'real' ? fmtBrl(prices.real) : m === 'kk' ? fmtKk(prices.kk) : fmtDd(prices.dd)) : '—';
      var sel  = currentMethod === m ? ' sel-' + m : '';
      return '<button class="df-meth' + sel + '" data-m="' + m + '" onclick="DeliveryFinancial._pick(this)">' +
        '<span class="df-meth-label">' + icon + ' ' + label + '</span>' +
        '<span class="df-meth-val">' + val + '</span>' +
        '</button>';
    }

    var html =
      '<div id="df-modal">' +
        '<h3>' + title + '</h3>' +
        '<p class="df-service-row">Serviço: <strong>' + serviceLabel + '</strong>' +
          (priceBrl ? ' &nbsp;·&nbsp; <span style="color:#4a9aff">' + fmtBrl(priceBrl) + '</span>' : '') +
        '</p>' +
        (!prices
          ? '<div class="df-no-price">⚠️ Preço não encontrado no catálogo. Selecione o método e informe o valor manualmente.</div>'
          : '') +
        '<div class="df-methods">' +
          _methBtn('real', '💵', 'REAL') +
          _methBtn('kk',   '💎', 'KK') +
          _methBtn('dd',   '🟡', 'DD') +
        '</div>' +
        // Mostra input de valor apenas quando o preço não está no catálogo
        (!prices
          ? '<label class="df-lbl">Valor recebido</label><input class="df-inp" id="df-val" type="number" step="0.01" min="0" value="" placeholder="0">'
          : '<input type="hidden" id="df-val" value="">') +
        '<label class="df-lbl">Observação (opcional)</label>' +
        '<input class="df-inp" id="df-obs" value="' + (entry.obs_financeiro || '') + '" placeholder="ex: pago via pix">' +
        (dateLabel ? '<p class="df-date-info">📅 Entregue em <span>' + dateLabel + '</span></p>' : '') +
        '<div class="df-footer">' +
          (entry.payment_method ? '<button class="df-btn-remove" id="df-btn-remove">🗑 Remover</button>' : '') +
          '<button class="df-btn-cancel" id="df-btn-cancel">Cancelar</button>' +
          '<button class="df-btn-save" id="df-btn-save"' + (!currentMethod ? ' disabled' : '') + '>Salvar</button>' +
        '</div>' +
      '</div>';

    var overlay = document.createElement('div');
    overlay.id  = 'df-overlay';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });
    document.getElementById('df-btn-cancel').onclick = closeModal;

    if (document.getElementById('df-btn-remove')) {
      document.getElementById('df-btn-remove').onclick = function() {
        if (!confirm('Remover dados de pagamento desta entrega?')) return;
        sbPatch(entry.id, { payment_method: null, payment_value: null, payment_value_kk: null, payment_value_dd: null, obs_financeiro: null })
          .then(function() {
            var e2 = _findEntry(entry.id);
            if (e2) { e2.payment_method = null; e2.payment_value = null; e2.payment_value_kk = null; e2.payment_value_dd = null; }
            closeModal();
            refreshCardSection(entry.id);
            _toast('Pagamento removido.', false);
          }).catch(function(err) { _toast('Erro: ' + err.message, false); });
      };
    }

    // Guarda estado para _pick
    global._df_prices      = prices;
    global._df_priceBrl    = priceBrl;
    global._df_currentMethod = currentMethod;

    document.getElementById('df-btn-save').onclick = function() {
      var m   = global._df_currentMethod;
      var obs = document.getElementById('df-obs').value.trim() || null;

      if (!m) { _toast('Selecione a forma de pagamento', false); return; }

      // Valor: do catálogo (fixo) ou do input manual
      var pBrl = global._df_priceBrl;
      var realVal, kkVal, ddVal;
      if (pBrl) {
        realVal = calcValue(pBrl, 'real');
        kkVal   = calcValue(pBrl, 'kk');
        ddVal   = calcValue(pBrl, 'dd');
      } else {
        var manualVal = parseFloat(document.getElementById('df-val').value) || 0;
        if (!manualVal) { _toast('Informe o valor recebido', false); return; }
        realVal = m === 'real' ? Number(manualVal.toFixed(2)) : null;
        kkVal   = m === 'kk'  ? Number(manualVal.toFixed(2)) : null;
        ddVal   = m === 'dd'  ? Math.round(manualVal)        : null;
      }

      var updates = {
        payment_method:   m,
        payment_value:    m === 'real' ? realVal : null,
        payment_value_kk: m === 'kk'  ? kkVal   : null,
        payment_value_dd: m === 'dd'  ? ddVal   : null,
        obs_financeiro:   obs,
      };

      onSave(updates);
    };
  }

  // Chamado ao clicar num botão de método
  global.DeliveryFinancial = global.DeliveryFinancial || {};
  global.DeliveryFinancial._pick = function(btn) {
    var m = btn.dataset.m;
    global._df_currentMethod = m;

    document.querySelectorAll('.df-meth').forEach(function(b) { b.className = 'df-meth'; });
    btn.classList.add('sel-' + m);

    // Habilita o botão Salvar
    var saveBtn = document.getElementById('df-btn-save');
    if (saveBtn) saveBtn.disabled = false;

    // Se não há catálogo, preenche o input manual com a conversão do valor digitado
    var prices = global._df_prices;
    var priceBrl = global._df_priceBrl;
    var inp = document.getElementById('df-val');

    if (inp && inp.type === 'number') {
      // Input manual visível: preenche com conversão do que já foi digitado
      var cur = parseFloat(inp.value) || 0;
      if (priceBrl) {
        inp.value = calcValue(priceBrl, m);
      }
    }
  };

  // ── Modal ao finalizar entrega ────────────────────────────
  function openPaymentModal(entry, onConfirm) {
    openModal(entry, '💳 Registrar Pagamento', function(updates) {
      closeModal();
      onConfirm({
        method:   updates.payment_method,
        value:    updates.payment_value || updates.payment_value_kk || updates.payment_value_dd,
        obs:      updates.obs_financeiro,
        _updates: updates,
      });
    });
  }

  // ── Modal de edição de entrega existente ──────────────────
  function openEditModal(deliveryId) {
    var entry = _findEntry(deliveryId);
    if (!entry) { _toast('Entrega não encontrada na lista', false); return; }

    // Tenta resolver price_brl: catálogo primeiro, pedido original como fallback
    var catalogPrice = _lookupCatalogPrice(entry);
    if (catalogPrice) {
      entry.price_brl = catalogPrice;
      openModal(entry, '✏️ Editar Entrega', _editSave(deliveryId, entry));
      return;
    }

    // Fallback: busca total_brl do pedido original no banco
    var orderId = entry.order_id || entry.pedido_id;
    if (orderId && SB_URL && SB_KEY) {
      getJwtAsync().then(function(jwt) {
        var headers = { 'apikey': SB_KEY, 'Content-Type': 'application/json' };
        if (jwt) headers['Authorization'] = 'Bearer ' + jwt;
        return fetch(SB_URL + '/rest/v1/pedidos?id=eq.' + orderId +
          '&select=total_brl,subtotal_brl,pagamento_brl&limit=1', { headers: headers });
      }).then(function(r) { return r.ok ? r.json() : []; })
        .then(function(rows) {
          var row = rows && rows[0];
          if (row) {
            entry.price_brl = parseFloat(row.total_brl || row.subtotal_brl || row.pagamento_brl || 0) || null;
          }
          openModal(entry, '✏️ Editar Entrega', _editSave(deliveryId, entry));
        })
        .catch(function() {
          openModal(entry, '✏️ Editar Entrega', _editSave(deliveryId, entry));
        });
    } else {
      openModal(entry, '✏️ Editar Entrega', _editSave(deliveryId, entry));
    }
  }

  function _editSave(deliveryId, entry) {
    return function(updates) {
      sbPatch(deliveryId, updates)
        .then(function() {
          Object.assign(entry, updates);
          closeModal();
          refreshCardSection(deliveryId);
          _toast('✅ Entrega atualizada!', true);
        })
        .catch(function(e) { _toast('Erro: ' + e.message, false); });
    };
  }

  // ── Salva pagamento ao finalizar entrega ──────────────────
  function savePaymentOnDelivery(deliveryId, paymentData) {
    var updates = paymentData._updates || {
      payment_method:   paymentData.method,
      payment_value:    paymentData.method === 'real' ? parseFloat((paymentData.value||0).toFixed(2)) : null,
      payment_value_kk: paymentData.method === 'kk'   ? Number((paymentData.value||0).toFixed(2))     : null,
      payment_value_dd: paymentData.method === 'dd'   ? Math.round(paymentData.value||0)               : null,
      obs_financeiro:   paymentData.obs || null,
      delivered_at:     new Date().toISOString(),
    };
    return sbPatch(deliveryId, updates).then(function() {
      var entry = _findEntry(deliveryId);
      if (entry) Object.assign(entry, updates);
      refreshCardSection(deliveryId);
    });
  }

  // ── Injeta seção financeira nos cards existentes ──────────
  function injectIntoExistingCards() {
    if (!global.DeliveryGallery || !global.DeliveryGallery._data) return;
    global.DeliveryGallery._data.forEach(function(entry) {
      var finEl = document.getElementById('dg-fin-' + entry.id);
      if (finEl && !finEl.dataset.dfInjected) {
        finEl.innerHTML = buildCardSection(entry, isAdmin());
        finEl.dataset.dfInjected = '1';
      }
      var card = document.querySelector('[data-delivery-id="' + entry.id + '"]');
      if (card) {
        var existing = card.querySelector('.dg-card-financial');
        if (!existing) {
          var fin = document.createElement('div');
          fin.className = 'dg-card-financial';
          fin.id = 'dg-fin-' + entry.id;
          fin.innerHTML = buildCardSection(entry, isAdmin());
          var body = card.querySelector('.dg-card-body');
          if (body) body.appendChild(fin); else card.appendChild(fin);
        }
      }
    });
  }

  function _hookGallery() {
    if (!global.DeliveryGallery || global.DeliveryGallery._dfHooked) return;
    global.DeliveryGallery._dfHooked = true;
    var orig = global.DeliveryGallery.refresh.bind(global.DeliveryGallery);
    global.DeliveryGallery.refresh = function() {
      return orig().then(function() { setTimeout(injectIntoExistingCards, 150); });
    };
  }

  document.addEventListener('db:ready', function() {
    setTimeout(function() { _hookGallery(); injectIntoExistingCards(); }, 500);
  });

  // ── Toast ─────────────────────────────────────────────────
  function _toast(msg, ok) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
      'background:' + (ok !== false ? '#0f2a18' : '#2a0f0f') + ';color:#fff;' +
      'padding:10px 20px;border-radius:8px;z-index:10001;font-size:13px;pointer-events:none;white-space:nowrap';
    document.body.appendChild(t);
    setTimeout(function() { t.remove(); }, 3000);
  }

  // ── API pública ───────────────────────────────────────────
  Object.assign(global.DeliveryFinancial, {
    buildCardSection:        buildCardSection,
    openPaymentModal:        openPaymentModal,
    openEditModal:           openEditModal,
    savePaymentOnDelivery:   savePaymentOnDelivery,
    injectIntoExistingCards: injectIntoExistingCards,
    calcValue:               calcValue,
  });

  console.log('[DeliveryFinancial] ✅ carregado');

}(window));
