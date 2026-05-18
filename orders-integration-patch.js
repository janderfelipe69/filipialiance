/* ============================================================
   INSTRUÇÕES DE INTEGRAÇÃO — orders-integration-patch.js
   PokeAlliance Shop — Sistema de Rastreamento de Pedidos
   ============================================================

   COMO INTEGRAR NO index.html:
   Adicione estas tags <script> APÓS o bloco do sistema de autenticação
   (após login.js), e ANTES dos outros scripts de wiki/mobile:

   <!-- ── Sistema de Pedidos v2 ────────────────────────────── -->
   <!-- Ordem importa: storage → progress → notifications → admin → ui -->
   <script src="orders-storage.js"></script>
   <script src="orders-progress.js"></script>
   <script src="orders-notifications.js"></script>
   <script src="orders-admin.js"></script>
   <script src="orders-ui.js"></script>

   Esses arquivos devem ser colocados na MESMA pasta que os outros .js do site.

   ============================================================
   SUBSTITUIÇÃO DA FUNÇÃO submitPedido / sendPedido:
   ============================================================

   A função abaixo substitui/complementa a lógica de envio do carrinho
   para também registrar o pedido no localStorage (sistema de tracking).

   Cole o bloco abaixo no index.html, APÓS a carga dos scripts de pedidos,
   OU adicione-o a um arquivo pedidos.js existente.
*/

// ── Patch: Integração carrinho → sistema de pedidos v2 ──────────────────────
// Esta função é chamada quando o usuário confirma o pedido.
// Ela registra o pedido no OrdersStorage antes de enviar pelo canal existente.

(function() {
  // Guarda a função original se existir
  const _origSendPedido = window.sendPedido || null;
  const _origSubmitPedido = window.submitPedido || null;

  /**
   * Hook que intercepta o envio do pedido e registra no sistema de tracking.
   * Compatível com sendToWhatsApp() existente.
   */
  window.submitPedido = async function() {
    const user = typeof Session !== 'undefined' ? Session.getCurrentUser() : null;
    const nickInput = document.getElementById('cart-nick-input');
    const nick = (nickInput && nickInput.value.trim()) || (user && user.nickname) || 'Anônimo';

    // Coleta itens do carrinho
    // Compatível com múltiplos formatos de carrinho (array de strings, objetos)
    let cartItems = [];
    try {
      // Tenta obter do carrinho atual (variável global ou localStorage)
      if (typeof cart !== 'undefined' && Array.isArray(cart)) {
        cartItems = cart.map(item => ({
          name: item.name || item.item || String(item),
          qtdTotal: parseInt(item.quantity || item.qty || item.qtd || 1, 10),
        }));
      } else {
        // Tenta ler do DOM do carrinho
        document.querySelectorAll('.cart-item, .pedido-item').forEach(el => {
          const name = el.querySelector('.cart-item-name, .item-name')?.textContent?.trim() || 'Item';
          const qty = parseInt(el.querySelector('.cart-item-qty, .item-qty')?.textContent?.trim() || '1', 10);
          cartItems.push({ name, qtdTotal: qty });
        });
      }
    } catch(e) {
      console.warn('[orders-patch] Falha ao ler carrinho:', e);
    }

    // Registra o pedido no sistema de tracking
    if (cartItems.length > 0 && typeof OrdersStorage !== 'undefined') {
      const result = OrdersStorage.createOrder({
        userId: user ? user.id : null,
        nickname: nick,
        items: cartItems,
      });

      if (result.success) {
        console.log('[orders-patch] Pedido registrado:', result.order.id);
        // Atualiza a UI de pedidos
        if (typeof OrdersUI !== 'undefined') {
          setTimeout(() => OrdersUI.refresh(), 500);
        }
        // Notificação de confirmação
        if (typeof OrdersNotifications !== 'undefined') {
          OrdersNotifications.show(
            `Pedido ${typeof OrdersProgress !== 'undefined'
              ? OrdersProgress.formatOrderNumber(result.order.orderNumber)
              : '#' + result.order.orderNumber} criado! Aguarde confirmação.`,
            'pendente',
            6000
          );
        }
      }
    }

    // Chama a função original de envio (WhatsApp, etc.)
    if (typeof sendToWhatsApp === 'function') {
      return sendToWhatsApp();
    } else if (_origSubmitPedido) {
      return _origSubmitPedido();
    } else if (_origSendPedido) {
      return _origSendPedido();
    }
  };

  // Alias para compatibilidade
  window.sendPedido = window.submitPedido;

  console.log('[orders-patch] Hook de pedidos instalado.');
})();
