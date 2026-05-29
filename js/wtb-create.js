// ============================================================
// wtb-create.js — Formulário de Procura (Pokémon + Talento)
//
// Fluxo Pokémon:
//   Chooser → form pokémon → pagamento
//
// Fluxo Talento:
//   Chooser → browser de pacotes → customizador de itens + pagamento
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
  function _toSlug(n) { return String(n||'').toLowerCase().replace(/['']/g,'').replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,''); }
  function _hdrs()  { return { 'apikey': SB_KEY, 'Authorization': 'Bearer '+(_jwt()||SB_KEY) }; }

  // ── Identificação de grupo de pacote por nome ─────────────────
  function _pkgGroup(name) {
    if (/^talent\s/i.test(name))  return 'talent';
    if (/^gym\s/i.test(name))     return 'gym';
    if (/^reduces\s/i.test(name)) return 'reduces';
    return 'other';
  }

  var PKG_GROUP_META = {
    talent:  { label:'Talents', icon:'⚡', color:'#a78bfa', bg:'rgba(167,139,250,0.10)' },
    gym:     { label:'Gym',     icon:'🏟️', color:'#34d399', bg:'rgba(52,211,153,0.10)'  },
    reduces: { label:'Reduces', icon:'🔻', color:'#fb7185', bg:'rgba(251,113,133,0.10)' },
    other:   { label:'Outros',  icon:'📦', color:'#94a3b8', bg:'rgba(148,163,184,0.10)' },
  };

  var BALL_META = {
    ultra:    { label:'Ultra Ball',    color:'#f5c518', border:'#f5c518', glow:'rgba(245,197,24,0.40)',  accent:'#111' },
    premier:  { label:'Premier Ball',  color:'#e8e8e8', border:'#cfd3dc', glow:'rgba(232,232,232,0.30)', accent:'#666' },
    alliance: { label:'Alliance Ball', color:'#b67fff', border:'#7c6aff', glow:'rgba(124,106,255,0.45)', accent:'#ff4fa0' },
  };
  var BALL_ORDER = ['ultra','premier','alliance'];

  function _ballIconSvg(color, accent) {
    return '<svg width="26" height="26" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="17" fill="#15161f" stroke="'+color+'" stroke-width="2"/><path d="M3 20 Q20 13 37 20" stroke="'+color+'" stroke-width="2.5" fill="none"/><path d="M3 20 Q20 27 37 20" stroke="'+accent+'" stroke-width="2.5" fill="none"/><circle cx="20" cy="20" r="4.5" fill="#15161f" stroke="'+color+'" stroke-width="2"/><circle cx="20" cy="20" r="2" fill="'+color+'"/></svg>';
  }

  // ── Conversão de moedas ───────────────────────────────────────
  function _kkRawToBrl(raw) { var r=typeof KK_TO_BRL!=='undefined'?KK_TO_BRL:null; return (raw&&r)?(raw/1e6)*r:null; }
  function _brlToKkRaw(brl) { var r=typeof KK_TO_BRL!=='undefined'?KK_TO_BRL:null; return (brl&&r)?Math.round((brl/r)*1e6):null; }
  function _brlToDd(brl)    { if(!brl)return null; if(typeof brlToDd==='function')return brlToDd(brl); var r=typeof DD_TO_BRL!=='undefined'?DD_TO_BRL:null; return r?Math.round(brl/r):null; }
  function _ddToBrl(dd)     { var r=typeof DD_TO_BRL!=='undefined'?DD_TO_BRL:null; return (dd&&r)?dd*r:null; }
  function _fmtKk(raw)      { if(!raw)return ''; if(raw>=1e9)return parseFloat((raw/1e9).toFixed(1))+'kkk'; if(raw>=1e6)return parseFloat((raw/1e6).toFixed(1))+'kk'; return parseFloat((raw/1e3).toFixed(1))+'k'; }

  function _convertOthers(method, rawVal, kkUnit) {
    var r={kk:null,dd:null,brl:null};
    if (!rawVal||rawVal<=0) return r;
    if (method==='kk')  { var kk=Math.round(rawVal*(kkUnit||1e6)); var brl=_kkRawToBrl(kk); r.kk=kk; r.brl=brl?Math.round(brl*100)/100:null; r.dd=_brlToDd(brl); }
    if (method==='brl') { r.brl=Math.round(rawVal*100)/100; r.kk=_brlToKkRaw(rawVal); r.dd=_brlToDd(rawVal); }
    if (method==='dd')  { var brl2=_ddToBrl(rawVal); r.dd=Math.round(rawVal); r.brl=brl2?Math.round(brl2*100)/100:null; r.kk=_brlToKkRaw(brl2); }
    return r;
  }

  // ── Estado global ─────────────────────────────────────────────
  var _form        = {};
  var _pay         = {};
  var _modalEl     = null;
  var _locked      = false;
  var _pkgCache    = null;
  var _selectedPkg = null;

  function _resetForm(type) {
    _form = {
      listing_type: type||'pokemon',
      pokemon_name:'', pokemon_slug:'', pokemon_types:[], stars:0, ball_type:null,
      catalog_package_id:null, package_name:null, slots_data:null,
      pay_kk:null, pay_dd:null, pay_brl:null,
      observations:'', errors:{},
    };
    _pay = { primaryMethod:null, primaryRawVal:0, kkUnit:1e6, showingSecondary:false, secondary:{} };
    _selectedPkg = null;
  }

  function _syncFormPay() {
    _form.pay_kk=_form.pay_dd=_form.pay_brl=null;
    var m=_pay.primaryMethod;
    if (!m) return;
    var conv=_convertOthers(m,_pay.primaryRawVal,_pay.kkUnit);
    if (m==='kk')  _form.pay_kk  = conv.kk;
    if (m==='dd')  _form.pay_dd  = _pay.primaryRawVal>0?Math.round(_pay.primaryRawVal):null;
    if (m==='brl') _form.pay_brl = _pay.primaryRawVal>0?Math.round(_pay.primaryRawVal*100)/100:null;
    if (_pay.showingSecondary) {
      if (m!=='kk'  && _pay.secondary.kk !=null) _form.pay_kk  = _pay.secondary.kk;
      if (m!=='dd'  && _pay.secondary.dd !=null) _form.pay_dd  = _pay.secondary.dd;
      if (m!=='brl' && _pay.secondary.brl!=null) _form.pay_brl = _pay.secondary.brl;
    }
  }

  function _validate() {
    var errs={};
    if (_form.listing_type==='pokemon') {
      if (!_form.pokemon_name||!_form.pokemon_name.trim()) errs.pokemon_name='Selecione ou digite o nome do Pokémon.';
    }
    if (_form.listing_type==='talent') {
      if (!_form.catalog_package_id) errs.package='Selecione um pacote de talento.';
      if (_form.slots_data) {
        var anyNeeded = _form.slots_data.some(function(s){ return s.items.some(function(i){ return i.qty>0; }); });
        if (!anyNeeded) errs.package='Você precisa de pelo menos 1 item.';
      }
    }
    if (!_form.pay_kk&&!_form.pay_dd&&!_form.pay_brl) errs.payment='Informe pelo menos um valor de pagamento.';
    if (_form.observations&&_form.observations.length>500) errs.observations='Máx 500 caracteres.';
    _form.errors=errs;
    return Object.keys(errs).length===0;
  }

  // ================================================================
  // SHARED — Seção de pagamento
  // ================================================================
  function _buildPaymentHtml() {
    return '<div class="mk-section">'
      +'<div class="mk-section-title"><span class="mk-section-dot"></span>Quanto você vai pagar</div>'
      +'<div id="wtb-pay-step1">'
      +'<p class="wtb-pay-step-hint">Escolha a forma de pagamento principal:</p>'
      +'<div class="wtb-pay-method-btns">'
      +'<button type="button" class="wtb-pay-method-btn" data-method="kk"><span class="wtb-pay-method-icon">◈</span><span>KK</span></button>'
      +'<button type="button" class="wtb-pay-method-btn" data-method="dd"><span class="wtb-pay-method-icon">💎</span><span>DD</span></button>'
      +'<button type="button" class="wtb-pay-method-btn" data-method="brl"><span class="wtb-pay-method-icon">💵</span><span>Real (R$)</span></button>'
      +'</div></div>'
      +'<div id="wtb-pay-step2" style="display:none">'
      +'<div class="mk-field" style="margin-top:10px">'
      +'<label class="mk-label" id="wtb-pay-primary-label">Valor</label>'
      +'<div class="mk-price-row">'
      +'<input class="mk-input mk-price-input" id="wtb-pay-primary-val" type="number" min="0" step="any" placeholder="0">'
      +'<select class="mk-price-unit" id="wtb-pay-kk-unit" style="display:none">'
      +'<option value="1000">k</option><option value="1000000" selected>kk</option><option value="1000000000">kkk</option>'
      +'</select>'
      +'</div>'
      +'<span class="mk-field-error" id="wtb-err-payment"></span>'
      +'</div></div>'
      +'<div id="wtb-pay-step3" style="display:none">'
      +'<button type="button" class="wtb-pay-add-more-btn" id="wtb-pay-add-more-btn">+ Aceitar em outras formas de pagamento também?</button>'
      +'</div>'
      +'<div id="wtb-pay-step4" style="display:none"></div>'
      +'</div>';
  }

  function _bindPaymentEvents() {
    Array.prototype.forEach.call(global.document.querySelectorAll('.wtb-pay-method-btn'), function(btn) {
      btn.addEventListener('click', function() {
        var method=btn.getAttribute('data-method');
        _pay.primaryMethod=method; _pay.primaryRawVal=0; _pay.secondary={}; _pay.showingSecondary=false;
        _syncFormPay();
        Array.prototype.forEach.call(global.document.querySelectorAll('.wtb-pay-method-btn'), function(b){ b.classList.toggle('selected',b===btn); });
        var step2=global.document.getElementById('wtb-pay-step2');
        var label=global.document.getElementById('wtb-pay-primary-label');
        var unit =global.document.getElementById('wtb-pay-kk-unit');
        var inp  =global.document.getElementById('wtb-pay-primary-val');
        if (step2) step2.style.display='';
        if (label) label.textContent=method==='kk'?'Valor em KK':method==='dd'?'Valor em DD':'Valor em Real (R$)';
        if (unit)  unit.style.display=method==='kk'?'':'none';
        if (inp)   { inp.value=''; inp.focus(); }
        var s3=global.document.getElementById('wtb-pay-step3');
        var s4=global.document.getElementById('wtb-pay-step4');
        if (s3) s3.style.display='none';
        if (s4) { s4.style.display='none'; s4.innerHTML=''; }
      });
    });

    var pInp=global.document.getElementById('wtb-pay-primary-val');
    var kkU =global.document.getElementById('wtb-pay-kk-unit');
    function _onPrimary() {
      var v=parseFloat(pInp?pInp.value:0)||0;
      var u=kkU?(parseInt(kkU.value,10)||1e6):1;
      _pay.primaryRawVal=v; _pay.kkUnit=u; _pay.secondary={}; _pay.showingSecondary=false;
      _syncFormPay();
      var s3=global.document.getElementById('wtb-pay-step3');
      var s4=global.document.getElementById('wtb-pay-step4');
      if (s3) s3.style.display=v>0?'':'none';
      if (s4) { s4.style.display='none'; s4.innerHTML=''; }
    }
    if (pInp) pInp.addEventListener('input',_onPrimary);
    if (kkU)  kkU.addEventListener('change',_onPrimary);

    var addBtn=global.document.getElementById('wtb-pay-add-more-btn');
    if (addBtn) addBtn.addEventListener('click', function() {
      _pay.showingSecondary=true;
      var s4=global.document.getElementById('wtb-pay-step4');
      if (s4) { s4.style.display=''; _buildSecondarySection(s4); }
      var s3=global.document.getElementById('wtb-pay-step3');
      if (s3) s3.style.display='none';
      _syncFormPay();
    });
  }

  function _buildSecondarySection(container) {
    var primary=_pay.primaryMethod;
    var conv=_convertOthers(primary,_pay.primaryRawVal,_pay.kkUnit);
    var methods=[
      {key:'kk', icon:'◈', label:'KK',       color:'#fbbf24', fmt:function(v){return v?_fmtKk(v):null;},          unitId:'wtb-pay-sec-kk-unit'},
      {key:'dd', icon:'💎',label:'DD',        color:'#a78bfa', fmt:function(v){return v?Math.round(v).toLocaleString('pt-BR')+' DD':null;}, unitId:null},
      {key:'brl',icon:'💵',label:'Real (R$)', color:'#34d399', fmt:function(v){return v?'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):null;}, unitId:null},
    ];
    ['kk','dd','brl'].forEach(function(k){ if(k!==primary&&_pay.secondary[k]===undefined) _pay.secondary[k]=conv[k]; });
    container.innerHTML=methods.filter(function(m){return m.key!==primary;}).map(function(m){
      var val=conv[m.key]; var disp=m.fmt(val);
      var dv=val!=null?(m.key==='kk'?val/1e6:val):'';
      return '<div class="wtb-pay-secondary-row" data-sec-method="'+m.key+'">'
        +'<div class="wtb-pay-secondary-label"><span class="wtb-pay-method-icon">'+m.icon+'</span>'
        +'<span style="color:'+m.color+';font-weight:600">'+m.label+'</span>'
        +(disp?'<span class="wtb-pay-secondary-converted">'+_esc(disp)+'</span>':'')+'</div>'
        +'<div class="wtb-pay-secondary-input-row">'
        +'<input class="mk-input" type="number" min="0" step="any" id="wtb-pay-sec-'+m.key+'" value="'+_esc(String(dv))+'" placeholder="'+(disp?'Valor convertido (editável)':'Deixe em branco para não aceitar')+'">'
        +(m.key==='kk'?'<select class="mk-price-unit" id="wtb-pay-sec-kk-unit"><option value="1000">k</option><option value="1000000" selected>kk</option><option value="1000000000">kkk</option></select>':'')
        +'<button type="button" class="wtb-pay-sec-remove" data-sec-method="'+m.key+'">✕</button>'
        +'</div></div>';
    }).join('');
    _bindSecondaryEvents();
  }

  function _bindSecondaryEvents() {
    Array.prototype.forEach.call(global.document.querySelectorAll('.wtb-pay-sec-remove'), function(btn) {
      btn.addEventListener('click', function() {
        _pay.secondary[btn.getAttribute('data-sec-method')]=null;
        var inp=btn.closest('[data-sec-method]').querySelector('input');
        if (inp) inp.value='';
        _syncFormPay();
      });
    });
    ['kk','dd','brl'].forEach(function(method) {
      if (method===_pay.primaryMethod) return;
      var inp=global.document.getElementById('wtb-pay-sec-'+method);
      var unit=method==='kk'?global.document.getElementById('wtb-pay-sec-kk-unit'):null;
      if (!inp) return;
      function _r(){ var v=parseFloat(inp.value)||0; var u=unit?(parseInt(unit.value,10)||1e6):1; _pay.secondary[method]=v>0?Math.round(v*u):null; _syncFormPay(); }
      inp.addEventListener('input',_r);
      if (unit) unit.addEventListener('change',_r);
    });
  }

  // ================================================================
  // CHOOSER — Tipo (Pokémon / Talento)
  // ================================================================
  function _buildTypeChooserHtml() {
    return '<div class="mk-modal-backdrop" id="wtb-create-backdrop">'
      +'<div class="mk-modal" id="wtb-create-modal" role="dialog" aria-modal="true">'
      +'<div class="mk-modal-header"><span class="mk-modal-title">🔍 Nova Procura</span>'
      +'<button class="mk-modal-close" onclick="WTBCreate.close()">✕</button></div>'
      +'<div class="mk-modal-body">'
      +'<p class="wtb-chooser-hint">O que você está procurando?</p>'
      +'<div class="wtb-type-chooser">'
      +'<button class="wtb-type-card" id="wtb-type-card-pokemon">'
      +'<span class="wtb-type-card-icon">🎴</span>'
      +'<span class="wtb-type-card-title">Pokémon</span>'
      +'<span class="wtb-type-card-desc">Procuro um Pokémon específico para comprar</span>'
      +'</button>'
      +'<button class="wtb-type-card" id="wtb-type-card-talent">'
      +'<span class="wtb-type-card-icon">🎯</span>'
      +'<span class="wtb-type-card-title">Talento</span>'
      +'<span class="wtb-type-card-desc">Procuro um pacote de talentos (Talent, Gym, Reduces...)</span>'
      +'</button>'
      +'</div>'
      +'</div></div></div>';
  }

  function _showChooser() {
    _ensureModal();
    _modalEl.innerHTML=_buildTypeChooserHtml();
    var pb=global.document.getElementById('wtb-type-card-pokemon');
    var tb=global.document.getElementById('wtb-type-card-talent');
    if (pb) pb.addEventListener('click',function(){ _resetForm('pokemon'); _showPokemonForm(); });
    if (tb) tb.addEventListener('click',function(){ _resetForm('talent'); _showTalentBrowser(); });
  }

  // ================================================================
  // POKÉMON FORM
  // ================================================================
  function _buildPokemonFormHtml() {
    return '<div class="mk-modal-backdrop" id="wtb-create-backdrop">'
      +'<div class="mk-modal" id="wtb-create-modal" role="dialog" aria-modal="true">'
      +'<div class="mk-modal-header">'
      +'<button class="wtb-back-btn" onclick="WTBCreate._showChooser()">←</button>'
      +'<span class="mk-modal-title">🎴 Procura de Pokémon</span>'
      +'<button class="mk-modal-close" onclick="WTBCreate.close()">✕</button>'
      +'</div>'
      +'<div class="mk-modal-body">'
      +'<div class="mk-section">'
      +'<div class="mk-section-title"><span class="mk-section-dot"></span>Pokémon que você procura</div>'
      +'<div class="mk-field"><label class="mk-label" for="wtb-poke-input">Nome</label>'
      +'<div class="mk-autocomplete"><input class="mk-input" id="wtb-poke-input" type="text" placeholder="Ex: Shiny Charizard" autocomplete="off">'
      +'<div class="mk-dropdown" id="wtb-poke-dropdown" style="display:none"></div></div>'
      +'<span class="mk-field-error" id="wtb-err-pokemon_name"></span></div>'
      +'<div id="wtb-poke-preview-wrap" style="display:none"><div class="mk-poke-preview">'
      +'<img class="mk-poke-preview-sprite" id="wtb-poke-sprite" src="" alt="" onerror="this.style.display=\'none\'">'
      +'<div class="mk-poke-preview-info"><span class="mk-poke-preview-name" id="wtb-poke-name"></span>'
      +'<div class="mk-types" id="wtb-poke-types"></div></div></div></div>'
      +'<div class="mk-field" style="margin-top:10px"><label class="mk-label">Mínimo de Stars <small>(opcional)</small></label>'
      +'<div class="mk-stars-input" id="wtb-stars-input">'
      +[1,2,3,4,5].map(function(i){ return '<button type="button" class="mk-star-btn" data-val="'+i+'">★</button>'; }).join('')
      +'</div></div></div>'
      +'<div class="mk-section">'
      +'<div class="mk-section-title"><span class="mk-section-dot"></span>Pokébola <small class="mk-section-hint">opcional — sem seleção = aceita qualquer uma</small></div>'
      +'<div class="mk-ball-select" id="wtb-ball-select">'
      +BALL_ORDER.map(function(t){ var m=BALL_META[t]; return '<button type="button" class="mk-ball-opt" data-ball="'+t+'" style="--ball:'+m.border+';--ball-glow:'+m.glow+';--ball-color:'+m.color+'"><span class="mk-ball-opt-ico">'+_ballIconSvg(m.color,m.accent)+'</span><span class="mk-ball-opt-label">'+_esc(m.label)+'</span><span class="mk-ball-opt-check">✓</span></button>'; }).join('')
      +'</div></div>'
      +_buildPaymentHtml()
      +'<div class="mk-section"><div class="mk-field"><label class="mk-label" for="wtb-obs">Observações <small>(opcional, máx 500)</small></label>'
      +'<textarea class="mk-textarea" id="wtb-obs" maxlength="500" placeholder="Detalhes sobre o que você procura..."></textarea>'
      +'</div></div>'
      +'<div class="mk-modal-footer">'
      +'<button class="mk-btn mk-btn--ghost" onclick="WTBCreate.close()">Cancelar</button>'
      +'<button class="mk-btn mk-btn--primary" id="wtb-submit-btn" onclick="WTBCreate.publish()">Publicar Procura</button>'
      +'</div></div></div></div>';
  }

  function _showPokemonForm() {
    _ensureModal();
    _modalEl.innerHTML=_buildPokemonFormHtml();
    _bindPokemonEvents();
    _bindPaymentEvents();
  }

  function _bindPokemonEvents() {
    var inp=global.document.getElementById('wtb-poke-input');
    var drop=global.document.getElementById('wtb-poke-dropdown');
    if (inp&&drop&&typeof PokemonSelector!=='undefined') {
      PokemonSelector.mount(inp,drop,function(r){ _form.pokemon_name=r.name; _form.pokemon_slug=r.slug; _form.pokemon_types=r.types||[]; _updatePokePreview(r); });
    }
    Array.prototype.forEach.call(global.document.querySelectorAll('#wtb-stars-input .mk-star-btn'), function(btn) {
      btn.addEventListener('click', function(){ var v=parseInt(btn.getAttribute('data-val'),10); _form.stars=(_form.stars===v)?0:v; _updateStarsUI(); });
    });
    Array.prototype.forEach.call(global.document.querySelectorAll('#wtb-ball-select .mk-ball-opt'), function(btn) {
      btn.addEventListener('click', function(){ var b=btn.getAttribute('data-ball'); _form.ball_type=(_form.ball_type===b)?null:b; _updateBallUI(); });
    });
    var obs=global.document.getElementById('wtb-obs');
    if (obs) obs.addEventListener('input', function(){ _form.observations=obs.value; });
  }

  // ================================================================
  // TALENTO — Browser de pacotes
  // ================================================================
  async function _fetchPackages() {
    if (_pkgCache) return _pkgCache;
    var url=SB_URL+'/rest/v1/catalog_packages'
      +'?select=id,name,icon_url,catalog_package_slots(id,slot_index,catalog_package_slot_items(id,item_name,quantity,is_default,sort_order))'
      +'&is_active=eq.true&order=name';
    var res=await fetch(url,{headers:_hdrs()});
    var data=await res.json().catch(function(){return[];});
    _pkgCache=Array.isArray(data)?data:[];
    return _pkgCache;
  }

  function _buildBrowserHtml() {
    return '<div class="mk-modal-backdrop" id="wtb-create-backdrop">'
      +'<div class="mk-modal wtb-pkg-modal" id="wtb-create-modal" role="dialog" aria-modal="true">'
      +'<div class="mk-modal-header">'
      +'<button class="wtb-back-btn" onclick="WTBCreate._showChooser()">←</button>'
      +'<span class="mk-modal-title">🎯 Qual talento você procura?</span>'
      +'<button class="mk-modal-close" onclick="WTBCreate.close()">✕</button>'
      +'</div>'
      +'<div class="mk-modal-body">'
      +'<input class="mk-input wtb-pkg-search" id="wtb-pkg-search" type="text" placeholder="🔎  Buscar pacote...">'
      +'<div id="wtb-pkg-list"><div class="wtb-pkg-loading">⏳ Carregando pacotes...</div></div>'
      +'</div></div></div>';
  }

  async function _showTalentBrowser() {
    _ensureModal();
    _modalEl.innerHTML=_buildBrowserHtml();
    var searchEl=global.document.getElementById('wtb-pkg-search');
    if (searchEl) searchEl.addEventListener('input', function(){ _renderPkgList(_pkgCache||[],searchEl.value.toLowerCase()); });
    try {
      var pkgs=await _fetchPackages();
      _renderPkgList(pkgs,'');
    } catch(e) {
      var list=global.document.getElementById('wtb-pkg-list');
      if (list) list.innerHTML='<div class="wtb-pkg-loading">Erro ao carregar. Tente novamente.</div>';
    }
  }

  function _renderPkgList(packages, filter) {
    var container=global.document.getElementById('wtb-pkg-list');
    if (!container) return;
    var filtered=filter?packages.filter(function(p){return p.name.toLowerCase().includes(filter);}):packages;
    var groups={talent:[],gym:[],reduces:[],other:[]};
    filtered.forEach(function(p){ groups[_pkgGroup(p.name)].push(p); });

    var html='';
    ['talent','gym','reduces','other'].forEach(function(g) {
      if (!groups[g].length) return;
      var meta=PKG_GROUP_META[g];
      html+='<div class="wtb-pkg-group">'
        +'<div class="wtb-pkg-group-hdr" style="color:'+meta.color+'">'+meta.icon+' '+meta.label+'</div>'
        +'<div class="wtb-pkg-grid">'
        +groups[g].map(function(p){
          var slots=(p.catalog_package_slots||[]).length;
          var items=(p.catalog_package_slots||[]).reduce(function(acc,s){return acc+(s.catalog_package_slot_items||[]).filter(function(i){return i.is_default;}).length;},0);
          return '<button class="wtb-pkg-card" data-pkg-id="'+_esc(p.id)+'">'
            +'<span class="wtb-pkg-card-icon" style="color:'+meta.color+'">'+meta.icon+'</span>'
            +'<span class="wtb-pkg-card-name">'+_esc(p.name)+'</span>'
            +'<span class="wtb-pkg-card-info">'+slots+' slots · '+items+' itens</span>'
            +'</button>';
        }).join('')
        +'</div></div>';
    });

    if (!html) html='<div class="wtb-pkg-loading">Nenhum pacote encontrado.</div>';
    container.innerHTML=html;

    Array.prototype.forEach.call(container.querySelectorAll('.wtb-pkg-card'), function(btn) {
      btn.addEventListener('click', function() {
        var id=btn.getAttribute('data-pkg-id');
        var pkg=(_pkgCache||[]).find(function(p){return p.id===id;});
        if (pkg) _showTalentCustomizer(pkg);
      });
    });
  }

  // ================================================================
  // TALENTO — Customizador de itens + Pagamento
  // ================================================================
  function _sortedSlots(pkg) {
    return (pkg.catalog_package_slots||[]).slice().sort(function(a,b){return a.slot_index-b.slot_index;});
  }
  function _slotItems(slot) {
    return (slot.catalog_package_slot_items||[]).filter(function(i){return i.is_default;}).sort(function(a,b){return (a.sort_order||0)-(b.sort_order||0);});
  }

  function _buildCustomizerHtml(pkg) {
    var group=_pkgGroup(pkg.name);
    var meta=PKG_GROUP_META[group];
    var slots=_sortedSlots(pkg);
    var totalItems=slots.reduce(function(acc,s){return acc+_slotItems(s).length;},0);

    var slotsHtml=slots.map(function(slot) {
      var items=_slotItems(slot);
      return '<div class="wtb-cst-slot">'
        +'<div class="wtb-cst-slot-hdr">'
        +'<span class="wtb-cst-slot-num" style="color:'+meta.color+'">Slot '+(slot.slot_index+1)+'</span>'
        +'<span class="wtb-cst-slot-count">'+items.length+' '+(items.length===1?'item':'itens')+'</span>'
        +'</div>'
        +'<div class="wtb-cst-items">'
        +items.map(function(item) {
          return '<div class="wtb-cst-item" data-item-id="'+_esc(item.id)+'" data-qty-max="'+item.quantity+'">'
            +'<span class="wtb-cst-item-name">'+_esc(item.item_name)+'</span>'
            +'<div class="wtb-cst-qty-wrap">'
            +'<button type="button" class="wtb-cst-qty-btn" data-dir="-1">−</button>'
            +'<div class="wtb-cst-qty-display">'
            +'<input type="number" class="wtb-cst-qty-inp" value="'+item.quantity+'" min="0" max="'+item.quantity+'">'
            +'<span class="wtb-cst-qty-sep">/</span>'
            +'<span class="wtb-cst-qty-max">'+item.quantity+'</span>'
            +'</div>'
            +'<button type="button" class="wtb-cst-qty-btn" data-dir="1">+</button>'
            +'</div>'
            +'<span class="wtb-cst-have-tag">✓ Já tenho</span>'
            +'</div>';
        }).join('')
        +'</div></div>';
    }).join('');

    return '<div class="mk-modal-backdrop" id="wtb-create-backdrop">'
      +'<div class="mk-modal wtb-cst-modal" id="wtb-create-modal" role="dialog" aria-modal="true">'
      +'<div class="mk-modal-header">'
      +'<button class="wtb-back-btn" onclick="WTBCreate._talentBack()">←</button>'
      +'<div class="wtb-cst-modal-title-wrap">'
      +'<span class="wtb-cst-type-badge" style="color:'+meta.color+';background:'+meta.bg+';border-color:'+meta.color+'44">'+meta.icon+' '+meta.label+'</span>'
      +'<span class="mk-modal-title" style="font-size:.95rem">'+_esc(pkg.name)+'</span>'
      +'</div>'
      +'<button class="mk-modal-close" onclick="WTBCreate.close()">✕</button>'
      +'</div>'
      +'<div class="mk-modal-body">'

      +'<div class="wtb-cst-summary-bar">'
      +'<span>'+slots.length+' slots</span>'
      +'<span class="wtb-cst-summary-dot">·</span>'
      +'<span id="wtb-cst-total-label">'+totalItems+' itens no total</span>'
      +'<span class="wtb-cst-summary-hint">— reduza a qty dos itens que já tem</span>'
      +'</div>'

      +'<div class="wtb-cst-slots" id="wtb-cst-slots">'+slotsHtml+'</div>'

      +_buildPaymentHtml()

      +'<div class="mk-section"><div class="mk-field">'
      +'<label class="mk-label" for="wtb-obs">Observações <small>(opcional, máx 500)</small></label>'
      +'<textarea class="mk-textarea" id="wtb-obs" maxlength="500" placeholder="Informações adicionais sobre o talento que procura..."></textarea>'
      +'</div></div>'

      +'<div class="mk-modal-footer">'
      +'<button class="mk-btn mk-btn--ghost" onclick="WTBCreate.close()">Cancelar</button>'
      +'<button class="mk-btn mk-btn--primary" id="wtb-submit-btn" onclick="WTBCreate.publish()">Publicar Procura</button>'
      +'</div></div></div></div>';
  }

  function _showTalentCustomizer(pkg) {
    _selectedPkg=pkg;
    _form.listing_type='talent';
    _form.catalog_package_id=pkg.id;
    _form.package_name=pkg.name;
    _ensureModal();
    _modalEl.innerHTML=_buildCustomizerHtml(pkg);
    _bindCustomizerEvents(pkg);
    _bindPaymentEvents();
  }

  function _bindCustomizerEvents(pkg) {
    // Qty +/- por item
    Array.prototype.forEach.call(global.document.querySelectorAll('.wtb-cst-item'), function(row) {
      var inp=row.querySelector('.wtb-cst-qty-inp');
      var max=parseInt(row.getAttribute('data-qty-max'),10)||0;

      function _clamp(v){ return Math.min(max,Math.max(0,parseInt(v,10)||0)); }
      function _update() {
        var v=_clamp(inp.value);
        inp.value=v;
        row.classList.toggle('wtb-cst-item--have',v===0);
        _refreshTotalLabel(pkg);
      }

      Array.prototype.forEach.call(row.querySelectorAll('.wtb-cst-qty-btn'), function(btn) {
        btn.addEventListener('click', function(){
          inp.value=_clamp((parseInt(inp.value,10)||0)+parseInt(btn.getAttribute('data-dir'),10));
          _update();
        });
      });
      if (inp) inp.addEventListener('input',_update);
    });

    var obs=global.document.getElementById('wtb-obs');
    if (obs) obs.addEventListener('input', function(){ _form.observations=obs.value; });
  }

  function _refreshTotalLabel(pkg) {
    var lbl=global.document.getElementById('wtb-cst-total-label');
    if (!lbl) return;
    var total=0;
    Array.prototype.forEach.call(global.document.querySelectorAll('.wtb-cst-qty-inp'), function(inp){
      total+=parseInt(inp.value,10)||0;
    });
    lbl.textContent=total+' itens no total';
  }

  function _buildSlotsSnapshot(pkg) {
    var slots=_sortedSlots(pkg);
    return slots.map(function(slot) {
      var items=_slotItems(slot);
      return {
        slot_index: slot.slot_index,
        items: items.map(function(item) {
          var inp=global.document.querySelector('[data-item-id="'+item.id+'"] .wtb-cst-qty-inp');
          var qty=inp?(parseInt(inp.value,10)||0):item.quantity;
          return { id:item.id, name:item.item_name, qty_original:item.quantity, qty:qty };
        }),
      };
    });
  }

  // ── Navegação interna ─────────────────────────────────────────
  function _talentBack() { _showTalentBrowser(); }

  // ================================================================
  // UI helpers
  // ================================================================
  function _updatePokePreview(r) {
    var wrap=global.document.getElementById('wtb-poke-preview-wrap');
    var img=global.document.getElementById('wtb-poke-sprite');
    var name=global.document.getElementById('wtb-poke-name');
    var types=global.document.getElementById('wtb-poke-types');
    if (!wrap) return;
    if (img)   { img.src=r.sprite||''; img.style.display=r.sprite?'':'none'; }
    if (name)  name.textContent=r.name||'';
    if (types) types.innerHTML=(r.types||[]).map(function(t){ return '<span class="mk-type-badge mk-type--'+t.toLowerCase()+'">'+t+'</span>'; }).join('');
    wrap.style.display='';
  }
  function _updateStarsUI() {
    Array.prototype.forEach.call(global.document.querySelectorAll('#wtb-stars-input .mk-star-btn'), function(btn){
      btn.classList.toggle('active',parseInt(btn.getAttribute('data-val'),10)<=_form.stars);
    });
  }
  function _updateBallUI() {
    Array.prototype.forEach.call(global.document.querySelectorAll('#wtb-ball-select .mk-ball-opt'), function(btn){
      btn.classList.toggle('selected',btn.getAttribute('data-ball')===_form.ball_type);
    });
  }
  function _renderErrors(errs) {
    Object.keys(errs||{}).forEach(function(k){
      var el=global.document.getElementById('wtb-err-'+k);
      if (el) el.textContent=errs[k];
    });
  }
  function _ensureModal() {
    if (!_modalEl){ _modalEl=global.document.createElement('div'); global.document.body.appendChild(_modalEl); }
    _modalEl.style.display='';
  }

  // ================================================================
  // Publicar
  // ================================================================
  async function publish() {
    if (_locked) return;
    _locked=true;
    var btn=global.document.getElementById('wtb-submit-btn');
    if (btn){ btn.disabled=true; btn.innerHTML='⏳ Publicando...'; }

    try {
      _syncFormPay();
      // Snapshot dos itens antes de validar
      if (_form.listing_type==='talent'&&_selectedPkg) _form.slots_data=_buildSlotsSnapshot(_selectedPkg);

      if (!_validate()){ _renderErrors(_form.errors); _toast('Corrija os erros antes de publicar.','error'); return; }
      var user=_user();
      if (!user){ _toast('Faça login para criar uma procura.','error'); return; }

      var payload={
        buyer_id:           user.id,
        listing_type:       _form.listing_type,
        pokemon_name:       (_form.pokemon_name||'').trim()||null,
        pokemon_slug:       _form.pokemon_name?_toSlug(_form.pokemon_name):null,
        pokemon_types:      _form.pokemon_types||[],
        stars:              _form.stars||0,
        boost:              0,
        ball_type:          _form.listing_type==='pokemon'?(_form.ball_type||null):null,
        catalog_package_id: _form.catalog_package_id||null,
        package_name:       _form.package_name||null,
        slots_data:         _form.slots_data||null,
        pay_kk:             _form.pay_kk||null,
        pay_dd:             _form.pay_dd||null,
        pay_brl:            _form.pay_brl||null,
        observations:       (_form.observations||'').trim().slice(0,500)||null,
        status:             'active',
      };

      var res=await fetch(SB_URL+'/rest/v1/wtb_listings',{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+_jwt(),'Prefer':'return=representation'},
        body:JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      var data=await res.json().catch(function(){return{};});
      var newListing=Array.isArray(data)?data[0]:data;

      if (newListing&&global.WTB) {
        var already=(global.WTB.state.listings||[]).some(function(l){return l.id===newListing.id;});
        if (!already){ global.WTB.state.listings=[newListing].concat(global.WTB.state.listings||[]); global.WTB.render(); }
      }
      _toast('✅ Procura publicada com sucesso!','success');
      close();
    } catch(err) {
      console.warn('[WTBCreate] publish error:',err.message);
      _toast('Erro ao publicar. Tente novamente.','error');
    } finally {
      _locked=false;
      if (btn){ btn.disabled=false; btn.innerHTML='Publicar Procura'; }
    }
  }

  // ================================================================
  // Cancelar listing
  // ================================================================
  async function cancel(listingId) {
    if (!listingId) return;
    var confirmed=typeof confirmAction==='function'
      ?await confirmAction('Cancelar procura','Remover esta procura?',{type:'danger',confirmText:'Remover',cancelText:'Cancelar'})
      :global.confirm('Remover esta procura?');
    if (!confirmed) return;
    try {
      var jwt=_jwt(); if (!jwt){_toast('Faça login.','error');return;}
      var res=await fetch(SB_URL+'/rest/v1/wtb_listings?id=eq.'+listingId,{
        method:'PATCH',headers:{'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+jwt,'Prefer':'return=minimal'},
        body:JSON.stringify({status:'deleted'}),
      });
      if (!res.ok) throw new Error(await res.text());
      if (global.WTB){ global.WTB.state.listings=(global.WTB.state.listings||[]).filter(function(l){return l.id!==listingId;}); global.WTB.render(); }
      var el=global.document.querySelector('[data-wtb-id="'+listingId+'"]');
      if (el){ el.style.transition='opacity .25s,transform .25s'; el.style.opacity='0'; el.style.transform='scale(0.95)'; setTimeout(function(){if(el.parentNode)el.remove();},260); }
      _toast('Procura removida.','info');
    } catch(err){ _toast('Erro ao remover.','error'); }
  }

  // ================================================================
  // open / close
  // ================================================================
  function open() {
    var user=_user();
    if (!user){
      _toast('Faça login para criar uma procura.','info');
      if (typeof AuthModal!=='undefined'&&AuthModal.open) AuthModal.open('login');
      return;
    }
    _showChooser();
  }
  function close() {
    if (_modalEl){ _modalEl.innerHTML=''; _modalEl.style.display='none'; }
  }

  global.WTBCreate={open:open,close:close,publish:publish,cancel:cancel,_showChooser:_showChooser,_talentBack:_talentBack};
  console.log('[WTB] wtb-create.js carregado');
}(window));
