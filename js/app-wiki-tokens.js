// ============================================================
// app-wiki-tokens.js — extraído de app.js (refactor: quebra do monólito)
// Tokens/Helds + listeners finais (db:ready, closeHeldModal).
// ESCOPO GLOBAL (NÃO é IIFE): preserva os mesmos globais que estavam
// em app.js. DEVE carregar logo após app.js no index.html — não reordenar.
// ============================================================
// ===================== WIKI: TOKENS =====================
var _tokensRendered = false;

var TOKENS_HELDS = [
  {
    id: 'choice-band',
    icon: '🔴',
    name: 'Choice Band',
    categoria: 'Ataque',
    cor: '#ff6b6b',
    rgb: '255,107,107',
    custo: '5 Tokens',
    efeito: 'Aumenta o Ataque do Pokémon em 50%, mas o prende em apenas um movimento.',
    dica: 'Ótimo para sweepers físicos. Use com movimentos de alta potência base.',
  },
  {
    id: 'choice-specs',
    icon: '🔵',
    name: 'Choice Specs',
    categoria: 'Ataque Especial',
    cor: '#60aaff',
    rgb: '96,170,255',
    custo: '5 Tokens',
    efeito: 'Aumenta o Ataque Especial em 50%, mas o prende em apenas um movimento.',
    dica: 'Ideal para attackers especiais. Combine com movimentos cobertura.',
  },
  {
    id: 'choice-scarf',
    icon: '🟡',
    name: 'Choice Scarf',
    categoria: 'Velocidade',
    cor: '#ffe066',
    rgb: '255,224,102',
    custo: '5 Tokens',
    efeito: 'Aumenta a Velocidade em 50%, mas o prende em apenas um movimento.',
    dica: 'Perfeito para revés de velocidade. Transforma Pokémon lentos em ameaças.',
  },
  {
    id: 'life-orb',
    icon: '🟠',
    name: 'Life Orb',
    categoria: 'Dano Universal',
    cor: '#ff9060',
    rgb: '255,144,96',
    custo: '8 Tokens',
    efeito: 'Aumenta o dano de todos os ataques em 30%, mas consome 10% do HP a cada golpe.',
    dica: 'Mais versátil que os Choice. Permite trocar de movimento livremente.',
  },
  {
    id: 'focus-sash',
    icon: '⚪',
    name: 'Focus Sash',
    categoria: 'Sobrevivência',
    cor: '#c0c0c0',
    rgb: '192,192,192',
    custo: '4 Tokens',
    efeito: 'Se o Pokémon estiver com HP cheio e levar um golpe fatal, sobrevive com 1 HP.',
    dica: 'Excelente para leads e Pokémon frágeis. Não funciona se o HP já estiver reduzido.',
  },
  {
    id: 'leftovers',
    icon: '🍃',
    name: 'Leftovers',
    categoria: 'Recuperação',
    cor: '#4caf8a',
    rgb: '76,175,138',
    custo: '4 Tokens',
    efeito: 'Restaura 1/16 do HP máximo no final de cada turno.',
    dica: 'Fundamental em estratégias defensivas. Prolonga a durabilidade do Pokémon.',
  },
  {
    id: 'assault-vest',
    icon: '🟣',
    name: 'Assault Vest',
    categoria: 'Defesa Especial',
    cor: '#b06aff',
    rgb: '176,106,255',
    custo: '6 Tokens',
    efeito: 'Aumenta a Defesa Especial em 50%, mas impede o uso de movimentos de status.',
    dica: 'Transforma Pokémon em tanques especiais. Ótimo para Pokémon com bulk decente.',
  },
  {
    id: 'rocky-helmet',
    icon: '🪨',
    name: 'Rocky Helmet',
    categoria: 'Punição de Contato',
    cor: '#a08060',
    rgb: '160,128,96',
    custo: '5 Tokens',
    efeito: 'O atacante perde 1/6 do HP ao usar movimentos de contato.',
    dica: 'Ideal contra times físicos. Penaliza U-turn, golpes corpo-a-corpo etc.',
  },
  {
    id: 'black-sludge',
    icon: '🖤',
    name: 'Black Sludge',
    categoria: 'Recuperação (Venenosos)',
    cor: '#7a7a7a',
    rgb: '122,122,122',
    custo: '3 Tokens',
    efeito: 'Recupera 1/16 do HP a cada turno se for Venenoso; caso contrário, perde HP.',
    dica: 'Leftovers exclusivo para tipos Venenosos. Nunca use em não-Venenosos.',
  },
  {
    id: 'heavy-duty-boots',
    icon: '👢',
    name: 'Heavy-Duty Boots',
    categoria: 'Proteção de Entrada',
    cor: '#8aaa60',
    rgb: '138,170,96',
    custo: '6 Tokens',
    efeito: 'Impede que o Pokémon sofra dano de armadilhas ao entrar em campo (Stealth Rock, Spikes etc.).',
    dica: 'Essencial para Pokémon com fraqueza a Rocha ou que entram e saem muito.',
  },
];

function renderTokens() {
  var el = document.getElementById('wiki-tokens-content');
  if (!el) return;
  if (_tokensRendered) return;
  _tokensRendered = true;

  el.innerHTML = `
<style>
/* ── TOKENS PAGE ── */
.tk-page { padding: 0 0 60px; }

/* Hero */
.tk-hero {
  text-align: center; padding: 32px 20px 28px;
  background: linear-gradient(180deg, rgba(255,200,50,0.08) 0%, transparent 100%);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.tk-hero-icon { font-size: 44px; margin-bottom: 10px; line-height: 1; }
.tk-hero-title {
  font-family: var(--font-title); font-size: 22px; font-weight: 900;
  letter-spacing: 3px; text-transform: uppercase; color: #ffd166;
  text-shadow: 0 0 24px rgba(255,209,102,0.4); margin-bottom: 10px;
}
.tk-hero-desc {
  font-family: var(--font-body); font-size: 13.5px; color: rgba(255,255,255,0.45);
  line-height: 1.7; max-width: 580px; margin: 0 auto;
}

/* Seções de explicação */
.tk-explain-section {
  padding: 28px 24px 0;
  max-width: 820px; margin: 0 auto;
  display: flex; flex-direction: column; gap: 16px;
}

.tk-info-card {
  border-radius: 16px; padding: 20px 22px;
  display: flex; gap: 18px; align-items: flex-start;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  transition: border-color .2s, background .2s;
}
.tk-info-card:hover {
  border-color: rgba(255,209,102,0.2);
  background: rgba(255,209,102,0.03);
}
.tk-info-card-icon {
  font-size: 30px; flex-shrink: 0; margin-top: 2px; line-height: 1;
}
.tk-info-card-body { flex: 1; min-width: 0; }
.tk-info-card-title {
  font-family: var(--font-title); font-size: 13px; font-weight: 700;
  letter-spacing: 1.5px; text-transform: uppercase; color: #ffd166;
  margin-bottom: 8px;
}
.tk-info-card-text {
  font-family: var(--font-body); font-size: 13px; color: rgba(255,255,255,0.55);
  line-height: 1.75;
}
.tk-info-card-text strong { color: rgba(255,255,255,0.85); }
.tk-info-card-text a {
  color: #60aaff; text-decoration: none; border-bottom: 1px solid rgba(96,170,255,0.3);
  transition: color .15s, border-color .15s;
}
.tk-info-card-text a:hover { color: #90c8ff; border-color: rgba(96,170,255,0.6); }

/* Formas de obter — steps */
.tk-steps {
  display: flex; flex-direction: column; gap: 10px; margin-top: 10px;
}
.tk-step {
  display: flex; align-items: flex-start; gap: 14px;
  background: rgba(255,255,255,0.03); border-radius: 12px;
  padding: 14px 16px; border: 1px solid rgba(255,255,255,0.05);
}
.tk-step-num {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  background: rgba(255,209,102,0.12); border: 1px solid rgba(255,209,102,0.3);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono, monospace); font-size: 12px;
  font-weight: 700; color: #ffd166; margin-top: 1px;
}
.tk-step-text {
  font-family: var(--font-body); font-size: 12.5px; color: rgba(255,255,255,0.5);
  line-height: 1.7; flex: 1;
}
.tk-step-text strong { color: rgba(255,255,255,0.82); }
.tk-step-text a {
  color: #60aaff; text-decoration: none; border-bottom: 1px solid rgba(96,170,255,0.3);
}
.tk-step-text a:hover { color: #90c8ff; }
.tk-step-bonus {
  font-size: 11px; color: rgba(255,209,102,0.6); margin-top: 4px;
  font-style: italic;
}

/* Divider */
.tk-divider {
  margin: 28px 24px 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,209,102,0.2), transparent);
  max-width: 820px;
}

/* Helds Section */
.tk-helds-section {
  padding: 28px 24px 0;
  max-width: 820px; margin: 0 auto;
}
.tk-helds-title {
  font-family: var(--font-title); font-size: 11px; font-weight: 700;
  letter-spacing: 2.5px; text-transform: uppercase; color: rgba(255,255,255,0.3);
  margin-bottom: 16px;
}
.tk-helds-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
@media(max-width: 500px) {
  .tk-helds-grid { grid-template-columns: repeat(2, 1fr); }
}
.tk-held-block {
  border-radius: 14px; padding: 18px 14px 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  cursor: pointer; text-align: center;
  transition: background .2s, border-color .2s, transform .15s, box-shadow .2s;
  position: relative; overflow: hidden;
}
.tk-held-block::before {
  content: '';
  position: absolute; inset: 0;
  background: radial-gradient(circle at 50% 0%, rgba(var(--hb-rgb),0.1), transparent 70%);
  opacity: 0; transition: opacity .2s;
}
.tk-held-block:hover::before { opacity: 1; }
.tk-held-block:hover {
  background: rgba(var(--hb-rgb), 0.06);
  border-color: rgba(var(--hb-rgb), 0.35);
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}
.tk-held-block-icon { font-size: 28px; margin-bottom: 8px; line-height: 1; }
.tk-held-block-name {
  font-family: var(--font-title); font-size: 10px; font-weight: 700;
  letter-spacing: 0.8px; text-transform: uppercase;
  color: rgba(var(--hb-rgb), 0.9);
  margin-bottom: 6px; line-height: 1.3;
}
.tk-held-block-cat {
  font-family: var(--font-body); font-size: 10px;
  color: rgba(255,255,255,0.3); margin-bottom: 6px;
}
.tk-held-block-cost {
  display: inline-flex; align-items: center; gap: 4px;
  background: rgba(var(--hb-rgb), 0.1);
  border: 1px solid rgba(var(--hb-rgb), 0.25);
  border-radius: 20px; padding: 3px 9px;
  font-family: var(--font-mono, monospace); font-size: 10px; font-weight: 700;
  color: rgba(var(--hb-rgb), 0.9);
}

/* Modal do held */
.tk-held-modal-overlay {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  animation: tk-fade-in .15s ease;
}
@keyframes tk-fade-in { from { opacity: 0 } to { opacity: 1 } }
.tk-held-modal {
  background: #0d1624; border-radius: 20px;
  border: 1px solid rgba(var(--hm-rgb,255,255,255), 0.2);
  box-shadow: 0 0 60px rgba(var(--hm-rgb,255,255,255), 0.1), 0 20px 60px rgba(0,0,0,0.6);
  max-width: 420px; width: 100%; overflow: hidden;
  animation: tk-slide-up .2s cubic-bezier(.4,0,.2,1);
}
@keyframes tk-slide-up { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
.tk-held-modal-header {
  padding: 24px 24px 20px;
  background: linear-gradient(135deg, rgba(var(--hm-rgb,255,255,255),0.06), transparent);
  border-bottom: 1px solid rgba(var(--hm-rgb,255,255,255), 0.1);
  display: flex; align-items: center; gap: 16px;
}
.tk-held-modal-icon { font-size: 40px; line-height: 1; }
.tk-held-modal-info { flex: 1; }
.tk-held-modal-name {
  font-family: var(--font-title); font-size: 16px; font-weight: 900;
  letter-spacing: 1.5px; text-transform: uppercase;
  color: rgba(var(--hm-rgb,255,255,255), 1);
  margin-bottom: 4px;
}
.tk-held-modal-cat {
  font-family: var(--font-body); font-size: 12px; color: rgba(255,255,255,0.35);
}
.tk-held-modal-close {
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.5); border-radius: 50%; width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 14px; transition: background .15s, color .15s;
  flex-shrink: 0;
}
.tk-held-modal-close:hover { background: rgba(255,255,255,0.14); color: #fff; }
.tk-held-modal-body { padding: 22px 24px 24px; display: flex; flex-direction: column; gap: 18px; }
.tk-held-modal-section-label {
  font-family: var(--font-title); font-size: 9px; font-weight: 700;
  letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.25);
  margin-bottom: 8px;
}
.tk-held-modal-efeito {
  font-family: var(--font-body); font-size: 13.5px; color: rgba(255,255,255,0.75);
  line-height: 1.7;
}
.tk-held-modal-dica {
  background: rgba(var(--hm-rgb,255,255,255), 0.05);
  border: 1px solid rgba(var(--hm-rgb,255,255,255), 0.12);
  border-radius: 12px; padding: 14px 16px;
  font-family: var(--font-body); font-size: 12.5px; color: rgba(255,255,255,0.5);
  line-height: 1.65; font-style: italic;
}
.tk-held-modal-custo {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(var(--hm-rgb,255,255,255), 0.08);
  border: 1px solid rgba(var(--hm-rgb,255,255,255), 0.2);
  border-radius: 40px; padding: 8px 18px;
  font-family: var(--font-mono, monospace); font-size: 14px; font-weight: 700;
  color: rgba(var(--hm-rgb,255,255,255), 1);
  align-self: flex-start;
}
</style>

<div class="tk-page">

  <!-- Hero -->
  <div class="tk-hero">
    <div class="tk-hero-icon">🪙</div>
    <div class="tk-hero-title">Sistema de Tokens</div>
    <div class="tk-hero-desc">
      Tokens são a moeda especial usada para adquirir Helds — os itens equipáveis nos seus Pokémon que potencializam seu desempenho em batalha. Entenda como tudo funciona abaixo.
    </div>
  </div>

  <!-- Explicações -->
  <div class="tk-explain-section">

    <!-- O que são tokens -->
    <div class="tk-info-card">
      <div class="tk-info-card-icon">🪙</div>
      <div class="tk-info-card-body">
        <div class="tk-info-card-title">O Que São Tokens?</div>
        <div class="tk-info-card-text">
          Tokens são uma <strong>moeda especial do servidor</strong> usada exclusivamente para trocar por <strong>Helds</strong>.
          Helds são os itens que você equipa nos seus Pokémon para aumentar seu poder em batalha — funcionam como acessórios estratégicos
          que podem ampliar ataque, defesa, velocidade e outros atributos essenciais.
          <br><br>
          Diferente do dinheiro comum (KK), os Tokens são conquistados por meio de atividades específicas e têm um propósito focado:
          <strong>fortalecer o seu time</strong>.
        </div>
      </div>
    </div>

    <!-- Máquina de troca -->
    <div class="tk-info-card">
      <div class="tk-info-card-icon">🏪</div>
      <div class="tk-info-card-body">
        <div class="tk-info-card-title">Como Utilizar Tokens?</div>
        <div class="tk-info-card-text">
          Para trocar seus Tokens por Helds, você precisa ir até a
          <strong><a href="https://prnt.sc/DYsS5fNrU0Ob" target="_blank" rel="noopener">Máquina de Troca</a></strong>
          localizada no <strong>Trade Center (TC), no segundo andar</strong>.
          <br><br>
          Cada Held tem um custo diferente em Tokens. Ao interagir com a máquina, você verá a lista de Helds disponíveis com seus
          respectivos preços. Basta ter a quantidade necessária de Tokens e confirmar a troca para receber o item.
          <br><br>
          Cada Held possui um <strong>efeito único</strong> — alguns aumentam dano, outros melhoram sobrevivência ou velocidade.
          Escolha de acordo com a estratégia do seu time!
        </div>
      </div>
    </div>

    <!-- Como obter -->
    <div class="tk-info-card">
      <div class="tk-info-card-icon">⚡</div>
      <div class="tk-info-card-body">
        <div class="tk-info-card-title">Como Obter Tokens?</div>
        <div class="tk-info-card-text">Existem <strong>três formas principais</strong> de acumular Tokens:</div>
        <div class="tk-steps">

          <div class="tk-step">
            <div class="tk-step-num">1</div>
            <div class="tk-step-text">
              <strong>Lutando Contra Rockets</strong> —
              Os Rockets são inimigos localizados ao sul de Pewter.
              Você pode encontrá-los <a href="https://prnt.sc/LNR7YvrKhaBF" target="_blank" rel="noopener">aqui</a>.
              Derrotá-los pode render Tokens como recompensa de drop.
              <div class="tk-step-bonus">🎁 Bônus: chance de dropar a <strong>Rocket Outfit</strong> exclusiva!</div>
            </div>
          </div>

          <div class="tk-step">
            <div class="tk-step-num">2</div>
            <div class="tk-step-text">
              <strong>NPCs da Duelist Brotherhood</strong> —
              A Duelist Brotherhood é um grupo de NPCs espalhados pelo servidor que te desafiam para batalhas.
              Ao vencê-los, você recebe Tokens como parte da recompensa.
              É uma atividade recorrente e também garante <strong>EXP</strong> para seus Pokémon.
            </div>
          </div>

          <div class="tk-step">
            <div class="tk-step-num">3</div>
            <div class="tk-step-text">
              <strong>Missões Diárias (Guild Daily's Mission)</strong> —
              As Missões Diárias são renovadas periodicamente e podem envolver batalhas específicas ou objetivos variados.
              Ao completá-las com sucesso, você garante <strong>Tokens como recompensa</strong>.
              Vale checar todo dia para não perder nenhuma!
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Guia de helds -->
    <div class="tk-info-card">
      <div class="tk-info-card-icon">📖</div>
      <div class="tk-info-card-body">
        <div class="tk-info-card-title">Saiba Mais Sobre Helds</div>
        <div class="tk-info-card-text">
          Quer entender mais profundamente como cada Held funciona, como equipá-los e qual é o ideal para sua estratégia?
          Confira o <strong>Guia Completo de Helds</strong> — lá você encontra tudo sobre os tipos de Helds, combinações recomendadas
          e dicas para montar o time perfeito.
          <br><br>
          Os Helds disponíveis na Máquina de Troca estão listados abaixo — clique em qualquer um para ver seus detalhes!
        </div>
      </div>
    </div>

  </div><!-- /tk-explain-section -->

  <div class="tk-divider" style="margin:28px auto 0; max-width:820px;"></div>

  <!-- Grid de Helds -->
  <div class="tk-helds-section">
    <div class="tk-helds-title">🎒 Helds Disponíveis na Máquina de Troca</div>
    <div class="tk-helds-grid" id="tk-helds-grid"></div>
  </div>

</div>

<!-- Modal do Held -->
<div id="tk-held-modal-root"></div>
`;

  // Renderiza os blocos de helds
  var grid = document.getElementById('tk-helds-grid');
  if (!grid) return;
  grid.innerHTML = TOKENS_HELDS.map(function(h) {
    return '<div class="tk-held-block" style="--hb-rgb:' + h.rgb + '" onclick="openHeldModal(\'' + h.id + '\')">' +
      '<div class="tk-held-block-icon">' + h.icon + '</div>' +
      '<div class="tk-held-block-name">' + h.name + '</div>' +
      '<div class="tk-held-block-cat">' + h.categoria + '</div>' +
      '<div class="tk-held-block-cost">🪙 ' + h.custo + '</div>' +
    '</div>';
  }).join('');
}

function openHeldModal(id) {
  var h = TOKENS_HELDS.find(function(x) { return x.id === id; });
  if (!h) return;
  // Remove modal existente
  var existing = document.getElementById('tk-held-modal-root');
  if (existing) existing.innerHTML = '';
  var root = existing || document.body;

  var html = '<div class="tk-held-modal-overlay" onclick="closeHeldModal(event)" id="tk-held-modal-overlay">' +
    '<div class="tk-held-modal" style="--hm-rgb:' + h.rgb + '">' +
      '<div class="tk-held-modal-header">' +
        '<div class="tk-held-modal-icon">' + h.icon + '</div>' +
        '<div class="tk-held-modal-info">' +
          '<div class="tk-held-modal-name">' + h.name + '</div>' +
          '<div class="tk-held-modal-cat">' + h.categoria + '</div>' +
        '</div>' +
        '<button class="tk-held-modal-close" onclick="closeHeldModalBtn()">✕</button>' +
      '</div>' +
      '<div class="tk-held-modal-body">' +
        '<div>' +
          '<div class="tk-held-modal-section-label">Efeito</div>' +
          '<div class="tk-held-modal-efeito">' + h.efeito + '</div>' +
        '</div>' +
        '<div>' +
          '<div class="tk-held-modal-section-label">Dica de Uso</div>' +
          '<div class="tk-held-modal-dica">' + h.dica + '</div>' +
        '</div>' +
        '<div class="tk-held-modal-custo">🪙 ' + h.custo + '</div>' +
      '</div>' +
    '</div>' +
  '</div>';

  root.innerHTML = html;
  document.body.style.overflow = 'hidden';
}

function closeHeldModal(e) {
  if (e.target.id === 'tk-held-modal-overlay') closeHeldModalBtn();
}
function closeHeldModalBtn() {
  var root = document.getElementById('tk-held-modal-root');
  if (root) root.innerHTML = '';
  document.body.style.overflow = '';
}
// Re-renderiza a aba ativa quando o db-bootstrap terminar
document.addEventListener('db:ready', function() {
  var activeTab = document.querySelector('.tab-content.active');
  if (!activeTab) return;
  var id = activeTab.id || '';
  if (id === 'tab-captura'  && typeof renderCaptura  === 'function') renderCaptura();
  if (id === 'tab-pacotes'  && typeof renderPackages === 'function') renderPackages();
  if (id === 'tab-itens'    && typeof renderItems    === 'function') renderItems();
});
