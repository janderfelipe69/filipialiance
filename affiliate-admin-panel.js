// ================================================================
// SISTEMA DE AFILIADOS — FASE 6: PAINEL ADMIN DE AFILIADOS
// (affiliate-admin-panel.js)
//
// Arquivo novo. Injetado na aba admin existente como sub-seção.
// NÃO modifica orders-admin.js nem admin-panel.js.
// Montado dentro de um novo div injetado na aba de pedidos do admin.
// ================================================================
;(function(global) {
  'use strict';

  function _isAdmin() {
    // Fase 2 Passo 3.3: delega para Session.isAdmin() — fonte única de verdade.
    return typeof Session !== 'undefined' && typeof Session.isAdmin === 'function'
      ? Session.isAdmin()
      : false;
  }

  function _fmtBrl(v) {
    return 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',');
  }

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── CSS ────────────────────────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById('aff-admin-styles')) return;
    const s = document.createElement('style');
    s.id = 'aff-admin-styles';
    s.textContent = `
      .aff-admin-section { margin: 16px; }
      .aff-admin-title { font-size:.88rem; font-weight:700; color:#60aaff;
        padding:10px 0 8px; border-bottom:1px solid rgba(96,170,255,.2); margin-bottom:12px; }
      .aff-admin-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:16px; }
      .aff-admin-stat { background:rgba(96,170,255,.06); border:1px solid rgba(96,170,255,.15);
        border-radius:8px; padding:10px 12px; }
      .aff-admin-stat-val   { font-size:1.15rem; font-weight:800; color:#60aaff; }
      .aff-admin-stat-label { font-size:.7rem; color:rgba(255,255,255,.4); margin-top:2px; }
      .aff-admin-table { width:100%; border-collapse:collapse; font-size:.82rem; }
      .aff-admin-table th { text-align:left; padding:6px 8px; color:rgba(255,255,255,.4);
        font-weight:600; font-size:.72rem; border-bottom:1px solid rgba(255,255,255,.07); }
      .aff-admin-table td { padding:8px 8px; border-bottom:1px solid rgba(255,255,255,.04);
        color:rgba(255,255,255,.8); }
      .aff-admin-table tr:hover td { background:rgba(255,255,255,.02); }
      .aff-admin-btn { padding:4px 10px; border-radius:5px; border:1px solid; cursor:pointer;
        font-size:.75rem; background:transparent; transition:filter .15s; }
      .aff-admin-btn:hover { filter:brightness(1.3); }
      .aff-admin-btn.approve { color:#22c55e; border-color:rgba(34,197,94,.3); }
      .aff-admin-btn.reject  { color:#ef4444; border-color:rgba(239,68,68,.3); }
      .aff-admin-btn.strike  { color:#fb923c; border-color:rgba(251,146,60,.3); }
      .aff-admin-btn.complete{ color:#60aaff; border-color:rgba(96,170,255,.3); }
      .aff-admin-tabs { display:flex; gap:4px; margin-bottom:12px; }
      .aff-admin-tab  { padding:5px 12px; border-radius:6px; border:none; background:transparent;
        color:rgba(255,255,255,.4); cursor:pointer; font-size:.8rem; }
      .aff-admin-tab.active { background:rgba(96,170,255,.12); color:#60aaff; }
      .aff-status-badge { font-size:.7rem; padding:2px 7px; border-radius:4px; }
    `;
    document.head.appendChild(s);
  }

  // ── Estado ────────────────────────────────────────────────────
  let _data = {
    affiliates:      [],
    pendingDelivery: [],
    withdrawals:     [],
    tab:             'affiliates',
  };

  // ── Render ────────────────────────────────────────────────────
  function _render() {
    const container = document.getElementById('aff-admin-container');
    if (!container) return;

    const { affiliates, pendingDelivery, withdrawals, tab } = _data;

    container.innerHTML = `
      <div class="aff-admin-section">
        <div class="aff-admin-title">⚡ Gestão de Afiliados</div>

        <div class="aff-admin-grid">
          <div class="aff-admin-stat">
            <div class="aff-admin-stat-val">${affiliates.length}</div>
            <div class="aff-admin-stat-label">Afiliados ativos</div>
          </div>
          <div class="aff-admin-stat">
            <div class="aff-admin-stat-val" style="color:#ffd166">${pendingDelivery.length}</div>
            <div class="aff-admin-stat-label">Aguardando entrega</div>
          </div>
          <div class="aff-admin-stat">
            <div class="aff-admin-stat-val" style="color:#22c55e">
              ${withdrawals.filter(w => w.status === 'pending').length}
            </div>
            <div class="aff-admin-stat-label">Saques pendentes</div>
          </div>
        </div>

        <div class="aff-admin-tabs">
          <button class="aff-admin-tab ${tab==='affiliates'?'active':''}"
            onclick="AffiliateAdminPanel._setTab('affiliates')">Afiliados</button>
          <button class="aff-admin-tab ${tab==='pending'?'active':''}"
            onclick="AffiliateAdminPanel._setTab('pending')">
            Entregar (${pendingDelivery.length})
          </button>
          <button class="aff-admin-tab ${tab==='withdrawals'?'active':''}"
            onclick="AffiliateAdminPanel._setTab('withdrawals')">
            Saques (${withdrawals.filter(w=>w.status==='pending').length})
          </button>
        </div>

        ${tab === 'affiliates'  ? _renderAffiliatesTable(affiliates)   : ''}
        ${tab === 'pending'     ? _renderPendingTable(pendingDelivery)  : ''}
        ${tab === 'withdrawals' ? _renderWithdrawalsTable(withdrawals)  : ''}
      </div>
    `;
  }

  function _statusColor(s) {
    return { active:'#22c55e', suspended:'#ef4444', banned:'#991b1b',
             available:'#60aaff', awaiting_admin_delivery:'#ffd166',
             pending:'#ffd166', approved:'#60aaff', paid:'#22c55e', rejected:'#ef4444' }[s] || '#aaa';
  }

  function _renderAffiliatesTable(list) {
    if (!list.length) return '<div style="color:rgba(255,255,255,.3);font-size:.82rem;padding:8px">Nenhum afiliado cadastrado.</div>';
    return `
      <div style="overflow-x:auto">
      <table class="aff-admin-table">
        <thead><tr>
          <th>Nickname</th><th>Status</th><th>Concluídos</th>
          <th>Taxa sucesso</th><th>Rating</th><th>Strikes</th><th>Ações</th>
        </tr></thead>
        <tbody>
          ${list.map(a => `<tr>
            <td>${_esc(a.nickname)}</td>
            <td><span class="aff-status-badge" style="background:${_statusColor(a.status)}22;color:${_statusColor(a.status)}">${a.status}</span></td>
            <td>${a.completed_services}</td>
            <td>${a.success_rate?.toFixed(1) || '—'}%</td>
            <td>${a.affiliate_rating?.toFixed(2) || '—'}</td>
            <td style="color:${a.strike_count>0?'#fb923c':'#aaa'}">${a.strike_count}/${a.max_strikes || 3}</td>
            <td>
              <button class="aff-admin-btn strike"
                onclick="AffiliateAdminPanel._strike('${a.id}','${_esc(a.nickname)}')">
                ⚠ Strike
              </button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
      </div>`;
  }

  function _renderPendingTable(list) {
    if (!list.length) return '<div style="color:rgba(255,255,255,.3);font-size:.82rem;padding:8px">Nenhum serviço aguardando entrega.</div>';
    return `
      <div style="overflow-x:auto">
      <table class="aff-admin-table">
        <thead><tr>
          <th>Serviço</th><th>Tipo</th><th>Payout afiliado</th><th>Concluído em</th><th>Ação</th>
        </tr></thead>
        <tbody>
          ${list.map(s => `<tr>
            <td>${_esc(s.service_name || s.pokemon_name || '—')}</td>
            <td>${_esc(s.service_type)}</td>
            <td style="color:#22c55e;font-weight:700">${_fmtBrl(s.affiliate_payout)}</td>
            <td style="color:rgba(255,255,255,.5);font-size:.75rem">${s.completed_at ? new Date(s.completed_at).toLocaleString('pt-BR') : '—'}</td>
            <td>
              <button class="aff-admin-btn complete"
                onclick="AffiliateAdminPanel._completeService('${s.id}')">
                ✓ Entregar ao cliente
              </button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
      </div>`;
  }

  function _renderWithdrawalsTable(list) {
    if (!list.length) return '<div style="color:rgba(255,255,255,.3);font-size:.82rem;padding:8px">Nenhum saque.</div>';
    return `
      <div style="overflow-x:auto">
      <table class="aff-admin-table">
        <thead><tr>
          <th>Afiliado</th><th>Valor</th><th>Chave PIX</th><th>Status</th><th>Data</th><th>Ações</th>
        </tr></thead>
        <tbody>
          ${list.map(w => `<tr>
            <td>${_esc(w.affiliate_id?.slice(0,8) || '—')}</td>
            <td style="font-weight:700;color:#ffd166">${_fmtBrl(w.amount)}</td>
            <td style="font-size:.75rem;color:rgba(255,255,255,.5)">${_esc(w.pix_key || '—')} (${_esc(w.pix_key_type || '—')})</td>
            <td><span class="aff-status-badge" style="background:${_statusColor(w.status)}22;color:${_statusColor(w.status)}">${w.status}</span></td>
            <td style="font-size:.75rem;color:rgba(255,255,255,.4)">${w.requested_at ? new Date(w.requested_at).toLocaleString('pt-BR') : '—'}</td>
            <td style="display:flex;gap:6px">
              ${w.status === 'pending' ? `
                <button class="aff-admin-btn approve" onclick="AffiliateAdminPanel._approveWithdrawal('${w.id}')">✓ Aprovar</button>
                <button class="aff-admin-btn reject"  onclick="AffiliateAdminPanel._rejectWithdrawal('${w.id}')">✕ Rejeitar</button>
              ` : ''}
              ${w.status === 'approved' ? `
                <button class="aff-admin-btn complete" onclick="AffiliateAdminPanel._markPaid('${w.id}')">💸 Pago</button>
              ` : ''}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
      </div>`;
  }

  // ── Ações ─────────────────────────────────────────────────────
  async function _load() {
    if (!_isAdmin() || typeof AffiliateService === 'undefined') return;
    try {
      const [aff, pend, with_] = await Promise.all([
        AffiliateService.admin.listAffiliates().catch(() => []),
        AffiliateService.admin.listPendingDelivery().catch(() => []),
        _loadAllWithdrawals(),
      ]);
      _data.affiliates      = aff;
      _data.pendingDelivery = pend;
      _data.withdrawals     = with_;
    } catch (e) { console.error('[AffiliateAdminPanel]', e); }
    _render();
  }

  async function _loadAllWithdrawals() {
    const SB_URL = global.SUPABASE_URL;
    const SB_KEY = global.SUPABASE_KEY;
    const jwt = Session.getAccessToken();
    const res = await fetch(`${SB_URL}/rest/v1/affiliate_withdrawals?order=requested_at.desc&limit=100`, {
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + jwt }
    });
    return res.ok ? res.json() : [];
  }

  function _setTab(tab) { _data.tab = tab; _render(); }

  async function _completeService(id) {
    if (!confirm('Confirmar entrega ao cliente e liberar pagamento ao afiliado?')) return;
    try {
      const res = await AffiliateService.admin.completeService(id);
      if (res.success) {
        if (typeof showToast === 'function') showToast('Entrega confirmada! Pagamento liberado ao afiliado.');
        await _load();
      } else {
        if (typeof showToast === 'function') showToast('Erro: ' + (res.error || 'desconhecido'), false);
      }
    } catch (e) { if (typeof showToast === 'function') showToast(e.message, false); }
  }

  async function _strike(affiliateId, name) {
    const reason = prompt(`Motivo do strike para ${name}:`);
    if (reason === null) return;
    try {
      const res = await AffiliateService.admin.issueStrike(affiliateId, reason);
      if (res.success) {
        if (typeof showToast === 'function') showToast(`Strike emitido (${res.strike_count}/${res.suspended?'SUSPENSO':'ativo'})`);
        await _load();
      }
    } catch (e) { if (typeof showToast === 'function') showToast(e.message, false); }
  }

  async function _approveWithdrawal(id) {
    const notes = prompt('Notas para aprovação (opcional):') || '';
    try {
      await AffiliateService.admin.approveWithdrawal(id, notes);
      if (typeof showToast === 'function') showToast('Saque aprovado!');
      await _load();
    } catch (e) { if (typeof showToast === 'function') showToast(e.message, false); }
  }

  async function _rejectWithdrawal(id) {
    const notes = prompt('Motivo da rejeição:');
    if (!notes) return;
    const SB_URL = global.SUPABASE_URL;
    const SB_KEY = global.SUPABASE_KEY;
    const jwt = Session.getAccessToken();
    await fetch(`${SB_URL}/rest/v1/affiliate_withdrawals?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + jwt,
        'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ status: 'rejected', admin_notes: notes, reviewed_at: new Date().toISOString() }),
    });
    if (typeof showToast === 'function') showToast('Saque rejeitado.');
    await _load();
  }

  async function _markPaid(id) {
    await AffiliateService.admin.markWithdrawalPaid(id).catch(() => {});
    if (typeof showToast === 'function') showToast('Saque marcado como pago.');
    await _load();
  }

  // ── Injeção no DOM ────────────────────────────────────────────
  function inject() {
    if (!_isAdmin()) return;
    _injectStyles();

    // Injeta na aba de pedidos do admin (após o kanban ou lista)
    let target = document.getElementById('pedidos-kanban') ||
                 document.getElementById('pedidos-lista');
    if (!target) return;

    let container = document.getElementById('aff-admin-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'aff-admin-container';
      target.parentNode.appendChild(container);
    }

    _load();
  }

  global.AffiliateAdminPanel = { inject, refresh: _load, _setTab,
    _completeService, _strike, _approveWithdrawal, _rejectWithdrawal, _markPaid };

  // Auto-injeta quando admin entra na aba pedidos
  if (typeof NavRuntime !== 'undefined' && typeof NavRuntime.onTabSwitch === 'function') {
    NavRuntime.onTabSwitch('after', 'affiliate-admin-panel', function(tab) {
      if (tab === 'pedidos' && _isAdmin()) {
        setTimeout(inject, 500);
      }
    });
  }

  console.log('[AffiliateAdminPanel] ✅ Módulo carregado.');

})(window);
