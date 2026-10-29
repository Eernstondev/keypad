import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SearchFilters } from "./queries";

// Construit l'URL de recherche : chaque filtre reste partageable par lien.
// Toute modification revient à la page 1, sauf si `page` est précisé.
export function searchHref(filters: SearchFilters, patch: Partial<SearchFilters> = {}) {
  const f = { ...filters, page: 1, ...patch };
  const qs = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  };

  set("q", f.q);
  set("transaction", f.transaction);
  set("type", f.type);
  set("minPrice", f.minPrice);
  set("maxPrice", f.maxPrice);
  if (f.minPrice || f.maxPrice) set("currency", f.currency);
  set("bedrooms", f.bedrooms);
  if (f.sort !== "recent") set("sort", f.sort);
  if (f.bounds) {
    set("n", f.bounds.n);
    set("s", f.bounds.s);
    set("e", f.bounds.e);
    set("w", f.bounds.w);
  }
  if (f.page > 1) set("page", f.page);

  const query = qs.toString();
  return query ? `/?${query}` : "/";
}

// Navigation dans la recherche, avec un état « en cours » pour griser la liste
export function useSearchNavigation(filters: SearchFilters) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = (patch: Partial<SearchFilters>) =>
    startTransition(() => router.push(searchHref(filters, patch), { scroll: false }));
  return { go, pending };
}
