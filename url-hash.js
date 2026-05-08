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
 *  1. applyHash chamava _wnOpen antes do patch ser aplicado — agora applyHash
 *     só executa APÓS patchWnOpen() confirmar que o patch foi realizado.
 *  2. switchTab resetava o wn-content antes de _wnOpen ser chamado — agora
 *     aguardamos um tick após switchTab antes de chamar _wnOpen.
 *  3. Race condition entre patchWnOpen e tryOpenModule eliminada: applyHash
 *     é disparado como callback de patchWnOpen, não em paralelo.
 *  4. Observer expandido para detectar mudanças em wn-content e wn-home.
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

  /* ── Abre o estado indicado no hash ──
     IMPORTANTE: só deve ser chamado APÓS patchWnOpen() ter finalizado,
     para garantir que window._wnOpen já é a versão patcheada.
  ── */
  function applyHash() {
    var h = parseHash();
    if (!h.main) return;

    // 1. Ativa a aba principal
    var mainBtn = document.querySelector('.tab-btn[onclick*="switchTab(\'' + h.main + '\'"]');
    if (typeof window.switchTab === 'function' && mainBtn) {
      window.switchTab(h.main, mainBtn);
    }

    if (h.main === 'wiki' && h.sub) {
      var sub = h.sub;
      var attempts = 0;

      function tryOpenModule() {
        attempts++;
        var shell      = document.getElementById('wn-shell');
        var wnOpen     = typeof window._wnOpen === 'function';
        var tierlistOk = sub !== 'tierlist' || typeof window.renderTierList === 'function';

        if (shell && wnOpen && tierlistOk) {
          // Garante aba wiki ativa (pode ter sido resetada pelo switchTab)
          // e aguarda um tick para o DOM do wiki se estabilizar
          if (typeof window.switchTab === 'function' && mainBtn) {
            window.switchTab(h.main, mainBtn);
          }
          // Aguarda 120ms após switchTab para o wiki terminar de montar
          // antes de chamar _wnOpen
          setTimeout(function () {
            window._wnOpen(sub);
          }, 120);
        } else if (attempts < 60) {
          setTimeout(tryOpenModule, 100);
        }
      }

      // Aguarda um tick para o switchTab acima processar antes de começar
      // a checar se o wn-shell e _wnOpen estão prontos
      setTimeout(tryOpenModule, 200);
    }
  }

  /* ── Patch do _wnOpen e _wnBack ─────────────────────────────────
     Mantém window._currentWnModule sincronizado.
     Ao finalizar o patch, dispara applyHash() — garantindo que
     applyHash sempre usa a versão patcheada de _wnOpen.
  ── */
  function patchWnOpen(onReady) {
    if (typeof window._wnOpen !== 'function') {
      setTimeout(function () { patchWnOpen(onReady); }, 100);
      return;
    }

    // Evita aplicar o patch mais de uma vez
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

    // Patch concluído → agora é seguro chamar applyHash
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
    // No popstate também precisamos garantir que o patch está aplicado
    patchWnOpen(applyHash);
  });

  /* ── Inicialização ── */
  document.addEventListener('DOMContentLoaded', function () {
    startObserver();
    // patchWnOpen dispara applyHash() como callback ao concluir —
    // eliminando a race condition entre patch e applyHash
    patchWnOpen(applyHash);
  });

})();
