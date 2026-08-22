import React, { useEffect, useRef, useState } from 'react';
// maplibre-gl v6 removed the default export — these must stay named imports.
// It also lets the bundler drop the parts of the library we never touch.
import { Map as MapLibreMap, Marker, Popup, NavigationControl, LngLatBounds } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { loadMapStyle, INK, FOREST, TURMERIC, TERRACOTTA } from './mapTheme';

/**
 * The one map in the app.
 *
 * MapLibre GL with a retinted CARTO basemap (see mapTheme.js): no API key, no
 * account, nothing to provision before the thing runs — the same rule the
 * Agmarknet feed and the OSRM router follow.
 *
 * Three things it draws, in the order they matter:
 *
 *   1. the route, as a heavy ink casing under a forest line — a line drawn on
 *      a board, not a glowing GPS ribbon
 *   2. the stops, as numbered square chips in the sequence the truck drives
 *   3. the vehicle, where it last reported from
 *
 * `ghost` is the route BEFORE an insertion, drawn thin and dashed underneath,
 * so a dispatcher can see the shape of the detour rather than infer it from
 * two numbers.
 *
 * When `geometry` is null the legs are drawn straight between the stops and
 * `approximate` is set — dashed, because a straight line through a hill is not
 * a road and the map must not imply it measured one. Nothing is ever placed at
 * a guessed coordinate: a stop without one is dropped by the caller, never
 * nudged onto the nearest town. Same rule as data/mandiGeo.js.
 *
 * Weight: MapLibre is roughly four times Leaflet. That is only acceptable
 * because this module is loaded lazily behind a "show on map" disclosure (see
 * MapPanel), so a farmer who never opens a map never downloads it.
 */

const STOP_STYLES = {
  depot:   { bg: '#FFFFFF', fg: INK, glyph: '■' },   // ■ where the truck starts
  pickup:  { bg: FOREST, fg: '#FFFFFF', glyph: '↑' }, // ↑ load goes on
  drop:    { bg: TURMERIC, fg: INK, glyph: '↓' },     // ↓ load comes off
  market:  { bg: '#FFFFFF', fg: FOREST, glyph: '●' },
  vehicle: { bg: TERRACOTTA, fg: '#FFFFFF', glyph: '●' },
};

/**
 * Markers are styled DOM, not image files.
 *
 * The build this replaces pulled its pins from raw.githubusercontent.com and
 * cdnjs at runtime — two cross-origin requests that simply fail on a weak rural
 * connection, leaving a map with no marks on it. Nothing here needs the network
 * beyond the tiles.
 */
const createMarkerElement = ({ kind = 'market', label, highlight = false, title }) => {
  const style = STOP_STYLES[kind] || STOP_STYLES.market;
  const el = document.createElement('div');
  el.style.cssText = `
    display:flex; align-items:center; justify-content:center;
    width:26px; height:26px; box-sizing:border-box;
    background:${style.bg}; color:${style.fg};
    border:2px solid ${INK};
    font:700 13px/1 Mukta, system-ui, sans-serif;
    letter-spacing:0; cursor:pointer;
    ${highlight ? `outline:2px solid ${TURMERIC}; outline-offset:2px;` : ''}
  `;
  el.textContent = label ?? style.glyph;
  if (title) el.title = title;
  return el;
};

/** Straight legs through the stops — what gets drawn when no router answered. */
const straightGeometry = (points) => ({
  type: 'Feature',
  geometry: { type: 'LineString', coordinates: points },
  properties: {},
});

const asFeature = (geometry) =>
  (geometry?.type === 'Feature' ? geometry : { type: 'Feature', geometry, properties: {} });

const EMPTY = { type: 'FeatureCollection', features: [] };

export const RouteMap = ({
  stops = [],
  geometry = null,
  ghost = null,
  approximate = false,
  vehicle = null,
  className = '',
  ariaLabel,
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);

  const points = stops.map((s) => s.coordinates).filter(Boolean);
  const focus = vehicle?.coordinates ? [...points, vehicle.coordinates] : points;

  /* ---- construction. Once per mount; the style is fetched and retinted first,
     so the map is never painted in the provider's palette even briefly. ---- */
  useEffect(() => {
    let cancelled = false;

    loadMapStyle().then((style) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = new MapLibreMap({
        container: containerRef.current,
        style,
        center: points[0] || [73.7898, 19.9975], // Nashik
        zoom: 7,
        attributionControl: { compact: true },
        // The subject is a route, not a camera angle.
        pitchWithRotate: false,
        dragRotate: false,
        touchZoomRotate: true,
      });

      map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
      /*
       * MapLibre reports tile and style failures on its own error channel, not
       * as exceptions. Unhandled, a map that cannot reach its tiles is just a
       * blank rectangle with nothing in the console — which is exactly how the
       * Vite worker bug (see vite.config.js) hid for as long as it did.
       */
      map.on('error', (e) => console.warn('Map:', e?.error?.message || e?.type));
      map.on('load', () => { if (!cancelled) setReady(true); });
      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Constructed once. Everything that changes is applied in the draw effect
    // below, because tearing a map down to move a marker throws away the tiles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- the route lines ---- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    const line = geometry ? asFeature(geometry)
      : points.length > 1 ? straightGeometry(points)
      : null;
    const dashed = approximate || !geometry;

    const setData = (id, data) => {
      const source = map.getSource(id);
      if (source) source.setData(data || EMPTY);
    };

    if (!map.getSource('ghost')) {
      map.addSource('ghost', { type: 'geojson', data: EMPTY });
      map.addLayer({
        id: 'ghost-line',
        type: 'line',
        source: 'ghost',
        layout: { 'line-cap': 'butt', 'line-join': 'round' },
        // The old route, still legible underneath but never competing with the
        // new one: hairline, ink, dashed.
        paint: { 'line-color': INK, 'line-width': 1.5, 'line-opacity': 0.4, 'line-dasharray': [3, 2] },
      });
    }

    if (!map.getSource('route')) {
      map.addSource('route', { type: 'geojson', data: EMPTY });
      // Casing then line: the same two-stroke construction as a ruled row —
      // heavy ink underneath, colour on top.
      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': INK, 'line-width': 7 },
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': FOREST, 'line-width': 3.5 },
      });
    }

    setData('ghost', ghost ? asFeature(ghost) : null);
    setData('route', line);

    /* A straight-line route is dashed as well as captioned. Two signals for one
       fact, because the caption is the first thing that gets skipped. */
    // undefined (not null) is how MapLibre unsets a paint property.
    map.setPaintProperty('route-line', 'line-dasharray', dashed ? [2, 1.4] : undefined);
    map.setPaintProperty('route-casing', 'line-opacity', dashed ? 0.55 : 1);
  }, [ready, geometry, ghost, approximate, JSON.stringify(points)]);

  /* ---- stops and the vehicle ---- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return undefined;

    const markers = [];

    stops.forEach((stop, index) => {
      if (!stop.coordinates) return;
      const marker = new Marker({
        element: createMarkerElement({
          kind: stop.kind,
          label: stop.badge ?? String(index + 1),
          highlight: stop.highlight,
          title: stop.label,
        }),
      })
        .setLngLat(stop.coordinates)
        .addTo(map);
      if (stop.label) marker.setPopup(new Popup({ offset: 18, closeButton: false }).setText(stop.label));
      markers.push(marker);
    });

    if (vehicle?.coordinates) {
      markers.push(
        new Marker({
          element: createMarkerElement({ kind: 'vehicle', title: vehicle.label }),
          /*
           * Lifted half a chip above the point it marks. A truck sitting at its
           * depot is at the same coordinate as that stop, and drawn centred it
           * covered the stop chip completely — the fleet owner saw a lorry and
           * no route start. Offset, both read.
           */
          offset: [0, -15],
        })
          .setLngLat(vehicle.coordinates)
          .addTo(map)
      );
    }

    return () => markers.forEach((m) => m.remove());
  }, [ready, stops, vehicle]);

  /* ---- framing ---- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || focus.length === 0) return;

    if (focus.length === 1) {
      map.easeTo({ center: focus[0], zoom: 10, duration: 500 });
      return;
    }
    const bounds = focus.reduce((acc, p) => acc.extend(p), new LngLatBounds(focus[0], focus[0]));
    // Padding leaves room for the marks themselves, which sit above the point.
    map.fitBounds(bounds, { padding: 48, duration: 600, maxZoom: 12 });
  }, [ready, JSON.stringify(focus)]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={ariaLabel || stops.map((s) => s.label).filter(Boolean).join(' → ')}
      className={`h-72 w-full border-2 border-ink bg-paper ${className}`}
    />
  );
};

export default RouteMap;
