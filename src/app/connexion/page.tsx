import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">Connexion</h1>
      <p className="mt-2 text-muted">Recevez un code par e-mail. Pas de mot de passe à retenir.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
