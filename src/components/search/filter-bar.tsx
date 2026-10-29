"use client";

import { useEffect, useState } from "react";
import { PROPERTY_TYPES, type Currency, type PropertyType, type TransactionType } from "@/lib/listings";
import type { SearchFilters } from "@/lib/queries";

type Panel = "prix" | "chambres" | "type" | null;
type Go = (patch: Partial<SearchFilters>) => void;

const BEDS = [1, 2, 3, 4, 5];

const chip = (active: boolean) =>
  `shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
    active ? "border-navy-900 bg-navy-900 text-white" : "border-line bg-white text-ink hover:border-navy-700/40"
  }`;

const amount = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });

export function FilterBar({ filters, go }: { filters: SearchFilters; go: Go }) {
  const [panel, setPanel] = useState<Panel>(null);
  const toggle = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p));
  const apply: Go = (patch) => {
    setPanel(null);
    go(patch);
  };

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanel(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  const priceActive = Boolean(filters.minPrice || filters.maxPrice);
  const cur = filters.currency ?? "HTG";
  const priceLabel = !priceActive
    ? "Prix"
    : filters.minPrice && filters.maxPrice
      ? `${amount.format(filters.minPrice)} – ${amount.format(filters.maxPrice)} ${cur}`
      : filters.minPrice
        ? `Dès ${amount.format(filters.minPrice)} ${cur}`
        : `Jusqu'à ${amount.format(filters.maxPrice!)} ${cur}`;

  const hasFilters = Boolean(
    filters.q || filters.transaction || filters.type || priceActive || filters.bedrooms || filters.bounds,
  );

  return (
    <div className="border-b border-line bg-white">
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
        <form
          className="relative w-56 shrink-0 sm:w-72"
          onSubmit={(e) => {
            e.preventDefault();
            const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
            apply({ q: q || undefined });
          }}
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden>
            <circle cx="9" cy="9" r="6" />
            <path d="m14 14 4 4" strokeLinecap="round" />
          </svg>
          <input
            key={filters.q ?? ""}
            name="q"
            defaultValue={filters.q}
            placeholder="Commune, quartier…"
            className="field !rounded-full !py-2 !pl-9 text-sm"
            aria-label="Rechercher une commune ou un quartier"
          />
        </form>

        <div className="flex shrink-0 rounded-full border border-line bg-sand-50 p-0.5">
          {([undefined, "location", "vente"] as (TransactionType | undefined)[]).map((t) => (
            <button
              key={t ?? "tout"}
              type="button"
              onClick={() => apply({ transaction: t })}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                filters.transaction === t ? "bg-white text-navy-900 shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              {t ? (t === "location" ? "Louer" : "Acheter") : "Tout"}
            </button>
          ))}
        </div>

        <button type="button" onClick={() => toggle("prix")} className={chip(priceActive || panel === "prix")}>
          {priceLabel}
        </button>
        <button type="button" onClick={() => toggle("chambres")} className={chip(Boolean(filters.bedrooms) || panel === "chambres")}>
          {filters.bedrooms ? `${filters.bedrooms}+ ch.` : "Chambres"}
        </button>
        <button type="button" onClick={() => toggle("type")} className={chip(Boolean(filters.type) || panel === "type")}>
          {filters.type ? PROPERTY_TYPES[filters.type] : "Type de bien"}
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={() =>
              apply({ q: undefined, transaction: undefined, type: undefined, minPrice: undefined, maxPrice: undefined, currency: undefined, bedrooms: undefined, bounds: undefined })
            }
            className="shrink-0 px-2 text-sm font-medium text-navy-700 hover:underline"
          >
            Effacer
          </button>
        )}
      </div>

      {/* Panneau sous la barre : évite d'être coupé par le défilement horizontal sur mobile */}
      {panel && (
        <div className="border-t border-line bg-white px-4 py-4">
          {panel === "prix" && <PricePanel filters={filters} apply={apply} />}
          {panel === "chambres" && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => apply({ bedrooms: undefined })} className={chip(!filters.bedrooms)}>
                Tous
              </button>
              {BEDS.map((n) => (
                <button key={n} type="button" onClick={() => apply({ bedrooms: n })} className={chip(filters.bedrooms === n)}>
                  {n}+
                </button>
              ))}
            </div>
          )}
          {panel === "type" && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => apply({ type: undefined })} className={chip(!filters.type)}>
                Tous
              </button>
              {(Object.entries(PROPERTY_TYPES) as [PropertyType, string][]).map(([v, l]) => (
                <button key={v} type="button" onClick={() => apply({ type: v })} className={chip(filters.type === v)}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PricePanel({ filters, apply }: { filters: SearchFilters; apply: Go }) {
  const toNumber = (v: FormDataEntryValue | null) => {
    const n = Number(String(v ?? "").trim());
    return n > 0 ? n : undefined;
  };

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const minPrice = toNumber(form.get("minPrice"));
        const maxPrice = toNumber(form.get("maxPrice"));
        apply({ minPrice, maxPrice, currency: minPrice || maxPrice ? (form.get("currency") as Currency) : undefined });
      }}
    >
      <label className="w-32">
        <span className="label">Minimum</span>
        <input name="minPrice" type="number" min={1} inputMode="numeric" defaultValue={filters.minPrice} className="field" />
      </label>
      <label className="w-32">
        <span className="label">Maximum</span>
        <input name="maxPrice" type="number" min={1} inputMode="numeric" defaultValue={filters.maxPrice} className="field" />
      </label>
      <label className="w-28">
        <span className="label">Devise</span>
        <select name="currency" defaultValue={filters.currency ?? "HTG"} className="field">
          <option value="HTG">HTG</option>
          <option value="USD">USD</option>
        </select>
      </label>
      <button className="btn-primary">Appliquer</button>
      {(filters.minPrice || filters.maxPrice) && (
        <button
          type="button"
          onClick={() => apply({ minPrice: undefined, maxPrice: undefined, currency: undefined })}
          className="btn-ghost"
        >
          Réinitialiser
        </button>
      )}
      <p className="w-full text-xs text-muted">Seules les annonces dans la devise choisie sont filtrées.</p>
    </form>
  );
}
