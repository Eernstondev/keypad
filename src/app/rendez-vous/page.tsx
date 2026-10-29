import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VISIT_STATUS, VISIT_TIMES, whatsappLink, type VisitStatus, type VisitTime } from "@/lib/listings";
import { OwnerVisitActions, RequesterCancel } from "./visit-actions";

export const metadata: Metadata = { title: "Rendez-vous", robots: { index: false } };

type Visit = {
  id: string;
  property_id: string;
  name: string;
  phone: string;
  preferred_date: string;
  preferred_time: VisitTime;
  message: string | null;
  status: VisitStatus;
  scheduled_at: string | null;
  owner_note: string | null;
  owner_id: string;
  requester_id: string;
  properties: { title: string; commune: string } | null;
};

const TZ = "America/Port-au-Prince";
const dayFormat = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const slotFormat = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: TZ });

const STATUS_STYLE: Record<VisitStatus, string> = {
  en_attente: "bg-gold-100 text-gold-600",
  confirmee: "bg-navy-900 text-white",
  refusee: "bg-red-50 text-red-700",
  annulee: "bg-sand-100 text-muted",
  effectuee: "bg-navy-100 text-navy-900",
};

const ACTIVE: VisitStatus[] = ["en_attente", "confirmee"];

export default function VisitsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">Rendez-vous</h1>
      <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-2xl bg-sand-100" />}>
        <Visits />
      </Suspense>
    </div>
  );
}

async function Visits() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/connexion?next=/rendez-vous");
  const userId = auth.claims.sub;

  // userId vient du jeton vérifié (UUID) ; la RLS limite de toute façon aux deux parties
  const { data, error } = await supabase
    .from("visit_requests")
    .select("id, property_id, name, phone, preferred_date, preferred_time, message, status, scheduled_at, owner_note, owner_id, requester_id, properties(title, commune)")
    .or(`owner_id.eq.${userId},requester_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error("Impossible de charger vos rendez-vous.");
  const visits = (data ?? []) as unknown as Visit[];

  // Demandes à traiter en premier, puis l'historique
  const byActivity = (a: Visit, b: Visit) => Number(ACTIVE.includes(b.status)) - Number(ACTIVE.includes(a.status));
  const received = visits.filter((v) => v.owner_id === userId).sort(byActivity);
  const mine = visits.filter((v) => v.requester_id === userId).sort(byActivity);

  return (
    <div className="mt-8 space-y-12">
      {received.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-navy-900">
            Demandes reçues
            <span className="ml-2 text-sm font-medium text-muted">
              {received.filter((v) => v.status === "en_attente").length} en attente
            </span>
          </h2>
          <ul className="mt-4 space-y-3">
            {received.map((v) => (
              <VisitItem key={v.id} visit={v} side="owner" />
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-lg font-bold text-navy-900">Mes demandes de visite</h2>
        {mine.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-line bg-white px-6 py-10 text-center">
            <p className="text-muted">Vous n&apos;avez demandé aucune visite.</p>
            <Link href="/" className="btn-ghost mt-4">Parcourir les annonces</Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {mine.map((v) => (
              <VisitItem key={v.id} visit={v} side="requester" />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function VisitItem({ visit: v, side }: { visit: Visit; side: "owner" | "requester" }) {
  const title = v.properties?.title ?? "Annonce retirée";
  const wishedDay = dayFormat.format(new Date(`${v.preferred_date}T12:00:00Z`));
  const replyMessage = `Bonjour ${v.name}, je vous contacte au sujet de votre demande de visite pour « ${title} » sur KayAyiti.`;

  return (
    <li className="rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {v.properties ? (
            <Link href={`/annonces/${v.property_id}`} className="font-semibold text-ink hover:underline">{title}</Link>
          ) : (
            <p className="font-semibold text-muted">{title}</p>
          )}
          {v.properties && <p className="text-sm text-muted">{v.properties.commune}</p>}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[v.status]}`}>
          {VISIT_STATUS[v.status]}
        </span>
      </div>

      <dl className="mt-3 grid gap-1 text-sm">
        {v.status === "confirmee" && v.scheduled_at ? (
          <div>
            <dt className="inline text-muted">Visite prévue : </dt>
            <dd className="inline font-semibold text-navy-900">{slotFormat.format(new Date(v.scheduled_at))}</dd>
          </div>
        ) : (
          <div>
            <dt className="inline text-muted">Souhaitée : </dt>
            <dd className="inline text-ink">{wishedDay} · {VISIT_TIMES[v.preferred_time]}</dd>
          </div>
        )}
        {side === "owner" && (
          <div>
            <dt className="inline text-muted">Demandeur : </dt>
            <dd className="inline text-ink">{v.name} · {v.phone}</dd>
          </div>
        )}
        {v.message && (
          <div>
            <dt className="inline text-muted">Message : </dt>
            <dd className="inline text-ink">{v.message}</dd>
          </div>
        )}
        {v.owner_note && (
          <div>
            <dt className="inline text-muted">Note : </dt>
            <dd className="inline text-ink">{v.owner_note}</dd>
          </div>
        )}
      </dl>

      {side === "owner" && ACTIVE.includes(v.status) && (
        <>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <a href={whatsappLink(v.phone, replyMessage)} target="_blank" rel="noopener noreferrer" className="font-medium text-navy-700 hover:underline">
              Écrire sur WhatsApp
            </a>
            <a href={`tel:${v.phone.replace(/\s/g, "")}`} className="font-medium text-navy-700 hover:underline">Appeler</a>
          </div>
          <OwnerVisitActions id={v.id} status={v.status as "en_attente" | "confirmee"} />
        </>
      )}
      {side === "requester" && ACTIVE.includes(v.status) && <RequesterCancel id={v.id} />}
    </li>
  );
}
