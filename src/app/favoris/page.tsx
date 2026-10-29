import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PROPERTY_COLUMNS } from "@/lib/queries";
import type { Property } from "@/lib/listings";
import { PropertyCard } from "@/components/property-card";

export const metadata: Metadata = { title: "Mes favoris" };

export default function FavoritesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">Mes favoris</h1>
      <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-2xl bg-sand-100" />}>
        <Favorites />
      </Suspense>
    </div>
  );
}

async function Favorites() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/connexion?next=/favoris");

  // RLS : seuls les favoris de l'utilisateur et les annonces visibles sont renvoyés
  const { data, error } = await supabase
    .from("favorites")
    .select(`created_at, properties(${PROPERTY_COLUMNS})`)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Impossible de charger vos favoris.");

  const listings = (data ?? [])
    .map((f) => f.properties as unknown as Property | null)
    .filter((p): p is Property => p !== null && p.status === "publie");

  if (listings.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-line bg-white px-6 py-14 text-center">
        <p className="font-semibold text-navy-900">Aucun favori pour l&apos;instant.</p>
        <p className="mt-1 text-sm text-muted">Touchez le cœur sur une annonce pour la retrouver ici.</p>
        <Link href="/" className="btn-primary mt-5">Parcourir les annonces</Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((p) => (
        <PropertyCard key={p.id} property={p} />
      ))}
    </div>
  );
}
