-- ============================================================
--  enable_realtime_chat.sql
--  Habilita o Supabase Realtime para o chat de negociação do Marketplace.
--
--  Rode UMA VEZ no Supabase: SQL Editor → New query → cole → Run.
--
--  Diagnóstico: o WebSocket de realtime conseguia ENTRAR no canal de
--  trade_messages, mas o servidor respondia:
--    "Unable to subscribe to changes ... Please check Realtime is enabled
--     ... table: trade_messages"
--  Ou seja, as tabelas não estavam na publicação `supabase_realtime`.
-- ============================================================

-- 1) Adiciona trade_messages e trade_sessions à publicação de realtime
--    (idempotente — não dá erro se já estiverem habilitadas)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='trade_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.trade_messages';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='trade_sessions'
  ) then
    execute 'alter publication supabase_realtime add table public.trade_sessions';
  end if;
end $$;

-- 2) REPLICA IDENTITY FULL — garante que UPDATE/DELETE tragam o registro
--    completo no payload de realtime (necessário p/ status da negociação).
alter table public.trade_messages replica identity full;
alter table public.trade_sessions replica identity full;

-- 3) Verificação — deve listar trade_messages e trade_sessions
select tablename
from pg_publication_tables
where pubname='supabase_realtime' and schemaname='public'
order by tablename;
