import { useState } from 'react';
import {
  Pencil,
  Inbox,
  Star,
  Clock,
  Send,
  FileText,
  ChevronDown,
  ChevronUp,
  Mail,
  AlertOctagon,
  Trash2,
  Plus,
  RefreshCw,
  HardDrive,
  Bookmark,
} from 'lucide-react';
import type { Folder } from '../types';

interface SidebarProps {
  folders: Folder[];
  activeId: string;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
  navOpen: boolean;
  onCompose: () => void;
  starredCount?: number;
}

export default function Sidebar({
  folders,
  activeId,
  onSelect,
  onRefresh,
  refreshing,
  navOpen,
  onCompose,
  starredCount = 0,
}: SidebarProps) {
  const [showMore, setShowMore] = useState(false);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  // Normalisation des dossiers IMAP pour matcher les clés Gmail
  const findFolder = (predicate: (name: string, id: string) => boolean) => {
    return folders.find((f) => predicate(f.name.toLowerCase(), f.id.toLowerCase()));
  };

  const inboxFolder = findFolder((n, id) => id === 'inbox' || n === 'inbox');
  const sentFolder = findFolder((n, id) => id.includes('sent') || n.includes('envoy'));
  const draftsFolder = findFolder((n, id) => id.includes('draft') || n.includes('brouillon'));
  const trashFolder = findFolder((_n, id) => id.includes('trash') || id.includes('corbeille') || id.includes('deleted'));
  const spamFolder = findFolder((_n, id) => id.includes('spam') || id.includes('junk'));

  const systemNavItems = [
    {
      id: inboxFolder?.id || 'INBOX',
      label: 'Boîte de réception',
      icon: Inbox,
      unread: inboxFolder?.unread ?? 0,
    },
    {
      id: 'STARRED',
      label: 'Messages suivis',
      icon: Star,
      unread: starredCount,
    },
    {
      id: 'SNOOZED',
      label: 'En attente',
      icon: Clock,
      unread: 0,
    },
    {
      id: 'IMPORTANT',
      label: 'Importants',
      icon: Bookmark,
      unread: 0,
    },
    {
      id: sentFolder?.id || 'SENT',
      label: 'Messages envoyés',
      icon: Send,
      unread: 0,
    },
    {
      id: draftsFolder?.id || 'DRAFTS',
      label: 'Brouillons',
      icon: FileText,
      unread: draftsFolder?.unread ?? 0,
    },
  ];

  const moreNavItems = [
    {
      id: 'ALL',
      label: 'Tous les messages',
      icon: Mail,
      unread: 0,
    },
    {
      id: spamFolder?.id || 'SPAM',
      label: 'Spam',
      icon: AlertOctagon,
      unread: spamFolder?.unread ?? 0,
    },
    {
      id: trashFolder?.id || 'TRASH',
      label: 'Corbeille',
      icon: Trash2,
      unread: 0,
    },
  ];

  // Libellés personnalisés
  const customLabels = [
    { id: 'work', name: 'Travail', color: '#1a73e8' },
    { id: 'personal', name: 'Personnel', color: '#188038' },
    { id: 'finance', name: 'Factures & Banque', color: '#e37400' },
    { id: 'projects', name: 'Projets', color: '#a142f4' },
  ];

  // Rendu en mode rail rétracté (icônes seules)
  if (!navOpen) {
    return (
      <aside className="hidden md:flex flex-col items-center py-2 w-[72px] shrink-0 bg-[#f6f8fc] dark:bg-[#1f1f1f] select-none">
        {/* Bouton Nouveau message rond */}
        <button
          type="button"
          onClick={onCompose}
          title="Nouveau message"
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#c2e7ff] text-[#001d35] shadow-sm hover:shadow-md hover:bg-[#b3d7f5] transition-all mb-4"
        >
          <Pencil className="h-5 w-5" />
        </button>

        <nav className="flex-1 w-full space-y-1 px-2">
          {systemNavItems.slice(0, 5).map((item) => {
            const active = activeId === item.id;
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                title={`${item.label}${item.unread > 0 ? ` (${item.unread})` : ''}`}
                className={`relative flex h-11 w-full items-center justify-center rounded-full transition-colors ${
                  active
                    ? 'bg-[#d3e3fd] text-[#001d35] font-semibold dark:bg-[#004a77] dark:text-[#d3e3fd]'
                    : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#eaebef] dark:hover:bg-[#2b2d30]'
                }`}
              >
                <IconComponent className={`h-5 w-5 ${active ? 'fill-current' : ''}`} />
                {item.unread > 0 && (
                  <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-[#0b57d0] dark:bg-[#a8c7fa]" />
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    );
  }

  // Rendu en mode volet complet (256px standard)
  return (
    <aside className="hidden md:flex flex-col w-[256px] shrink-0 bg-[#f6f8fc] dark:bg-[#1f1f1f] pr-3 py-2 select-none h-full overflow-y-auto">
      {/* ── Bouton "Nouveau message" (Compose FAB) ── */}
      <div className="px-2 mb-4">
        <button
          type="button"
          onClick={onCompose}
          className="inline-flex h-14 items-center gap-4 rounded-2xl bg-[#c2e7ff] text-[#001d35] px-6 text-sm font-semibold tracking-wide shadow-sm hover:shadow-md hover:bg-[#b3d7f5] transition-all cursor-pointer"
        >
          <Pencil className="h-5 w-5" />
          <span>Nouveau message</span>
        </button>
      </div>

      {/* ── Liste des dossiers et sections système ── */}
      <nav aria-label="Dossiers de messagerie" className="flex-1 space-y-0.5">
        {systemNavItems.map((item) => {
          const active = activeId === item.id && activeLabel === null;
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveLabel(null);
                onSelect(item.id);
              }}
              className={`group flex h-8 w-full items-center gap-4 rounded-r-full pl-6 pr-4 text-left text-sm transition-colors cursor-pointer ${
                active
                  ? 'bg-[#d3e3fd] text-[#001d35] font-semibold dark:bg-[#004a77] dark:text-[#d3e3fd]'
                  : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e9eef6] dark:hover:bg-[#2b2d30]'
              }`}
            >
              <IconComponent
                className={`h-4 w-4 shrink-0 ${
                  active ? 'text-[#001d35] dark:text-[#d3e3fd]' : 'text-[#444746] dark:text-[#c4c7c5]'
                }`}
              />
              <span className="truncate flex-1">{item.label}</span>
              {item.unread > 0 && (
                <span
                  className={`text-xs tabular-nums font-semibold ${
                    active ? 'text-[#001d35] dark:text-[#d3e3fd]' : 'text-[#1f1f1f] dark:text-[#e8eaed]'
                  }`}
                >
                  {item.unread}
                </span>
              )}
            </button>
          );
        })}

        {/* Bouton Plus / Moins */}
        <button
          type="button"
          onClick={() => setShowMore((prev) => !prev)}
          className="flex h-8 w-full items-center gap-4 rounded-r-full pl-6 pr-4 text-left text-sm text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e9eef6] dark:hover:bg-[#2b2d30] transition-colors cursor-pointer"
        >
          {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <span className="truncate">{showMore ? 'Moins' : 'Plus'}</span>
        </button>

        {/* Éléments supplémentaires dans Plus */}
        {showMore && (
          <div className="space-y-0.5 pt-0.5 animate-fade-slide">
            {moreNavItems.map((item) => {
              const active = activeId === item.id && activeLabel === null;
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveLabel(null);
                    onSelect(item.id);
                  }}
                  className={`flex h-8 w-full items-center gap-4 rounded-r-full pl-6 pr-4 text-left text-sm transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#d3e3fd] text-[#001d35] font-semibold dark:bg-[#004a77] dark:text-[#d3e3fd]'
                      : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e9eef6] dark:hover:bg-[#2b2d30]'
                  }`}
                >
                  <IconComponent className="h-4 w-4 shrink-0 text-[#444746] dark:text-[#c4c7c5]" />
                  <span className="truncate flex-1">{item.label}</span>
                  {item.unread > 0 && (
                    <span className="text-xs tabular-nums font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">
                      {item.unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Section Libellés (Labels) ── */}
        <div className="pt-4 mt-2 border-t border-[#e0e2e7] dark:border-[#3c4043]">
          <div className="flex items-center justify-between pl-6 pr-4 pb-1">
            <span className="text-xs font-semibold text-[#444746] dark:text-[#c4c7c5]">
              Libellés
            </span>
            <button
              type="button"
              title="Créer un libellé"
              className="flex h-6 w-6 items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {customLabels.map((lbl) => {
              const active = activeLabel === lbl.id;
              return (
                <button
                  key={lbl.id}
                  type="button"
                  onClick={() => {
                    setActiveLabel(lbl.id);
                    onSelect('INBOX');
                  }}
                  className={`flex h-8 w-full items-center gap-4 rounded-r-full pl-6 pr-4 text-left text-sm transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#d3e3fd] text-[#001d35] font-semibold dark:bg-[#004a77] dark:text-[#d3e3fd]'
                      : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#e9eef6] dark:hover:bg-[#2b2d30]'
                  }`}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: lbl.color }}
                  />
                  <span className="truncate flex-1">{lbl.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ── Pied de page : Stockage Google ── */}
      <div className="mt-auto px-6 pt-4 pb-2 border-t border-[#e0e2e7] dark:border-[#3c4043]">
        <div className="flex items-center justify-between text-xs text-[#5f6368] dark:text-[#9aa0a6] mb-1">
          <span className="flex items-center gap-1.5 font-medium">
            <HardDrive className="h-3.5 w-3.5" /> 1,45 Go utilisés
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            title="Synchroniser IMAP"
            className="flex h-5 w-5 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-black/5 dark:hover:bg-white/10"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-[#dadce0] dark:bg-[#444746]">
          <div className="h-full rounded-full bg-[#0b57d0] dark:bg-[#a8c7fa]" style={{ width: '10%' }} />
        </div>
        <p className="mt-1 text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
          sur 15 Go fournis par Google
        </p>
      </div>
    </aside>
  );
}
