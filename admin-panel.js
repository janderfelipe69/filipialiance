// ============================================================
// admin-panel.js — Painel de administração inline
// PokeAlliance Shop
//
// Aparece SOMENTE para usuários com role = 'admin'.
// Botão [+ Admin] no topo de cada aba: Itens, Pacotes, Captura.
// Operações: adicionar, editar, remover via Supabase REST.
// ============================================================
;(function (global) {
  'use strict';

  // ── Helpers ──────────────────────────────────────────────────────────────
  function isAdmin() {
    return typeof Session !== 'undefined' && Session.isAdmin && Session.isAdmin();
  }

  // Aguarda Session.ready() e retorna o JWT real
  function getJwtAsync() {
    if (typeof Session === 'undefined') return Promise.resolve(null);
    return Session.ready().then(function() {
      var t = Session.getAccessToken ? Session.getAccessToken() : null;
      if (!t) console.warn('[admin-panel] getJwtAsync: token null após Session.ready()');
      return t;
    });
  }

  function sbFetch(method, path, body) {
    return getJwtAsync().then(function(jwt) {
      if (!jwt) {
        console.error('[admin-panel] JWT indisponível — operação abortada');
        throw new Error('Sessão expirada. Recarregue a página e tente novamente.');
      }
      console.log('[admin-panel]', method, path, '| jwt:', jwt.substring(0,20) + '...');
      return fetch(global.SUPABASE_URL + '/rest/v1/' + path, {
        method:  method,
        headers: {
          'Content-Type':  'application/json',
          'apikey':        global.SUPABASE_KEY,
          'Authorization': 'Bearer ' + jwt,
          'Prefer':        'return=representation',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    }).then(function(r) {
      if (!r.ok) return r.text().then(function(t) { throw new Error(t.slice(0,300)); });
      return r.json().catch(function() { return {}; });
    });
  }

  // Para GETs que não precisam de auth (usa anon key)
  function sbGet(path) {
    return fetch(global.SUPABASE_URL + '/rest/v1/' + path, {
      headers: {
        'apikey':        global.SUPABASE_KEY,
        'Authorization': 'Bearer ' + global.SUPABASE_KEY,
      }
    }).then(function(r) { return r.json(); });
  }

  // ── Modal base ───────────────────────────────────────────────────────────
  function openModal(title, bodyHtml, onConfirm, confirmLabel) {
    var existing = document.getElementById('admin-modal-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'admin-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';

    var modal = document.createElement('div');
    modal.style.cssText = 'background:#1a1d2e;border:1px solid #2a2d45;border-radius:12px;padding:24px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;color:#e0e4ff';
    modal.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">' +
        '<h3 style="margin:0;font-size:1.1rem;color:#7eb3ff">' + title + '</h3>' +
        '<button id="admin-modal-close" style="background:none;border:none;color:#888;font-size:1.4rem;cursor:pointer;line-height:1">×</button>' +
      '</div>' +
      '<div id="admin-modal-body">' + bodyHtml + '</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px">' +
        '<button id="admin-modal-cancel" style="padding:8px 18px;border-radius:6px;border:1px solid #444;background:transparent;color:#aaa;cursor:pointer">Cancelar</button>' +
        '<button id="admin-modal-confirm" style="padding:8px 18px;border-radius:6px;border:none;background:#4a9aff;color:#fff;cursor:pointer;font-weight:600">' + (confirmLabel || 'Salvar') + '</button>' +
      '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function close() { overlay.remove(); }
    document.getElementById('admin-modal-close').onclick  = close;
    document.getElementById('admin-modal-cancel').onclick = close;
    overlay.onclick = function(e) { if (e.target === overlay) close(); };
    document.getElementById('admin-modal-confirm').onclick = function() {
      onConfirm(close);
    };
  }

  function showToast(msg, ok) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:' +
      (ok !== false ? '#1e4a2a' : '#4a1e1e') +
      ';color:#fff;padding:10px 20px;border-radius:8px;z-index:10000;font-size:.9rem;pointer-events:none';
    document.body.appendChild(t);
    setTimeout(function() { t.remove(); }, 3000);
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  // ── Estilos ───────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '.admin-bar{display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:8px;background:rgba(74,154,255,.06);border-radius:8px;border:1px dashed rgba(74,154,255,.2)}',
    '.admin-bar-label{font-size:.75rem;color:#4a9aff;font-weight:600;text-transform:uppercase;letter-spacing:.05em;flex:1}',
    '.admin-btn{padding:5px 12px;border-radius:6px;border:1px solid rgba(74,154,255,.4);background:rgba(74,154,255,.1);color:#7eb3ff;font-size:.8rem;cursor:pointer;display:flex;align-items:center;gap:5px;transition:background .2s}',
    '.admin-btn:hover{background:rgba(74,154,255,.2)}',
    '.admin-btn.danger{border-color:rgba(255,80,80,.4);background:rgba(255,80,80,.08);color:#ff9090}',
    '.admin-btn.danger:hover{background:rgba(255,80,80,.18)}',
    '.admin-field{width:100%;padding:8px 10px;background:#0f1120;border:1px solid #2a2d45;border-radius:6px;color:#e0e4ff;font-size:.9rem;margin-top:4px;box-sizing:border-box}',
    '.admin-field:focus{outline:none;border-color:#4a9aff}',
    '.admin-label{font-size:.8rem;color:#888;margin-top:12px;display:block}',
    '.admin-row{display:flex;gap:8px}',
    '.admin-row .admin-field{flex:1}',
    '.admin-item-row{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;background:#0f1120;margin-bottom:4px;font-size:.85rem}',
    '.admin-item-row:hover{background:#151828}',
    '.admin-item-name{flex:1;color:#c0c8ff}',
    '.admin-item-tier{font-size:.75rem;padding:2px 7px;border-radius:4px;background:#1a2040;color:#7eb3ff}',
    '.admin-item-price{color:#4a9aff;font-size:.8rem;min-width:60px;text-align:right}',
  ].join('\n');
  document.head.appendChild(style);

  // ── ITENS ────────────────────────────────────────────────────────────────
  var TIERS = ['mark','t1','t2','t3','t4','t5','t6','t7','sr'];

  function openAddItem() {
    var html =
      '<label class="admin-label">Nome do item *</label>' +
      '<input class="admin-field" id="ai-name" placeholder="ex: fire tail">' +
      '<div class="admin-row" style="margin-top:0">' +
        '<div style="flex:1"><label class="admin-label">Preço (R$)</label><input class="admin-field" id="ai-price" type="number" step="0.01" min="0" placeholder="0.00"></div>' +
        '<div style="flex:1"><label class="admin-label">Tier de drop</label><select class="admin-field" id="ai-tier"><option value="">— sem tier —</option>' +
          TIERS.map(function(t){return '<option value="'+t+'">'+t.toUpperCase()+'</option>';}).join('') +
        '</select></div>' +
      '</div>' +
      '<label class="admin-label">Pokémon que dropa (opcional)</label>' +
      '<input class="admin-field" id="ai-pokemon" placeholder="ex: Arcanine">' +
      '<label class="admin-label">Quantidade que cai</label>' +
      '<input class="admin-field" id="ai-qty" placeholder="ex: 1 ou 1-4">';

    openModal('➕ Adicionar Item', html, function(close) {
      var name = val('ai-name');
      if (!name) { showToast('Nome obrigatório', false); return; }
      var price = parseFloat(val('ai-price')) || null;
      var tier  = val('ai-tier') || null;
      sbFetch('POST', 'catalog_items', { name: name, price_brl: price, drop_tier: tier, is_active: true })
        .then(function(rows) {
          var itemId = rows && rows[0] && rows[0].id;
          var pokemon = val('ai-pokemon');
          var qty     = val('ai-qty') || '1';
          if (itemId && pokemon) {
            return sbFetch('POST', 'catalog_item_drops', { item_id: itemId, pokemon_name: pokemon, drop_qty: qty });
          }
        })
        .then(function() {
          showToast('Item adicionado!');
          close();
          reloadItems();
        })
        .catch(function(e) { showToast('Erro: ' + e.message, false); });
    });
  }

  function openEditItem(item) {
    // Load drops for this item
    sbGet('catalog_item_drops?item_id=eq.' + item.id + '&select=id,pokemon_name,drop_qty')
      .then(function(drops) {
        var dropsHtml = drops.map(function(d) {
          return '<div class="admin-item-row" id="drop-row-'+d.id+'">' +
            '<span class="admin-item-name">'+d.pokemon_name+'</span>' +
            '<span class="admin-item-tier">'+d.drop_qty+'</span>' +
            '<button class="admin-btn danger" onclick="window._adminDeleteDrop(\''+d.id+'\')">✕</button>' +
          '</div>';
        }).join('') || '<div style="color:#666;font-size:.8rem;padding:4px">Nenhum drop vinculado</div>';

        var html =
          '<label class="admin-label">Nome</label>' +
          '<input class="admin-field" id="ei-name" value="'+item.name+'">' +
          '<div class="admin-row" style="margin-top:0">' +
            '<div style="flex:1"><label class="admin-label">Preço (R$)</label><input class="admin-field" id="ei-price" type="number" step="0.01" value="'+(item.price_brl||'')+'" placeholder="0.00"></div>' +
            '<div style="flex:1"><label class="admin-label">Tier</label><select class="admin-field" id="ei-tier"><option value="">— sem tier —</option>' +
              TIERS.map(function(t){return '<option value="'+t+'"'+(item.tier===t?' selected':'')+'>'+t.toUpperCase()+'</option>';}).join('') +
            '</select></div>' +
          '</div>' +
          '<label class="admin-label" style="margin-top:14px">Pokémons que dropam</label>' +
          '<div id="ei-drops" style="margin:6px 0 8px">' + dropsHtml + '</div>' +
          '<div class="admin-row">' +
            '<input class="admin-field" id="ei-new-poke" placeholder="Pokémon">' +
            '<input class="admin-field" id="ei-new-qty" placeholder="Qtd (ex: 1-4)" style="max-width:100px">' +
            '<button class="admin-btn" onclick="window._adminAddDrop(\''+item.id+'\')">+ Drop</button>' +
          '</div>';

        global._adminDeleteDrop = function(dropId) {
          sbFetch('DELETE', 'catalog_item_drops?id=eq.' + dropId, null)
            .then(function() {
              var row = document.getElementById('drop-row-' + dropId);
              if (row) row.remove();
            }).catch(function(e) { showToast('Erro: ' + e.message, false); });
        };

        global._adminAddDrop = function(itemId) {
          var poke = val('ei-new-poke');
          var qty  = val('ei-new-qty') || '1';
          if (!poke) return;
          sbFetch('POST', 'catalog_item_drops', { item_id: itemId, pokemon_name: poke, drop_qty: qty })
            .then(function(rows) {
              var d = rows && rows[0];
              if (!d) return;
              var container = document.getElementById('ei-drops');
              var div = document.createElement('div');
              div.className = 'admin-item-row';
              div.id = 'drop-row-' + d.id;
              div.innerHTML = '<span class="admin-item-name">'+poke+'</span><span class="admin-item-tier">'+qty+'</span><button class="admin-btn danger" onclick="window._adminDeleteDrop(\''+d.id+'\')">✕</button>';
              container.appendChild(div);
              document.getElementById('ei-new-poke').value = '';
              document.getElementById('ei-new-qty').value  = '';
            }).catch(function(e) { showToast('Erro: ' + e.message, false); });
        };

        openModal('✏️ Editar Item: ' + item.name, html, function(close) {
          var updates = {
            name:      val('ei-name'),
            price_brl: parseFloat(val('ei-price')) || null,
            drop_tier: val('ei-tier') || null,
          };
          sbFetch('PATCH', 'catalog_items?id=eq.' + item.id, updates)
            .then(function() { showToast('Item salvo!'); close(); reloadItems(); })
            .catch(function(e) { showToast('Erro: ' + e.message, false); });
        });
      });
  }

  function openDeleteItem(item) {
    openModal('🗑️ Remover Item', '<p style="color:#ffaaaa">Desativar <strong>'+item.name+'</strong>?<br><small style="color:#888">O item ficará oculto mas os dados são mantidos.</small></p>', function(close) {
      sbFetch('PATCH', 'catalog_items?id=eq.' + item.id, { is_active: false })
        .then(function() { showToast('Item removido.'); close(); reloadItems(); })
        .catch(function(e) { showToast('Erro: ' + e.message, false); });
    }, 'Desativar');
  }

  function reloadItems() {
    sbGet('catalog_items?select=id,name,price_brl,drop_tier&is_active=eq.true&order=name')
      .then(function(rows) {
        global.items.length = 0;
        rows.forEach(function(r, i) {
          global.items.push({ id: r.id, name: r.name, image: '', price: null, price_brl: r.price_brl, tier: r.drop_tier || '', evo: '', _idx: i });
        });
        if (typeof renderItems === 'function') renderItems();
        var el = document.getElementById('total-count');
        if (el) el.textContent = global.items.length + ' itens no índice';
      });
  }

  // ── POKÉMONS ─────────────────────────────────────────────────────────────

  // Mapa de tipo → URL do banner (Imgur IDs — espelha BANNER_TYPE_MAP de app.js)
  var TYPE_BANNER_MAP = {
    water:    'https://i.imgur.com/zpRe43i.png',
    steel:    'https://i.imgur.com/GleRjiM.png',
    rock:     'https://i.imgur.com/GvD1Mtq.png',
    psychic:  'https://i.imgur.com/ASiZi1K.png',
    poison:   'https://i.imgur.com/xfX0ReE.png',
    normal:   'https://i.imgur.com/w2ChsIe.png',
    ice:      'https://i.imgur.com/ssFz0sA.png',
    ground:   'https://i.imgur.com/JPcD2l3.png',
    fire:     'https://i.imgur.com/O8TONGE.png',
    grass:    'https://i.imgur.com/YjKxtoE.png',
    electric: 'https://i.imgur.com/Yv2WEYc.png',
    dark:     'https://i.imgur.com/7Luj4az.png',
    dragon:   'https://i.imgur.com/o7JWbaN.png',
    ghost:    'https://i.imgur.com/HuybbPn.png',
    fairy:    'https://i.imgur.com/j3HaXTh.png',
    flying:   'https://i.imgur.com/npGjQae.png',
    bug:      'https://i.imgur.com/V4IXR51.png',
    fighting: 'https://i.imgur.com/OKsJXh7.png',
  };

  // Detecta o tipo primário pelo nome do pokémon.
  // Remove prefixos como "Shiny", "Shadow", "Mega", etc.
  // Usa POKEMON_TYPE_MAP (respawn_patch_modal.js) se disponível,
  // senão usa uma lista de fallback embutida para os casos mais comuns.
  function _getTypeForPokemon(name) {
    if (!name) return null;
    // Remove prefixos decorativos
    var clean = name.replace(/^(shiny|shadow|mega|alolan|galarian|hisuian|paldean)\s+/gi, '').trim();
    // Tenta POKEMON_TYPE_MAP global (definido em respawn_patch_modal.js)
    if (typeof POKEMON_TYPE_MAP !== 'undefined') {
      var types = POKEMON_TYPE_MAP[clean] || POKEMON_TYPE_MAP[clean.toLowerCase()];
      if (types && types.length) return types[0];
    }
    // Fallback embutido para os pokémons mais comuns do catálogo
    var _fallback = {
      Charizard:'fire', Charmander:'fire', Charmeleon:'fire',
      Blastoise:'water', Squirtle:'water', Wartortle:'water',
      Venusaur:'grass', Bulbasaur:'grass', Ivysaur:'grass',
      Pikachu:'electric', Raichu:'electric', Zapdos:'electric',
      Gengar:'ghost', Haunter:'ghost', Gastly:'ghost',
      Mewtwo:'psychic', Alakazam:'psychic', Espeon:'psychic',
      Machamp:'fighting', Machoke:'fighting', Machop:'fighting',
      Dragonite:'dragon', Dratini:'dragon', Dragonair:'dragon',
      Umbreon:'dark', Absol:'dark', Weavile:'dark',
      Gardevoir:'fairy', Clefable:'fairy', Togekiss:'fairy',
      Gyarados:'water', Lapras:'water', Vaporeon:'water',
      Arcanine:'fire', Ninetales:'fire', Flareon:'fire',
      Leafeon:'grass', Sceptile:'grass', Tropius:'grass',
      Glaceon:'ice', Articuno:'ice', Mamoswine:'ice',
      Lucario:'fighting', Heracross:'fighting',
      Tyranitar:'rock', Golem:'rock', Omastar:'rock',
      Garchomp:'dragon', Salamence:'dragon',
      Metagross:'steel', Scizor:'steel', Magnezone:'steel',
      Nidoking:'poison', Nidoqueen:'poison', Beedrill:'poison',
      Flygon:'dragon', Aggron:'steel',
    };
    return _fallback[clean] || _fallback[name] || null;
  }

  // Retorna a URL do banner correspondente ao tipo primário do pokémon.
  // Se não encontrar, retorna null (sem banner — não quebra o card).
  function _getBannerForPokemon(name) {
    var type = _getTypeForPokemon(name);
    return type ? (TYPE_BANNER_MAP[type] || null) : null;
  }

  // Atualiza o preview de tipagem no formulário em tempo real.
  function _updateTypePreview(inputId, previewId) {
    var nameEl    = document.getElementById(inputId);
    var previewEl = document.getElementById(previewId);
    if (!nameEl || !previewEl) return;
    var name   = nameEl.value.trim();
    var type   = _getTypeForPokemon(name);
    var banner = type ? TYPE_BANNER_MAP[type] : null;
    if (type && banner) {
      previewEl.innerHTML =
        '<img src="' + banner + '" style="height:28px;vertical-align:middle;border-radius:4px;margin-right:6px" onerror="this.style.display=\'none\'">' +
        '<span style="color:#aef;font-size:.82rem;text-transform:capitalize">' + type + '</span>';
    } else if (name) {
      previewEl.innerHTML = '<span style="color:#888;font-size:.82rem">Tipo não reconhecido — banner não será adicionado</span>';
    } else {
      previewEl.innerHTML = '';
    }
  }

  var POKE_TIERS = ['t1','t2','t3','super-raro','ultra-raro','legendary','mythical'];

  function openAddPokemon() {
    window._adminTypeBannerMap = TYPE_BANNER_MAP;
    window._adminGetType       = _getTypeForPokemon;
    var html =
      '<label class="admin-label">Nome do Pokémon * <small style="color:#4a9aff">(tipagem detectada automaticamente)</small></label>' +
      '<input class="admin-field" id="ap-name" placeholder="ex: Shiny Charizard" oninput="window._adminPreviewType(&apos;ap-name&apos;,&apos;ap-type-preview&apos;)">' +
      '<div id="ap-type-preview" style="min-height:28px;margin:-2px 0 8px;display:flex;align-items:center"></div>' +
      '<div class="admin-row" style="margin-top:0">' +
        '<div style="flex:1"><label class="admin-label">Preço (R$) *</label><input class="admin-field" id="ap-price" type="number" step="0.01" min="0" placeholder="64.60"></div>' +
        '<div style="flex:1"><label class="admin-label">Tier</label><select class="admin-field" id="ap-tier">' +
          POKE_TIERS.map(function(t){return '<option value="'+t+'">'+t+'</option>';}).join('') +
        '</select></div>' +
      '</div>' +
      '<label class="admin-label">Tempo estimado de captura</label>' +
      '<input class="admin-field" id="ap-eta" placeholder="ex: 7 dias ou 45 dias">' +
      '<div style="margin-top:8px"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:#aaa;font-size:.82rem"><input type="checkbox" id="ap-dive"> É Dive (multiplicador 1.3x no preço)</label></div>';

    openModal('➕ Adicionar Pokémon', html, function(close) {
      var name = val('ap-name');
      if (!name) { showToast('Nome obrigatório', false); return; }
      var price = parseFloat(val('ap-price')) || null;
      if (!price) { showToast('Preço obrigatório', false); return; }
      var etaText = val('ap-eta') || '7 dias';
      var etaMin  = etaText.includes('45') ? 64800 : 10080;
      var isDive  = document.getElementById('ap-dive').checked;
      var bannerUrl = _getBannerForPokemon(name);
      sbFetch('POST', 'catalog_pokemons', {
        name:                name,
        price_brl:           price,
        tier:                val('ap-tier'),
        avg_capture_minutes: etaMin,
        is_dive:             isDive,
        banner_image_url:    bannerUrl,
        is_active:           true,
      }).then(function() {
        var detectedType = _getTypeForPokemon(name);
        showToast('Pokémon adicionado!' + (detectedType ? ' Tipo: ' + detectedType : ' (tipo não detectado)'));
        close();
        reloadPokemons();
      }).catch(function(e) { showToast('Erro: ' + e.message, false); });
    });
  }

  function openEditPokemon(poke) {
    window._adminTypeBannerMap = TYPE_BANNER_MAP;
    window._adminGetType       = _getTypeForPokemon;
    var etaDays      = poke.avg_capture_minutes >= 60000 ? '45 dias' : '7 dias';
    var currentType  = _getTypeForPokemon(poke.name);
    var currentBanner = poke.bannerImage || (currentType ? TYPE_BANNER_MAP[currentType] : '');
    var previewHtml  = currentType && currentBanner
      ? '<img src="' + currentBanner + '" style="height:26px;vertical-align:middle;border-radius:4px;margin-right:6px"><span style="color:#aef;font-size:.82rem;text-transform:capitalize">' + currentType + '</span>'
      : '<span style="color:#888;font-size:.82rem">tipo não reconhecido</span>';

    var html =
      '<label class="admin-label">Nome <small style="color:#4a9aff">(alterar re-detecta o tipo)</small></label>' +
      '<input class="admin-field" id="ep-name" value="' + poke.name + '" oninput="window._adminPreviewType(&apos;ep-name&apos;,&apos;ep-type-preview&apos;)">' +
      '<div id="ep-type-preview" style="min-height:28px;margin:-2px 0 8px;display:flex;align-items:center">' + previewHtml + '</div>' +
      '<div class="admin-row" style="margin-top:0">' +
        '<div style="flex:1"><label class="admin-label">Preço (R$)</label><input class="admin-field" id="ep-price" type="number" step="0.01" value="' + (poke.price_brl || '') + '"></div>' +
        '<div style="flex:1"><label class="admin-label">Tier</label><select class="admin-field" id="ep-tier">' +
          POKE_TIERS.map(function(t){return '<option value="'+t+'"'+(poke.tag===t?' selected':'')+'>'+t+'</option>';}).join('') +
        '</select></div>' +
      '</div>' +
      '<label class="admin-label">Tempo estimado</label>' +
      '<input class="admin-field" id="ep-eta" value="' + etaDays + '" placeholder="ex: 7 dias">' +
      '<div style="margin-top:8px"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:#aaa;font-size:.82rem"><input type="checkbox" id="ep-dive"' + (poke.dive ? ' checked' : '') + '> É Dive</label></div>';

    openModal('✏️ Editar: ' + poke.name, html, function(close) {
      var newName   = val('ep-name');
      var etaText   = val('ep-eta');
      var etaMin    = etaText.includes('45') ? 64800 : 10080;
      var newBanner = _getBannerForPokemon(newName) || poke.bannerImage || null;
      sbFetch('PATCH', 'catalog_pokemons?id=eq.' + poke.id, {
        name:                newName,
        price_brl:           parseFloat(val('ep-price')) || null,
        tier:                val('ep-tier'),
        avg_capture_minutes: etaMin,
        is_dive:             document.getElementById('ep-dive').checked,
        banner_image_url:    newBanner,
      }).then(function() { showToast('Pokémon salvo!'); close(); reloadPokemons(); })
        .catch(function(e) { showToast('Erro: ' + e.message, false); });
    });
  }

  function openDeletePokemon(poke) {
    openModal('🗑️ Remover Pokémon', '<p style="color:#ffaaaa">Desativar <strong>'+poke.name+'</strong>?</p>', function(close) {
      sbFetch('PATCH', 'catalog_pokemons?id=eq.' + poke.id, { is_active: false })
        .then(function() { showToast('Pokémon removido.'); close(); reloadPokemons(); })
        .catch(function(e) { showToast('Erro: ' + e.message, false); });
    }, 'Desativar');
  }

  function reloadPokemons() {
    sbGet('catalog_pokemons?select=id,name,price_brl,tier,banner_image_url,is_dive,avg_capture_minutes&is_active=eq.true&order=sort_order')
      .then(function(rows) {
        var cfg = global.APP_CONFIG || {};
        var kkToBrl  = cfg.kk_to_brl  || 1.70;
        var rawPerKk = cfg.raw_per_kk || 1000000;
        global.POKEMONS.length = 0;
        rows.forEach(function(r, i) {
          var raw = r.price_brl ? Math.floor(r.price_brl / kkToBrl * rawPerKk) : null;
          global.POKEMONS.push({
            id: r.id, name: r.name,
            price: raw, price_brl: r.price_brl,
            tag: r.tier || '', image: '', bannerImage: r.banner_image_url || '',
            dive: !!r.is_dive, avg_capture_minutes: r.avg_capture_minutes || 10080,
            _idx: i,
          });
        });
        if (typeof renderCaptura === 'function') renderCaptura();
      });
  }

  // ── PACOTES ───────────────────────────────────────────────────────────────
  function openAddPackage() {
    var html =
      '<label class="admin-label">Nome do pacote *</label>' +
      '<input class="admin-field" id="apkg-name" placeholder="ex: Talent Fire 7/8">' +
      '<label class="admin-label">Descrição (opcional)</label>' +
      '<input class="admin-field" id="apkg-desc" placeholder="Breve descrição">';
    openModal('➕ Adicionar Pacote', html, function(close) {
      var name = val('apkg-name');
      if (!name) { showToast('Nome obrigatório', false); return; }
      var order = global.PACKAGES ? global.PACKAGES.length : 0;
      sbFetch('POST', 'catalog_packages', { name: name, description: val('apkg-desc') || null, sort_order: order, is_active: true })
        .then(function() { showToast('Pacote criado! Adicione os slots pelo Supabase por enquanto.'); close(); })
        .catch(function(e) { showToast('Erro: ' + e.message, false); });
    });
  }

  function openDeletePackage(pi) {
    var pkg = global.PACKAGES && global.PACKAGES[pi];
    if (!pkg) return;
    openModal('🗑️ Remover Pacote', '<p style="color:#ffaaaa">Desativar <strong>'+pkg.name+'</strong>?</p>', function(close) {
      sbGet('catalog_packages?name=eq.' + encodeURIComponent(pkg.name))
        .then(function(rows) {
          if (!rows || !rows[0]) throw new Error('Pacote não encontrado');
          return sbFetch('PATCH', 'catalog_packages?id=eq.' + rows[0].id, { is_active: false });
        })
        .then(function() { showToast('Pacote removido.'); close(); location.reload(); })
        .catch(function(e) { showToast('Erro: ' + e.message, false); });
    }, 'Desativar');
  }

  // ── Injeção das barras de admin nas abas ─────────────────────────────────
  function injectAdminBars() {
    if (!isAdmin()) return;

    // ── Aba Itens ──
    var itemsGrid = document.getElementById('items-grid');
    if (itemsGrid && !document.getElementById('admin-bar-items')) {
      var bar = document.createElement('div');
      bar.id = 'admin-bar-items';
      bar.className = 'admin-bar';
      bar.innerHTML =
        '<span class="admin-bar-label">⚙️ Admin — Itens</span>' +
        '<button class="admin-btn" onclick="window.__adminOpenAddItem()">➕ Adicionar item</button>';
      itemsGrid.parentElement.insertBefore(bar, itemsGrid);
    }

    // ── Aba Captura ──
    var capturaGrid = document.getElementById('captura-grid');
    if (capturaGrid && !document.getElementById('admin-bar-captura')) {
      var bar2 = document.createElement('div');
      bar2.id = 'admin-bar-captura';
      bar2.className = 'admin-bar';
      bar2.innerHTML =
        '<span class="admin-bar-label">⚙️ Admin — Pokémons</span>' +
        '<button class="admin-btn" onclick="window.__adminOpenAddPokemon()">➕ Adicionar pokémon</button>';
      capturaGrid.parentElement.insertBefore(bar2, capturaGrid);
      // Re-renderiza os cards para que os botões ✏️/🗑️ apareçam
      // (pode ter renderizado antes do admin-panel carregar)
      if (typeof renderCaptura === 'function') renderCaptura();
    }

    // ── Aba Pacotes ──
    var pkgSidebar = document.getElementById('pkg-sidebar-list');
    if (pkgSidebar && !document.getElementById('admin-bar-packages')) {
      var bar3 = document.createElement('div');
      bar3.id = 'admin-bar-packages';
      bar3.className = 'admin-bar';
      bar3.style.margin = '8px';
      bar3.innerHTML =
        '<span class="admin-bar-label">⚙️ Admin</span>' +
        '<button class="admin-btn" onclick="window.__adminOpenAddPackage()">➕ Pacote</button>';
      pkgSidebar.parentElement.insertBefore(bar3, pkgSidebar);
    }
  }

  // Botões de editar/remover nos cards — chamados pelos renders
  global.__adminEditItem    = function(idx) { openEditItem(global.items[idx]); };
  global.__adminDeleteItem  = function(idx) { openDeleteItem(global.items[idx]); };
  global.__adminEditPokemon = function(idx) { openEditPokemon(global.POKEMONS[idx]); };
  global.__adminDelPokemon  = function(idx) { openDeletePokemon(global.POKEMONS[idx]); };
  global.__adminDelPackage  = function(pi)  { openDeletePackage(pi); };

  global.__adminOpenAddItem    = openAddItem;
  global.__adminOpenAddPokemon = openAddPokemon;
  global.__adminOpenAddPackage = openAddPackage;

  // Expõe função para os renders injetarem botões edit/delete nos cards
  global.adminIsAdmin = isAdmin;

  // Injeta barras quando as abas renderizam
  document.addEventListener('db:ready', function() {
    setTimeout(injectAdminBars, 300);
  });

  // Re-injeta quando muda de aba
  var _origSwitchTab = global.switchTab;
  document.addEventListener('db:ready', function() {
    var _orig = global.switchTab;
    global.switchTab = function(tab, btn, opts) {
      var r = _orig.call(this, tab, btn, opts);
      setTimeout(injectAdminBars, 400);
      return r;
    };
  });

  // Expõe a função de preview de tipagem globalmente
  // (chamada via oninput nos formulários de add/edit pokémon)
  global._adminPreviewType = function(inputId, previewId) {
    var nameEl    = document.getElementById(inputId);
    var previewEl = document.getElementById(previewId);
    if (!nameEl || !previewEl) return;
    var name   = nameEl.value.trim();
    var type   = typeof _getTypeForPokemon === 'function' ? _getTypeForPokemon(name) : null;
    var banner = type && window._adminTypeBannerMap ? window._adminTypeBannerMap[type] : null;
    if (type && banner) {
      previewEl.innerHTML =
        '<img src="' + banner + '" style="height:26px;vertical-align:middle;border-radius:4px;margin-right:6px" onerror="this.style.display=\'none\'">' +
        '<span style="color:#aef;font-size:.82rem;text-transform:capitalize">' + type + '</span>';
    } else if (name) {
      previewEl.innerHTML = '<span style="color:#888;font-size:.82rem">tipo não reconhecido — sem banner</span>';
    } else {
      previewEl.innerHTML = '';
    }
  };

}(window));

// CSS extra para botões admin nos cards de captura
;(function() {
  var s = document.createElement('style');
  s.textContent = [
    '.cpk-admin-row{display:flex;gap:6px;justify-content:center;margin-top:4px}',
    '.cpk-admin-btn{padding:3px 10px;border-radius:5px;border:1px solid rgba(74,154,255,.3);background:rgba(74,154,255,.08);color:#7eb3ff;font-size:.75rem;cursor:pointer}',
    '.cpk-admin-btn.danger{border-color:rgba(255,80,80,.3);background:rgba(255,80,80,.06);color:#ff9090}',
    '.cpk-admin-btn:hover{filter:brightness(1.3)}',
  ].join('\n');
  document.head.appendChild(s);
}());
