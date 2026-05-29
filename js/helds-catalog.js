// ============================================================
// helds-catalog.js — Filipi Marketplace M1
// PokeAlliance Shop
//
// Carrega o catálogo de helds do banco e o expõe para
// seletores do modal de criação.
// Zero side effects no sistema atual.
// ============================================================

;(function (global) {
  'use strict';

  if (global.HeldsCatalog) return; // singleton

  var _log  = function () { console.log.apply(console,  ['[PA.marketplace]', '[helds]'].concat(Array.prototype.slice.call(arguments))); };
  var _warn = function () { console.warn.apply(console, ['[PA.marketplace ⚠]', '[helds]'].concat(Array.prototype.slice.call(arguments))); };

  var SB_URL = global.SUPABASE_URL || '';
  var SB_KEY = global.SUPABASE_KEY || '';

  var _catalog = { X: [], Y: [], all: [] };
  var _loaded = false;
  var _loading = false;
  var _callbacks = [];

  function _jwt() {
    return typeof Session !== 'undefined' && Session.getAccessToken
      ? Session.getAccessToken() : null;
  }

  async function load() {
    if (_loaded)  { return _catalog; }
    if (_loading) { return new Promise(function(r){ _callbacks.push(r); }); }
    _loading = true;

    try {
      var jwt = _jwt();
      var headers = { 'apikey': SB_KEY };
      if (jwt) headers['Authorization'] = 'Bearer ' + jwt;

      var res = await fetch(
        SB_URL + '/rest/v1/helds_catalog?is_active=eq.true&order=sort_order.asc,name.asc&select=*',
        { headers: headers }
      );
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();

      _catalog.all = Array.isArray(data) ? data : [];
      _catalog.X   = _catalog.all.filter(function (h) { return h.category === 'X'; });
      _catalog.Y   = _catalog.all.filter(function (h) { return h.category === 'Y'; });
      _loaded  = true;
      _loading = false;
      _log('Carregados:', _catalog.all.length, 'helds (X:', _catalog.X.length, '/ Y:', _catalog.Y.length + ')');

      // Notifica quem estava aguardando
      _callbacks.forEach(function (cb) { try { cb(_catalog); } catch (_) {} });
      _callbacks = [];
      return _catalog;
    } catch (err) {
      _loading = false;
      _warn('Erro ao carregar helds_catalog:', err.message);
      _callbacks.forEach(function (cb) { try { cb(_catalog); } catch (_) {} });
      _callbacks = [];
      return _catalog;
    }
  }

  function getByCategory(cat) { return cat === 'X' ? _catalog.X : _catalog.Y; }
  function getAll()            { return _catalog.all; }
  function getById(id)         { return _catalog.all.find(function(h){ return h.id === id; }) || null; }
  function isLoaded()          { return _loaded; }

    // ══════════════════════════════════════════════════════════
  // ADMIN CRUD — Modal "+ Held"
  // ══════════════════════════════════════════════════════════

  function _isAdmin() {
    // Fase 2 Passo 3.4: padrão único — Session.isAdmin().
    return typeof Session !== 'undefined' && typeof Session.isAdmin === 'function'
      ? Session.isAdmin()
      : false;
  }

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── _adminModalEl persists between opens ──────────────────────
  var _adminModalEl = null;
  var _adminEditId  = null;   // null = create, UUID = edit

  function _buildAdminHtml(held) {
    var title = held ? '✏️ Editar Held' : '➕ Novo Held';
    return '<div class="mk-modal-backdrop" id="hc-backdrop">'
      + '<div class="mk-modal" role="dialog" aria-modal="true" style="max-width:460px">'
      + '<div class="mk-modal-header">'
      + '  <span class="mk-modal-title">' + title + '</span>'
      + '  <button class="mk-modal-close" onclick="HeldsCatalog.adminClose()">✕</button>'
      + '</div>'
      + '<div class="mk-modal-body">'

      // Name
      + '<div class="mk-field">'
      + '  <label class="mk-label" for="hc-name">Nome</label>'
      + '  <input class="mk-input" id="hc-name" type="text" maxlength="80"'
      + '    placeholder="Ex: Life Orb" value="' + _esc(held ? held.name : '') + '">'
      + '</div>'

      // Slot type X/Y
      + '<div class="mk-field">'
      + '  <label class="mk-label">Slot</label>'
      + '  <div style="display:flex;gap:10px">'
      + '    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:var(--mk-text)">'
      + '      <input type="radio" id="hc-slot-x" name="hc-slot" value="X"'
      + ((!held || held.category === 'X') ? ' checked' : '') + '> Slot X</label>'
      + '    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:var(--mk-text)">'
      + '      <input type="radio" id="hc-slot-y" name="hc-slot" value="Y"'
      + (held && held.category === 'Y' ? ' checked' : '') + '> Slot Y</label>'
      + '  </div>'
      + '</div>'

      // Description
      + '<div class="mk-field">'
      + '  <label class="mk-label" for="hc-desc">Descrição</label>'
      + '  <textarea class="mk-textarea" id="hc-desc" maxlength="300"'
      + '    placeholder="Efeito do held...">' + _esc(held ? held.description || '' : '') + '</textarea>'
      + '</div>'

      // Image URL (Imgur)
      + '<div class="mk-field">'
      + '  <label class="mk-label" for="hc-img">Image URL (Imgur)</label>'
      + '  <input class="mk-input" id="hc-img" type="url" maxlength="300"'
      + '    placeholder="https://i.imgur.com/..." value="' + _esc(held ? held.sprite_url || '' : '') + '"'
      + '    oninput="HeldsCatalog._previewImg(this.value)">'
      + '  <div id="hc-img-preview" style="margin-top:8px;min-height:40px">'
      + (held && held.sprite_url ? '<img src="' + _esc(held.sprite_url) + '" style="width:48px;height:48px;object-fit:contain" onerror="this.style.display=&quot;none&quot;">' : '')
      + '  </div>'
      + '</div>'

      // Rarity
      + '<div class="mk-field">'
      + '  <label class="mk-label" for="hc-rarity">Raridade</label>'
      + '  <select class="mk-select" id="hc-rarity">'
      + ['common','uncommon','rare','epic','legendary'].map(function(r){
          return '<option value="' + r + '"' + (held && held.rarity === r ? ' selected' : '') + '>'
            + r.charAt(0).toUpperCase() + r.slice(1) + '</option>';
        }).join('')
      + '  </select>'
      + '</div>'

      // Active toggle (edit only)
      + (held ? '<div class="mk-field" style="flex-direction:row;align-items:center;gap:10px">'
        + '<label class="mk-label" style="margin:0">Ativo</label>'
        + '<input type="checkbox" id="hc-active"' + (held.is_active !== false ? ' checked' : '') + '>'
        + '</div>' : '')

      // Buttons
      + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">'
      + '  <button class="mk-btn mk-btn--ghost" onclick="HeldsCatalog.adminClose()">Cancelar</button>'
      + '  <button class="mk-btn mk-btn--primary" id="hc-save-btn" onclick="HeldsCatalog.adminSave()">Salvar</button>'
      + '</div>'

      + '</div></div></div>';
  }

  // ── Open admin modal (create or edit) ─────────────────────────
  function adminOpen(held) {
    if (!_isAdmin()) { return; }
    _adminEditId = held ? held.id : null;

    if (!_adminModalEl) {
      _adminModalEl = global.document.createElement('div');
      global.document.body.appendChild(_adminModalEl);
    }
    _adminModalEl.innerHTML = _buildAdminHtml(held || null);
    _adminModalEl.style.display = '';

    // Close on backdrop click
    var backdrop = global.document.getElementById('hc-backdrop');
    if (backdrop) backdrop.addEventListener('click', function(e){ if (e.target === backdrop) adminClose(); });
  }

  function adminClose() {
    if (_adminModalEl) {
      _adminModalEl.innerHTML = '';
      _adminModalEl.style.display = 'none';
    }
    _adminEditId = null;
  }

  // ── Preview image ──────────────────────────────────────────────
  function _previewImg(url) {
    var wrap = global.document.getElementById('hc-img-preview');
    if (!wrap) return;
    if (!url) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = '<img src="' + _esc(url) + '" style="width:48px;height:48px;object-fit:contain" onerror="this.style.display=&quot;none&quot;">';
  }

  // ── Save (INSERT or UPDATE) ────────────────────────────────────
  async function adminSave() {
    if (!_isAdmin()) return;

    var nameEl    = global.document.getElementById('hc-name');
    var descEl    = global.document.getElementById('hc-desc');
    var imgEl     = global.document.getElementById('hc-img');
    var rarityEl  = global.document.getElementById('hc-rarity');
    var activeEl  = global.document.getElementById('hc-active');
    var slotEl    = global.document.querySelector('input[name="hc-slot"]:checked');
    var saveBtn   = global.document.getElementById('hc-save-btn');

    var name  = nameEl  ? nameEl.value.trim()  : '';
    var desc  = descEl  ? descEl.value.trim()  : '';
    var img   = imgEl   ? imgEl.value.trim()   : '';
    var rar   = rarityEl? rarityEl.value        : 'common';
    var slot  = slotEl  ? slotEl.value          : 'X';
    var active = activeEl ? activeEl.checked    : true;

    if (!name) {
      if (nameEl) nameEl.focus();
      _warn('adminSave: nome obrigatório');
      return;
    }

    // Slug from name
    var slug = name.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'');
    if (!slug) { _warn('adminSave: slug inválido'); return; }

    var payload = {
      name:        name,
      slug:        slug,
      category:    slot,
      description: desc  || null,
      sprite_url:  img   || null,
      rarity:      rar,
      is_active:   active,
    };

    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ Salvando...'; }

    try {
      var jwt = _jwt();
      var headers = {
        'Content-Type':  'application/json',
        'apikey':        SB_KEY,
        'Authorization': 'Bearer ' + jwt,
        'Prefer':        'return=representation',
      };

      var url, method;
      if (_adminEditId) {
        // UPDATE
        url    = SB_URL + '/rest/v1/helds_catalog?id=eq.' + _adminEditId;
        method = 'PATCH';
        // Don't send slug on update (might conflict UNIQUE)
        delete payload.slug;
      } else {
        // INSERT
        url    = SB_URL + '/rest/v1/helds_catalog';
        method = 'POST';
      }

      var res = await fetch(url, { method: method, headers: headers, body: JSON.stringify(payload) });
      if (!res.ok) {
        var txt = await res.text();
        console.error('[HeldsCatalog] adminSave error:', txt);
        _warn('Erro ao salvar held:', txt);
        if (typeof showToast === 'function') showToast('Erro ao salvar held.', 'error');
        return;
      }

      var saved = await res.json().catch(function(){ return null; });
      var savedHeld = Array.isArray(saved) ? saved[0] : saved;

      // Update local catalog cache
      _loaded = false; // force reload
      await load();

      if (typeof showToast === 'function') {
        showToast(_adminEditId ? '✅ Held atualizado!' : '✅ Held criado!', 'success');
      }

      // Emit realtime hint via PA.hooks
      if (global.PA && global.PA.hooks) {
        try { global.PA.hooks.emit('marketplace:helds_updated', savedHeld); } catch(_) {}
      }

      adminClose();
    } catch (err) {
      _warn('adminSave exception:', err.message);
      if (typeof showToast === 'function') showToast('Erro ao salvar held.', 'error');
    } finally {
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Salvar'; }
    }
  }

  // ── Render admin button in marketplace header ─────────────────
  function renderAdminButton() {
    if (!_isAdmin()) return;
    // Inject "+ Held" button into .mk-header-actions if it doesn't already exist
    var actions = global.document.querySelector('#tab-marketplace .mk-header-actions');
    if (!actions || actions.querySelector('.hc-admin-btn')) return;
    var btn = global.document.createElement('button');
    btn.className = 'mk-btn mk-btn--ghost hc-admin-btn';
    btn.textContent = '+ Held';
    btn.setAttribute('onclick', 'HeldsCatalog.adminOpen()');
    actions.insertBefore(btn, actions.firstChild);
  }

  global.HeldsCatalog = {
    load: load, getByCategory: getByCategory, getAll: getAll, getById: getById, isLoaded: isLoaded,
    // Admin CRUD
    adminOpen:    adminOpen,
    adminClose:   adminClose,
    adminSave:    adminSave,
    _previewImg:  _previewImg,
    renderAdminButton: renderAdminButton,
  };
  _log('helds-catalog.js v2 (admin CRUD) pronto');

}(window));