import React, { Suspense, lazy, useState } from 'react';
import { Map as MapIcon, ChevronDown, Loader2 } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { useRouteGeometry } from './useRouteGeometry';
import { DemoStamp } from '../../design/primitives/DemoStamp';

/*
 * MapLibre and its stylesheet are ~200 kB before tiles. Loading it only when
 * somebody opens a map keeps that off the farmer's first paint entirely — most
 * sessions never open one. This is also why the map lives behind a disclosure
 * rather than sitting open on the screen.
 */
const RouteMap = lazy(() => import('./RouteMap').then((m) => ({ default: m.RouteMap })));

/**
 * A map, its legend, and an honest caption about where the line came from.
 *
 * The caption is not decoration. Two different distances are in play on the
 * dispatch screen — the routed length that shaped this line, and the
 * haversine x 1.3 estimate the ranking actually used — and showing a
 * road-shaped line without saying which is which would let a dispatcher
 * conclude the ranking was road-measured. It was not. See VRP.md 4.6.
 */
const LEGEND_KEYS = {
  depot: 'map.legend.start',
  pickup: 'map.legend.pickup',
  drop: 'map.legend.drop',
  market: 'map.legend.stop',
};

const SWATCH = {
  depot: 'bg-white text-ink',
  pickup: 'bg-forest-700 text-white',
  drop: 'bg-turmeric-300 text-ink',
  market: 'bg-white text-forest-700',
  vehicle: 'bg-terracotta-500 text-white',
};

const GLYPH = { depot: '■', pickup: '↑', drop: '↓', market: '●', vehicle: '●' };

const Chip = ({ kind, label }) => (
  <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
    <span
      className={`flex h-5 w-5 items-center justify-center border-2 border-ink text-xs font-bold leading-none ${SWATCH[kind]}`}
      aria-hidden="true"
    >
      {GLYPH[kind]}
    </span>
    {label}
  </span>
);

export const MapPanel = ({
  stops = [],
  ghostStops = null,
  vehicle = null,
  estimateKm = null,
  defaultOpen = false,
  label,
  className = '',
}) => {
  const { t, tCount, number } = useT();
  const [open, setOpen] = useState(defaultOpen);

  // A stop with no coordinate is dropped, never nudged onto a nearby town.
  // The panel says how many were dropped rather than drawing a tidy lie.
  const drawable = stops.filter((s) => Array.isArray(s.coordinates) && s.coordinates.length === 2);
  const missing = stops.length - drawable.length;
  const points = drawable.map((s) => s.coordinates);

  const ghostPoints = (ghostStops || [])
    .filter((s) => Array.isArray(s.coordinates) && s.coordinates.length === 2)
    .map((s) => s.coordinates);

  // Nothing is fetched until the panel is open.
  const route = useRouteGeometry(open ? points : null);
  const ghost = useRouteGeometry(open && ghostPoints.length > 1 ? ghostPoints : null);

  const routed = route.source === 'osrm';
  const kinds = [...new Set(drawable.map((s) => s.kind || 'market'))];

  const duration = () => {
    if (!Number.isFinite(route.durationMin)) return null;
    const h = Math.floor(route.durationMin / 60);
    const m = route.durationMin % 60;
    return h > 0 ? t('map.hoursMinutes', { h, m }) : t('map.minutes', { m });
  };

  if (points.length === 0) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rule-hair py-2 text-left text-base font-bold text-forest-700"
      >
        <span className="inline-flex items-center gap-2">
          <MapIcon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          {label || (open ? t('map.hide') : t('map.show'))}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={2.5}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="detail-enter space-y-2 pt-3">
          <Suspense
            fallback={
              <div className="flex h-72 w-full items-center justify-center border-2 border-ink bg-paper">
                <Loader2 className="h-6 w-6 animate-spin text-ink-faint" strokeWidth={2.25} aria-hidden="true" />
              </div>
            }
          >
            <RouteMap
              stops={drawable}
              geometry={route.geometry}
              ghost={ghost.geometry}
              approximate={!routed}
              vehicle={vehicle}
            />
          </Suspense>

          {/* legend — only the marks actually on this map */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {kinds.map((kind) => (
              <Chip key={kind} kind={kind} label={t(LEGEND_KEYS[kind] || LEGEND_KEYS.market)} />
            ))}
            {vehicle?.coordinates && <Chip kind="vehicle" label={t('map.legend.vehicle')} />}
          </div>

          {/* where the line came from */}
          <div className="space-y-1 text-sm text-ink-soft">
            {route.loading && <p>{t('common.loading')}</p>}

            {!route.loading && routed && (
              <p className="tnum">
                {t('map.onRoads')} · {number(route.distanceKm)} {t('common.km')}
                {duration() ? ` · ${duration()}` : ''}
              </p>
            )}

            {!route.loading && !routed && (
              <p>
                {t('map.straight')} <span className="text-ink-faint">{t('map.straightWhy')}</span>
              </p>
            )}

            {/*
             * The number the ranking used, beside the number the map drew. They
             * differ by design and the dispatcher is entitled to see by how much.
             */}
            {!route.loading && routed && Number.isFinite(estimateKm) && (
              <p className="tnum text-ink-faint">{t('map.rankedOn', { km: number(estimateKm) })}</p>
            )}

            {missing > 0 && <p className="text-terracotta-700">{tCount('map.missingStops', missing)}</p>}

            {vehicle?.simulated && (
              <p className="flex items-center gap-2">
                <DemoStamp />
                {t('map.simulatedFix')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPanel;
