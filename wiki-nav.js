/* ================================================================
   wiki-nav.js
   Redesign completo da navegação da Wiki.
   Carregue APÓS app.js no index.html:
     <script src="wiki-nav.js"></script>
================================================================ */
(function () {

/* ── Injeção de estilos ──────────────────────────────────────── */
const S = document.createElement('style');
S.textContent = `

/* ── Esconde estrutura original da wiki ── */
.wiki-banner,
.wiki-subtabs,
#wiki-subtabs-sentinel { display: none !important; }

/* Esconde todos os panels de sub-aba via CSS permanentemente.
   Eles só aparecem quando estão dentro do #wn-slot com a classe .wn-visible */
.wiki-subtab-content {
  display: none !important;
}
.wiki-subtab-content.wn-visible {
  display: block !important;
}

/* ── Shell da wiki ── */
#tab-wiki { padding: 0 !important; }

/* ── Container principal ── */
#wn-shell {
  min-height: 60vh;
}

/* ══════════════════════════════════════════
   LOGO COMPACTA — aparece em todas as sub-abas
══════════════════════════════════════════ */
.wn-content-hero {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0;
  margin-bottom: 0;
  overflow: hidden;
  /* Altura fixa para o banner */
  min-height: 80px;
  border-radius: 0 0 18px 18px;
  background: linear-gradient(135deg,
    rgba(6,14,32,0.98) 0%,
    rgba(10,20,48,0.95) 40%,
    rgba(14,10,36,0.95) 70%,
    rgba(6,12,28,0.98) 100%
  );
  border-bottom: 1px solid rgba(58,140,255,0.18);
  box-shadow:
    0 4px 40px rgba(0,0,0,0.5),
    inset 0 1px 0 rgba(58,140,255,0.12);
}

/* Grande glow azul-violeta em arco atrás da logo */
.wn-content-hero::before {
  content: '';
  position: absolute;
  top: -60px; left: -80px;
  width: 500px;
  height: 280px;
  background: radial-gradient(ellipse at 30% 60%,
    rgba(58,140,255,0.20) 0%,
    rgba(100,60,220,0.10) 35%,
    transparent 65%
  );
  pointer-events: none;
}

/* Linha decorativa luminosa no topo */
.wn-content-hero::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(58,140,255,0.7) 15%,
    rgba(180,100,255,0.5) 40%,
    rgba(58,140,255,0.5) 65%,
    transparent 100%
  );
}

/* Wrapper interno com padding */
.wn-content-hero-body {
  position: relative;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 24px;
  flex: 1;
  z-index: 1;
}

/* Separador vertical brilhante antes do ícone */
.wn-content-hero-body::before {
  content: '';
  position: absolute;
  left: 0; top: 15%; bottom: 15%;
  width: 3px;
  border-radius: 4px;
  background: linear-gradient(180deg, transparent, rgba(58,140,255,0.7), rgba(160,100,255,0.5), transparent);
}

/* Ícone do livro — maior e com halo */
.wn-content-hero-icon {
  font-size: 42px;
  line-height: 1;
  flex-shrink: 0;
  position: relative;
  filter: drop-shadow(0 0 18px rgba(100,160,255,0.65));
  animation: wn-float 3.5s ease-in-out infinite;
}

/* Círculo halo atrás do ícone */
.wn-content-hero-icon::after {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(58,140,255,0.15) 0%, transparent 70%);
  border: 1px solid rgba(58,140,255,0.12);
}

/* Bloco de texto */
.wn-content-hero-inner {
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
}

/* Título WIKI em gradient */
.wn-content-hero-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: clamp(20px, 3.5vw, 30px);
  font-weight: 900;
  letter-spacing: 8px;
  text-transform: uppercase;
  line-height: 1;
  background: linear-gradient(135deg,
    #a0c8ff 0%,
    #ffffff 30%,
    #c8a0ff 60%,
    #7ab8ff 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 2px 18px rgba(100,160,255,0.4));
}

/* Subtítulo */
.wn-content-hero-sub {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: rgba(160,200,255,0.40);
}

/* Linha ornamental com gems — ocupa o resto */
.wn-content-hero-ornament {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding-right: 24px;
  position: relative;
  z-index: 1;
}

.wn-content-hero-ornament-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(58,140,255,0.30), rgba(160,100,255,0.15), transparent 80%);
}

.wn-content-hero-gem {
  width: 5px;
  height: 5px;
  border-radius: 1px;
  transform: rotate(45deg);
  flex-shrink: 0;
}
.wn-content-hero-gem:nth-child(1) {
  background: rgba(58,140,255,0.65);
  box-shadow: 0 0 7px rgba(58,140,255,0.5);
}
.wn-content-hero-gem:nth-child(2) {
  background: rgba(180,100,255,0.55);
  box-shadow: 0 0 7px rgba(180,100,255,0.4);
  width: 4px; height: 4px;
}
.wn-content-hero-gem:nth-child(3) {
  background: rgba(58,140,255,0.45);
  box-shadow: 0 0 5px rgba(58,140,255,0.3);
  width: 3px; height: 3px;
}

/* ══════════════════════════════════════════
   TELA HOME — grid de módulos
══════════════════════════════════════════ */
#wn-home {
  padding: 0 0 60px;
}

/* ── Hero / Logo da Wiki ── */
.wn-hero {
  position: relative;
  text-align: center;
  padding: 44px 20px 40px;
  margin-bottom: 8px;
  overflow: hidden;
}

/* Glow de fundo radial */
.wn-hero::before {
  content: '';
  position: absolute;
  top: 0; left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 200px;
  background: radial-gradient(ellipse at 50% 0%, rgba(58,140,255,0.18) 0%, rgba(100,60,255,0.08) 45%, transparent 70%);
  pointer-events: none;
}

/* Linha decorativa top */
.wn-hero::after {
  content: '';
  position: absolute;
  top: 0; left: 15%; right: 15%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(58,140,255,0.5), rgba(160,100,255,0.4), rgba(58,140,255,0.5), transparent);
}

/* Ícone do livro / símbolo */
.wn-hero-icon {
  font-size: 52px;
  line-height: 1;
  margin-bottom: 16px;
  display: block;
  filter: drop-shadow(0 0 20px rgba(100,160,255,0.5));
  animation: wn-float 3.5s ease-in-out infinite;
}
@keyframes wn-float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-6px); }
}

/* Título principal */
.wn-hero-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: clamp(28px, 5vw, 44px);
  font-weight: 900;
  letter-spacing: 8px;
  text-transform: uppercase;
  line-height: 1;
  margin-bottom: 10px;
  background: linear-gradient(135deg, #a0c8ff 0%, #ffffff 35%, #c8a0ff 65%, #7ab8ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 2px 16px rgba(100,160,255,0.35));
}

/* Subtítulo */
.wn-hero-sub {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: rgba(160,200,255,0.45);
  margin-bottom: 20px;
}

/* Linha ornamental */
.wn-hero-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin: 0 auto;
  max-width: 320px;
}
.wn-hero-divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(100,160,255,0.35));
}
.wn-hero-divider-line:last-child {
  background: linear-gradient(90deg, rgba(100,160,255,0.35), transparent);
}
.wn-hero-divider-gem {
  width: 6px;
  height: 6px;
  background: rgba(100,160,255,0.6);
  border-radius: 1px;
  transform: rotate(45deg);
  box-shadow: 0 0 8px rgba(100,160,255,0.5);
}

/* Título da seção */
.wn-home-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
  padding-top: 10px;
}
.wn-home-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.28);
  white-space: nowrap;
}
.wn-home-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(58,140,255,0.2), transparent);
}

/* Grid de cards */
.wn-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

/* Card de módulo */
.wn-card {
  position: relative;
  background: rgba(8,15,30,0.95);
  border: 1px solid rgba(58,140,255,0.1);
  border-radius: 16px;
  padding: 22px 16px 18px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  overflow: hidden;
  transition:
    transform 0.22s cubic-bezier(0.16,1,0.3,1),
    border-color 0.2s,
    box-shadow 0.2s,
    background 0.2s;
}

/* Brilho de topo colorido */
.wn-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--wn-color, #3a8cff), transparent);
  opacity: 0.5;
  transition: opacity 0.22s, left 0.22s, right 0.22s;
  border-radius: 16px 16px 0 0;
}

/* Halo radial no hover */
.wn-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(ellipse at 50% 0%, var(--wn-glow, rgba(58,140,255,0.1)) 0%, transparent 65%);
  opacity: 0;
  transition: opacity 0.25s;
  pointer-events: none;
}

.wn-card:hover {
  transform: translateY(-4px) scale(1.02);
  border-color: rgba(var(--wn-rgb, 58,140,255), 0.35);
  box-shadow:
    0 0 24px rgba(var(--wn-rgb, 58,140,255), 0.14),
    0 10px 30px rgba(0,0,0,0.5);
  background: rgba(10,18,36,0.98);
}
.wn-card:hover::before { opacity: 1; }
.wn-card:hover::after  { opacity: 1; }
.wn-card:active { transform: translateY(-1px) scale(0.98); transition-duration: 0.07s; }

/* Ícone grande */
.wn-card-icon {
  font-size: 36px;
  line-height: 1;
  filter: drop-shadow(0 2px 6px rgba(var(--wn-rgb, 58,140,255), 0.25));
  transition: transform 0.25s cubic-bezier(0.16,1,0.3,1);
}
.wn-card:hover .wn-card-icon { transform: scale(1.12) translateY(-2px); }

/* Nome */
.wn-card-name {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: rgba(221,232,255,0.88);
  line-height: 1.35;
  transition: color 0.18s;
}
.wn-card:hover .wn-card-name { color: #fff; }

/* Descrição curta */
.wn-card-desc {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 10.5px;
  font-weight: 500;
  color: rgba(255,255,255,0.22);
  line-height: 1.4;
  transition: color 0.18s;
}
.wn-card:hover .wn-card-desc { color: rgba(var(--wn-rgb, 58,140,255), 0.6); }

/* Seta de acesso */
.wn-card-arrow {
  position: absolute;
  bottom: 10px;
  right: 12px;
  opacity: 0;
  transform: scale(0.7) translateX(-4px);
  transition: opacity 0.18s, transform 0.18s;
  color: rgba(var(--wn-rgb, 58,140,255), 0.7);
  font-size: 14px;
}
.wn-card:hover .wn-card-arrow {
  opacity: 1;
  transform: scale(1) translateX(0);
}

/* Animação de entrada */
@keyframes wnCardIn {
  from { opacity: 0; transform: translateY(10px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.wn-card { animation: wnCardIn 0.3s cubic-bezier(0.16,1,0.3,1) both; }

/* ══════════════════════════════════════════
   TELA DE CONTEÚDO
══════════════════════════════════════════ */
#wn-content {
  display: none;
  padding: 0 0 60px;
}
#wn-content.visible { display: block; }

/* Breadcrumb / barra de volta */
.wn-topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 0 20px;
  border-bottom: 1px solid rgba(58,140,255,0.1);
  margin-bottom: 22px;
}

.wn-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  padding: 7px 14px 7px 10px;
  cursor: pointer;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.5);
  transition: background 0.18s, border-color 0.18s, color 0.18s, transform 0.15s;
  user-select: none;
  flex-shrink: 0;
}
.wn-back-btn:hover {
  background: rgba(58,140,255,0.08);
  border-color: rgba(58,140,255,0.3);
  color: #60aaff;
  transform: translateX(-2px);
}
.wn-back-btn:active { transform: translateX(-4px); transition-duration: 0.07s; }

.wn-back-arrow {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* Breadcrumb trail */
.wn-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.22);
}
.wn-breadcrumb-sep {
  color: rgba(255,255,255,0.12);
}
.wn-breadcrumb-current {
  color: rgba(255,255,255,0.65);
  display: flex;
  align-items: center;
  gap: 5px;
}
.wn-breadcrumb-current-icon { font-size: 13px; }

/* ── Mini banner do módulo ── */
.wn-mod-banner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px 0 24px;
  margin-bottom: 4px;
  overflow: hidden;
}
/* glow lateral esquerdo */
.wn-mod-banner::before {
  content: '';
  position: absolute;
  left: -40px; top: 50%;
  transform: translateY(-50%);
  width: 220px; height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--wn-mod-glow, rgba(58,140,255,0.15)) 0%, transparent 70%);
  pointer-events: none;
}
.wn-mod-banner-icon {
  font-size: 44px;
  line-height: 1;
  flex-shrink: 0;
  filter: drop-shadow(0 0 14px var(--wn-mod-color, rgba(58,140,255,0.6)));
  position: relative;
}
.wn-mod-banner-text { position: relative; }
.wn-mod-banner-label {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: var(--wn-mod-color, rgba(58,140,255,0.7));
  margin-bottom: 5px;
  opacity: 0.75;
}
.wn-mod-banner-name {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: clamp(20px, 4vw, 30px);
  font-weight: 900;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #fff;
  line-height: 1;
  text-shadow: 0 2px 20px var(--wn-mod-color, rgba(58,140,255,0.4));
}
.wn-mod-banner-desc {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12px;
  font-weight: 500;
  color: rgba(255,255,255,0.32);
  margin-top: 6px;
  letter-spacing: 0.5px;
}
/* linha decorativa embaixo */
.wn-mod-banner-line {
  height: 1px;
  background: linear-gradient(90deg, var(--wn-mod-color, rgba(58,140,255,0.4)), transparent 60%);
  margin-bottom: 20px;
  opacity: 0.5;
}

/* Área de conteúdo injetado */
#wn-slot {
  /* herda tudo — o conteúdo da aba é movido pra cá */
}

/* Responsivo */
@media (max-width: 640px) {
  .wn-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 10px;
  }
  .wn-card {
    padding: 18px 12px 15px;
    gap: 8px;
    border-radius: 14px;
  }
  .wn-card-icon { font-size: 30px; }
  .wn-card-name { font-size: 10.5px; }
  .wn-topbar { padding: 14px 0 16px; margin-bottom: 16px; }
}

@media (max-width: 400px) {
  .wn-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
}
`;
document.head.appendChild(S);

/* ── Definição dos módulos ────────────────────────────────────── */
const MODULES = [
  {
    id:    'itens',
    name:  'Itens & Drops',
    icon:  '📦',
    desc:  'Enciclopédia de drops por Pokémon',
    color: '#3a8cff',
    rgb:   '58,140,255',
  },
  {
    id:    'quests',
    name:  'Quests',
    icon:  '📜',
    desc:  'Missões e recompensas',
    color: '#ffd166',
    rgb:   '255,209,102',
  },
  {
    id:    'npcs',
    name:  'NPCs',
    icon:  '🧑‍💼',
    desc:  'Rockets, Officers e mais',
    color: '#a0d4ff',
    rgb:   '160,212,255',
  },
  {
    id:    'brokes',
    name:  'Brokes',
    icon:  '💥',
    desc:  'Sistema de brokes explicado',
    color: '#ff9f43',
    rgb:   '255,159,67',
  },
  {
    id:    'hazard',
    name:  'Hazard Tasks',
    icon:  '⚠️',
    desc:  'Tasks de NPCs especiais',
    color: '#ffd166',
    rgb:   '255,209,102',
  },
  {
    id:    'starcalc',
    name:  'Star Calc',
    icon:  '⭐',
    desc:  'Custo de evolução de estrelas',
    color: '#f0b429',
    rgb:   '240,180,41',
  },
  {
    id:    'punchingbag',
    name:  'Punching Bag',
    icon:  '🥊',
    desc:  'Treinamento e exp',
    color: '#ff6b6b',
    rgb:   '255,107,107',
  },
  {
    id:    'roupasspeed',
    name:  'Roupas Speed',
    icon:  '🎽',
    desc:  'Roupas e bônus de velocidade',
    color: '#60aaff',
    rgb:   '96,170,255',
  },
  {
    id:    'talents',
    name:  'PokéTalents',
    icon:  '✨',
    desc:  'Sistema de talentos',
    color: '#d4a0ff',
    rgb:   '212,160,255',
  },
  {
    id:    'tokens',
    name:  'Tokens',
    icon:  '🪙',
    desc:  'Moeda especial e Helds',
    color: '#f0b429',
    rgb:   '240,180,41',
  },
];

/* ── Renderizadores que já existem no app.js ──────────────────── */
const RENDERERS = {
  itens:       () => { if (typeof renderWiki       === 'function') renderWiki(); },
  respawn:     () => { if (typeof renderRespawn    === 'function') renderRespawn(); },
  quests:      () => { if (typeof renderQuests     === 'function') renderQuests(); },
  npcs:        () => {
    /* Garante que os dados dos grids sejam populados antes de exibir */
    if (typeof renderRockets  === 'function') renderRockets();
    if (typeof renderOfficers === 'function') renderOfficers();
    if (typeof switchNpcSubcat === 'function') {
      const btn = document.querySelector('.npc-subcat-btn.active');
      const sub = btn ? (btn.getAttribute('data-subcat') || 'rockets') : 'rockets';
      switchNpcSubcat(sub, btn);
    }
  },
  brokes:      () => { if (typeof renderBrokes     === 'function') renderBrokes(); },
  hazard:      () => { if (typeof renderHazard     === 'function') renderHazard(); },
  starcalc:    () => { if (typeof renderStarCalc   === 'function') renderStarCalc(); },
  punchingbag: () => { if (typeof renderPunchingBag=== 'function') renderPunchingBag(); },
  roupasspeed: () => { if (typeof renderRoupasSpeed=== 'function') renderRoupasSpeed(); },
  talents:     () => { if (typeof renderTalents    === 'function') renderTalents(); },
  tokens:      () => { if (typeof renderTokens     === 'function') renderTokens(); },
};

/* ── Estado ────────────────────────────────────────────────────── */
let _current = null;

/* ── Monta a estrutura no DOM ─────────────────────────────────── */
function buildShell() {
  const tabWiki = document.getElementById('tab-wiki');
  if (!tabWiki) return;

  // Cria o shell
  const shell = document.createElement('div');
  shell.id = 'wn-shell';

  /* ── HOME ── */
  const home = document.createElement('div');
  home.id = 'wn-home';
  home.innerHTML = `
    <div class="wn-hero">
      <span class="wn-hero-icon">📖</span>
      <div class="wn-hero-title">W I K I</div>
      <div class="wn-hero-sub">Enciclopédia PokeAlliance</div>
      <div class="wn-hero-divider">
        <div class="wn-hero-divider-line"></div>
        <div class="wn-hero-divider-gem"></div>
        <div class="wn-hero-divider-gem" style="background:rgba(180,100,255,0.6);box-shadow:0 0 8px rgba(180,100,255,0.5)"></div>
        <div class="wn-hero-divider-gem"></div>
        <div class="wn-hero-divider-line"></div>
      </div>
    </div>
    <div class="wn-home-header">
      <span class="wn-home-title">Módulos</span>
      <div class="wn-home-line"></div>
    </div>
    <div class="wn-grid">
      ${MODULES.map((m, i) => `
        <div class="wn-card"
          style="--wn-color:${m.color};--wn-rgb:${m.rgb};--wn-glow:rgba(${m.rgb},0.12);animation-delay:${i * 30}ms"
          onclick="window._wnOpen('${m.id}')"
          title="${m.name}">
          <div class="wn-card-icon">${m.icon}</div>
          <div class="wn-card-name">${m.name}</div>
          <div class="wn-card-desc">${m.desc}</div>
          <div class="wn-card-arrow">→</div>
        </div>
      `).join('')}
    </div>
  `;

  /* ── CONTENT ── */
  const content = document.createElement('div');
  content.id = 'wn-content';
  content.innerHTML = `
    <!-- Logo compacta da Wiki — aparece em todas as sub-abas -->
    <div class="wn-content-hero">
      <div class="wn-content-hero-body">
        <span class="wn-content-hero-icon">📖</span>
        <div class="wn-content-hero-inner">
          <div class="wn-content-hero-title">W I K I</div>
          <div class="wn-content-hero-sub">Enciclopédia PokeAlliance</div>
        </div>
      </div>
      <div class="wn-content-hero-ornament">
        <div class="wn-content-hero-ornament-line"></div>
        <div class="wn-content-hero-gem"></div>
        <div class="wn-content-hero-gem"></div>
        <div class="wn-content-hero-gem"></div>
      </div>
    </div>
    <div class="wn-topbar">
      <button class="wn-back-btn" onclick="window._wnBack()">
        <svg class="wn-back-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Voltar
      </button>
      <div class="wn-breadcrumb">
        <span>Wiki</span>
        <span class="wn-breadcrumb-sep">›</span>
        <span class="wn-breadcrumb-current" id="wn-breadcrumb-current">
          <span class="wn-breadcrumb-current-icon" id="wn-bc-icon"></span>
          <span id="wn-bc-name"></span>
        </span>
      </div>
    </div>
    <!-- Banner do módulo — preenchido pelo _wnOpen -->
    <div class="wn-mod-banner" id="wn-mod-banner">
      <div class="wn-mod-banner-icon" id="wn-mod-icon"></div>
      <div class="wn-mod-banner-text">
        <div class="wn-mod-banner-label">Wiki · Módulo</div>
        <div class="wn-mod-banner-name" id="wn-mod-name"></div>
        <div class="wn-mod-banner-desc" id="wn-mod-desc"></div>
      </div>
    </div>
    <div class="wn-mod-banner-line" id="wn-mod-line"></div>
    <div id="wn-slot"></div>
  `;

  shell.appendChild(home);
  shell.appendChild(content);
  tabWiki.appendChild(shell);
}

/* ── Abre um módulo ────────────────────────────────────────────── */
window._wnOpen = function (id) {
  const mod = MODULES.find(m => m.id === id);
  if (!mod) return;
  _current = id;

  /* Atualiza breadcrumb — innerHTML para emojis compostos como ⚠️ */
  const bcIcon = document.getElementById('wn-bc-icon');
  const bcName = document.getElementById('wn-bc-name');
  if (bcIcon) bcIcon.innerHTML = mod.icon;
  if (bcName) bcName.textContent = mod.name;

  /* Preenche o banner do módulo */
  const modBanner = document.getElementById('wn-mod-banner');
  const modLine   = document.getElementById('wn-mod-line');
  if (modBanner) {
    modBanner.style.setProperty('--wn-mod-color',  mod.color);
    modBanner.style.setProperty('--wn-mod-glow',   'rgba(' + mod.rgb + ',0.18)');
    document.getElementById('wn-mod-icon').innerHTML  = mod.icon;
    document.getElementById('wn-mod-name').textContent = mod.name;
    document.getElementById('wn-mod-desc').textContent = mod.desc;
  }
  if (modLine) {
    modLine.style.background = 'linear-gradient(90deg, ' + mod.color + '55, transparent 60%)';
  }

  /* Mostra a tela de conteúdo ANTES de disparar o renderer,
     assim elementos como scroll e visibilidade já estão prontos */
  document.getElementById('wn-home').style.display = 'none';
  const content = document.getElementById('wn-content');
  content.style.display = 'block';
  content.classList.add('visible');

  /* Rola pro topo */
  window.scrollTo({ top: 0, behavior: 'smooth' });

  /* Dispara o renderer — ele pode criar o panel dinamicamente */
  if (RENDERERS[id]) RENDERERS[id]();

  /* Monta o panel no slot — tenta imediatamente e de novo em 100ms
     caso o renderer seja assíncrono ou crie o elemento com delay */
  function _mountPanel() {
    const slot  = document.getElementById('wn-slot');
    const panel = document.getElementById('wiki-tab-' + id);
    if (slot && panel) {
      if (!slot.contains(panel)) {
        /* Remove qualquer panel anterior do slot */
        document.querySelectorAll('.wiki-subtab-content.wn-visible').forEach(function(el) {
          el.classList.remove('wn-visible');
        });
        while (slot.firstChild) slot.removeChild(slot.firstChild);
        slot.appendChild(panel);
      }
      /* Força visibilidade via classe (sobrepõe o display:none !important do CSS) */
      panel.classList.add('wn-visible');
    }
  }
  _mountPanel();
  setTimeout(_mountPanel, 100);
};

/* ── Volta para o home ─────────────────────────────────────────── */
window._wnBack = function () {
  if (!_current) return;

  /* Devolve o painel ao lugar original no DOM (dentro de #tab-wiki,
     mas fora do wn-slot) para não quebrar referências do app.js */
  const slot  = document.getElementById('wn-slot');
  const panel = document.getElementById('wiki-tab-' + _current);
  if (slot && panel) {
    const tabWiki = document.getElementById('tab-wiki');
    panel.classList.remove('wn-visible');  // esconde via CSS
    tabWiki.appendChild(panel);            // volta ao DOM original
    while (slot.firstChild) slot.removeChild(slot.firstChild);
  }

  _current = null;

  document.getElementById('wn-home').style.display = 'block';
  const content = document.getElementById('wn-content');
  content.style.display = 'none';
  content.classList.remove('visible');

  /* Rola pro topo */
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/* ── Init + patches robustos ───────────────────────────────────── */
/*
   PROBLEMA: app.js define switchTab e switchWikiTab como funções globais,
   e também faz seu próprio wrap de switchTab (linha ~3322 do app.js).
   wiki-nav.js é carregado DEPOIS, então podemos sobrescrever com segurança.

   FLUXO ao clicar na aba Wiki:
   1. switchTab('wiki', btn) → app.js faz tab ativo + chama renderWiki()
   2. switchWikiTab é chamado pelo usuário ao clicar num módulo
   3. Nosso shell intercepta ambos
*/

function init() {
  buildShell();

  /* Os panels são escondidos via CSS (.wiki-subtab-content { display:none !important })
     Só aparecem quando estão no #wn-slot com a classe .wn-visible */

  /* ── Sobrescreve switchTab AGORA (após app.js já ter feito seu wrap) ── */
  /* Captura o switchTab atual (que já é o wrap do app.js) */
  var _appSwitchTab = window.switchTab;
  window.switchTab = function (tab, btn) {
    /* Chama o do app.js normalmente (ativa a tab, chama renderWiki etc.) */
    if (_appSwitchTab) _appSwitchTab(tab, btn);

    /* Após o app.js rodar: se entrou na wiki, garante que o shell está correto */
    if (tab === 'wiki') {
      /* Panels escondidos via CSS - só precisamos garantir que nenhum tem wn-visible */
      document.querySelectorAll('.wiki-subtab-content.wn-visible').forEach(function (el) {
        el.classList.remove('wn-visible');
      });
      /* Mostra home, esconde content */
      var home    = document.getElementById('wn-home');
      var content = document.getElementById('wn-content');
      if (home)    home.style.display = 'block';
      if (content) { content.style.display = 'none'; content.classList.remove('visible'); }
      _current = null;
      /* Scroll pro topo */
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /* ── Sobrescreve switchWikiTab ──
     O app.js usa isso para mostrar sub-abas. Nós interceptamos para
     abrir nossos módulos em vez de exibir os panels diretamente. */
  window.switchWikiTab = function (tab, btn) {
    /* Só abre módulo se a wiki já está ativa E o shell já existe */
    var tabWiki = document.getElementById('tab-wiki');
    var shell   = document.getElementById('wn-shell');
    if (!tabWiki || !shell) return;
    if (!tabWiki.classList.contains('active')) return;

    /* Abre o módulo correspondente */
    window._wnOpen(tab);
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  /* app.js provavelmente já rodou — init imediatamente */
  init();
}

})();
