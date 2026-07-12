import {
  IPhysicalAttackInput,
  IPhysicalAttackRestriction,
  PhysicalAttackInvalidReason,
  PhysicalAttackLimb,
  PhysicalAttackType,
  PhysicalTargetObjectType,
} from './types';

export function blocked(
  reason: string,
  reasonCode: PhysicalAttackInvalidReason,
): IPhysicalAttackRestriction {
  return { allowed: false, reason, reasonCode };
}

export const INVALID_PHYSICAL_TARGET_OBJECT_TYPES = new Set([
  'buildingIgnite',
  'hexClear',
  'hexIgnite',
]);

export const CHARGE_DFA_NON_ENTITY_TARGET_OBJECT_TYPES = new Set([
  'building',
  'fuelTank',
]);

export const PUSH_BLOCKED_TARGET_OBJECT_TYPES = new Set([
  'building',
  'fuelTank',
]);
export const THRASH_NON_ENTITY_TARGET_OBJECT_TYPES = new Set([
  'building',
  'fuelTank',
  'buildingIgnite',
  'hexClear',
  'hexIgnite',
]);
export const TACOPS_TRIP_ATTACK_OPTIONS = new Set([
  'tacops_trip_attack',
  'advanced_combat_tac_ops_trip_attack',
  'tacops_trip',
]);
export const TACOPS_JUMP_JET_ATTACK_OPTIONS = new Set([
  'tacops_jump_jet_attack',
  'advanced_combat_tac_ops_jump_jet_attack',
  'jump_jet_attack',
]);
export const TACOPS_GRAPPLING_OPTIONS = new Set([
  'tacops_grappling',
  'advanced_combat_tac_ops_grappling',
  'grappling',
]);
export const CHARGE_CAPABLE_UNIT_TYPES = new Set([
  'battlemech',
  'mek',
  'mech',
  'omnimech',
  'industrialmech',
  'vehicle',
  'supportvehicle',
]);
export const NO_HOVER_CHARGE_OPTION_KEYS = new Set([
  'nohovercharge',
  'advancedgroundmovementnohovercharge',
]);

export function physicalTargetObjectInvalidReason(
  attackType: PhysicalAttackType,
  targetObjectType: PhysicalTargetObjectType | undefined,
): PhysicalAttackInvalidReason | undefined {
  if (targetObjectType === undefined) return undefined;
  if (INVALID_PHYSICAL_TARGET_OBJECT_TYPES.has(targetObjectType)) {
    return 'InvalidPhysicalTarget';
  }
  if (
    (attackType === 'charge' || attackType === 'dfa') &&
    CHARGE_DFA_NON_ENTITY_TARGET_OBJECT_TYPES.has(targetObjectType)
  ) {
    return 'InvalidPhysicalTarget';
  }
  if (
    attackType === 'push' &&
    PUSH_BLOCKED_TARGET_OBJECT_TYPES.has(targetObjectType)
  ) {
    return 'TargetBuilding';
  }
  if (
    attackType === 'thrash' &&
    THRASH_NON_ENTITY_TARGET_OBJECT_TYPES.has(targetObjectType)
  ) {
    return 'InvalidPhysicalTarget';
  }
  return undefined;
}

/**
 * Per `implement-physical-attack-phase` task 3.5: same limb (arm or leg)
 * SHALL NOT be used for both a kick and a punch in the same turn.
 * Returns the conflict when `input.limb` is already in the used-list.
 */
export function limbConflict(
  limb: PhysicalAttackLimb | undefined,
  usedThisTurn: readonly PhysicalAttackLimb[] | undefined,
): boolean {
  if (!limb) return false;
  if (!usedThisTurn || usedThisTurn.length === 0) return false;
  return usedThisTurn.includes(limb);
}

export function targetExistenceRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
  if (input.targetExists === false) {
    return blocked(
      'Physical attacks require an existing target',
      'TargetMissing',
    );
  }

  if (
    input.targetObjectType &&
    INVALID_PHYSICAL_TARGET_OBJECT_TYPES.has(input.targetObjectType)
  ) {
    return blocked(
      'Physical attacks cannot target woods-clearing, building-ignition, or hex-ignition targets',
      'InvalidPhysicalTarget',
    );
  }

  return undefined;
}

export function targetLifecycleRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
  if (input.targetDestroyed) {
    return blocked(
      'Physical attacks cannot target destroyed units',
      'TargetDestroyed',
    );
  }

  if (input.targetRetreated) {
    return blocked(
      'Physical attacks cannot target retreated units',
      'TargetRetreated',
    );
  }

  if (input.targetEjected) {
    return blocked(
      'Physical attacks cannot target ejected units',
      'TargetEjected',
    );
  }

  return undefined;
}

export function attackerPhysicalStateRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
  if (
    input.attackerBoardId !== undefined &&
    input.targetBoardId !== undefined &&
    input.attackerBoardId !== input.targetBoardId
  ) {
    return blocked(
      'Physical attacks require attacker and target on the same board',
      'DifferentBoard',
    );
  }

  if (input.attackerEvading) {
    return blocked(
      'Physical attacks cannot be made while evading',
      'AttackerEvading',
    );
  }

  if (input.attackerLoadingOrUnloadingCargo) {
    return blocked(
      'Physical attacks cannot be made while loading or unloading cargo',
      'AttackerCargoInteraction',
    );
  }

  return undefined;
}

export function targetPhysicalStateRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
  if (input.targetIsPassenger) {
    return blocked(
      'Physical attacks cannot target transported passengers',
      'TargetPassenger',
    );
  }

  if (input.targetIsSwarming && input.attackType !== 'brush-off') {
    return blocked(
      'Physical attacks cannot target units conducting a swarm attack',
      'TargetSwarming',
    );
  }

  if (input.targetIsMakingDFA) {
    return blocked(
      'Physical attacks cannot target units making a DFA attack',
      'TargetMakingDFA',
    );
  }

  const dfaTargetIsAirborneVtolOrWige =
    input.attackType === 'dfa' && input.targetIsAirborneVTOLorWIGE;

  if (input.targetIsAirborne && !dfaTargetIsAirborneVtolOrWige) {
    return blocked(
      'Physical attacks cannot target airborne units',
      'TargetAirborne',
    );
  }

  return undefined;
}

export function targetRelationshipRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
  if (
    input.targetOccupiedBuildingId &&
    input.targetOccupiedBuildingId !== input.attackerOccupiedBuildingId
  ) {
    return blocked(
      'Physical attacks cannot target units inside another building',
      'TargetInsideBuilding',
    );
  }

  if (input.targetIsSelf) {
    return blocked('Physical attacks cannot target the attacker', 'SelfTarget');
  }

  if (input.targetIsFriendly) {
    return blocked(
      'Physical attacks cannot target friendly units',
      'FriendlyTarget',
    );
  }

  return undefined;
}

export function thrashTargetRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
  if (
    input.attackType === 'thrash' &&
    input.targetObjectType &&
    THRASH_NON_ENTITY_TARGET_OBJECT_TYPES.has(input.targetObjectType)
  ) {
    return blocked(
      'Thrash attacks require an infantry unit target',
      'InvalidPhysicalTarget',
    );
  }

  return undefined;
}

export function targetDistanceRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  if (input.targetDistance !== undefined && input.attackType === 'thrash') {
    if (input.targetDistance !== 0) {
      return blocked(
        'Thrash attacks require a target in the same hex',
        'TargetNotSameHex',
      );
    }
  } else if (
    input.targetDistance !== undefined &&
    input.attackType === 'brush-off'
  ) {
    if (input.targetDistance > 1) {
      return blocked(
        'Brush-off attacks require an attached or adjacent target',
        'TargetNotAdjacent',
      );
    }
  } else if (input.targetDistance !== undefined && input.targetDistance !== 1) {
    return blocked(
      'Physical attacks require an adjacent target',
      'TargetNotAdjacent',
    );
  }

  return { allowed: true };
}

export function sharedPhysicalTargetRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  return (
    targetExistenceRestriction(input) ??
    targetLifecycleRestriction(input) ??
    attackerPhysicalStateRestriction(input) ??
    targetPhysicalStateRestriction(input) ??
    targetRelationshipRestriction(input) ??
    thrashTargetRestriction(input) ??
    targetDistanceRestriction(input)
  );
}

export function chargeDfaDisplacementStateRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  if (input.targetIsMakingDisplacementAttack) {
    return blocked(
      'Target is already making a charge/DFA attack',
      'TargetMakingDisplacementAttack',
    );
  }

  if (
    input.targetedByDisplacementAttackerId !== undefined &&
    input.targetedByDisplacementAttackerId !== input.attackerId
  ) {
    return blocked(
      'Target is the target of another charge/DFA',
      'TargetOfDisplacementAttack',
    );
  }

  return { allowed: true };
}

export function chargeDfaTargetObjectRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  if (
    input.targetObjectType &&
    CHARGE_DFA_NON_ENTITY_TARGET_OBJECT_TYPES.has(input.targetObjectType)
  ) {
    return blocked(
      'Charge and DFA require entity targets',
      'InvalidPhysicalTarget',
    );
  }

  return { allowed: true };
}

export const MEK_UNIT_TYPES = new Set([
  'battlemech',
  'mek',
  'mech',
  'omnimech',
  'industrialmech',
]);
export const PROTOMEK_UNIT_TYPES = new Set(['protomek']);
export const INFANTRY_UNIT_TYPES = new Set(['infantry', 'battlearmor']);
export const DROPSHIP_UNIT_TYPES = new Set(['dropship']);
export const DEFAULT_STANDING_MEK_HEIGHT = 1;

export function canonicalUnitType(
  value: string | undefined,
): string | undefined {
  return value?.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function explicitNonMekUnitType(value: string | undefined): boolean {
  const canonical = canonicalUnitType(value);
  return canonical !== undefined && !MEK_UNIT_TYPES.has(canonical);
}

export function legacyOrMekUnitType(value: string | undefined): boolean {
  const canonical = canonicalUnitType(value);
  return canonical === undefined || MEK_UNIT_TYPES.has(canonical);
}

export function knownMekUnitType(value: string | undefined): boolean {
  const canonical = canonicalUnitType(value);
  return canonical !== undefined && MEK_UNIT_TYPES.has(canonical);
}

export function chargeCapableUnitType(value: string | undefined): boolean {
  const canonical = canonicalUnitType(value);
  return canonical === undefined || CHARGE_CAPABLE_UNIT_TYPES.has(canonical);
}

export function protoMekUnitType(value: string | undefined): boolean {
  const canonical = canonicalUnitType(value);
  return canonical !== undefined && PROTOMEK_UNIT_TYPES.has(canonical);
}

export function battleMekOrProtoMekTarget(
  input: IPhysicalAttackInput,
): boolean {
  if (
    input.targetObjectType !== undefined &&
    input.targetObjectType !== 'entity'
  ) {
    return false;
  }
  return (
    legacyOrMekUnitType(input.targetUnitType) ||
    protoMekUnitType(input.targetUnitType)
  );
}

export function infantryUnitType(value: string | undefined): boolean {
  const canonical = canonicalUnitType(value);
  return canonical !== undefined && INFANTRY_UNIT_TYPES.has(canonical);
}

export function standardInfantryUnitType(value: string | undefined): boolean {
  return canonicalUnitType(value) === 'infantry';
}

export function dropshipUnitType(value: string | undefined): boolean {
  const canonical = canonicalUnitType(value);
  return canonical !== undefined && DROPSHIP_UNIT_TYPES.has(canonical);
}

export function verticalBandsOverlap(input: IPhysicalAttackInput): boolean {
  if (input.elevationDifference === undefined) return true;

  const attackerBottom = 0;
  const attackerTop = input.attackerHeight ?? DEFAULT_STANDING_MEK_HEIGHT;
  const targetBottom = input.elevationDifference;
  const targetTop =
    input.elevationDifference +
    (input.targetHeight ?? DEFAULT_STANDING_MEK_HEIGHT);

  return attackerBottom <= targetTop && attackerTop >= targetBottom;
}
