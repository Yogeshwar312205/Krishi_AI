import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Truck, IndianRupee, Sprout, MapPin, Handshake, Boxes, Thermometer } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { useT } from '../../../i18n/useT';
import { useLiveMarket, mandiLabel } from '../../../data/useLiveMarket';
import { useWeather, weatherLabelKey } from '../../../data/weather';
import { PERISHABLE_CROPS } from '../../../utils/constants';
import { useSellAdvice } from '../../../data/sellAdvice';
import { AdviceReasons } from '../price/AdviceReasons';
import { AdviceExplanation } from '../price/AdviceExplanation';
import { fetchBuyerPostings } from '../../../services/api';
import { Slab } from '../../../design/primitives/Slab';
import { Button } from '../../../design/primitives/Button';
import { SectionHead } from '../../../design/primitives/SectionHead';
import { LedgerRow } from '../../../design/primitives/LedgerRow';
import { MarketStatusStamp } from '../../../design/primitives/MarketStatusStamp';
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
  const setPendingMandi = useAppStore((state) => state.setPendingMandi);
  const { t, money, rate, number, lang } = useT();

  const [buyerPostings, setBuyerPostings] = useState([]);
  const [isLoadingPostings, setIsLoadingPostings] = useState(true);

  const { best, comparison, delta, action, status, totalArrivalQuintals } = useLiveMarket(cropDetails.cropType, cropDetails.quantityKg);

  // Current conditions at the farm. Null when there is no farm pin or the feed
  // is down — the strip just doesn't render.
  const weather = useWeather();
  const perishable = PERISHABLE_CROPS.has(cropDetails.cropType);
  const spoilPerHour = best?.transitHours > 0 ? (best.spoilageCost || 0) / best.transitHours : 0;
  const hotNudge = weather && perishable && weather.tempC >= 30 && spoilPerHour >= 1;

  // Fetch buyer postings filtered by farmer's crop type
  useEffect(() => {
    const loadBuyerPostings = async () => {
      setIsLoadingPostings(true);
      try {
        // Fetch postings matching the farmer's selected crop
        const postings = await fetchBuyerPostings({ cropType: cropDetails.cropType });
        setBuyerPostings(postings);
      } catch (err) {
        console.warn('Failed to load buyer postings:', err.message);
        setBuyerPostings([]);
      } finally {
        setIsLoadingPostings(false);
      }
    };

    loadBuyerPostings();
  }, [cropDetails.cropType]); // Re-fetch when crop changes

  const cropName = t(`crops.${cropDetails.cropType}`);
  const firstName = user?.name ? user.name.split(' ')[0] : null;

  // The one number the whole screen exists to deliver — so it arrives, rather
  // than just being present. Settles on the exact value; honours reduced motion.
  const animatedRate = useCountUp(best.ratePerKg);

  // Same source as the Prices screen's "Sell now or wait?" card, so the two
  // never disagree: the rule-based call, the model-softened `decision`, and the
  // Gemini explanation all come from one request. Only asked for once rates are
  // live — scoring a demo baseline would be scoring made-up numbers.
  const { data: adviceData } = useSellAdvice(
    cropDetails.cropType,
    best?.ratePerKg,
    status === 'live',
    lang,
  );
  const advice = adviceData?.advice || null;
  const decision = adviceData?.decision || null;
  const explanation = adviceData?.explanation || null;
  const rec = decision?.recommendation || advice?.recommendation || null;

  // Engine verdict when we have it; otherwise fall back to the day-over-day
  // heuristic ('wait' = rate still climbing, 'go' = sell into today's peak).
  const isWait = rec ? (rec === 'HOLD' || rec === 'HOLD_STRONG') : action === 'wait';
  const reasonText = rec
    ? t(`price.advice.recText.${rec}`)
    : isWait
      ? t('today.holdWhy')
      : t('today.sellWhy');

  const DeltaIcon = delta > 0 ? ArrowUpRight : delta < 0 ? ArrowDownRight : Minus;
  const deltaLabel =
    delta > 0 ? t('today.rateUp', { amount: Math.abs(delta) })
    : delta < 0 ? t('today.rateDown', { amount: Math.abs(delta) })
    : t('today.rateSame');

  const handleDealWithBuyer = (posting) => {
    // Use buyer's location if available, otherwise fall back to mandi coordinates
    const hasSpecificLocation = posting.buyerLocation?.coordinates?.length === 2;
    
    // If buyer didn't provide specific coordinates, find the mandi coordinates from comparison
    let coordinates = hasSpecificLocation ? posting.buyerLocation.coordinates : null;
    
    if (!coordinates) {
      // Find the mandi in the comparison array to get its coordinates
      const mandiMatch = comparison.find(m => 
        m.name === posting.mandiName || m.nameKey === posting.mandiName
      );
      if (mandiMatch?.coordinates) {
        coordinates = mandiMatch.coordinates;
      }
    }
    
    setPendingMandi({
      id: posting.mandiName,
      name: posting.mandiName,
      ratePerKg: posting.offeredPricePerKg,
      net: posting.offeredPricePerKg * cropDetails.quantityKg,
      // Use buyer's specific coordinates if provided, otherwise use mandi coordinates
      coordinates: coordinates,
      // Always mark as buyer location when dealing with buyer posting
      // This ensures buyer's rate is displayed instead of Agmarknet rate
      isBuyerLocation: true,
      buyerAddress: posting.buyerLocation?.address || posting.mandiName,
      traderName: posting.traderName,
      traderPhone: posting.traderPhone,
      // Store buyer posting info for linking pickup request later
      buyerPostingId: posting.id,
      buyerId: posting.userId,
    });
    setActiveTab('transport');
  };

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

      {/* Today's weather at the farm. It matters here because it is one of the
          inputs to the spoilage cost on the Prices screen — a hot day makes a
          soft crop on an open truck lose value faster. */}
      {weather && (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-y-2 border-rule py-2.5 text-sm text-ink-soft">
          <Thermometer className="h-4 w-4 text-forest-600" aria-hidden="true" />
          <span className="font-display text-lg leading-none tnum text-ink">{number(weather.tempC)}°</span>
          <span aria-hidden="true">·</span>
          <span>{t(weatherLabelKey(weather.weathercode))}</span>
          {hotNudge && (
            <span className="w-full leading-snug text-terracotta-700">
              {t('weather.hotPerishable', { crop: cropName, amount: money(spoilPerHour) })}
            </span>
          )}
        </div>
      )}

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

        {/* The reason, in one plain sentence. From the same engine as the
            Prices screen once rates are live; the day-over-day line otherwise. */}
        <p className={`mt-5 max-w-prose text-base leading-snug ${isWait ? 'text-ink-soft' : 'text-forest-100'}`}>
          {reasonText}
        </p>

        {/* Crop Arrival Volume & Market Status */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-forest-400/30 pt-3 text-sm font-semibold">
          <span className="flex items-center gap-1.5">
            <Boxes className="h-4 w-4" />
            {t('today.cropArrivals')}: <strong className="tnum">{number(totalArrivalQuintals)} {t('common.quintal')}</strong>
          </span>
          <MarketStatusStamp status={status} />
        </div>
      </Slab>

      {/* The reasoning behind the verdict: the plain-language explanation up
          top, the step-by-step working folded below it. Same components the
          Prices "Sell now or wait?" card uses, so the two screens stay in step. */}
      {advice && (explanation?.summary || advice.reasons?.length > 0) && (
        <div className="border-2 border-ink bg-white px-4 py-3.5">
          {explanation?.summary && (
            <AdviceExplanation
              explanation={explanation}
              combined={decision}
              forecastHorizon={adviceData?.forecast?.horizonPeriods}
            />
          )}
          {advice.reasons?.length > 0 && (
            <div className={explanation?.summary ? 'mt-3 border-t-2 border-ink pt-3' : ''}>
              <AdviceReasons reasons={advice.reasons} working={advice.working} tone="light" />
            </div>
          )}
        </div>
      )}

      {/* ---- Buyer Direct Postings / Buyer Rates Section ---- */}
      <section className="detail-enter space-y-3">
        <SectionHead
          title={t('buyer.rates.farmerTitle')}
          note={t('buyer.rates.farmerSubtitle')}
        />
        {isLoadingPostings ? (
          <div className="border-2 border-ink bg-white p-4 text-center text-sm text-ink-faint">
            {t('common.loading')}...
          </div>
        ) : buyerPostings.length === 0 ? (
          <div className="border-2 border-ink bg-white p-4 text-center text-sm text-ink-faint">
            {t('buyer.rates.emptyForCrop', { crop: cropName })}
          </div>
        ) : (
          <div className="stagger space-y-3">
            {buyerPostings.map((posting) => (
              <article key={posting.id} className="border-2 border-forest-700 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-forest-700 bg-forest-50 px-4 py-3">
                  <div>
                    <span className="eyebrow text-forest-800">{posting.mandiName}</span>
                    <p className="font-display text-2xl text-ink leading-tight">
                      {t(`crops.${posting.cropType}`)} · <span className="text-base text-ink-soft">{posting.grade}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="eyebrow text-forest-800">{t('buyer.rates.price')}</p>
                    <p className="font-display text-3xl text-forest-700 leading-none tnum">
                      {rate(posting.offeredPricePerKg)} <span className="font-sans text-sm font-semibold text-ink-soft">{t('common.perKg')}</span>
                    </p>
                  </div>
                </div>
                <div className="px-4 py-3 space-y-2 text-sm">
                  <div className="flex flex-wrap justify-between items-center text-ink-soft gap-2">
                    <span>{t('buyer.rates.trader')}: <strong className="text-ink">{posting.traderName}</strong></span>
                    <span className="tnum font-semibold text-forest-700">{t('buyer.rates.needed')}: {number(posting.requiredQuantityKg)} {t('common.kg')}</span>
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="accent"
                      icon={Handshake}
                      onClick={() => handleDealWithBuyer(posting)}
                    >
                      {t('buyer.rates.dealWithBuyer')}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

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
                label={mandiLabel(t, mandi)}
                sub={`${mandi.distanceApprox ? '~' : ''}${number(mandi.distanceKm)} ${t('common.km')} · ${rate(mandi.ratePerKg)}/${t('common.kg')}${mandi.arrivalQuintals ? ` · ${number(mandi.arrivalQuintals)} ${t('common.quintal')}` : ''}`}
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
