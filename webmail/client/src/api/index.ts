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

async function request<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path);
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
