/* ══════════════════════════════════════════════════════════════════════════
   wiki-tasks.js  —  Guia de Tasks NPC — estilo Hazard Tasks
   ══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var TASKS = [
    // EASY
    { npc:'Elena',    location:'Saffron',                                                    difficulty:'easy',   task:'10 Weedle e 10 Caterpie',                                          reward:'10K EXP',                                      pokemons:['Weedle','Caterpie'],                              imgUrl:'https://i.imgur.com/ExD0rvo.png' },
    { npc:'Maya',     location:'Saffron (Na Ponte próximo a saída Norte)',                   difficulty:'easy',   task:'10 Kakuna e 10 Metapod',                                           reward:'20K EXP',                                      pokemons:['Kakuna','Metapod'],                               imgUrl:'https://i.imgur.com/GQf0oCb.png' },
    { npc:'Aaron',    location:'Floresta Saffron/Cerulean (próximo do Shiny Magnemite Den)', difficulty:'easy',   task:'20 Magnemite e 40 Voltorb',                                        reward:'30K EXP',                                      pokemons:['Magnemite','Voltorb'],                            imgUrl:'https://i.imgur.com/9Al6WI9.png' },
    { npc:'Nina',     location:'Cerulean ao lado do Mark',                                   difficulty:'easy',   task:'30 Weepinbell e 20 Gloom',                                         reward:'30K EXP',                                      pokemons:['Weepinbell','Gloom'],                             imgUrl:'https://i.imgur.com/eVWWEzh.png' },
    { npc:'Liam',     location:'Saffron, na Esquerda do CP',                                 difficulty:'easy',   task:'Derrotar 1 Shiny Rattata e 30 Rattatas',                           reward:'15K EXP e 1 Bubble Gum',                       pokemons:['Shiny Rattata','Rattata'],                        imgUrl:'https://i.imgur.com/iSjglAC.png' },
    { npc:'Lara',     location:'Saffron (Saída Norte/Sul de Saffron)',                       difficulty:'easy',   task:'Derrotar 1 Shiny Pidgey e 1 Shiny Spearow',                        reward:'30K EXP e 1 Bubble Gum',                       pokemons:['Shiny Pidgey','Shiny Spearow'],                   imgUrl:'https://i.imgur.com/Aaaa5u5.png' },
    { npc:'Leah',     location:'Saffron',                                                    difficulty:'easy',   task:'Derrotar 80 Raticates',                                            reward:'50K EXP',                                      pokemons:['Raticate'],                                       imgUrl:'https://i.imgur.com/gDtH0ZF.png' },
    // INTERMEDIÁRIAS
    { npc:'Owen',     location:'Cerulean, na saída Sul da cidade',                           difficulty:'medium', task:'1 Shiny Sandshrew, 1 Shiny Diglett, 50 Diglett e 50 Sandshrew',   reward:'50K EXP e 1 Bubble Gum',                       pokemons:['Shiny Sandshrew','Shiny Diglett','Diglett','Sandshrew'], imgUrl:'https://i.imgur.com/KrLnvtk.png' },
    { npc:'Stella',   location:'Cinnabar, em Frente ao Market',                             difficulty:'medium', task:'30 Charmander, 50 Charmeleon e 1 Shiny Charmander',               reward:'50K EXP e 1 Bubble Gum',                       pokemons:['Charmander','Charmeleon','Shiny Charmander'],     imgUrl:'https://i.imgur.com/POYqoCj.png' },
    { npc:'Connor',   location:'Subterrâneo do pântano venenoso a esquerda de Cerulean City',difficulty:'medium', task:'100 Muk',                                                          reward:'50K EXP e 1 Bubble Gum',                       pokemons:['Muk'],                                            imgUrl:'https://i.imgur.com/SMJLbVU.png' },
    { npc:'Zoe',      location:'Pântano venenoso a esquerda de Cerulean City',               difficulty:'medium', task:'50 Arbok e 1 Shiny Arbok',                                         reward:'50K EXP e 1 Bubble Gum',                       pokemons:['Arbok','Shiny Arbok'],                            imgUrl:'https://i.imgur.com/lqGFUlN.png' },
    // AVANÇADAS
    { npc:'Henry',    location:'North de Olivine, na Floresta',                              difficulty:'hard',   task:'300 Miltank e 1 Shiny Miltank',                                    reward:'500K EXP e 2 Bubble Gum',                      pokemons:['Miltank','Shiny Miltank'],                        imgUrl:'https://i.imgur.com/weN1xbA.png' },
    { npc:'Penélope', location:'Saffron',                                                    difficulty:'hard',   task:'150 Meganium, 1 Shiny Meganium, 150 Venusaur e 1 Shiny Venusaur', reward:'500K EXP e 2 Bubble Gum',                      pokemons:['Meganium','Shiny Meganium','Venusaur','Shiny Venusaur'], imgUrl:'https://i.imgur.com/Zfer4bg.png' },
    { npc:'Jackson',  location:'Lavender, Direita do CP',                                    difficulty:'hard',   task:'300 Gengar e 1 Shiny Gengar',                                      reward:'500K EXP e 2 Bubble Gum',                      pokemons:['Gengar','Shiny Gengar'],                          imgUrl:'https://i.imgur.com/bCHbsm4.png' },
    { npc:'Mia',      location:'Lavender, Sul do CP',                                        difficulty:'hard',   task:'300 Misdreavus e 1 Shiny Misdreavus',                              reward:'500K EXP e 2 Bubble Gum',                      pokemons:['Misdreavus','Shiny Misdreavus'],                  imgUrl:'https://i.imgur.com/IaKFZ4v.png' },
    { npc:'Sebastian',location:'Vermilion, Próximo ao Navio',                                difficulty:'hard',   task:'300 Clefable e 1 Shiny Clefable',                                  reward:'500K EXP e 2 Bubble Gum',                      pokemons:['Clefable','Shiny Clefable'],                      imgUrl:'https://i.imgur.com/rRoAmAI.png' },
    { npc:'Autumn',   location:'Vermilion, Próximo ao Navio',                                difficulty:'hard',   task:'300 Skarmory e 1 Shiny Skarmory',                                  reward:'500K EXP e 2 Bubble Gum',                      pokemons:['Skarmory','Shiny Skarmory'],                      imgUrl:'https://i.imgur.com/4m1YZx9.png' },
    { npc:'Violet',   location:'Vermilion, no Sul do CP',                                    difficulty:'hard',   task:'300 Wigglytuff e 1 Shiny Wigglytuff',                              reward:'500K EXP e 2 Bubble Gum',                      pokemons:['Wigglytuff','Shiny Wigglytuff'],                  imgUrl:'https://i.imgur.com/jW26ta4.png' },
    { npc:'Caleb',    location:'Viridian (ao lado do CP)',                                   difficulty:'hard',   task:'300 Nidoking e 1 Shiny Nidoking',                                  reward:'500K EXP e 2 Bubble Gum',                      pokemons:['Nidoking','Shiny Nidoking'],                      imgUrl:'https://i.imgur.com/uVnQ2sd.png' },
    { npc:'Elijah',   location:'Viridian (Acima do Mark)',                                   difficulty:'hard',   task:'300 Nidoqueen e 1 Shiny Nidoqueen',                                reward:'500K EXP e 2 Bubble Gum',                      pokemons:['Nidoqueen','Shiny Nidoqueen'],                    imgUrl:'https://i.imgur.com/vWeZWH9.png' },
    { npc:'Bert',     location:'Floresta de Viridian',                                       difficulty:'hard',   task:'300 Charizard, 300 Venusaur e 300 Blastoise',                      reward:'500K EXP e 2 Bubble Gum',                      pokemons:['Charizard','Venusaur','Blastoise'],               imgUrl:'' },
    { npc:'Eva',      location:"Shiny Totodile Den's",                                       difficulty:'hard',   task:'300 Blastoise e 1 Shiny Blastoise',                                reward:'500K EXP e 2 Bubble Gum',                      pokemons:['Blastoise','Shiny Blastoise'],                    imgUrl:'' },
    { npc:'Grayson',  location:'Dentro de Cinnabar, Próximo ao CP',                         difficulty:'hard',   task:'300 Houndoom e 1 Shiny Houndoom',                                  reward:'500K EXP e 2 Bubble Gum',                      pokemons:['Houndoom','Shiny Houndoom'],                      imgUrl:'' },
    { npc:'Oliver',   location:'Dentro de Cinnabar, Próximo ao CP',                         difficulty:'hard',   task:'300 Charizard e 1 Shiny Charizard',                                reward:'500K EXP e 2 Bubble Gum',                      pokemons:['Charizard','Shiny Charizard'],                    imgUrl:'' },
    { npc:'Chloe',    location:'Dentro de Cinnabar, Esquerda do CP',                        difficulty:'hard',   task:'300 Arcanine e 1 Shiny Arcanine',                                  reward:'500K EXP e 2 Bubble Gum',                      pokemons:['Arcanine','Shiny Arcanine'],                      imgUrl:'' },
    { npc:'Aurora',   location:"Ilha de Gelo Kanto, Próximo a Shiny Seel's Den",            difficulty:'hard',   task:'300 Cloyster e 1 Shiny Cloyster',                                  reward:'500K EXP e 2 Bubble Gum',                      pokemons:['Cloyster','Shiny Cloyster'],                      imgUrl:'' },
    { npc:'Benjamin', location:"Ilha de Gelo Kanto, na Direita da Shiny Lapras Den's",      difficulty:'hard',   task:'300 Piloswine e 1 Shiny Piloswine',                                reward:'500K EXP e 2 Bubble Gum',                      pokemons:['Piloswine','Shiny Piloswine'],                    imgUrl:'' },
    { npc:'Lucas',    location:"Ilha de Gelo Kanto, no Shiny Dewgong's Den's",              difficulty:'hard',   task:'300 Dewgong e 1 Shiny Dewgong',                                    reward:'500K EXP e 2 Bubble Gum',                      pokemons:['Dewgong','Shiny Dewgong'],                        imgUrl:'' },
    { npc:'Scarlet',  location:'Direita de Mahogany City, na Entrada da Montanha',          difficulty:'hard',   task:'300 Dragonair e 1 Shiny Dragonair',                                reward:'500K EXP e 2 Bubble Gum',                      pokemons:['Dragonair','Shiny Dragonair'],                    imgUrl:'' },
    { npc:'Isaac',    location:"Ilha de Gelo Kanto, Próximo a Shiny Dratini's Den",         difficulty:'hard',   task:'300 Alakazam e 1 Shiny Alakazam',                                  reward:'500K EXP e 2 Bubble Gum',                      pokemons:['Alakazam','Shiny Alakazam'],                      imgUrl:'' },
    // ÉPICAS
    { npc:'Doris',    location:'Na Esquerda de Cerulean, na Floresta',                      difficulty:'epic',   task:'1500 Snorlax e 25 Shiny Snorlax',                                  reward:'1KK EXP e desbloqueia a troca do item Shiny',  pokemons:['Snorlax','Shiny Snorlax'],                        imgUrl:'' },
    { npc:'Riley',    location:'No Safari, Próximo a Dungeon de Tauros',                    difficulty:'epic',   task:'1500 Tauros e 25 Shiny Tauros',                                    reward:'1KK EXP e desbloqueia a troca do item Shiny',  pokemons:['Tauros','Shiny Tauros'],                          imgUrl:'' },
    { npc:'Marcel',   location:'Esquerda de Fuchsia, no Safari',                            difficulty:'epic',   task:'1500 Mr.Mime e 25 Shiny Mr.Mime',                                  reward:'1KK EXP e desbloqueia a troca do item Shiny',  pokemons:['Mr.Mime','Shiny Mr.Mime'],                        imgUrl:'' },
    { npc:'Dexter',   location:'Esquerda de Fuchsia, na Hunt de Pinsir',                    difficulty:'epic',   task:'1500 Pinsir e 25 Shiny Pinsir',                                    reward:'1KK EXP e desbloqueia a troca do item Shiny',  pokemons:['Pinsir','Shiny Pinsir'],                          imgUrl:'' },
    { npc:'Blade',    location:'Esquerda de Fuchsia, na Hunt -1 de Pinsir',                 difficulty:'epic',   task:'1500 Scyther e 25 Shiny Scyther',                                  reward:'1KK EXP e desbloqueia a troca do item Shiny',  pokemons:['Scyther','Shiny Scyther'],                        imgUrl:'' },
    { npc:'Matilda',  location:'Esquerda de Fuchsia, na Hunt de Kangaskhan',                difficulty:'epic',   task:'1500 Kangaskhan e 25 Shiny Kangaskhan',                             reward:'1KK EXP e desbloqueia a troca do item Shiny',  pokemons:['Kangaskhan','Shiny Kangaskhan'],                  imgUrl:'' },
    { npc:'Camila',   location:"Direita de Fuchsia, na Hunt de Farfetch'd",                 difficulty:'epic',   task:"1500 Farfetch'd e 25 Shiny Farfetch'd",                             reward:'1KK EXP e desbloqueia a troca do item Shiny',  pokemons:["Farfetch'd","Shiny Farfetch'd"],                  imgUrl:'' },
    { npc:'Coral',    location:'Sul de Fuchsia, Próximo a Dungeon de Lapras',               difficulty:'epic',   task:'1500 Lapras e 25 Shiny Lapras',                                    reward:'1KK EXP e desbloqueia a troca do item Shiny',  pokemons:['Lapras','Shiny Lapras'],                          imgUrl:'' },
    { npc:'Wendy',    location:'North de Violet City, no Sul da Hunt de Murkrow',           difficulty:'epic',   task:'1500 Misdreavus e 25 Shiny Misdreavus',                             reward:'1KK EXP e desbloqueia a troca do item Shiny',  pokemons:['Misdreavus','Shiny Misdreavus'],                  imgUrl:'' },
    { npc:'Wanda',    location:'Sul de Goldenrod City, No -1 da Hunt de Girafarig',         difficulty:'epic',   task:'1500 Wobbuffet e 25 Shiny Wobbuffet',                               reward:'1KK EXP e desbloqueia a troca do item Shiny',  pokemons:['Wobbuffet','Shiny Wobbuffet'],                    imgUrl:'' },
    { npc:'Blaze',    location:'Direita de Blackthorn City, Na Hunt de Skarmory',           difficulty:'epic',   task:'1500 Skarmory e 25 Shiny Skarmory',                                 reward:'1KK EXP e desbloqueia a troca do item Shiny',  pokemons:['Skarmory','Shiny Skarmory'],                      imgUrl:'' },
    { npc:'Daisy',    location:'North de Olivine, na MooMoo Farm',                          difficulty:'epic',   task:'1500 Miltank e 25 Shiny Miltank',                                   reward:'1KK EXP e desbloqueia a troca do item Shiny',  pokemons:['Miltank','Shiny Miltank'],                        imgUrl:'' },
    { npc:'Marissa',  location:'Próximo a Wildscape de Mantine em, Olivine City',           difficulty:'epic',   task:'1500 Mantine e 25 Shiny Mantine',                                   reward:'1KK EXP e desbloqueia a troca do item Shiny',  pokemons:['Mantine','Shiny Mantine'],                        imgUrl:'' },
  ];

  var DIFF = {
    easy:   { label:'Easy',          color:'#4ade80', bg:'rgba(74,222,128,.12)',  border:'rgba(74,222,128,.25)',  icon:'🌿' },
    medium: { label:'Intermediária', color:'#facc15', bg:'rgba(250,204,21,.10)',  border:'rgba(250,204,21,.25)',  icon:'⚡' },
    hard:   { label:'Avançada',      color:'#f87171', bg:'rgba(248,113,113,.10)', border:'rgba(248,113,113,.25)', icon:'🔥' },
    epic:   { label:'Épica',         color:'#c084fc', bg:'rgba(192,132,252,.10)', border:'rgba(192,132,252,.25)', icon:'💎' },
  };
  var DIFF_ORDER = ['easy','medium','hard','epic'];

  var _q = '', _diff = 'all';

  function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function _openMapModal(npc, imgUrl) {
    var existing = document.getElementById('wt-map-modal');
    if (existing) existing.remove();
    var modal = document.createElement('div');
    modal.id = 'wt-map-modal';
    modal.innerHTML =
      '<div class="wt-modal-backdrop" onclick="document.getElementById(\'wt-map-modal\').remove()"></div>' +
      '<div class="wt-modal-panel">' +
        '<div class="wt-modal-header">' +
          '<span>📍 Localização — ' + _esc(npc) + '</span>' +
          '<button onclick="document.getElementById(\'wt-map-modal\').remove()">✕</button>' +
        '</div>' +
        '<div class="wt-modal-body">' +
          '<div class="wt-modal-loading" id="wt-modal-loading">Carregando imagem...</div>' +
          '<img src="' + imgUrl + '" alt="Localização ' + _esc(npc) + '"' +
            ' onload="document.getElementById(\'wt-modal-loading\').style.display=\'none\';this.style.opacity=\'1\'"' +
            ' onerror="document.getElementById(\'wt-modal-loading\').textContent=\'Não foi possível carregar a imagem.\'"' +
            ' style="opacity:0;transition:opacity .3s">' +
        '</div>' +
        '<div class="wt-modal-footer">' +
          '<a href="' + imgUrl + '" target="_blank" rel="noopener">↗ Abrir no Imgur</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    function onKey(e) {
      if (e.key === 'Escape') { var m = document.getElementById('wt-map-modal'); if (m) m.remove(); document.removeEventListener('keydown', onKey); }
    }
    document.addEventListener('keydown', onKey);
  }

  function _render() {
    var grid = document.getElementById('wt-grid');
    if (!grid) return;
    var q = _q.trim().toLowerCase();
    var list = TASKS.filter(function(t){
      if (_diff !== 'all' && t.difficulty !== _diff) return false;
      if (!q) return true;
      return t.npc.toLowerCase().includes(q) || t.location.toLowerCase().includes(q) ||
             t.pokemons.some(function(p){ return p.toLowerCase().includes(q); });
    });
    var countEl = document.getElementById('wt-count');
    if (countEl) countEl.textContent = list.length + ' tasks';
    if (!list.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:56px 20px;color:var(--muted)"><div style="font-size:2.5rem;margin-bottom:12px">🔍</div><div>Nenhuma task encontrada para <strong style="color:var(--text)">' + _esc(q) + '</strong></div></div>';
      return;
    }
    var groups = {}; DIFF_ORDER.forEach(function(d){ groups[d]=[]; });
    list.forEach(function(t){ groups[t.difficulty].push(t); });
    var html = '';
    DIFF_ORDER.forEach(function(d){
      if (!groups[d].length) return;
      var cfg = DIFF[d];
      html += '<div class="wt-section">';
      html += '<div class="wt-section-hdr" style="border-color:'+cfg.border+'">';
      html += '<span>'+cfg.icon+'</span><span style="color:'+cfg.color+'">TASKS '+cfg.label.toUpperCase()+'</span>';
      html += '<span class="wt-section-count" style="background:'+cfg.bg+';color:'+cfg.color+';border-color:'+cfg.border+'">'+groups[d].length+'</span>';
      html += '</div>';
      html += '<div class="wt-cards">';
      groups[d].forEach(function(t){
        var cfg2 = DIFF[t.difficulty];
        var tags = t.pokemons.map(function(p){
          var sh = p.toLowerCase().includes('shiny');
          return '<span class="wt-tag'+(sh?' wt-tag-shiny':'')+'" onclick="WikiTasks._clickTag(\''+_esc(p)+'\')">'+(sh?'✨ ':'')+_esc(p)+'</span>';
        }).join('');
        var locBtn = t.imgUrl
          ? '<button class="wt-loc-btn" onclick="WikiTasks._openMap(\''+_esc(t.npc)+'\',\''+t.imgUrl+'\')">📍 Ver localização</button>'
          : '<span class="wt-loc-soon">📍 Em breve</span>';
        html += '<div class="wt-card" style="border-color:'+cfg2.border+'">';
        // header
        html += '<div class="wt-card-hdr">';
        html += '<div class="wt-npc-avatar" style="background:'+cfg2.bg+';border-color:'+cfg2.border+'">'+t.npc.charAt(0)+'</div>';
        html += '<div style="flex:1;min-width:0"><div class="wt-npc-name">'+_esc(t.npc)+'</div>';
        html += '<div class="wt-npc-loc">'+_esc(t.location)+'</div></div>';
        html += '<span class="wt-diff-badge" style="background:'+cfg2.bg+';color:'+cfg2.color+';border-color:'+cfg2.border+'">'+cfg2.icon+' '+cfg2.label+'</span>';
        html += '</div>';
        // task + reward
        html += '<div class="wt-info-row"><span class="wt-lbl wt-lbl-task">Task</span><span class="wt-info-txt">'+_esc(t.task)+'</span></div>';
        html += '<div class="wt-info-row"><span class="wt-lbl wt-lbl-reward">Reward</span><span class="wt-reward-txt">'+_esc(t.reward)+'</span></div>';
        // pokemon tags
        html += '<div class="wt-tags">'+tags+'</div>';
        // location button
        html += '<div class="wt-card-footer">'+locBtn+'</div>';
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
    s.textContent = [
      /* Controls */
      '.wt-controls{display:flex;align-items:center;gap:12px;padding:16px 20px;flex-wrap:wrap;border-bottom:1px solid var(--border)}',
      '.wt-search-wrap{display:flex;align-items:center;gap:8px;flex:1;min-width:200px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px}',
      '.wt-search-wrap svg{flex-shrink:0;opacity:.5}',
      '.wt-search-wrap input{background:none;border:none;outline:none;color:var(--text);font-family:var(--font-body);font-size:.9rem;width:100%}',
      '.wt-search-wrap input::placeholder{color:var(--muted)}',
      '.wt-filter-group{display:flex;gap:6px;flex-wrap:wrap}',
      '.wt-fbtn{padding:6px 14px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--muted);font-family:var(--font-body);font-size:.8rem;cursor:pointer;transition:all .15s;white-space:nowrap}',
      '.wt-fbtn:hover{border-color:var(--border-hover);color:var(--text)}',
      '.wt-fbtn.active{background:rgba(58,140,255,.2);border-color:var(--blue);color:var(--blue-bright)}',
      '.wt-fbtn.fe.active{background:rgba(74,222,128,.15);border-color:rgba(74,222,128,.5);color:#4ade80}',
      '.wt-fbtn.fm.active{background:rgba(250,204,21,.12);border-color:rgba(250,204,21,.5);color:#facc15}',
      '.wt-fbtn.fh.active{background:rgba(248,113,113,.12);border-color:rgba(248,113,113,.5);color:#f87171}',
      '.wt-fbtn.fp.active{background:rgba(192,132,252,.12);border-color:rgba(192,132,252,.5);color:#c084fc}',
      '.wt-count{color:var(--muted);font-size:.82rem;white-space:nowrap;margin-left:auto}',
      /* Grid */
      '#wt-grid{padding:20px;display:flex;flex-direction:column;gap:28px}',
      /* Section */
      '.wt-section{}',
      '.wt-section-hdr{display:flex;align-items:center;gap:10px;padding-bottom:10px;margin-bottom:14px;border-bottom:2px solid;font-family:var(--font-title);font-size:.88rem;font-weight:700;letter-spacing:.08em}',
      '.wt-section-count{margin-left:auto;padding:2px 12px;border-radius:20px;border:1px solid;font-size:.75rem;font-weight:700}',
      '.wt-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}',
      /* Card */
      '.wt-card{background:var(--surface2);border:1px solid;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;gap:0;transition:transform .15s,box-shadow .15s}',
      '.wt-card:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.4)}',
      '.wt-card-hdr{display:flex;align-items:flex-start;gap:10px;padding:14px 14px 10px;border-bottom:1px solid rgba(255,255,255,.05)}',
      '.wt-npc-avatar{width:36px;height:36px;border-radius:50%;border:1.5px solid;display:flex;align-items:center;justify-content:center;font-family:var(--font-title);font-size:.9rem;font-weight:700;color:#fff;flex-shrink:0}',
      '.wt-npc-name{font-family:var(--font-title);font-size:.92rem;color:var(--text);font-weight:700;line-height:1.2}',
      '.wt-npc-loc{font-size:.75rem;color:var(--muted);margin-top:2px;line-height:1.3}',
      '.wt-diff-badge{padding:3px 9px;border-radius:20px;border:1px solid;font-size:.7rem;font-weight:700;white-space:nowrap;flex-shrink:0;margin-top:2px}',
      '.wt-info-row{display:flex;gap:8px;align-items:flex-start;padding:8px 14px 0;font-size:.82rem}',
      '.wt-lbl{flex-shrink:0;padding:1px 7px;border-radius:4px;font-size:.7rem;font-weight:700;margin-top:1px}',
      '.wt-lbl-task{background:rgba(58,140,255,.15);color:var(--blue-bright)}',
      '.wt-lbl-reward{background:rgba(240,180,41,.12);color:var(--gold-bright)}',
      '.wt-info-txt{color:var(--text);line-height:1.4}',
      '.wt-reward-txt{color:var(--gold-bright);line-height:1.4}',
      '.wt-tags{display:flex;flex-wrap:wrap;gap:5px;padding:8px 14px 4px}',
      '.wt-tag{padding:2px 9px;border-radius:20px;background:var(--surface3);border:1px solid var(--border);color:var(--muted);font-size:.72rem;cursor:pointer;transition:all .12s}',
      '.wt-tag:hover{border-color:var(--border-hover);color:var(--text)}',
      '.wt-tag-shiny{background:rgba(255,210,70,.08);border-color:rgba(255,210,70,.3);color:#ffd146}',
      '.wt-tag-shiny:hover{background:rgba(255,210,70,.18);color:#ffe680}',
      '.wt-card-footer{padding:10px 14px 12px;margin-top:auto}',
      '.wt-loc-btn{width:100%;padding:7px;border-radius:8px;border:1px solid rgba(58,140,255,.3);background:rgba(58,140,255,.08);color:var(--blue-bright);font-size:.8rem;cursor:pointer;font-family:var(--font-body);transition:all .15s}',
      '.wt-loc-btn:hover{background:rgba(58,140,255,.18);border-color:rgba(58,140,255,.6)}',
      '.wt-loc-soon{display:block;text-align:center;font-size:.78rem;color:var(--muted);padding:6px 0}',
      /* Modal */
      '.wt-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9998;backdrop-filter:blur(4px)}',
      '.wt-modal-panel{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;background:var(--surface);border:1px solid var(--border);border-radius:14px;width:min(90vw,700px);max-height:90vh;display:flex;flex-direction:column;overflow:hidden}',
      '.wt-modal-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border);font-family:var(--font-title);font-size:.9rem;color:var(--blue-bright)}',
      '.wt-modal-header button{background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--muted);width:28px;height:28px;cursor:pointer;font-size:.9rem}',
      '.wt-modal-body{flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;padding:16px;min-height:200px}',
      '.wt-modal-loading{color:var(--muted);font-size:.85rem}',
      '.wt-modal-body img{max-width:100%;max-height:60vh;border-radius:8px;display:block}',
      '.wt-modal-footer{padding:10px 18px;border-top:1px solid var(--border);display:flex;justify-content:flex-end}',
      '.wt-modal-footer a{color:var(--blue-bright);font-size:.8rem;text-decoration:none}',
      '.wt-modal-footer a:hover{text-decoration:underline}',
      '@media(max-width:600px){.wt-cards{grid-template-columns:1fr}.wt-controls{padding:12px}}',
    ].join('');
    document.head.appendChild(s);
  }

  function renderTasks() {
    _injectCSS();
    var panel = document.getElementById('wiki-tab-tasks');
    if (!panel) return;
    if (panel.dataset.built) { _render(); return; }
    panel.dataset.built = '1';
    panel.innerHTML =
      '<div class="wt-controls">' +
        '<div class="wt-search-wrap">' +
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="opacity:.5"><circle cx="6" cy="6" r="4.5" stroke="white" stroke-width="1.5"/><path d="M10 10L13 13" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>' +
          '<input id="wt-search" type="text" placeholder="Buscar por NPC ou Pokémon...">' +
        '</div>' +
        '<div class="wt-filter-group">' +
          '<button class="wt-fbtn active"    onclick="WikiTasks._filt(\'all\',this)">Todas</button>' +
          '<button class="wt-fbtn fe"        onclick="WikiTasks._filt(\'easy\',this)">🌿 Easy</button>' +
          '<button class="wt-fbtn fm"        onclick="WikiTasks._filt(\'medium\',this)">⚡ Intermediária</button>' +
          '<button class="wt-fbtn fh"        onclick="WikiTasks._filt(\'hard\',this)">🔥 Avançada</button>' +
          '<button class="wt-fbtn fp"        onclick="WikiTasks._filt(\'epic\',this)">💎 Épica</button>' +
        '</div>' +
        '<span id="wt-count" class="wt-count"></span>' +
      '</div>' +
      '<div id="wt-grid"></div>';
    var inp = document.getElementById('wt-search');
    if (inp) { var t; inp.addEventListener('input', function(){ _q=this.value; clearTimeout(t); t=setTimeout(_render,130); }); }
    _render();
  }

  global.WikiTasks = {
    renderTasks: renderTasks,
    _openMap: _openMapModal,
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
      if (panel) { panel.querySelectorAll('.wt-fbtn').forEach(function(b){ b.classList.remove('active'); }); var all = panel.querySelector('.wt-fbtn'); if (all) all.classList.add('active'); }
      _render();
    },
  };
  global.renderTasks = renderTasks;

}(window));
