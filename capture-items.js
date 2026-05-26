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

  // ── Per-item operation locks (RACE 1 + 2 fix) ─────────────────────────
  // Prevents double-click, rapid re-entry, and concurrent ops on the same item.
  // Key: "supabaseOrderId:itemRef"  Value: { op, ts }
  var _itemLocks = {};

  function _lockItem(orderId, itemRef, op) {
    var key = orderId + ':' + itemRef;
    if (_itemLocks[key]) {
      console.log('[captureItems.race] lock conflict', { key: key, existing: _itemLocks[key].op, attempted: op });
      _tel('capture-item-race', { key: key, existing: _itemLocks[key].op, attempted: op });
      return false; // locked
    }
    _itemLocks[key] = { op: op, ts: Date.now() };
    return true; // acquired
  }

  function _unlockItem(orderId, itemRef) {
    var key = orderId + ':' + itemRef;
    delete _itemLocks[key];
  }

  function _isItemLocked(orderId, itemRef) {
    return !!_itemLocks[orderId + ':' + itemRef];
  }

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

  /**
   * ensureItemRef — helper central (Fase 5.3.2 bugfix)
   *
   * Garante que um captureItem sempre tenha item_ref.
   * Hierarquia:
   *   1. item.item_ref já existente (mais confiável)
   *   2. item.id (pode vir do JSONB original)
   *   3. Gera a partir de orderId + índice
   *
   * NUNCA retorna vazio/null.
   */
  function ensureItemRef(orderId, item, idx) {
    if (item && item.item_ref && String(item.item_ref).length > 0) {
      return item.item_ref;
    }
    if (item && item.id && String(item.id).length > 0) {
      // Se o id parece um item_ref gerado por nós (ORD..._PK_), usa direto
      // Caso contrário (ex: UUID do Supabase), usa como fallback
      return item.id;
    }
    return generateItemRef(orderId, idx !== undefined ? idx : 0);
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

    // item_ref: usa ensureItemRef para garantir valor sempre presente
    var itemRef = ensureItemRef(orderId, rawItem, index);

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
  async function updateCaptureItemInOrder(supabaseOrderId, itemRef, patch, opts) {
    if (!supabaseOrderId || !itemRef || !patch) return false;

    opts = opts || {};
    // opts.expectedStatus: if set, abort if current item status !== expectedStatus (optimistic lock)
    // opts.allowedFromStatuses: array of statuses that allow this transition

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

      // 2. Localiza o item e verifica status atual (RACE 2+3 fix — optimistic lock)
      var found = false;
      var currentItemStatus = null;
      var updatedItens = itens.map(function(it) {
        // Compara pelo item_ref (ou id para compatibilidade)
        if ((it.item_ref && it.item_ref === itemRef) || (it.id && it.id === itemRef)) {
          found = true;
          currentItemStatus = it.status || (it.concluido ? 'completed' : 'pending');

          // Optimistic lock: verifica se transição é permitida
          var allowedStatuses = opts.allowedFromStatuses || (opts.expectedStatus ? [opts.expectedStatus] : null);
          if (allowedStatuses && allowedStatuses.indexOf(currentItemStatus) === -1) {
            console.log('[captureItems.concurrentPatch]', {
              itemRef: itemRef, expected: opts.expectedStatus, actual: currentItemStatus,
              msg: 'Status mudou enquanto aguardávamos — abortando PATCH'
            });
            found = 'status_mismatch'; // sentinel — aborta mais abaixo
            return it; // retorna sem modificar
          }

          // Adiciona updated_at para rastreamento de versão
          return Object.assign({}, it, patch, { updated_at: new Date().toISOString() });
        }
        return it;
      });

      // Abort se houve status mismatch (outro admin ganhou a corrida)
      if (found === 'status_mismatch') {
        _warn('updateCaptureItemInOrder: status mismatch — operação abortada para evitar overwrite');
        _tel('capture-item-race', { itemRef: itemRef, expected: opts.expectedStatus, actual: currentItemStatus });
        return { success: false, reason: 'status_mismatch', currentStatus: currentItemStatus };
      }

      if (!found) {
        // ── FALLBACK (Fase 5.3.2 bugfix) ─────────────────────────────────────────
        // O item_ref no DOM foi gerado em memória pelo normalizeRawCaptureItem,
        // mas o JSONB no banco pode não ter item_ref escrito.
        // Estratégia de match por ordem de prioridade:
        //   1. Busca item cujo id === itemRef (alias frontend)
        //   2. Busca pelo índice embutido no item_ref (ex: ORD42_PK_1 → índice 0)
        //   3. Usa primeiro item de captura sem status (pending)
        // Após encontrar, escreve item_ref de volta no banco.
        _warn('updateCaptureItemInOrder: item_ref não encontrado via match direto. Tentando fallback.', itemRef);
        console.log('[captureItems.update] fallback search', { itemRef: itemRef, totalItems: itens.length, itens: itens.map(function(x){ return { id: x.id, item_ref: x.item_ref, type: x.type, pokemon: x.pokemon }; }) });

        var fallbackIdx = -1;

        // Estratégia 1: id == itemRef (id gerado localmente em normalizeRawCaptureItem)
        for (var fi = 0; fi < itens.length; fi++) {
          if (itens[fi].id && itens[fi].id === itemRef) { fallbackIdx = fi; break; }
        }

        // Estratégia 2: item_ref tem sufixo _PK_N → usar índice N-1
        if (fallbackIdx === -1) {
          var pkMatch = String(itemRef).match(/_PK_(\d+)$/);
          if (pkMatch) {
            var pkIdx = parseInt(pkMatch[1], 10) - 1;
            // Conta apenas itens de captura
            var captureCount = 0;
            for (var ci = 0; ci < itens.length; ci++) {
              if (itens[ci].type === 'capture' || itens[ci].pokemon) {
                if (captureCount === pkIdx) { fallbackIdx = ci; break; }
                captureCount++;
              }
            }
          }
        }

        // Estratégia 3: primeiro item de captura com status pending/sem status
        if (fallbackIdx === -1) {
          for (var pi = 0; pi < itens.length; pi++) {
            if (itens[pi].type === 'capture' || itens[pi].pokemon) {
              var st = itens[pi].status || (itens[pi].concluido ? 'completed' : 'pending');
              if (st === 'pending') { fallbackIdx = pi; break; }
            }
          }
        }

        if (fallbackIdx === -1) {
          _warn('updateCaptureItemInOrder: fallback esgotado, nenhum item encontrado para', itemRef);
          _tel('capture-item-update', { error: 'item_ref not found after fallback', itemRef: itemRef });
          return false;
        }

        // Encontrou via fallback — escreve item_ref de volta + aplica patch
        _warn('updateCaptureItemInOrder: fallback encontrou item no índice', fallbackIdx, '— gravando item_ref');
        found = true;
        updatedItens = itens.map(function(it, idx2) {
          if (idx2 === fallbackIdx) {
            return Object.assign({}, it, patch, { item_ref: itemRef });
          }
          return it;
        });
        _tel('capture-item-update', { fallback: true, idx: fallbackIdx, itemRef: itemRef });
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
    // Optimistic lock: only start if still pending
    return updateCaptureItemInOrder(supabaseOrderId, itemRef, {
      status:     'in_progress',
      started_at: new Date().toISOString(),
    }, { expectedStatus: 'pending' });
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

    // Optimistic lock: allow complete from in_progress OR pending (skip start)
    // Don't complete if already completed (prevents double proof upload)
    return updateCaptureItemInOrder(supabaseOrderId, itemRef, patch,
      { allowedFromStatuses: ['in_progress', 'pending'] });
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

    // Timer
    var timerHtml = '';
    if (captureItem.status === 'in_progress' && captureItem.started_at) {
      timerHtml = '<span class="ci-timer" data-started-at="' + _esc(captureItem.started_at) + '">'
        + '\u23f1 ' + _elapsedSince(captureItem.started_at) + '</span>';
    } else if (captureItem.status === 'completed') {
      var dur2 = computeItemDuration(captureItem);
      if (dur2.durationFmt) timerHtml = '<span class="ci-timer ci-timer--done">\u23f1 ' + dur2.durationFmt + '</span>';
    }

    return [
      '<div class="capture-item capture-item--' + cfg.cssClass + '"',
      '     data-item-ref="' + _esc(captureItem.item_ref) + '" data-ci-status="' + captureItem.status + '">',
      '  <div class="capture-item-row">',
      '    <div class="ci-left">' + tierBadge + '</div>',
      '    <div class="ci-right">',
      '      <span class="capture-item-status ci-status-badge">',
      '        ' + cfg.icon + ' <span class="ci-status-label">' + cfg.label + '</span>',
      '      </span>',
      (timerHtml ? '      ' + timerHtml : ''),
      '    </div>',
      '  </div>',
      '</div>',
    ].filter(function(l){ return l.trim(); }).join('\n');
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

    // Timer individual
    var timerHtmlP = '';
    if (captureItem.status === 'in_progress' && captureItem.started_at) {
      timerHtmlP = '<span class="ci-timer" data-started-at="' + _esc(captureItem.started_at) + '">'
        + '\u23f1 ' + _elapsedSince(captureItem.started_at) + '</span>';
    } else if (captureItem.status === 'completed') {
      var dp = computeItemDuration(captureItem);
      if (dp.durationFmt) timerHtmlP = '<span class="ci-timer ci-timer--done">\u23f1 ' + dp.durationFmt + '</span>';
    } else if (captureItem.status === 'pending') {
      timerHtmlP = '<span class="ci-timer ci-timer--waiting">\u23f3 Aguardando</span>';
    }

    // Proof preview inline
    var proofHtml = '';
    if (captureItem.delivery_image_url) {
      proofHtml = '<div class="ci-proof-preview">'
        + '<a href="' + _esc(captureItem.delivery_image_url) + '" target="_blank" rel="noopener" class="ci-proof-link">'
        + '<img src="' + _esc(captureItem.delivery_image_url) + '" class="ci-proof-thumb"'
        + ' onerror="this.style.display=\'none\'" />'
        + '<span class="ci-proof-label">\uD83D\uDCF8 Ver print</span></a></div>';
    }

    // Upload button for in_progress items without proof
    var uploadBtn = (isAdmin && captureItem.status === 'in_progress' && !captureItem.delivery_image_url)
      ? '<button class="ci-btn ci-btn--upload" onclick="PA.captureItems.openUploadForItem(event)"'
        + ' data-item-ref="' + _esc(captureItem.item_ref) + '">'
        + '\uD83D\uDCCE Upload print</button>'
      : '';

    // Replace adminBtns to include upload
    if (isAdmin && captureItem.status === 'in_progress') {
      adminBtns = uploadBtn
        + '<button class="ci-btn ci-btn--complete" onclick="PA.captureItems.completeItem(event)"'
        + ' data-item-ref="' + _esc(captureItem.item_ref) + '">\u2713 Concluir</button>';
    }

    return [
      '<div class="capture-item capture-item--' + cfg.cssClass + '"',
      '     data-item-ref="' + _esc(captureItem.item_ref) + '" data-ci-status="' + captureItem.status + '">',
      '  <div class="capture-item-row">',
      '    <div class="ci-left">',
      '      ' + tierBadge,
      (pokeName  ? '      ' + pokeName  : ''),
      (ballBadge ? '      ' + ballBadge : ''),
      '    </div>',
      '    <div class="ci-right">',
      '      <span class="capture-item-status ci-status-badge" style="color:' + cfg.color + '">',
      '        ' + cfg.icon + ' <span class="ci-status-label">' + cfg.label + '</span>',
      '      </span>',
      (timerHtmlP ? '      ' + timerHtmlP : ''),
      '    </div>',
      '  </div>',
      (proofHtml ? '  ' + proofHtml : ''),
      (adminBtns ? '  <div class="ci-actions">' + adminBtns + '</div>' : ''),
      '</div>',
    ].filter(function(l){ return l.trim(); }).join('\n');
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
    if (!itemEl || !cardEl) {
      _warn('startItem: não encontrou [data-item-ref] ou [data-order-id] no DOM');
      return;
    }

    var itemRef  = itemEl.getAttribute('data-item-ref');
    var orderId  = cardEl.getAttribute('data-order-id');

    // Debug temporário (Fase 5.3.2 bugfix)
    console.log('[captureItems.start]', { orderId: orderId, itemRef: itemRef, btnText: btn.textContent });

    if (!orderId) {
      _warn('startItem: orderId ausente no data-order-id');
      return;
    }

    // item_ref ausente: gera emergência em vez de abortar
    if (!itemRef || itemRef === 'undefined' || itemRef === 'null') {
      _warn('startItem: item_ref ausente no DOM — gerando emergência');
      itemRef = ensureItemRef(orderId.replace('sb_', ''), {}, 0);
      itemEl.setAttribute('data-item-ref', itemRef);
    }

    // Resolve supabaseId do orderId (formato 'sb_123' ou número puro)
    var supabaseId = orderId.replace(/^sb_/i, '');

    // RACE 1 fix: item-level lock prevents double-click and concurrent ops
    if (_isItemLocked(supabaseId, itemRef)) {
      console.log('[captureItems.race] startItem blocked — item already locked', { supabaseId, itemRef });
      return;
    }

    // RACE 4 fix: check current DOM status — abort if already started/completed
    var domStatus = itemEl.getAttribute('data-ci-status');
    if (domStatus === 'in_progress' || domStatus === 'completed') {
      console.log('[captureItems.race] startItem blocked — DOM already shows', domStatus);
      return;
    }

    if (!_lockItem(supabaseId, itemRef, 'start')) return;

    btn.disabled = true;
    btn.textContent = '⏳';

    _tel('capture_item_morph', { op: 'start-attempt', itemRef: itemRef, supabaseId: supabaseId });

    var result = await startCaptureItem(supabaseId, itemRef);

    _unlockItem(supabaseId, itemRef); // release lock regardless of outcome

    if (result && result.success) {
      itemEl.setAttribute('data-ci-status', 'in_progress');
      itemEl.setAttribute('data-ci-updated-at', Date.now().toString());
      var statusEl = itemEl.querySelector('.capture-item-status, .ci-status-label');
      if (statusEl) statusEl.textContent = 'Em andamento';
      itemEl.classList.remove('ci-pending');
      itemEl.classList.add('ci-in-progress');
      var oldBtn = itemEl.querySelector('.ci-btn--start');
      if (oldBtn) oldBtn.replaceWith(_makeCompleteBtn(itemRef));
      else btn.replaceWith(_makeCompleteBtn(itemRef));
    } else if (result && result.reason === 'status_mismatch') {
      // Another admin already started it — reflect server state silently
      btn.disabled = false;
      btn.textContent = '▶ Iniciar';
      console.log('[captureItems.race] startItem: status_mismatch — refreshing UI', result.currentStatus);
      if (typeof showToast === 'function') showToast('Item já foi iniciado por outro admin.', 'info');
      if (typeof OrdersUI !== 'undefined') setTimeout(function(){ OrdersUI.refresh(); }, 300);
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

    console.log('[captureItems.complete]', { orderId: orderId, itemRef: itemRef });

    if (!orderId) { _warn('completeItem: orderId ausente'); return; }
    if (!itemRef || itemRef === 'undefined' || itemRef === 'null') {
      _warn('completeItem: item_ref ausente — gerando emergência');
      itemRef = ensureItemRef(orderId.replace('sb_', ''), {}, 0);
      itemEl.setAttribute('data-item-ref', itemRef);
    }

    var supabaseId = orderId.replace(/^sb_/i, '');

    var confirmed = (typeof showConfirmModal === 'function')
      ? await showConfirmModal({ title: 'Concluir item', message: 'Marcar este pokémon como entregue?', confirmText: 'Concluir', cancelText: 'Cancelar', type: 'success' })
      : true;

    if (!confirmed) return;

    // RACE 1+2 fix: item-level lock
    if (_isItemLocked(supabaseId, itemRef)) {
      console.log('[captureItems.race] completeItem blocked — item locked', { supabaseId, itemRef });
      return;
    }

    // RACE 4 fix: abort if DOM already shows completed
    var domStatusC = itemEl.getAttribute('data-ci-status');
    if (domStatusC === 'completed') {
      console.log('[captureItems.race] completeItem blocked — already completed in DOM');
      return;
    }

    if (!_lockItem(supabaseId, itemRef, 'complete')) return;

    btn.disabled = true;
    btn.textContent = '⏳';

    var result = await completeCaptureItem(supabaseId, itemRef, {});

    _unlockItem(supabaseId, itemRef); // always release

    if (result && result.success) {
      itemEl.setAttribute('data-ci-status', 'completed');
      itemEl.setAttribute('data-ci-updated-at', Date.now().toString());
      var statusElC = itemEl.querySelector('.capture-item-status, .ci-status-label');
      if (statusElC) statusElC.textContent = 'Entregue';
      itemEl.classList.remove('ci-in-progress');
      itemEl.classList.add('ci-completed');
      btn.remove();

      _tel('partial_delivery_completed', { itemRef: itemRef, allDone: !!result.allDone });

      if (result.allDone) {
        if (typeof showToast === 'function') showToast('✅ Todos os pokémons entregues! Pedido concluído.', 'success');
        if (typeof pedidosCarregar === 'function') setTimeout(pedidosCarregar, 600);
        else if (typeof OrdersUI !== 'undefined') {
          if (global.PA && global.PA.pipeline) {
            global.PA.pipeline.coalesceRender('orders-ui', function(){ OrdersUI.refresh(); }, 200);
          } else {
            setTimeout(function(){ OrdersUI.refresh(); }, 600);
          }
        }
      } else {
        if (typeof showToast === 'function') showToast('✅ Item entregue! Restam outros itens.', 'info');
        // Não faz refresh automático — realtime propagará para outros clientes
      }
    } else if (result && result.reason === 'status_mismatch') {
      btn.disabled = false;
      btn.textContent = '✓ Concluir';
      console.log('[captureItems.race] completeItem: status_mismatch — current:', result.currentStatus);
      if (typeof showToast === 'function') showToast('Item já foi atualizado por outro admin.', 'info');
      if (typeof OrdersUI !== 'undefined') setTimeout(function(){ OrdersUI.refresh(); }, 300);
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
      /* Layout */
      '.capture-items-list { display:flex; flex-direction:column; gap:6px; padding:6px 0; }',

      /* Card */
      '.capture-item { display:flex; flex-direction:column; gap:4px; padding:9px 12px;',
      '  border-radius:9px; background:rgba(255,255,255,0.03);',
      '  border:1px solid rgba(255,255,255,0.07);',
      '  transition:border-color .2s, background .2s, box-shadow .2s; }',

      /* Estados */
      '.capture-item.ci-completed  { border-color:rgba(74,222,128,0.25); background:rgba(74,222,128,0.04); }',
      '.capture-item.ci-in-progress { border-color:rgba(96,165,250,0.3); background:rgba(96,165,250,0.05); box-shadow:0 0 12px rgba(96,165,250,0.07); }',
      '.capture-item.ci-pending    { border-color:rgba(255,255,255,0.06); }',

      /* Pulse in_progress */
      '@media (prefers-reduced-motion:no-preference) {',
      '  .capture-item.ci-in-progress { animation:ci-pulse 2.5s ease-in-out infinite; }',
      '  @keyframes ci-pulse { 0%,100% { box-shadow:0 0 6px rgba(96,165,250,0.07); } 50% { box-shadow:0 0 16px rgba(96,165,250,0.18); } }',
      '  .capture-item.ci-completed { animation:ci-done-flash 0.4s ease-out; }',
      '  @keyframes ci-done-flash { 0% { background:rgba(74,222,128,0.15); } 100% { background:rgba(74,222,128,0.04); } }',
      '}',

      /* Row layout */
      '.capture-item-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }',
      '.ci-left  { display:flex; align-items:center; gap:5px; flex:1; min-width:0; }',
      '.ci-right { display:flex; align-items:center; gap:6px; margin-left:auto; flex-shrink:0; }',

      /* Content */
      '.ci-pokemon-name { font-size:12px; font-weight:600; color:rgba(255,255,255,0.8); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
      '.ci-ball         { font-size:10px; color:rgba(255,255,255,0.35); font-style:italic; }',
      '.ci-status-badge { display:inline-flex; align-items:center; gap:3px; font-size:11px; }',
      '.ci-status-label { font-size:11px; }',
      '.ci-timer        { font-size:10px; color:rgba(255,255,255,0.45); font-family:var(--font-mono,monospace); }',
      '.ci-timer--done    { color:#4ade80; }',
      '.ci-timer--waiting { color:rgba(255,255,255,0.3); }',

      /* Proof */
      '.ci-proof-preview { margin-top:5px; }',
      '.ci-proof-link { display:inline-flex; align-items:center; gap:5px; text-decoration:none; }',
      '.ci-proof-thumb { width:40px; height:40px; border-radius:6px; object-fit:cover; border:1px solid rgba(255,255,255,0.1); flex-shrink:0; }',
      '.ci-proof-label { font-size:11px; color:#3a8cff; }',
      '.ci-proof-label:hover { text-decoration:underline; }',

      /* Buttons */
      '.ci-actions { display:flex; gap:6px; margin-top:5px; flex-wrap:wrap; }',
      '.ci-btn { font-size:11px; padding:5px 11px; border-radius:7px; border:1px solid; cursor:pointer; background:none; font-family:inherit; font-weight:600; transition:opacity .15s,transform .1s; min-height:30px; min-width:44px; }',
      '.ci-btn:disabled { opacity:.4; cursor:not-allowed; }',
      '.ci-btn:hover:not(:disabled) { opacity:.8; transform:translateY(-1px); }',
      '.ci-btn--start    { border-color:rgba(96,165,250,.5);  color:#60a5fa; }',
      '.ci-btn--complete { border-color:rgba(74,222,128,.5);  color:#4ade80; }',
      '.ci-btn--upload   { border-color:rgba(251,191,36,.45); color:#fbbf24; }',

      /* Aggregate progress bar */
      '.ci-aggregate-progress { padding:6px 0 4px; }',
      '.ci-agg-label { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }',
      '.ci-agg-count { font-size:11px; color:rgba(255,255,255,0.5); }',
      '.ci-agg-pct   { font-size:11px; font-weight:700; font-family:var(--font-mono,monospace); }',
      '.ci-agg-bar   { height:4px; border-radius:2px; background:rgba(255,255,255,0.07); overflow:hidden; }',
      '.ci-agg-fill  { height:100%; border-radius:2px; transition:width .3s ease, background .3s; }',

      /* Mobile */
      '@media (max-width:480px) {',
      '  .ci-right { flex-wrap:wrap; gap:4px; }',
      '  .ci-btn   { padding:5px 9px; font-size:11px; }',
      '}',
    ].join('\n');
    global.document.head.appendChild(style);
    _log('capture-items CSS injetado');
  }

  // ══════════════════════════════════════════════════════════════════════
  // FASE 5.3.2 — helpers adicionais
  // ══════════════════════════════════════════════════════════════════════

  // Tempo decorrido desde um timestamp ISO
  function _elapsedSince(isoStr) {
    if (!isoStr) return '0m';
    var ms = Date.now() - new Date(isoStr).getTime();
    if (ms < 0) return '0m';
    var m = Math.floor(ms / 60000);
    var h = Math.floor(m / 60);
    if (h > 0) return h + 'h ' + (m % 60) + 'm';
    return m + 'm';
  }

  // Morph incremental de um capture-item no DOM — sem reescrever card inteiro
  function morphCaptureItem(itemEl, captureItem) {
    if (!itemEl || !captureItem) return;

    // RACE 4 fix: stale state guard
    // If the element was updated more recently than this captureItem data, skip the morph.
    // This prevents realtime events arriving out-of-order from reverting newer local state.
    var domUpdatedAt = parseInt(itemEl.getAttribute('data-ci-updated-at') || '0', 10);
    if (captureItem._updatedAt && captureItem._updatedAt < domUpdatedAt) {
      console.log('[captureItems.realtimeSync] morphCaptureItem skipped — stale data', {
        itemRef: captureItem.item_ref,
        dataAge: captureItem._updatedAt,
        domAge: domUpdatedAt
      });
      _tel('capture-item-race', { op: 'stale-morph-skipped', itemRef: captureItem.item_ref });
      return;
    }

    var cfg = ITEM_STATUS_CONFIG[captureItem.status] || ITEM_STATUS_CONFIG.pending;

    ['ci-pending','ci-in-progress','ci-partial','ci-completed'].forEach(function(c) {
      itemEl.classList.remove('capture-item--' + c);
    });
    itemEl.classList.add('capture-item--' + cfg.cssClass);
    if (itemEl.setAttribute) itemEl.setAttribute('data-ci-status', captureItem.status);

    var labelEl = itemEl.querySelector && itemEl.querySelector('.ci-status-label');
    if (labelEl && labelEl.textContent !== cfg.label) labelEl.textContent = cfg.label;

    var timerEl = itemEl.querySelector && itemEl.querySelector('.ci-timer');
    if (timerEl) {
      if (captureItem.status === 'in_progress' && captureItem.started_at) {
        timerEl.textContent = '\u23f1 ' + _elapsedSince(captureItem.started_at);
        timerEl.setAttribute('data-started-at', captureItem.started_at);
        timerEl.className = 'ci-timer';
      } else if (captureItem.status === 'completed') {
        var dur = computeItemDuration(captureItem);
        if (dur.durationFmt) {
          timerEl.textContent = '\u23f1 ' + dur.durationFmt;
          timerEl.className = 'ci-timer ci-timer--done';
        }
      }
    }
    _tel('capture_item_morph', { itemRef: captureItem.item_ref, status: captureItem.status });
  }

  // Barra de progresso agregada do pedido composto
  function renderAggregateProgress(captureItems) {
    if (!captureItems || !captureItems.length) return '';
    var counts   = countByStatus(captureItems);
    var total    = captureItems.length;
    var done     = counts.completed || 0;
    var pct      = total > 0 ? Math.round((done / total) * 100) : 0;
    var aggStatus = getAggregateStatus(captureItems);
    var barColor  = aggStatus === 'completed' ? '#4ade80'
      : aggStatus === 'partial' ? '#fbbf24'
      : aggStatus === 'in_progress' ? '#60a5fa'
      : 'rgba(255,255,255,0.2)';

    return [
      '<div class="ci-aggregate-progress" data-agg-status="' + aggStatus + '">',
      '  <div class="ci-agg-label">',
      '    <span class="ci-agg-count">' + done + '/' + total + ' conclu\xeddos</span>',
      '    <span class="ci-agg-pct" style="color:' + barColor + '">' + pct + '%</span>',
      '  </div>',
      '  <div class="ci-agg-bar">',
      '    <div class="ci-agg-fill" style="width:' + pct + '%;background:' + barColor + ';',
      '         box-shadow:0 0 6px ' + barColor + '"></div>',
      '  </div>',
      '</div>',
    ].join('\n');
  }

  // Abre upload inline para um captureItem específico
  function openUploadForItem(event) {
    var btn    = event.target;
    var itemEl = btn.closest('[data-item-ref]');
    var cardEl = btn.closest('[data-order-id]');
    if (!itemEl || !cardEl) return;
    var itemRef = itemEl.getAttribute('data-item-ref');
    var orderId = cardEl.getAttribute('data-order-id');
    var supId   = orderId && orderId.startsWith('sb_') ? orderId.slice(3) : orderId;

    _tel('capture_item_upload', { itemRef: itemRef, orderId: supId });

    if (typeof DeliveryAdmin !== 'undefined' && typeof DeliveryAdmin.openModal === 'function') {
      DeliveryAdmin._pendingItemRef = itemRef;
      DeliveryAdmin._pendingItemEl  = itemEl;
      DeliveryAdmin.openModal(supId, null);
      return;
    }

    // Fallback: Imgur link via prompt
    var imgurUrl = (typeof prompt === 'function') ? prompt('Cole o link da imagem:') : null;
    if (!imgurUrl || imgurUrl.indexOf('http') !== 0) return;

    completeCaptureItem(supId, itemRef, { image_url: imgurUrl }).then(function(result) {
      if (result && result.success) {
        var proofEl = global.document.createElement('div');
        proofEl.className = 'ci-proof-preview';
        proofEl.innerHTML = '<a href="' + _esc(imgurUrl) + '" target="_blank" class="ci-proof-link">'
          + '<span class="ci-proof-label">\uD83D\uDCF8 Ver print</span></a>';
        itemEl.appendChild(proofEl);
        btn.remove();
        _tel('capture_item_morph', { itemRef: itemRef, op: 'proof-inline' });
      }
    });
  }

  // Timer vivo para ci-timer elements (RAF a cada 1 min, respeita virtual SLA)
  var _timerRAFId = null;
  function _startTimerUpdates() {
    if (_timerRAFId) return;
    function tick() {
      var timers = global.document.querySelectorAll('.ci-timer[data-started-at]');
      if (timers && timers.length) {
        timers.forEach(function(el) {
          var card = el.closest && el.closest('[data-order-id]');
          if (card && card._slaTickerPaused) return;
          var startedAt = el.getAttribute('data-started-at');
          if (startedAt) el.textContent = '\u23f1 ' + _elapsedSince(startedAt);
        });
      }
      _timerRAFId = setTimeout(tick, 60000); // a cada 1 minuto
    }
    tick();
  }

  global.document.addEventListener('DOMContentLoaded', function() {
    _injectCSS();
    _startTimerUpdates();
  });

  // ══════════════════════════════════════════════════════════════════════
  // 10. API PÚBLICA
  // ══════════════════════════════════════════════════════════════════════

  global.PA.captureItems = {
    // Concorrência (diagnóstico/teste)
    _locks:       _itemLocks,
    _lockItem:    _lockItem,
    _unlockItem:  _unlockItem,
    _isItemLocked: _isItemLocked,

    // Normalização
    extractCaptureItems:      extractCaptureItems,
    normalizeLegacyOrder:     normalizeLegacyOrder,
    normalizeRawCaptureItem:  normalizeRawCaptureItem,
    generateItemRef:          generateItemRef,
    ensureItemRef:            ensureItemRef,
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
    renderAggregateProgress:     renderAggregateProgress,
    morphCaptureItem:            morphCaptureItem,
    openUploadForItem:           openUploadForItem,
    ITEM_STATUS_CONFIG:          ITEM_STATUS_CONFIG,
  };

  _log('capture-items.js v1 inicializado.');

}(window));
