import { Router } from 'express';
import type { Request } from 'express';
import { MailError, asyncHandler } from '../errors.ts';
import { service } from '../service.ts';

export const followupsRouter = Router();

function parseInteger(value: unknown, name: string, min: number, max: number, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new MailError(`Paramètre invalide : ${name} doit être entre ${min} et ${max}.`, 400);
  }
  return parsed;
}

/**
 * GET /api/followups?days=3&limit=10
 *
 * Liste les messages envoyés sans réponse depuis au moins `days` jours.
 * Opération strictement en lecture seule : aucune relance n'est envoyée.
 */
followupsRouter.get(
  '/',
  asyncHandler(async (req: Request, res) => {
    const days = parseInteger(req.query.days, 'days', 1, 60, 3);
    const limit = parseInteger(req.query.limit, 'limit', 1, 20, 10);

    const folders = await service.listFolders();
    const sentFolder = folders.find((folder) =>
      /sent|envoy/i.test(`${folder.id} ${folder.name} ${folder.label}`),
    );

    if (!sentFolder) {
      res.json({
        days,
        sentFolder: null,
        candidates: [],
        warning: "Le dossier des messages envoyés n'a pas été trouvé.",
      });
      return;
    }

    const candidates = await service.listFollowups(sentFolder.id, days, limit);
    res.json({
      days,
      sentFolder: sentFolder.label,
      candidates,
    });
  }),
);
