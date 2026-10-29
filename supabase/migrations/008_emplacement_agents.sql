-- KayAyiti — 008 : emplacement sur la carte obligatoire pour les annonces d'agents
-- À exécuter après 007.

create or replace function public.require_agent_location()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.lat is null or new.lng is null)
     and new.owner_id is not null
     and public.is_active_agent(new.owner_id) then
    raise exception 'Placez le bien sur la carte : l''emplacement est obligatoire pour les annonces d''agents.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Seulement à la création et quand la position change : archiver ou clôturer reste toujours possible
drop trigger if exists properties_require_agent_location on public.properties;
create trigger properties_require_agent_location
  before insert or update of lat, lng on public.properties
  for each row execute function public.require_agent_location();

revoke execute on function public.require_agent_location() from public, anon, authenticated;
