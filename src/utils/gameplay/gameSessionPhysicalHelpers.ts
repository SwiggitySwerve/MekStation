import type { IUnitGameState } from '@/types/gameplay';

import type {
  IPhysicalAttackRestriction,
  JumpJetAttackSelectedLeg,
  PhysicalAttackLimb,
  PhysicalTargetObjectType,
  ThrashAttackBlockingTerrain,
} from './physicalAttacks';

/**
 * Attacker / target bag passed by callers that supply per-unit static
 * data not stored on `IGameUnit` (tonnage, etc.).
 */
export interface IPhysicalAttackContext {
  readonly attackerTonnage: number;
  readonly targetTonnage?: number;
  readonly pilotingSkill: number;
  /** Triple-strength myomer installed on the attacker. */
  readonly hasTSM?: boolean;
  /** True when the physical attack is occurring in water. */
  readonly isUnderwater?: boolean;
  /** Attacker water depth for source-backed Frogman physical to-hit relief. */
  readonly attackerWaterDepth?: number;
  readonly arm?: 'left' | 'right';
  readonly hexesMoved?: number;
  readonly weaponsFiredFromArm?: readonly string[];
  /**
   * Per `implement-physical-attack-phase` task 4.3 / 5.3: target movement
   * modifier (TMM). Threaded into punch / kick / melee / DFA to-hit.
   */
  readonly targetMovementModifier?: number;
  /**
   * Explicit non-unit physical target kind. Runtime declarations normally
   * carry unit ids; this lets event-sourced command validation model
   * source-backed building, fuel-tank, gun-emplacement, and hex-target
   * rejection semantics without pretending those are combat units.
   */
  readonly targetObjectType?: PhysicalTargetObjectType;
  /**
   * Per task 6.1: attacker-movement modifier for charge to-hit.
   */
  readonly attackerMovementModifier?: number;
  /**
   * Charge target movement gate. False rejects unless the target is immobile.
   * Undefined preserves callers that do not model movement completion.
   */
  readonly targetMovementComplete?: boolean;
  /**
   * Per task 3.5: limbs already used for physical attacks this turn
   * (same limb cannot punch AND kick in one turn).
   */
  readonly limbsUsedThisTurn?: readonly PhysicalAttackLimb[];
  /**
   * Per task 2.3: the limb this declaration targets (required for punch
   * and kick; optional for club attacks).
   */
  readonly limb?: PhysicalAttackLimb;
  /**
   * Per tasks 3.3 / 3.4: actuator-presence booleans feed the restriction
   * validator — destruction lives in `componentDamage`, but "mech was
   * built without this actuator" is a separate concern.
   */
  readonly lowerArmActuatorPresent?: boolean;
  readonly handActuatorPresent?: boolean;
  readonly upperLegActuatorPresent?: boolean;
  readonly footActuatorPresent?: boolean;
  /**
   * Per-leg talon state for source-backed kick/DFA damage modifiers.
   * Equipment hydration is optional today, so callers may supply it
   * explicitly through the physical context. Quad/non-biped front-leg
   * talons are represented by arm-location state, matching MegaMek.
   */
  readonly leftLegHasTalons?: boolean;
  readonly rightLegHasTalons?: boolean;
  readonly leftArmHasTalons?: boolean;
  readonly rightArmHasTalons?: boolean;
  readonly leftFootActuatorPresent?: boolean;
  readonly rightFootActuatorPresent?: boolean;
  readonly leftArmFootActuatorPresent?: boolean;
  readonly rightArmFootActuatorPresent?: boolean;
  /**
   * Per-arm claw state for source-backed punch damage/to-hit modifiers.
   * Equipment hydration is optional today, so callers may supply it
   * explicitly through the physical context.
   */
  readonly leftArmHasClaw?: boolean;
  readonly rightArmHasClaw?: boolean;
  /**
   * Per tasks 3.6 / 3.7: DFA requires a jump; charge requires a run.
   */
  readonly attackerJumpedThisTurn?: boolean;
  /** True when this turn's jump used mechanical jump boosters instead of normal jump movement. */
  readonly attackerUsedMechanicalJumpBooster?: boolean;
  /** Attacker jump MP for DFA reach against airborne VTOL/WIGE targets. */
  readonly attackerJumpMP?: number;
  readonly attackerRanThisTurn?: boolean;
  /** True when the attacker's MovementDeclared step chain used backward movement. */
  readonly attackerMovedBackwardThisTurn?: boolean;
  /**
   * Source-backed retractable blade gate. False means the blade is still
   * retracted and cannot be used for a club attack.
   */
  readonly retractableBladeExtended?: boolean;
  /**
   * Per task 8.5: the destination hex for a push. If `false` the caller
   * has already determined the push target hex is blocked / off-map.
   */
  readonly pushDestinationValid?: boolean;
  /** Pilot abilities and unit quirks that modify physical attacks. */
  readonly pilotAbilities?: readonly string[];
  readonly unitQuirks?: readonly string[];
  /** Target elevation minus attacker elevation. */
  readonly elevationDifference?: number;
  readonly optionalRules?: readonly string[];
  readonly tacOpsTripAttackEnabled?: boolean;
  readonly attackerAlreadyGrappled?: boolean;
  readonly targetInFrontArc?: boolean;
  readonly leftTripLimbUsable?: boolean;
  readonly rightTripLimbUsable?: boolean;
  readonly legAesFunctional?: boolean;
  readonly thrashBlockingTerrains?: readonly ThrashAttackBlockingTerrain[];
  readonly hasWorkingThrashArmOrLeg?: boolean;
  readonly tacOpsJumpJetAttackEnabled?: boolean;
  readonly jumpJetAttackSelectedLeg?: JumpJetAttackSelectedLeg;
  readonly leftReadyJumpJetCount?: number;
  readonly rightReadyJumpJetCount?: number;
  readonly leftLegWet?: boolean;
  readonly rightLegWet?: boolean;
  readonly leftLegWeaponFiredThisTurn?: boolean;
  readonly rightLegWeaponFiredThisTurn?: boolean;
  readonly standingAttackerHeightAboveTargetHeight?: number;
  readonly proneTargetElevationInRange?: boolean;
  readonly targetDirectlyAheadOfFeet?: boolean;
  readonly targetDirectlyBehindFeet?: boolean;
  readonly targetIsSwarmingInfantryOnAttacker?: boolean;
  readonly targetIsINarcPod?: boolean;
  readonly armAesFunctional?: boolean;
  readonly torsoMountedCockpit?: boolean;
  readonly headSensorHits?: number;
  readonly centerTorsoSensorHits?: number;
  readonly defenderHasMagneticClaws?: boolean;
}

type ArmSide = 'left' | 'right';
type LegSide = 'left' | 'right';

function normalizeMountedLocation(location: string | undefined): string {
  return (location ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function isArmMountedLocation(location: string, arm?: ArmSide): boolean {
  if (arm === 'left') return location === 'left_arm' || location === 'la';
  if (arm === 'right') return location === 'right_arm' || location === 'ra';
  return (
    location === 'left_arm' ||
    location === 'la' ||
    location === 'right_arm' ||
    location === 'ra'
  );
}

function isLegMountedLocation(location: string, leg?: LegSide): boolean {
  if (leg === 'left') return location === 'left_leg' || location === 'll';
  if (leg === 'right') return location === 'right_leg' || location === 'rl';
  return (
    location === 'left_leg' ||
    location === 'll' ||
    location === 'right_leg' ||
    location === 'rl'
  );
}

export function firedWeaponIdsFromMountedArm(
  unit: Pick<IUnitGameState, 'weaponsFiredThisTurn' | 'weaponLocationById'>,
  arm?: ArmSide,
): readonly string[] {
  const firedWeaponIds = unit.weaponsFiredThisTurn ?? [];
  if (firedWeaponIds.length === 0) return [];

  const weaponLocationById = unit.weaponLocationById;
  if (weaponLocationById === undefined) return firedWeaponIds;

  return firedWeaponIds.filter((weaponId) => {
    const mountedLocation = normalizeMountedLocation(
      weaponLocationById[weaponId],
    );
    return (
      mountedLocation.length === 0 || isArmMountedLocation(mountedLocation, arm)
    );
  });
}

export function firedWeaponIdsFromMountedLeg(
  unit: Pick<IUnitGameState, 'weaponsFiredThisTurn' | 'weaponLocationById'>,
  leg?: LegSide,
): readonly string[] {
  const firedWeaponIds = unit.weaponsFiredThisTurn ?? [];
  if (firedWeaponIds.length === 0) return [];

  const weaponLocationById = unit.weaponLocationById;
  if (weaponLocationById === undefined) return firedWeaponIds;

  return firedWeaponIds.filter((weaponId) => {
    const mountedLocation = normalizeMountedLocation(
      weaponLocationById[weaponId],
    );
    return (
      mountedLocation.length === 0 || isLegMountedLocation(mountedLocation, leg)
    );
  });
}

/**
 * Per `implement-physical-attack-phase` task 3.8: project a
 * restriction result's reason code to the canonical trigger source
 * consumed by the PSR queue. Used only for `AttackerProne` and
 * `LimbMissing` today; unknown codes fall through to a generic
 * descriptor.
 */
export function buildRestrictionEventReason(
  restriction: IPhysicalAttackRestriction,
): string {
  return (
    restriction.reasonCode ?? restriction.reason ?? 'PhysicalAttackInvalid'
  );
}
