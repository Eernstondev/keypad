import Image from "next/image";
import { initials, mediaUrl, type Agent } from "@/lib/listings";

// Photo de l'agent, ou ses initiales s'il n'en a pas encore
export function AgentAvatar({ agent, size }: { agent: Pick<Agent, "display_name" | "photo_path">; size: number }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-navy-900 font-semibold text-white ring-2 ring-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {agent.photo_path ? (
        <Image src={mediaUrl(agent.photo_path)} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        initials(agent.display_name)
      )}
    </span>
  );
}

export function AgentBadge() {
  return (
    <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-gold-600">
      Agent pro
    </span>
  );
}
