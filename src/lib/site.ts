// Adresse publique du site (sitemap, aperçus de liens). À définir en production.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Coordonnées affichées sur les pages contact et légales
export const CONTACT_EMAIL = "e.ernstondev@gmail.com";
// Numéro WhatsApp que les agents contactent pour s'abonner (à remplacer si besoin)
export const CONTACT_WHATSAPP = "3844 9148";
export const LEGAL_UPDATED_AT = "29 octobre 2026";
