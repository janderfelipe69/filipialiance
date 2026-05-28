// ============================================================
// pa-hardening.js — Hardening Final + Performance v1
// PokeAlliance Shop — FASE 5.2.3
//
// TAREFAS:
//   T1  Lazy render de cards (IntersectionObserver)
//   T2  Virtual SLA ticker (pausa fora da viewport)
//   T3  PA.formatters — consolida formatadores duplicados
//   T4  Skeleton shimmer para loading states
//   T5  DOM budget (PA.health.domBudget)
//   T6  Badge renderer memoizado
//   T7  Queue privacy hardening (auditoria de leaks)
//   T8  Realtime visual smoothing helpers
//   T9  Mobile overflow + touch targets
//   T10 Debug panel — seções adicionais
//
// CARREGUE: após pa-render-health.js, antes dos módulos de UI.
// ZERO SQL. ZERO regressão. Retrocompatível total.
// ============================================================

;(function (global) {
  'use strict';

  if (!global.PA) { console.warn('[PA.hardening] PA namespace não encontrado.'); return; }
  if (global.PA.hardening) return; // singleton

  var _log  = function() { if (global.PA_DEBUG) console.log.apply(console, ['[PA.hardening]'].concat([].slice.call(arguments))); };
  var _warn = function() { console.warn.apply(console, ['[PA.hardening ⚠️]'].concat([].slice.call(arguments))); };
  var _ts   = function() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()).toFixed(1) + 'ms'; };
  function _tel(cat, data) { if (global.PA && global.PA.telemetry) global.PA.telemetry.push(cat, data); }


  // ══════════════════════════════════════════════════════════════════════
  // T3 — PA.formatters — consolidação de formatadores
  // Único ponto de verdade para formatação de tempo, preço e tier.
  // Substitui _fmtDuration, _fmtElapsed, tier inline em múltiplos arquivos.
  // ══════════════════════════════════════════════════════════════════════

  // Delega para PA.pipeline.formatDuration se disponível, fallback inline
  function _formatDuration(ms) {
    if (global.PA.pipeline && typeof global.PA.pipeline.formatDuration === 'function') {
      return global.PA.pipeline.formatDuration(ms);
    }
    if (!ms || ms < 0) return '0m';
    var totalMin = Math.floor(Math.abs(ms) / 60000);
    var d = Math.floor(totalMin / 1440), h = Math.floor((totalMin % 1440) / 60), m = totalMin % 60;
    var p = [];
    if (d > 0) p.push(d + 'd');
    if (h > 0) p.push(h + 'h');
    if (d === 0) p.push(m + 'm');
    return p.join(' ') || '0m';
  }

  // "há Xd Yh" para timestamps passados
  function _formatTimeAgo(ms) {
    if (!ms || ms < 0) return 'agora';
    var totalMin = Math.floor(ms / 60000);
    var d = Math.floor(totalMin / 1440), h = Math.floor((totalMin % 1440) / 60), m = totalMin % 60;
    if (d > 0)  return d + 'd ' + h + 'h atrás';
    if (h > 0)  return h + 'h ' + m + 'm atrás';
    if (m > 0)  return m + 'm atrás';
    return 'agora mesmo';
  }

  // Normaliza tier — única implementação, delega para QueuePrivacy se disponível
  function _normalizeTier(tier) {
    if (global.QueuePrivacy && typeof global.QueuePrivacy.normalizeTierLabel === 'function') {
      return global.QueuePrivacy.normalizeTierLabel(tier);
    }
    if (!tier) return '';
    var t = String(tier).toLowerCase().replace(/[\s_-]/g, '');
    if (t === 't1') return 'T1';
    if (t === 't2') return 'T2';
    if (t === 't3') return 'T3';
    if (t === 'superraro' || t === 'sr' || t === 'ultrararo') return 'SR';
    return '';
  }

  // Format KK price — delegates to global formatKK
  function _formatKK(raw) {
    if (typeof global.formatKK === 'function') return global.formatKK(raw);
    if (!raw || raw <= 0) return { label: '—', brl: '—' };
    var kk = raw / 1000000;
    return { label: kk.toFixed(1) + 'kk', brl: 'R$—' };
  }

  global.PA.formatters = {
    duration:  _formatDuration,
    timeAgo:   _formatTimeAgo,
    tier:      _normalizeTier,
    kk:        _formatKK,
  };


  // ══════════════════════════════════════════════════════════════════════
  // T6 — Badge renderer memoizado
  // Cache de strings HTML de badges por tier label — evita recriar DOM
  // para pedidos compostos com muitos cards.
  // ══════════════════════════════════════════════════════════════════════

  var _badgeCache = {};  // { 'T1': '<span ...>T1</span>', ... }

  function renderTierBadge(tierLabel) {
    if (!tierLabel) return '';
    if (_badgeCache[tierLabel]) return _badgeCache[tierLabel];
    var cls = 'order-item-tier--' + tierLabel.toLowerCase();
    var html = '<span class="order-item-tier-badge ' + cls + '">' + tierLabel + '</span>';
    _badgeCache[tierLabel] = html;
    return html;
  }

  // buildTierBadgesHtml — versão memoizada do buildTierBadges de queue-privacy
  // Recebe array de items e retorna HTML completo do container de badges
  function buildTierBadgesHtml(items) {
    if (!items || !items.length) return '';
    var badges = items
      .filter(function(it) {
        if (!it) return false;
        return it.type === 'capture' || !!it.pokemon || (it.name && /ball/i.test(it.name));
      })
      .map(function(it) {
        var lbl = _normalizeTier(it.tier || it.tag || '');
        return lbl ? renderTierBadge(lbl) : '';
      })
      .filter(Boolean);
    if (!badges.length) return '';
    return '<div class="order-item-tier-badges">' + badges.join('') + '</div>';
  }

  global.PA.badges = { render: renderTierBadge, buildBadgesHtml: buildTierBadgesHtml };


  // ══════════════════════════════════════════════════════════════════════
  // T1 + T2 — Lazy render & Virtual SLA (IntersectionObserver)
  // Cards fora da viewport:
  //   - Recebem classe .order-card--offscreen
  //   - SLA tickers pausados (via _slaTickerPaused no element)
  // Cards entrando na viewport:
  //   - Classe removida
  //   - SLA retoma
  // ══════════════════════════════════════════════════════════════════════

  var _cardObserver = null;
  var _observedCards = new WeakSet();

  function _initCardObserver() {
    if (!global.IntersectionObserver) {
      _log('IntersectionObserver não suportado — lazy render desabilitado');
      return;
    }
    if (_cardObserver) return;

    _cardObserver = new global.IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        var el = entry.target;
        if (entry.isIntersecting) {
          el.classList.remove('order-card--offscreen');
          el._slaTickerPaused = false;
          // Força re-inject do SLA se necessário
          if (typeof SlaRealtimeUI !== 'undefined' && el._slaNeedsInject) {
            el._slaNeedsInject = false;
            // SlaRealtimeUI will pick it up on next scan
          }
        } else {
          el.classList.add('order-card--offscreen');
          el._slaTickerPaused = true;
        }
      });
    }, {
      root:       null,
      rootMargin: '100px 0px',   // pre-load 100px before entering viewport
      threshold:  0,
    });

    _log('CardObserver inicializado');
  }

  // Registra um card para observação de visibilidade
  function observeCard(el) {
    if (!_cardObserver || !el || _observedCards.has(el)) return;
    _observedCards.add(el);
    _cardObserver.observe(el);
  }

  // Para de observar um card (ao ser removido do DOM)
  function unobserveCard(el) {
    if (!_cardObserver || !el) return;
    _cardObserver.unobserve(el);
    _observedCards.delete(el);
  }

  global.PA.lazyRender = { observeCard: observeCard, unobserveCard: unobserveCard };


  // ══════════════════════════════════════════════════════════════════════
  // T4 — Skeleton shimmer
  // Injeta CSS de skeleton e expõe helpers para mostrar/esconder shimmer.
  // ══════════════════════════════════════════════════════════════════════

  function _injectSkeletonCSS() {
    if (global.document.getElementById('pa-skeleton-css')) return;
    var style = global.document.createElement('style');
    style.id = 'pa-skeleton-css';
    style.textContent = [
      // Keyframe do shimmer
      '@keyframes pa-shimmer {',
      '  0%   { background-position: -400px 0; }',
      '  100% { background-position: 400px 0; }',
      '}',
      // Base skeleton
      '.pa-skeleton {',
      '  background: linear-gradient(90deg,',
      '    rgba(255,255,255,0.04) 25%,',
      '    rgba(255,255,255,0.10) 50%,',
      '    rgba(255,255,255,0.04) 75%);',
      '  background-size: 800px 100%;',
      '  animation: pa-shimmer 1.4s infinite linear;',
      '  border-radius: 6px;',
      '  pointer-events: none;',
      '}',
      // Skeleton para card de pedido
      '.order-card--skeleton {',
      '  min-height: 80px;',
      '  border-radius: 12px;',
      '  margin-bottom: 10px;',
      '}',
      // Skeleton para item do carrinho
      '.cart-row--skeleton {',
      '  height: 44px;',
      '  border-radius: 8px;',
      '  margin-bottom: 6px;',
      '}',
      // Skeleton para card de captura
      '.captura-card--skeleton {',
      '  height: 120px;',
      '  border-radius: 12px;',
      '}',
      // Offtscreen cards: não animam SLA (economia de CPU)
      '.order-card--offscreen .sla-block,',
      '.order-card--offscreen .sla-timeline {',
      '  visibility: hidden;',
      '}',
    ].join('\n');
    global.document.head.appendChild(style);
    _log('Skeleton CSS injetado');
  }

  /**
   * Mostra N skeletons de cards de pedido em um container.
   * @param {Element} container
   * @param {number}  count
   */
  function showOrderSkeletons(container, count) {
    if (!container) return;
    count = count || 3;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="order-card order-card--skeleton pa-skeleton"></div>';
    }
    container.innerHTML = html;
  }

  /**
   * Mostra N skeletons de items de captura.
   */
  function showCapturaSkeletons(container, count) {
    if (!container) return;
    count = count || 6;
    var html = '';
    for (var i = 0; i < count; i++) {
      html += '<div class="captura-card captura-card--skeleton pa-skeleton"></div>';
    }
    container.innerHTML = html;
  }

  /**
   * Remove skeletons de um container (chamado antes do commit real).
   */
  function clearSkeletons(container) {
    if (!container) return;
    container.querySelectorAll('.pa-skeleton').forEach(function(el) { el.remove(); });
  }

  global.PA.skeleton = { showOrders: showOrderSkeletons, showCaptura: showCapturaSkeletons, clear: clearSkeletons };


  // ══════════════════════════════════════════════════════════════════════
  // T5 — DOM Budget
  // Conta nodes por área e expõe via PA.health.domBudget()
  // ══════════════════════════════════════════════════════════════════════

  function domBudget() {
    var result = {
      ts: _ts(),
      total: global.document.querySelectorAll('*').length,
      areas: {},
    };

    var areas = [
      ['pedidos-lista',   '#pedidos-lista'],
      ['items-grid',      '#items-grid'],
      ['captura-grid',    '#captura-grid'],
      ['pkg-sidebar-list','#pkg-sidebar-list'],
      ['wiki-grid',       '#wiki-grid'],
      ['cart-overlay',    '#cart-overlay'],
    ];

    areas.forEach(function(a) {
      var el = global.document.querySelector(a[1]);
      result.areas[a[0]] = el ? el.querySelectorAll('*').length : 0;
    });

    // Count active observers from PA.health
    var heartbeats = (global.PA.health && global.PA.health.getHeartbeats)
      ? global.PA.health.getHeartbeats().length : 0;
    result.activeHeartbeats = heartbeats;

    // Count observed cards
    result.observedCards = _observedCards ? (function(){
      // WeakSet has no size — count active via DOM
      var cards = global.document.querySelectorAll('.order-card[data-order-id]');
      return cards.length;
    })() : 0;

    // Count active SLA tickers (cards with _slaTickerRunning)
    var slaCards = global.document.querySelectorAll('.order-card[data-order-id]');
    var slaActive = 0, slaPaused = 0;
    slaCards.forEach(function(el) {
      if (el._slaTickerRunning) {
        if (el._slaTickerPaused) slaPaused++;
        else slaActive++;
      }
    });
    result.slaTickersActive = slaActive;
    result.slaTickersPaused = slaPaused;

    // Memoized badge cache size
    result.badgeCacheSize = Object.keys(_badgeCache).length;

    _tel('dom-budget', result);
    return result;
  }

  // Attach to PA.health if available, else create directly
  global.document.addEventListener('DOMContentLoaded', function() {
    if (global.PA.health) {
      global.PA.health.domBudget = domBudget;
    }
  });


  // ══════════════════════════════════════════════════════════════════════
  // T7 — Queue Privacy Hardening
  // Verifica se nomes de pokémon vazam em data-* ou aria-label
  // ══════════════════════════════════════════════════════════════════════

  function auditPrivacyLeaks() {
    var leaks = [];
    // Scan DOM for potential leaks (only in debug mode)
    if (!global.PA_DEBUG) return leaks;

    var suspects = global.document.querySelectorAll(
      '[data-pokemon],[aria-label*="Pokémon"],[title*="Pokémon"],.order-item-name--public'
    );
    suspects.forEach(function(el) {
      var text = el.textContent || '';
      var aria = el.getAttribute('aria-label') || '';
      var title = el.getAttribute('title') || '';
      var dataPoke = el.getAttribute('data-pokemon') || '';

      // Flag if any of these contain what looks like a specific pokemon name
      // (heuristic: not 'Captura Pokémon', not a tier label)
      var combined = (text + aria + title + dataPoke).toLowerCase();
      if (combined && !combined.match(/^(captura pok[eé]mon|t1|t2|t3|sr|em processamento|\d+|—)$/)) {
        // Only flag if it looks like a real name (has space or capital mid-word etc)
        if (combined.match(/[a-z]{4,}/) && !combined.match(/processamento|captura|aguardando/)) {
          leaks.push({ el: el.className, text: text.slice(0, 40), aria: aria.slice(0, 40) });
        }
      }
    });
    if (leaks.length) _warn('Privacy audit: ' + leaks.length + ' suspeito(s) encontrado(s). Ver PA.hardening.auditPrivacyLeaks()');
    return leaks;
  }

  // Strip pokemon name from telemetry if it snuck in
  global.PA._privacyFilter = function(data) {
    if (!data) return data;
    // Remove 'pokemon' key from telemetry objects that are not admin-scoped
    var safe = Object.assign({}, data);
    delete safe.pokemon;
    delete safe.pokemonName;
    return safe;
  };


  // ══════════════════════════════════════════════════════════════════════
  // T8 — Realtime visual smoothing helpers
  // morphEl: atualiza apenas os nós que mudaram, sem wipe completo
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Atualiza o textContent de elementos específicos dentro de um card
   * sem recriar o card inteiro. Usado quando só o status ou progresso mudou.
   *
   * @param {Element}  cardEl      Card DOM element
   * @param {Object}   updates     { '[data-selector]': newText, ... }
   */
  function morphCardFields(cardEl, updates) {
    if (!cardEl || !updates) return;
    Object.keys(updates).forEach(function(selector) {
      var el = cardEl.querySelector(selector);
      if (el && el.textContent !== updates[selector]) {
        el.textContent = updates[selector];
        _tel('render-morph', { selector: selector });
      }
    });
  }

  /**
   * Aplica um class toggle sem layout thrash.
   * Batched via requestAnimationFrame.
   */
  var _pendingClassOps = [];
  var _classOpScheduled = false;

  function scheduleClassToggle(el, addCls, removeCls) {
    _pendingClassOps.push({ el: el, add: addCls, remove: removeCls });
    if (!_classOpScheduled) {
      _classOpScheduled = true;
      requestAnimationFrame(function() {
        _pendingClassOps.forEach(function(op) {
          if (op.add)    op.el.classList.add(op.add);
          if (op.remove) op.el.classList.remove(op.remove);
        });
        _pendingClassOps = [];
        _classOpScheduled = false;
      });
    }
  }

  global.PA.morphCard  = morphCardFields;
  global.PA.classToggle = scheduleClassToggle;


  // ══════════════════════════════════════════════════════════════════════
  // T9 — Mobile overflow + touch targets CSS
  // Injeta ajustes que não requerem HTML changes
  // ══════════════════════════════════════════════════════════════════════

  function _injectMobilePolishCSS() {
    if (global.document.getElementById('pa-mobile-polish-css')) return;
    var style = global.document.createElement('style');
    style.id = 'pa-mobile-polish-css';
    style.textContent = [
      // Touch targets mínimos para botões de ação
      '.order-card-cancel-btn,',
      '.order-card-admin-toggle,',
      '.order-card-hist-toggle {',
      '  min-height: 32px;',
      '  min-width: 44px;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '}',
      // Badges não transbordam em mobile
      '.order-item-tier-badges {',
      '  max-width: 100%;',
      '  overflow-x: auto;',
      '  scrollbar-width: none;',
      '}',
      '.order-item-tier-badges::-webkit-scrollbar { display: none; }',
      // Evita scroll jitter em listas longas
      '#pedidos-lista {',
      '  will-change: contents;',
      '  contain: layout style;',
      '}',
      // Suaviza entrada de novos cards (realtime)
      '@media (prefers-reduced-motion: no-preference) {',
      '  .order-card[data-new-card] {',
      '    animation: pa-card-in 0.22s ease-out;',
      '  }',
      '  @keyframes pa-card-in {',
      '    from { opacity: 0; transform: translateY(-6px); }',
      '    to   { opacity: 1; transform: translateY(0); }',
      '  }',
      '}',
    ].join('\n');
    global.document.head.appendChild(style);
    _log('Mobile polish CSS injetado');
  }


  // ══════════════════════════════════════════════════════════════════════
  // T10 — Debug panel — seções adicionais
  // PA.debug.refresh() já existe em pa-compat.js;
  // aqui registramos um provider de seção adicional.
  // ══════════════════════════════════════════════════════════════════════

  // PA.debug.extraSections: array de { title, getHTML }
  // pa-compat.js chamará cada provider na próxima versão que integre isso.
  // Por ora expõe via PA.hardening.debugSection()
  function debugSection() {
    var budget = (typeof global.document !== 'undefined') ? domBudget() : {};
    var leaks  = global.PA_DEBUG ? auditPrivacyLeaks() : [];
    var beats  = (global.PA.health && global.PA.health.getHeartbeats) ? global.PA.health.getHeartbeats() : [];
    var skeletonActive = global.document
      ? global.document.querySelectorAll('.pa-skeleton').length : 0;

    return {
      'DOM Budget': {
        'Total nodes':     budget.total,
        'pedidos-lista':   budget.areas && budget.areas['pedidos-lista'],
        'items-grid':      budget.areas && budget.areas['items-grid'],
        'SLA tickers':     (budget.slaTickersActive || 0) + ' ativos, ' + (budget.slaTickersPaused || 0) + ' pausados',
        'Badge cache':     budget.badgeCacheSize + ' entradas',
        'Skeletons':       skeletonActive,
      },
      'Privacy Audit': {
        'Leaks detectados': leaks.length || '0 ✅',
      },
      'Mobile Polish': {
        'Touch targets CSS': global.document.getElementById('pa-mobile-polish-css') ? '✅' : '⏳',
        'Skeleton CSS':      global.document.getElementById('pa-skeleton-css') ? '✅' : '⏳',
      },
    };
  }


  // ══════════════════════════════════════════════════════════════════════
  // Bootstrap
  // ══════════════════════════════════════════════════════════════════════

  global.document.addEventListener('DOMContentLoaded', function() {
    _injectSkeletonCSS();
    _injectMobilePolishCSS();
    _initCardObserver();
    _log('Hardening inicializado — skeleton, mobile polish, card observer prontos');
    _tel('boot', { module: 'PA.hardening', ts: _ts() });
  });


  // ══════════════════════════════════════════════════════════════════════
  // API pública
  // ══════════════════════════════════════════════════════════════════════

  global.PA.hardening = {
    auditPrivacyLeaks: auditPrivacyLeaks,
    domBudget:         domBudget,
    debugSection:      debugSection,
    // Expõe observer para orders-ui usar ao criar/remover cards
    observeCard:       observeCard,
    unobserveCard:     unobserveCard,
  };

  // ══════════════════════════════════════════════════════════════════════
  // PA.monitor — Observabilidade (Fase 2, Passo 1)
  //
  // NÃO usa wrappers globais de fetch/WebSocket.
  // Alimentado por pontos de instrumentação explícitos em:
  //   realtime-manager.js → PA.monitor._realtimeHook(event, data)
  //   supabase-client.js  → PA.monitor._fetchHook(event, data)
  //   módulos de UI       → PA.monitor._renderHook(module)
  //
  // Acesso: PA.monitor.report() no console do browser.
  // ══════════════════════════════════════════════════════════════════════

  var _monitor = {
    // ── WebSockets ───────────────────────────────────────────────────
    // Preenchido por realtime-manager via _realtimeHook(type, payload)
    websockets: {
      count:    0,
      list:     [],     // [{ module, url, state, openedAt, closedAt }]
      channels: {},     // { 'realtime:public:pedidos': true, ... } — canais únicos ativos
      byModule: {},     // { 'RealtimeManager': true, ... } — módulos com socket ativo
    },

    // ── Eventos duplicados ──────────────────────────────────────────
    // Preenchido quando _seenEvents descarta um evento já processado
    duplicateEvents: {
      count: 0,
      log:   [],  // últimos 50: [{ key, module, ts }]
      _MAX:  50,
    },

    // ── Fetches Supabase em andamento ───────────────────────────────
    // Preenchido por supabase-client via _fetchHook('start'/'end', data)
    pendingFetches: {
      count: 0,
      log:   [],  // últimos 50: [{ url, method, startedAt, endedAt, status }]
      _MAX:  50,
    },

    // ── Reconexões WebSocket ────────────────────────────────────────
    // Preenchido via CustomEvent 'realtime:status' (já emitido pelo realtime-manager)
    reconnects: {
      count:    0,
      byModule: {},  // { 'RealtimeManager': 2, ... }
    },

    // ── Renders de UI ───────────────────────────────────────────────
    // Preenchido por módulos de UI via _renderHook(module)
    renders: {
      count:    0,
      byModule: {},  // { 'OrdersUI': 12, 'DeliveryGallery': 3, ... }
      lastTs:   null,
    },
  };

  // ── Hook público: chamado pelo realtime-manager ──────────────────────
  // Eventos:
  //   'ws:open'        → { module, url, openedAt }  — socket aberto
  //   'ws:close'       → { module }                 — socket fechado
  //   'ws:reconnect'   → { module }                 — reconexão detectada
  //   'channel'        → { channel, module }        — canal subscrito (phx_join enviado)
  //   'module'         → { module }                 — módulo registrou presença
  //   'event:duplicate'→ { key, module }             — evento duplicado descartado
  function _realtimeHook(event, data) {
    try {
      if (event === 'ws:open') {
        _monitor.websockets.count++;
        _monitor.websockets.list.push({
          module:    data.module    || 'unknown',
          url:       data.url       || '',
          state:     'open',
          openedAt:  data.openedAt  || Date.now(),
          closedAt:  null,
        });
        // Registra presença do módulo (booleana — não conta múltiplas conexões)
        var mod = data.module || 'unknown';
        _monitor.websockets.byModule[mod] = true;

      } else if (event === 'ws:close') {
        _monitor.websockets.count = Math.max(0, _monitor.websockets.count - 1);
        var mod = data.module || 'unknown';
        var entry = _monitor.websockets.list.find(function(e) {
          return e.module === mod && e.closedAt === null;
        });
        if (entry) { entry.state = 'closed'; entry.closedAt = Date.now(); }

      } else if (event === 'ws:reconnect') {
        _monitor.reconnects.count++;
        var mod = data.module || 'unknown';
        _monitor.reconnects.byModule[mod] = (_monitor.reconnects.byModule[mod] || 0) + 1;

      } else if (event === 'channel') {
        // Canal subscrito: phx_join enviado para o servidor.
        // Fase 2 Passo 5A.1: presença booleana — reconexão não altera contagem.
        var ch = data.channel || 'unknown';
        _monitor.websockets.channels[ch] = true;

      } else if (event === 'module') {
        // Fase 2 Passo 5A.1: byModule registra presença (não conta conexões).
        // 'module' hook removido do realtime-manager — este branch mantido
        // para compatibilidade com módulos externos futuros.
        var mod = data.module || 'unknown';
        _monitor.websockets.byModule[mod] = true;

      } else if (event === 'event:duplicate') {
        _monitor.duplicateEvents.count++;
        _monitor.duplicateEvents.log.push({
          key:    data.key    || '',
          module: data.module || 'unknown',
          ts:     Date.now(),
        });
        if (_monitor.duplicateEvents.log.length > _monitor.duplicateEvents._MAX) {
          _monitor.duplicateEvents.log.shift();
        }
      }
    } catch (e) {
      _warn('[PA.monitor] _realtimeHook erro:', e.message);
    }
  }

  // ── Hook público: chamado pela camada Supabase ───────────────────────
  // Eventos esperados: 'fetch:start', 'fetch:end'
  function _fetchHook(event, data) {
    try {
      if (event === 'fetch:start') {
        _monitor.pendingFetches.count++;
        _monitor.pendingFetches.log.push({
          url:       data.url    || '',
          method:    data.method || 'GET',
          startedAt: new Date().toISOString(),
          endedAt:   null,
          status:    null,
          _ref:      data._ref   || null,
        });
        if (_monitor.pendingFetches.log.length > _monitor.pendingFetches._MAX) {
          _monitor.pendingFetches.log.shift();
        }
      } else if (event === 'fetch:end') {
        _monitor.pendingFetches.count = Math.max(0, _monitor.pendingFetches.count - 1);
        var ref = data._ref || null;
        if (ref) {
          var fe = _monitor.pendingFetches.log.find(function(e) { return e._ref === ref && e.endedAt === null; });
          if (fe) { fe.endedAt = new Date().toISOString(); fe.status = data.status || null; }
        }
      }
    } catch (e) {
      _warn('[PA.monitor] _fetchHook erro:', e.message);
    }
  }

  // ── Hook público: chamado por módulos de UI ──────────────────────────
  function _renderHook(moduleName) {
    try {
      _monitor.renders.count++;
      _monitor.renders.byModule[moduleName] = (_monitor.renders.byModule[moduleName] || 0) + 1;
      _monitor.renders.lastTs = new Date().toISOString();
    } catch (e) {}
  }

  // ── Reconexões: contadas diretamente pelo realtime-manager.js ─────────
  // Fase 2 Passo 5A.1: listener realtime:status removido — causava dupla
  // contagem junto com o hook direto em realtime-manager.js ws.onclose.
  // Fonte única: realtime-manager.js → PA.monitor.reconnects (direto).

  // ── report(): impressão formatada no console ─────────────────────────
  function _report() {
    var sep = '─'.repeat(50);
    console.group('%c PA.monitor.report()', 'color:#7eb3ff;font-weight:bold;font-size:13px');
    console.log(sep);

    // ── WebSockets ──────────────────────────────────────────────────
    console.log('%c WebSockets', 'color:#60aaff;font-weight:bold');
    console.log('Ativos agora        :', _monitor.websockets.count);
    if (_monitor.websockets.list.length) {
      console.table(_monitor.websockets.list.map(function(e) {
        return {
          module:    e.module,
          state:     e.state,
          openedAt:  e.openedAt,
          closedAt:  e.closedAt,
        };
      }));
    }
    console.log(sep);

    // ── Canais, Módulos, Reconexões ─────────────────────────────────────
    // channels e byModule são mapas de presença { key: true }.
    // Reconexão não altera a contagem — canal permanece único.
    console.log('%c Canais / Módulos / Reconexões', 'color:#60aaff;font-weight:bold');
    console.log('Canais únicos       :', Object.keys(_monitor.websockets.channels).length);
    console.log({
      channels:   _monitor.websockets.channels,
      modules:    _monitor.websockets.byModule,
      reconnects: _monitor.reconnects,
    });    console.log(sep);

    // ── Fetches ─────────────────────────────────────────────────────
    console.log('%c Fetches Supabase', 'color:#60aaff;font-weight:bold');
    console.log('Pendentes agora     :', _monitor.pendingFetches.count);
    console.log('Total no log        :', _monitor.pendingFetches.log.length);
    console.log(sep);

    // ── Eventos duplicados ──────────────────────────────────────────
    console.log('%c Eventos Realtime', 'color:#60aaff;font-weight:bold');
    console.log('Duplicados (discard):', _monitor.duplicateEvents.count);
    if (_monitor.duplicateEvents.log.length) {
      console.table(_monitor.duplicateEvents.log.slice(-10));
    }
    console.log(sep);

    // ── Renders ─────────────────────────────────────────────────────
    console.log('%c Renders', 'color:#60aaff;font-weight:bold');
    console.log('Total               :', _monitor.renders.count);
    console.log('Por módulo          :', _monitor.renders.byModule);
    console.log('Último              :', _monitor.renders.lastTs);
    console.log(sep);

    console.groupEnd();

    // Retorna snapshot para uso programático
    return {
      websockets:      _monitor.websockets,
      pendingFetches:  _monitor.pendingFetches,
      duplicateEvents: _monitor.duplicateEvents,
      reconnects:      _monitor.reconnects,
      renders:         _monitor.renders,
    };
  }

  // ── Expõe API pública ────────────────────────────────────────────────
  global.PA.monitor = {
    // Dados brutos (leitura direta — objeto live, sempre atualizado)
    websockets:      _monitor.websockets,   // .count .list .channels .byModule
    duplicateEvents: _monitor.duplicateEvents,
    pendingFetches:  _monitor.pendingFetches,
    reconnects:      _monitor.reconnects,   // .count .byModule
    renders:         _monitor.renders,
    // Hooks para instrumentação explícita (chamados por módulos externos)
    _realtimeHook:   _realtimeHook,  // 'ws:open','ws:close','ws:reconnect','channel','module','event:duplicate'
    _fetchHook:      _fetchHook,     // 'fetch:start','fetch:end'
    _renderHook:     _renderHook,    // moduleName string
    // Utilitários
    report:          _report,        // PA.monitor.report() no console
  };

  _log('[PA.monitor] Observabilidade inicializada. Use PA.monitor.report() no console.');

  _log('pa-hardening.js v1 carregado');

}(window));
