import { useEffect, useState } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  /** Délai de saisie avant recherche (300 ms) */
  debounceMs?: number;
}

/** Recherche dans l'expéditeur, l'objet et le contenu. Le debounce est géré ici. */
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
    <div className="relative flex-1">
      <label htmlFor="message-search" className="sr-only">
        Rechercher un message
      </label>

      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-ink opacity-70"
      >
        <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>

      <input
        id="message-search"
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Rechercher par expéditeur, objet ou contenu…"
        autoComplete="off"
        className="w-full rounded-xl border border-line-strong bg-surface-3 py-2 pl-9 pr-9 text-sm text-ink transition-all duration-200 placeholder:text-[var(--placeholder)] focus:border-accent-line"
      />

      {draft ? (
        <button
          type="button"
          onClick={() => setDraft('')}
          aria-label="Effacer la recherche"
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-surface-3 text-ink-dim transition-all duration-150 hover:scale-110 hover:text-accent-ink"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
