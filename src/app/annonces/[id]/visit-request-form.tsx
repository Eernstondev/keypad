"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSignedIn } from "@/components/favorites";
import { VISIT_TIMES, whatsappLink, type VisitTime } from "@/lib/listings";
import { requestVisit } from "@/app/actions";

// Date locale au format AAAA-MM-JJ (champ <input type="date">)
const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T12:00:00Z`),
  );

// ownerLabel : « l'agent » ou « le propriétaire » ; contactWhatsapp : numéro à prévenir
export function VisitRequestForm({
  propertyId,
  ownerLabel,
  contactWhatsapp,
  listingTitle,
}: {
  propertyId: string;
  ownerLabel: string;
  contactWhatsapp: string;
  listingTitle: string;
}) {
  const signedIn = useSignedIn();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ name: string; date: string; time: VisitTime } | null>(null);
  const [pending, startTransition] = useTransition();

  if (sent) {
    // Le message WhatsApp accélère la réponse : la plupart des agents vivent sur WhatsApp
    const message = `Bonjour, je suis ${sent.name}. Je viens de demander une visite sur KayAyiti pour « ${listingTitle} », le ${dayLabel(sent.date)} (${VISIT_TIMES[sent.time].toLowerCase()}). Merci de me confirmer.`;
    return (
      <div className="rounded-2xl border border-navy-700/30 bg-navy-100 p-5 text-sm text-navy-900">
        <p className="font-semibold">Demande envoyée.</p>
        <p className="mt-1">
          La date vous sera confirmée par {ownerLabel}. Suivez votre demande dans{" "}
          <Link href="/rendez-vous" className="font-semibold underline">Mes rendez-vous</Link>.
        </p>
        <a
          href={whatsappLink(contactWhatsapp, message)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center rounded-xl bg-[#25D366] px-4 py-2.5 font-semibold text-white hover:brightness-95"
        >
          Prévenir {ownerLabel} sur WhatsApp
        </a>
      </div>
    );
  }

  if (!open) {
    return signedIn ? (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary w-full !py-3">
        Demander une visite
      </button>
    ) : (
      <Link href={`/connexion?next=/annonces/${propertyId}`} className="btn-primary w-full !py-3">
        Se connecter pour demander une visite
      </Link>
    );
  }

  const today = new Date();
  const max = new Date();
  max.setDate(max.getDate() + 60);

  return (
    <form
      className="space-y-3 rounded-2xl border border-line bg-white p-5"
      action={(form) => {
        setError(null);
        startTransition(async () => {
          const result = await requestVisit(propertyId, form);
          if (result.ok)
            setSent({
              name: String(form.get("name") ?? "").trim(),
              date: String(form.get("preferred_date") ?? ""),
              time: String(form.get("preferred_time") ?? "matin") as VisitTime,
            });
          else setError(result.error);
        });
      }}
    >
      <p className="font-semibold text-navy-900">Demander une visite</p>
      <div>
        <label htmlFor="visit-name" className="label">Votre nom</label>
        <input id="visit-name" name="name" required minLength={2} maxLength={80} autoComplete="name" className="field" />
      </div>
      <div>
        <label htmlFor="visit-phone" className="label">Téléphone</label>
        <input id="visit-phone" name="phone" required type="tel" inputMode="tel" pattern="\+?[0-9 ]{8,16}"
          autoComplete="tel" placeholder="3844 9148" className="field" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="visit-date" className="label">Date souhaitée</label>
          <input id="visit-date" name="preferred_date" type="date" required min={isoDay(today)} max={isoDay(max)}
            defaultValue={isoDay(today)} className="field" />
        </div>
        <div>
          <label htmlFor="visit-time" className="label">Moment</label>
          <select id="visit-time" name="preferred_time" className="field">
            {Object.entries(VISIT_TIMES).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="visit-message" className="label">Message (facultatif)</label>
        <textarea id="visit-message" name="message" rows={2} maxLength={500} className="field"
          placeholder="Questions, nombre de personnes…" />
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button disabled={pending} className="btn-primary w-full">{pending ? "Envoi…" : "Envoyer la demande"}</button>
      <p className="text-xs text-muted">Votre nom et votre numéro sont transmis uniquement à {ownerLabel}.</p>
    </form>
  );
}
