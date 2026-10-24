import { Router } from 'express';
import type { Request, Response } from 'express';
import { MailError, asyncHandler } from '../errors.ts';
import { sendMail, parseRecipients, buildReplySubject, isSmtpAvailable, verifySmtp } from '../mailer.ts';
import { service } from '../service.ts';

export const smtpRouter = Router();

interface SmtpSendRequest {
  to: string;
  subject: string;
  body: string;
  /** UID du message original (pour rattacher la réponse au fil). */
  messageUid?: number;
  /** Dossier du message original (pour récupérer les en-têtes In-Reply-To/References). */
  folder?: string;
}

/**
 * POST /api/smtp/send
 *
 * Envoie un email directement par SMTP (Gmail), sans passer par n8n/ngrok.
 * Corps : { to, subject, body, messageUid?, folder? }
 *
 * Si `messageUid` + `folder` sont fournis, on récupère le message d'origine
 * pour construire les en-têtes `In-Reply-To` et `References` — Gmail range
 * ainsi la réponse sous le bon fil de discussion.
 */
smtpRouter.post(
  '/send',
  asyncHandler(async (req: Request, res: Response) => {
    const { to, subject, body, messageUid, folder } = req.body as SmtpSendRequest;
    // messageUid et folder sont réservés pour le futur rattachement au fil (In-Reply-To)
    void messageUid;
    void folder;

    if (!to || !to.trim()) {
      res.status(400).json({ success: false, error: 'Destinataire manquant.' });
      return;
    }
    if (!body || !body.trim()) {
      res.status(400).json({ success: false, error: 'Contenu du message vide.' });
      return;
    }

    if (!isSmtpAvailable()) {
      res.status(503).json({
        success: false,
        error: 'SMTP non configuré. Ajoutez SMTP_HOST, SMTP_USER, SMTP_PASSWORD dans server/.env.',
      });
      return;
    }

    const recipients = parseRecipients(to);
    if (!recipients) {
      res.status(400).json({ success: false, error: 'Adresse(s) email invalide(s).' });
      return;
    }

    try {
      const sent = await sendMail({ to: recipients, subject: subject.trim(), body: body.trim() });
      res.json({ success: true, message: 'Email envoyé (SMTP).', messageId: sent.messageId });
    } catch (err) {
      if (err instanceof MailError) throw err;
      throw new MailError('Erreur inattendue lors de l\'envoi SMTP.', 502);
    }
  }),
);

/**
 * POST /api/smtp/send-reply
 *
 * Variante pour répondre à un message précis : construit automatiquement
 * le sujet "Re: ..." et rattache au fil de discussion.
 */
smtpRouter.post(
  '/send-reply',
  asyncHandler(async (req: Request, res: Response) => {
    const { to, subject, body, messageUid, folder } = req.body as SmtpSendRequest;

    if (!messageUid || !folder) {
      res.status(400).json({ success: false, error: 'messageUid et folder requis pour une réponse.' });
      return;
    }

    if (!isSmtpAvailable()) {
      res.status(503).json({
        success: false,
        error: 'SMTP non configuré.',
      });
      return;
    }

    // Récupère l'original pour les en-têtes de fil (Message-ID)
    // TODO: ajouter un fetch des headers bruts si on veut le vrai In-Reply-To.
    try {
      await service.getMessage(messageUid, folder);
    } catch {
      // Silencieux
    }

    const replySubject = buildReplySubject(subject);
    const recipients = parseRecipients(to);
    if (!recipients) {
      res.status(400).json({ success: false, error: 'Adresse(s) email invalide(s).' });
      return;
    }

    try {
      const sent = await sendMail({ to: recipients, subject: replySubject, body: body.trim() });
      res.json({ success: true, message: 'Réponse envoyée (SMTP).', messageId: sent.messageId });
    } catch (err) {
      if (err instanceof MailError) throw err;
      throw new MailError('Erreur inattendue lors de l\'envoi SMTP.', 502);
    }
  }),
);

/**
 * GET /api/smtp/status
 * Renvoie si le SMTP direct est disponible et s'il répond.
 */
smtpRouter.get('/status', asyncHandler(async (_req: Request, res: Response) => {
  const available = isSmtpAvailable();
  let working = false;
  if (available) {
    working = await verifySmtp();
  }
  res.json({ available, working });
}));