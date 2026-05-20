/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Geist',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
        serif: [
          'Newsreader',
          'Georgia',
          'Times New Roman',
          'serif',
        ],
        mono: [
          'Geist Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      colors: {
        paper: {
          DEFAULT: '#f5efe2',
          2: '#ede5d2',
          3: '#e3d9bf',
        },
        card: {
          DEFAULT: '#fbf7ec',
          warm: '#faf2dc',
        },
        ink: {
          DEFAULT: '#1a140d',
          2: '#3b3022',
          3: '#6b5d47',
        },
        muted: {
          DEFAULT: '#948266',
          2: '#b6a888',
        },
        rule: {
          DEFAULT: '#d9cdb1',
          soft: '#e8dfc7',
        },
        terracotta: {
          DEFAULT: '#c25a3c',
          2: '#a64a30',
        },
        mustard: {
          DEFAULT: '#c98a1f',
          2: '#a87013',
        },
        sage: {
          DEFAULT: '#6f7d4a',
          2: '#586438',
        },
        plum: {
          DEFAULT: '#7c4a64',
          2: '#5e3349',
        },
        rose: '#b23d54',
      },
      boxShadow: {
        sm: '0 1px 0 rgba(60, 40, 20, 0.04), 0 1px 2px rgba(60, 40, 20, 0.06)',
        md: '0 1px 2px rgba(60, 40, 20, 0.06), 0 8px 20px rgba(60, 40, 20, 0.06)',
        lg: '0 1px 2px rgba(60, 40, 20, 0.06), 0 22px 40px rgba(60, 40, 20, 0.10)',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '18px',
        xl: '24px',
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
        pulseDot: {
          '50%': { boxShadow: '0 0 0 7px rgba(194,90,60,0.06)' },
        },
      },
      animation: {
        slideUp: 'slideUp 220ms ease-out',
        pop: 'pop 180ms ease-out',
        pulseDot: 'pulseDot 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
