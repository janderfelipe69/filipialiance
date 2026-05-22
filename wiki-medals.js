/* ================================================================
   wiki-medals.js
   Aba "Medal System" para a Wiki do PokeAlliance.
   Carregue APÓS wiki-nav.js no index.html:
     <script src="wiki-medals.js"></script>
================================================================ */
(function () {

/* ── Estilos ─────────────────────────────────────────────────── */
const S = document.createElement('style');
S.textContent = `

/* ══════════════════════════════════════════
   MEDAL SYSTEM — Container principal
══════════════════════════════════════════ */
#wiki-tab-medals {
  padding: 0 0 60px;
}

/* ── Seção de vídeo demo ── */
.ms-video-section {
  margin-bottom: 0;
}
.ms-section-label {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: rgba(205,127,50,0.7);
  margin-bottom: 12px;
}
.ms-video-wrap {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(205,127,50,0.25);
  background: #000;
  box-shadow: 0 4px 40px rgba(205,127,50,0.12), 0 8px 40px rgba(0,0,0,0.6);
  max-width: 640px;
  margin: 0 auto;
  aspect-ratio: 16 / 9;
}
.ms-video-wrap video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  background: #000;
}
.ms-video-overlay-label {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(205,127,50,0.85);
  backdrop-filter: blur(6px);
  border-radius: 8px;
  padding: 5px 12px;
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #0a0d14;
}

/* ── Grid de info cards ── */
.ms-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 28px;
}
.ms-info-card {
  background: rgba(8,15,30,0.95);
  border: 1px solid rgba(205,127,50,0.15);
  border-radius: 16px;
  padding: 20px 18px;
  position: relative;
  overflow: hidden;
  transition: border-color .2s, box-shadow .2s, transform .22s cubic-bezier(.16,1,.3,1);
}
.ms-info-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--ms-card-color, #cd7f32), transparent);
  opacity: 0.6;
}
.ms-info-card:hover {
  border-color: rgba(205,127,50,0.35);
  box-shadow: 0 0 24px rgba(205,127,50,0.1), 0 8px 28px rgba(0,0,0,0.4);
  transform: translateY(-3px);
}
.ms-info-card-icon {
  font-size: 28px;
  line-height: 1;
  margin-bottom: 12px;
  display: block;
  filter: drop-shadow(0 0 8px rgba(205,127,50,0.4));
}
.ms-info-card-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #fff;
  margin-bottom: 8px;
}
.ms-info-card-body {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.45);
  line-height: 1.6;
}
.ms-info-card-body strong {
  color: rgba(255,209,102,0.85);
  font-weight: 700;
}

/* ── Separador de seção ── */
.ms-divider {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 28px 0 20px;
}
.ms-divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(205,127,50,0.25), transparent);
}
.ms-divider-gem {
  width: 6px; height: 6px;
  border-radius: 1px;
  transform: rotate(45deg);
  background: rgba(205,127,50,0.6);
  box-shadow: 0 0 8px rgba(205,127,50,0.5);
  flex-shrink: 0;
}

/* ── Tabela de raridades ── */
.ms-rarity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
  margin-bottom: 28px;
}
.ms-rarity-card {
  border-radius: 14px;
  padding: 18px 14px;
  text-align: center;
  border: 1px solid var(--ms-r-border);
  background: var(--ms-r-bg);
  position: relative;
  overflow: hidden;
  transition: transform .2s, box-shadow .2s;
}
.ms-rarity-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px var(--ms-r-glow);
}
.ms-rarity-card::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: var(--ms-r-accent);
  opacity: 0.8;
}
.ms-rarity-name {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--ms-r-color);
  margin-bottom: 8px;
}
.ms-rarity-example {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11px;
  font-weight: 500;
  color: rgba(255,255,255,0.35);
  margin-bottom: 6px;
}
.ms-rarity-icon {
  font-size: 26px;
  line-height: 1;
  display: block;
  margin-bottom: 8px;
  filter: drop-shadow(0 0 6px var(--ms-r-glow));
}

/* ── Evento de lançamento ── */
.ms-event-banner {
  border-radius: 18px;
  padding: 24px;
  background: linear-gradient(135deg, rgba(255,200,0,0.07) 0%, rgba(205,127,50,0.05) 100%);
  border: 1px solid rgba(255,200,0,0.2);
  margin-bottom: 28px;
  position: relative;
  overflow: hidden;
}
.ms-event-banner::before {
  content: '';
  position: absolute;
  top: -30px; right: -30px;
  width: 200px; height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,200,0,0.08) 0%, transparent 70%);
  pointer-events: none;
}
.ms-event-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.ms-event-icon {
  font-size: 32px;
  filter: drop-shadow(0 0 10px rgba(255,200,0,0.5));
  animation: ms-pulse 2s ease-in-out infinite;
}
@keyframes ms-pulse {
  0%, 100% { filter: drop-shadow(0 0 8px rgba(255,200,0,0.5)); }
  50%       { filter: drop-shadow(0 0 18px rgba(255,200,0,0.8)); }
}
.ms-event-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 16px;
  font-weight: 900;
  color: #ffd166;
  letter-spacing: 1.5px;
}
.ms-event-sub {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11px;
  color: rgba(255,209,102,0.5);
  letter-spacing: 1px;
  margin-top: 2px;
}
.ms-event-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ms-event-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.ms-event-row-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #ffd166;
  margin-top: 6px;
  flex-shrink: 0;
  box-shadow: 0 0 6px rgba(255,209,102,0.6);
}
.ms-event-row-text {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.55);
  line-height: 1.5;
}
.ms-event-row-text strong {
  color: #ffd166;
  font-weight: 700;
}

/* ── Booster card ── */
.ms-booster {
  border-radius: 18px;
  padding: 24px;
  background: linear-gradient(135deg, rgba(100,60,220,0.08) 0%, rgba(58,140,255,0.05) 100%);
  border: 1px solid rgba(140,100,255,0.2);
  margin-bottom: 28px;
  position: relative;
  overflow: hidden;
}
.ms-booster::before {
  content: '';
  position: absolute;
  bottom: -20px; left: -20px;
  width: 180px; height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(100,60,220,0.1) 0%, transparent 70%);
  pointer-events: none;
}
.ms-booster-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.ms-booster-icon {
  font-size: 30px;
  filter: drop-shadow(0 0 10px rgba(140,100,255,0.5));
}
.ms-booster-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 16px;
  font-weight: 900;
  color: #c8a0ff;
  letter-spacing: 1.5px;
}
.ms-booster-sub {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11px;
  color: rgba(200,160,255,0.4);
  letter-spacing: 1px;
  margin-top: 2px;
}
.ms-booster-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}
.ms-booster-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid rgba(140,100,255,0.25);
  background: rgba(100,60,220,0.1);
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12px;
  font-weight: 600;
  color: rgba(200,160,255,0.75);
  letter-spacing: 0.5px;
}
.ms-booster-tag span { font-size: 13px; }

/* ── Requisito banner ── */
.ms-req-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 16px 20px;
  margin-bottom: 28px;
}
.ms-req-icon { font-size: 26px; flex-shrink: 0; }
.ms-req-text {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.45);
  line-height: 1.5;
}
.ms-req-text strong {
  color: rgba(100,200,100,0.85);
  font-weight: 700;
}

/* ── Aviso de balanceamento ── */
.ms-balance-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(255,150,50,0.05);
  border: 1px solid rgba(255,150,50,0.2);
  border-radius: 14px;
  padding: 16px 18px;
  margin-bottom: 0;
}
.ms-balance-icon { font-size: 22px; flex-shrink: 0; margin-top: 1px; }
.ms-balance-text {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12px;
  font-weight: 500;
  color: rgba(255,180,80,0.65);
  line-height: 1.6;
}
.ms-balance-text strong {
  color: rgba(255,180,80,0.9);
  font-weight: 700;
}

/* ── Quick Summary ── */
.ms-summary {
  border-radius: 16px;
  background: rgba(205,127,50,0.05);
  border: 1px solid rgba(205,127,50,0.15);
  padding: 20px;
  margin-bottom: 28px;
}
.ms-summary-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(205,127,50,0.7);
  margin-bottom: 14px;
}
.ms-summary-list {
  list-style: none;
  padding: 0; margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ms-summary-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.5);
  line-height: 1.4;
}
.ms-summary-list li::before {
  content: '';
  width: 5px; height: 5px;
  border-radius: 1px;
  transform: rotate(45deg);
  background: rgba(205,127,50,0.6);
  flex-shrink: 0;
}
.ms-summary-list li strong {
  color: rgba(255,220,150,0.85);
  font-weight: 700;
}

/* Responsivo */
@media (max-width: 640px) {
  .ms-info-grid { grid-template-columns: 1fr; }
  .ms-rarity-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 400px) {
  .ms-rarity-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
}
`;
document.head.appendChild(S);

/* ── Renderizador ────────────────────────────────────────────── */
window.renderMedals = function () {
  /* Evita re-renderizar se o panel já existe */
  if (document.getElementById('wiki-tab-medals')) return;

  const tabWiki = document.getElementById('tab-wiki');
  if (!tabWiki) return;

  const panel = document.createElement('div');
  panel.id = 'wiki-tab-medals';
  panel.className = 'wiki-subtab-content';

  panel.innerHTML = `

    <!-- Requisito -->
    <div class="ms-req-bar">
      <span class="ms-req-icon">🔒</span>
      <div class="ms-req-text">
        Disponível apenas para jogadores <strong>Level 350+</strong>.
        Alcance o nível necessário para desbloquear o sistema de medalhas.
      </div>
    </div>

    <!-- Como funciona -->
    <div class="ms-section-label">⚙️ Como Funciona</div>
    <div class="ms-info-grid">

      <div class="ms-info-card" style="--ms-card-color:#cd7f32">
        <span class="ms-info-card-icon">🐉</span>
        <div class="ms-info-card-title">Drop — Pokémon de Hoenn</div>
        <div class="ms-info-card-body">
          Todos os Pokémon de <strong>Hoenn</strong> têm chance de dropar
          uma <strong>Medal Box</strong> ao serem derrotados.
        </div>
      </div>

      <div class="ms-info-card" style="--ms-card-color:#8c64ff">
        <span class="ms-info-card-icon">📦</span>
        <div class="ms-info-card-title">Abrindo a Medal Box</div>
        <div class="ms-info-card-body">
          Ao abrir, você recebe uma <strong>Medalha de Bronze aleatória</strong>
          da <strong>Geração 1</strong>.
        </div>
      </div>

      <div class="ms-info-card" style="--ms-card-color:#60aaff">
        <span class="ms-info-card-icon">⭐</span>
        <div class="ms-info-card-title">Usando a Medalha</div>
        <div class="ms-info-card-body">
          Usar a medalha concede <strong>+100 de XP</strong> no nível
          daquela medalha.
        </div>
      </div>

      <div class="ms-info-card" style="--ms-card-color:#50d890">
        <span class="ms-info-card-icon">🔓</span>
        <div class="ms-info-card-title">Desbloqueio (Nível 1)</div>
        <div class="ms-info-card-body">
          Todas as medalhas chegam <strong>lockadas</strong>. Com
          <strong>100 de XP</strong> você atinge o Nível 1 e libera o uso.
        </div>
      </div>

    </div>

    <!-- Raridades -->
    <div class="ms-divider">
      <div class="ms-divider-line"></div>
      <div class="ms-divider-gem"></div>
      <div class="ms-divider-gem" style="background:rgba(140,100,255,0.6);box-shadow:0 0 8px rgba(140,100,255,0.4)"></div>
      <div class="ms-divider-gem"></div>
      <div class="ms-divider-line" style="background:linear-gradient(90deg,transparent,rgba(205,127,50,0.25))"></div>
    </div>

    <div class="ms-section-label">💎 Raridades dentro do Bronze</div>
    <div class="ms-rarity-grid">

      <div class="ms-rarity-card" style="
        --ms-r-border: rgba(180,180,180,0.2);
        --ms-r-bg:     rgba(180,180,180,0.04);
        --ms-r-accent: linear-gradient(90deg,transparent,rgba(180,180,180,0.5),transparent);
        --ms-r-color:  rgba(200,200,200,0.85);
        --ms-r-glow:   rgba(180,180,180,0.2)">
        <span class="ms-rarity-icon">🩶</span>
        <div class="ms-rarity-name">Comum</div>
        <div class="ms-rarity-example">Ex: Bulbasaur</div>
      </div>

      <div class="ms-rarity-card" style="
        --ms-r-border: rgba(80,200,120,0.25);
        --ms-r-bg:     rgba(80,200,120,0.04);
        --ms-r-accent: linear-gradient(90deg,transparent,rgba(80,200,120,0.55),transparent);
        --ms-r-color:  rgba(100,220,130,0.9);
        --ms-r-glow:   rgba(80,200,120,0.25)">
        <span class="ms-rarity-icon">💚</span>
        <div class="ms-rarity-name">Incomum</div>
        <div class="ms-rarity-example">Pokémon raros</div>
      </div>

      <div class="ms-rarity-card" style="
        --ms-r-border: rgba(58,140,255,0.25);
        --ms-r-bg:     rgba(58,140,255,0.04);
        --ms-r-accent: linear-gradient(90deg,transparent,rgba(58,140,255,0.55),transparent);
        --ms-r-color:  rgba(100,170,255,0.9);
        --ms-r-glow:   rgba(58,140,255,0.25)">
        <span class="ms-rarity-icon">💙</span>
        <div class="ms-rarity-name">Rara</div>
        <div class="ms-rarity-example">Pokémon especiais</div>
      </div>

      <div class="ms-rarity-card" style="
        --ms-r-border: rgba(150,80,255,0.25);
        --ms-r-bg:     rgba(150,80,255,0.04);
        --ms-r-accent: linear-gradient(90deg,transparent,rgba(150,80,255,0.55),transparent);
        --ms-r-color:  rgba(180,120,255,0.9);
        --ms-r-glow:   rgba(150,80,255,0.25)">
        <span class="ms-rarity-icon">💜</span>
        <div class="ms-rarity-name">Épica</div>
        <div class="ms-rarity-example">Semi-lendários</div>
      </div>

      <div class="ms-rarity-card" style="
        --ms-r-border: rgba(255,200,0,0.3);
        --ms-r-bg:     rgba(255,200,0,0.05);
        --ms-r-accent: linear-gradient(90deg,transparent,rgba(255,200,0,0.65),transparent);
        --ms-r-color:  rgba(255,220,80,0.95);
        --ms-r-glow:   rgba(255,200,0,0.3)">
        <span class="ms-rarity-icon">💛</span>
        <div class="ms-rarity-name">Lendária</div>
        <div class="ms-rarity-example">Ex: Mew</div>
      </div>

    </div>

    <!-- Evento de Lançamento -->
    <div class="ms-event-banner">
      <div class="ms-event-header">
        <span class="ms-event-icon">🎉</span>
        <div>
          <div class="ms-event-title">Bônus de Lançamento</div>
          <div class="ms-event-sub">24/07/2025 23:59 → 03/08/2025 23:59</div>
        </div>
      </div>
      <div class="ms-event-rows">
        <div class="ms-event-row">
          <div class="ms-event-row-dot"></div>
          <div class="ms-event-row-text">
            <strong>Drop Dobrado:</strong> durante o período promocional, a chance de dropar
            a Medal Box nos Pokémon de Hoenn é <strong>2×</strong>.
          </div>
        </div>
        <div class="ms-event-row">
          <div class="ms-event-row-dot"></div>
          <div class="ms-event-row-text">
            Aproveite o evento para acumular o máximo de caixas possível!
          </div>
        </div>
      </div>
    </div>

    <!-- Booster Diamond Shop -->
    <div class="ms-booster">
      <div class="ms-booster-header">
        <span class="ms-booster-icon">💎</span>
        <div>
          <div class="ms-booster-title">Booster Especial — Diamond Shop</div>
          <div class="ms-booster-sub">Disponível no mesmo período promocional</div>
        </div>
      </div>
      <div class="ms-event-rows">
        <div class="ms-event-row">
          <div class="ms-event-row-dot" style="background:#c8a0ff;box-shadow:0 0 6px rgba(200,160,255,0.5)"></div>
          <div class="ms-event-row-text" style="color:rgba(255,255,255,0.5)">
            Contém <strong style="color:#c8a0ff">30 Medal Boxes</strong> — todas <strong style="color:#c8a0ff">Unique</strong>.
          </div>
        </div>
        <div class="ms-event-row">
          <div class="ms-event-row-dot" style="background:#c8a0ff;box-shadow:0 0 6px rgba(200,160,255,0.5)"></div>
          <div class="ms-event-row-text" style="color:rgba(255,255,255,0.5)">
            Todas as medalhas recebidas desse Booster serão <strong style="color:#c8a0ff">Unique</strong>.
          </div>
        </div>
        <div class="ms-event-row">
          <div class="ms-event-row-dot" style="background:#c8a0ff;box-shadow:0 0 6px rgba(200,160,255,0.5)"></div>
          <div class="ms-event-row-text" style="color:rgba(255,255,255,0.5)">
            Limite de <strong style="color:#c8a0ff">1 compra por personagem</strong>.
          </div>
        </div>
      </div>
      <div class="ms-booster-tags">
        <div class="ms-booster-tag"><span>📦</span> 30 Boxes</div>
        <div class="ms-booster-tag"><span>✨</span> All Unique</div>
        <div class="ms-booster-tag"><span>👤</span> 1 / Personagem</div>
        <div class="ms-booster-tag"><span>⏳</span> Tempo Limitado</div>
      </div>
    </div>

    <!-- Resumo rápido -->
    <div class="ms-section-label">📋 Resumo Rápido</div>
    <div class="ms-summary">
      <div class="ms-summary-title">Pontos-chave</div>
      <ul class="ms-summary-list">
        <li><strong>Lançamento:</strong> 24/07/2025 às 23:59</li>
        <li><strong>Drops:</strong> Pokémon de Hoenn → Medal Box → Bronze (Gen 1)</li>
        <li><strong>Desbloqueio:</strong> 100 XP para atingir Nível 1 e usar a medalha</li>
        <li><strong>Raridades:</strong> Comum → Incomum → Rara → Épica → Lendária</li>
        <li><strong>Evento:</strong> Drop 2× até 03/08/2025 às 23:59</li>
        <li><strong>Booster Diamond Shop:</strong> 30 Unique Boxes — 1 por personagem</li>
        <li><strong>Requisito:</strong> Level 350+</li>
      </ul>
    </div>

    <!-- Aviso de balanceamento -->
    <div class="ms-balance-notice">
      <span class="ms-balance-icon">⚠️</span>
      <div class="ms-balance-text">
        <strong>Nota sobre Balanceamento:</strong> Os valores dos Buffs podem ser ajustados
        ao longo do tempo para fins de balanceamento. O <strong>tipo dos buffs NÃO SERÁ ALTERADO</strong>
        após o lançamento. Os valores exibidos no vídeo são fictícios e usados apenas em testes internos.
      </div>
    </div>

    <!-- Divisor antes do vídeo -->
    <div class="ms-divider" style="margin-top:32px">
      <div class="ms-divider-line"></div>
      <div class="ms-divider-gem"></div>
      <div class="ms-divider-gem" style="background:rgba(140,100,255,0.6);box-shadow:0 0 8px rgba(140,100,255,0.4)"></div>
      <div class="ms-divider-gem"></div>
      <div class="ms-divider-line" style="background:linear-gradient(90deg,transparent,rgba(205,127,50,0.25))"></div>
    </div>

    <!-- Vídeo de demonstração — ao final -->
    <div class="ms-video-section">
      <div class="ms-section-label">📽️ Demonstração em Vídeo</div>
      <div class="ms-video-wrap">
        <video
          src="https://i.imgur.com/nJo2E9y.mp4"
          controls
          muted
          playsinline
          preload="metadata"
        ></video>
        <div class="ms-video-overlay-label">Preview Interno</div>
      </div>
    </div>

  `;

  tabWiki.appendChild(panel);
};

})();