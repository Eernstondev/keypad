-- KayAyiti — 004 : prix comparable entre HTG et USD (tri et filtre « prix max »)
-- Taux indicatif : 1 USD = 131 HTG (28 octobre 2026).
-- Pour changer le taux : remplace 131 ci-dessous ET USD_HTG dans src/lib/listings.ts, puis relance ce fichier.

alter table public.properties drop column if exists price_htg;

alter table public.properties
  add column price_htg numeric(16, 2)
  generated always as (case when currency = 'USD' then price * 131 else price end) stored;

create index properties_price_htg_idx on public.properties (price_htg) where status = 'publie';
