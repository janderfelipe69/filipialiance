// ============================================================
// orders-admin.js — v3 — Ações Administrativas
// PokeAlliance Shop
//
// MUDANÇAS v3:
//   - startService(): ação mais importante — inicia o SLA real
//   - completeService(): conclui o serviço, sai da fila
//   - Todos os status usam o novo enum (waiting_queue, in_progress, etc.)
//   - O painel exibe ETA real quando in_progress, fila quando waiting
//   - Botão "INICIAR SERVIÇO" é o único que ativa o countdown
//
// VERIFICAÇÃO DE ADMIN:
//   Exclusivamente via public.users.role = 'admin' no banco.
//   Nunca via localStorage, frontend, ou lista hardcoded.
// ============================================================

const OrdersAdmin = (() => {

  // ── Verificação de Permissão ─────────────────────────────────────────────

  function isAdmin(user) {
    if (!user) return false;
    return user.role === 'admin';
  }

  function isCurrentUserAdmin() {
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    return isAdmin(user);
  }

  // ── Ação Principal: INICIAR SERVIÇO ──────────────────────────────────────
  //
  // Esta é a ação mais importante do sistema.
  // Ela chama a função start_service() do banco via RPC,
  // que salva started_at e ativa o SLA real.
  //
  // ANTES desta ação: nenhum countdown, nenhum ETA.
  // DEPOIS desta ação: SLA conta a partir do started_at retornado.

  async function startService(supabaseOrderId) {
    if (!isCurrentUserAdmin()) {
      console.warn('[OrdersAdmin] ⛔ Acesso negado: não é admin.');
      return { success: false, error: 'Apenas admins podem iniciar serviços.' };
    }

    const confirmed = await showConfirmModal({
      title: `Iniciar Serviço #${supabaseOrderId}`,
      message: 'O countdown do cliente começa AGORA. Você confirma que está pronto para executar este serviço?',
      confirmText: 'Iniciar Serviço',
      cancelText: 'Cancelar',
      type: 'warning'
    });
    if (!confirmed) return { success: false, cancelled: true };

    try {
      const jwt = _getJWT();
      if (!jwt) { if (typeof showToast === 'function') showToast('Sessão expirada. Faça login novamente.', 'error'); return { success: false, error: 'NO_JWT' }; }
      console.log('[START SERVICE] payload', { p_order_id: supabaseOrderId });
      console.log('[START SERVICE] url', `${window.SUPABASE_URL}/rest/v1/rpc/start_service`);
      console.log('[START SERVICE] jwt', jwt ? jwt.slice(0, 20) + '…' : 'null');

      const orderId = Number(supabaseOrderId);
      console.log('[START SERVICE]', typeof orderId, orderId);

      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/rpc/start_service`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        window.SUPABASE_KEY,
            'Authorization': 'Bearer ' + jwt,
          },
          // p_order_id como Number garante bigint — evita HTTP 300 com a versão uuid
          body: JSON.stringify({ p_order_id: orderId }),
        }
      );

      console.log('[START SERVICE] status', res.status);
      const raw = await res.text();
      console.log('[START SERVICE] raw response', raw);

      let data = null;
      try { data = JSON.parse(raw); } catch(e) { console.error('[START SERVICE] JSON parse fail', e); }
      console.log('[START SERVICE] parsed', data);

      if (!res.ok || (data && data.success === false)) {
        const err = (data && (data.message || data.error || data.hint)) || raw || `HTTP ${res.status}`;
        console.error('[OrdersAdmin] Falha ao iniciar serviço:', err);
        if (typeof showToast === 'function') showToast((data && (data.message || data.error)) || raw || `Erro ao iniciar serviço (${res.status})`, 'error');
        return { success: false, error: err };
      }

      console.log('[OrdersAdmin] ✅ Serviço iniciado:', data);

      if (typeof OrdersNotifications !== 'undefined') {
        OrdersNotifications.show(
          `✅ Serviço #${supabaseOrderId} iniciado! SLA: ${data.sla_days || data.sla_min_days} dias.`,
          'em_andamento',
          4000
        );
      }

      // Notifica o dono do pedido via tabela public.notifications
      _insertNotification(supabaseOrderId, 'em_andamento', 'Pedido iniciado', 'Seu pedido entrou em andamento.');

      // Recarrega a lista para refletir o novo status
      if (typeof pedidosCarregar === 'function') pedidosCarregar();
      else if (typeof OrdersUI !== 'undefined') OrdersUI.render();

      return { success: true, data };

    } catch (e) {
      console.error('[OrdersAdmin] Erro de rede ao iniciar serviço:', e);
      if (typeof showToast === 'function') showToast('Erro de rede: ' + e.message, 'error');
      return { success: false, error: e.message };
    }
  }

  // ── Ação: CONCLUIR SERVIÇO ────────────────────────────────────────────────

  async function completeService(supabaseOrderId, adminNotes) {
    if (!isCurrentUserAdmin()) return;

    const confirmed = await showConfirmModal({
      title: `Concluir Serviço #${supabaseOrderId}`,
      message: 'O pedido sairá da fila principal.',
      confirmText: 'Concluir',
      cancelText: 'Cancelar',
      type: 'success'
    });
    if (!confirmed) return { success: false, cancelled: true };

    try {
      const jwt = _getJWT();
      if (!jwt) { if (typeof showToast === 'function') showToast('Sessão expirada. Faça login novamente.', 'error'); return { success: false, error: 'NO_JWT' }; }
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/rpc/complete_service`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        window.SUPABASE_KEY,
            'Authorization': 'Bearer ' + jwt,
          },
          body: JSON.stringify({
            p_order_id:    supabaseOrderId,
            p_admin_notes: adminNotes || null,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || (data && data.success === false)) {
        const err = (data && data.error) || `HTTP ${res.status}`;
        if (typeof showToast === 'function') showToast('Erro ao concluir: ' + err, 'error');
        return { success: false, error: err };
      }

      if (window.OrdersNotifications && typeof OrdersNotifications.show === 'function') {
        OrdersNotifications.show(`✅ Pedido #${supabaseOrderId} concluído!`, 'concluido', 3000);
      }

      // Notifica o dono do pedido via tabela public.notifications
      _insertNotification(supabaseOrderId, 'concluido', 'Pedido concluído', 'Seu pedido foi concluído.');

      if (typeof pedidosCarregar === 'function') pedidosCarregar();
      else if (typeof OrdersUI !== 'undefined') OrdersUI.render();

      // ── Abre modal de comprovante de entrega ─────────────────────────────
      setTimeout(() => {
        if (window.DeliveryAdmin && typeof DeliveryAdmin.openModal === 'function') {
          // Tenta recuperar dados do pedido para desnormalizar
          let orderData = {};
          try {
            const allOrders = (window.OrdersStorage && OrdersStorage.getAll) ? OrdersStorage.getAll() : [];
            const order = allOrders.find(o => {
              const sid = o._supabaseId || o.orderNumber;
              return String(sid) === String(supabaseOrderId);
            });
            if (order) {
              orderData = {
                nick:    order.userNickname || order.nick || '—',
                service: (order.items && order.items.map ? order.items.map(i => i.name || i.item).join(', ') : null) || order.service_type || '—',
                pokemon: (order.items && order.items[0]) ? (order.items[0].pokemon || order.items[0].name || '') : '',
                tipo:    order.service_type || order.type || '—',
              };
            }
          } catch (_) {}
          DeliveryAdmin.openModal(supabaseOrderId, orderData);
        }
      }, 600);

      return { success: true, data };

    } catch (e) {
      if (typeof showToast === 'function') showToast('Erro de rede: ' + e.message, 'error');
      return { success: false, error: e.message };
    }
  }

  // ── Ação: CANCELAR ────────────────────────────────────────────────────────

  async function cancelOrder(supabaseOrderId) {
    if (!isCurrentUserAdmin()) return;
    const confirmed = await showConfirmModal({
      title: `Cancelar Pedido #${supabaseOrderId}`,
      message: 'Esta ação não pode ser desfeita.',
      confirmText: 'Cancelar Pedido',
      cancelText: 'Voltar',
      type: 'danger'
    });
    if (!confirmed) return;

    await _patchStatus(supabaseOrderId, 'cancelled');

    // Notifica o dono do pedido via tabela public.notifications
    _insertNotification(supabaseOrderId, 'cancelado', 'Pedido cancelado', 'Seu pedido foi cancelado.');

    if (typeof OrdersNotifications !== 'undefined') {
      OrdersNotifications.show(`Pedido #${supabaseOrderId} cancelado.`, 'cancelado', 3000);
    }
  }

  // ── Mudança de status genérica (para outros status permitidos) ────────────

  async function setStatus(orderId, newStatus) {
    if (!isCurrentUserAdmin()) return;

    // Para iniciar/concluir, usa as funções específicas (que validam no banco)
    if (newStatus === 'in_progress') {
      const supabaseId = _extractSupabaseId(orderId);
      if (supabaseId) return startService(supabaseId);
    }
    if (newStatus === 'completed') {
      const supabaseId = _extractSupabaseId(orderId);
      if (supabaseId) return completeService(supabaseId);
    }
    if (newStatus === 'cancelled') {
      const supabaseId = _extractSupabaseId(orderId);
      if (supabaseId) return cancelOrder(supabaseId);
    }

    // Para outros casos: PATCH direto
    await _patchStatus(_extractSupabaseId(orderId) || orderId, newStatus);
  }

  // ── Atualizar quantidade entregue de item ─────────────────────────────────

  function updateItemQty(orderId, itemId, rawQty) {
    if (!isCurrentUserAdmin()) return;
    const qty = parseInt(rawQty, 10);
    if (isNaN(qty)) return;
    const admin = Session.getCurrentUser();
    const result = OrdersStorage.updateItemProgress(orderId, itemId, qty, admin.nickname);
    if (result.success && typeof OrdersUI !== 'undefined') OrdersUI.refresh();
  }

  // ── Salvar observação ─────────────────────────────────────────────────────

  function saveObservation(orderId, text) {
    if (!isCurrentUserAdmin()) return;
    const admin = Session.getCurrentUser();
    OrdersStorage.addObservation(orderId, text, admin.nickname);
  }

  // ── Excluir pedido ────────────────────────────────────────────────────────

  async function deleteOrder(orderId) {
    if (!isCurrentUserAdmin()) return;
    const confirmed = await showConfirmModal({
      title: 'Excluir Pedido',
      message: 'Excluir pedido permanentemente? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    if (!confirmed) return;

    // Remove do storage local
    OrdersStorage.deleteOrder(orderId);

    // Remove do banco se for pedido do Supabase
    const supabaseId = _extractSupabaseId(orderId);
    if (supabaseId) {
      try {
        await fetch(
          `${window.SUPABASE_URL}/rest/v1/pedidos?id=eq.${supabaseId}`,
          {
            method: 'DELETE',
            headers: {
              'apikey':        window.SUPABASE_KEY,
              'Authorization': 'Bearer ' + _getJWT(),
            },
          }
        );
      } catch (e) {
        console.warn('[OrdersAdmin] Falha ao excluir do banco:', e);
      }
    }

    if (typeof OrdersUI !== 'undefined') OrdersUI.refresh();
  }

  // ── Painel Admin Inline ───────────────────────────────────────────────────

  function renderAdminPanel(order) {
    const status     = OrdersProgress.normalizeStatus(order.status_v3 || order.status);
    const supabaseId = order._supabaseId || order.orderNumber;
    const eta        = OrdersProgress.calcETA(order);
    const sla        = OrdersProgress.calcSLA(
      order.service_type || 'normal_package',
      order.service_quantity || 1
    );

    // Botão de ação principal varia por status
    let mainActionHTML = '';
    if (status === 'waiting_queue') {
      mainActionHTML = `
        <button class="oa-btn oa-btn--start" onclick="OrdersAdmin.startService(${supabaseId})">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          INICIAR SERVIÇO
        </button>
      `;
    } else if (status === 'in_progress') {
      mainActionHTML = `
        <button class="oa-btn oa-btn--complete" onclick="OrdersAdmin.completeService(${supabaseId})">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          CONCLUIR SERVIÇO
        </button>
      `;
    }

    // ETA ou info de fila
    let slaInfoHTML = '';
    if (status === 'in_progress' && eta) {
      const overdue = eta.slaStatus === 'overdue';
      slaInfoHTML = `
        <div class="oa-sla-info ${overdue ? 'overdue' : ''}">
          <div class="oa-sla-row">
            <span class="oa-sla-label">Iniciado em</span>
            <span class="oa-sla-val">${OrdersProgress.formatDate(order.started_at)}</span>
          </div>
          <div class="oa-sla-row">
            <span class="oa-sla-label">SLA</span>
            <span class="oa-sla-val">${sla.label}</span>
          </div>
          <div class="oa-sla-row">
            <span class="oa-sla-label">ETA</span>
            <span class="oa-sla-val">${eta.etaMinLabel} ~ ${eta.etaMaxLabel}</span>
          </div>
          <div class="oa-sla-row">
            <span class="oa-sla-label">Status</span>
            <span class="oa-sla-val ${overdue ? 'text-red' : 'text-green'}">${eta.label}</span>
          </div>
          <div class="oa-progress-bar">
            <div class="oa-progress-fill" style="width:${eta.progressPct}%; background:${overdue ? '#ef4444' : '#3a8cff'}"></div>
          </div>
        </div>
      `;
    } else if (status === 'waiting_queue') {
      slaInfoHTML = `
        <div class="oa-sla-info waiting">
          <div class="oa-sla-row">
            <span class="oa-sla-label">Status</span>
            <span class="oa-sla-val text-yellow">⏳ Aguardando início</span>
          </div>
          <div class="oa-sla-row">
            <span class="oa-sla-label">SLA estimado</span>
            <span class="oa-sla-val">${sla.label}</span>
          </div>
          <div class="oa-sla-note">
            O countdown começa somente quando você clicar em "Iniciar Serviço".
          </div>
        </div>
      `;
    }

    // Seletor de tipo de serviço (só para waiting_queue — antes de iniciar)
    let serviceTypeHTML = '';
    if (status === 'waiting_queue') {
      serviceTypeHTML = `
        <div class="oa-section">
          <div class="oa-section-label">Tipo de Serviço</div>
          <div class="oa-service-grid">
            <button class="oa-service-opt ${(order.service_type || 'normal_package') === 'normal_package' ? 'active' : ''}"
                    onclick="OrdersAdmin.setServiceType('${order.id}', ${supabaseId}, 'normal_package')">
              📦 Pacote Normal<br><small>7 dias por pacote</small>
            </button>
            <button class="oa-service-opt ${order.service_type === 'pokemon_sr' ? 'active' : ''}"
                    onclick="OrdersAdmin.setServiceType('${order.id}', ${supabaseId}, 'pokemon_sr')">
              ✨ Pokémon SR<br><small>45 dias por unidade</small>
            </button>
          </div>
          <div class="oa-qty-row">
            <span class="oa-section-label">Quantidade</span>
            <input type="number" class="oa-qty-input" min="1" max="99"
                   value="${order.service_quantity || 1}"
                   onchange="OrdersAdmin.setServiceQuantity('${order.id}', ${supabaseId}, this.value)" />
          </div>
        </div>
      `;
    }

    // Item progress rows
    const itemRows = (order.items || []).map(item => {
      const pct = OrdersProgress.calcItemProgress(item);
      return `
        <div class="oa-item-row" data-item-id="${item.id}">
          <span class="oa-item-name">${item.name}</span>
          <div class="oa-item-controls">
            <input type="number" class="oa-item-qty-input"
                   min="0" max="${item.qtdTotal}" value="${item.qtdEntregue}"
                   aria-label="Entregues de ${item.name}"
                   onchange="OrdersAdmin.updateItemQty('${order.id}', '${item.id}', this.value)" />
            <span class="oa-item-total">/ ${item.qtdTotal}</span>
            <div class="oa-item-mini-bar">
              <div class="oa-item-mini-fill" style="width:${pct}%; background:${OrdersProgress.progressBarColor(pct)}"></div>
            </div>
            ${item.concluido ? '<span class="oa-item-check">✓</span>' : ''}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="oa-panel" id="oa-panel-${order.id}">
        <div class="oa-panel-header">
          <span class="oa-panel-title">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
            Controles Admin
          </span>
        </div>

        ${slaInfoHTML}

        ${serviceTypeHTML}

        ${order.items && order.items.length ? `
        <div class="oa-section">
          <div class="oa-section-label">Progresso dos Itens</div>
          <div class="oa-items-list">${itemRows}</div>
        </div>
        ` : ''}

        <div class="oa-section">
          <div class="oa-section-label">Observação (interna)</div>
          <textarea class="oa-obs-input" placeholder="Notas internas (não visível ao cliente)..."
                    maxlength="500"
                    onblur="OrdersAdmin.saveObservation('${order.id}', this.value)"
          >${order.observations || ''}</textarea>
        </div>

        <div class="oa-actions">
          ${mainActionHTML}
          <button class="oa-btn oa-btn--cancel" onclick="OrdersAdmin.cancelOrder(${supabaseId})">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Cancelar
          </button>
          <button class="oa-btn oa-btn--delete" onclick="OrdersAdmin.deleteOrder('${order.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            Excluir
          </button>
        </div>
      </div>
    `;
  }

  // ── Alterar tipo de serviço (antes do início) ─────────────────────────────

  async function setServiceType(localOrderId, supabaseId, serviceType) {
    if (!isCurrentUserAdmin()) return;

    try {
      await fetch(
        `${window.SUPABASE_URL}/rest/v1/pedidos?id=eq.${supabaseId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        window.SUPABASE_KEY,
            'Authorization': 'Bearer ' + _getJWT(),
            'Prefer':        'return=minimal',
          },
          body: JSON.stringify({ service_type: serviceType }),
        }
      );
      if (typeof pedidosCarregar === 'function') pedidosCarregar();
    } catch (e) {
      console.error('[OrdersAdmin] Erro ao alterar tipo de serviço:', e);
    }
  }

  async function setServiceQuantity(localOrderId, supabaseId, qty) {
    if (!isCurrentUserAdmin()) return;
    const q = Math.max(1, parseInt(qty, 10) || 1);

    try {
      await fetch(
        `${window.SUPABASE_URL}/rest/v1/pedidos?id=eq.${supabaseId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        window.SUPABASE_KEY,
            'Authorization': 'Bearer ' + _getJWT(),
            'Prefer':        'return=minimal',
          },
          body: JSON.stringify({ service_quantity: q }),
        }
      );
    } catch (e) {
      console.error('[OrdersAdmin] Erro ao alterar quantidade:', e);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  function _getJWT() {
    // PATCH 5.1: usa Session.getAccessToken() — token JWT real do usuário logado.
    // Se não houver sessão ativa, aborta (não faz sentido chamar ações admin sem login).
    if (typeof Session !== 'undefined' && Session.getAccessToken) {
      var token = Session.getAccessToken();
      if (token) return token;
    }
    console.warn('[OrdersAdmin] ⛔ Nenhum JWT de sessão ativa.');
    return null; // Chamadores devem checar null antes de disparar o fetch
  }

  function _extractSupabaseId(orderId) {
    if (typeof orderId === 'number') return orderId;
    if (typeof orderId === 'string' && orderId.startsWith('sb_')) {
      const parsed = parseInt(orderId.slice(3), 10);
      return isNaN(parsed) ? null : parsed;
    }
    const parsed = parseInt(orderId, 10);
    return isNaN(parsed) ? null : parsed;
  }

  async function _patchStatus(supabaseId, newStatus) {
    try {
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/pedidos?id=eq.${supabaseId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        window.SUPABASE_KEY,
            'Authorization': 'Bearer ' + _getJWT(),
            'Prefer':        'return=minimal',
          },
          body: JSON.stringify({ status_v3: newStatus }),
        }
      );
      if (!res.ok) throw new Error('HTTP ' + res.status);
      if (typeof pedidosCarregar === 'function') pedidosCarregar();
    } catch (e) {
      console.error('[OrdersAdmin] Falha ao atualizar status:', e);
      if (typeof showToast === 'function') showToast('Erro ao atualizar status: ' + e.message, 'error');
    }
  }

  // ── Helper: insere notificação no Supabase para o dono do pedido ──────────
  // Busca o user_id do pedido na tabela e insere em public.notifications.
  // Falha silenciosa — não interrompe o fluxo principal se der erro.
  async function _insertNotification(supabaseOrderId, type, title, message) {
    try {
      const jwt = _getJWT();
      if (!jwt) return; // sem sessão, não pode inserir

      // Busca o user_id do pedido
      const userRes = await fetch(
        `${window.SUPABASE_URL}/rest/v1/pedidos?id=eq.${supabaseOrderId}&select=user_id`,
        {
          headers: {
            'apikey':        window.SUPABASE_KEY,
            'Authorization': 'Bearer ' + jwt,
          },
        }
      );
      if (!userRes.ok) return;
      const rows = await userRes.json();
      const userId = rows && rows[0] && rows[0].user_id;
      if (!userId) return;

      // Insere a notificação
      await fetch(
        `${window.SUPABASE_URL}/rest/v1/notifications`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        window.SUPABASE_KEY,
            'Authorization': 'Bearer ' + jwt,
            'Prefer':        'return=minimal',
          },
          body: JSON.stringify({ user_id: userId, type, title, message }),
        }
      );
    } catch (e) {
      console.warn('[OrdersAdmin] _insertNotification falhou silenciosamente:', e.message);
    }
  }

  // ── Estilos do Painel ─────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('oa-styles-v3')) return;
    const style = document.createElement('style');
    style.id = 'oa-styles-v3';
    style.textContent = `
      .oa-panel {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 10px;
        padding: 14px;
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .oa-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .oa-panel-title {
        display: flex; align-items: center; gap: 6px;
        font-size: 10px; font-weight: 700; letter-spacing: 1px;
        text-transform: uppercase; color: rgba(255,215,100,0.7);
      }
      .oa-section { display: flex; flex-direction: column; gap: 8px; }
      .oa-section-label {
        font-size: 10px; font-weight: 600; letter-spacing: 0.8px;
        text-transform: uppercase; color: rgba(255,255,255,0.35);
      }

      /* SLA Info Box */
      .oa-sla-info {
        background: rgba(58,140,255,0.06);
        border: 1px solid rgba(58,140,255,0.18);
        border-radius: 8px;
        padding: 10px 12px;
        display: flex; flex-direction: column; gap: 5px;
      }
      .oa-sla-info.waiting {
        background: rgba(245,197,66,0.06);
        border-color: rgba(245,197,66,0.18);
      }
      .oa-sla-info.overdue {
        background: rgba(239,68,68,0.06);
        border-color: rgba(239,68,68,0.25);
      }
      .oa-sla-row {
        display: flex; justify-content: space-between; align-items: center;
        font-size: 11px;
      }
      .oa-sla-label { color: rgba(255,255,255,0.4); }
      .oa-sla-val   { color: rgba(255,255,255,0.85); font-weight: 600; }
      .oa-sla-note  {
        font-size: 10px; color: rgba(245,197,66,0.55);
        border-top: 1px solid rgba(255,255,255,0.05);
        padding-top: 5px; margin-top: 2px;
      }
      .text-green { color: #4ade80 !important; }
      .text-red   { color: #f87171 !important; }
      .text-yellow{ color: #ffd166 !important; }

      /* Progress Bar */
      .oa-progress-bar {
        height: 3px; background: rgba(255,255,255,0.08);
        border-radius: 2px; overflow: hidden; margin-top: 4px;
      }
      .oa-progress-fill {
        height: 100%; border-radius: 2px;
        transition: width 0.5s ease;
      }

      /* Service Type Selector */
      .oa-service-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
      }
      .oa-service-opt {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px; padding: 8px 10px;
        color: rgba(255,255,255,0.6); font-size: 11px;
        cursor: pointer; text-align: left; line-height: 1.4;
        transition: all 0.2s; font-family: var(--font-body, sans-serif);
      }
      .oa-service-opt small { font-size: 10px; opacity: 0.6; }
      .oa-service-opt:hover {
        background: rgba(255,255,255,0.07);
        border-color: rgba(255,255,255,0.2);
        color: rgba(255,255,255,0.9);
      }
      .oa-service-opt.active {
        background: rgba(58,140,255,0.12);
        border-color: rgba(58,140,255,0.4);
        color: #60aaff;
      }
      .oa-qty-row {
        display: flex; align-items: center; gap: 10px; margin-top: 4px;
      }
      .oa-qty-input {
        width: 60px; padding: 4px 8px; border-radius: 6px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        color: rgba(255,255,255,0.85); font-size: 13px; text-align: center;
        font-family: var(--font-body, sans-serif);
      }

      /* Item rows */
      .oa-items-list { display: flex; flex-direction: column; gap: 6px; }
      .oa-item-row {
        display: flex; align-items: center;
        justify-content: space-between; gap: 8px;
        padding: 5px 0;
        border-bottom: 1px solid rgba(255,255,255,0.04);
      }
      .oa-item-name   { font-size: 12px; color: rgba(255,255,255,0.75); flex: 1; }
      .oa-item-controls { display: flex; align-items: center; gap: 6px; }
      .oa-item-qty-input {
        width: 46px; padding: 3px 6px; border-radius: 5px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.85); font-size: 12px; text-align: center;
        font-family: var(--font-body, sans-serif);
      }
      .oa-item-total  { font-size: 11px; color: rgba(255,255,255,0.35); }
      .oa-item-mini-bar {
        width: 40px; height: 3px; background: rgba(255,255,255,0.08);
        border-radius: 2px; overflow: hidden;
      }
      .oa-item-mini-fill { height: 100%; border-radius: 2px; }
      .oa-item-check  { color: #4ade80; font-size: 12px; }

      /* Obs */
      .oa-obs-input {
        width: 100%; min-height: 60px; padding: 8px 10px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 7px; color: rgba(255,255,255,0.8);
        font-size: 12px; resize: vertical;
        font-family: var(--font-body, sans-serif);
        box-sizing: border-box;
      }

      /* Action Buttons */
      .oa-actions {
        display: flex; flex-wrap: wrap; gap: 6px; padding-top: 4px;
        border-top: 1px solid rgba(255,255,255,0.06);
      }
      .oa-btn {
        display: flex; align-items: center; justify-content: center; gap: 5px;
        padding: 8px 14px; border-radius: 8px; border: 1px solid transparent;
        cursor: pointer; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
        text-transform: uppercase; font-family: var(--font-body, sans-serif);
        transition: all 0.2s;
      }
      /* Botão principal: INICIAR SERVIÇO */
      .oa-btn--start {
        background: rgba(34,197,94,0.12);
        border-color: rgba(34,197,94,0.4);
        color: #4ade80;
        flex: 1;
        font-size: 12px;
        padding: 10px 16px;
        box-shadow: 0 0 16px rgba(34,197,94,0.15);
      }
      .oa-btn--start:hover {
        background: rgba(34,197,94,0.22);
        box-shadow: 0 0 24px rgba(34,197,94,0.3);
        transform: translateY(-1px);
      }
      .oa-btn--complete {
        background: rgba(34,197,94,0.08);
        border-color: rgba(34,197,94,0.25);
        color: #4ade80; flex: 1;
      }
      .oa-btn--complete:hover { background: rgba(34,197,94,0.16); }
      .oa-btn--cancel {
        background: rgba(245,197,66,0.07);
        border-color: rgba(245,197,66,0.2);
        color: #ffd166;
      }
      .oa-btn--cancel:hover { background: rgba(245,197,66,0.14); }
      .oa-btn--delete {
        background: rgba(239,68,68,0.07);
        border-color: rgba(239,68,68,0.18);
        color: #f87171;
      }
      .oa-btn--delete:hover { background: rgba(239,68,68,0.14); }

      /* Toggle admin */
      .order-card-admin-toggle {
        display: flex; align-items: center; gap: 5px;
        padding: 5px 10px; border-radius: 7px;
        background: rgba(255,215,100,0.07);
        border: 1px solid rgba(255,215,100,0.15);
        color: rgba(255,215,100,0.7); font-size: 10px;
        font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
        cursor: pointer; transition: all 0.2s;
        font-family: var(--font-body, sans-serif);
      }
      .order-card-admin-toggle:hover, .order-card-admin-toggle.active {
        background: rgba(255,215,100,0.12); color: #ffd166;
        border-color: rgba(255,215,100,0.3);
      }

      @media (max-width: 480px) {
        .oa-service-grid { grid-template-columns: 1fr; }
        .oa-item-row     { flex-direction: column; align-items: flex-start; }
        .oa-item-controls{ width: 100%; }
      }
    `;
    document.head.appendChild(style);
  }

  return {
    isAdmin,
    isCurrentUserAdmin,
    startService,
    completeService,
    cancelOrder,
    setStatus,
    updateItemQty,
    saveObservation,
    deleteOrder,
    setServiceType,
    setServiceQuantity,
    renderAdminPanel,
    injectStyles,
  };
})();