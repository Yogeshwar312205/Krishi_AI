import React, { useCallback, useEffect, useState } from 'react';
import {
  Truck, Package, MapPin, Phone, CloudOff, RefreshCw, PackageCheck, Play, Flag, X, IndianRupee,
} from 'lucide-react';
import { useT } from '../../i18n/useT';
import { fetchDispatchQueue, updateRequestStatus } from '../../services/api';
import { fleetJobTotals, isDelivered, deliveredAt } from '../../data/ledger';
import { SectionHead } from '../../design/primitives/SectionHead';
import { SegmentedToggle } from '../../design/primitives/SegmentedToggle';
import { Button } from '../../design/primitives/Button';
import { TrackingTimeline } from './TrackingTimeline';
import { TrackingMap } from './TrackingMap';
import { ShareLocationButton } from './ShareLocationButton';

/**
 * The work this fleet has taken on, and how far along each job is.
 *
 * This is the fleet owner's half of tracking; the farmer sees the same timeline
 * on their own Vehicle screen, read from the same request record. Neither side
 * derives status locally — one server, one account of where the lot is.
 */
const ACTIONS = {
  assigned:   { next: 'collected',  icon: PackageCheck, key: 'tracking.action.collect' },
  collected:  { next: 'in_transit', icon: Play,         key: 'tracking.action.depart' },
  in_transit: { next: 'delivered',  icon: Flag,         key: 'tracking.action.deliver' },
};

const OPEN = ['assigned', 'collected', 'in_transit'];

export const LogisticsJobsScreen = () => {
  const { t, number, money, shortDate } = useT();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [panel, setPanel] = useState('open');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDispatchQueue();
      setJobs(data.assigned || []);
    } catch (err) {
      setError(err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const move = async (request, status) => {
    setBusyId(request.id);
    try {
      await updateRequestStatus(request.id, status);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const open = jobs.filter((j) => OPEN.includes(j.status));
  const done = jobs.filter((j) => !OPEN.includes(j.status));
  const list = panel === 'open' ? open : done;
  const doneTotals = fleetJobTotals(jobs);

  return (
    <div className="space-y-6 pt-4 pb-4">
      <SectionHead
        level="screen"
        title={t('tracking.jobsTitle')}
        note={t('tracking.jobsNote')}
        action={
          <Button full={false} variant="secondary" icon={RefreshCw} onClick={refresh} busy={loading}>
            {t('dispatch.refresh')}
          </Button>
        }
      />

      {error && (
        <div className="border-2 border-terracotta-500 bg-terracotta-50 px-4 py-6 text-center">
          <CloudOff className="mx-auto h-8 w-8 text-terracotta-600" strokeWidth={2} aria-hidden="true" />
          <p className="mt-3 font-display text-2xl text-ink">{t('tracking.offline')}</p>
          <div className="mx-auto mt-4 max-w-xs">
            <Button icon={RefreshCw} onClick={refresh}>{t('dispatch.retry')}</Button>
          </div>
        </div>
      )}

      {!error && (
        <SegmentedToggle
          options={[
            { id: 'open', label: t('tracking.open') },
            { id: 'done', label: t('tracking.done') },
          ]}
          value={panel}
          onChange={setPanel}
        />
      )}

      {!error && !loading && list.length === 0 && (
        <div className="border-2 border-ink bg-white px-4 py-10 text-center">
          <p className="font-display text-3xl text-ink-faint">
            {panel === 'open' ? t('tracking.noOpen') : t('tracking.noDone')}
          </p>
        </div>
      )}

      {panel === 'done' && doneTotals.jobs > 0 && (
        <div className="space-y-1">
          <dl className="grid grid-cols-2 gap-px border-2 border-ink bg-ink sm:grid-cols-4">
            {[
              [t('history.jobs'), number(doneTotals.jobs)],
              [t('history.carried'), `${number(doneTotals.kg)} ${t('common.kg')}`],
              [t('history.detourKm'), `${number(Math.round(doneTotals.addedKm))} ${t('common.km')}`],
              [t('history.freightEarned'), money(doneTotals.freightEarned)],
            ].map(([k, v]) => (
              <div key={k} className="bg-white px-2 py-2.5 text-center">
                <dt className="text-xs font-semibold text-ink-faint">{k}</dt>
                <dd className="mt-0.5 font-display text-xl leading-none tnum text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-ink-faint">{t('history.seasonSoFar')}</p>
        </div>
      )}

      <div key={panel} className="detail-enter space-y-4">
        {list.map((request) => {
          const action = ACTIONS[request.status];
          const Icon = action?.icon;

          return (
            <article key={request.id} className="border-2 border-ink bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-3">
                <p className="font-display text-2xl leading-none tnum text-ink">
                  {t('dispatch.ref', { ref: request.id.slice(-6).toUpperCase() })}
                </p>
                <span className="border-2 border-ink bg-turmeric-300 px-2 py-1 text-sm font-bold leading-none text-ink">
                  {t(`tracking.status.${request.status}`)}
                </span>
              </div>

              <div className="space-y-2.5 px-4 py-3.5 text-base">
                <p className="flex items-center gap-2 text-ink">
                  <Truck className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2.25} aria-hidden="true" />
                  <span className="font-semibold tnum">{request.vehicle?.vehicleNo}</span>
                  <span className="text-ink-soft">{request.vehicle?.driverName}</span>
                </p>
                <p className="flex items-center gap-2 text-ink">
                  <MapPin className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2.25} aria-hidden="true" />
                  <span className="text-ink-faint">{t('dispatch.pickup')}:</span>
                  <span className="font-semibold">{request.origin.label}</span>
                </p>
                <p className="flex items-center gap-2 text-ink">
                  <MapPin className="h-4 w-4 shrink-0 text-forest-700" strokeWidth={2.25} aria-hidden="true" />
                  <span className="text-ink-faint">{t('dispatch.drop')}:</span>
                  <span className="font-semibold">{request.destination.label}</span>
                </p>
                <p className="flex items-center gap-2 text-ink">
                  <Package className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2.25} aria-hidden="true" />
                  <span className="font-semibold">
                    {t(`crops.${request.cropType}`)} · {number(request.quantityKg)} {t('common.kg')}
                  </span>
                </p>
                <p className="flex items-center gap-2 text-ink-soft">
                  <Phone className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2.25} aria-hidden="true" />
                  {request.farmerName} · <span className="tnum">{request.farmerPhone}</span>
                </p>

                {request.dispatch?.insertionCostKm != null && !isDelivered(request) && (
                  <p className="text-sm text-ink-faint tnum">
                    {t('tracking.costWas', {
                      km: number(request.dispatch.insertionCostKm),
                      cost: money(request.dispatch.addedFreightCost || 0),
                    })}
                  </p>
                )}
              </div>

              <div className="border-t-2 border-ink px-4 py-3.5">
                <TrackingTimeline request={request} />
              </div>

              <div className="border-t-2 border-ink px-4 py-2">
                <TrackingMap request={request} />
              </div>

              {/*
               * Only while the job is live. Sharing a position for a lot that
               * was delivered yesterday collects somebody's location for
               * nothing, and the farmer's map has nothing left to show.
               */}
              {OPEN.includes(request.status) && request.vehicle?.id && (
                <div className="border-t-2 border-ink px-4 py-3.5">
                  <ShareLocationButton
                    vehicleId={request.vehicle.id}
                    vehicleNo={request.vehicle.vehicleNo}
                  />
                </div>
              )}

              {isDelivered(request) && (
                <div className="border-t-2 border-ink bg-forest-50 px-4">
                  <p className="eyebrow flex items-center gap-1.5 pt-3.5">
                    <IndianRupee className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                    {t('history.jobFreight')}
                  </p>
                  <p className="mt-1 font-display text-3xl leading-none tnum text-forest-700">
                    {money(request.dispatch?.addedFreightCost || 0)}
                  </p>
                  {request.dispatch?.insertionCostKm != null && (
                    <p className="mt-1 text-sm text-ink-soft tnum">
                      {t('history.detourKm')}: {number(Math.round(request.dispatch.insertionCostKm))} {t('common.km')}
                    </p>
                  )}
                  <p className="pb-3.5 pt-1.5 text-sm text-ink-faint">
                    {deliveredAt(request)
                      ? t('history.deliveredOn', { date: shortDate(deliveredAt(request)) })
                      : t('tracking.status.delivered')}
                  </p>
                </div>
              )}

              {action && (
                <div className="grid gap-2 border-t-2 border-ink px-4 py-3.5 sm:grid-cols-2">
                  <Button
                    variant="secondary" icon={X} disabled={busyId === request.id}
                    onClick={() => move(request, 'cancelled')}
                  >
                    {t('tracking.action.cancel')}
                  </Button>
                  <Button
                    variant="accent" icon={Icon} busy={busyId === request.id}
                    onClick={() => move(request, action.next)}
                  >
                    {t(action.key)}
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default LogisticsJobsScreen;
