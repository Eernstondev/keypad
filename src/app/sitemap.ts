import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/site";

// Liste les annonces publiées pour Google (mise à jour toutes les heures)
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheTag("properties");
  cacheLife("hours");

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data } = await supabase
    .from("properties")
    .select("id, updated_at")
    .eq("status", "publie")
    .eq("is_demo", false)
    .order("updated_at", { ascending: false })
    .limit(5000);

  const pages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/?transaction=location`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/?transaction=vente`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/conditions`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/confidentialite`, changeFrequency: "yearly", priority: 0.2 },
  ];

  for (const p of data ?? []) {
    pages.push({ url: `${SITE_URL}/annonces/${p.id}`, lastModified: p.updated_at, changeFrequency: "weekly", priority: 0.8 });
  }
  return pages;
}
