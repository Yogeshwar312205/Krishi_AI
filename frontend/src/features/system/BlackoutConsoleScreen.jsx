import React, { useState } from 'react';
import {
  ArrowLeft, Database, ScrollText, LifeBuoy, Skull, Play, Square,
  RotateCcw, ShieldCheck, Loader2, Check, AlertTriangle, Camera,
} from 'lucide-react';

import { useT } from '../../i18n/useT';
import { SectionHead } from '../../design/primitives/SectionHead';
import { useSystemHealth } from './useSystemHealth';
import { RecoveryAnimation } from './RecoveryAnimation';
import {
  seedDrillData, simulateBlackout, resetDrill, startLoadGen, stopLoadGen,
  recoverSystem, takeSystemSnapshot,
} from '../../services/api';

/* The steps the recovery engine broadcasts, in order, so the panel can show
 * every one as pending before its event arrives. */
const RECOVERY_STEPS = ['detect', 'snapshot', 'replay', 'reconstruct', 'validate', 'restore', 'replay-queue', 'complete'];

const DOT = {
  ok: 'bg-forest-600',
  warn: 'bg-turmeric-500',
  bad: 'bg-terracotta-500',
  idle: 'bg-ink-faint',
};

const Light = ({ icon: Icon, label, tone, line1, line2 }) => (
  <div className="border-2 border-ink bg-white p-3">
    <div className="flex items-center gap-2">
      <span className={`inline-block h-3 w-3 rounded-full ${DOT[tone] || DOT.idle}`} aria-hidden="true" />
      <Icon className="h-4 w-4 text-ink-soft" strokeWidth={2.25} aria-hidden="true" />
      <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">{label}</span>
    </div>
    <p className="mt-2 font-display text-lg leading-tight text-ink">{line1}</p>
    {line2 ? <p className="text-xs text-ink-faint">{line2}</p> : null}
  </div>
);

const Metric = ({ label, value }) => (
  <div className="border-2 border-ink bg-white px-3 py-2">
    <p className="tnum font-display text-2xl leading-none text-ink">{value}</p>
    <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-ink-faint">{label}</p>
  </div>
);

export const BlackoutConsoleScreen = ({ onExit }) => {
  const { t, number } = useT();
  const { health, progress, refresh, clearProgress } = useSystemHealth();
  const [busy, setBusy] = useState(null); // which action is in flight
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  const mode = health?.mode || 'unknown';
  const scan = health?.scan || {};
  const loadRunning = health?.load?.running;

  const run = async (key, fn, { keepReport = false } = {}) => {
    setBusy(key);
    setError('');
    if (!keepReport) setReport(null);
    try {
      const res = await fn();
      await refresh();
      return res;
    } catch (err) {
      setError(err.message || String(err));
      return null;
    } finally {
      setBusy(null);
    }
  };

  const onRecover = async () => {
    clearProgress();
    const res = await run('recover', recoverSystem, { keepReport: true });
    if (res?.report) setReport(res.report);
  };

  // ---- derived light states -------------------------------------------------
  const dbTone = !health?.mongoConnected ? 'bad' : health?.db === 'degraded' ? 'warn' : 'ok';
  const dbLine = !health?.mongoConnected
    ? t('blackout.light.dbDown')
    : health?.db === 'degraded' ? t('blackout.light.dbDegraded') : t('blackout.light.dbOnline');

  const journalOk = health?.journal?.status === 'intact' && health?.journal?.chainOk;
  const jTone = journalOk ? 'ok' : health?.journal ? 'bad' : 'idle';

  const recTone = mode === 'recovering' ? 'warn' : mode === 'blackout' ? 'bad' : report ? 'ok' : 'idle';
  const recLine = mode === 'recovering'
    ? t('blackout.light.recRunning')
    : mode === 'blackout' ? t('blackout.light.recNeeded')
      : report ? t('blackout.light.recDone') : t('blackout.light.recIdle');

  const blackoutDetected = (scan.affectedCount || 0) > 0;

  const ctl = 'inline-flex items-center gap-1.5 border-2 border-ink px-3 py-2 text-sm font-bold transition-colors disabled:opacity-40';

  return (
    <div className="min-h-full bg-paper">
      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
        <button type="button" onClick={onExit} className={`lift mb-3 bg-white text-ink hover:bg-turmeric-300 ${ctl}`}>
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          {t('common.back')}
        </button>

        <SectionHead level="screen" title={t('blackout.title')} note={t('blackout.intro')} />

        {health?.unreachable ? (
          <p className="notice notice-bad mt-4" role="alert">{t('blackout.unreachable')}</p>
        ) : null}

        {/* ---- status lights ---- */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Light
            icon={Database} label={t('blackout.light.db')} tone={dbTone} line1={dbLine}
            line2={health?.counts ? t('blackout.light.dbRows', { n: number((health.counts.User || 0) + (health.counts.Vehicle || 0) + (health.counts.PickupRequest || 0) + (health.counts.BuyerPosting || 0)) }) : ''}
          />
          <Light
            icon={ScrollText} label={t('blackout.light.journal')} tone={jTone}
            line1={journalOk ? t('blackout.light.journalOk') : t('blackout.light.journalBroken')}
            line2={health?.journal ? t('blackout.light.journalEvents', { n: number(health.journal.events || 0) }) : ''}
          />
          <Light
            icon={LifeBuoy} label={t('blackout.light.recovery')} tone={recTone} line1={recLine}
            line2={health?.queue?.pending ? t('blackout.light.queued', { n: number(health.queue.pending) }) : ''}
          />
        </div>

        {/* ---- metrics ---- */}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label={t('blackout.metric.requests')} value={number(health?.counts?.PickupRequest ?? 0)} />
          <Metric label={t('blackout.metric.vehicles')} value={number(health?.counts?.Vehicle ?? 0)} />
          <Metric label={t('blackout.metric.events')} value={number(health?.journal?.events ?? 0)} />
          <Metric label={t('blackout.metric.snapshot')} value={health?.snapshot?.ageSec != null ? t('blackout.metric.agoSec', { n: number(health.snapshot.ageSec) }) : '—'} />
          <Metric label={t('blackout.metric.queued')} value={number(health?.queue?.pending ?? 0)} />
          <Metric label={t('blackout.metric.scope')} value={number(health?.drill?.scopeCount ?? 0)} />
        </div>

        {/* ---- blackout banner ---- */}
        {blackoutDetected ? (
          <div className="mt-4 border-2 border-terracotta-500 bg-terracotta-50 p-4">
            <p className="flex items-center gap-2 font-display text-2xl text-terracotta-700">
              <AlertTriangle className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
              {t('blackout.detected')}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {t('blackout.detectedLine', {
                affected: number(scan.affectedCount || 0),
                recoverable: number(scan.recoverable || 0),
                unrecoverable: number(scan.unrecoverableCount || 0),
              })}
            </p>
            {(scan.unrecoverable || []).length ? (
              <ul className="mt-2 space-y-1 text-xs text-ink-faint">
                {scan.unrecoverable.map((u) => (
                  <li key={`${u.entityType}-${u.entityId}`}>
                    <span className="font-bold">{u.entityType}</span> {String(u.entityId).slice(-6)} — {u.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="notice notice-bad mt-4" role="alert">{error}</p> : null}

        {/* ---- controls ---- */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={!!busy} onClick={() => run('seed', seedDrillData)}
            className={`bg-white text-ink hover:bg-forest-50 ${ctl}`}>
            {busy === 'seed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" strokeWidth={2.25} />}
            {t('blackout.btn.seed')}
          </button>

          <button type="button" disabled={!!busy} onClick={() => run('blackout', simulateBlackout)}
            className={`bg-terracotta-500 text-white hover:bg-terracotta-600 ${ctl}`}>
            {busy === 'blackout' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Skull className="h-4 w-4" strokeWidth={2.5} />}
            {t('blackout.btn.blackout')}
          </button>

          {loadRunning ? (
            <button type="button" disabled={!!busy} onClick={() => run('load', stopLoadGen)}
              className={`bg-white text-ink hover:bg-turmeric-300 ${ctl}`}>
              <Square className="h-4 w-4" strokeWidth={2.5} />
              {t('blackout.btn.loadStop', { n: number(health?.load?.raised ?? 0) })}
            </button>
          ) : (
            <button type="button" disabled={!!busy} onClick={() => run('load', startLoadGen)}
              className={`bg-white text-ink hover:bg-forest-50 ${ctl}`}>
              <Play className="h-4 w-4" strokeWidth={2.5} />
              {t('blackout.btn.loadStart')}
            </button>
          )}

          <button type="button" disabled={!!busy || mode === 'recovering'} onClick={onRecover}
            className={`bg-forest-700 text-white hover:bg-forest-800 ${ctl}`}>
            {busy === 'recover' || mode === 'recovering'
              ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" strokeWidth={2.5} />}
            {t('blackout.btn.recover')}
          </button>

          <button type="button" disabled={!!busy} onClick={() => run('snapshot', takeSystemSnapshot)}
            className={`bg-white text-ink hover:bg-forest-50 ${ctl}`}>
            <Camera className="h-4 w-4" strokeWidth={2.25} />
            {t('blackout.btn.snapshot')}
          </button>

          <button type="button" disabled={!!busy} onClick={() => run('reset', resetDrill)}
            className={`bg-white text-ink-soft hover:bg-white ${ctl}`}>
            <RotateCcw className="h-4 w-4" strokeWidth={2.25} />
            {t('blackout.btn.reset')}
          </button>
        </div>

        {/* ---- live schematic ---- */}
        <div className="mt-4">
          <RecoveryAnimation health={health} progress={progress} />
        </div>

        {/* ---- recovery progress ---- */}
        {progress.length ? (
          <div className="mt-4 border-2 border-ink bg-white p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-soft">{t('blackout.progress.title')}</p>
            <ol className="space-y-1.5">
              {RECOVERY_STEPS.map((step) => {
                const evt = [...progress].reverse().find((p) => p.step === step);
                const done = evt?.status === 'done';
                const running = evt && !done;
                return (
                  <li key={step} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 shrink-0">
                      {done ? <Check className="h-4 w-4 text-forest-600" strokeWidth={3} />
                        : running ? <Loader2 className="h-4 w-4 animate-spin text-turmeric-600" />
                          : <span className="inline-block h-4 w-4 rounded-full border-2 border-ink-faint" />}
                    </span>
                    <span className={done ? 'text-ink' : running ? 'text-ink' : 'text-ink-faint'}>
                      <span className="font-bold">{t(`blackout.step.${step}`)}</span>
                      {evt?.detail ? <span className="text-ink-soft"> — {evt.detail}</span> : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}

        {/* ---- final report ---- */}
        {report ? (
          <div className="mt-4 border-2 border-forest-600 bg-forest-50 p-4">
            <p className="flex items-center gap-2 font-display text-2xl text-forest-800">
              <ShieldCheck className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
              {t('blackout.result.title')}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Metric label={t('blackout.result.recovered')} value={number(report.recovered)} />
              <Metric label={t('blackout.result.unrecoverable')} value={number(report.unrecoverableCount)} />
              <Metric label={t('blackout.result.opsDuringOutage')} value={number(report.opsDuringOutage)} />
              <Metric label={t('blackout.result.queuedReplayed')} value={`${number(report.queuedReplayed)}/${number(report.queuedTotal)}`} />
              <Metric label={t('blackout.result.consistency')} value={report.consistencyPct != null ? `${report.consistencyPct}%` : '—'} />
            </div>
            {report.unrecoverable?.length ? (
              <ul className="mt-3 space-y-1 text-xs text-ink-faint">
                {report.unrecoverable.map((u, i) => (
                  <li key={i}><span className="font-bold">{u.entityType}</span> {String(u.entityId).slice(-6)} — {u.reason}</li>
                ))}
              </ul>
            ) : null}
            <p className="mt-3 text-sm font-bold text-forest-800">{t('blackout.result.operational')}</p>
          </div>
        ) : null}

        <p className="mt-6 text-xs text-ink-faint">{t('blackout.footnote')}</p>
      </div>
    </div>
  );
};

export default BlackoutConsoleScreen;
