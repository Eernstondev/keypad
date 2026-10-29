import { Suspense } from "react";
import Link from "next/link";
import { PropertyCard } from "@/components/property-card";
import { PropertyMap, type MapMarker } from "@/components/map";
import { DEPARTMENTS, PROPERTY_TYPES, TRANSACTION_TYPES, formatPrice } from "@/lib/listings";
import { PAGE_SIZE, parseFilters, searchProperties, type SearchFilters } from "@/lib/queries";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:pt-14">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-600">Immobilier en Haïti</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-navy-900 sm:text-5xl">
            Trouvez la bonne kay, en toute confiance.
          </h1>
          <p className="mt-4 max-w-xl text-muted sm:text-lg">
            Maisons, appartements et terrains à louer ou à vendre. Contactez directement le propriétaire sur
            WhatsApp.
          </p>

          <Suspense fallback={<SearchForm />}>
            <SearchFormFromUrl searchParams={searchParams} />
          </Suspense>
        </div>
      </section>

      <Suspense fallback={<ResultsSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function SearchFormFromUrl({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  return <SearchForm filters={parseFilters(await searchParams)} />;
}

// Formulaire HTML classique (GET) : fonctionne même si le JavaScript ne charge pas
function SearchForm({ filters }: { filters?: SearchFilters }) {
  return (
    <form action="/" className="mt-8 grid gap-3 rounded-2xl border border-line bg-sand-50 p-3 sm:grid-cols-2 lg:grid-cols-6">
      <select name="transaction" defaultValue={filters?.transaction ?? ""} className="field" aria-label="Location ou vente">
        <option value="">Louer ou acheter</option>
        {Object.entries(TRANSACTION_TYPES).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      <select name="type" defaultValue={filters?.type ?? ""} className="field" aria-label="Type de bien">
        <option value="">Tous les biens</option>
        {Object.entries(PROPERTY_TYPES).map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      <select name="department" defaultValue={filters?.department ?? ""} className="field" aria-label="Département">
        <option value="">Tout le pays</option>
        {DEPARTMENTS.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
      <input
        name="commune"
        defaultValue={filters?.commune ?? ""}
        placeholder="Commune (ex. Delmas)"
        className="field"
        aria-label="Commune"
      />
      <div className="flex gap-2">
        <input
          name="maxPrice"
          type="number"
          min={1}
          inputMode="numeric"
          defaultValue={filters?.maxPrice ?? ""}
          placeholder="Prix max"
          className="field min-w-0"
          aria-label="Prix maximum"
        />
        <select name="currency" defaultValue={filters?.currency ?? "HTG"} className="field w-24 shrink-0" aria-label="Devise">
          <option value="HTG">HTG</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <button className="btn-primary">Rechercher</button>
    </form>
  );
}

async function Results({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const filters = parseFilters(await searchParams);
  const { items, total } = await searchProperties(filters);
  const pages = Math.ceil(total / PAGE_SIZE);

  const markers: MapMarker[] = items
    .filter((p) => p.lat !== null && p.lng !== null)
    .map((p) => ({ id: p.id, lat: p.lat!, lng: p.lng!, label: `${formatPrice(p)} · ${p.title}`, href: `/annonces/${p.id}` }));

  const pageHref = (page: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, page })) if (v !== undefined && v !== "") qs.set(k, String(v));
    return `/?${qs}`;
  };

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <p className="text-lg font-semibold text-navy-900">Aucune annonce ne correspond à votre recherche.</p>
        <p className="mt-2 text-muted">Élargissez les filtres ou soyez le premier à publier dans cette zone.</p>
        <Link href="/publier" className="btn-primary mt-6">Publier une annonce</Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <p className="mb-5 text-sm text-muted">
        <span className="font-semibold text-ink">{total}</span> annonce{total > 1 ? "s" : ""}
      </p>

      <div className={markers.length ? "grid gap-6 lg:grid-cols-[1fr_380px]" : ""}>
        {markers.length > 0 && (
          <div className="h-64 overflow-hidden rounded-2xl border border-line lg:sticky lg:top-24 lg:order-2 lg:h-[calc(100vh-8rem)]">
            <PropertyMap markers={markers} className="h-full w-full" />
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:order-1">
          {items.map((p) => (
            <PropertyCard key={p.id} property={p} />
          ))}
        </div>
      </div>

      {pages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination">
          {filters.page > 1 && (
            <Link href={pageHref(filters.page - 1)} className="btn-ghost">Précédent</Link>
          )}
          <span className="text-sm text-muted">Page {filters.page} / {pages}</span>
          {filters.page < pages && (
            <Link href={pageHref(filters.page + 1)} className="btn-ghost">Suivant</Link>
          )}
        </nav>
      )}
    </section>
  );
}

function ResultsSkeleton() {
  return (
    <section className="mx-auto grid max-w-6xl gap-5 px-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-72 animate-pulse rounded-2xl bg-sand-100" />
      ))}
    </section>
  );
}
