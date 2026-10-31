-- KayAyiti — 011 : séjours courte durée (façon Airbnb)
-- Location à la nuit, voyageurs max (colonne capacity), nuits minimum, demandes de réservation
-- avec dates, confirmées par le propriétaire, sans double réservation possible.
-- À exécuter seul, AVANT 012 (nouvelle valeur d'enum).

alter type public.price_period add value if not exists 'nuit';

alter table public.properties
  add column if not exists min_nights smallint check (min_nights between 1 and 30);
grant insert (min_nights), update (min_nights) on public.properties to authenticated;

create extension if not exists btree_gist with schema extensions;

-- ═════════════════════════ Réservations ═════════════════════════
create table if not exists public.stay_requests (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references public.properties (id) on delete cascade,
  owner_id      uuid references public.profiles (id) on delete cascade,
  requester_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name          text not null check (char_length(name) between 2 and 80),
  phone         text not null check (phone ~ '^\+?[0-9 ]{8,16}$'),
  check_in      date not null,
  check_out     date not null,
  guests        smallint not null check (guests between 1 and 50),
  message       text check (char_length(message) <= 500),
  status        text not null default 'en_attente'
                  check (status in ('en_attente', 'confirmee', 'refusee', 'annulee')),
  owner_note    text check (char_length(owner_note) <= 300),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint stay_dates_order check (check_out > check_in),
  -- Deux réservations confirmées ne peuvent jamais se chevaucher (le jour du départ reste libre)
  constraint stay_no_overlap exclude using gist (
    property_id with =, daterange(check_in, check_out) with &&
  ) where (status = 'confirmee')
);

create index if not exists stay_requests_owner_idx on public.stay_requests (owner_id, created_at desc);
create index if not exists stay_requests_requester_idx on public.stay_requests (requester_id, created_at desc);

drop trigger if exists stay_requests_updated_at on public.stay_requests;
create trigger stay_requests_updated_at
  before update on public.stay_requests
  for each row execute function public.set_updated_at();

alter table public.stay_requests enable row level security;

revoke all on public.stay_requests from anon;
revoke insert, update, delete on public.stay_requests from authenticated;
grant select on public.stay_requests to authenticated;
grant insert (property_id, name, phone, check_in, check_out, guests, message) on public.stay_requests to authenticated;

drop policy if exists "réservations lisibles par les deux parties" on public.stay_requests;
drop policy if exists "réservation demandée par l'utilisateur" on public.stay_requests;
create policy "réservations lisibles par les deux parties" on public.stay_requests
  for select to authenticated
  using (requester_id = (select auth.uid()) or owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "réservation demandée par l'utilisateur" on public.stay_requests
  for insert to authenticated with check (requester_id = (select auth.uid()));

-- Contrôles à la création
create or replace function public.validate_stay_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  v_today date := (now() at time zone 'America/Port-au-Prince')::date;
begin
  select owner_id, status, is_demo, price_period::text as period, capacity, coalesce(min_nights, 1) as min_nights
    into p from public.properties where id = new.property_id;

  if not found or p.status <> 'publie' or p.is_demo or p.owner_id is null or p.period is distinct from 'nuit' then
    raise exception 'Ce logement n''est pas disponible à la réservation.' using errcode = 'P0001';
  end if;
  if p.owner_id = new.requester_id then
    raise exception 'Vous ne pouvez pas réserver votre propre logement.' using errcode = 'P0001';
  end if;
  if new.check_in < v_today or new.check_in > v_today + 365 then
    raise exception 'Choisissez une arrivée entre aujourd''hui et les 12 prochains mois.' using errcode = 'P0001';
  end if;
  if new.check_out - new.check_in < p.min_nights then
    raise exception 'Séjour minimum : % nuit(s).', p.min_nights using errcode = 'P0001';
  end if;
  if new.check_out - new.check_in > 90 then
    raise exception 'Séjour maximum : 90 nuits.' using errcode = 'P0001';
  end if;
  if p.capacity is not null and new.guests > p.capacity then
    raise exception 'Ce logement accueille au maximum % voyageur(s).', p.capacity using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.stay_requests
     where property_id = new.property_id and status = 'confirmee'
       and daterange(check_in, check_out) && daterange(new.check_in, new.check_out)
  ) then
    raise exception 'Ces dates sont déjà réservées.' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.stay_requests
     where property_id = new.property_id and requester_id = new.requester_id and status = 'en_attente'
  ) then
    raise exception 'Vous avez déjà une demande en attente pour ce logement.' using errcode = 'P0001';
  end if;
  if (
    select count(*) from public.stay_requests
     where requester_id = new.requester_id and created_at > now() - interval '24 hours'
  ) >= 5 then
    raise exception 'Limite atteinte : 5 demandes de réservation par 24 heures.' using errcode = 'P0001';
  end if;

  new.owner_id := p.owner_id;
  new.status := 'en_attente';
  new.owner_note := null;
  return new;
end;
$$;

drop trigger if exists stay_requests_validate on public.stay_requests;
create trigger stay_requests_validate
  before insert on public.stay_requests
  for each row execute function public.validate_stay_request();

-- Réponse du propriétaire : confirmer ou refuser (une confirmée peut encore être annulée)
create or replace function public.respond_stay(p_id uuid, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_found boolean;
begin
  if p_status not in ('confirmee', 'refusee') then
    raise exception 'Statut invalide.' using errcode = 'P0001';
  end if;

  begin
    update public.stay_requests
       set status = p_status,
           owner_note = coalesce(left(nullif(trim(p_note), ''), 300), owner_note)
     where id = p_id
       and owner_id = (select auth.uid())
       and (status = 'en_attente' or (status = 'confirmee' and p_status = 'refusee'));
    v_found := found;
  exception when exclusion_violation then
    raise exception 'Ces dates chevauchent une réservation déjà confirmée.' using errcode = 'P0001';
  end;

  if not v_found then
    raise exception 'Demande introuvable ou déjà traitée.' using errcode = 'P0002';
  end if;

  -- Les autres demandes en attente sur les mêmes dates deviennent impossibles
  if p_status = 'confirmee' then
    update public.stay_requests o
       set status = 'refusee', owner_note = 'Ces dates viennent d''être réservées.'
      from public.stay_requests c
     where c.id = p_id
       and o.property_id = c.property_id and o.id <> c.id and o.status = 'en_attente'
       and daterange(o.check_in, o.check_out) && daterange(c.check_in, c.check_out);
  end if;
end;
$$;

-- Annulation par le voyageur
create or replace function public.cancel_stay(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.stay_requests
     set status = 'annulee'
   where id = p_id
     and requester_id = (select auth.uid())
     and status in ('en_attente', 'confirmee')
     and check_out > (now() at time zone 'America/Port-au-Prince')::date;

  if not found then
    raise exception 'Réservation introuvable ou déjà terminée.' using errcode = 'P0002';
  end if;
end;
$$;

-- Calendrier public : uniquement les périodes confirmées, sans aucune donnée personnelle
create or replace function public.stay_booked_ranges(p_property_id uuid)
returns table (check_in date, check_out date)
language sql
stable
security definer
set search_path = ''
as $$
  select s.check_in, s.check_out
    from public.stay_requests s
   where s.property_id = p_property_id
     and s.status = 'confirmee'
     and s.check_out > (now() at time zone 'America/Port-au-Prince')::date
   order by s.check_in;
$$;

-- Recherche par dates : logements déjà réservés sur la période
create or replace function public.stay_unavailable(p_from date, p_to date)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct s.property_id
    from public.stay_requests s
   where s.status = 'confirmee'
     and daterange(s.check_in, s.check_out) && daterange(p_from, p_to);
$$;

revoke execute on function public.respond_stay(uuid, text, text) from public, anon;
revoke execute on function public.cancel_stay(uuid) from public, anon;
grant execute on function public.respond_stay(uuid, text, text) to authenticated;
grant execute on function public.cancel_stay(uuid) to authenticated;
grant execute on function public.stay_booked_ranges(uuid) to anon, authenticated;
grant execute on function public.stay_unavailable(date, date) to anon, authenticated;

-- Chaque nuit : les demandes restées sans réponse après la date d'arrivée expirent
select cron.schedule(
  'expirer-demandes-sejour',
  '25 6 * * *',
  $$update public.stay_requests
       set status = 'annulee', owner_note = 'Demande expirée sans réponse.'
     where status = 'en_attente'
       and check_in <= (now() at time zone 'America/Port-au-Prince')::date$$
);
