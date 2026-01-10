import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
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
      },
    },
  },
  plugins: [],
}
export default config
