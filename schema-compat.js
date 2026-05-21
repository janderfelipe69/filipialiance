// ============================================================
// schema-compat.js — CAMADA ÚNICA DE COMPATIBILIDADE DE DADOS
// PokeAlliance Shop — FASE FINAL DE ESTABILIZAÇÃO
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
   * @returns {{ id, service_name, pokemon_name, service_type, cliente_nick,
   *             descricao, image_url, created_at, status, prints, _normalized }}
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
    const created_at =
      record.created_at     ||
      record.concluido_at   ||
      null;

    // ── 7. status ──────────────────────────────────────────────────────
    const status =
      record.status         ||
      'concluido';           // delivery_proofs implica entregue

    // ── 8. image_url + prints ──────────────────────────────────────────
    const { image_url, prints } = _resolveImages(record);

    // ── Resultado canônico ─────────────────────────────────────────────
    const normalized = {
      // Identidade
      id:           record.id           || null,
      order_id:     record.order_id     || record.pedido_id || null,
      delivered_by: record.delivered_by || null,

      // Campos canônicos EN
      service_name,
      pokemon_name,
      service_type,
      cliente_nick,
      descricao,
      image_url,
      created_at,
      status,
      prints,

      // Marcador de idempotência — não serializar para o banco
      _normalized: true,
      _partial: !service_name || !image_url,   // true = dados incompletos
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

  // ── Helpers de imagem ──────────────────────────────────────────────────

  function _resolveImages(record) {
    const SB_URL = global.SUPABASE_URL || '';
    const BUCKET = 'delivery-proofs';

    function _toAbsolute(url) {
      if (!url) return null;
      if (url.startsWith('http')) return url;
      // [FIX IMG-2] Guarda defensivo: path relativo sem SUPABASE_URL geraria
      // '/storage/v1/...' (URL inválida sem host) → imagem nunca carregaria.
      if (!SB_URL) {
        console.warn('[DataNormalize] SUPABASE_URL não definido — path relativo não resolvido:', url.slice(0, 60));
        return null;
      }
      return `${SB_URL}/storage/v1/object/public/${BUCKET}/${url}`;
    }

    function _firstUrl(arr) {
      // [FIX IMG-1] Suporte a array de strings, objetos {url} e string JSON
      if (typeof arr === 'string') {
        try { arr = JSON.parse(arr); } catch (_) { return null; }
      }
      if (!Array.isArray(arr) || !arr.length) return null;
      const item = arr[0];
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') return item.url || item.path || null;
      return null;
    }

    function _normalizePrints(raw) {
      // [FIX IMG-1] Se o campo prints vier como string JSON (coluna TEXT no Supabase
      // em vez de JSONB), faz parse antes de processar.
      // Sem este fix: Array.isArray(string) = false → retorna [] → sem imagem.
      if (typeof raw === 'string') {
        try {
          raw = JSON.parse(raw);
          console.log('[DataNormalize] prints era string JSON — parseado com sucesso');
        } catch (_) {
          console.warn('[DataNormalize] prints é string mas não é JSON válido — ignorando:', raw.slice(0, 60));
          return [];
        }
      }
      if (!Array.isArray(raw)) return [];
      return raw.map(p => {
        if (typeof p === 'string') return { url: _toAbsolute(p) };
        if (p && typeof p === 'object' && (p.url || p.path)) {
          return { ...p, url: _toAbsolute(p.url || p.path) };
        }
        return null;
      }).filter(Boolean);
    }

    // [FIX IMG-1] Consolida todos os arrays de imagem possíveis
    // com suporte a campos que vieram como string JSON (coluna TEXT vs JSONB)
    let rawPrints = record.prints || record.images || record.proof_urls || [];

    if (typeof rawPrints === 'string') {
      try {
        rawPrints = JSON.parse(rawPrints);
        console.log('[DataNormalize] rawPrints era string JSON — parseado');
      } catch (_) {
        console.warn('[DataNormalize] rawPrints é string mas não é JSON válido');
        rawPrints = [];
      }
    }

    // image_url canônica
    let image_url =
      _toAbsolute(record.image_url) ||
      _toAbsolute(_firstUrl(record.proof_urls)) ||
      _toAbsolute(record.screenshot_url) ||
      _toAbsolute(_firstUrl(record.images)) ||
      _toAbsolute(_firstUrl(rawPrints)) ||
      null;

    // [FIX IMG-3] Detecta URL sem /public/ — indica bucket privado.
    // A imagem precisa de Signed URL ou o bucket precisa ser tornado público.
    if (image_url &&
        image_url.includes('/storage/v1/object/') &&
        !image_url.includes('/object/public/') &&
        !image_url.includes('/object/sign/')) {
      console.warn(
        '[DataNormalize] ⚠️ image_url sem /public/ — bucket pode estar PRIVADO.',
        '\n  URL:', image_url.slice(0, 100),
        '\n  Fix: Supabase Dashboard → Storage → delivery-proofs → Policies → tornar público',
        '\n  Ou use Signed URLs em DeliveryStorage._doUpload()'
      );
    }

    // Normaliza array de prints
    let prints = _normalizePrints(rawPrints);

    // Garante que image_url esteja no topo dos prints
    if (image_url && !prints.some(p => p.url === image_url)) {
      prints.unshift({ url: image_url });
    }

    // Se prints tem items mas image_url é nulo, usa o primeiro
    if (!image_url && prints.length) {
      image_url = prints[0].url;
    }

    return { image_url, prints };
  }

  function _emptyStub() {
    return {
      id: null, order_id: null, delivered_by: null,
      service_name: null, pokemon_name: null, service_type: null,
      cliente_nick: null, descricao: null, image_url: null,
      created_at: null, status: null, prints: [],
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
      'servico_nome',   // PT legado → service_name
      'pokemon_nome',   // PT legado → pokemon_name
      'tipo_pedido',    // PT legado → service_type
      'proof_urls',     // legado    → prints
      'images',         // legado    → prints
      'nick',           // legado    → cliente_nick
      'desc',           // legado    → descricao
      'screenshot_url', // legado    → image_url
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
  // PASSO 3 — buildSafeSelect(columns)
  // Monta string de select Supabase apenas com colunas reais.
  // ══════════════════════════════════════════════════════════

  /**
   * Colunas canônicas reais da tabela delivery_proofs.
   * NUNCA usar * — nunca usar aliases PT.
   */
  const DELIVERY_PROOFS_COLUMNS = [
    'id',
    'order_id',
    'service_name',
    'pokemon_name',
    'service_type',
    'image_url',
    'prints',
    'cliente_nick',
    'delivered_by',
    'created_at',
    'descricao',
    'status',
  ];

  /**
   * Retorna o select string seguro para delivery_proofs.
   * @returns {string} Colunas separadas por vírgula
   */
  function buildDeliveryProofsSelect() {
    return DELIVERY_PROOFS_COLUMNS.join(',');
  }

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
                 tipo_pedido: 'pokemon_sr', nick: 'Brock', proof_urls: ['https://cdn/old.jpg'],
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
        // Validações mínimas
        const hasId = out.id !== undefined;
        const hasShape = ['service_name', 'pokemon_name', 'service_type',
                          'cliente_nick', 'descricao', 'image_url',
                          'created_at', 'status', 'prints']
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
      proof_urls: ['url1'], images: ['url2'], nick: 'player',
      desc: 'desc legada', _normalized: true, _partial: false,
    };
    try {
      const clean = sanitizeDeliveryPayload(dirtyPayload);
      const noLegacy = !['servico_nome','pokemon_nome','tipo_pedido',
                         'proof_urls','images','nick','desc','_normalized','_partial']
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
    safe,
    renderPartialCard,
    wrapWithErrorBoundary,
    normalizeRealtimeRecord,
    RealtimeGuard,
    validateTestScenarios,

    // Constantes
    DELIVERY_PROOFS_COLUMNS,
  };

  // ── Expõe globalmente ──────────────────────────────────────
  global.SchemaCompat             = SchemaCompat;
  global.normalizeDeliveryProof   = normalizeDeliveryProof;
  global.sanitizeDeliveryPayload  = sanitizeDeliveryPayload;
  global.safe                     = safe;

  // ── Log de inicialização ───────────────────────────────────
  console.log('[SchemaCompat] ✅ Camada de compatibilidade carregada.',
    '| Colunas canônicas:', DELIVERY_PROOFS_COLUMNS.join(', '));

  // ── Auto-validação em desenvolvimento (remove em produção) ──
  if (global.location && global.location.hostname === 'localhost') {
    setTimeout(() => SchemaCompat.validateTestScenarios(), 500);
  }

})(typeof window !== 'undefined' ? window : this);
