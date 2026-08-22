import { useEffect, useState } from 'react';
import { getSocket } from '../services/socket';

/**
 * Where one vehicle is, now.
 *
 * Seeded with the last position the server stored on the request record, then
 * moved by `vehicle:location_changed` broadcasts. The seed matters: a farmer
 * opening the screen an hour after the last fix should see where the truck got
 * to, timestamped, rather than an empty map until the next report lands.
 *
 * Two things it refuses to do:
 *
 *   Show somebody else's truck. The server broadcasts to everyone (the socket
 *   layer has no auth), so every payload is matched against this vehicle's id
 *   and number before it is used.
 *
 *   Pretend a demo is a fix. The scripted Nashik->Vashi simulator emits with
 *   `source: 'simulation'`; that is carried out to the caller as `simulated`
 *   and the map stamps it. Only `source: 'report'` — a position that came
 *   through the authenticated fleet endpoint and was written to the vehicle —
 *   counts as real.
 */
export const useVehicleTracking = (vehicle) => {
  const id = vehicle?.id || null;
  const vehicleNo = vehicle?.vehicleNo || null;

  const [fix, setFix] = useState(() => (
    vehicle?.coordinates
      ? { coordinates: vehicle.coordinates, at: vehicle.locationUpdatedAt || null, simulated: false, live: false }
      : null
  ));

  useEffect(() => {
    setFix(vehicle?.coordinates
      ? { coordinates: vehicle.coordinates, at: vehicle.locationUpdatedAt || null, simulated: false, live: false }
      : null);
  }, [id, vehicle?.coordinates?.[0], vehicle?.coordinates?.[1], vehicle?.locationUpdatedAt]);

  useEffect(() => {
    if (!id && !vehicleNo) return undefined;
    const socket = getSocket();

    const onMove = (data) => {
      const matches = (data?.vehicleId && data.vehicleId === id)
        || (data?.vehicleNo && data.vehicleNo === vehicleNo);
      if (!matches) return;

      const coordinates = data.coordinates || data.currentCoordinates;
      if (!Array.isArray(coordinates) || coordinates.length !== 2) return;

      setFix({
        coordinates,
        at: data.at || new Date().toISOString(),
        simulated: data.source !== 'report',
        live: true,
        speedKmH: data.speedKmH ?? null,
      });
    };

    socket.on('vehicle:location_changed', onMove);
    return () => socket.off('vehicle:location_changed', onMove);
  }, [id, vehicleNo]);

  return fix;
};

export default useVehicleTracking;
