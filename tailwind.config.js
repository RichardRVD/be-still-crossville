/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          heron: '#0E2A47',
          water: '#6AAED9',
          hills: '#3E7C79',
        },
        background: '#F7FAFC',
        foreground: '#0B1522',
      },
      fontFamily: {
        sans: ['ui-sans-serif','system-ui','Segoe UI','Roboto','Helvetica','Arial','Apple Color Emoji','Segoe UI Emoji'],
      },
      boxShadow: {
        soft: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
      }
    },
  },
  plugins: [],
}
