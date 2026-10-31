-- KayAyiti — 010 : espaces de démonstration (à exécuter après 009)
-- Photos : Unsplash (licence libre). Pour retirer : delete from public.properties where is_demo;

do $$
declare
  v_id uuid;
  img constant text := '?auto=format&fit=crop&w=1600&q=75';
begin
  -- 1. Salle de réception — Pétion-Ville (location à la journée)
  insert into public.properties (title, description, property_type, transaction_type, price, currency, price_period,
    bathrooms, area_m2, capacity, amenities, department, commune, neighborhood, address_hint, lat, lng, whatsapp,
    verified, is_demo, expires_at)
  values ('Salle de réception climatisée, 300 invités',
    E'Grande salle pour mariages, baptêmes, conférences et soirées d''entreprise.\nTables rondes, chaises et nappes fournies, scène et sonorisation. Cuisine pour traiteur, parking surveillé de 60 places.\nGénératrice de relais : aucune coupure pendant votre événement.',
    'espace_evenementiel', 'location', 1500, 'USD', 'jour', 4, 600, 300,
    array['generatrice', 'climatisation', 'parking', 'securite', 'sono', 'cuisine'],
    'Ouest', 'Pétion-Ville', 'Route de Frères', 'Entrée par le grand portail blanc',
    18.5180, -72.2690, '00000000', true, true, now() + interval '365 days')
  returning id into v_id;
  insert into public.property_media (property_id, storage_path, position) values
    (v_id, 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3' || img, 0),
    (v_id, 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3' || img, 1),
    (v_id, 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622' || img, 2);

  -- 2. Bureaux équipés — Delmas (location mensuelle)
  insert into public.properties (title, description, property_type, transaction_type, price, currency, price_period,
    bathrooms, area_m2, capacity, amenities, department, commune, neighborhood, lat, lng, whatsapp, is_demo, expires_at)
  values ('Plateau de bureaux équipés pour 25 postes',
    E'Bureaux modernes au 3e étage : open space, 2 bureaux fermés, salle de réunion et coin détente.\nInternet fibre, climatisation, électricité continue (inverter + génératrice). Gardien 24h/24.',
    'bureau', 'location', 1800, 'USD', 'mois', 2, 180, 25,
    array['generatrice', 'climatisation', 'wifi', 'securite', 'parking', 'meuble'],
    'Ouest', 'Delmas', 'Delmas 48', 18.5395, -72.3040, '00000000', true, now() + interval '365 days')
  returning id into v_id;
  insert into public.property_media (property_id, storage_path, position) values
    (v_id, 'https://images.unsplash.com/photo-1497366811353-6870744d04b2' || img, 0),
    (v_id, 'https://images.unsplash.com/photo-1524758631624-e2822e304c36' || img, 1),
    (v_id, 'https://images.unsplash.com/photo-1497366216548-37526070297c' || img, 2);

  -- 3. Salle de réunion — Pétion-Ville (location à l'heure)
  insert into public.properties (title, description, property_type, transaction_type, price, currency, price_period,
    area_m2, capacity, amenities, department, commune, neighborhood, lat, lng, whatsapp, is_demo, expires_at)
  values ('Salle de réunion 12 places, à l''heure',
    E'Salle lumineuse avec vue, grande table, écran et visioconférence.\nIdéale pour entretiens, formations et réunions clients. Café et eau inclus.',
    'bureau', 'location', 35, 'USD', 'heure', 40, 12,
    array['generatrice', 'climatisation', 'wifi', 'securite'],
    'Ouest', 'Pétion-Ville', 'Rue Grégoire', 18.5115, -72.2870, '00000000', true, now() + interval '365 days')
  returning id into v_id;
  insert into public.property_media (property_id, storage_path, position) values
    (v_id, 'https://images.unsplash.com/photo-1517502884422-41eaead166d4' || img, 0);

  -- 4. Entrepôt — Tabarre (location mensuelle)
  insert into public.properties (title, description, property_type, transaction_type, price, currency, price_period,
    area_m2, amenities, department, commune, neighborhood, address_hint, lat, lng, whatsapp, is_demo, expires_at)
  values ('Entrepôt de 1 200 m² proche de l''aéroport',
    E'Entrepôt sécurisé avec quai de chargement pour conteneurs, rayonnages et bureau sur place.\nAccès poids lourds, mur d''enceinte, gardiennage jour et nuit.',
    'entrepot', 'location', 3500, 'USD', 'mois', 1200,
    array['securite', 'parking', 'generatrice', 'eau'],
    'Ouest', 'Tabarre', 'Route de l''aéroport', 'À 5 minutes de l''aéroport Toussaint Louverture',
    18.5720, -72.2880, '00000000', true, now() + interval '365 days')
  returning id into v_id;
  insert into public.property_media (property_id, storage_path, position) values
    (v_id, 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d' || img, 0);
end $$;
