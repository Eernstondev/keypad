-- KayAyiti — 005 : favoris, statistiques, anti-spam, modération
-- À exécuter après 004.

-- ───────────── Favoris ─────────────
create table if not exists public.favorites (
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, property_id)
);

create index if not exists favorites_property_idx on public.favorites (property_id);

alter table public.favorites enable row level security;

revoke all on public.favorites from anon;
grant select, delete on public.favorites to authenticated;
grant insert (property_id) on public.favorites to authenticated;

drop policy if exists "favoris lisibles par leur auteur" on public.favorites;
drop policy if exists "favoris ajoutés par leur auteur" on public.favorites;
drop policy if exists "favoris retirés par leur auteur" on public.favorites;
create policy "favoris lisibles par leur auteur" on public.favorites
  for select to authenticated using (user_id = (select auth.uid()));
create policy "favoris ajoutés par leur auteur" on public.favorites
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "favoris retirés par leur auteur" on public.favorites
  for delete to authenticated using (user_id = (select auth.uid()));

-- Comptes créés avant schema.sql : profil manquant (nécessaire pour les favoris)
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

-- ───────────── Statistiques (vues, clics WhatsApp) ─────────────
alter table public.properties add column if not exists view_count integer not null default 0;
alter table public.properties add column if not exists whatsapp_clicks integer not null default 0;
-- Pas de grant update sur ces colonnes : elles ne changent que via la fonction ci-dessous.

create or replace function public.track_listing_event(p_property_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_kind = 'view' then
    update public.properties set view_count = view_count + 1
     where id = p_property_id and status = 'publie' and not is_demo;
  elsif p_kind = 'whatsapp' then
    update public.properties set whatsapp_clicks = whatsapp_clicks + 1
     where id = p_property_id and status = 'publie' and not is_demo;
  end if;
end;
$$;

revoke execute on function public.track_listing_event(uuid, text) from public;
grant execute on function public.track_listing_event(uuid, text) to anon, authenticated;

-- ───────────── Anti-spam : 5 annonces maximum par 24 h et par compte ─────────────
create or replace function public.limit_listings_per_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_id is not null and not public.is_admin() and (
    select count(*) from public.properties
     where owner_id = new.owner_id and created_at > now() - interval '24 hours'
  ) >= 5 then
    raise exception 'Limite atteinte : 5 annonces maximum par 24 heures.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists properties_daily_limit on public.properties;
create trigger properties_daily_limit
  before insert on public.properties
  for each row execute function public.limit_listings_per_day();

-- ───────────── Modération : un admin peut archiver ou remettre en ligne n'importe quelle annonce ─────────────
create or replace function public.admin_set_listing_status(p_property_id uuid, p_status public.listing_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  update public.properties
     set status = p_status,
         expires_at = case when p_status = 'publie' then greatest(expires_at, now() + interval '60 days') else expires_at end
   where id = p_property_id;
end;
$$;

revoke execute on function public.admin_set_listing_status(uuid, public.listing_status) from public, anon;
grant execute on function public.admin_set_listing_status(uuid, public.listing_status) to authenticated;
