// ============================================================
// marketplace-chat.js — Filipi Marketplace M4.1
// PokeAlliance Shop
//
// Janela de chat DRAGGABLE multi-instância.
// Usa MarketplaceChannels para receber mensagens realtime.
// Optimistic: append local ANTES do INSERT no banco.
// Dedup via seenIds para ignorar o echo do realtime.
// ============================================================

;(function (global) {
  'use strict';

  if (global.MarketplaceChat) return;

  var SB_URL = global.SUPABASE_URL || '';
  var SB_KEY = global.SUPABASE_KEY || '';

  function _jwt()  { return typeof Session!=='undefined'&&Session.getAccessToken?Session.getAccessToken():null; }
  function _user() { return typeof Session!=='undefined'?Session.getCurrentUser():null; }
  function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _tel(c,d){ if(global.PA&&global.PA.telemetry) global.PA.telemetry.push(c,d); }
  function _toast(m,t){ if(typeof showToast==='function') showToast(m,t||'info'); }

  // ── Window registry (sessionId → ChatWindow) ─────────────────
  var _windows = {};

  // ── ChatWindow ───────────────────────────────────────────────
  function ChatWindow(sessionId, listingId, opts) {
    opts = opts || {};
    this.sessionId   = sessionId;
    this.listingId   = listingId;
    this.listingName = opts.listingName || '—';
    this.buyerName   = opts.buyerName   || '—';
    this.isSeller    = !!opts.isSeller;
    this.el          = null;
    this.minimized   = false;
    this.seenIds     = new Set();
    this.page        = 0;
    this.allLoaded   = false;
    this.submitting  = false;
    this._realtimeHandler = null;
    // Position: offset per window count to avoid overlap
    var offset = Object.keys(_windows).length;
    this._x = opts.x || Math.min(80 + offset * 340, global.innerWidth - 340 || 80);
    this._y = opts.y || Math.max(80, (global.innerHeight || 600) - 480 - offset * 20);
    this._build();
  }

  ChatWindow.prototype._build = function() {
    var self = this;
    var el = global.document.createElement('div');
    el.className = 'mk-cw';
    el.id = 'mk-cw-' + self.sessionId.slice(0,8);
    el.setAttribute('data-session', self.sessionId);
    el.style.cssText = 'left:' + self._x + 'px;top:' + self._y + 'px';
    el.innerHTML = self._html();
    global.document.body.appendChild(el);
    self.el = el;
    self._bindDrag();
    self._bindUI();
    self._registerRealtime();
    self._loadHistory(true);
    self._markRead();
    console.log('[subscription create] ChatWindow registered for session', self.sessionId);
  };

  ChatWindow.prototype._html = function() {
    var isSeller = this.isSeller;
    var title = isSeller ? ('💬 ' + _esc(this.buyerName)) : ('💬 ' + _esc(this.listingName));
    return '<div class="mk-cw-header">'
      + '<div class="mk-cw-drag-handle"><span class="mk-cw-title">' + title + '</span></div>'
      + '<div class="mk-cw-controls">'
      +   '<button class="mk-cw-min" title="Minimizar">—</button>'
      +   '<button class="mk-cw-close" title="Fechar">✕</button>'
      + '</div>'
      + '</div>'
      + '<div class="mk-cw-body">'
      +   '<div class="mk-cw-load-more" style="display:none">⬆ Carregar mais</div>'
      +   '<div class="mk-cw-msgs"></div>'
      + '</div>'
      + '<div class="mk-cw-footer">'
      + (isSeller
        ? '<div class="mk-cw-actions">'
          + '<button class="mk-btn mk-btn--ghost mk-btn--sm mk-cw-cancel-btn">✕ Cancelar</button>'
          + '<button class="mk-btn mk-btn--primary mk-btn--sm mk-cw-sold-btn">🏷 Venda Efetuada</button>'
          + '</div>'
        : '<div class="mk-cw-actions">'
          + '<button class="mk-btn mk-btn--ghost mk-btn--sm mk-cw-cancel-btn">✕ Cancelar negociação</button>'
          + '</div>')
      + '<div class="mk-cw-input-row">'
      +   '<input class="mk-chat-input mk-cw-input" type="text" maxlength="500" placeholder="Mensagem...">'
      +   '<button class="mk-btn mk-btn--primary mk-btn--sm mk-cw-send">Enviar</button>'
      + '</div>'
      + '</div>';
  };

  ChatWindow.prototype._bindDrag = function() {
    var self = this;
    var handle = self.el.querySelector('.mk-cw-drag-handle');
    var isDrag = false, sx, sy, ox, oy;
    handle.addEventListener('mousedown', function(e) {
      if (e.target.tagName === 'BUTTON') return;
      isDrag = true; sx = e.clientX; sy = e.clientY;
      ox = parseInt(self.el.style.left)||0;
      oy = parseInt(self.el.style.top)||0;
      global.document.body.style.userSelect = 'none';
    });
    global.document.addEventListener('mousemove', function(e) {
      if (!isDrag) return;
      self._x = Math.max(0, ox + e.clientX - sx);
      self._y = Math.max(0, oy + e.clientY - sy);
      self.el.style.left = self._x + 'px';
      self.el.style.top  = self._y + 'px';
    });
    global.document.addEventListener('mouseup', function() {
      if (isDrag) { isDrag = false; global.document.body.style.userSelect = ''; }
    });
  };

  ChatWindow.prototype._bindUI = function() {
    var self = this;
    var q = function(sel) { return self.el.querySelector(sel); };

    q('.mk-cw-min').addEventListener('click', function() { self.toggleMinimize(); });
    q('.mk-cw-close').addEventListener('click', function() { self.destroy(); });
    q('.mk-cw-send').addEventListener('click', function() { self._sendFromInput(); });

    var input = q('.mk-cw-input');
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); self._sendFromInput(); }
    });

    var cancelBtn = q('.mk-cw-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', function() { self._cancel(); });

    var soldBtn = q('.mk-cw-sold-btn');
    if (soldBtn) soldBtn.addEventListener('click', function() { self._sold(); });

    var loadMore = q('.mk-cw-load-more');
    if (loadMore) loadMore.addEventListener('click', function() { self._loadHistory(false); });
  };

  ChatWindow.prototype._registerRealtime = function() {
    var self = this;
    var key = 'messages:' + self.sessionId;

    self._realtimeHandler = function(event, record) {
      console.log('[CHAT RX]', event, record);
      if (event !== 'INSERT') return;
      self.appendMessage(record);
    };

    if (global.MarketplaceChannels) {
      global.MarketplaceChannels.register(key, self._realtimeHandler);
      console.log('[CHAT REGISTER]', self.sessionId);
    } else {
      console.warn('[CHAT REGISTER] MarketplaceChannels not ready for', self.sessionId);
    }
  };

  ChatWindow.prototype._unregisterRealtime = function() {
    if (global.MarketplaceChannels && this._realtimeHandler) {
      global.MarketplaceChannels.unregister('messages:' + this.sessionId, this._realtimeHandler);
      this._realtimeHandler = null;
    }
  };

  // ── Send message with OPTIMISTIC append ──────────────────────
  ChatWindow.prototype._sendFromInput = function() {
    var input = this.el && this.el.querySelector('.mk-cw-input');
    if (input && input.value.trim()) this.send(input.value.trim());
  };

  ChatWindow.prototype.send = async function(content) {
    var self = this;
    if (self.submitting || !content) return;
    var user = _user(); if (!user) return;
    self.submitting = true;

    // 1. Generate optimistic temp ID
    var tempId = 'opt_' + Date.now() + '_' + Math.random().toString(36).slice(2);

    // 2. Append locally BEFORE hitting the bank (< 1ms UX)
    var tempMsg = {
      id:         tempId,
      session_id: self.sessionId,
      sender_id:  user.id,
      content:    content,
      body:       content,
      created_at: new Date().toISOString(),
      _optimistic: true,
    };
    self.appendMessage(tempMsg);

    var input = self.el && self.el.querySelector('.mk-cw-input');
    if (input) input.value = '';

    try {
      var res = await fetch(SB_URL + '/rest/v1/trade_messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SB_KEY,
          'Authorization': 'Bearer ' + _jwt(),
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({ session_id: self.sessionId, sender_id: user.id, content: content }),
      });

      if (!res.ok) {
        var errText = await res.text().catch(function(){return '';});
        console.error('[trade message] send error', { status: res.status, body: errText });
        // Rollback: mark temp message as failed
        var tempEl = self.el && self.el.querySelector('[data-msg-id="' + tempId + '"]');
        if (tempEl) tempEl.classList.add('mk-cw-msg--failed');
        _toast(errText.includes('rate_limit') ? 'Aguarde antes de enviar.' : 'Erro ao enviar.', 'error');
        return;
      }

      var data = await res.json();
      var realMsg = Array.isArray(data) ? data[0] : data;

      if (realMsg && realMsg.id) {
        // Replace temp element with real ID so realtime echo gets deduped
        self.seenIds.add(realMsg.id);
        var tempEl2 = self.el && self.el.querySelector('[data-msg-id="' + tempId + '"]');
        if (tempEl2) tempEl2.setAttribute('data-msg-id', realMsg.id);
        _tel('mk-chat-sent', { sessionId: self.sessionId });
      }
    } catch(e) {
      console.error('[trade message] send exception:', e.message);
      _toast('Erro ao enviar mensagem.', 'error');
    } finally {
      self.submitting = false;
      if (input) input.disabled = false;
    }
  };

  ChatWindow.prototype.appendMessage = function(msg) {
    if (!msg || !msg.id) return;
    console.log('[DEDUP CHECK]', msg.id, this.seenIds.has(msg.id));
    if (this.seenIds.has(msg.id)) return;
    this.seenIds.add(msg.id);

    var user  = _user();
    var isOwn = user && msg.sender_id === user.id;
    var msgs  = this.el && this.el.querySelector('.mk-cw-msgs');
    if (!msgs) return;

    var nearBottom = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 100;

    var el = global.document.createElement('div');
    el.className = 'mk-cw-msg' + (isOwn ? ' mk-cw-msg--own' : '') + (msg._optimistic ? ' mk-cw-msg--sending' : '');
    el.setAttribute('data-msg-id', msg.id);
    el.innerHTML = '<div class="mk-chat-bubble">'
      + '<span class="mk-chat-content">' + _esc(msg.content || msg.body || '') + '</span>'
      + '<span class="mk-chat-time">' + _fmt(msg.created_at) + '</span>'
      + '</div>';
    msgs.appendChild(el);

    if (nearBottom || isOwn) msgs.scrollTop = msgs.scrollHeight;

    // Trim DOM to 200 messages max
    var all = msgs.querySelectorAll('.mk-cw-msg');
    if (all.length > 200) {
      for (var i = 0; i < 30; i++) if (all[i]) msgs.removeChild(all[i]);
    }

    // If window is visible, mark as read
    if (!this.minimized) this._markRead();
  };

  ChatWindow.prototype._loadHistory = async function(initial) {
    var self = this;
    if (self.allLoaded && !initial) return;
    var jwt = _jwt(); if (!jwt) return;

    var offset = initial ? 0 : self.page * 30;
    var limit  = 30;

    try {
      var res = await fetch(
        SB_URL + '/rest/v1/trade_messages'
          + '?session_id=eq.' + self.sessionId
          + '&is_deleted=eq.false'
          + '&order=created_at.desc'
          + '&limit=' + limit
          + '&offset=' + offset,
        { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + jwt } }
      );
      if (!res.ok) return;
      var data = await res.json();
      var msgs = Array.isArray(data) ? data.reverse() : [];

      if (msgs.length < limit) self.allLoaded = true;
      if (initial && !msgs.length) {
        var lm = self.el && self.el.querySelector('.mk-cw-load-more');
        if (lm) lm.style.display = 'none';
        return;
      }

      // Prepend: save scroll position, insert before existing, restore
      var msgContainer = self.el && self.el.querySelector('.mk-cw-msgs');
      var prevHeight = msgContainer ? msgContainer.scrollHeight : 0;

      msgs.forEach(function(m) { self.appendMessage(m); });

      if (!initial && msgContainer) {
        // Maintain scroll position after prepend
        msgContainer.scrollTop = msgContainer.scrollHeight - prevHeight;
      }
      if (initial && msgContainer) {
        msgContainer.scrollTop = msgContainer.scrollHeight;
      }

      self.page++;
      var lm = self.el && self.el.querySelector('.mk-cw-load-more');
      if (lm) lm.style.display = self.allLoaded ? 'none' : '';
    } catch(e) {
      console.error('[trade message] loadHistory error:', e.message);
    }
  };

  ChatWindow.prototype._markRead = async function() {
    var jwt = _jwt(); if (!jwt) return;
    fetch(SB_URL + '/rest/v1/rpc/rpc_mark_session_read', {
      method: 'POST',
      headers: { 'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+jwt },
      body: JSON.stringify({ p_session_id: this.sessionId }),
    }).then(function() {
      if (typeof MarketplaceInbox !== 'undefined') MarketplaceInbox.refresh();
    }).catch(function(){});
  };

  ChatWindow.prototype._cancel = async function() {
    var self = this;
    if (!global.confirm('Cancelar esta negociação?')) return;
    try {
      var res = await fetch(SB_URL + '/rest/v1/rpc/rpc_cancel_negotiation', {
        method: 'POST',
        headers: { 'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+_jwt() },
        body: JSON.stringify({ p_session_id: self.sessionId }),
      });
      var raw = await res.text();
      var data = null; try { data = JSON.parse(raw); } catch(_){}
      if (data && data.success) {
        _toast('Negociação cancelada.', 'info');
        self.destroy();
        if (typeof MarketplaceInbox !== 'undefined') MarketplaceInbox.refresh();
        if (typeof MarketplaceTrade !== 'undefined') MarketplaceTrade.refreshBadge(self.listingId);
      } else {
        console.error('[trade session] cancel error:', raw);
        _toast((data&&data.error)||'Erro ao cancelar.', 'error');
      }
    } catch(e) { _toast('Erro ao cancelar.', 'error'); }
  };

  ChatWindow.prototype._sold = async function() {
    var self = this;
    var listingName = self.listingName;
    var buyerName   = self.buyerName;
    if (!global.confirm('Confirmar venda de "' + listingName + '" para ' + buyerName + '?\n\nTodas as outras negociações serão fechadas.')) return;

    try {
      var res = await fetch(SB_URL + '/rest/v1/rpc/rpc_mark_sold', {
        method: 'POST',
        headers: { 'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+_jwt() },
        body: JSON.stringify({ p_session_id: self.sessionId }),
      });
      var raw = await res.text();
      var data = null; try { data = JSON.parse(raw); } catch(_){}
      if (data && data.success) {
        _toast('🎉 Venda registrada!', 'success');
        _tel('mk-listing-sold', { listingId: self.listingId });
        self.destroy();

        // Remove listing card immediately (partial render, no full refresh)
        if (global.PA && global.PA.marketplace) {
          global.PA.marketplace.listings = (global.PA.marketplace.listings||[])
            .filter(function(l){ return l.id !== self.listingId; });
          var lEl = global.document.querySelector('[data-listing-id="' + self.listingId + '"]');
          if (lEl) {
            lEl.style.transition = 'opacity .3s, transform .3s';
            lEl.style.opacity = '0';
            lEl.style.transform = 'scale(0.95)';
            setTimeout(function() { lEl.remove(); }, 300);
          }
        }

        // Close all other windows for this listing
        Object.keys(_windows).forEach(function(sid) {
          var w = _windows[sid];
          if (w && w.listingId === self.listingId) w.destroy();
        });

        if (typeof MarketplaceInbox !== 'undefined') MarketplaceInbox.refresh();
      } else {
        console.error('[trade session] mark_sold error:', raw);
        _toast((data&&data.error)||'Erro ao registrar venda.', 'error');
      }
    } catch(e) { _toast('Erro ao registrar venda.', 'error'); }
  };

  ChatWindow.prototype.toggleMinimize = function() {
    this.minimized = !this.minimized;
    var body   = this.el && this.el.querySelector('.mk-cw-body');
    var footer = this.el && this.el.querySelector('.mk-cw-footer');
    if (body)   body.style.display   = this.minimized ? 'none' : '';
    if (footer) footer.style.display = this.minimized ? 'none' : '';
    if (this.el) this.el.classList.toggle('mk-cw--minimized', this.minimized);
    if (!this.minimized) this._markRead();
  };

  ChatWindow.prototype.focus = function() {
    if (!this.el) return;
    if (this.minimized) this.toggleMinimize();
    this.el.style.zIndex = String(Date.now()).slice(-6);
    var input = this.el.querySelector('.mk-cw-input');
    if (input) input.focus();
  };

  // destroy: closes window but keeps session alive in DB
  ChatWindow.prototype.destroy = function() {
    this._unregisterRealtime();
    if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
    delete _windows[this.sessionId];
    console.log('[channel cleanup] ChatWindow destroyed', this.sessionId);
  };

  function _fmt(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.getHours() + ':' + String(d.getMinutes()).padStart(2,'0');
  }

  // ── Public API ────────────────────────────────────────────────
  function open(sessionId, listingId, opts) {
    if (!sessionId) return;
    if (_windows[sessionId]) { _windows[sessionId].focus(); return; }
    var w = new ChatWindow(sessionId, listingId, opts || {});
    _windows[sessionId] = w;
  }

  function close(sessionId) {
    if (_windows[sessionId]) _windows[sessionId].destroy();
  }

  function closeAll() {
    Object.keys(_windows).forEach(function(sid) { _windows[sid].destroy(); });
  }

  function getActiveSessionId() {
    var keys = Object.keys(_windows);
    return keys.length ? keys[keys.length-1] : null;
  }

  global.document.addEventListener('DOMContentLoaded', function() {
    if (global.PA && global.PA.lifecycle) {
      global.PA.lifecycle.registerCleanup('marketplace-chat', closeAll);
    }
    if (typeof Session !== 'undefined' && Session.onAuthChange) {
      Session.onAuthChange(function() { if (!_user()) closeAll(); });
    }
  });

  // Return all open ChatWindow instances for a given listing
  function getWindowsByListing(listingId) {
    return Object.values(_windows).filter(function(w){ return w.listingId === listingId; });
  }

  global.MarketplaceChat = {
    open:                open,
    close:               close,
    closeAll:            closeAll,
    getActiveSessionId:  getActiveSessionId,
    getWindowsByListing: getWindowsByListing,
    getStats: function() {
      return { openWindows: Object.keys(_windows).length };
    },
  };

}(window));
