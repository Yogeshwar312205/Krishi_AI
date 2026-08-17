import React, { useId } from 'react';

/**
 * A labelled entry box, in the docket geometry: square, 2px ink border, the
 * same 56px height as a Button so a form column keeps one rhythm.
 *
 * The label is a real <label> bound by id rather than placeholder text. A
 * placeholder disappears the moment someone starts typing, which is precisely
 * when a user who reads slowly needs to check what the box was asking for.
 *
 * `hint` sits BELOW the field, not above: it is for the answer to "what happens
 * if I fill this in", which nobody asks until they are already looking at it.
 */
export const Field = ({
  label,
  icon: Icon,
  hint,
  className = '',
  id,
  ...inputProps
}) => {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const hintId = hint ? `${fieldId}-hint` : undefined;

  return (
    <div className={className}>
      <label className="field-label" htmlFor={fieldId}>{label}</label>

      <div className="relative flex items-center">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3.5 h-5 w-5 text-ink-faint"
            strokeWidth={2.25}
            aria-hidden="true"
          />
        )}
        <input
          id={fieldId}
          aria-describedby={hintId}
          className={`field ${Icon ? 'field-icon' : ''}`}
          {...inputProps}
        />
      </div>

      {hint && (
        <p id={hintId} className="mt-1.5 text-sm text-ink-faint">{hint}</p>
      )}
    </div>
  );
};

export default Field;
