/* ============================================================
   orders-integration-patch.js — v4
   PokeAlliance Shop — Sistema de Rastreamento de Pedidos
   ============================================================

   MUDANÇA v4 (CRÍTICA):
   O hook de pedidos de ITENS/PACOTES (sendToWhatsApp) já salva
   diretamente no Supabase via _salvarPedidoSupabase() em app.js.
   Portanto este arquivo NÃO duplica mais no OrdersStorage.

   O que este arquivo faz agora:
   - Garante aliases de função (sendPedido, submitPedido, sendToDiscord)
   - Mantém compatibilidade com código legado que chama essas variantes
   - NÃO duplica pedido no localStorage

   FLUXO UNIFICADO (v4):
   CAPTURA  → confirmCaptura()  → Supabase (INSERT)  → pedidosCarregar() → cache
   ITENS    → sendToWhatsApp()  → Supabase (INSERT)  → pedidosCarregar() → cache
   PACOTES  → sendToWhatsApp()  → Supabase (INSERT)  → pedidosCarregar() → cache

   FONTE OFICIAL: Supabase (public.pedidos)
   CACHE OPCIONAL: localStorage via OrdersStorage (sincronizado por pedidosCarregar)

   Carregue APÓS orders-storage.js, orders-ui.js e app.js.
   ============================================================ */

(function () {
  'use strict';

  // ── Aliases de compatibilidade ────────────────────────────────────────────
  // sendToWhatsApp() já salva no Supabase via app.js.
  // Apenas garantimos que variantes de nome apontem para ela.
  window.sendPedido    = window.sendToWhatsApp;
  window.submitPedido  = window.sendToWhatsApp;
  window.sendToDiscord = window.sendToWhatsApp;

  // ── Hook de pós-envio: recarrega fila do banco após pedido enviado ────────
  // Sobrescreve sendToWhatsApp para garantir que pedidosCarregar() seja
  // chamado sempre depois de um pedido bem-sucedido, mantendo o cache atualizado.
  const _origSendToWhatsApp = window.sendToWhatsApp;

  window.sendToWhatsApp = async function () {
    await _origSendToWhatsApp();
    // Recarrega a lista do banco após envio (atualiza localStorage como cache)
    if (typeof pedidosCarregar === 'function') {
      setTimeout(() => pedidosCarregar(), 400);
    } else if (typeof OrdersUI !== 'undefined') {
      setTimeout(() => OrdersUI.refresh(), 400);
    }
  };

  // Mantém aliases apontando para a versão pós-hook
  window.sendPedido    = window.sendToWhatsApp;
  window.submitPedido  = window.sendToWhatsApp;
  window.sendToDiscord = window.sendToWhatsApp;

  console.log('[orders-patch v4] Inicializado. Fonte oficial: Supabase. localStorage = cache.');
})();
