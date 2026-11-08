import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, redact } from './config.ts';
import { MailError } from './errors.ts';
import { moveMessagesWithMetadata, releaseSnoozedMessage } from './imapFlags.ts';

/**
 * Mise en attente réelle : le message est déplacé dans un dossier IMAP dédié
 * (« En attente » par défaut) puis replacé dans son dossier d'origine à
 * l'échéance. Le planning est persisté dans `server/data/snoozes.json`.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(here, '..', 'data');
const STORE_PATH = path.join(DATA_DIR, 'snoozes.json');

export interface SnoozeEntry {
  id: string;
  /** UID du message dans son dossier d'origine. */
  sourceUid: number;
  /** UID du message dans le dossier de mise en attente (0 si inconnu). */
  destinationUid: number;
  /** Message-ID, secours quand le serveur IMAP ne fournit pas UIDPLUS. */
  messageId?: string;
  originalFolder: string;
  dueAt: string;
  createdAt: string;
}

let schedulerStarted = false;
let releaseRunning = false;

function isEntry(value: unknown): value is SnoozeEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<SnoozeEntry>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.sourceUid === 'number' &&
    typeof entry.destinationUid === 'number' &&
    typeof entry.originalFolder === 'string' &&
    typeof entry.dueAt === 'string' &&
    (!entry.messageId || typeof entry.messageId === 'string')
  );
}

function readStore(): SnoozeEntry[] {
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

function writeStore(entries: SnoozeEntry[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temporary = `${STORE_PATH}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(entries, null, 2), 'utf8');
  fs.renameSync(temporary, STORE_PATH);
}

export function listSnoozes(): SnoozeEntry[] {
  return readStore();
}

function addSnoozes(entries: SnoozeEntry[]): void {
  if (entries.length === 0) return;
  const identities = new Set(entries.map((entry) => `${entry.originalFolder}:${entry.sourceUid}`));
  const current = readStore().filter(
    (entry) => !identities.has(`${entry.originalFolder}:${entry.sourceUid}`),
  );
  writeStore([...current, ...entries]);
}

function removeSnooze(id: string): void {
  writeStore(readStore().filter((entry) => entry.id !== id));
}

function findSnoozeBySourceUid(sourceUid: number): SnoozeEntry | undefined {
  return readStore().find((entry) => entry.sourceUid === sourceUid);
}

/** Déplace les messages vers le dossier de mise en attente et les planifie. */
export async function scheduleSnoozes(
  uids: number[],
  from: string,
  until: string,
): Promise<number> {
  const due = new Date(until);
  if (Number.isNaN(due.getTime())) {
    throw new MailError("Date de mise en attente invalide.", 400);
  }

  const metadata = await moveMessagesWithMetadata(uids, from, config.snoozeFolder);
  const createdAt = new Date().toISOString();
  const entries: SnoozeEntry[] = uids.map((sourceUid) => ({
    id: `${sourceUid}-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    sourceUid,
    destinationUid: metadata.uidMap.get(sourceUid) ?? 0,
    ...(metadata.messageIds.get(sourceUid)
      ? { messageId: metadata.messageIds.get(sourceUid) }
      : {}),
    originalFolder: from,
    dueAt: due.toISOString(),
    createdAt,
  }));

  addSnoozes(entries);
  return entries.length;
}

/** Annule une mise en attente et replace le message dans son dossier d'origine. */
export async function cancelSnooze(sourceUid: number): Promise<void> {
  const entry = findSnoozeBySourceUid(sourceUid);
  if (!entry) {
    throw new MailError('Ce message n’est pas dans la file de mise en attente.', 404);
  }
  await releaseSnoozedMessage(
    entry.destinationUid,
    entry.messageId,
    config.snoozeFolder,
    entry.originalFolder,
  );
  removeSnooze(entry.id);
}

async function releaseEntry(entry: SnoozeEntry): Promise<void> {
  try {
    await releaseSnoozedMessage(
      entry.destinationUid,
      entry.messageId,
      config.snoozeFolder,
      entry.originalFolder,
    );
  } catch (error) {
    // Le dossier d'origine a pu être supprimé : on replie sur la boîte de réception.
    if (entry.originalFolder === 'INBOX') throw error;
    await releaseSnoozedMessage(
      entry.destinationUid,
      entry.messageId,
      config.snoozeFolder,
      'INBOX',
    );
  }
}

/** Replace tous les messages dont l'échéance est atteinte. */
export async function releaseDueSnoozes(): Promise<number> {
  if (releaseRunning) return 0;
  releaseRunning = true;

  try {
    const now = Date.now();
    const due = readStore().filter((entry) => {
      const timestamp = Date.parse(entry.dueAt);
      return Number.isFinite(timestamp) && timestamp <= now;
    });

    let released = 0;
    for (const entry of due) {
      try {
        await releaseEntry(entry);
        removeSnooze(entry.id);
        released += 1;
      } catch (error) {
        const raw = error instanceof Error ? error.message : String(error);
        console.error(`[mise en attente] sortie impossible pour l'UID ${entry.sourceUid} : ${redact(raw)}`);
      }
    }
    return released;
  } finally {
    releaseRunning = false;
  }
}

/**
 * Filet de sécurité local : même si n8n n'est pas démarré, les messages en
 * attente reviennent à l'échéance. n8n peut aussi appeler /api/snooze/release.
 */
export function startSnoozeScheduler(): void {
  if (schedulerStarted || config.demoMode) return;
  schedulerStarted = true;

  const tick = () => {
    void releaseDueSnoozes().then((released) => {
      if (released > 0) {
        console.log(`[mise en attente] ${released} message(s) replacé(s).`);
      }
    });
  };

  tick();
  const timer = setInterval(tick, 60_000);
  timer.unref();
}
