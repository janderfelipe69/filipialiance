-- ============================================================
--  feature_flags_setup.sql
--  Controle de Abas (Feature Flags) — estado GLOBAL no servidor
--
--  Rode este script UMA VEZ no Supabase:
--    Dashboard → SQL Editor → New query → cole tudo → Run
--
--  Depois disso, quando o admin liga/desliga uma aba no painel ⚙️,
--  o estado fica salvo aqui e passa a valer para TODOS os visitantes
--  (inclusive anônimos) no próximo carregamento da página.
-- ============================================================

-- 1) Tabela de configurações globais (chave/valor)
create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2) Linha das feature flags — estado inicial: tudo liberado
insert into public.app_settings (key, value)
values ('feature_flags', '{"itens":true,"pacotes":true,"captura":true}'::jsonb)
on conflict (key) do nothing;

-- 3) Row Level Security
alter table public.app_settings enable row level security;

-- 3a) Leitura liberada para todos (anon + logados)
drop policy if exists "app_settings_read_all" on public.app_settings;
create policy "app_settings_read_all"
  on public.app_settings
  for select
  to anon, authenticated
  using (true);

-- 3b) Escrita (insert/update/delete) APENAS para admin
--     Ajuste 'public.users' / coluna 'role' se o seu schema for diferente.
drop policy if exists "app_settings_admin_write" on public.app_settings;
create policy "app_settings_admin_write"
  on public.app_settings
  for all
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- 4) (opcional) manter updated_at automático
create or replace function public.app_settings_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_app_settings_touch on public.app_settings;
create trigger trg_app_settings_touch
  before update on public.app_settings
  for each row execute function public.app_settings_touch();
