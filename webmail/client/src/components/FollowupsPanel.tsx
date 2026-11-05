import { useCallback, useEffect, useState } from 'react';
import { X, Clock, Send, Loader2, AlertCircle, RefreshCw, Mail } from 'lucide-react';
import { getFollowups } from '../api';
import type { FollowupCandidate } from '../api';

interface FollowupsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPrepare: (candidate: FollowupCandidate) => void;
}

function formatSentDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
  }).format(date);
}

export default function FollowupsPanel({ isOpen, onClose, onPrepare }: FollowupsPanelProps) {
  const [candidates, setCandidates] = useState<FollowupCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const response = await getFollowups(3, 10);
      setCandidates(response.candidates);
      setWarning(response.warning ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les relances.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) void load();
  }, [isOpen, load]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-slide"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="followups-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#dadce0] bg-white shadow-2xl dark:border-[#444746] dark:bg-[#1f1f1f]"
      >
        <div className="flex items-center justify-between border-b border-[#e0e2e7] px-5 py-4 dark:border-[#3c4043]">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white">
              <Clock className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 id="followups-title" className="text-sm font-bold text-[#1f1f1f] dark:text-[#e8eaed]">
                Relances suggérées
              </h2>
              <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                Messages envoyés il y a au moins 3 jours, sans réponse.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer les relances"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#5f6368] transition-colors hover:bg-black/5 dark:text-[#9aa0a6] dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#5f6368] dark:text-[#9aa0a6]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Analyse des messages envoyés…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() => void load()}
                    className="mt-2 inline-flex items-center gap-1 font-semibold hover:underline"
                  >
                    <RefreshCw className="h-3 w-3" aria-hidden="true" />
                    Réessayer
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && warning && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
              {warning}
            </div>
          )}

          {!loading && !error && !warning && candidates.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Mail className="h-8 w-8 text-[#dadce0] dark:text-[#444746]" aria-hidden="true" />
              <p className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">
                Aucune relance en attente
              </p>
              <p className="max-w-[280px] text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                Aucun message envoyé il y a 3 jours ou plus n'attend de réponse. Les adresses
                automatiques sont ignorées.
              </p>
            </div>
          )}

          {!loading && !error && candidates.length > 0 && (
            <ul className="space-y-2">
              {candidates.map((candidate) => (
                <li
                  key={`${candidate.folder}-${candidate.uid}`}
                  className="rounded-xl border border-[#e0e2e7] bg-[#f8f9fa] px-3 py-3 dark:border-[#3c4043] dark:bg-[#141414]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">
                        {candidate.to.name || candidate.to.address}
                      </p>
                      <p className="truncate text-xs text-[#444746] dark:text-[#c4c7c5]">
                        {candidate.subject || '(sans objet)'}
                      </p>
                      <p className="mt-1 text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                        Envoyé le {formatSentDate(candidate.date)} · il y a {candidate.daysSince} jour
                        {candidate.daysSince > 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onPrepare(candidate);
                        onClose();
                      }}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#0b57d0] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0842a0]"
                    >
                      <Send className="h-3.5 w-3.5" aria-hidden="true" />
                      Relancer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[#e0e2e7] px-5 py-3 text-[11px] text-[#5f6368] dark:border-[#3c4043] dark:text-[#9aa0a6]">
          Aucun email n'est envoyé automatiquement : la relance s'ouvre dans la fenêtre de rédaction.
        </div>
      </div>
    </div>
  );
}
