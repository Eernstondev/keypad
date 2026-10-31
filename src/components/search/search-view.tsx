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

  const noun = filters.cat === "espaces" ? "espaces" : filters.cat === "logements" ? "logements" : "biens";
  const stays = filters.cat === "sejours";
  const label =
    filters.transaction === "location" ? `${noun} à louer` : filters.transaction === "vente" ? `${noun} à vendre` : "annonces";

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
            {stays && (
              <div className="mb-5 rounded-2xl border border-gold-500/30 bg-gold-100/60 px-5 py-4">
                <p className="font-bold text-navy-900">Séjours courte durée</p>
                <p className="mt-1 text-sm text-ink/80">
                  Maisons et appartements à la nuit, pour un week-end, des vacances ou une visite au pays. Choisissez vos
                  dates pour ne voir que les logements libres.
                </p>
                <Link href="/publier?periode=nuit" className="mt-2 inline-block text-sm font-semibold text-navy-700 underline">
                  Louez votre logement à la nuit
                </Link>
              </div>
            )}
            {filters.cat === "espaces" && (
              <div className="mb-5 rounded-2xl border border-gold-500/30 bg-gold-100/60 px-5 py-4">
                <p className="font-bold text-navy-900">Espaces pro &amp; événements</p>
                <p className="mt-1 text-sm text-ink/80">
                  Salles de réception, bureaux et salles de réunion, locaux commerciaux, entrepôts. À l&apos;heure, à la
                  journée ou au mois.
                </p>
                <Link href="/publier?type=espace_evenementiel" className="mt-2 inline-block text-sm font-semibold text-navy-700 underline">
                  Vous avez un espace à louer ? Publiez-le
                </Link>
              </div>
            )}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                <span className="text-base font-bold text-navy-900">{total}</span> {stays ? (total > 1 ? "séjours" : "séjour") : label}
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
        <section className={`absolute inset-0 lg:static lg:flex-1 ${view === "list" ? "max-lg:invisible" : ""}`}>
          <PropertyMap
            markers={markers}
            activeId={activeId}
            onMarkerHover={setActiveId}
            onBoundsChange={setMovedTo}
            bounds={filters.bounds}
            wheelZoom
            className="h-full w-full"
          />
          <AroundMe onFound={(bounds) => go({ bounds })} />
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

// Recherche dans un rayon d'environ 3 km autour de la position de l'utilisateur
function AroundMe({ onFound }: { onFound: (bounds: MapBounds) => void }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  function locate() {
    if (!navigator.geolocation) return setState("error");
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setState("idle");
        const dLat = 0.027; // ≈ 3 km
        const dLng = 0.028;
        const r = (n: number) => Math.round(n * 1e4) / 1e4;
        onFound({
          n: r(coords.latitude + dLat),
          s: r(coords.latitude - dLat),
          e: r(coords.longitude + dLng),
          w: r(coords.longitude - dLng),
        });
      },
      () => setState("error"),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  return (
    <button
      type="button"
      onClick={locate}
      disabled={state === "loading"}
      className="absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-navy-900 shadow-md ring-1 ring-black/5 hover:bg-sand-50"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5" aria-hidden>
        <path d="M10 2a6 6 0 0 0-6 6c0 4.2 6 10 6 10s6-5.8 6-10a6 6 0 0 0-6-6Zm0 8.2A2.2 2.2 0 1 1 10 5.8a2.2 2.2 0 0 1 0 4.4Z" />
      </svg>
      {state === "loading" ? "Localisation…" : state === "error" ? "Position indisponible" : "Autour de moi"}
    </button>
  );
}
