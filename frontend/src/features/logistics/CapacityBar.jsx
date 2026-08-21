import React from 'react';
import { useT } from '../../i18n/useT';

/**
 * Load, this request, and what is left — as one ruled bar.
 *
 * A dispatcher comparing three vehicles is asking "will it fit, and how much
 * room does that leave me". Three numbers in a row make that a subtraction; a
 * bar makes it a glance. The numerals stay beneath it because a bar alone is
 * not something you can act on.
 *
 * Squared off and ruled like everything else — no rounded pill, no gradient.
 */
export const CapacityBar = ({ capacityKg, currentLoadKg, committedKg = 0, requestKg = 0 }) => {
  const { t, number } = useT();

  const cap = Math.max(capacityKg, 1);
  const existing = Math.min(currentLoadKg, cap);
  // Promised further up the route but not yet aboard. Its own band, because it
  // is neither what the truck is carrying now nor what this farmer is sending.
  const committed = Math.max(Math.min(committedKg, cap - existing), 0);
  const added = Math.max(Math.min(requestKg, cap - existing - committed), 0);
  const free = Math.max(cap - existing - committed - added, 0);

  const pct = (kg) => `${(kg / cap) * 100}%`;

  return (
    <div>
      <div
        className="flex h-5 w-full border-2 border-ink bg-white"
        role="img"
        aria-label={t('dispatch.capacityAria', {
          load: number(existing + committed), add: number(added), free: number(free),
        })}
      >
        {existing > 0 && <div className="h-full bg-ink-soft" style={{ width: pct(existing) }} />}
        {committed > 0 && <div className="h-full bg-ink-faint" style={{ width: pct(committed) }} />}
        {added > 0 && <div className="h-full bg-forest-700" style={{ width: pct(added) }} />}
        {free > 0 && <div className="h-full bg-white" style={{ width: pct(free) }} />}
      </div>

      <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-ink-soft">
        {existing > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 border border-ink bg-ink-soft" aria-hidden="true" />
            <dt>{t('dispatch.onBoard')}</dt>
            <dd className="tnum font-semibold text-ink">{number(existing)}</dd>
          </div>
        )}
        {committed > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 border border-ink bg-ink-faint" aria-hidden="true" />
            <dt>{t('dispatch.committed')}</dt>
            <dd className="tnum font-semibold text-ink">{number(committed)}</dd>
          </div>
        )}
        {added > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 border border-ink bg-forest-700" aria-hidden="true" />
            <dt>{t('dispatch.thisLot')}</dt>
            <dd className="tnum font-semibold text-ink">{number(added)}</dd>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 border border-ink bg-white" aria-hidden="true" />
          <dt>{t('dispatch.freeAfter')}</dt>
          <dd className="tnum font-semibold text-ink">{number(free)} {t('common.kg')}</dd>
        </div>
      </dl>
    </div>
  );
};

export default CapacityBar;
