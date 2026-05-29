// ============================================================
// realtime-manager.js — v1
// PokeAlliance Shop
//
// Módulo central de Realtime WebSocket.
// Gerencia canais de pedidos e delivery_proofs,
// evita conexões duplicadas (singleton), e emite
// CustomEvents globais para todos os módulos escutarem.
//
// EVENTOS EMITIDOS:
//   pedidos:changed   → { detail: { event, record, table } }
//   delivery:changed  → { detail: { event, record, table } }
//   realtime:status   → { detail: { status: 'connected'|'disconnected'|'error' } }
//
// DEPENDÊNCIAS:
//   supabase-client.js → SUPABASE_URL, SUPABASE_KEY
//   session.js         → Session.onAuthChange
//
// ORDEM NO HTML (antes de qualquer módulo que escuta eventos):
//   <script src="supabase-client.js"></script>
//   <script src="session.js"></script>
//   <script src="realtime-manager.js"></script>
// ============================================================

;(function (global) {
  'use strict';

  // ── Estado interno ─────────────────────────────────────────────────────
  var _ws             = null;      // WebSocket ativo
  var _wsActive       = false;     // canais confirmados
  var _subscribeRef   = 0;         // incrementa a cada reconexão (invalidação de closures antigas)
  var _heartbeatTimer = null;      // setInterval heartbeat
  var _reconnectTimer = null;      // setTimeout reconnect
  var _destroyed      = false;     // true após stop() definitivo
  var _msgRef         = 1;         // contador de ref para mensagens Phoenix

  // Deduplicação de eventos por "tabela:tipo:id:ts"
  var _seenEvents = new Set();
  var SEEN_MAX    = 500;

  // Canais a inscrever (tabela → evento CustomEvent)
  var CHANNELS = [
    {
      table:      'pedidos',
      customEvent: 'pedidos:changed',
      topic:      'realtime:public:pedidos',
    },
    {
      table:      'delivery_proofs',
      customEvent: 'delivery:changed',
      topic:      'realtime:public:delivery_proofs',
    },
    // Marketplace M1
    {
      table:      'marketplace_listings',
      customEvent: 'marketplace_listings:changed',
      topic:      'realtime:public:marketplace_listings',
    },
    // Marketplace M3
    {
      table:      'trade_sessions',
      customEvent: 'trade_sessions:changed',
      topic:      'realtime:public:trade_sessions',
    },
    {
      table:      'trade_messages',
      customEvent: 'trade_messages:changed',
      topic:      'realtime:public:trade_messages',
    },
    // Passo 5B — canais unificados (sem consumidor ainda; apenas emitem CustomEvents)
    {
      table:       'user_notifications',
      customEvent: 'notifications:changed',
      topic:       'realtime:public:user_notifications',
    },
    {
      table:       'affiliate_orders',
      customEvent: 'affiliate:changed',
      topic:       'realtime:public:affiliate_orders',
    },
  ];

  // ── Logging ────────────────────────────────────────────────────────────
  function _log()  { console.log.apply(console,  ['[RealtimeManager]'].concat(Array.prototype.slice.call(arguments))); }
  function _warn() { console.warn.apply(console, ['[RealtimeManager]'].concat(Array.prototype.slice.call(arguments))); }
  function _err()  { console.error.apply(console,['[RealtimeManager]'].concat(Array.prototype.slice.call(arguments))); }

  // ── Helpers ────────────────────────────────────────────────────────────

  function _eventKey(table, tipo, record) {
    var ts = (record && (record.updated_at || record.created_at)) || '';
    return table + ':' + tipo + ':' + (record && record.id) + ':' + ts;
  }

  function _markSeen(key) {
    _seenEvents.add(key);
    if (_seenEvents.size > SEEN_MAX) {
      var arr = Array.from(_seenEvents);
      for (var i = 0; i < 100; i++) _seenEvents.delete(arr[i]);
    }
  }

  // Campos financeiros que NUNCA devem aparecer no payload de clientes.
  var _FINANCIAL_FIELDS = ['payment_method','payment_value','payment_value_kk','payment_value_dd','obs_financeiro','price_brl'];

  function _sanitizeRealtimeRecord(customEventName, record) {
    // Aplica apenas para eventos de delivery_proofs
    if (!record || customEventName !== 'delivery:changed') return record;
    // Fase 2 Passo 3.7: padrão único — Session.isAdmin().
    var isAdminUser = typeof Session !== 'undefined' && typeof Session.isAdmin === 'function'
      ? Session.isAdmin() : false;
    if (isAdminUser) return record; // admin recebe payload completo
    // Cliente: remove todos os campos financeiros do payload realtime
    var safe = Object.assign({}, record);
    _FINANCIAL_FIELDS.forEach(function(f) { delete safe[f]; });
    return safe;
  }

  function _emit(customEventName, eventType, record) {
    try {
      var safeRecord = _sanitizeRealtimeRecord(customEventName, record);
      global.dispatchEvent(new CustomEvent(customEventName, {
        detail: { event: eventType, record: safeRecord, table: customEventName.split(':')[0] },
        bubbles: false,
      }));
    } catch (e) {
      _warn('Falha ao emitir evento', customEventName, e.message);
    }
  }

  function _emitStatus(status) {
    try {
      global.dispatchEvent(new CustomEvent('realtime:status', {
        detail: { status: status },
        bubbles: false,
      }));
    } catch (e) {}
  }

  // Tables that must NOT be passed through normalizeDeliveryProof.
  // normalizeRealtimeRecord (schema-compat.js) calls normalizeDeliveryProof on
  // every record regardless of table, which destroys session_id/content/sender_id
  // for trade_messages and corrupts trade_sessions.
  // Passo 5B: user_notifications e affiliate_orders adicionados — mesma razão que
  // trade_messages: normalizeDeliveryProof corromperia campos próprios dessas tabelas.
  var _RAW_TABLES = {
    trade_messages:     true,
    trade_sessions:     true,
    marketplace_listings: true,
    user_notifications: true,
    affiliate_orders:   true,
  };

  // ── Extractor: normaliza payload nos 3 formatos do Supabase Realtime ──
  function _extractFromMsg(msg) {
    var tipo   = null;
    var record = null;
    var table  = null;

    if (msg.event !== 'postgres_changes') return { tipo: null, record: null, table: null };

    // Detect table from topic so we can decide whether to normalise
    var msgTopic = msg.topic || '';
    var topicTable = null;
    for (var ci = 0; ci < CHANNELS.length; ci++) {
      if (msgTopic.indexOf(CHANNELS[ci].table) !== -1) {
        topicTable = CHANNELS[ci].table;
        break;
      }
    }

    // Use normalizeRealtimeRecord ONLY for delivery/pedidos tables.
    // For marketplace tables (trade_messages, trade_sessions, marketplace_listings)
    // extract the raw record to preserve all original fields.
    var skipNormalize = topicTable && _RAW_TABLES[topicTable];

    if (!skipNormalize && typeof normalizeRealtimeRecord === 'function') {
      var norm = normalizeRealtimeRecord(msg, null);
      if (norm && norm.record) {
        return { tipo: norm.event || 'UPDATE', record: norm.record, table: norm.table || null };
      }
    }

    // Raw extraction — preserves all original fields
    // Formato 1: msg.payload.data.type + msg.payload.data.record
    if (msg.payload && msg.payload.data && msg.payload.data.type && msg.payload.data.record) {
      tipo   = msg.payload.data.type;
      record = msg.payload.data.record;
      table  = msg.payload.data.table || topicTable || null;
    }
    // Formato 2: msg.payload.type + msg.payload.record
    else if (msg.payload && msg.payload.type && msg.payload.record) {
      tipo   = msg.payload.type;
      record = msg.payload.record;
      table  = msg.payload.table || topicTable || null;
    }
    // Formato 3: msg.payload.new (INSERT/UPDATE) — Supabase Realtime v2 padrão
    else if (msg.payload && msg.payload.new && Object.keys(msg.payload.new).length) {
      tipo   = msg.payload.type || 'INSERT';
      record = msg.payload.new;
      table  = topicTable || null;
    }
    // Formato 4: msg.payload.old (DELETE)
    else if (msg.payload && msg.payload.old && Object.keys(msg.payload.old).length) {
      tipo   = 'DELETE';
      record = msg.payload.old;
      table  = topicTable || null;
    }

    console.log('[REALTIME MESSAGE]', topicTable, tipo, record && record.id,
      record && record.session_id ? 'session=' + record.session_id : '');
    return { tipo: tipo, record: record, table: table };
  }

  // ── Processamento central de mensagem ─────────────────────────────────
  function _handleMessage(msg) {
    if (!msg || msg.event !== 'postgres_changes') return;

    var extracted = _extractFromMsg(msg);
    if (!extracted.tipo || !extracted.record || !extracted.record.id) return;

    // Identifica a qual tabela/canal pertence esse evento
    // pelo topic da mensagem ou pelo table extraído
    var msgTopic = msg.topic || '';
    var channel  = null;

    for (var i = 0; i < CHANNELS.length; i++) {
      var ch = CHANNELS[i];
      if (
        msgTopic.indexOf(ch.table) !== -1 ||
        (extracted.table && extracted.table.indexOf(ch.table) !== -1)
      ) {
        channel = ch;
        break;
      }
    }

    if (!channel) {
      // Fallback: tenta deduzir pelo campo table no payload
      _warn('Canal não identificado para msg:', msgTopic, extracted.table);
      return;
    }

    var key = _eventKey(channel.table, extracted.tipo, extracted.record);
    if (_seenEvents.has(key)) {
      _log('Evento duplicado ignorado:', key);
      // PA.monitor: registra evento duplicado descartado
      if (global.PA && global.PA.monitor) {
        global.PA.monitor._realtimeHook('event:duplicate', { key: key, module: 'RealtimeManager' });
      }
      return;
    }
    _markSeen(key);

    _log(channel.table + ' ' + extracted.tipo + ' id=' + extracted.record.id);
    _emit(channel.customEvent, extracted.tipo, extracted.record);
  }

  // ── Auth token ───────────────────────────────────────────────────────────
  // Tabelas com RLS (ex.: trade_messages) só entregam linhas via realtime se a
  // conexão estiver autenticada com o JWT do usuário. Sem ele, o servidor
  // inscreve o canal mas NÃO entrega as linhas privadas (cai no role anon).
  function _getAccessToken() {
    try {
      if (typeof Session !== 'undefined' && typeof Session.getAccessToken === 'function') {
        return Session.getAccessToken() || global.SUPABASE_KEY;
      }
    } catch (e) {}
    return global.SUPABASE_KEY;
  }

  // ── WebSocket Connection ───────────────────────────────────────────────
  function _connect() {
    var myRef = ++_subscribeRef;
    _destroyed = false;

    var supabaseUrl = global.SUPABASE_URL || '';
    var supabaseKey = global.SUPABASE_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      _warn('SUPABASE_URL ou SUPABASE_KEY não definidos. Realtime não iniciado.');
      return;
    }

    var wsUrl = supabaseUrl
      .replace('https://', 'wss://')
      .replace('http://',  'ws://')
      + '/realtime/v1/websocket'
      + '?apikey=' + supabaseKey
      + '&vsn=1.0.0';

    _log('Conectando WebSocket (ref=' + myRef + ')…');

    var ws;
    try {
      ws = new WebSocket(wsUrl);
      _ws = ws;
    } catch (e) {
      _warn('WebSocket não disponível:', e.message);
      return;
    }

    ws.onopen = function () {
      if (myRef !== _subscribeRef) { ws.close(); return; }
      _log('WebSocket aberto (ref=' + myRef + ') — inscrevendo canais…');
      // PA.monitor: registra abertura de WebSocket (Fase 2 Passo 5A)
      if (global.PA && global.PA.monitor) {
        // Fase 2 Passo 5A.1: apenas ws:open — byModule[mod] = true já registra presença.
        // Hook 'module' removido — causava byModule: { RealtimeManager: 2 }.
        global.PA.monitor._realtimeHook('ws:open', {
          module:    'RealtimeManager',
          url:       wsUrl,
          openedAt:  Date.now(),
        });
      }

      // Heartbeat a cada 25s para manter a conexão viva
      _heartbeatTimer = setInterval(function () {
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify({
          topic: 'phoenix',
          event: 'heartbeat',
          payload: {},
          ref: String(_msgRef++),
        }));
        // Renova o token de auth do realtime — o Session troca o JWT
        // periodicamente; sem renovar, o servidor para de entregar ao expirar.
        var tok = _getAccessToken();
        CHANNELS.forEach(function (ch) {
          ws.send(JSON.stringify({
            topic:   ch.topic,
            event:   'access_token',
            payload: { access_token: tok },
            ref:     String(_msgRef++),
          }));
        });
      }, 25000);

      // Inscreve cada canal
      CHANNELS.forEach(function (ch) {
        _log('Inscrevendo canal:', ch.topic);
        ws.send(JSON.stringify({
          topic:   ch.topic,
          event:   'phx_join',
          payload: {
            access_token: _getAccessToken(),
            config: {
              broadcast:        { self: false },
              presence:         { key: '' },
              postgres_changes: [
                { event: 'INSERT', schema: 'public', table: ch.table },
                { event: 'UPDATE', schema: 'public', table: ch.table },
                { event: 'DELETE', schema: 'public', table: ch.table },
              ],
            },
          },
          ref: String(_msgRef++),
        }));
        // PA.monitor: registra canal subscrito (Fase 2 Passo 5A)
        if (global.PA && global.PA.monitor) {
          global.PA.monitor._realtimeHook('channel', {
            channel: ch.topic,
            module:  'RealtimeManager',
          });
        }
      });
    };

    ws.onmessage = function (evt) {
      if (myRef !== _subscribeRef) return;

      var msg;
      try { msg = JSON.parse(evt.data); } catch (e) { return; }

      // Canal confirmado
      if (msg.event === 'phx_reply' && msg.payload && msg.payload.status === 'ok') {
        _wsActive = true;
        _log('Canal confirmado:', msg.topic);
        _emitStatus('connected');
        return;
      }

      // Erro de canal
      if (msg.event === 'phx_error') {
        _err('phx_error:', msg.topic, msg.payload);
        return;
      }

      // Eventos de dados
      if (msg.event === 'postgres_changes') {
        _handleMessage(msg);
      }
    };

    ws.onerror = function (err) {
      if (myRef !== _subscribeRef) return;
      _err('WebSocket erro (ref=' + myRef + '):', err.type || err);
      _emitStatus('error');
    };

    ws.onclose = function (evt) {
      if (myRef !== _subscribeRef) return;
      _log('WebSocket fechado (ref=' + myRef + ') code=' + evt.code + ' reason=' + (evt.reason || '—'));
      _wsActive = false;
      clearInterval(_heartbeatTimer);
      _heartbeatTimer = null;
      _emitStatus('disconnected');
      // PA.monitor: registra fechamento de WebSocket
      if (global.PA && global.PA.monitor) {
        global.PA.monitor._realtimeHook('ws:close', { module: 'RealtimeManager' });
      }

      if (_destroyed) return;

      // Reconexão exponencial: 5s, 10s, 20s… até 60s
      var attempt = myRef;
      var delay = Math.min(60000, 5000 * Math.pow(1.5, Math.min(attempt % 5, 4)));
      _log('Reconectando em ' + Math.round(delay / 1000) + 's…');
      // PA.monitor: registra reconexão agendada (Fase 2 Passo 5A)
      if (global.PA && global.PA.monitor) {
        global.PA.monitor.reconnects.count++;
        global.PA.monitor.reconnects.byModule['RealtimeManager'] =
          (global.PA.monitor.reconnects.byModule['RealtimeManager'] || 0) + 1;
      }
      _reconnectTimer = setTimeout(function () {
        if (myRef !== _subscribeRef) return;
        if (_destroyed) return;
        _connect();
      }, delay);
    };
  }

  function _stopInternal() {
    clearInterval(_heartbeatTimer);
    clearTimeout(_reconnectTimer);
    _heartbeatTimer = null;
    _reconnectTimer = null;
    _wsActive       = false;
    if (_ws) {
      try { _ws.close(); } catch (e) {}
      _ws = null;
    }
  }

  // ── API Pública ────────────────────────────────────────────────────────

  /**
   * Inicia o realtime global.
   * Chamado automaticamente no login — ou manualmente se necessário.
   */
  function start() {
    // Guard: evita múltiplas conexões
    if (_wsActive && _ws && _ws.readyState === WebSocket.OPEN) {
      _log('Já ativo — ignorando start() duplicado.');
      return;
    }
    _stopInternal();
    _connect();
  }

  /**
   * Para o realtime definitivamente (ex.: logout).
   */
  function stop() {
    _destroyed = true;
    _subscribeRef++;
    _stopInternal();
    _seenEvents.clear();
    _log('Parado definitivamente.');
  }

  /**
   * Retorna true se o WebSocket está conectado.
   */
  function isActive() {
    return _wsActive && _ws && _ws.readyState === WebSocket.OPEN;
  }

  // ── Bootstrap automático via Session ──────────────────────────────────
  function _bootstrap() {
    if (typeof Session === 'undefined') {
      _warn('Session não disponível — inicialização automática desativada.');
      return;
    }

    Session.onAuthChange(function (event, user) {
      if (event === 'login' && user) {
        _log('Login detectado — iniciando realtime global…');
        _destroyed = false;
        start();
      } else if (event === 'logout') {
        _log('Logout detectado — parando realtime global.');
        stop();
        _destroyed = false; // permite reiniciar no próximo login
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _bootstrap, { once: true });
  } else {
    _bootstrap();
  }

  // ── Exporta globalmente ───────────────────────────────────────────────
  global.RealtimeManager = {
    start:    start,
    stop:     stop,
    isActive: isActive,
  };

  _log('módulo carregado.');

})(window);
