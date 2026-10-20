/**
 * Couleurs de marque Google, réparties par usage.

 * Les valeurs sont choisies pour rester lisibles dans les deux thèmes :
 *  - pastilles d'avatar  : fond sombre + initiales blanches (≥ 4,5:1)
 *  - icônes et accents   : teintes pleines sur blanc (≥ 3:0:1) et sur #111111
 *  - fonds teintés       : toujours associés au jeton d'encre correspondant
 */

export type Tone = 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'cyan';

const TONES: Tone[] = ['blue', 'green', 'amber', 'red', 'purple', 'cyan'];

/** Variable CSS d'une teinte pleine (icône, étoile, lien…). */
export function toneColor(tone: Tone): string {
  return `var(--tone-${tone})`;
}

/** Variable CSS du fond teinté d'une teinte. */
export function toneBackground(tone: Tone): string {
  return `var(--tone-${tone}-bg)`;
}

/** Variable CSS de l'encre lisible sur le fond teinté. */
export function toneInk(tone: Tone): string {
  return `var(--tone-${tone}-ink)`;
}

/* ──────────────────────────────────────────────────────────────
   Dossiers : une teinte par type, puis une teinte déterministe
   pour les dossiers de l'utilisateur (étiquettes IMAP perso).
   ────────────────────────────────────────────────────────────── */

export function folderTone(id: string): Tone {
  const lower = id.toLowerCase();

  if (lower === 'inbox') return 'blue';
  if (lower.includes('sent') || lower.includes('envoy')) return 'green';
  if (lower.includes('draft') || lower.includes('brouillon')) return 'amber';
  if (lower.includes('trash') || lower.includes('corbeille') || lower.includes('deleted'))
    return 'cyan';
  if (lower.includes('spam') || lower.includes('junk')) return 'red';
  if (lower.includes('star') || lower.includes('toile') || lower.includes('important'))
    return 'amber';
  if (lower.includes('archive') || lower.includes('archives')) return 'purple';

  return hashTone(id);
}

/* ──────────────────────────────────────────────────────────────
   Pièces jointes : teinte selon le type MIME, avec repli sur
   l'extension quand le serveur ne fournit pas de type exploitable.
   ────────────────────────────────────────────────────────────── */

export function attachmentTone(contentType: string, filename: string): Tone {
  const type = (contentType || '').toLowerCase();
  const name = (filename || '').toLowerCase();

  if (type.startsWith('image/')) return 'green';
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'red';
  if (type.startsWith('video/') || type.startsWith('audio/')) return 'purple';
  if (type.startsWith('text/') || /\.(docx?|txt|odt|rtf|md|csv|xls[xm]?)$/.test(name)) return 'blue';
  if (type.includes('zip') || type.includes('compress') || /\.(zip|rar|7z|tar|gz)$/.test(name))
    return 'amber';

  return 'cyan';
}

/* ──────────────────────────────────────────────────────────────
   Avatars d'expéditeur : la pastille est en dégradé, les initiales
   sont toujours en blanc sur un fond suffisamment sombre.
   ────────────────────────────────────────────────────────────── */

/** [fond clair, fond sombre] — blanc relève à ≥ 4,5:1 sur le fond clair. */
const AVATAR_GRADIENTS: Array<[string, string]> = [
  ['#1a73e8', '#174ea6'],
  ['#d93025', '#a50e0e'],
  ['#188038', '#0d652d'],
  ['#b06000', '#7d4600'],
  ['#8430ce', '#5b1f9a'],
  ['#007b83', '#00565c'],
];

/** Dégradé déterministe : le même expéditeur garde toujours la même pastille. */
export function senderGradient(seed: string): string {
  const [from, to] = AVATAR_GRADIENTS[hashIndex(seed, AVATAR_GRADIENTS.length)];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

/** Initiales de l'expéditeur : deux lettres si possible, sinon deux caractères. */
export function senderInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || '?';
}

/* ────────────────────────────────────────────────────────────── */

function hashIndex(seed: string, modulo: number): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) & 0xffff;
  }
  return hash % modulo;
}

function hashTone(seed: string): Tone {
  return TONES[hashIndex(seed, TONES.length)];
}
