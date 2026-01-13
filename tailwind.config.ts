import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './.storybook/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // Touch target sizing (44px minimum per iOS/Android guidelines)
      minWidth: {
        'touch': '44px',
      },
      minHeight: {
        'touch': '44px',
      },
      spacing: {
        'touch': '44px',
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        // Global theme surface colors (backgrounds)
        surface: {
          deep: 'var(--surface-deep)',
          base: 'var(--surface-base)',
          raised: 'var(--surface-raised)',
        },

        // Global theme accent colors
        accent: {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)',
        },

        // Global theme text colors
        'text-theme': {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },

        // Global theme border colors
        'border-theme': {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },

        // System component slot colors
        slot: {
          engine: 'rgb(234 88 12)',      // orange-600
          gyro: 'rgb(147 51 234)',       // purple-600
          actuator: 'rgb(37 99 235)',    // blue-600
          cockpit: 'rgb(202 138 4)',     // yellow-600
          empty: 'rgb(75 85 99)',        // gray-600
        },
        
        // Equipment type colors
        equipment: {
          weapon: 'rgb(185 28 28)',      // red-700
          ammo: 'rgb(194 65 12)',        // orange-700
          heatsink: 'rgb(14 116 144)',   // cyan-700
          electronics: 'rgb(29 78 216)', // blue-700
          misc: 'rgb(51 65 85)',         // slate-700
        },
        
        // Tech base accent colors
        tech: {
          is: 'rgb(96 165 250)',         // blue-400 (Inner Sphere)
          clan: 'rgb(74 222 128)',       // green-400 (Clan)
          mixed: 'rgb(192 132 252)',     // purple-400 (Mixed)
        },
        
        // Validation status colors
        validation: {
          valid: 'rgb(34 197 94)',       // green-500
          warning: 'rgb(234 179 8)',     // yellow-500
          error: 'rgb(239 68 68)',       // red-500
        },

        // Armor diagram status colors
        armor: {
          healthy: 'rgb(34 197 94)',       // green-500
          moderate: 'rgb(245 158 11)',     // amber-500
          low: 'rgb(249 115 22)',          // orange-500
          critical: 'rgb(239 68 68)',      // red-500
          selected: 'rgb(59 130 246)',     // blue-500
          'selected-stroke': 'rgb(96 165 250)', // blue-400
        },

        // UI accent color variants (centralized from scattered local definitions)
        ui: {
          accent: {
            amber: 'rgb(245 158 11)',      // amber-500
            cyan: 'rgb(6 182 212)',        // cyan-500
            emerald: 'rgb(16 185 129)',    // emerald-500
            violet: 'rgb(139 92 246)',     // violet-500
            rose: 'rgb(244 63 94)',        // rose-500
            blue: 'rgb(59 130 246)',       // blue-500
          },
        },
      },
    },
  },
  plugins: [],
}
export default config
