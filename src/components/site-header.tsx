import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
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
      <Link href="/connexion" className="hidden px-3 py-2 text-sm font-medium text-ink sm:block">
        Connexion
      </Link>
      <Link href="/publier" className="btn-primary !px-4 !py-2 text-sm">
        Publier
      </Link>
    </nav>
  );
}

async function UserNav() {
  const user = await getCurrentUser();
  if (!user) return <GuestNav />;

  return (
    <nav className="flex items-center gap-1 sm:gap-2">
      <Link href="/favoris" className="hidden px-3 py-2 text-sm font-medium text-ink sm:block">
        Favoris
      </Link>
      <Link href="/mes-annonces" className="px-3 py-2 text-sm font-medium text-ink">
        Mes annonces
      </Link>
      <form action={signOut} className="hidden sm:block">
        <button className="px-3 py-2 text-sm text-muted hover:text-ink">Déconnexion</button>
      </form>
      <Link href="/publier" className="btn-primary !px-4 !py-2 text-sm">
        Publier
      </Link>
    </nav>
  );
}
