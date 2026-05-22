// ============================================================
// db-bootstrap.js — Fonte única de verdade via Supabase
// PokeAlliance Shop
//
// SUBSTITUI: RAW[], PACKAGES[], POKEMONS[], KK_TO_BRL em dados.js/app.js
//
// COMO FUNCIONA:
//   1. Busca financial_config → window.APP_CONFIG (KK_TO_BRL, DD_TO_BRL, etc.)
//   2. Busca v_catalog_items  → window.items[]   (mesmo formato que antes)
//   3. Busca v_catalog_packages → window.PACKAGES[] (mesmo formato que antes)
//   4. Busca v_catalog_pokemons → window.POKEMONS[] (mesmo formato que antes)
//   5. Dispara window.__dbReady = true e evento 'db:ready'
//
// CARREGAMENTO:
//   Adicione APÓS supabase-client.js e ANTES de dados.js no index.html:
//   <script src="supabase-client.js"></script>
//   <script src="db-bootstrap.js"></script>
//   <script src="dados.js"></script>   ← dados.js passa a ser só fallback vazio
//
// LAYOUT/RENDER:
//   Nenhum layout é alterado. Os arrays globais têm exatamente
//   o mesmo formato que antes — o resto do site não sabe a diferença.
// ============================================================

;(function (global) {
  'use strict';

  // ── Helpers de fetch REST Supabase ───────────────────────────────────────
  function _get(path, params) {
    var url = global.SUPABASE_URL + '/rest/v1/' + path;
    if (params) url += '?' + params;
    return fetch(url, {
      headers: {
        'apikey':        global.SUPABASE_KEY,
        'Authorization': 'Bearer ' + global.SUPABASE_KEY,
        'Accept':        'application/json',
      }
    }).then(function(r) { return r.json(); });
  }

  // ── 1. financial_config → APP_CONFIG ────────────────────────────────────
  // Expõe window.APP_CONFIG.kk_to_brl, .dd_to_brl, .raw_per_kk, .service_fee_pct
  // Também mantém window.KK_TO_BRL para compatibilidade com price-layer.js
  function loadConfig() {
    return _get('financial_config', 'select=key,value').then(function(rows) {
      var cfg = {};
      (rows || []).forEach(function(r) { cfg[r.key] = parseFloat(r.value); });
      global.APP_CONFIG = {
        kk_to_brl:       cfg.kk_to_brl       || 1.70,
        dd_to_brl:       cfg.dd_to_brl       || 0.70,
        raw_per_kk:      cfg.raw_per_kk      || 1000000,
        service_fee_pct: cfg.service_fee_pct || 0,
      };
      // Compatibilidade com código legado que usa KK_TO_BRL diretamente
      global.KK_TO_BRL = global.APP_CONFIG.kk_to_brl;
    });
  }

  // ── 2. v_catalog_items → items[] ────────────────────────────────────────
  // Formato mantido idêntico ao que app.js esperava do RAW[]:
  //   { name, image, price, tier, evo, _idx, price_brl, price_kk, price_dd }
  // price continua sendo o valor RAW (coins) para compatibilidade total
  function loadItems() {
    return _get('v_catalog_items', 'select=id,name,price_brl,price_raw,price_kk,price_dd,drop_tier,is_active&is_active=eq.true&order=name').then(function(rows) {
      var seen  = new Set();
      var arr   = [];
      (rows || []).forEach(function(r) {
        if (seen.has(r.name)) return;
        seen.add(r.name);
        arr.push({
          id:        r.id,
          name:      r.name,
          image:     '',                          // itens não têm imagem própria
          price:     r.price_raw   || null,       // raw coins — compatibilidade
          price_brl: r.price_brl   || null,
          price_kk:  r.price_kk    || null,
          price_dd:  r.price_dd    || null,
          tier:      r.drop_tier   || '',
          evo:       '',
        });
      });
      arr.forEach(function(item, i) { item._idx = i; });
      // Substitui o array global mantendo a referência (push em vez de =)
      global.items = global.items || [];
      global.items.length = 0;
      arr.forEach(function(item) { global.items.push(item); });
      // Atualiza contador do DOM se já existir
      var el = document.getElementById('total-count');
      if (el) el.textContent = global.items.length + ' itens no índice';
    });
  }

  // ── 3. v_catalog_packages → PACKAGES[] ──────────────────────────────────
  // Formato mantido idêntico:
  //   { name, slots: [ [ [itemName, qty], ... ], ... ] }
  function loadPackages() {
    return _get('v_catalog_packages', 'select=package_id,package_name,slot_index,item_name,qty,is_active&is_active=eq.true&order=sort_order,slot_index').then(function(rows) {
      // Agrupa por pacote → slot → opções
      var pkgMap  = {};   // { pkgName: { idx, slots: { slotIdx: [[name,qty],...] } } }
      var pkgOrder = [];
      (rows || []).forEach(function(r) {
        if (!pkgMap[r.package_name]) {
          pkgMap[r.package_name] = { slots: {} };
          pkgOrder.push(r.package_name);
        }
        var slots = pkgMap[r.package_name].slots;
        if (!slots[r.slot_index]) slots[r.slot_index] = [];
        slots[r.slot_index].push([r.item_name, r.qty]);
      });

      var arr = pkgOrder.filter(function(n, i) { return pkgOrder.indexOf(n) === i; })
        .map(function(name) {
          var pkg    = pkgMap[name];
          var slots  = [];
          var idxs   = Object.keys(pkg.slots).map(Number).sort(function(a,b){return a-b;});
          idxs.forEach(function(si) { slots.push(pkg.slots[si]); });
          return { name: name, slots: slots };
        });

      global.PACKAGES = global.PACKAGES || [];
      global.PACKAGES.length = 0;
      arr.forEach(function(p) { global.PACKAGES.push(p); });
    });
  }

  // ── 4. v_catalog_pokemons → POKEMONS[] ──────────────────────────────────
  // Formato mantido idêntico:
  //   { name, price, tag, image, bannerImage, _idx, price_brl, price_kk, price_dd }
  // price continua sendo raw coins para compatibilidade com formatKK()
  function loadPokemons() {
    return _get('v_catalog_pokemons', 'select=id,name,price_brl,price_raw,price_kk,price_dd,tier,image_url,banner_image_url,is_dive,avg_capture_minutes,is_active&is_active=eq.true&order=sort_order').then(function(rows) {
      var arr = (rows || []).map(function(r) {
        return {
          id:              r.id,
          name:            r.name,
          price:           r.price_raw    || null,    // raw coins — compatibilidade
          price_brl:       r.price_brl    || null,
          price_kk:        r.price_kk     || null,
          price_dd:        r.price_dd     || null,
          tag:             r.tier         || '',
          image:           r.image_url    || '',
          bannerImage:     r.banner_image_url || '',
          dive:            !!r.is_dive,
          avg_capture_minutes: r.avg_capture_minutes || 10080,
        };
      });
      arr.forEach(function(p, i) { p._idx = i; });

      global.POKEMONS = global.POKEMONS || [];
      global.POKEMONS.length = 0;
      arr.forEach(function(p) { global.POKEMONS.push(p); });

      // Compatibilidade: injeta bannerImage nos items
      global.POKEMONS.forEach(function(p) {
        if (!p.bannerImage) return;
        var item = (global.items || []).find(function(it) { return it.name === p.name; });
        if (item) item.bannerImage = p.bannerImage;
      });
    });
  }

  // ── Boot: carrega tudo em paralelo ───────────────────────────────────────
  global.__dbReady = false;

  Promise.all([loadConfig(), loadItems(), loadPackages(), loadPokemons()])
    .then(function() {
      global.__dbReady = true;
      // Dispara evento para quem quiser ouvir
      document.dispatchEvent(new CustomEvent('db:ready'));
      console.log('[db-bootstrap] OK — items:', (global.items||[]).length,
        '| packages:', (global.PACKAGES||[]).length,
        '| pokemons:', (global.POKEMONS||[]).length,
        '| kk_to_brl:', (global.APP_CONFIG||{}).kk_to_brl);
    })
    .catch(function(err) {
      console.error('[db-bootstrap] ERRO ao carregar dados do Supabase:', err);
      // Fallback: dados.js hardcoded ainda existem como segurança
      global.__dbReady = true;
      document.dispatchEvent(new CustomEvent('db:ready'));
    });

}(window));
