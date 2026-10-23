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
  imap: {
    host: process.env.IMAP_HOST ?? '',
    port: Number(process.env.IMAP_PORT ?? 993),
    secure: (process.env.IMAP_SECURE ?? 'true').toLowerCase() === 'true',
    user: process.env.IMAP_USER ?? '',
    pass: process.env.IMAP_PASSWORD ?? '',
  },
};

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
  if (config.imap.pass) out = out.split(config.imap.pass).join('***');
  if (config.imap.user) out = out.split(config.imap.user).join('***');
  return out;
}
