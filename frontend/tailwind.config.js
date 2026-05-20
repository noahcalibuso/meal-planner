/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        display: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        canvas: {
          DEFAULT: '#fafaf7',
          card: '#ffffff',
          subtle: '#f3f2ed',
          ink: '#13121a',
        },
        brand: {
          50: '#f3f7ee',
          100: '#e3edd6',
          200: '#cadcb0',
          300: '#a8c682',
          400: '#85ad57',
          500: '#669440',
          600: '#4f7831',
          700: '#3f5e29',
          800: '#354c25',
          900: '#2c3f20',
        },
        accent: {
          coral: '#ef6f5b',
          amber: '#f5a623',
          plum: '#7c3aed',
          sky: '#0ea5e9',
          rose: '#e11d48',
        },
        macro: {
          cal: '#13121a',
          protein: '#ef6f5b',
          carbs: '#f5a623',
          fat: '#7c3aed',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(15,15,20,0.04)',
        cardHover: '0 2px 4px rgba(0,0,0,0.04), 0 12px 24px rgba(15,15,20,0.07)',
        ring: '0 0 0 1px rgba(15,15,20,0.06)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          from: { transform: 'scale(0.96)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        slideUp: 'slideUp 220ms ease-out',
        pop: 'pop 180ms ease-out',
      },
    },
  },
  plugins: [],
};
