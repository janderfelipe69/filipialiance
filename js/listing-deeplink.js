// ============================================================
// listing-deeplink.js — Link compartilhável por anúncio
//
// - Botão 🔗 nos cards copia uma URL com ?anuncio=<id>.
// - No carregamento, se a URL tiver ?anuncio=<id>, ativa a aba
//   marketplace, rola até o card e o destaca; depois limpa a URL.
//
// Usa query param (não hash) de propósito: o nav-runtime bloquearia
// um hash de aba desconhecida (#sell/...). Query param não conflita.
//
// API: window.PA.listingShare.{ copyLink, buttonHtml }
// ============================================================
;(function (global) {
  'use strict';

  var doc = global.document;
  var PARAM = 'anuncio';

  function _esc(s) {
    return (global.PA && global.PA.escapeHtml) ? global.PA.escapeHtml(s) : String(s == null ? '' : s);
  }

  function _link(id) {
    return global.location.origin + global.location.pathname + '?' + PARAM + '=' + encodeURIComponent(id);
  }

  function _fallbackCopy(text) {
    try {
      var ta = doc.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      doc.body.appendChild(ta);
      ta.select();
      doc.execCommand('copy');
      doc.body.removeChild(ta);
    } catch (_) {}
  }

  function copyLink(id, ev) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    var url = _link(id);
    var done = function () {
      if (typeof global.showToast === 'function') global.showToast('🔗 Link do anúncio copiado!', 'success');
    };
    if (global.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { _fallbackCopy(url); done(); });
    } else {
      _fallbackCopy(url);
      done();
    }
  }

  function buttonHtml(id) {
    return '<button class="mk-share-btn" type="button" title="Copiar link do anúncio"'
      + ' onclick="PA.listingShare.copyLink(\'' + _esc(id) + '\',event)">'
      + '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">'
      + '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>'
      + '<path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg></button>';
  }

  function _highlight(id) {
    var safe = (global.CSS && CSS.escape) ? CSS.escape(id) : id;
    var tries = 0;
    (function poll() {
      var card = doc.querySelector('#marketplace-list [data-listing-id="' + safe + '"]');
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('mk-card--highlight');
        setTimeout(function () { card.classList.remove('mk-card--highlight'); }, 2600);
        return;
      }
      if (++tries < 40) setTimeout(poll, 200); // tenta por ~8s (espera o fetch)
    })();
  }

  function _consumeParam() {
    var m = global.location.search.match(new RegExp('[?&]' + PARAM + '=([^&]+)'));
    if (!m) return;
    var id = decodeURIComponent(m[1]);

    var tab = doc.querySelector('.tab-btn--marketplace, .tab-btn[data-tab="marketplace"]');
    if (tab && !tab.classList.contains('active')) tab.click();

    _highlight(id);

    // Limpa a URL (mantém path + hash) sem recarregar
    try { history.replaceState({}, '', global.location.pathname + global.location.hash); } catch (_) {}
  }

  function _injectCss() {
    if (doc.getElementById('pa-share-css')) return;
    var s = doc.createElement('style');
    s.id = 'pa-share-css';
    s.textContent = [
      '.mk-share-btn{position:absolute;top:8px;right:44px;z-index:4;width:30px;height:30px;display:flex;',
      'align-items:center;justify-content:center;border-radius:9px;cursor:pointer;',
      'background:rgba(10,10,24,0.55);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.45);',
      'transition:transform .15s,color .15s,border-color .15s;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}',
      '.mk-share-btn svg{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}',
      '.mk-share-btn:hover{color:#7cc4ff;border-color:rgba(124,196,255,0.5);transform:scale(1.08)}',
      '@keyframes paCardGlow{0%,100%{box-shadow:0 0 0 0 rgba(160,120,255,0)}',
      '30%{box-shadow:0 0 0 3px rgba(160,120,255,0.65),0 0 30px rgba(160,120,255,0.5)}}',
      '.mk-card--highlight{animation:paCardGlow 1.3s ease 2}',
    ].join('');
    (doc.head || doc.documentElement).appendChild(s);
  }

  global.PA = global.PA || {};
  global.PA.listingShare = { copyLink: copyLink, buttonHtml: buttonHtml };

  function _boot() { _injectCss(); _consumeParam(); }
  if (doc.readyState !== 'loading') _boot();
  else doc.addEventListener('DOMContentLoaded', _boot);
})(window);
