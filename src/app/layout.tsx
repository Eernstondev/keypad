import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "KayAyiti — Maisons, appartements et terrains en Haïti",
    template: "%s · KayAyiti",
  },
  description:
    "Trouvez une maison, un appartement ou un terrain à louer ou à vendre en Haïti. Annonces vérifiées, contact direct par WhatsApp.",
};

export const viewport: Viewport = {
  themeColor: "#0c234d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
            <nav className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="font-medium text-ink">KayAyiti</span>
              <Link href="/conditions" className="hover:text-ink">Conditions</Link>
              <Link href="/confidentialite" className="hover:text-ink">Confidentialité</Link>
              <Link href="/contact" className="hover:text-ink">Contact</Link>
            </nav>
            <p className="max-w-md">
              Le badge « Vérifié » confirme une visite et l&apos;identité du propriétaire. Il ne remplace pas la
              vérification du titre par un notaire.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
