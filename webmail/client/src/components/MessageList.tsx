import { useCallback, useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { MessageSummary } from '../types';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import MessageItem from './MessageItem';
import { ListSkeleton } from './Skeleton';

interface MessageListProps {
  items: MessageSummary[];
  selectedUid: number | null;
  onSelect: (uid: number) => void;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  emptyTitle: string;
  emptyDescription?: string;
}

/** Liste des messages : chargement progressif + navigation clavier (↑/↓, Entrée). */
export default function MessageList({
  items,
  selectedUid,
  onSelect,
  loading,
  loadingMore,
  error,
  hasMore,
  onLoadMore,
  onRetry,
  emptyTitle,
  emptyDescription,
}: MessageListProps) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items.length]);

  // Conserve le focus clavier sur la ligne sélectionnée après un rafraîchissement.
  useEffect(() => {
    if (selectedUid === null) return;
    const index = items.findIndex((item) => item.uid === selectedUid);
    if (index >= 0) itemRefs.current[index]?.focus();
  }, [items, selectedUid]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLUListElement>) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      const active = document.activeElement as HTMLElement | null;
      const current = itemRefs.current.findIndex((node) => node === active);
      if (current === -1) return;

      event.preventDefault();
      const next = event.key === 'ArrowDown' ? current + 1 : current - 1;
      const target = itemRefs.current[next];
      if (target) {
        target.focus();
        onSelect(items[next].uid);
      }
    },
    [items, onSelect],
  );

  if (loading && items.length === 0) return <ListSkeleton />;

  if (error && items.length === 0) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="flex h-full flex-col">
      {error ? (
        <p
          role="alert"
          className="border-b px-4 py-2 text-xs"
          style={{
            background: 'var(--warn-soft)',
            borderColor: 'var(--warn-line)',
            color: 'var(--warn-ink)',
          }}
        >
          Actualisation impossible : {error}
        </p>
      ) : null}

      <ul
        aria-label="Liste des messages"
        onKeyDown={handleKeyDown}
        className="flex-1 divide-y divide-line overflow-y-auto"
      >
        {items.map((message, index) => (
          <li key={message.uid}>
            <MessageItem
              message={message}
              selected={message.uid === selectedUid}
              onSelect={onSelect}
              itemRef={(node) => {
                itemRefs.current[index] = node;
              }}
            />
          </li>
        ))}
      </ul>

      {hasMore ? (
        <div className="border-t border-line p-3">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="w-full rounded-xl border border-line-strong bg-surface-2 px-4 py-2 text-sm font-medium text-ink-dim transition-all hover:scale-[1.01] hover:border-accent-line hover:text-accent-ink disabled:opacity-60"
          >
            {loadingMore ? 'Chargement…' : 'Charger plus de messages'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
