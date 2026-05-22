/**
 * wiki-modules-ext.js — Módulos Externos da Wiki
 *
 * CARREGUE APÓS wiki-nav.js e após os arquivos de renderização de cada módulo
 * (wiki-boost.js, wiki-star-ascension.js, tierlist.js, wiki-up150.js, wiki-minimap.js).
 *
 * Cada render() aqui segue o contrato:
 *   1. Garante que #wiki-tab-<id> existe em #tab-wiki (com estrutura interna correta).
 *   2. Chama o renderizador do módulo (renderBoost, renderStarAscension, etc.).
 *   3. NÃO move o panel para #wn-slot — isso é responsabilidade exclusiva de _mountPanel()
 *      em wiki-nav.js, que é chamado DEPOIS de render().
 *
 * Esta separação garante:
 *   - O panel sempre existe quando _mountPanel() o busca.
 *   - Containers internos (ex: #tierlist-root) existem antes da montagem.
 *   - Nenhum panel genérico vazio é exibido.
 *   - O runtime controla 100% da montagem, visibilidade e slot.
 */

(function (global) {
  'use strict';

  if (!global.WikiModules) {
    console.error('wiki-modules-ext.js: WikiModules não encontrado. Verifique a ordem de carga dos scripts.');
    return;
  }

  /* ─── Utilitário: garante que o panel existe em #tab-wiki ────────
     Módulos que precisam de estrutura interna específica
     (ex: tierlist precisa de #tierlist-root) passam o innerHTML inicial.
     Se o panel já existe (segunda abertura), não recria — evita apagar
     conteúdo renderizado.
  ────────────────────────────────────────────────────────────────── */
  function _ensurePanel(id, initialHTML) {
    var panel = document.getElementById('wiki-tab-' + id);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'wiki-tab-' + id;
      panel.className = 'wiki-subtab-content';
      if (initialHTML) panel.innerHTML = initialHTML;
      var tabWiki = document.getElementById('tab-wiki');
      if (tabWiki) tabWiki.appendChild(panel);
    }
    return panel;
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
      /* Garante panel antes do renderizador (renderBoost faz early-return se não existe) */
      _ensurePanel('boost');
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
      /* renderStarAscension() já cria o panel se não existe — mas cria em #tab-wiki.
         _ensurePanel garante o panel antes, evitando criação duplicada e
         tornando o comportamento explícito e auditável. */
      _ensurePanel('starascension');
      if (typeof global.renderStarAscension === 'function') {
        global.renderStarAscension();
      }
    },
  });

  /* ═══════════════════════════════════════════════════════════════
     TIER LIST & RESPAWN
     ATENÇÃO: renderTierList() busca #tierlist-root — que deve existir
     DENTRO do panel antes de renderTierList() ser chamado.
     _ensurePanel cria o panel com o container interno correto.
  ═══════════════════════════════════════════════════════════════ */

  WikiModules.register({
    id:    'tierlist',
    name:  'Tier List & Respawn',
    icon:  '🏆',
    desc:  'Ranking de raridade de todos os Pokémon',
    color: '#f06292',
    rgb:   '240,98,146',

    render: function () {
      /* Cria o panel com #tierlist-root interno — renderTierList() depende disso */
      _ensurePanel('tierlist', '<div id="tierlist-root"></div>');
      if (typeof global.renderTierList === 'function') {
        global.renderTierList();
      }
    },
  });

  /* ═══════════════════════════════════════════════════════════════
     UP 150
  ═══════════════════════════════════════════════════════════════ */

  WikiModules.register({
    id:    'up150',
    name:  'Guia de Up',
    icon:  '⬆️',
    desc:  'Do nível 1 ao 150 passo a passo',
    color: '#60e0a0',
    rgb:   '96,224,160',

    render: function () {
      /* registerUp150() cria o panel em #tab-wiki se não existe —
         _ensurePanel é idempotente e garante que isso ocorra antes de renderUp150() */
      _ensurePanel('up150');
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
      _ensurePanel('minimap');
      if (typeof global.registerMinimap === 'function') global.registerMinimap();
      if (typeof global.renderMinimap   === 'function') global.renderMinimap();
    },
  });

}(window));
