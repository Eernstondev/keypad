// Mise en page commune aux pages de texte (conditions, confidentialité, contact)
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl px-4 py-10 sm:py-14 [&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h1]:text-navy-900 sm:[&_h1]:text-3xl [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-navy-900 [&_li]:mt-1 [&_p]:mt-3 [&_p]:leading-relaxed [&_p]:text-ink/85 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-ink/85">
      {children}
    </article>
  );
}
