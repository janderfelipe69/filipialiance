// ============================================================
// pwa-install.js — Prompt de instalação do app (PWA)
//
// Captura o evento beforeinstallprompt (Chrome/Edge/Android) e
// mostra um botão flutuante "Instalar app". Some após instalar ou
// recusar. No iOS o evento não existe (instalação é manual via
// "Adicionar à Tela de Início"); ali o botão simplesmente não aparece.
// ============================================================
;(function (global) {
  'use strict';

  var doc = global.document;
  var deferred = null;
  var btn = null;

  function _build() {
    if (btn) return btn;
    btn = doc.createElement('button');
    btn.id = 'pa-install-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Instalar aplicativo');
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>'
      + '<span>Instalar app</span>';
    btn.style.cssText = [
      'position:fixed', 'left:16px', 'bottom:20px', 'z-index:99999',
      'display:flex', 'align-items:center', 'gap:8px', 'padding:10px 16px',
      'border:none', 'border-radius:12px', 'cursor:pointer',
      'font-family:var(--font-body,system-ui,sans-serif)', 'font-size:13px', 'font-weight:700',
      'color:#0b0b18', 'background:linear-gradient(135deg,#c9a6ff,#8a6aff)',
      'box-shadow:0 10px 30px rgba(120,80,255,0.4)',
      'transform:translateY(160%)', 'opacity:0', 'pointer-events:none',
      'transition:transform .35s cubic-bezier(.2,.8,.2,1),opacity .3s',
    ].join(';');
    btn.addEventListener('click', function () {
      if (!deferred) return;
      btn.disabled = true;
      deferred.prompt();
      var choice = deferred.userChoice;
      deferred = null;
      _hide();
      if (choice && choice.then) {
        choice.then(function (res) {
          if (res && res.outcome === 'accepted' && typeof global.showToast === 'function') {
            global.showToast('Instalando o app… 🎉', 'success');
          }
        });
      }
    });
    doc.body.appendChild(btn);
    return btn;
  }

  function _show() {
    _build();
    requestAnimationFrame(function () {
      btn.style.transform = 'translateY(0)';
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    });
  }

  function _hide() {
    if (!btn) return;
    btn.style.transform = 'translateY(160%)';
    btn.style.opacity = '0';
    btn.style.pointerEvents = 'none';
  }

  global.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    if (doc.body) _show();
    else doc.addEventListener('DOMContentLoaded', _show);
  });

  global.addEventListener('appinstalled', function () {
    deferred = null;
    _hide();
    if (typeof global.showToast === 'function') global.showToast('App instalado! 🎉', 'success');
  });
})(window);
