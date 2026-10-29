"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { REPORT_REASONS } from "@/lib/listings";
import { reportProperty, type ReportResult } from "@/app/actions";

const MESSAGES: Record<Exclude<ReportResult, { ok: true }>["error"], string> = {
  auth: "Connectez-vous pour signaler une annonce.",
  duplicate: "Vous avez déjà signalé cette annonce.",
  invalid: "Choisissez un motif.",
  server: "Une erreur est survenue. Réessayez.",
};

export function ReportForm({ propertyId }: { propertyId: string }) {
  const [result, setResult] = useState<ReportResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (result?.ok) {
    return (
      <p className="rounded-2xl border border-line bg-white p-5 text-sm text-ink">
        Merci. Notre équipe va examiner cette annonce.
      </p>
    );
  }

  return (
    <details className="rounded-2xl border border-line bg-white p-5 text-sm">
      <summary className="cursor-pointer font-medium text-muted">Signaler cette annonce</summary>
      <form
        className="mt-4 space-y-3"
        action={(form) =>
          startTransition(async () => {
            setResult(
              await reportProperty(propertyId, String(form.get("reason")), String(form.get("details") ?? "")),
            );
          })
        }
      >
        <select name="reason" required defaultValue="" className="field">
          <option value="" disabled>Motif</option>
          {Object.entries(REPORT_REASONS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <textarea name="details" rows={3} maxLength={1000} placeholder="Détails (facultatif)" className="field" />
        {result && !result.ok && (
          <p className="text-red-700">
            {MESSAGES[result.error]}{" "}
            {result.error === "auth" && (
              <Link href={`/connexion?next=/annonces/${propertyId}`} className="font-semibold underline">
                Se connecter
              </Link>
            )}
          </p>
        )}
        <button disabled={pending} className="btn-ghost w-full">
          {pending ? "Envoi…" : "Envoyer le signalement"}
        </button>
      </form>
    </details>
  );
}
