// ============================================================
// event-handlers.js — Registro centralizado de event listeners
// PokeAlliance Shop
//
// Substitui os ~86 atributos onclick/oninput/onchange inline
// do index.html. Todos os handlers registrados no DOMContentLoaded.
// ============================================================

document.addEventListener('DOMContentLoaded', function() {

  // ── Auth header (delegação: session.js substitui o innerHTML) ──────────
  var authSlot = document.getElementById('auth-header-slot');
  if (authSlot) {
    authSlot.addEventListener('click', function(e) {
      if (e.target.closest('.auth-login-btn') && typeof AuthModal !== 'undefined') {
        AuthModal.open('login');
      }
    });
  }

  // ── Cart trigger ────────────────────────────────────────────────────────
  var cartTrigger = document.querySelector('.cart-trigger');
  if (cartTrigger) cartTrigger.addEventListener('click', function() { openCart(); });

  // ── Tabs principais (delegação por data-tab) ────────────────────────────
  document.querySelectorAll('.tab-btn[data-tab]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var tab = btn.dataset.tab;
      switchTab(tab, btn);
    });
  });

  // ── Wiki subtabs (delegação por data-wiki-tab) ──────────────────────────
  document.querySelectorAll('.wiki-subtab-btn[data-wiki-tab]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      switchWikiTab(btn.dataset.wikiTab, btn);
    });
  });

  // ── Pacotes overlay ─────────────────────────────────────────────────────
  var pkgOverlay = document.getElementById('pkg-overlay');
  if (pkgOverlay) pkgOverlay.addEventListener('click', function(e) { handlePkgOverlayClick(e); });

  var pkgCloseBtn = document.querySelector('#pkg-overlay .close-btn');
  if (pkgCloseBtn) pkgCloseBtn.addEventListener('click', function() { closePkgModal(); });

  var pkgAddBtn = document.querySelector('.pkg-modal-add-btn');
  if (pkgAddBtn) pkgAddBtn.addEventListener('click', function() { addPackageToCart(); });

  // ── Captura overlay ─────────────────────────────────────────────────────
  var capturaOverlay = document.getElementById('captura-overlay');
  if (capturaOverlay) capturaOverlay.addEventListener('click', function(e) { handleCapturaOverlayClick(e); });

  var capturaCloseBtn = document.querySelector('#captura-modal .close-btn');
  if (capturaCloseBtn) capturaCloseBtn.addEventListener('click', function() { closeCapturaModal(); });

  // ── Balls overlay (delegação no modal inteiro) ──────────────────────────
  var ballsOverlay = document.getElementById('balls-overlay');
  if (ballsOverlay) ballsOverlay.addEventListener('click', function(e) { BallsSelector.handleOverlayClick(e); });

  var ballsModal = document.getElementById('balls-modal');
  if (ballsModal) {
    ballsModal.addEventListener('click', function(e) {
      if (e.target.closest('#balls-confirm-btn'))    { BallsSelector.confirm(); return; }
      if (e.target.closest('#balls-header-close'))   { BallsSelector.close();  return; }
      if (e.target.closest('#balls-footer-cancel'))  { BallsSelector.close();  return; }
    });
  }

  // ── Captura search + clear ───────────────────────────────────────────────
  var capturaSearch = document.getElementById('captura-search');
  var _captureTimer;
  if (capturaSearch) {
    capturaSearch.addEventListener('input', function() {
      clearTimeout(_captureTimer);
      _captureTimer = setTimeout(renderCaptura, 150);
      var clr = this.parentElement.querySelector('.captura-search-clear');
      if (clr) clr.classList.toggle('visible', this.value.length > 0);
    });
  }

  var capturaSearchClear = document.querySelector('.captura-search-clear');
  if (capturaSearchClear) {
    capturaSearchClear.addEventListener('click', function() {
      var inp = document.getElementById('captura-search');
      if (!inp) return;
      inp.value = '';
      this.classList.remove('visible');
      renderCaptura();
      inp.focus();
    });
  }

  var capturaFilter = document.getElementById('captura-filter');
  if (capturaFilter) capturaFilter.addEventListener('change', function() { renderCaptura(); });

  // ── Type dropdown ────────────────────────────────────────────────────────
  var typeDropdownBtn = document.getElementById('type-dropdown-btn');
  if (typeDropdownBtn) typeDropdownBtn.addEventListener('click', function(e) { toggleTypeDropdown(e); });

  var typeDropdownMenu = document.getElementById('type-dropdown-menu');
  if (typeDropdownMenu) {
    typeDropdownMenu.addEventListener('click', function(e) {
      var item = e.target.closest('.type-dropdown-item[data-type]');
      if (item) selectTypeFilter(item.dataset.type, item);
    });
  }

  // ── Wiki searches (debounced) ────────────────────────────────────────────
  function _debounced(inputId, renderFn) {
    var el = document.getElementById(inputId);
    var timer;
    if (el) el.addEventListener('input', function() {
      clearTimeout(timer);
      timer = setTimeout(renderFn, 150);
    });
  }
  _debounced('wiki-search',    renderWiki);
  _debounced('respawn-search', renderRespawn);
  _debounced('quests-search',  renderQuests);
  _debounced('rockets-search', renderRockets);
  _debounced('officers-search',renderOfficers);
  _debounced('hazard-search',  renderHazard);

  // ── Respawn view toggle ──────────────────────────────────────────────────
  var rspBtnGrid = document.getElementById('rsp-btn-grid');
  if (rspBtnGrid) rspBtnGrid.addEventListener('click', function() { setRespawnView('grid'); });

  var rspBtnList = document.getElementById('rsp-btn-list');
  if (rspBtnList) rspBtnList.addEventListener('click', function() { setRespawnView('list'); });

  // ── NPC subcats (delegação por data-subcat) ──────────────────────────────
  var npcSubcats = document.getElementById('npc-subcats');
  if (npcSubcats) {
    npcSubcats.addEventListener('click', function(e) {
      var btn = e.target.closest('.npc-subcat-btn[data-subcat]');
      if (btn) switchNpcSubcat(btn.dataset.subcat, btn);
    });
  }

  // ── Pedidos ──────────────────────────────────────────────────────────────
  var pedidosSearch = document.getElementById('pedidos-search');
  if (pedidosSearch) pedidosSearch.addEventListener('input', function() { pedidosFiltrar(); });

  var pedidosStatusFilter = document.getElementById('pedidos-status-filter');
  if (pedidosStatusFilter) pedidosStatusFilter.addEventListener('change', function() { pedidosFiltrar(); });

  var pedidosRefreshBtn = document.querySelector('.pedidos-refresh-btn');
  if (pedidosRefreshBtn) pedidosRefreshBtn.addEventListener('click', function() { pedidosCarregar(); });

  var pedidosErroRetry = document.querySelector('#pedidos-erro button');
  if (pedidosErroRetry) pedidosErroRetry.addEventListener('click', function() { pedidosCarregar(); });

  // ── Cart overlay + payment ───────────────────────────────────────────────
  var cartOverlay = document.getElementById('cart-overlay');
  if (cartOverlay) cartOverlay.addEventListener('click', function(e) { handleOverlayClick(e); });

  var cartCloseBtn = document.querySelector('#cart-overlay .close-btn');
  if (cartCloseBtn) cartCloseBtn.addEventListener('click', function() { closeCart(); });

  document.querySelectorAll('.pay-mode-btn[data-mode]').forEach(function(btn) {
    btn.addEventListener('click', function() { setPayMode(btn.dataset.mode); });
  });

  var mixKkInput = document.getElementById('mix-kk-input');
  if (mixKkInput) mixKkInput.addEventListener('input', function() { onMixKkChange(this.value); });

  var mixBrlInput = document.getElementById('mix-brl-input');
  if (mixBrlInput) mixBrlInput.addEventListener('input', function() { onMixBrlChange(this.value); });

  var sendOrderBtn = document.getElementById('send-order-btn');
  if (sendOrderBtn) sendOrderBtn.addEventListener('click', function() { enviarPedido(); });

  var clearCartBtn = document.querySelector('.clear-btn');
  if (clearCartBtn) clearCartBtn.addEventListener('click', function() { clearCart(); });

  // ── Wiki popup close ─────────────────────────────────────────────────────
  var wikiPopupClose = document.getElementById('wiki-popup-close');
  if (wikiPopupClose) wikiPopupClose.addEventListener('click', function() { closeWikiPopup(); });

  // ── Marketplace ──────────────────────────────────────────────────────────
  var mkBtnCreate = document.querySelector('.mk-btn--primary');
  if (mkBtnCreate) mkBtnCreate.addEventListener('click', function() {
    if (typeof MarketplaceCreate !== 'undefined') MarketplaceCreate.open();
  });

  document.querySelectorAll('.mk-filter-chip[data-filter]').forEach(function(btn) {
    btn.addEventListener('click', function() { _mkFilter(btn, btn.dataset.filter); });
  });

  var mkSearch = document.getElementById('mk-search');
  if (mkSearch) mkSearch.addEventListener('input', function() { _mkSearch(this.value); });

  // ── Tecla Escape: fecha qualquer modal aberto ─────────────────────────
  // (antecipando a Fase 4 — suporte consistente a Escape key)
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    if (document.querySelector('.cart-overlay.open'))                    closeCart();
    else if (document.querySelector('.captura-overlay.open'))            closeCapturaModal();
    else if (document.querySelector('.pkg-overlay.open'))                closePkgModal();
    else if (document.getElementById('balls-overlay') &&
             document.getElementById('balls-overlay').style.display !== 'none') {
      if (typeof BallsSelector !== 'undefined') BallsSelector.close();
    }
  });

});
