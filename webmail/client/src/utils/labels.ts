/** Étiquettes proposées dans le webmail, stockées comme keywords IMAP. */
export const MESSAGE_LABELS = [
  { id: 'WebmailTravail', label: 'Travail' },
  { id: 'WebmailPersonnel', label: 'Personnel' },
  { id: 'WebmailUrgent', label: 'Urgent' },
  { id: 'WebmailFacture', label: 'Facture' },
] as const;

export type MessageLabel = (typeof MESSAGE_LABELS)[number];
