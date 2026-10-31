export type PropertyType =
  | "maison"
  | "appartement"
  | "chambre"
  | "terrain"
  | "local_commercial"
  | "bureau"
  | "espace_evenementiel"
  | "entrepot";
export type TransactionType = "location" | "vente";
export type Currency = "HTG" | "USD";
export type PricePeriod = "heure" | "jour" | "mois" | "annee";

export type PropertyMedia = { storage_path: string; position: number };

export type Property = {
  id: string;
  owner_id: string | null; // null uniquement pour les annonces de démo
  title: string;
  description: string | null;
  property_type: PropertyType;
  transaction_type: TransactionType;
  price: number;
  currency: Currency;
  price_period: PricePeriod | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_m2: number | null;
  capacity: number | null;
  amenities: Amenity[];
  department: string;
  commune: string;
  neighborhood: string | null;
  address_hint: string | null;
  lat: number | null;
  lng: number | null;
  whatsapp: string;
  status: "publie" | "archive";
  verified: boolean;
  is_demo: boolean;
  created_at: string;
  property_media: PropertyMedia[];
  agent?: Agent | null; // ajouté après la requête si le propriétaire est un agent actif
};

export type Agent = {
  id: string;
  display_name: string;
  agency_name: string | null;
  bio: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  areas: string | null;
  license_number: string | null;
  photo_path: string | null;
  active_until: string;
};

export const AGENT_COLUMNS =
  "id, display_name, agency_name, bio, phone, whatsapp, email, areas, license_number, photo_path, active_until";

export const VISIT_TIMES = {
  matin: "Matin (8 h – 12 h)",
  midi: "Midi (12 h – 14 h)",
  apres_midi: "Après-midi (14 h – 17 h)",
} as const;
export type VisitTime = keyof typeof VISIT_TIMES;

export const VISIT_STATUS = {
  en_attente: "En attente",
  confirmee: "Confirmée",
  refusee: "Refusée",
  annulee: "Annulée",
  effectuee: "Effectuée",
} as const;
export type VisitStatus = keyof typeof VISIT_STATUS;

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export const PROPERTY_TYPES: Record<PropertyType, string> = {
  maison: "Maison",
  appartement: "Appartement",
  chambre: "Chambre",
  terrain: "Terrain",
  local_commercial: "Local commercial",
  bureau: "Bureau / salle de réunion",
  espace_evenementiel: "Salle d'événements",
  entrepot: "Entrepôt / dépôt",
};

// Rubriques de recherche : « logements » et « espaces » (business, événements, stockage)
export const CATEGORIES = {
  logements: { label: "Logements", types: ["maison", "appartement", "chambre"] },
  espaces: { label: "Espaces pro & événements", types: ["espace_evenementiel", "bureau", "local_commercial", "entrepot"] },
} as const satisfies Record<string, { label: string; types: PropertyType[] }>;
export type Category = keyof typeof CATEGORIES;

export const isSpace = (t: PropertyType) => (CATEGORIES.espaces.types as readonly PropertyType[]).includes(t);

export const PRICE_PERIODS: Record<PricePeriod, string> = {
  heure: "Par heure",
  jour: "Par jour",
  mois: "Par mois",
  annee: "Par an",
};

// Doit correspondre à la contrainte amenities_known (migration 009)
export const AMENITIES = {
  generatrice: "Génératrice / inverter",
  climatisation: "Climatisation",
  wifi: "Internet / Wi-Fi",
  parking: "Parking",
  securite: "Gardien / sécurité",
  eau: "Citerne / réservoir",
  sono: "Sonorisation",
  cuisine: "Cuisine équipée",
  meuble: "Meublé",
  piscine: "Piscine",
} as const;
export type Amenity = keyof typeof AMENITIES;

export const TRANSACTION_TYPES: Record<TransactionType, string> = {
  location: "À louer",
  vente: "À vendre",
};

export const DEPARTMENTS = [
  "Ouest",
  "Nord",
  "Nord-Est",
  "Nord-Ouest",
  "Artibonite",
  "Centre",
  "Sud",
  "Sud-Est",
  "Grand'Anse",
  "Nippes",
] as const;

export const REPORT_REASONS = {
  arnaque: "Arnaque ou faux propriétaire",
  faux_prix: "Prix trompeur",
  deja_loue_vendu: "Déjà loué ou vendu",
  photos_trompeuses: "Photos trompeuses",
  autre: "Autre",
} as const;

export type ReportReason = keyof typeof REPORT_REASONS;

export const MEDIA_BUCKET = "property-media";

// Chemin dans le bucket, ou URL complète (photos des annonces de démo)
export function mediaUrl(path: string) {
  if (path.startsWith("https://")) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

export function coverPath(p: Pick<Property, "property_media">) {
  return [...p.property_media].sort((a, b) => a.position - b.position)[0]?.storage_path ?? null;
}

// Taux indicatif pour comparer HTG et USD (doit correspondre à la migration 004)
export const USD_HTG = 131;

const numberFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

// Équivalent indicatif dans l'autre devise : « ≈ 2 180 $ US » ou « ≈ 18 340 000 HTG »
export function approxOtherCurrency(p: Pick<Property, "price" | "currency" | "price_period">) {
  const other: Currency = p.currency === "USD" ? "HTG" : "USD";
  const value = p.currency === "USD" ? p.price * USD_HTG : p.price / USD_HTG;
  return `≈ ${formatPrice({ price: Math.round(value), currency: other, price_period: p.price_period })}`;
}

// Prix au m² pour les biens à vendre dont la surface est connue
export function pricePerM2(p: Pick<Property, "price" | "currency" | "area_m2" | "transaction_type">) {
  if (p.transaction_type !== "vente" || !p.area_m2) return null;
  return `${formatPrice({ price: Math.round(p.price / p.area_m2), currency: p.currency, price_period: null })} / m²`;
}

export function formatPrice(p: Pick<Property, "price" | "currency" | "price_period">) {
  const amount = numberFormat.format(p.price);
  const value = p.currency === "USD" ? `${amount} $ US` : `${amount} HTG`;
  const suffix = { heure: " / heure", jour: " / jour", mois: " / mois", annee: " / an" } as const;
  return p.price_period ? `${value}${suffix[p.price_period]}` : value;
}

// Prix compact pour les étiquettes de la carte : « 450K HTG », « 1,2K $ »
export function shortPrice(p: Pick<Property, "price" | "currency">) {
  const fmt = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  const n = p.price;
  const value = n >= 1e6 ? `${fmt(n / 1e6)}M` : n >= 1e3 ? `${fmt(n / 1e3)}K` : fmt(n);
  return p.currency === "USD" ? `${value} $` : `${value} HTG`;
}

// Numéro haïtien à 8 chiffres → indicatif 509 ajouté automatiquement
export function whatsappLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.length === 8 ? `509${digits}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

export function locationLabel(p: Pick<Property, "neighborhood" | "commune" | "department">) {
  return [p.neighborhood, p.commune, p.department].filter(Boolean).join(", ");
}
