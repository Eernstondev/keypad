import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/agent", "/mes-annonces", "/publier", "/favoris", "/rendez-vous", "/connexion", "/mot-de-passe"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
