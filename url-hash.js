/**
 * url-hash.js — PokeAlliance Shop · Deep Linking via URL Hash
 * Versão 2.0 — pushState real, histórico correto, sem loops
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
 * MUDANÇAS vs versão anterior:
 *  1. navigateTo(hash, {replace}) — função central unificada
 *  2. pushState para ações do usuário; replaceState para sincronizações internas
 *  3. Patch de switchTab e _wnOpen/wnBack feito AQUI (não duplicado)
 *  4. Flag _applyingHash evita loops entre applyHash e syncHashFromDOM
 *  5. MutationObserver simplificado — apenas para abas principais
 *  6. applyHash funciona no load e no popstate (voltar/avançar)
 */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     CONSTANTES
  ═══════════════════════════════════════════════════════════════ */

  /** Mapa: nome da aba → hash canônico */
  var MAIN_TABS = {
    itens:    '#itens',
    pacotes:  '#pacotes',
    captura:  '#captura',
    entregas: '#entregas',
    wiki:     '#wiki',
  };

  /** Mapa reverso: hash → id do tab-content */
  var HASH_TO_TAB = {
    itens:    'tab-itens',
    pacotes:  'tab-pacotes',
    captura:  'tab-captura',
    entregas: 'tab-entregas',
    wiki:     'tab-wiki',
  };

  /** Todos os módulos válidos do wiki-nav */
  var WN_MODULES = [
    'itens', 'respawn', 'quests', 'npcs', 'brokes',
    'hazard', 'starcalc', 'punchingbag', 'roupasspeed',
    'talents', 'tokens', 'tierlist',
  ];

  /* ═══════════════════════════════════════════════════════════════
     ESTADO INTERNO
  ═══════════════════════════════════════════════════════════════ */

  /**
   * Módulo do wiki-nav atualmente aberto.
   * Mantido em sincronia pelo patch de _wnOpen/_wnBack.
   */
  window._currentWnModule = null;

  /**
   * Flag que bloqueia syncHashFromDOM enquanto applyHash está rodando.
   * Evita o loop: applyHash → abre aba → observer → syncHashFromDOM → applyHash...
   */
  var _applyingHash = false;

  /* ═══════════════════════════════════════════════════════════════
     UTILITÁRIOS DE HASH
  ═══════════════════════════════════════════════════════════════ */

  /**
   * Lê e normaliza o hash atual da URL.
   * @returns {{ main: string|null, sub: string|null }}
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

  /**
   * Função central de navegação por hash.
   * Use esta função em QUALQUER lugar que precise mudar a URL.
   *
   * @param {string}  hash           - ex.: '#wiki', '#wiki/tierlist', '#captura'
   * @param {Object}  [opts]
   * @param {boolean} [opts.replace] - true → replaceState (sem histórico)
   *                                   false (padrão) → pushState (com histórico)
   */
  function navigateTo(hash, opts) {
    var replace = (opts && opts.replace === true);
    var url = window.location.pathname + hash;

    if (window.location.hash === hash) return; // já está lá, não duplica

    if (replace) {
      history.replaceState({ hash: hash }, '', url);
    } else {
      history.pushState({ hash: hash }, '', url);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     SYNC DOM → URL
     Lê o estado real do DOM e atualiza a URL de forma silenciosa
     (replaceState — não cria histórico, só mantém a URL coerente).
  ═══════════════════════════════════════════════════════════════ */

  function syncHashFromDOM() {
    // Não sincroniza enquanto applyHash está rodando (evita loop)
    if (_applyingHash) return;

    var activeTab = document.querySelector('.tab-content.active');
    if (!activeTab) return;

    // Descobre qual aba está ativa
    var activeId = activeTab.id; // ex.: 'tab-wiki'
    var mainKey  = activeId.replace('tab-', ''); // ex.: 'wiki'

    if (!MAIN_TABS[mainKey]) return; // aba desconhecida, ignora

    if (mainKey === 'wiki') {
      var wnContent = document.getElementById('wn-content');
      var isOpen    = wnContent && (
        wnContent.style.display === 'block' ||
        wnContent.classList.contains('visible')
      );

      if (isOpen && window._currentWnModule) {
        navigateTo('#wiki/' + window._currentWnModule, { replace: true });
        return;
      }
      // Home da wiki (nenhum módulo aberto)
      navigateTo('#wiki', { replace: true });
      return;
    }

    navigateTo(MAIN_TABS[mainKey], { replace: true });
  }

  /* ═══════════════════════════════════════════════════════════════
     APPLY HASH — URL → DOM
     Lê a URL e abre a aba/módulo correspondente.
     Chamado no load inicial e a cada evento popstate.
  ═══════════════════════════════════════════════════════════════ */

  function applyHash() {
    var h = parseHash();
    if (!h.main) return;

    // Bloqueia o observer/sync enquanto abrimos as abas programaticamente
    _applyingHash = true;

    // 1. Abre a aba principal
    _openMainTab(h.main, function () {

      if (h.main === 'wiki' && h.sub) {
        // 2. Abre o módulo do wiki-nav
        _openWnModule(h.sub, function () {
          _applyingHash = false;
        });
      } else {
        _applyingHash = false;
      }
    });
  }

  /**
   * Abre uma aba principal sem criar histórico (é applyHash quem chama).
   * Aguarda até switchTab estar disponível.
   */
  function _openMainTab(tabName, callback) {
    if (!HASH_TO_TAB[tabName]) {
      // Aba desconhecida
      if (callback) callback();
      return;
    }

    var attempts = 0;
    function trySwitch() {
      attempts++;
      if (typeof window.switchTab === 'function') {
        // Procura o botão da aba para passar ao switchTab (como o app.js espera)
        var btn = document.querySelector(
          '.tab-btn[onclick*="switchTab(\'' + tabName + '\'"],' +
          '.tab-btn[data-tab="' + tabName + '"]'
        );
        window.switchTab(tabName, btn || null);
        if (callback) setTimeout(callback, 60);
      } else if (attempts < 40) {
        setTimeout(trySwitch, 100);
      } else {
        // Fallback manual
        _forceTabActive(HASH_TO_TAB[tabName]);
        if (callback) callback();
      }
    }
    trySwitch();
  }

  /**
   * Fallback para ativar uma aba diretamente no DOM,
   * caso switchTab ainda não exista.
   */
  function _forceTabActive(tabContentId) {
    document.querySelectorAll('.tab-content').forEach(function (el) {
      el.classList.toggle('active', el.id === tabContentId);
    });
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      var active = btn.getAttribute('onclick') &&
                   btn.getAttribute('onclick').indexOf(tabContentId.replace('tab-', '')) !== -1;
      btn.classList.toggle('active', active);
    });
  }

  /**
   * Abre um módulo do wiki-nav.
   * Aguarda _wnOpen e o shell estarem disponíveis.
   */
  function _openWnModule(moduleId, callback) {
    if (WN_MODULES.indexOf(moduleId) === -1) {
      if (callback) callback();
      return;
    }

    var attempts = 0;
    function tryOpen() {
      attempts++;
      var shell   = document.getElementById('wn-shell');
      var wnReady = typeof window._wnOpen === 'function';
      // tierlist precisa de renderTierList
      var tierlistOk = moduleId !== 'tierlist' || typeof window.renderTierList === 'function';

      if (shell && wnReady && tierlistOk) {
        window._wnOpen(moduleId);
        if (callback) setTimeout(callback, 80);
      } else if (attempts < 50) {
        setTimeout(tryOpen, 100);
      } else {
        // Desistiu — ao menos desbloqueamos a flag
        if (callback) callback();
      }
    }
    setTimeout(tryOpen, 80);
  }

  /* ═══════════════════════════════════════════════════════════════
     PATCHES — intercepta switchTab, _wnOpen, _wnBack
     para disparar pushState quando o USUÁRIO navega.
  ═══════════════════════════════════════════════════════════════ */

  /**
   * Patcha window.switchTab para:
   *   - chamar a implementação original do app.js
   *   - disparar pushState com a aba correta
   *   - resetar o módulo wiki quando o usuário sai da wiki
   */
  function patchSwitchTab() {
    if (typeof window.switchTab !== 'function') {
      setTimeout(patchSwitchTab, 100);
      return;
    }
    if (window._switchTabPatched) return; // não patcha duas vezes
    window._switchTabPatched = true;

    var _orig = window.switchTab;
    window.switchTab = function (tab, btn) {
      // Chama a implementação original (app.js + wiki-nav.js)
      _orig.apply(this, arguments);

      // Só cria histórico se não estamos dentro de applyHash
      if (!_applyingHash) {
        var hash = MAIN_TABS[tab];
        if (hash) {
          // Ao ir para wiki sem módulo, reseta o sub-módulo
          if (tab === 'wiki') {
            window._currentWnModule = null;
          }
          navigateTo(hash);
        }
      }
    };
  }

  /**
   * Patcha window._wnOpen para:
   *   - rastrear window._currentWnModule (necessário para syncHashFromDOM)
   *   - disparar pushState com #wiki/<módulo>
   */
  function patchWnOpen() {
    if (typeof window._wnOpen !== 'function') {
      setTimeout(patchWnOpen, 100);
      return;
    }
    if (window._wnOpenPatched) return;
    window._wnOpenPatched = true;

    var _origOpen = window._wnOpen;
    window._wnOpen = function (id) {
      window._currentWnModule = id;
      _origOpen.apply(this, arguments);

      // Só cria histórico se não estamos dentro de applyHash
      if (!_applyingHash) {
        navigateTo('#wiki/' + id);
      }
    };

    // Patcha _wnBack também
    if (typeof window._wnBack === 'function' && !window._wnBackPatched) {
      window._wnBackPatched = true;
      var _origBack = window._wnBack;
      window._wnBack = function () {
        window._currentWnModule = null;
        _origBack.apply(this, arguments);

        // Voltar para home da wiki = pushState para #wiki
        if (!_applyingHash) {
          navigateTo('#wiki');
        }
      };
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     MUTATION OBSERVER
     Detecta troca de aba principal via DOM (cliques, app.js, etc.)
     e sincroniza a URL como replaceState (não cria histórico duplo
     porque o patch de switchTab já fez pushState antes).
  ═══════════════════════════════════════════════════════════════ */

  function startObserver() {
    var observer = new MutationObserver(function (mutations) {
      if (_applyingHash) return;

      var relevant = mutations.some(function (m) {
        // Troca de classe 'active' em tab-content
        if (
          m.type === 'attributes' &&
          m.attributeName === 'class' &&
          m.target.classList &&
          m.target.classList.contains('tab-content')
        ) {
          return true;
        }
        return false;
      });

      if (relevant) syncHashFromDOM();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true,
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     POPSTATE — voltar/avançar no navegador
  ═══════════════════════════════════════════════════════════════ */

  window.addEventListener('popstate', function () {
    applyHash();
  });

  /* ═══════════════════════════════════════════════════════════════
     INICIALIZAÇÃO
  ═══════════════════════════════════════════════════════════════ */

  document.addEventListener('DOMContentLoaded', function () {
    startObserver();

    // Patcha switchTab assim que estiver disponível
    patchSwitchTab();

    // Patcha _wnOpen assim que o wiki-nav.js criar a função
    patchWnOpen();

    // Aplica o hash da URL atual (deep link inicial)
    // Timeout generoso para garantir que app.js e wiki-nav.js já rodaram
    setTimeout(applyHash, 250);
  });

  /* ── API pública (opcional, para uso no console ou em outros scripts) ── */
  window._urlHash = {
    navigateTo: navigateTo,
    applyHash:  applyHash,
    parseHash:  parseHash,
    syncFromDOM: syncHashFromDOM,
  };

})();