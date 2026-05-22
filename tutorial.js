// ============================================================
// tutorial.js — Tutorial interativo
// Pode ser removido sem afetar o restante do site.
// ============================================================

(function () {
  'use strict';

  var STEPS = [
    // ── 0 ── Boas vindas
    {
      target: null,
      position: 'center',
      title: '👋 Bem-vindo ao Tutorial!',
      text: 'Vou te mostrar tudo que a loja tem a oferecer em <strong>poucos passos</strong>. Começamos pela aba de <strong>Itens</strong> — vamos lá!',
    },

    // ── 1 ── Preço em KK
    {
      target: '#grid .card:first-child .price-kk',
      position: 'right',
      tab: 'itens',
      title: '💰 Preço em KK',
      text: 'Esse é o <strong>preço em KK</strong> (moeda do jogo). Todos os itens têm o valor exibido aqui de forma clara, em destaque.',
    },

    // ── 2 ── Preço em Real
    {
      target: '#grid .card:first-child .price-brl',
      position: 'right',
      tab: 'itens',
      title: '🇧🇷 Preço em Real',
      text: 'Logo ao lado do KK, você vê a <strong>conversão em reais (R$)</strong> — assim fica fácil saber exatamente quanto vai pagar.',
    },

    // ── 3 ── Botão Adicionar
    {
      target: '#grid .card:first-child .add-btn',
      position: 'top',
      tab: 'itens',
      title: '➕ Adicionar ao Carrinho',
      text: 'Clique em <strong>Adicionar</strong> para colocar o item no carrinho. Você pode ajustar a <strong>quantidade</strong> no campo acima do botão antes de adicionar!',
    },

    // ── 4 ── Botão Remover
    {
      target: '#grid .card:first-child .card-footer-added',
      position: 'top',
      tab: 'itens',
      title: '✕ Remover do Carrinho',
      text: 'Depois de adicionar, o botão <strong>✕</strong> aparece ao lado. Clique nele para <strong>remover</strong> o item do carrinho na hora — sem precisar abrir o carrinho.',
    },

    // ── 5 ── Lupa / Wiki Lookup
    {
      target: '#grid .card:first-child .wiki-lookup-btn',
      position: 'right',
      tab: 'itens',
      title: '🔍 De qual Pokémon dropa?',
      text: 'Viu essa <strong>lupinha</strong> ao lado do nome? Clique nela para ver exatamente <strong>quais Pokémons dropam esse item</strong> — com sprites e tudo!',
    },

    // ── 6 ── Aba Pacotes (intro)
    {
      target: '.tab-btn[onclick*="pacotes"]',
      position: 'bottom',
      tab: 'pacotes',
      title: '📦 Aba de Pacotes',
      text: 'Agora vamos para a aba de <strong>Pacotes</strong>! Aqui você encontra combos prontos de itens, com preço fechado e desconto especial.',
      onEnter: function() {
        // Abre o Talent Water 7/8 como exemplo
        if (typeof selectPkg === 'function') selectPkg(2);
      }
    },

    // ── 7 ── Remover item do pacote
    {
      target: '.pkg-detail-body',
      position: 'left',
      tab: 'pacotes',
      title: '✕ Já tem algum item?',
      text: 'Se você <strong>já possui</strong> algum item do pacote, clique no <strong>✕ vermelho</strong> ao lado dele para removê-lo. O preço total é <strong>descontado automaticamente</strong> — você paga só o que realmente precisa!',
      onEnter: function() {
        if (typeof selectPkg === 'function') selectPkg(2);
      }
    },

    // ── 8 ── Lupa no pacote
    {
      target: '.pkg-detail-body .wiki-lookup-btn',
      position: 'left',
      tab: 'pacotes',
      title: '🔍 Lupa também nos Pacotes',
      text: 'A <strong>lupa</strong> também aparece nos itens do pacote! Clique para ver de quais Pokémons cada item é dropado.',
      onEnter: function() {
        if (typeof selectPkg === 'function') selectPkg(2);
      }
    },

    // ── 9 ── Filtro / busca
    {
      target: '.controls',
      position: 'bottom',
      tab: 'itens',
      title: '🔎 Busca e Filtros',
      text: 'De volta na aba <strong>Itens</strong>: use a <strong>barra de busca</strong> para achar um item pelo nome e o <strong>filtro de categoria</strong> (T1, T2, Hard, Shiny…) para refinar os resultados.',
      onEnter: function() {
        if (typeof closeCapturaModal === 'function') closeCapturaModal();
      }
    },

    // ── 10 ── Aba Captura
    {
      target: '.tab-btn[onclick*="captura"]',
      position: 'bottom',
      tab: 'captura',
      title: '🎯 Aba de Captura',
      text: 'Aqui ficam os <strong>Pokémons disponíveis para captura</strong>. Clique em qualquer card para ver os detalhes e escolher a ball!',
    },

    // ── 11 ── Seleção de Ball
    {
      target: '.captura-ball-options',
      position: 'top',
      tab: 'captura',
      title: '⚪ Escolha a Ball',
      text: 'Após selecionar um Pokémon, escolha a <strong>Poké Ball</strong> desejada — <strong>Ultra Ball</strong>, <strong>Premier Ball</strong> ou <strong>Alliance Ball</strong>. Cada uma tem um valor diferente!',
      onEnter: function() {
        var firstCaptura = document.querySelector('.captura-card');
        if (firstCaptura) firstCaptura.click();
      }
    },

    // ── 12 ── Aba Entregas
    {
      target: '.tab-btn[onclick*="entregas"]',
      position: 'bottom',
      tab: 'entregas',
      title: '📸 Aba de Entregas',
      text: 'Nessa aba ficam as <strong>fotos dos pedidos já entregues</strong>. É a prova de que os serviços foram realizados com sucesso — transparência total!',
      onEnter: function() {
        if (typeof closeCapturaModal === 'function') closeCapturaModal();
      }
    },

    // ── 13 ── Aba Wiki
    {
      target: '.tab-btn--wiki',
      position: 'bottom',
      tab: 'wiki',
      title: '📖 Aba Wiki',
      text: 'A <strong>Wiki</strong> é sua enciclopédia da loja! Aqui você encontra todos os itens listados e <strong>quais Pokémons os dropam</strong> — ótimo para planejar sua compra.',
      onEnter: function() {
        if (typeof closeCapturaModal === 'function') closeCapturaModal();
      }
    },

    // ── 14 ── Fim
    {
      target: null,
      position: 'center',
      title: '✅ Tutorial Concluído!',
      text: 'Agora você domina a loja do Filipi! 🎮<br><br>Qualquer dúvida, chame o Filipi. <strong>Boas compras!</strong>',
    },
  ];

  var currentStep = 0;
  var active = false;

  var CSS = [
    '#tut-backdrop{position:fixed;inset:0;z-index:89999;display:none;pointer-events:none}',
    '#tut-backdrop.active{pointer-events:all}',
    '#tut-mask{position:absolute;inset:0;pointer-events:none}',
    '#tut-spotlight-ring{position:absolute;border-radius:10px;box-shadow:0 0 0 3px rgba(58,140,255,.9),0 0 32px rgba(58,140,255,.7);transition:top .4s cubic-bezier(.16,1,.3,1),left .4s cubic-bezier(.16,1,.3,1),width .4s cubic-bezier(.16,1,.3,1),height .4s cubic-bezier(.16,1,.3,1),opacity .3s;pointer-events:none;opacity:0;z-index:2}',
    '#tut-tooltip{position:fixed;width:320px;background:linear-gradient(145deg,#0d1628,#080f1e);border:1px solid rgba(56,140,255,.4);border-radius:14px;padding:22px 22px 18px;box-shadow:0 0 40px rgba(58,140,255,.2),0 20px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06);z-index:90001;display:none;pointer-events:all}',
    '#tut-tooltip::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;border-radius:14px 14px 0 0;background:linear-gradient(90deg,transparent,#3a8cff,#f0b429,#3a8cff,transparent)}',
    '#tut-dots{display:flex;gap:4px;align-items:center;margin-bottom:10px}',
    '.tut-dot{width:6px;height:6px;border-radius:50%;background:rgba(58,140,255,.25);transition:all .3s}',
    '.tut-dot.active{background:#3a8cff;box-shadow:0 0 8px rgba(58,140,255,.6);width:18px;border-radius:3px}',
    '#tut-title{font-family:Cinzel,serif;font-size:15px;font-weight:700;letter-spacing:1px;background:linear-gradient(135deg,#fff 0%,#60aaff 50%,#f0b429 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:10px;line-height:1.3}',
    '#tut-text{font-family:Rajdhani,sans-serif;font-size:14px;font-weight:500;color:#b8cce8;line-height:1.6;margin-bottom:18px}',
    '#tut-text strong{color:#dde8ff}',
    '#tut-footer{display:flex;align-items:center;justify-content:space-between;gap:10px}',
    '#tut-skip{font-family:Rajdhani,sans-serif;font-size:12px;font-weight:600;color:rgba(90,112,153,.7);background:none;border:none;cursor:pointer;padding:4px 0;transition:color .2s;pointer-events:all}',
    '#tut-skip:hover{color:rgba(90,112,153,1)}',
    '#tut-btns{display:flex;gap:8px}',
    '#tut-prev,#tut-next{font-family:Cinzel,serif;font-size:11px;font-weight:700;letter-spacing:1px;border-radius:8px;padding:9px 18px;cursor:pointer;transition:all .2s;text-transform:uppercase;pointer-events:all}',
    '#tut-prev{background:rgba(58,140,255,.08);border:1px solid rgba(58,140,255,.25);color:#60aaff}',
    '#tut-prev:hover{background:rgba(58,140,255,.15);border-color:rgba(58,140,255,.5)}',
    '#tut-next{background:linear-gradient(135deg,#3a8cff,#1a6fe8);border:none;color:#fff;box-shadow:0 4px 16px rgba(58,140,255,.35)}',
    '#tut-next:hover{transform:translateY(-1px);box-shadow:0 6px 24px rgba(58,140,255,.5)}',
    '#tut-next.finish{background:linear-gradient(135deg,#f0b429,#e09000);box-shadow:0 4px 16px rgba(240,180,41,.35)}',
    '#tut-progress{position:fixed;top:0;left:0;height:2px;background:linear-gradient(90deg,#3a8cff,#f0b429);z-index:90002;transition:width .4s cubic-bezier(.16,1,.3,1);box-shadow:0 0 8px rgba(58,140,255,.6);pointer-events:none;display:none}',
    '#tut-fab{position:fixed;bottom:28px;left:28px;z-index:88888;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,rgba(58,140,255,.15),rgba(58,140,255,.08));border:1px solid rgba(58,140,255,.4);color:#60aaff;font-family:Cinzel,serif;font-size:18px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(58,140,255,.2);transition:all .25s;backdrop-filter:blur(8px)}',
    '#tut-fab:hover{transform:scale(1.1);box-shadow:0 0 30px rgba(58,140,255,.4);border-color:rgba(58,140,255,.7)}',
    '#tut-fab.hidden{opacity:0;pointer-events:none}',
  ].join('');

  function injectCSS() {
    if (document.getElementById('tut-style')) return;
    var s = document.createElement('style');
    s.id = 'tut-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function createDOM() {
    if (document.getElementById('tut-backdrop')) return;

    var prog = document.createElement('div');
    prog.id = 'tut-progress';
    document.body.appendChild(prog);

    var backdrop = document.createElement('div');
    backdrop.id = 'tut-backdrop';
    backdrop.innerHTML = '<svg id="tut-svg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none" xmlns="http://www.w3.org/2000/svg"><defs><mask id="tut-hole"><rect width="100%" height="100%" fill="white"/><rect id="tut-hole-rect" x="0" y="0" width="0" height="0" rx="10" fill="black"/></mask></defs><rect width="100%" height="100%" fill="rgba(4,6,14,0.82)" mask="url(#tut-hole)"/></svg><div id="tut-spotlight-ring"></div>';
    document.body.appendChild(backdrop);

    var tooltip = document.createElement('div');
    tooltip.id = 'tut-tooltip';
    tooltip.innerHTML =
      '<div id="tut-dots"></div>' +
      '<div id="tut-title"></div>' +
      '<div id="tut-text"></div>' +
      '<div id="tut-footer">' +
        '<button id="tut-skip">Pular tutorial</button>' +
        '<div id="tut-btns">' +
          '<button id="tut-prev">&#8592; Anterior</button>' +
          '<button id="tut-next">Pr&#243;ximo &#8594;</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(tooltip);

    var fab = document.createElement('button');
    fab.id = 'tut-fab';
    fab.title = 'Abrir tutorial';
    fab.textContent = '?';
    document.body.appendChild(fab);

    document.getElementById('tut-next').onclick = function(e) { e.stopPropagation(); doNext(); };
    document.getElementById('tut-prev').onclick = function(e) { e.stopPropagation(); doPrev(); };
    document.getElementById('tut-skip').onclick = function(e) {
      e.stopPropagation();
      try { localStorage.setItem('tut_seen', '1'); } catch(ex) {}
      closeTutorial();
    };
    document.getElementById('tut-fab').onclick  = function(e) { e.stopPropagation(); startTutorial(); };

    // Clique fora não fecha o tutorial

    document.addEventListener('keydown', function(e) {
      if (!active) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') doNext();
      if (e.key === 'ArrowLeft') doPrev();
      if (e.key === 'Escape') closeTutorial();
    });
  }

  function renderStep(idx) {
    var step    = STEPS[idx];
    var total   = STEPS.length;
    var isLast  = (idx === total - 1);
    var isFirst = (idx === 0);

    var pct = Math.round((idx / (total - 1)) * 100);
    document.getElementById('tut-progress').style.width = pct + '%';

    var dots = '';
    for (var i = 0; i < total; i++) {
      dots += '<div class="tut-dot' + (i === idx ? ' active' : '') + '"></div>';
    }
    document.getElementById('tut-dots').innerHTML = dots;
    document.getElementById('tut-title').textContent = step.title;
    document.getElementById('tut-text').innerHTML    = step.text;

    document.getElementById('tut-prev').style.display = isFirst ? 'none' : '';
    document.getElementById('tut-skip').style.display = isLast  ? 'none' : '';
    var nextBtn = document.getElementById('tut-next');
    nextBtn.textContent = isLast ? '\u2713 Concluir' : 'Pr\u00f3ximo \u2192';
    nextBtn.className   = isLast ? 'finish' : '';

    // Trocar aba se o passo pedir
    if (step.tab) {
      var tabBtn = document.querySelector('.tab-btn[onclick*="' + step.tab + '"]');
      if (tabBtn && !tabBtn.classList.contains('active')) {
        switchTab(step.tab, tabBtn);
      }
    } else if (!step.tab) {
      // Voltar para itens quando não há aba definida
      var itensBtn = document.querySelector('.tab-btn[onclick*="itens"]');
      if (itensBtn && !itensBtn.classList.contains('active')) {
        switchTab('itens', itensBtn);
      }
    }

    // Callback de entrada do passo (ex: abrir pacote, selecionar pokémon)
    if (typeof step.onEnter === 'function') {
      setTimeout(function() {
        step.onEnter();
        // Re-posiciona após o onEnter renderizar o conteúdo (aguarda animações)
        setTimeout(function() { positionStep(step); }, 300);
      }, 80);
    }

    positionStep(step);
  }

  function positionStep(step) {
    // spotlight-ring updated inline below
    var tooltip   = document.getElementById('tut-tooltip');
    var margin    = 12;

    var target = null;
    if (step.target) target = document.querySelector(step.target);

    if (!target || step.position === 'center') {
      var spotlight = document.getElementById('tut-spotlight-ring');
      spotlight.style.opacity = '0';
      var holeRect2 = document.getElementById('tut-hole-rect');
      if (holeRect2) { holeRect2.setAttribute('width','0'); holeRect2.setAttribute('height','0'); }
      var vw = window.innerWidth, vh = window.innerHeight;
      tooltip.style.top  = Math.round(vh / 2 - 130) + 'px';
      tooltip.style.left = Math.round(Math.max(10, vw / 2 - 160)) + 'px';
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    setTimeout(function() {
      var rect = target.getBoundingClientRect();
      var pad  = 6;
      var vw   = window.innerWidth;
      var vh   = window.innerHeight;

      // Update SVG hole
      var holeRect = document.getElementById('tut-hole-rect');
      var svgEl    = document.getElementById('tut-svg');
      if (holeRect && svgEl) {
        var svgRect = svgEl.getBoundingClientRect();
        holeRect.setAttribute('x',      (rect.left - pad - svgRect.left));
        holeRect.setAttribute('y',      (rect.top  - pad - svgRect.top));
        holeRect.setAttribute('width',  (rect.width  + pad * 2));
        holeRect.setAttribute('height', (rect.height + pad * 2));
      }
      // Update ring
      var spotlight = document.getElementById('tut-spotlight-ring');
      spotlight.style.opacity = '1';
      spotlight.style.top    = (rect.top  - pad) + 'px';
      spotlight.style.left   = (rect.left - pad) + 'px';
      spotlight.style.width  = (rect.width  + pad * 2) + 'px';
      spotlight.style.height = (rect.height + pad * 2) + 'px';

      var tw = 320, th = 260;
      var pos = step.position;
      var top, left;

      if (pos === 'bottom') {
        top  = rect.bottom + margin + pad;
        left = rect.left + rect.width / 2 - tw / 2;
        if (top + th > vh - 10) pos = 'top';
      }
      if (pos === 'top') {
        top  = rect.top - th - margin - pad;
        left = rect.left + rect.width / 2 - tw / 2;
        if (top < 10) { top = rect.bottom + margin + pad; }
      }
      if (pos === 'right') {
        top  = rect.top + rect.height / 2 - th / 2;
        left = rect.right + margin + pad;
        if (left + tw > vw - 10) { left = rect.left - tw - margin - pad; }
      }
      if (pos === 'left') {
        top  = rect.top + rect.height / 2 - th / 2;
        left = rect.left - tw - margin - pad;
        if (left < 10) { left = rect.right + margin + pad; }
      }

      left = Math.max(10, Math.min(left, vw - tw - 10));
      top  = Math.max(10, Math.min(top,  vh - th - 10));

      tooltip.style.top  = top  + 'px';
      tooltip.style.left = left + 'px';
    }, 380);
  }

  function doNext() {
    if (currentStep < STEPS.length - 1) {
      currentStep++;
      renderStep(currentStep);
    } else {
      closeTutorial(true);
    }
  }

  function doPrev() {
    if (currentStep > 0) {
      currentStep--;
      renderStep(currentStep);
    }
  }

  function startTutorial() {
    active = true;
    currentStep = 0;

    var welcome = document.getElementById('welcome-overlay');
    if (welcome) welcome.style.display = 'none';

    document.getElementById('tut-backdrop').style.display = 'block';
    document.getElementById('tut-backdrop').classList.add('active');
    document.getElementById('tut-tooltip').style.display  = 'block';
    document.getElementById('tut-progress').style.display = 'block';
    document.getElementById('tut-fab').classList.add('hidden');

    renderStep(0);
  }

  function closeTutorial(completed) {
    active = false;
    document.getElementById('tut-backdrop').style.display = 'none';
    document.getElementById('tut-backdrop').classList.remove('active');
    document.getElementById('tut-tooltip').style.display  = 'none';
    document.getElementById('tut-progress').style.display = 'none';
    document.getElementById('tut-spotlight-ring').style.opacity = '0';
    var hr = document.getElementById('tut-hole-rect'); if (hr) { hr.setAttribute('width','0'); hr.setAttribute('height','0'); }
    document.getElementById('tut-fab').classList.remove('hidden');
    try { localStorage.setItem('tut_seen', '1'); } catch(ex) {}
    if (completed === true) showToast();
  }

  function showToast() {
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:32px;right:32px;z-index:99999;background:linear-gradient(135deg,#0d1628,#080f1e);border:1px solid rgba(240,180,41,.4);border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:12px;font-family:Rajdhani,sans-serif;font-size:14px;font-weight:600;color:#dde8ff;box-shadow:0 0 30px rgba(240,180,41,.2),0 10px 40px rgba(0,0,0,.4);max-width:280px';
    t.innerHTML = '<span style="font-size:22px">&#x1F3C6;</span><span>Tutorial conclu&#237;do! Boas compras!</span>';
    document.body.appendChild(t);
    setTimeout(function() {
      t.style.transition = 'opacity .4s,transform .4s';
      t.style.opacity = '0';
      t.style.transform = 'translateY(10px)';
      setTimeout(function() { t.remove(); }, 400);
    }, 3000);
  }

  function maybeAutoStart() {
    // Tutorial agora é iniciado via closeWelcomeAndAskTutorial() no botão do modal de boas-vindas
    // Não faz nada automaticamente — evita conflito com o inline onclick
  }

  // Expõe startTutorial globalmente para o modal de confirmação
  window.startTutorial = startTutorial;

  injectCSS();
  createDOM();
  maybeAutoStart();

})();

// ===================== WELCOME → TUTORIAL PROMPT =====================
function closeWelcomeAndAskTutorial() {
  document.getElementById('welcome-overlay').style.display = 'none';
  // Se já viu antes (pulou ou concluiu), não pergunta de novo
  var seen = false;
  try { seen = !!localStorage.getItem('tut_seen'); } catch(e) {}
  if (seen) return;
  // Mostra o modal de confirmação do tutorial
  var askOverlay = document.getElementById('tutorial-ask-overlay');
  if (askOverlay) {
    askOverlay.style.display = 'flex';
  }
}
