// ============================================================
// session.js — Gerenciamento de Sessão Centralizado v3
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
//   4. Valida token com getUser() no servidor
//   5. Carrega perfil do banco
//   6. Agenda renovação automática a 75% do tempo de vida
//   7. onAuthChange() notifica todos os módulos registrados
//
// GARANTIAS v3:
//   - _initPromise NUNCA rejeita — sempre resolve (com ou sem sessão)
//   - authUser nunca é null ao chegar em _loadProfile
//   - Todos os await protegidos com try/catch
//   - getAccessToken() sempre retorna token atual ou null
//   - forceRefresh() expõe refresh controlado para módulos externos
//   - NENHUM módulo externo lê/escreve tokens no localStorage
//   - Logs detalhados em cada etapa crítica
//
// DEPENDÊNCIAS: supabase-client.js (deve ser carregado antes)
// ============================================================

// FLAG GLOBAL: indica que Session.init() concluiu completamente (perfil carregado).
// Módulos que não conseguem usar await podem checar window.SESSION_READY === true.
window.SESSION_READY = false;

const Session = (() => {
  'use strict';

  // ── Chaves de persistência ──────────────────────────────────────────────
  const KEYS = {
    ACCESS_TOKEN:  'pa_sb_access_token',
    REFRESH_TOKEN: 'pa_sb_refresh_token',
    TOKEN_EXPIRY:  'pa_sb_token_expiry',
    USER_CACHE:    'pa_sb_user_cache',
  };

  // ── Estado interno ──────────────────────────────────────────────────────
  let _currentUser   = null;
  let _accessToken   = null;
  let _refreshToken  = null;
  let _initialized   = false;
  let _initPromise   = null;
  let _refreshTimer  = null;
  let _listeners     = [];

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 1 — EVENTOS / LISTENERS
  // ══════════════════════════════════════════════════════════════════════════

  function onAuthChange(callback) {
    if (typeof callback !== 'function') return;
    if (_listeners.includes(callback)) return;
    _listeners.push(callback);
    if (_initialized) {
      const event = _currentUser ? 'login' : 'logout';
      try { callback(event, _currentUser); } catch (_) {}
    }
  }

  function offAuthChange(callback) {
    _listeners = _listeners.filter(cb => cb !== callback);
  }

  function _notify(eventType, user) {
    console.log(`[Session] 🔔 ${eventType}`, user ? `→ ${user.nickname || user.email}` : '(sem user)');
    for (const cb of _listeners) {
      try { cb(eventType, user); } catch (e) {
        console.warn('[Session] Erro em listener de auth:', e);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 2 — PERSISTÊNCIA DE TOKENS
  // ══════════════════════════════════════════════════════════════════════════

  function _saveTokens(accessToken, refreshToken, expiresIn) {
    _accessToken  = accessToken;
    _refreshToken = refreshToken;
    const expiry  = Date.now() + (expiresIn || 3600) * 1000;
    try {
      localStorage.setItem(KEYS.ACCESS_TOKEN,  accessToken);
      localStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
      localStorage.setItem(KEYS.TOKEN_EXPIRY,  String(expiry));
    } catch (e) {
      console.warn('[Session] Não foi possível persistir tokens:', e.message);
    }
    _scheduleRefresh(expiresIn || 3600);
  }

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

  function _clearTokens() {
    _accessToken  = null;
    _refreshToken = null;
    if (_refreshTimer) { clearTimeout(_refreshTimer); _refreshTimer = null; }
    try {
      localStorage.removeItem(KEYS.ACCESS_TOKEN);
      localStorage.removeItem(KEYS.REFRESH_TOKEN);
      localStorage.removeItem(KEYS.TOKEN_EXPIRY);
      localStorage.removeItem(KEYS.USER_CACHE);
    } catch (_) {}
  }

  function _isTokenExpired() {
    try {
      const expiry = parseInt(localStorage.getItem(KEYS.TOKEN_EXPIRY) || '0', 10);
      if (!expiry) return true;
      return Date.now() > expiry - 60_000;
    } catch { return true; }
  }

  function _secondsUntilExpiry() {
    try {
      const expiry = parseInt(localStorage.getItem(KEYS.TOKEN_EXPIRY) || '0', 10);
      if (!expiry) return 0;
      return Math.max(0, Math.floor((expiry - Date.now()) / 1000));
    } catch { return 0; }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 3 — RENOVAÇÃO AUTOMÁTICA (AUTO-REFRESH)
  // ══════════════════════════════════════════════════════════════════════════

  function _scheduleRefresh(expiresInSeconds) {
    if (_refreshTimer) clearTimeout(_refreshTimer);
    const delay = Math.max(expiresInSeconds * 0.75 * 1000, 30_000);
    _refreshTimer = setTimeout(_doRefresh, delay);
    console.log(`[Session] ⏱ Próximo refresh em ~${Math.round(delay / 60_000)}min`);
  }

  async function _doRefresh() {
    if (!_refreshToken) {
      console.warn('[Session] _doRefresh: sem refresh_token, abortando.');
      return;
    }
    console.log('[Session] 🔄 Renovando token...');
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const data = await SupabaseClient.Auth.refreshToken(_refreshToken);
        if (!data || !data.access_token) throw new Error('Resposta inválida do refresh endpoint');
        _saveTokens(data.access_token, data.refresh_token, data.expires_in);
        console.log('[Session] ✅ TOKEN REFRESHED (tentativa %d) | expires_in: %ds', attempt, data.expires_in);
        _notify('token_refreshed', _currentUser);
        return;
      } catch (e) {
        console.warn(`[Session] ⚠️ Refresh falhou (tentativa ${attempt}/2):`, e.message);
        if (attempt < 2) await new Promise(r => setTimeout(r, 3_000));
      }
    }
    console.error('[Session] ❌ AUTH LOST — refresh esgotado, encerrando sessão.');
    _forceLogoutSync();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 4 — CARREGAMENTO DE PERFIL
  // ══════════════════════════════════════════════════════════════════════════

  async function _loadProfile(authUserId, jwt, authUser) {
    if (!authUserId) {
      console.error('[Session] _loadProfile: authUserId é null — isso não deveria acontecer');
      return null;
    }
    console.log('[Session] 📋 Carregando perfil para user_id:', authUserId);
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

    try {
      const profile = await SupabaseClient.DB.getUserProfile(authUserId, jwt);
      if (profile) {
        try { localStorage.setItem(KEYS.USER_CACHE, JSON.stringify(profile)); } catch (_) {}
        console.log('[Session] ✅ Perfil carregado do banco. Role:', profile.role);
        return profile;
      }
      console.warn('[Session] ⚠️ Perfil não encontrado em public.users para id:', authUserId);

      // Trigger on_auth_user_created pode ter falhado. Tenta criar o perfil agora.
      // Isso é um fallback de segurança — o trigger deve ser corrigido no Supabase.
      try {
        const _authUserForCreate = authUser || null; // passado como 3º parâmetro pelos callers
        if (_authUserForCreate && _authUserForCreate.email) {
          const nickname = _authUserForCreate.user_metadata?.nickname || _authUserForCreate.email.split('@')[0];
          const server   = _authUserForCreate.user_metadata?.server   || 'Moon';
          const insertRes = await fetch(
            window.SUPABASE_URL + '/rest/v1/users',
            {
              method: 'POST',
              headers: {
                'apikey':        window.SUPABASE_KEY,
                'Authorization': 'Bearer ' + jwt,
                'Content-Type':  'application/json',
                'Prefer':        'return=representation,resolution=ignore-duplicates',
              },
              body: JSON.stringify({ id: authUserId, email: _authUserForCreate.email, nickname, role: 'user', server }),
            }
          );
          if (insertRes.ok || insertRes.status === 409) {
            console.log('[Session] 🔧 Perfil criado automaticamente em public.users (fallback trigger).');
            // Tenta carregar o perfil recém-criado
            const created = await SupabaseClient.DB.getUserProfile(authUserId, jwt);
            if (created) {
              try { localStorage.setItem(KEYS.USER_CACHE, JSON.stringify(created)); } catch (_) {}
              return created;
            }
          } else {
            console.warn('[Session] ⚠️ Auto-criação de perfil falhou HTTP', insertRes.status);
          }
        }
      } catch (insertErr) {
        console.warn('[Session] ⚠️ Auto-criação de perfil falhou:', insertErr.message);
      }

      return null;
    } catch (e) {
      console.error('[Session] ❌ Erro ao carregar perfil:', e.message);
      return null;
    }
  }

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

  async function init() {
    if (_initPromise) return _initPromise;
    _initPromise = _doInit();
    return _initPromise;
  }

  /**
   * GARANTIA: _doInit() NUNCA rejeita.
   * Qualquer falha interna resulta em logout limpo, nunca em exceção propagada.
   * Isso garante que Session.ready() sempre resolve, nunca rejeita.
   */
  async function _doInit() {
    console.log('[Session] 🚀 Inicializando sessão...');

    try {
      // Passo 1: Carrega tokens do storage
      const hasStoredTokens = _loadTokensFromStorage();

      if (!hasStoredTokens) {
        console.log('[Session] ℹ️ Nenhuma sessão persistida. Usuário não logado.');
        _initialized = true;
        window.SESSION_READY = true;
        _renderLoggedOut();
        return;
      }

      console.log('[Session] 🔑 Tokens encontrados no localStorage. Validando...');

      // Passo 2: Se token expirado, tenta refresh antes de validar
      if (_isTokenExpired()) {
        console.log('[Session] ⏰ Token expirado, tentando renovar antes de validar...');
        if (_refreshToken) {
          try {
            const data = await SupabaseClient.Auth.refreshToken(_refreshToken);
            if (data?.access_token) {
              _saveTokens(data.access_token, data.refresh_token, data.expires_in);
              console.log('[Session] ✅ Token renovado durante init.');
            } else {
              console.warn('[Session] ⚠️ Refresh retornou resposta sem access_token.');
            }
          } catch (refreshErr) {
            console.warn('[Session] ⚠️ Refresh durante init falhou:', refreshErr.message);
            // Continua com token atual — GoTrue pode aceitar por clock skew
          }
        }
      }

      // Passo 3: Valida token com o servidor
      let authUser = null;

      try {
        authUser = await SupabaseClient.Auth.getUser(_accessToken);
        if (!authUser || !authUser.id) {
          throw new Error('getUser retornou objeto inválido (sem .id)');
        }
        console.log('[Session] ✅ SESSION RESTORED | user:', authUser.email, '| id:', authUser.id);
      } catch (getUserErr) {
        console.warn('[Session] ⚠️ Token rejeitado pelo servidor:', getUserErr.message);

        // Última tentativa: refresh de emergência
        if (_refreshToken) {
          console.log('[Session] 🔄 Refresh de emergência...');
          try {
            const data = await SupabaseClient.Auth.refreshToken(_refreshToken);

            if (!data?.access_token) {
              console.error('[Session] ❌ Refresh de emergência retornou sem access_token.');
              _clearTokens();
              _initialized = true;
              window.SESSION_READY = true;
              _renderLoggedOut();
              return;
            }

            _saveTokens(data.access_token, data.refresh_token, data.expires_in);

            try {
              authUser = await SupabaseClient.Auth.getUser(_accessToken);
              if (!authUser || !authUser.id) throw new Error('getUser inválido após refresh de emergência');
              console.log('[Session] ✅ Sessão recuperada via refresh de emergência. user:', authUser.email);
            } catch (getUserAfterRefreshErr) {
              console.error('[Session] ❌ getUser falhou mesmo após refresh de emergência:', getUserAfterRefreshErr.message);
              _clearTokens();
              _initialized = true;
              window.SESSION_READY = true;
              _renderLoggedOut();
              return;
            }

          } catch (refreshEmergErr) {
            console.error('[Session] ❌ AUTH LOST — refresh de emergência falhou:', refreshEmergErr.message);
            _clearTokens();
            _initialized = true;
            window.SESSION_READY = true;
            _renderLoggedOut();
            return;
          }
        } else {
          console.error('[Session] ❌ AUTH LOST — sem refresh_token e token inválido.');
          _clearTokens();
          _initialized = true;
          window.SESSION_READY = true;
          _renderLoggedOut();
          return;
        }
      }

      // Passo 4: authUser é válido (id garantido) — carrega perfil
      const profile = await _loadProfile(authUser.id, _accessToken, authUser);
      _currentUser = profile || _buildFallbackProfile(authUser);

      if (!profile) {
        console.warn('[Session] ⚠️ Usando perfil fallback (trigger ainda não criou public.users?)');
      }

      // Passo 5: Agenda renovação automática
      const remainingSec = _secondsUntilExpiry();
      if (remainingSec > 30) {
        _scheduleRefresh(remainingSec);
      } else {
        _refreshTimer = setTimeout(_doRefresh, 5_000);
        console.log('[Session] ⚠️ Token com < 30s restantes, refresh em 5s.');
      }

      // Passo 6: Atualiza UI e notifica
      _initialized = true;
      window.SESSION_READY = true;
      _renderLoggedIn(_currentUser);
      _notify('login', _currentUser);

      console.log(
        '[Session] ✅ SESSION RESTORED | user:', _currentUser.nickname || _currentUser.email,
        '| role:', _currentUser.role,
        '| token expira em:', Math.round(remainingSec / 60) + 'min',
        '| access_token:', _accessToken ? _accessToken.slice(0, 20) + '…' : 'NULL'
      );

    } catch (fatalErr) {
      // Captura qualquer exceção não prevista — _initPromise NUNCA deve rejeitar
      console.error('[Session] ❌ FATAL: exceção não prevista em _doInit:', fatalErr);
      _clearTokens();
      _initialized = true;
      window.SESSION_READY = true;
      _renderLoggedOut();
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 6 — LOGIN / LOGOUT
  // ══════════════════════════════════════════════════════════════════════════

  async function _handleLoginSuccess(authData) {
    if (!authData?.access_token) {
      throw new Error('_handleLoginSuccess: authData sem access_token');
    }
    if (!authData?.user?.id) {
      throw new Error('_handleLoginSuccess: authData sem user.id');
    }

    _saveTokens(authData.access_token, authData.refresh_token, authData.expires_in);
    try { localStorage.removeItem(KEYS.USER_CACHE); } catch (_) {}

    const profile = await _loadProfile(authData.user.id, authData.access_token, authData.user);
    _currentUser = profile || _buildFallbackProfile(authData.user);

    if (!profile) {
      console.warn('[Session] ⚠️ Perfil não encontrado após login. Usando dados do auth.user.');
    }

    _initialized = true;
    _renderLoggedIn(_currentUser);
    _notify('login', _currentUser);

    console.log(
      '[Session] ✅ LOGIN SUCCESS | user:', _currentUser.nickname || _currentUser.email,
      '| role:', _currentUser.role,
      '| access_token:', authData.access_token.slice(0, 20) + '…',
      '| expires_in:', authData.expires_in + 's'
    );
    return _currentUser;
  }

  async function logout() {
    console.log('[Session] 👋 Logout solicitado...');
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

  async function _forceLogout() { _forceLogoutSync(); }

  function _forceLogoutSync() {
    _currentUser = null;
    // HOTFIX (Fase 5.3): SESSION_READY = false durante logout.
    // Garante que render() aguarde nova sessão antes de exibir dados.
    // Isso previne a janela de race onde render() usa SESSION_READY=true
    // mas _currentUser=null, potencialmente exibindo dados de sessão anterior.
    window.SESSION_READY = false;
    _clearTokens();
    _renderLoggedOut();
    _notify('logout', null);
    // Restaura SESSION_READY após notificar todos os listeners
    // (permite que render() saiba que o logout foi concluído)
    window.SESSION_READY = true;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SEÇÃO 7 — API PÚBLICA
  // ══════════════════════════════════════════════════════════════════════════

  function getCurrentUser() { return _currentUser; }
  function isLoggedIn()     { return _currentUser !== null && _accessToken !== null; }
  function getAccessToken() { return _accessToken; }
  function isAdmin()        { return _currentUser?.role === 'admin'; }

  function ready() {
    // CORREÇÃO RACE CONDITION: ready() SEMPRE aguarda init real.
    // Se init ainda não começou, inicia agora e aguarda conclusão.
    // NUNCA retorna Promise.resolve() fake quando _initPromise é null.
    if (!_initPromise) {
      _initPromise = _doInit();
    }
    return _initPromise;
  }

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

  /**
   * Força renovação imediata do token.
   * Use quando um módulo recebe 401 e quer tentar refresh antes de falhar.
   * Retorna o novo access_token ou null se refresh falhou (e fez logout).
   */
  async function forceRefresh() {
    if (!_refreshToken) {
      console.warn('[Session] forceRefresh: sem refresh_token.');
      return null;
    }
    console.log('[Session] 🔄 forceRefresh() chamado por módulo externo...');
    await _doRefresh();
    return _accessToken;
  }

  /**
   * Diagnóstico de sessão — log completo do estado atual.
   * Útil para debug: Session.diagnose()
   */
  function diagnose() {
    const storedAt = (() => { try { return localStorage.getItem(KEYS.ACCESS_TOKEN); } catch { return null; } })();
    const storedExpiry = (() => { try { return localStorage.getItem(KEYS.TOKEN_EXPIRY); } catch { return null; } })();
    const expiryMs = parseInt(storedExpiry || '0', 10);

    console.group('[Session] 🩺 DIAGNÓSTICO');
    console.log('_initialized   :', _initialized);
    console.log('_currentUser   :', _currentUser ? `${_currentUser.nickname} (${_currentUser.role})` : 'null');
    console.log('_accessToken   :', _accessToken ? _accessToken.slice(0, 20) + '…' : 'NULL ❌');
    console.log('_refreshToken  :', _refreshToken ? _refreshToken.slice(0, 10) + '…' : 'NULL ❌');
    console.log('isLoggedIn()   :', isLoggedIn());
    console.log('isAdmin()      :', isAdmin());
    console.log('localStorage AT:', storedAt ? storedAt.slice(0, 20) + '…' : 'NULL ❌');
    console.log('token expiry   :', expiryMs ? new Date(expiryMs).toLocaleTimeString() + ` (${Math.round((expiryMs - Date.now()) / 60000)}min)` : 'N/A');
    console.log('_initPromise   :', _initPromise ? 'existe' : 'null');
    console.groupEnd();
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
    if (isOpen) { _closeMenu(); } else {
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

    // Debug
    diagnose,

    // Chamado por auth.js após login/signup bem-sucedido
    _handleLoginSuccess,

    // UI (dropdown)
    _toggleMenu,
    _closeMenu,
    _confirmLogout,
    _openMyAccount,
  };
})();
