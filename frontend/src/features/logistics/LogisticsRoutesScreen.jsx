import React from 'react';
import { ArrowDown, PackagePlus, PackageMinus, Warehouse } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { useFleet } from './useFleet';
import { SectionHead } from '../../design/primitives/SectionHead';

/**
 * Every vehicle's route as it now stands, stop by stop, with the running load.
 *
 * This is where an approval on the dispatch screen becomes visible: the two
 * stops land at the positions the suggestion card showed, and the load column
 * shows the truck never going over capacity — which is the constraint the
 * ranking was enforcing all along.
 */
const KIND = {
  depot: { icon: Warehouse, key: 'dispatch.stop.depot' },
  pickup: { icon: PackagePlus, key: 'dispatch.stop.pickup' },
  drop: { icon: PackageMinus, key: 'dispatch.stop.drop' },
};

export const LogisticsRoutesScreen = () => {
  const { t, number } = useT();
  const { vehicles: registeredVehicles, loading, error } = useFleet();

  return (
    <div className="space-y-6 pt-4 pb-4">
      <SectionHead level="screen" title={t('dispatch.routesTitle')} note={t('dispatch.routesNote')} />

      {error && <p className="notice notice-bad" role="alert">{t('dispatch.fleetOffline')}</p>}
      {!error && !loading && registeredVehicles.length === 0 && (
        <div className="border-2 border-ink bg-white px-4 py-10 text-center">
          <p className="font-display text-3xl text-ink-faint">{t('dispatch.fleetEmpty')}</p>
        </div>
      )}

      <div className="stagger space-y-4">
        {registeredVehicles.map((vehicle) => {
          const stops = vehicle.currentRoute || [];
          let running = vehicle.currentLoadKg || 0;

          return (
            <article key={vehicle.id} className="border-2 border-ink bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-3">
                <p className="font-display text-2xl leading-none tnum text-ink">{vehicle.vehicleNo}</p>
                <span className="text-sm text-ink-soft tnum">
                  {t('dispatch.capOf', { cap: number(vehicle.capacityKg) })}
                </span>
              </div>

              {stops.length === 0 && (
                <p className="px-4 py-6 text-center text-base text-ink-faint">
                  {t('dispatch.noRoute')}
                </p>
              )}

              <ol className="px-4 py-3.5">
                {stops.map((stop, index) => {
                  running += stop.loadDeltaKg || 0;
                  const meta = KIND[stop.kind] || KIND.depot;
                  const Icon = meta.icon;
                  const over = running > vehicle.capacityKg;

                  return (
                    <li key={stop.id || `${stop.label}-${index}`}>
                      {index > 0 && (
                        <div className="ml-2 h-4 border-l-2 border-ink" aria-hidden="true">
                          <ArrowDown className="-ml-[9px] mt-1 h-4 w-4 text-ink-faint" strokeWidth={2.5} />
                        </div>
                      )}
                      <div className="flex items-center gap-3 rule-hair py-2">
                        <Icon className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2.25} aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-ink">{stop.label}</p>
                          <p className="text-sm text-ink-faint">{t(meta.key)}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`font-display text-xl leading-none tnum ${over ? 'text-terracotta-600' : 'text-ink'}`}>
                            {number(running)}
                          </p>
                          <p className="text-sm text-ink-faint">{t('common.kg')}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </article>
          );
        })}
      </div>

    </div>
  );
};

export default LogisticsRoutesScreen;
