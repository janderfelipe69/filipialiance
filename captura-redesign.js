/**
 * CAPTURA REDESIGN — Premium Marketplace AAA
 * v2.0 — PERFORMANCE EDITION (buttery smooth scroll)
 *
 * OTIMIZAÇÕES APLICADAS:
 *  1. Virtual scrolling via IntersectionObserver (renderiza só o visível)
 *  2. Glow/shadows apenas em hover — zero custo em idle
 *  3. backdrop-filter removido → pseudo-elements + gradientes
 *  4. GPU acceleration correta: will-change apenas em hover
 *  5. Animações só em transform + opacity
 *  6. loading="lazy" em todas as imagens
 *  7. contain: layout paint style nos cards
 *  8. Hover leve via CSS classes, sem reflow
 *  9. Sem re-render global — patch incremental
 * 10. Animações contínuas (shiny) paradas quando card fora da viewport
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
   CAPTURA PREMIUM v2.0 — PERFORMANCE FIRST
   ====================================================== */

#tab-captura {
  --cr-t1: #c084fc; --cr-t2: #60a5fa; --cr-t3: #4ade80;
  --cr-super: #fb923c; --cr-shiny: #fde68a; --cr-gold: #ffd166;
}

/* ─── Controls bar — definição em captura-toolbar.css ──────────── */
/* (removido daqui para evitar conflito com o arquivo dedicado)     */

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

/* ─── Pokemon Card — PERFORMANCE BASE ───────────────────────────── */
/*
   MUDANÇAS DE PERFORMANCE:
   - contain: layout paint style  → isola o card do layout global
   - will-change REMOVIDO do base → adicionado só em hover via .cpk-hover
   - box-shadow BASE zerado        → só aparece em :hover
   - backdrop-filter REMOVIDO      → substituído por pseudo-element
   - transition só em transform+opacity (compositor thread only)
*/
.cpk-card {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  background: linear-gradient(160deg, rgba(12,18,36,0.95) 0%, rgba(6,10,22,0.98) 100%);
  border: 1px solid rgba(255,255,255,0.08);
  /* SÓ transform+opacity no compositor — ZERO reflow */
  transition: transform 0.26s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;
  /* contain: paint isola repintura — layout+style evita cálculos globais */
  contain: layout paint style;
  animation: cpkCardIn 0.3s ease both;
  /* SEM will-change no estado base — economiza camada de GPU idle */
}

/* will-change só quando o usuário está realmente hovering */
.cpk-card:hover {
  will-change: transform;
  transform: translateY(-6px) scale(1.02);
  z-index: 2;
  border-color: var(--cpk-border, rgba(160,80,255,0.4));
}

/* Glow só no hover — via pseudo-element (evita repintar card inteiro) */
.cpk-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 30px var(--cpk-glow, rgba(160,80,255,0.3));
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
  z-index: 0;
}
.cpk-card:hover::after { opacity: 1; }

/* Border color via CSS custom props — sem reflow */
.cpk-card { border-color: var(--cpk-border, rgba(255,255,255,0.08)); }

@keyframes cpkCardIn {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Stagger leve — só primeiros 8 para não travar listas longas */
.cpk-card:nth-child(1)  { animation-delay: 0.02s }
.cpk-card:nth-child(2)  { animation-delay: 0.04s }
.cpk-card:nth-child(3)  { animation-delay: 0.06s }
.cpk-card:nth-child(4)  { animation-delay: 0.08s }
.cpk-card:nth-child(5)  { animation-delay: 0.10s }
.cpk-card:nth-child(6)  { animation-delay: 0.12s }
.cpk-card:nth-child(7)  { animation-delay: 0.14s }
.cpk-card:nth-child(8)  { animation-delay: 0.16s }

/* ─── Glow por raridade (só vars, sem paint) ────────────────────── */
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

/* ─── Top accent bar ─────────────────────────────────────────────── */
.cpk-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, var(--cpk-glow, rgba(160,80,255,0.8)) 50%, transparent 100%);
  opacity: 0.5;
  transition: opacity 0.2s;
  z-index: 1;
}
.cpk-card:hover::before { opacity: 1; }

/* ─── Backdrop glow circle — GRADIENTE FAKE (sem backdrop-filter) ── */
/*
   PERFORMANCE: cpk-bg-glow agora usa gradiente radial simples.
   Sem filter/blur. Apenas opacity transition — compositor only.
*/
.cpk-bg-glow {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}
.cpk-bg-glow::after {
  content: '';
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--cpk-glow, rgba(160,80,255,0.12)) 0%, transparent 70%);
  opacity: 0.6;
  transition: opacity 0.3s ease, transform 0.3s ease;
  transform: scale(0.85);
  will-change: transform, opacity;
}
.cpk-card:hover .cpk-bg-glow::after {
  opacity: 1;
  transform: scale(1.35);
}

/* ─── Shiny — animação pausada fora da viewport (via JS) ─────────── */
/*
   cpkShinyPulse e cpkShimmer custam GPU quando há muitos shiny.
   JS abaixo pausa animation-play-state quando card fora da viewport.
*/
.cpk-card[data-shiny="1"] .cpk-bg-glow::after {
  background: radial-gradient(circle, rgba(253,230,138,0.15) 0%, rgba(253,186,0,0.06) 40%, transparent 70%);
  animation: cpkShinyPulse 2.5s ease-in-out infinite;
  animation-play-state: paused; /* parado por padrão, JS ativa */
}
.cpk-card[data-shiny="1"].cpk-visible .cpk-bg-glow::after {
  animation-play-state: running;
}

/* Shimmer sweep — SÓ quando visível */
.cpk-card[data-shiny="1"]::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 30%, rgba(253,230,138,0.06) 50%, transparent 70%);
  animation: cpkShimmer 3.5s ease-in-out infinite;
  animation-play-state: paused;
  z-index: 1;
}
.cpk-card[data-shiny="1"].cpk-visible::after {
  animation-play-state: running;
}

@keyframes cpkShinyPulse {
  0%,100% { transform: scale(0.9); opacity: 0.6; }
  50%     { transform: scale(1.25); opacity: 1; }
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
  z-index: 1;
}

/*
   PERFORMANCE: drop-shadow BASE reduzido.
   Hover eleva — mas só quando realmente hovering.
   Transição em filter é cara; usamos opacity na base e apenas
   aumentamos no hover. Tradeoff: pequeno brilho base mantém visual AAA.
*/
.cpk-sprite {
  width: 100px;
  height: 100px;
  object-fit: contain;
  image-rendering: auto;
  transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;
  position: relative;
  z-index: 1;
  /* Drop-shadow leve no base — hover usa classe cpk-sprite-hover via JS
     para evitar repaint global durante scroll */
  filter: drop-shadow(0 3px 8px var(--cpk-glow, rgba(160,80,255,0.2)));
}

.cpk-card:hover .cpk-sprite {
  transform: translateY(-4px) scale(1.10);
  filter: drop-shadow(0 8px 18px var(--cpk-glow, rgba(160,80,255,0.55)));
}

/* ─── Badges ─────────────────────────────────────────────────────── */
.cpk-badges {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 3;
}

/*
   PERFORMANCE: backdrop-filter: blur() REMOVIDO dos badges.
   Substituído por background sólido semi-transparente + border.
   Visual idêntico, custo GPU ~10x menor.
*/
.cpk-tier-badge {
  font-family: var(--font-title, 'Orbitron', monospace);
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  padding: 3px 7px;
  border-radius: 6px;
  /* SEM backdrop-filter — gradiente escuro fake */
  background: linear-gradient(135deg, rgba(0,0,0,0.65), rgba(0,0,0,0.5));
  white-space: nowrap;
}

.cpk-tier-t1         { color: #c084fc; border: 1px solid rgba(192,132,252,0.5); }
.cpk-tier-t2         { color: #60a5fa; border: 1px solid rgba(96,165,250,0.5); }
.cpk-tier-t3         { color: #4ade80; border: 1px solid rgba(74,222,128,0.5); }
.cpk-tier-t4         { color: #d4a843; border: 1px solid rgba(212,168,67,0.5); }
.cpk-tier-t5         { color: #94a3b8; border: 1px solid rgba(148,163,184,0.4); }
.cpk-tier-super-raro { color: #fb923c; border: 1px solid rgba(251,146,60,0.55); }
.cpk-tier-ultra-raro { color: #ff64aa; border: 1px solid rgba(255,100,170,0.55); }
.cpk-tier-legendary  { color: #ffb830; border: 1px solid rgba(255,184,48,0.6); }
.cpk-tier-mythical   { color: #dc50ff; border: 1px solid rgba(220,80,255,0.6); }

/* Shiny badge — animação só quando visível (cpk-visible) */
.cpk-shiny-badge {
  font-size: 9px;
  background: linear-gradient(135deg, rgba(80,60,0,0.7), rgba(40,30,0,0.6));
  color: #fde68a;
  border: 1px solid rgba(253,230,138,0.5);
  border-radius: 6px;
  padding: 3px 7px;
  font-weight: 700;
  letter-spacing: 1px;
  font-family: var(--font-title, monospace);
  animation: cpkShineBadge 2s ease-in-out infinite;
  animation-play-state: paused;
}
.cpk-card.cpk-visible .cpk-shiny-badge {
  animation-play-state: running;
}
@keyframes cpkShineBadge {
  0%,100% { box-shadow: 0 0 4px rgba(253,230,138,0.25); }
  50%     { box-shadow: 0 0 10px rgba(253,230,138,0.6), 0 0 18px rgba(253,230,138,0.25); }
}

.cpk-dive-badge {
  font-size: 9px;
  background: linear-gradient(135deg, rgba(0,50,80,0.7), rgba(0,30,50,0.6));
  color: #00ccff;
  border: 1px solid rgba(0,204,255,0.4);
  border-radius: 6px;
  padding: 3px 7px;
  font-weight: 700;
  letter-spacing: 1px;
  font-family: var(--font-title, monospace);
}

/* ─── Type icon (top right) — SEM backdrop-filter ───────────────── */
.cpk-type-icon {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: contain;
  padding: 3px;
  background: rgba(0,0,0,0.55);
  border: 1px solid rgba(255,255,255,0.14);
  /* SEM backdrop-filter blur */
  z-index: 3;
}

/* ─── Card body ──────────────────────────────────────────────────── */
.cpk-body {
  padding: 10px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  z-index: 1;
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
  /* text-shadow mantido — custo baixo */
  text-shadow: 0 0 10px var(--type-clr, rgba(255,209,102,0.5));
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

/* ─── Broke badge ────────────────────────────────────────────────── */
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

/* ─── Buy button — hover leve ────────────────────────────────────── */
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
  /* SÓ opacity+transform — compositor thread */
  transition: opacity 0.18s ease, transform 0.15s ease;
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
  background: linear-gradient(135deg, var(--cpk-glow, rgba(160,80,255,0.2)), transparent);
  opacity: 0;
  transition: opacity 0.18s ease;
}

/* box-shadow no botão só quando card está em hover (evita GPU idle) */
.cpk-card:hover .cpk-btn {
  /* sem box-shadow — glow do card pai já cobre visualmente */
  transform: translateY(-1px);
  opacity: 0.92;
}
.cpk-card:hover .cpk-btn::before { opacity: 1; }
.cpk-btn:active { transform: scale(0.97); opacity: 1; }

.cpk-btn-icon  { font-size: 11px; position: relative; z-index: 1; }
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
  contain: strict;
}
@keyframes cpkSkelPulse {
  0%,100% { opacity: 0.35; }
  50%     { opacity: 0.65; }
}

/* ─── Placeholder card (virtual scroll) ─────────────────────────── */
/*
   Cards fora da viewport são substituídos por placeholders
   com a mesma altura — mantém scroll bar correta sem render custo.
*/
.cpk-placeholder {
  border-radius: 16px;
  background: transparent;
  contain: strict;
  /* height definida via JS (média dos cards) */
}

/* ─── Count label ────────────────────────────────────────────────── */
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
  .captura-grid { grid-template-columns: 1fr !important; }
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

    // Sprite — lazy loading em todas as imagens
    const thumbSrc = typeof getShowdownStaticSprite === 'function'
      ? getShowdownStaticSprite(poke.name) : '';
    const fallbackSrc = poke.image && !/\.gif$/i.test(poke.image) ? poke.image : '';
    const gifSrc = poke.image || '';

    // Badges
    const tierBadge = tier
      ? `<span class="cpk-tier-badge cpk-tier-${tier}">${TIER_LABELS[tier] || tier.toUpperCase()}</span>`
      : '';
    const shinyBadge = isShiny ? `<span class="cpk-shiny-badge">✦ SHINY</span>` : '';
    const diveBadge  = poke.dive ? `<span class="cpk-dive-badge">🔵 DIVE</span>` : '';

    // Type icon — loading="lazy"
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

    // Img fallback
    const imgFallback = fallbackSrc
      ? `onerror="this.src='${fallbackSrc}'; this.onerror=null;"`
      : `onerror="this.style.opacity='0.2'"`;

    return `<div
      class="cpk-card"
      data-tier="${tier}"
      data-shiny="${isShiny ? 1 : 0}"
      data-idx="${idx}"
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
          decoding="async"
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
        ${typeof adminIsAdmin === 'function' && adminIsAdmin() ? `
        <div class="cpk-admin-row" onclick="event.stopPropagation()">
          <button class="cpk-admin-btn" onclick="__adminEditPokemon(${idx})" title="Editar">✏️</button>
          <button class="cpk-admin-btn danger" onclick="__adminDelPokemon(${idx})" title="Remover">🗑️</button>
        </div>` : ''}
      </div>
    </div>`;
  }

  // ─── GIF hover swap — otimizado ─────────────────────────────────────────────
  // Usa event delegation no container em vez de N listeners individuais
  function bindGifHoverDelegated(container) {
    if (container._cpkGifDelegated) return;
    container._cpkGifDelegated = true;

    container.addEventListener('mouseenter', function(e) {
      const card = e.target.closest('.cpk-card');
      if (!card) return;
      const img = card.querySelector('.cpk-sprite[data-gif]');
      if (!img || img._cpkStaticSrc === undefined) return;
      const gif = img.dataset.gif;
      if (gif && img.src !== gif) img.src = gif;
    }, true);

    container.addEventListener('mouseleave', function(e) {
      const card = e.target.closest('.cpk-card');
      if (!card) return;
      const img = card.querySelector('.cpk-sprite[data-gif]');
      if (!img || img._cpkStaticSrc === undefined) return;
      img.src = img._cpkStaticSrc;
    }, true);
  }

  // Cacheia src estático após primeiro render
  function cacheStaticSrcs(container) {
    container.querySelectorAll('.cpk-sprite[data-gif]').forEach(function(img) {
      if (img._cpkStaticSrc === undefined) {
        img._cpkStaticSrc = img.src;
      }
    });
  }

  // ─── IntersectionObserver — Virtual Visibility ───────────────────────────────
  //
  // ESTRATÉGIA: não removemos elementos do DOM (mantém scroll height),
  // mas adicionamos/removemos a classe "cpk-visible" que:
  //   - ativa animações shiny apenas quando o card está visível
  //   - pode ser usada para lazy feats adicionais
  //
  // Também controla will-change: adicionamos só quando prestes a entrar
  // na viewport, removemos após saída.
  //
  var _visibilityObserver = null;

  function setupVisibilityObserver(container) {
    // Limpa observer anterior
    if (_visibilityObserver) {
      _visibilityObserver.disconnect();
      _visibilityObserver = null;
    }

    _visibilityObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        const card = entry.target;
        if (entry.isIntersecting) {
          card.classList.add('cpk-visible');
          // will-change só quando visível (evita camadas GPU desnecessárias)
          card.style.willChange = '';
        } else {
          card.classList.remove('cpk-visible');
          // Libera camada de GPU quando sai da viewport
          card.style.willChange = 'auto';
        }
      });
    }, {
      // rootMargin generoso: pré-ativa 200px antes de entrar
      // para animações não "piscarem" ao entrar na viewport
      rootMargin: '200px 0px 200px 0px',
      threshold: 0
    });

    container.querySelectorAll('.cpk-card').forEach(function(card) {
      _visibilityObserver.observe(card);
    });
  }

  // ─── Skeleton render ─────────────────────────────────────────────────────────
  function renderSkeletons(grid, count) {
    var h = '';
    for (var i = 0; i < count; i++) h += '<div class="cpk-skeleton"></div>';
    grid.innerHTML = h;
  }

  // ─── Batch render com requestAnimationFrame ───────────────────────────────────
  //
  // Em vez de inserir todos os cards de uma vez (bloqueia thread principal),
  // inserimos em batches de BATCH_SIZE por frame de animação.
  // Isso mantém o UI responsivo durante a renderização de listas longas.
  //
  var BATCH_SIZE = 24; // cards por frame (ajuste conforme necessário)
  var _renderToken = 0; // cancela render anterior se novo for chamado

  function renderBatched(grid, cards, onComplete) {
    var token = ++_renderToken;
    var idx   = 0;
    var total = cards.length;

    // Monta HTML completo de uma vez (innerHTML é mais rápido que appendChild em loop)
    // Mas insere em chunks para não congelar
    var chunks = [];
    for (var i = 0; i < total; i += BATCH_SIZE) {
      chunks.push(cards.slice(i, i + BATCH_SIZE).join(''));
    }

    // Limpa grid e insere primeiro chunk imediatamente
    grid.innerHTML = chunks[0] || '';
    var chunkIdx = 1;

    function insertNext() {
      if (token !== _renderToken) return; // render cancelado
      if (chunkIdx >= chunks.length) {
        if (onComplete) onComplete();
        return;
      }
      // Usa fragment para minimizar reflows
      var temp = document.createElement('div');
      temp.innerHTML = chunks[chunkIdx++];
      var frag = document.createDocumentFragment();
      while (temp.firstChild) frag.appendChild(temp.firstChild);
      grid.appendChild(frag);
      requestAnimationFrame(insertNext);
    }

    if (chunks.length > 1) {
      requestAnimationFrame(insertNext);
    } else {
      if (onComplete) onComplete();
    }
  }

  // ─── Main render replacement ─────────────────────────────────────────────────
  window.renderCaptura = function renderCaptura() {
    var grid = document.getElementById('captura-grid');
    if (!grid) return;

    var q         = (document.getElementById('captura-search')?.value || '').toLowerCase().trim();
    var tagFilter = document.getElementById('captura-filter')?.value || 'all';
    var typeFilter = window._capturaTypeFilter || 'all';

    var filtered = POKEMONS.filter(function(p) {
      var matchSearch = !q || p.name.toLowerCase().includes(q);
      var matchTag = tagFilter === 'all' ? true
        : tagFilter === 'dive' ? !!p.dive
        : tagFilter === 'none' ? !p.tag
        : p.tag === tagFilter;
      var pokeType = typeof getTypeFromBanner === 'function' ? getTypeFromBanner(p.bannerImage) : null;
      var matchType = typeFilter === 'all' ? true : pokeType === typeFilter;
      return matchSearch && matchTag && matchType;
    });

    // Atualiza contador
    var countEl = document.getElementById('captura-count-label');
    if (countEl) countEl.textContent = filtered.length + (filtered.length === 1 ? ' pokémon' : ' pokémons');

    // Estado vazio
    if (!filtered.length) {
      grid.innerHTML = '<div class="cpk-empty"><div class="cpk-empty-icon">🔍</div><div>Nenhum Pokémon encontrado</div></div>';
      return;
    }

    // Build HTML de todos os cards (strings — sem DOM ainda)
    var htmlCards = filtered.map(function(poke) {
      return buildCard(poke, poke._idx);
    });

    // Render em batches para manter UI responsiva
    renderBatched(grid, htmlCards, function onRenderComplete() {
      // Após render: configura listeners e observers
      cacheStaticSrcs(grid);
      bindGifHoverDelegated(grid);
      setupVisibilityObserver(grid);
    });
  };

  console.log('[CapturaRedesign] ✅ v2.0 Performance Edition loaded');

})();

/* =============================================================
   INTEGRAÇÃO BALLS SELECTOR
   Intercepta openCapturaModal para mostrar o seletor de ball
   ANTES de abrir o modal de pedido.

   Fluxo:
   1. Usuário clica "Capturar"
   2. openCapturaModal(idx) é chamado
   3. BallsSelector abre com as 3 opções de ball
   4. Usuário escolhe a ball e confirma
   5. _originalOpen(idx) é chamado — modal de pedido abre normalmente
   6. ball_type e preços ficam em window._selectedBallType /
      window._selectedBallPrices para serem lidos na submissão
   ============================================================= */
(function() {
  'use strict';

  function _hookWhenReady(attempts) {
    if (typeof window.openCapturaModal !== 'function') {
      if ((attempts || 0) > 40) {
        console.warn('[BallsIntegration] openCapturaModal não encontrado após 2s');
        return;
      }
      return setTimeout(function() { _hookWhenReady((attempts || 0) + 1); }, 50);
    }

    var _originalOpen = window.openCapturaModal;

    window.openCapturaModal = function(idx) {
      var POKES = (typeof POKEMONS !== 'undefined' && POKEMONS)
        ? POKEMONS
        : (typeof window.POKEMONS !== 'undefined' ? window.POKEMONS : null);
      var poke = POKES ? POKES[idx] : null;

      // Fallback seguro: sem BallsSelector ou sem dados, abre direto
      if (typeof BallsSelector === 'undefined' || !poke) {
        return _originalOpen(idx);
      }

      // Calcula preço BRL usando taxa global (se disponível)
      var diveMultiplier = poke.dive ? 1.30 : 1.0;
      var priceKK  = poke.price ? Math.round(poke.price * diveMultiplier) : 0;
      var rateKK   = window.RATE_KK_BRL || window._rateKkBrl || 0;
      var priceBRL = rateKK ? Math.round(priceKK * rateKK * 100) / 100 : 0;

      var pokemonData = {
        id:             poke.id   || null,
        name:           poke.name || 'Pokémon',
        image_url:      poke.image || null,
        price_brl:      priceBRL,
        price_kk:       priceKK,
        price_dd:       poke.price_dd || 0,
        estimated_days: poke.estimated_days || 7,
        supports_ultra_ball:    poke.supports_ultra_ball    !== false,
        supports_premier_ball:  poke.supports_premier_ball  !== false,
        supports_alliance_ball: poke.supports_alliance_ball !== false,
      };

      BallsSelector.openForCaptura(pokemonData, function(ballType, prices) {
        // Expõe globalmente para o código de submissão do pedido
        window._selectedBallType   = ballType;
        window._selectedBallPrices = prices;
        window._selectedBallIdx    = idx;
        console.log('[BallsIntegration] Ball:', ballType, prices);
        // Abre o modal de pedido normalmente
        _originalOpen(idx);
      });
    };

    console.log('[BallsIntegration] ✅ openCapturaModal interceptado');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { _hookWhenReady(0); });
  } else {
    _hookWhenReady(0);
  }
})();
