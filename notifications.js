// ============================================================
// notifications.js — Sistema de Notificações Realtime
// PokeAlliance Shop
//
// Responsabilidades:
//   - Conexão Realtime com Supabase (WebSocket)
//   - Escuta INSERTs na tabela public.notifications
//   - Dispara toast e atualiza sininho automaticamente
//   - CRUD de notificações (fetch, mark read, mark all read)
//   - Helper createNotification() para admins
//
// Depende de: supabase-client.js, session.js
// Carregue ANTES de orders-notifications.js
// ============================================================

const NotificationsAPI = (() => {
  'use strict';

  // ── Estado ───────────────────────────────────────────────────────────────
  let _realtimeWs     = null;   // WebSocket nativo
  let _realtimeActive = false;
  let _currentUserId  = null;
  let _onNewCallback  = null;   // chamado quando chega notificação nova

  // ── Headers ──────────────────────────────────────────────────────────────

  function _getHeaders() {
    const token = typeof Session !== 'undefined' ? Session.getAccessToken() : null;
    if (!token) throw new Error('Usuário não autenticado');
    return {
      'Content-Type':  'application/json',
      'apikey':        window.SUPABASE_KEY,
      'Authorization': 'Bearer ' + token,
    };
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  /**
   * Cria notificação via RPC (apenas admins).
   * O banco valida o role — não há bypass possível pelo frontend.
   */
  async function createNotification({ user_id, pedido_id, title, message, type }) {
    const res = await fetch(
      `${window.SUPABASE_URL}/rest/v1/rpc/create_notification`,
      {
        method: 'POST',
        headers: _getHeaders(),
        body: JSON.stringify({
          p_user_id:   user_id,
          p_pedido_id: pedido_id || null,
          p_title:     title,
          p_message:   message || '',
          p_type:      type || 'info',
        }),
      }
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error('[Notifications] createNotification falhou:', res.status, txt);
      return null;
    }
    return res.json(); // retorna o uuid da notificação criada
  }

  /**
   * Busca as notificações do usuário logado (mais recentes primeiro).
   */
  async function fetchMyNotifications(limit) {
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) return [];
    limit = limit || 20;
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications` +
        `?user_id=eq.${user.id}&order=created_at.desc&limit=${limit}`,
        { headers: _getHeaders() }
      );
      if (!res.ok) return [];
      return res.json();
    } catch (e) {
      console.warn('[Notifications] fetchMyNotifications:', e.message);
      return [];
    }
  }

  /**
   * Conta notificações não lidas do usuário logado.
   */
  async function countUnread() {
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) return 0;
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications` +
        `?user_id=eq.${user.id}&read=eq.false&select=id`,
        { headers: _getHeaders() }
      );
      if (!res.ok) return 0;
      const rows = await res.json();
      return Array.isArray(rows) ? rows.length : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Marca uma notificação como lida.
   */
  async function markNotificationRead(id) {
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: { ..._getHeaders(), 'Prefer': 'return=minimal' },
          body: JSON.stringify({ read: true }),
        }
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Marca TODAS as notificações do usuário logado como lidas (via RPC).
   */
  async function markAllRead() {
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/rpc/mark_all_notifications_read`,
        {
          method: 'POST',
          headers: _getHeaders(),
          body: JSON.stringify({}),
        }
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  // ── Realtime via WebSocket nativo ────────────────────────────────────────
  //
  // O SDK Supabase JS v2 não está disponível aqui (projeto usa REST direto).
  // Usamos o protocolo Phoenix/WebSocket do Supabase Realtime manualmente.
  // Ref: https://supabase.com/docs/guides/realtime/protocol

  function startRealtime(userId, onNew) {
    if (_realtimeActive && _currentUserId === userId) return;
    stopRealtime();

    _currentUserId = userId;
    _onNewCallback = onNew;

    const wsUrl = window.SUPABASE_URL
      .replace('https://', 'wss://')
      .replace('http://', 'ws://')
      + '/realtime/v1/websocket'
      + '?apikey=' + window.SUPABASE_KEY
      + '&vsn=1.0.0';

    try {
      _realtimeWs = new WebSocket(wsUrl);
    } catch (e) {
      console.warn('[Notifications] WebSocket indisponível:', e.message);
      return;
    }

    let _heartbeatInterval = null;
    let _joinRef = 1;

    _realtimeWs.onopen = () => {
      console.log('[Notifications] Realtime conectado.');
      _realtimeActive = true;

      // Heartbeat a cada 30s (exigido pelo Phoenix)
      _heartbeatInterval = setInterval(() => {
        if (_realtimeWs && _realtimeWs.readyState === WebSocket.OPEN) {
          _realtimeWs.send(JSON.stringify({
            topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(_joinRef++)
          }));
        }
      }, 30000);

      // Subscribe no canal da tabela notifications filtrado pelo user_id
      const channel = `realtime:public:notifications:user_id=eq.${userId}`;
      _realtimeWs.send(JSON.stringify({
        topic:   channel,
        event:   'phx_join',
        payload: {
          config: {
            broadcast:  { self: false },
            presence:   { key: '' },
            postgres_changes: [
              {
                event:  'INSERT',
                schema: 'public',
                table:  'notifications',
                filter: `user_id=eq.${userId}`,
              }
            ],
          },
        },
        ref: String(_joinRef++),
      }));
    };

    _realtimeWs.onmessage = (evt) => {
      let msg;
      try { msg = JSON.parse(evt.data); } catch { return; }

      // phx_reply = confirmação do join
      if (msg.event === 'phx_reply' && msg.payload && msg.payload.status === 'ok') {
        console.log('[Notifications] Canal inscrito com sucesso.');
        return;
      }

      // postgres_changes = novo registro na tabela
      if (
        msg.event === 'postgres_changes' &&
        msg.payload &&
        msg.payload.data &&
        msg.payload.data.type === 'INSERT'
      ) {
        const record = msg.payload.data.record;
        if (record && typeof _onNewCallback === 'function') {
          _onNewCallback(record);
        }
      }
    };

    _realtimeWs.onerror = (e) => {
      console.warn('[Notifications] Realtime erro:', e);
    };

    _realtimeWs.onclose = () => {
      console.log('[Notifications] Realtime desconectado.');
      _realtimeActive = false;
      clearInterval(_heartbeatInterval);
      // Reconecta em 10s se o usuário ainda estiver logado
      setTimeout(() => {
        const u = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
        if (u && u.id === userId) {
          console.log('[Notifications] Tentando reconectar Realtime...');
          startRealtime(userId, _onNewCallback);
        }
      }, 10000);
    };
  }

  function stopRealtime() {
    if (_realtimeWs) {
      try { _realtimeWs.close(); } catch {}
      _realtimeWs = null;
    }
    _realtimeActive = false;
    _currentUserId  = null;
  }

  // ── Exporta API Pública ──────────────────────────────────────────────────
  return {
    createNotification,
    fetchMyNotifications,
    countUnread,
    markNotificationRead,
    markAllRead,
    startRealtime,
    stopRealtime,
  };
})();
