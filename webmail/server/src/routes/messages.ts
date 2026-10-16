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

    const query: MessageQuery = {
      folder: folderFrom(req.query.folder),
      page: parseIntParam(req.query.page, 'page', 1, 100_000, 1),
      limit: parseIntParam(req.query.limit, 'limit', 1, 100, 25),
      q: q === '' ? undefined : q,
      unread: parseBooleanParam(req.query.unread, 'unread'),
      flagged: parseBooleanParam(req.query.flagged, 'flagged'),
      attachments: parseBooleanParam(req.query.attachments, 'attachments'),
      sort,
    };

    res.json(await service.listMessages(query));
  }),
);

function pathParams(req: Request) {
  const uid = Number(req.params.uid);
  if (!Number.isInteger(uid) || uid < 1) throw new MailError('Identifiant de message invalide.', 400);
  return { uid, folder: folderFrom(req.query.folder) };
}

/** GET /api/messages/:uid — message complet (corps texte et HTML, pièces jointes). */
messagesRouter.get(
  '/:uid',
  asyncHandler(async (req, res) => {
    const { uid, folder } = pathParams(req);
    res.json(await service.getMessage(uid, folder));
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
