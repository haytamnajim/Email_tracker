import type { Theme } from '../types';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

/** Bouton d'icône Gmail (40 px, cercle au survol) pour basculer clair / sombre. */
export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark';
  const label = isDark ? 'Passer en mode clair' : 'Passer en mode sombre';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-dim transition-colors hover:bg-row-hover"
    >
      {isDark ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.55 1.55M17.25 17.25l1.55 1.55M18.8 5.2l-1.55 1.55M6.75 17.25L5.2 18.8"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path
            d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
