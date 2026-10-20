import { useEffect, useState } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  /** Délai de saisie avant recherche (300 ms) */
  debounceMs?: number;
}

/**
 * Barre de recherche Gmail : pilule arrondie, fond gris, icône à gauche.
 * Le debounce de 300 ms est géré ici.
 */
export default function SearchBar({ value, onChange, debounceMs = 300 }: SearchBarProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft === value) return;
    const timer = window.setTimeout(() => onChange(draft), debounceMs);
    return () => window.clearTimeout(timer);
  }, [draft, value, debounceMs, onChange]);

  return (
    <div className="min-w-0 flex-1 md:max-w-[720px]">
      <label htmlFor="message-search" className="sr-only">
        Rechercher dans les courriers
      </label>

      <div className="flex h-12 items-center gap-3 rounded-[24px] bg-search-bg px-4 focus-within:outline focus-within:outline-2 focus-within:outline-accent">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 shrink-0 text-ink-faint"
        >
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>

        <input
          id="message-search"
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Rechercher dans les courriers"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:cursor-pointer"
        />

        {draft ? (
          <button
            type="button"
            onClick={() => setDraft('')}
            aria-label="Effacer la recherche"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-dim transition-colors hover:bg-row-hover"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
