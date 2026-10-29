import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import {
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
  type Currency,
  type Property,
  type PropertyType,
  type TransactionType,
} from "./listings";

// Lectures publiques sans cookies : elles peuvent être mises en cache côté serveur.
function publicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const PROPERTY_COLUMNS =
  "id, owner_id, title, description, property_type, transaction_type, price, currency, price_period, bedrooms, bathrooms, area_m2, department, commune, neighborhood, address_hint, lat, lng, whatsapp, status, verified, is_demo, created_at, property_media(storage_path, position)";

export const PAGE_SIZE = 24;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SORTS = { recent: "Plus récentes", prix_asc: "Prix croissant", prix_desc: "Prix décroissant" } as const;
export type SortKey = keyof typeof SORTS;

// Zone visible de la carte (nord, sud, est, ouest)
export type Bounds = { n: number; s: number; e: number; w: number };

export type SearchFilters = {
  q?: string;
  transaction?: TransactionType;
  type?: PropertyType;
  minPrice?: number;
  maxPrice?: number;
  currency?: Currency;
  bedrooms?: number;
  bounds?: Bounds;
  sort: SortKey;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

// Valide les paramètres d'URL : toute valeur inconnue est ignorée.
export function parseFilters(params: RawParams): SearchFilters {
  const get = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const num = (k: string) => {
    const v = get(k);
    const n = Number(v);
    return v !== undefined && Number.isFinite(n) ? n : undefined;
  };
  const positive = (k: string) => {
    const n = num(k);
    return n !== undefined && n > 0 ? n : undefined;
  };

  const transaction = get("transaction");
  const type = get("type");
  const currency = get("currency");
  const sort = get("sort");
  const bedrooms = positive("bedrooms");
  const [n, s, e, w] = [num("n"), num("s"), num("e"), num("w")];
  const validBounds =
    n !== undefined && s !== undefined && e !== undefined && w !== undefined &&
    n > s && e > w && n <= 90 && s >= -90 && e <= 180 && w >= -180;

  return {
    // Retire les caractères qui ont un sens dans les filtres PostgREST
    q: get("q")?.replace(/[,()*%_\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) || undefined,
    transaction: transaction && transaction in TRANSACTION_TYPES ? (transaction as TransactionType) : undefined,
    type: type && type in PROPERTY_TYPES ? (type as PropertyType) : undefined,
    minPrice: positive("minPrice"),
    maxPrice: positive("maxPrice"),
    currency: currency === "USD" || currency === "HTG" ? currency : undefined,
    bedrooms: bedrooms && Math.min(Math.floor(bedrooms), 10),
    bounds: validBounds ? { n, s, e, w } : undefined,
    sort: sort && sort in SORTS ? (sort as SortKey) : "recent",
    page: Math.min(Math.floor(positive("page") ?? 1), 100),
  };
}

export async function searchProperties(f: SearchFilters) {
  "use cache";
  cacheTag("properties");
  cacheLife("minutes");

  let q = publicClient()
    .from("properties")
    .select(PROPERTY_COLUMNS, { count: "exact" })
    .eq("status", "publie");

  if (f.q) {
    q = q.or(
      ["commune", "neighborhood", "department", "title"].map((col) => `${col}.ilike.*${f.q}*`).join(","),
    );
  }
  if (f.transaction) q = q.eq("transaction_type", f.transaction);
  if (f.type) q = q.eq("property_type", f.type);
  if (f.bedrooms) q = q.gte("bedrooms", f.bedrooms);
  if (f.minPrice || f.maxPrice) {
    q = q.eq("currency", f.currency ?? "HTG");
    if (f.minPrice) q = q.gte("price", f.minPrice);
    if (f.maxPrice) q = q.lte("price", f.maxPrice);
  }
  if (f.bounds) {
    q = q.gte("lat", f.bounds.s).lte("lat", f.bounds.n).gte("lng", f.bounds.w).lte("lng", f.bounds.e);
  }

  q =
    f.sort === "recent"
      ? q.order("verified", { ascending: false }).order("created_at", { ascending: false })
      : // price_htg (migration 004) : les prix USD sont convertis, le tri compare donc des montants équivalents
        q.order("price_htg", { ascending: f.sort === "prix_asc" }).order("created_at", { ascending: false });

  const from = (f.page - 1) * PAGE_SIZE;
  const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1);

  if (error) throw new Error(`Recherche impossible : ${error.message}`);
  return { items: (data ?? []) as Property[], total: count ?? 0 };
}

// Même type de transaction, même commune d'abord, puis même département
export async function getSimilarProperties(p: Pick<Property, "id" | "transaction_type" | "commune" | "department">) {
  "use cache";
  cacheTag("properties");
  cacheLife("minutes");

  const LIMIT = 4;
  const base = () =>
    publicClient()
      .from("properties")
      .select(PROPERTY_COLUMNS)
      .eq("status", "publie")
      .eq("transaction_type", p.transaction_type)
      .neq("id", p.id)
      .order("verified", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(LIMIT);

  const { data: sameCommune } = await base().eq("commune", p.commune);
  const items = (sameCommune ?? []) as Property[];
  if (items.length >= LIMIT) return items;

  const { data: sameDepartment } = await base().eq("department", p.department).neq("commune", p.commune);
  return [...items, ...((sameDepartment ?? []) as Property[])].slice(0, LIMIT);
}

export async function getProperty(id: string) {
  "use cache";
  cacheTag("properties", `property:${id}`);
  cacheLife("minutes");

  if (!UUID_RE.test(id)) return null;

  const { data, error } = await publicClient()
    .from("properties")
    .select(PROPERTY_COLUMNS)
    .eq("id", id)
    .eq("status", "publie")
    .maybeSingle();

  if (error) throw new Error(`Annonce introuvable : ${error.message}`);
  return data as Property | null;
}
