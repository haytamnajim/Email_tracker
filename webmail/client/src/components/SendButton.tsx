import { Loader2, Send } from 'lucide-react';

interface SendButtonProps {
  type?: 'button' | 'submit';
  onClick?: () => void;
  /** Bloque le clic quand le formulaire est incomplet. */
  disabled?: boolean;
  /** Envoi en cours : spinner et libellé d'attente, bouton verrouillé. */
  loading?: boolean;
  label?: string;
  loadingLabel?: string;
  className?: string;
}

/**
 * Bouton d'envoi partagé par la réponse en ligne et la fenêtre de rédaction.
 *
 * Trois choix de structure, chacun corrigeant un défaut du bouton précédent :
 *
 * - **Largeur plancher** : « Envoyer » et « Envoi… » n'ont pas la même
 *   longueur ; sans plancher, le bouton rétrécissait pendant la requête, au
 *   moment précis où l'utilisateur le regarde.
 * - **État désactivé neutre** (gris) au lieu d'un bleu translucide : un bouton
 *   bleu pâle se confond avec un bouton actif mal rendu.
 * - **Hauteur fixe de 36 px** alignée sur les boutons secondaires voisins :
 *   plus de désalignement entre « Envoyer » et « Ignorer ».
 *
 * Pendant l'envoi, le fond reste bleu : l'action est en cours, pas désactivée.
 */
export default function SendButton({
  type = 'button',
  onClick,
  disabled = false,
  loading = false,
  label = 'Envoyer',
  loadingLabel = 'Envoi…',
  className = '',
}: SendButtonProps) {
  // Pendant l'envoi le bouton est verrouillé mais garde son identité visuelle.
  const inactive = disabled && !loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex h-9 min-w-[124px] shrink-0 items-center justify-center gap-2 rounded-full px-5 text-[12.5px] font-semibold tracking-[0.01em] shadow-sm transition-[background-color,box-shadow,color] duration-150 active:shadow-none disabled:cursor-not-allowed disabled:shadow-none ${
        inactive
          ? 'bg-[#e8eaed] text-[#80868b] dark:bg-[#2d2f31] dark:text-[#6b7280]'
          : 'bg-[#0b57d0] text-white hover:bg-[#0842a0] hover:shadow-md active:bg-[#06318b] dark:bg-[#a8c7fa] dark:text-[#041e49] dark:hover:bg-[#8ab4f8] dark:active:bg-[#9ec2fb]'
      } ${className}`}
    >
      {loading ? (
        <Loader2
          className="h-4 w-4 shrink-0 animate-spin"
          strokeWidth={2.4}
          aria-hidden="true"
        />
      ) : (
        <Send className="h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
      )}
      <span className="whitespace-nowrap">{loading ? loadingLabel : label}</span>
    </button>
  );
}
