/* ============================================================
   orders-integration-patch.js
   PokeAlliance Shop — Sistema de Rastreamento de Pedidos
   ============================================================

   Hook para pedidos de ITENS e PACOTES (via sendToWhatsApp).
   Pedidos de CAPTURA agora são registrados diretamente em
   confirmCaptura() — não passam por este hook.

   Carregue APÓS orders-storage.js, orders-ui.js e app.js.
   ============================================================ */

(function () {
  'use strict';

  const _origSendToWhatsApp = window.sendToWhatsApp;

  window.sendToWhatsApp = async function () {
    // ── Sessão ────────────────────────────────────────────────
    const user = (typeof Session !== 'undefined' && Session.isLoggedIn())
      ? Session.getCurrentUser() : null;
    const nick = (user && (user.nickname || user.email)) || 'Anônimo';

    // ── Normaliza itens do carrinho (itens + pacotes) ─────────
    let orderItems = [];
    try {
      if (typeof cart !== 'undefined' && typeof items !== 'undefined') {
        orderItems = Object.keys(cart)
          .filter(k => cart[k] > 0)
          .map(k => ({
            name:     (items[k] && items[k].name) || ('Item ' + k),
            qtdTotal: cart[k],
          }));
      }
    } catch (e) {
      console.warn('[orders-patch] Falha ao ler carrinho:', e);
    }

    // ── Registra no OrdersStorage ─────────────────────────────
    if (orderItems.length > 0 && typeof OrdersStorage !== 'undefined') {
      const result = OrdersStorage.createOrder({
        userId:   user ? (user.id || null) : null,
        nickname: nick,
        items:    orderItems,
      });
      if (result && result.success) {
        console.log('[orders-patch] Pedido registrado:', result.order);
        if (typeof OrdersUI !== 'undefined') setTimeout(() => OrdersUI.refresh(), 500);
        if (typeof OrdersNotifications !== 'undefined') {
          const num = (typeof OrdersProgress !== 'undefined')
            ? OrdersProgress.formatOrderNumber(result.order.orderNumber)
            : '#' + result.order.orderNumber;
          OrdersNotifications.show(`Pedido ${num} criado! Aguarde confirmação.`, 'pendente', 6000);
        }
      }
    }

    // ── Fluxo original (Supabase + limpa carrinho) ────────────
    if (typeof _origSendToWhatsApp === 'function') {
      return _origSendToWhatsApp();
    }
  };

  window.sendPedido    = window.sendToWhatsApp;
  window.submitPedido  = window.sendToWhatsApp;
  window.sendToDiscord = window.sendToWhatsApp;

  console.log('[orders-patch] Hook instalado (itens + pacotes).');
})();