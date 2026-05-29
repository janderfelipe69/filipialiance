// ============================================================
// wtb-create.js — Formulário de criação/cancelamento de Procuras
// ============================================================

;(function (global) {
  'use strict';
  if (global.WTBCreate) return;

  var SB_URL = global.SUPABASE_URL || '';
  var SB_KEY = global.SUPABASE_KEY || '';

  function _esc(s)   { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _jwt()    { return typeof Session !== 'undefined' && Session.getAccessToken ? Session.getAccessToken() : null; }
  function _user()   { return typeof Session !== 'undefined' ? Session.getCurrentUser() : null; }
  function _toast(msg, type) { if (typeof showToast === 'function') showToast(msg, type || 'info'); }
  function _toSlug(name) {
    return String(name || '').toLowerCase()
      .replace(/['']/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  }

  var BALL_META = {
    ultra:    { label: 'Ultra Ball',    color: '#f5c518', border: '#f5c518', glow: 'rgba(245,197,24,0.40)',  accent: '#111' },
    premier:  { label: 'Premier Ball',  color: '#e8e8e8', border: '#cfd3dc', glow: 'rgba(232,232,232,0.30)', accent: '#666' },
    alliance: { label: 'Alliance Ball', color: '#b67fff', border: '#7c6aff', glow: 'rgba(124,106,255,0.45)', accent: '#ff4fa0' },
  };
  var BALL_ORDER = ['ultra', 'premier', 'alliance'];

  function _ballIconSvg(color, accent) {
    return '<svg width="26" height="26" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<circle cx="20" cy="20" r="17" fill="#15161f" stroke="' + color + '" stroke-width="2"/>'
      + '<path d="M3 20 Q20 13 37 20" stroke="' + color + '" stroke-width="2.5" fill="none"/>'
      + '<path d="M3 20 Q20 27 37 20" stroke="' + accent + '" stroke-width="2.5" fill="none"/>'
      + '<circle cx="20" cy="20" r="4.5" fill="#15161f" stroke="' + color + '" stroke-width="2"/>'
      + '<circle cx="20" cy="20" r="2" fill="' + color + '"/>'
      + '</svg>';
  }

  var _form = {};
  var _modalEl = null;
  var _submitLocked = false;

  function _resetForm() {
    _form = {
      pokemon_name:  '',
      pokemon_slug:  '',
      pokemon_types: [],
      stars:         0,
      boost:         0,
      ball_type:     null,
      pay_kk:        null,
      pay_dd:        null,
      pay_brl:       null,
      observations:  '',
      errors:        {},
    };
  }

  function _validate() {
    var errs = {};
    if (!_form.pokemon_name || !_form.pokemon_name.trim())
      errs.pokemon_name = 'Selecione ou digite o nome do Pokémon.';
    if (_form.stars < 0 || _form.stars > 5)
      errs.stars = 'Stars: 0 a 5.';
    if (_form.boost < 0 || _form.boost > 70)
      errs.boost = 'Boost: 0 a +70.';
    if (!_form.pay_kk && !_form.pay_dd && !_form.pay_brl)
      errs.payment = 'Informe pelo menos um valor de pagamento (KK, DD ou Real).';
    if (_form.pay_kk !== null && _form.pay_kk <= 0)
      errs.pay_kk = 'Valor em KK inválido.';
    if (_form.pay_dd !== null && _form.pay_dd <= 0)
      errs.pay_dd = 'Valor em DD inválido.';
    if (_form.pay_brl !== null && _form.pay_brl <= 0)
      errs.pay_brl = 'Valor em Real inválido.';
    if (_form.observations && _form.observations.length > 500)
      errs.observations = 'Máx 500 caracteres.';
    _form.errors = errs;
    return Object.keys(errs).length === 0;
  }

  function _buildHtml() {
    return '<div class="mk-modal-backdrop" id="wtb-create-backdrop">'
      + '<div class="mk-modal" id="wtb-create-modal" role="dialog" aria-modal="true">'
      + '<div class="mk-modal-header">'
      + '<span class="mk-modal-title">🔍 Nova Procura</span>'
      + '<button class="mk-modal-close" onclick="WTBCreate.close()" aria-label="Fechar">✕</button>'
      + '</div>'
      + '<div class="mk-modal-body">'

      // ── Pokémon ──────────────────────────────────────────────
      + '<div class="mk-section">'
      + '<div class="mk-section-title"><span class="mk-section-dot"></span>Pokémon que você procura</div>'
      + '<div class="mk-field">'
      + '<label class="mk-label" for="wtb-poke-input">Nome</label>'
      + '<div class="mk-autocomplete">'
      + '<input class="mk-input" id="wtb-poke-input" type="text" placeholder="Ex: Shiny Charizard" autocomplete="off">'
      + '<div class="mk-dropdown" id="wtb-poke-dropdown" style="display:none"></div>'
      + '</div>'
      + '<span class="mk-field-error" id="wtb-err-pokemon_name"></span>'
      + '</div>'

      + '<div id="wtb-poke-preview-wrap" style="display:none">'
      + '<div class="mk-poke-preview">'
      + '<img class="mk-poke-preview-sprite" id="wtb-poke-sprite" src="" alt="" onerror="this.style.display=\'none\'">'
      + '<div class="mk-poke-preview-info">'
      + '<span class="mk-poke-preview-name" id="wtb-poke-name"></span>'
      + '<div class="mk-types" id="wtb-poke-types"></div>'
      + '</div>'
      + '</div>'
      + '</div>'

      + '<div class="mk-field-pair">'
      + '<div class="mk-field">'
      + '<label class="mk-label">Mínimo de Stars <small>(opcional)</small></label>'
      + '<div class="mk-stars-input" id="wtb-stars-input">'
      + [1,2,3,4,5].map(function(i){
          return '<button type="button" class="mk-star-btn" data-val="' + i + '" title="' + i + ' ★">★</button>';
        }).join('')
      + '</div>'
      + '</div>'
      + '<div class="mk-field">'
      + '<label class="mk-label" for="wtb-boost-num">Boost mínimo <small>(opcional)</small></label>'
      + '<div class="mk-boost-row">'
      + '<input class="mk-boost-slider" id="wtb-boost-slider" type="range" min="0" max="70" value="0" step="1">'
      + '<input class="mk-boost-num" id="wtb-boost-num" type="number" min="0" max="70" value="0">'
      + '</div>'
      + '</div>'
      + '</div>'
      + '</div>' // .mk-section

      // ── Pokébola (opcional) ───────────────────────────────────
      + '<div class="mk-section">'
      + '<div class="mk-section-title"><span class="mk-section-dot"></span>Pokébola <small class="mk-section-hint">opcional — sem seleção = aceita qualquer uma</small></div>'
      + '<div class="mk-ball-select" id="wtb-ball-select">'
      + BALL_ORDER.map(function (t) {
          var m = BALL_META[t];
          return '<button type="button" class="mk-ball-opt" data-ball="' + t + '"'
            + ' style="--ball:' + m.border + ';--ball-glow:' + m.glow + ';--ball-color:' + m.color + '">'
            + '<span class="mk-ball-opt-ico">' + _ballIconSvg(m.color, m.accent) + '</span>'
            + '<span class="mk-ball-opt-label">' + _esc(m.label) + '</span>'
            + '<span class="mk-ball-opt-check">✓</span>'
            + '</button>';
        }).join('')
      + '</div>'
      + '</div>' // .mk-section

      // ── Pagamento ─────────────────────────────────────────────
      + '<div class="mk-section">'
      + '<div class="mk-section-title"><span class="mk-section-dot"></span>Quanto você vai pagar</div>'
      + '<div class="wtb-pay-methods">'

      + '<div class="wtb-pay-row">'
      + '<label class="wtb-pay-label"><input type="checkbox" id="wtb-pay-kk-check" class="wtb-pay-check">'
      + ' <span class="wtb-pay-coin">◈</span> KK</label>'
      + '<div class="wtb-pay-input-wrap" id="wtb-pay-kk-wrap" style="display:none">'
      + '<input class="mk-input mk-price-input" id="wtb-pay-kk-amount" type="number" min="0" step="any" placeholder="Ex: 500">'
      + '<select class="mk-price-unit" id="wtb-pay-kk-unit">'
      + '<option value="1000">k</option>'
      + '<option value="1000000" selected>kk</option>'
      + '<option value="1000000000">kkk</option>'
      + '</select>'
      + '</div>'
      + '<span class="mk-field-error" id="wtb-err-pay_kk"></span>'
      + '</div>'

      + '<div class="wtb-pay-row">'
      + '<label class="wtb-pay-label"><input type="checkbox" id="wtb-pay-dd-check" class="wtb-pay-check"> 💎 DD</label>'
      + '<div class="wtb-pay-input-wrap" id="wtb-pay-dd-wrap" style="display:none">'
      + '<input class="mk-input mk-price-input" id="wtb-pay-dd-amount" type="number" min="0" step="any" placeholder="Ex: 100">'
      + '</div>'
      + '<span class="mk-field-error" id="wtb-err-pay_dd"></span>'
      + '</div>'

      + '<div class="wtb-pay-row">'
      + '<label class="wtb-pay-label"><input type="checkbox" id="wtb-pay-brl-check" class="wtb-pay-check"> 💵 Real (R$)</label>'
      + '<div class="wtb-pay-input-wrap" id="wtb-pay-brl-wrap" style="display:none">'
      + '<input class="mk-input mk-price-input" id="wtb-pay-brl-amount" type="number" min="0" step="0.01" placeholder="Ex: 50.00">'
      + '</div>'
      + '<span class="mk-field-error" id="wtb-err-pay_brl"></span>'
      + '</div>'

      + '</div>'
      + '<span class="mk-field-error" id="wtb-err-payment"></span>'

      + '<div class="mk-field" style="margin-top:14px">'
      + '<label class="mk-label" for="wtb-obs">Observações <small>(opcional, máx 500)</small></label>'
      + '<textarea class="mk-textarea" id="wtb-obs" maxlength="500" placeholder="Detalhes sobre o que você procura..."></textarea>'
      + '<span class="mk-field-error" id="wtb-err-observations"></span>'
      + '</div>'
      + '</div>' // .mk-section

      + '<div class="mk-modal-footer">'
      + '<button class="mk-btn mk-btn--ghost" onclick="WTBCreate.close()">Cancelar</button>'
      + '<button class="mk-btn mk-btn--primary" id="wtb-submit-btn" onclick="WTBCreate.publish()">Publicar Procura</button>'
      + '</div>'

      + '</div></div></div>'; // modal-body, modal, backdrop
  }

  function _renderModal() {
    if (!_modalEl) {
      _modalEl = global.document.createElement('div');
      global.document.body.appendChild(_modalEl);
    }
    _modalEl.style.display = '';
    _modalEl.innerHTML = _buildHtml();
  }

  function _bindEvents() {
    // Pokémon autocomplete
    var pokeInput = global.document.getElementById('wtb-poke-input');
    var pokeDrop  = global.document.getElementById('wtb-poke-dropdown');
    if (pokeInput && pokeDrop && typeof PokemonSelector !== 'undefined') {
      PokemonSelector.mount(pokeInput, pokeDrop, function (result) {
        _form.pokemon_name  = result.name;
        _form.pokemon_slug  = result.slug;
        _form.pokemon_types = result.types || [];
        _updatePokePreview(result);
      });
    }

    // Stars (clique = seleciona, mesmo valor = deseleciona)
    Array.prototype.forEach.call(
      global.document.querySelectorAll('#wtb-stars-input .mk-star-btn'),
      function (btn) {
        btn.addEventListener('click', function () {
          var val = parseInt(btn.getAttribute('data-val'), 10);
          _form.stars = (_form.stars === val) ? 0 : val;
          _updateStarsUI();
        });
      }
    );

    // Boost — slider + number input sincronizados
    var boostSlider = global.document.getElementById('wtb-boost-slider');
    var boostNum    = global.document.getElementById('wtb-boost-num');
    function _syncBoost(val) {
      var v = Math.min(70, Math.max(0, parseInt(val, 10) || 0));
      _form.boost = v;
      if (boostSlider) { boostSlider.value = v; boostSlider.style.accentColor = v > 0 ? '#ffd166' : ''; }
      if (boostNum)    { boostNum.value = v; boostNum.style.color = v >= 25 ? '#ffd166' : ''; }
    }
    if (boostSlider) boostSlider.addEventListener('input', function () { _syncBoost(boostSlider.value); });
    if (boostNum)    boostNum.addEventListener('input',   function () { _syncBoost(boostNum.value); });

    // Pokébola — clique no mesmo deseleciona (bola é opcional)
    Array.prototype.forEach.call(
      global.document.querySelectorAll('#wtb-ball-select .mk-ball-opt'),
      function (btn) {
        btn.addEventListener('click', function () {
          var ball = btn.getAttribute('data-ball');
          _form.ball_type = (_form.ball_type === ball) ? null : ball;
          _updateBallUI();
        });
      }
    );

    // Pagamento — checkboxes mostram/escondem inputs
    function _bindPayCheck(checkId, wrapId, amountId, unitId, key, multiplier) {
      var check  = global.document.getElementById(checkId);
      var wrap   = global.document.getElementById(wrapId);
      var amount = global.document.getElementById(amountId);
      var unit   = unitId ? global.document.getElementById(unitId) : null;
      if (!check || !wrap) return;

      function _recalc() {
        if (!check.checked || !amount) { _form[key] = null; return; }
        var v = parseFloat(amount.value) || 0;
        var u = unit ? (parseInt(unit.value, 10) || 1000000) : (multiplier || 1);
        _form[key] = v > 0 ? Math.round(v * u) : null;
      }

      check.addEventListener('change', function () {
        wrap.style.display = check.checked ? '' : 'none';
        if (!check.checked && amount) amount.value = '';
        _recalc();
      });
      if (amount) amount.addEventListener('input', _recalc);
      if (unit)   unit.addEventListener('change', _recalc);
    }

    _bindPayCheck('wtb-pay-kk-check',  'wtb-pay-kk-wrap',  'wtb-pay-kk-amount',  'wtb-pay-kk-unit',  'pay_kk',  null);
    _bindPayCheck('wtb-pay-dd-check',  'wtb-pay-dd-wrap',  'wtb-pay-dd-amount',  null,                'pay_dd',  1);
    _bindPayCheck('wtb-pay-brl-check', 'wtb-pay-brl-wrap', 'wtb-pay-brl-amount', null,                'pay_brl', 1);

    // Observações
    var obsEl = global.document.getElementById('wtb-obs');
    if (obsEl) obsEl.addEventListener('input', function () { _form.observations = obsEl.value; });
  }

  function _updatePokePreview(result) {
    var wrap  = global.document.getElementById('wtb-poke-preview-wrap');
    var img   = global.document.getElementById('wtb-poke-sprite');
    var name  = global.document.getElementById('wtb-poke-name');
    var types = global.document.getElementById('wtb-poke-types');
    if (!wrap) return;
    if (img) { img.src = result.sprite || ''; img.style.display = result.sprite ? '' : 'none'; }
    if (name) name.textContent = result.name || '';
    if (types) types.innerHTML = (result.types || []).map(function (t) {
      return '<span class="mk-type-badge mk-type--' + t.toLowerCase() + '">' + t + '</span>';
    }).join('');
    wrap.style.display = '';
  }

  function _updateStarsUI() {
    Array.prototype.forEach.call(
      global.document.querySelectorAll('#wtb-stars-input .mk-star-btn'),
      function (btn) {
        btn.classList.toggle('active', parseInt(btn.getAttribute('data-val'), 10) <= _form.stars);
      }
    );
  }

  function _updateBallUI() {
    Array.prototype.forEach.call(
      global.document.querySelectorAll('#wtb-ball-select .mk-ball-opt'),
      function (btn) {
        btn.classList.toggle('selected', btn.getAttribute('data-ball') === _form.ball_type);
      }
    );
  }

  function _renderErrors(errs) {
    Object.keys(errs || {}).forEach(function (k) {
      var el = global.document.getElementById('wtb-err-' + k);
      if (el) el.textContent = errs[k];
    });
  }

  // ── Publicar ──────────────────────────────────────────────────
  async function publish() {
    if (_submitLocked) return;
    _submitLocked = true;
    var btn = global.document.getElementById('wtb-submit-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Publicando...'; }

    try {
      if (!_validate()) { _renderErrors(_form.errors); _toast('Corrija os erros antes de publicar.', 'error'); return; }

      var user = _user();
      if (!user) { _toast('Faça login para criar uma procura.', 'error'); return; }

      var payload = {
        buyer_id:      user.id,
        pokemon_name:  _form.pokemon_name.trim(),
        pokemon_slug:  _toSlug(_form.pokemon_name),
        pokemon_types: _form.pokemon_types || [],
        stars:         _form.stars  || 0,
        boost:         _form.boost  || 0,
        ball_type:     _form.ball_type || null,
        pay_kk:        _form.pay_kk   || null,
        pay_dd:        _form.pay_dd   || null,
        pay_brl:       _form.pay_brl  || null,
        observations:  (_form.observations || '').trim().slice(0, 500) || null,
        status:        'active',
      };

      var res = await fetch(SB_URL + '/rest/v1/wtb_listings', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        SB_KEY,
          'Authorization': 'Bearer ' + _jwt(),
          'Prefer':        'return=representation',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      var data = await res.json().catch(function () { return {}; });
      var newListing = Array.isArray(data) ? data[0] : data;

      // Optimistic UI
      if (newListing && global.WTB) {
        var already = (global.WTB.state.listings || []).some(function (l) { return l.id === newListing.id; });
        if (!already) {
          global.WTB.state.listings = [newListing].concat(global.WTB.state.listings || []);
          global.WTB.render();
        }
      }

      _toast('✅ Procura publicada com sucesso!', 'success');
      close();
    } catch (err) {
      console.warn('[WTBCreate] publish error:', err.message);
      _toast('Erro ao publicar. Tente novamente.', 'error');
    } finally {
      _submitLocked = false;
      if (btn) { btn.disabled = false; btn.innerHTML = 'Publicar Procura'; }
    }
  }

  // ── Cancelar procura ──────────────────────────────────────────
  async function cancel(listingId) {
    if (!listingId) return;
    var confirmed = typeof confirmAction === 'function'
      ? await confirmAction('Cancelar procura', 'Remover esta procura permanentemente?',
          { type: 'danger', confirmText: 'Remover', cancelText: 'Cancelar' })
      : global.confirm('Remover esta procura?');
    if (!confirmed) return;

    try {
      var jwt = _jwt();
      if (!jwt) { _toast('Faça login.', 'error'); return; }

      var res = await fetch(SB_URL + '/rest/v1/wtb_listings?id=eq.' + listingId, {
        method:  'PATCH',
        headers: { 'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+jwt,'Prefer':'return=minimal' },
        body:    JSON.stringify({ status: 'deleted' }),
      });
      if (!res.ok) throw new Error(await res.text());

      // Remove do state local
      if (global.WTB) {
        global.WTB.state.listings = (global.WTB.state.listings || []).filter(function (l) { return l.id !== listingId; });
        global.WTB.render();
      }

      // Anima remoção do card
      var cardEl = global.document.querySelector('[data-wtb-id="' + listingId + '"]');
      if (cardEl) {
        cardEl.style.transition = 'opacity .25s, transform .25s';
        cardEl.style.opacity = '0';
        cardEl.style.transform = 'scale(0.95)';
        setTimeout(function () { if (cardEl.parentNode) cardEl.remove(); }, 260);
      }

      _toast('Procura removida.', 'info');
    } catch (err) {
      console.warn('[WTBCreate] cancel error:', err.message);
      _toast('Erro ao remover. Tente novamente.', 'error');
    }
  }

  // ── Abrir / Fechar modal ──────────────────────────────────────
  function open() {
    var user = _user();
    if (!user) {
      _toast('Faça login para criar uma procura.', 'info');
      if (typeof AuthModal !== 'undefined' && AuthModal.open) AuthModal.open('login');
      return;
    }
    _resetForm();
    _renderModal();
    _bindEvents();
  }

  function close() {
    if (_modalEl) { _modalEl.innerHTML = ''; _modalEl.style.display = 'none'; }
  }

  global.WTBCreate = { open: open, close: close, publish: publish, cancel: cancel };
  console.log('[WTB] wtb-create.js carregado');
}(window));
