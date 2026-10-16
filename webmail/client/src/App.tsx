import { useCallback, useState } from 'react';
import FilterBar from './components/FilterBar';
import type { MessageFilters } from './components/FilterBar';
import MessageList from './components/MessageList';
import MessageReader from './components/MessageReader';
import SearchBar from './components/SearchBar';
import Sidebar from './components/Sidebar';
import ThemeToggle from './components/ThemeToggle';
import { useFolders } from './hooks/useFolders';
import { useMessage } from './hooks/useMessage';
import { useMessages } from './hooks/useMessages';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { theme, toggleTheme } = useTheme();

  const [folderId, setFolderId] = useState('INBOX');
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  /** Sur mobile : 'read' affiche le message en plein écran, 'list' la liste. */
  const [mobileView, setMobileView] = useState<'list' | 'read'>('list');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<MessageFilters>({
    unread: false,
    flagged: false,
    attachments: false,
    sort: 'desc',
  });

  const { folders, loading: foldersLoading, error: foldersError, reload: reloadFolders } =
    useFolders(true);

  const { items, total, loading, loadingMore, error, hasMore, reload, loadMore } = useMessages(
    folderId,
    filtersWithSearch(filters, search),
  );

  const { message, loading: messageLoading, error: messageError, reload: reloadMessage } =
    useMessage(selectedUid, folderId);

  const selectFolder = useCallback((id: string) => {
    setFolderId(id);
    setSelectedUid(null);
    setMobileView('list');
  }, []);

  const selectMessage = useCallback((uid: number) => {
    setSelectedUid(uid);
    setMobileView('read');
  }, []);

  const backToList = useCallback(() => setMobileView('list'), []);

  const activeFolder = folders.find((folder) => folder.id === folderId);
  const emptyTitle = search.trim() ? 'Aucun résultat' : 'Ce dossier est vide';
  const emptyDescription = search.trim()
    ? 'Aucun message ne correspond à votre recherche.'
    : 'Les nouveaux messages apparaîtront ici.';

  const listProps = {
    items,
    selectedUid,
    onSelect: selectMessage,
    loading,
    loadingMore,
    error,
    hasMore,
    onLoadMore: loadMore,
    onRetry: reload,
    emptyTitle,
    emptyDescription,
  };

  return (
    <div className="app-bg flex h-full flex-col">
      {/* ── Barre supérieure vitrée ── */}
      <header className="glass-strong relative z-10 flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="mr-2 flex select-none items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              boxShadow: '0 0 16px var(--accent-glow)',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white">
              <rect x="2" y="5" width="20" height="15" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <path d="M2 8l10 7 10-7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="brand-text hidden text-sm font-bold tracking-tight sm:block">
            MailFlow
          </span>
        </div>

        <SearchBar value={search} onChange={setSearch} />
        <FilterBar filters={filters} onChange={setFilters} />
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ── Barre latérale (desktop) ── */}
        <aside className="hidden w-64 shrink-0 border-r border-line md:block">
          {foldersLoading ? (
            <nav aria-label="Dossiers" className="h-full p-4">
              <div className="shimmer-bg h-5 w-24 rounded-lg" />
            </nav>
          ) : foldersError ? (
            <div className="h-full p-4">
              <p role="alert" className="text-sm text-danger">
                {foldersError}
              </p>
              <button
                type="button"
                onClick={reloadFolders}
                className="mt-3 rounded-xl border border-line-strong bg-surface-2 px-3 py-1.5 text-sm text-ink-dim transition-all hover:scale-105"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <Sidebar
              folders={folders}
              activeId={folderId}
              onSelect={selectFolder}
              onRefresh={reloadFolders}
              refreshing={foldersLoading}
            />
          )}
        </aside>

        {/* ── Écrans successifs (mobile) ── */}
        <div className="flex w-full flex-col md:hidden">
          <label htmlFor="folder-picker" className="sr-only">
            Dossier
          </label>
          <select
            id="folder-picker"
            value={folderId}
            onChange={(event) => selectFolder(event.target.value)}
            className="cursor-pointer border-b border-line bg-surface-2 px-4 py-2.5 text-sm font-medium text-ink"
          >
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.label}
                {folder.unread > 0 ? ` (${folder.unread})` : ''}
              </option>
            ))}
          </select>

          <div className={mobileView === 'read' ? 'hidden' : 'flex min-h-0 flex-1 flex-col'}>
            <MessageList {...listProps} />
          </div>

          <div className={mobileView === 'read' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
            <MessageReader
              message={message}
              loading={messageLoading}
              error={messageError}
              theme={theme}
              onRetry={reloadMessage}
              onBack={backToList}
              showBackButton
            />
          </div>
        </div>

        {/* ── Liste des messages (desktop) ── */}
        <section
          aria-label={`Messages — ${activeFolder?.label ?? folderId}`}
          className="hidden w-full max-w-sm shrink-0 flex-col border-r border-line md:flex"
        >
          <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-3">
            <h2 className="truncate text-sm font-semibold text-ink">
              {activeFolder?.label ?? folderId}
            </h2>
            <span
              className="shrink-0 rounded-full border border-accent-line bg-accent-soft px-2 py-0.5 text-xs font-medium tabular-nums"
              style={{ color: 'var(--accent-ink)' }}
            >
              {total}
            </span>
          </div>

          <MessageList {...listProps} />
        </section>

        {/* ── Panneau de lecture (desktop) ── */}
        <section
          className="hidden min-w-0 flex-1 flex-col md:flex"
          style={{ background: 'var(--reader-bg)' }}
        >
          <MessageReader
            message={message}
            loading={messageLoading}
            error={messageError}
            theme={theme}
            onRetry={reloadMessage}
            onBack={backToList}
            showBackButton={false}
          />
        </section>
      </div>
    </div>
  );
}

/** Le hook useMessages attend la recherche dans le même objet que les filtres. */
function filtersWithSearch(filters: MessageFilters, search: string) {
  return { ...filters, q: search };
}
