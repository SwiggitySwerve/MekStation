/**
 * Intel Policy Interfaces — match-level opponent intel configuration.
 *
 * A match (or scenario) carries one `IIntelPolicyPreset` that controls
 * how enemy state is projected to every player viewer. The GM shell may
 * additionally override to the 'gm' tier on a per-unit basis without
 * affecting player projections.
 *
 * Four built-in presets cover the most common BattleTech play styles.
 * Advanced per-unit and per-field toggles are deferred to a future
 * change (§2.2 GM/scenario config controls).
 *
 * @spec openspec/changes/add-configurable-opponent-intel-ui/specs/fog-of-war/spec.md
 * @see openspec/changes/add-configurable-opponent-intel-ui/tasks.md §1.1
 */

import type { OpponentIntelTier } from './TacticalShellInterfaces';

// =============================================================================
// Preset shape
// =============================================================================

/**
 * A named preset that sets the default visibility tier for all opponents.
 *
 * `stalenessThresholdTurns` is only meaningful for the 'last-known' tier:
 * if an opponent was last seen more than N turns ago the token gains an
 * 'outdated' staleness badge on top of the last-known tier.
 */
export interface IIntelPolicyPreset {
  /** Stable machine identifier for the preset (e.g. 'full-reveal'). */
  readonly id: string;
  /** Human-readable display label shown in scenario setup. */
  readonly label: string;
  /**
   * Default visibility tier applied to all opponent units unless overridden
   * by a per-unit GM reveal. GM viewers always see 'gm' tier regardless of
   * this value.
   */
  readonly defaultTier: OpponentIntelTier;
  /**
   * How many turns of non-observation before a 'last-known' tier unit
   * gains the 'outdated' staleness badge. Undefined means no staleness
   * decay is applied (the last-known data is considered current).
   *
   * Only relevant when `defaultTier` is 'last-known'.
   */
  readonly stalenessThresholdTurns?: number;
}

// =============================================================================
// Built-in presets
// =============================================================================

/**
 * Full-reveal: every opponent is visible at exact fidelity.
 * Equivalent to classic open-information BattleTech skirmish.
 */
export const INTEL_PRESET_FULL_REVEAL: IIntelPolicyPreset = {
  id: 'full-reveal',
  label: 'Full Reveal',
  defaultTier: 'exact',
};

/**
 * Standard fog: opponents are visible but only rough intel is provided
 * (damage bands, no exact numbers). A good default for competitive play.
 */
export const INTEL_PRESET_STANDARD_FOG: IIntelPolicyPreset = {
  id: 'standard-fog',
  label: 'Standard Fog',
  defaultTier: 'rough',
};

/**
 * Silhouette only: opponents show weight-class silhouette (Light / Medium /
 * Heavy / Assault) but neither name nor chassis designator is revealed.
 * Suited for narrative or GM-run scenarios with strong sensor uncertainty.
 */
export const INTEL_PRESET_SILHOUETTE_ONLY: IIntelPolicyPreset = {
  id: 'silhouette-only',
  label: 'Silhouette Only',
  defaultTier: 'silhouette',
};

/**
 * GM mode: all opponents are presented at the privileged 'gm' tier — full
 * exact state plus pilot identity and private metadata. Intended for the
 * GM/referee shell only; player shells should never receive this preset.
 */
export const INTEL_PRESET_GM_MODE: IIntelPolicyPreset = {
  id: 'gm-mode',
  label: 'GM Mode',
  defaultTier: 'gm',
};

/** All built-in presets in display order (most open → most restricted). */
export const ALL_INTEL_PRESETS: readonly IIntelPolicyPreset[] = [
  INTEL_PRESET_FULL_REVEAL,
  INTEL_PRESET_STANDARD_FOG,
  INTEL_PRESET_SILHOUETTE_ONLY,
  INTEL_PRESET_GM_MODE,
];
