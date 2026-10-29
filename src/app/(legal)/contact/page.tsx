import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <>
      <h1>Contact</h1>
      <p>
        Une question, un problème avec une annonce, une demande de vérification ou un partenariat ? Écrivez-nous.
      </p>
      <a href={`mailto:${CONTACT_EMAIL}`} className="btn-primary mt-6">{CONTACT_EMAIL}</a>

      <h2>Signaler une arnaque</h2>
      <p>
        Le plus rapide est d&apos;utiliser le bouton « Signaler cette annonce » en bas de chaque annonce : le
        signalement arrive directement à l&apos;équipe de modération.
      </p>
    </>
  );
}
