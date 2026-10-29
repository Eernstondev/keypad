import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AgentCard } from "@/components/agent-card";
import { FavoriteButton } from "@/components/favorites";
import { PropertyMap } from "@/components/map";
import { PropertyCard } from "@/components/property-card";
import { VerifiedBadge } from "@/components/verified-badge";
import {
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
  coverPath,
  formatPrice,
  locationLabel,
  mediaUrl,
  whatsappLink,
  type Property,
} from "@/lib/listings";
import { getProperty, getSimilarProperties } from "@/lib/queries";
import { ShareButton, ViewTracker, WhatsAppButton } from "./listing-actions";
import { ReportForm } from "./report-form";
import { VisitRequestForm } from "./visit-request-form";

export async function generateMetadata({ params }: PageProps<"/annonces/[id]">): Promise<Metadata> {
  const p = await getProperty((await params).id);
  if (!p) return { title: "Annonce introuvable" };

  const cover = coverPath(p);
  return {
    title: `${p.title} — ${formatPrice(p)}`,
    description: `${TRANSACTION_TYPES[p.transaction_type]} · ${locationLabel(p)}`,
    openGraph: cover ? { images: [mediaUrl(cover)] } : undefined,
  };
}

export default function ListingPage({ params }: PageProps<"/annonces/[id]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-6xl animate-pulse px-4 py-8" />}>
      <Listing params={params} />
    </Suspense>
  );
}

async function Listing({ params }: Pick<PageProps<"/annonces/[id]">, "params">) {
  const p = await getProperty((await params).id);
  if (!p) notFound();

  const photos = [...p.property_media].sort((a, b) => a.position - b.position);
  const specs = [
    ["Type", PROPERTY_TYPES[p.property_type]],
    ["Chambres", p.bedrooms],
    ["Salles de bain", p.bathrooms],
    ["Surface", p.area_m2 ? `${p.area_m2} m²` : null],
  ].filter(([, v]) => v !== null && v !== undefined);

  const message = `Bonjour, je suis intéressé(e) par votre annonce KayAyiti : « ${p.title} » (${formatPrice(p)}). Est-elle toujours disponible ?`;

  return (
    <article className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {p.is_demo && (
        <p className="mb-4 rounded-xl bg-ink px-4 py-3 text-sm text-white">
          Annonce de démonstration : ce bien n&apos;existe pas. Elle montre à quoi ressemble une annonce sur KayAyiti.
        </p>
      )}
      {photos.length > 0 ? (
        // Mobile : défilement horizontal. Ordinateur : grande photo + grille, chaque photo s'ouvre en grand.
        <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 md:mx-0 md:grid md:grid-flow-dense md:auto-rows-[190px] md:grid-cols-4 md:overflow-visible md:px-0">
          {photos.map((m, i) => (
            <a
              key={m.storage_path}
              href={mediaUrl(m.storage_path)}
              target="_blank"
              rel="noopener noreferrer"
              className={`relative aspect-[4/3] w-[88%] shrink-0 snap-center overflow-hidden rounded-2xl bg-sand-100 md:aspect-auto md:w-auto ${
                i === 0 ? "md:col-span-2 md:row-span-2" : ""
              } ${photos.length === 1 ? "md:col-span-4" : ""}`}
            >
              <Image
                src={mediaUrl(m.storage_path)}
                alt={`${p.title} — photo ${i + 1}`}
                fill
                priority={i === 0}
                sizes={i === 0 ? "(min-width: 768px) 50vw, 88vw" : "(min-width: 768px) 25vw, 88vw"}
                className="object-cover transition duration-300 hover:scale-[1.02]"
              />
            </a>
          ))}
        </div>
      ) : (
        <div className="grid aspect-[16/7] place-items-center rounded-2xl bg-sand-100 text-muted">Pas de photo</div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-navy-100 px-2.5 py-1 text-xs font-semibold text-navy-900">
                {TRANSACTION_TYPES[p.transaction_type]}
              </span>
              {p.verified && <VerifiedBadge />}
            </div>
            <div className="flex items-center gap-2">
              <ShareButton title={p.title} />
              <FavoriteButton propertyId={p.id} className="border border-line" />
            </div>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">{p.title}</h1>
          <p className="mt-2 text-muted">{locationLabel(p)}</p>

          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {specs.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line bg-white p-3">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          {p.description && (
            <section className="mt-8">
              <h2 className="text-lg font-bold text-navy-900">Description</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-ink/90">{p.description}</p>
            </section>
          )}

          {p.lat !== null && p.lng !== null && (
            <section className="mt-8">
              <h2 className="text-lg font-bold text-navy-900">Emplacement</h2>
              {p.address_hint && <p className="mt-1 text-sm text-muted">{p.address_hint}</p>}
              <div className="mt-3 h-72 overflow-hidden rounded-2xl border border-line">
                <PropertyMap markers={[{ id: p.id, lat: p.lat, lng: p.lng }]} className="h-full w-full" />
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="text-2xl font-extrabold text-navy-900">{formatPrice(p)}</p>
            {p.is_demo ? (
              <p className="mt-4 rounded-xl bg-sand-100 px-5 py-3 text-center text-sm font-medium text-muted">
                Annonce fictive, pas de contact
              </p>
            ) : (
              <>
                <WhatsAppButton propertyId={p.id} href={whatsappLink(p.whatsapp, message)} />
                <div className="mt-3">
                  <VisitRequestForm
                    propertyId={p.id}
                    ownerLabel={p.agent ? "l'agent" : "le propriétaire"}
                    contactWhatsapp={p.agent?.whatsapp ?? p.whatsapp}
                    listingTitle={p.title}
                  />
                </div>
              </>
            )}
          </div>

          {p.agent && <AgentCard agent={p.agent} listingTitle={p.title} />}

          <div className="rounded-2xl border border-gold-500/40 bg-gold-100/60 p-5 text-sm">
            <p className="font-semibold text-navy-900">Avant de payer</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink/80">
              <li>Visitez toujours le bien en personne.</li>
              <li>Ne versez aucune avance avant la visite.</li>
              <li>Pour un achat, faites vérifier le titre par un notaire.</li>
            </ul>
          </div>

          <ReportForm propertyId={p.id} />
        </aside>
      </div>

      {!p.is_demo && <ViewTracker propertyId={p.id} />}
      <Similar property={p} />
    </article>
  );
}

async function Similar({ property }: { property: Property }) {
  const items = await getSimilarProperties(property);
  if (items.length === 0) return null;

  return (
    <section className="mt-14 border-t border-line pt-10">
      <h2 className="text-xl font-bold text-navy-900">Annonces similaires</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p) => (
          <PropertyCard key={p.id} property={p} />
        ))}
      </div>
    </section>
  );
}
