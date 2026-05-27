// ============================================================
// marketplace-chat.js — Filipi Marketplace M4
// PokeAlliance Shop
//
// Janela de chat DRAGGABLE, multi-instância, persistente.
//   • Uma janela por sessão (singleton por session_id)
//   • Drag livre pela tela
//   • Minimizar / restaurar / fechar
//   • Realtime: subscribe trade_messages INSERT
//   • Paginação: 30 msgs por vez, lazy load histórico
//   • Botões: Cancelar negociação | Venda Efetuada (seller only)
// ============================================================

;(function (global) {
  'use strict';

  if (global.MarketplaceChat) return; // singleton manager

  var SB_URL = global.SUPABASE_URL || '';
  var SB_KEY = global.SUPABASE_KEY || '';

  function _jwt()  { return typeof Session !== 'undefined' && Session.getAccessToken ? Session.getAccessToken() : null; }
  function _user() { return typeof Session !== 'undefined' ? Session.getCurrentUser() : null; }
  function _isAdmin() { return typeof Session !== 'undefined' && Session.isAdmin && Session.isAdmin(); }
  function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _tel(c,d) { if (global.PA && global.PA.telemetry) global.PA.telemetry.push(c,d); }
  function _toast(m,t) { if (typeof showToast==='function') showToast(m,t||'info'); }

  // ── Active windows: sessionId → ChatWindow instance ─────────
  var _windows = {};

  // ── ChatWindow class ─────────────────────────────────────────
  function ChatWindow(sessionId, listingId, opts) {
    opts = opts || {};
    this.sessionId   = sessionId;
    this.listingId   = listingId;
    this.listingName = opts.listingName || '—';
    this.buyerName   = opts.buyerName   || '—';
    this.isSeller    = opts.isSeller    || false;
    this.el          = null;
    this.minimized   = false;
    this.seenIds     = new Set();
    this.page        = 0;
    this.allLoaded   = false;
    this.submitting  = false;
    this._inputHandler = null;
    this._x = opts.x || (120 + Object.keys(_windows).length * 30);
    this._y = opts.y || (120 + Object.keys(_windows).length * 30);
    this._init();
  }

  ChatWindow.prototype._init = function() {
    var self = this;
    var el = global.document.createElement('div');
    el.className = 'mk-cw';
    el.id = 'mk-cw-' + self.sessionId.slice(0,8);
    el.setAttribute('data-session', self.sessionId);
    el.style.cssText = 'left:' + self._x + 'px;top:' + self._y + 'px';
    el.innerHTML = self._buildHtml();
    global.document.body.appendChild(el);
    self.el = el;
    self._bindDrag();
    self._bindButtons();
    self._loadHistory();
    self._markRead();
    console.log('[trade_session] ChatWindow opened', { sessionId: self.sessionId, seller: self.isSeller });
  };

  ChatWindow.prototype._buildHtml = function() {
    var self = this;
    var title = self.isSeller
      ? ('💬 ' + _esc(self.buyerName))
      : ('💬 ' + _esc(self.listingName));

    var sellerBtns = self.isSeller
      ? '<div class="mk-cw-actions">'
        + '<button class="mk-btn mk-btn--ghost mk-btn--sm mk-cw-cancel-btn">✕ Cancelar</button>'
        + '<button class="mk-btn mk-btn--primary mk-btn--sm mk-cw-sold-btn">🏷 Venda Efetuada</button>'
        + '</div>'
      : '<div class="mk-cw-actions">'
        + '<button class="mk-btn mk-btn--ghost mk-btn--sm mk-cw-cancel-btn">✕ Cancelar negociação</button>'
        + '</div>';

    return '<div class="mk-cw-header">'
      + '<div class="mk-cw-drag-handle">'
      +   '<span class="mk-cw-title">' + title + '</span>'
      + '</div>'
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
      +   sellerBtns
      +   '<div class="mk-cw-input-row">'
      +     '<input class="mk-chat-input mk-cw-input" type="text" maxlength="500" placeholder="Mensagem...">'
      +     '<button class="mk-btn mk-btn--primary mk-btn--sm mk-cw-send">Enviar</button>'
      +   '</div>'
      + '</div>';
  };

  ChatWindow.prototype._bindDrag = function() {
    var self = this;
    var handle = self.el.querySelector('.mk-cw-drag-handle');
    var isDragging = false, startX, startY, origX, origY;

    handle.addEventListener('mousedown', function(e) {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      startX = e.clientX; startY = e.clientY;
      origX = parseInt(self.el.style.left) || 0;
      origY = parseInt(self.el.style.top)  || 0;
      global.document.body.style.userSelect = 'none';
    });
    global.document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      self._x = origX + (e.clientX - startX);
      self._y = origY + (e.clientY - startY);
      self.el.style.left = self._x + 'px';
      self.el.style.top  = self._y + 'px';
    });
    global.document.addEventListener('mouseup', function() {
      if (isDragging) { isDragging = false; global.document.body.style.userSelect = ''; }
    });
  };

  ChatWindow.prototype._bindButtons = function() {
    var self = this;

    // Minimize
    var minBtn = self.el.querySelector('.mk-cw-min');
    if (minBtn) minBtn.addEventListener('click', function() { self.toggleMinimize(); });

    // Close
    var closeBtn = self.el.querySelector('.mk-cw-close');
    if (closeBtn) closeBtn.addEventListener('click', function() { self.close(); });

    // Send via button
    var sendBtn = self.el.querySelector('.mk-cw-send');
    if (sendBtn) sendBtn.addEventListener('click', function() { self._sendFromInput(); });

    // Send via Enter
    var input = self.el.querySelector('.mk-cw-input');
    if (input) {
      self._inputHandler = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); self._sendFromInput(); }
      };
      input.addEventListener('keydown', self._inputHandler);
    }

    // Cancel negotiation
    var cancelBtn = self.el.querySelector('.mk-cw-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', function() { self._cancelNegotiation(); });

    // Mark sold (seller only)
    var soldBtn = self.el.querySelector('.mk-cw-sold-btn');
    if (soldBtn) soldBtn.addEventListener('click', function() { self._markSold(); });

    // Load more
    var loadMore = self.el.querySelector('.mk-cw-load-more');
    if (loadMore) loadMore.addEventListener('click', function() { self._loadHistory(); });
  };

  ChatWindow.prototype._sendFromInput = function() {
    var input = this.el && this.el.querySelector('.mk-cw-input');
    if (input) this.send(input.value);
  };

  ChatWindow.prototype.send = async function(content) {
    var self = this;
    if (self.submitting || !content || !content.trim()) return;
    var user = _user();
    if (!user) return;
    self.submitting = true;

    var input = self.el && self.el.querySelector('.mk-cw-input');
    if (input) { input.disabled = true; }

    try {
      var res = await fetch(SB_URL + '/rest/v1/trade_messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SB_KEY,
          'Authorization': 'Bearer ' + _jwt(),
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({ session_id: self.sessionId, sender_id: user.id, content: content.trim() }),
      });
      if (!res.ok) {
        var txt = await res.text().catch(function(){return '';});
        _toast(txt.includes('rate_limit') ? 'Aguarde antes de enviar.' : 'Erro ao enviar.', 'error');
        return;
      }
      var data = await res.json();
      var msg = Array.isArray(data) ? data[0] : data;
      if (msg) self.appendMessage(msg); // optimistic
      if (input) input.value = '';
      _tel('mk-chat-sent', { sessionId: self.sessionId });
    } catch(e) {
      _toast('Erro ao enviar mensagem.', 'error');
    } finally {
      self.submitting = false;
      if (input) input.disabled = false;
    }
  };

  ChatWindow.prototype.appendMessage = function(msg) {
    if (!msg || !msg.id) return;
    if (this.seenIds.has(msg.id)) return;
    this.seenIds.add(msg.id);

    var user = _user();
    var isOwn = user && msg.sender_id === user.id;
    var msgs  = this.el && this.el.querySelector('.mk-cw-msgs');
    if (!msgs) return;

    var nearBottom = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 80;

    var el = global.document.createElement('div');
    el.className = 'mk-cw-msg' + (isOwn ? ' mk-cw-msg--own' : '');
    el.setAttribute('data-msg-id', _esc(msg.id));
    el.innerHTML = '<div class="mk-chat-bubble">'
      + '<span class="mk-chat-content">' + _esc(msg.content || msg.body || '') + '</span>'
      + '<span class="mk-chat-time">' + _fmt(msg.created_at) + '</span>'
      + '</div>';
    msgs.appendChild(el);

    if (nearBottom || isOwn) msgs.scrollTop = msgs.scrollHeight;

    // Trim DOM to max 200 messages
    var all = msgs.querySelectorAll('.mk-cw-msg');
    if (all.length > 200) for (var i = 0; i < 50 && all[i]; i++) msgs.removeChild(all[i]);

    console.log('[incoming_message]', { id: msg.id, sessionId: msg.session_id });
    this._markRead();
  };

  ChatWindow.prototype._loadHistory = async function() {
    var self = this;
    if (self.allLoaded) return;
    var jwt = _jwt(); if (!jwt) return;

    var offset = self.page * 30;
    try {
      var res = await fetch(
        SB_URL + '/rest/v1/trade_messages?session_id=eq.' + self.sessionId
          + '&is_deleted=eq.false&order=created_at.desc&limit=30&offset=' + offset,
        { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + jwt } }
      );
      if (!res.ok) return;
      var data = await res.json();
      var msgs = Array.isArray(data) ? data : [];
      if (msgs.length < 30) { self.allLoaded = true; }
      if (!msgs.length && self.page === 0) {
        var lm = self.el && self.el.querySelector('.mk-cw-load-more');
        if (lm) lm.style.display = 'none';
        return;
      }

      // Prepend in correct order (they arrived desc, show asc)
      msgs.reverse().forEach(function(m) { self.appendMessage(m); });
      self.page++;

      var lm = self.el && self.el.querySelector('.mk-cw-load-more');
      if (lm) lm.style.display = self.allLoaded ? 'none' : '';
    } catch(e) {}
  };

  ChatWindow.prototype._markRead = async function() {
    var jwt = _jwt(); if (!jwt) return;
    try {
      await fetch(SB_URL + '/rest/v1/rpc/rpc_mark_session_read', {
        method: 'POST',
        headers: { 'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+jwt },
        body: JSON.stringify({ p_session_id: this.sessionId }),
      });
      if (typeof MarketplaceInbox !== 'undefined') MarketplaceInbox.refresh();
    } catch(e) {}
  };

  ChatWindow.prototype._cancelNegotiation = async function() {
    var self = this;
    var confirmed = global.confirm ? global.confirm('Cancelar esta negociação?') : true;
    if (!confirmed) return;
    try {
      var res = await fetch(SB_URL + '/rest/v1/rpc/rpc_cancel_negotiation', {
        method: 'POST',
        headers: { 'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+_jwt() },
        body: JSON.stringify({ p_session_id: self.sessionId }),
      });
      var data = await res.json();
      if (data && data.success) {
        _toast('Negociação cancelada.', 'info');
        self.close();
        if (typeof MarketplaceInbox !== 'undefined') MarketplaceInbox.refresh();
        if (typeof MarketplaceRender !== 'undefined' && global.PA && global.PA.marketplace) {
          MarketplaceRender.render(global.PA.marketplace.listings, global.PA.marketplace.filters || {});
        }
      } else {
        _toast((data && data.error) || 'Erro ao cancelar.', 'error');
      }
    } catch(e) { _toast('Erro ao cancelar.', 'error'); }
  };

  ChatWindow.prototype._markSold = async function() {
    var self = this;
    var confirmed = global.confirm ? global.confirm('Confirmar venda para este comprador? Todas as outras negociações serão fechadas.') : true;
    if (!confirmed) return;
    try {
      var res = await fetch(SB_URL + '/rest/v1/rpc/rpc_mark_sold', {
        method: 'POST',
        headers: { 'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+_jwt() },
        body: JSON.stringify({ p_session_id: self.sessionId }),
      });
      var data = await res.json();
      if (data && data.success) {
        _toast('🎉 Venda registrada com sucesso!', 'success');
        _tel('mk-listing-sold', { sessionId: self.sessionId });
        self.close();
        // Remove listing card from active view
        if (global.PA && global.PA.marketplace) {
          global.PA.marketplace.listings = (global.PA.marketplace.listings||[]).filter(function(l){
            return l.id !== self.listingId;
          });
          if (typeof MarketplaceRender !== 'undefined') {
            MarketplaceRender.render(global.PA.marketplace.listings, global.PA.marketplace.filters||{});
          }
        }
        // Close all other windows for this listing
        Object.keys(_windows).forEach(function(sid) {
          if (_windows[sid] && _windows[sid].listingId === self.listingId && sid !== self.sessionId) {
            _windows[sid].close();
          }
        });
        if (typeof MarketplaceInbox !== 'undefined') MarketplaceInbox.refresh();
      } else {
        _toast((data && data.error) || 'Erro ao registrar venda.', 'error');
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
  };

  ChatWindow.prototype.focus = function() {
    if (this.el) {
      if (this.minimized) this.toggleMinimize();
      this.el.style.zIndex = String(Date.now()).slice(-5);
    }
  };

  ChatWindow.prototype.close = function() {
    var input = this.el && this.el.querySelector('.mk-cw-input');
    if (input && this._inputHandler) input.removeEventListener('keydown', this._inputHandler);
    if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
    delete _windows[this.sessionId];
  };

  function _fmt(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.getHours() + ':' + String(d.getMinutes()).padStart(2,'0');
  }

  // ── Public manager API ────────────────────────────────────────

  function open(sessionId, listingId, opts) {
    if (!sessionId) return;
    if (_windows[sessionId]) { _windows[sessionId].focus(); return; }
    var w = new ChatWindow(sessionId, listingId, opts || {});
    _windows[sessionId] = w;
  }

  function closeAll() {
    Object.keys(_windows).forEach(function(sid) { _windows[sid].close(); });
  }

  function getActiveSessionId() {
    var keys = Object.keys(_windows);
    return keys.length ? keys[keys.length-1] : null;
  }

  // ── Realtime: handle incoming messages ───────────────────────
  global.document.addEventListener('trade_messages:changed', function(e) {
    try {
      var d = (e && e.detail) || {};
      var record = d.record || {};
      if (d.event !== 'INSERT' || !record.session_id) return;
      console.log('[trade_subscribe]', { sessionId: record.session_id, msgId: record.id });
      var w = _windows[record.session_id];
      if (w) {
        w.appendMessage(record);
      } else {
        // Window not open — update inbox badge
        if (typeof MarketplaceInbox !== 'undefined') MarketplaceInbox.notifyNewMessage(record);
      }
    } catch(err) {}
  });

  global.document.addEventListener('DOMContentLoaded', function() {
    if (global.PA && global.PA.lifecycle) {
      global.PA.lifecycle.registerCleanup('marketplace-chat', closeAll);
    }
    if (typeof Session !== 'undefined' && Session.onAuthChange) {
      Session.onAuthChange(function() { if (!_user()) closeAll(); });
    }
  });

  global.MarketplaceChat = {
    open:               open,
    close:              function(sid) { if (_windows[sid]) _windows[sid].close(); },
    closeAll:           closeAll,
    getActiveSessionId: getActiveSessionId,
    getStats: function() {
      return { openWindows: Object.keys(_windows).length, sessions: Object.keys(_windows) };
    },
  };

}(window));
