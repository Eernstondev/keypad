import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { coverPath, formatPrice, locationLabel, mediaUrl, type Property } from "@/lib/listings";
import { PROPERTY_COLUMNS } from "@/lib/queries";
import { VerifiedBadge } from "@/components/verified-badge";
import { closeListing, deleteListing, setListingStatus, signOut } from "@/app/actions";

export const metadata: Metadata = { title: "Mes annonces" };

const expiryFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "America/Port-au-Prince" });

export default function MyListingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">Mes annonces</h1>
        <Link href="/publier" className="btn-primary">Nouvelle annonce</Link>
      </div>
      <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-2xl bg-sand-100" />}>
        <MyListings />
      </Suspense>
      <form action={signOut} className="mt-10 text-center">
        <button className="text-sm text-muted underline">Se déconnecter</button>
      </form>
    </div>
  );
}

async function MyListings() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/connexion?next=/mes-annonces");

  const { data, error } = await supabase
    .from("properties")
    .select(`${PROPERTY_COLUMNS}, expires_at, view_count, whatsapp_clicks, closed_reason, closed_at`)
    .eq("owner_id", auth.claims.sub)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Impossible de charger vos annonces.");
  const listings = (data ?? []) as (Property & {
    expires_at: string;
    view_count: number;
    whatsapp_clicks: number;
    closed_reason: "vendu" | "loue" | null;
    closed_at: string | null;
  })[];

  if (listings.length === 0) {
    return (
      <p className="mt-8 rounded-2xl border border-line bg-white p-8 text-center text-muted">
        Vous n&apos;avez encore publié aucune annonce.
      </p>
    );
  }

  return (
    <ul className="mt-8 space-y-3">
      {listings.map((p) => {
        const cover = coverPath(p);
        const archived = p.status === "archive";
        const closed = p.closed_reason !== null;
        return (
          <li key={p.id} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-3 sm:flex-row sm:items-center">
            <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-sand-100 sm:w-36">
              {cover && <Image src={mediaUrl(cover)} alt="" fill sizes="144px" className="object-cover" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    closed ? "bg-gold-100 text-gold-600" : archived ? "bg-sand-100 text-muted" : "bg-navy-100 text-navy-900"
                  }`}
                >
                  {closed ? (p.closed_reason === "vendu" ? "Vendu" : "Loué") : archived ? "Archivée" : "En ligne"}
                </span>
                {p.verified && <VerifiedBadge />}
              </div>
              <p className="mt-1 truncate font-semibold text-ink">{p.title}</p>
              <p className="text-sm text-muted">{formatPrice(p)} · {locationLabel(p)}</p>
              {!archived && (
                <p className="mt-0.5 text-xs text-muted">En ligne jusqu&apos;au {expiryFormat.format(new Date(p.expires_at))}</p>
              )}
              {!p.is_demo && (
                <p className="mt-1.5 text-xs font-medium text-navy-700">
                  {p.view_count} vue{p.view_count > 1 ? "s" : ""} · {p.whatsapp_clicks} contact{p.whatsapp_clicks > 1 ? "s" : ""} WhatsApp
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!archived && <Link href={`/annonces/${p.id}`} className="btn-ghost !py-2 text-sm">Voir</Link>}
              {!closed && (
                <>
                  <Link href={`/mes-annonces/${p.id}/modifier`} className="btn-ghost !py-2 text-sm">Modifier</Link>
                  {/* Remettre en ligne ou prolonger : 60 jours (90 pour les agents) */}
                  <form action={setListingStatus.bind(null, p.id, "publie")}>
                    <button className="btn-ghost !py-2 text-sm">{archived ? "Remettre en ligne" : "Prolonger"}</button>
                  </form>
                </>
              )}
              {!archived && (
                <form action={setListingStatus.bind(null, p.id, "archive")}>
                  <button className="btn-ghost !py-2 text-sm">Archiver</button>
                </form>
              )}
              {!closed && (
                <details className="relative">
                  <summary className="btn-primary cursor-pointer list-none !py-2 text-sm">
                    {p.transaction_type === "vente" ? "Vendu" : "Loué"}
                  </summary>
                  <form
                    action={closeListing.bind(null, p.id, p.transaction_type === "vente" ? "vendu" : "loue")}
                    className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-line bg-white p-3 shadow-lg"
                  >
                    <p className="text-sm text-ink">
                      L&apos;annonce sera retirée du site et les visites prévues seront annulées. Cette action est définitive.
                    </p>
                    <button className="btn-primary mt-3 w-full !py-2 text-sm">
                      Confirmer : {p.transaction_type === "vente" ? "bien vendu" : "bien loué"}
                    </button>
                  </form>
                </details>
              )}
              {/* Confirmation sans JavaScript */}
              <details className="relative">
                <summary className="btn-ghost cursor-pointer list-none !py-2 text-sm text-red-700">Supprimer</summary>
                <form
                  action={deleteListing.bind(null, p.id)}
                  className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-line bg-white p-3 shadow-lg"
                >
                  <p className="text-sm text-ink">Supprimer définitivement cette annonce et ses photos ?</p>
                  <button className="mt-3 w-full rounded-lg bg-red-700 py-2 text-sm font-semibold text-white">
                    Confirmer
                  </button>
                </form>
              </details>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
