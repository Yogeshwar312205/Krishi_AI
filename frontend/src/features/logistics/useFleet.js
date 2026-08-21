import { useCallback, useEffect, useState } from 'react';
import { fetchFleet } from '../../services/api';

/**
 * The signed-in owner's vehicles, from the server.
 *
 * Scoped server-side to `req.user._id`, so one owner can never read another's
 * trucks. No seed and no fallback: an empty fleet is an empty fleet, and a
 * fabricated one would have somebody dispatching a truck that does not exist.
 */
export const useFleet = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setVehicles(await fetchFleet());
    } catch (err) {
      setError(err);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { vehicles, loading, error, refresh };
};
