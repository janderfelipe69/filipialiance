// ============================================================
// marketplace-render.js — Filipi Marketplace M2
// PokeAlliance Shop
//
// RESPONSABILIDADES:
//   • Cards premium com owner actions (Editar/Cancelar)
//   • Morph incremental (sem recriar cards estáveis)
//   • Lazy render via PA.hardening.observeCard
//   • Sprite automática (getSprites de tierlist-popup.js)
//   • Formatação de preço (formatKK de app.js)
//   • Ownership check via Session.getCurrentUser()
// ============================================================

;(function (global) {
  'use strict';

  if (global.MarketplaceRender) return; // singleton

  var _log  = function () { console.log.apply(console,  ['[PA.marketplace.render]'].concat(Array.prototype.slice.call(arguments))); };
  var _warn = function () { console.warn.apply(console, ['[PA.marketplace.render ⚠]'].concat(Array.prototype.slice.call(arguments))); };

  function _tel(cat, data) { if (global.PA && global.PA.telemetry) global.PA.telemetry.push(cat, data); }
  function _esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _user() { return typeof Session !== 'undefined' ? Session.getCurrentUser() : null; }
  function _isAdmin() { return typeof Session !== 'undefined' && Session.isAdmin && Session.isAdmin(); }

  // ── Sprite URL ────────────────────────────────────────────────
  function _spriteUrl(pokemonName) {
    if (!pokemonName) return null;
    if (typeof getSprites === 'function') {
      try { return getSprites(pokemonName); } catch (_) {}
    }
    var isShiny = /^shiny\s+/i.test(pokemonName);
    var base = pokemonName.replace(/^shiny\s+/i, '').toLowerCase()
      .replace(/\s+/g, '').replace(/['\u2019]/g, '');
    return {
      animated: (isShiny ? 'https://play.pokemonshowdown.com/sprites/gen5ani-shiny/' : 'https://play.pokemonshowdown.com/sprites/gen5ani/') + base + '.gif',
      static:   (isShiny ? 'https://play.pokemonshowdown.com/sprites/dex-shiny/'     : 'https://play.pokemonshowdown.com/sprites/dex/')     + base + '.png',
    };
  }

  // ── Tier lookup ───────────────────────────────────────────────
  var _STAR_BONUS = {
    'T7': 1, 'T6': 1, 'T5': 1, 'T4': 2,
    'T3': 2, 'T2': 4, 'T1': 6,
    'Super Rare': 8, 'Ultra Rare': 10, 'Legendary': 15, 'Mythic': 20,
  };

  function _getTier(name) {
    if (!name || typeof TIER_DATA === 'undefined') return null;
    for (var i = 0; i < TIER_DATA.length; i++) {
      if (TIER_DATA[i][0] === name) return TIER_DATA[i][1];
    }
    return null;
  }

  function _tierBadgeHtml(tier) {
    if (!tier || typeof TIER_CONFIG === 'undefined') return '';
    var cfg = TIER_CONFIG[tier];
    if (!cfg) return '';
    return '<span class="mk-tier-badge" style="color:' + cfg.color
      + ';border-color:' + cfg.color + '55;background:' + cfg.color + '14">'
      + _esc(cfg.label) + '</span>';
  }

  // ── Boost class ───────────────────────────────────────────────
  function _boostClass(boost) {
    if (!boost) return 'mk-card-boost--low';
    if (boost < 25)  return 'mk-card-boost--mid';
    if (boost < 50)  return 'mk-card-boost--high';
    return 'mk-card-boost--max';
  }

  // ── Stars HTML (with ATK bonus) ───────────────────────────────
  function _starsHtml(stars, tier) {
    var out = '';
    for (var i = 1; i <= 5; i++)
      out += '<span class="mk-star' + (i <= (stars || 0) ? ' mk-star--lit' : '') + '">★</span>';
    var bonus = (stars && tier && _STAR_BONUS[tier]) ? stars * _STAR_BONUS[tier] : 0;
    var bonusHtml = bonus ? '<span class="mk-stars-bonus">+' + bonus + '% ATK</span>' : '';
    return '<div class="mk-stars">' + out + bonusHtml + '</div>';
  }

  // ── Types badges ──────────────────────────────────────────────
  function _typesHtml(types) {
    if (!types || !types.length) return '';
    return '<div class="mk-types">'
      + types.map(function(t){
          return '<span class="mk-type-badge mk-type--' + _esc(t.toLowerCase()) + '">' + _esc(t) + '</span>';
        }).join('')
      + '</div>';
  }

  // ── Held chip with image + tooltip ───────────────────────────
  function _heldChip(held, label) {
    var slotClass = label === 'X' ? 'mk-held-chip--x' : 'mk-held-chip--y';

    if (!held) {
      return '<div class="mk-held-chip ' + slotClass + ' mk-held-chip--empty">'
        + '<span class="mk-held-label">' + _esc(label) + '</span>'
        + '<span class="mk-held-empty-icon">—</span>'
        + '</div>';
    }

    var imgSrc = held.sprite_url || '';
    var imgHtml = imgSrc
      ? '<img class="mk-held-icon" src="' + _esc(imgSrc) + '" alt="' + _esc(held.name) + '"'
          + ' onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
          + '<span class="mk-held-icon-fallback" style="display:none">🎯</span>'
      : '<span class="mk-held-icon-fallback">🎯</span>';

    var tooltipDesc = held.description || held.bonus || '';
    var tooltipBonus = held.bonus && held.description ? held.bonus : '';
    var rarityClass = held.rarity ? 'mk-held-rarity--' + held.rarity : '';

    var tooltipHtml = '<div class="mk-held-tooltip">'
      + '<div class="mk-held-tooltip-header">'
      + (imgSrc ? '<img class="mk-held-tooltip-icon" src="' + _esc(imgSrc) + '" alt="" onerror="this.style.display=\'none\'">' : '<span class="mk-held-tooltip-icon-fallback">🎯</span>')
      + '<div>'
      + '<strong class="mk-held-tooltip-name">' + _esc(held.name) + '</strong>'
      + (held.rarity ? '<span class="mk-held-tooltip-rarity ' + rarityClass + '">' + _esc(held.rarity) + '</span>' : '')
      + '</div>'
      + '</div>'
      + (tooltipDesc ? '<p class="mk-held-tooltip-desc">' + _esc(tooltipDesc) + '</p>' : '')
      + (tooltipBonus ? '<p class="mk-held-tooltip-bonus">' + _esc(tooltipBonus) + '</p>' : '')
      + '</div>';

    return '<div class="mk-held-chip ' + slotClass + '">'
      + '<span class="mk-held-label">' + _esc(label) + '</span>'
      + '<div class="mk-held-img-wrap">'
      + imgHtml
      + tooltipHtml
      + '</div>'
      + '<span class="mk-held-name">' + _esc(held.name) + '</span>'
      + '</div>';
  }

  // ── Training bars ─────────────────────────────────────────────
  var TRAIN_STATS = [
    { key:'attack',              label:'ATK'   },
    { key:'defense',             label:'DEF'   },
    { key:'hp',                  label:'HP'    },
    { key:'precision',           label:'PRE'   },
    { key:'evasion',             label:'EVA'   },
    { key:'critical_damage',     label:'C.DMG' },
    { key:'critical_chance',     label:'C.CHC' },
    { key:'critical_resistance', label:'C.RES' },
  ];

  function _trainingHtml(training) {
    if (!training || typeof training !== 'object') return '';
    var rows = TRAIN_STATS
      .filter(function(s) {
        var v = training[s.key];
        if (!v && v !== 0) return false;
        var lv = typeof v === 'object' ? (Number(v.pct) || Number(v.level) || 0) : Number(v) || 0;
        return lv > 0;
      })
      .map(function(s) {
        var v = training[s.key];
        var lv = Math.min(100, Math.max(0,
          typeof v === 'object' ? (Number(v.pct) || Number(v.level) || 0) : Number(v) || 0
        ));
        return '<div class="mk-train-row">'
          + '<span class="mk-train-label">' + _esc(s.label) + '</span>'
          + '<div class="mk-train-bar"><div class="mk-train-fill" style="width:' + lv + '%"></div></div>'
          + '<span class="mk-train-pct">Lv ' + lv + '</span>'
          + '</div>';
      });
    return rows.length ? '<div class="mk-training-mini">' + rows.join('') + '</div>' : '';
  }

  // ── Time ago ──────────────────────────────────────────────────
  function _timeAgo(isoStr) {
    if (!isoStr) return '';
    var ms = Date.now() - new Date(isoStr).getTime();
    if (ms < 60000)   return 'agora mesmo';
    var m = Math.floor(ms / 60000);
    if (m < 60) return m + 'm atrás';
    var h = Math.floor(m / 60);
    if (h < 24) return h + 'h atrás';
    return Math.floor(h / 24) + 'd atrás';
  }

  // ── Build full card HTML ───────────────────────────────────────
  function _buildCardHtml(listing, currentUserId, isAdmin) {
    var isOwner  = !!(currentUserId && listing.seller_id === currentUserId);
    // Debug log (temporary) — remove after confirming ownership is correct in production
    if (global.PA_DEBUG) {
      console.log('[marketplace.ownership]', {
        listingSellerId: listing.seller_id,
        authUserId: currentUserId,
        isOwner: isOwner,
        isAdmin: isAdmin,
      });
    }
    var sprites    = _spriteUrl(listing.pokemon_name);
    var boostCls   = _boostClass(listing.boost);
    var priceLabel = (typeof formatKK === 'function' && listing.price_kk)
      ? formatKK(listing.price_kk) : null;
    var heldX  = listing.helds_x || null;
    var heldY  = listing.helds_y || null;
    var status = listing.status || 'active';
    var tier   = _getTier(listing.pokemon_name);
    var ddNum  = 0;
    if (priceLabel && typeof brlToDd === 'function' && typeof KK_TO_BRL !== 'undefined' && KK_TO_BRL) {
      ddNum = brlToDd(listing.price_kk / 1000000 * KK_TO_BRL);
    }

    var spriteHtml = sprites
      ? '<img class="mk-sprite" loading="lazy"'
        + ' src="' + _esc(sprites.animated) + '"'
        + ' data-static="' + _esc(sprites.static) + '"'
        + ' alt="' + _esc(listing.pokemon_name || '') + '"'
        + ' onerror="this.src=this.dataset.static;this.onerror=null">'
      : '<div class="mk-sprite-fallback">🎴</div>';

    // Negotiate button for non-owner buyers (disabled in locked/sold state)
    var negotiateHtml = '';
    // Admin is a normal buyer for listings they don't own (Bug 3 fix)
    var canNegotiate = !isOwner && status === 'active';
    if (canNegotiate) {
      var isLocked = false; // M4.1: no more negotiating status
      negotiateHtml = '<div class="mk-card-negotiate">'
        + '<button class="mk-btn mk-btn--primary mk-btn--negotiate"'
        + (isLocked ? ' disabled' : '')
        + ' onclick="event.stopPropagation();MarketplaceTrade&&MarketplaceTrade.startNegotiation(\'' + _esc(listing.id) + '\')">'
        + (isLocked ? '⏳ Em negociação' : '🤝 Negociar')
        + '</button></div>';
    }

    // Owner-only action buttons (Edit / Cancel)
    // Admin is NOT owner — admin moderation tools are separate (future admin panel)
    var actionsHtml = '';
    if (isOwner) {
      actionsHtml = '<div class="mk-card-actions">'
        + '<button class="mk-btn mk-btn--ghost mk-btn--sm" '
        + 'onclick="event.stopPropagation();MarketplaceCreate&&MarketplaceCreate.openEdit(' + _esc(JSON.stringify({
            id: listing.id,
            pokemon_name: listing.pokemon_name,
            pokemon_slug: listing.pokemon_slug,
            pokemon_types: listing.pokemon_types,
            stars: listing.stars,
            boost: listing.boost,
            held_x_id: listing.held_x_id,
            held_y_id: listing.held_y_id,
            training: listing.training,
            price_kk: listing.price_kk,
            observations: listing.observations,
          })) + ')">✏️ Editar</button>'
        + '<button class="mk-btn mk-btn--danger-ghost mk-btn--sm" '
        + 'onclick="event.stopPropagation();MarketplaceCreate&&MarketplaceCreate.cancel(\'' + _esc(listing.id) + '\')">✕ Cancelar</button>'
        + '</div>';
    }

    // Status badge label
    var statusLabel = status === 'sold' ? 'Vendido' : status === 'cancelled' || status === 'deleted' ? 'Cancelado' : 'À venda';

    return '<div class="mk-card mk-card--' + _esc(status) + '"'
      + ' data-listing-id="' + _esc(listing.id) + '"'
      + ' data-status="' + _esc(status) + '"'
      + ' data-seller="' + _esc(listing.seller_id || '') + '">'

      // Top: sprite + boost + stars + types
      + '<div class="mk-card-top">'
      + (listing.boost ? '<span class="mk-card-boost ' + boostCls + '">+' + _esc(String(listing.boost)) + '</span>' : '')
      + '<div class="mk-sprite-wrap">' + spriteHtml + '</div>'
      + _starsHtml(listing.stars, tier)
      + _typesHtml(listing.pokemon_types)
      + '</div>'

      // Body: name + tier + helds + training
      + '<div class="mk-card-body">'
      + '<div class="mk-card-name-row">'
      + '<span class="mk-card-name">' + _esc(listing.pokemon_name || listing.listing_type) + '</span>'
      + _tierBadgeHtml(tier)
      + '</div>'
      + '<div class="mk-helds">' + _heldChip(heldX, 'X') + _heldChip(heldY, 'Y') + '</div>'
      + _trainingHtml(listing.training)
      + '</div>'

      // Footer: price + status + time
      + '<div class="mk-card-footer">'
      + '<div class="mk-price">'
      + '<span class="mk-price-kk">' + (priceLabel ? _esc(priceLabel.label) : '—') + '</span>'
      + (priceLabel ? '<span class="mk-price-brl">' + _esc(priceLabel.brl) + '</span>' : '')
      + (ddNum > 0 ? '<span class="mk-price-dd">' + ddNum.toLocaleString('pt-BR') + ' DD</span>' : '')
      + '</div>'
      + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">'
      + '<span class="mk-status-badge mk-status--' + _esc(status) + '">' + statusLabel + '</span>'
      + '<span class="mk-card-time">' + _timeAgo(listing.created_at) + '</span>'
      + '</div>'
      + '</div>'

      // Buyer negotiate button
      + negotiateHtml
      // Owner actions
      + actionsHtml

      + '</div>'; // .mk-card
  }

  // ── Apply filters ─────────────────────────────────────────────
  function _applyFilters(listings, filters) {
    if (!filters) return listings;
    return (listings || []).filter(function(l) {
      // Exclui listings não-ativos (soft-deleted, cancelados, vendidos)
      if (l.status && l.status !== 'active') return false;
      if (filters.type && filters.type !== 'all' && l.listing_type !== filters.type) return false;
      if (filters.search) {
        var q = filters.search.toLowerCase();
        if (!(l.pokemon_name || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  // ── Reconcile DOM (morph) ─────────────────────────────────────
  function _reconcile(container, listings) {
    var user      = _user();
    var userId    = user ? user.id : null;
    var admin     = _isAdmin();

    // Build map of existing cards
    var existing = {};
    Array.prototype.forEach.call(
      container.querySelectorAll('[data-listing-id]'),
      function(el) { existing[el.getAttribute('data-listing-id')] = el; }
    );

    var frag = global.document.createDocumentFragment();
    var adds = 0, morphs = 0;

    listings.forEach(function(listing) {
      var el = existing[listing.id];
      if (el) {
        // Morph: update status badge
        var newStatus = listing.status || 'active';
        if (el.getAttribute('data-status') !== newStatus) {
          el.setAttribute('data-status', newStatus);
          el.className = 'mk-card mk-card--' + newStatus;
          var badge = el.querySelector('.mk-status-badge');
          if (badge) {
            badge.className = 'mk-status-badge mk-status--' + newStatus;
            badge.textContent = newStatus === 'sold' ? 'Vendido' : newStatus === 'cancelled' ? 'Cancelado' : 'À venda';
          }
        }
        // Price morph
        if (typeof formatKK === 'function') {
          var pf = formatKK(listing.price_kk);
          var priceEl = el.querySelector('.mk-price-kk');
          if (priceEl && pf && priceEl.textContent !== pf.label) priceEl.textContent = pf.label;
        }

        // FIX: Always rebuild ownership buttons on morph.
        // Ownership depends on current auth state which can change between renders
        // (login/logout/account switch). Never reuse old button HTML.
        var isOwnerMorph = userId && listing.seller_id === userId;
        var isAdminMorph = admin;

        // Remove old action divs (rebuilt below). Do NOT touch .mk-conv-badge here —
        // updateConvBadge() in marketplace-trade.js owns its full lifecycle.
        // Removing it here caused badges to disappear on every re-render whenever
        // isOwnerMorph evaluated to false (e.g. during a stale-session render).
        var oldActions = el.querySelector('.mk-card-actions');
        if (oldActions) oldActions.remove();
        var oldNegotiate = el.querySelector('.mk-card-negotiate');
        if (oldNegotiate) oldNegotiate.remove();

        // Rebuild negotiate button (buyer only)
        // Admin negotiates as a normal buyer (Bug 3 fix)
        var canNegotiateMorph = !isOwnerMorph &&
          newStatus === 'active';
        if (canNegotiateMorph) {
          var negWrap = global.document.createElement('div');
          var negBtn = global.document.createElement('button');
          negBtn.className = 'mk-btn mk-btn--primary mk-btn--negotiate';
          negBtn.disabled = false;
          negBtn.textContent = '🤝 Negociar';
          negBtn.setAttribute('onclick',
            'event.stopPropagation();MarketplaceTrade&&MarketplaceTrade.startNegotiation(\'' + _esc(listing.id) + '\')');
          negWrap.className = 'mk-card-negotiate';
          negWrap.appendChild(negBtn);
          el.appendChild(negWrap);
        }

        // Rebuild owner actions (edit/cancel — seller only, never admin)
        if (isOwnerMorph) {
          var actWrap = global.document.createElement('div');
          actWrap.className = 'mk-card-actions';

          var editBtn = global.document.createElement('button');
          editBtn.className = 'mk-btn mk-btn--ghost mk-btn--sm';
          editBtn.textContent = '✏️ Editar';
          editBtn.setAttribute('onclick',
            'event.stopPropagation();MarketplaceCreate&&MarketplaceCreate.openEdit('
            + _esc(JSON.stringify({
                id: listing.id, pokemon_name: listing.pokemon_name,
                pokemon_slug: listing.pokemon_slug, pokemon_types: listing.pokemon_types,
                stars: listing.stars, boost: listing.boost,
                held_x_id: listing.held_x_id, held_y_id: listing.held_y_id,
                training: listing.training, price_kk: listing.price_kk,
                observations: listing.observations,
              })) + ')');

          var cancelBtn = global.document.createElement('button');
          cancelBtn.className = 'mk-btn mk-btn--danger-ghost mk-btn--sm';
          cancelBtn.textContent = '✕ Cancelar';
          cancelBtn.setAttribute('onclick',
            'event.stopPropagation();MarketplaceCreate&&MarketplaceCreate.cancel(\'' + _esc(listing.id) + '\')');

          actWrap.appendChild(editBtn);
          actWrap.appendChild(cancelBtn);
          el.appendChild(actWrap);
        }

                // Debug log for ownership verification (temporary)
        if (global.PA_DEBUG) {
          console.log('[marketplace.ownership]', {
            listingSellerId: listing.seller_id,
            authUserId: userId,
            isOwner: isOwnerMorph,
            isAdmin: isAdminMorph,
          });
        }

        delete existing[listing.id];
        morphs++;
        frag.appendChild(el);
      } else {
        // New card
        var div = global.document.createElement('div');
        div.innerHTML = _buildCardHtml(listing, userId, admin);
        var card = div.firstElementChild;
        if (card) {
          if (global.PA && global.PA.hardening) global.PA.hardening.observeCard(card);
          adds++;
          frag.appendChild(card);
        }
      }
    });

    // Remove stale cards
    var removes = Object.keys(existing).length;
    Object.keys(existing).forEach(function(id) {
      var el = existing[id];
      if (global.PA && global.PA.hardening) global.PA.hardening.unobserveCard(el);
      el.remove();
    });

    container.innerHTML = '';
    container.appendChild(frag);
    _log('reconcile: +' + adds + ' morph:' + morphs + ' -' + removes);
    _tel('marketplace-render', { adds: adds, morphs: morphs, removes: removes });
  }

  // ── Main render ───────────────────────────────────────────────
  function render(listings, filters) {
    var container = global.document.getElementById('marketplace-list');
    if (!container) return;

    // Loading state
    if (global.PA && global.PA.marketplace && global.PA.marketplace.loading) {
      if (global.PA.skeleton) {
        global.PA.skeleton.showOrders(container, 6);
      } else {
        container.innerHTML = '<div class="mk-loading"><div class="mk-spinner"></div></div>';
      }
      return;
    }

    var filtered = _applyFilters(listings || [], filters || {});

    // Empty state
    if (!filtered.length) {
      container.innerHTML = '<div class="mk-empty">'
        + '<div class="mk-empty-icon">🎴</div>'
        + '<div class="mk-empty-title">Nenhum anúncio encontrado</div>'
        + '<div class="mk-empty-sub">'
        + ((listings && listings.length) ? 'Tente mudar os filtros.' : 'Seja o primeiro a anunciar!')
        + '</div></div>';
      return;
    }

    _reconcile(container, filtered);
  }

  // ── Public API ────────────────────────────────────────────────
  global.MarketplaceRender = { render: render };
  _log('marketplace-render.js M2 pronto');

}(window));
