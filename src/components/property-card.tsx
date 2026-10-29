import Image from "next/image";
import Link from "next/link";
import {
  PROPERTY_TYPES,
  TRANSACTION_TYPES,
  coverPath,
  formatPrice,
  locationLabel,
  mediaUrl,
  type Property,
} from "@/lib/listings";
import { AgentAvatar } from "./agent-avatar";
import { FavoriteButton } from "./favorites";
import { VerifiedBadge } from "./verified-badge";

export function PropertyCard({ property: p }: { property: Property }) {
  const cover = coverPath(p);

  return (
    <div className="relative transition hover:-translate-y-0.5">
      <Link
        href={`/annonces/${p.id}`}
        className="block overflow-hidden rounded-2xl border border-line bg-white transition hover:shadow-[0_12px_30px_-12px_rgb(12_35_77/0.25)]"
      >
        <div className="relative aspect-[4/3] bg-sand-100">
          {cover ? (
            <Image
              src={mediaUrl(cover)}
              alt={p.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted">Pas de photo</div>
          )}
          <div className="absolute left-3 top-3 flex gap-1.5">
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-navy-900">
              {TRANSACTION_TYPES[p.transaction_type]}
            </span>
            {p.is_demo && (
              <span className="rounded-full bg-ink/80 px-2.5 py-1 text-xs font-semibold text-white">Démo</span>
            )}
          </div>
          {p.verified && <VerifiedBadge className="absolute bottom-3 left-3" />}
        </div>

        <div className="space-y-1.5 p-4">
          <p className="text-lg font-bold text-navy-900">{formatPrice(p)}</p>
          <h3 className="line-clamp-1 font-medium text-ink">{p.title}</h3>
          <p className="line-clamp-1 text-sm text-muted">{locationLabel(p)}</p>
          <p className="pt-1 text-xs text-muted">
            {[
              PROPERTY_TYPES[p.property_type],
              p.bedrooms ? `${p.bedrooms} ch.` : null,
              p.area_m2 ? `${p.area_m2} m²` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {p.agent && (
            <p className="flex items-center gap-2 border-t border-line pt-2.5 text-xs text-muted">
              <AgentAvatar agent={p.agent} size={22} />
              <span className="truncate">
                <span className="font-semibold text-ink">{p.agent.display_name}</span>
                {p.agent.agency_name && ` · ${p.agent.agency_name}`}
              </span>
            </p>
          )}
        </div>
      </Link>

      {/* Hors du lien : un bouton dans un lien serait du HTML invalide */}
      <FavoriteButton propertyId={p.id} className="absolute right-3 top-3" />
    </div>
  );
}
