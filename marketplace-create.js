// ============================================================
// marketplace-create.js — Filipi Marketplace M2
// PokeAlliance Shop
//
// FASE M2: criação REAL, edição e cancelamento de anúncios.
// Submit → validate → withLock → INSERT Supabase → realtime.
// ============================================================

;(function (global) {
  'use strict';

  if (global.MarketplaceCreate) return; // singleton

  var _log  = function () { console.log.apply(console,  ['[PA.marketplace]', '[create]'].concat(Array.prototype.slice.call(arguments))); };
  var _warn = function () { console.warn.apply(console, ['[PA.marketplace ⚠]', '[create]'].concat(Array.prototype.slice.call(arguments))); };

  var SB_URL = global.SUPABASE_URL || '';
  var SB_KEY = global.SUPABASE_KEY || '';

  // ── Helpers ──────────────────────────────────────────────────
  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function _jwt() { return typeof Session !== 'undefined' && Session.getAccessToken ? Session.getAccessToken() : null; }
  function _user() { return typeof Session !== 'undefined' ? Session.getCurrentUser() : null; }
  function _tel(cat, data) { if (global.PA && global.PA.telemetry) global.PA.telemetry.push(cat, data); }
  function _toast(msg, type) { if (typeof showToast === 'function') showToast(msg, type || 'info'); }

  function _toSlug(name) {
    return String(name || '').toLowerCase()
      .replace(/['\u2019]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  }

  // ── Estado do formulário ─────────────────────────────────────
  var _form = {};
  var _modalEl = null;
  var _mode = 'create'; // 'create' | 'edit'
  var _editId = null;
  var _submitLocked = false; // botão debounce guard

  function _resetForm() {
    _form = {
      listing_type:  'pokemon',
      pokemon_name:  '',
      pokemon_slug:  '',
      pokemon_types: [],
      stars:         0,
      boost:         0,
      held_x_id:     null,
      held_y_id:     null,
      training:      {},
      price_kk:      0,
      observations:  '',
      loading:       false,
      errors:        {},
    };
  }

  // ── Validation ───────────────────────────────────────────────
  function validateListing() {
    var errs = {};

    // Pokémon
    if (!_form.pokemon_name || !_form.pokemon_name.trim()) {
      errs.pokemon_name = 'Selecione ou digite o nome do Pokémon.';
    } else if (_form.pokemon_name.length > 80) {
      errs.pokemon_name = 'Nome muito longo (máx 80 chars).';
    }

    // Slug (gerado automaticamente, validado por segurança)
    var slug = _toSlug(_form.pokemon_name);
    if (slug && !/^[a-z0-9\-]+$/.test(slug)) {
      errs.pokemon_name = 'Nome do Pokémon contém caracteres inválidos.';
    }

    // Stars
    if (_form.stars < 0 || _form.stars > 5 || !Number.isInteger(_form.stars)) {
      errs.stars = 'Stars deve ser um número inteiro entre 0 e 5.';
    }

    // Boost
    if (_form.boost < 0 || _form.boost > 70 || !Number.isInteger(_form.boost)) {
      errs.boost = 'Boost deve ser entre 0 e +70.';
    }

    // Price
    if (!_form.price_kk || _form.price_kk <= 0) {
      errs.price_kk = 'Informe um preço válido (maior que zero).';
    } else if (_form.price_kk > 999999999999) {
      errs.price_kk = 'Preço muito alto.';
    }

    // Helds: validados via catálogo (se selecionados)
    if (_form.held_x_id && typeof HeldsCatalog !== 'undefined') {
      if (!HeldsCatalog.getById(_form.held_x_id)) errs.held_x = 'Held X inválido.';
    }
    if (_form.held_y_id && typeof HeldsCatalog !== 'undefined') {
      if (!HeldsCatalog.getById(_form.held_y_id)) errs.held_y = 'Held Y inválido.';
    }

    // Training: cada stat 0-100
    var STATS = ['attack','defense','hp','precision','evasion','critical_damage','critical_chance','critical_resistance'];
    STATS.forEach(function (s) {
      var v = Number(_form.training[s] || 0);
      if (v < 0 || v > 100) errs['training_' + s] = s + ' deve estar entre 0 e 100.';
    });

    // Observations
    if (_form.observations && _form.observations.length > 500) {
      errs.observations = 'Observações excedem 500 caracteres.';
    }

    _form.errors = errs;
    return Object.keys(errs).length === 0;
  }

  // ── Build training JSONB ──────────────────────────────────────
  function _buildTrainingPayload() {
    var STATS = ['attack','defense','hp','precision','evasion','critical_damage','critical_chance','critical_resistance'];
    var obj = {};
    STATS.forEach(function (s) {
      var v = Number(_form.training[s] || 0);
      if (v > 0) obj[s] = { level: 100, pct: v };
    });
    return obj;
  }

  // ── Check active listing count ────────────────────────────────
  async function _checkLimit() {
    var user = _user();
    if (!user) return false;
    try {
      var res = await fetch(
        SB_URL + '/rest/v1/marketplace_listings?seller_id=eq.' + user.id + '&status=eq.active&select=id',
        { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + _jwt() } }
      );
      var data = await res.json().catch(function(){ return []; });
      return Array.isArray(data) ? data.length : 99;
    } catch (e) { return 99; }
  }

  // ── INSERT real listing ───────────────────────────────────────
  async function _insertListing(payload) {
    var res = await fetch(SB_URL + '/rest/v1/marketplace_listings', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SB_KEY,
        'Authorization': 'Bearer ' + _jwt(),
        'Prefer':        'return=representation',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      var txt = await res.text().catch(function(){ return ''; });
      throw new Error(txt || 'HTTP ' + res.status);
    }
    var data = await res.json().catch(function(){ return {}; });
    return Array.isArray(data) ? data[0] : data;
  }

  // ── PATCH listing (edição) ────────────────────────────────────
  async function _patchListing(id, patch) {
    var res = await fetch(SB_URL + '/rest/v1/marketplace_listings?id=eq.' + id, {
      method: 'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SB_KEY,
        'Authorization': 'Bearer ' + _jwt(),
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      var txt = await res.text().catch(function(){ return ''; });
      throw new Error(txt || 'HTTP ' + res.status);
    }
    return true;
  }

  // ── publishListing — submit real ─────────────────────────────
  async function publishListing() {
    if (_submitLocked) { _warn('Submit locked — ignorando duplo clique'); return; }
    _submitLocked = true;

    var submitBtn = global.document.getElementById('mk-submit-btn');
    var origLabel = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '⏳ Publicando...'; }

    try {
      // 1. Valida
      if (!validateListing()) {
        _renderErrors(_form.errors);
        _toast('Corrija os erros antes de publicar.', 'error');
        return;
      }

      // 2. Autenticação
      var user = _user();
      if (!user) { _toast('Faça login para anunciar.', 'error'); return; }

      // 3. Limite de 5 anúncios (frontend — banco também bloqueia)
      var count = await _checkLimit();
      if (count >= 5) {
        _toast('Você já tem 5 anúncios ativos. Cancele um antes de criar outro.', 'error');
        return;
      }

      // 4. Monta payload (sem campos que o banco não aceita, sem image_url)
      var slug = _toSlug(_form.pokemon_name);
      var payload = {
        seller_id:     user.id,
        listing_type:  'pokemon',
        pokemon_name:  _form.pokemon_name.trim(),
        pokemon_slug:  slug,
        pokemon_types: _form.pokemon_types || [],
        stars:         _form.stars,
        boost:         _form.boost,
        held_x_id:     _form.held_x_id || null,
        held_y_id:     _form.held_y_id || null,
        training:      _buildTrainingPayload(),
        price_kk:      Math.floor(Number(_form.price_kk)),
        observations:  (_form.observations || '').trim().slice(0, 500) || null,
        status:        'active',
      };

      _log('[PA.marketplace.fetch] INSERT listing', { slug: slug, price: payload.price_kk });

      // 5. withLock para evitar renders simultâneos durante insert
      var newListing = null;
      if (global.PA && global.PA.pipeline && typeof global.PA.pipeline.withLockAsync === 'function') {
        await global.PA.pipeline.withLockAsync('mk-submit', async function () {
          newListing = await _insertListing(payload);
        });
      } else {
        newListing = await _insertListing(payload);
      }

      // 6. Optimistic UI: insere no estado local antes do realtime chegar
      if (newListing && global.PA && global.PA.marketplace) {
        var listings = global.PA.marketplace.listings || [];
        var alreadyExists = listings.some(function(l){ return l.id === newListing.id; });
        if (!alreadyExists) {
          global.PA.marketplace.listings = [newListing].concat(listings);
          if (typeof MarketplaceRender !== 'undefined') {
            _triggerRender();
          }
        }
      }

      _tel('marketplace-listing-created', { slug: slug });
      _toast('✅ Anúncio publicado com sucesso!', 'success');
      close();

    } catch (err) {
      _warn('publishListing error:', err.message);
      // Parse Supabase error hints
      var hint = err.message || '';
      var userMsg = 'Erro ao publicar. Tente novamente.';
      if (hint.includes('max_listings_exceeded'))      userMsg = 'Você já tem 5 anúncios ativos.';
      else if (hint.includes('duplicate_listing_spam')) userMsg = 'Aguarde 30s antes de criar anúncio idêntico.';
      else if (hint.includes('rate_limit_exceeded'))    userMsg = 'Muitos anúncios em pouco tempo. Aguarde 1 minuto.';
      else if (hint.includes('invalid_pokemon_slug'))   userMsg = 'Nome do Pokémon contém caracteres inválidos.';
      else if (hint.includes('invalid_boost'))          userMsg = 'Boost deve ser entre 0 e +70.';
      else if (hint.includes('invalid_stars'))          userMsg = 'Stars deve ser entre 0 e 5.';
      _toast(userMsg, 'error');
    } finally {
      _submitLocked = false;
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = origLabel; }
    }
  }

  // ── Cancel listing ────────────────────────────────────────────
  async function cancelListing(listingId) {
    if (!listingId) return;
    var user = _user();
    if (!user) return;

    var confirmed = global.confirm ? global.confirm('Excluir este anúncio permanentemente? Todas as negociações em aberto serão encerradas.') : true;
    if (!confirmed) return;

    try {
      // DELETE real via RPC — CASCADE limpa sessions + messages no banco
      var jwt = _jwt();
      if (!jwt) { _toast('Sem sessão. Faça login.', 'error'); return; }

      console.log('[DELETE RPC] rpc_delete_listing', listingId);
      var res = await fetch(SB_URL + '/rest/v1/rpc/rpc_delete_listing', {
        method: 'POST',
        headers: { 'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+jwt },
        body: JSON.stringify({ p_listing_id: listingId }),
      });
      var raw = await res.text();
      console.log('[DELETE RPC] status=' + res.status, raw.slice(0, 200));
      var data = null; try { data = JSON.parse(raw); } catch(_){}

      if (!res.ok || !(data && data.success)) {
        var errMap = { unauthorized:'Você não tem permissão.', listing_not_found:'Anúncio não encontrado.', not_authenticated:'Faça login.' };
        _warn('cancelListing error:', raw);
        _toast(errMap[(data&&data.error)] || 'Erro ao excluir anúncio.', 'error');
        return;
      }

      // Remove do store local imediatamente (sem esperar realtime)
      _cleanupListingLocally(listingId);

      _toast('Anúncio excluído. (' + (data.deleted_sessions||0) + ' negociações encerradas)', 'info');
      _tel('marketplace-listing-deleted', { id: listingId, sessions: data.deleted_sessions });
    } catch (err) {
      _warn('cancelListing error:', err.message);
      _toast('Erro ao excluir. Tente novamente.', 'error');
    }
  }

  // Limpa tudo relacionado ao listing do store e DOM local
  function _cleanupListingLocally(listingId) {
    // 1. Remove do store de listings
    if (global.PA && global.PA.marketplace) {
      global.PA.marketplace.listings = (global.PA.marketplace.listings || [])
        .filter(function(l){ return l.id !== listingId; });
    }

    // 2. Remove card do DOM com animação (se ainda existir)
    var cardEl = global.document.querySelector('[data-listing-id="' + listingId + '"]');
    if (cardEl) {
      cardEl.style.transition = 'opacity .25s, transform .25s';
      cardEl.style.opacity = '0';
      cardEl.style.transform = 'scale(0.95)';
      setTimeout(function() {
        if (cardEl.parentNode) cardEl.remove();
      }, 260);
    }

    // 3. Fecha todas as janelas de chat daquele listing
    if (typeof MarketplaceChat !== 'undefined' && MarketplaceChat.getWindowsByListing) {
      MarketplaceChat.getWindowsByListing(listingId).forEach(function(w) {
        try { w.destroy(); } catch(_) {}
      });
    }

    // 4. Remove buyer panel se estiver aberto (now attached to body, not the card)
    var buyerPanel = global.document.querySelector('[data-panel-listing="' + listingId + '"]');
    if (buyerPanel) buyerPanel.remove();

    // 5. Atualiza badge de unread (inbox)
    if (typeof MarketplaceInbox !== 'undefined') MarketplaceInbox.refresh();

    // 6. Re-trigger render para atualizar empty state
    _triggerRender();
  }

  // ── Open for edit ─────────────────────────────────────────────
  function openEdit(listing) {
    if (!listing) return;
    _mode  = 'edit';
    _editId = listing.id;

    _resetForm();
    _form.pokemon_name  = listing.pokemon_name  || '';
    _form.pokemon_slug  = listing.pokemon_slug  || '';
    _form.pokemon_types = listing.pokemon_types || [];
    _form.stars         = listing.stars   || 0;
    _form.boost         = listing.boost   || 0;
    _form.held_x_id     = listing.held_x_id || null;
    _form.held_y_id     = listing.held_y_id || null;
    _form.price_kk      = listing.price_kk  || 0;
    _form.observations  = listing.observations || '';

    // Training: flatten pct
    var STATS = ['attack','defense','hp','precision','evasion','critical_damage','critical_chance','critical_resistance'];
    if (listing.training) {
      STATS.forEach(function(s){
        _form.training[s] = listing.training[s] ? (listing.training[s].pct || 0) : 0;
      });
    }

    _renderModal('✏️ Editar Anúncio', 'Salvar Alterações');
    _bindEvents();
    _populateHelds();
    _prefillForm();
    _log('Modal edit aberto para listing', _editId);
  }

  // ── Save edit ─────────────────────────────────────────────────
  async function saveEdit() {
    if (_submitLocked) return;
    _submitLocked = true;
    var submitBtn = global.document.getElementById('mk-submit-btn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '⏳ Salvando...'; }

    try {
      if (!validateListing()) {
        _renderErrors(_form.errors);
        _toast('Corrija os erros.', 'error');
        return;
      }

      var patch = {
        price_kk:      Math.floor(Number(_form.price_kk)),
        held_x_id:     _form.held_x_id || null,
        held_y_id:     _form.held_y_id || null,
        training:      _buildTrainingPayload(),
        observations:  (_form.observations || '').trim().slice(0, 500) || null,
        stars:         _form.stars,
        boost:         _form.boost,
      };

      await _patchListing(_editId, patch);

      // Atualiza estado local
      if (global.PA && global.PA.marketplace) {
        global.PA.marketplace.listings = (global.PA.marketplace.listings || []).map(function(l){
          return l.id === _editId ? Object.assign({}, l, patch) : l;
        });
        _triggerRender();
      }

      _toast('Anúncio atualizado!', 'success');
      _tel('marketplace-listing-edited', { id: _editId });
      close();
    } catch (err) {
      _warn('saveEdit error:', err.message);
      _toast('Erro ao salvar. Tente novamente.', 'error');
    } finally {
      _submitLocked = false;
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = 'Salvar Alterações'; }
    }
  }

  // ── Render helpers ────────────────────────────────────────────
  function _triggerRender() {
    if (typeof MarketplaceRender === 'undefined') return;
    if (global.PA && global.PA.pipeline && typeof global.PA.pipeline.coalesceRender === 'function') {
      global.PA.pipeline.coalesceRender('marketplace-list', function () {
        MarketplaceRender.render(
          (global.PA.marketplace && global.PA.marketplace.listings) || [],
          (global.PA.marketplace && global.PA.marketplace.filters)  || {}
        );
      }, 120);
    }
  }

  function _renderErrors(errs) {
    Object.keys(errs || {}).forEach(function (k) {
      var hint = global.document.getElementById('mk-err-' + k);
      if (hint) hint.textContent = errs[k];
    });
  }

  // ── Build modal HTML ──────────────────────────────────────────
  function _buildHtml(title, submitLabel) {
    var STATS_ROWS = [
      { key:'attack',              label:'Attack'    },
      { key:'defense',             label:'Defense'   },
      { key:'hp',                  label:'HP'        },
      { key:'precision',           label:'Precision' },
      { key:'evasion',             label:'Evasion'   },
      { key:'critical_damage',     label:'Crit.Dmg'  },
      { key:'critical_chance',     label:'Crit.Chc'  },
      { key:'critical_resistance', label:'Crit.Res'  },
    ];

    return '<div class="mk-modal-backdrop" id="mk-create-backdrop">'
      + '<div class="mk-modal" id="mk-create-modal" role="dialog" aria-modal="true" aria-labelledby="mk-modal-title">'
      + '<div class="mk-modal-header">'
      + '  <span class="mk-modal-title" id="mk-modal-title">' + _esc(title) + '</span>'
      + '  <button class="mk-modal-close" onclick="MarketplaceCreate.close()" aria-label="Fechar">✕</button>'
      + '</div>'
      + '<div class="mk-modal-body">'

      // Pokémon
      + '<div class="mk-field">'
      + '  <label class="mk-label" for="mk-poke-input">Pokémon</label>'
      + '  <div class="mk-autocomplete">'
      + '    <input class="mk-input" id="mk-poke-input" type="text" placeholder="Ex: Shiny Charizard" autocomplete="off"'
      + (_mode === 'edit' ? ' readonly' : '') + '>'
      + '    <div class="mk-dropdown" id="mk-poke-dropdown" style="display:none"></div>'
      + '  </div>'
      + '  <span class="mk-field-error" id="mk-err-pokemon_name"></span>'
      + '</div>'

      // Preview
      + '<div id="mk-poke-preview-wrap" style="display:none">'
      + '  <div class="mk-poke-preview">'
      + '    <img class="mk-poke-preview-sprite" id="mk-poke-sprite" src="" alt="" onerror="this.style.display=\'none\'">'
      + '    <div class="mk-poke-preview-info">'
      + '      <span class="mk-poke-preview-name" id="mk-poke-name"></span>'
      + '      <div class="mk-types" id="mk-poke-types"></div>'
      + '    </div>'
      + '  </div>'
      + '</div>'

      // Stars
      + '<div class="mk-field">'
      + '  <label class="mk-label">Stars</label>'
      + '  <div class="mk-stars-input" id="mk-stars-input">'
      + [1,2,3,4,5].map(function(i){
          return '<button type="button" class="mk-star-btn" data-val="' + i + '" title="' + i + ' ★">★</button>';
        }).join('')
      + '  </div>'
      + '  <span class="mk-field-error" id="mk-err-stars"></span>'
      + '</div>'

      // Boost
      + '<div class="mk-field">'
      + '  <label class="mk-label" for="mk-boost-slider">Boost</label>'
      + '  <div class="mk-boost-row">'
      + '    <input class="mk-boost-slider" id="mk-boost-slider" type="range" min="0" max="70" value="0" step="1">'
      + '    <span class="mk-boost-val" id="mk-boost-val">+0</span>'
      + '  </div>'
      + '  <span class="mk-field-error" id="mk-err-boost"></span>'
      + '</div>'

      // Held X
      + '<div class="mk-field">'
      + '  <label class="mk-label" for="mk-held-x">Held X</label>'
      + '  <select class="mk-select" id="mk-held-x"><option value="">— Carregando... —</option></select>'
      + '  <span class="mk-field-error" id="mk-err-held_x"></span>'
      + '</div>'

      // Held Y
      + '<div class="mk-field">'
      + '  <label class="mk-label" for="mk-held-y">Held Y</label>'
      + '  <select class="mk-select" id="mk-held-y"><option value="">— Carregando... —</option></select>'
      + '  <span class="mk-field-error" id="mk-err-held_y"></span>'
      + '</div>'

      // Training — 2 colunas com slider+input
      + '<div class="mk-field">'
      + '  <label class="mk-label">Treinamento</label>'
      + '  <div class="mk-training-grid">'
      + STATS_ROWS.map(function(s){
          return '<div class="mk-train-input-row">'
            + '<span class="mk-train-input-label">' + _esc(s.label) + '</span>'
            + '<input type="range" class="mk-train-range" id="mk-trange-' + s.key + '" min="0" max="100" value="0" data-stat="' + s.key + '">'
            + '<input type="number" class="mk-train-num" id="mk-tnum-' + s.key + '" min="0" max="100" value="0" data-stat="' + s.key + '">'
            + '<span class="mk-train-pct-label" id="mk-tpct-' + s.key + '">0%</span>'
            + '</div>';
        }).join('')
      + '  </div>'
      + '</div>'

      // Preço
      + '<div class="mk-field">'
      + '  <label class="mk-label" for="mk-price">Preço (KK raw)</label>'
      + '  <input class="mk-input" id="mk-price" type="number" min="1" placeholder="Ex: 500000000 = 500kk">'
      + '  <span class="mk-field-hint" id="mk-price-preview"></span>'
      + '  <span class="mk-field-error" id="mk-err-price_kk"></span>'
      + '</div>'

      // Observações
      + '<div class="mk-field">'
      + '  <label class="mk-label" for="mk-obs">Observações <small>(opcional, máx 500)</small></label>'
      + '  <textarea class="mk-textarea" id="mk-obs" maxlength="500" placeholder="Informações adicionais..."></textarea>'
      + '  <span class="mk-field-error" id="mk-err-observations"></span>'
      + '</div>'

      // Footer
      + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">'
      + '  <button class="mk-btn mk-btn--ghost" onclick="MarketplaceCreate.close()">Cancelar</button>'
      + '  <button class="mk-btn mk-btn--primary" id="mk-submit-btn" onclick="'
      + (_mode === 'create' ? 'MarketplaceCreate.publish()' : 'MarketplaceCreate.saveEdit()')
      + '">' + _esc(submitLabel) + '</button>'
      + '</div>'

      + '</div>'  // mk-modal-body
      + '</div>'  // mk-modal
      + '</div>'; // mk-modal-backdrop
  }

  // ── Render modal ──────────────────────────────────────────────
  function _renderModal(title, submitLabel) {
    if (!_modalEl) {
      _modalEl = global.document.createElement('div');
      global.document.body.appendChild(_modalEl);
    }
    _modalEl.style.display = ''; // ensure visible before setting content
    _modalEl.innerHTML = _buildHtml(title || '📢 Novo Anúncio', submitLabel || 'Publicar');
  }

  // ── Bind all events ───────────────────────────────────────────
  function _bindEvents() {
    // Backdrop close
    var backdrop = global.document.getElementById('mk-create-backdrop');
    if (backdrop) backdrop.addEventListener('click', function(e){ if (e.target === backdrop) close(); });

    // Pokémon autocomplete
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
    Array.prototype.forEach.call(
      global.document.querySelectorAll('.mk-star-btn'),
      function (btn) {
        btn.addEventListener('click', function () {
          var val = parseInt(btn.getAttribute('data-val'), 10);
          _form.stars = (_form.stars === val) ? 0 : val;
          _updateStarsUI();
        });
      }
    );

    // Boost
    var boostSlider = global.document.getElementById('mk-boost-slider');
    var boostVal    = global.document.getElementById('mk-boost-val');
    if (boostSlider) {
      boostSlider.addEventListener('input', function () {
        _form.boost = parseInt(boostSlider.value, 10);
        if (boostVal) boostVal.textContent = '+' + _form.boost;
      });
    }

    // Training — slider/input sync bidirecional
    var STATS = ['attack','defense','hp','precision','evasion','critical_damage','critical_chance','critical_resistance'];
    STATS.forEach(function (s) {
      var range = global.document.getElementById('mk-trange-' + s);
      var num   = global.document.getElementById('mk-tnum-' + s);
      var pct   = global.document.getElementById('mk-tpct-' + s);
      function _sync(val) {
        var v = Math.min(100, Math.max(0, parseInt(val, 10) || 0));
        _form.training[s] = v;
        if (range) range.value = v;
        if (num)   num.value   = v;
        if (pct)   pct.textContent = v + '%';
      }
      if (range) range.addEventListener('input', function () { _sync(range.value); });
      if (num)   num.addEventListener('input',  function () { _sync(num.value);   });
    });

    // Price preview
    var priceInput   = global.document.getElementById('mk-price');
    var pricePreview = global.document.getElementById('mk-price-preview');
    if (priceInput) {
      priceInput.addEventListener('input', function () {
        var v = Number(priceInput.value);
        _form.price_kk = v;
        if (pricePreview && typeof formatKK === 'function') {
          var fmt = formatKK(v);
          pricePreview.textContent = fmt ? fmt.label + ' (' + fmt.brl + ')' : '';
        }
      });
    }

    // Observations
    var obsEl = global.document.getElementById('mk-obs');
    if (obsEl) obsEl.addEventListener('input', function () { _form.observations = obsEl.value; });
  }

  // ── Populate held selects ─────────────────────────────────────
  function _populateHelds() {
    function _fill(selectId, category, currentId) {
      var sel = global.document.getElementById(selectId);
      if (!sel) return;
      function _render(helds) {
        var opts = '<option value="">— Nenhum —</option>';
        helds.forEach(function (h) {
          opts += '<option value="' + _esc(h.id) + '"' + (h.id === currentId ? ' selected' : '') + '>'
            + _esc(h.name)
            + (h.rarity ? ' [' + _esc(h.rarity) + ']' : '')
            + '</option>';
        });
        sel.innerHTML = opts;
        sel.addEventListener('change', function () {
          _form[category === 'X' ? 'held_x_id' : 'held_y_id'] = sel.value || null;
        });
      }
      if (typeof HeldsCatalog !== 'undefined') {
        if (HeldsCatalog.isLoaded()) {
          _render(HeldsCatalog.getByCategory(category));
        } else {
          HeldsCatalog.load().then(function () { _render(HeldsCatalog.getByCategory(category)); });
        }
      }
    }
    _fill('mk-held-x', 'X', _form.held_x_id);
    _fill('mk-held-y', 'Y', _form.held_y_id);
  }

  // ── Prefill form values into DOM (edit mode) ──────────────────
  function _prefillForm() {
    var pokeInput   = global.document.getElementById('mk-poke-input');
    var boostSlider = global.document.getElementById('mk-boost-slider');
    var boostVal    = global.document.getElementById('mk-boost-val');
    var priceInput  = global.document.getElementById('mk-price');
    var obsEl       = global.document.getElementById('mk-obs');

    if (pokeInput) pokeInput.value = _form.pokemon_name;
    if (boostSlider) { boostSlider.value = _form.boost; }
    if (boostVal) boostVal.textContent = '+' + _form.boost;
    if (priceInput) {
      priceInput.value = _form.price_kk || '';
      var pricePreview = global.document.getElementById('mk-price-preview');
      if (pricePreview && typeof formatKK === 'function') {
        var fmt = formatKK(Number(_form.price_kk));
        pricePreview.textContent = fmt ? fmt.label + ' (' + fmt.brl + ')' : '';
      }
    }
    if (obsEl) obsEl.value = _form.observations || '';

    _updateStarsUI();

    // Training sliders
    var STATS = ['attack','defense','hp','precision','evasion','critical_damage','critical_chance','critical_resistance'];
    STATS.forEach(function (s) {
      var v = _form.training[s] || 0;
      var range = global.document.getElementById('mk-trange-' + s);
      var num   = global.document.getElementById('mk-tnum-' + s);
      var pct   = global.document.getElementById('mk-tpct-' + s);
      if (range) range.value = v;
      if (num)   num.value   = v;
      if (pct)   pct.textContent = v + '%';
    });

    // Sprite preview
    if (_form.pokemon_name) {
      var sprites = typeof getSprites === 'function' ? getSprites(_form.pokemon_name) : null;
      if (sprites) _updatePokePreview({ name: _form.pokemon_name, sprite: sprites.static, types: _form.pokemon_types });
    }
  }

  // ── Update pokémon preview ────────────────────────────────────
  function _updatePokePreview(result) {
    var wrap  = global.document.getElementById('mk-poke-preview-wrap');
    var img   = global.document.getElementById('mk-poke-sprite');
    var name  = global.document.getElementById('mk-poke-name');
    var types = global.document.getElementById('mk-poke-types');
    if (!wrap) return;
    if (img) {
      img.src = result.sprite || '';
      img.style.display = result.sprite ? '' : 'none';
    }
    if (name)  name.textContent = result.name || '';
    if (types) types.innerHTML  = (result.types || []).map(function(t){
      return '<span class="mk-type-badge mk-type--' + _esc(t.toLowerCase()) + '">' + _esc(t) + '</span>';
    }).join('');
    wrap.style.display = '';
  }

  function _updateStarsUI() {
    Array.prototype.forEach.call(
      global.document.querySelectorAll('.mk-star-btn'),
      function (btn) {
        var val = parseInt(btn.getAttribute('data-val'), 10);
        btn.classList.toggle('active', val <= _form.stars);
      }
    );
  }

  // ── open (create) ─────────────────────────────────────────────
  function open() {
    var user = _user();
    if (!user) { _toast('Faça login para anunciar.', 'info'); return; }
    _mode   = 'create';
    _editId = null;
    _resetForm();
    _renderModal('📢 Novo Anúncio', 'Publicar');
    _bindEvents();
    _populateHelds();
    _log('Modal create aberto');
  }

  function close() {
    if (_modalEl) {
      _modalEl.innerHTML = '';
      _modalEl.style.display = 'none'; // FIX M3.2: hide wrapper — innerHTML='' alone leaves div in DOM
    }
    _mode = 'create';
    _editId = null;
    _log('Modal fechado');
  }

  // ── Public API ────────────────────────────────────────────────
  global.MarketplaceCreate = {
    open:         open,
    close:        close,
    openEdit:     openEdit,
    publish:      publishListing,
    saveEdit:     saveEdit,
    cancel:       cancelListing,
    getForm:      function () { return Object.assign({}, _form); },
    validate:     validateListing,
  };

  _log('marketplace-create.js M2 pronto');

}(window));
