// ============================================================
// wtb-render.js — Cards de Procura (Pokémon + Talento)
// ============================================================

;(function (global) {
  'use strict';
  if (global.WTBRender) return;

  function _esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _user()   { return typeof Session!=='undefined'?Session.getCurrentUser():null; }
  function _isAdmin(){ return typeof Session!=='undefined'&&Session.isAdmin&&Session.isAdmin(); }

  var BALL_META={
    ultra:  {label:'Ultra Ball',   color:'#f5c518',border:'#f5c518',glow:'rgba(245,197,24,0.40)'},
    premier:{label:'Premier Ball', color:'#e8e8e8',border:'#cfd3dc',glow:'rgba(232,232,232,0.30)'},
    alliance:{label:'Alliance Ball',color:'#b67fff',border:'#7c6aff',glow:'rgba(124,106,255,0.45)'},
  };

  var PKG_GROUP_META={
    talent: {label:'Talents',color:'#a78bfa',bg:'rgba(167,139,250,0.10)',icon:'⚡'},
    gym:    {label:'Gym',    color:'#34d399',bg:'rgba(52,211,153,0.10)', icon:'🏟️'},
    reduces:{label:'Reduces',color:'#fb7185',bg:'rgba(251,113,133,0.10)',icon:'🔻'},
    other:  {label:'Outros', color:'#94a3b8',bg:'rgba(148,163,184,0.10)',icon:'📦'},
  };

  function _pkgGroup(name){
    if (/^talent\s/i.test(name))  return 'talent';
    if (/^gym\s/i.test(name))     return 'gym';
    if (/^reduces\s/i.test(name)) return 'reduces';
    return 'other';
  }

  // ── Tier ─────────────────────────────────────────────────────
  function _getTier(name){
    if (global.getTierByName) return global.getTierByName(name);
    var data=typeof TIER_DATA!=='undefined'?TIER_DATA:null;
    if (!name||!data) return null;
    var q=String(name).trim().toLowerCase();
    for (var i=0;i<data.length;i++) if (String(data[i][0]).trim().toLowerCase()===q) return data[i][1];
    return null;
  }
  function _tierBadgeHtml(tier){
    // TIER_CONFIG é const top-level (TDZ por declaração duplicada) — usa o espelho em window.
    var _tc = (global.PA_TIER_CONFIG || global.TIER_CONFIG || null);
    var cfg=(_tc&&tier)?_tc[tier]:null;
    if (!cfg) return '';
    var glow=cfg.glow||(cfg.color+'66');
    return '<span class="mk-tier-badge" style="color:'+cfg.color+';border-color:'+cfg.color+';background:'+(cfg.bg||cfg.color+'1f')+';box-shadow:0 0 12px '+glow+',inset 0 0 10px '+cfg.color+'22;text-shadow:0 0 8px '+glow+'">'+_esc(cfg.label)+'</span>';
  }

  // ── Helpers visuais ───────────────────────────────────────────
  function _spriteUrl(name){
    if (!name) return null;
    if (typeof getSprites==='function'){try{return getSprites(name);}catch(_){}}
    var isShiny=/^shiny\s+/i.test(name);
    var base=name.replace(/^shiny\s+/i,'').toLowerCase().replace(/\s+/g,'').replace(/['']/g,'');
    return {
      animated:(isShiny?'https://play.pokemonshowdown.com/sprites/gen5ani-shiny/':'https://play.pokemonshowdown.com/sprites/gen5ani/')+base+'.gif',
      static:  (isShiny?'https://play.pokemonshowdown.com/sprites/dex-shiny/':'https://play.pokemonshowdown.com/sprites/dex/')+base+'.png',
    };
  }
  function _typesHtml(types){
    if (!types||!types.length) return '';
    return '<div class="mk-types">'+types.map(function(t){ return '<span class="mk-type-badge mk-type--'+_esc(t.toLowerCase())+'">'+_esc(t)+'</span>'; }).join('')+'</div>';
  }
  function _starsHtml(stars){
    if (!stars) return '';
    var out='';
    for (var i=1;i<=5;i++) out+='<span class="mk-star'+(i<=stars?' mk-star--lit':'')+'">★</span>';
    return '<div class="mk-stars">'+out+'</div>';
  }
  function _ballPillHtml(bt){
    if (!bt) return '<span class="wtb-ball-any">⚪ Qualquer bola</span>';
    var m=BALL_META[bt]; if (!m) return '';
    return '<span class="mk-ball-pill" style="color:'+m.color+';border-color:'+m.border+'66;background:'+m.color+'14"><span>'+_esc(m.label)+'</span></span>';
  }
  function _paymentHtml(l){
    var parts=[];
    if (l.pay_kk){ var fmt=(typeof formatKK==='function')?formatKK(l.pay_kk):null; parts.push('<span class="wtb-pay-chip wtb-pay-kk"><span class="mk-price-coin">◈</span>'+_esc(fmt?fmt.label:Math.round(l.pay_kk/1000)+'k')+'</span>'); }
    if (l.pay_dd)  parts.push('<span class="wtb-pay-chip wtb-pay-dd">💎 '+_esc(Number(l.pay_dd).toLocaleString('pt-BR'))+' DD</span>');
    if (l.pay_brl) parts.push('<span class="wtb-pay-chip wtb-pay-brl">💵 R$ '+_esc(Number(l.pay_brl).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}))+'</span>');
    return parts.join('')||'<span class="wtb-ball-any">—</span>';
  }
  function _timeAgo(iso){
    if (!iso) return '';
    var ms=Date.now()-new Date(iso).getTime();
    if (ms<60000) return 'agora mesmo';
    var m=Math.floor(ms/60000); if (m<60) return m+'m atrás';
    var h=Math.floor(m/60);     if (h<24) return h+'h atrás';
    return Math.floor(h/24)+'d atrás';
  }
  function _actionHtml(listing, isOwner){
    if (isOwner) {
      var renew = (listing.status==='expired')
        ? '<button class="mk-btn mk-btn--primary mk-btn--sm" onclick="event.stopPropagation();WTB&&WTB.renewListing(\''+_esc(listing.id)+'\')">♻️ Renovar</button>'
        : '';
      return '<div class="mk-card-actions">'+renew+'<button class="mk-btn mk-btn--danger-ghost mk-btn--sm" onclick="event.stopPropagation();WTBCreate&&WTBCreate.cancel(\''+_esc(listing.id)+'\')">✕ Cancelar</button></div>';
    }
    if (listing.status && listing.status!=='active') return '';
    return '<div class="mk-card-negotiate"><button class="mk-btn mk-btn--primary mk-btn--negotiate" onclick="event.stopPropagation();WTBChat&&WTBChat.open(\''+_esc(listing.id)+'\',\''+_esc(listing.buyer_id)+'\')">💬 Tenho isso!</button></div>';
  }

  // ================================================================
  // Card: Pokémon
  // ================================================================
  function _buildPokemonCard(listing, userId, isAdmin){
    var isOwner=!!(userId&&listing.buyer_id===userId);
    var sprites=_spriteUrl(listing.pokemon_name);
    var tier=_getTier(listing.pokemon_name);
    var ballMeta=BALL_META[listing.ball_type]||null;
    var spriteHtml=sprites?'<img class="mk-sprite" loading="lazy" src="'+_esc(sprites.animated)+'" data-static="'+_esc(sprites.static)+'" alt="'+_esc(listing.pokemon_name||'')+'" onerror="this.src=this.dataset.static;this.onerror=null">':'<div class="mk-sprite-fallback">🔍</div>';

    return '<div class="mk-card wtb-card" data-wtb-id="'+_esc(listing.id)+'" data-updated="'+_esc(listing.updated_at||'')+'"'+(ballMeta?' style="--mk-ball:'+ballMeta.border+';--mk-ball-glow:'+ballMeta.glow+'"':'')+'>'
      +'<div class="wtb-card-badge">🔍 Pokémon</div>'
      +'<div class="mk-card-top"><div class="mk-sprite-wrap">'+spriteHtml+'</div>'+_starsHtml(listing.stars)+_typesHtml(listing.pokemon_types)+'</div>'
      +'<div class="mk-card-body">'
      +'<div class="mk-card-name-row"><span class="mk-card-name">'+_esc(listing.pokemon_name)+'</span>'+_tierBadgeHtml(tier)+'</div>'
      +'<div class="wtb-ball-row">'+_ballPillHtml(listing.ball_type)+'</div>'
      +(listing.observations?'<div class="wtb-obs">'+_esc(listing.observations)+'</div>':'')
      +'</div>'
      +'<div class="mk-card-footer"><div class="wtb-payment">'+_paymentHtml(listing)+'</div><span class="mk-card-time">'+_timeAgo(listing.created_at)+'</span></div>'
      +_actionHtml(listing,isOwner)
      +'</div>';
  }

  // ================================================================
  // Card: Talento — mostra slots e itens reais do catálogo
  // ================================================================
  function _buildTalentCard(listing, userId, isAdmin){
    var isOwner=!!(userId&&listing.buyer_id===userId);
    var pkgName=listing.package_name||'Talento';
    var group=_pkgGroup(pkgName);
    var meta=PKG_GROUP_META[group];
    var slots=Array.isArray(listing.slots_data)?listing.slots_data:[];

    // Resumo: quantos itens ainda precisam vs. já tem
    var totalNeed=0, totalHave=0;
    slots.forEach(function(s){ (s.items||[]).forEach(function(i){ if(i.qty>0)totalNeed+=i.qty; else totalHave++; }); });

    // Slots compactos — mostra itens com qty > 0; se tudo zerado = "Completo"
    var slotsHtml=slots.length?'<div class="wtb-ts-slots">'+slots.map(function(slot){
      var neededItems=(slot.items||[]).filter(function(i){return i.qty>0;});
      var haveCount=(slot.items||[]).filter(function(i){return i.qty===0;}).length;
      if (!neededItems.length) {
        return '<div class="wtb-ts-slot wtb-ts-slot--done">'
          +'<span class="wtb-ts-slot-num">Slot '+(slot.slot_index+1)+'</span>'
          +'<span class="wtb-ts-done">✓ Completo</span>'
          +'</div>';
      }
      return '<div class="wtb-ts-slot">'
        +'<span class="wtb-ts-slot-num">Slot '+(slot.slot_index+1)+'</span>'
        +'<div class="wtb-ts-items">'
        +neededItems.map(function(i){
          return '<span class="wtb-ts-item"><span class="wtb-ts-item-qty">×'+i.qty+'</span>'+_esc(i.name)+'</span>';
        }).join('')
        +(haveCount?'<span class="wtb-ts-have-note">+'+haveCount+' já tenho</span>':'')
        +'</div></div>';
    }).join('')+'</div>':'';

    return '<div class="mk-card wtb-card wtb-talent-card wtb-card--clickable" data-wtb-id="'+_esc(listing.id)+'" data-updated="'+_esc(listing.updated_at||'')+'" style="--tc:'+meta.color+'" onclick="WTBRender&&WTBRender.openDetail(\''+_esc(listing.id)+'\')">'
      +'<div class="wtb-card-badge wtb-card-badge--talent">'+meta.icon+' '+meta.label+'</div>'
      +'<div class="wtb-card-open-hint">👁️ ver itens</div>'

      +'<div class="wtb-talent-card-header">'
      +'<div class="wtb-talent-card-pkg-name">'+_esc(pkgName)+'</div>'
      +(totalHave>0?'<div class="wtb-talent-card-have-summary">'+totalHave+' item'+(totalHave>1?'ns':'')+' já tenho</div>':'')
      +'</div>'

      +slotsHtml

      +(listing.observations?'<div class="wtb-obs wtb-obs--talent">'+_esc(listing.observations)+'</div>':'')

      +'<div class="mk-card-footer"><div class="wtb-payment">'+_paymentHtml(listing)+'</div><span class="mk-card-time">'+_timeAgo(listing.created_at)+'</span></div>'
      +_actionHtml(listing,isOwner)
      +'</div>';
  }

  // ================================================================
  // Filtros
  // ================================================================
  function _applyFilters(listings, filters){
    return (listings||[]).filter(function(l){
      // Modo "Minhas procuras": mostra todos os status (inclui expiradas), só aplica busca
      if (filters.mine){
        if (l.status==='deleted') return false;
        if (filters.search){ var qm=filters.search.toLowerCase(); if (!(l.pokemon_name||l.package_name||'').toLowerCase().includes(qm)) return false; }
        return true;
      }
      if (l.status!=='active') return false;
      if (filters.type&&filters.type!=='all'&&l.listing_type!==filters.type) return false;
      if (filters.ball&&filters.ball!=='all'&&l.listing_type==='pokemon'&&l.ball_type!==filters.ball) return false;
      if (filters.search){ var q=filters.search.toLowerCase(); if (!(l.pokemon_name||l.package_name||'').toLowerCase().includes(q)) return false; }
      return true;
    });
  }

  // ================================================================
  // Render principal
  // ================================================================
  function render(listings, filters){
    var container=global.document.getElementById('wtb-list');
    if (!container) return;

    // Mostra/esconde filtros de bola
    var ballFilters=global.document.getElementById('wtb-ball-filters');
    if (ballFilters){ var showBalls=!filters||!filters.type||filters.type==='all'||filters.type==='pokemon'; ballFilters.style.display=showBalls?'':'none'; }

    var state=global.WTB&&global.WTB.state;
    if (state&&state.loading){ container.innerHTML='<div class="mk-loading"><div class="mk-spinner"></div></div>'; return; }

    var user=_user(), userId=user?user.id:null, admin=_isAdmin();
    var filtered=_applyFilters(listings||[],filters||{});

    if (!filtered.length){
      container.innerHTML='<div class="mk-empty"><div class="mk-empty-icon">🔍</div>'
        +'<div class="mk-empty-title">Nenhuma procura encontrada</div>'
        +'<div class="mk-empty-sub">'+((listings&&listings.length)?'Tente mudar os filtros.':'Seja o primeiro a criar uma procura!')+'</div></div>';
      return;
    }

    container.innerHTML=filtered.map(function(l){
      return l.listing_type==='talent'?_buildTalentCard(l,userId,admin):_buildPokemonCard(l,userId,admin);
    }).join('');
  }

  // ================================================================
  // Detalhe (modal) — itens organizados por slot
  // ================================================================
  var _detailEl=null;

  function _fmtDlNum(dl){
    dl=Number(dl)||0;
    if (dl>=1000000) return (Math.round(dl/10000)/100)+' KK';
    if (dl>=1000)    return (Math.round(dl/10)/100)+' K';
    return dl+' DL';
  }

  function _ensureDetailEl(){
    if (!_detailEl){
      _detailEl=global.document.createElement('div');
      _detailEl.className='wtb-detail-overlay';
      _detailEl.addEventListener('click',function(e){ if (e.target===_detailEl) closeDetail(); });
      global.document.body.appendChild(_detailEl);
    }
    return _detailEl;
  }

  function _detailTalentBody(listing){
    var slots=Array.isArray(listing.slots_data)?listing.slots_data:[];
    var grandTotal=0;

    var slotsHtml=slots.map(function(slot){
      var items=(slot.items||[]);
      var need=items.filter(function(i){return i.qty>0;});
      var have=items.filter(function(i){return i.qty===0;});

      var needHtml=need.map(function(i){
        var unit=Number(i.price_dl)||0;
        var line=unit*(Number(i.qty)||0);
        grandTotal+=line;
        return '<div class="wtb-dt-item">'
          +'<span class="wtb-dt-item-qty">×'+i.qty+'</span>'
          +'<span class="wtb-dt-item-name">'+_esc(i.name)+'</span>'
          +'<span class="wtb-dt-item-price">'+(unit>0?_fmtDlNum(unit)+'/un':'—')+'</span>'
          +'<span class="wtb-dt-item-total">'+(line>0?_fmtDlNum(line):'—')+'</span>'
          +'</div>';
      }).join('');

      var haveHtml=have.length
        ?'<div class="wtb-dt-have">já tenho: '+have.map(function(i){return _esc(i.name);}).join(', ')+'</div>'
        :'';

      return '<div class="wtb-dt-slot'+(need.length?'':' wtb-dt-slot--done')+'">'
        +'<div class="wtb-dt-slot-head"><span class="wtb-dt-slot-num">Slot '+(slot.slot_index+1)+'</span>'
        +(need.length?'':'<span class="wtb-ts-done">✓ Completo</span>')+'</div>'
        +(need.length?'<div class="wtb-dt-items">'+needHtml+'</div>':'')
        +haveHtml
        +'</div>';
    }).join('');

    var totalHtml=grandTotal>0
      ?'<div class="wtb-dt-grandtotal"><span>Total estimado dos itens</span><strong>'+_fmtDlNum(grandTotal)+'</strong></div>'
      :'';

    return slotsHtml+totalHtml;
  }

  function _detailPokemonBody(listing){
    var sprites=_spriteUrl(listing.pokemon_name);
    var tier=_getTier(listing.pokemon_name);
    var spriteHtml=sprites?'<img class="mk-sprite" src="'+_esc(sprites.animated)+'" data-static="'+_esc(sprites.static)+'" alt="'+_esc(listing.pokemon_name||'')+'" onerror="this.src=this.dataset.static;this.onerror=null">':'<div class="mk-sprite-fallback">🔍</div>';
    return '<div class="wtb-dt-poke">'
      +'<div class="mk-sprite-wrap">'+spriteHtml+'</div>'
      +'<div class="wtb-dt-poke-info">'
      +'<div class="mk-card-name-row"><span class="mk-card-name">'+_esc(listing.pokemon_name)+'</span>'+_tierBadgeHtml(tier)+'</div>'
      +_starsHtml(listing.stars)+_typesHtml(listing.pokemon_types)
      +'<div class="wtb-ball-row">'+_ballPillHtml(listing.ball_type)+'</div>'
      +'</div></div>';
  }

  function openDetail(id){
    var state=global.WTB&&global.WTB.state;
    var listing=state&&(state.listings||[]).filter(function(x){return x.id===id;})[0];
    if (!listing) return;

    var user=_user(), userId=user?user.id:null;
    var isOwner=!!(userId&&listing.buyer_id===userId);
    var isTalent=listing.listing_type==='talent';

    var title, badgeClass, accent;
    if (isTalent){
      var group=_pkgGroup(listing.package_name||'');
      var meta=PKG_GROUP_META[group];
      title=meta.icon+' '+_esc(listing.package_name||'Talento');
      badgeClass='wtb-card-badge--talent';
      accent=meta.color;
    } else {
      title='🔍 '+_esc(listing.pokemon_name||'Pokémon');
      accent='#63b3ed';
    }

    var body=isTalent?_detailTalentBody(listing):_detailPokemonBody(listing);

    var el=_ensureDetailEl();
    el.innerHTML='<div class="wtb-detail-modal" style="--tc:'+accent+'">'
      +'<button class="wtb-detail-close" onclick="WTBRender&&WTBRender.closeDetail()">✕</button>'
      +'<div class="wtb-detail-header"><h3 class="wtb-detail-title">'+title+'</h3>'
      +'<span class="wtb-detail-time">'+_timeAgo(listing.created_at)+'</span></div>'
      +'<div class="wtb-detail-body">'+body+'</div>'
      +(listing.observations?'<div class="wtb-detail-obs"><span class="wtb-detail-obs-label">Observações</span>'+_esc(listing.observations)+'</div>':'')
      +'<div class="wtb-detail-pay"><span class="wtb-detail-pay-label">Pagamento oferecido</span><div class="wtb-payment">'+_paymentHtml(listing)+'</div></div>'
      +'<div class="wtb-detail-footer">'+_actionHtml(listing,isOwner)+'</div>'
      +'</div>';
    el.style.display='flex';
  }

  function closeDetail(){ if (_detailEl) _detailEl.style.display='none'; }

  // Fecha com ESC
  global.document.addEventListener('keydown',function(e){
    if (e.key==='Escape'&&_detailEl&&_detailEl.style.display==='flex') closeDetail();
  });

  global.WTBRender={render:render,openDetail:openDetail,closeDetail:closeDetail};
  console.log('[WTB] wtb-render.js carregado');
}(window));
