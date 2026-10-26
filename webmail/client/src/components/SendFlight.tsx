import { createPortal } from 'react-dom';
import { Check, Send } from 'lucide-react';

export type SendPhase = 'idle' | 'flying' | 'sent';

interface SendFlightProps {
  /**
   * `idle` ne rend rien, `flying` joue le trajet complet (≈ 1,5 s),
   * `sent` laisse le couvercle refermé et affiche la validation.
   */
  phase: SendPhase;
}

/**
 * Animation d'envoi : un avion en papier décolle du bouton, décrit une
 * courbe, le couvercle de la boîte aux lettres se soulève, l'avion s'y
 * engouffre, une pulsation marque l'impact, puis « Envoyé » apparaît.
 *
 * Le minutage vit dans `index.css` (`sendPlaneFly`, `sendLidLift`,
 * `sendDoneIn`). Les délais du composant et ceux des images clés doivent
 * rester alignés : le parent se sert de `SEND_FLIGHT_MS` pour savoir
 * combien de temps laisser l'animation à l'écran.
 */
export const SEND_FLIGHT_MS = 1350;
export const SEND_DONE_MS = 700;

export default function SendFlight({ phase }: SendFlightProps) {
  if (phase === 'idle') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center"
      role="status"
      aria-live="polite"
    >
      {/* Voile : isole visuellement l'animation sans masquer totalement l'app */}
      <div className="send-flight__scrim absolute inset-0 bg-[#0b1220]/45 backdrop-blur-[3px]" />

      <div className="relative h-[200px] w-[360px]">
        {/* Halo coloré derrière la scène, pour la profondeur */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[220px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0b57d0]/12 blur-3xl dark:bg-[#a8c7fa]/12"
        />

        {/* ── Boîte aux lettres ── */}
        <div className="send-flight__box absolute right-4 top-11 h-[112px] w-[122px] text-[#0b57d0] dark:text-[#a8c7fa]">
          <svg viewBox="0 0 120 110" className="h-full w-full overflow-visible" aria-hidden="true">
            {/* Pied et socle */}
            <rect x="53" y="76" width="14" height="24" rx="4" fill="currentColor" opacity="0.25" />
            <rect x="38" y="96" width="44" height="8" rx="4" fill="currentColor" opacity="0.25" />

            {/* Corps */}
            <rect x="12" y="34" width="96" height="46" rx="14" fill="currentColor" />
            {/* Fente d'ouverture */}
            <rect x="24" y="42" width="72" height="14" rx="7" fill="#04101f" opacity="0.42" />
            {/* Reflet haut du corps */}
            <path
              d="M14 48h92"
              stroke="#ffffff"
              strokeOpacity="0.18"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Couvercle : c'est lui qui se soulève */}
            <g className="send-flight__lid">
              <rect x="12" y="18" width="96" height="18" rx="9" fill="currentColor" />
              <rect
                x="12"
                y="18"
                width="96"
                height="18"
                rx="9"
                fill="#ffffff"
                opacity="0.16"
              />
            </g>

            {/* Drapeau relevé */}
            <rect x="104" y="26" width="4" height="22" rx="2" fill="#f59e0b" />
            <path d="M108 26h11v9h-11z" fill="#f59e0b" />
          </svg>

          {/* Pulsation au moment où l'avion entre */}
          <span
            aria-hidden="true"
            className="send-flight__pulse absolute left-1/2 top-[54px] h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0b57d0]/35 dark:bg-[#a8c7fa]/30"
          />
        </div>

        {/* ── Avion en papier ── */}
        <div className="send-flight__plane absolute left-10 top-[132px] flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0b57d0] shadow-lg ring-1 ring-[#0b57d0]/20 dark:bg-[#1a1c1e] dark:text-[#a8c7fa] dark:ring-[#a8c7fa]/25">
          <Send className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
        </div>

        {/* ── Libellé : un seul message à la fois dans la région live ── */}
        {phase === 'sent' ? (
          <p className="send-flight__done absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 text-sm font-semibold text-[#6dd58c]">
            <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
            Envoyé
          </p>
        ) : (
          <p className="send-flight__pending absolute inset-x-0 bottom-0 text-center text-xs font-medium text-white/90">
            Envoi en cours…
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
