import type { MessageSummary } from '../types';
import { formatAddress, formatRelativeDate } from '../utils/format';

interface MessageItemProps {
  message: MessageSummary;
  selected: boolean;
  onSelect: (uid: number) => void;
  itemRef: (node: HTMLButtonElement | null) => void;
}

/** Dégradé déterministe à partir du nom de l'expéditeur. */
function senderGradient(seed: string): string {
  const palettes: Array<[string, string]> = [
    ['#7c3aed', '#4f46e5'],
    ['#db2777', '#9333ea'],
    ['#0891b2', '#0d9488'],
    ['#16a34a', '#0891b2'],
    ['#ea580c', '#dc2626'],
    ['#7c3aed', '#db2777'],
  ];

  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) & 0xffff;
  }

  const [from, to] = palettes[hash % palettes.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

/** Initiales de l'expéditeur (1 ou 2 lettres). */
function senderInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || '?';
}

/** Une ligne de la liste : avatar, expéditeur, objet, aperçu, date, non lu, favori, pièce jointe. */
export default function MessageItem({ message, selected, onSelect, itemRef }: MessageItemProps) {
  const sender = formatAddress(message.from) || 'Expéditeur inconnu';
  const initials = senderInitials(sender);
  const gradient = senderGradient(sender);

  return (
    <button
      ref={itemRef}
      type="button"
      onClick={() => onSelect(message.uid)}
      aria-label={`${sender} — ${message.subject || '(sans objet)'}${
        message.isRead ? '' : ', non lu'
      }`}
      className="block w-full border-l-[3px] px-3 py-3 text-left transition-all duration-200"
      style={{
        background: selected ? 'var(--accent-soft)' : 'transparent',
        borderLeftColor: selected ? 'var(--accent)' : 'transparent',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{
            background: gradient,
            boxShadow: selected ? '0 0 12px var(--accent-glow)' : 'none',
          }}
          aria-hidden="true"
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className="min-w-0 flex-1 truncate text-sm"
              style={{
                color: message.isRead ? 'var(--ink-dim)' : 'var(--ink)',
                fontWeight: message.isRead ? 400 : 600,
              }}
            >
              {sender}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-ink-faint">
              {formatRelativeDate(message.date)}
            </span>
          </div>

          <div className="mt-0.5 flex items-center gap-1.5">
            {!message.isRead ? (
              <span
                className="pulse-dot h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: 'var(--accent)' }}
                aria-hidden="true"
              />
            ) : null}
            <span
              className="min-w-0 flex-1 truncate text-xs"
              style={{
                color: message.isRead ? 'var(--ink-faint)' : 'var(--accent-ink)',
                fontWeight: message.isRead ? 400 : 500,
              }}
            >
              {message.subject || '(sans objet)'}
            </span>

            {message.isFlagged ? (
              <svg
                aria-label="Favori"
                role="img"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-3.5 w-3.5 shrink-0 text-star"
              >
                <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z" />
              </svg>
            ) : null}

            {message.hasAttachments ? (
              <svg
                aria-label="Pièce jointe"
                role="img"
                viewBox="0 0 24 24"
                fill="none"
                className="h-3.5 w-3.5 shrink-0 text-ink-faint"
              >
                <path
                  d="M17 9l-6.5 6.5a2.8 2.8 0 004 4L21 13a4.6 4.6 0 00-6.5-6.5L8 13a6.4 6.4 0 009 9l4.5-4.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </div>

          <p className="mt-0.5 truncate text-xs text-ink-faint">{message.preview}</p>
        </div>
      </div>
    </button>
  );
}
