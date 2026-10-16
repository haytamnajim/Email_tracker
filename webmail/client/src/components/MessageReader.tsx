import { useEffect, useMemo, useState } from 'react';
import type { MessageDetail, Theme } from '../types';
import { attachmentUrl } from '../api';
import { containsRemoteImages, sanitizeEmailHtml } from '../utils/html';
import { formatAddress, formatAddressList, formatBytes, formatFullDate } from '../utils/format';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';
import { ReaderSkeleton } from './Skeleton';

interface MessageReaderProps {
  message: MessageDetail | null;
  loading: boolean;
  error: string | null;
  theme: Theme;
  onRetry: () => void;
  onBack: () => void;
  showBackButton: boolean;
}

/** Palette du document isolé : il ne voit pas les variables CSS de l'application. */
const FRAME_COLORS: Record<Theme, { bg: string; ink: string; muted: string; quote: string }> = {
  light: { bg: '#ffffff', ink: '#1e293b', muted: '#64748b', quote: '#cbd5e1' },
  // Fond explicite : le canvas d'une iframe est blanc par défaut, ce qui
  // faisait apparaître une zone blanche en mode sombre.
  dark: { bg: '#0b0a16', ink: '#e2e8f0', muted: '#94a3b8', quote: '#475569' },
};

function buildFrameStyles(theme: Theme): string {
  const colors = FRAME_COLORS[theme];
  return `
    html { background: ${colors.bg}; }
    body {
      margin: 0; padding: 0 24px 24px;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      font-size: 15px; line-height: 1.65;
      color: ${colors.ink}; background: ${colors.bg};
      overflow-wrap: break-word;
    }
    img { max-width: 100%; height: auto; }
    pre, code, blockquote { white-space: pre-wrap; }
    blockquote {
      border-left: 3px solid ${colors.quote}; margin: 0;
      padding-left: 12px; color: ${colors.muted};
    }
    a { color: ${colors.muted}; }
  `;
}

/** Construit le document affiché dans la iframe : HTML assaini uniquement. */
function buildFrameDocument(
  html: string,
  allowRemoteImages: boolean,
  theme: Theme,
): string {
  const clean = sanitizeEmailHtml(html, {
    allowRemoteImages,
    dark: theme === 'dark',
  });
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${buildFrameStyles(
    theme,
  )}</style></head><body>${clean}</body></html>`;
}

/** Panneau de lecture : expéditeur, destinataires, date, corps, pièces jointes. */
export default function MessageReader({
  message,
  loading,
  error,
  theme,
  onRetry,
  onBack,
  showBackButton,
}: MessageReaderProps) {
  const [allowRemoteImages, setAllowRemoteImages] = useState(false);

  useEffect(() => {
    setAllowRemoteImages(false);
  }, [message?.uid]);

  const hasRemoteImages = useMemo(() => containsRemoteImages(message?.html ?? null), [message]);

  const frameDocument = useMemo(() => {
    if (!message?.html) return '';
    return buildFrameDocument(message.html, allowRemoteImages, theme);
  }, [message?.html, allowRemoteImages, theme]);

  if (loading && !message) return <ReaderSkeleton />;

  if (error && !message) return <ErrorState message={error} onRetry={onRetry} />;

  if (!message) {
    return (
      <EmptyState
        title="Aucun message sélectionné"
        description="Choisissez un message dans la liste pour le lire."
      />
    );
  }

  const sender = formatAddress(message.from) || 'Expéditeur inconnu';

  return (
    <article className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-line px-4 py-4 sm:px-6">
        {showBackButton ? (
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1.5 rounded-xl px-2 py-1 text-sm text-ink-dim transition-all hover:scale-105 hover:text-accent-ink md:hidden"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M15 5l-7 7 7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Retour
          </button>
        ) : null}

        <h2 className="text-lg font-semibold leading-snug text-ink">
          {message.subject || '(sans objet)'}
        </h2>

        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-ink-faint">De</dt>
            <dd className="min-w-0 break-words text-ink-dim">{sender}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-ink-faint">À</dt>
            <dd className="min-w-0 break-words text-ink-dim">
              {formatAddressList(message.to) || '—'}
            </dd>
          </div>
          {message.cc.length > 0 ? (
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-ink-faint">Cc</dt>
              <dd className="min-w-0 break-words text-ink-dim">{formatAddressList(message.cc)}</dd>
            </div>
          ) : null}
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-ink-faint">Date</dt>
            <dd className="min-w-0 break-words text-ink-dim">{formatFullDate(message.date)}</dd>
          </div>
        </dl>
      </div>

      {hasRemoteImages ? (
        <div
          className="flex flex-wrap items-center gap-3 border-b px-4 py-2.5 text-sm sm:px-6"
          style={{
            background: 'var(--warn-soft)',
            borderColor: 'var(--warn-line)',
          }}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-ink-faint">
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M3 16l5-5 4 4 3-3 6 6"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-ink-dim">
            Les images distantes sont bloquées pour protéger votre vie privée.
          </span>
          <button
            type="button"
            onClick={() => setAllowRemoteImages(true)}
            className="rounded-xl border border-line-strong bg-surface-2 px-3 py-1 text-xs font-medium text-ink-dim transition-all hover:scale-105 hover:border-accent-line hover:text-accent-ink"
          >
            Afficher les images
          </button>
        </div>
      ) : null}

      {frameDocument ? (
        <iframe
          title={`Contenu du message : ${message.subject || '(sans objet)'}`}
          // sandbox="" : aucune permission, donc aucun JavaScript ne peut s'exécuter.
          sandbox=""
          srcDoc={frameDocument}
          className="min-h-[50vh] w-full flex-1 border-0 bg-transparent"
        />
      ) : (
        <pre className="whitespace-pre-wrap px-4 py-6 font-sans text-sm leading-relaxed text-ink sm:px-6">
          {message.text || 'Ce message ne contient aucun contenu.'}
        </pre>
      )}

      {message.attachments.length > 0 ? (
        <section
          aria-label="Pièces jointes"
          className="border-t border-line px-4 py-4 sm:px-6"
        >
          <h3 className="text-sm font-semibold text-ink-dim">
            Pièces jointes ({message.attachments.length})
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <li key={attachment.index}>
                <a
                  href={attachmentUrl(message.uid, attachment.index, message.folder)}
                  download={attachment.filename}
                  className="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-surface-2 px-3 py-2 text-sm text-ink-dim transition-all hover:scale-[1.02] hover:border-accent-line hover:text-accent-ink"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4 shrink-0 text-ink-faint"
                  >
                    <path
                      d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14 3v5h5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="max-w-[14rem] truncate">{attachment.filename}</span>
                  <span className="shrink-0 text-xs text-ink-faint">
                    {formatBytes(attachment.size)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
