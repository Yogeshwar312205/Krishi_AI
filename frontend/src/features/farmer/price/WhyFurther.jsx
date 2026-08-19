import React from 'react';
import { Route, TrendingUp } from 'lucide-react';
import { useT } from '../../../i18n/useT';
import { mandiLabel } from '../../../data/useLiveMarket';

/**
 * The argument, spelled out.
 *
 * "The nearest mandi isn't always the one that pays" is the landing page's
 * promise; this is where it has to be proved, for this farmer's crop, this
 * weight and this farm. The comparison is deliberately against the *nearest*
 * mandi rather than the runner-up, because the nearest one is what the farmer
 * would have done anyway — so the difference against it is the actual gain
 * from using the app, not an abstract spread between two distant markets.
 *
 * When the nearest mandi is also the best-paying one, this says so plainly
 * instead of hiding. A tool that only speaks up when it has something to sell
 * is not one you would trust with the harvest.
 */
export const WhyFurther = ({ advantage, comparison }) => {
  const { t, money, rate, number } = useT();

  if (!advantage) {
    const nearest = comparison?.[0];
    return (
      <div className="border-2 border-ink bg-white px-4 py-3.5">
        <p className="eyebrow">{t('price.why.title')}</p>
        <p className="mt-1.5 leading-snug text-ink">
          {t('price.why.nearestWins', { mandi: nearest ? mandiLabel(t, nearest) : '' })}
        </p>
      </div>
    );
  }

  const { best, nearest, extraKm, extraFreight, rateGap, grossGain, netGain } = advantage;

  // A farther mandi that pays less overall is possible and is not hidden: the
  // panel flips to say "stay near" rather than quietly reordering the argument.
  const worthGoing = netGain > 0;

  return (
    <div className={`border-2 px-4 py-4 ${worthGoing ? 'border-forest-700 bg-forest-50' : 'border-ink bg-white'}`}>
      <p className="eyebrow flex items-center gap-1.5">
        <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
        {t('price.why.title')}
      </p>

      <p className="mt-2 text-lg leading-snug text-ink">
        {t('price.why.headline', {
          best: mandiLabel(t, best),
          near: mandiLabel(t, nearest),
          km: number(extraKm),
        })}
      </p>

      {/* The trade as two opposed numbers, so it reads as a decision and not
          as a conclusion handed down. */}
      <dl className="mt-3.5 space-y-2 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-ink-soft">
            <Route className="h-4 w-4 shrink-0 text-terracotta-600" strokeWidth={2.25} aria-hidden="true" />
            {t('price.why.extraTruck', { km: number(extraKm) })}
          </dt>
          <dd className="shrink-0 font-semibold tnum text-terracotta-600">− {money(Math.abs(extraFreight))}</dd>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <dt className="flex items-center gap-1.5 text-ink-soft">
            <TrendingUp className="h-4 w-4 shrink-0 text-forest-700" strokeWidth={2.25} aria-hidden="true" />
            {t('price.why.higherRate', { amount: rate(Math.abs(rateGap)) })}
          </dt>
          <dd className="shrink-0 font-semibold tnum text-forest-700">+ {money(Math.abs(grossGain))}</dd>
        </div>

        <div className="flex items-baseline justify-between gap-3 border-t-2 border-ink pt-2">
          <dt className="font-bold text-ink">
            {worthGoing ? t('price.why.youKeepMore') : t('price.why.youKeepLess')}
          </dt>
          <dd className={`shrink-0 font-display text-2xl leading-none tnum ${worthGoing ? 'text-forest-700' : 'text-terracotta-600'}`}>
            {worthGoing ? '+' : '−'} {money(Math.abs(netGain))}
          </dd>
        </div>
      </dl>
    </div>
  );
};

export default WhyFurther;
