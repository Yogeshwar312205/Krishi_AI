import React, { useState } from 'react';
import { MapPin, Snowflake, Truck, Plus, CloudOff, RefreshCw } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { useFleet } from './useFleet';
import { SectionHead } from '../../design/primitives/SectionHead';
import { Button } from '../../design/primitives/Button';
import { AddVehicleForm } from './AddVehicleForm';
import { CapacityBar } from './CapacityBar';

/**
 * The fleet as a dispatcher needs it: not a list of trucks, but how full each
 * one is and how far into its route it has got.
 *
 * The driver's own DriverVehiclesScreen answers "what do I own"; this answers
 * "what can I still commit". They share the card language deliberately, so a
 * transporter who runs both roles is not learning two visual systems.
 */
const STATUS_KEYS = {
  Idle: 'dispatch.status.idle',
  Loading: 'dispatch.status.loading',
  'En route': 'dispatch.status.enRoute',
  Unavailable: 'dispatch.status.unavailable',
};

export const FleetScreen = () => {
  const { t, tCount, number, money } = useT();
  const { vehicles: registeredVehicles, loading, error, refresh } = useFleet();
  const [showForm, setShowForm] = useState(false);

  const totalCapacity = registeredVehicles.reduce((sum, v) => sum + (v.capacityKg || 0), 0);
  const totalLoad = registeredVehicles.reduce((sum, v) => sum + (v.currentLoadKg || 0), 0);

  return (
    <div className="space-y-6 pt-4 pb-4">
      <SectionHead
        level="screen"
        title={t('dispatch.fleetTitle')}
        note={t('dispatch.fleetNote', {
          free: number(totalCapacity - totalLoad),
          total: number(totalCapacity),
        })}
        action={
          <Button full={false} icon={Plus} onClick={() => setShowForm((v) => !v)}>
            {t('dispatch.addVehicle')}
          </Button>
        }
      />

      {error && (
        <div className="border-2 border-terracotta-500 bg-terracotta-50 px-4 py-6 text-center">
          <CloudOff className="mx-auto h-8 w-8 text-terracotta-600" strokeWidth={2} aria-hidden="true" />
          <p className="mt-3 font-display text-2xl text-ink">{t('dispatch.fleetOffline')}</p>
          <div className="mx-auto mt-4 max-w-xs">
            <Button icon={RefreshCw} onClick={refresh}>{t('dispatch.retry')}</Button>
          </div>
        </div>
      )}

      {showForm && (
        <AddVehicleForm
          onDone={async () => { setShowForm(false); await refresh(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {!error && !loading && registeredVehicles.length === 0 && !showForm && (
        <div className="border-2 border-ink bg-white px-4 py-10 text-center">
          <p className="font-display text-3xl text-ink-faint">{t('dispatch.fleetEmpty')}</p>
          <p className="mx-auto mt-2 max-w-prose text-base text-ink-soft">{t('dispatch.fleetEmptyWhy')}</p>
        </div>
      )}

      <div className="stagger space-y-3">
        {registeredVehicles.map((vehicle) => {
          const stops = vehicle.currentRoute || [];
          const committed = stops.filter((s) => s.kind !== 'depot').length;

          // Peak load along the route it is already committed to — the number
          // that actually decides what else it can take, not the current load.
          let running = vehicle.currentLoadKg || 0;
          let peak = running;
          for (const stop of stops) {
            running += stop.loadDeltaKg || 0;
            if (running > peak) peak = running;
          }

          return (
            <article key={vehicle.id} className="border-2 border-ink bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-3">
                <p className="font-display text-2xl leading-none tnum text-ink">{vehicle.vehicleNo}</p>
                <span
                  className={`border-2 border-ink px-2 py-1 text-sm font-bold leading-none ${
                    vehicle.status === 'En route' ? 'bg-turmeric-300 text-ink'
                      : vehicle.status === 'Unavailable' ? 'bg-white text-ink-soft'
                      : 'bg-forest-700 text-white'
                  }`}
                >
                  {t(STATUS_KEYS[vehicle.status] || 'dispatch.status.idle')}
                </span>
              </div>

              <div className="space-y-3 px-4 py-3.5 text-base text-ink">
                <p className="font-semibold">
                  {vehicle.vehicleType} · {vehicle.driverName}
                </p>

                <CapacityBar
                  capacityKg={vehicle.capacityKg}
                  currentLoadKg={vehicle.currentLoadKg || 0}
                  committedKg={peak - (vehicle.currentLoadKg || 0)}
                />

                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-soft">
                  <span className="tnum">{t('dispatch.ratePerKm')}: {money(vehicle.ratePerKm)}/km</span>
                  <span className="tnum">
                    {tCount('dispatch.stopsCommitted', committed)}
                  </span>
                </p>

                <p className="flex items-center gap-2 text-ink-soft">
                  <MapPin className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                  {stops[0]?.label || vehicle.baseLocation}
                  {vehicle.isRefrigerated && (
                    <span className="inline-flex items-center gap-1 border-2 border-forest-700 bg-forest-50 px-2 py-0.5 text-sm font-bold text-forest-700">
                      <Snowflake className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                      {t('dispatch.coldOk')}
                    </span>
                  )}
                </p>

                {/*
                 * A vehicle with no coordinates cannot be ranked at all. Saying
                 * so here is the difference between "the dispatcher forgot it"
                 * and "the software silently dropped it".
                 */}
                {!stops.length && (
                  <p className="flex items-start gap-2 border-2 border-terracotta-500 bg-terracotta-50 px-3 py-2 text-base text-terracotta-700">
                    <Truck className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                    {t('dispatch.reason.vehicleNoCoords')}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>

    </div>
  );
};

export default FleetScreen;
