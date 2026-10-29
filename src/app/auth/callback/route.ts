import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// N'accepte qu'un chemin interne pour éviter les redirections ouvertes
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/mes-annonces";
}

// Arrivée depuis le lien reçu par e-mail : crée la session puis redirige
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  // Lien par défaut de Supabase (flux PKCE) : ?code=…
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  // Modèle d'e-mail personnalisé : ?token_hash=…&type=email
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL(`/connexion?erreur=lien&next=${encodeURIComponent(next)}`, origin));
}
