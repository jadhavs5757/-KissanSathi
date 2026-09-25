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
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16'
        },
        earth: {
          50: '#faf6f0',
          100: '#f4ede1',
          200: '#ebd9c3',
          300: '#dfc2a1',
          400: '#ce9f72',
          500: '#c1854f',
          600: '#b26e41',
          700: '#945537',
          800: '#784531',
          900: '#623a2a',
          950: '#351d15'
        },
        amber: {
          500: '#f59e0b',
          600: '#d97706'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        display: ['Outfit', 'Cabinet Grotesk', 'sans-serif']
      }
    },
  },
  plugins: [],
}
