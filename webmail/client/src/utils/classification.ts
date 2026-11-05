import type { MessageSummary } from '../types';

/**
 * Classement local et instantané des emails.
 *
 * Aucune donnée n'est envoyée à un service externe et aucun libellé IMAP n'est
 * modifié : le résultat sert uniquement à l'affichage et aux filtres. Les
 * règles sont volontairement déterministes pour rester rapides sur une liste.
 */
export type EmailClass = 'urgent' | 'meeting' | 'invoice' | 'action' | 'newsletter' | 'normal';

export interface EmailClassification {
  id: EmailClass;
  label: string;
  /** Classes Tailwind du badge. */
  badgeClass: string;
  reason: string;
}

const URGENT_RE =
  /\b(urgent|asap|immediat|immediate|au plus vite|des que possible|critique|bloquant)\b/;
const MEETING_RE =
  /\b(reunion|rendez[- ]?vous|rdv|meeting|visio|visioconference|entretien|call|creneau)\b/;
const INVOICE_RE =
  /\b(facture|devis|paiement|echeance|montant|commande|recu|invoice|payment|receipt)\b/;
const ACTION_RE =
  /\b(merci de|pouvez[- ]vous|pourriez[- ]vous|action requise|a valider|valider|confirmer|repondre avant|avant le|deadline|d'ici|il faut|besoin de)\b/;
const NEWSLETTER_RE =
  /\b(newsletter|desabonner|unsubscribe|promotion|soldes|offre|webinar|black friday|cyber monday|reduction|marketing)\b/;
const NEWSLETTER_SENDER_RE = /(newsletter|no-?reply|marketing|promo)/;

const CLASSIFICATIONS: Record<EmailClass, Omit<EmailClassification, 'id'>> = {
  urgent: {
    label: 'Urgent',
    badgeClass:
      'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300',
    reason: "Un mot-clé d'urgence est présent dans l'email.",
  },
  meeting: {
    label: 'Réunion',
    badgeClass:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300',
    reason: 'Cet email propose ou confirme un rendez-vous.',
  },
  invoice: {
    label: 'Facture',
    badgeClass:
      'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300',
    reason: 'Cet email concerne une facture, un devis ou une commande.',
  },
  action: {
    label: 'Action',
    badgeClass:
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300',
    reason: 'Une réponse ou une validation est attendue de votre part.',
  },
  newsletter: {
    label: 'Newsletter',
    badgeClass:
      'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
    reason: 'Email promotionnel ou newsletter.',
  },
  normal: {
    label: '',
    badgeClass: '',
    reason: 'Aucun signal particulier.',
  },
};

/** Retire les accents pour que les regex restent simples et fiables. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function classifyEmail(message: MessageSummary): EmailClassification {
  const subject = normalize(message.subject ?? '');
  const preview = normalize(message.preview ?? '');
  const sender = normalize(
    `${message.from?.name ?? ''} ${message.from?.address ?? ''}`,
  );
  const haystack = `${sender} ${subject} ${preview}`;

  let id: EmailClass = 'normal';
  if (URGENT_RE.test(haystack)) {
    id = 'urgent';
  } else if (MEETING_RE.test(haystack)) {
    id = 'meeting';
  } else if (INVOICE_RE.test(haystack)) {
    id = 'invoice';
  } else if (ACTION_RE.test(haystack)) {
    id = 'action';
  } else if (NEWSLETTER_RE.test(subject) || NEWSLETTER_SENDER_RE.test(sender)) {
    id = 'newsletter';
  } else if (NEWSLETTER_RE.test(preview)) {
    id = 'newsletter';
  }

  return { id, ...CLASSIFICATIONS[id] };
}
