"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD = 8;

export function PasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) return setError("Les deux mots de passe ne correspondent pas.");

    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setLoading(false);
      return setError(
        error.code === "weak_password"
          ? `Mot de passe trop faible : ${MIN_PASSWORD} caractères minimum, avec lettres et chiffres.`
          : error.code === "same_password"
            ? "C'est déjà votre mot de passe actuel."
            : "Impossible d'enregistrer le mot de passe. Réessayez.",
      );
    }
    router.replace("/mes-annonces");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      {email && (
        <p className="rounded-xl bg-sand-100 px-3 py-2 text-sm text-muted">
          Compte : <span className="font-medium text-ink">{email}</span>
        </p>
      )}
      <div>
        <label htmlFor="password" className="label">Nouveau mot de passe</label>
        <input id="password" name="password" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" className="field" />
      </div>
      <div>
        <label htmlFor="confirm" className="label">Confirmer le mot de passe</label>
        <input id="confirm" name="confirm" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" className="field" />
      </div>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button disabled={loading} className="btn-primary w-full">{loading ? "Enregistrement…" : "Enregistrer le mot de passe"}</button>
    </form>
  );
}
