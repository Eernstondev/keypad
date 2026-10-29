import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LEGAL_UPDATED_AT } from "@/lib/site";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function TermsPage() {
  return (
    <>
      <h1>Conditions d&apos;utilisation</h1>
      <p className="text-sm text-muted">Dernière mise à jour : {LEGAL_UPDATED_AT}</p>

      <h2>1. Le service</h2>
      <p>
        KayAyiti permet de publier et de consulter des annonces de location et de vente de biens immobiliers en Haïti.
        KayAyiti met les personnes en relation : nous ne sommes pas une agence immobilière, nous ne sommes partie à
        aucune transaction et nous n&apos;encaissons aucun loyer, aucune avance ni aucun prix de vente.
      </p>

      <h2>2. Votre compte</h2>
      <p>
        La connexion se fait avec un code envoyé par e-mail. Vous êtes responsable de l&apos;usage de votre compte et
        de l&apos;exactitude des informations que vous publiez.
      </p>

      <h2>3. Règles de publication</h2>
      <p>En publiant une annonce, vous garantissez que :</p>
      <ul>
        <li>le bien existe, est disponible et correspond aux photos et à la description ;</li>
        <li>vous êtes le propriétaire ou êtes autorisé à le proposer ;</li>
        <li>le prix indiqué est le prix réellement demandé ;</li>
        <li>le numéro WhatsApp indiqué est le vôtre.</li>
      </ul>
      <p>Sont interdits : les faux biens, les prix trompeurs, les annonces en double, les contenus illégaux, haineux ou discriminatoires, et les coordonnées d&apos;une autre personne sans son accord.</p>

      <h2>4. Durée des annonces</h2>
      <p>
        Une annonce reste en ligne 60 jours. Elle est ensuite archivée automatiquement, sauf si vous la prolongez
        depuis « Mes annonces ». Cela évite d&apos;afficher des biens déjà loués ou vendus.
      </p>

      <h2>5. Badge « Vérifié »</h2>
      <p>
        Le badge signifie que le bien a été visité et que l&apos;identité de la personne qui le propose a été
        contrôlée. Il ne constitue pas une garantie juridique sur la propriété : pour un achat, faites toujours
        vérifier le titre par un notaire.
      </p>

      <h2>6. Prudence</h2>
      <ul>
        <li>Visitez toujours le bien avant de payer.</li>
        <li>Ne versez aucune avance à une personne que vous n&apos;avez pas rencontrée.</li>
        <li>Signalez toute annonce suspecte avec le bouton prévu à cet effet.</li>
      </ul>

      <h2>7. Modération</h2>
      <p>
        Nous pouvons retirer une annonce ou suspendre un compte qui ne respecte pas ces règles, notamment après un
        signalement, sans préavis.
      </p>

      <h2>8. Responsabilité</h2>
      <p>
        Les annonces sont publiées sous la seule responsabilité de leurs auteurs. KayAyiti ne peut être tenu
        responsable des échanges, accords ou litiges entre utilisateurs.
      </p>

      <h2>9. Modifications</h2>
      <p>Ces conditions peuvent évoluer. La date de mise à jour figure en haut de cette page.</p>

      <h2>10. Contact</h2>
      <p>
        Une question ? Écrivez-nous à <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-navy-700 underline">{CONTACT_EMAIL}</a>{" "}
        ou consultez notre <Link href="/confidentialite" className="font-medium text-navy-700 underline">politique de confidentialité</Link>.
      </p>
    </>
  );
}
