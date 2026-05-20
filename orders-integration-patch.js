/* ============================================================
   orders-integration-patch.js
   PokeAlliance Shop — Sistema de Rastreamento de Pedidos
   ============================================================

   Intercepta sendToWhatsApp() — ponto único de saída de TODOS
   os pedidos (itens, pacotes e captura) — e registra no
   OrdersStorage antes de enviar ao Supabase.

   Carregue APÓS orders-storage.js, orders-ui.js e app.js.
   ============================================================ */

(function () {
  'use strict';

  // ── Aguarda app.js definir sendToWhatsApp ──────────────────
  // O patch roda após DOMContentLoaded; sendToWhatsApp já existe.

  const _origSendToWhatsApp = window.sendToWhatsApp;

  window.sendToWhatsApp = async function () {
    // ── 1. Dados da sessão ────────────────────────────────────
    const user = (typeof Session !== 'undefined' && Session.isLoggedIn())
      ? Session.getCurrentUser()
      : null;
    const nick = (user && (user.nickname || user.email)) || 'Anônimo';

    // ── 2. Normaliza itens do carrinho ────────────────────────
    // cart  = { [itemIndex]: quantidade }
    // items = array global de produtos (inclui capturas dinâmicas)
    let orderItems = [];
    try {
      if (typeof cart !== 'undefined' && typeof items !== 'undefined') {
        orderItems = Object.keys(cart)
          .filter(k => cart[k] > 0)
          .map(k => {
            const src  = items[k] || {};
            const qty  = cart[k];
            const name = src.name || ('Item ' + k);
            // Captura: nome descritivo já vem montado em confirmCaptura()
            // Ex: "Charizard (Alliance Ball)"
            return {
              name:     name,
              qtdTotal: qty,
            };
          });
      }
    } catch (e) {
      console.warn('[CAPTURA] Falha ao ler carrinho:', e);
    }

    // ── 3. Registra no OrdersStorage ─────────────────────────
    if (orderItems.length > 0 && typeof OrdersStorage !== 'undefined') {
      const payload = {
        userId:   user ? (user.id || null) : null,
        nickname: nick,
        items:    orderItems,
      };

      console.log('[CAPTURA] Pedido enviado');
      console.log('[CAPTURA] Payload:', payload);

      const result = OrdersStorage.createOrder(payload);

      if (result && result.success) {
        console.log('[CAPTURA] Pedido registrado:', result.order);

        // Atualiza aba Pedidos
        if (typeof OrdersUI !== 'undefined') {
          setTimeout(() => OrdersUI.refresh(), 600);
        }

        // Notificação visual
        if (typeof OrdersNotifications !== 'undefined') {
          const num = (typeof OrdersProgress !== 'undefined')
            ? OrdersProgress.formatOrderNumber(result.order.orderNumber)
            : '#' + result.order.orderNumber;
          OrdersNotifications.show(
            `Pedido ${num} criado! Aguarde confirmação.`,
            'pendente',
            6000
          );
        }
      } else {
        console.warn('[CAPTURA] OrdersStorage.createOrder falhou:', result);
      }
    }

    // ── 4. Chama o fluxo original (Supabase + limpa carrinho) ─
    if (typeof _origSendToWhatsApp === 'function') {
      return _origSendToWhatsApp();
    }
  };

  // Mantém aliases existentes apontando para o mesmo hook
  window.sendPedido   = window.sendToWhatsApp;
  window.submitPedido = window.sendToWhatsApp;
  window.sendToDiscord = window.sendToWhatsApp;

  console.log('[orders-patch] Hook sendToWhatsApp instalado (cobre itens + pacotes + captura).');
})();