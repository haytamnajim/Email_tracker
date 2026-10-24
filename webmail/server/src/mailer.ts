import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config, redact, resolveSmtp } from './config.ts';
import { MailError } from './errors.ts';

/**
 * Envoi direct par SMTP.
 *
 * Jusqu'ici l'envoi passait exclusivement par le webhook n8n, ce qui rendait
 * la fonctionnalité captive du tunnel ngrok : tunnel éteint => échec, souvent
 * sans message exploitable. SMTP parle directement au serveur Gmail avec les
 * identifiants déjà présents dans `.env`, donc l'envoi n'a plus besoin d'un
 * service tiers pour fonctionner.
 */

/** Délai maximum accordé à la transaction SMTP, en millisecondes. */
const SMTP_TIMEOUT_MS = 30_000;

let transporter: Transporter | null = null;
let transporterKey = '';

/** Transporteur mis en cache, recréé si les paramètres changent. */
function getTransporter(): Transporter {
  const smtp = resolveSmtp();
  if (!smtp) {
    throw new MailError(
      "Envoi direct indisponible : SMTP_HOST, SMTP_USER et SMTP_PASSWORD doivent être renseignés dans server/.env.",
      503,
    );
  }

  const key = `${smtp.host}:${smtp.port}:${smtp.user}`;
  if (transporter && transporterKey === key) return transporter;

  transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
    // Rien n'est journalisé : nodemailer pourrait y faire figurer le mot de passe.
    logger: false,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: SMTP_TIMEOUT_MS,
  });
  transporterKey = key;
  return transporter;
}

/** Vérifie que les identifiants SMTP répondent, sans jamais les afficher. */
export async function verifySmtp(): Promise<boolean> {
  if (!resolveSmtp()) return false;
  try {
    await getTransporter().verify();
    return true;
  } catch {
    return false;
  }
}

/** true si un envoi direct est possible avec la configuration actuelle. */
export function isSmtpAvailable(): boolean {
  return resolveSmtp() !== null;
}

export interface SendMailOptions {
  to: string[];
  subject: string;
  body: string;
  /** Message d'origine, pour rattacher la réponse au fil de discussion. */
  inReplyTo?: string;
  references?: string[];
}

export interface SentMail {
  messageId: string;
}

/**
 * Envoie un message. Lève `MailError` en cas d'échec, avec un message lisible
 * et débarrassé des identifiants.
 */
export async function sendMail(options: SendMailOptions): Promise<SentMail> {
  const smtp = resolveSmtp();
  if (!smtp) {
    throw new MailError("Aucun serveur SMTP n'est configuré dans server/.env.", 503);
  }

  try {
    const info = await getTransporter().sendMail({
      from: { name: 'Haytam Najim', address: smtp.user },
      to: options.to.join(', '),
      subject: options.subject,
      text: options.body,
      // En-têtes de fil : Gmail range la réponse sous le message d'origine.
      inReplyTo: options.inReplyTo,
      references: options.references,
    });
    return { messageId: info.messageId ?? '' };
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    // Un refus SMTP dit souvent « Invalid login » ou « Application-specific
    // password required » : ce sont les causes les plus fréquentes sur Gmail.
    const lowered = raw.toLowerCase();
    let hint = '';
    if (lowered.includes('auth') || lowered.includes('login') || lowered.includes('password')) {
      hint =
        " Vérifiez que IMAP_PASSWORD est un mot de passe d'application Gmail (16 caractères) et non votre mot de passe habituel.";
    } else if (lowered.includes('timeout') || lowered.includes('etimedout')) {
      hint = ' Le serveur SMTP n’a pas répondu à temps : vérifiez votre connexion.';
    }
    throw new MailError(`Échec de l’envoi SMTP : ${redact(raw)}.${hint}`, 502);
  }
}

/**
 * Convertit un champ `to` libre (« a@x, b@y » ou « a@x; b@y ») en liste propre.
 * Renvoie `null` si aucune adresse valide n'est trouvée.
 */
export function parseRecipients(raw: string): string[] | null {
  const parts = raw
    .split(/[,;\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  // Validation souple : on refuse la donnée telle quelle plutôt que de la
  // laisser atteindre Gmail, qui renverrait une erreur plus obscure.
  const valid = parts.filter((entry) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(entry));
  return valid.length > 0 ? valid : null;
}

/** Sujet de réponse : on évite d'empiler « Re: Re: Re: ». */
export function buildReplySubject(subject: string): string {
  const clean = (subject || '').trim();
  if (/^re:/i.test(clean)) return clean;
  return clean ? `Re: ${clean}` : 'Re:';
}

/** Email expéditeur affiché dans les messages sortants. */
export const SENDER_NAME = 'Haytam Najim';
export const SENDER_ADDRESS = config.smtp.user || config.imap.user;
