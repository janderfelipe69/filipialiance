/**
 * packages.render.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsabilidade única: construir e injetar HTML da aba de pacotes.
 *
 * Estado lido SEMPRE de window.pkgState (definido em packages.logic.js).
 * Nenhuma variável de estado declarada aqui.
 * Nenhum CSS injetado. Nenhum observer. Nenhum hack.
 *
 * Funções públicas (chamadas por app.js e packages.logic.js):
 *   renderPkgCatTabs()   — barra de categorias
 *   renderPackages()     — sidebar de cards
 *   renderPkgDetail(pi)  — painel de detalhe
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ═══════════════════════════════════════════════════════════════════════════
   BUILDERS DE HTML — funções puras, sem efeito colateral
   ═══════════════════════════════════════════════════════════════════════════ */

function buildPkgCardHTML(pkg, pi, isActive, cartCount) {
  var icon      = getPkgIcon(pkg.name);
  var pkgColor  = getPkgTypeColor(pkg.name);
  var allItems  = getPkgAllItems(pkg);
  var itemQty   = allItems.length;
  var itemLabel = itemQty === 1 ? 'item' : 'itens';

  var badgeHTML  = cartCount
    ? '<div class="pkg-card-cart-badge">✓ ×' + cartCount + '</div>'
    : '';

  var cls = 'pkg-sidebar-item'
    + (isActive    ? ' active'     : '')
    + (cartCount   ? ' is-in-cart' : '');

  return '<div class="' + cls + '"'
    + ' onclick="selectPkg(' + pi + ')"'
    + ' style="--pkg-color:' + pkgColor + '">'
    + badgeHTML
    + '<div class="pkg-sidebar-item-icon">' + icon + '</div>'
    + '<div class="pkg-sidebar-item-info">'
    +   '<div class="pkg-sidebar-item-name">' + pkg.name + '</div>'
    +   '<div class="pkg-sidebar-item-sub">' + itemQty + ' ' + itemLabel + '</div>'
    + '</div>'
    + '</div>';
}

function buildSlotTabHTML(pkg, pi, slot, slotIdx, isActive) {
  var disabledCount = 0;
  var slotTotal     = 0;
  var noPriceCount  = 0;

  for (var i = 0; i < slot.length; i++) {
    var n = slot[i][0], q = slot[i][1];
    if (isPkgItemDisabled(pi, slotIdx, n)) {
      disabledCount++;
      continue;
    }
    var it = getPkgItemData(n);
    if (it && it.price) {
      slotTotal += it.price * q;
    } else {
      noPriceCount++;
    }
  }

  var activeCount = slot.length - disabledCount;
  var totalData   = slotTotal > 0 ? formatKK(slotTotal) : null;
  var allDisabled = disabledCount === slot.length;
  var hasNoPrice  = noPriceCount > 0;

  var cls = 'pkg-slot-btn'
    + (isActive    ? ' active'       : '')
    + (allDisabled ? ' all-disabled' : '')
    + (hasNoPrice  ? ' has-no-price' : '');

  var priceHTML = totalData
    ? '<span class="pkg-slot-btn-price">' + totalData.label + '</span>'
    : '';
  var warnHTML = hasNoPrice
    ? '<span class="pkg-slot-no-price-warn">⚠ ' + noPriceCount + ' s/preço</span>'
    : '';

  return '<button class="' + cls + '"'
    + ' onclick="selectPkgSlot(' + pi + ', ' + slotIdx + ')">'
    +   '<span class="pkg-slot-btn-label">' + getSlotLabel(pkg, slotIdx) + '</span>'
    +   priceHTML
    +   '<span class="pkg-slot-btn-count">' + activeCount + '/' + slot.length + ' itens</span>'
    +   warnHTML
    + '</button>';
}

function buildItemRowHTML(name, qty, pi, si) {
  var disabled  = isPkgItemDisabled(pi, si, name);
  var item      = getPkgItemData(name);
  var lineTotal = (!disabled && item && item.price && qty > 0) ? item.price * qty : 0;
  var priceData = lineTotal > 0 ? formatKK(lineTotal) : null;

  var safeName  = name.replace(/'/g, "\\'");

  var priceHTML = disabled
    ? '<span class="row-disabled-label">removido</span>'
    : (priceData ? priceData.label : '—');

  var iconChar   = disabled ? '○' : '◆';
  var toggleChar = disabled ? '↩' : '✕';

  var wikiBtn = '<button class="wiki-lookup-btn"'
    + ' onclick="openWikiLookup(\'' + safeName + '\', event)"'
    + ' title="Ver drops na Wiki">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">'
    + '<circle cx="11" cy="11" r="7"/>'
    + '<line x1="21" y1="21" x2="16.65" y2="16.65"/>'
    + '</svg>'
    + '</button>';

  return '<div class="pkg-detail-row' + (disabled ? ' row-disabled' : '') + '"'
    + ' onclick="togglePkgItem(' + pi + ', ' + si + ', \'' + safeName + '\')">'
    +   '<div class="pkg-detail-row-icon">' + iconChar + '</div>'
    +   '<span class="pkg-detail-row-name">' + name + wikiBtn + '</span>'
    +   '<div class="pkg-detail-row-right">'
    +     '<span class="pkg-detail-row-price">' + priceHTML + '</span>'
    +     '<span class="pkg-detail-row-qty">×' + qty.toLocaleString() + '</span>'
    +     '<span class="pkg-row-toggle-btn">' + toggleChar + '</span>'
    +   '</div>'
    + '</div>';
}

/* ═══════════════════════════════════════════════════════════════════════════
   FUNÇÕES DE RENDER PÚBLICAS
   ═══════════════════════════════════════════════════════════════════════════ */

function renderPkgCatTabs() {
  var el = document.getElementById('pkg-cat-tabs');
  if (!el) return;

  var cats = ['all'];
  var seen = {};
  for (var i = 0; i < PACKAGES.length; i++) {
    var cat = getPkgCategory(PACKAGES[i].name);
    if (!seen[cat]) { seen[cat] = true; cats.push(cat); }
  }

  var html = '';
  for (var c = 0; c < cats.length; c++) {
    var cat   = cats[c];
    var count = 0;
    if (cat === 'all') {
      count = PACKAGES.length;
    } else {
      for (var j = 0; j < PACKAGES.length; j++) {
        if (getPkgCategory(PACKAGES[j].name) === cat) count++;
      }
    }
    var meta       = PKG_CAT_META[cat] || { label: cat, icon: '📌' };
    var activeCls  = pkgState.activePkgCat === cat ? ' active' : '';
    html += '<button class="pkg-cat-btn' + activeCls + '"'
      + ' onclick="selectPkgCat(\'' + cat + '\')">'
      +   '<span class="pkg-cat-icon">' + meta.icon + '</span>'
      +   meta.label
      +   '<span class="pkg-cat-count">' + count + '</span>'
      + '</button>';
  }
  el.innerHTML = html;
}

function renderPackages() {
  var sidebarList = document.getElementById('pkg-sidebar-list');
  if (!sidebarList) return;

  // Garante que PACKAGES existe e está carregado
  if (typeof PACKAGES === 'undefined' || !PACKAGES.length) {
    sidebarList.innerHTML =
      '<div style="grid-column:1/-1;padding:20px;text-align:center;'
      + 'font-family:var(--font-mono);font-size:11px;color:var(--muted)">'
      + 'Nenhum pacote</div>';
    return;
  }

  renderPkgCatTabs();

  var filtered = [];
  for (var i = 0; i < PACKAGES.length; i++) {
    if (pkgState.activePkgCat === 'all'
        || getPkgCategory(PACKAGES[i].name) === pkgState.activePkgCat) {
      filtered.push({ pkg: PACKAGES[i], pi: i });
    }
  }

  var html = '';
  for (var f = 0; f < filtered.length; f++) {
    var pkg  = filtered[f].pkg;
    var pi   = filtered[f].pi;
    var cnt  = pkgState.cartCount[pi] || 0;
    html += buildPkgCardHTML(pkg, pi, pkgState.activePkgIdx === pi, cnt);
  }
  sidebarList.innerHTML = html;

  if (pkgState.activePkgIdx !== null) {
    renderPkgDetail(pkgState.activePkgIdx);
  }
}

function renderPkgDetail(pi) {
  var detail = document.getElementById('pkg-detail');
  if (!detail) return;

  var pkg      = PACKAGES[pi];
  if (!pkg) return;

  var totalRaw  = getPkgTotal(pkg, pi);
  var totalData = totalRaw > 0 ? formatKK(totalRaw) : null;

  var added    = pkgState.cartCount[pi] || 0;
  var allItems = getPkgAllItems(pkg);
  var slots    = pkg.slots || [allItems];
  var hasSlots = slots.length > 1;

  // Slot ativo
  if (pkgState.activeSlotByPkg[pi] === undefined) pkgState.activeSlotByPkg[pi] = 0;
  var si          = Math.min(pkgState.activeSlotByPkg[pi], slots.length - 1);
  var currentSlot = slots[si];

  // Header
  var activeCount = getPkgActiveItems(pkg, pi).length;
  var totalCount  = allItems.length;
  var countLabel  = activeCount < totalCount
    ? activeCount + '/' + totalCount + ' itens ativos · ' + slots.length + ' ' + (slots.length === 1 ? 'slot' : 'slots')
    : totalCount + ' itens · ' + slots.length + ' ' + (slots.length === 1 ? 'slot' : 'slots');

  var headerHTML = '<div class="pkg-detail-header">'
    + '<div class="pkg-detail-title">' + pkg.name + '</div>'
    + '<div class="pkg-detail-meta">'
    +   '<span class="pkg-detail-count">' + countLabel + '</span>'
    +   (totalData ? '<span class="pkg-detail-price">' + totalData.label + ' · ' + totalData.brl + '</span>' : '')
    + '</div>'
    + '</div>';

  var slotTabsHTML = '';
  if (hasSlots) {
    slotTabsHTML = '<div class="pkg-slot-tabs" id="pkg-slot-tabs-' + pi + '">';
    for (var s = 0; s < slots.length; s++) {
      slotTabsHTML += buildSlotTabHTML(pkg, pi, slots[s], s, s === si);
    }
    slotTabsHTML += '</div>';
  }

  var rowsHTML = '';
  for (var r = 0; r < currentSlot.length; r++) {
    rowsHTML += buildItemRowHTML(currentSlot[r][0], currentSlot[r][1], pi, si);
  }

  var addedCls   = added ? ' added' : '';
  var addedLabel = added ? '✓ Adicionado ×' + added : '+ Adicionar ao Carrinho';

  var footerHTML = '<div class="pkg-detail-footer">'
    + '<div class="pkg-detail-total-block">'
    + (totalData
        ? '<span class="pkg-detail-total-label">Total ativo</span>'
          + '<span class="pkg-detail-total-kk">' + totalData.label + '</span>'
          + '<span class="pkg-detail-total-brl">' + totalData.brl + '</span>'
        : '<span class="pkg-detail-total-label" style="color:var(--muted)">preço não definido</span>')
    + '</div>'
    + '<div id="pkgrem-detail-' + pi + '"></div>'
    + '<button class="pkg-detail-add-btn' + addedCls + '"'
    +   ' id="pkgbtn-detail-' + pi + '"'
    +   ' onclick="addPackageToCartDirect(' + pi + ')">'
    +   addedLabel
    + '</button>'
    + '</div>';

  // Injeta tudo de uma vez — sem reflow parcial
  detail.innerHTML = headerHTML + slotTabsHTML
    + '<div class="pkg-detail-body" id="pkg-detail-body-' + pi + '">' + rowsHTML + '</div>'
    + footerHTML;

  // Botão remover se já está no carrinho
  if (added) {
    var remSlot = document.getElementById('pkgrem-detail-' + pi);
    if (remSlot) {
      remSlot.innerHTML = '<button class="pkg-detail-rem-btn"'
        + ' onclick="removePackageFromCart(' + pi + ')"'
        + ' title="Remover do carrinho">✕</button>';
    }
  }
}
