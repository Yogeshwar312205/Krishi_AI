import React, { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Truck, IndianRupee, Sprout, MapPin } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { useT } from '../../../i18n/useT';
import { buildVerdict } from '../../../data/demoMarket';
import { Slab } from '../../../design/primitives/Slab';
import { Button } from '../../../design/primitives/Button';
import { SectionHead } from '../../../design/primitives/SectionHead';
import { LedgerRow } from '../../../design/primitives/LedgerRow';
import { DemoStamp } from '../../../design/primitives/DemoStamp';
import { useCountUp } from '../../../design/useCountUp';

/**
 * The whole app in one screen: what should I do with my crop today?
 *
 * Everything above the fold answers that in three signals a farmer can read
 * without reading — the colour of the slab, one verb, and one large number.
 * Detail is available below, but nobody has to reach it to act.
 */
export const TodayScreen = () => {
  const user = useAppStore((state) => state.user);
  const cropDetails = useAppStore((state) => state.cropDetails);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const { t, money, rate, number } = useT();

  const { best, comparison, delta, action } = useMemo(
    () => buildVerdict(cropDetails.cropType, cropDetails.quantityKg),
    [cropDetails.cropType, cropDetails.quantityKg]
  );

  const cropName = t(`crops.${cropDetails.cropType}`);
  const firstName = user?.name ? user.name.split(' ')[0] : null;

  // The one number the whole screen exists to deliver — so it arrives, rather
  // than just being present. Settles on the exact value; honours reduced motion.
  const animatedRate = useCountUp(best.ratePerKg);

  // 'wait' means the rate is still climbing; 'go' means sell into today's peak.
  const isWait = action === 'wait';

  const DeltaIcon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  const deltaLabel =
    delta > 0 ? t('today.rateUp', { amount: Math.abs(delta) })
    : delta < 0 ? t('today.rateDown', { amount: Math.abs(delta) })
    : t('today.rateSame');

  return (
    <div className="space-y-8 pb-4">

      {/* ---- Who and what, in one line. No hero, no marketing. ---- */}
      <div className="pt-4">
        <p className="font-display text-2xl leading-none text-ink">
          {firstName ? t('today.greeting', { name: firstName }) : t('today.greetingAnon')}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
          <Sprout className="h-4 w-4 text-forest-600" aria-hidden="true" />
          <span className="font-semibold text-ink">{cropName}</span>
          <span aria-hidden="true">·</span>
          <span className="tnum">{number(cropDetails.quantityKg)} {t('common.kg')}</span>
          <button
            type="button"
            onClick={() => setActiveTab('crop')}
            className="underline underline-offset-2 font-semibold text-forest-700"
          >
            {t('common.showDetails')}
          </button>
        </p>
      </div>

      {/*
        ---- The signature: the verdict slab ----
        Full-bleed, one colour, one verb, one number. Colour carries the answer
        before any word is read, and the two tones differ in lightness as well
        as hue so the distinction survives colour-blindness and direct sunlight.
      */}
      <Slab
        tone={isWait ? 'wait' : 'go'}
        label={t('today.question')}
        headline={isWait ? t('today.hold') : t('today.sell')}
      >
        <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <p className={`eyebrow mb-1 ${isWait ? 'text-ink-soft' : 'text-forest-200'}`}>
              {t('today.rateToday')}
            </p>
            <p className="font-display text-5xl leading-none tnum">
              {rate(animatedRate)}
              <span className="ml-2 align-baseline text-lg font-sans font-semibold opacity-80">
                {t('common.perKg')}
              </span>
            </p>
          </div>

          <p className="flex items-center gap-1.5 text-base font-semibold">
            <DeltaIcon className="h-5 w-5 shrink-0" strokeWidth={2.75} aria-hidden="true" />
            {deltaLabel}
          </p>
        </div>

        {/* The reason, in one plain sentence. */}
        <p className={`mt-5 max-w-prose text-base leading-snug ${isWait ? 'text-ink-soft' : 'text-forest-100'}`}>
          {isWait ? t('today.holdWhy') : t('today.sellWhy')}
        </p>

        <div className="mt-4">
          <DemoStamp />
        </div>
      </Slab>

      {/*
        ---- Detail ----
        On a phone this is one column: mandis, then the two actions.
        From `lg` up the actions move into a side column so they stay in view
        beside the ledger instead of falling below the fold on a wide screen —
        the desktop failure mode is not cramping, it is the primary action
        drifting somewhere the eye never goes.
      */}
      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <section className="detail-enter space-y-3 lg:col-span-2">
          <SectionHead
            title={t('today.bestMandi')}
            action={
              <button
                type="button"
                onClick={() => setActiveTab('price')}
                className="shrink-0 pb-1 text-sm font-bold text-forest-700 underline underline-offset-2"
              >
                {t('common.seeAll')}
              </button>
            }
          />

          <div className="docket stagger px-4">
            {comparison.slice(0, 3).map((mandi, index) => (
              <LedgerRow
                key={mandi.id}
                emphasis={index === 0}
                className="lift"
                onClick={() => setActiveTab('price')}
                marker={
                  <span
                    className={`flex h-9 w-9 items-center justify-center border-2 ${
                      index === 0 ? 'border-forest-700 bg-forest-700 text-white' : 'border-rule text-ink-faint'
                    }`}
                    aria-hidden="true"
                  >
                    <MapPin className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                }
                label={t(`mandis.${mandi.id}`)}
                sub={`${number(mandi.distanceKm)} ${t('common.km')} · ${rate(mandi.ratePerKg)}/${t('common.kg')}`}
                value={money(mandi.net)}
              />
            ))}

            <p className="py-3 text-sm leading-snug text-ink-faint">
              {t('price.mandis.explain')}
            </p>
          </div>
        </section>

        <div className="detail-enter grid gap-3 sm:grid-cols-2 lg:sticky lg:top-20 lg:grid-cols-1">
          <Button icon={Truck} onClick={() => setActiveTab('transport')}>
            {t('today.bookVehicle')}
          </Button>
          <Button variant="secondary" icon={IndianRupee} onClick={() => setActiveTab('price')}>
            {t('today.seePrices')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TodayScreen;
