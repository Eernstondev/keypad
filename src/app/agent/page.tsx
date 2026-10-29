import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AGENT_COLUMNS, whatsappLink, type Agent } from "@/lib/listings";
import { CONTACT_WHATSAPP } from "@/lib/site";
import { AgentProfileForm } from "./agent-profile-form";

export const metadata: Metadata = { title: "Espace agent", robots: { index: false } };

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Port-au-Prince" });

export default function AgentSpacePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-sand-100" />}>
        <AgentSpace />
      </Suspense>
    </div>
  );
}

async function AgentSpace() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/connexion?next=/agent");
  const userId = auth.claims.sub;
  const email = auth.claims.email as string | undefined;

  const { data } = await supabase.from("agents").select(AGENT_COLUMNS).eq("id", userId).maybeSingle();
  if (!data) return <BecomeAgent email={email} />;

  const agent = data as Agent;
  const until = new Date(agent.active_until);
  // L'heure courante n'est lue qu'au moment de la requête (jamais au pré-rendu)
  await connection();
  // eslint-disable-next-line react-hooks/purity
  const daysLeft = Math.ceil((until.getTime() - Date.now()) / 86_400_000);
  const active = daysLeft > 0;

  const [listingsRes, visitsRes] = await Promise.all([
    supabase.from("properties").select("status, view_count, whatsapp_clicks, closed_reason").eq("owner_id", userId),
    supabase
      .from("visit_requests")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", userId)
      .eq("status", "en_attente"),
  ]);

  const listings = listingsRes.data ?? [];
  const stats = [
    { label: "Annonces en ligne", value: listings.filter((l) => l.status === "publie").length },
    { label: "Vues", value: listings.reduce((n, l) => n + (l.view_count ?? 0), 0) },
    { label: "Contacts WhatsApp", value: listings.reduce((n, l) => n + (l.whatsapp_clicks ?? 0), 0) },
    { label: "Vendus / loués", value: listings.filter((l) => l.closed_reason).length },
  ];
  const pendingVisits = visitsRes.count ?? 0;

  const renewMessage = `Bonjour, je souhaite renouveler mon accès agent KayAyiti (${email ?? agent.display_name}).`;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-600">Espace agent</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">{agent.display_name}</h1>
        </div>
        {active && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/agents/${agent.id}`} className="btn-ghost !py-2 text-sm">Mon profil public</Link>
            <Link href="/publier" className="btn-primary !py-2 text-sm">Publier un bien</Link>
          </div>
        )}
      </div>

      <div
        className={`mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-sm ${
          !active ? "bg-red-50 text-red-900" : daysLeft <= 7 ? "bg-gold-100 text-ink" : "bg-navy-100 text-navy-900"
        }`}
      >
        <p>
          {active ? (
            <>
              Abonnement actif jusqu&apos;au <strong>{dateFormat.format(until)}</strong>
              {daysLeft <= 7 && ` (plus que ${daysLeft} jour${daysLeft > 1 ? "s" : ""})`}.
            </>
          ) : (
            <>
              Abonnement expiré le <strong>{dateFormat.format(until)}</strong>. Votre profil public et votre badge sont
              masqués ; vos annonces restent en ligne comme celles d&apos;un particulier.
            </>
          )}
        </p>
        {(!active || daysLeft <= 7) && (
          <a href={whatsappLink(CONTACT_WHATSAPP, renewMessage)} target="_blank" rel="noopener noreferrer" className="btn-primary !py-2 text-sm">
            Renouveler
          </a>
        )}
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-white p-4">
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className="mt-1 text-2xl font-extrabold text-navy-900">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link href="/rendez-vous" className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 hover:border-navy-700/40">
          <span className="font-semibold text-ink">Demandes de visite</span>
          {pendingVisits > 0 ? (
            <span className="rounded-full bg-navy-900 px-2.5 py-0.5 text-sm font-bold text-white">{pendingVisits} en attente</span>
          ) : (
            <span className="text-sm text-muted">Aucune en attente</span>
          )}
        </Link>
        <Link href="/mes-annonces" className="flex items-center justify-between rounded-2xl border border-line bg-white p-4 hover:border-navy-700/40">
          <span className="font-semibold text-ink">Gérer mes annonces</span>
          <span className="text-sm text-muted">Modifier, prolonger, vendu / loué</span>
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-bold text-navy-900">Profil professionnel</h2>
        {active ? (
          <AgentProfileForm agent={agent} />
        ) : (
          <p className="rounded-2xl border border-line bg-white p-5 text-sm text-muted">
            Renouvelez votre abonnement pour modifier votre profil.
          </p>
        )}
      </section>
    </>
  );
}

const BENEFITS = [
  ["Profil professionnel", "Votre photo, votre agence, vos zones et vos contacts sur chacune de vos annonces."],
  ["Badge « Agent pro »", "Vos annonces se distinguent dans les résultats de recherche."],
  ["Demandes de visite", "Les clients réservent une visite directement ; vous confirmez la date en un clic."],
  ["Plus de visibilité", "30 annonces par jour au lieu de 5, en ligne 90 jours au lieu de 60."],
  ["Statistiques", "Vues et contacts WhatsApp pour chaque bien, à montrer à vos propriétaires."],
  ["Page agent publique", "Une page à partager avec tous vos biens et votre nombre de ventes et locations."],
];

function BecomeAgent({ email }: { email?: string }) {
  const message = `Bonjour, je suis agent immobilier et je souhaite un accès agent sur KayAyiti. Mon e-mail de connexion : ${email ?? ""}`;

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gold-600">Agents immobiliers</p>
      <h1 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
        Développez votre activité avec KayAyiti.
      </h1>
      <p className="mt-3 max-w-xl text-muted">
        Un espace professionnel pour présenter vos biens, recevoir des demandes de visite et suivre vos résultats.
      </p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {BENEFITS.map(([title, text]) => (
          <li key={title} className="rounded-2xl border border-line bg-white p-5">
            <p className="font-semibold text-navy-900">{title}</p>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </li>
        ))}
      </ul>

      <div className="mt-8 rounded-2xl bg-navy-900 p-6 text-white">
        <p className="text-lg font-bold">Devenir agent partenaire</p>
        <p className="mt-1 text-sm text-white/80">
          Écrivez-nous sur WhatsApp. Après le paiement de l&apos;abonnement, votre accès est activé sur ce compte
          {email && <> (<strong>{email}</strong>)</>}.
        </p>
        <a
          href={whatsappLink(CONTACT_WHATSAPP, message)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex rounded-xl bg-gold-500 px-5 py-2.5 font-semibold text-navy-950 hover:brightness-105"
        >
          Demander mon accès agent
        </a>
      </div>
    </>
  );
}
