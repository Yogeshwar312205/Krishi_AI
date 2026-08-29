import { useCallback, useEffect, useRef, useState } from 'react';
import { getSystemHealth } from '../../services/api';
import getSocket from '../../services/socket';

/**
 * Live view of the resilience subsystem for the Blackout console.
 *
 * - polls GET /api/system/health every 2s (the same setInterval + cleanup shape
 *   as data/marketCache.js)
 * - listens for `system:recovery_progress` on the shared socket
 *   (the same subscribe shape as hooks/useVehicleTracking.js) and keeps the
 *   ordered list of recovery steps for the progress panel
 *
 * `refresh()` forces an immediate poll (used right after an action button).
 */
const POLL_MS = 2000;

export const useSystemHealth = ({ active = true } = {}) => {
  const [health, setHealth] = useState(null);
  const [progress, setProgress] = useState([]); // [{ step, status, detail, counts, at }]
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const data = await getSystemHealth();
    if (mounted.current) setHealth(data);
    return data;
  }, []);

  const clearProgress = useCallback(() => setProgress([]), []);

  useEffect(() => {
    mounted.current = true;
    if (!active) return undefined;

    refresh();
    const timer = setInterval(refresh, POLL_MS);

    const socket = getSocket();
    const onProgress = (evt) => {
      if (!mounted.current) return;
      setProgress((prev) => {
        // collapse consecutive updates of the same step, keep the latest
        const next = prev.filter((p) => p.step !== evt.step);
        return [...next, evt];
      });
      // a progress event means state is moving — pull a fresh snapshot of health
      refresh();
    };
    socket.on('system:recovery_progress', onProgress);

    return () => {
      mounted.current = false;
      clearInterval(timer);
      socket.off('system:recovery_progress', onProgress);
    };
  }, [active, refresh]);

  return { health, progress, refresh, clearProgress };
};

export default useSystemHealth;
