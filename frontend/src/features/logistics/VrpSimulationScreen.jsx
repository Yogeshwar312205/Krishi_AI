import React, { useEffect, useReducer, useRef, useState } from 'react';
import {
  ArrowLeft, Play, Pause, RotateCcw, SkipForward, PackagePlus,
} from 'lucide-react';
import { useT } from '../../i18n/useT';
import { SectionHead } from '../../design/primitives/SectionHead';

/**
 * "How dispatch routing works" — a scripted, looping walk-through of the
 * cheapest-insertion VRP, drawn on a schematic map.
 *
 * It is deliberately NOT a real map (no MapLibre, no tiles). The dispatch
 * ranking is haversine × 1.3 and this screen only has to teach the shape of
 * the idea: a truck already committed to a route, a pickup request that lands
 * mid-run, every vehicle priced by the *extra* road it would drive, and the
 * winning route redrawn under the truck. An SVG the size of a postcard makes
 * that legible on a 3G handset; a road map would bury it.
 *
 * Every figure on screen — +55.4 km, +114 min, ₹4,322, the 244.4 → 299.8 km
 * route, the capacity split — is copied from the worked example in VRP.md,
 * which is itself copied from a real `POST /api/dispatch/suggestions` run. The
 * footnote says so.
 *
 * Reached two ways, and standalone in both: the "?" on DispatchScreen (via a
 * tab id) and a link on the pre-auth LandingScreen (via the Gate's stage). It
 * renders its own back control and page chrome so neither caller has to.
 */

/* Schematic coordinates, in the SVG's own 400×280 space. Not geography. */
const P = {
  depot: { x: 60, y: 74 },   // Nashik
  stopA: { x: 156, y: 50 },   // Pimpalgaon — a committed stop
  farm: { x: 198, y: 140 },   // Lasalgaon — the incoming pickup
  mandi: { x: 338, y: 214 },  // Mumbai APMC — the shared destination
};
const VAN = { x: 40, y: 106 }; // the idle alternative vehicle, in the Nashik yard

const PHASES = ['driving', 'request', 'ranking', 'reroute'];
const DUR = { driving: 5200, request: 4200, ranking: 4800, reroute: 6200 };

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);
const gap = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Point at fraction `f` along a poly-path, plus the sub-path walked so far. */
function walk(points, f) {
  const segs = [];
  let total = 0;
  for (let k = 0; k < points.length - 1; k += 1) {
    const d = gap(points[k], points[k + 1]);
    segs.push(d);
    total += d;
  }
  if (total === 0) return { at: points[0], trail: [points[0]] };
  let target = clamp01(f) * total;
  const trail = [points[0]];
  for (let k = 0; k < segs.length; k += 1) {
    if (target <= segs[k] || k === segs.length - 1) {
      const at = lerp(points[k], points[k + 1], segs[k] === 0 ? 0 : clamp01(target / segs[k]));
      trail.push(at);
      return { at, trail };
    }
    target -= segs[k];
    trail.push(points[k + 1]);
  }
  return { at: points[points.length - 1], trail: points.slice() };
}

const asPoints = (arr) => arr.map((p) => `${p.x},${p.y}`).join(' ');

const reducer = (s, a) => {
  if (a.type === 'reset') return { i: 0, t: 0 };
  if (a.type === 'goto') return { i: a.i, t: 0 };
  if (a.type === 'tick') {
    const next = s.t + a.dt / DUR[PHASES[s.i]];
    if (next >= 1) return { i: (s.i + 1) % PHASES.length, t: 0 };
    return { i: s.i, t: next };
  }
  return s;
};

const INK = '#14251A';
const FOREST = '#18532B';
const RULE = '#C9C4B4';
const CLAY = '#C1652D';

export const VrpSimulationScreen = ({ onExit }) => {
  const { t, number, money } = useT();

  const prefersReduced = useRef(
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  ).current;

  const [{ i, t: p }, dispatch] = useReducer(reducer, { i: 0, t: 0 });
  const [playing, setPlaying] = useState(!prefersReduced);
  const phase = PHASES[i];
  const e = easeInOut(p);

  useEffect(() => {
    if (!playing) return undefined;
    let raf;
    let last;
    const loop = (now) => {
      if (last != null) dispatch({ type: 'tick', dt: Math.min(now - last, 64) });
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const committed = [P.depot, P.stopA, P.mandi];
  const rerouted = [P.depot, P.stopA, P.farm, P.mandi];

  /* Where the truck is, and the green "already driven" trail behind it. */
  let truck;
  let trail;
  let heading;
  if (phase === 'driving') {
    const w = walk(committed, e);
    truck = w.at;
    trail = w.trail;
    heading = { x: walk(committed, clamp01(e + 0.03)).at.x - w.at.x, y: walk(committed, clamp01(e + 0.03)).at.y - w.at.y };
  } else if (phase === 'reroute') {
    const hold = 0.18; // pause at Pimpalgaon while the route is recalculated
    const run = easeInOut(clamp01((p - hold) / (1 - hold)));
    const w = walk([P.stopA, P.farm, P.mandi], run);
    truck = w.at;
    trail = [P.depot, ...w.trail];
    const ah = walk([P.stopA, P.farm, P.mandi], easeInOut(clamp01((p - hold) / (1 - hold) + 0.03))).at;
    heading = { x: ah.x - w.at.x, y: ah.y - w.at.y };
  } else {
    truck = P.stopA;
    trail = [P.depot, P.stopA];
    heading = { x: P.farm.x - P.stopA.x, y: P.farm.y - P.stopA.y };
  }
  const rot = (Math.atan2(heading.y || 0, heading.x || 1) * 180) / Math.PI;

  const farmOpacity = i < 1 ? 0 : (phase === 'request' ? easeInOut(clamp01(p * 1.6)) : 1);
  const vanAltOpacity = phase === 'ranking' ? easeInOut(clamp01(p * 1.8)) : 0;
  const droppedLegOpacity = phase === 'reroute' ? 1 - 0.85 * e : 0;
  const recalcOpen = phase === 'reroute' && p < 0.2;
  const barGrow = phase === 'ranking' ? e : 1;

  const StepTab = ({ idx, name }) => (
    <button
      type="button"
      onClick={() => dispatch({ type: 'goto', i: idx })}
      aria-current={idx === i ? 'step' : undefined}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-bold transition-colors ${
        idx === i ? 'bg-forest-700 text-white' : 'bg-white text-ink-soft hover:bg-forest-50'
      }`}
    >
      <span className="tnum shrink-0">{idx + 1}</span>
      <span className="truncate">{name}</span>
    </button>
  );

  const ctlBtn = 'inline-flex items-center gap-1.5 border-2 border-ink px-3 py-2 text-sm font-bold transition-colors';

  return (
    <div className="min-h-full bg-paper">
      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
        <button
          type="button"
          onClick={onExit}
          className={`lift mb-3 bg-white text-ink hover:bg-turmeric-300 ${ctlBtn}`}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          {t('common.back')}
        </button>

        <SectionHead level="screen" title={t('vrpDemo.title')} note={t('vrpDemo.intro')} />

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">

          {/* ---- The map ---- */}
          <div className="border-2 border-ink bg-white">
            <svg
              viewBox="0 0 400 280"
              className="block w-full"
              role="img"
              aria-label={t('vrpDemo.title')}
            >
              <rect x="0" y="0" width="400" height="280" fill="#EFECE1" />
              {/* a faint ruled grid, for the "map" read */}
              {[56, 112, 168, 224].map((y) => (
                <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} stroke={RULE} strokeWidth="1" opacity="0.3" />
              ))}
              {[80, 160, 240, 320].map((x) => (
                <line key={`v${x}`} x1={x} y1="0" x2={x} y2="280" stroke={RULE} strokeWidth="1" opacity="0.3" />
              ))}

              {/* base route — committed, or the rerouted shape once redrawn */}
              <polyline
                points={asPoints(phase === 'reroute' ? rerouted : committed)}
                fill="none"
                stroke={RULE}
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* the leg that gets dropped, fading out as the reroute lands */}
              {droppedLegOpacity > 0.02 && (
                <polyline
                  points={asPoints([P.stopA, P.mandi])}
                  fill="none"
                  stroke={CLAY}
                  strokeWidth="3"
                  strokeDasharray="5 5"
                  strokeLinecap="round"
                  opacity={droppedLegOpacity}
                />
              )}

              {/* the expensive alternative: the idle van, from scratch */}
              {vanAltOpacity > 0.02 && (
                <>
                  <polyline
                    points={asPoints([VAN, P.farm, P.mandi])}
                    fill="none"
                    stroke="#8A938A"
                    strokeWidth="2.5"
                    strokeDasharray="4 5"
                    strokeLinecap="round"
                    opacity={vanAltOpacity}
                  />
                  <text
                    x={(VAN.x + P.farm.x) / 2 - 4}
                    y={(VAN.y + P.farm.y) / 2 - 4}
                    fontSize="8"
                    fontWeight="700"
                    fill="#6b726b"
                    opacity={vanAltOpacity}
                  >
                    +{number(292.5)} {t('common.km')}
                  </text>
                </>
              )}

              {/* the driven trail */}
              <polyline
                points={asPoints(trail)}
                fill="none"
                stroke={FOREST}
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* nodes */}
              {[
                { pt: P.depot, label: t('vrpDemo.map.depot'), anchor: 'start', dx: -6, dy: 17, fill: '#fff' },
                { pt: P.stopA, label: t('vrpDemo.map.stopA'), anchor: 'middle', dx: 0, dy: -11, fill: '#fff' },
                { pt: P.mandi, label: t('vrpDemo.map.mandi'), anchor: 'end', dx: 4, dy: 18, fill: FOREST },
              ].map(({ pt, label, anchor, dx, dy, fill }) => (
                <g key={label}>
                  <rect x={pt.x - 4} y={pt.y - 4} width="8" height="8" fill={fill} stroke={INK} strokeWidth="2" />
                  <text x={pt.x + dx} y={pt.y + dy} fontSize="9" fontWeight="700" fill={INK} textAnchor={anchor}>
                    {label}
                  </text>
                </g>
              ))}

              {/* the incoming pickup */}
              {farmOpacity > 0.02 && (
                <g opacity={farmOpacity}>
                  {!prefersReduced && (
                    <circle cx={P.farm.x} cy={P.farm.y} r="5" fill="none" stroke={CLAY} strokeWidth="2">
                      <animate attributeName="r" values="5;15;5" dur="1.9s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0;0.8" dur="1.9s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={P.farm.x} cy={P.farm.y} r="4.5" fill={CLAY} stroke="#fff" strokeWidth="1.5" />
                  <text x={P.farm.x} y={P.farm.y + 18} fontSize="9" fontWeight="700" fill={INK} textAnchor="middle">
                    {t('vrpDemo.map.farm')}
                  </text>
                </g>
              )}

              {/* the idle van */}
              <g opacity={phase === 'ranking' ? 1 : 0.45}>
                <rect x={VAN.x - 5} y={VAN.y - 3.5} width="10" height="7" rx="1" fill="#fff" stroke={INK} strokeWidth="1.5" />
                {phase === 'ranking' && (
                  <text x={VAN.x - 6} y={VAN.y + 15} fontSize="8" fontWeight="700" fill="#6b726b">
                    {t('vrpDemo.map.van')}
                  </text>
                )}
              </g>

              {/* the truck */}
              <g transform={`translate(${truck.x} ${truck.y}) rotate(${rot})`}>
                <circle r="7" fill="#fff" stroke={INK} strokeWidth="1.5" />
                <path d="M6 0 L-4 -4.5 L-1.5 0 L-4 4.5 Z" fill={FOREST} />
              </g>

              {/* recalculating chip */}
              {recalcOpen && (
                <g transform={`translate(${P.stopA.x} ${P.stopA.y - 26})`}>
                  <rect x="-62" y="-11" width="124" height="18" fill="#fff" stroke={INK} strokeWidth="1.5" />
                  <text x="0" y="2" fontSize="8" fontWeight="700" fill={INK} textAnchor="middle">
                    {t('vrpDemo.recalculating')}
                  </text>
                </g>
              )}
            </svg>

            {/* step tabs */}
            <ol className="grid grid-cols-2 gap-px border-t-2 border-ink bg-ink sm:grid-cols-4">
              {PHASES.map((ph, idx) => (
                <li key={ph}>
                  <StepTab idx={idx} name={t(`vrpDemo.step.${ph}Name`)} />
                </li>
              ))}
            </ol>

            {/* controls */}
            <div className="flex flex-wrap items-center gap-2 border-t-2 border-ink p-3">
              <button
                type="button"
                onClick={() => setPlaying((v) => !v)}
                className={`${ctlBtn} border-forest-700 bg-forest-700 text-white hover:bg-forest-800`}
              >
                {playing
                  ? <><Pause className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />{t('vrpDemo.pause')}</>
                  : <><Play className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />{t('vrpDemo.play')}</>}
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'goto', i: (i + 1) % PHASES.length })}
                className={`${ctlBtn} bg-white text-ink hover:bg-turmeric-300`}
              >
                <SkipForward className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                {t('vrpDemo.next')}
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'reset' })}
                className={`${ctlBtn} bg-white text-ink hover:bg-turmeric-300`}
              >
                <RotateCcw className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                {t('vrpDemo.restart')}
              </button>
            </div>
          </div>

          {/* ---- The narrative + numbers ---- */}
          <div className="space-y-4">
            <div key={i} className="detail-enter border-2 border-ink bg-white p-4">
              <p className="eyebrow">{`${i + 1} / ${PHASES.length}`}</p>
              <p className="mt-1 font-display text-2xl leading-tight text-ink">
                {t(`vrpDemo.step.${phase}Name`)}
              </p>
              <p className="mt-2 text-base text-ink-soft">{t(`vrpDemo.step.${phase}Body`)}</p>
            </div>

            {i >= 1 && (
              <div className="slab-enter border-2 border-ink bg-white">
                <div className="flex items-center gap-2 border-b-2 border-ink bg-turmeric-300 px-3 py-1.5">
                  <PackagePlus className="h-4 w-4 text-ink" strokeWidth={2.5} aria-hidden="true" />
                  <span className="text-sm font-bold uppercase tracking-[0.08em] text-ink">
                    {t('vrpDemo.newRequest')}
                  </span>
                </div>
                <div className="space-y-1 px-3 py-3 text-base">
                  <p className="font-semibold text-ink">{t('vrpDemo.reqFarmer')}</p>
                  <p className="tnum text-ink-soft">
                    {number(2500)} {t('common.kg')} · {t('crops.Tomato')}
                  </p>
                  <p className="text-ink-soft">{t('vrpDemo.reqRoute')}</p>
                </div>
              </div>
            )}

            {i >= 2 && (
              <div className="border-2 border-ink bg-white">
                <p className="border-b-2 border-ink px-3 py-2 eyebrow">{t('vrpDemo.rank.heading')}</p>

                <div className="space-y-3 px-3 py-3">
                  <div>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-semibold text-ink">{t('vrpDemo.rank.freighter')}</span>
                      <span className="tnum shrink-0 font-bold text-forest-700">
                        +{number(55.4)} {t('common.km')}
                      </span>
                    </div>
                    <div className="mt-1 h-3 w-full bg-paper">
                      <div className="h-full bg-forest-700" style={{ width: `${(55.4 / 292.5) * 100 * barGrow}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-semibold text-ink">{t('vrpDemo.rank.van')}</span>
                      <span className="tnum shrink-0 font-bold text-terracotta-600">
                        +{number(292.5)} {t('common.km')}
                      </span>
                    </div>
                    <div className="mt-1 h-3 w-full bg-paper">
                      <div className="h-full bg-terracotta-500" style={{ width: `${100 * barGrow}%` }} />
                    </div>
                  </div>
                  <p className="text-sm text-ink-soft">{t('vrpDemo.rank.verdict')}</p>
                </div>

                <dl className="grid grid-cols-3 gap-px border-y-2 border-ink bg-ink">
                  {[
                    [t('dispatch.extraKm'), `+${number(55.4)} ${t('common.km')}`],
                    [t('dispatch.extraTime'), `+${number(114)} ${t('dispatch.min')}`],
                    [t('dispatch.extraCost'), money(4322)],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-white px-2 py-2 text-center">
                      <dt className="text-xs font-semibold text-ink-faint">{k}</dt>
                      <dd className="tnum font-display text-xl text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="px-3 py-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-soft">{t('vrpDemo.metric.committed')}</span>
                    <span className="tnum font-bold text-ink">{number(244.4)} {t('common.km')}</span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-ink-soft">{t('vrpDemo.metric.withPickup')}</span>
                    <span className="tnum font-bold text-forest-700">{number(299.8)} {t('common.km')}</span>
                  </div>
                </div>
              </div>
            )}

            {phase === 'reroute' && (
              <div className="detail-enter border-2 border-ink bg-white p-3">
                <div className="flex h-6 w-full overflow-hidden border border-ink">
                  <div className="h-full bg-ink" style={{ width: '40%' }} />
                  <div className="h-full bg-ink-faint" style={{ width: '30%' }} />
                  <div className="h-full bg-turmeric-300" style={{ width: `${25 * e}%` }} />
                  <div className="h-full flex-1 bg-white" />
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-ink-soft">
                  <span className="tnum">{t('dispatch.onBoard')} {number(4000)}</span>
                  <span className="tnum">{t('dispatch.committed')} {number(3000)}</span>
                  <span className="tnum">{t('dispatch.thisLot')} {number(2500)}</span>
                  <span className="tnum">{t('vrpDemo.cap.free')} {number(500)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 max-w-prose text-sm text-ink-faint">{t('vrpDemo.footnote')}</p>
      </div>
    </div>
  );
};

export default VrpSimulationScreen;
