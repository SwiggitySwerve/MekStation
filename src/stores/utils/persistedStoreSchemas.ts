/**
 * Zod schemas for persisted (`localStorage`) store payloads.
 *
 * Each schema describes the *partialized* shape a store writes to
 * `localStorage` — i.e. the `persist` config's persisted fields, not the
 * store's full state-plus-actions interface. `localStorage` is an I/O
 * boundary; per the `validation-patterns` spec these schemas are the
 * single source of truth for the boundary shape and the boundary type is
 * `z.infer` of the schema (see the exported `*Persisted` types below).
 *
 * Scope — the settings stores with small, flat persisted shapes:
 *   - theme preference
 *   - accessibility
 *   - appearance
 *   - UI behavior
 *   - customizer settings
 *
 * The larger domain stores (campaign, vehicle, multi-unit, …) persist
 * deeply nested state; schema-ifying those is deferred to avoid the
 * over-strict-schema footgun (a hand-authored nested schema that rejects
 * a valid payload). See the change's `tasks.md` for the deferral note.
 *
 * Convention: new backward-compatible fields use `.optional()`, never
 * `.default()` — `.default()` makes a field required in the inferred
 * *input* type and would reject older payloads written before the field
 * existed.
 *
 * @see openspec/specs/validation-patterns/spec.md
 * @see src/stores/utils/zodPersistMerge.ts
 */

import { z } from 'zod';

// =============================================================================
// theme-preference  (useThemeStore)
// =============================================================================

/** Persisted shape of `useThemeStore` — see `IThemeState`. */
export const ThemePersistedSchema = z.object({
  theme: z.enum(['light', 'dark']),
});
export type ThemePersisted = z.infer<typeof ThemePersistedSchema>;

// =============================================================================
// mekstation-accessibility  (useAccessibilityStore)
// =============================================================================

/** Persisted shape of `useAccessibilityStore` — see `AccessibilityState`. */
export const AccessibilityPersistedSchema = z.object({
  highContrast: z.boolean(),
  reduceMotion: z.boolean(),
});
export type AccessibilityPersisted = z.infer<
  typeof AccessibilityPersistedSchema
>;

// =============================================================================
// mekstation-appearance  (useAppearanceStore — partialized)
// =============================================================================

/** Persisted shape of `useAppearanceStore` — the `partialize` subset. */
export const AppearancePersistedSchema = z.object({
  accentColor: z.enum(['amber', 'cyan', 'emerald', 'rose', 'violet', 'blue']),
  fontSize: z.enum(['small', 'medium', 'large']),
  animationLevel: z.enum(['full', 'reduced', 'none']),
  compactMode: z.boolean(),
  uiTheme: z.enum(['default', 'neon', 'tactical', 'minimal']),
});
export type AppearancePersisted = z.infer<typeof AppearancePersistedSchema>;

// =============================================================================
// mekstation-ui-behavior  (useUIBehaviorStore)
// =============================================================================

/** Persisted shape of `useUIBehaviorStore` — see `UIBehaviorState`. */
export const UIBehaviorPersistedSchema = z.object({
  sidebarDefaultCollapsed: z.boolean(),
  confirmOnClose: z.boolean(),
  showTooltips: z.boolean(),
});
export type UIBehaviorPersisted = z.infer<typeof UIBehaviorPersistedSchema>;

// =============================================================================
// mekstation-customizer-settings  (useCustomizerSettingsStore — partialized)
// =============================================================================

// =============================================================================
// tactical-settings:v1  (useTacticalSettingsStore)
// =============================================================================

/**
 * Persisted shape of `useTacticalSettingsStore`.
 *
 * All fields are optional so payloads written before a new field was added are
 * accepted and merged with defaults rather than discarded entirely.
 */
export const TacticalSettingsPersistedSchema = z.object({
  minimapSize: z.enum(['small', 'medium', 'large']).optional(),
  tooltipDelay: z.number().int().min(0).max(5000).optional(),
  panelDensity: z.enum(['compact', 'standard', 'comfortable']).optional(),
  autoCycleActiveUnit: z.boolean().optional(),
  quickMovement: z.boolean().optional(),
  quickCombat: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  highContrast: z.boolean().optional(),
});
export type TacticalSettingsPersisted = z.infer<
  typeof TacticalSettingsPersistedSchema
>;

// =============================================================================
// mekstation-customizer-settings  (useCustomizerSettingsStore — partialized)
// =============================================================================

/** Persisted shape of `useCustomizerSettingsStore` — the `partialize` subset. */
export const CustomizerSettingsPersistedSchema = z.object({
  armorDiagramMode: z.enum(['schematic', 'silhouette']),
  armorDiagramVariant: z.enum([
    'clean-tech',
    'neon-operator',
    'tactical-hud',
    'premium-material',
    'megamek',
  ]),
  showArmorDiagramSelector: z.boolean(),
});
export type CustomizerSettingsPersisted = z.infer<
  typeof CustomizerSettingsPersistedSchema
>;
