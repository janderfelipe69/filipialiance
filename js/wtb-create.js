// ============================================================
// wtb-create.js — Formulário de Procura (Pokémon + Talento)
//
// Fluxo:
//   open() → escolhe tipo (Pokémon ou Talento)
//         → preenche form específico
//         → pagamento em etapas com conversão
// ============================================================

;(function (global) {
  'use strict';
  if (global.WTBCreate) return;

  var SB_URL = global.SUPABASE_URL || '';
  var SB_KEY = global.SUPABASE_KEY || '';

  function _esc(s)  { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _jwt()   { return typeof Session !== 'undefined' && Session.getAccessToken ? Session.getAccessToken() : null; }
  function _user()  { return typeof Session !== 'undefined' ? Session.getCurrentUser() : null; }
  function _toast(m,t) { if (typeof showToast === 'function') showToast(m, t||'info'); }
  function _toSlug(n) {
    return String(n||'').toLowerCase().replace(/['']/g,'').replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'');
  }

  var BALL_META = {
    ultra:    { label:'Ultra Ball',    color:'#f5c518', border:'#f5c518', glow:'rgba(245,197,24,0.40)',  accent:'#111' },
    premier:  { label:'Premier Ball',  color:'#e8e8e8', border:'#cfd3dc', glow:'rgba(232,232,232,0.30)', accent:'#666' },
    alliance: { label:'Alliance Ball', color:'#b67fff', border:'#7c6aff', glow:'rgba(124,106,255,0.45)', accent:'#ff4fa0' },
  };
  var BALL_ORDER = ['ultra','premier','alliance'];

  var TALENT_TYPES = [
    { key:'talents', label:'Talents', color:'#a78bfa', icon:'⚡' },
    { key:'gym',     label:'Gym',     color:'#34d399', icon:'🏟️' },
    { key:'reduces', label:'Reduces', color:'#fb7185', icon:'🔻' },
    { key:'any',     label:'Qualquer',color:'#94a3b8', icon:'🎯' },
  ];

  function _ballIconSvg(color, accent) {
    return '<svg width="26" height="26" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<circle cx="20" cy="20" r="17" fill="#15161f" stroke="'+color+'" stroke-width="2"/>'
      + '<path d="M3 20 Q20 13 37 20" stroke="'+color+'" stroke-width="2.5" fill="none"/>'
      + '<path d="M3 20 Q20 27 37 20" stroke="'+accent+'" stroke-width="2.5" fill="none"/>'
      + '<circle cx="20" cy="20" r="4.5" fill="#15161f" stroke="'+color+'" stroke-width="2"/>'
      + '<circle cx="20" cy="20" r="2" fill="'+color+'"/>'
      + '</svg>';
  }

  // ── Conversão de moedas ───────────────────────────────────────
  function _kkRawToBrl(raw) {
    var rate = typeof KK_TO_BRL !== 'undefined' ? KK_TO_BRL : null;
    return (raw && rate) ? (raw / 1000000) * rate : null;
  }
  function _brlToKkRaw(brl) {
    var rate = typeof KK_TO_BRL !== 'undefined' ? KK_TO_BRL : null;
    return (brl && rate) ? Math.round((brl / rate) * 1000000) : null;
  }
  function _brlToDd(brl) {
    if (!brl) return null;
    if (typeof brlToDd === 'function') return brlToDd(brl);
    var rate = typeof DD_TO_BRL !== 'undefined' ? DD_TO_BRL : null;
    return rate ? Math.round(brl / rate) : null;
  }
  function _ddToBrl(dd) {
    var rate = typeof DD_TO_BRL !== 'undefined' ? DD_TO_BRL : null;
    return (dd && rate) ? dd * rate : null;
  }
  function _fmtKk(raw) {
    if (!raw) return '';
    if (raw >= 1e9) return parseFloat((raw/1e9).toFixed(1)) + 'kkk';
    if (raw >= 1e6) return parseFloat((raw/1e6).toFixed(1)) + 'kk';
    return parseFloat((raw/1e3).toFixed(1)) + 'k';
  }
  function _convertOthers(method, rawVal, kkUnit) {
    var r = { kk:null, dd:null, brl:null };
    if (!rawVal || rawVal <= 0) return r;
    if (method === 'kk') {
      var kk  = Math.round(rawVal * (kkUnit||1e6));
      var brl = _kkRawToBrl(kk);
      r.kk = kk; r.brl = brl ? Math.round(brl*100)/100 : null; r.dd = _brlToDd(brl);
    } else if (method === 'brl') {
      r.brl = Math.round(rawVal*100)/100;
      r.kk  = _brlToKkRaw(rawVal);
      r.dd  = _brlToDd(rawVal);
    } else if (method === 'dd') {
      var brl2 = _ddToBrl(rawVal);
      r.dd = Math.round(rawVal); r.brl = brl2 ? Math.round(brl2*100)/100 : null; r.kk = _brlToKkRaw(brl2);
    }
    return r;
  }

  // ── Estado global do formulário ───────────────────────────────
  var _form      = {};
  var _pay       = {};
  var _modalEl   = null;
  var _locked    = false;

  function _resetForm(type) {
    _form = {
      listing_type:  type || 'pokemon',
      // pokemon
      pokemon_name:  '', pokemon_slug: '', pokemon_types: [], stars: 0, ball_type: null,
      // talent
      talent_type:   'any', talent_slots: null, talent_full: false,
      // shared
      pay_kk: null, pay_dd: null, pay_brl: null,
      observations: '', errors: {},
    };
    _pay = { primaryMethod: null, primaryRawVal: 0, kkUnit: 1e6, showingSecondary: false, secondary: {} };
  }

  function _syncFormPay() {
    _form.pay_kk = _form.pay_dd = _form.pay_brl = null;
    var m = _pay.primaryMethod;
    if (!m) return;
    var conv = _convertOthers(m, _pay.primaryRawVal, _pay.kkUnit);
    if (m === 'kk')  _form.pay_kk  = conv.kk;
    if (m === 'dd')  _form.pay_dd  = _pay.primaryRawVal > 0 ? Math.round(_pay.primaryRawVal) : null;
    if (m === 'brl') _form.pay_brl = _pay.primaryRawVal > 0 ? Math.round(_pay.primaryRawVal*100)/100 : null;
    if (_pay.showingSecondary) {
      if (m !== 'kk'  && _pay.secondary.kk  != null) _form.pay_kk  = _pay.secondary.kk;
      if (m !== 'dd'  && _pay.secondary.dd  != null) _form.pay_dd  = _pay.secondary.dd;
      if (m !== 'brl' && _pay.secondary.brl != null) _form.pay_brl = _pay.secondary.brl;
    }
  }

  function _validate() {
    var errs = {};
    if (_form.listing_type === 'pokemon') {
      if (!_form.pokemon_name || !_form.pokemon_name.trim()) errs.pokemon_name = 'Selecione ou digite o nome do Pokémon.';
    }
    if (_form.listing_type === 'talent') {
      if (!_form.talent_type) errs.talent_type = 'Selecione o tipo de talento.';
    }
    if (!_form.pay_kk && !_form.pay_dd && !_form.pay_brl) errs.payment = 'Informe pelo menos um valor de pagamento.';
    if (_form.observations && _form.observations.length > 500) errs.observations = 'Máx 500 caracteres.';
    _form.errors = errs;
    return Object.keys(errs).length === 0;
  }

  // ================================================================
  // HTML — Etapa 0: Escolha do tipo
  // ================================================================
  function _buildTypeChooserHtml() {
    return '<div class="mk-modal-backdrop" id="wtb-create-backdrop">'
      + '<div class="mk-modal" id="wtb-create-modal" role="dialog" aria-modal="true">'
      + '<div class="mk-modal-header">'
      + '<span class="mk-modal-title">🔍 Nova Procura</span>'
      + '<button class="mk-modal-close" onclick="WTBCreate.close()" aria-label="Fechar">✕</button>'
      + '</div>'
      + '<div class="mk-modal-body">'
      + '<p class="wtb-chooser-hint">O que você está procurando?</p>'
      + '<div class="wtb-type-chooser">'

      + '<button class="wtb-type-card" id="wtb-type-card-pokemon">'
      + '<span class="wtb-type-card-icon">🎴</span>'
      + '<span class="wtb-type-card-title">Pokémon</span>'
      + '<span class="wtb-type-card-desc">Procuro um Pokémon específico para comprar</span>'
      + '</button>'

      + '<button class="wtb-type-card" id="wtb-type-card-talent">'
      + '<span class="wtb-type-card-icon">🎯</span>'
      + '<span class="wtb-type-card-title">Talento</span>'
      + '<span class="wtb-type-card-desc">Procuro um pacote de talentos para meu Pokémon</span>'
      + '</button>'

      + '</div>'
      + '</div></div></div>';
  }

  // ================================================================
  // HTML — Seção de pagamento (compartilhada)
  // ================================================================
  function _buildPaymentHtml() {
    return '<div class="mk-section">'
      + '<div class="mk-section-title"><span class="mk-section-dot"></span>Quanto você vai pagar</div>'

      // Etapa 1 — botões de método
      + '<div id="wtb-pay-step1">'
      + '<p class="wtb-pay-step-hint">Escolha a forma de pagamento principal:</p>'
      + '<div class="wtb-pay-method-btns">'
      + '<button type="button" class="wtb-pay-method-btn" data-method="kk"><span class="wtb-pay-method-icon">◈</span><span>KK</span></button>'
      + '<button type="button" class="wtb-pay-method-btn" data-method="dd"><span class="wtb-pay-method-icon">💎</span><span>DD</span></button>'
      + '<button type="button" class="wtb-pay-method-btn" data-method="brl"><span class="wtb-pay-method-icon">💵</span><span>Real (R$)</span></button>'
      + '</div>'
      + '</div>'

      // Etapa 2 — input do valor
      + '<div id="wtb-pay-step2" style="display:none">'
      + '<div class="mk-field" style="margin-top:10px">'
      + '<label class="mk-label" id="wtb-pay-primary-label">Valor</label>'
      + '<div class="mk-price-row">'
      + '<input class="mk-input mk-price-input" id="wtb-pay-primary-val" type="number" min="0" step="any" placeholder="0">'
      + '<select class="mk-price-unit" id="wtb-pay-kk-unit" style="display:none">'
      + '<option value="1000">k</option><option value="1000000" selected>kk</option><option value="1000000000">kkk</option>'
      + '</select>'
      + '</div>'
      + '<span class="mk-field-error" id="wtb-err-payment"></span>'
      + '</div>'
      + '</div>'

      // Etapa 3 — prompt
      + '<div id="wtb-pay-step3" style="display:none">'
      + '<button type="button" class="wtb-pay-add-more-btn" id="wtb-pay-add-more-btn">+ Aceitar em outras formas de pagamento também?</button>'
      + '</div>'

      // Etapa 4 — secundárias
      + '<div id="wtb-pay-step4" style="display:none"></div>'

      + '</div>'; // .mk-section
  }

  // ================================================================
  // HTML — Formulário Pokémon
  // ================================================================
  function _buildPokemonFormHtml() {
    return '<div class="mk-modal-backdrop" id="wtb-create-backdrop">'
      + '<div class="mk-modal" id="wtb-create-modal" role="dialog" aria-modal="true">'
      + '<div class="mk-modal-header">'
      + '<button class="wtb-back-btn" onclick="WTBCreate._showChooser()" title="Voltar">←</button>'
      + '<span class="mk-modal-title">🎴 Procura de Pokémon</span>'
      + '<button class="mk-modal-close" onclick="WTBCreate.close()" aria-label="Fechar">✕</button>'
      + '</div>'
      + '<div class="mk-modal-body">'

      // Pokémon
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
      + '<div class="mk-field" style="margin-top:10px">'
      + '<label class="mk-label">Mínimo de Stars <small>(opcional)</small></label>'
      + '<div class="mk-stars-input" id="wtb-stars-input">'
      + [1,2,3,4,5].map(function(i){ return '<button type="button" class="mk-star-btn" data-val="'+i+'">★</button>'; }).join('')
      + '</div>'
      + '</div>'
      + '</div>'

      // Pokébola
      + '<div class="mk-section">'
      + '<div class="mk-section-title"><span class="mk-section-dot"></span>Pokébola <small class="mk-section-hint">opcional — sem seleção = aceita qualquer uma</small></div>'
      + '<div class="mk-ball-select" id="wtb-ball-select">'
      + BALL_ORDER.map(function(t){
          var m = BALL_META[t];
          return '<button type="button" class="mk-ball-opt" data-ball="'+t+'"'
            + ' style="--ball:'+m.border+';--ball-glow:'+m.glow+';--ball-color:'+m.color+'">'
            + '<span class="mk-ball-opt-ico">'+_ballIconSvg(m.color,m.accent)+'</span>'
            + '<span class="mk-ball-opt-label">'+_esc(m.label)+'</span>'
            + '<span class="mk-ball-opt-check">✓</span>'
            + '</button>';
        }).join('')
      + '</div>'
      + '</div>'

      // Pagamento
      + _buildPaymentHtml()

      // Observações
      + '<div class="mk-section">'
      + '<div class="mk-field">'
      + '<label class="mk-label" for="wtb-obs">Observações <small>(opcional, máx 500)</small></label>'
      + '<textarea class="mk-textarea" id="wtb-obs" maxlength="500" placeholder="Detalhes sobre o que você procura..."></textarea>'
      + '</div>'
      + '</div>'

      + '<div class="mk-modal-footer">'
      + '<button class="mk-btn mk-btn--ghost" onclick="WTBCreate.close()">Cancelar</button>'
      + '<button class="mk-btn mk-btn--primary" id="wtb-submit-btn" onclick="WTBCreate.publish()">Publicar Procura</button>'
      + '</div>'
      + '</div></div></div>';
  }

  // ================================================================
  // HTML — Formulário Talento
  // ================================================================
  function _buildTalentFormHtml() {
    return '<div class="mk-modal-backdrop" id="wtb-create-backdrop">'
      + '<div class="mk-modal" id="wtb-create-modal" role="dialog" aria-modal="true">'
      + '<div class="mk-modal-header">'
      + '<button class="wtb-back-btn" onclick="WTBCreate._showChooser()" title="Voltar">←</button>'
      + '<span class="mk-modal-title">🎯 Procura de Talento</span>'
      + '<button class="mk-modal-close" onclick="WTBCreate.close()" aria-label="Fechar">✕</button>'
      + '</div>'
      + '<div class="mk-modal-body">'

      // Tipo de Talento
      + '<div class="mk-section">'
      + '<div class="mk-section-title"><span class="mk-section-dot"></span>Tipo de Talento</div>'
      + '<div class="wtb-talent-type-chips" id="wtb-talent-type-chips">'
      + TALENT_TYPES.map(function(t){
          return '<button type="button" class="wtb-talent-type-chip' + (t.key==='any'?' selected':'') + '"'
            + ' data-talent="'+t.key+'"'
            + ' style="--tc:'+t.color+'">'
            + t.icon + ' ' + t.label
            + '</button>';
        }).join('')
      + '</div>'
      + '<span class="mk-field-error" id="wtb-err-talent_type"></span>'
      + '</div>'

      // Pokémon (opcional)
      + '<div class="mk-section">'
      + '<div class="mk-section-title"><span class="mk-section-dot"></span>Pokémon <small class="mk-section-hint">opcional — para qual pokémon é o talento?</small></div>'
      + '<div class="mk-field">'
      + '<div class="mk-autocomplete">'
      + '<input class="mk-input" id="wtb-poke-input" type="text" placeholder="Ex: Shiny Charizard (opcional)" autocomplete="off">'
      + '<div class="mk-dropdown" id="wtb-poke-dropdown" style="display:none"></div>'
      + '</div>'
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
      + '</div>'

      // Slots e Completude
      + '<div class="mk-section">'
      + '<div class="mk-section-title"><span class="mk-section-dot"></span>Completude do Talento</div>'
      + '<div class="mk-field-pair">'
      + '<div class="mk-field">'
      + '<label class="mk-label" for="wtb-talent-slots">Slots mínimos <small>(1–8)</small></label>'
      + '<div class="mk-stepper" style="justify-content:flex-start;gap:8px">'
      + '<button type="button" class="mk-step-btn" id="wtb-slots-dec">−</button>'
      + '<input type="number" class="mk-step-num" id="wtb-talent-slots" min="1" max="8" value="" placeholder="Qualquer">'
      + '<button type="button" class="mk-step-btn" id="wtb-slots-inc">+</button>'
      + '</div>'
      + '<span class="wtb-slots-hint" id="wtb-slots-hint" style="font-size:.72rem;color:rgba(255,255,255,.4);margin-top:4px;display:block">Deixe em branco para aceitar qualquer qtd.</span>'
      + '</div>'
      + '<div class="mk-field">'
      + '<label class="mk-label">Nível de completude</label>'
      + '<label class="wtb-full-toggle">'
      + '<input type="checkbox" id="wtb-talent-full">'
      + '<span class="wtb-full-toggle-track"><span class="wtb-full-toggle-thumb"></span></span>'
      + '<span>Precisa ser completo <small>(8/8)</small></span>'
      + '</label>'
      + '</div>'
      + '</div>'
      + '</div>'

      // Pagamento
      + _buildPaymentHtml()

      // Observações
      + '<div class="mk-section">'
      + '<div class="mk-field">'
      + '<label class="mk-label" for="wtb-obs">Observações <small>(opcional, máx 500)</small></label>'
      + '<textarea class="mk-textarea" id="wtb-obs" maxlength="500" placeholder="Detalhes adicionais sobre o talento que procura..."></textarea>'
      + '</div>'
      + '</div>'

      + '<div class="mk-modal-footer">'
      + '<button class="mk-btn mk-btn--ghost" onclick="WTBCreate.close()">Cancelar</button>'
      + '<button class="mk-btn mk-btn--primary" id="wtb-submit-btn" onclick="WTBCreate.publish()">Publicar Procura</button>'
      + '</div>'
      + '</div></div></div>';
  }

  // ================================================================
  // Render modal
  // ================================================================
  function _ensureModal() {
    if (!_modalEl) { _modalEl = global.document.createElement('div'); global.document.body.appendChild(_modalEl); }
    _modalEl.style.display = '';
  }

  function _showChooser() {
    _ensureModal();
    _modalEl.innerHTML = _buildTypeChooserHtml();
    _bindChooserEvents();
  }

  function _showPokemonForm() {
    _ensureModal();
    _modalEl.innerHTML = _buildPokemonFormHtml();
    _bindPokemonEvents();
    _bindPaymentEvents();
  }

  function _showTalentForm() {
    _ensureModal();
    _modalEl.innerHTML = _buildTalentFormHtml();
    _bindTalentEvents();
    _bindPaymentEvents();
  }

  // ================================================================
  // Bind — Type Chooser
  // ================================================================
  function _bindChooserEvents() {
    var pokemonBtn = global.document.getElementById('wtb-type-card-pokemon');
    var talentBtn  = global.document.getElementById('wtb-type-card-talent');
    if (pokemonBtn) pokemonBtn.addEventListener('click', function() {
      _resetForm('pokemon');
      _showPokemonForm();
    });
    if (talentBtn) talentBtn.addEventListener('click', function() {
      _resetForm('talent');
      _showTalentForm();
    });
  }

  // ================================================================
  // Bind — Pokémon form
  // ================================================================
  function _bindPokemonEvents() {
    // Autocomplete
    var inp  = global.document.getElementById('wtb-poke-input');
    var drop = global.document.getElementById('wtb-poke-dropdown');
    if (inp && drop && typeof PokemonSelector !== 'undefined') {
      PokemonSelector.mount(inp, drop, function(r) {
        _form.pokemon_name = r.name; _form.pokemon_slug = r.slug; _form.pokemon_types = r.types||[];
        _updatePokePreview(r);
      });
    }
    // Stars
    Array.prototype.forEach.call(global.document.querySelectorAll('#wtb-stars-input .mk-star-btn'), function(btn) {
      btn.addEventListener('click', function() {
        var v = parseInt(btn.getAttribute('data-val'),10);
        _form.stars = (_form.stars===v) ? 0 : v;
        _updateStarsUI();
      });
    });
    // Pokébola (toggle)
    Array.prototype.forEach.call(global.document.querySelectorAll('#wtb-ball-select .mk-ball-opt'), function(btn) {
      btn.addEventListener('click', function() {
        var b = btn.getAttribute('data-ball');
        _form.ball_type = (_form.ball_type===b) ? null : b;
        _updateBallUI();
      });
    });
    // Obs
    var obs = global.document.getElementById('wtb-obs');
    if (obs) obs.addEventListener('input', function() { _form.observations = obs.value; });
  }

  // ================================================================
  // Bind — Talento form
  // ================================================================
  function _bindTalentEvents() {
    // Tipo de talento
    Array.prototype.forEach.call(global.document.querySelectorAll('.wtb-talent-type-chip'), function(btn) {
      btn.addEventListener('click', function() {
        _form.talent_type = btn.getAttribute('data-talent');
        Array.prototype.forEach.call(global.document.querySelectorAll('.wtb-talent-type-chip'), function(b) {
          b.classList.toggle('selected', b===btn);
        });
      });
    });

    // Pokémon opcional (autocomplete)
    var inp  = global.document.getElementById('wtb-poke-input');
    var drop = global.document.getElementById('wtb-poke-dropdown');
    if (inp && drop && typeof PokemonSelector !== 'undefined') {
      PokemonSelector.mount(inp, drop, function(r) {
        _form.pokemon_name = r.name; _form.pokemon_slug = r.slug; _form.pokemon_types = r.types||[];
        _updatePokePreview(r);
      });
    }

    // Slots stepper
    var slotsInp = global.document.getElementById('wtb-talent-slots');
    var hint     = global.document.getElementById('wtb-slots-hint');
    function _updateSlots(v) {
      v = Math.min(8, Math.max(1, parseInt(v,10)||0));
      _form.talent_slots = v > 0 ? v : null;
      if (slotsInp) slotsInp.value = v > 0 ? v : '';
      if (hint) hint.textContent = v > 0 ? v + '/8 slots mínimos' : 'Deixe em branco para aceitar qualquer qtd.';
    }
    var dec = global.document.getElementById('wtb-slots-dec');
    var inc = global.document.getElementById('wtb-slots-inc');
    if (dec) dec.addEventListener('click', function() { _updateSlots((parseInt(slotsInp&&slotsInp.value,10)||1)-1); });
    if (inc) inc.addEventListener('click', function() { _updateSlots((parseInt(slotsInp&&slotsInp.value,10)||0)+1); });
    if (slotsInp) slotsInp.addEventListener('input', function() { _updateSlots(slotsInp.value); });

    // Completo toggle
    var fullChk = global.document.getElementById('wtb-talent-full');
    if (fullChk) fullChk.addEventListener('change', function() { _form.talent_full = fullChk.checked; });

    // Obs
    var obs = global.document.getElementById('wtb-obs');
    if (obs) obs.addEventListener('input', function() { _form.observations = obs.value; });
  }

  // ================================================================
  // Bind — Pagamento (compartilhado entre os dois forms)
  // ================================================================
  function _bindPaymentEvents() {
    // Etapa 1 — método
    Array.prototype.forEach.call(global.document.querySelectorAll('.wtb-pay-method-btn'), function(btn) {
      btn.addEventListener('click', function() {
        var method = btn.getAttribute('data-method');
        _pay.primaryMethod = method; _pay.primaryRawVal = 0; _pay.secondary = {}; _pay.showingSecondary = false;
        _syncFormPay();

        Array.prototype.forEach.call(global.document.querySelectorAll('.wtb-pay-method-btn'), function(b) {
          b.classList.toggle('selected', b===btn);
        });

        var step2 = global.document.getElementById('wtb-pay-step2');
        var label = global.document.getElementById('wtb-pay-primary-label');
        var unit  = global.document.getElementById('wtb-pay-kk-unit');
        var inp   = global.document.getElementById('wtb-pay-primary-val');
        if (step2) step2.style.display = '';
        if (label) label.textContent = method==='kk' ? 'Valor em KK' : method==='dd' ? 'Valor em DD' : 'Valor em Real (R$)';
        if (unit)  unit.style.display = method==='kk' ? '' : 'none';
        if (inp)   { inp.value=''; inp.focus(); }

        var step3 = global.document.getElementById('wtb-pay-step3');
        var step4 = global.document.getElementById('wtb-pay-step4');
        if (step3) step3.style.display = 'none';
        if (step4) { step4.style.display='none'; step4.innerHTML=''; }
      });
    });

    // Etapa 2 — valor
    var primaryInp = global.document.getElementById('wtb-pay-primary-val');
    var kkUnit     = global.document.getElementById('wtb-pay-kk-unit');
    function _onPrimaryChange() {
      var v = parseFloat(primaryInp ? primaryInp.value : 0) || 0;
      var u = kkUnit ? (parseInt(kkUnit.value,10)||1e6) : 1;
      _pay.primaryRawVal = v; _pay.kkUnit = u; _pay.secondary = {}; _pay.showingSecondary = false;
      _syncFormPay();
      var step3 = global.document.getElementById('wtb-pay-step3');
      var step4 = global.document.getElementById('wtb-pay-step4');
      if (step3) step3.style.display = v>0 ? '' : 'none';
      if (step4) { step4.style.display='none'; step4.innerHTML=''; }
    }
    if (primaryInp) primaryInp.addEventListener('input',  _onPrimaryChange);
    if (kkUnit)     kkUnit.addEventListener('change', _onPrimaryChange);

    // Etapa 3 — prompt
    var addBtn = global.document.getElementById('wtb-pay-add-more-btn');
    if (addBtn) {
      addBtn.addEventListener('click', function() {
        _pay.showingSecondary = true;
        var step4 = global.document.getElementById('wtb-pay-step4');
        if (step4) { step4.style.display=''; _buildSecondarySection(step4); }
        var step3 = global.document.getElementById('wtb-pay-step3');
        if (step3) step3.style.display = 'none';
        _syncFormPay();
      });
    }
  }

  function _buildSecondarySection(container) {
    var primary = _pay.primaryMethod;
    var conv    = _convertOthers(primary, _pay.primaryRawVal, _pay.kkUnit);
    var methods = [
      { key:'kk',  icon:'◈',  label:'KK',       color:'#fbbf24', fmt: function(v){ return v ? _fmtKk(v) : null; }, unitId:'wtb-pay-sec-kk-unit' },
      { key:'dd',  icon:'💎', label:'DD',        color:'#a78bfa', fmt: function(v){ return v ? Math.round(v).toLocaleString('pt-BR')+' DD' : null; }, unitId:null },
      { key:'brl', icon:'💵', label:'Real (R$)', color:'#34d399', fmt: function(v){ return v ? 'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : null; }, unitId:null },
    ];
    container.innerHTML = methods.filter(function(m){ return m.key!==primary; }).map(function(m) {
      var val  = conv[m.key];
      var disp = m.fmt(val);
      var displayVal = val != null ? (m.key==='kk' ? val/1000000 : val) : '';
      return '<div class="wtb-pay-secondary-row" data-sec-method="'+m.key+'">'
        + '<div class="wtb-pay-secondary-label">'
        + '<span class="wtb-pay-method-icon">'+m.icon+'</span>'
        + '<span style="color:'+m.color+';font-weight:600">'+m.label+'</span>'
        + (disp ? '<span class="wtb-pay-secondary-converted">'+_esc(disp)+'</span>' : '')
        + '</div>'
        + '<div class="wtb-pay-secondary-input-row">'
        + '<input class="mk-input" type="number" min="0" step="any" id="wtb-pay-sec-'+m.key+'"'
        + ' value="'+_esc(String(displayVal))+'" placeholder="'+(disp?'Valor convertido (editável)':'Deixe em branco para não aceitar')+'">'
        + (m.key==='kk' ? '<select class="mk-price-unit" id="wtb-pay-sec-kk-unit"><option value="1000">k</option><option value="1000000" selected>kk</option><option value="1000000000">kkk</option></select>' : '')
        + '<button type="button" class="wtb-pay-sec-remove" data-sec-method="'+m.key+'">✕</button>'
        + '</div>'
        + '</div>';
    }).join('');

    // Inicializa secondary com valores convertidos
    ['kk','dd','brl'].forEach(function(k) {
      if (k===primary) return;
      if (_pay.secondary[k]===undefined) _pay.secondary[k] = conv[k];
    });

    _bindSecondaryEvents();
  }

  function _bindSecondaryEvents() {
    Array.prototype.forEach.call(global.document.querySelectorAll('.wtb-pay-sec-remove'), function(btn) {
      btn.addEventListener('click', function() {
        _pay.secondary[btn.getAttribute('data-sec-method')] = null;
        var inp = btn.closest('[data-sec-method]').querySelector('input');
        if (inp) inp.value = '';
        _syncFormPay();
      });
    });
    ['kk','dd','brl'].forEach(function(method) {
      if (method===_pay.primaryMethod) return;
      var inp  = global.document.getElementById('wtb-pay-sec-'+method);
      var unit = method==='kk' ? global.document.getElementById('wtb-pay-sec-kk-unit') : null;
      if (!inp) return;
      function _recalc() {
        var v = parseFloat(inp.value)||0;
        var u = unit ? (parseInt(unit.value,10)||1e6) : 1;
        _pay.secondary[method] = v>0 ? Math.round(v*u) : null;
        _syncFormPay();
      }
      inp.addEventListener('input', _recalc);
      if (unit) unit.addEventListener('change', _recalc);
    });
  }

  // ================================================================
  // UI helpers
  // ================================================================
  function _updatePokePreview(r) {
    var wrap  = global.document.getElementById('wtb-poke-preview-wrap');
    var img   = global.document.getElementById('wtb-poke-sprite');
    var name  = global.document.getElementById('wtb-poke-name');
    var types = global.document.getElementById('wtb-poke-types');
    if (!wrap) return;
    if (img)   { img.src = r.sprite||''; img.style.display = r.sprite ? '' : 'none'; }
    if (name)  name.textContent = r.name||'';
    if (types) types.innerHTML = (r.types||[]).map(function(t){
      return '<span class="mk-type-badge mk-type--'+t.toLowerCase()+'">'+t+'</span>';
    }).join('');
    wrap.style.display = '';
  }
  function _updateStarsUI() {
    Array.prototype.forEach.call(global.document.querySelectorAll('#wtb-stars-input .mk-star-btn'), function(btn) {
      btn.classList.toggle('active', parseInt(btn.getAttribute('data-val'),10) <= _form.stars);
    });
  }
  function _updateBallUI() {
    Array.prototype.forEach.call(global.document.querySelectorAll('#wtb-ball-select .mk-ball-opt'), function(btn) {
      btn.classList.toggle('selected', btn.getAttribute('data-ball')===_form.ball_type);
    });
  }
  function _renderErrors(errs) {
    Object.keys(errs||{}).forEach(function(k) {
      var el = global.document.getElementById('wtb-err-'+k);
      if (el) el.textContent = errs[k];
    });
  }

  // ================================================================
  // Publicar
  // ================================================================
  async function publish() {
    if (_locked) return;
    _locked = true;
    var btn = global.document.getElementById('wtb-submit-btn');
    if (btn) { btn.disabled=true; btn.innerHTML='⏳ Publicando...'; }

    try {
      _syncFormPay();
      if (!_validate()) { _renderErrors(_form.errors); _toast('Corrija os erros antes de publicar.','error'); return; }
      var user = _user();
      if (!user) { _toast('Faça login para criar uma procura.','error'); return; }

      var payload = {
        buyer_id:      user.id,
        listing_type:  _form.listing_type,
        pokemon_name:  (_form.pokemon_name||'').trim() || null,
        pokemon_slug:  _form.pokemon_name ? _toSlug(_form.pokemon_name) : null,
        pokemon_types: _form.pokemon_types || [],
        stars:         _form.stars  || 0,
        boost:         0,
        ball_type:     _form.listing_type==='pokemon' ? (_form.ball_type||null) : null,
        talent_type:   _form.listing_type==='talent'  ? (_form.talent_type||'any') : null,
        talent_slots:  _form.talent_slots || null,
        talent_full:   _form.talent_full  || false,
        pay_kk:        _form.pay_kk  || null,
        pay_dd:        _form.pay_dd  || null,
        pay_brl:       _form.pay_brl || null,
        observations:  (_form.observations||'').trim().slice(0,500) || null,
        status:        'active',
      };

      // pokemon_name é obrigatório para pokémon, mas não para talento
      if (_form.listing_type === 'pokemon') {
        payload.pokemon_name = _form.pokemon_name.trim();
        payload.pokemon_slug = _toSlug(_form.pokemon_name);
      }

      var res = await fetch(SB_URL+'/rest/v1/wtb_listings', {
        method: 'POST',
        headers: { 'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+_jwt(),'Prefer':'return=representation' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      var data = await res.json().catch(function(){ return {}; });
      var newListing = Array.isArray(data) ? data[0] : data;

      if (newListing && global.WTB) {
        var already = (global.WTB.state.listings||[]).some(function(l){ return l.id===newListing.id; });
        if (!already) { global.WTB.state.listings = [newListing].concat(global.WTB.state.listings||[]); global.WTB.render(); }
      }
      _toast('✅ Procura publicada com sucesso!','success');
      close();
    } catch(err) {
      console.warn('[WTBCreate] publish error:', err.message);
      _toast('Erro ao publicar. Tente novamente.','error');
    } finally {
      _locked = false;
      if (btn) { btn.disabled=false; btn.innerHTML='Publicar Procura'; }
    }
  }

  // ================================================================
  // Cancelar listing
  // ================================================================
  async function cancel(listingId) {
    if (!listingId) return;
    var confirmed = typeof confirmAction === 'function'
      ? await confirmAction('Cancelar procura','Remover esta procura permanentemente?',{type:'danger',confirmText:'Remover',cancelText:'Cancelar'})
      : global.confirm('Remover esta procura?');
    if (!confirmed) return;

    try {
      var jwt = _jwt();
      if (!jwt) { _toast('Faça login.','error'); return; }
      var res = await fetch(SB_URL+'/rest/v1/wtb_listings?id=eq.'+listingId, {
        method:'PATCH',
        headers:{'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+jwt,'Prefer':'return=minimal'},
        body: JSON.stringify({ status:'deleted' }),
      });
      if (!res.ok) throw new Error(await res.text());

      if (global.WTB) {
        global.WTB.state.listings = (global.WTB.state.listings||[]).filter(function(l){ return l.id!==listingId; });
        global.WTB.render();
      }
      var cardEl = global.document.querySelector('[data-wtb-id="'+listingId+'"]');
      if (cardEl) {
        cardEl.style.transition = 'opacity .25s, transform .25s';
        cardEl.style.opacity = '0'; cardEl.style.transform = 'scale(0.95)';
        setTimeout(function(){ if (cardEl.parentNode) cardEl.remove(); }, 260);
      }
      _toast('Procura removida.','info');
    } catch(err) {
      console.warn('[WTBCreate] cancel error:', err.message);
      _toast('Erro ao remover. Tente novamente.','error');
    }
  }

  // ================================================================
  // open / close
  // ================================================================
  function open() {
    var user = _user();
    if (!user) {
      _toast('Faça login para criar uma procura.','info');
      if (typeof AuthModal !== 'undefined' && AuthModal.open) AuthModal.open('login');
      return;
    }
    _showChooser();
  }

  function close() {
    if (_modalEl) { _modalEl.innerHTML=''; _modalEl.style.display='none'; }
  }

  global.WTBCreate = { open:open, close:close, publish:publish, cancel:cancel, _showChooser:_showChooser };
  console.log('[WTB] wtb-create.js carregado');
}(window));
