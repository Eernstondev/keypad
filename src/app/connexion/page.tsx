import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">Bienvenue sur KayAyiti</h1>
      <p className="mt-2 text-muted">Connectez-vous ou créez votre compte en quelques secondes.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
