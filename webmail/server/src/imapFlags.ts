import { ImapFlow } from 'imapflow';
import { assertImapConfig, config, redact } from './config.ts';
import { MailError } from './errors.ts';

/**
 * Opérations d'écriture IMAP ( drapeaux \Seen, \Flagged ).
 *
 * La connexion principale est en `readOnly: true` pour la sécurité.
 * Ici on ouvre une **connexion dédiée en écriture** seulement quand l'utilisateur
 * fait une action volontaire (clic sur "Marquer comme lu", étoile, etc.).
 * Ainsi : lecture = lecture seule, écriture = explicite.
 */

function createWriteClient(): ImapFlow {
  const imap = new ImapFlow({
    host: config.imap.host,
    port: config.imap.port,
    secure: config.imap.secure,
    auth: { user: config.imap.user, pass: config.imap.pass },
    logger: false,
    disableAutoIdle: true,
    connectionTimeout: 15_000,
    socketTimeout: 30_000,
  });
  return imap;
}

async function connectWrite(): Promise<ImapFlow> {
  assertImapConfig();
  const imap = createWriteClient();
  try {
    await imap.connect();
  } catch (error) {
    imap.close();
    throw error;
  }
  return imap;
}

/** Applique ou retire un drapeau sur un message (UID) dans un dossier. */
async function setFlagOnUid(
  uid: number,
  folder: string,
  flag: '\\Seen' | '\\Flagged',
  value: boolean,
): Promise<void> {
  const imap = await connectWrite();
  try {
    await imap.mailboxOpen(folder, { readOnly: false });
    // imapflow attend (number | string)[], string[] pour les flags
    const uids = [uid];
    const flags = [flag];
    if (value) {
      await imap.messageFlagsAdd(uids, flags);
    } else {
      await imap.messageFlagsRemove(uids, flags);
    }
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    throw new MailError(`Impossible de modifier le drapeau ${flag} : ${redact(raw)}`, 502);
  } finally {
    try { imap.close(); } catch { /* ignore */ }
  }
}

/** Marque un message comme lu (\\Seen). */
export async function markAsRead(uid: number, folder: string): Promise<void> {
  return setFlagOnUid(uid, folder, '\\Seen', true);
}

/** Marque un message comme non lu (retire \\Seen). */
export async function markAsUnread(uid: number, folder: string): Promise<void> {
  return setFlagOnUid(uid, folder, '\\Seen', false);
}

/** Marque/démarque comme suivi (étoile / \\Flagged). */
export async function setFlagged(uid: number, folder: string, flagged: boolean): Promise<void> {
  return setFlagOnUid(uid, folder, '\\Flagged', flagged);
}

/** Opérations par lot : même drapeau sur plusieurs UIDs. */
export async function setFlagOnUids(
  uids: number[],
  folder: string,
  flag: '\\Seen' | '\\Flagged',
  value: boolean,
): Promise<void> {
  if (uids.length === 0) return;
  const imap = await connectWrite();
  try {
    await imap.mailboxOpen(folder, { readOnly: false });
    const flags = [flag];
    if (value) {
      await imap.messageFlagsAdd(uids, flags);
    } else {
      await imap.messageFlagsRemove(uids, flags);
    }
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    throw new MailError(`Impossible de modifier le drapeau ${flag} sur ${uids.length} messages : ${redact(raw)}`, 502);
  } finally {
    try { imap.close(); } catch { /* ignore */ }
  }
}