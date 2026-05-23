// ============================================================
// delivery-financial.js — Controle financeiro de entregas
// ============================================================
;(function (global) {
  'use strict';

  var SB_URL = global.SUPABASE_URL;
  var SB_KEY = global.SUPABASE_KEY;

  var PAYMENT_LABELS = { kk: '💎 KK', real: '💵 REAL', dd: '🟡 DD' };

  // ── Conversões com regras corretas ───────────────────────────
  // KK: 2 casas decimais, SEM arredondamento (5 KK, 4.12 KK)
  // DD: SEMPRE inteiro, arredondamento matemático (12 DD, 13 DD)
  function getConfig() {
    var cfg = global.APP_CONFIG || {};
    return {
      kkRate: cfg.kk_to_brl || 1.70,
      ddRate: cfg.dd_to_brl || 0.70,
    };
  }

  function brlToKk(brl) {
    if (!brl || brl <= 0) return 0;
    var r = getConfig().kkRate;
    return Number((brl / r).toFixed(2)) * 1; // ex: 5, 4.12, 32
  }

  function brlToDd(brl) {
    if (!brl || brl <= 0) return 0;
    var r = getConfig().ddRate;
    return Math.round(brl / r); // ex: 12, 10, 13 — sempre inteiro
  }

  function fmtBrl(n) {
    return 'R$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtKk(n)  { return (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' KK'; }
  function fmtDd(n)  { return Math.round(n || 0) + ' DD'; }

  // ── Auth ─────────────────────────────────────────────────────
  function getJwt() {
    if (typeof Session !== 'undefined' && Session.getAccessToken) return Session.getAccessToken();
    return null;
  }
  function isAdmin() {
    return typeof Session !== 'undefined' && Session.isAdmin && Session.isAdmin();
  }
  function getJwtAsync() {
    if (typeof Session === 'undefined') return Promise.resolve(null);
    return Session.ready().then(function() { return getJwt(); });
  }

  // ── Supabase PATCH ───────────────────────────────────────────
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

  // ── CSS ──────────────────────────────────────────────────────
  var css = document.createElement('style');
  css.textContent = [
    // Seção financeira dentro do card
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
    '#df-modal{background:#13162a;border:1px solid #2a2d45;border-radius:14px;padding:24px;width:100%;max-width:430px;max-height:90vh;overflow-y:auto;color:#e0e4ff}',
    '#df-modal h3{margin:0 0 16px;font-size:1.05rem;color:#7eb3ff}',
    '.df-lbl{font-size:11px;color:#777;margin-top:14px;margin-bottom:4px;display:block}',
    '.df-inp{width:100%;padding:9px 11px;background:#0d0f1e;border:1px solid #2a2d45;border-radius:7px;color:#e0e4ff;font-size:14px;box-sizing:border-box}',
    '.df-inp:focus{outline:none;border-color:#4a9aff}',
    '.df-methods{display:flex;gap:8px;margin-top:4px}',
    '.df-meth{flex:1;padding:9px 4px;border-radius:7px;border:2px solid #1e2035;background:#0d0f1e;color:#666;font-size:12px;cursor:pointer;text-align:center;transition:all .15s}',
    '.df-meth:hover{border-color:#333;color:#aaa}',
    '.df-meth.sel-real{border-color:#22c55e;background:rgba(34,197,94,.1);color:#22c55e;font-weight:700}',
    '.df-meth.sel-kk{border-color:#4a9aff;background:rgba(74,154,255,.1);color:#4a9aff;font-weight:700}',
    '.df-meth.sel-dd{border-color:#f59e0b;background:rgba(245,158,11,.1);color:#f59e0b;font-weight:700}',
    '.df-hint{font-size:11px;color:#4a9aff;margin-top:3px;min-height:14px}',
    '.df-footer{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}',
    '.df-btn-cancel{padding:8px 16px;border-radius:7px;border:1px solid #2a2d45;background:transparent;color:#777;cursor:pointer}',
    '.df-btn-save{padding:8px 20px;border-radius:7px;border:none;background:#4a9aff;color:#fff;font-weight:700;cursor:pointer}',
    '.df-btn-save:hover{background:#3a8aef}',
    '.df-btn-remove{padding:8px 14px;border-radius:7px;border:1px solid rgba(255,80,80,.3);background:rgba(255,80,80,.06);color:#ff9090;cursor:pointer;margin-right:auto}',
  ].join('\n');
  document.head.appendChild(css);

  // ── Badge HTML (usado dentro do card) ────────────────────────
  function buildBadgeHtml(entry) {
    var m = entry.payment_method;
    if (!m) return '<span class="df-badge df-badge-none">sem pagamento</span>';
    var val = m === 'kk'   ? fmtKk(entry.payment_value_kk)
            : m === 'dd'   ? fmtDd(entry.payment_value_dd)
            : fmtBrl(entry.payment_value);
    return '<span class="df-badge df-badge-' + m + '">' + PAYMENT_LABELS[m] + ' · ' + val + '</span>';
  }

  // ── Seção financeira injetada no _buildCard ──────────────────
  // Chamada diretamente do template do delivery-system.js
  function buildCardSection(entry, adminFlag) {
    var badge = buildBadgeHtml(entry);
    var editBtn = (adminFlag || isAdmin())
      ? '<button class="df-edit-btn" onclick="event.stopPropagation();DeliveryFinancial.openEditModal(\'' + entry.id + '\')">✏️ Editar pagamento</button>'
      : '';
    return badge + editBtn;
  }

  // ── Atualiza seção financeira de um card já renderizado ──────
  function refreshCardSection(entryId) {
    var entry = _findEntry(entryId);
    if (!entry) return;
    // Tenta pelo data-delivery-id
    var card = document.querySelector('[data-delivery-id="' + entryId + '"]');
    if (!card) {
      // Fallback: id do container
      card = document.getElementById('dg-fin-' + entryId);
      if (card) {
        card.innerHTML = buildCardSection(entry, isAdmin());
        return;
      }
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

  // ── Modal compartilhado ──────────────────────────────────────
  function closeModal() {
    var el = document.getElementById('df-overlay');
    if (el) el.remove();
  }

  // Abre o modal genérico de pagamento/edição
  // entry: { id, service_name, pokemon_name, price_brl, payment_method, payment_value_kk, payment_value_dd, payment_value, obs_financeiro, delivered_at }
  // onSave(updates): callback com o objeto de updates para o Supabase
  function openModal(entry, title, onSave) {
    closeModal();

    var currentMethod = entry.payment_method || '';
    var priceBrl = entry.price_brl ? parseFloat(entry.price_brl) : null;

    // Calcula sugestões
    var suggested = priceBrl ? {
      real: parseFloat(priceBrl.toFixed(2)),
      kk:   brlToKk(priceBrl),
      dd:   brlToDd(priceBrl),
    } : null;

    // Valor inicial no input
    var initVal = currentMethod === 'kk' ? (entry.payment_value_kk || '')
                : currentMethod === 'dd' ? (entry.payment_value_dd || '')
                : currentMethod === 'real' ? (entry.payment_value || '')
                : '';

    var serviceLabel = entry.service_name || entry.pokemon_name || '—';

    var html =
      '<div id="df-modal">' +
        '<h3>' + title + '</h3>' +
        (serviceLabel !== '—' ? '<p style="color:#888;font-size:12px;margin:0 0 12px">Serviço: <strong style="color:#c0c8ff">' + serviceLabel + '</strong>' +
          (priceBrl ? ' · <span style="color:#4a9aff">' + fmtBrl(priceBrl) + '</span>' : '') + '</p>' : '') +
        '<label class="df-lbl">Forma de pagamento</label>' +
        '<div class="df-methods">' +
          '<button class="df-meth' + (currentMethod === 'real' ? ' sel-real' : '') + '" data-m="real" onclick="DeliveryFinancial._pick(this)">💵 REAL</button>' +
          '<button class="df-meth' + (currentMethod === 'kk'   ? ' sel-kk'   : '') + '" data-m="kk"   onclick="DeliveryFinancial._pick(this)">💎 KK</button>' +
          '<button class="df-meth' + (currentMethod === 'dd'   ? ' sel-dd'   : '') + '" data-m="dd"   onclick="DeliveryFinancial._pick(this)">🟡 DD</button>' +
        '</div>' +
        '<label class="df-lbl">Valor recebido</label>' +
        '<input class="df-inp" id="df-val" type="number" step="0.01" min="0" value="' + initVal + '" placeholder="0">' +
        '<div class="df-hint" id="df-hint">' + (suggested && currentMethod ? _hintText(currentMethod, suggested) : '') + '</div>' +
        '<label class="df-lbl">Observação (opcional)</label>' +
        '<input class="df-inp" id="df-obs" value="' + (entry.obs_financeiro || '') + '" placeholder="ex: pago via pix">' +
        '<label class="df-lbl">Data da entrega</label>' +
        '<input class="df-inp" id="df-date" type="datetime-local" value="' + (entry.delivered_at ? entry.delivered_at.slice(0, 16) : '') + '">' +
        '<div class="df-footer">' +
          (entry.payment_method ? '<button class="df-btn-remove" id="df-btn-remove">🗑 Remover</button>' : '') +
          '<button class="df-btn-cancel" id="df-btn-cancel">Cancelar</button>' +
          '<button class="df-btn-save"   id="df-btn-save">Salvar</button>' +
        '</div>' +
      '</div>';

    var overlay = document.createElement('div');
    overlay.id = 'df-overlay';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });
    document.getElementById('df-btn-cancel').onclick = closeModal;

    if (document.getElementById('df-btn-remove')) {
      document.getElementById('df-btn-remove').onclick = function() {
        if (!confirm('Remover dados de pagamento desta entrega?')) return;
        sbPatch(entry.id, { payment_method: null, payment_value: null, payment_value_kk: null, payment_value_dd: null, obs_financeiro: null })
          .then(function() {
            if (_findEntry(entry.id)) {
              var e2 = _findEntry(entry.id);
              e2.payment_method = null; e2.payment_value = null;
              e2.payment_value_kk = null; e2.payment_value_dd = null;
            }
            closeModal();
            refreshCardSection(entry.id);
            _toast('Pagamento removido.', false);
          }).catch(function(e) { _toast('Erro: ' + e.message, false); });
      };
    }

    // Guarda suggested para uso no _pick
    global._df_suggested = suggested;
    global._df_currentMethod = currentMethod;

    document.getElementById('df-btn-save').onclick = function() {
      var m   = global._df_currentMethod;
      var val = parseFloat(document.getElementById('df-val').value);
      var obs = document.getElementById('df-obs').value.trim() || null;
      var dt  = document.getElementById('df-date').value || null;

      if (!m)            { _toast('Selecione a forma de pagamento', false); return; }
      if (!val || val <= 0) { _toast('Informe o valor recebido', false); return; }

      var updates = {
        payment_method:   m,
        payment_value:    m === 'real' ? parseFloat(val.toFixed(2)) : null,
        payment_value_kk: m === 'kk'   ? Number(val.toFixed(2))     : null,
        payment_value_dd: m === 'dd'   ? Math.round(val)             : null,
        obs_financeiro:   obs,
      };
      if (dt) updates.delivered_at = new Date(dt).toISOString();

      onSave(updates);
    };
  }

  function _hintText(method, suggested) {
    if (!suggested) return '';
    if (method === 'real') return 'Sugerido: ' + fmtBrl(suggested.real);
    if (method === 'kk')   return 'Sugerido: ' + fmtKk(suggested.kk);
    if (method === 'dd')   return 'Sugerido: ' + fmtDd(suggested.dd);
    return '';
  }

  // Chamado pelos botões de método no modal
  global.DeliveryFinancial = global.DeliveryFinancial || {};
  global.DeliveryFinancial._pick = function(btn) {
    var m = btn.dataset.m;
    global._df_currentMethod = m;

    // Visual
    document.querySelectorAll('.df-meth').forEach(function(b) {
      b.className = 'df-meth';
    });
    btn.classList.add('sel-' + m);

    // Preenche valor sugerido
    var suggested = global._df_suggested;
    var inp  = document.getElementById('df-val');
    var hint = document.getElementById('df-hint');

    if (suggested) {
      var s = suggested[m];
      hint.textContent = _hintText(m, suggested);
      // Só preenche se estiver vazio
      if (!inp.value || parseFloat(inp.value) === 0) {
        inp.value = m === 'dd' ? Math.round(s) : Number(s.toFixed(2));
      }
    }
  };

  // ── Modal ao finalizar entrega (chamado pelo delivery-system) ─
  function openPaymentModal(entry, onConfirm) {
    openModal(entry, '💳 Registrar Pagamento', function(updates) {
      closeModal();
      onConfirm({
        method: updates.payment_method,
        value:  updates.payment_value || updates.payment_value_kk || updates.payment_value_dd,
        obs:    updates.obs_financeiro,
        _updates: updates, // objeto completo para savePaymentOnDelivery
      });
    });
  }

  // ── Modal de edição de entrega existente ─────────────────────
  function openEditModal(deliveryId) {
    var entry = _findEntry(deliveryId);
    if (!entry) {
      _toast('Entrega não encontrada na lista', false);
      return;
    }
    openModal(entry, '✏️ Editar Entrega', function(updates) {
      sbPatch(deliveryId, updates)
        .then(function() {
          Object.assign(entry, updates);
          closeModal();
          refreshCardSection(deliveryId);
          _toast('✅ Entrega atualizada!', true);
        })
        .catch(function(e) { _toast('Erro: ' + e.message, false); });
    });
  }

  // ── Salva pagamento ao finalizar entrega ─────────────────────
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
      // Atualiza entry local se estiver na galeria
      var entry = _findEntry(deliveryId);
      if (entry) Object.assign(entry, updates);
      refreshCardSection(deliveryId);
    });
  }

  // ── Injeta seção financeira nos cards já renderizados ────────
  // Para cards renderizados antes deste módulo carregar
  function injectIntoExistingCards() {
    if (!global.DeliveryGallery || !global.DeliveryGallery._data) return;
    global.DeliveryGallery._data.forEach(function(entry) {
      var finEl = document.getElementById('dg-fin-' + entry.id);
      if (finEl && !finEl.dataset.dfInjected) {
        finEl.innerHTML = buildCardSection(entry, isAdmin());
        finEl.dataset.dfInjected = '1';
      }
      // Fallback: card sem o container (versão antiga sem o patch)
      var card = document.querySelector('[data-delivery-id="' + entry.id + '"]');
      if (card) {
        var existing = card.querySelector('.dg-card-financial');
        if (!existing) {
          var fin = document.createElement('div');
          fin.className = 'dg-card-financial';
          fin.id = 'dg-fin-' + entry.id;
          fin.innerHTML = buildCardSection(entry, isAdmin());
          var body = card.querySelector('.dg-card-body');
          if (body) body.appendChild(fin);
          else card.appendChild(fin);
        }
      }
    });
  }

  // ── Hook no DeliveryGallery.refresh ─────────────────────────
  function _hookGallery() {
    if (!global.DeliveryGallery || global.DeliveryGallery._dfHooked) return;
    global.DeliveryGallery._dfHooked = true;
    var orig = global.DeliveryGallery.refresh.bind(global.DeliveryGallery);
    global.DeliveryGallery.refresh = function() {
      return orig().then(function() {
        setTimeout(injectIntoExistingCards, 150);
      });
    };
  }

  document.addEventListener('db:ready', function() {
    setTimeout(function() {
      _hookGallery();
      injectIntoExistingCards();
    }, 500);
  });

  // ── Toast ────────────────────────────────────────────────────
  function _toast(msg, ok) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
      'background:' + (ok !== false ? '#0f2a18' : '#2a0f0f') + ';color:#fff;' +
      'padding:10px 20px;border-radius:8px;z-index:10001;font-size:13px;pointer-events:none;white-space:nowrap';
    document.body.appendChild(t);
    setTimeout(function() { t.remove(); }, 3000);
  }

  // ── API pública ───────────────────────────────────────────────
  Object.assign(global.DeliveryFinancial, {
    buildCardSection:      buildCardSection,
    openPaymentModal:      openPaymentModal,
    openEditModal:         openEditModal,
    savePaymentOnDelivery: savePaymentOnDelivery,
    injectIntoExistingCards: injectIntoExistingCards,
    brlToKk:               brlToKk,
    brlToDd:               brlToDd,
  });

  console.log('[DeliveryFinancial] ✅ carregado');

}(window));
