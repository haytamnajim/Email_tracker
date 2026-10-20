import { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Settings2,
  Send,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Bot,
} from 'lucide-react';
import type { MessageDetail } from '../types';
import { generateReplyWithN8n } from '../api';

const N8N_STORAGE_KEY = 'n8n_reply_webhook_url';

interface N8nReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: MessageDetail | null;
  onApplyReply: (replyText: string) => void;
}

export default function N8nReplyModal({
  isOpen,
  onClose,
  message,
  onApplyReply,
}: N8nReplyModalProps) {
  const [webhookUrl, setWebhookUrl] = useState(() => {
    return localStorage.getItem(N8N_STORAGE_KEY) || '';
  });
  const [showConfig, setShowConfig] = useState(false);
  const [tone, setTone] = useState<'professionnel' | 'concis' | 'positif' | 'decline'>('professionnel');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedReply, setGeneratedReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sauvegarder l'URL du webhook en local
  useEffect(() => {
    if (webhookUrl) {
      localStorage.setItem(N8N_STORAGE_KEY, webhookUrl.trim());
    }
  }, [webhookUrl]);

  // Si ouvert sans URL configurée, afficher directement la section config
  useEffect(() => {
    if (isOpen && !webhookUrl) {
      setShowConfig(true);
    }
  }, [isOpen, webhookUrl]);

  if (!isOpen || !message) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setWarning(null);

    try {
      const res = await generateReplyWithN8n({
        webhookUrl: webhookUrl.trim() || undefined,
        message: {
          uid: message.uid,
          from: message.from,
          to: message.to,
          subject: message.subject,
          date: message.date,
          text: message.text,
          html: message.html,
        },
        tone,
        instructions: instructions.trim() || undefined,
      });

      setGeneratedReply(res.reply);
      if (res.warning) setWarning(res.warning);
      if (!res.success && res.error) setError(res.error);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedReply) return;
    navigator.clipboard.writeText(generatedReply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (!generatedReply) return;
    onApplyReply(generatedReply);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-slide select-text">
      <div className="flex flex-col w-full max-w-xl max-h-[90vh] rounded-2xl bg-white dark:bg-[#202124] shadow-2xl border border-[#e0e2e7] dark:border-[#3c4043] overflow-hidden">
        {/* ── En-tête Google AI / n8n épuré ── */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#e0e2e7] dark:border-[#3c4043] px-5 bg-white dark:bg-[#202124]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eaf1fb] dark:bg-[#004a77]/30 text-[#0b57d0] dark:text-[#a8c7fa]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">
                Suggérer une réponse (n8n)
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowConfig((prev) => !prev)}
              title="Configurer l'URL Webhook n8n"
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                showConfig
                  ? 'bg-[#d3e3fd] text-[#0b57d0]'
                  : 'text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <Settings2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Corps ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Section Configuration Webhook n8n dépliable */}
          {showConfig && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-[#1a2333]/50 p-3.5 space-y-2 animate-fade-slide">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-[#0b57d0] dark:text-[#a8c7fa] flex items-center gap-1.5">
                  <Bot className="h-4 w-4" /> URL du Webhook n8n
                </label>
                <a
                  href="https://n8n.io"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#5f6368] dark:text-[#9aa0a6] hover:underline"
                >
                  <span>Doc n8n</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://votre-instance-n8n.com/webhook/generate-reply"
                className="w-full rounded-lg border border-[#dadce0] dark:border-[#444746] bg-white dark:bg-[#141414] px-3 py-2 text-xs text-[#1f1f1f] dark:text-[#e8eaed] outline-none focus:border-[#0b57d0]"
              />
              <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] leading-relaxed">
                Renseignez l'URL du noeud <strong>Webhook (POST)</strong> de votre workflow n8n.
                Le workflow recevra l'objet du mail, l'expéditeur, le contenu et le ton choisi.
              </p>
            </div>
          )}

          {/* Rappel du message ciblé */}
          <div className="rounded-xl bg-[#f8f9fa] dark:bg-[#1c1d1f] p-3 border border-[#e0e2e7] dark:border-[#303134]">
            <p className="font-semibold text-[#1f1f1f] dark:text-[#e8eaed] truncate">
              {message.subject || '(sans objet)'}
            </p>
            <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] truncate mt-0.5">
              De : {message.from?.name || message.from?.address}
            </p>
          </div>

          {/* Choix du ton de réponse */}
          <div>
            <label className="font-semibold text-[#444746] dark:text-[#c4c7c5] block mb-2">
              Tonalité souhaitée
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'professionnel' as const, label: 'Professionnel', icon: '💼' },
                { id: 'concis' as const, label: 'Bref & Concis', icon: '⚡' },
                { id: 'positif' as const, label: 'Accepter', icon: '✅' },
                { id: 'decline' as const, label: 'Décliner', icon: '❌' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTone(opt.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${
                    tone === opt.id
                      ? 'border-[#0b57d0] bg-[#eaf1fb] text-[#0b57d0] dark:border-[#a8c7fa] dark:bg-[#004a77]/30 dark:text-[#a8c7fa] font-semibold'
                      : 'border-[#dadce0] dark:border-[#444746] text-[#444746] dark:text-[#c4c7c5] hover:bg-[#f8f9fa] dark:hover:bg-[#282a2d]'
                  }`}
                >
                  <span className="text-base">{opt.icon}</span>
                  <span className="text-[11px]">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Consignes particulières */}
          <div>
            <label className="font-semibold text-[#444746] dark:text-[#c4c7c5] block mb-1.5">
              Instructions spécifiques (optionnel)
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Ex: Proposer un appel jeudi à 15h, remercier chaleureusement..."
              className="w-full rounded-lg border border-[#dadce0] dark:border-[#444746] bg-transparent px-3 py-2 text-xs text-[#1f1f1f] dark:text-[#e8eaed] outline-none focus:border-[#0b57d0]"
            />
          </div>

          {/* Bouton de génération */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-[#0b57d0] text-white px-5 py-2 text-xs font-semibold hover:bg-[#0842a0] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Génération en cours…' : 'Générer la réponse'}</span>
            </button>
          </div>

          {/* Message d'erreur ou avertissement */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Erreur de connexion n8n</p>
                <p className="mt-0.5 text-[11px]">{error}</p>
              </div>
            </div>
          )}

          {warning && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 text-amber-800 dark:text-amber-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-[11px]">{warning}</p>
            </div>
          )}

          {/* Zone du texte généré */}
          {generatedReply && (
            <div className="space-y-2 pt-2 animate-fade-slide">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">
                  Réponse proposée :
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-[11px] text-[#0b57d0] dark:text-[#a8c7fa] hover:underline"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copié !' : 'Copier'}</span>
                </button>
              </div>

              <textarea
                value={generatedReply}
                onChange={(e) => setGeneratedReply(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-[#dadce0] dark:border-[#444746] bg-[#f8f9fa] dark:bg-[#1c1d1f] p-3 text-xs text-[#1f1f1f] dark:text-[#e8eaed] leading-relaxed outline-none focus:border-[#0b57d0] resize-y"
              />
            </div>
          )}
        </div>

        {/* ── Pied de page modal ── */}
        <div className="flex items-center justify-between border-t border-[#e0e2e7] dark:border-[#3c4043] px-5 py-3 bg-[#f8f9fa] dark:bg-[#282a2d]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-1.5 text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10"
          >
            Fermer
          </button>

          {generatedReply ? (
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-2 rounded-full bg-[#0b57d0] text-white px-5 py-1.5 text-xs font-semibold hover:bg-[#0842a0] transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Insérer dans la réponse</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
