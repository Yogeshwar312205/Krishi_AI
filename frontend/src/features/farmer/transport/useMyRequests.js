import { useCallback, useEffect, useState } from 'react';
import { fetchMyRequests } from '../../../services/api';

/**
 * The farmer's own pickup requests, from the server.
 *
 * Scoped server-side to the signed-in farmer. No seed and no fallback: a farmer
 * has to be able to trust that what this list shows is what a fleet owner can
 * see, and an invented row would mean waiting at the gate for a truck nobody
 * was ever asked to send.
 */
export const useMyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await fetchMyRequests());
    } catch (err) {
      setError(err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { requests, loading, error, refresh };
};
