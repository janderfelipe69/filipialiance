// ============================================================
// orders-notifications.js — v5 — DEDUPLICATION FIX
// PokeAlliance Shop
//
// CAUSAS RAIZ corrigidas nesta versão:
//
//  5. INIT DUPLICADO  → A arrow function passada para Session.onAuthChange()
//     era uma nova instância a cada chamada de init(), tornando a verificação
//     _listeners.includes(callback) ineficaz — cada init() registrava um
//     listener ADICIONAL. Corrigido com guard _initCalled + callback estável
//     armazenado em _authChangeHandler.
//
//  6. _onLogin DUPLO  → init() chamava _onLogin(user) diretamente E o
//     onAuthChange disparava 'login' imediatamente (se já logado), causando
//     duas chamadas a startRealtime() na mesma execução. Corrigido: o
//     handler de onAuthChange é a única fonte de _onLogin.
//
//  7. CACHE LOCAL ILIMITADO  → o dropdown carregava 25 notificações sem
//     limite; agora o máximo é 30, com deduplicação por ID antes de render.
//
//  8. CONTADOR INCORRETO APÓS RELOAD  → countUnread() sempre busca do banco
//     (fonte única de verdade). Removido qualquer cálculo local do badge.
//
// Depende de: notifications.js, session.js, supabase-client.js
// ============================================================

const OrdersNotifications = (() => {
  'use strict';

  // ── Estado ───────────────────────────────────────────────────────────────
  let _toastContainer    = null;
  let _dropdownOpen      = false;
  let _unreadCount       = 0;
  let _initCalled        = false;       // guard: init() só executa UMA vez
  let _authChangeHandler = null;        // referência estável para deregistro

  // Deduplicação de toasts: IDs já exibidos nesta sessão de página
  const _toastedIds = new Set();

  // ── Tipos de notificação ─────────────────────────────────────────────────
  const TYPE_CFG = {
    pendente:      { icon: '⏳', color: '#ffd166', glow: 'rgba(245,197,66,0.3)',  border: 'rgba(245,197,66,0.25)'  },
    em_andamento:  { icon: '⚡', color: '#60aaff', glow: 'rgba(58,140,255,0.3)',  border: 'rgba(58,140,255,0.25)'  },
    parcial:       { icon: '🔮', color: '#c084fc', glow: 'rgba(168,85,247,0.3)',  border: 'rgba(168,85,247,0.25)'  },
    concluido:     { icon: '✅', color: '#4ade80', glow: 'rgba(34,197,94,0.3)',   border: 'rgba(34,197,94,0.25)'   },
    cancelado:     { icon: '✕',  color: '#f87171', glow: 'rgba(239,68,68,0.3)',   border: 'rgba(239,68,68,0.25)'   },
    item_progress: { icon: '📦', color: '#c084fc', glow: 'rgba(168,85,247,0.3)',  border: 'rgba(168,85,247,0.25)'  },
    item_done:     { icon: '✓',  color: '#4ade80', glow: 'rgba(34,197,94,0.3)',   border: 'rgba(34,197,94,0.25)'   },
    info:          { icon: 'ℹ',  color: '#60aaff', glow: 'rgba(58,140,255,0.3)',  border: 'rgba(58,140,255,0.25)'  },
  };
  function _cfg(type) { return TYPE_CFG[type] || TYPE_CFG.info; }

  // ── Init ─────────────────────────────────────────────────────────────────

  function init() {
    // ── CORREÇÃO 5: guard de init único ──────────────────────────────────
    if (_initCalled) {
      console.log('[OrdersNotifications] init() ignorado — já inicializado.');
      return;
    }
    _initCalled = true;

    _injectStyles();
    _ensureToastContainer();
    _injectBell();

    if (typeof Session === 'undefined') return;

    // ── CORREÇÃO 5: callback estável para deregistro correto ─────────────
    _authChangeHandler = function _authHandler(event, user) {
      if (event === 'login' && user) {
        _onLogin(user);
      } else if (event === 'logout') {
        _onLogout();
      }
    };

    // onAuthChange dispara imediatamente se já logado (via session.js v3+)
    // — isso é a ÚNICA fonte de _onLogin. NÃO chamamos _onLogin diretamente.
    Session.onAuthChange(_authChangeHandler);
  }

  // ── Login / Logout ────────────────────────────────────────────────────────

  function _onLogin(user) {
    console.log('[OrdersNotifications] Login detectado, iniciando notificações...');
    _refreshBadge();
    if (typeof NotificationsAPI !== 'undefined') {
      NotificationsAPI.startRealtime(user.id, _onRealtimeNotification);
    }
  }

  function _onLogout() {
    if (typeof NotificationsAPI !== 'undefined') {
      NotificationsAPI.stopRealtime();
    }
    _setBadge(0);
    _closeDropdown();
    _toastedIds.clear();
  }

  // ── Callback de Realtime ──────────────────────────────────────────────────

  function _onRealtimeNotification(record) {
    if (!record || !record.id) return;

    // ── CORREÇÃO 7: deduplicação de toast por ID ─────────────────────────
    if (_toastedIds.has(record.id)) {
      console.log('[OrdersNotifications] Toast duplicado ignorado:', record.id);
      return;
    }
    _toastedIds.add(record.id);

    console.log('[OrdersNotifications] Nova notificação realtime:', record.id);

    // Atualiza badge via banco (fonte única de verdade)
    _refreshBadge();

    _showToast({
      title:   record.title,
      message: record.message,
      type:    record.type || 'info',
    });

    if (_dropdownOpen) _loadDropdownContent();
  }

  // ── Sininho ───────────────────────────────────────────────────────────────

  function _injectBell() {
    if (document.getElementById('pa-bell-btn')) return;

    const targets = [
      '.nav-right',
      '.header-right',
      '.site-header-right',
      '.topbar-right',
      '.pedidos-topbar-right',
    ];

    let container = null;
    for (const sel of targets) {
      container = document.querySelector(sel);
      if (container) break;
    }

    if (!container) {
      setTimeout(_injectBell, 500);
      return;
    }

    const bell = document.createElement('button');
    bell.id        = 'pa-bell-btn';
    bell.className = 'pa-bell-btn';
    bell.title     = 'Notificações';
    bell.setAttribute('aria-label', 'Abrir notificações');
    bell.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span class="pa-bell-badge" id="pa-bell-badge" style="display:none"></span>
    `;
    bell.onclick = _toggleDropdown;
    container.insertBefore(bell, container.firstChild);
  }

  // ── Badge ─────────────────────────────────────────────────────────────────

  async function _refreshBadge() {
    if (typeof NotificationsAPI === 'undefined') return;
    try {
      // ── CORREÇÃO 8: sempre busca do banco — nunca calcula localmente ───
      const count = await NotificationsAPI.countUnread();
      _setBadge(count);
    } catch {
      _setBadge(0);
    }
  }

  function _setBadge(count) {
    _unreadCount = Math.max(0, count);
    const badge = document.getElementById('pa-bell-badge');
    const bell  = document.getElementById('pa-bell-btn');
    if (!badge) return;
    if (_unreadCount > 0) {
      badge.textContent = _unreadCount > 99 ? '99+' : _unreadCount;
      badge.style.display = 'flex';
      bell && bell.classList.add('has-unread');
    } else {
      badge.style.display = 'none';
      bell && bell.classList.remove('has-unread');
    }
  }

  // ── Dropdown ──────────────────────────────────────────────────────────────

  function _toggleDropdown() {
    _dropdownOpen ? _closeDropdown() : _openDropdown();
  }

  function _openDropdown() {
    _closeDropdown();

    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) return;

    const isMobile = window.innerWidth <= 600;

    const panel = document.createElement('div');
    panel.id        = 'pa-notif-dropdown';
    panel.className = 'pa-notif-dropdown' + (isMobile ? ' pa-notif-dropdown--mobile' : '');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Notificações');
    panel.innerHTML = `
      <div class="pa-notif-header">
        <span class="pa-notif-header-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          Notificações
        </span>
        <div class="pa-notif-header-actions">
          <button class="pa-notif-mark-all" id="pa-notif-mark-all" title="Marcar todas como lidas">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Marcar todas
          </button>
          <button class="pa-notif-close-btn" onclick="OrdersNotifications.closeDropdown()" aria-label="Fechar">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
          </button>
        </div>
      </div>
      <div class="pa-notif-list" id="pa-notif-list">
        <div class="pa-notif-loading">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="pa-spin"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="8"/></svg>
          Carregando...
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    _dropdownOpen = true;

    const bellBtn = document.getElementById('pa-bell-btn');
    if (bellBtn && !isMobile) {
      const rect = bellBtn.getBoundingClientRect();
      panel.style.top   = (rect.bottom + 8 + window.scrollY) + 'px';
      panel.style.right = (window.innerWidth - rect.right) + 'px';
    }

    requestAnimationFrame(() => panel.classList.add('open'));

    setTimeout(() => {
      document.addEventListener('click', _outsideClickHandler, { capture: true });
    }, 0);

    _loadDropdownContent();

    document.getElementById('pa-notif-mark-all').onclick = async () => {
      if (typeof NotificationsAPI !== 'undefined') {
        await NotificationsAPI.markAllRead();
        _setBadge(0);
        _loadDropdownContent();
      }
    };
  }

  function _outsideClickHandler(e) {
    const panel = document.getElementById('pa-notif-dropdown');
    const bell  = document.getElementById('pa-bell-btn');
    if (panel && !panel.contains(e.target) && bell && !bell.contains(e.target)) {
      _closeDropdown();
    }
  }

  function _closeDropdown() {
    const panel = document.getElementById('pa-notif-dropdown');
    if (panel) {
      panel.classList.remove('open');
      panel.classList.add('closing');
      setTimeout(() => panel.remove(), 250);
    }
    document.removeEventListener('click', _outsideClickHandler, { capture: true });
    _dropdownOpen = false;
  }

  async function _loadDropdownContent() {
    const list = document.getElementById('pa-notif-list');
    if (!list || typeof NotificationsAPI === 'undefined') return;

    // ── CORREÇÃO 7: busca máximo 30, deduplicação garantida na API ───────
    const rows = await NotificationsAPI.fetchMyNotifications(30);

    if (!rows || !rows.length) {
      list.innerHTML = `
        <div class="pa-notif-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span>Nenhuma notificação ainda</span>
        </div>
      `;
      return;
    }

    list.innerHTML = rows.map(n => {
      const cfg        = _cfg(n.type);
      const ts         = _fmtTime(n.created_at);
      const unreadCls  = n.read ? '' : 'unread';
      const dot        = n.read ? '' : '<span class="pa-notif-item-dot"></span>';
      return `
        <div class="pa-notif-item ${unreadCls}"
             data-id="${n.id}"
             style="--item-color:${cfg.color};--item-border:${cfg.border}"
             onclick="OrdersNotifications._markRead('${n.id}', this)">
          <div class="pa-notif-item-icon" style="color:${cfg.color};box-shadow:0 0 10px ${cfg.glow}">${cfg.icon}</div>
          <div class="pa-notif-item-body">
            <div class="pa-notif-item-title">${n.title || ''}</div>
            <div class="pa-notif-item-msg">${n.message || ''}</div>
            <div class="pa-notif-item-time">${ts}</div>
          </div>
          ${dot}
        </div>
      `;
    }).join('');

    // Marca como lidas após 1.5s visíveis
    const unreadIds = rows.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length) {
      setTimeout(async () => {
        if (typeof NotificationsAPI !== 'undefined') {
          await NotificationsAPI.markAllRead();
          _setBadge(0);
          document.querySelectorAll('#pa-notif-list .pa-notif-item-dot').forEach(d => d.remove());
          document.querySelectorAll('#pa-notif-list .pa-notif-item.unread').forEach(i => i.classList.remove('unread'));
        }
      }, 1500);
    }
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  function _ensureToastContainer() {
    if (document.getElementById('pa-toast-container')) {
      _toastContainer = document.getElementById('pa-toast-container');
      return;
    }
    _toastContainer = document.createElement('div');
    _toastContainer.id = 'pa-toast-container';
    document.body.appendChild(_toastContainer);
  }

  function _showToast({ title, message, type, duration }) {
    _ensureToastContainer();
    type     = type || 'info';
    duration = duration || 5000;
    const cfg = _cfg(type);

    const toast = document.createElement('div');
    toast.className = `pa-toast pa-toast--${type}`;
    toast.style.setProperty('--t-color',  cfg.color);
    toast.style.setProperty('--t-glow',   cfg.glow);
    toast.style.setProperty('--t-border', cfg.border);
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
      <div class="pa-toast-icon">${cfg.icon}</div>
      <div class="pa-toast-body">
        <div class="pa-toast-title">${title || ''}</div>
        <div class="pa-toast-msg">${message || ''}</div>
      </div>
      <button class="pa-toast-close" aria-label="Fechar">
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
      </button>
      <div class="pa-toast-progress">
        <div class="pa-toast-progress-fill" style="animation-duration:${duration}ms"></div>
      </div>
    `;

    const dismiss = () => {
      toast.classList.add('exit');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
      setTimeout(() => { if (toast.parentNode) toast.remove(); }, 400);
    };

    toast.querySelector('.pa-toast-close').onclick = (e) => { e.stopPropagation(); dismiss(); };
    toast.onclick = () => {
      if (typeof switchTab === 'function') {
        const btn = document.querySelector('.tab-btn--pedidos, [data-tab="pedidos"]');
        switchTab('pedidos', btn);
      }
      dismiss();
    };

    _toastContainer.appendChild(toast);
    setTimeout(dismiss, duration);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  async function _markRead(id, el) {
    if (!id || typeof NotificationsAPI === 'undefined') return;
    await NotificationsAPI.markNotificationRead(id);
    if (el) {
      el.classList.remove('unread');
      const dot = el.querySelector('.pa-notif-item-dot');
      if (dot) dot.remove();
    }
    _refreshBadge();
  }

  function _fmtTime(iso) {
    if (!iso) return '';
    const d    = new Date(iso);
    const diff = Date.now() - d;
    if (diff < 60000)    return 'agora mesmo';
    if (diff < 3600000)  return Math.floor(diff / 60000) + ' min atrás';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h atrás';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function show(msg, type, duration) {
    _showToast({ title: (_cfg(type)).icon + ' ' + (type || 'info'), message: msg, type, duration });
  }

  // ── Estilos ───────────────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('pa-notif-styles')) return;
    const s = document.createElement('style');
    s.id = 'pa-notif-styles';
    s.textContent = `
      /* ── SININHO ─────────────────────────────────────────── */
      .pa-bell-btn {
        position: relative;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 10px;
        width: 36px; height: 36px;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        color: rgba(255,255,255,0.45);
        transition: all 0.2s;
        flex-shrink: 0;
      }
      .pa-bell-btn:hover {
        background: rgba(58,140,255,0.12);
        border-color: rgba(58,140,255,0.35);
        color: #60aaff;
        box-shadow: 0 0 12px rgba(58,140,255,0.2);
      }
      .pa-bell-btn.has-unread {
        border-color: rgba(58,140,255,0.3);
        color: #60aaff;
        animation: bell-wiggle 1.2s ease-in-out 1;
      }
      @keyframes bell-wiggle {
        0%,100%{ transform:rotate(0); }
        15%    { transform:rotate(14deg); }
        30%    { transform:rotate(-12deg); }
        45%    { transform:rotate(10deg); }
        60%    { transform:rotate(-6deg); }
        75%    { transform:rotate(3deg); }
      }
      .pa-bell-badge {
        position: absolute; top:-5px; right:-5px;
        min-width:17px; height:17px; border-radius:9px;
        background:#ef4444; color:#fff;
        font-size:9px; font-weight:700;
        display:flex; align-items:center; justify-content:center;
        padding:0 4px;
        font-family:var(--font-mono,monospace);
        border:2px solid var(--bg,#04060e);
        animation:badge-pulse 2s ease-in-out infinite;
        pointer-events:none; line-height:1;
      }
      @keyframes badge-pulse {
        0%,100%{ transform:scale(1); } 50%{ transform:scale(1.2); }
      }

      /* ── DROPDOWN ────────────────────────────────────────── */
      .pa-notif-dropdown {
        position: absolute;
        top:0; right:0; z-index:100000;
        width:340px; max-height:480px;
        background:rgba(8,13,28,0.97);
        border:1px solid rgba(58,140,255,0.18);
        border-radius:16px;
        box-shadow:0 16px 48px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.03);
        backdrop-filter:blur(28px);
        -webkit-backdrop-filter:blur(28px);
        display:flex; flex-direction:column;
        overflow:hidden;
        opacity:0; transform:translateY(-8px) scale(0.97);
        transition:opacity 0.2s ease,transform 0.2s ease;
      }
      .pa-notif-dropdown.open   { opacity:1; transform:translateY(0) scale(1); }
      .pa-notif-dropdown.closing{ opacity:0; transform:translateY(-8px) scale(0.97); }
      .pa-notif-dropdown--mobile{
        position:fixed; top:0!important; right:0!important;
        width:100vw; max-height:100vh;
        border-radius:0 0 16px 16px; border-top:none;
      }
      .pa-notif-header{
        display:flex; align-items:center; justify-content:space-between;
        padding:14px 16px 12px;
        border-bottom:1px solid rgba(255,255,255,0.05);
        flex-shrink:0;
      }
      .pa-notif-header-title{
        display:flex; align-items:center; gap:7px;
        font-family:var(--font-title,'Cinzel',serif);
        font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase;
        color:rgba(255,255,255,0.55);
      }
      .pa-notif-header-actions{ display:flex; align-items:center; gap:6px; }
      .pa-notif-mark-all{
        display:flex; align-items:center; gap:4px;
        background:rgba(58,140,255,0.08); border:1px solid rgba(58,140,255,0.2);
        border-radius:6px; color:#60aaff;
        font-size:10px; font-weight:600; letter-spacing:0.3px;
        padding:4px 8px; cursor:pointer;
        font-family:var(--font-body,sans-serif); transition:all 0.15s;
      }
      .pa-notif-mark-all:hover{ background:rgba(58,140,255,0.16); }
      .pa-notif-close-btn{
        background:none; border:none; color:rgba(255,255,255,0.3); cursor:pointer;
        padding:4px; border-radius:5px;
        display:flex; align-items:center; justify-content:center;
        transition:color 0.15s;
      }
      .pa-notif-close-btn:hover{ color:rgba(255,255,255,0.7); }

      .pa-notif-list{
        overflow-y:auto; flex:1; padding:8px;
        display:flex; flex-direction:column; gap:4px;
        scrollbar-width:thin; scrollbar-color:rgba(58,140,255,0.25) transparent;
      }
      .pa-notif-list::-webkit-scrollbar{ width:4px; }
      .pa-notif-list::-webkit-scrollbar-track{ background:transparent; }
      .pa-notif-list::-webkit-scrollbar-thumb{ background:rgba(58,140,255,0.3); border-radius:4px; }

      .pa-notif-item{
        display:flex; align-items:flex-start; gap:10px;
        padding:10px 12px; border-radius:10px;
        background:rgba(255,255,255,0.025);
        border:1px solid transparent;
        cursor:pointer; transition:background 0.15s,border-color 0.15s;
        position:relative;
      }
      .pa-notif-item:hover{ background:rgba(58,140,255,0.07); border-color:rgba(58,140,255,0.15); }
      .pa-notif-item.unread{ background:rgba(58,140,255,0.06); border-color:var(--item-border,rgba(58,140,255,0.2)); }

      .pa-notif-item-icon{
        width:30px; height:30px; border-radius:50%;
        background:rgba(255,255,255,0.05);
        display:flex; align-items:center; justify-content:center;
        font-size:14px; flex-shrink:0;
      }
      .pa-notif-item-body{ flex:1; min-width:0; }
      .pa-notif-item-title{
        font-size:12px; font-weight:700; color:rgba(255,255,255,0.85);
        margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        font-family:var(--font-body,sans-serif);
      }
      .pa-notif-item-msg{ font-size:11px; color:rgba(255,255,255,0.45); line-height:1.4; font-family:var(--font-body,sans-serif); }
      .pa-notif-item-time{ font-size:10px; color:rgba(255,255,255,0.25); margin-top:4px; font-family:var(--font-mono,monospace); }
      .pa-notif-item-dot{
        position:absolute; top:10px; right:10px;
        width:7px; height:7px; border-radius:50%;
        background:#3a8cff; box-shadow:0 0 6px rgba(58,140,255,0.6);
      }
      .pa-notif-loading,.pa-notif-empty{
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        gap:8px; padding:32px 16px;
        color:rgba(255,255,255,0.25); font-size:12px;
        font-family:var(--font-body,sans-serif);
      }

      /* ── TOAST ───────────────────────────────────────────── */
      #pa-toast-container{
        position:fixed; top:20px; right:20px; z-index:100001;
        display:flex; flex-direction:column; gap:10px;
        pointer-events:none;
        max-width:340px; width:calc(100vw - 32px);
      }
      .pa-toast{
        pointer-events:all;
        display:flex; align-items:flex-start; gap:12px;
        padding:14px 16px 10px; border-radius:14px;
        background:rgba(8,13,28,0.96);
        border:1px solid var(--t-border,rgba(58,140,255,0.25));
        box-shadow:0 8px 32px rgba(0,0,0,0.55),
                   0 0 20px var(--t-glow,rgba(58,140,255,0.15)),
                   0 0 0 1px rgba(255,255,255,0.03);
        backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px);
        animation:toast-in 0.38s cubic-bezier(0.34,1.56,0.64,1) both;
        cursor:pointer; position:relative; overflow:hidden;
        transition:transform 0.15s,opacity 0.15s;
      }
      .pa-toast:hover{ transform:translateX(-3px); }
      .pa-toast.exit{ animation:toast-out 0.3s cubic-bezier(0.55,0,1,0.45) both; }

      @keyframes toast-in{
        from{ opacity:0; transform:translateX(110%) scale(0.9); }
        to  { opacity:1; transform:translateX(0) scale(1); }
      }
      @keyframes toast-out{
        from{ opacity:1; transform:translateX(0) scale(1); max-height:200px; }
        to  { opacity:0; transform:translateX(110%) scale(0.9); max-height:0; padding:0; margin:0; }
      }
      .pa-toast-icon{
        width:34px; height:34px; border-radius:50%;
        background:rgba(255,255,255,0.05);
        display:flex; align-items:center; justify-content:center;
        font-size:16px; flex-shrink:0; margin-top:1px;
        color:var(--t-color,#60aaff);
        box-shadow:0 0 10px var(--t-glow,rgba(58,140,255,0.2));
      }
      .pa-toast-body{ flex:1; min-width:0; }
      .pa-toast-title{
        font-size:12px; font-weight:700; color:var(--t-color,#60aaff);
        margin-bottom:3px; text-transform:uppercase; letter-spacing:0.5px;
        font-family:var(--font-body,sans-serif);
      }
      .pa-toast-msg{
        font-size:13px; font-weight:500; color:rgba(255,255,255,0.85);
        line-height:1.4; word-break:break-word;
        font-family:var(--font-body,sans-serif);
      }
      .pa-toast-close{
        background:none; border:none; color:rgba(255,255,255,0.3);
        cursor:pointer; padding:2px; flex-shrink:0;
        display:flex; align-items:center; transition:color 0.15s;
      }
      .pa-toast-close:hover{ color:rgba(255,255,255,0.7); }
      .pa-toast-progress{
        position:absolute; bottom:0; left:0; right:0;
        height:2px; background:rgba(255,255,255,0.05);
      }
      .pa-toast-progress-fill{
        height:100%; background:var(--t-color,#60aaff); opacity:0.6;
        width:100%; animation:toast-progress linear forwards;
        animation-duration:inherit;
      }
      @keyframes toast-progress{ from{width:100%;} to{width:0%;} }

      .pa-spin{ animation:spin 0.8s linear infinite; }
      @keyframes spin{ to{transform:rotate(360deg);} }

      @media(max-width:600px){
        #pa-toast-container{ top:12px; right:12px; max-width:calc(100vw - 24px); }
        .pa-toast{ padding:12px 14px 10px; }
        .pa-toast-msg{ font-size:12px; }
        .pa-notif-dropdown{ width:100vw; border-radius:0 0 14px 14px; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── Legacy no-ops para compatibilidade ───────────────────────────────────
  function flushUnreadNotifications() {}
  function notifyStatusChange() {}

  // ── Exporta API Pública ──────────────────────────────────────────────────
  return {
    init,
    show,
    closeDropdown:            _closeDropdown,
    refreshBell:              _refreshBadge,
    _markRead,
    flushUnreadNotifications,
    notifyStatusChange,
  };
})();

// Auto-init — executado UMA única vez graças ao guard _initCalled
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => OrdersNotifications.init(), { once: true });
} else {
  OrdersNotifications.init();
}
