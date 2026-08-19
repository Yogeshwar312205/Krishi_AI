import React from 'react';

/**
 * The signature element: a full-bleed painted rate board.
 *
 * Deliberately breaks out of the page gutter and carries no radius, no shadow,
 * and no border — it is a painted surface, not a card. Colour alone answers
 * the question before any word is read, and the two tones differ in lightness
 * as well as hue so they stay distinguishable under colour-blindness:
 *
 *   go   — dark forest ground, white text   (sell / act now)
 *   wait — light turmeric ground, ink text  (hold / do nothing yet)
 */
const TONES = {
  go: {
    surface: 'bg-forest-700 text-white',
    label: 'text-forest-200',
    sub: 'text-forest-100',
  },
  wait: {
    surface: 'bg-turmeric-300 text-ink',
    label: 'text-ink-soft',
    sub: 'text-ink-soft',
  },
};

export const Slab = ({ tone = 'go', label, headline, children, className = '' }) => {
  const palette = TONES[tone] || TONES.go;

  return (
    <section
      /*
       * Negative margins cancel the page gutter so the slab reaches both screen
       * edges on a phone, the way a board fills a wall. `w-screen` is avoided:
       * it overflows when a scrollbar is present on desktop.
       */
      className={`slab-enter slab-paint -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 py-7 sm:py-9 ${palette.surface} ${className}`}
    >
      {label && (
        <p className={`eyebrow mb-3 ${palette.label}`}>{label}</p>
      )}

      {headline && (
        <h1 className="font-display text-slab-sm sm:text-slab">{headline}</h1>
      )}

      {children}
    </section>
  );
};

export default Slab;
