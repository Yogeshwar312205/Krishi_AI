import React from 'react';
import { MapPin, ChevronDown, Crosshair } from 'lucide-react';
import { useT } from '../../../i18n/useT';
import { mandiLabel, COMMISSION_RATE } from '../../../data/useLiveMarket';

/**
 * One mandi, and — on tap — the entire arithmetic behind its number.
 *
 * The collapsed row is what a farmer scanning for the biggest figure needs;
 * the expansion is what a farmer being asked to send a truck 170 km needs.
 * Both matter, and the second one is why this screen can't just be a sorted
 * list: "you get ₹76,918" is an assertion until the ₹5,332 of diesel and the
 * ₹5,250 of commission are on screen next to it.
 */
export const MandiRow = ({ row, rank, expanded, onToggle }) => {
  const { t, money, rate, number, percent, shortDate } = useT();

  const name = mandiLabel(t, row);
  const isBest = rank === 0;
  const fuel = row.fuelDetails;

  return (
    <div className={`rule-hair ${isBest ? 'bg-forest-50' : ''}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-forest-50"
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center border-2 ${
            isBest ? 'border-forest-700 bg-forest-700 text-white' : 'border-rule text-ink-faint'
          }`}
          aria-hidden="true"
        >
          {isBest ? <MapPin className="h-4 w-4" strokeWidth={2.5} /> : <span className="tnum text-sm font-bold">{rank + 1}</span>}
        </span>

        <span className="min-w-0 flex-1">
          <span className={`block truncate leading-tight ${isBest ? 'font-bold text-ink' : 'text-ink'}`}>
            {name}
          </span>
          <span className="mt-0.5 block truncate text-sm leading-tight text-ink-faint tnum">
            {row.distanceApprox && '~'}{number(row.distanceKm)} {t('common.km')}
            {' · '}
            {rate(row.ratePerKg)}/{t('common.kg')}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className={`block font-display tnum leading-none ${isBest ? 'text-3xl text-forest-700' : 'text-2xl text-ink'}`}>
            {money(row.net)}
          </span>
        </span>

        <ChevronDown
          className={`h-5 w-5 shrink-0 text-ink-faint transition-transform ${expanded ? 'rotate-180' : ''}`}
          strokeWidth={2.25}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="detail-enter border-t-2 border-rule bg-white px-4 py-3.5">
          <p className="eyebrow mb-2.5">{t('price.breakdown.title')}</p>

          <dl className="space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-soft">
                {t('price.costs.gross')}
                <span className="ml-1.5 text-ink-faint tnum">
                  {t('price.breakdown.rateQty', { rate: rate(row.ratePerKg), qty: number(row.quantityKg) })}
                </span>
              </dt>
              <dd className="shrink-0 font-semibold tnum text-ink">{money(row.gross)}</dd>
            </div>

            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-soft">
                {t('price.costs.freight')}
                <span className="ml-1.5 text-ink-faint tnum">
                  {t('price.breakdown.freightCalc', {
                    km: number(row.distanceKm),
                    perKm: number(row.ratePerKm),
                  })}
                </span>
              </dt>
              <dd className="shrink-0 font-semibold tnum text-terracotta-600">− {money(row.freight)}</dd>
            </div>

            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-soft">
                {t('price.costs.commission')}
                <span className="ml-1.5 text-ink-faint tnum">
                  {t('price.breakdown.commissionCalc', { percent: percent(COMMISSION_RATE) })}
                </span>
              </dt>
              <dd className="shrink-0 font-semibold tnum text-terracotta-600">− {money(row.commission)}</dd>
            </div>

            <div className="flex items-baseline justify-between gap-3 border-t-2 border-ink pt-2">
              <dt className="font-bold text-ink">{t('price.costs.net')}</dt>
              <dd className="shrink-0 font-display text-2xl leading-none tnum text-forest-700">{money(row.net)}</dd>
            </div>
          </dl>

          {/* Freight is the number farmers are most likely to dispute, so it is
              the one we show the derivation of rather than just the total. */}
          {fuel && (
            <p className="mt-3 text-sm leading-snug text-ink-faint">
              {t('price.freight.explain', {
                diesel: number(fuel.ratePerLiter),
                kmpl: number(fuel.kmPerLitre),
                extra: number(fuel.nonFuelCostPerKm),
              })}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-faint">
            <span className="inline-flex items-center gap-1">
              <Crosshair className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
              {row.geoPrecision === 'market' ? t('price.source.market') : t('price.source.district')}
            </span>
            {row.arrivalDate && (
              <span className="tnum">{t('price.mandis.arrival', { date: shortDate(new Date(row.arrivalDate)) })}</span>
            )}
            {row.minPricePerQuintal && row.maxPricePerQuintal && (
              <span className="tnum">
                {t('price.mandis.range', {
                  min: rate(row.minPricePerQuintal / 100),
                  max: rate(row.maxPricePerQuintal / 100),
                })}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MandiRow;
