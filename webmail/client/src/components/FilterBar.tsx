export interface MessageFilters {
  unread: boolean;
  flagged: boolean;
  attachments: boolean;
  sort: 'desc' | 'asc';
}

interface FilterBarProps {
  filters: MessageFilters;
  onChange: (filters: MessageFilters) => void;
}

const TOGGLES: Array<{ key: 'unread' | 'flagged' | 'attachments'; label: string }> = [
  { key: 'unread', label: 'Non lus' },
  { key: 'flagged', label: 'Favoris' },
  { key: 'attachments', label: 'Pièces jointes' },
];

/** Filtres (non lus, favoris, pièces jointes) et tri par date. */
export default function FilterBar({ filters, onChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtres">
      {TOGGLES.map(({ key, label }) => {
        const active = filters[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange({ ...filters, [key]: !active })}
            aria-pressed={active}
            className="rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 hover:scale-105"
            style={{
              background: active ? 'var(--accent-soft)' : 'var(--surface-2)',
              borderColor: active ? 'var(--accent-line)' : 'var(--line-strong)',
              color: active ? 'var(--accent-ink)' : 'var(--ink-dim)',
              boxShadow: active ? '0 0 10px var(--accent-glow)' : 'none',
            }}
          >
            {label}
          </button>
        );
      })}

      <label htmlFor="message-sort" className="sr-only">
        Trier par date
      </label>
      <select
        id="message-sort"
        value={filters.sort}
        onChange={(event) =>
          onChange({ ...filters, sort: event.target.value === 'asc' ? 'asc' : 'desc' })
        }
        className="cursor-pointer rounded-lg border border-line-strong bg-surface-2 px-2 py-1 text-xs font-medium text-ink-dim"
      >
        <option value="desc">Date : récent d'abord</option>
        <option value="asc">Date : ancien d'abord</option>
      </select>
    </div>
  );
}
