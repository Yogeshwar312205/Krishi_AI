/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    /*
     * Radius scale is REPLACED, not extended.
     *
     * The design language is the painted mandi rate board and the weighbridge
     * docket: square, ruled, official. Overriding the scale at the root means
     * every legacy `rounded-3xl` / `rounded-2xl` across the driver and buyer
     * screens collapses to square without touching those files — one change,
     * consistent everywhere.
     *
     * `full` is deliberately preserved: status dots and avatars are genuinely
     * circular objects, not softened rectangles.
     */
    borderRadius: {
      none: '0',
      DEFAULT: '0',
      sm: '0',
      md: '0',
      lg: '2px',
      xl: '2px',
      '2xl': '3px',
      '3xl': '3px',
      full: '9999px',
    },

    /*
     * Type scale is REPLACED, not extended — for the same reason as the radii,
     * plus one that only shows up in a trilingual app.
     *
     * Tailwind ships every `text-*` size with a hardcoded line-height tuned for
     * Latin. Devanagari sets on a taller body: matras stack above and below the
     * shirorekha, so Latin leading clips them. The old `:lang(hi) body {
     * line-height: 1.65 }` rule could never fix that, because every `text-sm` /
     * `text-2xl` in the app overrode it at a higher specificity — the rule was
     * inert everywhere it mattered.
     *
     * So every step's line-height is a CSS variable instead of a number, and
     * index.css redefines those four variables under :lang(hi) / :lang(mr).
     * One switch, and the whole scale breathes for Devanagari.
     *
     * The four bands, coarsest to finest:
     *   --lh-slab     the rate-board numeral — set as tight as the script allows
     *   --lh-display  headlines
     *   --lh-head     section and card heads
     *   --lh-body     running text and labels
     */
    fontSize: {
      'eyebrow': ['0.6875rem', { lineHeight: 'var(--lh-body)', letterSpacing: '0.12em', fontWeight: '700' }],
      'xs':   ['0.75rem',   { lineHeight: 'var(--lh-body)' }],
      'sm':   ['0.875rem',  { lineHeight: 'var(--lh-body)' }],
      'base': ['1rem',      { lineHeight: 'var(--lh-body)' }],
      'lg':   ['1.125rem',  { lineHeight: 'var(--lh-body)' }],
      'xl':   ['1.3125rem', { lineHeight: 'var(--lh-head)' }],
      '2xl':  ['1.625rem',  { lineHeight: 'var(--lh-head)' }],
      '3xl':  ['2rem',      { lineHeight: 'var(--lh-head)' }],
      '4xl':  ['2.5rem',    { lineHeight: 'var(--lh-display)' }],
      '5xl':  ['3.125rem',  { lineHeight: 'var(--lh-display)' }],
      '6xl':  ['3.75rem',   { lineHeight: 'var(--lh-display)' }],
      // Rate-board scale: the numeral is the hero, the label is small.
      'slab-sm': ['3.25rem', { lineHeight: 'var(--lh-slab)' }],
      'slab':    ['4.5rem',  { lineHeight: 'var(--lh-slab)' }],
    },
    extend: {
      colors: {
        // Near-black with a green cast — the ink of the whole system.
        ink: {
          DEFAULT: '#14251A',
          soft: '#3D4B41',
          // Lightened greys were failing on the paper ground: the old #6B7A70
          // scored 3.82:1 there, under the 4.5:1 floor, on exactly the small
          // bold text (eyebrows, row subtitles) that a farmer reads outdoors.
          faint: '#5F6E63',
        },
        forest: {
          50: '#edf8ef',
          100: '#e4f4e7',
          200: '#c5e8cc',
          300: '#94d5a3',
          400: '#5cbb74',
          500: '#329e4d',
          600: '#228b43',
          700: '#18532B', // authority green — the SELL verdict
          800: '#0f3a1d',
          900: '#0a2713',
          950: '#041409',
        },
        // Turmeric/marigold — the WAIT verdict. Always carries ink text.
        turmeric: {
          50: '#fdf8ec',
          100: '#faedc7',
          200: '#f4d788',
          300: '#EDBF4F',
          400: '#e0a83a',
          500: '#c98d24',
          600: '#a4701c',
        },
        // Warm clay/soil accent — mandi baskets, terracotta pots, tilled earth.
        terracotta: {
          50: '#fdf4ee',
          100: '#fae6d7',
          200: '#f3c8a4',
          300: '#e6a06a',
          400: '#dd8248',
          500: '#C1652D',
          600: '#a44f22',
          700: '#833d1b',
          800: '#5f2c15',
          900: '#3f1d0f',
        },
        // Document surfaces.
        paper: '#EFECE1',   // page ground — warm manila
        surface: '#FFFFFF', // data sits on white for maximum sunlight contrast
        rule: {
          DEFAULT: '#C9C4B4', // hairline ledger rule
          strong: '#14251A',  // heavy rule under a section head
        },
      },
      fontFamily: {
        /*
         * Two Devanagari-native families, both with matching Latin.
         *
         * Khand (Indian Type Foundry) is condensed signage — it carries the
         * numerals and headlines. Mukta (Ek Type) sets everything else,
         * INCLUDING English: in a trilingual app the Latin should belong to the
         * same family as the Devanagari, not the other way round.
         */
        display: ['"Khand"', '"Noto Sans Devanagari"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Mukta"', '"Noto Sans Devanagari"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      /*
       * The explicit leading utilities get the same treatment as the scale.
       *
       * `leading-none` is used all over this UI — nav labels, segmented tabs,
       * ledger values — because tight type is what makes a ruled row read as a
       * ruled row. In Devanagari a line-height of exactly 1 clips the matras off
       * the top of the line, so every one of those call sites was quietly broken
       * in two of the app's three languages. Routing through variables fixes all
       * of them at once and leaves the English rendering untouched.
       */
      lineHeight: {
        none: 'var(--lh-none)',
        tight: 'var(--lh-tight)',
        snug: 'var(--lh-snug)',
        normal: 'var(--lh-normal)',
      },
      spacing: {
        // Minimum comfortable touch target for a farmer in the field.
        'tap': '3.5rem', // 56px
      },
    },
  },
  plugins: [],
}
