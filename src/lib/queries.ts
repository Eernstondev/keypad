import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import {
  DEPARTMENTS,
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

export type SearchFilters = {
  transaction?: TransactionType;
  type?: PropertyType;
  department?: string;
  commune?: string;
  maxPrice?: number;
  currency?: Currency;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

// Valide les paramètres d'URL : toute valeur inconnue est ignorée.
export function parseFilters(params: RawParams): SearchFilters {
  const get = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const positive = (v?: string) => {
    const n = Number(v);
    return v && Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const transaction = get("transaction");
  const type = get("type");
  const department = get("department");
  const currency = get("currency");

  return {
    transaction: transaction && transaction in TRANSACTION_TYPES ? (transaction as TransactionType) : undefined,
    type: type && type in PROPERTY_TYPES ? (type as PropertyType) : undefined,
    department: DEPARTMENTS.find((d) => d === department),
    commune: get("commune")?.slice(0, 60),
    maxPrice: positive(get("maxPrice")),
    currency: currency === "USD" || currency === "HTG" ? currency : undefined,
    page: Math.min(Math.floor(positive(get("page")) ?? 1), 100),
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

  if (f.transaction) q = q.eq("transaction_type", f.transaction);
  if (f.type) q = q.eq("property_type", f.type);
  if (f.department) q = q.eq("department", f.department);
  if (f.commune) q = q.ilike("commune", `%${f.commune.replace(/[\\%_]/g, "\\$&")}%`);
  if (f.maxPrice) q = q.lte("price", f.maxPrice).eq("currency", f.currency ?? "HTG");

  const from = (f.page - 1) * PAGE_SIZE;
  const { data, count, error } = await q
    .order("verified", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (error) throw new Error(`Recherche impossible : ${error.message}`);
  return { items: (data ?? []) as Property[], total: count ?? 0 };
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
