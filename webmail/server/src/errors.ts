import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Erreur HTTP métier : message lisible pour l'utilisateur, jamais d'identifiant. */
export class MailError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'MailError';
    this.status = status;
  }
}

/** Enveloppe un handler async pour propager les erreurs au middleware central. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}
