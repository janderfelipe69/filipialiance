// ============================================================
// login.js — Interface do sistema de autenticação
// PokeAlliance Shop — Sistema de Autenticação
//
// Responsabilidades:
//   - Modal de Login / Cadastro
//   - Tela de verificação de servidor (Moon check)
//   - Modal "Minha Conta"
//   - Confirmação de logout
//   - Animações e feedback visual
//   - Validação em tempo real nos campos
//
// Depende de: auth.js, session.js, user-storage.js
// ============================================================

const AuthModal = (() => {
  // ── Estado interno do modal ──────────────────────────────────────────────
  let _mode = 'login'; // 'login' | 'register' | 'server-check'
  let _serverConfirmed = false;
  let _nickCheckTimer = null;
  let _isSubmitting = false;

  // ── Injeção do HTML do modal ─────────────────────────────────────────────
  // O modal é criado dinamicamente para não poluir o HTML principal
  function _ensureModal() {
    if (document.getElementById('auth-modal-root')) return;

    const root = document.createElement('div');
    root.id = 'auth-modal-root';
    root.innerHTML = `
      <!-- OVERLAY -->
      <div class="auth-overlay" id="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <div class="auth-modal" id="auth-modal">

          <!-- Cabeçalho do modal -->
          <div class="auth-modal-header">
            <div class="auth-modal-emblem" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="am-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#ffd166"/>
                    <stop offset="100%" style="stop-color:#c88a00"/>
                  </linearGradient>
                  <linearGradient id="am-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#3a8cff"/>
                    <stop offset="100%" style="stop-color:#0a3a8a"/>
                  </linearGradient>
                </defs>
                <path d="M20 2L35 9L35 22Q35 31 20 38Q5 31 5 22L5 9Z" fill="url(#am-blue)" stroke="url(#am-gold)" stroke-width="1"/>
                <text x="20" y="24" text-anchor="middle" font-family="Cinzel,serif" font-size="10" font-weight="900" fill="url(#am-gold)">PA</text>
              </svg>
            </div>
            <div class="auth-modal-title-wrap">
              <div class="auth-modal-site-name">PokeAlliance</div>
              <div class="auth-modal-title" id="auth-modal-title">Entrar</div>
            </div>
            <button class="auth-modal-close" onclick="AuthModal.close()" aria-label="Fechar modal">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/>
              </svg>
            </button>
          </div>

          <!-- Corpo: troca entre telas via display -->
          <div class="auth-modal-body" id="auth-modal-body">

            <!-- ── TELA: SERVER CHECK ────────────────────────────── -->
            <div class="auth-screen" id="auth-screen-server">
              <div class="auth-server-check">
                <div class="auth-server-icon">🌙</div>
                <div class="auth-server-title">Verificação de Servidor</div>
                <div class="auth-server-desc">
                  Para criar uma conta, você precisa ser jogador do servidor Moon.<br>
                  Seu personagem é do servidor <strong>Moon</strong>?
                </div>
                <div class="auth-server-btns">
                  <button class="auth-btn auth-btn--yes" onclick="AuthModal._serverYes()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Sim, sou do Moon!
                  </button>
                  <button class="auth-btn auth-btn--no" onclick="AuthModal._serverNo()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Não, sou de outro servidor
                  </button>
                </div>
              </div>
            </div>

            <!-- ── TELA: BLOQUEIO (não é do Moon) ───────────────── -->
            <div class="auth-screen" id="auth-screen-blocked">
              <div class="auth-blocked">
                <div class="auth-blocked-icon">🚫</div>
                <div class="auth-blocked-title">Acesso Restrito</div>
                <div class="auth-blocked-msg">
                  Desculpe, atualmente apenas jogadores do servidor <strong>Moon</strong> podem criar conta.
                </div>
                <div class="auth-blocked-sub">
                  Se você migrar para o Moon no futuro, volte e crie sua conta!
                </div>
                <button class="auth-btn auth-btn--secondary" onclick="AuthModal.showScreen('server')">
                  ← Voltar
                </button>
              </div>
            </div>

            <!-- ── TELA: LOGIN ───────────────────────────────────── -->
            <div class="auth-screen" id="auth-screen-login">
              <div class="auth-form-error" id="auth-login-error" role="alert" aria-live="polite"></div>

              <div class="auth-field">
                <label class="auth-label" for="auth-login-email">E-mail</label>
                <div class="auth-input-wrap">
                  <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <input
                    id="auth-login-email"
                    class="auth-input"
                    type="text"
                    placeholder="seu@email.com"
                    autocomplete="email"
                    maxlength="100"
                    oninput="AuthModal._clearFieldError('auth-login-email')"
                    onkeydown="if(event.key==='Enter') AuthModal._submitLogin()"
                  />
                </div>
                <div class="auth-field-error" id="auth-login-email-error"></div>
              </div>

              <div class="auth-field">
                <label class="auth-label" for="auth-login-pass">Senha</label>
                <div class="auth-input-wrap">
                  <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input
                    id="auth-login-pass"
                    class="auth-input"
                    type="password"
                    placeholder="••••••••"
                    autocomplete="current-password"
                    maxlength="64"
                    oninput="AuthModal._clearFieldError('auth-login-pass')"
                    onkeydown="if(event.key==='Enter') AuthModal._submitLogin()"
                  />
                  <button type="button" class="auth-eye-btn" onclick="AuthModal._togglePass('auth-login-pass', this)" aria-label="Mostrar/ocultar senha">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
                <div class="auth-field-error" id="auth-login-pass-error"></div>
              </div>

              <button class="auth-submit-btn" id="auth-login-submit" onclick="AuthModal._submitLogin()">
                <span class="auth-submit-text">Entrar</span>
                <span class="auth-submit-spinner" style="display:none">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="auth-spin"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="8"/></svg>
                </span>
              </button>

              <div class="auth-switch">
                Ainda não tem conta?
                <button class="auth-switch-link" onclick="AuthModal.showScreen('server')">Criar conta</button>
              </div>
            </div>

            <!-- ── TELA: CADASTRO ────────────────────────────────── -->
            <div class="auth-screen" id="auth-screen-register">
              <div class="auth-form-error" id="auth-reg-error" role="alert" aria-live="polite"></div>

              <div class="auth-field">
                <label class="auth-label" for="auth-reg-nick">
                  Nickname
                  <span class="auth-nick-availability" id="auth-nick-avail"></span>
                </label>
                <div class="auth-input-wrap">
                  <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <input
                    id="auth-reg-nick"
                    class="auth-input"
                    type="text"
                    placeholder="Seu nick no jogo"
                    autocomplete="email"
                    maxlength="100"
                    oninput="AuthModal._onNickInput(this.value)"
                  />
                </div>
                <div class="auth-field-error" id="auth-reg-nick-error"></div>
              </div>

              <div class="auth-field">
                <label class="auth-label" for="auth-reg-email">E-mail</label>
                <div class="auth-input-wrap">
                  <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <input
                    id="auth-reg-email"
                    class="auth-input"
                    type="email"
                    placeholder="seu@email.com"
                    autocomplete="email"
                    maxlength="100"
                    oninput="AuthModal._clearFieldError('auth-reg-email')"
                  />
                </div>
                <div class="auth-field-error" id="auth-reg-email-error"></div>
              </div>

              <div class="auth-field">
                <label class="auth-label" for="auth-reg-pass">Senha</label>
                <div class="auth-input-wrap">
                  <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input
                    id="auth-reg-pass"
                    class="auth-input"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    autocomplete="new-password"
                    maxlength="64"
                    oninput="AuthModal._clearFieldError('auth-reg-pass'); AuthModal._checkPasswordStrength(this.value)"
                  />
                  <button type="button" class="auth-eye-btn" onclick="AuthModal._togglePass('auth-reg-pass', this)" aria-label="Mostrar/ocultar senha">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
                <div class="auth-field-error" id="auth-reg-pass-error"></div>
                <!-- Indicador de força da senha -->
                <div class="auth-pass-strength" id="auth-pass-strength" style="display:none">
                  <div class="auth-pass-strength-bar">
                    <div class="auth-pass-strength-fill" id="auth-pass-strength-fill"></div>
                  </div>
                  <span class="auth-pass-strength-label" id="auth-pass-strength-label"></span>
                </div>
              </div>

              <div class="auth-field">
                <label class="auth-label" for="auth-reg-conf">Confirmar Senha</label>
                <div class="auth-input-wrap">
                  <svg class="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <input
                    id="auth-reg-conf"
                    class="auth-input"
                    type="password"
                    placeholder="Repita a senha"
                    autocomplete="new-password"
                    maxlength="64"
                    oninput="AuthModal._clearFieldError('auth-reg-conf')"
                    onkeydown="if(event.key==='Enter') AuthModal._submitRegister()"
                  />
                </div>
                <div class="auth-field-error" id="auth-reg-conf-error"></div>
              </div>

              <button class="auth-submit-btn" id="auth-reg-submit" onclick="AuthModal._submitRegister()">
                <span class="auth-submit-text">Criar Conta</span>
                <span class="auth-submit-spinner" style="display:none">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="auth-spin"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="8"/></svg>
                </span>
              </button>

              <div class="auth-switch">
                Já tem conta?
                <button class="auth-switch-link" onclick="AuthModal.open('login')">Entrar</button>
              </div>
            </div>

            <!-- ── TELA: SUCESSO ─────────────────────────────────── -->
            <div class="auth-screen" id="auth-screen-success">
              <div class="auth-success">
                <div class="auth-success-icon">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="22" stroke="#3a8cff" stroke-width="2" opacity="0.3"/>
                    <circle cx="24" cy="24" r="16" fill="rgba(58,140,255,0.1)" stroke="#3a8cff" stroke-width="1.5"/>
                    <polyline points="15,24 21,30 33,18" stroke="#3a8cff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="auth-success-title" id="auth-success-title">Bem-vindo!</div>
                <div class="auth-success-msg" id="auth-success-msg"></div>
              </div>
            </div>

          </div><!-- /auth-modal-body -->
        </div><!-- /auth-modal -->
      </div><!-- /auth-overlay -->

      <!-- ── MODAL: MINHA CONTA ──────────────────────────────────── -->
      <div class="auth-overlay" id="auth-account-overlay" style="display:none" role="dialog" aria-modal="true" aria-label="Minha Conta">
        <div class="auth-modal auth-modal--account" id="auth-account-modal">
          <div class="auth-modal-header">
            <div class="auth-modal-title-wrap">
              <div class="auth-modal-site-name">PokeAlliance</div>
              <div class="auth-modal-title">Minha Conta</div>
            </div>
            <button class="auth-modal-close" onclick="AuthModal.closeMyAccount()" aria-label="Fechar">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
            </button>
          </div>
          <div class="auth-account-body" id="auth-account-body"></div>
        </div>
      </div>

      <!-- ── MODAL: CONFIRMAR LOGOUT ────────────────────────────── -->
      <div class="auth-overlay" id="auth-logout-overlay" style="display:none" role="dialog" aria-modal="true">
        <div class="auth-modal auth-modal--sm" id="auth-logout-modal">
          <div class="auth-modal-header">
            <div class="auth-modal-title-wrap">
              <div class="auth-modal-title">Sair da Conta?</div>
            </div>
            <button class="auth-modal-close" onclick="AuthModal.closeLogoutConfirm()" aria-label="Fechar">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
            </button>
          </div>
          <div class="auth-logout-body">
            <div class="auth-logout-msg">Tem certeza que deseja sair da sua conta?</div>
            <div class="auth-logout-btns">
              <button class="auth-btn auth-btn--secondary" onclick="AuthModal.closeLogoutConfirm()">Cancelar</button>
              <button class="auth-btn auth-btn--danger" onclick="AuthModal._doLogout()">Sair</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    // Fecha o modal ao clicar no overlay
    document.getElementById('auth-overlay').addEventListener('click', function(e) {
      if (e.target === this) AuthModal.close();
    });
  }

  // ── API Pública ───────────────────────────────────────────────────────────

  /**
   * Abre o modal de autenticação.
   * @param {'login'|'register'} mode
   */
  function open(mode = 'login') {
    _ensureModal();
    _mode = mode;
    if (mode === 'login') {
      showScreen('login');
    } else {
      showScreen('server');
    }
    const overlay = document.getElementById('auth-overlay');
    overlay.style.display = 'flex';
    // Força reflow para a animação de entrada funcionar
    requestAnimationFrame(() => overlay.classList.add('open'));
    document.body.style.overflow = 'hidden';
    // Foca o primeiro input após a animação
    setTimeout(() => {
      const first = overlay.querySelector('.auth-input');
      if (first) first.focus();
    }, 300);
  }

  function close() {
    const overlay = document.getElementById('auth-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    setTimeout(() => {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
      _resetForms();
    }, 300);
  }

  /**
   * Muda a tela exibida dentro do modal.
   */
  function showScreen(screen) {
    _ensureModal();
    const screens = document.querySelectorAll('.auth-screen');
    screens.forEach(s => s.classList.remove('active'));

    const target = document.getElementById(`auth-screen-${screen}`);
    if (target) {
      target.classList.add('active');
    }

    // Atualiza o título do modal
    const titleEl = document.getElementById('auth-modal-title');
    const titles = {
      login:    'Entrar',
      register: 'Criar Conta',
      server:   'Verificação',
      blocked:  'Acesso Restrito',
      success:  'Bem-vindo!',
    };
    if (titleEl) titleEl.textContent = titles[screen] || '';
  }

  // ── Tela de Server Check ─────────────────────────────────────────────────
  function _serverYes() {
    _serverConfirmed = true;
    showScreen('register');
    setTimeout(() => {
      const nickInput = document.getElementById('auth-reg-nick');
      if (nickInput) nickInput.focus();
    }, 150);
  }

  function _serverNo() {
    _serverConfirmed = false;
    showScreen('blocked');
  }

  // ── Verificação de nick em tempo real ────────────────────────────────────
  function _onNickInput(value) {
    _clearFieldError('auth-reg-nick');
    const availEl = document.getElementById('auth-nick-avail');
    if (!availEl) return;

    clearTimeout(_nickCheckTimer);

    if (!value || value.length < 3) {
      availEl.textContent = '';
      availEl.className = 'auth-nick-availability';
      return;
    }

    availEl.textContent = '…';
    availEl.className = 'auth-nick-availability checking';

    _nickCheckTimer = setTimeout(() => {
      const error = Auth.checkNicknameAvailability(value);
      if (error) {
        availEl.textContent = '✗ ' + error;
        availEl.className = 'auth-nick-availability taken';
      } else {
        availEl.textContent = '✓ Disponível';
        availEl.className = 'auth-nick-availability available';
      }
    }, 400);
  }

  // ── Indicador de força da senha ──────────────────────────────────────────
  function _checkPasswordStrength(value) {
    const strengthEl = document.getElementById('auth-pass-strength');
    const fillEl = document.getElementById('auth-pass-strength-fill');
    const labelEl = document.getElementById('auth-pass-strength-label');
    if (!strengthEl) return;

    if (!value) { strengthEl.style.display = 'none'; return; }
    strengthEl.style.display = 'flex';

    let score = 0;
    if (value.length >= 6)  score++;
    if (value.length >= 10) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;

    const levels = [
      { label: 'Muito Fraca', color: '#ff4757', pct: '20%' },
      { label: 'Fraca',       color: '#ff6b35', pct: '40%' },
      { label: 'Média',       color: '#ffd166', pct: '60%' },
      { label: 'Forte',       color: '#3a8cff', pct: '80%' },
      { label: 'Muito Forte', color: '#2ed573', pct: '100%'},
    ];

    const level = levels[Math.min(score, levels.length - 1)];
    fillEl.style.width = level.pct;
    fillEl.style.background = level.color;
    labelEl.textContent = level.label;
    labelEl.style.color = level.color;
  }

  // ── Toggle de visibilidade de senha ─────────────────────────────────────
  function _togglePass(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.style.opacity = isPassword ? '1' : '0.5';
  }

  // ── Submissão de Login ───────────────────────────────────────────────────
  async function _submitLogin() {
    if (_isSubmitting) return;

    const email = (document.getElementById('auth-login-email') || {}).value || '';
    const password = (document.getElementById('auth-login-pass') || {}).value || '';

    _setLoading('auth-login-submit', true);
    _clearError('auth-login-error');
    _isSubmitting = true;

    const result = await Auth.login({ email, password });
    _isSubmitting = false;
    _setLoading('auth-login-submit', false);

    if (!result.success) {
      if (result.field === 'email') {
        _setFieldError('auth-login-email', result.message);
      } else if (result.field === 'password') {
        _setFieldError('auth-login-pass', result.message);
      } else {
        _setError('auth-login-error', result.message);
      }
      // Vibração sutil no modal para indicar erro
      _shakeModal();
      return;
    }

    // Sucesso
    _showSuccess(`Olá, ${result.user.nickname}! Bem-vindo de volta.`);
    setTimeout(() => close(), 1800);
  }

  // ── Submissão de Cadastro ────────────────────────────────────────────────
  async function _submitRegister() {
    if (_isSubmitting) return;

    const nickname        = (document.getElementById('auth-reg-nick')  || {}).value || '';
    const email           = (document.getElementById('auth-reg-email') || {}).value || '';
    const password        = (document.getElementById('auth-reg-pass')  || {}).value || '';
    const confirmPassword = (document.getElementById('auth-reg-conf')  || {}).value || '';

    _setLoading('auth-reg-submit', true);
    _clearError('auth-reg-error');
    _isSubmitting = true;

    const result = await Auth.register({
      nickname, email, password, confirmPassword,
      serverConfirmed: _serverConfirmed,
    });

    _isSubmitting = false;
    _setLoading('auth-reg-submit', false);

    if (!result.success) {
      const fieldMap = {
        nickname:        'auth-reg-nick',
        email:           'auth-reg-email',
        password:        'auth-reg-pass',
        confirmPassword: 'auth-reg-conf',
      };
      if (result.field && fieldMap[result.field]) {
        _setFieldError(fieldMap[result.field], result.message);
      } else {
        _setError('auth-reg-error', result.message);
      }
      _shakeModal();
      return;
    }

    // Sucesso
    _showSuccess(`Conta criada! Bem-vindo ao PokeAlliance, ${result.user.nickname}!`);
    setTimeout(() => close(), 2000);
  }

  // ── Modal: Minha Conta ───────────────────────────────────────────────────
  function openMyAccount() {
    _ensureModal();
    const user = Session.getCurrentUser();
    if (!user) return;

    const initials = (user.nickname || '?').slice(0, 2).toUpperCase();
    const createdDate = user.createdAt
      ? new Date(user.createdAt).toLocaleDateString('pt-BR')
      : '—';

    const body = document.getElementById('auth-account-body');
    body.innerHTML = `
      <div class="auth-account-profile">
        <div class="auth-account-avatar">
          <span>${initials}</span>
          <span class="auth-status-dot"></span>
        </div>
        <div class="auth-account-info">
          <div class="auth-account-nick">${user.nickname}</div>
          <div class="auth-account-email">${user.email}</div>
        </div>
      </div>

      <div class="auth-account-stats">
        <div class="auth-account-stat">
          <div class="auth-account-stat-label">Servidor</div>
          <div class="auth-account-stat-val">🌙 Moon</div>
        </div>
        <div class="auth-account-stat">
          <div class="auth-account-stat-label">Membro desde</div>
          <div class="auth-account-stat-val">${createdDate}</div>
        </div>
        <div class="auth-account-stat">
          <div class="auth-account-stat-label">Pedidos</div>
          <div class="auth-account-stat-val">${(user.orderHistory || []).length}</div>
        </div>
        <div class="auth-account-stat">
          <div class="auth-account-stat-label">Favoritos</div>
          <div class="auth-account-stat-val">${(user.favorites || []).length}</div>
        </div>
      </div>

      <!-- Seções futuras já estruturadas -->
      <div class="auth-account-section">
        <div class="auth-account-section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
          Histórico de Pedidos
        </div>
        <div class="auth-account-empty">
          ${(user.orderHistory || []).length === 0
            ? '<span>Nenhum pedido realizado ainda.</span>'
            : '<span>Em breve disponível.</span>'
          }
        </div>
      </div>

      <div class="auth-account-section">
        <div class="auth-account-section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          Favoritos
        </div>
        <div class="auth-account-empty"><span>Em breve disponível.</span></div>
      </div>

      <button class="auth-btn auth-btn--danger auth-logout-full-btn" onclick="AuthModal.closeMyAccount(); AuthModal.openLogoutConfirm()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Sair da Conta
      </button>
    `;

    const overlay = document.getElementById('auth-account-overlay');
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('open'));
    document.body.style.overflow = 'hidden';

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) AuthModal.closeMyAccount();
    }, { once: true });
  }

  function closeMyAccount() {
    const overlay = document.getElementById('auth-account-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    setTimeout(() => { overlay.style.display = 'none'; document.body.style.overflow = ''; }, 300);
  }

  // ── Modal: Confirmar Logout ──────────────────────────────────────────────
  function openLogoutConfirm() {
    _ensureModal();
    const overlay = document.getElementById('auth-logout-overlay');
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('open'));
    document.body.style.overflow = 'hidden';
  }

  function closeLogoutConfirm() {
    const overlay = document.getElementById('auth-logout-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    setTimeout(() => { overlay.style.display = 'none'; document.body.style.overflow = ''; }, 300);
  }

  function _doLogout() {
    closeLogoutConfirm();
    Auth.logout();
  }

  // ── Helpers de UI ────────────────────────────────────────────────────────
  function _setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    const text = btn.querySelector('.auth-submit-text');
    const spinner = btn.querySelector('.auth-submit-spinner');
    btn.disabled = loading;
    if (text) text.style.opacity = loading ? '0' : '1';
    if (spinner) spinner.style.display = loading ? 'flex' : 'none';
  }

  function _setError(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
    el.classList.add('visible');
  }

  function _clearError(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = '';
    el.style.display = 'none';
    el.classList.remove('visible');
  }

  function _setFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(inputId + '-error');
    if (input) input.classList.add('error');
    if (errorEl) { errorEl.textContent = message; errorEl.style.display = 'block'; }
  }

  function _clearFieldError(inputId) {
    const input = document.getElementById(inputId);
    const errorEl = document.getElementById(inputId + '-error');
    if (input) input.classList.remove('error');
    if (errorEl) { errorEl.textContent = ''; errorEl.style.display = 'none'; }
  }

  function _shakeModal() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.add('shake');
    setTimeout(() => modal.classList.remove('shake'), 500);
  }

  function _showSuccess(message) {
    const titleEl = document.getElementById('auth-success-title');
    const msgEl = document.getElementById('auth-success-msg');
    const user = Session.getCurrentUser();
    if (titleEl) titleEl.textContent = user ? `Olá, ${user.nickname}! 🎉` : 'Sucesso!';
    if (msgEl) msgEl.textContent = message;
    showScreen('success');
  }

  function _resetForms() {
    // Limpa todos os campos e erros dos formulários
    const inputs = document.querySelectorAll('#auth-modal-root .auth-input');
    inputs.forEach(i => { i.value = ''; i.classList.remove('error'); });
    const errors = document.querySelectorAll('#auth-modal-root .auth-field-error, #auth-modal-root .auth-form-error');
    errors.forEach(e => { e.textContent = ''; e.style.display = 'none'; });
    const avail = document.getElementById('auth-nick-avail');
    if (avail) { avail.textContent = ''; avail.className = 'auth-nick-availability'; }
    const strength = document.getElementById('auth-pass-strength');
    if (strength) strength.style.display = 'none';
    _serverConfirmed = false;
  }

  // ── Exporta API pública ──────────────────────────────────────────────────
  return {
    open,
    close,
    showScreen,
    openMyAccount,
    closeMyAccount,
    openLogoutConfirm,
    closeLogoutConfirm,
    // Métodos internos da UI expostos para os onclick inline:
    _serverYes,
    _serverNo,
    _onNickInput,
    _togglePass,
    _submitLogin,
    _submitRegister,
    _doLogout,
    _clearFieldError,
    _checkPasswordStrength,
  };
})();
