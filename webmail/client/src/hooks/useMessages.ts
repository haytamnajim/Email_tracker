import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchMessages } from '../api';
import type { MessageSummary } from '../types';

export const PAGE_SIZE = 25;
/**
 * Actualisation automatique rapide (10 secondes) pour détecter les nouveaux emails quasi instantanément.
 */
const AUTO_REFRESH_MS = 10_000;
/** Au retour sur l'onglet, rafraîchir si absent depuis plus de 5s */
const MIN_HIDDEN_BEFORE_REFRESH = 5_000;
const SEARCH_DEBOUNCE_MS = 300;

export interface MessagesFilters {
  /** Saisie libre (le debounce de 300 ms est appliqué ici) */
  q: string;
  /** Filtres avancés, appliqués par le bouton « Appliquer » de l'en-tête */
  from: string;
  to: string;
  subject: string;
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
  const { q, from, to, subject, unread, flagged, attachments, sort } = filters;
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
  const criteria = useRef({ folder, search, from, to, subject, unread, flagged, attachments, sort });
  const knownUids = useRef<Set<number>>(new Set());

  // Les critères courants sont lus au moment de la requête : pas de closure périmée.
  criteria.current = { folder, search, from, to, subject, unread, flagged, attachments, sort };

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
    from: criteria.current.from || undefined,
    to: criteria.current.to || undefined,
    subject: criteria.current.subject || undefined,
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
      if (!mountedRef.current || id !== requestId.current) {
        // Requête évincée : on libère quand même l'indicateur, sinon la barre
        // de progression resterait bloquée à l'écran jusqu'au prochain succès.
        setLoading(false);
        return;
      }
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
      if (!mountedRef.current || id !== requestId.current) {
        // Même garde que dans reset : sinon le bouton « messages suivants »
        // resterait désactivé avec son spinner après un changement de dossier.
        setLoadingMore(false);
        return;
      }
      pagesRef.current = nextPage;
      setItems((current) => [...current, ...result.items]);
      setTotal(result.total);
      // Sans cet ajout, l'actualisation suivante redécouvrirait ces messages
      // comme s'ils étaient neufs et afficherait un faux bandeau.
      result.items.forEach((item) => knownUids.current.add(item.uid));
      setLoadingMore(false);
    } catch (err) {
      if (!mountedRef.current || id !== requestId.current) {
        setLoadingMore(false);
        return;
      }
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
  }, [folder, search, from, to, subject, unread, flagged, attachments, sort, reset]);

  // Actualisation automatique.
  //
  // Deux règles, qui suppriment le gaspillage relevé à l'audit :
  //  - jamais quand l'onglet est masqué : une session laissée ouverte la nuit
  //    interrogeait l'IMAP toutes les 30 s pour rien ;
  //  - au retour sur l'onglet, seulement si l'on a été absent suffisamment
  //    longtemps, sinon un simple Alt+Tab déclencherait un aller-retour IMAP.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    let hiddenAt = 0;

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      void refreshRef.current();
    }, AUTO_REFRESH_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      if (Date.now() - hiddenAt > MIN_HIDDEN_BEFORE_REFRESH) {
        void refreshRef.current();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
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

