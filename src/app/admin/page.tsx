import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AGENT_COLUMNS, REPORT_REASONS, formatPrice, locationLabel, type Agent, type Property, type ReportReason } from "@/lib/listings";
import { adminExtendAgent, adminRevokeAgent, adminSetListingStatus, setReportStatus, setVerified } from "@/app/actions";
import { AgentAvatar } from "@/components/agent-avatar";
import { AgentGrantForm } from "./agent-grant-form";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Port-au-Prince" });

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">Administration</h1>
      <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-2xl bg-sand-100" />}>
        <AdminContent />
      </Suspense>
    </div>
  );
}

type Report = {
  id: string;
  reason: ReportReason;
  details: string | null;
  property_id: string;
  properties: { title: string } | null;
};

async function AdminContent() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/connexion?next=/admin");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.claims.sub).single();
  if (profile?.role !== "admin") notFound();

  const [reportsRes, propertiesRes, agentsRes] = await Promise.all([
    supabase
      .from("reports")
      .select("id, reason, details, property_id, properties(title)")
      .eq("status", "ouvert")
      .order("created_at", { ascending: false }),
    supabase
      .from("properties")
      .select("id, title, price, currency, price_period, commune, department, neighborhood, verified, status")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("agents").select(AGENT_COLUMNS).order("active_until", { ascending: false }),
  ]);

  const reports = (reportsRes.data ?? []) as unknown as Report[];
  const properties = (propertiesRes.data ?? []) as Property[];
  const agents = (agentsRes.data ?? []) as Agent[];
  // Composant serveur rendu à chaque requête (session lue plus haut) : l'heure courante est voulue
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <div className="mt-8 space-y-10">
      <section>
        <h2 className="text-lg font-bold text-navy-900">Agents immobiliers</h2>
        <p className="mt-1 text-sm text-muted">
          Après paiement, activez l&apos;accès avec l&apos;e-mail que l&apos;agent utilise pour se connecter.
        </p>
        <div className="mt-3">
          <AgentGrantForm />
        </div>
        {agents.length > 0 && (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {agents.map((a) => {
              const until = new Date(a.active_until);
              const active = until.getTime() > now;
              return (
                <li key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <AgentAvatar agent={a} size={40} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {a.display_name}
                        {a.agency_name && <span className="text-muted"> · {a.agency_name}</span>}
                      </p>
                      <p className={`text-sm ${active ? "text-muted" : "text-red-700"}`}>
                        {active ? "Actif jusqu'au" : "Expiré le"} {dateFormat.format(until)}
                        {a.email && ` · ${a.email}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {[1, 3, 12].map((m) => (
                      <form key={m} action={adminExtendAgent.bind(null, a.id, m)}>
                        <button className="btn-ghost !px-3 !py-1.5 text-sm">+{m} mois</button>
                      </form>
                    ))}
                    {active && (
                      <form action={adminRevokeAgent.bind(null, a.id)}>
                        <button className="btn-ghost !px-3 !py-1.5 text-sm text-red-700">Révoquer</button>
                      </form>
                    )}
                    {active && (
                      <Link href={`/agents/${a.id}`} className="btn-ghost !px-3 !py-1.5 text-sm">Profil</Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-navy-900">Signalements ouverts ({reports.length})</h2>
        {reports.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aucun signalement en attente.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{REPORT_REASONS[r.reason]}</p>
                    <Link href={`/annonces/${r.property_id}`} className="text-sm text-navy-700 underline">
                      {r.properties?.title ?? "Annonce"}
                    </Link>
                    {r.details && <p className="mt-1 text-sm text-muted">{r.details}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <form action={setReportStatus.bind(null, r.id, "traite")}>
                      <button className="btn-primary !px-3 !py-1.5 text-sm">Traité</button>
                    </form>
                    <form action={setReportStatus.bind(null, r.id, "rejete")}>
                      <button className="btn-ghost !px-3 !py-1.5 text-sm">Rejeter</button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-navy-900">Dernières annonces</h2>
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          {properties.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Link href={`/annonces/${p.id}`} className="block truncate font-medium text-ink hover:underline">
                  {p.title}
                </Link>
                <p className="text-sm text-muted">
                  {formatPrice(p)} · {locationLabel(p)} {p.status === "archive" && "· archivée"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <form action={setVerified.bind(null, p.id, !p.verified)}>
                  <button className={p.verified ? "btn-ghost !py-1.5 text-sm" : "btn-primary !py-1.5 text-sm"}>
                    {p.verified ? "Retirer le badge" : "Marquer vérifié"}
                  </button>
                </form>
                <form action={adminSetListingStatus.bind(null, p.id, p.status === "archive" ? "publie" : "archive")}>
                  <button className="btn-ghost !py-1.5 text-sm">
                    {p.status === "archive" ? "Remettre en ligne" : "Archiver"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
