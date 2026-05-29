// ============================================================
// wtb-chat.js — Chat de negociação para Procuras (WTB)
// Vendedor clica "Tenho isso!" → abre sessão + chat com o comprador.
// ============================================================

;(function (global) {
  'use strict';
  if (global.WTBChat) return;

  var SB_URL = global.SUPABASE_URL || '';
  var SB_KEY = global.SUPABASE_KEY || '';

  function _jwt()  { return typeof Session !== 'undefined' && Session.getAccessToken ? Session.getAccessToken() : null; }
  function _user() { return typeof Session !== 'undefined' ? Session.getCurrentUser() : null; }
  function _toast(msg, type) { if (typeof showToast === 'function') showToast(msg, type || 'info'); }
  function _esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function _headers() {
    return { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + _jwt(), 'Content-Type': 'application/json' };
  }

  var _modalEl     = null;
  var _curSession  = null;
  var _realtimeSub = null;
  var _sending     = false;

  // ── Sessão: busca ou cria ─────────────────────────────────────
  async function _getOrCreateSession(listingId, buyerId) {
    var user = _user();
    if (!user) throw new Error('not_authenticated');

    // Busca sessão existente
    var res = await fetch(
      SB_URL + '/rest/v1/wtb_sessions?wtb_listing_id=eq.' + listingId + '&seller_id=eq.' + user.id + '&select=*',
      { headers: _headers() }
    );
    var rows = await res.json().catch(function () { return []; });
    if (Array.isArray(rows) && rows.length) return rows[0];

    // Cria nova sessão
    var ins = await fetch(SB_URL + '/rest/v1/wtb_sessions', {
      method:  'POST',
      headers: Object.assign({}, _headers(), { 'Prefer': 'return=representation' }),
      body:    JSON.stringify({ wtb_listing_id: listingId, buyer_id: buyerId, seller_id: user.id }),
    });
    if (!ins.ok) throw new Error(await ins.text());
    var data = await ins.json();
    return Array.isArray(data) ? data[0] : data;
  }

  // ── Mensagens ─────────────────────────────────────────────────
  async function _loadMessages(sessionId) {
    var res = await fetch(
      SB_URL + '/rest/v1/wtb_messages?session_id=eq.' + sessionId + '&order=created_at.asc&select=*',
      { headers: _headers() }
    );
    return await res.json().catch(function () { return []; });
  }

  function _timeAgo(iso) {
    if (!iso) return '';
    var ms = Date.now() - new Date(iso).getTime();
    if (ms < 60000) return 'agora';
    var m = Math.floor(ms / 60000);
    if (m < 60) return m + 'min';
    return Math.floor(m / 60) + 'h';
  }

  function _renderMessages(messages) {
    var list = global.document.getElementById('wtb-chat-messages');
    if (!list) return;
    var user   = _user();
    var userId = user ? user.id : null;

    if (!messages || !messages.length) {
      list.innerHTML = '<div class="wtb-chat-empty">Nenhuma mensagem ainda. Diga olá! 👋</div>';
      return;
    }

    list.innerHTML = messages.map(function (m) {
      var mine = m.sender_id === userId;
      return '<div class="wtb-chat-msg' + (mine ? ' wtb-chat-msg--mine' : '') + '">'
        + '<div class="wtb-chat-bubble">' + _esc(m.message) + '</div>'
        + '<span class="wtb-chat-time">' + _timeAgo(m.created_at) + '</span>'
        + '</div>';
    }).join('');

    list.scrollTop = list.scrollHeight;
  }

  // ── Enviar mensagem ───────────────────────────────────────────
  async function send() {
    if (!_curSession || _sending) return;
    var input = global.document.getElementById('wtb-chat-input');
    if (!input) return;
    var msg = (input.value || '').trim();
    if (!msg) return;

    _sending = true;
    var btn = global.document.getElementById('wtb-chat-send');
    if (btn) btn.disabled = true;

    try {
      var user = _user();
      if (!user) throw new Error('not_authenticated');

      var res = await fetch(SB_URL + '/rest/v1/wtb_messages', {
        method:  'POST',
        headers: Object.assign({}, _headers(), { 'Prefer': 'return=representation' }),
        body:    JSON.stringify({ session_id: _curSession.id, sender_id: user.id, message: msg }),
      });
      if (!res.ok) throw new Error(await res.text());

      input.value = '';
      // Recarrega mensagens imediatamente (realtime chega logo depois)
      var msgs = await _loadMessages(_curSession.id);
      _renderMessages(msgs);
    } catch (err) {
      _toast('Erro ao enviar mensagem.', 'error');
      console.warn('[WTBChat] send error:', err.message);
    } finally {
      _sending = false;
      if (btn) btn.disabled = false;
      if (input) input.focus();
    }
  }

  // ── Modal HTML ────────────────────────────────────────────────
  function _buildModalHtml() {
    return '<div class="mk-modal-backdrop" id="wtb-chat-backdrop">'
      + '<div class="mk-modal wtb-chat-modal" id="wtb-chat-modal" role="dialog" aria-modal="true">'
      + '<div class="mk-modal-header">'
      + '<span class="mk-modal-title">💬 Negociação</span>'
      + '<button class="mk-modal-close" onclick="WTBChat.close()" aria-label="Fechar">✕</button>'
      + '</div>'
      + '<div class="wtb-chat-body">'
      + '<div class="wtb-chat-messages" id="wtb-chat-messages">'
      + '<div class="wtb-chat-empty">Carregando mensagens...</div>'
      + '</div>'
      + '<div class="wtb-chat-footer">'
      + '<input class="mk-input wtb-chat-input" id="wtb-chat-input" type="text"'
      + ' placeholder="Digite sua mensagem..." maxlength="500">'
      + '<button class="mk-btn mk-btn--primary wtb-chat-send" id="wtb-chat-send"'
      + ' onclick="WTBChat.send()">Enviar</button>'
      + '</div>'
      + '</div>'
      + '</div>'
      + '</div>';
  }

  // ── Realtime ──────────────────────────────────────────────────
  function _subscribeRealtime(sessionId) {
    var sb = global.supabase || (global.PA && global.PA.supabase);
    if (!sb || typeof sb.channel !== 'function') return;

    if (_realtimeSub) {
      try { sb.removeChannel(_realtimeSub); } catch (_) {}
      _realtimeSub = null;
    }

    _realtimeSub = sb
      .channel('wtb-chat-' + sessionId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'wtb_messages',
        filter: 'session_id=eq.' + sessionId,
      }, async function () {
        var msgs = await _loadMessages(sessionId);
        _renderMessages(msgs);
      })
      .subscribe();
  }

  // ── Abrir chat ────────────────────────────────────────────────
  async function open(listingId, buyerId) {
    var user = _user();
    if (!user) {
      _toast('Faça login para entrar em contato.', 'info');
      if (typeof AuthModal !== 'undefined' && AuthModal.open) AuthModal.open('login');
      return;
    }
    if (user.id === buyerId) {
      _toast('Você não pode contatar a si mesmo.', 'info');
      return;
    }

    // Monta modal imediatamente (antes do fetch)
    if (!_modalEl) {
      _modalEl = global.document.createElement('div');
      global.document.body.appendChild(_modalEl);
    }
    _modalEl.style.display = '';
    _modalEl.innerHTML = _buildModalHtml();

    // Bind Enter
    var input = global.document.getElementById('wtb-chat-input');
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
      });
    }

    try {
      var session = await _getOrCreateSession(listingId, buyerId);
      _curSession = session;

      var messages = await _loadMessages(session.id);
      _renderMessages(messages);
      _subscribeRealtime(session.id);

      if (input) input.focus();
    } catch (err) {
      _toast('Erro ao abrir chat. Tente novamente.', 'error');
      console.warn('[WTBChat] open error:', err.message);
      close();
    }
  }

  // ── Fechar chat ───────────────────────────────────────────────
  function close() {
    var sb = global.supabase || (global.PA && global.PA.supabase);
    if (_realtimeSub && sb) {
      try { sb.removeChannel(_realtimeSub); } catch (_) {}
      _realtimeSub = null;
    }
    _curSession = null;
    if (_modalEl) { _modalEl.innerHTML = ''; _modalEl.style.display = 'none'; }
  }

  global.WTBChat = { open: open, close: close, send: send };
  console.log('[WTB] wtb-chat.js carregado');
}(window));
