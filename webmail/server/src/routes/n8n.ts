import { Router } from 'express';
import type { Request, Response } from 'express';
import { config } from '../config.ts';

export const n8nRouter = Router();

interface GenerateReplyPayload {
  webhookUrl?: string;
  message: {
    uid: number;
    from: { name?: string; address?: string };
    to?: Array<{ name?: string; address?: string }>;
    subject: string;
    date: string;
    text?: string;
    html?: string | null;
  };
  tone?: string;
  instructions?: string;
}

/**
 * Route POST /api/n8n/generate-reply
 * Transmet le message sélectionné au webhook n8n pour générer une réponse intelligente.
 */
n8nRouter.post('/generate-reply', async (req: Request, res: Response) => {
  const { webhookUrl, message, tone = 'professionnel', instructions = '' } = req.body as GenerateReplyPayload;

  if (!message || !message.from) {
    res.status(400).json({ error: 'Données du message incomplètes.' });
    return;
  }

  const targetUrl = (webhookUrl || config.n8nWebhookUrl || '').trim();

  // Si aucune URL n'est configurée, on renvoie une réponse guidée + simulation
  if (!targetUrl) {
    const senderName = message.from?.name || message.from?.address || 'Madame, Monsieur';
    const simulated = generateFallbackReply(senderName, message.subject, tone, instructions);
    res.json({
      success: true,
      reply: simulated,
      source: 'preview',
      warning: "Aucune URL de webhook n8n n'a été configurée. Vous pouvez renseigner votre webhook n8n dans les paramètres ou directement dans la modale.",
    });
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    // Si le texte brut est vide mais qu'il y a du HTML, on extrait le texte du HTML.
    const rawText = message.text?.trim() || '';
    const htmlText = message.html
      ? message.html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim()
      : '';
    const emailBody = rawText || htmlText;

    const payload = {
      event: 'email_reply_generation',
      message: {
        uid: message.uid,
        from: message.from,
        to: message.to,
        subject: message.subject || '(aucun objet)',
        date: message.date,
        text: emailBody,
        snippet: emailBody.slice(0, 600),
      },
      tone,
      instructions,
      timestamp: new Date().toISOString(),
    };

    const n8nResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!n8nResponse.ok) {
      throw new Error(`Le webhook n8n a renvoyé une erreur ${n8nResponse.status} ${n8nResponse.statusText}`);
    }

    const contentType = n8nResponse.headers.get('content-type') || '';
    let generatedReply = '';

    if (contentType.includes('application/json')) {
      const json = await n8nResponse.json();
      generatedReply = extractReplyFromJson(json);
    } else {
      generatedReply = await n8nResponse.text();
    }

    if (!generatedReply || !generatedReply.trim()) {
      // Si n8n a répondu un succès 200 vide, générer une réponse de repli
      const senderName = message.from?.name || message.from?.address || 'Bonjour';
      generatedReply = generateFallbackReply(senderName, message.subject, tone, instructions);
    }

    res.json({
      success: true,
      reply: generatedReply.trim(),
      source: 'n8n',
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[n8n webhook error]', errorMessage);

    // En cas d'erreur de connexion à n8n, renvoyer une réponse de secours utile avec l'erreur
    const senderName = message.from?.name || message.from?.address || 'Bonjour';
    const fallback = generateFallbackReply(senderName, message.subject, tone, instructions);

    res.json({
      success: false,
      error: `Impossible de contacter le workflow n8n (${errorMessage}).`,
      reply: fallback,
      source: 'fallback',
    });
  }
});

/**
 * Interface pour l'envoi d'email via n8n
 */
interface SendEmailPayload {
  sendWebhookUrl?: string;
  to: string;
  subject: string;
  body: string;
  messageUid?: number;
}

/**
 * Route POST /api/n8n/send-email
 * Transmet l'email à envoyer au webhook d'envoi n8n
 */
n8nRouter.post('/send-email', async (req: Request, res: Response) => {
  const { sendWebhookUrl, to, subject, body, messageUid } = req.body as SendEmailPayload;

  if (!to || !to.trim()) {
    res.status(400).json({ success: false, error: 'Destinataire manquant.' });
    return;
  }

  if (!body || !body.trim()) {
    res.status(400).json({ success: false, error: 'Contenu du message vide.' });
    return;
  }

  const targetUrl = (sendWebhookUrl || config.n8nSendWebhookUrl || config.n8nWebhookUrl || '').trim();

  if (!targetUrl) {
    res.status(400).json({
      success: false,
      error: "Aucune URL de webhook n8n n'a été configurée.",
    });
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const payload = {
      event: 'send_email',
      to: to.trim(),
      subject: (subject || '').trim(),
      body: body.trim(),
      messageUid,
      sentAt: new Date().toISOString(),
    };

    const n8nResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!n8nResponse.ok) {
      const errorBody = await n8nResponse.text().catch(() => '');
      throw new Error(`Le webhook n8n a renvoyé l'erreur ${n8nResponse.status} ${n8nResponse.statusText}${errorBody ? ` : ${errorBody.slice(0, 300)}` : ''}`);
    }

    let responseData: any = null;
    const contentType = n8nResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        responseData = await n8nResponse.json();
      } catch {
        responseData = null;
      }
    } else {
      responseData = await n8nResponse.text().catch(() => '');
    }

    res.json({
      success: true,
      message: 'Email envoyé avec succès via le workflow n8n.',
      details: responseData,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[n8n send-email error]', errorMessage);

    res.json({
      success: false,
      error: `Erreur workflow n8n : ${errorMessage}`,
    });
  }
});

/**
 * Route GET /api/n8n/config
 * Renvoyer la configuration par défaut (ex. webhooks configurés dans .env)
 */
n8nRouter.get('/config', (_req: Request, res: Response) => {
  res.json({
    hasDefaultWebhook: Boolean(config.n8nWebhookUrl),
    hasDefaultSendWebhook: Boolean(config.n8nSendWebhookUrl),
    defaultWebhookUrl: config.n8nWebhookUrl ? 'Configuré sur le serveur' : null,
    defaultSendWebhookUrl: config.n8nSendWebhookUrl ? 'Configuré sur le serveur' : null,
  });
});

/**
 * Analyse la structure JSON renvoyée par un node n8n (Respond to Webhook, AI Agent, OpenAI, etc.)
 */
function extractReplyFromJson(data: unknown): string {
  if (typeof data === 'string') return data;
  if (!data || typeof data !== 'object') return '';

  if (Array.isArray(data) && data.length > 0) {
    return extractReplyFromJson(data[0]);
  }

  const obj = data as Record<string, unknown>;

  // Champs standards des nodes n8n AI / Webhook
  const possibleFields = [
    'reply',
    'response',
    'text',
    'output',
    'content',
    'message',
    'generated_text',
    'result',
    'answer',
  ];

  for (const field of possibleFields) {
    if (typeof obj[field] === 'string' && obj[field].trim()) {
      return obj[field] as string;
    }
  }

  // Si imbriqué sous output / data
  if (obj.data) return extractReplyFromJson(obj.data);
  if (obj.output) return extractReplyFromJson(obj.output);

  return JSON.stringify(data, null, 2);
}

/**
 * Générateur intelligent de secours selon le ton choisi
 */
function generateFallbackReply(
  senderName: string,
  subject: string,
  tone: string,
  instructions: string,
): string {
  const cleanSubject = (subject || '(aucun objet)').replace(/^re:\s*/i, '');

  if (tone === 'concis') {
    return `Bonjour ${senderName},

Merci pour votre message concernant "${cleanSubject}".

Bien reçu, je m'en occupe et reviens vers vous rapidement.

Cordialement,
Haytam Najim`;
  }

  if (tone === 'positif') {
    return `Bonjour ${senderName},

Merci beaucoup pour votre retour concernant "${cleanSubject}".

C'est parfait, je confirme mon accord. N'hésitez pas si vous avez besoin d'éléments complémentaires de mon côté.

Très bonne journée,
Haytam Najim`;
  }

  if (tone === 'decline') {
    return `Bonjour ${senderName},

Je vous remercie pour votre message concernant "${cleanSubject}".

Après examen, je ne serai malheureusement pas en mesure de donner une suite favorable à cette demande pour le moment.

Je vous remercie pour votre compréhension et vous souhaite une excellente continuation.

Bien cordialement,
Haytam Najim`;
  }

  // Défaut : professionnel
  const customNote = instructions ? `\n(Précision : ${instructions})\n` : '';

  return `Bonjour ${senderName},

J'accuse bonne réception de votre email relatif à "${cleanSubject}".
${customNote}
Je vous remercie pour ces précisions. Je prends note des éléments partagés et reste à votre entière disposition pour tout échange complémentaire.

Bien cordialement,
Haytam Najim`;
}
