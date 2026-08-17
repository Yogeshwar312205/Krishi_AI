import React, { useState, useId } from 'react';
import { useT } from '../../../i18n/useT';

/**
 * Rate over time: one week behind, one week ahead.
 *
 * Form: a line, because the job is change-over-time for a single measure.
 *
 * ONE series, deliberately. Past and forecast are the same measurement, so
 * splitting them into two colours would claim an identity difference that does
 * not exist. They are separated by line style instead — solid for what happened,
 * dashed for what we are guessing — which also means the distinction survives
 * colour-blindness, greyscale printing and a glare-washed phone screen. With a
 * single series there is no categorical palette to validate and no legend box
 * needed; the title names the measure.
 *
 * The band is the model's uncertainty and widens with distance. It is the most
 * important honest signal on the chart: a farmer deciding to hold for a week
 * should see how much less we know about day seven than about tomorrow.
 *
 * Hand-drawn SVG rather than a charting library — this is one small chart, and
 * Recharts would cost more gzipped than the entire rest of the app.
 */
const WIDTH = 640;
const HEIGHT = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 44 };

export const ForecastChart = ({ points }) => {
  const { t, rate, shortDate } = useT();
  const [hover, setHover] = useState(null);
  const clipId = useId();

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  const lows = points.map((p) => p.low);
  const highs = points.map((p) => p.high);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  // A little headroom so the line never grazes the frame.
  const span = (max - min) || 1;
  const yMin = min - span * 0.15;
  const yMax = max + span * 0.15;

  const x = (i) => PAD.left + (i / (points.length - 1)) * plotW;
  const y = (v) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  const line = (subset) =>
    subset.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(points.indexOf(p))} ${y(p.value)}`).join(' ');

  const past = points.filter((p) => !p.isFuture);
  const future = points.filter((p) => p.isFuture);
  // Repeat the last past point so the dashed run starts where the solid one ends.
  const futureWithJoin = past.length ? [past[past.length - 1], ...future] : future;

  const bandPath = [
    ...future.map((p) => `${p === future[0] ? 'M' : 'L'} ${x(points.indexOf(p))} ${y(p.high)}`),
    ...[...future].reverse().map((p) => `L ${x(points.indexOf(p))} ${y(p.low)}`),
    'Z',
  ].join(' ');

  const todayIndex = points.findIndex((p) => p.offset === 0);
  const todayX = x(todayIndex);

  // Three gridlines is enough to read a level without becoming a ledger.
  const ticks = [yMin + (yMax - yMin) * 0.15, (yMin + yMax) / 2, yMax - (yMax - yMin) * 0.15];

  const handleMove = (event) => {
    const svg = event.currentTarget;
    const box = svg.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * WIDTH;
    const ratio = (px - PAD.left) / plotW;
    const index = Math.round(ratio * (points.length - 1));
    setHover(index >= 0 && index < points.length ? index : null);
  };

  const active = hover != null ? points[hover] : null;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-pan-y"
        role="img"
        aria-label={t('price.forecast.title')}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        {/* Recessive gridlines and left-hand rate labels. */}
        {ticks.map((value) => (
          <g key={value}>
            <line
              x1={PAD.left} x2={WIDTH - PAD.right}
              y1={y(value)} y2={y(value)}
              stroke="#C9C4B4" strokeWidth="1"
            />
            <text
              x={PAD.left - 8} y={y(value) + 4}
              textAnchor="end" fontSize="11" fill="#6B7A70"
              className="tnum"
            >
              {Math.round(value)}
            </text>
          </g>
        ))}

        {/* Uncertainty band — forecast only. */}
        <path d={bandPath} fill="#18532B" fillOpacity="0.14" clipPath={`url(#${clipId})`} />

        {/* Today: where measurement stops and guessing starts. */}
        <line
          x1={todayX} x2={todayX} y1={PAD.top} y2={PAD.top + plotH}
          stroke="#14251A" strokeWidth="1.5" strokeDasharray="2 3"
        />
        <text x={todayX} y={HEIGHT - 8} textAnchor="middle" fontSize="11" fontWeight="700" fill="#14251A">
          {t('price.forecast.todayMark')}
        </text>

        {/* The series. Solid = happened, dashed = guessed. */}
        <path d={line(past)} fill="none" stroke="#18532B" strokeWidth="2" strokeLinecap="round" />
        <path
          d={line(futureWithJoin)}
          fill="none" stroke="#18532B" strokeWidth="2"
          strokeDasharray="5 4" strokeLinecap="round"
        />

        {/* Today's marker, with a surface ring so it reads over the line. */}
        <circle cx={todayX} cy={y(points[todayIndex].value)} r="5" fill="#18532B" stroke="#fff" strokeWidth="2" />

        {/* Hover crosshair */}
        {active && (
          <g>
            <line
              x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + plotH}
              stroke="#14251A" strokeWidth="1" strokeOpacity="0.35"
            />
            <circle cx={x(hover)} cy={y(active.value)} r="5" fill="#14251A" stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>

      {/*
        The tooltip is HTML below the chart rather than an SVG overlay: it never
        clips at the plot edge, it reflows for Devanagari, and on a touch screen
        it does not sit under the finger that summoned it.
      */}
      <figcaption className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        {active ? (
          <>
            <span className="font-semibold text-ink">{shortDate(active.date)}</span>
            <span className="font-display text-xl tnum text-forest-700">{rate(active.value)}</span>
            {active.isFuture && (
              <span className="text-ink-faint tnum">
                {rate(active.low)} – {rate(active.high)}
              </span>
            )}
          </>
        ) : (
          <span className="text-ink-faint">{t('price.forecast.explain')}</span>
        )}
      </figcaption>
    </figure>
  );
};

export default ForecastChart;
