import { createPortal } from 'react-dom';
import { Check, Send } from 'lucide-react';

export type SendPhase = 'idle' | 'flying' | 'sent';

interface SendFlightProps {
  phase: SendPhase;
}

export const SEND_FLIGHT_MS = 1350;
export const SEND_DONE_MS = 700;

export default function SendFlight({ phase }: SendFlightProps) {
  if (phase === 'idle') return null;

  const isSent = phase === 'sent';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none select-none"
      role="status"
      aria-live="polite"
    >
      {/* Voile d'arrière-plan avec flou doux */}
      <div className="send-flight__scrim absolute inset-0 bg-black/40 backdrop-blur-[3px]" />

      {/* Carte conteneur bien structurée */}
      <div className="relative w-[340px] max-w-[92vw] overflow-hidden rounded-3xl bg-white/95 dark:bg-[#1e1f22]/95 border border-[#dadce0]/80 dark:border-[#3c4043]/80 p-5 shadow-2xl backdrop-blur-md animate-fade-slide">
        {/* Halo de fond subtil */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-28 w-44 rounded-full bg-[#0b57d0]/12 blur-2xl dark:bg-[#a8c7fa]/12"
        />

        {/* 1. En-tête structuré */}
        <div className="flex items-center justify-between border-b border-[#e0e2e7]/70 dark:border-[#3c4043]/70 pb-2.5 mb-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-[#5f6368] dark:text-[#9aa0a6]">
            {isSent ? 'Confirmation' : 'Transmission'}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${
            isSent
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isSent ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`} />
            {isSent ? 'Succès' : 'En direct'}
          </span>
        </div>

        {/* 2. Scène de l'animation (avion + boîte aux lettres) */}
        <div className="relative h-[135px] w-full flex items-center justify-center">
          {/* Boîte aux lettres */}
          <div className="send-flight__box absolute right-3 top-3 h-[90px] w-[100px] text-[#0b57d0] dark:text-[#a8c7fa]">
            <svg viewBox="0 0 120 110" className="h-full w-full overflow-visible" aria-hidden="true">
              {/* Pied et socle */}
              <rect x="53" y="76" width="14" height="24" rx="4" fill="currentColor" opacity="0.25" />
              <rect x="38" y="96" width="44" height="8" rx="4" fill="currentColor" opacity="0.25" />

              {/* Corps */}
              <rect x="12" y="34" width="96" height="46" rx="14" fill="currentColor" />
              {/* Fente */}
              <rect x="24" y="42" width="72" height="14" rx="7" fill="#04101f" opacity="0.45" />
              {/* Reflet */}
              <path
                d="M14 48h92"
                stroke="#ffffff"
                strokeOpacity="0.22"
                strokeWidth="2"
                strokeLinecap="round"
              />

              {/* Couvercle */}
              <g className="send-flight__lid">
                <rect x="12" y="18" width="96" height="18" rx="9" fill="currentColor" />
                <rect
                  x="12"
                  y="18"
                  width="96"
                  height="18"
                  rx="9"
                  fill="#ffffff"
                  opacity="0.18"
                />
              </g>

              {/* Drapeau */}
              <rect x="104" y="26" width="4" height="22" rx="2" fill="#f59e0b" />
              <path d="M108 26h11v9h-11z" fill="#f59e0b" />
            </svg>

            {/* Pulsation à l'impact */}
            <span
              aria-hidden="true"
              className="send-flight__pulse absolute left-1/2 top-[46px] h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0b57d0]/35 dark:bg-[#a8c7fa]/30"
            />
          </div>

          {/* Avion en papier */}
          <div className="send-flight__plane absolute left-4 top-[82px] flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#0b57d0] shadow-md ring-1 ring-black/5 dark:bg-[#2b2d30] dark:text-[#a8c7fa] dark:ring-white/10">
            <Send className="h-4.5 w-4.5" strokeWidth={2.2} aria-hidden="true" />
          </div>
        </div>

        {/* 3. Pied de carte avec statut bien lisible */}
        <div className="pt-2 border-t border-[#e0e2e7]/70 dark:border-[#3c4043]/70 text-center">
          {isSent ? (
            <p className="send-flight__done inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Check className="h-4 w-4 stroke-[3]" aria-hidden="true" />
              <span>Email envoyé avec succès !</span>
            </p>
          ) : (
            <p className="send-flight__pending text-xs font-medium text-[#444746] dark:text-[#c4c7c5]">
              Envoi du message en cours…
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
