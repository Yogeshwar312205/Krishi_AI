import React from 'react';
import { useT } from '../../../i18n/useT';

/**
 * The plain-language "why" behind a sell/hold call — a short takeaway, a few
 * supporting lines, one caution. Shared by the Today verdict and the Prices
 * card so the wording never drifts between screens.
 *
 * Written by Gemini from a fixed fact set (`data.explanation`), or assembled
 * from the same rule + model numbers when Gemini is unavailable — in which case
 * a small badge says so, because a fallback must never read as AI output.
 *
 * The type scale is deliberate and does the work the old flat `text-sm`
 * everywhere did not:
 *   summary  — text-lg, the one line a farmer reads
 *   reasons  — text-sm, muted, scannable
 *   caution  — text-xs, faint, present but not competing
 */
export const AdviceExplanation = ({ explanation, combined, forecastHorizon, className = '' }) => {
  const { t } = useT();
  if (!explanation?.available || !explanation.summary) return null;

  const modelPct = combined?.modelAvailable && Number.isFinite(combined.modelChangePct)
    ? `${combined.modelChangePct > 0 ? '+' : ''}${combined.modelChangePct.toFixed(1)}%`
    : null;

  return (
    <div className={className}>
      {explanation.fallback && (
        <p className="mb-1.5 text-[0.6875rem] font-bold uppercase tracking-wide text-ink-faint">
          {t('price.advice.explanationFallback')}
        </p>
      )}

      <p className="font-display text-lg leading-snug text-ink">{explanation.summary}</p>

      {modelPct && (
        <p className="mt-1 text-sm text-ink-soft">
          {t('price.advice.modelCombined', { change: modelPct, count: forecastHorizon || 7 })}
        </p>
      )}

      {explanation.reasons?.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm leading-snug text-ink-soft">
          {explanation.reasons.map((reason, index) => (
            <li key={`${index}-${reason.slice(0, 12)}`} className="flex gap-1.5">
              <span className="text-ink-faint" aria-hidden="true">·</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}

      {explanation.caution && (
        <p className="mt-2 text-xs leading-snug text-ink-faint">{explanation.caution}</p>
      )}
    </div>
  );
};

export default AdviceExplanation;
