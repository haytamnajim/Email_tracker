import { useEffect } from 'react';
import { X, Navigation, Zap, Reply, Keyboard } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Tone } from '../utils/colors';
import { useRipple } from '../utils/ripple';
import SectionHeading from './SectionHeading';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Raccourcis groupés par intention plutôt qu'en liste plate.
 * Une seule touche par touche : `j` et `↓` sont deux touches distinctes et non
 * un libellé « j / ↓ » — sinon la mise en forme ne reflète plus ce que l'on
 * tape réellement.
 */
const GROUPS: Array<{
  title: string;
  icon: LucideIcon;
  tone: Tone;
  items: Array<{ keys: string[]; desc: string }>;
}> = [
  {
    title: 'Navigation',
    icon: Navigation,
    tone: 'blue',
    items: [
      { keys: ['j', '↓'], desc: 'Message suivant' },
      { keys: ['k', '↑'], desc: 'Message précédent' },
      { keys: ['/'], desc: 'Rechercher dans les messages' },
    ],
  },
  {
    title: 'Actions sur le message',
    icon: Zap,
    tone: 'amber',
    items: [
      { keys: ['e'], desc: 'Archiver' },
      { keys: ['s'], desc: 'Ajouter ou retirer des favoris' },
      { keys: ['#'], desc: 'Supprimer' },
    ],
  },
  {
    title: 'Réponse',
    icon: Reply,
    tone: 'green',
    items: [
      { keys: ['r'], desc: 'Répondre' },
      { keys: ['a'], desc: 'Répondre à tous' },
      { keys: ['f'], desc: 'Transférer' },
    ],
  },
  {
    title: 'Général',
    icon: Keyboard,
    tone: 'purple',
    items: [
      { keys: ['c'], desc: 'Rédiger un nouveau message' },
      { keys: ['Esc'], desc: 'Fermer la vue ou la fenêtre' },
      { keys: ['?'], desc: 'Afficher cette aide' },
    ],
  },
];

const GROUP_STEP = 45;

/** Touche rendue comme un capuchon de clavier, une par touche physique. */
function Keycap({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-md border border-[#dadce0] bg-white px-1.5 font-mono text-[11px] font-semibold text-[#0b57d0] shadow-[0_1px_0_rgba(60,64,67,0.25)] dark:border-[#5f6368] dark:bg-[#2b2d30] dark:text-[#a8c7fa] dark:shadow-[0_1px_0_rgba(0,0,0,0.6)]">
      {children}
    </kbd>
  );
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const ripple = useRipple();

  // Échap géré localement : le raccourci doit fermer ce dialogue même si le
  // gestionnaire global d'App n'est pas dans le même état.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* ── Voile : fondu séparé du panneau, clic pour fermer ── */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="animate-scrim-in absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* ── Dialogue ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Raccourcis clavier"
        className="animate-modal-in relative flex max-h-[86vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#e0e2e7] bg-white shadow-2xl dark:border-[#3c4043] dark:bg-[#202124]"
      >
        {/* ── En-tête ── */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#e0e2e7] px-6 dark:border-[#3c4043]">
          <div>
            <h3 className="text-[15px] font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">
              Raccourcis clavier
            </h3>
            <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
              Naviguez sans quitter le clavier
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer les raccourcis"
            className="ripple-host flex h-9 w-9 items-center justify-center rounded-full text-[#5f6368] transition-[background-color,transform] hover:bg-black/5 active:scale-[0.95] dark:text-[#9aa0a6] dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Groupes de raccourcis ── */}
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {GROUPS.map((group, index) => (
            <section
              key={group.title}
              className="animate-fade-slide"
              style={{ animationDelay: `${index * GROUP_STEP}ms` }}
            >
              <SectionHeading icon={group.icon} tone={group.tone} title={group.title} />
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <div
                    key={item.desc}
                    className="flex items-center justify-between gap-4 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#f1f3f4] dark:hover:bg-[#2b2d30]"
                  >
                    <span className="min-w-0 truncate text-xs text-[#444746] dark:text-[#c4c7c5]">
                      {item.desc}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {item.keys.map((key) => (
                        <Keycap key={key}>{key}</Keycap>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* ── Pied ── */}
        <div className="flex shrink-0 justify-end border-t border-[#e0e2e7] bg-[#f8f9fa] px-6 py-3 dark:border-[#3c4043] dark:bg-[#282a2d]">
          <button
            type="button"
            onClick={onClose}
            onPointerDown={ripple}
            className="ripple-host rounded-full bg-[#0b57d0] px-5 py-1.5 text-xs font-semibold text-white transition-[background-color,transform] hover:bg-[#0842a0] active:scale-[0.97]"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
}
