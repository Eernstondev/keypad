-- KayAyiti — 002 : expiration des annonces (60 jours) + renouvellement
-- À exécuter une fois dans Supabase > SQL Editor, après schema.sql.

alter table public.properties
  add column expires_at timestamptz not null default now() + interval '60 days';

create index properties_expiry_idx on public.properties (expires_at) where status = 'publie';

-- Le statut ne se change plus directement : uniquement via set_listing_status,
-- pour qu'une remise en ligne repousse toujours l'expiration.
revoke update (status) on public.properties from authenticated;

create function public.set_listing_status(p_property_id uuid, p_status public.listing_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.properties
     set status = p_status,
         expires_at = case when p_status = 'publie' then now() + interval '60 days' else expires_at end
   where id = p_property_id
     and owner_id = (select auth.uid());

  if not found then
    raise exception 'Annonce introuvable' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.set_listing_status(uuid, public.listing_status) from public, anon;
grant execute on function public.set_listing_status(uuid, public.listing_status) to authenticated;

-- Archivage automatique chaque nuit (06:15 UTC = 02:15 en Haïti)
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'archiver-annonces-expirees',
  '15 6 * * *',
  $$update public.properties set status = 'archive' where status = 'publie' and expires_at < now()$$
);
