import { Router } from 'express';
import type { Request, Response } from 'express';
import { MailError, asyncHandler } from '../errors.ts';
import { markAsRead, markAsUnread, setFlagged, setFlagOnUids } from '../imapFlags.ts';

export const flagsRouter = Router();

function parseUidParam(value: unknown): number {
  const uid = Number(value);
  if (!Number.isInteger(uid) || uid < 1) throw new MailError('UID invalide.', 400);
  return uid;
}

function parseFolderParam(value: unknown): string {
  const folder = typeof value === 'string' && value.trim() !== '' ? value.trim() : 'INBOX';
  return folder;
}

function parseUidList(value: unknown): number[] {
  if (!value) return [];
  if (typeof value === 'string') {
    return value.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
  }
  if (Array.isArray(value)) {
    return value.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0);
  }
  return [];
}

/**
 * PATCH /api/flags/:uid/read
 * Marque un message comme lu (\\Seen).
 */
flagsRouter.patch(
  '/:uid/read',
  asyncHandler(async (req: Request, res: Response) => {
    const uid = parseUidParam(req.params.uid);
    const folder = parseFolderParam(req.query.folder);
    const { value = true } = req.body as { value?: boolean };

    if (value) {
      await markAsRead(uid, folder);
      res.json({ success: true, action: 'read' });
    } else {
      await markAsUnread(uid, folder);
      res.json({ success: true, action: 'unread' });
    }
  }),
);

/**
 * PATCH /api/flags/:uid/flagged
 * Marque/démarque un message comme suivi (étoile, \\Flagged).
 */
flagsRouter.patch(
  '/:uid/flagged',
  asyncHandler(async (req: Request, res: Response) => {
    const uid = parseUidParam(req.params.uid);
    const folder = parseFolderParam(req.query.folder);
    const { value = true } = req.body as { value?: boolean };

    await setFlagged(uid, folder, value);
    res.json({ success: true, action: value ? 'flagged' : 'unflagged' });
  }),
);

/**
 * PATCH /api/flags/batch/read
 * Marque plusieurs messages comme lus/non lus.
 * Body: { uids: number[], value: boolean, folder?: string }
 */
flagsRouter.patch(
  '/batch/read',
  asyncHandler(async (req: Request, res: Response) => {
    const uids = parseUidList(req.body.uids);
    const folder = parseFolderParam(req.body.folder);
    const { value = true } = req.body as { value?: boolean };

    if (uids.length === 0) {
      res.status(400).json({ success: false, error: 'Aucun UID fourni.' });
      return;
    }
    await setFlagOnUids(uids, folder, '\\Seen', value);
    res.json({ success: true, action: value ? 'read' : 'unread', count: uids.length });
  }),
);

/**
 * PATCH /api/flags/batch/flagged
 * Marque/démarque plusieurs messages comme suivis.
 * Body: { uids: number[], value: boolean, folder?: string }
 */
flagsRouter.patch(
  '/batch/flagged',
  asyncHandler(async (req: Request, res: Response) => {
    const uids = parseUidList(req.body.uids);
    const folder = parseFolderParam(req.body.folder);
    const { value = true } = req.body as { value?: boolean };

    if (uids.length === 0) {
      res.status(400).json({ success: false, error: 'Aucun UID fourni.' });
      return;
    }
    await setFlagOnUids(uids, folder, '\\Flagged', value);
    res.json({ success: true, action: value ? 'flagged' : 'unflagged', count: uids.length });
  }),
);