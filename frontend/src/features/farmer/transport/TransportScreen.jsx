import React, { useState } from 'react';
import {
  Truck, CalendarDays, Sunrise, Sun, Sunset, Send, Phone, MapPin,
  ClipboardList, Check, Handshake, ArrowLeft, CloudOff, RefreshCw, X,
} from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { useT } from '../../../i18n/useT';
import { useLiveMarket } from '../../../data/useLiveMarket';
import { createPickupRequest, cancelPickupRequest } from '../../../services/api';
import { useMyRequests } from './useMyRequests';
import { DealPanel } from './DealPanel';
import { TrackingTimeline } from '../../logistics/TrackingTimeline';
import { TrackingMap } from '../../logistics/TrackingMap';
import { SectionHead } from '../../../design/primitives/SectionHead';
import { SegmentedToggle } from '../../../design/primitives/SegmentedToggle';
import { ChoiceGrid } from '../../../design/primitives/ChoiceGrid';
import { LedgerRow } from '../../../design/primitives/LedgerRow';
import { Button } from '../../../design/primitives/Button';
import { Field } from '../../../design/primitives/Field';

/**
 * Selling the lot: agree the price, ask for a pickup, then watch it come.
 *
 * Two invariants live in the order of these panels.
 *
 * The first is the deal. This screen used to open straight onto vehicle search,
 * so a farmer could hire a truck to a mandi where nobody had agreed to buy
 * anything, at a price nobody had quoted them. A rate on the Agmarknet board is
 * a reason to choose a mandi; it is not a sale. So the deal comes first and
 * everything after it is gated on one existing.
 *
 * The second is that **the farmer does not choose a truck**. They used to: the
 * screen listed vehicles with fares and let them pick one, which made this a
 * ride-hailing app and made the fleet-wide optimisation meaningless. A farmer
 * cannot see the routes those trucks are already driving, so they cannot know
 * that the nearest truck is often the most expensive way to move their lot.
 * They state what they have and when it can be collected; the fleet owner's
 * dispatch screen ranks their own vehicles and sends one. See VRP.md.
 */

/*
 * `startHour`/`endHour` travel on the request alongside the display label.
 *
 * The label is translated ("6 am to 10 am", "सुबह 6 से 10"), so anything that
 * needs the actual hours — the fleet owner's ETA check — must not parse it back
 * out. Two of the three languages would fail, silently.
 */
const SLOTS = [
  { id: 'morning', labelKey: 'transport.book.morning', timeKey: 'transport.book.morningTime', icon: Sunrise, startHour: 6, endHour: 10 },
  { id: 'afternoon', labelKey: 'transport.book.afternoon', timeKey: 'transport.book.afternoonTime', icon: Sun, startHour: 13, endHour: 17 },
  { id: 'evening', labelKey: 'transport.book.evening', timeKey: 'transport.book.eveningTime', icon: Sunset, startHour: 17, endHour: 21 },
];

const OPEN_STATUSES = ['pending', 'assigned', 'collected', 'in_transit'];

const todayISO = () => new Date().toISOString().split('T')[0];

export const TransportScreen = () => {
  const cropDetails = useAppStore((state) => state.cropDetails);
  const farmerAddress = useAppStore((state) => state.farmerAddress);
  const farmerOrigin = useAppStore((state) => state.farmerOrigin);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const { t, money, number, rate } = useT();

  const deals = useAppStore((state) => state.deals);
  const pendingMandi = useAppStore((state) => state.pendingMandi);
  const attachBookingToDeal = useAppStore((state) => state.attachBookingToDeal);

  const { comparison } = useLiveMarket(cropDetails.cropType, cropDetails.quantityKg);
  const { requests, loading, error, refresh } = useMyRequests();

  /*
   * Only deals for the crop currently loaded. A farmer with an agreed tomato
   * price and a shed full of onions must not have the tomato rate attached to
   * an onion consignment — exactly the kind of quiet mismatch a waybill carries
   * all the way to the mandi gate.
   */
  const agreedDeals = deals.filter(
    (deal) => deal.status === 'Agreed' && !deal.bookingId && deal.cropType === cropDetails.cropType
  );

  const [panel, setPanel] = useState(() => (!pendingMandi && agreedDeals.length ? 'ask' : 'deal'));
  const [dealId, setDealId] = useState(() => agreedDeals[0]?.id || null);
  const [pickupDate, setPickupDate] = useState(todayISO());
  const [slot, setSlot] = useState('morning');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sentId, setSentId] = useState(null);

  const deal = agreedDeals.find((d) => d.id === dealId) || agreedDeals[0] || null;

  const ask = async () => {
    if (!deal) return;
    const slotOption = SLOTS.find((s) => s.id === slot) || SLOTS[0];
    setSending(true);
    setSendError('');
    try {
      const created = await createPickupRequest({
        cropType: deal.cropType,
        quantityKg: deal.quantityKg,
        origin: { label: farmerAddress, coordinates: farmerOrigin },
        // The agreed mandi, with its real coordinate. Without one the request
        // cannot be ranked, and the server refuses it rather than storing
        // something no fleet owner can act on.
        destination: { label: deal.mandiName, coordinates: deal.mandiCoords || null },
        agreedRatePerKg: deal.agreedRatePerKg,
        // Link to buyer if this is a buyer deal
        buyerPostingId: deal.buyerPostingId || null,
        buyerId: deal.buyerId || null,
        pickupDate,
        window: {
          startHour: slotOption.startHour,
          endHour: slotOption.endHour,
          label: `${t(slotOption.labelKey)} (${t(slotOption.timeKey)})`,
        },
      });
      attachBookingToDeal(deal.id, created.id);
      setSentId(created.id);
      await refresh();
    } catch (err) {
      setSendError(err?.response?.data?.message || t('transport.ask.failed'));
    } finally {
      setSending(false);
    }
  };

  const withdraw = async (id) => {
    try {
      await cancelPickupRequest(id);
      await refresh();
    } catch (err) {
      setSendError(err?.response?.data?.message || t('transport.ask.failed'));
    }
  };

  const open = requests.filter((r) => OPEN_STATUSES.includes(r.status));
  const past = requests.filter((r) => !OPEN_STATUSES.includes(r.status));

  const renderRequest = (request) => (
    <article key={request.id} className="border-2 border-ink bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink px-4 py-3">
        <p className="font-display text-2xl leading-none tnum text-ink">
          {t('dispatch.ref', { ref: request.id.slice(-6).toUpperCase() })}
        </p>
        <span className="border-2 border-ink bg-turmeric-300 px-2 py-1 text-sm font-bold leading-none text-ink">
          {t(`tracking.status.${request.status}`)}
        </span>
      </div>

      <div className="px-4">
        <LedgerRow
          label={t('transport.route.pickup')}
          sub={request.origin.label}
          value={<span className="font-sans text-base">{request.pickupDate}</span>}
        />
        <LedgerRow
          label={t('transport.route.drop')}
          sub={request.destination.label}
          value={<span className="font-sans text-base">{request.window?.label?.split(' ')[0]}</span>}
        />
        <LedgerRow
          label={t('transport.book.load')}
          value={(
            <span className="font-sans text-base tnum">
              {number(request.quantityKg)} {t('common.kg')}
            </span>
          )}
          sub={t(`crops.${request.cropType}`)}
        />
        {request.agreedRatePerKg != null && (
          <LedgerRow
            label={t('deal.agreedTitle')}
            value={<span className="font-sans text-base tnum">{rate(request.agreedRatePerKg)}/{t('common.kg')}</span>}
            sub={money(request.agreedRatePerKg * request.quantityKg)}
            emphasis
          />
        )}
      </div>

      {/*
       * Who is coming. A pending request has no truck attached and says so
       * rather than showing a placeholder — nobody has agreed to collect it yet,
       * and that is the single most important thing the farmer needs to know.
       */}
      {request.vehicle ? (
        <div className="border-t-2 border-ink px-4 py-3.5">
          <p className="eyebrow flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
            {t('transport.track.comingFor')}
          </p>
          <p className="mt-1.5 font-display text-2xl leading-none tnum text-ink">
            {request.vehicle.vehicleNo}
          </p>
          <p className="mt-1 text-base text-ink-soft">
            {request.vehicle.vehicleType} · {request.vehicle.driverName}
          </p>
          <div className="mt-3">
            <Button
              variant="secondary"
              icon={Phone}
              onClick={() => { window.location.href = `tel:${request.vehicle.driverPhone}`; }}
            >
              {t('transport.bookings.callDriver')}
            </Button>
          </div>
        </div>
      ) : request.status === 'pending' && (
        <div className="border-t-2 border-ink bg-turmeric-50 px-4 py-3.5">
          <p className="text-base text-ink-soft">{t('transport.track.waiting')}</p>
        </div>
      )}

      <div className="border-t-2 border-ink px-4 py-3.5">
        <TrackingTimeline request={request} />
      </div>

      {/*
       * The haul, and the truck on it.
       *
       * Closed by default: the timeline above already answers "has it been
       * collected", which is the question most opens are about, and a map is
       * the expensive answer to a question nobody asked yet. Open, it shows the
       * pickup, the mandi the lot was actually sold to, and the last position
       * the driver reported — with the time of that fix, never without.
       */}
      <div className="border-t-2 border-ink px-4 py-2">
        <TrackingMap request={request} />
      </div>

      {request.status === 'pending' && (
        <div className="border-t-2 border-ink px-4 py-3.5">
          <Button variant="secondary" icon={X} onClick={() => withdraw(request.id)}>
            {t('transport.track.withdraw')}
          </Button>
        </div>
      )}
    </article>
  );

  return (
    <div className="space-y-6 pt-4 pb-4">
      <SectionHead level="screen" title={t('transport.title')} />

      <SegmentedToggle
        options={[
          { id: 'deal', label: t('deal.tab'), icon: Handshake },
          { id: 'ask', label: t('transport.ask.tab'), icon: Send },
          { id: 'mine', label: t('transport.bookings.title'), icon: ClipboardList },
        ]}
        value={panel}
        onChange={setPanel}
      />

      <div key={panel} id={`panel-${panel}`} role="tabpanel" className="detail-enter space-y-5">

        {panel === 'deal' && (
          <DealPanel
            comparison={comparison}
            onDealAgreed={(id) => { setDealId(id); setPanel('ask'); setSentId(null); }}
          />
        )}

        {/* The gate. Not a disabled button — a farmer who lands here without a
            deal needs to know what is missing and where to go. */}
        {panel === 'ask' && !deal && (
          <div className="border-2 border-ink bg-white px-4 py-8 text-center">
            <Handshake className="mx-auto h-10 w-10 text-ink-faint" strokeWidth={2} aria-hidden="true" />
            <p className="mt-3 font-display text-3xl leading-none text-ink">{t('transport.book.needDeal')}</p>
            <p className="mx-auto mt-2 max-w-sm leading-snug text-ink-soft">{t('transport.book.needDealWhy')}</p>
            <div className="mx-auto mt-5 max-w-xs">
              <Button icon={Handshake} onClick={() => setPanel('deal')}>{t('deal.tab')}</Button>
            </div>
          </div>
        )}

        {panel === 'ask' && deal && (
          <>
            {/* ---- The agreement this pickup is serving. ---- */}
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
                <p className="mt-1 text-sm text-ink-soft">{farmerAddress}</p>
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
                onChange={(event) => setPickupDate(event.target.value)}
              />
            </div>

            <ChoiceGrid
              label={t('transport.book.slot')}
              value={slot}
              onChange={setSlot}
              options={SLOTS.map((option) => ({
                id: option.id,
                label: t(option.labelKey),
                sub: t(option.timeKey),
                icon: option.icon,
              }))}
            />

            {sendError && <p className="notice notice-bad" role="alert">{sendError}</p>}

            {!sentId && (
              <>
                <Button icon={Send} busy={sending} onClick={ask}>
                  {t('transport.ask.send')}
                </Button>
                {/* Says plainly that no truck is being chosen here, so the
                    absence of a vehicle list does not read as something
                    missing. */}
                <p className="text-center text-sm text-ink-soft">{t('transport.ask.note')}</p>
              </>
            )}

            {sentId && (
              <div className="detail-enter space-y-3">
                <p className="notice notice-good" role="status">
                  <Check className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                  <span>{t('transport.ask.sent')}</span>
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
            {error && (
              <div className="border-2 border-terracotta-500 bg-terracotta-50 px-4 py-6 text-center">
                <CloudOff className="mx-auto h-8 w-8 text-terracotta-600" strokeWidth={2} aria-hidden="true" />
                <p className="mt-3 font-display text-2xl text-ink">{t('transport.track.offline')}</p>
                <div className="mx-auto mt-4 max-w-xs">
                  <Button icon={RefreshCw} onClick={refresh}>{t('dispatch.retry')}</Button>
                </div>
              </div>
            )}

            {!error && !loading && requests.length === 0 && (
              <div className="border-2 border-ink bg-white px-4 py-10 text-center">
                <p className="font-display text-3xl text-ink-faint">{t('transport.bookings.empty')}</p>
                <div className="mx-auto mt-5 max-w-xs">
                  <Button icon={Send} onClick={() => setPanel('ask')}>
                    {t('transport.ask.tab')}
                  </Button>
                </div>
              </div>
            )}

            {open.length > 0 && (
              <section className="space-y-3">
                <SectionHead
                  level="group"
                  title={t('transport.bookings.active')}
                  action={
                    <Button full={false} variant="secondary" icon={RefreshCw} onClick={refresh} busy={loading}>
                      {t('dispatch.refresh')}
                    </Button>
                  }
                />
                {open.map(renderRequest)}
              </section>
            )}

            {past.length > 0 && (
              <section className="space-y-3">
                <SectionHead level="group" title={t('transport.bookings.past')} />
                {past.map(renderRequest)}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransportScreen;
