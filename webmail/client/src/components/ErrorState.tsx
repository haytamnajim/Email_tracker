interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

/** Échec de connexion : message clair et bouton « Réessayer ». */
export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex h-full flex-col items-center justify-center px-6 py-16 text-center"
    >
      <svg aria-hidden="true" viewBox="0 0 48 48" fill="none" className="h-12 w-12 text-danger">
        <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1.8" />
        <path d="M24 15v12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="24" cy="33" r="1.6" fill="currentColor" />
      </svg>

      <p className="mt-5 text-lg text-ink">Connexion impossible</p>
      <p className="mt-1.5 max-w-sm text-sm text-ink-dim">{message}</p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-6 h-9 rounded-lg bg-accent-soft px-5 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-line"
      >
        Réessayer
      </button>
    </div>
  );
}
