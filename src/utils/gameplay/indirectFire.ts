/**
 * Indirect Fire System Module
 *
 * Implements BattleTech indirect fire mechanics:
 * - LRM indirect fire mode: fire without LOS, requires spotter
 * - Spotter mechanics: friendly unit with LOS to target
 * - Indirect fire to-hit penalties: +1 base, plus represented spotter movement
 * - Semi-guided LRM with TAG designation
 * - Indirect fire LOS validation (spotter→target, not attacker→target)
 *
 * @spec openspec/changes/full-combat-parity/specs/indirect-fire-system/spec.md
 */

import { MovementType, type IndirectFireBasis } from '@/types/gameplay';
import { IHexCoordinate, IHexGrid } from '@/types/gameplay/HexGridInterfaces';

import { hexDistance } from './hexMath';
import {
  calculateLOS,
  type ILOSCalculationOptions,
  type ILOSResult,
} from './lineOfSight';
import { getObliqueAttackerBonus, hasSPA } from './spaModifiers';
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
  /** Explicit TacOps Sprint state. */
  readonly sprintedThisTurn?: boolean;
  /** Explicit TacOps Evade state. Evading units cannot spot in MegaMek. */
  readonly isEvading?: boolean;
  /** Infantry and battle armor ignore spotter movement penalties in MegaMek. */
  readonly isInfantry?: boolean;
  /** Whether the unit is operational (not destroyed/shutdown) */
  readonly isOperational: boolean;
  /**
   * MegaMek `Aero.canSpot()` rejects airborne aerospace spotters unless
   * represented recon/imager equipment is working. Grounded aerospace units
   * and non-aero units leave this false/undefined.
   */
  readonly isAirborneAerospace?: boolean;
  /**
   * Source-equipment projection for the MegaMek airborne aerospace spotting
   * exceptions. `highResolutionImagerDaylight` already folds in the current
   * planetary light gate from `Aero.canSpot()`.
   */
  readonly airborneAeroSpottingEquipment?: IAirborneAeroSpottingEquipment;
  /**
   * Canonical SPA IDs owned by the pilot of this spotter unit. Optional for
   * backward compatibility — existing call sites that do not supply pilot data
   * leave this undefined and receive no SPA-driven modifier cancellations.
   * When present, the `FORWARD_OBSERVER` id cancels the +1 spotter-walked
   * penalty (the unit still must have walked, not run/jumped, to be eligible).
   */
  readonly pilotSpas?: readonly string[];
  /**
   * Whether this unit has attacked (declared/resolved weapon fire) this turn.
   * Mirrors MegaMek `Entity.isAttackingThisTurn()` (Entity.java L10445-10453),
   * which scans the turn's declared attack actions. MekStation's sequential
   * resolution maps this to the per-turn `weaponsFiredThisTurn` unit state.
   * Optional for backward compatibility — absent means "has not attacked".
   *
   * Per MegaMek ComputeToHit.java L1540-1544 an attacking LOS spotter adds +1
   * to the indirect-fire to-hit (audit C-5). The command-console and
   * target-tagged exemptions on that line are not represented here: command
   * consoles are not modeled, and the semi-guided TAG composition skips the
   * spotter branch entirely (see resolveIndirectFireWithSemiGuided).
   */
  readonly attackedThisTurn?: boolean;
}

export interface IAirborneAeroSpottingEquipment {
  readonly reconCamera?: boolean;
  readonly infraredImager?: boolean;
  readonly hyperspectralImager?: boolean;
  readonly highResolutionImagerDaylight?: boolean;
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
  /** Whether the attacker is represented as airborne for indirect-fire gates. */
  readonly attackerAirborne?: boolean;
  /**
   * Canonical SPA IDs owned by the firing pilot. Optional for backward
   * compatibility. Oblique Attacker reduces the indirect-fire penalty by 1.
   */
  readonly attackerPilotSpas?: readonly string[];
  /** All friendly units that could spot */
  readonly spotterCandidates: readonly ISpotterCandidate[];
  /** The hex grid (for LOS checks) */
  readonly grid: IHexGrid;
  /** Optional LOS rule switches threaded from combat/session optional rules. */
  readonly losOptions?: ILOSCalculationOptions;
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
  /** Total indirect fire to-hit penalty (+1 base plus represented movement) */
  readonly toHitPenalty: number;
  /**
   * Elected LOS spotter attacked this turn, adding +1 to the penalty
   * (MegaMek ComputeToHit.java L1540-1544 — audit C-5).
   */
  readonly spotterAttackedThisTurn?: boolean;
  /** Forward Observer SPA cancelled the represented walked-spotter add. */
  readonly forwardObserverApplied?: boolean;
  /** Oblique Attacker SPA reduced the final indirect-fire penalty. */
  readonly obliqueAttackerApplied?: boolean;
  /** Comm Implant or Boosted Comm Implant reduced the LOS spotter penalty. */
  readonly commImplantApplied?: boolean;
  /** Penalty points cancelled by Forward Observer, when represented. */
  readonly spotterMovementPenaltyCancelled?: number;
  /** Penalty points cancelled by Comm Implant / Boosted Comm Implant. */
  readonly commImplantPenaltyRelief?: number;
  /** LOS result from spotter to target */
  readonly spotterLOS?: ILOSResult;
  /**
   * How the indirect resolution was established.
   * - `'los'`             — a friendly LOS spotter was elected
   * - `'narc'`            — NARC beacon on target by attacker's team
   * - `'inarc'`           — iNarc beacon on target by attacker's team
   * - `'semi-guided-tag'` — semi-guided LRM with active TAG on target
   * Absent when isIndirect=false or permitted=false.
   *
   * @spec openspec/changes/add-indirect-fire-and-spotter-network/specs/indirect-fire-system/spec.md §3
   */
  readonly basis?: IndirectFireBasis;
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

function hasAirborneAeroSpottingEquipment(
  candidate: ISpotterCandidate,
): boolean {
  const equipment = candidate.airborneAeroSpottingEquipment;
  return (
    equipment?.reconCamera === true ||
    equipment?.infraredImager === true ||
    equipment?.hyperspectralImager === true ||
    equipment?.highResolutionImagerDaylight === true
  );
}

/**
 * Check if a unit is eligible to act as a spotter for indirect fire.
 *
 * A valid spotter must:
 * - Be operational (not destroyed/shutdown)
 * - Be on the same team as the attacker
 * - NOT be sprinting/evading (not represented by the current MovementType)
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

  // MegaMek airborne aerospace spotters need represented recon/imager gear.
  if (
    candidate.isAirborneAerospace === true &&
    !hasAirborneAeroSpottingEquipment(candidate)
  ) {
    return false;
  }

  if (
    candidate.movementType === MovementType.Run ||
    candidate.movementType === MovementType.Jump ||
    candidate.movementType === MovementType.Sprint ||
    candidate.movementType === MovementType.Evade ||
    candidate.sprintedThisTurn === true ||
    candidate.isEvading === true
  ) {
    return false;
  }

  return true;
}

export function calculateSpotterMovementPenalty(
  candidate: ISpotterCandidate,
): number {
  if (candidate.isInfantry === true) return 0;

  switch (candidate.movementType) {
    case MovementType.Walk:
      return 1;
    case MovementType.Run:
      return 2;
    case MovementType.Jump:
      return 3;
    case MovementType.Stationary:
    default:
      return 0;
  }
}

function hasCommImplantSpotterRelief(candidate: ISpotterCandidate): boolean {
  const pilotSpas = candidate.pilotSpas ?? [];
  return (
    hasSPA(pilotSpas, 'comm_implant') || hasSPA(pilotSpas, 'boost_comm_implant')
  );
}

/**
 * Check if a spotter has line of sight to the target.
 */
export function spotterHasLOS(
  spotter: ISpotterCandidate,
  targetPosition: IHexCoordinate,
  grid: IHexGrid,
  losOptions?: ILOSCalculationOptions,
): ILOSResult {
  return calculateLOS(
    spotter.position,
    targetPosition,
    grid,
    undefined,
    undefined,
    losOptions,
  );
}

/**
 * Find the best available spotter for an indirect fire attack.
 *
 * Prefers spotters with the lowest represented MegaMek movement penalty.
 * Among equal movement penalty, prefers lower intervening LOS modifiers,
 * then the shorter spotter-target range, then stable unit id ordering.
 */
export function findBestSpotter(
  candidates: readonly ISpotterCandidate[],
  attackerEntityId: string,
  attackerTeamId: string,
  targetPosition: IHexCoordinate,
  grid: IHexGrid,
  losOptions?: ILOSCalculationOptions,
): { spotter: ISpotterCandidate; losResult: ILOSResult } | null {
  // Filter to eligible spotters
  const eligible = candidates.filter((c) =>
    isEligibleSpotter(c, attackerEntityId, attackerTeamId),
  );

  if (eligible.length === 0) return null;

  let best: {
    spotter: ISpotterCandidate;
    losResult: ILOSResult;
    movementPenalty: number;
    losModifier: number;
    distance: number;
  } | null = null;

  for (const candidate of eligible) {
    const losResult = spotterHasLOS(
      candidate,
      targetPosition,
      grid,
      losOptions,
    );
    if (!losResult.hasLOS) continue;

    const contender = {
      spotter: candidate,
      losResult,
      movementPenalty: calculateSpotterMovementPenalty(candidate),
      losModifier: losResult.interveningTerrainEffects.reduce(
        (sum, effect) => sum + effect.modifier,
        0,
      ),
      distance: hexDistance(candidate.position, targetPosition),
    };

    if (
      best === null ||
      contender.movementPenalty < best.movementPenalty ||
      (contender.movementPenalty === best.movementPenalty &&
        contender.losModifier < best.losModifier) ||
      (contender.movementPenalty === best.movementPenalty &&
        contender.losModifier === best.losModifier &&
        contender.distance < best.distance) ||
      (contender.movementPenalty === best.movementPenalty &&
        contender.losModifier === best.losModifier &&
        contender.distance === best.distance &&
        contender.spotter.entityId.localeCompare(best.spotter.entityId) < 0)
    ) {
      best = contender;
    }
  }

  return best;
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
 * 3. The to-hit penalty (+1 base, + spotter movement modifier, +1 if the
 *    spotter attacked this turn; NARC/iNarc = base only) — per MegaMek
 *    ComputeToHit.java L1512-1545 (audit C-5)
 *
 * Resolution priority when attacker has no LOS:
 *   a. NARC mark by attacker's team → basis='narc', spotterId=null
 *   b. iNarc mark by attacker's team → basis='inarc', spotterId=null
 *   c. LOS spotter elected → basis='los'
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
  const obliqueAttackerApplied = obliqueAttackerModifier < 0;

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
  if (request.attackerAirborne === true) {
    return {
      permitted: false,
      reason: 'Airborne units cannot use indirect fire',
      isIndirect: false,
      spotterWalked: false,
      toHitPenalty: 0,
    };
  }

  if (!isIndirectFireCapable(request.weaponId)) {
    return {
      permitted: false,
      reason: `Weapon '${request.weaponId}' is not capable of indirect fire`,
      isIndirect: false,
      spotterWalked: false,
      toHitPenalty: 0,
    };
  }

  // Prefer a represented LOS spotter when one exists; NARC/iNarc then covers
  // otherwise unspotted indirect fire.
  const narcMarked = request.targetNarcMarkedByTeam === true;
  const inarcMarked = request.targetINarcMarkedByTeam === true;

  const spotterResult = findBestSpotter(
    request.spotterCandidates,
    request.attackerEntityId,
    request.attackerTeamId,
    request.targetPosition,
    request.grid,
    request.losOptions,
  );

  if (spotterResult) {
    // LOS spotter found — basis='los'. FO SPA cancels the spotter-walked +1.
    const { spotter, losResult } = spotterResult;
    const spotterWalked = spotter.movementType === MovementType.Walk;
    // Forward Observer SPA cancels the +1 spotter-walked add. The base +1
    // indirect-fire penalty still applies, and run/jump spotter penalties are
    // left intact until those SPA interactions are represented explicitly.
    const hasFoSpa = hasSPA(spotter.pilotSpas ?? [], 'forward_observer');
    const forwardObserverApplied = spotterWalked && hasFoSpa;
    const movementPenalty = forwardObserverApplied
      ? 0
      : calculateSpotterMovementPenalty(spotter);

    // Audit C-5: there is NO spotter-gunnery term for LRM-family indirect
    // fire. The (gunnery-4)/2 modifier the pre-fix code applied here comes
    // from ArtilleryWeaponIndirectFireHandler.java — an artillery-only rule
    // the original comment mis-cited. The LRM indirect to-hit composition is
    // MegaMek ComputeToHit.java L1512-1545: +1 base, spotter movement
    // modifier (Compute.getSpotterMovementModifier, Compute.java L2702-2726),
    // and +1 when the spotter is attacking this turn (L1540-1544).
    const spotterAttackedThisTurn = spotter.attackedThisTurn === true;
    const spotterAttackPenalty = spotterAttackedThisTurn ? 1 : 0;
    const commImplantApplied = hasCommImplantSpotterRelief(spotter);
    const commImplantPenaltyRelief = commImplantApplied ? 1 : 0;

    // Base +1 indirect-fire penalty + movement penalty + spotter-attacked +1,
    // minus the source-backed Comm Implant / Boosted Comm Implant relief.
    const toHitPenalty = Math.max(
      0,
      1 +
        movementPenalty +
        spotterAttackPenalty -
        commImplantPenaltyRelief +
        obliqueAttackerModifier,
    );

    return {
      permitted: true,
      isIndirect: true,
      basis: 'los',
      spotter,
      spotterWalked,
      toHitPenalty,
      spotterAttackedThisTurn,
      forwardObserverApplied,
      obliqueAttackerApplied,
      commImplantApplied,
      spotterMovementPenaltyCancelled: forwardObserverApplied ? 1 : 0,
      commImplantPenaltyRelief,
      spotterLOS: losResult,
    };
  }

  // No spotter and no NARC/iNarc override — reject.
  if (narcMarked) {
    return {
      permitted: true,
      isIndirect: true,
      basis: 'narc',
      spotterWalked: false,
      toHitPenalty: Math.max(0, 1 + obliqueAttackerModifier),
      obliqueAttackerApplied,
    };
  }

  if (inarcMarked) {
    return {
      permitted: true,
      isIndirect: true,
      basis: 'inarc',
      spotterWalked: false,
      toHitPenalty: Math.max(0, 1 + obliqueAttackerModifier),
      obliqueAttackerApplied,
    };
  }

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

export const ECM_NULLIFIED_TAG_INDIRECT_FIRE_BLOCKED_REASON =
  'TAG designation is nullified by ECM; semi-guided indirect fire is unavailable';

function isSemiGuidedContext(context: ISemiGuidedContext): boolean {
  return (
    isSemiGuidedLRM(context.weaponId) || context.equipment.isSemiGuided === true
  );
}

export function semiGuidedTagIndirectFireBlockedReason(
  context: ISemiGuidedContext,
): string | undefined {
  if (!isSemiGuidedContext(context)) return undefined;
  if (
    context.targetStatus.tagDesignated === true &&
    context.targetStatus.ecmProtected === true
  ) {
    return ECM_NULLIFIED_TAG_INDIRECT_FIRE_BLOCKED_REASON;
  }
  return undefined;
}

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
  if (!isSemiGuidedContext(context)) {
    return {
      isSemiGuided: false,
      tagActive: false,
      useStandardToHit: false,
      description: 'Not a semi-guided LRM',
    };
  }

  const blockedReason = semiGuidedTagIndirectFireBlockedReason(context);
  if (blockedReason) {
    return {
      isSemiGuided: true,
      tagActive: false,
      useStandardToHit: false,
      description: blockedReason,
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
  const semiGuidedResult = semiGuidedContext
    ? resolveSemiGuidedLRM(semiGuidedContext)
    : undefined;
  const tagActive =
    semiGuidedResult?.isSemiGuided === true &&
    semiGuidedResult.tagActive === true;

  if (
    tagActive &&
    !request.attackerHasLOS &&
    request.attackerAirborne !== true &&
    isIndirectFireCapable(request.weaponId) &&
    !baseResult.permitted
  ) {
    return {
      permitted: true,
      isIndirect: true,
      basis: 'semi-guided-tag',
      spotterWalked: false,
      toHitPenalty: 0,
    };
  }

  // If not indirect or not permitted, return as-is
  if (!baseResult.isIndirect || !baseResult.permitted) {
    return baseResult;
  }

  if (tagActive) {
    // Audit C-6: MegaMek ComputeToHit.java L1524-1535 — semi-guided ammo at a
    // TAG-designated target takes -1 (cancelling the +1 indirect base) AND
    // the spotter movement/attacked branch is the else-if (L1536), skipped
    // entirely. Net indirect penalty contribution is therefore 0 regardless
    // of spotter state — NOT the composed total minus 1.
    return {
      ...baseResult,
      basis: 'semi-guided-tag',
      toHitPenalty: 0,
      spotterAttackedThisTurn: false,
    };
  }

  return baseResult;
}
