// ============================================================
// marketplace-render.js — Filipi Marketplace M1
// PokeAlliance Shop
//
// RESPONSABILIDADES:
//   • Renderizar cards de listings com morph incremental
//   • Skeleton durante loading
//   • Filtros aplicados antes de renderizar
//   • Reutiliza getSprites() de tierlist-popup.js
//   • Reutiliza formatKK() de app.js
//   • Classes CSS de mk-type-- de marketplace.css
//   • Usa PA.hardening (skeleton, observeCard)
// ============================================================

;(function (global) {
  'use strict';

  if (global.MarketplaceRender) return; // singleton

  var _log  = function () { console.log.apply(console,  ['[PA.marketplace.render]'].concat(Array.prototype.slice.call(arguments))); };
  var _warn = function () { console.warn.apply(console, ['[PA.marketplace.render ⚠]'].concat(Array.prototype.slice.call(arguments))); };

  // ── Telemetria ───────────────────────────────────────────────
  function _tel(cat, data) {
    if (global.PA && global.PA.telemetry) global.PA.telemetry.push(cat, data);
  }

  // ── Escape HTML ──────────────────────────────────────────────
  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Sprite URL (delega para getSprites se disponível) ────────
  function _spriteUrl(pokemonName) {
    if (!pokemonName) return null;
    if (typeof getSprites === 'function') {
      try { return getSprites(pokemonName); } catch (_) {}
    }
    // Fallback manual
    var isShiny = /^shiny\s+/i.test(pokemonName);
    var base = pokemonName.replace(/^shiny\s+/i, '').toLowerCase()
      .replace(/\s+/g, '').replace(/['\u2019]/g, '');
    var animBase   = isShiny ? 'https://play.pokemonshowdown.com/sprites/gen5ani-shiny/' : 'https://play.pokemonshowdown.com/sprites/gen5ani/';
    var staticBase = isShiny ? 'https://play.pokemonshowdown.com/sprites/dex-shiny/'     : 'https://play.pokemonshowdown.com/sprites/dex/';
    return {
      animated: animBase   + base + '.gif',
      static:   staticBase + base + '.png',
      fallback: 'https://play.pokemonshowdown.com/sprites/dex/' + base + '.png',
    };
  }

  // ── Boost class por faixa ─────────────────────────────────────
  function _boostClass(boost) {
    if (!boost || boost === 0) return 'mk-card-boost--low';
    if (boost < 25)  return 'mk-card-boost--mid';
    if (boost < 50)  return 'mk-card-boost--high';
    return 'mk-card-boost--max';
  }

  // ── Stars HTML ───────────────────────────────────────────────
  function _starsHtml(stars) {
    var total = 5;
    var out = '';
    for (var i = 1; i <= total; i++) {
      out += '<span class="mk-star' + (i <= (stars || 0) ? ' mk-star--lit' : '') + '">★</span>';
    }
    return '<div class="mk-stars">' + out + '</div>';
  }

  // ── Types badges ─────────────────────────────────────────────
  function _typesHtml(types) {
    if (!types || !types.length) return '';
    return '<div class="mk-types">'
      + types.map(function (t) {
          return '<span class="mk-type-badge mk-type--' + _esc(t.toLowerCase()) + '">' + _esc(t) + '</span>';
        }).join('')
      + '</div>';
  }

  // ── Held chip ────────────────────────────────────────────────
  function _heldChip(held, label) {
    if (!held) return '<div class="mk-held-chip"><span class="mk-held-label">' + _esc(label) + '</span><span style="opacity:.3">—</span></div>';
    return '<div class="mk-held-chip"><span class="mk-held-label">' + _esc(label) + '</span><span>' + _esc(held.name || '—') + '</span></div>';
  }

  // ── Training mini bars ────────────────────────────────────────
  var TRAIN_STATS = [
    { key: 'attack',             label: 'ATK'    },
    { key: 'defense',            label: 'DEF'    },
    { key: 'hp',                 label: 'HP'     },
    { key: 'precision',          label: 'PRE'    },
    { key: 'evasion',            label: 'EVA'    },
    { key: 'critical_damage',    label: 'C.DMG'  },
    { key: 'critical_chance',    label: 'C.CHC'  },
    { key: 'critical_resistance',label: 'C.RES'  },
  ];

  function _trainingHtml(training) {
    if (!training || typeof training !== 'object') return '';
    var hasAny = TRAIN_STATS.some(function (s) {
      var v = training[s.key];
      return v && (v.level > 0 || v.pct > 0);
    });
    if (!hasAny) return '';

    var rows = TRAIN_STATS
      .filter(function (s) {
        var v = training[s.key];
        return v && (v.level > 0 || v.pct > 0);
      })
      .slice(0, 4) // mostra até 4 no card compacto
      .map(function (s) {
        var v = training[s.key] || {};
        var pct = Math.min(100, Math.max(0, Number(v.pct) || 0));
        return '<div class="mk-train-row">'
          + '<span class="mk-train-label">' + _esc(s.label) + '</span>'
          + '<div class="mk-train-bar"><div class="mk-train-fill" style="width:' + pct + '%"></div></div>'
          + '</div>';
      });

    return '<div class="mk-training-mini">' + rows.join('') + '</div>';
  }

  // ── Build single card HTML ────────────────────────────────────
  function _buildCardHtml(listing) {
    var sprites    = _spriteUrl(listing.pokemon_name);
    var boostCls   = _boostClass(listing.boost);
    var priceLabel = (typeof formatKK === 'function' && listing.price_kk)
      ? formatKK(listing.price_kk) : null;

    var spriteHtml = '';
    if (sprites) {
      spriteHtml = '<img class="mk-sprite" loading="lazy"'
        + ' src="' + _esc(sprites.animated) + '"'
        + ' data-static="' + _esc(sprites.static) + '"'
        + ' alt="' + _esc(listing.pokemon_name || '') + '"'
        + ' onerror="this.src=this.dataset.static||this.src;this.onerror=null"'
        + '>';
    } else {
      spriteHtml = '<div class="mk-sprite-fallback">🎴</div>';
    }

    return '<div class="mk-card" data-listing-id="' + _esc(listing.id) + '" data-status="' + _esc(listing.status) + '">'
      + '<div class="mk-card-top">'
      +   (listing.boost ? '<span class="mk-card-boost ' + boostCls + '">+' + _esc(String(listing.boost)) + '</span>' : '')
      +   '<div class="mk-sprite-wrap">' + spriteHtml + '</div>'
      +   _starsHtml(listing.stars)
      +   _typesHtml(listing.pokemon_types)
      + '</div>'
      + '<div class="mk-card-body">'
      +   '<div class="mk-card-name">' + _esc(listing.pokemon_name || listing.listing_type) + '</div>'
      +   '<div class="mk-helds">'
      +     _heldChip(listing.helds_x, 'X')
      +     _heldChip(listing.helds_y, 'Y')
      +   '</div>'
      +   _trainingHtml(listing.training)
      + '</div>'
      + '<div class="mk-card-footer">'
      +   '<div class="mk-price">'
      +     '<span class="mk-price-kk">' + (priceLabel ? _esc(priceLabel.label) : '—') + '</span>'
      +     (priceLabel ? '<span class="mk-price-brl">' + _esc(priceLabel.brl) + '</span>' : '')
      +   '</div>'
      +   '<span class="mk-status-badge mk-status--' + _esc(listing.status || 'active') + '">'
      +     (listing.status === 'sold' ? 'Vendido' : listing.status === 'cancelled' ? 'Cancelado' : 'À venda')
      +   '</span>'
      + '</div>'
      + '</div>';
  }

  // ── Apply filters ─────────────────────────────────────────────
  function _applyFilters(listings, filters) {
    if (!filters) return listings;
    return listings.filter(function (l) {
      if (filters.type !== 'all' && l.listing_type !== filters.type) return false;
      if (filters.search) {
        var q = filters.search.toLowerCase();
        if (!(l.pokemon_name || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  // ── Reconcile DOM: morph existing, add new, remove stale ─────
  function _reconcile(container, listings) {
    var existing = {};
    Array.prototype.forEach.call(
      container.querySelectorAll('[data-listing-id]'),
      function (el) { existing[el.getAttribute('data-listing-id')] = el; }
    );

    var frag = global.document.createDocumentFragment();
    var morphCount = 0, addCount = 0;

    listings.forEach(function (listing) {
      var el = existing[listing.id];
      if (el) {
        // Morph: atualiza campos que podem ter mudado
        var newStatus = listing.status || 'active';
        if (el.getAttribute('data-status') !== newStatus) {
          el.setAttribute('data-status', newStatus);
          var badge = el.querySelector('.mk-status-badge');
          if (badge) badge.textContent = newStatus === 'sold' ? 'Vendido' : newStatus === 'cancelled' ? 'Cancelado' : 'À venda';
        }
        var priceEl = el.querySelector('.mk-price-kk');
        if (priceEl && typeof formatKK === 'function') {
          var pf = formatKK(listing.price_kk);
          if (pf && priceEl.textContent !== pf.label) priceEl.textContent = pf.label;
        }
        delete existing[listing.id]; // marca como "ainda presente"
        morphCount++;
        frag.appendChild(el);
      } else {
        // Novo card
        var div = global.document.createElement('div');
        div.innerHTML = _buildCardHtml(listing);
        var card = div.firstChild;
        // Observa com lazy render
        if (global.PA && global.PA.hardening) global.PA.hardening.observeCard(card);
        addCount++;
        frag.appendChild(card);
      }
    });

    // Remove stale
    Object.keys(existing).forEach(function (id) {
      if (global.PA && global.PA.hardening) global.PA.hardening.unobserveCard(existing[id]);
      existing[id].remove();
    });

    container.innerHTML = '';
    container.appendChild(frag);
    _log('reconcile: ' + addCount + ' adicionados, ' + morphCount + ' morphed, ' + Object.keys(existing).length + ' removidos');
    _tel('marketplace-render', { add: addCount, morph: morphCount });
  }

  // ── Main render ───────────────────────────────────────────────
  function render(listings, filters) {
    var container = global.document.getElementById('marketplace-list');
    if (!container) return;

    var filtered = _applyFilters(listings || [], filters || {});

    // Loading state
    if (global.PA && global.PA.marketplace && global.PA.marketplace.loading) {
      if (global.PA.skeleton) {
        global.PA.skeleton.showOrders(container, 6);
      } else {
        container.innerHTML = '<div class="mk-loading"><div class="mk-spinner"></div></div>';
      }
      return;
    }

    // Empty state
    if (!filtered.length) {
      container.innerHTML = '<div class="mk-empty">'
        + '<div class="mk-empty-icon">🎴</div>'
        + '<div class="mk-empty-title">Nenhum anúncio encontrado</div>'
        + '<div class="mk-empty-sub">'
        + (listings && listings.length ? 'Tente mudar os filtros.' : 'Seja o primeiro a anunciar!')
        + '</div></div>';
      return;
    }

    _reconcile(container, filtered);
  }

  // ── API pública ───────────────────────────────────────────────
  global.MarketplaceRender = { render: render };

  _log('marketplace-render.js v1 pronto');

}(window));
