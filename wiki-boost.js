/* ================================================================
   wiki-boost.js — Sistema de Boost Wiki Page
   Carregue APÓS wiki-nav.js no index.html:
     <script src="wiki-boost.js"></script>
================================================================ */
(function () {

/* ── Estilos da página de Boost ─────────────────────────────── */
const S = document.createElement('style');
S.textContent = `

/* ── Container geral ── */
.boost-page {
  padding: 0 0 80px;
}

/* ── Seções ── */
.boost-section {
  margin: 0 16px 20px;
  border-radius: 18px;
  border: 1.5px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.03);
  overflow: hidden;
}

/* ── Cabeçalho de seção ── */
.boost-sec-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 22px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.boost-sec-icon {
  font-size: 26px;
  line-height: 1;
  flex-shrink: 0;
  filter: drop-shadow(0 0 12px currentColor);
}
.boost-sec-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #fff;
  flex: 1;
}
.boost-sec-badge {
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 20px;
  background: var(--boost-badge-bg, rgba(58,140,255,0.15));
  color: var(--boost-badge-color, #6ab8ff);
  border: 1px solid var(--boost-badge-border, rgba(58,140,255,0.3));
  white-space: nowrap;
}

/* ── Corpo de seção ── */
.boost-sec-body {
  padding: 18px 22px;
}

/* ── Parágrafos de info ── */
.boost-info-p {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 14px;
  color: rgba(255,255,255,0.62);
  line-height: 1.7;
  margin-bottom: 14px;
}
.boost-info-p:last-child { margin-bottom: 0; }
.boost-info-p strong {
  color: rgba(255,255,255,0.9);
  font-weight: 700;
}

/* ── Caixa de exemplo ── */
.boost-example-box {
  margin-top: 14px;
  padding: 14px 18px;
  border-radius: 12px;
  border: 1px solid rgba(255,200,80,0.25);
  background: rgba(255,200,80,0.06);
}
.boost-example-label {
  font-family: var(--font-mono, monospace);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(255,200,80,0.55);
  margin-bottom: 6px;
}
.boost-example-text {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13.5px;
  color: rgba(255,220,120,0.85);
  line-height: 1.65;
}

/* ── Caixa de dica ── */
.boost-tip-box {
  margin-top: 14px;
  padding: 14px 18px;
  border-radius: 12px;
  border: 1px solid rgba(96,224,160,0.20);
  background: rgba(96,224,160,0.05);
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.boost-tip-icon {
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 1px;
}
.boost-tip-text {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13.5px;
  color: rgba(160,255,200,0.75);
  line-height: 1.65;
}

/* ── Caixa de aviso ── */
.boost-warn-box {
  margin-top: 14px;
  padding: 14px 18px;
  border-radius: 12px;
  border: 1px solid rgba(255,140,60,0.25);
  background: rgba(255,140,60,0.05);
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.boost-warn-icon {
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 1px;
}
.boost-warn-text {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13.5px;
  color: rgba(255,180,100,0.80);
  line-height: 1.65;
}

/* ── Imagem de localização ── */
.boost-location-img {
  display: block;
  max-width: 480px;
  width: 100%;
  height: auto;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  margin: 14px auto 0;
  background: rgba(0,0,0,0.3);
}

/* ── Tabela de fragmentos ── */
.boost-table-wrap {
  overflow-x: auto;
  margin-top: 14px;
  border-radius: 12px;
  border: 1px solid rgba(80,220,220,0.2);
}
.boost-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono, monospace);
  font-size: 12px;
  min-width: 540px;
}
.boost-table-head-main {
  background: rgba(80,200,220,0.18);
  text-align: center;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  padding: 10px 8px;
  border-bottom: 1px solid rgba(80,220,220,0.2);
}
.boost-table th {
  background: rgba(80,200,220,0.10);
  color: rgba(160,240,255,0.9);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 7px 10px;
  text-align: center;
  border-bottom: 1px solid rgba(80,220,220,0.15);
  white-space: nowrap;
}
.boost-table td {
  padding: 7px 10px;
  text-align: center;
  color: rgba(255,255,255,0.75);
  border-bottom: 1px solid rgba(255,255,255,0.04);
  border-right: 1px solid rgba(255,255,255,0.04);
}
.boost-table tr:last-child td { border-bottom: none; }
.boost-table .col-range {
  color: rgba(160,240,255,0.70);
  font-size: 10px;
  background: rgba(80,200,220,0.06);
}
.boost-table .col-min td { background: rgba(58,140,255,0.06); }
.boost-table .col-avg td { background: rgba(100,200,100,0.06); }
.boost-table .col-max td { background: rgba(255,160,80,0.06); }
.boost-table-group-head {
  background: rgba(80,200,220,0.12);
  color: rgba(140,230,255,0.80);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  padding: 5px 10px;
  text-align: center;
  border-bottom: 1px solid rgba(80,220,220,0.12);
  border-right: 1px solid rgba(255,255,255,0.04);
}

/* ── Imagem de fragmento ── */
.boost-frag-img-wrap {
  margin-top: 14px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.boost-frag-img-wrap img {
  display: block;
  width: 100%;
  max-width: 560px;
  height: auto;
  border-radius: 8px;
}

/* ── Cards de passos ── */
.boost-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}
.boost-step-card {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 16px 18px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.02);
  transition: border-color .2s, background .2s;
}
.boost-step-card:hover {
  border-color: rgba(255,255,255,0.13);
  background: rgba(255,255,255,0.04);
}
.boost-step-num {
  width: 36px; height: 36px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono, monospace);
  font-size: 16px;
  font-weight: 900;
  flex-shrink: 0;
  background: var(--boost-step-bg, rgba(58,140,255,0.15));
  color: var(--boost-step-color, #6ab8ff);
  border: 1px solid var(--boost-step-border, rgba(58,140,255,0.3));
}
.boost-step-content { flex: 1; min-width: 0; }
.boost-step-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}
.boost-step-desc {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13.5px;
  color: rgba(255,255,255,0.55);
  line-height: 1.65;
}
.boost-step-desc strong {
  color: rgba(255,255,255,0.85);
}

/* ── Cards de obtenção alternativa ── */
.boost-alt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-top: 4px;
}
.boost-alt-card {
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.025);
  padding: 16px 18px;
  transition: border-color .2s, background .2s;
}
.boost-alt-card:hover {
  border-color: rgba(255,255,255,0.13);
  background: rgba(255,255,255,0.045);
}
.boost-alt-card-icon { font-size: 24px; margin-bottom: 10px; line-height: 1; }
.boost-alt-card-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}
.boost-alt-card-desc {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12.5px;
  color: rgba(255,255,255,0.50);
  line-height: 1.6;
}
.boost-alt-card-desc .boost-alt-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 4px;
}
.boost-alt-card-desc .boost-alt-item::before {
  content: '›';
  color: rgba(255,255,255,0.25);
  font-size: 14px;
  flex-shrink: 0;
}

/* ── Grade de chance de boost ── */
.boost-chance-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 14px;
}
.boost-chance-card {
  border-radius: 14px;
  padding: 14px 12px;
  text-align: center;
  border: 1px solid var(--bcc-border);
  background: var(--bcc-bg);
}
.boost-chance-card-icon { font-size: 24px; margin-bottom: 8px; }
.boost-chance-card-label {
  font-family: var(--font-mono, monospace);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--bcc-color);
  margin-bottom: 4px;
}
.boost-chance-card-val {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  line-height: 1.3;
}

/* ── Safe point badge ── */
.boost-safe-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding: 10px 18px;
  border-radius: 30px;
  background: rgba(96,224,160,0.10);
  border: 1px solid rgba(96,224,160,0.30);
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 13px;
  font-weight: 700;
  color: #60e0a0;
  letter-spacing: 1px;
}
.boost-safe-badge-icon { font-size: 18px; }

/* ── Hero do boost ── */
.boost-hero {
  position: relative;
  text-align: center;
  padding: 36px 20px 32px;
  margin-bottom: 8px;
  overflow: hidden;
}
.boost-hero::before {
  content: '';
  position: absolute;
  top: 0; left: 50%;
  transform: translateX(-50%);
  width: 600px; height: 200px;
  background: radial-gradient(ellipse at 50% 0%, rgba(255,140,60,0.16) 0%, rgba(255,80,180,0.07) 45%, transparent 70%);
  pointer-events: none;
}
.boost-hero::after {
  content: '';
  position: absolute;
  top: 0; left: 15%; right: 15%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,140,60,0.55), rgba(255,80,180,0.35), rgba(255,140,60,0.55), transparent);
}
.boost-hero-icon {
  font-size: 56px;
  line-height: 1;
  display: block;
  margin-bottom: 14px;
  filter: drop-shadow(0 0 22px rgba(255,140,60,0.55));
  animation: boost-float 3.5s ease-in-out infinite;
}
@keyframes boost-float {
  0%, 100% { transform: translateY(0px) scale(1); }
  50%       { transform: translateY(-7px) scale(1.03); }
}
.boost-hero-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: clamp(24px, 5vw, 38px);
  font-weight: 900;
  letter-spacing: 8px;
  text-transform: uppercase;
  line-height: 1;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #ffb060 0%, #ffffff 40%, #ff80c0 70%, #ffa040 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 2px 14px rgba(255,140,60,0.35));
}
.boost-hero-sub {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: rgba(255,180,100,0.45);
}

/* ── Separador decorativo ── */
.boost-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 20px 16px 16px;
}
.boost-divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,140,60,0.3), transparent);
}
.boost-divider-gem {
  width: 6px; height: 6px;
  border-radius: 1px;
  transform: rotate(45deg);
  background: rgba(255,140,60,0.6);
  box-shadow: 0 0 8px rgba(255,140,60,0.5);
}

/* ── Multiplicador de nível ── */
.boost-multiplier {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 18px;
  background: rgba(255,140,60,0.06);
  border-radius: 16px;
  border: 1px solid rgba(255,140,60,0.18);
  margin-top: 14px;
  flex-wrap: wrap;
}
.boost-mult-item {
  text-align: center;
}
.boost-mult-num {
  font-family: var(--font-mono, monospace);
  font-size: 34px;
  font-weight: 900;
  color: #ffb060;
  line-height: 1;
  filter: drop-shadow(0 0 10px rgba(255,140,60,0.4));
}
.boost-mult-label {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: rgba(255,180,100,0.50);
  margin-top: 4px;
}
.boost-mult-sep {
  font-size: 24px;
  color: rgba(255,255,255,0.2);
  line-height: 1;
}
.boost-mult-result {
  font-family: var(--font-mono, monospace);
  font-size: 34px;
  font-weight: 900;
  color: #fff;
  line-height: 1;
}

@media (max-width: 480px) {
  .boost-alt-grid { grid-template-columns: 1fr 1fr; }
  .boost-chance-grid { grid-template-columns: 1fr; }
}
`;
document.head.appendChild(S);

/* ── Renderizador principal ─────────────────────────────────── */
window.renderBoost = function () {
  const panel = document.getElementById('wiki-tab-boost');
  if (!panel) return;
  if (panel.dataset.boostRendered) return;
  panel.dataset.boostRendered = '1';

  panel.innerHTML = `
<div class="boost-page">

  <!-- HERO -->
  <div class="boost-hero">
    <span class="boost-hero-icon">⚡</span>
    <div class="boost-hero-title">S I S T E M A &nbsp; D E &nbsp; B O O S T</div>
    <div class="boost-hero-sub">Guia Completo · PokeAlliance</div>
  </div>

  <!-- LOCALIZAÇÃO -->
  <div class="boost-section">
    <div class="boost-sec-head">
      <span class="boost-sec-icon" style="color:#6ab8ff">🏛️</span>
      <div class="boost-sec-title">Localização da Máquina</div>
      <div class="boost-sec-badge" style="--boost-badge-bg:rgba(58,140,255,0.15);--boost-badge-color:#6ab8ff;--boost-badge-border:rgba(58,140,255,0.3)">TC</div>
    </div>
    <div class="boost-sec-body">
      <p class="boost-info-p">
        A máquina de boost fica no <strong>Trainer Center (TC)</strong>. Ao entrar no TC, siga em direção ao <strong>sul</strong> — você vai encontrar uma máquina gigante dedicada ao processo de boost.
      </p>
      <img
        class="boost-location-img"
        src="https://i.imgur.com/aaXVbRd.png"
        alt="Localização da máquina de boost no TC"
        loading="lazy"
        onerror="this.style.display='none'"
      />
    </div>
  </div>

  <!-- DIVISOR -->
  <div class="boost-divider">
    <div class="boost-divider-line"></div>
    <div class="boost-divider-gem"></div>
    <div class="boost-divider-gem" style="background:rgba(255,80,180,0.6);box-shadow:0 0 8px rgba(255,80,180,0.5)"></div>
    <div class="boost-divider-gem"></div>
    <div class="boost-divider-line"></div>
  </div>

  <!-- PASSO A PASSO -->
  <div class="boost-section">
    <div class="boost-sec-head">
      <span class="boost-sec-icon" style="color:#ffd166">📋</span>
      <div class="boost-sec-title">Como Funciona o Boost</div>
      <div class="boost-sec-badge" style="--boost-badge-bg:rgba(255,209,102,0.12);--boost-badge-color:#ffd166;--boost-badge-border:rgba(255,209,102,0.28)">+1 a +70</div>
    </div>
    <div class="boost-sec-body">
      <div class="boost-steps">

        <!-- PASSO 1 -->
        <div class="boost-step-card">
          <div class="boost-step-num" style="--boost-step-bg:rgba(58,140,255,0.15);--boost-step-color:#6ab8ff;--boost-step-border:rgba(58,140,255,0.3)">1</div>
          <div class="boost-step-content">
            <div class="boost-step-title">Criação de Pedras de Boost</div>
            <div class="boost-step-desc">
              Para criar as pedras de boost, você precisa coletar <strong>itens de drops de Pokémons</strong> específicos, de acordo com o elemento escolhido.
              A maioria dos itens vem de Pokémons de <strong>Tier 1 ou superior</strong>, mas alguns elementos exigem itens de Tier 2.
              <br/><br/>
              A receita <strong>pode variar diariamente</strong> — especialmente em elementos com muitos Pokémons possíveis, como Fire (que pode incluir itens de Charizard, Typhlosion, Ninetales, Flareon etc.).
            </div>
            <div class="boost-example-box">
              <div class="boost-example-label">Exemplo</div>
              <div class="boost-example-text">
                Para boostar um <strong>Shiny Scyther</strong> no elemento Bug, você precisará de itens de <strong>Scyther, Pinsir e Scizor</strong>, além de <strong>Bug Fragments</strong> e uma <strong>Cocoon Stone</strong>.
              </div>
            </div>
          </div>
        </div>

        <!-- PASSO 2 -->
        <div class="boost-step-card">
          <div class="boost-step-num" style="--boost-step-bg:rgba(80,200,220,0.15);--boost-step-color:#50c8dc;--boost-step-border:rgba(80,200,220,0.3)">2</div>
          <div class="boost-step-content">
            <div class="boost-step-title">Fragmentos Elementais</div>
            <div class="boost-step-desc">
              Além dos itens de drop, você precisa de <strong>fragmentos do elemento correspondente</strong>, obtidos nas Dungeons do mesmo tipo.
              <br/><br/>
              Por exemplo, as Dungeons de <strong>Machop, Machoke e Machamp</strong> dropam fragmentos de Lutador. Durante o percurso os Pokémons podem dropar <strong>1 a 2 fragmentos</strong> cada, além do loot normal. Ao derrotar o boss no final, você recebe uma <strong>quantidade maior</strong> de fragmentos.
            </div>
            <div class="boost-frag-img-wrap">
              <img
                src="https://i.imgur.com/c7w8FzD.png"
                alt="Fragmentos elementais de boost"
                loading="lazy"
                onerror="this.style.display='none'"
              />
            </div>
          </div>
        </div>

        <!-- PASSO 3 -->
        <div class="boost-step-card">
          <div class="boost-step-num" style="--boost-step-bg:rgba(255,140,60,0.15);--boost-step-color:#ffb060;--boost-step-border:rgba(255,140,60,0.3)">3</div>
          <div class="boost-step-content">
            <div class="boost-step-title">Boost Acima de +50</div>
            <div class="boost-step-desc">
              Após atingir o nível <strong>+50</strong>, você passa a usar as <strong>pedras do elemento</strong> correspondente para continuar avançando até o nível máximo de <strong>+70</strong>.
            </div>

            <!-- Chances -->
            <div class="boost-chance-grid">
              <div class="boost-chance-card" style="--bcc-border:rgba(96,224,160,0.2);--bcc-bg:rgba(96,224,160,0.05);--bcc-color:#60e0a0">
                <div class="boost-chance-card-icon">✅</div>
                <div class="boost-chance-card-label">Sucesso</div>
                <div class="boost-chance-card-val" style="color:#60e0a0">Muito Baixa</div>
              </div>
              <div class="boost-chance-card" style="--bcc-border:rgba(160,200,255,0.2);--bcc-bg:rgba(160,200,255,0.04);--bcc-color:#a0c8ff">
                <div class="boost-chance-card-icon">⏸️</div>
                <div class="boost-chance-card-label">Nada Acontece</div>
                <div class="boost-chance-card-val" style="color:#a0c8ff">Alta</div>
              </div>
              <div class="boost-chance-card" style="--bcc-border:rgba(255,100,100,0.2);--bcc-bg:rgba(255,100,100,0.04);--bcc-color:#ff7070">
                <div class="boost-chance-card-icon">⬇️</div>
                <div class="boost-chance-card-label">Regredir</div>
                <div class="boost-chance-card-val" style="color:#ff7070">Igual ao Sucesso</div>
              </div>
            </div>

            <div class="boost-safe-badge">
              <span class="boost-safe-badge-icon">🛡️</span>
              Safe Point: ao chegar no +60, o Pokémon não pode mais regredir ao +50
            </div>
          </div>
        </div>

        <!-- PASSO 4 -->
        <div class="boost-step-card">
          <div class="boost-step-num" style="--boost-step-bg:rgba(212,160,255,0.15);--boost-step-color:#d4a0ff;--boost-step-border:rgba(212,160,255,0.3)">4</div>
          <div class="boost-step-content">
            <div class="boost-step-title">Valor do Boost em Níveis</div>
            <div class="boost-step-desc">
              Cada nível de boost equivale a <strong>3 níveis de Pokémon</strong>. Isso significa que um Pokémon boostado em <strong>+70</strong> ganha o equivalente a <strong>210 níveis extras</strong>, aumentando significativamente seu poder de batalha.
            </div>
            <div class="boost-multiplier">
              <div class="boost-mult-item">
                <div class="boost-mult-num">+70</div>
                <div class="boost-mult-label">boost máx</div>
              </div>
              <div class="boost-mult-sep">×</div>
              <div class="boost-mult-item">
                <div class="boost-mult-num">3</div>
                <div class="boost-mult-label">nível / boost</div>
              </div>
              <div class="boost-mult-sep">=</div>
              <div class="boost-mult-item">
                <div class="boost-mult-num boost-mult-result">210</div>
                <div class="boost-mult-label">níveis extras</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- FRAGMENTOS — TABELA -->
  <div class="boost-section">
    <div class="boost-sec-head">
      <span class="boost-sec-icon" style="color:#50c8dc">💎</span>
      <div class="boost-sec-title">Quantidade de Fragmentos</div>
      <div class="boost-sec-badge" style="--boost-badge-bg:rgba(80,200,220,0.12);--boost-badge-color:#50c8dc;--boost-badge-border:rgba(80,200,220,0.28)">477 dias</div>
    </div>
    <div class="boost-sec-body">
      <p class="boost-info-p">
        A quantidade de fragmentos necessária <strong>muda diariamente</strong>. Os valores abaixo representam o histórico de 477 dias, com mínimo, média e máximo registrados — assim você pode avaliar se vale a pena boostar naquele dia.
      </p>

      <div class="boost-table-wrap">
        <table class="boost-table">
          <thead>
            <tr>
              <th colspan="10" class="boost-table-head-main">Quantidade de Fragmentos (É o mesmo pra todos os tipos)</th>
            </tr>
            <tr>
              <th class="boost-table-group-head" colspan="10"></th>
            </tr>
            <tr>
              <th colspan="10" class="boost-table-group-head" style="background:rgba(58,140,255,0.14);color:rgba(140,200,255,0.85)">MENOR VALOR (477 dias)</th>
            </tr>
            <tr>
              <th class="col-range">0-5</th><th class="col-range">6-10</th><th class="col-range">11-15</th><th class="col-range">16-20</th><th class="col-range">21-25</th>
              <th class="col-range">26-30</th><th class="col-range">31-35</th><th class="col-range">36-40</th><th class="col-range">41-45</th><th class="col-range">46-50</th>
            </tr>
          </thead>
          <tbody>
            <tr class="col-min">
              <td>10</td><td>20</td><td>55</td><td>130</td><td>280</td>
              <td>452</td><td>801</td><td>1202</td><td>2303</td><td>2800</td>
            </tr>
            <tr>
              <th colspan="10" class="boost-table-group-head" style="background:rgba(100,200,100,0.12);color:rgba(160,240,160,0.85)">MÉDIA (477 dias)</th>
            </tr>
            <tr>
              <th class="col-range">0-5</th><th class="col-range">6-10</th><th class="col-range">11-15</th><th class="col-range">16-20</th><th class="col-range">21-25</th>
              <th class="col-range">26-30</th><th class="col-range">31-35</th><th class="col-range">36-40</th><th class="col-range">41-45</th><th class="col-range">46-50</th>
            </tr>
            <tr class="col-avg">
              <td>20</td><td>44</td><td>105</td><td>217</td><td>391</td>
              <td>732</td><td>1160</td><td>1861</td><td>2672</td><td>3021</td>
            </tr>
            <tr>
              <th colspan="10" class="boost-table-group-head" style="background:rgba(255,160,80,0.12);color:rgba(255,200,120,0.85)">MAIOR VALOR (477 dias)</th>
            </tr>
            <tr>
              <th class="col-range">0-5</th><th class="col-range">6-10</th><th class="col-range">11-15</th><th class="col-range">16-20</th><th class="col-range">21-25</th>
              <th class="col-range">26-30</th><th class="col-range">31-35</th><th class="col-range">36-40</th><th class="col-range">41-45</th><th class="col-range">46-50</th>
            </tr>
            <tr class="col-max">
              <td>30</td><td>60</td><td>150</td><td>300</td><td>500</td>
              <td>1000</td><td>1500</td><td>2497</td><td>3000</td><td>3208</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="boost-tip-box">
        <span class="boost-tip-icon">📊</span>
        <div class="boost-tip-text">
          Esses dados foram coletados pelo <strong>Mts Vitor</strong> ao longo de 477 dias. Use a média como referência para decidir se vale a pena boostar num determinado dia.
        </div>
      </div>
    </div>
  </div>

  <!-- OBTENÇÃO ALTERNATIVA -->
  <div class="boost-section">
    <div class="boost-sec-head">
      <span class="boost-sec-icon" style="color:#d4a0ff">🎁</span>
      <div class="boost-sec-title">Obtenção Alternativa de Pedras</div>
      <div class="boost-sec-badge" style="--boost-badge-bg:rgba(212,160,255,0.12);--boost-badge-color:#d4a0ff;--boost-badge-border:rgba(212,160,255,0.28)">Sem Craftar</div>
    </div>
    <div class="boost-sec-body">
      <p class="boost-info-p">Não precisa fabricar para conseguir pedras — existem três formas alternativas:</p>
      <div class="boost-alt-grid">

        <div class="boost-alt-card">
          <div class="boost-alt-card-icon">⚔️</div>
          <div class="boost-alt-card-title">Bosses da Guild</div>
          <div class="boost-alt-card-desc">
            <div class="boost-alt-item">Recompensam com pedras <strong>aleatórias (RNG)</strong></div>
            <div class="boost-alt-item">Podem ser <strong>trocadas</strong> com outros jogadores</div>
          </div>
        </div>

        <div class="boost-alt-card">
          <div class="boost-alt-card-icon">🧬</div>
          <div class="boost-alt-card-title">Missão Clones</div>
          <div class="boost-alt-card-desc">
            <div class="boost-alt-item">Nv. 150 → 2 pedras (níveis 11–15)</div>
            <div class="boost-alt-item">Nv. 320 → 2 pedras (níveis 16–20)</div>
            <div class="boost-alt-item">Nv. 420 → 2 pedras (21–25) + 1 pedra (26–30)</div>
            <div class="boost-alt-item" style="margin-top:6px">Todas são <strong>pedras universais</strong></div>
          </div>
        </div>

        <div class="boost-alt-card">
          <div class="boost-alt-card-icon">🪙</div>
          <div class="boost-alt-card-title">Boss Golden Token</div>
          <div class="boost-alt-card-desc">
            <div class="boost-alt-item">Obtido ao completar o <strong>boss semanal</strong> da guild</div>
            <div class="boost-alt-item">Compra pedras de qualquer elemento <strong>(níveis 21–25)</strong></div>
            <div class="boost-alt-item">Custo: <strong>15 tokens</strong> por pedra</div>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- DICAS -->
  <div class="boost-section">
    <div class="boost-sec-head">
      <span class="boost-sec-icon" style="color:#60e0a0">💡</span>
      <div class="boost-sec-title">Dicas Importantes</div>
      <div class="boost-sec-badge" style="--boost-badge-bg:rgba(96,224,160,0.12);--boost-badge-color:#60e0a0;--boost-badge-border:rgba(96,224,160,0.28)">Meta</div>
    </div>
    <div class="boost-sec-body">

      <div class="boost-tip-box">
        <span class="boost-tip-icon">📅</span>
        <div class="boost-tip-text">
          <strong>A quantidade de fragmentos muda diariamente.</strong> O Mts Vitor disponibiliza uma "média" dos valores para ajudar a comunidade a decidir se vale boostar naquele dia, levando em conta a quantidade de fragmentos e itens exigidos.
        </div>
      </div>

      <div class="boost-warn-box" style="margin-top:14px">
        <span class="boost-warn-icon">🎯</span>
        <div class="boost-warn-text">
          <strong>Teoria dos itens menos mortos:</strong> Na teoria, os itens que aparecem na receita do dia são os de Pokémons que <em>menos</em> foram mortos no dia anterior.
          <br/><br/>
          Por exemplo: se a receita de Lutador tem como possíveis itens Lee, Top, Chan, Machamp e Poliwrath — e no dia anterior foram mortos muitos Lee, Top e Machamp — a tendência é que a receita do dia seguinte traga itens de <strong>Poliwrath, Chan</strong> e o menos morto entre os outros. Assim uma receita provável seria: itens de Top, Chan e Poli.
        </div>
      </div>

    </div>
  </div>

</div>
  `;
};

/* ── Cria o painel da wiki e registra o módulo ─────────────── */
function injectBoostModule() {
  /* Cria o panel (wiki-subtab-content) se ainda não existir */
  if (!document.getElementById('wiki-tab-boost')) {
    const panel = document.createElement('div');
    panel.id = 'wiki-tab-boost';
    panel.className = 'wiki-subtab-content';
    document.getElementById('tab-wiki').appendChild(panel);
  }

  /* Registra o renderer global */
  if (window._wnRegisterRenderer) {
    window._wnRegisterRenderer('boost', () => {
      if (typeof renderBoost === 'function') renderBoost();
    });
  }

  /* Adiciona o módulo ao array MODULES e ao grid do home,
     se o sistema wiki-nav já estiver carregado              */
  function _tryInject() {
    const grid = document.querySelector('#wn-home .wn-grid');
    if (!grid) return false;
    if (grid.querySelector('[data-wn-id="boost"]')) return true; // já existe

    const card = document.createElement('div');
    card.className = 'wn-card';
    card.setAttribute('data-wn-id', 'boost');
    card.style.cssText = '--wn-color:#ff9f43;--wn-rgb:255,159,67;--wn-glow:rgba(255,159,67,0.12)';
    card.setAttribute('onclick', "window._wnOpen('boost')");
    card.title = 'Sistema de Boost';
    card.innerHTML = `
      <div class="wn-card-icon">⚡</div>
      <div class="wn-card-name">Sistema de Boost</div>
      <div class="wn-card-desc">Pedras, fragmentos e guia completo</div>
      <div class="wn-card-arrow">→</div>
    `;
    grid.appendChild(card);
    return true;
  }

  /* Tenta imediatamente, depois com retry caso o shell ainda não exista */
  if (!_tryInject()) {
    let attempts = 0;
    const iv = setInterval(() => {
      attempts++;
      if (_tryInject() || attempts > 40) clearInterval(iv);
    }, 150);
  }

  /* Registra no RENDERERS do wiki-nav (patch seguro) */
  function _patchRenderers() {
    if (window._wnRenderers) {
      window._wnRenderers['boost'] = () => {
        if (typeof renderBoost === 'function') renderBoost();
      };
      return true;
    }
    return false;
  }
  if (!_patchRenderers()) {
    let r = 0;
    const iv2 = setInterval(() => {
      r++;
      if (_patchRenderers() || r > 40) clearInterval(iv2);
    }, 150);
  }
}

/* ── Patch no _wnOpen e _wnBack para suportar 'boost' ───────── */
function patchWnOpen() {
  const originalOpen = window._wnOpen;
  const originalBack = window._wnBack;
  if (!originalOpen || originalOpen._boostPatched) return;

  window._wnOpen = function (id) {
    if (id === 'boost') {
      /* Garante que o painel existe */
      let panel = document.getElementById('wiki-tab-boost');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'wiki-tab-boost';
        panel.className = 'wiki-subtab-content';
        document.getElementById('tab-wiki').appendChild(panel);
      }

      /* Simula a abertura igual ao wiki-nav */
      const bcIcon = document.getElementById('wn-bc-icon');
      const bcName = document.getElementById('wn-bc-name');
      if (bcIcon) bcIcon.innerHTML = '⚡';
      if (bcName) bcName.textContent = 'Sistema de Boost';

      const modBanner = document.getElementById('wn-mod-banner');
      const modLine   = document.getElementById('wn-mod-line');
      if (modBanner) {
        modBanner.style.setProperty('--wn-mod-color', '#ff9f43');
        modBanner.style.setProperty('--wn-mod-glow', 'rgba(255,159,67,0.18)');
        document.getElementById('wn-mod-icon').innerHTML   = '⚡';
        document.getElementById('wn-mod-name').textContent = 'Sistema de Boost';
        document.getElementById('wn-mod-desc').textContent = 'Pedras, fragmentos e guia completo';
      }
      if (modLine) {
        modLine.style.background = 'linear-gradient(90deg, #ff9f4355, transparent 60%)';
      }

      document.getElementById('wn-home').style.display = 'none';
      const content = document.getElementById('wn-content');
      content.style.display = 'block';
      content.classList.add('visible');

      /* Marca que o boost esta aberto para o back funcionar */
      window._wnBoostOpen = true;

      window.scrollTo({ top: 0, behavior: 'smooth' });

      renderBoost();

      function _mountBoostPanel() {
        const slot = document.getElementById('wn-slot');
        if (slot && panel) {
          if (!slot.contains(panel)) {
            document.querySelectorAll('.wiki-subtab-content.wn-visible').forEach(el => el.classList.remove('wn-visible'));
            while (slot.firstChild) slot.removeChild(slot.firstChild);
            slot.appendChild(panel);
          }
          panel.classList.add('wn-visible');
        }
      }
      _mountBoostPanel();
      setTimeout(_mountBoostPanel, 100);
    } else {
      window._wnBoostOpen = false;
      originalOpen(id);
    }
  };
  window._wnOpen._boostPatched = true;

  /* Patcha o _wnBack para tratar o caso do boost */
  window._wnBack = function () {
    if (window._wnBoostOpen) {
      window._wnBoostOpen = false;

      /* Desmonta o painel do slot e devolve para tab-wiki */
      const slot  = document.getElementById('wn-slot');
      const panel = document.getElementById('wiki-tab-boost');
      if (slot && panel) {
        panel.classList.remove('wn-visible');
        const tabWiki = document.getElementById('tab-wiki');
        if (tabWiki) tabWiki.appendChild(panel);
        while (slot.firstChild) slot.removeChild(slot.firstChild);
      }

      /* Mostra o home, esconde o content */
      const home    = document.getElementById('wn-home');
      const content = document.getElementById('wn-content');
      if (home)    home.style.display = 'block';
      if (content) { content.style.display = 'none'; content.classList.remove('visible'); }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (originalBack) originalBack();
    }
  };
}

/* ── Init ─────────────────────────────────────────────────── */
function init() {
  injectBoostModule();

  /* Aguarda o _wnOpen estar disponível para fazer o patch */
  function _tryPatch() {
    if (window._wnOpen && !window._wnOpen._boostPatched) {
      patchWnOpen();
      return true;
    }
    return !!window._wnOpen?._boostPatched;
  }
  if (!_tryPatch()) {
    let p = 0;
    const iv = setInterval(() => {
      p++;
      if (_tryPatch() || p > 60) clearInterval(iv);
    }, 100);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();