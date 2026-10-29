import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/site";

// Liste les annonces publiées pour Google. Généré à la demande puis mis en cache une heure
// (jamais au build : un sitemap vide figé après un déploiement serait pire que rien).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  return buildSitemap();
}

async function buildSitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheTag("properties", "agents");
  cacheLife("hours");

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data }, { data: agents }] = await Promise.all([
    supabase
      .from("properties")
      .select("id, updated_at")
      .eq("status", "publie")
      .eq("is_demo", false)
      .order("updated_at", { ascending: false })
      .limit(5000),
    supabase.from("agents").select("id, updated_at"), // la RLS ne renvoie que les agents actifs
  ]);

  const pages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/?transaction=location`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/?transaction=vente`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/agents`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/conditions`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/confidentialite`, changeFrequency: "yearly", priority: 0.2 },
  ];

  for (const p of data ?? []) {
    pages.push({ url: `${SITE_URL}/annonces/${p.id}`, lastModified: p.updated_at, changeFrequency: "weekly", priority: 0.8 });
  }
  for (const a of agents ?? []) {
    pages.push({ url: `${SITE_URL}/agents/${a.id}`, lastModified: a.updated_at, changeFrequency: "weekly", priority: 0.6 });
  }
  return pages;
}
