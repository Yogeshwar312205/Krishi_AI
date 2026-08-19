import React, { useEffect, useRef } from 'react';
// maplibre-gl v6 removed the default export — these must stay named imports.
// It also lets the bundler drop the parts of the library we never touch.
import { Map as MapLibreMap, Marker, Popup, NavigationControl, LngLatBounds } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * Route map, built on the same foundation as mapcn: MapLibre GL with CARTO's
 * free basemap tiles, so there is no API key and no account to provision
 * before a demo.
 *
 * Hand-ported rather than installed via `npx shadcn add`, because this repo is
 * not a shadcn project — no components.json, no Radix, no `@/` alias, plain JS
 * — and initialising one would pull in a second design system that fights the
 * rate-board tokens. The component is themed to our own palette instead.
 *
 * Weight note: MapLibre is roughly four times Leaflet's size. That is only
 * acceptable because this component is lazy-loaded AND sits behind a "show on
 * map" disclosure, so a farmer who never opens a map never downloads it, while
 * a judge on a laptop gets vector tiles that pan and zoom smoothly.
 */

/* CARTO Positron: pale, low-chroma, and designed to sit under data. Our forest
 * and terracotta marks stay legible on it, which a satellite or a saturated
 * street map would not allow. */
const BASEMAP = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

const FOREST = '#18532B';
const TERRACOTTA = '#C1652D';

/*
 * Markers are drawn as styled DOM, not image files.
 *
 * The Leaflet version this replaces pulled its pins from
 * raw.githubusercontent.com and cdnjs at runtime — two cross-origin requests
 * that simply fail on a weak rural connection, leaving a map with no markers
 * on it. Nothing here needs the network beyond the tiles themselves.
 */
const MARKER_STYLES = {
  origin: { bg: FOREST, fg: '#ffffff', border: FOREST },
  market: { bg: '#ffffff', fg: FOREST, border: '#14251A' },
  vehicle: { bg: TERRACOTTA, fg: '#ffffff', border: '#14251A' },
};

const createMarkerElement = (label, kind = 'market') => {
  const style = MARKER_STYLES[kind] || MARKER_STYLES.market;
  const el = document.createElement('div');
  el.style.cssText = `
    display:flex; align-items:center; justify-content:center;
    width:28px; height:28px;
    background:${style.bg}; color:${style.fg};
    border:2px solid ${style.border};
    font:700 13px/1 Mukta, system-ui, sans-serif;
    cursor:pointer;
  `;
  el.textContent = label;
  return el;
};

export const RouteMap = ({ origin, stops = [], routeGeoJson, detour = false, className = '' }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: BASEMAP,
      center: origin || [73.7898, 19.9975], // Nashik
      zoom: 7,
      attributionControl: { compact: true },
      // The demo is about the route, not about tilting the camera.
      pitchWithRotate: false,
      dragRotate: false,
    });

    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [origin]);

  // Markers and route are redrawn whenever the inputs change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    const markers = [];

    const draw = () => {
      if (origin) {
        markers.push(
          new Marker({ element: createMarkerElement('●', 'origin') })
            .setLngLat(origin)
            .addTo(map)
        );
      }

      stops.forEach((stop, index) => {
        if (!stop.coordinates) return;
        const label = stop.kind === 'vehicle' ? '▸' : String(index + 1);
        const marker = new Marker({ element: createMarkerElement(label, stop.kind) })
          .setLngLat(stop.coordinates)
          .addTo(map);
        if (stop.name) {
          marker.setPopup(new Popup({ offset: 18 }).setText(stop.name));
        }
        markers.push(marker);
      });

      if (routeGeoJson) {
        if (map.getLayer('route-line')) map.removeLayer('route-line');
        if (map.getSource('route')) map.removeSource('route');

        map.addSource('route', { type: 'geojson', data: routeGeoJson });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            // A detour is drawn dashed as well as recoloured, so the change is
            // legible without relying on telling two colours apart.
            'line-color': detour ? '#C98D24' : FOREST,
            'line-width': 4,
            ...(detour ? { 'line-dasharray': [2, 1.5] } : {}),
          },
        });
      }

      // Frame everything with room for the marks themselves.
      const points = [origin, ...stops.map((s) => s.coordinates)].filter(Boolean);
      if (points.length > 1) {
        const bounds = points.reduce(
          (acc, point) => acc.extend(point),
          new LngLatBounds(points[0], points[0])
        );
        map.fitBounds(bounds, { padding: 56, duration: 600, maxZoom: 11 });
      }
    };

    // Sources cannot be added before the style has loaded.
    if (map.isStyleLoaded()) draw();
    else map.once('load', draw);

    return () => markers.forEach((marker) => marker.remove());
  }, [origin, stops, routeGeoJson, detour]);

  return (
    <div
      ref={containerRef}
      className={`min-h-[20rem] w-full border-2 border-ink ${className}`}
    />
  );
};

export default RouteMap;
