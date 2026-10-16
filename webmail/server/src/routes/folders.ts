import { Router } from 'express';
import { asyncHandler } from '../errors.ts';
import { service } from '../service.ts';

export const foldersRouter = Router();

/** GET /api/folders — liste des dossiers avec le nombre de non lus. */
foldersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ folders: await service.listFolders() });
  }),
);
