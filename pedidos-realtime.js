// ============================================================
// pedidos-realtime.js — v1
// PokeAlliance Shop
//
// Módulo dedicado ao Realtime de PEDIDOS via WebSocket Phoenix.
//
// FUNCIONALIDADES:
//   - Escuta INSERT, UPDATE e DELETE na tabela `pedidos`
//   - Atualiza DOM imediatamente (sem reload)
//   - Deduplicação de eventos por ID + timestamp
//   - Evita subscribe duplicado / múltiplos canais
//   - Reconexão automática após queda
//   - Logs padronizados [Realtime] para diagnóstico
//
// DEPENDÊNCIAS (carregue nesta ordem no HTML):
//   supabase-client.js  → SUPABASE_URL, SUPABASE_KEY
//   session.js          → Session.getCurrentUser(), onAuthChange
//   orders-storage.js   → OrdersStorage
//   orders-ui.js        → OrdersUI.render()
//   pedidos.js          → _supabaseToOrderStorage (via pedidosCarregar)
//   pedidos-realtime.js ← este arquivo
// ============================================================

;(function (global) {
  'use strict';

  // ── Estado interno ────────────────────────────────────────────────────
  var _ws             = null;      // WebSocket ativo
  var _wsActive       = false;     // canal confirmado (phx_reply ok)
  var _subscribeRef   = 0;         // incrementa a cada nova conexão
  var _heartbeat      = null;      // setInterval do heartbeat
  var _reconnectTimer = null;      // setTimeout do reconnect
  var _destroyed      = false;     // true após stopRealtime() definitivo
  var _authHandler    = null;      // referência para remover listener

  // Deduplicação: guarda "id:evento:ts" dos últimos eventos processados
  var _seenEvents = new Set();
  var SEEN_MAX    = 300;

  // ── Helpers internos ──────────────────────────────────────────────────

  function _log()  {
    var a = Array.prototype.slice.call(arguments);
    console.log.apply(console, ['[Realtime]'].concat(a));
  }
  function _warn() {
    var a = Array.prototype.slice.call(arguments);
    console.warn.apply(console, ['[Realtime]'].concat(a));
  }
  function _err()  {
    var a = Array.prototype.slice.call(arguments);
    console.error.apply(console, ['[Realtime]'].concat(a));
  }

  // Gera chave de deduplicação para um evento
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
  // Espelha a lógica de _supabaseToOrderStorage() em pedidos.js
  // para poder atualizar o cache local sem um fetch completo.

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

  // ── Atualização do cache local (OrdersStorage / localStorage) ─────────

  function _applyInsert(record) {
    if (typeof OrdersStorage === 'undefined') return;
    var storageId = 'sb_' + record.id;
    var orders    = OrdersStorage.getAllOrders();
    // Evita duplicar se já existe
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
      // Pedido novo que chegou via UPDATE (ex.: admin criou e já atualizou antes do INSERT chegar)
      _log('UPDATE para pedido desconhecido — inserindo:', storageId);
      _applyInsert(record);
      return;
    }
    // Merge: mantém campos calculados locais, sobrescreve dados do banco
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

  // ── Renderização imediata da UI ───────────────────────────────────────

  function _renderUI() {
    if (typeof OrdersUI !== 'undefined' && typeof OrdersUI.render === 'function') {
      OrdersUI.render();
    } else if (typeof OrdersKanban !== 'undefined' && typeof OrdersKanban.render === 'function') {
      OrdersKanban.render();
    } else {
      // fallback para render legado em pedidos.js
      if (typeof global.pedidosCarregar === 'function') {
        global.pedidosCarregar();
      }
    }
  }

  // ── Processamento de evento realtime ──────────────────────────────────

  function _handleEvent(tipo, record) {
    if (!record || !record.id) {
      _warn('Evento', tipo, 'sem record.id — ignorando');
      return;
    }

    var key = _eventKey(tipo, record);
    if (_seenEvents.has(key)) {
      _log('Evento duplicado ignorado:', key);
      return;
    }
    _markSeen(key);

    _log('pedido ' + tipo.toLowerCase() + 'do — id:', record.id, '| status:', record.status_v3 || record.status || '?');

    if (tipo === 'INSERT') {
      _applyInsert(record);
    } else if (tipo === 'UPDATE') {
      _applyUpdate(record);
    } else if (tipo === 'DELETE') {
      _applyDelete(record);
    }

    // Re-renderiza sem reload de página
    _renderUI();
  }

  // ── Extrai record dos 3 formatos possíveis do Supabase Realtime ───────
  //   Formato 1 (mais comum): msg.payload.data.type + msg.payload.data.record
  //   Formato 2 (phoenix raw): msg.payload.type + msg.payload.record
  //   Formato 3 (alguns builds): msg.payload.new

  function _extractRecord(msg) {
    var tipo   = null;
    var record = null;

    if (msg.event === 'postgres_changes') {
      if (msg.payload && msg.payload.data && msg.payload.data.type && msg.payload.data.record) {
        tipo   = msg.payload.data.type;
        record = msg.payload.data.record;
      } else if (msg.payload && msg.payload.type && msg.payload.record) {
        tipo   = msg.payload.type;
        record = msg.payload.record;
      } else if (msg.payload && msg.payload.new && Object.keys(msg.payload.new).length) {
        tipo   = 'INSERT';   // convenção: payload.new → INSERT/UPDATE
        record = msg.payload.new;
      } else if (msg.payload && msg.payload.old && Object.keys(msg.payload.old).length) {
        tipo   = 'DELETE';
        record = msg.payload.old;
      }
    }

    return { tipo: tipo, record: record };
  }

  // ── WebSocket / Phoenix channel ───────────────────────────────────────

  function _connect() {
    var myRef = ++_subscribeRef;
    _destroyed = false;

    var wsUrl = (global.SUPABASE_URL || '')
      .replace('https://', 'wss://')
      .replace('http://',  'ws://')
      + '/realtime/v1/websocket'
      + '?apikey=' + (global.SUPABASE_KEY || '')
      + '&vsn=1.0.0';

    _log('Iniciando WebSocket para tabela pedidos (ref=' + myRef + ')…');

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
      _log('canal conectado (ref=' + myRef + ')');

      // Heartbeat a cada 25s para manter conexão viva
      _heartbeat = setInterval(function () {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(msgRef++),
          }));
        }
      }, 25000);

      // Inscreve canal pedidos — escuta INSERT, UPDATE e DELETE
      var channel = 'realtime:public:pedidos';
      _log('Inscrevendo canal:', channel);

      ws.send(JSON.stringify({
        topic:   channel,
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

      // Canal confirmado
      if (msg.event === 'phx_reply' && msg.payload && msg.payload.status === 'ok') {
        _wsActive = true;
        _log('canal conectado — escutando INSERT | UPDATE | DELETE em pedidos');
        return;
      }

      // Erro de canal
      if (msg.event === 'phx_error') {
        _err('phx_error — canal rejeitado:', msg.payload);
        return;
      }

      // Eventos postgres_changes
      if (msg.event === 'postgres_changes') {
        var extracted = _extractRecord(msg);
        if (extracted.tipo && extracted.record) {
          _handleEvent(extracted.tipo, extracted.record);
        }
      }
    };

    ws.onerror = function (err) {
      if (myRef !== _subscribeRef) return;
      _err('WebSocket erro (ref=' + myRef + '):', err.type || err);
    };

    ws.onclose = function (evt) {
      if (myRef !== _subscribeRef) return;
      _log('canal removido (ref=' + myRef + ') | code:', evt.code, '| reason:', evt.reason || '(sem motivo)');
      _wsActive = false;
      clearInterval(_heartbeat);
      _heartbeat = null;

      if (_destroyed) return;

      // Reconexão automática após 12s
      _reconnectTimer = setTimeout(function () {
        if (myRef !== _subscribeRef) return;
        if (_destroyed) return;
        _log('Reconectando…');
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

  // ── API Pública ───────────────────────────────────────────────────────

  /**
   * Inicia o realtime de pedidos.
   * Chamado automaticamente no login — chamar manualmente apenas se necessário.
   */
  function startRealtime() {
    if (
      _wsActive &&
      _ws &&
      _ws.readyState === WebSocket.OPEN
    ) {
      _log('Já ativo — ignorando subscribe duplicado.');
      return;
    }
    _stopInternal();
    _connect();
  }

  /**
   * Para o realtime definitivamente (ex.: logout).
   */
  function stopRealtime() {
    _destroyed = true;
    _subscribeRef++;
    _stopInternal();
    _seenEvents.clear();
    _log('canal removido definitivamente.');
  }

  /**
   * Retorna true se o WebSocket está conectado e o canal confirmado.
   */
  function isActive() {
    return _wsActive && _ws && _ws.readyState === WebSocket.OPEN;
  }

  // ── Inicialização automática via Session ──────────────────────────────

  function _bootstrap() {
    if (typeof Session === 'undefined') {
      _warn('Session não disponível — realtime de pedidos não será iniciado automaticamente.');
      return;
    }

    _authHandler = function (event, user) {
      if (event === 'login' && user) {
        _log('Login detectado — iniciando realtime de pedidos…');
        startRealtime();
      } else if (event === 'logout') {
        _log('Logout detectado — parando realtime de pedidos.');
        stopRealtime();
        _destroyed = false; // permite reiniciar no próximo login
      }
    };

    Session.onAuthChange(_authHandler);
  }

  // Garante execução após DOM pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _bootstrap, { once: true });
  } else {
    _bootstrap();
  }

  // ── Exporta globalmente ───────────────────────────────────────────────
  global.PedidosRealtime = {
    startRealtime: startRealtime,
    stopRealtime:  stopRealtime,
    isActive:      isActive,
  };

  _log('módulo carregado.');

})(window);
