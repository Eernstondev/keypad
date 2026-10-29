"use client";

import { useActionState } from "react";
import { adminGrantAgent, type ActionResult } from "@/app/actions";

// Activation d'un agent après paiement : l'agent doit s'être connecté une fois avec cet e-mail
export function AgentGrantForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(adminGrantAgent, null);

  return (
    <form action={action} className="grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
      <label>
        <span className="label">E-mail de connexion de l&apos;agent</span>
        <input name="email" type="email" required placeholder="agent@exemple.com" className="field" />
      </label>
      <label>
        <span className="label">Durée</span>
        <select name="months" defaultValue="1" className="field">
          <option value="1">1 mois</option>
          <option value="3">3 mois</option>
          <option value="6">6 mois</option>
          <option value="12">12 mois</option>
        </select>
      </label>
      <button disabled={pending} className="btn-primary">{pending ? "Activation…" : "Activer l'accès"}</button>
      {state && (
        <p className={`text-sm sm:col-span-3 ${state.ok ? "text-navy-700" : "text-red-700"}`}>
          {state.ok ? state.message : state.error}
        </p>
      )}
    </form>
  );
}
