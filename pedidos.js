// ============================================================
// pedidos.js — Bridge Supabase ↔ OrdersStorage ↔ OrdersUI
// PokeAlliance Shop
//
// Responsabilidades:
//   - Única fonte de verdade para credenciais Supabase
//   - Busca pedidos do banco de dados
//   - Converte formato Supabase → OrdersStorage
//   - Delega renderização ao OrdersUI
//   - Expõe pedidosCarregar() / pedidosFiltrar() globais (compatibilidade HTML)
//   - Expõe pedidoSetStatus() para ações admin inline
//
// IMPORTANTE: Não declara const em escopo global para evitar
//   "Identifier has already been declared" em múltiplas cargas.
// ============================================================

;(function (global) {
  'use strict';

  // ── Configuração Supabase (única declaração no projeto) ────────────────
  var SB_URL = 'https://xzmefefcfwhlkmqrkxcd.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bWVmZWZjZndobGttcXJreGNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTA5MTEsImV4cCI6MjA5NDE4NjkxMX0.i9ESDqCP9fDdQrK0e-TkchbEJrAlZ6qhKh8-Yu6axAg';

  // Expõe globalmente para outros módulos que precisarem (sem const)
  global.SUPABASE_URL = global.SUPABASE_URL || SB_URL;
  global.SUPABASE_KEY = global.SUPABASE_KEY || SB_KEY;

  // ── Estado interno ─────────────────────────────────────────────────────
  var _pedidosBD = [];      // dados brutos do Supabase
  var _carregando = false;
  var _initialized = false;

  // ── Utilitários ────────────────────────────────────────────────────────

  function _log() {
    var args = Array.prototype.slice.call(arguments);
    console.log.apply(console, ['[Pedidos]'].concat(args));
  }

  function _warn() {
    var args = Array.prototype.slice.call(arguments);
    console.warn.apply(console, ['[Pedidos]'].concat(args));
  }

  function _error() {
    var args = Array.prototype.slice.call(arguments);
    console.error.apply(console, ['[Pedidos]'].concat(args));
  }

  function _fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  // ── Conversão: formato Supabase → OrdersStorage ────────────────────────
  // Permite que o OrdersUI (que lê OrdersStorage) exiba os pedidos do BD.

  function _supabaseToOrderStorage(p) {
    var itens = Array.isArray(p.itens) ? p.itens : [];
    try {
      if (typeof p.itens === 'string') itens = JSON.parse(p.itens);
    } catch (e) { itens = []; }

    var items = itens.map(function (it, idx) {
      return {
        id: 'sb_item_' + p.id + '_' + idx,
        name: it.nome || it.name || '—',
        qtdTotal: parseInt(it.quantidade || it.qty || it.qtdTotal || 1, 10),
        qtdEntregue: (p.status === 'entregue' || p.status === 'concluido') ? parseInt(it.quantidade || 1, 10) : 0,
        concluido: (p.status === 'entregue' || p.status === 'concluido'),
      };
    });

    // Mapeia status antigo → novo (compatibilidade)
    var statusMap = {
      pendente:   'pendente',
      confirmado: 'em_andamento',
      entregue:   'concluido',
      cancelado:  'cancelado',
    };
    var status = statusMap[p.status] || p.status || 'pendente';

    return {
      id:          'sb_' + p.id,
      _supabaseId: p.id,           // ID real no BD para atualizações
      orderNumber: p.id,
      userId:      null,           // BD não tem vínculo de userId local
      nickname:    p.nick_jogo || '—',
      createdAt:   p.created_at || new Date().toISOString(),
      status:      status,
      items:       items,
      progress:    (status === 'concluido') ? 100 : (status === 'em_andamento' ? 50 : 0),
      notifications: [],
      history: [{ at: p.created_at, event: 'created', label: 'Pedido criado', by: p.nick_jogo }],
      cancelledAt:  p.status === 'cancelado' ? p.updated_at : null,
      completedAt:  p.status === 'entregue'  ? p.updated_at : null,
      observations: '',
      // Dados extras do Supabase preservados para render custom
      _totalKK:  p.total_kk  || p.subtotal_kk  || null,
      _totalBRL: p.total_brl || p.subtotal_brl || null,
      _pagModo:  p.pagamento_modo || null,
      _pagKK:    p.pagamento_kk  || null,
      _pagBRL:   p.pagamento_brl || null,
      _taxa:     p.taxa_servico  || false,
    };
  }

  // ── Sincroniza dados do BD com OrdersStorage ───────────────────────────
  // Mantém pedidos do BD separados dos pedidos locais (prefixo 'sb_')

  function _sincronizarComOrdersStorage(pedidosBD) {
    if (typeof OrdersStorage === 'undefined') {
      _warn('OrdersStorage não disponível — renderização delegada ao sistema legado');
      return false;
    }

    console.group('[Pedidos] Sincronizando com OrdersStorage');
    _log('Pedidos recebidos do BD:', pedidosBD.length);

    try {
      // Lê pedidos locais (criados pelo sistema novo, sem prefixo sb_)
      var todos = OrdersStorage.getAllOrders();
      var locais = todos.filter(function (o) { return !o.id.startsWith('sb_'); });

      // Converte pedidos do BD
      var doBD = pedidosBD.map(_supabaseToOrderStorage);

      // Mescla: locais + BD (BD tem prioridade pelo prefixo sb_)
      var merged = locais.concat(doBD);

      // Salva no storage (acessa diretamente para não conflitar com API pública)
      try {
        localStorage.setItem('pa_orders_v2', JSON.stringify(merged));
        _log('Orders salvos no storage:', merged.length, '(locais:', locais.length, '+ BD:', doBD.length + ')');
      } catch (e) {
        _error('Falha ao salvar no localStorage:', e);
      }

      console.groupEnd();
      return true;
    } catch (e) {
      _error('Erro na sincronização:', e);
      console.groupEnd();
      return false;
    }
  }

  // ── Fetch principal do Supabase ────────────────────────────────────────

  async function _fetchDoBD() {
    _log('Iniciando fetch do Supabase...');
    var res = await fetch(SB_URL + '/rest/v1/pedidos?order=created_at.desc&limit=500', {
      headers: {
        'apikey':        SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
      },
    });
    if (!res.ok) throw new Error('Supabase respondeu com status ' + res.status);
    var dados = await res.json();
    _log('Fetch concluído. Total de pedidos:', dados.length);
    return dados;
  }

  // ── Atualiza status no Supabase ────────────────────────────────────────

  async function _atualizarStatusBD(supabaseId, novoStatus) {
    // Mapeia status interno → status do BD
    var statusReverso = {
      pendente:     'pendente',
      em_andamento: 'confirmado',
      concluido:    'entregue',
      cancelado:    'cancelado',
    };
    var statusBD = statusReverso[novoStatus] || novoStatus;

    var res = await fetch(SB_URL + '/rest/v1/pedidos?id=eq.' + supabaseId, {
      method:  'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({ status: statusBD }),
    });
    if (!res.ok) throw new Error('Erro ao atualizar: status ' + res.status);
  }

  // ── UI helpers ─────────────────────────────────────────────────────────

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

  global.pedidosCarregar = async function () {
    if (_carregando) {
      _log('Carregamento já em progresso, ignorando chamada duplicada');
      return;
    }
    _carregando = true;
    console.group('[Pedidos] Carregando pedidos');

    _mostrarLoading(true);
    _mostrarErro(null);
    _girarRefresh(true);

    var usouBD = false;

    try {
      _pedidosBD = await _fetchDoBD();
      usouBD = _sincronizarComOrdersStorage(_pedidosBD);
      _mostrarErro(null);
    } catch (e) {
      _error('Falha ao buscar do Supabase:', e.message);
      _mostrarErro('Falha de conexão: ' + e.message + '. Exibindo dados locais.');
      _pedidosBD = [];
      // Não limpa OrdersStorage — mantém dados locais existentes
    }

    _mostrarLoading(false);
    _girarRefresh(false);

    // Delega renderização
    if (usouBD && typeof OrdersUI !== 'undefined') {
      _log('Delegando renderização ao OrdersUI');
      OrdersUI.render();
    } else if (!usouBD) {
      // Fallback: renderização legada com dados do BD direto
      _log('Usando renderização legada');
      _renderLegado(_pedidosBD);
    }

    console.groupEnd();
    _carregando = false;
  };

  // ── Filtro (compatibilidade HTML) ──────────────────────────────────────

  global.pedidosFiltrar = function () {
    // Conecta o input/select à lógica do OrdersUI
    if (typeof OrdersUI !== 'undefined') {
      // Lê valores atuais e força re-render
      var search = document.getElementById('pedidos-search');
      var status = document.getElementById('pedidos-status-filter');
      // Os eventos já estão conectados pelo _setupTopbar do OrdersUI
      OrdersUI.render();
    }
  };

  // ── Toggle de card (compatibilidade) ──────────────────────────────────

  global.pedidoToggle = function (cardId) {
    var card = document.getElementById(cardId);
    if (card) card.classList.toggle('open');
  };

  // ── Atualiza status (compatibilidade + novo sistema) ───────────────────

  global.pedidoSetStatus = async function (supabaseId, novoStatus) {
    console.group('[Pedidos] Atualizando status #' + supabaseId);
    try {
      await _atualizarStatusBD(supabaseId, novoStatus);
      _log('Status atualizado no BD:', novoStatus);

      // Atualiza cache local
      var idx = _pedidosBD.findIndex(function (p) { return p.id === supabaseId; });
      if (idx !== -1) {
        _pedidosBD[idx].status = novoStatus;
        _sincronizarComOrdersStorage(_pedidosBD);
        if (typeof OrdersUI !== 'undefined') OrdersUI.render();
        else _renderLegado(_pedidosBD);
      }
    } catch (e) {
      _error('Falha ao atualizar status:', e.message);
      alert('Erro ao atualizar status: ' + e.message);
    }
    console.groupEnd();
  };

  // ── Renderização legada (fallback sem OrdersUI) ────────────────────────
  // Usado quando OrdersStorage/OrdersUI não estão disponíveis

  function _renderLegado(lista) {
    var el    = document.getElementById('pedidos-lista');
    var empty = document.getElementById('pedidos-empty');
    var badge = document.getElementById('pedidos-count-badge');

    if (!el) return;

    if (!lista || !lista.length) {
      el.innerHTML = '';
      if (empty) empty.style.display = 'flex';
      if (badge) badge.textContent = '0 pedidos';
      return;
    }

    if (empty) empty.style.display = 'none';
    if (badge) badge.textContent = lista.length + ' pedido' + (lista.length !== 1 ? 's' : '');

    el.innerHTML = lista.map(_renderCardLegado).join('');
  }

  function _renderCardLegado(p) {
    var id       = p.id;
    var nick     = p.nick_jogo || '—';
    var status   = p.status    || 'pendente';
    var totalKK  = p.total_kk  || p.subtotal_kk  || '—';
    var totalBRL = p.total_brl || p.subtotal_brl || '—';
    var modoLabel = p.pagamento_modo === 'brl' ? totalBRL
                  : p.pagamento_modo === 'mix' ? ((p.pagamento_kk || '') + ' + ' + (p.pagamento_brl || ''))
                  : totalKK;
    var itens = Array.isArray(p.itens) ? p.itens : [];
    try { if (typeof p.itens === 'string') itens = JSON.parse(p.itens); } catch (e) { itens = []; }
    var date   = _fmtDate(p.created_at);
    var cardId = 'pedido-card-' + id;

    var itensHTML = itens.map(function (it) {
      return '<div class="pedido-item-row">'
        + '<span class="pedido-item-nome">' + (it.nome || '—')
          + (it.tier ? ' <small style="opacity:.45">(' + it.tier + ')</small>' : '') + '</span>'
        + '<span class="pedido-item-qty">x' + (it.quantidade || 1) + '</span>'
        + '<span class="pedido-item-preco">' + (it.preco_total_kk || '—') + '</span>'
        + '</div>';
    }).join('');

    var actionsHTML = '';
    if (status === 'pendente') {
      actionsHTML = '<button class="pedido-action-btn confirmar" onclick="pedidoSetStatus(' + id + ',\'confirmado\')">✓ Confirmar</button>'
        + '<button class="pedido-action-btn entregar" onclick="pedidoSetStatus(' + id + ',\'entregue\')">📦 Entregar</button>'
        + '<button class="pedido-action-btn cancelar" onclick="pedidoSetStatus(' + id + ',\'cancelado\')">✕ Cancelar</button>';
    } else if (status === 'confirmado') {
      actionsHTML = '<button class="pedido-action-btn entregar" onclick="pedidoSetStatus(' + id + ',\'entregue\')">📦 Marcar Entregue</button>'
        + '<button class="pedido-action-btn cancelar" onclick="pedidoSetStatus(' + id + ',\'cancelado\')">✕ Cancelar</button>';
    }

    return '<div class="pedido-card" id="' + cardId + '">'
      + '<div class="pedido-card-header" onclick="pedidoToggle(\'' + cardId + '\')">'
        + '<span class="pedido-card-id">#' + String(id).padStart(4, '0') + '</span>'
        + '<span class="pedido-card-nick">' + nick + '</span>'
        + '<span class="pedido-card-total">' + modoLabel + '</span>'
        + '<span class="pedido-card-date">' + date + '</span>'
        + '<span class="pedido-status-pill ' + status + '">' + status + '</span>'
        + '<svg class="pedido-card-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>'
      + '</div>'
      + '<div class="pedido-card-body">'
        + '<div class="pedido-card-inner">'
          + '<div class="pedido-itens-label">Itens do pedido</div>'
          + itensHTML
          + '<div class="pedido-totais">'
            + '<div class="pedido-total-box"><div class="pedido-total-box-label">Total KK</div><div class="pedido-total-box-val">' + totalKK + '</div></div>'
            + '<div class="pedido-total-box"><div class="pedido-total-box-label">Total R$</div><div class="pedido-total-box-val" style="color:#5ae698">' + totalBRL + '</div></div>'
            + (p.taxa_servico ? '<div class="pedido-total-box" style="flex:none"><div class="pedido-total-box-label">Taxa</div><div class="pedido-total-box-val" style="color:#ff9060;font-size:12px">+5kk aplicada</div></div>' : '')
          + '</div>'
          + (actionsHTML ? '<div class="pedido-actions">' + actionsHTML + '</div>' : '')
        + '</div>'
      + '</div>'
    + '</div>';
  }

  // ── Inicialização automática ───────────────────────────────────────────

  function _init() {
    if (_initialized) return;
    _initialized = true;

    _log('Módulo carregado. Aguardando tab de pedidos...');

    // Intercepta switchTab para carregar ao abrir a aba
    var _origSwitch = global.switchTab;
    global.switchTab = function (tab, el) {
      if (_origSwitch) _origSwitch(tab, el);
      if (tab === 'pedidos') {
        _log('Tab pedidos ativada → carregando');
        global.pedidosCarregar();
      }
    };

    // Se a aba já está ativa no carregamento, busca imediatamente
    var tabPedidos = document.getElementById('tab-pedidos');
    if (tabPedidos && tabPedidos.classList.contains('active')) {
      _log('Aba pedidos já ativa na carga inicial → carregando');
      global.pedidosCarregar();
    }
  }

  // Aguarda DOM + todos os módulos
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    // DOM já pronto (script carregado após DOMContentLoaded)
    _init();
  }

})(window);
