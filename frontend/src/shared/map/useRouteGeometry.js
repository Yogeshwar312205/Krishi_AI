import { useEffect, useState } from 'react';
import { fetchRouteGeometry } from '../../services/api';

/**
 * Road geometry for an ordered list of `[lng, lat]` stops.
 *
 * Pass null to hold off entirely — the map panels do that until someone opens
 * them, so a screen with six suggestion cards makes no routing calls until the
 * dispatcher actually looks at one.
 *
 * `source` is the whole point of the return value: 'osrm' means the line
 * follows roads, 'straight-line' means the router refused and the server
 * measured it the way the ranking does, 'offline' means we never reached our
 * own backend and the map will draw the legs itself. The caller shows which.
 */
export const useRouteGeometry = (points) => {
  const [state, setState] = useState({ geometry: null, source: null, loading: false });
  const key = points && points.length > 1 ? JSON.stringify(points) : null;

  useEffect(() => {
    if (!key) {
      setState({ geometry: null, source: null, loading: false });
      return undefined;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true }));

    fetchRouteGeometry(JSON.parse(key)).then((data) => {
      if (cancelled) return;
      setState({
        geometry: data.geometry || null,
        source: data.source || 'offline',
        distanceKm: data.distanceKm ?? null,
        durationMin: data.durationMin ?? null,
        loading: false,
      });
    });

    return () => { cancelled = true; };
  }, [key]);

  return state;
};

export default useRouteGeometry;
