# KayAyiti

Plateforme d'annonces immobilières pour Haïti : location, vente, terrains. Contact direct par WhatsApp, badge « Vérifié », signalement des arnaques.

**Stack** : Next.js 16 (App Router, Cache Components), Supabase (Postgres + PostGIS, Auth, Storage, RLS), Tailwind CSS 4, Leaflet + OpenStreetMap.

## 1. Configurer Supabase (une seule fois)

1. **SQL Editor** → exécuter, dans l'ordre, chaque fichier en entier :
   - `supabase/schema.sql`
   - `supabase/migrations/002_modifier_expiration.sql` (expiration des annonces après 60 jours)
   - `supabase/migrations/003_annonces_demo.sql` (8 annonces de démonstration ; se connecter une fois avant).
     Pour les retirer : `delete from public.properties where is_demo;`
   - `supabase/migrations/004_prix_comparable.sql` (tri par prix entre HTG et USD, taux indicatif 131)
   - `supabase/migrations/005_favoris_stats_moderation.sql` (favoris, vues et clics WhatsApp, limite de 5 annonces par 24 h, archivage admin)
   - `supabase/migrations/006_agents_visites_vendus.sql` (agents immobiliers, demandes de visite, biens vendus / loués)
2. **Authentication → Email Templates → Magic Link** : remplacer le contenu par un message qui contient le code :
   ```html
   <h2>Votre code KayAyiti</h2>
   <p>Entrez ce code pour vous connecter : <strong>{{ .Token }}</strong></p>
   ```
3. **Authentication → URL Configuration** : *Site URL* = l'URL du site (ex. `http://localhost:3000`, puis le domaine de production).
4. **Authentication → SMTP** (production) : brancher un vrai fournisseur d'e-mails (Resend, Brevo…). Le service intégré de Supabase est limité à quelques e-mails par heure.

## 2. Lancer en local

```bash
npm install
cp .env.example .env.local   # puis renseigner l'URL et la clé anon du projet
npm run dev
```

Ouvrir http://localhost:3000.

## 3. Devenir administrateur

Connecte-toi une première fois sur le site, puis dans le SQL Editor :

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'ton-email@exemple.com');
```

La page `/admin` permet ensuite de traiter les signalements, d'attribuer le badge « Vérifié » et de gérer les agents.

## 3 bis. Activer un agent immobilier

1. L'agent se connecte une première fois sur le site (code par e-mail).
2. Il paie son abonnement (MonCash, NatCash, virement…).
3. Dans `/admin` → *Agents immobiliers* : saisir son e-mail de connexion, choisir la durée, « Activer l'accès ».
4. L'agent complète son profil dans `/agent` (photo, agence, contacts). Ses annonces affichent alors sa fiche.

À l'expiration, le badge et le profil public disparaissent automatiquement ; ses annonces restent en ligne.

## 4. Déployer (Vercel)

1. Pousser le projet sur GitHub, puis l'importer dans Vercel.
2. Ajouter les variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `NEXT_PUBLIC_SITE_URL` (ex. `https://kayayiti.com`, pour le sitemap et les aperçus de liens).
3. Mettre le domaine de production comme *Site URL* dans Supabase.

## Structure

```
supabase/schema.sql          Tables, RLS, stockage, fonctions
src/proxy.ts                 Rafraîchit la session, protège /publier, /mes-annonces, /admin
src/lib/listings.ts          Types, libellés, formatage (prix, WhatsApp)
src/lib/queries.ts           Lectures publiques mises en cache (recherche, détail)
src/lib/supabase/            Clients Supabase (serveur / navigateur)
src/app/actions.ts           Server actions (signalement, archivage, suppression, admin)
src/app/page.tsx             Accueil : recherche, résultats, carte
src/app/annonces/[id]/       Détail d'une annonce + signalement
src/app/publier/             Formulaire de publication (photos compressées côté navigateur)
src/app/mes-annonces/        Gestion de ses annonces
src/app/admin/               Modération
```

## Sécurité

- Toutes les règles d'accès sont dans la base (RLS + droits par colonne) : un utilisateur ne peut ni modifier l'annonce d'un autre, ni s'attribuer le badge « Vérifié », ni changer son rôle.
- Les photos sont rangées dans `property-media/<user_id>/…` ; chacun n'écrit que dans son dossier.
- La clé `anon` est publique par conception ; ne jamais exposer la clé `service_role`.
