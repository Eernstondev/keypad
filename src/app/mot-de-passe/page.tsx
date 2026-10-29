import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Mot de passe", robots: { index: false } };

export default function PasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">Choisir un mot de passe</h1>
      <p className="mt-2 text-muted">Vous vous connecterez ensuite avec votre e-mail et ce mot de passe.</p>
      <Suspense fallback={<div className="mt-8 h-48 animate-pulse rounded-2xl bg-sand-100" />}>
        <AuthedForm />
      </Suspense>
    </div>
  );
}

async function AuthedForm() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/mot-de-passe");
  return <PasswordForm email={user.email ?? ""} />;
}
