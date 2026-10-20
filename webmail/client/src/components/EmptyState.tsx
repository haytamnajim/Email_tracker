interface EmptyStateProps {
  title: string;
  description?: string;
}

/** État vide : dossier sans message, recherche sans résultat. */
export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 48 48"
        fill="none"
        className="h-12 w-12 text-ink-faint"
      >
        <rect x="6" y="12" width="36" height="26" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6 16l18 12 18-12" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      <p className="mt-5 text-lg text-ink">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-xs text-sm text-ink-dim">{description}</p>
      ) : null}
    </div>
  );
}
