import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchMessages } from '../api';
import type { MessageSummary } from '../types';

export const PAGE_SIZE = 25;
const AUTO_REFRESH_MS = 30_000;
const SEARCH_DEBOUNCE_MS = 300;

export interface MessagesFilters {
  /** Saisie brute de l'utilisateur (le debounce est appliqué ici) */
  q: string;
  unread: boolean;
  flagged: boolean;
  attachments: boolean;
  sort: 'desc' | 'asc';
}

/** Retarde une valeur jusqu'à ce que la saisie soit stabilisée. */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Liste paginée d'un dossier : recherche (debounce 300 ms), filtres,
 * tri par date, chargement progressif et actualisation automatique (30 s).
 */
export function useMessages(folder: string, filters: MessagesFilters) {
  const { q, unread, flagged, attachments, sort } = filters;
  const search = useDebouncedValue(q.trim(), SEARCH_DEBOUNCE_MS);

  const [items, setItems] = useState<MessageSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);
  const pagesRef = useRef(1);
  const mountedRef = useRef(true);
  const criteria = useRef({ folder, search, unread, flagged, attachments, sort });
  const knownUids = useRef<Set<number>>(new Set());

  // Les critères courants sont lus au moment de la requête : pas de closure périmée.
  criteria.current = { folder, search, unread, flagged, attachments, sort };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const buildQuery = (page: number) => ({
    folder: criteria.current.folder,
    page,
    limit: PAGE_SIZE,
    q: criteria.current.search || undefined,
    unread: criteria.current.unread || undefined,
    flagged: criteria.current.flagged || undefined,
    attachments: criteria.current.attachments || undefined,
    sort: criteria.current.sort,
  });

  /** Réinitialise la liste et charge la première page. */
  const reset = useCallback(async () => {
    const id = ++requestId.current;
    pagesRef.current = 1;
    setLoading(true);
    setError(null);
    setNewCount(0);
    try {
      const result = await fetchMessages(buildQuery(1));
      if (!mountedRef.current || id !== requestId.current) return;
      setItems(result.items);
      setTotal(result.total);
      setLoading(false);
      // Initialise les UIDs connus
      knownUids.current = new Set(result.items.map((i) => i.uid));
    } catch (err) {
      if (!mountedRef.current || id !== requestId.current) return;
      setItems([]);
      setTotal(0);
      setError(err instanceof ApiError ? err.message : 'Erreur inattendue.');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Charge la page suivante et l'ajoute à la liste. */
  const loadMore = useCallback(async () => {
    const id = ++requestId.current;
    const nextPage = pagesRef.current + 1;
    setLoadingMore(true);
    try {
      const result = await fetchMessages(buildQuery(nextPage));
      if (!mountedRef.current || id !== requestId.current) return;
      pagesRef.current = nextPage;
      setItems((current) => [...current, ...result.items]);
      setTotal(result.total);
      setLoadingMore(false);
    } catch (err) {
      if (!mountedRef.current || id !== requestId.current) return;
      setError(err instanceof ApiError ? err.message : 'Erreur inattendue.');
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Recharge toutes les pages déjà ouvertes : la sélection et le défilement sont conservés. */
  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    const pages = pagesRef.current;
    setRefreshing(true);
    try {
      const results = await Promise.all(
        Array.from({ length: pages }, (_, index) => fetchMessages(buildQuery(index + 1))),
      );
      if (!mountedRef.current || id !== requestId.current) return;
      const newItems = results.flatMap((result) => result.items);

      // Détection des nouveaux emails
      const incoming = newItems.filter((i) => !knownUids.current.has(i.uid));
      if (incoming.length > 0) {
        setNewCount((prev) => prev + incoming.length);
        incoming.forEach((i) => knownUids.current.add(i.uid));
      }

      setItems(newItems);
      setTotal(results[0]?.total ?? 0);
      setError(null);
    } catch (err) {
      // L'actualisation de fond n'efface jamais la liste déjà affichée.
      if (!mountedRef.current || id !== requestId.current) return;
      setError(err instanceof ApiError ? err.message : 'Erreur inattendue.');
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nouveaux critères => liste repart de zéro.
  useEffect(() => {
    void reset();
  }, [folder, search, unread, flagged, attachments, sort, reset]);

  // Actualisation automatique toutes les 30 secondes.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshRef.current();
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  return {
    items,
    total,
    loading,
    loadingMore,
    refreshing,
    newCount,
    clearNewCount: () => setNewCount(0),
    error,
    hasMore: items.length < total,
    reload: reset,
    loadMore,
    /** « Réessayer » : recharge la page courante sans réinitialiser la liste */
    retry: refresh,
  };
}

