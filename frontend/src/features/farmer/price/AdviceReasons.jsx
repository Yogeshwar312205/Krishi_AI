import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useT } from '../../../i18n/useT';

/**
 * The "why" behind a sell/hold call, folded away behind a Read-more link.
 *
 * Shared by the Today verdict slab and the Prices screen's SellAdvice card so
 * the two never disagree — same engine output, same wording. Collapsed by
 * default: the recommendation and the price are the message; the reasoning is
 * there for whoever wants to check it.
 *
 * `reasons` and `working.transcript` are generated per request by the Python
 * engine (they carry today's temperatures and percentages), so they render
 * as-is — the same treatment as government feed strings and mandi names.
 *
 * tone: 'light' on paper/white, 'dark' on the forest slab, 'wait' on turmeric.
 */
const LINK_TONE = {
  light: 'text-forest-700',
  dark: 'text-forest-100',
  wait: 'text-ink',
};

export const AdviceReasons = ({ reasons = [], working = null, tone = 'light' }) => {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  const transcript = working?.transcript || [];
  if (!reasons.length && !transcript.length) return null;

  const link = LINK_TONE[tone] || LINK_TONE.light;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`inline-flex items-center gap-1 text-sm font-bold underline underline-offset-2 ${link}`}
      >
        {open ? t('common.hideDetails') : t('common.showDetails')}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={2.5}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="mt-2 space-y-3">
          {reasons.length > 0 && (
            <div>
              <p className="eyebrow">{t('price.advice.why')}</p>
              <ul className="mt-1 space-y-1 text-sm leading-snug">
                {reasons.map((reason, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span aria-hidden="true">·</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {transcript.length > 0 && (
            <div>
              <p className="eyebrow">{t('price.advice.working')}</p>
              <ol className="mt-1 space-y-1 border-2 border-rule bg-white p-3 text-xs leading-snug text-ink-soft tnum">
                {transcript.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdviceReasons;
