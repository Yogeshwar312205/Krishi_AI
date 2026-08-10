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
        }
      },
      backgroundImage: {
        'dot-pattern': "radial-gradient(#18532B 0.75px, transparent 0.75px)",
      }
    },
  },
  plugins: [],
}
