// ============================================================
// session.js — Gerenciamento de sessão ativa
// PokeAlliance Shop — Sistema de Autenticação
//
// Este módulo mantém o estado do usuário em memória e
// sincroniza a UI com o estado de login/logout.
// Depende de: user-storage.js
// ============================================================

const Session = (() => {
  // Estado em memória — fonte de verdade durante a navegação
  let _currentUser = null;

  // ── Callbacks para notificar outros módulos ──────────────────────────────
  // Padrão Observer: permite que outros módulos escutem mudanças de sessão
  // Útil para: carrinho salvo, histórico, permissões futuras
  const _listeners = [];

  function onAuthChange(callback) {
    _listeners.push(callback);
  }

  function _notifyListeners(eventType, user) {
    _listeners.forEach(cb => {
      try { cb(eventType, user); } catch (e) { /* não deixa um listener quebrar os outros */ }
    });
  }

  // ── Inicialização ────────────────────────────────────────────────────────
  /**
   * Deve ser chamado no DOMContentLoaded.
   * Recupera sessão persistida e atualiza a UI automaticamente.
   */
  function init() {
    const session = UserStorage.getSession();
    if (session) {
      const user = UserStorage.getUserById(session.userId);
      if (user) {
        _currentUser = user;
        _renderLoggedIn(user);
        _notifyListeners('login', user);
      } else {
        // Usuário deletado mas sessão ainda existe → limpa
        UserStorage.clearSession();
      }
    }
    // Se não há sessão, a UI padrão (botão Login) já está no HTML
  }

  // ── Login/Logout ─────────────────────────────────────────────────────────
  function login(user) {
    _currentUser = user;
    UserStorage.saveSession(user);
    _renderLoggedIn(user);
    _notifyListeners('login', user);
  }

  function logout() {
    _currentUser = null;
    UserStorage.clearSession();
    _renderLoggedOut();
    _notifyListeners('logout', null);
  }

  function getCurrentUser() {
    return _currentUser;
  }

  function isLoggedIn() {
    return _currentUser !== null;
  }

  // ── Renderização da UI do Header ─────────────────────────────────────────
  /**
   * Gera as iniciais do nickname para o avatar padrão.
   * Ex: "Filipe123" → "FI"
   */
  function _getInitials(nickname) {
    return (nickname || '?').slice(0, 2).toUpperCase();
  }

  /**
   * Atualiza o header com informações do usuário logado.
   * Substitui o botão de login pelo widget de usuário.
   */
  function _renderLoggedIn(user) {
    const container = document.getElementById('auth-header-slot');
    if (!container) return;

    const initials = _getInitials(user.nickname);

    container.innerHTML = `
      <div class="auth-user-widget" id="auth-user-widget">
        <!-- Avatar com iniciais -->
        <div class="auth-avatar" aria-label="Avatar de ${user.nickname}">
          ${user.avatar
            ? `<img src="${user.avatar}" alt="${user.nickname}" />`
            : `<span class="auth-avatar-initials">${initials}</span>`
          }
          <span class="auth-status-dot" aria-hidden="true"></span>
        </div>

        <!-- Nome do usuário -->
        <div class="auth-user-info">
          <span class="auth-nickname" title="${user.nickname}">
            ${_truncate(user.nickname, 12)}
          </span>
          <span class="auth-server-tag">🌙 Moon</span>
        </div>

        <!-- Menu dropdown -->
        <button class="auth-menu-btn" onclick="Session._toggleMenu()" aria-label="Menu do usuário" aria-expanded="false" id="auth-menu-btn">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M1 3l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          </svg>
        </button>

        <!-- Dropdown -->
        <div class="auth-dropdown" id="auth-dropdown" role="menu" aria-hidden="true">
          <div class="auth-dropdown-header">
            <div class="auth-dropdown-nick">${user.nickname}</div>
            <div class="auth-dropdown-email">${user.email}</div>
          </div>
          <div class="auth-dropdown-divider"></div>
          <button class="auth-dropdown-item" onclick="Session._openMyAccount()" role="menuitem">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
            Minha Conta
          </button>
          <div class="auth-dropdown-divider"></div>
          <button class="auth-dropdown-item auth-dropdown-item--danger" onclick="Session._confirmLogout()" role="menuitem">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sair da Conta
          </button>
        </div>
      </div>
    `;

    // Fecha o dropdown ao clicar fora
    document.addEventListener('click', _handleOutsideClick, { passive: true });
  }

  function _renderLoggedOut() {
    const container = document.getElementById('auth-header-slot');
    if (!container) return;

    container.innerHTML = `
      <button class="auth-login-btn" onclick="AuthModal.open('login')" aria-label="Entrar na sua conta">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
        <span>Entrar</span>
      </button>
    `;

    document.removeEventListener('click', _handleOutsideClick);
  }

  // ── Helpers da UI ────────────────────────────────────────────────────────
  function _truncate(str, max) {
    return str.length > max ? str.slice(0, max) + '…' : str;
  }

  function _handleOutsideClick(e) {
    const widget = document.getElementById('auth-user-widget');
    if (widget && !widget.contains(e.target)) {
      _closeMenu();
    }
  }

  function _toggleMenu() {
    const dd = document.getElementById('auth-dropdown');
    const btn = document.getElementById('auth-menu-btn');
    if (!dd) return;
    const isOpen = dd.classList.contains('open');
    if (isOpen) {
      _closeMenu();
    } else {
      dd.classList.add('open');
      dd.setAttribute('aria-hidden', 'false');
      btn && btn.setAttribute('aria-expanded', 'true');
    }
  }

  function _closeMenu() {
    const dd = document.getElementById('auth-dropdown');
    const btn = document.getElementById('auth-menu-btn');
    if (dd) { dd.classList.remove('open'); dd.setAttribute('aria-hidden', 'true'); }
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function _confirmLogout() {
    _closeMenu();
    AuthModal.openLogoutConfirm();
  }

  function _openMyAccount() {
    _closeMenu();
    AuthModal.openMyAccount();
  }

  // ── Exporta API pública ───────────────────────────────────────────────────
  return {
    init,
    login,
    logout,
    getCurrentUser,
    isLoggedIn,
    onAuthChange,
    // Métodos internos da UI expostos para os onclick inline:
    _toggleMenu,
    _closeMenu,
    _confirmLogout,
    _openMyAccount,
  };
})();
