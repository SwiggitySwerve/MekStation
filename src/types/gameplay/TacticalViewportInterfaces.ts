/**
 * Tactical Viewport Interfaces
 *
 * Defines the breakpoint enum, viewport profile shape, and slot-reallocation
 * rules for the responsive tactical HUD.
 *
 * Authored in Wave 7.4 PR-I (foundation slice) per:
 *   §1.1 — responsive viewport matrix
 *   §1.2 — slot reallocation rules
 *
 * Slot-reallocation philosophy (from design.md):
 *   "Responsive behavior is slot reallocation. Same shell slots move/collapse
 *    rather than rendering unrelated mobile components."
 *
 * @spec openspec/changes/add-responsive-tactical-hud-accessibility/specs/mobile-interaction-patterns/spec.md
 *   "Tactical HUD Responsive Slot Reallocation" ADDED requirement
 */

import type { SlotId } from './TacticalShellInterfaces';

// =============================================================================
// Breakpoint enum
// =============================================================================

/**
 * Named tactical viewport breakpoints.
 *
 * Values map to screen-width bands derived from the canonical breakpoints in
 * `src/constants/layout.ts` (BREAKPOINTS.SM/MD/LG/XL/XXL). The
 * `constrained-height` variant is independent of width — it fires when the
 * viewport height falls below the tactical minimum (600 px).
 *
 * Per spec "Tactical HUD Responsive Slot Reallocation":
 *   - `phone`             < 768 px wide
 *   - `tablet`            768 px – 1023 px wide
 *   - `laptop`            1024 px – 1279 px wide
 *   - `desktop`           1280 px – 1535 px wide
 *   - `ultrawide`         >= 1536 px wide
 *   - `constrained-height`  height < 600 px (overrides width band)
 */
export type TacticalBreakpoint =
  | 'phone'
  | 'tablet'
  | 'laptop'
  | 'desktop'
  | 'ultrawide'
  | 'constrained-height';

// =============================================================================
// Slot reallocation descriptor
// =============================================================================

/**
 * Describes how a slot behaves at a specific breakpoint.
 *
 * `hide`    — slot is removed from the layout entirely.
 * `collapse` — slot collapses to a button/icon; content is hidden behind a
 *              toggle (e.g. a tray collapses to a chevron).
 * `merge`   — slot content folds into another surface (e.g. the minimap-
 *              cluster and feed merge into the mobile-drawer on phone).
 * `visible` — slot renders normally (no reallocation).
 */
export type SlotAllocation = 'hide' | 'collapse' | 'merge' | 'visible';

/**
 * Per-slot allocation rule for one breakpoint.
 *
 * Only slots that change from their desktop-default `visible` state need to
 * be listed. Unlisted slots are implicitly `visible`.
 */
export type SlotReallocationRule = Partial<Record<SlotId, SlotAllocation>>;

// =============================================================================
// Input mode and density
// =============================================================================

/**
 * Primary input modality for the viewport.
 *
 * `touch`    — touch-first layout: larger targets, gesture navigation.
 * `mouse`    — pointer-primary layout: smaller targets, hover states.
 * `keyboard` — keyboard-only layout: roving focus, focus-ring emphasis.
 */
export type InputMode = 'touch' | 'mouse' | 'keyboard';

/**
 * Panel density — controls padding, font size, and gap between shell regions.
 *
 * Mapped to Tailwind-class density tiers consumed by slot components.
 */
export type PanelDensity = 'compact' | 'standard' | 'comfortable';

// =============================================================================
// Viewport profile
// =============================================================================

/**
 * Active viewport configuration derived from the current window dimensions,
 * input capability detection, and user density preference.
 *
 * Returned by `useTacticalViewport`. Shell slot owners consume this to adapt
 * their rendering without each component running independent media queries.
 */
export interface IViewportProfile {
  /** Which named breakpoint tier is currently active. */
  readonly breakpoint: TacticalBreakpoint;
  /**
   * Slot-reallocation rules for this breakpoint. Slots absent from this
   * record retain their default `visible` allocation.
   */
  readonly slotReallocation: SlotReallocationRule;
  /** Detected or assumed primary input modality. */
  readonly inputMode: InputMode;
  /** Current panel density (user preference merged with breakpoint default). */
  readonly density: PanelDensity;
}

// =============================================================================
// Per-breakpoint slot profiles
// =============================================================================

/**
 * Canonical slot reallocation rules per breakpoint.
 *
 * Rules follow the design decision:
 *   "One bottom sheet on mobile. Only one of actions, inspector, feed, or
 *    lenses may be expanded at a time."
 *
 * Ultrawide: all slots visible (comfortable density bonus, no reallocation).
 * Desktop:   baseline — all slots visible.
 * Laptop:    minimap-cluster collapses; morale-band collapses (space saving).
 * Tablet:    left-tray collapses; morale-band collapses;
 *            right-tray merges into mobile-drawer.
 * Phone:     left-tray hides; morale-band hides; minimap-cluster hides;
 *            right-tray + feed merge into mobile-drawer (one-at-a-time rule
 *            enforced by §1.3 bottom-sheet controller — DEFERRED).
 * Constrained-height: morale-band collapses; top-band collapses to compact
 *            status chip; minimap-cluster collapses.
 */
export const RESPONSIVE_SLOT_PROFILES: Record<
  TacticalBreakpoint,
  SlotReallocationRule
> = {
  ultrawide: {
    // All slots visible on ultrawide — nothing to realloc.
  },
  desktop: {
    // Desktop baseline — all slots visible.
  },
  laptop: {
    'minimap-cluster': 'collapse',
    'morale-band': 'collapse',
  },
  tablet: {
    'morale-band': 'collapse',
    'left-tray': 'collapse',
    'right-tray': 'merge',
    'mobile-drawer': 'visible',
  },
  phone: {
    'morale-band': 'hide',
    'left-tray': 'hide',
    'minimap-cluster': 'hide',
    'right-tray': 'merge',
    feed: 'merge',
    'mobile-drawer': 'visible',
  },
  'constrained-height': {
    'top-band': 'collapse',
    'morale-band': 'collapse',
    'minimap-cluster': 'collapse',
  },
};

/**
 * Default input mode per breakpoint.
 *
 * Fingerprint heuristics (touch events, hover capability) in `useTacticalViewport`
 * may override these defaults at runtime.
 */
export const DEFAULT_INPUT_MODE_PER_BREAKPOINT: Record<
  TacticalBreakpoint,
  InputMode
> = {
  phone: 'touch',
  tablet: 'touch',
  laptop: 'mouse',
  desktop: 'mouse',
  ultrawide: 'mouse',
  'constrained-height': 'mouse',
};

/**
 * Default panel density per breakpoint.
 *
 * User preference (from `useTacticalSettingsStore`) takes precedence; these
 * are the fallback defaults when the user has not set a preference.
 */
export const DEFAULT_DENSITY_PER_BREAKPOINT: Record<
  TacticalBreakpoint,
  PanelDensity
> = {
  phone: 'compact',
  tablet: 'compact',
  laptop: 'standard',
  desktop: 'standard',
  ultrawide: 'comfortable',
  'constrained-height': 'compact',
};

/**
 * Minimum viewport height (px) that triggers `constrained-height` mode.
 *
 * Below this threshold, noncritical top-band details collapse into a compact
 * status menu per the spec's "Constrained height collapses nonessential chrome"
 * scenario.
 */
export const TACTICAL_MIN_HEIGHT_PX = 600;
