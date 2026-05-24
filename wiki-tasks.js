/* ══════════════════════════════════════════════════════════════════════════
   wiki-tasks.js  —  Guia de Tasks NPC para a Wiki do PokeAlliance
   ══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  // ── Dados ────────────────────────────────────────────────────────────────
  var TASKS = [
    // EASY
    { npc:'Elena',    location:'Saffron',                                              difficulty:'easy',   task:'10 Weedle e 10 Caterpie',                                          reward:'10K EXP',                                        pokemons:['Weedle','Caterpie'] },
    { npc:'Maya',     location:'Saffron (Na Ponte próximo a saída Norte)',              difficulty:'easy',   task:'10 Kakuna e 10 Metapod',                                           reward:'20K EXP',                                        pokemons:['Kakuna','Metapod'] },
    { npc:'Aaron',    location:'Floresta Saffron/Cerulean (próximo do Shiny Magnemite Den)', difficulty:'easy', task:'20 Magnemite e 40 Voltorb',                                   reward:'30K EXP',                                        pokemons:['Magnemite','Voltorb'] },
    { npc:'Nina',     location:'Cerulean ao lado do Mark',                             difficulty:'easy',   task:'30 Weepinbell e 20 Gloom',                                         reward:'30K EXP',                                        pokemons:['Weepinbell','Gloom'] },
    { npc:'Liam',     location:'Saffron, na Esquerda do CP',                           difficulty:'easy',   task:'Derrotar 1 Shiny Rattata e 30 Rattatas',                           reward:'15K EXP e 1 Bubble Gum',                         pokemons:['Shiny Rattata','Rattata'] },
    { npc:'Lara',     location:'Saffron (Saída Norte/Sul de Saffron)',                 difficulty:'easy',   task:'Derrotar 1 Shiny Pidgey e 1 Shiny Spearow',                        reward:'30K EXP e 1 Bubble Gum',                         pokemons:['Shiny Pidgey','Shiny Spearow'] },
    { npc:'Leah',     location:'Saffron',                                              difficulty:'easy',   task:'Derrotar 80 Raticates',                                            reward:'50K EXP',                                        pokemons:['Raticate'] },
    // INTERMEDIÁRIAS
    { npc:'Owen',     location:'Cerulean, na saída Sul da cidade',                     difficulty:'medium', task:'1 Shiny Sandshrew, 1 Shiny Diglett, 50 Diglett e 50 Sandshrew',   reward:'50K EXP e 1 Bubble Gum',                         pokemons:['Shiny Sandshrew','Shiny Diglett','Diglett','Sandshrew'] },
    { npc:'Stella',   location:'Cinnabar, em Frente ao Market',                        difficulty:'medium', task:'30 Charmander, 50 Charmeleon e 1 Shiny Charmander',               reward:'50K EXP e 1 Bubble Gum',                         pokemons:['Charmander','Charmeleon','Shiny Charmander'] },
    { npc:'Connor',   location:'Subterrâneo do pântano venenoso a esquerda de Cerulean City', difficulty:'medium', task:'100 Muk',                                               reward:'50K EXP e 1 Bubble Gum',                         pokemons:['Muk'] },
    { npc:'Zoe',      location:'Pântano venenoso a esquerda de Cerulean City',         difficulty:'medium', task:'50 Arbok e 1 Shiny Arbok',                                         reward:'50K EXP e 1 Bubble Gum',                         pokemons:['Arbok','Shiny Arbok'] },
    // AVANÇADAS
    { npc:'Henry',    location:'North de Olivine, na Floresta',                        difficulty:'hard',   task:'300 Miltank e 1 Shiny Miltank',                                    reward:'500K EXP e 2 Bubble Gum',                        pokemons:['Miltank','Shiny Miltank'] },
    { npc:'Penélope', location:'Saffron',                                              difficulty:'hard',   task:'150 Meganium, 1 Shiny Meganium, 150 Venusaur e 1 Shiny Venusaur', reward:'500K EXP e 2 Bubble Gum',                        pokemons:['Meganium','Shiny Meganium','Venusaur','Shiny Venusaur'] },
    { npc:'Jackson',  location:'Lavender, Direita do CP',                              difficulty:'hard',   task:'300 Gengar e 1 Shiny Gengar',                                      reward:'500K EXP e 2 Bubble Gum',                        pokemons:['Gengar','Shiny Gengar'] },
    { npc:'Mia',      location:'Lavender, Sul do CP',                                  difficulty:'hard',   task:'300 Misdreavus e 1 Shiny Misdreavus',                              reward:'500K EXP e 2 Bubble Gum',                        pokemons:['Misdreavus','Shiny Misdreavus'] },
    { npc:'Sebastian',location:'Vermilion, Próximo ao Navio',                          difficulty:'hard',   task:'300 Clefable e 1 Shiny Clefable',                                  reward:'500K EXP e 2 Bubble Gum',                        pokemons:['Clefable','Shiny Clefable'] },
    { npc:'Autumn',   location:'Vermilion, Próximo ao Navio',                          difficulty:'hard',   task:'300 Skarmory e 1 Shiny Skarmory',                                  reward:'500K EXP e 2 Bubble Gum',                        pokemons:['Skarmory','Shiny Skarmory'] },
    { npc:'Violet',   location:'Vermilion, no Sul do CP',                              difficulty:'hard',   task:'300 Wigglytuff e 1 Shiny Wigglytuff',                              reward:'500K EXP e 2 Bubble Gum',                        pokemons:['Wigglytuff','Shiny Wigglytuff'] },
    { npc:'Caleb',    location:'Viridian (ao lado do CP)',                              difficulty:'hard',   task:'300 Nidoking e 1 Shiny Nidoking',                                  reward:'500K EXP e 2 Bubble Gum',                        pokemons:['Nidoking','Shiny Nidoking'] },
    { npc:'Elijah',   location:'Viridian (Acima do Mark)',                              difficulty:'hard',   task:'300 Nidoqueen e 1 Shiny Nidoqueen',                                reward:'500K EXP e 2 Bubble Gum',                        pokemons:['Nidoqueen','Shiny Nidoqueen'] },
    { npc:'Bert',     location:'Floresta de Viridian',                                 difficulty:'hard',   task:'300 Charizard, 300 Venusaur e 300 Blastoise',                      reward:'500K EXP e 2 Bubble Gum',                        pokemons:['Charizard','Venusaur','Blastoise'] },
    { npc:'Eva',      location:"Shiny Totodile Den's",                                 difficulty:'hard',   task:'300 Blastoise e 1 Shiny Blastoise',                                reward:'500K EXP e 2 Bubble Gum',                        pokemons:['Blastoise','Shiny Blastoise'] },
    { npc:'Grayson',  location:'Dentro de Cinnabar, Próximo ao CP',                    difficulty:'hard',   task:'300 Houndoom e 1 Shiny Houndoom',                                  reward:'500K EXP e 2 Bubble Gum',                        pokemons:['Houndoom','Shiny Houndoom'] },
    { npc:'Oliver',   location:'Dentro de Cinnabar, Próximo ao CP',                    difficulty:'hard',   task:'300 Charizard e 1 Shiny Charizard',                                reward:'500K EXP e 2 Bubble Gum',                        pokemons:['Charizard','Shiny Charizard'] },
    { npc:'Chloe',    location:'Dentro de Cinnabar, Esquerda do CP',                   difficulty:'hard',   task:'300 Arcanine e 1 Shiny Arcanine',                                  reward:'500K EXP e 2 Bubble Gum',                        pokemons:['Arcanine','Shiny Arcanine'] },
    { npc:'Aurora',   location:"Ilha de Gelo Kanto, Próximo a Shiny Seel's Den",       difficulty:'hard',   task:'300 Cloyster e 1 Shiny Cloyster',                                  reward:'500K EXP e 2 Bubble Gum',                        pokemons:['Cloyster','Shiny Cloyster'] },
    { npc:'Benjamin', location:"Ilha de Gelo Kanto, na Direita da Shiny Lapras Den's", difficulty:'hard',   task:'300 Piloswine e 1 Shiny Piloswine',                                reward:'500K EXP e 2 Bubble Gum',                        pokemons:['Piloswine','Shiny Piloswine'] },
    { npc:'Lucas',    location:"Ilha de Gelo Kanto, no Shiny Dewgong's Den's",         difficulty:'hard',   task:'300 Dewgong e 1 Shiny Dewgong',                                    reward:'500K EXP e 2 Bubble Gum',                        pokemons:['Dewgong','Shiny Dewgong'] },
    { npc:'Scarlet',  location:'Direita de Mahogany City, na Entrada da Montanha',     difficulty:'hard',   task:'300 Dragonair e 1 Shiny Dragonair',                                reward:'500K EXP e 2 Bubble Gum',                        pokemons:['Dragonair','Shiny Dragonair'] },
    { npc:'Isaac',    location:"Ilha de Gelo Kanto, Próximo a Shiny Dratini's Den",    difficulty:'hard',   task:'300 Alakazam e 1 Shiny Alakazam',                                  reward:'500K EXP e 2 Bubble Gum',                        pokemons:['Alakazam','Shiny Alakazam'] },
    // ÉPICAS
    { npc:'Doris',    location:'Na Esquerda de Cerulean, na Floresta',                 difficulty:'epic',   task:'1500 Snorlax e 25 Shiny Snorlax',                                  reward:'1KK EXP e desbloqueia a troca do item Shiny',    pokemons:['Snorlax','Shiny Snorlax'] },
    { npc:'Riley',    location:'No Safari, Próximo a Dungeon de Tauros',               difficulty:'epic',   task:'1500 Tauros e 25 Shiny Tauros',                                    reward:'1KK EXP e desbloqueia a troca do item Shiny',    pokemons:['Tauros','Shiny Tauros'] },
    { npc:'Marcel',   location:'Esquerda de Fuchsia, no Safari',                       difficulty:'epic',   task:'1500 Mr.Mime e 25 Shiny Mr.Mime',                                  reward:'1KK EXP e desbloqueia a troca do item Shiny',    pokemons:['Mr.Mime','Shiny Mr.Mime'] },
    { npc:'Dexter',   location:'Esquerda de Fuchsia, na Hunt de Pinsir',               difficulty:'epic',   task:'1500 Pinsir e 25 Shiny Pinsir',                                    reward:'1KK EXP e desbloqueia a troca do item Shiny',    pokemons:['Pinsir','Shiny Pinsir'] },
    { npc:'Blade',    location:'Esquerda de Fuchsia, na Hunt -1 de Pinsir',            difficulty:'epic',   task:'1500 Scyther e 25 Shiny Scyther',                                  reward:'1KK EXP e desbloqueia a troca do item Shiny',    pokemons:['Scyther','Shiny Scyther'] },
    { npc:'Matilda',  location:'Esquerda de Fuchsia, na Hunt de Kangaskhan',           difficulty:'epic',   task:'1500 Kangaskhan e 25 Shiny Kangaskhan',                             reward:'1KK EXP e desbloqueia a troca do item Shiny',    pokemons:['Kangaskhan','Shiny Kangaskhan'] },
    { npc:'Camila',   location:"Direita de Fuchsia, na Hunt de Farfetch'd",            difficulty:'epic',   task:"1500 Farfetch'd e 25 Shiny Farfetch'd",                             reward:'1KK EXP e desbloqueia a troca do item Shiny',    pokemons:["Farfetch'd","Shiny Farfetch'd"] },
    { npc:'Coral',    location:'Sul de Fuchsia, Próximo a Dungeon de Lapras',          difficulty:'epic',   task:'1500 Lapras e 25 Shiny Lapras',                                    reward:'1KK EXP e desbloqueia a troca do item Shiny',    pokemons:['Lapras','Shiny Lapras'] },
    { npc:'Wendy',    location:'North de Violet City, no Sul da Hunt de Murkrow',      difficulty:'epic',   task:'1500 Misdreavus e 25 Shiny Misdreavus',                             reward:'1KK EXP e desbloqueia a troca do item Shiny',    pokemons:['Misdreavus','Shiny Misdreavus'] },
    { npc:'Wanda',    location:'Sul de Goldenrod City, No -1 da Hunt de Girafarig',    difficulty:'epic',   task:'1500 Wobbuffet e 25 Shiny Wobbuffet',                               reward:'1KK EXP e desbloqueia a troca do item Shiny',    pokemons:['Wobbuffet','Shiny Wobbuffet'] },
    { npc:'Blaze',    location:'Direita de Blackthorn City, Na Hunt de Skarmory',      difficulty:'epic',   task:'1500 Skarmory e 25 Shiny Skarmory',                                 reward:'1KK EXP e desbloqueia a troca do item Shiny',    pokemons:['Skarmory','Shiny Skarmory'] },
    { npc:'Daisy',    location:'North de Olivine, na MooMoo Farm',                     difficulty:'epic',   task:'1500 Miltank e 25 Shiny Miltank',                                   reward:'1KK EXP e desbloqueia a troca do item Shiny',    pokemons:['Miltank','Shiny Miltank'] },
    { npc:'Marissa',  location:'Próximo a Wildscape de Mantine em, Olivine City',      difficulty:'epic',   task:'1500 Mantine e 25 Shiny Mantine',                                   reward:'1KK EXP e desbloqueia a troca do item Shiny',    pokemons:['Mantine','Shiny Mantine'] },
  ];

  var DIFF = {
    easy:   { label:'Easy',          color:'#4ade80', bg:'rgba(74,222,128,.12)',  border:'rgba(74,222,128,.3)',  icon:'🌿' },
    medium: { label:'Intermediária', color:'#facc15', bg:'rgba(250,204,21,.10)',  border:'rgba(250,204,21,.3)',  icon:'⚡' },
    hard:   { label:'Avançada',      color:'#f87171', bg:'rgba(248,113,113,.10)', border:'rgba(248,113,113,.3)', icon:'🔥' },
    epic:   { label:'Épica',         color:'#c084fc', bg:'rgba(192,132,252,.10)', border:'rgba(192,132,252,.3)', icon:'💎' },
  };
  var DIFF_ORDER = ['easy','medium','hard','epic'];

  var _q = '', _diff = 'all';

  function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function _render() {
    var grid = document.getElementById('wt-grid');
    if (!grid) return;
    var q = _q.trim().toLowerCase();
    var list = TASKS.filter(function(t){
      if (_diff !== 'all' && t.difficulty !== _diff) return false;
      if (!q) return true;
      return t.npc.toLowerCase().includes(q) ||
             t.location.toLowerCase().includes(q) ||
             t.pokemons.some(function(p){ return p.toLowerCase().includes(q); });
    });
    var countEl = document.getElementById('wt-count');
    if (countEl) countEl.textContent = list.length + ' tasks';
    if (!list.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:56px 20px;color:var(--muted)"><div style="font-size:2.5rem;margin-bottom:12px">🔍</div><div style="font-size:.95rem">Nenhuma task encontrada para <strong style="color:var(--text)">'+_esc(q)+'</strong></div></div>';
      return;
    }
    var groups = {}; DIFF_ORDER.forEach(function(d){ groups[d]=[]; });
    list.forEach(function(t){ groups[t.difficulty].push(t); });
    var html = '';
    DIFF_ORDER.forEach(function(d){
      if (!groups[d].length) return;
      var cfg = DIFF[d];
      html += '<div style="grid-column:1/-1">';
      html += '<div style="display:flex;align-items:center;gap:10px;padding-bottom:10px;margin-bottom:14px;border-bottom:2px solid '+cfg.border+'">';
      html += '<span style="font-size:1.2rem">'+cfg.icon+'</span>';
      html += '<span style="font-family:var(--font-title);font-size:.88rem;font-weight:700;letter-spacing:.08em;color:'+cfg.color+';flex:1">TASKS '+cfg.label.toUpperCase()+'</span>';
      html += '<span style="padding:2px 12px;border-radius:20px;background:'+cfg.bg+';border:1px solid '+cfg.border+';color:'+cfg.color+';font-size:.75rem;font-weight:700">'+groups[d].length+'</span>';
      html += '</div>';
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">';
      groups[d].forEach(function(t){
        var tags = t.pokemons.map(function(p){
          var sh = p.toLowerCase().includes('shiny');
          return '<span class="wt-tag'+(sh?' wt-tag-shiny':'')+'" onclick="WikiTasks._clickTag(\''+_esc(p)+'\')">'+(sh?'✨ ':'')+_esc(p)+'</span>';
        }).join('');
        html += '<div style="background:var(--surface2);border:1px solid '+cfg.border+';border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:8px;transition:transform .15s,box-shadow .15s" onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 6px 24px rgba(0,0,0,.4)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\'">';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">';
        html += '<span style="font-family:var(--font-title);font-size:.95rem;color:var(--text);font-weight:700">'+_esc(t.npc)+'</span>';
        html += '<span style="padding:3px 10px;border-radius:20px;border:1px solid '+cfg.border+';background:'+cfg.bg+';color:'+cfg.color+';font-size:.7rem;font-weight:700;white-space:nowrap">'+cfg.icon+' '+cfg.label+'</span>';
        html += '</div>';
        html += '<div style="display:flex;align-items:flex-start;gap:5px;color:var(--muted);font-size:.8rem;line-height:1.35"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;margin-top:1px;opacity:.55"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>'+_esc(t.location)+'</div>';
        html += '<div style="display:flex;gap:6px;align-items:flex-start;font-size:.82rem"><span style="flex-shrink:0;padding:1px 7px;border-radius:4px;background:rgba(58,140,255,.15);color:var(--blue-bright);font-size:.72rem;font-weight:700;margin-top:1px">Task</span><span style="color:var(--text);line-height:1.4">'+_esc(t.task)+'</span></div>';
        html += '<div style="display:flex;gap:6px;align-items:flex-start;font-size:.82rem"><span style="flex-shrink:0;padding:1px 7px;border-radius:4px;background:rgba(240,180,41,.12);color:var(--gold-bright);font-size:.72rem;font-weight:700;margin-top:1px">Reward</span><span style="color:var(--gold-bright);line-height:1.4">'+_esc(t.reward)+'</span></div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:2px">'+tags+'</div>';
        html += '</div>';
      });
      html += '</div></div>';
    });
    grid.innerHTML = html;
  }

  function _injectCSS() {
    if (document.getElementById('wt-css')) return;
    var s = document.createElement('style');
    s.id = 'wt-css';
    s.textContent =
      '.wt-tag{padding:2px 9px;border-radius:20px;background:var(--surface3);border:1px solid var(--border);color:var(--muted);font-size:.73rem;cursor:pointer;transition:all .12s}' +
      '.wt-tag:hover{border-color:var(--border-hover);color:var(--text)}' +
      '.wt-tag-shiny{background:rgba(255,210,70,.08);border-color:rgba(255,210,70,.3);color:#ffd146}' +
      '.wt-tag-shiny:hover{background:rgba(255,210,70,.18);color:#ffe680}' +
      '.wt-fbtn{padding:6px 14px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--muted);font-family:var(--font-body);font-size:.8rem;cursor:pointer;transition:all .15s;white-space:nowrap}' +
      '.wt-fbtn:hover{border-color:var(--border-hover);color:var(--text)}' +
      '.wt-fbtn.active{background:rgba(58,140,255,.2);border-color:var(--blue);color:var(--blue-bright)}' +
      '.wt-fbtn.fe.active{background:rgba(74,222,128,.15);border-color:rgba(74,222,128,.5);color:#4ade80}' +
      '.wt-fbtn.fm.active{background:rgba(250,204,21,.12);border-color:rgba(250,204,21,.5);color:#facc15}' +
      '.wt-fbtn.fh.active{background:rgba(248,113,113,.12);border-color:rgba(248,113,113,.5);color:#f87171}' +
      '.wt-fbtn.fp.active{background:rgba(192,132,252,.12);border-color:rgba(192,132,252,.5);color:#c084fc}';
    document.head.appendChild(s);
  }

  function renderTasks() {
    _injectCSS();
    var panel = document.getElementById('wiki-tab-tasks');
    if (!panel) return;
    if (panel.dataset.built) { _render(); return; }
    panel.dataset.built = '1';
    panel.innerHTML =
      '<div style="display:flex;align-items:center;gap:12px;padding:16px 20px;flex-wrap:wrap;border-bottom:1px solid var(--border)">' +
        '<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:200px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px">' +
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="opacity:.5"><circle cx="6" cy="6" r="4.5" stroke="white" stroke-width="1.5"/><path d="M10 10L13 13" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>' +
          '<input id="wt-search" type="text" placeholder="Buscar por NPC ou Pokémon..." style="background:none;border:none;outline:none;color:var(--text);font-family:var(--font-body);font-size:.9rem;width:100%">' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
          '<button class="wt-fbtn active"    onclick="WikiTasks._filt(\'all\',this)">Todas</button>' +
          '<button class="wt-fbtn fe"        onclick="WikiTasks._filt(\'easy\',this)">🌿 Easy</button>' +
          '<button class="wt-fbtn fm"        onclick="WikiTasks._filt(\'medium\',this)">⚡ Intermediária</button>' +
          '<button class="wt-fbtn fh"        onclick="WikiTasks._filt(\'hard\',this)">🔥 Avançada</button>' +
          '<button class="wt-fbtn fp"        onclick="WikiTasks._filt(\'epic\',this)">💎 Épica</button>' +
        '</div>' +
        '<span id="wt-count" style="color:var(--muted);font-size:.82rem;white-space:nowrap"></span>' +
      '</div>' +
      '<div id="wt-grid" style="padding:20px;display:grid;gap:24px"></div>';

    var inp = document.getElementById('wt-search');
    if (inp) {
      var t;
      inp.addEventListener('input', function(){ _q=this.value; clearTimeout(t); t=setTimeout(_render,130); });
    }
    _render();
  }

  global.WikiTasks = {
    renderTasks: renderTasks,
    _filt: function(d, btn) {
      _diff = d;
      var panel = document.getElementById('wiki-tab-tasks');
      if (panel) panel.querySelectorAll('.wt-fbtn').forEach(function(b){ b.classList.remove('active'); });
      if (btn) btn.classList.add('active');
      _render();
    },
    _clickTag: function(name) {
      _q = name; _diff = 'all';
      var inp = document.getElementById('wt-search');
      if (inp) inp.value = name;
      var panel = document.getElementById('wiki-tab-tasks');
      if (panel) panel.querySelectorAll('.wt-fbtn').forEach(function(b){ b.classList.remove('active'); });
      var allBtn = panel && panel.querySelector('.wt-fbtn');
      if (allBtn) allBtn.classList.add('active');
      _render();
    },
  };

  global.renderTasks = renderTasks;

}(window));
