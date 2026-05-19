// ============================================================
// auth.js — Lógica de Autenticação com Supabase
// PokeAlliance Shop
//
// Responsabilidades:
//   - Validação de formulários em tempo real
//   - Cadastro via Supabase Auth (signUp)
//   - Login via Supabase Auth (signIn com email+senha)
//   - Logout delegado ao Session
//   - Rate limiting no frontend (proteção extra — o Supabase já limita no servidor)
//
// Arquitetura:
//   - auth.js chama SupabaseClient.Auth.*
//   - auth.js delega gerência de estado ao Session
//   - A role NUNCA é definida aqui — vem do banco via trigger
//
// Depende de: supabase-client.js, session.js
// NÃO usa localStorage para dados de usuário ou role
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
    nickname: { min: 3, max: 24, pattern: /^[a-zA-Z0-9_\-\.]+$/ },
    password: { min: 6, max: 64 },
  };

  function validateNickname(value) {
    if (!value || !value.trim()) return { ok: false, msg: 'Nickname é obrigatório.' };
    const v = value.trim();
    if (v.length < RULES.nickname.min) return { ok: false, msg: `Mínimo ${RULES.nickname.min} caracteres.` };
    if (v.length > RULES.nickname.max) return { ok: false, msg: `Máximo ${RULES.nickname.max} caracteres.` };
    if (!RULES.nickname.pattern.test(v)) return { ok: false, msg: 'Use apenas letras, números, _, - ou .' };
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

  // Nickname availability: sem localStorage — nicknames únicos são garantidos
  // pelo banco (constraint UNIQUE em public.users.nickname).
  // A verificação real acontece no cadastro.
  function checkNicknameAvailability(_nickname) {
    // Validação de formato apenas (unicidade verificada pelo banco no submit)
    return null; // null = sem erro de formato
  }

  // ── Fluxo de Cadastro ────────────────────────────────────────────────────

  /**
   * Cadastra novo usuário no Supabase.
   *
   * O que acontece no backend:
   *   1. Supabase Auth cria o registro em auth.users
   *   2. O trigger `on_auth_user_created` dispara automaticamente
   *   3. O trigger insere em public.users com role = 'consumer' por padrão
   *   4. O frontend NÃO precisa fazer nenhum INSERT em public.users
   *
   * @param {{ nickname, email, password, confirmPassword, serverConfirmed }}
   */
  async function register({ nickname, email, password, confirmPassword, serverConfirmed }) {
    // Verificação de servidor
    if (!serverConfirmed) {
      return { success: false, field: 'server', message: 'Confirme que você é do servidor Moon.' };
    }

    // Rate limiting
    const rl = _checkRateLimit('register');
    if (rl.blocked) {
      return { success: false, message: `Muitas tentativas. Aguarde ${rl.wait}s.` };
    }

    // Validações
    const nickV = validateNickname(nickname);
    if (!nickV.ok) return { success: false, field: 'nickname', message: nickV.msg };

    const emailV = validateEmail(email);
    if (!emailV.ok) return { success: false, field: 'email', message: emailV.msg };

    const passV = validatePassword(password);
    if (!passV.ok) return { success: false, field: 'password', message: passV.msg };

    const confV = validateConfirmPassword(password, confirmPassword);
    if (!confV.ok) return { success: false, field: 'confirmPassword', message: confV.msg };

    console.log('[Auth] 📝 Iniciando cadastro para:', email);

    try {
      // Envia nickname e server como metadata — o trigger usa esses dados
      // para preencher public.users automaticamente
      const data = await SupabaseClient.Auth.signUp(
        email.trim().toLowerCase(),
        password,
        {
          nickname: nickname.trim(),
          server:   'Moon',
        }
      );

      // Supabase retorna user mesmo sem confirmar email
      if (!data || !data.user) {
        return { success: false, message: 'Resposta inesperada do servidor. Tente novamente.' };
      }

      // Se o Supabase exige confirmação de email, data.session será null
      if (!data.session) {
        console.log('[Auth] ✉️ Email de confirmação enviado para:', email);
        return {
          success: true,
          needsConfirmation: true,
          message: `Conta criada! Verifique o e-mail ${email} para ativar sua conta.`,
          user: { email: data.user.email, nickname: nickname.trim() },
        };
      }

      // Login automático após cadastro (quando email confirmation está desativado)
      console.log('[Auth] ✅ Cadastro bem-sucedido, fazendo login automático...');
      const user = await Session._handleLoginSuccess(data.session
        ? { ...data.session, user: data.user }
        : data
      );

      return { success: true, user };

    } catch (e) {
      console.error('[Auth] ❌ Erro no cadastro:', e.message);
      return { success: false, message: _mapAuthError(e.message) };
    }
  }

  // ── Fluxo de Login ───────────────────────────────────────────────────────

  /**
   * Autentica com email e senha.
   * Após o login, o perfil é carregado de public.users (incluindo role).
   *
   * @param {{ email, password }}
   */
  async function login({ email, password }) {
    const rl = _checkRateLimit('login');
    if (rl.blocked) {
      return { success: false, message: `Muitas tentativas. Aguarde ${rl.wait}s.` };
    }

    if (!email || !email.trim()) return { success: false, field: 'email', message: 'Digite seu e-mail.' };
    if (!password)               return { success: false, field: 'password', message: 'Digite sua senha.' };

    console.log('[Auth] 🔐 Tentando login para:', email);

    try {
      const data = await SupabaseClient.Auth.signIn(email.trim().toLowerCase(), password);

      if (!data || !data.access_token) {
        return { success: false, message: 'Resposta inesperada do servidor. Tente novamente.' };
      }

      const user = await Session._handleLoginSuccess(data);
      console.log('[Auth] ✅ Login bem-sucedido:', user.nickname || user.email);
      return { success: true, user };

    } catch (e) {
      console.error('[Auth] ❌ Erro no login:', e.message);
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
    if (m.includes('user already registered') || m.includes('already been registered')) {
      return 'Este e-mail já possui uma conta. Faça login.';
    }
    if (m.includes('password should be at least')) {
      return 'Senha muito curta. Mínimo 6 caracteres.';
    }
    if (m.includes('rate limit') || m.includes('too many requests')) {
      return 'Muitas tentativas. Aguarde alguns minutos.';
    }
    if (m.includes('network') || m.includes('fetch')) {
      return 'Erro de conexão. Verifique sua internet.';
    }
    // Retorna mensagem original se não mapeada (pode ajudar no debug)
    return msg;
  }

  // ── Exporta API Pública ──────────────────────────────────────────────────
  return {
    register,
    login,
    logout,
    // Validações expostas para feedback em tempo real no formulário
    validateNickname,
    validateEmail,
    validatePassword,
    validateConfirmPassword,
    checkNicknameAvailability,
  };
})();
