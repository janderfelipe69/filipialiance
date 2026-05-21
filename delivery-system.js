// ============================================================
// delivery-system.js — Sistema de Entregas v4 (AUTH DEFINITIVE FIX)
// PokeAlliance Shop
//
// ROOT CAUSE RESOLVIDO (v4):
//   O session.js anterior tinha bugs em _doInit() que causavam rejeição
//   do _initPromise. Quando _initPromise rejeitava:
//     → Session.ready() também rejeitava
//     → await Session.ready() lançava exceção em _getSessionToken()
//     → _getSessionToken() não tinha try/catch → propagava a exceção
//     → jwt = null → log mostrava "❌ NULL"
//
//   Adicionalmente: _getSessionToken() agora tem try/catch robusto.
//   E: STORAGE AUTH OK log confirma quando token chega ao fetch de upload.
//
// DEPENDÊNCIAS: supabase-client.js, session.js (v3+)
// ============================================================

;(function (global) {
  'use strict';

  const SB_URL = global.SUPABASE_URL || '';
  const SB_KEY = global.SUPABASE_KEY || '';
  const BUCKET = 'delivery-proofs';
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

      // Resolve campos possivelmente ausentes buscando o pedido original
      let extraData = {};
      if (payload.pedido_id && (!payload.servico_nome || !payload.pokemon_nome || !payload.tipo_pedido)) {
        try {
          const res = await fetch(
            `${SB_URL}/rest/v1/pedidos?id=eq.${payload.pedido_id}&select=service_name,pokemon_name,service_type,nick&limit=1`,
            { headers: _headers(jwt) }
          );
          if (res.ok) {
            const rows = await res.json();
            if (rows && rows[0]) {
              extraData = rows[0];
              console.log('[DeliveryDB] Dados extras do pedido original:', extraData);
            }
          }
        } catch (e) {
          console.warn('[DeliveryDB] Não foi possível buscar pedido original:', e.message);
        }
      }

      // Monta a URL pública da primeira imagem (image_url)
      // FIX: garante que image_url seja sempre uma URL http completa (não path relativo)
      const firstPrint = Array.isArray(payload.prints) ? payload.prints[0] : null;
      let imageUrl = firstPrint?.url || null;
      if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = `${SB_URL}/storage/v1/object/public/${BUCKET}/${imageUrl}`;
        console.log('[DeliveryDB] image_url convertida para URL completa:', imageUrl);
      }

      const row = {
        order_id:      payload.pedido_id     || null,
        service_name:  payload.servico_nome  || extraData.service_name || null,
        pokemon_name:  payload.pokemon_nome  || extraData.pokemon_name || null,
        service_type:  payload.tipo_pedido   || extraData.service_type || null,
        image_url:     imageUrl,
        prints:        payload.prints        || [],
        delivered_by:  payload.user_id       || _getCurrentUserId() || null,
        cliente_nick:  payload.cliente_nick  || extraData.nick       || null,
        descricao:     payload.descricao     || null,
        created_at:    payload.concluido_at  || new Date().toISOString(),
      };

      console.log('[DeliveryDB] INSERT payload:', row);

      const res = await fetch(`${SB_URL}/rest/v1/${TABLE}`, {
        method:  'POST',
        headers: { ..._headers(jwt), 'Prefer': 'return=representation' },
        body:    JSON.stringify(row),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        console.error('[DeliveryDB] ❌ INSERT falhou:', { status: res.status, error: e });
        throw new Error(e.message || e.error || `Erro ao salvar entrega (HTTP ${res.status})`);
      }

      const result = await res.json().catch(() => []);
      console.log('[DeliveryDB] ✅ INSERT OK:', result);
      return result;
    },

    /**
     * Lista entregas ordenadas por data (mais recentes primeiro).
     * Traz todos os campos necessários para os cards.
     */
    async list(limit = 200) {
      const jwt = await _getSessionToken();

      // SELECT ampliado: inclui todos os nomes de coluna possíveis para garantir
      // compatibilidade independente de como a tabela foi criada no Supabase.
      // NOTA: Supabase ignora silenciosamente colunas inexistentes — sem erro HTTP.
      const url = `${SB_URL}/rest/v1/${TABLE}` +
        `?select=id,order_id,` +
        `service_name,pokemon_name,service_type,` +         // nomes canônicos EN
        `servico_nome,pokemon_nome,tipo_pedido,` +          // nomes alternativos PT
        `image_url,proof_urls,screenshot_url,` +            // imagem principal (variantes)
        `prints,images,` +                                  // array de prints (variantes)
        `cliente_nick,nick,` +                              // nick do cliente
        `delivered_by,created_at,concluido_at,` +           // metadados
        `descricao,description` +                           // descrição (variantes)
        `&order=created_at.desc` +
        `&limit=${limit}`;

      console.log('[Entregas] Buscando entregas — url:', url);

      const res = await fetch(url, { headers: _headers(jwt) });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        const msg = e.message || e.error || `Erro ao carregar entregas (HTTP ${res.status})`;
        console.error('[Entregas] Falha na query:', msg);
        throw new Error(msg);
      }

      const rows = await res.json();
      console.log(`[Entregas] dados carregados — ${rows.length} registros`);

      // ── Diagnóstico do primeiro registro ────────────────────────────────────
      if (rows.length > 0) {
        const r0 = rows[0];
        console.group('[Entregas] Estrutura do banco (primeiro registro)');
        console.log('Campos presentes:', Object.keys(r0));
        console.log('image_url:', r0.image_url);
        console.log('proof_urls:', r0.proof_urls);
        console.log('prints:', r0.prints);
        console.log('images:', r0.images);
        console.log('service_name:', r0.service_name, '| servico_nome:', r0.servico_nome);
        console.log('pokemon_name:', r0.pokemon_name, '| pokemon_nome:', r0.pokemon_nome);
        console.log('service_type:', r0.service_type, '| tipo_pedido:', r0.tipo_pedido);
        console.log('description:', r0.description, '| descricao:', r0.descricao);
        console.log('cliente_nick:', r0.cliente_nick, '| nick:', r0.nick);
        console.groupEnd();
      } else {
        console.warn('[Entregas] Banco retornou 0 registros — verifique RLS e tabela:', TABLE);
      }

      // ── Resolução de image_url via signed URL se necessário ─────────────────
      // Se image_url existir mas apontar para um path interno (sem /public/),
      // tenta gerar signed URL para buckets privados.
      const resolvedRows = await Promise.all(rows.map(async (row) => {
        // Já tem URL pública completa? → usa como está
        if (row.image_url && row.image_url.startsWith('http')) {
          return row;
        }

        // image_url parece um path relativo? → monta URL pública
        if (row.image_url && !row.image_url.startsWith('http')) {
          const publicUrl = `${SB_URL}/storage/v1/object/public/${BUCKET}/${row.image_url}`;
          console.log('[Entregas] Convertendo path relativo para URL pública:', publicUrl);
          row.image_url = publicUrl;
          return row;
        }

        // Sem image_url mas com prints[]? → extrai do primeiro print
        if (!row.image_url) {
          const rawPrints = row.prints || row.images || row.proof_urls || [];
          if (Array.isArray(rawPrints) && rawPrints.length) {
            const first = rawPrints[0];
            const firstUrl = (typeof first === 'string') ? first : (first && first.url ? first.url : null);
            if (firstUrl) {
              row.image_url = firstUrl.startsWith('http')
                ? firstUrl
                : `${SB_URL}/storage/v1/object/public/${BUCKET}/${firstUrl}`;
              console.log('[Entregas] image_url extraída de prints[0]:', row.image_url);
            }
          }
        }

        return row;
      }));

      return resolvedRows;
    },

    /**
     * Remove uma entrega pelo ID (apenas admins devem chamar).
     */
    async delete(id) {
      const jwt = await _ensureValidSession();
      const res = await fetch(`${SB_URL}/rest/v1/${TABLE}?id=eq.${id}`, {
        method:  'DELETE',
        headers: { ..._headers(jwt), 'Prefer': 'return=minimal' },
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || `Erro ao remover entrega (HTTP ${res.status})`);
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

    console.error('[Entrega] ❌ Session não disponível ou sem token após ready()');
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
  // DeliveryStorage — upload com retry automático em 401
  // ══════════════════════════════════════════════════════════
  const DeliveryStorage = {

    /**
     * Faz upload de um arquivo para o bucket delivery-proofs.
     * Retry automático: se 401 → refresh → 1 retry.
     */
    async upload(file, pedidoId) {
      // PASSO CRÍTICO: garante sessão válida ANTES de qualquer fetch
      const jwt  = await _ensureValidSession();
      const ext  = (file.name || 'image.png').split('.').pop().toLowerCase() || 'png';
      const ts   = Date.now();
      const rand = Math.random().toString(36).slice(2, 7);
      const path = `delivery_${pedidoId}_${ts}_${rand}.${ext}`;

      // Log de diagnóstico organizado
      const userId       = _getCurrentUserId() || '(sem user)';
      const tokenPreview = jwt ? jwt.slice(0, 24) + '…' : '❌ NULL';
      console.group('[Entrega] 🔐 Auth Check — upload()');
      console.log('user_id :', userId);
      console.log('token   :', tokenPreview);
      console.log('bucket  :', BUCKET);
      console.log('path    :', path);
      console.log('file    :', file.name, `(${(file.size / 1024).toFixed(1)} KB)`);
      console.groupEnd();

      const result = await DeliveryStorage._doUpload(file, path, jwt);
      return result;
    },

    /**
     * Executa o fetch de upload. Se receber 401, tenta refresh e retry único.
     */
    async _doUpload(file, path, jwt, isRetry = false) {
      console.log('[Entrega] 🔑 STORAGE AUTH OK | token:', jwt ? jwt.slice(0, 20) + '…' : '❌ NULL', '| isRetry:', isRetry);
      const res = await fetch(
        `${SB_URL}/storage/v1/object/${BUCKET}/${path}`,
        {
          method:  'POST',
          headers: {
            'apikey':        SB_KEY,
            'Authorization': 'Bearer ' + jwt,
            'Content-Type':  file.type || 'image/png',
            'x-upsert':      'false',
          },
          body: file,
        }
      );

      // Sucesso
      if (res.ok) {
        const publicUrl = `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}`;
        console.log('[Entrega] ✅ Upload concluído:', publicUrl);
        return { url: publicUrl, path, name: file.name || path };
      }

      const e = await res.json().catch(() => ({}));

      // 401 → token rejeitado pelo Storage. Session já tem refresh automático,
      // mas pode ter havido race entre expiração e upload. Forçamos refresh via Session e retentamos.
      if (res.status === 401 && !isRetry) {
        console.warn('[Entrega] 401 no upload. Solicitando forceRefresh ao Session...');
        try {
          const freshToken = (typeof Session !== 'undefined' && typeof Session.forceRefresh === 'function')
            ? await Session.forceRefresh()
            : await _getSessionToken();
          if (freshToken) {
            console.log('[Entrega] ✅ Token renovado via Session.forceRefresh(). Fazendo retry...');
            return DeliveryStorage._doUpload(file, path, freshToken, true);
          }
        } catch (refreshErr) {
          console.error('[Entrega] ❌ forceRefresh falhou:', refreshErr.message);
        }
        throw new Error('Sessão expirada durante o upload. Faça login e tente novamente.');
      }

      // Outro erro
      console.error('[Entrega] ❌ Erro no upload Storage:', {
        status:  res.status,
        message: e.message,
        error:   e.error,
        hint:    e.hint,
        bucket:  BUCKET,
        path,
      });
      throw new Error(e.message || `Erro no upload (HTTP ${res.status})`);
    },

    async uploadMultiple(files, pedidoId, onProgress) {
      const results = [];
      for (let i = 0; i < files.length; i++) {
        if (onProgress) onProgress(i, files.length, files[i].name);
        const r = await DeliveryStorage.upload(files[i], pedidoId);
        results.push(r);
      }
      if (onProgress) onProgress(files.length, files.length, '');
      return results;
    },
  };

  // ══════════════════════════════════════════════════════════
  // DeliveryAdmin — modal comprovante
  // ══════════════════════════════════════════════════════════
  const DeliveryAdmin = {

    _files:      [],
    _submitting: false,

    openModal(supabaseOrderId, orderData) {
      DeliveryAdmin._files      = [];
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

      DeliveryAdmin._setupDrop(supabaseOrderId);
      DeliveryAdmin._setupPaste(supabaseOrderId);

      requestAnimationFrame(() => overlay.classList.add('da-open'));
    },

    closeModal() {
      const el = document.getElementById('da-modal-overlay');
      if (!el) return;
      el.classList.remove('da-open');
      setTimeout(() => el.remove(), 280);
      document.removeEventListener('paste', DeliveryAdmin._pasteHandler);
    },

    _buildModalHTML(orderId, orderData) {
      const nick    = orderData?.nick    || '—';
      const service = orderData?.service || '—';
      const pokemon = orderData?.pokemon || '—';
      const tipo    = orderData?.tipo    || '—';

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
          </div>

          <div class="da-paste-hint" id="da-paste-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Pressione <kbd>Ctrl+V</kbd> para colar um print da área de transferência
          </div>

          <div class="da-drop-zone" id="da-drop-zone" onclick="document.getElementById('da-file-input').click()">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(58,140,255,0.5)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <div class="da-drop-text">Arraste aqui, clique ou <strong>Ctrl+V</strong></div>
            <div class="da-drop-sub">JPEG, PNG, WebP — até 10MB cada</div>
            <input type="file" id="da-file-input" accept="image/*" multiple style="display:none"
              onchange="DeliveryAdmin._onFilesSelected(event.target.files)">
          </div>

          <div class="da-preview-grid" id="da-preview-grid"></div>

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

    _onFilesSelected(fileList) {
      const MAX_SIZE = 10 * 1024 * 1024;
      const ALLOWED  = ['image/jpeg', 'image/png', 'image/webp'];
      const files = Array.from(fileList).filter(f => {
        if (!ALLOWED.includes(f.type)) {
          console.warn('[Entrega] Arquivo ignorado (tipo não suportado):', f.name, f.type);
          return false;
        }
        if (f.size > MAX_SIZE) {
          DeliveryAdmin._showError(`Arquivo muito grande (máx 10MB): ${f.name}`);
          return false;
        }
        return true;
      });
      DeliveryAdmin._files = DeliveryAdmin._files.concat(files);
      DeliveryAdmin._renderPreviews();
    },

    _renderPreviews() {
      const grid = document.getElementById('da-preview-grid');
      const btn  = document.getElementById('da-submit-btn');
      const hint = document.getElementById('da-paste-hint');
      if (!grid) return;

      grid.innerHTML = '';
      DeliveryAdmin._files.forEach((f, i) => {
        const url = URL.createObjectURL(f);
        const el  = document.createElement('div');
        el.className = 'da-preview-item';
        el.innerHTML = `
          <img src="${url}" alt="${f.name}" loading="lazy">
          <button class="da-preview-remove" onclick="DeliveryAdmin._removeFile(${i})" title="Remover">✕</button>
          <div class="da-preview-name">${f.name.length > 16 ? f.name.slice(0,14)+'…' : f.name}</div>
        `;
        grid.appendChild(el);
      });

      if (btn) btn.disabled = DeliveryAdmin._files.length === 0;
      if (hint) hint.style.display = DeliveryAdmin._files.length > 0 ? 'none' : '';
    },

    _removeFile(index) {
      DeliveryAdmin._files.splice(index, 1);
      DeliveryAdmin._renderPreviews();
    },

    // ── Drag & Drop ──────────────────────────────────────────
    _setupDrop(orderId) {
      const zone = document.getElementById('da-drop-zone');
      if (!zone) return;

      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add('da-drag-over');
      });
      zone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        zone.classList.add('da-drag-over');
      });
      zone.addEventListener('dragleave', (e) => {
        if (!zone.contains(e.relatedTarget)) zone.classList.remove('da-drag-over');
      });
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove('da-drag-over');
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length) {
          console.log('[Entrega] Drop:', files.length, 'arquivo(s)');
          DeliveryAdmin._onFilesSelected(files);
        }
      });
    },

    // ── Paste (Ctrl+V) ──────────────────────────────────────
    _pasteHandler: null,

    _setupPaste(orderId) {
      if (DeliveryAdmin._pasteHandler) {
        document.removeEventListener('paste', DeliveryAdmin._pasteHandler);
      }

      DeliveryAdmin._pasteHandler = function(e) {
        if (!document.getElementById('da-modal-overlay')) return;

        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;

        const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'));
        if (!imageItems.length) return;

        e.preventDefault();

        const files = imageItems.map(item => {
          const blob = item.getAsFile();
          const ext  = item.type.split('/')[1] || 'png';
          const ts   = Date.now();
          return new File([blob], `print_${ts}.${ext}`, { type: item.type });
        });

        console.log('[Entrega] Paste (Ctrl+V):', files.length, 'imagem(ns)');
        DeliveryAdmin._onFilesSelected(files);

        const zone = document.getElementById('da-drop-zone');
        if (zone) {
          zone.classList.add('da-paste-flash');
          setTimeout(() => zone.classList.remove('da-paste-flash'), 600);
        }
      };

      document.addEventListener('paste', DeliveryAdmin._pasteHandler);
    },

    // ── Submit: fluxo completo ponta a ponta ─────────────────
    async _submit(btn) {
      if (DeliveryAdmin._submitting) {
        console.warn('[Entrega] Já em progresso, ignorando clique duplo.');
        return;
      }

      const orderId   = btn.dataset.orderId;
      const orderData = JSON.parse(decodeURIComponent(btn.dataset.orderData || '{}'));
      const files     = DeliveryAdmin._files;

      if (!files.length) {
        DeliveryAdmin._showError('Adicione pelo menos uma imagem antes de registrar.');
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
        // ── PASSO 1: Upload das imagens ──────────────────────
        console.group('[Entrega] PASSO 1 — Upload (' + files.length + ' arquivo(s))');
        const prints = await DeliveryStorage.uploadMultiple(
          files,
          String(orderId),
          (done, total, name) => {
            const pct = total > 0 ? Math.round((done / total) * 60) : 0;
            if (progressFill) progressFill.style.width = pct + '%';
            if (progressLbl) progressLbl.textContent = done < total
              ? `Enviando ${done + 1}/${total}: ${name}`
              : 'Salvando registro…';
          }
        );
        console.log('URLs:', prints.map(p => p.url));
        console.groupEnd();

        if (progressFill) progressFill.style.width = '65%';

        // ── PASSO 2: INSERT em pedido_entregas ───────────────
        console.log('[Entrega] PASSO 2 — Salvando em delivery_proofs...');
        const payload = {
          pedido_id:    Number(orderId),
          user_id:      _getCurrentUserId(),
          prints:       prints,
          descricao:    null,
          cliente_nick: orderData?.nick    || null,
          servico_nome: orderData?.service || null,
          pokemon_nome: orderData?.pokemon || null,
          tipo_pedido:  orderData?.tipo    || null,
          concluido_at: new Date().toISOString(),
        };
        await DeliveryDB.insert(payload);
        console.log('[Entrega] PASSO 2 — ✅ Entrega salva em delivery_proofs.');

        if (progressFill) progressFill.style.width = '75%';

        // ── PASSO 3: UPDATE pedidos → status = 'concluido' ──
        console.log('[Entrega] PASSO 3 — Atualizando pedido #' + orderId + ' → concluido...');
        await DeliveryAdmin._updatePedidoStatus(orderId);
        console.log('[Entrega] PASSO 3 — ✅ Pedido atualizado.');

        if (progressFill) progressFill.style.width = '88%';

        // ── PASSO 4: Notificação para o cliente ──────────────
        console.log('[Entrega] PASSO 4 — Criando notificação...');
        await DeliveryAdmin._createClientNotification(orderId, 'Seu pedido foi concluído!');
        console.log('[Entrega] PASSO 4 — ✅ Notificação criada.');

        if (progressFill) progressFill.style.width = '100%';
        if (progressLbl)  progressLbl.textContent = '✅ Entrega registrada!';

        // ── PASSO 5: Fechar + toast + atualizar fila ─────────
        DeliveryAdmin._files      = [];
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

          console.log('[Entrega] ✅ Fluxo completo concluído para pedido #' + orderId);
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
        console.warn('[Entrega] Notificação falhou (não fatal):', e.message);
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
        console.error('[Entregas] erro render — falha ao carregar lista:', err.message, err);
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
    // Resolve divergências entre nomes de colunas (snake_case variantes, PT vs EN)
    // e garante que prints seja sempre um array de {url} objects.
    _normalizeEntry(entry) {
      if (!entry || entry._normalized) return entry;

      console.log('[Entregas] renderizando card — id:', entry.id, '| campos:', Object.keys(entry));

      // ── 1. IMAGEM PRINCIPAL ───────────────────────────────────────────────
      // Suporte a: image_url | proof_urls[0] | screenshot_url | images[0] | prints[0]
      const _firstUrl = (arr) => {
        if (!Array.isArray(arr) || !arr.length) return null;
        const item = arr[0];
        if (typeof item === 'string') return item;         // formato ["url1", ...]
        if (item && typeof item === 'object') return item.url || item.path || null; // formato [{url:...}]
        return null;
      };

      entry.image_url = entry.image_url
        || _firstUrl(entry.proof_urls)
        || entry.screenshot_url
        || _firstUrl(entry.images)
        || _firstUrl(Array.isArray(entry.prints) ? entry.prints : [])
        || null;

      // ── 2. ARRAY DE PRINTS (normaliza para [{url}] sempre) ────────────────
      const rawPrints = entry.prints || entry.images || entry.proof_urls || [];
      entry.prints = Array.isArray(rawPrints)
        ? rawPrints.map(p => {
            if (typeof p === 'string') return { url: p };          // era string pura
            if (p && typeof p === 'object' && p.url) return p;     // já é {url:...}
            return null;
          }).filter(Boolean)
        : [];

      // Garante que image_url também esteja representado nos prints (para lightbox)
      if (entry.image_url && !entry.prints.some(p => p.url === entry.image_url)) {
        entry.prints.unshift({ url: entry.image_url });
      }

      // ── 3. NOME DO SERVIÇO ────────────────────────────────────────────────
      entry.service_name = entry.service_name
        || entry.servico_nome
        || entry.service
        || null;

      // ── 4. NOME DO POKÉMON ────────────────────────────────────────────────
      entry.pokemon_name = entry.pokemon_name
        || entry.pokemon_nome
        || entry.pokemon
        || null;

      // ── 5. TIPO DO SERVIÇO ────────────────────────────────────────────────
      entry.service_type = entry.service_type
        || entry.tipo_pedido
        || entry.tipo
        || null;

      // ── 6. NICK DO CLIENTE ────────────────────────────────────────────────
      entry.cliente_nick = entry.cliente_nick
        || entry.nick
        || entry.client_nick
        || null;

      // ── 7. DESCRIÇÃO ──────────────────────────────────────────────────────
      entry.descricao = entry.descricao
        || entry.description
        || entry.desc
        || null;

      // ── 8. DATA ────────────────────────────────────────────────────────────
      entry.created_at = entry.created_at || entry.concluido_at || null;

      // Atalhos legados usados no HTML do card
      entry.servico_nome = entry.service_name;
      entry.pokemon_nome = entry.pokemon_name;
      entry.tipo_pedido  = entry.service_type;

      entry._normalized = true;

      console.log('[Entregas] renderizando card — resultado normalizado:',
        'image_url:', entry.image_url || '(sem imagem)',
        '| service:', entry.service_name || '(sem serviço)',
        '| pokemon:', entry.pokemon_name || '(sem pokémon)',
        '| nick:', entry.cliente_nick || '(sem nick)',
        '| prints:', entry.prints.length
      );

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

        const svcName = entry.service_name || 'Entrega';
        const pkName  = entry.pokemon_name || '';
        const nick    = entry.cliente_nick || '';

        // Monta índice do lightbox a partir dos prints normalizados [{url}]
        entry.prints.forEach(p => {
          if (!p.url) return;
          DeliveryGallery._lightboxAll.push({
            url:     p.url,
            caption: `${svcName}${pkName ? ' — ' + pkName : ''} ${nick ? '• ' + nick : ''}`.trim(),
          });
        });
      });

      grid.innerHTML = '';
      const isAdmin = typeof Session !== 'undefined' && Session.isAdmin();

      data.forEach((entry, idx) => {
        const card = DeliveryGallery._buildCard(entry, idx, isAdmin);
        grid.appendChild(card);
      });

      DeliveryGallery._setupLazyLoad();
    },

    _buildCard(entry, idx, isAdmin) {
      // Garante normalização (idempotente — não refaz se já foi feita em refresh)
      DeliveryGallery._normalizeEntry(entry);
      console.log('[Entregas] renderizando card #' + idx, '— service:', entry.service_name, '| image_url:', entry.image_url || '(vazio)');

      const prints      = entry.prints;   // já é [{url}]
      const mainImg     = entry.image_url || '';
      const servicoNome = entry.service_name  || '';
      const pokemonNome = entry.pokemon_name  || '';
      const tipoPedido  = entry.service_type  || '';
      const clienteNick = entry.cliente_nick  || '';
      const descricao   = entry.descricao     || '';
      const dateRaw = entry.created_at || entry.concluido_at;
      const date    = dateRaw
        ? new Date(dateRaw).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' })
        : '—';

      const thumb2   = prints[1] ? `<div class="dg-thumb" data-lb-idx="${DeliveryGallery._getLightboxIndex(entry, 1)}"><img data-src="${prints[1].url}" class="dg-lazy" alt="print 2"></div>` : '';
      const thumb3   = prints[2] ? `<div class="dg-thumb" data-lb-idx="${DeliveryGallery._getLightboxIndex(entry, 2)}"><img data-src="${prints[2].url}" class="dg-lazy" alt="print 3"></div>` : '';
      const more     = prints.length > 3 ? `<div class="dg-thumb dg-thumb-more" data-lb-idx="${DeliveryGallery._getLightboxIndex(entry, 3)}">+${prints.length - 3}</div>` : '';
      const hasThumbs  = prints.length > 1;
      const mainLbIdx  = DeliveryGallery._getLightboxIndex(entry, 0);
      const deleteBtnHTML = isAdmin
        ? `<button class="dg-card-delete" onclick="DeliveryGallery._deleteEntry('${entry.id}', event)" title="Remover entrega">🗑</button>`
        : '';

      const el = document.createElement('div');
      el.className = 'dg-card';
      el.innerHTML = `
        <div class="dg-card-img-wrap" onclick="DeliveryGallery.openLightbox(${mainLbIdx})">
          ${mainImg
            ? `<img class="dg-card-img dg-lazy" data-src="${mainImg}" alt="${servicoNome || 'Entrega'}"
                 onload="this.classList.add('dg-loaded');console.log('[Entregas] imagem carregada:','${mainImg}'.slice(0,60))"
                 onerror="console.warn('[Entregas] erro imagem — tentando fallback. url:','${mainImg}'.slice(0,80));this.style.display='none';this.parentNode.querySelector('.dg-card-overlay') && (this.parentNode.querySelector('.dg-card-overlay').style.display='none');var ph=document.createElement('div');ph.className='dg-card-img-placeholder';ph.textContent='📷';this.parentNode.insertBefore(ph,this.parentNode.firstChild);">`
            : `<div class="dg-card-img-placeholder">📷</div>`
          }
          <div class="dg-card-overlay">
            <div class="dg-card-overlay-icon">🔍</div>
          </div>
          ${deleteBtnHTML}
        </div>

        ${hasThumbs ? `<div class="dg-thumbs">${thumb2}${thumb3}${more}</div>` : ''}

        <div class="dg-card-body">
          <div class="dg-card-service">${servicoNome || pokemonNome || '—'}</div>
          <div class="dg-card-row">
            ${pokemonNome ? `<span class="dg-card-pokemon">⚡ ${pokemonNome}</span>` : ''}
            ${tipoPedido  ? `<span class="dg-card-type">${tipoPedido}</span>` : ''}
          </div>
          ${descricao ? `<div class="dg-card-desc" style="font-size:12px;color:rgba(255,255,255,0.45);margin:4px 0 6px;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${descricao}</div>` : ''}
          <div class="dg-card-meta">
            <div class="dg-meta-item">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              ${clienteNick || '—'}
            </div>
            <div class="dg-meta-item">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${date}
            </div>
          </div>
          <div class="dg-card-status">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
            ENTREGUE
          </div>
        </div>
      `;

      el.querySelectorAll('.dg-thumb[data-lb-idx]').forEach(t => {
        t.addEventListener('click', (e) => {
          e.stopPropagation();
          DeliveryGallery.openLightbox(parseInt(t.dataset.lbIdx));
        });
      });

      return el;
    },

    _getLightboxIndex(entry, printIndex) {
      const all    = DeliveryGallery._lightboxAll;
      // entry.prints é sempre [{url}] após _normalizeEntry()
      // entry.image_url está garantido como prints[0].url pelo normalizer
      const prints = Array.isArray(entry.prints) ? entry.prints : [];
      const url    = (prints[printIndex] || prints[0] || {}).url || entry.image_url || null;
      if (!url) return 0;
      return Math.max(0, all.findIndex(x => x.url === url));
    },

    _setupLazyLoad() {
      if (!('IntersectionObserver' in window)) {
        document.querySelectorAll('#dg-grid .dg-lazy').forEach(img => {
          if (img.dataset.src) { img.src = img.dataset.src; img.classList.add('dg-loaded'); }
        });
        return;
      }
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const img = e.target;
            if (img.dataset.src) {
              const src = img.dataset.src;
              img.src = src;
              img.onload  = () => {
                img.classList.add('dg-loaded');
                console.log('[Entregas] imagem carregada (lazy):', src.slice(0, 70));
              };
              img.onerror = () => {
                img.classList.add('dg-error-img');
                console.warn('[Entregas] erro render — falha ao carregar imagem:', src.slice(0, 80));
              };
              obs.unobserve(img);
            }
          }
        });
      }, { rootMargin: '200px' });

      document.querySelectorAll('#dg-grid .dg-lazy').forEach(img => obs.observe(img));
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
      const confirmed = await showConfirmModal({ title: 'Remover Entrega', message: 'Remover esta entrega? Os prints não serão deletados do Storage.', confirmText: 'Remover', cancelText: 'Cancelar', type: 'danger' });
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
.dg-card-img { width:100%; height:100%; object-fit:cover; display:block; opacity:0; transition:opacity 0.4s; }
.dg-card-img.dg-loaded { opacity:1; }
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
.dg-thumb img.dg-loaded { opacity:1; }
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
.da-paste-hint { display:flex; align-items:center; gap:8px; font-size:11px; color:rgba(58,140,255,0.7); background:rgba(58,140,255,0.06); border:1px solid rgba(58,140,255,0.15); border-radius:8px; padding:8px 12px; }
.da-paste-hint kbd { background:rgba(58,140,255,0.15); border:1px solid rgba(58,140,255,0.3); border-radius:4px; padding:1px 6px; font-size:11px; font-family:var(--font-mono,monospace); color:#3a8cff; }
.da-drop-zone { border:2px dashed rgba(58,140,255,0.25); border-radius:12px; padding:28px 20px; text-align:center; cursor:pointer; transition:all 0.2s; display:flex; flex-direction:column; align-items:center; gap:8px; }
.da-drop-zone:hover, .da-drop-zone.da-drag-over { border-color:rgba(58,140,255,0.6); background:rgba(58,140,255,0.05); }
.da-drop-zone.da-paste-flash { border-color:#3a8cff; background:rgba(58,140,255,0.1); box-shadow:0 0 0 3px rgba(58,140,255,0.2); }
.da-drop-text { font-size:13px; color:rgba(255,255,255,0.5); }
.da-drop-text strong { color:rgba(58,140,255,0.8); }
.da-drop-sub { font-size:11px; color:rgba(255,255,255,0.25); }
.da-preview-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(90px,1fr)); gap:8px; }
.da-preview-item { position:relative; border-radius:8px; overflow:hidden; background:rgba(0,0,0,0.3); }
.da-preview-item img { width:100%; aspect-ratio:1; object-fit:cover; display:block; }
.da-preview-remove { position:absolute; top:4px; right:4px; width:20px; height:20px; background:rgba(0,0,0,0.75); border:none; border-radius:50%; color:rgba(255,100,100,0.9); font-size:11px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.da-preview-name { font-size:9px; color:rgba(255,255,255,0.3); padding:3px 5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
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

@media (max-width:768px) {
  .dg-header { padding:16px 16px 14px; }
  .dg-header-title { font-size:13px; letter-spacing:1.5px; }
  .dg-grid { grid-template-columns:1fr; padding:0 12px 20px; gap:12px; }
  .dg-lb-nav { display:none; }
  .dg-lightbox { padding:8px; }
  .dg-lb-img { max-height:75vh; }
  .da-modal { padding:16px; gap:14px; }
  .da-modal-title { font-size:11px; letter-spacing:1.5px; }
  .da-drop-zone { padding:20px; }
  .da-paste-hint { font-size:10px; }
}
      `;
      document.head.appendChild(s);
    },
  };

  // ── Expõe globalmente ──────────────────────────────────────
  global.DeliveryDB      = DeliveryDB;
  global.DeliveryStorage = DeliveryStorage;
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
