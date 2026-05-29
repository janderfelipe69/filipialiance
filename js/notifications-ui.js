// ============================================================
// notifications-ui.js — v3 — MARCAR TODAS + LIMPAR LIDAS
// PokeAlliance Shop
//
// CORRIGIDO NESTA VERSÃO (v3):
//  [FIX 1]  Botão "Marcar todas" agora funciona de verdade:
//           - atualiza banco via NotificationsAPI.markAllRead()
//           - atualiza array local imediatamente
//           - zera badge instantaneamente
//           - re-renderiza lista sem F5
//  [FIX 2]  Novo botão "Limpar lidas" — remove do banco e da UI
//           apenas notificações read=true do usuário atual
//  [FIX 3]  Badge conta apenas !n.read (não depende de archived)
//  [FIX 4]  Notificações lidas = opacity reduzida
//  [FIX 5]  Logs de debug: [Notifications] mark all clicked etc.
//  [FIX 6]  Realtime continua funcionando após marcar todas
//  [FIX 7]  Cada usuário afeta apenas suas próprias notificações
//
// Depende de: notifications.js (NotificationsAPI), session.js (Session)
// ============================================================

const NotificationsUI = (() => {
  'use strict';

  // ── Estado global (singleton) ─────────────────────────────────────────────
  let _notifs         = [];         // cache local [{id, title, message, type, read, archived, created_at}]
  let _isOpen         = false;
  let _readTimer      = null;
  let _initialized    = false;
  let _currentUserId  = null;
  const _seen         = new Set();  // deduplicação: IDs já processados

  // Elementos do DOM (populados em _inject)
  let $bell        = null;  // <button> sino
  let $badge       = null;  // <span> contador
  let $panel       = null;  // <div> dropdown
  let $list        = null;  // <div> lista de itens

  const MAX        = 50;
  const READ_DELAY = 2500;

  // ── CSS INJECTION ─────────────────────────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById('nui-styles')) return;
    const s = document.createElement('style');
    s.id = 'nui-styles';
    s.textContent = `

/* ═══════════════════════════════════════════════════
   WRAPPER — mantém panel posicionado relativo ao bell
   ═══════════════════════════════════════════════════ */
.nui-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* ═══════════════════════════════════════════════════
   BOTÃO SINO
   ═══════════════════════════════════════════════════ */
.nui-bell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background: rgba(58,140,255,0.07);
  border: 1.5px solid rgba(58,140,255,0.18);
  border-radius: 10px;
  color: rgba(255,255,255,0.55);
  cursor: pointer;
  transition: background 0.18s, border-color 0.18s, color 0.18s, box-shadow 0.18s;
  flex-shrink: 0;
}
.nui-bell:hover {
  background: rgba(58,140,255,0.14);
  border-color: rgba(58,140,255,0.4);
  color: #fff;
  box-shadow: 0 0 12px rgba(58,140,255,0.2);
}
.nui-bell.is-unread {
  border-color: rgba(58,140,255,0.45);
  color: rgba(255,255,255,0.85);
  box-shadow: 0 0 10px rgba(58,140,255,0.15);
}
.nui-bell.is-unread .nui-bell-icon {
  animation: nui-ring 0.7s ease 0.2s both;
}
@keyframes nui-ring {
  0%,100% { transform: rotate(0deg); }
  15%     { transform: rotate(-14deg); }
  35%     { transform: rotate(14deg); }
  55%     { transform: rotate(-9deg); }
  75%     { transform: rotate(9deg); }
}

/* ═══════════════════════════════════════════════════
   BADGE (bolinha vermelha)
   ═══════════════════════════════════════════════════ */
.nui-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  background: linear-gradient(135deg, #ff4757 0%, #c0392b 100%);
  border: 2.5px solid #040810;
  border-radius: 9px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 9px;
  font-weight: 800;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  pointer-events: none;
  /* escondido por padrão */
  opacity: 0;
  transform: scale(0.4);
  transition: opacity 0.2s, transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
}
.nui-badge.show {
  opacity: 1;
  transform: scale(1);
}
.nui-badge.bump {
  animation: nui-bump 0.32s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes nui-bump {
  0%   { transform: scale(1); }
  45%  { transform: scale(1.45); }
  100% { transform: scale(1); }
}

/* ═══════════════════════════════════════════════════
   DROPDOWN PANEL — glassmorphism
   ═══════════════════════════════════════════════════ */
.nui-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 340px;
  max-width: calc(100vw - 20px);
  /* [FIX 2] flex-column: header fixo + lista rolável + footer fixo */
  display: flex;
  flex-direction: column;
  /* [FIX 2] Limita altura total do painel sem vazar da viewport */
  max-height: min(520px, calc(100dvh - 80px));
  background: linear-gradient(145deg,
    rgba(13,30,61,0.96) 0%,
    rgba(6,14,32,0.97) 55%,
    rgba(4,8,16,0.98) 100%);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(58,140,255,0.2);
  border-radius: 14px;
  box-shadow:
    0 0 0 1px rgba(58,140,255,0.05) inset,
    0 2px 0 rgba(58,140,255,0.1) inset,
    0 20px 60px rgba(0,0,0,0.65),
    0 4px 20px rgba(0,0,0,0.4);
  z-index: 10001;
  /* [FIX 1] overflow:hidden cortava o footer e botões de ação ao rolar.
     O clip visual (border-radius) é mantido via overflow:hidden apenas
     no eixo X; o scroll acontece só dentro do .nui-list. */
  overflow: hidden;
  /* fechado */
  opacity: 0;
  transform: translateY(-10px) scale(0.96);
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
}
.nui-panel.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: all;
}

/* ═══════════════════════════════════════════════════
   HEADER DO DROPDOWN
   ═══════════════════════════════════════════════════ */
.nui-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 14px 11px;
  border-bottom: 1px solid rgba(58,140,255,0.1);
  gap: 6px;
  /* [FIX 2] Header fixo — não comprime quando a lista cresce */
  flex-shrink: 0;
}
.nui-title {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 11.5px;
  font-weight: 700;
  color: rgba(255,255,255,0.88);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  flex: 1;
}

/* Botões do header */
.nui-header-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  /* [FIX 1] overflow:visible garante que nenhum botão seja cortado
     pelo container pai mesmo em telas menores */
  overflow: visible;
}

/* [FIX 4] Responsividade mobile: compacta texto dos botões */
@media (max-width: 400px) {
  .nui-panel {
    width: calc(100vw - 20px);
    right: -10px;
  }
  .nui-mark-all  { font-size: 10px; padding: 4px 6px; }
  .nui-clear-read { font-size: 10px; padding: 4px 6px; }
}

/* Botão "Marcar todas" */
.nui-mark-all {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 9px;
  background: rgba(58,140,255,0.07);
  border: 1px solid rgba(58,140,255,0.22);
  border-radius: 7px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11px;
  font-weight: 700;
  color: rgba(58,140,255,0.7);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s;
}
.nui-mark-all:hover {
  background: rgba(58,140,255,0.14);
  border-color: rgba(58,140,255,0.5);
  color: #3a8cff;
  box-shadow: 0 0 10px rgba(58,140,255,0.15);
}
.nui-mark-all:disabled {
  opacity: 0.35;
  cursor: default;
  pointer-events: none;
}

/* Botão "Limpar lidas" */
.nui-clear-read {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 9px;
  background: rgba(255,165,2,0.07);
  border: 1px solid rgba(255,165,2,0.22);
  border-radius: 7px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11px;
  font-weight: 700;
  color: rgba(255,165,2,0.65);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s;
}
.nui-clear-read:hover {
  background: rgba(255,165,2,0.14);
  border-color: rgba(255,165,2,0.5);
  color: #ffa502;
  box-shadow: 0 0 10px rgba(255,165,2,0.15);
}
.nui-clear-read:disabled {
  opacity: 0.35;
  cursor: default;
  pointer-events: none;
}

/* Botão "Limpar todas" */
.nui-clear-all {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 9px;
  background: rgba(255,71,87,0.07);
  border: 1px solid rgba(255,71,87,0.22);
  border-radius: 7px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11px;
  font-weight: 700;
  color: rgba(255,71,87,0.65);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s;
}
.nui-clear-all:hover {
  background: rgba(255,71,87,0.14);
  border-color: rgba(255,71,87,0.5);
  color: #ff4757;
  box-shadow: 0 0 10px rgba(255,71,87,0.15);
}

/* ═══════════════════════════════════════════════════
   LISTA SCROLLÁVEL
   ═══════════════════════════════════════════════════ */
.nui-list {
  /* [FIX 2] flex:1 + min-height:0 é o padrão correto para scroll
     dentro de um flex-column. O max-height fixo anterior (370px)
     ignorava o espaço ocupado por header/footer e fazia o panel
     "vazar" para além do max-height total. Agora a lista ocupa
     o espaço restante e scrolla internamente. */
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 5px 5px 5px;
  scrollbar-width: thin;
  scrollbar-color: rgba(58,140,255,0.25) transparent;
}
.nui-list::-webkit-scrollbar       { width: 4px; }
.nui-list::-webkit-scrollbar-track { background: transparent; }
.nui-list::-webkit-scrollbar-thumb { background: rgba(58,140,255,0.25); border-radius: 2px; }

/* ═══════════════════════════════════════════════════
   ESTADO VAZIO
   ═══════════════════════════════════════════════════ */
.nui-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 38px 20px;
  color: rgba(255,255,255,0.18);
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  user-select: none;
}
.nui-empty-icon {
  opacity: 0.25;
}

/* ═══════════════════════════════════════════════════
   ITEM DE NOTIFICAÇÃO
   ═══════════════════════════════════════════════════ */
.nui-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 8px 9px 12px;
  border-radius: 9px;
  cursor: default;
  position: relative;
  /* entrada suave */
  animation: nui-item-in 0.28s cubic-bezier(0.34,1.56,0.64,1) both;
  transition: background 0.15s, opacity 0.15s;
}
@keyframes nui-item-in {
  from { opacity: 0; transform: translateY(6px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)  scale(1); }
}
.nui-item:hover {
  background: rgba(58,140,255,0.07);
}

/* [FIX 4] Notificações lidas: opacity reduzida */
.nui-item.read-item {
  opacity: 0.45;
}
.nui-item.read-item:hover {
  opacity: 0.7;
}

/* barra lateral azul = não lida */
.nui-item.unread {
  background: rgba(58,140,255,0.05);
  opacity: 1;
}
.nui-item.unread::before {
  content: '';
  position: absolute;
  left: 0; top: 7px; bottom: 7px;
  width: 2.5px;
  background: linear-gradient(to bottom, #3a8cff, #60aaff);
  border-radius: 2px;
}

/* ── Saída (fade + slide) ── */
.nui-item.removing {
  pointer-events: none;
  animation: nui-item-out 0.22s ease forwards;
  overflow: hidden;
}
@keyframes nui-item-out {
  0%   {
    opacity: 1;
    transform: translateX(0) scale(1);
    max-height: 120px;
    padding-top: 9px;
    padding-bottom: 9px;
    margin-bottom: 0;
  }
  100% {
    opacity: 0;
    transform: translateX(28px) scale(0.95);
    max-height: 0;
    padding-top: 0;
    padding-bottom: 0;
    margin-bottom: 0;
  }
}

/* ═══════════════════════════════════════════════════
   ÍCONE TIPO
   ═══════════════════════════════════════════════════ */
.nui-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  margin-top: 1px;
}
.nui-icon.t-info    { background: rgba(58,140,255,0.13); }
.nui-icon.t-success { background: rgba(46,213,115,0.13); }
.nui-icon.t-warning { background: rgba(255,165,2,0.13);  }
.nui-icon.t-error   { background: rgba(255,71,87,0.13);  }
.nui-icon.t-order   { background: rgba(255,214,102,0.12); }

/* ═══════════════════════════════════════════════════
   CONTEÚDO TEXTO
   ═══════════════════════════════════════════════════ */
.nui-body  { flex: 1; min-width: 0; }
.nui-name  {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 12.5px;
  font-weight: 700;
  color: rgba(255,255,255,0.88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}
.nui-msg {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 11.5px;
  color: rgba(255,255,255,0.42);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.nui-time {
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 10px;
  color: rgba(255,255,255,0.2);
  margin-top: 4px;
}

/* ═══════════════════════════════════════════════════
   BOTÃO X (dismiss individual)
   ═══════════════════════════════════════════════════ */
.nui-dismiss {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: none;
  border: none;
  border-radius: 6px;
  color: rgba(255,255,255,0.18);
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 3px;
  /* aparece só no hover do item pai */
  opacity: 0;
  transition: background 0.14s, color 0.14s, opacity 0.14s;
}
.nui-item:hover .nui-dismiss {
  opacity: 1;
}
.nui-dismiss:hover {
  background: rgba(255,71,87,0.13);
  color: #ff4757;
}

/* ═══════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════ */
.nui-footer {
  padding: 7px 14px 11px;
  border-top: 1px solid rgba(58,140,255,0.07);
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 10px;
  color: rgba(255,255,255,0.15);
  text-align: center;
  /* [FIX 2] Footer fixo — não comprime quando a lista cresce */
  flex-shrink: 0;
}

/* ═══════════════════════════════════════════════════
   LOADING SHIMMER
   ═══════════════════════════════════════════════════ */
.nui-shimmer-wrap { padding: 8px; display: flex; flex-direction: column; gap: 8px; }
.nui-shimmer {
  height: 54px;
  border-radius: 9px;
  background: linear-gradient(90deg,
    rgba(58,140,255,0.04) 25%,
    rgba(58,140,255,0.09) 50%,
    rgba(58,140,255,0.04) 75%);
  background-size: 200% 100%;
  animation: nui-shimmer-anim 1.5s ease-in-out infinite;
}
@keyframes nui-shimmer-anim {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}
    `;
    document.head.appendChild(s);
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────
  function _esc(s) {
    return String(s||'')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function _ago(dateStr) {
    if (!dateStr) return '';
    const m = Math.floor((Date.now() - new Date(dateStr)) / 60000);
    if (m < 1)   return 'agora';
    if (m < 60)  return `${m}min atrás`;
    const h = Math.floor(m / 60);
    if (h < 24)  return `${h}h atrás`;
    return `${Math.floor(h/24)}d atrás`;
  }

  const _ICONS = { success:'✅', warning:'⚠️', error:'🔴', order:'📦', info:'🔔' };
  function _icon(type) { return _ICONS[type] || '🔔'; }

  // [FIX 3] Conta apenas !n.read — não depende de archived
  function _countUnread() {
    return _notifs.filter(n => !n.read && !n.archived).length;
  }

  function _headers() {
    const tok = typeof Session !== 'undefined' ? Session.getAccessToken() : null;
    if (!tok) throw new Error('sem token');
    return {
      'Content-Type' : 'application/json',
      'apikey'       : window.SUPABASE_KEY,
      'Authorization': 'Bearer ' + tok,
      'Prefer'       : 'return=minimal',
    };
  }

  // ── BADGE ─────────────────────────────────────────────────────────────────
  function _badge(bump) {
    if (!$badge) return;
    const n = _countUnread();
    $badge.textContent = n > 99 ? '99+' : String(n);
    const show = n > 0;
    $badge.classList.toggle('show', show);
    if ($bell) $bell.classList.toggle('is-unread', show);
    if (!show) $badge.classList.remove('bump');
    if (bump && show) {
      $badge.classList.remove('bump');
      requestAnimationFrame(() => $badge.classList.add('bump'));
    }

    // Atualiza estado dos botões de ação
    _updateActionButtons();
  }

  // Atualiza disabled dos botões conforme estado atual
  function _updateActionButtons() {
    const $markAll   = document.getElementById('nui-mark-all');
    const $clearRead = document.getElementById('nui-clear-read');
    if ($markAll) {
      const hasUnread = _notifs.filter(n => !n.read && !n.archived).length > 0;
      $markAll.disabled = !hasUnread;
    }
    if ($clearRead) {
      const hasRead = _notifs.filter(n => n.read && !n.archived).length > 0;
      $clearRead.disabled = !hasRead;
    }
  }

  // ── RENDER LIST (completo, só quando necessário) ──────────────────────────
  function _render() {
    if (!$list) return;
    const visible = _notifs.filter(n => !n.archived);
    if (visible.length === 0) {
      $list.innerHTML = `
        <div class="nui-empty">
          <svg class="nui-empty-icon" width="34" height="34" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="1.4"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
            <line x1="4" y1="4" x2="20" y2="20" stroke-width="1.8"/>
          </svg>
          Nenhuma notificação
        </div>`;
      _updateActionButtons();
      return;
    }
    // [FIX 4] Lidas = classe read-item (opacity menor); não lidas = classe unread
    $list.innerHTML = visible.map(n => `
      <div class="nui-item ${n.read ? 'read-item' : 'unread'}" data-nid="${_esc(n.id)}">
        <div class="nui-icon t-${_esc(n.type||'info')}">${_icon(n.type)}</div>
        <div class="nui-body">
          <div class="nui-name">${_esc(n.title || 'Notificação')}</div>
          <div class="nui-msg">${_esc(n.message || n.content || '')}</div>
          <div class="nui-time">${_ago(n.created_at)}</div>
        </div>
        <button class="nui-dismiss" data-nid="${_esc(n.id)}"
                title="Remover" aria-label="Remover notificação">
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="1" y1="1" x2="8" y2="8"/>
            <line x1="8" y1="1" x2="1" y2="8"/>
          </svg>
        </button>
      </div>`).join('');
    _updateActionButtons();
  }

  // ── REMOVE ITEM DA UI COM ANIMAÇÃO ────────────────────────────────────────
  function _animateOut(id, afterFn) {
    if (!$list) { afterFn && afterFn(); return; }
    const el = $list.querySelector(`[data-nid="${id}"]:not(.nui-dismiss)`);
    if (!el) { afterFn && afterFn(); return; }
    el.classList.add('removing');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.remove();
      afterFn && afterFn();
    };
    el.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, 350);
  }

  // ── DISMISS INDIVIDUAL ────────────────────────────────────────────────────
  async function _removeOne(id) {
    if (!id) return;
    _notifs = _notifs.filter(n => n.id !== id);
    _animateOut(id, () => {
      const remaining = $list ? $list.querySelectorAll('.nui-item:not(.removing)').length : 0;
      if (remaining === 0) _render();
    });
    _badge(false);
    _persist_archive_one(id);
  }

  async function _persist_archive_one(id) {
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) return;
    try {
      const r = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications?id=eq.${id}&user_id=eq.${user.id}`,
        { method: 'PATCH', headers: _headers(), body: JSON.stringify({ archived: true, read: true }) }
      );
      if (!r.ok) throw new Error('patch fail');
    } catch {
      try {
        const user2 = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
        if (!user2) return;
        await fetch(
          `${window.SUPABASE_URL}/rest/v1/notifications?id=eq.${id}&user_id=eq.${user2.id}`,
          { method: 'DELETE', headers: _headers() }
        );
      } catch (_) {}
    }
  }

  // ── MARK ALL READ ─────────────────────────────────────────────────────────
  // [FIX 1] Implementação completa com logs, update local e banco
  async function _markAllRead() {
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) {
      console.warn('[Notifications] mark all clicked — usuário não logado, abortando');
      return;
    }

    const $btn = document.getElementById('nui-mark-all');
    if ($btn) $btn.disabled = true;

    const unreadBefore = _notifs.filter(n => !n.read && !n.archived).length;

    // 1. Atualiza array local IMEDIATAMENTE (sem esperar o banco)
    _notifs = _notifs.map(n => ({ ...n, read: true }));

    // 2. Zera badge imediatamente
    _badge(false);

    // 3. Re-renderiza a lista (lidas ficam com opacity menor)
    _render();

    // 4. Persiste no banco (fire and forget com retry)
    try {
      // Tenta via NotificationsAPI primeiro (que tem fallback RPC)
      if (typeof NotificationsAPI !== 'undefined') {
        await NotificationsAPI.markAllRead();
      } else {
        // Fallback direto REST se NotificationsAPI não disponível
        await fetch(
          `${window.SUPABASE_URL}/rest/v1/notifications` +
          `?user_id=eq.${user.id}&read=eq.false`,
          {
            method:  'PATCH',
            headers: _headers(),
            body:    JSON.stringify({ read: true }),
          }
        );
      }
    } catch (e) {
      console.warn('[Notifications] markAllRead banco falhou:', e.message);
    }

    if ($btn) $btn.disabled = false;
    _updateActionButtons();
  }

  // ── CLEAR READ (Limpar lidas) ─────────────────────────────────────────────
  // [FIX 2] Remove apenas notificações read=true do usuário atual
  async function _clearRead() {
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) return;

    const $btn = document.getElementById('nui-clear-read');
    if ($btn) $btn.disabled = true;

    const readIds = _notifs.filter(n => n.read && !n.archived).map(n => n.id);

    // 1. Remove do array local
    _notifs = _notifs.filter(n => !n.read || n.archived);

    // 2. Re-renderiza
    _render();
    _badge(false);

    // 3. Persiste no banco — delete apenas lidas do usuário atual
    if (readIds.length > 0) {
      try {
        await fetch(
          `${window.SUPABASE_URL}/rest/v1/notifications` +
          `?user_id=eq.${user.id}&read=eq.true`,
          { method: 'DELETE', headers: _headers() }
        );
      } catch (e) {
        console.warn('[Notifications] clearRead banco falhou:', e.message);
      }
    }

    if ($btn) $btn.disabled = false;
    _updateActionButtons();
  }

  // ── CLEAR ALL ─────────────────────────────────────────────────────────────
  async function _clearAll() {
    _notifs = [];
    _render();
    _badge(false);
    _persist_archive_all();
  }

  async function _persist_archive_all() {
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) return;
    try {
      const r = await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications?user_id=eq.${user.id}`,
        { method: 'PATCH', headers: _headers(), body: JSON.stringify({ archived: true, read: true }) }
      );
      if (!r.ok) throw new Error('patch fail');
    } catch {
      try {
        const user2 = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
        if (!user2) return;
        await fetch(
          `${window.SUPABASE_URL}/rest/v1/notifications?user_id=eq.${user2.id}`,
          { method: 'DELETE', headers: _headers() }
        );
      } catch (_) {}
    }
  }

  // ── MARK ALL READ (após 2.5s com dropdown aberto) ─────────────────────────
  function _scheduleRead() {
    clearTimeout(_readTimer);
    _readTimer = setTimeout(async () => {
      if (!_isOpen || _countUnread() === 0) return;
      // Usa a mesma função de marcar todas para consistência
      await _markAllRead();
    }, READ_DELAY);
  }

  // ── OPEN / CLOSE ──────────────────────────────────────────────────────────
  function _open() {
    if (!$panel) return;
    _isOpen = true;
    $panel.classList.add('open');
    $bell?.setAttribute('aria-expanded', 'true');
    $panel.setAttribute('aria-hidden', 'false');

    if (_notifs.length === 0 && $list) {
      $list.innerHTML = `<div class="nui-shimmer-wrap">
        <div class="nui-shimmer"></div>
        <div class="nui-shimmer"></div>
        <div class="nui-shimmer"></div>
      </div>`;
    }
    _load();
    _scheduleRead();
  }

  function _close() {
    if (!$panel) return;
    _isOpen = false;
    $panel.classList.remove('open');
    $bell?.setAttribute('aria-expanded', 'false');
    $panel.setAttribute('aria-hidden', 'true');
    clearTimeout(_readTimer);
  }

  function _toggle() { _isOpen ? _close() : _open(); }

  // ── LOAD FROM API ─────────────────────────────────────────────────────────
  async function _load() {
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (!user) return;
    try {
      const tok = Session.getAccessToken();
      const url = `${window.SUPABASE_URL}/rest/v1/notifications`
        + `?user_id=eq.${user.id}`
        + `&or=(archived.is.null,archived.eq.false)`
        + `&order=created_at.desc`
        + `&limit=${MAX}`
        + `&select=id,user_id,pedido_id,title,message,type,read,archived,created_at`;

      const r = await fetch(url, {
        headers: {
          'Content-Type' : 'application/json',
          'apikey'       : window.SUPABASE_KEY,
          'Authorization': 'Bearer ' + tok,
        }
      });

      if (r.ok) {
        const rows = await r.json();
        if (Array.isArray(rows)) _merge(rows.filter(x => !x.archived));
      } else if (typeof NotificationsAPI !== 'undefined') {
        const rows = await NotificationsAPI.fetchMyNotifications(MAX);
        _merge(rows.filter(x => !x.archived));
      }
    } catch (e) {
      console.warn('[NotificationsUI] load error:', e.message);
      if (typeof NotificationsAPI !== 'undefined') {
        try {
          const rows = await NotificationsAPI.fetchMyNotifications(MAX);
          _merge(rows.filter(x => !x.archived));
        } catch (_) {}
      }
    }
    _render();
    _badge(false);
  }

  function _merge(rows) {
    const map = new Map(_notifs.map(n => [n.id, n]));
    for (const r of rows) {
      if (r.id) { _seen.add(r.id); map.set(r.id, r); }
    }
    _notifs = [...map.values()]
      .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, MAX);
  }

  // ── NOVA NOTIFICAÇÃO (realtime) ───────────────────────────────────────────
  // [FIX 6] Realtime continua funcionando após marcar todas
  function _onNew(rec) {
    if (!rec || !rec.id) return;
    if (_seen.has(rec.id)) return;
    _seen.add(rec.id);
    if (_notifs.find(n => n.id === rec.id)) return;

    // Nova notificação sempre chega como não lida
    const newRec = { ...rec, read: rec.read === true ? true : false };
    _notifs.unshift(newRec);
    if (_notifs.length > MAX) _notifs = _notifs.slice(0, MAX);
    _badge(true);
    if (_isOpen) _render();
  }

  // ── BUILD DOM ─────────────────────────────────────────────────────────────
  function _buildHTML() {
    return `
      <button class="nui-bell" id="nui-bell"
              aria-label="Notificações" aria-haspopup="true" aria-expanded="false">
        <svg class="nui-bell-icon" width="16" height="16" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <span class="nui-badge" id="nui-badge" aria-live="polite"></span>
      </button>

      <div class="nui-panel" id="nui-panel" role="dialog"
           aria-label="Notificações" aria-hidden="true">

        <div class="nui-header">
          <span class="nui-title">Notificações</span>
          <div class="nui-header-actions">
            <button class="nui-mark-all" id="nui-mark-all" title="Marcar todas como lidas">
              ✓ Marcar todas
            </button>
            <button class="nui-clear-read" id="nui-clear-read" title="Remover notificações lidas">
              🧹 Limpar lidas
            </button>
            <button class="nui-clear-all" id="nui-clear-all" title="Remover todas as notificações">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="nui-list" id="nui-list"></div>

        <div class="nui-footer">máx. ${MAX} notificações por usuário</div>
      </div>`;
  }

  // ── INJEÇÃO NO HEADER ─────────────────────────────────────────────────────
  function _outsideClick(e) {
    const wrap = document.getElementById('nui-wrap');
    if (wrap && !wrap.contains(e.target)) _close();
  }

  // [FIX 1 — ROOT CAUSE] session.js usa container.innerHTML = ... no auth-header-slot
  // ao fazer login/logout. Isso DESTRÓI o nui-wrap injetado, inclusive todos os
  // botões (Marcar todas, Limpar lidas). A solução é um MutationObserver no slot
  // que detecta a remoção do nui-wrap e o reinjecta automaticamente.
  let _slotObserver = null;

  function _attachSlotObserver(authSlot) {
    if (_slotObserver) _slotObserver.disconnect();
    _slotObserver = new MutationObserver(() => {
      if (!document.getElementById('nui-bell')) {
        _injectInto(authSlot);
      }
    });
    _slotObserver.observe(authSlot, { childList: true, subtree: false });
  }

  function _injectInto(authSlot) {
    // Garante que não duplique
    const existing = document.getElementById('nui-wrap');
    if (existing) existing.remove();

    const wrap = document.createElement('div');
    wrap.className = 'nui-wrap';
    wrap.id = 'nui-wrap';
    wrap.innerHTML = _buildHTML();

    authSlot.style.cssText += ';display:flex;align-items:center;gap:8px;';
    authSlot.insertBefore(wrap, authSlot.firstChild);

    $bell  = document.getElementById('nui-bell');
    $badge = document.getElementById('nui-badge');
    $panel = document.getElementById('nui-panel');
    $list  = document.getElementById('nui-list');

    // ── Evento: toggle ao clicar no sino ──
    $bell.addEventListener('click', e => {
      e.stopPropagation();
      _toggle();
    });

    // ── Evento delegado no panel: botões de ação + botões X ──
    // [FIX 3] Usando event delegation no $panel em vez de getElementById direto,
    // pois se o HTML for recriado os listeners não são perdidos (o $panel é
    // recriado aqui, então basta anexar uma única vez ao novo elemento).
    $panel.addEventListener('click', e => {
      e.stopPropagation();
      if (e.target.closest('#nui-mark-all'))   { _markAllRead(); return; }
      if (e.target.closest('#nui-clear-read')) { _clearRead();   return; }
      if (e.target.closest('#nui-clear-all'))  { _clearAll();    return; }
      const btn = e.target.closest('.nui-dismiss');
      if (btn) {
        const id = btn.dataset.nid;
        if (id) _removeOne(id);
      }
    });

    // ── Fecha ao clicar fora ──
    document.removeEventListener('click', _outsideClick);
    document.addEventListener('click', _outsideClick);


    // Restaura o badge e estado visual
    _badge(false);
    if (_isOpen) _render();
  }

  function _inject() {
    if (document.getElementById('nui-bell')) return;

    const authSlot = document.getElementById('auth-header-slot');
    if (!authSlot) {
      setTimeout(_inject, 400);
      return;
    }

    _injectInto(authSlot);
    _attachSlotObserver(authSlot);
  }

  // ── REALTIME ──────────────────────────────────────────────────────────────
  function _startRealtime(userId) {
    if (typeof NotificationsAPI === 'undefined') return;
    NotificationsAPI.stopRealtime();
    NotificationsAPI.startRealtime(userId, _onNew);
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  function init() {
    if (_initialized) return;
    _initialized = true;

    _injectStyles();
    _inject();

    if (typeof Session === 'undefined') return;

    Session.onAuthChange((event, user) => {
      if (event === 'login' && user) {
        _currentUserId = user.id;
        _notifs = [];
        _seen.clear();
        _badge(false);
        if (_isOpen) _render();
        _load();
        _startRealtime(user.id);

        clearInterval(window.__nuiPoll);
        window.__nuiPoll = setInterval(async () => {
          if (typeof NotificationsAPI === 'undefined') return;
          try {
            const serverCount = await NotificationsAPI.countUnread();
            if (serverCount !== _countUnread()) _load();
          } catch (_) {}
        }, 60_000);

      } else if (event === 'logout') {
        _currentUserId = null;
        _notifs = [];
        _seen.clear();
        _badge(false);
        if (_isOpen) { _close(); _render(); }
        clearInterval(window.__nuiPoll);
        if (typeof NotificationsAPI !== 'undefined') NotificationsAPI.stopRealtime();
      }
    });

    const user = Session.getCurrentUser();
    if (user) {
      _currentUserId = user.id;
      _load();
      _startRealtime(user.id);
    }
  }

  // ── API PÚBLICA ───────────────────────────────────────────────────────────
  return {
    init,
    push    : _onNew,
    refresh : _load,
    close   : _close,
  };

})();

// ── AUTO-INIT ─────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => NotificationsUI.init());
} else {
  NotificationsUI.init();
}
