// ============================================================
// app-wiki-tools.js — extraído de app.js (refactor: quebra do monólito)
// Star Calculation, Punching Bag e Roupas de Speed.
// ESCOPO GLOBAL (NÃO é IIFE): preserva os mesmos globais que estavam
// em app.js. DEVE carregar logo após app.js no index.html — não reordenar.
// ============================================================
// ===================== WIKI: STAR CALCULATION =====================
function renderStarCalc() {
  var el = document.getElementById('wiki-starcalc-content');
  if (!el) return;

  // ── Dados por tier ─────────────────────────────────────────────
  var TIERS = [
    {
      id: 't3', label: 'Tier 3', icon: '🔵', color: '#3a8cff',
      dmgBonus: '2% por nível de estrela',
      steps: [
        { from: 0, to: 1, dd: 4,   kk: 1,    pokes: 1  },
        { from: 1, to: 2, dd: 12,  kk: 3,    pokes: 2  },
        { from: 2, to: 3, dd: 28,  kk: 7,    pokes: 4  },
        { from: 3, to: 4, dd: 60,  kk: 15,   pokes: 8  },
        { from: 4, to: 5, dd: 124, kk: 31,   pokes: 16 },
      ],
      total: { dd: 228, kk: 57, pokes: 31 }
    },
    {
      id: 't2', label: 'Tier 2', icon: '🟢', color: '#22c55e',
      dmgBonus: '4% por nível de estrela',
      steps: [
        { from: 0, to: 1, dd: 6,   kk: 1.5,  pokes: 1  },
        { from: 1, to: 2, dd: 18,  kk: 4.5,  pokes: 2  },
        { from: 2, to: 3, dd: 42,  kk: 10.5, pokes: 4  },
        { from: 3, to: 4, dd: 90,  kk: 22.5, pokes: 8  },
        { from: 4, to: 5, dd: 186, kk: 46.5, pokes: 16 },
      ],
      total: { dd: 342, kk: 85.5, pokes: 31 }
    },
    {
      id: 't1', label: 'Tier 1', icon: '🟡', color: '#fbbf24',
      dmgBonus: '6% por nível de estrela',
      steps: [
        { from: 0, to: 1, dd: 12,  kk: 3,    pokes: 1  },
        { from: 1, to: 2, dd: 36,  kk: 9,    pokes: 2  },
        { from: 2, to: 3, dd: 84,  kk: 21,   pokes: 4  },
        { from: 3, to: 4, dd: 180, kk: 45,   pokes: 8  },
        { from: 4, to: 5, dd: 372, kk: 93,   pokes: 16 },
      ],
      total: { dd: 684, kk: 171, pokes: 31 }
    },
    {
      id: 'sr', label: 'Super Raro', icon: '🟣', color: '#a855f7',
      dmgBonus: '8% por nível de estrela',
      steps: [
        { from: 0, to: 1, dd: 16,  kk: 4,    pokes: 1  },
        { from: 1, to: 2, dd: 48,  kk: 12,   pokes: 2  },
        { from: 2, to: 3, dd: 112, kk: 28,   pokes: 4  },
        { from: 3, to: 4, dd: 240, kk: 60,   pokes: 8  },
        { from: 4, to: 5, dd: 496, kk: 124,  pokes: 16 },
      ],
      total: { dd: 912, kk: 228, pokes: 31 }
    },
    {
      id: 'ur', label: 'Ultra Raro', icon: '🔴', color: '#ef4444',
      dmgBonus: '10% por nível de estrela',
      steps: [
        { from: 0, to: 1, dd: 24,  kk: 6,    pokes: 1  },
        { from: 1, to: 2, dd: 72,  kk: 18,   pokes: 2  },
        { from: 2, to: 3, dd: 168, kk: 42,   pokes: 4  },
        { from: 3, to: 4, dd: 360, kk: 90,   pokes: 8  },
        { from: 4, to: 5, dd: 744, kk: 186,  pokes: 16 },
      ],
      total: { dd: 1368, kk: 342, pokes: 31 }
    },
    {
      id: 'lg', label: 'Legendary', icon: '🌟', color: '#f59e0b',
      dmgBonus: '15% por nível de estrela',
      steps: [
        { from: 0, to: 1, dd: 48,  kk: 12,   pokes: 1  },
        { from: 1, to: 2, dd: 144, kk: 36,   pokes: 2  },
        { from: 2, to: 3, dd: 336, kk: 84,   pokes: 4  },
        { from: 3, to: 4, dd: 720, kk: 180,  pokes: 8  },
        { from: 4, to: 5, dd: 1488,kk: 372,  pokes: 16 },
      ],
      total: { dd: 2736, kk: 684, pokes: 31 }
    },
  ];

  var STAR_ICONS = ['☆','★','★★','★★★','★★★★','★★★★★'];

  // ── Calculadora interativa ──────────────────────────────────────
  function calcCost(tier, fromStar, toStar) {
    var dd = 0, kk = 0, pokes = 0;
    for (var i = fromStar; i < toStar; i++) {
      var step = tier.steps[i];
      dd += step.dd; kk += step.kk; pokes += step.pokes;
    }
    return { dd: dd, kk: kk, pokes: pokes };
  }

  // ── Build HTML ──────────────────────────────────────────────────
  var tiersHtml = TIERS.map(function(tier) {
    var stepsHtml = tier.steps.map(function(s) {
      return '<tr>' +
        '<td><span class="sc-star-from">' + STAR_ICONS[s.from] + ' ' + s.from + '</span></td>' +
        '<td><span class="sc-arrow">→</span></td>' +
        '<td><span class="sc-star-to">' + STAR_ICONS[s.to] + ' ' + s.to + '</span></td>' +
        '<td><span class="sc-dd">💎 ' + s.dd + ' DD</span></td>' +
        '<td><span class="sc-kk">🍀 ' + s.kk + ' KK</span></td>' +
        '<td><span class="sc-pokes">🐾 ' + s.pokes + ' Poke' + (s.pokes > 1 ? 's' : '') + '</span></td>' +
      '</tr>';
    }).join('');

    return '<div class="sc-tier-card" id="sc-card-' + tier.id + '">' +
      '<div class="sc-tier-header" style="border-left:4px solid ' + tier.color + '">' +
        '<div class="sc-tier-title">' +
          '<span class="sc-tier-icon">' + tier.icon + '</span>' +
          '<span class="sc-tier-name" style="color:' + tier.color + '">' + tier.label + '</span>' +
        '</div>' +
        '<div class="sc-tier-dmg">+' + tier.dmgBonus + '</div>' +
      '</div>' +
      '<div class="sc-tier-body">' +
        '<table class="sc-steps-table">' +
          '<thead><tr>' +
            '<th colspan="3">Evolução</th>' +
            '<th>💎 DD</th>' +
            '<th>🍀 KK</th>' +
            '<th>🐾 Pokémons</th>' +
          '</tr></thead>' +
          '<tbody>' + stepsHtml + '</tbody>' +
          '<tfoot><tr class="sc-total-row">' +
            '<td colspan="3"><strong>Total 0 → 5 ★</strong></td>' +
            '<td><strong>💎 ' + tier.total.dd + '</strong></td>' +
            '<td><strong>🍀 ' + tier.total.kk + '</strong></td>' +
            '<td><strong>🐾 ' + tier.total.pokes + ' Pokémons</strong></td>' +
          '</tr></tfoot>' +
        '</table>' +
      '</div>' +
    '</div>';
  }).join('');

  // Options for dropdowns
  var tierOpts = TIERS.map(function(t) {
    return '<option value="' + t.id + '">' + t.icon + ' ' + t.label + '</option>';
  }).join('');

  var starOpts = function(selected, minVal) {
    minVal = minVal || 0;
    return [0,1,2,3,4,5].filter(function(n){ return n >= minVal; }).map(function(n) {
      var icon = n === 0 ? '☆ 0' : STAR_ICONS[n] + ' ' + n;
      return '<option value="' + n + '"' + (n === selected ? ' selected' : '') + '>' + icon + ' \u2605</option>';
    }).join('');
  };

  el.innerHTML = `
  <style>
  .sc-page { padding: 20px 24px 40px; max-width: 900px; margin: 0 auto; }

  /* Hero */
  .sc-hero { text-align:center; padding: 28px 20px 20px; margin-bottom: 28px; }
  .sc-hero-icon { font-size: 42px; margin-bottom: 10px; }
  .sc-hero-title { font-family: var(--font-title); font-size: 22px; font-weight: 700; color: #fff; letter-spacing: 1.5px; margin-bottom: 6px; }
  .sc-hero-sub { font-size: 13px; color: var(--muted); }

  /* Calculator */
  .sc-calculator {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,209,102,0.2);
    border-radius: 16px;
    padding: 20px 24px;
    margin-bottom: 32px;
  }
  .sc-calc-title {
    font-family: var(--font-title);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 16px;
    display: flex; align-items: center; gap: 8px;
  }
  .sc-calc-fields {
    display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin-bottom: 16px;
  }
  .sc-calc-field { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 120px; }
  .sc-calc-field label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--muted); }
  .sc-calc-field select {
    background: #1a2340;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    color: #fff;
    font-family: var(--font-body);
    font-size: 13px;
    padding: 8px 10px;
    cursor: pointer;
    outline: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23aaa' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    padding-right: 30px;
  }
  .sc-calc-field select option {
    background: #1a2340;
    color: #fff;
  }
  .sc-calc-field select:focus { border-color: var(--gold); background-color: #1a2340; }
  .sc-calc-btn {
    background: linear-gradient(135deg, rgba(255,209,102,0.2), rgba(255,209,102,0.08));
    border: 1px solid rgba(255,209,102,0.4);
    border-radius: 8px;
    color: var(--gold);
    font-family: var(--font-title);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
    padding: 9px 20px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  .sc-calc-btn:hover { background: rgba(255,209,102,0.18); border-color: var(--gold); }
  .sc-calc-result {
    display: none;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 16px 20px;
    margin-top: 4px;
  }
  .sc-calc-result.visible { display: flex; gap: 20px; flex-wrap: wrap; }
  .sc-calc-result-label {
    width: 100%;
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 4px;
    font-family: var(--font-mono, monospace);
  }
  .sc-calc-result-item {
    display: flex; flex-direction: column; gap: 2px;
    background: rgba(255,255,255,0.04);
    border-radius: 8px;
    padding: 10px 16px;
    flex: 1; min-width: 80px; text-align: center;
  }
  .sc-calc-result-val { font-size: 20px; font-weight: 900; font-family: var(--font-mono, monospace); color: #fff; }
  .sc-calc-result-sub { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.6px; }
  .sc-calc-result-val.dd { color: #60d0ff; }
  .sc-calc-result-val.kk { color: #4ade80; }
  .sc-calc-result-val.poke { color: #f472b6; }

  /* Notes */
  .sc-notes {
    background: rgba(58,140,255,0.07);
    border: 1px solid rgba(58,140,255,0.2);
    border-radius: 12px;
    padding: 14px 18px;
    margin-bottom: 28px;
    font-size: 12px;
    color: rgba(255,255,255,0.7);
    line-height: 1.7;
  }
  .sc-notes strong { color: #fff; }

  /* Tier cards */
  .sc-tier-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    margin-bottom: 20px;
    overflow: hidden;
  }
  .sc-tier-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px 18px;
    background: rgba(255,255,255,0.03);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .sc-tier-title { display: flex; align-items: center; gap: 10px; }
  .sc-tier-icon { font-size: 20px; }
  .sc-tier-name { font-family: var(--font-title); font-size: 15px; font-weight: 700; letter-spacing: 1px; }
  .sc-tier-dmg { font-size: 11px; color: var(--muted); font-family: var(--font-mono, monospace); }
  .sc-tier-body { padding: 0; overflow-x: auto; }

  /* Table */
  .sc-steps-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .sc-steps-table th {
    padding: 9px 12px;
    text-align: left;
    font-size: 10px;
    font-family: var(--font-title);
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--muted);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .sc-steps-table td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); }
  .sc-steps-table tbody tr:hover { background: rgba(255,255,255,0.03); }
  .sc-steps-table tfoot tr { background: rgba(255,255,255,0.04); }
  .sc-steps-table tfoot td { border-top: 1px solid rgba(255,255,255,0.1); border-bottom: none; padding: 12px; }
  .sc-star-from { color: var(--muted); font-family: var(--font-mono, monospace); font-size: 12px; }
  .sc-star-to { color: #fff; font-family: var(--font-mono, monospace); font-size: 12px; }
  .sc-arrow { color: rgba(255,255,255,0.3); font-size: 12px; }
  .sc-dd { color: #60d0ff; font-family: var(--font-mono, monospace); font-size: 12px; white-space: nowrap; }
  .sc-kk { color: #4ade80; font-family: var(--font-mono, monospace); font-size: 12px; white-space: nowrap; }
  .sc-pokes { color: #f472b6; font-family: var(--font-mono, monospace); font-size: 12px; white-space: nowrap; }
  .sc-total-row td { font-size: 12px; }
  .sc-total-row strong { color: #fff; }

  /* Pattern note */
  .sc-pattern {
    background: rgba(168,85,247,0.07);
    border: 1px solid rgba(168,85,247,0.2);
    border-radius: 12px;
    padding: 14px 18px;
    margin-top: 28px;
    font-size: 12px;
    color: rgba(255,255,255,0.7);
    line-height: 1.7;
  }
  .sc-pattern-title { font-family: var(--font-title); font-size: 12px; font-weight: 700; color: #c084fc; letter-spacing: 1px; margin-bottom: 8px; }

  @media (max-width: 600px) {
    .sc-page { padding: 14px 12px 40px; }
    .sc-steps-table th, .sc-steps-table td { padding: 8px 8px; }
  }
  </style>
  <div class="sc-page">

    <!-- Hero -->
    <div class="sc-hero">
      <div class="sc-hero-icon">⭐</div>
      <div class="sc-hero-title">Star Calculation</div>
      <div class="sc-hero-sub">Calculadora de custos para evolução de estrelas — 100% de sucesso</div>
    </div>

    <!-- Calculadora -->
    <div class="sc-calculator">
      <div class="sc-calc-title">⚡ Calculadora Rápida</div>
      <div class="sc-calc-fields">
        <div class="sc-calc-field">
          <label>Tier</label>
          <select id="sc-sel-tier">${tierOpts}</select>
        </div>
        <div class="sc-calc-field">
          <label>Star Atual</label>
          <select id="sc-sel-from" onchange="updateStarToOpts()">${starOpts(0)}</select>
        </div>
        <div class="sc-calc-field">
          <label>Star Objetivo</label>
          <select id="sc-sel-to">${starOpts(5, 1)}</select>
        </div>
        <button class="sc-calc-btn" onclick="runStarCalc()">Calcular</button>
      </div>
      <div class="sc-calc-result" id="sc-result">
        <div class="sc-calc-result-label" id="sc-result-label"></div>
        <div class="sc-calc-result-item">
          <span class="sc-calc-result-val dd" id="sc-res-dd">—</span>
          <span class="sc-calc-result-sub">💎 Diamond Dust</span>
        </div>
        <div class="sc-calc-result-item">
          <span class="sc-calc-result-val kk" id="sc-res-kk">—</span>
          <span class="sc-calc-result-sub">🍀 KK</span>
        </div>
        <div class="sc-calc-result-item">
          <span class="sc-calc-result-val poke" id="sc-res-pokes">—</span>
          <span class="sc-calc-result-sub">🐾 Pokémons Iguais</span>
        </div>
      </div>
    </div>

    <!-- Notas -->
    <div class="sc-notes">
      ⚠️ <strong>Valores considerando 100% de sucesso.</strong> &nbsp;•&nbsp;
      A <strong>proporção DD → KK</strong> é sempre 4:1. &nbsp;•&nbsp;
      Os <strong>Pokémons necessários</strong> (0→5★) são sempre <strong>31</strong> independente do tier. &nbsp;•&nbsp;
      Cada step custa o dobro do anterior + o custo base do tier. &nbsp;•&nbsp;
      <strong>Legendary</strong> aumenta 15% de dano por estrela.
    </div>

    <!-- Cards por tier -->
    ${tiersHtml}

    <!-- Padrão explicado -->
    <div class="sc-pattern">
      <div class="sc-pattern-title">🔍 O padrão dos custos</div>
      Sim, existe um padrão! O custo base de DD por step é fixo para cada tier:<br><br>
      <strong>T3</strong> = base 4 DD &nbsp;|&nbsp; <strong>T2</strong> = base 6 DD &nbsp;|&nbsp; <strong>T1</strong> = base 12 DD &nbsp;|&nbsp; <strong>SR</strong> = base 16 DD &nbsp;|&nbsp; <strong>UR</strong> = base 24 DD &nbsp;|&nbsp; <strong>Legendary</strong> = base 48 DD<br><br>
      Dentro de cada tier, os steps seguem a fórmula: <strong>custo_step(n) = base × (2ⁿ⁻¹ × 4 - custo_step_anterior_acumulado... simplificando: 4, 12, 28, 60, 124</strong> — cada valor é ~2× o anterior + base.<br><br>
      A proporção <strong>DD ÷ KK = 4:1</strong> é constante em todos os tiers e steps.
    </div>

  </div>
  `;
}

function runStarCalc() {
  var tierSel = document.getElementById('sc-sel-tier');
  var fromSel = document.getElementById('sc-sel-from');
  var toSel   = document.getElementById('sc-sel-to');
  if (!tierSel || !fromSel || !toSel) return;

  var tierId  = tierSel.value;
  var fromStar = parseInt(fromSel.value);
  var toStar   = parseInt(toSel.value);

  var TIERS_MAP = {
    t3:  { label:'Tier 3',    steps: [{dd:4,kk:1,pokes:1},{dd:12,kk:3,pokes:2},{dd:28,kk:7,pokes:4},{dd:60,kk:15,pokes:8},{dd:124,kk:31,pokes:16}] },
    t2:  { label:'Tier 2',    steps: [{dd:6,kk:1.5,pokes:1},{dd:18,kk:4.5,pokes:2},{dd:42,kk:10.5,pokes:4},{dd:90,kk:22.5,pokes:8},{dd:186,kk:46.5,pokes:16}] },
    t1:  { label:'Tier 1',    steps: [{dd:12,kk:3,pokes:1},{dd:36,kk:9,pokes:2},{dd:84,kk:21,pokes:4},{dd:180,kk:45,pokes:8},{dd:372,kk:93,pokes:16}] },
    sr:  { label:'Super Raro',steps: [{dd:16,kk:4,pokes:1},{dd:48,kk:12,pokes:2},{dd:112,kk:28,pokes:4},{dd:240,kk:60,pokes:8},{dd:496,kk:124,pokes:16}] },
    ur:  { label:'Ultra Raro', steps: [{dd:24,kk:6,pokes:1},{dd:72,kk:18,pokes:2},{dd:168,kk:42,pokes:4},{dd:360,kk:90,pokes:8},{dd:744,kk:186,pokes:16}] },
    lg:  { label:'Legendary',  steps: [{dd:48,kk:12,pokes:1},{dd:144,kk:36,pokes:2},{dd:336,kk:84,pokes:4},{dd:720,kk:180,pokes:8},{dd:1488,kk:372,pokes:16}] },
  };

  var tier = TIERS_MAP[tierId];
  var res = document.getElementById('sc-result');
  var resLabel = document.getElementById('sc-result-label');

  if (!tier || fromStar >= toStar) {
    res.classList.remove('visible');
    res.classList.add('visible');
    res.style.background = 'rgba(255,80,80,0.08)';
    res.style.border = '1px solid rgba(255,80,80,0.25)';
    resLabel.textContent = fromStar >= toStar
      ? '⚠️ Star Objetivo deve ser maior que Star Atual!'
      : '⚠️ Tier inválido.';
    document.getElementById('sc-res-dd').textContent    = '—';
    document.getElementById('sc-res-kk').textContent    = '—';
    document.getElementById('sc-res-pokes').textContent = '—';
    return;
  }

  res.style.background = '';
  res.style.border = '';

  var dd = 0, kk = 0, pokes = 0;
  for (var i = fromStar; i < toStar; i++) {
    var s = tier.steps[i];
    dd += s.dd; kk += s.kk; pokes += s.pokes;
  }

  var STAR_ICONS = ['☆','★','★★','★★★','★★★★','★★★★★'];
  resLabel.textContent =
    tier.label + ' — ' + fromStar + '★ → ' + toStar + '★';
  document.getElementById('sc-res-dd').textContent = dd + ' DD';
  document.getElementById('sc-res-kk').textContent = kk + ' KK';
  document.getElementById('sc-res-pokes').textContent = pokes + ' Pokémon' + (pokes > 1 ? 's' : '');
  res.classList.add('visible');
}
// Atualiza as opções do select "Star Objetivo" para sempre ser > Star Atual
function updateStarToOpts() {
  var fromSel = document.getElementById('sc-sel-from');
  var toSel   = document.getElementById('sc-sel-to');
  if (!fromSel || !toSel) return;
  var fromVal = parseInt(fromSel.value);
  var currentTo = parseInt(toSel.value);
  var STAR_ICONS = ['☆','★','★★','★★★','★★★★','★★★★★'];
  var opts = '';
  for (var n = fromVal + 1; n <= 5; n++) {
    var isSelected = (currentTo > fromVal && n === currentTo) || (currentTo <= fromVal && n === fromVal + 1);
    opts += '<option value="' + n + '"' + (isSelected ? ' selected' : '') + '>' + (n === 0 ? '☆ 0' : STAR_ICONS[n] + ' ' + n) + ' ★</option>';
  }
  toSel.innerHTML = opts;
}

// ===================== WIKI: PUNCHING BAG =====================
function renderPunchingBag() {
  var el = document.getElementById('wiki-punchingbag-content');
  if (!el || el._pbRendered) return;
  el._pbRendered = true;

  var STATS = [
    { icon: '⚔️', name: 'Attack',        key: 'atk',   perLvl: 0.1  },
    { icon: '🛡️', name: 'Defense',       key: 'def',   perLvl: 0.05 },
    { icon: '❤️', name: 'HP',            key: 'hp',    perLvl: 0.1  },
    { icon: '🎯', name: 'Precisão',      key: 'prec',  perLvl: 0.2  },
    { icon: '💨', name: 'Evasão',        key: 'eva',   perLvl: 0.2  },
    { icon: '💥', name: 'Critical DMG',  key: 'cdmg',  perLvl: 0.1  },
    { icon: '🍀', name: 'Critical Chance',key: 'cchance',perLvl: 0.1  },
    { icon: '🔰', name: 'Critical Res',  key: 'cres',  perLvl: 0.1  },
  ];

  var BAGS = [
    { icon: '🥊', name: 'Punching Bag (Solo)',   pokeMin: 1, pokeMax: 1, desc: 'Versão básica. Comporta apenas 1 Pokémon por vez. Mais lento.' },
    { icon: '👊', name: 'Punching Bag (2 Pokes)', pokeMin: 2, pokeMax: 2, desc: 'Treina 2 Pokémons simultaneamente. Consome cargas 2× mais rápido.' },
    { icon: '💪', name: 'Punching Bag (3 Pokes)', pokeMin: 3, pokeMax: 3, desc: 'Treina 3 Pokémons simultaneamente. Consome cargas 3× mais rápido.' },
    { icon: '🏋️', name: 'Punching Bag (4 Pokes)', pokeMin: 4, pokeMax: 4, desc: 'Capacidade máxima. Treina 4 Pokémons ao mesmo tempo. Treino máximo!' },
  ];

  el.innerHTML = `
  <div class="pb-page">

    <!-- Hero -->
    <div class="pb-hero">
      <div class="pb-hero-icon">🥊</div>
      <div class="pb-hero-title">Punching Bag</div>
      <div class="pb-hero-sub">Sistema de treinamento de atributos para seus Pokémons</div>
    </div>

    <!-- Como funciona -->
    <div class="pb-howto">
      <div class="pb-howto-title">📖 Como treinar um Pokémon</div>
      <div class="pb-steps-list">
        <div class="pb-step">
          <div class="pb-step-num">1</div>
          <div>Compre o <strong>dummy (Punching Bag)</strong> e as <strong>cargas</strong> na store (por <span class="pb-tag-dd">DDs</span>), ou com a NPC <strong>July</strong> no TC (por <span class="pb-tag-kk">KKs</span>).</div>
        </div>
        <div class="pb-step">
          <div class="pb-step-num">2</div>
          <div>Coloque o <strong>dummy na sua house</strong> — ele precisa de bastante espaço!</div>
        </div>
        <div class="pb-step">
          <div class="pb-step-num">3</div>
          <div>Adicione as <strong>cargas</strong> ao dummy e coloque o <strong>Pokémon</strong> nele para iniciar o treino.</div>
        </div>
        <div class="pb-step">
          <div class="pb-step-num">4</div>
          <div>Para ver os stats treinados: <strong>Ctrl + clique</strong> na Pokéball → <strong>Customize</strong>.</div>
        </div>
      </div>
      <div class="pb-tip-box">
        💡 <span>Cada punching bag comporta entre <strong>1 e 4 Pokémons</strong> por vez. Quanto mais Pokémons, mais rápido as cargas são consumidas — mas o treino é simultâneo!</span>
      </div>
    </div>

    <!-- Bônus por nível -->
    <div class="pb-section">
      <div class="pb-section-title">📊 Bônus por nível de treinamento</div>
      <div class="pb-stats-grid">
        ${STATS.map(function(s) {
          return '<div class="pb-stat-card">' +
            '<div class="pb-stat-icon">' + s.icon + '</div>' +
            '<div class="pb-stat-name">' + s.name + '</div>' +
            '<div class="pb-stat-bonus">+' + s.perLvl + '%</div>' +
            '<div class="pb-stat-per-lvl">por nível</div>' +
          '</div>';
        }).join('')}
      </div>
    </div>

    <!-- Calculadora -->
    <div class="pb-section">
      <div class="pb-section-title">🧮 Calculadora de Bônus Acumulado</div>
      <div class="pb-calc-card">
        <div class="pb-calc-header">
          <div class="pb-calc-header-icon">⚡</div>
          <div class="pb-calc-header-text">Insira o nível de treinamento do seu Pokémon</div>
        </div>
        <div class="pb-calc-body">
          <div class="pb-calc-row">
            <div class="pb-calc-label">Nível atual</div>
            <div class="pb-level-input-wrap">
              <input type="number" id="pb-level-input" class="pb-level-input" min="0" max="1000" value="0"
                oninput="pbSyncSlider(this.value); pbCalc()" />
              <input type="range" id="pb-level-slider" class="pb-level-slider" min="0" max="500" value="0"
                oninput="pbSyncInput(this.value); pbCalc()" />
              <span class="pb-level-max">máx livre</span>
            </div>
          </div>
          <div class="pb-results-grid" id="pb-results">
            ${STATS.map(function(s) {
              return '<div class="pb-result-cell" id="pb-cell-' + s.key + '">' +
                '<div class="pb-result-icon">' + s.icon + '</div>' +
                '<div class="pb-result-name">' + s.name + '</div>' +
                '<div class="pb-result-val" id="pb-val-' + s.key + '">+0%</div>' +
                '<div class="pb-result-sub" id="pb-sub-' + s.key + '">nível 0</div>' +
              '</div>';
            }).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Bags variants -->
    <div class="pb-section">
      <div class="pb-section-title">🥊 Tipos de Punching Bag</div>
      <div class="pb-bags-grid">
        ${BAGS.map(function(b) {
          return '<div class="pb-bag-card">' +
            '<div class="pb-bag-icon">' + b.icon + '</div>' +
            '<div class="pb-bag-name">' + b.name + '</div>' +
            '<div class="pb-bag-poke">' + (b.pokeMin === b.pokeMax ? b.pokeMin : b.pokeMin + '–' + b.pokeMax) + ' Pokémon' + (b.pokeMax > 1 ? 's' : '') + '</div>' +
            '<div class="pb-bag-desc">' + b.desc + '</div>' +
          '</div>';
        }).join('')}
      </div>
    </div>

  </div>
  `;

  // Store stats data for calculator
  el._pbStats = STATS;
  pbCalc();
}

function pbSyncSlider(val) {
  var slider = document.getElementById('pb-level-slider');
  if (slider) slider.value = Math.min(val, 500);
}

function pbSyncInput(val) {
  var input = document.getElementById('pb-level-input');
  if (input) input.value = val;
}

function pbCalc() {
  var el = document.getElementById('wiki-punchingbag-content');
  if (!el || !el._pbStats) return;
  var input = document.getElementById('pb-level-input');
  if (!input) return;
  var level = Math.max(0, parseInt(input.value) || 0);

  el._pbStats.forEach(function(s) {
    var bonus = (level * s.perLvl).toFixed(level * s.perLvl % 1 === 0 ? 0 : 2);
    var valEl  = document.getElementById('pb-val-' + s.key);
    var subEl  = document.getElementById('pb-sub-' + s.key);
    var cellEl = document.getElementById('pb-cell-' + s.key);
    if (valEl)  valEl.textContent  = '+' + bonus + '%';
    if (subEl)  subEl.textContent  = 'nível ' + level;
    if (cellEl) {
      if (level > 0) cellEl.classList.add('has-bonus');
      else cellEl.classList.remove('has-bonus');
    }
  });
}

// ===================== WIKI: ROUPAS DE SPEED =====================
function renderRoupasSpeed() {
  var el = document.getElementById('wiki-roupasspeed-content');
  if (!el) return;

  var roupas = [
    {
      id: 'ski',
      nome: 'Roupa de Ski',
      terreno: 'Neve',
      pergunta: 'Como ando mais rápido na neve?',
      pedra: 'Ice Stone',
      qtd: 3,
      cor: '#5bc8f5',
      corRgb: '91,200,245',
      emoji: '❄️',
      img: 'https://i.imgur.com/DjU6sM4.png',
      dica: 'Equipar esta roupa permite se mover mais rápido em terrenos cobertos de neve.',
      mapImg: null
    },
    {
      id: 'sandboard',
      nome: 'Sandboard',
      terreno: 'Areia',
      pergunta: 'Como ando mais rápido na areia?',
      pedra: 'Enigma Stone',
      qtd: 3,
      cor: '#e8b840',
      corRgb: '232,184,64',
      emoji: '🏜️',
      img: 'https://i.imgur.com/YUCTD6p.jpeg',
      dica: 'Equipar esta roupa permite deslizar rapidamente sobre terrenos arenosos.',
      mapImg: null
    },
    {
      id: 'mergulho',
      nome: 'Roupa de Mergulho',
      terreno: 'Água',
      pergunta: 'Como ando mais rápido na água?',
      pedra: 'Water Stone',
      qtd: 3,
      cor: '#4a9eff',
      corRgb: '74,158,255',
      emoji: '🌊',
      img: 'https://i.imgur.com/LbDx18X.png',
      dica: 'Equipar esta roupa permite nadar com velocidade elevada em rios, lagos e oceanos.',
      mapImg: null
    }
  ];

  // Inject CSS once
  if (!document.getElementById('rsp2-css')) {
    var s = document.createElement('style');
    s.id = 'rsp2-css';
    s.textContent = `
      /* ── Roupas Speed v2 — card style ── */
      .rsp2-page { max-width: 960px; margin: 0 auto; padding: 8px 0 60px; }

      .rsp2-hero { text-align: center; padding: 32px 20px 28px; }
      .rsp2-hero-icon { font-size: 52px; line-height: 1; margin-bottom: 10px; }
      .rsp2-hero-title {
        font-family: var(--font-title);
        font-size: 22px; font-weight: 900; letter-spacing: 3px;
        text-transform: uppercase; color: #fff; margin-bottom: 6px;
      }
      .rsp2-hero-sub { font-size: 12px; color: var(--muted); letter-spacing: 1px; }

      /* Grid of 3 cards */
      .rsp2-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
        gap: 16px;
        padding: 0 8px;
      }

      /* Individual card */
      .rsp2-card {
        background: rgba(255,255,255,0.025);
        border: 1.5px solid rgba(var(--rsp2-rgb), 0.15);
        border-radius: 16px; overflow: hidden;
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s, transform 0.18s, box-shadow 0.2s;
        position: relative;
      }
      .rsp2-card::before {
        content: '';
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at 50% -10%, rgba(var(--rsp2-rgb), 0.07), transparent 70%);
        pointer-events: none;
      }
      .rsp2-card:hover {
        border-color: rgba(var(--rsp2-rgb), 0.45);
        background: rgba(var(--rsp2-rgb), 0.04);
        transform: translateY(-3px);
        box-shadow: 0 8px 30px rgba(var(--rsp2-rgb), 0.12), 0 0 0 1px rgba(var(--rsp2-rgb), 0.08);
      }

      /* Card header */
      .rsp2-card-header {
        display: flex; align-items: center; gap: 10px;
        padding: 13px 15px 11px;
        border-bottom: 1px solid rgba(var(--rsp2-rgb), 0.1);
      }
      .rsp2-npc-icon {
        width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
        background: rgba(var(--rsp2-rgb), 0.15);
        border: 1.5px solid rgba(var(--rsp2-rgb), 0.35);
        display: flex; align-items: center; justify-content: center;
        font-size: 18px;
      }
      .rsp2-card-name {
        font-family: var(--font-title);
        font-size: 14px; font-weight: 700; letter-spacing: 1.5px;
        text-transform: uppercase; color: var(--rsp2-cor); flex: 1;
      }
      .rsp2-map-btn {
        display: inline-flex; align-items: center; gap: 5px;
        font-family: var(--font-mono, monospace);
        font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
        text-transform: uppercase; color: #60c0ff;
        background: rgba(96,192,255,0.1);
        border: 1px solid rgba(96,192,255,0.25);
        border-radius: 6px; padding: 5px 9px;
        cursor: pointer; white-space: nowrap;
        transition: background 0.15s, border-color 0.15s, transform 0.1s;
      }
      .rsp2-map-btn:hover {
        background: rgba(96,192,255,0.22);
        border-color: rgba(96,192,255,0.55);
        transform: scale(1.04);
      }

      /* Card image area */
      .rsp2-img-area {
        padding: 18px 18px 10px;
        display: flex; justify-content: center; align-items: center;
        background: rgba(0,0,0,0.15);
        min-height: 160px; position: relative; overflow: hidden;
      }
      .rsp2-img-glow {
        position: absolute; inset: 0;
        background: radial-gradient(ellipse at 50% 60%, rgba(var(--rsp2-rgb), 0.12), transparent 70%);
        pointer-events: none;
      }
      .rsp2-item-img {
        width: 120px; height: 120px; object-fit: contain;
        image-rendering: auto;
        position: relative; z-index: 1;
        filter: drop-shadow(0 0 12px rgba(var(--rsp2-rgb), 0.4));
        transition: transform 0.3s, filter 0.3s;
      }
      .rsp2-card:hover .rsp2-item-img {
        transform: scale(1.07) translateY(-4px);
        filter: drop-shadow(0 4px 18px rgba(var(--rsp2-rgb), 0.6));
      }

      /* Card info footer */
      .rsp2-card-info {
        padding: 12px 15px 16px;
        display: flex; flex-direction: column; gap: 10px;
      }
      .rsp2-terreno-row {
        display: flex; align-items: center; gap: 8px;
      }
      .rsp2-terreno-emoji { font-size: 22px; }
      .rsp2-terreno-label {
        font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
        text-transform: uppercase; color: rgba(255,255,255,0.3);
      }
      .rsp2-terreno-name {
        font-family: var(--font-title);
        font-size: 15px; font-weight: 700; color: var(--rsp2-cor);
        margin-left: auto;
      }
      .rsp2-req-row {
        display: flex; align-items: center; gap: 10px;
        background: rgba(var(--rsp2-rgb), 0.07);
        border: 1px solid rgba(var(--rsp2-rgb), 0.18);
        border-radius: 10px; padding: 8px 12px;
      }
      .rsp2-req-num {
        font-family: var(--font-mono, monospace);
        font-size: 22px; font-weight: 900; color: var(--rsp2-cor); line-height: 1;
      }
      .rsp2-req-sep { width: 1px; height: 28px; background: rgba(var(--rsp2-rgb), 0.2); }
      .rsp2-req-text { flex: 1; }
      .rsp2-req-pedra {
        font-family: var(--font-title);
        font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 2px;
      }
      .rsp2-req-hint {
        font-size: 10px; color: rgba(255,255,255,0.35); letter-spacing: 0.3px;
      }
      .rsp2-dica {
        font-size: 11px; color: rgba(255,255,255,0.38);
        font-style: italic; line-height: 1.6; border-top: 1px solid rgba(255,255,255,0.06);
        padding-top: 10px;
      }

      /* ── Map Modal (reuse hzmap style with rsp2 theme) ── */
      #rsp2-map-modal {
        position: fixed; inset: 0; z-index: 9000;
        display: flex; align-items: center; justify-content: center;
        animation: rsp2FadeIn 0.2s ease;
      }
      @keyframes rsp2FadeIn { from { opacity: 0; } to { opacity: 1; } }
      .rsp2-map-backdrop {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.78);
        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      }
      .rsp2-map-panel {
        position: relative; z-index: 1;
        width: min(1100px, 96vw); max-height: 92vh;
        display: flex; flex-direction: column;
        background: #0c1424;
        border: 1px solid rgba(var(--rsp2-modal-rgb, 255,220,80), 0.25);
        border-radius: 16px; overflow: hidden;
        box-shadow: 0 24px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(var(--rsp2-modal-rgb, 255,220,80), 0.08);
        animation: rsp2SlideUp 0.25s cubic-bezier(0.16,1,0.3,1);
      }
      @keyframes rsp2SlideUp {
        from { transform: translateY(28px) scale(0.97); opacity: 0; }
        to   { transform: translateY(0)    scale(1);    opacity: 1; }
      }
      .rsp2-map-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid rgba(var(--rsp2-modal-rgb, 255,220,80), 0.12);
        background: rgba(var(--rsp2-modal-rgb, 255,220,80), 0.04);
      }
      .rsp2-map-title {
        display: flex; align-items: center; gap: 8px;
        font-family: var(--font-title);
        font-size: 14px; font-weight: 700; letter-spacing: 1.5px;
        text-transform: uppercase; color: var(--rsp2-modal-cor, #ffe066);
      }
      .rsp2-map-close {
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
        color: #fff; border-radius: 8px; width: 30px; height: 30px;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; cursor: pointer; transition: background 0.15s;
      }
      .rsp2-map-close:hover { background: rgba(255,80,80,0.2); border-color: rgba(255,80,80,0.4); }
      .rsp2-map-body {
        position: relative; flex: 1; min-height: 65vh;
        background: #070d1a;
        display: flex; align-items: center; justify-content: center; overflow: hidden;
      }
      .rsp2-map-loading {
        position: absolute;
        font-family: var(--font-mono, monospace);
        font-size: 12px; color: var(--muted); letter-spacing: 1px;
        pointer-events: none;
      }
      .rsp2-map-iframe {
        position: absolute; inset: 0; width: 100%; height: 100%;
        border: none; opacity: 0; transition: opacity 0.4s;
      }
      .rsp2-map-iframe.loaded { opacity: 1; }
      .rsp2-map-img {
        position: absolute; inset: 0; margin: auto;
        max-width: 100%; max-height: 100%;
        width: auto; height: auto;
        object-fit: contain;
        opacity: 0; transition: opacity 0.4s;
      }
      .rsp2-map-img.loaded { opacity: 1; }
      .rsp2-map-bg {
        position: absolute; inset: 0;
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
      }
      .rsp2-map-footer {
        padding: 10px 18px; border-top: 1px solid rgba(255,255,255,0.06);
        display: flex; align-items: center; gap: 10px;
        font-size: 11px; color: rgba(255,255,255,0.3);
        background: rgba(0,0,0,0.25);
      }

      @media(max-width:640px) { .rsp2-grid { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(s);
  }

  var html = '<div class="rsp2-page">';
  html += '<div class="rsp2-hero">';
  html += '  <div class="rsp2-hero-icon">🎽</div>';
  html += '  <div class="rsp2-hero-title">Roupas de Speed</div>';
  html += '  <div class="rsp2-hero-sub">Clique em "Ver Mapa" para localizar o NPC responsável</div>';
  html += '</div>';
  html += '<div class="rsp2-grid">';

  roupas.forEach(function(r) {
    html += '<div class="rsp2-card" style="--rsp2-rgb:' + r.corRgb + ';--rsp2-cor:' + r.cor + '">';

    // Header
    html += '<div class="rsp2-card-header">';
    html += '  <div class="rsp2-npc-icon">' + r.emoji + '</div>';
    html += '  <div class="rsp2-card-name">' + r.nome + '</div>';
    html += '  <button class="rsp2-map-btn" onclick="event.stopPropagation();openRsp2Map(\'' + r.id + '\')">';
    html += '    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
    html += '    VER MAPA';
    html += '  </button>';
    html += '</div>';

    // Image
    html += '<div class="rsp2-img-area">';
    html += '  <div class="rsp2-img-glow"></div>';
    html += '  <img class="rsp2-item-img" src="' + r.img + '" alt="' + r.nome + '" loading="lazy" onerror="this.style.display=\'none\'" />';
    html += '</div>';

    // Info
    html += '<div class="rsp2-card-info">';
    html += '  <div class="rsp2-terreno-row">';
    html += '    <span class="rsp2-terreno-emoji">' + r.emoji + '</span>';
    html += '    <span class="rsp2-terreno-label">Terreno</span>';
    html += '    <span class="rsp2-terreno-name">' + r.terreno + '</span>';
    html += '  </div>';
    html += '  <div class="rsp2-req-row">';
    html += '    <div class="rsp2-req-num">×' + r.qtd + '</div>';
    html += '    <div class="rsp2-req-sep"></div>';
    html += '    <div class="rsp2-req-text">';
    html += '      <div class="rsp2-req-pedra">' + r.pedra + '</div>';
    html += '      <div class="rsp2-req-hint">Entregar ao NPC responsável</div>';
    html += '    </div>';
    html += '  </div>';
    html += '  <div class="rsp2-dica">' + r.dica + '</div>';
    html += '</div>';

    html += '</div>'; // .rsp2-card
  });

  html += '</div>'; // .rsp2-grid
  html += '</div>'; // .rsp2-page
  el.innerHTML = html;
}

// Map data for each roupa (reuse hazard map system)
var RSP2_MAP_DATA = {
  ski:       { npc: 'NPC Neve',  img: 'https://i.imgur.com/DjU6sM4.png',  emoji: '❄️', cor: '#5bc8f5', rgb: '91,200,245',  label: 'Roupa de Ski' },
  sandboard: { npc: 'NPC Areia', img: 'https://i.imgur.com/YUCTD6p.jpeg', emoji: '🏜️', cor: '#e8b840', rgb: '232,184,64', label: 'Sandboard' },
  mergulho:  { npc: 'NPC Água',  img: 'https://i.imgur.com/LbDx18X.png',  emoji: '🌊', cor: '#4a9eff', rgb: '74,158,255',  label: 'Roupa de Mergulho' }
};

function openRsp2Map(id) {
  var existing = document.getElementById('rsp2-map-modal');
  if (existing) existing.remove();
  var data = RSP2_MAP_DATA[id] || { npc: id, img: null, emoji: '🗺️', cor: '#ffe066', rgb: '255,224,102', label: id };
  document.documentElement.style.setProperty('--rsp2-modal-rgb', data.rgb);
  document.documentElement.style.setProperty('--rsp2-modal-cor', data.cor);

  var bodyContent = data.img
    ? '<div class="rsp2-map-bg" style="background-image:url(\'' + data.img + '\')"></div>'
    : '<div style="font-family:var(--font-mono,monospace);font-size:13px;color:rgba(255,255,255,0.35);text-align:center;padding:40px;line-height:2">🗺️<br>Mapa ainda não cadastrado para este NPC.<br>Em breve!</div>';

  var modal = document.createElement('div');
  modal.id = 'rsp2-map-modal';
  modal.innerHTML =
    '<div class="rsp2-map-backdrop" onclick="document.getElementById(\'rsp2-map-modal\').remove()"></div>' +
    '<div class="rsp2-map-panel">' +
      '<div class="rsp2-map-header">' +
        '<div class="rsp2-map-title"><span>' + data.emoji + '</span><span>' + data.npc + '</span></div>' +
        '<button class="rsp2-map-close" onclick="document.getElementById(\'rsp2-map-modal\').remove()">✕</button>' +
      '</div>' +
      '<div class="rsp2-map-body">' + bodyContent + '</div>' +
      '<div class="rsp2-map-footer">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>' +
        'Localização do NPC responsável pela ' + data.label +
      '</div>' +
    '</div>';

  document.body.appendChild(modal);
}

function toggleRspCard(id) {
  var card = document.getElementById('rsp-card-' + id);
  if (!card) return;
  var isOpen = card.classList.contains('open');
  document.querySelectorAll('.rsp-card.open').forEach(function(c) { c.classList.remove('open'); });
  if (!isOpen) card.classList.add('open');
}

