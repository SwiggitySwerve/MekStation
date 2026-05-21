/**
 * Tactical Settings Store
 *
 * User-facing settings for the tactical HUD shell: minimap size, tooltip delay,
 * panel density, auto-cycle, quick movement/combat animation, reduced motion,
 * and high contrast.
 *
 * Persisted to localStorage under the key `tactical-settings:v1`. The store
 * follows the project's Zod-validated persist pattern (see
 * `src/stores/utils/zodPersistMerge.ts`): a corrupt or stale payload is
 * discarded and replaced with defaults rather than crashing the app.
 *
 * Media-query auto-defaults:
 *   - `reducedMotion` initialises from `prefers-reduced-motion: reduce`
 *   - `highContrast`  initialises from `prefers-contrast: more`
 *
 * Wiring to `useTacticalViewport`:
 *   - `panelDensity` can be passed as the `densityOverride` arg so the
 *     viewport hook uses the user's explicit preference instead of the
 *     breakpoint default.
 *
 * @spec openspec/changes/add-responsive-tactical-hud-accessibility/specs/mobile-interaction-patterns/spec.md
 *   "Tactical UI Settings" ADDED requirement — §2.2
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  TacticalSettingsPersistedSchema,
  type TacticalSettingsPersisted,
} from '@/stores/utils/persistedStoreSchemas';
import { createZodPersistMerge } from '@/stores/utils/zodPersistMerge';

export type { TacticalSettingsPersisted };

// =============================================================================
// Setting value types
// =============================================================================

/** Minimap cluster size — maps to CSS size tokens in the minimap-cluster slot. */
export type MinimapSize = 'small' | 'medium' | 'large';

/** Panel density — propagated to useTacticalViewport as densityOverride. */
export type TacticalPanelDensity = 'compact' | 'standard' | 'comfortable';

// =============================================================================
// Store state interface
// =============================================================================

export interface TacticalSettingsState {
  // ---- Persisted settings --------------------------------------------------

  /** Minimap cluster size. Defaults to 'medium'. */
  minimapSize: MinimapSize;
  /**
   * Delay in ms before tooltips appear on hover. Defaults to 400 ms.
   * Range: 0 (instant) – 5000 ms.
   */
  tooltipDelay: number;
  /**
   * Panel density controlling padding and gap between shell regions.
   * When set, overrides the breakpoint default in `useTacticalViewport`.
   * Defaults to 'standard'.
   */
  panelDensity: TacticalPanelDensity;
  /**
   * Automatically advance focus to the next unit with a pending action
   * when the current unit's action resolves. Defaults to false.
   */
  autoCycleActiveUnit: boolean;
  /**
   * Replace movement animations with instant state transitions.
   * Defaults to false; overridden to true when `reducedMotion` is true.
   */
  quickMovement: boolean;
  /**
   * Replace weapon-fire and impact animations with instant state transitions.
   * Defaults to false; overridden to true when `reducedMotion` is true.
   */
  quickCombat: boolean;
  /**
   * Disable all movement-heavy animations and use immediate state changes or
   * low-motion fades instead. Auto-initialised from `prefers-reduced-motion`.
   */
  reducedMotion: boolean;
  /**
   * Enable high-contrast tactical overlays and command states.
   * Auto-initialised from `prefers-contrast: more`.
   */
  highContrast: boolean;

  // ---- Actions -------------------------------------------------------------

  setMinimapSize: (size: MinimapSize) => void;
  setTooltipDelay: (ms: number) => void;
  setPanelDensity: (density: TacticalPanelDensity) => void;
  setAutoCycleActiveUnit: (enabled: boolean) => void;
  setQuickMovement: (enabled: boolean) => void;
  setQuickCombat: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;

  /** Reset all settings to their computed defaults. */
  resetToDefaults: () => void;
}

/** Keys that are action functions, not state — used to type the defaults object. */
type ActionKeys =
  | 'setMinimapSize'
  | 'setTooltipDelay'
  | 'setPanelDensity'
  | 'setAutoCycleActiveUnit'
  | 'setQuickMovement'
  | 'setQuickCombat'
  | 'setReducedMotion'
  | 'setHighContrast'
  | 'resetToDefaults';

// =============================================================================
// Media-query defaults (read once at module init — SSR-safe)
// =============================================================================

/**
 * Read `prefers-reduced-motion: reduce` at store creation time.
 * Returns false during SSR where `window` is unavailable.
 */
function readPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Read `prefers-contrast: more` at store creation time.
 * Returns false during SSR where `window` is unavailable.
 */
function readPrefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: more)').matches;
}

// =============================================================================
// Default state
// =============================================================================

/**
 * Compute the default state. Called once on module load so media-query defaults
 * are baked into the initial state before the persist middleware rehydrates.
 */
function buildDefaults(): Omit<TacticalSettingsState, ActionKeys> {
  const reducedMotion = readPrefersReducedMotion();
  const highContrast = readPrefersHighContrast();
  return {
    minimapSize: 'medium',
    tooltipDelay: 400,
    panelDensity: 'standard',
    autoCycleActiveUnit: false,
    // When reducedMotion is on, quickMovement + quickCombat default to true
    // so every animation surface is suppressed without requiring the user to
    // toggle three separate settings.
    quickMovement: reducedMotion,
    quickCombat: reducedMotion,
    reducedMotion,
    highContrast,
  };
}

const DEFAULT_TACTICAL_SETTINGS = buildDefaults();

// =============================================================================
// Store
// =============================================================================

const STORE_KEY = 'tactical-settings:v1';

/**
 * Zustand store for tactical HUD user settings with localStorage persistence.
 *
 * Usage:
 *   const { minimapSize, setMinimapSize } = useTacticalSettingsStore();
 *
 * To wire density into the viewport hook:
 *   const { panelDensity } = useTacticalSettingsStore();
 *   const profile = useTacticalViewport(panelDensity);
 */
export const useTacticalSettingsStore = create<TacticalSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_TACTICAL_SETTINGS,

      setMinimapSize: (size) => set({ minimapSize: size }),
      setTooltipDelay: (ms) => set({ tooltipDelay: ms }),
      setPanelDensity: (density) => set({ panelDensity: density }),
      setAutoCycleActiveUnit: (enabled) =>
        set({ autoCycleActiveUnit: enabled }),
      setQuickMovement: (enabled) => set({ quickMovement: enabled }),
      setQuickCombat: (enabled) => set({ quickCombat: enabled }),
      setReducedMotion: (enabled) =>
        set({
          reducedMotion: enabled,
          // Enabling reducedMotion also enables quickMovement + quickCombat so
          // consumers only need to check one flag for animation suppression.
          ...(enabled ? { quickMovement: true, quickCombat: true } : {}),
        }),
      setHighContrast: (enabled) => set({ highContrast: enabled }),

      resetToDefaults: () => set({ ...DEFAULT_TACTICAL_SETTINGS }),
    }),
    {
      name: STORE_KEY,
      // Validate the rehydrated localStorage payload against the Zod schema.
      // A corrupt or outdated payload is discarded; the store keeps defaults.
      merge: createZodPersistMerge<TacticalSettingsState>(
        TacticalSettingsPersistedSchema,
        STORE_KEY,
      ),
    },
  ),
);
