/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#edf8ef',
          100: '#e4f4e7',
          200: '#c5e8cc',
          300: '#94d5a3',
          400: '#5cbb74',
          500: '#329e4d',
          600: '#228b43',
          700: '#18532B', // Main dark forest green from screenshot
          800: '#0f3a1d',
          900: '#0a2713',
          950: '#041409',
        },
        mint: {
          50: '#f6fbf7',
          100: '#eaf6ed',
          200: '#d5edd9',
          300: '#b4deb9',
        },
        // Warm clay/soil accent — Indian mandi baskets, terracotta pots, tilled earth.
        terracotta: {
          50: '#fdf4ee',
          100: '#faE6d7',
          200: '#f3c8a4',
          300: '#e6a06a',
          400: '#dd8248',
          500: '#c1652d',
          600: '#a44f22',
          700: '#833d1b',
          800: '#5f2c15',
          900: '#3f1d0f',
        },
        // Turmeric/marigold highlight — festive, used sparingly for featured/best-value cues.
        turmeric: {
          50: '#fdf8ec',
          100: '#faedc7',
          200: '#f4d788',
          300: '#edbf4f',
          400: '#e0a83a',
          500: '#c98d24',
          600: '#a4701c',
        }
      },
      fontFamily: {
        // Devanagari faces trail the Latin ones: browsers fall through per-glyph,
        // so Hindi/Marathi text picks them up without any conditional classes.
        display: ['"Fraunces"', '"Tiro Devanagari Hindi"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '"Mukta"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'dot-pattern': "radial-gradient(#18532B 0.75px, transparent 0.75px)",
      }
    },
  },
  plugins: [],
}
