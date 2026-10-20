import { X, Check } from 'lucide-react';
import type { DisplayDensity } from './MessageItem';
import type { SplitViewMode } from './TopToolbar';
import type { Theme } from '../types';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  density: DisplayDensity;
  onChangeDensity: (density: DisplayDensity) => void;
  theme: Theme;
  onChangeTheme: (theme: Theme) => void;
  splitView: SplitViewMode;
  onChangeSplitView: (mode: SplitViewMode) => void;
}

export default function SettingsDrawer({
  isOpen,
  onClose,
  density,
  onChangeDensity,
  theme,
  onChangeTheme,
  splitView,
  onChangeSplitView,
}: SettingsDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-[#202124] shadow-2xl border-l border-[#e0e2e7] dark:border-[#3c4043] flex flex-col animate-fade-slide select-none">
      {/* ── En-tête ── */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#e0e2e7] dark:border-[#3c4043] px-5">
        <h2 className="text-base font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">
          Configuration rapide
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#5f6368] dark:text-[#9aa0a6] hover:bg-black/5 dark:hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── Corps des réglages ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm">
        {/* 1. Densité d'affichage */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5f6368] dark:text-[#9aa0a6] mb-3">
            Densité
          </h3>
          <div className="space-y-2">
            {[
              { id: 'default' as const, label: 'Par défaut', desc: 'Affiche les aperçus des pièces jointes' },
              { id: 'comfortable' as const, label: 'Confortable', desc: 'Espacement standard équilibré' },
              { id: 'compact' as const, label: 'Compact', desc: 'Lignes resserrées pour voir plus de messages' },
            ].map((opt) => (
              <label
                key={opt.id}
                onClick={() => onChangeDensity(opt.id)}
                className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  density === opt.id
                    ? 'border-[#0b57d0] bg-[#eaf1fb] dark:border-[#a8c7fa] dark:bg-[#004a77]/30'
                    : 'border-[#dadce0] dark:border-[#444746] hover:bg-[#f8f9fa] dark:hover:bg-[#282a2d]'
                }`}
              >
                <input
                  type="radio"
                  name="density"
                  checked={density === opt.id}
                  onChange={() => onChangeDensity(opt.id)}
                  className="mt-1 accent-[#0b57d0]"
                />
                <div>
                  <p className="font-semibold text-xs text-[#1f1f1f] dark:text-[#e8eaed]">
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                    {opt.desc}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 2. Thème */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5f6368] dark:text-[#9aa0a6] mb-3">
            Thème
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChangeTheme('light')}
              className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
                theme === 'light'
                  ? 'border-[#0b57d0] bg-[#eaf1fb] text-[#0b57d0]'
                  : 'border-[#dadce0] text-[#1f1f1f] hover:bg-[#f8f9fa]'
              }`}
            >
              <span>Clair</span>
              {theme === 'light' && <Check className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => onChangeTheme('dark')}
              className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
                theme === 'dark'
                  ? 'border-[#a8c7fa] bg-[#004a77]/40 text-[#a8c7fa]'
                  : 'border-[#444746] text-[#e8eaed] hover:bg-[#282a2d]'
              }`}
            >
              <span>Sombre</span>
              {theme === 'dark' && <Check className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* 3. Volet de lecture */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5f6368] dark:text-[#9aa0a6] mb-3">
            Volet de lecture
          </h3>
          <div className="space-y-2">
            {[
              { id: 'none' as const, label: 'Pas de séparation', desc: 'Cliquez pour ouvrir le message en grand' },
              { id: 'vertical' as const, label: 'À droite de la boîte de réception', desc: 'Affichage classique à 3 panneaux' },
              { id: 'horizontal' as const, label: 'En dessous de la boîte', desc: 'Liste au-dessus, lecture en bas' },
            ].map((opt) => (
              <label
                key={opt.id}
                onClick={() => onChangeSplitView(opt.id)}
                className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  splitView === opt.id
                    ? 'border-[#0b57d0] bg-[#eaf1fb] dark:border-[#a8c7fa] dark:bg-[#004a77]/30'
                    : 'border-[#dadce0] dark:border-[#444746] hover:bg-[#f8f9fa] dark:hover:bg-[#282a2d]'
                }`}
              >
                <input
                  type="radio"
                  name="splitView"
                  checked={splitView === opt.id}
                  onChange={() => onChangeSplitView(opt.id)}
                  className="mt-1 accent-[#0b57d0]"
                />
                <div>
                  <p className="font-semibold text-xs text-[#1f1f1f] dark:text-[#e8eaed]">
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                    {opt.desc}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 4. Intégration n8n (Génération IA) */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5f6368] dark:text-[#9aa0a6] mb-2 flex items-center justify-between">
            <span>Workflow n8n (IA)</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold lowercase">Webhook</span>
          </h3>
          <div className="space-y-1.5">
            <input
              type="url"
              defaultValue={localStorage.getItem('n8n_reply_webhook_url') || ''}
              onChange={(e) => {
                localStorage.setItem('n8n_reply_webhook_url', e.target.value.trim());
              }}
              placeholder="https://.../webhook/generate-reply"
              className="w-full rounded-xl border border-[#dadce0] dark:border-[#444746] bg-transparent p-2.5 text-xs text-[#1f1f1f] dark:text-[#e8eaed] outline-none focus:border-[#0b57d0]"
            />
            <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] leading-relaxed">
              URL appelée directement en un clic lors de la génération de réponse par l'IA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
