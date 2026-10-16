interface EmptyStateProps {
  title: string;
  description?: string;
}

/** État vide : dossier sans message, recherche sans résultat. */
export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: 'var(--accent-soft)' }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 48 48"
          fill="none"
          className="h-8 w-8"
          style={{ color: 'var(--accent-ink)' }}
        >
          <rect x="6" y="12" width="36" height="26" rx="3" stroke="currentColor" strokeWidth="2" />
          <path d="M6 16l18 12 18-12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="mt-4 text-base font-semibold text-ink">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-xs text-sm text-ink-faint">{description}</p>
      ) : null}
    </div>
  );
}
