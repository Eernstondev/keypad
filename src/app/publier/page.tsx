import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { PublishForm } from "./publish-form";

export const metadata: Metadata = { title: "Publier une annonce" };

export default function PublishPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">Publier une annonce</h1>
      <p className="mt-2 text-muted">Gratuit. Votre annonce est en ligne dès la validation du formulaire.</p>
      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-2xl bg-sand-100" />}>
        <AuthedForm />
      </Suspense>
    </div>
  );
}

async function AuthedForm() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/publier");

  // Agent : son WhatsApp professionnel est proposé par défaut
  const supabase = await createClient();
  const { data: agent } = await supabase.from("agents").select("whatsapp").eq("id", user.id).maybeSingle();
  return <PublishForm userId={user.id} defaultWhatsapp={agent?.whatsapp ?? undefined} />;
}
