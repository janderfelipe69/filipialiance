-- ============================================================
-- Mercadão Aliance — migrações aplicadas no Supabase (registro)
-- Já aplicadas em produção via MCP; este arquivo é o histórico versionado.
-- Ordem de aplicação preservada.
-- ============================================================

-- 1) Separação por servidor (Moon/Sun) nas postagens + métricas de visita ----
alter table public.marketplace_listings add column if not exists server text not null default 'Moon';
alter table public.wtb_listings        add column if not exists server text not null default 'Moon';
do $$
begin
  if not exists (select 1 from pg_constraint where conname='marketplace_listings_server_chk') then
    alter table public.marketplace_listings add constraint marketplace_listings_server_chk check (server in ('Moon','Sun'));
  end if;
  if not exists (select 1 from pg_constraint where conname='wtb_listings_server_chk') then
    alter table public.wtb_listings add constraint wtb_listings_server_chk check (server in ('Moon','Sun'));
  end if;
end $$;
create index if not exists idx_marketplace_listings_server on public.marketplace_listings(server, status);
create index if not exists idx_wtb_listings_server on public.wtb_listings(server, status);

create table if not exists public.site_visits (
  day date not null, server text not null default 'Moon', visits integer not null default 0,
  primary key (day, server)
);
alter table public.site_visits enable row level security;

create or replace function public.track_visit(p_server text default 'Moon')
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_server not in ('Moon','Sun') then p_server := 'Moon'; end if;
  insert into public.site_visits (day, server, visits) values (current_date, p_server, 1)
  on conflict (day, server) do update set visits = public.site_visits.visits + 1;
end $$;
grant execute on function public.track_visit(text) to anon, authenticated;

create or replace function public.admin_visits_today()
returns table(server text, visits integer) language sql security definer set search_path = public as $$
  select s.server, s.visits from public.site_visits s
  where s.day = current_date and exists (select 1 from public.users u where u.id=auth.uid() and u.role='admin');
$$;
grant execute on function public.admin_visits_today() to authenticated;

-- 2) Presença online via heartbeat ------------------------------------------
create table if not exists public.online_pings (
  client_id text primary key, server text not null default 'Moon', last_seen timestamptz not null default now()
);
create index if not exists idx_online_pings_last_seen on public.online_pings(last_seen);
alter table public.online_pings enable row level security;

create or replace function public.heartbeat(p_client_id text, p_server text default 'Moon')
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if p_server not in ('Moon','Sun') then p_server := 'Moon'; end if;
  insert into public.online_pings (client_id, server, last_seen) values (p_client_id, p_server, now())
  on conflict (client_id) do update set last_seen = now(), server = excluded.server;
  delete from public.online_pings where last_seen < now() - interval '5 minutes';
  select count(*) into n from public.online_pings where last_seen > now() - interval '45 seconds';
  return n;
end $$;
grant execute on function public.heartbeat(text, text) to anon, authenticated;

-- 3) Histórico de preço (vendas concluídas) ---------------------------------
create or replace function public.price_history(p_slug text, p_server text default null)
returns jsonb language sql security definer set search_path = public as $$
  with sold as (
    select coalesce(sold_at, updated_at) as d, price_kk, server
    from public.marketplace_listings
    where pokemon_slug = p_slug and status='sold' and price_kk is not null
      and (p_server is null or server = p_server)
    order by coalesce(sold_at, updated_at) desc limit 60
  )
  select jsonb_build_object(
    'points', coalesce((select jsonb_agg(jsonb_build_object('d', d, 'kk', price_kk) order by d) from sold), '[]'::jsonb),
    'stats', (select jsonb_build_object('count', count(*), 'min', min(price_kk), 'avg', round(avg(price_kk)),
                'max', max(price_kk), 'last', (select price_kk from sold order by d desc limit 1)) from sold)
  );
$$;
grant execute on function public.price_history(text, text) to anon, authenticated;

-- 4) Expiração automática (7 dias) + Renovar --------------------------------
create extension if not exists pg_cron;
create or replace function public.renew_marketplace_listing(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean := false;
begin
  update public.marketplace_listings set status='active', updated_at=now()
    where id=p_id and seller_id=auth.uid() and status in ('active','expired') returning true into ok;
  return coalesce(ok,false);
end $$;
create or replace function public.renew_wtb_listing(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean := false;
begin
  update public.wtb_listings set status='active', updated_at=now()
    where id=p_id and buyer_id=auth.uid() and status in ('active','expired') returning true into ok;
  return coalesce(ok,false);
end $$;
grant execute on function public.renew_marketplace_listing(uuid) to authenticated;
grant execute on function public.renew_wtb_listing(uuid) to authenticated;
-- select cron.schedule('expire_old_listings_daily', '0 3 * * *', $$select public.expire_old_listings();$$);

-- 5) Notificações de resposta (triggers) ------------------------------------
create or replace function public.notify_trade_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_buyer uuid; v_seller uuid; v_recipient uuid; v_listing uuid; v_pokename text;
begin
  select buyer_id, seller_id, listing_id into v_buyer, v_seller, v_listing from public.trade_sessions where id = NEW.session_id;
  if v_buyer is null then return NEW; end if;
  v_recipient := case when NEW.sender_id = v_seller then v_buyer else v_seller end;
  if v_recipient is null or v_recipient = NEW.sender_id then return NEW; end if;
  select pokemon_name into v_pokename from public.marketplace_listings where id = v_listing;
  insert into public.notifications (user_id, type, title, message, read, created_at)
  values (v_recipient, 'marketplace', 'Nova mensagem',
    'Você recebeu uma resposta' || coalesce(' sobre ' || v_pokename, ' no seu anúncio') || '.', false, now());
  return NEW;
end $$;
drop trigger if exists trg_notify_trade_message on public.trade_messages;
create trigger trg_notify_trade_message after insert on public.trade_messages for each row execute function public.notify_trade_message();

create or replace function public.notify_wtb_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_buyer uuid; v_seller uuid; v_recipient uuid; v_listing uuid; v_pokename text;
begin
  select buyer_id, seller_id, wtb_listing_id into v_buyer, v_seller, v_listing from public.wtb_sessions where id = NEW.session_id;
  if v_buyer is null then return NEW; end if;
  v_recipient := case when NEW.sender_id = v_seller then v_buyer else v_seller end;
  if v_recipient is null or v_recipient = NEW.sender_id then return NEW; end if;
  select pokemon_name into v_pokename from public.wtb_listings where id = v_listing;
  insert into public.notifications (user_id, type, title, message, read, created_at)
  values (v_recipient, 'wtb', 'Nova mensagem',
    'Você recebeu uma resposta' || coalesce(' sobre ' || v_pokename, ' na sua procura') || '.', false, now());
  return NEW;
end $$;
drop trigger if exists trg_notify_wtb_message on public.wtb_messages;
create trigger trg_notify_wtb_message after insert on public.wtb_messages for each row execute function public.notify_wtb_message();

-- 6) Entregas da comunidade + reputação do vendedor -------------------------
create extension if not exists pgcrypto;
create table if not exists public.community_deliveries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid, listing_kind text not null default 'marketplace', session_id uuid,
  seller_id uuid not null, buyer_id uuid, server text not null default 'Moon',
  pokemon_name text, proof_url text, status text not null default 'pending_confirm',
  rating smallint, review text, created_at timestamptz not null default now(), confirmed_at timestamptz,
  constraint community_deliveries_rating_chk check (rating is null or (rating between 1 and 5)),
  constraint community_deliveries_status_chk check (status in ('pending_confirm','confirmed','disputed'))
);
create index if not exists idx_cdeliv_seller on public.community_deliveries(seller_id, status);
create index if not exists idx_cdeliv_buyer  on public.community_deliveries(buyer_id, status);
alter table public.community_deliveries enable row level security;
drop policy if exists cdeliv_select_own on public.community_deliveries;
create policy cdeliv_select_own on public.community_deliveries for select
  using (seller_id = auth.uid() or buyer_id = auth.uid() or public.is_admin());

create or replace function public.submit_delivery(p_listing_id uuid, p_session_id uuid, p_pokemon_name text, p_proof_url text, p_server text default 'Moon')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_buyer uuid; v_seller uuid;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if p_session_id is not null then
    select buyer_id, seller_id into v_buyer, v_seller from public.trade_sessions where id = p_session_id;
  end if;
  if v_seller is null then v_seller := auth.uid(); end if;
  if v_seller <> auth.uid() then raise exception 'apenas o vendedor pode enviar a entrega'; end if;
  insert into public.community_deliveries (listing_id, session_id, seller_id, buyer_id, server, pokemon_name, proof_url)
  values (p_listing_id, p_session_id, auth.uid(), v_buyer, coalesce(p_server,'Moon'), p_pokemon_name, p_proof_url) returning id into v_id;
  if v_buyer is not null then
    insert into public.notifications (user_id, type, title, message, read, created_at)
    values (v_buyer, 'delivery', 'Confirme sua entrega',
      'O vendedor enviou o print da entrega' || coalesce(' de ' || p_pokemon_name, '') || '. Confirme o recebimento e avalie.', false, now());
  end if;
  return v_id;
end $$;
grant execute on function public.submit_delivery(uuid,uuid,text,text,text) to authenticated;

create or replace function public.confirm_delivery(p_id uuid, p_rating smallint, p_review text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_seller uuid; v_poke text;
begin
  update public.community_deliveries set status='confirmed', confirmed_at=now(), rating=p_rating, review=p_review
    where id=p_id and buyer_id=auth.uid() and status='pending_confirm' returning seller_id, pokemon_name into v_seller, v_poke;
  if v_seller is null then return false; end if;
  insert into public.notifications (user_id, type, title, message, read, created_at)
  values (v_seller, 'delivery', 'Entrega confirmada',
    'O comprador confirmou a entrega' || coalesce(' de ' || v_poke, '') || ' e deixou ' || coalesce(p_rating::text,'—') || '★.', false, now());
  return true;
end $$;
grant execute on function public.confirm_delivery(uuid,smallint,text) to authenticated;

create or replace function public.seller_reputation(p_seller_id uuid)
returns table(confirmed integer, rated integer, avg_rating numeric) language sql security definer set search_path = public as $$
  select count(*) filter (where status='confirmed')::int,
         count(*) filter (where status='confirmed' and rating is not null)::int,
         round(avg(rating) filter (where status='confirmed' and rating is not null), 1)
  from public.community_deliveries where seller_id = p_seller_id;
$$;
create or replace function public.sellers_reputation(p_ids uuid[])
returns table(seller_id uuid, confirmed integer, rated integer, avg_rating numeric) language sql security definer set search_path = public as $$
  select seller_id, count(*) filter (where status='confirmed')::int,
         count(*) filter (where status='confirmed' and rating is not null)::int,
         round(avg(rating) filter (where status='confirmed' and rating is not null), 1)
  from public.community_deliveries where seller_id = any(p_ids) group by seller_id;
$$;
create or replace function public.my_pending_deliveries()
returns setof public.community_deliveries language sql security definer set search_path = public as $$
  select * from public.community_deliveries where buyer_id = auth.uid() and status='pending_confirm' order by created_at desc;
$$;
grant execute on function public.seller_reputation(uuid) to anon, authenticated;
grant execute on function public.sellers_reputation(uuid[]) to anon, authenticated;
grant execute on function public.my_pending_deliveries() to authenticated;

-- 7) Services (Faço service) ------------------------------------------------
create table if not exists public.service_listings (
  id uuid primary key default gen_random_uuid(), provider_id uuid not null,
  title text not null, description text, price_kk bigint, price_brl numeric,
  server text not null default 'Moon', status text not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint service_listings_server_chk check (server in ('Moon','Sun')),
  constraint service_listings_status_chk check (status in ('active','expired','cancelled','deleted'))
);
do $$ begin
  if not exists (select 1 from pg_constraint where conname='service_listings_provider_fk') then
    alter table public.service_listings add constraint service_listings_provider_fk
      foreign key (provider_id) references public.users(id) on delete cascade;
  end if;
end $$;
create index if not exists idx_service_listings_server on public.service_listings(server, status);
create index if not exists idx_service_listings_provider on public.service_listings(provider_id, status);
alter table public.service_listings enable row level security;
drop policy if exists svc_select on public.service_listings;
create policy svc_select on public.service_listings for select
  using (status='active' or provider_id=auth.uid() or public.is_admin());
drop policy if exists svc_insert on public.service_listings;
create policy svc_insert on public.service_listings for insert with check (provider_id = auth.uid());
drop policy if exists svc_update on public.service_listings;
create policy svc_update on public.service_listings for update using (provider_id = auth.uid()) with check (provider_id = auth.uid());

create or replace function public.renew_service_listing(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean := false;
begin
  update public.service_listings set status='active', updated_at=now()
    where id=p_id and provider_id=auth.uid() and status in ('active','expired') returning true into ok;
  return coalesce(ok,false);
end $$;
grant execute on function public.renew_service_listing(uuid) to authenticated;

create or replace function public.list_services(p_server text)
returns table(id uuid, title text, description text, price_kk bigint, status text,
              provider_id uuid, provider_nickname text, created_at timestamptz, updated_at timestamptz)
language sql security definer set search_path = public as $$
  select s.id, s.title, s.description, s.price_kk, s.status, s.provider_id, u.nickname, s.created_at, s.updated_at
  from public.service_listings s left join public.users u on u.id = s.provider_id
  where s.status='active' and s.server = p_server order by s.updated_at desc limit 100;
$$;
create or replace function public.list_my_services(p_server text)
returns table(id uuid, title text, description text, price_kk bigint, status text,
              provider_id uuid, provider_nickname text, created_at timestamptz, updated_at timestamptz)
language sql security definer set search_path = public as $$
  select s.id, s.title, s.description, s.price_kk, s.status, s.provider_id, u.nickname, s.created_at, s.updated_at
  from public.service_listings s left join public.users u on u.id = s.provider_id
  where s.provider_id = auth.uid() and s.server = p_server order by s.updated_at desc limit 200;
$$;
grant execute on function public.list_services(text) to anon, authenticated;
grant execute on function public.list_my_services(text) to authenticated;

-- 8) Expiração (inclui services) + world_stats público (online + postagens) -
create or replace function public.expire_old_listings()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.marketplace_listings set status='expired', updated_at=now() where status='active' and updated_at < now() - interval '7 days';
  update public.wtb_listings        set status='expired', updated_at=now() where status='active' and updated_at < now() - interval '7 days';
  update public.service_listings    set status='expired', updated_at=now() where status='active' and updated_at < now() - interval '7 days';
end $$;

create or replace function public.world_stats()
returns table(server text, online integer, postings integer) language sql security definer set search_path = public as $$
  with worlds as (select unnest(array['Moon','Sun']) as server),
  on_counts as (select server, count(*)::int as online from public.online_pings where last_seen > now() - interval '45 seconds' group by server),
  mk as (select server, count(*)::int c from public.marketplace_listings where status='active' group by server),
  wt as (select server, count(*)::int c from public.wtb_listings where status='active' group by server),
  sv as (select server, count(*)::int c from public.service_listings where status='active' group by server)
  select w.server, coalesce(o.online,0), (coalesce(mk.c,0)+coalesce(wt.c,0)+coalesce(sv.c,0))::int
  from worlds w
  left join on_counts o on o.server=w.server
  left join mk on mk.server=w.server
  left join wt on wt.server=w.server
  left join sv on sv.server=w.server
  order by w.server;
$$;
grant execute on function public.world_stats() to anon, authenticated;
