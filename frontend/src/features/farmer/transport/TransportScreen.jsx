import React, { useMemo, useState } from 'react';
import {
  Truck, CalendarDays, Sunrise, Sun, Sunset, Search, Snowflake, Phone,
  MapPin, ClipboardList, Check, Loader2, PackageOpen, Handshake, ArrowLeft,
} from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { useT } from '../../../i18n/useT';
import { useLiveMarket, mandiLabel as liveMandiLabel } from '../../../data/useLiveMarket';
import { DealPanel } from './DealPanel';
import { SectionHead } from '../../../design/primitives/SectionHead';
import { SegmentedToggle } from '../../../design/primitives/SegmentedToggle';
import { ChoiceGrid } from '../../../design/primitives/ChoiceGrid';
import { LedgerRow } from '../../../design/primitives/LedgerRow';
import { Button } from '../../../design/primitives/Button';
import { Field } from '../../../design/primitives/Field';
import { DemoStamp } from '../../../design/primitives/DemoStamp';

/**
 * Selling the lot: agree the price, then send the truck, then watch it go.
 *
 * Replaces four legacy screens — CropWizard, DateVehicleBooking,
 * NewBookingModal and MyBookings — which between them asked the farmer for the
 * crop three times and the destination twice, across two modals.
 *
 * The order of the two first panels is the fix, not a preference. This screen
 * used to open straight onto vehicle search: a farmer could hire a truck to a
 * mandi where nobody had agreed to buy anything, at a price nobody had quoted
 * them, and the resulting booking named a destination that had never heard of
 * the consignment. A rate on the Agmarknet board is a reason to choose a mandi;
 * it is not a sale. So the deal comes first and the vehicle list is gated on
 * it — the truck exists to serve an agreement that already exists.
 *
 * The crop is already known (the Crop screen owns it) and the destination
 * comes from the deal, so booking is three taps: which day, what time, which
 * vehicle.
 */

/*
 * A trip's fare is the vehicle's own per-km rate over the mandi distance, with
 * a floor: no driver takes a 15km run for ₹780, and quoting one would produce
 * a booking nobody accepts. The floor is what makes the short-haul Nashik
 * option agree with the ₹/kg freight the Price screen deducts.
 */
const MIN_FARE = 1500;

const fareFor = (vehicle, distanceKm) => Math.max(MIN_FARE, vehicle.ratePerKm * distanceKm);

const SLOTS = [
  { id: 'morning', labelKey: 'transport.book.morning', timeKey: 'transport.book.morningTime', icon: Sunrise },
  { id: 'afternoon', labelKey: 'transport.book.afternoon', timeKey: 'transport.book.afternoonTime', icon: Sun },
  { id: 'evening', labelKey: 'transport.book.evening', timeKey: 'transport.book.eveningTime', icon: Sunset },
];

/*
 * The store seeds bookings with English status strings, and the driver
 * dashboard writes more of them. Mapping them here keeps the farmer's view
 * translated without rewriting the driver flow's vocabulary underneath it.
 * An unrecognised status falls through as-is rather than vanishing.
 */
const STATUS_KEYS = {
  'Pending Driver Acceptance': 'transport.status.pending',
  Pending: 'transport.status.pending',
  Accepted: 'transport.status.accepted',
  'In Transit': 'transport.status.onTheWay',
  Arrived: 'transport.status.arrived',
  Delivered: 'transport.status.delivered',
  Completed: 'transport.status.delivered',
  Cancelled: 'transport.status.cancelled',
};

const isFinished = (status) => status === 'Delivered' || status === 'Completed' || status === 'Cancelled';

const todayISO = () => new Date().toISOString().split('T')[0];

export const TransportScreen = () => {
  const cropDetails = useAppStore((state) => state.cropDetails);
  const farmerAddress = useAppStore((state) => state.farmerAddress);
  const registeredVehicles = useAppStore((state) => state.registeredVehicles);
  const dateBookings = useAppStore((state) => state.dateBookings);
  const createDateBooking = useAppStore((state) => state.createDateBooking);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const user = useAppStore((state) => state.user);
  const { t, money, number, rate, shortDate } = useT();

  const deals = useAppStore((state) => state.deals);
  const pendingMandi = useAppStore((state) => state.pendingMandi);
  const attachBookingToDeal = useAppStore((state) => state.attachBookingToDeal);

  // Every mandi reporting this crop today, ranked by what the farmer keeps —
  // the same live list the Prices screen shows, not a four-entry demo table.
  const { comparison } = useLiveMarket(cropDetails.cropType, cropDetails.quantityKg);

  /*
   * Opens on the deal panel unless there is already an agreed deal waiting for
   * a truck. Arriving from the Prices screen ("contact this mandi") always
   * means the deal panel, whatever else is open.
   */
  /*
   * Only deals for the crop currently loaded. A farmer with an agreed tomato
   * price and a shed full of onions must not be shown the tomato rate over an
   * onion consignment — the two were briefly reconciled into one booking here,
   * which is exactly the kind of quiet mismatch a waybill carries all the way
   * to the mandi gate.
   */
  const agreedDeals = deals.filter(
    (deal) => deal.status === 'Agreed' && !deal.bookingId && deal.cropType === cropDetails.cropType
  );
  const [panel, setPanel] = useState(() =>
    (!pendingMandi && agreedDeals.length ? 'book' : 'deal')
  );
  const [dealId, setDealId] = useState(() => agreedDeals[0]?.id || null);
  const [pickupDate, setPickupDate] = useState(todayISO());
  const [slot, setSlot] = useState('morning');
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [bookedId, setBookedId] = useState(null);

  // The deal being fulfilled. Falls back to the oldest unbooked agreement so a
  // farmer who agreed a price yesterday is not asked to pick it again.
  const deal = agreedDeals.find((d) => d.id === dealId) || agreedDeals[0] || null;


  /*
   * A vehicle that cannot carry the load is shown, not filtered out — with the
   * reason on it. Hiding it produces the worse failure: a farmer with 5,000 kg
   * sees two vehicles instead of three and has no idea why.
   */
  const offers = useMemo(
    () =>
      registeredVehicles
        .filter((vehicle) => vehicle.isAvailable)
        .map((vehicle) => ({
          ...vehicle,
          fare: fareFor(vehicle, deal?.distanceKm || 0),
          fits: vehicle.capacityKg >= (deal?.quantityKg || cropDetails.quantityKg),
        }))
        .sort((a, b) => (a.fits === b.fits ? a.fare - b.fare : a.fits ? -1 : 1)),
    [registeredVehicles, deal, cropDetails.quantityKg]
  );

  const findVehicles = () => {
    setBookedId(null);
    setSearching(true);
    // A held beat, not a fake network call: the list is local, and a result
    // that appears in the same frame as the tap reads as "nothing happened".
    setTimeout(() => {
      setSearching(false);
      setShowResults(true);
    }, 550);
  };

  const book = (offer) => {
    if (!deal) return;
    const slotOption = SLOTS.find((s) => s.id === slot) || SLOTS[0];
    const id = `UBER-${Math.floor(Math.random() * 900 + 100)}`;

    createDateBooking({
      id,
      dealId: deal.id,
      farmerName: user?.name || '',
      farmerPhone: user?.phone || '',
      pickupDate,
      timeSlot: `${t(slotOption.labelKey)} (${t(slotOption.timeKey)})`,
      cropType: deal.cropType,
      quantityKg: deal.quantityKg,
      origin: farmerAddress,
      // The English name is what the driver dashboard and the waybill read, so
      // it stays canonical in the record.
      destination: deal.mandiName,
      destinationId: deal.mandiNameKey ? deal.mandiName : null,
      // The agreed rate, not the board rate — this is what the consignment is
      // actually worth, and what the buyer expects to pay on arrival.
      agreedRatePerKg: deal.agreedRatePerKg,
      consignmentValue: money(deal.agreedRatePerKg * deal.quantityKg),
      traderName: deal.trader?.name || null,
      traderPhone: deal.trader?.phone || null,
      vehicleId: offer.id,
      vehicleNo: offer.vehicleNo,
      driverName: offer.driverName,
      driverPhone: offer.driverPhone,
      estDistanceKm: deal.distanceKm,
      estTotalFare: money(offer.fare),
      status: 'Pending Driver Acceptance',
      createdAt: shortDate(new Date()),
    });

    attachBookingToDeal(deal.id, id);
    setBookedId(id);
    setShowResults(false);
  };

  const active = dateBookings.filter((booking) => !isFinished(booking.status));
  const past = dateBookings.filter((booking) => isFinished(booking.status));

  const statusLabel = (status) => (STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : status);

  /*
   * Bookings made before this screen existed — and the two the store seeds —
   * carry only the English destination string, so fall back to it rather than
   * rendering the literal key "mandis.undefined".
   */
  const bookingMandi = (booking) => booking.destination;

  const renderBooking = (booking) => (
    <article key={booking.id} className="border-2 border-ink bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-3">
        <p className="font-display text-2xl leading-none tnum text-ink">{booking.id}</p>
        <span className="border-2 border-ink bg-turmeric-300 px-2 py-1 text-sm font-bold leading-none text-ink">
          {statusLabel(booking.status)}
        </span>
      </div>

      <div className="px-4">
        <LedgerRow
          label={t('transport.route.pickup')}
          sub={booking.origin}
          value={<span className="font-sans text-base">{booking.pickupDate}</span>}
        />
        <LedgerRow
          label={t('transport.route.drop')}
          sub={bookingMandi(booking)}
          value={<span className="font-sans text-base">{booking.timeSlot?.split(' ')[0]}</span>}
        />
        <LedgerRow
          label={t('transport.bookings.vehicleNo')}
          sub={`${t('transport.vehicle.driver')}: ${booking.driverName}`}
          value={<span className="font-sans text-base tnum">{booking.vehicleNo}</span>}
        />
        {booking.agreedRatePerKg && (
          <LedgerRow
            label={t('deal.agreedTitle')}
            sub={booking.traderName || undefined}
            value={<span className="font-sans text-base tnum">{rate(booking.agreedRatePerKg)}/{t('common.kg')}</span>}
          />
        )}
        <LedgerRow
          label={t('transport.vehicle.total')}
          sub={`${number(booking.estDistanceKm)} ${t('common.km')} · ${t(`crops.${booking.cropType}`)} ${number(booking.quantityKg)} ${t('common.kg')}`}
          value={booking.estTotalFare}
          emphasis
        />
      </div>

      <div className="grid gap-2 px-4 py-4 sm:grid-cols-2">
        <Button
          variant="secondary"
          icon={Phone}
          onClick={() => { window.location.href = `tel:${booking.driverPhone}`; }}
        >
          {t('transport.bookings.callDriver')}
        </Button>
        <Button variant="accent" icon={MapPin} onClick={() => setActiveTab('today')}>
          {t('transport.bookings.track')}
        </Button>
      </div>
    </article>
  );

  return (
    <div className="space-y-6 pt-4 pb-4">
      <SectionHead level="screen" title={t('transport.title')} />

      <SegmentedToggle
        options={[
          { id: 'deal', label: t('deal.tab'), icon: Handshake },
          { id: 'book', label: t('transport.book.title'), icon: Truck },
          { id: 'mine', label: t('transport.bookings.title'), icon: ClipboardList },
        ]}
        value={panel}
        onChange={setPanel}
      />

      <div key={panel} id={`panel-${panel}`} role="tabpanel" className="detail-enter space-y-5">

        {panel === 'deal' && (
          <DealPanel
            comparison={comparison}
            onDealAgreed={(id) => { setDealId(id); setPanel('book'); setShowResults(false); }}
          />
        )}

        {/* The gate. Not a disabled button — a farmer who lands here without a
            deal needs to know what is missing and where to go, and a greyed-out
            "Find vehicles" says neither. */}
        {panel === 'book' && !deal && (
          <div className="border-2 border-ink bg-white px-4 py-8 text-center">
            <Handshake className="mx-auto h-10 w-10 text-ink-faint" strokeWidth={2} aria-hidden="true" />
            <p className="mt-3 font-display text-3xl leading-none text-ink">{t('transport.book.needDeal')}</p>
            <p className="mx-auto mt-2 max-w-sm leading-snug text-ink-soft">{t('transport.book.needDealWhy')}</p>
            <div className="mx-auto mt-5 max-w-xs">
              <Button icon={Handshake} onClick={() => setPanel('deal')}>
                {t('deal.tab')}
              </Button>
            </div>
          </div>
        )}

        {panel === 'book' && deal && (
          <>
            {/* ---- The agreement this truck is serving. ---- */}
            <div className="border-2 border-forest-700 bg-forest-50 px-4 py-3.5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow flex items-center gap-1.5">
                    <Handshake className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                    {t('deal.agreedWith')}
                  </p>
                  <p className="mt-1.5 font-display text-2xl leading-none text-ink">{deal.mandiName}</p>
                  <p className="mt-1 text-sm text-ink-soft tnum">
                    {number(deal.distanceKm)} {t('common.km')}
                    {deal.trader?.name && ` · ${deal.trader.name}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="eyebrow">{t('deal.agreedTitle')}</p>
                  <p className="font-display text-3xl leading-none tnum text-forest-700">
                    {rate(deal.agreedRatePerKg)}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft tnum">
                    {money(deal.agreedRatePerKg * deal.quantityKg)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPanel('deal')}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-forest-700 underline underline-offset-2"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                {t('deal.changeDeal')}
              </button>
            </div>

            {/* ---- What is being sent. Stated, not asked. ---- */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-white px-4 py-3.5">
              <div className="min-w-0">
                <p className="eyebrow">{t('transport.book.load')}</p>
                <p className="mt-1 font-display text-2xl leading-none text-ink">
                  {t(`crops.${deal.cropType}`)} · <span className="tnum">{number(deal.quantityKg)} {t('common.kg')}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('crop')}
                className="shrink-0 text-base font-bold text-forest-700 underline underline-offset-2"
              >
                {t('transport.book.change')}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t('transport.book.when')}
                icon={CalendarDays}
                type="date"
                min={todayISO()}
                value={pickupDate}
                onChange={(event) => { setPickupDate(event.target.value); setShowResults(false); }}
              />
            </div>

            <ChoiceGrid
              label={t('transport.book.slot')}
              value={slot}
              onChange={(next) => { setSlot(next); setShowResults(false); }}
              options={SLOTS.map((option) => ({
                id: option.id,
                label: t(option.labelKey),
                sub: t(option.timeKey),
                icon: option.icon,
              }))}
            />

            <Button icon={searching ? Loader2 : Search} busy={searching} onClick={findVehicles}>
              {searching ? t('transport.book.searching') : t('transport.book.find')}
            </Button>

            {/* ---- Offers ---- */}
            {showResults && (
              <section className="detail-enter space-y-3">
                <SectionHead
                  title={t('transport.vehicle.available', { count: offers.length })}
                  note={t('transport.book.toMandi', { mandi: deal.mandiName })}
                />

                {offers.length === 0 && (
                  <p className="notice notice-bad">
                    <PackageOpen className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                    <span>{t('transport.vehicle.empty')}</span>
                  </p>
                )}

                <div className="stagger space-y-3">
                  {offers.map((offer) => (
                    <article key={offer.id} className="border-2 border-ink bg-white">
                      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5">
                        <div className="min-w-0">
                          <p className="font-display text-2xl leading-none text-ink">{offer.vehicleType}</p>
                          <p className="mt-1 text-base text-ink-soft">
                            {offer.driverName} · <span className="tnum">{offer.vehicleNo}</span>
                          </p>
                          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-forest-700">
                              {offer.isRefrigerated
                                ? <Snowflake className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                                : <Truck className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />}
                              {offer.isRefrigerated ? t('transport.vehicle.cold') : t('transport.vehicle.normal')}
                            </span>
                            <span className="tnum text-ink-faint">
                              {t('transport.vehicle.capacity')}: {number(offer.capacityKg)} {t('common.kg')}
                            </span>
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="eyebrow">{t('transport.vehicle.total')}</p>
                          <p className="font-display text-4xl leading-none tnum text-forest-700">
                            {money(offer.fare)}
                          </p>
                        </div>
                      </div>

                      {!offer.fits && (
                        <p className="border-t-2 border-terracotta-500 bg-terracotta-50 px-4 py-2 text-sm font-bold text-terracotta-700">
                          {t('transport.vehicle.tooSmall')}
                        </p>
                      )}

                      <div className="border-t-2 border-ink px-4 py-3.5">
                        <Button icon={Check} onClick={() => book(offer)} disabled={!offer.fits}>
                          {t('transport.vehicle.book')}
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>

                <DemoStamp />
              </section>
            )}

            {bookedId && (
              <div className="detail-enter space-y-3">
                <p className="notice notice-good" role="status">
                  <Check className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                  <span>{t('transport.vehicle.booked')}</span>
                </p>
                <Button variant="secondary" icon={ClipboardList} onClick={() => setPanel('mine')}>
                  {t('transport.bookings.title')}
                </Button>
              </div>
            )}
          </>
        )}

        {panel === 'mine' && (
          <div className="space-y-6">
            {dateBookings.length === 0 && (
              <div className="border-2 border-ink bg-white px-4 py-10 text-center">
                <p className="font-display text-3xl text-ink-faint">{t('transport.bookings.empty')}</p>
                <div className="mx-auto mt-5 max-w-xs">
                  <Button icon={Truck} onClick={() => setPanel('book')}>
                    {t('transport.bookings.emptyCta')}
                  </Button>
                </div>
              </div>
            )}

            {active.length > 0 && (
              <section className="space-y-3">
                <SectionHead level="group" title={t('transport.bookings.active')} />
                {active.map(renderBooking)}
              </section>
            )}

            {past.length > 0 && (
              <section className="space-y-3">
                <SectionHead level="group" title={t('transport.bookings.past')} />
                {past.map(renderBooking)}
              </section>
            )}

            {dateBookings.length > 0 && <DemoStamp />}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransportScreen;
