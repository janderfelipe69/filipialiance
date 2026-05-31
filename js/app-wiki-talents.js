// ============================================================
// app-wiki-talents.js — extraído de app.js (refactor: quebra do monólito)
// PokéTalents.
// ESCOPO GLOBAL (NÃO é IIFE): preserva os mesmos globais que estavam
// em app.js. DEVE carregar logo após app.js no index.html — não reordenar.
// ============================================================
// ===================== WIKI: POKETALENTS =====================
// Mapa tipo → { bannerUrl, iconUrl, color, rgb }
var TALENT_TYPE_META = {
  water:    { banner: 'https://i.imgur.com/zpRe43i.png', color: '#00aaff', rgb: '0,170,255',     emoji: '💧' },
  steel:    { banner: 'https://i.imgur.com/GleRjiM.png', color: '#ccddee', rgb: '204,221,238',   emoji: '⚙️' },
  rock:     { banner: 'https://i.imgur.com/GvD1Mtq.png', color: '#aa8855', rgb: '170,136,85',    emoji: '🪨' },
  psychic:  { banner: 'https://i.imgur.com/ASiZi1K.png', color: '#ff44bb', rgb: '255,68,187',    emoji: '🔮' },
  poison:   { banner: 'https://i.imgur.com/xfX0ReE.png', color: '#aa00cc', rgb: '170,0,204',     emoji: '☠️' },
  normal:   { banner: 'https://i.imgur.com/w2ChsIe.png', color: '#bbbbbb', rgb: '187,187,187',   emoji: '⭐' },
  ice:      { banner: 'https://i.imgur.com/ssFz0sA.png', color: '#80e8ff', rgb: '128,232,255',   emoji: '❄️' },
  ground:   { banner: 'https://i.imgur.com/JPcD2l3.png', color: '#cc8800', rgb: '204,136,0',     emoji: '🌍' },
  fire:     { banner: 'https://i.imgur.com/O8TONGE.png', color: '#ff6a00', rgb: '255,106,0',     emoji: '🔥' },
  grass:    { banner: 'https://i.imgur.com/YjKxtoE.png', color: '#44cc00', rgb: '68,204,0',      emoji: '🌿' },
  electric: { banner: 'https://i.imgur.com/Yv2WEYc.png', color: '#ffe600', rgb: '255,230,0',     emoji: '⚡' },
  dark:     { banner: 'https://i.imgur.com/7Luj4az.png', color: '#6666cc', rgb: '102,102,204',   emoji: '🌑' },
  dragon:   { banner: 'https://i.imgur.com/o7JWbaN.png', color: '#ffaa00', rgb: '255,170,0',     emoji: '🐉' },
  ghost:    { banner: 'https://i.imgur.com/HuybbPn.png', color: '#9900ff', rgb: '153,0,255',     emoji: '👻' },
  fairy:    { banner: 'https://i.imgur.com/j3HaXTh.png', color: '#ff66bb', rgb: '255,102,187',   emoji: '🌸' },
  flying:   { banner: 'https://i.imgur.com/npGjQae.png', color: '#aabbff', rgb: '170,187,255',   emoji: '🦅' },
  bug:      { banner: 'https://i.imgur.com/V4IXR51.png', color: '#99cc00', rgb: '153,204,0',     emoji: '🐛' },
  fighting: { banner: 'https://i.imgur.com/OKsJXh7.png', color: '#ff4400', rgb: '255,68,0',      emoji: '🥊' },
};

// Resolve o tipo de um pacote Talent pelo nome
function getTalentPkgType(pkgName) {
  var n = pkgName.toLowerCase();
  var keys = Object.keys(TALENT_TYPE_META);
  for (var i = 0; i < keys.length; i++) {
    if (n.includes(keys[i])) return keys[i];
  }
  if (n.includes('figthing') || n.includes('fighting')) return 'fighting';
  return null;
}

var _talentPanelOpen = null; // tipo atualmente aberto no painel lateral

function renderTalents() {
  var el = document.getElementById('wiki-talents-content');
  if (!el) return;

  // Injeta estilos uma única vez
  if (!document.getElementById('talent-styles-v2')) {
    var s = document.createElement('style');
    s.id = 'talent-styles-v2';
    s.textContent = `
      /* ── Layout geral ── */
      .tpg { padding: 0 0 48px; }

      /* ── Hero ── */
      .tpg-hero {
        text-align: center; padding: 30px 20px 22px;
        background: linear-gradient(180deg, rgba(255,224,102,0.07) 0%, transparent 100%);
        border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 0;
      }
      .tpg-hero-icon { font-size: 40px; margin-bottom: 8px; }
      .tpg-hero-title {
        font-family: var(--font-title); font-size: 20px; font-weight: 900;
        letter-spacing: 2.5px; text-transform: uppercase; color: #ffe066;
        text-shadow: 0 0 20px rgba(255,224,102,0.35);
      }
      .tpg-hero-desc {
        font-size: 12.5px; color: rgba(255,255,255,0.4);
        margin-top: 7px; line-height: 1.65; max-width: 560px; margin-left: auto; margin-right: auto;
      }

      /* ── Body com painel lateral ── */
      .tpg-body {
        display: flex; gap: 0; min-height: 500px;
        border-top: 1px solid rgba(255,255,255,0.05);
      }

      /* ── Coluna esquerda: lista de tipos ── */
      .tpg-list {
        width: 220px; min-width: 180px; flex-shrink: 0;
        border-right: 1px solid rgba(255,255,255,0.06);
        overflow-y: auto; padding: 14px 10px;
        display: flex; flex-direction: column; gap: 4px;
      }
      .tpg-section-label {
        font-size: 10px; font-weight: 700; letter-spacing: 1.8px;
        text-transform: uppercase; color: rgba(255,255,255,0.25);
        padding: 10px 8px 6px; margin-top: 4px;
      }
      .tpg-section-label:first-child { margin-top: 0; }

      .tpg-type-btn {
        display: flex; align-items: center; gap: 10px;
        padding: 9px 10px; border-radius: 10px;
        background: transparent; border: 1px solid transparent;
        cursor: pointer; transition: background 0.15s, border-color 0.15s;
        width: 100%; text-align: left;
      }
      .tpg-type-btn:hover {
        background: rgba(var(--tb-rgb), 0.08);
        border-color: rgba(var(--tb-rgb), 0.2);
      }
      .tpg-type-btn.active {
        background: rgba(var(--tb-rgb), 0.14);
        border-color: rgba(var(--tb-rgb), 0.4);
        box-shadow: 0 0 0 1px rgba(var(--tb-rgb), 0.15) inset;
      }
      .tpg-type-btn-icon {
        width: 32px; height: 32px; border-radius: 50%;
        overflow: hidden; flex-shrink: 0;
        border: 2px solid rgba(var(--tb-rgb), 0.35);
        box-shadow: 0 0 8px rgba(var(--tb-rgb), 0.25);
      }
      .tpg-type-btn-icon img { width: 100%; height: 100%; object-fit: cover; }
      .tpg-type-btn-label {
        font-family: var(--font-title); font-size: 12px; font-weight: 700;
        letter-spacing: 1px; text-transform: uppercase;
        color: rgba(var(--tb-rgb), 1);
        flex: 1;
      }
      .tpg-type-btn-arrow {
        font-size: 10px; color: rgba(var(--tb-rgb), 0.5);
        transition: transform 0.15s;
      }
      .tpg-type-btn.active .tpg-type-btn-arrow { transform: translateX(3px); }

      /* Special buttons */
      .tpg-special-btn {
        display: flex; align-items: center; gap: 10px;
        padding: 9px 10px; border-radius: 10px;
        background: transparent; border: 1px solid transparent;
        cursor: pointer; transition: background 0.15s, border-color 0.15s;
        width: 100%; text-align: left;
      }
      .tpg-special-btn:hover { background: rgba(var(--sb-rgb),0.08); border-color: rgba(var(--sb-rgb),0.2); }
      .tpg-special-btn.active { background: rgba(var(--sb-rgb),0.14); border-color: rgba(var(--sb-rgb),0.4); }
      .tpg-special-btn-icon {
        width: 32px; height: 32px; border-radius: 50%;
        background: rgba(var(--sb-rgb),0.15);
        border: 2px solid rgba(var(--sb-rgb),0.35);
        display: flex; align-items: center; justify-content: center;
        font-size: 16px; flex-shrink: 0;
      }
      .tpg-special-btn-label {
        font-family: var(--font-title); font-size: 12px; font-weight: 700;
        letter-spacing: 1px; text-transform: uppercase; color: rgba(var(--sb-rgb),1); flex: 1;
      }

      /* ── Painel direito: detalhe ── */
      .tpg-panel {
        flex: 1; min-width: 0;
        padding: 24px 24px 32px;
        display: flex; flex-direction: column; gap: 20px;
      }

      /* Estado vazio */
      .tpg-empty {
        flex: 1; display: flex; flex-direction: column;
        align-items: center; justify-content: center; gap: 10px;
        color: rgba(255,255,255,0.2); text-align: center;
        font-size: 13px; padding: 60px 20px;
      }
      .tpg-empty-icon { font-size: 36px; opacity: 0.35; margin-bottom: 4px; }

      /* Cabeçalho do painel */
      .tpg-panel-header {
        display: flex; align-items: center; gap: 14px;
        padding-bottom: 16px;
        border-bottom: 1px solid rgba(var(--pd-rgb,255,255,255), 0.1);
      }
      .tpg-panel-banner {
        width: 54px; height: 54px; border-radius: 50%;
        overflow: hidden; flex-shrink: 0;
        border: 2px solid rgba(var(--pd-rgb,255,255,255), 0.4);
        box-shadow: 0 0 18px rgba(var(--pd-rgb,255,255,255), 0.25);
      }
      .tpg-panel-banner img { width: 100%; height: 100%; object-fit: cover; }
      .tpg-panel-banner-emoji {
        width: 54px; height: 54px; border-radius: 50%;
        background: rgba(var(--pd-rgb,255,255,255),0.1);
        border: 2px solid rgba(var(--pd-rgb,255,255,255),0.4);
        display: flex; align-items: center; justify-content: center;
        font-size: 26px; flex-shrink: 0;
      }
      .tpg-panel-info { flex: 1; }
      .tpg-panel-name {
        font-family: var(--font-title); font-size: 18px; font-weight: 900;
        letter-spacing: 2px; text-transform: uppercase;
        color: rgb(var(--pd-rgb,255,255,255));
        text-shadow: 0 0 20px rgba(var(--pd-rgb,255,255,255),0.3);
      }
      .tpg-panel-sub { font-size: 12px; color: rgba(255,255,255,0.38); margin-top: 3px; }

      /* Buff chips */
      .tpg-buffs { display: flex; flex-wrap: wrap; gap: 8px; }
      .tpg-buff-chip {
        display: flex; align-items: center; gap: 7px;
        padding: 7px 13px; border-radius: 20px;
        background: rgba(var(--pd-rgb,255,255,255),0.08);
        border: 1px solid rgba(var(--pd-rgb,255,255,255),0.22);
      }
      .tpg-buff-chip-icon { font-size: 14px; }
      .tpg-buff-chip-label { font-size: 11px; color: rgba(255,255,255,0.45); font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
      .tpg-buff-chip-val {
        font-family: var(--font-mono,monospace); font-size: 15px; font-weight: 900;
        color: rgb(var(--pd-rgb,255,255,255));
        text-shadow: 0 0 8px rgba(var(--pd-rgb,255,255,255),0.5);
        margin-left: 2px;
      }

      /* Seção de ingredientes */
      .tpg-ingr-title {
        font-size: 10px; font-weight: 700; letter-spacing: 2px;
        text-transform: uppercase; color: rgba(255,255,255,0.3);
        margin-bottom: 10px;
      }

      /* Slot tabs */
      .tpg-slots { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
      .tpg-slot-btn {
        padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 700;
        letter-spacing: 0.5px; cursor: pointer;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.12);
        color: rgba(255,255,255,0.5);
        transition: background 0.15s, border-color 0.15s, color 0.15s;
      }
      .tpg-slot-btn.active {
        background: rgba(var(--pd-rgb,255,255,255),0.14);
        border-color: rgba(var(--pd-rgb,255,255,255),0.45);
        color: rgb(var(--pd-rgb,255,255,255));
      }

      /* Lista de ingredientes do slot ativo */
      .tpg-ingr-list { display: flex; flex-direction: column; gap: 6px; }
      .tpg-ingr-row {
        display: flex; align-items: center; gap: 10px;
        padding: 9px 12px; border-radius: 10px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.07);
        transition: background 0.15s;
      }
      .tpg-ingr-row:hover { background: rgba(var(--pd-rgb,255,255,255),0.06); }
      .tpg-ingr-img {
        width: 30px; height: 30px; object-fit: contain;
        border-radius: 6px;
        background: rgba(255,255,255,0.04);
        flex-shrink: 0;
      }
      .tpg-ingr-img-placeholder {
        width: 30px; height: 30px; border-radius: 6px;
        background: rgba(255,255,255,0.06);
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; flex-shrink: 0;
      }
      .tpg-ingr-name {
        flex: 1; font-size: 13px; color: rgba(255,255,255,0.75);
        font-weight: 500;
      }
      .tpg-ingr-qty {
        font-family: var(--font-mono,monospace); font-size: 13px; font-weight: 700;
        color: rgb(var(--pd-rgb,255,255,255));
        background: rgba(var(--pd-rgb,255,255,255),0.1);
        border: 1px solid rgba(var(--pd-rgb,255,255,255),0.2);
        padding: 2px 8px; border-radius: 6px;
        white-space: nowrap;
      }
      .tpg-ingr-or {
        font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
        color: rgba(255,255,255,0.2); text-align: center; padding: 2px 0;
        position: relative;
      }
      .tpg-ingr-or::before, .tpg-ingr-or::after {
        content: ''; position: absolute; top: 50%; width: 42%;
        height: 1px; background: rgba(255,255,255,0.08);
      }
      .tpg-ingr-or::before { left: 0; }
      .tpg-ingr-or::after { right: 0; }

      /* Botão ir para pacotes */
      .tpg-goto-btn {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 11px 20px; border-radius: 10px;
        font-family: var(--font-title); font-size: 12px; font-weight: 700;
        letter-spacing: 1px; text-transform: uppercase;
        background: rgba(var(--pd-rgb,255,255,255),0.12);
        border: 1px solid rgba(var(--pd-rgb,255,255,255),0.35);
        color: rgb(var(--pd-rgb,255,255,255));
        cursor: pointer; transition: background 0.15s, transform 0.1s;
        align-self: flex-start; margin-top: 6px;
        text-shadow: 0 0 10px rgba(var(--pd-rgb,255,255,255),0.3);
        box-shadow: 0 0 20px rgba(var(--pd-rgb,255,255,255),0.08);
      }
      .tpg-goto-btn:hover {
        background: rgba(var(--pd-rgb,255,255,255),0.22);
        transform: scale(1.03);
      }
      .tpg-goto-btn svg { flex-shrink: 0; }

      /* Separador de slots — "OU" entre opções alternativas */
      .tpg-slot-sep {
        font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
        color: rgba(255,255,255,0.18); text-align: center;
        padding: 6px 0; border-top: 1px solid rgba(255,255,255,0.05);
        margin-top: 4px;
      }

      /* Responsive */
      @media(max-width:640px) {
        .tpg-body { flex-direction: column; }
        .tpg-list { width: 100%; flex-direction: row; flex-wrap: wrap; border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06); padding: 10px 8px; gap: 6px; }
        .tpg-type-btn, .tpg-special-btn { width: auto; }
        .tpg-type-btn-arrow, .tpg-type-btn-label { display: none; }
        .tpg-type-btn-icon, .tpg-special-btn-icon { width: 38px; height: 38px; }
        .tpg-panel { padding: 16px; }
        .tpg-section-label { display: none; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── Build HTML ──────────────────────────────────────────────────────────────
  var html = '<div class="tpg">';

  // ── Estilos da seção explicativa ──────────────────────────────────────────
  if (!document.getElementById('talent-explain-styles')) {
    var se = document.createElement('style');
    se.id = 'talent-explain-styles';
    se.textContent = `
      /* Hero */
      .tpg-hero { border-bottom: none !important; margin-bottom: 0 !important; }

      /* Explain section */
      .tpg-explain {
        padding: 0 20px 28px;
        max-width: 860px; margin: 0 auto;
        display: flex; flex-direction: column; gap: 14px;
      }

      /* Intro text */
      .tpg-intro {
        font-family: var(--font-body); font-size: 13.5px; color: rgba(255,255,255,0.5);
        line-height: 1.8; text-align: center;
        max-width: 680px; margin: 0 auto; padding: 18px 0 4px;
      }
      .tpg-intro strong { color: rgba(255,255,255,0.82); }

      /* Divider */
      .tpg-explain-divider {
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255,224,102,0.18), transparent);
        margin: 4px 0;
      }

      /* Cards de info */
      .tpg-ex-card {
        border-radius: 16px; padding: 20px 22px;
        display: flex; gap: 18px; align-items: flex-start;
        background: rgba(255,255,255,0.025);
        border: 1px solid rgba(255,255,255,0.07);
        transition: border-color .2s, background .2s;
      }
      .tpg-ex-card:hover {
        border-color: rgba(255,224,102,0.18);
        background: rgba(255,224,102,0.025);
      }
      .tpg-ex-card-icon { font-size: 28px; flex-shrink: 0; margin-top: 2px; line-height: 1; }
      .tpg-ex-card-body { flex: 1; min-width: 0; }
      .tpg-ex-card-title {
        font-family: var(--font-title); font-size: 11.5px; font-weight: 700;
        letter-spacing: 1.8px; text-transform: uppercase; color: #ffe066;
        margin-bottom: 8px;
      }
      .tpg-ex-card-text {
        font-family: var(--font-body); font-size: 13px; color: rgba(255,255,255,0.5);
        line-height: 1.75;
      }
      .tpg-ex-card-text strong { color: rgba(255,255,255,0.82); }

      /* Bullet list dentro dos cards */
      .tpg-ex-bullets { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
      .tpg-ex-bullet {
        display: flex; align-items: flex-start; gap: 10px;
        background: rgba(255,255,255,0.03); border-radius: 10px;
        padding: 10px 14px; border: 1px solid rgba(255,255,255,0.05);
      }
      .tpg-ex-bullet-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: #ffe066; flex-shrink: 0; margin-top: 5px;
        box-shadow: 0 0 6px rgba(255,224,102,0.5);
      }
      .tpg-ex-bullet-text {
        font-family: var(--font-body); font-size: 12.5px;
        color: rgba(255,255,255,0.48); line-height: 1.65; flex: 1;
      }
      .tpg-ex-bullet-text strong { color: rgba(255,255,255,0.8); }

      /* Dois cards lado a lado (especiais) */
      .tpg-ex-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      @media(max-width:600px) { .tpg-ex-row { grid-template-columns: 1fr; } }

      /* Card especial de talento */
      .tpg-ex-special {
        border-radius: 16px; padding: 20px 18px;
        background: rgba(255,255,255,0.025);
        border: 1px solid rgba(var(--tse-rgb,255,255,255),0.15);
        transition: border-color .2s, background .2s, box-shadow .2s;
      }
      .tpg-ex-special:hover {
        border-color: rgba(var(--tse-rgb,255,255,255),0.3);
        background: rgba(var(--tse-rgb,255,255,255),0.04);
        box-shadow: 0 0 24px rgba(var(--tse-rgb,255,255,255),0.06);
      }
      .tpg-ex-special-head {
        display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
      }
      .tpg-ex-special-icon {
        width: 42px; height: 42px; border-radius: 50%;
        background: rgba(var(--tse-rgb,255,255,255),0.1);
        border: 1.5px solid rgba(var(--tse-rgb,255,255,255),0.25);
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; flex-shrink: 0;
      }
      .tpg-ex-special-name {
        font-family: var(--font-title); font-size: 14px; font-weight: 900;
        letter-spacing: 1.5px; text-transform: uppercase;
        color: rgba(var(--tse-rgb,255,255,255),1);
      }
      .tpg-ex-special-sub {
        font-family: var(--font-body); font-size: 11px;
        color: rgba(255,255,255,0.3); margin-top: 2px;
      }
      .tpg-ex-special-stats { display: flex; flex-direction: column; gap: 7px; }
      .tpg-ex-stat {
        display: flex; align-items: center; gap: 10px;
        background: rgba(var(--tse-rgb,255,255,255),0.05);
        border-radius: 9px; padding: 8px 12px;
        border: 1px solid rgba(var(--tse-rgb,255,255,255),0.08);
      }
      .tpg-ex-stat-val {
        font-family: var(--font-mono, monospace); font-size: 13px; font-weight: 900;
        color: rgba(var(--tse-rgb,255,255,255),1); min-width: 52px;
      }
      .tpg-ex-stat-label {
        font-family: var(--font-body); font-size: 12px;
        color: rgba(255,255,255,0.42); flex: 1;
      }

      /* Callout "Como jogar" */
      .tpg-callout {
        border-radius: 14px; padding: 16px 20px;
        background: rgba(255,224,102,0.05);
        border: 1px solid rgba(255,224,102,0.15);
        font-family: var(--font-body); font-size: 12.5px;
        color: rgba(255,255,255,0.48); line-height: 1.7;
        text-align: center;
      }
      .tpg-callout strong { color: #ffe066; }

      /* Divider com título antes do painel */
      .tpg-section-divider {
        display: flex; align-items: center; gap: 14px;
        padding: 8px 20px 0; max-width: 860px; margin: 0 auto;
      }
      .tpg-section-divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.06); }
      .tpg-section-divider-label {
        font-family: var(--font-title); font-size: 10px; font-weight: 700;
        letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.2);
        white-space: nowrap;
      }
    `;
    document.head.appendChild(se);
  }

  // Hero
  html += '<div class="tpg-hero">';
  html += '  <div class="tpg-hero-icon">✨</div>';
  html += '  <div class="tpg-hero-title">PokéTalents</div>';
  html += '  <div class="tpg-hero-desc">Buffs especiais que potencializam seus Pokémon e personagem em batalha, exploração e muito mais.</div>';
  html += '</div>';

  // ── Seção explicativa ──────────────────────────────────────────────────────
  html += '<div class="tpg-explain">';

  // Intro
  html += '<div class="tpg-intro">';
  html += 'PokéTalents são <strong>buffs especiais</strong> que seus Pokémon e personagem podem adquirir, oferecendo vantagens exclusivas em batalhas e exploração. ';
  html += 'O sistema foca nas <strong>tipagens dos Pokémon</strong> disponíveis no jogo — diferente dos Clans tradicionais — ';
  html += 'permitindo que você melhore seu desempenho habilitando talentos específicos de cada tipo.';
  html += '</div>';

  html += '<div class="tpg-explain-divider"></div>';

  // Card: Como funciona
  html += '<div class="tpg-ex-card">';
  html += '<div class="tpg-ex-card-icon">⚙️</div>';
  html += '<div class="tpg-ex-card-body">';
  html += '<div class="tpg-ex-card-title">Como Funciona o Sistema?</div>';
  html += '<div class="tpg-ex-card-text">O sistema de Talentos é dividido em <strong>tipagens</strong> (Fire, Water, Electric, etc.) e <strong>talentos especiais</strong> (Character e Pokémon). Cada um funciona de forma independente e oferece bônus diferentes.</div>';
  html += '<div class="tpg-ex-bullets">';
  html += '<div class="tpg-ex-bullet"><div class="tpg-ex-bullet-dot"></div><div class="tpg-ex-bullet-text"><strong>Talentos por Tipagem:</strong> Cada elemento tem um talento associado. Ao habilitar, você recebe bônus de ataque e defesa para todos os Pokémon daquela tipagem.</div></div>';
  html += '<div class="tpg-ex-bullet"><div class="tpg-ex-bullet-dot"></div><div class="tpg-ex-bullet-text"><strong>Ingredientes para Habilitar:</strong> Cada tipagem exige uma receita própria, composta por itens raros ou específicos do jogo. Clique em um tipo ao lado para ver os ingredientes necessários.</div></div>';
  html += '<div class="tpg-ex-bullet"><div class="tpg-ex-bullet-dot"></div><div class="tpg-ex-bullet-text"><strong>Full Buff de Tipagem:</strong> Ao completar todos os slots de uma tipagem, você ativa o <strong>Full Buff</strong> — garantindo <strong>+13% de Ataque e +13% de Defesa</strong> para todos os Pokémon daquela tipagem.</div></div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';

  // Card: Talentos especiais — Character & Pokemon lado a lado
  html += '<div class="tpg-ex-card">';
  html += '<div class="tpg-ex-card-icon">⭐</div>';
  html += '<div class="tpg-ex-card-body">';
  html += '<div class="tpg-ex-card-title">Talentos Especiais</div>';
  html += '<div class="tpg-ex-card-text" style="margin-bottom:14px">Além das tipagens tradicionais, existem dois talentos especiais que oferecem bônus diretos ao <strong>personagem</strong> e aos <strong>Pokémon</strong>. Clique em cada um ao lado para ver a receita completa.</div>';
  html += '<div class="tpg-ex-row">';

  // Character
  html += '<div class="tpg-ex-special" style="--tse-rgb:255,224,102">';
  html += '<div class="tpg-ex-special-head">';
  html += '<div class="tpg-ex-special-icon">🧍</div>';
  html += '<div><div class="tpg-ex-special-name">Character</div><div class="tpg-ex-special-sub">Bônus direto no personagem</div></div>';
  html += '</div>';
  html += '<div class="tpg-ex-special-stats">';
  html += '<div class="tpg-ex-stat"><span class="tpg-ex-stat-val">+80</span><span class="tpg-ex-stat-label">Speed do personagem</span></div>';
  html += '<div class="tpg-ex-stat"><span class="tpg-ex-stat-val">+1400</span><span class="tpg-ex-stat-label">HP do personagem</span></div>';
  html += '<div class="tpg-ex-stat"><span class="tpg-ex-stat-val">+11%</span><span class="tpg-ex-stat-label">Chance de Crítico</span></div>';
  html += '</div>';
  html += '</div>';

  // Pokemon
  html += '<div class="tpg-ex-special" style="--tse-rgb:96,192,255">';
  html += '<div class="tpg-ex-special-head">';
  html += '<div class="tpg-ex-special-icon">🐾</div>';
  html += '<div><div class="tpg-ex-special-name">Pokémon</div><div class="tpg-ex-special-sub">Bônus de Speed por terreno</div></div>';
  html += '</div>';
  html += '<div class="tpg-ex-special-stats">';
  html += '<div class="tpg-ex-stat"><span class="tpg-ex-stat-val">+10%</span><span class="tpg-ex-stat-label">Speed em terreno de Água 💧</span></div>';
  html += '<div class="tpg-ex-stat"><span class="tpg-ex-stat-val">+10%</span><span class="tpg-ex-stat-label">Speed em terreno de Areia 🏜️</span></div>';
  html += '<div class="tpg-ex-stat"><span class="tpg-ex-stat-val">+10%</span><span class="tpg-ex-stat-label">Speed em terreno de Gelo ❄️</span></div>';
  html += '</div>';
  html += '</div>';

  html += '</div>'; // tpg-ex-row
  html += '</div>'; // card-body
  html += '</div>'; // card

  // Callout final
  html += '<div class="tpg-callout">';
  html += '💡 <strong>Selecione uma tipagem ou talento especial na lista abaixo</strong> para ver os ingredientes necessários, os slots disponíveis e como habilitar cada bônus.';
  html += '</div>';

  html += '</div>'; // .tpg-explain

  // Estilos do grid de blocos
  if (!document.getElementById('talent-grid-styles')) {
    var sg = document.createElement('style');
    sg.id = 'talent-grid-styles';
    sg.textContent = `
      /* ── Seção explorar ── */
      .tpg-explore-section {
        padding: 0 20px 48px;
        max-width: 860px; margin: 0 auto;
      }

      /* Divider com label */
      .tpg-section-divider {
        display: flex; align-items: center; gap: 14px;
        padding: 8px 20px 20px; max-width: 860px; margin: 0 auto;
      }
      .tpg-section-divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.06); }
      .tpg-section-divider-label {
        font-family: var(--font-title); font-size: 10px; font-weight: 700;
        letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.2);
        white-space: nowrap;
      }

      /* Sub-label de categoria */
      .tpg-grid-cat-label {
        font-family: var(--font-title); font-size: 10px; font-weight: 700;
        letter-spacing: 2px; text-transform: uppercase;
        color: rgba(255,255,255,0.25); margin-bottom: 12px; margin-top: 22px;
      }
      .tpg-grid-cat-label:first-child { margin-top: 0; }

      /* Grid de blocos */
      .tpg-blocks-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 10px;
      }
      @media(max-width:480px) { .tpg-blocks-grid { grid-template-columns: repeat(3, 1fr); } }

      /* Bloco individual */
      .tpg-block {
        border-radius: 16px; padding: 18px 12px 14px;
        background: rgba(255,255,255,0.025);
        border: 1px solid rgba(255,255,255,0.08);
        cursor: pointer; text-align: center;
        transition: background .2s, border-color .2s, transform .15s, box-shadow .2s;
        position: relative; overflow: hidden;
      }
      .tpg-block::before {
        content: '';
        position: absolute; top: 0; left: 0; right: 0; height: 2px;
        background: rgba(var(--tb-rgb), 0.6);
        opacity: 0; transition: opacity .2s;
        border-radius: 16px 16px 0 0;
      }
      .tpg-block:hover::before { opacity: 1; }
      .tpg-block:hover {
        background: rgba(var(--tb-rgb), 0.07);
        border-color: rgba(var(--tb-rgb), 0.35);
        transform: translateY(-3px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.35);
      }
      .tpg-block-img {
        width: 44px; height: 44px; border-radius: 50%;
        overflow: hidden; margin: 0 auto 10px;
        border: 2px solid rgba(var(--tb-rgb), 0.35);
        box-shadow: 0 0 14px rgba(var(--tb-rgb), 0.25);
      }
      .tpg-block-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .tpg-block-emoji-icon {
        width: 44px; height: 44px; border-radius: 50%;
        margin: 0 auto 10px;
        background: rgba(var(--tb-rgb), 0.12);
        border: 2px solid rgba(var(--tb-rgb), 0.3);
        display: flex; align-items: center; justify-content: center;
        font-size: 22px;
      }
      .tpg-block-name {
        font-family: var(--font-title); font-size: 9.5px; font-weight: 700;
        letter-spacing: 0.8px; text-transform: uppercase;
        color: rgba(var(--tb-rgb), 1); line-height: 1.3;
        margin-bottom: 6px;
      }
      .tpg-block-tag {
        display: inline-block;
        background: rgba(var(--tb-rgb), 0.1);
        border: 1px solid rgba(var(--tb-rgb), 0.22);
        border-radius: 20px; padding: 2px 8px;
        font-family: var(--font-mono, monospace); font-size: 9px; font-weight: 700;
        color: rgba(var(--tb-rgb), 0.85);
      }

      /* ── Modal de talento ── */
      .tpg-modal-overlay {
        position: fixed; inset: 0; z-index: 10001;
        background: rgba(0,0,0,0.78); backdrop-filter: blur(7px);
        display: flex; align-items: center; justify-content: center;
        padding: 16px;
        animation: tpg-fade .15s ease;
      }
      @keyframes tpg-fade { from { opacity: 0 } to { opacity: 1 } }

      .tpg-modal {
        background: #0a1220;
        border-radius: 22px;
        border: 1px solid rgba(var(--tm-rgb,255,255,255), 0.2);
        box-shadow: 0 0 60px rgba(var(--tm-rgb,255,255,255), 0.08), 0 24px 60px rgba(0,0,0,0.65);
        max-width: 480px; width: 100%;
        max-height: 85vh; overflow-y: auto;
        animation: tpg-slideup .22s cubic-bezier(.4,0,.2,1);
      }
      @keyframes tpg-slideup { from { transform: translateY(18px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

      .tpg-modal-header {
        padding: 22px 22px 18px;
        background: linear-gradient(135deg, rgba(var(--tm-rgb,255,255,255),0.06), transparent);
        border-bottom: 1px solid rgba(var(--tm-rgb,255,255,255), 0.1);
        display: flex; align-items: center; gap: 14px;
        position: sticky; top: 0; z-index: 2;
        background-color: #0a1220;
      }
      .tpg-modal-banner {
        width: 48px; height: 48px; border-radius: 50%; overflow: hidden; flex-shrink: 0;
        border: 2px solid rgba(var(--tm-rgb,255,255,255), 0.4);
        box-shadow: 0 0 18px rgba(var(--tm-rgb,255,255,255), 0.2);
      }
      .tpg-modal-banner img { width: 100%; height: 100%; object-fit: cover; }
      .tpg-modal-banner-emoji {
        width: 48px; height: 48px; border-radius: 50%; flex-shrink: 0;
        background: rgba(var(--tm-rgb,255,255,255), 0.1);
        border: 2px solid rgba(var(--tm-rgb,255,255,255), 0.35);
        display: flex; align-items: center; justify-content: center; font-size: 22px;
      }
      .tpg-modal-header-info { flex: 1; }
      .tpg-modal-title {
        font-family: var(--font-title); font-size: 16px; font-weight: 900;
        letter-spacing: 1.5px; text-transform: uppercase;
        color: rgba(var(--tm-rgb,255,255,255), 1); margin-bottom: 3px;
      }
      .tpg-modal-sub { font-family: var(--font-body); font-size: 11.5px; color: rgba(255,255,255,0.32); }
      .tpg-modal-close {
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
        color: rgba(255,255,255,0.45); border-radius: 50%; width: 30px; height: 30px;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; font-size: 14px; transition: background .15s, color .15s; flex-shrink: 0;
      }
      .tpg-modal-close:hover { background: rgba(255,255,255,0.14); color: #fff; }

      .tpg-modal-body {
        padding: 20px 22px 24px;
        display: flex; flex-direction: column; gap: 20px;
      }
      .tpg-modal-section-label {
        font-family: var(--font-title); font-size: 9.5px; font-weight: 700;
        letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.22);
        margin-bottom: 10px;
      }

      /* Buffs no modal */
      .tpg-modal-buffs { display: flex; flex-wrap: wrap; gap: 8px; }
      .tpg-modal-buff {
        display: flex; align-items: center; gap: 8px;
        background: rgba(var(--tm-rgb,255,255,255), 0.06);
        border: 1px solid rgba(var(--tm-rgb,255,255,255), 0.12);
        border-radius: 10px; padding: 9px 14px;
        flex: 1; min-width: 120px;
      }
      .tpg-modal-buff-icon { font-size: 16px; flex-shrink: 0; }
      .tpg-modal-buff-val {
        font-family: var(--font-mono, monospace); font-size: 14px; font-weight: 900;
        color: rgba(var(--tm-rgb,255,255,255), 1);
      }
      .tpg-modal-buff-label {
        font-family: var(--font-body); font-size: 11px;
        color: rgba(255,255,255,0.38); margin-top: 1px;
      }

      /* Slots no modal */
      .tpg-modal-slots { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
      .tpg-modal-slot-btn {
        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px; padding: 6px 14px; cursor: pointer;
        font-family: var(--font-mono, monospace); font-size: 11px; font-weight: 700;
        color: rgba(255,255,255,0.4);
        transition: background .15s, border-color .15s, color .15s;
      }
      .tpg-modal-slot-btn:hover {
        background: rgba(var(--tm-rgb,255,255,255), 0.08);
        border-color: rgba(var(--tm-rgb,255,255,255), 0.25);
        color: rgba(var(--tm-rgb,255,255,255), 0.8);
      }
      .tpg-modal-slot-btn.active {
        background: rgba(var(--tm-rgb,255,255,255), 0.14);
        border-color: rgba(var(--tm-rgb,255,255,255), 0.4);
        color: rgba(var(--tm-rgb,255,255,255), 1);
      }

      /* Ingredientes no modal */
      .tpg-modal-ingr-list { display: flex; flex-direction: column; gap: 6px; }
      .tpg-modal-ingr-row {
        display: flex; align-items: center; gap: 12px;
        background: rgba(255,255,255,0.03); border-radius: 10px;
        padding: 10px 14px; border: 1px solid rgba(255,255,255,0.05);
      }
      .tpg-modal-ingr-img { width: 32px; height: 32px; object-fit: contain; border-radius: 6px; flex-shrink: 0; }
      .tpg-modal-ingr-placeholder {
        width: 32px; height: 32px; border-radius: 6px;
        background: rgba(255,255,255,0.05); display: flex; align-items: center;
        justify-content: center; font-size: 14px; flex-shrink: 0;
      }
      .tpg-modal-ingr-name { flex: 1; font-family: var(--font-body); font-size: 12.5px; color: rgba(255,255,255,0.7); }
      .tpg-modal-ingr-qty {
        font-family: var(--font-mono, monospace); font-size: 13px; font-weight: 700;
        color: rgba(var(--tm-rgb,255,255,255), 0.9);
      }
      .tpg-modal-ingr-or {
        text-align: center; font-size: 10px; font-weight: 700;
        letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.2);
        padding: 2px 0;
      }

      /* Botão pacote no modal */
      .tpg-modal-goto {
        display: inline-flex; align-items: center; gap: 8px;
        background: rgba(var(--tm-rgb,255,255,255), 0.08);
        border: 1px solid rgba(var(--tm-rgb,255,255,255), 0.2);
        border-radius: 12px; padding: 11px 18px; cursor: pointer;
        font-family: var(--font-title); font-size: 11px; font-weight: 700;
        letter-spacing: 1px; text-transform: uppercase;
        color: rgba(var(--tm-rgb,255,255,255), 0.9);
        transition: background .15s, border-color .15s, transform .15s;
        width: 100%; justify-content: center;
      }
      .tpg-modal-goto:hover {
        background: rgba(var(--tm-rgb,255,255,255), 0.15);
        border-color: rgba(var(--tm-rgb,255,255,255), 0.35);
        transform: scale(1.02);
      }
    `;
    document.head.appendChild(sg);
  }

  // Divider antes do grid
  html += '<div class="tpg-section-divider">';
  html += '<div class="tpg-section-divider-line"></div>';
  html += '<div class="tpg-section-divider-label">✨ Explorar Talentos</div>';
  html += '<div class="tpg-section-divider-line"></div>';
  html += '</div>';

  html += '<div class="tpg-explore-section">';

  // Label tipagens
  html += '<div class="tpg-grid-cat-label">⚔️ Tipagens — +13% ATK &amp; DEF</div>';
  html += '<div class="tpg-blocks-grid">';

  var TYPE_ORDER = ['fire','water','electric','grass','ice','psychic','ghost','dragon','dark','fairy','poison','ground','rock','bug','flying','steel','normal','fighting'];
  TYPE_ORDER.forEach(function(type) {
    var m = TALENT_TYPE_META[type];
    if (!m) return;
    var label = type.charAt(0).toUpperCase() + type.slice(1);
    html += '<div class="tpg-block" style="--tb-rgb:' + m.rgb + '" onclick="openTalentModal(\'' + type + '\')">';
    html += '<div class="tpg-block-img"><img src="' + m.banner + '" alt="' + label + '" loading="lazy" /></div>';
    html += '<div class="tpg-block-name">' + m.emoji + ' ' + label + '</div>';
    html += '<div class="tpg-block-tag">+13% ATK&DEF</div>';
    html += '</div>';
  });

  html += '</div>'; // .tpg-blocks-grid

  // Label especiais
  html += '<div class="tpg-grid-cat-label">⭐ Talentos Especiais</div>';
  html += '<div class="tpg-blocks-grid">';

  // Character
  html += '<div class="tpg-block" style="--tb-rgb:255,224,102" onclick="openTalentModal(\'character\')">';
  html += '<div class="tpg-block-emoji-icon">🧍</div>';
  html += '<div class="tpg-block-name">Character</div>';
  html += '<div class="tpg-block-tag">Speed · HP · Crit</div>';
  html += '</div>';

  // Pokemon
  html += '<div class="tpg-block" style="--tb-rgb:96,192,255" onclick="openTalentModal(\'pokemon\')">';
  html += '<div class="tpg-block-emoji-icon">🐾</div>';
  html += '<div class="tpg-block-name">Pokémon</div>';
  html += '<div class="tpg-block-tag">Speed Terreno</div>';
  html += '</div>';

  html += '</div>'; // .tpg-blocks-grid

  html += '</div>'; // .tpg-explore-section

  // Raiz do modal
  html += '<div id="tpg-modal-root"></div>';

  html += '</div>'; // .tpg

  el.innerHTML = html;
  _talentPanelOpen = null;
}

// Slot ativo por tipo (mantido para compatibilidade)
var _talentActiveSlot = {};

// Slot ativo por tipo
var _talentActiveSlot = {};

function openTalentModal(type) {
  if (_talentActiveSlot[type] === undefined) _talentActiveSlot[type] = 0;

  var isType = TALENT_TYPE_META[type];
  var isCharacter = (type === 'character');
  var rgb, bannerHtml, name, sub;

  if (isType) {
    var m = TALENT_TYPE_META[type];
    rgb = m.rgb;
    bannerHtml = '<div class="tpg-modal-banner" style="--tm-rgb:' + rgb + '"><img src="' + m.banner + '" alt="' + type + '" /></div>';
    name = m.emoji + ' ' + (type.charAt(0).toUpperCase() + type.slice(1));
    sub = 'Talento de Tipagem — Full Buff';
  } else if (isCharacter) {
    rgb = '255,224,102';
    bannerHtml = '<div class="tpg-modal-banner-emoji" style="--tm-rgb:' + rgb + '">🧍</div>';
    name = 'Character'; sub = 'Talento Especial — Bônus direto no personagem';
  } else {
    rgb = '96,192,255';
    bannerHtml = '<div class="tpg-modal-banner-emoji" style="--tm-rgb:' + rgb + '">🐾</div>';
    name = 'Pokémon'; sub = 'Talento Especial — Bônus de Speed por terreno';
  }

  var html = '<div class="tpg-modal-overlay" id="tpg-modal-overlay" onclick="closeTalentModalOverlay(event)">';
  html += '<div class="tpg-modal" style="--tm-rgb:' + rgb + '">';

  // Header
  html += '<div class="tpg-modal-header">';
  html += bannerHtml;
  html += '<div class="tpg-modal-header-info">';
  html += '<div class="tpg-modal-title">' + name + '</div>';
  html += '<div class="tpg-modal-sub">' + sub + '</div>';
  html += '</div>';
  html += '<button class="tpg-modal-close" onclick="closeTalentModal()">✕</button>';
  html += '</div>';

  // Body
  html += '<div class="tpg-modal-body">';

  // Buffs
  html += '<div>';
  html += '<div class="tpg-modal-section-label">🎯 Buffs Concedidos</div>';
  html += '<div class="tpg-modal-buffs">';
  if (isType) {
    html += '<div class="tpg-modal-buff"><div class="tpg-modal-buff-icon">⚔️</div><div><div class="tpg-modal-buff-val">+13%</div><div class="tpg-modal-buff-label">Ataque</div></div></div>';
    html += '<div class="tpg-modal-buff"><div class="tpg-modal-buff-icon">🛡️</div><div><div class="tpg-modal-buff-val">+13%</div><div class="tpg-modal-buff-label">Defesa</div></div></div>';
    html += '</div>';
    html += '<div style="margin-top:8px;font-size:11.5px;color:rgba(255,255,255,0.3);font-family:var(--font-body)">Bônus aplicado apenas aos Pokémon desta tipagem.</div>';
  } else if (isCharacter) {
    html += '<div class="tpg-modal-buff"><div class="tpg-modal-buff-icon">💨</div><div><div class="tpg-modal-buff-val">+80</div><div class="tpg-modal-buff-label">Speed</div></div></div>';
    html += '<div class="tpg-modal-buff"><div class="tpg-modal-buff-icon">❤️</div><div><div class="tpg-modal-buff-val">+1400</div><div class="tpg-modal-buff-label">HP</div></div></div>';
    html += '<div class="tpg-modal-buff"><div class="tpg-modal-buff-icon">🎯</div><div><div class="tpg-modal-buff-val">+11%</div><div class="tpg-modal-buff-label">Crítico</div></div></div>';
    html += '</div>';
  } else {
    html += '<div class="tpg-modal-buff"><div class="tpg-modal-buff-icon">💧</div><div><div class="tpg-modal-buff-val">+10%</div><div class="tpg-modal-buff-label">Speed Água</div></div></div>';
    html += '<div class="tpg-modal-buff"><div class="tpg-modal-buff-icon">🏜️</div><div><div class="tpg-modal-buff-val">+10%</div><div class="tpg-modal-buff-label">Speed Areia</div></div></div>';
    html += '<div class="tpg-modal-buff"><div class="tpg-modal-buff-icon">❄️</div><div><div class="tpg-modal-buff-val">+10%</div><div class="tpg-modal-buff-label">Speed Gelo</div></div></div>';
    html += '</div>';
  }
  html += '</div>';

  // Ingredientes para tipagens
  if (isType) {
    var pkg = null, pkgIdx = -1;
    for (var pi = 0; pi < PACKAGES.length; pi++) {
      var pName = PACKAGES[pi].name.toLowerCase();
      if (pName.startsWith('talent') && (pName.includes(type) || (type === 'fighting' && (pName.includes('figthing') || pName.includes('fighting'))))) {
        pkg = PACKAGES[pi]; pkgIdx = pi; break;
      }
    }

    html += '<div>';
    html += '<div class="tpg-modal-section-label">🧪 Ingredientes Necessários</div>';

    if (pkg && pkg.slots) {
      var slots = pkg.slots;
      var si = Math.min(_talentActiveSlot[type] || 0, slots.length - 1);

      html += '<div class="tpg-modal-slots">';
      for (var idx = 0; idx < slots.length; idx++) {
        html += '<button class="tpg-modal-slot-btn' + (idx === si ? ' active' : '') + '" onclick="selectTalentSlot(\'' + type + '\',' + idx + ')">Slot ' + (idx + 1) + '</button>';
      }
      html += '</div>';

      var currentSlot = slots[si];
      html += '<div class="tpg-modal-ingr-list">';
      for (var ii = 0; ii < currentSlot.length; ii++) {
        var iName = currentSlot[ii][0];
        var iQty  = currentSlot[ii][1];
        var itemData = typeof getPkgItemData === 'function' ? getPkgItemData(iName) : null;
        var imgHtml = itemData && itemData.image
          ? '<img class="tpg-modal-ingr-img" src="' + itemData.image + '" alt="' + iName + '" loading="lazy" onerror="this.style.display=\'none\'" />'
          : '<div class="tpg-modal-ingr-placeholder">🔹</div>';
        if (ii > 0) html += '<div class="tpg-modal-ingr-or">ou</div>';
        html += '<div class="tpg-modal-ingr-row">' + imgHtml + '<span class="tpg-modal-ingr-name">' + iName + '</span><span class="tpg-modal-ingr-qty">×' + iQty.toLocaleString() + '</span></div>';
      }
      html += '</div>';
    } else {
      html += '<div style="color:rgba(255,255,255,0.25);font-size:13px;padding:8px 0">Pacote não encontrado.</div>';
    }
    html += '</div>';

    if (pkgIdx >= 0) {
      html += '<button class="tpg-modal-goto" onclick="closeTalentModal();goToTalentPackage(' + pkgIdx + ')">';
      html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>';
      html += 'Ver no Pacotes / Adicionar ao Carrinho';
      html += '</button>';
    }

  } else if (isCharacter) {
    html += '<div>';
    html += '<div class="tpg-modal-section-label">📦 Pacotes Relacionados</div>';
    html += '<div style="font-size:12.5px;color:rgba(255,255,255,0.4);line-height:1.7;margin-bottom:12px">Habilitado pelos pacotes <strong style="color:rgba(255,224,102,0.85)">Full Speed</strong> e <strong style="color:rgba(255,224,102,0.85)">Full HP</strong>.</div>';
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    PACKAGES.forEach(function(p, pi) {
      var pn = p.name.toLowerCase();
      if (pn === 'full speed' || pn === 'full hp') {
        html += '<button class="tpg-modal-goto" style="flex:1;min-width:140px" onclick="closeTalentModal();goToTalentPackage(' + pi + ')">📦 ' + p.name + '</button>';
      }
    });
    html += '</div>';
    html += '</div>';
  } else {
    // Pokémon especial — habilitado pelos pacotes Reduces
    html += '<div>';
    html += '<div class="tpg-modal-section-label">📦 Pacotes Relacionados</div>';
    html += '<div style="font-size:12.5px;color:rgba(255,255,255,0.4);line-height:1.75;margin-bottom:14px">';
    html += 'Os bônus de Speed por terreno são habilitados pelos pacotes <strong style="color:rgba(96,192,255,0.85)">Reduces Speed</strong>. ';
    html += 'Cada pacote corresponde a um terreno específico — clique para ver os ingredientes e adicionar ao carrinho.';
    html += '</div>';

    // Monta os 3 sub-blocos de terreno com botão para o pacote correspondente
    var terrainos = [
      { label: 'Water', icon: '💧', rgb: '96,192,255', keyword: 'water' },
      { label: 'Sand',  icon: '🏜️', rgb: '204,136,0',  keyword: 'sand'  },
      { label: 'Ice',   icon: '❄️', rgb: '128,232,255', keyword: 'ice'   },
    ];

    html += '<div style="display:flex;flex-direction:column;gap:8px;">';
    terrainos.forEach(function(t) {
      // Encontra o pacote Reduces correspondente
      var rPkgIdx = -1;
      for (var ri = 0; ri < PACKAGES.length; ri++) {
        var rn = PACKAGES[ri].name.toLowerCase();
        if (rn.startsWith('reduces') && rn.includes(t.keyword)) { rPkgIdx = ri; break; }
      }
      var pkgName = rPkgIdx >= 0 ? PACKAGES[rPkgIdx].name : ('Reduces Speed ' + t.label);
      var onclick = rPkgIdx >= 0
        ? 'onclick="closeTalentModal();goToTalentPackageReduces(' + rPkgIdx + ')"'
        : '';
      html += '<div style="display:flex;align-items:center;gap:12px;background:rgba(' + t.rgb + ',0.06);border:1px solid rgba(' + t.rgb + ',0.18);border-radius:12px;padding:12px 14px;">';
      html += '<div style="font-size:22px;flex-shrink:0">' + t.icon + '</div>';
      html += '<div style="flex:1;min-width:0">';
      html += '<div style="font-family:var(--font-title);font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:rgba(' + t.rgb + ',0.95);margin-bottom:2px">' + pkgName + '</div>';
      html += '<div style="font-size:11px;color:rgba(255,255,255,0.3);font-family:var(--font-body)">+10% Speed em terreno de ' + t.label + '</div>';
      html += '</div>';
      if (rPkgIdx >= 0) {
        html += '<button style="background:rgba(' + t.rgb + ',0.1);border:1px solid rgba(' + t.rgb + ',0.25);border-radius:8px;padding:7px 14px;cursor:pointer;font-family:var(--font-title);font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:rgba(' + t.rgb + ',0.9);white-space:nowrap;transition:background .15s" ' + onclick + '>Ver Pacote →</button>';
      }
      html += '</div>';
    });
    html += '</div>';
    html += '</div>';
  }

  html += '</div>'; // .tpg-modal-body
  html += '</div>'; // .tpg-modal
  html += '</div>'; // .tpg-modal-overlay

  var root = document.getElementById('tpg-modal-root');
  if (root) { root.innerHTML = html; document.body.style.overflow = 'hidden'; }
}

function closeTalentModal() {
  var root = document.getElementById('tpg-modal-root');
  if (root) root.innerHTML = '';
  document.body.style.overflow = '';
}

function closeTalentModalOverlay(e) {
  if (e.target.id === 'tpg-modal-overlay') closeTalentModal();
}

function selectTalentSlot(type, idx) {
  _talentActiveSlot[type] = idx;
  openTalentModal(type);
}

// Alias de compatibilidade
function openTalentPanel(type) { openTalentModal(type); }

function goToTalentPackage(pkgIdx) {
  // Navega para a aba de Pacotes e seleciona o pacote
  var tabBtn = document.querySelector('.tab-btn[onclick*="pacotes"]');
  if (tabBtn) { switchTab('pacotes', tabBtn); }
  // Dá um pequeno delay para o render acontecer
  setTimeout(function() {
    if (typeof selectPkg === 'function') selectPkg(pkgIdx);
    // Garante que a categoria Talent está ativa
    if (typeof activePkgCat !== 'undefined') {
      var pkgName = (PACKAGES[pkgIdx] && PACKAGES[pkgIdx].name) || '';
      var cat = pkgName.toLowerCase().startsWith('full') ? 'full' : 'talent';
      if (window.pkgState) pkgState.activePkgCat = cat; else activePkgCat = cat;
      if (typeof renderPackages === 'function') renderPackages();
      if (typeof renderPkgDetail === 'function') renderPkgDetail(pkgIdx);
    }
  }, 80);
}

function goToTalentPackageReduces(pkgIdx) {
  var tabBtn = document.querySelector('.tab-btn[onclick*="pacotes"]');
  if (tabBtn) { switchTab('pacotes', tabBtn); }
  setTimeout(function() {
    if (typeof activePkgCat !== 'undefined') {
      if (window.pkgState) pkgState.activePkgCat = 'reduces'; else activePkgCat = 'reduces';
      if (typeof renderPackages === 'function') renderPackages();
    }
    if (typeof selectPkg === 'function') selectPkg(pkgIdx);
    if (typeof renderPkgDetail === 'function') renderPkgDetail(pkgIdx);
  }, 80);
}
