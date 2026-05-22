/**
 * CAPTURA REDESIGN — Premium Marketplace AAA
 * Drop-in replacement for renderCaptura()
 * Preserves all logic: cart, modal, filters, DB
 */

(function CapturaRedesign() {
  'use strict';

  // ─── CSS injection ──────────────────────────────────────────────────────────
  const STYLE_ID = 'captura-redesign-css';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `

/* ======================================================
   CAPTURA PREMIUM — CSS AAA
   ====================================================== */

/* Reset / scope */
#tab-captura { --cr-t1: #c084fc; --cr-t2: #60a5fa; --cr-t3: #4ade80; --cr-super: #fb923c; --cr-shiny: #fde68a; --cr-gold: #ffd166; }

/* ─── Controls bar upgrade ─────────────────────────────────────── */
.captura-controls {
  padding: 12px 20px !important;
  gap: 10px !important;
  flex-wrap: wrap;
  background: rgba(4,6,14,0.97) !important;
  border-bottom: 1px solid rgba(255,255,255,0.06) !important;
}

/* ─── Grid premium ─────────────────────────────────────────────── */
.captura-grid {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)) !important;
  gap: 16px !important;
  padding: 4px 2px !important;
}

.captura-wrap {
  padding: 20px 24px 120px !important;
}

/* ─── Pokemon Card Premium ──────────────────────────────────────── */
.cpk-card {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  background: linear-gradient(160deg, rgba(12,18,36,0.95) 0%, rgba(6,10,22,0.98) 100%);
  border: 1px solid rgba(255,255,255,0.08);
  transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.28s ease, border-color 0.2s ease;
  will-change: transform;
  contain: layout style;
  animation: cpkCardIn 0.35s ease both;
}

@keyframes cpkCardIn {
  from { opacity: 0; transform: translateY(14px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
}

/* Stagger */
.cpk-card:nth-child(1)  { animation-delay: 0.02s }
.cpk-card:nth-child(2)  { animation-delay: 0.04s }
.cpk-card:nth-child(3)  { animation-delay: 0.06s }
.cpk-card:nth-child(4)  { animation-delay: 0.08s }
.cpk-card:nth-child(5)  { animation-delay: 0.10s }
.cpk-card:nth-child(6)  { animation-delay: 0.12s }
.cpk-card:nth-child(7)  { animation-delay: 0.14s }
.cpk-card:nth-child(8)  { animation-delay: 0.16s }

/* ─── Glow rings by rarity ──────────────────────────────────────── */
.cpk-card[data-tier="t1"]         { --cpk-glow: rgba(192,132,252,0.55); --cpk-border: rgba(192,132,252,0.28); }
.cpk-card[data-tier="t2"]         { --cpk-glow: rgba(96,165,250,0.5);   --cpk-border: rgba(96,165,250,0.26); }
.cpk-card[data-tier="t3"]         { --cpk-glow: rgba(74,222,128,0.45);  --cpk-border: rgba(74,222,128,0.24); }
.cpk-card[data-tier="t4"]         { --cpk-glow: rgba(212,168,67,0.45);  --cpk-border: rgba(212,168,67,0.24); }
.cpk-card[data-tier="t5"]         { --cpk-glow: rgba(148,163,184,0.4);  --cpk-border: rgba(148,163,184,0.2); }
.cpk-card[data-tier="super-raro"] { --cpk-glow: rgba(251,146,60,0.65);  --cpk-border: rgba(251,146,60,0.35); }
.cpk-card[data-tier="ultra-raro"] { --cpk-glow: rgba(255,100,170,0.65); --cpk-border: rgba(255,100,170,0.35); }
.cpk-card[data-tier="legendary"]  { --cpk-glow: rgba(255,184,48,0.7);   --cpk-border: rgba(255,184,48,0.40); }
.cpk-card[data-tier="mythical"]   { --cpk-glow: rgba(220,80,255,0.7);   --cpk-border: rgba(220,80,255,0.40); }
.cpk-card[data-shiny="1"]         { --cpk-glow: rgba(253,230,138,0.8);  --cpk-border: rgba(253,230,138,0.45); }

.cpk-card { border-color: var(--cpk-border, rgba(255,255,255,0.08)); }

/* Hover lift */
.cpk-card:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 30px var(--cpk-glow, rgba(160,80,255,0.3)), 0 0 0 1px var(--cpk-border, rgba(160,80,255,0.2));
  border-color: var(--cpk-border, rgba(160,80,255,0.4));
  z-index: 2;
}

/* ─── Top accent bar ─────────────────────────────────────────────── */
.cpk-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, var(--cpk-glow, rgba(160,80,255,0.8)) 50%, transparent 100%);
  opacity: 0.7;
  transition: opacity 0.2s;
}
.cpk-card:hover::before { opacity: 1; }

/* ─── Backdrop glow circle ──────────────────────────────────────── */
.cpk-bg-glow {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  overflow: hidden;
}
.cpk-bg-glow::after {
  content: '';
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--cpk-glow, rgba(160,80,255,0.15)) 0%, transparent 70%);
  transition: transform 0.3s ease;
  transform: scale(0.8);
}
.cpk-card:hover .cpk-bg-glow::after { transform: scale(1.4); }

/* ─── Shiny sparkle overlay ─────────────────────────────────────── */
.cpk-card[data-shiny="1"] .cpk-bg-glow::after {
  background: radial-gradient(circle, rgba(253,230,138,0.18) 0%, rgba(253,186,0,0.08) 40%, transparent 70%);
  animation: cpkShinyPulse 2.5s ease-in-out infinite;
}
@keyframes cpkShinyPulse {
  0%,100% { transform: scale(0.9); opacity: 0.7; }
  50%     { transform: scale(1.3); opacity: 1; }
}

/* Shiny shimmer sweep */
.cpk-card[data-shiny="1"]::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 30%, rgba(253,230,138,0.07) 50%, transparent 70%);
  animation: cpkShimmer 3.5s ease-in-out infinite;
}
@keyframes cpkShimmer {
  0%   { transform: translateX(-100%); }
  50%  { transform: translateX(100%); }
  100% { transform: translateX(100%); }
}

/* ─── Image container ───────────────────────────────────────────── */
.cpk-img-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 130px;
  padding-top: 16px;
}

.cpk-sprite {
  width: 100px;
  height: 100px;
  object-fit: contain;
  image-rendering: auto;
  transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), filter 0.3s ease;
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 4px 12px var(--cpk-glow, rgba(160,80,255,0.3)));
}

.cpk-card:hover .cpk-sprite {
  transform: translateY(-4px) scale(1.10);
  filter: drop-shadow(0 8px 20px var(--cpk-glow, rgba(160,80,255,0.6)));
}

/* ─── Badges floating ───────────────────────────────────────────── */
.cpk-badges {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 3;
}

.cpk-tier-badge {
  font-family: var(--font-title, 'Orbitron', monospace);
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  padding: 3px 7px;
  border-radius: 6px;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  white-space: nowrap;
}

.cpk-tier-t1         { background: rgba(192,132,252,0.18); color: #c084fc; border: 1px solid rgba(192,132,252,0.4); }
.cpk-tier-t2         { background: rgba(96,165,250,0.18);  color: #60a5fa; border: 1px solid rgba(96,165,250,0.4); }
.cpk-tier-t3         { background: rgba(74,222,128,0.18);  color: #4ade80; border: 1px solid rgba(74,222,128,0.4); }
.cpk-tier-t4         { background: rgba(212,168,67,0.18);  color: #d4a843; border: 1px solid rgba(212,168,67,0.4); }
.cpk-tier-t5         { background: rgba(148,163,184,0.15); color: #94a3b8; border: 1px solid rgba(148,163,184,0.3); }
.cpk-tier-super-raro { background: rgba(251,146,60,0.18);  color: #fb923c; border: 1px solid rgba(251,146,60,0.45); }
.cpk-tier-ultra-raro { background: rgba(255,100,170,0.18); color: #ff64aa; border: 1px solid rgba(255,100,170,0.45); }
.cpk-tier-legendary  { background: rgba(255,184,48,0.18);  color: #ffb830; border: 1px solid rgba(255,184,48,0.5); }
.cpk-tier-mythical   { background: rgba(220,80,255,0.18);  color: #dc50ff; border: 1px solid rgba(220,80,255,0.5); }

.cpk-shiny-badge {
  font-size: 9px;
  background: rgba(253,230,138,0.15);
  color: #fde68a;
  border: 1px solid rgba(253,230,138,0.45);
  border-radius: 6px;
  padding: 3px 7px;
  font-weight: 700;
  letter-spacing: 1px;
  font-family: var(--font-title, monospace);
  animation: cpkShineBadge 2s ease-in-out infinite;
}
@keyframes cpkShineBadge {
  0%,100% { box-shadow: 0 0 4px rgba(253,230,138,0.3); }
  50%     { box-shadow: 0 0 10px rgba(253,230,138,0.7), 0 0 20px rgba(253,230,138,0.3); }
}

.cpk-dive-badge {
  font-size: 9px;
  background: rgba(0,204,255,0.15);
  color: #00ccff;
  border: 1px solid rgba(0,204,255,0.35);
  border-radius: 6px;
  padding: 3px 7px;
  font-weight: 700;
  letter-spacing: 1px;
  font-family: var(--font-title, monospace);
}

/* ─── Type icon (top right) ──────────────────────────────────────── */
.cpk-type-icon {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: contain;
  padding: 3px;
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(4px);
  z-index: 3;
}

/* ─── Card body ──────────────────────────────────────────────────── */
.cpk-body {
  padding: 10px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cpk-name {
  font-family: var(--font-title, 'Orbitron', monospace);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #fff;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cpk-price-row {
  display: flex;
  align-items: baseline;
  gap: 5px;
  flex-wrap: wrap;
}

.cpk-price-kk {
  font-family: var(--font-title, monospace);
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 1px;
  color: var(--type-clr, #ffd166);
  line-height: 1;
  text-shadow: 0 0 12px var(--type-clr, rgba(255,209,102,0.6));
}

.cpk-price-brl {
  font-family: var(--font-mono, monospace);
  font-size: 9px;
  color: rgba(255,255,255,0.35);
  letter-spacing: 0.5px;
}

.cpk-no-price {
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  color: rgba(255,255,255,0.25);
  letter-spacing: 1px;
}

/* ─── Broke badge inside card ────────────────────────────────────── */
.cpk-broke {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-body, sans-serif);
  font-size: 9px;
  color: #ff9060;
  background: rgba(255,90,50,0.1);
  border: 1px solid rgba(255,90,50,0.25);
  border-radius: 20px;
  padding: 2px 7px 2px 5px;
  font-weight: 600;
}

/* ─── Buy button ─────────────────────────────────────────────────── */
.cpk-btn {
  width: 100%;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid var(--cpk-border, rgba(160,80,255,0.4));
  background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
  color: #fff;
  font-family: var(--font-title, monospace);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.cpk-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--cpk-glow, rgba(160,80,255,0.25)), transparent);
  opacity: 0;
  transition: opacity 0.2s;
}

.cpk-btn:hover {
  box-shadow: 0 0 16px var(--cpk-glow, rgba(160,80,255,0.4));
  transform: translateY(-1px);
}
.cpk-btn:hover::before { opacity: 1; }

.cpk-btn-icon { font-size: 11px; position: relative; z-index: 1; }
.cpk-btn-label { position: relative; z-index: 1; }

/* ─── Empty state ────────────────────────────────────────────────── */
.cpk-empty {
  grid-column: 1/-1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: rgba(255,255,255,0.25);
  font-family: var(--font-title, monospace);
  letter-spacing: 2px;
  font-size: 11px;
  text-transform: uppercase;
}
.cpk-empty-icon { font-size: 44px; opacity: 0.4; }

/* ─── Skeleton loading ───────────────────────────────────────────── */
.cpk-skeleton {
  border-radius: 16px;
  overflow: hidden;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.05);
  height: 260px;
  animation: cpkSkelPulse 1.5s ease-in-out infinite;
}
@keyframes cpkSkelPulse {
  0%,100% { opacity: 0.4; }
  50%     { opacity: 0.7; }
}

/* ─── Count label upgrade ────────────────────────────────────────── */
.pkg-count-label {
  font-family: var(--font-mono, monospace) !important;
  font-size: 10px !important;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 4px 10px;
  color: rgba(255,255,255,0.4);
  letter-spacing: 1px;
  white-space: nowrap;
}

/* ─── Responsive grid ────────────────────────────────────────────── */
@media (max-width: 900px) {
  .captura-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important;
    gap: 12px !important;
  }
  .captura-wrap { padding: 16px 16px 120px !important; }
}
@media (max-width: 600px) {
  .captura-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 10px !important;
  }
  .captura-wrap { padding: 12px 12px 120px !important; }
  .cpk-img-wrap { height: 110px; }
  .cpk-sprite { width: 84px; height: 84px; }
}
@media (max-width: 360px) {
  .captura-grid {
    grid-template-columns: 1fr !important;
  }
}
    `;
    document.head.appendChild(style);
  }

  // ─── Tier label map ─────────────────────────────────────────────────────────
  const TIER_LABELS = {
    't1': 'T1', 't2': 'T2', 't3': 'T3', 't4': 'T4', 't5': 'T5', 't6': 'T6',
    'super-raro': 'SR', 'ultra-raro': 'UR',
    'legendary': 'LENDÁRIO', 'mythical': 'MÍTICO',
    'raro': 'RARO',
  };

  // ─── Build a single card HTML ────────────────────────────────────────────────
  function buildCard(poke, idx) {
    const isShiny = /^shiny\s/i.test(poke.name);
    const tier = poke.tag || '';
    const pokeType = typeof getTypeFromBanner === 'function' ? getTypeFromBanner(poke.bannerImage) : null;
    const typeColor = (pokeType && typeof TYPE_COLORS !== 'undefined' && TYPE_COLORS[pokeType])
      ? TYPE_COLORS[pokeType]
      : (isShiny ? '#fde68a' : '#a855f7');

    const diveMultiplier = poke.dive ? 1.30 : 1.0;
    const effectivePrice = poke.price ? Math.round(poke.price * diveMultiplier) : poke.price;
    const priceData = typeof formatKK === 'function' ? formatKK(effectivePrice) : null;

    // Sprite
    const thumbSrc = typeof getShowdownStaticSprite === 'function'
      ? getShowdownStaticSprite(poke.name) : '';
    const fallbackSrc = poke.image && !/\.gif$/i.test(poke.image) ? poke.image : '';
    const gifSrc = poke.image || '';

    // Badges
    const tierBadge = tier
      ? `<span class="cpk-tier-badge cpk-tier-${tier}">${TIER_LABELS[tier] || tier.toUpperCase()}</span>`
      : '';
    const shinyBadge = isShiny ? `<span class="cpk-shiny-badge">✦ SHINY</span>` : '';
    const diveBadge = poke.dive ? `<span class="cpk-dive-badge">🔵 DIVE</span>` : '';

    // Type icon
    const typeIconHtml = poke.bannerImage
      ? `<img class="cpk-type-icon" src="${poke.bannerImage}" alt="${pokeType || ''}" loading="lazy" onerror="this.style.display='none'" />`
      : '';

    // Price
    const priceHtml = priceData
      ? `<div class="cpk-price-row">
           <span class="cpk-price-kk" style="--type-clr:${typeColor}">${priceData.label}</span>
           <span class="cpk-price-brl">${priceData.brl}</span>
         </div>`
      : `<span class="cpk-no-price">A definir</span>`;

    // Broke
    const brokeInfo = typeof getBrokeForTag === 'function' ? getBrokeForTag(tier) : null;
    const brokeHtml = brokeInfo
      ? `<div class="cpk-broke"><span>💥</span><span>${brokeInfo.label}</span></div>`
      : '';

    // Img attrs
    const imgFallback = fallbackSrc
      ? `onerror="this.src='${fallbackSrc}'; this.onerror=null;"`
      : `onerror="this.style.opacity='0.2'"`;

    return `<div
      class="cpk-card"
      data-tier="${tier}"
      data-shiny="${isShiny ? 1 : 0}"
      onclick="openCapturaModal(${idx})"
      style="--cpk-type-color:${typeColor}"
    >
      <div class="cpk-bg-glow"></div>
      <div class="cpk-badges">
        ${shinyBadge}
        ${tierBadge}
        ${diveBadge}
      </div>
      ${typeIconHtml}
      <div class="cpk-img-wrap">
        <img
          class="cpk-sprite"
          src="${thumbSrc}"
          data-gif="${gifSrc}"
          alt="${poke.name}"
          loading="lazy"
          ${imgFallback}
        />
      </div>
      <div class="cpk-body">
        <div class="cpk-name">${poke.name}</div>
        ${priceHtml}
        ${brokeHtml}
        <button
          class="cpk-btn"
          onclick="event.stopPropagation(); openCapturaModal(${idx})"
          type="button"
        >
          <span class="cpk-btn-icon">⬟</span>
          <span class="cpk-btn-label">Capturar</span>
        </button>
      </div>
    </div>`;
  }

  // ─── GIF hover swap for cpk cards ───────────────────────────────────────────
  function bindGifHover(container) {
    container.querySelectorAll('.cpk-sprite[data-gif]').forEach(function(img) {
      if (img._cpkBound) return;
      img._cpkBound = true;
      const card = img.closest('.cpk-card');
      if (!card) return;
      const staticSrc = img.src;
      const gifSrc = img.dataset.gif;
      if (!gifSrc) return;
      card.addEventListener('mouseenter', function() {
        if (img.src !== gifSrc) img.src = gifSrc;
      });
      card.addEventListener('mouseleave', function() {
        img.src = staticSrc;
      });
    });
  }

  // ─── Skeleton render (while filtering) ──────────────────────────────────────
  function renderSkeletons(grid, count) {
    let h = '';
    for (let i = 0; i < count; i++) h += `<div class="cpk-skeleton"></div>`;
    grid.innerHTML = h;
  }

  // ─── Main render replacement ─────────────────────────────────────────────────
  window.renderCaptura = function renderCaptura() {
    const grid = document.getElementById('captura-grid');
    if (!grid) return;

    const q = (document.getElementById('captura-search')?.value || '').toLowerCase().trim();
    const tagFilter = document.getElementById('captura-filter')?.value || 'all';
    const typeFilter = window._capturaTypeFilter || 'all';

    const filtered = POKEMONS.filter(function(p) {
      const matchSearch = !q || p.name.toLowerCase().includes(q);
      const matchTag = tagFilter === 'all' ? true
        : tagFilter === 'dive' ? !!p.dive
        : tagFilter === 'none' ? !p.tag
        : p.tag === tagFilter;
      const pokeType = typeof getTypeFromBanner === 'function' ? getTypeFromBanner(p.bannerImage) : null;
      const matchType = typeFilter === 'all' ? true : pokeType === typeFilter;
      return matchSearch && matchTag && matchType;
    });

    // Update counter
    const countEl = document.getElementById('captura-count-label');
    if (countEl) countEl.textContent = filtered.length + (filtered.length === 1 ? ' pokémon' : ' pokémons');

    // Empty state
    if (!filtered.length) {
      grid.innerHTML = `
        <div class="cpk-empty">
          <div class="cpk-empty-icon">🔍</div>
          <div>Nenhum Pokémon encontrado</div>
        </div>`;
      return;
    }

    // Build all cards
    const html = filtered.map(function(poke) {
      return buildCard(poke, poke._idx);
    }).join('');

    grid.innerHTML = html;
    bindGifHover(grid);
  };

  console.log('[CapturaRedesign] ✅ Premium marketplace renderCaptura loaded');

})();
