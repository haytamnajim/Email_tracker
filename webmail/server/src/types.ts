/** Types partagés côté serveur (miroir de client/src/types). */

export interface Address {
  name?: string;
  address?: string;
}

export interface Folder {
  /** Identifiant IMAP du dossier (chemin exact) */
  id: string;
  /** Nom brut du dossier */
  name: string;
  /** Libellé français */
  label: string;
  /** Nombre de messages non lus */
  unread: number;
  /** Nombre total de messages */
  total: number;
}

export interface AttachmentMeta {
  /** Index de la pièce jointe dans le message (0-based) */
  index: number;
  filename: string;
  contentType: string;
  size: number;
}

export interface MessageSummary {
  uid: number;
  folder: string;
  from: Address;
  subject: string;
  /** Aperçu du texte brut, 120 caractères maximum */
  preview: string;
  /** Date ISO 8601 */
  date: string;
  isRead: boolean;
  isFlagged: boolean;
  hasAttachments: boolean;
}

export interface MessageDetail {
  uid: number;
  folder: string;
  from: Address;
  to: Address[];
  cc: Address[];
  subject: string;
  date: string;
  isRead: boolean;
  isFlagged: boolean;
  text: string;
  /** Corps HTML non assaini : l'assainissement se fait côté client (DOMPurify) */
  html: string | null;
  attachments: AttachmentMeta[];
}

export interface MessageQuery {
  folder: string;
  page: number;
  limit: number;
  q?: string;
  unread?: boolean;
  flagged?: boolean;
  attachments?: boolean;
  sort?: 'desc' | 'asc';
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface AttachmentFile {
  filename: string;
  contentType: string;
  content: Buffer;
}
