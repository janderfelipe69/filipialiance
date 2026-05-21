// ============================================================
// delivery-system.js — Sistema de Entregas
// PokeAlliance Shop
//
// DEPENDÊNCIAS: supabase-client.js, session.js
// ============================================================

;(function (global) {
  'use strict';

  const SB_URL = global.SUPABASE_URL || '';
  const SB_KEY = global.SUPABASE_KEY || '';
  const TABLE  = 'delivery_proofs';   // ← tabela real no Supabase

  // ══════════════════════════════════════════════════════════
  // HELPERS INTERNOS
  // ══════════════════════════════════════════════════════════

  /** Monta headers padrão para REST API Supabase */
  function _headers(jwt) {
    const h = {
      'Content-Type':  'application/json',
      'apikey':        SB_KEY,
      'Authorization': 'Bearer ' + (jwt || SB_KEY),
    };
    return h;
  }

  /** Atalho para o toast global (não bloqueia se ausente) */
  function _toast(msg, type, duration) {
    try {
      if (typeof showToast === 'function') showToast(msg, type, duration);
    } catch (_) {}
  }

  // ══════════════════════════════════════════════════════════
  // DeliveryDB — CRUD na tabela delivery_proofs
  // ══════════════════════════════════════════════════════════
  const DeliveryDB = {

    /**
     * Insere um registro de entrega.
     * Garante que todos os campos necessários sejam enviados.
     * Se algum campo vier null, tenta buscar do pedido original antes de inserir.
     */
    async insert(payload) {
      const jwt = await _ensureValidSession();

      // [PayloadSanitize] Usa camada centralizada — remove todos os campos PT legados
      // antes de qualquer acesso. Idempotente e seguro para qualquer formato.
      const _safe = typeof sanitizeDeliveryPayload === 'function' ? sanitizeDeliveryPayload : (p => p);
      payload = _safe(payload);
      const svcName  = payload.service_name || null;
      const pkName   = payload.pokemon_name || null;
      const svcType  = payload.service_type || null;

      // Resolve campos ausentes buscando o pedido original (fallback)
      let extraData = {};
      if (payload.pedido_id && (!svcName || !pkName || !svcType)) {
        try {
          const res = await fetch(
            `${SB_URL}/rest/v1/pedidos?id=eq.${payload.pedido_id}&select=service_name,pokemon_name,service_type,nick,nick_jogo,itens,service_quantity,created_at&limit=1`,
            { headers: _headers(jwt) }
          );
          if (res.ok) {
            const rows = await res.json();
            if (rows && rows[0]) {
              extraData = rows[0];
            }
          }
        } catch (e) {
        }
      }

      // image_url é URL externa direta (Imgur) — salvo direto, sem uploads
      const imageUrl = payload.image_url || null;

      // Resolve item_name e quantity a partir de items[] ou campos diretos
      const _resolveItems = (p, extra) => {
        // Prioridade: payload.item_name > items[0].name > extraData.itens
        if (p.item_name) return { item_name: p.item_name, quantity: p.quantity || 1 };
        const items = p.items || (extra.itens ? (() => { try { return typeof extra.itens === 'string' ? JSON.parse(extra.itens) : extra.itens; } catch(_) { return []; } })() : []);
        if (items && items.length) {
          return {
            item_name: items.map(i => i.nome || i.name || '').filter(Boolean).join(', ') || null,
            quantity:  items.reduce((s, i) => s + parseInt(i.quantidade || i.qty || i.qtdTotal || 1, 10), 0),
          };
        }
        return { item_name: p.item_name || null, quantity: p.quantity || extra.service_quantity || null };
      };
      const { item_name, quantity } = _resolveItems(payload, extraData);

      // player_name = nick do jogador (nick_jogo no banco)
      const playerName = payload.player_name || payload.cliente_nick || extraData.nick_jogo || extraData.nick || null;

      // order_created_at = created_at do pedido original (para calcular tempo total)
      const orderCreatedAt = payload.order_created_at || extraData.created_at || null;

      // delivered_at = momento da entrega
      const deliveredAt = payload.concluido_at || new Date().toISOString();

      // [SchemaAudit] Colunas reais de delivery_proofs — SOMENTE nomes EN canônicos.
      const row = {
        order_id:         payload.pedido_id                          || null,
        service_name:     svcName  || extraData.service_name         || null,
        pokemon_name:     pkName   || extraData.pokemon_name         || null,
        service_type:     svcType  || extraData.service_type         || null,
        item_name:        item_name,
        quantity:         quantity,
        player_name:      playerName,
        image_url:        imageUrl,
        delivered_by:     payload.user_id || _getCurrentUserId()     || null,
        cliente_nick:     payload.cliente_nick || extraData.nick      || null,
        descricao:        payload.descricao                           || null,
        order_created_at: orderCreatedAt,
        created_at:       deliveredAt,
        delivered_at:     deliveredAt,
      };


      const res = await fetch(`${SB_URL}/rest/v1/${TABLE}`, {
        method:  'POST',
        headers: { ..._headers(jwt), 'Prefer': 'return=representation' },
        body:    JSON.stringify(row),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        // [SchemaAudit] Log detalhado do erro de schema
        if (e.message && e.message.includes('does not exist')) {
        }
        throw new Error(e.message || e.error || `Erro ao salvar entrega (HTTP ${res.status})`);
      }

      const result = await res.json().catch(() => []);
      return result;
    },

    /**
     * Lista entregas ordenadas por data (mais recentes primeiro).
     * Traz todos os campos necessários para os cards.
     */
    async list(limit = 200) {
      const jwt = await _getSessionToken();

      if (!jwt) {
        return [];
      }

      // [SchemaAudit] Usa introspecção assíncrona do schema real.
      // SchemaCompat.resolveSelect() faz SELECT * limit=1 no primeiro call,
      // lê as colunas reais e cruza com DESIRED_COLUMNS.
      // Nunca usa colunas hardcoded — nunca inclui status/concluido_at (delivered_at agora é coluna real).
      let _selectCols;
      if (typeof SchemaCompat !== 'undefined' && typeof SchemaCompat.resolveSelect === 'function') {
        _selectCols = await SchemaCompat.resolveSelect();
      } else {
        // Fallback estritamente mínimo — sem nenhuma coluna com histórico de HTTP 400.
        // NÃO inclui: status, concluido_at, servico_nome, pokemon_nome, tipo_pedido (delivered_at reabilitada)
        _selectCols = 'id,order_id,service_name,pokemon_name,service_type,item_name,quantity,player_name,image_url,cliente_nick,delivered_by,created_at,delivered_at,order_created_at,descricao';
      }

      const url = `${SB_URL}/rest/v1/${TABLE}` +
        `?select=${_selectCols}` +
        `&order=created_at.desc` +
        `&limit=${limit}`;


      const res = await fetch(url, { headers: _headers(jwt) });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        const msg = e.message || e.error || `Erro ao carregar entregas (HTTP ${res.status})`;
        // [SchemaAudit] Guard: detecta coluna inexistente
        if (e.message && e.message.includes('does not exist')) {
          const colMatch = e.message.match(/column\s+["']?(\S+?)["']?\s+does not exist/i);
          if (colMatch) {
            const badCol = colMatch[1].replace(/^delivery_proofs\./, '');
            // Invalida cache para forçar re-introspecção na próxima chamada
            if (typeof SchemaCompat !== 'undefined') SchemaCompat._resetCache && SchemaCompat._resetCache();
          }
        }
        return [];
      }

      const rows = await res.json();

      if (!rows.length) {
      }

      // image_url é URL direta — normaliza apenas para garantir compatibilidade com
      // registros legados que possam ter prints no formato antigo
      rows.forEach(row => {
        if (!row.image_url && Array.isArray(row.prints) && row.prints[0]?.url) {
          row.image_url = row.prints[0].url;
        }
        // Garante prints como array vazio se vier como string/null
        if (!Array.isArray(row.prints)) row.prints = [];
      });

      return rows;
    },

    /**
     * Remove uma entrega pelo ID em cascata (apenas admins devem chamar).
     * Ordem: delivery_history → delivery_proofs → pedidos
     */
    async delete(id) {
      const jwt = await _ensureValidSession();

      // Busca order_id da entrega antes de deletar
      const proofRes = await fetch(`${SB_URL}/rest/v1/${TABLE}?id=eq.${id}&select=order_id`, {
        headers: _headers(jwt),
      });
      const proofRows = proofRes.ok ? await proofRes.json().catch(() => []) : [];
      const orderId = proofRows?.[0]?.order_id || null;

      // 1. delete delivery_history where order_id = X
      if (orderId) {
        const r1 = await fetch(`${SB_URL}/rest/v1/delivery_history?order_id=eq.${orderId}`, {
          method:  'DELETE',
          headers: { ..._headers(jwt), 'Prefer': 'return=minimal' },
        });
        if (!r1.ok) {
          const e = await r1.json().catch(() => ({}));
          console.error('[Entrega] Erro ao remover delivery_history:', e.message || r1.status);
        }
      }

      // 2. delete delivery_proofs where id = X (e opcionalmente order_id = X)
      const r2 = await fetch(`${SB_URL}/rest/v1/${TABLE}?id=eq.${id}`, {
        method:  'DELETE',
        headers: { ..._headers(jwt), 'Prefer': 'return=minimal' },
      });
      if (!r2.ok) {
        const e = await r2.json().catch(() => ({}));
        throw new Error(e.message || `Erro ao remover entrega (HTTP ${r2.status})`);
      }

      // 3. Se não há mais provas para o pedido, remove captures e o pedido também
      if (orderId) {
        const remaining = await fetch(
          `${SB_URL}/rest/v1/${TABLE}?order_id=eq.${orderId}&select=id&limit=1`,
          { headers: _headers(jwt) }
        );
        const rem = remaining.ok ? await remaining.json().catch(() => []) : [];
        if (!rem.length) {
          // delete captures where order_id = X
          const r3 = await fetch(`${SB_URL}/rest/v1/captures?order_id=eq.${orderId}`, {
            method:  'DELETE',
            headers: { ..._headers(jwt), 'Prefer': 'return=minimal' },
          });
          if (!r3.ok) {
            const e = await r3.json().catch(() => ({}));
            console.error('[Entrega] Erro ao remover captures:', e.message || r3.status);
          }
        }
      }
    },
  };

  // ══════════════════════════════════════════════════════════
  // AUTH HELPERS
  // ══════════════════════════════════════════════════════════

  /**
   * Aguarda Session.ready() e retorna o access token atual.
   * NUNCA lê localStorage diretamente — sempre via Session.
   * Tem try/catch para absorver qualquer rejeição do Session.ready().
   */
  async function _getSessionToken() {
    try {
      if (typeof Session !== 'undefined' && typeof Session.ready === 'function') {
        await Session.ready();
      }
    } catch (readyErr) {
      // Session.ready() rejeitou — Session v3 garante que isso nunca acontece,
      // mas mantemos o catch por segurança defensiva.
      console.error('[Entrega] ❌ Session.ready() rejeitou (bug inesperado):', readyErr.message);
    }

    if (typeof Session !== 'undefined' && typeof Session.getAccessToken === 'function') {
      const token = Session.getAccessToken();
      if (token) return token;
    }

    return null;
  }

  /**
   * Garante sessão válida antes de operações autenticadas.
   * Delega refresh ao Session.forceRefresh() se necessário.
   */
  async function _ensureValidSession() {
    const token = await _getSessionToken();
    if (!token) {
      console.error('[Entrega] ❌ _ensureValidSession: sem token. Usuário não está logado.');
      throw new Error('Você precisa estar logado para registrar uma entrega. Faça login e tente novamente.');
    }
    return token;
  }

  function _getCurrentUserId() {
    try {
      if (typeof Session !== 'undefined' && typeof Session.getCurrentUser === 'function') {
        return Session.getCurrentUser()?.id || null;
      }
    } catch (_) {}
    return null;
  }


  // ══════════════════════════════════════════════════════════
  // DeliveryAdmin — modal comprovante
  // ══════════════════════════════════════════════════════════
  const DeliveryAdmin = {

    _imgurLink:  '',
    _submitting: false,

    openModal(supabaseOrderId, orderData) {
      DeliveryAdmin._imgurLink  = '';
      DeliveryAdmin._submitting = false;

      const existing = document.getElementById('da-modal-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'da-modal-overlay';
      overlay.innerHTML = DeliveryAdmin._buildModalHTML(supabaseOrderId, orderData);
      document.body.appendChild(overlay);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) DeliveryAdmin.closeModal();
      });

      requestAnimationFrame(() => overlay.classList.add('da-open'));
    },

    closeModal() {
      const el = document.getElementById('da-modal-overlay');
      if (!el) return;
      el.classList.remove('da-open');
      setTimeout(() => el.remove(), 280);
    },

    _buildModalHTML(orderId, orderData) {
      // [DELIVERY_MODAL] logs temporários de diagnóstico

      // Normaliza: suporte a campos EN canônicos e aliases PT
      const normalized = {
        nick:    orderData?.nick         || orderData?.nickname      || '—',
        service: orderData?.service      || orderData?.service_name  || orderData?.servico_nome  || '—',
        pokemon: orderData?.pokemon      || orderData?.pokemon_name  || orderData?.pokemon_nome  || '—',
        tipo:    orderData?.tipo         || orderData?.service_type  || orderData?.tipo_pedido   || '—',
        created_at: orderData?.created_at || orderData?.createdAt    || null,
      };

      const nick    = normalized.nick;
      const service = normalized.service;
      const pokemon = normalized.pokemon;
      const tipo    = normalized.tipo;

      // Tempo desde created_at
      let tempoStr = '—';
      if (normalized.created_at) {
        try {
          const diffMs  = Date.now() - new Date(normalized.created_at).getTime();
          const diffMin = Math.floor(diffMs / 60000);
          const diffH   = Math.floor(diffMin / 60);
          const diffD   = Math.floor(diffH / 24);
          if (diffD > 0)       tempoStr = `${diffD}d ${diffH % 24}h atrás`;
          else if (diffH > 0)  tempoStr = `${diffH}h ${diffMin % 60}min atrás`;
          else if (diffMin > 0) tempoStr = `${diffMin}min atrás`;
          else                 tempoStr = 'agora mesmo';
        } catch (_) { tempoStr = '—'; }
      }

      return `
        <div class="da-modal" id="da-modal">
          <div class="da-modal-header">
            <div class="da-modal-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a8cff" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              COMPROVANTE DE ENTREGA
            </div>
            <button class="da-modal-close" onclick="DeliveryAdmin.closeModal()">✕</button>
          </div>

          <div class="da-modal-meta">
            <span class="da-meta-chip">Pedido #${orderId}</span>
            <span class="da-meta-chip da-chip-green">✓ Pronto p/ concluir</span>
            <span class="da-meta-chip">${nick}</span>
          </div>

          <div class="da-modal-info">
            <div class="da-info-row"><span>Serviço</span><strong>${service}</strong></div>
            <div class="da-info-row"><span>Pokémon</span><strong>${pokemon}</strong></div>
            <div class="da-info-row"><span>Tipo</span><strong>${tipo}</strong></div>
            <div class="da-info-row"><span>Pedido feito</span><strong>${tempoStr}</strong></div>
          </div>

          <div class="da-imgur-field">
            <label class="da-imgur-label" for="da-imgur-input">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              Link da imagem (URL direta)
            </label>
            <input
              type="text"
              id="da-imgur-input"
              class="da-imgur-input"
              placeholder="https://i.imgur.com/abc123.png"
              oninput="DeliveryAdmin._onImgurInput(this.value)"
              autocomplete="off"
              spellcheck="false"
            >
            <div id="da-url-error" class="da-url-error" style="display:none"></div>
            <div class="da-imgur-preview-wrap" id="da-imgur-preview-wrap" style="display:none">
              <img id="da-imgur-preview-img" src="" alt="Preview" class="da-imgur-preview-img">
            </div>
          </div>

          <div class="da-progress-bar-wrap" id="da-progress-wrap" style="display:none">
            <div class="da-progress-bar">
              <div class="da-progress-fill" id="da-progress-fill"></div>
            </div>
            <div class="da-progress-label" id="da-progress-label">Enviando…</div>
          </div>

          <div id="da-error-banner" style="display:none" class="da-error-banner"></div>

          <div class="da-modal-footer">
            <button class="da-btn da-btn-cancel" onclick="DeliveryAdmin.closeModal()">Cancelar</button>
            <button class="da-btn da-btn-submit" id="da-submit-btn"
              data-order-id="${orderId}"
              data-order-data="${encodeURIComponent(JSON.stringify(orderData || {}))}"
              onclick="DeliveryAdmin._submit(this)"
              disabled>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              REGISTRAR ENTREGA
            </button>
          </div>
        </div>
      `;
    },

    _showError(msg) {
      const banner = document.getElementById('da-error-banner');
      if (banner) {
        banner.textContent = '⚠️ ' + msg;
        banner.style.display = 'block';
        setTimeout(() => { if (banner) banner.style.display = 'none'; }, 7000);
      }
      console.error('[Entrega] ❌', msg);
    },

    // ── Campo de link Imgur ──────────────────────────────────
    _onImgurInput(value) {
      const trimmed = value.trim();
      DeliveryAdmin._imgurLink = trimmed;

      const btn     = document.getElementById('da-submit-btn');
      const preview = document.getElementById('da-imgur-preview-wrap');
      const img     = document.getElementById('da-imgur-preview-img');
      const errEl   = document.getElementById('da-url-error');
      const inputEl = document.getElementById('da-imgur-input');

      // ── Validação ────────────────────────────────────────────
      const IMGUR_HOST = /^https?:\/\/(i\.)?imgur\.com\//i;
      const VALID_EXT  = /\.(png|jpe?g|webp|gif)(\?.*)?$/i;

      let errorMsg = null;

      if (trimmed === '') {
        errorMsg = null;
      } else if (!IMGUR_HOST.test(trimmed)) {
        errorMsg = 'Use um link do Imgur — imgur.com ou i.imgur.com';
      } else if (!VALID_EXT.test(trimmed)) {
        errorMsg = 'Extensão inválida. Use: .png · .jpg · .jpeg · .webp · .gif';
      }

      const isValid = trimmed !== '' && errorMsg === null;

      // ── Feedback no input ────────────────────────────────────
      if (inputEl) {
        inputEl.classList.toggle('da-imgur-input--error', !isValid && trimmed !== '');
        inputEl.classList.toggle('da-imgur-input--valid', isValid);
      }

      // ── Mensagem de erro inline ──────────────────────────────
      if (errEl) {
        if (errorMsg) {
          errEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' + errorMsg;
          errEl.style.display = 'flex';
        } else {
          errEl.style.display = 'none';
        }
      }

      // ── Botão e preview ──────────────────────────────────────
      if (btn) btn.disabled = !isValid;

      if (preview && img) {
        if (isValid) {
          img.src = trimmed;
          preview.style.display = 'block';
        } else {
          preview.style.display = 'none';
          img.src = '';
        }
      }
    },

    // ── Submit: fluxo completo ponta a ponta ─────────────────
    async _submit(btn) {
      if (DeliveryAdmin._submitting) {
        return;
      }

      const orderId   = btn.dataset.orderId;
      const orderData = JSON.parse(decodeURIComponent(btn.dataset.orderData || '{}'));
      const imgurLink = DeliveryAdmin._imgurLink;

      if (!imgurLink) {
        DeliveryAdmin._showError('Insira o link da imagem antes de registrar.');
        return;
      }
      if (!orderId) {
        console.error('[Entrega] orderId ausente no botão.');
        return;
      }

      // ── PRÉ-VALIDAÇÃO DE SESSÃO (antes de bloquear UI) ────
      let sessionOk = false;
      try {
        await _ensureValidSession();
        sessionOk = true;
      } catch (sessionErr) {
        DeliveryAdmin._showError(sessionErr.message);
        _toast(sessionErr.message, 'error');
        return; // Não prossegue sem sessão válida
      }

      DeliveryAdmin._submitting = true;
      btn.disabled = true;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:da-spin 1s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Enviando…`;

      const progressWrap = document.getElementById('da-progress-wrap');
      const progressFill = document.getElementById('da-progress-fill');
      const progressLbl  = document.getElementById('da-progress-label');

      if (progressWrap) progressWrap.style.display = 'block';

      try {
        // ── PASSO 1: Salvar image_url (link Imgur) ────────────

        if (progressFill) progressFill.style.width = '65%';

        // ── PASSO 2: INSERT em delivery_proofs ───────────────
        const payload = {
          pedido_id:        Number(orderId),
          user_id:          _getCurrentUserId(),
          image_url:        imgurLink,
          descricao:        null,
          cliente_nick:     orderData?.nick         || null,
          player_name:      orderData?.player_name  || orderData?.nick || null,
          service_name:     orderData?.service      || null,
          pokemon_name:     orderData?.pokemon      || null,
          service_type:     orderData?.tipo         || null,
          item_name:        orderData?.item_name    || null,
          quantity:         orderData?.quantity     || null,
          order_created_at: orderData?.created_at   || null,
          concluido_at:     new Date().toISOString(),
        };
        await DeliveryDB.insert(payload);

        if (progressFill) progressFill.style.width = '75%';

        // ── PASSO 3: UPDATE pedidos → status = 'concluido' ──
        await DeliveryAdmin._updatePedidoStatus(orderId);

        if (progressFill) progressFill.style.width = '88%';

        // ── PASSO 4: Notificação para o cliente ──────────────
        await DeliveryAdmin._createClientNotification(orderId, 'Seu pedido foi concluído!');

        if (progressFill) progressFill.style.width = '100%';
        if (progressLbl)  progressLbl.textContent = '✅ Entrega registrada!';

        // ── PASSO 5: Fechar + toast + atualizar fila ─────────
        DeliveryAdmin._imgurLink  = '';
        DeliveryAdmin._submitting = false;

        setTimeout(() => {
          DeliveryAdmin.closeModal();

          _toast('✅ Entrega registrada com sucesso!', 'concluido', 4000);

          // Atualiza a lista de pedidos (remove da fila)
          if (typeof pedidosCarregar === 'function') {
            pedidosCarregar();
          } else if (typeof OrdersUI !== 'undefined' && typeof OrdersUI.render === 'function') {
            OrdersUI.render();
          } else if (typeof window.OrdersKanban !== 'undefined' && typeof OrdersKanban.refresh === 'function') {
            OrdersKanban.refresh();
          }

          // Atualiza galeria se ativa
          if (window.DeliveryGallery && typeof DeliveryGallery.refresh === 'function') {
            DeliveryGallery.refresh();
          }

        }, 900);

      } catch (err) {
        console.error('[Entrega] ❌ Erro durante o fluxo de entrega:', err);
        if (progressLbl) progressLbl.textContent = '❌ ' + err.message;
        DeliveryAdmin._showError(err.message);
        DeliveryAdmin._submitting = false;
        btn.disabled = false;
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> REGISTRAR ENTREGA`;
      }
    },

    // ── Passo 3: atualiza status do pedido ──────────────────
    async _updatePedidoStatus(orderId) {
      const jwt = await _ensureValidSession();
      const url = `${SB_URL}/rest/v1/pedidos?id=eq.${orderId}`;
      const res = await fetch(url, {
        method:  'PATCH',
        headers: { ..._headers(jwt), 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          status:       'concluido',
          completed_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        console.error('[Entrega] ❌ Erro UPDATE pedidos:', { status: res.status, message: e.message, orderId });
        throw new Error(e.message || `Erro ao atualizar pedido (HTTP ${res.status})`);
      }
    },

    // ── Passo 4: notificação para o cliente ─────────────────
    async _createClientNotification(orderId, message) {
      try {
        const jwt = await _getSessionToken();

        const orderRes = await fetch(
          `${SB_URL}/rest/v1/pedidos?id=eq.${orderId}&select=user_id&limit=1`,
          { headers: _headers(jwt) }
        );
        if (!orderRes.ok) return;
        const orders = await orderRes.json();
        const userId = orders?.[0]?.user_id;
        if (!userId) return;

        await fetch(`${SB_URL}/rest/v1/notifications`, {
          method:  'POST',
          headers: { ..._headers(jwt), 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            user_id:    userId,
            pedido_id:  Number(orderId),
            type:       'concluido',
            title:      'Pedido concluído',
            message:    message || 'Seu pedido foi concluído!',
            read:       false,
            created_at: new Date().toISOString(),
          }),
        });
      } catch (e) {
        // Não bloqueia o fluxo principal se notificação falhar
      }
    },
  };

  // ══════════════════════════════════════════════════════════
  // DeliveryGallery — aba Entregas, grid moderna, lightbox
  // ══════════════════════════════════════════════════════════
  const DeliveryGallery = {
    _data:        [],
    _lightboxIdx: 0,
    _lightboxAll: [],
    _loaded:      false,


    async init() {
      const container = document.getElementById('tab-entregas');
      if (!container) return;

      container.innerHTML = DeliveryGallery._buildShell();
      DeliveryGallery._injectStyles();
      await DeliveryGallery.refresh();

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape')      DeliveryGallery.closeLightbox();
        if (e.key === 'ArrowRight')  DeliveryGallery.navLightbox(1);
        if (e.key === 'ArrowLeft')   DeliveryGallery.navLightbox(-1);
      });
    },

    async refresh() {
      const grid = document.getElementById('dg-grid');
      if (!grid) return;

      grid.innerHTML = DeliveryGallery._buildSkeletons(6);

      try {
        const data = await DeliveryDB.list(200);
        // Normaliza cada registro: resolve variantes de nomes de coluna e formato de prints
        DeliveryGallery._data   = (data || []).map(e => DeliveryGallery._normalizeEntry(e));
        DeliveryGallery._loaded = true;
        DeliveryGallery._render();
      } catch (err) {
        grid.innerHTML = `
          <div class="dg-error">
            <div class="dg-error-icon">⚠️</div>
            <div>Erro ao carregar entregas</div>
            <div class="dg-error-sub">${err.message}</div>
            <button class="dg-retry-btn" onclick="DeliveryGallery.refresh()">Tentar novamente</button>
          </div>`;
      }
    },

    // ── Normaliza um registro vindo do Supabase ──────────────────────────────
    // [DataNormalize] Delegado para normalizeDeliveryProof() (schema-compat.js)
    _normalizeEntry(entry) {
      if (!entry || entry._normalized) return entry;
      if (typeof normalizeDeliveryProof === 'function') {
        const normalized = normalizeDeliveryProof(entry);
        Object.assign(entry, normalized);
        return entry;
      }
      entry._normalized = true; entry._partial = true;
      return entry;
    },

    _render() {
      const grid    = document.getElementById('dg-grid');
      const countEl = document.getElementById('dg-count');
      const data    = DeliveryGallery._data;

      if (countEl) countEl.textContent = `${data.length} ${data.length === 1 ? 'entrega' : 'entregas'}`;

      if (!data.length) {
        grid.innerHTML = `
          <div class="dg-empty">
            <div class="dg-empty-icon">📦</div>
            <div class="dg-empty-title">Nenhuma entrega registrada</div>
            <div class="dg-empty-sub">As entregas concluídas aparecerão aqui com seus comprovantes.</div>
          </div>`;
        return;
      }

      DeliveryGallery._lightboxAll = [];
      data.forEach(entry => {
        // entry já foi normalizado em refresh(); _normalizeEntry é idempotente
        DeliveryGallery._normalizeEntry(entry);

        const nick    = entry.cliente_nick || '';

        // Monta lightbox a partir de image_url (URL direta — fonte única de verdade)
        if (entry.image_url) {
          const currentUser = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
          const fakeOrder = {
            nickname: nick, cliente_nick: nick,
            userId: entry.user_id, user_id: entry.user_id, id: entry.id,
            // Campos necessários para formatPublicOrderTitle
            items:        entry._items     || [],
            service_type: entry.service_type || '',
            service_name: entry.service_name || '',
          };
          const maskedNick = typeof QueuePrivacy !== 'undefined'
            ? QueuePrivacy.maskNickSimple(fakeOrder, currentUser)
            : nick;
          // Título público: usa getPublicOrderLabel (função canônica de privacidade)
          let pubTitle;
          if (typeof QueuePrivacy !== 'undefined' && typeof QueuePrivacy.getPublicOrderLabel === 'function') {
            pubTitle = QueuePrivacy.getPublicOrderLabel(fakeOrder, currentUser).label;
          } else {
            pubTitle = entry.pokemon_name || entry.service_name || entry.item_name || 'Entrega';
          }
          DeliveryGallery._lightboxAll.push({
            url:     entry.image_url,
            caption: `${pubTitle} ${maskedNick ? '• ' + maskedNick : ''}`.trim(),
          });
        }
      });

      grid.innerHTML = '';
      const isAdmin = typeof Session !== 'undefined' && Session.isAdmin();

      data.forEach((entry, idx) => {
        // [PartialRender] Error boundary por card — falha de um não destrói a lista
        const _wrapEB = typeof wrapWithErrorBoundary === 'function'
          ? wrapWithErrorBoundary
          : (fn, fb) => { try { return fn(); } catch(e) { if(fb) fb(e); return null; } };

        _wrapEB(
          () => {
            const card = DeliveryGallery._buildCard(entry, idx, isAdmin);
            grid.appendChild(card);
          },
          (err) => {
            const _rp = typeof renderPartialCard === 'function'
              ? renderPartialCard
              : (c, r) => { const d = document.createElement('div'); d.className='dg-card dg-card--partial'; d.textContent='dados incompletos'; c.appendChild(d); };
            _rp(grid, entry, err);
          },
          'card #' + idx
        );
      });

    },

    _buildCard(entry, idx, isAdmin) {
      // Garante normalização (idempotente)
      DeliveryGallery._normalizeEntry(entry);

      const NA = 'Informação indisponível';
      const _v = (v) => (v && String(v).trim()) ? String(v).trim() : null;

      // ── Campos do card ─────────────────────────────────────────────
      const mainImg     = _v(entry.image_url);
      const playerName  = _v(entry.player_name) || _v(entry.cliente_nick);
      const servicoNome = _v(entry.service_name);
      const tipoPedido  = _v(entry.service_type);
      const pokemonNome = _v(entry.pokemon_name);
      const itemNome    = _v(entry.item_name);
      const quantity    = entry.quantity ? parseInt(entry.quantity, 10) : null;

      // ── O que foi entregue: pokemon OU item+qty ────────────────────
      // Detecta tipo pelo service_type ou pela presença dos campos
      const isPokemon = tipoPedido && tipoPedido.toLowerCase().includes('pokemon');
      const hasItem   = !!itemNome;
      const hasPokemon = !!pokemonNome;

      // Monta fakeOrder para formatPublicOrderTitle
      const _fakeOrderForTitle = {
        nickname:     entry.cliente_nick || '',
        user_id:      entry.user_id,
        userId:       entry.user_id,
        id:           entry.id,
        service_type: tipoPedido || '',
        service_name: servicoNome || '',
        items: pokemonNome
          ? [{ type: 'capture', pokemon: pokemonNome, name: pokemonNome, tier: '' }]
          : (itemNome ? [{ name: itemNome, qtdTotal: quantity || 1 }] : []),
      };
      const _currentUser = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;

      // Usa getPublicOrderLabel (função canônica) para decidir o que exibir.
      // Admin vê título real; cliente vê título mascarado por tipo.
      let entregaLabel = null;
      if (typeof QueuePrivacy !== 'undefined' && typeof QueuePrivacy.getPublicOrderLabel === 'function') {
        entregaLabel = QueuePrivacy.getPublicOrderLabel(_fakeOrderForTitle, _currentUser, isAdmin).label;
      } else if (isAdmin) {
        // Fallback legado para admin
        if (isPokemon || hasPokemon) {
          entregaLabel = pokemonNome || NA;
        } else if (hasItem) {
          entregaLabel = quantity && quantity > 1 ? `${itemNome} ×${quantity}` : itemNome;
        } else {
          entregaLabel = servicoNome || NA;
        }
      } else {
        entregaLabel = servicoNome || NA;
      }

      // ── Datas ──────────────────────────────────────────────────────
      const deliveredAt  = _v(entry.delivered_at) || _v(entry.created_at);
      const orderCreated = _v(entry.order_created_at);

      const fmtDate = (iso) => {
        if (!iso) return NA;
        try {
          return new Date(iso).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });
        } catch(_) { return NA; }
      };

      // ── Tempo total do pedido ──────────────────────────────────────
      const _calcTempo = (start, end) => {
        if (!start || !end) return null;
        try {
          const ms   = new Date(end).getTime() - new Date(start).getTime();
          if (ms < 0) return null;
          const min  = Math.floor(ms / 60000);
          const h    = Math.floor(min / 60);
          const d    = Math.floor(h / 24);
          if (d > 0)       return `${d}d ${h % 24}h`;
          if (h > 0)       return `${h}h ${min % 60}min`;
          if (min > 0)     return `${min}min`;
          return '< 1min';
        } catch(_) { return null; }
      };
      const tempoTotal  = _calcTempo(orderCreated, deliveredAt);
      const dataEntrega = fmtDate(deliveredAt);

      // ── nick mascarado ─────────────────────────────────────────────
      const _maskedNick = (() => {
        if (!playerName) return NA;
        if (typeof QueuePrivacy === 'undefined') return playerName;
        const currentUser = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
        const fakeOrder = { nickname: playerName, cliente_nick: playerName, userId: entry.user_id, user_id: entry.user_id, id: entry.id };
        return QueuePrivacy.maskNickSimple(fakeOrder, currentUser) || playerName;
      })();

      const mainLbIdx = DeliveryGallery._getLightboxIndex(entry);
      const deleteBtnHTML = isAdmin
        ? `<button class="dg-card-delete" onclick="DeliveryGallery._deleteEntry('${entry.id}', event)" title="Remover entrega">🗑</button>`
        : '';

      // ── tipo chip ──────────────────────────────────────────────────
      const tipoChip = tipoPedido
        ? `<span class="dg-card-type">${tipoPedido}</span>`
        : '';

      // ── ícone do que foi entregue ──────────────────────────────────
      const entregaIcon = (isPokemon || hasPokemon) ? '⚡' : (hasItem ? '📦' : '🎁');

      const el = document.createElement('div');
      el.className = 'dg-card';
      el.innerHTML = `
        <div class="dg-card-img-wrap" onclick="DeliveryGallery.openLightbox(${mainLbIdx})">
          ${mainImg
            ? `<img class="dg-card-img" src="${mainImg}" alt="Comprovante de entrega">`
            : `<div class="dg-card-img-placeholder">📷</div>`
          }
          <div class="dg-card-overlay"><div class="dg-card-overlay-icon">🔍</div></div>
          ${deleteBtnHTML}
        </div>

        <div class="dg-card-body">

          <div class="dg-card-player">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            ${_maskedNick}
          </div>

          <div class="dg-card-entrega">
            <span class="dg-entrega-icon">${entregaIcon}</span>
            <span class="dg-entrega-nome">${entregaLabel}</span>
          </div>

          <div class="dg-card-chips">
            ${tipoChip}
            ${servicoNome && servicoNome !== entregaLabel
              ? `<span class="dg-card-service-chip">${servicoNome}</span>`
              : ''}
          </div>

          <div class="dg-card-meta">
            <div class="dg-meta-item" title="Data de entrega">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${dataEntrega}
            </div>
            ${tempoTotal ? `
            <div class="dg-meta-item dg-meta-tempo" title="Tempo total do pedido">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${tempoTotal}
            </div>` : ''}
          </div>

          <div class="dg-card-status">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            ENTREGUE
          </div>
        </div>
      `;

      return el;
    },

    _getLightboxIndex(entry) {
      const all = DeliveryGallery._lightboxAll;
      const url = entry.image_url || null;
      if (!url) return 0;
      return Math.max(0, all.findIndex(x => x.url === url));
    },

    openLightbox(idx) {
      const all = DeliveryGallery._lightboxAll;
      if (!all.length) return;
      DeliveryGallery._lightboxIdx = Math.max(0, Math.min(idx, all.length - 1));
      DeliveryGallery._renderLightbox();
      const lb = document.getElementById('dg-lightbox');
      if (lb) { lb.classList.add('dg-lb-open'); document.body.style.overflow = 'hidden'; }
    },

    closeLightbox() {
      const lb = document.getElementById('dg-lightbox');
      if (lb) { lb.classList.remove('dg-lb-open'); document.body.style.overflow = ''; }
    },

    navLightbox(dir) {
      const all = DeliveryGallery._lightboxAll;
      if (!all.length) return;
      DeliveryGallery._lightboxIdx = (DeliveryGallery._lightboxIdx + dir + all.length) % all.length;
      DeliveryGallery._renderLightbox();
    },

    _renderLightbox() {
      const all       = DeliveryGallery._lightboxAll;
      const item      = all[DeliveryGallery._lightboxIdx];
      const imgEl     = document.getElementById('dg-lb-img');
      const capEl     = document.getElementById('dg-lb-caption');
      const counterEl = document.getElementById('dg-lb-counter');
      if (!item) return;
      if (imgEl)     { imgEl.src = ''; imgEl.classList.remove('dg-lb-img-loaded'); imgEl.src = item.url; imgEl.onload = () => imgEl.classList.add('dg-lb-img-loaded'); }
      if (capEl)     capEl.textContent     = item.caption || '';
      if (counterEl) counterEl.textContent = `${DeliveryGallery._lightboxIdx + 1} / ${all.length}`;
    },

    async _deleteEntry(id, e) {
      if (e) e.stopPropagation();
      const confirmed = await showConfirmModal({ title: 'Remover Entrega', message: 'Remover este registro de entrega?', confirmText: 'Remover', cancelText: 'Cancelar', type: 'danger' });
      if (!confirmed) return;
      try {
        await DeliveryDB.delete(id);
        DeliveryGallery._data = DeliveryGallery._data.filter(x => x.id !== id);
        DeliveryGallery._render();
      } catch (err) {
        _toast('Erro ao remover: ' + err.message, 'error');
      }
    },

    _buildShell() {
      return `
        <div class="dg-header">
          <div class="dg-header-left">
            <div class="dg-header-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3a8cff" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              SERVIÇOS CONCLUÍDOS
            </div>
            <div class="dg-header-sub">Histórico de entregas realizadas</div>
          </div>
          <div class="dg-header-right">
            <span class="dg-count-badge" id="dg-count">— entregas</span>
            <button class="dg-refresh-btn" onclick="DeliveryGallery.refresh()" title="Atualizar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
            </button>
          </div>
        </div>

        <div class="dg-grid" id="dg-grid"></div>

        <div class="dg-lightbox" id="dg-lightbox" onclick="DeliveryGallery._lbClickOutside(event)">
          <button class="dg-lb-close" onclick="DeliveryGallery.closeLightbox()">✕</button>
          <button class="dg-lb-nav dg-lb-prev" onclick="DeliveryGallery.navLightbox(-1)">&#8249;</button>
          <div class="dg-lb-center">
            <img class="dg-lb-img" id="dg-lb-img" src="" alt="">
            <div class="dg-lb-footer">
              <div class="dg-lb-caption" id="dg-lb-caption"></div>
              <div class="dg-lb-counter" id="dg-lb-counter"></div>
            </div>
          </div>
          <button class="dg-lb-nav dg-lb-next" onclick="DeliveryGallery.navLightbox(1)">&#8250;</button>
        </div>
      `;
    },

    _lbClickOutside(e) {
      if (e.target.classList.contains('dg-lightbox')) DeliveryGallery.closeLightbox();
    },

    _buildSkeletons(n) {
      return Array.from({ length: n }, () => `
        <div class="dg-card dg-skeleton">
          <div class="dg-skel-img"></div>
          <div class="dg-card-body">
            <div class="dg-skel-line dg-skel-line--lg"></div>
            <div class="dg-skel-line dg-skel-line--md"></div>
            <div class="dg-skel-line dg-skel-line--sm"></div>
          </div>
        </div>`
      ).join('');
    },

    _injectStyles() {
      if (document.getElementById('dg-styles')) return;
      const s = document.createElement('style');
      s.id = 'dg-styles';
      s.textContent = `
/* ── DeliveryGallery + DeliveryAdmin Styles ──────────── */

@keyframes da-spin {
  to { transform: rotate(360deg); }
}

#tab-entregas { padding: 0 0 100px; min-height: 60vh; }

.dg-header { display:flex; align-items:flex-start; justify-content:space-between; padding:24px 24px 20px; gap:16px; }
.dg-header-title { display:flex; align-items:center; gap:10px; font-family:var(--font-title,'Cinzel',serif); font-size:16px; font-weight:700; letter-spacing:2px; color:rgba(255,255,255,0.92); }
.dg-header-sub { font-size:11px; color:rgba(255,255,255,0.3); margin-top:4px; letter-spacing:0.5px; }
.dg-header-right { display:flex; align-items:center; gap:10px; flex-shrink:0; }
.dg-count-badge { font-size:11px; font-family:var(--font-mono,monospace); color:rgba(58,140,255,0.8); background:rgba(58,140,255,0.08); border:1px solid rgba(58,140,255,0.2); border-radius:20px; padding:4px 12px; white-space:nowrap; }
.dg-refresh-btn { width:34px; height:34px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:rgba(255,255,255,0.4); cursor:pointer; transition:all 0.2s; flex-shrink:0; }
.dg-refresh-btn:hover { background:rgba(58,140,255,0.1); border-color:rgba(58,140,255,0.3); color:#3a8cff; }

.dg-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; padding:0 16px 24px; }

.dg-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:14px; overflow:hidden; transition:transform 0.2s,border-color 0.2s,box-shadow 0.2s; position:relative; }
.dg-card:hover { transform:translateY(-3px); border-color:rgba(58,140,255,0.3); box-shadow:0 12px 40px rgba(0,0,0,0.4),0 0 0 1px rgba(58,140,255,0.15); }

.dg-card-img-wrap { position:relative; width:100%; aspect-ratio:16/10; overflow:hidden; cursor:pointer; background:rgba(0,0,0,0.3); }
.dg-card-img { width:100%; height:100%; object-fit:cover; display:block; }

.dg-card-img-placeholder { width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:40px; color:rgba(255,255,255,0.1); }
.dg-card-overlay { position:absolute; inset:0; background:rgba(0,0,0,0); display:flex; align-items:center; justify-content:center; transition:background 0.2s; pointer-events:none; }
.dg-card-img-wrap:hover .dg-card-overlay { background:rgba(0,0,0,0.35); }
.dg-card-overlay-icon { font-size:24px; opacity:0; transform:scale(0.8); transition:all 0.2s; }
.dg-card-img-wrap:hover .dg-card-overlay-icon { opacity:1; transform:scale(1); }
.dg-card-delete { position:absolute; top:8px; right:8px; width:28px; height:28px; border-radius:6px; background:rgba(0,0,0,0.7); border:1px solid rgba(255,255,255,0.1); color:rgba(255,80,80,0.8); font-size:13px; cursor:pointer; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s; z-index:2; }
.dg-card:hover .dg-card-delete { opacity:1; }
.dg-card-delete:hover { background:rgba(200,0,0,0.5); color:#fff; }
.dg-thumbs { display:flex; gap:4px; padding:4px; background:rgba(0,0,0,0.2); }
.dg-thumb { flex:1; aspect-ratio:16/9; border-radius:6px; overflow:hidden; cursor:pointer; background:rgba(255,255,255,0.04); transition:opacity 0.2s; }
.dg-thumb:hover { opacity:0.8; }
.dg-thumb img { width:100%; height:100%; object-fit:cover; opacity:0; transition:opacity 0.3s; display:block; }

.dg-thumb-more { display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:rgba(255,255,255,0.5); background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); }
.dg-card-body { padding:14px 16px 16px; }
.dg-card-service { font-family:var(--font-title,'Cinzel',serif); font-size:13px; font-weight:700; letter-spacing:1px; color:rgba(255,255,255,0.88); margin-bottom:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dg-card-row { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; }
.dg-card-pokemon { font-size:10px; font-family:var(--font-mono,monospace); color:#f5c842; background:rgba(245,200,66,0.08); border:1px solid rgba(245,200,66,0.2); border-radius:20px; padding:2px 8px; letter-spacing:0.3px; }
.dg-card-type { font-size:10px; color:rgba(58,140,255,0.9); background:rgba(58,140,255,0.07); border:1px solid rgba(58,140,255,0.18); border-radius:20px; padding:2px 8px; letter-spacing:0.3px; }
.dg-card-meta { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:10px; }
.dg-meta-item { display:flex; align-items:center; gap:5px; font-size:11px; color:rgba(255,255,255,0.4); }
.dg-meta-item svg { flex-shrink:0; opacity:0.5; }
.dg-card-status { display:inline-flex; align-items:center; gap:5px; font-size:9px; font-weight:700; letter-spacing:1.5px; color:#5ae698; background:rgba(90,230,152,0.08); border:1px solid rgba(90,230,152,0.2); border-radius:20px; padding:3px 10px; }

.dg-empty { grid-column:1/-1; text-align:center; padding:80px 20px; color:rgba(255,255,255,0.3); }
.dg-empty-icon { font-size:48px; margin-bottom:16px; opacity:0.4; }
.dg-empty-title { font-size:15px; font-weight:600; margin-bottom:6px; color:rgba(255,255,255,0.5); }
.dg-empty-sub { font-size:12px; }
.dg-error { grid-column:1/-1; text-align:center; padding:60px 20px; color:rgba(255,100,100,0.7); }
.dg-error-icon { font-size:40px; margin-bottom:12px; }
.dg-error-sub { font-size:11px; margin-top:4px; opacity:0.7; }
.dg-retry-btn { margin-top:16px; padding:8px 20px; background:rgba(58,140,255,0.1); border:1px solid rgba(58,140,255,0.3); border-radius:8px; color:#3a8cff; cursor:pointer; font-size:12px; }

.dg-skeleton { pointer-events:none; }
.dg-skel-img { width:100%; aspect-ratio:16/10; background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%); background-size:200% 100%; animation:dg-shimmer 1.4s infinite; }
.dg-skel-line { height:10px; border-radius:5px; margin-bottom:8px; background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%); background-size:200% 100%; animation:dg-shimmer 1.4s infinite; }
.dg-skel-line--lg { width:75%; } .dg-skel-line--md { width:50%; } .dg-skel-line--sm { width:30%; }
@keyframes dg-shimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }

.dg-lightbox { position:fixed; inset:0; z-index:9999; background:rgba(0,0,0,0.96); display:none; align-items:center; justify-content:center; gap:16px; padding:16px; }
.dg-lightbox.dg-lb-open { display:flex; }
.dg-lb-center { max-width:min(92vw,1000px); max-height:90vh; display:flex; flex-direction:column; gap:12px; align-items:center; }
.dg-lb-img { max-width:100%; max-height:78vh; object-fit:contain; border-radius:8px; opacity:0; transition:opacity 0.3s; display:block; }
.dg-lb-img.dg-lb-img-loaded { opacity:1; }
.dg-lb-footer { display:flex; align-items:center; justify-content:space-between; width:100%; gap:16px; }
.dg-lb-caption { font-size:13px; color:rgba(255,255,255,0.55); font-family:var(--font-mono,monospace); flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dg-lb-counter { font-size:11px; color:rgba(255,255,255,0.3); white-space:nowrap; }
.dg-lb-nav { width:44px; height:44px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:50%; color:rgba(255,255,255,0.6); font-size:24px; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all 0.2s; }
.dg-lb-nav:hover { background:rgba(58,140,255,0.15); border-color:rgba(58,140,255,0.4); color:#fff; }
.dg-lb-close { position:fixed; top:16px; right:16px; width:40px; height:40px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); border-radius:50%; color:rgba(255,255,255,0.7); font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s; z-index:10000; }
.dg-lb-close:hover { background:rgba(200,0,0,0.4); color:#fff; }

/* ── DeliveryAdmin Modal ────────────────────────────── */
#da-modal-overlay { position:fixed; inset:0; z-index:9000; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; padding:16px; opacity:0; transition:opacity 0.25s; }
#da-modal-overlay.da-open { opacity:1; }
.da-modal { width:100%; max-width:520px; max-height:90vh; overflow-y:auto; background:#0f1623; border:1px solid rgba(58,140,255,0.25); border-radius:16px; display:flex; flex-direction:column; gap:16px; padding:20px; box-shadow:0 24px 80px rgba(0,0,0,0.8),0 0 0 1px rgba(58,140,255,0.1); }
.da-modal-header { display:flex; align-items:center; justify-content:space-between; }
.da-modal-title { display:flex; align-items:center; gap:10px; font-family:var(--font-title,'Cinzel',serif); font-size:13px; font-weight:700; letter-spacing:2px; color:rgba(255,255,255,0.88); }
.da-modal-close { width:32px; height:32px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:rgba(255,255,255,0.5); cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
.da-modal-close:hover { background:rgba(200,0,0,0.3); color:#fff; }
.da-modal-meta { display:flex; gap:8px; flex-wrap:wrap; }
.da-meta-chip { font-size:10px; font-weight:600; letter-spacing:0.5px; padding:3px 10px; border-radius:20px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.5); }
.da-chip-green { background:rgba(90,230,152,0.08); border-color:rgba(90,230,152,0.25); color:#5ae698; }
.da-modal-info { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:12px 14px; display:flex; flex-direction:column; gap:8px; }
.da-info-row { display:flex; justify-content:space-between; align-items:center; font-size:12px; color:rgba(255,255,255,0.4); }
.da-info-row strong { color:rgba(255,255,255,0.8); font-weight:600; }
.da-imgur-field { display:flex; flex-direction:column; gap:8px; }
.da-imgur-label { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:600; letter-spacing:0.8px; color:rgba(255,255,255,0.45); text-transform:uppercase; }
.da-imgur-input { width:100%; box-sizing:border-box; background:rgba(255,255,255,0.04); border:1px solid rgba(58,140,255,0.25); border-radius:10px; padding:11px 14px; font-size:13px; color:rgba(255,255,255,0.85); outline:none; transition:border-color 0.2s, box-shadow 0.2s; font-family:var(--font-mono,monospace); }
.da-imgur-input::placeholder { color:rgba(255,255,255,0.2); }
.da-imgur-input:focus { border-color:rgba(58,140,255,0.6); box-shadow:0 0 0 3px rgba(58,140,255,0.12); }
.da-imgur-input--error { border-color:rgba(255,80,80,0.55) !important; box-shadow:0 0 0 3px rgba(255,80,80,0.1) !important; }
.da-imgur-input--valid { border-color:rgba(60,200,100,0.5) !important; box-shadow:0 0 0 3px rgba(60,200,100,0.1) !important; }
.da-url-error { display:flex; align-items:center; gap:6px; font-size:11px; color:rgba(255,110,110,0.9); background:rgba(255,60,60,0.07); border:1px solid rgba(255,80,80,0.2); border-radius:8px; padding:8px 12px; line-height:1.4; animation:da-err-in 0.18s ease; }
.da-url-error svg { flex-shrink:0; opacity:0.8; }
@keyframes da-err-in { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
.da-imgur-preview-wrap { border-radius:10px; overflow:hidden; border:1px solid rgba(58,140,255,0.2); background:rgba(0,0,0,0.3); }
.da-imgur-preview-img { display:block; max-width:100%; max-height:200px; margin:0 auto; object-fit:contain; }
.da-progress-bar-wrap { display:flex; flex-direction:column; gap:6px; }
.da-progress-bar { height:4px; border-radius:2px; background:rgba(255,255,255,0.06); overflow:hidden; }
.da-progress-fill { height:100%; border-radius:2px; background:linear-gradient(90deg,#3a8cff,#60aaff); transition:width 0.3s ease; width:0%; }
.da-progress-label { font-size:11px; color:rgba(255,255,255,0.4); }
.da-error-banner { background:rgba(200,50,50,0.12); border:1px solid rgba(255,80,80,0.25); border-radius:8px; padding:10px 14px; font-size:12px; color:rgba(255,130,130,0.9); }
.da-modal-footer { display:flex; gap:10px; justify-content:flex-end; }
.da-btn { padding:10px 20px; border-radius:10px; font-size:12px; font-weight:700; letter-spacing:0.8px; cursor:pointer; display:flex; align-items:center; gap:7px; transition:all 0.2s; }
.da-btn-cancel { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.5); }
.da-btn-cancel:hover { background:rgba(255,255,255,0.08); }
.da-btn-submit { background:rgba(58,140,255,0.15); border:1px solid rgba(58,140,255,0.35); color:#3a8cff; min-width:180px; justify-content:center; }
.da-btn-submit:hover:not(:disabled) { background:rgba(58,140,255,0.25); border-color:rgba(58,140,255,0.55); color:#fff; }
.da-btn-submit:disabled { opacity:0.35; cursor:not-allowed; }

/* ── Novos estilos dos cards de entrega ────────── */
.dg-card-player { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:rgba(255,255,255,0.75); margin-bottom:10px; }
.dg-card-player svg { opacity:0.55; flex-shrink:0; }
.dg-card-entrega { display:flex; align-items:center; gap:8px; margin-bottom:8px; min-height:28px; }
.dg-entrega-icon { font-size:16px; flex-shrink:0; }
.dg-entrega-nome { font-family:var(--font-title,"Cinzel",serif); font-size:13px; font-weight:700; letter-spacing:0.8px; color:rgba(255,255,255,0.92); line-height:1.3; }
.dg-card-chips { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; }
.dg-card-service-chip { font-size:10px; color:rgba(255,255,255,0.5); background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:20px; padding:2px 8px; letter-spacing:0.3px; }
.dg-meta-tempo { color:rgba(180,160,255,0.75) !important; }
.dg-meta-tempo svg { stroke:rgba(180,160,255,0.6) !important; }

@media (max-width:768px) {
  .dg-header { padding:16px 16px 14px; }
  .dg-header-title { font-size:13px; letter-spacing:1.5px; }
  .dg-grid { grid-template-columns:1fr; padding:0 12px 20px; gap:12px; }
  .dg-lb-nav { display:none; }
  .dg-lightbox { padding:8px; }
  .dg-lb-img { max-height:75vh; }
  .da-modal { padding:16px; gap:14px; }
  .da-modal-title { font-size:11px; letter-spacing:1.5px; }
  .da-imgur-input { font-size:12px; padding:9px 12px; }
}
      `;
      document.head.appendChild(s);
    },
  };

  // ── Expõe globalmente ──────────────────────────────────────
  global.DeliveryDB      = DeliveryDB;
  global.DeliveryAdmin   = DeliveryAdmin;
  global.DeliveryGallery = DeliveryGallery;

  // ── Inicializa galeria ao entrar na aba ─────────────────────
  function _onEntregasTab(tab) {
    if (tab === 'entregas') {
      if (!DeliveryGallery._loaded) DeliveryGallery.init();
      else DeliveryGallery.refresh();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (window.NavRuntime && typeof NavRuntime.onTabSwitch === 'function') {
      NavRuntime.onTabSwitch('after', 'delivery-system-gallery', _onEntregasTab);
    }
    const activeTab = document.querySelector('.tab-content.active')?.id;
    if (activeTab === 'tab-entregas') DeliveryGallery.init();
  });

})(typeof window !== 'undefined' ? window : this);
