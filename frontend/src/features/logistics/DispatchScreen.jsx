import React, { useState } from 'react';
import {
  User, MapPin, Package, Clock, ChevronDown, RefreshCw, CloudOff, Ban, HelpCircle,
} from 'lucide-react';
import { useT } from '../../i18n/useT';
import { useAppStore } from '../../store/useAppStore';
import { VRP_DEMO_TAB } from '../../app/routes';
import { approveSuggestion } from '../../services/api';
import { SectionHead } from '../../design/primitives/SectionHead';
import { Button } from '../../design/primitives/Button';
import { SuggestionCard } from './SuggestionCard';
import { useDispatch } from './useDispatch';

/**
 * The dispatcher's screen — the capacitated VRP, with a human in the loop.
 *
 * For each pending farmer request it shows the vehicles ranked by what it would
 * actually cost to slot that farmer into the route each one is already driving.
 * It suggests. The dispatcher approves. Nothing here auto-assigns, and that is
 * a product decision: the dispatcher knows things the arithmetic does not —
 * that this farmer will wait, that this driver knows that road.
 *
 * The rejected pairs are shown too, with their reason. A dispatcher who sees
 * four vehicles out of six and no explanation assumes the software is broken.
 *
 * See VRP.md for the algorithm.
 */

const REASON_KEYS = {
  capacity: 'dispatch.reason.capacity',
  'no-feasible-position': 'dispatch.reason.noPosition',
  'route-missing-coordinates': 'dispatch.reason.vehicleNoCoords',
  'no-pickup-coordinates': 'dispatch.reason.noPickupCoords',
  'no-drop-coordinates': 'dispatch.reason.noDropCoords',
};

export const RequestHead = ({ request, t, number }) => (
  <div className="space-y-2.5 px-4 py-3.5 text-base">
    <p className="flex items-center gap-2 text-ink">
      <User className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2.25} aria-hidden="true" />
      <span className="font-semibold">{request.farmerName}</span>
      {request.farmerPhone && <span className="tnum text-ink-soft">{request.farmerPhone}</span>}
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
      <Clock className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2.25} aria-hidden="true" />
      {request.pickupDate} · {request.window?.label || t('dispatch.anyTime')}
    </p>
  </div>
);

export const DispatchScreen = () => {
  const { t, tCount, number } = useT();
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  const {
    pending, vehicleById, loading, error, source, counts,
    suggestionsFor, infeasibleFor, unrankableFor, dismiss, refresh,
  } = useDispatch();

  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [claimError, setClaimError] = useState(null);

  const routeOf = (vehicleId) => vehicleById.get(vehicleId)?.currentRoute || [];

  /*
   * Approving claims the request server-side. Two fleets can be looking at the
   * same lot, so the server only hands it to the first — a 409 here means
   * somebody else got there, which is worth saying rather than swallowing.
   */
  const approve = async (requestId, suggestion) => {
    setBusyId(requestId);
    setClaimError(null);
    try {
      await approveSuggestion(requestId, {
        vehicleId: suggestion.vehicleId,
        proposedRoute: suggestion.proposedRoute,
        dispatch: {
          insertionCostKm: suggestion.insertionCostKm,
          addedFreightCost: suggestion.addedFreightCost,
          estimatedAddedMinutes: suggestion.estimatedAddedMinutes,
          pickupPosition: suggestion.bestInsertionPosition,
          dropPosition: suggestion.dropPosition,
        },
      });
      setOpenId(null);
      await refresh();
    } catch (err) {
      setClaimError(err?.response?.status === 409 ? t('dispatch.taken') : t('dispatch.approveFailed'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 pt-4 pb-4">
      <SectionHead
        level="screen"
        title={t('dispatch.title')}
        note={t('dispatch.note')}
        action={
          <div className="flex items-center gap-2">
            {/*
             * The way in to the routing walk-through. A dispatcher who has
             * never seen why the nearest truck is often the wrong one needs
             * the picture, not the paragraph — see VrpSimulationScreen.
             */}
            <button
              type="button"
              onClick={() => setActiveTab(VRP_DEMO_TAB)}
              aria-label={t('vrpDemo.entry')}
              title={t('vrpDemo.entry')}
              className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-ink bg-white text-ink transition-colors hover:bg-turmeric-300"
            >
              <HelpCircle className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
            </button>
            <Button full={false} variant="secondary" icon={RefreshCw} onClick={refresh} busy={loading}>
              {t('dispatch.refresh')}
            </Button>
          </div>
        }
      />

      {/*
       * No local fallback on purpose. Two copies of a ranking algorithm can
       * drift apart silently, and a dispatcher acting on the wrong one commits
       * a real truck. Say it is down instead.
       */}
      {error && (
        <div className="border-2 border-terracotta-500 bg-terracotta-50 px-4 py-6 text-center">
          <CloudOff className="mx-auto h-8 w-8 text-terracotta-600" strokeWidth={2} aria-hidden="true" />
          <p className="mt-3 font-display text-2xl text-ink">{t('dispatch.offline')}</p>
          <p className="mx-auto mt-1 max-w-prose text-base text-ink-soft">{t('dispatch.offlineWhy')}</p>
          <div className="mx-auto mt-4 max-w-xs">
            <Button icon={RefreshCw} onClick={refresh}>{t('dispatch.retry')}</Button>
          </div>
        </div>
      )}

      {claimError && <p className="notice notice-bad" role="alert">{claimError}</p>}

      {/*
       * A fleet owner with no trucks would otherwise see "no requests waiting"
       * and conclude nobody wants anything, when in fact nothing of theirs can
       * be ranked. Two different problems, two different sentences.
       */}
      {!error && !loading && counts?.vehicles === 0 && (
        <div className="border-2 border-ink bg-white px-4 py-10 text-center">
          <p className="font-display text-3xl text-ink-faint">{t('dispatch.noFleet')}</p>
          <p className="mx-auto mt-2 max-w-prose text-base text-ink-soft">{t('dispatch.noFleetWhy')}</p>
        </div>
      )}

      {!error && !loading && counts?.vehicles > 0 && pending.length === 0 && (
        <div className="border-2 border-ink bg-white px-4 py-10 text-center">
          <p className="font-display text-3xl text-ink-faint">{t('dispatch.empty')}</p>
          <p className="mx-auto mt-2 max-w-prose text-base text-ink-soft">{t('dispatch.emptyWhy')}</p>
        </div>
      )}

      {!error && pending.map((request) => {
        const suggestions = suggestionsFor(request.id);
        const rejected = infeasibleFor(request.id);
        const unrankable = unrankableFor(request.id);
        const open = openId === request.id;

        return (
          <article key={request.id} className="border-2 border-ink bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-3">
              <p className="font-display text-2xl leading-none tnum text-ink">
                {t('dispatch.ref', { ref: request.id.slice(-6).toUpperCase() })}
              </p>
              <span className="border-2 border-ink bg-turmeric-300 px-2 py-1 text-sm font-bold leading-none text-ink">
                {loading
                  ? t('common.loading')
                  : tCount('dispatch.optionCount', suggestions.length)}
              </span>
            </div>

            <RequestHead request={request} t={t} number={number} />

            {unrankable && (
              <div className="border-t-2 border-ink bg-terracotta-50 px-4 py-3.5">
                <p className="flex items-start gap-2 text-base font-bold text-terracotta-700">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                  {t('dispatch.cannotRank')}
                </p>
                <p className="mt-1 text-base text-ink-soft">
                  {t(REASON_KEYS[unrankable.reason] || 'dispatch.reason.noPickupCoords')}
                </p>
                <p className="mt-1 text-base text-ink-soft">{t('dispatch.cannotRankWhy')}</p>
              </div>
            )}

            {!unrankable && (
              <div className="border-t-2 border-ink">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : request.id)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left text-base font-bold text-forest-700"
                >
                  {open ? t('dispatch.hideOptions') : t('dispatch.showOptions')}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                </button>

                {open && (
                  <div className="detail-enter space-y-3 border-t-2 border-ink bg-paper px-3 py-3.5">
                    {suggestions.length === 0 && !loading && (
                      <p className="px-1 py-4 text-center text-base text-ink-soft">
                        {t('dispatch.noOptions')}
                      </p>
                    )}

                    {suggestions.map((suggestion, index) => (
                      <SuggestionCard
                        key={`${suggestion.vehicleId}-${suggestion.requestId}`}
                        suggestion={suggestion}
                        rank={index + 1}
                        currentRoute={routeOf(suggestion.vehicleId)}
                        busy={busyId === request.id}
                        onApprove={(s) => approve(request.id, s)}
                        onReject={(s) => dismiss(request.id, s.vehicleId)}
                      />
                    ))}

                    {/*
                     * Why the rest of the fleet is not offered. Filtering these
                     * away silently is what makes a dispatcher distrust the
                     * screen.
                     */}
                    {rejected.length > 0 && (
                      <div className="border-2 border-ink bg-white px-4 py-3">
                        <p className="flex items-center gap-2 field-label">
                          <Ban className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                          {t('dispatch.notOffered')}
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {rejected.map((item) => (
                            <li key={item.vehicleId} className="text-base text-ink-soft">
                              <span className="font-semibold tnum text-ink">{item.vehicleNo}</span>
                              {' — '}
                              {t(REASON_KEYS[item.reason] || 'dispatch.reason.noPosition')}
                              {item.reason === 'capacity' && item.shortfallKg > 0 && (
                                <span className="tnum">
                                  {' '}({t('dispatch.shortBy', { kg: number(item.shortfallKg) })})
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}

      {source && !error && (
        <p className="text-center text-sm text-ink-faint">{source}</p>
      )}
    </div>
  );
};

export default DispatchScreen;
