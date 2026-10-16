import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchFolders } from '../api';
import type { Folder } from '../types';

/** Liste des dossiers avec leur nombre de non lus. */
export function useFolders(enabled: boolean) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFolders();
      if (id !== requestId.current) return;
      setFolders(result);
      setLoading(false);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof ApiError ? err.message : 'Erreur inattendue.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void load();
  }, [enabled, load]);

  return { folders, loading, error, reload: load };
}
