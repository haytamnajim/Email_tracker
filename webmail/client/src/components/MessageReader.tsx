import { useEffect, useMemo, useRef, useState } from 'react';
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
  X,
  FileText,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CalendarPlus,
  CalendarCheck,
  Briefcase,
  Heart,
  Zap,
  Bot,
  CalendarClock,
  User,
  Copy,
  Check,
  Languages,
} from 'lucide-react';
import type { Folder, MessageDetail, Theme } from '../types';
import {
  attachmentUrl,
  generateReplyWithN8n,
  cancelReplyWithN8n,
  summarizeEmailWithN8n,
  detectMeetingWithAI,
  extractTasksWithN8n,
  translateEmailWithN8n,
  rewriteDraftWithN8n,
  getMessageKeywords,
  setMessageKeyword,
} from '../api';
import { addTask } from '../utils/tasks';
import { containsRemoteImages, sanitizeEmailHtml } from '../utils/html';
import { formatAddressList, formatBytes, formatFullDate } from '../utils/format';
import { senderGradient, senderInitials } from '../utils/colors';
import { ReaderSkeleton } from './Skeleton';
import SendFlight, { SEND_DONE_MS, SEND_FLIGHT_MS, type SendPhase } from './SendFlight';
import SendButton from './SendButton';

/** Étiquettes proposées dans le menu, stockées comme keywords IMAP. */
const MESSAGE_LABELS = [
  { id: 'WebmailTravail', label: 'Travail' },
  { id: 'WebmailPersonnel', label: 'Personnel' },
  { id: 'WebmailUrgent', label: 'Urgent' },
  { id: 'WebmailFacture', label: 'Facture' },
] as const;

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
  onToggleRead?: (uid: number) => void;
  onSnooze?: (uid: number) => void;
  onMove?: (uid: number, targetFolder: string) => void;
  isStarred?: boolean;
  isRead?: boolean;
  /** Dossiers disponibles pour le menu « Déplacer vers ». */
  folders?: Folder[];
  onSendReply?: (to: string, subject: string, body: string, uid?: number) => Promise<boolean | void> | void;
  onCancelReply?: () => void;
  onCancelSummary?: () => void;
  /** Affiche une notification avec une action facultative (ex. ouvrir Calendar). */
  onNotify?: (message: string, actionLabel?: string, onAction?: () => void) => void;
  /** Callback pour l'extraction de tâches */
  onExtractTasks?: (tasks: Array<{ title: string; deadline?: string; priority?: 'low' | 'medium' | 'high'; description?: string }>) => void;
  /** Callback pour la traduction */
  onTranslate?: (translated: string) => void;
  /** Callback pour la réécriture */
  onRewrite?: (rewritten: string) => void;
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

/**
 * Teintes du sélecteur de ton.
 *
 * Chaque ton porte sa propre identité chromatique. L'état actif est **teinté**
 * et non plein : le texte reste sombre sur fond clair (et inversement en
 * sombre), ce qui garantit un contraste ≥ 4,5:1 quelle que soit la teinte —
 * un fond plein ambre aurait échoué de peu en petit corps.
 */
const REPLY_TONES = [
  {
    id: 'professionnel',
    label: 'Professionnel',
    hint: 'Formel et structuré',
    icon: Briefcase,
    active:
      'bg-[#e8f0fe] text-[#0b3d91] shadow-[inset_0_0_0_1px_#0b57d0] dark:bg-[#004a77]/45 dark:text-[#d3e3fd] dark:shadow-[inset_0_0_0_1px_#a8c7fa]',
    idle: 'text-[#0b57d0] dark:text-[#a8c7fa]',
  },
  {
    id: 'amical',
    label: 'Convivial',
    hint: 'Chaleureux et proche',
    icon: Heart,
    active:
      'bg-[#e6f4ea] text-[#0d652d] shadow-[inset_0_0_0_1px_#137333] dark:bg-[#0d3b24] dark:text-[#a8f0c6] dark:shadow-[inset_0_0_0_1px_#6dd58c]',
    idle: 'text-[#137333] dark:text-[#6dd58c]',
  },
  {
    id: 'court',
    label: 'Bref & Direct',
    hint: 'Droit au but',
    icon: Zap,
    active:
      'bg-[#fef7e0] text-[#7d4600] shadow-[inset_0_0_0_1px_#b06000] dark:bg-[#3f2e00] dark:text-[#ffe08a] dark:shadow-[inset_0_0_0_1px_#fdd663]',
    idle: 'text-[#b06000] dark:text-[#fdd663]',
  },
] as const;

/** Date du jour au format AAAA-MM-JJ, dans le fuseau local (et non UTC). */
function todayIsoDate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** « mardi 10 novembre à 14:00 » à partir de AAAA-MM-JJ + HH:MM. */
function formatMeetingSlot(date: string, time: string): string {
  if (!date) return '';
  const parsed = new Date(`${date}T${time || '00:00'}:00`);
  if (Number.isNaN(parsed.getTime())) return time ? `${date} à ${time}` : date;
  const day = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(parsed);
  return time ? `${day} à ${time}` : day;
}

/**
 * Lien Google Calendar prérempli (heure locale, sans conversion UTC).
 * La durée est ajoutée en minutes : 90 minutes donne bien 1 h 30.
 */
function buildGoogleCalendarUrl(
  title: string,
  date: string,
  time: string,
  duration: string,
): string {
  if (!date) return '';
  const start = new Date(`${date}T${time || '09:00'}:00`);
  if (Number.isNaN(start.getTime())) return '';
  const durationMinutes = Number(duration) || 60;
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const compact = (value: Date) =>
    `${value.getFullYear()}${String(value.getMonth() + 1).padStart(2, '0')}${String(
      value.getDate(),
    ).padStart(2, '0')}T${String(value.getHours()).padStart(2, '0')}${String(
      value.getMinutes(),
    ).padStart(2, '0')}00`;

  return `https://calendar.google.com/calendar/r/eventnew?text=${encodeURIComponent(
    title,
  )}&dates=${compact(start)}/${compact(end)}&details=${encodeURIComponent(
    'Réunion depuis votre Webmail',
  )}`;
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
  onToggleRead,
  onSnooze,
  onMove,
  isStarred = false,
  isRead = false,
  folders = [],
  onSendReply,
  onCancelReply,
  onCancelSummary,
  onNotify,
  onExtractTasks,
  onTranslate,
  onRewrite,
}: MessageReaderProps) {
  const [allowRemoteImages, setAllowRemoteImages] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [replyMode, setReplyMode] = useState<'reply' | 'forward' | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  // Séquence de l'animation d'envoi : 'idle' → 'flying' → 'sent' → 'idle'.
  const [sendPhase, setSendPhase] = useState<SendPhase>('idle');
  const [selectedTone, setSelectedTone] = useState<'professionnel' | 'amical' | 'court'>('professionnel');
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // États pour l'extraction de tâches
  const [extractTasksOpen, setExtractTasksOpen] = useState(false);
  const [extractTasksLoading, setExtractTasksLoading] = useState(false);
  const [extractTasksError, setExtractTasksError] = useState<string | null>(null);
  const [extractTasks, setExtractTasks] = useState<
    Array<{
      title: string;
      deadline?: string;
      priority?: 'low' | 'medium' | 'high';
      description?: string;
    }>
  >([]);

  // États pour la traduction
  const [translateOpen, setTranslateOpen] = useState(false);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [translateResult, setTranslateResult] = useState<string | null>(null);

  // États pour la réécriture
  const [rewriteOpen, setRewriteOpen] = useState(false);
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const [rewriteResult, setRewriteResult] = useState<string | null>(null);

  // Menus d'actions et étiquettes IMAP
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const [labelsMenuOpen, setLabelsMenuOpen] = useState(false);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [labelBusy, setLabelBusy] = useState<string | null>(null);
  const moveMenuRef = useRef<HTMLDivElement>(null);
  const labelsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moveMenuRef.current && !moveMenuRef.current.contains(event.target as Node)) {
        setMoveMenuOpen(false);
      }
      if (labelsMenuRef.current && !labelsMenuRef.current.contains(event.target as Node)) {
        setLabelsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!message) {
      setKeywords([]);
      return;
    }
    let cancelled = false;
    void getMessageKeywords(message.uid, message.folder)
      .then((result) => {
        if (!cancelled && result.success) setKeywords(result.keywords);
      })
      .catch(() => {
        if (!cancelled) setKeywords([]);
      });
    return () => {
      cancelled = true;
    };
  }, [message?.uid, message?.folder]);

  const junkFolder = useMemo(
    () =>
      folders.find((folder) =>
        /spam|junk|indésirable|courrier ind/i.test(`${folder.id} ${folder.name} ${folder.label}`),
      ),
    [folders],
  );

  const moveTargets = useMemo(
    () => folders.filter((folder) => folder.id !== message?.folder),
    [folders, message?.folder],
  );

  const currentFolderLabel = useMemo(
    () => folders.find((folder) => folder.id === message?.folder)?.label ?? 'Message',
    [folders, message?.folder],
  );

  const handleToggleLabel = async (keyword: string, label: string) => {
    if (!message) return;
    const nextValue = !keywords.includes(keyword);
    setKeywords((prev) =>
      nextValue ? [...prev, keyword] : prev.filter((item) => item !== keyword),
    );
    setLabelBusy(keyword);
    try {
      await setMessageKeyword(message.uid, message.folder, keyword, nextValue);
      onNotify?.(nextValue ? `Étiquette « ${label} » ajoutée.` : `Étiquette « ${label} » retirée.`);
    } catch (err: unknown) {
      setKeywords((prev) =>
        nextValue ? prev.filter((item) => item !== keyword) : [...prev, keyword],
      );
      onNotify?.(err instanceof Error ? err.message : "Impossible de modifier l'étiquette.");
    } finally {
      setLabelBusy(null);
    }
  };

  const handleAddToTasks = () => {
    if (!message) return;
    const task = addTask({
      text: message.subject || '(sans objet)',
      source: message.from?.address,
    });
    onNotify?.(task ? 'Tâche ajoutée au panneau Google Tâches.' : "Impossible d'ajouter la tâche.");
  };

  const handleMarkSpam = () => {
    if (!message) return;
    if (!junkFolder) {
      onNotify?.("Dossier « Spam » introuvable sur ce compte.");
      return;
    }
    if (!onMove) {
      onNotify?.('Le déplacement est indisponible.');
      return;
    }
    onMove(message.uid, junkFolder.id);
  };

  const handleCopyReply = async () => {
    if (!replyText.trim()) return;
    try {
      await navigator.clipboard.writeText(replyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const smartReplies = useMemo(() => {
    if (!message) return [];
    const text = (message.text || message.subject || '').toLowerCase();
    if (text.includes('disponible') || text.includes('réunion') || text.includes('rdv') || text.includes('créneau')) {
      return [
        "👍 C'est d'accord pour ce créneau !",
        "📅 Je suis disponible, à quelle heure ?",
        "⏳ Malheureusement indisponible, un autre jour ?",
      ];
    }
    if (text.includes('devis') || text.includes('tarif') || text.includes('prix') || text.includes('projet')) {
      return [
        "📋 Bien reçu, je vous prépare une proposition.",
        "📞 Pouvons-nous échanger par téléphone 10 min ?",
        "✅ C'est noté, je reviens vers vous rapidement.",
      ];
    }
    return [
      "👍 Bien reçu, merci pour l'information !",
      "✅ C'est noté, je m'en occupe dès aujourd'hui.",
      "🙏 Merci beaucoup pour votre retour.",
    ];
  }, [message?.text, message?.subject]);

  /** Extrait les tâches et échéances de l'email */
  const handleExtractTasks = async () => {
    if (!message) return;
    setExtractTasksLoading(true);
    setExtractTasksError(null);
    setExtractTasks([]);
    try {
      const result = await extractTasksWithN8n(message);
      if (result.success && result.tasks) {
        setExtractTasks(result.tasks);
        setExtractTasksOpen(true);
        onExtractTasks?.(result.tasks);
      } else {
        setExtractTasksError(result.error || 'Erreur inconnue');
        setExtractTasksOpen(true);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setExtractTasksError(errorMessage);
      setExtractTasksOpen(true);
    } finally {
      setExtractTasksLoading(false);
    }
  };

  /** Traduit l'email */
  const handleTranslate = async () => {
    if (!message) return;
    setTranslateLoading(true);
    setTranslateError(null);
    setTranslateResult(null);
    try {
      const result = await translateEmailWithN8n(message);
      if (result.success && result.translated) {
        setTranslateResult(result.translated);
        setTranslateOpen(true);
        onTranslate?.(result.translated);
      } else {
        setTranslateError(result.error || 'Erreur inconnue');
        setTranslateOpen(true);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setTranslateError(errorMessage);
      setTranslateOpen(true);
    } finally {
      setTranslateLoading(false);
    }
  };

  /** Réécrit le brouillon (pour les réponses) */
  const handleRewrite = async () => {
    if (!message) return;
    const draft = replyText.trim() || message.text || message.html || '';
    if (!draft.trim()) {
      setRewriteError("Aucun texte à améliorer dans ce message.");
      setRewriteOpen(true);
      return;
    }
    setRewriteLoading(true);
    setRewriteError(null);
    setRewriteResult(null);
    const toneMap = { professionnel: 'professionnel', amical: 'positif', court: 'concise' } as const;
    try {
      const result = await rewriteDraftWithN8n(draft, toneMap[selectedTone]);
      if (result.success && result.rewritten) {
        setRewriteResult(result.rewritten);
        setRewriteOpen(true);
        onRewrite?.(result.rewritten);
      } else {
        setRewriteError(result.error || 'Erreur inconnue');
        setRewriteOpen(true);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setRewriteError(errorMessage);
      setRewriteOpen(true);
    } finally {
      setRewriteLoading(false);
    }
  };

  // États pour le résumé par l'IA
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // États pour la détection de réunion par IA
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [meetingConfirmed, setMeetingConfirmed] = useState(false);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetingDuration, setMeetingDuration] = useState('60');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDetected, setMeetingDetected] = useState(false);
  const [meetingConfidence, setMeetingConfidence] = useState(0);
  const [meetingSource, setMeetingSource] = useState<'n8n' | 'fallback'>('fallback');
  const [meetingReason, setMeetingReason] = useState('');
  const [isDetectingMeeting, setIsDetectingMeeting] = useState(false);

  useEffect(() => {
    setAllowRemoteImages(false);
    setReplyMode(null);
    setReplyText('');
    setSendPhase('idle');
    setDetailsOpen(false);
    setIsGeneratingReply(false);
    setGenerationError(null);
    setSummaryOpen(false);
    setSummaryText(null);
    setIsSummarizing(false);
    setSummaryError(null);
    setMeetingModalOpen(false);
    setMeetingConfirmed(false);
    setMeetingDate(todayIsoDate());
    setMeetingTime('');
    setMeetingDuration('60');
    setMeetingTitle(message?.subject ?? '');
  }, [message?.uid]);

  /** Appel IA dès qu'un email est chargé pour détecter s'il contient une réunion */
  useEffect(() => {
    if (!message) return;
    let cancelled = false;
    setIsDetectingMeeting(true);
    setMeetingDetected(false);
    setMeetingSource('fallback');
    setMeetingReason('');
    setMeetingConfidence(0);

    const storedWebhook = localStorage.getItem('n8n_detect_meeting_webhook_url') || undefined;

    detectMeetingWithAI({
      webhookUrl: storedWebhook,
      message: {
        uid: message.uid,
        from: { name: message.from?.name, address: message.from?.address },
        subject: message.subject,
        date: message.date,
        text: message.text,
        html: message.html,
      },
    }).then((res) => {
      if (cancelled) return;
      setMeetingDetected(res.isMeeting);
      setMeetingConfidence(res.confidence);
      setMeetingSource(res.source);
      setMeetingReason(res.reason);
      if (res.isMeeting) {
        if (res.suggestedTitle) setMeetingTitle(res.suggestedTitle);
        // Le créneau détecté préremplit la fenêtre de confirmation : plus
        // besoin de ressaisir la date et l'heure lues dans l'email.
        if (res.suggestedDate) setMeetingDate(res.suggestedDate);
        if (res.suggestedTime) setMeetingTime(res.suggestedTime);
      }
    }).finally(() => {
      if (!cancelled) setIsDetectingMeeting(false);
    });

    return () => { cancelled = true; };
  }, [message?.uid]);


  const handleSummarize = async () => {
    if (!message) return;
    setSummaryOpen(true);
    if (summaryText) return; // Déjà chargé

    setIsSummarizing(true);
    setSummaryError(null);
    try {
      const storedWebhook = localStorage.getItem('n8n_reply_webhook_url') || undefined;
      const res = await summarizeEmailWithN8n(
        {
          uid: message.uid,
          from: { name: message.from?.name, address: message.from?.address },
          to: (message.to ?? []).map((entry) => ({
            name: entry.name,
            address: entry.address,
          })),
          subject: message.subject,
          date: message.date,
          text: message.text,
          html: message.html,
        },
        storedWebhook,
      );

      if (res.summary) {
        setSummaryText(res.summary);
      }
      if (!res.success && res.error) {
        setSummaryError(res.error);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSummaryError(msg);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCancelSummarize = () => {
    cancelReplyWithN8n(message?.uid);
    setSummaryOpen(false);
    setIsSummarizing(false);
    setSummaryError(null);
    onCancelSummary?.();
  };

  const handleDirectGenerateReply = async (toneToUse?: unknown) => {
    if (!message) return;
    const tone: 'professionnel' | 'amical' | 'court' =
      typeof toneToUse === 'string' && (toneToUse === 'professionnel' || toneToUse === 'amical' || toneToUse === 'court')
        ? toneToUse
        : selectedTone;
    if (typeof toneToUse === 'string' && (toneToUse === 'professionnel' || toneToUse === 'amical' || toneToUse === 'court')) {
      setSelectedTone(toneToUse);
    }
    setReplyMode('reply');
    setIsGeneratingReply(true);
    setGenerationError(null);

    const storedWebhook = localStorage.getItem('n8n_reply_webhook_url') || undefined;

    try {
      const res = await generateReplyWithN8n({
        webhookUrl: storedWebhook,
        message: {
          uid: message.uid,
          // Adresses recopiées champ par champ : passer l'objet reçu tel quel
          // laissait entrer des propriétés parasites et faisait échouer la
          // sérialisation de la requête.
          from: { name: message.from?.name, address: message.from?.address },
          to: (message.to ?? []).map((entry) => ({
            name: entry.name,
            address: entry.address,
          })),
          subject: message.subject,
          date: message.date,
          text: message.text,
          html: message.html,
        },
        tone,
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
    if (!replyText.trim() || replySending) return;
    setReplySending(true);
    setGenerationError(null);

    // On lance l'animation tout de suite : elle sert de retour immédiat au
    // clic, sans attendre la réponse réseau.
    const startedAt = Date.now();
    setSendPhase('flying');

    /** Laisse le vol se terminer, affiche « Envoyé », puis referme le voile. */
    const playOut = async () => {
      const remaining = Math.max(0, SEND_FLIGHT_MS - (Date.now() - startedAt));
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setSendPhase('sent');
      await new Promise((resolve) => setTimeout(resolve, SEND_DONE_MS));
      setSendPhase('idle');
    };

    try {
      const targetSubject = message.subject?.toLowerCase().startsWith('re:')
        ? message.subject
        : `Re: ${message.subject || '(sans objet)'}`;
      const res = await onSendReply?.(senderAddress, targetSubject, replyText, message.uid);
      if (res === false) {
        // Échec signalé par le parent : on coupe le vol, il affiche l'erreur.
        setSendPhase('idle');
        return;
      }
      await playOut();
      setReplyMode(null);
      setReplyText('');
    } catch (err: unknown) {
      setSendPhase('idle');
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
    <>
      
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
            onClick={handleMarkSpam}
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
            onClick={() => onToggleRead?.(message.uid)}
            disabled={!isRead || !onToggleRead}
            title={isRead ? 'Marquer comme non lu' : 'Message déjà non lu'}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Mail className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onSnooze?.(message.uid)}
            disabled={!onSnooze}
            title="Mettre en attente jusqu'à demain 08:00"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Clock className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleAddToTasks}
            title="Ajouter aux tâches"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors"
          >
            <CheckSquare className="h-4 w-4" />
          </button>

          <div className="mx-1 h-5 w-[1px] bg-[#e0e2e7] dark:bg-[#3c4043]" />

          <button
            type="button"
            title="Extraire tâches"
            onClick={handleExtractTasks}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0b57d0] hover:bg-[#0842a0] text-white px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={extractTasksLoading}
          >
            <Bot className="h-4 w-4" />
            {extractTasksLoading ? (
              <Sparkles className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Tâches"
            )}
          </button>

          <div className="mx-1 h-5 w-[1px] bg-[#e0e2e7] dark:bg-[#3c4043]" />

          <button
            type="button"
            title="Traduire"
            onClick={handleTranslate}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={translateLoading}
          >
            <Languages className="h-4 w-4" />
            {translateLoading ? (
              <Sparkles className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Traduire"
            )}
          </button>

          <div className="mx-1 h-5 w-[1px] bg-[#e0e2e7] dark:bg-[#3c4043]" />

          <button
            type="button"
            title="Améliorer le texte"
            onClick={handleRewrite}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#c0843c] hover:bg-[#a8703f] text-white px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={rewriteLoading}
          >
            <Bot className="h-4 w-4" />
            {rewriteLoading ? (
              <Sparkles className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Améliorer"
            )}
          </button>

          <div className="mx-1 h-5 w-[1px] bg-[#e0e2e7] dark:bg-[#3c4043]" />

          <div className="relative" ref={moveMenuRef}>
            <button
              type="button"
              onClick={() => {
                setMoveMenuOpen((prev) => !prev);
                setLabelsMenuOpen(false);
              }}
              title="Déplacer vers"
              aria-haspopup="menu"
              aria-expanded={moveMenuOpen}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors ${
                moveMenuOpen ? 'bg-[#f1f3f4] dark:bg-[#282a2c]' : ''
              }`}
            >
              <FolderInput className="h-4 w-4" />
            </button>

            {moveMenuOpen && (
              <div
                role="menu"
                aria-label="Déplacer le message vers un dossier"
                className="absolute left-0 top-10 z-50 w-60 rounded-lg border border-[#e0e2e7] bg-white py-1 text-xs text-[#1f1f1f] shadow-xl animate-fade-slide dark:border-[#3c4043] dark:bg-[#202124] dark:text-[#e8eaed]"
              >
                <p className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-[#5f6368] dark:text-[#9aa0a6]">
                  Déplacer vers
                </p>
                <div className="max-h-64 overflow-y-auto">
                  {moveTargets.length === 0 ? (
                    <p className="px-3 py-2 text-[#5f6368] dark:text-[#9aa0a6]">
                      Aucun autre dossier.
                    </p>
                  ) : (
                    moveTargets.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMoveMenuOpen(false);
                          onMove?.(message.uid, folder.id);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c]"
                      >
                        <FolderInput className="h-3.5 w-3.5 shrink-0 text-[#5f6368] dark:text-[#9aa0a6]" />
                        <span className="truncate">{folder.label}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={labelsMenuRef}>
            <button
              type="button"
              onClick={() => {
                setLabelsMenuOpen((prev) => !prev);
                setMoveMenuOpen(false);
              }}
              title="Libellés"
              aria-haspopup="menu"
              aria-expanded={labelsMenuOpen}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors ${
                labelsMenuOpen ? 'bg-[#f1f3f4] dark:bg-[#282a2c]' : ''
              }`}
            >
              <Tag className="h-4 w-4" />
            </button>

            {labelsMenuOpen && (
              <div
                role="menu"
                aria-label="Étiquettes du message"
                className="absolute left-0 top-10 z-50 w-52 rounded-lg border border-[#e0e2e7] bg-white py-1 text-xs text-[#1f1f1f] shadow-xl animate-fade-slide dark:border-[#3c4043] dark:bg-[#202124] dark:text-[#e8eaed]"
              >
                <p className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-[#5f6368] dark:text-[#9aa0a6]">
                  Étiquettes
                </p>
                {MESSAGE_LABELS.map((label) => {
                  const active = keywords.includes(label.id);
                  return (
                    <button
                      key={label.id}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={active}
                      disabled={labelBusy === label.id}
                      onClick={() => void handleToggleLabel(label.id, label.label)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[#f1f3f4] disabled:opacity-60 dark:hover:bg-[#282a2c]"
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          active
                            ? 'border-[#0b57d0] bg-[#0b57d0] text-white'
                            : 'border-[#5f6368] text-transparent dark:border-[#9aa0a6]'
                        }`}
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                      <span className="flex-1">{label.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Bouton Résumer avec l'IA façon Google Gemini */}
          <button
            type="button"
            onClick={handleSummarize}
            disabled={isSummarizing}
            title="Résumer cet email avec l'IA"
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
              summaryOpen
                ? 'bg-[#d3e3fd] text-[#0b57d0] dark:bg-[#004a77]/50 dark:text-[#a8c7fa]'
                : 'text-[#0b57d0] dark:text-[#a8c7fa] bg-[#eaf1fb] dark:bg-[#004a77]/25 hover:bg-[#d3e3fd] dark:hover:bg-[#004a77]/40'
            }`}
          >
            <Sparkles className={`h-3.5 w-3.5 ${isSummarizing ? 'animate-spin' : ''}`} />
            <span>{isSummarizing ? 'Analyse…' : 'Résumer'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleDirectGenerateReply()}
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

      {/* ── Bandeau Détection de Réunion par IA ── */}
      {(isDetectingMeeting || meetingDetected) && !meetingConfirmed && (
        <div className={`mx-6 mt-3 rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 transition-[border-color,background-color] duration-200 ${
          isDetectingMeeting
            ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30'
            : 'border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              isDetectingMeeting ? 'bg-slate-400 text-white' : 'bg-amber-500 text-white'
            }`}>
              {isDetectingMeeting
                ? <Sparkles className="h-4 w-4 animate-spin" />
                : <CalendarPlus className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              {isDetectingMeeting ? (
                <>
                  <p className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <Bot className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    Analyse IA en cours…
                  </p>
                  <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">L'IA vérifie si cet email contient une demande de réunion.</p>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                      <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {meetingSource === 'n8n'
                        ? "Réunion détectée par l'IA"
                        : 'Réunion détectée (analyse locale)'}
                    </p>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      meetingSource === 'n8n'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {meetingSource === 'n8n' ? (
                        <>
                          <Bot className="h-3 w-3 shrink-0" aria-hidden="true" />
                          IA · {Math.round(meetingConfidence * 100)}%
                        </>
                      ) : (
                        'Local'
                      )}
                    </span>
                    {meetingDate && (
                      <span className="text-[10px] font-medium text-amber-800 dark:text-amber-200">
                        {formatMeetingSlot(meetingDate, meetingTime)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] truncate" title={meetingReason}>{meetingReason || 'Cliquez pour planifier le rendez-vous.'}</p>
                </>
              )}
            </div>
          </div>
          {!isDetectingMeeting && (
            <button
              type="button"
              id="meeting-confirm-btn"
              onClick={() => {
                // Ne pas écraser le titre proposé par la détection.
                if (!meetingTitle) setMeetingTitle(message?.subject ?? '');
                if (!meetingTime) setMeetingTime('09:00');
                setMeetingModalOpen(true);
              }}
              className="shrink-0 inline-flex items-center gap-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 text-xs font-semibold transition-colors shadow-sm"
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Confirmer le RDV
            </button>
          )}
        </div>
      )}

      {/* ── Modal de confirmation de réunion ── */}
      {meetingModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-slide"
          onClick={(e) => { if (e.target === e.currentTarget) setMeetingModalOpen(false); }}
        >
          <div className="relative w-full max-w-sm mx-4 rounded-2xl bg-white dark:bg-[#1f1f1f] shadow-2xl border border-[#dadce0] dark:border-[#444746] overflow-hidden">
            {/* En-tête */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#e0e2e7] dark:border-[#3c4043]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white">
                  <CalendarPlus className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold text-[#1f1f1f] dark:text-[#e8eaed]">Confirmer le rendez-vous</span>
              </div>
              <button
                type="button"
                onClick={() => setMeetingModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#5f6368] hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Formulaire */}
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#444746] dark:text-[#c4c7c5] mb-1">Titre du rendez-vous</label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="Ex: Appel avec client"
                  className="w-full rounded-xl border border-[#dadce0] dark:border-[#444746] bg-[#f8f9fa] dark:bg-[#141414] px-3 py-2 text-sm text-[#1f1f1f] dark:text-[#e8eaed] outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#444746] dark:text-[#c4c7c5] mb-1">Date</label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    min={todayIsoDate()}
                    className="w-full rounded-xl border border-[#dadce0] dark:border-[#444746] bg-[#f8f9fa] dark:bg-[#141414] px-3 py-2 text-sm text-[#1f1f1f] dark:text-[#e8eaed] outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#444746] dark:text-[#c4c7c5] mb-1">Heure</label>
                  <input
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    className="w-full rounded-xl border border-[#dadce0] dark:border-[#444746] bg-[#f8f9fa] dark:bg-[#141414] px-3 py-2 text-sm text-[#1f1f1f] dark:text-[#e8eaed] outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#444746] dark:text-[#c4c7c5] mb-1">Durée</label>
                <select
                  value={meetingDuration}
                  onChange={(e) => setMeetingDuration(e.target.value)}
                  className="w-full rounded-xl border border-[#dadce0] dark:border-[#444746] bg-[#f8f9fa] dark:bg-[#141414] px-3 py-2 text-sm text-[#1f1f1f] dark:text-[#e8eaed] outline-none focus:border-[#0b57d0] dark:focus:border-[#a8c7fa] transition-colors"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 heure</option>
                  <option value="90">1h30</option>
                  <option value="120">2 heures</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-[#eaf1fb] dark:bg-[#004a77]/20 border border-[#d3e3fd] dark:border-[#004a77]/40 px-3 py-2 text-xs text-[#0b57d0] dark:text-[#a8c7fa]">
                <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  <span className="font-semibold">Avec :</span> {message?.from?.name ?? message?.from?.address}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 px-5 pb-5">
              <button
                type="button"
                id="meeting-confirm-submit"
                disabled={!meetingDate || !meetingTime || !meetingTitle.trim()}
                onClick={() => {
                  const calendarUrl = buildGoogleCalendarUrl(
                    meetingTitle,
                    meetingDate,
                    meetingTime,
                    meetingDuration,
                  );
                  setMeetingConfirmed(true);
                  setMeetingModalOpen(false);
                  // Le bandeau IA disparaît une fois le rendez-vous fixé.
                  // La notification conserve l'accès au préremplissage Calendar.
                  if (calendarUrl && onNotify) {
                    onNotify(
                      `Rendez-vous confirmé : ${formatMeetingSlot(meetingDate, meetingTime)}.`,
                      'Ouvrir Calendar',
                      () => window.open(calendarUrl, '_blank', 'noopener,noreferrer'),
                    );
                  }
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#0b57d0] hover:bg-[#0842a0] text-white px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CalendarCheck className="h-4 w-4" />
                Confirmer le rendez-vous
              </button>
              <button
                type="button"
                onClick={() => setMeetingModalOpen(false)}
                className="rounded-full border border-[#dadce0] dark:border-[#444746] px-4 py-2.5 text-sm font-medium text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f1f3f4] dark:hover:bg-[#282a2c] transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bandeau / Carte Résumé IA Google Workspace ── */}
      {summaryOpen && (
        <div className="mx-6 mt-3 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/80 via-white to-purple-50/40 dark:from-[#131b2e] dark:via-[#1c222e] dark:to-[#1a1c29] p-4 shadow-sm animate-fade-slide">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-blue-100 dark:border-blue-900/40">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0b57d0] text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-bold text-[#0b57d0] dark:text-[#a8c7fa] tracking-wide uppercase">
                Points clés du message (IA)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCancelSummarize}
                title="Annuler et fermer le résumé"
                className="flex items-center gap-1 text-[11px] text-[#5f6368] dark:text-[#9aa0a6] hover:text-red-600 dark:hover:text-red-400 px-2 py-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <span>Annuler</span>
              </button>
              <button
                type="button"
                onClick={handleCancelSummarize}
                className="flex h-6 w-6 items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {isSummarizing ? (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3 text-xs text-[#0b57d0] dark:text-[#a8c7fa]">
                <Sparkles className="h-4 w-4 animate-spin shrink-0" />
                <span>Génération du résumé en 3 points par l'agent IA...</span>
              </div>
              <button
                type="button"
                onClick={handleCancelSummarize}
                className="text-xs text-[#5f6368] dark:text-[#9aa0a6] hover:underline"
              >
                Arrêter
              </button>
            </div>
          ) : summaryError ? (
            <div className="text-xs text-red-600 dark:text-red-300 py-1">
              {summaryError}
            </div>
          ) : summaryText ? (
            <div className="space-y-1.5 text-xs text-[#1f1f1f] dark:text-[#e8eaed] leading-relaxed whitespace-pre-wrap">
              {summaryText}
            </div>
          ) : null}
        </div>
      )}

      {/* ── Tâches et échéances extraites par l'IA ── */}
      {(extractTasksOpen || extractTasksError) && (
        <div className="mx-6 mt-3 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/80 via-white to-cyan-50/40 dark:from-[#131b2e] dark:via-[#1c222e] dark:to-[#132029] p-4 shadow-sm animate-fade-slide">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-blue-100 dark:border-blue-900/40">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0b57d0] text-white">
                <CheckSquare className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-bold text-[#0b57d0] dark:text-[#a8c7fa] tracking-wide uppercase">
                Tâches et échéances (IA)
              </span>
            </div>
            <button
              type="button"
              onClick={() => { setExtractTasksOpen(false); setExtractTasksError(null); }}
              title="Fermer les tâches extraites"
              className="flex h-6 w-6 items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-150"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {extractTasksError ? (
            <p className="text-xs text-red-600 dark:text-red-300 py-1">{extractTasksError}</p>
          ) : extractTasks.length === 0 ? (
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] py-1">Aucune tâche détectée dans ce message.</p>
          ) : (
            <ul className="space-y-2">
              {extractTasks.map((task, index) => (
                <li
                  key={`${task.title}-${index}`}
                  className="flex items-start gap-2 rounded-xl border border-blue-100/80 dark:border-blue-900/40 bg-white/70 dark:bg-[#1e1f22]/60 px-3 py-2"
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0b57d0]/10 text-[#0b57d0] dark:bg-[#a8c7fa]/15 dark:text-[#a8c7fa]">
                    <Check className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#1f1f1f] dark:text-[#e8eaed]">{task.title}</p>
                    {task.description && (
                      <p className="mt-0.5 text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">{task.description}</p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {task.deadline && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf1fb] dark:bg-[#004a77]/30 px-2 py-0.5 text-[10.5px] font-medium text-[#0b57d0] dark:text-[#a8c7fa]">
                          <CalendarClock className="h-3 w-3" />
                          {task.deadline}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                          task.priority === 'high'
                            ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                            : task.priority === 'low'
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}
                      >
                        {task.priority === 'high'
                          ? 'Priorité haute'
                          : task.priority === 'low'
                            ? 'Priorité basse'
                            : 'Priorité moyenne'}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Traduction IA du message ── */}
      {(translateOpen || translateError) && (
        <div className="mx-6 mt-3 rounded-2xl border border-purple-200/80 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/40 dark:from-[#1a1327] dark:via-[#1c1a24] dark:to-[#17122a] p-4 shadow-sm animate-fade-slide">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-purple-100 dark:border-purple-900/40">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#7c3aed] text-white">
                <Languages className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-bold text-[#6d28d9] dark:text-[#c4b5fd] tracking-wide uppercase">
                Traduction (IA)
              </span>
            </div>
            <button
              type="button"
              onClick={() => { setTranslateOpen(false); setTranslateError(null); }}
              title="Fermer la traduction"
              className="flex h-6 w-6 items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-150"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {translateError ? (
            <p className="text-xs text-red-600 dark:text-red-300 py-1">{translateError}</p>
          ) : (
            <div className="flex items-start gap-3">
              <p className="flex-1 whitespace-pre-wrap text-xs leading-relaxed text-[#1f1f1f] dark:text-[#e8eaed]">
                {translateResult}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (!translateResult) return;
                  void navigator.clipboard
                    .writeText(translateResult)
                    .then(() => onNotify?.('Traduction copiée.'))
                    .catch(() => undefined);
                }}
                title="Copier la traduction"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-150"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Brouillon amélioré par l'IA ── */}
      {(rewriteOpen || rewriteError) && (
        <div className="mx-6 mt-3 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/40 dark:from-[#241a10] dark:via-[#1f1d1a] dark:to-[#24170f] p-4 shadow-sm animate-fade-slide">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-100 dark:border-amber-900/40">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#c0843c] text-white">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-bold text-[#a8703f] dark:text-[#f3c78a] tracking-wide uppercase">
                Texte amélioré (IA)
              </span>
            </div>
            <button
              type="button"
              onClick={() => { setRewriteOpen(false); setRewriteError(null); }}
              title="Fermer le texte amélioré"
              className="flex h-6 w-6 items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-150"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {rewriteError ? (
            <p className="text-xs text-red-600 dark:text-red-300 py-1">{rewriteError}</p>
          ) : (
            <>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#1f1f1f] dark:text-[#e8eaed]">
                {rewriteResult}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!rewriteResult) return;
                    setReplyText(rewriteResult);
                    setReplyMode('reply');
                    setRewriteOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#c0843c] px-3 py-1.5 text-[11.5px] font-semibold text-white hover:bg-[#a8703f] transition-colors duration-150"
                >
                  <CornerUpLeft className="h-3.5 w-3.5" />
                  Utiliser comme réponse
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!rewriteResult) return;
                    void navigator.clipboard
                      .writeText(rewriteResult)
                      .then(() => onNotify?.('Texte amélioré copié.'))
                      .catch(() => undefined);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#dadce0] dark:border-[#444746] px-3 py-1.5 text-[11.5px] font-medium text-[#444746] dark:text-[#c4c7c5] hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-150"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copier
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Titre / Objet du message ── */}
      <div className="px-6 pt-5 pb-3 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl sm:text-[22px] font-normal text-[#1f1f1f] dark:text-[#e8eaed] leading-snug">
            {message.subject || '(sans objet)'}
          </h1>
          <span className="rounded bg-[#f0f4f9] dark:bg-[#2a2b2e] px-2 py-0.5 text-xs font-medium text-[#444746] dark:text-[#c4c7c5] border border-[#dadce0] dark:border-[#444746]">
            {currentFolderLabel}
          </span>
          {MESSAGE_LABELS.filter((label) => keywords.includes(label.id)).map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center gap-1 rounded-full border border-[#c2d7f5] bg-[#eaf1fb] px-2 py-0.5 text-[11px] font-medium text-[#0b57d0] dark:border-[#004a77] dark:bg-[#004a77]/30 dark:text-[#a8c7fa]"
            >
              <Tag className="h-3 w-3" />
              {label.label}
            </span>
          ))}
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
          <div className="space-y-4">
            {/* Smart Reply Chips rapides façon Gmail */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-[#5f6368] dark:text-[#9aa0a6] flex items-center gap-1 mr-1">
                <Sparkles className="h-3 w-3 text-[#0b57d0] dark:text-[#a8c7fa]" /> Réponse rapide :
              </span>
              {smartReplies.map((replyOption, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setReplyMode('reply');
                    setReplyText(replyOption);
                  }}
                  className="rounded-full border border-[#dadce0] dark:border-[#444746] bg-[#f8f9fa] dark:bg-[#202124] px-3.5 py-1.5 text-xs text-[#1f1f1f] dark:text-[#e8eaed] hover:border-[#0b57d0] hover:bg-[#eaf1fb] dark:hover:border-[#a8c7fa] dark:hover:bg-[#004a77]/30 transition-[background-color,border-color,box-shadow,transform] cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  {replyOption}
                </button>
              ))}
            </div>

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
                onClick={() => handleDirectGenerateReply()}
                disabled={isGeneratingReply}
                className="inline-flex items-center gap-2 rounded-full border border-[#dadce0] dark:border-[#444746] px-5 py-2.5 text-sm font-medium text-[#0b57d0] dark:text-[#a8c7fa] hover:bg-[#eaf1fb] dark:hover:bg-[#004a77]/30 transition-colors cursor-pointer disabled:opacity-60"
              >
                <Sparkles className={`h-4 w-4 ${isGeneratingReply ? 'animate-spin' : ''}`} />
                <span>{isGeneratingReply ? 'Génération en cours…' : 'Générer une réponse'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Bloc de réponse en ligne interactif officiel Gmail */
          <div className="rounded-2xl border border-[#dadce0] dark:border-[#444746] bg-white dark:bg-[#1f1f1f] shadow-md p-4 animate-fade-slide">
            <div className="mb-3 flex items-center justify-between gap-2 border-b border-[#e0e2e7] pb-2 dark:border-[#3c4043]">
              <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-[#444746] dark:text-[#c4c7c5]">
                {replyMode === 'reply' ? (
                  <CornerUpLeft className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <CornerUpRight className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate">
                  {replyMode === 'reply' ? `Réponse à ${senderName}` : `Transférer : ${message.subject}`}
                </span>
              </span>

              <div className="flex items-center gap-2">
                {replyText.trim() && (
                  <button
                    type="button"
                    onClick={handleCopyReply}
                    title="Copier le texte dans le presse-papiers"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#dadce0] px-3 py-1 text-[11px] font-medium text-[#444746] transition-colors duration-150 hover:bg-[#f1f3f4] dark:border-[#444746] dark:text-[#c4c7c5] dark:hover:bg-[#282a2c]"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copier</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDirectGenerateReply()}
                  disabled={isGeneratingReply}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#dadce0] px-3 py-1 text-[11px] font-medium text-[#0b57d0] transition-colors duration-150 hover:bg-[#eaf1fb] disabled:opacity-50 dark:border-[#444746] dark:text-[#a8c7fa] dark:hover:bg-[#004a77]/30"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${isGeneratingReply ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingReply ? 'Génération…' : 'Régénérer'}</span>
                </button>
              </div>
            </div>

            {/* Sélecteur de ton — chips Material 3, une teinte par ton */}
            <div className="mb-3 flex items-center gap-2">
              <span
                id="reply-tone-label"
                className="shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#5f6368] dark:text-[#9aa0a6]"
              >
                Ton
              </span>
              <div
                role="radiogroup"
                aria-labelledby="reply-tone-label"
                className="flex items-center gap-1.5 overflow-x-auto pb-0.5"
              >
                {REPLY_TONES.map((toneItem) => {
                  const isActive = selectedTone === toneItem.id;
                  const Icon = toneItem.icon;
                  return (
                    <button
                      key={toneItem.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      title={toneItem.hint}
                      disabled={isGeneratingReply}
                      onClick={() => {
                        setSelectedTone(toneItem.id);
                        if (replyText.trim()) {
                          void handleDirectGenerateReply(toneItem.id);
                        }
                      }}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11.5px] font-medium transition-[background-color,color,box-shadow,transform] duration-200 motion-safe:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${
                        isActive
                          ? toneItem.active
                          : 'bg-white text-[#444746] shadow-[inset_0_0_0_1px_#dadce0] hover:bg-[#f6f8fc] dark:bg-[#202124] dark:text-[#c4c7c5] dark:shadow-[inset_0_0_0_1px_#444746] dark:hover:bg-[#282a2c]'
                      }`}
                    >
                      <Icon
                        className={`h-3.5 w-3.5 shrink-0 ${isActive ? '' : toneItem.idle}`}
                        strokeWidth={2.2}
                        aria-hidden="true"
                      />
                      <span className="whitespace-nowrap">{toneItem.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {isGeneratingReply ? (
              <div className="relative overflow-hidden rounded-2xl border border-blue-200/60 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/60 via-slate-50/40 to-indigo-50/40 dark:from-[#0d1527] dark:via-[#131824] dark:to-[#17122a] p-6 my-2 shadow-inner">
                {/* Effet d'aura lumineuse d'arrière-plan */}
                <div className="pointer-events-none absolute -top-12 -left-12 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-purple-400/20 blur-2xl" />

                <div className="relative flex flex-col items-center justify-center text-center">
                  {/* Icône avec effet pulsation et anneaux */}
                  <div className="relative mb-3 flex h-12 w-12 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0b57d0]/25 dark:bg-[#a8c7fa]/20 opacity-75" />
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-[#0b57d0] to-[#7c3aed] text-white shadow-md">
                      <Sparkles className="h-5 w-5 animate-spin" />
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">
                    Rédaction de la réponse par l'IA…
                  </h4>
                  <p className="mt-1 text-xs text-[#5f6368] dark:text-[#9aa0a6] max-w-sm">
                    Analyse du contexte de votre échange et formulation d'un retour adapté.
                  </p>

                  {/* Lignes de skeleton avec vague lumineuse */}
                  <div className="mt-5 w-full max-w-md space-y-2">
                    <div className="h-2.5 w-4/5 mx-auto rounded-full bg-gradient-to-r from-blue-200 via-indigo-100 to-blue-200 dark:from-blue-900/50 dark:via-indigo-800/40 dark:to-blue-900/50 animate-pulse" />
                    <div className="h-2.5 w-full mx-auto rounded-full bg-gradient-to-r from-blue-200/70 via-indigo-100/70 to-blue-200/70 dark:from-blue-900/30 dark:via-indigo-800/20 dark:to-blue-900/30 animate-pulse delay-75" />
                    <div className="h-2.5 w-3/5 mx-auto rounded-full bg-gradient-to-r from-blue-200 via-indigo-100 to-blue-200 dark:from-blue-900/50 dark:via-indigo-800/40 dark:to-blue-900/50 animate-pulse delay-150" />
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelReply}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#dadce0] dark:border-[#444746] bg-white/80 dark:bg-[#202124]/80 px-3.5 py-1 text-xs font-medium text-[#5f6368] dark:text-[#c4c7c5] hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-[#202124] transition-colors duration-150"
                  >
                    <span>Annuler la génération</span>
                  </button>
                </div>
              </div>
            ) : (
              <textarea
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  // Ctrl/⌘ + Entrée envoie la réponse, comme dans Gmail.
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    void handleSendInlineReply();
                  }
                }}
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

            {/* ── Pied de carte : actions séparées de la zone de rédaction ──
                Masqué pendant la génération : le panneau central propose déjà
                « Annuler la génération » et le bouton d'envoi y serait inerte.
                Les marges négatives annulent le rembourrage `p-4` de la carte
                pour que le bandeau touche les bords, sans réindenter tout le
                contenu. Les coins bas reprennent le rayon de la carte. */}
            {!isGeneratingReply && (
              <div className="-mx-4 -mb-4 mt-3 flex items-center justify-between gap-3 rounded-b-2xl border-t border-[#e0e2e7] bg-[#f8fafd] px-4 py-3 dark:border-[#3c4043] dark:bg-[#282a2c]/50">
                <SendButton
                  onClick={handleSendInlineReply}
                  disabled={!replyText.trim()}
                  loading={replySending}
                />
                <button
                  type="button"
                  onClick={handleCancelReply}
                  className="inline-flex h-9 items-center justify-center rounded-full px-4 text-[12.5px] font-medium text-[#444746] transition-colors duration-150 hover:bg-black/[0.06] active:bg-black/[0.1] dark:text-[#c4c7c5] dark:hover:bg-white/10 dark:active:bg-white/[0.16]"
                >
                  Ignorer
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <SendFlight phase={sendPhase} />
    </>
  );
}
