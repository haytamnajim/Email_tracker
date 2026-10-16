import type { Folder } from './types.ts';

/** Aperçu d'un message : texte sur une seule ligne, 120 caractères maximum. */
export function makePreview(text: string): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= 120) return oneLine;
  return `${oneLine.slice(0, 119)}…`;
}

/** Libellés français pour les dossiers standards. */
const LABELS: Record<string, string> = {
  inbox: 'Boîte de réception',
  sent: 'Envoyés',
  drafts: 'Brouillons',
  junk: 'Spam',
  spam: 'Spam',
  trash: 'Corbeille',
  archive: 'Archives',
  'sent items': 'Envoyés',
  'deleted items': 'Corbeille',
  'boîte de réception': 'Boîte de réception',
  'éléments envoyés': 'Envoyés',
  'courrier indésirable': 'Spam',
};

/** Traduit un chemin de dossier (ou un drapeau SPECIAL-USE) en libellé français. */
export function folderLabel(path: string, specialUse?: string): string {
  if (specialUse) {
    const map: Record<string, string> = {
      '\\Inbox': 'Boîte de réception',
      '\\Sent': 'Envoyés',
      '\\Drafts': 'Brouillons',
      '\\Junk': 'Spam',
      '\\Trash': 'Corbeille',
      '\\Archive': 'Archives',
      '\\All': 'Tous les messages',
    };
    if (map[specialUse]) return map[specialUse];
  }
  const normalized = path.split('/').pop()?.trim().toLowerCase() ?? '';
  return LABELS[normalized] ?? path.split('/').pop() ?? path;
}

/** Trie un dossier par son ordre d'affichage naturel (réception, envoyés, ...). */
export function folderSortValue(folder: Folder): number {
  const label = folder.label.toLowerCase();
  if (label.startsWith('boîte')) return 0;
  if (label.startsWith('envoy')) return 1;
  if (label.startsWith('brouillon')) return 2;
  if (label.startsWith('spam') || label.startsWith('courrier ind')) return 3;
  if (label.startsWith('corbeille') || label.startsWith('éléments supprimés')) return 4;
  return 5;
}
