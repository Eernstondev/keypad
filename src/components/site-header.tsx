import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-[1000] border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="KayAyiti, accueil">
          <Image src="/logo-mark.png" alt="" width={46} height={29} priority />
          <span className="text-xl font-extrabold tracking-tight">
            <span className="text-navy-900">Kay</span>
            <span className="text-gold-500">Ayiti</span>
          </span>
        </Link>

        <nav className="mr-auto hidden items-center gap-1 pl-6 text-sm font-medium md:flex">
          <Link href="/?transaction=location" className="rounded-lg px-3 py-2 text-ink hover:bg-sand-50">Louer</Link>
          <Link href="/?transaction=vente" className="rounded-lg px-3 py-2 text-ink hover:bg-sand-50">Acheter</Link>
          <Link href="/agents" className="rounded-lg px-3 py-2 text-ink hover:bg-sand-50">Agents</Link>
        </nav>

        <Suspense fallback={<GuestNav />}>
          <UserNav />
        </Suspense>
      </div>
    </header>
  );
}

function GuestNav() {
  return (
    <nav className="flex items-center gap-2">
      <Link href="/connexion" className="px-3 py-2 text-sm font-medium text-ink">
        Connexion
      </Link>
      <Link href="/publier" className="btn-primary !px-4 !py-2 text-sm">
        Publier
      </Link>
    </nav>
  );
}

const ACCOUNT_LINKS = [
  ["/mes-annonces", "Mes annonces"],
  ["/rendez-vous", "Rendez-vous"],
  ["/favoris", "Favoris"],
  ["/mot-de-passe", "Mot de passe"],
] as const;

async function UserNav() {
  const user = await getCurrentUser();
  if (!user) return <GuestNav />;

  // Rôle (lien admin) et demandes de visite à traiter (pastille)
  const supabase = await createClient();
  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("visit_requests")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("status", "en_attente"),
  ]);
  const isAdmin = profile?.role === "admin";
  const isAgent = profile?.role === "agent";
  const pending = count ?? 0;

  return (
    <nav className="flex items-center gap-2">
      {/* Menu sans JavaScript : fonctionne même si le script ne charge pas */}
      <details className="group relative">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-ink hover:bg-sand-50">
          Mon compte
          {pending > 0 && (
            <span className="grid min-w-5 place-items-center rounded-full bg-gold-500 px-1.5 text-xs font-bold text-navy-950" aria-label={`${pending} demande(s) de visite en attente`}>
              {pending}
            </span>
          )}
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 transition group-open:rotate-180" aria-hidden>
            <path d="M5.2 7.2a.75.75 0 0 1 1.06 0L10 10.94l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.26a.75.75 0 0 1 0-1.06Z" />
          </svg>
        </summary>
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-white py-1.5 shadow-xl">
          {user.email && <p className="truncate px-4 pb-2 pt-1.5 text-xs text-muted">{user.email}</p>}
          {ACCOUNT_LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="flex items-center justify-between px-4 py-2 text-sm text-ink hover:bg-sand-50">
              {label}
              {href === "/rendez-vous" && pending > 0 && (
                <span className="rounded-full bg-gold-500 px-1.5 text-xs font-bold text-navy-950">{pending}</span>
              )}
            </Link>
          ))}
          {/* Chaque profil voit son propre espace */}
          <div className="border-t border-line pt-1.5">
            {isAdmin ? (
              <Link href="/admin" className="block px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-sand-50">
                Administration
              </Link>
            ) : isAgent ? (
              <Link href="/agent" className="block px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-sand-50">
                Espace agent
              </Link>
            ) : (
              <Link href="/agent" className="block px-4 py-2 text-sm text-gold-600 hover:bg-sand-50">
                Devenir agent
              </Link>
            )}
          </div>
          <Link href="/agents" className="block px-4 py-2 text-sm text-ink hover:bg-sand-50 md:hidden">
            Annuaire des agents
          </Link>
          <form action={signOut} className="border-t border-line pt-1.5">
            <button className="w-full px-4 py-2 text-left text-sm text-muted hover:bg-sand-50 hover:text-ink">
              Déconnexion
            </button>
          </form>
        </div>
      </details>
      <Link href="/publier" className="btn-primary !px-4 !py-2 text-sm">
        Publier
      </Link>
    </nav>
  );
}
