import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { toneBackground, toneInk } from '../utils/colors';
import type { Tone } from '../utils/colors';

interface SectionHeadingProps {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  /** Élément complémentaire aligné à droite (badge, compteur…). */
  trailing?: ReactNode;
}

/**
 * Titre de section façon paramètres Material 3 :
 * pastille tonale arrondie portant une icône, suivi d'un titre lisible.
 * Remplace les titres en capitales grises, difficiles à lire en petit corps.
 */
export default function SectionHeading({ icon: Icon, tone, title, trailing }: SectionHeadingProps) {
  return (
    <div className="mb-2.5 flex items-center gap-2.5">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ background: toneBackground(tone), color: toneInk(tone) }}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#1f1f1f] dark:text-[#e8eaed]">
        {title}
      </h3>
      {trailing}
    </div>
  );
}
