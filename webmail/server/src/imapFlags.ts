import { ImapFlow } from 'imapflow';
import { assertImapConfig, config, redact } from './config.ts';
import { MailError } from './errors.ts';

/**
 * Opérations d'écriture IMAP (drapeaux, déplacements, étiquettes).
 *
 * La connexion principale est en `readOnly: true` pour la sécurité.
 * Ici on ouvre une **connexion dédiée en écriture** seulement quand l'utilisateur
 * fait une action volontaire (archiver, supprimer, déplacer, étiqueter, etc.).
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

function sanitizeUids(uids: number[]): number[] {
  const unique = Array.from(new Set(uids));
  if (unique.length === 0) {
    throw new MailError('Aucun message sélectionné.', 400);
  }
  if (unique.length > 500) {
    throw new MailError('Trop de messages sélectionnés (500 maximum).', 400);
  }
  if (unique.some((uid) => !Number.isInteger(uid) || uid < 1)) {
    throw new MailError('Identifiant de message invalide.', 400);
  }
  return unique;
}

function assertMoveFolders(from: string, to: string): void {
  if (!from.trim() || !to.trim()) {
    throw new MailError('Dossier source ou destination manquant.', 400);
  }
  if (from === to) {
    throw new MailError('Le message est déjà dans ce dossier.', 400);
  }
}

function assertKeyword(keyword: string): void {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(keyword)) {
    throw new MailError('Étiquette invalide.', 400);
  }
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

export interface MoveMetadata {
  /** UID source → UID dans le dossier de destination (si UIDPLUS est disponible). */
  uidMap: Map<number, number>;
  /** Message-ID des messages déplacés, utilisé pour les retrouver sans UIDPLUS. */
  messageIds: Map<number, string>;
}

async function moveOnConnection(
  imap: ImapFlow,
  uids: number[],
  from: string,
  to: string,
  captureMetadata: boolean,
): Promise<MoveMetadata> {
  await imap.mailboxOpen(from, { readOnly: false });

  const messageIds = new Map<number, string>();
  if (captureMetadata) {
    const fetched = await imap.fetchAll(
      uids,
      { uid: true, envelope: true },
      { uid: true },
    );
    for (const message of fetched) {
      if (message.uid && message.envelope?.messageId) {
        messageIds.set(message.uid, message.envelope.messageId);
      }
    }
  }

  const result = await imap.messageMove(uids, to, { uid: true });
  if (result === false) {
    throw new MailError('Le serveur IMAP a refusé le déplacement.', 502);
  }
  return { uidMap: result.uidMap ?? new Map(), messageIds };
}

/** Déplace plusieurs messages (action utilisateur explicite). */
export async function moveMessages(
  uids: number[],
  from: string,
  to: string,
): Promise<number> {
  const safeUids = sanitizeUids(uids);
  assertMoveFolders(from, to);

  const imap = await connectWrite();
  try {
    await moveOnConnection(imap, safeUids, from, to, false);
    return safeUids.length;
  } catch (error) {
    if (error instanceof MailError) throw error;
    const raw = error instanceof Error ? error.message : String(error);
    throw new MailError(`Impossible de déplacer les messages : ${redact(raw)}`, 502);
  } finally {
    try { imap.close(); } catch { /* ignore */ }
  }
}

/**
 * Déplace des messages et conserve de quoi les retrouver ensuite.
 * Utilisé par la mise en attente : le dossier de report est créé si nécessaire.
 */
export async function moveMessagesWithMetadata(
  uids: number[],
  from: string,
  to: string,
): Promise<MoveMetadata> {
  const safeUids = sanitizeUids(uids);
  assertMoveFolders(from, to);

  const imap = await connectWrite();
  try {
    // Créer le dossier de report avant d'ouvrir la boîte source.
    const listed = await imap.list();
    if (!listed.some((entry) => entry.path === to)) {
      await imap.mailboxCreate(to);
    }
    return await moveOnConnection(imap, safeUids, from, to, true);
  } catch (error) {
    if (error instanceof MailError) throw error;
    const raw = error instanceof Error ? error.message : String(error);
    throw new MailError(`Impossible de mettre les messages en attente : ${redact(raw)}`, 502);
  } finally {
    try { imap.close(); } catch { /* ignore */ }
  }
}

/** Déplace un message d'un dossier vers un autre. */
export async function moveMessage(uid: number, from: string, to: string): Promise<void> {
  await moveMessages([uid], from, to);
}

/**
 * Sort un message du dossier de mise en attente.
 * Le Message-ID sert de secours quand le serveur ne fournit pas UIDPLUS.
 */
export async function releaseSnoozedMessage(
  destinationUid: number,
  messageId: string | undefined,
  snoozeFolder: string,
  targetFolder: string,
): Promise<void> {
  const imap = await connectWrite();
  try {
    await imap.mailboxOpen(snoozeFolder, { readOnly: false });

    let sourceUid: number | null = null;
    if (messageId) {
      const found = await imap.search(
        { header: { 'Message-ID': messageId } },
        { uid: true },
      );
      if (Array.isArray(found) && found.length > 0) {
        sourceUid = found[found.length - 1];
      }
    }
    if (!sourceUid && destinationUid > 0) sourceUid = destinationUid;
    if (!sourceUid) {
      throw new MailError('Message introuvable dans le dossier de mise en attente.', 404);
    }

    const result = await imap.messageMove([sourceUid], targetFolder, { uid: true });
    if (result === false) {
      throw new MailError('Le serveur IMAP a refusé la sortie de mise en attente.', 502);
    }
  } catch (error) {
    if (error instanceof MailError) throw error;
    const raw = error instanceof Error ? error.message : String(error);
    throw new MailError(`Impossible de sortir le message de la mise en attente : ${redact(raw)}`, 502);
  } finally {
    try { imap.close(); } catch { /* ignore */ }
  }
}

/** Ajoute ou retire une étiquette IMAP (keyword) sur plusieurs messages. */
export async function setKeywordOnUids(
  uids: number[],
  folder: string,
  keyword: string,
  value: boolean,
): Promise<number> {
  const safeUids = sanitizeUids(uids);
  assertKeyword(keyword);

  const imap = await connectWrite();
  try {
    await imap.mailboxOpen(folder, { readOnly: false });
    const flags = [keyword];
    if (value) {
      await imap.messageFlagsAdd(safeUids, flags);
    } else {
      await imap.messageFlagsRemove(safeUids, flags);
    }
    return safeUids.length;
  } catch (error) {
    if (error instanceof MailError) throw error;
    const raw = error instanceof Error ? error.message : String(error);
    throw new MailError(`Impossible de modifier l'étiquette : ${redact(raw)}`, 502);
  } finally {
    try { imap.close(); } catch { /* ignore */ }
  }
}

/** Ajoute ou retire une étiquette IMAP (keyword) sur un message. */
export async function setKeyword(
  uid: number,
  folder: string,
  keyword: string,
  value: boolean,
): Promise<void> {
  await setKeywordOnUids([uid], folder, keyword, value);
}

/** Opérations par lot : même drapeau sur plusieurs UIDs. */
export async function setFlagOnUids(
  uids: number[],
  folder: string,
  flag: '\\Seen' | '\\Flagged',
  value: boolean,
): Promise<void> {
  const safeUids = sanitizeUids(uids);
  const imap = await connectWrite();
  try {
    await imap.mailboxOpen(folder, { readOnly: false });
    const flags = [flag];
    if (value) {
      await imap.messageFlagsAdd(safeUids, flags);
    } else {
      await imap.messageFlagsRemove(safeUids, flags);
    }
  } catch (error) {
    if (error instanceof MailError) throw error;
    const raw = error instanceof Error ? error.message : String(error);
    throw new MailError(`Impossible de modifier le drapeau ${flag} sur ${safeUids.length} messages : ${redact(raw)}`, 502);
  } finally {
    try { imap.close(); } catch { /* ignore */ }
  }
}
