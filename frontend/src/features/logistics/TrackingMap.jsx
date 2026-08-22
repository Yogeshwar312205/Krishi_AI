import React from 'react';
import { useT } from '../../i18n/useT';
import { MapPanel } from '../../shared/map/MapPanel';
import { useVehicleTracking } from '../../hooks/useVehicleTracking';

/**
 * Where the lot is going, and where the truck carrying it has got to.
 *
 * The same component renders for the farmer and for the fleet owner, exactly as
 * TrackingTimeline does and for the same reason: the two must never be looking
 * at different accounts of one consignment. Both read the request record, and
 * both take live fixes off the same broadcast.
 *
 * A request with no truck yet draws the haul on its own — pickup to mandi, no
 * vehicle mark. That is the honest picture: nobody has agreed to collect it.
 */
export const TrackingMap = ({ request, defaultOpen = false }) => {
  const { t } = useT();
  const fix = useVehicleTracking(request.vehicle);

  const stops = [
    { kind: 'pickup', label: request.origin?.label, coordinates: request.origin?.coordinates, badge: '↑' },
    { kind: 'drop', label: request.destination?.label, coordinates: request.destination?.coordinates, badge: '↓' },
  ].filter((s) => s.label);

  const stamp = fix?.at
    ? new Date(fix.at).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        hour12: false, timeZone: 'Asia/Kolkata',
      })
    : null;

  return (
    <div className="space-y-2">
      <MapPanel
        stops={stops}
        defaultOpen={defaultOpen}
        vehicle={fix ? {
          coordinates: fix.coordinates,
          label: request.vehicle?.vehicleNo,
          simulated: fix.simulated,
        } : null}
      />

      {/*
       * The age of the fix, always. A marker with no timestamp is read as "the
       * truck is there now", and a position from four hours ago shown that way
       * is how a farmer ends up waiting at a gate.
       */}
      {request.vehicle && (
        <p className="text-sm text-ink-faint tnum">
          {stamp ? t('map.lastFix', { at: stamp }) : t('map.noPosition')}
        </p>
      )}
    </div>
  );
};

export default TrackingMap;
