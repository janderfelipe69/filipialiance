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
    // overlay click desabilitado — não fecha ao clicar fora
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
        '<div style="flex:1"><label class="admin-label">Preço (KK)</label><input class="admin-field" id="ai-price" type="number" step="0.01" min="0" placeholder="ex: 38.5"></div>' +
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
      sbFetch('POST', 'catalog_items', { name: name, price_kk: price, drop_tier: tier, is_active: true })
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
            '<div style="flex:1"><label class="admin-label">Preço (KK)</label><input class="admin-field" id="ei-price" type="number" step="0.01" value="'+(item.price_kk||'')+'" placeholder="ex: 38.5"></div>' +
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
            price_kk: parseFloat(val('ei-price')) || null,
            drop_tier: val('ei-tier') || null,
          };
          sbFetch('PATCH', 'catalog_items?id=eq.' + item.id, updates)
            .then(function() { showToast('Item salvo!'); close(); reloadItems(); })
            .catch(function(e) { showToast('Erro: ' + e.message, false); });
        });
      });
  }

  function openDeleteItem(item) {
    var html =
      '<p style="color:#e0e4ff;margin-bottom:16px">O que deseja fazer com <strong style="color:#fff">'+item.name+'</strong>?</p>' +
      '<div style="display:flex;flex-direction:column;gap:10px">' +
        '<button id="btn-disable-item" style="padding:10px 16px;border-radius:8px;border:1px solid rgba(255,180,0,.4);background:rgba(255,180,0,.1);color:#ffd080;cursor:pointer;font-size:.9rem;text-align:left">' +
          '⊚ <strong>Desabilitar</strong><br><small style="color:#888;font-size:.78rem">Some do site, mas fica salvo. Você pode reativar depois.</small>' +
        '</button>' +
        '<button id="btn-harddelete-item" style="padding:10px 16px;border-radius:8px;border:1px solid rgba(255,60,60,.4);background:rgba(255,60,60,.08);color:#ff8080;cursor:pointer;font-size:.9rem;text-align:left">' +
          '🗑️ <strong>Excluir permanentemente</strong><br><small style="color:#888;font-size:.78rem">Remove do banco de dados para sempre. Não pode desfazer.</small>' +
        '</button>' +
      '</div>';
    var overlay = document.createElement('div');
    overlay.id = 'admin-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    var modal = document.createElement('div');
    modal.style.cssText = 'background:#1a1d2e;border:1px solid #2a2d45;border-radius:12px;padding:24px;width:100%;max-width:440px;color:#e0e4ff';
    modal.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h3 style="margin:0;font-size:1.1rem;color:#7eb3ff">🗑️ Remover Item</h3><button id="adm-x" style="background:none;border:none;color:#888;font-size:1.4rem;cursor:pointer">×</button></div>' + html;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    function close() { overlay.remove(); }
    document.getElementById('adm-x').onclick = close;
    // overlay click desabilitado — não fecha ao clicar fora
    document.getElementById('btn-disable-item').onclick = function() {
      sbFetch('PATCH', 'catalog_items?id=eq.' + item.id, { is_active: false })
        .then(function() { showToast('Item desabilitado.'); close(); reloadItems(); reloadDisabledItems(); })
        .catch(function(e) { showToast('Erro: ' + e.message, false); });
    };
    document.getElementById('btn-harddelete-item').onclick = function() {
      if (!confirm('Tem certeza? Isso vai excluir "'+item.name+'" do banco de dados permanentemente.')) return;
      sbFetch('DELETE', 'catalog_items?id=eq.' + item.id, null)
        .then(function() { showToast('Item excluído permanentemente.'); close(); reloadItems(); reloadDisabledItems(); })
        .catch(function(e) { showToast('Erro: ' + e.message, false); });
    };
  }

  function reloadDisabledItems() {
    var panel = document.getElementById('admin-disabled-items-panel');
    if (!panel) return;
    sbGet('catalog_items?select=id,name,price_brl,drop_tier&is_active=eq.false&order=name')
      .then(function(rows) {
        var list = document.getElementById('admin-disabled-items-list');
        if (!list) return;
        if (!rows || !rows.length) {
          list.innerHTML = '<div style="color:#555;font-size:.82rem;padding:6px 0">Nenhum item desabilitado.</div>';
          return;
        }
        list.innerHTML = rows.map(function(r) {
          return '<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;background:#0f1120;margin-bottom:4px">' +
            '<span style="flex:1;color:#888;font-size:.85rem">'+r.name+'</span>' +
            (r.drop_tier ? '<span style="font-size:.72rem;padding:2px 6px;border-radius:4px;background:#1a2040;color:#7eb3ff">'+r.drop_tier.toUpperCase()+'</span>' : '') +
            '<button onclick="window.__adminReenableItem(\'' + r.id + '\')" style="padding:3px 10px;border-radius:5px;border:1px solid rgba(80,200,80,.3);background:rgba(80,200,80,.08);color:#80d080;font-size:.75rem;cursor:pointer">✓ Reativar</button>' +
          '</div>';
        }).join('');
      });
  }

  global.__adminReenableItem = function(id) {
    sbFetch('PATCH', 'catalog_items?id=eq.' + id, { is_active: true })
      .then(function() { showToast('Item reativado!'); reloadItems(); reloadDisabledItems(); })
      .catch(function(e) { showToast('Erro: ' + e.message, false); });
  };

  function reloadItems() {
    sbGet('catalog_items?select=id,name,price_kk,price_brl,drop_tier&is_active=eq.true&order=name')
      .then(function(rows) {
        global.items.length = 0;
        rows.forEach(function(r, i) {
          var kk = r.price_kk ? parseFloat(r.price_kk) : (r.price_brl ? parseFloat(r.price_brl) / ((global.APP_CONFIG||{}).kk_to_brl||1.70) : null);
          global.items.push({ id: r.id, name: r.name, image: '', price: null, price_kk: kk, price_brl: null, tier: r.drop_tier || '', evo: '', _idx: i });
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

  // Detecta TODOS os tipos do pokémon (retorna array).
  // Remove prefixos decorativos como "Shiny", "Shadow", "Mega", etc.
  // Usa POKEMON_TYPE_MAP global (respawn_patch_modal.js) se disponível.
  function _getTypesForPokemon(name) {
    if (!name) return [];
    var clean = name.replace(/^(shiny|shadow|mega|alolan|galarian|hisuian|paldean|primal|origin|sky|land|therian|incarnate|resolute|ordinary|blade|shield|dusk|dawn|midday|midnight|solo|school|meteor|core|10%|50%|complete)\s+/gi, '').trim();

    // Usa POKEMON_TYPE_MAP global se disponível
    if (typeof POKEMON_TYPE_MAP !== 'undefined') {
      var found = POKEMON_TYPE_MAP[clean] || POKEMON_TYPE_MAP[clean.toLowerCase()];
      if (found && found.length) return found;
      // Tenta sem apóstrofo (ex: Farfetch'd → Farfetchd)
      var noApos = clean.replace(/'/g, '');
      found = POKEMON_TYPE_MAP[noApos];
      if (found && found.length) return found;
    }

    // Fallback expandido — cobre os pokémons do catálogo + geração 4/5/6
    var _fb = {
      // Gen 1
      Bulbasaur:['grass','poison'], Ivysaur:['grass','poison'], Venusaur:['grass','poison'],
      Charmander:['fire'], Charmeleon:['fire'], Charizard:['fire','flying'],
      Squirtle:['water'], Wartortle:['water'], Blastoise:['water'],
      Caterpie:['bug'], Metapod:['bug'], Butterfree:['bug','flying'],
      Weedle:['bug','poison'], Kakuna:['bug','poison'], Beedrill:['bug','poison'],
      Pidgey:['normal','flying'], Pidgeotto:['normal','flying'], Pidgeot:['normal','flying'],
      Rattata:['normal'], Raticate:['normal'],
      Spearow:['normal','flying'], Fearow:['normal','flying'],
      Ekans:['poison'], Arbok:['poison'],
      Pikachu:['electric'], Raichu:['electric'],
      Sandshrew:['ground'], Sandslash:['ground'],
      Nidoran:['poison'], Nidorina:['poison'], Nidoqueen:['poison','ground'],
      Nidorino:['poison'], Nidoking:['poison','ground'],
      Clefairy:['fairy'], Clefable:['fairy'],
      Vulpix:['fire'], Ninetales:['fire'],
      Jigglypuff:['normal','fairy'], Wigglytuff:['normal','fairy'],
      Zubat:['poison','flying'], Golbat:['poison','flying'],
      Oddish:['grass','poison'], Gloom:['grass','poison'], Vileplume:['grass','poison'],
      Paras:['bug','grass'], Parasect:['bug','grass'],
      Venonat:['bug','poison'], Venomoth:['bug','poison'],
      Diglett:['ground'], Dugtrio:['ground'],
      Meowth:['normal'], Persian:['normal'],
      Psyduck:['water'], Golduck:['water'],
      Mankey:['fighting'], Primeape:['fighting'],
      Growlithe:['fire'], Arcanine:['fire'],
      Poliwag:['water'], Poliwhirl:['water'], Poliwrath:['water','fighting'],
      Abra:['psychic'], Kadabra:['psychic'], Alakazam:['psychic'],
      Machop:['fighting'], Machoke:['fighting'], Machamp:['fighting'],
      Bellsprout:['grass','poison'], Weepinbell:['grass','poison'], Victreebel:['grass','poison'],
      Tentacool:['water','poison'], Tentacruel:['water','poison'],
      Geodude:['rock','ground'], Graveler:['rock','ground'], Golem:['rock','ground'],
      Ponyta:['fire'], Rapidash:['fire'],
      Slowpoke:['water','psychic'], Slowbro:['water','psychic'],
      Magnemite:['electric','steel'], Magneton:['electric','steel'],
      Doduo:['normal','flying'], Dodrio:['normal','flying'],
      Seel:['water'], Dewgong:['water','ice'],
      Grimer:['poison'], Muk:['poison'],
      Shellder:['water'], Cloyster:['water','ice'],
      Gastly:['ghost','poison'], Haunter:['ghost','poison'], Gengar:['ghost','poison'],
      Onix:['rock','ground'],
      Drowzee:['psychic'], Hypno:['psychic'],
      Krabby:['water'], Kingler:['water'],
      Voltorb:['electric'], Electrode:['electric'],
      Exeggcute:['grass','psychic'], Exeggutor:['grass','psychic'],
      Cubone:['ground'], Marowak:['ground'],
      Hitmonlee:['fighting'], Hitmonchan:['fighting'], Hitmontop:['fighting'],
      Lickitung:['normal'],
      Koffing:['poison'], Weezing:['poison'],
      Rhyhorn:['ground','rock'], Rhydon:['ground','rock'], Rhyperior:['ground','rock'],
      Chansey:['normal'], Blissey:['normal'],
      Tangela:['grass'], Tangrowth:['grass'],
      Kangaskhan:['normal'],
      Horsea:['water'], Seadra:['water'], Kingdra:['water','dragon'],
      Goldeen:['water'], Seaking:['water'],
      Staryu:['water'], Starmie:['water','psychic'],
      Scyther:['bug','flying'], Scizor:['bug','steel'],
      Jynx:['ice','psychic'],
      Electabuzz:['electric'], Electivire:['electric'],
      Magmar:['fire'], Magmortar:['fire'],
      Pinsir:['bug'],
      Tauros:['normal'],
      Magikarp:['water'], Gyarados:['water','flying'],
      Lapras:['water','ice'],
      Ditto:['normal'],
      Eevee:['normal'],
      Vaporeon:['water'], Jolteon:['electric'], Flareon:['fire'],
      Espeon:['psychic'], Umbreon:['dark'],
      Leafeon:['grass'], Glaceon:['ice'], Sylveon:['fairy'],
      Porygon:['normal'], PorygonZ:['normal'],
      Omanyte:['rock','water'], Omastar:['rock','water'],
      Kabuto:['rock','water'], Kabutops:['rock','water'],
      Aerodactyl:['rock','flying'],
      Snorlax:['normal'],
      Articuno:['ice','flying'], Zapdos:['electric','flying'], Moltres:['fire','flying'],
      Dratini:['dragon'], Dragonair:['dragon'], Dragonite:['dragon','flying'],
      Mewtwo:['psychic'], Mew:['psychic'],
      // Gen 2
      Chikorita:['grass'], Bayleef:['grass'], Meganium:['grass'],
      Cyndaquil:['fire'], Quilava:['fire'], Typhlosion:['fire'],
      Totodile:['water'], Croconaw:['water'], Feraligatr:['water'],
      Sentret:['normal'], Furret:['normal'],
      Hoothoot:['normal','flying'], Noctowl:['normal','flying'],
      Ledyba:['bug','flying'], Ledian:['bug','flying'],
      Spinarak:['bug','poison'], Ariados:['bug','poison'],
      Crobat:['poison','flying'],
      Chinchou:['water','electric'], Lanturn:['water','electric'],
      Pichu:['electric'], Cleffa:['fairy'], Igglybuff:['normal','fairy'],
      Togepi:['fairy'], Togetic:['fairy','flying'], Togekiss:['fairy','flying'],
      Natu:['psychic','flying'], Xatu:['psychic','flying'],
      Mareep:['electric'], Flaaffy:['electric'], Ampharos:['electric'],
      Bellossom:['grass'],
      Marill:['water','fairy'], Azumarill:['water','fairy'],
      Sudowoodo:['rock'],
      Politoed:['water'],
      Hoppip:['grass','flying'], Skiploom:['grass','flying'], Jumpluff:['grass','flying'],
      Aipom:['normal'], Ambipom:['normal'],
      Sunkern:['grass'], Sunflora:['grass'],
      Yanma:['bug','flying'], Yanmega:['bug','flying'],
      Wooper:['water','ground'], Quagsire:['water','ground'],
      Murkrow:['dark','flying'], Honchkrow:['dark','flying'],
      Misdreavus:['ghost'], Mismagius:['ghost'],
      Unown:['psychic'],
      Wobbuffet:['psychic'],
      Girafarig:['normal','psychic'],
      Pineco:['bug'], Forretress:['bug','steel'],
      Dunsparce:['normal'],
      Gligar:['ground','flying'], Gliscor:['ground','flying'],
      Steelix:['steel','ground'],
      Snubbull:['fairy'], Granbull:['fairy'],
      Qwilfish:['water','poison'],
      Heracross:['bug','fighting'],
      Sneasel:['dark','ice'], Weavile:['dark','ice'],
      Teddiursa:['normal'], Ursaring:['normal'],
      Slugma:['fire'], Magcargo:['fire','rock'],
      Swinub:['ice','ground'], Piloswine:['ice','ground'], Mamoswine:['ice','ground'],
      Corsola:['water','rock'],
      Remoraid:['water'], Octillery:['water'],
      Delibird:['ice','flying'],
      Skarmory:['steel','flying'],
      Houndour:['dark','fire'], Houndoom:['dark','fire'],
      Phanpy:['ground'], Donphan:['ground'],
      Porygon2:['normal'],
      Stantler:['normal'],
      Smeargle:['normal'],
      Miltank:['normal'],
      Raikou:['electric'], Entei:['fire'], Suicune:['water'],
      Larvitar:['rock','ground'], Pupitar:['rock','ground'], Tyranitar:['rock','dark'],
      Lugia:['psychic','flying'], HoOh:['fire','flying'],
      Celebi:['psychic','grass'],
      // Gen 3
      Treecko:['grass'], Grovyle:['grass'], Sceptile:['grass'],
      Torchic:['fire'], Combusken:['fire','fighting'], Blaziken:['fire','fighting'],
      Mudkip:['water'], Marshtomp:['water','ground'], Swampert:['water','ground'],
      Poochyena:['dark'], Mightyena:['dark'],
      Zigzagoon:['normal'], Linoone:['normal'],
      Wurmple:['bug'], Silcoon:['bug'], Beautifly:['bug','flying'],
      Cascoon:['bug'], Dustox:['bug','poison'],
      Lotad:['water','grass'], Lombre:['water','grass'], Ludicolo:['water','grass'],
      Seedot:['grass'], Nuzleaf:['grass','dark'], Shiftry:['grass','dark'],
      Taillow:['normal','flying'], Swellow:['normal','flying'],
      Wingull:['water','flying'], Pelipper:['water','flying'],
      Ralts:['psychic','fairy'], Kirlia:['psychic','fairy'],
      Gardevoir:['psychic','fairy'], Gallade:['psychic','fighting'],
      Shroomish:['grass'], Breloom:['grass','fighting'],
      Slakoth:['normal'], Vigoroth:['normal'], Slaking:['normal'],
      Abra:['psychic'],
      Makuhita:['fighting'], Hariyama:['fighting'],
      Nosepass:['rock'], Probopass:['rock','steel'],
      Skitty:['normal'], Delcatty:['normal'],
      Sableye:['dark','ghost'],
      Mawile:['steel','fairy'],
      Aron:['steel','rock'], Lairon:['steel','rock'], Aggron:['steel','rock'],
      Meditite:['fighting','psychic'], Medicham:['fighting','psychic'],
      Electrike:['electric'], Manectric:['electric'],
      Plusle:['electric'], Minun:['electric'],
      Volbeat:['bug'], Illumise:['bug'],
      Roselia:['grass','poison'], Roserade:['grass','poison'],
      Gulpin:['poison'], Swalot:['poison'],
      Carvanha:['water','dark'], Sharpedo:['water','dark'],
      Wailmer:['water'], Wailord:['water'],
      Numel:['fire','ground'], Camerupt:['fire','ground'],
      Torkoal:['fire'],
      Spoink:['psychic'], Grumpig:['psychic'],
      Spinda:['normal'],
      Trapinch:['ground'], Vibrava:['ground','dragon'], Flygon:['ground','dragon'],
      Cacnea:['grass'], Cacturne:['grass','dark'],
      Swablu:['normal','flying'], Altaria:['dragon','flying'],
      Zangoose:['normal'],
      Seviper:['poison'],
      Lunatone:['rock','psychic'], Solrock:['rock','psychic'],
      Barboach:['water','ground'], Whiscash:['water','ground'],
      Corphish:['water'], Crawdaunt:['water','dark'],
      Baltoy:['ground','psychic'], Claydol:['ground','psychic'],
      Lileep:['rock','grass'], Cradily:['rock','grass'],
      Anorith:['rock','bug'], Armaldo:['rock','bug'],
      Feebas:['water'], Milotic:['water'],
      Castform:['normal'],
      Shuppet:['ghost'], Banette:['ghost'],
      Duskull:['ghost'], Dusclops:['ghost'], Dusknoir:['ghost'],
      Tropius:['grass','flying'],
      Chimecho:['psychic'],
      Absol:['dark'],
      Snorunt:['ice'], Glalie:['ice'], Froslass:['ice','ghost'],
      Spheal:['ice','water'], Sealeo:['ice','water'], Walrein:['ice','water'],
      Clamperl:['water'], Huntail:['water'], Gorebyss:['water'],
      Relicanth:['water','rock'],
      Luvdisc:['water'],
      Bagon:['dragon'], Shelgon:['dragon'], Salamence:['dragon','flying'],
      Beldum:['steel','psychic'], Metang:['steel','psychic'], Metagross:['steel','psychic'],
      Regirock:['rock'], Regice:['ice'], Registeel:['steel'],
      Latias:['dragon','psychic'], Latios:['dragon','psychic'],
      Kyogre:['water'], Groudon:['ground'], Rayquaza:['dragon','flying'],
      Jirachi:['steel','psychic'], Deoxys:['psychic'],
      // Gen 4
      Turtwig:['grass'], Grotle:['grass'], Torterra:['grass','ground'],
      Chimchar:['fire'], Monferno:['fire','fighting'], Infernape:['fire','fighting'],
      Piplup:['water'], Prinplup:['water'], Empoleon:['water','steel'],
      Starly:['normal','flying'], Staravia:['normal','flying'], Staraptor:['normal','flying'],
      Bidoof:['normal'], Bibarel:['normal','water'],
      Kricketot:['bug'], Kricketune:['bug'],
      Shinx:['electric'], Luxio:['electric'], Luxray:['electric'],
      Cranidos:['rock'], Rampardos:['rock'],
      Shieldon:['rock','steel'], Bastiodon:['rock','steel'],
      Burmy:['bug'], Wormadam:['bug','grass'], Mothim:['bug','flying'],
      Combee:['bug','flying'], Vespiquen:['bug','flying'],
      Pachirisu:['electric'],
      Buizel:['water'], Floatzel:['water'],
      Cherubi:['grass'], Cherrim:['grass'],
      Shellos:['water'], Gastrodon:['water','ground'],
      Drifloon:['ghost','flying'], Drifblim:['ghost','flying'],
      Buneary:['normal'], Lopunny:['normal'],
      Glameow:['normal'], Purugly:['normal'],
      Stunky:['poison','dark'], Skuntank:['poison','dark'],
      Bronzor:['steel','psychic'], Bronzong:['steel','psychic'],
      Gible:['dragon','ground'], Gabite:['dragon','ground'], Garchomp:['dragon','ground'],
      Riolu:['fighting'], Lucario:['fighting','steel'],
      Hippopotas:['ground'], Hippowdon:['ground'],
      Skorupi:['poison','bug'], Drapion:['poison','dark'],
      Croagunk:['poison','fighting'], Toxicroak:['poison','fighting'],
      Carnivine:['grass'],
      Finneon:['water'], Lumineon:['water'],
      Mantyke:['water','flying'], Mantine:['water','flying'],
      Snover:['grass','ice'], Abomasnow:['grass','ice'],
      Rotom:['electric','ghost'],
      Dialga:['steel','dragon'], Palkia:['water','dragon'],
      Giratina:['ghost','dragon'],
      Cresselia:['psychic'],
      Manaphy:['water'], Phione:['water'],
      Darkrai:['dark'],
      Shaymin:['grass'],
      Arceus:['normal'],
      // Gen 5
      Zoroark:['dark'], Zorua:['dark'],
      Reshiram:['dragon','fire'], Zekrom:['dragon','electric'],
      Kyurem:['dragon','ice'],
      Victini:['psychic','fire'],
      // Gen 6
      Xerneas:['fairy'], Yveltal:['dark','flying'], Zygarde:['dragon','ground'],
      Diancie:['rock','fairy'], Hoopa:['psychic','ghost'], Volcanion:['fire','water'],
      Sylveon:['fairy'],
      Florges:['fairy'],
      Aegislash:['steel','ghost'],
      Greninja:['water','dark'],
      Chesnaught:['grass','fighting'],
      Delphox:['fire','psychic'],
      // Extras comuns no catálogo
      Eevee:['normal'],
    };

    return _fb[clean] || _fb[name] || [];
  }

  // Compatibilidade — retorna apenas o tipo primário (para banner padrão)
  function _getTypeForPokemon(name) {
    var types = _getTypesForPokemon(name);
    return types.length ? types[0] : null;
  }

  // Retorna a URL do banner para salvar no banco.
  // Usa o banner que o admin selecionou clicando num tipo, senão usa o tipo primário.
  function _getBannerForPokemon(name) {
    if (window._adminSelectedBanner) {
      var sel = window._adminSelectedBanner;
      window._adminSelectedBanner = null; // limpa após usar
      return sel;
    }
    var types = _getTypesForPokemon(name);
    var primary = types.length ? types[0] : null;
    return primary ? (TYPE_BANNER_MAP[primary] || null) : null;
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
        '<div style="flex:1"><label class="admin-label">Preço (KK) *</label><input class="admin-field" id="ap-price" type="number" step="0.01" min="0" placeholder="ex: 38"></div>' +
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
        price_kk:            price,
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
        '<div style="flex:1"><label class="admin-label">Preço (KK)</label><input class="admin-field" id="ep-price" type="number" step="0.01" value="' + (poke.price_kk || '') + '"></div>' +
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
        price_kk:            parseFloat(val('ep-price')) || null,
        tier:                val('ep-tier'),
        avg_capture_minutes: etaMin,
        is_dive:             document.getElementById('ep-dive').checked,
        banner_image_url:    newBanner,
      }).then(function() { showToast('Pokémon salvo!'); close(); reloadPokemons(); })
        .catch(function(e) { showToast('Erro: ' + e.message, false); });
    });
  }

  function openDeletePokemon(poke) {
    var html =
      '<p style="color:#e0e4ff;margin-bottom:16px">O que deseja fazer com <strong style="color:#fff">'+poke.name+'</strong>?</p>' +
      '<div style="display:flex;flex-direction:column;gap:10px">' +
        '<button id="btn-disable-poke" style="padding:10px 16px;border-radius:8px;border:1px solid rgba(255,180,0,.4);background:rgba(255,180,0,.1);color:#ffd080;cursor:pointer;font-size:.9rem;text-align:left">' +
          '⊚ <strong>Desabilitar</strong><br><small style="color:#888;font-size:.78rem">Some do site, mas fica salvo. Você pode reativar depois.</small>' +
        '</button>' +
        '<button id="btn-harddelete-poke" style="padding:10px 16px;border-radius:8px;border:1px solid rgba(255,60,60,.4);background:rgba(255,60,60,.08);color:#ff8080;cursor:pointer;font-size:.9rem;text-align:left">' +
          '🗑️ <strong>Excluir permanentemente</strong><br><small style="color:#888;font-size:.78rem">Remove do banco de dados para sempre. Não pode desfazer.</small>' +
        '</button>' +
      '</div>';
    var overlay = document.createElement('div');
    overlay.id = 'admin-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    var modal = document.createElement('div');
    modal.style.cssText = 'background:#1a1d2e;border:1px solid #2a2d45;border-radius:12px;padding:24px;width:100%;max-width:440px;color:#e0e4ff';
    modal.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h3 style="margin:0;font-size:1.1rem;color:#7eb3ff">🗑️ Remover Pokémon</h3><button id="adm-px" style="background:none;border:none;color:#888;font-size:1.4rem;cursor:pointer">×</button></div>' + html;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    function close() { overlay.remove(); }
    document.getElementById('adm-px').onclick = close;
    // overlay click desabilitado — não fecha ao clicar fora
    document.getElementById('btn-disable-poke').onclick = function() {
      sbFetch('PATCH', 'catalog_pokemons?id=eq.' + poke.id, { is_active: false })
        .then(function() { showToast('Pokémon desabilitado.'); close(); reloadPokemons(); reloadDisabledPokemons(); })
        .catch(function(e) { showToast('Erro: ' + e.message, false); });
    };
    document.getElementById('btn-harddelete-poke').onclick = function() {
      if (!confirm('Tem certeza? Isso vai excluir "'+poke.name+'" do banco de dados permanentemente.')) return;
      sbFetch('DELETE', 'catalog_pokemons?id=eq.' + poke.id, null)
        .then(function() { showToast('Pokémon excluído permanentemente.'); close(); reloadPokemons(); reloadDisabledPokemons(); })
        .catch(function(e) { showToast('Erro: ' + e.message, false); });
    };
  }

  function reloadDisabledPokemons() {
    var panel = document.getElementById('admin-disabled-pokemons-panel');
    if (!panel) return;
    sbGet('catalog_pokemons?select=id,name,price_brl,tier&is_active=eq.false&order=name')
      .then(function(rows) {
        var list = document.getElementById('admin-disabled-pokemons-list');
        if (!list) return;
        if (!rows || !rows.length) {
          list.innerHTML = '<div style="color:#555;font-size:.82rem;padding:6px 0">Nenhum pokémon desabilitado.</div>';
          return;
        }
        list.innerHTML = rows.map(function(r) {
          return '<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;background:#0f1120;margin-bottom:4px">' +
            '<span style="flex:1;color:#888;font-size:.85rem">'+r.name+'</span>' +
            (r.tier ? '<span style="font-size:.72rem;padding:2px 6px;border-radius:4px;background:#1a2040;color:#7eb3ff">'+r.tier.toUpperCase()+'</span>' : '') +
            '<button onclick="window.__adminReenablePokemon(\'' + r.id + '\')" style="padding:3px 10px;border-radius:5px;border:1px solid rgba(80,200,80,.3);background:rgba(80,200,80,.08);color:#80d080;font-size:.75rem;cursor:pointer">✓ Reativar</button>' +
          '</div>';
        }).join('');
      });
  }

  global.__adminReenablePokemon = function(id) {
    sbFetch('PATCH', 'catalog_pokemons?id=eq.' + id, { is_active: true })
      .then(function() { showToast('Pokémon reativado!'); reloadPokemons(); reloadDisabledPokemons(); })
      .catch(function(e) { showToast('Erro: ' + e.message, false); });
  };

  function reloadPokemons() {
    sbGet('catalog_pokemons?select=id,name,price_kk,price_brl,tier,banner_image_url,is_dive,avg_capture_minutes&is_active=eq.true&order=sort_order')
      .then(function(rows) {
        var cfg = global.APP_CONFIG || {};
        var rawPerKk = cfg.raw_per_kk || 1000000;
        global.POKEMONS.length = 0;
        rows.forEach(function(r, i) {
          var kk = r.price_kk ? parseFloat(r.price_kk) : (r.price_brl ? parseFloat(r.price_brl) / (cfg.kk_to_brl||1.70) : null);
          var raw = kk ? Math.floor(kk * rawPerKk) : null;
          global.POKEMONS.push({
            id: r.id, name: r.name,
            price: raw, price_kk: kk, price_brl: kk ? parseFloat((kk * (cfg.kk_to_brl||1.70)).toFixed(2)) : null,
            tag: r.tier || '', image: '', bannerImage: r.banner_image_url || '',
            dive: !!r.is_dive, avg_capture_minutes: r.avg_capture_minutes || 10080,
            _idx: i,
          });
        });
        if (typeof renderCaptura === 'function') renderCaptura();
      });
  }

  // ── PACOTES ───────────────────────────────────────────────────────────────

  // Estado temporário do editor de pacote
  var _pkgEditor = { slots: [], pkgId: null, iconUrl: null };

  // Banners disponíveis no site
  var _PKG_BANNERS = [
    { label: 'Water',    url: 'https://i.imgur.com/zpRe43i.png' },
    { label: 'Steel',    url: 'https://i.imgur.com/GleRjiM.png' },
    { label: 'Rock',     url: 'https://i.imgur.com/GvD1Mtq.png' },
    { label: 'Psychic',  url: 'https://i.imgur.com/ASiZi1K.png' },
    { label: 'Poison',   url: 'https://i.imgur.com/xfX0ReE.png' },
    { label: 'Normal',   url: 'https://i.imgur.com/w2ChsIe.png' },
    { label: 'Ice',      url: 'https://i.imgur.com/ssFz0sA.png' },
    { label: 'Ground',   url: 'https://i.imgur.com/JPcD2l3.png' },
    { label: 'Fire',     url: 'https://i.imgur.com/O8TONGE.png' },
    { label: 'Grass',    url: 'https://i.imgur.com/YjKxtoE.png' },
    { label: 'Electric', url: 'https://i.imgur.com/Yv2WEYc.png' },
    { label: 'Dark',     url: 'https://i.imgur.com/7Luj4az.png' },
    { label: 'Dragon',   url: 'https://i.imgur.com/o7JWbaN.png' },
    { label: 'Ghost',    url: 'https://i.imgur.com/HuybbPn.png' },
    { label: 'Fairy',    url: 'https://i.imgur.com/j3HaXTh.png' },
    { label: 'Flying',   url: 'https://i.imgur.com/npGjQae.png' },
    { label: 'Bug',      url: 'https://i.imgur.com/V4IXR51.png' },
    { label: 'Fighting', url: 'https://i.imgur.com/OKsJXh7.png' },
    { label: 'Speed',    url: 'https://i.imgur.com/ODTCGEc.gif' },
    { label: 'HP',       url: 'https://i.imgur.com/QhZ8LL5.gif' },
    { label: 'Gym',      url: 'https://i.imgur.com/XyBY6d2.png' },
    { label: 'Viridian', url: 'https://i.imgur.com/AvX9Hbj.png' },
    { label: 'Cinnabar', url: 'https://i.imgur.com/RsJe7OO.png' },
    { label: 'Pewter',   url: 'https://i.imgur.com/ViA3uQO.png' },
    { label: 'Cerulean', url: 'https://i.imgur.com/uCRmZvq.png' },
    { label: 'Vermilion',url: 'https://i.imgur.com/GEfwZ4B.png' },
    { label: 'Celadon',  url: 'https://i.imgur.com/ocPJIHg.png' },
    { label: 'Fuchsia',  url: 'https://i.imgur.com/i8U2tWd.png' },
    { label: 'Saffron',  url: 'https://i.imgur.com/dzVfRLq.png' },
  ];

  function _buildBannerSelectorHtml(currentUrl) {
    var gridItems = _PKG_BANNERS.map(function(b, bi) {
      var isSel = currentUrl && currentUrl === b.url;
      return '<div id="pkgbanner-opt-'+bi+'" onclick="window._pkgSelectBanner('+bi+')" ' +
        'title="'+b.label+'" ' +
        'style="width:44px;height:44px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;' +
        'border:2px solid '+(isSel ? '#4a9aff' : 'rgba(255,255,255,.08)')+';' +
        'background:'+(isSel ? 'rgba(74,154,255,.15)' : 'rgba(255,255,255,.03)')+';' +
        'transition:border-color .15s,background .15s">' +
        '<img src="'+b.url+'" style="width:28px;height:28px;object-fit:contain" onerror="this.style.display=\"none\"">' +
      '</div>';
    }).join('');

    var preview = currentUrl
      ? '<img src="'+currentUrl+'" style="width:32px;height:32px;object-fit:contain;border-radius:6px;margin-right:8px" onerror="this.style.display=\"none\"">'
      : '<span style="width:32px;height:32px;border-radius:6px;background:#1a2040;display:inline-block;margin-right:8px"></span>';

    return '<div style="margin-bottom:6px">' +
      '<div style="display:flex;align-items:center;margin-bottom:8px">' +
        '<span id="pkgbanner-preview">'+preview+'</span>' +
        '<span style="color:#aaa;font-size:.82rem" id="pkgbanner-label">'+(currentUrl ? 'Selecionado' : 'Nenhum selecionado')+'</span>' +
      '</div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;max-height:160px;overflow-y:auto;padding:4px 2px">'+gridItems+'</div>' +
      '<div style="display:flex;gap:8px;align-items:center;margin-top:10px">' +
        '<input id="pkgbanner-custom" class="admin-field" placeholder="Ou cole URL do Imgur (https://i.imgur.com/...)" style="font-size:.8rem;padding:6px 8px">' +
        '<button onclick="window._pkgApplyCustomBanner()" style="padding:6px 12px;border-radius:6px;border:1px solid rgba(74,154,255,.4);background:rgba(74,154,255,.1);color:#7eb3ff;font-size:.8rem;cursor:pointer;white-space:nowrap">Aplicar</button>' +
      '</div>' +
    '</div>';
  }

  global._pkgSelectBanner = function(bi) {
    var b = _PKG_BANNERS[bi];
    if (!b) return;
    _pkgEditor.iconUrl = b.url;
    // Update visuals
    _PKG_BANNERS.forEach(function(_, i) {
      var el = document.getElementById('pkgbanner-opt-'+i);
      if (!el) return;
      var isSel = i === bi;
      el.style.borderColor = isSel ? '#4a9aff' : 'rgba(255,255,255,.08)';
      el.style.background  = isSel ? 'rgba(74,154,255,.15)' : 'rgba(255,255,255,.03)';
    });
    var prev = document.getElementById('pkgbanner-preview');
    var lbl  = document.getElementById('pkgbanner-label');
    if (prev) prev.innerHTML = '<img src="'+b.url+'" style="width:32px;height:32px;object-fit:contain;border-radius:6px;margin-right:8px">';
    if (lbl)  lbl.textContent = b.label;
  };

  global._pkgApplyCustomBanner = function() {
    var inp = document.getElementById('pkgbanner-custom');
    if (!inp) return;
    var url = inp.value.trim();
    if (!url || !url.startsWith('http')) { showToast('URL inválida', false); return; }
    _pkgEditor.iconUrl = url;
    // Deselect all grid items
    _PKG_BANNERS.forEach(function(_, i) {
      var el = document.getElementById('pkgbanner-opt-'+i);
      if (el) { el.style.borderColor = 'rgba(255,255,255,.08)'; el.style.background = 'rgba(255,255,255,.03)'; }
    });
    var prev = document.getElementById('pkgbanner-preview');
    var lbl  = document.getElementById('pkgbanner-label');
    if (prev) prev.innerHTML = '<img src="'+url+'" style="width:32px;height:32px;object-fit:contain;border-radius:6px;margin-right:8px" onerror="this.style.display=\"none\"">';
    if (lbl)  lbl.textContent = 'Banner personalizado';
    showToast('Banner aplicado!');
  };

  function _pkgEditorSlotHtml(si) {
    var slot = _pkgEditor.slots[si];
    var itemsHtml = slot.items.map(function(entry, ei) {
      return '<div class="admin-item-row" id="pkgslot-item-'+si+'-'+ei+'" style="justify-content:space-between">' +
        '<span class="admin-item-name" style="font-size:.82rem">'+entry.name+'</span>' +
        '<div style="display:flex;align-items:center;gap:6px">' +
          '<input type="number" min="1" max="999" value="'+entry.qty+'" ' +
            'style="width:52px;padding:3px 6px;background:#0f1120;border:1px solid #2a2d45;border-radius:5px;color:#e0e4ff;font-size:.82rem" ' +
            'onchange="window._pkgSetQty('+si+','+ei+',this.value)">' +
          '<button onclick="window._pkgRemoveItem('+si+','+ei+')" style="padding:2px 8px;border-radius:5px;border:1px solid rgba(255,80,80,.3);background:rgba(255,80,80,.07);color:#ff9090;font-size:.75rem;cursor:pointer">✕</button>' +
        '</div>' +
      '</div>';
    }).join('') || '<div style="color:#444;font-size:.8rem;padding:4px 0">Nenhum item no slot</div>';

    return '<div style="border:1px solid #2a2d45;border-radius:8px;padding:10px;margin-bottom:10px;background:#0d0f1c" id="pkgslot-block-'+si+'">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
        '<span style="color:#7eb3ff;font-weight:600;font-size:.85rem">Slot '+(si+1)+'</span>' +
        '<div style="flex:1"></div>' +
        (si > 0 ? '<button onclick="window._pkgRemoveSlot('+si+')" style="padding:2px 8px;border-radius:4px;border:1px solid rgba(255,80,80,.3);background:rgba(255,80,80,.07);color:#ff9090;font-size:.72rem;cursor:pointer">Remover slot</button>' : '') +
      '</div>' +
      '<div id="pkgslot-items-'+si+'">'+itemsHtml+'</div>' +
      '<div style="display:flex;gap:6px;margin-top:8px">' +
        '<input id="pkgslot-search-'+si+'" class="admin-field" placeholder="Buscar item..." style="flex:1;font-size:.82rem;padding:6px 8px" ' +
          'oninput="window._pkgSearchItems('+si+',this.value)">' +
      '</div>' +
      '<div id="pkgslot-results-'+si+'" style="max-height:120px;overflow-y:auto;margin-top:4px"></div>' +
    '</div>';
  }

  function _pkgRebuildSlots() {
    var container = document.getElementById('pkgslots-container');
    if (!container) return;
    container.innerHTML = _pkgEditor.slots.map(function(_, si) { return _pkgEditorSlotHtml(si); }).join('');
  }

  global._pkgSearchItems = function(si, query) {
    var resultsEl = document.getElementById('pkgslot-results-'+si);
    if (!resultsEl) return;
    if (!query || query.trim().length < 2) { resultsEl.innerHTML = ''; return; }
    var q = query.toLowerCase();
    var matches = (global.items || []).filter(function(it) {
      return it.name && it.name.toLowerCase().includes(q);
    }).slice(0, 8);
    if (!matches.length) { resultsEl.innerHTML = '<div style="color:#555;font-size:.78rem;padding:4px">Nenhum item encontrado</div>'; return; }
    resultsEl.innerHTML = matches.map(function(it) {
      var safeName = it.name.replace(/'/g, "\\'");
      return '<div style="padding:5px 8px;border-radius:5px;background:#131627;cursor:pointer;font-size:.82rem;color:#c0c8ff;margin-bottom:3px;border:1px solid transparent" ' +
        'onmouseover="this.style.borderColor=\'#4a9aff44\'" onmouseout="this.style.borderColor=\'transparent\'" ' +
        'onclick="window._pkgAddItem('+si+',\''+safeName+'\')">' +
        '<span>'+it.name+'</span>' +
        (it.tier ? '<span style="margin-left:6px;font-size:.72rem;color:#7eb3ff;opacity:.7">'+it.tier.toUpperCase()+'</span>' : '') +
      '</div>';
    }).join('');
  };

  global._pkgAddItem = function(si, name) {
    if (!_pkgEditor.slots[si]) return;
    var existing = _pkgEditor.slots[si].items.find(function(e) { return e.name === name; });
    if (existing) { existing.qty++; }
    else { _pkgEditor.slots[si].items.push({ name: name, qty: 1 }); }
    _pkgRebuildSlots();
    var searchEl = document.getElementById('pkgslot-search-'+si);
    var resultsEl = document.getElementById('pkgslot-results-'+si);
    if (searchEl) searchEl.value = '';
    if (resultsEl) resultsEl.innerHTML = '';
  };

  global._pkgRemoveItem = function(si, ei) {
    if (!_pkgEditor.slots[si]) return;
    _pkgEditor.slots[si].items.splice(ei, 1);
    _pkgRebuildSlots();
  };

  global._pkgSetQty = function(si, ei, v) {
    if (!_pkgEditor.slots[si] || !_pkgEditor.slots[si].items[ei]) return;
    _pkgEditor.slots[si].items[ei].qty = Math.max(1, parseInt(v, 10) || 1);
  };

  global._pkgRemoveSlot = function(si) {
    _pkgEditor.slots.splice(si, 1);
    _pkgRebuildSlots();
  };

  global._pkgAddSlot = function() {
    _pkgEditor.slots.push({ id: null, items: [] });
    _pkgRebuildSlots();
    // scroll to bottom
    var c = document.getElementById('pkgslots-container');
    if (c) c.scrollTop = c.scrollHeight;
  };

  function _savePkgSlots(pkgId) {
    // 1. Delete all existing slots for this package
    return sbFetch('DELETE', 'catalog_package_slots?package_id=eq.' + pkgId, null)
      .then(function() {
        // 2. Insert slots one by one and their items
        var chain = Promise.resolve();
        _pkgEditor.slots.forEach(function(slot, si) {
          chain = chain.then(function() {
            return sbFetch('POST', 'catalog_package_slots', { package_id: pkgId, slot_index: si })
              .then(function(rows) {
                var slotId = rows && rows[0] && rows[0].id;
                if (!slotId || !slot.items.length) return;
                var itemPromises = slot.items.map(function(entry) {
                  return sbFetch('POST', 'catalog_package_slot_items', {
                    slot_id: slotId,
                    item_name: entry.name,
                    quantity: entry.qty,
                  });
                });
                return Promise.all(itemPromises);
              });
          });
        });
        return chain;
      });
  }

  function _openPkgEditor(title, pkgId, pkgName, existingSlots, existingIconUrl) {
    _pkgEditor.pkgId   = pkgId;
    _pkgEditor.slots   = existingSlots || [];
    _pkgEditor.iconUrl = existingIconUrl || null;
    if (!_pkgEditor.slots.length) _pkgEditor.slots.push({ id: null, items: [] });

    var overlay = document.createElement('div');
    overlay.id = 'admin-pkg-editor-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';

    var modal = document.createElement('div');
    modal.style.cssText = 'background:#1a1d2e;border:1px solid #2a2d45;border-radius:12px;padding:24px;width:100%;max-width:580px;max-height:92vh;overflow-y:auto;color:#e0e4ff';

    modal.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">' +
        '<h3 style="margin:0;font-size:1.1rem;color:#7eb3ff">'+title+'</h3>' +
        '<button id="pkgeditor-close" style="background:none;border:none;color:#888;font-size:1.4rem;cursor:pointer">×</button>' +
      '</div>' +
      '<label class="admin-label">Nome do pacote *</label>' +
      '<input class="admin-field" id="pkgeditor-name" value="'+(pkgName||'')+'" placeholder="ex: Talent Fire 7/8" style="margin-bottom:14px">' +
      '<label class="admin-label" style="margin-bottom:8px">Ícone / Banner</label>' +
      '<div id="pkgbanner-selector">'+_buildBannerSelectorHtml(existingIconUrl || null)+'</div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin:14px 0 8px">' +
        '<span style="font-size:.82rem;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.04em">Slots</span>' +
        '<button onclick="window._pkgAddSlot()" style="padding:4px 12px;border-radius:6px;border:1px solid rgba(74,154,255,.4);background:rgba(74,154,255,.1);color:#7eb3ff;font-size:.8rem;cursor:pointer">+ Slot</button>' +
      '</div>' +
      '<div id="pkgslots-container" style="padding-right:4px"></div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">' +
        '<button id="pkgeditor-cancel" style="padding:8px 18px;border-radius:6px;border:1px solid #444;background:transparent;color:#aaa;cursor:pointer">Cancelar</button>' +
        '<button id="pkgeditor-save" style="padding:8px 18px;border-radius:6px;border:none;background:#4a9aff;color:#fff;cursor:pointer;font-weight:600">Salvar</button>' +
      '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    _pkgRebuildSlots();

    function close() { overlay.remove(); }
    document.getElementById('pkgeditor-close').onclick = close;
    document.getElementById('pkgeditor-cancel').onclick = close;
    // overlay click desabilitado — não fecha ao clicar fora

    document.getElementById('pkgeditor-save').onclick = function() {
      var name = document.getElementById('pkgeditor-name').value.trim();
      if (!name) { showToast('Nome obrigatório', false); return; }
      var btn = document.getElementById('pkgeditor-save');
      btn.disabled = true; btn.textContent = 'Salvando...';

      var savePromise;
      if (_pkgEditor.pkgId) {
        // Edit existing
        savePromise = sbFetch('PATCH', 'catalog_packages?id=eq.' + _pkgEditor.pkgId, { name: name, icon_url: _pkgEditor.iconUrl || null })
          .then(function() { return _savePkgSlots(_pkgEditor.pkgId); });
      } else {
        // Create new
        var order = global.PACKAGES ? global.PACKAGES.length : 0;
        savePromise = sbFetch('POST', 'catalog_packages', { name: name, is_active: true, sort_order: order, icon_url: _pkgEditor.iconUrl || null })
          .then(function(rows) {
            var newId = rows && rows[0] && rows[0].id;
            if (!newId) throw new Error('Falha ao criar pacote');
            _pkgEditor.pkgId = newId;
            return _savePkgSlots(newId);
          });
      }

      savePromise
        .then(function() {
          showToast('Pacote salvo!');
          close();
          location.reload();
        })
        .catch(function(e) {
          btn.disabled = false; btn.textContent = 'Salvar';
          showToast('Erro: ' + e.message, false);
        });
    };
  }

  function openAddPackage() {
    _openPkgEditor('➕ Adicionar Pacote', null, '', []);
  }

  function openEditPackage(pi) {
    var pkg = global.PACKAGES && global.PACKAGES[pi];
    if (!pkg) return;
    // Need to fetch the pkg id from DB to get slot ids
    sbGet('catalog_packages?name=eq.' + encodeURIComponent(pkg.name) + '&select=id,name,icon_url')
      .then(function(rows) {
        if (!rows || !rows[0]) { showToast('Pacote não encontrado', false); return; }
        var pkgId = rows[0].id;
        var pkgIconUrl = rows[0].icon_url || null;
        // Load existing slots
        sbGet('catalog_package_slots?package_id=eq.' + pkgId + '&select=id,slot_index&order=slot_index')
          .then(function(slots) {
            if (!slots.length) {
              _openPkgEditor('✏️ Editar: ' + pkg.name, pkgId, pkg.name, [], pkgIconUrl);
              return;
            }
            var slotIds = slots.map(function(s) { return s.id; });
            sbGet('catalog_package_slot_items?slot_id=in.(' + slotIds.join(',') + ')&select=slot_id,item_name,quantity&order=slot_id')
              .then(function(slotItems) {
                var bySlot = {};
                slotItems.forEach(function(si) {
                  if (!bySlot[si.slot_id]) bySlot[si.slot_id] = [];
                  bySlot[si.slot_id].push({ name: si.item_name, qty: si.quantity });
                });
                var editorSlots = slots.map(function(s) {
                  return { id: s.id, items: bySlot[s.id] || [] };
                });
                _openPkgEditor('✏️ Editar: ' + pkg.name, pkgId, pkg.name, editorSlots, pkgIconUrl);
              });
          });
      });
  }

  function openDeletePackage(pi) {
    var pkg = global.PACKAGES && global.PACKAGES[pi];
    if (!pkg) return;
    var html =
      '<p style="color:#e0e4ff;margin-bottom:16px">O que deseja fazer com o pacote <strong style="color:#fff">'+pkg.name+'</strong>?</p>' +
      '<div style="display:flex;flex-direction:column;gap:10px">' +
        '<button id="btn-disable-pkg" style="padding:10px 16px;border-radius:8px;border:1px solid rgba(255,180,0,.4);background:rgba(255,180,0,.1);color:#ffd080;cursor:pointer;font-size:.9rem;text-align:left">' +
          '⊚ <strong>Desabilitar</strong><br><small style="color:#888;font-size:.78rem">Some do site, mas fica salvo. Você pode reativar depois.</small>' +
        '</button>' +
        '<button id="btn-harddelete-pkg" style="padding:10px 16px;border-radius:8px;border:1px solid rgba(255,60,60,.4);background:rgba(255,60,60,.08);color:#ff8080;cursor:pointer;font-size:.9rem;text-align:left">' +
          '🗑️ <strong>Excluir permanentemente</strong><br><small style="color:#888;font-size:.78rem">Remove do banco de dados para sempre. Não pode desfazer.</small>' +
        '</button>' +
      '</div>';
    var overlay = document.createElement('div');
    overlay.id = 'admin-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
    var modal = document.createElement('div');
    modal.style.cssText = 'background:#1a1d2e;border:1px solid #2a2d45;border-radius:12px;padding:24px;width:100%;max-width:440px;color:#e0e4ff';
    modal.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h3 style="margin:0;font-size:1.1rem;color:#7eb3ff">🗑️ Remover Pacote</h3><button id="adm-pkgx" style="background:none;border:none;color:#888;font-size:1.4rem;cursor:pointer">×</button></div>' + html;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    function close() { overlay.remove(); }
    document.getElementById('adm-pkgx').onclick = close;
    // overlay click desabilitado — não fecha ao clicar fora
    document.getElementById('btn-disable-pkg').onclick = function() {
      sbGet('catalog_packages?name=eq.' + encodeURIComponent(pkg.name))
        .then(function(rows) {
          if (!rows || !rows[0]) throw new Error('Pacote não encontrado');
          return sbFetch('PATCH', 'catalog_packages?id=eq.' + rows[0].id, { is_active: false });
        })
        .then(function() { showToast('Pacote desabilitado.'); close(); reloadDisabledPackages(); location.reload(); })
        .catch(function(e) { showToast('Erro: ' + e.message, false); });
    };
    document.getElementById('btn-harddelete-pkg').onclick = function() {
      if (!confirm('Tem certeza? Isso vai excluir o pacote "'+pkg.name+'" permanentemente.')) return;
      sbGet('catalog_packages?name=eq.' + encodeURIComponent(pkg.name))
        .then(function(rows) {
          if (!rows || !rows[0]) throw new Error('Pacote não encontrado');
          return sbFetch('DELETE', 'catalog_packages?id=eq.' + rows[0].id, null);
        })
        .then(function() { showToast('Pacote excluído permanentemente.'); close(); location.reload(); })
        .catch(function(e) { showToast('Erro: ' + e.message, false); });
    };
  }

  function reloadDisabledPackages() {
    var panel = document.getElementById('admin-disabled-packages-panel');
    if (!panel) return;
    sbGet('catalog_packages?select=id,name,description&is_active=eq.false&order=name')
      .then(function(rows) {
        var list = document.getElementById('admin-disabled-packages-list');
        if (!list) return;
        if (!rows || !rows.length) {
          list.innerHTML = '<div style="color:#555;font-size:.82rem;padding:6px 0">Nenhum pacote desabilitado.</div>';
          return;
        }
        list.innerHTML = rows.map(function(r) {
          return '<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;background:#0f1120;margin-bottom:4px">' +
            '<span style="flex:1;color:#888;font-size:.85rem">'+r.name+'</span>' +
            '<button onclick="window.__adminReenablePackage(\'' + r.id + '\')" style="padding:3px 10px;border-radius:5px;border:1px solid rgba(80,200,80,.3);background:rgba(80,200,80,.08);color:#80d080;font-size:.75rem;cursor:pointer">✓ Reativar</button>' +
          '</div>';
        }).join('');
      });
  }

  global.__adminReenablePackage = function(id) {
    sbFetch('PATCH', 'catalog_packages?id=eq.' + id, { is_active: true })
      .then(function() { showToast('Pacote reativado!'); reloadDisabledPackages(); location.reload(); })
      .catch(function(e) { showToast('Erro: ' + e.message, false); });
  };

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
        '<button class="admin-btn" onclick="window.__adminOpenAddItem()">➕ Adicionar item</button>' +
        '<button class="admin-btn" onclick="window.__adminToggleDisabled(\'items\')" style="border-color:rgba(255,180,0,.3);color:#ffd080">⊚ Desabilitados</button>';
      itemsGrid.parentElement.insertBefore(bar, itemsGrid);
      // Inject disabled panel
      if (!document.getElementById('admin-disabled-items-panel')) {
        var dpanel = document.createElement('div');
        dpanel.id = 'admin-disabled-items-panel';
        dpanel.style.cssText = 'display:none;margin-bottom:10px;padding:12px;background:rgba(255,140,0,.05);border:1px dashed rgba(255,140,0,.25);border-radius:8px';
        dpanel.innerHTML = '<div style="font-size:.78rem;color:#ffd080;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">⊚ Itens Desabilitados</div><div id="admin-disabled-items-list"><div style="color:#555;font-size:.82rem">Carregando...</div></div>';
        itemsGrid.parentElement.insertBefore(dpanel, itemsGrid);
      }
    }

    // ── Aba Captura ──
    var capturaGrid = document.getElementById('captura-grid');
    if (capturaGrid && !document.getElementById('admin-bar-captura')) {
      var bar2 = document.createElement('div');
      bar2.id = 'admin-bar-captura';
      bar2.className = 'admin-bar';
      bar2.innerHTML =
        '<span class="admin-bar-label">⚙️ Admin — Pokémons</span>' +
        '<button class="admin-btn" onclick="window.__adminOpenAddPokemon()">➕ Adicionar pokémon</button>' +
        '<button class="admin-btn" onclick="window.__adminToggleDisabled(\'pokemons\')" style="border-color:rgba(255,180,0,.3);color:#ffd080">⊚ Desabilitados</button>';
      capturaGrid.parentElement.insertBefore(bar2, capturaGrid);
      if (!document.getElementById('admin-disabled-pokemons-panel')) {
        var dpanel2 = document.createElement('div');
        dpanel2.id = 'admin-disabled-pokemons-panel';
        dpanel2.style.cssText = 'display:none;margin-bottom:10px;padding:12px;background:rgba(255,140,0,.05);border:1px dashed rgba(255,140,0,.25);border-radius:8px';
        dpanel2.innerHTML = '<div style="font-size:.78rem;color:#ffd080;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">⊚ Pokémons Desabilitados</div><div id="admin-disabled-pokemons-list"><div style="color:#555;font-size:.82rem">Carregando...</div></div>';
        capturaGrid.parentElement.insertBefore(dpanel2, capturaGrid);
      }
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
      bar3.style.cssText = 'flex-direction:column;align-items:stretch;gap:6px;margin:8px;padding:8px';
      bar3.innerHTML =
        '<span class="admin-bar-label" style="font-size:.7rem">⚙️ Admin — Pacotes</span>' +
        '<button class="admin-btn" onclick="window.__adminOpenAddPackage()" style="justify-content:center">➕ Adicionar Pacote</button>' +
        '<button class="admin-btn" onclick="window.__adminToggleDisabled(\'packages\')" style="justify-content:center;border-color:rgba(255,180,0,.3);color:#ffd080">⊚ Ver Desabilitados</button>';
      pkgSidebar.parentElement.insertBefore(bar3, pkgSidebar);
      if (!document.getElementById('admin-disabled-packages-panel')) {
        var dpanel3 = document.createElement('div');
        dpanel3.id = 'admin-disabled-packages-panel';
        dpanel3.style.cssText = 'display:none;margin:8px;padding:12px;background:rgba(255,140,0,.05);border:1px dashed rgba(255,140,0,.25);border-radius:8px';
        dpanel3.innerHTML = '<div style="font-size:.78rem;color:#ffd080;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">⊚ Pacotes Desabilitados</div><div id="admin-disabled-packages-list"><div style="color:#555;font-size:.82rem">Carregando...</div></div>';
        pkgSidebar.parentElement.insertBefore(dpanel3, pkgSidebar);
      }
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
  global.__adminEditPackage    = function(pi) { openEditPackage(pi); };

  // ── Toggle painel de desabilitados ─────────────────────────────────────
  global.__adminToggleDisabled = function(type) {
    var panelId = { items: 'admin-disabled-items-panel', pokemons: 'admin-disabled-pokemons-panel', packages: 'admin-disabled-packages-panel' }[type];
    var panel = document.getElementById(panelId);
    if (!panel) return;
    var isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) {
      if (type === 'items')    reloadDisabledItems();
      if (type === 'pokemons') reloadDisabledPokemons();
      if (type === 'packages') reloadDisabledPackages();
    }
  };

  // Expõe função para os renders injetarem botões edit/delete nos cards
  global.adminIsAdmin = isAdmin;

  // Injeta barras quando as abas renderizam — aguarda Session.ready()
  // { once: true }: bootstrap singleton — não deve re-executar se db:ready re-disparar
  document.addEventListener('db:ready', function() {
    var doInject = function() { setTimeout(injectAdminBars, 200); };
    if (typeof Session !== 'undefined') {
      Session.ready().then(doInject);
    } else {
      // Fallback se Session não estiver disponível ainda
      setTimeout(doInject, 500);
    }
  }, { once: true });

  // Re-renderiza cards e barras quando sessão muda (login/logout)
  document.addEventListener('db:ready', function() {
    if (typeof Session === 'undefined') return;
    Session.onAuthChange(function(event) {
      // Aguarda um tick para _currentUser ser atualizado
      setTimeout(function() {
        injectAdminBars();
        // Re-renderiza cards (remove/adiciona botões admin conforme sessão)
        if (typeof renderItems === 'function') renderItems();
        if (typeof window.renderCaptura === 'function') window.renderCaptura();
        // Remove barras admin se deslogou
        if (!isAdmin()) {
          ['admin-bar-items','admin-bar-packages','admin-bar-captura'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.remove();
          });
          ['admin-disabled-items-panel','admin-disabled-pokemons-panel','admin-disabled-packages-panel'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.remove();
          });
        }
      }, 100);
    });
  }, { once: true });

  // Re-injeta quando muda de aba
  document.addEventListener('db:ready', function() {
    var _orig = global.switchTab;
    if (typeof _orig !== 'function') return;
    global.switchTab = function(tab, btn, opts) {
      var r = _orig.call(this, tab, btn, opts);
      if (typeof Session !== 'undefined') {
        Session.ready().then(function() { setTimeout(injectAdminBars, 300); });
      } else {
        setTimeout(injectAdminBars, 400);
      }
      return r;
    };
  }, { once: true });

  // Expõe a função de preview de tipagem globalmente
  // (chamada via oninput nos formulários de add/edit pokémon)
  global._adminPreviewType = function(inputId, previewId) {
    var nameEl    = document.getElementById(inputId);
    var previewEl = document.getElementById(previewId);
    if (!nameEl || !previewEl) return;
    var name  = nameEl.value.trim();
    var types = typeof _getTypesForPokemon === 'function' ? _getTypesForPokemon(name) : [];
    var bannerMap = window._adminTypeBannerMap || {};

    if (!types.length) {
      previewEl.innerHTML = name
        ? '<span style="color:#888;font-size:.82rem">tipo não reconhecido — banner não será adicionado</span>'
        : '';
      return;
    }

    // Monta botões para cada tipo — clicando escolhe qual banner usar
    var btns = types.map(function(t, i) {
      var banner = bannerMap[t] || '';
      var isFirst = i === 0;
      return '<button type="button" onclick="window._adminSelectType(\'' + inputId + '\',\'' + previewId + '\',\'' + t + '\')" '
        + 'style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;margin-right:5px;'
        + 'border-radius:6px;border:1px solid ' + (isFirst ? '#60aaff' : 'rgba(255,255,255,.2)') + ';'
        + 'background:' + (isFirst ? 'rgba(96,170,255,.15)' : 'rgba(255,255,255,.04)') + ';'
        + 'color:' + (isFirst ? '#aef' : 'rgba(255,255,255,.5)') + ';cursor:pointer;font-size:.78rem;'
        + '" data-type="' + t + '">'
        + (banner ? '<img src="' + banner + '" style="height:18px;border-radius:3px" onerror="this.style.display=\'none\'">' : '')
        + '<span style="text-transform:capitalize">' + t + '</span>'
        + (isFirst ? ' <span style="font-size:.65rem;opacity:.6">(selecionado)</span>' : '')
        + '</button>';
    }).join('');

    previewEl.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">'
      + '<span style="color:rgba(255,255,255,.4);font-size:.75rem;margin-right:4px">Banner:</span>'
      + btns
      + '</div>';

    // Seleciona o primeiro tipo por padrão
    window._adminSelectedBanner = bannerMap[types[0]] || null;
  };

  // Quando admin clica num tipo diferente — troca o banner selecionado
  global._adminSelectType = function(inputId, previewId, selectedType) {
    var bannerMap = window._adminTypeBannerMap || {};
    window._adminSelectedBanner = bannerMap[selectedType] || null;

    // Atualiza visual dos botões
    var previewEl = document.getElementById(previewId);
    if (!previewEl) return;
    previewEl.querySelectorAll('button[data-type]').forEach(function(btn) {
      var t = btn.getAttribute('data-type');
      var isSelected = t === selectedType;
      btn.style.borderColor  = isSelected ? '#60aaff' : 'rgba(255,255,255,.2)';
      btn.style.background   = isSelected ? 'rgba(96,170,255,.15)' : 'rgba(255,255,255,.04)';
      btn.style.color        = isSelected ? '#aef' : 'rgba(255,255,255,.5)';
      // Atualiza label "(selecionado)"
      var label = btn.querySelector('span:last-child');
      if (label) label.textContent = isSelected ? '(selecionado)' : '';
    });
  };

  // ── Sobrescreve buildPkgCardHTML para injetar botões admin ───────────────
  document.addEventListener('db:ready', function() {
    var _origBuildPkgCard = global.buildPkgCardHTML;
    if (typeof _origBuildPkgCard !== 'function') return;

    global.buildPkgCardHTML = function(pkg, pi, isActive, cartCount) {
      var base = _origBuildPkgCard(pkg, pi, isActive, cartCount);
      if (!isAdmin()) return base;

      // Wrap original card + inject admin buttons row below it
      var adminRow =
        '<div class="pkg-admin-row" onclick="event.stopPropagation()">' +
          '<button class="pkg-admin-btn" onclick="window.__adminEditPackage(' + pi + ')" title="Editar pacote">✏️</button>' +
          '<button class="pkg-admin-btn danger" onclick="window.__adminDelPackage(' + pi + ')" title="Remover pacote">🗑️</button>' +
        '</div>';

      // Inject row before closing </div> of the card
      return base.replace(/(<\/div>\s*)$/, adminRow + '$1');
    };
  }, { once: true });

}(window));

// CSS extra para botões admin nos cards de captura
;(function() {
  var s = document.createElement('style');
  s.textContent = [
    '.cpk-admin-row{display:flex;gap:6px;justify-content:center;margin-top:4px}',
    '.cpk-admin-btn{padding:3px 10px;border-radius:5px;border:1px solid rgba(74,154,255,.3);background:rgba(74,154,255,.08);color:#7eb3ff;font-size:.75rem;cursor:pointer}',
    '.cpk-admin-btn.danger{border-color:rgba(255,80,80,.3);background:rgba(255,80,80,.06);color:#ff9090}',
    '.cpk-admin-btn:hover{filter:brightness(1.3)}',
    '.pkg-admin-row{display:flex;gap:5px;justify-content:center;padding:4px 0 2px;border-top:1px solid rgba(255,255,255,.06);margin-top:4px}',
    '.pkg-admin-btn{padding:3px 10px;border-radius:5px;border:1px solid rgba(74,154,255,.3);background:rgba(74,154,255,.08);color:#7eb3ff;font-size:.73rem;cursor:pointer}',
    '.pkg-admin-btn.danger{border-color:rgba(255,80,80,.3);background:rgba(255,80,80,.06);color:#ff9090}',
    '.pkg-admin-btn:hover{filter:brightness(1.3)}',
  ].join('\n');
  document.head.appendChild(s);
}());
