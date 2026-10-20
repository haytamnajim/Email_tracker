import { useCallback, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { MessageSummary } from '../types';
import ErrorState from './ErrorState';
import MessageItem from './MessageItem';
import type { DisplayDensity } from './MessageItem';
import { ListSkeleton } from './Skeleton';

interface MessageListProps {
  items: MessageSummary[];
  selectedUid: number | null;
  checkedUids: Set<number>;
  starredUids: Set<number>;
  importantUids: Set<number>;
  onSelect: (uid: number) => void;
  onToggleCheck: (uid: number, e: React.MouseEvent) => void;
  onToggleStar: (uid: number, e: React.MouseEvent) => void;
  onToggleImportant: (uid: number, e: React.MouseEvent) => void;
  onQuickArchive: (uid: number, e: React.MouseEvent) => void;
  onQuickDelete: (uid: number, e: React.MouseEvent) => void;
  onQuickToggleRead: (uid: number, e: React.MouseEvent) => void;
  onQuickSnooze: (uid: number, e: React.MouseEvent) => void;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  emptyTitle: string;
  emptyDescription?: string;
  density?: DisplayDensity;
}

export default function MessageList({
  items,
  selectedUid,
  checkedUids,
  starredUids,
  importantUids,
  onSelect,
  onToggleCheck,
  onToggleStar,
  onToggleImportant,
  onQuickArchive,
  onQuickDelete,
  onQuickToggleRead,
  onQuickSnooze,
  loading,
  loadingMore,
  error,
  hasMore,
  onLoadMore,
  onRetry,
  emptyTitle,
  emptyDescription,
  density = 'default',
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Navigation clavier standard Gmail (j / k ou Flèches haut / bas)
  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (
        event.key !== 'ArrowDown' &&
        event.key !== 'ArrowUp' &&
        event.key !== 'j' &&
        event.key !== 'k'
      )
        return;

      const currentIndex = items.findIndex((item) => item.uid === selectedUid);
      const isDown = event.key === 'ArrowDown' || event.key === 'j';
      const isUp = event.key === 'ArrowUp' || event.key === 'k';

      if (isDown && currentIndex < items.length - 1) {
        event.preventDefault();
        onSelect(items[currentIndex + 1].uid);
      } else if (isUp && currentIndex > 0) {
        event.preventDefault();
        onSelect(items[currentIndex - 1].uid);
      }
    },
    [items, selectedUid, onSelect],
  );

  if (loading && items.length === 0) return <ListSkeleton />;

  if (error && items.length === 0) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-white dark:bg-[#141414]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#f0f4f9] dark:bg-[#202124] text-[#5f6368] dark:text-[#9aa0a6] mb-4">
          <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 13V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h9" />
            <path d="M22 6l-10 7L2 6" />
            <circle cx="18" cy="18" r="3" strokeWidth="1.5" />
            <path d="M20.2 20.2l2.3 2.3" strokeWidth="1.5" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">{emptyTitle}</h3>
        <p className="mt-1 text-sm text-[#5f6368] dark:text-[#9aa0a6] max-w-sm">
          {emptyDescription || 'Votre boîte est bien rangée. Aucun message à afficher dans cette vue.'}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="flex flex-1 flex-col overflow-y-auto bg-white dark:bg-[#141414] focus:outline-none"
    >
      {error && (
        <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 px-4 py-2 text-xs text-amber-800 dark:text-amber-300">
          Actualisation impossible : {error}
        </div>
      )}

      <div role="feed" aria-label="Messages" className="divide-y divide-transparent">
        {items.map((message) => (
          <MessageItem
            key={message.uid}
            message={message}
            selected={checkedUids.has(message.uid)}
            active={message.uid === selectedUid}
            onSelect={onSelect}
            onToggleCheck={onToggleCheck}
            onToggleStar={onToggleStar}
            onToggleImportant={onToggleImportant}
            onQuickArchive={onQuickArchive}
            onQuickDelete={onQuickDelete}
            onQuickToggleRead={onQuickToggleRead}
            onQuickSnooze={onQuickSnooze}
            density={density}
            isStarred={starredUids.has(message.uid)}
            isImportant={importantUids.has(message.uid)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center p-4 border-t border-[#e0e2e7] dark:border-[#3c4043]">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="rounded-full bg-[#f0f4f9] dark:bg-[#202124] px-5 py-2 text-xs font-semibold text-[#0b57d0] dark:text-[#a8c7fa] hover:bg-[#d3e3fd]/50 transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Chargement des messages…' : 'Charger les messages suivants'}
          </button>
        </div>
      )}
    </div>
  );
}
