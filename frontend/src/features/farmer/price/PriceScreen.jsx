import React, { useState } from 'react';
import { Store, LineChart, Wallet, MapPin, Truck } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { useT } from '../../../i18n/useT';
import { useLiveMarket } from '../../../data/useLiveMarket';
import { AHEAD_DAYS } from '../../../data/demoMarket';
import { SectionHead } from '../../../design/primitives/SectionHead';
import { SegmentedToggle } from '../../../design/primitives/SegmentedToggle';
import { LedgerRow } from '../../../design/primitives/LedgerRow';
import { MarketStatusStamp } from '../../../design/primitives/MarketStatusStamp';
import { Button } from '../../../design/primitives/Button';
import { ForecastChart } from './ForecastChart';

/**
 * Everything about "where and when do I sell?", in one screen.
 *
 * Absorbs four of the old tabs — Price Forecast, Mandi Comparison, Demand &
 * Trends, and Sell vs Hold. Those answered the same question from four angles,
 * and four tabs makes a research tool where the farmer needs a decision tool.
 *
 * Only one panel is ever on screen. The default is Mandi rates, because "which
 * mandi pays most" is the question people actually arrive with; the forecast
 * and the cost breakdown are for the farmer who wants to check our working.
 */
export const PriceScreen = () => {
  const cropDetails = useAppStore((state) => state.cropDetails);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const { t, money, rate, number } = useT();

  const [panel, setPanel] = useState('rates');

  const { best, comparison, forecast, status } = useLiveMarket(cropDetails.cropType, cropDetails.quantityKg);

  const cropName = t(`crops.${cropDetails.cropType}`);

  const options = [
    { id: 'rates', label: t('price.tab.rates'), icon: Store },
    { id: 'forecast', label: t('price.tab.forecast'), icon: LineChart },
    { id: 'costs', label: t('price.tab.costs'), icon: Wallet },
  ];

  return (
    <div className="space-y-6 pt-4">
      <SectionHead
        level="screen"
        title={t('price.title')}
        note={t('price.subtitle', { crop: cropName })}
      />

      {/* The headline answer stays put while the panels change beneath it. */}
      <div className="detail-enter flex flex-wrap items-end justify-between gap-4 border-2 border-ink bg-white px-4 py-4">
        <div>
          <p className="eyebrow">{t('price.bestHere')}</p>
          <p className="mt-1 font-display text-3xl leading-none text-ink">{t(`mandis.${best.id}`)}</p>
        </div>
        <p className="font-display text-5xl leading-none tnum text-forest-700">
          {rate(best.ratePerKg)}
          <span className="ml-1.5 font-sans text-sm font-semibold text-ink-soft">
            {t('common.perKg')}
          </span>
        </p>
      </div>

      <SegmentedToggle options={options} value={panel} onChange={setPanel} />

      {/* Keyed so switching panels replays the entrance — the change is felt, not just seen. */}
      <div key={panel} id={`panel-${panel}`} role="tabpanel" className="detail-enter">

        {panel === 'rates' && (
          <div className="space-y-4">
            <div className="border-2 border-ink bg-white px-4">
              {comparison.map((mandi, index) => (
                <LedgerRow
                  key={mandi.id}
                  emphasis={index === 0}
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
              <p className="py-3 text-sm leading-snug text-ink-faint">{t('price.mandis.explain')}</p>
            </div>
            <MarketStatusStamp status={status} />
          </div>
        )}

        {panel === 'forecast' && (
          <div className="space-y-4">
            <div className="border-2 border-ink bg-white p-4">
              <p className="eyebrow mb-3">{t('price.forecast.nextDays', { count: AHEAD_DAYS })}</p>
              <ForecastChart points={forecast} />
            </div>
            <MarketStatusStamp status={status} />
          </div>
        )}

        {panel === 'costs' && (
          <div className="space-y-4">
            <div className="border-2 border-ink bg-white px-4">
              <LedgerRow label={t('price.costs.gross')} value={money(best.gross)} />
              <LedgerRow label={t('price.costs.freight')} value={`− ${money(best.freight)}`} />
              <LedgerRow label={t('price.costs.commission')} value={`− ${money(best.commission)}`} />
              <LedgerRow label={t('price.costs.net')} value={money(best.net)} emphasis />
            </div>
            <MarketStatusStamp status={status} />
          </div>
        )}
      </div>

      {/* One action, always the same one, wherever the farmer got to. */}
      <Button icon={Truck} onClick={() => setActiveTab('transport')}>
        {t('today.bookVehicle')}
      </Button>
    </div>
  );
};

export default PriceScreen;
