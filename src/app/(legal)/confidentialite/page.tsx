import type { Metadata } from "next";
import { CONTACT_EMAIL, LEGAL_UPDATED_AT } from "@/lib/site";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Politique de confidentialité</h1>
      <p className="text-sm text-muted">Dernière mise à jour : {LEGAL_UPDATED_AT}</p>

      <h2>Ce que nous collectons</h2>
      <ul>
        <li><strong>Votre adresse e-mail</strong>, pour vous connecter. Elle n&apos;est jamais affichée publiquement.</li>
        <li><strong>Le contenu de vos annonces</strong> : texte, prix, photos, numéro WhatsApp et, si vous le choisissez, la position du bien sur la carte.</li>
        <li><strong>Les demandes de visite</strong> : votre nom, votre téléphone et vos disponibilités sont transmis uniquement au propriétaire ou à l&apos;agent du bien concerné.</li>
        <li><strong>Le profil des agents</strong> : photo, agence, présentation et coordonnées professionnelles, affichés publiquement à leur demande.</li>
        <li><strong>Les signalements</strong> que vous envoyez. Ils ne sont visibles que par l&apos;équipe de modération.</li>
        <li><strong>Un cookie de session</strong>, indispensable pour rester connecté. Nous n&apos;utilisons ni publicité ni pistage.</li>
      </ul>

      <h2>Ce qui est public</h2>
      <p>
        Une annonce publiée est visible par tous, y compris le numéro WhatsApp et la position indiquée. Si vous ne
        souhaitez pas montrer l&apos;emplacement exact, placez le point dans le quartier plutôt que sur la maison.
      </p>

      <h2>Pourquoi nous utilisons vos données</h2>
      <p>
        Uniquement pour faire fonctionner le service, sécuriser les comptes et lutter contre les arnaques. Nous ne
        vendons et ne louons vos données à personne.
      </p>

      <h2>Où sont stockées vos données</h2>
      <ul>
        <li><strong>Supabase</strong> : base de données, comptes et photos.</li>
        <li><strong>Vercel</strong> : hébergement du site.</li>
        <li><strong>OpenStreetMap</strong> : affichage des cartes (votre navigateur charge les fonds de carte depuis leurs serveurs).</li>
      </ul>

      <h2>Durée de conservation</h2>
      <p>
        Vos données sont conservées tant que votre compte existe. Quand vous supprimez une annonce, ses photos sont
        supprimées en même temps.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous pouvez demander à consulter, corriger ou supprimer vos données, ou fermer votre compte, en écrivant à{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-navy-700 underline">{CONTACT_EMAIL}</a>.
      </p>
    </>
  );
}
