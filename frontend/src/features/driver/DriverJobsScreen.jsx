import React, { useState } from 'react';
import { User, MapPin, Package, IndianRupee, Check, X, Play, Flag } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../i18n/useT';
import { SectionHead } from '../../design/primitives/SectionHead';
import { SegmentedToggle } from '../../design/primitives/SegmentedToggle';
import { Button } from '../../design/primitives/Button';
import { DemoStamp } from '../../design/primitives/DemoStamp';

/**
 * Job requests, split from the trips already under way.
 *
 * Both panels read the same `dateBookings` the farmer's Transport screen
 * writes — there used to be a second, disconnected `driverJobs` array seeded
 * separately, which meant a farmer's real booking and the driver's job list
 * never agreed with each other. One list, two filters.
 */
const NEW_STATUS = 'Pending Driver Acceptance';
const ACTIVE_STATUSES = ['Accepted', 'In Transit'];

const JobCard = ({ booking, t, number, children }) => (
  <article className="border-2 border-ink bg-white">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-3">
      <p className="font-display text-2xl leading-none tnum text-ink">{booking.id}</p>
      {booking.status !== NEW_STATUS && (
        <span className="border-2 border-ink bg-turmeric-300 px-2 py-1 text-sm font-bold leading-none text-ink">
          {booking.status}
        </span>
      )}
    </div>

    <div className="space-y-2.5 px-4 py-3.5 text-base">
      <p className="flex items-center gap-2 text-ink">
        <User className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2.25} aria-hidden="true" />
        <span className="text-ink-faint">{t('driver.jobs.from')}:</span>
        <span className="font-semibold">{booking.farmerName}</span>
      </p>
      <p className="flex items-center gap-2 text-ink">
        <MapPin className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2.25} aria-hidden="true" />
        <span className="text-ink-faint">{t('driver.jobs.pickup')}:</span>
        <span className="font-semibold">{booking.origin}</span>
      </p>
      <p className="flex items-center gap-2 text-ink">
        <MapPin className="h-4 w-4 shrink-0 text-forest-700" strokeWidth={2.25} aria-hidden="true" />
        <span className="text-ink-faint">{t('driver.jobs.drop')}:</span>
        <span className="font-semibold">{booking.destination}</span>
      </p>
      <p className="flex items-center gap-2 text-ink">
        <Package className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2.25} aria-hidden="true" />
        <span className="text-ink-faint">{t('driver.jobs.load')}:</span>
        <span className="font-semibold">
          {t(`crops.${booking.cropType}`)} · {number(booking.quantityKg)} {t('common.kg')}
        </span>
      </p>
      <p className="flex items-center gap-2 pt-1 text-lg">
        <IndianRupee className="h-4 w-4 shrink-0 text-forest-700" strokeWidth={2.5} aria-hidden="true" />
        <span className="text-ink-faint text-base">{t('driver.jobs.pay')}:</span>
        <span className="font-display text-2xl leading-none text-forest-700">{booking.estTotalFare}</span>
      </p>
    </div>

    <div className="border-t-2 border-ink px-4 py-3.5">{children}</div>
  </article>
);

export const DriverJobsScreen = () => {
  const dateBookings = useAppStore((state) => state.dateBookings);
  const respondToDateBooking = useAppStore((state) => state.respondToDateBooking);
  const { t, number } = useT();

  const [panel, setPanel] = useState('new');

  const newRequests = dateBookings.filter((b) => b.status === NEW_STATUS);
  const myTrips = dateBookings.filter((b) => ACTIVE_STATUSES.includes(b.status));
  const list = panel === 'new' ? newRequests : myTrips;

  return (
    <div className="space-y-6 pt-4 pb-4">
      <SectionHead level="screen" title={t('driver.jobs.title')} />

      <SegmentedToggle
        options={[
          { id: 'new', label: t('driver.jobs.new') },
          { id: 'mine', label: t('driver.jobs.mine') },
        ]}
        value={panel}
        onChange={setPanel}
      />

      <div key={panel} id={`panel-${panel}`} role="tabpanel" className="detail-enter space-y-4">
        {list.length === 0 && (
          <div className="border-2 border-ink bg-white px-4 py-10 text-center">
            <p className="font-display text-3xl text-ink-faint">{t('driver.jobs.empty')}</p>
          </div>
        )}

        {list.length > 0 && (
          <div className="stagger space-y-3">
            {list.map((booking) => (
              <JobCard key={booking.id} booking={booking} t={t} number={number}>
                {panel === 'new' && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      variant="secondary"
                      icon={X}
                      onClick={() => respondToDateBooking(booking.id, 'Declined')}
                    >
                      {t('driver.jobs.reject')}
                    </Button>
                    <Button
                      variant="accent"
                      icon={Check}
                      onClick={() => respondToDateBooking(booking.id, 'Accepted')}
                    >
                      {t('driver.jobs.accept')}
                    </Button>
                  </div>
                )}

                {panel === 'mine' && booking.status === 'Accepted' && (
                  <Button icon={Play} onClick={() => respondToDateBooking(booking.id, 'In Transit')}>
                    {t('driver.jobs.start')}
                  </Button>
                )}

                {panel === 'mine' && booking.status === 'In Transit' && (
                  <Button
                    variant="accent"
                    icon={Flag}
                    onClick={() => respondToDateBooking(booking.id, 'Delivered')}
                  >
                    {t('driver.jobs.complete')}
                  </Button>
                )}
              </JobCard>
            ))}
          </div>
        )}

        {dateBookings.length > 0 && <DemoStamp />}
      </div>
    </div>
  );
};

export default DriverJobsScreen;
