-- KayAyiti — 012 : séjours de démonstration (à exécuter après 011)
-- Photos : Unsplash (licence libre). Pour retirer : delete from public.properties where is_demo;

do $$
declare
  v_id uuid;
  img constant text := '?auto=format&fit=crop&w=1600&q=75';
begin
  -- 1. Bungalow face à la mer — Montrouis (à la nuit)
  insert into public.properties (title, description, property_type, transaction_type, price, currency, price_period,
    bedrooms, bathrooms, capacity, min_nights, amenities, department, commune, neighborhood, lat, lng, whatsapp,
    verified, is_demo, expires_at)
  values ('Bungalow les pieds dans l''eau sur la Côte des Arcadins',
    E'Bungalow de 3 chambres avec terrasse sur la mer, accès direct à la plage et piscine partagée.\nIdéal pour un week-end en famille ou entre amis. Draps et serviettes fournis, gardien sur place.',
    'maison', 'location', 180, 'USD', 'nuit', 3, 2, 6, 2,
    array['generatrice', 'climatisation', 'wifi', 'parking', 'securite', 'piscine', 'cuisine', 'meuble'],
    'Ouest', 'Arcahaie', 'Montrouis', 18.9540, -72.7060, '00000000', true, true, now() + interval '365 days')
  returning id into v_id;
  insert into public.property_media (property_id, storage_path, position) values
    (v_id, 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2' || img, 0),
    (v_id, 'https://images.unsplash.com/photo-1566073771259-6a8506099945' || img, 1),
    (v_id, 'https://images.unsplash.com/photo-1582719508461-905c673771fd' || img, 2);

  -- 2. Appartement cosy — Pétion-Ville (à la nuit)
  insert into public.properties (title, description, property_type, transaction_type, price, currency, price_period,
    bedrooms, bathrooms, capacity, min_nights, amenities, department, commune, neighborhood, lat, lng, whatsapp,
    is_demo, expires_at)
  values ('Appartement cosy à Pétion-Ville, électricité 24h/24',
    E'Appartement meublé d''une chambre dans une résidence sécurisée, proche des restaurants.\nParfait pour un voyage d''affaires ou une visite de la diaspora. Arrivée autonome possible.',
    'appartement', 'location', 65, 'USD', 'nuit', 1, 1, 3, 1,
    array['generatrice', 'climatisation', 'wifi', 'securite', 'eau', 'meuble', 'cuisine'],
    'Ouest', 'Pétion-Ville', 'Juvénat', 18.5135, -72.2810, '00000000', true, now() + interval '365 days')
  returning id into v_id;
  insert into public.property_media (property_id, storage_path, position) values
    (v_id, 'https://images.unsplash.com/photo-1505691938895-1758d7feb511' || img, 0),
    (v_id, 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6' || img, 1);
end $$;
