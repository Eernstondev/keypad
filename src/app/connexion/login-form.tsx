"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// N'accepte qu'un chemin interne pour éviter les redirections ouvertes
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/mes-annonces";
}

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({ email: email.trim() });
    setLoading(false);
    if (error) {
      setError(
        error.status === 429 ? "Trop de tentatives. Patientez une minute." : "Envoi impossible. Vérifiez l'adresse.",
      );
      return;
    }
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = String(new FormData(e.currentTarget).get("code") ?? "").trim();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token, type: "email" });
    if (error) {
      setLoading(false);
      setError("Code invalide ou expiré.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  if (step === "code") {
    return (
      <form onSubmit={verifyCode} className="mt-8 space-y-4">
        <p className="text-sm text-muted">
          Code envoyé à <span className="font-medium text-ink">{email}</span>. Pensez à vérifier les spams.
        </p>
        <div>
          <label htmlFor="code" className="label">Code reçu</label>
          <input
            id="code"
            name="code"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6,10}"
            className="field text-center text-lg tracking-[0.3em]"
            autoFocus
          />
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button disabled={loading} className="btn-primary w-full">{loading ? "Vérification…" : "Se connecter"}</button>
        <button type="button" onClick={() => setStep("email")} className="w-full text-sm text-muted underline">
          Changer d&apos;adresse
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="mt-8 space-y-4">
      <div>
        <label htmlFor="email" className="label">Adresse e-mail</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
          placeholder="vous@exemple.com"
        />
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button disabled={loading} className="btn-primary w-full">{loading ? "Envoi…" : "Recevoir mon code"}</button>
    </form>
  );
}
