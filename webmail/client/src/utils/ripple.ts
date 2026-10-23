import type { PointerEvent as ReactPointerEvent } from 'react';

/**
 * Onde de clic façon Material Design.
 *
 * On crée le nœud directement dans le DOM (sans setState) pour éviter un
 * re-render React à chaque clic — l'effet est purement cosmétique et n'a pas
 * besoin d'être dans le rendu déclaratif. Le nœud s'auto-supprime à la fin
 * de l'animation, donc aucune fuite de mémoire.
 *
 * L'élément hôte doit porter `position: relative` et `overflow: hidden`
 * (classe `ripple-host` dans index.css) pour que l'onde soit découpée aux
 * bords du composant, comme dans Material.
 */
export function spawnRipple(element: HTMLElement): void {
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;

  const wave = document.createElement('span');
  wave.className = 'ripple-wave';
  wave.style.width = `${size}px`;
  wave.style.height = `${size}px`;
  // L'onde part du point réel du clic, pas du centre.
  wave.style.left = `${element.offsetWidth / 2 - size / 2}px`;
  wave.style.top = `${element.offsetHeight / 2 - size / 2}px`;

  element.appendChild(wave);
  // `once` : le listener se retire tout seul après le premier déclenchement.
  wave.addEventListener('animationend', () => wave.remove(), { once: true });
}

/** À brancher sur `onPointerDown` d'un bouton portant la classe `ripple-host`. */
export function useRipple() {
  return (event: ReactPointerEvent<HTMLElement>) => {
    // Seul le bouton principal déclenche : pas de vague sur clic molette/externe.
    if (event.button !== 0) return;
    spawnRipple(event.currentTarget);
  };
}
