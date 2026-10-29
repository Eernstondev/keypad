"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type FavoritesValue = {
  ids: Set<string>;
  signedIn: boolean;
  toggle: (propertyId: string) => Promise<void>;
};

const FavoritesContext = createContext<FavoritesValue | null>(null);

// Charge une seule fois les favoris de l'utilisateur connecté, puis les garde à jour.
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const loadedFor = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;

    async function load(uid: string | null) {
      if (loadedFor.current === uid) return; // même compte : rien à recharger
      loadedFor.current = uid;
      setUserId(uid);
      if (!uid) return setIds(new Set());
      const { data } = await supabase.from("favorites").select("property_id");
      if (active && loadedFor.current === uid) setIds(new Set((data ?? []).map((f) => f.property_id as string)));
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void load(session?.user.id ?? null);
    });

    return () => {
      active = false;
      loadedFor.current = undefined;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const toggle = useCallback(
    async (propertyId: string) => {
      const before = ids;
      const wasFavorite = before.has(propertyId);
      const next = new Set(before);
      if (wasFavorite) next.delete(propertyId);
      else next.add(propertyId);
      setIds(next); // affichage immédiat, annulé en cas d'erreur

      const { error } = wasFavorite
        ? await supabase.from("favorites").delete().eq("property_id", propertyId)
        : await supabase.from("favorites").insert({ property_id: propertyId });

      if (error && error.code !== "23505") setIds(before);
    },
    [ids, supabase],
  );

  const value = useMemo(() => ({ ids, signedIn: userId !== null, toggle }), [ids, userId, toggle]);
  return <FavoritesContext value={value}>{children}</FavoritesContext>;
}

export function FavoriteButton({ propertyId, className = "" }: { propertyId: string; className?: string }) {
  const ctx = use(FavoritesContext);
  const router = useRouter();
  const pathname = usePathname();
  if (!ctx) return null;

  const active = ctx.ids.has(propertyId);

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Retirer des favoris" : "Ajouter aux favoris"}
      onClick={(e) => {
        // Le bouton est posé sur une carte cliquable : ne pas ouvrir l'annonce
        e.preventDefault();
        e.stopPropagation();
        if (!ctx.signedIn) return router.push(`/connexion?next=${encodeURIComponent(pathname)}`);
        void ctx.toggle(propertyId);
      }}
      className={`grid size-9 place-items-center rounded-full bg-white/95 shadow-sm transition hover:scale-105 ${className}`}
    >
      <svg viewBox="0 0 24 24" className={`size-5 ${active ? "fill-gold-500 stroke-gold-600" : "fill-none stroke-navy-900"}`} strokeWidth="2" aria-hidden>
        <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.6 3.4 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
