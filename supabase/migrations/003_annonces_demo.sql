-- KayAyiti — 003 : annonces de démonstration
-- À exécuter après 002, et après t'être connecté au moins une fois sur le site
-- (les annonces sont rattachées à ton compte, admin en priorité).
-- Photos : Unsplash (licence libre, usage commercial autorisé).
--
-- Pour tout retirer plus tard :  delete from public.properties where is_demo;

alter table public.properties add column is_demo boolean not null default false;
-- Pas de grant sur is_demo : un utilisateur ne peut pas marquer son annonce comme démo.

do $$
declare
  v_owner uuid;
  v_id uuid;
  img constant text := '?auto=format&fit=crop&w=1600&q=75';
begin
  select id into v_owner from public.profiles order by (role = 'admin') desc, created_at limit 1;
  if v_owner is null then
    raise exception 'Connecte-toi une première fois sur le site, puis relance ce fichier.';
  end if;

  -- 1. Villa avec piscine — Pétion-Ville (vente)
  insert into public.properties (owner_id, title, description, property_type, transaction_type, price, currency,
    bedrooms, bathrooms, area_m2, department, commune, neighborhood, address_hint, lat, lng, whatsapp, verified,
    is_demo, expires_at)
  values (v_owner, 'Villa moderne avec piscine et vue sur la baie',
    E'Villa de 4 chambres sur deux niveaux, piscine, grande terrasse et vue dégagée sur la baie de Port-au-Prince.\nCiterne de 20 000 gallons, panneaux solaires et génératrice. Guérite et mur d''enceinte.',
    'maison', 'vente', 285000, 'USD', 4, 3, 320, 'Ouest', 'Pétion-Ville', 'Montagne Noire', 'Accès par route asphaltée',
    18.5040, -72.2780, '00000000', true, true, now() + interval '365 days')
  returning id into v_id;
  insert into public.property_media (property_id, storage_path, position) values
    (v_id, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750' || img, 0),
    (v_id, 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92' || img, 1),
    (v_id, 'https://images.unsplash.com/photo-1484154218962-a197022b5858' || img, 2);

  -- 2. Maison 3 chambres avec cour — Delmas (location annuelle)
  insert into public.properties (owner_id, title, description, property_type, transaction_type, price, currency,
    price_period, bedrooms, bathrooms, area_m2, department, commune, neighborhood, address_hint, lat, lng, whatsapp,
    verified, is_demo, expires_at)
  values (v_owner, 'Maison 3 chambres avec cour à Delmas 75',
    E'Maison de plain-pied, 3 chambres, salon, salle à manger et cuisine équipée.\nCour fermée pour 2 voitures, citerne et réservoir. Quartier calme.',
    'maison', 'location', 450000, 'HTG', 'annee', 3, 2, 160, 'Ouest', 'Delmas', 'Delmas 75', 'Près de la route principale',
    18.5410, -72.2960, '00000000', true, true, now() + interval '365 days')
  returning id into v_id;
  insert into public.property_media (property_id, storage_path, position) values
    (v_id, 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914' || img, 0),
    (v_id, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267' || img, 1);

  -- 3. Appartement meublé — Pétion-Ville (location mensuelle)
  insert into public.properties (owner_id, title, description, property_type, transaction_type, price, currency,
    price_period, bedrooms, bathrooms, area_m2, department, commune, neighborhood, lat, lng, whatsapp, is_demo, expires_at)
  values (v_owner, 'Appartement meublé 2 chambres, électricité 24h/24',
    E'Appartement entièrement meublé au 2e étage d''une résidence sécurisée.\nInverter et batteries, internet fibre, eau courante. Idéal pour professionnel ou famille de la diaspora.',
    'appartement', 'location', 1200, 'USD', 'mois', 2, 2, 110, 'Ouest', 'Pétion-Ville', 'Morne Calvaire',
    18.5105, -72.2905, '00000000', true, now() + interval '365 days')
  returning id into v_id;
  insert into public.property_media (property_id, storage_path, position) values
    (v_id, 'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8' || img, 0),
    (v_id, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688' || img, 1);

  -- 4. Maison familiale — Tabarre (vente)
  insert into public.properties (owner_id, title, description, property_type, transaction_type, price, currency,
    bedrooms, bathrooms, area_m2, department, commune, neighborhood, lat, lng, whatsapp, is_demo, expires_at)
  values (v_owner, 'Maison familiale 4 chambres à Tabarre',
    E'Grande maison sur un terrain de 500 m², 4 chambres dont une suite parentale.\nJardin arboré, véranda, espace de stationnement. Papiers en règle.',
    'maison', 'vente', 120000, 'USD', 4, 2, 200, 'Ouest', 'Tabarre', 'Tabarre 27',
    18.5786, -72.2698, '00000000', true, now() + interval '365 days')
  returning id into v_id;
  insert into public.property_media (property_id, storage_path, position) values
    (v_id, 'https://images.unsplash.com/photo-1523217582562-09d0def993a6' || img, 0),
    (v_id, 'https://images.unsplash.com/photo-1773847469674-189153e5e32d' || img, 1);

  -- 5. Maison en bord de mer — Jacmel (location mensuelle)
  insert into public.properties (owner_id, title, description, property_type, transaction_type, price, currency,
    price_period, bedrooms, bathrooms, area_m2, department, commune, neighborhood, lat, lng, whatsapp, is_demo, expires_at)
  values (v_owner, 'Maison les pieds dans l''eau à Cyvadier',
    E'Maison de 3 chambres avec accès direct à la plage.\nGalerie face à la mer, cuisine extérieure, gardien sur place.',
    'maison', 'location', 1500, 'USD', 'mois', 3, 2, 140, 'Sud-Est', 'Jacmel', 'Cyvadier',
    18.2280, -72.4960, '00000000', true, now() + interval '365 days')
  returning id into v_id;
  insert into public.property_media (property_id, storage_path, position) values
    (v_id, 'https://images.unsplash.com/photo-1570367164764-a8c2f911d049' || img, 0),
    (v_id, 'https://images.unsplash.com/photo-1564078516393-cf04bd966897' || img, 1);

  -- 6. Villa — Cap-Haïtien (vente)
  insert into public.properties (owner_id, title, description, property_type, transaction_type, price, currency,
    bedrooms, bathrooms, area_m2, department, commune, neighborhood, lat, lng, whatsapp, is_demo, expires_at)
  values (v_owner, 'Villa récente 3 chambres au Cap-Haïtien',
    E'Construction de 2022, finitions soignées, 3 chambres climatisées.\nToit-terrasse, citerne, à 10 minutes du centre-ville.',
    'maison', 'vente', 95000, 'USD', 3, 2, 180, 'Nord', 'Cap-Haïtien', 'Carénage',
    19.7600, -72.2000, '00000000', true, now() + interval '365 days')
  returning id into v_id;
  insert into public.property_media (property_id, storage_path, position) values
    (v_id, 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9' || img, 0),
    (v_id, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2' || img, 1);

  -- 7. Terrain — Kenscoff (vente)
  insert into public.properties (owner_id, title, description, property_type, transaction_type, price, currency,
    area_m2, department, commune, neighborhood, address_hint, lat, lng, whatsapp, is_demo, expires_at)
  values (v_owner, 'Terrain de 1 000 m² en montagne à Kenscoff',
    E'Terrain arboré, climat frais, idéal pour résidence secondaire.\nArpentage disponible, accès par route carrossable.',
    'terrain', 'vente', 30000, 'USD', 1000, 'Ouest', 'Kenscoff', 'Furcy', 'À 5 minutes de la route de Furcy',
    18.4200, -72.2700, '00000000', true, now() + interval '365 days')
  returning id into v_id;
  insert into public.property_media (property_id, storage_path, position) values
    (v_id, 'https://images.unsplash.com/photo-1560880944-796251b78b4c' || img, 0);

  -- 8. Chambre — Delmas 33 (location mensuelle)
  insert into public.properties (owner_id, title, description, property_type, transaction_type, price, currency,
    price_period, bedrooms, bathrooms, department, commune, neighborhood, lat, lng, whatsapp, is_demo, expires_at)
  values (v_owner, 'Chambre meublée pour étudiant à Delmas 33',
    E'Chambre individuelle dans une maison partagée, salle de bain privée.\nProche des universités et du transport en commun.',
    'chambre', 'location', 9000, 'HTG', 'mois', 1, 1, 'Ouest', 'Delmas', 'Delmas 33',
    18.5520, -72.3050, '00000000', true, now() + interval '365 days')
  returning id into v_id;
  insert into public.property_media (property_id, storage_path, position) values
    (v_id, 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7' || img, 0),
    (v_id, 'https://images.unsplash.com/photo-1603767868273-d59d712c8188' || img, 1);
end;
$$;
