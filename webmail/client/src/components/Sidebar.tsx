import type { Folder } from '../types';

interface SidebarProps {
  folders: Folder[];
  activeId: string;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

/** Icône adaptée au type de dossier. */
function FolderIcon({ id }: { id: string }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    className: 'h-4 w-4 shrink-0',
    'aria-hidden': true as const,
  };

  const lower = id.toLowerCase();

  if (lower.includes('sent') || lower.includes('envoy'))
    return (
      <svg {...common}>
        <path
          d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );

  if (lower.includes('draft') || lower.includes('brouillon'))
    return (
      <svg {...common}>
        <path
          d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );

  if (lower.includes('trash') || lower.includes('corbeille') || lower.includes('deleted'))
    return (
      <svg {...common}>
        <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path
          d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );

  if (lower.includes('spam') || lower.includes('junk'))
    return (
      <svg {...common}>
        <path
          d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );

  if (lower === 'inbox')
    return (
      <svg {...common}>
        <polyline
          points="22 12 16 12 14 15 10 15 8 12 2 12"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );

  return (
    <svg {...common}>
      <path
        d="M3 7a2 2 0 012-2h4l2 3H19a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Barre latérale : dossiers, pastilles de non lus, bouton « Actualiser ». */
export default function Sidebar({ folders, activeId, onSelect, onRefresh, refreshing }: SidebarProps) {
  const totalUnread = folders.reduce((sum, folder) => sum + folder.unread, 0);

  return (
    <nav aria-label="Dossiers" className="flex h-full w-full flex-col bg-surface">
      <div className="flex items-center justify-between gap-2 px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">
          Dossiers
        </p>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Actualiser la liste des dossiers"
          title="Actualiser"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-3 text-ink-dim transition-all duration-200 hover:scale-110 hover:text-accent-ink disabled:opacity-40"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
          >
            <path
              d="M20 12a8 8 0 11-2.6-5.9M20 4v4h-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {folders.map((folder) => {
          const active = folder.id === activeId;
          return (
            <li key={folder.id}>
              <button
                type="button"
                onClick={() => onSelect(folder.id)}
                aria-current={active ? 'true' : undefined}
                aria-label={
                  folder.unread > 0
                    ? `${folder.label}, ${folder.unread} non lu${folder.unread > 1 ? 's' : ''}`
                    : folder.label
                }
                className="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 hover:scale-[1.01]"
                style={{
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  borderColor: active ? 'var(--accent-line)' : 'transparent',
                  color: active ? 'var(--accent-ink)' : 'var(--ink-dim)',
                  boxShadow: active ? '0 0 16px var(--accent-glow)' : 'none',
                }}
              >
                <span style={{ color: active ? 'var(--accent)' : 'var(--ink-faint)' }}>
                  <FolderIcon id={folder.id} />
                </span>
                <span className="min-w-0 flex-1 truncate">{folder.label}</span>
                {folder.unread > 0 ? (
                  <span
                    className="ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums"
                    style={{
                      background: active ? 'var(--accent-line)' : 'var(--accent-soft)',
                      color: 'var(--accent-ink)',
                    }}
                  >
                    {folder.unread}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-line px-4 py-3">
        <p className="text-xs text-ink-faint">
          {totalUnread} non lu{totalUnread > 1 ? 's' : ''}
        </p>
      </div>
    </nav>
  );
}
