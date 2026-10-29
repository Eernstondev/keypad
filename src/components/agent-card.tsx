import Link from "next/link";
import { whatsappLink, type Agent } from "@/lib/listings";
import { AgentAvatar, AgentBadge } from "./agent-avatar";

// Carte « Présenté par » sur la fiche d'une annonce publiée par un agent
export function AgentCard({ agent, listingTitle }: { agent: Agent; listingTitle: string }) {
  const message = `Bonjour ${agent.display_name}, je vous contacte depuis KayAyiti au sujet de « ${listingTitle} ».`;

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Présenté par</p>
      <Link href={`/agents/${agent.id}`} className="mt-3 flex items-center gap-3">
        <AgentAvatar agent={agent} size={56} />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-bold text-navy-900">{agent.display_name}</span>
            <AgentBadge />
          </span>
          {agent.agency_name && <span className="block truncate text-sm text-muted">{agent.agency_name}</span>}
        </span>
      </Link>

      <div className="mt-4 grid gap-2 text-sm">
        {agent.phone && (
          <a href={`tel:${agent.phone.replace(/\s/g, "")}`} className="btn-ghost !justify-start !py-2">
            Appeler · {agent.phone}
          </a>
        )}
        {agent.whatsapp && (
          <a href={whatsappLink(agent.whatsapp, message)} target="_blank" rel="noopener noreferrer" className="btn-ghost !justify-start !py-2">
            WhatsApp de l&apos;agent
          </a>
        )}
        <Link href={`/agents/${agent.id}`} className="pt-1 text-center font-medium text-navy-700 hover:underline">
          Voir le profil et ses autres biens
        </Link>
      </div>
    </div>
  );
}
