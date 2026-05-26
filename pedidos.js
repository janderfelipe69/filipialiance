// ============================================================
// pedidos.js — v3 — Bridge Supabase ↔ OrdersStorage ↔ OrdersUI
// PokeAlliance Shop
//
// MUDANÇAS v3:
//   - Lê status_v3 do banco (campo novo) — não mais o campo status legado
//   - Passa started_at, sla_min_days, sla_max_days, service_type, service_quantity
//   - Esses campos são obrigatórios para o cálculo de ETA real
//   - Usa v_active_queue para fila e pedidos diretos para histórico
//
// REGRA CENTRAL:
//   ETA só existe quando started_at != null (admin iniciou o serviço).
//   Antes disso: pedido está em waiting_queue sem countdown.
// ============================================================

;(function (global) {
  'use strict';

  var SB_URL = global.SUPABASE_URL || 'https://xzmefefcfwhlkmqrkxcd.supabase.co';
  var SB_KEY = global.SUPABASE_KEY || '';

  global.SUPABASE_URL = global.SUPABASE_URL || SB_URL;
  global.SUPABASE_KEY = global.SUPABASE_KEY || SB_KEY;

  var _pedidosBD   = [];
  var _carregando  = false;
  var _initialized = false;

  // ── Utilitários ────────────────────────────────────────────────────────

  function _log()   { var a = Array.prototype.slice.call(arguments); console.log.apply(console, ['[Pedidos v3]'].concat(a)); }
  function _warn()  { var a = Array.prototype.slice.call(arguments); console.warn.apply(console, ['[Pedidos v3]'].concat(a)); }
  function _error() { var a = Array.prototype.slice.call(arguments); console.error.apply(console, ['[Pedidos v3]'].concat(a)); }

  function _fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  // ── Conversão: Supabase → OrdersStorage ───────────────────────────────
  //
  // CAMPOS CRÍTICOS v3 que DEVEM ser passados:
  //   status_v3        → status normalizado (waiting_queue, in_progress, etc.)
  //   started_at       → quando o admin iniciou (null se não iniciado)
  //   sla_min_days     → dias mínimos do SLA (null se não iniciado)
  //   sla_max_days     → dias máximos do SLA (null se não iniciado)
  //   service_type     → tipo do serviço (normal_package | pokemon_sr)
  //   service_quantity → quantidade de unidades/pacotes

  function _supabaseToOrderStorage(p) {
    var itens = Array.isArray(p.itens) ? p.itens : [];
    try { if (typeof p.itens === 'string') itens = JSON.parse(p.itens); } catch (e) { itens = []; }

    var items = itens.map(function (it, idx) {
      // FASE 5.3.0b: preserva tier, type, pokemon para queue-privacy renderizar corretamente
      return {
        id:          'sb_item_' + p.id + '_' + idx,
        name:        it.nome || it.name || '—',
        qtdTotal:    parseInt(it.quantidade || it.qty || it.qtdTotal || 1, 10),
        qtdEntregue: parseInt(it.qtdEntregue || 0, 10),
        concluido:   !!(it.concluido),
        // Campos preservados para exibição e privacidade
        tier:        it.tier || it.tag  || '',
        type:        it.type            || '',
        pokemon:     it.pokemon         || '',
        ball_type:   it.ball_type       || '',
        ball:        it.ball            || '',
      };
    });

    // Usa status_v3 se disponível (campo novo), senão usa mapeamento legado
    var statusV3 = p.status_v3;
    if (!statusV3 || !['waiting_queue','in_progress','completed','cancelled'].includes(statusV3)) {
      // Fallback: mapeia o status legado
      var legacyMap = {
        pendente:     'waiting_queue',
        confirmado:   'waiting_queue',
        preparacao:   'in_progress',
        em_andamento: 'in_progress',
        parcial:      'in_progress',
        entregue:     'completed',
        concluido:    'completed',
        cancelado:    'cancelled',
        deleted:      'cancelled',
      };
      statusV3 = legacyMap[p.status] || 'waiting_queue';
    }

    return {
      // Identificadores
      id:            'sb_' + p.id,
      _supabaseId:   p.id,
      orderNumber:   p.id,
      userId:        p.user_id || null,

      // Dados do pedido
      nickname:      p.nick_jogo || '—',
      createdAt:     p.created_at || new Date().toISOString(),

      // ── CAMPOS CRÍTICOS v3 ──
      // Estes campos alimentam o cálculo de ETA e SLA.
      // NÃO remova ou renomeie.
      status_v3:        statusV3,
      status:           statusV3,            // alias para compatibilidade
      started_at:       p.started_at || null, // null = não iniciado ainda
      completed_at:     p.completed_at || null,
      service_type:     p.service_type || 'normal_package',
      service_quantity: parseInt(p.service_quantity || 1, 10),
      sla_min_days:     p.sla_min_days || null,  // null = SLA não calculado ainda
      sla_max_days:     p.sla_max_days || null,
      // ── SLA persistente (v2) ─────────────────────────────────────
      sla_hours:              p.sla_hours              || null,
      actual_duration_minutes: p.actual_duration_minutes || null,
      expired:                p.expired                || false,
      // ────────────────────────

      items:   items,
      progress: (statusV3 === 'completed') ? 100 : 0,
      notifications: [],
      history: [{ at: p.created_at, event: 'created', label: 'Pedido criado', by: p.nick_jogo }],
      cancelledAt:  (p.status === 'cancelado' || (p.status_v3 === 'cancelled')) ? p.created_at : null,
      completedAt:  p.completed_at || null,
      observations: p.admin_notes || '',

      // Valores monetários
      _totalKK:  p.total_kk  || p.subtotal_kk  || null,
      _totalBRL: p.total_brl || p.subtotal_brl || null,
      _pagModo:  p.pagamento_modo || null,
      _pagKK:    p.pagamento_kk  || null,
      _pagBRL:   p.pagamento_brl || null,
      _taxa:     p.taxa_servico  || false,
    };
  }

  // ── Sincroniza com OrdersStorage ───────────────────────────────────────

  function _sincronizarComOrdersStorage(pedidosBD) {
    if (typeof OrdersStorage === 'undefined') {
      _warn('OrdersStorage não disponível — renderização legada');
      return false;
    }
    try {
      var todos  = OrdersStorage.getAllOrders();
      var locais = todos.filter(function (o) { return !o.id.startsWith('sb_'); });
      var doBD   = pedidosBD.map(_supabaseToOrderStorage);
      var merged = locais.concat(doBD);
      localStorage.setItem('pa_orders_v2', JSON.stringify(merged));
      _log('Sincronizados:', merged.length, '(local:', locais.length, '+ BD:', doBD.length + ')');
      return true;
    } catch (e) {
      _error('Falha na sincronização:', e);
      return false;
    }
  }

  // ── JWT Helper ─────────────────────────────────────────────────────────
  // Retorna o JWT real do usuário autenticado, ou null se não houver sessão.
  // NUNCA retorna a anon key — a RLS exige JWT de usuário válido.
  // Chamadores devem checar null e abortar o fetch antes de enviar.
  function _getJWT() {
    if (typeof Session !== 'undefined' && Session.getAccessToken) {
      var token = Session.getAccessToken();
      if (token) return token;
    }
    return null;
  }

  // ── Fetch do Supabase ──────────────────────────────────────────────────
  // Busca todos os campos necessários para o sistema v3, incluindo os novos.
  // Ordenado por created_at ASC — fonte de verdade da fila.
  // GARANTIA: só executa se houver JWT válido. Sem JWT → aborta silenciosamente.

  async function _fetchDoBD() {
    var jwt = _getJWT();
    if (!jwt) {
      _log('Sessão ainda indisponível — fetch abortado (sem JWT). Aguardando Session.ready().');
      return null; // sinaliza ao chamador que não houve fetch
    }
    _log('Buscando pedidos do Supabase...');
    var url = SB_URL + '/rest/v1/pedidos' +
      '?order=created_at.asc' +
      '&limit=500' +
      '&select=id,nick_jogo,status,status_v3,created_at,' +
              'started_at,completed_at,service_type,service_quantity,' +
              'sla_min_days,sla_max_days,sla_hours,' +
              'actual_duration_minutes,expired,' +
              'itens,total_kk,total_brl,' +
              'subtotal_kk,subtotal_brl,pagamento_modo,pagamento_kk,' +
              'pagamento_brl,taxa_servico,admin_notes,user_id';

    var res = await fetch(url, {
      headers: {
        'apikey':        SB_KEY,
        'Authorization': 'Bearer ' + jwt, // PATCH 5.2: JWT real, sem fallback anon
      },
    });
    if (!res.ok) throw new Error('Supabase: HTTP ' + res.status);
    var dados = await res.json();
    _log('Pedidos recebidos:', dados.length);
    return dados;
  }

  // ── Atualiza status no banco ───────────────────────────────────────────
  // ATENÇÃO: Para iniciar/concluir, use as funções RPC (start_service/complete_service)
  // via OrdersAdmin. Este método só é para updates simples de status.

  async function _atualizarStatusBD(supabaseId, novoStatus) {
    var res = await fetch(SB_URL + '/rest/v1/pedidos?id=eq.' + supabaseId, {
      method:  'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SB_KEY,
        'Authorization': 'Bearer ' + _getJWT(), // PATCH 5.1: JWT real do usuário
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({ status_v3: novoStatus }),
    });
    if (!res.ok) throw new Error('Erro ao atualizar: HTTP ' + res.status);
  }

  // ── UI Helpers ─────────────────────────────────────────────────────────

  function _mostrarLoading(sim) {
    var el = document.getElementById('pedidos-loading');
    if (el) el.style.display = sim ? 'flex' : 'none';
  }
  function _mostrarErro(msg) {
    var el   = document.getElementById('pedidos-erro');
    var msg_ = document.getElementById('pedidos-erro-msg');
    if (el)   el.style.display = msg ? 'flex' : 'none';
    if (msg_) msg_.textContent = msg || '';
  }
  function _girarRefresh(sim) {
    var btn = document.querySelector('.pedidos-refresh-btn');
    if (btn) btn.classList.toggle('spin', sim);
  }

  // ── Função principal de carregamento ───────────────────────────────────
  // GARANTIA: sempre aguarda Session.ready() antes de _fetchDoBD().
  // Isso elimina o race condition com nav-runtime e _init().

  global.pedidosCarregar = async function () {
    if (_carregando) return;
    _carregando = true;
    _mostrarLoading(true);
    _mostrarErro(null);
    _girarRefresh(true);
    var usouBD = false;

    // Aguarda sessão inicializar completamente antes de qualquer acesso ao banco.
    // Session.ready() nunca rejeita (garantia de session.js v3).
    try {
      if (typeof Session !== 'undefined' && typeof Session.ready === 'function') {
        await Session.ready();
      }
    } catch (sessionErr) {
      _warn('Session.ready() rejeitou (inesperado):', sessionErr && sessionErr.message);
    }

    try {
      var dados = await _fetchDoBD();
      if (dados !== null) {
        // fetch ocorreu com JWT válido
        _pedidosBD = dados;
        usouBD     = _sincronizarComOrdersStorage(_pedidosBD);
        _mostrarErro(null);
      } else {
        // JWT indisponível após Session.ready() — usuário não está logado
        _log('Usuário não autenticado após Session.ready(). Fila não carregada.');
        _mostrarErro(null); // sem mensagem de erro — estado normal para visitante anon
      }
    } catch (e) {
      _error('Falha ao buscar do Supabase:', e.message);
      _mostrarErro('Falha de conexão: ' + e.message);
    }

    _mostrarLoading(false);
    _girarRefresh(false);

    if (usouBD && typeof OrdersUI !== 'undefined') {
      OrdersUI.render();
    } else if (!usouBD) {
      _renderLegado(_pedidosBD);
    }

    _carregando = false;
  };

  // ── Filtro ─────────────────────────────────────────────────────────────

  global.pedidosFiltrar = function () {
    if (typeof OrdersUI !== 'undefined') OrdersUI.render();
  };

  global.pedidoToggle = function (cardId) {
    var card = document.getElementById(cardId);
    if (card) card.classList.toggle('open');
  };

  // ── Set Status (compatibilidade) ───────────────────────────────────────
  // Para starting/completing usa OrdersAdmin que chama RPC do banco.

  global.pedidoSetStatus = async function (supabaseId, novoStatus) {
    // Delega para OrdersAdmin se disponível (tem as validações corretas)
    if (typeof OrdersAdmin !== 'undefined') {
      if (novoStatus === 'in_progress' || novoStatus === 'confirmado') {
        return OrdersAdmin.startService(supabaseId);
      }
      if (novoStatus === 'completed' || novoStatus === 'entregue' || novoStatus === 'concluido') {
        return OrdersAdmin.completeService(supabaseId);
      }
      if (novoStatus === 'cancelled' || novoStatus === 'cancelado') {
        return OrdersAdmin.cancelOrder(supabaseId);
      }
    }

    try {
      await _atualizarStatusBD(supabaseId, novoStatus);
      var idx = _pedidosBD.findIndex(function (p) { return p.id === supabaseId; });
      if (idx !== -1) {
        _pedidosBD[idx].status_v3 = novoStatus;
        _sincronizarComOrdersStorage(_pedidosBD);
        if (typeof OrdersUI !== 'undefined') OrdersUI.render();
        else _renderLegado(_pedidosBD);
      }
    } catch (e) {
      _error('Falha ao atualizar status:', e.message);
      if (typeof showToast === 'function') showToast('Erro: ' + e.message, 'error');
    }
  };

  // ── Renderização legada (fallback) ─────────────────────────────────────

  function _renderLegado(lista) {
    var el    = document.getElementById('pedidos-lista');
    var empty = document.getElementById('pedidos-empty');
    var badge = document.getElementById('pedidos-count-badge');
    if (!el) return;

    // Só mostra pedidos ativos na fila principal
    var ativos = lista.filter(function (p) {
      var s = p.status_v3 || p.status || '';
      return typeof OrdersProgress !== 'undefined'
        ? OrdersProgress.isActiveStatus(s)
        : (s === 'waiting_queue' || s === 'in_progress');
    }).sort(function (a, b) {
      return new Date(a.created_at) - new Date(b.created_at);
    });

    if (!ativos.length) {
      el.innerHTML = '';
      if (empty) empty.style.display = 'flex';
      if (badge) badge.textContent = '0 na fila';
      return;
    }
    if (empty) empty.style.display = 'none';
    if (badge) badge.textContent = ativos.length + ' na fila';
    el.innerHTML = ativos.map(function (p, idx) { return _renderCardLegado(p, idx + 1); }).join('');
  }

  function _renderCardLegado(p, queuePos) {
    var id      = p.id;
    var _rawNick = p.nick_jogo || '—';
    // [QueuePrivacy] mascara nick de terceiros para usuários comuns
    var nick = _rawNick;
    if (typeof QueuePrivacy !== 'undefined') {
      var _currentUser = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
      var _fakeOrder = { nickname: _rawNick, userId: p.user_id, user_id: p.user_id, id: p.id };
      nick = QueuePrivacy.maskNickSimple(_fakeOrder, _currentUser);
    }
    var status  = p.status_v3 || p.status || 'waiting_queue';
    var totalKK = p.total_kk  || p.subtotal_kk  || '—';
    var date    = _fmtDate(p.created_at);
    var cardId  = 'pedido-card-' + id;
    var itens   = Array.isArray(p.itens) ? p.itens : [];
    try { if (typeof p.itens === 'string') itens = JSON.parse(p.itens); } catch (e) { itens = []; }

    // ETA só para in_progress com started_at
    var etaHTML = '';
    if (status === 'in_progress' && p.started_at && p.sla_min_days) {
      etaHTML = '<span style="color:#60aaff;font-size:11px">⏱ SLA: ' + p.sla_min_days + '~' + p.sla_max_days + 'd (iniciado ' + _fmtDate(p.started_at) + ')</span>';
    } else if (status === 'waiting_queue' || status === 'pendente') {
      etaHTML = '<span style="color:#ffd166;font-size:11px">⏳ Posição #' + queuePos + ' na fila — aguardando início</span>';
    }

    var actionsHTML = '';
    if (status === 'waiting_queue' || status === 'pendente') {
      actionsHTML = '<button class="pedido-action-btn confirmar" onclick="OrdersAdmin.startService(' + id + ')">▶ Iniciar Serviço</button>'
        + '<button class="pedido-action-btn cancelar" onclick="pedidoSetStatus(' + id + ',\'cancelled\')">✕ Cancelar</button>';
    } else if (status === 'in_progress') {
      actionsHTML = '<button class="pedido-action-btn entregar" onclick="OrdersAdmin.completeService(' + id + ')">✓ Concluir</button>'
        + '<button class="pedido-action-btn cancelar" onclick="pedidoSetStatus(' + id + ',\'cancelled\')">✕ Cancelar</button>';
    }

    return '<div class="pedido-card" id="' + cardId + '">'
      + '<div class="pedido-card-header" onclick="pedidoToggle(\'' + cardId + '\')">'
        + '<span class="pedido-card-id">#' + queuePos + '</span>'
        + '<span class="pedido-card-nick">' + nick + '</span>'
        + '<span class="pedido-card-total">' + totalKK + '</span>'
        + '<span class="pedido-card-date">' + date + '</span>'
        + '<span class="pedido-status-pill ' + status + '">' + status + '</span>'
      + '</div>'
      + '<div class="pedido-card-body"><div class="pedido-card-inner">'
        + etaHTML
        + (actionsHTML ? '<div class="pedido-actions">' + actionsHTML + '</div>' : '')
      + '</div></div>'
    + '</div>';
  }

  // ── Inicialização ──────────────────────────────────────────────────────
  // Aguarda Session.ready() antes de disparar pedidosCarregar().
  // Isso elimina o race condition onde pedidos.js roda antes do Session.init().

  function _init() {
    if (_initialized) return;
    _initialized = true;

    // Registra callback de auth change — garante que pedidosCarregar() rode
    // quando o usuário faz login APÓS o DOMContentLoaded (caso mais comum em SPA).
    // Sem isso: usuário abre aba pedidos antes do login → aba fica vazia para sempre.
    if (typeof Session !== 'undefined' && typeof Session.onAuthChange === 'function') {
      Session.onAuthChange(function (event) {
        if (event === 'login') {
          // Delay para garantir que Session.isAdmin() já foi resolvido
          // (profile carregado) antes do render.
          setTimeout(function () {
            if (typeof global.pedidosCarregar === 'function') {
              _log('onAuthChange(login) — disparando pedidosCarregar()');
              global.pedidosCarregar();
            }
          }, 100);
        } else if (event === 'logout') {
          // Limpa cache local ao fazer logout — evita vazar dados de outro usuário
          try { localStorage.removeItem('pa_orders_v2'); } catch (_e) {}
          if (typeof OrdersUI !== 'undefined') OrdersUI.render();
          else if (typeof OrdersKanban !== 'undefined') OrdersKanban.render();
        }
      });
    }

    var tabPedidos = document.getElementById('tab-pedidos');
    if (tabPedidos && tabPedidos.classList.contains('active')) {
      // OBRIGATÓRIO: aguarda sessão completa antes de qualquer fetch/render
      var sessionReady = (typeof Session !== 'undefined' && typeof Session.ready === 'function')
        ? Session.ready()
        : Promise.resolve();
      sessionReady.then(function () {
        global.pedidosCarregar();
      }).catch(function () {
        // Session.ready() nunca rejeita (garantia session.js), mas por segurança:
        global.pedidosCarregar();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})(window);
