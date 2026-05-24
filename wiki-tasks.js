/* ══════════════════════════════════════════════════════════════════════════
   wiki-tasks.js  —  Guia de Tasks NPC para a Wiki do PokeAlliance
   ══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  // ── Dados ───────────────────────────────────────────────────────────────
  var TASKS = [
    // ── EASY ────────────────────────────────────────────────────────────
    {
      npc: 'Elena', location: 'Saffron', difficulty: 'easy',
      task: '10 Weedle e 10 Caterpie',
      reward: '10K EXP',
      pokemons: ['Weedle', 'Caterpie'],
    },
    {
      npc: 'Maya', location: 'Saffron (Na Ponte próximo a saída Norte)', difficulty: 'easy',
      task: '10 Kakuna e 10 Metapod',
      reward: '20K EXP',
      pokemons: ['Kakuna', 'Metapod'],
    },
    {
      npc: 'Aaron', location: 'Floresta Saffron/Cerulean (Próximo do Shiny Magnemite Den)', difficulty: 'easy',
      task: '20 Magnemite e 40 Voltorb',
      reward: '30K EXP',
      pokemons: ['Magnemite', 'Voltorb'],
    },
    {
      npc: 'Nina', location: 'Cerulean ao lado do Mark', difficulty: 'easy',
      task: '30 Weepinbell e 20 Gloom',
      reward: '30K EXP',
      pokemons: ['Weepinbell', 'Gloom'],
    },
    {
      npc: 'Liam', location: 'Saffron, na Esquerda do CP', difficulty: 'easy',
      task: 'Derrotar 1 Shiny Rattata e 30 Rattatas',
      reward: '15K EXP e 1 Bubble Gum',
      pokemons: ['Shiny Rattata', 'Rattata'],
    },
    {
      npc: 'Lara', location: 'Saffron (Saída Norte/Sul de Saffron)', difficulty: 'easy',
      task: 'Derrotar 1 Shiny Pidgey e 1 Shiny Spearow',
      reward: '30K EXP e 1 Bubble Gum',
      pokemons: ['Shiny Pidgey', 'Shiny Spearow'],
    },
    {
      npc: 'Leah', location: 'Saffron', difficulty: 'easy',
      task: 'Derrotar 80 Raticates',
      reward: '50K EXP',
      pokemons: ['Raticate'],
    },

    // ── INTERMEDIÁRIAS ───────────────────────────────────────────────────
    {
      npc: 'Owen', location: 'Cerulean, na saída Sul da cidade', difficulty: 'medium',
      task: '1 Shiny Sandshrew, 1 Shiny Diglett, 50 Diglett e 50 Sandshrew',
      reward: '50K EXP e 1 Bubble Gum',
      pokemons: ['Shiny Sandshrew', 'Shiny Diglett', 'Diglett', 'Sandshrew'],
    },
    {
      npc: 'Stella', location: 'Cinnabar, em Frente ao Market', difficulty: 'medium',
      task: '30 Charmander, 50 Charmeleon e 1 Shiny Charmander',
      reward: '50K EXP e 1 Bubble Gum',
      pokemons: ['Charmander', 'Charmeleon', 'Shiny Charmander'],
    },
    {
      npc: 'Connor', location: 'Subterrâneo do pântano venenoso a esquerda de Cerulean City', difficulty: 'medium',
      task: '100 Muk',
      reward: '50K EXP e 1 Bubble Gum',
      pokemons: ['Muk'],
    },
    {
      npc: 'Zoe', location: 'Pântano venenoso a esquerda de Cerulean City', difficulty: 'medium',
      task: '50 Arbok e 1 Shiny Arbok',
      reward: '50K EXP e 1 Bubble Gum',
      pokemons: ['Arbok', 'Shiny Arbok'],
    },

    // ── AVANÇADAS ────────────────────────────────────────────────────────
    {
      npc: 'Henry', location: 'North de Olivine, na Floresta', difficulty: 'hard',
      task: '300 Miltank e 1 Shiny Miltank',
      reward: '500K EXP e 2 Bubble Gum',
      pokemons: ['Miltank', 'Shiny Miltank'],
    },
    {
      npc: 'Penélope', location: 'Saffron', difficulty: 'hard',
      task: '150 Meganium, 1 Shiny Meganium, 150 Venusaur e 1 Shiny Venusaur',
      reward: '500K EXP e 2 Bubble Gum',
      pokemons: ['Meganium', 'Shiny Meganium', 'Venusaur', 'Shiny Venusaur'],
    },
    {
      npc: 'Jackson', location: 'Lavender, Direita do CP', difficulty: 'hard',
      task: '300 Gengar e 1 Shiny Gengar',
      reward: '500K EXP e 2 Bubble Gum',
      pokemons: ['Gengar', 'Shiny Gengar'],
    },
    {
      npc: 'Mia', location: 'Lavender, Sul do CP', difficulty: 'hard',
      task: '300 Misdreavus e 1 Shiny Misdreavus',
      reward: '500K EXP e 2 Bubble Gum',
      pokemons: ['Misdreavus', 'Shiny Misdreavus'],
    },
    {
      npc: 'Sebastian', location: 'Vermilion, Próximo ao Navio', difficulty: 'hard',
      task: '300 Clefable e 1 Shiny Clefable',
      reward: '500K EXP e 2 Bubble Gum',
      pokemons: ['Clefable', 'Shiny Clefable'],
    },
    {
      npc: 'Autumn', location: 'Vermilion, Próximo ao Navio', difficulty: 'hard',
      task: '300 Skarmory e 1 Shiny Skarmory',
      reward: '500K EXP e 2 Bubble Gum',
      pokemons: ['Skarmory', 'Shiny Skarmory'],
    },
    {
      npc: 'Violet', location: 'Vermilion, no Sul do CP', difficulty: 'hard',
      task: '300 Wigglytuff e 1 Shiny Wigglytuff',
      reward: '500K EXP e 2 Bubble Gum',
      pokemons: ['Wigglytuff', 'Shiny Wigglytuff'],
    },
    {
      npc: 'Caleb', location: 'Viridian (ao lado do CP)', difficulty: 'hard',
      task: '300 Nidoking e 1 Shiny Nidoking',
      reward: '500K EXP e 2 Bubble Gum',
      pokemons: ['Nidoking', 'Shiny Nidoking'],
    },
    {
      npc: 'Elijah', location: 'Viridian (Acima do Mark)', difficulty: 'hard',
      task: '300 Nidoqueen e 1 Shiny Nidoqueen',
      reward: '500K EXP e 2 Bubble Gum',
      pokemons: ['Nidoqueen', 'Shiny Nidoqueen'],
    },
    {
      npc: 'Bert', location: 'Floresta de Viridian', difficulty: 'hard',
      task: '300 Charizard, 300 Venusaur e 300 Blastoise',
      reward: '500K EXP e 2 Bubble Gum',
      pokemons: ['Charizard', 'Venusaur', 'Blastoise'],
    },
    {
      npc: 'Eva', location: 'Shiny Totodile Den\'s', difficulty: 'hard',
      task: '300 Blastoise e 1 Shiny Blastoise',
      reward: '500K EXP e 2 Bubble Gum',
      pokemons: ['Blastoise', 'Shiny Blastoise'],
    },
    {
      npc: 'Grayson', location: 'Dentro de Cinnabar, Próximo ao CP', difficulty: 'hard',
      task: '300 Houndoom e 1 Shiny Houndoom',
      reward: '500K EXP e 2 Bubble Gum',
      pokemons: ['Houndoom', 'Shiny Houndoom'],
    },
    {
      npc: 'Oliver', location: 'Dentro de Cinnabar, Próximo ao CP', difficulty: 'hard',
      task: '300 Charizard e 1 Shiny Charizard',
      reward: '500K EXP e 2 Bubble Gum',
      pokemons: ['Charizard', 'Shiny Charizard'],
    },
    {
      npc: 'Chloe', location: 'Dentro de Cinnabar, Esquerda do CP', difficulty: 'hard',
      task: '300 Arcanine e 1 Shiny Arcanine',
      reward: '500K EXP e 2 Bubble Gum',
      pokemons: ['Arcanine', 'Shiny Arcanine'],
    },
    {
      npc: 'Aurora', location: 'Ilha de Gelo Kanto, Próximo a Shiny Seel\'s Den', difficulty: 'hard',
      task: '300 Cloyster e 1 Shiny Cloyster',
      reward: '500K EXP e 2 Bubble Gum',
      pokemons: ['Cloyster', 'Shiny Cloyster'],
    },
    {
      npc: 'Benjamin', location: 'Ilha de Gelo Kanto, na Direita da Shiny Lapras Den\'s', difficulty: 'hard',
      task: '300 Piloswine e 1 Shiny Piloswine',
      reward: '500K EXP e 2 Bubble Gum',
      pokemons: ['Piloswine', 'Shiny Piloswine'],
    },
    {
      npc: 'Lucas', location: 'Ilha de Gelo Kanto, no Shiny Dewgong\'s Den\'s', difficulty: 'hard',
      task: '300 Dewgong e 1 Shiny Dewgong',
      reward: '500K EXP e 2 Bubble Gum',
      pokemons: ['Dewgong', 'Shiny Dewgong'],
    },
    {
      npc: 'Scarlet', location: 'Direita de Mahogany City, na Entrada da Montanha', difficulty: 'hard',
      task: '300 Dragonair e 1 Shiny Dragonair',
      reward: '500K EXP e 2 Bubble Gum',
      pokemons: ['Dragonair', 'Shiny Dragonair'],
    },
    {
      npc: 'Isaac', location: 'Ilha de Gelo Kanto, Próximo a Shiny Dratini\'s Den', difficulty: 'hard',
      task: '300 Alakazam e 1 Shiny Alakazam',
      reward: '500K EXP e 2 Bubble Gum',
      pokemons: ['Alakazam', 'Shiny Alakazam'],
    },

    // ── ÉPICAS ────────────────────────────────────────────────────────────
    {
      npc: 'Doris', location: 'Na Esquerda de Cerulean, na Floresta', difficulty: 'epic',
      task: '1500 Snorlax e 25 Shiny Snorlax',
      reward: '1KK EXP e desbloqueia a troca do item Shiny',
      pokemons: ['Snorlax', 'Shiny Snorlax'],
    },
    {
      npc: 'Riley', location: 'No Safari, Próximo a Dungeon de Tauros', difficulty: 'epic',
      task: '1500 Tauros e 25 Shiny Tauros',
      reward: '1KK EXP e desbloqueia a troca do item Shiny',
      pokemons: ['Tauros', 'Shiny Tauros'],
    },
    {
      npc: 'Marcel', location: 'Esquerda de Fuchsia, no Safari', difficulty: 'epic',
      task: '1500 Mr.Mime e 25 Shiny Mr.Mime',
      reward: '1KK EXP e desbloqueia a troca do item Shiny',
      pokemons: ['Mr.Mime', 'Shiny Mr.Mime'],
    },
    {
      npc: 'Dexter', location: 'Esquerda de Fuchsia, na Hunt de Pinsir', difficulty: 'epic',
      task: '1500 Pinsir e 25 Shiny Pinsir',
      reward: '1KK EXP e desbloqueia a troca do item Shiny',
      pokemons: ['Pinsir', 'Shiny Pinsir'],
    },
    {
      npc: 'Blade', location: 'Esquerda de Fuchsia, na Hunt -1 de Pinsir', difficulty: 'epic',
      task: '1500 Scyther e 25 Shiny Scyther',
      reward: '1KK EXP e desbloqueia a troca do item Shiny',
      pokemons: ['Scyther', 'Shiny Scyther'],
    },
    {
      npc: 'Matilda', location: 'Esquerda de Fuchsia, na Hunt de Kangaskhan', difficulty: 'epic',
      task: '1500 Kangaskhan e 25 Shiny Kangaskhan',
      reward: '1KK EXP e desbloqueia a troca do item Shiny',
      pokemons: ['Kangaskhan', 'Shiny Kangaskhan'],
    },
    {
      npc: 'Camila', location: 'Direita de Fuchsia, na Hunt de Farfetch\'d', difficulty: 'epic',
      task: '1500 Farfetch\'d e 25 Shiny Farfetch\'d',
      reward: '1KK EXP e desbloqueia a troca do item Shiny',
      pokemons: ["Farfetch'd", "Shiny Farfetch'd"],
    },
    {
      npc: 'Coral', location: 'Sul de Fuchsia, Próximo a Dungeon de Lapras', difficulty: 'epic',
      task: '1500 Lapras e 25 Shiny Lapras',
      reward: '1KK EXP e desbloqueia a troca do item Shiny',
      pokemons: ['Lapras', 'Shiny Lapras'],
    },
    {
      npc: 'Wendy', location: 'North de Violet City, no Sul da Hunt de Murkrow', difficulty: 'epic',
      task: '1500 Misdreavus e 25 Shiny Misdreavus',
      reward: '1KK EXP e desbloqueia a troca do item Shiny',
      pokemons: ['Misdreavus', 'Shiny Misdreavus'],
    },
    {
      npc: 'Wanda', location: 'Sul de Goldenrod City, No -1 da Hunt de Girafarig', difficulty: 'epic',
      task: '1500 Wobbuffet e 25 Shiny Wobbuffet',
      reward: '1KK EXP e desbloqueia a troca do item Shiny',
      pokemons: ['Wobbuffet', 'Shiny Wobbuffet'],
    },
    {
      npc: 'Blaze', location: 'Direita de Blackthorn City, Na Hunt de Skarmory', difficulty: 'epic',
      task: '1500 Skarmory e 25 Shiny Skarmory',
      reward: '1KK EXP e desbloqueia a troca do item Shiny',
      pokemons: ['Skarmory', 'Shiny Skarmory'],
    },
    {
      npc: 'Daisy', location: 'North de Olivine, na MooMoo Farm', difficulty: 'epic',
      task: '1500 Miltank e 25 Shiny Miltank',
      reward: '1KK EXP e desbloqueia a troca do item Shiny',
      pokemons: ['Miltank', 'Shiny Miltank'],
    },
    {
      npc: 'Marissa', location: 'Próximo a Wildscape de Mantine em, Olivine City', difficulty: 'epic',
      task: '1500 Mantine e 25 Shiny Mantine',
      reward: '1KK EXP e desbloqueia a troca do item Shiny',
      pokemons: ['Mantine', 'Shiny Mantine'],
    },
  ];

  // ── Config de dificuldade ────────────────────────────────────────────────
  var DIFF_CONFIG = {
    easy:   { label: 'Easy',           color: '#4ade80', bg: 'rgba(74,222,128,.12)',  border: 'rgba(74,222,128,.3)',  icon: '🌿' },
    medium: { label: 'Intermediária',  color: '#facc15', bg: 'rgba(250,204,21,.10)',  border: 'rgba(250,204,21,.3)',  icon: '⚡' },
    hard:   { label: 'Avançada',       color: '#f87171', bg: 'rgba(248,113,113,.10)', border: 'rgba(248,113,113,.3)', icon: '🔥' },
    epic:   { label: 'Épica',          color: '#c084fc', bg: 'rgba(192,132,252,.10)', border: 'rgba(192,132,252,.3)', icon: '💎' },
  };

  var DIFF_ORDER = ['easy', 'medium', 'hard', 'epic'];

  // ── Estado ───────────────────────────────────────────────────────────────
  var _query = '';
  var _filterDiff = 'all';

  // ── Render principal ─────────────────────────────────────────────────────
  function _render() {
    var container = document.getElementById('wiki-tasks-grid');
    if (!container) return;

    var q = _query.trim().toLowerCase();

    var filtered = TASKS.filter(function (t) {
      var diffOk = _filterDiff === 'all' || t.difficulty === _filterDiff;
      if (!diffOk) return false;
      if (!q) return true;
      if (t.npc.toLowerCase().includes(q)) return true;
      if (t.location.toLowerCase().includes(q)) return true;
      if (t.pokemons.some(function (p) { return p.toLowerCase().includes(q); })) return true;
      return false;
    });

    // Count label
    var countEl = document.getElementById('wiki-tasks-count');
    if (countEl) countEl.textContent = filtered.length + ' tasks';

    if (!filtered.length) {
      container.innerHTML =
        '<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--muted)">' +
        '<div style="font-size:2rem;margin-bottom:8px">🔍</div>' +
        '<div>Nenhuma task encontrada para "<strong style=\'color:var(--text)\'>' + _esc(q) + '</strong>"</div>' +
        '</div>';
      return;
    }

    // Group by difficulty maintaining order
    var groups = {};
    DIFF_ORDER.forEach(function (d) { groups[d] = []; });
    filtered.forEach(function (t) { groups[t.difficulty].push(t); });

    var html = '';
    DIFF_ORDER.forEach(function (diff) {
      var list = groups[diff];
      if (!list.length) return;
      var cfg = DIFF_CONFIG[diff];
      html += '<div class="wt-section" style="grid-column:1/-1">';
      html += '<div class="wt-section-header" style="border-color:' + cfg.border + '">';
      html += '<span class="wt-section-icon">' + cfg.icon + '</span>';
      html += '<span class="wt-section-label" style="color:' + cfg.color + '">' + cfg.label.toUpperCase() + '</span>';
      html += '<span class="wt-section-count" style="background:' + cfg.bg + ';color:' + cfg.color + ';border:1px solid ' + cfg.border + '">' + list.length + '</span>';
      html += '</div>';
      html += '<div class="wt-cards">';
      list.forEach(function (t) {
        html += _cardHtml(t, cfg);
      });
      html += '</div></div>';
    });

    container.innerHTML = html;
  }

  function _cardHtml(t, cfg) {
    var pokemonTags = t.pokemons.map(function (p) {
      var isShiny = p.toLowerCase().includes('shiny');
      return '<span class="wt-poke-tag' + (isShiny ? ' shiny' : '') + '">' +
        (isShiny ? '✨ ' : '') + _esc(p) +
        '</span>';
    }).join('');

    return '<div class="wt-card" style="border-color:' + cfg.border + '">' +
      '<div class="wt-card-header">' +
        '<div class="wt-npc-name">' + _esc(t.npc) + '</div>' +
        '<div class="wt-diff-badge" style="background:' + cfg.bg + ';color:' + cfg.color + ';border-color:' + cfg.border + '">' +
          cfg.icon + ' ' + cfg.label +
        '</div>' +
      '</div>' +
      '<div class="wt-location">' +
        '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
        _esc(t.location) +
      '</div>' +
      '<div class="wt-task-row">' +
        '<span class="wt-task-label">Task</span>' +
        '<span class="wt-task-text">' + _esc(t.task) + '</span>' +
      '</div>' +
      '<div class="wt-reward-row">' +
        '<span class="wt-reward-label">Reward</span>' +
        '<span class="wt-reward-text">' + _esc(t.reward) + '</span>' +
      '</div>' +
      '<div class="wt-poke-tags">' + pokemonTags + '</div>' +
    '</div>';
  }

  function _esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Inject CSS ───────────────────────────────────────────────────────────
  function _injectCSS() {
    if (document.getElementById('wt-styles')) return;
    var s = document.createElement('style');
    s.id = 'wt-styles';
    s.textContent = [
      /* Controls */
      '.wt-controls{display:flex;align-items:center;gap:12px;padding:16px 20px;flex-wrap:wrap;border-bottom:1px solid var(--border)}',
      '.wt-search-wrap{display:flex;align-items:center;gap:8px;flex:1;min-width:200px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px}',
      '.wt-search-wrap svg{flex-shrink:0;opacity:.5}',
      '.wt-search-wrap input{background:none;border:none;outline:none;color:var(--text);font-family:var(--font-body);font-size:.9rem;width:100%}',
      '.wt-search-wrap input::placeholder{color:var(--muted)}',
      '.wt-filter-group{display:flex;gap:6px;flex-wrap:wrap}',
      '.wt-filter-btn{padding:6px 14px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--muted);font-family:var(--font-body);font-size:.8rem;cursor:pointer;transition:all .15s;white-space:nowrap}',
      '.wt-filter-btn:hover{border-color:var(--border-hover);color:var(--text)}',
      '.wt-filter-btn.active{background:var(--blue);border-color:var(--blue);color:#fff}',
      '.wt-filter-btn.diff-easy.active{background:rgba(74,222,128,.2);border-color:rgba(74,222,128,.5);color:#4ade80}',
      '.wt-filter-btn.diff-medium.active{background:rgba(250,204,21,.15);border-color:rgba(250,204,21,.5);color:#facc15}',
      '.wt-filter-btn.diff-hard.active{background:rgba(248,113,113,.15);border-color:rgba(248,113,113,.5);color:#f87171}',
      '.wt-filter-btn.diff-epic.active{background:rgba(192,132,252,.15);border-color:rgba(192,132,252,.5);color:#c084fc}',
      '.wt-count{color:var(--muted);font-size:.82rem;white-space:nowrap}',
      /* Grid */
      '#wiki-tasks-grid{padding:20px;display:grid;gap:24px}',
      /* Section */
      '.wt-section{}',
      '.wt-section-header{display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid}',
      '.wt-section-icon{font-size:1.1rem}',
      '.wt-section-label{font-family:var(--font-title);font-size:.85rem;font-weight:700;letter-spacing:.08em;flex:1}',
      '.wt-section-count{padding:2px 10px;border-radius:20px;font-size:.75rem;font-weight:700}',
      /* Cards grid */
      '.wt-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}',
      /* Card */
      '.wt-card{background:var(--surface2);border:1px solid;border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;transition:transform .15s,box-shadow .15s}',
      '.wt-card:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(0,0,0,.35)}',
      '.wt-card-header{display:flex;align-items:center;justify-content:space-between;gap:8px}',
      '.wt-npc-name{font-family:var(--font-title);font-size:.95rem;color:var(--text);font-weight:700}',
      '.wt-diff-badge{padding:3px 10px;border-radius:20px;border:1px solid;font-size:.72rem;font-weight:700;white-space:nowrap}',
      '.wt-location{display:flex;align-items:center;gap:5px;color:var(--muted);font-size:.8rem;line-height:1.3}',
      '.wt-location svg{flex-shrink:0;opacity:.6}',
      '.wt-task-row,.wt-reward-row{display:flex;gap:6px;align-items:flex-start;font-size:.82rem}',
      '.wt-task-label,.wt-reward-label{flex-shrink:0;font-weight:700;padding:1px 7px;border-radius:4px;font-size:.72rem;margin-top:1px}',
      '.wt-task-label{background:rgba(58,140,255,.15);color:var(--blue-bright)}',
      '.wt-reward-label{background:rgba(240,180,41,.12);color:var(--gold-bright)}',
      '.wt-task-text{color:var(--text);line-height:1.4}',
      '.wt-reward-text{color:var(--gold-bright);line-height:1.4}',
      '.wt-poke-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:2px}',
      '.wt-poke-tag{padding:2px 9px;border-radius:20px;background:var(--surface3);border:1px solid var(--border);color:var(--muted);font-size:.73rem;cursor:pointer;transition:all .12s}',
      '.wt-poke-tag:hover{border-color:var(--border-hover);color:var(--text)}',
      '.wt-poke-tag.shiny{background:rgba(255,210,70,.08);border-color:rgba(255,210,70,.3);color:#ffd146}',
      '.wt-poke-tag.shiny:hover{background:rgba(255,210,70,.18);color:#ffe680}',
      /* responsive */
      '@media(max-width:600px){.wt-cards{grid-template-columns:1fr}.wt-controls{padding:12px}}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Mount panel into DOM ─────────────────────────────────────────────────
  function _mount() {
    var existing = document.getElementById('wiki-tab-tasks');
    if (existing) { _render(); return; }

    // 1. Add subtab button
    var subtabs = document.getElementById('wiki-subtabs');
    if (subtabs) {
      var btn = document.createElement('button');
      btn.className = 'wiki-subtab-btn';
      btn.setAttribute('onclick', "switchWikiTab('tasks', this)");
      btn.innerHTML = '<span class="wiki-subtab-icon">📋</span> Tasks';
      subtabs.appendChild(btn);
    }

    // 2. Create panel
    var panel = document.createElement('div');
    panel.id = 'wiki-tab-tasks';
    panel.className = 'wiki-subtab-content';
    panel.style.display = 'none';
    panel.innerHTML =
      '<div class="wt-controls">' +
        '<div class="wt-search-wrap">' +
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="white" stroke-width="1.5"/><path d="M10 10L13 13" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>' +
          '<input type="text" id="wiki-tasks-search" placeholder="Buscar por NPC ou Pokémon..." />' +
        '</div>' +
        '<div class="wt-filter-group">' +
          '<button class="wt-filter-btn active" data-diff="all" onclick="WikiTasks.setFilter(\'all\',this)">Todas</button>' +
          '<button class="wt-filter-btn diff-easy" data-diff="easy" onclick="WikiTasks.setFilter(\'easy\',this)">🌿 Easy</button>' +
          '<button class="wt-filter-btn diff-medium" data-diff="medium" onclick="WikiTasks.setFilter(\'medium\',this)">⚡ Intermediária</button>' +
          '<button class="wt-filter-btn diff-hard" data-diff="hard" onclick="WikiTasks.setFilter(\'hard\',this)">🔥 Avançada</button>' +
          '<button class="wt-filter-btn diff-epic" data-diff="epic" onclick="WikiTasks.setFilter(\'epic\',this)">💎 Épica</button>' +
        '</div>' +
        '<span class="wt-count" id="wiki-tasks-count"></span>' +
      '</div>' +
      '<div id="wiki-tasks-grid"></div>';

    // Insert after last wiki-subtab-content
    var allPanels = document.querySelectorAll('.wiki-subtab-content');
    var lastPanel = allPanels[allPanels.length - 1];
    if (lastPanel && lastPanel.parentNode) {
      lastPanel.parentNode.insertBefore(panel, lastPanel.nextSibling);
    } else {
      var wikiTab = document.getElementById('tab-wiki');
      if (wikiTab) wikiTab.appendChild(panel);
    }

    // 3. Search input listener
    var searchInput = document.getElementById('wiki-tasks-search');
    if (searchInput) {
      var _timer;
      searchInput.addEventListener('input', function () {
        clearTimeout(_timer);
        _query = this.value;
        _timer = setTimeout(_render, 120);
      });
    }

    // 4. Pokemon tag click → fills search
    panel.addEventListener('click', function (e) {
      var tag = e.target.closest('.wt-poke-tag');
      if (!tag) return;
      var name = tag.textContent.replace('✨ ', '').trim();
      _query = name;
      var inp = document.getElementById('wiki-tasks-search');
      if (inp) inp.value = name;
      _filterDiff = 'all';
      document.querySelectorAll('.wt-filter-btn').forEach(function (b) { b.classList.remove('active'); });
      var allBtn = panel.querySelector('[data-diff="all"]');
      if (allBtn) allBtn.classList.add('active');
      _render();
    });

    _render();
  }

  // ── Public API ────────────────────────────────────────────────────────────
  global.WikiTasks = {
    init: function () {
      _injectCSS();
      _mount();
    },
    setFilter: function (diff, btn) {
      _filterDiff = diff;
      document.querySelectorAll('.wt-filter-btn').forEach(function (b) { b.classList.remove('active'); });
      if (btn) btn.classList.add('active');
      _render();
    },
  };

  // ── Auto-init ─────────────────────────────────────────────────────────────
  document.addEventListener('db:ready', function () {
    WikiTasks.init();
  });

  // Fallback se db:ready já disparou
  if (document.readyState === 'complete') {
    setTimeout(function () { WikiTasks.init(); }, 300);
  }

}(window));
