import { useCallback, useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import CategoryTabs from './components/CategoryTabs';
import type { CategoryType } from './components/CategoryTabs';
import TopToolbar from './components/TopToolbar';
import type { SplitViewMode } from './components/TopToolbar';
import MessageList from './components/MessageList';
import type { DisplayDensity } from './components/MessageItem';
import MessageReader from './components/MessageReader';
import RightSidebar from './components/RightSidebar';
import ComposeModal from './components/ComposeModal';
import SettingsDrawer from './components/SettingsDrawer';
import ShortcutsModal from './components/ShortcutsModal';
import Toast from './components/Toast';
import type { ToastData } from './components/Toast';

import { useFolders } from './hooks/useFolders';
import { useMessage } from './hooks/useMessage';
import { useMessages } from './hooks/useMessages';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const { theme, toggleTheme, setTheme } = useTheme();

  // Navigation & vues
  const [folderId, setFolderId] = useState('INBOX');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('primary');
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'read'>('list');
  const [search, setSearch] = useState('');
  const [navOpen, setNavOpen] = useState(true);

  // Configuration Gmail
  const [density, setDensity] = useState<DisplayDensity>('default');
  const [splitView, setSplitView] = useState<SplitViewMode>('none');

  // Modales & Tiroirs
  const [composeOpen, setComposeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Sélections et états interactifs locaux
  const [checkedUids, setCheckedUids] = useState<Set<number>>(new Set());
  const [starredUids, setStarredUids] = useState<Set<number>>(new Set());
  const [importantUids, setImportantUids] = useState<Set<number>>(new Set());
  const [readOverrides, setReadOverrides] = useState<Map<number, boolean>>(new Map());
  const [hiddenUids, setHiddenUids] = useState<Set<number>>(new Set());

  // Toasts / Snackbars
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback(
    (message: string, actionLabel?: string, onAction?: () => void) => {
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
      setToasts((prev) => [...prev, { id, message, actionLabel, onAction }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Détection dossier virtuel vs IMAP
  const isVirtualStarred = folderId === 'STARRED';
  const isVirtualImportant = folderId === 'IMPORTANT';
  const effectiveImapFolder = isVirtualStarred || isVirtualImportant ? 'INBOX' : folderId;

  // Filtres
  const filters = useMemo(
    () => ({
      q: search,
      unread: false,
      flagged: isVirtualStarred,
      attachments: false,
      sort: 'desc' as const,
    }),
    [search, isVirtualStarred],
  );

  const { folders, loading: foldersLoading, reload: reloadFolders } = useFolders(true);

  const {
    items: rawItems,
    total,
    loading: messagesLoading,
    loadingMore,
    refreshing,
    newCount,
    clearNewCount,
    error: messagesError,
    hasMore,
    reload: reloadMessages,
    loadMore,
  } = useMessages(effectiveImapFolder, filters);

  const {
    message: rawMessage,
    loading: messageLoading,
    error: messageError,
    reload: reloadMessage,
  } = useMessage(selectedUid, effectiveImapFolder);

  // Application des surcharges locales (masquage, lu/non lu, favoris)
  const items = useMemo(() => {
    return rawItems
      .filter((item) => !hiddenUids.has(item.uid))
      .map((item) => ({
        ...item,
        isRead: readOverrides.has(item.uid) ? readOverrides.get(item.uid)! : item.isRead,
        isFlagged: starredUids.has(item.uid) ? true : item.isFlagged,
      }));
  }, [rawItems, hiddenUids, readOverrides, starredUids]);

  // Initialisation des étoiles depuis les données distantes
  useEffect(() => {
    const remoteStarred = new Set<number>();
    rawItems.forEach((i) => {
      if (i.isFlagged) remoteStarred.add(i.uid);
    });
    if (remoteStarred.size > 0) {
      setStarredUids((prev) => new Set([...prev, ...remoteStarred]));
    }
  }, [rawItems]);

  const activeFolder = folders.find((f) => f.id === folderId);

  // Actions de navigation
  const handleSelectFolder = useCallback((id: string) => {
    setFolderId(id);
    setSelectedUid(null);
    setCheckedUids(new Set());
    setMobileView('list');
  }, []);

  const handleSelectMessage = useCallback(
    (uid: number) => {
      setSelectedUid(uid);
      setMobileView('read');
      // Marquer automatiquement comme lu à l'ouverture
      setReadOverrides((prev) => new Map(prev).set(uid, true));
    },
    [],
  );

  const handleBackToList = useCallback(() => {
    setSelectedUid(null);
    setMobileView('list');
  }, []);

  // Toggles de sélection
  const handleToggleCheck = useCallback((uid: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setCheckedUids(new Set(items.map((i) => i.uid)));
  }, [items]);

  const handleSelectNone = useCallback(() => {
    setCheckedUids(new Set());
  }, []);

  const handleSelectRead = useCallback(() => {
    setCheckedUids(new Set(items.filter((i) => i.isRead).map((i) => i.uid)));
  }, [items]);

  const handleSelectUnread = useCallback(() => {
    setCheckedUids(new Set(items.filter((i) => !i.isRead).map((i) => i.uid)));
  }, [items]);

  const handleSelectStarred = useCallback(() => {
    setCheckedUids(
      new Set(items.filter((i) => starredUids.has(i.uid) || i.isFlagged).map((i) => i.uid)),
    );
  }, [items, starredUids]);

  // Toggles favoris et importants
  const handleToggleStar = useCallback((uid: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setStarredUids((prev) => {
      const next = new Set(prev);
      const isNowStarred = !next.has(uid);
      if (isNowStarred) {
        next.add(uid);
        addToast('Message ajouté aux favoris');
      } else {
        next.delete(uid);
        addToast('Message supprimé des favoris');
      }
      return next;
    });
  }, [addToast]);

  const handleToggleImportant = useCallback((uid: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setImportantUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
        addToast('Message marqué comme non important');
      } else {
        next.add(uid);
        addToast('Message marqué comme important');
      }
      return next;
    });
  }, [addToast]);

  // Actions rapides et par lot
  const handleArchive = useCallback(
    (uid: number) => {
      setHiddenUids((prev) => new Set(prev).add(uid));
      if (selectedUid === uid) setSelectedUid(null);
      addToast('Conversation archivée.', 'Annuler', () => {
        setHiddenUids((prev) => {
          const next = new Set(prev);
          next.delete(uid);
          return next;
        });
      });
    },
    [selectedUid, addToast],
  );

  const handleDelete = useCallback(
    (uid: number) => {
      setHiddenUids((prev) => new Set(prev).add(uid));
      if (selectedUid === uid) setSelectedUid(null);
      addToast('Conversation placée dans la corbeille.', 'Annuler', () => {
        setHiddenUids((prev) => {
          const next = new Set(prev);
          next.delete(uid);
          return next;
        });
      });
    },
    [selectedUid, addToast],
  );

  const handleToggleRead = useCallback(
    (uid: number) => {
      const current = items.find((i) => i.uid === uid)?.isRead ?? false;
      const nextState = !current;
      setReadOverrides((prev) => new Map(prev).set(uid, nextState));
      addToast(nextState ? 'Marqué comme lu' : 'Marqué comme non lu');
    },
    [items, addToast],
  );

  const handleSnooze = useCallback(
    (uid: number) => {
      setHiddenUids((prev) => new Set(prev).add(uid));
      if (selectedUid === uid) setSelectedUid(null);
      addToast('Message mis en attente jusqu’à demain 08:00.', 'Annuler', () => {
        setHiddenUids((prev) => {
          const next = new Set(prev);
          next.delete(uid);
          return next;
        });
      });
    },
    [selectedUid, addToast],
  );

  // Batch actions
  const handleBatchArchive = useCallback(() => {
    const uidsToHide = Array.from(checkedUids);
    setHiddenUids((prev) => new Set([...prev, ...uidsToHide]));
    setCheckedUids(new Set());
    addToast(`${uidsToHide.length} conversation(s) archivée(s).`, 'Annuler', () => {
      setHiddenUids((prev) => {
        const next = new Set(prev);
        uidsToHide.forEach((u) => next.delete(u));
        return next;
      });
    });
  }, [checkedUids, addToast]);

  const handleBatchDelete = useCallback(() => {
    const uidsToHide = Array.from(checkedUids);
    setHiddenUids((prev) => new Set([...prev, ...uidsToHide]));
    setCheckedUids(new Set());
    addToast(`${uidsToHide.length} conversation(s) supprimée(s).`, 'Annuler', () => {
      setHiddenUids((prev) => {
        const next = new Set(prev);
        uidsToHide.forEach((u) => next.delete(u));
        return next;
      });
    });
  }, [checkedUids, addToast]);

  const handleBatchMarkRead = useCallback(() => {
    setReadOverrides((prev) => {
      const next = new Map(prev);
      checkedUids.forEach((uid) => next.set(uid, true));
      return next;
    });
    setCheckedUids(new Set());
    addToast(`${checkedUids.size} conversation(s) marquée(s) comme lue(s).`);
  }, [checkedUids, addToast]);

  const handleBatchMarkUnread = useCallback(() => {
    setReadOverrides((prev) => {
      const next = new Map(prev);
      checkedUids.forEach((uid) => next.set(uid, false));
      return next;
    });
    setCheckedUids(new Set());
    addToast(`${checkedUids.size} conversation(s) marquée(s) comme non lue(s).`);
  }, [checkedUids, addToast]);

  const handleBatchSnooze = useCallback(() => {
    const uidsToHide = Array.from(checkedUids);
    setHiddenUids((prev) => new Set([...prev, ...uidsToHide]));
    setCheckedUids(new Set());
    addToast(`${uidsToHide.length} conversation(s) mise(s) en attente.`);
  }, [checkedUids, addToast]);

  // Envoi d'email simulé réaliste
  const handleSendEmail = useCallback(
    (to: string, subject: string) => {
      addToast(`Message "${subject || 'Sans objet'}" envoyé à ${to}.`, 'Afficher le message');
    },
    [addToast],
  );

  // Raccourcis clavier globaux
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'c') {
        e.preventDefault();
        setComposeOpen(true);
      } else if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (composeOpen) setComposeOpen(false);
        else if (settingsOpen) setSettingsOpen(false);
        else if (shortcutsOpen) setShortcutsOpen(false);
        else if (selectedUid !== null && splitView === 'none') setSelectedUid(null);
      } else if (e.key === 's' && selectedUid !== null) {
        e.preventDefault();
        handleToggleStar(selectedUid);
      } else if (e.key === 'e' && selectedUid !== null) {
        e.preventDefault();
        handleArchive(selectedUid);
      } else if (e.key === '#' && selectedUid !== null) {
        e.preventDefault();
        handleDelete(selectedUid);
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    composeOpen,
    settingsOpen,
    shortcutsOpen,
    selectedUid,
    splitView,
    handleToggleStar,
    handleArchive,
    handleDelete,
  ]);

  // Props pour la liste de messages
  const listProps = {
    items,
    selectedUid,
    checkedUids,
    starredUids,
    importantUids,
    onSelect: handleSelectMessage,
    onToggleCheck: handleToggleCheck,
    onToggleStar: handleToggleStar,
    onToggleImportant: handleToggleImportant,
    onQuickArchive: (uid: number, e: React.MouseEvent) => {
      e.stopPropagation();
      handleArchive(uid);
    },
    onQuickDelete: (uid: number, e: React.MouseEvent) => {
      e.stopPropagation();
      handleDelete(uid);
    },
    onQuickToggleRead: (uid: number, e: React.MouseEvent) => {
      e.stopPropagation();
      handleToggleRead(uid);
    },
    onQuickSnooze: (uid: number, e: React.MouseEvent) => {
      e.stopPropagation();
      handleSnooze(uid);
    },
    loading: messagesLoading,
    loadingMore,
    error: messagesError,
    hasMore,
    onLoadMore: loadMore,
    onRetry: reloadMessages,
    emptyTitle: search.trim() ? 'Aucun résultat trouvé' : 'Votre boîte de réception est vide',
    emptyDescription: search.trim()
      ? 'Aucun message ne correspond à vos termes de recherche.'
      : 'Aucun nouveau message pour le moment.',
    density,
  };

  // Props pour la barre d'outils
  const toolbarProps = {
    selectedCount: checkedUids.size,
    totalVisible: items.length,
    totalOverall: total,
    loading: messagesLoading,
    onRefresh: () => {
      reloadFolders();
      reloadMessages();
    },
    onSelectAll: handleSelectAll,
    onSelectNone: handleSelectNone,
    onSelectRead: handleSelectRead,
    onSelectUnread: handleSelectUnread,
    onSelectStarred: handleSelectStarred,
    onBatchArchive: handleBatchArchive,
    onBatchDelete: handleBatchDelete,
    onBatchMarkRead: handleBatchMarkRead,
    onBatchMarkUnread: handleBatchMarkUnread,
    onBatchSnooze: handleBatchSnooze,
    splitView,
    onChangeSplitView: setSplitView,
    onOpenShortcuts: () => setShortcutsOpen(true),
  };

  // Props pour le lecteur de message
  const readerProps = {
    message: rawMessage,
    loading: messageLoading,
    error: messageError,
    theme,
    onRetry: reloadMessage,
    onBack: handleBackToList,
    showBackButton: splitView === 'none',
    onArchive: handleArchive,
    onDelete: handleDelete,
    onToggleStar: handleToggleStar,
    isStarred: selectedUid ? starredUids.has(selectedUid) : false,
    onSendReply: handleSendEmail,
  };

  const isInbox = folderId.toLowerCase() === 'inbox';
  const showFullReader = splitView === 'none' && selectedUid !== null;

  return (
    <div className="flex h-full flex-col bg-[#f6f8fc] dark:bg-[#1f1f1f] text-[#1f1f1f] dark:text-[#e8eaed] overflow-hidden select-none font-sans">
      {/* ── 1. En-tête Google Gmail officiel ── */}
      <Header
        navOpen={navOpen}
        onToggleNav={() => setNavOpen((open) => !open)}
        search={search}
        onSearchChange={setSearch}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      {/* ── 2. Corps principal : Barre latérale + Conteneur d'emails + Panneau compagnon ── */}
      <div className="flex min-h-0 flex-1 overflow-hidden pr-0 lg:pr-1 pb-2">
        {/* Volet de navigation gauche (déployé 256px ou rétracté 72px) */}
        <Sidebar
          folders={folders}
          activeId={folderId}
          onSelect={handleSelectFolder}
          onRefresh={reloadFolders}
          refreshing={foldersLoading}
          navOpen={navOpen}
          onCompose={() => setComposeOpen(true)}
          starredCount={starredUids.size}
        />

        {/* ── Sélecteur mobile (écrans < 768px) ── */}
        <div className="flex w-full flex-col md:hidden overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#141414] px-4 py-2">
            <select
              value={folderId}
              onChange={(e) => handleSelectFolder(e.target.value)}
              className="bg-transparent text-sm font-semibold text-[#1f1f1f] dark:text-[#e8eaed] outline-none"
            >
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label} {f.unread > 0 ? `(${f.unread})` : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="rounded-full bg-[#c2e7ff] text-[#001d35] px-3 py-1 text-xs font-semibold"
            >
              Rédiger
            </button>
          </div>

          <div className={mobileView === 'read' ? 'hidden' : 'flex flex-1 flex-col overflow-hidden'}>
            <TopToolbar {...toolbarProps} />
            {isInbox && (
              <CategoryTabs
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
                unreadCount={activeFolder?.unread ?? 0}
              />
            )}
            {/* Banner nouveaux emails */}
            {newCount > 0 && (
              <button
                type="button"
                onClick={() => { clearNewCount(); void reloadMessages(); }}
                className="mx-3 mb-1 flex items-center justify-center gap-2 rounded-full bg-[#0b57d0] dark:bg-[#a8c7fa] text-white dark:text-[#001d35] py-2 text-xs font-semibold shadow-md animate-bounce hover:bg-[#0842a0] transition-colors"
              >
                <span>🔔 {newCount} nouveau{newCount > 1 ? 'x' : ''} email{newCount > 1 ? 's' : ''} — Cliquez pour actualiser</span>
              </button>
            )}
            {refreshing && !messagesLoading && (
              <div className="flex items-center justify-center gap-1.5 py-1 text-[10px] text-[#5f6368] dark:text-[#9aa0a6]">
                <span className="h-2 w-2 rounded-full bg-[#0b57d0] animate-ping" />
                Actualisation…
              </div>
            )}
            <MessageList {...listProps} />
          </div>

          <div className={mobileView === 'read' ? 'flex flex-1 flex-col overflow-hidden' : 'hidden'}>
            <MessageReader {...readerProps} showBackButton={true} />
          </div>
        </div>

        {/* ── Conteneur Gmail Principal (carte blanche arrondie Material 3) ── */}
        <main className="hidden md:flex min-w-0 flex-1 rounded-2xl bg-white dark:bg-[#141414] border border-[#e0e2e7] dark:border-[#3c4043] overflow-hidden shadow-xs">
          {/* Mode 1 : Plein écran lecteur (Pas de séparation + message sélectionné) */}
          {showFullReader ? (
            <div className="flex flex-1 flex-col overflow-hidden">
              <MessageReader {...readerProps} />
            </div>
          ) : splitView === 'vertical' ? (
            /* Mode 2 : Séparation verticale (Liste à gauche, lecteur à droite) */
            <div className="flex flex-1 min-w-0 overflow-hidden divide-x divide-[#e0e2e7] dark:divide-[#3c4043]">
              <div className="flex flex-col w-[42%] min-w-[340px] max-w-[560px] overflow-hidden">
                <TopToolbar {...toolbarProps} />
                {isInbox && (
                  <CategoryTabs
                    activeCategory={activeCategory}
                    onSelectCategory={setActiveCategory}
                    unreadCount={activeFolder?.unread ?? 0}
                  />
                )}
                {newCount > 0 && (
                  <button type="button" onClick={() => { clearNewCount(); void reloadMessages(); }}
                    className="mx-3 mb-1 flex items-center justify-center gap-2 rounded-full bg-[#0b57d0] dark:bg-[#a8c7fa] text-white dark:text-[#001d35] py-1.5 text-xs font-semibold shadow-md animate-bounce hover:bg-[#0842a0] transition-colors">
                    🔔 {newCount} nouveau{newCount > 1 ? 'x' : ''} email{newCount > 1 ? 's' : ''} — Actualiser
                  </button>
                )}
                {refreshing && !messagesLoading && (
                  <div className="flex items-center justify-center gap-1.5 py-0.5 text-[10px] text-[#5f6368] dark:text-[#9aa0a6]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0b57d0] animate-ping" /> Actualisation…
                  </div>
                )}
                <MessageList {...listProps} />
              </div>
              <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
                <MessageReader {...readerProps} showBackButton={false} />
              </div>
            </div>
          ) : splitView === 'horizontal' ? (
            /* Mode 3 : Séparation horizontale (Liste en haut, lecteur en bas) */
            <div className="flex flex-1 flex-col min-w-0 overflow-hidden divide-y divide-[#e0e2e7] dark:divide-[#3c4043]">
              <div className="flex flex-col h-[45%] overflow-hidden">
                <TopToolbar {...toolbarProps} />
                {isInbox && (
                  <CategoryTabs
                    activeCategory={activeCategory}
                    onSelectCategory={setActiveCategory}
                    unreadCount={activeFolder?.unread ?? 0}
                  />
                )}
                {newCount > 0 && (
                  <button type="button" onClick={() => { clearNewCount(); void reloadMessages(); }}
                    className="mx-3 mb-1 flex items-center justify-center gap-2 rounded-full bg-[#0b57d0] dark:bg-[#a8c7fa] text-white dark:text-[#001d35] py-1.5 text-xs font-semibold shadow-md animate-bounce hover:bg-[#0842a0] transition-colors">
                    🔔 {newCount} nouveau{newCount > 1 ? 'x' : ''} email{newCount > 1 ? 's' : ''} — Actualiser
                  </button>
                )}
                {refreshing && !messagesLoading && (
                  <div className="flex items-center justify-center gap-1.5 py-0.5 text-[10px] text-[#5f6368] dark:text-[#9aa0a6]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0b57d0] animate-ping" /> Actualisation…
                  </div>
                )}
                <MessageList {...listProps} />
              </div>
              <div className="flex flex-1 flex-col overflow-hidden">
                <MessageReader {...readerProps} showBackButton={false} />
              </div>
            </div>
          ) : (
            /* Mode 4 : Liste seule (Pas de séparation) */
            <div className="flex flex-1 flex-col overflow-hidden">
              <TopToolbar {...toolbarProps} />
              {isInbox && (
                <CategoryTabs
                  activeCategory={activeCategory}
                  onSelectCategory={setActiveCategory}
                  unreadCount={activeFolder?.unread ?? 0}
                />
              )}
              {newCount > 0 && (
                <button type="button" onClick={() => { clearNewCount(); void reloadMessages(); }}
                  className="mx-3 mb-1 flex items-center justify-center gap-2 rounded-full bg-[#0b57d0] dark:bg-[#a8c7fa] text-white dark:text-[#001d35] py-2 text-xs font-semibold shadow-md animate-bounce hover:bg-[#0842a0] transition-colors">
                  🔔 {newCount} nouveau{newCount > 1 ? 'x' : ''} email{newCount > 1 ? 's' : ''} — Cliquez pour actualiser
                </button>
              )}
              {refreshing && !messagesLoading && (
                <div className="flex items-center justify-center gap-1.5 py-1 text-[10px] text-[#5f6368] dark:text-[#9aa0a6]">
                  <span className="h-2 w-2 rounded-full bg-[#0b57d0] animate-ping" /> Actualisation…
                </div>
              )}
              <MessageList {...listProps} />
            </div>
          )}
        </main>

        {/* ── 3. Volet latéral Google (Agenda, Keep, Tâches, Contacts) ── */}
        <RightSidebar />
      </div>

      {/* ── 4. Fenêtre flottante "Nouveau message" (Compose) ── */}
      <ComposeModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSend={handleSendEmail}
      />

      {/* ── 5. Tiroir de configuration rapide (Settings) ── */}
      <SettingsDrawer
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        density={density}
        onChangeDensity={setDensity}
        theme={theme}
        onChangeTheme={setTheme}
        splitView={splitView}
        onChangeSplitView={setSplitView}
      />

      {/* ── 6. Modale d'aide des raccourcis clavier ── */}
      <ShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* ── 7. Notifications flottantes (Snackbars / Toasts) ── */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
