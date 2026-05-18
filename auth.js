// ============================================================
// auth.js — Lógica de autenticação e validação
// PokeAlliance Shop — Sistema de Autenticação
//
// Responsabilidades:
//   - Validação de formulários em tempo real
//   - Fluxo de cadastro com verificação de servidor
//   - Fluxo de login
//   - Proteção anti-spam (rate limiting simples)
//   - Ponte entre UI (login.js) e dados (user-storage.js)
//
// Depende de: user-storage.js, session.js
// ============================================================

const Auth = (() => {
  // ── Anti-spam / Rate limiting ────────────────────────────────────────────
  // Previne tentativas repetidas de cadastro/login em curto período.
  // Em produção com Firebase/Supabase, isso seria feito no servidor.
  const _attempts = { login: [], register: [] };
  const RATE_LIMIT = { MAX: 5, WINDOW_MS: 60 * 1000 }; // 5 tentativas por minuto

  function _checkRateLimit(action) {
    const now = Date.now();
    _attempts[action] = _attempts[action].filter(t => now - t < RATE_LIMIT.WINDOW_MS);
    if (_attempts[action].length >= RATE_LIMIT.MAX) {
      const wait = Math.ceil((RATE_LIMIT.WINDOW_MS - (now - _attempts[action][0])) / 1000);
      return { blocked: true, wait };
    }
    _attempts[action].push(now);
    return { blocked: false };
  }

  // ── Validações ───────────────────────────────────────────────────────────

  const RULES = {
    nickname: {
      minLength: 3,
      maxLength: 24,
      pattern: /^[a-zA-Z0-9_\-\.]+$/,
      patternMsg: 'Use apenas letras, números, _, - ou .',
    },
    password: {
      minLength: 6,
      maxLength: 64,
    },
  };

  function validateNickname(value) {
    if (!value || !value.trim()) return { ok: false, msg: 'Nickname é obrigatório.' };
    const v = value.trim();
    if (v.length < RULES.nickname.minLength) return { ok: false, msg: `Mínimo ${RULES.nickname.minLength} caracteres.` };
    if (v.length > RULES.nickname.maxLength) return { ok: false, msg: `Máximo ${RULES.nickname.maxLength} caracteres.` };
    if (!RULES.nickname.pattern.test(v)) return { ok: false, msg: RULES.nickname.patternMsg };
    return { ok: true };
  }

  function validateEmail(value) {
    if (!value || !value.trim()) return { ok: false, msg: 'E-mail é obrigatório.' };
    const v = value.trim();
    // RFC 5322 simplificado
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { ok: false, msg: 'E-mail inválido.' };
    return { ok: true };
  }

  function validatePassword(value) {
    if (!value) return { ok: false, msg: 'Senha é obrigatória.' };
    if (value.length < RULES.password.minLength) return { ok: false, msg: `Mínimo ${RULES.password.minLength} caracteres.` };
    if (value.length > RULES.password.maxLength) return { ok: false, msg: 'Senha muito longa.' };
    return { ok: true };
  }

  function validateConfirmPassword(password, confirm) {
    if (!confirm) return { ok: false, msg: 'Confirme sua senha.' };
    if (password !== confirm) return { ok: false, msg: 'As senhas não coincidem.' };
    return { ok: true };
  }

  /**
   * Verifica em tempo real se o nickname já está em uso.
   * Retorna null se o nickname ainda está disponível.
   */
  function checkNicknameAvailability(nickname) {
    const v = validateNickname(nickname);
    if (!v.ok) return v.msg;
    if (UserStorage.isNicknameTaken(nickname)) return `"${nickname.trim()}" já está em uso.`;
    return null; // disponível
  }

  // ── Fluxo de Cadastro ────────────────────────────────────────────────────

  /**
   * Executa o cadastro completo.
   * @param {object} data - { nickname, email, password, confirmPassword, serverConfirmed }
   * @returns {{ success: boolean, user?: object, error?: string, message?: string }}
   */
  async function register({ nickname, email, password, confirmPassword, serverConfirmed }) {
    // Verificação de servidor Moon (regra de negócio obrigatória)
    if (!serverConfirmed) {
      return { success: false, field: 'server', message: 'Confirme que você é do servidor Moon.' };
    }

    // Rate limiting
    const rl = _checkRateLimit('register');
    if (rl.blocked) {
      return { success: false, message: `Muitas tentativas. Aguarde ${rl.wait}s.` };
    }

    // Validações individuais
    const nickV = validateNickname(nickname);
    if (!nickV.ok) return { success: false, field: 'nickname', message: nickV.msg };

    const emailV = validateEmail(email);
    if (!emailV.ok) return { success: false, field: 'email', message: emailV.msg };

    const passV = validatePassword(password);
    if (!passV.ok) return { success: false, field: 'password', message: passV.msg };

    const confV = validateConfirmPassword(password, confirmPassword);
    if (!confV.ok) return { success: false, field: 'confirmPassword', message: confV.msg };

    // Simula delay de rede (remove quando integrar Supabase/Firebase)
    // Isso também protege contra brute force temporal
    await _delay(400);

    // Cria usuário na storage
    const result = UserStorage.createUser({ nickname, email, password });

    if (!result.success) {
      // Mapeia o campo de erro para o formulário
      const fieldMap = {
        nickname_taken: 'nickname',
        email_taken:    'email',
      };
      return {
        success: false,
        field:   fieldMap[result.error] || null,
        message: result.message,
      };
    }

    // Login automático após cadastro
    Session.login(result.user);

    return { success: true, user: result.user };
  }

  // ── Fluxo de Login ───────────────────────────────────────────────────────

  /**
   * Autentica o usuário.
   * @param {{ nickname: string, password: string }}
   */
  async function login({ nickname, password }) {
    // Rate limiting
    const rl = _checkRateLimit('login');
    if (rl.blocked) {
      return { success: false, message: `Muitas tentativas. Aguarde ${rl.wait}s.` };
    }

    // Validações básicas
    if (!nickname || !nickname.trim()) {
      return { success: false, field: 'nickname', message: 'Digite seu nickname.' };
    }
    if (!password) {
      return { success: false, field: 'password', message: 'Digite sua senha.' };
    }

    // Delay anti-brute force
    await _delay(500);

    const result = UserStorage.authenticateUser({ nickname, password });

    if (!result.success) {
      return { success: false, message: result.message };
    }

    Session.login(result.user);
    return { success: true, user: result.user };
  }

  // ── Logout ───────────────────────────────────────────────────────────────
  function logout() {
    Session.logout();
  }

  // ── Utilitário ───────────────────────────────────────────────────────────
  function _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Exporta API pública ───────────────────────────────────────────────────
  return {
    register,
    login,
    logout,
    // Validações expostas para feedback em tempo real no formulário:
    validateNickname,
    validateEmail,
    validatePassword,
    validateConfirmPassword,
    checkNicknameAvailability,
  };
})();
