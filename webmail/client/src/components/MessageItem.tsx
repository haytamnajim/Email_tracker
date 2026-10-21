import { useState } from 'react';
import {
  Star,
  Bookmark,
  Paperclip,
  Archive,
  Trash2,
  Mail,
  MailOpen,
  Clock,
  CheckSquare2,
  Square,
} from 'lucide-react';
import type { MessageSummary } from '../types';
import { formatAddress, formatRelativeDate } from '../utils/format';

export type DisplayDensity = 'default' | 'comfortable' | 'compact';

interface MessageItemProps {
  message: MessageSummary;
  selected: boolean;
  active: boolean;
  onSelect: (uid: number) => void;
  onToggleCheck: (uid: number, e: React.MouseEvent) => void;
  onToggleStar: (uid: number, e: React.MouseEvent) => void;
  onToggleImportant: (uid: number, e: React.MouseEvent) => void;
  onQuickArchive: (uid: number, e: React.MouseEvent) => void;
  onQuickDelete: (uid: number, e: React.MouseEvent) => void;
  onQuickToggleRead: (uid: number, e: React.MouseEvent) => void;
  onQuickSnooze: (uid: number, e: React.MouseEvent) => void;
  density?: DisplayDensity;
  isStarred?: boolean;
  isImportant?: boolean;
}

export default function MessageItem({
  message,
  selected,
  active,
  onSelect,
  onToggleCheck,
  onToggleStar,
  onToggleImportant,
  onQuickArchive,
  onQuickDelete,
  onQuickToggleRead,
  onQuickSnooze,
  density = 'default',
  isStarred = false,
  isImportant = false,
}: MessageItemProps) {
  const [hovered, setHovered] = useState(false);
  const [starPop, setStarPop] = useState(false);

  const sender = formatAddress(message.from) || 'Expéditeur inconnu';
  const unread = !message.isRead;
  const starred = isStarred || message.isFlagged;

  // Pop animé de l'étoile à chaque activation (#6)
  const handleStarClick = (e: React.MouseEvent) => {
    setStarPop(true);
    window.setTimeout(() => setStarPop(false), 340);
    onToggleStar(message.uid, e);
  };

  // Hauteur selon la densité
  const densityClass =
    density === 'compact'
      ? 'py-1 min-h-[36px]'
      : density === 'comfortable'
      ? 'py-2 min-h-[42px]'
      : 'py-2.5 min-h-[46px]';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(message.uid)}
      className={`group relative flex items-center border-b border-[#e0e2e7] dark:border-[#303134] px-4 cursor-pointer select-none transition-colors ${densityClass} ${
        selected
          ? 'bg-[#c2dbfe] dark:bg-[#004a77] text-[#001d35] dark:text-[#e8eaed]'
          : active
          ? 'bg-[#d3e3fd]/60 dark:bg-[#004a77]/60'
          : unread
          ? 'bg-white dark:bg-[#141414] font-semibold hover:shadow-[inset_1px_0_0_#dadce0,inset_-1px_0_0_#dadce0,0_1px_2px_0_rgba(60,64,67,.3),0_1px_3px_1px_rgba(60,64,67,.15)] z-10'
          : 'bg-[#f2f6fc]/60 dark:bg-[#1c1d1f] text-[#444746] dark:text-[#c4c7c5] hover:bg-[#eaf1fb] dark:hover:bg-[#282a2c]'
      }`}
    >
      {/* ── Gauche : Checkbox + Étoile + Important ── */}
      <div
        className="flex items-center gap-1 shrink-0 mr-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Case à cocher */}
        <button
          type="button"
          onClick={(e) => onToggleCheck(message.uid, e)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-black/5 dark:hover:bg-white/10"
        >
          {selected ? (
            <CheckSquare2 className="h-4 w-4 text-[#0b57d0] dark:text-[#a8c7fa]" />
          ) : (
            <Square className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
          )}
        </button>

        {/* Étoile */}
        <button
          type="button"
          onClick={handleStarClick}
          title={starred ? 'Non suivi (S)' : 'Suivre (S)'}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10"
        >
          <Star
            className={`h-4 w-4 transition-colors ${starPop ? 'animate-star-pop' : ''} ${
              starred
                ? 'fill-[#f9ab00] text-[#f9ab00]'
                : 'opacity-40 group-hover:opacity-100 hover:text-[#f9ab00]'
            }`}
          />
        </button>

        {/* Important */}
        <button
          type="button"
          onClick={(e) => onToggleImportant(message.uid, e)}
          title={isImportant ? 'Marquer comme non important' : 'Marquer comme important'}
          className="hidden sm:flex h-7 w-7 items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10"
        >
          <Bookmark
            className={`h-3.5 w-3.5 transition-colors ${
              isImportant
                ? 'fill-[#f9ab00] text-[#f9ab00]'
                : 'opacity-20 group-hover:opacity-70 hover:text-[#f9ab00]'
            }`}
          />
        </button>
      </div>

      {/* ── Expéditeur (largeur fixe ~160px-200px façon Gmail) ── */}
      <div className="w-[150px] sm:w-[190px] shrink-0 truncate pr-3">
        <span
          className={`text-sm ${
            unread
              ? 'font-bold text-[#1f1f1f] dark:text-[#e8eaed]'
              : 'font-normal text-[#444746] dark:text-[#c4c7c5]'
          }`}
        >
          {sender}
        </span>
      </div>

      {/* ── Contenu central : Objet & Aperçu ── */}
      <div className="flex-1 min-w-0 flex items-center gap-2 overflow-hidden pr-3">
        <span
          className={`text-sm truncate ${
            unread
              ? 'font-bold text-[#1f1f1f] dark:text-[#e8eaed]'
              : 'font-normal text-[#1f1f1f] dark:text-[#e8eaed]'
          }`}
        >
          {message.subject || '(sans objet)'}
        </span>

        {message.preview && (
          <span className="text-sm text-[#5f6368] dark:text-[#9aa0a6] truncate hidden md:inline font-normal">
            - {message.preview}
          </span>
        )}

        {/* Badges de pièces jointes (mode par défaut) */}
        {density === 'default' && message.hasAttachments && (
          <div className="hidden lg:flex items-center gap-1.5 shrink-0 ml-1">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#dadce0] dark:border-[#444746] bg-white dark:bg-[#202124] px-2 py-0.5 text-[11px] font-medium text-[#444746] dark:text-[#c4c7c5] shadow-xs">
              <Paperclip className="h-3 w-3 text-[#0b57d0] dark:text-[#a8c7fa]" />
              <span>Fichier joint</span>
            </span>
          </div>
        )}
      </div>

      {/* ── Droite : Date OU Barre d'actions rapides au survol ── */}
      <div
        className="shrink-0 flex items-center justify-end pl-2 min-w-[85px]"
        onClick={(e) => e.stopPropagation()}
      >
        {hovered ? (
          /* Barre d'outils au survol officielle Gmail */
          <div className="flex items-center gap-0.5 animate-fade-slide">
            <button
              type="button"
              onClick={(e) => onQuickArchive(message.uid, e)}
              title="Archiver (E)"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
            >
              <Archive className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => onQuickDelete(message.uid, e)}
              title="Supprimer (#)"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => onQuickToggleRead(message.uid, e)}
              title={unread ? 'Marquer comme lu' : 'Marquer comme non lu'}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
            >
              {unread ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={(e) => onQuickSnooze(message.uid, e)}
              title="Mettre en attente"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
            >
              <Clock className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* Affichage standard de la date */
          <span
            className={`text-xs tabular-nums ${
              unread
                ? 'font-bold text-[#1f1f1f] dark:text-[#e8eaed]'
                : 'text-[#5f6368] dark:text-[#9aa0a6]'
            }`}
          >
            {formatRelativeDate(message.date)}
          </span>
        )}
      </div>
    </div>
  );
}
