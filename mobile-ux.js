/**
 * mobile-ux.js — PokeAlliance Shop · Mobile UX Patch
 * Melhorias de toque, scroll lock, e performance mobile
 */
(function() {
  'use strict';

  var isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;

  /* ══════════════════════════════════════════════════════════
     SCROLL LOCK — evita scroll do body quando modal está aberto
  ══════════════════════════════════════════════════════════ */
  var _scrollY = 0;

  function lockScroll() {
    _scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = -_scrollY + 'px';
    document.body.style.width = '100%';
    document.body.classList.add('modal-open');
  }

  function unlockScroll() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.classList.remove('modal-open');
    window.scrollTo(0, _scrollY);
  }

  /* ══════════════════════════════════════════════════════════
     PATCH: openCart / closeCart — scroll lock no mobile
  ══════════════════════════════════════════════════════════ */
  function patchCartFunctions() {
    if (typeof openCart === 'function') {
      var _origOpen = window.openCart;
      window.openCart = function() {
        _origOpen.apply(this, arguments);
        if (isMobile) lockScroll();
      };
    }

    if (typeof closeCart === 'function') {
      var _origClose = window.closeCart;
      window.closeCart = function() {
        _origClose.apply(this, arguments);
        if (isMobile) unlockScroll();
      };
    }
  }

  /* ══════════════════════════════════════════════════════════
     PATCH: pkg-overlay — scroll lock
  ══════════════════════════════════════════════════════════ */
  function patchPkgModal() {
    if (typeof openPkgModal === 'function') {
      var _orig = window.openPkgModal;
      window.openPkgModal = function() {
        _orig.apply(this, arguments);
        if (isMobile) lockScroll();
      };
    }

    if (typeof closePkgModal === 'function') {
      var _origClose = window.closePkgModal;
      window.closePkgModal = function() {
        _origClose.apply(this, arguments);
        if (isMobile) unlockScroll();
      };
    }
  }

  /* ══════════════════════════════════════════════════════════
     SWIPE TO DISMISS — carrinho e modais
  ══════════════════════════════════════════════════════════ */
  function addSwipeToDismiss(el, onDismiss) {
    if (!el || !isMobile) return;
    var startY = 0;
    var startX = 0;
    var isDragging = false;

    el.addEventListener('touchstart', function(e) {
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      isDragging = true;
    }, { passive: true });

    el.addEventListener('touchmove', function(e) {
      if (!isDragging) return;
      var dy = e.touches[0].clientY - startY;
      var dx = Math.abs(e.touches[0].clientX - startX);
      // Só swipe vertical, não horizontal
      if (dy > 0 && dy > dx) {
        el.style.transform = 'translateY(' + Math.min(dy * 0.6, 120) + 'px)';
        el.style.transition = 'none';
      }
    }, { passive: true });

    el.addEventListener('touchend', function(e) {
      if (!isDragging) return;
      isDragging = false;
      var endY = e.changedTouches[0].clientY;
      var dy = endY - startY;

      if (dy > 80) {
        el.style.transition = 'transform 0.3s ease';
        el.style.transform = 'translateY(100%)';
        setTimeout(function() {
          el.style.transform = '';
          el.style.transition = '';
          onDismiss();
        }, 280);
      } else {
        el.style.transition = 'transform 0.25s cubic-bezier(0.22,0.68,0,1.2)';
        el.style.transform = '';
        setTimeout(function() { el.style.transition = ''; }, 260);
      }
    }, { passive: true });
  }

  /* ══════════════════════════════════════════════════════════
     HAPTIC FEEDBACK — vibração sutil em ações importantes
  ══════════════════════════════════════════════════════════ */
  function haptic(type) {
    if (!isMobile || !navigator.vibrate) return;
    if (type === 'light') navigator.vibrate(10);
    else if (type === 'medium') navigator.vibrate(25);
    else if (type === 'add') navigator.vibrate([10, 30, 10]);
  }

  window.haptic = haptic;

  /* ══════════════════════════════════════════════════════════
     TABS NAV — scroll tab ativa para o centro
  ══════════════════════════════════════════════════════════ */
  function scrollTabIntoView(btn) {
    if (!btn || !isMobile) return;
    var nav = btn.closest('.tabs-nav');
    if (!nav) return;
    var btnRect = btn.getBoundingClientRect();
    var navRect = nav.getBoundingClientRect();
    var target = nav.scrollLeft + (btnRect.left - navRect.left) - (navRect.width - btnRect.width) / 2;
    nav.scrollTo({ left: target, behavior: 'smooth' });
  }

  /* ══════════════════════════════════════════════════════════
     WIKI SUBTABS — scroll para centro
  ══════════════════════════════════════════════════════════ */
  function scrollSubtabIntoView(btn) {
    if (!btn || !isMobile) return;
    var nav = btn.closest('.wiki-subtabs');
    if (!nav) return;
    var btnRect = btn.getBoundingClientRect();
    var navRect = nav.getBoundingClientRect();
    var target = nav.scrollLeft + (btnRect.left - navRect.left) - (navRect.width - btnRect.width) / 2;
    nav.scrollTo({ left: target, behavior: 'smooth' });
  }

  /* ══════════════════════════════════════════════════════════
     PATCH: switchTab — scroll tab ao centro + haptic
  ══════════════════════════════════════════════════════════ */
  function patchSwitchTab() {
    if (typeof switchTab !== 'function') {
      setTimeout(patchSwitchTab, 100);
      return;
    }
    var _orig = window.switchTab;
    window.switchTab = function(tab, btn) {
      _orig(tab, btn);
      scrollTabIntoView(btn);
      haptic('light');
    };
  }

  /* ══════════════════════════════════════════════════════════
     PACKAGE SIDEBAR — scroll item selecionado ao centro
  ══════════════════════════════════════════════════════════ */
  function scrollPkgItemIntoView(item) {
    if (!item || !isMobile) return;
    var list = item.closest('.pkg-sidebar-list');
    if (!list) return;
    var itemRect = item.getBoundingClientRect();
    var listRect = list.getBoundingClientRect();
    var target = list.scrollLeft + (itemRect.left - listRect.left) - (listRect.width - itemRect.width) / 2;
    list.scrollTo({ left: target, behavior: 'smooth' });
  }

  /* Observa cliques na sidebar de pacotes */
  function patchPkgSidebar() {
    document.addEventListener('click', function(e) {
      var item = e.target.closest('.pkg-sidebar-item');
      if (item) {
        scrollPkgItemIntoView(item);
        haptic('light');
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     ADD TO CART — haptic feedback
  ══════════════════════════════════════════════════════════ */
  function patchAddButtons() {
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.add-btn, .pack-btn, .pkg-modal-add-btn');
      if (btn) haptic('add');
    });
  }

  /* ══════════════════════════════════════════════════════════
     DOUBLE TAP TO PREVENT ZOOM — em áreas não-texto
  ══════════════════════════════════════════════════════════ */
  function preventDoubleTapZoom() {
    if (!isMobile) return;
    var lastTap = 0;
    document.addEventListener('touchend', function(e) {
      var t = e.target;
      // Permite zoom em imagens e textos
      if (t.tagName === 'IMG' || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return;
      var now = Date.now();
      if (now - lastTap < 300) {
        e.preventDefault();
      }
      lastTap = now;
    }, { passive: false });
  }

  /* ══════════════════════════════════════════════════════════
     RESIZE — atualiza isMobile
  ══════════════════════════════════════════════════════════ */
  window.addEventListener('resize', function() {
    isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
  }, { passive: true });

  /* ══════════════════════════════════════════════════════════
     INICIALIZAÇÃO
  ══════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function() {
    // Patch funções depois que app.js carregou
    setTimeout(function() {
      patchCartFunctions();
      patchPkgModal();
      patchSwitchTab();
    }, 50);

    patchPkgSidebar();
    patchAddButtons();

    if (isMobile) {
      preventDoubleTapZoom();

      // Swipe to close no cart panel
      var cartPanel = document.querySelector('.cart-panel');
      if (cartPanel && typeof closeCart === 'function') {
        addSwipeToDismiss(cartPanel, closeCart);
      }

      // Swipe to close no pkg modal
      var pkgModal = document.getElementById('pkg-modal');
      if (pkgModal && typeof closePkgModal === 'function') {
        addSwipeToDismiss(pkgModal, closePkgModal);
      }

      // Wiki subtabs — scroll ao centro quando clicados
      document.addEventListener('click', function(e) {
        var btn = e.target.closest('.wiki-subtab-btn');
        if (btn) {
          scrollSubtabIntoView(btn);
          haptic('light');
        }
      });
    }
  });

})();
