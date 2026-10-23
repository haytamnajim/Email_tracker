import { X, Check, Rows3, Palette, PanelLeft, Workflow } from 'lucide-react';
import type { DisplayDensity } from './MessageItem';
import type { SplitViewMode } from './TopToolbar';
import type { Theme } from '../types';
import { useRipple } from '../utils/ripple';
import SectionHeading from './SectionHeading';

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

/** Cascade entre les sections du tiroir, comme pour les lignes de la liste. */
const SECTION_STEP = 45;

/* ──────────────────────────────────────────────────────────────
   Aperçus graphiques : dans un panneau de réglages Material 3,
   on montre le résultat plutôt que de le décrire en texte.
   ────────────────────────────────────────────────────────────── */

/** Lignes horizontales dont l'espacement traduit la densité choisie. */
function DensityGlyph({ count, step }: { count: number; step: number }) {
  return (
    <svg viewBox="0 0 26 24" className="h-6 w-[26px] shrink-0" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <rect
          key={index}
          x="0"
          y={1 + index * step}
          width="26"
          height="2"
          rx="1"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

/** Vignette miniature de l'interface, claire ou sombre. */
function ThemePreview({ dark }: { dark: boolean }) {
  const page = dark ? '#1f1f1f' : '#ffffff';
  const rail = dark ? '#2b2d30' : '#f1f3f4';
  const strong = dark ? '#e8eaed' : '#5f6368';
  const weak = dark ? '#9aa0a6' : '#c4c7c5';

  return (
    <svg
      viewBox="0 0 48 32"
      aria-hidden="true"
      className="h-8 w-12 shrink-0 rounded-[5px] border border-black/10 shadow-xs dark:border-white/10"
    >
      <rect width="48" height="32" fill={page} />
      <rect width="13" height="32" fill={rail} />
      {/* Accent bleu = la sélection, dans les deux thèmes */}
      <rect x="2.5" y="8" width="8" height="2.5" rx="1.25" fill="#0b57d0" />
      <rect x="17" y="7" width="25" height="2.5" rx="1.25" fill={strong} />
      <rect x="17" y="13.5" width="17" height="2.5" rx="1.25" fill={weak} />
      <rect x="17" y="20" width="25" height="2.5" rx="1.25" fill={strong} />
      <rect x="17" y="26.5" width="14" height="2.5" rx="1.25" fill={weak} />
    </svg>
  );
}

/** Schéma de la disposition : liste seule, à côté, ou en dessous. */
function SplitGlyph({ mode }: { mode: SplitViewMode }) {
  const page = '#ffffff';
  const rail = '#f1f3f4';
  const line = '#c4c7c5';

  return (
    <svg
      viewBox="0 0 48 32"
      aria-hidden="true"
      className="h-8 w-12 shrink-0 rounded-[5px] border border-black/10 bg-white shadow-xs dark:border-white/10"
    >
      <rect width="48" height="32" fill={page} />
      {mode === 'none' ? (
        <>
          <rect x="0" y="0" width="48" height="32" fill={page} />
          <rect x="5" y="7" width="30" height="2.5" rx="1.25" fill={line} />
          <rect x="5" y="14.5" width="38" height="2.5" rx="1.25" fill={line} />
          <rect x="5" y="22" width="24" height="2.5" rx="1.25" fill={line} />
        </>
      ) : mode === 'vertical' ? (
        <>
          <rect x="0" y="0" width="28" height="32" fill={rail} />
          <rect x="4" y="7" width="18" height="2.5" rx="1.25" fill={line} />
          <rect x="4" y="14.5" width="14" height="2.5" rx="1.25" fill={line} />
          <rect x="4" y="22" width="18" height="2.5" rx="1.25" fill={line} />
          {/* Le volet de lecture est accentué pour se distinguer */}
          <rect x="32" y="7" width="12" height="2.5" rx="1.25" fill="#0b57d0" />
          <rect x="32" y="14.5" width="9" height="2.5" rx="1.25" fill={line} />
        </>
      ) : (
        <>
          <rect x="0" y="0" width="48" height="18" fill={rail} />
          <rect x="5" y="5" width="26" height="2.5" rx="1.25" fill={line} />
          <rect x="5" y="11" width="34" height="2.5" rx="1.25" fill={line} />
          <rect x="5" y="22" width="14" height="2.5" rx="1.25" fill="#0b57d0" />
          <rect x="5" y="28" width="22" height="2" rx="1" fill={line} />
        </>
      )}
    </svg>
  );
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
  const ripple = useRipple();

  if (!isOpen) return null;

  const sectionDelay = (index: number) => ({ animationDelay: `${index * SECTION_STEP}ms` });

  const optionClass = (selected: boolean) =>
    `ripple-host animate-fade-slide flex w-full items-center gap-3 rounded-xl p-2 pr-3 text-left cursor-pointer transition-[background-color,border-color,box-shadow] ${
      selected
        ? 'bg-[#eaf1fb] shadow-[inset_0_0_0_1px_#0b57d0] dark:bg-[#004a77]/40 dark:shadow-[inset_0_0_0_1px_#a8c7fa]'
        : 'hover:bg-[#f1f3f4] dark:hover:bg-[#2b2d30]'
    }`;

  return (
    <>
      {/* ── Voile : assombrit l'interface derrière et ferme au clic extérieur ── */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="animate-scrim-in fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
      />

      {/* ── Tiroir : coins arrondis seulement côté contenu ── */}
      <aside
        aria-label="Configuration rapide"
        className="animate-drawer-in fixed inset-y-0 right-0 z-50 flex w-[340px] select-none flex-col rounded-l-2xl border-l border-[#e0e2e7] bg-white shadow-2xl dark:border-[#3c4043] dark:bg-[#202124]"
      >
        {/* ── En-tête ── */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#e0e2e7] px-5 dark:border-[#3c4043]">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">
              Configuration rapide
            </h2>
            <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
              Apparence et disposition
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer les paramètres"
            className="ripple-host flex h-9 w-9 items-center justify-center rounded-full text-[#5f6368] transition-[background-color,transform] hover:bg-black/5 active:scale-[0.95] dark:text-[#9aa0a6] dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Corps des réglages ── */}
        <div className="flex-1 space-y-7 overflow-y-auto p-5 pb-8 text-sm">
          {/* 1. Densité d'affichage */}
          <section style={sectionDelay(0)} className="animate-fade-slide">
            <SectionHeading icon={Rows3} tone="blue" title="Densité d'affichage" />
            <div role="radiogroup" aria-label="Densité d'affichage" className="space-y-1">
              {[
                { id: 'default' as const, label: 'Par défaut', desc: 'Aperçus des pièces jointes', glyph: { count: 3, step: 8 } },
                { id: 'comfortable' as const, label: 'Confortable', desc: 'Espacement équilibré', glyph: { count: 3, step: 10 } },
                { id: 'compact' as const, label: 'Compact', desc: 'Plus de messages à l\'écran', glyph: { count: 4, step: 6 } },
              ].map((opt) => (
                <label
                  key={opt.id}
                  onClick={() => onChangeDensity(opt.id)}
                  onPointerDown={ripple}
                  className={optionClass(density === opt.id)}
                >
                  <input
                    type="radio"
                    name="density"
                    checked={density === opt.id}
                    onChange={() => onChangeDensity(opt.id)}
                    className="sr-only"
                  />
                  <span className={density === opt.id ? 'text-[#0b57d0] dark:text-[#a8c7fa]' : 'text-[#5f6368] dark:text-[#9aa0a6]'}>
                    <DensityGlyph count={opt.glyph.count} step={opt.glyph.step} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-[#1f1f1f] dark:text-[#e8eaed]">
                      {opt.label}
                    </span>
                    <span className="block truncate text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                      {opt.desc}
                    </span>
                  </span>
                  <Check
                    className={`h-4 w-4 shrink-0 transition-opacity ${
                      density === opt.id ? 'text-[#0b57d0] opacity-100 dark:text-[#a8c7fa]' : 'opacity-0'
                    }`}
                    aria-hidden="true"
                  />
                </label>
              ))}
            </div>
          </section>

          {/* 2. Thème */}
          <section style={sectionDelay(1)} className="animate-fade-slide">
            <SectionHeading icon={Palette} tone="amber" title="Thème" />
            <div role="radiogroup" aria-label="Thème de l'interface" className="grid grid-cols-2 gap-2">
              {[
                { id: 'light' as const, label: 'Clair' },
                { id: 'dark' as const, label: 'Sombre' },
              ].map((opt) => {
                const selected = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeTheme(opt.id)}
                    aria-pressed={selected}
                    onPointerDown={ripple}
                    className={`ripple-host animate-fade-slide flex flex-col items-center gap-2 rounded-xl p-2.5 transition-[background-color,box-shadow] ${
                      selected
                        ? 'bg-[#eaf1fb] shadow-[inset_0_0_0_1px_#0b57d0] dark:bg-[#004a77]/40 dark:shadow-[inset_0_0_0_1px_#a8c7fa]'
                        : 'hover:bg-[#f1f3f4] dark:hover:bg-[#2b2d30]'
                    }`}
                  >
                    <ThemePreview dark={opt.id === 'dark'} />
                    <span className="flex items-center gap-1 text-[12px] font-medium text-[#1f1f1f] dark:text-[#e8eaed]">
                      {opt.label}
                      <Check
                        className={`h-3.5 w-3.5 ${
                          selected ? 'text-[#0b57d0] dark:text-[#a8c7fa]' : 'opacity-0'
                        }`}
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3. Volet de lecture */}
          <section style={sectionDelay(2)} className="animate-fade-slide">
            <SectionHeading icon={PanelLeft} tone="green" title="Volet de lecture" />
            <div role="radiogroup" aria-label="Disposition du volet de lecture" className="grid grid-cols-3 gap-2">
              {[
                { id: 'none' as const, label: 'Aucun' },
                { id: 'vertical' as const, label: 'À droite' },
                { id: 'horizontal' as const, label: 'En bas' },
              ].map((opt) => {
                const selected = splitView === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeSplitView(opt.id)}
                    aria-pressed={selected}
                    onPointerDown={ripple}
                    className={`ripple-host animate-fade-slide flex flex-col items-center gap-2 rounded-xl p-2 transition-[background-color,box-shadow] ${
                      selected
                        ? 'bg-[#eaf1fb] shadow-[inset_0_0_0_1px_#0b57d0] dark:bg-[#004a77]/40 dark:shadow-[inset_0_0_0_1px_#a8c7fa]'
                        : 'hover:bg-[#f1f3f4] dark:hover:bg-[#2b2d30]'
                    }`}
                  >
                    <SplitGlyph mode={opt.id} />
                    <span className="text-[11px] font-medium text-[#1f1f1f] dark:text-[#e8eaed]">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 4. Intégration n8n (Génération IA) */}
          <section style={sectionDelay(3)} className="animate-fade-slide">
            <SectionHeading icon={Workflow} tone="purple" title="Workflow n8n (IA)" />
            <div className="space-y-2">
              <input
                type="url"
                aria-label="URL du webhook n8n"
                defaultValue={localStorage.getItem('n8n_reply_webhook_url') || ''}
                onChange={(e) => {
                  localStorage.setItem('n8n_reply_webhook_url', e.target.value.trim());
                }}
                placeholder="https://.../webhook/generate-reply"
                className="w-full rounded-xl border border-[#dadce0] bg-[#f8f9fa] p-2.5 text-xs text-[#1f1f1f] outline-none transition-[border-color,box-shadow,background-color] focus:border-[#0b57d0] focus:bg-white focus:ring-2 focus:ring-[#0b57d0]/25 dark:border-[#444746] dark:bg-[#1f1f1f] dark:text-[#e8eaed] dark:focus:border-[#a8c7fa] dark:focus:bg-[#1a1a1a] dark:focus:ring-[#a8c7fa]/25"
              />
              <p className="text-[11px] leading-relaxed text-[#5f6368] dark:text-[#9aa0a6]">
                Appelée en un clic lors de la génération d'une réponse par l'IA.
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f4ea] px-2 py-0.5 text-[10px] font-semibold text-[#137333] dark:bg-[#0d3b24] dark:text-[#6dd58c]">
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                Webhook
              </span>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
