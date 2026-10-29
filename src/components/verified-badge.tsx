export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-gold-500 px-2.5 py-1 text-xs font-semibold text-navy-950 ${className}`}
      title="Bien visité et identité du propriétaire contrôlée"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5" aria-hidden>
        <path
          fillRule="evenodd"
          d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"
          clipRule="evenodd"
        />
      </svg>
      Vérifié
    </span>
  );
}
