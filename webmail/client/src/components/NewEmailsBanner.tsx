import { RefreshCw } from 'lucide-react';

interface NewEmailsBannerProps {
  /** Nombre de nouveaux emails détectés */
  count: number;
  onRefresh: () => void;
  /** Variante compacte pour les vues en séparation (hauteur réduite) */
  compact?: boolean;
}

/**
 * Bannière « X nouveaux messages » façon Gmail :
 * pilule bleue Material, icône rafraîchissement (rotation au survol),
 * animation d'entrée douce + halo pulsé (animate-banner dans index.css).
 */
export default function NewEmailsBanner({ count, onRefresh, compact = false }: NewEmailsBannerProps) {
  const plural = count > 1;

  return (
    <button
      type="button"
      onClick={onRefresh}
      aria-label={`${count} nouveau${plural ? 'x' : ''} message${plural ? 's' : ''}, cliquer pour actualiser`}
      className={`group mx-3 mb-1 flex items-center justify-center gap-2.5 rounded-full shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98] animate-banner ${
        compact ? 'px-4 py-1.5' : 'px-5 py-2'
      } bg-[#0b57d0] text-white hover:bg-[#0842a0] dark:bg-[#a8c7fa] dark:text-[#001d35] dark:hover:bg-[#8ab4f8]`}
    >
      {/* Icône : rotation d'un tour au survol (sens « rafraîchir ») */}
      <RefreshCw
        aria-hidden="true"
        className={`shrink-0 transition-transform duration-500 ease-out group-hover:rotate-180 ${
          compact ? 'h-3.5 w-3.5' : 'h-4 w-4'
        }`}
      />

      <span className="text-xs font-semibold tracking-tight">
        {count} nouveau{plural ? 'x' : ''} message{plural ? 's' : ''}
      </span>

      <span
        aria-hidden="true"
        className="hidden sm:inline text-xs font-medium opacity-80 before:mr-2.5 before:content-['—']"
      >
        Cliquer pour actualiser
      </span>
    </button>
  );
}
