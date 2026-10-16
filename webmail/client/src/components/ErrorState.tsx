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
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: 'var(--danger-soft)' }}
      >
        <svg aria-hidden="true" viewBox="0 0 48 48" fill="none" className="h-8 w-8 text-danger">
          <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="2" />
          <path d="M24 15v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="24" cy="33" r="1.6" fill="currentColor" />
        </svg>
      </div>

      <p className="mt-4 text-base font-semibold text-ink">Connexion impossible</p>
      <p className="mt-1.5 max-w-sm text-sm text-ink-faint">{message}</p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-xl px-4 py-2 text-sm font-medium text-white transition-all hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          boxShadow: '0 0 16px var(--accent-glow)',
        }}
      >
        Réessayer
      </button>
    </div>
  );
}
