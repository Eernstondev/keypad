import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PROPERTY_COLUMNS } from "@/lib/queries";
import type { Property } from "@/lib/listings";
import { PublishForm } from "@/app/publier/publish-form";

export const metadata: Metadata = { title: "Modifier l'annonce" };

export default function EditListingPage({ params }: PageProps<"/mes-annonces/[id]/modifier">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">Modifier l&apos;annonce</h1>
      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-2xl bg-sand-100" />}>
        <EditForm params={params} />
      </Suspense>
    </div>
  );
}

async function EditForm({ params }: Pick<PageProps<"/mes-annonces/[id]/modifier">, "params">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect(`/connexion?next=/mes-annonces/${id}/modifier`);

  // Filtre sur le propriétaire : on ne charge jamais l'annonce d'un autre
  const { data } = await supabase
    .from("properties")
    .select(PROPERTY_COLUMNS)
    .eq("id", id)
    .eq("owner_id", auth.claims.sub)
    .maybeSingle();

  if (!data) notFound();
  return <PublishForm userId={auth.claims.sub} initial={data as Property} />;
}
