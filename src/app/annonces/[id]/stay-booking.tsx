"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useSignedIn } from "@/components/favorites";
import { formatPrice, nightsBetween, whatsappLink, type Currency } from "@/lib/listings";
import { requestStay } from "@/app/actions";

type Range = { check_in: string; check_out: string };

// Dates manipulées en AAAA-MM-JJ (UTC) : aucun décalage de fuseau possible
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (day: string, n: number) => iso(new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000));
const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const shortDay = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const fmt = (day: string) => shortDay.format(new Date(`${day}T12:00:00Z`));
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function localToday() {
  const now = new Date();
  return iso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function StayBooking({
  propertyId,
  price,
  currency,
  minNights,
  maxGuests,
  booked,
  isDemo,
  listingTitle,
  contactWhatsapp,
  ownerLabel,
}: {
  propertyId: string;
  price: number;
  currency: Currency;
  minNights: number;
  maxGuests: number | null;
  booked: Range[];
  isDemo: boolean;
  listingTitle: string;
  contactWhatsapp: string;
  ownerLabel: string;
}) {
  const signedIn = useSignedIn();
  const [today] = useState(localToday);
  const [monthOffset, setMonthOffset] = useState(0);
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ name: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // Nuits occupées (le jour du départ reste libre pour une nouvelle arrivée)
  const bookedNights = useMemo(() => {
    const set = new Set<string>();
    for (const r of booked) for (let d = r.check_in; d < r.check_out; d = addDays(d, 1)) set.add(d);
    return set;
  }, [booked]);

  const nights = start && end ? nightsBetween(start, end) : 0;

  function pick(day: string) {
    setHint(null);
    if (!start || end || day <= start) {
      if (bookedNights.has(day)) return setHint("Cette nuit est déjà réservée.");
      setStart(day);
      setEnd(null);
      return;
    }
    for (let d = start; d < day; d = addDays(d, 1)) {
      if (bookedNights.has(d)) return setHint("La période contient des nuits déjà réservées.");
    }
    if (nightsBetween(start, day) < minNights) return setHint(`Séjour minimum : ${minNights} nuit${minNights > 1 ? "s" : ""}.`);
    if (nightsBetween(start, day) > 90) return setHint("Séjour maximum : 90 nuits.");
    setEnd(day);
  }

  const first = new Date(`${today}T00:00:00Z`);
  const months = [0, 1].map((i) => new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + monthOffset + i, 1)));

  if (sent && start && end) {
    const msg = `Bonjour, je suis ${sent.name}. Je viens de demander une réservation sur KayAyiti pour « ${listingTitle} » du ${fmt(start)} au ${fmt(end)} (${nights} nuit${nights > 1 ? "s" : ""}). Merci de me confirmer.`;
    return (
      <div className="rounded-2xl border border-navy-700/30 bg-navy-100 p-5 text-sm text-navy-900">
        <p className="font-semibold">Demande de réservation envoyée.</p>
        <p className="mt-1">
          Vos dates vous seront confirmées par {ownerLabel}. Suivez votre demande dans{" "}
          <Link href="/rendez-vous" className="font-semibold underline">Rendez-vous</Link>.
        </p>
        <a
          href={whatsappLink(contactWhatsapp, msg)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center rounded-xl bg-[#25D366] px-4 py-2.5 font-semibold text-white hover:brightness-95"
        >
          Prévenir {ownerLabel} sur WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-navy-900">Disponibilités</p>
          <div className="flex gap-1">
            <button type="button" aria-label="Mois précédent" disabled={monthOffset === 0}
              onClick={() => setMonthOffset((m) => m - 1)} className="rounded-lg px-2.5 py-1 text-lg leading-none text-muted hover:bg-sand-50 disabled:opacity-30">‹</button>
            <button type="button" aria-label="Mois suivant" disabled={monthOffset >= 10}
              onClick={() => setMonthOffset((m) => m + 1)} className="rounded-lg px-2.5 py-1 text-lg leading-none text-muted hover:bg-sand-50 disabled:opacity-30">›</button>
          </div>
        </div>

        <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {months.map((m) => {
            const lead = (m.getUTCDay() + 6) % 7; // semaine commençant le lundi
            const count = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 0)).getUTCDate();
            return (
              <div key={iso(m)}>
                <p className="mb-1 text-center text-sm font-medium capitalize text-ink">{monthLabel.format(m)}</p>
                <div className="grid grid-cols-7 text-center text-[11px] text-muted">
                  {WEEKDAYS.map((w, i) => <span key={i}>{w}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-y-0.5 text-center text-sm">
                  {Array.from({ length: lead }, (_, i) => <span key={`x${i}`} />)}
                  {Array.from({ length: count }, (_, i) => {
                    const day = iso(new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), i + 1)));
                    const past = day < today;
                    const taken = bookedNights.has(day);
                    const edge = day === start || day === end;
                    const inside = Boolean(start && end && day > start && day < end);
                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={past || isDemo}
                        onClick={() => pick(day)}
                        aria-label={`${fmt(day)}${taken ? ", réservé" : ""}`}
                        aria-pressed={edge}
                        className={`mx-auto grid size-8 place-items-center rounded-full transition ${
                          edge
                            ? "bg-navy-900 font-semibold text-white"
                            : inside
                              ? "bg-navy-100 text-navy-900"
                              : taken
                                ? "text-muted/60 line-through"
                                : past
                                  ? "text-muted/40"
                                  : "text-ink hover:bg-sand-100"
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">
          {isDemo
            ? "Calendrier de démonstration."
            : start && !end
              ? `Arrivée le ${fmt(start)} : choisissez la date de départ.`
              : "Touchez la date d'arrivée puis celle du départ. Les dates barrées sont réservées."}
          {minNights > 1 && ` Minimum ${minNights} nuits.`}
        </p>
        {hint && <p className="mt-1 text-xs font-medium text-red-700">{hint}</p>}
      </div>

      {start && end && (
        <div className="rounded-2xl border border-line bg-white p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">{fmt(start)} → {fmt(end)}</span>
            <button type="button" onClick={() => { setStart(null); setEnd(null); }} className="text-navy-700 underline">
              Effacer
            </button>
          </div>
          <div className="mt-2 flex justify-between">
            <span>{formatPrice({ price, currency, price_period: null })} × {nights} nuit{nights > 1 ? "s" : ""}</span>
            <span className="font-bold text-navy-900">{formatPrice({ price: price * nights, currency, price_period: null })}</span>
          </div>
          <p className="mt-1 text-xs text-muted">Total indicatif, à confirmer avec {ownerLabel}. Aucun paiement sur KayAyiti.</p>
        </div>
      )}

      {isDemo ? null : !signedIn ? (
        <Link href="/connexion" className="btn-primary w-full !py-3">Se connecter pour réserver</Link>
      ) : !(start && end) ? (
        <button type="button" disabled className="btn-primary w-full !py-3">Choisissez vos dates</button>
      ) : (
        <form
          className="space-y-3 rounded-2xl border border-line bg-white p-5"
          action={(form) => {
            setError(null);
            form.set("check_in", start);
            form.set("check_out", end);
            startTransition(async () => {
              const result = await requestStay(propertyId, form);
              if (result.ok) setSent({ name: String(form.get("name") ?? "").trim() });
              else setError(result.error);
            });
          }}
        >
          <p className="font-semibold text-navy-900">Demander à réserver</p>
          <div>
            <label htmlFor="stay-guests" className="label">Voyageurs</label>
            <select id="stay-guests" name="guests" className="field" defaultValue="1">
              {Array.from({ length: Math.min(maxGuests ?? 10, 50) }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1} voyageur{i ? "s" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="stay-name" className="label">Votre nom</label>
            <input id="stay-name" name="name" required minLength={2} maxLength={80} autoComplete="name" className="field" />
          </div>
          <div>
            <label htmlFor="stay-phone" className="label">Téléphone / WhatsApp</label>
            <input id="stay-phone" name="phone" required type="tel" inputMode="tel" pattern="\+?[0-9 ]{8,16}" autoComplete="tel"
              placeholder="3xxx xxxx" className="field" />
          </div>
          <div>
            <label htmlFor="stay-message" className="label">Message (facultatif)</label>
            <textarea id="stay-message" name="message" rows={2} maxLength={500} className="field"
              placeholder="Heure d'arrivée, motif du séjour…" />
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button disabled={pending} className="btn-primary w-full !py-3">
            {pending ? "Envoi…" : `Demander ${nights} nuit${nights > 1 ? "s" : ""}`}
          </button>
        </form>
      )}
    </div>
  );
}
