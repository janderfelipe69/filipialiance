// ============================================================
// wtb-create.js — Formulário de criação/cancelamento de Procuras
// Pagamento em etapas: seleciona método → digita valor →
// "Aceitar em outras moedas?" → outras aparecem convertidas.
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

  // ── Conversão de moedas ───────────────────────────────────────
  // Tenta usar as funções/constantes globais já presentes no site.
  // Se não estiverem disponíveis, retorna null e o campo fica em branco.
  function _kkRawToBrl(kkRaw) {
    if (!kkRaw) return null;
    var rate = typeof KK_TO_BRL !== 'undefined' ? KK_TO_BRL : null;
    return rate ? (kkRaw / 1000000) * rate : null;
  }
  function _brlToKkRaw(brl) {
    if (!brl) return null;
    var rate = typeof KK_TO_BRL !== 'undefined' ? KK_TO_BRL : null;
    return rate ? Math.round((brl / rate) * 1000000) : null;
  }
  function _brlToDd(brl) {
    if (!brl) return null;
    if (typeof brlToDd === 'function') return brlToDd(brl);
    var rate = typeof DD_TO_BRL !== 'undefined' ? DD_TO_BRL : null;
    return rate ? Math.round(brl / rate) : null;
  }
  function _ddToBrl(dd) {
    if (!dd) return null;
    var rate = typeof DD_TO_BRL !== 'undefined' ? DD_TO_BRL : null;
    return rate ? dd * rate : null;
  }

  // Dado o método primário e o valor raw, retorna valores convertidos
  // para os outros dois métodos.
  function _convertOthers(primaryMethod, primaryRaw, kkUnit) {
    var result = { kk: null, dd: null, brl: null };
    if (!primaryRaw || primaryRaw <= 0) return result;

    if (primaryMethod === 'kk') {
      var rawKk = Math.round(primaryRaw * (kkUnit || 1000000));
      var brl   = _kkRawToBrl(rawKk);
      result.kk  = rawKk;
      result.brl = brl ? Math.round(brl * 100) / 100 : null;
      result.dd  = brl ? _brlToDd(brl) : null;
    } else if (primaryMethod === 'brl') {
      var brl2  = primaryRaw;
      result.brl = Math.round(brl2 * 100) / 100;
      result.kk  = _brlToKkRaw(brl2);
      result.dd  = _brlToDd(brl2);
    } else if (primaryMethod === 'dd') {
      var brl3  = _ddToBrl(primaryRaw);
      result.dd  = Math.round(primaryRaw);
      result.brl = brl3 ? Math.round(brl3 * 100) / 100 : null;
      result.kk  = brl3 ? _brlToKkRaw(brl3) : null;
    }
    return result;
  }

  // Formata valor KK raw para exibição legível (ex: 38kk, 500k)
  function _fmtKk(raw) {
    if (!raw) return '';
    if (raw >= 1000000000) return (raw / 1000000000).toFixed(raw % 1000000000 === 0 ? 0 : 1) + 'kkk';
    if (raw >= 1000000)    return (raw / 1000000).toFixed(raw % 1000000 === 0 ? 0 : 1) + 'kk';
    return (raw / 1000).toFixed(raw % 1000 === 0 ? 0 : 1) + 'k';
  }

  // ── Estado do formulário ──────────────────────────────────────
  var _form = {};
  var _pay  = {}; // estado do pagamento (separado para clareza)
  var _modalEl      = null;
  var _submitLocked = false;

  function _resetForm() {
    _form = {
      pokemon_name:  '',
      pokemon_slug:  '',
      pokemon_types: [],
      stars:         0,
      ball_type:     null,
      pay_kk:        null,
      pay_dd:        null,
      pay_brl:       null,
      observations:  '',
      errors:        {},
    };
    _pay = {
      primaryMethod:   null,   // 'kk' | 'dd' | 'brl'
      primaryRawVal:   0,      // número digitado (sem multiplicador)
      kkUnit:          1000000, // multiplicador para KK
      showingSecondary: false,
      secondary:       {},     // { kk, dd, brl } — valores das moedas secundárias
    };
  }

  // ── Validação ─────────────────────────────────────────────────
  function _validate() {
    var errs = {};
    if (!_form.pokemon_name || !_form.pokemon_name.trim())
      errs.pokemon_name = 'Selecione ou digite o nome do Pokémon.';
    if (_form.stars < 0 || _form.stars > 5)
      errs.stars = 'Stars: 0 a 5.';
    if (!_form.pay_kk && !_form.pay_dd && !_form.pay_brl)
      errs.payment = 'Informe pelo menos um valor de pagamento.';
    if (_form.observations && _form.observations.length > 500)
      errs.observations = 'Máx 500 caracteres.';
    _form.errors = errs;
    return Object.keys(errs).length === 0;
  }

  // ── Sincroniza _form.pay_* com _pay ──────────────────────────
  function _syncFormPay() {
    var conv = _convertOthers(_pay.primaryMethod, _pay.primaryRawVal, _pay.kkUnit);

    // Primária
    _form.pay_kk  = null;
    _form.pay_dd  = null;
    _form.pay_brl = null;

    if (_pay.primaryMethod === 'kk')  _form.pay_kk  = conv.kk;
    if (_pay.primaryMethod === 'dd')  _form.pay_dd  = _pay.primaryRawVal > 0 ? Math.round(_pay.primaryRawVal) : null;
    if (_pay.primaryMethod === 'brl') _form.pay_brl = _pay.primaryRawVal > 0 ? Math.round(_pay.primaryRawVal * 100) / 100 : null;

    // Secundárias (se estiver mostrando)
    if (_pay.showingSecondary) {
      if (_pay.primaryMethod !== 'kk'  && _pay.secondary.kk  != null) _form.pay_kk  = _pay.secondary.kk;
      if (_pay.primaryMethod !== 'dd'  && _pay.secondary.dd  != null) _form.pay_dd  = _pay.secondary.dd;
      if (_pay.primaryMethod !== 'brl' && _pay.secondary.brl != null) _form.pay_brl = _pay.secondary.brl;
    }
  }

  // ── Build HTML do modal ───────────────────────────────────────
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

      // Stars apenas (sem boost)
      + '<div class="mk-field" style="margin-top:10px">'
      + '<label class="mk-label">Mínimo de Stars <small>(opcional)</small></label>'
      + '<div class="mk-stars-input" id="wtb-stars-input">'
      + [1,2,3,4,5].map(function(i){
          return '<button type="button" class="mk-star-btn" data-val="' + i + '" title="' + i + ' ★">★</button>';
        }).join('')
      + '</div>'
      + '</div>'
      + '</div>' // .mk-section Pokémon

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
      + '</div>' // .mk-section Pokébola

      // ── Pagamento (fluxo em etapas) ───────────────────────────
      + '<div class="mk-section">'
      + '<div class="mk-section-title"><span class="mk-section-dot"></span>Quanto você vai pagar</div>'

      // Etapa 1 — seleciona o método principal
      + '<div id="wtb-pay-step1">'
      + '<p class="wtb-pay-step-hint">Escolha a forma de pagamento principal:</p>'
      + '<div class="wtb-pay-method-btns">'
      + '<button type="button" class="wtb-pay-method-btn" data-method="kk">'
      + '<span class="wtb-pay-method-icon">◈</span><span>KK</span>'
      + '</button>'
      + '<button type="button" class="wtb-pay-method-btn" data-method="dd">'
      + '<span class="wtb-pay-method-icon">💎</span><span>DD</span>'
      + '</button>'
      + '<button type="button" class="wtb-pay-method-btn" data-method="brl">'
      + '<span class="wtb-pay-method-icon">💵</span><span>Real (R$)</span>'
      + '</button>'
      + '</div>'
      + '</div>'

      // Etapa 2 — input do valor principal (oculto até selecionar método)
      + '<div id="wtb-pay-step2" style="display:none">'
      + '<div class="mk-field" style="margin-top:10px">'
      + '<label class="mk-label" id="wtb-pay-primary-label">Valor</label>'
      + '<div class="mk-price-row">'
      + '<input class="mk-input mk-price-input" id="wtb-pay-primary-val" type="number" min="0" step="any" placeholder="0">'
      + '<select class="mk-price-unit" id="wtb-pay-kk-unit" style="display:none">'
      + '<option value="1000">k</option>'
      + '<option value="1000000" selected>kk</option>'
      + '<option value="1000000000">kkk</option>'
      + '</select>'
      + '</div>'
      + '<span class="mk-field-error" id="wtb-err-payment"></span>'
      + '</div>'
      + '</div>'

      // Etapa 3 — prompt "aceitar em outras moedas?" (oculto até ter valor)
      + '<div id="wtb-pay-step3" style="display:none">'
      + '<button type="button" class="wtb-pay-add-more-btn" id="wtb-pay-add-more-btn">'
      + '+ Aceitar em outras formas de pagamento também?'
      + '</button>'
      + '</div>'

      // Etapa 4 — moedas secundárias convertidas (oculto até clicar no prompt)
      + '<div id="wtb-pay-step4" style="display:none"></div>'

      + '</div>' // .mk-section Pagamento

      // ── Observações ───────────────────────────────────────────
      + '<div class="mk-section">'
      + '<div class="mk-field">'
      + '<label class="mk-label" for="wtb-obs">Observações <small>(opcional, máx 500)</small></label>'
      + '<textarea class="mk-textarea" id="wtb-obs" maxlength="500" placeholder="Detalhes sobre o que você procura..."></textarea>'
      + '<span class="mk-field-error" id="wtb-err-observations"></span>'
      + '</div>'
      + '</div>'

      + '<div class="mk-modal-footer">'
      + '<button class="mk-btn mk-btn--ghost" onclick="WTBCreate.close()">Cancelar</button>'
      + '<button class="mk-btn mk-btn--primary" id="wtb-submit-btn" onclick="WTBCreate.publish()">Publicar Procura</button>'
      + '</div>'

      + '</div></div></div>'; // modal-body, modal, backdrop
  }

  // ── UI de pagamento — etapa 4 (secundárias) ───────────────────
  function _buildSecondaryHtml(converted) {
    var primary = _pay.primaryMethod;
    var methods = [
      { key: 'kk',  icon: '◈',  label: 'KK',       color: '#fbbf24', fmt: function(v){ return v ? _fmtKk(v) : null; } },
      { key: 'dd',  icon: '💎', label: 'DD',        color: '#a78bfa', fmt: function(v){ return v ? Math.round(v).toLocaleString('pt-BR') + ' DD' : null; } },
      { key: 'brl', icon: '💵', label: 'Real (R$)', color: '#34d399', fmt: function(v){ return v ? 'R$ ' + v.toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2}) : null; } },
    ];

    return methods.filter(function(m) { return m.key !== primary; }).map(function(m) {
      var val   = converted[m.key];
      var fmtd  = m.fmt(val);
      return '<div class="wtb-pay-secondary-row" data-sec-method="' + m.key + '">'
        + '<div class="wtb-pay-secondary-label">'
        + '<span class="wtb-pay-method-icon">' + m.icon + '</span>'
        + '<span style="color:' + m.color + ';font-weight:600">' + m.label + '</span>'
        + (fmtd ? '<span class="wtb-pay-secondary-converted">' + _esc(fmtd) + '</span>' : '')
        + '</div>'
        + '<div class="wtb-pay-secondary-input-row">'
        + '<input class="mk-input" type="number" min="0" step="any"'
        + ' id="wtb-pay-sec-' + m.key + '"'
        + ' value="' + _esc(String(val != null ? (m.key === 'kk' ? val / 1000000 : val) : '')) + '"'
        + ' placeholder="' + (fmtd ? 'Valor convertido' : 'Deixe em branco para não aceitar') + '">'
        + (m.key === 'kk'
            ? '<select class="mk-price-unit" id="wtb-pay-sec-kk-unit">'
              + '<option value="1000">k</option>'
              + '<option value="1000000" selected>kk</option>'
              + '<option value="1000000000">kkk</option>'
              + '</select>'
            : '')
        + '<button type="button" class="wtb-pay-sec-remove" data-sec-method="' + m.key + '" title="Remover esta moeda">✕</button>'
        + '</div>'
        + '</div>';
    }).join('');
  }

  function _updateSecondarySection() {
    var step4 = global.document.getElementById('wtb-pay-step4');
    if (!step4) return;
    var conv = _convertOthers(_pay.primaryMethod, _pay.primaryRawVal, _pay.kkUnit);

    // Inicializa secondary com valores convertidos (se ainda não definidos pelo usuário)
    var primary = _pay.primaryMethod;
    ['kk','dd','brl'].forEach(function(k) {
      if (k === primary) return;
      if (_pay.secondary[k] === undefined) _pay.secondary[k] = conv[k];
    });

    step4.innerHTML = _buildSecondaryHtml(conv);
    _bindSecondaryEvents();
  }

  function _bindSecondaryEvents() {
    // Remove botões ✕
    Array.prototype.forEach.call(
      global.document.querySelectorAll('.wtb-pay-sec-remove'),
      function(btn) {
        btn.addEventListener('click', function() {
          var method = btn.getAttribute('data-sec-method');
          _pay.secondary[method] = null;
          var row = btn.closest('[data-sec-method]');
          if (row) {
            var inp = row.querySelector('input[type="number"]');
            if (inp) inp.value = '';
          }
          _syncFormPay();
        });
      }
    );

    // Inputs editáveis das secundárias
    ['kk','dd','brl'].forEach(function(method) {
      if (method === _pay.primaryMethod) return;
      var inp  = global.document.getElementById('wtb-pay-sec-' + method);
      var unit = method === 'kk' ? global.document.getElementById('wtb-pay-sec-kk-unit') : null;
      if (!inp) return;

      function _recalcSec() {
        var v = parseFloat(inp.value) || 0;
        var u = unit ? (parseInt(unit.value, 10) || 1000000) : 1;
        _pay.secondary[method] = v > 0 ? Math.round(v * u) : null;
        _syncFormPay();
      }
      inp.addEventListener('input', _recalcSec);
      if (unit) unit.addEventListener('change', _recalcSec);
    });
  }

  // ── Bind todos os eventos ─────────────────────────────────────
  function _bindEvents() {
    // Pokémon autocomplete
    var pokeInput = global.document.getElementById('wtb-poke-input');
    var pokeDrop  = global.document.getElementById('wtb-poke-dropdown');
    if (pokeInput && pokeDrop && typeof PokemonSelector !== 'undefined') {
      PokemonSelector.mount(pokeInput, pokeDrop, function(result) {
        _form.pokemon_name  = result.name;
        _form.pokemon_slug  = result.slug;
        _form.pokemon_types = result.types || [];
        _updatePokePreview(result);
      });
    }

    // Stars
    Array.prototype.forEach.call(
      global.document.querySelectorAll('#wtb-stars-input .mk-star-btn'),
      function(btn) {
        btn.addEventListener('click', function() {
          var val = parseInt(btn.getAttribute('data-val'), 10);
          _form.stars = (_form.stars === val) ? 0 : val;
          _updateStarsUI();
        });
      }
    );

    // Pokébola (opcional — clique no mesmo deseleciona)
    Array.prototype.forEach.call(
      global.document.querySelectorAll('#wtb-ball-select .mk-ball-opt'),
      function(btn) {
        btn.addEventListener('click', function() {
          var ball = btn.getAttribute('data-ball');
          _form.ball_type = (_form.ball_type === ball) ? null : ball;
          _updateBallUI();
        });
      }
    );

    // ── Pagamento — etapa 1: seleciona método ────────────────────
    Array.prototype.forEach.call(
      global.document.querySelectorAll('.wtb-pay-method-btn'),
      function(btn) {
        btn.addEventListener('click', function() {
          var method = btn.getAttribute('data-method');
          _pay.primaryMethod   = method;
          _pay.primaryRawVal   = 0;
          _pay.secondary       = {};
          _pay.showingSecondary = false;
          _syncFormPay();

          // Marca o botão selecionado
          Array.prototype.forEach.call(
            global.document.querySelectorAll('.wtb-pay-method-btn'),
            function(b) { b.classList.toggle('selected', b === btn); }
          );

          // Mostra etapa 2 e configura label/unit
          var step2 = global.document.getElementById('wtb-pay-step2');
          var label = global.document.getElementById('wtb-pay-primary-label');
          var unit  = global.document.getElementById('wtb-pay-kk-unit');
          var inp   = global.document.getElementById('wtb-pay-primary-val');
          if (step2) step2.style.display = '';
          if (label) label.textContent = method === 'kk' ? 'Valor em KK' : method === 'dd' ? 'Valor em DD' : 'Valor em Real (R$)';
          if (unit)  unit.style.display = method === 'kk' ? '' : 'none';
          if (inp)   { inp.value = ''; inp.focus(); }

          // Esconde etapas 3 e 4
          var step3 = global.document.getElementById('wtb-pay-step3');
          var step4 = global.document.getElementById('wtb-pay-step4');
          if (step3) step3.style.display = 'none';
          if (step4) { step4.style.display = 'none'; step4.innerHTML = ''; }
        });
      }
    );

    // ── Pagamento — etapa 2: digita o valor ──────────────────────
    var primaryInp = global.document.getElementById('wtb-pay-primary-val');
    var kkUnit     = global.document.getElementById('wtb-pay-kk-unit');

    function _onPrimaryChange() {
      var v = parseFloat(primaryInp ? primaryInp.value : 0) || 0;
      var u = kkUnit ? (parseInt(kkUnit.value, 10) || 1000000) : 1;
      _pay.primaryRawVal = v;
      _pay.kkUnit        = u;
      _pay.secondary     = {}; // reseta secundárias ao mudar valor principal
      _pay.showingSecondary = false;
      _syncFormPay();

      var step3 = global.document.getElementById('wtb-pay-step3');
      var step4 = global.document.getElementById('wtb-pay-step4');
      if (step3) step3.style.display = v > 0 ? '' : 'none';
      if (step4) { step4.style.display = 'none'; step4.innerHTML = ''; }
    }

    if (primaryInp) primaryInp.addEventListener('input',  _onPrimaryChange);
    if (kkUnit)     kkUnit.addEventListener('change', _onPrimaryChange);

    // ── Pagamento — etapa 3: prompt "adicionar outras" ────────────
    var addMoreBtn = global.document.getElementById('wtb-pay-add-more-btn');
    if (addMoreBtn) {
      addMoreBtn.addEventListener('click', function() {
        _pay.showingSecondary = true;
        var step4 = global.document.getElementById('wtb-pay-step4');
        if (step4) {
          step4.style.display = '';
          _updateSecondarySection();
        }
        // Esconde o botão de prompt
        var step3 = global.document.getElementById('wtb-pay-step3');
        if (step3) step3.style.display = 'none';
        _syncFormPay();
      });
    }

    // Observações
    var obsEl = global.document.getElementById('wtb-obs');
    if (obsEl) obsEl.addEventListener('input', function() { _form.observations = obsEl.value; });
  }

  // ── Preview do Pokémon ────────────────────────────────────────
  function _updatePokePreview(result) {
    var wrap  = global.document.getElementById('wtb-poke-preview-wrap');
    var img   = global.document.getElementById('wtb-poke-sprite');
    var name  = global.document.getElementById('wtb-poke-name');
    var types = global.document.getElementById('wtb-poke-types');
    if (!wrap) return;
    if (img)   { img.src = result.sprite || ''; img.style.display = result.sprite ? '' : 'none'; }
    if (name)  name.textContent = result.name || '';
    if (types) types.innerHTML  = (result.types || []).map(function(t) {
      return '<span class="mk-type-badge mk-type--' + t.toLowerCase() + '">' + t + '</span>';
    }).join('');
    wrap.style.display = '';
  }

  function _updateStarsUI() {
    Array.prototype.forEach.call(
      global.document.querySelectorAll('#wtb-stars-input .mk-star-btn'),
      function(btn) {
        btn.classList.toggle('active', parseInt(btn.getAttribute('data-val'), 10) <= _form.stars);
      }
    );
  }

  function _updateBallUI() {
    Array.prototype.forEach.call(
      global.document.querySelectorAll('#wtb-ball-select .mk-ball-opt'),
      function(btn) {
        btn.classList.toggle('selected', btn.getAttribute('data-ball') === _form.ball_type);
      }
    );
  }

  function _renderErrors(errs) {
    Object.keys(errs || {}).forEach(function(k) {
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
      _syncFormPay();
      if (!_validate()) { _renderErrors(_form.errors); _toast('Corrija os erros antes de publicar.', 'error'); return; }

      var user = _user();
      if (!user) { _toast('Faça login para criar uma procura.', 'error'); return; }

      var payload = {
        buyer_id:      user.id,
        pokemon_name:  _form.pokemon_name.trim(),
        pokemon_slug:  _toSlug(_form.pokemon_name),
        pokemon_types: _form.pokemon_types || [],
        stars:         _form.stars  || 0,
        boost:         0,
        ball_type:     _form.ball_type || null,
        pay_kk:        _form.pay_kk   || null,
        pay_dd:        _form.pay_dd   || null,
        pay_brl:       _form.pay_brl  || null,
        observations:  (_form.observations || '').trim().slice(0, 500) || null,
        status:        'active',
      };

      var res = await fetch(SB_URL + '/rest/v1/wtb_listings', {
        method:  'POST',
        headers: { 'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+_jwt(),'Prefer':'return=representation' },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      var data = await res.json().catch(function() { return {}; });
      var newListing = Array.isArray(data) ? data[0] : data;

      if (newListing && global.WTB) {
        var already = (global.WTB.state.listings || []).some(function(l) { return l.id === newListing.id; });
        if (!already) {
          global.WTB.state.listings = [newListing].concat(global.WTB.state.listings || []);
          global.WTB.render();
        }
      }

      _toast('✅ Procura publicada com sucesso!', 'success');
      close();
    } catch(err) {
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

      if (global.WTB) {
        global.WTB.state.listings = (global.WTB.state.listings || []).filter(function(l) { return l.id !== listingId; });
        global.WTB.render();
      }
      var cardEl = global.document.querySelector('[data-wtb-id="' + listingId + '"]');
      if (cardEl) {
        cardEl.style.transition = 'opacity .25s, transform .25s';
        cardEl.style.opacity    = '0';
        cardEl.style.transform  = 'scale(0.95)';
        setTimeout(function() { if (cardEl.parentNode) cardEl.remove(); }, 260);
      }
      _toast('Procura removida.', 'info');
    } catch(err) {
      console.warn('[WTBCreate] cancel error:', err.message);
      _toast('Erro ao remover. Tente novamente.', 'error');
    }
  }

  // ── Abrir / Fechar ────────────────────────────────────────────
  function open() {
    var user = _user();
    if (!user) {
      _toast('Faça login para criar uma procura.', 'info');
      if (typeof AuthModal !== 'undefined' && AuthModal.open) AuthModal.open('login');
      return;
    }
    _resetForm();
    if (!_modalEl) { _modalEl = global.document.createElement('div'); global.document.body.appendChild(_modalEl); }
    _modalEl.style.display = '';
    _modalEl.innerHTML = _buildHtml();
    _bindEvents();
  }

  function close() {
    if (_modalEl) { _modalEl.innerHTML = ''; _modalEl.style.display = 'none'; }
  }

  global.WTBCreate = { open: open, close: close, publish: publish, cancel: cancel };
  console.log('[WTB] wtb-create.js carregado');
}(window));
