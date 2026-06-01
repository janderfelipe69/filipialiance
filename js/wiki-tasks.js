/* wiki-tasks.js — Tasks NPC Wiki — estilo premium */
(function(global) {
'use strict';

var TASKS = [
  // EASY
  { npc:'Elena',    loc:'Saffron',                                                    diff:'easy',   task:[{qty:10,name:'Weedle'},{qty:10,name:'Caterpie'}],                                                                      reward:'10K EXP',                                     imgUrl:'https://i.imgur.com/ExD0rvo.png' },
  { npc:'Maya',     loc:'Saffron — Na Ponte próximo a saída Norte',                  diff:'easy',   task:[{qty:10,name:'Kakuna'},{qty:10,name:'Metapod'}],                                                                         reward:'20K EXP',                                     imgUrl:'https://i.imgur.com/GQf0oCb.png' },
  { npc:'Aaron',    loc:'Floresta Saffron/Cerulean — próximo do Shiny Magnemite Den',diff:'easy',   task:[{qty:20,name:'Magnemite'},{qty:40,name:'Voltorb'}],                                                                      reward:'30K EXP',                                     imgUrl:'https://i.imgur.com/9Al6WI9.png' },
  { npc:'Nina',     loc:'Cerulean ao lado do Mark',                                  diff:'easy',   task:[{qty:30,name:'Weepinbell'},{qty:20,name:'Gloom'}],                                                                       reward:'30K EXP',                                     imgUrl:'https://i.imgur.com/eVWWEzh.png' },
  { npc:'Liam',     loc:'Saffron — na Esquerda do CP',                               diff:'easy',   task:[{qty:1,name:'Shiny Rattata'},{qty:30,name:'Rattata'}],                                                                   reward:'15K EXP + 1 Bubble Gum',                      imgUrl:'https://i.imgur.com/iSjglAC.png' },
  { npc:'Lara',     loc:'Saffron — Saída Norte/Sul',                                 diff:'easy',   task:[{qty:1,name:'Shiny Pidgey'},{qty:1,name:'Shiny Spearow'}],                                                              reward:'30K EXP + 1 Bubble Gum',                      imgUrl:'https://i.imgur.com/Aaaa5u5.png' },
  { npc:'Leah',     loc:'Saffron',                                                   diff:'easy',   task:[{qty:80,name:'Raticate'}],                                                                                               reward:'50K EXP',                                     imgUrl:'https://i.imgur.com/gDtH0ZF.png' },
  // INTERMEDIÁRIA
  { npc:'Owen',     loc:'Cerulean — saída Sul da cidade',                            diff:'medium', task:[{qty:1,name:'Shiny Sandshrew'},{qty:1,name:'Shiny Diglett'},{qty:50,name:'Diglett'},{qty:50,name:'Sandshrew'}],          reward:'50K EXP + 1 Bubble Gum',                      imgUrl:'https://i.imgur.com/KrLnvtk.png' },
  { npc:'Stella',   loc:'Cinnabar — em Frente ao Market',                            diff:'medium', task:[{qty:30,name:'Charmander'},{qty:50,name:'Charmeleon'},{qty:1,name:'Shiny Charmander'}],                                  reward:'50K EXP + 1 Bubble Gum',                      imgUrl:'https://i.imgur.com/POYqoCj.png' },
  { npc:'Connor',   loc:'Subterrâneo do pântano venenoso — esquerda de Cerulean',    diff:'medium', task:[{qty:100,name:'Muk'}],                                                                                                   reward:'50K EXP + 1 Bubble Gum',                      imgUrl:'https://i.imgur.com/SMJLbVU.png' },
  { npc:'Zoe',      loc:'Pântano venenoso — esquerda de Cerulean City',              diff:'medium', task:[{qty:50,name:'Arbok'},{qty:1,name:'Shiny Arbok'}],                                                                       reward:'50K EXP + 1 Bubble Gum',                      imgUrl:'https://i.imgur.com/lqGFUlN.png' },
  // AVANÇADA
  { npc:'Henry',    loc:'North de Olivine — na Floresta',                            diff:'hard',   task:[{qty:300,name:'Miltank'},{qty:1,name:'Shiny Miltank'}],                                                                  reward:'500K EXP + 2 Bubble Gum',                     imgUrl:'https://i.imgur.com/weN1xbA.png' },
  { npc:'Penélope', loc:'Saffron',                                                   diff:'hard',   task:[{qty:150,name:'Meganium'},{qty:1,name:'Shiny Meganium'},{qty:150,name:'Venusaur'},{qty:1,name:'Shiny Venusaur'}],        reward:'500K EXP + 2 Bubble Gum',                     imgUrl:'https://i.imgur.com/Zfer4bg.png' },
  { npc:'Jackson',  loc:'Lavender — Direita do CP',                                  diff:'hard',   task:[{qty:300,name:'Gengar'},{qty:1,name:'Shiny Gengar'}],                                                                    reward:'500K EXP + 2 Bubble Gum',                     imgUrl:'https://i.imgur.com/bCHbsm4.png' },
  { npc:'Mia',      loc:'Lavender — Sul do CP',                                      diff:'hard',   task:[{qty:300,name:'Misdreavus'},{qty:1,name:'Shiny Misdreavus'}],                                                            reward:'500K EXP + 2 Bubble Gum',                     imgUrl:'https://i.imgur.com/IaKFZ4v.png' },
  { npc:'Sebastian',loc:'Vermilion — Próximo ao Navio',                              diff:'hard',   task:[{qty:300,name:'Clefable'},{qty:1,name:'Shiny Clefable'}],                                                                reward:'500K EXP + 2 Bubble Gum',                     imgUrl:'https://i.imgur.com/rRoAmAI.png' },
  { npc:'Autumn',   loc:'Vermilion — Próximo ao Navio',                              diff:'hard',   task:[{qty:300,name:'Skarmory'},{qty:1,name:'Shiny Skarmory'}],                                                                reward:'500K EXP + 2 Bubble Gum',                     imgUrl:'https://i.imgur.com/4m1YZx9.png' },
  { npc:'Violet',   loc:'Vermilion — Sul do CP',                                     diff:'hard',   task:[{qty:300,name:'Wigglytuff'},{qty:1,name:'Shiny Wigglytuff'}],                                                            reward:'500K EXP + 2 Bubble Gum',                     imgUrl:'https://i.imgur.com/jW26ta4.png' },
  { npc:'Caleb',    loc:'Viridian — ao lado do CP',                                  diff:'hard',   task:[{qty:300,name:'Nidoking'},{qty:1,name:'Shiny Nidoking'}],                                                                reward:'500K EXP + 2 Bubble Gum',                     imgUrl:'https://i.imgur.com/uVnQ2sd.png' },
  { npc:'Elijah',   loc:'Viridian — Acima do Mark',                                  diff:'hard',   task:[{qty:300,name:'Nidoqueen'},{qty:1,name:'Shiny Nidoqueen'}],                                                              reward:'500K EXP + 2 Bubble Gum',                     imgUrl:'https://i.imgur.com/vWeZWH9.png' },
  { npc:'Bert',     loc:'Floresta de Viridian',                                      diff:'hard',   task:[{qty:300,name:'Charizard'},{qty:300,name:'Venusaur'},{qty:300,name:'Blastoise'}],                                        reward:'500K EXP + 2 Bubble Gum',                     imgUrl:'' },
  { npc:'Eva',      loc:"Shiny Totodile Den's",                                      diff:'hard',   task:[{qty:300,name:'Blastoise'},{qty:1,name:'Shiny Blastoise'}],                                                              reward:'500K EXP + 2 Bubble Gum',                     imgUrl:'' },
  { npc:'Grayson',  loc:'Dentro de Cinnabar — Próximo ao CP',                        diff:'hard',   task:[{qty:300,name:'Houndoom'},{qty:1,name:'Shiny Houndoom'}],                                                               reward:'500K EXP + 2 Bubble Gum',                     imgUrl:'' },
  { npc:'Oliver',   loc:'Dentro de Cinnabar — Próximo ao CP',                        diff:'hard',   task:[{qty:300,name:'Charizard'},{qty:1,name:'Shiny Charizard'}],                                                              reward:'500K EXP + 2 Bubble Gum',                     imgUrl:'' },
  { npc:'Chloe',    loc:'Dentro de Cinnabar — Esquerda do CP',                       diff:'hard',   task:[{qty:300,name:'Arcanine'},{qty:1,name:'Shiny Arcanine'}],                                                               reward:'500K EXP + 2 Bubble Gum',                     imgUrl:'' },
  { npc:'Aurora',   loc:"Ilha de Gelo Kanto — Próximo a Shiny Seel's Den",           diff:'hard',   task:[{qty:300,name:'Cloyster'},{qty:1,name:'Shiny Cloyster'}],                                                               reward:'500K EXP + 2 Bubble Gum',                     imgUrl:'' },
  { npc:'Benjamin', loc:"Ilha de Gelo Kanto — Direita da Shiny Lapras Den's",        diff:'hard',   task:[{qty:300,name:'Piloswine'},{qty:1,name:'Shiny Piloswine'}],                                                              reward:'500K EXP + 2 Bubble Gum',                     imgUrl:'' },
  { npc:'Lucas',    loc:"Ilha de Gelo Kanto — Shiny Dewgong's Den's",                diff:'hard',   task:[{qty:300,name:'Dewgong'},{qty:1,name:'Shiny Dewgong'}],                                                                  reward:'500K EXP + 2 Bubble Gum',                     imgUrl:'' },
  { npc:'Scarlet',  loc:'Direita de Mahogany City — Entrada da Montanha',            diff:'hard',   task:[{qty:300,name:'Dragonair'},{qty:1,name:'Shiny Dragonair'}],                                                              reward:'500K EXP + 2 Bubble Gum',                     imgUrl:'' },
  { npc:'Isaac',    loc:"Ilha de Gelo Kanto — Próximo a Shiny Dratini's Den",        diff:'hard',   task:[{qty:300,name:'Alakazam'},{qty:1,name:'Shiny Alakazam'}],                                                               reward:'500K EXP + 2 Bubble Gum',                     imgUrl:'' },
  // ÉPICA
  { npc:'Doris',    loc:'Esquerda de Cerulean — na Floresta',                        diff:'epic',   task:[{qty:1500,name:'Snorlax'},{qty:25,name:'Shiny Snorlax'}],                                                               reward:'1KK EXP + desbloqueia troca Shiny',           imgUrl:'' },
  { npc:'Riley',    loc:'Safari — Próximo a Dungeon de Tauros',                      diff:'epic',   task:[{qty:1500,name:'Tauros'},{qty:25,name:'Shiny Tauros'}],                                                                  reward:'1KK EXP + desbloqueia troca Shiny',           imgUrl:'' },
  { npc:'Marcel',   loc:'Esquerda de Fuchsia — no Safari',                           diff:'epic',   task:[{qty:1500,name:'Mr. Mime'},{qty:25,name:'Shiny Mr. Mime'}],                                                              reward:'1KK EXP + desbloqueia troca Shiny',           imgUrl:'' },
  { npc:'Dexter',   loc:'Esquerda de Fuchsia — Hunt de Pinsir',                      diff:'epic',   task:[{qty:1500,name:'Pinsir'},{qty:25,name:'Shiny Pinsir'}],                                                                  reward:'1KK EXP + desbloqueia troca Shiny',           imgUrl:'' },
  { npc:'Blade',    loc:'Esquerda de Fuchsia — Hunt -1 de Pinsir',                   diff:'epic',   task:[{qty:1500,name:'Scyther'},{qty:25,name:'Shiny Scyther'}],                                                                reward:'1KK EXP + desbloqueia troca Shiny',           imgUrl:'' },
  { npc:'Matilda',  loc:'Esquerda de Fuchsia — Hunt de Kangaskhan',                  diff:'epic',   task:[{qty:1500,name:'Kangaskhan'},{qty:25,name:'Shiny Kangaskhan'}],                                                          reward:'1KK EXP + desbloqueia troca Shiny',           imgUrl:'' },
  { npc:'Camila',   loc:"Direita de Fuchsia — Hunt de Farfetch'd",                   diff:'epic',   task:[{qty:1500,name:"Farfetch'd"},{qty:25,name:"Shiny Farfetch'd"}],                                                          reward:'1KK EXP + desbloqueia troca Shiny',           imgUrl:'' },
  { npc:'Coral',    loc:'Sul de Fuchsia — Dungeon de Lapras',                        diff:'epic',   task:[{qty:1500,name:'Lapras'},{qty:25,name:'Shiny Lapras'}],                                                                  reward:'1KK EXP + desbloqueia troca Shiny',           imgUrl:'' },
  { npc:'Wendy',    loc:'North de Violet City — Sul da Hunt de Murkrow',             diff:'epic',   task:[{qty:1500,name:'Misdreavus'},{qty:25,name:'Shiny Misdreavus'}],                                                          reward:'1KK EXP + desbloqueia troca Shiny',           imgUrl:'' },
  { npc:'Wanda',    loc:'Sul de Goldenrod City — -1 da Hunt de Girafarig',           diff:'epic',   task:[{qty:1500,name:'Wobbuffet'},{qty:25,name:'Shiny Wobbuffet'}],                                                            reward:'1KK EXP + desbloqueia troca Shiny',           imgUrl:'' },
  { npc:'Blaze',    loc:'Direita de Blackthorn City — Hunt de Skarmory',             diff:'epic',   task:[{qty:1500,name:'Skarmory'},{qty:25,name:'Shiny Skarmory'}],                                                              reward:'1KK EXP + desbloqueia troca Shiny',           imgUrl:'' },
  { npc:'Daisy',    loc:'North de Olivine — MooMoo Farm',                            diff:'epic',   task:[{qty:1500,name:'Miltank'},{qty:25,name:'Shiny Miltank'}],                                                                reward:'1KK EXP + desbloqueia troca Shiny',           imgUrl:'' },
  { npc:'Marissa',  loc:'Próximo a Wildscape de Mantine — Olivine City',             diff:'epic',   task:[{qty:1500,name:'Mantine'},{qty:25,name:'Shiny Mantine'}],                                                                reward:'1KK EXP + desbloqueia troca Shiny',           imgUrl:'' },
];

var DIFF = {
  easy:   { label:'Easy',          color:'#4ade80', bg:'rgba(74,222,128,.12)',  border:'rgba(74,222,128,.25)',  glow:'rgba(74,222,128,.15)',  icon:'🌿' },
  medium: { label:'Intermediária', color:'#facc15', bg:'rgba(250,204,21,.10)',  border:'rgba(250,204,21,.25)',  glow:'rgba(250,204,21,.12)',  icon:'⚡' },
  hard:   { label:'Avançada',      color:'#f87171', bg:'rgba(248,113,113,.10)', border:'rgba(248,113,113,.25)', glow:'rgba(248,113,113,.12)', icon:'🔥' },
  epic:   { label:'Épica',         color:'#c084fc', bg:'rgba(192,132,252,.10)', border:'rgba(192,132,252,.25)', glow:'rgba(192,132,252,.12)', icon:'💎' },
};
var DIFF_ORDER = ['easy','medium','hard','epic'];
var _q = '', _diff = 'all';

function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function _sprite(name) {
  var key = name.toLowerCase()
    .replace('shiny ','')
    .replace(/[^a-z0-9]/g,'-')
    .replace(/-+/g,'-').replace(/^-|-$/g,'');
  var fixes = { 'mr-mime':'mr-mime', 'farfetchd':"farfetch'd", 'nidoran-f':'nidoran-f', 'nidoran-m':'nidoran-m' };
  var isShiny = name.toLowerCase().startsWith('shiny ');
  var base = isShiny
    ? 'https://play.pokemonshowdown.com/sprites/ani-shiny/'
    : 'https://play.pokemonshowdown.com/sprites/ani/';
  return base + (fixes[key]||key) + '.gif';
}

function _openMap(npc, imgUrl) {
  var ex = document.getElementById('wt-map-modal');
  if (ex) ex.remove();
  var m = document.createElement('div');
  m.id = 'wt-map-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;animation:wtFadeIn .2s ease';
  m.innerHTML =
    '<div style="position:absolute;inset:0;background:rgba(0,0,0,.8);backdrop-filter:blur(6px)" onclick="document.getElementById(\'wt-map-modal\').remove()"></div>' +
    '<div style="position:relative;z-index:1;width:min(1100px,96vw);max-height:92vh;display:flex;flex-direction:column;background:#0c1424;border:1px solid rgba(255,200,50,.25);border-radius:16px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.7);animation:wtSlideUp .25s cubic-bezier(.16,1,.3,1)">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(255,200,50,.12);background:rgba(255,200,50,.04)">' +
        '<span style="font-family:var(--font-title);font-size:14px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#ffe066">📍 Localização — '+_esc(npc)+'</span>' +
        '<button onclick="document.getElementById(\'wt-map-modal\').remove()" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:14px">✕</button>' +
      '</div>' +
      '<div style="flex:1;min-height:65vh;background:#070d1a;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative">' +
        '<div id="wt-map-loading" style="position:absolute;font-size:12px;color:var(--muted);letter-spacing:1px">Carregando imagem...</div>' +
        '<img src="'+imgUrl+'" alt="'+_esc(npc)+'" style="width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity .3s" onload="document.getElementById(\'wt-map-loading\').style.display=\'none\';this.style.opacity=\'1\'" onerror="document.getElementById(\'wt-map-loading\').textContent=\'Não foi possível carregar.\'">'+
      '</div>' +
      '<div style="padding:10px 18px;border-top:1px solid rgba(255,255,255,.05);display:flex;justify-content:flex-end">' +
        '<a href="'+imgUrl+'" target="_blank" rel="noopener" style="font-size:10px;color:rgba(255,255,255,.35);text-decoration:none;letter-spacing:.5px;text-transform:uppercase">↗ Abrir no Imgur</a>' +
      '</div>' +
    '</div>';
  document.body.appendChild(m);
  function onKey(e){ if(e.key==='Escape'){ var el=document.getElementById('wt-map-modal'); if(el)el.remove(); document.removeEventListener('keydown',onKey); } }
  document.addEventListener('keydown', onKey);
}

function _render() {
  var grid = document.getElementById('wt-grid');
  if (!grid) return;
  var q = _q.trim().toLowerCase();
  var list = TASKS.filter(function(t){
    if (_diff !== 'all' && t.diff !== _diff) return false;
    if (!q) return true;
    return t.npc.toLowerCase().includes(q) || t.loc.toLowerCase().includes(q) ||
           t.task.some(function(e){ return e.name.toLowerCase().includes(q); });
  });
  var countEl = document.getElementById('wt-count');
  if (countEl) countEl.textContent = list.length + ' tasks';
  if (!list.length) {
    grid.innerHTML = '<div style="text-align:center;padding:56px 20px;color:var(--muted)"><div style="font-size:2.5rem;margin-bottom:12px">🔍</div><div>Nenhuma task encontrada para <strong style="color:var(--text)">'+_esc(q)+'</strong></div></div>';
    return;
  }
  var groups = {}; DIFF_ORDER.forEach(function(d){ groups[d]=[]; });
  list.forEach(function(t){ groups[t.diff].push(t); });
  var html = '';
  DIFF_ORDER.forEach(function(d){
    if (!groups[d].length) return;
    var cfg = DIFF[d];
    html += '<div style="margin-bottom:32px">';
    // Section header
    html += '<div style="display:flex;align-items:center;gap:10px;padding-bottom:10px;margin-bottom:16px;border-bottom:2px solid '+cfg.border+'">';
    html += '<span style="font-size:1.2rem">'+cfg.icon+'</span>';
    html += '<span style="font-family:var(--font-title);font-size:.9rem;font-weight:700;letter-spacing:.1em;color:'+cfg.color+';flex:1">TASKS '+cfg.label.toUpperCase()+'</span>';
    html += '<span style="padding:3px 14px;border-radius:20px;background:'+cfg.bg+';border:1px solid '+cfg.border+';color:'+cfg.color+';font-size:.75rem;font-weight:700">'+groups[d].length+'</span>';
    html += '</div>';
    // Cards grid
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px">';
    groups[d].forEach(function(t){
      var cfg2 = DIFF[t.diff];
      var fallback = 'https://play.pokemonshowdown.com/sprites/gen5/substitute.png';
      var chips = t.task.map(function(e){
        var isShiny = e.name.toLowerCase().startsWith('shiny ');
        var sp = _sprite(e.name);
        return '<div class="wt-chip'+(isShiny?' wt-chip-shiny':'')+'" onclick="WikiTasks._search(\''+_esc(e.name)+'\')" title="Buscar '+_esc(e.name)+'">' +
          '<img src="'+sp+'" loading="lazy" onerror="this.src=\''+fallback+'\';this.onerror=null" style="width:48px;height:48px;object-fit:contain;image-rendering:pixelated">' +
          '<div class="wt-chip-name">'+(isShiny?'✨ ':'')+_esc(e.name.replace(/^shiny /i,''))+'</div>' +
          '<div class="wt-chip-qty">×'+e.qty+'</div>' +
        '</div>';
      }).join('');

      var mapBtn = t.imgUrl
        ? '<button class="wt-map-btn" onclick="WikiTasks._map(\''+_esc(t.npc)+'\',\''+t.imgUrl+'\')">📍 Ver localização</button>'
        : '<span style="font-size:.75rem;color:var(--muted);display:block;text-align:center;padding:6px 0">📍 Imagem em breve</span>';

      html +=
        '<div class="wt-card" style="--c:'+cfg2.color+';--bg:'+cfg2.bg+';--bd:'+cfg2.border+';--glow:'+cfg2.glow+'">' +
          // Header
          '<div class="wt-card-top">' +
            '<div class="wt-avatar">'+t.npc.charAt(0)+'</div>' +
            '<div style="flex:1;min-width:0">' +
              '<div class="wt-npc-name">'+_esc(t.npc)+'</div>' +
              (function(){
        var parts = t.loc.split('—');
        var city = parts[0].trim();
        var sub = parts.slice(1).join('—').trim();
        return '<div class="wt-npc-loc">'+
          '<span class="wt-city">'+_esc(city)+'</span>'+
          (sub ? '<span class="wt-subloc"> — '+_esc(sub)+'</span>' : '')+
        '</div>';
      })() +
            '</div>' +
            '<span class="wt-badge">'+cfg2.icon+' '+cfg2.label+'</span>' +
          '</div>' +
          // Pokemon chips
          '<div class="wt-chips">'+chips+'</div>' +
          // Reward
          '<div class="wt-reward-row">' +
            '<span class="wt-reward-lbl">🏆 Reward</span>' +
            '<span class="wt-reward-val">'+_esc(t.reward)+'</span>' +
          '</div>' +
          // Map button
          '<div style="padding:0 12px 12px">'+mapBtn+'</div>' +
        '</div>';
    });
    html += '</div></div>';
  });
  grid.innerHTML = html;
}

function _injectCSS() {
  if (document.getElementById('wt-css')) return;
  var s = document.createElement('style');
  s.id = 'wt-css';
  s.textContent = `
    @keyframes wtFadeIn { from{opacity:0} to{opacity:1} }
    @keyframes wtSlideUp { from{transform:translateY(28px) scale(.97);opacity:0} to{transform:none;opacity:1} }

    /* Controls */
    .wt-controls { display:flex;align-items:center;gap:12px;padding:16px 20px;flex-wrap:wrap;border-bottom:1px solid var(--border) }
    .wt-sw { display:flex;align-items:center;gap:8px;flex:1;min-width:200px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 12px }
    .wt-sw input { background:none;border:none;outline:none;color:var(--text);font-family:var(--font-body);font-size:.9rem;width:100% }
    .wt-sw input::placeholder { color:var(--muted) }
    .wt-fbtn { padding:6px 14px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--muted);font-family:var(--font-body);font-size:.8rem;cursor:pointer;transition:all .15s;white-space:nowrap }
    .wt-fbtn:hover { border-color:var(--border-hover);color:var(--text) }
    .wt-fbtn.active { background:rgba(58,140,255,.2);border-color:var(--blue);color:var(--blue-bright) }
    .wt-fbtn.fe.active { background:rgba(74,222,128,.15);border-color:rgba(74,222,128,.5);color:#4ade80 }
    .wt-fbtn.fm.active { background:rgba(250,204,21,.12);border-color:rgba(250,204,21,.5);color:#facc15 }
    .wt-fbtn.fh.active { background:rgba(248,113,113,.12);border-color:rgba(248,113,113,.5);color:#f87171 }
    .wt-fbtn.fp.active { background:rgba(192,132,252,.12);border-color:rgba(192,132,252,.5);color:#c084fc }
    #wt-count { color:var(--muted);font-size:.82rem;white-space:nowrap;margin-left:auto }

    /* Grid */
    #wt-grid { padding:24px 20px 40px;max-width:1400px;margin:0 auto }

    /* Card */
    .wt-card { background:var(--surface2);border:1px solid var(--bd,rgba(255,255,255,.1));border-radius:14px;overflow:hidden;display:flex;flex-direction:column;transition:transform .15s,box-shadow .15s,border-color .15s }
    .wt-card:hover { transform:translateY(-3px);border-color:var(--bd);box-shadow:0 8px 32px var(--glow,rgba(0,0,0,.3)) }
    .wt-card-top { display:flex;align-items:flex-start;gap:10px;padding:13px 13px 10px;border-bottom:1px solid rgba(255,255,255,.05) }
    .wt-avatar { width:36px;height:36px;border-radius:50%;background:var(--bg,rgba(255,255,255,.08));border:1.5px solid var(--bd,rgba(255,255,255,.15));display:flex;align-items:center;justify-content:center;font-family:var(--font-title);font-size:.95rem;font-weight:700;color:var(--c,#fff);flex-shrink:0 }
    .wt-npc-name { font-family:var(--font-title);font-size:1rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--c,#fff);line-height:1.2 }
    .wt-npc-loc { font-size:.73rem;color:var(--muted);margin-top:3px;line-height:1.3 }
    .wt-npc-loc .wt-city { color:var(--c,#fff);font-weight:700;opacity:.9 }
    .wt-npc-loc .wt-subloc { color:var(--muted) }
    .wt-badge { padding:3px 9px;border-radius:20px;border:1px solid var(--bd);background:var(--bg);color:var(--c);font-size:.7rem;font-weight:700;white-space:nowrap;flex-shrink:0;margin-top:2px }

    /* Pokemon chips */
    .wt-chips { display:flex;flex-wrap:wrap;gap:8px;padding:12px 12px 8px }
    .wt-chip { display:flex;flex-direction:column;align-items:center;gap:3px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:8px 10px 6px;min-width:64px;cursor:pointer;transition:background .15s,border-color .15s }
    .wt-chip:hover { background:rgba(255,220,80,.07);border-color:rgba(255,220,80,.2) }
    .wt-chip-shiny { background:rgba(255,210,70,.07);border-color:rgba(255,210,70,.2) }
    .wt-chip-shiny:hover { background:rgba(255,210,70,.15);border-color:rgba(255,210,70,.4) }
    .wt-chip-name { font-size:.68rem;font-weight:700;color:#ffe066;text-align:center;letter-spacing:.3px;line-height:1.2 }
    .wt-chip-shiny .wt-chip-name { color:#ffd146 }
    .wt-chip-qty { font-family:var(--font-mono,monospace);font-size:.75rem;font-weight:900;color:rgba(255,255,255,.5);background:rgba(255,255,255,.06);border-radius:5px;padding:1px 6px }

    /* Reward */
    .wt-reward-row { display:flex;align-items:center;gap:8px;padding:8px 13px;border-top:1px solid rgba(255,255,255,.05);margin-top:auto }
    .wt-reward-lbl { font-size:.72rem;font-weight:700;color:var(--gold-bright);flex-shrink:0 }
    .wt-reward-val { font-size:.8rem;color:var(--gold-bright);opacity:.85 }

    /* Map button */
    .wt-map-btn { width:100%;padding:8px;border-radius:8px;border:1px solid rgba(96,192,255,.25);background:rgba(96,192,255,.08);color:#60c0ff;font-size:.8rem;cursor:pointer;font-family:var(--font-body);font-weight:700;letter-spacing:.5px;text-transform:uppercase;transition:all .15s }
    .wt-map-btn:hover { background:rgba(96,192,255,.18);border-color:rgba(96,192,255,.5);transform:scale(1.02) }

    @media(max-width:600px){
      .wt-chips { gap:6px }
      .wt-chip { min-width:56px;padding:6px 7px 5px }
      #wt-grid { padding:16px 12px 32px }
    }
  `;
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
      '<div class="wt-sw">' +
        '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="opacity:.5;flex-shrink:0"><circle cx="6" cy="6" r="4.5" stroke="white" stroke-width="1.5"/><path d="M10 10L13 13" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>' +
        '<input id="wt-search" type="text" placeholder="Buscar por NPC ou Pokémon...">' +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        '<button class="wt-fbtn active"  onclick="WikiTasks._filt(\'all\',this)">Todas</button>' +
        '<button class="wt-fbtn fe"      onclick="WikiTasks._filt(\'easy\',this)">🌿 Easy</button>' +
        '<button class="wt-fbtn fm"      onclick="WikiTasks._filt(\'medium\',this)">⚡ Intermediária</button>' +
        '<button class="wt-fbtn fh"      onclick="WikiTasks._filt(\'hard\',this)">🔥 Avançada</button>' +
        '<button class="wt-fbtn fp"      onclick="WikiTasks._filt(\'epic\',this)">💎 Épica</button>' +
      '</div>' +
      '<span id="wt-count"></span>' +
    '</div>' +
    '<div id="wt-grid"></div>';
  var inp = document.getElementById('wt-search');
  if (inp) { var t; inp.addEventListener('input', function(){ _q=this.value; clearTimeout(t); t=setTimeout(_render,130); }); }
  _render();
}

global.WikiTasks = {
  renderTasks: renderTasks,
  _map: _openMap,
  _filt: function(d, btn) {
    _diff = d;
    var p = document.getElementById('wiki-tab-tasks');
    if (p) p.querySelectorAll('.wt-fbtn').forEach(function(b){ b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    _render();
  },
  _search: function(name) {
    _q = name; _diff = 'all';
    var inp = document.getElementById('wt-search');
    if (inp) inp.value = name;
    var p = document.getElementById('wiki-tab-tasks');
    if (p) { p.querySelectorAll('.wt-fbtn').forEach(function(b){ b.classList.remove('active'); }); var all = p.querySelector('.wt-fbtn'); if (all) all.classList.add('active'); }
    _render();
  },
};
global.renderTasks = renderTasks;
/* Exposto p/ cruzamento de combos em wiki-linked-tasks.js */
global.PA_NPC_TASKS = TASKS;

}(window));
