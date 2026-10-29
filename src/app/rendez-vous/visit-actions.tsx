"use client";

import { useState, useTransition } from "react";
import { cancelVisit, respondVisit, type ActionResult } from "@/app/actions";

function useAction() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<ActionResult>, onOk?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.ok) onOk?.();
      else setError(result.error);
    });
  };
  return { error, pending, run };
}

// Actions de l'agent / du propriétaire sur une demande reçue
export function OwnerVisitActions({ id, status }: { id: string; status: "en_attente" | "confirmee" }) {
  const { error, pending, run } = useAction();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <form
        className="mt-3 grid gap-2 rounded-xl bg-sand-50 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          // L'heure saisie est celle de l'appareil : convertie en date absolue avant l'envoi
          const scheduledAt = new Date(String(form.get("scheduled_at"))).toISOString();
          run(() => respondVisit(id, "confirmee", scheduledAt, String(form.get("note") ?? "")), () => setConfirming(false));
        }}
      >
        <label className="text-sm">
          <span className="label">Date et heure</span>
          <input name="scheduled_at" type="datetime-local" required className="field" />
        </label>
        <label className="text-sm">
          <span className="label">Note (facultatif)</span>
          <input name="note" maxLength={300} placeholder="Point de rendez-vous, documents à apporter…" className="field" />
        </label>
        <div className="flex gap-2">
          <button disabled={pending} className="btn-primary !py-2.5 text-sm">{pending ? "…" : "Confirmer"}</button>
          <button type="button" onClick={() => setConfirming(false)} className="btn-ghost !py-2.5 text-sm">Retour</button>
        </div>
        {error && <p className="text-sm text-red-700 sm:col-span-3">{error}</p>}
      </form>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => setConfirming(true)} className="btn-primary !py-2 text-sm">
        {status === "en_attente" ? "Confirmer une date" : "Changer la date"}
      </button>
      {status === "confirmee" && (
        <button type="button" disabled={pending} onClick={() => run(() => respondVisit(id, "effectuee", null, ""))} className="btn-ghost !py-2 text-sm">
          Visite effectuée
        </button>
      )}
      <button type="button" disabled={pending} onClick={() => run(() => respondVisit(id, "refusee", null, ""))} className="btn-ghost !py-2 text-sm text-red-700">
        {status === "en_attente" ? "Refuser" : "Annuler la visite"}
      </button>
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </div>
  );
}

// Annulation par le visiteur
export function RequesterCancel({ id }: { id: string }) {
  const { error, pending, run } = useAction();
  return (
    <div className="mt-3">
      <button type="button" disabled={pending} onClick={() => run(() => cancelVisit(id))} className="btn-ghost !py-2 text-sm text-red-700">
        {pending ? "…" : "Annuler ma demande"}
      </button>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
