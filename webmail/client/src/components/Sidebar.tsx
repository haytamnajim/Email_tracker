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
import type { LucideIcon } from 'lucide-react';
import type { Folder } from '../types';
import { useRipple } from '../utils/ripple';

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

/**
 * Durée et courbe d'animation partagées (ouverture / fermeture du sidebar).
 * On énumère les propriétés au lieu de `transition-all` : largeur, padding,
 * largeur maximale, gap, opacité, hauteur maximale et marge sont les seules
 * qui changent réellement. Tout le reste resterait inutilement promu sur le
 * thread d'animation.
 */
const ANIM =
  'transition-[width,padding,max-width,gap,opacity,max-height,margin] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none';

/**
 * Entrée de navigation en pilule.
 * En mode replié (collapsed), le libellé et le compteur s'effacent,
 * la pilule se recentre et une pastille signale les messages non lus.
 */
function NavItem({
  icon: Icon,
  dotColor,
  label,
  unread = 0,
  active,
  onClick,
  title,
  collapsed,
}: {
  icon?: LucideIcon;
  dotColor?: string;
  label: string;
  unread?: number;
  active: boolean;
  onClick: () => void;
  title?: string;
  collapsed: boolean;
}) {
  const ripple = useRipple();

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={ripple}
      title={title ?? label}
      aria-current={active ? 'page' : undefined}
      className={`ripple-host group relative flex h-9 w-full cursor-pointer items-center rounded-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0b57d0] ${ANIM} ${
        active
          ? 'bg-[#d3e3fd] text-[#001d35] font-medium shadow-[0_1px_2px_rgba(60,64,67,0.10)] dark:bg-[#004a77] dark:text-[#d3e3fd]'
          : 'text-[#444746] dark:text-[#c4c7c5] hover:bg-[#eaebef] hover:shadow-[0_1px_2px_rgba(60,64,67,0.08)] dark:hover:bg-[#282a2c]'
      } ${collapsed ? 'justify-center gap-0 px-0' : 'justify-start gap-4 px-4'}`}
    >
      {Icon && (
        <Icon
          className={`h-4 w-4 shrink-0 transition-colors ${
            active
              ? 'text-[#0b57d0] dark:text-[#a8c7fa]'
              : 'text-[#5f6368] dark:text-[#9aa0a6] group-hover:text-[#1f1f1f] dark:group-hover:text-[#e8eaed]'
          }`}
        />
      )}
      {dotColor && (
        <span
          className={`shrink-0 rounded-full ring-2 ring-black/5 dark:ring-white/10 ${ANIM} ${
            collapsed ? 'h-2.5 w-2.5' : 'h-2.5 w-2.5'
          }`}
          style={{ backgroundColor: dotColor }}
        />
      )}

      {/* Libellé : largeur et opacité animées */}
      <span
        className={`min-w-0 overflow-hidden whitespace-nowrap text-sm ${ANIM} ${
          collapsed ? 'ml-0 max-w-0 opacity-0' : 'ml-0 max-w-[170px] flex-1 opacity-100'
        }`}
      >
        {label}
      </span>

      {/* Compteur non-lus (mode déplié) */}
      {unread > 0 && !collapsed && (
        <span
          className={`shrink-0 text-xs font-semibold tabular-nums ${ANIM} ${
            active ? 'text-[#001d35] dark:text-[#d3e3fd]' : 'text-[#1f1f1f] dark:text-[#e8eaed]'
          }`}
        >
          {unread}
        </span>
      )}

      {/* Pastille non-lus (mode replié) */}
      {unread > 0 && collapsed && (
        <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#f6f8fc] bg-[#0b57d0] dark:border-[#1f1f1f] dark:bg-[#a8c7fa]" />
      )}
    </button>
  );
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
  const [showLabels, setShowLabels] = useState(true);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const collapsed = !navOpen;

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

  return (
    <aside
      aria-label="Dossiers de messagerie"
      className={`hidden shrink-0 select-none overflow-y-auto overflow-x-hidden bg-[#f6f8fc] py-3 dark:bg-[#1f1f1f] md:flex md:flex-col ${ANIM} ${
        navOpen ? 'w-[256px] px-3' : 'w-[72px] px-2'
      }`}
    >
      {/* ── Bouton "Nouveau message" : cercle ⇄ pilule animé ── */}
      <div className="mb-3">
        <button
          type="button"
          onClick={onCompose}
          title="Nouveau message (C)"
          className={`group flex h-12 items-center overflow-hidden rounded-full bg-[#c2e7ff] text-left text-[#001d35] shadow-sm hover:bg-[#b3d7f5] hover:shadow-md active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0b57d0] ${ANIM} ${
            navOpen ? 'max-w-[220px] justify-start gap-4 pl-5 pr-7' : 'w-full max-w-[56px] justify-center gap-0 px-0'
          }`}
        >
          <Pencil className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:-rotate-6 motion-reduce:transition-none" />
          <span
            className={`overflow-hidden whitespace-nowrap text-sm font-medium ${ANIM} ${
              navOpen ? 'max-w-[150px] opacity-100' : 'max-w-0 opacity-0'
            }`}
          >
            Nouveau message
          </span>
        </button>
      </div>

      {/* ── Dossiers système ── */}
      <nav aria-label="Dossiers" className="flex-1 space-y-1">
        {systemNavItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            unread={item.unread}
            collapsed={collapsed}
            active={activeId === item.id && activeLabel === null}
            onClick={() => {
              setActiveLabel(null);
              onSelect(item.id);
            }}
          />
        ))}

        {/* ── Bloc « Plus » + Libellés : se replie avec le sidebar ── */}
        <div
          className={`overflow-hidden ${ANIM} ${
            navOpen ? 'mt-3 max-h-[700px] opacity-100' : 'mt-0 max-h-0 opacity-0 pointer-events-none'
          }`}
        >
          {/* Bouton Plus / Moins */}
          <NavItem
            icon={showMore ? ChevronUp : ChevronDown}
            label={showMore ? 'Moins' : 'Plus'}
            collapsed={false}
            active={false}
            onClick={() => setShowMore((prev) => !prev)}
          />

          {/* Éléments supplémentaires dans Plus */}
          {showMore && (
            <div className="mt-1 space-y-1 pl-2 animate-fade-slide">
              {moreNavItems.map((item) => (
                <NavItem
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  unread={item.unread}
                  collapsed={false}
                  active={activeId === item.id && activeLabel === null}
                  onClick={() => {
                    setActiveLabel(null);
                    onSelect(item.id);
                  }}
                />
              ))}
            </div>
          )}

          {/* ── Section Libellés (repliable) ── */}
          <div className="mt-3 border-t border-[#e0e2e7] pt-3 dark:border-[#3c4043]">
            <div className="flex items-center justify-between pr-2 pl-1">
              <button
                type="button"
                onClick={() => setShowLabels((prev) => !prev)}
                aria-expanded={showLabels}
                className="flex h-8 flex-1 items-center gap-2 rounded-full pr-2 text-xs font-semibold tracking-wide text-[#5f6368] uppercase transition-colors hover:text-[#1f1f1f] dark:text-[#9aa0a6] dark:hover:text-[#e8eaed]"
              >
                {showLabels ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Libellés
              </button>
              <button
                type="button"
                title="Créer un libellé"
                className="flex h-6 w-6 items-center justify-center rounded-full text-[#5f6368] transition-colors hover:bg-black/5 hover:text-[#0b57d0] dark:text-[#9aa0a6] dark:hover:bg-white/10 dark:hover:text-[#a8c7fa]"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {showLabels && (
              <div className="mt-1 space-y-1 animate-fade-slide">
                {customLabels.map((lbl) => (
                  <NavItem
                    key={lbl.id}
                    dotColor={lbl.color}
                    label={lbl.name}
                    collapsed={false}
                    active={activeLabel === lbl.id}
                    onClick={() => {
                      setActiveLabel(lbl.id);
                      onSelect('INBOX');
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Pied de page : Stockage (masqué proprement en mode replié) ── */}
      <div
        className={`mt-auto overflow-hidden border-t border-[#e0e2e7] px-1 dark:border-[#3c4043] ${ANIM} ${
          navOpen ? 'max-h-[140px] pt-3 opacity-100' : 'max-h-0 pt-0 opacity-0'
        }`}
      >
        <div className="mb-1.5 flex items-center justify-between text-xs text-[#5f6368] dark:text-[#9aa0a6]">
          <span className={`flex items-center gap-1.5 overflow-hidden whitespace-nowrap font-medium ${ANIM} ${navOpen ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0'}`}>
            <HardDrive className="h-3.5 w-3.5 shrink-0" /> 1,45 Go utilisés
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            title="Synchroniser IMAP"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#5f6368] transition-[background-color,color] hover:bg-black/5 hover:text-[#0b57d0] disabled:opacity-50 dark:text-[#9aa0a6] dark:hover:bg-white/10 dark:hover:text-[#a8c7fa]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div
          className="h-1 w-full overflow-hidden rounded-full bg-[#dadce0] dark:bg-[#444746]"
          role="progressbar"
          aria-valuenow={10}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Espace de stockage utilisé"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#0b57d0] to-[#1a73e8] dark:from-[#a8c7fa] dark:to-[#8ab4f8]"
            style={{ width: '10%' }}
          />
        </div>
        <p className={`mt-1 overflow-hidden whitespace-nowrap text-[11px] text-[#5f6368] dark:text-[#9aa0a6] ${ANIM} ${navOpen ? 'max-w-[180px] opacity-100' : 'max-w-0 opacity-0'}`}>
          sur 15 Go fournis par Google
        </p>
      </div>
    </aside>
  );
}
