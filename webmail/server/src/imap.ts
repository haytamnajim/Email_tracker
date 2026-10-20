import { ImapFlow } from 'imapflow';
import type { MessageAddressObject, MessageStructureObject, SearchObject } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { AddressObject } from 'mailparser';
import { assertImapConfig, config, redact } from './config.ts';
import { MailError } from './errors.ts';
import { folderLabel, folderSortValue, makePreview } from './format.ts';
import type {
  Address,
  AttachmentFile,
  AttachmentMeta,
  Folder,
  MessageDetail,
  MessageQuery,
  MessageSummary,
  Paginated,
} from './types.ts';

/**
 * Accès IMAP en LECTURE SEULE.
 * Aucune écriture n'est possible : la boîte est toujours ouverte avec readOnly: true
 * et aucun appel de suppression / déplacement / changement de drapeau n'est utilisé.
 */

/** Nombre maximum de messages analysés pour une liste (protège les très grosses boîtes). */
const MAX_SCANNED = 3000;

let client: ImapFlow | null = null;
let isConnected = false;
let pendingConnection: Promise<ImapFlow> | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createClient(): ImapFlow {
  const imap = new ImapFlow({
    host: config.imap.host,
    port: config.imap.port,
    secure: config.imap.secure,
    auth: { user: config.imap.user, pass: config.imap.pass },
    // Aucun journal : évite tout risque d'afficher les identifiants.
    logger: false,
    disableAutoIdle: true,
    connectionTimeout: 15_000,
    socketTimeout: 30_000,
  });
  const drop = () => {
    if (client === imap) {
      client = null;
      isConnected = false;
    }
  };
  imap.on('error', drop);
  imap.on('close', drop);
  return imap;
}

async function connectOnce(): Promise<ImapFlow> {
  assertImapConfig();
  const imap = createClient();
  try {
    await imap.connect();
  } catch (error) {
    imap.close();
    throw error;
  }
  return imap;
}

/** Connexion avec une nouvelle tentative automatique en cas d'échec. */
async function connectWithRetry(): Promise<ImapFlow> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await connectOnce();
    } catch (error) {
      lastError = error;
      if (attempt === 1) await sleep(600);
    }
  }
  throw lastError;
}

async function getClient(): Promise<ImapFlow> {
  if (client && isConnected) return client;
  if (!pendingConnection) {
    pendingConnection = connectWithRetry()
      .then((imap) => {
        client = imap;
        isConnected = true;
        return imap;
      })
      .finally(() => {
        pendingConnection = null;
      });
  }
  return pendingConnection;
}

/** Convertit toute erreur technique en erreur HTTP sans jamais exposer les identifiants. */
function toMailError(error: unknown): MailError {
  if (error instanceof MailError) return error;
  const raw = error instanceof Error ? error.message : String(error);
  return new MailError(
    `Impossible de joindre le serveur IMAP : ${redact(raw)}. Vérifiez server/.env puis réessayez.`,
    502,
  );
}

/** Connexion persistante réutilisée (pour lire un message précis). */
async function run<T>(fn: (imap: ImapFlow) => Promise<T>): Promise<T> {
  try {
    const imap = await getClient();
    return await fn(imap);
  } catch (error) {
    throw toMailError(error);
  }
}

/**
 * Connexion FRAÎCHE à chaque appel (pour lister les messages).
 * Garantit que les nouveaux emails arrivés sont toujours visibles.
 */
async function runFresh<T>(fn: (imap: ImapFlow) => Promise<T>): Promise<T> {
  const imap = createClient();
  try {
    assertImapConfig();
    await imap.connect();
    const result = await fn(imap);
    return result;
  } catch (error) {
    throw toMailError(error);
  } finally {
    try { imap.close(); } catch { /* ignore */ }
  }
}

function flattenAddresses(input?: AddressObject | AddressObject[]): Address[] {
  if (!input) return [];
  const groups = Array.isArray(input) ? input : [input];
  const result: Address[] = [];
  for (const group of groups) {
    for (const value of group.value ?? []) {
      if (value.group && value.group.length > 0) {
        for (const member of value.group) {
          result.push({ name: member.name, address: member.address });
        }
      } else {
        result.push({ name: value.name, address: value.address });
      }
    }
  }
  return result.filter((entry) => Boolean(entry.address || entry.name));
}

function firstAddress(input?: AddressObject | AddressObject[]): Address {
  return flattenAddresses(input)[0] ?? {};
}

/** Convertit les adresses du format ENVELOPE imapflow (déjà désencodées) en type local. */
function envelopeAddress(list?: MessageAddressObject[]): Address {
  const first = list?.[0];
  if (!first) return {};
  return { name: first.name || undefined, address: first.address || undefined };
}

/** Détecte la présence d'une pièce jointe dans une structure BODYSTRUCTURE. */
function structureHasAttachment(node: MessageStructureObject): boolean {
  const disposition = (node.disposition ?? '').toLowerCase();
  if (disposition === 'attachment') return true;
  const filename = node.dispositionParameters?.filename ?? node.parameters?.name;
  const isTextual = (node.type ?? '').toLowerCase().startsWith('text/');
  if (filename && !isTextual) return true;
  return (node.childNodes ?? []).some(structureHasAttachment);
}

interface MessageMeta {
  uid: number;
  date: string;
  from: Address;
  subject: string;
  isRead: boolean;
  isFlagged: boolean;
  hasAttachments: boolean;
}

function metaFromFlags(
  uid: number,
  date: Date | string,
  flags: Set<string> | undefined,
  from: Address,
  subject: string | undefined,
  bodyStructure?: MessageStructureObject,
): MessageMeta {
  return {
    uid,
    date: new Date(date).toISOString(),
    from,
    subject: subject ?? '',
    isRead: Boolean(flags?.has('\\Seen')),
    isFlagged: Boolean(flags?.has('\\Flagged')),
    hasAttachments: bodyStructure ? structureHasAttachment(bodyStructure) : false,
  };
}

function summaryFrom(meta: MessageMeta, folder: string, preview: string): MessageSummary {
  return {
    uid: meta.uid,
    folder,
    from: meta.from,
    subject: meta.subject,
    preview,
    date: meta.date,
    isRead: meta.isRead,
    isFlagged: meta.isFlagged,
    hasAttachments: meta.hasAttachments,
  };
}

async function countUnseen(imap: ImapFlow, path: string): Promise<number> {
  await imap.mailboxOpen(path, { readOnly: true });
  const found = await imap.search({ seen: false }, { uid: true });
  return Array.isArray(found) ? found.length : 0;
}

export async function imapListFolders(): Promise<Folder[]> {
  return run(async (imap) => {
    const listed = await imap.list({ statusQuery: { unseen: true, messages: true } });
    const folders: Folder[] = [];
    for (const entry of listed) {
      // Ignorer les dossiers parents non sélectionnables (ex: [Gmail] avec \Noselect)
      const flags = entry.flags ?? new Set<string>();
      if (flags.has('\\Noselect') || flags.has('\\NonExistent')) {
        continue;
      }

      let unread = entry.status?.unseen;
      if (typeof unread !== 'number') {
        try {
          unread = await countUnseen(imap, entry.path);
        } catch {
          unread = 0;
        }
      }
      folders.push({
        id: entry.path,
        name: entry.name,
        label: folderLabel(entry.path, entry.specialUse),
        unread,
        total: entry.status?.messages ?? 0,
      });
    }
    return folders.sort((a, b) => folderSortValue(a) - folderSortValue(b));
  });
}

export async function imapListMessages(query: MessageQuery): Promise<Paginated<MessageSummary>> {
  return runFresh(async (imap) => {
    await imap.mailboxOpen(query.folder, { readOnly: true });

    const search: SearchObject = { all: true };
    if (query.unread) search.seen = false;
    if (query.flagged) search.flagged = true;
    if (query.q) search.text = query.q;

    const found = await imap.search(search, { uid: true });
    let uids = Array.isArray(found) ? found : [];
    if (uids.length > MAX_SCANNED) uids = uids.slice(-MAX_SCANNED);

    // 1re passe : métadonnées (dates, drapeaux, structure) pour trier et filtrer.
    const metas: MessageMeta[] = [];
    if (uids.length > 0) {
      for await (const message of imap.fetch(uids, {
        uid: true,
        flags: true,
        envelope: true,
        internalDate: true,
        bodyStructure: true,
      })) {
        metas.push(
          metaFromFlags(
            message.uid,
            message.internalDate ?? new Date(),
            message.flags,
            envelopeAddress(message.envelope?.from),
            message.envelope?.subject,
            message.bodyStructure,
          ),
        );
      }
    }

    const filtered = query.attachments ? metas.filter((meta) => meta.hasAttachments) : metas;
    filtered.sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return query.sort === 'asc' ? diff : -diff;
    });

    const total = filtered.length;
    const start = (query.page - 1) * query.limit;
    const pageMetas = filtered.slice(start, start + query.limit);

    // 2e passe : corps des seuls messages affichés, pour l'aperçu.
    const pageUids = pageMetas.map((meta) => meta.uid);
    const previews = new Map<number, string>();
    if (pageUids.length > 0) {
      for await (const message of imap.fetch(pageUids, { uid: true, source: true })) {
        if (!message.source) continue;
        const parsed = await simpleParser(message.source);
        previews.set(message.uid, makePreview(parsed.text ?? parsed.subject ?? ''));
      }
    }

    return {
      items: pageMetas.map((meta) =>
        summaryFrom(meta, query.folder, previews.get(meta.uid) ?? makePreview(meta.subject)),
      ),
      total,
      page: query.page,
      limit: query.limit,
      hasMore: start + pageMetas.length < total,
    };
  });
}

interface RawMessage {
  source: Buffer;
  flags: Set<string>;
}

async function fetchSource(imap: ImapFlow, uid: number, folder: string): Promise<RawMessage> {
  await imap.mailboxOpen(folder, { readOnly: true });
  const message = await imap.fetchOne(
    String(uid),
    { uid: true, flags: true, envelope: true, internalDate: true, source: true },
    { uid: true },
  );
  if (!message || !message.source) {
    throw new MailError('Message introuvable dans ce dossier.', 404);
  }
  return { source: message.source, flags: message.flags ?? new Set<string>() };
}

export async function imapGetMessage(uid: number, folder: string): Promise<MessageDetail> {
  return run(async (imap) => {
    const { source, flags } = await fetchSource(imap, uid, folder);
    const parsed = await simpleParser(source);
    const attachments: AttachmentMeta[] = (parsed.attachments ?? []).map((attachment, index) => ({
      index,
      filename: attachment.filename ?? `piece-jointe-${index + 1}`,
      contentType: attachment.contentType,
      size: attachment.size,
    }));

    return {
      uid,
      folder,
      from: firstAddress(parsed.from),
      to: flattenAddresses(parsed.to),
      cc: flattenAddresses(parsed.cc),
      subject: parsed.subject ?? '',
      date: (parsed.date ?? new Date()).toISOString(),
      text: typeof parsed.text === 'string' ? parsed.text : '',
      html: typeof parsed.html === 'string' ? parsed.html : null,
      // La boîte est ouverte en lecture seule : ces drapeaux sont simplement lus, jamais écrits.
      isRead: flags.has('\\Seen'),
      isFlagged: flags.has('\\Flagged'),
      attachments,
    };
  });
}

export async function imapGetAttachment(
  uid: number,
  index: number,
  folder: string,
): Promise<AttachmentFile> {
  return run(async (imap) => {
    const { source } = await fetchSource(imap, uid, folder);
    const parsed = await simpleParser(source);
    const attachment = parsed.attachments?.[index];
    if (!attachment) throw new MailError('Pièce jointe introuvable.', 404);
    return {
      filename: attachment.filename ?? `piece-jointe-${index + 1}`,
      contentType: attachment.contentType,
      content: attachment.content,
    };
  });
}
