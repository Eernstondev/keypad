-- KayAyiti — schéma de base (à exécuter une seule fois dans Supabase > SQL Editor)

create extension if not exists postgis with schema extensions;

-- ───────────────────────── Types ─────────────────────────
create type public.property_type as enum ('maison', 'appartement', 'terrain', 'local_commercial', 'chambre');
create type public.transaction_type as enum ('location', 'vente');
create type public.currency as enum ('HTG', 'USD');
create type public.price_period as enum ('mois', 'annee');
create type public.listing_status as enum ('publie', 'archive');
create type public.user_role as enum ('particulier', 'agent', 'admin');
create type public.report_status as enum ('ouvert', 'traite', 'rejete');

-- ───────────────────────── Profils ─────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text check (char_length(full_name) <= 80),
  phone       text check (phone ~ '^\+?[0-9 ]{8,16}$'),
  role        public.user_role not null default 'particulier',
  trust_score integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Crée automatiquement le profil à l'inscription
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- ───────────────────────── Annonces ─────────────────────────
create table public.properties (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title            text not null check (char_length(title) between 10 and 120),
  description      text check (char_length(description) <= 4000),
  property_type    public.property_type not null,
  transaction_type public.transaction_type not null,
  price            numeric(14, 2) not null check (price > 0),
  currency         public.currency not null default 'HTG',
  price_period     public.price_period,
  bedrooms         smallint check (bedrooms between 0 and 50),
  bathrooms        smallint check (bathrooms between 0 and 50),
  area_m2          numeric(10, 2) check (area_m2 > 0),
  department       text not null,
  commune          text not null check (char_length(commune) <= 60),
  neighborhood     text check (char_length(neighborhood) <= 80),
  address_hint     text check (char_length(address_hint) <= 200),
  lat              double precision check (lat between 17.9 and 20.2),
  lng              double precision check (lng between -74.6 and -71.5),
  location         extensions.geography(point, 4326)
                     generated always as (
                       case when lat is not null and lng is not null
                         then extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
                       end
                     ) stored,
  whatsapp         text not null check (whatsapp ~ '^\+?[0-9 ]{8,16}$'),
  status           public.listing_status not null default 'publie',
  verified         boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint lat_lng_together check ((lat is null) = (lng is null)),
  constraint period_only_for_rent check (transaction_type = 'location' or price_period is null)
);

create index properties_search_idx on public.properties (status, transaction_type, property_type, created_at desc);
create index properties_owner_idx on public.properties (owner_id);
create index properties_location_idx on public.properties using gist (location);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger properties_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

-- ───────────────────────── Photos ─────────────────────────
create table public.property_media (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references public.properties (id) on delete cascade,
  storage_path text not null unique,
  position     smallint not null default 0,
  created_at   timestamptz not null default now()
);

create index property_media_property_idx on public.property_media (property_id, position);

-- ───────────────────────── Signalements ─────────────────────────
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason      text not null check (reason in ('arnaque', 'faux_prix', 'deja_loue_vendu', 'photos_trompeuses', 'autre')),
  details     text check (char_length(details) <= 1000),
  status      public.report_status not null default 'ouvert',
  created_at  timestamptz not null default now(),
  unique (property_id, reporter_id)
);

-- ───────────────────────── Droits par colonne ─────────────────────────
-- Empêche un utilisateur de modifier son rôle, son score, ou le badge "vérifié"
revoke insert, update on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

revoke insert, update on public.properties from anon, authenticated;
grant insert (title, description, property_type, transaction_type, price, currency, price_period,
              bedrooms, bathrooms, area_m2, department, commune, neighborhood, address_hint,
              lat, lng, whatsapp)
  on public.properties to authenticated;
grant update (title, description, property_type, transaction_type, price, currency, price_period,
              bedrooms, bathrooms, area_m2, department, commune, neighborhood, address_hint,
              lat, lng, whatsapp, status)
  on public.properties to authenticated;

revoke insert, update on public.reports from anon, authenticated;
grant insert (property_id, reason, details) on public.reports to authenticated;
grant update (status) on public.reports to authenticated;

-- ───────────────────────── RLS ─────────────────────────
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_media enable row level security;
alter table public.reports enable row level security;

create policy "profil lisible par soi ou admin" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "profil modifiable par soi" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "annonces publiées visibles par tous" on public.properties
  for select using (status = 'publie' or owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "création par le propriétaire" on public.properties
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "modification par le propriétaire" on public.properties
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "suppression par le propriétaire ou admin" on public.properties
  for delete to authenticated using (owner_id = (select auth.uid()) or (select public.is_admin()));

create policy "photos visibles avec l'annonce" on public.property_media
  for select using (exists (select 1 from public.properties p where p.id = property_id));
create policy "photos ajoutées par le propriétaire" on public.property_media
  for insert to authenticated with check (
    exists (select 1 from public.properties p where p.id = property_id and p.owner_id = (select auth.uid()))
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
  );
create policy "photos supprimées par le propriétaire" on public.property_media
  for delete to authenticated using (
    exists (select 1 from public.properties p where p.id = property_id and p.owner_id = (select auth.uid()))
  );

create policy "signalement par un utilisateur connecté" on public.reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy "signalements lisibles par l'auteur ou admin" on public.reports
  for select to authenticated using (reporter_id = (select auth.uid()) or (select public.is_admin()));
create policy "signalements traités par admin" on public.reports
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Badge "vérifié" : uniquement via cette fonction, réservée aux admins
create function public.set_property_verified(p_property_id uuid, p_verified boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  update public.properties set verified = p_verified where id = p_property_id;
end;
$$;

revoke execute on function public.set_property_verified(uuid, boolean) from public, anon;
grant execute on function public.set_property_verified(uuid, boolean) to authenticated;

-- ───────────────────────── Stockage des photos ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-media', 'property-media', true, 2097152, array['image/webp', 'image/jpeg', 'image/png']);

-- Chaque utilisateur écrit uniquement dans son dossier : <user_id>/<property_id>/<fichier>
create policy "upload dans son dossier" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'property-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "suppression dans son dossier" on storage.objects
  for delete to authenticated
  using (bucket_id = 'property-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ───────────────────────── Premier admin ─────────────────────────
-- Après ta première connexion sur le site, remplace l'e-mail puis exécute :
-- update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'ton-email@exemple.com');
