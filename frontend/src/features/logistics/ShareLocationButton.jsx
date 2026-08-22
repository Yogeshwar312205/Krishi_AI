import React, { useEffect, useRef, useState } from 'react';
import { Navigation, NavigationOff, AlertTriangle } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { reportVehicleLocation } from '../../services/api';
import { Button } from '../../design/primitives/Button';

/**
 * The cab's own position, shared by the person who owns the truck.
 *
 * This is what makes tracking real rather than a demo: the handset in the cab
 * reports through the authenticated fleet endpoint, the server writes it to the
 * vehicle and broadcasts it, and the farmer's map moves. No client can move a
 * truck it does not own, because the position never travels over the socket on
 * its way in — only on its way out. See backend/src/sockets/bus.js.
 *
 * Off by default and stopped on unmount. Somebody's location is not something
 * to start collecting because a screen happened to open.
 */
const MIN_GAP_MS = 15000; // one write per truck per 15s is plenty for a haul

export const ShareLocationButton = ({ vehicleId, vehicleNo }) => {
  const { t } = useT();
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const watchRef = useRef(null);
  const lastSentRef = useRef(0);

  const stop = () => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setSharing(false);
  };

  useEffect(() => stop, []);

  const start = () => {
    if (!navigator.geolocation) {
      setError(t('map.shareUnsupported'));
      return;
    }
    setError('');
    setSharing(true);

    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastSentRef.current < MIN_GAP_MS) return;
        lastSentRef.current = now;
        // [lng, lat] — the order used everywhere in this API, store and Mongo.
        reportVehicleLocation(vehicleId, [position.coords.longitude, position.coords.latitude])
          .catch((err) => setError(err.message));
      },
      (err) => {
        setError(err.code === err.PERMISSION_DENIED ? t('map.shareDenied') : t('map.shareFailed'));
        stop();
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
  };

  if (!vehicleId) return null;

  return (
    <div className="space-y-2">
      <Button
        variant={sharing ? 'secondary' : 'primary'}
        icon={sharing ? NavigationOff : Navigation}
        onClick={sharing ? stop : start}
      >
        {sharing ? t('map.shareStop', { no: vehicleNo }) : t('map.shareStart')}
      </Button>

      {sharing && <p className="text-sm text-ink-soft">{t('map.sharingNote')}</p>}

      {error && (
        <p className="notice notice-bad" role="alert">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

export default ShareLocationButton;
