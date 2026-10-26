import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import SendFlight, { SEND_DONE_MS, SEND_FLIGHT_MS, type SendPhase } from './SendFlight';
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Send,
  Paperclip,
  Link2,
  Smile,
  HardDrive,
  Image as ImageIcon,
  Trash2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  ChevronDown,
} from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (to: string, subject: string, body: string) => Promise<boolean> | boolean | void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
}

export default function ComposeModal({
  isOpen,
  onClose,
  onSend,
  initialTo = '',
  initialSubject = '',
  initialBody = '',
}: ComposeModalProps) {
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showFormatting, setShowFormatting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendPhase, setSendPhase] = useState<SendPhase>('idle');
  const [sendError, setSendError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim() || isSending) return;

    setSendError(null);
    setIsSending(true);

    // Le vol part immédiatement : il sert de retour au clic, sans attendre
    // la réponse réseau (SMTP puis repli n8n peuvent prendre plusieurs secondes).
    const startedAt = Date.now();
    setSendPhase('flying');

    /** Laisse le vol atteindre « Envoyé » avant de refermer la fenêtre. */
    const playOut = async () => {
      const remaining = Math.max(0, SEND_FLIGHT_MS - (Date.now() - startedAt));
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setSendPhase('sent');
      await new Promise((resolve) => setTimeout(resolve, SEND_DONE_MS));
      setSendPhase('idle');
    };

    try {
      const result = await onSend(to, subject, body);
      if (result === false) {
        // Échec signalé par le parent : on coupe le vol et on garde la
        // fenêtre ouverte avec le brouillon intact.
        setSendPhase('idle');
        setSendError(
          "L'email n'a pas pu être envoyé. Vérifiez la configuration SMTP puis réessayez.",
        );
        return;
      }
      await playOut();
      setTo('');
      setSubject('');
      setBody('');
      setCc('');
      setBcc('');
      onClose();
    } catch (err: unknown) {
      setSendPhase('idle');
      setSendError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className={`fixed z-50 animate-compose-in rounded-t-2xl shadow-2xl border border-[#dadce0] dark:border-[#444746] bg-white dark:bg-[#202124] transition-shadow duration-200 select-text flex flex-col ${
        isMinimized
          ? 'bottom-0 right-16 w-72 h-11'
          : isMaximized
          ? 'inset-6 sm:inset-12 w-auto h-auto'
          : 'bottom-0 right-4 sm:right-16 w-[94vw] sm:w-[580px] h-[520px]'
      }`}
    >
      <SendFlight phase={sendPhase} />

      {/* ── Barre de titre / En-tête de la fenêtre ── */}
      <div className="flex h-11 shrink-0 items-center justify-between rounded-t-2xl bg-[#edf2fa] dark:bg-[#282a2d] px-4 cursor-pointer">
        <span
          onClick={() => isMinimized && setIsMinimized(false)}
          className="text-xs font-semibold text-[#1f1f1f] dark:text-[#e8eaed] truncate flex-1"
        >
          {subject ? subject : 'Nouveau message'}
        </span>

        <div className="flex items-center gap-1">
          {/* Réduire */}
          <button
            type="button"
            onClick={() => setIsMinimized((prev) => !prev)}
            title={isMinimized ? 'Agrandir' : 'Réduire'}
            className="flex h-7 w-7 items-center justify-center rounded text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Minus className="h-4 w-4" />
          </button>

          {/* Plein écran */}
          {!isMinimized && (
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              title={isMaximized ? 'Quitter le plein écran' : 'Plein écran'}
              className="flex h-7 w-7 items-center justify-center rounded text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10"
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}

          {/* Fermer */}
          <button
            type="button"
            onClick={onClose}
            title="Enregistrer et fermer"
            className="flex h-7 w-7 items-center justify-center rounded text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          {sendError && (
            <div
              role="alert"
              className="flex items-start gap-2 border-b border-[#f6aea9] bg-[#fce8e6] px-4 py-2 text-[11px] leading-snug text-[#a50e0e] dark:border-[#8c2b24] dark:bg-[#3b1714] dark:text-[#f2b8b5]"
            >
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{sendError}</span>
            </div>
          )}

          {/* Champ Destinataires "À" */}
          <div className="flex items-center border-b border-[#e0e2e7] dark:border-[#3c4043] px-4 py-2">
            <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] w-12">À</span>
            <input
              type="email"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="destinataire@example.com"
              className="flex-1 bg-transparent text-sm text-[#1f1f1f] dark:text-[#e8eaed] outline-none"
            />
            <div className="flex items-center gap-2 text-xs text-[#5f6368] dark:text-[#9aa0a6]">
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="hover:underline"
                >
                  Cc
                </button>
              )}
              {!showBcc && (
                <button
                  type="button"
                  onClick={() => setShowBcc(true)}
                  className="hover:underline"
                >
                  Cci
                </button>
              )}
            </div>
          </div>

          {/* Champ Cc */}
          {showCc && (
            <div className="flex items-center border-b border-[#e0e2e7] dark:border-[#3c4043] px-4 py-2 animate-fade-slide">
              <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] w-12">Cc</span>
              <input
                type="email"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="copie@example.com"
                className="flex-1 bg-transparent text-sm text-[#1f1f1f] dark:text-[#e8eaed] outline-none"
              />
            </div>
          )}

          {/* Champ Cci */}
          {showBcc && (
            <div className="flex items-center border-b border-[#e0e2e7] dark:border-[#3c4043] px-4 py-2 animate-fade-slide">
              <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] w-12">Cci</span>
              <input
                type="email"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                placeholder="copie_invisible@example.com"
                className="flex-1 bg-transparent text-sm text-[#1f1f1f] dark:text-[#e8eaed] outline-none"
              />
            </div>
          )}

          {/* Champ Objet */}
          <div className="flex items-center border-b border-[#e0e2e7] dark:border-[#3c4043] px-4 py-2">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Objet"
              className="w-full bg-transparent text-sm text-[#1f1f1f] dark:text-[#e8eaed] outline-none"
            />
          </div>

          {/* Barre d'outils de mise en forme riche (optionnelle) */}
          {showFormatting && (
            <div className="flex items-center gap-1 border-b border-[#e0e2e7] dark:border-[#3c4043] px-4 py-1.5 bg-[#f8f9fa] dark:bg-[#282a2d] text-[#444746] dark:text-[#c4c7c5] animate-fade-slide">
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Underline className="h-3.5 w-3.5" />
              </button>
              <div className="mx-1 h-4 w-[1px] bg-[#dadce0] dark:bg-[#444746]" />
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/10"
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Zone de texte du message */}
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Écrivez votre message ici..."
            className="flex-1 w-full resize-none p-4 bg-transparent text-sm text-[#1f1f1f] dark:text-[#e8eaed] outline-none"
          />

          {/* ── Barre d'action inférieure Gmail ── */}
          <div className="flex h-14 shrink-0 items-center justify-between border-t border-[#e0e2e7] dark:border-[#3c4043] px-4 bg-white dark:bg-[#202124]">
            {/* Bouton Envoyer officiel Gmail */}
            <div className="flex items-center">
              <button
                type="submit"
                disabled={isSending || !to.trim()}
                className="inline-flex h-9 items-center gap-2 rounded-l-full bg-[#0b57d0] dark:bg-[#a8c7fa] px-5 text-xs font-semibold text-white dark:text-[#041e49] shadow-sm hover:bg-[#0842a0] dark:hover:bg-[#8ab4f8] transition-colors disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSending ? 'Envoi…' : 'Envoyer'}</span>
              </button>
              <button
                type="button"
                title="Planifier l'envoi"
                className="flex h-9 w-7 items-center justify-center rounded-r-full bg-[#0b57d0] dark:bg-[#a8c7fa] text-white dark:text-[#041e49] border-l border-white/20 dark:border-black/10 hover:bg-[#0842a0] dark:hover:bg-[#8ab4f8]"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Outils multimédias et pièces jointes */}
            <div className="flex items-center gap-1 text-[#5f6368] dark:text-[#9aa0a6]">
              <button
                type="button"
                onClick={() => setShowFormatting((prev) => !prev)}
                title="Options de mise en forme"
                className={`flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 ${
                  showFormatting ? 'bg-[#d3e3fd] text-[#0b57d0]' : ''
                }`}
              >
                <span className="text-xs font-bold underline font-serif">A</span>
              </button>

              <button
                type="button"
                title="Joindre des fichiers"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              <button
                type="button"
                title="Insérer un lien"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Link2 className="h-4 w-4" />
              </button>

              <button
                type="button"
                title="Insérer un emoji"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Smile className="h-4 w-4" />
              </button>

              <button
                type="button"
                title="Insérer des fichiers avec Drive"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <HardDrive className="h-4 w-4" />
              </button>

              <button
                type="button"
                title="Insérer une photo"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <ImageIcon className="h-4 w-4" />
              </button>

              <div className="mx-1 h-5 w-[1px] bg-[#e0e2e7] dark:border-[#3c4043]" />

              {/* Supprimer le brouillon */}
              <button
                type="button"
                onClick={onClose}
                title="Supprimer le brouillon"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
