import type { AccentColor, FontSize } from '@/stores/useAppearanceStore';

export const UI_THEMES = [
  'gunmetal',
  'cobalt',
  'hangar',
  'olive-steel',
  'petrol',
  'field',
  'slate',
  'violet',
  'burgundy',
  'copper',
  'neon',
  'tactical',
  'minimal',
] as const;

/** The skin new and reset profiles start on; `:root` in globals.css carries its tokens. */
export const DEFAULT_UI_THEME = 'gunmetal';

/**
 * Retired theme ids mapped to their replacement, so a saved choice survives a
 * rename instead of failing validation. `default` was Midnight blue, the
 * default skin until Gunmetal replaced it.
 */
export const LEGACY_UI_THEMES: Readonly<Record<string, string>> = {
  default: DEFAULT_UI_THEME,
};

/**
 * Accent color CSS variable mappings
 */
export const ACCENT_COLOR_CSS: Record<
  AccentColor,
  { primary: string; hover: string; muted: string }
> = {
  amber: {
    primary: '#fbbf24',
    hover: '#f59e0b',
    muted: 'rgba(251, 191, 36, 0.15)',
  },
  cyan: {
    primary: '#67e8f9',
    hover: '#22d3ee',
    muted: 'rgba(103, 232, 249, 0.15)',
  },
  emerald: {
    primary: '#6ee7b7',
    hover: '#34d399',
    muted: 'rgba(110, 231, 183, 0.15)',
  },
  rose: {
    primary: '#fecdd3',
    hover: '#fb7185',
    muted: 'rgba(254, 205, 211, 0.15)',
  },
  violet: {
    primary: '#ddd6fe',
    hover: '#a78bfa',
    muted: 'rgba(221, 214, 254, 0.15)',
  },
  blue: {
    primary: '#93c5fd',
    hover: '#60a5fa',
    muted: 'rgba(147, 197, 253, 0.15)',
  },
};

/**
 * Font size CSS mappings
 */
export const FONT_SIZE_CSS: Record<FontSize, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
};
