// ============================================================
// db-bootstrap.js — Fonte única de verdade via Supabase
// ============================================================
;(function (global) {
  'use strict';

  function _get(path, params) {
    var url = global.SUPABASE_URL + '/rest/v1/' + path;
    if (params) url += '?' + params;
    return fetch(url, {
      headers: {
        'apikey':        global.SUPABASE_KEY,
        'Authorization': 'Bearer ' + global.SUPABASE_KEY,
        'Accept':        'application/json',
      }
    }).then(function(r) {
      if (!r.ok) {
        return r.text().then(function(t) {
          throw new Error(path + ' HTTP ' + r.status + ': ' + t);
        });
      }
      return r.json();
    }).then(function(data) {
      // Supabase pode retornar objeto de erro em vez de array
      if (!Array.isArray(data)) {
        throw new Error(path + ' retornou não-array: ' + JSON.stringify(data).slice(0,200));
      }
      return data;
    });
  }

  // ── Converte BRL → raw usando APP_CONFIG ─────────────────────────────────
  function brlToRaw(brl) {
    if (!brl) return null;
    var cfg = global.APP_CONFIG || {};
    var kkToBrl  = cfg.kk_to_brl  || 1.70;
    var rawPerKk = cfg.raw_per_kk || 1000000;
    return Math.floor(brl / kkToBrl * rawPerKk);
  }

  function brlToKk(brl) {
    if (!brl) return null;
    return Math.round(brl / ((global.APP_CONFIG||{}).kk_to_brl || 1.70) * 10000) / 10000;
  }

  function brlToDd(brl) {
    if (!brl) return null;
    return Math.round(brl / ((global.APP_CONFIG||{}).dd_to_brl || 0.70) * 10000) / 10000;
  }

  // ── 1. financial_config ──────────────────────────────────────────────────
  function loadConfig() {
    return _get('financial_config', 'select=key,value').then(function(rows) {
      var cfg = {};
      rows.forEach(function(r) { cfg[r.key] = parseFloat(r.value); });
      global.APP_CONFIG = {
        kk_to_brl:       cfg.kk_to_brl       || 1.70,
        dd_to_brl:       cfg.dd_to_brl       || 0.70,
        raw_per_kk:      cfg.raw_per_kk      || 1000000,
        service_fee_pct: cfg.service_fee_pct || 0,
      };
      global.KK_TO_BRL = global.APP_CONFIG.kk_to_brl;
    });
  }

  // ── 2. catalog_items (tabela direta, sem depender da view) ───────────────
  function loadItems() {
    return _get('catalog_items', 'select=id,name,price_brl,drop_tier&is_active=eq.true&order=name').then(function(rows) {
      var seen = new Set();
      var arr  = [];
      rows.forEach(function(r) {
        if (seen.has(r.name)) return;
        seen.add(r.name);
        var raw = brlToRaw(parseFloat(r.price_brl));
        arr.push({
          id:        r.id,
          name:      r.name,
          image:     '',
          price:     raw,
          price_brl: r.price_brl ? parseFloat(r.price_brl) : null,
          price_kk:  brlToKk(r.price_brl),
          price_dd:  brlToDd(r.price_brl),
          tier:      r.drop_tier || '',
          evo:       '',
        });
      });
      arr.forEach(function(item, i) { item._idx = i; });
      global.items = global.items || [];
      global.items.length = 0;
      arr.forEach(function(item) { global.items.push(item); });
      var el = document.getElementById('total-count');
      if (el) el.textContent = global.items.length + ' itens no índice';
    });
  }

  // ── 3. packages (tabelas diretas) ────────────────────────────────────────
  function loadPackages() {
    // Busca pacotes + slots + itens via join manual
    return _get('catalog_packages', 'select=id,name,sort_order&is_active=eq.true&order=sort_order')
      .then(function(pkgs) {
        if (!pkgs.length) return;
        return _get('catalog_package_slots', 'select=id,package_id,slot_index&order=slot_index')
          .then(function(slots) {
            return _get('catalog_package_slot_items', 'select=slot_id,item_name,quantity&order=slot_id')
              .then(function(opts) {
                // Monta estrutura { slotId → [[name,qty],...] }
                var slotItems = {};
                opts.forEach(function(o) {
                  if (!slotItems[o.slot_id]) slotItems[o.slot_id] = [];
                  slotItems[o.slot_id].push([o.item_name, o.quantity]);
                });

                // Monta estrutura { pkgId → { slotIdx → [[name,qty],...] } }
                var pkgSlots = {};
                slots.forEach(function(s) {
                  if (!pkgSlots[s.package_id]) pkgSlots[s.package_id] = {};
                  pkgSlots[s.package_id][s.slot_index] = slotItems[s.id] || [];
                });

                var arr = pkgs.map(function(p) {
                  var slotsObj = pkgSlots[p.id] || {};
                  var idxs = Object.keys(slotsObj).map(Number).sort(function(a,b){return a-b;});
                  return {
                    name:  p.name,
                    slots: idxs.map(function(i) { return slotsObj[i]; }),
                  };
                });

                global.PACKAGES = global.PACKAGES || [];
                global.PACKAGES.length = 0;
                arr.forEach(function(p) { global.PACKAGES.push(p); });
              });
          });
      });
  }

  // ── 4. catalog_pokemons ──────────────────────────────────────────────────
  function loadPokemons() {
    return _get('catalog_pokemons', 'select=id,name,price_brl,tier,banner_image_url,is_dive,avg_capture_minutes&is_active=eq.true&order=sort_order').then(function(rows) {
      var arr = rows.map(function(r) {
        return {
          id:                  r.id,
          name:                r.name,
          price:               brlToRaw(parseFloat(r.price_brl)),
          price_brl:           r.price_brl ? parseFloat(r.price_brl) : null,
          price_kk:            brlToKk(parseFloat(r.price_brl)),
          price_dd:            brlToDd(parseFloat(r.price_brl)),
          tag:                 r.tier || '',
          image:               r.image_url || '',
          bannerImage:         r.banner_image_url || '',
          dive:                !!r.is_dive,
          avg_capture_minutes: r.avg_capture_minutes || 10080,
        };
      });
      arr.forEach(function(p, i) { p._idx = i; });
      global.POKEMONS = global.POKEMONS || [];
      global.POKEMONS.length = 0;
      arr.forEach(function(p) { global.POKEMONS.push(p); });

      // injeta bannerImage nos items compatibilidade
      global.POKEMONS.forEach(function(p) {
        if (!p.bannerImage) return;
        var item = (global.items || []).find(function(it) { return it.name === p.name; });
        if (item) item.bannerImage = p.bannerImage;
      });
    });
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  global.__dbReady = false;

  // Carrega config primeiro (precisa antes de calcular raw/kk/dd)
  loadConfig()
    .then(function() {
      return Promise.all([loadItems(), loadPackages(), loadPokemons()]);
    })
    .then(function() {
      global.__dbReady = true;
      document.dispatchEvent(new CustomEvent('db:ready'));
      console.log('[db-bootstrap] OK — items:', (global.items||[]).length,
        '| packages:', (global.PACKAGES||[]).length,
        '| pokemons:', (global.POKEMONS||[]).length,
        '| kk_to_brl:', (global.APP_CONFIG||{}).kk_to_brl);
    })
    .catch(function(err) {
      console.error('[db-bootstrap] ERRO:', err.message || err);
      global.__dbReady = true;
      document.dispatchEvent(new CustomEvent('db:ready'));
    });

}(window));
