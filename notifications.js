// ============================================================
// notifications.js — v6 — DEBUG + REALTIME FIX
// PokeAlliance Shop
//
// CAUSAS RAIZ IDENTIFICADAS E CORRIGIDAS NESTA VERSÃO:
//
//  [BUG A] PAYLOAD REALTIME COM ESTRUTURA INCORRETA
//    O WebSocket Phoenix (vsn=1.0.0) pode entregar o INSERT em
//    3 formatos diferentes dependendo da versão do Supabase Realtime:
//      Formato 1: msg.payload.data.record  (mais comum)
//      Formato 2: msg.payload.record       (phoenix direto)
//      Formato 3: msg.payload.new          (alguns builds)
//    A v5 só checava formato 1. Se o servidor enviar formato 2 ou 3,
//    o evento é silenciosamente descartado → painel fica vazio.
//
//  [BUG B] TABELA SEM REALTIME HABILITADO NO DASHBOARD
//    O badge incrementa porque usa REST (countUnread via fetch normal).
//    Mas o WebSocket não recebe nada porque o Supabase precisa que
//    Realtime esteja HABILITADO explicitamente para a tabela
//    (Table Editor → Replication → notifications → toggle ON).
//    Agora emite warning claro quando phx_join responde ok mas
//    nenhum INSERT chega.
//
//  [BUG C] RACE CONDITION NO fetchMyNotifications
//    Se o dropdown abre ANTES do JWT estar pronto (Session.init ainda
//    assíncrono), _headers() lança "Usuário não autenticado" e retorna [].
//    Agora aguarda Session.ready() antes de fazer o fetch.
//
//  [BUG D] FALLBACK DE CAMPOS
//    renderNotifications() usava apenas n.title e n.message.
//    Inserções via _insertNotification (orders-admin.js) gravam
//    { title, message } — correto. Mas se vier via RPC ou outro
//    path com campo diferente, o card ficava vazio. Adicionado
//    fallback: message || content || body || text.
//
// Depende de: supabase-client.js, session.js
// ============================================================

const NotificationsAPI = (() => {
  'use strict';

  // ── Estado ───────────────────────────────────────────────────────────────
  let _ws             = null;
  let _wsActive       = false;
  let _currentUserId  = null;
  let _onNewCallback  = null;
  let _heartbeat      = null;
  let _reconnectTimer = null;
  let _subscribeRef   = 0;
  let _destroyed      = false;
  const _seenIds      = new Set();
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
   * [FIX C] Aguarda Session.ready() antes de tentar usar o JWT.
   */
  async function fetchMyNotifications(limit) {
    // [FIX C] Garante JWT disponível antes de qualquer fetch
    if (typeof Session !== 'undefined' && typeof Session.ready === 'function') {
      try { await Session.ready(); } catch (_) {}
    }

    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) {
      console.warn('[Notifications] fetchMyNotifications: usuário não logado — retornando []');
      return [];
    }

    limit = Math.min(limit || 30, 100);

    console.log('[Notifications] Buscando para user_id:', user.id, '| limit:', limit);

    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications` +
        `?user_id=eq.${user.id}` +
        `&order=created_at.desc` +
        `&limit=${limit}` +
        `&select=id,user_id,pedido_id,title,message,type,read,read_at,created_at`,
        { headers: _headers() }
      );

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.error('[Notifications] HTTP', res.status, txt);
        return [];
      }

      const rows = await res.json();

      // ── LOG RAW obrigatório ────────────────────────────────────────────
      console.log('[Notifications] RAW:', rows);

      if (!Array.isArray(rows) || rows.length === 0) {
        console.log('[Notifications] Banco retornou 0 registros para este user_id.');
        console.log('[Notifications] → Verifique: a notificação foi inserida com user_id =', user.id, '?');
        return [];
      }

      // Deduplicação defensiva
      const seen = new Set();
      const unique = rows.filter(r => {
        if (!r.id || seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });

      console.log('[Notifications] Renderizando:', unique);

      return unique;
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
  // [FIX A] Suporta 3 formatos de payload do Supabase Realtime:
  //   Formato 1 (mais comum): msg.payload.data.type + msg.payload.data.record
  //   Formato 2 (phoenix raw): msg.payload.type + msg.payload.record
  //   Formato 3 (alguns builds): msg.payload.new

  function startRealtime(userId, onNew) {
    if (!userId) return;

    if (
      _wsActive &&
      _currentUserId === userId &&
      _ws &&
      _ws.readyState === WebSocket.OPEN
    ) {
      console.log('[Realtime] Já ativo para', userId, '— ignorando subscribe duplicado.');
      return;
    }

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

    console.log('[Realtime] Iniciando WebSocket (ref=' + myRef + ') para user_id:', userId);

    let ws;
    try {
      ws = new WebSocket(wsUrl);
      _ws = ws;
    } catch (e) {
      console.warn('[Realtime] WebSocket indisponível:', e.message);
      return;
    }

    let msgRef = 1;

    ws.onopen = () => {
      if (myRef !== _subscribeRef) { ws.close(); return; }
      console.log('[Realtime] ✅ WebSocket conectado (ref=' + myRef + ')');

      _heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(msgRef++),
          }));
        }
      }, 25000);

      const channel = `realtime:public:notifications:user_id=eq.${userId}`;
      console.log('[Realtime] Inscrevendo canal:', channel);

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
      if (myRef !== _subscribeRef) return;

      let msg;
      try { msg = JSON.parse(evt.data); } catch { return; }

      // Log de todos os eventos (pode remover em produção após diagnóstico)
      console.log('[Realtime] Evento recebido:', JSON.stringify({
        event:   msg.event,
        topic:   msg.topic,
        payload: msg.payload,
      }));

      // Inscrição confirmada
      if (msg.event === 'phx_reply' && msg.payload?.status === 'ok') {
        _wsActive = true;
        console.log('[Realtime] ✅ Canal inscrito com sucesso (ref=' + myRef + ')');
        console.log('[Realtime] 📡 Aguardando INSERTs em public.notifications WHERE user_id =', userId);
        console.log('%c[Realtime] ⚠️  CHECKLIST SE NADA CHEGAR:', 'color:orange;font-weight:bold');
        console.log('  1. Supabase Dashboard → Table Editor → notifications → Enable Realtime (toggle)');
        console.log('  2. Supabase Dashboard → Database → Replication → supabase_realtime publication');
        console.log('  3. RLS: o admin precisa ter INSERT na tabela notifications');
        console.log('  4. Confirme user_id do INSERT = ' + userId);
        return;
      }

      // Erro no canal
      if (msg.event === 'phx_error') {
        console.error('[Realtime] ❌ phx_error — canal rejeitado:', msg.payload);
        return;
      }

      // ── [FIX A] Detecta INSERT nos 3 formatos possíveis ───────────────
      let record = null;
      let formato = null;

      if (msg.event === 'postgres_changes') {
        // Formato 1: .payload.data.record
        if (msg.payload?.data?.type === 'INSERT' && msg.payload?.data?.record) {
          record  = msg.payload.data.record;
          formato = 'payload.data.record';
        }
        // Formato 2: .payload.record (sem wrapper .data)
        else if (msg.payload?.type === 'INSERT' && msg.payload?.record) {
          record  = msg.payload.record;
          formato = 'payload.record';
        }
        // Formato 3: .payload.new
        else if (msg.payload?.new && Object.keys(msg.payload.new).length) {
          record  = msg.payload.new;
          formato = 'payload.new';
        }
      }

      if (!record) return;

      console.log('[Realtime] 📥 INSERT detectado (formato=' + formato + '):', record);

      if (!record.id) {
        console.warn('[Realtime] Record sem ID — ignorando:', record);
        return;
      }

      // Valida user_id para evitar vazar dados entre usuários
      if (record.user_id && record.user_id !== userId) {
        console.warn('[Realtime] ⚠️  user_id do record (' + record.user_id + ') ≠ usuário logado (' + userId + ') — descartado');
        return;
      }

      // Deduplicação
      if (_seenIds.has(record.id)) {
        console.log('[Realtime] Duplicado ignorado:', record.id);
        return;
      }
      _seenIds.add(record.id);
      if (_seenIds.size > SEEN_MAX) {
        const oldest = [..._seenIds].slice(0, 50);
        oldest.forEach(id => _seenIds.delete(id));
      }

      // [FIX D] Normaliza campos — fallback para múltiplos nomes
      const normalizedRecord = {
        ...record,
        message: record.message || record.content || record.body || record.text || 'Nova notificação',
        title:   record.title   || record.subject || record.heading || 'Notificação',
      };

      console.log('[Realtime] 🔔 Notificação normalizada:', normalizedRecord);

      if (typeof _onNewCallback === 'function') _onNewCallback(normalizedRecord);
    };

    ws.onerror = (err) => {
      if (myRef !== _subscribeRef) return;
      console.error('[Realtime] ❌ WebSocket erro (ref=' + myRef + '):', err);
    };

    ws.onclose = (evt) => {
      if (myRef !== _subscribeRef) return;
      console.log('[Realtime] Conexão fechada (ref=' + myRef + ') | code:', evt.code, '| reason:', evt.reason || '(sem motivo)');
      _wsActive = false;
      clearInterval(_heartbeat);
      _heartbeat = null;

      if (_destroyed) return;

      _reconnectTimer = setTimeout(() => {
        if (myRef !== _subscribeRef) return;
        const u = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
        if (u && u.id === userId) {
          console.log('[Realtime] Reconectando...');
          startRealtime(userId, _onNewCallback);
        }
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
      try { _ws.close(); } catch {}
      _ws = null;
    }
  }

  function stopRealtime() {
    _destroyed     = true;
    _currentUserId = null;
    _subscribeRef++;
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
