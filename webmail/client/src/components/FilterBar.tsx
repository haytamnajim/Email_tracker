import { toneBackground, toneInk } from '../utils/colors';
import type { Tone } from '../utils/colors';
import { useRipple } from '../utils/ripple';

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

const TOGGLES: Array<{
  key: 'unread' | 'flagged' | 'attachments';
  label: string;
  tone: Tone;
}> = [
  { key: 'unread', label: 'Non lus', tone: 'blue' },
  { key: 'flagged', label: 'Favoris', tone: 'amber' },
  { key: 'attachments', label: 'Pièces jointes', tone: 'green' },
];

/** Filtres (non lus, favoris, pièces jointes) et tri par date — chips Material 3. */
export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const ripple = useRipple();

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2" role="group" aria-label="Filtres">
      {TOGGLES.map(({ key, label, tone }) => {
        const active = filters[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange({ ...filters, [key]: !active })}
            onPointerDown={ripple}
            aria-pressed={active}
            className="ripple-host h-8 shrink-0 rounded-lg border px-3 text-[13px] font-medium transition-colors"
            style={{
              background: active ? toneBackground(tone) : 'transparent',
              borderColor: active ? 'transparent' : 'var(--line-strong)',
              color: active ? toneInk(tone) : 'var(--ink-dim)',
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
        className="h-8 shrink-0 cursor-pointer rounded-lg border border-line-strong bg-surface px-2 text-[13px] font-medium text-ink-dim"
      >
        <option value="desc">Date : récent d'abord</option>
        <option value="asc">Date : ancien d'abord</option>
      </select>
    </div>
  );
}
