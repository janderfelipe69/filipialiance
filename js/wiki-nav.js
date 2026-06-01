/**
 * wiki-nav.js — PokeAlliance Wiki · Runtime de Módulos
 *
 * CARREGUE APENAS UMA VEZ, após app.js, antes dos módulos wiki-*.js.
 * Este arquivo substitui todas as versões anteriores de wiki-nav.js.
 *
 * Expõe o singleton window.WikiModules com a API:
 *
 *   WikiModules.register(descriptor)   — registra um módulo
 *   WikiModules.open(id, opts)          — abre um módulo
 *   WikiModules.close(opts)             — fecha / volta ao home
 *   WikiModules.current()               — id do módulo aberto ou null
 *   WikiModules.getAll()                — array de todos os módulos registrados
 *
 * Módulos externos (boost, starascension, tierlist, etc.) chamam
 * WikiModules.register() em vez de fazer monkey patch de _wnOpen.
 *
 * Para retrocompatibilidade, window._wnOpen e window._wnBack continuam
 * funcionando como atalhos — mas são definidos UMA VEZ aqui e não devem
 * ser sobrescritos por nenhum outro arquivo.
 */

(function (global) {
  'use strict';

  /* ── Guarda de singleton ──────────────────────────────────────── */
  if (global.WikiModules) return;

  /* ═══════════════════════════════════════════════════════════════
     REGISTRO DE MÓDULOS
     Cada módulo é um objeto com a estrutura abaixo.
     Módulos nativos são registrados aqui; externos chamam
     WikiModules.register() depois que o arquivo carrega.
  ═══════════════════════════════════════════════════════════════ */

  /**
   * @typedef {Object} WikiModuleDescriptor
   * @property {string}    id       - identificador único (slug)
   * @property {string}    name     - nome exibido
   * @property {string}    icon     - emoji ou HTML
   * @property {string}    desc     - descrição curta
   * @property {string}    color    - cor CSS (#rrggbb)
   * @property {string}    rgb      - tripla RGB 'r,g,b'
   * @property {function}  [render] - chamado ao abrir o módulo
   * @property {function}  [onClose]- chamado ao fechar o módulo
   * @property {boolean}   [hidden] - true → não aparece no grid home
   */

  /** @type {WikiModuleDescriptor[]} */
  var _modules = [];

  /** @type {string|null} */
  var _current = null;

  /* ─── Módulos nativos ─────────────────────────────────────────── */
  var _native = [
    { id: 'itens',       name: 'Itens & Drops',     icon: '📦', desc: 'Enciclopédia de drops por Pokémon',      color: '#3a8cff', rgb: '58,140,255'   },
    { id: 'respawn',     name: 'Respawn',            icon: '🔄', desc: 'Mecânica de respawn explicada',          color: '#ff6b6b', rgb: '255,107,107',  hidden: true },
    { id: 'quests',      name: 'Quests',             icon: '📜', desc: 'Missões e recompensas',                  color: '#ffd166', rgb: '255,209,102'   },
    { id: 'npcs',        name: 'NPCs',               icon: '🧑‍💼', desc: 'Rockets, Officers e mais',            color: '#a0d4ff', rgb: '160,212,255'   },
    { id: 'brokes',      name: 'Brokes',             icon: '💥', desc: 'Sistema de brokes explicado',           color: '#ff9f43', rgb: '255,159,67'    },
    { id: 'hazard',      name: 'Hazard Tasks',       icon: '⚠️', desc: 'Tasks de NPCs especiais',               color: '#ffd166', rgb: '255,209,102'   },
    { id: 'starcalc',    name: 'Star Calc',          icon: '⭐', desc: 'Custo de evolução de estrelas',         color: '#f0b429', rgb: '240,180,41'    },
    { id: 'punchingbag', name: 'Punching Bag',       icon: '🥊', desc: 'Treinamento e exp',                     color: '#ff6b6b', rgb: '255,107,107'   },
    { id: 'roupasspeed', name: 'Roupas Speed',       icon: '🎽', desc: 'Roupas e bônus de velocidade',          color: '#60aaff', rgb: '96,170,255'    },
    { id: 'talents',     name: 'PokéTalents',        icon: '✨', desc: 'Sistema de talentos',                   color: '#d4a0ff', rgb: '212,160,255'   },
    { id: 'tokens',      name: 'Tokens',             icon: '🪙', desc: 'Moeda especial e Helds',                color: '#f0b429', rgb: '240,180,41'    },
    { id: 'medals',      name: 'Medal System',       icon: '🏅', desc: 'Medalhas, raridades e XP',              color: '#cd7f32', rgb: '205,127,50'    },
    /* up150 e minimap são registrados por wiki-modules-ext.js (dono único).
       Antes eram declarados aqui também, mas o register() de lá os sobrescrevia
       — duplicação removida na Fase 2 da organização da wiki (2026-05-31). */
  ];

  /* Renderizadores para módulos nativos — delegam para funções de app.js */
  var _nativeRenderers = {
    itens:       function () { if (typeof renderWiki        === 'function') renderWiki(); },
    respawn:     function () { if (typeof renderRespawn     === 'function') renderRespawn(); },
    quests:      function () { if (typeof renderQuests      === 'function') renderQuests(); },
    npcs:        function () {
      if (typeof renderRockets  === 'function') renderRockets();
      if (typeof renderOfficers === 'function') renderOfficers();
      if (typeof switchNpcSubcat === 'function') {
        var btn = document.querySelector('.npc-subcat-btn.active');
        var sub = btn ? (btn.getAttribute('data-subcat') || 'rockets') : 'rockets';
        switchNpcSubcat(sub, btn);
      }
    },
    brokes:      function () { if (typeof renderBrokes      === 'function') renderBrokes(); },
    hazard:      function () { if (typeof renderHazard      === 'function') renderHazard(); },
    starcalc:    function () { if (typeof renderStarCalc    === 'function') renderStarCalc(); },
    punchingbag: function () { if (typeof renderPunchingBag === 'function') renderPunchingBag(); },
    roupasspeed: function () { if (typeof renderRoupasSpeed === 'function') renderRoupasSpeed(); },
    talents:     function () { if (typeof renderTalents     === 'function') renderTalents(); },
    tokens:      function () { if (typeof renderTokens      === 'function') renderTokens(); },
    medals:      function () { if (typeof renderMedals      === 'function') renderMedals(); },
    /* up150 e minimap: renderers próprios em wiki-modules-ext.js (Fase 2) */
  };

  _native.forEach(function (m) {
    m.render = _nativeRenderers[m.id] || null;
    _modules.push(m);
  });

  /* ═══════════════════════════════════════════════════════════════
     CSS
  ═══════════════════════════════════════════════════════════════ */

  (function injectStyles() {
    var S = document.createElement('style');
    S.id = 'wn-styles';
    S.textContent = [
      /* Esconde estrutura original da wiki */
      '.wiki-banner,.wiki-subtabs,#wiki-subtabs-sentinel{display:none!important}',
      /* Panels ficam escondidos até serem montados no slot */
      '.wiki-subtab-content{display:none!important}',
      '.wiki-subtab-content.wn-visible{display:block!important}',
      '#tab-wiki{padding:0!important}',
      '#wn-shell{min-height:60vh}',
      /* hero da home */
      '.wn-hero{position:relative;text-align:center;padding:44px 20px 40px;margin-bottom:8px;overflow:hidden}',
      '.wn-hero::before{content:"";position:absolute;top:0;left:50%;transform:translateX(-50%);width:600px;height:200px;background:radial-gradient(ellipse at 50% 0%,rgba(58,140,255,.18) 0%,rgba(100,60,255,.08) 45%,transparent 70%);pointer-events:none}',
      '.wn-hero::after{content:"";position:absolute;top:0;left:15%;right:15%;height:1px;background:linear-gradient(90deg,transparent,rgba(58,140,255,.5),rgba(160,100,255,.4),rgba(58,140,255,.5),transparent)}',
      '.wn-hero-icon{font-size:52px;line-height:1;margin-bottom:16px;display:block;filter:drop-shadow(0 0 20px rgba(100,160,255,.5));animation:wn-float 3.5s ease-in-out infinite}',
      '@keyframes wn-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}',
      '.wn-hero-title{font-family:var(--font-title,"Cinzel",serif);font-size:clamp(28px,5vw,44px);font-weight:900;letter-spacing:8px;text-transform:uppercase;line-height:1;margin-bottom:10px;background:linear-gradient(135deg,#a0c8ff 0%,#fff 35%,#c8a0ff 65%,#7ab8ff 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}',
      '.wn-hero-sub{font-family:var(--font-body,"Rajdhani",sans-serif);font-size:12px;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:rgba(160,200,255,.45);margin-bottom:20px}',
      '.wn-hero-divider{display:flex;align-items:center;justify-content:center;gap:12px;margin:0 auto;max-width:320px}',
      '.wn-hero-divider-line{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(100,160,255,.35))}',
      '.wn-hero-divider-line:last-child{background:linear-gradient(90deg,rgba(100,160,255,.35),transparent)}',
      '.wn-hero-divider-gem{width:6px;height:6px;background:rgba(100,160,255,.6);border-radius:1px;transform:rotate(45deg);box-shadow:0 0 8px rgba(100,160,255,.5)}',
      '.wn-home-header{display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-top:10px}',
      '.wn-home-title{font-family:var(--font-title,"Cinzel",serif);font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.28);white-space:nowrap}',
      '.wn-home-line{flex:1;height:1px;background:linear-gradient(90deg,rgba(58,140,255,.2),transparent)}',
      /* grid de cards */
      '.wn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}',
      '.wn-card{position:relative;background:rgba(8,15,30,.95);border:1px solid rgba(58,140,255,.1);border-radius:16px;padding:22px 16px 18px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;user-select:none;-webkit-tap-highlight-color:transparent;overflow:hidden;transition:transform .22s cubic-bezier(.16,1,.3,1),border-color .2s,box-shadow .2s,background .2s;animation:wnCardIn .3s cubic-bezier(.16,1,.3,1) both}',
      '.wn-card::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--wn-color,#3a8cff),transparent);opacity:.5;transition:opacity .22s;border-radius:16px 16px 0 0}',
      '.wn-card::after{content:"";position:absolute;inset:0;border-radius:inherit;background:radial-gradient(ellipse at 50% 0%,var(--wn-glow,rgba(58,140,255,.1)) 0%,transparent 65%);opacity:0;transition:opacity .25s;pointer-events:none}',
      '.wn-card:hover{transform:translateY(-4px) scale(1.02);border-color:rgba(var(--wn-rgb,58,140,255),.35);box-shadow:0 0 24px rgba(var(--wn-rgb,58,140,255),.14),0 10px 30px rgba(0,0,0,.5);background:rgba(10,18,36,.98)}',
      '.wn-card:hover::before{opacity:1}.wn-card:hover::after{opacity:1}',
      '.wn-card:active{transform:translateY(-1px) scale(.98);transition-duration:.07s}',
      '.wn-card-icon{font-size:36px;line-height:1;filter:drop-shadow(0 2px 6px rgba(var(--wn-rgb,58,140,255),.25));transition:transform .25s cubic-bezier(.16,1,.3,1)}',
      '.wn-card:hover .wn-card-icon{transform:scale(1.12) translateY(-2px)}',
      '.wn-card-name{font-family:var(--font-title,"Cinzel",serif);font-size:11px;font-weight:700;letter-spacing:.5px;color:rgba(221,232,255,.88);line-height:1.35;transition:color .18s}',
      '.wn-card:hover .wn-card-name{color:#fff}',
      '.wn-card-desc{font-family:var(--font-body,"Rajdhani",sans-serif);font-size:10.5px;font-weight:500;color:rgba(255,255,255,.22);line-height:1.4;transition:color .18s}',
      '.wn-card:hover .wn-card-desc{color:rgba(var(--wn-rgb,58,140,255),.6)}',
      '.wn-card-arrow{position:absolute;bottom:10px;right:12px;opacity:0;transform:scale(.7) translateX(-4px);transition:opacity .18s,transform .18s;color:rgba(var(--wn-rgb,58,140,255),.7);font-size:14px}',
      '.wn-card:hover .wn-card-arrow{opacity:1;transform:scale(1) translateX(0)}',
      '@keyframes wnCardIn{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}',
      /* tela de conteúdo */
      '#wn-home{padding:0 0 60px}',
      '#wn-content{display:none;padding:0 0 60px}',
      '#wn-content.visible{display:block}',
      '.wn-topbar{display:flex;align-items:center;gap:10px;padding:18px 0 20px;border-bottom:1px solid rgba(58,140,255,.1);margin-bottom:22px}',
      '.wn-back-btn{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:7px 14px 7px 10px;cursor:pointer;font-family:var(--font-body,"Rajdhani",sans-serif);font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:rgba(255,255,255,.5);transition:background .18s,border-color .18s,color .18s,transform .15s;user-select:none;flex-shrink:0}',
      '.wn-back-btn:hover{background:rgba(58,140,255,.08);border-color:rgba(58,140,255,.3);color:#60aaff;transform:translateX(-2px)}',
      '.wn-back-btn:active{transform:translateX(-4px);transition-duration:.07s}',
      '.wn-back-arrow{width:16px;height:16px;flex-shrink:0}',
      '.wn-breadcrumb{display:flex;align-items:center;gap:6px;font-family:var(--font-body,"Rajdhani",sans-serif);font-size:11px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:rgba(255,255,255,.22)}',
      '.wn-breadcrumb-sep{color:rgba(255,255,255,.12)}',
      '.wn-breadcrumb-current{color:rgba(255,255,255,.65);display:flex;align-items:center;gap:5px}',
      '.wn-breadcrumb-current-icon{font-size:13px}',
      '.wn-mod-banner{position:relative;display:flex;align-items:center;gap:18px;padding:22px 0 24px;margin-bottom:4px;overflow:hidden}',
      '.wn-mod-banner::before{content:"";position:absolute;left:-40px;top:50%;transform:translateY(-50%);width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,var(--wn-mod-glow,rgba(58,140,255,.15)) 0%,transparent 70%);pointer-events:none}',
      '.wn-mod-banner-icon{font-size:44px;line-height:1;flex-shrink:0;filter:drop-shadow(0 0 14px var(--wn-mod-color,rgba(58,140,255,.6)));position:relative}',
      '.wn-mod-banner-label{font-family:var(--font-title,"Cinzel",serif);font-size:9px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:var(--wn-mod-color,rgba(58,140,255,.7));margin-bottom:5px;opacity:.75}',
      '.wn-mod-banner-name{font-family:var(--font-title,"Cinzel",serif);font-size:clamp(20px,4vw,30px);font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#fff;line-height:1;text-shadow:0 2px 20px var(--wn-mod-color,rgba(58,140,255,.4))}',
      '.wn-mod-banner-desc{font-family:var(--font-body,"Rajdhani",sans-serif);font-size:12px;font-weight:500;color:rgba(255,255,255,.32);margin-top:6px;letter-spacing:.5px}',
      '.wn-mod-banner-line{height:1px;background:linear-gradient(90deg,var(--wn-mod-color,rgba(58,140,255,.4)),transparent 60%);margin-bottom:20px;opacity:.5}',
      '@media(max-width:640px){.wn-grid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}.wn-card{padding:18px 12px 15px;gap:8px;border-radius:14px}.wn-card-icon{font-size:30px}.wn-card-name{font-size:10.5px}.wn-topbar{padding:14px 0 16px;margin-bottom:16px}}',
      '@media(max-width:400px){.wn-grid{grid-template-columns:1fr 1fr;gap:8px}}',
    ].join('\n');
    document.head.appendChild(S);
  }());

  /* ═══════════════════════════════════════════════════════════════
     CONSTRUÇÃO DO SHELL DOM
  ═══════════════════════════════════════════════════════════════ */

  function _buildShell() {
    var tabWiki = document.getElementById('tab-wiki');
    if (!tabWiki) return;
    if (document.getElementById('wn-shell')) return; /* já existe */

    var shell = document.createElement('div');
    shell.id = 'wn-shell';

    /* HOME */
    var home = document.createElement('div');
    home.id = 'wn-home';
    home.innerHTML =
      '<div class="wn-hero">' +
        '<span class="wn-hero-icon">📖</span>' +
        '<div class="wn-hero-title">W I K I</div>' +
        '<div class="wn-hero-sub">Enciclopédia PokeAlliance</div>' +
        '<div class="wn-hero-divider">' +
          '<div class="wn-hero-divider-line"></div>' +
          '<div class="wn-hero-divider-gem"></div>' +
          '<div class="wn-hero-divider-gem" style="background:rgba(180,100,255,.6);box-shadow:0 0 8px rgba(180,100,255,.5)"></div>' +
          '<div class="wn-hero-divider-gem"></div>' +
          '<div class="wn-hero-divider-line"></div>' +
        '</div>' +
      '</div>' +
      '<div class="wn-home-header">' +
        '<span class="wn-home-title">Módulos</span>' +
        '<div class="wn-home-line"></div>' +
      '</div>' +
      '<div class="wn-grid" id="wn-grid"></div>';

    /* CONTENT */
    var content = document.createElement('div');
    content.id = 'wn-content';
    content.innerHTML =
      '<div class="wn-topbar">' +
        '<button class="wn-back-btn" onclick="WikiModules.close()">' +
          '<svg class="wn-back-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">' +
            '<polyline points="15 18 9 12 15 6"/>' +
          '</svg>' +
          'Voltar' +
        '</button>' +
        '<div class="wn-breadcrumb">' +
          '<span>Wiki</span>' +
          '<span class="wn-breadcrumb-sep">›</span>' +
          '<span class="wn-breadcrumb-current" id="wn-breadcrumb-current">' +
            '<span class="wn-breadcrumb-current-icon" id="wn-bc-icon"></span>' +
            '<span id="wn-bc-name"></span>' +
          '</span>' +
        '</div>' +
      '</div>' +
      '<div class="wn-mod-banner" id="wn-mod-banner">' +
        '<div class="wn-mod-banner-icon" id="wn-mod-icon"></div>' +
        '<div class="wn-mod-banner-text">' +
          '<div class="wn-mod-banner-label">Wiki · Módulo</div>' +
          '<div class="wn-mod-banner-name" id="wn-mod-name"></div>' +
          '<div class="wn-mod-banner-desc" id="wn-mod-desc"></div>' +
        '</div>' +
      '</div>' +
      '<div class="wn-mod-banner-line" id="wn-mod-line"></div>' +
      '<div id="wn-slot"></div>';

    shell.appendChild(home);
    shell.appendChild(content);
    tabWiki.appendChild(shell);

    /* Renderiza grid com módulos já registrados */
    _rebuildGrid();
  }

  /* ═══════════════════════════════════════════════════════════════
     CATEGORIAS DA HOME
     Cada categoria agrupa módulos por afinidade. A ordem de `mods`
     define a ordem dos cards dentro da seção. Qualquer módulo não
     listado aqui cai automaticamente em "Outros" (à prova de futuro).
  ═══════════════════════════════════════════════════════════════ */

  var _categories = [
    { id: 'guias',    title: 'Guias',         icon: '📘', color: '96,224,160',
      mods: ['up150', 'starcalc', 'roupasspeed', 'punchingbag', 'boost'] },
    { id: 'sistemas', title: 'Sistemas',      icon: '⚙️', color: '212,160,255',
      mods: ['talents', 'starascension', 'medals', 'tokens', 'brokes'] },
    { id: 'dados',    title: 'Dados & Mundo', icon: '🗺️', color: '96,170,255',
      mods: ['itens', 'tierlist', 'quests', 'npcs', 'hazard', 'tasks', 'linkedtasks', 'minimap'] },
  ];

  /** Monta o HTML de um único card de módulo. */
  function _cardHTML(m, i) {
    var card = document.createElement('div');
    card.className = 'wn-card';
    card.setAttribute('data-wn-id', m.id);
    card.style.cssText =
      '--wn-color:' + m.color + ';' +
      '--wn-rgb:' + m.rgb + ';' +
      '--wn-glow:rgba(' + m.rgb + ',0.12);' +
      'animation-delay:' + (i * 30) + 'ms';
    card.setAttribute('onclick', "WikiModules.open('" + m.id + "')");
    card.title = m.name;
    card.innerHTML =
      '<div class="wn-card-icon">' + m.icon + '</div>' +
      '<div class="wn-card-name">' + m.name + '</div>' +
      '<div class="wn-card-desc">' + m.desc + '</div>' +
      '<div class="wn-card-arrow">→</div>';
    return card;
  }

  /* ═══════════════════════════════════════════════════════════════
     GRID DO HOME — agrupado por categorias
  ═══════════════════════════════════════════════════════════════ */

  function _rebuildGrid() {
    var grid = document.getElementById('wn-grid');
    if (!grid) return;
    grid.innerHTML = '';

    /* Index id → módulo (apenas visíveis) */
    var byId = {};
    _modules.forEach(function (m) { if (!m.hidden) byId[m.id] = m; });

    var usados = {};
    var idxGlobal = 0;

    /* Renderiza cada categoria na ordem definida */
    _categories.forEach(function (cat) {
      var mods = cat.mods
        .map(function (id) { return byId[id]; })
        .filter(Boolean);
      if (!mods.length) return;

      grid.appendChild(_categoryHeader(cat, mods.length));

      var section = document.createElement('div');
      section.className = 'wn-grid';
      mods.forEach(function (m) {
        usados[m.id] = true;
        section.appendChild(_cardHTML(m, idxGlobal++));
      });
      grid.appendChild(section);
    });

    /* Módulos visíveis sem categoria → seção "Outros" */
    var orfaos = _modules.filter(function (m) {
      return !m.hidden && !usados[m.id];
    });
    if (orfaos.length) {
      grid.appendChild(_categoryHeader(
        { title: 'Outros', icon: '✦', color: '160,180,210' }, orfaos.length));
      var extra = document.createElement('div');
      extra.className = 'wn-grid';
      orfaos.forEach(function (m) { extra.appendChild(_cardHTML(m, idxGlobal++)); });
      grid.appendChild(extra);
    }
  }

  /** Cabeçalho de uma categoria (título + linha + contador). */
  function _categoryHeader(cat, count) {
    var h = document.createElement('div');
    h.className = 'wn-cat-header';
    h.style.setProperty('--cat', 'rgba(' + cat.color + ',0.8)');
    h.innerHTML =
      '<span class="wn-cat-icon">' + cat.icon + '</span>' +
      '<span class="wn-cat-title">' + cat.title + '</span>' +
      '<span class="wn-cat-line"></span>' +
      '<span class="wn-cat-count">' + count + '</span>';
    return h;
  }

  /* ═══════════════════════════════════════════════════════════════
     LÓGICA DE ABERTURA / FECHAMENTO
  ═══════════════════════════════════════════════════════════════ */

  /**
   * Atualiza breadcrumb, banner e linha de cor para o módulo dado.
   * @param {WikiModuleDescriptor} mod
   */
  function _updateChrome(mod) {
    var bcIcon  = document.getElementById('wn-bc-icon');
    var bcName  = document.getElementById('wn-bc-name');
    var banner  = document.getElementById('wn-mod-banner');
    var modLine = document.getElementById('wn-mod-line');
    var modIcon = document.getElementById('wn-mod-icon');
    var modName = document.getElementById('wn-mod-name');
    var modDesc = document.getElementById('wn-mod-desc');

    if (bcIcon) bcIcon.innerHTML  = mod.icon;
    if (bcName) bcName.textContent = mod.name;

    if (banner) {
      banner.style.setProperty('--wn-mod-color', mod.color);
      banner.style.setProperty('--wn-mod-glow',  'rgba(' + mod.rgb + ',0.18)');
    }
    if (modIcon) modIcon.innerHTML   = mod.icon;
    if (modName) modName.textContent = mod.name;
    if (modDesc) modDesc.textContent = mod.desc;
    if (modLine) modLine.style.background =
      'linear-gradient(90deg,' + mod.color + '55,transparent 60%)';
  }

  /**
   * Monta o painel do módulo no #wn-slot, garantindo que
   * apenas um painel fica visível por vez.
   *
   * IMPORTANTE: render() já deve ter rodado antes desta função.
   * O panel deve existir em #tab-wiki antes de ser movido para o slot.
   *
   * @param {string} id
   * @returns {HTMLElement|null} o panel montado, ou null se slot não existe
   */
  function _mountPanel(id) {
    var slot  = document.getElementById('wn-slot');
    var panel = document.getElementById('wiki-tab-' + id);

    if (!slot) return null;

    /* Se render() não criou o panel (módulo sem renderer), cria um container
       mínimo para que o slot não fique em estado inconsistente. */
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'wiki-tab-' + id;
      panel.className = 'wiki-subtab-content';
      /* Não faz appendChild em tab-wiki — o slot já é dentro de #wn-shell
         que está dentro de #tab-wiki, então o panel vai direto para o slot. */
    }

    /* Remove visibilidade de todos os outros painéis */
    document.querySelectorAll('.wiki-subtab-content.wn-visible').forEach(function (el) {
      if (el !== panel) el.classList.remove('wn-visible');
    });

    /* Move o panel para o slot (idempotente — slot.contains já verifica) */
    if (!slot.contains(panel)) {
      while (slot.firstChild) slot.removeChild(slot.firstChild);
      slot.appendChild(panel);
    }

    /* Torna visível — só aqui, após estar no slot, o CSS libera o display */
    panel.classList.add('wn-visible');
    return panel;
  }

  /**
   * Abre um módulo.
   *
   * Ordem de operações (determinística):
   *   1. Atualiza chrome (breadcrumb, banner, cor)
   *   2. Mostra #wn-content, esconde #wn-home
   *   3. Chama mod.render() — o módulo cria/preenche seu panel em #tab-wiki
   *   4. _mountPanel() move o panel para #wn-slot e adiciona wn-visible
   *
   * render() ANTES de _mountPanel() garante que:
   *   - o panel existe quando _mountPanel() o busca
   *   - tierlist-root e outros containers internos existem antes da montagem
   *   - nenhum panel genérico vazio é exibido
   *
   * @param {string} id
   * @param {Object} [opts]
   * @param {boolean} [opts.skipHistory] - não dispara evento wikiModuleOpen
   */
  function open(id, opts) {
    opts = opts || {};

    var mod = null;
    for (var i = 0; i < _modules.length; i++) {
      if (_modules[i].id === id) { mod = _modules[i]; break; }
    }
    if (!mod) {
      console.warn('WikiModules.open: módulo "' + id + '" não registrado.');
      return;
    }

    _current = id;

    /* 1. Atualiza chrome */
    _updateChrome(mod);

    /* 2. Mostra tela de conteúdo, esconde home */
    var home    = document.getElementById('wn-home');
    var content = document.getElementById('wn-content');
    if (home)    home.style.display = 'none';
    if (content) { content.style.display = 'block'; content.classList.add('visible'); }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    /* 3. Chama renderer ANTES de montar no slot
          O módulo cria/preenche #wiki-tab-<id> em #tab-wiki.
          Se render() falhar, _mountPanel ainda tenta montar o que houver. */
    if (typeof mod.render === 'function') {
      try { mod.render(); } catch (e) { console.error('WikiModules: erro em render de', id, e); }
    }

    /* 4. Monta o painel no slot (panel já existe graças ao render() acima) */
    _mountPanel(id);

    /* Notifica NavRuntime */
    if (!opts.skipHistory) {
      document.dispatchEvent(new CustomEvent('wikiModuleOpen', { detail: { id: id } }));
    }
  }

  /**
   * Fecha o módulo atual e volta ao home da wiki.
   * @param {Object} [opts]
   * @param {boolean} [opts.skipHistory]
   */
  function close(opts) {
    opts = opts || {};
    if (!_current) return;

    var mod = null;
    for (var i = 0; i < _modules.length; i++) {
      if (_modules[i].id === _current) { mod = _modules[i]; break; }
    }

    /* Desmonta painel do slot e devolve para tab-wiki */
    var slot  = document.getElementById('wn-slot');
    var panel = document.getElementById('wiki-tab-' + _current);
    if (slot && panel) {
      panel.classList.remove('wn-visible');
      var tabWiki = document.getElementById('tab-wiki');
      if (tabWiki) tabWiki.appendChild(panel);
      while (slot.firstChild) slot.removeChild(slot.firstChild);
    }

    /* Reseta _current ANTES de qualquer mutação no DOM.
     * O MutationObserver em nav-runtime.js pode disparar durante as
     * alterações de classe/display abaixo. Se _current ainda apontar para
     * o módulo antigo nesse instante, _syncFromDOM lerá WikiModules.current()
     * e gravará #wiki/<módulo> de volta na URL — exatamente o bug que
     * estamos corrigindo. Resetar aqui garante que _syncFromDOM verá null. */
    _current = null;

    /* Callback opcional do módulo */
    if (mod && typeof mod.onClose === 'function') {
      try { mod.onClose(); } catch (e) {}
    }

    /* Mostra home */
    var home    = document.getElementById('wn-home');
    var content = document.getElementById('wn-content');
    if (home)    home.style.display = 'block';
    if (content) { content.style.display = 'none'; content.classList.remove('visible'); }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (!opts.skipHistory) {
      document.dispatchEvent(new CustomEvent('wikiModuleClose'));
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     API PÚBLICA
  ═══════════════════════════════════════════════════════════════ */

  var WikiModules = {
    /**
     * Registra um módulo externo.
     * Pode ser chamado a qualquer momento — idempotente por id.
     * @param {WikiModuleDescriptor} descriptor
     */
    register: function (descriptor) {
      if (!descriptor || !descriptor.id) {
        console.error('WikiModules.register: descriptor inválido', descriptor);
        return;
      }
      /* Idempotência — atualiza se já existir */
      for (var i = 0; i < _modules.length; i++) {
        if (_modules[i].id === descriptor.id) {
          _modules[i] = descriptor;
          _rebuildGrid();
          return;
        }
      }
      _modules.push(descriptor);
      _rebuildGrid();
    },

    /** Abre um módulo por id */
    open: open,

    /** Fecha o módulo atual */
    close: close,

    /** Retorna o id do módulo atualmente aberto, ou null */
    current: function () { return _current; },

    /** Retorna cópia do array de módulos registrados */
    getAll: function () { return _modules.slice(); },
  };

  global.WikiModules = WikiModules;

  /* ── Retrocompatibilidade: _wnOpen / _wnBack ───────────────────── */
  /* Definidos UMA VEZ aqui. Nenhum outro arquivo deve sobrescrever. */
  global._wnOpen = function (id) { WikiModules.open(id); };
  global._wnBack = function ()   { WikiModules.close(); };

  /* ── switchWikiTab (chamado por botões de sub-aba legados no HTML) */
  global.switchWikiTab = function (tab) {
    var tabWiki = document.getElementById('tab-wiki');
    if (!tabWiki || !tabWiki.classList.contains('active')) return;
    WikiModules.open(tab);
  };

  /* ═══════════════════════════════════════════════════════════════
     INTEGRAÇÃO COM NavRuntime (hook de switchTab)
     Quando o usuário vai para a aba wiki → garante home visível.
     Feito via evento porque NavRuntime pode carregar antes ou depois.
  ═══════════════════════════════════════════════════════════════ */

  function _hookNavRuntime() {
    if (global.NavRuntime) {
      global.NavRuntime.onTabSwitch('after', 'wiki-nav-reset', function (tab) {
        if (tab !== 'wiki') return;
        /* Se havia um módulo aberto e o usuário clicou em outra aba e voltou,
           o home deve aparecer (o módulo não fecha — só fica fora de tela) */
        var home    = document.getElementById('wn-home');
        var content = document.getElementById('wn-content');
        if (_current) {
          /* Mantém o módulo no estado — usuário pode ter voltado com o botão voltar */
        } else {
          if (home)    home.style.display = 'block';
          if (content) { content.style.display = 'none'; content.classList.remove('visible'); }
        }
        document.querySelectorAll('.wiki-subtab-content.wn-visible').forEach(function (el) {
          if (!_current) el.classList.remove('wn-visible');
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     INICIALIZAÇÃO
  ═══════════════════════════════════════════════════════════════ */

  function _init() {
    _buildShell();
    _hookNavRuntime();

    /* Sinaliza que WikiModules está pronto — NavRuntime pode estar esperando */
    document.dispatchEvent(new CustomEvent('wikiModulesReady'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

}(window));
