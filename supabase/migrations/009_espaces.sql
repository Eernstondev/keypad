-- KayAyiti — 009 : espaces business et événementiels
-- Nouveaux types (bureau, salle d'événements, entrepôt), location à l'heure ou à la journée,
-- capacité d'accueil et équipements. À exécuter seul, AVANT 010 (Postgres n'autorise pas
-- l'usage d'une nouvelle valeur d'enum dans la transaction qui l'a créée).

alter type public.property_type add value if not exists 'bureau';
alter type public.property_type add value if not exists 'espace_evenementiel';
alter type public.property_type add value if not exists 'entrepot';

alter type public.price_period add value if not exists 'jour';
alter type public.price_period add value if not exists 'heure';

-- Nombre de personnes accueillies (salles, bureaux)
alter table public.properties
  add column if not exists capacity integer check (capacity between 1 and 20000);

-- Équipements : liste fermée (doit correspondre à AMENITIES dans src/lib/listings.ts)
alter table public.properties
  add column if not exists amenities text[] not null default '{}';
alter table public.properties drop constraint if exists amenities_known;
alter table public.properties add constraint amenities_known check (
  amenities <@ array['generatrice', 'climatisation', 'parking', 'wifi', 'securite', 'eau',
                     'sono', 'cuisine', 'meuble', 'piscine']::text[]
);

grant insert (capacity, amenities), update (capacity, amenities) on public.properties to authenticated;

create index if not exists properties_capacity_idx on public.properties (capacity) where status = 'publie';
