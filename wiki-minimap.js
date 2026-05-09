/* ================================================================
   wiki-minimap.js — Módulo: Mapa Liberado (Minimap)
   Carregue após wiki-nav.js no index.html:
     <script src="wiki-nav.js"></script>
     <script src="wiki-minimap.js"></script>
================================================================ */
(function () {

/* ── Estilos ────────────────────────────────────────────────────── */
const S = document.createElement('style');
S.textContent = `

/* ═══════════════════════════════════════
   MINIMAP PAGE
═══════════════════════════════════════ */
.mm-page { padding: 0 0 80px; }

/* ── Alert de novidade ── */
.mm-alert {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 14px;
  background: rgba(255,209,60,0.07);
  border: 1.5px solid rgba(255,209,60,0.22);
  margin-bottom: 24px;
}
.mm-alert-icon { font-size: 22px; flex-shrink: 0; margin-top: 1px; }
.mm-alert-body { flex: 1; min-width: 0; }
.mm-alert-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #ffd13c;
  margin-bottom: 5px;
}
.mm-alert-text {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(255,230,140,0.72);
  line-height: 1.65;
}
.mm-alert-text strong { color: rgba(255,230,140,0.95); }

/* ── Card de download ── */
.mm-download-card {
  position: relative;
  border-radius: 18px;
  border: 1.5px solid rgba(96,224,160,0.28);
  background: rgba(6,18,12,0.9);
  overflow: hidden;
  margin-bottom: 28px;
}
.mm-download-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(96,224,160,0.7), rgba(60,200,120,0.5), transparent);
}
.mm-download-card::after {
  content: '';
  position: absolute;
  top: -60px; right: -60px;
  width: 220px; height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(96,224,160,0.07) 0%, transparent 70%);
  pointer-events: none;
}
.mm-download-inner {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 24px;
  position: relative;
  z-index: 1;
}
.mm-download-icon-wrap {
  width: 64px; height: 64px;
  border-radius: 16px;
  background: rgba(96,224,160,0.08);
  border: 1.5px solid rgba(96,224,160,0.2);
  display: flex; align-items: center; justify-content: center;
  font-size: 32px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 12px rgba(96,224,160,0.3));
}
.mm-download-info { flex: 1; min-width: 0; }
.mm-download-label {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(96,224,160,0.55);
  margin-bottom: 4px;
}
.mm-download-name {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 17px;
  font-weight: 900;
  color: #fff;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}
.mm-download-meta {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11.5px;
  font-weight: 500;
  color: rgba(255,255,255,0.3);
}
.mm-download-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 12px;
}
.mm-dl-btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 13px 22px;
  border-radius: 12px;
  border: 1.5px solid rgba(96,224,160,0.4);
  background: rgba(96,224,160,0.1);
  color: #60e0a0;
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition: background .2s, border-color .2s, box-shadow .2s, transform .15s;
  user-select: none;
  flex-shrink: 0;
  white-space: nowrap;
}
.mm-dl-btn:hover {
  background: rgba(96,224,160,0.18);
  border-color: rgba(96,224,160,0.65);
  box-shadow: 0 0 22px rgba(96,224,160,0.2), 0 4px 16px rgba(0,0,0,0.4);
  transform: translateY(-2px);
  color: #80ffb8;
}
.mm-dl-btn:active { transform: translateY(0); transition-duration: .07s; }
.mm-dl-btn-icon { font-size: 16px; }

/* ── Divisor de seção ── */
.mm-section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.mm-section-header-icon { font-size: 16px; }
.mm-section-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.25);
  white-space: nowrap;
}
.mm-section-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(255,255,255,0.07), transparent);
}

/* ── Steps de instalação ── */
.mm-steps { display: flex; flex-direction: column; gap: 0; margin-bottom: 28px; }

.mm-step {
  display: flex;
  gap: 0;
  position: relative;
}

/* linha vertical conectando os steps */
.mm-step:not(:last-child) .mm-step-line {
  position: absolute;
  left: 19px;
  top: 42px;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, rgba(96,224,160,0.25), rgba(96,224,160,0.05));
  z-index: 0;
}

.mm-step-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 16px;
  padding-right: 18px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}
.mm-step-circle {
  width: 38px; height: 38px;
  border-radius: 50%;
  border: 2px solid rgba(96,224,160,0.35);
  background: rgba(96,224,160,0.08);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono, 'Space Mono', monospace);
  font-size: 13px;
  font-weight: 700;
  color: #60e0a0;
  flex-shrink: 0;
  transition: border-color .2s, background .2s, box-shadow .2s;
}
.mm-step:hover .mm-step-circle {
  border-color: rgba(96,224,160,0.7);
  background: rgba(96,224,160,0.14);
  box-shadow: 0 0 16px rgba(96,224,160,0.2);
}

.mm-step-body {
  flex: 1;
  padding: 16px 0 24px;
  min-width: 0;
}
.mm-step-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.3px;
  margin-bottom: 6px;
  line-height: 1.3;
}
.mm-step-text {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.5);
  line-height: 1.7;
}
.mm-step-text strong { color: rgba(255,255,255,0.85); font-weight: 700; }

/* ── Bloco de caminho (path) ── */
.mm-path-block {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 11px 14px;
  border-radius: 10px;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.08);
}
.mm-path-icon { font-size: 15px; flex-shrink: 0; }
.mm-path-text {
  font-family: var(--font-mono, 'Space Mono', monospace);
  font-size: 11.5px;
  font-weight: 400;
  color: rgba(160,220,255,0.85);
  word-break: break-all;
  flex: 1;
}
.mm-path-copy {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 7px;
  padding: 5px 10px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  flex-shrink: 0;
  transition: background .15s, color .15s, border-color .15s;
  user-select: none;
}
.mm-path-copy:hover {
  background: rgba(96,224,160,0.1);
  border-color: rgba(96,224,160,0.3);
  color: #60e0a0;
}
.mm-path-copy.copied {
  background: rgba(96,224,160,0.15);
  border-color: rgba(96,224,160,0.5);
  color: #60e0a0;
}

/* ── Note / dica ── */
.mm-note {
  margin-top: 10px;
  padding: 11px 14px;
  border-radius: 10px;
  border-left: 3px solid rgba(255,209,60,0.4);
  background: rgba(255,209,60,0.05);
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12px;
  color: rgba(255,230,120,0.75);
  line-height: 1.65;
}
.mm-note strong { color: rgba(255,240,150,0.95); }

.mm-note--green {
  border-left-color: rgba(96,224,160,0.4);
  background: rgba(96,224,160,0.05);
  color: rgba(140,240,180,0.75);
}
.mm-note--green strong { color: rgba(160,255,200,0.95); }

.mm-note--red {
  border-left-color: rgba(255,100,100,0.4);
  background: rgba(255,100,100,0.05);
  color: rgba(255,160,160,0.75);
}
.mm-note--red strong { color: rgba(255,180,180,0.95); }

/* ── Tag inline ── */
.mm-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-mono, 'Space Mono', monospace);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 7px;
  vertical-align: middle;
  margin: 1px 2px;
}
.mm-tag--file {
  background: rgba(180,100,255,0.1);
  border: 1px solid rgba(180,100,255,0.2);
  color: #d080ff;
}
.mm-tag--key {
  background: rgba(60,160,255,0.1);
  border: 1px solid rgba(60,160,255,0.2);
  color: #80c8ff;
  font-size: 10.5px;
}
.mm-tag--warn {
  background: rgba(255,100,100,0.1);
  border: 1px solid rgba(255,100,100,0.2);
  color: #ff9090;
}
.mm-tag--ok {
  background: rgba(96,224,160,0.1);
  border: 1px solid rgba(96,224,160,0.2);
  color: #60e0a0;
}

/* ── FAQ / Perguntas frequentes ── */
.mm-faq { display: flex; flex-direction: column; gap: 8px; }
.mm-faq-item {
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(255,255,255,0.025);
  overflow: hidden;
  transition: border-color .2s;
}
.mm-faq-item.open {
  border-color: rgba(96,224,160,0.2);
}
.mm-faq-q {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: background .18s;
}
.mm-faq-q:hover { background: rgba(255,255,255,0.03); }
.mm-faq-q-icon {
  font-size: 14px;
  flex-shrink: 0;
  color: rgba(96,224,160,0.7);
}
.mm-faq-q-text {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
  font-weight: 700;
  color: rgba(255,255,255,0.7);
  flex: 1;
  line-height: 1.4;
}
.mm-faq-item.open .mm-faq-q-text { color: #fff; }
.mm-faq-arrow {
  width: 16px; height: 16px;
  flex-shrink: 0;
  color: rgba(255,255,255,0.25);
  transition: transform .3s cubic-bezier(.4,0,.2,1), color .2s;
}
.mm-faq-item.open .mm-faq-arrow {
  transform: rotate(180deg);
  color: #60e0a0;
}
.mm-faq-body {
  max-height: 0;
  overflow: hidden;
  transition: max-height .38s cubic-bezier(.4,0,.2,1), opacity .28s;
  opacity: 0;
}
.mm-faq-item.open .mm-faq-body { max-height: 400px; opacity: 1; }
.mm-faq-a {
  padding: 0 16px 14px 42px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(255,255,255,0.48);
  line-height: 1.68;
}
.mm-faq-a strong { color: rgba(255,255,255,0.8); }

/* ── Responsivo ── */
@media (max-width: 520px) {
  .mm-download-inner { flex-direction: column; align-items: flex-start; gap: 16px; }
  .mm-dl-btn { width: 100%; justify-content: center; }
  .mm-step-left { padding-right: 12px; }
  .mm-step-circle { width: 32px; height: 32px; font-size: 11px; }
  .mm-step:not(:last-child) .mm-step-line { left: 15px; }
  .mm-path-text { font-size: 10px; }
}
`;
document.head.appendChild(S);

/* ════════════════════════════════════════════════════════════
   DADOS
════════════════════════════════════════════════════════════ */

const STEPS = [
  {
    num: '1',
    icon: '⬇️',
    title: 'Baixe o arquivo do mapa',
    text: `Clique no botão <strong>Download do Mapa</strong> no topo desta página e salve o arquivo <span class="mm-tag mm-tag--file">minimap854.otmm</span> em qualquer lugar do seu computador — área de trabalho, pasta Downloads, etc.`,
    note: {
      type: '',
      html: `<strong>⚠️ Não renomeie o arquivo!</strong> O nome <span class="mm-tag mm-tag--file">minimap854.otmm</span> precisa ser mantido exatamente como está para o jogo reconhecê-lo.`,
    },
  },
  {
    num: '2',
    icon: '🔴',
    title: 'Feche o Client do jogo',
    text: `Antes de qualquer coisa, <strong>feche completamente o PokeAlliance</strong>. Não basta minimizar — o processo precisa estar encerrado.`,
    extra: `<div class="mm-note mm-note--red" style="margin-top:10px">
      <strong>Por que fechar?</strong> Se o Client estiver aberto enquanto você substituir o arquivo, o jogo pode ignorar a alteração ou até corromper o mapa. Feche primeiro, instale depois.
    </div>`,
  },
  {
    num: '3',
    icon: '📁',
    title: 'Abra a pasta do jogo',
    text: `Abra o <strong>Explorador de Arquivos</strong> (Windows + E) e clique na barra de endereços no topo. Digite ou cole o caminho abaixo e pressione <span class="mm-tag mm-tag--key">Enter</span>:`,
    path: '%AppData%\\PokeAlliance\\PokeAllianceV3',
    pathDisplay: '%AppData%\\PokeAlliance\\PokeAllianceV3',
    note: {
      type: 'green',
      html: `<strong>💡 Dica rápida:</strong> Pressione <span class="mm-tag mm-tag--key">Win + R</span>, cole o caminho acima e clique em <strong>OK</strong> — a pasta já abre diretamente.`,
    },
  },
  {
    num: '4',
    icon: '🗂️',
    title: 'Localize (ou crie) a pasta do minimap',
    text: `Dentro de <strong>PokeAllianceV3</strong>, procure uma pasta chamada <span class="mm-tag mm-tag--file">minimap</span>.`,
    extra: `<div class="mm-note" style="margin-top:10px">
      <strong>Não encontrou a pasta?</strong> Crie uma manualmente: clique com o botão direito em qualquer área vazia → <strong>Novo → Pasta</strong> → nomeie exatamente como <span class="mm-tag mm-tag--file">minimap</span> (tudo minúsculo).
    </div>`,
  },
  {
    num: '5',
    icon: '📋',
    title: 'Cole o arquivo dentro da pasta minimap',
    text: `Copie o arquivo <span class="mm-tag mm-tag--file">minimap854.otmm</span> que você baixou e cole dentro da pasta <span class="mm-tag mm-tag--file">minimap</span>.`,
    extra: `<div class="mm-note mm-note--red" style="margin-top:10px">
      <strong>Já tinha um arquivo lá?</strong> Se existir algum arquivo de minimap antigo, substitua-o pelo novo. Clique em <strong>"Substituir o arquivo no destino"</strong> quando o Windows perguntar.
    </div>`,
  },
  {
    num: '6',
    icon: '🚀',
    title: 'Abra o jogo e confira!',
    text: `Com o arquivo no lugar certo, abra o PokeAlliance normalmente. O minimapa do <strong>térreo completo</strong> já estará disponível assim que o jogo carregar — sem nenhuma configuração adicional.`,
    note: {
      type: 'green',
      html: `<strong>✅ Funcionou?</strong> Você verá o mapa do térreo inteiramente revelado no canto do Client. Aproveite para explorar sem se perder!`,
    },
  },
];

const FAQS = [
  {
    q: 'O que é o arquivo .otmm?',
    a: `O formato <strong>.otmm</strong> (OTClient MiniMap) é o arquivo de minimapa usado pelo OTClient, o engine do PokeAlliance. Ele guarda quais tiles do mapa você "descobriu". O arquivo que estamos disponibilizando já tem o <strong>térreo 100% revelado</strong>, então você não precisa explorar tudo manualmente.`,
  },
  {
    q: 'Por que o meu mapa foi apagado na atualização?',
    a: `A atualização recente do servidor mudou a estrutura do mapa do jogo. Isso fez com que os arquivos de minimap antigos ficassem incompatíveis — o Client simplesmente não consegue mais ler o formato anterior, então o mapa aparece em branco para todos os jogadores.`,
  },
  {
    q: 'Só o térreo está disponível. E os outros andares?',
    a: `Por enquanto sim — apenas o <strong>térreo (floor 7)</strong> está 100% revelado neste arquivo. Os demais andares (subsolos, cavernas, etc.) serão descobertos normalmente conforme você explora. Novas versões do mapa podem ser disponibilizadas futuramente.`,
  },
  {
    q: 'Vou tomar ban por usar esse mapa?',
    a: `<strong>Não.</strong> Este arquivo foi disponibilizado oficialmente pela administração do servidor. É seguro e permitido. O minimapa não dá nenhuma vantagem de gameplay além de ver o mapa que você poderia explorar normalmente — ele apenas economiza o tempo de caminhar por tudo.`,
  },
  {
    q: 'Funciona no Mac ou Linux?',
    a: `O caminho <span class="mm-tag mm-tag--file">%AppData%</span> é exclusivo do Windows. No <strong>Linux</strong>, o equivalente geralmente fica em <span class="mm-tag mm-tag--file">~/.local/share/PokeAlliance/PokeAllianceV3/minimap/</span>. No <strong>Mac</strong>, tente <span class="mm-tag mm-tag--file">~/Library/Application Support/PokeAlliance/PokeAllianceV3/minimap/</span>. O procedimento é o mesmo: feche o Client, cole o arquivo, abra o jogo.`,
  },
  {
    q: 'O jogo abre mas o mapa ainda aparece em branco. O que fazer?',
    a: `Verifique: <strong>1)</strong> O arquivo está dentro da pasta <span class="mm-tag mm-tag--file">minimap</span> (não solto em PokeAllianceV3). <strong>2)</strong> O nome do arquivo é exatamente <span class="mm-tag mm-tag--file">minimap854.otmm</span>. <strong>3)</strong> O Client foi fechado antes de você copiar o arquivo. Se tudo estiver certo e ainda não funcionar, tente reiniciar o computador e abrir o jogo novamente.`,
  },
];

/* ════════════════════════════════════════════════════════════
   RENDERER
════════════════════════════════════════════════════════════ */
function renderMinimap() {
  const panel = document.getElementById('wiki-tab-minimap');
  if (!panel) return;
  if (panel.dataset.rendered === '1') return;
  panel.dataset.rendered = '1';

  const stepsHtml = STEPS.map(function(s, i) {
    const isLast = i === STEPS.length - 1;
    return `
      <div class="mm-step">
        ${!isLast ? '<div class="mm-step-line"></div>' : ''}
        <div class="mm-step-left">
          <div class="mm-step-circle">${s.num}</div>
        </div>
        <div class="mm-step-body">
          <div class="mm-step-title">${s.icon} ${s.title}</div>
          <div class="mm-step-text">${s.text}</div>
          ${s.path ? `
            <div class="mm-path-block">
              <span class="mm-path-icon">📂</span>
              <span class="mm-path-text">${s.pathDisplay}</span>
              <button class="mm-path-copy" onclick="mmCopyPath(this, '${s.path}')">Copiar</button>
            </div>
          ` : ''}
          ${s.extra || ''}
          ${s.note ? `<div class="mm-note${s.note.type ? ' mm-note--' + s.note.type : ''}">${s.note.html}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  const faqHtml = FAQS.map(function(f, i) {
    return `
      <div class="mm-faq-item" id="mm-faq-${i}">
        <div class="mm-faq-q" onclick="mmToggleFaq(${i})">
          <span class="mm-faq-q-icon">❓</span>
          <span class="mm-faq-q-text">${f.q}</span>
          <svg class="mm-faq-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div class="mm-faq-body">
          <div class="mm-faq-a">${f.a}</div>
        </div>
      </div>
    `;
  }).join('');

  panel.innerHTML = `
    <div class="mm-page">

      <!-- Alerta de novidade -->
      <div class="mm-alert">
        <span class="mm-alert-icon">📢</span>
        <div class="mm-alert-body">
          <div class="mm-alert-title">Aviso Oficial — Mapa Liberado</div>
          <div class="mm-alert-text">
            Devido à atualização recente, o minimapa foi completamente perdido para todos os jogadores.
            A administração está disponibilizando uma versão com o <strong>térreo 100% revelado</strong>.
            Siga o passo a passo abaixo para instalar.
          </div>
        </div>
      </div>

      <!-- Card de download -->
      <div class="mm-download-card">
        <div class="mm-download-inner">
          <div class="mm-download-icon-wrap">🗺️</div>
          <div class="mm-download-info">
            <div class="mm-download-label">Arquivo Oficial · Mapa Completo</div>
            <div class="mm-download-name">Minimap — Térreo 100%</div>
            <div class="mm-download-meta">
              <span>📄 minimap854.otmm</span>
              <span>💾 7.5 MB</span>
              <span>🟢 Versão Atual</span>
            </div>
          </div>
          <a class="mm-dl-btn" href="minimap854.otmm" download="minimap854.otmm">
            <span class="mm-dl-btn-icon">⬇️</span>
            Download do Mapa
          </a>
        </div>
      </div>

      <!-- Passo a passo -->
      <div class="mm-section-header">
        <span class="mm-section-header-icon">📋</span>
        <span class="mm-section-title">Passo a Passo de Instalação</span>
        <div class="mm-section-line"></div>
      </div>

      <div class="mm-steps">
        ${stepsHtml}
      </div>

      <!-- FAQ -->
      <div class="mm-section-header">
        <span class="mm-section-header-icon">💬</span>
        <span class="mm-section-title">Perguntas Frequentes</span>
        <div class="mm-section-line"></div>
      </div>

      <div class="mm-faq">
        ${faqHtml}
      </div>

    </div>
  `;
}

/* Copiar caminho */
window.mmCopyPath = function(btn, path) {
  navigator.clipboard.writeText(path).then(function() {
    btn.textContent = '✓ Copiado';
    btn.classList.add('copied');
    setTimeout(function() {
      btn.textContent = 'Copiar';
      btn.classList.remove('copied');
    }, 2000);
  }).catch(function() {
    btn.textContent = 'Erro';
    setTimeout(function() { btn.textContent = 'Copiar'; }, 2000);
  });
};

/* Toggle FAQ */
window.mmToggleFaq = function(i) {
  const item = document.getElementById('mm-faq-' + i);
  if (item) item.classList.toggle('open');
};

/* ════════════════════════════════════════════════════════════
   REGISTRO
════════════════════════════════════════════════════════════ */
function registerMinimap() {
  var tabWiki = document.getElementById('tab-wiki');
  if (!tabWiki) return;
  if (document.getElementById('wiki-tab-minimap')) return;

  var panel = document.createElement('div');
  panel.id        = 'wiki-tab-minimap';
  panel.className = 'wiki-subtab-content';
  tabWiki.appendChild(panel);
}

/* Patch do _wnOpen */
(function patchWnOpen() {
  var _orig = window._wnOpen;
  window._wnOpen = function(id) {
    if (id === 'minimap') {
      registerMinimap();
      renderMinimap();
    }
    if (_orig) _orig(id);
  };
})();

function init() {
  if (window._wnInitDone) {
    registerMinimap();
  } else {
    document.addEventListener('DOMContentLoaded', registerMinimap);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
