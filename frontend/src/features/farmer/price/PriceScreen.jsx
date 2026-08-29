import React, { useState } from 'react';
import { Store, LineChart, Wallet, RefreshCw, MessageSquare } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { useT } from '../../../i18n/useT';
import { useLiveMarket, mandiLabel, COMMISSION_RATE } from '../../../data/useLiveMarket';
import { AHEAD_DAYS } from '../../../data/demoMarket';
import { ensure } from '../../../data/marketCache';
import { useModelForecast } from '../../../data/modelForecast';
import { SectionHead } from '../../../design/primitives/SectionHead';
import { SegmentedToggle } from '../../../design/primitives/SegmentedToggle';
import { LedgerRow } from '../../../design/primitives/LedgerRow';
import { MarketStatusStamp } from '../../../design/primitives/MarketStatusStamp';
import { Button } from '../../../design/primitives/Button';
import { ForecastChart } from './ForecastChart';
import { ForecastNote } from './ForecastNote';
import { MandiRow } from './MandiRow';
import { WhyFurther } from './WhyFurther';
import { SellAdvice } from './SellAdvice';

/**
 * Everything about "where and when do I sell?", in one screen.
 *
 * Absorbs four of the old tabs — Price Forecast, Mandi Comparison, Demand &
 * Trends, and Sell vs Hold — because those answered the same question from four
 * angles, and four tabs makes a research tool where the farmer needs a decision
 * tool.
 *
 * Two things changed when the live feed replaced the four-mandi shortlist.
 * First, the list is now every Maharashtra APMC reporting this crop — often
 * forty to a hundred of them — so it is capped to the top handful with an
 * explicit "show all", rather than dumping ninety rows on a phone. Second,
 * every row opens into its own arithmetic, and the panel above the list argues
 * the case for the winner against the mandi down the road. Optimisation the
 * farmer cannot check is just a number with a logo on it.
 */

/** Enough rows to see the shape of the market without scrolling past the fold. */
const COLLAPSED_ROWS = 6;

export const PriceScreen = () => {
  const cropDetails = useAppStore((state) => state.cropDetails);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const setPendingMandi = useAppStore((state) => state.setPendingMandi);
  const { t, money, rate, number, shortDate } = useT();

  const [panel, setPanel] = useState('rates');
  const [showAll, setShowAll] = useState(false);
  const [openMandi, setOpenMandi] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const {
    best, comparison, advantage, forecast, status, fetchedAt, latestArrivalDate, liveCount, totalArrivalQuintals,
  } = useLiveMarket(cropDetails.cropType, cropDetails.quantityKg);

  // The trained model's series, when it can produce one for this crop. Falls
  // back to the history-trend `forecast` above otherwise.
  const model = useModelForecast(cropDetails.cropType);
  const usingModelForecast = Array.isArray(model.chartPoints) && model.chartPoints.length > 2;
  const forecastPoints = usingModelForecast ? model.chartPoints : forecast;
  const forecastHorizon = model.forecast?.horizonPeriods || model.modelInfo?.horizonPeriods || AHEAD_DAYS;

  const cropName = t(`crops.${cropDetails.cropType}`);
  const visible = showAll ? comparison : comparison.slice(0, COLLAPSED_ROWS);

  /*
   * Hands the chosen mandi to the Transport screen and jumps there. The rate
   * board is where the farmer decides *where* to sell; the deal and the truck
   * both belong to that destination, so carrying the choice across is what
   * stops the next screen asking the same question from a blank dropdown.
   */
  const startDeal = (row) => {
    setPendingMandi({
      id: row.id,
      name: row.name,
      nameKey: row.nameKey,
      district: row.district,
      coordinates: row.coordinates,
      distanceKm: row.distanceKm,
      distanceApprox: row.distanceApprox,
      ratePerKg: row.ratePerKg,
      net: row.net,
    });
    setActiveTab('transport');
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      // Keep the live board and the model chart on the same Agmarknet refresh.
      // The model endpoint fetches the recent history it needs server-side.
      await Promise.all([
        ensure(cropDetails.cropType, { force: true }),
        model.refresh(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const options = [
    { id: 'rates', label: t('price.tab.rates'), icon: Store },
    { id: 'forecast', label: t('price.tab.forecast'), icon: LineChart },
    { id: 'costs', label: t('price.tab.costs'), icon: Wallet },
  ];

  /* The provenance line, shared by all three panels: what the data is, how many
     mandis it covers, when it was last pulled, and a way to pull it again. */
  const provenance = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <MarketStatusStamp status={status} />
      <span className="text-sm text-ink-soft font-semibold tnum">
        📦 {t('today.cropArrivals')}: {number(totalArrivalQuintals)} {t('common.quintal')}
      </span>
      {status === 'live' && (
        <span className="text-sm text-ink-faint tnum">
          {t('price.mandis.count', { count: liveCount })}
          {latestArrivalDate && ` · ${t('price.mandis.arrival', { date: shortDate(new Date(latestArrivalDate)) })}`}
        </span>
      )}
      <button
        type="button"
        onClick={refresh}
        disabled={refreshing}
        className="ml-auto inline-flex items-center gap-1.5 text-sm font-bold text-forest-700 underline underline-offset-2 disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={2.25} aria-hidden="true" />
        {refreshing ? t('price.refreshing') : t('price.refresh')}
      </button>
      {fetchedAt && !refreshing && (
        <span className="w-full text-sm text-ink-faint tnum">
          {t('price.updated', { time: new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}
        </span>
      )}
    </div>
  );

  return (
    <div className="space-y-6 pt-4">
      <SectionHead
        level="screen"
        title={t('price.title')}
        note={t('price.subtitle', { crop: cropName })}
      />

      {/* The headline answer stays put while the panels change beneath it. */}
      <div className="detail-enter flex flex-wrap items-end justify-between gap-4 border-2 border-ink bg-white px-4 py-4">
        <div className="min-w-0">
          <p className="eyebrow">{t('price.bestHere')}</p>
          <p className="mt-1 truncate font-display text-3xl leading-none text-ink">{mandiLabel(t, best)}</p>
          {best.distanceKm != null && (
            <p className="mt-1.5 text-sm text-ink-faint tnum">
              {best.distanceApprox && '~'}{number(best.distanceKm)} {t('common.km')} · {t('price.mandis.net')} {money(best.net)}
            </p>
          )}
        </div>
        <p className="font-display text-5xl leading-none tnum text-forest-700">
          {rate(best.ratePerKg)}
          <span className="ml-1.5 font-sans text-sm font-semibold text-ink-soft">
            {t('common.perKg')}
          </span>
        </p>
      </div>

      {/* The headline decision — sell now or hold — sits above the tabs because
          it is the question the whole screen exists to answer. Weather + demand
          scoring, with its full working. Only shown against live rates: scoring
          a demo baseline would dress fabricated numbers up as advice. */}
      {status === 'live' && (
        <SellAdvice cropType={cropDetails.cropType} baselineRate={best?.ratePerKg} />
      )}

      <SegmentedToggle options={options} value={panel} onChange={setPanel} />

      {/* Keyed so switching panels replays the entrance — the change is felt, not just seen. */}
      <div key={panel} id={`panel-${panel}`} role="tabpanel" className="detail-enter">

        {panel === 'rates' && (
          <div className="space-y-4">
            {/* The argument comes before the evidence: a farmer who reads only
                one thing on this screen should read the trade-off, not row 1. */}
            <WhyFurther advantage={advantage} comparison={comparison} />

            <div className="border-2 border-ink bg-white">
              {visible.map((mandi, index) => (
                <MandiRow
                  key={mandi.id}
                  row={mandi}
                  rank={index}
                  expanded={openMandi === mandi.id}
                  onToggle={() => setOpenMandi(openMandi === mandi.id ? null : mandi.id)}
                  onContact={startDeal}
                />
              ))}

              {comparison.length > COLLAPSED_ROWS && (
                <button
                  type="button"
                  onClick={() => setShowAll(!showAll)}
                  className="w-full px-4 py-3 text-left text-sm font-bold text-forest-700 underline underline-offset-2"
                >
                  {showAll
                    ? t('price.mandis.showLess')
                    : t('price.mandis.showAll', { count: comparison.length - COLLAPSED_ROWS })}
                </button>
              )}

              <p className="px-4 py-3 text-sm leading-snug text-ink-faint">
                {t('price.mandis.explain')}
              </p>
            </div>

            {provenance}
          </div>
        )}

        {panel === 'forecast' && (
          <div className="space-y-4">
            <div className="border-2 border-ink bg-white p-4">
              <p className="eyebrow mb-3">{t('price.forecast.nextDays', { count: forecastHorizon })}</p>
              <ForecastChart
                points={forecastPoints}
                note={usingModelForecast
                  ? t('price.forecast.explainModel')
                  : t('price.forecast.explain')}
              />
              {usingModelForecast && Number.isFinite(model.forecast?.predictedPricePerKg) && (
                <p className="mt-3 border-l-4 border-forest-700 bg-paper px-3 py-2 text-sm text-ink-soft">
                  {t('price.forecast.modelEstimate', {
                    rate: rate(model.forecast.predictedPricePerKg),
                    count: forecastHorizon,
                  })}
                </p>
              )}
              <ForecastNote
                modelInfo={model.modelInfo}
                usingModel={usingModelForecast}
                cropType={cropDetails.cropType}
              />
            </div>
            {provenance}
          </div>
        )}

        {panel === 'costs' && (
          <div className="space-y-4">
            <div className="border-2 border-ink bg-white px-4">
              <LedgerRow
                label={t('price.costs.gross')}
                sub={t('price.breakdown.rateQty', { rate: rate(best.ratePerKg), qty: number(best.quantityKg) })}
                value={money(best.gross)}
              />
              <LedgerRow
                label={t('price.costs.freight')}
                sub={best.distanceKm != null
                  ? t('price.breakdown.freightCalc', { km: number(best.distanceKm), perKm: number(best.ratePerKm || 0) })
                  : undefined}
                value={`− ${money(best.freight)}`}
              />
              <LedgerRow
                label={t('price.costs.commission')}
                sub={t('price.breakdown.commissionCalc', { percent: `${COMMISSION_RATE * 100}%` })}
                value={`− ${money(best.commission)}`}
              />
              <LedgerRow label={t('price.costs.net')} value={money(best.net)} emphasis />
            </div>

            {/* Per-kg, because that is the unit a farmer negotiates in — and the
                unit in which "the truck ate the difference" becomes obvious. */}
            <div className="border-2 border-ink bg-white px-4">
              <LedgerRow label={t('price.costs.netPerKg')} value={`${rate(best.net / Math.max(best.quantityKg, 1))}`} />
              <LedgerRow label={t('price.costs.freightPerKg')} value={`${rate(best.freightPerKg || 0)}`} />
            </div>

            {provenance}
          </div>
        )}
      </div>

      {/* One action, always the same one, wherever the farmer got to — and it
          leads to the deal with the best-paying mandi, not straight to a truck. */}
      <Button icon={MessageSquare} onClick={() => startDeal(best)}>
        {t('deal.contactBest', { mandi: mandiLabel(t, best) })}
      </Button>
    </div>
  );
};

export default PriceScreen;
