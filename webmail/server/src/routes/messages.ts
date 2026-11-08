import { Router } from 'express';
import type { Request } from 'express';
import { MailError, asyncHandler } from '../errors.ts';
import { service } from '../service.ts';
import type { MessageQuery } from '../types.ts';

export const messagesRouter = Router();

function parseIntParam(value: unknown, name: string, min: number, max: number, fallback: number) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new MailError(`Paramètre invalide : ${name}.`, 400);
  }
  return parsed;
}

function parseBooleanParam(value: unknown, name: string): boolean | undefined {
  if (value === undefined || value === '') return undefined;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw new MailError(`Paramètre invalide : ${name}.`, 400);
}

function folderFrom(query: unknown): string {
  const folder = typeof query === 'string' && query.trim() !== '' ? query.trim() : 'INBOX';
  return folder;
}

/** GET /api/messages — liste paginée d'un dossier. */
messagesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const sortRaw = req.query.sort;
    const sort = sortRaw === 'asc' || sortRaw === 'desc' ? sortRaw : 'desc';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    /** Filtre avancé : absent ou vide => critère non appliqué. */
    const textParam = (value: unknown) =>
      typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

    const query: MessageQuery = {
      folder: folderFrom(req.query.folder),
      page: parseIntParam(req.query.page, 'page', 1, 100_000, 1),
      limit: parseIntParam(req.query.limit, 'limit', 1, 100, 25),
      q: q === '' ? undefined : q,
      from: textParam(req.query.from),
      to: textParam(req.query.to),
      subject: textParam(req.query.subject),
      unread: parseBooleanParam(req.query.unread, 'unread'),
      flagged: parseBooleanParam(req.query.flagged, 'flagged'),
      attachments: parseBooleanParam(req.query.attachments, 'attachments'),
      sort,
    };

    res.json(await service.listMessages(query));
  }),
);

function parseUidList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((uid) => Number.isInteger(uid) && uid > 0),
    ),
  );
}

function requiredFolder(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new MailError(`Dossier ${name} requis.`, 400);
  }
  return value.trim();
}

function parseUntil(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new MailError("Date d'échéance requise.", 400);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new MailError("Date d'échéance invalide.", 400);
  }
  const now = Date.now();
  if (date.getTime() <= now - 60_000) {
    throw new MailError("La date d'échéance doit être dans le futur.", 400);
  }
  if (date.getTime() > now + 366 * 24 * 3_600_000) {
    throw new MailError("La date d'échéance dépasse un an.", 400);
  }
  return date.toISOString();
}

function pathParams(req: Request) {
  const uid = Number(req.params.uid);
  if (!Number.isInteger(uid) || uid < 1) throw new MailError('Identifiant de message invalide.', 400);
  return { uid, folder: folderFrom(req.query.folder) };
}

// ── Routes par lot ────────────────────────────────────────────────
// Déclarées avant /:uid/... pour que « batch » ne soit pas pris pour un UID.

/** POST /api/messages/batch/move — déplace plusieurs messages. */
messagesRouter.post(
  '/batch/move',
  asyncHandler(async (req, res) => {
    const uids = parseUidList(req.body?.uids);
    const from = requiredFolder(req.body?.from, 'source');
    const to = requiredFolder(req.body?.to, 'destination');
    if (uids.length === 0) throw new MailError('Aucun message sélectionné.', 400);

    const count = await service.moveMessages(uids, from, to);
    res.json({ success: true, count, from, to });
  }),
);

/** POST /api/messages/batch/snooze — met plusieurs messages en attente. */
messagesRouter.post(
  '/batch/snooze',
  asyncHandler(async (req, res) => {
    const uids = parseUidList(req.body?.uids);
    const from = requiredFolder(req.body?.from, 'source');
    const until = parseUntil(req.body?.until);
    if (uids.length === 0) throw new MailError('Aucun message sélectionné.', 400);

    const count = await service.snoozeMessages(uids, from, until);
    res.json({ success: true, count, until });
  }),
);

/** GET /api/messages/:uid — message complet (corps texte et HTML, pièces jointes). */
messagesRouter.get(
  '/:uid',
  asyncHandler(async (req, res) => {
    const { uid, folder } = pathParams(req);
    res.json(await service.getMessage(uid, folder));
  }),
);

/** POST /api/messages/:uid/move — déplace un message (action utilisateur explicite). */
messagesRouter.post(
  '/:uid/move',
  asyncHandler(async (req, res) => {
    const { uid } = pathParams(req);
    const from = requiredFolder(req.body?.from, 'source');
    const to = requiredFolder(req.body?.to, 'destination');

    await service.moveMessage(uid, from, to);
    res.json({ success: true, from, to });
  }),
);

/** POST /api/messages/:uid/snooze — met un message en attente jusqu'à une date. */
messagesRouter.post(
  '/:uid/snooze',
  asyncHandler(async (req, res) => {
    const { uid } = pathParams(req);
    const from = requiredFolder(req.body?.from, 'source');
    const until = parseUntil(req.body?.until);

    await service.snoozeMessages([uid], from, until);
    res.json({ success: true, until });
  }),
);

/** POST /api/messages/:uid/unsnooze — annule la mise en attente et replace le message. */
messagesRouter.post(
  '/:uid/unsnooze',
  asyncHandler(async (req, res) => {
    const { uid } = pathParams(req);
    await service.cancelSnooze(uid);
    res.json({ success: true });
  }),
);

/** GET /api/messages/:uid/attachments/:index — téléchargement d'une pièce jointe. */
messagesRouter.get(
  '/:uid/attachments/:index',
  asyncHandler(async (req, res) => {
    const { uid, folder } = pathParams(req);
    const index = parseIntParam(req.params.index, 'index', 0, 999, 0);
    const file = await service.getAttachment(uid, index, folder);

    const safeName = file.filename.replace(/["\\]/g, '_');
    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('Content-Length', String(file.content.length));
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(safeName)}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    );
    res.send(file.content);
  }),
);
