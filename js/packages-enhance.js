/**
 * PACKAGES VISUAL ENHANCEMENT — AAA Premium Layer
 * ─────────────────────────────────────────────────────────────────────
 * REGRAS: Não altera PACKAGES, renderPackages, renderPkgDetail, selectPkg.
 * Apenas sobrescreve CSS e adiciona micro-enhancements via MutationObserver.
 * Todos os IDs e classes originais são preservados.
 * ─────────────────────────────────────────────────────────────────────
 */

(function PkgEnhance() {
  'use strict';

  // ─── 1. CSS PREMIUM INJECTION ─────────────────────────────────────────────
  const STYLE_ID = 'pkg-enhance-css';
  if (document.getElementById(STYLE_ID)) return; // idempotent

  const css = `
/* ==========================================================================
   PACKAGES VISUAL ENHANCEMENT — Pure CSS override layer
   ========================================================================== */

/* ── Category pills upgrade ───────────────────────────────────────────────── */
.pkg-cat-tabs {
  padding: 14px 20px 12px !important;
  background: rgba(4,6,14,0.98) !important;
  border-bottom: 1px solid rgba(255,255,255,0.05) !important;
  gap: 7px !important;
}

.pkg-cat-btn {
  padding: 7px 16px !important;
  border-radius: 22px !important;
  font-size: 11px !important;
  font-family: var(--font-title) !important;
  letter-spacing: 1px !important;
  font-weight: 700 !important;
  border: 1px solid rgba(255,255,255,0.07) !important;
  background: rgba(255,255,255,0.04) !important;
  color: rgba(255,255,255,0.4) !important;
  transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1) !important;
  text-transform: uppercase !important;
}

.pkg-cat-btn:hover {
  background: rgba(58,140,255,0.12) !important;
  color: rgba(255,255,255,0.85) !important;
  border-color: rgba(58,140,255,0.35) !important;
  transform: translateY(-1px) !important;
}

.pkg-cat-btn.active {
  background: linear-gradient(135deg, rgba(58,140,255,0.22), rgba(100,80,255,0.16)) !important;
  border-color: rgba(58,140,255,0.65) !important;
  color: #fff !important;
  box-shadow: 0 0 16px rgba(58,140,255,0.28), 0 2px 10px rgba(0,0,0,0.3) !important;
  transform: translateY(-1px) !important;
}

.pkg-cat-count {
  font-family: var(--font-mono) !important;
  font-size: 9px !important;
  background: rgba(255,255,255,0.06) !important;
  border-radius: 10px !important;
  padding: 1px 6px !important;
  color: rgba(255,255,255,0.3) !important;
}

.pkg-cat-btn.active .pkg-cat-count {
  background: rgba(58,140,255,0.3) !important;
  color: #7dd3fc !important;
}

/* ── Sidebar panel upgrade ──────────────────────────────────────────────────  */
.pkg-sidebar {
  width: 270px !important;
  background: linear-gradient(180deg, rgba(8,12,24,0.99) 0%, rgba(5,8,18,1) 100%) !important;
  border-right: 1px solid rgba(255,255,255,0.06) !important;
}

.pkg-sidebar-header {
  padding: 14px 16px 12px !important;
  background: rgba(58,140,255,0.05) !important;
  border-bottom: 1px solid rgba(58,140,255,0.1) !important;
}

.pkg-sidebar-title {
  font-size: 10px !important;
  letter-spacing: 3px !important;
  color: rgba(120,180,255,0.7) !important;
}

.pkg-sidebar-list {
  padding: 12px 10px !important;
  gap: 9px !important;
}

/* ── Package card (sidebar-item) — full premium rebuild ─────────────────────  */
.pkg-sidebar-item {
  position: relative !important;
  border-radius: 13px !important;
  padding: 14px 10px 12px !important;
  gap: 8px !important;
  background: linear-gradient(145deg, rgba(14,20,40,0.95), rgba(8,12,24,0.98)) !important;
  border: 1px solid rgba(255,255,255,0.07) !important;
  border-color: var(--pkg-color, rgba(58,140,255,0.15)) !important;
  transition: transform 0.26s cubic-bezier(0.34,1.56,0.64,1),
              box-shadow 0.26s ease,
              border-color 0.2s ease,
              background 0.2s ease !important;
  overflow: hidden !important;
}

/* Subtle top accent strip */
.pkg-sidebar-item::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--pkg-color, rgba(58,140,255,0.6)), transparent);
  opacity: 0.5;
  transition: opacity 0.2s;
}

.pkg-sidebar-item:hover::before { opacity: 1; }

/* Background glow blob */
.pkg-sidebar-item::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 120%, var(--pkg-color, rgba(58,140,255,0.12)) 0%, transparent 65%);
  opacity: 0;
  transition: opacity 0.25s;
  pointer-events: none;
}
.pkg-sidebar-item:hover::after { opacity: 1; }
.pkg-sidebar-item.active::after { opacity: 1.5; }

.pkg-sidebar-item:hover {
  transform: translateY(-3px) scale(1.015) !important;
  box-shadow: 0 8px 28px rgba(0,0,0,0.5), 0 0 0 1px var(--pkg-color, rgba(58,140,255,0.25)), 0 0 20px var(--pkg-color, rgba(58,140,255,0.12)) !important;
  border-color: var(--pkg-color, rgba(58,140,255,0.4)) !important;
}

.pkg-sidebar-item.active {
  background: linear-gradient(145deg, rgba(18,26,52,0.98), rgba(10,16,36,1)) !important;
  border-color: var(--pkg-color, rgba(58,140,255,0.7)) !important;
  box-shadow: 0 0 0 1px var(--pkg-color, rgba(58,140,255,0.3)), 0 6px 24px rgba(0,0,0,0.5), 0 0 28px var(--pkg-color, rgba(58,140,255,0.18)) !important;
  transform: translateY(-2px) !important;
}

.pkg-sidebar-item.active .pkg-sidebar-item-name {
  color: #fff !important;
  text-shadow: 0 0 12px var(--pkg-color, rgba(58,140,255,0.6)) !important;
}

/* Cart glow animation */
.pkg-sidebar-item.is-in-cart {
  border-color: var(--pkg-color, rgba(58,140,255,0.7)) !important;
  animation: pkgEnhCartGlow 2.2s ease-in-out infinite alternate !important;
}
@keyframes pkgEnhCartGlow {
  0%   { box-shadow: 0 0 8px var(--pkg-color, rgba(58,140,255,0.3)), 0 2px 12px rgba(0,0,0,0.4); }
  100% { box-shadow: 0 0 22px var(--pkg-color, rgba(58,140,255,0.6)), 0 0 40px var(--pkg-color, rgba(58,140,255,0.2)), 0 4px 18px rgba(0,0,0,0.5); }
}

/* ── Icon box upgrade ──────────────────────────────────────────────────────── */
.pkg-sidebar-item-icon {
  width: 46px !important;
  height: 46px !important;
  border-radius: 12px !important;
  font-size: 24px !important;
  background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)) !important;
  border: 1px solid rgba(255,255,255,0.09) !important;
  backdrop-filter: blur(4px);
  transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), background 0.2s !important;
  position: relative;
  z-index: 1;
}

.pkg-sidebar-item:hover .pkg-sidebar-item-icon {
  transform: scale(1.1) rotate(-3deg) !important;
  background: rgba(255,255,255,0.09) !important;
}

.pkg-sidebar-item.active .pkg-sidebar-item-icon {
  background: linear-gradient(135deg, rgba(58,140,255,0.18), rgba(58,140,255,0.08)) !important;
  border-color: rgba(58,140,255,0.35) !important;
}

/* ── Item name + sub ──────────────────────────────────────────────────────── */
.pkg-sidebar-item-name {
  font-family: var(--font-title) !important;
  font-size: 10px !important;
  letter-spacing: 0.8px !important;
  font-weight: 800 !important;
  color: rgba(255,255,255,0.82) !important;
  text-transform: uppercase !important;
  position: relative;
  z-index: 1;
}

.pkg-sidebar-item-sub {
  font-family: var(--font-mono) !important;
  font-size: 9px !important;
  color: rgba(255,255,255,0.28) !important;
  letter-spacing: 0.5px !important;
  position: relative;
  z-index: 1;
}

/* ── Cart badge ───────────────────────────────────────────────────────────── */
.pkg-card-cart-badge {
  position: absolute !important;
  top: 6px !important;
  right: 6px !important;
  background: linear-gradient(135deg, rgba(37,200,100,0.9), rgba(20,160,70,0.9)) !important;
  color: #fff !important;
  font-family: var(--font-title) !important;
  font-size: 7px !important;
  font-weight: 900 !important;
  letter-spacing: 0.5px !important;
  border-radius: 8px !important;
  padding: 2px 6px !important;
  display: block !important;
  opacity: 1 !important;
  box-shadow: 0 0 8px rgba(37,200,100,0.5) !important;
  z-index: 4;
}

/* ── Detail panel upgrade ─────────────────────────────────────────────────── */
.pkg-detail {
  background: linear-gradient(180deg, rgba(7,11,22,0.99) 0%, rgba(5,8,17,1) 100%) !important;
}

.pkg-detail-header {
  padding: 18px 26px 16px !important;
  background: rgba(8,12,24,0.9) !important;
  border-bottom: 1px solid rgba(255,255,255,0.05) !important;
  position: relative;
  overflow: hidden;
}

/* Ambient glow on header */
.pkg-detail-header::before {
  content: '';
  position: absolute;
  top: -40px; left: 0; right: 0;
  height: 80px;
  background: radial-gradient(ellipse at 30% 50%, rgba(58,140,255,0.06) 0%, transparent 60%);
  pointer-events: none;
}

.pkg-detail-title {
  font-size: 16px !important;
  letter-spacing: 2.5px !important;
  font-weight: 900 !important;
  background: linear-gradient(135deg, #fff 0%, rgba(120,180,255,0.95) 50%, rgba(200,160,255,0.8) 100%) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
  position: relative;
}

.pkg-detail-count {
  font-size: 10px !important;
  color: rgba(255,255,255,0.28) !important;
  letter-spacing: 1px !important;
}

.pkg-detail-price {
  font-size: 12px !important;
  font-weight: 800 !important;
  color: #fde68a !important;
  text-shadow: 0 0 12px rgba(253,230,138,0.4) !important;
}

/* ── Slot tabs upgrade ──────────────────────────────────────────────────────  */
.pkg-slot-tabs {
  padding: 12px 22px 0 !important;
  gap: 7px !important;
  background: rgba(4,6,14,0.6) !important;
  border-bottom: 1px solid rgba(255,255,255,0.05) !important;
}

.pkg-slot-btn {
  padding: 9px 16px 8px !important;
  border-radius: 9px 9px 0 0 !important;
  border: 1px solid rgba(255,255,255,0.07) !important;
  border-bottom: none !important;
  background: rgba(255,255,255,0.03) !important;
  transition: all 0.18s !important;
  position: relative;
  bottom: -1px !important;
}

.pkg-slot-btn:hover {
  background: rgba(58,140,255,0.1) !important;
  border-color: rgba(58,140,255,0.3) !important;
}

.pkg-slot-btn.active {
  background: rgba(12,18,36,0.99) !important;
  border-color: rgba(58,140,255,0.45) !important;
  border-bottom: 1px solid rgba(12,18,36,0.99) !important;
  box-shadow: 0 -3px 12px rgba(58,140,255,0.12) !important;
}

.pkg-slot-btn-label {
  font-family: var(--font-title) !important;
  font-size: 9px !important;
  font-weight: 800 !important;
  letter-spacing: 1.5px !important;
  color: rgba(255,255,255,0.32) !important;
}
.pkg-slot-btn.active .pkg-slot-btn-label {
  color: #93c5fd !important;
}

.pkg-slot-btn-price {
  font-size: 11px !important;
  font-weight: 800 !important;
  color: #fde68a !important;
  font-family: var(--font-mono) !important;
}

/* ── Detail rows upgrade ────────────────────────────────────────────────────  */
.pkg-detail-body {
  padding: 6px 0 !important;
}

.pkg-detail-row {
  padding: 9px 26px !important;
  gap: 14px !important;
  border-bottom: 1px solid rgba(255,255,255,0.025) !important;
  transition: background 0.14s ease !important;
  position: relative;
}

.pkg-detail-row:hover {
  background: rgba(58,140,255,0.06) !important;
}

.pkg-detail-row:hover::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 2px;
  background: rgba(58,140,255,0.5);
  border-radius: 0 1px 1px 0;
}

.pkg-detail-row-icon {
  width: 30px !important;
  height: 30px !important;
  border-radius: 8px !important;
  font-size: 13px !important;
  background: rgba(255,60,60,0.1) !important;
  border: 1px solid rgba(255,60,60,0.2) !important;
  flex-shrink: 0 !important;
}

.pkg-detail-row.row-disabled .pkg-detail-row-icon {
  background: rgba(255,255,255,0.03) !important;
  border-color: rgba(255,255,255,0.08) !important;
}

.pkg-detail-row-name {
  font-size: 12px !important;
  font-family: var(--font-body) !important;
  font-weight: 600 !important;
  color: rgba(255,255,255,0.85) !important;
}

.pkg-detail-row.row-disabled .pkg-detail-row-name {
  color: rgba(255,255,255,0.28) !important;
}

.pkg-detail-row-price {
  font-size: 11px !important;
  font-weight: 700 !important;
  color: #fde68a !important;
  font-family: var(--font-mono) !important;
  min-width: 64px !important;
}

.pkg-detail-row-qty {
  border-radius: 7px !important;
  padding: 3px 10px !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  background: rgba(58,140,255,0.08) !important;
  border: 1px solid rgba(58,140,255,0.18) !important;
  color: #93c5fd !important;
  min-width: 46px !important;
  font-family: var(--font-mono) !important;
}

.pkg-row-toggle-btn {
  font-size: 10px !important;
  width: 22px !important;
  height: 22px !important;
  border-radius: 5px !important;
  transition: all 0.15s !important;
}

.pkg-detail-row.row-disabled {
  opacity: 0.35 !important;
  filter: grayscale(0.8) !important;
  background: rgba(255,0,0,0.02) !important;
  border-left: 2px solid rgba(255,80,80,0.2) !important;
}

/* ── Footer / Add button upgrade ────────────────────────────────────────────  */
.pkg-detail-footer {
  padding: 16px 26px !important;
  background: rgba(4,6,14,0.92) !important;
  border-top: 1px solid rgba(255,255,255,0.05) !important;
  backdrop-filter: blur(10px);
}

.pkg-detail-total-label {
  font-size: 8px !important;
  letter-spacing: 2px !important;
  color: rgba(255,255,255,0.25) !important;
  text-transform: uppercase !important;
  font-family: var(--font-mono) !important;
}

.pkg-detail-total-kk {
  font-size: 18px !important;
  font-weight: 900 !important;
  color: #93c5fd !important;
  font-family: var(--font-mono) !important;
  letter-spacing: 1px !important;
  text-shadow: 0 0 14px rgba(147,197,253,0.35) !important;
}

.pkg-detail-total-brl {
  font-size: 10px !important;
  color: #fde68a !important;
  font-family: var(--font-mono) !important;
}

.pkg-detail-add-btn {
  background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
  border-radius: 10px !important;
  font-family: var(--font-title) !important;
  font-size: 9px !important;
  letter-spacing: 2px !important;
  padding: 12px 22px !important;
  box-shadow: 0 4px 20px rgba(37,99,235,0.4), 0 0 0 1px rgba(37,99,235,0.3) !important;
  transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1) !important;
  white-space: nowrap !important;
}

.pkg-detail-add-btn:hover {
  transform: translateY(-2px) scale(1.02) !important;
  box-shadow: 0 8px 28px rgba(37,99,235,0.55), 0 0 0 1px rgba(37,99,235,0.4) !important;
}

.pkg-detail-add-btn.added {
  background: linear-gradient(135deg, #16a34a, #15803d) !important;
  box-shadow: 0 4px 18px rgba(22,163,74,0.45), 0 0 0 1px rgba(22,163,74,0.35) !important;
}

.pkg-detail-rem-btn {
  border-radius: 10px !important;
  width: 40px !important;
  height: 40px !important;
  background: rgba(239,68,68,0.07) !important;
  border: 1px solid rgba(239,68,68,0.2) !important;
  color: rgba(252,165,165,0.65) !important;
  transition: all 0.2s !important;
}
.pkg-detail-rem-btn:hover {
  background: rgba(239,68,68,0.18) !important;
  border-color: rgba(239,68,68,0.5) !important;
  color: #fca5a5 !important;
  transform: scale(1.08) !important;
}

/* ── Empty state upgrade ───────────────────────────────────────────────────── */
.pkg-detail-empty {
  gap: 16px !important;
}

.pkg-detail-empty-icon {
  font-size: 48px !important;
  opacity: 0.2 !important;
  animation: pkgEnhEmptyPulse 3s ease-in-out infinite !important;
}
@keyframes pkgEnhEmptyPulse {
  0%,100% { transform: scale(1); opacity: 0.2; }
  50%     { transform: scale(1.08); opacity: 0.3; }
}

.pkg-detail-empty-text {
  font-family: var(--font-title) !important;
  font-size: 11px !important;
  letter-spacing: 3px !important;
  text-transform: uppercase !important;
  color: rgba(255,255,255,0.2) !important;
}

/* ── Wiki lookup btn refinement ─────────────────────────────────────────────  */
.wiki-lookup-btn {
  opacity: 0 !important;
  transition: opacity 0.15s !important;
  margin-left: 6px !important;
  vertical-align: middle !important;
}
.pkg-detail-row:hover .wiki-lookup-btn {
  opacity: 0.5 !important;
}
.pkg-detail-row:hover .wiki-lookup-btn:hover {
  opacity: 1 !important;
}

/* ── Slot warning badge polish ──────────────────────────────────────────────  */
.pkg-slot-no-price-warn {
  font-size: 7px !important;
  padding: 1px 5px !important;
  letter-spacing: 0.5px !important;
}

/* ── Main area layout refinement ───────────────────────────────────────────── */
.pkg-main-area {
  overflow: hidden !important;
}

.packages-wrap {
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
}

/* ── Item row entrance animation (applied by observer) ─────────────────────── */
@keyframes pkgRowIn {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
}

.pkg-detail-row.pkg-row-animated {
  animation: pkgRowIn 0.22s ease both;
}

/* ── Sidebar card entrance animation ────────────────────────────────────────── */
@keyframes pkgCardIn {
  from { opacity: 0; transform: translateY(10px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
}

.pkg-sidebar-item.pkg-card-animated {
  animation: pkgCardIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both;
}

/* ── Price flash when a slot total changes ───────────────────────────────────  */
@keyframes pkgPriceFlash {
  0%   { color: #fff; text-shadow: 0 0 16px rgba(255,255,255,0.9); }
  100% { color: #fde68a; text-shadow: 0 0 14px rgba(253,230,138,0.35); }
}
.pkg-price-flash {
  animation: pkgPriceFlash 0.55s ease both;
}

/* ── Responsive ────────────────────────────────────────────────────────────── */
@media (max-width: 720px) {
  .pkg-sidebar { width: 100% !important; max-height: 220px !important; }
  .pkg-main-area { flex-direction: column !important; }
  .pkg-detail { min-height: 300px !important; }
  .pkg-sidebar-list { grid-template-columns: repeat(3, 1fr) !important; }
}

@media (max-width: 480px) {
  .pkg-sidebar-list { grid-template-columns: repeat(2, 1fr) !important; }
  .pkg-detail-header { flex-direction: column !important; align-items: flex-start !important; gap: 6px !important; }
  .pkg-detail-footer { flex-wrap: wrap !important; gap: 10px !important; }
  .pkg-detail-add-btn { width: 100% !important; text-align: center !important; }
}
  `;

  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ─── 2. MUTATION OBSERVER — add entrance animations to freshly-rendered items ─
  function animateSidebarItems(list) {
    const items = list.querySelectorAll('.pkg-sidebar-item:not(.pkg-card-animated)');
    items.forEach(function(item, i) {
      item.classList.add('pkg-card-animated');
      item.style.animationDelay = (i * 0.04) + 's';
    });
  }

  function animateDetailRows(detail) {
    const rows = detail.querySelectorAll('.pkg-detail-row:not(.pkg-row-animated)');
    rows.forEach(function(row, i) {
      row.classList.add('pkg-row-animated');
      row.style.animationDelay = (i * 0.025) + 's';
    });
  }

  function flashPrices(detail) {
    // Flash price totals whenever detail re-renders
    const priceEls = detail.querySelectorAll('.pkg-detail-total-kk, .pkg-detail-total-brl');
    priceEls.forEach(function(el) {
      el.classList.remove('pkg-price-flash');
      // Force reflow
      void el.offsetWidth;
      el.classList.add('pkg-price-flash');
    });
  }

  // Observe sidebar list for renders
  const sidebarList = document.getElementById('pkg-sidebar-list');
  if (sidebarList) {
    animateSidebarItems(sidebarList); // run once on init
    const sidebarObserver = new MutationObserver(function() {
      animateSidebarItems(sidebarList);
    });
    sidebarObserver.observe(sidebarList, { childList: true, subtree: false });
  }

  // Observe detail panel for renders
  const detailPanel = document.getElementById('pkg-detail');
  if (detailPanel) {
    const detailObserver = new MutationObserver(function(mutations) {
      // Check if real content was added (not just empty state)
      const hasRows = detailPanel.querySelector('.pkg-detail-row');
      if (hasRows) {
        animateDetailRows(detailPanel);
        flashPrices(detailPanel);
      }
    });
    detailObserver.observe(detailPanel, { childList: true, subtree: true });
  }

  // ─── 3. WAIT for tab activation to run initial animation pass ─────────────
  // Tab switching happens via switchTab() — we observe tab visibility
  function onTabVisible() {
    const sbl = document.getElementById('pkg-sidebar-list');
    const det = document.getElementById('pkg-detail');
    if (sbl) animateSidebarItems(sbl);
    if (det) animateDetailRows(det);
  }

  // Poll for the pacotes tab becoming active (lightweight, stops after first activation)
  let tabCheckCount = 0;
  const tabChecker = setInterval(function() {
    tabCheckCount++;
    const tab = document.getElementById('tab-pacotes');
    if (!tab) { if (tabCheckCount > 60) clearInterval(tabChecker); return; }
    const style = window.getComputedStyle(tab);
    if (style.display !== 'none' && !tab._pkgEnhDone) {
      tab._pkgEnhDone = true;
      onTabVisible();
    }
    if (tabCheckCount > 120) clearInterval(tabChecker);
  }, 250);

  console.log('[PkgEnhance] ✅ Premium visual layer loaded');

})();
