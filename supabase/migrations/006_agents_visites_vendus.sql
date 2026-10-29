-- KayAyiti — 006 : agents immobiliers, demandes de visite, biens vendus / loués
-- À exécuter après 005.

-- ═════════════════════════ Agents ═════════════════════════
create table if not exists public.agents (
  id             uuid primary key references public.profiles (id) on delete cascade,
  display_name   text not null check (char_length(display_name) between 2 and 80),
  agency_name    text check (char_length(agency_name) <= 80),
  bio            text check (char_length(bio) <= 1500),
  phone          text check (phone ~ '^\+?[0-9 ]{8,16}$'),
  whatsapp       text check (whatsapp ~ '^\+?[0-9 ]{8,16}$'),
  email          text check (char_length(email) <= 120 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  areas          text check (char_length(areas) <= 200),
  license_number text check (char_length(license_number) <= 60),
  photo_path     text check (char_length(photo_path) <= 300),
  active_until   timestamptz not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists agents_updated_at on public.agents;
create trigger agents_updated_at
  before update on public.agents
  for each row execute function public.set_updated_at();

alter table public.agents enable row level security;

revoke insert, update, delete on public.agents from anon, authenticated;
grant select on public.agents to anon, authenticated;
-- L'agent modifie son profil, jamais sa date d'abonnement
grant update (display_name, agency_name, bio, phone, whatsapp, email, areas, license_number, photo_path)
  on public.agents to authenticated;

drop policy if exists "agents actifs visibles" on public.agents;
drop policy if exists "agent modifie son profil" on public.agents;
create policy "agents actifs visibles" on public.agents
  for select using (active_until > now() or id = (select auth.uid()) or (select public.is_admin()));
create policy "agent modifie son profil" on public.agents
  for update to authenticated
  using (id = (select auth.uid()) and active_until > now())
  with check (
    id = (select auth.uid())
    and (photo_path is null or split_part(photo_path, '/', 1) = (select auth.uid())::text)
  );

create or replace function public.is_active_agent(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.agents where id = p_user and active_until > now());
$$;

-- Activation / prolongation par l'admin, après paiement
create or replace function public.admin_grant_agent(p_email text, p_months integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_email text := lower(trim(p_email));
  v_name text;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_months is null or p_months not between 1 and 24 then
    raise exception 'Durée invalide : 1 à 24 mois.' using errcode = 'P0001';
  end if;

  select id into v_user from auth.users where lower(email) = v_email;
  if v_user is null then
    raise exception 'Aucun compte avec cet e-mail : l''agent doit d''abord se connecter une fois sur le site.'
      using errcode = 'P0001';
  end if;

  v_name := initcap(replace(split_part(v_email, '@', 1), '.', ' '));
  if char_length(v_name) < 2 then v_name := 'Agent'; end if;

  insert into public.profiles (id) values (v_user) on conflict (id) do nothing;

  insert into public.agents (id, display_name, email, active_until)
  values (v_user, left(v_name, 80), v_email, now() + make_interval(months => p_months))
  on conflict (id) do update
    set active_until = greatest(public.agents.active_until, now()) + make_interval(months => p_months);

  update public.profiles set role = 'agent' where id = v_user and role = 'particulier';
  return v_user;
end;
$$;

-- Prolongation d'un agent existant (par identifiant : l'e-mail public peut avoir changé)
create or replace function public.admin_extend_agent(p_user uuid, p_months integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_months is null or p_months not between 1 and 24 then
    raise exception 'Durée invalide : 1 à 24 mois.' using errcode = 'P0001';
  end if;
  update public.agents
     set active_until = greatest(active_until, now()) + make_interval(months => p_months)
   where id = p_user;
  update public.profiles set role = 'agent' where id = p_user and role = 'particulier';
end;
$$;

create or replace function public.admin_revoke_agent(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  update public.agents set active_until = now() where id = p_user;
  update public.profiles set role = 'particulier' where id = p_user and role = 'agent';
end;
$$;

-- ═════════════════════════ Biens vendus / loués ═════════════════════════
alter table public.properties
  add column if not exists closed_reason text check (closed_reason in ('vendu', 'loue'));
alter table public.properties add column if not exists closed_at timestamptz;

-- Chiffres affichés sur le profil public de l'agent
create or replace function public.agent_public_stats(p_agent uuid)
returns table (active_count bigint, closed_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) filter (where p.status = 'publie'),
         count(*) filter (where p.closed_reason is not null)
    from public.properties p
   where p.owner_id = p_agent and public.is_active_agent(p_agent);
$$;

revoke execute on function public.is_active_agent(uuid) from public;
revoke execute on function public.admin_grant_agent(text, integer) from public, anon;
revoke execute on function public.admin_revoke_agent(uuid) from public, anon;
revoke execute on function public.admin_extend_agent(uuid, integer) from public, anon;
grant execute on function public.admin_extend_agent(uuid, integer) to authenticated;
revoke execute on function public.agent_public_stats(uuid) from public;
grant execute on function public.is_active_agent(uuid) to anon, authenticated;
grant execute on function public.admin_grant_agent(text, integer) to authenticated;
grant execute on function public.admin_revoke_agent(uuid) to authenticated;
grant execute on function public.agent_public_stats(uuid) to anon, authenticated;

-- Agents : 30 annonces par 24 h et 90 jours en ligne ; particuliers : 5 et 60 jours
create or replace function public.limit_listings_per_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agent boolean := new.owner_id is not null and public.is_active_agent(new.owner_id);
  v_limit integer := case when v_agent then 30 else 5 end;
begin
  if new.owner_id is not null and not public.is_admin() and (
    select count(*) from public.properties
     where owner_id = new.owner_id and created_at > now() - interval '24 hours'
  ) >= v_limit then
    raise exception 'Limite atteinte : % annonces maximum par 24 heures.', v_limit using errcode = 'P0001';
  end if;
  if v_agent then
    new.expires_at := now() + interval '90 days';
  end if;
  return new;
end;
$$;

-- Le propriétaire ne peut pas remettre en ligne un bien vendu ou loué
create or replace function public.set_listing_status(p_property_id uuid, p_status public.listing_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_days interval := case when public.is_active_agent((select auth.uid())) then interval '90 days' else interval '60 days' end;
begin
  update public.properties
     set status = p_status,
         expires_at = case when p_status = 'publie' then now() + v_days else expires_at end
   where id = p_property_id
     and owner_id = (select auth.uid())
     and closed_reason is null;

  if not found then
    raise exception 'Annonce introuvable ou déjà vendue / louée.' using errcode = 'P0002';
  end if;
end;
$$;

-- L'admin peut rouvrir un bien (vente annulée, erreur)
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
         expires_at = case when p_status = 'publie' then greatest(expires_at, now() + interval '60 days') else expires_at end,
         closed_reason = case when p_status = 'publie' then null else closed_reason end,
         closed_at = case when p_status = 'publie' then null else closed_at end
   where id = p_property_id;
end;
$$;

-- ═════════════════════════ Demandes de visite ═════════════════════════
create table if not exists public.visit_requests (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references public.properties (id) on delete cascade,
  owner_id       uuid references public.profiles (id) on delete cascade,
  requester_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name           text not null check (char_length(name) between 2 and 80),
  phone          text not null check (phone ~ '^\+?[0-9 ]{8,16}$'),
  preferred_date date not null,
  preferred_time text not null check (preferred_time in ('matin', 'midi', 'apres_midi')),
  message        text check (char_length(message) <= 500),
  status         text not null default 'en_attente'
                   check (status in ('en_attente', 'confirmee', 'refusee', 'annulee', 'effectuee')),
  scheduled_at   timestamptz,
  owner_note     text check (char_length(owner_note) <= 300),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists visit_requests_owner_idx on public.visit_requests (owner_id, created_at desc);
create index if not exists visit_requests_requester_idx on public.visit_requests (requester_id, created_at desc);
create index if not exists visit_requests_property_idx on public.visit_requests (property_id);

drop trigger if exists visit_requests_updated_at on public.visit_requests;
create trigger visit_requests_updated_at
  before update on public.visit_requests
  for each row execute function public.set_updated_at();

alter table public.visit_requests enable row level security;

revoke all on public.visit_requests from anon;
revoke insert, update, delete on public.visit_requests from authenticated;
grant select on public.visit_requests to authenticated;
grant insert (property_id, name, phone, preferred_date, preferred_time, message) on public.visit_requests to authenticated;

drop policy if exists "visites lisibles par les deux parties" on public.visit_requests;
drop policy if exists "visite demandée par l'utilisateur" on public.visit_requests;
create policy "visites lisibles par les deux parties" on public.visit_requests
  for select to authenticated
  using (requester_id = (select auth.uid()) or owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "visite demandée par l'utilisateur" on public.visit_requests
  for insert to authenticated with check (requester_id = (select auth.uid()));

-- Contrôles à la création : bien disponible, dates valides, anti-spam
create or replace function public.validate_visit_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_status text;
  v_demo boolean;
  v_today date := (now() at time zone 'America/Port-au-Prince')::date;
begin
  select owner_id, status, is_demo into v_owner, v_status, v_demo
    from public.properties where id = new.property_id;

  if not found or v_status <> 'publie' or v_demo or v_owner is null then
    raise exception 'Ce bien n''est plus disponible pour une visite.' using errcode = 'P0001';
  end if;
  if v_owner = new.requester_id then
    raise exception 'Vous ne pouvez pas demander la visite de votre propre annonce.' using errcode = 'P0001';
  end if;
  if new.preferred_date < v_today or new.preferred_date > v_today + 60 then
    raise exception 'Choisissez une date entre aujourd''hui et les 60 prochains jours.' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.visit_requests
     where property_id = new.property_id and requester_id = new.requester_id
       and status in ('en_attente', 'confirmee')
  ) then
    raise exception 'Vous avez déjà une demande de visite en cours pour ce bien.' using errcode = 'P0001';
  end if;
  if (
    select count(*) from public.visit_requests
     where requester_id = new.requester_id and created_at > now() - interval '24 hours'
  ) >= 5 then
    raise exception 'Limite atteinte : 5 demandes de visite par 24 heures.' using errcode = 'P0001';
  end if;

  new.owner_id := v_owner;
  new.status := 'en_attente';
  new.scheduled_at := null;
  new.owner_note := null;
  return new;
end;
$$;

drop trigger if exists visit_requests_validate on public.visit_requests;
create trigger visit_requests_validate
  before insert on public.visit_requests
  for each row execute function public.validate_visit_request();

-- Vendu / loué : l'annonce disparaît et les visites prévues sont annulées
create or replace function public.close_listing(p_property_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_reason not in ('vendu', 'loue') then
    raise exception 'Motif invalide.' using errcode = 'P0001';
  end if;

  update public.properties
     set status = 'archive', closed_reason = p_reason, closed_at = now()
   where id = p_property_id
     and owner_id = (select auth.uid())
     and closed_reason is null;

  if not found then
    raise exception 'Annonce introuvable.' using errcode = 'P0002';
  end if;

  update public.visit_requests
     set status = 'annulee', owner_note = 'Le bien n''est plus disponible.'
   where property_id = p_property_id and status in ('en_attente', 'confirmee');
end;
$$;

-- Réponse du propriétaire / de l'agent
create or replace function public.respond_visit(
  p_id uuid, p_status text, p_scheduled_at timestamptz default null, p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('confirmee', 'refusee', 'effectuee') then
    raise exception 'Statut invalide.' using errcode = 'P0001';
  end if;
  if p_status = 'confirmee' and (p_scheduled_at is null or p_scheduled_at < now()) then
    raise exception 'Indiquez une date et une heure de visite à venir.' using errcode = 'P0001';
  end if;

  update public.visit_requests
     set status = p_status,
         scheduled_at = case when p_status = 'confirmee' then p_scheduled_at else scheduled_at end,
         owner_note = coalesce(left(nullif(trim(p_note), ''), 300), owner_note)
   where id = p_id
     and owner_id = (select auth.uid())
     and (
       (status = 'en_attente' and p_status in ('confirmee', 'refusee'))
       or (status = 'confirmee' and p_status in ('confirmee', 'refusee', 'effectuee'))
     );

  if not found then
    raise exception 'Demande introuvable ou déjà traitée.' using errcode = 'P0002';
  end if;
end;
$$;

-- Annulation par le visiteur
create or replace function public.cancel_visit(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.visit_requests
     set status = 'annulee'
   where id = p_id
     and requester_id = (select auth.uid())
     and status in ('en_attente', 'confirmee');

  if not found then
    raise exception 'Demande introuvable ou déjà terminée.' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.close_listing(uuid, text) from public, anon;
revoke execute on function public.respond_visit(uuid, text, timestamptz, text) from public, anon;
revoke execute on function public.cancel_visit(uuid) from public, anon;
grant execute on function public.close_listing(uuid, text) to authenticated;
grant execute on function public.respond_visit(uuid, text, timestamptz, text) to authenticated;
grant execute on function public.cancel_visit(uuid) to authenticated;

-- Chaque nuit : les demandes restées sans réponse après la date souhaitée expirent
select cron.schedule(
  'expirer-demandes-visite',
  '20 6 * * *',
  $$update public.visit_requests
       set status = 'annulee', owner_note = 'Demande expirée sans réponse.'
     where status = 'en_attente'
       and preferred_date < (now() at time zone 'America/Port-au-Prince')::date$$
);
