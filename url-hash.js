/**
 * url-hash.js — PokeAlliance Shop · Deep Linking via URL Hash
 *
 * Formatos suportados:
 *   #itens              → aba Itens
 *   #pacotes            → aba Pacotes
 *   #captura            → aba Captura
 *   #entregas           → aba Entregas
 *   #wiki               → aba Wiki (home do wiki-nav)
 *   #wiki/itens         → aba Wiki > Itens & Drops
 *   #wiki/respawn       → aba Wiki > Respawn
 *   #wiki/quests        → aba Wiki > Quests
 *   #wiki/npcs          → aba Wiki > NPCs
 *   #wiki/brokes        → aba Wiki > Brokes
 *   #wiki/hazard        → aba Wiki > Hazard Tasks
 *   #wiki/starcalc      → aba Wiki > Star Calc
 *   #wiki/punchingbag   → aba Wiki > Punching Bag
 *   #wiki/roupasspeed   → aba Wiki > Roupas Speed
 *   #wiki/talents       → aba Wiki > PokéTalents
 *   #wiki/tokens        → aba Wiki > Tokens
 *   #wiki/tierlist      → aba Wiki > Tier Lista
 *
 * BUGS CORRIGIDOS vs versão anterior:
 *  1. Observer não detectava abertura de módulos via _wnOpen (wn-content/wn-slot)
 *  2. syncHashFromDOM só checava tierlist/talents/tokens no wn-slot — agora usa
 *     window._currentWnModule que é setado pelo patch do _wnOpen
 *  3. applyHash só abria via _wnOpen os módulos tierlist/talents/tokens —
 *     agora TODOS os módulos wiki passam pelo _wnOpen (que é como o wiki-nav funciona)
 *  4. Observer expandido para detectar mudanças em wn-content e wn-home também
 */

(function () {
  'use strict';

  /* ── Mapa: id do tab-content → hash ── */
  var MAIN_MAP = {
    'tab-itens':    '#itens',
    'tab-pacotes':  '#pacotes',
    'tab-captura':  '#captura',
    'tab-entregas': '#entregas',
    'tab-wiki':     '#wiki',
  };

  /* ── Todos os módulos do wiki-nav ── */
  var WN_MODULES = [
    'itens', 'respawn', 'quests', 'npcs', 'brokes',
    'hazard', 'starcalc', 'punchingbag', 'roupasspeed',
    'talents', 'tokens', 'tierlist',
  ];

  /* ── Parseia o hash atual ── */
  function parseHash() {
    var raw = window.location.hash.replace(/^#/, '').trim().toLowerCase();
    if (!raw) return { main: null, sub: null };
    var parts = raw.split('/');
    return { main: parts[0] || null, sub: parts[1] || null };
  }

  /* ── Atualiza a URL sem adicionar ao histórico ── */
  function setHash(hash) {
    if (window.location.hash === hash) return;
    history.replaceState(null, '', window.location.pathname + hash);
  }

  /* ── Lê o estado atual do DOM e atualiza o hash ── */
  function syncHashFromDOM() {
    var activeMain = document.querySelector('.tab-content.active');
    if (!activeMain) return;

    var mainHash = MAIN_MAP[activeMain.id];
    if (!mainHash) return;

    if (activeMain.id === 'tab-wiki') {
      // Verifica se algum módulo do wiki-nav está aberto
      // Usa window._currentWnModule que é mantido pelo patch do _wnOpen abaixo
      var wnContent = document.getElementById('wn-content');
      var isWnOpen  = wnContent && (
        wnContent.style.display === 'block' ||
        wnContent.classList.contains('visible')
      );

      if (isWnOpen && window._currentWnModule) {
        setHash('#wiki/' + window._currentWnModule);
        return;
      }

      // Se wn-home está visível → wiki sem sub-módulo
      var wnHome = document.getElementById('wn-home');
      if (wnHome && wnHome.style.display !== 'none') {
        setHash('#wiki');
        return;
      }
    }

    setHash(mainHash);
  }

  /* ── Abre o estado indicado no hash ── */
  function applyHash() {
    var h = parseHash();
    if (!h.main) return;

    // Acha e clica na aba principal
    var mainBtn = document.querySelector('.tab-btn[onclick*="switchTab(\'' + h.main + '\'"]');
    if (typeof window.switchTab === 'function' && mainBtn) {
      window.switchTab(h.main, mainBtn);
    }

    if (h.main === 'wiki' && h.sub) {
      // Todos os módulos wiki passam pelo _wnOpen (é assim que o wiki-nav funciona)
      var attempts = 0;
      function tryOpenModule() {
        attempts++;
        var shell  = document.getElementById('wn-shell');
        var wnOpen = typeof window._wnOpen === 'function';
        // Para tierlist: espera o renderTierList estar pronto também
        var tierlistOk = h.sub !== 'tierlist' || typeof window.renderTierList === 'function';

        if (shell && wnOpen && tierlistOk) {
          // Garante wiki ativa antes de abrir
          if (typeof window.switchTab === 'function' && mainBtn) {
            window.switchTab(h.main, mainBtn);
          }
          setTimeout(function () {
            window._wnOpen(h.sub);
          }, 80);
        } else if (attempts < 40) {
          setTimeout(tryOpenModule, 100);
        }
      }
      setTimeout(tryOpenModule, 150);
    }
  }

  /* ── Patch do _wnOpen: rastreia o módulo atual ─────────────────
     Isso é necessário porque o MutationObserver não consegue saber
     QUAL módulo foi aberto — só que algo mudou no wn-content.
     Patcheamos _wnOpen e _wnBack para manter window._currentWnModule.
  ── */
  function patchWnOpen() {
    // Tenta patchar; se _wnOpen ainda não existir, tenta de novo
    if (typeof window._wnOpen !== 'function') {
      setTimeout(patchWnOpen, 100);
      return;
    }

    var _origWnOpen = window._wnOpen;
    window._wnOpen = function (id) {
      window._currentWnModule = id;
      _origWnOpen.apply(this, arguments);
      // Sincroniza hash após o módulo abrir
      setTimeout(syncHashFromDOM, 50);
    };

    var _origWnBack = window._wnBack;
    if (typeof _origWnBack === 'function') {
      window._wnBack = function () {
        window._currentWnModule = null;
        _origWnBack.apply(this, arguments);
        setTimeout(syncHashFromDOM, 50);
      };
    }
  }

  /* ── MutationObserver: detecta troca de abas principais ── */
  function startObserver() {
    var observer = new MutationObserver(function (mutations) {
      var relevant = mutations.some(function (m) {
        if (m.type !== 'attributes') return false;

        // Troca de aba principal (class active no tab-content)
        if (m.attributeName === 'class' &&
            m.target.classList &&
            m.target.classList.contains('tab-content')) {
          return true;
        }

        // Abertura/fechamento do wn-content (style.display)
        if (m.attributeName === 'style' &&
            m.target.id === 'wn-content') {
          return true;
        }

        // Abertura/fechamento do wn-home
        if (m.attributeName === 'style' &&
            m.target.id === 'wn-home') {
          return true;
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
    patchWnOpen();
    setTimeout(applyHash, 200);
  });

})();
