import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AgentAvatar, AgentBadge } from "@/components/agent-avatar";
import { PropertyCard } from "@/components/property-card";
import { mediaUrl, whatsappLink } from "@/lib/listings";
import { getAgentPage } from "@/lib/queries";

export async function generateMetadata({ params }: PageProps<"/agents/[id]">): Promise<Metadata> {
  const page = await getAgentPage((await params).id);
  if (!page) return { title: "Agent introuvable" };
  const { agent } = page;
  return {
    title: `${agent.display_name}${agent.agency_name ? ` · ${agent.agency_name}` : ""}`,
    description: agent.bio?.slice(0, 160) ?? `Agent immobilier sur KayAyiti${agent.areas ? ` · ${agent.areas}` : ""}.`,
    openGraph: agent.photo_path ? { images: [mediaUrl(agent.photo_path)] } : undefined,
  };
}

export default function AgentProfilePage({ params }: PageProps<"/agents/[id]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-[60vh] max-w-6xl animate-pulse px-4 py-8" />}>
      <AgentProfile params={params} />
    </Suspense>
  );
}

async function AgentProfile({ params }: Pick<PageProps<"/agents/[id]">, "params">) {
  const page = await getAgentPage((await params).id);
  if (!page) notFound();
  const { agent, listings, closedCount } = page;

  const message = `Bonjour ${agent.display_name}, j'ai vu votre profil sur KayAyiti.`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <section className="flex flex-col gap-6 rounded-3xl border border-line bg-white p-6 sm:flex-row sm:items-center sm:p-8">
        <AgentAvatar agent={agent} size={112} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">{agent.display_name}</h1>
            <AgentBadge />
          </div>
          {agent.agency_name && <p className="mt-1 font-medium text-ink">{agent.agency_name}</p>}
          {agent.areas && <p className="mt-1 text-sm text-muted">Zones : {agent.areas}</p>}
          {agent.license_number && <p className="mt-1 text-xs text-muted">Licence n° {agent.license_number}</p>}

          <dl className="mt-4 flex gap-6 text-sm">
            <div>
              <dt className="text-muted">Biens en ligne</dt>
              <dd className="text-xl font-extrabold text-navy-900">{listings.length}</dd>
            </div>
            <div>
              <dt className="text-muted">Vendus ou loués</dt>
              <dd className="text-xl font-extrabold text-navy-900">{closedCount}</dd>
            </div>
          </dl>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:w-56">
          {agent.whatsapp && (
            <a
              href={whatsappLink(agent.whatsapp, message)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-xl bg-[#25D366] px-5 py-3 font-semibold text-white hover:brightness-95"
            >
              WhatsApp
            </a>
          )}
          {agent.phone && (
            <a href={`tel:${agent.phone.replace(/\s/g, "")}`} className="btn-ghost">Appeler · {agent.phone}</a>
          )}
          {agent.email && <a href={`mailto:${agent.email}`} className="btn-ghost text-sm">{agent.email}</a>}
        </div>
      </section>

      {agent.bio && (
        <section className="mt-8 max-w-3xl">
          <h2 className="text-lg font-bold text-navy-900">À propos</h2>
          <p className="mt-2 whitespace-pre-line leading-relaxed text-ink/90">{agent.bio}</p>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-bold text-navy-900">Biens proposés</h2>
        {listings.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aucun bien en ligne pour le moment.</p>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
