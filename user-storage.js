// ============================================================
// user-storage.js — Camada de persistência de usuários
// PokeAlliance Shop — Sistema de Autenticação
//
// ARQUITETURA: Este módulo é a única camada que toca localStorage.
// Todos os outros módulos (auth.js, session.js) passam por aqui.
// Isso facilita a migração futura para Supabase/Firebase:
// basta reimplementar este arquivo mantendo a mesma API pública.
// ============================================================

const UserStorage = (() => {
  // ── Chaves do localStorage ──────────────────────────────────────────────────
  const KEYS = {
    USERS:   'pa_users_v1',     // Array de usuários cadastrados
    SESSION: 'pa_session_v1',   // Sessão atual (usuário logado)
  };

  // ── Utilitário: hash simples de senha (FNV-1a 32bit) ──────────────────────
  // NOTA: Isso é uma proteção básica para dados locais.
  // Em produção com Supabase/Firebase, use bcrypt ou Argon2 no backend.
  function hashPassword(password) {
    let hash = 2166136261; // FNV offset basis
    for (let i = 0; i < password.length; i++) {
      hash ^= password.charCodeAt(i);
      hash = (hash * 16777619) >>> 0; // FNV prime, 32-bit unsigned
    }
    // Adiciona salt baseado em comprimento + primeiro char para dificultar rainbow tables
    const salt = password.length * 31 + (password.charCodeAt(0) || 0);
    return (hash ^ salt).toString(16).padStart(8, '0') + password.length.toString(16);
  }

  // ── Leitura/Escrita bruta ─────────────────────────────────────────────────
  function getAllUsers() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    } catch {
      return [];
    }
  }

  function saveAllUsers(users) {
    try {
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
      return true;
    } catch {
      return false;
    }
  }

  // ── API Pública de Usuários ───────────────────────────────────────────────

  /**
   * Cria um novo usuário.
   * @returns {{ success: boolean, error?: string, user?: object }}
   */
  function createUser({ nickname, email, password }) {
    const users = getAllUsers();

    // Validações de unicidade
    const nickLower = nickname.trim().toLowerCase();
    const emailLower = email.trim().toLowerCase();

    if (users.find(u => u.nickname.toLowerCase() === nickLower)) {
      return { success: false, error: 'nickname_taken', message: `O nickname "${nickname}" já está em uso. Escolha outro!` };
    }
    if (users.find(u => u.email.toLowerCase() === emailLower)) {
      return { success: false, error: 'email_taken', message: 'Este e-mail já possui uma conta cadastrada.' };
    }

    const newUser = {
      id:        crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
      nickname:  nickname.trim(),
      email:     emailLower,
      password:  hashPassword(password),
      server:    'Moon',
      createdAt: new Date().toISOString(),
      // Campos preparados para expansão futura:
      avatar:    null,         // URL de avatar customizado
      role:      'player',     // 'player' | 'admin' | 'mod'
      favorites: [],           // Lista de IDs de itens favoritos
      orderHistory: [],        // Histórico de pedidos
      savedCart:  {},          // Carrinho salvo entre sessões
      preferences: {},         // Preferências de UI
    };

    users.push(newUser);
    const saved = saveAllUsers(users);
    if (!saved) return { success: false, error: 'storage_fail', message: 'Falha ao salvar. Tente novamente.' };

    // Retorna usuário SEM senha
    const { password: _p, ...safeUser } = newUser;
    return { success: true, user: safeUser };
  }

  /**
   * Autentica um usuário com nickname e senha.
   * @returns {{ success: boolean, user?: object, message?: string }}
   */
  function authenticateUser({ nickname, password }) {
    const users = getAllUsers();
    const nickLower = nickname.trim().toLowerCase();
    const user = users.find(u => u.nickname.toLowerCase() === nickLower);

    if (!user) {
      return { success: false, message: 'Nickname não encontrado. Verifique ou crie uma conta.' };
    }
    if (user.password !== hashPassword(password)) {
      return { success: false, message: 'Senha incorreta. Tente novamente.' };
    }

    const { password: _p, ...safeUser } = user;
    return { success: true, user: safeUser };
  }

  /**
   * Busca um usuário pelo ID (sem senha).
   */
  function getUserById(id) {
    const users = getAllUsers();
    const user = users.find(u => u.id === id);
    if (!user) return null;
    const { password: _p, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Atualiza campos de um usuário (nunca expõe/altera senha por aqui).
   */
  function updateUser(id, updates) {
    const users = getAllUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return { success: false };
    // Campos protegidos que não podem ser atualizados por este método
    const { password: _p, id: _id, createdAt: _c, ...safeUpdates } = updates;
    users[idx] = { ...users[idx], ...safeUpdates };
    saveAllUsers(users);
    const { password: _pw, ...safeUser } = users[idx];
    return { success: true, user: safeUser };
  }

  // ── API Pública de Sessão ─────────────────────────────────────────────────

  function saveSession(user) {
    try {
      localStorage.setItem(KEYS.SESSION, JSON.stringify({
        userId:    user.id,
        nickname:  user.nickname,
        savedAt:   Date.now(),
      }));
    } catch { /* ignora */ }
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(KEYS.SESSION);
      if (!raw) return null;
      const session = JSON.parse(raw);
      // Expira sessão após 30 dias de inatividade
      const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
      if (Date.now() - session.savedAt > MAX_AGE) {
        clearSession();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(KEYS.SESSION);
  }

  function isNicknameTaken(nickname) {
    const users = getAllUsers();
    return users.some(u => u.nickname.toLowerCase() === nickname.trim().toLowerCase());
  }

  // ── Exporta API pública ───────────────────────────────────────────────────
  return {
    createUser,
    authenticateUser,
    getUserById,
    updateUser,
    saveSession,
    getSession,
    clearSession,
    isNicknameTaken,
    // Exposto apenas para debug/admin futuros:
    _getAllUsers: getAllUsers,
  };
})();
