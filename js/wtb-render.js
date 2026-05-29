// ============================================================
// wtb-render.js — Renderização dos cards de Procura (WTB)
// ============================================================

;(function (global) {
  'use strict';
  if (global.WTBRender) return;

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function _user()    { return typeof Session !== 'undefined' ? Session.getCurrentUser() : null; }
  function _isAdmin() { return typeof Session !== 'undefined' && Session.isAdmin && Session.isAdmin(); }

  var BALL_META = {
    ultra:    { label: 'Ultra Ball',    color: '#f5c518', border: '#f5c518', glow: 'rgba(245,197,24,0.40)' },
    premier:  { label: 'Premier Ball',  color: '#e8e8e8', border: '#cfd3dc', glow: 'rgba(232,232,232,0.30)' },
    alliance: { label: 'Alliance Ball', color: '#b67fff', border: '#7c6aff', glow: 'rgba(124,106,255,0.45)' },
  };

  // ── Sprite ────────────────────────────────────────────────────
  function _spriteUrl(name) {
    if (!name) return null;
    if (typeof getSprites === 'function') {
      try { return getSprites(name); } catch (_) {}
    }
    var isShiny = /^shiny\s+/i.test(name);
    var base = name.replace(/^shiny\s+/i, '').toLowerCase().replace(/\s+/g, '').replace(/['’]/g, '');
    return {
      animated: (isShiny ? 'https://play.pokemonshowdown.com/sprites/gen5ani-shiny/' : 'https://play.pokemonshowdown.com/sprites/gen5ani/') + base + '.gif',
      static:   (isShiny ? 'https://play.pokemonshowdown.com/sprites/dex-shiny/'     : 'https://play.pokemonshowdown.com/sprites/dex/')     + base + '.png',
    };
  }

  // ── Tier ─────────────────────────────────────────────────────
  function _getTier(name) {
    if (global.getTierByName) return global.getTierByName(name);
    var data = typeof TIER_DATA !== 'undefined' ? TIER_DATA : null;
    if (!name || !data) return null;
    var q = String(name).trim().toLowerCase();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === q) return data[i][1];
    }
    return null;
  }

  function _tierBadgeHtml(tier) {
    var cfg = (typeof TIER_CONFIG !== 'undefined' && tier) ? TIER_CONFIG[tier] : null;
    if (!cfg) return '';
    var glow = cfg.glow || (cfg.color + '66');
    return '<span class="mk-tier-badge" style="color:' + cfg.color
      + ';border-color:' + cfg.color
      + ';background:' + (cfg.bg || cfg.color + '1f')
      + ';box-shadow:0 0 12px ' + glow + ',inset 0 0 10px ' + cfg.color + '22'
      + ';text-shadow:0 0 8px ' + glow + '">'
      + _esc(cfg.label) + '</span>';
  }

  // ── Tipos ─────────────────────────────────────────────────────
  function _typesHtml(types) {
    if (!types || !types.length) return '';
    return '<div class="mk-types">'
      + types.map(function (t) {
          return '<span class="mk-type-badge mk-type--' + _esc(t.toLowerCase()) + '">' + _esc(t) + '</span>';
        }).join('')
      + '</div>';
  }

  // ── Stars ─────────────────────────────────────────────────────
  function _starsHtml(stars) {
    if (!stars) return '';
    var out = '';
    for (var i = 1; i <= 5; i++)
      out += '<span class="mk-star' + (i <= stars ? ' mk-star--lit' : '') + '">★</span>';
    return '<div class="mk-stars">' + out + '</div>';
  }

  // ── Bola ──────────────────────────────────────────────────────
  function _ballPillHtml(ballType) {
    if (!ballType) return '<span class="wtb-ball-any">⚪ Qualquer bola</span>';
    var m = BALL_META[ballType];
    if (!m) return '';
    return '<span class="mk-ball-pill" style="color:' + m.color
      + ';border-color:' + m.border + '66;background:' + m.color + '14">'
      + '<span>' + _esc(m.label) + '</span></span>';
  }

  // ── Pagamento ─────────────────────────────────────────────────
  function _paymentHtml(l) {
    var parts = [];
    if (l.pay_kk) {
      var kk = l.pay_kk;
      var fmt = (typeof formatKK === 'function') ? formatKK(kk) : null;
      parts.push('<span class="wtb-pay-chip wtb-pay-kk">'
        + '<span class="mk-price-coin">◈</span>'
        + _esc(fmt ? fmt.label : (Math.round(kk / 1000) + 'k'))
        + '</span>');
    }
    if (l.pay_dd) {
      parts.push('<span class="wtb-pay-chip wtb-pay-dd">💎 '
        + _esc(Number(l.pay_dd).toLocaleString('pt-BR')) + ' DD</span>');
    }
    if (l.pay_brl) {
      parts.push('<span class="wtb-pay-chip wtb-pay-brl">💵 R$ '
        + _esc(Number(l.pay_brl).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
        + '</span>');
    }
    return parts.join('') || '<span class="wtb-ball-any">—</span>';
  }

  // ── Tempo ─────────────────────────────────────────────────────
  function _timeAgo(iso) {
    if (!iso) return '';
    var ms = Date.now() - new Date(iso).getTime();
    if (ms < 60000)  return 'agora mesmo';
    var m = Math.floor(ms / 60000);
    if (m < 60)  return m + 'm atrás';
    var h = Math.floor(m / 60);
    if (h < 24)  return h + 'h atrás';
    return Math.floor(h / 24) + 'd atrás';
  }

  // ── Card HTML ─────────────────────────────────────────────────
  function _buildCard(listing, userId, isAdmin) {
    var isOwner  = !!(userId && listing.buyer_id === userId);
    var sprites  = _spriteUrl(listing.pokemon_name);
    var tier     = _getTier(listing.pokemon_name);
    var ballMeta = BALL_META[listing.ball_type] || null;

    var spriteHtml = sprites
      ? '<img class="mk-sprite" loading="lazy"'
        + ' src="' + _esc(sprites.animated) + '"'
        + ' data-static="' + _esc(sprites.static) + '"'
        + ' alt="' + _esc(listing.pokemon_name || '') + '"'
        + ' onerror="this.src=this.dataset.static;this.onerror=null">'
      : '<div class="mk-sprite-fallback">🔍</div>';

    var actionHtml;
    if (isOwner) {
      actionHtml = '<div class="mk-card-actions">'
        + '<button class="mk-btn mk-btn--danger-ghost mk-btn--sm"'
        + ' onclick="event.stopPropagation();WTBCreate&&WTBCreate.cancel(\'' + _esc(listing.id) + '\')">'
        + '✕ Cancelar</button>'
        + '</div>';
    } else {
      actionHtml = '<div class="mk-card-negotiate">'
        + '<button class="mk-btn mk-btn--primary mk-btn--negotiate"'
        + ' onclick="event.stopPropagation();WTBChat&&WTBChat.open(\''
        + _esc(listing.id) + '\',\'' + _esc(listing.buyer_id) + '\')">'
        + '💬 Tenho isso!</button>'
        + '</div>';
    }

    return '<div class="mk-card wtb-card"'
      + ' data-wtb-id="' + _esc(listing.id) + '"'
      + ' data-updated="' + _esc(listing.updated_at || '') + '"'
      + (ballMeta ? ' style="--mk-ball:' + ballMeta.border + ';--mk-ball-glow:' + ballMeta.glow + '"' : '')
      + '>'

      + '<div class="wtb-card-badge">🔍 Procurando</div>'

      + '<div class="mk-card-top">'
      + (listing.boost ? '<span class="mk-card-boost mk-card-boost--high">+' + _esc(String(listing.boost)) + '</span>' : '')
      + '<div class="mk-sprite-wrap">' + spriteHtml + '</div>'
      + _starsHtml(listing.stars)
      + _typesHtml(listing.pokemon_types)
      + '</div>'

      + '<div class="mk-card-body">'
      + '<div class="mk-card-name-row">'
      + '<span class="mk-card-name">' + _esc(listing.pokemon_name) + '</span>'
      + _tierBadgeHtml(tier)
      + '</div>'
      + '<div class="wtb-ball-row">' + _ballPillHtml(listing.ball_type) + '</div>'
      + (listing.observations ? '<div class="wtb-obs">' + _esc(listing.observations) + '</div>' : '')
      + '</div>'

      + '<div class="mk-card-footer">'
      + '<div class="wtb-payment">' + _paymentHtml(listing) + '</div>'
      + '<span class="mk-card-time">' + _timeAgo(listing.created_at) + '</span>'
      + '</div>'

      + actionHtml

      + '</div>'; // .mk-card
  }

  // ── Filtros ───────────────────────────────────────────────────
  function _applyFilters(listings, filters) {
    return (listings || []).filter(function (l) {
      if (l.status !== 'active') return false;
      if (filters.ball && filters.ball !== 'all') {
        if (filters.ball === 'none') { if (l.ball_type) return false; }
        else { if (l.ball_type !== filters.ball) return false; }
      }
      if (filters.search) {
        var q = filters.search.toLowerCase();
        if (!(l.pokemon_name || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  // ── Render principal ──────────────────────────────────────────
  function render(listings, filters) {
    var container = global.document.getElementById('wtb-list');
    if (!container) return;

    var state = global.WTB && global.WTB.state;
    if (state && state.loading) {
      container.innerHTML = '<div class="mk-loading"><div class="mk-spinner"></div></div>';
      return;
    }

    var user     = _user();
    var userId   = user ? user.id : null;
    var isAdmin  = _isAdmin();
    var filtered = _applyFilters(listings || [], filters || {});

    if (!filtered.length) {
      container.innerHTML = '<div class="mk-empty">'
        + '<div class="mk-empty-icon">🔍</div>'
        + '<div class="mk-empty-title">Nenhuma procura encontrada</div>'
        + '<div class="mk-empty-sub">'
        + ((listings && listings.length) ? 'Tente mudar os filtros.' : 'Seja o primeiro a criar uma procura!')
        + '</div></div>';
      return;
    }

    container.innerHTML = filtered.map(function (l) {
      return _buildCard(l, userId, isAdmin);
    }).join('');
  }

  global.WTBRender = { render: render };
  console.log('[WTB] wtb-render.js carregado');
}(window));
