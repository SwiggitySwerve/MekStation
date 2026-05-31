/**
 * Indirect Fire System Module
 *
 * Implements BattleTech indirect fire mechanics:
 * - LRM indirect fire mode: fire without LOS, requires spotter
 * - Spotter mechanics: friendly unit with LOS to target, movement restriction
 * - Indirect fire to-hit penalties: +1 base, +1 if spotter walked
 * - Semi-guided LRM with TAG designation
 * - Indirect fire LOS validation (spotter→target, not attacker→target)
 *
 * @spec openspec/changes/full-combat-parity/specs/indirect-fire-system/spec.md
 */

import { MovementType } from '@/types/gameplay';
import { IHexCoordinate, IHexGrid } from '@/types/gameplay/HexGridInterfaces';

import { calculateLOS, ILOSResult } from './lineOfSight';
import { getObliqueAttackerBonus } from './spaModifiers';
import {
  isSemiGuidedLRM,
  isTargetTAGDesignated,
  ITargetStatusFlags,
  IWeaponEquipmentFlags,
} from './specialWeaponMechanics';

// =============================================================================
// Types
// =============================================================================

/** A unit on the battlefield that could act as a spotter */
export interface ISpotterCandidate {
  /** Unit entity ID */
  readonly entityId: string;
  /** Team/player the unit belongs to */
  readonly teamId: string;
  /** Current hex position */
  readonly position: IHexCoordinate;
  /** Movement type this turn */
  readonly movementType: MovementType;
  /** Explicit TacOps Sprint state when no MovementType.Sprint exists yet. */
  readonly sprintedThisTurn?: boolean;
  /** Explicit TacOps Evade state. Evading units cannot spot in MegaMek. */
  readonly isEvading?: boolean;
  /** Whether the unit is operational (not destroyed/shutdown) */
  readonly isOperational: boolean;
  /**
   * Canonical SPA IDs owned by the pilot of this spotter unit. Optional for
   * backward compatibility — existing call sites that do not supply pilot data
   * leave this undefined and receive no SPA-driven modifier cancellations.
   * When present, the `FORWARD_OBSERVER` id cancels the +1 spotter-walked
   * penalty (the unit still must have walked, not run/jumped, to be eligible).
   */
  readonly pilotSpas?: readonly string[];
  /**
   * Gunnery skill of the spotter's pilot. Optional for backward compatibility —
   * call sites that pre-date PR-K9 leave this undefined, which is treated as
   * the MegaMek default gunnery of 4 (modifier = 0).
   *
   * Per MegaMek ArtilleryWeaponIndirectFireHandler.java L192-194:
   *   int spotterMod = (spotter.getGunnery() - 4) / 2;  // Java integer division
   */
  readonly spotterGunnery?: number;
}

/** The firing unit's indirect fire context */
export interface IIndirectFireRequest {
  /** Attacker entity ID */
  readonly attackerEntityId: string;
  /** Attacker team ID */
  readonly attackerTeamId: string;
  /** Attacker position */
  readonly attackerPosition: IHexCoordinate;
  /** Target position */
  readonly targetPosition: IHexCoordinate;
  /** Weapon ID (used to check if LRM) */
  readonly weaponId: string;
  /** Whether the attacker has direct LOS to target */
  readonly attackerHasLOS: boolean;
  /**
   * Canonical SPA IDs owned by the firing pilot. Optional for backward
   * compatibility. Oblique Attacker reduces the indirect-fire penalty by 1.
   */
  readonly attackerPilotSpas?: readonly string[];
  /** All friendly units that could spot */
  readonly spotterCandidates: readonly ISpotterCandidate[];
  /** The hex grid (for LOS checks) */
  readonly grid: IHexGrid;
  /**
   * Whether the target has been NARC-marked by the attacker's team.
   * Optional for backward compatibility — existing call sites without NARC
   * data leave this undefined and receive no NARC override.
   *
   * @spec openspec/changes/add-indirect-fire-and-spotter-network/specs/indirect-fire-system/spec.md §3
   */
  readonly targetNarcMarkedByTeam?: boolean;
  /**
   * Whether the target has been iNarc-marked by the attacker's team.
   * Optional for backward compatibility — existing call sites without iNarc
   * data leave this undefined and receive no iNarc override.
   *
   * @spec openspec/changes/add-indirect-fire-and-spotter-network/specs/indirect-fire-system/spec.md §3
   */
  readonly targetINarcMarkedByTeam?: boolean;
}

/** Result of indirect fire eligibility check */
export interface IIndirectFireResult {
  /** Whether indirect fire is permitted */
  readonly permitted: boolean;
  /** Reason if not permitted */
  readonly reason?: string;
  /** Whether this is actually an indirect fire attack (LOS blocked) */
  readonly isIndirect: boolean;
  /** Selected spotter (if indirect fire via LOS spotter) */
  readonly spotter?: ISpotterCandidate;
  /** Whether the spotter walked this turn */
  readonly spotterWalked: boolean;
  /** Total indirect fire to-hit penalty (+1 base, +1 if spotter walked) */
  readonly toHitPenalty: number;
  /** Whether Forward Observer cancelled the +1 walked-spotter penalty. */
  readonly forwardObserverApplied?: boolean;
  /** Whether Oblique Attacker reduced the final indirect-fire penalty. */
  readonly obliqueAttackerApplied?: boolean;
  /** LOS result from spotter to target */
  readonly spotterLOS?: ILOSResult;
  /**
   * How the indirect resolution was established.
   * - `'los'`   — a friendly LOS spotter was elected
   * - `'narc'`  — NARC beacon on target by attacker's team (no LOS spotter needed)
   * - `'inarc'` — iNarc beacon on target by attacker's team
   * Absent when isIndirect=false or permitted=false.
   *
   * @spec openspec/changes/add-indirect-fire-and-spotter-network/specs/indirect-fire-system/spec.md §3
   */
  readonly basis?: 'los' | 'narc' | 'inarc';
}

/** Semi-guided LRM resolution context */
export interface ISemiGuidedContext {
  /** Weapon ID */
  readonly weaponId: string;
  /** Weapon equipment flags */
  readonly equipment: IWeaponEquipmentFlags;
  /** Target status flags (TAG designation, ECM) */
  readonly targetStatus: ITargetStatusFlags;
}

/** Semi-guided LRM resolution result */
export interface ISemiGuidedResult {
  /** Whether semi-guided mode is active */
  readonly isSemiGuided: boolean;
  /** Whether TAG is active on target */
  readonly tagActive: boolean;
  /** Whether to use standard to-hit (TAG active) vs normal LRM */
  readonly useStandardToHit: boolean;
  /** Description of resolution mode */
  readonly description: string;
}

// =============================================================================
// Spotter Validation
// =============================================================================

/**
 * Check if a unit is eligible to act as a spotter for indirect fire.
 *
 * A valid spotter must:
 * - Be operational (not destroyed/shutdown)
 * - Be on the same team as the attacker
 * - NOT have run, jumped, sprinted, or evaded this turn
 * - NOT be the attacker itself
 * - Have line of sight to the target
 */
export function isEligibleSpotter(
  candidate: ISpotterCandidate,
  attackerEntityId: string,
  attackerTeamId: string,
): boolean {
  // Must be operational
  if (!candidate.isOperational) return false;

  // Must be on the same team
  if (candidate.teamId !== attackerTeamId) return false;

  // Cannot be the attacker itself
  if (candidate.entityId === attackerEntityId) return false;

  // Must not have run or jumped (only stationary or walked)
  if (
    candidate.movementType === MovementType.Run ||
    candidate.movementType === MovementType.Jump
  ) {
    return false;
  }

  if (
    candidate.sprintedThisTurn === true ||
    candidate.isEvading === true ||
    candidate.movementType === MovementType.Evade
  ) {
    return false;
  }

  return true;
}

/**
 * Check if a spotter has line of sight to the target.
 */
export function spotterHasLOS(
  spotter: ISpotterCandidate,
  targetPosition: IHexCoordinate,
  grid: IHexGrid,
): ILOSResult {
  return calculateLOS(spotter.position, targetPosition, grid);
}

/**
 * Find the best available spotter for an indirect fire attack.
 *
 * Prefers spotters that stood still (no additional penalty) over those
 * that walked (+1 penalty). Among equal movement, prefers the first eligible.
 */
export function findBestSpotter(
  candidates: readonly ISpotterCandidate[],
  attackerEntityId: string,
  attackerTeamId: string,
  targetPosition: IHexCoordinate,
  grid: IHexGrid,
): { spotter: ISpotterCandidate; losResult: ILOSResult } | null {
  // Filter to eligible spotters
  const eligible = candidates.filter((c) =>
    isEligibleSpotter(c, attackerEntityId, attackerTeamId),
  );

  if (eligible.length === 0) return null;

  // Check LOS for each eligible spotter, preferring stationary over walked
  let bestStationary: {
    spotter: ISpotterCandidate;
    losResult: ILOSResult;
  } | null = null;
  let bestWalked: {
    spotter: ISpotterCandidate;
    losResult: ILOSResult;
  } | null = null;

  for (const candidate of eligible) {
    const losResult = spotterHasLOS(candidate, targetPosition, grid);
    if (!losResult.hasLOS) continue;

    if (candidate.movementType === MovementType.Stationary) {
      if (!bestStationary) {
        bestStationary = { spotter: candidate, losResult };
      }
    } else {
      // Walk
      if (!bestWalked) {
        bestWalked = { spotter: candidate, losResult };
      }
    }
  }

  // Prefer stationary spotter (lower penalty)
  return bestStationary ?? bestWalked ?? null;
}

// =============================================================================
// Indirect Fire Validation
// =============================================================================

/**
 * Weapon families that may fire indirectly. Mirrors MegaMek
 * `ComputeToHit.java:384-388`. Used as the single source of truth for
 * indirect-fire eligibility checks across the engine + UI surfaces.
 *
 * Per the add-indirect-fire-and-spotter-network spec (§4.1):
 *  - LRM        — standard LRM-5/10/15/20 (IS + Clan)
 *  - LRM_IMP    — Improved LRM (3070+ tech)
 *  - MML_LRM    — Multi-Missile Launcher loaded with LRM ammo (SRM ammo NOT eligible)
 *  - MEK_MORTAR — light/heavy Mek Mortar
 *  - NLRM       — Narced LRM variants
 *
 * Notable exclusions: Streak SRM/LRM (lock-on requires LOS) and direct-
 * fire ballistics. Arrow IV uses separate artillery mechanics tracked in
 * the deferred `add-arrow-iv-artillery` change.
 */
export type IndirectEligibleWeaponFamily =
  | 'LRM'
  | 'LRM_IMP'
  | 'MML_LRM'
  | 'MEK_MORTAR'
  | 'NLRM';

export const INDIRECT_ELIGIBLE_WEAPON_FAMILIES: readonly IndirectEligibleWeaponFamily[] =
  ['LRM', 'LRM_IMP', 'MML_LRM', 'MEK_MORTAR', 'NLRM'];

/**
 * Check if a weapon is capable of indirect fire.
 *
 * Uses substring matching against the weapon id as a pragmatic bridge
 * until the per-weapon `family` field lands in the catalog. The matched
 * substrings map 1:1 with the families enumerated in
 * `INDIRECT_ELIGIBLE_WEAPON_FAMILIES`. Streak variants are explicitly
 * excluded (lock-on requires LOS).
 */
export function isIndirectFireCapable(weaponId: string): boolean {
  const id = weaponId.toLowerCase();
  if (id.includes('streak')) return false;
  // LRM / LRM-IMP / NLRM / MML-LRM (MML in LRM mode) — all share 'lrm' substring.
  if (id.includes('lrm')) return true;
  // Mek Mortar — 'mortar' or 'mek-mortar'.
  if (id.includes('mortar')) return true;
  return false;
}

/**
 * Validate and resolve an indirect fire attack.
 *
 * This is the main entry point for the indirect fire system.
 * It determines:
 * 1. Whether the attack needs indirect fire (LOS blocked)
 * 2. Whether indirect fire is possible (valid spotter or NARC/iNarc override)
 * 3. The to-hit penalty (+1 base, +1 if spotter walked; NARC/iNarc = base only)
 *
 * Resolution priority when attacker has no LOS:
 *   a. LOS spotter elected → basis='los'
 *   b. No spotter + NARC mark by attacker's team → basis='narc', spotterId=null
 *   c. No spotter + iNarc mark by attacker's team → basis='inarc', spotterId=null
 *   d. None of the above → rejected
 *
 * When both NARC and iNarc are true, NARC takes precedence (basis='narc').
 */
export function resolveIndirectFire(
  request: IIndirectFireRequest,
): IIndirectFireResult {
  const obliqueAttackerModifier = getObliqueAttackerBonus(
    request.attackerPilotSpas ?? [],
  );
  const applyAttackerPenaltyModifiers = (penalty: number) =>
    Math.max(0, penalty + obliqueAttackerModifier);
  const obliqueApplied = (penalty: number) =>
    applyAttackerPenaltyModifiers(penalty) !== penalty;

  // If attacker has direct LOS, no indirect fire needed
  if (request.attackerHasLOS) {
    return {
      permitted: true,
      isIndirect: false,
      spotterWalked: false,
      toHitPenalty: 0,
    };
  }

  // Attacker has no LOS — indirect fire is needed
  // Check if weapon can fire indirectly
  if (!isIndirectFireCapable(request.weaponId)) {
    return {
      permitted: false,
      reason: `Weapon '${request.weaponId}' is not capable of indirect fire`,
      isIndirect: false,
      spotterWalked: false,
      toHitPenalty: 0,
    };
  }

  // Find a valid LOS spotter first — preferred over NARC/iNarc override.
  const spotterResult = findBestSpotter(
    request.spotterCandidates,
    request.attackerEntityId,
    request.attackerTeamId,
    request.targetPosition,
    request.grid,
  );

  if (spotterResult) {
    // LOS spotter found — basis='los'. FO SPA cancels the spotter-walked +1.
    const { spotter, losResult } = spotterResult;
    const spotterWalked = spotter.movementType === MovementType.Walk;
    // Forward Observer SPA cancels the +1 spotter-walked add. The base +1
    // indirect-fire penalty still applies. Run/Jump ineligibility is enforced
    // upstream in isEligibleSpotter — FO does not override that restriction.
    const hasFoSpa = spotter.pilotSpas?.includes('forward_observer') ?? false;
    const forwardObserverApplied = spotterWalked && hasFoSpa;
    const walkedPenalty = spotterWalked && !hasFoSpa ? 1 : 0;

    // Per MegaMek ArtilleryWeaponIndirectFireHandler.java L192-194:
    //   int spotterMod = (spotter.getGunnery() - 4) / 2;
    // Java uses integer division which truncates toward zero (NOT floor).
    // G2 → -1, G3 → 0, G4 → 0, G5 → 0, G6 → +1.
    // Absent spotterGunnery defaults to 4 (MegaMek default, modifier = 0).
    const effectiveGunnery = spotter.spotterGunnery ?? 4;
    const gunneryMod = Math.trunc((effectiveGunnery - 4) / 2);

    // Base +1 indirect-fire penalty + walked penalty + gunnery modifier,
    // then attacker-side SPA modifiers such as Oblique Attacker.
    const basePenalty = 1 + walkedPenalty + gunneryMod;
    const toHitPenalty = applyAttackerPenaltyModifiers(basePenalty);

    return {
      permitted: true,
      isIndirect: true,
      basis: 'los',
      spotter,
      spotterWalked,
      toHitPenalty,
      spotterLOS: losResult,
      forwardObserverApplied,
      obliqueAttackerApplied: obliqueApplied(basePenalty),
    };
  }

  // No LOS spotter — check NARC/iNarc beacon override (§3).
  // NARC takes precedence over iNarc when both are true.
  const narcMarked = request.targetNarcMarkedByTeam === true;
  const inarcMarked = request.targetINarcMarkedByTeam === true;

  if (narcMarked) {
    // NARC-marked by attacker's team → implicit spotter, base penalty only.
    return {
      permitted: true,
      isIndirect: true,
      basis: 'narc',
      spotterWalked: false,
      toHitPenalty: applyAttackerPenaltyModifiers(1),
      obliqueAttackerApplied: obliqueApplied(1),
    };
  }

  if (inarcMarked) {
    // iNarc-marked by attacker's team → implicit spotter, base penalty only.
    return {
      permitted: true,
      isIndirect: true,
      basis: 'inarc',
      spotterWalked: false,
      toHitPenalty: applyAttackerPenaltyModifiers(1),
      obliqueAttackerApplied: obliqueApplied(1),
    };
  }

  // No spotter and no NARC/iNarc override — reject.
  return {
    permitted: false,
    reason:
      'No friendly unit with line of sight to target is available as spotter',
    isIndirect: false,
    spotterWalked: false,
    toHitPenalty: 0,
  };
}

// =============================================================================
// Semi-Guided LRM with TAG
// =============================================================================

/**
 * Resolve semi-guided LRM behavior.
 *
 * Semi-guided LRMs against TAG-designated targets:
 * - Apply the source-backed TAG relief to indirect-fire to-hit penalties
 * - TAG must be active on the target (not nullified by ECM)
 *
 * Without TAG designation, semi-guided LRMs fire as standard LRMs.
 */
export function resolveSemiGuidedLRM(
  context: ISemiGuidedContext,
): ISemiGuidedResult {
  // Check if weapon is actually semi-guided
  if (!isSemiGuidedLRM(context.weaponId) && !context.equipment.isSemiGuided) {
    return {
      isSemiGuided: false,
      tagActive: false,
      useStandardToHit: false,
      description: 'Not a semi-guided LRM',
    };
  }

  // Check if TAG is active on target
  const tagActive = isTargetTAGDesignated(context.targetStatus);

  if (tagActive) {
    return {
      isSemiGuided: true,
      tagActive: true,
      useStandardToHit: true,
      description:
        'Semi-guided LRM with active TAG: apply semi-guided TAG to-hit relief',
    };
  }

  // No TAG — fires as standard LRM
  return {
    isSemiGuided: true,
    tagActive: false,
    useStandardToHit: false,
    description:
      'Semi-guided LRM without TAG: fires as standard LRM with normal modifiers',
  };
}

// =============================================================================
// Combined Indirect Fire Resolution
// =============================================================================

/**
 * Full indirect fire resolution including semi-guided LRM handling.
 *
 * Combines spotter validation with semi-guided LRM TAG mechanics.
 * When a semi-guided LRM fires at a TAG-designated target, the
 * source-backed semi-guided TAG modifier reduces the indirect-fire
 * penalty by 1 instead of zeroing every indirect-fire add.
 */
export function resolveIndirectFireWithSemiGuided(
  request: IIndirectFireRequest,
  semiGuidedContext?: ISemiGuidedContext,
): IIndirectFireResult {
  // First resolve basic indirect fire
  const baseResult = resolveIndirectFire(request);

  // If not indirect or not permitted, return as-is
  if (!baseResult.isIndirect || !baseResult.permitted) {
    return baseResult;
  }

  // If semi-guided context provided, check TAG
  if (semiGuidedContext) {
    const semiGuidedResult = resolveSemiGuidedLRM(semiGuidedContext);

    if (semiGuidedResult.isSemiGuided && semiGuidedResult.tagActive) {
      return {
        ...baseResult,
        toHitPenalty: Math.max(0, baseResult.toHitPenalty - 1),
      };
    }
  }

  return baseResult;
}
