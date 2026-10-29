"use client";

import { useState } from "react";
import Link from "next/link";
import { PropertyCard } from "@/components/property-card";
import { PropertyMap, type MapBounds, type MapMarker } from "@/components/map";
import { shortPrice, type Property } from "@/lib/listings";
import type { SearchFilters, SortKey } from "@/lib/queries";
import { searchHref, useSearchNavigation } from "@/lib/search-url";
import { FilterBar } from "./filter-bar";

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Plus récentes",
  prix_asc: "Prix croissant",
  prix_desc: "Prix décroissant",
};

type Props = { filters: SearchFilters; items: Property[]; total: number; pageSize: number };

export function SearchView({ filters, items, total, pageSize }: Props) {
  const { go, pending } = useSearchNavigation(filters);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [movedTo, setMovedTo] = useState<MapBounds | null>(null);

  const pages = Math.ceil(total / pageSize);
  const markers: MapMarker[] = items
    .filter((p) => p.lat !== null && p.lng !== null)
    .map((p) => ({ id: p.id, lat: p.lat!, lng: p.lng!, price: shortPrice(p), href: `/annonces/${p.id}` }));

  const label =
    filters.transaction === "location" ? "logements à louer" : filters.transaction === "vente" ? "biens à vendre" : "annonces";

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <FilterBar filters={filters} go={go} />

      <div className="relative flex min-h-0 flex-1">
        {/* Liste */}
        <section
          className={`absolute inset-0 z-10 overflow-y-auto bg-sand-50 lg:static lg:z-auto lg:w-[min(56%,820px)] lg:shrink-0 lg:border-r lg:border-line ${
            view === "map" ? "hidden lg:block" : ""
          }`}
        >
          <div className={`px-4 py-5 transition-opacity ${pending ? "opacity-50" : ""}`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                <span className="text-base font-bold text-navy-900">{total}</span> {label}
                {filters.bounds && (
                  <button onClick={() => go({ bounds: undefined })} className="ml-2 rounded-full bg-navy-100 px-2.5 py-1 text-xs font-semibold text-navy-900">
                    Zone de la carte ✕
                  </button>
                )}
              </p>
              <label className="flex items-center gap-2 text-sm text-muted">
                Trier
                <select
                  value={filters.sort}
                  onChange={(e) => go({ sort: e.target.value as SortKey })}
                  className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-ink"
                >
                  {Object.entries(SORT_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </label>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-line bg-white px-6 py-14 text-center">
                <p className="font-semibold text-navy-900">Aucune annonce ne correspond à ces critères.</p>
                <p className="mt-1 text-sm text-muted">Élargissez la zone ou retirez un filtre.</p>
                <Link href="/" className="btn-ghost mt-5">Voir toutes les annonces</Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((p) => (
                  <div
                    key={p.id}
                    onMouseEnter={() => setActiveId(p.id)}
                    onMouseLeave={() => setActiveId(null)}
                    className={`rounded-2xl transition ${activeId === p.id ? "ring-2 ring-navy-700 ring-offset-2 ring-offset-sand-50" : ""}`}
                  >
                    <PropertyCard property={p} />
                  </div>
                ))}
              </div>
            )}

            {pages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-3 pb-16 lg:pb-0" aria-label="Pagination">
                {filters.page > 1 && (
                  <Link href={searchHref(filters, { page: filters.page - 1 })} className="btn-ghost">Précédent</Link>
                )}
                <span className="text-sm text-muted">Page {filters.page} / {pages}</span>
                {filters.page < pages && (
                  <Link href={searchHref(filters, { page: filters.page + 1 })} className="btn-ghost">Suivant</Link>
                )}
              </nav>
            )}
          </div>
        </section>

        {/* Carte : toujours montée (dimension correcte), recouverte par la liste sur mobile */}
        <section className="absolute inset-0 lg:static lg:flex-1">
          <PropertyMap
            markers={markers}
            activeId={activeId}
            onMarkerHover={setActiveId}
            onBoundsChange={setMovedTo}
            bounds={filters.bounds}
            className="h-full w-full"
          />
          {movedTo && (
            <button
              onClick={() => {
                go({ bounds: movedTo });
                setMovedTo(null);
              }}
              className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-navy-900 px-4 py-2 text-sm font-semibold text-white shadow-lg"
            >
              Rechercher dans cette zone
            </button>
          )}
        </section>

        {/* Bascule Liste / Carte sur mobile */}
        <button
          onClick={() => setView((v) => (v === "list" ? "map" : "list"))}
          className="fixed bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg lg:hidden"
        >
          {view === "list" ? "Carte" : "Liste"}
        </button>
      </div>
    </div>
  );
}
