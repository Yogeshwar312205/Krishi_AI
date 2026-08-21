import React, { useState } from 'react';
import { Check, X, Snowflake, AlertTriangle, Clock, ChevronDown, Route as RouteIcon } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { Button } from '../../design/primitives/Button';
import { CapacityBar } from './CapacityBar';
import { RouteDiagram } from './RouteDiagram';

/**
 * One (vehicle, request) pair, priced.
 *
 * The extra kilometres lead, in display numerals, because that is the rank key
 * and the only number the dispatcher is really choosing on. Everything else on
 * the card exists to answer "and is there a reason not to" — capacity, cold
 * chain, the farmer's window — and each of those is a warning they weigh, never
 * a vehicle we hide from them.
 *
 * "Show the working" is not an extra. Every number in this app opens into its
 * arithmetic (see MandiRow and WhyFurther on the farmer side), and a dispatch
 * suggestion nobody can audit is one nobody will act on.
 */
export const SuggestionCard = ({ suggestion, rank, currentRoute, busy, onApprove, onReject }) => {
  const { t, number, money } = useT();
  const [showWorking, setShowWorking] = useState(false);

  const cold = suggestion.produceCompatibility;
  const windowVerdict = suggestion.timeWindow?.verdict;
  const hasWarning = cold === 'warn-not-refrigerated' || windowVerdict === 'late' || windowVerdict === 'early';

  const eta = suggestion.timeWindow?.etaAtPickup
    ? new Date(suggestion.timeWindow.etaAtPickup).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata',
      })
    : null;

  return (
    <article className={`border-2 bg-white ${rank === 1 ? 'border-forest-700' : 'border-ink'}`}>
      {/* header: who, and the one number that ranks them */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-ink px-4 py-3">
        <div className="min-w-0">
          <p className="font-display text-2xl leading-none tnum text-ink">{suggestion.vehicleNo}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {suggestion.vehicleType} · {suggestion.driverName}
          </p>
        </div>
        <div className="text-right">
          <p className="field-label mb-0.5">{t('dispatch.extraKm')}</p>
          <p className="font-display text-3xl leading-none tnum text-forest-700">
            +{number(suggestion.insertionCostKm)}
          </p>
          <p className="text-sm text-ink-soft">{t('common.km')}</p>
        </div>
      </div>

      <div className="space-y-4 px-4 py-3.5">
        {/* what the detour costs, in the two other units that matter */}
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-base">
          <div>
            <dt className="field-label mb-0.5">{t('dispatch.extraTime')}</dt>
            <dd className="font-display text-xl leading-none tnum text-ink">
              +{number(suggestion.estimatedAddedMinutes)} {t('dispatch.min')}
            </dd>
          </div>
          <div>
            <dt className="field-label mb-0.5">{t('dispatch.extraCost')}</dt>
            <dd className="font-display text-xl leading-none tnum text-ink">
              +{money(suggestion.addedFreightCost)}
            </dd>
          </div>
          <div>
            <dt className="field-label mb-0.5">{t('dispatch.position')}</dt>
            <dd className="font-display text-xl leading-none tnum text-ink">
              {t('dispatch.positionValue', {
                pickup: suggestion.bestInsertionPosition,
                drop: suggestion.dropPosition,
              })}
            </dd>
          </div>
        </dl>

        <CapacityBar
          capacityKg={suggestion.capacityKg}
          currentLoadKg={suggestion.currentLoadKg}
          committedKg={suggestion.committedLoadKg}
          requestKg={suggestion.requestQuantityKg}
        />

        {/* the two things that can be wrong even when it fits */}
        <div className="flex flex-wrap gap-2">
          {cold === 'ok' && (
            <span className="inline-flex items-center gap-1.5 border-2 border-forest-700 bg-forest-50 px-2 py-1 text-sm font-bold leading-none text-forest-700">
              <Snowflake className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              {t('dispatch.coldOk')}
            </span>
          )}
          {cold === 'warn-not-refrigerated' && (
            <span className="inline-flex items-center gap-1.5 border-2 border-terracotta-500 bg-terracotta-50 px-2 py-1 text-sm font-bold leading-none text-terracotta-700">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              {t('dispatch.coldWarn')}
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1.5 border-2 px-2 py-1 text-sm font-bold leading-none
              ${windowVerdict === 'ok'
                ? 'border-forest-700 bg-forest-50 text-forest-700'
                : 'border-terracotta-500 bg-terracotta-50 text-terracotta-700'}`}
          >
            <Clock className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
            {windowVerdict === 'unknown'
              ? t('dispatch.etaUnknown')
              : t(`dispatch.window.${windowVerdict}`, { eta })}
          </span>
        </div>

        {/* the arithmetic */}
        <div>
          <button
            type="button"
            onClick={() => setShowWorking((open) => !open)}
            aria-expanded={showWorking}
            className="flex w-full items-center justify-between gap-2 rule-hair py-2 text-left text-base font-bold text-forest-700"
          >
            <span className="inline-flex items-center gap-2">
              <RouteIcon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
              {t('dispatch.showWorking')}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showWorking ? 'rotate-180' : ''}`}
              strokeWidth={2.5}
              aria-hidden="true"
            />
          </button>

          {showWorking && (
            <div className="detail-enter space-y-4 pt-3">
              <table className="w-full text-base">
                <tbody>
                  <tr className="rule-hair">
                    <td className="py-1.5 text-ink-soft">{t('dispatch.routeWas')}</td>
                    <td className="py-1.5 text-right font-display text-xl leading-none tnum text-ink">
                      {number(suggestion.baselineRouteKm)} {t('common.km')}
                    </td>
                  </tr>
                  {suggestion.workings.removedLegs.map((leg) => (
                    <tr key={`r-${leg.from}-${leg.to}`} className="rule-hair">
                      <td className="py-1.5 text-ink-soft">
                        {t('dispatch.legRemoved')} · {leg.from} &rarr; {leg.to}
                      </td>
                      <td className="py-1.5 text-right font-display text-xl leading-none tnum text-terracotta-600">
                        &minus;{number(leg.km)}
                      </td>
                    </tr>
                  ))}
                  {suggestion.workings.addedLegs.map((leg) => (
                    <tr key={`a-${leg.from}-${leg.to}`} className="rule-hair">
                      <td className="py-1.5 text-ink-soft">
                        {t('dispatch.legAdded')} · {leg.from} &rarr; {leg.to}
                      </td>
                      <td className="py-1.5 text-right font-display text-xl leading-none tnum text-ink">
                        +{number(leg.km)}
                      </td>
                    </tr>
                  ))}
                  <tr className="rule-strong">
                    <td className="py-2 font-bold text-ink">{t('dispatch.routeBecomes')}</td>
                    <td className="py-2 text-right font-display text-2xl leading-none tnum text-forest-700">
                      {number(suggestion.newRouteKm)} {t('common.km')}
                    </td>
                  </tr>
                </tbody>
              </table>

              <RouteDiagram
                before={currentRoute}
                after={suggestion.proposedRoute}
                requestId={suggestion.requestId}
              />
            </div>
          )}
        </div>
      </div>

      {/* the decision — always the dispatcher's */}
      <div className="grid gap-2 border-t-2 border-ink px-4 py-3.5 sm:grid-cols-2">
        <Button variant="secondary" icon={X} disabled={busy} onClick={() => onReject(suggestion)}>
          {t('dispatch.reject')}
        </Button>
        <Button
          variant={hasWarning ? 'accent' : 'primary'}
          icon={Check}
          busy={busy}
          onClick={() => onApprove(suggestion)}
        >
          {t('dispatch.approve')}
        </Button>
      </div>
    </article>
  );
};

export default SuggestionCard;
