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
  function setFeatureFlag(tab, enabled, opts) {
    opts = opts || {};
    if (!(tab in _defaults)) return Promise.resolve(); // só gerencia abas conhecidas
    _flags[tab] = !!enabled;
    _save(_flags);
    _applyVisual(tab, !!enabled);
    // Notifica o sistema de navegação
    document.dispatchEvent(new CustomEvent('featureFlagChanged', {
      detail: { tab: tab, enabled: !!enabled }
    }));
    // opts.localOnly = só estado local (usado para reverter quando o server falha)
    if (opts.localOnly) return Promise.resolve();
    // Propaga para o SERVIDOR → passa a valer para TODOS os visitantes (até anônimos)
    return _saveToServer(_flags);
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

  // ══════════════════════════════════════════════════════════════════════════
  //  SINCRONIZAÇÃO COM O SERVIDOR (Supabase)
  //
  //  As flags são GLOBAIS: o admin altera e TODOS os visitantes (inclusive
  //  anônimos) passam a ver o mesmo estado no próximo carregamento da página.
  //  O localStorage funciona apenas como cache para render instantâneo.
  //
  //  Tabela: public.app_settings (key text PK, value jsonb)
  //  Linha:  key = 'feature_flags', value = { itens, pacotes, captura }
  // ══════════════════════════════════════════════════════════════════════════

  var REMOTE_KEY = 'feature_flags';

  function _sbHeaders(auth) {
    return {
      'Content-Type':  'application/json',
      'apikey':        global.SUPABASE_KEY,
      'Authorization': 'Bearer ' + (auth || global.SUPABASE_KEY),
    };
  }

  /** Lê as flags do servidor (anon) e aplica localmente. */
  function _loadFromServer() {
    if (!global.SUPABASE_URL || !global.SUPABASE_KEY) return Promise.resolve();
    var url = global.SUPABASE_URL +
      '/rest/v1/app_settings?key=eq.' + REMOTE_KEY + '&select=value';
    return fetch(url, { headers: _sbHeaders() })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        if (!Array.isArray(rows) || !rows.length || !rows[0].value) return;
        var v = rows[0].value;
        var changed = [];
        Object.keys(_defaults).forEach(function (k) {
          if (typeof v[k] === 'boolean') {
            if (_flags[k] !== v[k]) changed.push(k);
            _flags[k] = v[k];
          }
        });
        _save(_flags);          // atualiza cache local
        _applyAllVisuals();     // aplica cinza/badge nos botões
        // Re-avalia a navegação para cada flag que mudou
        changed.forEach(function (k) {
          document.dispatchEvent(new CustomEvent('featureFlagChanged', {
            detail: { tab: k, enabled: _flags[k] }
          }));
        });
        _enforceActiveTab();    // expulsa quem está numa aba recém-bloqueada
      })
      .catch(function () { /* offline → mantém o cache local */ });
  }

  /** Grava as flags no servidor (somente admin — exige JWT). */
  function _saveToServer(flags) {
    // Session é um `const` global no session.js — acessível por identificador
    // direto (não existe window.Session), igual ao uso no admin-panel.js.
    var jwt = (typeof Session !== 'undefined' && typeof Session.getAccessToken === 'function')
      ? Session.getAccessToken() : null;
    if (!jwt) return Promise.reject(new Error('Sessão de admin não encontrada. Recarregue e tente de novo.'));
    if (!global.SUPABASE_URL) return Promise.reject(new Error('Supabase indisponível.'));
    // Upsert pela PK (key) — cria a linha se não existir, senão atualiza
    var url = global.SUPABASE_URL + '/rest/v1/app_settings?on_conflict=key';
    return fetch(url, {
      method:  'POST',
      headers: Object.assign(_sbHeaders(jwt), {
        'Prefer': 'resolution=merge-duplicates,return=representation',
      }),
      body: JSON.stringify({ key: REMOTE_KEY, value: flags }),
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error(t.slice(0, 200)); });
      return r.json();
    });
  }

  /** Se a aba ativa estiver bloqueada, manda o usuário para a primeira liberada. */
  function _enforceActiveTab() {
    var active = document.querySelector('.tab-content.active');
    if (!active) return;
    var id  = active.id || '';                       // ex.: 'tab-itens'
    var tab = id.indexOf('tab-') === 0 ? id.slice(4) : '';
    if (!tab || isFeatureEnabled(tab)) return;       // aba atual está ok
    var btns = document.querySelectorAll('.tab-btn');
    for (var i = 0; i < btns.length; i++) {
      var oc = btns[i].getAttribute('onclick') || '';
      var m  = oc.match(/switchTab\(['"]([^'"]+)['"]/);
      var t  = m ? m[1] : (btns[i].getAttribute('data-tab') || '');
      if (t && isFeatureEnabled(t)) {
        if (typeof global.switchTab === 'function') global.switchTab(t, btns[i]);
        return;
      }
    }
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
      '  display: inline-flex;',
      '  align-items: center;',
      '  font-size: 0.5rem;',
      '  line-height: 1;',
      '  background: rgba(120,120,140,0.35);',
      '  color: #aaa;',
      '  border-radius: 3px;',
      '  padding: 2px 5px;',
      '  letter-spacing: 0.05em;',
      '  text-transform: uppercase;',
      '  white-space: nowrap;',
      '  flex-shrink: 0;',
      '  pointer-events: none;',
      '}',
    ].join('\n');
    var target = document.head || document.documentElement;
    target.appendChild(style);
  }());

  // Aplica visuais (cache local) e busca o estado real do servidor quando o DOM estiver pronto
  function _initFlags() {
    _applyAllVisuals();   // render instantâneo com o cache local
    _loadFromServer();    // sincroniza com a fonte de verdade (servidor)
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initFlags);
  } else {
    _initFlags();
  }

  // ── API pública ───────────────────────────────────────────────────────

  global.FeatureFlags = {
    isEnabled:        isFeatureEnabled,
    setFlag:          setFeatureFlag,
    getFlags:         getFlags,
    applyAll:         _applyAllVisuals,
    reloadFromServer: _loadFromServer,
  };

  // Atalho global — usado por toda navegação
  global.isFeatureEnabled = isFeatureEnabled;

}(window));

// ── Aplica TABS_CONFIG e ativa a primeira aba habilitada ──────────────────
// Executado inline após o DOM estar disponível (script carregado no final do body).
(function() {
  if (typeof TABS_CONFIG === 'undefined') return;

  var firstEnabled = null;

  Object.keys(TABS_CONFIG).forEach(function(tab) {
    if (TABS_CONFIG[tab] === false) {
      document.querySelectorAll('.tab-btn[data-tab="' + tab + '"]').forEach(function(btn) {
        btn.style.display = 'none';
      });
      var content = document.getElementById('tab-' + tab);
      if (content) content.style.display = 'none';
    } else {
      if (!firstEnabled) firstEnabled = tab;
    }
  });

  if (firstEnabled) {
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });

    var firstBtn = null;
    var firstTab = null;
    document.querySelectorAll('.tab-btn[data-tab]').forEach(function(btn) {
      if (firstBtn) return;
      if (btn.style.display === 'none') return;
      var tabName = btn.dataset.tab;
      if (tabName && typeof isFeatureEnabled === 'function' && !isFeatureEnabled(tabName)) return;
      firstBtn = btn;
      firstTab = tabName || firstEnabled;
    });

    if (!firstBtn) {
      document.querySelectorAll('.tab-btn[data-tab]').forEach(function(btn) {
        if (!firstBtn && btn.style.display !== 'none') firstBtn = btn;
      });
      firstTab = firstEnabled;
    }

    if (firstBtn) firstBtn.classList.add('active');
    var firstContent = document.getElementById('tab-' + firstTab);
    if (firstContent) firstContent.classList.add('active');
  }
})();
