import type { MessageSummary } from '../types';
import type { CategoryType } from '../components/CategoryTabs';

/**
 * Catégorisation heuristique côté client, façon Gmail.
 *
 * IMAP ne fournit pas les catégories Gmail (Principale / Promotions / …) :
 * on classe donc chaque message avec des mots-clés réels présents dans les
 * adresses et objets typiques. L'ordre des règles est significant.
 */

const FORUM_RE =
  /\b(forum|mailing[- ]?lists?|groupes?|googlegroups|communaut[ée]s?|discussion[s]?)\b/i;

const SOCIAL_RE =
  /\b(facebook|linkedin|instagram|twitter|x\.com|tiktok|snapchat|pinterest|discord|whatsapp|telegram|threads|mastodon|youtube)\b/i;

const PROMO_RE =
  /\b(promo[tion]*s?|offres?|soldes|d[ée]coupe|réductions?|reductions?|deal[s]?|newsletter|black\s*friday|cyber\s*monday|catalogue|boutique|panier|unsubscribe|se\s*d[ée]sinscrire|desinscrire|code\s*promo)\b|-?\d{1,3}\s?%/

const UPDATE_RE =
  /\b(noreply|no[- ]?reply|notifications?|alertes?|s[ée]curit[ée]|securite|confirmations?|github|gitlab|vercel|n8n|facture[s]?|exp[ée]dition[s]?|suivi\s*de\s*commande|otp|code[- ]?verification|v[ée]rification|verification|receipt|order\s*confirmation)\b/i;

/**
 * Classe un message dans une catégorie Gmail.
 * Par défaut « primary » (le classement négatif reste la règle Gmail).
 */
export function categorizeMessage(message: MessageSummary): CategoryType {
  const haystack = `${message.from?.name ?? ''} ${message.from?.address ?? ''} ${
    message.subject ?? ''
  } ${message.preview ?? ''}`;

  if (FORUM_RE.test(haystack)) return 'forums';
  if (SOCIAL_RE.test(haystack)) return 'social';
  if (PROMO_RE.test(haystack)) return 'promotions';
  if (UPDATE_RE.test(haystack)) return 'updates';
  return 'primary';
}

/** Compte les messages par catégorie (pour les badges des onglets). */
export function countByCategory(
  messages: MessageSummary[],
): Record<CategoryType, number> {
  const counts: Record<CategoryType, number> = {
    primary: 0,
    promotions: 0,
    social: 0,
    updates: 0,
    forums: 0,
  };
  for (const message of messages) {
    counts[categorizeMessage(message)] += 1;
  }
  return counts;
}
