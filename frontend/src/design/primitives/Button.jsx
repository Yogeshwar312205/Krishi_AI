import React from 'react';

/**
 * Square slab button, 56px minimum height.
 *
 * Full-width is the default rather than the exception: on a phone held in one
 * hand, a wide target is a forgiving target, and a farmer may be tapping with
 * dry or gloved fingers. Icons are required on primary actions — the label
 * carries the meaning, the icon makes it findable without reading.
 */
const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  accent: 'btn-accent',
};

export const Button = ({
  variant = 'primary',
  icon: Icon,
  /* Set while an action is in flight — spins the icon and blocks a second tap. */
  busy = false,
  children,
  full = true,
  className = '',
  ...props
}) => (
  <button
    type="button"
    disabled={busy}
    className={`btn ${VARIANTS[variant] || VARIANTS.primary} ${full ? 'w-full' : ''} ${busy ? 'opacity-70' : ''} ${className}`}
    {...props}
  >
    {Icon && (
      <Icon
        className={`h-6 w-6 shrink-0 ${busy ? 'animate-spin' : ''}`}
        strokeWidth={2.25}
        aria-hidden="true"
      />
    )}
    <span>{children}</span>
  </button>
);

export default Button;
