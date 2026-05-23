// ============================================================
// DIAGNÓSTICO: cole este script no Console do browser
// Irá mostrar exatamente onde os pedidos estão sumindo
// ============================================================
(async function diagnostico() {
  console.group('🔍 DIAGNÓSTICO DE PEDIDOS');

  // 1. Sessão
  const user = Session.getCurrentUser();
  const jwt  = Session.getAccessToken();
  console.log('1. Usuário:', user ? `${user.nickname} (role=${user.role}, id=${user.id})` : 'NULL');
  console.log('2. JWT:', jwt ? jwt.slice(0, 30) + '…' : 'NULL ← PROBLEMA: sem JWT');
  console.log('3. SESSION_READY:', window.SESSION_READY);

  if (!jwt) { console.error('❌ Sem JWT — RLS bloqueará tudo'); console.groupEnd(); return; }

  // 2. Fetch direto de pedidos com JWT do usuário
  const SB_URL = window.SUPABASE_URL;
  const SB_KEY = window.SUPABASE_KEY;
  console.log('4. SUPABASE_URL:', SB_URL ? '✅' : '❌ NULL');

  try {
    const res = await fetch(
      SB_URL + '/rest/v1/pedidos?order=created_at.desc&limit=10&select=id,status_v3,user_id,nick_jogo',
      { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + jwt } }
    );
    const data = await res.json();
    console.log('5. RLS pedidos → HTTP', res.status, '| registros:', Array.isArray(data) ? data.length : 'ERRO', data);
    if (Array.isArray(data) && data.length === 0) {
      console.warn('⚠️ RLS retornou [] — o JWT do cliente não tem acesso a nenhum pedido');
      console.warn('   Verifique a política RLS da tabela pedidos no Supabase Dashboard');
    }
  } catch(e) { console.error('5. Fetch falhou:', e.message); }

  // 3. Checa OrdersStorage
  const stored = OrdersStorage.getAllOrders();
  console.log('6. OrdersStorage:', stored.length, 'pedidos em cache');
  if (stored.length) {
    const statuses = [...new Set(stored.map(o => o.status_v3 || o.status))];
    console.log('   Status presentes:', statuses);
    const active = stored.filter(o => ['waiting_queue','in_progress'].includes(o.status_v3 || o.status));
    console.log('   Ativos (fila):', active.length);
  }

  // 4. Checa public.users
  try {
    const resU = await fetch(
      SB_URL + '/rest/v1/users?id=eq.' + user.id + '&select=id,role,nickname',
      { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + jwt } }
    );
    const dataU = await resU.json();
    console.log('7. public.users:', resU.status, dataU);
    if (Array.isArray(dataU) && dataU.length === 0) {
      console.error('❌ Usuário NÃO existe em public.users — trigger de signup não rodou');
      console.error('   SOLUÇÃO: inserir manualmente ou recriar trigger handle_new_user');
    }
  } catch(e) { console.error('7. users fetch falhou:', e.message); }

  // 5. Testa forçar pedidosCarregar
  console.log('8. Forçando pedidosCarregar()...');
  if (typeof pedidosCarregar === 'function') {
    await pedidosCarregar();
    const afterLoad = OrdersStorage.getAllOrders();
    console.log('   Após pedidosCarregar:', afterLoad.length, 'pedidos no storage');
  } else {
    console.error('   pedidosCarregar não está definido');
  }

  console.groupEnd();
})();
