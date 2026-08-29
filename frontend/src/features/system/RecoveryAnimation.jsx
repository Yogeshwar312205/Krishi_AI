import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../i18n/useT';

/**
 * A live schematic of the black box at work.
 *
 * Three zones, left to right: the last SNAPSHOT, the EVENT JOURNAL (a chain of
 * ticks), and the DATABASE (a grid of record tiles). It is driven entirely by
 * the real `health` payload and the `progress` events the recovery engine
 * broadcasts — nothing here is scripted:
 *
 *   idle        every tile green, the journal filling
 *   blackout    the affected tiles shatter to hollow outlines
 *   recovering  ticks light up left-to-right, particles stream journal -> db,
 *               tiles refill green in order; the unrecoverable one never does
 *   recovered   all green except the permanent loss, marked with an ✕
 *
 * Not geography, not a real disk — a postcard-sized diagram that stays legible
 * on a projector. Honours prefers-reduced-motion by holding the end state of
 * the current phase.
 */

const INK = '#14251A';
const FOREST = '#18532B';
const RULE = '#C9C4B4';
const CLAY = '#C1652D';
const TURMERIC = '#EDBF4F';
const PAPER = '#EFECE1';

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);

/* DB grid geometry, in the 480×230 view box. */
const GRID = { x: 322, y: 34, cols: 6, cell: 20, gap: 4 };
const tileXY = (i) => ({
  x: GRID.x + (i % GRID.cols) * (GRID.cell + GRID.gap),
  y: GRID.y + Math.floor(i / GRID.cols) * (GRID.cell + GRID.gap),
});
const JOURNAL = { x0: 108, x1: 292, y: 150 };

export const RecoveryAnimation = ({ health, progress = [] }) => {
  const { t } = useT();

  const prefersReduced = useRef(
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  ).current;

  // ---- derive the phase + counts from real state ------------------------------
  const mode = health?.mode || 'idle';
  const scope = health?.drill?.scopeCount || 0;
  const events = Math.min(health?.journal?.events || 0, 26);
  const affectedCount = health?.scan?.affectedCount || 0;
  const unrecCount = health?.scan?.unrecoverableCount || 0;

  const gridN = scope > 0 ? Math.min(24, Math.max(8, scope)) : 12;
  const affected = Math.min(gridN, affectedCount);
  const lost = Math.min(affected, unrecCount);
  const recoverable = Math.max(0, affected - lost);

  const doneSteps = useMemo(
    () => new Set(progress.filter((p) => p.status === 'done').map((p) => p.step)),
    [progress],
  );
  const anyRunning = progress.length > 0 && progress.some((p) => p.status !== 'done');

  let phase = 'idle';
  if (mode === 'recovering' || (anyRunning && !doneSteps.has('complete'))) phase = 'recovering';
  else if (progress.length && doneSteps.has('complete')) phase = 'recovered';
  else if (mode === 'blackout' || affected > 0) phase = 'blackout';

  // ---- clock ---------------------------------------------------------------
  const [clock, setClock] = useState(0);
  const phaseStart = useRef({ phase, at: 0 });
  if (phaseStart.current.phase !== phase) phaseStart.current = { phase, at: clock };
  const sincePhase = clock - phaseStart.current.at;

  useEffect(() => {
    if (prefersReduced) return undefined;
    let raf;
    let last;
    const loop = (now) => {
      if (last != null) setClock((c) => c + Math.min(now - last, 64));
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [prefersReduced]);

  // ---- per-frame derived values -----------------------------------------------
  const wipe = phase === 'blackout' ? (prefersReduced ? 1 : easeInOut(clamp01(sincePhase / 650))) : (phase === 'recovering' || phase === 'recovered' ? 1 : 0);

  // how far the "refill" sweep has progressed (0..1 across the recoverable set)
  let healT = 0;
  if (phase === 'recovered') healT = 1;
  else if (phase === 'recovering') {
    if (doneSteps.has('restore')) healT = 1;
    else if (doneSteps.has('reconstruct')) healT = prefersReduced ? 0.5 : easeInOut(clamp01(sincePhase / 2600));
  }

  const journalLit = phase === 'recovering'
    ? (doneSteps.has('replay') ? 1 : easeInOut(clamp01(sincePhase / 1400)))
    : (phase === 'recovered' ? 1 : phase === 'blackout' ? 1 : clamp01(events / 26));

  const particlesOn = phase === 'recovering' && !doneSteps.has('restore') && (doneSteps.has('snapshot') || doneSteps.has('replay'));

  // tile state: 'ok' | 'gone' | 'healing' | 'healed' | 'lost'
  const tileState = (i) => {
    const isAffected = i < affected;
    const isLost = i >= affected - lost && i < affected; // the last `lost` of the affected block
    if (!isAffected) return 'ok';
    if (phase === 'idle') return 'ok';
    if (phase === 'blackout') return 'gone';
    // recovering / recovered
    if (isLost) return phase === 'recovered' ? 'lost' : (wipe > 0.2 ? 'gone' : 'ok');
    // recoverable ones refill in index order
    const rank = i; // 0..recoverable-1 within the recoverable block (affected block minus lost tail)
    const frac = recoverable > 0 ? (rank + 1) / recoverable : 1;
    if (healT >= frac) return 'healed';
    if (healT >= frac - 0.18) return 'healing';
    return 'gone';
  };

  const fillFor = (st) => {
    if (st === 'ok' || st === 'healed') return FOREST;
    if (st === 'healing') return TURMERIC;
    return 'none';
  };
  const strokeFor = (st) => (st === 'gone' || st === 'lost' ? CLAY : INK);

  // ---- headline -------------------------------------------------------------
  const runningStep = [...progress].reverse().find((p) => p.status !== 'done')?.step;
  let headline = t('blackout.anim.idle');
  if (phase === 'blackout') headline = t('blackout.detected');
  else if (phase === 'recovering') headline = runningStep ? t(`blackout.step.${runningStep}`) : t('blackout.step.detect');
  else if (phase === 'recovered') headline = t('blackout.result.title');

  const headTone = phase === 'blackout' ? CLAY : phase === 'recovered' ? FOREST : phase === 'recovering' ? TURMERIC : INK;

  // ---- particles ---------------------------------------------------------------
  const particles = [];
  if (particlesOn && !prefersReduced && recoverable > 0) {
    const N = 6;
    for (let k = 0; k < N; k += 1) {
      const localT = ((clock / 900) + k / N) % 1;
      const e = easeInOut(localT);
      const target = tileXY(Math.max(0, Math.min(recoverable - 1, Math.floor(localT * recoverable))));
      const sx = JOURNAL.x1;
      const sy = JOURNAL.y;
      const tx = target.x + GRID.cell / 2;
      const ty = target.y + GRID.cell / 2;
      const cx = (sx + tx) / 2;
      const cy = Math.min(sy, ty) - 34;
      const x = (1 - e) * (1 - e) * sx + 2 * (1 - e) * e * cx + e * e * tx;
      const y = (1 - e) * (1 - e) * sy + 2 * (1 - e) * e * cy + e * e * ty;
      particles.push({ k, x, y, o: Math.sin(localT * Math.PI) });
    }
  }

  const rows = Math.ceil(gridN / GRID.cols);

  return (
    <div className="border-2 border-ink bg-white">
      <div className="flex items-center gap-2 border-b-2 border-ink px-3 py-1.5">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: headTone }}
          aria-hidden="true"
        />
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: headTone }}>
          {t('blackout.anim.title')} — {headline}
        </span>
      </div>

      <svg viewBox="0 0 480 230" className="block w-full" role="img" aria-label={`${t('blackout.anim.title')}: ${headline}`}>
        <rect x="0" y="0" width="480" height="230" fill={PAPER} />

        {/* baseline flow guide */}
        <line x1="96" y1={JOURNAL.y} x2="300" y2={JOURNAL.y} stroke={RULE} strokeWidth="2" strokeDasharray="2 4" />

        {/* ---- SNAPSHOT ---- */}
        <g>
          {[6, 3, 0].map((dy, idx) => (
            <rect
              key={dy}
              x={16} y={70 + dy} width={64} height={20}
              fill={idx === 2 ? '#fff' : PAPER}
              stroke={INK} strokeWidth="2"
            />
          ))}
          <text x={48} y={116} fontSize="9" fontWeight="700" fill={INK} textAnchor="middle">
            {t('blackout.anim.snapshot')}
          </text>
          <text x={48} y={128} fontSize="8" fill="#5F6E63" textAnchor="middle">
            seq {health?.snapshot?.atSeq ?? 0}
          </text>
          {/* pulse when the snapshot is being loaded */}
          {phase === 'recovering' && !doneSteps.has('snapshot') && !prefersReduced && (
            <rect
              x={14} y={68} width={68} height={26} fill="none" stroke={TURMERIC} strokeWidth="2"
              opacity={0.4 + 0.6 * Math.abs(Math.sin(clock / 260))}
            />
          )}
        </g>

        {/* ---- EVENT JOURNAL ---- */}
        <g>
          <text x={(JOURNAL.x0 + JOURNAL.x1) / 2} y={JOURNAL.y - 26} fontSize="9" fontWeight="700" fill={INK} textAnchor="middle">
            {t('blackout.anim.journal')}
          </text>
          {Array.from({ length: 26 }).map((_, k) => {
            const x = JOURNAL.x0 + (k / 25) * (JOURNAL.x1 - JOURNAL.x0);
            const has = k / 26 < Math.max(clamp01(events / 26), 0.06);
            const lit = k / 26 <= journalLit;
            return (
              <line
                key={k}
                x1={x} y1={JOURNAL.y - 9} x2={x} y2={JOURNAL.y + 9}
                stroke={!has ? RULE : lit && phase === 'recovering' ? FOREST : INK}
                strokeWidth={has ? 3 : 1.5}
                opacity={has ? 1 : 0.5}
              />
            );
          })}
          <text x={(JOURNAL.x0 + JOURNAL.x1) / 2} y={JOURNAL.y + 24} fontSize="8" fill="#5F6E63" textAnchor="middle">
            {health?.journal?.events ?? 0} events{health?.journal?.chainOk === false ? ' · chain broken' : ''}
          </text>
        </g>

        {/* ---- DATABASE grid ---- */}
        <g>
          <text x={GRID.x + (GRID.cols * (GRID.cell + GRID.gap)) / 2 - GRID.gap / 2} y={GRID.y - 10} fontSize="9" fontWeight="700" fill={INK} textAnchor="middle">
            {t('blackout.anim.database')}
          </text>
          {Array.from({ length: gridN }).map((_, i) => {
            const { x, y } = tileXY(i);
            const st = tileState(i);
            const jitter = st === 'gone' && phase === 'blackout' && !prefersReduced
              ? Math.sin((clock + i * 137) / 90) * 1.4 * (1 - wipe)
              : 0;
            return (
              <g key={i} transform={`translate(${x + jitter} ${y})`}>
                <rect
                  width={GRID.cell} height={GRID.cell}
                  fill={fillFor(st)}
                  stroke={strokeFor(st)}
                  strokeWidth="2"
                  strokeDasharray={st === 'gone' ? '3 3' : undefined}
                  opacity={st === 'gone' ? 0.45 + 0.2 * (1 - wipe) : 1}
                />
                {st === 'lost' && (
                  <>
                    <line x1="3" y1="3" x2={GRID.cell - 3} y2={GRID.cell - 3} stroke={CLAY} strokeWidth="2.5" />
                    <line x1={GRID.cell - 3} y1="3" x2="3" y2={GRID.cell - 3} stroke={CLAY} strokeWidth="2.5" />
                  </>
                )}
                {(st === 'healed' || st === 'ok') && (
                  <path d={`M4 ${GRID.cell / 2} l4 4 l8 -9`} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
                )}
              </g>
            );
          })}
          {lost > 0 && (phase === 'recovered' || phase === 'recovering') && (
            <text
              x={GRID.x + (GRID.cols * (GRID.cell + GRID.gap)) / 2 - GRID.gap / 2}
              y={GRID.y + rows * (GRID.cell + GRID.gap) + 6}
              fontSize="8" fontWeight="700" fill={CLAY} textAnchor="middle"
            >
              {lost} {t('blackout.anim.lost')}
            </text>
          )}
        </g>

        {/* ---- particles journal -> db ---- */}
        {particles.map((p) => (
          <rect key={p.k} x={p.x - 3} y={p.y - 3} width="6" height="6" fill={FOREST} opacity={p.o} />
        ))}
      </svg>
    </div>
  );
};

export default RecoveryAnimation;
