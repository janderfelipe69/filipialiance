/**
 * wiki-modules-ext.js — Módulos Externos da Wiki
 *
 * CARREGUE APÓS wiki-nav.js e após os arquivos de renderização de cada módulo
 * (wiki-boost.js, wiki-star-ascension.js, tierlist.js, wiki-up150.js, wiki-minimap.js).
 *
 * Este arquivo registra cada módulo via WikiModules.register().
 * NÃO faz monkey patch de _wnOpen, _wnBack nem switchTab.
 * NÃO usa setTimeout/setInterval para detectar funções.
 *
 * Os arquivos de renderização (wiki-boost.js, etc.) continuam existindo, mas
 * devem APENAS expor window.renderBoost, window.renderStarAscension, etc.
 * O bloco patchWnOpen / injectCard de cada um deve ser REMOVIDO.
 */

(function (global) {
  'use strict';

  /* Garante que WikiModules existe — se não, algo carregou fora de ordem */
  if (!global.WikiModules) {
    console.error('wiki-modules-ext.js: WikiModules não encontrado. Verifique a ordem de carga dos scripts.');
    return;
  }

  /* ═══════════════════════════════════════════════════════════════
     BOOST
  ═══════════════════════════════════════════════════════════════ */

  WikiModules.register({
    id:    'boost',
    name:  'Sistema de Boost',
    icon:  '⚡',
    desc:  'Pedras, fragmentos e guia completo',
    color: '#ff9f43',
    rgb:   '255,159,67',

    render: function () {
      /* Garante que o painel existe antes de renderizar */
      var panel = document.getElementById('wiki-tab-boost');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'wiki-tab-boost';
        panel.className = 'wiki-subtab-content';
        document.getElementById('tab-wiki').appendChild(panel);
      }
      if (typeof global.renderBoost === 'function') {
        global.renderBoost();
      }
    },
  });

  /* ═══════════════════════════════════════════════════════════════
     STAR ASCENSION
  ═══════════════════════════════════════════════════════════════ */

  WikiModules.register({
    id:    'starascension',
    name:  'Star Ascension',
    icon:  '⭐',
    desc:  'Evolução de estrelas e bônus de ataque',
    color: '#f0b429',
    rgb:   '240,180,41',

    render: function () {
      var panel = document.getElementById('wiki-tab-starascension');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'wiki-tab-starascension';
        panel.className = 'wiki-subtab-content';
        document.getElementById('tab-wiki').appendChild(panel);
      }
      if (typeof global.renderStarAscension === 'function') {
        global.renderStarAscension();
      }
    },
  });

  /* ═══════════════════════════════════════════════════════════════
     TIER LIST & RESPAWN
  ═══════════════════════════════════════════════════════════════ */

  WikiModules.register({
    id:    'tierlist',
    name:  'Tier List & Respawn',
    icon:  '🏆',
    desc:  'Ranking de raridade de todos os Pokémon',
    color: '#f06292',
    rgb:   '240,98,146',

    render: function () {
      var panel = document.getElementById('wiki-tab-tierlist');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'wiki-tab-tierlist';
        panel.className = 'wiki-subtab-content';
        panel.innerHTML = '<div id="tierlist-root"></div>';
        document.getElementById('tab-wiki').appendChild(panel);
      }
      if (typeof global.renderTierList === 'function') {
        global.renderTierList();
      }
    },
  });

  /* ═══════════════════════════════════════════════════════════════
     UP 150
     (wiki-up150.js já registra o renderer em RENDERERS do wiki-nav
      via window._wnRenderers — mas com a nova arquitetura,
      registerUp150 só precisa criar o panel; o render é declarativo aqui)
  ═══════════════════════════════════════════════════════════════ */

  WikiModules.register({
    id:    'up150',
    name:  'Guia de Up',
    icon:  '⬆️',
    desc:  'Do nível 1 ao 150 passo a passo',
    color: '#60e0a0',
    rgb:   '96,224,160',

    render: function () {
      /* registerUp150 garante que o painel existe */
      if (typeof global.registerUp150 === 'function') global.registerUp150();
      if (typeof global.renderUp150   === 'function') global.renderUp150();
    },
  });

  /* ═══════════════════════════════════════════════════════════════
     MINIMAP
  ═══════════════════════════════════════════════════════════════ */

  WikiModules.register({
    id:    'minimap',
    name:  'Mapa Liberado',
    icon:  '🗺️',
    desc:  'Minimap do térreo 100% revelado',
    color: '#4cd9a0',
    rgb:   '76,217,160',

    render: function () {
      if (typeof global.registerMinimap === 'function') global.registerMinimap();
      if (typeof global.renderMinimap   === 'function') global.renderMinimap();
    },
  });

}(window));
