import React from 'react';
import { CloudRain, Sun, Scale } from 'lucide-react';
import { useT } from '../../../i18n/useT';
import { useSellAdvice } from '../../../data/sellAdvice';
import { AdviceReasons } from './AdviceReasons';
import { AdviceExplanation } from './AdviceExplanation';

/**
 * "Sell now or wait?" — the decision this whole screen exists to support,
 * pulled out of the tabs so it is the first thing under the headline rate.
 *
 * Same source as the Today verdict (see useSellAdvice), so the two screens
 * agree. The call is the rule-based scorer (weather + price momentum), softened
 * — never overridden — by the trained model when it disagrees by more than 5%.
 * A short Gemini explanation sits under the headline.
 *
 * Reading order is set by type size, not by position:
 *   eyebrow → recommendation (display 3xl) → one-line takeaway (lg)
 *   → the ₹ figures → the two signals → folded working → provenance (xs)
 */

const REC_STYLE = {
  SELL_NOW: { box: 'border-forest-700 bg-forest-50', accent: 'text-forest-700' },
  SELL_SOON: { box: 'border-forest-600 bg-forest-50', accent: 'text-forest-700' },
  HOLD: { box: 'border-turmeric-400 bg-turmeric-50', accent: 'text-turmeric-600' },
  HOLD_STRONG: { box: 'border-turmeric-600 bg-turmeric-100', accent: 'text-turmeric-600' },
};

const Shell = ({ children }) => (
  <div className="border-2 border-ink bg-white px-4 py-3.5">{children}</div>
);

export const SellAdvice = ({ cropType, baselineRate }) => {
  const { t, rate, lang } = useT();
  const { status, data } = useSellAdvice(cropType, baselineRate, true, lang);

  if (status === 'loading') {
    return (
      <Shell>
        <p className="eyebrow">{t('price.advice.title')}</p>
        <p className="mt-1.5 text-sm text-ink-faint">{t('price.advice.checking')}</p>
      </Shell>
    );
  }

  // Engine unreachable, or reached but nothing to score (no live rates today).
  if (!data?.advice) {
    return (
      <Shell>
        <p className="eyebrow">{t('price.advice.title')}</p>
        <p className="mt-1.5 text-sm text-ink-faint">{t('price.advice.offline')}</p>
      </Shell>
    );
  }

  const a = data.advice;
  const combined = data.decision;
  const rec = combined?.recommendation || a.recommendation;
  const style = REC_STYLE[rec] || REC_STYLE.HOLD;
  const wx = a.weatherRisk || {};
  const hasExplanation = data.explanation?.available && data.explanation.summary;

  const pct = a.contextAdjustmentPct || 0;
  const changeLine =
    Math.abs(pct) < 0.5
      ? t('price.advice.changeFlat')
      : pct > 0
        ? t('price.advice.changeUp', { pct: `${Math.abs(pct).toFixed(1)}%` })
        : t('price.advice.changeDown', { pct: `${Math.abs(pct).toFixed(1)}%` });

  return (
    <div className={`detail-enter border-2 ${style.box} px-4 py-4`}>
      {/* ── 1. verdict ─────────────────────────────────────────────── */}
      <p className="eyebrow">{t('price.advice.title')}</p>
      <p className={`mt-1 font-display text-3xl leading-none ${style.accent}`}>
        {t(`price.advice.rec.${rec}`)}
      </p>

      {/* ── 2. one-line takeaway: the explanation when we have one, else
             the canned sentence for this recommendation ─────────────── */}
      {hasExplanation ? (
        <AdviceExplanation
          explanation={data.explanation}
          combined={combined}
          forecastHorizon={data.forecast?.horizonPeriods}
          className="mt-2"
        />
      ) : (
        <p className="mt-1.5 text-lg leading-snug text-ink">{t(`price.advice.recText.${rec}`)}</p>
      )}

      {/* ── 3. the numbers ────────────────────────────────────────── */}
      <dl className="mt-4 border-t-2 border-ink pt-3 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-soft">{t('price.advice.baseline')}</dt>
          <dd className="tnum text-ink-soft">{rate(a.baselinePricePerKg)}</dd>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <dt className="font-bold text-ink">{t('price.advice.adjusted')}</dt>
          <dd className={`shrink-0 font-display text-2xl leading-none tnum ${style.accent}`}>
            {rate(a.contextAdjustedPricePerKg)}
          </dd>
        </div>
        <p className="mt-1 text-xs text-ink-faint">{changeLine}</p>
      </dl>

      {/* ── 4. the two signals ───────────────────────────────────── */}
      <div className="mt-3 space-y-1.5 border-t-2 border-ink pt-3">
        <div className="flex items-start gap-2">
          {wx.available ? (
            <CloudRain className="mt-0.5 h-4 w-4 shrink-0 text-terracotta-600" strokeWidth={2.25} aria-hidden="true" />
          ) : (
            <Sun className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" strokeWidth={2.25} aria-hidden="true" />
          )}
          <p className="min-w-0 text-sm text-ink">
            <span className="font-semibold">{t('price.advice.weather')}</span>
            {wx.available ? (
              <span className="ml-1.5 tnum text-ink-soft">
                {t('price.advice.score', { n: Math.round(wx.score) })}
              </span>
            ) : (
              <span className="block text-xs text-ink-faint">{t('price.advice.weatherNa')}</span>
            )}
          </p>
        </div>

        <div className="flex items-start gap-2">
          <Scale className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" strokeWidth={2.25} aria-hidden="true" />
          <p className="min-w-0 text-sm text-ink">
            <span className="font-semibold">{t('price.advice.market')}</span>
            {a.marketPressure == null && (
              <span className="block text-xs text-ink-faint">{t('price.advice.marketNa')}</span>
            )}
          </p>
        </div>
      </div>

      {/* ── 5. the full working, folded away ─────────────────────── */}
      <div className="mt-1 border-t-2 border-ink pt-2 text-ink">
        <AdviceReasons reasons={a.reasons} working={a.working} tone="light" />
      </div>

      {/* ── 6. provenance, smallest ──────────────────────────────── */}
      <p className="mt-3 text-xs leading-snug text-ink-faint">
        {t('price.advice.sure')}:{' '}
        <span className="tnum font-semibold text-ink-soft">
          {Math.round((a.confidence || 0) * 100)}%
        </span>
        {a.sources?.length > 0 && (
          <> · {t('price.advice.sources', { list: a.sources.join(' · ') })}</>
        )}
      </p>
    </div>
  );
};

export default SellAdvice;
