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
    // OBRIGATÓRIO: aguarda sessão antes de verificar role admin
    await Session.ready();

    if (!isCurrentUserAdmin()) {
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
      if (!jwt) {
        if (typeof showToast === 'function') showToast('Sessão inválida. Faça login novamente.', 'error');
        return { success: false, error: 'Sem JWT — sessão inválida.' };
      }

      const orderId = Number(supabaseOrderId);

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

      const raw = await res.text();

      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch (parseErr) {
        console.error('[OrdersAdmin] start_service parse fail', parseErr, raw);
      }

      if (!res.ok) {
        const err = (data && (data.message || data.error || data.hint)) || raw || `HTTP ${res.status}`;
        if (typeof showToast === 'function') showToast((data && (data.message || data.error)) || raw || `Erro ao iniciar serviço (${res.status})`, 'error');
        return { success: false, error: err };
      }

      if (!data) {
        console.error('[OrdersAdmin] start_service retornou body vazio ou inválido. raw:', raw);
        throw new Error('Resposta inválida da RPC start_service');
      }


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
      if (typeof showToast === 'function') showToast('Erro de rede: ' + e.message, 'error');
      return { success: false, error: e.message };
    }
  }

  // ── Ação: CONCLUIR SERVIÇO ────────────────────────────────────────────────

  async function completeService(supabaseOrderId, adminNotes) {
    // OBRIGATÓRIO: aguarda sessão antes de verificar role admin
    await Session.ready();

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
      if (!jwt) {
        if (typeof showToast === 'function') showToast('Sessão inválida. Faça login novamente.', 'error');
        return { success: false, error: 'Sem JWT — sessão inválida.' };
      }
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
          // FIX: API correta é getAllOrders(), getAll() não existe
          // [FIX DELIVERY_MODAL] Helper para montar orderData a partir de um objeto de pedido
          function _buildOrderData(order) {
            const _s = typeof safe === 'function' ? safe : (v, f) => (v || f || '-');
            // Supabase retorna "itens" (JSONB); cache local usa "items" — normaliza aqui uma vez.
            const items = order.items || order.itens || [];
            // Suporte a campos EN canônicos + aliases PT
            const serviceItems = (items.length)
              ? items.map(i => i.name || i.nome || i.item || '').filter(Boolean).join(', ')
              : null;
            // ── item_name + quantity a partir de items[] ──────────────────────
            const _isPokemonType = (order.service_type || '').toLowerCase().includes('pokemon');
            // pokemon: pega do primeiro item (campo pokemon ou name) ou do campo direto
            const _pokemon = _s(
              (items[0]) ? (items[0].pokemon || (_isPokemonType ? (items[0].name || items[0].nome) : null)) : null,
              ''
            );
            // item_name: itens não-pokemon — concatena nomes
            const _itemName = !_isPokemonType && items.length
              ? items.map(i => i.name || i.nome || '').filter(Boolean).join(', ')
              : null;
            // quantity: soma qtdTotal de todos os itens
            const _quantity = items.length
              ? items.reduce((s, i) => s + parseInt(i.qtdTotal || i.quantidade || i.qty || 1, 10), 0)
              : (order.service_quantity || null);

            return {
              // nick: nick_jogo é o único campo de nick retornado pelo banco agora
              nick:         _s(order.nick_jogo || order.nickname || order.nick || order.cliente_nick, '—'),
              // player_name: idem
              player_name:  _s(order.nick_jogo || order.nickname || order.nick || order.cliente_nick, null),
              // service: quando não há service_name no banco, usa service_type como fallback
              service:      _s(serviceItems || order.service_name  || order.service_type, '—'),
              service_name: _s(serviceItems || order.service_name  || order.service_type, '—'),
              // pokemon: alias usado por _buildModalHTML + canonical EN
              pokemon:      _pokemon,
              pokemon_name: _pokemon,
              // item_name + quantity: para entregas de items
              item_name:    _itemName || null,
              quantity:     _quantity,
              // tipo: alias usado por _buildModalHTML + canonical EN
              tipo:         _s(order.service_type || order.type || order.tipo, '—'),
              service_type: _s(order.service_type || order.type || order.tipo, '—'),
              // created_at: para calcular tempo total do pedido
              created_at:   order.created_at || order.createdAt || order.timestamp || null,
            };
          }

          let orderData = {};
          let _foundInCache = false;
          try {
            const allOrders = (window.OrdersStorage && typeof OrdersStorage.getAllOrders === 'function')
              ? OrdersStorage.getAllOrders()
              : [];
            const order = allOrders.find(o => {
              // FIX: supabase ID pode estar em _supabaseId, orderNumber, ou como "sb_123" no id
              const sid = o._supabaseId
                || o.orderNumber
                || (typeof o.id === 'string' && o.id.startsWith('sb_') ? o.id.replace('sb_', '') : o.id);
              return String(sid) === String(supabaseOrderId);
            });
            if (order) {
              orderData = _buildOrderData(order);
              _foundInCache = true;
            } else {
            }
          } catch (err) {
          }

          // [FIX DELIVERY_MODAL] Se não encontrou no cache, busca direto no Supabase antes de abrir o modal
          if (!_foundInCache && window.SUPABASE_URL && window.SUPABASE_KEY) {
            (async () => {
              try {
                const jwt = (typeof Session !== 'undefined' && Session.getAccessToken) ? Session.getAccessToken() : null;
                if (!jwt) { DeliveryAdmin.openModal(supabaseOrderId, {}); return; }
                const res = await fetch(
                  window.SUPABASE_URL + '/rest/v1/pedidos?id=eq.' + supabaseOrderId +
                  '&select=id,nick_jogo,itens,created_at,started_at,completed_at,service_type,service_quantity,status&limit=1',
                  { headers: { 'Content-Type': 'application/json', 'apikey': window.SUPABASE_KEY, 'Authorization': 'Bearer ' + jwt } }
                );
                if (res.ok) {
                  const rows = await res.json();
                  if (rows && rows[0]) {
                    console.log('[OrdersAdmin] delivery modal — pedido carregado:', rows[0].id, '| status:', rows[0].status);
                    orderData = _buildOrderData(rows[0]);
                  } else {
                    console.warn('[OrdersAdmin] delivery modal — pedido não encontrado para id:', supabaseOrderId);
                  }
                } else {
                  const errBody = await res.json().catch(() => ({}));
                  console.error('[OrdersAdmin] delivery modal — HTTP', res.status, errBody.message || errBody);
                }
              } catch (fetchErr) {
                console.error('[OrdersAdmin] delivery modal fetch fail', fetchErr);
                if (typeof showToast === 'function') showToast('Falha ao carregar dados do pedido', 'error');
              }
              DeliveryAdmin.openModal(supabaseOrderId, orderData);
            })();
            return; // openModal será chamado pelo async acima
          }

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
    // OBRIGATÓRIO: aguarda sessão antes de verificar role admin
    await Session.ready();

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
    // OBRIGATÓRIO: aguarda sessão antes de verificar role admin
    await Session.ready();

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

  async function updateItemQty(orderId, itemId, rawQty) {
    // OBRIGATÓRIO: aguarda sessão antes de verificar role admin
    await Session.ready();
    if (!isCurrentUserAdmin()) return;
    const qty = parseInt(rawQty, 10);
    if (isNaN(qty)) return;
    const admin = Session.getCurrentUser();
    const result = OrdersStorage.updateItemProgress(orderId, itemId, qty, admin.nickname);
    if (result.success && typeof OrdersUI !== 'undefined') OrdersUI.refresh();
  }

  // ── Salvar observação ─────────────────────────────────────────────────────

  async function saveObservation(orderId, text) {
    // OBRIGATÓRIO: aguarda sessão antes de verificar role admin
    await Session.ready();
    if (!isCurrentUserAdmin()) return;
    const admin = Session.getCurrentUser();
    OrdersStorage.addObservation(orderId, text, admin.nickname);
  }

  // ── Excluir pedido — DELETE CASCADE COMPLETO ─────────────────────────────
  //
  // Executa exclusão em transação lógica sequencial:
  //   1. delivery_history  → 2. delivery_proofs → 3. captures
  //   4. notifications     → 5. pedido principal
  //
  // Se QUALQUER etapa falhar → ABORTA imediatamente.
  // O pedido principal NÃO é excluído se dependências falharem.
  // Após sucesso total: limpa localStorage, caches e memória temporária.

  async function deleteOrder(orderId) {
    // OBRIGATÓRIO: aguarda sessão antes de verificar role admin
    await Session.ready();

    if (!isCurrentUserAdmin()) return;

    const confirmed = await showConfirmModal({
      title: 'Excluir Pedido',
      message: 'Excluir pedido permanentemente? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    if (!confirmed) return;

    const supabaseId = _extractSupabaseId(orderId);

    // ── Cascata no banco ─────────────────────────────────────────────────
    if (supabaseId) {
      const jwt = _getJWT();
      if (!jwt) {
        console.error('[DeleteCascade] Sem JWT — exclusão abortada.');
        if (typeof showToast === 'function') showToast('Sessão inválida. Faça login novamente.', 'error');
        return;
      }

      const headers = {
        'apikey':        window.SUPABASE_KEY,
        'Authorization': 'Bearer ' + jwt,
        'Prefer':        'return=minimal',
      };
      const base = window.SUPABASE_URL;

      // Helper: executa um DELETE e lança erro se falhar
      async function _cascadeDelete(table, filter, label) {
        console.log(`[DeleteCascade] Deletando ${label} (${table}?${filter})...`);
        const res = await fetch(`${base}/rest/v1/${table}?${filter}`, {
          method: 'DELETE',
          headers,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg = body.message || body.error || body.hint || `HTTP ${res.status}`;
          throw new Error(`Falha em ${label}: ${msg}`);
        }
        console.log(`[DeleteCascade] ✓ ${label} removido.`);
      }

      try {
        // ETAPA 1 — delivery_history
        await _cascadeDelete('delivery_history', `order_id=eq.${supabaseId}`, 'delivery_history');

        // ETAPA 2 — delivery_proofs
        await _cascadeDelete('delivery_proofs', `order_id=eq.${supabaseId}`, 'delivery_proofs');

        // ETAPA 3 — captures
        await _cascadeDelete('captures', `order_id=eq.${supabaseId}`, 'captures');

        // ETAPA 4 — notifications
        await _cascadeDelete('notifications', `pedido_id=eq.${supabaseId}`, 'notifications');

        // ETAPA 5 — pedido principal (só chega aqui se todas as anteriores ok)
        await _cascadeDelete('pedidos', `id=eq.${supabaseId}`, 'pedido principal');

        console.log(`[DeleteSuccess] Pedido #${supabaseId} excluído completamente do banco.`);

      } catch (err) {
        // ABORT — qualquer etapa falhou
        console.error(`[DeleteAbort] Cascata interrompida. ${err.message}`);
        if (typeof showToast === 'function') {
          showToast(`Exclusão abortada: ${err.message}`, 'error');
        }
        // Não continua — não limpa localStorage, não atualiza UI
        return;
      }
    }

    // ── Limpeza pós-sucesso ───────────────────────────────────────────────
    // Só chega aqui se o banco foi limpo (ou não havia supabaseId)

    // 1. Remove do localStorage (cache local)
    if (typeof OrdersStorage !== 'undefined') {
      OrdersStorage.deleteOrderDirect(orderId, { preventRestore: true });
    }

    // 2. Limpa caches em memória conhecidos
    if (window._ordersCache && Array.isArray(window._ordersCache)) {
      window._ordersCache = window._ordersCache.filter(
        o => String(o.id) !== String(orderId) &&
             String(o._supabaseId) !== String(supabaseId) &&
             String(o.orderNumber) !== String(supabaseId)
      );
    }

    // 3. Remove entrada específica de qualquer chave localStorage que referencie o pedido
    _purgeLocalStorageReferences(orderId, supabaseId);

    // 4. Emite evento global de refresh para todos os módulos ouvintes
    try {
      window.dispatchEvent(new CustomEvent('orders:deleted', {
        detail: { orderId, supabaseId }
      }));
    } catch (_) {}

    console.log(`[DeleteSuccess] Pedido ${orderId} removido: banco, histórico, notificações, cache e localStorage.`);

    if (typeof showToast === 'function') {
      showToast(`Pedido #${supabaseId || orderId} excluído completamente.`, 'success');
    }

    // 5. Recarrega a lista
    if (typeof pedidosCarregar === 'function') pedidosCarregar();
    else if (typeof OrdersUI !== 'undefined') OrdersUI.refresh();
  }

  // ── Helper: remove referências ao pedido de todas as chaves localStorage ─
  function _purgeLocalStorageReferences(orderId, supabaseId) {
    try {
      // Chave principal do cache de pedidos
      const ORDERS_KEY = 'pa_orders_v2';
      const raw = localStorage.getItem(ORDERS_KEY);
      if (raw) {
        const orders = JSON.parse(raw);
        const filtered = orders.filter(o => {
          if (String(o.id) === String(orderId)) return false;
          const sid = o._supabaseId || o.orderNumber;
          if (supabaseId && String(sid) === String(supabaseId)) return false;
          return true;
        });
        localStorage.setItem(ORDERS_KEY, JSON.stringify(filtered));
        console.log(`[DeleteSuccess] localStorage "${ORDERS_KEY}" atualizado (${orders.length} → ${filtered.length} pedidos).`);
      }

      // Chaves de notificações lidas que referenciam este pedido
      const notifKey = `pa_notif_read_v1`;
      const notifRaw = localStorage.getItem(notifKey);
      if (notifRaw) {
        try {
          const notifData = JSON.parse(notifRaw);
          // Se for array de ids ou objeto, filtra entradas do pedido excluído
          if (Array.isArray(notifData)) {
            const filtered = notifData.filter(id =>
              !String(id).includes(String(orderId)) &&
              !(supabaseId && String(id).includes(String(supabaseId)))
            );
            localStorage.setItem(notifKey, JSON.stringify(filtered));
          }
        } catch (_) {}
      }
    } catch (e) {
      console.warn('[DeleteCascade] Aviso ao limpar localStorage:', e.message);
    }
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
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  function _getJWT() {
    // CORREÇÃO: NUNCA retorna anon key como fallback.
    // Chamadores aguardam Session.ready() antes de chamar _getJWT(),
    // então o JWT real sempre estará disponível quando esta função for chamada.
    // Retorna null se sem sessão — chamador deve abortar o fetch.
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    if (user && user.jwt) return user.jwt;
    if (typeof Session !== 'undefined' && Session.getAccessToken) {
      var token = Session.getAccessToken();
      if (token) return token;
    }
    return null; // PROIBIDO fallback anon key — sem JWT = sem fetch
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
      const jwt = _getJWT();
      if (!jwt) {
        console.error('[OrdersAdmin] _patchStatus: sem JWT — abortado.');
        if (typeof showToast === 'function') showToast('Sessão inválida. Faça login novamente.', 'error');
        return;
      }
      const res = await fetch(
        `${window.SUPABASE_URL}/rest/v1/pedidos?id=eq.${supabaseId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        window.SUPABASE_KEY,
            'Authorization': 'Bearer ' + jwt,
            'Prefer':        'return=minimal',
          },
          body: JSON.stringify({ status_v3: newStatus }),
        }
      );
      if (!res.ok) throw new Error('HTTP ' + res.status);
      if (typeof pedidosCarregar === 'function') pedidosCarregar();
    } catch (e) {
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
          body: JSON.stringify({
            user_id:    userId,         // DESTINATÁRIO: dono do pedido, não o admin
            pedido_id:  Number(supabaseOrderId),
            type:       type,
            title:      title,
            message:    message,
            read:       false,
            created_at: new Date().toISOString(),
          }),
        }
      );
    } catch (e) {
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