import { RefreshCw, ArrowUp } from 'lucide-react';

interface NewEmailsBannerProps {
  /** Nombre de nouveaux emails détectés */
  count: number;
  onRefresh: () => void;
  /** Variante compacte pour les vues en séparation */
  compact?: boolean;
}

/**
 * Bannière moderne « Nouveaux messages » façon Gmail Material 3 :
 * Pilule flottante centrée, harmonieuse en thème sombre et clair,
 * animation fluide, puce pulsante et action nette d'actualisation.
 */
export default function NewEmailsBanner({ count, onRefresh, compact = false }: NewEmailsBannerProps) {
  const plural = count > 1;

  return (
    <div className="flex w-full justify-center px-4 py-1.5 z-10 select-none animate-fade-slide">
      <button
        type="button"
        onClick={onRefresh}
        aria-label={`${count} nouveau${plural ? 'x' : ''} message${plural ? 's' : ''}, cliquer pour actualiser`}
        className={`group inline-flex items-center gap-2.5 rounded-full border transition-all duration-200 active:scale-[0.97] cursor-pointer shadow-sm hover:shadow-md ${
          compact ? 'px-3.5 py-1 text-xs' : 'px-4 py-1.5 text-xs'
        } bg-[#edf2fa] hover:bg-[#d3e3fd] text-[#0b57d0] border-[#c2e7ff] dark:bg-[#131f33] dark:hover:bg-[#1a2b47] dark:text-[#a8c7fa] dark:border-[#004a77]/70`}
      >
        {/* Puce animée de notification */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0b57d0] dark:bg-[#a8c7fa] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0b57d0] dark:bg-[#a8c7fa]" />
        </span>

        {/* Nombre de nouveaux messages */}
        <span className="font-semibold tracking-tight">
          {count} nouveau{plural ? 'x' : ''} email{plural ? 's' : ''}
        </span>

        {/* Séparateur discret */}
        <span className="h-3 w-[1px] bg-[#c2e7ff] dark:bg-[#004a77]" aria-hidden="true" />

        {/* Bouton d'action avec icône */}
        <span className="inline-flex items-center gap-1 font-medium group-hover:underline">
          <span>Actualiser</span>
          <RefreshCw
            aria-hidden="true"
            className="h-3 w-3 shrink-0 transition-transform duration-500 ease-out group-hover:rotate-180"
          />
        </span>
      </button>
    </div>
  );
}
