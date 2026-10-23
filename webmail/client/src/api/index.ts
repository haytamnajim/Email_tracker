import type { Folder, MessageDetail, MessageQuery, MessagesPage } from '../types';

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
    body: JSON.stringify(payload),
  });
}

export interface SendEmailRequest {
  sendWebhookUrl?: string;
  to: string;
  subject: string;
  body: string;
  messageUid?: number;
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
    body: JSON.stringify(payload),
  });
}

export function cancelReplyWithN8n(messageUid?: number, webhookUrl?: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`${BASE}/n8n/cancel-reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageUid, webhookUrl }),
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

