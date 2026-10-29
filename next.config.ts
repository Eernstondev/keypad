import type { NextConfig } from "next";

// Message explicite si la variable manque (ex. pas encore ajoutée sur Vercel)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL manquante. En local : fichier .env.local. Sur Vercel : Settings → Environment Variables.",
  );
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    // Photos des annonces servies par Supabase Storage
    remotePatterns: [
      {
        protocol: "https",
        hostname: new URL(supabaseUrl).hostname,
        pathname: "/storage/v1/object/public/**",
      },
      // Photos des annonces de démonstration
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
