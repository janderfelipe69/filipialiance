// ============================================================
// notifications-ui.js — v1 — Sistema de Notificações UI
// PokeAlliance Shop
//
// FEATURES:
//  [1] Botão "Limpar todas" — remove todas da UI + banco
//  [2] Botão X individual — remove notificação por ID
//  [3] Remoção instantânea da UI + badge atualizado
//  [4] Sistema read=true / archived=true (soft delete)
//  [5] Badge mostra apenas não lidas
//  [6] Abre dropdown → marca como lidas após 2s
//  [7] Máximo 50 notificações por usuário (limpeza automática)
//  [8] Animações: fade, slide, glassmorphism consistente
//  [9] Deduplicação robusta (seenIds + Set local)
// [10] Logs padronizados [Notifications]
//
// Depende de: notifications.js (NotificationsAPI), session.js (Session)
// ============================================================

const NotificationsUI = (() => {
  'use strict';

  // ── Estado ───────────────────────────────────────────────────────────────
  let _notifications  = [];         // cache local
  let _isOpen         = false;
  let _readTimer      = null;       // timer p/ marcar como lidas ao abrir
  let _badgeEl        = null;
  let _panelEl        = null;
  let _bellEl         = null;
  let _initialized    = false;
  let _currentUserId  = null;
  const _localSeen    = new Set();  // deduplicação adicional no frontend

  const MAX_NOTIFICATIONS = 50;
  const READ_DELAY_MS     = 2000;  // 2s após abrir dropdown

  // ── Injeção de CSS ───────────────────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('notif-ui-styles')) return;
    const style = document.createElement('style');
    style.id = 'notif-ui-styles';
    style.textContent = `
/* ── Bell Button ─────────────────────────────────────────────────────────── */
.notif-bell-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(58,140,255,0.08);
  border: 1.5px solid rgba(58,140,255,0.2);
  border-radius: 10px;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.15s;
  flex-shrink: 0;
}
.notif-bell-btn:hover {
  background: rgba(58,140,255,0.15);
  border-color: rgba(58,140,255,0.45);
  color: #fff;
  transform: scale(1.05);
}
.notif-bell-btn.has-unread {
  border-color: rgba(58,140,255,0.5);
  color: rgba(255,255,255,0.9);
}
.notif-bell-btn.has-unread svg {
  animation: notif-bell-ring 0.6s ease 0.3s both;
}
@keyframes notif-bell-ring {
  0%,100% { transform: rotate(0); }
  20%      { transform: rotate(-12deg); }
  40%      { transform: rotate(12deg); }
  60%      { transform: rotate(-8deg); }
  80%      { transform: rotate(8deg); }
}

/* ── Badge ───────────────────────────────────────────────────────────────── */
.notif-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: linear-gradient(135deg, #ff4757 0%, #c0392b 100%);
  border: 2px solid #040810;
  border-radius: 8px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  opacity: 0;
  transform: scale(0.5);
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
  pointer-events: none;
}
.notif-badge.visible {
  opacity: 1;
  transform: scale(1);
}
.notif-badge.bump {
  animation: notif-badge-bump 0.3s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes notif-badge-bump {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.4); }
  100% { transform: scale(1); }
}

/* ── Dropdown Panel ──────────────────────────────────────────────────────── */
.notif-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 340px;
  max-width: calc(100vw - 24px);
  background: linear-gradient(145deg, rgba(13,30,61,0.97) 0%, rgba(4,8,16,0.98) 100%);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(58,140,255,0.2);
  border-radius: 14px;
  box-shadow:
    0 24px 64px rgba(0,0,0,0.7),
    0 0 0 1px rgba(58,140,255,0.04) inset,
    0 1px 0 rgba(58,140,255,0.12) inset;
  z-index: 10001;
  opacity: 0;
  transform: translateY(-10px) scale(0.97);
  pointer-events: none;
  transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
  overflow: hidden;
}
.notif-panel.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: all;
}

/* ── Panel Header ────────────────────────────────────────────────────────── */
.notif-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 14px 10px;
  border-bottom: 1px solid rgba(58,140,255,0.1);
}
.notif-panel-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 12px;
  font-weight: 700;
  color: rgba(255,255,255,0.9);
  letter-spacing: 0.05em;
}
.notif-clear-all-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  background: rgba(255,71,87,0.08);
  border: 1px solid rgba(255,71,87,0.2);
  border-radius: 6px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,71,87,0.7);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  white-space: nowrap;
}
.notif-clear-all-btn:hover {
  background: rgba(255,71,87,0.15);
  border-color: rgba(255,71,87,0.45);
  color: #ff4757;
}
.notif-clear-all-btn svg { flex-shrink: 0; }

/* ── List Container ──────────────────────────────────────────────────────── */
.notif-list {
  max-height: 380px;
  overflow-y: auto;
  padding: 6px;
  scrollbar-width: thin;
  scrollbar-color: rgba(58,140,255,0.3) transparent;
}
.notif-list::-webkit-scrollbar { width: 4px; }
.notif-list::-webkit-scrollbar-track { background: transparent; }
.notif-list::-webkit-scrollbar-thumb { background: rgba(58,140,255,0.3); border-radius: 2px; }

/* ── Empty State ─────────────────────────────────────────────────────────── */
.notif-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 36px 20px;
  color: rgba(255,255,255,0.2);
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
}
.notif-empty svg { opacity: 0.3; }

/* ── Notification Item ───────────────────────────────────────────────────── */
.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 10px;
  border-radius: 10px;
  cursor: default;
  position: relative;
  overflow: hidden;
  transition: background 0.15s;

  /* entrada */
  animation: notif-item-in 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
}
@keyframes notif-item-in {
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)  scale(1);    }
}
.notif-item:hover { background: rgba(58,140,255,0.06); }
.notif-item.unread {
  background: rgba(58,140,255,0.05);
}
.notif-item.unread::before {
  content: '';
  position: absolute;
  left: 0; top: 6px; bottom: 6px;
  width: 2.5px;
  background: linear-gradient(to bottom, #3a8cff, #60aaff);
  border-radius: 2px;
}

/* saída (slide + fade) */
.notif-item.removing {
  animation: notif-item-out 0.25s ease forwards;
  pointer-events: none;
}
@keyframes notif-item-out {
  from { opacity: 1; transform: translateX(0)    scale(1);    max-height: 100px; margin-bottom: 0; }
  to   { opacity: 0; transform: translateX(30px) scale(0.95); max-height: 0;   margin-bottom: 0; padding-top: 0; padding-bottom: 0; }
}

/* ── Item Icon ───────────────────────────────────────────────────────────── */
.notif-item-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
}
.notif-item-icon.type-info    { background: rgba(58,140,255,0.15); }
.notif-item-icon.type-success { background: rgba(46,213,115,0.15); }
.notif-item-icon.type-warning { background: rgba(255,165,2,0.15);  }
.notif-item-icon.type-error   { background: rgba(255,71,87,0.15);  }

/* ── Item Content ────────────────────────────────────────────────────────── */
.notif-item-body { flex: 1; min-width: 0; }
.notif-item-title {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
  font-weight: 700;
  color: rgba(255,255,255,0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}
.notif-item-msg {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12px;
  color: rgba(255,255,255,0.45);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.notif-item-time {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 10px;
  color: rgba(255,255,255,0.22);
  margin-top: 4px;
}

/* ── Item Dismiss (X) ────────────────────────────────────────────────────── */
.notif-item-dismiss {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 6px;
  color: rgba(255,255,255,0.2);
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 2px;
  transition: background 0.15s, color 0.15s;
  opacity: 0;
}
.notif-item:hover .notif-item-dismiss { opacity: 1; }
.notif-item-dismiss:hover {
  background: rgba(255,71,87,0.12);
  color: #ff4757;
}

/* ── Panel Footer ────────────────────────────────────────────────────────── */
.notif-panel-footer {
  padding: 8px 14px 12px;
  border-top: 1px solid rgba(58,140,255,0.08);
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 10px;
  color: rgba(255,255,255,0.18);
  text-align: center;
}

/* ── Wrapper posicionado ─────────────────────────────────────────────────── */
.notif-bell-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

/* ── Loading shimmer ─────────────────────────────────────────────────────── */
.notif-loading {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.notif-shimmer {
  height: 52px;
  border-radius: 10px;
  background: linear-gradient(90deg,
    rgba(58,140,255,0.04) 25%,
    rgba(58,140,255,0.09) 50%,
    rgba(58,140,255,0.04) 75%);
  background-size: 200% 100%;
  animation: notif-shimmer 1.4s infinite;
}
@keyframes notif-shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}
    `;
    document.head.appendChild(style);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  function _typeIcon(type) {
    const icons = {
      success: '✅',
      warning: '⚠️',
      error:   '🔴',
      info:    '🔔',
    };
    return icons[type] || '🔔';
  }

  function _relativeTime(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'agora';
    if (m < 60) return `${m}min atrás`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h atrás`;
    const d = Math.floor(h / 24);
    return `${d}d atrás`;
  }

  function _unreadCount() {
    return _notifications.filter(n => !n.read && !n.archived).length;
  }

  // ── Badge ────────────────────────────────────────────────────────────────

  function _updateBadge(animate) {
    if (!_badgeEl) return;
    const count = _unreadCount();
    _badgeEl.textContent = count > 99 ? '99+' : String(count);
    const visible = count > 0;
    _badgeEl.classList.toggle('visible', visible);
    if (!visible) _badgeEl.classList.remove('bump');
    if (_bellEl) _bellEl.classList.toggle('has-unread', visible);
    if (animate && visible) {
      _badgeEl.classList.remove('bump');
      requestAnimationFrame(() => _badgeEl.classList.add('bump'));
    }
    console.log('[Notifications] badge atualizado →', count, 'não lidas');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function _renderList() {
    if (!_panelEl) return;
    const list = _panelEl.querySelector('.notif-list');
    if (!list) return;

    const visible = _notifications.filter(n => !n.archived);

    if (visible.length === 0) {
      list.innerHTML = `
        <div class="notif-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          <span>Sem notificações</span>
        </div>`;
      return;
    }

    list.innerHTML = visible.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
        <div class="notif-item-icon type-${n.type || 'info'}">${_typeIcon(n.type)}</div>
        <div class="notif-item-body">
          <div class="notif-item-title">${_escHtml(n.title || 'Notificação')}</div>
          <div class="notif-item-msg">${_escHtml(n.message || '')}</div>
          <div class="notif-item-time">${_relativeTime(n.created_at)}</div>
        </div>
        <button class="notif-item-dismiss" data-dismiss-id="${n.id}" title="Remover" aria-label="Remover notificação">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/>
          </svg>
        </button>
      </div>`
    ).join('');
  }

  function _escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  // ── Dismiss individual ────────────────────────────────────────────────────

  async function _dismissOne(id) {
    if (!id) return;
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) return;

    // Remove da UI instantaneamente
    const el = _panelEl?.querySelector(`[data-id="${id}"]`);
    if (el) {
      el.classList.add('removing');
      el.addEventListener('animationend', () => {
        el.remove();
        // Mostra empty se necessário
        const remaining = _panelEl?.querySelectorAll('.notif-item:not(.removing)');
        if (remaining && remaining.length === 0) _renderList();
      }, { once: true });
    }

    // Remove do cache local
    _notifications = _notifications.filter(n => n.id !== id);
    _updateBadge(false);
    console.log('[Notifications] removida id:', id);

    // Persiste no banco (archived = true)
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications?id=eq.${id}&user_id=eq.${user.id}`,
        {
          method:  'PATCH',
          headers: _headers(),
          body:    JSON.stringify({ archived: true, read: true }),
        }
      );
      if (!res.ok) {
        // Fallback: DELETE direto
        await fetch(
          `${window.SUPABASE_URL}/rest/v1/notifications?id=eq.${id}&user_id=eq.${user.id}`,
          { method: 'DELETE', headers: _headers() }
        );
      }
    } catch (e) {
      console.warn('[Notifications] erro ao persistir remoção:', e.message);
    }
  }

  // ── Clear all ─────────────────────────────────────────────────────────────

  async function _clearAll() {
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) return;

    // Remove tudo da UI instantaneamente
    _notifications = [];
    _renderList();
    _updateBadge(false);
    console.log('[Notifications] todas limpas');

    // Persiste no banco
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications?user_id=eq.${user.id}`,
        {
          method:  'PATCH',
          headers: _headers(),
          body:    JSON.stringify({ archived: true, read: true }),
        }
      );
      if (!res.ok) {
        // Fallback: DELETE
        await fetch(
          `${window.SUPABASE_URL}/rest/v1/notifications?user_id=eq.${user.id}`,
          { method: 'DELETE', headers: _headers() }
        );
      }
    } catch (e) {
      console.warn('[Notifications] erro ao limpar todas:', e.message);
    }
  }

  // ── Mark all read (ao abrir dropdown) ─────────────────────────────────────

  function _scheduleMarkRead() {
    clearTimeout(_readTimer);
    _readTimer = setTimeout(async () => {
      if (!_isOpen) return;
      const had = _unreadCount();
      if (had === 0) return;

      // Marca lidas no cache
      _notifications = _notifications.map(n => ({ ...n, read: true }));
      _updateBadge(false);
      _renderList();

      // Persiste
      try {
        if (typeof NotificationsAPI !== 'undefined') {
          await NotificationsAPI.markAllRead();
        }
      } catch (_) {}
    }, READ_DELAY_MS);
  }

  // ── Enforce max 50 ────────────────────────────────────────────────────────

  async function _enforceMax() {
    if (_notifications.length <= MAX_NOTIFICATIONS) return;
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) return;

    // Ordena por data (mais antigas primeiro) e remove excedente
    const sorted  = [..._notifications].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const toDelete = sorted.slice(0, _notifications.length - MAX_NOTIFICATIONS);
    _notifications = sorted.slice(_notifications.length - MAX_NOTIFICATIONS);

    console.log('[Notifications] limpeza automática — removidas', toDelete.length, 'antigas');

    for (const n of toDelete) {
      try {
        await fetch(
          `${window.SUPABASE_URL}/rest/v1/notifications?id=eq.${n.id}&user_id=eq.${user.id}`,
          { method: 'DELETE', headers: _headers() }
        );
      } catch (_) {}
    }
  }

  // ── Headers ───────────────────────────────────────────────────────────────

  function _headers() {
    const token = typeof Session !== 'undefined' ? Session.getAccessToken() : null;
    if (!token) throw new Error('Usuário não autenticado');
    return {
      'Content-Type':  'application/json',
      'apikey':        window.SUPABASE_KEY,
      'Authorization': 'Bearer ' + token,
      'Prefer':        'return=minimal',
    };
  }

  // ── Open / Close ──────────────────────────────────────────────────────────

  function _openPanel() {
    if (!_panelEl) return;
    _isOpen = true;
    _panelEl.classList.add('open');

    // Mostra loading e carrega
    const list = _panelEl.querySelector('.notif-list');
    if (list && _notifications.length === 0) {
      list.innerHTML = `<div class="notif-loading">
        <div class="notif-shimmer"></div>
        <div class="notif-shimmer"></div>
        <div class="notif-shimmer"></div>
      </div>`;
    }

    _loadAndRender();
    _scheduleMarkRead();
  }

  function _closePanel() {
    if (!_panelEl) return;
    _isOpen = false;
    _panelEl.classList.remove('open');
    clearTimeout(_readTimer);
  }

  function _toggle() {
    _isOpen ? _closePanel() : _openPanel();
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  async function _loadAndRender() {
    try {
      if (typeof NotificationsAPI === 'undefined') return;

      // Busca incluindo arquivadas? Não — só ativas
      const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
      if (!user) return;

      // Filtra archived=false no query
      const token = Session.getAccessToken();
      const url = `${window.SUPABASE_URL}/rest/v1/notifications` +
        `?user_id=eq.${user.id}` +
        `&or=(archived.is.null,archived.eq.false)` +
        `&order=created_at.desc` +
        `&limit=${MAX_NOTIFICATIONS}` +
        `&select=id,user_id,pedido_id,title,message,type,read,archived,created_at`;

      const res = await fetch(url, {
        headers: {
          'Content-Type':  'application/json',
          'apikey':        window.SUPABASE_KEY,
          'Authorization': 'Bearer ' + token,
        }
      });

      if (!res.ok) {
        // Fallback para API
        const rows = await NotificationsAPI.fetchMyNotifications(MAX_NOTIFICATIONS);
        _mergeNotifications(rows.filter(n => !n.archived));
      } else {
        const rows = await res.json();
        if (Array.isArray(rows)) {
          _mergeNotifications(rows.filter(r => !r.archived));
        }
      }

    } catch (e) {
      console.warn('[Notifications] _loadAndRender erro:', e.message);
    }

    await _enforceMax();
    _renderList();
    _updateBadge(false);
  }

  function _mergeNotifications(rows) {
    const map = new Map(_notifications.map(n => [n.id, n]));
    for (const r of rows) {
      if (r.id) map.set(r.id, r);
    }
    _notifications = [...map.values()].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // ── Add nova notificação (via realtime) ───────────────────────────────────

  function _onNewNotification(record) {
    if (!record || !record.id) return;
    if (_localSeen.has(record.id)) {
      console.log('[Notifications] duplicado ignorado (localSeen):', record.id);
      return;
    }
    _localSeen.add(record.id);

    // Impede duplicata no array
    if (_notifications.find(n => n.id === record.id)) return;

    _notifications.unshift(record);
    _enforceMax();
    _updateBadge(true);

    if (_isOpen) _renderList();
  }

  // ── Build DOM ─────────────────────────────────────────────────────────────

  function _buildBell() {
    const wrapper = document.createElement('div');
    wrapper.className = 'notif-bell-wrapper';

    wrapper.innerHTML = `
      <button class="notif-bell-btn" id="notif-bell-btn" aria-label="Notificações" aria-haspopup="true" aria-expanded="false">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <span class="notif-badge" id="notif-badge" aria-live="polite" aria-label="notificações não lidas"></span>
      </button>

      <div class="notif-panel" id="notif-panel" role="menu" aria-hidden="true">
        <div class="notif-panel-header">
          <span class="notif-panel-title">Notificações</span>
          <button class="notif-clear-all-btn" id="notif-clear-all-btn" title="Limpar todas as notificações">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
            Limpar todas
          </button>
        </div>
        <div class="notif-list" id="notif-list"></div>
        <div class="notif-panel-footer" id="notif-footer">máx. ${MAX_NOTIFICATIONS} notificações</div>
      </div>
    `;

    return wrapper;
  }

  // ── Injeção no header ────────────────────────────────────────────────────

  function _inject() {
    // Injeta o bell dentro do auth-header-slot (flex row)
    const authSlot = document.getElementById('auth-header-slot');
    if (!authSlot) {
      console.warn('[Notifications] auth-header-slot não encontrado — tentando novamente em 500ms');
      setTimeout(_inject, 500);
      return;
    }

    // Evita duplicar
    if (document.getElementById('notif-bell-btn')) return;

    // Torna o slot um flex row para bell + widget lado a lado
    authSlot.style.display    = 'flex';
    authSlot.style.alignItems = 'center';
    authSlot.style.gap        = '8px';

    const wrapper = _buildBell();
    authSlot.insertBefore(wrapper, authSlot.firstChild);

    _bellEl  = document.getElementById('notif-bell-btn');
    _badgeEl = document.getElementById('notif-badge');
    _panelEl = document.getElementById('notif-panel');

    // Eventos
    _bellEl.addEventListener('click', (e) => {
      e.stopPropagation();
      _toggle();
      _bellEl.setAttribute('aria-expanded', _isOpen ? 'true' : 'false');
      _panelEl.setAttribute('aria-hidden', _isOpen ? 'false' : 'true');
    });

    document.getElementById('notif-clear-all-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      _clearAll();
    });

    // Delegação de cliques nos botões X
    _panelEl.addEventListener('click', (e) => {
      const dismissBtn = e.target.closest('[data-dismiss-id]');
      if (dismissBtn) {
        e.stopPropagation();
        _dismissOne(dismissBtn.dataset.dismissId);
      }
    });

    // Fecha ao clicar fora
    document.addEventListener('click', (e) => {
      const wrapper = _bellEl?.closest('.notif-bell-wrapper');
      if (wrapper && !wrapper.contains(e.target)) _closePanel();
    }, { passive: true });

    console.log('[Notifications] UI injetada no header');
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function init() {
    if (_initialized) return;
    _initialized = true;

    _injectStyles();
    _inject();

    // Escuta login/logout
    if (typeof Session !== 'undefined') {
      Session.onAuthChange((event, user) => {
        if (event === 'login' && user) {
          _currentUserId = user.id;
          _notifications  = [];
          _localSeen.clear();
          _updateBadge(false);
          _loadAndRender();

          // Inicia realtime com deduplicação
          NotificationsAPI.startRealtime(user.id, _onNewNotification);

          // Polling de badge a cada 60s (fallback)
          clearInterval(window._notifPollInterval);
          window._notifPollInterval = setInterval(async () => {
            if (typeof NotificationsAPI === 'undefined') return;
            const count = await NotificationsAPI.countUnread();
            // Recalcula baseado no cache local — se divergir, recarrega
            if (count !== _unreadCount()) {
              await _loadAndRender();
            }
          }, 60000);

        } else if (event === 'logout') {
          _currentUserId = null;
          _notifications  = [];
          _localSeen.clear();
          _updateBadge(false);
          if (_isOpen) _closePanel();
          clearInterval(window._notifPollInterval);
          NotificationsAPI.stopRealtime();
        }
      });

      // Se já logado ao inicializar
      const user = Session.getCurrentUser();
      if (user) {
        _currentUserId = user.id;
        _loadAndRender();
        NotificationsAPI.startRealtime(user.id, _onNewNotification);
      }
    }
  }

  // ── API Pública ───────────────────────────────────────────────────────────
  return {
    init,
    addNotification: _onNewNotification,  // para forçar do exterior (testes)
    refresh:         _loadAndRender,
    updateBadge:     () => _updateBadge(false),
    close:           _closePanel,
  };

})();

// ── Auto-init ─────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => NotificationsUI.init());
} else {
  NotificationsUI.init();
}
