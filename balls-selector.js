/* =============================================================
   balls-selector.js
   Sistema de seleção de Pokébola para capturas
   — Vanilla JS puro, compatível com o projeto existente —
   Depende de: supabase (global), Session (global)
   Expõe: BallsSelector (global)
   ============================================================= */

var BallsSelector = (function () {

  /* ── Constantes de negócio ─────────────────────────────────
     REGRA: multiplicadores vivem AQUI e são re-validados no
     backend (ballsService.ts / função SQL) ao criar o pedido.
     O frontend usa isso apenas para EXIBIÇÃO — nunca para
     decidir o preço final gravado no banco.
  ────────────────────────────────────────────────────────── */
  var MULTIPLIERS = { ultra: 1.0, premier: 0.6, alliance: 0.6 };
  var DEADLINE_MULT = { ultra: 1.0, premier: 1.2, alliance: 1.2 };

  var BALL_CONFIG = {
    ultra: {
      label: 'Ultra Ball',
      color: '#f5c518',
      glow: 'rgba(245,197,24,0.32)',
      border: '#f5c518',
      bg: 'rgba(245,197,24,0.07)',
      icon: _ultraIcon,
    },
    premier: {
      label: 'Premier Ball',
      color: '#e8e8e8',
      glow: 'rgba(232,232,232,0.22)',
      border: '#e8e8e8',
      bg: 'rgba(232,232,232,0.05)',
      icon: _premierIcon,
    },
    alliance: {
      label: 'Alliance Ball',
      color: '#b67fff',
      glow: 'rgba(124,106,255,0.35)',
      border: '#7c6aff',
      bg: 'rgba(124,106,255,0.07)',
      icon: _allianceIcon,
    },
  };

  /* ── Estado interno ──────────────────────────────────────── */
  var _state = {
    isOpen: false,
    pokemon: null,      // objeto com id, name, image, price_brl, price_kk, price_dd, estimated_days
    selectedBall: 'ultra',
    onConfirmCallback: null,
  };

  /* ── Ícones SVG inline ───────────────────────────────────── */
  function _ultraIcon() {
    return '<svg width="30" height="30" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="17" fill="#1a1a2e" stroke="#f5c518" stroke-width="1.5"/><path d="M3 20 Q20 13 37 20" stroke="#f5c518" stroke-width="2.5" fill="none"/><path d="M3 20 Q20 27 37 20" stroke="#111" stroke-width="2.5" fill="none"/><circle cx="20" cy="20" r="4.5" fill="#1a1a2e" stroke="#f5c518" stroke-width="1.8"/><circle cx="20" cy="20" r="2" fill="#f5c518"/><path d="M5 20 H15.5M24.5 20 H35" stroke="#f5c518" stroke-width="1.8"/></svg>';
  }
  function _premierIcon() {
    return '<svg width="30" height="30" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="17" fill="#1a1a2e" stroke="#e8e8e8" stroke-width="1.5"/><path d="M3 20 Q20 13 37 20" stroke="#e8e8e8" stroke-width="2.5" fill="none"/><path d="M3 20 Q20 27 37 20" stroke="#222" stroke-width="2.5" fill="none"/><circle cx="20" cy="20" r="4.5" fill="#1a1a2e" stroke="#e8e8e8" stroke-width="1.8"/><circle cx="20" cy="20" r="2" fill="#e8e8e8"/><path d="M5 20 H15.5M24.5 20 H35" stroke="#e8e8e8" stroke-width="1.8"/><path d="M16 8 L17.5 12 L14.5 10z M24 8 L22.5 12 L25.5 10z" fill="#e8e8e8" opacity=".6"/></svg>';
  }
  function _allianceIcon() {
    return '<svg width="30" height="30" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="17" fill="#1a1a2e" stroke="#7c6aff" stroke-width="1.5"/><path d="M3 20 Q20 13 37 20" stroke="#7c6aff" stroke-width="2.5" fill="none"/><path d="M3 20 Q20 27 37 20" stroke="#ff4fa0" stroke-width="2.5" fill="none"/><circle cx="20" cy="20" r="4.5" fill="#1a1a2e" stroke="#7c6aff" stroke-width="1.8"/><circle cx="20" cy="20" r="2" fill="#b67fff"/><path d="M5 20 H15.5M24.5 20 H35" stroke="#7c6aff" stroke-width="1.8"/></svg>';
  }

  /* ── Formatadores ────────────────────────────────────────── */
  function _fmtBRL(v) {
    if (!v && v !== 0) return '—';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function _fmtKK(v) {
    if (!v && v !== 0) return '—';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'M KK';
    return v.toFixed(2) + ' KK';
  }
  function _fmtDays(d) {
    if (!d) return '—';
    var r = Math.round(d * 10) / 10;
    return r === Math.round(r) ? r + ' dias' : '~' + r + ' dias';
  }

  /* ── Cálculo de preço (exibição — validado no backend) ───── */
  function _calc(pokemon, ballType) {
    var m = MULTIPLIERS[ballType] || 1;
    var dm = DEADLINE_MULT[ballType] || 1;
    return {
      price_brl: Math.round((pokemon.price_brl || 0) * m * 100) / 100,
      price_kk:  Math.round((pokemon.price_kk  || 0) * m * 10000) / 10000,
      price_dd:  Math.round((pokemon.price_dd  || 0) * m * 10000) / 10000,
      multiplier: m,
      savings: Math.round((1 - m) * 100),
      days: Math.round((pokemon.estimated_days || 7) * dm * 10) / 10,
    };
  }

  /* ── Render de um card de ball ───────────────────────────── */
  function _renderCard(ballType, pokemon, isSelected) {
    var cfg = BALL_CONFIG[ballType];
    var calc = _calc(pokemon, ballType);
    var showReq = ballType !== 'ultra';

    var borderStyle = isSelected
      ? 'border-color:' + cfg.border + ';box-shadow:0 0 0 1px ' + cfg.border + '22,0 0 18px ' + cfg.glow + ';background:' + cfg.bg
      : '';

    var priceColor = isSelected ? cfg.color : '#fff';
    var nameColor  = isSelected ? cfg.color : '#fff';

    var savingsBadge = calc.savings > 0
      ? '<span style="font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:20px;background:rgba(60,210,130,0.12);border:1px solid rgba(60,210,130,0.22);color:#3de89a;">-' + calc.savings + '%</span>'
      : '';

    var deadlineExtra = ballType !== 'ultra'
      ? '<span style="color:rgba(255,190,80,0.6);"> (+20%)</span>'
      : '';

    var reqBox = showReq
      ? '<div style="font-size:10.5px;color:rgba(255,190,80,0.7);background:rgba(255,190,50,0.06);border:1px solid rgba(255,190,50,0.15);border-radius:6px;padding:5px 8px;line-height:1.4;">📦 Mín. 1.000 Premier Balls</div>'
      : '';

    var checkStyle = isSelected
      ? 'opacity:1;background:' + cfg.color + ';color:' + (ballType === 'alliance' ? '#fff' : '#000') + ';'
      : 'opacity:0;';

    return '<div id="ball-card-' + ballType + '" '
      + 'role="radio" aria-checked="' + (isSelected ? 'true' : 'false') + '" tabindex="0" '
      + 'onclick="BallsSelector.selectBall(\'' + ballType + '\')" '
      + 'onkeydown="if(event.key===\'Enter\'||event.key===\' \')BallsSelector.selectBall(\'' + ballType + '\')" '
      + 'style="border-radius:13px;border:1.5px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);'
      + 'padding:14px 12px;cursor:pointer;position:relative;display:flex;flex-direction:column;gap:9px;'
      + 'transition:all .2s;' + borderStyle + '">'

      // Check mark
      + '<div style="position:absolute;top:9px;right:9px;width:18px;height:18px;border-radius:50%;'
      + 'display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;'
      + 'transition:opacity .2s;' + checkStyle + '">✓</div>'

      // Header
      + '<div style="display:flex;align-items:center;gap:9px;">'
      + '<div style="width:40px;height:40px;border-radius:9px;background:rgba(255,255,255,0.04);'
      + 'display:flex;align-items:center;justify-content:center;flex-shrink:0;">'
      + cfg.icon()
      + '</div>'
      + '<div>'
      + '<div style="font-family:var(--font-title,\'Cinzel\',serif);font-size:14px;font-weight:900;letter-spacing:.5px;color:' + nameColor + ';line-height:1.2;">' + cfg.label + '</div>'
      + '<div style="font-size:11px;color:rgba(255,255,255,0.38);margin-top:2px;font-family:var(--font-body,sans-serif);">'
      + (ballType === 'ultra' ? 'Padrão premium' : '40% de desconto')
      + '</div></div></div>'

      // Preço
      + '<div>'
      + '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:4px;flex-wrap:wrap;">'
      + '<span style="font-family:var(--font-title,\'Cinzel\',serif);font-size:20px;font-weight:900;color:' + priceColor + ';">' + _fmtBRL(calc.price_brl) + '</span>'
      + savingsBadge
      + '</div>'
      + '<div style="font-size:11.5px;color:rgba(255,255,255,0.32);margin-top:2px;font-family:var(--font-mono,monospace);">' + _fmtKK(calc.price_kk) + '</div>'
      + '</div>'

      // Prazo
      + '<div style="font-size:11px;color:rgba(255,255,255,0.32);display:flex;align-items:center;gap:4px;font-family:var(--font-body,sans-serif);">'
      + '<div style="width:5px;height:5px;border-radius:50%;background:currentColor;flex-shrink:0;"></div>'
      + _fmtDays(calc.days) + deadlineExtra
      + '</div>'

      + reqBox
      + '</div>';
  }

  /* ── Render do grid e do resumo ──────────────────────────── */
  function _renderAll() {
    var pkmn = _state.pokemon;
    if (!pkmn) return;

    var grid = document.getElementById('balls-grid');
    if (!grid) return;

    var types = ['ultra', 'premier', 'alliance'];

    // Filtrar balls suportadas (campos opcionais no catálogo)
    var supported = types.filter(function (t) {
      var key = 'supports_' + t + '_ball';
      return pkmn[key] !== false; // undefined = true por padrão
    });

    grid.innerHTML = supported.map(function (t) {
      return _renderCard(t, pkmn, t === _state.selectedBall);
    }).join('');

    _renderSummary();
    _renderButton();
  }

  function _renderSummary() {
    var pkmn = _state.pokemon;
    var ball = _state.selectedBall;
    if (!pkmn) return;

    var cfg  = BALL_CONFIG[ball];
    var calc = _calc(pkmn, ball);

    var ballEl  = document.getElementById('balls-sum-ball');
    var priceEl = document.getElementById('balls-sum-price');
    var daysEl  = document.getElementById('balls-sum-days');

    if (ballEl)  { ballEl.textContent = cfg.label; ballEl.style.color = cfg.color; }
    if (priceEl) { priceEl.textContent = _fmtBRL(calc.price_brl) + ' / ' + _fmtKK(calc.price_kk); }
    if (daysEl)  { daysEl.textContent = _fmtDays(calc.days); }
  }

  function _renderButton() {
    var btn = document.getElementById('balls-confirm-btn');
    if (!btn) return;
    var cfg = BALL_CONFIG[_state.selectedBall];
    btn.textContent = 'CONFIRMAR COM ' + cfg.label.toUpperCase();
    btn.style.background = cfg.color;
    btn.style.boxShadow  = '0 8px 24px ' + cfg.glow;
  }

  /* ── Thumb do Pokémon ────────────────────────────────────── */
  function _renderHeader() {
    var pkmn = _state.pokemon;
    if (!pkmn) return;

    var thumb = document.getElementById('balls-pkmn-thumb');
    var sub   = document.getElementById('balls-pkmn-sub');

    if (thumb) {
      if (pkmn.image_url) {
        thumb.innerHTML = '<img src="' + pkmn.image_url + '" alt="' + (pkmn.name || '') + '" style="width:100%;height:100%;object-fit:cover;">';
      } else {
        thumb.textContent = '⚔️';
      }
    }
    if (sub) {
      sub.textContent = pkmn.name ? 'Captura de ' + pkmn.name : 'Selecione o tipo de ball';
    }
  }

  /* ── API pública ─────────────────────────────────────────── */

  /**
   * Abre o seletor de balls para um Pokémon.
   *
   * @param {Object} pokemon  Objeto com: id, name, image_url?,
   *                          price_brl, price_kk, price_dd,
   *                          estimated_days,
   *                          supports_ultra_ball?,
   *                          supports_premier_ball?,
   *                          supports_alliance_ball?
   * @param {Function} onConfirm  Callback(ballType, calcPrices)
   *                              chamado quando usuário confirma.
   *                              calcPrices = { price_brl, price_kk, price_dd, days }
   */
  function open(pokemon, onConfirm) {
    _state.pokemon           = pokemon;
    _state.selectedBall      = 'ultra';
    _state.onConfirmCallback = onConfirm || null;
    _state.isOpen            = true;

    _renderHeader();
    _renderAll();

    var overlay = document.getElementById('balls-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
      // garante animação mesmo em re-aberturas
      var modal = document.getElementById('balls-modal');
      if (modal) {
        modal.style.animation = 'none';
        requestAnimationFrame(function () {
          modal.style.animation = '';
        });
      }
    }

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', _onKeyDown);
  }

  function close() {
    _state.isOpen = false;
    var overlay = document.getElementById('balls-overlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
    document.removeEventListener('keydown', _onKeyDown);
  }

  function selectBall(ballType) {
    if (!MULTIPLIERS[ballType]) return;
    _state.selectedBall = ballType;
    _renderAll();
  }

  function confirm() {
    if (!_state.pokemon) return;

    var btn = document.getElementById('balls-confirm-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Aguarde...'; }

    var calc = _calc(_state.pokemon, _state.selectedBall);

    if (typeof _state.onConfirmCallback === 'function') {
      _state.onConfirmCallback(_state.selectedBall, {
        price_brl:     calc.price_brl,
        price_kk:      calc.price_kk,
        price_dd:      calc.price_dd,
        estimated_days: calc.days,
      });
    }

    if (btn) { btn.disabled = false; }
    close();
  }

  function handleOverlayClick(e) {
    if (e.target.id === 'balls-overlay') close();
  }

  function _onKeyDown(e) {
    if (e.key === 'Escape') close();
  }

  /* ── Integração com captura-redesign.js ──────────────────
     captura-redesign.js chama openCapturaModal(pokemon).
     Interceptamos para injetar o seletor ANTES de criar o pedido.

     COMO USAR no captura-redesign.js (ou onde o pedido é criado):

     Em vez de criar o pedido direto, chame:
       BallsSelector.openForCaptura(pokemon, function(ballType, prices) {
         // aqui você cria o pedido COM ball_type e os preços calculados
       });

     OU, se preferir não alterar captura-redesign.js, use o hook:
       BallsSelector.hookConfirmButton('#meu-btn-confirmar', pokemonData);
  ────────────────────────────────────────────────────────── */

  /**
   * Abre o seletor contextualizado para o fluxo de captura.
   * Chame isso de dentro de captura-redesign.js no lugar onde
   * o pedido seria submetido.
   */
  function openForCaptura(pokemon, onReady) {
    open(pokemon, onReady);
  }

  /**
   * Injeta o seletor de balls em um botão existente.
   * Quando o botão é clicado, abre o modal antes de prosseguir.
   *
   * @param {string}   btnSelector   Seletor CSS do botão de pedido
   * @param {Function} getPokemonFn  Função que retorna o objeto pokemon atual
   * @param {Function} onConfirm     Callback(ballType, prices)
   */
  function hookButton(btnSelector, getPokemonFn, onConfirm) {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest(btnSelector);
      if (!btn) return;
      e.preventDefault();
      e.stopImmediatePropagation();

      var pkmn = typeof getPokemonFn === 'function' ? getPokemonFn() : getPokemonFn;
      if (!pkmn) return;

      open(pkmn, onConfirm);
    }, true);
  }

  /* ── Retorno público ──────────────────────────────────────── */
  return {
    open:                open,
    close:               close,
    selectBall:          selectBall,
    confirm:             confirm,
    handleOverlayClick:  handleOverlayClick,
    openForCaptura:      openForCaptura,
    hookButton:          hookButton,
    /* expõe cálculo para uso externo seguro (só exibição) */
    calcPrice:           _calc,
  };

})();
