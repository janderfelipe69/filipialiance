// ============================================================
// supabase-client.js — Cliente Supabase Centralizado
// PokeAlliance Shop
//
// ÚNICO arquivo que declara URL e KEY do Supabase.
// Todos os outros módulos importam daqui.
//
// Carregue este script ANTES de todos os outros no HTML:
//   <script src="supabase-client.js"></script>
// ============================================================

;(function (global) {
  'use strict';

  // ── Credenciais Supabase ─────────────────────────────────────────────────
  // A anon key é segura para expor no frontend — ela só permite
  // operações que as RLS policies permitem. Nunca exponha a service_role key.
  var SB_URL = 'https://xzmefefcfwhlkmqrkxcd.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bWVmZWZjZndobGttcXJreGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTA5MTEsImV4cCI6MjA5NDE4NjkxMX0.i9ESDqCP9fDdQrK0e-TkchbEJrAlZ6qhKh8-Yu6axAg';

  // Expõe globalmente (compatível com pedidos.js existente)
  global.SUPABASE_URL = SB_URL;
  global.SUPABASE_KEY = SB_KEY;

  // ── Helper: cabeçalhos padrão para REST API ──────────────────────────────
  function _headers(extraHeaders) {
    return Object.assign({
      'Content-Type': 'application/json',
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + SB_KEY,
    }, extraHeaders || {});
  }

  // ── Helper: cabeçalhos autenticados (com JWT do usuário logado) ──────────
  function _authHeaders(jwt, extraHeaders) {
    return Object.assign({
      'Content-Type': 'application/json',
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + (jwt || SB_KEY),
    }, extraHeaders || {});
  }

  // ── Helper: fetch com tratamento de erro ─────────────────────────────────
  async function _fetch(url, options) {
    var res = await fetch(url, options);
    var body = null;
    try { body = await res.json(); } catch (_) { body = null; }
    if (!res.ok) {
      var msg = (body && (body.error_description || body.message || body.msg || body.error)) || ('HTTP ' + res.status);
      throw new Error(msg);
    }
    return body;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AUTH API — Wrapper sobre o endpoint GoTrue do Supabase
  // ══════════════════════════════════════════════════════════════════════════
  var Auth = {

    /**
     * Cadastra novo usuário.
     * O trigger no banco criará automaticamente o registro em public.users.
     */
    signUp: async function (email, password, metadata) {
      var body = { email: email, password: password };
      if (metadata) body.data = metadata; // passa nickname, server etc. como user_metadata
      return _fetch(SB_URL + '/auth/v1/signup', {
        method: 'POST',
        headers: _headers(),
        body: JSON.stringify(body),
      });
    },

    /**
     * Login com email e senha.
     * Retorna { access_token, refresh_token, user, ... }
     */
    signIn: async function (email, password) {
      return _fetch(SB_URL + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: _headers(),
        body: JSON.stringify({ email: email, password: password }),
      });
    },

    /**
     * Renova o access_token usando o refresh_token.
     */
    refreshToken: async function (refreshToken) {
      return _fetch(SB_URL + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: _headers(),
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    },

    /**
     * Logout — invalida o token no servidor.
     */
    signOut: async function (jwt) {
      return _fetch(SB_URL + '/auth/v1/logout', {
        method: 'POST',
        headers: _authHeaders(jwt),
      });
    },

    /**
     * Busca dados do usuário autenticado pelo JWT.
     */
    getUser: async function (jwt) {
      return _fetch(SB_URL + '/auth/v1/user', {
        method: 'GET',
        headers: _authHeaders(jwt),
      });
    },
  };

  // ══════════════════════════════════════════════════════════════════════════
  // DATABASE API — Wrapper sobre a REST API PostgREST do Supabase
  // ══════════════════════════════════════════════════════════════════════════
  var DB = {

    /**
     * Busca o perfil do usuário em public.users pelo ID.
     * Requer JWT do usuário logado para respeitar RLS.
     */
    getUserProfile: async function (userId, jwt) {
      var url = SB_URL + '/rest/v1/users?id=eq.' + encodeURIComponent(userId) + '&select=id,email,nickname,server,role,avatar,created_at&limit=1';
      var data = await _fetch(url, {
        method: 'GET',
        headers: _authHeaders(jwt),
      });
      // PostgREST retorna array mesmo para um único registro
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    },

    /**
     * Atualiza campos do perfil do próprio usuário.
     * RLS impede atualizar outros usuários.
     * Campos protegidos (role, id) não são aceitos aqui por design.
     */
    updateUserProfile: async function (userId, updates, jwt) {
      // Remove campos que não devem ser alterados pelo frontend
      var safe = Object.assign({}, updates);
      delete safe.role;
      delete safe.id;
      delete safe.created_at;
      delete safe.email;

      var url = SB_URL + '/rest/v1/users?id=eq.' + encodeURIComponent(userId);
      return _fetch(url, {
        method: 'PATCH',
        headers: _authHeaders(jwt, { 'Prefer': 'return=representation' }),
        body: JSON.stringify(safe),
      });
    },

    /**
     * Fetch genérico com JWT (mantém compatibilidade com pedidos.js).
     */
    fetchWithAuth: async function (path, options, jwt) {
      return _fetch(SB_URL + path, Object.assign({
        headers: _authHeaders(jwt),
      }, options));
    },
  };

  // ── Exporta globalmente ──────────────────────────────────────────────────
  global.SupabaseClient = {
    Auth: Auth,
    DB: DB,
    url: SB_URL,
    key: SB_KEY,
  };

  console.log('[SupabaseClient] ✅ Cliente inicializado.');

})(typeof window !== 'undefined' ? window : this);
