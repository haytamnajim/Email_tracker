import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
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
import FollowupsPanel from './components/FollowupsPanel';
import NewEmailsBanner from './components/NewEmailsBanner';
import SettingsDrawer from './components/SettingsDrawer';
import ShortcutsModal from './components/ShortcutsModal';
import Toast from './components/Toast';
import type { ToastData } from './components/Toast';

import { useFolders } from './hooks/useFolders';
import { useMessage } from './hooks/useMessage';
import { useMessages } from './hooks/useMessages';
import { useTheme } from './hooks/useTheme';
import { categorizeMessage, countByCategory } from './utils/categories';
import { classifyEmail } from './utils/classification';
import type { EmailClass } from './utils/classification';
import {
  sendEmailWithN8n,
  sendEmailWithSmtp,
  getSmtpStatus,
  markMessageRead,
  markMessageFlagged,
  markMessagesRead,
  moveMessage,
  moveMessages,
  snoozeMessage,
  snoozeMessages,
  unsnoozeMessage,
  setMessagesKeyword,
} from './api';
import type { FollowupCandidate } from './api';
import { EMPTY_ADVANCED_FILTERS } from './types';
import type { AdvancedFilters, Folder } from './types';

interface PendingMoveAction {
  timer: number;
  uids: number[];
}

/** Cherche un dossier spécial IMAP, avec repli sur son libellé français. */
function findSpecialFolder(
  folders: Folder[],
  specialUses: string[],
  fallback: RegExp,
): Folder | undefined {
  return (
    folders.find(
      (folder) => folder.specialUse !== undefined && specialUses.includes(folder.specialUse),
    ) ?? folders.find((folder) => fallback.test(`${folder.id} ${folder.name} ${folder.label}`))
  );
}

function nextTomorrowAt8(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(8, 0, 0, 0);
  return date;
}

function formatSnoozeDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export default function App() {
  const { theme, toggleTheme, setTheme } = useTheme();

  // Navigation & vues
  const [folderId, setFolderId] = useState('INBOX');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('primary');
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'read'>('list');
  const [search, setSearch] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(EMPTY_ADVANCED_FILTERS);
  const [navOpen, setNavOpen] = useState(true);

  // Configuration Gmail
  const [density, setDensity] = useState<DisplayDensity>('default');
  const [splitView, setSplitView] = useState<SplitViewMode>('none');

  // Modales & Tiroirs
  const [composeOpen, setComposeOpen] = useState(false);
  const [followupsOpen, setFollowupsOpen] = useState(false);
  const [composeDraft, setComposeDraft] = useState({ to: '', subject: '', body: '' });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Sélections et états interactifs locaux
  const [checkedUids, setCheckedUids] = useState<Set<number>>(new Set());
  const [starredUids, setStarredUids] = useState<Set<number>>(new Set());
  const [importantUids, setImportantUids] = useState<Set<number>>(new Set());
  const [readOverrides, setReadOverrides] = useState<Map<number, boolean>>(new Map());
  const [hiddenUids, setHiddenUids] = useState<Set<number>>(new Set());

  // Actions différées (archivage/suppression avec 5 s d'annulation)
  const pendingMovesRef = useRef<Map<string, PendingMoveAction>>(new Map());
  const folderIdRef = useRef(folderId);
  folderIdRef.current = folderId;

  // Toasts / Snackbars
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Statut SMTP direct (prioritaire sur n8n)
  const [smtpAvailable, setSmtpAvailable] = useState(false);
  const [smtpWorking, setSmtpWorking] = useState(false);

  // Notifications de bureau
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [notificationEnabled, setNotificationEnabled] = useState(false);

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

  // Nettoie les minuteurs d'action différée au démontage de l'application.
  useEffect(
    () => () => {
      pendingMovesRef.current.forEach((pending) => window.clearTimeout(pending.timer));
      pendingMovesRef.current.clear();
    },
    [],
  );

  const openCompose = useCallback(() => {
    setComposeDraft({ to: '', subject: '', body: '' });
    setComposeOpen(true);
  }, []);

  const handlePrepareFollowup = useCallback(
    (candidate: FollowupCandidate) => {
      const greeting = candidate.to.name?.trim()
        ? `Bonjour ${candidate.to.name.trim()},`
        : 'Bonjour,';
      const sentDate = new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
      }).format(new Date(candidate.date));
      const originalSubject = candidate.subject || '(sans objet)';

      setComposeDraft({
        to: candidate.to.address ?? '',
        subject: originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`,
        body: `${greeting}\n\nJe me permets de revenir vers vous concernant mon message du ${sentDate} au sujet de « ${originalSubject} ».\n\nAvez-vous pu en prendre connaissance ? Je reste disponible si vous avez besoin de précisions.\n\nBien cordialement,`,
      });
      setComposeOpen(true);
      addToast('Relance prête : relis et modifie le texte avant l’envoi.');
    },
    [addToast],
  );

  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [filterAttachmentOnly, setFilterAttachmentOnly] = useState(false);
  const [classificationFilter, setClassificationFilter] = useState<EmailClass | 'all'>('all');

  // Détection dossier virtuel vs IMAP
  const isVirtualStarred = folderId === 'STARRED';
  const isVirtualImportant = folderId === 'IMPORTANT';
  const effectiveImapFolder = isVirtualStarred || isVirtualImportant ? 'INBOX' : folderId;

  // Filtres
  const filters = useMemo(
    () => ({
      q: search,
      from: advancedFilters.from,
      to: advancedFilters.to,
      subject: advancedFilters.subject,
      unread: filterUnreadOnly,
      flagged: isVirtualStarred,
      attachments: filterAttachmentOnly || advancedFilters.hasAttachment,
      sort: 'desc' as const,
    }),
    [search, advancedFilters, isVirtualStarred, filterUnreadOnly, filterAttachmentOnly],
  );

  const { folders, loading: foldersLoading, reload: reloadFolders } = useFolders(true);

  // Dossiers spéciaux utilisés par les actions réelles (archiver, supprimer).
  const archiveFolder = useMemo(
    () =>
      findSpecialFolder(folders, ['\\Archive', '\\All'], /archive|all mail|tous les messages/i),
    [folders],
  );
  const trashFolder = useMemo(
    () => findSpecialFolder(folders, ['\\Trash'], /corbeille|trash|deleted|supprimés/i),
    [folders],
  );

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

  // ── Écran d'accueil ──
  // Il est écrit en HTML/CSS inline dans index.html, donc affiché avant le
  // chargement de JavaScript et des polices : c'est ce qui supprime le flash
  // blanc au rafraîchissement. On ne le retire qu'ici, une fois que les
  // données initiales sont arrivées — pas dès le montage, sinon l'utilisateur
  // verrait un contenu vide pendant que l'IMAP travaille.
  const splashRetiredRef = useRef(false);
  useEffect(() => {
    if (splashRetiredRef.current) return;
    if (foldersLoading || messagesLoading) return;
    splashRetiredRef.current = true;

    const splash = document.getElementById('splash');
    if (!splash) return;
    splash.classList.add('is-done');
    // La transition d'opacité vaut 300 ms : on purge le nœud à la fin.
    const purge = window.setTimeout(() => splash.remove(), 340);
    return () => window.clearTimeout(purge);
  }, [foldersLoading, messagesLoading]);

  // ── Statut SMTP : on vérifie au démarrage et on rafraîchit à la demande ──
  const checkSmtpStatus = useCallback(async () => {
    try {
      const status = await getSmtpStatus();
      setSmtpAvailable(status.available);
      setSmtpWorking(status.working);
    } catch {
      setSmtpAvailable(false);
      setSmtpWorking(false);
    }
  }, []);

  useEffect(() => {
    void checkSmtpStatus();
    const handler = () => void checkSmtpStatus();
    window.addEventListener('webmail-check-smtp', handler);
    return () => window.removeEventListener('webmail-check-smtp', handler);
  }, [checkSmtpStatus]);

  // ── Notifications de bureau : demande de permission au premier chargement ──
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotificationPermission(Notification.permission);
      setNotificationEnabled(Notification.permission === 'granted');
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return false;
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
    const granted = perm === 'granted';
    setNotificationEnabled(granted);
    return granted;
  }, []);

  // ── Détection nouveaux emails → notification sonore + bureau ──
  // On conserve la référence aux UIDs connus côté hook useMessages (knownUids),
  // mais on a besoin ici de déclencher la notification au moment où newCount > 0.
  const lastNewCountRef = useRef(0);
  useEffect(() => {
    if (newCount > lastNewCountRef.current) {
      const arrived = newCount - lastNewCountRef.current;
      // Son discret (AudioContext, pas de fichier externe)
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } catch {
        // AudioContext bloqué (politique navigateur) : on ignore.
      }
      // Notification de bureau si autorisée et onglet pas visible
      if (notificationEnabled && document.visibilityState !== 'visible') {
        try {
          const title = arrived === 1 ? 'Nouvel email' : `${arrived} nouveaux emails`;
          new Notification(title, {
            body: arrived === 1 ? 'Un message vient d\'arriver.' : `${arrived} messages sont arrivés.`,
            icon: '/vite.svg',
            tag: 'webmail-new-mail',
          } as NotificationOptions & { renotify?: boolean });
        } catch {
          // Notification bloquée : on ignore.
        }
      }
    }
    lastNewCountRef.current = newCount;
  }, [newCount, notificationEnabled]);
  const items = useMemo(() => {
    return rawItems
      .filter((item) => !hiddenUids.has(item.uid))
      .map((item) => ({
        ...item,
        isRead: readOverrides.has(item.uid) ? readOverrides.get(item.uid)! : item.isRead,
        isFlagged: starredUids.has(item.uid) ? true : item.isFlagged,
      }));
  }, [rawItems, hiddenUids, readOverrides, starredUids]);

  const isInbox = folderId.toLowerCase() === 'inbox';

  // ── Filtrage par catégorie Gmail (#9) : uniquement en boîte de réception ──
  const visibleItems = useMemo(() => {
    const inCategory = !isInbox
      ? items
      : items.filter((item) => categorizeMessage(item) === activeCategory);
    if (classificationFilter === 'all') return inCategory;
    return inCategory.filter((item) => classifyEmail(item).id === classificationFilter);
  }, [items, isInbox, activeCategory, classificationFilter]);

  // Vrais compteurs par catégorie pour les badges des onglets (#9)
  const categoryCounts = useMemo(() => countByCategory(items), [items]);

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

  // ── Titre d'onglet dynamique façon Gmail (#2) : (12) Boîte de réception - Gmail ──
  useEffect(() => {
    const unread = activeFolder?.unread ?? 0;
    const label = activeFolder?.label ?? 'Boîte de réception';
    document.title = unread > 0 ? `(${unread}) ${label} - Gmail` : `${label} - Gmail`;
  }, [activeFolder]);

  // Actions de navigation
  const handleSelectFolder = useCallback((id: string) => {
    setFolderId(id);
    setSelectedUid(null);
    setCheckedUids(new Set());
    // Les UID IMAP ne sont uniques que DANS une mailbox. Sans cette purge,
    // archiver le message 1234 de la boîte de réception faisait aussi
    // disparaître le 1234 des messages envoyés et de la corbeille, et leur
    // appliquait à tort lu/suivi/étoile.
    setHiddenUids(new Set());
    setStarredUids(new Set());
    setImportantUids(new Set());
    setReadOverrides(new Map());
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
    setCheckedUids(new Set(visibleItems.map((i) => i.uid)));
  }, [visibleItems]);

  const handleSelectNone = useCallback(() => {
    setCheckedUids(new Set());
  }, []);

  const handleSelectRead = useCallback(() => {
    setCheckedUids(new Set(visibleItems.filter((i) => i.isRead).map((i) => i.uid)));
  }, [visibleItems]);

  const handleSelectUnread = useCallback(() => {
    setCheckedUids(new Set(visibleItems.filter((i) => !i.isRead).map((i) => i.uid)));
  }, [visibleItems]);

  const handleSelectStarred = useCallback(() => {
    setCheckedUids(
      new Set(visibleItems.filter((i) => starredUids.has(i.uid) || i.isFlagged).map((i) => i.uid)),
    );
  }, [visibleItems, starredUids]);

  // Toggles favoris (étoile) — synchronise avec IMAP (\Flagged)
  const handleToggleStar = useCallback((uid: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isNowStarred = !starredUids.has(uid);
    setStarredUids((prev) => {
      const next = new Set(prev);
      if (isNowStarred) {
        next.add(uid);
        addToast('Message ajouté aux favoris');
      } else {
        next.delete(uid);
        addToast('Message supprimé des favoris');
      }
      return next;
    });
    // Sync IMAP (fire-and-forget, l'UI est déjà mise à jour)
    void markMessageFlagged(uid, effectiveImapFolder, isNowStarred).catch(() => {
      // Si l'appel échoue, l'état local reste — l'utilisateur peut réessayer.
      // On ne fait pas de rollback automatique pour éviter le clignotement.
    });
  }, [addToast, effectiveImapFolder, starredUids]);

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

  // ── Actions différées : l'écriture IMAP part après 5 s, annulable ──
  const scheduleMove = useCallback(
    (options: {
      uids: number[];
      from: string;
      to: string;
      viewFolder: string;
      pendingMessage: string;
      successMessage: string;
    }) => {
      const uids = Array.from(new Set(options.uids));
      if (uids.length === 0) return;
      const actionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const restore = () => {
        if (folderIdRef.current !== options.viewFolder) return;
        setHiddenUids((prev) => {
          const next = new Set(prev);
          uids.forEach((uid) => next.delete(uid));
          return next;
        });
      };

      setHiddenUids((prev) => new Set([...prev, ...uids]));
      setSelectedUid((current) => (current !== null && uids.includes(current) ? null : current));

      addToast(options.pendingMessage, 'Annuler', () => {
        const pending = pendingMovesRef.current.get(actionId);
        if (!pending) return;
        window.clearTimeout(pending.timer);
        pendingMovesRef.current.delete(actionId);
        restore();
        addToast('Action annulée.');
      });

      const timer = window.setTimeout(() => {
        pendingMovesRef.current.delete(actionId);
        void moveMessages(uids, options.from, options.to)
          .then(() => {
            addToast(options.successMessage);
            reloadFolders();
            reloadMessages();
          })
          .catch((error: unknown) => {
            restore();
            addToast(error instanceof Error ? error.message : "L'action a échoué.");
          });
      }, 5000);

      pendingMovesRef.current.set(actionId, { timer, uids });
    },
    [addToast, reloadFolders, reloadMessages],
  );

  /** Dossier réel du message, y compris dans les vues virtuelles (suivis, importants). */
  const sourceFolderFor = useCallback(
    (uid: number) => (rawMessage?.uid === uid ? rawMessage.folder : effectiveImapFolder),
    [rawMessage, effectiveImapFolder],
  );

  const handleArchive = useCallback(
    (uid: number) => {
      if (!archiveFolder) {
        addToast("Dossier d'archives introuvable sur ce compte.");
        return;
      }
      const from = sourceFolderFor(uid);
      if (from === archiveFolder.id) {
        addToast('Ce message est déjà archivé.');
        return;
      }
      scheduleMove({
        uids: [uid],
        from,
        to: archiveFolder.id,
        viewFolder: folderId,
        pendingMessage: 'Archivage dans 5 secondes…',
        successMessage: 'Conversation archivée.',
      });
    },
    [archiveFolder, sourceFolderFor, folderId, scheduleMove, addToast],
  );

  const handleDelete = useCallback(
    (uid: number) => {
      if (!trashFolder) {
        addToast('Dossier Corbeille introuvable sur ce compte.');
        return;
      }
      const from = sourceFolderFor(uid);
      if (from === trashFolder.id) {
        addToast('Ce message est déjà dans la Corbeille.');
        return;
      }
      scheduleMove({
        uids: [uid],
        from,
        to: trashFolder.id,
        viewFolder: folderId,
        pendingMessage: 'Déplacement vers la Corbeille dans 5 secondes…',
        successMessage: 'Conversation placée dans la Corbeille.',
      });
    },
    [trashFolder, sourceFolderFor, folderId, scheduleMove, addToast],
  );

  const handleToggleRead = useCallback(
    (uid: number) => {
      const current =
        readOverrides.get(uid) ?? items.find((i) => i.uid === uid)?.isRead ?? false;
      const nextState = !current;
      setReadOverrides((prev) => new Map(prev).set(uid, nextState));
      addToast(nextState ? 'Marqué comme lu' : 'Marqué comme non lu');
      // Sync IMAP
      void markMessageRead(uid, effectiveImapFolder, nextState).catch(() => {
        // Échec silencieux : l'état local reste.
      });
    },
    [items, readOverrides, addToast, effectiveImapFolder],
  );

  const handleSnooze = useCallback(
    (uid: number, until = nextTomorrowAt8().toISOString(), label = formatSnoozeDate(until)) => {
      const from = sourceFolderFor(uid);
      const viewFolder = folderId;
      const restore = () => {
        if (folderIdRef.current !== viewFolder) return;
        setHiddenUids((prev) => {
          const next = new Set(prev);
          next.delete(uid);
          return next;
        });
      };

      setHiddenUids((prev) => new Set(prev).add(uid));
      setSelectedUid((current) => (current === uid ? null : current));

      void snoozeMessage(uid, from, until)
        .then(() => {
          addToast(`Message mis en attente jusqu’au ${label}.`, 'Annuler', () => {
            void unsnoozeMessage(uid)
              .then(() => {
                restore();
                reloadFolders();
                reloadMessages();
                addToast('Message sorti de la mise en attente.');
              })
              .catch((error: unknown) => {
                addToast(
                  error instanceof Error ? error.message : 'Annulation impossible.',
                );
              });
          });
          reloadFolders();
          reloadMessages();
        })
        .catch((error: unknown) => {
          restore();
          addToast(error instanceof Error ? error.message : 'Mise en attente impossible.');
        });
    },
    [sourceFolderFor, folderId, addToast, reloadFolders, reloadMessages],
  );

  const handleMoveMessage = useCallback(
    (uid: number, targetFolder: string) => {
      const sourceFolder = sourceFolderFor(uid);
      const targetLabel =
        folders.find((folder) => folder.id === targetFolder)?.label ?? targetFolder;

      setHiddenUids((prev) => new Set(prev).add(uid));
      setSelectedUid((current) => (current === uid ? null : current));

      void moveMessage(uid, sourceFolder, targetFolder)
        .then(() => {
          addToast(`Message déplacé vers ${targetLabel}.`);
          reloadFolders();
          reloadMessages();
        })
        .catch((err: unknown) => {
          setHiddenUids((prev) => {
            const next = new Set(prev);
            next.delete(uid);
            return next;
          });
          addToast(err instanceof Error ? err.message : 'Déplacement impossible.');
        });
    },
    [sourceFolderFor, folders, addToast, reloadFolders, reloadMessages],
  );

  // ── Actions par lot ──────────────────────────────────────────────
  const handleBatchArchive = useCallback(() => {
    const uids = Array.from(checkedUids);
    if (uids.length === 0) return;
    if (!archiveFolder) {
      addToast("Dossier d'archives introuvable sur ce compte.");
      return;
    }
    if (effectiveImapFolder === archiveFolder.id) {
      addToast('Les messages sont déjà archivés.');
      return;
    }
    setCheckedUids(new Set());
    scheduleMove({
      uids,
      from: effectiveImapFolder,
      to: archiveFolder.id,
      viewFolder: folderId,
      pendingMessage: `${uids.length} conversation(s) seront archivées dans 5 secondes…`,
      successMessage: `${uids.length} conversation(s) archivée(s).`,
    });
  }, [checkedUids, archiveFolder, effectiveImapFolder, folderId, scheduleMove, addToast]);

  const handleBatchDelete = useCallback(() => {
    const uids = Array.from(checkedUids);
    if (uids.length === 0) return;
    if (!trashFolder) {
      addToast('Dossier Corbeille introuvable sur ce compte.');
      return;
    }
    if (effectiveImapFolder === trashFolder.id) {
      addToast('Les messages sont déjà dans la Corbeille.');
      return;
    }
    setCheckedUids(new Set());
    scheduleMove({
      uids,
      from: effectiveImapFolder,
      to: trashFolder.id,
      viewFolder: folderId,
      pendingMessage: `${uids.length} conversation(s) seront déplacées vers la Corbeille dans 5 secondes…`,
      successMessage: `${uids.length} conversation(s) placée(s) dans la Corbeille.`,
    });
  }, [checkedUids, trashFolder, effectiveImapFolder, folderId, scheduleMove, addToast]);

  const handleBatchMove = useCallback(
    (targetFolder: string) => {
      const uids = Array.from(checkedUids);
      if (uids.length === 0) return;
      if (targetFolder === effectiveImapFolder) {
        addToast('Les messages sont déjà dans ce dossier.');
        return;
      }
      const targetLabel =
        folders.find((folder) => folder.id === targetFolder)?.label ?? targetFolder;
      setCheckedUids(new Set());
      scheduleMove({
        uids,
        from: effectiveImapFolder,
        to: targetFolder,
        viewFolder: folderId,
        pendingMessage: `${uids.length} conversation(s) seront déplacées vers ${targetLabel} dans 5 secondes…`,
        successMessage: `${uids.length} conversation(s) déplacée(s) vers ${targetLabel}.`,
      });
    },
    [checkedUids, effectiveImapFolder, folders, folderId, scheduleMove, addToast],
  );

  const handleBatchLabel = useCallback(
    (keyword: string, label: string) => {
      const uids = Array.from(checkedUids);
      if (uids.length === 0) return;
      setCheckedUids(new Set());
      void setMessagesKeyword(uids, effectiveImapFolder, keyword, true)
        .then((result) => {
          addToast(
            `Étiquette « ${label} » appliquée à ${result.count ?? uids.length} conversation(s).`,
          );
        })
        .catch((error: unknown) => {
          addToast(
            error instanceof Error ? error.message : "Impossible d'appliquer l'étiquette.",
          );
        });
    },
    [checkedUids, effectiveImapFolder, addToast],
  );

  const handleBatchMarkRead = useCallback(() => {
    const uids = Array.from(checkedUids);
    if (uids.length === 0) return;
    setReadOverrides((prev) => {
      const next = new Map(prev);
      uids.forEach((uid) => next.set(uid, true));
      return next;
    });
    setCheckedUids(new Set());
    addToast(`${uids.length} conversation(s) marquée(s) comme lue(s).`);
    void markMessagesRead(uids, effectiveImapFolder, true).catch((error: unknown) => {
      setReadOverrides((prev) => {
        const next = new Map(prev);
        uids.forEach((uid) => next.delete(uid));
        return next;
      });
      addToast(error instanceof Error ? error.message : 'Mise à jour impossible.');
    });
  }, [checkedUids, effectiveImapFolder, addToast]);

  const handleBatchMarkUnread = useCallback(() => {
    const uids = Array.from(checkedUids);
    if (uids.length === 0) return;
    setReadOverrides((prev) => {
      const next = new Map(prev);
      uids.forEach((uid) => next.set(uid, false));
      return next;
    });
    setCheckedUids(new Set());
    addToast(`${uids.length} conversation(s) marquée(s) comme non lue(s).`);
    void markMessagesRead(uids, effectiveImapFolder, false).catch((error: unknown) => {
      setReadOverrides((prev) => {
        const next = new Map(prev);
        uids.forEach((uid) => next.delete(uid));
        return next;
      });
      addToast(error instanceof Error ? error.message : 'Mise à jour impossible.');
    });
  }, [checkedUids, effectiveImapFolder, addToast]);

  const handleBatchSnooze = useCallback(() => {
    const uids = Array.from(checkedUids);
    if (uids.length === 0) return;
    const until = nextTomorrowAt8().toISOString();
    const label = formatSnoozeDate(until);
    const viewFolder = folderId;

    setHiddenUids((prev) => new Set([...prev, ...uids]));
    setCheckedUids(new Set());
    setSelectedUid((current) => (current !== null && uids.includes(current) ? null : current));

    const restore = () => {
      if (folderIdRef.current !== viewFolder) return;
      setHiddenUids((prev) => {
        const next = new Set(prev);
        uids.forEach((uid) => next.delete(uid));
        return next;
      });
    };

    void snoozeMessages(uids, effectiveImapFolder, until)
      .then(() => {
        addToast(`${uids.length} conversation(s) mise(s) en attente jusqu’au ${label}.`, 'Annuler', () => {
          void Promise.allSettled(uids.map((uid) => unsnoozeMessage(uid))).then((results) => {
            const failures = results.filter((result) => result.status === 'rejected').length;
            if (failures === 0) restore();
            reloadFolders();
            reloadMessages();
            addToast(
              failures === 0
                ? 'Mise en attente annulée.'
                : `${failures} message(s) n'ont pas pu être replacés.`,
            );
          });
        });
        reloadFolders();
        reloadMessages();
      })
      .catch((error: unknown) => {
        restore();
        addToast(
          error instanceof Error ? error.message : 'Mise en attente impossible.',
        );
      });
  }, [
    checkedUids,
    effectiveImapFolder,
    folderId,
    addToast,
    reloadFolders,
    reloadMessages,
  ]);

  // Envoi d'email : SMTP direct prioritaire, n8n en repli
  const pendingSendsRef = useRef<Map<string, number>>(new Map());

  // Envoi d'email avec buffer d'annulation (Undo Send façon Gmail pendant 5s)
  const handleSendEmail = useCallback(
    async (to: string, subject: string, body: string, messageUid?: number, folder?: string): Promise<boolean> => {
      const sendId = Date.now().toString() + Math.random().toString(36).slice(2, 6);

      const performSend = async () => {
        pendingSendsRef.current.delete(sendId);
        // 1) Essaye SMTP direct
        if (smtpAvailable && smtpWorking) {
          try {
            const res = await sendEmailWithSmtp({ to, subject, body, messageUid, folder });
            if (res.success) return true;
          } catch (err) {
            console.warn('[SMTP send error, falling back to n8n]', err);
          }
        }

        // 2) Fallback : webhook n8n
        const storedSendWebhook = localStorage.getItem('n8n_send_webhook_url') || undefined;
        try {
          const res = await sendEmailWithN8n({
            sendWebhookUrl: storedSendWebhook,
            to,
            subject,
            body,
            messageUid,
          });
          return res.success;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          addToast(`Erreur d'envoi n8n : ${msg}`);
          return false;
        }
      };

      const timerId = window.setTimeout(() => {
        void performSend();
      }, 5000);

      pendingSendsRef.current.set(sendId, timerId);

      // Toast avec bouton Annuler officiel Gmail
      addToast('Message envoyé.', 'Annuler', () => {
        const tid = pendingSendsRef.current.get(sendId);
        if (tid) {
          window.clearTimeout(tid);
          pendingSendsRef.current.delete(sendId);
          addToast('Envoi annulé.');
        }
      });

      return true;
    },
    [addToast, smtpAvailable, smtpWorking],
  );

  // Raccourcis clavier globaux
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      // Échap est traité AVANT la garde sur les champs de saisie. Autrement,
      // rédiger un email puis appuyer sur Échap — le geste universel pour
      // fermer — ne faisait rien du tout : le handler abandonnait dès qu'il
      // voyait un INPUT ou une TEXTAREA.
      if (e.key === 'Escape') {
        if (composeOpen) setComposeOpen(false);
        else if (settingsOpen) setSettingsOpen(false);
        else if (shortcutsOpen) setShortcutsOpen(false);
        else if (selectedUid !== null && splitView === 'none') setSelectedUid(null);
        return;
      }

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
        openCompose();
      } else if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      } else if (
        (e.key === 's' || e.key === 'e' || e.key === '#') &&
        selectedUid !== null
      ) {
        // Une fenêtre ouverte neutralise les raccourcis d'action. Sans cette
        // garde, « e » archiverait et « # » supprimerait le message sélectionné
        // pendant que l'utilisateur lit l'aide ou règle un paramètre.
        if (composeOpen || settingsOpen || shortcutsOpen) return;
        e.preventDefault();
        if (e.key === 's') handleToggleStar(selectedUid);
        else if (e.key === 'e') handleArchive(selectedUid);
        else handleDelete(selectedUid);
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
    openCompose,
  ]);

  // Props pour la liste de messages (filtrée par catégorie)
  const listProps = {
    items: visibleItems,
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
    emptyTitle: search.trim()
      ? 'Aucun résultat trouvé'
      : classificationFilter !== 'all'
      ? 'Aucun message dans ce classement'
      : isInbox && activeCategory !== 'primary'
      ? 'Aucun message dans cette catégorie'
      : 'Votre boîte de réception est vide',
    emptyDescription: search.trim()
      ? 'Aucun message ne correspond à vos termes de recherche.'
      : classificationFilter !== 'all'
      ? 'Aucun email ne correspond à ce classement pour le moment.'
      : isInbox && activeCategory !== 'primary'
      ? 'Les messages de cette catégorie apparaîtront ici lorsqu\'ils arriveront.'
      : 'Aucun nouveau message pour le moment.',
    density,
  };

  // Props pour la barre d'outils
  const toolbarProps = {
    selectedCount: checkedUids.size,
    totalVisible: visibleItems.length,
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
    onBatchMove: handleBatchMove,
    onBatchLabel: handleBatchLabel,
    folders,
    currentFolder: effectiveImapFolder,
    splitView,
    onChangeSplitView: setSplitView,
    onOpenShortcuts: () => setShortcutsOpen(true),
    filterUnreadOnly,
    onToggleUnreadOnly: () => setFilterUnreadOnly((prev) => !prev),
    filterAttachmentOnly,
    onToggleAttachmentOnly: () => setFilterAttachmentOnly((prev) => !prev),
    classificationFilter,
    onChangeClassificationFilter: setClassificationFilter,
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
    onToggleRead: handleToggleRead,
    onSnooze: handleSnooze,
    onMove: handleMoveMessage,
    folders,
    isStarred: selectedUid ? starredUids.has(selectedUid) : false,
    isRead: selectedUid ? (readOverrides.get(selectedUid) ?? rawMessage?.isRead ?? false) : false,
    onSendReply: (to: string, subject: string, body: string, messageUid?: number) =>
      handleSendEmail(to, subject, body, messageUid, effectiveImapFolder),
    onCancelReply: () => addToast('Génération de réponse annulée.'),
    onCancelSummary: () => addToast('Génération du résumé annulée.'),
    onNotify: addToast,
  };

  const showFullReader = splitView === 'none' && selectedUid !== null;

  return (
    <div className="flex h-full flex-col bg-[#f6f8fc] dark:bg-[#1f1f1f] text-[#1f1f1f] dark:text-[#e8eaed] overflow-hidden select-none font-sans">
      {/* ── 1. En-tête Google Gmail officiel ── */}
      <Header
        navOpen={navOpen}
        onToggleNav={() => setNavOpen((open) => !open)}
        search={search}
        onSearchChange={setSearch}
        advancedFilters={advancedFilters}
        onAdvancedFilters={setAdvancedFilters}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      {/* ── Barre de progression indéterminée façon Material (#4) ── */}
      {(messagesLoading || refreshing || foldersLoading) && (
        <div
          role="progressbar"
          aria-label="Chargement des messages"
          className="relative h-[3px] w-full overflow-hidden bg-[#d3e3fd]/50 dark:bg-[#004a77]/40"
        >
          <div className="absolute inset-y-0 left-0 w-1/3 bg-[#0b57d0] dark:bg-[#a8c7fa] animate-progress-indeterminate" />
        </div>
      )}

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
          onCompose={openCompose}
          starredCount={starredUids.size}
          onOpenFollowups={() => setFollowupsOpen(true)}
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
              onClick={openCompose}
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
              <NewEmailsBanner
                count={newCount}
                onRefresh={() => {
                  clearNewCount();
                  void reloadMessages();
                }}
              />
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
                    categoryCounts={categoryCounts}
                  />
                )}
                {newCount > 0 && (
                  <NewEmailsBanner
                    count={newCount}
                    compact
                    onRefresh={() => {
                      clearNewCount();
                      void reloadMessages();
                    }}
                  />
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
                    categoryCounts={categoryCounts}
                  />
                )}
                {newCount > 0 && (
                  <NewEmailsBanner
                    count={newCount}
                    compact
                    onRefresh={() => {
                      clearNewCount();
                      void reloadMessages();
                    }}
                  />
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
                  categoryCounts={categoryCounts}
                />
              )}
              {newCount > 0 && (
                <NewEmailsBanner
                  count={newCount}
                  onRefresh={() => {
                    clearNewCount();
                    void reloadMessages();
                  }}
                />
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
        initialTo={composeDraft.to}
        initialSubject={composeDraft.subject}
        initialBody={composeDraft.body}
      />

      {/* Panneau des relances (lecture seule, préparation manuelle) */}
      <FollowupsPanel
        isOpen={followupsOpen}
        onClose={() => setFollowupsOpen(false)}
        onPrepare={handlePrepareFollowup}
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
        smtpAvailable={smtpAvailable}
        smtpWorking={smtpWorking}
        notificationEnabled={notificationEnabled}
        notificationPermission={notificationPermission}
        onEnableNotifications={requestNotificationPermission}
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
