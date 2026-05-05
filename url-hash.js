/**
 * url-hash.js — PokeAlliance Shop · Deep Linking via URL Hash
 *
 * Formatos suportados:
 *   #itens              → aba Itens
 *   #pacotes            → aba Pacotes
 *   #captura            → aba Captura
 *   #entregas           → aba Entregas
 *   #wiki               → aba Wiki (sub-aba padrão: itens)
 *   #wiki/respawn       → aba Wiki > Local de Respawn
 *   #wiki/quests        → aba Wiki > Quests
 *   #wiki/npcs          → aba Wiki > NPC's
 *   #wiki/brokes        → aba Wiki > Brokes
 *   #wiki/hazard        → aba Wiki > Hazard Tasks
 *   #wiki/starcalc      → aba Wiki > Star Calculation
 *   #wiki/punchingbag   → aba Wiki > Punching Bag
 *   #wiki/roupasspeed   → aba Wiki > Roupas de Speed
 */

(function () {
  'use strict';

  /* ── Mapeamentos ── */

  // Hash principal → id da aba + botão correspondente
  var MAIN_TABS = {
    'itens':    { tab: 'itens',    btnQuery: '[onclick*="switchTab(\'itens\'"]' },
    'pacotes':  { tab: 'pacotes',  btnQuery: '[onclick*="switchTab(\'pacotes\'"]' },
    'captura':  { tab: 'captura',  btnQuery: '[onclick*="switchTab(\'captura\'"]' },
    'entregas': { tab: 'entregas', btnQuery: '[onclick*="switchTab(\'entregas\'"]' },
    'wiki':     { tab: 'wiki',     btnQuery: '[onclick*="switchTab(\'wiki\'"]' },
  };

  // Sub-hash Wiki → id da sub-aba + botão correspondente
  var WIKI_TABS = {
    'itens':        { tab: 'itens',        btnQuery: '[onclick*="switchWikiTab(\'itens\'"]' },
    'respawn':      { tab: 'respawn',      btnQuery: '[onclick*="switchWikiTab(\'respawn\'"]' },
    'quests':       { tab: 'quests',       btnQuery: '[onclick*="switchWikiTab(\'quests\'"]' },
    'npcs':         { tab: 'npcs',         btnQuery: '[onclick*="switchWikiTab(\'npcs\'"]' },
    'brokes':       { tab: 'brokes',       btnQuery: '[onclick*="switchWikiTab(\'brokes\'"]' },
    'hazard':       { tab: 'hazard',       btnQuery: '[onclick*="switchWikiTab(\'hazard\'"]' },
    'starcalc':     { tab: 'starcalc',     btnQuery: '[onclick*="switchWikiTab(\'starcalc\'"]' },
    'punchingbag':  { tab: 'punchingbag',  btnQuery: '[onclick*="switchWikiTab(\'punchingbag\'"]' },
    'roupasspeed':  { tab: 'roupasspeed',  btnQuery: '[onclick*="switchWikiTab(\'roupasspeed\'"]' },
  };

  /* ── Parseia o hash atual ──
     Retorno: { main: 'wiki', sub: 'respawn' } ou { main: 'itens', sub: null }
  */
  function parseHash() {
    var raw = window.location.hash.replace(/^#/, '').trim().toLowerCase();
    if (!raw) return { main: null, sub: null };

    var parts = raw.split('/');
    return {
      main: parts[0] || null,
      sub:  parts[1] || null,
    };
  }

  /* ── Navega para o estado indicado no hash ── */
  function applyHash() {
    var h = parseHash();
    if (!h.main) return; // sem hash → não mexe em nada

    var mainCfg = MAIN_TABS[h.main];
    if (!mainCfg) return; // hash desconhecido → ignora

    // 1. Ativa a aba principal
    var mainBtn = document.querySelector(mainCfg.btnQuery);
    if (typeof switchTab === 'function' && mainBtn) {
      switchTab(mainCfg.tab, mainBtn);
    }

    // 2. Se for wiki, ativa a sub-aba
    if (h.main === 'wiki' && h.sub) {
      var wikiCfg = WIKI_TABS[h.sub];
      if (wikiCfg) {
        // Pequeno delay para garantir que o painel wiki já foi renderizado
        setTimeout(function () {
          var wikiBtn = document.querySelector(wikiCfg.btnQuery);
          if (typeof switchWikiTab === 'function' && wikiBtn) {
            switchWikiTab(wikiCfg.tab, wikiBtn);
          }
        }, 80);
      }
    }
  }

  /* ── Atualiza o hash na URL sem adicionar ao histórico ── */
  function setHash(hash) {
    if (window.location.hash === hash) return;
    history.replaceState(null, '', hash || window.location.pathname + window.location.search);
  }

  /* ── Patches: intercepta switchTab e switchWikiTab para manter a URL sincronizada ── */
  function patchSwitchTab() {
    if (typeof switchTab !== 'function') {
      setTimeout(patchSwitchTab, 80);
      return;
    }
    var _orig = window.switchTab;
    window.switchTab = function (tab, btn) {
      _orig(tab, btn);
      // Ao trocar de aba principal, reseta a sub-aba da wiki se houver
      var currentSub = parseHash().sub;
      if (tab === 'wiki' && currentSub) {
        setHash('#wiki/' + currentSub);
      } else {
        setHash('#' + tab);
      }
    };
  }

  function patchSwitchWikiTab() {
    if (typeof switchWikiTab !== 'function') {
      setTimeout(patchSwitchWikiTab, 80);
      return;
    }
    var _orig = window.switchWikiTab;
    window.switchWikiTab = function (tab, btn) {
      _orig(tab, btn);
      setHash('#wiki/' + tab);
    };
  }

  /* ── Reage a navegação pelo botão Voltar / Avançar do browser ── */
  window.addEventListener('popstate', function () {
    applyHash();
  });

  /* ── Inicialização ── */
  document.addEventListener('DOMContentLoaded', function () {
    // Aplica o hash da URL assim que tudo estiver pronto
    // (usa setTimeout para garantir que app.js já rodou todos os patches dele)
    setTimeout(applyHash, 120);

    // Ativa os patches nas funções principais
    patchSwitchTab();
    patchSwitchWikiTab();
  });

})();
