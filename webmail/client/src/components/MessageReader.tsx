import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Archive,
  AlertOctagon,
  Trash2,
  Mail,
  Clock,
  CheckSquare,
  FolderInput,
  Tag,
  Printer,
  Star,
  CornerUpLeft,
  CornerUpRight,
  Paperclip,
  Download,
  ShieldCheck,
  Send,
  X,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import type { MessageDetail, Theme } from '../types';
import { attachmentUrl, generateReplyWithN8n, cancelReplyWithN8n } from '../api';
import { containsRemoteImages, sanitizeEmailHtml } from '../utils/html';
import { formatAddressList, formatBytes, formatFullDate } from '../utils/format';
import { senderGradient, senderInitials } from '../utils/colors';
import { ReaderSkeleton } from './Skeleton';

interface MessageReaderProps {
  message: MessageDetail | null;
  loading: boolean;
  error: string | null;
  theme: Theme;
  onRetry: () => void;
  onBack: () => void;
  showBackButton?: boolean;
  onArchive?: (uid: number) => void;
  onDelete?: (uid: number) => void;
  onToggleStar?: (uid: number) => void;
  isStarred?: boolean;
  onSendReply?: (to: string, subject: string, body: string, uid?: number) => Promise<boolean | void> | void;
  onCancelReply?: () => void;
}

const FRAME_COLORS: Record<Theme, { bg: string; ink: string; muted: string; quote: string }> = {
  light: { bg: '#ffffff', ink: '#1f1f1f', muted: '#5f6368', quote: '#dadce0' },
  dark: { bg: '#141414', ink: '#e8eaed', muted: '#9aa0a6', quote: '#444746' },
};

function buildFrameStyles(theme: Theme): string {
  const colors = FRAME_COLORS[theme];
  return `
    html { background: ${colors.bg}; }
    body {
      margin: 0; padding: 16px 24px 32px;
      font-family: 'Google Sans', 'Roboto', -apple-system, 'Segoe UI', Arial, sans-serif;
      font-size: 14px; line-height: 1.6;
      color: ${colors.ink}; background: ${colors.bg};
      overflow-wrap: break-word;
    }
    img { max-width: 100%; height: auto; border-radius: 4px; }
    pre, code, blockquote { white-space: pre-wrap; font-family: inherit; }
    blockquote {
      border-left: 3px solid ${colors.quote}; margin: 8px 0;
      padding-left: 12px; color: ${colors.muted};
    }
    a { color: #0b57d0; text-decoration: underline; }
  `;
}

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

export default function MessageReader({
  message,
  loading,
  error,
  theme,
  onRetry,
  onBack,
  showBackButton = true,
  onArchive,
  onDelete,
  onToggleStar,
  isStarred = false,
  onSendReply,
  onCancelReply,
}: MessageReaderProps) {
  const [allowRemoteImages, setAllowRemoteImages] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [replyMode, setReplyMode] = useState<'reply' | 'forward' | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    setAllowRemoteImages(false);
    setReplyMode(null);
    setReplyText('');
    setDetailsOpen(false);
    setIsGeneratingReply(false);
    setGenerationError(null);
  }, [message?.uid]);

  const handleDirectGenerateReply = async () => {
    if (!message) return;
    setReplyMode('reply');
    setIsGeneratingReply(true);
    setGenerationError(null);

    const storedWebhook = localStorage.getItem('n8n_reply_webhook_url') || undefined;

    try {
      const res = await generateReplyWithN8n({
        webhookUrl: storedWebhook,
        message: {
          uid: message.uid,
          from: message.from,
          to: message.to,
          subject: message.subject,
          date: message.date,
          text: message.text,
          html: message.html,
        },
        tone: 'professionnel',
      });

      if (res.reply) {
        setReplyText(res.reply);
      }
      if (!res.success && res.error) {
        setGenerationError(res.error);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGenerationError(msg);
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const hasRemoteImages = useMemo(() => containsRemoteImages(message?.html ?? null), [message]);

  const frameDocument = useMemo(() => {
    if (!message?.html) return '';
    return buildFrameDocument(message.html, allowRemoteImages, theme);
  }, [message?.html, allowRemoteImages, theme]);

  if (loading && !message) return <ReaderSkeleton />;

  if (error && !message) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-white dark:bg-[#141414]">
        <p className="text-sm text-red-500 mb-4">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full bg-[#0b57d0] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0842a0]"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-white dark:bg-[#141414]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f0f4f9] dark:bg-[#202124] text-[#5f6368] dark:text-[#9aa0a6] mb-4">
          <Mail className="h-8 w-8" />
        </div>
        <h3 className="text-base font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">
          Aucun message sélectionné
        </h3>
        <p className="mt-1 text-sm text-[#5f6368] dark:text-[#9aa0a6]">
          Sélectionnez un message dans la liste pour afficher son contenu.
        </p>
      </div>
    );
  }

  const senderName = message.from?.name || message.from?.address || 'Expéditeur inconnu';
  const senderAddress = message.from?.address ?? '';
  const recipients = formatAddressList(message.to);
  const cc = formatAddressList(message.cc);

  const handleSendInlineReply = async () => {
    if (!replyText.trim()) return;
    setReplySending(true);
    setGenerationError(null);
    try {
      const targetSubject = message.subject?.toLowerCase().startsWith('re:')
        ? message.subject
        : `Re: ${message.subject || '(sans objet)'}`;
      const res = await onSendReply?.(senderAddress, targetSubject, replyText, message.uid);
      if (res !== false) {
        setReplyMode(null);
        setReplyText('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGenerationError(msg);
    } finally {
      setReplySending(false);
    }
  };

  const handleCancelReply = () => {
    cancelReplyWithN8n(message.uid);
    onCancelReply?.();
    setReplyMode(null);
    setReplyText('');
    setGenerationError(null);
  };

  return (
    <article className="flex h-full flex-col overflow-y-auto bg-white dark:bg-[#141414] select-text animate-reader-in">
      {/* ── Barre d'outils supérieure Gmail ── */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#e0e2e7] dark:border-[#3c4043] px-3 bg-white dark:bg-[#141414] sticky top-0 z-20">
        <div className="flex items-center gap-1">
          {showBackButton && (
            <button
              type="button"
              onClick={onBack}
              title="Retour aux messages"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors mr-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onArchive?.(message.uid)}
            title="Archiver (E)"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors"
          >
            <Archive className="h-4 w-4" />
          </button>

          <button
            type="button"
            title="Signaler comme spam"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors"
          >
            <AlertOctagon className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onDelete?.(message.uid)}
            title="Supprimer (#)"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <div className="mx-1 h-5 w-[1px] bg-[#e0e2e7] dark:bg-[#3c4043]" />

          <button
            type="button"
            title="Marquer comme non lu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors"
          >
            <Mail className="h-4 w-4" />
          </button>

          <button
            type="button"
            title="Mettre en attente"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors"
          >
            <Clock className="h-4 w-4" />
          </button>

          <button
            type="button"
            title="Ajouter aux tâches"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors"
          >
            <CheckSquare className="h-4 w-4" />
          </button>

          <div className="mx-1 h-5 w-[1px] bg-[#e0e2e7] dark:bg-[#3c4043]" />

          <button
            type="button"
            title="Déplacer vers"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors"
          >
            <FolderInput className="h-4 w-4" />
          </button>

          <button
            type="button"
            title="Libellés"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors"
          >
            <Tag className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDirectGenerateReply}
            disabled={isGeneratingReply}
            title="Générer une réponse avec l'IA"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] hover:text-[#0b57d0] dark:hover:text-[#a8c7fa] transition-colors disabled:opacity-50"
          >
            <Sparkles className={`h-4 w-4 ${isGeneratingReply ? 'animate-spin text-[#0b57d0]' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            title="Imprimer tout"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors"
          >
            <Printer className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Titre / Objet du message ── */}
      <div className="px-6 pt-5 pb-3 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl sm:text-[22px] font-normal text-[#1f1f1f] dark:text-[#e8eaed] leading-snug">
            {message.subject || '(sans objet)'}
          </h1>
          <span className="rounded bg-[#f0f4f9] dark:bg-[#2a2b2e] px-2 py-0.5 text-xs font-medium text-[#444746] dark:text-[#c4c7c5] border border-[#dadce0] dark:border-[#444746]">
            Boîte de réception
          </span>
        </div>

        <button
          type="button"
          onClick={() => onToggleStar?.(message.uid)}
          title={isStarred ? 'Supprimer le suivi (S)' : 'Suivre ce message (S)'}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] shrink-0"
        >
          <Star
            className={`h-4 w-4 ${
              isStarred
                ? 'fill-[#f9ab00] text-[#f9ab00]'
                : 'text-[#5f6368] dark:text-[#9aa0a6]'
            }`}
          />
        </button>
      </div>

      {/* ── Carte Expéditeur et Destinataires ── */}
      <div className="px-6 py-2">
        <div className="flex items-start gap-4">
          {/* Avatar initiales */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm"
            style={{ background: senderGradient(senderName) }}
          >
            {senderInitials(senderName)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-[#1f1f1f] dark:text-[#e8eaed]">
                  {senderName}
                </span>
                {senderAddress && (
                  <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                    &lt;{senderAddress}&gt;
                  </span>
                )}
              </div>
              <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] shrink-0 tabular-nums">
                {formatFullDate(message.date)}
              </span>
            </div>

            {/* Ligne "à moi" avec détails dépliables */}
            <div className="mt-0.5 flex items-center gap-1 text-xs text-[#5f6368] dark:text-[#9aa0a6]">
              <span>à {recipients || 'moi'}</span>
              <button
                type="button"
                onClick={() => setDetailsOpen((prev) => !prev)}
                className="flex items-center rounded px-1 py-0.5 hover:bg-black/5 dark:hover:bg-white/10"
              >
                {detailsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>

            {/* Tiroir de détails complets de sécurité */}
            {detailsOpen && (
              <div className="mt-3 rounded-xl border border-[#dadce0] dark:border-[#444746] bg-[#f8f9fa] dark:bg-[#202124] p-3 text-xs space-y-1.5 animate-fade-slide text-[#444746] dark:text-[#c4c7c5]">
                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <span className="text-[#5f6368] dark:text-[#9aa0a6]">De :</span>
                  <span className="font-medium text-[#1f1f1f] dark:text-[#e8eaed]">{senderName} &lt;{senderAddress}&gt;</span>
                </div>
                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <span className="text-[#5f6368] dark:text-[#9aa0a6]">À :</span>
                  <span>{recipients || 'destinataire non spécifié'}</span>
                </div>
                {cc && (
                  <div className="grid grid-cols-[80px_1fr] gap-2">
                    <span className="text-[#5f6368] dark:text-[#9aa0a6]">Cc :</span>
                    <span>{cc}</span>
                  </div>
                )}
                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <span className="text-[#5f6368] dark:text-[#9aa0a6]">Date :</span>
                  <span>{formatFullDate(message.date)}</span>
                </div>
                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <span className="text-[#5f6368] dark:text-[#9aa0a6]">Sécurité :</span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5" /> Chiffrement standard (TLS)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bandeau de protection des images distantes ── */}
      {hasRemoteImages && !allowRemoteImages && (
        <div className="mx-6 my-3 flex items-center justify-between rounded-xl bg-[#eaf1fb] dark:bg-[#202124] px-4 py-2.5 text-xs text-[#1f1f1f] dark:text-[#e8eaed] border border-[#d3e3fd] dark:border-[#3c4043]">
          <span className="text-[#444746] dark:text-[#c4c7c5]">
            Les images distantes ont été bloquées pour votre confidentialité.
          </span>
          <button
            type="button"
            onClick={() => setAllowRemoteImages(true)}
            className="rounded-full bg-[#0b57d0] px-3.5 py-1 text-xs font-semibold text-white hover:bg-[#0842a0] transition-colors"
          >
            Afficher les images
          </button>
        </div>
      )}

      {/* ── Corps du message ── */}
      <div className="flex-1 px-2">
        {frameDocument ? (
          <iframe
            title={`Message : ${message.subject || '(sans objet)'}`}
            sandbox=""
            srcDoc={frameDocument}
            className="min-h-[400px] w-full border-0 rounded-lg"
            style={{ background: 'var(--reader-bg)' }}
          />
        ) : (
          <pre className="whitespace-pre-wrap px-6 py-4 font-sans text-sm leading-relaxed text-[#1f1f1f] dark:text-[#e8eaed]">
            {message.text || 'Ce message ne contient aucun contenu lisible.'}
          </pre>
        )}
      </div>

      {/* ── Pièces jointes ── */}
      {message.attachments.length > 0 && (
        <div className="px-6 py-4 border-t border-[#e0e2e7] dark:border-[#3c4043]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5f6368] dark:text-[#9aa0a6] mb-3">
            Pièces jointes ({message.attachments.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {message.attachments.map((att) => {
              const isPdf = att.filename.toLowerCase().endsWith('.pdf');
              const isImg = /\.(jpe?g|png|gif|webp)$/i.test(att.filename);
              return (
                <div
                  key={att.index}
                  className="group flex items-center justify-between rounded-xl border border-[#dadce0] dark:border-[#444746] bg-[#f8f9fa] dark:bg-[#202124] p-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-[#141414] shadow-xs text-[#0b57d0] dark:text-[#a8c7fa]">
                      {isPdf ? <FileText className="h-5 w-5 text-red-500" /> : isImg ? <ImageIcon className="h-5 w-5 text-emerald-500" /> : <Paperclip className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">
                        {att.filename}
                      </p>
                      <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                        {formatBytes(att.size)}
                      </p>
                    </div>
                  </div>

                  <a
                    href={attachmentUrl(message.uid, att.index, message.folder)}
                    download={att.filename}
                    title="Télécharger"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Boutons d'action rapides en bas : Répondre / Transférer ── */}
      <div className="p-6 border-t border-[#e0e2e7] dark:border-[#3c4043] bg-white dark:bg-[#141414]">
        {replyMode === null ? (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setReplyMode('reply')}
              className="inline-flex items-center gap-2 rounded-full border border-[#dadce0] dark:border-[#444746] px-6 py-2.5 text-sm font-medium text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors"
            >
              <CornerUpLeft className="h-4 w-4" />
              <span>Répondre</span>
            </button>
            <button
              type="button"
              onClick={() => setReplyMode('forward')}
              className="inline-flex items-center gap-2 rounded-full border border-[#dadce0] dark:border-[#444746] px-6 py-2.5 text-sm font-medium text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors"
            >
              <CornerUpRight className="h-4 w-4" />
              <span>Transférer</span>
            </button>

            {/* Bouton Suggérer une réponse (style Gmail pur, 1 clic direct) */}
            <button
              type="button"
              onClick={handleDirectGenerateReply}
              disabled={isGeneratingReply}
              className="inline-flex items-center gap-2 rounded-full border border-[#dadce0] dark:border-[#444746] px-5 py-2.5 text-sm font-medium text-[#0b57d0] dark:text-[#a8c7fa] hover:bg-[#eaf1fb] dark:hover:bg-[#004a77]/30 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Sparkles className={`h-4 w-4 ${isGeneratingReply ? 'animate-spin' : ''}`} />
              <span>{isGeneratingReply ? 'Génération en cours…' : 'Générer une réponse'}</span>
            </button>
          </div>
        ) : (
          /* Bloc de réponse en ligne interactif officiel Gmail */
          <div className="rounded-2xl border border-[#dadce0] dark:border-[#444746] bg-white dark:bg-[#1f1f1f] shadow-md p-4 animate-fade-slide">
            <div className="flex items-center justify-between border-b border-[#e0e2e7] dark:border-[#3c4043] pb-2 mb-3">
              <span className="text-xs font-semibold text-[#444746] dark:text-[#c4c7c5] flex items-center gap-1.5">
                {replyMode === 'reply' ? <CornerUpLeft className="h-3.5 w-3.5" /> : <CornerUpRight className="h-3.5 w-3.5" />}
                {replyMode === 'reply' ? `Réponse à ${senderName}` : `Transférer : ${message.subject}`}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDirectGenerateReply}
                  disabled={isGeneratingReply}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#dadce0] dark:border-[#444746] px-3 py-1 text-xs font-medium text-[#0b57d0] dark:text-[#a8c7fa] hover:bg-[#eaf1fb] dark:hover:bg-[#004a77]/30 transition-colors disabled:opacity-50"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${isGeneratingReply ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingReply ? 'Génération…' : 'Régénérer avec n8n'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCancelReply}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {isGeneratingReply ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl bg-[#eaf1fb]/40 dark:bg-[#004a77]/10 border border-[#d3e3fd]/60 dark:border-[#004a77]/30 text-center animate-pulse my-2">
                <Sparkles className="h-6 w-6 animate-spin text-[#0b57d0] dark:text-[#a8c7fa] mb-2" />
                <p className="text-xs font-semibold text-[#0b57d0] dark:text-[#a8c7fa]">
                  Appel de votre workflow n8n en cours...
                </p>
                <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">
                  L'agent IA analyse le contenu de l'email et rédige la réponse.
                </p>
              </div>
            ) : (
              <textarea
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Rédigez votre réponse ici..."
                rows={6}
                className="w-full resize-y bg-transparent text-sm text-[#1f1f1f] dark:text-[#e8eaed] placeholder:text-[#5f6368] dark:placeholder:text-[#9aa0a6] outline-none leading-relaxed"
              />
            )}

            {generationError && (
              <div className="mt-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 p-2.5 text-xs text-red-600 dark:text-red-300">
                {generationError}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-[#e0e2e7] dark:border-[#3c4043] mt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendInlineReply}
                  disabled={replySending || isGeneratingReply || !replyText.trim()}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0b57d0] text-white px-5 py-2 text-xs font-semibold hover:bg-[#0842a0] transition-colors disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{replySending ? 'Envoi…' : 'Envoyer'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelReply}
                  className="rounded-full px-4 py-2 text-xs font-medium text-[#444746] dark:text-[#c4c7c5] hover:bg-black/5 dark:hover:bg-white/10"
                >
                  Ignorer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
