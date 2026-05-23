// ================================================================
// SISTEMA DE AFILIADOS — FASE 3: REALTIME (affiliate-realtime.js)
// Arquivo novo. Escuta tabelas affiliate_* via WebSocket Supabase.
// Separado do realtime-manager.js existente.
// NÃO toca em pedidos, delivery_proofs ou canais existentes.
// ================================================================
;(function(global) {
  'use strict';

  const SB_URL = (global.SUPABASE_URL || '').replace(/^https/, 'wss');
  const SB_KEY = global.SUPABASE_KEY || '';

  let _ws         = null;
  let _active     = false;
  let _ref        = 0;
  let _reconnTimer = null;
  let _heartbeat  = null;
  const _seen     = new Set();

  function _log()  { console.log.apply(console,  ['[AffiliateRT]'].concat([].slice.call(arguments))); }
  function _warn() { console.warn.apply(console, ['[AffiliateRT]'].concat([].slice.call(arguments))); }

  function _affiliateId() {
    const u = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    return u && u.role === 'affiliate' ? u.id : null;
  }

  function _isAffiliate() { return !!_affiliateId(); }

  // Emite CustomEvent com payload sanitizado (sem dados de cliente)
  function _emit(eventName, type, record) {
    // Sanitiza: remove qualquer campo financeiro do cliente
    const safe = Object.assign({}, record);
    ['pedido_id', 'client_price', 'admin_fee', 'nick_jogo', 'payment_method',
     'payment_value', 'total_brl', 'subtotal_brl', 'pagamento_brl'].forEach(f => delete safe[f]);

    global.dispatchEvent(new CustomEvent(eventName, {
      detail: { event: type, record: safe },
      bubbles: false,
    }));
  }

  function _dedup(key) {
    if (_seen.has(key)) return true;
    _seen.add(key);
    if (_seen.size > 200) {
      const arr = Array.from(_seen);
      arr.slice(0, 50).forEach(k => _seen.delete(k));
    }
    return false;
  }

  function _handleMsg(msg) {
    if (!msg || msg.event !== 'postgres_changes') return;
    const payload = msg.payload || {};
    const record  = payload.record || payload.new || {};
    const tipo    = payload.type || 'UPDATE'; // INSERT | UPDATE | DELETE
    const table   = payload.table || '';

    const key = `${table}:${tipo}:${record.id}:${record.updated_at || record.created_at}`;
    if (_dedup(key)) return;

    if (table === 'affiliate_services') {
      _emit('affiliate:service_changed', tipo, record);
    } else if (table === 'affiliate_notifications') {
      _emit('affiliate:notification', tipo, record);
    } else if (table === 'affiliate_wallets') {
      _emit('affiliate:wallet_changed', tipo, record);
    }
  }

  function _subscribe() {
    const myRef = ++_ref;
    const affId = _affiliateId();
    if (!affId) return;

    const jwt = typeof Session !== 'undefined' && Session.getAccessToken
      ? Session.getAccessToken() : null;
    if (!jwt) return;

    const wsUrl = `${SB_URL}/realtime/v1/websocket?apikey=${SB_KEY}&vsn=1.0.0`;
    _ws = new WebSocket(wsUrl);

    _ws.onopen = function() {
      if (myRef !== _ref) { _ws.close(); return; }
      _active = true;
      _log('Conectado');
      global.dispatchEvent(new CustomEvent('affiliate:realtime_status',
        { detail: { status: 'connected' } }));

      // Inscreve nos canais do afiliado (filtrado por affiliate_id/claimed_by)
      const channels = [
        {
          event: 'phx_join',
          topic: `realtime:public:affiliate_services`,
          payload: {
            config: {
              broadcast: { self: false },
              postgres_changes: [{
                event: '*', schema: 'public', table: 'affiliate_services',
                // Afiliado vê apenas serviços available ou próprios (RLS já filtra)
              }]
            },
            access_token: jwt,
          },
          ref: String(++_ref),
        },
        {
          event: 'phx_join',
          topic: `realtime:public:affiliate_notifications:affiliate_id=eq.${affId}`,
          payload: {
            config: {
              broadcast: { self: false },
              postgres_changes: [{
                event: 'INSERT', schema: 'public', table: 'affiliate_notifications',
                filter: `affiliate_id=eq.${affId}`,
              }]
            },
            access_token: jwt,
          },
          ref: String(++_ref),
        },
        {
          event: 'phx_join',
          topic: `realtime:public:affiliate_wallets:affiliate_id=eq.${affId}`,
          payload: {
            config: {
              broadcast: { self: false },
              postgres_changes: [{
                event: 'UPDATE', schema: 'public', table: 'affiliate_wallets',
                filter: `affiliate_id=eq.${affId}`,
              }]
            },
            access_token: jwt,
          },
          ref: String(++_ref),
        },
      ];

      channels.forEach(ch => _ws.send(JSON.stringify(ch)));

      // Heartbeat
      _heartbeat = setInterval(function() {
        if (_ws.readyState === WebSocket.OPEN) {
          _ws.send(JSON.stringify({ event: 'heartbeat', topic: 'phoenix', payload: {}, ref: String(++_ref) }));
        }
      }, 25000);
    };

    _ws.onmessage = function(ev) {
      if (myRef !== _ref) return;
      try {
        const msg = JSON.parse(ev.data);
        _handleMsg(msg);
      } catch (_) {}
    };

    _ws.onclose = function() {
      clearInterval(_heartbeat);
      _active = false;
      if (myRef === _ref) {
        _warn('Desconectado — reconectando em 5s');
        global.dispatchEvent(new CustomEvent('affiliate:realtime_status',
          { detail: { status: 'disconnected' } }));
        _reconnTimer = setTimeout(_subscribe, 5000);
      }
    };

    _ws.onerror = function(e) {
      _warn('Erro WebSocket:', e.message || e);
    };
  }

  function start() {
    if (!_isAffiliate()) return;
    stop();
    _subscribe();
  }

  function stop() {
    ++_ref;
    clearTimeout(_reconnTimer);
    clearInterval(_heartbeat);
    if (_ws) { try { _ws.close(); } catch (_) {} _ws = null; }
    _active = false;
  }

  function isActive() { return _active; }

  global.AffiliateRealtime = { start, stop, isActive };

  // Auto-inicia quando afiliado faz login
  if (typeof Session !== 'undefined' && typeof Session.onAuthChange === 'function') {
    Session.onAuthChange(function(event) {
      if (event === 'login' && _isAffiliate()) {
        setTimeout(start, 300);
      } else if (event === 'logout') {
        stop();
      }
    });
  }

  console.log('[AffiliateRealtime] ✅ Módulo carregado.');

})(window);
