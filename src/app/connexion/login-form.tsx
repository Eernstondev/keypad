"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// N'accepte qu'un chemin interne pour éviter les redirections ouvertes
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/mes-annonces";
}

type Mode = "code" | "password";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [mode, setMode] = useState<Mode>("code");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(
    params.get("erreur") === "lien" ? "Ce lien de connexion est expiré ou déjà utilisé. Demandez un nouveau code." : null,
  );
  const [loading, setLoading] = useState(false);

  function done() {
    router.replace(next);
    router.refresh();
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      // Le lien de l'e-mail revient ici et ouvre la session (le code à 6 chiffres marche aussi)
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setLoading(false);
    if (error) {
      setError(
        error.status === 429
          ? "Trop de demandes d'e-mail. Patientez quelques minutes ou utilisez le mot de passe."
          : "Envoi impossible. Vérifiez l'adresse.",
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
    done();
  }

  async function signInWithPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setLoading(false);
      setError(
        error.status === 429 ? "Trop de tentatives. Patientez une minute." : "E-mail ou mot de passe incorrect.",
      );
      return;
    }
    done();
  }

  const emailField = (
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
  );

  return (
    <div className="mt-8">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-sand-100 p-1" role="tablist">
        {(["code", "password"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setStep("email");
              setError(null);
            }}
            className={`rounded-lg py-2 text-sm font-semibold transition ${mode === m ? "bg-white text-navy-900 shadow-sm" : "text-muted"}`}
          >
            {m === "code" ? "Code par e-mail" : "Mot de passe"}
          </button>
        ))}
      </div>

      {mode === "password" ? (
        <form onSubmit={signInWithPassword} className="mt-6 space-y-4">
          {emailField}
          <div>
            <label htmlFor="password" className="label">Mot de passe</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className="field" />
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button disabled={loading} className="btn-primary w-full">{loading ? "Connexion…" : "Se connecter"}</button>
        </form>
      ) : step === "code" ? (
        <form onSubmit={verifyCode} className="mt-6 space-y-4">
          <p className="text-sm text-muted">
            E-mail envoyé à <span className="font-medium text-ink">{email}</span>. Entrez le code reçu, ou cliquez
            simplement sur le lien de l&apos;e-mail. Pensez à vérifier les spams.
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
      ) : (
        <form onSubmit={sendCode} className="mt-6 space-y-4">
          {emailField}
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button disabled={loading} className="btn-primary w-full">{loading ? "Envoi…" : "Recevoir mon code"}</button>
        </form>
      )}
    </div>
  );
}
