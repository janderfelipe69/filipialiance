// ============================================================
// captura-cart.js — Carrinho de Captura v1
// PokeAlliance Shop — FASE 5.3
//
// OBJETIVO:
//   Permitir que o usuário adicione múltiplos pokémons ao
//   carrinho de captura antes de submeter o pedido composto.
//
// INTEGRAÇÃO:
//   - Expõe window.CapturaCart como API pública
//   - Usa PA.hooks para emitir 'captura:cart_updated'
//   - Usa PA.pipeline.computeServiceDuration() para SLA
//   - Compatível com PA.health, PA.state, PA.telemetry
//   - NÃO altera o fluxo legado de itens/pacotes
//
// RETROCOMPATIBILIDADE:
//   - window.confirmCaptura() ainda existe
//   - Modo legacy: 1 pokémon → checkout imediato (se cart vazio)
//   - Modo novo: N pokémons → checkout composto
//
// CARREGUE: após captura-redesign.js e PA infrastructure.
// ============================================================

;(function (global) {
  'use strict';

  if (global.CapturaCart) return; // singleton

  var _log  = function() { if (global.PA_DEBUG) console.log.apply(console, ['[CapturaCart]'].concat([].slice.call(arguments))); };
  var _warn = function() { console.warn.apply(console, ['[CapturaCart ⚠️]'].concat([].slice.call(arguments))); };
  var _tel  = function(c, d) { if (global.PA && global.PA.telemetry) global.PA.telemetry.push(c, d); };

  // ── Estado do carrinho de captura ───────────────────────────────────────
  // Array de items de captura — separado do cart de itens/pacotes
  var _items = [];       // [ { id, pokeData, ball, finalPrice, priceData, qty } ]
  var _nextId = 1;

  // ── Helpers ─────────────────────────────────────────────────────────────

  function _genId() { return 'ccp_' + (_nextId++); }

  function _notify() {
    if (global.PA && global.PA.hooks) {
      global.PA.hooks.emit('captura:cart_updated', { count: _items.length });
    }
    try {
      _render();
    } catch (err) {
      console.error('[CapturaCart] _render() erro:', err.message, err.stack);
    }
    _tel('state_mutation', { prop: 'CapturaCart', count: _items.length });
  }

  // ── API principal ────────────────────────────────────────────────────────

  /**
   * Adiciona um pokémon ao carrinho de captura.
   * Chamado por confirmCaptura() após o usuário confirmar ball e poke.
   */
  function add(pokeData, ball, finalPrice, priceData) {
    if (!pokeData) { _warn('add: pokeData obrigatório'); return null; }

    var entry = {
      id:         _genId(),
      pokeData:   pokeData,
      ball:       ball || { id: 'ultra', name: 'Ultra Ball' },
      finalPrice: finalPrice || 0,
      priceData:  priceData || null,
      qty:        1,
      addedAt:    Date.now(),
    };

    _items.push(entry);
    _log('Adicionado:', pokeData.name, 'ball:', entry.ball.name, 'total:', _items.length);
    _notify();
    return entry;
  }

  /**
   * Remove um item pelo id.
   */
  function remove(id) {
    var before = _items.length;
    _items = _items.filter(function(i) { return i.id !== id; });
    if (_items.length < before) {
      _log('Removido:', id, 'restam:', _items.length);
      _notify();
    }
  }

  /**
   * Limpa o carrinho completamente.
   */
  function clear() {
    _items = [];
    _notify();
  }

  function getItems()  { return _items.slice(); }
  function getCount()  { return _items.length; }
  function isEmpty()   { return _items.length === 0; }

  /**
   * Calcula total bruto do carrinho de captura.
   */
  function getTotal() {
    return _items.reduce(function(s, i) { return s + (i.finalPrice * i.qty); }, 0);
  }

  // ── Checkout — monta payload composto e salva no Supabase ──────────────

  /**
   * Converte o carrinho em um payload composto para public.pedidos.
   * Cria 1 pedido com múltiplos pokémons no campo `itens` (JSONB).
   *
   * RETROCOMPATIBILIDADE: o campo `itens` já é um array em pedidos antigos.
   * Pedidos compostos simplesmente têm mais de 1 item no array.
   */
  function buildCompositePayload(user) {
    if (!user) { _warn('buildCompositePayload: user obrigatório'); return null; }
    if (_items.length === 0) { _warn('buildCompositePayload: carrinho vazio'); return null; }

    var nick = (user.nickname || user.email) || 'Anônimo';

    // Determina service_type do pedido composto:
    //   - se QUALQUER item for SR → pokemon_sr (SLA mais longo)
    //   - caso contrário → normal_package
    var hasSR = _items.some(function(i) {
      var tag = ((i.pokeData.tag || '').toLowerCase());
      return tag === 'super-raro' || tag === 'sr';
    });

    var serviceType = hasSR ? 'pokemon_sr' : 'normal_package';
    var totalQty    = _items.reduce(function(s, i) { return s + i.qty; }, 0);
    var totalRaw    = getTotal();

    // Monta array de itens no formato já usado pelo campo `itens` JSONB
    var itensPedido = _items.map(function(entry) {
      var drops = (typeof getPokeDrops === 'function') ? getPokeDrops(entry.pokeData.name) : [];
      return {
        id:             entry.id,          // UUID frontend — para reconciliação futura
        nome:           entry.pokeData.name + ' (' + entry.ball.name + ')',
        quantidade:     entry.qty,
        type:           'capture',
        pokemon:        entry.pokeData.name,
        tier:           entry.pokeData.tag || '',
        ball:           entry.ball.name,
        ball_type:      entry.ball.id,
        preco_unit_raw: entry.finalPrice || 0,
        preco_unit_kk:  entry.priceData ? entry.priceData.label : '—',
        preco_unit_brl: entry.priceData ? entry.priceData.brl   : '—',
        preco_total_raw: entry.finalPrice * entry.qty,
        drops:          drops.map(function(d) { return d.name; }),
        // Status individual do item (para partial delivery futuro)
        status:         'pending',
        started_at:     null,
        completed_at:   null,
        actual_duration_minutes: null,
      };
    });

    // Formata totais para o payload
    var subtotalKK  = (typeof formatKK === 'function' && totalRaw > 0) ? (formatKK(totalRaw)?.label  || '—') : '—';
    var subtotalBRL = totalRaw > 0
      ? (totalRaw / 1000000 * (global.KK_TO_BRL || 1.70))
          .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : '—';

    return {
      user_id:          user.id || null,
      nick_jogo:        nick,
      status:           'pendente',
      status_v3:        'waiting_queue',
      tipo_servico:     serviceType,
      service_type:     serviceType,
      service_quantity: totalQty,
      started_at:       null,
      sla_min_days:     null,
      sla_max_days:     null,
      itens:            itensPedido,
      subtotal_kk:      subtotalKK,
      subtotal_brl:     subtotalBRL,
      total_kk:         subtotalKK,
      total_brl:        subtotalBRL,
      taxa_servico:     false,
      // Campos ball (podem ser removidos no fallback se a tabela não os tiver)
      ball_type:              _items.length === 1 ? _items[0].ball.id : 'mixed',
      calculated_price_kk:    totalRaw || 0,
      calculated_price_brl:   totalRaw > 0 ? Math.round(totalRaw / 1000000 * (global.KK_TO_BRL || 1.70) * 100) / 100 : 0,
      calculated_price_dd:    0,
      ball_returned:          false,
      client_supplied_balls:  true,
      // Metadados compostos
      composite_order:        _items.length > 1,     // flag para identificar pedidos compostos
      item_count:             _items.length,
    };
  }

  // ── UI do carrinho de captura ──────────────────────────────────────────

  var _panelEl = null;

  /**
   * Renderiza/atualiza o painel do carrinho de captura.
   * Injeta abaixo do modal de captura quando há itens.
   */
  function _render() {
    // Garante container
    if (!_panelEl) {
      _panelEl = document.createElement('div');
      _panelEl.id = 'captura-cart-panel';
      _panelEl.style.cssText = [
        'position:fixed', 'bottom:0', 'left:0', 'right:0', 'z-index:10002',
        'background:rgba(10,14,26,0.97)', 'backdrop-filter:blur(12px)',
        'border-top:1px solid rgba(58,140,255,0.25)',
        'padding:10px 16px 12px',
        'transform:translateY(100%)', 'transition:transform .25s ease',
        'font-family:var(--font-body,sans-serif)',
      ].join(';');
      document.body.appendChild(_panelEl);
    }

    if (_items.length === 0) {
      _panelEl.style.transform = 'translateY(100%)';
      return;
    }

    var totalRaw = getTotal();
    var totalFmt = (typeof formatKK === 'function' && totalRaw > 0) ? formatKK(totalRaw) : null;

    var rows = _items.map(function(entry) {
      return '<div style="display:flex;align-items:center;gap:8px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.06)">' +
        '<span style="font-size:11px;color:#c2c0b6;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
          _esc(entry.pokeData.name) +
          '<span style="color:#3a8cff;margin-left:6px;font-size:10px">' + _esc(entry.ball.name) + '</span>' +
          (entry.pokeData.tag ? '<span style="color:#fbbf24;margin-left:4px;font-size:10px">' + _esc(entry.pokeData.tag.toUpperCase()) + '</span>' : '') +
        '</span>' +
        (entry.priceData ? '<span style="font-size:10px;color:#60aaff">' + _esc(entry.priceData.label) + '</span>' : '') +
        '<button onclick="CapturaCart.remove(\'' + entry.id + '\')" ' +
          'style="background:none;border:none;color:#f87171;cursor:pointer;font-size:14px;padding:0 2px;line-height:1">×</button>' +
        '</div>';
    }).join('');

    _panelEl.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">' +
        '<div style="display:flex;align-items:center;gap:6px">' +
          '<span style="font-size:12px;font-weight:600;color:#fff">🛒 Captura</span>' +
          '<span style="background:rgba(58,140,255,.2);color:#3a8cff;border-radius:10px;padding:1px 7px;font-size:11px">' +
            _items.length + (_items.length === 1 ? ' pokémon' : ' pokémons') +
          '</span>' +
        '</div>' +
        (totalFmt ? '<span style="font-size:11px;color:#60aaff">' + _esc(totalFmt.label) + ' · ' + _esc(totalFmt.brl) + '</span>' : '') +
      '</div>' +
      '<div style="max-height:120px;overflow-y:auto;margin-bottom:8px">' + rows + '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button onclick="CapturaCart.clear()" ' +
          'style="flex:0;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.3);color:#f87171;border-radius:8px;padding:8px 14px;font-size:12px;cursor:pointer">' +
          'Limpar' +
        '</button>' +
        '<button onclick="CapturaCart.checkout()" ' +
          'id="captura-cart-checkout-btn" ' +
          'style="flex:1;background:linear-gradient(135deg,#3a8cff,#1a5fcc);border:none;color:#fff;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer">' +
          '⬟ Enviar ' + _items.length + (_items.length === 1 ? ' Pedido' : ' Pedidos') +
        '</button>' +
      '</div>';

    _panelEl.style.transform = 'translateY(0)';
  }

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Checkout ─────────────────────────────────────────────────────────────

  /**
   * Envia o pedido composto ao Supabase.
   * Chamado pelo botão do painel ou diretamente.
   */
  async function checkout() {
    if (_items.length === 0) {
      if (typeof showToast === 'function') showToast('Carrinho de captura vazio.', 'warn');
      return;
    }

    var user = (typeof Session !== 'undefined' && Session.isLoggedIn())
      ? Session.getCurrentUser() : null;
    if (!user) {
      if (typeof AuthModal !== 'undefined') AuthModal.open('login');
      return;
    }

    var btn = document.getElementById('captura-cart-checkout-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Enviando...'; }

    var payload = buildCompositePayload(user);
    if (!payload) {
      if (btn) { btn.disabled = false; btn.textContent = '⬟ Enviar Pedidos'; }
      return;
    }

    var _ballFields = ['ball_type','calculated_price_brl','calculated_price_kk',
      'calculated_price_dd','ball_returned','client_supplied_balls','composite_order','item_count'];

    try {
      var saved;
      // Tenta com todos os campos; em caso de 400, remove campos opcionais
      try {
        saved = await _salvarPedidoSupabase(payload);
      } catch (ballErr) {
        if (ballErr.message && (ballErr.message.includes('ball_') || ballErr.message.includes('composite'))) {
          var fallback = Object.assign({}, payload);
          _ballFields.forEach(function(f) { delete fallback[f]; });
          saved = await _salvarPedidoSupabase(fallback);
        } else {
          throw ballErr;
        }
      }

      var pedidoId = saved && saved.id ? ' #' + String(saved.id).padStart(4, '0') : '';
      _log('✅ Pedido composto salvo:', saved);

      // Notificação
      if (typeof OrdersNotifications !== 'undefined') {
        OrdersNotifications.show(
          'Pedido' + pedidoId + ' criado com ' + _items.length + (_items.length === 1 ? ' pokémon!' : ' pokémons!'),
          'pendente', 6000
        );
      }

      // Limpa carrinho
      clear();

      // Recarrega fila
      if (typeof pedidosCarregar === 'function') {
        setTimeout(function() { pedidosCarregar(); }, 300);
      } else if (typeof OrdersUI !== 'undefined') {
        setTimeout(function() { OrdersUI.refresh(); }, 300);
      }

      _tel('state_mutation', { prop: 'CapturaCart', op: 'checkout', items: _items.length });

    } catch (err) {
      console.error('[CapturaCart] ❌ Falha:', err);
      if (typeof showToast === 'function') showToast('Erro ao enviar pedido: ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = '⬟ Enviar Pedidos'; }
    }
  }

  // ── Expõe API pública ──────────────────────────────────────────────────

  global.CapturaCart = {
    add:                  add,
    remove:               remove,
    clear:                clear,
    checkout:             checkout,
    getItems:             getItems,
    getCount:             getCount,
    isEmpty:              isEmpty,
    getTotal:             getTotal,
    buildCompositePayload: buildCompositePayload,
  };

  // Registra em PA.hooks se disponível
  if (global.PA && global.PA.hooks && typeof global.PA.hooks.on === 'function') {
    // Nenhum hook interno por enquanto — outros módulos podem ouvir captura:cart_updated
  }

  // Diagnóstico de boot — visível em PA_DEBUG=true e sempre no console.warn
  console.warn('[CapturaCart] v1 carregado. window.CapturaCart =', typeof global.CapturaCart);
  if (global.PA && global.PA.telemetry) {
    global.PA.telemetry.push('boot', { module: 'CapturaCart', status: 'loaded', version: '1.0' });
  }

  _log('captura-cart.js v1 inicializado.');

}(window));
