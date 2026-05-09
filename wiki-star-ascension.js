/* ================================================================
   wiki-star-ascension.js — Módulo Wiki: Star Ascension System
   Adicione no index.html APÓS wiki-nav.js:
     <script src="wiki-star-ascension.js"></script>
================================================================ */
(function () {

/* ── Estilos do módulo ──────────────────────────────────────── */
const S = document.createElement('style');
S.textContent = `

/* ══════════════════════════════════════════
   STAR ASCENSION — container principal
══════════════════════════════════════════ */
#wiki-tab-starascension {
  padding: 0 0 80px;
}

/* ── Banner de introdução ── */
.sa-intro {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 20px;
  background: linear-gradient(135deg,
    rgba(240,180,41,0.08) 0%,
    rgba(255,220,80,0.04) 50%,
    transparent 100%
  );
  border: 1px solid rgba(240,180,41,0.20);
  border-radius: 18px;
  padding: 24px 24px 20px;
  margin-bottom: 28px;
  overflow: hidden;
}
.sa-intro::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(240,180,41,0.75), rgba(255,210,60,0.4), transparent);
}
.sa-intro::after {
  content: '';
  position: absolute;
  top: -60px; right: -40px;
  width: 280px; height: 280px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(240,180,41,0.07) 0%, transparent 65%);
  pointer-events: none;
}
.sa-intro-icon {
  font-size: 50px;
  line-height: 1;
  flex-shrink: 0;
  filter: drop-shadow(0 0 20px rgba(240,180,41,0.55));
  animation: sa-float 3.5s ease-in-out infinite;
  position: relative;
  z-index: 1;
}
@keyframes sa-float {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-6px); }
}
.sa-intro-body {
  flex: 1;
  position: relative;
  z-index: 1;
}
.sa-intro-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #fff;
  margin-bottom: 9px;
  text-shadow: 0 2px 20px rgba(240,180,41,0.35);
}
.sa-intro-desc {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13.5px;
  font-weight: 500;
  color: rgba(255,255,255,0.50);
  line-height: 1.70;
}
.sa-intro-alert {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 13px;
  padding: 7px 14px;
  background: rgba(255,180,30,0.09);
  border: 1px solid rgba(255,180,30,0.28);
  border-radius: 8px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.4px;
  color: rgba(255,215,80,0.85);
}

/* ── Seções ── */
.sa-section {
  margin-bottom: 30px;
}
.sa-section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.sa-section-icon {
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
}
.sa-section-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(240,180,41,0.60);
  white-space: nowrap;
}
.sa-section-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(240,180,41,0.22), transparent 70%);
}

/* ── Imagem de referência ── */
.sa-ref-img-box {
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(240,180,41,0.18);
  background: rgba(0,0,0,0.30);
  max-width: 560px;
  margin: 0 auto;
}
.sa-ref-img-box img {
  width: 100%;
  height: auto;
  max-height: 340px;
  display: block;
  object-fit: contain;
  object-position: center top;
}
.sa-ref-caption {
  padding: 10px 16px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11.5px;
  font-weight: 500;
  color: rgba(255,255,255,0.28);
  letter-spacing: 0.3px;
  border-top: 1px solid rgba(240,180,41,0.10);
  background: rgba(0,0,0,0.20);
}

/* ── Cards numerados ── */
.sa-components-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sa-comp-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.07);
  background: rgba(8,15,30,0.85);
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  overflow: hidden;
}
.sa-comp-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(ellipse at 0% 50%, var(--sa-card-glow, rgba(240,180,41,0.05)) 0%, transparent 60%);
  pointer-events: none;
}
.sa-comp-card:hover {
  border-color: var(--sa-card-border, rgba(240,180,41,0.25));
  box-shadow: 0 0 24px var(--sa-card-glow, rgba(240,180,41,0.08)), 0 6px 20px rgba(0,0,0,0.4);
  background: rgba(10,18,36,0.95);
}
.sa-comp-card.type-primary   { --sa-card-border:rgba(58,140,255,0.3);  --sa-card-glow:rgba(58,140,255,0.07);  --sa-num-color:#3a8cff; --sa-num-bg:rgba(58,140,255,0.12); }
.sa-comp-card.type-secondary { --sa-card-border:rgba(255,100,100,0.3); --sa-card-glow:rgba(255,100,100,0.07); --sa-num-color:#ff6b6b; --sa-num-bg:rgba(255,100,100,0.12); }
.sa-comp-card.type-locker    { --sa-card-border:rgba(96,224,160,0.3);  --sa-card-glow:rgba(96,224,160,0.07);  --sa-num-color:#60e0a0; --sa-num-bg:rgba(96,224,160,0.12); }
.sa-comp-card.type-chance    { --sa-card-border:rgba(240,180,41,0.3);  --sa-card-glow:rgba(240,180,41,0.07);  --sa-num-color:#f0b429; --sa-num-bg:rgba(240,180,41,0.12); }
.sa-comp-card.type-cost      { --sa-card-border:rgba(180,100,255,0.3); --sa-card-glow:rgba(180,100,255,0.07); --sa-num-color:#c060ff; --sa-num-bg:rgba(180,100,255,0.12); }
.sa-comp-card.type-option    { --sa-card-border:rgba(96,170,255,0.3);  --sa-card-glow:rgba(96,170,255,0.07);  --sa-num-color:#60aaff; --sa-num-bg:rgba(96,170,255,0.12); }

.sa-comp-num {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--sa-num-bg, rgba(240,180,41,0.12));
  border: 1px solid var(--sa-num-color, #f0b429);
  color: var(--sa-num-color, #f0b429);
  font-family: var(--font-mono, monospace);
  font-size: 16px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  line-height: 1;
  box-shadow: 0 0 14px var(--sa-card-glow, rgba(240,180,41,0.15));
}
.sa-comp-body { flex: 1; position: relative; z-index: 1; }
.sa-comp-name {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: rgba(220,235,255,0.90);
  margin-bottom: 6px;
  line-height: 1.3;
}
.sa-comp-desc {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.45);
  line-height: 1.65;
}
.sa-comp-desc strong { color: rgba(255,255,255,0.80); font-weight: 700; }
.sa-comp-desc em     { color: var(--sa-num-color, #f0b429); font-style: normal; font-weight: 700; }

/* Badges inline */
.sa-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 6px;
  font-family: var(--font-mono, monospace);
  font-size: 11px;
  font-weight: 700;
  margin: 2px 2px;
  vertical-align: middle;
}
.sa-badge.safe   { background:rgba(96,224,160,0.12); border:1px solid rgba(96,224,160,0.3);  color:#60e0a0; }
.sa-badge.danger { background:rgba(255,100,100,0.12); border:1px solid rgba(255,100,100,0.3); color:#ff6b6b; }
.sa-badge.gold   { background:rgba(240,180,41,0.12);  border:1px solid rgba(240,180,41,0.3);  color:#f0b429; }
.sa-badge.blue   { background:rgba(58,140,255,0.12);  border:1px solid rgba(58,140,255,0.3);  color:#60aaff; }
.sa-badge.purple { background:rgba(180,100,255,0.12); border:1px solid rgba(180,100,255,0.3); color:#c060ff; }

/* Callout (Locker) */
.sa-callout {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 12px;
  padding: 13px 15px;
  background: rgba(96,224,160,0.06);
  border: 1px solid rgba(96,224,160,0.22);
  border-radius: 10px;
}
.sa-callout-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
.sa-callout-text {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(255,255,255,0.42);
  line-height: 1.65;
}
.sa-callout-text strong { color: rgba(96,224,160,0.85); font-weight: 700; }

/* ── Passo a passo ── */
.sa-steps-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
}
.sa-steps-list::before {
  content: '';
  position: absolute;
  left: 17px;
  top: 24px;
  bottom: 24px;
  width: 2px;
  background: linear-gradient(180deg, rgba(240,180,41,0.35), rgba(58,140,255,0.20), transparent);
  border-radius: 2px;
}
.sa-step {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 14px 0;
  position: relative;
}
.sa-step-dot {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: rgba(8,15,30,0.95);
  border: 2px solid rgba(240,180,41,0.35);
  color: rgba(240,180,41,0.80);
  font-family: var(--font-mono, monospace);
  font-size: 13px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
  position: relative;
}
.sa-step-content { flex: 1; padding-top: 7px; }
.sa-step-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 12.5px;
  font-weight: 700;
  color: rgba(220,235,255,0.90);
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}
.sa-step-desc {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.42);
  line-height: 1.60;
}
.sa-step-desc strong { color: rgba(255,255,255,0.75); font-weight: 700; }
.sa-step-desc em     { color: #f0b429; font-style: normal; font-weight: 700; }

/* Regra de igualdade */
.sa-rule-box {
  margin-top: 16px;
  padding: 16px 18px;
  background: rgba(255,100,100,0.06);
  border: 1px solid rgba(255,100,100,0.20);
  border-radius: 12px;
}
.sa-rule-box-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: rgba(255,100,100,0.70);
  margin-bottom: 10px;
}
.sa-rule-examples { display: flex; flex-direction: column; gap: 7px; }
.sa-rule-ex {
  display: flex;
  align-items: center;
  gap: 9px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12.5px;
  color: rgba(255,255,255,0.40);
}
.sa-rule-ex-icon { font-size: 15px; flex-shrink: 0; }
.sa-rule-ex strong { color: rgba(255,255,255,0.70); font-weight: 700; }

/* ── Tabela de bônus ── */
.sa-tier-table {
  width: 100%;
  border-collapse: collapse;
  border-radius: 14px;
  overflow: hidden;
}
.sa-tier-table thead tr {
  background: rgba(255,255,255,0.04);
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.sa-tier-table thead th {
  padding: 11px 16px;
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.28);
  text-align: left;
}
.sa-tier-table tbody tr {
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.15s;
}
.sa-tier-table tbody tr:last-child { border-bottom: none; }
.sa-tier-table tbody tr:hover { background: rgba(255,255,255,0.025); }
.sa-tier-table td {
  padding: 13px 16px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13.5px;
  font-weight: 600;
  color: rgba(255,255,255,0.55);
}
.sa-tier-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: rgba(255,255,255,0.85);
}
.sa-tier-dot {
  width: 9px; height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}
.sa-tier-bonus {
  font-family: var(--font-mono, monospace);
  font-size: 14px;
  font-weight: 900;
}

/* ── Bloco de custo ── */
.sa-cost-info { display: flex; flex-direction: column; gap: 10px; }
.sa-cost-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(8,15,30,0.80);
  border: 1px solid rgba(255,255,255,0.06);
}
.sa-cost-item-icon { font-size: 22px; flex-shrink: 0; margin-top: 1px; }
.sa-cost-item-body { flex: 1; }
.sa-cost-item-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 12px;
  font-weight: 700;
  color: rgba(220,235,255,0.85);
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}
.sa-cost-item-desc {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(255,255,255,0.38);
  line-height: 1.60;
}
.sa-cost-item-desc strong { color: rgba(255,255,255,0.70); font-weight: 700; }
.sa-cost-item-desc em     { color: #f0b429; font-style: normal; font-weight: 700; }

/* ── Nota final ── */
.sa-final-note {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px 20px;
  margin-top: 8px;
  border-radius: 14px;
  background: rgba(240,180,41,0.06);
  border: 1px solid rgba(240,180,41,0.18);
  position: relative;
  overflow: hidden;
}
.sa-final-note::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(240,180,41,0.55), transparent);
}
.sa-final-note-icon { font-size: 24px; flex-shrink: 0; }
.sa-final-note-text {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.45);
  line-height: 1.70;
}
.sa-final-note-text strong { color: rgba(240,180,41,0.85); font-weight: 700; }

/* ── Responsivo ── */
@media (max-width: 540px) {
  .sa-intro { flex-direction: column; gap: 14px; }
  .sa-intro-icon { font-size: 40px; }
  .sa-comp-card { padding: 14px 14px; }
  .sa-comp-num { width: 30px; height: 30px; font-size: 14px; }
  .sa-tier-table thead th, .sa-tier-table td { padding: 10px 12px; }
}
`;
document.head.appendChild(S);

/* ═══════════════════════════════════════════
   DADOS
═══════════════════════════════════════════ */
const TIERS = [
  { name: 'Tier 3',      bonus: '2%',  color: '#60aaff', emoji: '🔵' },
  { name: 'Tier 2',      bonus: '4%',  color: '#60e0a0', emoji: '🟢' },
  { name: 'Tier 1',      bonus: '6%',  color: '#ffd166', emoji: '🟡' },
  { name: 'Super Rare',  bonus: '8%',  color: '#ff9f43', emoji: '🟠' },
  { name: 'Ultra Rare',  bonus: '10%', color: '#ff6b6b', emoji: '🔴' },
  { name: 'Legendary',   bonus: '15%', color: '#c060ff', emoji: '🟣' },
];

const COMPONENTS = [
  {
    num: '1', type: 'primary',
    name: 'Botão de Acesso — Abrindo a Star Machine',
    desc: `É o <strong>botão que o jogador clica para abrir o painel da Star Machine</strong>. 
      Ao interagir com ele, toda a interface do sistema de Star Ascension é exibida, 
      permitindo configurar e iniciar o processo de evolução de estrelas.`,
  },
  {
    num: '2', type: 'locker',
    name: 'Locker — Armazenamento Obrigatório do Pokémon Secundário',
    desc: `O <strong>Locker</strong> é onde o jogador deve guardar o(s) Pokémon secundário(s) que 
      serão usados como <em>"material"</em> no processo de Star Ascension — ou seja, os Pokémon 
      que irão alimentar a evolução de estrela do Pokémon Principal.<br><br>
      <strong>Este é o mesmo Locker compartilhado entre todas as cidades do servidor</strong>, 
      não é exclusivo da Star Machine. Se você já conhece o Locker das cidades, 
      é exatamente este.<br><br>
      <strong>Por que o Pokémon Secundário precisa estar no Locker?</strong><br>
      No servidor, <em>não é permitido carregar dois Pokémon idênticos no inventário principal 
      ao mesmo tempo</em>. Por isso, o sistema exige que:<br><br>
      &nbsp;&nbsp;→ O Pokémon <em>PRINCIPAL</em> (o que vai receber a estrela) fique com o jogador, 
      ou seja, <strong>no inventário principal</strong>.<br>
      &nbsp;&nbsp;→ O(s) Pokémon <em>SECUNDÁRIO(S)</em> (o material) fiquem guardados 
      <strong>no CP (Character Pack / Depot / Locker)</strong> antes de iniciar o processo.<br><br>
      Esse fluxo foi desenhado para <em>evitar erros humanos</em>: ao separar fisicamente os dois Pokémon 
      em locais diferentes, fica muito mais difícil confundir qual será preservado e qual poderá ser consumido.`,
    callout: {
      icon: '🔒',
      text: `<strong>Resumo prático:</strong> O Pokémon que você quer manter — coloque no seu 
        inventário principal e carregue com você. O Pokémon "material" (o que pode ser perdido) 
        — coloque no Locker / CP antes de abrir a Star Machine. Somente assim o processo será liberado.`,
    },
  },
  {
    num: '3', type: 'primary',
    name: 'Slot do Pokémon Principal — Sempre protegido',
    desc: `Este é o slot onde o jogador posiciona o <em>Pokémon PRINCIPAL</em> — 
      aquele que <strong>receberá a nova estrela</strong> ao final de um processo bem-sucedido.<br><br>
      <strong>Independente de qualquer configuração selecionada</strong>, de qualquer resultado 
      (sucesso ou falha) e de qualquer combinação de opções ativas, 
      <em>o Pokémon neste slot NUNCA será perdido</em>. Ele está 100% protegido pelo sistema.`,
  },
  {
    num: '4', type: 'secondary',
    name: 'Slot do Pokémon Secundário — Sujeito a perda',
    desc: `Este é o slot do <em>Pokémon SECUNDÁRIO</em> — o Pokémon utilizado como 
      <strong>material de "combustível"</strong> para o processo de evolução de estrela.<br><br>
      <span class="sa-badge danger">⚠ ATENÇÃO</span> O Pokémon colocado neste slot 
      <strong>pode ser perdido</strong> durante o processo, dependendo das opções 
      selecionadas e do resultado obtido (sucesso ou falha). 
      Sempre verifique as configurações antes de confirmar.`,
  },
  {
    num: '5', type: 'chance',
    name: 'Chance de Sucesso',
    desc: `Exibe a <strong>porcentagem de chance de sucesso</strong> do processo com base 
      nas configurações ativas.<br><br>
      A chance padrão (sem taxa adicional) é de <em>35%</em>. 
      Ao ativar a opção do item 7, essa chance sobe para <em>100%</em> garantido.`,
  },
  {
    num: '6', type: 'option',
    name: 'Toggle: Preservar ou Perder o Pokémon Secundário',
    desc: `Este toggle define o destino do Pokémon Secundário no processo:<br><br>
      <span class="sa-badge danger">✖ Ativo (X / vermelho)</span> — O Pokémon Secundário 
      <strong>SERÁ PERDIDO</strong> durante o processo, independentemente do resultado.<br><br>
      <span class="sa-badge safe">✔ Inativo (check / verde)</span> — O Pokémon Secundário 
      <strong>NÃO SERÁ PERDIDO</strong> durante o processo.<br><br>
      Atenção: este toggle pode ser sobrescrito pelas configurações das taxas adicionais (itens 7 e 8).`,
  },
  {
    num: '7', type: 'chance',
    name: 'Taxa de Garantia Total — Sucesso 100%',
    desc: `O jogador pode pagar uma <strong>taxa adicional mais cara</strong>, 
      composta por uma parte em <em>KK</em> e outra em <em>Diamonds</em>.<br><br>
      Ao selecionar esta opção:<br>
      <span class="sa-badge gold">★ 100% de sucesso garantido</span> — O processo 
      <strong>nunca falhará</strong>, independente de qualquer fator.<br><br>
      <span class="sa-badge danger">✖ Pokémon Secundário sempre perdido</span> — Como o sucesso 
      é garantido, o Pokémon Secundário <strong>sempre será consumido</strong>.<br><br>
      Use quando você não quer absolutamente nenhuma chance de falha e está disposto 
      a pagar o custo mais alto por isso.`,
  },
  {
    num: '8', type: 'option',
    name: 'Taxa de Proteção em Falha — Custo menor, risco mantido',
    desc: `O jogador pode pagar uma <strong>taxa adicional mais barata</strong> do que a do item 7, 
      também composta por uma parte em <em>KK</em> e outra em <em>Diamonds</em>.<br><br>
      Ao selecionar esta opção:<br>
      <span class="sa-badge gold">35% de chance</span> — A probabilidade de sucesso 
      <strong>permanece a mesma</strong> do processo padrão.<br><br>
      <span class="sa-badge safe">✔ Em caso de FALHA</span> — O Pokémon Secundário 
      <strong>NÃO será perdido</strong>. Apenas os valores gastos em KK e Diamonds 
      naquela tentativa são descartados.<br><br>
      <span class="sa-badge danger">Em caso de SUCESSO</span> — O Pokémon Secundário 
      <strong>sempre será removido</strong>, pois foi consumido para completar a ascensão.<br><br>
      Use quando você quer proteger o Pokémon Secundário de tentativas fracassadas, 
      sem pagar o valor máximo de garantia total.`,
  },
  {
    num: '9', type: 'cost',
    name: 'Valor da Taxa Adicional',
    desc: `Exibe o <strong>custo específico da taxa adicional</strong> conforme a opção escolhida 
      (item 7 ou item 8).<br><br>
      A taxa de garantia total (item 7) tem valor <em>mais alto</em>. 
      A taxa de proteção em falha (item 8) tem valor <em>mais baixo</em>. 
      Este campo mostra exatamente quanto será cobrado por cada escolha.`,
  },
  {
    num: '10', type: 'cost',
    name: 'Custo Base — Obrigatório, sem exceção',
    desc: `Este é o <strong>custo base do processo de Star Ascension</strong>. 
      Ele <em>sempre é cobrado</em> independentemente de qualquer configuração selecionada 
      — não é possível removê-lo ou contorná-lo.<br><br>
      O jogador escolhe <strong>como pagá-lo</strong>:<br>
      <span class="sa-badge blue">💎 100% em Diamonds</span><br>
      <span class="sa-badge gold">💰 100% em KK (dinheiro)</span><br>
      <span class="sa-badge purple">⚡ 50% Diamonds + 50% KK</span><br><br>
      <strong>⚠ Custo Total = Item 9 + Item 10.</strong> Sempre some os dois valores 
      antes de confirmar o processo.`,
  },
];

const STEPS = [
  {
    title: 'Mova o Pokémon Principal para o Slot 3',
    desc: 'Pegue o Pokémon que você deseja <em>receber a nova estrela</em> (o Principal) do seu inventário e posicione-o no <strong>Slot 3</strong> da Star Machine. Este Pokémon está sempre protegido e nunca será perdido.',
  },
  {
    title: 'Mova o Pokémon Secundário para o Slot 4',
    desc: 'Pegue o Pokémon "material" do seu <strong>Locker / CP (depot)</strong> e mova-o para o <strong>Slot 4</strong>. Este é o Pokémon que poderá ser consumido dependendo das opções selecionadas e do resultado.',
  },
  {
    title: 'Confirme que os dois Pokémon são idênticos',
    desc: 'Os dois Pokémon <strong>precisam ser exatamente iguais</strong>: mesma espécie, mesmo tipo (shiny ou normal) e <em>mesmo nível de estrela atual</em>. Exemplos de combinações válidas e inválidas estão listados abaixo.',
  },
  {
    title: 'Selecione uma taxa adicional (opcional)',
    desc: 'Se desejar, escolha entre a <strong>Taxa de Garantia (item 7)</strong> para 100% de sucesso, ou a <strong>Taxa de Proteção em Falha (item 8)</strong> para proteger o Pokémon Secundário. Nenhuma é obrigatória.',
  },
  {
    title: 'Selecione a forma de pagamento do Custo Base',
    desc: 'No <strong>item 10</strong>, escolha pagar exclusivamente em <em>Diamonds</em>, exclusivamente em <em>KK</em>, ou dividir o valor <em>50% em cada moeda</em>.',
  },
  {
    title: 'Revise todos os valores e configurações',
    desc: 'Antes de confirmar, verifique os Pokémon nos slots, o <strong>custo total (item 9 + item 10)</strong>, as opções ativas e a chance de sucesso exibida no item 5. Não há como desfazer após confirmar.',
  },
  {
    title: 'Clique no botão azul ao lado do item 10',
    desc: 'Com tudo certo, clique no <strong>botão azul de confirmação</strong>. A janela será fechada e uma <em>animação na Star Machine</em> indicará sucesso ou falha. Você também receberá uma <strong>mensagem de resultado</strong> no chat.',
  },
];

/* ═══════════════════════════════════════════
   RENDERIZADOR
═══════════════════════════════════════════ */
function renderStarAscension() {
  const tabWiki = document.getElementById('tab-wiki');
  if (!tabWiki) return;

  let panel = document.getElementById('wiki-tab-starascension');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'wiki-tab-starascension';
    panel.className = 'wiki-subtab-content';
    tabWiki.appendChild(panel);
  }

  panel.innerHTML = `

    <div class="sa-intro">
      <div class="sa-intro-icon">⭐</div>
      <div class="sa-intro-body">
        <div class="sa-intro-title">Star Ascension</div>
        <div class="sa-intro-desc">
          O sistema de Star Ascension permite evoluir as estrelas dos seus Pokémon, 
          concedendo bônus permanentes e cumulativos de dano de ataque. 
          Cada decisão aqui é importantíssima — leia com atenção antes de iniciar qualquer processo, 
          pois algumas configurações podem resultar na perda permanente do Pokémon Secundário.
        </div>
        <div class="sa-intro-alert">⚠️ &nbsp; Atenção total requerida — algumas decisões são irreversíveis</div>
      </div>
    </div>

    <!-- Imagem de referência -->
    <div class="sa-section">
      <div class="sa-section-header">
        <span class="sa-section-icon">🖼️</span>
        <span class="sa-section-title">Imagem de Referência</span>
        <div class="sa-section-line"></div>
      </div>
      <div class="sa-ref-img-box">
        <img src="https://i.imgur.com/CzD60rw.png" alt="Star Ascension — Painel de referência" loading="lazy" />
        <div class="sa-ref-caption">Os números na imagem acima correspondem a cada componente explicado abaixo. Use como guia visual durante o processo.</div>
      </div>
    </div>

    <!-- Componentes -->
    <div class="sa-section">
      <div class="sa-section-header">
        <span class="sa-section-icon">📋</span>
        <span class="sa-section-title">Componentes do Painel</span>
        <div class="sa-section-line"></div>
      </div>
      <div class="sa-components-grid">
        ${COMPONENTS.map(c => `
          <div class="sa-comp-card type-${c.type}">
            <div class="sa-comp-num">${c.num}</div>
            <div class="sa-comp-body">
              <div class="sa-comp-name">${c.name}</div>
              <div class="sa-comp-desc">${c.desc}</div>
              ${c.callout ? `
                <div class="sa-callout">
                  <span class="sa-callout-icon">${c.callout.icon}</span>
                  <div class="sa-callout-text">${c.callout.text}</div>
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Passo a passo -->
    <div class="sa-section">
      <div class="sa-section-header">
        <span class="sa-section-icon">🚀</span>
        <span class="sa-section-title">Como Realizar o Processo</span>
        <div class="sa-section-line"></div>
      </div>
      <div class="sa-steps-list">
        ${STEPS.map((s, i) => `
          <div class="sa-step">
            <div class="sa-step-dot">${i + 1}</div>
            <div class="sa-step-content">
              <div class="sa-step-title">${s.title}</div>
              <div class="sa-step-desc">${s.desc}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="sa-rule-box">
        <div class="sa-rule-box-title">⚠ Regra obrigatória — Pokémon precisam ser idênticos</div>
        <div class="sa-rule-examples">
          <div class="sa-rule-ex"><span class="sa-rule-ex-icon">✅</span><span><strong>Shiny Blastoise ★2</strong> + <strong>Shiny Blastoise ★2</strong> → Combinação válida</span></div>
          <div class="sa-rule-ex"><span class="sa-rule-ex-icon">❌</span><span><strong>Shiny Blastoise ★1</strong> + <strong>Shiny Blastoise ★2</strong> → Nível de estrela diferente, inválido</span></div>
          <div class="sa-rule-ex"><span class="sa-rule-ex-icon">❌</span><span><strong>Blastoise normal</strong> + <strong>Shiny Blastoise</strong> → Tipo diferente (shiny vs normal), inválido</span></div>
        </div>
      </div>
    </div>

    <!-- Custo -->
    <div class="sa-section">
      <div class="sa-section-header">
        <span class="sa-section-icon">💰</span>
        <span class="sa-section-title">Qual o Custo das Estrelas?</span>
        <div class="sa-section-line"></div>
      </div>
      <div class="sa-cost-info">
        <div class="sa-cost-item">
          <div class="sa-cost-item-icon">📊</div>
          <div class="sa-cost-item-body">
            <div class="sa-cost-item-title">Custo varia por Tier</div>
            <div class="sa-cost-item-desc">Cada Tier de Pokémon possui um <strong>valor base diferente</strong>. Tiers mais baixos têm custos menores; Tiers mais altos exigem <em>investimentos maiores</em>.</div>
          </div>
        </div>
        <div class="sa-cost-item">
          <div class="sa-cost-item-icon">⬆️</div>
          <div class="sa-cost-item-body">
            <div class="sa-cost-item-title">Custo escala com o nível de estrela</div>
            <div class="sa-cost-item-desc">Quanto <strong>mais estrelas</strong> o Pokémon já tiver, <em>maior será o custo</em> para adicionar a próxima. O processo fica progressivamente mais caro a cada evolução.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bônus por Tier -->
    <div class="sa-section">
      <div class="sa-section-header">
        <span class="sa-section-icon">⚔️</span>
        <span class="sa-section-title">Bônus por Estrela — Dano de Ataque</span>
        <div class="sa-section-line"></div>
      </div>
      <div class="sa-comp-card type-chance" style="margin-bottom:14px;">
        <div class="sa-comp-num">ℹ</div>
        <div class="sa-comp-body">
          <div class="sa-comp-name">Bônus exclusivo de Dano de Ataque</div>
          <div class="sa-comp-desc">
            Cada estrela adicionada concede um <em>bônus percentual cumulativo</em> 
            exclusivamente em <strong>Dano de Ataque</strong>. O bônus é fixo por Tier 
            — quanto mais rara a raridade, maior o ganho por estrela.
          </div>
        </div>
      </div>
      <table class="sa-tier-table">
        <thead>
          <tr>
            <th>Tier / Raridade</th>
            <th>Bônus por ⭐ (Dano de Ataque)</th>
          </tr>
        </thead>
        <tbody>
          ${TIERS.map(t => `
            <tr>
              <td>
                <span class="sa-tier-name">
                  <span class="sa-tier-dot" style="background:${t.color};box-shadow:0 0 8px ${t.color}66;"></span>
                  ${t.emoji} ${t.name}
                </span>
              </td>
              <td>
                <span class="sa-tier-bonus" style="color:${t.color};">+${t.bonus}</span>
                <span style="font-size:11px;color:rgba(255,255,255,0.28);margin-left:4px;">por estrela</span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Nota final -->
    <div class="sa-final-note">
      <div class="sa-final-note-icon">💡</div>
      <div class="sa-final-note-text">
        <strong>Lembre-se:</strong> O custo total do processo é sempre a soma do 
        <strong>Custo Base (item 10)</strong> mais a <strong>Taxa Adicional (item 9)</strong>, 
        caso alguma opção de taxa tenha sido escolhida. Verifique o valor final exibido 
        na tela antes de confirmar — as decisões não podem ser desfeitas.
      </div>
    </div>

  `;
}

/* ═══════════════════════════════════════════
   REGISTRO NO WIKI-NAV
═══════════════════════════════════════════ */

/* Injeta o card no grid da home */
function injectCard() {
  var grid = document.querySelector('#wn-home .wn-grid');
  if (!grid) { setTimeout(injectCard, 150); return; }
  if (document.querySelector('[onclick*="starascension"]')) return;
  var card = document.createElement('div');
  card.className = 'wn-card';
  card.style.cssText = '--wn-color:#f0b429;--wn-rgb:240,180,41;--wn-glow:rgba(240,180,41,0.12)';
  card.setAttribute('onclick', "window._wnOpen('starascension')");
  card.setAttribute('title', 'Star Ascension');
  card.innerHTML = `
    <div class="wn-card-icon">⭐</div>
    <div class="wn-card-name">Star Ascension</div>
    <div class="wn-card-desc">Evolução de estrelas e bônus de ataque</div>
    <div class="wn-card-arrow">→</div>
  `;
  grid.appendChild(card);
}

/* Faz o patch no _wnOpen para reconhecer o novo id */
function patchWnOpen() {
  if (typeof window._wnOpen !== 'function') { setTimeout(patchWnOpen, 100); return; }
  var _orig = window._wnOpen;
  window._wnOpen = function(id) {
    if (id !== 'starascension') { _orig.call(this, id); return; }

    /* Abre o módulo manualmente com o mesmo fluxo do wiki-nav */
    var MOD = { id:'starascension', name:'Star Ascension', icon:'⭐',
                desc:'Evolução de estrelas e bônus de ataque',
                color:'#f0b429', rgb:'240,180,41' };

    var bcIcon = document.getElementById('wn-bc-icon');
    var bcName = document.getElementById('wn-bc-name');
    if (bcIcon) bcIcon.innerHTML = MOD.icon;
    if (bcName) bcName.textContent = MOD.name;

    var modBanner = document.getElementById('wn-mod-banner');
    var modLine   = document.getElementById('wn-mod-line');
    if (modBanner) {
      modBanner.style.setProperty('--wn-mod-color', MOD.color);
      modBanner.style.setProperty('--wn-mod-glow', 'rgba('+MOD.rgb+',0.18)');
      document.getElementById('wn-mod-icon').innerHTML  = MOD.icon;
      document.getElementById('wn-mod-name').textContent = MOD.name;
      document.getElementById('wn-mod-desc').textContent = MOD.desc;
    }
    if (modLine) modLine.style.background = 'linear-gradient(90deg,'+MOD.color+'55,transparent 60%)';

    document.getElementById('wn-home').style.display = 'none';
    var content = document.getElementById('wn-content');
    content.style.display = 'block';
    content.classList.add('visible');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    renderStarAscension();

    function _mount() {
      var slot  = document.getElementById('wn-slot');
      var panel = document.getElementById('wiki-tab-starascension');
      if (slot && panel) {
        document.querySelectorAll('.wiki-subtab-content.wn-visible').forEach(function(el){ el.classList.remove('wn-visible'); });
        while (slot.firstChild) slot.removeChild(slot.firstChild);
        slot.appendChild(panel);
        panel.classList.add('wn-visible');
      }
    }
    _mount();
    setTimeout(_mount, 100);
  };
}

function init() {
  injectCard();
  patchWnOpen();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();