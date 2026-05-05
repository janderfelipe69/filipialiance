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
 *
 * Estratégia: usa MutationObserver em vez de patchear switchTab/switchWikiTab,
 * evitando conflitos com outros scripts (mobile-ux.js etc.) que também patcheiam.
 */

(function () {
  'use strict';

  // Mapeia o id do tab-content → hash
  var MAIN_MAP = {
    'tab-itens':    '#itens',
    'tab-pacotes':  '#pacotes',
    'tab-captura':  '#captura',
    'tab-entregas': '#entregas',
    'tab-wiki':     '#wiki',
  };

  // Mapeia o id do wiki-subtab-content → hash
  var WIKI_MAP = {
    'wiki-tab-itens':       '#wiki/itens',
    'wiki-tab-respawn':     '#wiki/respawn',
    'wiki-tab-quests':      '#wiki/quests',
    'wiki-tab-npcs':        '#wiki/npcs',
    'wiki-tab-brokes':      '#wiki/brokes',
    'wiki-tab-hazard':      '#wiki/hazard',
    'wiki-tab-starcalc':    '#wiki/starcalc',
    'wiki-tab-punchingbag': '#wiki/punchingbag',
    'wiki-tab-roupasspeed': '#wiki/roupasspeed',
  };

  /* ── Parseia o hash atual ── */
  function parseHash() {
    var raw = window.location.hash.replace(/^#/, '').trim().toLowerCase();
    if (!raw) return { main: null, sub: null };
    var parts = raw.split('/');
    return { main: parts[0] || null, sub: parts[1] || null };
  }

  /* ── Atualiza a URL sem adicionar ao histórico e sem query strings ── */
  function setHash(hash) {
    var current = window.location.hash;
    if (current === hash) return;
    history.replaceState(null, '', window.location.pathname + hash);
  }

  /* ── Lê quais abas estão ativas agora no DOM e atualiza o hash ── */
  function syncHashFromDOM() {
    // 1. Descobre a aba principal ativa
    var activeMain = document.querySelector('.tab-content.active');
    if (!activeMain) return;

    var mainHash = MAIN_MAP[activeMain.id];
    if (!mainHash) return;

    // 2. Se for wiki, descobre a sub-aba ativa
    if (activeMain.id === 'tab-wiki') {
      var activeSub = null;
      Object.keys(WIKI_MAP).forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.style.display === 'block') activeSub = id;
      });
      if (activeSub) {
        setHash(WIKI_MAP[activeSub]);
        return;
      }
    }

    setHash(mainHash);
  }

  /* ── Navega para o estado indicado no hash ── */
  function applyHash() {
    var h = parseHash();
    if (!h.main) return;

    var mainBtn = document.querySelector('.tab-btn[onclick*="switchTab(\'' + h.main + '\'"]');
    if (typeof switchTab === 'function' && mainBtn) {
      switchTab(h.main, mainBtn);
    }

    if (h.main === 'wiki' && h.sub) {
      setTimeout(function () {
        var wikiBtn = document.querySelector('.wiki-subtab-btn[onclick*="switchWikiTab(\'' + h.sub + '\'"]');
        if (typeof switchWikiTab === 'function' && wikiBtn) {
          switchWikiTab(h.sub, wikiBtn);
        }
      }, 100);
    }
  }

  /* ── MutationObserver: detecta mudanças de classe/display no DOM ── */
  function startObserver() {
    var observer = new MutationObserver(function (mutations) {
      var relevant = mutations.some(function (m) {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          return m.target.classList && m.target.classList.contains('tab-content');
        }
        if (m.type === 'attributes' && m.attributeName === 'style') {
          return m.target.id && m.target.id.indexOf('wiki-tab-') === 0;
        }
        return false;
      });
      if (relevant) syncHashFromDOM();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      subtree: true,
    });
  }

  /* ── Reage ao botão Voltar/Avançar do browser ── */
  window.addEventListener('popstate', applyHash);

  /* ── Inicialização ── */
  document.addEventListener('DOMContentLoaded', function () {
    startObserver();
    setTimeout(applyHash, 150);
  });

})();
