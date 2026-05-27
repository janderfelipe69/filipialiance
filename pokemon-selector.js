// ============================================================
// pokemon-selector.js — Filipi Marketplace M1
// PokeAlliance Shop
//
// Autocomplete de Pokémon baseado em POKEMONS (dados.js):
//   - busca debounced
//   - slug normalizado
//   - preview sprite automática
//   - tipagem automática
//   - ZERO HTML injection (escape total)
// ============================================================

;(function (global) {
  'use strict';

  if (global.PokemonSelector) return; // singleton

  var _log  = function () { console.log.apply(console,  ['[PA.marketplace]', '[poke-selector]'].concat(Array.prototype.slice.call(arguments))); };
  var _warn = function () { console.warn.apply(console, ['[PA.marketplace ⚠]', '[poke-selector]'].concat(Array.prototype.slice.call(arguments))); };

  // ── Sprite URL (reutiliza getSprites de tierlist-popup.js) ──
  function _sprites(name) {
    if (!name) return null;
    if (typeof getSprites === 'function') {
      try { return getSprites(name); } catch (_) {}
    }
    var isShiny = /^shiny\s+/i.test(name);
    var base = name.replace(/^shiny\s+/i, '').toLowerCase()
      .replace(/\s+/g, '').replace(/['\u2019]/g, '');
    return {
      animated: (isShiny ? 'https://play.pokemonshowdown.com/sprites/gen5ani-shiny/' : 'https://play.pokemonshowdown.com/sprites/gen5ani/') + base + '.gif',
      static:   (isShiny ? 'https://play.pokemonshowdown.com/sprites/dex-shiny/'     : 'https://play.pokemonshowdown.com/sprites/dex/')     + base + '.png',
    };
  }

  // ── Escape ───────────────────────────────────────────────────
  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Slug normalizado ─────────────────────────────────────────
  function toSlug(name) {
    if (!name) return '';
    return name.toLowerCase()
      .replace(/['\u2019]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '');
  }

  // ── Fonte de pokémons: POKEMONS de dados.js ──────────────────
  function _getSource() {
    var raw = global.POKEMONS || global.window && global.window.POKEMONS;
    if (Array.isArray(raw)) return raw;
    // Fallback: extrai nomes únicos dos items se POKEMONS não existir
    var items = global.items || global.window && global.window.items;
    if (Array.isArray(items)) return items.map(function(it){ return { name: it.name }; });
    return [];
  }

  // ── Busca debounced ──────────────────────────────────────────
  var _debounceTimer = null;

  function search(query, callback) {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(function () {
      _doSearch(query, callback);
    }, 180);
  }

  function _doSearch(query, callback) {
    if (!query || query.length < 2) { callback([]); return; }
    var q = query.toLowerCase().trim();
    var source = _getSource();
    var results = source
      .filter(function (p) {
        var name = (p.name || p[0] || '').toLowerCase();
        return name.includes(q);
      })
      .slice(0, 12)
      .map(function (p) {
        var name = p.name || p[0] || '';
        var spr  = _sprites(name);
        return {
          name:  name,
          slug:  toSlug(name),
          types: p.types || p.pokemon_types || [],
          sprite: spr ? spr.static : null,
        };
      });
    callback(results);
  }

  // ── Mount: vincula ao input e cria dropdown ───────────────────
  /**
   * @param {HTMLInputElement} inputEl  Campo de texto
   * @param {HTMLElement}      dropEl   Container do dropdown
   * @param {Function}         onSelect Called with { name, slug, types, sprite }
   */
  function mount(inputEl, dropEl, onSelect) {
    if (!inputEl || !dropEl) { _warn('mount: inputEl ou dropEl inválido'); return; }

    inputEl.addEventListener('input', function () {
      var q = inputEl.value;
      if (!q || q.length < 2) { _clearDrop(dropEl); return; }
      search(q, function (results) {
        _renderDrop(dropEl, results, onSelect, inputEl);
      });
    });

    inputEl.addEventListener('blur', function () {
      setTimeout(function () { _clearDrop(dropEl); }, 180);
    });

    inputEl.addEventListener('keydown', function (e) {
      var focused = dropEl.querySelector('.focused');
      var items   = dropEl.querySelectorAll('.mk-dropdown-item');
      if (!items.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        var next = focused ? focused.nextElementSibling : items[0];
        if (focused) focused.classList.remove('focused');
        if (next && next.classList.contains('mk-dropdown-item')) next.classList.add('focused');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        var prev = focused ? focused.previousElementSibling : null;
        if (focused) focused.classList.remove('focused');
        if (prev && prev.classList.contains('mk-dropdown-item')) prev.classList.add('focused');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        var sel = dropEl.querySelector('.focused') || items[0];
        if (sel) sel.click();
      } else if (e.key === 'Escape') {
        _clearDrop(dropEl);
      }
    });

    _log('PokemonSelector montado em', inputEl.id || inputEl.className);
  }

  function _clearDrop(dropEl) {
    dropEl.innerHTML = '';
    dropEl.style.display = 'none';
  }

  function _renderDrop(dropEl, results, onSelect, inputEl) {
    if (!results.length) {
      dropEl.innerHTML = '<div class="mk-dropdown-empty">Nenhum resultado</div>';
      dropEl.style.display = 'block';
      return;
    }
    dropEl.innerHTML = results.map(function (r) {
      return '<div class="mk-dropdown-item" data-name="' + _esc(r.name) + '">'
        + (r.sprite ? '<img src="' + _esc(r.sprite) + '" alt="" onerror="this.style.display=\'none\'">' : '')
        + '<span>' + _esc(r.name) + '</span>'
        + '</div>';
    }).join('');
    dropEl.style.display = 'block';

    Array.prototype.forEach.call(dropEl.querySelectorAll('.mk-dropdown-item'), function (el) {
      el.addEventListener('click', function () {
        var name = el.getAttribute('data-name');
        var match = results.find(function(r){ return r.name === name; });
        if (match) {
          inputEl.value = match.name;
          _clearDrop(dropEl);
          if (typeof onSelect === 'function') onSelect(match);
        }
      });
    });
  }

  global.PokemonSelector = { mount: mount, search: search, toSlug: toSlug };
  _log('pokemon-selector.js v1 pronto');

}(window));
