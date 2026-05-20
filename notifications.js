// ============================================================
// notifications.js — v5 — DEDUPLICATION FIX
// PokeAlliance Shop
//
// CAUSAS RAIZ corrigidas nesta versão:
//
//  1. SUBSCRIBE DUPLICADO  → _realtimeActive só bloqueava se userId fosse o
//     mesmo, mas na reconexão automática o guard era bypassado em certas
//     janelas de race. Agora usa _subscribeRef (inteiro monotônico) +
//     cancelamento explícito antes de toda nova tentativa.
//
//  2. EVENTOS REALTIME DUPLICADOS  → O backend Supabase pode entregar o mesmo
//     INSERT duas vezes quando há reconexão rápida. Agora mantemos
//     _seenIds (Set) com os últimos 200 IDs recebidos para descartar dupes.
//
//  3. RECONEXÃO SEM CLEANUP  → onclose disparava setTimeout que chamava
//     startRealtime() sem fechar o WebSocket anterior, gerando dois canais
//     ativos ao mesmo tempo. Agora _stopInternal() é chamado de forma
//     síncrona antes de qualquer nova tentativa.
//
//  4. read_at ausente  → markNotificationRead agora grava read_at junto
//     com read: true para persistência definitiva no banco.
//
// Depende de: supabase-client.js, session.js
// ============================================================

const NotificationsAPI = (() => {
  'use strict';

  // ── Estado ───────────────────────────────────────────────────────────────
  let _ws             = null;       // WebSocket ativo
  let _wsActive       = false;      // canal confirmado pelo servidor
  let _currentUserId  = null;
  let _onNewCallback  = null;
  let _heartbeat      = null;
  let _reconnectTimer = null;
  let _subscribeRef   = 0;          // incrementa a cada startRealtime()
  let _destroyed      = false;      // true após stopRealtime() definitivo
  const _seenIds      = new Set();  // IDs já processados (dedup realtime)
  const SEEN_MAX      = 200;

  // ── Headers ──────────────────────────────────────────────────────────────

  function _headers() {
    const token = typeof Session !== 'undefined' ? Session.getAccessToken() : null;
    if (!token) throw new Error('Usuário não autenticado');
    return {
      'Content-Type':  'application/json',
      'apikey':        window.SUPABASE_KEY,
      'Authorization': 'Bearer ' + token,
    };
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  async function createNotification({ user_id, pedido_id, title, message, type }) {
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/rpc/create_notification`,
        {
          method:  'POST',
          headers: _headers(),
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
        console.error('[NotificationsAPI] createNotification falhou:', res.status, txt);
        return null;
      }
      return res.json();
    } catch (e) {
      console.warn('[NotificationsAPI] createNotification erro:', e.message);
      return null;
    }
  }

  /**
   * Busca notificações do usuário logado, deduplicadas por ID.
   * Nunca retorna mais de 100 registros para manter cache controlado.
   */
  async function fetchMyNotifications(limit) {
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) return [];
    limit = Math.min(limit || 30, 100);
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications` +
        `?user_id=eq.${user.id}` +
        `&order=created_at.desc` +
        `&limit=${limit}` +
        `&select=id,user_id,pedido_id,title,message,type,read,read_at,created_at`,
        { headers: _headers() }
      );
      if (!res.ok) return [];
      const rows = await res.json();
      // Deduplicação defensiva contra banco com duplicatas
      const seen = new Set();
      return (Array.isArray(rows) ? rows : []).filter(r => {
        if (!r.id || seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    } catch (e) {
      console.warn('[NotificationsAPI] fetchMyNotifications:', e.message);
      return [];
    }
  }

  async function countUnread() {
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) return 0;
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications` +
        `?user_id=eq.${user.id}&read=eq.false&select=id`,
        { headers: _headers() }
      );
      if (!res.ok) return 0;
      const rows = await res.json();
      return Array.isArray(rows) ? rows.length : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Marca uma notificação como lida — persiste read_at no banco.
   */
  async function markNotificationRead(id) {
    if (!id) return false;
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications?id=eq.${id}`,
        {
          method:  'PATCH',
          headers: { ..._headers(), 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            read:    true,
            read_at: new Date().toISOString(),
          }),
        }
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Marca TODAS as notificações do usuário como lidas.
   * Tenta RPC; fallback para PATCH direto na tabela.
   */
  async function markAllRead() {
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) return false;
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/rpc/mark_all_notifications_read`,
        { method: 'POST', headers: _headers(), body: JSON.stringify({}) }
      );
      if (res.ok) return true;
    } catch {}
    // Fallback PATCH direto
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications` +
        `?user_id=eq.${user.id}&read=eq.false`,
        {
          method:  'PATCH',
          headers: { ..._headers(), 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            read:    true,
            read_at: new Date().toISOString(),
          }),
        }
      );
      return res.ok;
    } catch {
      return false;
    }
  }

  // ── Realtime — WebSocket nativo (protocolo Phoenix) ──────────────────────
  //
  // Cada startRealtime() captura myRef = ++_subscribeRef.
  // Qualquer callback de ciclo anterior (ref desatualizada) é descartado —
  // isso impede que dois canais existam ao mesmo tempo.

  function startRealtime(userId, onNew) {
    if (!userId) return;

    // Já conectado e WS aberto para o mesmo user — não reconecta
    if (
      _wsActive &&
      _currentUserId === userId &&
      _ws &&
      _ws.readyState === WebSocket.OPEN
    ) {
      console.log('[NotificationsAPI] Realtime já ativo para', userId, '— ignorando subscribe duplicado.');
      return;
    }

    // Para o ciclo anterior ANTES de criar um novo
    _stopInternal();

    _currentUserId = userId;
    _onNewCallback = onNew;
    _destroyed     = false;
    const myRef    = ++_subscribeRef;

    const wsUrl = window.SUPABASE_URL
      .replace('https://', 'wss://')
      .replace('http://',  'ws://')
      + '/realtime/v1/websocket'
      + '?apikey=' + window.SUPABASE_KEY
      + '&vsn=1.0.0';

    let ws;
    try {
      ws = new WebSocket(wsUrl);
      _ws = ws;
    } catch (e) {
      console.warn('[NotificationsAPI] WebSocket indisponível:', e.message);
      return;
    }

    let msgRef = 1;

    ws.onopen = () => {
      if (myRef !== _subscribeRef) { ws.close(); return; }
      console.log('[NotificationsAPI] Realtime conectado (ref=' + myRef + ')');

      // Heartbeat a cada 25s
      _heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(msgRef++),
          }));
        }
      }, 25000);

      const channel = `realtime:public:notifications:user_id=eq.${userId}`;
      ws.send(JSON.stringify({
        topic:   channel,
        event:   'phx_join',
        payload: {
          config: {
            broadcast:        { self: false },
            presence:         { key: '' },
            postgres_changes: [{
              event:  'INSERT',
              schema: 'public',
              table:  'notifications',
              filter: `user_id=eq.${userId}`,
            }],
          },
        },
        ref: String(msgRef++),
      }));
    };

    ws.onmessage = (evt) => {
      if (myRef !== _subscribeRef) return; // ciclo obsoleto — descarta
      let msg;
      try { msg = JSON.parse(evt.data); } catch { return; }

      if (msg.event === 'phx_reply' && msg.payload?.status === 'ok') {
        _wsActive = true;
        console.log('[NotificationsAPI] Canal inscrito OK (ref=' + myRef + ')');
        return;
      }

      if (
        msg.event === 'postgres_changes' &&
        msg.payload?.data?.type === 'INSERT'
      ) {
        const record = msg.payload.data.record;
        if (!record || !record.id) return;

        // ── DEDUPLICAÇÃO POR ID ──────────────────────────────
        if (_seenIds.has(record.id)) {
          console.log('[NotificationsAPI] Evento duplicado descartado:', record.id);
          return;
        }
        _seenIds.add(record.id);
        if (_seenIds.size > SEEN_MAX) {
          const oldest = [..._seenIds].slice(0, 50);
          oldest.forEach(id => _seenIds.delete(id));
        }

        console.log('[NotificationsAPI] Nova notificação:', record.id, record.type);
        if (typeof _onNewCallback === 'function') _onNewCallback(record);
      }
    };

    ws.onerror = () => {
      if (myRef !== _subscribeRef) return;
      console.warn('[NotificationsAPI] Realtime erro (ref=' + myRef + ')');
    };

    ws.onclose = () => {
      if (myRef !== _subscribeRef) return;
      console.log('[NotificationsAPI] Realtime desconectado (ref=' + myRef + ')');
      _wsActive = false;
      clearInterval(_heartbeat);
      _heartbeat = null;

      if (_destroyed) return;

      // Reconecta em 12s se ainda logado
      _reconnectTimer = setTimeout(() => {
        if (myRef !== _subscribeRef) return;
        const u = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
        if (u && u.id === userId) {
          console.log('[NotificationsAPI] Reconectando realtime...');
          startRealtime(userId, _onNewCallback);
        }
      }, 12000);
    };
  }

  /** Para o WS interno (sem marcar destroyed — para reconexão). */
  function _stopInternal() {
    clearInterval(_heartbeat);
    clearTimeout(_reconnectTimer);
    _heartbeat      = null;
    _reconnectTimer = null;
    _wsActive       = false;
    if (_ws) {
      try { _ws.close(); } catch {}
      _ws = null;
    }
  }

  /** Para o realtime definitivamente (chamado no logout). */
  function stopRealtime() {
    _destroyed     = true;
    _currentUserId = null;
    _subscribeRef++;          // invalida todos os callbacks pendentes
    _stopInternal();
    _seenIds.clear();
    console.log('[NotificationsAPI] Realtime parado definitivamente.');
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
