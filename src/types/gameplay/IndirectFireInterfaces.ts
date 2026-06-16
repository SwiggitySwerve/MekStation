/**
 * Indirect Fire Interfaces
 *
 * Type definitions for the indirect-fire combat pipeline: spotter election,
 * NARC/iNarc beacon overrides, semi-guided TAG, forward-observer SPA, and
 * the four event payload variants emitted during resolution.
 *
 * Extracted from CombatInterfaces.ts (PR-types-split — G9) to pre-empt the
 * 1000+ LOC threshold before Wave 9 aero-combat additions land.
 *
 * @spec openspec/changes/add-indirect-fire-and-spotter-network/specs/indirect-fire-system/spec.md
 * @spec openspec/changes/add-indirect-fire-and-spotter-network/specs/weapon-system/spec.md
 * @spec openspec/changes/add-indirect-fire-and-spotter-network/specs/combat-resolution/spec.md
 */

import type { IHexCoordinate } from './HexGridInterfaces';

// =============================================================================
// Indirect Fire System
// =============================================================================

/**
 * Discriminator for how an indirect-fire resolution was established.
 *
 * - `'los'`            — a friendly LOS spotter was elected
 * - `'narc'`           — target NARC-marked by attacker's team (no LOS spotter needed)
 * - `'inarc'`          — target iNarc-marked by attacker's team
 * - `'semi-guided-tag'`— semi-guided LRM with current-turn TAG on target
 */
export type IndirectFireBasis = 'los' | 'narc' | 'inarc' | 'semi-guided-tag';

/**
 * Fire mode toggle for per-weapon combat state.
 * Indirect-eligible weapons (LRM family, MML-LRM mode, Mek Mortar) may be
 * toggled to 'Indirect'; all others SHALL remain 'Direct'.
 *
 * @spec openspec/changes/add-indirect-fire-and-spotter-network/specs/weapon-system/spec.md
 */
export type WeaponFireMode = 'Direct' | 'Indirect';

/**
 * Result returned by `InteractiveSession.computeIndirectFireContext`.
 *
 * Consumed by the to-hit pipeline before each attack roll resolves.
 * When `permitted` is false, the attack MUST be rejected; the `reason`
 * string is surfaced to the UI / event log.
 *
 * @spec openspec/changes/add-indirect-fire-and-spotter-network/specs/indirect-fire-system/spec.md
 */
export interface IIndirectFireResolution {
  /** Whether indirect fire is permitted for this attack. */
  readonly permitted: boolean;
  /** Whether this resolves as an actual indirect attack (attacker has no LOS). */
  readonly isIndirect: boolean;
  /**
   * Elected spotter unit ID. `null` when basis is 'narc'/'inarc'/'semi-guided-tag'
   * or when isIndirect is false.
   */
  readonly spotterId: string | null;
  /** How the indirect resolution was established. Present when isIndirect=true. */
  readonly basis?: IndirectFireBasis;
  /**
   * Integer to-hit penalty to add to the running to-hit number.
   * 0 for direct-fire or semi-guided-tag with active TAG.
   * 1 = base indirect only (stationary spotter or NARC/iNarc).
   * 2 = base + spotter walked.
   */
  readonly toHitPenalty: number;
  /**
   * True when a walking LOS spotter's Forward Observer SPA cancelled the
   * walked-spotter penalty. Consumers use this to emit the matching audit
   * event after the selected-spotter event.
   */
  readonly forwardObserverApplied?: boolean;
  /**
   * True when the attacker's Oblique Attacker SPA reduced the final
   * indirect-fire penalty. The net penalty remains in `toHitPenalty`.
   */
  readonly obliqueAttackerApplied?: boolean;
  /**
   * True when the elected LOS spotter's Comm Implant or Boosted Comm Implant
   * reduced the source-backed indirect LRM spotter target number by 1.
   */
  readonly commImplantApplied?: boolean;
  /**
   * Elected LOS spotter attacked this turn, adding +1 to the penalty
   * (MegaMek ComputeToHit.java L1540-1544 — audit C-5).
   */
  readonly spotterAttackedThisTurn?: boolean;
  /** Penalty points cancelled by Forward Observer, when represented. */
  readonly spotterMovementPenaltyCancelled?: number;
  /** Penalty points cancelled by Comm Implant / Boosted Comm Implant. */
  readonly commImplantPenaltyRelief?: number;
  /** Human-readable reason when permitted=false. */
  readonly reason?: string;
}

// =============================================================================
// Indirect Fire Event Variants
// =============================================================================

/**
 * Shared payload fields carried by every indirect-fire event.
 * All four event types embed these fields for consistent event-log
 * queries and columnar formatting.
 *
 * @spec openspec/changes/add-indirect-fire-and-spotter-network/specs/combat-resolution/spec.md
 */
export interface IIndirectFireEventBase {
  /** The unit that declared the attack. */
  readonly attackerId: string;
  /** Elected spotter unit ID; null for NARC/iNarc/TAG resolutions. */
  readonly spotterId: string | null;
  /** Weapon slot ID used in the attack. */
  readonly weaponId: string;
  /** Ammo bin ID consumed by the attack; undefined for energy weapons. */
  readonly ammoId?: string;
  /** Target hex in `"q,r"` canonical form. */
  readonly targetHex: IHexCoordinate;
  /** Net to-hit penalty applied by the indirect resolution. */
  readonly toHitPenalty: number;
  /** How the resolution was established. */
  readonly basis: IndirectFireBasis;
  /**
   * Elected LOS spotter attacked this turn, adding +1 to the penalty
   * (MegaMek ComputeToHit.java L1540-1544 — audit C-5). The pre-fix
   * spotterGunnery/spotterSkillModifier payload fields are retired: the
   * (gunnery-4)/2 term was an artillery-only rule misapplied to LRMs.
   */
  readonly spotterAttackedThisTurn?: boolean;
}

/**
 * Emitted when a friendly LOS spotter is successfully elected for an
 * indirect-fire attack (basis='los').
 *
 * @spec Requirement: Indirect-Fire Event Coverage — scenario "LOS spotter selected"
 */
export interface IIndirectFireSpotterSelectedPayload extends IIndirectFireEventBase {
  /** Always 'los' for this event type. */
  readonly basis: 'los';
  /** Always non-null for LOS resolution. */
  readonly spotterId: string;
}

/**
 * Emitted when the elected spotter is destroyed between to-hit time and
 * damage resolution, forcing an auto-miss.
 *
 * @spec Requirement: Indirect-Fire Event Coverage — scenario "Spotter destroyed mid-attack"
 */
export interface IIndirectFireSpotterLostPayload extends IIndirectFireEventBase {
  /** Human-readable destruction reason. */
  readonly reason: string;
}

/**
 * Emitted in addition to IndirectFireSpotterSelected when the spotter's
 * pilot has the FORWARD_OBSERVER SPA and the +1 spotter-walked penalty
 * is cancelled.
 *
 * @spec Requirement: Indirect-Fire Event Coverage — scenario "Forward Observer SPA active"
 */
export interface IIndirectFireForwardObserverPayload extends IIndirectFireEventBase {
  /** Number of penalty points cancelled by the FO ability (always 1). */
  readonly penaltyCancelled: number;
}

/**
 * Emitted when indirect fire is permitted via NARC or iNarc beacon
 * (no LOS spotter required; basis='narc'|'inarc').
 *
 * @spec Requirement: Indirect-Fire Event Coverage — scenario "NARC override"
 */
export interface IIndirectFireNarcOverridePayload extends IIndirectFireEventBase {
  /** 'narc' or 'inarc' for this event type. */
  readonly basis: 'narc' | 'inarc';
  /** Always null — no unit was elected as spotter. */
  readonly spotterId: null;
}
