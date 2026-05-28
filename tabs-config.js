// ============================================================
//  CONFIGURAÇÃO DE ABAS — edite aqui para ligar/desligar
// ============================================================
//  true  = aba aparece no site
//  false = aba fica oculta
// ============================================================

const TABS_CONFIG = {
  itens:       true,
  pacotes:     true,
  captura:     true,
  entregas:    true,
  wiki:        true,
  marketplace: true,   // Fase M1 — aba marketplace
};

// ============================================================
//  FEATURE FLAGS — controla bloqueio funcional + visual das abas
//  gerenciadas pelo admin via admin-panel.js
//
//  Diferença de TABS_CONFIG:
//    TABS_CONFIG=false  → aba OCULTADA (não existe no nav)
//    FEATURE_FLAGS=false → aba VISÍVEL mas BLOQUEADA (cinza, not-allowed)
// ============================================================

(function (global) {
  'use strict';

  var STORAGE_KEY = 'pa_feature_flags';

  /** Flags padrão — apenas abas gerenciáveis pelo admin */
  var _defaults = {
    itens:    true,
    pacotes:  true,
    captura:  true,
  };

  /** Carrega flags persistidas, fundeando nos defaults */
  function _load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        var merged = {};
        Object.keys(_defaults).forEach(function (k) {
          merged[k] = (typeof saved[k] === 'boolean') ? saved[k] : _defaults[k];
        });
        return merged;
      }
    } catch (e) { /* ignora parse errors */ }
    return Object.assign ? Object.assign({}, _defaults) : _shallowCopy(_defaults);
  }

  function _shallowCopy(obj) {
    var out = {};
    Object.keys(obj).forEach(function (k) { out[k] = obj[k]; });
    return out;
  }

  /** Salva flags no localStorage */
  function _save(flags) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(flags)); } catch (e) {}
  }

  /** Flags em memória — fonte de verdade em runtime */
  var _flags = _load();

  /**
   * Verifica se uma feature (aba) está habilitada.
   * Abas não listadas retornam true (nunca bloqueadas por padrão).
   * @param {string} tab
   * @returns {boolean}
   */
  function isFeatureEnabled(tab) {
    if (typeof _flags[tab] === 'boolean') return _flags[tab];
    return true; // abas não gerenciadas = sempre habilitadas
  }

  /**
   * Define o estado de uma feature e persiste.
   * @param {string}  tab
   * @param {boolean} enabled
   */
  function setFeatureFlag(tab, enabled) {
    if (!(tab in _defaults)) return; // só gerencia abas conhecidas
    _flags[tab] = !!enabled;
    _save(_flags);
    _applyVisual(tab, !!enabled);
    // Notifica o sistema de navegação
    document.dispatchEvent(new CustomEvent('featureFlagChanged', {
      detail: { tab: tab, enabled: !!enabled }
    }));
  }

  /**
   * Retorna cópia das flags atuais.
   * @returns {Object}
   */
  function getFlags() {
    return _shallowCopy(_flags);
  }

  // ── Visual: aplica/remove classes de bloqueio nos botões ─────────────

  function _applyVisual(tab, enabled) {
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      var oc = btn.getAttribute('onclick') || '';
      var dt = btn.getAttribute('data-tab') || '';
      if (oc.indexOf("'" + tab + "'") !== -1 || dt === tab) {
        if (enabled) {
          btn.classList.remove('tab-btn--disabled');
          btn.removeAttribute('data-feature-disabled');
          var badge = btn.querySelector('.tab-disabled-badge');
          if (badge) badge.remove();
        } else {
          btn.classList.add('tab-btn--disabled');
          btn.setAttribute('data-feature-disabled', tab);
          if (!btn.querySelector('.tab-disabled-badge')) {
            var b = document.createElement('span');
            b.className = 'tab-disabled-badge';
            b.textContent = 'Desativado';
            btn.appendChild(b);
          }
        }
      }
    });
  }

  /** Aplica visual inicial para todas as flags ao carregar */
  function _applyAllVisuals() {
    Object.keys(_flags).forEach(function (tab) {
      _applyVisual(tab, _flags[tab]);
    });
  }

  // Injeta CSS de bloqueio visual
  (function _injectCSS() {
    if (document.getElementById('pa-feature-flags-css')) return;
    var style = document.createElement('style');
    style.id = 'pa-feature-flags-css';
    style.textContent = [
      '.tab-btn--disabled {',
      '  opacity: 0.45 !important;',
      '  cursor: not-allowed !important;',
      '  filter: grayscale(0.8) !important;',
      '  position: relative;',
      '}',
      '.tab-btn--disabled:hover {',
      '  background: unset !important;',
      '  color: inherit !important;',
      '}',
      '.tab-disabled-badge {',
      '  display: block;',
      '  font-size: 0.55rem;',
      '  background: rgba(120,120,140,0.35);',
      '  color: #aaa;',
      '  border-radius: 3px;',
      '  padding: 1px 4px;',
      '  margin-top: 2px;',
      '  letter-spacing: 0.04em;',
      '  text-transform: uppercase;',
      '  pointer-events: none;',
      '}',
    ].join('\n');
    var target = document.head || document.documentElement;
    target.appendChild(style);
  }());

  // Aplica visuais quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _applyAllVisuals);
  } else {
    _applyAllVisuals();
  }

  // ── API pública ───────────────────────────────────────────────────────

  global.FeatureFlags = {
    isEnabled:  isFeatureEnabled,
    setFlag:    setFeatureFlag,
    getFlags:   getFlags,
    applyAll:   _applyAllVisuals,
  };

  // Atalho global — usado por toda navegação
  global.isFeatureEnabled = isFeatureEnabled;

}(window));
