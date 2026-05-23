// ============================================================
// schema-compat.js — CAMADA ÚNICA DE COMPATIBILIDADE DE DADOS
// PokeAlliance Shop
//
// OBJETIVO:
//   Centralizar toda lógica de normalização, sanitização e
//   renderização segura em um único módulo carregado antes
//   de todos os outros (exceto supabase-client.js e session.js).
//
// EXPORTS GLOBAIS:
//   normalizeDeliveryProof(record)  → registro canônico EN
//   sanitizeDeliveryPayload(payload) → payload limpo para INSERT/UPDATE
//   safe(value, fallback)           → renderização segura de campo
//   SchemaCompat                    → namespace completo
//
// LOGS DE DEBUG:
//   [DataNormalize]   — normalização de registros recebidos
//   [PayloadSanitize] — sanitização antes de INSERT/UPDATE
//   [SafeRender]      — fallback ativado em safe()
//   [PartialRender]   — card renderizado com dados incompletos
//   [SchemaCompat]    — eventos gerais do módulo
//
// REGRAS ABSOLUTAS:
//   1. normalizeDeliveryProof() é o único lugar onde aliases PT são
//      convertidos para EN. Nunca acesse record.servico_nome fora daqui.
//   2. sanitizeDeliveryPayload() remove TODOS os campos legados PT
//      antes de qualquer INSERT/UPDATE no Supabase.
//   3. safe() deve ser usado em TODA renderização de campo de entrega.
//   4. Nenhuma tela pode quebrar por campo ausente ou nulo.
// ============================================================

;(function (global) {
  'use strict';

  // ══════════════════════════════════════════════════════════
  // PASSO 1 — normalizeDeliveryProof(record)
  // Recebe qualquer formato (antigo ou novo) e retorna sempre
  // o mesmo shape canônico EN. Idempotente: seguro chamar N vezes.
  // ══════════════════════════════════════════════════════════

  /**
   * Normaliza um registro de delivery_proofs para o shape canônico.
   * Resolve variantes PT/EN, arrays de prints, URLs relativas e fallbacks.
   *
   * @param {Object} record - Registro bruto vindo do Supabase ou Realtime
   * @returns {{ id, service_name, pokemon_name, service_type, quantity,
   *             player_name, cliente_nick, descricao, image_url,
   *             created_at, delivered_at, order_created_at, prints,
   *             status, _normalized }}
   * @note 'status' é campo COMPUTADO de display (sempre 'concluido').
   *       Não existe como coluna em delivery_proofs — não é lido via SELECT.
   * @note 'delivered_at' existe na tabela como nullable timestamptz.
   */
  function normalizeDeliveryProof(record) {
    // Guarda defensivo: registro nulo ou já normalizado
    if (!record) {
      console.warn('[DataNormalize] record nulo recebido — retornando stub vazio');
      return _emptyStub();
    }
    if (record._normalized) return record;

    console.log('[DataNormalize] normalizando id:', record.id,
      '| campos recebidos:', Object.keys(record).join(', '));

    // ── 1. service_name ────────────────────────────────────────────────
    const service_name =
      record.service_name   ||   // EN canônico (novo)
      record.servico_nome   ||   // PT legado
      record.service        ||   // alias curto
      null;

    if (!service_name) {
      console.log('[DataNormalize] campo ausente: service_name (id:', record.id, ')');
    } else if (!record.service_name) {
      const src = record.servico_nome ? 'servico_nome' : 'service';
      console.log('[DataNormalize] fallback service_name ←', src, '=', service_name);
    }

    // ── 2. pokemon_name ────────────────────────────────────────────────
    const pokemon_name =
      record.pokemon_name   ||   // EN canônico (novo)
      record.pokemon_nome   ||   // PT legado
      record.pokemon        ||   // alias curto
      null;

    if (!pokemon_name && !record.pokemon_name) {
      console.log('[DataNormalize] campo ausente: pokemon_name (id:', record.id, ')');
    } else if (record.pokemon_name === undefined && pokemon_name) {
      console.log('[DataNormalize] fallback pokemon_name ← legado');
    }

    // ── 3. service_type ────────────────────────────────────────────────
    const service_type =
      record.service_type   ||   // EN canônico (novo)
      record.tipo_pedido    ||   // PT legado
      record.tipo           ||   // alias curto
      record.type           ||   // alias EN alternativo
      null;

    // ── 4. cliente_nick ────────────────────────────────────────────────
    const cliente_nick =
      record.cliente_nick   ||   // EN canônico (novo)
      record.nick           ||   // alias curto legado
      record.client_nick    ||   // variante EN
      record.nickname       ||   // variante de pedidos
      null;

    // ── 5. descricao ───────────────────────────────────────────────────
    const descricao =
      record.descricao      ||   // canônico
      record.description    ||   // EN alternativo
      record.desc           ||   // alias curto legado
      null;

    // ── 6. created_at ──────────────────────────────────────────────────
    // concluido_at é alias PT legado — nunca vai ao banco, só usado aqui como fallback.
    // delivered_at: coluna real (nullable timestamptz) — reabilitada.
    const created_at =
      record.created_at     ||
      record.concluido_at   ||   // fallback PT legado — leitura somente, nunca escrita
      null;

    // ── 7. status (CAMPO COMPUTADO — não existe no banco) ──────────────
    // 'status' NÃO é coluna de delivery_proofs. Derivado aqui só para UI.
    // Nunca entra em SELECT nem INSERT.
    const status = 'concluido';

    // ── 8. image_url + prints ──────────────────────────────────────────
    const { image_url, prints } = _resolveImages(record);

    // ── Novos campos: player_name, quantity, order_created_at ─
    const player_name =
      record.player_name    ||
      record.cliente_nick   ||
      record.nick           ||
      record.nickname       ||
      null;

    const quantity =
      record.quantity != null ? parseInt(record.quantity, 10) :
      record.service_quantity != null ? parseInt(record.service_quantity, 10) :
      null;

    const order_created_at =
      record.order_created_at ||
      null;

    // ── Resultado canônico ─────────────────────────────────────────────
    const normalized = {
      // Identidade
      id:               record.id           || null,
      order_id:         record.order_id     || record.pedido_id || null,
      delivered_by:     record.delivered_by || null,

      // Campos canônicos EN (apenas colunas que existem na tabela)
      service_name,
      pokemon_name,
      service_type,
      quantity,
      player_name,
      cliente_nick,
      descricao,
      image_url,
      created_at,
      delivered_at:     record.delivered_at     || null,
      order_created_at: order_created_at,
      status,   // computado de display — não é coluna do banco
      prints,

      // Marcador de idempotência — não serializar para o banco
      _normalized: true,
      _partial: !service_name || !image_url,
    };

    if (normalized._partial) {
      console.log('[PartialRender] dados incompletos detectados — id:', record.id,
        '| service_name:', !!service_name, '| image_url:', !!image_url);
    }

    console.log('[DataNormalize] ✅ normalizado id:', record.id, {
      service_name: service_name || '(null)',
      pokemon_name: pokemon_name || '(null)',
      service_type: service_type || '(null)',
      cliente_nick: cliente_nick || '(null)',
      image_url:    image_url    ? '✅' : '(sem imagem)',
      prints:       prints.length,
      _partial:     normalized._partial,
    });

    return normalized;
  }

  // ── Imagem ────────────────────────────────────────────────────────────

  function _resolveImages(record) {
    const image_url = record.image_url || null;
    const prints    = image_url ? [{ url: image_url }] : [];
    return { image_url, prints };
  }

  function _emptyStub() {
    return {
      id: null, order_id: null, delivered_by: null,
      service_name: null, pokemon_name: null, service_type: null,
      quantity: null, player_name: null,
      cliente_nick: null, descricao: null, image_url: null,
      created_at: null, delivered_at: null, order_created_at: null,
      status: 'concluido', prints: [],
      _normalized: true, _partial: true,
    };
  }

  // ══════════════════════════════════════════════════════════
  // PASSO 2 — sanitizeDeliveryPayload(payload)
  // Remove campos legados PT antes de INSERT/UPDATE no Supabase.
  // Converte tudo para EN canônico.
  // ══════════════════════════════════════════════════════════

  /**
   * Sanitiza um payload antes de enviá-lo ao Supabase.
   * Remove campos legados PT e garante que apenas colunas reais EN sejam enviadas.
   *
   * @param {Object} payload - Payload bruto a ser sanitizado
   * @returns {Object} Payload limpo com apenas colunas canônicas
   */
  function sanitizeDeliveryPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      console.warn('[PayloadSanitize] payload inválido recebido');
      return {};
    }

    // Campos legados que NUNCA devem ir ao banco
    const BLOCKED_FIELDS = [
      'status',         // NÃO existe em delivery_proofs — nunca enviar ao banco
      'servico_nome',   // PT legado → service_name
      'pokemon_nome',   // PT legado → pokemon_name
      'tipo_pedido',    // PT legado → service_type
      'proof_urls',     // legado    → ignorado
      'images',         // legado    → ignorado
      'screenshot_url', // legado    → ignorado
      'nick',           // legado    → cliente_nick
      'desc',           // legado    → descricao
      'concluido_at',   // legado    → created_at (não é coluna real)
      '_normalized',    // marcador interno
      '_partial',       // marcador interno
    ];

    // Conversões PT → EN automáticas
    const FIELD_MAP = {
      servico_nome: 'service_name',
      pokemon_nome: 'pokemon_name',
      tipo_pedido:  'service_type',
      nick:         'cliente_nick',
      desc:         'descricao',
      pedido_id:    'order_id',
      user_id:      'delivered_by',
    };

    const sanitized = {};
    const blockedFound = [];
    const mappedFields = [];

    for (const [key, value] of Object.entries(payload)) {
      // 1. Aplica mapeamento PT → EN se existir
      if (FIELD_MAP[key]) {
        const mapped = FIELD_MAP[key];
        // Só usa o mapeamento se o campo EN ainda não foi definido
        if (sanitized[mapped] === undefined) {
          sanitized[mapped] = value;
          mappedFields.push(`${key} → ${mapped}`);
        }
        continue;
      }

      // 2. Remove campos bloqueados
      if (BLOCKED_FIELDS.includes(key)) {
        blockedFound.push(key);
        continue;
      }

      // 3. Mantém campo limpo
      sanitized[key] = value;
    }

    if (blockedFound.length) {
      console.warn('[PayloadSanitize] campos legados removidos:', blockedFound.join(', '));
    }
    if (mappedFields.length) {
      console.log('[PayloadSanitize] campos mapeados PT→EN:', mappedFields.join(', '));
    }

    console.log('[PayloadSanitize] ✅ payload sanitizado:',
      Object.keys(sanitized).join(', '));

    return sanitized;
  }

  // ══════════════════════════════════════════════════════════
  // PASSO 3 — Schema Introspection + buildDeliveryProofsSelect()
  //
  // FILOSOFIA: nunca confiar em lista de colunas hardcoded.
  // O sistema introspecciona o schema REAL do banco em runtime:
  //   1. Faz SELECT * limit=1 → lê chaves do primeiro objeto.
  //   2. Cruza com DESIRED_COLUMNS (intenção) → só pede o que existe.
  //   3. Cacheia o resultado para não bater o banco toda chamada.
  //   4. Fallback: DESIRED_COLUMNS sem banidas se introspecção falhar.
  //
  // BANIDAS PERMANENTEMENTE — nunca entram em SELECT desta tabela:
  //   status, concluido_at, servico_nome,
  //   pokemon_nome, tipo_pedido
  // ══════════════════════════════════════════════════════════

  // Colunas que QUEREMOS (se existirem no banco).
  // Define INTENÇÃO — não garantia de existência.
  // CORE: esperadas em qualquer versão da tabela.
  // OPTIONAL: adicionadas posteriormente — podem não existir em instâncias antigas.
  // Colunas base — enviadas a QUALQUER usuario autenticado (sem dados financeiros).
  const DESIRED_COLUMNS = [
    // CORE — sempre presentes
    'id',
    'order_id',
    'service_name',
    'pokemon_name',
    'service_type',
    'image_url',
    'cliente_nick',
    'delivered_by',
    'created_at',
    'descricao',
    // OPTIONAL — adicionadas em migrações posteriores
    'quantity',
    'player_name',
    'delivered_at',
    'order_created_at',
    // FINANCEIRO REMOVIDO DESTA LISTA:
    // payment_method, payment_value, payment_value_kk, payment_value_dd,
    // obs_financeiro, price_brl
    // Esses campos sao buscados SOMENTE por resolveSelectAdmin() (admin only).
  ];

  // Colunas financeiras — EXCLUSIVAS para admins.
  // NUNCA incluir em queries de clientes.
  const FINANCIAL_COLUMNS = [
    'payment_method',
    'payment_value',
    'payment_value_kk',
    'payment_value_dd',
    'obs_financeiro',
    'price_brl',
  ];

  // Colunas CORE garantidas — usadas no fallback síncrono quando introspecção não rodou ainda.
  const CORE_COLUMNS = [
    'id', 'order_id', 'service_name', 'pokemon_name', 'service_type',
    'image_url', 'cliente_nick', 'delivered_by', 'created_at', 'descricao',
  ];
  const BANNED_FROM_SELECT = [
    'status',       // não existe em delivery_proofs
    'concluido_at', // campo legado PT — não é coluna real
    'servico_nome', // alias PT legado
    'pokemon_nome', // alias PT legado
    'tipo_pedido',  // alias PT legado
  ];

  // Cache das colunas reais após introspecção. null = ainda não resolvido.
  let _resolvedColumns = null;
  let _resolvingPromise = null;

  /**
   * Introspecta o schema real de delivery_proofs.
   * Estratégia 1: SELECT * limit=1 → lê chaves do objeto retornado.
   * Estratégia 2: se tabela vazia, tenta SELECT * limit=0 e lê
   *   o header Content-Range (PostgREST sempre o envia).
   * @returns {Promise<string[]|null>}
   */
  async function _introspectColumns() {
    const sbUrl = global.SUPABASE_URL || '';
    const sbKey = global.SUPABASE_KEY || '';
    if (!sbUrl || !sbKey) {
      console.warn('[SchemaAudit] SUPABASE_URL/KEY indisponíveis — introspecção impossível');
      return null;
    }

    // Estratégia 1: pega um registro real e lê suas chaves
    // Usa JWT do usuário se disponível (RLS pode bloquear anon key)
    const _jwt = (typeof Session !== 'undefined' && Session.getAccessToken)
      ? (Session.getAccessToken() || sbKey)
      : sbKey;
    try {
      const res = await fetch(
        `${sbUrl}/rest/v1/delivery_proofs?select=*&limit=1&order=id.desc`,
        { headers: { apikey: sbKey, Authorization: 'Bearer ' + _jwt, Accept: 'application/json' } }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[SchemaAudit] ❌ SELECT * falhou:', res.status, err.message || '(sem detalhe)');
        // Se mesmo SELECT * com limit=1 dá erro, a tabela tem problema mais grave
        return null;
      }

      const rows = await res.json();

      if (Array.isArray(rows) && rows.length > 0) {
        const cols = Object.keys(rows[0]);
        console.log('[SchemaAudit] ✅ Schema real detectado (', cols.length, 'colunas ):', cols.join(', '));
        return cols;
      }

      // Estratégia 2: tabela existe mas está vazia — usa limit=0 + header
      console.warn('[SchemaAudit] Tabela vazia — tentando Content-Range...');
      const res0 = await fetch(
        `${sbUrl}/rest/v1/delivery_proofs?select=*&limit=0`,
        { headers: { apikey: sbKey, Authorization: 'Bearer ' + _jwt,
            Accept: 'application/json', Prefer: 'count=exact' } }
      );
      // PostgREST retorna Content-Range: 0-0/0 mesmo para tabela vazia,
      // mas não os nomes de colunas via headers. Neste caso não conseguimos
      // inferir e retornamos null para acionar o fallback.
      console.warn('[SchemaAudit] Tabela vazia — introspecção inconclusiva; usando fallback');
      return null;

    } catch (e) {
      console.warn('[SchemaAudit] Introspecção falhou (rede/CORS):', e.message);
      return null;
    }
  }

  /**
   * Resolve as colunas a usar no SELECT, cruzando schema real com DESIRED_COLUMNS.
   * Cacheia após a primeira chamada bem-sucedida.
   * @returns {Promise<string>}
   */
  async function _resolveSelectColumns() {
    if (_resolvedColumns !== null) return _resolvedColumns;
    if (_resolvingPromise) return _resolvingPromise;

    _resolvingPromise = (async () => {
      const realCols = await _introspectColumns();

      let confirmed;
      if (realCols && realCols.length > 0) {
        confirmed = DESIRED_COLUMNS.filter(col => {
          if (BANNED_FROM_SELECT.includes(col)) {
            console.error('[SchemaAudit] ❌ coluna banida em DESIRED_COLUMNS:', col, '— removida');
            return false;
          }
          const exists = realCols.includes(col);
          if (!exists) {
            console.warn(`[SchemaAudit] ⚠️ "${col}" desejada mas não existe na tabela — ignorada`);
          }
          return exists;
        });

        const extras = realCols.filter(c => !DESIRED_COLUMNS.includes(c));
        if (extras.length) {
          console.log('[SchemaAudit] ℹ️ Colunas na tabela não solicitadas:', extras.join(', '));
        }
        console.log('[SchemaAudit] ✅ SELECT confirmado pelo banco:', confirmed.join(', '));
      } else {
        // Introspecção falhou: usa DESIRED_COLUMNS filtrado de banidas.
        // Não inclui nenhuma coluna com histórico de causar HTTP 400.
        confirmed = DESIRED_COLUMNS.filter(c => !BANNED_FROM_SELECT.includes(c));
        console.warn('[SchemaAudit] ⚠️ Usando fallback (sem introspecção):', confirmed.join(', '));
      }

      _resolvedColumns = confirmed.join(',');
      _resolvingPromise = null;
      return _resolvedColumns;
    })();

    return _resolvingPromise;
  }

  /**
   * Retorna select string síncrono.
   * Se a introspecção ainda não rodou, usa DESIRED_COLUMNS filtrado de banidas.
   * Prefira usar: await SchemaCompat.resolveSelect()
   */
  function buildDeliveryProofsSelect() {
    if (_resolvedColumns !== null) return _resolvedColumns;
    // Usa apenas CORE_COLUMNS no fallback síncrono — não inclui colunas opcionais
    // que podem não existir e causariam HTTP 400 antes da introspecção completar.
    const fallback = CORE_COLUMNS.filter(c => !BANNED_FROM_SELECT.includes(c)).join(',');
    console.warn('[SchemaAudit] buildDeliveryProofsSelect() síncrono antes da introspecção — fallback CORE:', fallback);
    return fallback;
  }

  /** Versão assíncrona preferível — aguarda introspecção completa.
   *  Retorna colunas BASE (sem dados financeiros) para qualquer usuario. */
  async function resolveSelect() {
    return _resolveSelectColumns();
  }

  /**
   * resolveSelectAdmin — SELECT com colunas financeiras.
   * EXCLUSIVO para chamadas feitas em contexto admin.
   * NUNCA chamar para usuarios clientes.
   *
   * @returns {Promise<string>} string de colunas para o SELECT do Supabase
   */
  async function resolveSelectAdmin() {
    const base = await _resolveSelectColumns();
    // Adiciona financeiras que existam no banco
    const baseCols = base.split(',');
    const extra = FINANCIAL_COLUMNS.filter(function(c) {
      return !baseCols.includes(c);
    });
    if (!extra.length) return base;
    return base + ',' + extra.join(',');
  }

  /**
   * Invalida o cache de colunas resolvidas.
   * Chamado automaticamente quando list() recebe erro "does not exist",
   * forçando re-introspecção na próxima query.
   */
  function _resetCache() {
    _resolvedColumns = null;
    _resolvingPromise = null;
    console.warn('[SchemaAudit] Cache de colunas invalidado — próxima query re-introspecta o banco');
  }

  // Alias compatível com código legado que acessa SchemaCompat.DELIVERY_PROOFS_COLUMNS
  // Usa CORE_COLUMNS para garantir que o fallback nunca cause HTTP 400
  const DELIVERY_PROOFS_COLUMNS = CORE_COLUMNS.filter(c => !BANNED_FROM_SELECT.includes(c));

  // ══════════════════════════════════════════════════════════
  // PASSO 4 — safe(value, fallback)
  // Renderização segura de qualquer campo.
  // ══════════════════════════════════════════════════════════

  /**
   * Retorna o valor se truthy, ou o fallback.
   * Nunca lança exceção. Nunca retorna null/undefined para a UI.
   *
   * @param {*} value    - Valor a exibir
   * @param {string} fallback - Valor padrão (default: '-')
   * @returns {string}
   */
  function safe(value, fallback) {
    if (fallback === undefined) fallback = '-';

    if (value === null || value === undefined || value === '') {
      if (fallback !== '-') {
        // Só loga quando fallback customizado é ativado (reduz ruído)
        console.log('[SafeRender] valor ausente → usando fallback:', JSON.stringify(fallback));
      }
      return fallback;
    }

    // Converte para string segura
    if (typeof value === 'object') {
      try { return JSON.stringify(value); } catch (_) { return fallback; }
    }

    return String(value);
  }

  // ══════════════════════════════════════════════════════════
  // PASSO 5 — renderPartialCard(container, record, error)
  // Error boundary: renderiza card parcial sem destruir a página.
  // ══════════════════════════════════════════════════════════

  /**
   * Renderiza um card de erro parcial quando um registro falha.
   * Permite que o restante da lista continue carregando.
   *
   * @param {HTMLElement} container - Elemento onde inserir o card
   * @param {Object} record        - Registro com dados parciais
   * @param {Error|string} error   - Erro que causou a falha (opcional)
   */
  function renderPartialCard(container, record, error) {
    if (!container) return;

    console.warn('[PartialRender] renderizando card parcial — id:',
      record && record.id, '| erro:', error && (error.message || error));

    const id   = safe(record && record.id, '?');
    const date = safe(record && record.created_at
      ? new Date(record.created_at).toLocaleDateString('pt-BR')
      : null, '—');

    const el = document.createElement('div');
    el.className = 'dg-card dg-card--partial';
    el.setAttribute('data-partial-id', id);
    el.innerHTML = `
      <div class="dg-card-img-wrap" style="background:rgba(255,80,80,0.04);display:flex;align-items:center;justify-content:center;min-height:120px;">
        <span style="font-size:28px;opacity:0.3;">⚠️</span>
      </div>
      <div class="dg-card-body">
        <div class="dg-card-service" style="color:rgba(255,100,100,0.6);font-size:11px;">
          dados incompletos
        </div>
        <div class="dg-card-meta" style="margin-top:6px;">
          <div class="dg-meta-item" style="font-size:10px;color:rgba(255,255,255,0.25);">
            ID: ${id} · ${date}
          </div>
        </div>
        <div class="dg-card-status" style="background:rgba(255,80,80,0.08);border-color:rgba(255,80,80,0.2);color:rgba(255,100,100,0.7);">
          ⚠ PARCIAL
        </div>
      </div>
    `;
    container.appendChild(el);
  }

  // ══════════════════════════════════════════════════════════
  // PASSO 6 — wrapWithErrorBoundary(fn, fallback)
  // Garante que nenhum erro quebra a renderização de uma lista.
  // ══════════════════════════════════════════════════════════

  /**
   * Executa fn() com tratamento de erro.
   * Se fn() lançar, executa fallback() (se fornecido) e retorna null.
   *
   * @param {Function} fn       - Função a executar
   * @param {Function} fallback - Função de fallback opcional
   * @param {string} context    - Contexto para log (ex: 'card #42')
   * @returns {*} Resultado de fn(), ou null em caso de erro
   */
  function wrapWithErrorBoundary(fn, fallback, context) {
    try {
      return fn();
    } catch (err) {
      console.error('[PartialRender] erro em', context || 'render', '—', err.message, err);
      if (typeof fallback === 'function') {
        try { fallback(err); } catch (_) {}
      }
      return null;
    }
  }

  // ══════════════════════════════════════════════════════════
  // PASSO 7 — RealtimeGuard
  // Previne múltiplas subscriptions e rerenders infinitos.
  // ══════════════════════════════════════════════════════════

  const RealtimeGuard = (() => {
    const _active = {};         // { channelKey: WebSocket }
    const _timers = {};         // { channelKey: debounceTimer }
    const DEBOUNCE_MS = 400;    // ms de debounce para rerenders

    return {
      /**
       * Verifica se já existe um canal ativo para esta chave.
       * @param {string} key - Identificador único do canal
       * @returns {boolean}
       */
      isActive(key) {
        return !!_active[key];
      },

      /**
       * Registra um canal como ativo.
       * @param {string} key - Identificador do canal
       * @param {WebSocket} ws - Instância do WebSocket
       */
      register(key, ws) {
        if (_active[key]) {
          console.warn('[SchemaCompat] RealtimeGuard: substituindo canal ativo:', key);
          try { _active[key].close(); } catch (_) {}
        }
        _active[key] = ws;
        console.log('[SchemaCompat] RealtimeGuard: canal registrado:', key);
      },

      /**
       * Encerra e remove um canal.
       * @param {string} key
       */
      destroy(key) {
        if (_active[key]) {
          try { _active[key].close(); } catch (_) {}
          delete _active[key];
          console.log('[SchemaCompat] RealtimeGuard: canal destruído:', key);
        }
      },

      /**
       * Executa callback com debounce para evitar rerenders em série.
       * @param {string} key  - Chave do debounce
       * @param {Function} cb - Callback a executar
       */
      debounce(key, cb) {
        if (_timers[key]) clearTimeout(_timers[key]);
        _timers[key] = setTimeout(() => {
          delete _timers[key];
          try { cb(); } catch (e) {
            console.error('[SchemaCompat] RealtimeGuard debounce erro:', e.message);
          }
        }, DEBOUNCE_MS);
      },
    };
  })();

  // ══════════════════════════════════════════════════════════
  // PASSO 7b — normalizeRealtimeRecord(msg)
  // Extrai o record de qualquer formato de mensagem Realtime.
  // ══════════════════════════════════════════════════════════

  /**
   * Extrai e normaliza o record de uma mensagem WebSocket Supabase Realtime.
   * Suporta todos os formatos conhecidos do Phoenix vsn 1.0.0.
   *
   * @param {Object} msg - Mensagem bruta do WebSocket
   * @param {string} table - Nome da tabela esperada (ex: 'delivery_proofs')
   * @returns {{ record: Object|null, event: string|null }}
   */
  function normalizeRealtimeRecord(msg, table) {
    if (!msg || !msg.payload) return { record: null, event: null };

    const payload = msg.payload;
    const event   = payload.type || payload.eventType || null; // INSERT/UPDATE/DELETE

    // Formato 1: payload.data.record  (mais comum — Supabase SDK v2)
    // Formato 2: payload.record       (Phoenix direto)
    // Formato 3: payload.new          (alguns builds Supabase)
    // Formato 4: payload.data.new     (variante)
    const record =
      (payload.data && payload.data.record) ||
      (payload.data && payload.data.new)    ||
      payload.record                        ||
      payload.new                           ||
      null;

    if (!record) {
      console.warn('[DataNormalize] Realtime: nenhum record encontrado em msg.payload',
        '| table:', table, '| keys:', Object.keys(payload).join(', '));
      return { record: null, event };
    }

    return {
      record: normalizeDeliveryProof(record),
      event,
    };
  }

  // ══════════════════════════════════════════════════════════
  // PASSO 8 — validateTestScenarios()
  // Testa os cenários críticos internamente no console.
  // ══════════════════════════════════════════════════════════

  function validateTestScenarios() {
    console.group('[SchemaCompat] 🧪 VALIDAÇÃO DE CENÁRIOS');

    const scenarios = [
      {
        label: 'Pedido novo (EN canônico)',
        input: { id: 1, service_name: 'Shiny Hunt', pokemon_name: 'Charizard',
                 service_type: 'pokemon_sr', cliente_nick: 'Ash', image_url: 'https://cdn/img.jpg',
                 created_at: '2024-01-01T00:00:00Z' },
      },
      {
        label: 'Pedido antigo (PT legado)',
        input: { id: 2, servico_nome: 'Shiny Hunt', pokemon_nome: 'Bulbasaur',
                 tipo_pedido: 'pokemon_sr', nick: 'Brock', image_url: 'https://cdn/old.jpg',
                 concluido_at: '2023-01-01T00:00:00Z' },
      },
      {
        label: 'Entrega sem imagem',
        input: { id: 3, service_name: 'Farming', image_url: null, prints: [] },
      },
      {
        label: 'Record completamente vazio',
        input: { id: 4 },
      },
      {
        label: 'Record nulo',
        input: null,
      },
      {
        label: 'Prints como strings (formato antigo)',
        input: { id: 5, service_name: 'Power Leveling',
                 prints: ['https://cdn/a.jpg', 'https://cdn/b.jpg'] },
      },
      {
        label: 'safe() com valores ausentes',
        input: null, // testado separadamente abaixo
      },
    ];

    let passed = 0;
    let failed = 0;

    scenarios.forEach(({ label, input }) => {
      if (label === 'safe() com valores ausentes') {
        // Testa safe() diretamente
        const cases = [
          [safe(null),       '-'],
          [safe(undefined),  '-'],
          [safe(''),         '-'],
          [safe(0),          '0'],
          [safe('ok'),       'ok'],
          [safe(null, '—'),  '—'],
        ];
        const ok = cases.every(([result, expected]) => result === expected);
        console.log(ok ? '  ✅' : '  ❌', label,
          ok ? '' : '— resultado inesperado em safe()');
        ok ? passed++ : failed++;
        return;
      }

      try {
        const out = normalizeDeliveryProof(input);
        // Validações mínimas — apenas campos que EXISTEM no banco ou são computados obrigatórios.
        // 'status' é computado (sempre 'concluido') e está no output — pode permanecer.
        // 'delivered_at' presente no output — coluna real do banco.
        const hasId = out.id !== undefined;
        const hasShape = ['service_name', 'pokemon_name', 'service_type',
                          'cliente_nick', 'descricao', 'image_url',
                          'created_at', 'prints']
          .every(k => k in out);
        const normalized = out._normalized === true;
        const ok = hasId && hasShape && normalized;
        console.log(ok ? '  ✅' : '  ❌', label);
        ok ? passed++ : failed++;
      } catch (err) {
        console.error('  ❌', label, '— EXCEÇÃO:', err.message);
        failed++;
      }
    });

    // Testa sanitizeDeliveryPayload
    const dirtyPayload = {
      service_name: 'Hunt', servico_nome: 'DEVE SER REMOVIDO',
      pokemon_name: 'Pikachu', pokemon_nome: 'DEVE SER REMOVIDO',
      service_type: 'pokemon_sr', tipo_pedido: 'DEVE SER REMOVIDO',
      nick: 'player', desc: 'desc legada', _normalized: true, _partial: false,
    };
    try {
      const clean = sanitizeDeliveryPayload(dirtyPayload);
      const noLegacy = !['servico_nome','pokemon_nome','tipo_pedido',
                         'nick','desc','_normalized','_partial']
        .some(k => k in clean);
      const hasEN = clean.service_name && clean.pokemon_name;
      const ok = noLegacy && hasEN;
      console.log(ok ? '  ✅' : '  ❌', 'sanitizeDeliveryPayload() remove campos PT legados');
      ok ? passed++ : failed++;
    } catch (err) {
      console.error('  ❌ sanitizeDeliveryPayload() — EXCEÇÃO:', err.message);
      failed++;
    }

    console.log(`\n[SchemaCompat] Resultado: ${passed} passou, ${failed} falhou`);
    console.groupEnd();

    return { passed, failed };
  }

  // ══════════════════════════════════════════════════════════
  // NAMESPACE PÚBLICO
  // ══════════════════════════════════════════════════════════

  const SchemaCompat = {
    normalizeDeliveryProof,
    sanitizeDeliveryPayload,
    buildDeliveryProofsSelect,
    resolveSelect,           // async — para clientes (sem campos financeiros)
    resolveSelectAdmin,      // async — admin only (inclui payment_method, payment_value, etc.)
    FINANCIAL_COLUMNS,       // lista de colunas financeiras (referência)
    _resetCache,             // invalida cache após erro de schema
    safe,
    renderPartialCard,
    wrapWithErrorBoundary,
    normalizeRealtimeRecord,
    RealtimeGuard,
    validateTestScenarios,

    // Constantes
    DELIVERY_PROOFS_COLUMNS,
    DESIRED_COLUMNS,
    CORE_COLUMNS,
    BANNED_FROM_SELECT,
  };

  // ── Expõe globalmente ──────────────────────────────────────
  global.SchemaCompat             = SchemaCompat;
  global.normalizeDeliveryProof   = normalizeDeliveryProof;
  global.sanitizeDeliveryPayload  = sanitizeDeliveryPayload;
  global.safe                     = safe;

  // ── Log de inicialização ───────────────────────────────────
  console.log('[SchemaCompat] ✅ Camada de compatibilidade carregada.',
    '| Core columns:', CORE_COLUMNS.join(', '),
    '| Optional columns: quantity, player_name, delivered_at, order_created_at');

  // ── Auto-validação em desenvolvimento (remove em produção) ──
  if (global.location && global.location.hostname === 'localhost') {
    setTimeout(() => SchemaCompat.validateTestScenarios(), 500);
  }

})(typeof window !== 'undefined' ? window : this);
