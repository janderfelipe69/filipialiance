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
 * BUG CORRIGIDO (principal):
 *   O switchTab sobrescrito pelo wiki-nav.js sempre resetava o wiki para
 *   o home quando tab === 'wiki'. Como url-hash.js chamava switchTab antes
 *   de _wnOpen, o reset apagava o estado e o submódulo nunca abria.
 *
 *   SOLUÇÃO: flag window._wnSkipReset. Quando true, o switchTab patcheado
 *   aqui não executa o reset do wiki-nav. O flag é limpo após _wnOpen rodar.
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
      var wnContent = document.getElementById('wn-content');
      var isWnOpen  = wnContent && (
        wnContent.style.display === 'block' ||
        wnContent.classList.contains('visible')
      );

      if (isWnOpen && window._currentWnModule) {
        setHash('#wiki/' + window._currentWnModule);
        return;
      }

      var wnHome = document.getElementById('wn-home');
      if (wnHome && wnHome.style.display !== 'none') {
        setHash('#wiki');
        return;
      }
    }

    setHash(mainHash);
  }

  /* ── Ativa a aba wiki visualmente sem disparar o reset do wiki-nav ── */
  function activateWikiTab(btn) {
    var tabWiki = document.getElementById('tab-wiki');
    if (!tabWiki) return;
    if (tabWiki.classList.contains('active')) return; /* já ativa, nada a fazer */

    document.querySelectorAll('.tab-content').forEach(function (el) {
      el.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(function (el) {
      el.classList.remove('active');
    });
    tabWiki.classList.add('active');
    if (btn) btn.classList.add('active');
  }

  /* ── Abre o estado indicado no hash ── */
  function applyHash() {
    var h = parseHash();
    if (!h.main) return;

    var mainBtn = document.querySelector('.tab-btn[onclick*="switchTab(\'' + h.main + '\'"]');

    if (h.main === 'wiki' && h.sub) {
      var sub = h.sub;
      var attempts = 0;

      function tryOpenModule() {
        attempts++;
        var shell      = document.getElementById('wn-shell');
        var wnOpen     = typeof window._wnOpen === 'function';
        var tierlistOk = sub !== 'tierlist' || typeof window.renderTierList === 'function';

        if (shell && wnOpen && tierlistOk) {
          /*
           * Ativa a aba wiki diretamente (sem passar pelo switchTab do wiki-nav)
           * para evitar o reset do shell para o home.
           */
          activateWikiTab(mainBtn);

          /* Abre o submódulo após o DOM estabilizar */
          setTimeout(function () {
            window._wnOpen(sub);
          }, 100);

        } else if (attempts < 60) {
          setTimeout(tryOpenModule, 100);
        }
      }

      setTimeout(tryOpenModule, 200);

    } else {
      /* Abas normais ou #wiki sem sub: usa switchTab normalmente */
      if (typeof window.switchTab === 'function' && mainBtn) {
        window.switchTab(h.main, mainBtn);
      }
    }
  }

  /* ── Patch do _wnOpen e _wnBack ─────────────────────────────────
     - Rastreia window._currentWnModule para syncHashFromDOM
     - Dispara applyHash como callback após o patch (elimina race condition)
  ── */
  function patchWnOpen(onReady) {
    if (typeof window._wnOpen !== 'function') {
      setTimeout(function () { patchWnOpen(onReady); }, 100);
      return;
    }

    if (window._wnOpen._patched) {
      if (typeof onReady === 'function') onReady();
      return;
    }

    var _origWnOpen = window._wnOpen;
    window._wnOpen = function (id) {
      window._currentWnModule = id;
      _origWnOpen.apply(this, arguments);
      setTimeout(syncHashFromDOM, 50);
    };
    window._wnOpen._patched = true;

    var _origWnBack = window._wnBack;
    if (typeof _origWnBack === 'function') {
      window._wnBack = function () {
        window._currentWnModule = null;
        _origWnBack.apply(this, arguments);
        setTimeout(syncHashFromDOM, 50);
      };
    }

    if (typeof onReady === 'function') onReady();
  }

  /* ── MutationObserver: detecta troca de abas e abertura de módulos ── */
  function startObserver() {
    var observer = new MutationObserver(function (mutations) {
      var relevant = mutations.some(function (m) {
        if (m.type !== 'attributes') return false;

        if (m.attributeName === 'class' &&
            m.target.classList &&
            m.target.classList.contains('tab-content')) {
          return true;
        }

        if (m.attributeName === 'style' && m.target.id === 'wn-content') {
          return true;
        }

        if (m.attributeName === 'style' && m.target.id === 'wn-home') {
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
  window.addEventListener('popstate', function () {
    patchWnOpen(applyHash);
  });

  /* ── Inicialização ── */
  document.addEventListener('DOMContentLoaded', function () {
    startObserver();
    /* patchWnOpen dispara applyHash como callback — sem race condition */
    patchWnOpen(applyHash);
  });

})();
