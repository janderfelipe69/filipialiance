// ============================================================
// session.js — Gerenciamento de Sessão com Supabase  [CORRIGIDO]
// PokeAlliance Shop
//
// CORREÇÃO APLICADA:
//   - role fallback era 'consumer' em dois lugares — corrigido para 'user'
//     (deve bater com o CHECK CONSTRAINT do banco: IN ('user', 'admin'))
//
// Depende de: supabase-client.js
// ============================================================

const Session = (() => {
  'use strict';

  const KEYS = {
    ACCESS_TOKEN:  'pa_sb_access_token',
    REFRESH_TOKEN: 'pa_sb_refresh_token',
    TOKEN_EXPIRY:  'pa_sb_token_expiry',
  };

  let _currentUser  = null;
  let _accessToken  = null;
  let _refreshToken = null;
  let _initialized  = false;
  let _refreshTimer = null;

  const _listeners = [];

  function onAuthChange(callback) {
    if (_listeners.includes(callback)) return;
    _listeners.push(callback);
    if (_initialized) {
      try { callback(_currentUser ? 'login' : 'logout', _currentUser); } catch (_) {}
    }
  }

  function _notify(eventType, user) {
    console.log(`[Session] 🔔 Evento: ${eventType}`, user ? `(${user.nickname || user.email})` : '');
    _listeners.forEach(cb => {
      try { cb(eventType, user); } catch (e) {
        console.warn('[Session] Erro em listener:', e);
      }
    });
  }

  // ── Persistência de Tokens ───────────────────────────────────────────────

  function _saveTokens(accessToken, refreshToken, expiresIn) {
    _accessToken  = accessToken;
    _refreshToken = refreshToken;
    const expiry  = Date.now() + (expiresIn || 3600) * 1000;
    try {
      localStorage.setItem(KEYS.ACCESS_TOKEN,  accessToken);
      localStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
      localStorage.setItem(KEYS.TOKEN_EXPIRY,  String(expiry));
    } catch (e) {
      console.warn('[Session] Falha ao salvar tokens:', e);
    }
    _scheduleRefresh(expiresIn || 3600);
  }

  function _loadTokensFromStorage() {
    try {
      _accessToken  = localStorage.getItem(KEYS.ACCESS_TOKEN);
      _refreshToken = localStorage.getItem(KEYS.REFRESH_TOKEN);
      return !!_accessToken;
    } catch {
      return false;
    }
  }

  function _clearTokens() {
    _accessToken  = null;
    _refreshToken = null;
    if (_refreshTimer) { clearTimeout(_refreshTimer); _refreshTimer = null; }
    try {
      localStorage.removeItem(KEYS.ACCESS_TOKEN);
      localStorage.removeItem(KEYS.REFRESH_TOKEN);
      localStorage.removeItem(KEYS.TOKEN_EXPIRY);
    } catch (_) {}
  }

  function _isTokenExpired() {
    try {
      const expiry = parseInt(localStorage.getItem(KEYS.TOKEN_EXPIRY) || '0', 10);
      return Date.now() > expiry - 60_000;
    } catch {
      return true;
    }
  }

  // ── Renovação Automática de Token ────────────────────────────────────────

  function _scheduleRefresh(expiresInSeconds) {
    if (_refreshTimer) clearTimeout(_refreshTimer);
    // Renova a 75% do tempo de vida (ex: token 1h → renova em 45min)
    // Mínimo de 30s para não travar em tokens curtos
    const delay = Math.max(expiresInSeconds * 0.75 * 1000, 30_000);
    _refreshTimer = setTimeout(_doRefresh, delay);
    console.log(`[Session] ⏱ Token será renovado em ${Math.round(delay / 60000)} min.`);
  }

  async function _doRefresh() {
    if (!_refreshToken) return;
    console.log('[Session] 🔄 Renovando token de sessão...');
    let attempts = 0;
    while (attempts < 2) {
      try {
        const data = await SupabaseClient.Auth.refreshToken(_refreshToken);
        _saveTokens(data.access_token, data.refresh_token, data.expires_in);
        console.log('[Session] ✅ Token renovado com sucesso.');
        return;
      } catch (e) {
        attempts++;
        console.warn(`[Session] ⚠️ Falha ao renovar token (tentativa ${attempts}/2):`, e.message);
        if (attempts < 2) await new Promise(r => setTimeout(r, 3000)); // aguarda 3s antes de retry
      }
    }
    console.warn('[Session] ❌ Refresh esgotado. Fazendo logout.');
    await logout();
  }

  // ── Carregamento de Perfil ───────────────────────────────────────────────

  async function _loadProfile(authUserId, jwt) {
    console.log('[Session] 📋 Carregando perfil do banco...');
    try {
      const profile = await SupabaseClient.DB.getUserProfile(authUserId, jwt);
      if (!profile) {
        console.warn('[Session] ⚠️ Perfil não encontrado em public.users para id:', authUserId);
        return null;
      }
      console.log(`[Session] ✅ Perfil carregado. Role: ${profile.role}`);
      return profile;
    } catch (e) {
      console.error('[Session] ❌ Erro ao carregar perfil:', e.message);
      return null;
    }
  }

  // ── Inicialização ────────────────────────────────────────────────────────

  async function init() {
    if (_initialized) {
      console.warn('[Session] ⚠️ init() chamado mais de uma vez. Ignorando.');
      return;
    }
    _initialized = true;
    console.log('[Session] 🚀 Inicializando sessão...');

    const hasTokens = _loadTokensFromStorage();
    if (!hasTokens) {
      console.log('[Session] ℹ️ Nenhuma sessão salva.');
      _renderLoggedOut();
      return;
    }

    // Se o token expirou, tenta renovar com o refresh_token.
    // Se o refresh também falhar, tenta usar o access_token mesmo assim
    // (o servidor é o árbitro final — pode ainda ser válido).
    if (_isTokenExpired()) {
      console.log('[Session] 🔄 Token expirado, tentando renovar...');
      if (_refreshToken) {
        try {
          const data = await SupabaseClient.Auth.refreshToken(_refreshToken);
          _saveTokens(data.access_token, data.refresh_token, data.expires_in);
          console.log('[Session] ✅ Token renovado via refresh_token.');
        } catch (e) {
          console.warn('[Session] ⚠️ Refresh falhou, tentando token existente:', e.message);
          // Não limpa ainda — deixa getUser() decidir se o token ainda serve
        }
      }
    }

    let authUser;
    try {
      authUser = await SupabaseClient.Auth.getUser(_accessToken);
    } catch (e) {
      // Token realmente inválido — tenta uma última vez via refresh antes de deslogar
      console.warn('[Session] ⚠️ Token rejeitado pelo servidor:', e.message);
      if (_refreshToken) {
        try {
          console.log('[Session] 🔄 Última tentativa de refresh...');
          const data = await SupabaseClient.Auth.refreshToken(_refreshToken);
          _saveTokens(data.access_token, data.refresh_token, data.expires_in);
          authUser = await SupabaseClient.Auth.getUser(_accessToken);
          console.log('[Session] ✅ Sessão recuperada via refresh de emergência.');
        } catch (e2) {
          console.warn('[Session] ❌ Não foi possível recuperar sessão:', e2.message);
          _clearTokens();
          _renderLoggedOut();
          return;
        }
      } else {
        _clearTokens();
        _renderLoggedOut();
        return;
      }
    }

    const profile = await _loadProfile(authUser.id, _accessToken);
    if (!profile) {
      // ✅ CORRIGIDO: era 'consumer' — deve ser 'user' (alinhado com o banco)
      _currentUser = { id: authUser.id, email: authUser.email, role: 'user', nickname: authUser.email };
      console.warn('[Session] ⚠️ Perfil não encontrado em public.users. Usando fallback básico.');
    } else {
      _currentUser = profile;
    }

    // Agenda renovação automática baseada no tempo restante do token
    try {
      const expiry = parseInt(localStorage.getItem('pa_sb_token_expiry') || '0', 10);
      const remainingSec = Math.max(Math.floor((expiry - Date.now()) / 1000), 60);
      _scheduleRefresh(remainingSec);
    } catch (_) {
      _scheduleRefresh(3600); // fallback: renova em 45min
    }

    _renderLoggedIn(_currentUser);
    _notify('login', _currentUser);
    console.log('[Session] ✅ Sessão restaurada para:', _currentUser.nickname || _currentUser.email);
  }

  // ── Login / Logout ───────────────────────────────────────────────────────

  async function _handleLoginSuccess(authData) {
    _saveTokens(authData.access_token, authData.refresh_token, authData.expires_in);

    const profile = await _loadProfile(authData.user.id, authData.access_token);
    if (!profile) {
      // ✅ CORRIGIDO: era 'consumer' — deve ser 'user' (alinhado com o banco)
      _currentUser = {
        id:       authData.user.id,
        email:    authData.user.email,
        nickname: authData.user.email,
        role:     'user',   // ← CORRIGIDO
        server:   'Moon',
        avatar:   null,
      };
      console.warn('[Session] ⚠️ Perfil não encontrado após login. Usando dados básicos do auth.');
    } else {
      _currentUser = profile;
    }

    _renderLoggedIn(_currentUser);
    _notify('login', _currentUser);
    return _currentUser;
  }

  async function logout() {
    console.log('[Session] 👋 Fazendo logout...');
    if (_accessToken) {
      try {
        await SupabaseClient.Auth.signOut(_accessToken);
      } catch (e) {
        console.warn('[Session] Erro no signOut remoto (ignorado):', e.message);
      }
    }
    _currentUser = null;
    _clearTokens();
    _renderLoggedOut();
    _notify('logout', null);
    console.log('[Session] ✅ Logout concluído.');
  }

  function getCurrentUser()  { return _currentUser; }
  function isLoggedIn()      { return _currentUser !== null && _accessToken !== null; }
  function getAccessToken()  { return _accessToken; }
  function isAdmin()         { return _currentUser !== null && _currentUser.role === 'admin'; }

  // ── Renderização do Header ───────────────────────────────────────────────

  function _getInitials(nickname) {
    return (nickname || '?').slice(0, 2).toUpperCase();
  }

  function _truncate(str, max) {
    return str && str.length > max ? str.slice(0, max) + '…' : (str || '');
  }

  function _renderLoggedIn(user) {
    const container = document.getElementById('auth-header-slot');
    if (!container) return;

    const initials    = _getInitials(user.nickname);
    const isAdminUser = user.role === 'admin';

    container.innerHTML = `
      <div class="auth-user-widget" id="auth-user-widget">
        <div class="auth-avatar" aria-label="Avatar de ${user.nickname || user.email}">
          ${user.avatar
            ? `<img src="${user.avatar}" alt="${user.nickname}" />`
            : `<span class="auth-avatar-initials">${initials}</span>`
          }
          <span class="auth-status-dot" aria-hidden="true"></span>
        </div>

        <div class="auth-user-info">
          <span class="auth-nickname" title="${user.nickname || user.email}">
            ${_truncate(user.nickname || user.email, 12)}
          </span>
          <span class="auth-server-tag">
            ${isAdminUser ? '⚙️ Admin' : '🌙 Moon'}
          </span>
        </div>

        <button class="auth-menu-btn" onclick="Session._toggleMenu()" aria-label="Menu do usuário" aria-expanded="false" id="auth-menu-btn">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M1 3l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          </svg>
        </button>

        <div class="auth-dropdown" id="auth-dropdown" role="menu" aria-hidden="true">
          <div class="auth-dropdown-header">
            <div class="auth-dropdown-nick">${user.nickname || '—'}</div>
            <div class="auth-dropdown-email">${user.email || '—'}</div>
            ${isAdminUser ? '<div class="auth-dropdown-role-badge">⚙️ Administrador</div>' : ''}
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

  function _handleOutsideClick(e) {
    const widget = document.getElementById('auth-user-widget');
    if (widget && !widget.contains(e.target)) _closeMenu();
  }

  function _toggleMenu() {
    const dd  = document.getElementById('auth-dropdown');
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
    const dd  = document.getElementById('auth-dropdown');
    const btn = document.getElementById('auth-menu-btn');
    if (dd)  { dd.classList.remove('open');  dd.setAttribute('aria-hidden', 'true'); }
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function _confirmLogout() {
    _closeMenu();
    if (typeof AuthModal !== 'undefined') AuthModal.openLogoutConfirm();
  }

  function _openMyAccount() {
    _closeMenu();
    if (typeof AuthModal !== 'undefined') AuthModal.openMyAccount();
  }

  return {
    init,
    logout,
    getCurrentUser,
    isLoggedIn,
    isAdmin,
    getAccessToken,
    onAuthChange,
    _handleLoginSuccess,
    _toggleMenu,
    _closeMenu,
    _confirmLogout,
    _openMyAccount,
  };
})();