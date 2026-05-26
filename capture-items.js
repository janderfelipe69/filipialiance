// ============================================================
// capture-items.js — Partial Delivery System v1
// PokeAlliance Shop — FASE 5.3.1
//
// RESPONSABILIDADES:
//   • Normalizar order.captureItems a partir de order.items
//   • Gerar item_ref únicos por pokémon (mesmo pokémons iguais)
//   • Lógica de entrega parcial (item individual)
//   • Determinar quando o pedido completo deve ser concluído
//   • Adaptar pedidos legados (sem captureItems)
//   • Expor PA.captureItems API
//
// REGRAS DE NEGÓCIO:
//   • Pokémons IGUAIS precisam de item_ref DIFERENTE
//   • 1 print por pokémon (não compartilhada)
//   • Pedido só conclui quando TODOS captureItems.status === 'completed'
//   • Pedidos legacy continuam funcionando sem captureItems
//
// ZERO SQL necessário para esta fase.
// O campo itens JSONB já existe e aceita os campos novos.
//
// CARREGUE: após pa-hardening.js, antes de orders-admin.js
// ============================================================

;(function (global) {
  'use strict';

  if (!global.PA) { console.warn('[CaptureItems] PA namespace não encontrado.'); return; }
  if (global.PA.captureItems) return; // singleton

  var _log  = function() { if (global.PA_DEBUG) console.log.apply(console, ['[CaptureItems]'].concat([].slice.call(arguments))); };
  var _warn = function() { console.warn.apply(console, ['[CaptureItems ⚠️]'].concat([].slice.call(arguments))); };

  function _tel(cat, data) {
    if (global.PA && global.PA.telemetry) global.PA.telemetry.push(cat, data);
  }

  // ══════════════════════════════════════════════════════════════════════
  // 1. ITEM_REF GENERATION
  // Gera item_ref únicos por pokémon — mesmo pokémons iguais recebem refs distintos.
  // Formato: ORD{id}_PK_{índice}
  // ══════════════════════════════════════════════════════════════════════

  function generateItemRef(orderId, index) {
    var id = String(orderId || 'X').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase();
    return 'ORD' + id + '_PK_' + (index + 1);
  }

  // ══════════════════════════════════════════════════════════════════════
  // 2. ITERA ITENS JSONB → captureItems normalizados
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Normaliza um item individual do JSONB em um captureItem estruturado.
   * @param {Object} rawItem  Item do campo itens[] do Supabase
   * @param {*}      orderId  ID do pedido (para gerar item_ref)
   * @param {number} index    Índice no array de capturas
   */
  function normalizeRawCaptureItem(rawItem, orderId, index) {
    if (!rawItem) return null;

    // Normaliza tier
    var tier = rawItem.tier || rawItem.tag || '';
    var tierLabel = (global.QueuePrivacy && global.QueuePrivacy.normalizeTierLabel)
      ? global.QueuePrivacy.normalizeTierLabel(tier)
      : tier.toUpperCase();

    // item_ref: usa o existente se já tiver, gera novo caso contrário
    var itemRef = rawItem.item_ref || rawItem.id || generateItemRef(orderId, index);

    // Status do item
    var status = rawItem.status || (rawItem.concluido ? 'completed' : 'pending');

    return {
      item_ref:   itemRef,
      pokemon:    rawItem.pokemon || rawItem.nome || '',  // nome real — visível apenas para dono/admin
      tier:       tier,
      tierLabel:  tierLabel,
      ball_type:  rawItem.ball_type || '',
      ball:       rawItem.ball || '',
      qty:        parseInt(rawItem.quantidade || rawItem.qty || rawItem.qtdTotal || 1, 10),
      // Lifecycle
      status:             status,
      started_at:         rawItem.started_at         || null,
      completed_at:       rawItem.completed_at        || null,
      actual_duration_minutes: rawItem.actual_duration_minutes || null,
      // Proof de entrega (item_ref vinculado)
      delivery_proof_id:  rawItem.delivery_proof_id  || null,
      delivery_image_url: rawItem.delivery_image_url || null,
      delivery_notes:     rawItem.delivery_notes      || null,
    };
  }

  /**
   * Extrai e normaliza captureItems de um order já normalizado pelo OrdersStorage.
   * Funciona tanto para pedidos novos (com type:'capture') quanto para legados.
   *
   * @param {Object} order  Pedido normalizado (output de _supabaseToOrderStorage)
   * @returns {Array}       Array de captureItems normalizados, ou [] se não for captura
   */
  function extractCaptureItems(order) {
    if (!order) return [];

    var items = order.items || [];
    var orderId = order._supabaseId || order.orderNumber || order.id;

    // Filtra apenas itens de captura
    var captureRaws = items.filter(function(it) {
      if (!it) return false;
      if (it.type === 'capture') return true;
      if (it.pokemon) return true;
      // Pedido legado: se service_type é pokemon, tratar o único item como captura
      if (!it.type && (order.service_type || '').includes('pokemon')) return true;
      return false;
    });

    if (!captureRaws.length) return [];

    var captureIdx = 0;
    return captureRaws.map(function(raw) {
      return normalizeRawCaptureItem(raw, orderId, captureIdx++);
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // 3. NORMALIZADOR DE PEDIDOS LEGADOS
  // Adapta pedidos antigos para o modelo captureItems sem quebrar nada.
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Verifica se um order é legado (sem captureItems explícitos).
   */
  function isLegacyOrder(order) {
    if (!order) return true;
    // É legado se não tem items de captura normalizados
    return !extractCaptureItems(order).length;
  }

  /**
   * Cria um captureItem sintético para pedidos legados de captura.
   * Permite que o UI funcione mesmo sem dados detalhados.
   */
  function normalizeLegacyOrder(order) {
    if (!order) return order;

    var serviceType = (order.service_type || '').toLowerCase();
    var isCaptura = serviceType.includes('pokemon') || serviceType.includes('capture');

    if (!isCaptura) return order;  // não é pedido de captura

    // Já tem captureItems? Não precisa adaptar
    var existing = extractCaptureItems(order);
    if (existing.length) return order;

    // Cria item sintético único
    var orderId = order._supabaseId || order.orderNumber || order.id;
    var tierLabel = serviceType.includes('_sr') || serviceType.includes('sr')
      ? 'SR' : '';

    var syntheticItem = {
      item_ref:   generateItemRef(orderId, 0),
      pokemon:    order.nickname || '',  // legado: usa nick como proxy
      tier:       tierLabel.toLowerCase(),
      tierLabel:  tierLabel,
      ball_type:  '',
      ball:       '',
      qty:        parseInt(order.service_quantity || 1, 10),
      status:     (order.status_v3 === 'completed') ? 'completed' : (order.status_v3 === 'in_progress' ? 'in_progress' : 'pending'),
      started_at:   order.started_at || null,
      completed_at: order.completed_at || null,
      actual_duration_minutes: order.actual_duration_minutes || null,
      delivery_proof_id:  null,
      delivery_image_url: null,
      delivery_notes:     null,
      _isLegacy:   true,  // marca como sintético
    };

    // Anexa ao order (mutação in-place — compatível com render pipeline)
    order._captureItems = [syntheticItem];
    return order;
  }

  // ══════════════════════════════════════════════════════════════════════
  // 4. LÓGICA DE CONCLUSÃO DE PEDIDO
  // Pedido só conclui quando TODOS os captureItems estão 'completed'.
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Verifica se todos os captureItems estão concluídos.
   * @returns {boolean}
   */
  function areAllItemsComplete(captureItems) {
    if (!captureItems || !captureItems.length) return false;
    return captureItems.every(function(it) { return it.status === 'completed'; });
  }

  /**
   * Determina o status agregado do pedido com base nos captureItems.
   * @param {Array} captureItems
   * @returns {'pending'|'in_progress'|'partial'|'completed'}
   */
  function getAggregateStatus(captureItems) {
    if (!captureItems || !captureItems.length) return 'pending';
    var statuses = captureItems.map(function(it) { return it.status; });
    if (statuses.every(function(s) { return s === 'completed'; })) return 'completed';
    if (statuses.every(function(s) { return s === 'pending'; }))   return 'pending';
    if (statuses.some(function(s) { return s === 'completed'; }))  return 'partial';
    return 'in_progress';
  }

  /**
   * Conta quantos items estão em cada status.
   */
  function countByStatus(captureItems) {
    var counts = { pending: 0, in_progress: 0, partial: 0, completed: 0 };
    (captureItems || []).forEach(function(it) {
      counts[it.status] = (counts[it.status] || 0) + 1;
    });
    return counts;
  }

  // ══════════════════════════════════════════════════════════════════════
  // 5. TIMER INDIVIDUAL POR ITEM
  // PA.pipeline.computeServiceDuration já existe — apenas wrappamos
  // para aceitar um item individual como segundo argumento.
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Calcula duração de serviço para um captureItem individual.
   * Aceita tanto o pedido (retrocompatível) quanto um item individual.
   *
   * @param {Object} orderOrItem  Pedido completo OU captureItem individual
   * @returns {Object}  { durationMs, durationFmt, source, startedAt, completedAt, warning }
   */
  function computeItemDuration(orderOrItem) {
    if (!orderOrItem) return { durationMs: null, durationFmt: null, source: 'none', warning: 'null input' };

    // Delega para o engine central se disponível
    if (global.PA && global.PA.pipeline && typeof global.PA.pipeline.computeServiceDuration === 'function') {
      return global.PA.pipeline.computeServiceDuration(orderOrItem);
    }

    // Fallback inline (mesma lógica do engine)
    var startedAt   = orderOrItem.started_at   || orderOrItem.startedAt   || null;
    var completedAt = orderOrItem.completed_at  || orderOrItem.completedAt || null;

    if (orderOrItem.actual_duration_minutes) {
      var ms1 = parseFloat(orderOrItem.actual_duration_minutes) * 60000;
      return { durationMs: ms1, durationFmt: _fmtMs(ms1), source: 'actual_minutes', startedAt: startedAt, completedAt: completedAt, warning: null };
    }
    if (startedAt && completedAt) {
      var ms2 = new Date(completedAt).getTime() - new Date(startedAt).getTime();
      if (ms2 > 0) return { durationMs: ms2, durationFmt: _fmtMs(ms2), source: 'timestamps', startedAt: startedAt, completedAt: completedAt, warning: null };
    }
    return { durationMs: null, durationFmt: null, source: 'none', startedAt: startedAt, completedAt: completedAt, warning: null };
  }

  function _fmtMs(ms) {
    if (!ms) return '—';
    var m = Math.floor(ms / 60000);
    var h = Math.floor(m / 60);
    var d = Math.floor(h / 24);
    if (d > 0) return d + 'd ' + (h % 24) + 'h';
    if (h > 0) return h + 'h ' + (m % 60) + 'm';
    return m + 'm';
  }

  // ══════════════════════════════════════════════════════════════════════
  // 6. UPDATE PARCIAL DE ITEM NO JSONB (sem SQL próprio)
  // Atualiza o item dentro do campo itens[] via PATCH na tabela pedidos.
  // Lógica: carrega itens[], atualiza o item com item_ref, salva de volta.
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Atualiza campos de um item específico no pedido (via PATCH ao Supabase).
   * Não altera outros itens do pedido.
   *
   * @param {*}      supabaseOrderId  ID do pedido no Supabase
   * @param {string} itemRef          item_ref do captureItem a atualizar
   * @param {Object} patch            Campos a atualizar no item
   * @returns {Promise<boolean>}
   */
  async function updateCaptureItemInOrder(supabaseOrderId, itemRef, patch) {
    if (!supabaseOrderId || !itemRef || !patch) return false;

    var jwt = (typeof Session !== 'undefined' && Session.getAccessToken)
      ? Session.getAccessToken() : null;
    if (!jwt) { _warn('updateCaptureItemInOrder: sem JWT'); return false; }

    var SB_URL = global.SUPABASE_URL || (global.PA && global.PA.state && global.PA.state.appConfig && global.PA.state.appConfig.url);
    if (!SB_URL) { _warn('updateCaptureItemInOrder: SUPABASE_URL não encontrado'); return false; }

    try {
      // 1. Carrega itens[] atuais do pedido
      var res = await fetch(
        SB_URL + '/rest/v1/pedidos?id=eq.' + supabaseOrderId + '&select=itens&limit=1',
        {
          headers: {
            'apikey':        global.SUPABASE_KEY,
            'Authorization': 'Bearer ' + jwt,
          },
        }
      );
      if (!res.ok) throw new Error('GET pedidos HTTP ' + res.status);

      var rows = await res.json();
      if (!rows || !rows[0]) throw new Error('Pedido não encontrado');

      var itens = rows[0].itens;
      if (typeof itens === 'string') { try { itens = JSON.parse(itens); } catch(e) { itens = []; } }
      if (!Array.isArray(itens)) itens = [];

      // 2. Localiza o item pelo item_ref
      var found = false;
      var updatedItens = itens.map(function(it) {
        // Compara pelo item_ref (ou id para compatibilidade)
        if ((it.item_ref && it.item_ref === itemRef) || (it.id && it.id === itemRef)) {
          found = true;
          return Object.assign({}, it, patch);
        }
        return it;
      });

      if (!found) {
        _warn('updateCaptureItemInOrder: item_ref não encontrado:', itemRef);
        _tel('capture-item-update', { error: 'item_ref not found', itemRef: itemRef });
        return false;
      }

      // 3. Determina se o pedido inteiro deve ser concluído
      // Só conclui se todos os captureItems estiverem completed após este patch
      var allDone = updatedItens
        .filter(function(it) { return it.type === 'capture' || it.pokemon; })
        .every(function(it) {
          var st = it.status || (it.concluido ? 'completed' : 'pending');
          return st === 'completed';
        });

      // 4. PATCH no campo itens[] do pedido
      var patchBody = { itens: updatedItens };
      if (allDone && patch.status === 'completed') {
        patchBody.status_v3    = 'completed';
        patchBody.status       = 'concluido';
        patchBody.completed_at = new Date().toISOString();
        _log('Todos os itens concluídos — pedido', supabaseOrderId, 'será marcado como completed');
      }

      var patchRes = await fetch(
        SB_URL + '/rest/v1/pedidos?id=eq.' + supabaseOrderId,
        {
          method: 'PATCH',
          headers: {
            'Content-Type':  'application/json',
            'apikey':        global.SUPABASE_KEY,
            'Authorization': 'Bearer ' + jwt,
            'Prefer':        'return=minimal',
          },
          body: JSON.stringify(patchBody),
        }
      );

      if (!patchRes.ok) {
        var errText = await patchRes.text().catch(function() { return ''; });
        throw new Error('PATCH pedidos HTTP ' + patchRes.status + ': ' + errText.slice(0, 100));
      }

      _log('CaptureItem atualizado:', itemRef, '| allDone:', allDone);
      _tel('capture-item-update', { itemRef: itemRef, allDone: allDone, patch: Object.keys(patch) });

      return { success: true, allDone: allDone };

    } catch (err) {
      _warn('updateCaptureItemInOrder: erro:', err.message);
      _tel('capture-item-update', { error: err.message, itemRef: itemRef });
      return false;
    }
  }

  /**
   * Marca um captureItem como iniciado (in_progress).
   * Grava started_at no item individual.
   */
  async function startCaptureItem(supabaseOrderId, itemRef) {
    return updateCaptureItemInOrder(supabaseOrderId, itemRef, {
      status:     'in_progress',
      started_at: new Date().toISOString(),
    });
  }

  /**
   * Marca um captureItem como concluído.
   * Se for o último item, conclui o pedido inteiro automaticamente.
   *
   * @param {*}      supabaseOrderId
   * @param {string} itemRef
   * @param {Object} opts  { image_url, notes, delivery_proof_id, actual_duration_minutes }
   */
  async function completeCaptureItem(supabaseOrderId, itemRef, opts) {
    opts = opts || {};
    var completedAt = new Date().toISOString();
    var startedRef  = null;

    // Calcula duração se não fornecida
    if (!opts.actual_duration_minutes && opts._started_at) {
      var elapsedMs = Date.now() - new Date(opts._started_at).getTime();
      opts.actual_duration_minutes = Math.round(elapsedMs / 60000);
    }

    var patch = {
      status:       'completed',
      completed_at: completedAt,
      concluido:    true,
    };
    if (opts.actual_duration_minutes) patch.actual_duration_minutes = opts.actual_duration_minutes;
    if (opts.image_url)         patch.delivery_image_url  = opts.image_url;
    if (opts.notes)             patch.delivery_notes       = opts.notes;
    if (opts.delivery_proof_id) patch.delivery_proof_id   = opts.delivery_proof_id;

    return updateCaptureItemInOrder(supabaseOrderId, itemRef, patch);
  }

  // ══════════════════════════════════════════════════════════════════════
  // 7. UI HELPERS — renderiza sub-itens de captura
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Status config visual por item.
   */
  var ITEM_STATUS_CONFIG = {
    pending:     { icon: '📦', label: 'Aguardando',  color: 'rgba(255,255,255,0.4)',  cssClass: 'ci-pending'     },
    in_progress: { icon: '⏳', label: 'Em andamento', color: '#60a5fa',               cssClass: 'ci-in-progress' },
    partial:     { icon: '⚡', label: 'Em andamento', color: '#fbbf24',               cssClass: 'ci-partial'     },
    completed:   { icon: '✅', label: 'Entregue',     color: '#4ade80',               cssClass: 'ci-completed'   },
  };

  /**
   * Renderiza HTML de um captureItem para exibição pública (terceiros).
   * NÃO mostra o nome do pokémon — apenas tier e status.
   */
  function renderCaptureItemPublic(captureItem) {
    if (!captureItem) return '';
    var cfg = ITEM_STATUS_CONFIG[captureItem.status] || ITEM_STATUS_CONFIG.pending;
    var tierBadge = captureItem.tierLabel
      ? '<span class="order-item-tier-badge order-item-tier--' + captureItem.tierLabel.toLowerCase() + '">' + captureItem.tierLabel + '</span>'
      : '';
    var duration = '';
    if (captureItem.status === 'completed' && captureItem.actual_duration_minutes) {
      var d = computeItemDuration(captureItem);
      duration = d.durationFmt ? ' <span class="ci-duration">em ' + d.durationFmt + '</span>' : '';
    }

    return [
      '<div class="capture-item capture-item--' + cfg.cssClass + '" data-item-ref="' + _esc(captureItem.item_ref) + '">',
      '  <div class="capture-item-header">',
      '    ' + tierBadge,
      '    <span class="capture-item-status" style="color:' + cfg.color + '">',
      '      ' + cfg.icon + ' ' + cfg.label + duration,
      '    </span>',
      '  </div>',
      '</div>',
    ].join('\n');
  }

  /**
   * Renderiza HTML de um captureItem para admin/owner (com nome real).
   */
  function renderCaptureItemPrivileged(captureItem, isAdmin) {
    if (!captureItem) return '';
    var cfg = ITEM_STATUS_CONFIG[captureItem.status] || ITEM_STATUS_CONFIG.pending;
    var tierBadge = captureItem.tierLabel
      ? '<span class="order-item-tier-badge order-item-tier--' + captureItem.tierLabel.toLowerCase() + '">' + captureItem.tierLabel + '</span>'
      : '';
    var pokeName = captureItem._isLegacy ? '' : ('<span class="ci-pokemon-name">' + _esc(captureItem.pokemon || '') + '</span>');
    var ballBadge = captureItem.ball
      ? '<span class="ci-ball">' + _esc(captureItem.ball) + '</span>' : '';
    var duration = '';
    if (captureItem.status === 'completed') {
      var d = computeItemDuration(captureItem);
      if (d.durationFmt) duration = ' <span class="ci-duration">em ' + d.durationFmt + '</span>';
    }
    var deliveryImg = (captureItem.delivery_image_url && captureItem.status === 'completed')
      ? '<a href="' + _esc(captureItem.delivery_image_url) + '" target="_blank" class="ci-proof-link">Ver comprovante</a>'
      : '';
    // Admin action buttons (start/complete per item)
    var adminBtns = '';
    if (isAdmin) {
      if (captureItem.status === 'pending') {
        adminBtns = '<button class="ci-btn ci-btn--start" onclick="PA.captureItems.startItem(event)" data-item-ref="' + _esc(captureItem.item_ref) + '">▶ Iniciar</button>';
      } else if (captureItem.status === 'in_progress') {
        adminBtns = '<button class="ci-btn ci-btn--complete" onclick="PA.captureItems.completeItem(event)" data-item-ref="' + _esc(captureItem.item_ref) + '">✓ Concluir</button>';
      }
    }

    return [
      '<div class="capture-item capture-item--' + cfg.cssClass + '" data-item-ref="' + _esc(captureItem.item_ref) + '">',
      '  <div class="capture-item-header">',
      '    ' + tierBadge,
      '    ' + pokeName,
      '    ' + ballBadge,
      '    <span class="capture-item-status" style="color:' + cfg.color + '">',
      '      ' + cfg.icon + ' ' + cfg.label + duration,
      '    </span>',
      '  </div>',
      (deliveryImg ? '  <div class="ci-proof">' + deliveryImg + '</div>' : ''),
      (adminBtns   ? '  <div class="ci-actions">' + adminBtns + '</div>' : ''),
      '</div>',
    ].filter(Boolean).join('\n');
  }

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ══════════════════════════════════════════════════════════════════════
  // 8. EVENT HANDLERS para botões de item (delegação)
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Handler do botão "Iniciar" por item.
   * Lê data-item-ref e data-order-id do card pai.
   */
  async function startItem(event) {
    var btn      = event.target;
    var itemEl   = btn.closest('[data-item-ref]');
    var cardEl   = btn.closest('[data-order-id]');
    if (!itemEl || !cardEl) return;

    var itemRef  = itemEl.getAttribute('data-item-ref');
    var orderId  = cardEl.getAttribute('data-order-id');
    if (!itemRef || !orderId) return;

    // Resolve supabaseId do orderId (formato 'sb_123')
    var supabaseId = orderId.startsWith('sb_') ? orderId.slice(3) : orderId;

    btn.disabled = true;
    btn.textContent = '⏳';

    var result = await startCaptureItem(supabaseId, itemRef);
    if (result && result.success) {
      itemEl.querySelector('.capture-item-status').textContent = '⏳ Em andamento';
      itemEl.classList.remove('ci-pending');
      itemEl.classList.add('ci-in-progress');
      btn.replaceWith(_makeCompleteBtn(itemRef));
    } else {
      btn.disabled = false;
      btn.textContent = '▶ Iniciar';
      if (typeof showToast === 'function') showToast('Erro ao iniciar item. Tente novamente.', 'error');
    }
  }

  /**
   * Handler do botão "Concluir" por item.
   * Pede confirmação e faz upload de proof opcional.
   */
  async function completeItem(event) {
    var btn    = event.target;
    var itemEl = btn.closest('[data-item-ref]');
    var cardEl = btn.closest('[data-order-id]');
    if (!itemEl || !cardEl) return;

    var itemRef  = itemEl.getAttribute('data-item-ref');
    var orderId  = cardEl.getAttribute('data-order-id');
    if (!itemRef || !orderId) return;

    var supabaseId = orderId.startsWith('sb_') ? orderId.slice(3) : orderId;

    var confirmed = (typeof showConfirmModal === 'function')
      ? await showConfirmModal({ title: 'Concluir item', message: 'Marcar este pokémon como entregue?', confirmText: 'Concluir', cancelText: 'Cancelar', type: 'success' })
      : true;

    if (!confirmed) return;

    btn.disabled = true;
    btn.textContent = '⏳';

    var result = await completeCaptureItem(supabaseId, itemRef, {});
    if (result && result.success) {
      itemEl.querySelector('.capture-item-status').textContent = '✅ Entregue';
      itemEl.classList.remove('ci-in-progress');
      itemEl.classList.add('ci-completed');
      btn.remove();

      if (result.allDone) {
        if (typeof showToast === 'function') showToast('✅ Todos os pokémons entregues! Pedido concluído.', 'success');
        // Dispara refresh da fila
        if (typeof pedidosCarregar === 'function') setTimeout(pedidosCarregar, 400);
        else if (typeof OrdersUI !== 'undefined') setTimeout(function(){ OrdersUI.refresh(); }, 400);
      } else {
        if (typeof showToast === 'function') showToast('✅ Item entregue! Restam outros itens.', 'info');
        if (typeof OrdersUI !== 'undefined') setTimeout(function(){ OrdersUI.refresh(); }, 400);
      }
    } else {
      btn.disabled = false;
      btn.textContent = '✓ Concluir';
      if (typeof showToast === 'function') showToast('Erro ao concluir item.', 'error');
    }
  }

  function _makeCompleteBtn(itemRef) {
    var btn = global.document.createElement('button');
    btn.className = 'ci-btn ci-btn--complete';
    btn.textContent = '✓ Concluir';
    btn.setAttribute('data-item-ref', itemRef);
    btn.setAttribute('onclick', 'PA.captureItems.completeItem(event)');
    return btn;
  }

  // ══════════════════════════════════════════════════════════════════════
  // 9. CSS para capture items
  // ══════════════════════════════════════════════════════════════════════

  function _injectCSS() {
    if (global.document.getElementById('pa-capture-items-css')) return;
    var style = global.document.createElement('style');
    style.id = 'pa-capture-items-css';
    style.textContent = [
      /* Container de capture items */
      '.capture-items-list { display:flex; flex-direction:column; gap:6px; padding:8px 0; }',

      /* Card individual */
      '.capture-item { display:flex; flex-direction:column; gap:4px;',
      '  padding:8px 12px; border-radius:8px;',
      '  background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); }',

      /* Estados visuais */
      '.capture-item.ci-completed  { border-color:rgba(74,222,128,0.2);  background:rgba(74,222,128,0.04); }',
      '.capture-item.ci-in-progress { border-color:rgba(96,165,250,0.25); background:rgba(96,165,250,0.04); }',
      '.capture-item.ci-pending    { border-color:rgba(255,255,255,0.06); }',

      /* Header da linha */
      '.capture-item-header { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }',
      '.capture-item-status { font-size:11px; margin-left:auto; }',

      /* Nome do pokémon (admin/dono) */
      '.ci-pokemon-name { font-size:12px; font-weight:600; color:rgba(255,255,255,0.75); }',
      '.ci-ball { font-size:10px; color:rgba(255,255,255,0.4); font-style:italic; }',
      '.ci-duration { font-size:10px; color:rgba(255,255,255,0.5); }',

      /* Proof link */
      '.ci-proof { margin-top:2px; }',
      '.ci-proof-link { font-size:11px; color:#3a8cff; text-decoration:none; }',
      '.ci-proof-link:hover { text-decoration:underline; }',

      /* Botões de ação */
      '.ci-actions { display:flex; gap:6px; margin-top:4px; }',
      '.ci-btn { font-size:11px; padding:4px 10px; border-radius:6px; border:1px solid; cursor:pointer;',
      '  background:none; font-family:inherit; font-weight:600; transition:opacity .15s; }',
      '.ci-btn:disabled { opacity:.5; cursor:not-allowed; }',
      '.ci-btn--start    { border-color:rgba(96,165,250,.4); color:#60a5fa; }',
      '.ci-btn--complete { border-color:rgba(74,222,128,.4); color:#4ade80; }',
      '.ci-btn:hover:not(:disabled) { opacity:.8; }',
    ].join('\n');
    global.document.head.appendChild(style);
    _log('capture-items CSS injetado');
  }

  global.document.addEventListener('DOMContentLoaded', function() { _injectCSS(); });

  // ══════════════════════════════════════════════════════════════════════
  // 10. API PÚBLICA
  // ══════════════════════════════════════════════════════════════════════

  global.PA.captureItems = {
    // Normalização
    extractCaptureItems:      extractCaptureItems,
    normalizeLegacyOrder:     normalizeLegacyOrder,
    normalizeRawCaptureItem:  normalizeRawCaptureItem,
    generateItemRef:          generateItemRef,
    isLegacyOrder:            isLegacyOrder,

    // Status
    areAllItemsComplete:  areAllItemsComplete,
    getAggregateStatus:   getAggregateStatus,
    countByStatus:        countByStatus,

    // Timer individual
    computeItemDuration:  computeItemDuration,

    // Operações (async)
    startCaptureItem:      startCaptureItem,
    completeCaptureItem:   completeCaptureItem,
    updateCaptureItemInOrder: updateCaptureItemInOrder,

    // Event handlers (delegação de cliques)
    startItem:    startItem,
    completeItem: completeItem,

    // UI renderers
    renderCaptureItemPublic:     renderCaptureItemPublic,
    renderCaptureItemPrivileged: renderCaptureItemPrivileged,
    ITEM_STATUS_CONFIG:          ITEM_STATUS_CONFIG,
  };

  _log('capture-items.js v1 inicializado.');

}(window));
