import React from 'react';

/**
 * A row of big square choices — role, time slot, crop.
 *
 * Deliberately not a <select> for these. A dropdown is the right control when
 * the list is long or the reader already knows what they want; it is the wrong
 * one when there are three options, each needs an icon to be recognised
 * without reading, and the choice is the entire point of the step. Here all
 * options stay visible and each is a 76px target.
 *
 * Renders as a radiogroup so a screen reader announces "2 of 3", and so arrow
 * keys behave the way they do in every other radio group.
 */
export const ChoiceGrid = ({ label, options, value, onChange, columns = 3, className = '' }) => (
  <div className={className} role="radiogroup" aria-label={label}>
    {label && <p className="field-label">{label}</p>}

    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.id;

        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.id)}
            className={`
              lift flex min-h-[4.75rem] flex-col items-center justify-center gap-1.5
              border-2 px-2 py-3 text-center transition-colors
              ${isActive
                ? 'border-ink bg-forest-700 text-white'
                : 'border-rule bg-white text-ink-soft hover:border-ink'}
            `}
          >
            {Icon && (
              <Icon
                className={`h-6 w-6 shrink-0 ${isActive ? 'text-white' : 'text-ink-faint'}`}
                strokeWidth={2.25}
                aria-hidden="true"
              />
            )}
            <span className={`text-sm leading-tight ${isActive ? 'font-bold' : 'font-semibold'}`}>
              {option.label}
            </span>
            {option.sub && (
              <span className={`text-xs leading-tight ${isActive ? 'text-forest-100' : 'text-ink-faint'}`}>
                {option.sub}
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

export default ChoiceGrid;
