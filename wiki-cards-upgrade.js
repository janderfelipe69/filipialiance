// =====================================================================
// WIKI CARDS UPGRADE v2 — grid visual de cards refinado
// Substitui renderWiki() e recria a barra de controles da wiki de itens
// Carregue APÓS app.js e item-card-popup.js no index.html
// =====================================================================

(function () {

  // ── Injeção de estilos ──────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `

/* ── Barra de controles da wiki ── */
.wiki-controls-v2 {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 0 18px;
  flex-wrap: wrap;
}

/* Campo de busca */
.wiki-search-field {
  display: flex;
  align-items: center;
  gap: 9px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(58,140,255,0.16);
  border-radius: 12px;
  padding: 0 14px;
  height: 40px;
  color: rgba(255,255,255,0.3);
  transition: border-color .2s, background .2s, box-shadow .2s;
  flex: 1;
  min-width: 180px;
  max-width: 340px;
}
.wiki-search-field:focus-within {
  border-color: rgba(96,170,255,0.5);
  background: rgba(58,140,255,0.06);
  box-shadow: 0 0 0 3px rgba(58,140,255,0.08);
  color: rgba(96,170,255,0.8);
}
.wiki-search-field svg { flex-shrink: 0; transition: color .2s; }
.wiki-search-field input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #dde8ff;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13.5px;
  letter-spacing: 0.3px;
}
.wiki-search-field input::placeholder {
  color: rgba(255,255,255,0.22);
}

/* Botão limpar busca */
.wiki-search-clear {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.25);
  transition: color .15s, background .15s;
  flex-shrink: 0;
  font-size: 14px;
  line-height: 1;
  opacity: 0;
  pointer-events: none;
}
.wiki-search-field.has-value .wiki-search-clear {
  opacity: 1;
  pointer-events: auto;
}
.wiki-search-clear:hover {
  color: #fff;
  background: rgba(255,255,255,0.1);
}

/* Pills de filtro de tier */
.wiki-tier-pills {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.wiki-tier-pill {
  font-family: var(--font-mono, monospace);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 1.1px;
  text-transform: uppercase;
  padding: 5px 11px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.10);
  color: rgba(255,255,255,0.35);
  background: rgba(255,255,255,0.03);
  cursor: pointer;
  transition: color .18s, border-color .18s, background .18s, transform .15s, box-shadow .18s;
  user-select: none;
  white-space: nowrap;
}
.wiki-tier-pill:hover {
  color: rgba(255,255,255,0.7);
  border-color: rgba(255,255,255,0.22);
  background: rgba(255,255,255,0.06);
}
.wiki-tier-pill:active { transform: scale(0.95); }

.wiki-tier-pill[data-tier="all"].active {
  color: #fff;
  border-color: rgba(58,140,255,0.55);
  background: rgba(58,140,255,0.14);
  box-shadow: 0 0 12px rgba(58,140,255,0.2);
}
.wiki-tier-pill[data-tier="t1"].active  { color:#a0d4ff; border-color:rgba(160,212,255,0.45); background:rgba(160,212,255,0.1); box-shadow:0 0 12px rgba(160,212,255,0.15); }
.wiki-tier-pill[data-tier="t2"].active  { color:#66e5a0; border-color:rgba(102,229,160,0.45); background:rgba(102,229,160,0.1); box-shadow:0 0 12px rgba(102,229,160,0.15); }
.wiki-tier-pill[data-tier="t3"].active  { color:#ffd166; border-color:rgba(255,209,102,0.45); background:rgba(255,209,102,0.1); box-shadow:0 0 12px rgba(255,209,102,0.15); }
.wiki-tier-pill[data-tier="t4"].active  { color:#ff9f43; border-color:rgba(255,159,67,0.45);  background:rgba(255,159,67,0.1);  box-shadow:0 0 12px rgba(255,159,67,0.15);  }
.wiki-tier-pill[data-tier="t5"].active  { color:#ff6b6b; border-color:rgba(255,107,107,0.45); background:rgba(255,107,107,0.1); box-shadow:0 0 12px rgba(255,107,107,0.15); }
.wiki-tier-pill[data-tier="hard"].active{ color:#ff4a7d; border-color:rgba(255,74,125,0.45);  background:rgba(255,74,125,0.1);  box-shadow:0 0 12px rgba(255,74,125,0.15);  }
.wiki-tier-pill[data-tier="mark"].active{ color:#d4a0ff; border-color:rgba(212,160,255,0.45); background:rgba(212,160,255,0.1); box-shadow:0 0 12px rgba(212,160,255,0.15); }
.wiki-tier-pill[data-tier="shiny"].active{ color:#ffe680; border-color:rgba(255,230,128,0.45); background:rgba(255,230,128,0.1); box-shadow:0 0 12px rgba(255,230,128,0.15); }

/* Contador de resultados */
.wiki-count-v2 {
  margin-left: auto;
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  font-weight: 700;
  color: rgba(255,255,255,0.22);
  letter-spacing: 0.8px;
  white-space: nowrap;
  padding-right: 2px;
}

/* Separador de linha */
.wiki-controls-separator {
  width: 1px;
  height: 22px;
  background: rgba(255,255,255,0.08);
  flex-shrink: 0;
}

/* ── Grid de cards ── */
#wiki-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  padding: 2px 0 48px;
}

/* ── Card individual ── */
.wcard {
  position: relative;
  background: rgba(10,17,35,0.97);
  border: 1px solid rgba(58,140,255,0.11);
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition:
    transform 0.22s cubic-bezier(0.16,1,0.3,1),
    border-color 0.2s,
    box-shadow 0.2s,
    background 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 12px 14px;
  gap: 8px;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* Brilho sutil no topo ao hover */
.wcard::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(ellipse at 50% -10%, var(--wcard-glow, rgba(58,140,255,0.12)) 0%, transparent 65%);
  opacity: 0;
  transition: opacity 0.25s;
  pointer-events: none;
}
.wcard:hover::after { opacity: 1; }

.wcard:hover {
  transform: translateY(-3px) scale(1.015);
  border-color: rgba(var(--wcard-rgb, 58,140,255), 0.38);
  box-shadow:
    0 0 22px rgba(var(--wcard-rgb, 58,140,255), 0.14),
    0 8px 28px rgba(0,0,0,0.55),
    inset 0 1px 0 rgba(255,255,255,0.06);
  background: rgba(12,20,40,0.98);
}
.wcard:active {
  transform: translateY(-1px) scale(0.985);
  transition-duration: 0.07s;
}

/* Linha de cor no topo (tier accent) */
.wcard-accent {
  position: absolute;
  top: 0; left: 12%; right: 12%;
  height: 1.5px;
  border-radius: 0 0 4px 4px;
  background: linear-gradient(90deg, transparent, var(--wcard-color, #3a8cff), transparent);
  opacity: 0.55;
  transition: opacity 0.2s, left 0.2s, right 0.2s;
}
.wcard:hover .wcard-accent {
  opacity: 1;
  left: 6%;
  right: 6%;
}

/* Imagem */
.wcard-img-box {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  position: relative;
}
.wcard:hover .wcard-img-box {
  background: rgba(var(--wcard-rgb, 58,140,255), 0.07);
  border-color: rgba(var(--wcard-rgb, 58,140,255), 0.2);
  box-shadow: 0 0 14px rgba(var(--wcard-rgb, 58,140,255), 0.12);
}
.wcard-img-box img {
  width: 54px;
  height: 54px;
  object-fit: contain;
  image-rendering: pixelated;
  transition: transform 0.28s cubic-bezier(0.16,1,0.3,1);
}
.wcard:hover .wcard-img-box img { transform: scale(1.1); }
.wcard-img-placeholder {
  font-size: 28px;
  line-height: 1;
  opacity: 0.5;
}

/* Nome */
.wcard-name {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 10.5px;
  font-weight: 700;
  color: rgba(221,232,255,0.92);
  letter-spacing: 0.3px;
  text-align: center;
  line-height: 1.38;
  word-break: break-word;
  max-width: 100%;
  transition: color 0.2s;
}
.wcard:hover .wcard-name { color: #fff; }

/* Tier badge */
.wcard-badge {
  font-family: var(--font-mono, monospace);
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.3);
  background: rgba(255,255,255,0.03);
  transition: opacity 0.2s;
}
.wcard-badge.tier-t1  { color:#a0d4ff; border-color:rgba(160,212,255,0.25); background:rgba(160,212,255,0.06); }
.wcard-badge.tier-t2  { color:#66e5a0; border-color:rgba(102,229,160,0.25); background:rgba(102,229,160,0.06); }
.wcard-badge.tier-t3  { color:#ffd166; border-color:rgba(255,209,102,0.25); background:rgba(255,209,102,0.06); }
.wcard-badge.tier-t4  { color:#ff9f43; border-color:rgba(255,159,67,0.25);  background:rgba(255,159,67,0.06);  }
.wcard-badge.tier-t5  { color:#ff6b6b; border-color:rgba(255,107,107,0.25); background:rgba(255,107,107,0.06); }
.wcard-badge.tier-hard{ color:#ff4a7d; border-color:rgba(255,74,125,0.25);  background:rgba(255,74,125,0.06);  }
.wcard-badge.tier-mark{ color:#d4a0ff; border-color:rgba(212,160,255,0.25); background:rgba(212,160,255,0.06); }
.wcard-badge.tier-shiny{color:#ffe680; border-color:rgba(255,230,128,0.25); background:rgba(255,230,128,0.06); }

/* Contador de Pokémon */
.wcard-sources {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 10px;
  font-weight: 600;
  color: rgba(255,255,255,0.2);
  letter-spacing: 0.4px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s;
}
.wcard:hover .wcard-sources { color: rgba(var(--wcard-rgb, 58,140,255), 0.75); }

/* Preço */
.wcard-price {
  font-family: var(--font-mono, monospace);
  font-size: 9.5px;
  font-weight: 700;
  color: rgba(var(--wcard-rgb, 58,140,255), 0.7);
  letter-spacing: 0.3px;
  transition: color 0.2s;
}
.wcard:hover .wcard-price { color: var(--wcard-color, #3a8cff); }

/* Indicador de hover (canto inferior direito) */
.wcard-hint {
  position: absolute;
  bottom: 8px;
  right: 9px;
  opacity: 0;
  transform: scale(0.7) rotate(-10deg);
  transition: opacity 0.18s, transform 0.18s;
  color: rgba(var(--wcard-rgb, 58,140,255), 0.6);
}
.wcard:hover .wcard-hint {
  opacity: 1;
  transform: scale(1) rotate(0deg);
}

/* Empty state */
.wiki-no-results {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 72px 20px;
  color: rgba(255,255,255,0.2);
  font-family: var(--font-body, sans-serif);
  font-size: 13px;
  letter-spacing: 0.5px;
}
.wiki-no-results-icon {
  font-size: 36px;
  opacity: 0.25;
}

/* Animação de entrada dos cards */
@keyframes wcardIn {
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.wcard {
  animation: wcardIn 0.28s cubic-bezier(0.16,1,0.3,1) both;
}

/* Responsivo */
@media (max-width: 640px) {
  #wiki-grid {
    grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
    gap: 8px;
  }
  .wcard {
    padding: 14px 10px 12px;
    gap: 7px;
  }
  .wcard-img-box { width: 56px; height: 56px; }
  .wcard-img-box img { width: 46px; height: 46px; }
  .wiki-controls-v2 { gap: 8px; padding: 10px 0 14px; }
  .wiki-search-field { max-width: 100%; }
  .wiki-count-v2 { display: none; }
}
  `;
  document.head.appendChild(style);

  // ── Mapa de tier → cor / rgb ───────────────────────────────────────
  const TIER_MAP = {
    t1:   { color: '#a0d4ff', rgb: '160,212,255' },
    t2:   { color: '#66e5a0', rgb: '102,229,160' },
    t3:   { color: '#ffd166', rgb: '255,209,102' },
    t4:   { color: '#ff9f43', rgb: '255,159,67'  },
    t5:   { color: '#ff6b6b', rgb: '255,107,107' },
    hard: { color: '#ff4a7d', rgb: '255,74,125'  },
    mark: { color: '#d4a0ff', rgb: '212,160,255' },
    shiny:{ color: '#ffe680', rgb: '255,230,128' },
  };
  const DEFAULT_TIER = { color: '#3a8cff', rgb: '58,140,255' };

  // ── Estado de filtro ───────────────────────────────────────────────
  let _activeTier = 'all';
  let _wikiSearchTimerInternal;

  // ── Injeta controles na wiki (substitui .wiki-controls existente) ──
  function injectWikiControls() {
    const container = document.getElementById('wiki-tab-itens');
    if (!container) return;

    // Remove controles antigos se existirem
    const oldControls = container.querySelector('.wiki-controls');
    if (oldControls) oldControls.remove();

    const tiers = [
      { key: 'all',   label: 'Todos' },
      { key: 't1',    label: 'T1'    },
      { key: 't2',    label: 'T2'    },
      { key: 't3',    label: 'T3'    },
      { key: 't4',    label: 'T4'    },
      { key: 't5',    label: 'T5'    },
      { key: 'hard',  label: 'Hard'  },
      { key: 'mark',  label: 'Mark'  },
      { key: 'shiny', label: 'Shiny' },
    ];

    const div = document.createElement('div');
    div.className = 'wiki-controls-v2';
    div.innerHTML = `
      <div class="wiki-search-field" id="wiki-search-field">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M10 10L13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <input
          type="text"
          id="wiki-search"
          placeholder="Buscar item ou Pokémon..."
          autocomplete="off"
          spellcheck="false"
        />
        <button class="wiki-search-clear" id="wiki-search-clear" title="Limpar">✕</button>
      </div>

      <div class="wiki-controls-separator"></div>

      <div class="wiki-tier-pills">
        ${tiers.map(t =>
          `<button class="wiki-tier-pill${t.key === 'all' ? ' active' : ''}" data-tier="${t.key}">${t.label}</button>`
        ).join('')}
      </div>

      <span class="wiki-count-v2" id="wiki-count-label">— itens</span>
    `;

    // Insere antes da wiki-wrap
    const wrap = container.querySelector('.wiki-wrap');
    if (wrap) {
      container.insertBefore(div, wrap);
    } else {
      container.prepend(div);
    }

    // Eventos de busca
    const input = div.querySelector('#wiki-search');
    const field = div.querySelector('#wiki-search-field');
    const clearBtn = div.querySelector('#wiki-search-clear');

    input.addEventListener('input', function () {
      field.classList.toggle('has-value', input.value.length > 0);
      clearTimeout(_wikiSearchTimerInternal);
      _wikiSearchTimerInternal = setTimeout(window.renderWiki, 140);
    });

    clearBtn.addEventListener('click', function () {
      input.value = '';
      field.classList.remove('has-value');
      input.focus();
      window.renderWiki();
    });

    // Eventos dos pills de tier
    div.querySelectorAll('.wiki-tier-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        div.querySelectorAll('.wiki-tier-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        _activeTier = pill.dataset.tier;
        window.renderWiki();
      });
    });
  }

  // ── renderWiki principal ───────────────────────────────────────────
  window.renderWiki = function () {
    const grid = document.getElementById('wiki-grid');
    if (!grid) return;

    const input = document.getElementById('wiki-search');
    const q = input ? input.value.toLowerCase().trim() : '';

    const wikiItems = (typeof buildWikiData === 'function') ? buildWikiData() : [];

    // ── Calcula quais tiers existem nos dados (com sources > 0) ───────
    const tiersWithData = new Set();
    wikiItems.forEach(function (item) {
      if (item.sources.length === 0) return;
      const itemData = (typeof items !== 'undefined')
        ? items.find(function (it) { return it.name.toLowerCase() === item.name.toLowerCase(); })
        : null;
      const tierKey = (itemData && itemData.tier) ? itemData.tier.toLowerCase() : '';
      if (tierKey) tiersWithData.add(tierKey);
    });

    // Mostra/esconde pills conforme os tiers que têm dados
    document.querySelectorAll('.wiki-tier-pill').forEach(function (pill) {
      const t = pill.dataset.tier;
      if (t === 'all') return; // "Todos" sempre visível
      const hasData = tiersWithData.has(t);
      pill.style.display = hasData ? '' : 'none';
      // Se o tier ativo sumiu dos dados, volta para "all"
      if (!hasData && _activeTier === t) {
        pill.classList.remove('active');
        _activeTier = 'all';
        const allPill = document.querySelector('.wiki-tier-pill[data-tier="all"]');
        if (allPill) allPill.classList.add('active');
      }
    });

    const filtered = wikiItems.filter(function (item) {
      if (item.sources.length === 0) return false;

      // Filtro de tier
      if (_activeTier !== 'all') {
        const itemData = (typeof items !== 'undefined')
          ? items.find(function (it) { return it.name.toLowerCase() === item.name.toLowerCase(); })
          : null;
        const tierKey = (itemData && itemData.tier) ? itemData.tier.toLowerCase() : '';
        if (tierKey !== _activeTier) return false;
      }

      // Filtro de busca
      if (!q) return true;
      return item.name.toLowerCase().includes(q) ||
             item.sources.some(function (s) { return s.toLowerCase().includes(q); });
    });

    // Atualiza contador
    const countEl = document.getElementById('wiki-count-label');
    if (countEl) countEl.textContent = filtered.length + ' itens';

    if (!filtered.length) {
      grid.innerHTML =
        '<div class="wiki-no-results">' +
          '<div class="wiki-no-results-icon">🔍</div>' +
          (q ? 'Nenhum resultado para <strong style="color:rgba(255,255,255,0.45);margin-left:4px">"' + q + '"</strong>' : 'Nenhum item encontrado.') +
        '</div>';
      return;
    }

    grid.innerHTML = filtered.map(function (item, idx) {
      const itemData = (typeof items !== 'undefined')
        ? items.find(function (it) { return it.name.toLowerCase() === item.name.toLowerCase(); })
        : null;

      const tierKey = (itemData && itemData.tier) ? itemData.tier.toLowerCase() : '';
      const tc      = TIER_MAP[tierKey] || DEFAULT_TIER;

      // Imagem
      let imgHtml;
      if (itemData && itemData.image) {
        imgHtml = '<img src="' + itemData.image + '" alt="' + item.name + '" loading="lazy" ' +
                  'onerror="this.style.display=\'none\';this.parentElement.innerHTML+=\'<span class=\\\'wcard-img-placeholder\\\'>📦</span>\'">';
      } else {
        imgHtml = '<span class="wcard-img-placeholder">📦</span>';
      }

      // Badge tier
      let badgeHtml = '';
      if (tierKey && TIER_MAP[tierKey]) {
        badgeHtml = '<span class="wcard-badge tier-' + tierKey + '">' + tierKey.toUpperCase() + '</span>';
      }

      // Preço
      let priceHtml = '';
      if (itemData && itemData.price && typeof formatKK === 'function') {
        const pd = formatKK(itemData.price);
        if (pd) priceHtml = '<div class="wcard-price">' + pd.label + '</div>';
      }

      // Meta row (badge + price)
      let metaHtml = '';
      if (badgeHtml || priceHtml) {
        metaHtml = '<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;justify-content:center;">' +
          badgeHtml + priceHtml +
        '</div>';
      }

      // Sources
      const sourcesHtml = '<div class="wcard-sources">' +
        '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
        '<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>' +
        '</svg>' +
        item.sources.length + ' pokémon' +
      '</div>';

      // Hint de interação
      const hintHtml = '<div class="wcard-hint">' +
        '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
        '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
        '</svg>' +
      '</div>';

      const escapedName = item.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const delay = Math.min(idx * 18, 320);

      return '<div class="wcard"' +
        ' style="--wcard-color:' + tc.color + ';--wcard-rgb:' + tc.rgb + ';--wcard-glow:rgba(' + tc.rgb + ',0.14);animation-delay:' + delay + 'ms"' +
        ' onclick="openWikiLookup(\'' + escapedName + '\', event)"' +
        ' title="' + item.name + '">' +
        '<div class="wcard-accent"></div>' +
        '<div class="wcard-img-box">' + imgHtml + '</div>' +
        '<div class="wcard-name">' + item.name + '</div>' +
        metaHtml +
        sourcesHtml +
        hintHtml +
      '</div>';
    }).join('');
  };

  // ── Inicia assim que o DOM estiver pronto ──────────────────────────
  function init() {
    injectWikiControls();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();