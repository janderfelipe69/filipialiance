/**
 * packages.render.js  v2 — MMORPG Premium Redesign
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsabilidade única: construir e injetar HTML da aba de pacotes.
 *
 * Mudanças v2:
 *   • buildPkgCardHTML      — sidebar compacta 2-col com glow por tipo
 *   • buildHeroHeaderHTML   — hero banner cinematográfico por pacote
 *   • buildSlotTabHTML      — build-system visual com tier indicator
 *   • buildItemRowHTML      — reward cards com sprite + qty destacada
 *   • renderEmptyState      — featured packages ao invés de estado vazio
 *   • renderPkgDetail       — orquestra tudo acima
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS LOCAIS
   ═══════════════════════════════════════════════════════════════════════════ */

function _pkgCategoryColor(name) {
  var n = (name || '').toLowerCase();
  if (n.startsWith('gym'))                               return '#ffd166';
  if (n.startsWith('talent'))                            return '#c084fc';
  if (n.startsWith('full'))                              return '#38bdf8';
  if (n.startsWith('reduces') || n.startsWith('reduce')) return '#fb923c';
  // fallback to type-based color from logic.js
  return getPkgTypeColor(name);
}

function _pkgCategoryLabel(name) {
  var n = (name || '').toLowerCase();
  if (n.startsWith('gym'))                               return 'Gym';
  if (n.startsWith('talent'))                            return 'Talents';
  if (n.startsWith('full'))                              return 'Full Pack';
  if (n.startsWith('reduces') || n.startsWith('reduce')) return 'Reduces';
  return 'Special';
}

/* ═══════════════════════════════════════════════════════════════════════════
   BUILDERS DE HTML
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Card compacto para a sidebar (grid 2 colunas).
 * Visual: ícone centralizado, nome pequeno, badge de qty.
 */
function buildPkgCardHTML(pkg, pi, isActive, cartCount) {
  var icon = pkg.icon_url
    ? '<img src="' + pkg.icon_url + '" style="width:32px;height:32px;object-fit:contain" />'
    : getPkgIcon(pkg.name);
  var color    = _pkgCategoryColor(pkg.name);
  var allItems = getPkgAllItems(pkg);
  var itemQty  = allItems.length;

  var badgeHTML = cartCount
    ? '<div class="pkg-card-cart-badge">✓ ×' + cartCount + '</div>'
    : '';

  var cls = 'pkg-sidebar-item'
    + (isActive  ? ' active'     : '')
    + (cartCount ? ' is-in-cart' : '');

  return '<div class="' + cls + '"'
    + ' onclick="selectPkg(' + pi + ')"'
    + ' style="--pkg-color:' + color + '">'
    + badgeHTML
    + '<div class="pkg-sidebar-item-icon">' + icon + '</div>'
    + '<div class="pkg-sidebar-item-info">'
    +   '<div class="pkg-sidebar-item-name">' + pkg.name + '</div>'
    +   '<div class="pkg-sidebar-item-sub">' + itemQty + ' itens</div>'
    + '</div>'
    + '</div>';
}

/**
 * Hero header premium — estrutura 3 colunas: ÍCONE | INFO + SLOTS | BUY PANEL
 * Estilo: Destiny 2 × Steam featured bundle × Diablo inventory
 */
function buildHeroHeaderHTML(pkg, pi) {
  var icon = pkg.icon_url
    ? '<img src="' + pkg.icon_url + '" style="width:38px;height:38px;object-fit:contain" />'
    : getPkgIcon(pkg.name);
  var color     = _pkgCategoryColor(pkg.name);
  var catLabel  = _pkgCategoryLabel(pkg.name);
  var allItems  = getPkgAllItems(pkg);
  var totalRaw  = getPkgTotal(pkg, pi);
  var totalData = totalRaw > 0 ? formatKK(totalRaw) : null;
  var slots     = pkg.slots || [allItems];
  var added     = pkgState.cartCount[pi] || 0;

  // Heurística "Best Value": pacotes Full ou com muitos itens
  var n = (pkg.name || '').toLowerCase();
  var isBestValue = n.startsWith('full') || allItems.length >= 8;

  // Tier baseado na quantidade de slots
  var tierLabel = slots.length >= 3 ? 'LEGENDARY' : slots.length === 2 ? 'RARE' : 'STANDARD';
  var tierClass = slots.length >= 3 ? 'tier-legendary' : slots.length === 2 ? 'tier-rare' : 'tier-standard';

  // ── COLUNA ESQUERDA: ícone + badge ──
  var leftHTML = '<div class="pkg-hero-left">'
    + '<div class="pkg-hero-icon-wrap">'
    +   '<div class="pkg-hero-icon-glow"></div>'
    +   '<div class="pkg-hero-icon-frame">' + icon + '</div>'
    + '</div>'
    + '<div class="pkg-hero-cat-badge">' + catLabel + '</div>'
    + '</div>';

  // ── COLUNA CENTRAL: nome + metadata + preview stack ──
  // Preview dos primeiros itens
  var previewItems = allItems.slice(0, 3);
  var overflowCount = allItems.length - previewItems.length;
  var previewHTML = '';
  for (var p = 0; p < previewItems.length; p++) {
    var it = getPkgItemData(previewItems[p][0]);
    var thumb = it && it.img
      ? '<img src="' + it.img + '" alt="' + previewItems[p][0] + '" />'
      : '<span class="pkg-preview-char">◆</span>';
    previewHTML += '<div class="pkg-preview-thumb" title="' + previewItems[p][0] + '">' + thumb + '</div>';
  }
  if (overflowCount > 0) {
    previewHTML += '<div class="pkg-preview-more">+' + overflowCount + '</div>';
  }

  var centerHTML = '<div class="pkg-hero-center">'
    + '<div class="pkg-hero-tier ' + tierClass + '">' + tierLabel + '</div>'
    + '<div class="pkg-detail-title">' + pkg.name + '</div>'
    + '<div class="pkg-hero-meta">'
    +   '<span class="pkg-meta-chip"><span class="pkg-meta-val">' + allItems.length + '</span> itens</span>'
    +   '<span class="pkg-meta-sep">·</span>'
    +   '<span class="pkg-meta-chip"><span class="pkg-meta-val">' + slots.length + '</span> slot' + (slots.length > 1 ? 's' : '') + '</span>'
    +   (isBestValue ? '<span class="pkg-meta-sep">·</span><span class="pkg-meta-chip pkg-meta-best">⭐ Best Value</span>' : '')
    + '</div>'
    + '<div class="pkg-hero-preview-row">'
    +   previewHTML
    + '</div>'
    + '</div>';

  // ── COLUNA DIREITA: buy panel ──
  var addedCls   = added ? ' added' : '';
  var addedLabel = added ? '✓ No Carrinho ×' + added : '+ Adicionar ao Carrinho';

  var buyPanelHTML = '<div class="pkg-hero-buy-panel" id="pkg-buy-panel-' + pi + '">'
    + '<div class="pkg-buy-panel-inner">';

  if (totalData) {
    buyPanelHTML += '<div class="pkg-buy-price-block">'
      + '<div class="pkg-buy-price-kk">' + totalData.label + '</div>'
      + '<div class="pkg-buy-price-brl">' + totalData.brl + '</div>'
      + (totalRaw > 0 ? '<div class="pkg-buy-price-dd">' + Math.round(totalRaw / 1000000 * (typeof KK_TO_BRL !== 'undefined' ? KK_TO_BRL : 1.70) / ((window.APP_CONFIG && window.APP_CONFIG.dd_to_brl) || 0.70)).toLocaleString('pt-BR') + ' DD</div>' : '')
      + '</div>';
  } else {
    buyPanelHTML += '<div class="pkg-buy-price-block">'
      + '<div class="pkg-buy-price-na">Preço sob consulta</div>'
      + '</div>';
  }

  buyPanelHTML += '<div class="pkg-buy-actions">'
    + '<button class="pkg-buy-cta' + addedCls + '"'
    +   ' id="pkgbtn-detail-' + pi + '"'
    +   ' onclick="addPackageToCartDirect(' + pi + ')">'
    +   addedLabel
    + '</button>'
    + '<div class="pkg-buy-secondary-row">'
    +   '<div id="pkgrem-detail-' + pi + '"></div>'
    + '</div>'
    + '</div>'
    + '</div>'
    + '</div>';

  return '<div class="pkg-detail-hero" style="--pkg-color:' + color + '">'
    + '<div class="pkg-detail-hero-inner">'
    +   leftHTML
    +   centerHTML
    +   buyPanelHTML
    + '</div>'
    + '</div>';
}

/**
 * Botão de slot no estilo build-system com tier indicator.
 */
function buildSlotTabHTML(pkg, pi, slot, slotIdx, isActive) {
  var disabledCount = 0;
  var slotTotal     = 0;
  var noPriceCount  = 0;
  var color         = _pkgCategoryColor(pkg.name);

  for (var i = 0; i < slot.length; i++) {
    var n = slot[i][0], q = slot[i][1];
    if (isPkgItemDisabled(pi, slotIdx, n)) { disabledCount++; continue; }
    var it = getPkgItemData(n);
    if (it && it.price !== null && it.price > 0) slotTotal += it.price * q;
    else if (!it || it.price === null) noPriceCount++;
    // price === 0: craftable/free item, not counted as no-price
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
    + ' style="--pkg-color:' + color + '"'
    + ' onclick="selectPkgSlot(' + pi + ', ' + slotIdx + ')">'
    +   '<span class="pkg-slot-btn-tier">' + (slotIdx + 1) + '</span>'
    +   '<span class="pkg-slot-btn-text">'
    +     '<span class="pkg-slot-btn-label">' + getSlotLabel(pkg, slotIdx) + '</span>'
    +     priceHTML
    +     '<span class="pkg-slot-btn-count">' + activeCount + '/' + slot.length + ' itens</span>'
    +     warnHTML
    +   '</span>'
    + '</button>';
}

/**
 * Reward card de item — horizontal, com sprite, nome forte e qty destacada.
 */
function buildItemRowHTML(name, qty, pi, si) {
  var disabled  = isPkgItemDisabled(pi, si, name);
  var item      = getPkgItemData(name);
  var lineTotal = (!disabled && item && item.price !== null && item.price > 0 && qty > 0) ? item.price * qty : 0;
  var priceData = lineTotal > 0 ? formatKK(lineTotal) : null;
  var safeName  = name.replace(/'/g, "\\'");

  // Tenta obter sprite do item se disponível
  var spriteHTML;
  if (item && item.img) {
    spriteHTML = '<img src="' + item.img + '" alt="' + name + '" />';
  } else {
    spriteHTML = '<span class="pkg-detail-row-icon-char">◆</span>';
  }

  var priceHTML = disabled
    ? '<span class="row-disabled-label">removido</span>'
    : (priceData ? priceData.label : '—');

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
    +   '<div class="pkg-detail-row-icon">' + spriteHTML + '</div>'
    +   '<span class="pkg-detail-row-name">' + name + wikiBtn + '</span>'
    +   '<div class="pkg-detail-row-right">'
    +     '<span class="pkg-detail-row-price">' + priceHTML + '</span>'
    +     '<span class="pkg-detail-row-qty">×' + qty.toLocaleString() + '</span>'
    +     '<span class="pkg-row-toggle-btn">' + toggleChar + '</span>'
    +   '</div>'
    + '</div>';
}

/**
 * Estado vazio — mostra featured packages ao invés de tela em branco.
 */
function buildEmptyStateHTML() {
  // Pega até 6 pacotes para mostrar como featured
  var featured = [];
  var limit = Math.min(PACKAGES.length, 6);
  for (var i = 0; i < limit; i++) {
    featured.push({ pkg: PACKAGES[i], pi: i });
  }

  var cardsHTML = '';
  for (var f = 0; f < featured.length; f++) {
    var pkg   = featured[f].pkg;
    var pi    = featured[f].pi;
    var icon  = getPkgIcon(pkg.name);
    var color = _pkgCategoryColor(pkg.name);
    var items = getPkgAllItems(pkg);

    var totalRaw  = getPkgTotal(pkg, pi);
    var totalData = totalRaw > 0 ? formatKK(totalRaw) : null;
    var priceStr  = totalData ? totalData.label : '—';

    cardsHTML += '<div class="pkg-empty-card"'
      + ' style="--pkg-color:' + color + '"'
      + ' onclick="selectPkg(' + pi + ')">'
      +   '<div class="pkg-empty-card-icon">' + icon + '</div>'
      +   '<div class="pkg-empty-card-name">' + pkg.name + '</div>'
      +   '<div class="pkg-empty-card-sub">' + priceStr + ' · ' + items.length + ' itens</div>'
      + '</div>';
  }

  return '<div class="pkg-detail-empty">'
    + '<div class="pkg-empty-featured-title">Pacotes Disponíveis</div>'
    + '<div class="pkg-empty-grid">' + cardsHTML + '</div>'
    + '<div class="pkg-empty-hint">Selecione um pacote para ver os detalhes</div>'
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
    var meta      = PKG_CAT_META[cat] || { label: cat, icon: '📌' };
    var activeCls = pkgState.activePkgCat === cat ? ' active' : '';
    html += '<button class="pkg-cat-btn' + activeCls + '" data-cat="' + cat + '"'
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
    var pkg = filtered[f].pkg;
    var pi  = filtered[f].pi;
    var cnt = pkgState.cartCount[pi] || 0;
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

  // Estado vazio — mostrar featured packages
  if (pi === null || pi === undefined) {
    detail.innerHTML = buildEmptyStateHTML();
    return;
  }

  var pkg = PACKAGES[pi];
  if (!pkg) return;

  var color    = _pkgCategoryColor(pkg.name);
  var totalRaw = getPkgTotal(pkg, pi);
  var totalData = totalRaw > 0 ? formatKK(totalRaw) : null;
  var added    = pkgState.cartCount[pi] || 0;
  var allItems = getPkgAllItems(pkg);
  var slots    = pkg.slots || [allItems];
  var hasSlots = slots.length > 1;

  // Slot ativo
  if (pkgState.activeSlotByPkg[pi] === undefined) pkgState.activeSlotByPkg[pi] = 0;
  var si          = Math.min(pkgState.activeSlotByPkg[pi], slots.length - 1);
  var currentSlot = slots[si];

  // ── Hero header ──
  var heroHTML = buildHeroHeaderHTML(pkg, pi);

  // ── Slot tabs (build system) ──
  var slotTabsHTML = '';
  if (hasSlots) {
    var tabsInner = '';
    for (var s = 0; s < slots.length; s++) {
      if (s > 0) tabsInner += '<div class="pkg-slot-connector"></div>';
      tabsInner += buildSlotTabHTML(pkg, pi, slots[s], s, s === si);
    }
    slotTabsHTML = '<div class="pkg-slot-tabs" style="--pkg-color:' + color + '">'
      + '<div class="pkg-slot-tabs-label">Build Slots</div>'
      + '<div class="pkg-slot-tabs-row">' + tabsInner + '</div>'
      + '</div>';
  }

  // ── Reward cards ──
  var rowsHTML = '';
  for (var r = 0; r < currentSlot.length; r++) {
    rowsHTML += buildItemRowHTML(currentSlot[r][0], currentSlot[r][1], pi, si);
  }

  // ── Footer ──
  // O botão de carrinho agora fica no buy panel do hero.
  // Mantemos o footer apenas para compatibilidade com o botão remover inline.
  var footerHTML = '';

  // Injeta tudo de uma vez — sem reflow parcial
  detail.innerHTML = heroHTML + slotTabsHTML
    + '<div class="pkg-detail-body" id="pkg-detail-body-' + pi + '" style="--pkg-color:' + color + '">'
    + rowsHTML
    + '</div>'
    + footerHTML;

  // Botão remover se já está no carrinho — injeta no slot do buy panel
  if (added) {
    var remSlot = document.getElementById('pkgrem-detail-' + pi);
    if (remSlot) {
      remSlot.innerHTML = '<button class="pkg-detail-rem-btn"'
        + ' onclick="removePackageFromCart(' + pi + ')"'
        + ' title="Remover do carrinho">✕ Remover</button>';
    }
  }
}
