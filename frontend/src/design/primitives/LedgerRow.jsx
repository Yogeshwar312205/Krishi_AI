import React from 'react';

/**
 * One ruled row of a ledger: label on the left, value on the right, hairline
 * beneath. Replaces the four-across rounded card grid.
 *
 * A ruled column is easier to scan than a grid of cards because the values
 * line up vertically — which is the entire point when the reader is comparing
 * eight mandis to find the biggest number.
 */
export const LedgerRow = ({
  label,
  value,
  sub,
  emphasis = false,
  marker,
  onClick,
  className = '',
}) => {
  const Element = onClick ? 'button' : 'div';

  return (
    <Element
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`
        w-full text-left flex items-center gap-3 py-3.5 px-4 -mx-4 rule-hair
        ${onClick ? 'active:bg-forest-50' : ''}
        ${emphasis ? 'bg-forest-50' : ''}
        ${className}
      `}
    >
      {marker && <div className="shrink-0">{marker}</div>}

      <div className="min-w-0 flex-1">
        <div className={`leading-tight truncate ${emphasis ? 'font-bold text-ink' : 'text-ink'}`}>
          {label}
        </div>
        {sub && <div className="text-sm text-ink-faint leading-tight mt-0.5">{sub}</div>}
      </div>

      <div className="shrink-0 text-right">
        <div className={`font-display tnum leading-none ${emphasis ? 'text-3xl text-forest-700' : 'text-2xl text-ink'}`}>
          {value}
        </div>
      </div>
    </Element>
  );
};

export default LedgerRow;
