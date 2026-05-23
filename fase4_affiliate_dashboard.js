// ================================================================
// SISTEMA DE AFILIADOS — FASE 4: DASHBOARD (affiliate-dashboard.js)
// Frontend completo do afiliado. Arquivo 100% novo.
// Montado dentro de #tab-afiliado (injetado no HTML).
// NÃO toca em nenhuma aba existente.
// ================================================================
;(function(global) {
  'use strict';

  // ── Estado interno ────────────────────────────────────────────
  let _state = {
    queue:         [],
    myService:     null,
    wallet:        null,
    profile:       null,
    notifications: [],
    withdrawals:   [],
    tab:           'queue',   // 'queue' | 'history' | 'wallet' | 'stats'
    loading:       false,
  };

  // ── Helpers de formatação ─────────────────────────────────────
  function _fmtBrl(v) {
    return 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',');
  }
  function _fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit',
      year:'2-digit', hour:'2-digit', minute:'2-digit' });
  }
  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  const DIFFICULTY_LABEL = { easy:'Fácil', normal:'Normal', hard:'Difícil', extreme:'Extremo' };
  const DIFFICULTY_COLOR = { easy:'#22c55e', normal:'#60aaff', hard:'#fb923c', extreme:'#ef4444' };
  const STATUS_LABEL = {
    available:               '🟢 Disponível',
    claimed:                 '🔒 Reservado por você',
    in_progress:             '⚡ Em andamento',
    awaiting_admin_delivery: '✅ Aguardando entrega',
    completed:               '🏆 Concluído',
    cancelled:               '✕ Cancelado',
  };

  // ── CSS injetado uma vez ───────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById('aff-dash-styles')) return;
    const s = document.createElement('style');
    s.id = 'aff-dash-styles';
    s.textContent = `
      /* ── Afiliado Dashboard ─────────────────────────────────── */
      .aff-page { padding: 16px 0 80px; max-width: 960px; margin: 0 auto; }
      .aff-header { display:flex; align-items:center; justify-content:space-between;
        padding: 0 16px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
      .aff-header-title { font-size:1.2rem; font-weight:700; color:#fff; }
      .aff-header-role  { font-size:.75rem; color:#60aaff; background:rgba(96,170,255,.12);
        padding:2px 10px; border-radius:20px; border:1px solid rgba(96,170,255,.3); }

      /* Tabs */
      .aff-tabs { display:flex; gap:4px; padding:12px 16px 0; border-bottom:1px solid rgba(255,255,255,.06); }
      .aff-tab  { padding:7px 16px; border-radius:8px 8px 0 0; border:none; background:transparent;
        color:rgba(255,255,255,.4); cursor:pointer; font-size:.85rem; transition:all .15s; }
      .aff-tab:hover { color:rgba(255,255,255,.7); background:rgba(255,255,255,.04); }
      .aff-tab.active { color:#60aaff; background:rgba(96,170,255,.1);
        border-bottom:2px solid #60aaff; }

      /* Wallet strip */
      .aff-wallet-strip { display:grid; grid-template-columns:repeat(3,1fr); gap:10px;
        margin:16px 16px 0; }
      .aff-wallet-card  { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07);
        border-radius:10px; padding:12px 16px; }
      .aff-wallet-label { font-size:.72rem; color:rgba(255,255,255,.4); margin-bottom:4px; }
      .aff-wallet-value { font-size:1.15rem; font-weight:700; color:#ffd166; }
      .aff-wallet-value.green  { color:#22c55e; }
      .aff-wallet-value.muted  { color:rgba(255,255,255,.5); font-size:.9rem; }

      /* Service queue */
      .aff-queue  { padding:16px; display:flex; flex-direction:column; gap:10px; }
      .aff-card   { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08);
        border-radius:12px; padding:16px; transition:border-color .15s; }
      .aff-card:hover { border-color:rgba(96,170,255,.3); }
      .aff-card.mine  { border-color:rgba(253,209,102,.35); background:rgba(253,209,102,.04); }
      .aff-card-top   { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
      .aff-card-name  { font-size:.95rem; font-weight:700; color:#fff; }
      .aff-card-type  { font-size:.72rem; color:rgba(255,255,255,.4);
        background:rgba(255,255,255,.05); padding:2px 8px; border-radius:4px; margin-top:3px; }
      .aff-card-payout { font-size:1.1rem; font-weight:800; color:#22c55e; white-space:nowrap; }
      .aff-card-meta  { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
      .aff-badge      { font-size:.72rem; padding:2px 8px; border-radius:4px;
        border:1px solid rgba(255,255,255,.1); color:rgba(255,255,255,.6); }
      .aff-card-actions { margin-top:12px; display:flex; gap:8px; }
      .aff-btn        { padding:7px 18px; border-radius:7px; border:none; cursor:pointer;
        font-size:.82rem; font-weight:600; transition:filter .15s; }
      .aff-btn:hover  { filter:brightness(1.15); }
      .aff-btn.primary { background:#3a8cff; color:#fff; }
      .aff-btn.success { background:#22c55e; color:#fff; }
      .aff-btn.danger  { background:rgba(239,68,68,.15); color:#f87171;
        border:1px solid rgba(239,68,68,.3); }
      .aff-btn:disabled { opacity:.4; cursor:not-allowed; filter:none; }

      /* Withdraw form */
      .aff-withdraw-form { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08);
        border-radius:12px; padding:20px; margin:16px; }
      .aff-input  { width:100%; padding:8px 12px; border-radius:7px;
        border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.04);
        color:#fff; font-size:.88rem; box-sizing:border-box; margin-top:4px; }
      .aff-input:focus { outline:none; border-color:#60aaff; }
      .aff-label  { font-size:.78rem; color:rgba(255,255,255,.5); display:block; margin-top:10px; }

      /* Stats */
      .aff-stats-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px;
        padding:16px; }
      .aff-stat-card  { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07);
        border-radius:10px; padding:14px 16px; text-align:center; }
      .aff-stat-val   { font-size:1.5rem; font-weight:800; color:#60aaff; }
      .aff-stat-label { font-size:.72rem; color:rgba(255,255,255,.4); margin-top:3px; }

      /* Empty */
      .aff-empty { text-align:center; padding:48px 16px; color:rgba(255,255,255,.3); }
      .aff-empty-icon { font-size:2.5rem; margin-bottom:8px; }
      .aff-loading { text-align:center; padding:32px; color:rgba(255,255,255,.3); }

      /* Notification dot */
      .aff-notif-dot { width:8px; height:8px; border-radius:50%; background:#ef4444;
        display:inline-block; margin-left:4px; vertical-align:middle; }

      @media (max-width:520px) {
        .aff-wallet-strip { grid-template-columns:1fr 1fr; }
        .aff-stats-grid   { grid-template-columns:1fr 1fr; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── Render principal ──────────────────────────────────────────
  function _render() {
    const container = document.getElementById('tab-afiliado');
    if (!container) return;

    const { queue, myService, wallet, profile, tab, loading, notifications } = _state;
    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (loading) {
      container.innerHTML = `<div class="aff-loading">⟳ Carregando...</div>`;
      return;
    }

    container.innerHTML = `
      <div class="aff-page">
        <div class="aff-header">
          <div>
            <div class="aff-header-title">👾 Painel do Afiliado</div>
            <div style="font-size:.8rem;color:rgba(255,255,255,.4);margin-top:2px">
              ${profile ? _esc(profile.nickname) : '—'} · ${profile ? _statusBadge(profile.status) : ''}
            </div>
          </div>
          <span class="aff-header-role">⚡ AFILIADO</span>
        </div>

        ${wallet ? _renderWalletStrip(wallet) : ''}

        <div class="aff-tabs">
          <button class="aff-tab ${tab==='queue'?'active':''}" onclick="AffiliateDashboard._switchTab('queue')">
            🎯 Fila${myService ? ' <span style="color:#ffd166">●</span>' : ''}
          </button>
          <button class="aff-tab ${tab==='wallet'?'active':''}" onclick="AffiliateDashboard._switchTab('wallet')">
            💰 Wallet
          </button>
          <button class="aff-tab ${tab==='stats'?'active':''}" onclick="AffiliateDashboard._switchTab('stats')">
            📊 Stats
          </button>
          <button class="aff-tab ${tab==='notifications'?'active':''}" onclick="AffiliateDashboard._switchTab('notifications')">
            🔔${unreadCount > 0 ? ` <span class="aff-notif-dot"></span>` : ''}
          </button>
        </div>

        ${tab === 'queue'         ? _renderQueue(queue, myService)   : ''}
        ${tab === 'wallet'        ? _renderWalletTab(wallet)         : ''}
        ${tab === 'stats'         ? _renderStats(profile)            : ''}
        ${tab === 'notifications' ? _renderNotifications(notifications) : ''}
      </div>
    `;
  }

  function _statusBadge(status) {
    const map = { active:'🟢 Ativo', suspended:'🔴 Suspenso', banned:'⛔ Banido' };
    return map[status] || status;
  }

  function _renderWalletStrip(w) {
    return `
      <div class="aff-wallet-strip">
        <div class="aff-wallet-card">
          <div class="aff-wallet-label">Disponível para saque</div>
          <div class="aff-wallet-value green">${_fmtBrl(w.balance)}</div>
        </div>
        <div class="aff-wallet-card">
          <div class="aff-wallet-label">Pendente</div>
          <div class="aff-wallet-value">${_fmtBrl(w.pending_balance)}</div>
        </div>
        <div class="aff-wallet-card">
          <div class="aff-wallet-label">Total ganho</div>
          <div class="aff-wallet-value muted">${_fmtBrl(w.total_earned)}</div>
        </div>
      </div>`;
  }

  function _renderQueue(queue, myService) {
    const available = queue.filter(s => s.status === 'available');
    const hasMine   = !!myService;

    let html = '<div class="aff-queue">';

    if (hasMine) {
      html += `<div style="font-size:.8rem;color:#ffd166;padding:4px 0 8px">
        ⚡ Você tem um serviço ativo — conclua antes de pegar outro.
      </div>`;
      html += _renderServiceCard(myService, true);
    }

    if (!available.length && !hasMine) {
      html += `<div class="aff-empty">
        <div class="aff-empty-icon">📭</div>
        <div>Nenhum serviço disponível no momento</div>
        <div style="font-size:.8rem;margin-top:6px">Novos serviços aparecem aqui em tempo real</div>
      </div>`;
    } else {
      if (available.length) {
        html += `<div style="font-size:.78rem;color:rgba(255,255,255,.4);padding:0 0 4px">
          ${available.length} serviço(s) disponível(is)
        </div>`;
        available.forEach(s => { html += _renderServiceCard(s, false, hasMine); });
      }
    }

    html += '</div>';
    return html;
  }

  function _renderServiceCard(s, isMine, hasActive = false) {
    const diffColor = DIFFICULTY_COLOR[s.difficulty] || '#aaa';
    const diffLabel = DIFFICULTY_LABEL[s.difficulty] || s.difficulty;
    const deadlineHtml = s.deadline_at
      ? `<span class="aff-badge" style="color:#fb923c;border-color:rgba(251,146,60,.3)">
          ⏱ Prazo: ${_fmtDate(s.deadline_at)}</span>`
      : '';

    let actions = '';
    if (isMine) {
      if (s.status === 'claimed') {
        actions = `
          <button class="aff-btn primary" onclick="AffiliateDashboard._startService('${s.id}')">▶ Iniciar serviço</button>
        `;
      } else if (s.status === 'in_progress') {
        actions = `
          <button class="aff-btn success" onclick="AffiliateDashboard._finishService('${s.id}')">✓ Concluir serviço</button>
        `;
      } else if (s.status === 'awaiting_admin_delivery') {
        actions = `<span style="color:#60aaff;font-size:.82rem">⏳ Aguardando entrega pelo admin</span>`;
      }
    } else if (!hasActive && s.status === 'available') {
      actions = `
        <button class="aff-btn primary" onclick="AffiliateDashboard._claimService('${s.id}')">🎯 Pegar serviço</button>
      `;
    }

    return `
      <div class="aff-card ${isMine ? 'mine' : ''}">
        <div class="aff-card-top">
          <div>
            <div class="aff-card-name">${_esc(s.service_name || s.pokemon_name || s.service_type)}</div>
            <div class="aff-card-type">${_esc(s.service_type)}</div>
          </div>
          <div class="aff-card-payout">${_fmtBrl(s.payout)}</div>
        </div>
        <div class="aff-card-meta">
          <span class="aff-badge" style="color:${diffColor};border-color:${diffColor}33">${diffLabel}</span>
          <span class="aff-badge">⏱ ETA ${s.eta_days}d</span>
          ${s.priority > 0 ? `<span class="aff-badge" style="color:#ffd166;border-color:#ffd16633">⚡ Alta prioridade</span>` : ''}
          ${deadlineHtml}
          ${isMine ? `<span class="aff-badge" style="color:#60aaff">${STATUS_LABEL[s.status] || s.status}</span>` : ''}
        </div>
        ${actions ? `<div class="aff-card-actions">${actions}</div>` : ''}
      </div>`;
  }

  function _renderWalletTab(w) {
    if (!w) return '<div class="aff-empty"><div class="aff-empty-icon">💳</div><div>Wallet não carregada</div></div>';
    return `
      <div style="padding:16px">
        <div class="aff-withdraw-form">
          <div style="font-size:.95rem;font-weight:700;color:#fff;margin-bottom:12px">💸 Solicitar Saque</div>
          <label class="aff-label">Valor (disponível: ${_fmtBrl(w.balance)})</label>
          <input class="aff-input" id="aff-withdraw-amount" type="number" step="0.01" min="1"
            max="${w.balance}" placeholder="0,00">
          <label class="aff-label">Tipo de chave PIX</label>
          <select class="aff-input" id="aff-withdraw-type">
            <option value="cpf">CPF</option>
            <option value="email">E-mail</option>
            <option value="phone">Telefone</option>
            <option value="random">Chave aleatória</option>
          </select>
          <label class="aff-label">Chave PIX</label>
          <input class="aff-input" id="aff-withdraw-key" placeholder="Sua chave PIX">
          <div style="margin-top:14px">
            <button class="aff-btn primary" onclick="AffiliateDashboard._requestWithdrawal()"
              ${w.balance <= 0 ? 'disabled' : ''}>
              Solicitar Saque
            </button>
          </div>
        </div>
        <div id="aff-withdrawals-list" style="padding:0 0 16px">
          <div style="font-size:.85rem;color:rgba(255,255,255,.4);margin-bottom:8px">Histórico de saques</div>
          ${_renderWithdrawals()}
        </div>
      </div>`;
  }

  function _renderWithdrawals() {
    const list = _state.withdrawals;
    if (!list.length) return '<div style="color:rgba(255,255,255,.3);font-size:.82rem">Nenhum saque realizado</div>';
    return list.map(w => {
      const statusColor = { pending:'#ffd166', approved:'#60aaff', paid:'#22c55e', rejected:'#ef4444' }[w.status] || '#aaa';
      return `<div style="display:flex;justify-content:space-between;align-items:center;
        padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:.83rem">
        <div>
          <span style="color:#fff;font-weight:600">${_fmtBrl(w.amount)}</span>
          <span style="color:rgba(255,255,255,.4);margin-left:8px">${_fmtDate(w.requested_at)}</span>
        </div>
        <span style="color:${statusColor};font-size:.75rem;text-transform:uppercase">${w.status}</span>
      </div>`;
    }).join('');
  }

  function _renderStats(p) {
    if (!p) return '<div class="aff-empty"><div class="aff-empty-icon">📊</div><div>Stats não carregadas</div></div>';
    return `
      <div class="aff-stats-grid">
        <div class="aff-stat-card">
          <div class="aff-stat-val" style="color:#22c55e">${p.completed_services}</div>
          <div class="aff-stat-label">Serviços concluídos</div>
        </div>
        <div class="aff-stat-card">
          <div class="aff-stat-val">${p.success_rate?.toFixed(1) || '—'}%</div>
          <div class="aff-stat-label">Taxa de sucesso</div>
        </div>
        <div class="aff-stat-card">
          <div class="aff-stat-val" style="color:#ffd166">${p.affiliate_rating?.toFixed(2) || '—'}</div>
          <div class="aff-stat-label">Rating</div>
        </div>
        <div class="aff-stat-card">
          <div class="aff-stat-val ${p.strike_count > 0 ? 'style="color:#ef4444"' : ''}">
            ${p.strike_count}/${p.max_strikes}
          </div>
          <div class="aff-stat-label">Strikes</div>
        </div>
        <div class="aff-stat-card">
          <div class="aff-stat-val style="color:#fb923c"">${p.late_services || 0}</div>
          <div class="aff-stat-label">Atrasos</div>
        </div>
        <div class="aff-stat-card">
          <div class="aff-stat-val">${p.avg_completion_hours?.toFixed(1) || '—'}h</div>
          <div class="aff-stat-label">Tempo médio</div>
        </div>
      </div>
      <div style="padding:0 16px;font-size:.78rem;color:rgba(255,255,255,.3)">
        Afiliado desde ${_fmtDate(p.created_at)}
      </div>`;
  }

  function _renderNotifications(notifs) {
    if (!notifs.length) return `<div class="aff-empty"><div class="aff-empty-icon">🔔</div><div>Sem notificações</div></div>`;
    return `<div style="padding:16px;display:flex;flex-direction:column;gap:8px">` +
      notifs.map(n => `
        <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,${n.is_read?'.05':'.15'});
          border-radius:10px;padding:12px 16px;${n.is_read?'opacity:.6':''}">
          <div style="font-weight:600;font-size:.88rem;color:#fff">${_esc(n.title)}</div>
          ${n.body ? `<div style="font-size:.8rem;color:rgba(255,255,255,.5);margin-top:3px">${_esc(n.body)}</div>` : ''}
          <div style="font-size:.72rem;color:rgba(255,255,255,.3);margin-top:6px">${_fmtDate(n.created_at)}</div>
          ${!n.is_read ? `<button class="aff-btn" style="margin-top:6px;padding:3px 10px;font-size:.72rem;background:rgba(255,255,255,.05)"
            onclick="AffiliateDashboard._markRead('${n.id}')">Marcar como lida</button>` : ''}
        </div>`).join('') + '</div>';
  }

  // ── Ações ────────────────────────────────────────────────────
  async function _claimService(id) {
    try {
      const res = await AffiliateService.claimService(id);
      if (res.success) {
        _showToast('Serviço reservado! Inicie em ' + (res.deadline_at ? _fmtDate(res.deadline_at) : 'breve'));
        await _loadData();
      } else {
        _showToast(_errorMsg(res.error), true);
      }
    } catch (e) { _showToast(e.message, true); }
  }

  async function _startService(id) {
    try {
      const res = await AffiliateService.startService(id);
      if (res.success) { _showToast('Serviço iniciado!'); await _loadData(); }
      else _showToast(_errorMsg(res.error), true);
    } catch (e) { _showToast(e.message, true); }
  }

  async function _finishService(id) {
    if (!confirm('Confirma conclusão? O admin precisará entregar ao cliente antes do pagamento ser liberado.')) return;
    try {
      const res = await AffiliateService.finishService(id);
      if (res.success) {
        _showToast(`Serviço concluído! ${_fmtBrl(res.pending_payout)} aguardando liberação.`);
        await _loadData();
      } else _showToast(_errorMsg(res.error), true);
    } catch (e) { _showToast(e.message, true); }
  }

  async function _requestWithdrawal() {
    const amount  = parseFloat(document.getElementById('aff-withdraw-amount')?.value);
    const key     = document.getElementById('aff-withdraw-key')?.value?.trim();
    const keyType = document.getElementById('aff-withdraw-type')?.value;
    if (!amount || amount <= 0) { _showToast('Valor inválido', true); return; }
    if (!key) { _showToast('Informe a chave PIX', true); return; }
    try {
      await AffiliateService.requestWithdrawal(amount, key, keyType);
      _showToast('Saque solicitado! Aguarde aprovação do admin.');
      await _loadData();
    } catch (e) { _showToast(e.message, true); }
  }

  async function _markRead(id) {
    await AffiliateService.markNotificationRead(id).catch(() => {});
    _state.notifications = _state.notifications.map(n => n.id === id ? {...n, is_read: true} : n);
    _render();
  }

  function _switchTab(tab) {
    _state.tab = tab;
    _render();
  }

  function _errorMsg(code) {
    const m = {
      NOT_AFFILIATE:           'Você não é um afiliado.',
      AFFILIATE_NOT_ACTIVE:    'Conta suspensa ou inativa.',
      ALREADY_HAS_ACTIVE_SERVICE: 'Você já tem um serviço ativo.',
      SERVICE_NOT_AVAILABLE:   'Serviço não está mais disponível.',
      INVALID_STATE:           'Ação inválida para o estado atual.',
      INVALID_AMOUNT:          'Valor inválido para saque.',
    };
    return m[code] || code || 'Erro desconhecido';
  }

  function _showToast(msg, isError = false) {
    if (typeof showToast === 'function') { showToast(msg, !isError); return; }
    alert(msg);
  }

  // ── Carregamento de dados ──────────────────────────────────────
  async function _loadData() {
    if (!AffiliateService._isAffiliate()) return;
    try {
      const [queue, wallet, profile, notifs, withdrawals] = await Promise.all([
        AffiliateService.getQueue().catch(() => []),
        AffiliateService.getWallet().catch(() => null),
        AffiliateService.getProfile().catch(() => null),
        AffiliateService.getNotifications().catch(() => []),
        AffiliateService.getWithdrawals().catch(() => []),
      ]);
      _state.queue         = queue;
      _state.myService     = queue.find(s => s.is_mine && ['claimed','in_progress','awaiting_admin_delivery'].includes(s.status)) || null;
      _state.wallet        = wallet;
      _state.profile       = profile;
      _state.notifications = notifs;
      _state.withdrawals   = withdrawals;
    } catch (e) {
      console.error('[AffiliateDashboard] load error:', e);
    }
    _render();
  }

  // ── Inicialização ──────────────────────────────────────────────
  function init() {
    _injectStyles();

    // Escuta realtime do afiliado
    global.addEventListener('affiliate:service_changed', function() {
      _loadData();
    });
    global.addEventListener('affiliate:wallet_changed', function() {
      AffiliateService.getWallet().then(w => {
        _state.wallet = w; _render();
      }).catch(() => {});
    });
    global.addEventListener('affiliate:notification', function(e) {
      const n = e.detail && e.detail.record;
      if (n) {
        _state.notifications = [n, ..._state.notifications].slice(0, 30);
        _render();
      }
    });

    // Inicia realtime
    if (typeof AffiliateRealtime !== 'undefined') {
      AffiliateRealtime.start();
    }

    _loadData();
  }

  // ── API pública ────────────────────────────────────────────────
  global.AffiliateDashboard = {
    init,
    refresh: _loadData,
    _switchTab,
    _claimService,
    _startService,
    _finishService,
    _requestWithdrawal,
    _markRead,
  };

  console.log('[AffiliateDashboard] ✅ Módulo carregado.');

})(window);
