import React from 'react';
import { Check, Circle } from 'lucide-react';
import { useT } from '../../i18n/useT';

/**
 * Where a consignment has got to, as a ruled column.
 *
 * The same component renders for the farmer and the fleet owner, on purpose:
 * the two must never be looking at different accounts of the same lot. It reads
 * the request's own `timeline`, which the server appends to on every status
 * change, so what is shown is what happened rather than what a client inferred.
 */
export const STEPS = ['pending', 'assigned', 'collected', 'in_transit', 'delivered'];

export const TrackingTimeline = ({ request }) => {
  const { t } = useT();

  if (request.status === 'cancelled') {
    return (
      <p className="border-2 border-terracotta-500 bg-terracotta-50 px-3 py-2 text-base font-bold text-terracotta-700">
        {t('tracking.status.cancelled')}
      </p>
    );
  }

  const reached = STEPS.indexOf(request.status);
  const at = (status) => request.timeline?.find((e) => e.status === status)?.at;

  return (
    <ol className="space-y-0">
      {STEPS.map((step, index) => {
        const done = index <= reached;
        const current = index === reached;
        const stamp = at(step);

        return (
          <li key={step} className="flex items-center gap-3 rule-hair py-2">
            {done ? (
              <Check
                className={`h-4 w-4 shrink-0 ${current ? 'text-forest-700' : 'text-ink-faint'}`}
                strokeWidth={3}
                aria-hidden="true"
              />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-ink-faint opacity-40" strokeWidth={2.25} aria-hidden="true" />
            )}
            <span
              className={`flex-1 ${current ? 'font-bold text-ink' : done ? 'text-ink' : 'text-ink-faint opacity-60'}`}
            >
              {t(`tracking.status.${step}`)}
            </span>
            {stamp && (
              <span className="shrink-0 text-sm tnum text-ink-faint">
                {new Date(stamp).toLocaleString('en-IN', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  hour12: false, timeZone: 'Asia/Kolkata',
                })}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
};

export default TrackingTimeline;
