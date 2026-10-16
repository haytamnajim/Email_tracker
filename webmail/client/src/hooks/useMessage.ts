import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchMessage } from '../api';
import type { MessageDetail } from '../types';

/** Message complet (corps texte/HTML + pièces jointes). */
export function useMessage(uid: number | null, folder: string) {
  const [message, setMessage] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const requestId = useRef(0);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  useEffect(() => {
    if (uid === null) {
      setMessage(null);
      setError(null);
      setLoading(false);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    fetchMessage(uid, folder)
      .then((result) => {
        if (id !== requestId.current) return;
        setMessage(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (id !== requestId.current) return;
        setMessage(null);
        setError(err instanceof ApiError ? err.message : 'Erreur inattendue.');
        setLoading(false);
      });

    return () => {
      // Annule la prise en compte d'une réponse obsolète.
    };
  }, [uid, folder, version]);

  return { message, loading, error, reload };
}
