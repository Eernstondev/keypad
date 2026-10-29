import type { MetadataRoute } from "next";

// Rend le site installable sur l'écran d'accueil (Android / iPhone)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KayAyiti",
    short_name: "KayAyiti",
    description: "Maisons, appartements et terrains à louer ou à vendre en Haïti.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f4",
    theme_color: "#0c234d",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
