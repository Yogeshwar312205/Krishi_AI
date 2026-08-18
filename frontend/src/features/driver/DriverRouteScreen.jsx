import React, { Suspense, lazy } from 'react';
import { MapPin, Flag, Play, AlertTriangle, ExternalLink, Package } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useSocket } from '../../hooks/useSocket';
import { useT } from '../../i18n/useT';
import { SectionHead } from '../../design/primitives/SectionHead';
import { Button } from '../../design/primitives/Button';
import { DemoStamp } from '../../design/primitives/DemoStamp';

const MapView = lazy(() => import('../../components/MapView').then((m) => ({ default: m.MapView })));

const ACTIVE_STATUSES = ['Accepted', 'In Transit'];

/**
 * The driver's live navigation screen for whichever trip is under way.
 *
 * Replaces LegacyLogistics, which showed CropWizard here — a farmer's
 * crop-and-destination picker, not a driver's navigation screen. The farmer
 * side already moved on (see TransportScreen's docstring); this screen now
 * shows the driver's own active trip instead.
 */
export const DriverRouteScreen = () => {
  const dateBookings = useAppStore((state) => state.dateBookings);
  const { startVehicleSimulation, triggerDevTrafficJam } = useSocket();
  const { t, number } = useT();

  const trip = dateBookings.find((b) => ACTIVE_STATUSES.includes(b.status));

  const openInMaps = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(trip.destination)}`,
      '_blank',
      'noopener'
    );
  };

  return (
    <div className="space-y-6 pt-4 pb-4">
      <SectionHead level="screen" title={t('driver.route.title')} />

      {!trip && (
        <div className="border-2 border-ink bg-white px-4 py-10 text-center">
          <p className="font-display text-3xl text-ink-faint">{t('driver.route.empty')}</p>
        </div>
      )}

      {trip && (
        <div className="detail-enter space-y-6">
          <article className="border-2 border-ink bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-3">
              <p className="font-display text-2xl leading-none tnum text-ink">{trip.id}</p>
              <span className="border-2 border-ink bg-turmeric-300 px-2 py-1 text-sm font-bold leading-none text-ink">
                {trip.status}
              </span>
            </div>

            <div className="space-y-2.5 px-4 py-3.5 text-base">
              <p className="flex items-center gap-2 text-ink">
                <MapPin className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2.25} aria-hidden="true" />
                <span className="text-ink-faint">{t('driver.jobs.pickup')}:</span>
                <span className="font-semibold">{trip.origin}</span>
              </p>
              <p className="flex items-center gap-2 text-ink">
                <Flag className="h-4 w-4 shrink-0 text-forest-700" strokeWidth={2.25} aria-hidden="true" />
                <span className="text-ink-faint">{t('driver.route.nextStop')}:</span>
                <span className="font-semibold">{trip.destination}</span>
              </p>
              <p className="flex items-center gap-2 text-ink">
                <Package className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2.25} aria-hidden="true" />
                <span className="font-semibold">{t(`crops.${trip.cropType}`)} · {number(trip.quantityKg)} {t('common.kg')}</span>
              </p>
            </div>

            <div className="grid gap-2 border-t-2 border-ink px-4 py-3.5 sm:grid-cols-3">
              <Button variant="accent" icon={Play} onClick={startVehicleSimulation}>
                {t('driver.route.simulate')}
              </Button>
              <Button
                variant="secondary"
                icon={AlertTriangle}
                onClick={() => triggerDevTrafficJam('m1', [73.5, 19.5])}
              >
                {t('driver.route.simulateJam')}
              </Button>
              <Button variant="secondary" icon={ExternalLink} onClick={openInMaps}>
                {t('driver.route.openMaps')}
              </Button>
            </div>
          </article>

          <DemoStamp />

          <Suspense fallback={<div className="docket min-h-[320px] animate-pulse" />}>
            <MapView />
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default DriverRouteScreen;
