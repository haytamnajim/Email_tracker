/** Types partagés côté client (miroir de server/src/types.ts). */

export interface Address {
  name?: string;
  address?: string;
}

export interface Folder {
  /** Identifiant IMAP du dossier (chemin exact, ex. « INBOX ») */
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

export interface Attachment {
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
  /** Corps HTML non assaini : assaini avec DOMPurify avant affichage */
  html: string | null;
  attachments: Attachment[];
}

export interface MessagesPage {
  items: MessageSummary[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface MessageQuery {
  folder: string;
  page: number;
  limit: number;
  q?: string;
  /**
   * Filtres avancés structurés. Ils partent comme champs distincts : les
   * concaténer dans `q` (ce qui était fait) produisait une chaîne que le
   * serveur passait en recherche TEXT, d'où « aucun résultat » systématique.
   */
  from?: string;
  to?: string;
  subject?: string;
  unread?: boolean;
  flagged?: boolean;
  attachments?: boolean;
  sort?: 'desc' | 'asc';
}

/** Valeurs du panneau « Filtres avancés » de l'en-tête. */
export interface AdvancedFilters {
  from: string;
  to: string;
  subject: string;
  hasAttachment: boolean;
}

export const EMPTY_ADVANCED_FILTERS: AdvancedFilters = {
  from: '',
  to: '',
  subject: '',
  hasAttachment: false,
};

export type Theme = 'light' | 'dark';
