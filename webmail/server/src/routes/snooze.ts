import { Router } from 'express';
import { asyncHandler } from '../errors.ts';
import { service } from '../service.ts';

export const snoozeRouter = Router();

/**
 * POST /api/snooze/release
 * Replace les messages dont l'échéance de mise en attente est atteinte.
 * Appelé toutes les minutes par le workflow n8n « Relance des messages en
 * attente ». Idempotent : un message déjà replacé n'est plus dans le store.
 */
snoozeRouter.post(
  '/release',
  asyncHandler(async (_req, res) => {
    const released = await service.releaseDueSnoozes();
    res.json({ success: true, released });
  }),
);
