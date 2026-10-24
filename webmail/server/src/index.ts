import cors from 'cors';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { config, redact } from './config.ts';
import { MailError } from './errors.ts';
import { foldersRouter } from './routes/folders.ts';
import { messagesRouter } from './routes/messages.ts';
import { n8nRouter } from './routes/n8n.ts';
import { smtpRouter } from './routes/smtp.ts';
import { flagsRouter } from './routes/flags.ts';

const app = express();
app.disable('x-powered-by');
app.use(express.json());

// L'API n'accepte que le client Vite servi en local.
const allowedOrigins = new Set(['http://127.0.0.1:5173', 'http://localhost:5173']);
app.use(
  cors({
    origin(origin, callback) {
      // Pas d'Origin (curl, PowerShell) : autorisé mais sans en-tête CORS.
      // Origine inconnue : aucun en-tête renvoyé => le navigateur bloque la lecture.
      callback(null, !origin || allowedOrigins.has(origin));
    },
  }),
);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', demo: config.demoMode });
});

app.use('/api/folders', foldersRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/n8n', n8nRouter);
app.use('/api/smtp', smtpRouter);
app.use('/api/flags', flagsRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Route inconnue.' });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = error instanceof MailError ? error.status : 500;
  const message =
    error instanceof MailError ? error.message : 'Erreur interne du serveur. Réessayez plus tard.';
  if (status >= 500) {
    const raw = error instanceof Error ? error.message : String(error);
    console.error(`[erreur serveur] ${redact(raw)}`);
  }
  res.status(status).json({ error: message });
});

app.listen(config.port, '127.0.0.1', () => {
  const mode = config.demoMode ? 'mode démo (30 emails factices)' : 'connexion IMAP réelle';
  console.log(`API mail locale sur http://127.0.0.1:${config.port} — ${mode}`);
});
