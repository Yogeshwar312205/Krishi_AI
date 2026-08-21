import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchDispatchSuggestions } from '../../services/api';

/**
 * The ranked dispatch queue, straight from the server.
 *
 * There is no local projection and no local ranking. The endpoint reads the
 * signed-in owner's own vehicles and the open request queue out of MongoDB and
 * ranks them there — a client that could post its own fleet could rank trucks
 * it does not own against requests it cannot see.
 *
 * It also means there is nothing to fall back to when the call fails, which is
 * deliberate: two copies of a ranking algorithm can drift apart without anyone
 * noticing, and a fleet owner acting on the wrong one sends a real truck.
 */
export const useDispatch = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  /** (requestId, vehicleId) pairs the owner has waved away, this session. */
  const [dismissed, setDismissed] = useState([]);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchDispatchSuggestions());
    } catch (err) {
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { run(); }, [run]);

  const dismiss = useCallback((requestId, vehicleId) => {
    setDismissed((current) => (
      current.some((d) => d.requestId === requestId && d.vehicleId === vehicleId)
        ? current
        : [...current, { requestId, vehicleId }]
    ));
  }, []);

  const isDismissed = useCallback(
    (requestId, vehicleId) => dismissed.some(
      (d) => d.requestId === requestId && d.vehicleId === vehicleId
    ),
    [dismissed]
  );

  const vehicleById = useMemo(() => {
    const map = new Map();
    for (const v of data?.vehicles || []) map.set(v.id, v);
    return map;
  }, [data]);

  /** Suggestions for one request, dismissals removed, cheapest first. */
  const suggestionsFor = useCallback(
    (requestId) => (data?.suggestions || [])
      .filter((s) => s.requestId === requestId && !isDismissed(requestId, s.vehicleId))
      .sort((a, b) => a.insertionCostKm - b.insertionCostKm),
    [data, isDismissed]
  );

  /** Why a vehicle is not offered for this request — shown, never hidden. */
  const infeasibleFor = useCallback(
    (requestId) => (data?.infeasible || []).filter((i) => i.requestId === requestId),
    [data]
  );

  const unrankableFor = useCallback(
    (requestId) => (data?.unrankable || []).find((u) => u.requestId === requestId) || null,
    [data]
  );

  return {
    pending: data?.pending || [],
    vehicles: data?.vehicles || [],
    vehicleById,
    loading, error,
    source: data?.source || null,
    counts: data?.counts || null,
    suggestionsFor, infeasibleFor, unrankableFor,
    dismiss,
    refresh: run,
  };
};
