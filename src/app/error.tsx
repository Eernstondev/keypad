"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-xl font-bold text-navy-900">Une erreur est survenue</h1>
      <p className="mt-2 text-muted">Vérifiez votre connexion internet puis réessayez.</p>
      <button onClick={reset} className="btn-primary mt-6">Réessayer</button>
    </div>
  );
}
