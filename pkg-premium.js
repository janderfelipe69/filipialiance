/* ═══════════════════════════════════════════════════════════════════
   PKG-PREMIUM.JS — MMORPG Build System UI for Packages Tab
   Drop-in replacement: overrides renderPackages + renderPkgDetail
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── INJECT PREMIUM CSS ─────────────────────────────────────── */
  function injectPremiumCSS() {
    if (document.getElementById('pkg-premium-css')) return;
    const s = document.createElement('style');
    s.id = 'pkg-premium-css';
    s.textContent = `

/* ═══ IMPORTS ═══ */
@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@400;600;700;900&family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap');

/* ═══ PKG PREMIUM LAYOUT ═══ */
.packages-wrap {
  display: flex !important;
  flex-direction: column !important;
  height: calc(100vh - 130px) !important;
  overflow: hidden !important;
  background: radial-gradient(ellipse at 20% 0%, rgba(14,30,80,0.6) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 100%, rgba(60,10,90,0.4) 0%, transparent 60%),
              #06090f !important;
  position: relative;
}

/* Subtle animated background grid */
.packages-wrap::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(58,140,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(58,140,255,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
  z-index: 0;
}

/* ═══ CATEGORY FILTER BAR ═══ */
.pkg-cat-tabs {
  display: flex !important;
  flex-direction: row !important;
  gap: 8px !important;
  padding: 14px 20px 12px !important;
  border-bottom: 1px solid rgba(58,140,255,0.12) !important;
  background: rgba(6,9,20,0.9) !important;
  flex-shrink: 0 !important;
  overflow-x: auto !important;
  scrollbar-width: none !important;
  z-index: 1;
  position: relative;
  backdrop-filter: blur(10px);
}

.pkg-cat-btn {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 8px 18px !important;
  border-radius: 4px !important;
  border: 1px solid rgba(58,140,255,0.15) !important;
  background: rgba(58,140,255,0.04) !important;
  cursor: pointer !important;
  font-family: 'Rajdhani', sans-serif !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  color: rgba(180,200,240,0.5) !important;
  letter-spacing: 1.5px !important;
  text-transform: uppercase !important;
  transition: all 0.2s ease !important;
  white-space: nowrap !important;
  flex-shrink: 0 !important;
  position: relative;
  overflow: hidden;
}
.pkg-cat-btn::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 2px;
  background: var(--pkg-color, rgba(58,140,255,0.8));
  transform: scaleX(0);
  transition: transform 0.2s ease;
}
.pkg-cat-btn:hover {
  background: rgba(58,140,255,0.09) !important;
  color: rgba(200,220,255,0.8) !important;
  border-color: rgba(58,140,255,0.3) !important;
}
.pkg-cat-btn.active {
  background: rgba(58,140,255,0.14) !important;
  border-color: rgba(58,140,255,0.55) !important;
  color: #fff !important;
  box-shadow: 0 0 18px rgba(58,140,255,0.15), inset 0 0 12px rgba(58,140,255,0.08) !important;
}
.pkg-cat-btn.active::after { transform: scaleX(1); }
.pkg-cat-icon {
  width: 22px !important;
  height: 22px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 14px !important;
}
.pkg-cat-count {
  font-family: 'Share Tech Mono', monospace !important;
  font-size: 10px !important;
  color: rgba(58,140,255,0.7) !important;
  background: rgba(58,140,255,0.1) !important;
  border-radius: 3px !important;
  padding: 1px 6px !important;
}

/* ═══ MAIN AREA ═══ */
.pkg-main-area {
  display: flex !important;
  flex: 1 !important;
  overflow: hidden !important;
  position: relative;
  z-index: 1;
}

/* ═══ SIDEBAR — BUILD SELECTION ═══ */
.pkg-sidebar {
  width: 280px !important;
  flex-shrink: 0 !important;
  background: rgba(6,9,20,0.95) !important;
  border-right: 1px solid rgba(58,140,255,0.14) !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}

.pkg-sidebar-header {
  padding: 16px 18px 12px !important;
  border-bottom: 1px solid rgba(58,140,255,0.1) !important;
  background: rgba(58,140,255,0.04) !important;
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  flex-shrink: 0 !important;
}
.pkg-sidebar-icon { font-size: 16px; }
.pkg-sidebar-title {
  font-family: 'Rajdhani', sans-serif !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  color: rgba(100,160,255,0.6) !important;
  letter-spacing: 3px !important;
  text-transform: uppercase !important;
}

/* ═══ PACKAGE GRID CARDS ═══ */
.pkg-sidebar-list {
  flex: 1 !important;
  overflow-y: auto !important;
  padding: 14px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
  align-content: start !important;
  scrollbar-width: thin !important;
  scrollbar-color: rgba(58,140,255,0.25) transparent !important;
}
.pkg-sidebar-list::-webkit-scrollbar { width: 4px; }
.pkg-sidebar-list::-webkit-scrollbar-thumb { background: rgba(58,140,255,0.2); border-radius: 2px; }

.pkg-sidebar-item {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 12px !important;
  padding: 12px 14px !important;
  border-radius: 6px !important;
  background: rgba(255,255,255,0.02) !important;
  border: 1px solid rgba(255,255,255,0.05) !important;
  border-left: 3px solid var(--pkg-color, rgba(58,140,255,0.5)) !important;
  cursor: pointer !important;
  transition: background 0.18s ease, transform 0.15s ease, box-shadow 0.18s ease !important;
  position: relative !important;
  text-align: left !important;
}
.pkg-sidebar-item:hover {
  background: rgba(255,255,255,0.04) !important;
  transform: translateX(3px) !important;
  box-shadow: 0 2px 20px rgba(0,0,0,0.4), 4px 0 16px color-mix(in srgb, var(--pkg-color, #60aaff) 20%, transparent) !important;
}
.pkg-sidebar-item.active {
  background: color-mix(in srgb, var(--pkg-color, #60aaff) 10%, rgba(6,9,20,0.95)) !important;
  border-color: color-mix(in srgb, var(--pkg-color, #60aaff) 60%, transparent) !important;
  border-left-color: var(--pkg-color, #60aaff) !important;
  box-shadow: 0 2px 24px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3),
              4px 0 24px color-mix(in srgb, var(--pkg-color, #60aaff) 25%, transparent) !important;
}
.pkg-sidebar-item.is-in-cart {
  border-color: rgba(34,197,94,0.4) !important;
  border-left-color: #22c55e !important;
}

.pkg-sidebar-item-icon {
  width: 46px !important;
  height: 46px !important;
  border-radius: 8px !important;
  background: color-mix(in srgb, var(--pkg-color, #60aaff) 12%, #0a1020) !important;
  border: 1px solid color-mix(in srgb, var(--pkg-color, #60aaff) 35%, transparent) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
  overflow: hidden !important;
  box-shadow: 0 0 12px color-mix(in srgb, var(--pkg-color, #60aaff) 18%, transparent) !important;
}
.pkg-sidebar-item-icon img {
  width: 30px !important;
  height: 30px !important;
  object-fit: contain !important;
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--pkg-color, #60aaff) 60%, transparent)) !important;
}

.pkg-sidebar-item-info {
  flex: 1 !important;
  min-width: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 4px !important;
}
.pkg-sidebar-item-name {
  font-family: 'Rajdhani', sans-serif !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  letter-spacing: 0.5px !important;
  color: rgba(220,230,255,0.85) !important;
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: unset !important;
  line-height: 1.3 !important;
}
.pkg-sidebar-item.active .pkg-sidebar-item-name {
  color: #fff !important;
}
.pkg-sidebar-item-sub {
  font-family: 'Share Tech Mono', monospace !important;
  font-size: 10px !important;
  color: rgba(255,255,255,0.3) !important;
  letter-spacing: 0.5px !important;
}

.pkg-sidebar-item-price-preview {
  font-family: 'Share Tech Mono', monospace;
  font-size: 10px;
  color: color-mix(in srgb, var(--pkg-color, #ffd700) 90%, white);
  opacity: 0.85;
}

.pkg-card-cart-badge {
  position: absolute !important;
  top: 7px !important;
  right: 7px !important;
  font-family: 'Share Tech Mono', monospace !important;
  font-size: 9px !important;
  font-weight: 700 !important;
  padding: 2px 7px !important;
  border-radius: 3px !important;
  background: #22c55e !important;
  color: #fff !important;
  letter-spacing: 0.5px !important;
}

/* ═══ BUILD PANEL (DETAIL) ═══ */
.pkg-detail {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  background: transparent !important;
}

.pkg-detail-empty {
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 20px !important;
  color: rgba(100,140,200,0.3) !important;
}
.pkg-detail-empty-icon {
  font-size: 60px !important;
  opacity: 0.15 !important;
  filter: grayscale(1);
}
.pkg-detail-empty-text {
  font-family: 'Rajdhani', sans-serif !important;
  font-size: 14px !important;
  letter-spacing: 3px !important;
  text-transform: uppercase;
  opacity: 0.4 !important;
}

/* ── Build Panel Header ── */
.pprem-header {
  padding: 20px 28px 18px;
  border-bottom: 1px solid rgba(58,140,255,0.1);
  background: linear-gradient(180deg, rgba(58,140,255,0.06) 0%, transparent 100%);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 20px;
}
.pprem-header-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--pkg-color, #60aaff) 15%, #080e1f);
  border: 2px solid color-mix(in srgb, var(--pkg-color, #60aaff) 40%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 28px color-mix(in srgb, var(--pkg-color, #60aaff) 25%, transparent),
              inset 0 0 20px rgba(0,0,0,0.4);
  overflow: hidden;
}
.pprem-header-icon img {
  width: 42px;
  height: 42px;
  object-fit: contain;
  filter: drop-shadow(0 0 8px color-mix(in srgb, var(--pkg-color, #60aaff) 80%, transparent));
}
.pprem-header-info { flex: 1; min-width: 0; }
.pprem-pkg-cat {
  font-family: 'Rajdhani', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--pkg-color, #60aaff);
  opacity: 0.8;
  margin-bottom: 4px;
}
.pprem-pkg-name {
  font-family: 'Cinzel', serif;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
  line-height: 1.1;
  margin-bottom: 8px;
}
.pprem-pkg-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.pprem-badge {
  font-family: 'Share Tech Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 3px;
  border: 1px solid;
}
.pprem-badge-slots {
  background: rgba(58,140,255,0.1);
  border-color: rgba(58,140,255,0.35);
  color: #7ab4ff;
}
.pprem-badge-items {
  background: rgba(255,200,50,0.08);
  border-color: rgba(255,200,50,0.3);
  color: #ffd166;
}
.pprem-badge-cart {
  background: rgba(34,197,94,0.12);
  border-color: rgba(34,197,94,0.4);
  color: #4ade80;
}

/* ── Slot Selector (talent tree style) ── */
.pprem-slot-section {
  padding: 16px 28px 0;
  flex-shrink: 0;
}
.pprem-slot-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(100,140,200,0.5);
  margin-bottom: 10px;
}
.pprem-slot-track {
  display: flex;
  align-items: center;
  gap: 0;
  position: relative;
  padding-bottom: 16px;
  overflow-x: auto;
  scrollbar-width: none;
}
.pprem-slot-track::-webkit-scrollbar { display: none; }
.pprem-slot-connector {
  height: 2px;
  flex: 1;
  min-width: 20px;
  background: rgba(58,140,255,0.15);
  flex-shrink: 0;
  transition: background 0.25s;
}
.pprem-slot-connector.passed {
  background: color-mix(in srgb, var(--pkg-color, #60aaff) 50%, transparent);
}
.pprem-slot-node {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid rgba(58,140,255,0.2);
  background: rgba(6,9,20,0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
  transition: all 0.22s ease;
  gap: 2px;
}
.pprem-slot-node:hover {
  border-color: color-mix(in srgb, var(--pkg-color, #60aaff) 60%, transparent);
  background: color-mix(in srgb, var(--pkg-color, #60aaff) 10%, rgba(6,9,20,0.9));
  transform: scale(1.08);
}
.pprem-slot-node.active {
  border-color: var(--pkg-color, #60aaff);
  background: color-mix(in srgb, var(--pkg-color, #60aaff) 18%, rgba(6,9,20,0.9));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--pkg-color, #60aaff) 20%, transparent),
              0 0 20px color-mix(in srgb, var(--pkg-color, #60aaff) 30%, transparent);
}
.pprem-slot-node.disabled-all {
  opacity: 0.35;
  filter: grayscale(0.8);
}
.pprem-slot-node-num {
  font-family: 'Cinzel', serif;
  font-size: 13px;
  font-weight: 700;
  color: rgba(200,220,255,0.7);
  line-height: 1;
}
.pprem-slot-node.active .pprem-slot-node-num { color: #fff; }
.pprem-slot-node-count {
  font-family: 'Share Tech Mono', monospace;
  font-size: 8px;
  color: rgba(150,180,240,0.5);
  letter-spacing: 0.3px;
  line-height: 1;
}
.pprem-slot-node.active .pprem-slot-node-count {
  color: color-mix(in srgb, var(--pkg-color, #60aaff) 80%, white);
}
.pprem-slot-price-tag {
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Share Tech Mono', monospace;
  font-size: 8px;
  color: rgba(255,200,80,0.75);
  white-space: nowrap;
}
.pprem-slot-warn-dot {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
  animation: warnPulse 2s ease-in-out infinite;
}

/* ── Completion Bar ── */
.pprem-completion {
  padding: 10px 28px 14px;
  flex-shrink: 0;
}
.pprem-completion-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.pprem-completion-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(100,140,200,0.5);
}
.pprem-completion-val {
  font-family: 'Share Tech Mono', monospace;
  font-size: 11px;
  color: var(--pkg-color, #60aaff);
  font-weight: 700;
}
.pprem-bar-track {
  height: 5px;
  border-radius: 3px;
  background: rgba(255,255,255,0.05);
  overflow: hidden;
  position: relative;
}
.pprem-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--pkg-color, #60aaff) 60%, #001020),
    var(--pkg-color, #60aaff));
  transition: width 0.4s ease;
  position: relative;
}
.pprem-bar-fill::after {
  content: '';
  position: absolute;
  right: 0; top: 0; bottom: 0;
  width: 20px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3));
  border-radius: 3px;
}
.pprem-slots-visual {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}
.pprem-slot-pip {
  flex: 1;
  height: 6px;
  border-radius: 2px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.06);
  transition: all 0.3s ease;
}
.pprem-slot-pip.filled {
  background: color-mix(in srgb, var(--pkg-color, #60aaff) 70%, white);
  border-color: var(--pkg-color, #60aaff);
  box-shadow: 0 0 6px color-mix(in srgb, var(--pkg-color, #60aaff) 50%, transparent);
}
.pprem-slot-pip.partial {
  background: color-mix(in srgb, var(--pkg-color, #ffd700) 50%, transparent);
  border-color: color-mix(in srgb, var(--pkg-color, #ffd700) 60%, transparent);
}

/* ── Item List ── */
.pprem-items-section {
  flex: 1;
  overflow-y: auto;
  padding: 6px 28px 10px;
  scrollbar-width: thin;
  scrollbar-color: rgba(58,140,255,0.2) transparent;
}
.pprem-items-section::-webkit-scrollbar { width: 4px; }
.pprem-items-section::-webkit-scrollbar-thumb { background: rgba(58,140,255,0.2); border-radius: 2px; }

.pprem-item-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border-radius: 6px;
  margin-bottom: 5px;
  border: 1px solid rgba(255,255,255,0.04);
  background: rgba(255,255,255,0.015);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, opacity 0.2s;
  user-select: none;
}
.pprem-item-row:hover {
  background: rgba(58,140,255,0.06);
  border-color: rgba(58,140,255,0.2);
}
.pprem-item-row.row-disabled {
  opacity: 0.35;
  filter: grayscale(0.6);
  background: rgba(255,50,50,0.02);
  border-color: rgba(255,50,50,0.1);
}
.pprem-item-row.row-disabled .pprem-item-name {
  text-decoration: line-through;
  text-decoration-color: rgba(255,100,100,0.4);
}

.pprem-item-icon {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  overflow: hidden;
}

.pprem-item-rarity {
  width: 3px;
  height: 36px;
  border-radius: 2px;
  flex-shrink: 0;
  background: var(--rarity-color, rgba(100,160,255,0.4));
  box-shadow: 0 0 6px var(--rarity-color, rgba(100,160,255,0.3));
}

.pprem-item-name {
  flex: 1;
  font-family: 'Rajdhani', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: rgba(220,230,255,0.85);
  letter-spacing: 0.3px;
  text-transform: capitalize;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.pprem-item-qty {
  font-family: 'Share Tech Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  color: var(--pkg-color, #60aaff);
  background: color-mix(in srgb, var(--pkg-color, #60aaff) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--pkg-color, #60aaff) 25%, transparent);
  border-radius: 4px;
  padding: 2px 9px;
  flex-shrink: 0;
  min-width: 44px;
  text-align: center;
}

.pprem-item-price {
  font-family: 'Share Tech Mono', monospace;
  font-size: 11px;
  color: rgba(255,200,80,0.85);
  min-width: 70px;
  text-align: right;
  flex-shrink: 0;
}

.pprem-item-toggle {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
  flex-shrink: 0;
  color: rgba(255,100,100,0.8);
  font-weight: 700;
}
.pprem-item-row:hover .pprem-item-toggle {
  opacity: 1;
  background: rgba(255,80,80,0.12);
}
.pprem-item-row.row-disabled .pprem-item-toggle {
  opacity: 1;
  color: rgba(80,200,120,0.9);
  background: rgba(80,200,120,0.1);
}

.pprem-disabled-label {
  font-family: 'Share Tech Mono', monospace;
  font-size: 9px;
  color: rgba(255,100,100,0.55);
  letter-spacing: 0.5px;
  text-decoration: none;
}

.wiki-lookup-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 3px;
  opacity: 0.3;
  transition: opacity 0.15s;
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
}
.wiki-lookup-btn:hover { opacity: 0.9; }
.wiki-lookup-btn svg {
  width: 12px;
  height: 12px;
  stroke: rgba(100,160,255,0.8);
}

/* ── Summary Footer ── */
.pprem-footer {
  padding: 14px 28px;
  border-top: 1px solid rgba(58,140,255,0.1);
  background: rgba(4,6,14,0.9);
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  backdrop-filter: blur(10px);
}

.pprem-summary-grid {
  display: flex;
  gap: 20px;
  flex: 1;
}
.pprem-summary-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pprem-summary-stat-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: rgba(100,140,200,0.4);
}
.pprem-summary-stat-val {
  font-family: 'Share Tech Mono', monospace;
  font-size: 15px;
  font-weight: 700;
  color: var(--pkg-color, #60aaff);
  line-height: 1;
}
.pprem-summary-stat-sub {
  font-family: 'Share Tech Mono', monospace;
  font-size: 9px;
  color: rgba(255,200,80,0.7);
}

.pprem-footer-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.pprem-add-btn {
  background: linear-gradient(135deg, 
    color-mix(in srgb, var(--pkg-color, #3a8cff) 80%, #001020),
    color-mix(in srgb, var(--pkg-color, #3a8cff) 50%, #000b1a));
  border: 1px solid color-mix(in srgb, var(--pkg-color, #3a8cff) 60%, transparent);
  border-radius: 6px;
  color: #fff;
  font-family: 'Rajdhani', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  padding: 11px 24px;
  cursor: pointer;
  transition: all 0.22s ease;
  text-transform: uppercase;
  box-shadow: 0 4px 20px color-mix(in srgb, var(--pkg-color, #3a8cff) 25%, transparent);
  white-space: nowrap;
  position: relative;
  overflow: hidden;
}
.pprem-add-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%);
  pointer-events: none;
}
.pprem-add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px color-mix(in srgb, var(--pkg-color, #3a8cff) 35%, transparent);
  filter: brightness(1.1);
}
.pprem-add-btn.added {
  background: linear-gradient(135deg, #1a7a38, #0f5a28) !important;
  border-color: rgba(34,197,94,0.5) !important;
  box-shadow: 0 4px 20px rgba(34,197,94,0.25) !important;
}

.pprem-rem-btn {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: rgba(255,60,60,0.06);
  border: 1px solid rgba(255,60,60,0.2);
  color: rgba(255,100,100,0.6);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.pprem-rem-btn:hover {
  background: rgba(255,60,60,0.15);
  border-color: rgba(255,80,80,0.5);
  color: #ff6b6b;
}

/* ── Divider between slot section and items ── */
.pprem-divider {
  height: 1px;
  background: rgba(58,140,255,0.08);
  margin: 0 28px 10px;
  flex-shrink: 0;
}

/* ── Rarity item colors ── */
.rarity-common   { --rarity-color: rgba(180,190,200,0.5); }
.rarity-uncommon { --rarity-color: rgba(80,200,120,0.6); }
.rarity-rare     { --rarity-color: rgba(58,140,255,0.7); }
.rarity-epic     { --rarity-color: rgba(160,80,255,0.7); }
.rarity-legendary{ --rarity-color: rgba(255,165,0,0.8); }

/* ── Slot no-price badge ── */
.pprem-no-price-warn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 8px;
  font-weight: 700;
  color: #f59e0b;
  letter-spacing: 0.5px;
  background: rgba(240,140,0,0.12);
  border: 1px solid rgba(240,140,0,0.3);
  border-radius: 3px;
  padding: 1px 5px;
  animation: warnPulse 2.2s ease-in-out infinite;
}

/* ── Mobile ── */
@media (max-width: 640px) {
  .pkg-sidebar {
    width: 220px !important;
  }
  .pprem-header {
    padding: 14px 16px 12px;
    gap: 12px;
  }
  .pprem-header-icon {
    width: 48px;
    height: 48px;
  }
  .pprem-pkg-name {
    font-size: 15px;
  }
  .pprem-slot-section,
  .pprem-completion,
  .pprem-items-section,
  .pprem-footer {
    padding-left: 16px;
    padding-right: 16px;
  }
  .pprem-summary-grid {
    gap: 12px;
  }
  .pprem-summary-stat-val {
    font-size: 12px;
  }
}
@media (max-width: 480px) {
  .pkg-sidebar { width: 0 !important; overflow: hidden !important; display: none !important; }
  .pkg-main-area { flex-direction: column; }
  .pprem-summary-grid { display: none; }
}

/* ── Entrance animations ── */
@keyframes ppremSlideIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.pprem-header     { animation: ppremSlideIn 0.25s ease forwards; }
.pprem-slot-section { animation: ppremSlideIn 0.3s ease 0.04s both; }
.pprem-completion { animation: ppremSlideIn 0.3s ease 0.08s both; }
.pprem-items-section { animation: ppremSlideIn 0.3s ease 0.1s both; }
.pprem-footer     { animation: ppremSlideIn 0.3s ease 0.14s both; }

/* hide old style injected by app.js that conflicts */
#pkg-talent-style, #pkg-sidebar-name-patch { /* allowed to exist, our rules override */ }
    `;
    document.head.appendChild(s);
  }

  /* ─── ITEM RARITY HELPER ─────────────────────────────────────── */
  function getItemRarity(item) {
    if (!item || !item.price) return 'common';
    const p = item.price;
    if (p >= 50000) return 'legendary';
    if (p >= 10000) return 'epic';
    if (p >= 2000)  return 'rare';
    if (p >= 500)   return 'uncommon';
    return 'common';
  }

  function getItemEmoji(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('orb'))     return '🔮';
    if (n.includes('wing'))    return '🪶';
    if (n.includes('tail'))    return '🐾';
    if (n.includes('claw') || n.includes('paw')) return '🦾';
    if (n.includes('hair') || n.includes('wig') || n.includes('mohawk')) return '💇';
    if (n.includes('ear'))     return '👂';
    if (n.includes('horn') || n.includes('antenna')) return '📡';
    if (n.includes('gem') || n.includes('jewel') || n.includes('crystal')) return '💎';
    if (n.includes('scale') || n.includes('shell')) return '🛡';
    if (n.includes('tooth') || n.includes('fang')) return '🦷';
    if (n.includes('fire'))    return '🔥';
    if (n.includes('water') || n.includes('fin')) return '💧';
    if (n.includes('ice') || n.includes('frost')) return '❄️';
    if (n.includes('electric') || n.includes('screw')) return '⚡';
    if (n.includes('rock') || n.includes('stone') || n.includes('plate')) return '🪨';
    if (n.includes('poison') || n.includes('toxic')) return '☠️';
    if (n.includes('psychic') || n.includes('spoon')) return '🔮';
    if (n.includes('grass') || n.includes('leaf')) return '🌿';
    if (n.includes('core') || n.includes('magnet')) return '🔩';
    if (n.includes('star'))    return '⭐';
    if (n.includes('bow') || n.includes('ribbon')) return '🎀';
    if (n.includes('feather') || n.includes('crest')) return '🪶';
    if (n.includes('beak') || n.includes('bird')) return '🐦';
    if (n.includes('frog') || n.includes('toad')) return '🐸';
    if (n.includes('snake') || n.includes('cobra')) return '🐍';
    if (n.includes('bear') || n.includes('panda')) return '🐻';
    if (n.includes('dragon')) return '🐉';
    if (n.includes('ghost')) return '👻';
    if (n.includes('micro') || n.includes('loud')) return '🎤';
    if (n.includes('egg')) return '🥚';
    return '📦';
  }

  /* ─── OVERRIDE: renderPackages ──────────────────────────────── */
  window.renderPackages = function () {
    injectPremiumCSS();

    const sidebarList = document.getElementById('pkg-sidebar-list');
    if (!sidebarList) return;

    // Render category tabs (keep original logic)
    renderPkgCatTabs();

    if (!window.PACKAGES || !PACKAGES.length) {
      sidebarList.innerHTML = `<div style="padding:20px;font-family:'Rajdhani',sans-serif;font-size:12px;letter-spacing:2px;color:rgba(100,140,200,0.3);text-align:center;text-transform:uppercase">Nenhum pacote</div>`;
      return;
    }

    const filtered = PACKAGES.map((pkg, pi) => ({ pkg, pi }))
      .filter(({ pkg }) => activePkgCat === 'all' || getPkgCategory(pkg.name) === activePkgCat);

    sidebarList.innerHTML = filtered.map(({ pkg, pi }) => {
      const icon = getPkgIcon(pkg.name);
      const isActive = activePkgIdx === pi;
      const added = pkgCartCount && pkgCartCount[pi] ? pkgCartCount[pi] : 0;
      const pkgColor = getPkgTypeColor(pkg.name);
      const allItems = getPkgAllItems(pkg);
      const totalRaw = getPkgTotal(pkg, pi);
      const totalData = totalRaw > 0 ? formatKK(totalRaw) : null;

      return `<div class="pkg-sidebar-item${isActive ? ' active' : ''}${added ? ' is-in-cart' : ''}"
        onclick="selectPkg(${pi})" style="--pkg-color:${pkgColor}">
        ${added ? `<div class="pkg-card-cart-badge">✓ ×${added}</div>` : ''}
        <div class="pkg-sidebar-item-icon">${icon}</div>
        <div class="pkg-sidebar-item-info">
          <div class="pkg-sidebar-item-name">${pkg.name}</div>
          <div class="pkg-sidebar-item-sub">${allItems.length} ${allItems.length === 1 ? 'item' : 'itens'} · ${pkg.slots ? pkg.slots.length : 1} slots</div>
          ${totalData ? `<div class="pkg-sidebar-item-price-preview">${totalData.label}</div>` : ''}
        </div>
      </div>`;
    }).join('');

    if (activePkgIdx !== null) renderPkgDetail(activePkgIdx);
  };

  /* ─── OVERRIDE: renderPkgDetail ────────────────────────────── */
  window.renderPkgDetail = function (pi) {
    injectPremiumCSS();
    const detail = document.getElementById('pkg-detail');
    if (!detail) return;

    const pkg = PACKAGES[pi];
    if (!pkg) return;

    const pkgColor = getPkgTypeColor(pkg.name);
    const pkgIcon  = getPkgIcon(pkg.name);
    const pkgCat   = getPkgCategory(pkg.name);
    const catMeta  = PKG_CAT_META[pkgCat] || { label: pkgCat, icon: '📌' };

    const added    = pkgCartCount && pkgCartCount[pi] ? pkgCartCount[pi] : 0;
    const slots    = pkg.slots || [getPkgAllItems(pkg)];
    const hasSlots = slots.length > 1;

    if (activeSlotByPkg[pi] === undefined) activeSlotByPkg[pi] = 0;
    const si = Math.min(activeSlotByPkg[pi], slots.length - 1);
    const currentSlot = slots[si];

    const allItems = getPkgAllItems(pkg);
    const totalRaw = getPkgTotal(pkg, pi);
    const totalData = totalRaw > 0 ? formatKK(totalRaw) : null;
    const activeCount = getPkgActiveItems(pkg, pi).length;

    // Compute per-slot active status for slot pips
    const slotStats = slots.map((slot, idx) => {
      const active = slot.filter(([n]) => !isPkgItemDisabled(pi, idx, n)).length;
      return { total: slot.length, active };
    });

    // ── Slot Nodes HTML ──
    let slotNodesHtml = '';
    if (hasSlots) {
      slotNodesHtml = slots.map((slot, idx) => {
        const slotTotal = slot.reduce((s, [n, q]) => {
          if (isPkgItemDisabled(pi, idx, n)) return s;
          const it = getPkgItemData(n);
          return s + (it && it.price ? it.price * q : 0);
        }, 0);
        const slotData = slotTotal > 0 ? formatKK(slotTotal) : null;
        const disabledCount = slot.filter(([n]) => isPkgItemDisabled(pi, idx, n)).length;
        const noPriceCount = slot.filter(([n]) => {
          if (isPkgItemDisabled(pi, idx, n)) return false;
          const it = getPkgItemData(n);
          return !it || !it.price;
        }).length;
        const isActive = idx === si;
        const isDisabledAll = disabledCount === slot.length;
        const isPassed = idx < si;

        const connector = idx < slots.length - 1
          ? `<div class="pprem-slot-connector${isPassed || isActive ? ' passed' : ''}"></div>`
          : '';

        return `
          <div class="pprem-slot-node${isActive ? ' active' : ''}${isDisabledAll ? ' disabled-all' : ''}"
            onclick="selectPkgSlot(${pi}, ${idx})" style="--pkg-color:${pkgColor}">
            <div class="pprem-slot-node-num">${idx + 1}</div>
            <div class="pprem-slot-node-count">${slot.length - disabledCount}/${slot.length}</div>
            ${noPriceCount > 0 ? `<div class="pprem-slot-warn-dot" title="${noPriceCount} s/preço"></div>` : ''}
            ${slotData ? `<div class="pprem-slot-price-tag">${slotData.label}</div>` : ''}
          </div>
          ${connector}`;
      }).join('');
    }

    // Slot pips visual
    const slotPipsHtml = slots.map((_, idx) => {
      const st = slotStats[idx];
      const pct = st.total > 0 ? st.active / st.total : 0;
      const cls = pct === 1 ? 'filled' : pct > 0 ? 'partial' : '';
      return `<div class="pprem-slot-pip ${cls}" style="--pkg-color:${pkgColor}" title="Slot ${idx+1}: ${st.active}/${st.total}"></div>`;
    }).join('');

    const completePct = allItems.length > 0
      ? Math.round(activeCount / allItems.length * 100) : 0;

    // ── Item Rows ──
    const rowsHtml = currentSlot.map(([name, qty]) => {
      const disabled = isPkgItemDisabled(pi, si, name);
      const item = getPkgItemData(name);
      const lineTotal = !disabled && item && item.price && qty > 0 ? item.price * qty : 0;
      const priceData = lineTotal > 0 ? formatKK(lineTotal) : null;
      const rarity = getItemRarity(item);
      const emoji = getItemEmoji(name);

      const priceHtml = disabled
        ? `<span class="pprem-disabled-label">removido</span>`
        : priceData
          ? `<span class="pprem-item-price">${priceData.label}</span>`
          : `<span class="pprem-item-price" style="opacity:0.3">—</span>`;

      return `<div class="pprem-item-row${disabled ? ' row-disabled' : ''} rarity-${rarity}"
        onclick="togglePkgItem(${pi}, ${si}, '${name.replace(/'/g, "\\'")}')"
        style="--pkg-color:${pkgColor}">
        <div class="pprem-item-icon">${emoji}</div>
        <div class="pprem-item-rarity"></div>
        <div class="pprem-item-name">
          ${name}
          <button class="wiki-lookup-btn" onclick="openWikiLookup('${name.replace(/'/g, "\\'")}', event)" title="Ver drops na Wiki">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
        </div>
        ${priceHtml}
        <div class="pprem-item-qty" style="--pkg-color:${pkgColor}">×${qty.toLocaleString()}</div>
        <div class="pprem-item-toggle">${disabled ? '↩' : '✕'}</div>
      </div>`;
    }).join('');

    const addedClass = added ? ' added' : '';
    const addedLabel = added ? `✓ Adicionado ×${added}` : '+ Adicionar ao Carrinho';

    // ── Full Detail HTML ──
    detail.innerHTML = `
      <div class="pprem-header" style="--pkg-color:${pkgColor}">
        <div class="pprem-header-icon">${pkgIcon}</div>
        <div class="pprem-header-info">
          <div class="pprem-pkg-cat">${catMeta.label}</div>
          <div class="pprem-pkg-name">${pkg.name}</div>
          <div class="pprem-pkg-badges">
            <span class="pprem-badge pprem-badge-slots">${slots.length} SLOT${slots.length > 1 ? 'S' : ''}</span>
            <span class="pprem-badge pprem-badge-items">${allItems.length} ITENS</span>
            ${added ? `<span class="pprem-badge pprem-badge-cart">✓ NO CARRINHO ×${added}</span>` : ''}
          </div>
        </div>
      </div>

      ${hasSlots ? `
      <div class="pprem-slot-section" style="--pkg-color:${pkgColor}">
        <div class="pprem-slot-label">Progressão de Slots</div>
        <div class="pprem-slot-track">${slotNodesHtml}</div>
      </div>` : ''}

      <div class="pprem-completion" style="--pkg-color:${pkgColor}">
        <div class="pprem-completion-row">
          <span class="pprem-completion-label">Itens Ativos</span>
          <span class="pprem-completion-val">${activeCount}/${allItems.length} · ${completePct}%</span>
        </div>
        <div class="pprem-bar-track">
          <div class="pprem-bar-fill" style="width:${completePct}%;--pkg-color:${pkgColor}"></div>
        </div>
        <div class="pprem-slots-visual">${slotPipsHtml}</div>
      </div>

      <div class="pprem-divider"></div>

      <div class="pprem-items-section" id="pprem-items-${pi}" style="--pkg-color:${pkgColor}">
        ${rowsHtml}
      </div>

      <div class="pprem-footer" style="--pkg-color:${pkgColor}">
        <div class="pprem-summary-grid">
          ${totalData ? `
          <div class="pprem-summary-stat">
            <span class="pprem-summary-stat-label">Total Ativo</span>
            <span class="pprem-summary-stat-val">${totalData.label}</span>
            <span class="pprem-summary-stat-sub">${totalData.brl}</span>
          </div>` : `
          <div class="pprem-summary-stat">
            <span class="pprem-summary-stat-label">Total Ativo</span>
            <span class="pprem-summary-stat-val" style="color:rgba(100,140,200,0.3)">—</span>
          </div>`}
          <div class="pprem-summary-stat">
            <span class="pprem-summary-stat-label">Slots</span>
            <span class="pprem-summary-stat-val" style="color:rgba(160,200,255,0.8)">${slots.length}</span>
          </div>
          <div class="pprem-summary-stat">
            <span class="pprem-summary-stat-label">Build</span>
            <span class="pprem-summary-stat-val" style="font-size:12px;color:rgba(160,200,255,0.7)">${completePct}%</span>
          </div>
        </div>
        <div class="pprem-footer-actions">
          <div id="pprem-rem-${pi}"></div>
          <button class="pprem-add-btn${addedClass}" id="pkgbtn-detail-${pi}"
            onclick="addPackageToCartDirect(${pi})" style="--pkg-color:${pkgColor}">
            ${addedLabel}
          </button>
        </div>
      </div>`;

    // Inject remove button if in cart
    if (added) {
      const remSlot = document.getElementById('pprem-rem-' + pi);
      if (remSlot) {
        remSlot.innerHTML = `<button class="pprem-rem-btn" onclick="removePackageFromCart(${pi})" title="Remover do carrinho">✕</button>`;
      }
    }
  };

  /* Also override selectPkgSlot to call our renderPkgDetail */
  const _origSelectPkgSlot = window.selectPkgSlot;
  window.selectPkgSlot = function (pi, si) {
    activeSlotByPkg[pi] = si;
    window.renderPkgDetail(pi);
  };

  /* ─── Run CSS immediately ─────────────────────────────────── */
  injectPremiumCSS();

  /* ─── Re-render if tab is already open ───────────────────── */
  if (document.getElementById('tab-pacotes') &&
      document.getElementById('tab-pacotes').classList.contains('active')) {
    setTimeout(() => {
      if (typeof renderPackages === 'function') renderPackages();
    }, 100);
  }

  console.log('[pkg-premium] Loaded ✓');
})();
