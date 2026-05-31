-- =========================================================
-- 0006 — Fix de segurança: views SECURITY DEFINER
-- Aplicado em produção via Supabase migration
-- "fix_security_definer_views_use_invoker" em 2026-05-30.
-- Mantido aqui para versionamento/paridade no repositório.
-- =========================================================
--
-- PROBLEMA (advisor: 10x ERROR security_definer_view):
-- 10 views eram SECURITY DEFINER, ou seja, executavam com a permissão
-- do dono (postgres) e IGNORAVAM o RLS de quem consultava. O papel `anon`
-- tinha SELECT em todas. Hoje retornam pouco porque `orders` está vazia,
-- mas no momento em que entrar faturamento, qualquer visitante anônimo
-- poderia ler financeiro/pedidos. Bomba-relógio.
--
-- FIX: security_invoker = on → a view passa a respeitar o RLS das tabelas-base.
--   - Financeiro/pedidos (orders.RLS = is_admin()) viram admin-only.
--   - Catálogo (RLS read_public: is_active=true) continua público.
-- O frontend NÃO usa estas views (lê as tabelas-base direto com is_active),
-- então a loja não é afetada.
-- =========================================================

alter view public.admin_orders_with_balls    set (security_invoker = on);
alter view public.v_financial_summary_daily   set (security_invoker = on);
alter view public.v_financial_monthly         set (security_invoker = on);
alter view public.v_revenue_by_category       set (security_invoker = on);
alter view public.v_top_items                 set (security_invoker = on);
alter view public.v_active_queue              set (security_invoker = on);
alter view public.v_queue_public              set (security_invoker = on);
alter view public.v_catalog_items             set (security_invoker = on);
alter view public.v_catalog_pokemons          set (security_invoker = on);
alter view public.v_catalog_packages          set (security_invoker = on);

-- Defesa extra nas views puramente admin/financeiras: anon não lê nem por engano.
revoke select on public.admin_orders_with_balls   from anon;
revoke select on public.v_financial_summary_daily from anon;
revoke select on public.v_financial_monthly       from anon;
revoke select on public.v_revenue_by_category     from anon;
revoke select on public.v_top_items               from anon;

-- (migration separada) hardening do trigger de updated_at:
-- alter function public.set_updated_at() set search_path = '';
