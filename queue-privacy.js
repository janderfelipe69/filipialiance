// ============================================================
// queue-privacy.js — v1 — PRIVACIDADE DA FILA DE PEDIDOS
// PokeAlliance Shop
//
// OBJETIVO:
//   Usuários comuns NÃO veem nicknames de outros clientes.
//   Admins continuam vendo tudo normalmente.
//
// REGRAS:
//   - admin           → nick real sempre
//   - próprio pedido  → "VOCÊ" (badge destacado)
//   - outro usuário   → "Treinador" (anônimo)
//
// INTEGRAÇÃO:
//   Chamado por orders-ui.js, orders-kanban.js e delivery-system.js.
//   Exporta QueuePrivacy.maskNick(nick, orderId, userId, currentUser)
//
// LOGS:
//   [QueuePrivacy] admin detectado
//   [QueuePrivacy] pedido do próprio usuário
//   [QueuePrivacy] ocultando nick
// ============================================================

const QueuePrivacy = (() => {
  'use strict';

  // Nomes genéricos rotativos para anonimização — adiciona variedade visual
  // sem revelar identidade. O índice é derivado do início do ID (determinístico).
  const ANON_LABELS = [
    'Treinador',
    'Treinador',
    'Cliente',
    'Treinador',
    'Aventureiro',
    'Treinador',
    'Treinador',
    'Cliente',
  ];

  /**
   * Retorna um label anônimo determinístico baseado no ID do pedido.
   * Mesmo pedido sempre recebe o mesmo label — sem flickering.
   */
  function _anonLabel(orderId) {
    if (!orderId) return 'Treinador';
    // Soma dos char codes do id → índice estável
    const sum = String(orderId).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return ANON_LABELS[sum % ANON_LABELS.length];
  }

  /**
   * Detecta se o usuário atual é admin.
   * Delega exclusivamente para Session.isAdmin() — fonte única de verdade.
   * Fase 2 Passo 3.1: removido fallback local (currentUser.role).
   */
  function _isAdmin(currentUser) {
    return typeof Session !== 'undefined' && typeof Session.isAdmin === 'function'
      ? Session.isAdmin()
      : false;
  }

  /**
   * Detecta se o pedido pertence ao usuário logado.
   * Compara por userId (UUID) e, como fallback, por nickname.
   */
  function _isOwner(order, currentUser) {
    if (!currentUser || !order) return false;
    if (order.userId && currentUser.id && order.userId === currentUser.id) return true;
    if (order.user_id && currentUser.id && order.user_id === currentUser.id) return true;
    // fallback por nickname (compatibilidade com pedidos legados sem userId)
    if (order.nickname && currentUser.nickname && order.nickname === currentUser.nickname) return true;
    return false;
  }

  /**
   * maskNick — função principal.
   *
   * @param {object} order       — objeto do pedido (deve ter .nickname, .userId)
   * @param {object} currentUser — usuário logado (pode ser null)
   * @returns {{ label: string, isOwner: boolean, isAdmin: boolean, masked: boolean }}
   */
  function maskNick(order, currentUser) {
    const admin = _isAdmin(currentUser);
    const owner = _isOwner(order, currentUser);
    const realNick = order.nickname || order.nick_jogo || order.cliente_nick || '—';

    if (admin) {
      console.log('[QueuePrivacy] admin detectado — exibindo nick real:', realNick);
      return { label: realNick, isOwner: owner, isAdmin: true, masked: false };
    }

    if (owner) {
      console.log('[QueuePrivacy] pedido do próprio usuário — exibindo VOCÊ');
      return { label: realNick, isOwner: true, isAdmin: false, masked: false };
    }

    // Usuário comum vendo pedido de terceiro
    const anon = _anonLabel(order.id || order.orderNumber);
    console.log('[QueuePrivacy] ocultando nick:', realNick, '→', anon);
    return { label: anon, isOwner: false, isAdmin: false, masked: true };
  }

  /**
   * maskNickSimple — versão que retorna apenas a string do label.
   * Para uso rápido onde não precisa de metadados.
   */
  function maskNickSimple(order, currentUser) {
    return maskNick(order, currentUser).label;
  }

  /**
   * buildNickHTML — gera o HTML completo do nick com badge "VOCÊ" se necessário.
   * Usado diretamente nos templates de card.
   *
   * @param {object} order
   * @param {object} currentUser
   * @param {object} [opts]
   * @param {boolean} [opts.showYouBadge=true]   — exibe badge "você"
   * @param {boolean} [opts.showIcon=true]        — exibe ícone de usuário
   * @returns {string} HTML pronto para inserir
   */
  function buildNickHTML(order, currentUser, opts = {}) {
    const { label, isOwner, isAdmin, masked } = maskNick(order, currentUser);
    const showYouBadge = opts.showYouBadge !== false;
    const showIcon     = opts.showIcon     !== false;

    const iconSVG = showIcon
      ? `<svg class="qp-nick-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`
      : '';

    // Badge "VOCÊ" — só para o próprio usuário
    const youBadge = (isOwner && showYouBadge)
      ? `<span class="qp-you-badge">você</span>`
      : '';

    // Badge admin (ícone discreto para indicar que está vendo nick real de terceiro)
    const adminBadge = (isAdmin && !isOwner)
      ? `<span class="qp-admin-badge" title="Visível apenas para admins">👁</span>`
      : '';

    // Classe CSS extra para nicks mascarados (estilo diferenciado)
    const maskedClass = masked ? ' qp-nick--masked' : '';

    const escLabel = _esc(label);

    return `<span class="qp-nick${maskedClass}">${iconSVG}${escLabel}${youBadge}${adminBadge}</span>`;
  }

  /**
   * buildYouBadge — retorna só o badge "você" se for owner.
   * Para casos onde o nick já está sendo exibido separadamente.
   */
  function buildYouBadge(order, currentUser) {
    const { isOwner } = maskNick(order, currentUser);
    return isOwner ? `<span class="qp-you-badge">você</span>` : '';
  }

  /**
   * shouldShowNick — retorna true se o nick real deve ser exibido.
   * Atalho para condicionais simples.
   */
  function shouldShowNick(order, currentUser) {
    const r = maskNick(order, currentUser);
    return r.isAdmin || r.isOwner;
  }

  /**
   * filterSearchByPrivacy — filtra a busca por nick respeitando privacidade.
   * Usuário comum só pode buscar pelo próprio nick; admin busca qualquer um.
   */
  function canSearchByNick(query, order, currentUser) {
    if (!query) return true;
    const admin = _isAdmin(currentUser);
    if (admin) return true; // admin pode buscar qualquer nick

    // Usuário comum só pode "achar" o próprio pedido por nick
    const owner = _isOwner(order, currentUser);
    return owner;
  }

  // ── Injeção de estilos ──────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('qp-styles')) return;
    const s = document.createElement('style');
    s.id = 'qp-styles';
    s.textContent = `
/* ══════════════════════════════════════════════
   QueuePrivacy — estilos de nick
   ══════════════════════════════════════════════ */

/* Container genérico do nick */
.qp-nick {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--font-body, 'Rajdhani', sans-serif);
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.75);
  white-space: nowrap;
}

.qp-nick-icon {
  flex-shrink: 0;
  opacity: 0.6;
}

/* Nick mascarado (usuário anônimo) — tom levemente diferente */
.qp-nick--masked {
  color: rgba(255,255,255,0.38);
  font-style: italic;
  font-weight: 500;
}
.qp-nick--masked .qp-nick-icon {
  opacity: 0.3;
}

/* Badge "VOCÊ" — destaque azul */
.qp-you-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(96,170,255,0.15);
  border: 1px solid rgba(96,170,255,0.25);
  color: #60aaff;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  font-style: normal;
}

/* Badge admin 👁 — discreto */
.qp-admin-badge {
  font-size: 10px;
  opacity: 0.45;
  cursor: default;
  font-style: normal;
}

/* Compatibilidade: substitui .order-card-you-badge e .kb-you-badge */
.order-card-you-badge,
.kb-you-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(96,170,255,0.15);
  border: 1px solid rgba(96,170,255,0.25);
  color: #60aaff;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}
    `;
    document.head.appendChild(s);
  }

  // ── Utilitário interno ──────────────────────────────────────────────────
  function _esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ══════════════════════════════════════════════════════════════════════
  // formatPublicOrderTitle — título público de um pedido
  //
  // REGRAS:
  //   Admin / dono → título real (nome do pokémon, item, pacote)
  //   Outros       → título genérico por tipo
  //
  //   Captura Pokémon → "Captura Pokémon T1/T2/T3/SR"
  //   Pacote          → nome do pacote (sem listar itens)
  //   Item avulso     → "QTD× Nome do item"
  // ══════════════════════════════════════════════════════════════════════
  function formatPublicOrderTitle(order, currentUser) {
    if (!order) return '—';
    if (_isAdmin(currentUser) || _isOwner(order, currentUser)) {
      return _buildRealTitle(order);
    }
    return _buildMaskedTitle(order);
  }

  function formatPublicOrderTitleMeta(order, currentUser) {
    if (!order) return { title: '—', type: 'item', tierLabel: null, isPrivileged: false };
    const isPrivileged = _isAdmin(currentUser) || _isOwner(order, currentUser);
    const title = isPrivileged ? _buildRealTitle(order) : _buildMaskedTitle(order);
    const items = order.items || [];
    const captureItem = items.find(function(it) { return _isCaptureItem(it); });
    const isPokemon   = !!(captureItem || (order.service_type || '').toLowerCase().includes('pokemon'));
    const isPackage   = !isPokemon && _isPackageOrder(order);
    const rawTier     = captureItem
      ? ((captureItem.tier || captureItem.tag || '')).toLowerCase()
      : (items[0] ? (items[0].tier || '') : '').toLowerCase();
    return {
      title,
      type:      isPokemon ? 'capture' : isPackage ? 'package' : 'item',
      tierLabel: isPokemon ? (_tierToLabel(rawTier) || null) : null,
      isPrivileged,
    };
  }

  function _buildRealTitle(order) {
    const items = order.items || [];
    if (!items.length) return order.service_name || '—';
    const captureItem = items.find(function(it) { return _isCaptureItem(it); });
    if (captureItem) return captureItem.pokemon || captureItem.name || '—';
    if (_isPackageOrder(order)) return order.service_name || (items[0] && items[0].name) || 'Pacote';
    return items.map(function(it) {
      return (it.qtdTotal > 1 ? it.qtdTotal + '× ' : '') + (it.name || '—');
    }).join(', ');
  }

  function _buildMaskedTitle(order) {
    const items       = order.items || [];
    const serviceType = (order.service_type || '').toLowerCase();
    const captureItem = items.find(function(it) { return _isCaptureItem(it); });
    const isPokemon   = !!(captureItem || serviceType.includes('pokemon'));

    if (isPokemon) {
      const captureItems = items.filter(function(it) { return _isCaptureItem(it); });

      // Log de diagnóstico temporário (Fase 5.3.0b)
      if (typeof console !== 'undefined') {
        console.log('[QUEUE_PRIVACY]', {
          orderId:      order.id || order.orderNumber,
          captureItems: captureItems.length,
          tiers:        captureItems.map(function(it) { return it.tier || it.tag || '(vazio)'; }),
          serviceType:  serviceType,
        });
      }

      if (captureItems.length === 0) {
        // Pedido marcado como captura mas sem itens: fallback por service_type
        const stTier = serviceType.includes('pokemon_sr') || serviceType.includes('sr')
          ? 'SR' : '';
        return stTier ? 'Captura Pokémon ' + stTier : 'Captura Pokémon';
      }

      // Conta por tier para "T1 ×3" ou "T1, SR"
      const tierCount = {};  // { 'T1': 2, 'SR': 1 }
      captureItems.forEach(function(it) {
        const lbl = normalizeTierLabel(it.tier || it.tag || '');
        const key = lbl || '_sem_tier';
        tierCount[key] = (tierCount[key] || 0) + (it.qtdTotal || 1);
      });

      const tierKeys    = Object.keys(tierCount).filter(function(k) { return k !== '_sem_tier'; });
      const totalCount  = captureItems.reduce(function(s, it) { return s + (it.qtdTotal || 1); }, 0);

      // Fase 5.3.0c: título limpo — tier não vai mais no texto.
      // As badges individuais (buildTierBadges) exibem os tiers visualmente.
      // Mantemos só a contagem no fallback de acessibilidade quando não há badges.
      if (tierKeys.length === 0 && totalCount > 1) {
        // Sem tier identificável e múltiplos itens: exibe contagem mínima
        return 'Captura Pokémon ×' + totalCount;
      }

      return 'Captura Pokémon';
    }

    if (_isPackageOrder(order)) {
      return order.service_name || (items[0] && items[0].name) || 'Pacote';
    }

    if (items.length) {
      return items.map(function(it) {
        return (it.qtdTotal > 1 ? it.qtdTotal + '× ' : '') + (it.name || '—');
      }).join(', ');
    }
    return order.service_name || '—';
  }

  // ── normalizeTierLabel — função pública centralizada (Fase 5.3.0b) ──────
  // Normaliza qualquer representação de tier para label canônico.
  // Exposta em QueuePrivacy.normalizeTierLabel para uso externo.
  function normalizeTierLabel(tier) {
    if (!tier) return '';
    const t = String(tier).toLowerCase().replace(/[\s_-]/g, '');
    if (t === 't1') return 'T1';
    if (t === 't2') return 'T2';
    if (t === 't3') return 'T3';
    // SR: aceita super-raro, superraro, sr, pokemon_sr, pokemonsr, ultra-raro, t4..t6
    if (t === 'superraro' || t === 'sr' || t === 'pokemonsr' ||
        t === 'ultrararo' || t === 'ultrarare' ||
        t === 't4' || t === 't5' || t === 't6') return 'SR';
    return '';
  }

  // Alias interno
  const _tierToLabel = normalizeTierLabel;

  function _isCaptureItem(item) {
    if (!item) return false;
    if (item.type === 'capture') return true;
    if (item.pokemon) return true;
    if (item.name && /\(\w+ ball\)/i.test(item.name)) return true;
    return false;
  }

  function _isPackageOrder(order) {
    const st = (order.service_type || '').toLowerCase();
    if (st === 'normal_package') return true;
    const items = order.items || [];
    if (!items.length) return false;
    if (items.some(function(it) { return _isCaptureItem(it); })) return false;
    return items.length > 1;
  }

  // ══════════════════════════════════════════════════════════════════════
  // getPublicOrderLabel — função canônica e centralizada para o label
  // de um pedido respeitando privacidade.
  //
  // É o ponto único de verdade para QUALQUER componente que precise
  // exibir o conteúdo de um pedido (orders-ui, delivery-system, kanban).
  //
  // REGRAS:
  //   admin          → título real sempre (nome do pokémon, item, pacote)
  //   dono do pedido → título real do próprio pedido
  //   outros         → título genérico por tipo:
  //                      Captura → "Captura Pokémon T1/T2/SR"
  //                      Pacote  → nome do pacote (sem listar itens)
  //                      Item    → "QTD× Nome do item" (itens avulsos são ok)
  //
  // @param {object}  order       — objeto do pedido
  // @param {object}  currentUser — usuário logado (pode ser null)
  // @param {boolean} [forceAdmin=false] — passa true se já sabe que é admin
  //                                        (evita chamada extra a Session)
  //
  // @returns {{
  //   label:        string,   — texto a exibir
  //   isPrivileged: boolean,  — true se está vendo título real
  //   isAdmin:      boolean,
  //   isOwner:      boolean,
  //   type:         string,   — 'capture' | 'package' | 'item'
  //   tierLabel:    string|null
  // }}
  // ══════════════════════════════════════════════════════════════════════
  function getPublicOrderLabel(order, currentUser, forceAdmin) {
    if (!order) {
      return { label: '—', isPrivileged: false, isAdmin: false, isOwner: false, type: 'item', tierLabel: null };
    }

    const admin  = forceAdmin === true || _isAdmin(currentUser);
    const owner  = _isOwner(order, currentUser);
    const isPrivileged = admin || owner;

    const items        = order.items || [];
    const captureItem  = items.find(function(it) { return _isCaptureItem(it); });
    const serviceType  = (order.service_type || '').toLowerCase();
    const isPokemon    = !!(captureItem || serviceType.includes('pokemon'));
    const isPackage    = !isPokemon && _isPackageOrder(order);

    const rawTier = captureItem
      ? (captureItem.tier || captureItem.tag || '').toLowerCase()
      : (items[0] ? (items[0].tier || '') : '').toLowerCase();
    const tierLabel = isPokemon ? (_tierToLabel(rawTier) || null) : null;

    const type = isPokemon ? 'capture' : isPackage ? 'package' : 'item';

    const label = isPrivileged
      ? _buildRealTitle(order)
      : _buildMaskedTitle(order);

    // Fase 5.3.0c: captureItems exposed so renderer can build individual badges
    const captureItems = (type === 'capture') ? items.filter(function(it) { return _isCaptureItem(it); }) : [];
    return { label, isPrivileged, isAdmin: admin, isOwner: owner, type, tierLabel, captureItems };
  }


  // ── buildTierBadges — Fase 5.3.0c ──────────────────────────────────────
  // Recebe items[] de um pedido e retorna HTML de badges individuais por item.
  // Regras:
  //   - cada item de captura gera 1 badge com seu tier
  //   - itens sem tier identificável: badge omitida (não gera vazio)
  //   - não revela o nome do Pokémon
  //   - retorna '' se nenhum badge gerado (compatibilidade com pedidos antigos)
  function buildTierBadges(items) {
    if (!items || !items.length) return '';

    const badges = [];
    items.forEach(function(it) {
      if (!_isCaptureItem(it)) return;
      const lbl = normalizeTierLabel(it.tier || it.tag || '');
      if (!lbl) return;
      badges.push('<span class="order-item-tier-badge order-item-tier--' + lbl.toLowerCase() + '">' + lbl + '</span>');
    });

    if (!badges.length) return '';

    return '<div class="order-item-tier-badges">' + badges.join('') + '</div>';
  }

  // Auto-injeção de estilos quando o módulo carrega
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectStyles);
  } else {
    injectStyles();
  }

  // ── API Pública ─────────────────────────────────────────────────────────
  return {
    // Função canônica — use esta em novos componentes
    getPublicOrderLabel,
    // Normalização centralizada de tier (Fase 5.3.0b)
    normalizeTierLabel,
    // Badges individuais por item de captura (Fase 5.3.0c)
    buildTierBadges,

    // Funções existentes mantidas para compatibilidade
    maskNick,
    maskNickSimple,
    buildNickHTML,
    buildYouBadge,
    shouldShowNick,
    canSearchByNick,
    injectStyles,
    formatPublicOrderTitle,
    formatPublicOrderTitleMeta,
  };
})();
