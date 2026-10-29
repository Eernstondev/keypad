"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// N'accepte qu'un chemin interne pour éviter les redirections ouvertes
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/mes-annonces";
}

type Step = "login" | "signup" | "verify" | "forgot" | "reset";

const MIN_PASSWORD = 8;
const RESEND_DELAY = 60;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [step, setStep] = useState<Step>(params.get("mode") === "inscription" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(
    params.get("erreur") === "lien" ? "Ce lien est expiré ou déjà utilisé. Connectez-vous avec votre mot de passe." : null,
  );
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Délai avant de pouvoir redemander un code
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const supabase = () => createClient();
  const cleanEmail = () => email.trim().toLowerCase();

  function go(nextStep: Step) {
    setStep(nextStep);
    setError(null);
    setInfo(null);
  }

  function done() {
    router.replace(next);
    router.refresh();
  }

  // Lance une action asynchrone avec état de chargement et message d'erreur
  async function run(action: () => Promise<string | null | void>) {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const message = await action();
      if (message) setError(message);
    } catch {
      setError("Connexion internet instable. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  const rateLimited = (status?: number) =>
    status === 429 ? "Trop de tentatives. Patientez quelques minutes avant de réessayer." : null;
  // Service d'e-mail de démarrage de Supabase : n'envoie qu'aux adresses autorisées
  const mailRefused = (code?: string) =>
    code === "email_address_not_authorized"
      ? "L'envoi d'e-mail vers cette adresse n'est pas encore activé. Contactez-nous pour finaliser votre inscription."
      : null;

  function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    void run(async () => {
      const { error } = await supabase().auth.signInWithPassword({ email: cleanEmail(), password });
      if (!error) return done();
      if (error.code === "email_not_confirmed") {
        // Compte créé mais e-mail jamais validé : on renvoie un code
        await supabase().auth.resend({ type: "signup", email: cleanEmail() });
        setCooldown(RESEND_DELAY);
        setStep("verify");
        setInfo("Votre e-mail n'est pas encore validé. Nous venons de vous envoyer un nouveau code.");
        return;
      }
      return rateLimited(error.status) ?? "E-mail ou mot de passe incorrect.";
    });
  }

  function signup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== String(form.get("confirm") ?? "")) return setError("Les deux mots de passe ne correspondent pas.");

    void run(async () => {
      const { data, error } = await supabase().auth.signUp({
        email: cleanEmail(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) {
        if (error.code === "weak_password") return `Mot de passe trop faible : ${MIN_PASSWORD} caractères minimum, avec lettres et chiffres.`;
        if (error.code === "user_already_exists" || error.code === "email_exists") return "Un compte existe déjà avec cet e-mail. Connectez-vous.";
        return mailRefused(error.code) ?? rateLimited(error.status) ?? "Inscription impossible. Vérifiez l'adresse e-mail.";
      }
      // Validation d'e-mail désactivée dans Supabase : session ouverte directement
      if (data.session) return done();
      // Adresse déjà inscrite (Supabase masque volontairement cette information)
      if (data.user && data.user.identities?.length === 0) return "Un compte existe déjà avec cet e-mail. Connectez-vous.";
      setCooldown(RESEND_DELAY);
      setStep("verify");
    });
  }

  function verify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = String(new FormData(e.currentTarget).get("code") ?? "").trim();
    void run(async () => {
      const { error } = await supabase().auth.verifyOtp({ email: cleanEmail(), token, type: "signup" });
      if (!error) return done();
      return rateLimited(error.status) ?? "Code invalide ou expiré. Demandez un nouveau code.";
    });
  }

  function resendSignupCode() {
    void run(async () => {
      const { error } = await supabase().auth.resend({ type: "signup", email: cleanEmail() });
      if (error) return mailRefused(error.code) ?? rateLimited(error.status) ?? "Envoi impossible pour le moment.";
      setCooldown(RESEND_DELAY);
      setInfo("Nouveau code envoyé.");
    });
  }

  function forgot(e: React.FormEvent) {
    e.preventDefault();
    void run(async () => {
      const { error } = await supabase().auth.resetPasswordForEmail(cleanEmail(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/mot-de-passe`,
      });
      if (error) return mailRefused(error.code) ?? rateLimited(error.status) ?? "Envoi impossible. Vérifiez l'adresse.";
      setCooldown(RESEND_DELAY);
      setStep("reset");
    });
  }

  function reset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const token = String(form.get("code") ?? "").trim();
    const password = String(form.get("password") ?? "");
    void run(async () => {
      const client = supabase();
      const { error } = await client.auth.verifyOtp({ email: cleanEmail(), token, type: "recovery" });
      if (error) return rateLimited(error.status) ?? "Code invalide ou expiré.";
      const { error: updateError } = await client.auth.updateUser({ password });
      if (updateError) {
        return updateError.code === "weak_password"
          ? `Mot de passe trop faible : ${MIN_PASSWORD} caractères minimum.`
          : updateError.code === "same_password"
            ? "Choisissez un mot de passe différent de l'ancien."
            : "Impossible d'enregistrer le mot de passe.";
      }
      done();
    });
  }

  const emailInput = (
    <Field label="Adresse e-mail" htmlFor="email">
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
    </Field>
  );

  const codeInput = (
    <Field label="Code reçu par e-mail (facultatif si vous cliquez sur le lien)" htmlFor="code">
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
    </Field>
  );

  const messages = (
    <>
      {info && <p className="rounded-xl bg-navy-100 p-3 text-sm text-navy-900">{info}</p>}
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    </>
  );

  const submit = (label: string, busy: string) => (
    <button disabled={loading} className="btn-primary w-full">{loading ? busy : label}</button>
  );

  if (step === "verify" || step === "reset") {
    return (
      <form onSubmit={step === "verify" ? verify : reset} className="mt-8 space-y-4">
        <p className="rounded-xl bg-navy-100 p-3 text-sm text-navy-900">
          E-mail envoyé à <span className="font-semibold">{cleanEmail()}</span>.{" "}
          {step === "verify"
            ? "Cliquez sur le lien de l'e-mail pour activer votre compte, ou saisissez le code s'il y en a un."
            : "Cliquez sur le lien de l'e-mail pour choisir un nouveau mot de passe, ou saisissez le code s'il y en a un."}{" "}
          Vérifiez aussi les spams.
        </p>
        {codeInput}
        {step === "reset" && (
          <Field label="Nouveau mot de passe" htmlFor="password">
            <input id="password" name="password" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" className="field" />
          </Field>
        )}
        {messages}
        {submit(step === "verify" ? "Valider mon e-mail" : "Enregistrer le mot de passe", "Vérification…")}
        <div className="flex items-center justify-between text-sm">
          <button type="button" onClick={() => go(step === "verify" ? "login" : "forgot")} className="text-muted underline">
            Retour
          </button>
          <button
            type="button"
            disabled={cooldown > 0 || loading}
            onClick={step === "verify" ? resendSignupCode : (e) => forgot(e)}
            className="font-medium text-navy-700 disabled:text-muted"
          >
            {cooldown > 0 ? `Renvoyer le code (${cooldown} s)` : "Renvoyer le code"}
          </button>
        </div>
      </form>
    );
  }

  if (step === "forgot") {
    return (
      <form onSubmit={forgot} className="mt-8 space-y-4">
        <p className="text-sm text-muted">Recevez un code par e-mail pour choisir un nouveau mot de passe.</p>
        {emailInput}
        {messages}
        {submit("Recevoir un code", "Envoi…")}
        <button type="button" onClick={() => go("login")} className="w-full text-sm text-muted underline">
          Retour à la connexion
        </button>
      </form>
    );
  }

  return (
    <div className="mt-8">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-sand-100 p-1" role="tablist">
        {(["login", "signup"] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={step === s}
            onClick={() => go(s)}
            className={`rounded-lg py-2 text-sm font-semibold transition ${step === s ? "bg-white text-navy-900 shadow-sm" : "text-muted"}`}
          >
            {s === "login" ? "Se connecter" : "Créer un compte"}
          </button>
        ))}
      </div>

      {step === "login" ? (
        <form onSubmit={login} className="mt-6 space-y-4">
          {emailInput}
          <Field label="Mot de passe" htmlFor="password">
            <input id="password" name="password" type="password" required autoComplete="current-password" className="field" />
          </Field>
          {messages}
          {submit("Se connecter", "Connexion…")}
          <button type="button" onClick={() => go("forgot")} className="w-full text-sm text-navy-700 hover:underline">
            Mot de passe oublié ?
          </button>
        </form>
      ) : (
        <form onSubmit={signup} className="mt-6 space-y-4">
          {emailInput}
          <Field label="Mot de passe" htmlFor="password">
            <input id="password" name="password" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" className="field" />
          </Field>
          <Field label="Confirmer le mot de passe" htmlFor="confirm">
            <input id="confirm" name="confirm" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" className="field" />
          </Field>
          <p className="text-xs text-muted">{MIN_PASSWORD} caractères minimum. Un code vous sera envoyé une seule fois pour valider votre e-mail.</p>
          {messages}
          {submit("Créer mon compte", "Création…")}
        </form>
      )}
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">{label}</label>
      {children}
    </div>
  );
}
