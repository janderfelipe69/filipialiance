/**
 * nav-runtime.js — PokeAlliance Shop · Sistema de Navegação Unificado
 *
 * CARREGUE ESTE ARQUIVO NO LUGAR DE url-hash.js.
 * Deve vir APÓS app.js e wiki-nav.js, ANTES dos módulos wiki-*.js.
 *
 * Responsabilidades:
 *   1. Dispatcher central de switchTab com sistema de hooks (sem monkey patch).
 *   2. Router de URL hash (pushState / replaceState / popstate).
 *   3. Loop-guard determinístico (sem setTimeout para detectar estado).
 *   4. API pública via window.NavRuntime.
 *
 * O que este arquivo NÃO faz:
 *   - Não sobrescreve window.switchTab (usa hooks registrados).
 *   - Não faz poll nem setInterval para detectar funções.
 *   - Não mantém estado distribuído em closures de outros arquivos.
 */

(function (global) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     GUARDA DE SINGLETON
  ═══════════════════════════════════════════════════════════════ */

  if (global.NavRuntime) {
    /* Já inicializado — não recria. */
    return;
  }

  /* ═══════════════════════════════════════════════════════════════
     CONSTANTES
  ═══════════════════════════════════════════════════════════════ */

  var MAIN_TABS = {
    itens:       '#itens',
    pacotes:     '#pacotes',
    captura:     '#captura',
    entregas:    '#entregas',
    pedidos:     '#pedidos',
    wiki:        '#wiki',
    marketplace: '#marketplace',   // Fase M1
  };


  /* ═══════════════════════════════════════════════════════════════
     FEATURE FLAG HELPERS
  ═══════════════════════════════════════════════════════════════ */

  /**
   * Exibe toast "Função temporariamente indisponível." (debounced).
   */
  var _featureToastActive = false;
  function _showFeatureBlockedToast() {
    if (_featureToastActive) return;
    _featureToastActive = true;
    var t = document.createElement('div');
    t.textContent = 'Função temporariamente indisponível.';
    t.style.cssText = [
      'position:fixed',
      'bottom:24px',
      'left:50%',
      'transform:translateX(-50%)',
      'background:#1e2240',
      'color:#e0e4ff',
      'border:1px solid rgba(255,200,80,.35)',
      'border-radius:8px',
      'padding:10px 20px',
      'font-size:.88rem',
      'z-index:99999',
      'box-shadow:0 4px 18px rgba(0,0,0,.5)',
      'pointer-events:none',
      'transition:opacity .3s',
    ].join(';');
    document.body.appendChild(t);
    setTimeout(function () {
      t.style.opacity = '0';
      setTimeout(function () { t.remove(); _featureToastActive = false; }, 320);
    }, 2200);
  }

  /* ═══════════════════════════════════════════════════════════════
     ESTADO CENTRAL (única fonte de verdade)
  ═══════════════════════════════════════════════════════════════ */

  var _state = {
    /** Aba principal ativa ('itens', 'wiki', etc.) */
    tab: null,
    /** Módulo wiki aberto ('boost', 'tierlist', etc.) ou null */
    wikiModule: null,
    /**
     * true enquanto NavRuntime está aplicando uma navegação programática.
     * Bloqueia o MutationObserver para evitar loop:
     *   applyHash → switchTab → DOM muda → observer → syncFromDOM → navigateTo
     */
    applying: false,
  };

  /* ═══════════════════════════════════════════════════════════════
     HOOK SYSTEM — substituto dos monkey patches
  ═══════════════════════════════════════════════════════════════ */

  /**
   * Hooks chamados ANTES da troca de aba.
   * Cada hook recebe (tab, btn) e pode ser async — mas não bloqueia a troca.
   * @type {Array<{id: string, fn: function}>}
   */
  var _beforeTabHooks = [];

  /**
   * Hooks chamados DEPOIS da troca de aba.
   * @type {Array<{id: string, fn: function}>}
   */
  var _afterTabHooks = [];

  /**
   * Registra um hook de antes/depois da troca de aba.
   * @param {'before'|'after'} when
   * @param {string} id       - identificador único (para remover depois se necessário)
   * @param {function} fn     - função(tab, btn)
   */
  function onTabSwitch(when, id, fn) {
    var list = when === 'before' ? _beforeTabHooks : _afterTabHooks;
    /* Evita duplicatas — idempotente mesmo se chamado várias vezes */
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { list[i].fn = fn; return; }
    }
    list.push({ id: id, fn: fn });
  }

  function _runHooks(list, tab, btn) {
    for (var i = 0; i < list.length; i++) {
      try { list[i].fn(tab, btn); } catch (e) { /* isola falhas de hook */ }
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     DISPATCHER CENTRAL — substitui window.switchTab
  ═══════════════════════════════════════════════════════════════ */

  /**
   * Troca a aba principal visível.
   * Esta é a ÚNICA implementação de switchTab — não há wrappers.
   *
   * @param {string}      tab - nome da aba ('wiki', 'itens', ...)
   * @param {HTMLElement} btn - botão clicado (pode ser null em chamadas programáticas)
   * @param {Object}      [opts]
   * @param {boolean}     [opts.skipHistory] - não chama navigateTo (usado por applyHash)
   */
  function switchTab(tab, btn, opts) {
    opts = opts || {};

    /* ── Feature Flag guard — bloqueia abas desabilitadas ── */
    if (typeof global.isFeatureEnabled === 'function' && !global.isFeatureEnabled(tab)) {
      /* Mostra toast de indisponibilidade */
      _showFeatureBlockedToast();
      return; /* aborta toda a navegação */
    }

    /* Antes */
    _runHooks(_beforeTabHooks, tab, btn);

    /* Implementação original de app.js — manipulação do DOM */
    document.querySelectorAll('.tab-content').forEach(function (t) {
      t.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(function (b) {
      b.classList.remove('active');
    });

    var tabEl = document.getElementById('tab-' + tab);
    if (tabEl) tabEl.classList.add('active');
    if (btn) btn.classList.add('active');

    /* Renderizadores — aguarda db-bootstrap terminar antes de renderizar
       abas que dependem de dados do Supabase (captura, pacotes, itens) */
    function _render() {
      /* Feature Flag: aborta renderização se aba foi desabilitada */
      if (typeof global.isFeatureEnabled === 'function' && !global.isFeatureEnabled(tab)) return;
      if (tab === 'pacotes'     && typeof renderPackages  === 'function') renderPackages();
      if (tab === 'captura'     && typeof renderCaptura   === 'function') renderCaptura();
      if (tab === 'entregas'    && typeof renderEntregas  === 'function') renderEntregas();
      if (tab === 'wiki'        && typeof renderWiki      === 'function') renderWiki();
      if (tab === 'marketplace' && global.PA && global.PA.marketplace) global.PA.marketplace.onTabActivated();
    }
    if (window.__dbReady) {
      _render();
    } else {
      document.addEventListener('db:ready', _render, { once: true });
    }

    /* Atualiza estado */
    _state.tab = tab;

    /* Histórico — só cria entrada se não estamos dentro de applyHash */
    if (!opts.skipHistory && !_state.applying) {
      var hash = MAIN_TABS[tab];
      if (hash) {
        /* Ao navegar para wiki sem módulo, reseta sub-módulo */
        if (tab === 'wiki') _state.wikiModule = null;
        _navigateTo(hash);
      }
    }

    /* Depois */
    _runHooks(_afterTabHooks, tab, btn);
  }

  /* Expõe no escopo global para que onclick="switchTab(...)" continue funcionando */
  global.switchTab = switchTab;

  /* ═══════════════════════════════════════════════════════════════
     MÓDULO WIKI — delegate para WikiModules
  ═══════════════════════════════════════════════════════════════ */

  /*
   * O WikiModules runtime (wiki-nav.js) expõe:
   *   window.WikiModules.open(id)
   *   window.WikiModules.close()
   *   window.WikiModules.current() → string|null
   *
   * NavRuntime apenas roteia os eventos de URL para lá e registra
   * os hooks de history. Sem monkey patch de _wnOpen.
   */

  /* Hook: quando um módulo wiki abre → atualiza URL.
   * Usa applying=true para bloquear _syncFromDOM durante a escrita na URL,
   * evitando que o MutationObserver grave novamente com estado antigo.
   */
  document.addEventListener('wikiModuleOpen', function (e) {
    if (_state.applying) return; /* já dentro de applyHash — URL não muda */
    _state.applying = true;
    _state.wikiModule = e.detail.id;
    _navigateTo('#wiki/' + e.detail.id);
    Promise.resolve().then(function () {
      _state.applying = false;
    });
  });

  /* Hook: quando o módulo wiki fecha (volta ao home) → atualiza URL.
   *
   * USA replaceState (replace=true) em vez de pushState:
   *   - O fechamento de um módulo NÃO cria nova entrada no history stack.
   *   - A entrada atual (#wiki/starascension) é substituída por (#wiki).
   *   - Isso impede que o botão Back do browser reaplique o módulo fechado.
   *
   * Simetria intencional:
   *   open(module)  → pushState    → cria nova entrada navegável
   *   close()       → replaceState → substitui entrada atual, não empilha
   */
  /* Proteção contra race com MutationObserver:
   * O close() altera classes DOM ANTES de disparar wikiModuleClose.
   * O MutationObserver poderia ver a mutação e chamar _syncFromDOM()
   * enquanto _state.wikiModule ainda não foi resetado, regravando
   * a URL com o módulo antigo (ex: #wiki/hazard).
   *
   * Solução: aplicamos applying=true durante todo o handler para que
   * _syncFromDOM ignore mutações deste tick. Liberamos em microtask
   * (Promise) após todas as mutações síncronas serem processadas.
   *
   * Simetria open/close:
   *   open(module) → pushState    → #wiki/id  (navegável para trás)
   *   close()      → replaceState → #wiki      (não cria nova entrada)
   */
  document.addEventListener('wikiModuleClose', function () {
    /* Bloqueia MutationObserver antes de qualquer I/O de URL */
    _state.applying = true;
    _state.wikiModule = null;
    _navigateTo('#wiki', /* replace= */ true);
    /* Libera após todas as mutações síncronas deste evento */
    Promise.resolve().then(function () {
      _state.applying = false;
    });
  });

  /* Hook de switchTab: quando navega PARA wiki reset módulo; quando sai, fecha módulo */
  onTabSwitch('after', 'nav-runtime-wiki-sync', function (tab) {
    if (tab !== 'wiki') {
      /* Saiu da aba wiki — garante que o home é mostrado na volta.
       * NÃO fecha o módulo aqui: WikiModules mantém o estado para quando
       * o usuário voltar via tab. O wikiModule state é resetado na URL. */
      _state.wikiModule = null;
    }
  });

  /* ═══════════════════════════════════════════════════════════════
     HOOKS DE INTEGRAÇÃO — substitutos dos monkey patches de pedidos.js,
     mobile-ux.js e wiki-nav.js
  ═══════════════════════════════════════════════════════════════ */

  /* pedidos.js: carrega pedidos ao abrir aba.
     OBRIGATÓRIO: aguarda Session.ready() antes de pedidosCarregar() —
     elimina race condition onde nav-runtime dispara antes do auth estar pronto. */
  onTabSwitch('after', 'pedidos-loader', function (tab) {
    if (tab === 'pedidos' && typeof global.pedidosCarregar === 'function') {
      // SEMPRE aguarda Session.ready() — nunca chama pedidosCarregar() diretamente
      var sessionReady = (typeof Session !== 'undefined' && typeof Session.ready === 'function')
        ? Session.ready()
        : Promise.resolve();
      sessionReady.then(function () {
        global.pedidosCarregar();
      }).catch(function () {
        // Session.ready() nunca rejeita, mas captura por segurança
        global.pedidosCarregar();
      });
    }
  });

  /* mobile-ux.js: scroll + haptic — preenchido em mobile-ux.js via NavRuntime.onTabSwitch */
  /* (mobile-ux.js registra seu próprio hook, não precisa de patch aqui) */

  /* Nota: o hook 'wiki-nav-reset' (exibir wn-home ao entrar na aba wiki)
     é registrado por wiki-nav.js com lógica que respeita o módulo atual.
     nav-runtime.js NÃO registra este hook para evitar conflito de ID. */

  /* ═══════════════════════════════════════════════════════════════
     ROUTER DE URL HASH
  ═══════════════════════════════════════════════════════════════ */

  function _parseHash() {
    var raw = global.location.hash.replace(/^#/, '').trim().toLowerCase();
    if (!raw) return { main: null, sub: null };
    var parts = raw.split('/');
    return { main: parts[0] || null, sub: parts[1] || null };
  }

  /**
   * Única função que escreve na URL.
   *
   * SEMÂNTICA INTENCIONAL:
   *   pushState  (replace=false, padrão) → nova entrada no history stack.
   *              Use ao ABRIR algo: tabs, módulos. O usuário pode voltar.
   *   replaceState (replace=true) → substitui entrada atual, sem empilhar.
   *              Use ao FECHAR algo: o estado anterior não deve ser
   *              restaurado pelo botão Back do browser.
   *
   * Simetria open/close:
   *   WikiModules.open(id)  → pushState    → #wiki/id   (navegável para trás)
   *   WikiModules.close()   → replaceState → #wiki       (não cria nova entrada)
   *
   * @param {string}  hash    - ex: '#wiki', '#wiki/boost'
   * @param {boolean} replace - true → replaceState (sem entrada no histórico)
   */
  function _navigateTo(hash, replace) {
    if (global.location.hash === hash) return;
    var url = global.location.pathname + hash;
    if (replace) {
      history.replaceState({ hash: hash }, '', url);
    } else {
      history.pushState({ hash: hash }, '', url);
    }
  }

  /**
   * Lê a URL atual e aplica o estado correspondente no DOM.
   * Chamado no load inicial e em cada popstate.
   */
  function applyHash() {
    var h = _parseHash();
    if (!h.main) return;

    /* Feature Flag guard — bloqueia hash-navigation para abas desabilitadas */
    if (typeof global.isFeatureEnabled === 'function' && !global.isFeatureEnabled(h.main)) {
      _showFeatureBlockedToast();
      /* Remove hash inválido da URL sem criar entrada no histórico */
      history.replaceState({}, '', global.location.pathname);
      return;
    }

    _state.applying = true;

    /* 1. Abre a aba principal */
    var btn = document.querySelector(
      '.tab-btn[onclick*="switchTab(\'' + h.main + '\'"],' +
      '.tab-btn[data-tab="' + h.main + '"]'
    );
    switchTab(h.main, btn || null, { skipHistory: true });

    /* 2. Abre módulo wiki se necessário; fecha se não necessário */
    if (h.main === 'wiki') {
      if (h.sub) {
        var wm = global.WikiModules;
        if (wm && typeof wm.open === 'function') {
          wm.open(h.sub, { skipHistory: true });
        } else {
          /* WikiModules ainda não pronto — aguarda o evento de pronto */
          document.addEventListener('wikiModulesReady', function onReady() {
            document.removeEventListener('wikiModulesReady', onReady);
            if (global.WikiModules) global.WikiModules.open(h.sub, { skipHistory: true });
            _state.applying = false;
          }, { once: true });
          /* Não reseta applying aqui — será resetado no handler acima */
          return;
        }
      } else {
        /* URL é #wiki sem módulo — fecha qualquer módulo aberto.
         * Isso garante que popstate para #wiki fecha o módulo visível,
         * em vez de deixar o estado da UI dessincronizado com a URL. */
        var wmClose = global.WikiModules;
        if (wmClose && typeof wmClose.close === 'function' && wmClose.current()) {
          wmClose.close({ skipHistory: true });
        }
      }
    }

    _state.applying = false;
  }

  /* Sincroniza URL a partir do DOM (fallback para cliques que não passaram por switchTab) */
  function _syncFromDOM() {
    if (_state.applying) return;

    var active = document.querySelector('.tab-content.active');
    if (!active) return;

    var key = active.id.replace('tab-', '');
    if (!MAIN_TABS[key]) return;

    var hash;
    if (key === 'wiki') {
      /* WikiModules.current() é a fonte de verdade canônica.
       *
       * IMPORTANTE: NÃO usar _state.wikiModule como fallback aqui.
       *
       * Motivo: close() em wiki-nav.js reseta _current para null ANTES
       * das mutações DOM (para que _syncFromDOM leia null corretamente),
       * mas despacha wikiModuleClose DEPOIS das mutações. O MutationObserver
       * pode chamar _syncFromDOM durante as mutações — antes de wikiModuleClose
       * ser processado — logo _state.wikiModule ainda aponta para o módulo
       * antigo. Usar _state.wikiModule como fallback reescreveria a URL de
       * volta para #wiki/<módulo> imediatamente após o fechamento.
       *
       * WikiModules._current é resetado para null antes de qualquer mutação
       * DOM, portanto WikiModules.current() aqui sempre reflete o estado
       * correto do módulo, independente do timing do evento. */
      var mod = global.WikiModules ? global.WikiModules.current() : null;
      hash = mod ? '#wiki/' + mod : '#wiki';
    } else {
      hash = MAIN_TABS[key];
    }

    _navigateTo(hash, /* replace */ true);
  }

  /* ═══════════════════════════════════════════════════════════════
     MUTATION OBSERVER — detecta mudanças de aba via DOM direto
     (clicks em botões sem passar pelo dispatcher, por exemplo)
  ═══════════════════════════════════════════════════════════════ */

  function _startObserver() {
    var observer = new MutationObserver(function (mutations) {
      if (_state.applying) return;
      var relevant = mutations.some(function (m) {
        return (
          m.type === 'attributes' &&
          m.attributeName === 'class' &&
          m.target.classList &&
          m.target.classList.contains('tab-content')
        );
      });
      if (relevant) _syncFromDOM();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true,
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     POPSTATE
  ═══════════════════════════════════════════════════════════════ */

  global.addEventListener('popstate', function () {
    applyHash();
  });

  /* ═══════════════════════════════════════════════════════════════
     API PÚBLICA
  ═══════════════════════════════════════════════════════════════ */

  global.NavRuntime = {
    /** Registra hook de antes/depois de switchTab */
    onTabSwitch: onTabSwitch,

    /** Navega para um hash diretamente */
    navigateTo: _navigateTo,

    /** Re-aplica o hash da URL atual */
    applyHash: applyHash,

    /** Lê o estado atual */
    getState: function () {
      return { tab: _state.tab, wikiModule: _state.wikiModule };
    },
  };

  /* ═══════════════════════════════════════════════════════════════
     INICIALIZAÇÃO
  ═══════════════════════════════════════════════════════════════ */

  document.addEventListener('DOMContentLoaded', function () {
    _startObserver();
    /* Aplica hash com um frame de margem — garante que wiki-nav.js
       já rodou e buildShell() criou o DOM do wiki */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        applyHash();
      });
    });
  });

}(window));
