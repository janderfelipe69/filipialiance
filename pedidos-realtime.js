// ============================================================
// pedidos-realtime.js — v2
// PokeAlliance Shop
//
// Módulo de integração realtime para PEDIDOS e ENTREGAS.
//
// v2 — integra com RealtimeManager (realtime-manager.js):
//   - Escuta CustomEvent 'pedidos:changed'  → atualiza cache + re-renderiza
//   - Escuta CustomEvent 'delivery:changed' → refresh gallery + pedidos
//   - Escuta CustomEvent 'orders:refresh'   → re-renderiza (compat)
//   - Mantém WebSocket próprio como FALLBACK se RealtimeManager não estiver presente
//
// DEPENDÊNCIAS (carregar nesta ordem):
//   supabase-client.js
//   session.js
//   schema-compat.js
//   orders-storage.js
//   orders-ui.js
//   pedidos.js
//   realtime-manager.js  ← NOVO (opcional: se ausente, usa WebSocket próprio)
//   pedidos-realtime.js  ← este arquivo
// ============================================================

;(function (global) {
  'use strict';

  // ── Estado interno (WebSocket próprio — fallback) ─────────────────────
  var _ws             = null;
  var _wsActive       = false;
  var _subscribeRef   = 0;
  var _heartbeat      = null;
  var _reconnectTimer = null;
  var _destroyed      = false;
  var _authHandler    = null;
  var _eventsAttached = false;

  // Deduplicação
  var _seenEvents = new Set();
  var SEEN_MAX    = 300;

  // ── Logging ────────────────────────────────────────────────────────────
  function _log()  { console.log.apply(console,  ['[PedidosRealtime]'].concat(Array.prototype.slice.call(arguments))); }
  function _warn() { console.warn.apply(console, ['[PedidosRealtime]'].concat(Array.prototype.slice.call(arguments))); }
  function _err()  { console.error.apply(console,['[PedidosRealtime]'].concat(Array.prototype.slice.call(arguments))); }

  // ── Helpers ────────────────────────────────────────────────────────────
  function _eventKey(tipo, record) {
    var ts = (record && (record.updated_at || record.created_at)) || '';
    return tipo + ':' + (record && record.id) + ':' + ts;
  }

  function _markSeen(key) {
    _seenEvents.add(key);
    if (_seenEvents.size > SEEN_MAX) {
      var oldest = Array.from(_seenEvents).slice(0, 50);
      oldest.forEach(function (k) { _seenEvents.delete(k); });
    }
  }

  // ── Conversor: row Supabase → objeto OrdersStorage ────────────────────
  function _rowToStorage(p) {
    var itens = Array.isArray(p.itens) ? p.itens : [];
    try { if (typeof p.itens === 'string') itens = JSON.parse(p.itens); } catch (e) { itens = []; }

    var items = itens.map(function (it, idx) {
      return {
        id:          'sb_item_' + p.id + '_' + idx,
        name:        it.nome || it.name || '—',
        qtdTotal:    parseInt(it.quantidade || it.qty || it.qtdTotal || 1, 10),
        qtdEntregue: 0,
        concluido:   false,
      };
    });

    var statusV3 = p.status_v3;
    if (!statusV3 || !['waiting_queue','in_progress','completed','cancelled'].includes(statusV3)) {
      var legacyMap = {
        pendente:     'waiting_queue',
        confirmado:   'waiting_queue',
        preparacao:   'in_progress',
        em_andamento: 'in_progress',
        parcial:      'in_progress',
        entregue:     'completed',
        concluido:    'completed',
        cancelado:    'cancelled',
        deleted:      'cancelled',
      };
      statusV3 = legacyMap[p.status] || 'waiting_queue';
    }

    return {
      id:            'sb_' + p.id,
      _supabaseId:   p.id,
      orderNumber:   p.id,
      userId:        p.user_id || null,
      nickname:      p.nick_jogo || '—',
      createdAt:     p.created_at || new Date().toISOString(),
      status_v3:        statusV3,
      status:           statusV3,
      started_at:       p.started_at || null,
      completed_at:     p.completed_at || null,
      service_type:     p.service_type || 'normal_package',
      service_quantity: parseInt(p.service_quantity || 1, 10),
      sla_min_days:     p.sla_min_days || null,
      sla_max_days:     p.sla_max_days || null,
      // v2: campos SLA persistente
      sla_hours:              p.sla_hours              || null,
      actual_duration_minutes: p.actual_duration_minutes || null,
      expired:                p.expired                || false,
      items:   items,
      progress: (statusV3 === 'completed') ? 100 : 0,
      notifications: [],
      history: [{ at: p.created_at, event: 'created', label: 'Pedido criado', by: p.nick_jogo }],
      cancelledAt:  (statusV3 === 'cancelled') ? (p.updated_at || p.created_at) : null,
      completedAt:  p.completed_at || null,
      observations: p.admin_notes || '',
      _totalKK:  p.total_kk  || p.subtotal_kk  || null,
      _totalBRL: p.total_brl || p.subtotal_brl || null,
      _pagModo:  p.pagamento_modo || null,
      _pagKK:    p.pagamento_kk  || null,
      _pagBRL:   p.pagamento_brl || null,
      _taxa:     p.taxa_servico  || false,
    };
  }

  // ── Cache operations ───────────────────────────────────────────────────
  function _applyInsert(record) {
    if (typeof OrdersStorage === 'undefined') return;
    var storageId = 'sb_' + record.id;
    var orders    = OrdersStorage.getAllOrders();
    if (orders.find(function (o) { return o.id === storageId; })) {
      _log('INSERT já presente no cache — ignorando:', storageId);
      return;
    }
    var newOrder = _rowToStorage(record);
    orders.push(newOrder);
    try {
      localStorage.setItem('pa_orders_v2', JSON.stringify(orders));
      _log('pedido inserido no cache:', storageId);
    } catch (e) {
      _warn('Falha ao salvar cache após INSERT:', e.message);
    }
  }

  function _applyUpdate(record) {
    if (typeof OrdersStorage === 'undefined') return;
    var storageId = 'sb_' + record.id;
    var orders    = OrdersStorage.getAllOrders();
    var idx       = orders.findIndex(function (o) { return o.id === storageId; });
    if (idx === -1) {
      _log('UPDATE para pedido desconhecido — inserindo:', storageId);
      _applyInsert(record);
      return;
    }
    var updated = Object.assign({}, orders[idx], _rowToStorage(record));
    orders[idx] = updated;
    try {
      localStorage.setItem('pa_orders_v2', JSON.stringify(orders));
      _log('pedido atualizado no cache:', storageId);
    } catch (e) {
      _warn('Falha ao salvar cache após UPDATE:', e.message);
    }
  }

  function _applyDelete(record) {
    if (typeof OrdersStorage === 'undefined') return;
    var storageId = 'sb_' + record.id;
    var orders    = OrdersStorage.getAllOrders().filter(function (o) { return o.id !== storageId; });
    try {
      localStorage.setItem('pa_orders_v2', JSON.stringify(orders));
      _log('pedido removido do cache:', storageId);
    } catch (e) {
      _warn('Falha ao salvar cache após DELETE:', e.message);
    }
  }

  // ── Renderização ───────────────────────────────────────────────────────
  function _renderUI() {
    if (typeof OrdersUI !== 'undefined' && typeof OrdersUI.render === 'function') {
      OrdersUI.render();
    } else if (typeof OrdersKanban !== 'undefined' && typeof OrdersKanban.render === 'function') {
      OrdersKanban.render();
    } else if (typeof global.pedidosCarregar === 'function') {
      global.pedidosCarregar();
    }
  }

  function _refreshDelivery() {
    if (typeof DeliveryGallery !== 'undefined' && typeof DeliveryGallery.refresh === 'function') {
      DeliveryGallery.refresh();
    }
  }

  // ── Processamento de evento realtime de pedidos ────────────────────────
  function _handlePedidoEvent(tipo, record) {
    if (!record || !record.id) {
      _warn('Evento pedidos', tipo, 'sem record.id — ignorando');
      return;
    }

    var key = _eventKey(tipo, record);
    if (_seenEvents.has(key)) {
      _log('Evento duplicado ignorado:', key);
      return;
    }
    _markSeen(key);

    _log('pedido ' + tipo.toLowerCase() + ' — id:', record.id, '| status:', record.status_v3 || record.status || '?');

    if (tipo === 'INSERT') {
      _applyInsert(record);
    } else if (tipo === 'UPDATE') {
      _applyUpdate(record);
    } else if (tipo === 'DELETE') {
      _applyDelete(record);
    }

    _renderUI();
  }

  // ── Escuta de CustomEvents do RealtimeManager ─────────────────────────
  function _attachGlobalEventListeners() {
    if (_eventsAttached) return;
    _eventsAttached = true;

    // Pedidos: INSERT, UPDATE, DELETE
    global.addEventListener('pedidos:changed', function (e) {
      var detail = e.detail || {};
      if (detail.event && detail.record) {
        _log('pedidos:changed recebido — event:', detail.event);
        _handlePedidoEvent(detail.event, detail.record);
      }
    });

    // Entregas: refresh gallery + lista de pedidos
    global.addEventListener('delivery:changed', function (e) {
      var detail = e.detail || {};
      _log('delivery:changed recebido — event:', detail.event, '| id:', detail.record && detail.record.id);
      _refreshDelivery();
      // Re-renderiza pedidos (pode ter progresso atualizado)
      _renderUI();
    });

    // Compat: orders:refresh (dispatchado por delivery-system.js ao remover entrega)
    global.addEventListener('orders:refresh', function (e) {
      _log('orders:refresh recebido:', e.detail && e.detail.source);
      _renderUI();
    });

    // orders:deleted — disparado por orders-admin.js ao excluir pedido.
    // Listener adicionado na Fase 4 (era evento órfão).
    // Debounce leve para evitar múltiplos refreshes em exclusões em lote.
    var _deletedTimer = null;
    global.addEventListener('orders:deleted', function (e) {
      _log('orders:deleted recebido — id:', e.detail && e.detail.supabaseId);
      clearTimeout(_deletedTimer);
      _deletedTimer = setTimeout(function () {
        _renderUI();
      }, 150);
    });

    _log('CustomEvent listeners registrados.');
  }

  // ── WebSocket próprio (FALLBACK — usado se RealtimeManager não estiver) ─

  function _extractRecord(msg) {
    var tipo   = null;
    var record = null;

    if (msg.event === 'postgres_changes') {
      if (typeof normalizeRealtimeRecord === 'function') {
        var _rt = normalizeRealtimeRecord(msg, 'pedidos');
        if (_rt.record) { tipo = _rt.event || tipo; record = _rt.record; }
      } else if (msg.payload && msg.payload.data && msg.payload.data.type && msg.payload.data.record) {
        tipo   = msg.payload.data.type;
        record = msg.payload.data.record;
      } else if (msg.payload && msg.payload.type && msg.payload.record) {
        tipo   = msg.payload.type;
        record = msg.payload.record;
      } else if (msg.payload && msg.payload.new && Object.keys(msg.payload.new).length) {
        tipo   = 'INSERT';
        record = msg.payload.new;
      } else if (msg.payload && msg.payload.old && Object.keys(msg.payload.old).length) {
        tipo   = 'DELETE';
        record = msg.payload.old;
      }
    }

    return { tipo: tipo, record: record };
  }

  function _connect() {
    var myRef = ++_subscribeRef;
    _destroyed = false;

    var wsUrl = (global.SUPABASE_URL || '')
      .replace('https://', 'wss://')
      .replace('http://',  'ws://')
      + '/realtime/v1/websocket'
      + '?apikey=' + (global.SUPABASE_KEY || '')
      + '&vsn=1.0.0';

    _log('Fallback WebSocket para tabela pedidos (ref=' + myRef + ')…');

    var ws;
    try {
      ws = new WebSocket(wsUrl);
      _ws = ws;
    } catch (e) {
      _warn('WebSocket indisponível:', e.message);
      return;
    }

    var msgRef = 1;

    ws.onopen = function () {
      if (myRef !== _subscribeRef) { ws.close(); return; }
      _log('fallback canal conectado (ref=' + myRef + ')');

      _heartbeat = setInterval(function () {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(msgRef++) }));
        }
      }, 25000);

      ws.send(JSON.stringify({
        topic:   'realtime:public:pedidos',
        event:   'phx_join',
        payload: {
          config: {
            broadcast:        { self: false },
            presence:         { key: '' },
            postgres_changes: [
              { event: 'INSERT', schema: 'public', table: 'pedidos' },
              { event: 'UPDATE', schema: 'public', table: 'pedidos' },
              { event: 'DELETE', schema: 'public', table: 'pedidos' },
            ],
          },
        },
        ref: String(msgRef++),
      }));
    };

    ws.onmessage = function (evt) {
      if (myRef !== _subscribeRef) return;
      var msg;
      try { msg = JSON.parse(evt.data); } catch (e) { return; }

      if (msg.event === 'phx_reply' && msg.payload && msg.payload.status === 'ok') {
        _wsActive = true;
        _log('fallback canal confirmado — escutando pedidos');
        return;
      }
      if (msg.event === 'phx_error') {
        _err('phx_error:', msg.payload);
        return;
      }
      if (msg.event === 'postgres_changes') {
        var extracted = _extractRecord(msg);
        if (extracted.tipo && extracted.record) {
          _handlePedidoEvent(extracted.tipo, extracted.record);
        }
      }
    };

    ws.onerror = function (err) {
      if (myRef !== _subscribeRef) return;
      _err('WebSocket erro (ref=' + myRef + '):', err.type || err);
    };

    ws.onclose = function (evt) {
      if (myRef !== _subscribeRef) return;
      _log('fallback canal removido (ref=' + myRef + ') code:', evt.code);
      _wsActive = false;
      clearInterval(_heartbeat);
      _heartbeat = null;

      if (_destroyed) return;
      _reconnectTimer = setTimeout(function () {
        if (myRef !== _subscribeRef || _destroyed) return;
        _log('Reconectando fallback…');
        _connect();
      }, 12000);
    };
  }

  function _stopInternal() {
    clearInterval(_heartbeat);
    clearTimeout(_reconnectTimer);
    _heartbeat      = null;
    _reconnectTimer = null;
    _wsActive       = false;
    if (_ws) {
      try { _ws.close(); } catch (e) {}
      _ws = null;
    }
  }

  // ── API Pública ────────────────────────────────────────────────────────

  function startRealtime() {
    // Sempre registra listeners globais (independente de usar RealtimeManager ou não)
    _attachGlobalEventListeners();

    // Se RealtimeManager estiver disponível, ele cuida do WebSocket — sem duplicar
    if (typeof global.RealtimeManager !== 'undefined') {
      _log('RealtimeManager detectado — usando eventos globais (sem WebSocket próprio).');
      return;
    }

    // Fallback: WebSocket próprio para a tabela pedidos
    if (typeof SchemaCompat !== 'undefined' && SchemaCompat.RealtimeGuard && SchemaCompat.RealtimeGuard.isActive('pedidos-realtime')) {
      _log('RealtimeGuard: canal já ativo — ignorando.');
      return;
    }
    if (_wsActive && _ws && _ws.readyState === WebSocket.OPEN) {
      _log('Fallback já ativo — ignorando.');
      return;
    }
    _stopInternal();
    _connect();
  }

  function stopRealtime() {
    _destroyed = true;
    _subscribeRef++;
    _stopInternal();
    _seenEvents.clear();
    _log('parado definitivamente.');
  }

  function isActive() {
    if (typeof global.RealtimeManager !== 'undefined') return global.RealtimeManager.isActive();
    return _wsActive && _ws && _ws.readyState === WebSocket.OPEN;
  }

  // ── Bootstrap automático ──────────────────────────────────────────────
  function _bootstrap() {
    if (typeof Session === 'undefined') {
      _warn('Session não disponível — realtime não será iniciado automaticamente.');
      return;
    }

    _authHandler = function (event, user) {
      if (event === 'login' && user) {
        _log('Login detectado — iniciando…');
        startRealtime();
      } else if (event === 'logout') {
        _log('Logout detectado — parando…');
        stopRealtime();
        _destroyed = false;
      }
    };

    Session.onAuthChange(_authHandler);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _bootstrap, { once: true });
  } else {
    _bootstrap();
  }

  global.PedidosRealtime = {
    startRealtime: startRealtime,
    stopRealtime:  stopRealtime,
    isActive:      isActive,
  };

  _log('módulo carregado (v2).');

})(window);
