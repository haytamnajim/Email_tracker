import type { Address, Folder, MessageDetail, MessageQuery, MessagesPage } from '../types';

const BASE = '/api';

/** Erreur lisible renvoyée à l'interface. Ne contient jamais d'identifiant. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Sérialise le corps d'une requête.
 *
 * `JSON.stringify` lève une `TypeError` au message incompréhensible
 * (« Converting circular structure to JSON --> starting at object with
 * constructor 'HTMLSpanElement'… ») dès qu'une valeur non sérialisable se
 * glisse dans la charge utile. Ce message interne s'affichait tel quel dans
 * l'interface ; on le traduit en erreur exploitable.
 */
function jsonBody(payload: unknown): string {
  try {
    return JSON.stringify(payload);
  } catch {
    throw new ApiError(
      "Impossible de préparer la requête : une valeur non sérialisable a été détectée. Rechargez la page et réessayez.",
      0,
    );
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new ApiError('Serveur injoignable. Vérifiez que le backend est bien démarré.', 0);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload !== null && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `Erreur ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export async function fetchFolders(): Promise<Folder[]> {
  const body = await request<{ folders: Folder[] }>(`${BASE}/folders`);
  return body.folders;
}

export function fetchMessages(query: MessageQuery): Promise<MessagesPage> {
  const params = new URLSearchParams();
  params.set('folder', query.folder);
  params.set('page', String(query.page));
  params.set('limit', String(query.limit));
  if (query.q) params.set('q', query.q);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.subject) params.set('subject', query.subject);
  if (query.unread) params.set('unread', 'true');
  if (query.flagged) params.set('flagged', 'true');
  if (query.attachments) params.set('attachments', 'true');
  if (query.sort) params.set('sort', query.sort);
  return request<MessagesPage>(`${BASE}/messages?${params.toString()}`);
}

export function fetchMessage(uid: number, folder: string): Promise<MessageDetail> {
  return request<MessageDetail>(`${BASE}/messages/${uid}?folder=${encodeURIComponent(folder)}`);
}

export function attachmentUrl(uid: number, index: number, folder: string): string {
  return `${BASE}/messages/${uid}/attachments/${index}?folder=${encodeURIComponent(folder)}`;
}

export interface GenerateReplyRequest {
  webhookUrl?: string;
  message: {
    uid: number;
    from: { name?: string; address?: string };
    to?: Array<{ name?: string; address?: string }>;
    subject: string;
    date: string;
    text?: string;
    html?: string | null;
  };
  tone?: string;
  instructions?: string;
}

export interface GenerateReplyResponse {
  success: boolean;
  reply: string;
  source: 'n8n' | 'preview' | 'fallback';
  warning?: string;
  error?: string;
}

export function generateReplyWithN8n(payload: GenerateReplyRequest): Promise<GenerateReplyResponse> {
  return request<GenerateReplyResponse>(`${BASE}/n8n/generate-reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonBody(payload),
  });
}

export interface SummarizeEmailResponse {
  success: boolean;
  summary: string;
  bullets?: string[];
  source: 'n8n' | 'preview' | 'fallback';
  error?: string;
}

export function summarizeEmailWithN8n(message: {
  uid: number;
  from: { name?: string; address?: string };
  to?: Array<{ name?: string; address?: string }>;
  subject: string;
  date: string;
  text?: string;
  html?: string | null;
}, webhookUrl?: string): Promise<SummarizeEmailResponse> {
  return request<SummarizeEmailResponse>(`${BASE}/n8n/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonBody({ message, webhookUrl }),
  });
}

export interface SendEmailRequest {
  sendWebhookUrl?: string;
  to: string;
  subject: string;
  body: string;
  messageUid?: number;
  folder?: string;
}

export interface SendEmailResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: unknown;
}

export function sendEmailWithN8n(payload: SendEmailRequest): Promise<SendEmailResponse> {
  return request<SendEmailResponse>(`${BASE}/n8n/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonBody(payload),
  });
}

/** Envoi direct par SMTP (prioritaire), fallback n8n géré par l'appelant. */
export function sendEmailWithSmtp(payload: SendEmailRequest): Promise<SendEmailResponse> {
  return request<SendEmailResponse>(`${BASE}/smtp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonBody(payload),
  });
}

/** Réponse directe par SMTP avec rattachement au fil. */
export function sendReplyWithSmtp(payload: SendEmailRequest): Promise<SendEmailResponse> {
  return request<SendEmailResponse>(`${BASE}/smtp/send-reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonBody(payload),
  });
}

/** Vérifie si le SMTP direct est disponible. */
export function getSmtpStatus(): Promise<{ available: boolean; working: boolean }> {
  return request<{ available: boolean; working: boolean }>(`${BASE}/smtp/status`);
}

export function cancelReplyWithN8n(messageUid?: number, webhookUrl?: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`${BASE}/n8n/cancel-reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonBody({ messageUid, webhookUrl }),
  }).catch(() => ({ success: false }));
}

export function getN8nConfig(): Promise<{
  hasDefaultWebhook: boolean;
  hasDefaultSendWebhook: boolean;
  defaultWebhookUrl: string | null;
  defaultSendWebhookUrl: string | null;
}> {
  return request<{
    hasDefaultWebhook: boolean;
    hasDefaultSendWebhook: boolean;
    defaultWebhookUrl: string | null;
    defaultSendWebhookUrl: string | null;
  }>(`${BASE}/n8n/config`);
}

export interface DetectMeetingRequest {
  webhookUrl?: string;
  message: {
    uid: number;
    from: { name?: string; address?: string };
    subject: string;
    date: string;
    text?: string;
    html?: string | null;
  };
}

export interface DetectMeetingResponse {
  success: boolean;
  isMeeting: boolean;
  confidence: number;
  reason: string;
  suggestedTitle?: string;
  /** Créneau proposé, AAAA-MM-JJ. */
  suggestedDate?: string;
  /** Créneau proposé, HH:MM. */
  suggestedTime?: string;
  source: 'n8n' | 'fallback';
}

export function detectMeetingWithAI(payload: DetectMeetingRequest): Promise<DetectMeetingResponse> {
  return request<DetectMeetingResponse>(`${BASE}/n8n/detect-meeting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonBody(payload),
  }).catch(() => ({
    success: false,
    isMeeting: false,
    confidence: 0,
    reason: 'Erreur réseau lors de la détection.',
    source: 'fallback' as const,
  }));
}

/** Réponse de extraction de tâches */
export interface ExtractTasksResponse {
  success: boolean;
  tasks: Array<{
    title: string;
    deadline?: string;
    priority?: 'low' | 'medium' | 'high';
    description?: string;
  }>;
  source: 'n8n' | 'fallback';
  error?: string;
}

/** Extrait les tâches et échéances d'un email via n8n */
export function extractTasksWithN8n(message: {
  uid: number;
  from: { name?: string; address?: string };
  subject: string;
  date: string;
  text?: string;
  html?: string | null;
}, webhookUrl?: string): Promise<ExtractTasksResponse> {
  return request<ExtractTasksResponse>(`${BASE}/n8n/extract-tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonBody({ message, webhookUrl }),
  });
}

/** Interface de réponse de traduction */
export interface TranslateEmailResponse {
  success: boolean;
  translated?: string;
  source: 'n8n' | 'fallback';
  error?: string;
}

/** Traduit un email via n8n */
export function translateEmailWithN8n(message: {
  uid: number;
  from: { name?: string; address?: string };
  subject: string;
  date: string;
  text?: string;
  html?: string | null;
}, webhookUrl?: string): Promise<TranslateEmailResponse> {
  return request<TranslateEmailResponse>(`${BASE}/n8n/translate-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonBody({ message, webhookUrl }),
  });
}

/** Interface de réponse de réécriture de brouillon */
export interface RewriteDraftResponse {
  success: boolean;
  rewritten?: string;
  source: 'n8n' | 'fallback';
  error?: string;
}

/** Réécrit un brouillon via n8n */
export function rewriteDraftWithN8n(body: string, tone?: string, instructions?: string, webhookUrl?: string): Promise<RewriteDraftResponse> {
  return request<RewriteDraftResponse>(`${BASE}/n8n/rewrite-draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: jsonBody({ body, tone, instructions, webhookUrl }),
  });
}

// ─────────────────────────────────────────────────────────────────
// Flags IMAP (lu/non lu, étoile)
// ─────────────────────────────────────────────────────────────────

export interface FlagResponse {
  success: boolean;
  action: string;
  count?: number;
}

/** Marque un message comme lu/non lu. */
export function markMessageRead(uid: number, folder: string, read: boolean): Promise<FlagResponse> {
  return request<FlagResponse>(`${BASE}/flags/${uid}/read?folder=${encodeURIComponent(folder)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: jsonBody({ value: read }),
  });
}

/** Marque un message comme suivi/non suivi (étoile). */
export function markMessageFlagged(uid: number, folder: string, flagged: boolean): Promise<FlagResponse> {
  return request<FlagResponse>(`${BASE}/flags/${uid}/flagged?folder=${encodeURIComponent(folder)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: jsonBody({ value: flagged }),
  });
}

/** Marque plusieurs messages comme lus/non lus. */
export function markMessagesRead(uids: number[], folder: string, read: boolean): Promise<FlagResponse> {
  return request<FlagResponse>(`${BASE}/flags/batch/read`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: jsonBody({ uids, folder, value: read }),
  }
  );
}

/** Marque plusieurs messages comme suivis/non suivis. */
export function markMessagesFlagged(uids: number[], folder: string, flagged: boolean): Promise<FlagResponse> {
  return request<FlagResponse>(`${BASE}/flags/batch/flagged`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: jsonBody({ uids, folder, value: flagged }),
  });
}

// ─────────────────────────────────────────────────────────────────
// Relances : messages envoyés restés sans réponse
// ─────────────────────────────────────────────────────────────────

export interface FollowupCandidate {
  uid: number;
  folder: string;
  to: Address;
  subject: string;
  date: string;
  daysSince: number;
}

export interface FollowupsResponse {
  days: number;
  sentFolder: string | null;
  candidates: FollowupCandidate[];
  warning?: string;
}

/** Récupère les messages envoyés sans réponse depuis au moins `days` jours. */
export function getFollowups(days = 3, limit = 10): Promise<FollowupsResponse> {
  return request<FollowupsResponse>(
    `${BASE}/followups?days=${encodeURIComponent(days)}&limit=${encodeURIComponent(limit)}`,
  );
}