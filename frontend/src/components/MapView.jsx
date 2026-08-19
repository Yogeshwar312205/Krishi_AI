import React, { useMemo } from 'react';
import { Navigation, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useT } from '../i18n/useT';
import { RouteMap } from '../shared/map/RouteMap';

/**
 * Store-connected route map.
 *
 * Kept at this path and under this export name so the screens that already
 * import it (DriverDashboard, MandiComparison, LegacyLogistics) keep working —
 * only the engine underneath changed, from Leaflet raster tiles to MapLibre
 * vector tiles via shared/map/RouteMap.
 *
 * Three things improved in the swap:
 *   - Markers are styled DOM instead of PNGs fetched from GitHub and cdnjs at
 *     runtime, so the map still has pins on a weak connection.
 *   - The basemap is CARTO Positron, which is pale enough for our forest and
 *     terracotta marks to read against; OSM standard tiles are busy and
 *     saturated enough to swallow them.
 *   - The heading no longer reads "Live Geospatial VRP Route Tracker". VRP is
 *     a solver name — see src/i18n/GLOSSARY.md.
 */
export const MapView = () => {
  const farmerOrigin = useAppStore((state) => state.farmerOrigin);
  const selectedRecommendation = useAppStore((state) => state.selectedRecommendation);
  const trackedVehicle = useAppStore((state) => state.trackedVehicle);
  const trafficAlert = useAppStore((state) => state.trafficAlert);
  const { t } = useT();

  const marketCoords = selectedRecommendation?.marketCoordinates || [73.0012, 19.076];
  const vehicleCoords = trackedVehicle?.currentCoordinates || farmerOrigin;

  const stops = useMemo(
    () => [
      { coordinates: vehicleCoords, name: trackedVehicle?.driverName || '', kind: 'vehicle' },
      { coordinates: marketCoords, name: selectedRecommendation?.marketName || '', kind: 'market' },
    ],
    [vehicleCoords, marketCoords, trackedVehicle?.driverName, selectedRecommendation?.marketName]
  );

  const routeGeoJson = useMemo(
    () => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [farmerOrigin, vehicleCoords, marketCoords],
      },
    }),
    [farmerOrigin, vehicleCoords, marketCoords]
  );

  return (
    <div className="relative">
      {/* Status strip sits above the canvas rather than floating on it. */}
      <div className="flex flex-wrap items-center gap-2 border-2 border-b-0 border-ink bg-white px-3 py-2">
        <Navigation className="h-4 w-4 shrink-0 text-forest-700" aria-hidden="true" />
        <span className="text-sm font-bold text-ink">{t('transport.route.title')}</span>

        {trafficAlert && (
          <span className="ml-auto flex items-center gap-1 border border-turmeric-500 bg-turmeric-100 px-2 py-0.5 text-xs font-bold text-turmeric-600">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            {t('transport.route.rerouted')}
          </span>
        )}
      </div>

      <RouteMap
        origin={farmerOrigin}
        stops={stops}
        routeGeoJson={routeGeoJson}
        detour={Boolean(trafficAlert)}
        className="h-[24rem]"
      />
    </div>
  );
};

export default MapView;
