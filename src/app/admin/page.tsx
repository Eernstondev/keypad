import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { REPORT_REASONS, formatPrice, locationLabel, type Property, type ReportReason } from "@/lib/listings";
import { setReportStatus, setVerified } from "@/app/actions";

export const metadata: Metadata = { title: "Administration", robots: { index: false } };

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

  const [reportsRes, propertiesRes] = await Promise.all([
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
  ]);

  const reports = (reportsRes.data ?? []) as unknown as Report[];
  const properties = (propertiesRes.data ?? []) as Property[];

  return (
    <div className="mt-8 space-y-10">
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
              <form action={setVerified.bind(null, p.id, !p.verified)}>
                <button className={p.verified ? "btn-ghost !py-1.5 text-sm" : "btn-primary !py-1.5 text-sm"}>
                  {p.verified ? "Retirer le badge" : "Marquer vérifié"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
