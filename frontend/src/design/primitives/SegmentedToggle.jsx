import React from 'react';

/**
 * One row of mutually exclusive panels.
 *
 * This is how the Price screen absorbs four of the old tabs without becoming a
 * wall: instead of stacking forecast, comparison, demand and profitability down
 * one long scroll, exactly one is on screen and the other two are one tap away.
 * The farmer sees three words, not four screens' worth of data.
 *
 * A segmented control rather than a <select> because with three options the
 * choices and the current state are both visible at once — a dropdown hides two
 * of three behind a tap and shows no sense of what else exists.
 */
export const SegmentedToggle = ({ options, value, onChange, className = '' }) => (
  <div
    role="tablist"
    aria-orientation="horizontal"
    className={`flex border-2 border-ink ${className}`}
  >
    {options.map((option) => {
      const Icon = option.icon;
      const isActive = value === option.id;

      return (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={isActive}
          aria-controls={`panel-${option.id}`}
          onClick={() => onChange(option.id)}
          className={`
            flex flex-1 items-center justify-center gap-2 px-2 py-3 text-sm
            leading-none border-l-2 border-ink first:border-l-0
            transition-colors duration-150
            ${isActive
              ? 'bg-forest-700 font-bold text-white'
              : 'bg-white font-semibold text-ink-soft hover:bg-forest-50'}
          `}
        >
          {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden="true" />}
          <span className="truncate">{option.label}</span>
        </button>
      );
    })}
  </div>
);

export default SegmentedToggle;
