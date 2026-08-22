import React from 'react';
import { useT } from '../../i18n/useT';

/**
 * The stop sequence before and after, as two ruled strips.
 *
 * Not a replacement for the map below it, and not replaced by it. The strips
 * answer *where in the sequence* the farmer slots in — third stop or fifth —
 * which is the ordering decision, and a map buries that under geography. The
 * map answers the question the strips cannot: how far off the road the truck
 * already drives this detour actually is. Two strips, so the old order sits
 * directly above the new one and the two inserted stops are the only thing
 * that moved.
 */
const Stop = ({ stop, inserted, t }) => (
  <li
    className={`flex shrink-0 items-center gap-1.5 border-2 px-2 py-1 text-sm leading-none
      ${inserted ? 'border-forest-700 bg-forest-50 font-bold text-forest-700' : 'border-ink bg-white text-ink'}`}
  >
    <span className="tnum text-xs text-ink-faint">
      {stop.kind === 'pickup' ? '↑' : stop.kind === 'drop' ? '↓' : '■'}
    </span>
    <span className="whitespace-nowrap">{stop.label}</span>
    {inserted && <span className="text-xs uppercase">{t('dispatch.new')}</span>}
  </li>
);

export const RouteDiagram = ({ before, after, requestId }) => {
  const { t } = useT();

  const Strip = ({ label, stops, markInserted }) => (
    <div>
      <p className="field-label mb-1">{label}</p>
      {/* Wide routes scroll inside their own strip; the card never scrolls. */}
      <ol className="flex items-center gap-1 overflow-x-auto pb-1">
        {stops.map((stop, index) => (
          <React.Fragment key={stop.id || `${stop.label}-${index}`}>
            {index > 0 && <li aria-hidden="true" className="shrink-0 text-ink-faint">&rarr;</li>}
            <Stop
              stop={stop}
              inserted={markInserted && stop.requestId === requestId}
              t={t}
            />
          </React.Fragment>
        ))}
      </ol>
    </div>
  );

  return (
    <div className="space-y-3">
      <Strip label={t('dispatch.routeNow')} stops={before} markInserted={false} />
      <Strip label={t('dispatch.routeAfter')} stops={after} markInserted />
    </div>
  );
};

export default RouteDiagram;
