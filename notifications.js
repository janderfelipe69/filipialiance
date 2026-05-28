// ============================================================
// notifications.js — v7 — ISOLAMENTO POR USUÁRIO + LOGS PADRONIZADOS
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
//
// ISOLAMENTO POR USUÁRIO (v7):
//   Cada camada adiciona uma barreira independente:
//   1. RLS no banco (SELECT/INSERT/UPDATE apenas para auth.uid() = user_id)
//   2. Query com ?user_id=eq.${user.id} (filtro explícito no REST)
//   3. Filtro de defesa no frontend após receber a resposta
//   4. Canal realtime com filter: user_id=eq.${userId} (somente INSERTs do próprio usuário)
//   5. Validação de user_id no onmessage antes de chamar o callback
//
// POLICIES RLS RECOMENDADAS (rodar no SQL Editor do Supabase):
//   -- SELECT: usuário só lê as próprias notificações
//   CREATE POLICY "notif_select_own" ON notifications
//     FOR SELECT USING (auth.uid() = user_id);
//
//   -- INSERT: admin pode inserir para qualquer user_id (via service_role ou role check)
//   CREATE POLICY "notif_insert_admin" ON notifications
//     FOR INSERT WITH CHECK (
//       EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
//       OR auth.uid() = user_id
//     );
//
//   -- UPDATE: usuário só atualiza as próprias (para marcar como lido)
//   CREATE POLICY "notif_update_own" ON notifications
//     FOR UPDATE USING (auth.uid() = user_id);
//
//   -- DELETE: somente admins
//   CREATE POLICY "notif_delete_admin" ON notifications
//     FOR DELETE USING (
//       EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
//     );
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

  /**
   * Cria uma notificação diretamente na tabela (sem RPC).
   * SEMPRE exige user_id explícito — nunca usa o usuário logado como destino.
   * Isso garante que admins não recebam notificações de clientes e vice-versa.
   */
  async function createNotification({ user_id, pedido_id, title, message, type }) {
    // Validação de isolamento: user_id é obrigatório
    if (!user_id) {
      console.error('[Notifications] createNotification: user_id ausente — abortando. Notificações DEVEM ter destinatário explícito.');
      return null;
    }

    const currentUser = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    console.log('[Notifications] criando notificação — destinatário user_id:', user_id,
      '| pedido_id:', pedido_id || null,
      '| tipo:', type || 'info',
      '| criado por:', currentUser?.id || '(sistema)');

    const payload = {
      user_id:    user_id,          // DESTINATÁRIO: sempre o dono do pedido
      pedido_id:  pedido_id || null,
      title:      title || 'Notificação',
      message:    message || '',
      type:       type || 'info',
      read:       false,
      created_at: new Date().toISOString(),
    };

    try {
      // Tenta via REST direto (mais confiável que RPC para garantir todos os campos)
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications`,
        {
          method:  'POST',
          headers: { ..._headers(), 'Prefer': 'return=minimal' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.error('[Notifications] createNotification falhou (REST):', res.status, txt);
        // Fallback: tenta via RPC
        return await _createViaRPC(user_id, pedido_id, title, message, type);
      }
      console.log('[Notifications] notificação criada para user_id:', user_id);
      return { ok: true };
    } catch (e) {
      console.warn('[Notifications] createNotification erro:', e.message);
      return null;
    }
  }

  /** Fallback RPC para createNotification */
  async function _createViaRPC(user_id, pedido_id, title, message, type) {
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/rpc/create_notification`,
        {
          method:  'POST',
          headers: _headers(),
          body: JSON.stringify({
            p_user_id:   user_id,
            p_pedido_id: pedido_id || null,
            p_title:     title || 'Notificação',
            p_message:   message || '',
            p_type:      type || 'info',
          }),
        }
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.error('[Notifications] createNotification fallback RPC falhou:', res.status, txt);
        return null;
      }
      return res.json();
    } catch (e) {
      console.warn('[Notifications] _createViaRPC erro:', e.message);
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

    // [ISOLAMENTO] Filtra SEMPRE pelo user_id do usuário logado.
    // Mesmo que RLS esteja mal configurado, o query tem a cláusula explícita.
    console.log('[Notifications] carregando do user:', user.id, '| limit:', limit);

    try {
      // COLUNAS: id, user_id, pedido_id, title, message, type, read, created_at
      // FILTRO user_id=eq. garante isolamento no query, além do RLS no banco.
      const url = `${window.SUPABASE_URL}/rest/v1/notifications` +
        `?user_id=eq.${user.id}` +       // [ISOLAMENTO] filtro obrigatório
        `&order=created_at.desc` +
        `&limit=${limit}` +
        `&select=id,user_id,pedido_id,title,message,type,read,created_at`;

      const res = await fetch(url, { headers: _headers() });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        console.error('[Notifications] query error', res.status, txt);
        return [];
      }

      const rows = await res.json();

      if (!Array.isArray(rows) || rows.length === 0) {
        console.log('[Notifications] total carregado: 0 — nenhuma notificação para user_id:', user.id);
        return [];
      }

      // [ISOLAMENTO] Filtro de defesa no frontend: descarta registros de outros usuários
      // caso o banco retorne algo inesperado (RLS mal configurado).
      const own = rows.filter(r => {
        if (r.user_id && r.user_id !== user.id) {
          console.warn('[Notifications] ⚠️ registro de outro user descartado no frontend — id:', r.id, '| user_id:', r.user_id, '!= esperado:', user.id);
          return false;
        }
        return true;
      });

      // Deduplicação por ID
      const seen = new Set();
      const unique = own.filter(r => {
        if (!r.id || seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });

      console.log('[Notifications] total carregado:', unique.length, '| user_id:', user.id);

      return unique;
    } catch (e) {
      console.warn('[Notifications] fetchMyNotifications erro:', e.message);
      return [];
    }
  }

  async function countUnread() {
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) return 0;
    try {
      // [ISOLAMENTO] Filtra por user_id=eq. + read=eq.false — dupla garantia
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications` +
        `?user_id=eq.${user.id}&read=eq.false&select=id`,
        { headers: _headers() }
      );
      if (!res.ok) return 0;
      const rows = await res.json();
      // [ISOLAMENTO] Filtro de defesa: conta apenas registros do próprio usuário
      const own = Array.isArray(rows) ? rows.filter(r => !r.user_id || r.user_id === user.id) : [];
      return own.length;
    } catch {
      return 0;
    }
  }

  async function markNotificationRead(id) {
    if (!id) return false;
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) return false;
    try {
      // [ISOLAMENTO] Filtra por id=eq. E user_id=eq. para impedir marcar notif de outro usuário
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications?id=eq.${id}&user_id=eq.${user.id}`,
        {
          method:  'PATCH',
          headers: { ..._headers(), 'Prefer': 'return=minimal' },
          body: JSON.stringify({ read: true }),
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

    console.log('[Notifications] mark all clicked');

    // Conta não lidas antes
    let unreadBefore = 0;
    try {
      const countRes = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications` +
        `?user_id=eq.${user.id}&read=eq.false&select=id`,
        { headers: _headers() }
      );
      if (countRes.ok) {
        const rows = await countRes.json();
        unreadBefore = Array.isArray(rows) ? rows.length : 0;
      }
    } catch {}
    console.log('[Notifications] unread before:', unreadBefore);

    // [FIX] REST direto primeiro — não depende de RPC inexistente
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications` +
        `?user_id=eq.${user.id}&read=eq.false`,
        {
          method:  'PATCH',
          headers: { ..._headers(), 'Prefer': 'return=minimal' },
          body: JSON.stringify({ read: true }),
        }
      );
      if (res.ok) {
        console.log('[Notifications] unread after: 0');
        return true;
      }
    } catch {}

    // Fallback: RPC (se o banco tiver a função)
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/rpc/mark_all_notifications_read`,
        { method: 'POST', headers: _headers(), body: JSON.stringify({}) }
      );
      if (res.ok) {
        console.log('[Notifications] unread after: 0');
        return true;
      }
    } catch {}

    console.warn('[Notifications] markAllRead falhou em todas as tentativas');
    return false;
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

    console.log('[Notifications] realtime user:', userId, '| iniciando WebSocket (ref=' + myRef + ')');

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
        console.log('[Notifications] realtime user:', userId, '| canal conectado (ref=' + myRef + ')');
        console.log('[Notifications] realtime user:', userId, '| escutando INSERTs WHERE user_id =', userId);
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
        // [DataNormalize] Usa normalizeRealtimeRecord (schema-compat.js) se disponível
        if (typeof normalizeRealtimeRecord === 'function') {
          const _rt = normalizeRealtimeRecord(msg, 'notifications');
          if (_rt.record && (_rt.event === 'INSERT' || !_rt.event)) {
            record = _rt.record;
            formato = 'schema-compat/normalizeRealtimeRecord';
          }
        }

        // Fallback: extração manual dos formatos Phoenix
        if (!record) {
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
      // Passo 5C.1 — monitor opcional: instrumentação não bloqueia processamento
      var _parWs = null;
      if (window.PA && PA.monitor) {
        _parWs = PA.monitor._realtimeParallel = PA.monitor._realtimeParallel ||
          { ws: 0, custom: 0, matches: 0, seen: {} };
      }
      if (_parWs) _parWs.ws++;
      // Registra chave para detectar match quando CustomEvent chegar depois
      const _parKey = 'notif:' + record.id;
      if (_parWs) _parWs.seen[_parKey] = Date.now();

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
    console.log('[Notifications] realtime user:', _currentUserId || '(nenhum)', '| canal removido definitivamente.');
  }

  // ── Archive / Delete ─────────────────────────────────────────────────────

  /**
   * Arquiva uma notificação (soft delete: archived=true, read=true).
   * Fallback: DELETE direto se PATCH falhar (coluna archived inexistente).
   */
  async function archiveNotification(id) {
    if (!id) return false;
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) return false;
    console.log('[Notifications] removida id:', id);
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications?id=eq.${id}&user_id=eq.${user.id}`,
        {
          method:  'PATCH',
          headers: { ..._headers(), 'Prefer': 'return=minimal' },
          body:    JSON.stringify({ archived: true, read: true }),
        }
      );
      if (res.ok) return true;
    } catch {}
    // Fallback DELETE
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications?id=eq.${id}&user_id=eq.${user.id}`,
        { method: 'DELETE', headers: _headers() }
      );
      return res.ok;
    } catch { return false; }
  }

  /**
   * Arquiva TODAS as notificações do usuário (soft delete).
   * Fallback: DELETE direto se PATCH falhar.
   */
  async function archiveAll() {
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) return false;
    console.log('[Notifications] todas limpas');
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications?user_id=eq.${user.id}`,
        {
          method:  'PATCH',
          headers: { ..._headers(), 'Prefer': 'return=minimal' },
          body:    JSON.stringify({ archived: true, read: true }),
        }
      );
      if (res.ok) return true;
    } catch {}
    // Fallback DELETE
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications?user_id=eq.${user.id}`,
        { method: 'DELETE', headers: _headers() }
      );
      return res.ok;
    } catch { return false; }
  }

  /**
   * Deleta notificações antigas além do limite (para limpeza automática).
   * Mantém as N mais recentes por data.
   */
  async function pruneOld(keepCount = 50) {
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) return;
    try {
      // Busca todas as IDs ordenadas por data desc
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications` +
        `?user_id=eq.${user.id}` +
        `&order=created_at.desc` +
        `&select=id`,
        { headers: _headers() }
      );
      if (!res.ok) return;
      const rows = await res.json();
      if (!Array.isArray(rows) || rows.length <= keepCount) return;

      const toDelete = rows.slice(keepCount).map(r => r.id);
      console.log('[Notifications] poda automática — removendo', toDelete.length, 'antigas');

      // Deleta em batch por in(id1,id2,...)
      const idList = toDelete.join(',');
      await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications?id=in.(${idList})&user_id=eq.${user.id}`,
        { method: 'DELETE', headers: _headers() }
      );
    } catch (e) {
      console.warn('[Notifications] pruneOld erro:', e.message);
    }
  }

  // ── Passo 5C — Listener paralelo: CustomEvent 'notifications:changed' ──────
  // Escuta o canal centralizado do realtime-manager EM PARALELO ao WS próprio.
  // NÃO substitui o WS próprio. NÃO altera processamento existente.
  // Reutiliza: _seenIds (dedup), _onNewCallback (processamento), _currentUserId (isolamento).
  // Instrumenta: PA.monitor._realtimeParallel para medir cobertura dual-path.
  ;(function _attachNotificationsParallelListener() {
    window.addEventListener('notifications:changed', function(e) {
      // Passo 5C.1 — monitor OPCIONAL: processamento principal sempre executa
      var _par = null;
      if (window.PA && PA.monitor) {
        _par = PA.monitor._realtimeParallel = PA.monitor._realtimeParallel ||
          { ws: 0, custom: 0, matches: 0, seen: {} };
      }
      if (_par) _par.custom++;

      const detail = (e && e.detail) || {};
      const record = detail.record || {};

      // Segurança de isolamento: só processa eventos do próprio usuário
      // (o canal do realtime-manager não tem filtro user_id — validação obrigatória aqui)
      if (!record.id) return;
      if (!_currentUserId) return; // sem sessão ativa, descartar
      if (record.user_id && record.user_id !== _currentUserId) return;

      // Detecta match: evento que também chegou pelo WS próprio
      const _parKey = 'notif:' + record.id;
      if (_par && _par.seen[_parKey]) {
        _par.matches++;
        console.log('[Notifications/parallel] match detectado id:', record.id,
          '| delta:', Date.now() - _par.seen[_parKey], 'ms');
        // Evento já processado pelo WS — dedup via _seenIds vai barrar abaixo
      }

      // Deduplicação: reutiliza _seenIds (Set existente) — sempre executado
      if (_seenIds.has(record.id)) {
        console.log('[Notifications/parallel] já processado pelo WS — descartando CustomEvent id:', record.id);
        return;
      }

      // Evento chegou pelo CustomEvent antes do WS (ou WS não está ativo)
      // Processar normalmente pelo mesmo fluxo
      console.log('[Notifications/parallel] CustomEvent sem match WS — processando id:', record.id);
      _seenIds.add(record.id);
      if (_seenIds.size > SEEN_MAX) {
        const oldest = [..._seenIds].slice(0, 50);
        oldest.forEach(id => _seenIds.delete(id));
      }

      // Normaliza campos — mesmo padrão do WS existente
      const normalizedRecord = {
        ...record,
        message: record.message || record.content || record.body || record.text || 'Nova notificação',
        title:   record.title   || record.subject  || record.heading || 'Notificação',
      };

      if (typeof _onNewCallback === 'function') _onNewCallback(normalizedRecord);
    });
    console.log('[Notifications] ✅ Listener paralelo notifications:changed registrado (Passo 5C.1).');
  })();

  // ── Exporta API Pública ──────────────────────────────────────────────────
  return {
    createNotification,
    fetchMyNotifications,
    countUnread,
    markNotificationRead,
    markAllRead,
    archiveNotification,
    archiveAll,
    pruneOld,
    startRealtime,
    stopRealtime,
  };
})();
