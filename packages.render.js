/**
 * packages.render.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Responsabilidade única: gerar HTML dos componentes da aba de pacotes.
 *
 * Este módulo APENAS constrói strings HTML.
 * Não acessa o DOM diretamente (exceto para injetar no container designado).
 * Não possui lógica de negócio, estados, eventos de compra ou navegação.
 * Não injeta CSS, não usa MutationObserver, não faz polling.
 *
 * Funções exportadas (globais, chamadas pelo app.js):
 *   renderPackages()     — rebui​ld completo da sidebar + revalida detalhe ativo
 *   renderPkgDetail(pi)  — reconstrói o painel de detalhe para o pacote pi
 *   renderPkgCatTabs()   — reconstrói os filtros de categoria
 * ──────────────────────────────────────────────────────────────────────────────
 */

/* ─── Builders de partes do HTML ──────────────────────────────────────────── */

/**
 * Gera o HTML de um card da sidebar.
 * @param {object} pkg     - objeto do pacote
 * @param {number} pi      - índice global em PACKAGES
 * @param {boolean} isActive - está selecionado?
 * @param {number} cartCount - quantas vezes está no carrinho
 * @returns {string}
 */
function buildPkgCardHTML(pkg, pi, isActive, cartCount) {
  const icon     = getPkgIcon(pkg.name);
  const pkgColor = getPkgTypeColor(pkg.name);
  const itemQty  = getPkgAllItems(pkg).length;
  const itemLabel = itemQty === 1 ? 'item' : 'itens';

  const badgeHTML = cartCount
    ? `<div class="pkg-card-cart-badge">✓ ×${cartCount}</div>`
    : '';

  const activeClass  = isActive   ? ' active'     : '';
  const cartClass    = cartCount  ? ' is-in-cart'  : '';

  return `<div class="pkg-sidebar-item${activeClass}${cartClass}"
               onclick="selectPkg(${pi})"
               style="--pkg-color:${pkgColor}">
    ${badgeHTML}
    <div class="pkg-sidebar-item-icon">${icon}</div>
    <div class="pkg-sidebar-item-info">
      <div class="pkg-sidebar-item-name">${pkg.name}</div>
      <div class="pkg-sidebar-item-sub">${itemQty} ${itemLabel}</div>
    </div>
  </div>`;
}

/**
 * Gera o HTML de um botão de tab de slot.
 * @param {object} pkg
 * @param {number} pi
 * @param {Array}  slot     - array de itens do slot
 * @param {number} slotIdx  - índice do slot
 * @param {boolean} isActive
 * @returns {string}
 */
function buildSlotTabHTML(pkg, pi, slot, slotIdx, isActive) {
  const disabledCount = slot.filter(([n]) => isPkgItemDisabled(pi, slotIdx, n)).length;
  const activeCount   = slot.length - disabledCount;

  const slotTotal = slot.reduce((sum, [n, q]) => {
    if (isPkgItemDisabled(pi, slotIdx, n)) return sum;
    const it = getPkgItemData(n);
    return sum + (it && it.price ? it.price * q : 0);
  }, 0);

  const noPriceCount = slot.filter(([n]) => {
    if (isPkgItemDisabled(pi, slotIdx, n)) return false;
    const it = getPkgItemData(n);
    return !it || !it.price;
  }).length;

  const totalData    = slotTotal > 0 ? formatKK(slotTotal) : null;
  const allDisabled  = disabledCount === slot.length;
  const hasNoPrice   = noPriceCount > 0;

  const cls = [
    'pkg-slot-btn',
    isActive   ? 'active'       : '',
    allDisabled ? 'all-disabled' : '',
    hasNoPrice  ? 'has-no-price' : '',
  ].filter(Boolean).join(' ');

  const priceHTML    = totalData  ? `<span class="pkg-slot-btn-price">${totalData.label}</span>` : '';
  const warnHTML     = hasNoPrice ? `<span class="pkg-slot-no-price-warn">⚠ ${noPriceCount} s/preço</span>` : '';

  return `<button class="${cls}" onclick="selectPkgSlot(${pi}, ${slotIdx})">
    <span class="pkg-slot-btn-label">${getSlotLabel(pkg, slotIdx)}</span>
    ${priceHTML}
    <span class="pkg-slot-btn-count">${activeCount}/${slot.length} itens</span>
    ${warnHTML}
  </button>`;
}

/**
 * Gera o HTML de uma linha de item no painel de detalhe.
 * @param {string}  name     - nome do item
 * @param {number}  qty      - quantidade
 * @param {number}  pi       - índice do pacote
 * @param {number}  si       - índice do slot
 * @returns {string}
 */
function buildItemRowHTML(name, qty, pi, si) {
  const disabled  = isPkgItemDisabled(pi, si, name);
  const item      = getPkgItemData(name);
  const lineTotal = (!disabled && item && item.price && qty > 0) ? item.price * qty : 0;
  const priceData = lineTotal > 0 ? formatKK(lineTotal) : null;

  const safeName = name.replace(/'/g, "\\'");

  const priceHTML = disabled
    ? '<span class="row-disabled-label">removido</span>'
    : (priceData ? priceData.label : '—');

  const iconChar = disabled ? '○' : '◆';

  /* Wiki lookup button — preservado exatamente como no original */
  const wikiBtn = `<button class="wiki-lookup-btn"
      onclick="openWikiLookup('${safeName}', event)"
      title="Ver drops na Wiki">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <circle cx="11" cy="11" r="7"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  </button>`;

  const toggleChar = disabled ? '↩' : '✕';

  return `<div class="pkg-detail-row${disabled ? ' row-disabled' : ''}"
              onclick="togglePkgItem(${pi}, ${si}, '${safeName}')">
    <div class="pkg-detail-row-icon">${iconChar}</div>
    <span class="pkg-detail-row-name">${name}${wikiBtn}</span>
    <div class="pkg-detail-row-right">
      <span class="pkg-detail-row-price">${priceHTML}</span>
      <span class="pkg-detail-row-qty">×${qty.toLocaleString()}</span>
      <span class="pkg-row-toggle-btn">${toggleChar}</span>
    </div>
  </div>`;
}

/* ─── Funções de render públicas ──────────────────────────────────────────── */

/**
 * Reconstrói os filtros de categoria.
 * Preserva lógica original: detecta categorias presentes nos dados.
 */
function renderPkgCatTabs() {
  const el = document.getElementById('pkg-cat-tabs');
  if (!el) return;

  const cats = ['all', ...new Set(PACKAGES.map(p => getPkgCategory(p.name)))];

  el.innerHTML = cats.map(cat => {
    const count = cat === 'all'
      ? PACKAGES.length
      : PACKAGES.filter(p => getPkgCategory(p.name) === cat).length;

    const meta = PKG_CAT_META[cat] || { label: cat, icon: '📌' };

    const activeClass = activePkgCat === cat ? ' active' : '';

    return `<button class="pkg-cat-btn${activeClass}" onclick="selectPkgCat('${cat}')">
      <span class="pkg-cat-icon">${meta.icon}</span>
      ${meta.label}
      <span class="pkg-cat-count">${count}</span>
    </button>`;
  }).join('');
}

/**
 * Reconstrói a lista de cards na sidebar.
 * Chama renderPkgDetail se houver pacote ativo.
 */
function renderPackages() {
  const sidebarList = document.getElementById('pkg-sidebar-list');
  if (!sidebarList) return;

  renderPkgCatTabs();

  if (!PACKAGES.length) {
    sidebarList.innerHTML = `<div style="grid-column:1/-1;padding:20px;text-align:center;
      font-family:var(--font-mono);font-size:11px;color:var(--muted)">
      Nenhum pacote
    </div>`;
    return;
  }

  const filtered = PACKAGES
    .map((pkg, pi) => ({ pkg, pi }))
    .filter(({ pkg }) =>
      activePkgCat === 'all' || getPkgCategory(pkg.name) === activePkgCat
    );

  sidebarList.innerHTML = filtered.map(({ pkg, pi }) =>
    buildPkgCardHTML(
      pkg,
      pi,
      activePkgIdx === pi,
      pkgCartCount && pkgCartCount[pi] ? pkgCartCount[pi] : 0
    )
  ).join('');

  if (activePkgIdx !== null) renderPkgDetail(activePkgIdx);
}

/**
 * Reconstrói o painel de detalhe para o pacote pi.
 * Preserva toda a lógica original: slots, itens toggleáveis, preços, footer.
 *
 * @param {number} pi - índice do pacote em PACKAGES
 */
function renderPkgDetail(pi) {
  const detail = document.getElementById('pkg-detail');
  if (!detail) return;

  const pkg      = PACKAGES[pi];
  const totalRaw = getPkgTotal(pkg, pi);
  const totalData = totalRaw > 0 ? formatKK(totalRaw) : null;

  const added     = pkgCartCount && pkgCartCount[pi] ? pkgCartCount[pi] : 0;
  const allItems  = getPkgAllItems(pkg);
  const slots     = pkg.slots || [allItems];
  const hasSlots  = slots.length > 1;

  /* Slot ativo */
  if (activeSlotByPkg[pi] === undefined) activeSlotByPkg[pi] = 0;
  const si          = Math.min(activeSlotByPkg[pi], slots.length - 1);
  const currentSlot = slots[si];

  /* Contagem para o header */
  const activeCount  = getPkgActiveItems(pkg, pi).length;
  const totalCount   = allItems.length;
  const countLabel   = activeCount < totalCount
    ? `${activeCount}/${totalCount} itens ativos · ${slots.length} ${slots.length === 1 ? 'slot' : 'slots'}`
    : `${totalCount} itens · ${slots.length} ${slots.length === 1 ? 'slot' : 'slots'}`;

  /* ── HTML das partes ── */
  const headerHTML = `
    <div class="pkg-detail-header">
      <div class="pkg-detail-title">${pkg.name}</div>
      <div class="pkg-detail-meta">
        <span class="pkg-detail-count">${countLabel}</span>
        ${totalData ? `<span class="pkg-detail-price">${totalData.label} · ${totalData.brl}</span>` : ''}
      </div>
    </div>`;

  const slotTabsHTML = hasSlots ? `
    <div class="pkg-slot-tabs" id="pkg-slot-tabs-${pi}">
      ${slots.map((slot, idx) => buildSlotTabHTML(pkg, pi, slot, idx, idx === si)).join('')}
    </div>` : '';

  const rowsHTML = currentSlot
    .map(([name, qty]) => buildItemRowHTML(name, qty, pi, si))
    .join('');

  const addedClass = added ? ' added' : '';
  const addedLabel = added ? `✓ Adicionado ×${added}` : '+ Adicionar ao Carrinho';

  const footerHTML = `
    <div class="pkg-detail-footer">
      <div class="pkg-detail-total-block">
        ${totalData ? `
          <span class="pkg-detail-total-label">Total ativo</span>
          <span class="pkg-detail-total-kk">${totalData.label}</span>
          <span class="pkg-detail-total-brl">${totalData.brl}</span>
        ` : '<span class="pkg-detail-total-label" style="color:var(--muted)">preço não definido</span>'}
      </div>
      <div id="pkgrem-detail-${pi}"></div>
      <button class="pkg-detail-add-btn${addedClass}"
              id="pkgbtn-detail-${pi}"
              onclick="addPackageToCartDirect(${pi})">
        ${addedLabel}
      </button>
    </div>`;

  /* ── Monta tudo de uma vez (evita reflow parcial) ── */
  detail.innerHTML = headerHTML + slotTabsHTML
    + `<div class="pkg-detail-body" id="pkg-detail-body-${pi}">${rowsHTML}</div>`
    + footerHTML;

  /* Injeta botão remover se no carrinho */
  if (added) {
    const remSlot = document.getElementById(`pkgrem-detail-${pi}`);
    if (remSlot) {
      remSlot.innerHTML = `<button class="pkg-detail-rem-btn"
          onclick="removePackageFromCart(${pi})"
          title="Remover do carrinho">✕</button>`;
    }
  }
}
