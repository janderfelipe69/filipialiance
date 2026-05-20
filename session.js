// ============================================================
// session.js — Gerenciamento de Sessão Centralizado v2
// PokeAlliance Shop
//
// ARQUITETURA:
//   Este módulo é a ÚNICA fonte de verdade para autenticação.
//   Todos os outros módulos consultam Session.getAccessToken()
//   e Session.getCurrentUser() — NUNCA o localStorage diretamente.
//
// FLUXO COMPLETO:
//   1. init() é chamado no DOMContentLoaded
//   2. Tenta restaurar sessão do localStorage (tokens pa_sb_*)
//   3. Se token expirado → tenta refresh automático
//   4. Se token válido → carrega perfil do banco
//   5. Agenda renovação automática a 75% do tempo de vida
//   6. onAuthStateChange() notifica todos os módulos registrados
//
// GARANTIAS:
//   - persistSession: tokens salvos no localStorage
//   - autoRefreshToken: renovação automática via refresh_token
//   - Nunca estado "logado visualmente sem JWT válido"
//   - init() retorna Promise — aguardável pelos módulos dependentes
//   - getAccessToken() sempre retorna token atual ou null
//   - forceRefresh() expõe refresh controlado para módulos externos
//   - NENHUM módulo externo deve ler/escrever localStorage de tokens diretamente
//
// DEPENDÊNCIAS: supabase-client.js (deve ser carregado antes)
// ============================================================

const Session = (() => {
  'use strict';

  // ── Chaves de persistência ──────────────────────────────────────────────
  // Prefixo "pa_sb_" para não colidir com chaves internas do SDK Supabase
  const KEYS = {
    ACCESS_TOKEN:  'pa_sb_access_token',
    REFRESH_TOKEN: 'pa_sb_refresh_token',
    TOKEN_EXPIRY:  'pa_sb_token_expiry',
    USER_CACHE:    'pa_sb_user_cache',
  };

  // ── Estado interno ──────────────────────────────────────────────────────
  let _currentUser   = null;   // perfil completo de public.users
  let _accessToken   = null;   // JWT atual (sempre em memória + localStorage)
  let _refreshToken  = null;   // refresh_token persistido
  let _initialized   = false;  // init() já executou
  let _initPromise   = null;   // Promise do init() — módulos podem await
  let _refreshTimer  = null;   // setTimeout para renovação automática
  let _listeners     = [];     // callbacks de onAuthChange

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 1 — EVENTOS / LISTENERS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Registra callback para mudanças de estado de autenticação.
   * Chamado imediatamente com o estado atual se init() já rodou.
   * Equivalente funcional ao supabase.auth.onAuthStateChange().
   *
   * @param {Function} callback - fn(eventType: 'login'|'logout'|'token_refreshed', user)
   */
  function onAuthChange(callback) {
    if (typeof callback !== 'function') return;
    if (_listeners.includes(callback)) return;
    _listeners.push(callback);

    // Dispara imediatamente com estado atual se já inicializado
    if (_initialized) {
      const event = _currentUser ? 'login' : 'logout';
      try { callback(event, _currentUser); } catch (_) {}
    }
  }

  /**
   * Remove listener registrado (cleanup).
   */
  function offAuthChange(callback) {
    _listeners = _listeners.filter(cb => cb !== callback);
  }

  function _notify(eventType, user) {
    console.log(`[Session] 🔔 ${eventType}`, user ? `→ ${user.nickname || user.email}` : '');
    for (const cb of _listeners) {
      try { cb(eventType, user); } catch (e) {
        console.warn('[Session] Erro em listener de auth:', e);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 2 — PERSISTÊNCIA DE TOKENS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Salva tokens em memória e localStorage.
   * Chamado após login e após cada refresh.
   */
  function _saveTokens(accessToken, refreshToken, expiresIn) {
    _accessToken  = accessToken;
    _refreshToken = refreshToken;

    const expiry = Date.now() + (expiresIn || 3600) * 1000;

    try {
      localStorage.setItem(KEYS.ACCESS_TOKEN,  accessToken);
      localStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
      localStorage.setItem(KEYS.TOKEN_EXPIRY,  String(expiry));
    } catch (e) {
      // localStorage bloqueado (modo privado extremo, etc.)
      console.warn('[Session] Não foi possível persistir tokens:', e.message);
    }

    _scheduleRefresh(expiresIn || 3600);
  }

  /**
   * Carrega tokens do localStorage para memória.
   * Retorna true se access_token existe (não verifica validade aqui).
   */
  function _loadTokensFromStorage() {
    try {
      const at = localStorage.getItem(KEYS.ACCESS_TOKEN);
      const rt = localStorage.getItem(KEYS.REFRESH_TOKEN);
      if (!at) return false;
      _accessToken  = at;
      _refreshToken = rt || null;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Limpa todos os tokens da memória e do localStorage.
   * Chamado no logout ou quando refresh esgota.
   */
  function _clearTokens() {
    _accessToken  = null;
    _refreshToken = null;

    if (_refreshTimer) {
      clearTimeout(_refreshTimer);
      _refreshTimer = null;
    }

    try {
      localStorage.removeItem(KEYS.ACCESS_TOKEN);
      localStorage.removeItem(KEYS.REFRESH_TOKEN);
      localStorage.removeItem(KEYS.TOKEN_EXPIRY);
      localStorage.removeItem(KEYS.USER_CACHE);
    } catch (_) {}
  }

  /**
   * Retorna true se o token JWT está expirado ou próximo de expirar (< 60s).
   */
  function _isTokenExpired() {
    try {
      const expiry = parseInt(localStorage.getItem(KEYS.TOKEN_EXPIRY) || '0', 10);
      if (!expiry) return true;
      return Date.now() > expiry - 60_000; // 60s de margem
    } catch {
      return true;
    }
  }

  /**
   * Calcula segundos restantes até expiração do token.
   */
  function _secondsUntilExpiry() {
    try {
      const expiry = parseInt(localStorage.getItem(KEYS.TOKEN_EXPIRY) || '0', 10);
      if (!expiry) return 0;
      return Math.max(0, Math.floor((expiry - Date.now()) / 1000));
    } catch {
      return 0;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 3 — RENOVAÇÃO AUTOMÁTICA DE TOKEN (AUTO-REFRESH)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Agenda renovação do token a 75% do tempo de vida.
   * Ex: token de 1h → renova em 45min.
   * Mínimo de 30s para não criar loop em tokens curtos.
   */
  function _scheduleRefresh(expiresInSeconds) {
    if (_refreshTimer) clearTimeout(_refreshTimer);

    const delay = Math.max(expiresInSeconds * 0.75 * 1000, 30_000);
    _refreshTimer = setTimeout(_doRefresh, delay);

    const mins = Math.round(delay / 60_000);
    console.log(`[Session] ⏱ Próximo refresh em ~${mins}min`);
  }

  /**
   * Executa a renovação do token via refresh_token.
   * Tenta 2 vezes com 3s de intervalo antes de fazer logout.
   * Após sucesso, notifica listeners com evento 'token_refreshed'.
   */
  async function _doRefresh() {
    if (!_refreshToken) {
      console.warn('[Session] _doRefresh: sem refresh_token, abortando.');
      return;
    }

    console.log('[Session] 🔄 Renovando token...');

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const data = await SupabaseClient.Auth.refreshToken(_refreshToken);

        if (!data || !data.access_token) {
          throw new Error('Resposta inválida do refresh endpoint');
        }

        _saveTokens(data.access_token, data.refresh_token, data.expires_in);
        console.log('[Session] ✅ Token renovado (tentativa %d)', attempt);
        _notify('token_refreshed', _currentUser);
        return;

      } catch (e) {
        console.warn(`[Session] ⚠️ Refresh falhou (tentativa ${attempt}/2):`, e.message);
        if (attempt < 2) await new Promise(r => setTimeout(r, 3_000));
      }
    }

    // Refresh esgotado — sessão inválida, desloga
    console.error('[Session] ❌ Refresh esgotado. Encerrando sessão.');
    await _forceLogout();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 4 — CARREGAMENTO DE PERFIL
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Carrega perfil do usuário em public.users.
   * Usa cache para não sobrecarregar o banco em rehydrations frequentes.
   */
  async function _loadProfile(authUserId, jwt) {
    console.log('[Session] 📋 Carregando perfil...');

    // Tenta cache local primeiro (evita round-trip desnecessário)
    try {
      const cached = localStorage.getItem(KEYS.USER_CACHE);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.id === authUserId) {
          console.log('[Session] 📋 Perfil do cache:', parsed.nickname);
          return parsed;
        }
      }
    } catch (_) {}

    // Busca no banco
    try {
      const profile = await SupabaseClient.DB.getUserProfile(authUserId, jwt);
      if (profile) {
        // Salva em cache
        try { localStorage.setItem(KEYS.USER_CACHE, JSON.stringify(profile)); } catch (_) {}
        console.log('[Session] ✅ Perfil carregado do banco. Role:', profile.role);
        return profile;
      }
      console.warn('[Session] ⚠️ Perfil não encontrado em public.users para id:', authUserId);
      return null;
    } catch (e) {
      console.error('[Session] ❌ Erro ao carregar perfil:', e.message);
      return null;
    }
  }

  /**
   * Constrói perfil mínimo usando dados do auth.users quando public.users
   * não tem registro (ex: trigger ainda não executou, usuário novo).
   */
  function _buildFallbackProfile(authUser) {
    return {
      id:       authUser.id,
      email:    authUser.email,
      nickname: authUser.user_metadata?.nickname || authUser.email.split('@')[0],
      role:     'user',
      server:   authUser.user_metadata?.server || 'Moon',
      avatar:   null,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 5 — INICIALIZAÇÃO (REHYDRATION)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Inicializa a sessão.
   * Deve ser chamado uma única vez no DOMContentLoaded.
   * Retorna Promise — módulos críticos podem fazer: await Session.ready()
   *
   * FLUXO:
   *   1. Lê tokens do localStorage
   *   2. Se expirado → tenta refresh
   *   3. Valida token com getUser() no servidor
   *   4. Carrega perfil do banco
   *   5. Atualiza UI e notifica listeners
   */
  async function init() {
    // Garante que init() só roda uma vez, mas a Promise é reutilizável
    if (_initPromise) return _initPromise;

    _initPromise = _doInit();
    return _initPromise;
  }

  async function _doInit() {
    console.log('[Session] 🚀 Inicializando sessão...');

    // Passo 1: Carrega tokens do storage
    const hasStoredTokens = _loadTokensFromStorage();

    if (!hasStoredTokens) {
      console.log('[Session] ℹ️ Nenhuma sessão persistida. Usuário não logado.');
      _initialized = true;
      _renderLoggedOut();
      return;
    }

    // Passo 2: Se token expirado, tenta refresh antes de validar
    if (_isTokenExpired()) {
      console.log('[Session] ⏰ Token expirado, tentando renovar antes de validar...');

      if (_refreshToken) {
        try {
          const data = await SupabaseClient.Auth.refreshToken(_refreshToken);
          if (data?.access_token) {
            _saveTokens(data.access_token, data.refresh_token, data.expires_in);
            console.log('[Session] ✅ Token renovado durante init.');
          }
        } catch (refreshErr) {
          console.warn('[Session] ⚠️ Refresh durante init falhou:', refreshErr.message);
          // Não desiste ainda — tenta validar o token existente no servidor
          // (tokens expirados "no relógio local" podem ainda ser aceitos por uns segundos)
        }
      }
    }

    // Passo 3: Valida token com o servidor (getUser é a fonte de verdade)
    let authUser = null;

    try {
      authUser = await SupabaseClient.Auth.getUser(_accessToken);
      console.log('[Session] ✅ Token validado pelo servidor para:', authUser.email);
    } catch (getUserErr) {
      console.warn('[Session] ⚠️ Token rejeitado pelo servidor:', getUserErr.message);

      // Última tentativa: refresh de emergência
      if (_refreshToken) {
        try {
          console.log('[Session] 🔄 Refresh de emergência...');
          const data = await SupabaseClient.Auth.refreshToken(_refreshToken);
          if (data?.access_token) {
            _saveTokens(data.access_token, data.refresh_token, data.expires_in);
            authUser = await SupabaseClient.Auth.getUser(_accessToken);
            console.log('[Session] ✅ Sessão recuperada via refresh de emergência.');
          }
        } catch (emergencyErr) {
          console.error('[Session] ❌ Impossível recuperar sessão:', emergencyErr.message);
          _clearTokens();
          _initialized = true;
          _renderLoggedOut();
          return;
        }
      } else {
        // Sem refresh_token e token inválido → logout limpo
        _clearTokens();
        _initialized = true;
        _renderLoggedOut();
        return;
      }
    }

    // Passo 4: Carrega perfil do banco
    const profile = await _loadProfile(authUser.id, _accessToken);
    _currentUser = profile || _buildFallbackProfile(authUser);

    if (!profile) {
      console.warn('[Session] ⚠️ Usando perfil fallback (trigger ainda não criou public.users?)');
    }

    // Passo 5: Agenda renovação automática baseada no tempo restante real
    const remainingSec = _secondsUntilExpiry();
    if (remainingSec > 30) {
      _scheduleRefresh(remainingSec);
    } else {
      // Token quase expirado — agenda refresh imediato
      _refreshTimer = setTimeout(_doRefresh, 5_000);
      console.log('[Session] ⚠️ Token com < 30s restantes, refresh em 5s.');
    }

    // Passo 6: Atualiza UI e notifica listeners
    _initialized = true;
    _renderLoggedIn(_currentUser);
    _notify('login', _currentUser);

    console.log('[Session] ✅ Sessão restaurada:', _currentUser.nickname || _currentUser.email,
      `| Role: ${_currentUser.role} | Token expira em: ${Math.round(remainingSec / 60)}min`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 6 — LOGIN / LOGOUT
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Chamado por Auth.login() após login bem-sucedido.
   * Recebe os dados brutos da resposta do Supabase Auth.
   */
  async function _handleLoginSuccess(authData) {
    if (!authData?.access_token) {
      throw new Error('_handleLoginSuccess: authData sem access_token');
    }

    // Persiste tokens imediatamente
    _saveTokens(authData.access_token, authData.refresh_token, authData.expires_in);

    // Invalida cache de perfil (pode ter mudado desde o último login)
    try { localStorage.removeItem(KEYS.USER_CACHE); } catch (_) {}

    // Carrega perfil fresco do banco
    const profile = await _loadProfile(authData.user.id, authData.access_token);
    _currentUser = profile || _buildFallbackProfile(authData.user);

    if (!profile) {
      console.warn('[Session] ⚠️ Perfil não encontrado após login. Usando dados do auth.user.');
    }

    _initialized = true;
    _renderLoggedIn(_currentUser);
    _notify('login', _currentUser);

    console.log('[Session] ✅ Login bem-sucedido:', _currentUser.nickname || _currentUser.email);
    return _currentUser;
  }

  /**
   * Logout iniciado pelo usuário.
   * Invalida token no servidor e limpa estado local.
   */
  async function logout() {
    console.log('[Session] 👋 Logout solicitado...');

    // Invalida token no servidor (best-effort, não bloqueia se falhar)
    if (_accessToken) {
      try {
        await SupabaseClient.Auth.signOut(_accessToken);
      } catch (e) {
        console.warn('[Session] Erro ao invalidar token no servidor (ignorado):', e.message);
      }
    }

    _forceLogoutSync();
    console.log('[Session] ✅ Logout concluído.');
  }

  /**
   * Logout forçado (sem chamar o servidor).
   * Usado quando refresh esgota ou token é permanentemente inválido.
   */
  async function _forceLogout() {
    _forceLogoutSync();
  }

  function _forceLogoutSync() {
    _currentUser = null;
    _clearTokens();
    _renderLoggedOut();
    _notify('logout', null);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 7 — API PÚBLICA
  // ══════════════════════════════════════════════════════════════════════════

  /** Retorna o usuário atual ou null se não logado. */
  function getCurrentUser() { return _currentUser; }

  /** Retorna true se há usuário logado E access_token em memória. */
  function isLoggedIn() { return _currentUser !== null && _accessToken !== null; }

  /**
   * Retorna o access_token atual.
   * SEMPRE use esta função — nunca leia localStorage diretamente.
   * Retorna null se não logado.
   */
  function getAccessToken() { return _accessToken; }

  /** Retorna true se o usuário logado tem role 'admin'. */
  function isAdmin() { return _currentUser?.role === 'admin'; }

  /**
   * Promise que resolve quando init() termina.
   * Módulos que precisam do token na inicialização devem usar:
   *   await Session.ready();
   *   const token = Session.getAccessToken();
   */
  function ready() {
    if (_initPromise) return _initPromise;
    // Se init() ainda não foi chamado, retorna Promise resolvida (compatibilidade)
    return Promise.resolve();
  }

  /**
   * Invalida o cache de perfil e recarrega do banco.
   * Útil após o usuário atualizar nickname/avatar.
   */
  async function refreshProfile() {
    if (!_currentUser || !_accessToken) return null;
    try { localStorage.removeItem(KEYS.USER_CACHE); } catch (_) {}
    const profile = await _loadProfile(_currentUser.id, _accessToken);
    if (profile) {
      _currentUser = profile;
      _notify('profile_updated', _currentUser);
    }
    return _currentUser;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 8 — RENDERIZAÇÃO DO HEADER
  // ══════════════════════════════════════════════════════════════════════════

  function _getInitials(nickname) {
    return (nickname || '?').slice(0, 2).toUpperCase();
  }

  function _truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '…' : str;
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
      btn?.setAttribute('aria-expanded', 'true');
    }
  }

  function _closeMenu() {
    const dd  = document.getElementById('auth-dropdown');
    const btn = document.getElementById('auth-menu-btn');
    dd?.classList.remove('open');
    dd?.setAttribute('aria-hidden', 'true');
    btn?.setAttribute('aria-expanded', 'false');
  }

  function _confirmLogout() {
    _closeMenu();
    if (typeof AuthModal !== 'undefined') AuthModal.openLogoutConfirm();
  }

  function _openMyAccount() {
    _closeMenu();
    if (typeof AuthModal !== 'undefined') AuthModal.openMyAccount();
  }

  /**
   * Força renovação imediata do token (expõe _doRefresh de forma controlada).
   * Use quando um módulo recebe 401 e quer tentar refresh antes de falhar.
   * Retorna o novo access_token ou null se refresh falhou.
   */
  async function forceRefresh() {
    if (!_refreshToken) {
      console.warn('[Session] forceRefresh: sem refresh_token.');
      return null;
    }
    await _doRefresh();
    return _accessToken; // null se _doRefresh fez logout
  }

  // ── API Pública ──────────────────────────────────────────────────────────
  return {
    // Ciclo de vida
    init,
    ready,

    // Estado
    getCurrentUser,
    isLoggedIn,
    isAdmin,
    getAccessToken,

    // Eventos
    onAuthChange,
    offAuthChange,

    // Ações
    logout,
    refreshProfile,
    forceRefresh,

    // Chamado por auth.js após login/signup bem-sucedido
    _handleLoginSuccess,

    // UI (dropdown)
    _toggleMenu,
    _closeMenu,
    _confirmLogout,
    _openMyAccount,
  };
})();
