// ============================================================
// wtb-render.js — Cards de Procura (Pokémon + Talento)
// ============================================================

;(function (global) {
  'use strict';
  if (global.WTBRender) return;

  function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _user()    { return typeof Session !== 'undefined' ? Session.getCurrentUser() : null; }
  function _isAdmin() { return typeof Session !== 'undefined' && Session.isAdmin && Session.isAdmin(); }

  var BALL_META = {
    ultra:    { label:'Ultra Ball',    color:'#f5c518', border:'#f5c518', glow:'rgba(245,197,24,0.40)' },
    premier:  { label:'Premier Ball',  color:'#e8e8e8', border:'#cfd3dc', glow:'rgba(232,232,232,0.30)' },
    alliance: { label:'Alliance Ball', color:'#b67fff', border:'#7c6aff', glow:'rgba(124,106,255,0.45)' },
  };

  var TALENT_TYPE_META = {
    talents: { label:'Talents', color:'#a78bfa', bg:'rgba(167,139,250,0.10)', icon:'⚡' },
    gym:     { label:'Gym',     color:'#34d399', bg:'rgba(52,211,153,0.10)',   icon:'🏟️' },
    reduces: { label:'Reduces', color:'#fb7185', bg:'rgba(251,113,133,0.10)',  icon:'🔻' },
    any:     { label:'Qualquer',color:'#94a3b8', bg:'rgba(148,163,184,0.10)',  icon:'🎯' },
  };

  // ── Sprite ────────────────────────────────────────────────────
  function _spriteUrl(name) {
    if (!name) return null;
    if (typeof getSprites === 'function') { try { return getSprites(name); } catch(_) {} }
    var isShiny = /^shiny\s+/i.test(name);
    var base = name.replace(/^shiny\s+/i,'').toLowerCase().replace(/\s+/g,'').replace(/['']/g,'');
    return {
      animated: (isShiny?'https://play.pokemonshowdown.com/sprites/gen5ani-shiny/':'https://play.pokemonshowdown.com/sprites/gen5ani/')+base+'.gif',
      static:   (isShiny?'https://play.pokemonshowdown.com/sprites/dex-shiny/':'https://play.pokemonshowdown.com/sprites/dex/')+base+'.png',
    };
  }

  // ── Tier ─────────────────────────────────────────────────────
  function _getTier(name) {
    if (global.getTierByName) return global.getTierByName(name);
    var data = typeof TIER_DATA !== 'undefined' ? TIER_DATA : null;
    if (!name || !data) return null;
    var q = String(name).trim().toLowerCase();
    for (var i=0;i<data.length;i++) if (String(data[i][0]).trim().toLowerCase()===q) return data[i][1];
    return null;
  }
  function _tierBadgeHtml(tier) {
    var cfg = (typeof TIER_CONFIG !== 'undefined' && tier) ? TIER_CONFIG[tier] : null;
    if (!cfg) return '';
    var glow = cfg.glow||(cfg.color+'66');
    return '<span class="mk-tier-badge" style="color:'+cfg.color+';border-color:'+cfg.color
      +';background:'+(cfg.bg||cfg.color+'1f')+';box-shadow:0 0 12px '+glow+',inset 0 0 10px '+cfg.color+'22'
      +';text-shadow:0 0 8px '+glow+'">'+_esc(cfg.label)+'</span>';
  }

  // ── Helpers visuais ───────────────────────────────────────────
  function _typesHtml(types) {
    if (!types||!types.length) return '';
    return '<div class="mk-types">'+types.map(function(t){
      return '<span class="mk-type-badge mk-type--'+_esc(t.toLowerCase())+'">'+_esc(t)+'</span>';
    }).join('')+'</div>';
  }
  function _starsHtml(stars) {
    if (!stars) return '';
    var out='';
    for (var i=1;i<=5;i++) out+='<span class="mk-star'+(i<=stars?' mk-star--lit':'')+'">★</span>';
    return '<div class="mk-stars">'+out+'</div>';
  }
  function _ballPillHtml(ballType) {
    if (!ballType) return '<span class="wtb-ball-any">⚪ Qualquer bola</span>';
    var m = BALL_META[ballType];
    if (!m) return '';
    return '<span class="mk-ball-pill" style="color:'+m.color+';border-color:'+m.border+'66;background:'+m.color+'14"><span>'+_esc(m.label)+'</span></span>';
  }
  function _paymentHtml(l) {
    var parts=[];
    if (l.pay_kk) {
      var fmt = (typeof formatKK==='function') ? formatKK(l.pay_kk) : null;
      parts.push('<span class="wtb-pay-chip wtb-pay-kk"><span class="mk-price-coin">◈</span>'+_esc(fmt?fmt.label:Math.round(l.pay_kk/1000)+'k')+'</span>');
    }
    if (l.pay_dd)  parts.push('<span class="wtb-pay-chip wtb-pay-dd">💎 '+_esc(Number(l.pay_dd).toLocaleString('pt-BR'))+' DD</span>');
    if (l.pay_brl) parts.push('<span class="wtb-pay-chip wtb-pay-brl">💵 R$ '+_esc(Number(l.pay_brl).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}))+'</span>');
    return parts.join('')||'<span class="wtb-ball-any">—</span>';
  }
  function _timeAgo(iso) {
    if (!iso) return '';
    var ms = Date.now()-new Date(iso).getTime();
    if (ms<60000) return 'agora mesmo';
    var m=Math.floor(ms/60000); if (m<60) return m+'m atrás';
    var h=Math.floor(m/60);     if (h<24) return h+'h atrás';
    return Math.floor(h/24)+'d atrás';
  }
  function _actionHtml(listing, isOwner) {
    if (isOwner) {
      return '<div class="mk-card-actions">'
        +'<button class="mk-btn mk-btn--danger-ghost mk-btn--sm"'
        +' onclick="event.stopPropagation();WTBCreate&&WTBCreate.cancel(\''+_esc(listing.id)+'\')">✕ Cancelar</button>'
        +'</div>';
    }
    return '<div class="mk-card-negotiate">'
      +'<button class="mk-btn mk-btn--primary mk-btn--negotiate"'
      +' onclick="event.stopPropagation();WTBChat&&WTBChat.open(\''+_esc(listing.id)+'\',\''+_esc(listing.buyer_id)+'\')">💬 Tenho isso!</button>'
      +'</div>';
  }

  // ================================================================
  // Card: Pokémon
  // ================================================================
  function _buildPokemonCard(listing, userId, isAdmin) {
    var isOwner  = !!(userId && listing.buyer_id===userId);
    var sprites  = _spriteUrl(listing.pokemon_name);
    var tier     = _getTier(listing.pokemon_name);
    var ballMeta = BALL_META[listing.ball_type]||null;

    var spriteHtml = sprites
      ? '<img class="mk-sprite" loading="lazy" src="'+_esc(sprites.animated)+'"'
        +' data-static="'+_esc(sprites.static)+'" alt="'+_esc(listing.pokemon_name||'')+'"'
        +' onerror="this.src=this.dataset.static;this.onerror=null">'
      : '<div class="mk-sprite-fallback">🔍</div>';

    return '<div class="mk-card wtb-card"'
      +' data-wtb-id="'+_esc(listing.id)+'"'
      +' data-updated="'+_esc(listing.updated_at||'')+'"'
      +(ballMeta?' style="--mk-ball:'+ballMeta.border+';--mk-ball-glow:'+ballMeta.glow+'"':'')+'>'

      +'<div class="wtb-card-badge">🔍 Pokémon</div>'

      +'<div class="mk-card-top">'
      +'<div class="mk-sprite-wrap">'+spriteHtml+'</div>'
      +_starsHtml(listing.stars)
      +_typesHtml(listing.pokemon_types)
      +'</div>'

      +'<div class="mk-card-body">'
      +'<div class="mk-card-name-row"><span class="mk-card-name">'+_esc(listing.pokemon_name)+'</span>'+_tierBadgeHtml(tier)+'</div>'
      +'<div class="wtb-ball-row">'+_ballPillHtml(listing.ball_type)+'</div>'
      +(listing.observations?'<div class="wtb-obs">'+_esc(listing.observations)+'</div>':'')
      +'</div>'

      +'<div class="mk-card-footer">'
      +'<div class="wtb-payment">'+_paymentHtml(listing)+'</div>'
      +'<span class="mk-card-time">'+_timeAgo(listing.created_at)+'</span>'
      +'</div>'

      +_actionHtml(listing, isOwner)
      +'</div>';
  }

  // ================================================================
  // Card: Talento
  // ================================================================
  function _buildTalentCard(listing, userId, isAdmin) {
    var isOwner = !!(userId && listing.buyer_id===userId);
    var tMeta   = TALENT_TYPE_META[listing.talent_type] || TALENT_TYPE_META.any;
    var tier    = listing.pokemon_name ? _getTier(listing.pokemon_name) : null;

    var slotsLabel = '';
    if (listing.talent_full)        slotsLabel = 'Completo (8/8)';
    else if (listing.talent_slots)  slotsLabel = listing.talent_slots+'/8 slots mínimos';
    else                            slotsLabel = 'Qualquer completude';

    var pokeHtml = listing.pokemon_name
      ? '<div class="wtb-talent-poke-row">'
        +'<span class="wtb-talent-poke-label">Para:</span>'
        +'<span class="mk-card-name" style="font-size:.85rem">'+_esc(listing.pokemon_name)+'</span>'
        +_tierBadgeHtml(tier)
        +'</div>'
      : '<div class="wtb-talent-poke-row"><span class="wtb-talent-any-poke">Qualquer Pokémon</span></div>';

    return '<div class="mk-card wtb-card wtb-talent-card"'
      +' data-wtb-id="'+_esc(listing.id)+'"'
      +' data-updated="'+_esc(listing.updated_at||'')+'"'
      +' style="--tc:'+tMeta.color+'">'

      +'<div class="wtb-card-badge wtb-card-badge--talent">🎯 Talento</div>'

      +'<div class="wtb-talent-header">'
      +'<span class="wtb-talent-type-pill" style="color:'+tMeta.color+';background:'+tMeta.bg+';border-color:'+tMeta.color+'44">'
      +tMeta.icon+' '+_esc(tMeta.label)
      +'</span>'
      +'</div>'

      +pokeHtml

      +'<div class="wtb-talent-slots-row">'
      +'<span class="wtb-talent-slots-icon">📊</span>'
      +'<span class="wtb-talent-slots-label">'+_esc(slotsLabel)+'</span>'
      +'</div>'

      +(listing.observations?'<div class="wtb-obs">'+_esc(listing.observations)+'</div>':'')

      +'<div class="mk-card-footer">'
      +'<div class="wtb-payment">'+_paymentHtml(listing)+'</div>'
      +'<span class="mk-card-time">'+_timeAgo(listing.created_at)+'</span>'
      +'</div>'

      +_actionHtml(listing, isOwner)
      +'</div>';
  }

  // ================================================================
  // Filtros
  // ================================================================
  function _applyFilters(listings, filters) {
    return (listings||[]).filter(function(l) {
      if (l.status !== 'active') return false;
      // Tipo (pokemon / talent / all)
      if (filters.type && filters.type !== 'all' && l.listing_type !== filters.type) return false;
      // Bola (só para pokémon)
      if (filters.ball && filters.ball !== 'all' && l.listing_type === 'pokemon') {
        if (l.ball_type !== filters.ball) return false;
      }
      // Busca por nome
      if (filters.search) {
        var q = filters.search.toLowerCase();
        if (!(l.pokemon_name||'').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  // ================================================================
  // Render principal
  // ================================================================
  function render(listings, filters) {
    var container = global.document.getElementById('wtb-list');
    if (!container) return;

    // Mostra/esconde filtros de bola dependendo do tipo selecionado
    var ballFilters = global.document.getElementById('wtb-ball-filters');
    if (ballFilters) {
      var showBalls = !filters || !filters.type || filters.type === 'all' || filters.type === 'pokemon';
      ballFilters.style.display = showBalls ? '' : 'none';
    }

    var state = global.WTB && global.WTB.state;
    if (state && state.loading) {
      container.innerHTML = '<div class="mk-loading"><div class="mk-spinner"></div></div>';
      return;
    }

    var user     = _user();
    var userId   = user ? user.id : null;
    var admin    = _isAdmin();
    var filtered = _applyFilters(listings||[], filters||{});

    if (!filtered.length) {
      var isFiltered = listings && listings.length > 0;
      container.innerHTML = '<div class="mk-empty">'
        +'<div class="mk-empty-icon">🔍</div>'
        +'<div class="mk-empty-title">Nenhuma procura encontrada</div>'
        +'<div class="mk-empty-sub">'+(isFiltered?'Tente mudar os filtros.':'Seja o primeiro a criar uma procura!')+'</div>'
        +'</div>';
      return;
    }

    container.innerHTML = filtered.map(function(l) {
      return l.listing_type === 'talent'
        ? _buildTalentCard(l, userId, admin)
        : _buildPokemonCard(l, userId, admin);
    }).join('');
  }

  global.WTBRender = { render:render };
  console.log('[WTB] wtb-render.js carregado');
}(window));
