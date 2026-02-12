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
  /** Whether the unit is operational (not destroyed/shutdown) */
  readonly isOperational: boolean;
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
  /** All friendly units that could spot */
  readonly spotterCandidates: readonly ISpotterCandidate[];
  /** The hex grid (for LOS checks) */
  readonly grid: IHexGrid;
}

/** Result of indirect fire eligibility check */
export interface IIndirectFireResult {
  /** Whether indirect fire is permitted */
  readonly permitted: boolean;
  /** Reason if not permitted */
  readonly reason?: string;
  /** Whether this is actually an indirect fire attack (LOS blocked) */
  readonly isIndirect: boolean;
  /** Selected spotter (if indirect fire) */
  readonly spotter?: ISpotterCandidate;
  /** Whether the spotter walked this turn */
  readonly spotterWalked: boolean;
  /** Total indirect fire to-hit penalty (+1 base, +1 if spotter walked) */
  readonly toHitPenalty: number;
  /** LOS result from spotter to target */
  readonly spotterLOS?: ILOSResult;
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
 * - NOT have run or jumped this turn (stationary or walked only)
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
 * Check if a weapon is capable of indirect fire.
 *
 * Only LRM weapons can fire indirectly in standard BattleTech rules.
 * Arrow IV has separate artillery mechanics (not implemented here).
 */
export function isIndirectFireCapable(weaponId: string): boolean {
  const id = weaponId.toLowerCase();
  // LRMs (including semi-guided, clan, IS variants)
  return id.includes('lrm') && !id.includes('streak');
}

/**
 * Validate and resolve an indirect fire attack.
 *
 * This is the main entry point for the indirect fire system.
 * It determines:
 * 1. Whether the attack needs indirect fire (LOS blocked)
 * 2. Whether indirect fire is possible (valid spotter exists)
 * 3. The to-hit penalty (+1 base, +1 if spotter walked)
 */
export function resolveIndirectFire(
  request: IIndirectFireRequest,
): IIndirectFireResult {
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

  // Find a valid spotter
  const spotterResult = findBestSpotter(
    request.spotterCandidates,
    request.attackerEntityId,
    request.attackerTeamId,
    request.targetPosition,
    request.grid,
  );

  if (!spotterResult) {
    return {
      permitted: false,
      reason:
        'No friendly unit with line of sight to target is available as spotter',
      isIndirect: false,
      spotterWalked: false,
      toHitPenalty: 0,
    };
  }

  const { spotter, losResult } = spotterResult;
  const spotterWalked = spotter.movementType === MovementType.Walk;
  const toHitPenalty = spotterWalked ? 2 : 1;

  return {
    permitted: true,
    isIndirect: true,
    spotter,
    spotterWalked,
    toHitPenalty,
    spotterLOS: losResult,
  };
}

// =============================================================================
// Semi-Guided LRM with TAG
// =============================================================================

/**
 * Resolve semi-guided LRM behavior.
 *
 * Semi-guided LRMs against TAG-designated targets:
 * - Use standard to-hit (no indirect fire penalty when TAG active)
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
        'Semi-guided LRM with active TAG: standard to-hit (no indirect penalty)',
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
 * indirect fire penalty is removed (standard to-hit applies).
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
      // TAG active: use standard to-hit (no indirect penalty)
      return {
        ...baseResult,
        toHitPenalty: 0,
        spotterWalked: false, // Penalty negated by TAG
      };
    }
  }

  return baseResult;
}
