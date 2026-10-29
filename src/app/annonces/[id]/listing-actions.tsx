"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function track(propertyId: string, kind: "view" | "whatsapp") {
  // Statistique non bloquante : une erreur réseau ne doit jamais gêner le visiteur
  void createClient()
    .rpc("track_listing_event", { p_property_id: propertyId, p_kind: kind })
    .then(() => undefined, () => undefined);
}

// Une vue comptée par annonce et par session de navigation
export function ViewTracker({ propertyId }: { propertyId: string }) {
  useEffect(() => {
    const key = `ka-vu-${propertyId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Stockage indisponible (navigation privée) : on compte quand même
    }
    track(propertyId, "view");
  }, [propertyId]);

  return null;
}

export function WhatsAppButton({ propertyId, href }: { propertyId: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track(propertyId, "whatsapp")}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 font-semibold text-white transition hover:brightness-95"
    >
      Contacter sur WhatsApp
    </a>
  );
}

// Partage natif du téléphone ; sinon copie du lien ; sinon WhatsApp
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => undefined); // annulation : rien à faire
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`, "_blank", "noopener");
    }
  }

  return (
    <button type="button" onClick={share} className="btn-ghost !py-2 text-sm">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4" aria-hidden>
        <path d="M10 3v10M6 7l4-4 4 4M4 12v4h12v-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {copied ? "Lien copié" : "Partager"}
    </button>
  );
}
