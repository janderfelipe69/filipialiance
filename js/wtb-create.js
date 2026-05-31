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
  function _each(list, fn) { Array.prototype.forEach.call(list || [], fn); }

  // ── Helds (listing_type='held'): catálogo + rótulos ──────────
  function _allHelds() { return (typeof HeldsCatalog !== 'undefined' && HeldsCatalog.getAll) ? (HeldsCatalog.getAll() || []) : []; }
  function _heldById(id) { return (id && typeof HeldsCatalog !== 'undefined' && HeldsCatalog.getById) ? HeldsCatalog.getById(id) : null; }
  function _validHelds() {
    return (_form.helds || []).filter(function (r) { return r && r.held_id && _heldById(r.held_id) && Number(r.pay_kk) > 0; });
  }
  function _heldsLabel(rows) {
    return (rows || []).map(function (r) { var h = _heldById(r.held_id); return h ? h.name : ''; }).filter(Boolean).join(' + ').slice(0, 80);
  }

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

  // ── Banner (imagem) do pacote — mesmas imagens do Pacotes tab ──
  // Reutiliza getPkgIcon() de packages.logic.js se disponível,
  // senão retorna o HTML da imagem diretamente com os mesmos URLs.
  function _getPkgIconHtml(name) {
    // Se packages.logic.js já carregou, usa diretamente
    if (typeof getPkgIcon === 'function') return getPkgIcon(name);
    // Fallback — mesmos URLs hardcoded de packages.logic.js
    var n = (name || '').toLowerCase();
    function img(url) { return '<img src="'+url+'" alt="'+_esc(name)+'">'; }
    if (n.includes('viridian'))  return img('https://i.imgur.com/AvX9Hbj.png');
    if (n.includes('cinnabar'))  return img('https://i.imgur.com/RsJe7OO.png');
    if (n.includes('pewter'))    return img('https://i.imgur.com/ViA3uQO.png');
    if (n.includes('cerulean'))  return img('https://i.imgur.com/uCRmZvq.png');
    if (n.includes('vermilion')) return img('https://i.imgur.com/GEfwZ4B.png');
    if (n.includes('celadon'))   return img('https://i.imgur.com/ocPJIHg.png');
    if (n.includes('fuchsia'))   return img('https://i.imgur.com/i8U2tWd.png');
    if (n.includes('saffron'))   return img('https://i.imgur.com/dzVfRLq.png');
    if (n.includes('speed'))     return img('https://i.imgur.com/ODTCGEc.gif');
    if (n.includes('hp'))        return img('https://i.imgur.com/QhZ8LL5.gif');
    if (n.includes('water'))     return img('https://i.imgur.com/zpRe43i.png');
    if (n.includes('steel'))     return img('https://i.imgur.com/GleRjiM.png');
    if (n.includes('rock'))      return img('https://i.imgur.com/GvD1Mtq.png');
    if (n.includes('psychic'))   return img('https://i.imgur.com/ASiZi1K.png');
    if (n.includes('poison'))    return img('https://i.imgur.com/xfX0ReE.png');
    if (n.includes('normal'))    return img('https://i.imgur.com/w2ChsIe.png');
    if (n.includes('ice'))       return img('https://i.imgur.com/ssFz0sA.png');
    if (n.includes('ground'))    return img('https://i.imgur.com/JPcD2l3.png');
    if (n.includes('fire'))      return img('https://i.imgur.com/O8TONGE.png');
    if (n.includes('grass'))     return img('https://i.imgur.com/YjKxtoE.png');
    if (n.includes('electric'))  return img('https://i.imgur.com/Yv2WEYc.png');
    if (n.includes('dark'))      return img('https://i.imgur.com/7Luj4az.png');
    if (n.includes('dragon'))    return img('https://i.imgur.com/o7JWbaN.png');
    if (n.includes('ghost'))     return img('https://i.imgur.com/HuybbPn.png');
    if (n.includes('fairy'))     return img('https://i.imgur.com/j3HaXTh.png');
    if (n.includes('flying'))    return img('https://i.imgur.com/npGjQae.png');
    if (n.includes('bug'))       return img('https://i.imgur.com/V4IXR51.png');
    if (n.includes('fighting')||n.includes('figthing')) return img('https://i.imgur.com/OKsJXh7.png');
    if (n.includes('sand'))      return img('https://i.imgur.com/JPcD2l3.png');
    return img('https://i.imgur.com/zpRe43i.png');
  }

  // ── Tipo Pokémon por nome de pacote ───────────────────────────
  // Usado para mostrar o ícone/cor correto em cada card de pacote.
  var TYPE_META = {
    bug:      { color:'#92d050', bg:'rgba(146,208,80,.15)',   label:'Bug',      emoji:'🐛' },
    dark:     { color:'#705848', bg:'rgba(112,88,72,.15)',    label:'Dark',     emoji:'🌑' },
    dragon:   { color:'#6f35fc', bg:'rgba(111,53,252,.15)',   label:'Dragon',   emoji:'🐉' },
    electric: { color:'#f8d030', bg:'rgba(248,208,48,.15)',   label:'Electric', emoji:'⚡' },
    fairy:    { color:'#ee99ac', bg:'rgba(238,153,172,.15)',  label:'Fairy',    emoji:'✨' },
    fighting: { color:'#c22e28', bg:'rgba(194,46,40,.15)',    label:'Fighting', emoji:'🥊' },
    fire:     { color:'#ff6c31', bg:'rgba(255,108,49,.15)',   label:'Fire',     emoji:'🔥' },
    flying:   { color:'#6db7f0', bg:'rgba(109,183,240,.15)', label:'Flying',   emoji:'🌬️' },
    ghost:    { color:'#735797', bg:'rgba(115,87,151,.15)',   label:'Ghost',    emoji:'👻' },
    grass:    { color:'#7ac74c', bg:'rgba(122,199,76,.15)',   label:'Grass',    emoji:'🌿' },
    ground:   { color:'#e2bf65', bg:'rgba(226,191,101,.15)', label:'Ground',   emoji:'🏜️' },
    ice:      { color:'#96d9d6', bg:'rgba(150,217,214,.15)', label:'Ice',      emoji:'❄️' },
    normal:   { color:'#a8a878', bg:'rgba(168,168,120,.15)', label:'Normal',   emoji:'⭐' },
    poison:   { color:'#a33ea1', bg:'rgba(163,62,161,.15)',   label:'Poison',   emoji:'☠️' },
    psychic:  { color:'#f95587', bg:'rgba(249,85,135,.15)',   label:'Psychic',  emoji:'🔮' },
    rock:     { color:'#b6a136', bg:'rgba(182,161,54,.15)',   label:'Rock',     emoji:'🪨' },
    steel:    { color:'#b7b7ce', bg:'rgba(183,183,206,.15)', label:'Steel',    emoji:'⚙️' },
    water:    { color:'#6390f0', bg:'rgba(99,144,240,.15)',   label:'Water',    emoji:'💧' },
  };

  // Mapeamento de ginásio → tipo
  var GYM_TYPES = {
    celadon:'grass', cerulean:'water', cinnabar:'fire',
    fuchsia:'poison', pewter:'rock', saffron:'psychic',
    vermilion:'electric', viridian:'ground',
  };

  // Extrai o tipo do nome do pacote (para exibir banner correto)
  function _pkgTypeKey(name) {
    // "Talent Fire 7/8" → "fire"
    var m1 = name.match(/^talent\s+(\w+)\s/i);
    if (m1) return m1[1].toLowerCase();
    // "Gym Cerulean" → water (via GYM_TYPES)
    var m2 = name.match(/^gym\s+(\w+)/i);
    if (m2) return GYM_TYPES[m2[1].toLowerCase()] || 'normal';
    // "Reduces Speed Ice 6/6" → "ice"
    var m3 = name.match(/^reduces\s+\w+\s+(\w+)/i);
    if (m3) { var t = m3[1].toLowerCase(); return t === 'sand' ? 'rock' : t; }
    // "Full HP" / "Full Speed" → normal
    return 'normal';
  }

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
  var _form          = {};
  var _pay           = {};
  var _modalEl       = null;
  var _locked        = false;
  var _pkgCache      = null;
  var _selectedPkg   = null;
  var _priceCache    = null; // { 'item name lower': price_npc }
  var _minTotalDl    = 0;   // mínimo calculado dos preços por item (em DL)

  // ── Formata moeda do jogo: DL / K / KK ──────────────────────────
  // 0–999        = DL   (ex: 185 → "185 DL")
  // 1.000–999.999 = K   (ex: 2000 → "2 K")
  // 1.000.000+   = KK   (ex: 1500000 → "1,5 KK")
  function _fmtDl(val) {
    if (val == null || isNaN(val)) return null;
    val = Number(val);
    if (val >= 1000000) {
      var kk = val / 1000000;
      return _trimDec(kk) + ' KK';
    }
    if (val >= 1000) {
      var k = val / 1000;
      return _trimDec(k) + ' K';
    }
    return val + ' DL';
  }
  function _trimDec(n) {
    // Remove zeros desnecessários: 1.50 → 1,5 | 2.00 → 2
    return parseFloat(n.toFixed(2)).toLocaleString('pt-BR');
  }
  // Rótulo de magnitude (apenas visual; o valor digitado já é em DL).
  // <1000 → DL/un | 1000–999999 → K/un | ≥1000000 → KK/un
  function _unitLabel(v) {
    v = parseFloat(v) || 0;
    if (v >= 1000000) return 'KK/un';
    if (v >= 1000)    return 'K/un';
    return 'DL/un';
  }
  // Magnitude p/ helds (sem "/un"): valor cru digitado → DL / K / KK
  function _magLabel(v) {
    v = parseFloat(v) || 0;
    if (v >= 1000000) return 'KK';
    if (v >= 1000)    return 'K';
    return 'DL';
  }

  function _resetForm(type) {
    _form = {
      listing_type: type||'pokemon',
      pokemon_name:'', pokemon_slug:'', pokemon_types:[], stars:0, ball_type:null,
      catalog_package_id:null, package_name:null, slots_data:null,
      helds:[{ held_id:null, pay_kk:0 }],
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
    // Procura de helds: 1 a 3 helds, orçamento por held (não usa a seção de pagamento)
    if (_form.listing_type==='held') {
      var filled=(_form.helds||[]).filter(function(r){ return r && r.held_id; });
      if (filled.length===0) errs.helds='Adicione pelo menos 1 held.';
      else if (filled.length>3) errs.helds='Máximo de 3 helds por procura.';
      else {
        for (var i=0;i<filled.length;i++){
          if (!_heldById(filled[i].held_id)){ errs.helds='Há um held inválido na lista.'; break; }
          var p=Number(filled[i].pay_kk);
          if (!p||p<=0){ errs.helds='Defina um orçamento (> 0) para cada held.'; break; }
          if (p>999999999999){ errs.helds='Orçamento muito alto em um dos helds.'; break; }
        }
      }
      if (_form.observations&&_form.observations.length>500) errs.observations='Máx 500 caracteres.';
      _form.errors=errs;
      return Object.keys(errs).length===0;
    }
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
    if (!_form.pay_kk&&!_form.pay_dd&&!_form.pay_brl) {
      errs.payment='Informe pelo menos um valor de pagamento.';
    } else if (_minTotalDl > 0 && _form.pay_kk) {
      // Valida se o valor em KK é pelo menos o mínimo calculado
      if (_form.pay_kk < _minTotalDl) {
        errs.payment='Valor abaixo do mínimo de referência (' + _fmtDl(_minTotalDl) + '). Aumente o valor ou ajuste nas observações.';
      }
    }
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
      +'<span class="wtb-pay-min-hint" id="wtb-pay-min-hint" style="display:none"></span>'
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
      // Esconde o hint quando o usuário já digitou um valor
      var hint=global.document.getElementById('wtb-pay-min-hint');
      if (hint) hint.style.opacity=v>0?'0.4':'1';
      // Valida mínimo em tempo real
      _validateMinPayment();
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
        var method = btn.getAttribute('data-sec-method');
        _pay.secondary[method] = null;
        // ── Esconde a linha inteira ──────────────────────────────
        var row = btn.closest('[data-sec-method]');
        if (row) {
          row.style.transition = 'opacity .15s';
          row.style.opacity = '0';
          setTimeout(function() { if (row.parentNode) row.remove(); }, 160);
        }
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
      +'<button class="wtb-type-card" id="wtb-type-card-held">'
      +'<span class="wtb-type-card-icon">🎒</span>'
      +'<span class="wtb-type-card-title">Helds</span>'
      +'<span class="wtb-type-card-desc">Procuro helds (até 3) — orçamento por held</span>'
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
    var hb=global.document.getElementById('wtb-type-card-held');
    var tb=global.document.getElementById('wtb-type-card-talent');
    if (pb) pb.addEventListener('click',function(){ _resetForm('pokemon'); _showPokemonForm(); });
    if (hb) hb.addEventListener('click',function(){ _resetForm('held'); _showHeldForm(); });
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
  // HELDS FORM — vitrine de 1 a 3 helds com orçamento por held
  // ================================================================
  function _buildHeldFormHtml() {
    return '<div class="mk-modal-backdrop" id="wtb-create-backdrop">'
      +'<div class="mk-modal" id="wtb-create-modal" role="dialog" aria-modal="true">'
      +'<div class="mk-modal-header">'
      +'<button class="wtb-back-btn" onclick="WTBCreate._showChooser()">←</button>'
      +'<span class="mk-modal-title">🎒 Procura de Helds</span>'
      +'<button class="mk-modal-close" onclick="WTBCreate.close()">✕</button>'
      +'</div>'
      +'<div class="mk-modal-body">'
      +'<div class="mk-section">'
      +'<div class="mk-section-title"><span class="mk-section-dot"></span>Helds que você procura <small class="mk-section-hint">até 3 — orçamento por held</small></div>'
      +'<div id="wtb-helds-rows"></div>'
      +'<button type="button" class="mk-btn mk-btn--ghost mk-btn--sm" id="wtb-add-held">+ Adicionar held</button>'
      +'<span class="mk-field-error" id="wtb-err-helds"></span>'
      +'</div>'
      +'<div class="mk-section"><div class="mk-field"><label class="mk-label" for="wtb-obs">Observações <small>(opcional, máx 500)</small></label>'
      +'<textarea class="mk-textarea" id="wtb-obs" maxlength="500" placeholder="Detalhes sobre os helds que você procura..."></textarea>'
      +'</div></div>'
      +'<div class="mk-modal-footer">'
      +'<button class="mk-btn mk-btn--ghost" onclick="WTBCreate.close()">Cancelar</button>'
      +'<button class="mk-btn mk-btn--primary" id="wtb-submit-btn" onclick="WTBCreate.publish()">Publicar Procura</button>'
      +'</div></div></div></div>';
  }

  function _showHeldForm() {
    _ensureModal();
    _modalEl.innerHTML=_buildHeldFormHtml();
    var obs=global.document.getElementById('wtb-obs');
    if (obs) obs.addEventListener('input', function(){ _form.observations=obs.value; });
    var addBtn=global.document.getElementById('wtb-add-held');
    if (addBtn) addBtn.addEventListener('click', function(){
      if ((_form.helds||[]).length>=3) return;
      _form.helds.push({ held_id:null, pay_kk:0 });
      _wtbRenderHeldRows();
    });
    global.document.addEventListener('click', function(e){
      var wrap=global.document.getElementById('wtb-helds-rows');
      if (!wrap) return;
      if (!e.target.closest || !e.target.closest('.mk-held-row-pick')) {
        _each(wrap.querySelectorAll('.mk-hr-grid'), function(g){ g.style.display='none'; });
      }
    });
    if (typeof HeldsCatalog!=='undefined' && !HeldsCatalog.isLoaded()) HeldsCatalog.load().then(_wtbRenderHeldRows);
    _wtbRenderHeldRows();
  }

  function _wtbRenderHeldRows() {
    var wrap=global.document.getElementById('wtb-helds-rows');
    if (!wrap) return;
    if (!_form.helds||!_form.helds.length) _form.helds=[{ held_id:null, pay_kk:0 }];
    wrap.innerHTML=_form.helds.map(function(row,i){
      var h=_heldById(row.held_id);
      var raw=Number(row.pay_kk)||0;
      var canRemove=_form.helds.length>1;
      return '<div class="mk-held-row" data-idx="'+i+'">'
        +'<div class="mk-held-row-pick">'
        +'<button type="button" class="mk-held-trigger mk-hr-trigger" data-idx="'+i+'">'
        +(h&&h.sprite_url?'<img class="mk-held-trigger-img" src="'+_esc(h.sprite_url)+'" alt="" style="display:inline-block">':'<span class="mk-held-trigger-slot">＋</span>')
        +'<span class="mk-held-trigger-name">'+(h?_esc(h.name):'— Escolher held —')+'</span>'
        +'<span class="mk-held-trigger-arrow">▾</span>'
        +'</button>'
        +'<div class="mk-held-grid-wrap mk-hr-grid" data-idx="'+i+'" style="display:none">'
        +'<input type="text" class="mk-input mk-hr-search" data-idx="'+i+'" placeholder="Buscar held...">'
        +'<div class="mk-held-grid-items mk-hr-items" data-idx="'+i+'"></div>'
        +'</div>'
        +'</div>'
        +'<div class="mk-held-row-price">'
        +'<input class="mk-input mk-hr-price" data-idx="'+i+'" type="number" min="0" step="1" placeholder="Orçamento" value="'+(raw||'')+'">'
        +'<span class="mk-hr-unit" data-idx="'+i+'">'+_magLabel(raw)+'</span>'
        +(canRemove?'<button type="button" class="mk-hr-remove" data-idx="'+i+'" title="Remover">✕</button>':'')
        +'</div>'
        +'</div>';
    }).join('');
    var addBtn=global.document.getElementById('wtb-add-held');
    if (addBtn) addBtn.style.display=(_form.helds.length>=3)?'none':'';
    _wtbBindHeldRows();
  }

  function _wtbBindHeldRows() {
    var wrap=global.document.getElementById('wtb-helds-rows');
    if (!wrap) return;
    _each(wrap.querySelectorAll('.mk-hr-trigger'), function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var idx=btn.getAttribute('data-idx');
        var grid=wrap.querySelector('.mk-hr-grid[data-idx="'+idx+'"]');
        var willOpen=grid&&grid.style.display==='none';
        _each(wrap.querySelectorAll('.mk-hr-grid'), function(g){ g.style.display='none'; });
        if (willOpen){ grid.style.display=''; _wtbRenderHeldGrid(idx,''); var s=grid.querySelector('.mk-hr-search'); if (s) s.focus(); }
      });
    });
    _each(wrap.querySelectorAll('.mk-hr-search'), function(inp){
      inp.addEventListener('click', function(e){ e.stopPropagation(); });
      inp.addEventListener('input', function(){ _wtbRenderHeldGrid(inp.getAttribute('data-idx'), inp.value); });
    });
    _each(wrap.querySelectorAll('.mk-hr-price'), function(inp){
      inp.addEventListener('input', function(){
        var idx=inp.getAttribute('data-idx');
        var v=Math.max(0, Math.floor(Number(inp.value)||0));
        if (_form.helds[idx]) _form.helds[idx].pay_kk=v;
        var lbl=wrap.querySelector('.mk-hr-unit[data-idx="'+idx+'"]');
        if (lbl) lbl.textContent=_magLabel(v);
      });
    });
    _each(wrap.querySelectorAll('.mk-hr-remove'), function(btn){
      btn.addEventListener('click', function(){ _form.helds.splice(parseInt(btn.getAttribute('data-idx'),10),1); _wtbRenderHeldRows(); });
    });
  }

  function _wtbRenderHeldGrid(idx, query) {
    var wrap=global.document.getElementById('wtb-helds-rows');
    if (!wrap) return;
    var box=wrap.querySelector('.mk-hr-items[data-idx="'+idx+'"]');
    if (!box) return;
    var all=_allHelds();
    var q=(query||'').toLowerCase().trim();
    var list=q?all.filter(function(h){ return (h.name||'').toLowerCase().indexOf(q)>=0; }):all;
    var currentId=_form.helds[idx]?_form.helds[idx].held_id:null;
    box.innerHTML=list.map(function(h){
      return '<button type="button" class="mk-held-item'+(h.id===currentId?' selected':'')+'" data-id="'+_esc(h.id)+'">'
        +(h.sprite_url?'<img class="mk-held-item-img" src="'+_esc(h.sprite_url)+'" alt="">':'<span class="mk-held-item-no-img">?</span>')
        +'<span class="mk-held-item-label">'+_esc(h.name)+'</span>'
        +'</button>';
    }).join('')||'<div class="mk-hr-empty">Nenhum held encontrado.</div>';
    _each(box.querySelectorAll('.mk-held-item'), function(btn){
      btn.addEventListener('click', function(){
        if (_form.helds[idx]) _form.helds[idx].held_id=btn.getAttribute('data-id')||null;
        var err=global.document.getElementById('wtb-err-helds');
        if (err) err.textContent='';
        _wtbRenderHeldRows();
      });
    });
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

  async function _fetchItemPrices() {
    if (_priceCache) return _priceCache;
    var url=SB_URL+'/rest/v1/catalog_items?select=name,price_npc&price_npc=not.is.null';
    var res=await fetch(url,{headers:_hdrs()});
    var data=await res.json().catch(function(){return[];});
    _priceCache={};
    (Array.isArray(data)?data:[]).forEach(function(item){
      if (item.name && item.price_npc!=null)
        _priceCache[item.name.toLowerCase()]=Number(item.price_npc);
    });
    return _priceCache;
  }

  function _getItemPrice(itemName) {
    if (!_priceCache||!itemName) return null;
    return _priceCache[itemName.toLowerCase()]??null;
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
      // Busca pacotes e preços em paralelo
      var results=await Promise.all([_fetchPackages(), _fetchItemPrices()]);
      _renderPkgList(results[0],'');
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
          var typeKey = _pkgTypeKey(p.name);
          var tMeta  = TYPE_META[typeKey] || TYPE_META.normal;
          var iconHtml = _getPkgIconHtml(p.name);
          return '<button class="wtb-pkg-card" data-pkg-id="'+_esc(p.id)+'"'
            +' style="--pkgc:'+tMeta.color+';--pkgbg:'+tMeta.bg+'">'
            +'<div class="wtb-pkg-card-icon-frame" style="--pkgc:'+tMeta.color+'">'+iconHtml+'</div>'
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
    var group   = _pkgGroup(pkg.name);
    var meta    = PKG_GROUP_META[group];
    var typeKey = _pkgTypeKey(pkg.name);
    var tMeta   = TYPE_META[typeKey] || TYPE_META.normal;
    var slots   = _sortedSlots(pkg);
    var totalItems = slots.reduce(function(acc,s){return acc+_slotItems(s).length;},0);

    var slotsHtml=slots.map(function(slot) {
      var items=_slotItems(slot);
      // Calcula subtotal do slot em KK
      var slotTotal=items.reduce(function(acc,item){
        var p=_getItemPrice(item.item_name); // price_npc = valor em KK
        return acc+(p?p*item.quantity:0);
      },0);

      return '<div class="wtb-cst-slot">'
        +'<div class="wtb-cst-slot-hdr">'
        +'<span class="wtb-cst-slot-num" style="color:'+meta.color+'">Slot '+(slot.slot_index+1)+'</span>'
        +'<div style="display:flex;align-items:center;gap:8px">'
        +'<span class="wtb-cst-slot-count">'+items.length+' '+(items.length===1?'item':'itens')+'</span>'
        +(slotTotal>0?'<span class="wtb-cst-slot-price">≈ '+_fmtDl(slotTotal)+'</span>':'')
        +'</div>'
        +'</div>'
        +'<div class="wtb-cst-items">'
        +items.map(function(item) {
          var unitPrice=_getItemPrice(item.item_name);
          // Valor padrão em DL: usa preço NPC se disponível, senão 300 DL.
          // O número digitado É o valor em DL; o rótulo (DL/K/KK) é só indicação
          // visual da magnitude (3000 = "3k" = 3000 DL), nunca um multiplicador.
          var defaultPrice = unitPrice != null && unitPrice > 0 ? unitPrice : 300;
          var defaultUnit  = _unitLabel(defaultPrice);
          return '<div class="wtb-cst-item" data-item-id="'+_esc(item.id)+'" data-qty-max="'+item.quantity+'" data-npc-price="'+(unitPrice||0)+'">'
            +'<span class="wtb-cst-item-name">'+_esc(item.item_name)+'</span>'
            +'<div class="wtb-cst-price-field">'
            +'<input type="number" class="wtb-cst-price-inp" min="0" step="any"'
            +' value="'+defaultPrice+'"'
            +' title="Preço por unidade (mínimo NPC: '+(unitPrice?_fmtDl(unitPrice):'sem referência')+')">'
            +'<span class="wtb-cst-price-unit">'+defaultUnit+'</span>'
            +'</div>'
            // Controles de quantidade
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
      +'<div class="wtb-cst-header-icon" style="--pkgc:'+tMeta.color+'">'+_getPkgIconHtml(pkg.name)+'</div>'
      +'<div style="display:flex;flex-direction:column;gap:2px;min-width:0">'
      +'<span class="mk-type-badge mk-type--'+_esc(typeKey)+'" style="font-size:.60rem;padding:2px 8px;width:fit-content">'+_esc(tMeta.label)+'</span>'
      +'<span class="mk-modal-title" style="font-size:.90rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_esc(pkg.name)+'</span>'
      +'</div>'
      +'</div>'
      +'<button class="mk-modal-close" onclick="WTBCreate.close()">✕</button>'
      +'</div>'
      +'<div class="mk-modal-body">'

      +'<div class="wtb-cst-summary-bar">'
      +'<span>'+slots.length+' slots</span>'
      +'<span class="wtb-cst-summary-dot">·</span>'
      +'<span id="wtb-cst-total-label">'+totalItems+' itens necessários</span>'
      +'<span class="wtb-cst-summary-dot">·</span>'
      +'<span id="wtb-cst-est-price" class="wtb-cst-est-price"></span>'
      +'</div>'
      +'<div class="wtb-cst-price-hint">Os valores <strong>$</strong> são preços de NPC — referência mínima de mercado. Ajuste a qty dos itens que já tem.</div>'

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

    // Auto-seleciona KK como método de pagamento e exibe campo
    var kkBtn=global.document.querySelector('.wtb-pay-method-btn[data-method="kk"]');
    if (kkBtn) kkBtn.click();

    // Calcula e mostra o mínimo assim que abre
    _refreshTotalLabel(pkg);
  }

  function _bindCustomizerEvents(pkg) {
    Array.prototype.forEach.call(global.document.querySelectorAll('.wtb-cst-item'), function(row) {
      var qtyInp   = row.querySelector('.wtb-cst-qty-inp');
      var priceInp = row.querySelector('.wtb-cst-price-inp');
      var max      = parseInt(row.getAttribute('data-qty-max'),10)||0;

      function _clamp(v){ return Math.min(max, Math.max(0, parseInt(v,10)||0)); }

      function _updateQty() {
        var v = _clamp(qtyInp.value);
        qtyInp.value = v;
        row.classList.toggle('wtb-cst-item--have', v === 0);
        _refreshTotalLabel(pkg);
      }

      // Qty +/−
      Array.prototype.forEach.call(row.querySelectorAll('.wtb-cst-qty-btn'), function(btn) {
        btn.addEventListener('click', function(){
          qtyInp.value = _clamp((parseInt(qtyInp.value,10)||0) + parseInt(btn.getAttribute('data-dir'),10));
          _updateQty();
        });
      });
      if (qtyInp)   qtyInp.addEventListener('input', _updateQty);

      // Campo de preço por unidade → atualiza total E rótulo de magnitude ao digitar
      if (priceInp) priceInp.addEventListener('input', function(){
        _refreshTotalLabel(pkg);
        var unitLbl = priceInp.parentElement && priceInp.parentElement.querySelector('.wtb-cst-price-unit');
        if (unitLbl) unitLbl.textContent = _unitLabel(priceInp.value);
      });
    });

    var obs = global.document.getElementById('wtb-obs');
    if (obs) obs.addEventListener('input', function(){ _form.observations = obs.value; });
  }

  // Calcula total mínimo em KK e atualiza a barra + o placeholder do campo KK
  function _refreshTotalLabel(pkg) {
    var lbl=global.document.getElementById('wtb-cst-total-label');
    var est=global.document.getElementById('wtb-cst-est-price');
    var totalQty=0, totalDl=0;

    Array.prototype.forEach.call(global.document.querySelectorAll('.wtb-cst-item'), function(row){
      var qtyInp   = row.querySelector('.wtb-cst-qty-inp');
      var priceInp = row.querySelector('.wtb-cst-price-inp');
      var npcPrice = parseFloat(row.getAttribute('data-npc-price')||0)||0;
      var qty      = parseInt(qtyInp?qtyInp.value:0,10)||0;
      var rawVal   = (priceInp && priceInp.value !== '') ? (parseFloat(priceInp.value)||0) : 0;

      // O valor digitado JÁ é em DL (o rótulo K/KK é só magnitude). Sem multiplicar.
      var unitDl = rawVal > 0 ? rawVal : npcPrice; // fallback: usa NPC

      totalQty += qty;
      totalDl  += qty * unitDl;
    });

    _minTotalDl = totalDl; // salva o mínimo global

    if (lbl) lbl.textContent = totalQty + ' itens necessários';
    if (est) est.textContent = totalDl > 0 ? '≈ ' + _fmtDl(totalDl) : '';

    _updatePaymentMinHint(totalDl);
    _validateMinPayment(); // verifica se o valor digitado respeita o mínimo
  }

  // Mostra o valor mínimo em KK como hint suave dentro do campo de pagamento
  // Verifica em tempo real se o valor de pagamento está abaixo do mínimo
  function _validateMinPayment() {
    if (!_minTotalDl || _minTotalDl <= 0) return;
    var kkInp  = global.document.getElementById('wtb-pay-primary-val');
    var kkUnit = global.document.getElementById('wtb-pay-kk-unit');
    var errEl  = global.document.getElementById('wtb-err-payment');
    if (!kkInp || !errEl) return;

    var v = parseFloat(kkInp.value) || 0;
    var u = kkUnit ? (parseInt(kkUnit.value, 10) || 1e6) : 1e6;
    var enteredDl = v * u;               // converte o que foi digitado para DL

    if (v > 0 && enteredDl < _minTotalDl) {
      errEl.textContent = '⚠️ Valor abaixo do mínimo de referência (' + _fmtDl(_minTotalDl) + '). Aumente ou justifique nas observações.';
      if (kkInp) kkInp.style.borderColor = 'rgba(252,129,74,0.6)';
    } else {
      if (errEl.textContent.startsWith('⚠️')) errEl.textContent = '';
      if (kkInp) kkInp.style.borderColor = '';
    }
  }

  function _updatePaymentMinHint(totalDl) {
    var hint = global.document.getElementById('wtb-pay-min-hint');
    if (hint) {
      if (totalDl > 0) { hint.textContent = 'total estimado: ' + _fmtDl(totalDl); hint.style.display = ''; }
      else             { hint.style.display = 'none'; }
    }
    if (!totalDl || totalDl <= 0) return;

    // ── Auto-preenche o campo de KK com o total calculado ──────────
    // Escolhe a unidade mais legível: k se < 1M, kk se ≥ 1M
    var kkUnit = global.document.getElementById('wtb-pay-kk-unit');
    var kkInp  = global.document.getElementById('wtb-pay-primary-val');
    var step2  = global.document.getElementById('wtb-pay-step2');
    var step3  = global.document.getElementById('wtb-pay-step3');

    if (!kkInp) return;

    // Arredonda sempre para CIMA para garantir que o valor >= mínimo
    var unitVal, displayVal;
    if (totalDl >= 1000000) {
      unitVal    = 1000000;
      displayVal = Math.ceil((totalDl / 1000000) * 100) / 100; // 2 casas, arredonda pra cima
    } else {
      unitVal    = 1000;
      displayVal = Math.ceil((totalDl / 1000) * 1000) / 1000;  // 3 casas, arredonda pra cima
    }

    // Atualiza o seletor de unidade
    if (kkUnit) {
      kkUnit.value = String(unitVal);
    }

    // Preenche o input com o total calculado
    kkInp.value = displayVal;

    // Garante que os steps seguintes apareçam
    if (step2) step2.style.display = '';
    if (step3) step3.style.display = '';

    // Atualiza o estado interno de _pay
    _pay.primaryMethod   = 'kk';
    _pay.primaryRawVal   = displayVal;
    _pay.kkUnit          = unitVal;
    _syncFormPay();
  }

  function _buildSlotsSnapshot(pkg) {
    var slots=_sortedSlots(pkg);
    return slots.map(function(slot) {
      var items=_slotItems(slot);
      return {
        slot_index: slot.slot_index,
        items: items.map(function(item) {
          var row       = global.document.querySelector('[data-item-id="'+item.id+'"]');
          var qtyInp    = row ? row.querySelector('.wtb-cst-qty-inp')   : null;
          var priceInp  = row ? row.querySelector('.wtb-cst-price-inp') : null;
          var npcPrice  = row ? parseFloat(row.getAttribute('data-npc-price')||0)||0 : 0;
          var qty       = qtyInp ? (parseInt(qtyInp.value,10)||0) : item.quantity;
          var rawVal    = priceInp && priceInp.value !== '' ? (parseFloat(priceInp.value)||0) : 0;
          // O valor digitado JÁ é em DL (rótulo K/KK é só magnitude). Sem multiplicar.
          var priceDl;
          if (rawVal > 0) {
            priceDl = rawVal;
          } else {
            priceDl = npcPrice;
          }
          return {
            id: item.id, name: item.item_name,
            qty_original: item.quantity, qty: qty,
            price_dl: priceDl,           // preço unitário em DL (digitado ou NPC)
            price_npc: npcPrice,          // referência NPC original
          };
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

      // Procura de helds: monta helds_data + orçamento total em pay_kk
      var heldsData=null, heldsTotal=null, heldsName=null;
      if (_form.listing_type==='held') {
        var hrows=_validHelds().slice(0,3);
        heldsData=hrows.map(function(r){ return { held_id:r.held_id, pay_kk:Math.floor(Number(r.pay_kk)) }; });
        heldsTotal=heldsData.reduce(function(a,r){ return a+r.pay_kk; },0);
        heldsName=_heldsLabel(hrows)||'Helds';
      }

      var payload={
        buyer_id:           user.id,
        listing_type:       _form.listing_type,
        pokemon_name:       _form.listing_type==='held'?heldsName:((_form.pokemon_name||'').trim()||null),
        pokemon_slug:       _form.listing_type==='pokemon'&&_form.pokemon_name?_toSlug(_form.pokemon_name):null,
        pokemon_types:      _form.pokemon_types||[],
        stars:              _form.stars||0,
        boost:              0,
        ball_type:          _form.listing_type==='pokemon'?(_form.ball_type||null):null,
        catalog_package_id: _form.catalog_package_id||null,
        package_name:       _form.package_name||null,
        slots_data:         _form.slots_data||null,
        helds_data:         heldsData,
        pay_kk:             _form.listing_type==='held'?heldsTotal:(_form.pay_kk||null),
        pay_dd:             _form.listing_type==='held'?null:(_form.pay_dd||null),
        pay_brl:            _form.listing_type==='held'?null:(_form.pay_brl||null),
        observations:       (_form.observations||'').trim().slice(0,500)||null,
        status:             'active',
        server:             (global.PA&&global.PA.world&&global.PA.world.get())||'Moon',
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
