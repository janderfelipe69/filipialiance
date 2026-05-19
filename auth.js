// ============================================================
// auth.js — Lógica de Autenticação com Supabase  [CORRIGIDO]
// PokeAlliance Shop
//
// CORREÇÕES APLICADAS:
//   1. Regex de nickname agora aceita espaços internos
//   2. Mínimo de nickname corrigido para 2 (era 3)
//   3. Mensagem de erro atualizada para refletir regras corretas
//   4. Fallback de role em comentários alinhado com o banco ('user')
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
      min: 2,   // ✅ CORRIGIDO: era 3
      max: 24,
      // ✅ CORRIGIDO: aceita letras, números e espaços internos
      // Regex: ^(?=.{2,24}$)(?!\s+$)[A-Za-z0-9 ]+$
      //   - (?=.{2,24}$)  → entre 2 e 24 caracteres no total
      //   - (?!\s+$)       → não pode ser só espaços
      //   - [A-Za-z0-9 ]+ → só letras, números e espaço
      pattern: /^(?=.{2,24}$)(?!\s+$)[A-Za-z0-9 ]+$/,
    },
    password: { min: 6, max: 64 },
  };

  function validateNickname(value) {
    if (!value || !value.trim()) return { ok: false, msg: 'Nickname é obrigatório.' };

    // Não faz trim antes de validar — espaços internos são permitidos,
    // mas espaços nas BORDAS são removidos antes de enviar ao banco.
    const trimmed = value.trim();

    if (trimmed.length < RULES.nickname.min)
      return { ok: false, msg: `Mínimo ${RULES.nickname.min} caracteres.` };

    if (trimmed.length > RULES.nickname.max)
      return { ok: false, msg: `Máximo ${RULES.nickname.max} caracteres.` };

    // ✅ Regex atualizada: aceita espaços internos
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
   * O que acontece no backend:
   *   1. Supabase Auth cria o registro em auth.users
   *   2. O trigger `on_auth_user_created` dispara automaticamente
   *   3. O trigger insere em public.users com role = 'user' por padrão
   *   4. O frontend NÃO faz nenhum INSERT em public.users
   *
   * @param {{ nickname, email, password, confirmPassword, serverConfirmed }}
   */
  async function register({ nickname, email, password, confirmPassword, serverConfirmed }) {
    if (!serverConfirmed) {
      return { success: false, field: 'server', message: 'Confirme que você é do servidor Moon.' };
    }

    const rl = _checkRateLimit('register');
    if (rl.blocked) {
      return { success: false, message: `Muitas tentativas. Aguarde ${rl.wait}s.` };
    }

    // Valida nickname (regex nova — aceita espaços internos)
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
      // ✅ Envia nickname sem espaços nas bordas (trim),
      //    mas preserva espaços internos — "J F", "Player One" são válidos.
      const data = await SupabaseClient.Auth.signUp(
        email.trim().toLowerCase(),
        password,
        {
          nickname: nickname.trim(), // "  J F  " → "J F"  ✅
          server:   'Moon',
        }
      );

      if (!data || !data.user) {
        return { success: false, message: 'Resposta inesperada do servidor. Tente novamente.' };
      }

      if (!data.session) {
        console.log('[Auth] ✉️ Email de confirmação enviado para:', email);
        return {
          success: true,
          needsConfirmation: true,
          message: `Conta criada! Verifique o e-mail ${email} para ativar sua conta.`,
          user: { email: data.user.email, nickname: nickname.trim() },
        };
      }

      console.log('[Auth] ✅ Cadastro bem-sucedido, fazendo login automático...');
      const user = await Session._handleLoginSuccess(
        data.session
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