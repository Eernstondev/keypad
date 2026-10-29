import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AgentAvatar, AgentBadge } from "@/components/agent-avatar";
import { listAgents } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Agents immobiliers",
  description: "Les agents immobiliers partenaires de KayAyiti, partout en Haïti.",
};

export default function AgentsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">Agents immobiliers</h1>
          <p className="mt-1 text-muted">Des professionnels pour vous accompagner, de la visite à la signature.</p>
        </div>
        <Link href="/agent" className="btn-ghost !py-2 text-sm">Vous êtes agent ?</Link>
      </div>
      <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-2xl bg-sand-100" />}>
        <AgentList />
      </Suspense>
    </div>
  );
}

async function AgentList() {
  // Lu à la demande (puis mis en cache) : le build ne dépend pas de la base de données
  await connection();
  const agents = await listAgents();

  if (agents.length === 0) {
    return <p className="mt-8 rounded-2xl border border-line bg-white p-8 text-center text-muted">Aucun agent pour le moment.</p>;
  }

  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map((a) => (
        <li key={a.id}>
          <Link
            href={`/agents/${a.id}`}
            className="flex h-full items-center gap-4 rounded-2xl border border-line bg-white p-5 transition hover:border-navy-700/40"
          >
            <AgentAvatar agent={a} size={64} />
            <span className="min-w-0">
              <span className="block truncate font-bold text-navy-900">{a.display_name}</span>
              {a.agency_name && <span className="block truncate text-sm text-muted">{a.agency_name}</span>}
              {a.areas && <span className="mt-1 block truncate text-xs text-muted">{a.areas}</span>}
              <span className="mt-2 inline-block"><AgentBadge /></span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
