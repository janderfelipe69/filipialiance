// ============================================================
// marketplace-create.js — Filipi Marketplace M1
// PokeAlliance Shop
//
// Modal base de criação de anúncio.
// FASE M1: apenas UI + validação local.
// Submit / save implementado na Fase M2.
// ============================================================

;(function (global) {
  'use strict';

  if (global.MarketplaceCreate) return; // singleton

  var _log  = function () { console.log.apply(console,  ['[PA.marketplace]', '[create]'].concat(Array.prototype.slice.call(arguments))); };
  var _warn = function () { console.warn.apply(console, ['[PA.marketplace ⚠]', '[create]'].concat(Array.prototype.slice.call(arguments))); };

  // ── Escape ───────────────────────────────────────────────────
  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Estado do formulário ─────────────────────────────────────
  var _form = {
    listing_type:  'pokemon',
    pokemon_name:  '',
    pokemon_slug:  '',
    pokemon_types: [],
    stars:         0,
    boost:         0,
    held_x_id:     null,
    held_y_id:     null,
    training:      {},
    price_kk:      '',
    observations:  '',
  };

  var _modalEl = null;

  // ── Build modal HTML ─────────────────────────────────────────
  function _buildHtml() {
    return '<div class="mk-modal-backdrop" id="mk-create-backdrop">'
      + '<div class="mk-modal" id="mk-create-modal" role="dialog" aria-modal="true" aria-labelledby="mk-modal-title">'

      // Header
      + '<div class="mk-modal-header">'
      + '  <span class="mk-modal-title" id="mk-modal-title">📢 Novo Anúncio</span>'
      + '  <button class="mk-modal-close" onclick="MarketplaceCreate.close()" aria-label="Fechar">✕</button>'
      + '</div>'

      // Body
      + '<div class="mk-modal-body">'

      // Pokémon search
      + '  <div class="mk-field">'
      + '    <label class="mk-label" for="mk-poke-input">Pokémon</label>'
      + '    <div class="mk-autocomplete">'
      + '      <input class="mk-input" id="mk-poke-input" type="text" placeholder="Ex: Shiny Charizard" autocomplete="off">'
      + '      <div class="mk-dropdown" id="mk-poke-dropdown" style="display:none"></div>'
      + '    </div>'
      + '  </div>'

      // Preview sprite + tipos
      + '  <div id="mk-poke-preview-wrap" style="display:none">'
      + '    <div class="mk-poke-preview">'
      + '      <img class="mk-poke-preview-sprite" id="mk-poke-sprite" src="" alt="">'
      + '      <div class="mk-poke-preview-info">'
      + '        <span class="mk-poke-preview-name" id="mk-poke-name"></span>'
      + '        <div class="mk-types" id="mk-poke-types"></div>'
      + '      </div>'
      + '    </div>'
      + '  </div>'

      // Stars
      + '  <div class="mk-field">'
      + '    <label class="mk-label">Stars</label>'
      + '    <div class="mk-stars-input" id="mk-stars-input">'
      + [1,2,3,4,5].map(function(i){
            return '<button type="button" class="mk-star-btn" data-val="' + i + '" aria-label="' + i + ' estrela' + (i>1?'s':'') + '">★</button>';
          }).join('')
      + '    </div>'
      + '  </div>'

      // Boost
      + '  <div class="mk-field">'
      + '    <label class="mk-label" for="mk-boost-slider">Boost</label>'
      + '    <div class="mk-boost-row">'
      + '      <input class="mk-boost-slider" id="mk-boost-slider" type="range" min="0" max="70" value="0" step="1">'
      + '      <span class="mk-boost-val" id="mk-boost-val">+0</span>'
      + '    </div>'
      + '  </div>'

      // Held X
      + '  <div class="mk-field">'
      + '    <label class="mk-label" for="mk-held-x">Held X</label>'
      + '    <select class="mk-select" id="mk-held-x"><option value="">— Nenhum —</option></select>'
      + '  </div>'

      // Held Y
      + '  <div class="mk-field">'
      + '    <label class="mk-label" for="mk-held-y">Held Y</label>'
      + '    <select class="mk-select" id="mk-held-y"><option value="">— Nenhum —</option></select>'
      + '  </div>'

      // Treinamento (8 stats)
      + '  <div class="mk-field" id="mk-training-section">'
      + '    <label class="mk-label">Treinamento</label>'
      + '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'
      + ['attack','defense','hp','precision','evasion','critical_damage','critical_chance','critical_resistance']
          .map(function(stat){
            var label = { attack:'Attack', defense:'Defense', hp:'HP', precision:'Precision',
              evasion:'Evasion', critical_damage:'Crit.Dmg', critical_chance:'Crit.Chc', critical_resistance:'Crit.Res' }[stat] || stat;
            return '<div>'
              + '<label class="mk-label" style="font-size:9px">' + label + ' (%)</label>'
              + '<input class="mk-input" id="mk-train-' + stat + '" type="number" min="0" max="100" placeholder="0" style="padding:6px 8px;font-size:12px">'
              + '</div>';
          }).join('')
      + '    </div>'
      + '  </div>'

      // Preço
      + '  <div class="mk-field">'
      + '    <label class="mk-label" for="mk-price">Preço (KK)</label>'
      + '    <input class="mk-input" id="mk-price" type="number" min="1" placeholder="Ex: 500000000 = 500kk">'
      + '  </div>'

      // Observações
      + '  <div class="mk-field">'
      + '    <label class="mk-label" for="mk-obs">Observações (opcional)</label>'
      + '    <textarea class="mk-textarea" id="mk-obs" maxlength="500" placeholder="Informações adicionais..."></textarea>'
      + '  </div>'

      // Footer
      + '  <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">'
      + '    <button class="mk-btn mk-btn--ghost" onclick="MarketplaceCreate.close()">Cancelar</button>'
      + '    <button class="mk-btn mk-btn--primary" id="mk-submit-btn" disabled>Publicar (em breve)</button>'
      + '  </div>'

      + '</div>' // .mk-modal-body
      + '</div>' // .mk-modal
      + '</div>'; // .mk-modal-backdrop
  }

  // ── Open modal ───────────────────────────────────────────────
  function open() {
    if (!global.Session || !global.Session.getCurrentUser()) {
      if (typeof showToast === 'function') showToast('Faça login para anunciar.', 'info');
      return;
    }

    // Limpa form
    Object.assign(_form, {
      listing_type:'pokemon', pokemon_name:'', pokemon_slug:'', pokemon_types:[],
      stars:0, boost:0, held_x_id:null, held_y_id:null, training:{}, price_kk:'', observations:'',
    });

    if (!_modalEl) {
      _modalEl = global.document.createElement('div');
      global.document.body.appendChild(_modalEl);
    }
    _modalEl.innerHTML = _buildHtml();
    _modalEl.style.display = '';

    _bindEvents();
    _populateHelds();
    _log('Modal aberto');
  }

  function close() {
    if (_modalEl) _modalEl.innerHTML = '';
    _log('Modal fechado');
  }

  // ── Bind events ──────────────────────────────────────────────
  function _bindEvents() {
    // Close on backdrop click
    var backdrop = global.document.getElementById('mk-create-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop) close();
      });
    }

    // Pokemon autocomplete
    var pokeInput = global.document.getElementById('mk-poke-input');
    var pokeDrop  = global.document.getElementById('mk-poke-dropdown');
    if (pokeInput && pokeDrop && typeof PokemonSelector !== 'undefined') {
      PokemonSelector.mount(pokeInput, pokeDrop, function (result) {
        _form.pokemon_name  = result.name;
        _form.pokemon_slug  = result.slug;
        _form.pokemon_types = result.types || [];
        _updatePokePreview(result);
      });
    }

    // Stars
    var starBtns = global.document.querySelectorAll('.mk-star-btn');
    Array.prototype.forEach.call(starBtns, function (btn) {
      btn.addEventListener('click', function () {
        var val = parseInt(btn.getAttribute('data-val'), 10);
        _form.stars = (_form.stars === val) ? 0 : val; // toggle off
        _updateStarsUI();
      });
    });

    // Boost
    var boostSlider = global.document.getElementById('mk-boost-slider');
    var boostVal    = global.document.getElementById('mk-boost-val');
    if (boostSlider && boostVal) {
      boostSlider.addEventListener('input', function () {
        _form.boost = parseInt(boostSlider.value, 10);
        boostVal.textContent = '+' + _form.boost;
      });
    }
  }

  // ── Update sprite preview ─────────────────────────────────────
  function _updatePokePreview(result) {
    var wrap  = global.document.getElementById('mk-poke-preview-wrap');
    var img   = global.document.getElementById('mk-poke-sprite');
    var name  = global.document.getElementById('mk-poke-name');
    var types = global.document.getElementById('mk-poke-types');
    if (!wrap || !img || !name || !types) return;

    if (result.sprite) {
      img.src = result.sprite;
      img.onerror = function () { img.style.display = 'none'; };
      img.style.display = '';
    } else {
      img.style.display = 'none';
    }
    name.textContent = result.name || '';
    types.innerHTML  = (result.types || []).map(function(t){
      return '<span class="mk-type-badge mk-type--' + _esc(t.toLowerCase()) + '">' + _esc(t) + '</span>';
    }).join('');
    wrap.style.display = '';
  }

  // ── Update stars UI ───────────────────────────────────────────
  function _updateStarsUI() {
    Array.prototype.forEach.call(
      global.document.querySelectorAll('.mk-star-btn'),
      function (btn) {
        var val = parseInt(btn.getAttribute('data-val'), 10);
        btn.classList.toggle('active', val <= _form.stars);
      }
    );
  }

  // ── Populate held selects ─────────────────────────────────────
  function _populateHelds() {
    if (typeof HeldsCatalog === 'undefined') return;

    function _fill(selectId, category) {
      var sel = global.document.getElementById(selectId);
      if (!sel) return;
      var helds = HeldsCatalog.getByCategory(category);
      if (!helds.length) {
        HeldsCatalog.load().then(function () {
          _fill(selectId, category);
        });
        return;
      }
      var opts = '<option value="">— Nenhum —</option>';
      helds.forEach(function (h) {
        opts += '<option value="' + _esc(h.id) + '">' + _esc(h.name) + '</option>';
      });
      sel.innerHTML = opts;
      sel.addEventListener('change', function () {
        _form[selectId === 'mk-held-x' ? 'held_x_id' : 'held_y_id'] = sel.value || null;
      });
    }

    _fill('mk-held-x', 'X');
    _fill('mk-held-y', 'Y');
  }

  // ── API pública ───────────────────────────────────────────────
  global.MarketplaceCreate = { open: open, close: close, getForm: function() { return Object.assign({}, _form); } };
  _log('marketplace-create.js v1 pronto');

}(window));
