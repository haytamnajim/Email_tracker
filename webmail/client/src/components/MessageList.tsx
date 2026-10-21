import { useCallback, useEffect, useRef } from 'react';
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

/** Spinners fins (barre + anneau) pour le chargement automatique. */
function ScrollSpinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#0b57d0] dark:border-[#a8c7fa] border-t-transparent"
    />
  );
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
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  // ── Chargement infini : observe le sentinel en bas de liste (#1) ──
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMoreRef.current();
      },
      { rootMargin: '240px 0px' }, // déclenche un peu avant le bas exact
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, items.length]);

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
        {/* Illustration colorée façon Google (enveloppe + accents de la marque) */}
        <svg
          aria-hidden="true"
          viewBox="0 0 120 96"
          className="h-28 w-36 text-[#5f6368] dark:text-[#9aa0a6]"
          fill="none"
        >
          <rect
            x="14"
            y="22"
            width="92"
            height="60"
            rx="8"
            fill="currentColor"
            opacity="0.07"
          />
          <rect
            x="14"
            y="22"
            width="92"
            height="60"
            rx="8"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <path
            d="M14 30l46 30 46-30"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M14 76l34-26M106 76L72 50" stroke="currentColor" strokeWidth="2" opacity="0.5" />
          <circle cx="98" cy="24" r="9" fill="#4285F4" />
          <circle cx="108" cy="36" r="5" fill="#34A853" />
          <circle cx="22" cy="20" r="5.5" fill="#EA4335" />
          <circle cx="12" cy="32" r="3.5" fill="#FBBC04" />
        </svg>
        <h3 className="mt-5 text-base font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">
          {emptyTitle}
        </h3>
        <p className="mt-1.5 text-sm text-[#5f6368] dark:text-[#9aa0a6] max-w-sm">
          {emptyDescription || 'Votre boîte est bien rangée. Aucun message à afficher dans cette vue.'}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0b57d0] dark:bg-[#a8c7fa] px-5 py-2 text-xs font-semibold text-white dark:text-[#041e49] shadow-sm hover:bg-[#0842a0] dark:hover:bg-[#8ab4f8] transition-colors"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M21 12a9 9 0 11-3.2-6.9" strokeLinecap="round" />
            <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Rafraîchir la boîte</span>
        </button>
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

      {/* ── Sentinel : déclenche le chargement automatique au scroll ── */}
      {hasMore && <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />}

      {hasMore && (
        <div className="flex justify-center items-center gap-3 p-4 border-t border-[#e0e2e7] dark:border-[#3c4043]">
          {loadingMore && <ScrollSpinner />}
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
