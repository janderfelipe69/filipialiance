// ============================================================
// marketplace-chat.js — Filipi Marketplace M3.1 (Hardening)
// PokeAlliance Shop
//
// CHANGES M3.1:
//   • Absolute dedup via _seenMsgIds (persists across reconnect)
//   • _messageSequenceGuard (ordering)
//   • keydown listener replaced on each open() call (no duplicates)
//   • cleanup() method for tab close / logout
//   • reconnect recovery: re-fetch history after realtime reconnect
//   • _submitting reset on page visibility restore
//   • seenMsgIds clear only on session CHANGE (not on reconnect same session)
// ============================================================

;(function (global) {
  'use strict';

  if (global.MarketplaceChat) return; // singleton

  var _log  = function () { console.log.apply(console,  ['[PA.marketplace]', '[chat]'].concat([].slice.call(arguments))); };
  var _warn = function () { console.warn.apply(console, ['[PA.marketplace ⚠]', '[chat]'].concat([].slice.call(arguments))); };

  var SB_URL = global.SUPABASE_URL || '';
  var SB_KEY = global.SUPABASE_KEY || '';

  function _jwt()  { return typeof Session !== 'undefined' && Session.getAccessToken ? Session.getAccessToken() : null; }
  function _user() { return typeof Session !== 'undefined' ? Session.getCurrentUser() : null; }
  function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _tel(cat, data) { if (global.PA && global.PA.telemetry) global.PA.telemetry.push(cat, data); }
  function _toast(msg, type) { if (typeof showToast === 'function') showToast(msg, type || 'info'); }
  function _emit(evt, payload) {
    if (global.PA && global.PA.hooks && typeof global.PA.hooks.emit === 'function') {
      try { global.PA.hooks.emit(evt, payload); } catch (_) {}
    }
  }

  // ── State ─────────────────────────────────────────────────────
  var _activeSessionId = null;
  var _activeListingId = null;
  var _seenMsgIds      = new Set();  // dedup — NOT cleared on reconnect, only on session change
  var _lastMsgCreatedAt = null;      // sequence guard: ignore older messages
  var _chatEl           = null;
  var _submitting       = false;
  var _inputHandler     = null;      // bound keydown handler (removed on re-open)
  var _realtimeConCount = 0;         // reconnect counter for chat
  var _dedupHits        = 0;

  // ── Fetch history ─────────────────────────────────────────────
  async function _fetchHistory(sessionId) {
    try {
      var res = await fetch(
        SB_URL + '/rest/v1/trade_messages?session_id=eq.' + sessionId
          + '&order=created_at.asc&limit=100&is_deleted=eq.false',
        { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + _jwt() } }
      );
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) { _warn('fetchHistory error:', e.message); return []; }
  }

  // ── Send message ──────────────────────────────────────────────
  async function sendMessage(content) {
    var user = _user();
    if (!user || !_activeSessionId) return;
    if (!content || !content.trim()) return;
    if (content.length > 500) { _toast('Mensagem muito longa (máx 500).', 'error'); return; }
    if (_submitting) return;

    _submitting = true;
    var input = _getInput();
    if (input) input.disabled = true;

    try {
      var res = await fetch(SB_URL + '/rest/v1/trade_messages', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        SB_KEY,
          'Authorization': 'Bearer ' + _jwt(),
          'Prefer':        'return=representation',
        },
        body: JSON.stringify({ session_id: _activeSessionId, sender_id: user.id, content: content.trim() }),
      });
      if (!res.ok) {
        var txt = await res.text().catch(function(){ return ''; });
        _toast(txt.includes('message_rate_limit') ? 'Aguarde antes de enviar.' : 'Erro ao enviar.', 'error');
        return;
      }
      var data = await res.json();
      var msg  = Array.isArray(data) ? data[0] : data;
      if (msg) _appendMessage(msg);
      if (input) input.value = '';
      _tel('marketplace-chat-sent', { sessionId: _activeSessionId });
      _emit('marketplace:message_received', { sessionId: _activeSessionId, msg: msg });
    } catch (e) {
      _warn('sendMessage error:', e.message);
      _toast('Erro ao enviar mensagem.', 'error');
    } finally {
      _submitting = false;
      if (input) input.disabled = false;
    }
  }

  // ── Append a single message (idempotent via _seenMsgIds) ──────
  function _appendMessage(msg) {
    if (!msg || !msg.id) return;

    // M3.1: absolute dedup — never display same message twice
    if (_seenMsgIds.has(msg.id)) { _dedupHits++; return; }
    _seenMsgIds.add(msg.id);

    // M3.1: sequence guard — ignore messages older than last seen
    if (_lastMsgCreatedAt && msg.created_at < _lastMsgCreatedAt) {
      _warn('[PA.marketplace.chat] out-of-order message ignored:', msg.id);
      return;
    }
    _lastMsgCreatedAt = msg.created_at;

    var user  = _user();
    var isOwn = user && msg.sender_id === user.id;
    var list  = _getChatList();
    if (!list) return;

    var el = global.document.createElement('div');
    el.className = 'mk-chat-msg' + (isOwn ? ' mk-chat-msg--own' : '');
    el.setAttribute('data-msg-id', _esc(msg.id));
    el.innerHTML = '<div class="mk-chat-bubble">'
      + '<span class="mk-chat-content">' + _esc(msg.content) + '</span>'
      + '<span class="mk-chat-time">' + _formatTime(msg.created_at) + '</span>'
      + '</div>';

    var nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    list.appendChild(el);
    if (nearBottom || isOwn) list.scrollTop = list.scrollHeight;

    // S13: max 200 messages visible — trim oldest lazily
    var msgs = list.querySelectorAll('.mk-chat-msg');
    if (msgs.length > 200) {
      // Remove oldest 50 (batch trim, not one by one)
      for (var t = 0; t < 50 && msgs[t]; t++) list.removeChild(msgs[t]);
    }

    _tel('marketplace-chat-received', { sessionId: _activeSessionId });
  }

  function _formatTime(isoStr) {
    if (!isoStr) return '';
    var d = new Date(isoStr);
    return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  // ── DOM helpers ────────────────────────────────────────────────
  function _getInput()    { return global.document.getElementById('mk-chat-input'); }
  function _getChatList() { return global.document.getElementById('mk-chat-list'); }

  // ── Build HTML ────────────────────────────────────────────────
  function _buildHtml() {
    return '<div class="mk-chat-panel" id="mk-chat-panel">'
      + '<div class="mk-chat-header"><span class="mk-chat-title">💬 Negociação</span>'
      + '<button class="mk-modal-close" onclick="MarketplaceChat.close()">✕</button></div>'
      + '<div class="mk-chat-list" id="mk-chat-list"></div>'
      + '<div class="mk-chat-footer">'
      + '<input class="mk-chat-input" id="mk-chat-input" type="text"'
      + ' placeholder="Mensagem... (máx 500)" maxlength="500" autocomplete="off">'
      + '<button class="mk-btn mk-btn--primary mk-btn--sm" onclick="MarketplaceChat.sendFromUI()">Enviar</button>'
      + '</div></div>';
  }

  // ── Open ──────────────────────────────────────────────────────
  async function open(sessionId, listingId) {
    if (!sessionId) return;

    // M3.1: Only clear seenMsgIds if SESSION CHANGES (not on reconnect same session)
    if (_activeSessionId !== sessionId) {
      _seenMsgIds.clear();
      _lastMsgCreatedAt = null;
    }

    _activeSessionId = sessionId;
    _activeListingId = listingId;

    if (!_chatEl) {
      _chatEl = global.document.createElement('div');
      _chatEl.id = 'mk-chat-wrap';
      global.document.body.appendChild(_chatEl);
    }
    _chatEl.innerHTML = _buildHtml();
    _chatEl.style.display = '';

    // M3.1: Remove previous keydown listener before binding new one
    var input = _getInput();
    if (input && _inputHandler) {
      input.removeEventListener('keydown', _inputHandler);
    }
    _inputHandler = function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input.value); }
    };
    if (input) {
      input.addEventListener('keydown', _inputHandler);
      input.focus();
    }

    // Load history
    var history = await _fetchHistory(sessionId);
    history.forEach(function(msg) { _appendMessage(msg); });
    _log('Chat aberto para sessão', sessionId);
  }

  // ── Close + cleanup ───────────────────────────────────────────
  function close() {
    // Remove keydown listener before wiping DOM
    var input = _getInput();
    if (input && _inputHandler) {
      input.removeEventListener('keydown', _inputHandler);
      _inputHandler = null;
    }
    if (_chatEl) {
      _chatEl.innerHTML = '';
      _chatEl.style.display = 'none'; // FIX M3.2: hide wrapper — innerHTML='' alone leaves fixed div visible
    }
    _activeSessionId  = null;
    _submitting       = false;
    _log('Chat fechado');
  }

  function sendFromUI() {
    var input = _getInput();
    if (input) sendMessage(input.value);
  }

  // ── Realtime ──────────────────────────────────────────────────
  // M3.1: reconnect recovery — if chat is open and WS reconnects,
  // re-fetch history to pick up missed messages
  var _lastReconnectTs = 0;

  function _initRealtime() {
    global.document.addEventListener('trade_messages:changed', function(e) {
      try {
        var detail = e.detail || {};
        var tipo   = detail.event;
        var record = detail.record || {};

        if (record.session_id !== _activeSessionId) return;

        console.log('[PA.marketplace.chat] realtime message:', tipo, record.id);

        if (tipo === 'INSERT' && !record.is_deleted) {
          // S2: realtime packet versioning
          var _sv = global.PA && global.PA.realtimeVersions;
          if (!_sv || _sv.shouldApply('trade_msg:' + record.id, record.created_at)) {
            _appendMessage(record);
          }
        } else if (tipo === 'UPDATE' && record.is_deleted) {
          var el = _chatEl && _chatEl.querySelector('[data-msg-id="' + record.id + '"]');
          if (el) el.innerHTML = '<div class="mk-chat-bubble mk-chat-bubble--deleted"><em>Mensagem removida</em></div>';
        }
      } catch (err) {
        _warn('realtime trade_messages error:', err.message);
      }
    });

    // M3.1: on realtime reconnect, re-fetch history for open sessions
    global.document.addEventListener('realtime:status', function(e) {
      var detail = (e && e.detail) || {};
      if (detail.status === 'connected' && _activeSessionId) {
        var now = Date.now();
        if (now - _lastReconnectTs > 5000) {
          _lastReconnectTs = now;
          _realtimeConCount++;
          _log('[PA.marketplace.chat] realtime reconnected — re-fetching history (#' + _realtimeConCount + ')');
          _fetchHistory(_activeSessionId).then(function(msgs) {
            msgs.forEach(function(msg) { _appendMessage(msg); }); // dedup will skip seen
          });
        }
      }
    });

    _log('[PA.marketplace.chat] realtime listeners registrados');
  }

  // ── Cleanup on logout ─────────────────────────────────────────
  global.document.addEventListener('DOMContentLoaded', function() {
    try {
      _initRealtime();

      // Logout cleanup
      if (typeof Session !== 'undefined' && Session.onAuthChange) {
        Session.onAuthChange(function() {
          if (!_user()) { close(); }
        });
      }

      // S5: use safeBind for visibility listener
      var _bindFn = (global.PA && global.PA.listeners) ? global.PA.listeners.safeBind : function(el,t,fn){ el.addEventListener(t,fn); };
      _bindFn(global.document, 'visibilitychange', function() {
        if (global.document.visibilityState === 'visible') {
          _submitting = false;
          var input = _getInput();
          if (input) input.disabled = false;
        }
      }, 'mk-chat:visibility', 'marketplace-chat');

      // M3.2: register lifecycle cleanup
      if (global.PA && global.PA.lifecycle) {
        global.PA.lifecycle.registerCleanup('marketplace-chat', function() { close(); });
      }

      _log('marketplace-chat.js M3.1 pronto');
    } catch (err) {
      _warn('Erro na inicialização do chat:', err.message);
    }
  });

  // ── Public API ────────────────────────────────────────────────
  global.MarketplaceChat = {
    open:        open,
    close:       close,
    sendMessage: sendMessage,
    sendFromUI:  sendFromUI,
    // Debug
    getStats: function() {
      return {
        activeSessionId:  _activeSessionId,
        seenMsgCount:     _seenMsgIds.size,
        dedupHits:        _dedupHits,
        reconnectCount:   _realtimeConCount,
        submitting:       _submitting,
      };
    },
  };

}(window));
