/* ================================================================
   quest-modal.js
   Substitui o sistema accordion de quests por:
   - Grid de cards clicáveis (lista compacta)
   - Modal overlay com o conteúdo completo da quest

   Carregue APÓS app.js e wiki-nav.js no index.html:
     <script src="quest-modal.js"></script>
================================================================ */
(function () {

/* ── Injeta CSS ──────────────────────────────────────────────── */
(function injectCSS() {
  if (document.getElementById('quest-modal-css')) return;
  var s = document.createElement('style');
  s.id = 'quest-modal-css';
  s.textContent = `

/* ══════════════════════════════════════════
   GRID DE CARDS DE QUEST
══════════════════════════════════════════ */
#quests-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  padding: 4px 2px 32px;
}

/* Card individual */
.qcard {
  position: relative;
  background: linear-gradient(145deg, rgba(16,24,48,0.97) 0%, rgba(8,12,28,0.99) 100%);
  border: 1px solid rgba(255,210,80,0.10);
  border-radius: 16px;
  padding: 20px 20px 16px;
  cursor: pointer;
  transition: border-color 0.22s, box-shadow 0.22s, transform 0.18s;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 130px;
}

/* Linha topo colorida */
.qcard::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, rgba(255,210,80,0.6) 40%, rgba(255,180,40,0.4) 70%, transparent 100%);
  border-radius: 16px 16px 0 0;
  opacity: 0;
  transition: opacity 0.22s;
}

/* Glow de fundo ao hover */
.qcard::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background: radial-gradient(ellipse at 30% 0%, rgba(255,210,80,0.05) 0%, transparent 65%);
  opacity: 0;
  transition: opacity 0.22s;
  pointer-events: none;
}

.qcard:hover {
  border-color: rgba(255,210,80,0.32);
  box-shadow: 0 6px 36px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,210,80,0.06);
  transform: translateY(-2px);
}
.qcard:hover::before,
.qcard:hover::after { opacity: 1; }

.qcard:active { transform: translateY(0px); }

/* Linha 1: número + ícone + nome */
.qcard-head {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  z-index: 1;
}

.qcard-num {
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  font-weight: 700;
  color: rgba(255,210,80,0.28);
  letter-spacing: 1px;
  min-width: 18px;
  flex-shrink: 0;
}

.qcard-icon {
  font-size: 24px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 8px rgba(255,210,80,0.35));
  line-height: 1;
}

.qcard-name {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 14px;
  font-weight: 700;
  color: #f0d060;
  letter-spacing: 0.5px;
  flex: 1;
  text-shadow: 0 0 18px rgba(255,210,80,0.18);
  line-height: 1.3;
}

/* Linha 2: badges */
.qcard-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}

.qcard-level {
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  font-weight: 700;
  color: #60aaff;
  background: rgba(96,170,255,0.09);
  border: 1px solid rgba(96,170,255,0.22);
  border-radius: 20px;
  padding: 2px 9px;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.qcard-reward-pill {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,210,80,0.7);
  background: rgba(255,210,80,0.06);
  border: 1px solid rgba(255,210,80,0.14);
  border-radius: 20px;
  padding: 2px 9px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
  letter-spacing: 0.2px;
}

/* Linha 3: seta "ver guia" */
.qcard-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: auto;
  position: relative;
  z-index: 1;
  gap: 5px;
}

.qcard-cta {
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: rgba(255,210,80,0.45);
  display: flex;
  align-items: center;
  gap: 5px;
  transition: color 0.18s;
}

.qcard:hover .qcard-cta {
  color: rgba(255,210,80,0.85);
}

.qcard-cta-arrow {
  width: 14px; height: 14px;
  transition: transform 0.18s;
}
.qcard:hover .qcard-cta-arrow {
  transform: translateX(3px);
}

/* ══════════════════════════════════════════
   MODAL OVERLAY
══════════════════════════════════════════ */
#quest-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(2,5,16,0.82);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.28s cubic-bezier(0.16,1,0.3,1);
}

#quest-modal-overlay.qmo-open {
  opacity: 1;
  pointer-events: all;
}

/* Caixa do modal */
#quest-modal-box {
  position: relative;
  width: 100%;
  max-width: 960px;
  max-height: 90vh;
  background: linear-gradient(160deg, rgba(14,22,50,0.99) 0%, rgba(6,10,26,1) 100%);
  border: 1px solid rgba(255,210,80,0.18);
  border-radius: 22px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 24px 80px rgba(0,0,0,0.7),
    0 0 0 1px rgba(255,210,80,0.06),
    inset 0 1px 0 rgba(255,210,80,0.08);
  transform: translateY(24px) scale(0.97);
  transition: transform 0.32s cubic-bezier(0.16,1,0.3,1);
}

#quest-modal-overlay.qmo-open #quest-modal-box {
  transform: translateY(0) scale(1);
}

/* Linha decorativa topo */
#quest-modal-box::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255,210,80,0.7) 30%, rgba(255,180,40,0.5) 60%, transparent);
  border-radius: 22px 22px 0 0;
}

/* ── Header do modal ── */
.qmo-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 22px 26px 18px;
  flex-shrink: 0;
  position: relative;
  border-bottom: 1px solid rgba(255,210,80,0.08);
}

.qmo-header-icon {
  font-size: 36px;
  filter: drop-shadow(0 0 14px rgba(255,210,80,0.5));
  flex-shrink: 0;
  line-height: 1;
}

.qmo-header-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.qmo-header-label {
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: rgba(255,210,80,0.35);
}

.qmo-header-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: clamp(16px, 3vw, 22px);
  font-weight: 700;
  color: #f0d060;
  text-shadow: 0 0 30px rgba(255,210,80,0.25);
  letter-spacing: 0.5px;
  line-height: 1.2;
}

.qmo-header-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 2px;
}

/* Botão fechar */
.qmo-close {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.18s, border-color 0.18s, color 0.18s;
}
.qmo-close:hover {
  background: rgba(255,80,80,0.12);
  border-color: rgba(255,80,80,0.3);
  color: rgba(255,120,120,0.9);
}

/* ── Corpo scrollável ── */
.qmo-body {
  overflow-y: auto;
  flex: 1;
  padding: 24px 26px 32px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  /* Scrollbar customizada */
  scrollbar-width: thin;
  scrollbar-color: rgba(255,210,80,0.2) transparent;
}
.qmo-body::-webkit-scrollbar { width: 5px; }
.qmo-body::-webkit-scrollbar-track { background: transparent; }
.qmo-body::-webkit-scrollbar-thumb {
  background: rgba(255,210,80,0.2);
  border-radius: 10px;
}

/* Reutiliza as classes de seção do quest-rich-css (já existentes) */
/* As classes .quest-section, .quest-section-title, etc já estão injetadas pelo app.js */

/* ── Imagens dentro do modal: normaliza os inline styles do app.js ── */

/* Grid de imagens lado a lado (div com display:flex gerado pelo app.js) */
.qmo-body div[style*="display:flex"] {
  display: grid !important;
  grid-template-columns: 1fr 1fr !important;
  gap: 10px !important;
  flex-wrap: unset !important;
}

/* Cada imagem no grid ocupa 100% da célula, sem min/max-width inline */
.qmo-body div[style*="display:flex"] img,
.qmo-body div[style*="display:flex"] .quest-reward-img {
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  flex: unset !important;
  height: auto;
  object-fit: cover;
  border-radius: 10px;
  display: block;
  margin-top: 0 !important;
}

/* Imagem única (não em grid) — ocupa full width com altura limitada */
.qmo-body .quest-reward-img {
  width: 100%;
  max-width: 100%;
  max-height: 420px;
  object-fit: contain;
  background: rgba(0,0,0,0.3);
  border-radius: 12px;
  margin-top: 10px;
  display: block;
}

/* Imagens no grid: altura uniforme e objeto ajustado */
.qmo-body div[style*="display:flex"] img {
  max-height: 360px;
  object-fit: cover;
}

/* Responsivo: 1 coluna em telas pequenas */
@media (max-width: 540px) {
  .qmo-body div[style*="display:flex"] {
    grid-template-columns: 1fr !important;
  }
}

/* ── Responsivo mobile ── */
@media (max-width: 600px) {
  #quest-modal-overlay { padding: 0; align-items: flex-end; }
  #quest-modal-box {
    max-height: 92vh;
    border-radius: 20px 20px 0 0;
    transform: translateY(60px);
  }
  #quest-modal-overlay.qmo-open #quest-modal-box { transform: translateY(0); }
  .qmo-header { padding: 18px 18px 14px; }
  .qmo-body { padding: 18px 18px 28px; }
  #quests-grid { grid-template-columns: 1fr; }
}

/* ── Empty state ── */
.qgrid-empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 48px 20px;
  color: rgba(255,255,255,0.2);
}
.qgrid-empty-icon { font-size: 36px; opacity: 0.5; }
.qgrid-empty-label {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 14px;
  letter-spacing: 0.5px;
}
  `;
  document.head.appendChild(s);
})();

/* ── Cria o overlay do modal no DOM ─────────────────────────── */
function buildModal() {
  if (document.getElementById('quest-modal-overlay')) return;
  var overlay = document.createElement('div');
  overlay.id = 'quest-modal-overlay';
  overlay.innerHTML = `
    <div id="quest-modal-box">
      <div class="qmo-header">
        <div class="qmo-header-icon" id="qmo-icon"></div>
        <div class="qmo-header-text">
          <div class="qmo-header-label">Quest · Guia completo</div>
          <div class="qmo-header-title" id="qmo-title"></div>
          <div class="qmo-header-badges" id="qmo-badges"></div>
        </div>
        <button class="qmo-close" onclick="window._questModalClose()" aria-label="Fechar">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="qmo-body" id="qmo-body"></div>
    </div>
  `;
  /* Fecha ao clicar fora da caixa */
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) window._questModalClose();
  });
  document.body.appendChild(overlay);
}

/* ── Abre o modal para uma quest ────────────────────────────── */
window._questModalOpen = function(idx) {
  var quest = RAW_QUESTS[idx];
  if (!quest) return;

  buildModal();

  /* Preenche header */
  document.getElementById('qmo-icon').innerHTML  = quest.icon || '📜';
  document.getElementById('qmo-title').textContent = quest.name;

  var badges = '';
  if (quest.level) badges += '<span class="quest-level-badge">LVL ' + quest.level + '+</span>';
  if (quest.reward) badges += '<span class="qcard-reward-pill">🎁 ' + quest.reward + '</span>';
  document.getElementById('qmo-badges').innerHTML = badges;

  /* Constrói o corpo (reutiliza a lógica já existente do renderQuests) */
  document.getElementById('qmo-body').innerHTML = buildQuestBody(quest);

  /* Abre com animação */
  var overlay = document.getElementById('quest-modal-overlay');
  overlay.classList.add('qmo-open');
  document.body.style.overflow = 'hidden';
};

/* ── Fecha o modal ──────────────────────────────────────────── */
window._questModalClose = function() {
  var overlay = document.getElementById('quest-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('qmo-open');
  document.body.style.overflow = '';
};

/* Fecha com Escape */
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') window._questModalClose();
});

/* ── Monta o HTML interno da quest (mesmo conteúdo do accordion) */
function buildQuestBody(quest) {
  var html = '';

  // ── Recompensa
  if (quest.reward) {
    var rewardImgHtml = '';
    if (quest.rewardImg !== undefined) {
      rewardImgHtml = quest.rewardImg
        ? '<img class="quest-reward-img" src="' + quest.rewardImg + '" alt="Recompensa" loading="lazy" />'
        : '<div class="quest-img-placeholder">📷 Imagem da recompensa — substitua <code>rewardImg: null</code> pela URL</div>';
    }
    html +=
      '<div class="quest-section">' +
        '<div class="quest-section-title"><span class="quest-section-icon">🎁</span> Recompensa</div>' +
        '<div class="quest-reward-box">' +
          '<div class="quest-reward-name">' + (quest.rewardImg !== undefined ? '🏆' : '🍀') + ' ' + quest.reward + '</div>' +
          (quest.rewardDesc ? '<div class="quest-reward-desc">' + quest.rewardDesc + '</div>' : '') +
          rewardImgHtml +
        '</div>' +
      '</div>';
  }

  // ── Pré-requisito
  if (quest.level) {
    html +=
      '<div class="quest-section">' +
        '<div class="quest-section-title"><span class="quest-section-icon">📋</span> Pré-requisito</div>' +
        '<div class="quest-info-box">Level mínimo: <strong>' + quest.level + '</strong></div>' +
      '</div>';
  }

  // ── Informações (ficha)
  if (quest.info && quest.info.length) {
    var rows = quest.info.map(function(row) {
      return '<div class="quest-info-row">' +
        '<span class="quest-info-row-label">' + row.label + '</span>' +
        '<span class="quest-info-row-value">' + row.value + '</span>' +
      '</div>';
    }).join('');
    html +=
      '<div class="quest-section">' +
        '<div class="quest-section-title"><span class="quest-section-icon">📋</span> Informações</div>' +
        '<div class="quest-info-grid">' + rows + '</div>' +
      '</div>';
  }

  // ── Início
  if (quest.start) {
    html +=
      '<div class="quest-section">' +
        '<div class="quest-section-title"><span class="quest-section-icon">📍</span> Início</div>' +
        '<div class="quest-info-box">' + quest.start + '</div>' +
      '</div>';
  }

  // ── Drop
  if (quest.drop) {
    html +=
      '<div class="quest-section">' +
        '<div class="quest-section-title"><span class="quest-section-icon">⚔️</span> Drop</div>' +
        '<div class="quest-info-box">' + quest.drop + '</div>' +
      '</div>';
  }

  // ── Partes
  if (quest.parts && quest.parts.length) {
    quest.parts.forEach(function(part) {
      var tableHtml = '';
      if (part.drops && part.drops.length) {
        var dropRows = part.drops.map(function(d) {
          var locHtml = d.locationImg
            ? '<a class="quest-loc-btn" href="' + d.locationImg + '" target="_blank">📍 VER</a>'
            : '<span class="quest-loc-placeholder">a definir</span>';
          var sourceHtml = d.source
            ? 'Drop de <strong>' + d.source + '</strong>'
            : '<span style="color:rgba(255,255,255,0.25)">—</span>';
          return '<tr>' +
            '<td class="quest-drop-qty">×' + d.qty + '</td>' +
            '<td class="quest-drop-item">' + d.item + '</td>' +
            '<td class="quest-drop-source">' + sourceHtml + '</td>' +
            '<td class="quest-drop-loc">' + locHtml + '</td>' +
          '</tr>';
        }).join('');
        tableHtml =
          '<table class="quest-drop-table">' +
            '<thead><tr>' +
              '<th>QTD</th><th>ITEM</th><th>FONTE</th><th style="text-align:right">LOCAL</th>' +
            '</tr></thead>' +
            '<tbody>' + dropRows + '</tbody>' +
          '</table>';
      }

      var locImgHtml = '';
      if (part.locationImg !== undefined && part.locationImg !== null) {
        locImgHtml = '<img class="quest-reward-img" src="' + part.locationImg + '" alt="Localização" loading="lazy" />';
      } else if (part.locationImg === null) {
        locImgHtml = '<div class="quest-img-placeholder">📷 Imagem desta etapa — substitua <code>locationImg: null</code> pela URL</div>';
      }

      html +=
        '<div class="quest-section">' +
          '<div class="quest-section-title">' +
            '<span class="quest-section-icon">' + (part.icon || '📦') + '</span> ' + part.title +
          '</div>' +
          (part.intro ? '<div class="quest-info-box" style="margin-bottom:0">' + part.intro + '</div>' : '') +
          locImgHtml +
          tableHtml +
          (part.delivery ? '<div class="quest-delivery-note">✅ ' + part.delivery + '</div>' : '') +
        '</div>';
    });
  }

  // ── Puzzle
  if (quest.puzzle || quest.puzzleImg) {
    var puzzleImgHtml = '';
    if (quest.puzzleImg) {
      puzzleImgHtml =
        '<div class="quest-puzzle-img-wrap">' +
          '<span class="quest-puzzle-spoiler-label">⚠ SPOILER</span>' +
          '<img src="' + quest.puzzleImg + '" alt="Spoiler do Puzzle" loading="lazy" />' +
        '</div>';
    }
    html +=
      '<div class="quest-section">' +
        '<div class="quest-section-title"><span class="quest-section-icon">🧩</span> Puzzle</div>' +
        (quest.puzzle ? '<div class="quest-info-box">' + quest.puzzle + '</div>' : '') +
        puzzleImgHtml +
      '</div>';
  }

  // ── Passo a Passo
  if (quest.steps && quest.steps.length) {
    var stepsHtml = quest.steps.map(function(step, si) {
      return '<div class="quest-step">' +
        '<span class="quest-step-num">0' + (si + 1) + '</span>' +
        '<span class="quest-step-icon">' + step.icon + '</span>' +
        '<span class="quest-step-text">' + step.text + '</span>' +
      '</div>';
    }).join('');
    html +=
      '<div class="quest-section">' +
        '<div class="quest-section-title"><span class="quest-section-icon">📌</span> Passo a Passo</div>' +
        '<div class="quest-steps">' + stepsHtml + '</div>' +
      '</div>';
  }

  // ── Observações
  if (quest.notes) {
    html +=
      '<div class="quest-section">' +
        '<div class="quest-section-title"><span class="quest-section-icon">💡</span> Observações</div>' +
        '<div class="quest-notes-box">' + quest.notes + '</div>' +
      '</div>';
  }

  return html;
}

/* ══════════════════════════════════════════
   OVERRIDE do renderQuests — cards no grid
══════════════════════════════════════════ */
window.renderQuests = function() {
  var grid = document.getElementById('quests-grid');
  if (!grid) return;

  var q = '';
  var searchEl = document.getElementById('quests-search');
  if (searchEl) q = searchEl.value.toLowerCase().trim();

  var filtered = RAW_QUESTS.filter(function(quest, idx) {
    quest._filteredIdx = idx; // guarda índice original
    if (!q) return true;
    return quest.name.toLowerCase().includes(q) ||
           (quest.reward && quest.reward.toLowerCase().includes(q)) ||
           (quest.description && quest.description.toLowerCase().includes(q));
  });

  var countLabel = document.getElementById('quests-count-label');
  if (countLabel) countLabel.textContent = filtered.length + ' quests';

  if (!filtered.length) {
    grid.innerHTML =
      '<div class="qgrid-empty">' +
        '<div class="qgrid-empty-icon">📜</div>' +
        '<div class="qgrid-empty-label">Nenhuma quest encontrada.</div>' +
      '</div>';
    return;
  }

  grid.innerHTML = filtered.map(function(quest, i) {
    /* Descobre o índice original no RAW_QUESTS */
    var origIdx = RAW_QUESTS.indexOf(quest);

    var levelBadge = quest.level
      ? '<span class="qcard-level">LVL ' + quest.level + '+</span>'
      : '';

    var rewardPill = quest.reward
      ? '<span class="qcard-reward-pill">🎁 ' + quest.reward + '</span>'
      : '';

    return (
      '<div class="qcard" onclick="window._questModalOpen(' + origIdx + ')" tabindex="0" ' +
        'onkeydown="if(event.key===\'Enter\'||event.key===\' \') window._questModalOpen(' + origIdx + ')">' +
        '<div class="qcard-head">' +
          '<span class="qcard-num">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span class="qcard-icon">' + (quest.icon || '📜') + '</span>' +
          '<span class="qcard-name">' + quest.name + '</span>' +
        '</div>' +
        (levelBadge || rewardPill
          ? '<div class="qcard-badges">' + levelBadge + rewardPill + '</div>'
          : '') +
        '<div class="qcard-footer">' +
          '<span class="qcard-cta">' +
            'Ver guia' +
            '<svg class="qcard-cta-arrow" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
              '<path d="M1 7h12M8 2l5 5-5 5"/>' +
            '</svg>' +
          '</span>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  /* Pre-cria o overlay para ter animação suave na 1ª abertura */
  buildModal();
};

/* ── Depreca toggleQuestRow (não usado mais) */
window.toggleQuestRow = function() {};

})();