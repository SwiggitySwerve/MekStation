import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          base: 'var(--surface-base)',
          panel: 'var(--surface-panel)',
          sunken: 'var(--surface-sunken)',
          overlay: 'var(--surface-overlay)',
          border: 'var(--surface-border)',
          glow: 'var(--surface-glow)',
        },
        accent: {
          primary: 'var(--accent-primary)',
          primaryHover: 'var(--accent-primary-hover)',
          secondary: 'var(--accent-secondary)',
          secondaryHover: 'var(--accent-secondary-hover)',
        },
        status: {
          success: 'var(--status-success)',
          warning: 'var(--status-warning)',
          danger: 'var(--status-danger)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          placeholder: 'var(--text-placeholder)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        strong: 'var(--shadow-strong)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        pill: '999px',
      },
      animation: {
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.65' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
