export type PropertyType = "maison" | "appartement" | "terrain" | "local_commercial" | "chambre";
export type TransactionType = "location" | "vente";
export type Currency = "HTG" | "USD";
export type PricePeriod = "mois" | "annee";

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
};

export const PROPERTY_TYPES: Record<PropertyType, string> = {
  maison: "Maison",
  appartement: "Appartement",
  terrain: "Terrain",
  local_commercial: "Local commercial",
  chambre: "Chambre",
};

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

const numberFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function formatPrice(p: Pick<Property, "price" | "currency" | "price_period">) {
  const amount = numberFormat.format(p.price);
  const value = p.currency === "USD" ? `${amount} $ US` : `${amount} HTG`;
  if (p.price_period === "mois") return `${value} / mois`;
  if (p.price_period === "annee") return `${value} / an`;
  return value;
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
