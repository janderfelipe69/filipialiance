// ============================================================
// favorites.js — Watchlist / Favoritos do marketplace
//
// Persistência em localStorage (por dispositivo, sem backend).
// Guarda os IDs de anúncios favoritados. Usado por:
//   - botão ❤️ nos cards (marketplace-render.js)
//   - chip de filtro "Favoritos" (#mk-chip-fav)
//   - contador em "Minha Conta" (login.js)
//
// API: window.PA.favorites.{ has, list, count, toggle, toggleFromCard }
// Evento: 'pa:favorites-changed' (window) → { id, favorited }
// ============================================================
;(function (global) {
  'use strict';

  var KEY = 'pa:favorites';

  function _read() {
    try { return JSON.parse(global.localStorage.getItem(KEY) || '[]'); }
    catch (_) { return []; }
  }
  function _write(arr) {
    try { global.localStorage.setItem(KEY, JSON.stringify(arr)); } catch (_) {}
  }

  var _set = new Set(_read().map(String));

  function has(id)   { return _set.has(String(id)); }
  function list()    { return Array.from(_set); }
  function count()   { return _set.size; }

  function toggle(id) {
    id = String(id);
    if (_set.has(id)) _set.delete(id); else _set.add(id);
    _write(Array.from(_set));
    try {
      global.dispatchEvent(new CustomEvent('pa:favorites-changed', {
        detail: { id: id, favorited: _set.has(id) },
      }));
    } catch (_) {}
    return _set.has(id);
  }

  // Handler chamado pelo onclick inline do card.
  function toggleFromCard(btn, id, ev) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    var on = toggle(id);
    if (btn) {
      btn.classList.toggle('is-fav', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.title = on ? 'Remover dos favoritos' : 'Salvar nos favoritos';
    }
    if (typeof global.showToast === 'function') {
      global.showToast(on ? '❤️ Salvo nos favoritos' : 'Removido dos favoritos', on ? 'success' : 'info');
    }
  }

  // HTML do botão de favorito, reutilizado pelos dois builders de card.
  function buttonHtml(id) {
    var esc = (global.PA && global.PA.escapeHtml) ? global.PA.escapeHtml : function (s) { return String(s == null ? '' : s); };
    var on = has(id);
    return '<button class="mk-fav-btn' + (on ? ' is-fav' : '') + '" type="button"'
      + ' aria-pressed="' + (on ? 'true' : 'false') + '"'
      + ' title="' + (on ? 'Remover dos favoritos' : 'Salvar nos favoritos') + '"'
      + ' onclick="PA.favorites.toggleFromCard(this,\'' + esc(id) + '\',event)">'
      + '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">'
      + '<path d="M12 21s-7.5-4.6-10-9.2C.3 8.3 2 4.6 5.4 4.6c2 0 3.4 1.2 4.2 2.4.8-1.2 2.2-2.4 4.2-2.4 3.4 0 5.1 3.7 3.4 7.2C19.5 16.4 12 21 12 21z"/>'
      + '</svg></button>';
  }

  // CSS auto-contido (evita editar marketplace.css).
  function _injectCss() {
    if (global.document.getElementById('pa-fav-css')) return;
    var s = global.document.createElement('style');
    s.id = 'pa-fav-css';
    s.textContent = [
      '.mk-card{position:relative}',
      '.mk-fav-btn{position:absolute;top:8px;right:8px;z-index:4;width:30px;height:30px;display:flex;',
      'align-items:center;justify-content:center;border-radius:9px;cursor:pointer;',
      'background:rgba(10,10,24,0.55);border:1px solid rgba(255,255,255,0.12);',
      'color:rgba(255,255,255,0.45);transition:transform .15s,color .15s,background .15s,border-color .15s;',
      'backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);-webkit-tap-highlight-color:transparent}',
      '.mk-fav-btn svg{fill:none;stroke:currentColor;stroke-width:2}',
      '.mk-fav-btn:hover{color:#ff7a9c;border-color:rgba(255,122,156,0.5);transform:scale(1.08)}',
      '.mk-fav-btn.is-fav{color:#ff4d79;border-color:rgba(255,77,121,0.55);background:rgba(255,77,121,0.12)}',
      '.mk-fav-btn.is-fav svg{fill:currentColor}',
      '@keyframes paFavPop{0%{transform:scale(1)}40%{transform:scale(1.35)}100%{transform:scale(1)}}',
      '.mk-fav-btn.is-fav{animation:paFavPop .28s ease}',
      // chip de favoritos: coração rosado quando ativo
      '.mk-filter-chip--fav.active{background:rgba(255,77,121,0.14);border-color:rgba(255,77,121,0.5);color:#ff8fab}',
      // select de ordenação no tema escuro
      '.mk-sort{appearance:none;-webkit-appearance:none;cursor:pointer;border-radius:10px;',
      'padding:7px 28px 7px 12px;font-size:12px;font-weight:600;color:rgba(255,255,255,0.8);',
      'background:rgba(255,255,255,0.05) url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'><path d=\'M2 3.5L5 6.5L8 3.5\' stroke=\'%23ffffff80\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\'/></svg>") no-repeat right 10px center;',
      'border:1px solid rgba(255,255,255,0.1);outline:none;transition:border-color .15s,background-color .15s}',
      '.mk-sort:hover{border-color:rgba(160,120,255,0.4)}',
      '.mk-sort:focus{border-color:rgba(160,120,255,0.6)}',
      '.mk-sort option{background:#12121e;color:#fff}',
    ].join('');
    (global.document.head || global.document.documentElement).appendChild(s);
  }

  // Abre o marketplace já filtrado pela watchlist (usado pelo "Minha Conta").
  function openWatchlist() {
    if (global.AuthModal && typeof global.AuthModal.closeMyAccount === 'function') {
      global.AuthModal.closeMyAccount();
    }
    var tab = global.document.querySelector('.tab-btn--marketplace, .tab-btn[data-tab="marketplace"]');
    if (tab) tab.click();
    var chip = global.document.getElementById('mk-chip-fav');
    if (chip && !chip.classList.contains('active')) chip.click();
  }

  global.PA = global.PA || {};
  global.PA.favorites = {
    has: has, list: list, count: count,
    toggle: toggle, toggleFromCard: toggleFromCard, buttonHtml: buttonHtml,
    openWatchlist: openWatchlist,
  };

  if (global.document.readyState !== 'loading') _injectCss();
  else global.document.addEventListener('DOMContentLoaded', _injectCss);
})(window);
