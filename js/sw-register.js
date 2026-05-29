// ── Service Worker Registration ────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  var _swRefreshed = false;

  navigator.serviceWorker.addEventListener('controllerchange', function() {
    if (!_swRefreshed) {
      _swRefreshed = true;
      window.location.reload();
    }
  });

  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js', {
      updateViaCache: 'none'
    }).then(function(reg) {
      reg.update();

      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      reg.addEventListener('updatefound', function() {
        var newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', function() {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    }).catch(function(err) {
      console.warn('[SW] Registro falhou:', err);
    });
  });
}
