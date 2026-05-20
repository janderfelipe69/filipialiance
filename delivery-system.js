// ============================================================
// delivery-system.js — Sistema de Entregas
// PokeAlliance Shop
//
// Responsabilidades:
//   1. DeliveryDB   — CRUD na tabela pedido_entregas (Supabase REST)
//   2. DeliveryStorage — Upload de prints para delivery-proofs bucket
//   3. DeliveryGallery — Aba Entregas: grid moderna, lightbox, skeleton
//   4. DeliveryAdmin — Modal de comprovante (chamado por orders-admin.js)
//
// Importar após: supabase-client.js, session.js, orders-admin.js
// ============================================================

;(function (global) {
  'use strict';

  // ── Constantes ────────────────────────────────────────────────────────────
  const SB_URL    = global.SUPABASE_URL || '';
  const SB_KEY    = global.SUPABASE_KEY || '';
  const BUCKET    = 'delivery-proofs';
  const TABLE     = 'pedido_entregas';

  function _headers(jwt) {
    return {
      'Content-Type':  'application/json',
      'apikey':        SB_KEY,
      'Authorization': 'Bearer ' + (jwt || SB_KEY),
    };
  }

  function _getJwt() {
    try {
      const s = JSON.parse(localStorage.getItem('poke_session') || '{}');
      return s.access_token || null;
    } catch (_) { return null; }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DeliveryDB — operações na tabela pedido_entregas
  // ══════════════════════════════════════════════════════════════════════════
  const DeliveryDB = {

    /** Busca todas as entregas, ordenadas por mais recentes */
    async list(limit = 100) {
      const url = `${SB_URL}/rest/v1/${TABLE}?select=*&order=created_at.desc&limit=${limit}`;
      const res = await fetch(url, { headers: _headers(_getJwt()) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Erro ao buscar entregas'); }
      return res.json();
    },

    /** Insere uma nova entrega */
    async insert(payload) {
      const jwt = _getJwt();
      const url = `${SB_URL}/rest/v1/${TABLE}`;
      const res = await fetch(url, {
        method:  'POST',
        headers: { ..._headers(jwt), 'Prefer': 'return=representation' },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Erro ao salvar entrega'); }
      const data = await res.json();
      return Array.isArray(data) ? data[0] : data;
    },

    /** Verifica se já existe entrega para este pedido */
    async existsForOrder(pedidoId) {
      const url = `${SB_URL}/rest/v1/${TABLE}?pedido_id=eq.${pedidoId}&select=id&limit=1`;
      const res = await fetch(url, { headers: _headers(_getJwt()) });
      if (!res.ok) return false;
      const data = await res.json();
      return Array.isArray(data) && data.length > 0;
    },

    /** Deleta uma entrega (admin) */
    async delete(id) {
      const url = `${SB_URL}/rest/v1/${TABLE}?id=eq.${id}`;
      const res = await fetch(url, {
        method:  'DELETE',
        headers: _headers(_getJwt()),
      });
      return res.ok;
    },
  };

  // ══════════════════════════════════════════════════════════════════════════
  // DeliveryStorage — upload de imagens para o bucket delivery-proofs
  // ══════════════════════════════════════════════════════════════════════════
  const DeliveryStorage = {

    /** Faz upload de um File e retorna { url, path, name } */
    async upload(file, pedidoId) {
      const jwt  = _getJwt();
      const ext  = file.name.split('.').pop().toLowerCase() || 'jpg';
      const ts   = Date.now();
      const rand = Math.random().toString(36).slice(2, 7);
      const path = `${pedidoId}/${ts}_${rand}.${ext}`;

      const res = await fetch(
        `${SB_URL}/storage/v1/object/${BUCKET}/${path}`,
        {
          method:  'POST',
          headers: {
            'apikey':          SB_KEY,
            'Authorization':   'Bearer ' + (jwt || SB_KEY),
            'Content-Type':    file.type || 'image/jpeg',
            'x-upsert':        'false',
          },
          body: file,
        }
      );

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || `Erro upload (${res.status})`);
      }

      const publicUrl = `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}`;
      return { url: publicUrl, path, name: file.name };
    },

    /** Faz upload de múltiplos arquivos com progresso */
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

  // ══════════════════════════════════════════════════════════════════════════
  // DeliveryAdmin — modal de upload de comprovante (integrado ao admin panel)
  // ══════════════════════════════════════════════════════════════════════════
  const DeliveryAdmin = {

    /**
     * Abre o modal de comprovante.
     * @param {number|string} supabaseOrderId — ID do pedido
     * @param {object} orderData — dados desnormalizados { nick, items, type }
     */
    openModal(supabaseOrderId, orderData) {
      // Remove modal anterior se existir
      const existing = document.getElementById('da-modal-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'da-modal-overlay';
      overlay.innerHTML = DeliveryAdmin._buildModalHTML(supabaseOrderId, orderData);
      document.body.appendChild(overlay);

      // Fechar ao clicar fora
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) DeliveryAdmin.closeModal();
      });

      // Setup drag & drop
      DeliveryAdmin._setupDrop(supabaseOrderId);

      // Anima entrada
      requestAnimationFrame(() => overlay.classList.add('da-open'));
    },

    closeModal() {
      const el = document.getElementById('da-modal-overlay');
      if (!el) return;
      el.classList.remove('da-open');
      setTimeout(() => el.remove(), 280);
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
            <span class="da-meta-chip da-chip-green">✓ Concluído</span>
            <span class="da-meta-chip">${nick}</span>
          </div>

          <div class="da-modal-info">
            <div class="da-info-row"><span>Serviço</span><strong>${service}</strong></div>
            <div class="da-info-row"><span>Pokémon</span><strong>${pokemon}</strong></div>
            <div class="da-info-row"><span>Tipo</span><strong>${tipo}</strong></div>
          </div>

          <div class="da-drop-zone" id="da-drop-zone" onclick="document.getElementById('da-file-input').click()">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(58,140,255,0.5)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <div class="da-drop-text">Arraste prints aqui ou clique para selecionar</div>
            <div class="da-drop-sub">JPEG, PNG, WebP — até 10MB cada</div>
            <input type="file" id="da-file-input" accept="image/*" multiple style="display:none"
              onchange="DeliveryAdmin._onFilesSelected(${orderId}, this.files)">
          </div>

          <div class="da-preview-grid" id="da-preview-grid"></div>

          <div class="da-progress-bar-wrap" id="da-progress-wrap" style="display:none">
            <div class="da-progress-bar">
              <div class="da-progress-fill" id="da-progress-fill"></div>
            </div>
            <div class="da-progress-label" id="da-progress-label">Enviando…</div>
          </div>

          <div class="da-modal-footer">
            <button class="da-btn da-btn-cancel" onclick="DeliveryAdmin.closeModal()">Cancelar</button>
            <button class="da-btn da-btn-submit" id="da-submit-btn"
              onclick="DeliveryAdmin._submit(${orderId}, ${JSON.stringify(JSON.stringify(orderData))})"
              disabled>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              REGISTRAR ENTREGA
            </button>
          </div>
        </div>
      `;
    },

    _files: [],  // arquivos selecionados

    _onFilesSelected(orderId, fileList) {
      const files = Array.from(fileList);
      DeliveryAdmin._files = DeliveryAdmin._files.concat(files);
      DeliveryAdmin._renderPreviews();
    },

    _renderPreviews() {
      const grid = document.getElementById('da-preview-grid');
      const btn  = document.getElementById('da-submit-btn');
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
    },

    _removeFile(index) {
      DeliveryAdmin._files.splice(index, 1);
      DeliveryAdmin._renderPreviews();
    },

    _setupDrop(orderId) {
      const zone = document.getElementById('da-drop-zone');
      if (!zone) return;

      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('da-drag-over');
      });
      zone.addEventListener('dragleave', () => zone.classList.remove('da-drag-over'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('da-drag-over');
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        DeliveryAdmin._files = DeliveryAdmin._files.concat(files);
        DeliveryAdmin._renderPreviews();
      });
    },

    async _submit(orderId, orderDataStr) {
      const orderData = typeof orderDataStr === 'string' ? JSON.parse(orderDataStr) : orderDataStr;
      const files = DeliveryAdmin._files;
      if (!files.length) return;

      const submitBtn    = document.getElementById('da-submit-btn');
      const progressWrap = document.getElementById('da-progress-wrap');
      const progressFill = document.getElementById('da-progress-fill');
      const progressLbl  = document.getElementById('da-progress-label');

      submitBtn.disabled = true;
      if (progressWrap) progressWrap.style.display = 'block';

      try {
        // Upload dos prints
        const prints = await DeliveryStorage.uploadMultiple(
          files,
          String(orderId),
          (done, total, name) => {
            const pct = total > 0 ? Math.round((done / total) * 90) : 0;
            if (progressFill) progressFill.style.width = pct + '%';
            if (progressLbl)  progressLbl.textContent  = done < total
              ? `Enviando ${done + 1}/${total}: ${name}`
              : 'Salvando registro…';
          }
        );

        // Salva no banco
        const payload = {
          pedido_id:    Number(orderId),
          user_id:      (Session.getUser && Session.getUser()?.id) || null,
          prints:       prints,
          descricao:    null,
          cliente_nick: orderData?.nick    || null,
          servico_nome: orderData?.service || null,
          pokemon_nome: orderData?.pokemon || null,
          tipo_pedido:  orderData?.tipo    || null,
          concluido_at: new Date().toISOString(),
        };

        await DeliveryDB.insert(payload);

        if (progressFill) progressFill.style.width = '100%';
        if (progressLbl)  progressLbl.textContent  = 'Entrega registrada!';

        // Reset e fecha
        DeliveryAdmin._files = [];
        setTimeout(() => {
          DeliveryAdmin.closeModal();
          if (window.OrdersNotifications && typeof OrdersNotifications.show === 'function') {
            OrdersNotifications.show('✅ Comprovante da entrega registrado!', 'concluido', 3500);
          }
        }, 800);

      } catch (err) {
        console.error('[DeliveryAdmin] Erro ao submeter:', err);
        if (progressLbl) progressLbl.textContent = '❌ Erro: ' + err.message;
        submitBtn.disabled = false;
      }
    },
  };

  // ══════════════════════════════════════════════════════════════════════════
  // DeliveryGallery — aba Entregas, grid moderna, lightbox, skeleton
  // ══════════════════════════════════════════════════════════════════════════
  const DeliveryGallery = {
    _data:        [],
    _lightboxIdx: 0,
    _lightboxAll: [], // array flat de { url, caption }
    _loaded:      false,

    /** Ponto de entrada principal: monta a aba Entregas */
    async init() {
      const container = document.getElementById('tab-entregas');
      if (!container) return;

      container.innerHTML = DeliveryGallery._buildShell();
      DeliveryGallery._injectStyles();
      await DeliveryGallery.refresh();

      // Hotkey ESC fecha lightbox
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') DeliveryGallery.closeLightbox();
        if (e.key === 'ArrowRight') DeliveryGallery.navLightbox(1);
        if (e.key === 'ArrowLeft')  DeliveryGallery.navLightbox(-1);
      });
    },

    async refresh() {
      const grid = document.getElementById('dg-grid');
      if (!grid) return;

      // Mostra skeletons
      grid.innerHTML = DeliveryGallery._buildSkeletons(6);

      try {
        const data = await DeliveryDB.list(200);
        DeliveryGallery._data = data || [];
        DeliveryGallery._loaded = true;
        DeliveryGallery._render();
      } catch (err) {
        console.error('[DeliveryGallery] Erro ao carregar:', err);
        grid.innerHTML = `
          <div class="dg-error">
            <div class="dg-error-icon">⚠️</div>
            <div>Erro ao carregar entregas</div>
            <div class="dg-error-sub">${err.message}</div>
            <button class="dg-retry-btn" onclick="DeliveryGallery.refresh()">Tentar novamente</button>
          </div>`;
      }
    },

    _render() {
      const grid      = document.getElementById('dg-grid');
      const countEl   = document.getElementById('dg-count');
      const data      = DeliveryGallery._data;

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

      // Monta lista flat para lightbox
      DeliveryGallery._lightboxAll = [];
      data.forEach(entry => {
        const prints = Array.isArray(entry.prints) ? entry.prints : [];
        prints.forEach(p => {
          DeliveryGallery._lightboxAll.push({
            url:     p.url,
            caption: `${entry.servico_nome || entry.pokemon_nome || 'Entrega'} — ${entry.cliente_nick || ''}`,
          });
        });
      });

      grid.innerHTML = '';
      const isAdmin = (global.Session && Session.isAdmin && Session.isAdmin()) ||
                      (global.OrdersAdmin && OrdersAdmin.isAdmin && OrdersAdmin.isAdmin(Session.getUser && Session.getUser()));

      data.forEach((entry, idx) => {
        const card = DeliveryGallery._buildCard(entry, idx, isAdmin);
        grid.appendChild(card);
      });

      // Lazy load com IntersectionObserver
      DeliveryGallery._setupLazyLoad();
    },

    _buildCard(entry, idx, isAdmin) {
      const prints  = Array.isArray(entry.prints) ? entry.prints : [];
      const mainImg = prints[0]?.url || '';
      const date    = entry.concluido_at
        ? new Date(entry.concluido_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' })
        : new Date(entry.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' });

      const thumb2 = prints[1] ? `<div class="dg-thumb" data-lb-idx="${DeliveryGallery._getLightboxIndex(entry, 1)}"><img data-src="${prints[1].url}" class="dg-lazy" alt="print 2"></div>` : '';
      const thumb3 = prints[2] ? `<div class="dg-thumb" data-lb-idx="${DeliveryGallery._getLightboxIndex(entry, 2)}"><img data-src="${prints[2].url}" class="dg-lazy" alt="print 3"></div>` : '';
      const more   = prints.length > 3 ? `<div class="dg-thumb dg-thumb-more" data-lb-idx="${DeliveryGallery._getLightboxIndex(entry, 3)}">+${prints.length - 3}</div>` : '';

      const hasThumbs = prints.length > 1;
      const mainLbIdx = DeliveryGallery._getLightboxIndex(entry, 0);

      const deleteBtnHTML = isAdmin
        ? `<button class="dg-card-delete" onclick="DeliveryGallery._deleteEntry('${entry.id}', event)" title="Remover entrega">🗑</button>`
        : '';

      const el = document.createElement('div');
      el.className = 'dg-card';
      el.innerHTML = `
        <div class="dg-card-img-wrap" onclick="DeliveryGallery.openLightbox(${mainLbIdx})">
          ${mainImg
            ? `<img class="dg-card-img dg-lazy" data-src="${mainImg}" alt="${entry.servico_nome || 'Entrega'}">`
            : `<div class="dg-card-img-placeholder">📷</div>`
          }
          <div class="dg-card-overlay">
            <div class="dg-card-overlay-icon">🔍</div>
          </div>
          ${deleteBtnHTML}
        </div>

        ${hasThumbs ? `
          <div class="dg-thumbs">
            ${thumb2}${thumb3}${more}
          </div>
        ` : ''}

        <div class="dg-card-body">
          <div class="dg-card-service">${entry.servico_nome || entry.pokemon_nome || '—'}</div>

          <div class="dg-card-row">
            ${entry.pokemon_nome ? `<span class="dg-card-pokemon">⚡ ${entry.pokemon_nome}</span>` : ''}
            ${entry.tipo_pedido  ? `<span class="dg-card-type">${entry.tipo_pedido}</span>` : ''}
          </div>

          <div class="dg-card-meta">
            <div class="dg-meta-item">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              ${entry.cliente_nick || '—'}
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

      // Clique nas thumbs
      el.querySelectorAll('.dg-thumb[data-lb-idx]').forEach(t => {
        t.addEventListener('click', (e) => {
          e.stopPropagation();
          DeliveryGallery.openLightbox(parseInt(t.dataset.lbIdx));
        });
      });

      return el;
    },

    /** Acha o índice global no array _lightboxAll para um print de uma entry */
    _getLightboxIndex(entry, printIndex) {
      const all   = DeliveryGallery._lightboxAll;
      const url   = Array.isArray(entry.prints) ? entry.prints[printIndex]?.url : null;
      if (!url) return 0;
      return Math.max(0, all.findIndex(x => x.url === url));
    },

    _setupLazyLoad() {
      if (!('IntersectionObserver' in window)) {
        // Fallback: carrega tudo
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
              img.src = img.dataset.src;
              img.onload = () => img.classList.add('dg-loaded');
              img.onerror = () => img.classList.add('dg-error-img');
              obs.unobserve(img);
            }
          }
        });
      }, { rootMargin: '200px' });

      document.querySelectorAll('#dg-grid .dg-lazy').forEach(img => obs.observe(img));
    },

    // ── Lightbox ────────────────────────────────────────────────────────────

    openLightbox(idx) {
      const all = DeliveryGallery._lightboxAll;
      if (!all.length) return;
      DeliveryGallery._lightboxIdx = Math.max(0, Math.min(idx, all.length - 1));
      DeliveryGallery._renderLightbox();

      const lb = document.getElementById('dg-lightbox');
      if (lb) {
        lb.classList.add('dg-lb-open');
        document.body.style.overflow = 'hidden';
      }
    },

    closeLightbox() {
      const lb = document.getElementById('dg-lightbox');
      if (lb) {
        lb.classList.remove('dg-lb-open');
        document.body.style.overflow = '';
      }
    },

    navLightbox(dir) {
      const all = DeliveryGallery._lightboxAll;
      if (!all.length) return;
      DeliveryGallery._lightboxIdx = (DeliveryGallery._lightboxIdx + dir + all.length) % all.length;
      DeliveryGallery._renderLightbox();
    },

    _renderLightbox() {
      const all     = DeliveryGallery._lightboxAll;
      const item    = all[DeliveryGallery._lightboxIdx];
      const imgEl   = document.getElementById('dg-lb-img');
      const capEl   = document.getElementById('dg-lb-caption');
      const counterEl = document.getElementById('dg-lb-counter');
      if (!item) return;
      if (imgEl) { imgEl.src = ''; imgEl.classList.remove('dg-lb-img-loaded'); imgEl.src = item.url; imgEl.onload = () => imgEl.classList.add('dg-lb-img-loaded'); }
      if (capEl) capEl.textContent = item.caption || '';
      if (counterEl) counterEl.textContent = `${DeliveryGallery._lightboxIdx + 1} / ${all.length}`;
    },

    // ── Admin: deletar entrega ───────────────────────────────────────────────

    async _deleteEntry(id, e) {
      if (e) e.stopPropagation();
      if (!confirm('Remover esta entrega? Os prints não serão deletados do Storage.')) return;
      try {
        await DeliveryDB.delete(id);
        DeliveryGallery._data = DeliveryGallery._data.filter(x => x.id !== id);
        DeliveryGallery._render();
      } catch (err) {
        alert('Erro ao remover: ' + err.message);
      }
    },

    // ── HTML estrutural ───────────────────────────────────────────────────────

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

        <!-- Lightbox -->
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

    // ── CSS injetado ─────────────────────────────────────────────────────────

    _injectStyles() {
      if (document.getElementById('dg-styles')) return;
      const s = document.createElement('style');
      s.id = 'dg-styles';
      s.textContent = `
/* ── DeliveryGallery Styles ─────────────────────────────── */

#tab-entregas {
  padding: 0 0 100px;
  min-height: 60vh;
}

/* Header */
.dg-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 24px 20px;
  gap: 16px;
}
.dg-header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 2px;
  color: rgba(255,255,255,0.92);
}
.dg-header-sub {
  font-size: 11px;
  color: rgba(255,255,255,0.3);
  margin-top: 4px;
  letter-spacing: 0.5px;
}
.dg-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.dg-count-badge {
  font-size: 11px;
  font-family: var(--font-mono, monospace);
  color: rgba(58,140,255,0.8);
  background: rgba(58,140,255,0.08);
  border: 1px solid rgba(58,140,255,0.2);
  border-radius: 20px;
  padding: 4px 12px;
  white-space: nowrap;
}
.dg-refresh-btn {
  width: 34px; height: 34px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}
.dg-refresh-btn:hover { background: rgba(58,140,255,0.1); border-color: rgba(58,140,255,0.3); color: #3a8cff; }

/* Grid moderna */
.dg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 0 16px 24px;
}

/* Card */
.dg-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  overflow: hidden;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  position: relative;
}
.dg-card:hover {
  transform: translateY(-3px);
  border-color: rgba(58,140,255,0.3);
  box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(58,140,255,0.15);
}

/* Imagem principal */
.dg-card-img-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16/10;
  overflow: hidden;
  cursor: pointer;
  background: rgba(0,0,0,0.3);
}
.dg-card-img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
  opacity: 0;
  transition: opacity 0.4s ease;
}
.dg-card-img.dg-loaded { opacity: 1; }
.dg-card-img-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 40px;
  color: rgba(255,255,255,0.1);
}

/* Overlay hover na imagem */
.dg-card-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0);
  display: flex; align-items: center; justify-content: center;
  transition: background 0.2s;
  pointer-events: none;
}
.dg-card-img-wrap:hover .dg-card-overlay { background: rgba(0,0,0,0.35); }
.dg-card-overlay-icon {
  font-size: 24px;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.2s;
}
.dg-card-img-wrap:hover .dg-card-overlay-icon { opacity: 1; transform: scale(1); }

/* Botão deletar admin */
.dg-card-delete {
  position: absolute;
  top: 8px; right: 8px;
  width: 28px; height: 28px;
  border-radius: 6px;
  background: rgba(0,0,0,0.7);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,80,80,0.8);
  font-size: 13px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 2;
}
.dg-card:hover .dg-card-delete { opacity: 1; }
.dg-card-delete:hover { background: rgba(200,0,0,0.5); color: #fff; }

/* Thumbnails extras */
.dg-thumbs {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: rgba(0,0,0,0.2);
}
.dg-thumb {
  flex: 1;
  aspect-ratio: 16/9;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  background: rgba(255,255,255,0.04);
  transition: opacity 0.2s;
}
.dg-thumb:hover { opacity: 0.8; }
.dg-thumb img {
  width: 100%; height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s;
  display: block;
}
.dg-thumb img.dg-loaded { opacity: 1; }
.dg-thumb-more {
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
  color: rgba(255,255,255,0.5);
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.08);
}

/* Body do card */
.dg-card-body {
  padding: 14px 16px 16px;
}
.dg-card-service {
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
  color: rgba(255,255,255,0.88);
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dg-card-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.dg-card-pokemon {
  font-size: 10px;
  font-family: var(--font-mono, monospace);
  color: #f5c842;
  background: rgba(245,200,66,0.08);
  border: 1px solid rgba(245,200,66,0.2);
  border-radius: 20px;
  padding: 2px 8px;
  letter-spacing: 0.3px;
}
.dg-card-type {
  font-size: 10px;
  color: rgba(58,140,255,0.9);
  background: rgba(58,140,255,0.07);
  border: 1px solid rgba(58,140,255,0.18);
  border-radius: 20px;
  padding: 2px 8px;
  letter-spacing: 0.3px;
}
.dg-card-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.dg-meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: rgba(255,255,255,0.4);
}
.dg-meta-item svg { flex-shrink: 0; opacity: 0.5; }
.dg-card-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #5ae698;
  background: rgba(90,230,152,0.08);
  border: 1px solid rgba(90,230,152,0.2);
  border-radius: 20px;
  padding: 3px 10px;
}

/* Empty / Error */
.dg-empty {
  grid-column: 1/-1;
  text-align: center;
  padding: 80px 20px;
  color: rgba(255,255,255,0.3);
}
.dg-empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.4; }
.dg-empty-title { font-size: 15px; font-weight: 600; margin-bottom: 6px; color: rgba(255,255,255,0.5); }
.dg-empty-sub { font-size: 12px; }
.dg-error {
  grid-column: 1/-1;
  text-align: center;
  padding: 60px 20px;
  color: rgba(255,100,100,0.7);
}
.dg-error-icon { font-size: 40px; margin-bottom: 12px; }
.dg-error-sub { font-size: 11px; margin-top: 4px; opacity: 0.7; }
.dg-retry-btn {
  margin-top: 16px;
  padding: 8px 20px;
  background: rgba(58,140,255,0.1);
  border: 1px solid rgba(58,140,255,0.3);
  border-radius: 8px;
  color: #3a8cff;
  cursor: pointer;
  font-size: 12px;
}

/* Skeleton */
.dg-skeleton { pointer-events: none; }
.dg-skel-img {
  width: 100%; aspect-ratio: 16/10;
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
  background-size: 200% 100%;
  animation: dg-shimmer 1.4s infinite;
}
.dg-skel-line {
  height: 10px; border-radius: 5px; margin-bottom: 8px;
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
  background-size: 200% 100%;
  animation: dg-shimmer 1.4s infinite;
}
.dg-skel-line--lg { width: 75%; }
.dg-skel-line--md { width: 50%; }
.dg-skel-line--sm { width: 30%; }
@keyframes dg-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Lightbox ────────────────────────────────────────────── */
.dg-lightbox {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.96);
  display: none;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
}
.dg-lightbox.dg-lb-open { display: flex; }
.dg-lb-center {
  max-width: min(92vw, 1000px);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}
.dg-lb-img {
  max-width: 100%;
  max-height: 78vh;
  object-fit: contain;
  border-radius: 8px;
  opacity: 0;
  transition: opacity 0.3s;
  display: block;
}
.dg-lb-img.dg-lb-img-loaded { opacity: 1; }
.dg-lb-footer {
  display: flex; align-items: center; justify-content: space-between;
  width: 100%; gap: 16px;
}
.dg-lb-caption {
  font-size: 13px;
  color: rgba(255,255,255,0.55);
  font-family: var(--font-mono, monospace);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dg-lb-counter {
  font-size: 11px;
  color: rgba(255,255,255,0.3);
  white-space: nowrap;
}
.dg-lb-nav {
  width: 44px; height: 44px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 50%;
  color: rgba(255,255,255,0.6);
  font-size: 24px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}
.dg-lb-nav:hover { background: rgba(58,140,255,0.15); border-color: rgba(58,140,255,0.4); color: #fff; }
.dg-lb-close {
  position: fixed; top: 16px; right: 16px;
  width: 40px; height: 40px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 50%;
  color: rgba(255,255,255,0.7);
  font-size: 16px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
  z-index: 10000;
}
.dg-lb-close:hover { background: rgba(200,0,0,0.4); color: #fff; }

/* ── DeliveryAdmin Modal ─────────────────────────────────── */
#da-modal-overlay {
  position: fixed; inset: 0; z-index: 9000;
  background: rgba(0,0,0,0.85);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  opacity: 0; transition: opacity 0.25s;
}
#da-modal-overlay.da-open { opacity: 1; }
.da-modal {
  width: 100%; max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  background: #0f1623;
  border: 1px solid rgba(58,140,255,0.25);
  border-radius: 16px;
  display: flex; flex-direction: column;
  gap: 16px;
  padding: 20px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(58,140,255,0.1);
}
.da-modal-header {
  display: flex; align-items: center; justify-content: space-between;
}
.da-modal-title {
  display: flex; align-items: center; gap: 10px;
  font-family: var(--font-title, 'Cinzel', serif);
  font-size: 13px; font-weight: 700; letter-spacing: 2px;
  color: rgba(255,255,255,0.88);
}
.da-modal-close {
  width: 32px; height: 32px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: rgba(255,255,255,0.5);
  cursor: pointer; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.da-modal-close:hover { background: rgba(200,0,0,0.3); color: #fff; }
.da-modal-meta {
  display: flex; gap: 8px; flex-wrap: wrap;
}
.da-meta-chip {
  font-size: 10px; font-weight: 600; letter-spacing: 0.5px;
  padding: 3px 10px; border-radius: 20px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5);
}
.da-chip-green {
  background: rgba(90,230,152,0.08);
  border-color: rgba(90,230,152,0.25);
  color: #5ae698;
}
.da-modal-info {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex; flex-direction: column; gap: 8px;
}
.da-info-row {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 12px;
  color: rgba(255,255,255,0.4);
}
.da-info-row strong { color: rgba(255,255,255,0.8); font-weight: 600; }

/* Drop zone */
.da-drop-zone {
  border: 2px dashed rgba(58,140,255,0.25);
  border-radius: 12px;
  padding: 28px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.da-drop-zone:hover, .da-drop-zone.da-drag-over {
  border-color: rgba(58,140,255,0.6);
  background: rgba(58,140,255,0.05);
}
.da-drop-text { font-size: 13px; color: rgba(255,255,255,0.5); }
.da-drop-sub  { font-size: 11px; color: rgba(255,255,255,0.25); }

/* Preview grid */
.da-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 8px;
}
.da-preview-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0,0,0,0.3);
}
.da-preview-item img {
  width: 100%; aspect-ratio: 1;
  object-fit: cover; display: block;
}
.da-preview-remove {
  position: absolute; top: 4px; right: 4px;
  width: 20px; height: 20px;
  background: rgba(0,0,0,0.75);
  border: none; border-radius: 50%;
  color: rgba(255,100,100,0.9);
  font-size: 11px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.da-preview-name {
  font-size: 9px; color: rgba(255,255,255,0.3);
  padding: 3px 5px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* Progress */
.da-progress-bar-wrap { display: flex; flex-direction: column; gap: 6px; }
.da-progress-bar {
  height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.06);
  overflow: hidden;
}
.da-progress-fill {
  height: 100%; border-radius: 2px;
  background: linear-gradient(90deg, #3a8cff, #60aaff);
  transition: width 0.3s ease;
  width: 0%;
}
.da-progress-label { font-size: 11px; color: rgba(255,255,255,0.4); }

/* Footer */
.da-modal-footer { display: flex; gap: 10px; justify-content: flex-end; }
.da-btn {
  padding: 10px 20px; border-radius: 10px;
  font-size: 12px; font-weight: 700; letter-spacing: 0.8px;
  cursor: pointer;
  display: flex; align-items: center; gap: 7px;
  transition: all 0.2s;
}
.da-btn-cancel {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5);
}
.da-btn-cancel:hover { background: rgba(255,255,255,0.08); }
.da-btn-submit {
  background: rgba(58,140,255,0.15);
  border: 1px solid rgba(58,140,255,0.35);
  color: #3a8cff;
  min-width: 180px;
  justify-content: center;
}
.da-btn-submit:hover:not(:disabled) {
  background: rgba(58,140,255,0.25);
  border-color: rgba(58,140,255,0.55);
  color: #fff;
}
.da-btn-submit:disabled { opacity: 0.35; cursor: not-allowed; }

/* ── Mobile ──────────────────────────────────────────────── */
@media (max-width: 768px) {
  .dg-header { padding: 16px 16px 14px; }
  .dg-header-title { font-size: 13px; letter-spacing: 1.5px; }
  .dg-grid {
    grid-template-columns: 1fr;
    padding: 0 12px 20px;
    gap: 12px;
  }
  .dg-lb-nav { display: none; }
  .dg-lightbox { padding: 8px; }
  .dg-lb-img { max-height: 75vh; }
  .da-modal { padding: 16px; gap: 14px; }
  .da-modal-title { font-size: 11px; letter-spacing: 1.5px; }
  .da-drop-zone { padding: 20px; }
}
      `;
      document.head.appendChild(s);
    },
  };

  // ── Expõe globalmente ──────────────────────────────────────────────────────
  global.DeliveryDB      = DeliveryDB;
  global.DeliveryStorage = DeliveryStorage;
  global.DeliveryAdmin   = DeliveryAdmin;
  global.DeliveryGallery = DeliveryGallery;

  // ── Inicializa galeria ao entrar na aba ─────────────────────────────────────
  function _onEntregasTab(tab) {
    if (tab === 'entregas') {
      if (!DeliveryGallery._loaded) {
        DeliveryGallery.init();
      } else {
        DeliveryGallery.refresh();
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Registra hook na aba via NavRuntime
    if (window.NavRuntime && typeof NavRuntime.onTabSwitch === 'function') {
      NavRuntime.onTabSwitch('after', 'delivery-system-gallery', _onEntregasTab);
    }

    // Se já estiver na aba entregas na carga inicial
    const activeTab = document.querySelector('.tab-content.active')?.id;
    if (activeTab === 'tab-entregas') {
      DeliveryGallery.init();
    }
  });

})(typeof window !== 'undefined' ? window : this);
