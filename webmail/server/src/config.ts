import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Le fichier .env est lu à l'emplacement exact du serveur : aucune dépendance au cwd.
const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(here, '..', '.env') });

export const config = {
  /** true = 30 emails factices, aucune connexion IMAP (valeur par défaut : sécurité) */
  demoMode: (process.env.DEMO_MODE ?? 'true').toLowerCase() === 'true',
  port: Number(process.env.PORT ?? 3001),
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL ?? '',
  n8nSendWebhookUrl: process.env.N8N_SEND_WEBHOOK_URL ?? '',
  n8nDetectMeetingWebhookUrl: process.env.N8N_DETECT_MEETING_WEBHOOK_URL ?? '',
  imap: {
    host: process.env.IMAP_HOST ?? '',
    port: Number(process.env.IMAP_PORT ?? 993),
    secure: (process.env.IMAP_SECURE ?? 'true').toLowerCase() === 'true',
    user: process.env.IMAP_USER ?? '',
    pass: process.env.IMAP_PASSWORD ?? '',
  },
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE.toLowerCase() === 'true'
      : undefined,
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASSWORD ?? '',
  },
};

/**
 * Paramètres SMTP effectifs, ou `null` si l'envoi direct n'est pas possible.
 *
 * Le mot de passe d'application Gmail (16 caractères) fait foi pour IMAP et
 * pour SMTP : lorsque l'hôte IMAP est Gmail, l'hôte SMTP et les identifiants
 * sont déduits automatiquement, donc aucun ajout dans `.env` n'est nécessaire.
 */
export function resolveSmtp(): SmtpSettings | null {
  const imapHost = config.imap.host.trim().toLowerCase();
  const isGmail = imapHost === 'imap.gmail.com' || imapHost === 'imap.googlemail.com';

  const host = config.smtp.host.trim() || (isGmail ? 'smtp.gmail.com' : '');
  const user = config.smtp.user.trim() || config.imap.user;
  const pass = config.smtp.pass || config.imap.pass;
  // Gmail n'accepte l'authentification que sur le port 465 (SMTPS).
  const port = config.smtp.port ?? (isGmail ? 465 : 587);
  const secure = config.smtp.secure ?? port === 465;

  if (!host || !user || !pass) return null;
  return { host, port, secure, user, pass };
}

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

/** Vérifie la configuration IMAP sans jamais afficher les valeurs. */
export function assertImapConfig(): void {
  const missing: string[] = [];
  if (!config.imap.host) missing.push('IMAP_HOST');
  if (!config.imap.user) missing.push('IMAP_USER');
  if (!config.imap.pass) missing.push('IMAP_PASSWORD');
  if (missing.length > 0) {
    throw new Error(
      `Configuration IMAP incomplète dans server/.env : ${missing.join(', ')} manquant(s)`,
    );
  }
}

/** Retire toute trace d'identifiants d'un message d'erreur avant journalisation/réponse. */
export function redact(message: string): string {
  let out = message;
  // SMTP en premier : son mot de passe peut différer de celui d'IMAP.
  const secrets = [
    config.smtp.pass,
    config.imap.pass,
    config.smtp.user,
    config.imap.user,
  ].filter((value): value is string => Boolean(value));
  // Du plus long au plus court : un secret inclus dans un autre est masqué en entier.
  secrets.sort((a, b) => b.length - a.length);
  for (const secret of secrets) out = out.split(secret).join('***');
  return out;
}
