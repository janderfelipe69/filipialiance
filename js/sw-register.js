// ── Service Worker Registration ────────────────────────────────────────────
// Padrão "refresh to update": quando há uma nova versão, NÃO recarregamos a
// página automaticamente (isso interrompia o usuário no meio de uma ação).
// Em vez disso mostramos um banner discreto e só recarregamos quando ele
// clicar em "Atualizar".
if ('serviceWorker' in navigator) {
  var _reloading = false;     // true só após o usuário aceitar a atualização
  var _bannerShown = false;   // evita banners duplicados

  // controllerchange dispara quando o novo SW assume o controle. Só
  // recarregamos se a atualização foi explicitamente aceita pelo usuário.
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (_reloading) window.location.reload();
  });

  // ── Banner de atualização (auto-contido, sem dependência de toast.js) ──
  function showUpdateBanner(worker) {
    if (_bannerShown) return;
    _bannerShown = true;

    var bar = document.createElement('div');
    bar.setAttribute('role', 'status');
    bar.style.cssText = [
      'position:fixed', 'left:50%', 'bottom:20px', 'transform:translateX(-50%) translateY(140%)',
      'z-index:100000', 'display:flex', 'align-items:center', 'gap:14px',
      'padding:12px 16px', 'border-radius:14px',
      'background:rgba(16,18,28,0.96)', 'border:1px solid rgba(160,120,255,0.35)',
      'box-shadow:0 12px 40px rgba(0,0,0,0.55)', 'backdrop-filter:blur(8px)',
      '-webkit-backdrop-filter:blur(8px)', 'color:#fff',
      'font-family:var(--font-body,system-ui,sans-serif)', 'font-size:13px',
      'max-width:calc(100vw - 32px)', 'transition:transform .35s cubic-bezier(.2,.8,.2,1)'
    ].join(';');

    var msg = document.createElement('span');
    msg.textContent = '✨ Nova versão disponível';
    msg.style.cssText = 'white-space:nowrap';

    var btn = document.createElement('button');
    btn.textContent = 'Atualizar';
    btn.style.cssText = [
      'cursor:pointer', 'border:none', 'border-radius:9px', 'padding:7px 16px',
      'font-weight:700', 'font-size:13px', 'color:#0b0b18',
      'background:linear-gradient(135deg,#c9a6ff,#8a6aff)', 'flex-shrink:0'
    ].join(';');

    var dismiss = document.createElement('button');
    dismiss.setAttribute('aria-label', 'Fechar');
    dismiss.textContent = '✕';
    dismiss.style.cssText = [
      'cursor:pointer', 'border:none', 'background:transparent',
      'color:rgba(255,255,255,0.45)', 'font-size:15px', 'line-height:1', 'padding:4px'
    ].join(';');

    btn.addEventListener('click', function () {
      _reloading = true;
      // Se o worker está aguardando, mandamos ativar; o controllerchange
      // resultante recarrega a página. Se já estiver ativo, recarrega direto.
      if (worker && worker.postMessage) worker.postMessage({ type: 'SKIP_WAITING' });
      if (!navigator.serviceWorker.controller) window.location.reload();
      btn.disabled = true;
      btn.textContent = 'Atualizando…';
    });

    dismiss.addEventListener('click', function () {
      bar.style.transform = 'translateX(-50%) translateY(140%)';
      setTimeout(function () { bar.remove(); }, 400);
    });

    bar.appendChild(msg);
    bar.appendChild(btn);
    bar.appendChild(dismiss);
    document.body.appendChild(bar);
    // anima a entrada
    requestAnimationFrame(function () {
      bar.style.transform = 'translateX(-50%) translateY(0)';
    });
  }

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js', {
      updateViaCache: 'none'
    }).then(function (reg) {
      reg.update();

      // Já existe um worker aguardando de uma visita anterior.
      if (reg.waiting && navigator.serviceWorker.controller) {
        showUpdateBanner(reg.waiting);
      }

      reg.addEventListener('updatefound', function () {
        var newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', function () {
          // 'installed' + já existe controller => é uma ATUALIZAÇÃO (não a
          // primeira instalação). Pede confirmação em vez de recarregar.
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(newWorker);
          }
        });
      });
    }).catch(function (err) {
      console.warn('[SW] Registro falhou:', err);
    });
  });
}
