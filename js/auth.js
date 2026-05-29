// ============================================================
// auth.js — Lógica de Autenticação com Supabase
// PokeAlliance Shop
//
// CORREÇÕES v3:
//   1. signUp: detecta corretamente auto-confirm ON e OFF
//      GoTrue v1 /auth/v1/signup retorna formatos diferentes:
//        - auto-confirm OFF: { id, email, confirmation_sent_at, ... }
//          (sem .user wrapper, sem .access_token)
//        - auto-confirm ON:  { access_token, refresh_token, user, ... }
//          (sem .session — session não existe nesse endpoint)
//   2. Adicionado log detalhado da resposta para diagnóstico
//   3. _mapAuthError: cobre duplicate email, nickname em uso
//   4. Nickname duplicado: mensagem específica ao usuário
//   5. Fluxo login automático pós-signup corrigido
//
// Depende de: supabase-client.js, session.js
// ============================================================

const Auth = (() => {
  'use strict';

  // ── Rate Limiting (proteção extra no frontend) ───────────────────────────
  const _attempts = { login: [], register: [] };
  const RATE = { MAX: 5, WINDOW_MS: 60_000 };

  function _checkRateLimit(action) {
    const now = Date.now();
    _attempts[action] = _attempts[action].filter(t => now - t < RATE.WINDOW_MS);
    if (_attempts[action].length >= RATE.MAX) {
      const wait = Math.ceil((RATE.WINDOW_MS - (now - _attempts[action][0])) / 1000);
      return { blocked: true, wait };
    }
    _attempts[action].push(now);
    return { blocked: false };
  }

  // ── Validações ───────────────────────────────────────────────────────────

  const RULES = {
    nickname: {
      min: 2,
      max: 24,
      // Aceita letras, números e espaços internos
      // "J F", "Player One", "DarkKnight" → válidos
      // " ", "@@@", "A" → inválidos
      pattern: /^(?=.{2,24}$)(?!\s+$)[A-Za-z0-9 ]+$/,
    },
    password: { min: 6, max: 64 },
  };

  function validateNickname(value) {
    if (!value || !value.trim()) return { ok: false, msg: 'Nickname é obrigatório.' };
    const trimmed = value.trim();
    if (trimmed.length < RULES.nickname.min)
      return { ok: false, msg: `Mínimo ${RULES.nickname.min} caracteres.` };
    if (trimmed.length > RULES.nickname.max)
      return { ok: false, msg: `Máximo ${RULES.nickname.max} caracteres.` };
    if (!RULES.nickname.pattern.test(trimmed))
      return { ok: false, msg: 'Use apenas letras, números e espaços.' };
    return { ok: true };
  }

  function validateEmail(value) {
    if (!value || !value.trim()) return { ok: false, msg: 'E-mail é obrigatório.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return { ok: false, msg: 'E-mail inválido.' };
    return { ok: true };
  }

  function validatePassword(value) {
    if (!value) return { ok: false, msg: 'Senha é obrigatória.' };
    if (value.length < RULES.password.min) return { ok: false, msg: `Mínimo ${RULES.password.min} caracteres.` };
    if (value.length > RULES.password.max) return { ok: false, msg: 'Senha muito longa.' };
    return { ok: true };
  }

  function validateConfirmPassword(password, confirm) {
    if (!confirm) return { ok: false, msg: 'Confirme sua senha.' };
    if (password !== confirm) return { ok: false, msg: 'As senhas não coincidem.' };
    return { ok: true };
  }

  function checkNicknameAvailability(_nickname) {
    return null; // unicidade verificada pelo banco no submit
  }

  // ── Fluxo de Cadastro ────────────────────────────────────────────────────

  /**
   * Cadastra novo usuário no Supabase.
   *
   * Fluxo no backend:
   *   1. Supabase Auth cria o registro em auth.users
   *   2. O trigger `on_auth_user_created` dispara automaticamente
   *   3. O trigger insere em public.users com role = 'user' (hardcoded)
   *   4. O frontend NÃO faz nenhum INSERT em public.users
   *
   * Formatos de resposta do GoTrue v1 /auth/v1/signup:
   *
   *   auto-confirm DESATIVADO (email de confirmação necessário):
   *     HTTP 200 → { id, aud, email, confirmation_sent_at, user_metadata, ... }
   *     NÃO tem .user wrapper, NÃO tem .access_token
   *
   *   auto-confirm ATIVADO (sem confirmação de email):
   *     HTTP 200 → { access_token, token_type, expires_in, refresh_token, user: {...} }
   *     NÃO tem .session (isso é formato do SDK v2, não da REST API direta)
   */
  async function register({ nickname, email, password, confirmPassword, serverConfirmed }) {
    if (!serverConfirmed) {
      return { success: false, field: 'server', message: 'Confirme que você é do servidor Moon.' };
    }

    const rl = _checkRateLimit('register');
    if (rl.blocked) {
      return { success: false, message: `Muitas tentativas. Aguarde ${rl.wait}s.` };
    }

    const nickV = validateNickname(nickname);
    if (!nickV.ok) return { success: false, field: 'nickname', message: nickV.msg };

    const emailV = validateEmail(email);
    if (!emailV.ok) return { success: false, field: 'email', message: emailV.msg };

    const passV = validatePassword(password);
    if (!passV.ok) return { success: false, field: 'password', message: passV.msg };

    const confV = validateConfirmPassword(password, confirmPassword);
    if (!confV.ok) return { success: false, field: 'confirmPassword', message: confV.msg };

    const cleanEmail    = email.trim().toLowerCase();
    const cleanNickname = nickname.trim(); // preserva espaços internos: "J F" → "J F"


    try {
      const data = await SupabaseClient.Auth.signUp(
        cleanEmail,
        password,
        {
          nickname: cleanNickname,
          server:   'Moon',
          // NUNCA enviar role aqui — o trigger define role = 'user' no banco
        }
      );

      if (!data) {
        console.error('[Auth] Resposta nula do servidor');
        return { success: false, message: 'Sem resposta do servidor. Verifique sua conexão.' };
      }

      // ── CASO 1: auto-confirm ATIVADO ──────────────────────────────────────
      // GoTrue retorna: { access_token, refresh_token, expires_in, user: {...} }
      if (data.access_token && data.user) {
        const user = await Session._handleLoginSuccess({
          access_token:  data.access_token,
          refresh_token: data.refresh_token,
          expires_in:    data.expires_in,
          user:          data.user,
        });
        return { success: true, user };
      }

      // ── CASO 2: auto-confirm DESATIVADO ───────────────────────────────────
      // GoTrue retorna: { id, email, confirmation_sent_at, ... }
      // Sem .user wrapper, sem .access_token
      // O usuário FOI criado em auth.users mas precisa confirmar o email.
      if (data.id || data.confirmation_sent_at) {
        const userEmail = data.email || cleanEmail;
        return {
          success:           true,
          needsConfirmation: true,
          message:           `Conta criada! Verifique o e-mail ${userEmail} para ativar sua conta.`,
          user:              { email: userEmail, nickname: cleanNickname },
        };
      }

      // ── CASO 3: formato inesperado ────────────────────────────────────────
      console.error('[Auth] Formato de resposta desconhecido:', JSON.stringify(data));
      return { success: false, message: 'Resposta inesperada do servidor. Tente novamente.' };

    } catch (e) {
      console.error('[Auth] Erro no cadastro:', e.message);
      return { success: false, message: _mapAuthError(e.message) };
    }
  }

  // ── Fluxo de Login ───────────────────────────────────────────────────────

  async function login({ email, password }) {
    const rl = _checkRateLimit('login');
    if (rl.blocked) {
      return { success: false, message: `Muitas tentativas. Aguarde ${rl.wait}s.` };
    }

    if (!email || !email.trim()) return { success: false, field: 'email', message: 'Digite seu e-mail.' };
    if (!password)               return { success: false, field: 'password', message: 'Digite sua senha.' };

    try {
      const data = await SupabaseClient.Auth.signIn(email.trim().toLowerCase(), password);

      if (!data || !data.access_token) {
        return { success: false, message: 'Resposta inesperada do servidor. Tente novamente.' };
      }

      const user = await Session._handleLoginSuccess(data);
      return { success: true, user };

    } catch (e) {
      console.error('[Auth] Erro no login:', e.message);
      return { success: false, message: _mapAuthError(e.message) };
    }
  }

  // ── Logout ───────────────────────────────────────────────────────────────

  async function logout() {
    await Session.logout();
  }

  // ── Mapeamento de Erros do Supabase ──────────────────────────────────────

  function _mapAuthError(msg) {
    if (!msg) return 'Erro desconhecido. Tente novamente.';
    const m = msg.toLowerCase();

    if (m.includes('invalid login credentials') || m.includes('invalid email or password')) {
      return 'E-mail ou senha incorretos.';
    }
    if (m.includes('email not confirmed')) {
      return 'Confirme seu e-mail antes de entrar.';
    }
    // Email duplicado em auth.users
    if (m.includes('user already registered') || m.includes('already been registered') || m.includes('email address is already registered')) {
      return 'Este e-mail já possui uma conta. Tente fazer login.';
    }
    // UNIQUE constraint do PostgreSQL (código 23505) — pode vir do trigger
    if (m.includes('duplicate key') || m.includes('23505')) {
      if (m.includes('nickname')) {
        return 'Este nickname já está em uso. Escolha outro.';
      }
      if (m.includes('email')) {
        return 'Este e-mail já possui uma conta. Tente fazer login.';
      }
      return 'Dados já cadastrados. Verifique email e nickname.';
    }
    if (m.includes('password should be at least')) {
      return 'Senha muito curta. Mínimo 6 caracteres.';
    }
    if (m.includes('rate limit') || m.includes('too many requests') || m.includes('security purposes')) {
      return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    }
    if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch')) {
      return 'Erro de conexão. Verifique sua internet.';
    }
    if (m.includes('signup is disabled') || m.includes('signups not allowed')) {
      return 'Cadastro temporariamente desativado. Tente mais tarde.';
    }
    return msg;
  }

  // ── Exporta API Pública ──────────────────────────────────────────────────
  return {
    register,
    login,
    logout,
    validateNickname,
    validateEmail,
    validatePassword,
    validateConfirmPassword,
    checkNicknameAvailability,
  };
})();
