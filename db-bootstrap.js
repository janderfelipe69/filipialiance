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
      if (!r.ok) return r.text().then(function(t) {
        throw new Error(path + ' HTTP ' + r.status + ': ' + t.slice(0,200));
      });
      return r.json();
    }).then(function(data) {
      if (!Array.isArray(data)) {
        throw new Error(path + ' retornou não-array: ' + JSON.stringify(data).slice(0,200));
      }
      return data;
    });
  }

  // Converte KK (ex: 38.5 = 38.5kk) para raw (inteiro de unidades base)
  function kkToRaw(kk) {
    if (!kk) return null;
    var cfg = global.APP_CONFIG || {};
    return Math.floor(parseFloat(kk) * (cfg.raw_per_kk || 1000000));
  }
  // Converte KK para BRL usando taxa da config
  function kkToBrl(kk) {
    if (!kk) return null;
    var cfg = global.APP_CONFIG || {};
    return parseFloat((parseFloat(kk) * (cfg.kk_to_brl || 1.70)).toFixed(2));
  }
  // Converte KK para DD usando taxa da config
  function kkToDd(kk) {
    if (!kk) return null;
    var cfg = global.APP_CONFIG || {};
    return Math.round(parseFloat(kk) * (cfg.kk_to_brl || 1.70) / (cfg.dd_to_brl || 0.70));
  }
  // Legado: converte BRL para raw (usado apenas para dados antigos sem price_kk)
  function brlToRaw(brl) {
    if (!brl) return null;
    var cfg = global.APP_CONFIG || {};
    return Math.floor(parseFloat(brl) / (cfg.kk_to_brl || 1.70) * (cfg.raw_per_kk || 1000000));
  }
  function brlToKk(brl)  { if (!brl) return null; return Number(parseFloat(brl) / ((global.APP_CONFIG||{}).kk_to_brl || 1.70)).toFixed(2) * 1; }
  function brlToDd(brl)  { if (!brl) return null; return Math.round(parseFloat(brl) / ((global.APP_CONFIG||{}).dd_to_brl || 0.70)); }

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
      console.log('[CatalogService] config loaded — kk_to_brl:', global.KK_TO_BRL);
    });
  }

  // ── 2. catalog_items ─────────────────────────────────────────────────────
  function loadItems() {
    return _get('catalog_items', 'select=id,name,price_kk,price_brl,drop_tier&is_active=eq.true&order=name')
      .then(function(rows) {
        var arr = [];
        rows.forEach(function(r, i) {
          // Prioriza price_kk; fallback para price_brl legado
          var kk  = r.price_kk  ? parseFloat(r.price_kk)  : null;
          var brl = r.price_brl ? parseFloat(r.price_brl) : null;
          var raw, finalKk, finalBrl, finalDd;
          if (kk !== null) {
            raw      = kkToRaw(kk);
            finalKk  = kk;
            finalBrl = kkToBrl(kk);
            finalDd  = kkToDd(kk);
          } else if (brl !== null) {
            // dados antigos sem price_kk
            raw      = brlToRaw(brl);
            finalKk  = brlToKk(brl);
            finalBrl = brl;
            finalDd  = brlToDd(brl);
          } else {
            raw = null; finalKk = null; finalBrl = null; finalDd = null;
          }
          arr.push({
            id: r.id, name: r.name, image: '', evo: '',
            price:     raw,
            price_kk:  finalKk,
            price_brl: finalBrl,
            price_dd:  finalDd,
            tier:      r.drop_tier || '',
            _idx: i,
          });
        });
        // Hidrata arrays globais mantendo referência
        global.items = global.items || [];
        global.items.length = 0;
        arr.forEach(function(item) { global.items.push(item); });
        var el = document.getElementById('total-count');
        if (el) el.textContent = global.items.length + ' itens no índice';
        console.log('[CatalogService] items loaded:', global.items.length);
        console.log('[CatalogService] window.items === global.items:', window.items === global.items);
        console.log('[CatalogService] items[0]:', global.items[0] ? global.items[0].name : 'VAZIO');
      });
  }

  // ── 3. packages ──────────────────────────────────────────────────────────
  function loadPackages() {
    return _get('catalog_packages', 'select=id,name,sort_order&is_active=eq.true&order=sort_order')
      .then(function(pkgs) {
        if (!pkgs.length) {
          console.warn('[CatalogService] packages: 0 pacotes encontrados');
          global.PACKAGES = global.PACKAGES || [];
          global.PACKAGES.length = 0;
          return;
        }
        return _get('catalog_package_slots', 'select=id,package_id,slot_index&order=slot_index')
          .then(function(slots) {
            return _get('catalog_package_slot_items', 'select=slot_id,item_name,quantity&order=slot_id')
              .then(function(opts) {
                var slotItems = {};
                opts.forEach(function(o) {
                  if (!slotItems[o.slot_id]) slotItems[o.slot_id] = [];
                  slotItems[o.slot_id].push([o.item_name, o.quantity]);
                });
                var pkgSlots = {};
                slots.forEach(function(s) {
                  if (!pkgSlots[s.package_id]) pkgSlots[s.package_id] = {};
                  pkgSlots[s.package_id][s.slot_index] = slotItems[s.id] || [];
                });
                var arr = pkgs.map(function(p) {
                  var slotsObj = pkgSlots[p.id] || {};
                  var idxs = Object.keys(slotsObj).map(Number).sort(function(a,b){return a-b;});
                  return { name: p.name, slots: idxs.map(function(i) { return slotsObj[i]; }) };
                });
                global.PACKAGES = global.PACKAGES || [];
                global.PACKAGES.length = 0;
                arr.forEach(function(p) { global.PACKAGES.push(p); });
                console.log('[CatalogService] packages loaded:', global.PACKAGES.length);
              });
          });
      });
  }

  // ── 4. catalog_pokemons ──────────────────────────────────────────────────
  function loadPokemons() {
    return _get('catalog_pokemons', 'select=id,name,price_kk,price_brl,tier,banner_image_url,is_dive,avg_capture_minutes&is_active=eq.true&order=sort_order')
      .then(function(rows) {
        var arr = rows.map(function(r, i) {
          var kk  = r.price_kk  ? parseFloat(r.price_kk)  : null;
          var brl = r.price_brl ? parseFloat(r.price_brl) : null;
          var raw, finalKk, finalBrl, finalDd;
          if (kk !== null) {
            raw = kkToRaw(kk); finalKk = kk; finalBrl = kkToBrl(kk); finalDd = kkToDd(kk);
          } else if (brl !== null) {
            raw = brlToRaw(brl); finalKk = brlToKk(brl); finalBrl = brl; finalDd = brlToDd(brl);
          } else {
            raw = null; finalKk = null; finalBrl = null; finalDd = null;
          }
          return {
            id: r.id, name: r.name, image: '',
            price:     raw,
            price_kk:  finalKk,
            price_brl: finalBrl,
            price_dd:  finalDd,
            tag:        r.tier || '',
            bannerImage: r.banner_image_url || '',
            dive:        !!r.is_dive,
            avg_capture_minutes: r.avg_capture_minutes || 10080,
            _idx: i,
          };
        });
        global.POKEMONS = global.POKEMONS || [];
        global.POKEMONS.length = 0;
        arr.forEach(function(p) { global.POKEMONS.push(p); });
        // Injeta bannerImage nos items (compatibilidade legado)
        global.POKEMONS.forEach(function(p) {
          if (!p.bannerImage) return;
          var item = (global.items||[]).find(function(it) { return it.name === p.name; });
          if (item) item.bannerImage = p.bannerImage;
        });
        console.log('[CatalogService] pokemons loaded:', global.POKEMONS.length);
        console.log('[CatalogService] POKEMONS[0]:', global.POKEMONS[0] ? global.POKEMONS[0].name : 'VAZIO');
      });
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  global.__dbReady = false;

  loadConfig()
    .then(function() {
      return Promise.all([loadItems(), loadPackages(), loadPokemons()]);
    })
    .then(function() {
      global.__dbReady = true;
      document.dispatchEvent(new CustomEvent('db:ready'));
      console.log('[CatalogService] READY — items:', (global.items||[]).length,
        '| packages:', (global.PACKAGES||[]).length,
        '| pokemons:', (global.POKEMONS||[]).length);
    })
    .catch(function(err) {
      console.error('[CatalogService] ERRO no bootstrap:', err.message || err);
      global.__dbReady = true;
      document.dispatchEvent(new CustomEvent('db:ready'));
    });

}(window));
