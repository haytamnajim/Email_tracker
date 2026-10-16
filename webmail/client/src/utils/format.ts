import type { Address } from '../types';

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/** Date relative en français : « il y a 2 h », « hier », « 12/03/2026 ». */
export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const elapsed = Date.now() - date.getTime();
  if (elapsed < MINUTE) return "à l'instant";
  if (elapsed < HOUR) return `il y a ${Math.floor(elapsed / MINUTE)} min`;
  if (elapsed < DAY) return `il y a ${Math.floor(elapsed / HOUR)} h`;
  if (elapsed < 2 * DAY) return 'hier';
  if (elapsed < 7 * DAY) return `il y a ${Math.floor(elapsed / DAY)} j`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Date complète en français pour le panneau de lecture. */
export function formatFullDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Taille lisible d'une pièce jointe. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} mo`;
}

/** Affichage d'une adresse : nom seul, adresse seule, ou les deux. */
export function formatAddress(address?: Address): string {
  if (!address) return '';
  if (address.name && address.address) return `${address.name} <${address.address}>`;
  return address.name ?? address.address ?? '';
}

/** Affichage d'une liste d'adresses. */
export function formatAddressList(list: Address[]): string {
  return list.map(formatAddress).filter(Boolean).join(', ');
}
