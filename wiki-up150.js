/* ================================================================
   wiki-up150.js — Guia de Up até Nível 150
   Carregue após wiki-nav.js no index.html:
     <script src="wiki-nav.js"></script>
     <script src="wiki-up150.js"></script>
================================================================ */
(function () {

/* ── Estilos do módulo ─────────────────────────────────────────── */
const S = document.createElement('style');
S.textContent = `

/* ═══════════════════════════════════════════
   UP150 — Container geral
═══════════════════════════════════════════ */
.up150-page {
  padding: 0 0 80px;
}

/* ── Hero do módulo ── */
.up150-hero {
  text-align: center;
  padding: 32px 20px 36px;
  position: relative;
}
.up150-hero-icon {
  font-size: 52px;
  display: block;
  margin-bottom: 12px;
  filter: drop-shadow(0 0 20px rgba(100,220,100,0.45));
  animation: up150-float 3.5s ease-in-out infinite;
}
@keyframes up150-float {
  0%,100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
}
.up150-hero-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: clamp(22px, 4vw, 34px);
  font-weight: 900;
  letter-spacing: 6px;
  text-transform: uppercase;
  background: linear-gradient(135deg, #80ffb0 0%, #ffffff 40%, #a0ffcc 70%, #60e090 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 2px 14px rgba(80,220,120,0.3));
  margin-bottom: 8px;
}
.up150-hero-sub {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: rgba(140,220,160,0.38);
}

/* ── Seletor de opção ── */
.up150-option-selector {
  display: flex;
  gap: 10px;
  margin: 0 0 28px;
}
.up150-opt-btn {
  flex: 1;
  padding: 14px 10px;
  border-radius: 14px;
  border: 1.5px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: border-color .2s, background .2s, box-shadow .2s, transform .15s;
  user-select: none;
}
.up150-opt-btn:hover {
  background: rgba(255,255,255,0.06);
  transform: translateY(-2px);
}
.up150-opt-btn.active {
  border-color: var(--up150-opt-color, #4caf78);
  background: rgba(76,175,120,0.07);
  box-shadow: 0 0 20px rgba(76,175,120,0.12);
}
.up150-opt-btn[data-opt="1"] { --up150-opt-color: #4caf78; }
.up150-opt-btn[data-opt="2"] { --up150-opt-color: #60aaff; }

.up150-opt-icon { font-size: 26px; }
.up150-opt-label {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.55);
  text-align: center;
  line-height: 1.4;
}
.up150-opt-btn.active .up150-opt-label {
  color: var(--up150-opt-color, #4caf78);
}

/* ── Conteúdo das opções ── */
.up150-option-content { display: none; }
.up150-option-content.visible { display: block; }

/* ── Seção de faixa de nível ── */
.up150-range-section {
  margin-bottom: 14px;
  border-radius: 18px;
  border: 1.5px solid rgba(255,255,255,0.07);
  background: rgba(6,12,26,0.85);
  overflow: hidden;
  transition: border-color .25s, box-shadow .25s;
}
.up150-range-section.open {
  border-color: var(--up150-color, rgba(255,255,255,0.18));
  box-shadow: 0 0 30px var(--up150-glow, rgba(255,255,255,0.05)), 0 6px 24px rgba(0,0,0,0.45);
}

/* Cabeçalho clicável */
.up150-range-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  cursor: pointer;
  user-select: none;
  transition: background .2s;
  -webkit-tap-highlight-color: transparent;
}
.up150-range-head:hover { background: rgba(255,255,255,0.02); }

.up150-range-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border-radius: 14px;
  background: var(--up150-bg2, rgba(255,255,255,0.05));
  border: 1px solid var(--up150-border, rgba(255,255,255,0.08));
  flex-shrink: 0;
  position: relative;
}
.up150-range-badge-emoji { font-size: 26px; }

.up150-range-info { flex: 1; min-width: 0; }
.up150-range-label {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--up150-color, rgba(255,255,255,0.4));
  opacity: 0.75;
  margin-bottom: 4px;
}
.up150-range-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}
.up150-range-sub {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11.5px;
  font-weight: 500;
  color: rgba(255,255,255,0.32);
}

.up150-range-pills {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}
.up150-lvl-pill {
  font-family: var(--font-mono, 'Space Mono', monospace);
  font-size: 11px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid var(--up150-border, rgba(255,255,255,0.1));
  color: var(--up150-color, rgba(255,255,255,0.6));
  background: var(--up150-bg, rgba(255,255,255,0.04));
  white-space: nowrap;
}

.up150-range-arrow {
  width: 20px; height: 20px;
  flex-shrink: 0;
  color: rgba(255,255,255,0.28);
  transition: transform .35s cubic-bezier(.4,0,.2,1), color .2s;
}
.up150-range-section.open .up150-range-arrow {
  transform: rotate(180deg);
  color: var(--up150-color, rgba(255,255,255,0.6));
}

/* Corpo retrátil */
.up150-range-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height .45s cubic-bezier(.4,0,.2,1), opacity .3s;
  opacity: 0;
}
.up150-range-section.open .up150-range-body {
  max-height: 2000px;
  opacity: 1;
}
.up150-range-expanded {
  padding: 0 20px 24px;
}

/* Separador topo */
.up150-range-sep {
  height: 1px;
  background: linear-gradient(90deg, var(--up150-border, rgba(255,255,255,0.08)), transparent);
  margin-bottom: 18px;
}

/* ── Steps dentro de cada faixa ── */
.up150-steps { display: flex; flex-direction: column; gap: 10px; }

.up150-step {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.05);
  transition: background .2s, border-color .2s;
}
.up150-step:hover {
  background: rgba(255,255,255,0.04);
  border-color: rgba(var(--up150-rgb, 255,255,255), 0.12);
}

.up150-step-num {
  width: 26px; height: 26px;
  border-radius: 8px;
  background: var(--up150-bg2, rgba(255,255,255,0.06));
  border: 1px solid var(--up150-border, rgba(255,255,255,0.1));
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono, 'Space Mono', monospace);
  font-size: 11px;
  font-weight: 700;
  color: var(--up150-color, rgba(255,255,255,0.5));
  flex-shrink: 0;
  margin-top: 1px;
}
.up150-step-body { flex: 1; min-width: 0; }
.up150-step-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 5px;
  letter-spacing: 0.3px;
}
.up150-step-text {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(255,255,255,0.52);
  line-height: 1.65;
}
.up150-step-text strong {
  color: rgba(255,255,255,0.82);
  font-weight: 700;
}

/* ── Tags de pokemon/hunt ── */
.up150-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-mono, 'Space Mono', monospace);
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 8px;
  margin: 2px 2px 2px 0;
  line-height: 1.4;
  vertical-align: middle;
}
.up150-tag--poke {
  background: rgba(100,180,255,0.1);
  border: 1px solid rgba(100,180,255,0.2);
  color: #80c8ff;
}
.up150-tag--hunt {
  background: rgba(255,180,60,0.1);
  border: 1px solid rgba(255,180,60,0.2);
  color: #ffb84a;
}
.up150-tag--item {
  background: rgba(180,100,255,0.1);
  border: 1px solid rgba(180,100,255,0.2);
  color: #d080ff;
}
.up150-tag--cmd {
  background: rgba(80,220,140,0.1);
  border: 1px solid rgba(80,220,140,0.2);
  color: #60e0a0;
  font-size: 10.5px;
}
.up150-tag--warn {
  background: rgba(255,100,100,0.1);
  border: 1px solid rgba(255,100,100,0.2);
  color: #ff8888;
}
.up150-tag--tip {
  background: rgba(255,220,60,0.1);
  border: 1px solid rgba(255,220,60,0.2);
  color: #ffd84a;
}

/* ── Bloco de dica/nota especial ── */
.up150-note {
  margin-top: 8px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255,220,60,0.05);
  border-left: 3px solid rgba(255,220,60,0.3);
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12px;
  color: rgba(255,230,120,0.75);
  line-height: 1.6;
}
.up150-note strong { color: rgba(255,230,120,0.95); }

.up150-note--green {
  background: rgba(80,220,140,0.05);
  border-left-color: rgba(80,220,140,0.3);
  color: rgba(120,230,160,0.75);
}
.up150-note--green strong { color: rgba(140,240,180,0.95); }

.up150-note--blue {
  background: rgba(80,160,255,0.05);
  border-left-color: rgba(80,160,255,0.3);
  color: rgba(130,185,255,0.75);
}
.up150-note--blue strong { color: rgba(160,200,255,0.95); }

/* ── Tabela de nível rápido ── */
.up150-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin-top: 12px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.07);
}
.up150-table th {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.04);
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.up150-table td {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(255,255,255,0.6);
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  vertical-align: middle;
}
.up150-table tr:last-child td { border-bottom: none; }
.up150-table tr:hover td { background: rgba(255,255,255,0.025); }
.up150-table td:first-child {
  font-family: var(--font-mono, 'Space Mono', monospace);
  font-size: 11px;
  font-weight: 700;
  color: var(--up150-color, #80c8ff);
}

/* ── Linha divisória de seção ── */
.up150-section-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 24px 0 16px;
}
.up150-section-divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(255,255,255,0.06), transparent);
}
.up150-section-divider-text {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.18);
  white-space: nowrap;
}

/* ── Link externo ── */
.up150-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #60aaff;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  border-bottom: 1px solid rgba(96,170,255,0.3);
  transition: color .18s, border-color .18s;
}
.up150-link:hover { color: #90caff; border-color: rgba(144,202,255,0.5); }
.up150-link-icon { font-size: 11px; }

/* ── Items recebidos ── */
.up150-items-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.up150-item-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid rgba(180,100,255,0.2);
  background: rgba(180,100,255,0.07);
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12px;
  font-weight: 600;
  color: rgba(210,160,255,0.85);
}
.up150-item-chip-icon { font-size: 14px; }

/* ── Pokémon choices (starter) ── */
.up150-starter-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.up150-starter-chip {
  flex: 1;
  min-width: 90px;
  padding: 12px 10px;
  border-radius: 12px;
  border: 1.5px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11.5px;
  font-weight: 700;
  color: rgba(255,255,255,0.55);
  text-transform: capitalize;
  letter-spacing: 0.5px;
  transition: border-color .2s, background .2s;
  cursor: default;
}
.up150-starter-chip:hover {
  border-color: rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.055);
}
.up150-starter-chip img {
  width: 72px;
  height: 72px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 2px 8px var(--starter-glow, rgba(255,255,255,0.2)));
  transition: transform .25s cubic-bezier(.16,1,.3,1), filter .2s;
}
.up150-starter-chip:hover img {
  transform: scale(1.12) translateY(-3px);
  filter: drop-shadow(0 4px 14px var(--starter-glow, rgba(255,255,255,0.35)));
}
.up150-starter-chip[data-starter="charmander"] {
  --starter-color: rgba(255,120,40,0.14);
  --starter-border: rgba(255,120,40,0.32);
  --starter-glow: rgba(255,120,40,0.5);
  --starter-text: #ffaa70;
}
.up150-starter-chip[data-starter="squirtle"] {
  --starter-color: rgba(60,160,255,0.13);
  --starter-border: rgba(60,160,255,0.30);
  --starter-glow: rgba(60,160,255,0.5);
  --starter-text: #70c0ff;
}
.up150-starter-chip[data-starter="bulbasaur"] {
  --starter-color: rgba(80,200,100,0.13);
  --starter-border: rgba(80,200,100,0.30);
  --starter-glow: rgba(80,200,100,0.5);
  --starter-text: #70e090;
}
.up150-starter-chip[data-starter] {
  background: var(--starter-color);
  border-color: var(--starter-border);
  color: var(--starter-text);
}

/* ── Responsivo ── */
@media (max-width: 480px) {
  .up150-range-head { padding: 14px 16px; gap: 10px; }
  .up150-range-badge { width: 46px; height: 46px; border-radius: 12px; }
  .up150-range-badge-emoji { font-size: 22px; }
  .up150-range-title { font-size: 14px; }
  .up150-range-expanded { padding: 0 14px 20px; }
  .up150-step { padding: 12px 12px; gap: 10px; }
  .up150-option-selector { flex-direction: column; }
}
`;
document.head.appendChild(S);

/* ════════════════════════════════════════════════════════════════
   DADOS DO GUIA
════════════════════════════════════════════════════════════════ */

/* ─── OPÇÃO 1: Rápida e Eficiente ──────────────────────────── */
const RANGES_OPT1 = [
  {
    id:      'range-inicio',
    emoji:   '🏙️',
    label:   'Início da Jornada',
    title:   'Pallet Town — Setup Inicial',
    sub:     'Escolha seu starter e configure tudo',
    lvlTag:  'Nível 1–5',
    color:   '#80c8ff',
    rgb:     '128,200,255',
    steps: [
      {
        title: 'Fale com o Professor Carvalho',
        text: `Clique com o botão direito nele e digite <span class="up150-tag up150-tag--cmd">pokemon</span>. Escolha seu Pokémon inicial:`,
        extra: `<div class="up150-starter-row">
          <div class="up150-starter-chip" data-starter="charmander"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png" alt="Charmander">Charmander</div>
          <div class="up150-starter-chip" data-starter="squirtle"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png" alt="Squirtle">Squirtle</div>
          <div class="up150-starter-chip" data-starter="bulbasaur"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png" alt="Bulbasaur">Bulbasaur</div>
        </div>
        <div style="margin-top:10px">
          <div style="font-family:var(--font-title);font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.28);margin-bottom:8px">Itens recebidos ao escolher:</div>
          <div class="up150-items-row">
            <div class="up150-item-chip"><span class="up150-item-chip-icon">🥚</span> Mysterious Egg</div>
            <div class="up150-item-chip"><span class="up150-item-chip-icon">🎟️</span> Moving Ticket</div>
            <div class="up150-item-chip"><span class="up150-item-chip-icon">📦</span> Starter Pack</div>
          </div>
        </div>`,
      },
      {
        title: 'Pegue seu Starter Box FREE na Store',
        text: `Abra a <strong>Store</strong>, vá em <strong>Market</strong> e procure o <span class="up150-tag up150-tag--item">Starter Box</span>.`,
      },
      {
        title: 'Fale com Dr. Oliveira (ao norte do laboratório)',
        text: `Clique com o botão direito e envie os comandos: <span class="up150-tag up150-tag--cmd">mission</span> <span class="up150-tag up150-tag--cmd">yes</span>`,
        extra: `<div class="up150-note">
          <strong>⚠️ Não pule isso!</strong> Inicia a task de matar <strong>50 Dittos</strong> — essencial para criar um <strong>Shiny Ditto</strong> no futuro.
        </div>`,
      },
    ],
  },
  {
    id:      'range-1-10',
    emoji:   '🔵',
    label:   'Faixa de Nível',
    title:   'Nível 1 → 10',
    sub:     'Moving Ticket · Bueiro de Saffron',
    lvlTag:  'Nível 1–10',
    color:   '#60e090',
    rgb:     '96,224,144',
    steps: [
      {
        title: 'Use o Moving Ticket para Saffron City',
        text: `Dentro do laboratório (área PZ), utilize o ticket e escolha a <strong>primeira opção</strong>. Isso te leva diretamente a Saffron City.`,
      },
      {
        title: 'Vá ao Bueiro de Saffron',
        text: `Encontre o bueiro em Saffron City e use-o para upar do nível 1 ao 10. Os Pokémon aqui são fracos e rápidos de matar.`,
        extra: `<div class="up150-note up150-note--green">
          <strong>💡 Dica:</strong> Priorize Pokémon que dão mais XP. Fique no bueiro até o nível 10 antes de sair.
        </div>`,
      },
    ],
  },
  {
    id:      'range-10-40',
    emoji:   '⚡',
    label:   'Faixa de Nível',
    title:   'Nível 10 → 40',
    sub:     'Cerulean · Diglett · Usina Elétrica',
    lvlTag:  'Nível 10–40',
    color:   '#ffcc44',
    rgb:     '255,204,68',
    steps: [
      {
        title: 'Siga para Cerulean City',
        text: `Caminhe pelo caminho norte. Derrote tudo que encontrar no caminho — cada kill conta!
        <br><br>Referência de mapa: <a href="https://prnt.sc/E5V86ofXDDXu" target="_blank" class="up150-link"><span class="up150-link-icon">🗺️</span> Ver imagem</a>`,
      },
      {
        title: 'Capture um Diglett em Cerulean',
        text: `Em Cerulean, vá à <strong>direita</strong> para a hunt de <span class="up150-tag up150-tag--poke">🐭 Diglett</span> e capture um. Ele será seu Pokémon principal para a próxima etapa.`,
      },
      {
        title: 'Upe com Diglett na Usina Elétrica (Sul de Cerulean)',
        text: `Use o Diglett para upar na <strong>Usina Elétrica</strong>, localizada ao sul de Cerulean.
        <br><br>Referência de mapa: <a href="https://imgur.com/a/8vlhXCv" target="_blank" class="up150-link"><span class="up150-link-icon">🗺️</span> Ver imagem</a>`,
        extra: `<div class="up150-note">
          <strong>Objetivo:</strong> Ficar do nível 10 até o <strong>nível 40</strong> aqui antes de avançar.
        </div>`,
      },
    ],
  },
  {
    id:      'range-40-50',
    emoji:   '⚡',
    label:   'Faixa de Nível',
    title:   'Nível 40 → 50',
    sub:     'Usina de Pikachu · Direita de Saffron',
    lvlTag:  'Nível 40–50',
    color:   '#ff9f43',
    rgb:     '255,159,67',
    steps: [
      {
        title: 'Mude para a Usina de Pikachu',
        text: `Localize a <strong>Usina de Pikachu</strong> na direita de Saffron City.
        <br><br>Referência de mapa: <a href="https://prnt.sc/9rwYPWyNlqMB" target="_blank" class="up150-link"><span class="up150-link-icon">🗺️</span> Ver imagem</a>`,
        extra: `<div class="up150-note up150-note--blue">
          <strong>💡 Dica:</strong> A Usina de Pikachu oferece XP maior que o bueiro. Upe aqui do 40 ao 50.
        </div>`,
      },
    ],
  },
  {
    id:      'range-50-evolucao',
    emoji:   '💎',
    label:   'Evolução',
    title:   'Nível 50 — Evolua o Diglett',
    sub:     'Earth Stone · Dugtrio',
    lvlTag:  'Nível 50',
    color:   '#d4a0ff',
    rgb:     '212,160,255',
    steps: [
      {
        title: 'Evolua Diglett para Dugtrio',
        text: `No nível 50, use uma <span class="up150-tag up150-tag--item">🪨 Earth Stone</span> no seu Diglett para evoluí-lo para <span class="up150-tag up150-tag--poke">🐾 Dugtrio</span>.`,
        extra: `<div class="up150-note up150-note--green">
          <strong>✅ Por que Dugtrio?</strong> O Dugtrio tem stats significativamente maiores que o Diglett e vai matar Pokémon muito mais rápido nas próximas hunts.
        </div>`,
      },
    ],
  },
  {
    id:      'range-50-80',
    emoji:   '⚡',
    label:   'Faixa de Nível',
    title:   'Nível 50 → 80',
    sub:     'Usina Elétrica · Raichu ou Jolteon',
    lvlTag:  'Nível 50–80',
    color:   '#ffd166',
    rgb:     '255,209,102',
    steps: [
      {
        title: 'Escolha sua hunt: Raichu ou Jolteon',
        text: `Na Usina Elétrica, selecione o andar conforme sua escolha de Pokémon de suporte:`,
        extra: `<table class="up150-table" style="--up150-color:#ffd166">
          <thead>
            <tr>
              <th>Pokémon</th>
              <th>Localização</th>
              <th>Observação</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="up150-tag up150-tag--poke">⚡ Raichu</span></td>
              <td>2º andar da Usina</td>
              <td style="color:rgba(255,255,255,0.5)">Boa XP, fácil acesso</td>
            </tr>
            <tr>
              <td><span class="up150-tag up150-tag--poke">⚡ Jolteon</span></td>
              <td>3º andar da Usina</td>
              <td style="color:rgba(255,255,255,0.5)">XP maior, mais difícil</td>
            </tr>
          </tbody>
        </table>`,
      },
      {
        title: 'Opção: Substituir Dugtrio por Steelix',
        text: `Se quiser, capture um <span class="up150-tag up150-tag--poke">🐍 Onix</span> e evolua-o com um <span class="up150-tag up150-tag--item">🔩 Metal Coat</span>.`,
        extra: `<div class="up150-note up150-note--blue">
          <strong>Como evoluir o Onix:</strong><br>
          1. Equipe o Metal Coat no Onix.<br>
          2. Antes de caçar, use o comando <span class="up150-tag up150-tag--cmd">look</span> no Pokémon — deve aparecer <strong>"holding Metal Coat"</strong>.<br>
          3. Cada mob que você matar com o Metal Coat equipado dá uma chance de evolução automática.<br>
          <br>
          <strong>⚠️ Verifique sempre</strong> se ele está segurando o Metal Coat antes de sair para caçar!
        </div>`,
      },
    ],
  },
  {
    id:      'range-80-100',
    emoji:   '🔥',
    label:   'Faixa de Nível',
    title:   'Nível 80 → 100',
    sub:     'Subsolo da Usina · Electabuzz',
    lvlTag:  'Nível 80–100',
    color:   '#ff9060',
    rgb:     '255,144,96',
    steps: [
      {
        title: 'Vá para o Subsolo da Usina',
        text: `Desça para o <strong>Subsolo da Usina Elétrica</strong> e cace <span class="up150-tag up150-tag--poke">⚡ Electabuzz</span>. Eles dão muito mais XP do que os andares superiores.`,
        extra: `<div class="up150-note">
          <strong>🎯 Meta:</strong> Chegar ao nível 100 aqui antes de avançar para as hunts de nível alto.
        </div>`,
      },
    ],
  },
  {
    id:      'range-100-150',
    emoji:   '🏆',
    label:   'Faixa de Nível',
    title:   'Nível 100 → 150',
    sub:     'Subsolo da Usina · Electabuzz (continuação)',
    lvlTag:  'Nível 100–150',
    color:   '#60e0b0',
    rgb:     '96,224,176',
    steps: [
      {
        title: 'Continue no Subsolo com Electabuzz',
        text: `Permaneça na hunt de <span class="up150-tag up150-tag--poke">⚡ Electabuzz</span> no subsolo. É a hunt mais eficiente desta faixa — não saia daqui cedo demais.`,
        extra: `<div class="up150-note up150-note--green">
          <strong>✅ Recomendado:</strong> Use <strong>Dugtrio</strong> ou <strong>Steelix</strong> aqui dependendo do que você evoluiu. Ambos se saem bem contra Electabuzz.
        </div>`,
      },
      {
        title: 'Fique atento à Ditto Task',
        text: `Se ainda não completou a task dos <strong>50 Dittos</strong> do Dr. Oliveira, tente paralelizar — dê uma passada nas hunts de Ditto enquanto ainda estiver upando.`,
        extra: `<div class="up150-note">
          <strong>💡 Por que é importante?</strong> Completar a task libera a possibilidade de criar um <strong>Shiny Ditto</strong>, que tem altíssimo valor no servidor.
        </div>`,
      },
      {
        title: 'Use Tasks e Dailys para acelerar',
        text: `Complemente o up com: <span class="up150-tag up150-tag--tip">📋 Tasks</span> <span class="up150-tag up150-tag--tip">📅 Daily Kill</span> <span class="up150-tag up150-tag--tip">📅 Daily Catch</span>`,
        extra: `<div class="up150-note up150-note--blue">
          <strong>Daily Kill e Catch não têm limite!</strong> Quanto mais você fizer, mais XP bônus acumula. Não ignore essas fontes extras de experiência.
        </div>`,
      },
    ],
  },
];

/* ─── OPÇÃO 2: Exploração e Aventura ──────────────────────────── */
const RANGES_OPT2 = [
  {
    id:      'range-exp-inicio',
    emoji:   '🌿',
    label:   'Início da Jornada',
    title:   'Pallet Town — Começo Clássico',
    sub:     'Escolha seu starter e explore',
    lvlTag:  'Nível 1',
    color:   '#80c8ff',
    rgb:     '128,200,255',
    steps: [
      {
        title: 'Setup Inicial (igual à Opção 1)',
        text: `Siga os mesmos três primeiros passos: fale com o Professor Carvalho, pegue o Starter Box na Store e fale com o Dr. Oliveira para iniciar a task dos 50 Dittos.`,
        extra: `<div class="up150-note up150-note--blue">
          <strong>Não pule a task do Dr. Oliveira</strong> — mesmo explorando, você vai encontrar Dittos pelo caminho. Comece a missão desde já!
        </div>`,
      },
    ],
  },
  {
    id:      'range-exp-viridian',
    emoji:   '🌲',
    label:   'Exploração',
    title:   'Pallet → Viridian → Pewter',
    sub:     'Explore florestas e siga para o norte',
    lvlTag:  'Nível 1–15',
    color:   '#60e090',
    rgb:     '96,224,144',
    steps: [
      {
        title: 'Saia pela esquerda do laboratório',
        text: `Siga para o <strong>norte</strong> a partir de Pallet Town. Derrote tudo que encontrar pelo caminho — cada batalha conta!`,
        extra: `<div class="up150-note up150-note--green">
          <strong>🌿 Aproveite a jornada!</strong> Esta opção é para quem quer explorar o mundo Pokémon. Não tenha pressa.
        </div>`,
      },
      {
        title: 'Caminhe para Viridian City',
        text: `Siga direto de Viridian para <strong>Pewter City</strong>. Explore as florestas e aprecie a jornada!`,
      },
      {
        title: 'Cure em Pewter — Centro Pokémon',
        text: `Quando chegar em Pewter, cure seus Pokémon no <span class="up150-tag up150-tag--tip">🏥 Centro Pokémon (CP)</span> antes de continuar.`,
      },
      {
        title: 'Siga para a direita de Pewter',
        text: `Após curar, siga pela <strong>direita de Pewter</strong>, enfrentando Pokémon mais fortes no caminho. Aproveite para conhecer a região e descobrir segredos.`,
      },
    ],
  },
  {
    id:      'range-exp-cerulean',
    emoji:   '💧',
    label:   'Chegada em Cerulean',
    title:   'Cerulean City — Bifurcação',
    sub:     'Siga a Opção 1 ou continue explorando',
    lvlTag:  'Nível 15+',
    color:   '#60aaff',
    rgb:     '96,170,255',
    steps: [
      {
        title: 'Você chegou em Cerulean!',
        text: `A partir daqui você pode escolher como continuar:`,
        extra: `<table class="up150-table" style="--up150-color:#60aaff">
          <thead>
            <tr>
              <th>Caminho</th>
              <th>Descrição</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>🚀 Mudar para Opção 1</td>
              <td style="color:rgba(255,255,255,0.55)">Capture um Diglett, vá à Usina Elétrica e siga o guia rápido</td>
            </tr>
            <tr>
              <td>🌍 Continuar explorando</td>
              <td style="color:rgba(255,255,255,0.55)">Upe onde quiser, explore novas áreas e descubra hunts diferentes</td>
            </tr>
            <tr>
              <td>📋 Tasks e Dailys</td>
              <td style="color:rgba(255,255,255,0.55)">Daily Kill e Catch não têm limite — ótima fonte de XP extra</td>
            </tr>
          </tbody>
        </table>`,
      },
      {
        title: 'Use Tasks e Dailys para acelerar',
        text: `Independente do caminho escolhido, sempre complete suas <span class="up150-tag up150-tag--tip">📅 Daily Kill</span> e <span class="up150-tag up150-tag--tip">📅 Daily Catch</span> — sem limite diário!`,
        extra: `<div class="up150-note up150-note--green">
          <strong>💡 Dica para exploradores:</strong> Não se preocupe tanto com a rota "ótima". O importante é se divertir e ir upando naturalmente. Você chega lá!
        </div>`,
      },
    ],
  },
];

/* ════════════════════════════════════════════════════════════════
   RENDERER
════════════════════════════════════════════════════════════════ */
function renderUp150() {
  const panel = document.getElementById('wiki-tab-up150');
  if (!panel) return;
  if (panel.dataset.rendered === '1') return;
  panel.dataset.rendered = '1';

  panel.innerHTML = `
    <div class="up150-page">

      <!-- Hero -->
      <div class="up150-hero">
        <span class="up150-hero-icon">⬆️</span>
        <div class="up150-hero-title">GUIA DE UP</div>
        <div class="up150-hero-sub">Do nível 1 ao 150 · Passo a Passo</div>
      </div>

      <!-- Seletor de opção -->
      <div class="up150-option-selector">
        <button class="up150-opt-btn active" data-opt="1" onclick="up150SelectOpt(1)">
          <span class="up150-opt-icon">⚡</span>
          <span class="up150-opt-label">Opção 1<br>Rápida & Eficiente</span>
        </button>
        <button class="up150-opt-btn" data-opt="2" onclick="up150SelectOpt(2)">
          <span class="up150-opt-icon">🌍</span>
          <span class="up150-opt-label">Opção 2<br>Exploração & Aventura</span>
        </button>
      </div>

      <!-- Conteúdo Opção 1 -->
      <div class="up150-option-content visible" id="up150-opt1-content">
        ${buildRanges(RANGES_OPT1, 'opt1')}
      </div>

      <!-- Conteúdo Opção 2 -->
      <div class="up150-option-content" id="up150-opt2-content">
        ${buildRanges(RANGES_OPT2, 'opt2')}
      </div>

    </div>
  `;

  /* Bind: abrir/fechar seções */
  panel.querySelectorAll('.up150-range-head').forEach(function(head) {
    head.addEventListener('click', function() {
      var sec = head.closest('.up150-range-section');
      sec.classList.toggle('open');
    });
  });

  /* Abre a primeira seção de cada opção por padrão */
  var firstOpt1 = panel.querySelector('#up150-opt1-content .up150-range-section');
  var firstOpt2 = panel.querySelector('#up150-opt2-content .up150-range-section');
  if (firstOpt1) firstOpt1.classList.add('open');
  if (firstOpt2) firstOpt2.classList.add('open');
}

function buildRanges(ranges, prefix) {
  return ranges.map(function(r, i) {
    var colorStyle = [
      '--up150-color:' + r.color,
      '--up150-rgb:'   + r.rgb,
      '--up150-bg:rgba(' + r.rgb + ',0.06)',
      '--up150-bg2:rgba(' + r.rgb + ',0.10)',
      '--up150-border:rgba(' + r.rgb + ',0.20)',
      '--up150-glow:rgba(' + r.rgb + ',0.10)',
    ].join(';');

    var stepsHtml = r.steps.map(function(s, si) {
      return `
        <div class="up150-step">
          <div class="up150-step-num">${si + 1}</div>
          <div class="up150-step-body">
            <div class="up150-step-title">${s.title}</div>
            <div class="up150-step-text">${s.text}</div>
            ${s.extra || ''}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="up150-range-section" id="${prefix}-${r.id}" style="${colorStyle}">
        <div class="up150-range-head">
          <div class="up150-range-badge">
            <span class="up150-range-badge-emoji">${r.emoji}</span>
          </div>
          <div class="up150-range-info">
            <div class="up150-range-label">${r.label}</div>
            <div class="up150-range-title">${r.title}</div>
            <div class="up150-range-sub">${r.sub}</div>
          </div>
          <div class="up150-range-pills">
            <div class="up150-lvl-pill">${r.lvlTag}</div>
          </div>
          <svg class="up150-range-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div class="up150-range-body">
          <div class="up150-range-expanded">
            <div class="up150-range-sep"></div>
            <div class="up150-steps">${stepsHtml}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* Troca de opção */
window.up150SelectOpt = function(opt) {
  document.querySelectorAll('.up150-opt-btn').forEach(function(b) {
    b.classList.toggle('active', +b.dataset.opt === opt);
  });
  document.getElementById('up150-opt1-content').classList.toggle('visible', opt === 1);
  document.getElementById('up150-opt2-content').classList.toggle('visible', opt === 2);
};

/* ════════════════════════════════════════════════════════════════
   REGISTRA O PAINEL E O RENDERER
════════════════════════════════════════════════════════════════ */
function registerUp150() {
  /* Cria o painel se não existir */
  var tabWiki = document.getElementById('tab-wiki');
  if (!tabWiki) return;
  if (document.getElementById('wiki-tab-up150')) return;

  var panel = document.createElement('div');
  panel.id        = 'wiki-tab-up150';
  panel.className = 'wiki-subtab-content';
  tabWiki.appendChild(panel);

  /* Injeta o renderer no sistema wiki-nav */
  if (window._wnRenderers) {
    window._wnRenderers['up150'] = renderUp150;
  }
  /* Fallback: patch via referência direta ao objeto RENDERERS interno */
  /* (wiki-nav expõe via window._wnOpen — o renderer é chamado lá) */
}

/* ── Patch do _wnOpen para chamar renderUp150 ── */
(function patchWnOpen() {
  var _orig = window._wnOpen;
  window._wnOpen = function(id) {
    if (id === 'up150') {
      /* Registra panel se necessário */
      registerUp150();
      /* Chama o renderer antes do _wnOpen original montar o slot */
      renderUp150();
    }
    if (_orig) _orig(id);
  };
})();

/* ── Init ── */
function init() {
  if (window._wnInitDone) {
    registerUp150();
  } else {
    document.addEventListener('DOMContentLoaded', registerUp150);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();