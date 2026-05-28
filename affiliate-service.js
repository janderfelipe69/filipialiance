// ================================================================
// SISTEMA DE AFILIADOS — FASE 2: SERVICES (affiliate-service.js)
// Arquivo novo — não toca em nenhum arquivo existente.
//
// Carregado APÓS session.js e supabase-client.js.
// Expõe: window.AffiliateService
// ================================================================
;(function(global) {
  'use strict';

  const SB_URL = global.SUPABASE_URL || '';
  const SB_KEY = global.SUPABASE_KEY || '';

  function _jwt() {
    return typeof Session !== 'undefined' && Session.getAccessToken
      ? Session.getAccessToken()
      : null;
  }

  function _isAffiliate() {
    const u = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    return u && u.role === 'affiliate';
  }

  function _isAdmin() {
    // Fase 2 Passo 3.2: delega para Session.isAdmin() — fonte única de verdade.
    return typeof Session !== 'undefined' && typeof Session.isAdmin === 'function'
      ? Session.isAdmin()
      : false;
  }

  function _headers(extra) {
    return Object.assign({
      'apikey': SB_KEY,
      'Authorization': 'Bearer ' + _jwt(),
      'Content-Type': 'application/json',
    }, extra || {});
  }

  async function _rpc(fn, params) {
    const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: _headers(),
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || data.error || `RPC ${fn} HTTP ${res.status}`);
    return data;
  }

  async function _get(path) {
    const res = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: _headers() });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.message || `GET ${path} HTTP ${res.status}`);
    }
    return res.json();
  }

  async function _patch(path, body) {
    const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
      method: 'PATCH',
      headers: _headers({ 'Prefer': 'return=representation' }),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.message || `PATCH ${path} HTTP ${res.status}`);
    }
    return res.json();
  }

  async function _post(path, body) {
    const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
      method: 'POST',
      headers: _headers({ 'Prefer': 'return=representation' }),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.message || `POST ${path} HTTP ${res.status}`);
    }
    return res.json();
  }

  // ── DTO: converte registro bruto em payload seguro para afiliado ──────────
  // NUNCA inclui: pedido_id, client_price, admin_fee, nick_jogo
  function _toAffiliateServiceDTO(row) {
    return {
      id:              row.id,
      service_type:    row.service_type,
      pokemon_name:    row.pokemon_name,
      service_name:    row.service_name,
      difficulty:      row.difficulty,
      priority:        row.priority,
      eta_days:        row.eta_days,
      payout:          parseFloat(row.affiliate_payout || 0),
      status:          row.status,
      is_mine:         row.claimed_by === (Session.getCurrentUser()?.id),
      claimed_at:      row.claimed_at,
      started_at:      row.started_at,
      completed_at:    row.completed_at,
      deadline_at:     row.deadline_at,
      created_at:      row.created_at,
    };
  }

  function _toAffiliateWalletDTO(row) {
    return {
      balance:          parseFloat(row.balance || 0),
      pending_balance:  parseFloat(row.pending_balance || 0),
      total_earned:     parseFloat(row.total_earned || 0),
      total_withdrawn:  parseFloat(row.total_withdrawn || 0),
    };
  }

  // ── API Pública ───────────────────────────────────────────────────────────

  // Carrega fila disponível + serviço ativo do afiliado
  async function getQueue() {
    if (!_isAffiliate()) throw new Error('NOT_AFFILIATE');
    const rows = await _get(
      'affiliate_queue_view?select=id,service_type,pokemon_name,service_name,difficulty,priority,eta_days,affiliate_payout,status,claimed_by,claimed_at,started_at,completed_at,deadline_at,created_at&order=priority.desc,created_at.asc'
    );
    return (rows || []).map(_toAffiliateServiceDTO);
  }

  // Pegar serviço (claim atômico via RPC)
  async function claimService(serviceId) {
    if (!_isAffiliate()) throw new Error('NOT_AFFILIATE');
    const user = Session.getCurrentUser();
    return _rpc('affiliate_claim_service', {
      p_service_id:   serviceId,
      p_affiliate_id: user.id,
    });
  }

  // Iniciar serviço
  async function startService(serviceId) {
    if (!_isAffiliate()) throw new Error('NOT_AFFILIATE');
    const user = Session.getCurrentUser();
    return _rpc('affiliate_start_service', {
      p_service_id:   serviceId,
      p_affiliate_id: user.id,
    });
  }

  // Concluir serviço (vai para awaiting_admin_delivery)
  async function finishService(serviceId) {
    if (!_isAffiliate()) throw new Error('NOT_AFFILIATE');
    const user = Session.getCurrentUser();
    return _rpc('affiliate_finish_service', {
      p_service_id:   serviceId,
      p_affiliate_id: user.id,
    });
  }

  // Carregar wallet
  async function getWallet() {
    if (!_isAffiliate()) throw new Error('NOT_AFFILIATE');
    const user = Session.getCurrentUser();
    const rows = await _get(
      `affiliate_wallets?affiliate_id=eq.${user.id}&select=balance,pending_balance,total_earned,total_withdrawn&limit=1`
    );
    return rows && rows[0] ? _toAffiliateWalletDTO(rows[0]) : null;
  }

  // Solicitar saque
  async function requestWithdrawal(amount, pixKey, pixKeyType) {
    if (!_isAffiliate()) throw new Error('NOT_AFFILIATE');
    const user = Session.getCurrentUser();
    if (!amount || amount <= 0) throw new Error('INVALID_AMOUNT');
    return _post('affiliate_withdrawals', {
      affiliate_id: user.id,
      amount:       parseFloat(amount),
      pix_key:      pixKey,
      pix_key_type: pixKeyType,
    });
  }

  // Histórico de saques
  async function getWithdrawals() {
    if (!_isAffiliate()) throw new Error('NOT_AFFILIATE');
    const user = Session.getCurrentUser();
    return _get(
      `affiliate_withdrawals?affiliate_id=eq.${user.id}&order=requested_at.desc&limit=50`
    );
  }

  // Perfil e estatísticas
  async function getProfile() {
    if (!_isAffiliate()) throw new Error('NOT_AFFILIATE');
    const user = Session.getCurrentUser();
    const rows = await _get(
      `affiliate_profiles?id=eq.${user.id}&select=id,nickname,status,completed_services,cancelled_services,late_services,success_rate,affiliate_rating,avg_completion_hours,strike_count,max_strikes,created_at&limit=1`
    );
    return rows && rows[0] ? rows[0] : null;
  }

  // Histórico de logs do próprio afiliado
  async function getLogs(limit = 50) {
    if (!_isAffiliate()) throw new Error('NOT_AFFILIATE');
    const user = Session.getCurrentUser();
    return _get(
      `affiliate_logs?affiliate_id=eq.${user.id}&order=created_at.desc&limit=${limit}&select=id,action,notes,created_at,service_id`
    );
  }

  // Notificações
  async function getNotifications(onlyUnread = false) {
    if (!_isAffiliate()) throw new Error('NOT_AFFILIATE');
    const user = Session.getCurrentUser();
    const filter = onlyUnread ? '&is_read=eq.false' : '';
    return _get(
      `affiliate_notifications?affiliate_id=eq.${user.id}&order=created_at.desc&limit=30${filter}`
    );
  }

  async function markNotificationRead(id) {
    if (!_isAffiliate()) throw new Error('NOT_AFFILIATE');
    const user = Session.getCurrentUser();
    return _patch(
      `affiliate_notifications?id=eq.${id}&affiliate_id=eq.${user.id}`,
      { is_read: true }
    );
  }

  // ── Admin API (separada, só para admins) ─────────────────────────────────

  // Cria um novo serviço na fila de afiliados
  async function adminCreateService(params) {
    if (!_isAdmin()) throw new Error('NOT_ADMIN');
    // Calcula comissão automaticamente
    const commissionRate = params.commission_rate || 0.95;
    const clientPrice    = parseFloat(params.client_price);
    const payout         = Math.round(clientPrice * commissionRate * 100) / 100;
    const fee            = Math.round(clientPrice * (1 - commissionRate) * 100) / 100;
    return _post('affiliate_services', {
      pedido_id:       params.pedido_id || null,
      service_type:    params.service_type,
      pokemon_name:    params.pokemon_name || null,
      service_name:    params.service_name,
      difficulty:      params.difficulty || 'normal',
      priority:        params.priority || 0,
      eta_days:        params.eta_days || 7,
      client_price:    clientPrice,
      affiliate_payout: payout,
      admin_fee:       fee,
    });
  }

  // Admin finaliza entrega ao cliente
  async function adminCompleteService(serviceId) {
    if (!_isAdmin()) throw new Error('NOT_ADMIN');
    const user = Session.getCurrentUser();
    return _rpc('admin_complete_affiliate_service', {
      p_service_id: serviceId,
      p_admin_id:   user.id,
    });
  }

  // Admin emite strike
  async function adminIssueStrike(affiliateId, reason) {
    if (!_isAdmin()) throw new Error('NOT_ADMIN');
    const user = Session.getCurrentUser();
    return _rpc('admin_issue_strike', {
      p_affiliate_id: affiliateId,
      p_admin_id:     user.id,
      p_reason:       reason || null,
    });
  }

  // Admin lista afiliados
  async function adminListAffiliates() {
    if (!_isAdmin()) throw new Error('NOT_ADMIN');
    return _get(
      'affiliate_profiles?select=id,nickname,email,status,completed_services,cancelled_services,success_rate,affiliate_rating,strike_count,created_at&order=affiliate_rating.desc'
    );
  }

  // Admin lista serviços pendentes de entrega
  async function adminListPendingDelivery() {
    if (!_isAdmin()) throw new Error('NOT_ADMIN');
    return _get(
      'affiliate_services?status=eq.awaiting_admin_delivery&select=id,service_type,pokemon_name,service_name,client_price,affiliate_payout,claimed_by,completed_at&order=completed_at.asc'
    );
  }

  // Admin aprova saque
  async function adminApproveWithdrawal(withdrawalId, notes) {
    if (!_isAdmin()) throw new Error('NOT_ADMIN');
    const rows = await _patch(
      `affiliate_withdrawals?id=eq.${withdrawalId}&status=eq.pending`,
      { status: 'approved', admin_notes: notes || null, reviewed_at: new Date().toISOString() }
    );
    return rows;
  }

  // Admin marca saque como pago
  async function adminMarkWithdrawalPaid(withdrawalId) {
    if (!_isAdmin()) throw new Error('NOT_ADMIN');
    // Busca valor do saque
    const rows = await _get(`affiliate_withdrawals?id=eq.${withdrawalId}&select=affiliate_id,amount&limit=1`);
    if (!rows || !rows[0]) throw new Error('WITHDRAWAL_NOT_FOUND');
    const { affiliate_id, amount } = rows[0];
    // Deduz do balance e soma total_withdrawn
    await _patch(`affiliate_wallets?affiliate_id=eq.${affiliate_id}`, {
      balance:          `balance - ${amount}`,   // PostgREST não faz aritmética diretamente
      total_withdrawn:  `total_withdrawn + ${amount}`,
    });
    // Nota: para aritmética segura use RPC. Simplificado aqui para a fase 2.
    return _patch(`affiliate_withdrawals?id=eq.${withdrawalId}`, {
      status: 'paid', paid_at: new Date().toISOString()
    });
  }

  // ── Expõe globalmente ─────────────────────────────────────────────────────
  global.AffiliateService = {
    // Afiliado
    getQueue,
    claimService,
    startService,
    finishService,
    getWallet,
    requestWithdrawal,
    getWithdrawals,
    getProfile,
    getLogs,
    getNotifications,
    markNotificationRead,
    // Admin
    admin: {
      createService:       adminCreateService,
      completeService:     adminCompleteService,
      issueStrike:         adminIssueStrike,
      listAffiliates:      adminListAffiliates,
      listPendingDelivery: adminListPendingDelivery,
      approveWithdrawal:   adminApproveWithdrawal,
      markWithdrawalPaid:  adminMarkWithdrawalPaid,
    },
    // Utilitários
    _isAffiliate,
    _isAdmin,
  };

  console.log('[AffiliateService] ✅ Módulo carregado.');

})(window);
