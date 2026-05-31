import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { hasNoArms } from '@/utils/gameplay/quirkModifiers';

import {
  canBreakGrapple,
  type BreakGrappleAttackInvalidReason,
} from './breakGrappleEligibility';
import {
  canBrushOff,
  type BrushOffAttackInvalidReason,
} from './brushOffEligibility';
import {
  canGrapple,
  type GrappleAttackInvalidReason,
  type GrappleAttackSide,
} from './grappleEligibility';
import {
  canJumpJetAttack,
  type JumpJetAttackInvalidReason,
  type JumpJetAttackSelectedLeg,
} from './jumpJetAttackEligibility';
import { canThrash, type ThrashAttackInvalidReason } from './thrashEligibility';
import { canTrip, type TripAttackInvalidReason } from './tripEligibility';
import {
  IPhysicalAttackInput,
  IPhysicalAttackRestriction,
  PhysicalAttackInvalidReason,
  PhysicalAttackLimb,
  PhysicalAttackType,
  PhysicalTargetObjectType,
} from './types';

function blocked(
  reason: string,
  reasonCode: PhysicalAttackInvalidReason,
): IPhysicalAttackRestriction {
  return { allowed: false, reason, reasonCode };
}

const INVALID_PHYSICAL_TARGET_OBJECT_TYPES = new Set([
  'buildingIgnite',
  'hexClear',
  'hexIgnite',
]);

const CHARGE_DFA_NON_ENTITY_TARGET_OBJECT_TYPES = new Set([
  'building',
  'fuelTank',
]);

const PUSH_BLOCKED_TARGET_OBJECT_TYPES = new Set(['building', 'fuelTank']);
const THRASH_NON_ENTITY_TARGET_OBJECT_TYPES = new Set([
  'building',
  'fuelTank',
  'buildingIgnite',
  'hexClear',
  'hexIgnite',
]);
const TACOPS_TRIP_ATTACK_OPTIONS = new Set([
  'tacops_trip_attack',
  'advanced_combat_tac_ops_trip_attack',
  'tacops_trip',
]);
const TACOPS_JUMP_JET_ATTACK_OPTIONS = new Set([
  'tacops_jump_jet_attack',
  'advanced_combat_tac_ops_jump_jet_attack',
  'jump_jet_attack',
]);
const TACOPS_GRAPPLING_OPTIONS = new Set([
  'tacops_grappling',
  'advanced_combat_tac_ops_grappling',
  'grappling',
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
function limbConflict(
  limb: PhysicalAttackLimb | undefined,
  usedThisTurn: readonly PhysicalAttackLimb[] | undefined,
): boolean {
  if (!limb) return false;
  if (!usedThisTurn || usedThisTurn.length === 0) return false;
  return usedThisTurn.includes(limb);
}

function sharedPhysicalTargetRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
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

function chargeDfaDisplacementStateRestriction(
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

function chargeDfaTargetObjectRestriction(
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

const MEK_UNIT_TYPES = new Set([
  'battlemech',
  'mek',
  'mech',
  'omnimech',
  'industrialmech',
]);
const PROTOMEK_UNIT_TYPES = new Set(['protomek']);
const INFANTRY_UNIT_TYPES = new Set(['infantry', 'battlearmor']);
const DROPSHIP_UNIT_TYPES = new Set(['dropship']);
const DEFAULT_STANDING_MEK_HEIGHT = 1;

function canonicalUnitType(value: string | undefined): string | undefined {
  return value?.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function explicitNonMekUnitType(value: string | undefined): boolean {
  const canonical = canonicalUnitType(value);
  return canonical !== undefined && !MEK_UNIT_TYPES.has(canonical);
}

function legacyOrMekUnitType(value: string | undefined): boolean {
  const canonical = canonicalUnitType(value);
  return canonical === undefined || MEK_UNIT_TYPES.has(canonical);
}

function protoMekUnitType(value: string | undefined): boolean {
  const canonical = canonicalUnitType(value);
  return canonical !== undefined && PROTOMEK_UNIT_TYPES.has(canonical);
}

function battleMekOrProtoMekTarget(input: IPhysicalAttackInput): boolean {
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

function infantryUnitType(value: string | undefined): boolean {
  const canonical = canonicalUnitType(value);
  return canonical !== undefined && INFANTRY_UNIT_TYPES.has(canonical);
}

function standardInfantryUnitType(value: string | undefined): boolean {
  return canonicalUnitType(value) === 'infantry';
}

function dropshipUnitType(value: string | undefined): boolean {
  const canonical = canonicalUnitType(value);
  return canonical !== undefined && DROPSHIP_UNIT_TYPES.has(canonical);
}

function verticalBandsOverlap(input: IPhysicalAttackInput): boolean {
  if (input.elevationDifference === undefined) return true;

  const attackerBottom = 0;
  const attackerTop = input.attackerHeight ?? DEFAULT_STANDING_MEK_HEIGHT;
  const targetBottom = input.elevationDifference;
  const targetTop =
    input.elevationDifference +
    (input.targetHeight ?? DEFAULT_STANDING_MEK_HEIGHT);

  return attackerBottom <= targetTop && attackerTop >= targetBottom;
}

function meleeWeaponIsArmMounted(
  attackType: IPhysicalAttackInput['attackType'],
): boolean {
  return attackType !== 'wrecking-ball';
}

function meleeWeaponNeedsHand(
  attackType: IPhysicalAttackInput['attackType'],
): boolean {
  return (
    attackType !== 'flail' &&
    attackType !== 'lance' &&
    attackType !== 'wrecking-ball'
  );
}

function attackerLocationDestroyed(
  input: IPhysicalAttackInput,
  location: string,
): boolean {
  return input.attackerDestroyedLocations?.includes(location) ?? false;
}

function attackerHasWorkingThrashArmOrLeg(
  input: IPhysicalAttackInput,
): boolean {
  if (input.hasWorkingThrashArmOrLeg !== undefined) {
    return input.hasWorkingThrashArmOrLeg;
  }

  return ['left_arm', 'right_arm', 'left_leg', 'right_leg'].some(
    (location) => !attackerLocationDestroyed(input, location),
  );
}

function optionalRuleEnabled(
  optionalRules: readonly string[] | undefined,
  aliases: ReadonlySet<string>,
): boolean {
  return (
    optionalRules?.some((rule) =>
      aliases.has(
        rule
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, '_'),
      ),
    ) ?? false
  );
}

function tripAttackEnabled(input: IPhysicalAttackInput): boolean {
  return (
    input.tacOpsTripAttackEnabled === true ||
    optionalRuleEnabled(input.optionalRules, TACOPS_TRIP_ATTACK_OPTIONS)
  );
}

function jumpJetAttackEnabled(input: IPhysicalAttackInput): boolean {
  return (
    input.tacOpsJumpJetAttackEnabled === true ||
    optionalRuleEnabled(input.optionalRules, TACOPS_JUMP_JET_ATTACK_OPTIONS)
  );
}

function grapplingEnabled(input: IPhysicalAttackInput): boolean {
  return (
    input.tacOpsGrapplingEnabled === true ||
    optionalRuleEnabled(input.optionalRules, TACOPS_GRAPPLING_OPTIONS)
  );
}

function selectedJumpJetAttackLeg(
  input: IPhysicalAttackInput,
): JumpJetAttackSelectedLeg {
  if (input.jumpJetAttackSelectedLeg) return input.jumpJetAttackSelectedLeg;
  return input.limb === 'leftLeg' ? 'left' : 'right';
}

function tripTargetIsMek(input: IPhysicalAttackInput): boolean {
  if (
    input.targetObjectType !== undefined &&
    input.targetObjectType !== 'entity'
  ) {
    return false;
  }
  return !explicitNonMekUnitType(input.targetUnitType);
}

function tripLimbUsable(
  input: IPhysicalAttackInput,
  side: 'left' | 'right',
): boolean {
  const explicit =
    side === 'left' ? input.leftTripLimbUsable : input.rightTripLimbUsable;
  if (explicit !== undefined) return explicit;
  if (input.componentDamage.actuators[ActuatorType.HIP]) return false;
  const location = side === 'left' ? 'left_leg' : 'right_leg';
  return !attackerLocationDestroyed(input, location);
}

function mapTripInvalidReason(
  reasonCode: TripAttackInvalidReason | undefined,
): PhysicalAttackInvalidReason | undefined {
  switch (reasonCode) {
    case 'LegMissing':
      return 'LimbMissing';
    default:
      return reasonCode;
  }
}

function mapThrashInvalidReason(
  reasonCode: ThrashAttackInvalidReason | undefined,
): PhysicalAttackInvalidReason | undefined {
  switch (reasonCode) {
    case 'InvalidExplicitTarget':
      return 'InvalidPhysicalTarget';
    default:
      return reasonCode;
  }
}

function mapJumpJetAttackInvalidReason(
  reasonCode: JumpJetAttackInvalidReason | undefined,
): PhysicalAttackInvalidReason | undefined {
  switch (reasonCode) {
    case 'LegMissing':
      return 'LimbMissing';
    case 'TargetElevationNotInRange':
      return 'ElevationMismatch';
    case 'TargetNotDirectlyAheadOfFeet':
      return 'TargetNotDirectlyAhead';
    default:
      return reasonCode;
  }
}

function mapBrushOffInvalidReason(
  reasonCode: BrushOffAttackInvalidReason | undefined,
): PhysicalAttackInvalidReason | undefined {
  switch (reasonCode) {
    case 'InvalidArmSelection':
      return 'InvalidArmSelection';
    case 'InvalidTarget':
      return 'InvalidBrushOffTarget';
    case 'ArmMissing':
      return 'LimbMissing';
    case 'ArmWeaponFiredThisTurn':
      return 'WeaponFiredThisTurn';
    case 'TargetMakingDfa':
      return 'TargetMakingDFA';
    case 'InvalidExplicitTarget':
      return 'InvalidPhysicalTarget';
    default:
      return reasonCode;
  }
}

function mapGrappleInvalidReason(
  reasonCode: GrappleAttackInvalidReason | undefined,
): PhysicalAttackInvalidReason | undefined {
  switch (reasonCode) {
    case 'ArmMissing':
      return 'LimbMissing';
    case 'ShoulderMissingOrDestroyed':
      return 'ShoulderDestroyed';
    default:
      return reasonCode;
  }
}

function mapBreakGrappleInvalidReason(
  reasonCode: BreakGrappleAttackInvalidReason | undefined,
): PhysicalAttackInvalidReason | undefined {
  return reasonCode;
}

function selectedPunchArmDestroyed(input: IPhysicalAttackInput): boolean {
  if (input.limb === 'leftArm' || input.arm === 'left') {
    return attackerLocationDestroyed(input, 'left_arm');
  }
  return attackerLocationDestroyed(input, 'right_arm');
}

function anyKickLegDestroyed(input: IPhysicalAttackInput): boolean {
  return (
    attackerLocationDestroyed(input, 'left_leg') ||
    attackerLocationDestroyed(input, 'right_leg')
  );
}

function selectedBrushOffArm(input: IPhysicalAttackInput): 'left' | 'right' {
  if (input.limb === 'leftArm' || input.arm === 'left') return 'left';
  return 'right';
}

function selectedBrushOffArmMissing(input: IPhysicalAttackInput): boolean {
  return attackerLocationDestroyed(
    input,
    selectedBrushOffArm(input) === 'left' ? 'left_arm' : 'right_arm',
  );
}

function selectedGrappleSide(input: IPhysicalAttackInput): GrappleAttackSide {
  if (input.grappleSide) return input.grappleSide;
  if (input.limb === 'leftArm' || input.arm === 'left') return 'left';
  if (input.limb === 'rightArm' || input.arm === 'right') return 'right';
  return 'both';
}

function grappleSelectsLeft(side: GrappleAttackSide): boolean {
  return side === 'left' || side === 'both';
}

function grappleSelectsRight(side: GrappleAttackSide): boolean {
  return side === 'right' || side === 'both';
}

export function canPunch(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const unitQuirks = input.unitQuirks ?? [];

  if (hasNoArms(unitQuirks)) {
    return {
      allowed: false,
      reason: 'No Arms quirk prevents punch attacks',
      reasonCode: 'NoArmsQuirk',
    };
  }

  const actuators = input.componentDamage.actuators;

  if (selectedPunchArmDestroyed(input)) {
    return {
      allowed: false,
      reason: 'Punching arm missing',
      reasonCode: 'LimbMissing',
    };
  }

  // Per task 3.1: shoulder destroyed disqualifies the arm entirely.
  if (actuators[ActuatorType.SHOULDER]) {
    return {
      allowed: false,
      reason: 'Shoulder actuator destroyed',
      reasonCode: 'ShoulderDestroyed',
    };
  }

  // Per task 3.1: the arm that fired a weapon this turn cannot punch.
  if (input.weaponsFiredFromArm && input.weaponsFiredFromArm.length > 0) {
    return {
      allowed: false,
      reason: 'Arm fired weapons this turn',
      reasonCode: 'WeaponFiredThisTurn',
    };
  }

  // Per task 3.3: punch requires lower arm OR hand actuator present.
  // `undefined` means "caller didn't supply presence info" → fall back
  // to legacy behavior (allowed). Explicit `false` for both blocks the
  // attack.
  if (
    input.lowerArmActuatorPresent === false &&
    input.handActuatorPresent === false
  ) {
    return {
      allowed: false,
      reason: 'Lower-arm and hand actuators both missing',
      reasonCode: 'MissingActuator',
    };
  }

  // Per task 3.5: same limb already used this turn → reject.
  if (limbConflict(input.limb, input.limbsUsedThisTurn)) {
    return {
      allowed: false,
      reason: 'Limb already used this turn',
      reasonCode: 'SameLimbUsedThisTurn',
    };
  }

  return { allowed: true };
}

export function canKick(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  if (input.attackerProne) {
    return {
      allowed: false,
      reason: 'Cannot kick while prone',
      reasonCode: 'AttackerProne',
    };
  }

  const actuators = input.componentDamage.actuators;
  if (anyKickLegDestroyed(input)) {
    return {
      allowed: false,
      reason: 'Leg missing',
      reasonCode: 'LimbMissing',
    };
  }

  // Per task 3.2: hip crit disqualifies the leg entirely.
  if (actuators[ActuatorType.HIP]) {
    return {
      allowed: false,
      reason: 'Hip actuator destroyed',
      reasonCode: 'HipDestroyed',
    };
  }

  // Per task 3.4: kick requires upper leg + foot actuators present.
  if (input.upperLegActuatorPresent === false) {
    return {
      allowed: false,
      reason: 'Upper leg actuator missing',
      reasonCode: 'MissingActuator',
    };
  }
  if (input.footActuatorPresent === false) {
    return {
      allowed: false,
      reason: 'Foot actuator missing',
      reasonCode: 'MissingActuator',
    };
  }

  // Per task 3.5: same limb already used this turn → reject.
  if (limbConflict(input.limb, input.limbsUsedThisTurn)) {
    return {
      allowed: false,
      reason: 'Limb already used this turn',
      reasonCode: 'SameLimbUsedThisTurn',
    };
  }

  return { allowed: true };
}

export function canMeleeWeapon(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  if (
    input.attackType === 'retractable-blade' &&
    input.retractableBladeExtended === false
  ) {
    return {
      allowed: false,
      reason: 'Retractable blade is not extended',
      reasonCode: 'RetractableBladeNotExtended',
    };
  }

  const unitQuirks = input.unitQuirks ?? [];
  const armMounted = meleeWeaponIsArmMounted(input.attackType);
  const needsHand = meleeWeaponNeedsHand(input.attackType);

  if (input.attackerIsQuad && input.attackType !== 'wrecking-ball') {
    return {
      allowed: false,
      reason: 'Quad BattleMechs cannot use this melee weapon',
      reasonCode: 'AttackerQuad',
    };
  }

  if (armMounted && hasNoArms(unitQuirks)) {
    return {
      allowed: false,
      reason: 'No Arms quirk prevents arm-mounted melee attacks',
      reasonCode: 'NoArmsQuirk',
    };
  }

  const actuators = input.componentDamage.actuators;

  if (
    armMounted &&
    input.weaponsFiredFromArm &&
    input.weaponsFiredFromArm.length > 0
  ) {
    return {
      allowed: false,
      reason: 'Arm fired weapons this turn',
      reasonCode: 'WeaponFiredThisTurn',
    };
  }

  if (armMounted && actuators[ActuatorType.SHOULDER]) {
    return {
      allowed: false,
      reason: 'Shoulder actuator destroyed',
      reasonCode: 'ShoulderDestroyed',
    };
  }

  // Per `physical-weapons-system` delta "Missing hand/lower-arm blocks
  // club attack": destruction of either actuator blocks the attack.
  if (armMounted && actuators[ActuatorType.LOWER_ARM]) {
    return {
      allowed: false,
      reason: 'Lower arm actuator destroyed',
      reasonCode: 'MissingActuator',
    };
  }

  if (armMounted && needsHand && actuators[ActuatorType.HAND]) {
    return {
      allowed: false,
      reason: 'Hand actuator destroyed',
      reasonCode: 'MissingActuator',
    };
  }

  return { allowed: true };
}

/**
 * Per `implement-physical-attack-phase` task 3.6: DFA requires the
 * attacker to have jumped this turn.
 */
export function canDFA(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const targetObjectRestriction = chargeDfaTargetObjectRestriction(input);
  if (!targetObjectRestriction.allowed) return targetObjectRestriction;

  if (input.attackerUsedMechanicalJumpBooster) {
    return {
      allowed: false,
      reason: 'DFA cannot use mechanical jump boosters',
      reasonCode: 'MechanicalJumpBooster',
    };
  }

  if (input.attackerJumpedThisTurn === false) {
    return {
      allowed: false,
      reason: 'DFA requires a jump this turn',
      reasonCode: 'NoJumpThisTurn',
    };
  }
  if (infantryUnitType(input.attackerUnitType)) {
    return {
      allowed: false,
      reason: 'Infantry cannot DFA',
      reasonCode: 'AttackerInfantry',
    };
  }
  if (input.attackerProne) {
    return {
      allowed: false,
      reason: 'Cannot DFA while prone',
      reasonCode: 'AttackerProne',
    };
  }
  if (input.targetIsAirborneVTOLorWIGE) {
    const attackerJumpMP = input.attackerJumpMP ?? 0;
    const targetAboveAttackerTop =
      (input.elevationDifference ?? 0) -
      (input.attackerHeight ?? DEFAULT_STANDING_MEK_HEIGHT);

    if (targetAboveAttackerTop > attackerJumpMP) {
      return blocked(
        'DFA target elevation is beyond attacker jump MP',
        'ElevationMismatch',
      );
    }
  }
  if (dropshipUnitType(input.targetUnitType)) {
    return blocked('Cannot DFA a DropShip target', 'TargetDropShip');
  }
  if (input.targetMovementComplete === false && input.targetImmobile !== true) {
    return blocked(
      'DFA target must be done with movement',
      'TargetMovementIncomplete',
    );
  }
  const displacementRestriction = chargeDfaDisplacementStateRestriction(input);
  if (!displacementRestriction.allowed) return displacementRestriction;

  return { allowed: true };
}

/**
 * Per `implement-physical-attack-phase` task 3.7: charge requires the
 * attacker to have run this turn.
 */
export function canCharge(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const targetObjectRestriction = chargeDfaTargetObjectRestriction(input);
  if (!targetObjectRestriction.allowed) return targetObjectRestriction;

  if (input.attackerJumpedThisTurn) {
    return blocked('No jumping allowed while charging', 'ChargeJumpMovement');
  }
  if (input.attackerRanThisTurn === false) {
    return blocked('Charge requires a run this turn', 'NoRunThisTurn');
  }
  if (input.attackerMovedBackwardThisTurn) {
    return blocked(
      'No backwards movement allowed while charging',
      'ChargeBackwardMovement',
    );
  }
  if (input.attackerProne) {
    return blocked('Cannot charge while prone', 'AttackerProne');
  }
  if (legacyOrMekUnitType(input.attackerUnitType)) {
    if (input.targetObjectType === 'gunEmplacement') {
      return blocked('Charge target must be a Mek', 'TargetNotMek');
    }
    if (explicitNonMekUnitType(input.targetUnitType)) {
      return blocked('Charge target must be a Mek', 'TargetNotMek');
    }
    if (input.targetProne) {
      return blocked('Charge target must be standing', 'TargetProne');
    }
  } else if (
    infantryUnitType(input.targetUnitType) ||
    canonicalUnitType(input.targetUnitType) === 'protomech'
  ) {
    return blocked(
      'Cannot charge Infantry or ProtoMech targets',
      'TargetInfantryOrProtoMek',
    );
  }
  if (!verticalBandsOverlap(input)) {
    return blocked(
      'Charge target must overlap attacker elevation',
      'ElevationMismatch',
    );
  }
  if (input.targetIsMakingDisplacementAttack) {
    return blocked(
      'Target is already making a charge/DFA attack',
      'TargetMakingDisplacementAttack',
    );
  }
  if (input.targetMovementComplete === false && input.targetImmobile !== true) {
    return blocked(
      'Charge target must be done with movement',
      'TargetMovementIncomplete',
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

/**
 * Per `implement-physical-attack-phase` task 8.5: a push cannot be
 * declared when the target's displacement hex is blocked or off-map.
 */
export function canPush(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const unitQuirks = input.unitQuirks ?? [];
  const destroyedLocations = input.attackerDestroyedLocations ?? [];

  if (explicitNonMekUnitType(input.attackerUnitType)) {
    return {
      allowed: false,
      reason: 'Non-Meks cannot push',
      reasonCode: 'AttackerNotMek',
    };
  }

  if (input.attackerIsQuad) {
    return {
      allowed: false,
      reason: 'Quad BattleMechs cannot push',
      reasonCode: 'AttackerQuad',
    };
  }

  if (input.attackerIsAirborne) {
    return {
      allowed: false,
      reason: 'Cannot push while airborne',
      reasonCode: 'AttackerAirborne',
    };
  }

  if (input.attackerArmsFlipped) {
    return {
      allowed: false,
      reason: 'Cannot push with arms flipped to the rear',
      reasonCode: 'ArmsFlipped',
    };
  }

  if (
    input.targetObjectType &&
    PUSH_BLOCKED_TARGET_OBJECT_TYPES.has(input.targetObjectType)
  ) {
    return {
      allowed: false,
      reason: 'Push cannot target buildings or fuel tanks',
      reasonCode: 'TargetBuilding',
    };
  }

  if (explicitNonMekUnitType(input.targetUnitType)) {
    return {
      allowed: false,
      reason: 'Push target must be a Mek',
      reasonCode: 'TargetNotMek',
    };
  }

  if (input.targetObjectType === 'gunEmplacement') {
    return {
      allowed: false,
      reason: 'Push target must be a Mek',
      reasonCode: 'TargetNotMek',
    };
  }

  if (
    destroyedLocations.includes('left_arm') ||
    destroyedLocations.includes('right_arm')
  ) {
    return {
      allowed: false,
      reason: 'Both arms must be present to push',
      reasonCode: 'LimbMissing',
    };
  }

  if (hasNoArms(unitQuirks)) {
    return {
      allowed: false,
      reason: 'No Arms quirk prevents push attacks',
      reasonCode: 'NoArmsQuirk',
    };
  }

  if (
    input.elevationDifference !== undefined &&
    input.elevationDifference !== 0
  ) {
    return {
      allowed: false,
      reason: 'Push requires the target to be at the same elevation',
      reasonCode: 'ElevationMismatch',
    };
  }

  if (input.targetIsMakingDisplacementAttack && !input.targetIsPushing) {
    return {
      allowed: false,
      reason: 'Target is making a charge/DFA attack',
      reasonCode: 'TargetMakingDisplacementAttack',
    };
  }

  if (
    input.targetIsPushing &&
    input.targetDisplacementAttackTargetId !== input.attackerId
  ) {
    return {
      allowed: false,
      reason: 'Target is pushing another Mek',
      reasonCode: 'TargetPushingAnotherMek',
    };
  }

  if (
    input.attackerTargetedByDisplacementAttackerId !== undefined &&
    input.attackerTargetedByDisplacementAttackerId !== input.targetId
  ) {
    return {
      allowed: false,
      reason: 'Attacker is the target of another push/charge/DFA',
      reasonCode: 'AttackerTargetOfDisplacementAttack',
    };
  }

  if (
    input.targetedByDisplacementAttackerId !== undefined &&
    input.targetedByDisplacementAttackerId !== input.attackerId
  ) {
    return {
      allowed: false,
      reason: 'Target is the target of another push/charge/DFA',
      reasonCode: 'TargetOfDisplacementAttack',
    };
  }

  if (input.attackerProne) {
    return {
      allowed: false,
      reason: 'Cannot push while prone',
      reasonCode: 'AttackerProne',
    };
  }

  if (input.targetProne) {
    return {
      allowed: false,
      reason: 'Cannot push prone targets',
      reasonCode: 'TargetProne',
    };
  }

  if (input.weaponsFiredFromArm && input.weaponsFiredFromArm.length > 0) {
    return {
      allowed: false,
      reason: 'Arm fired weapons this turn',
      reasonCode: 'WeaponFiredThisTurn',
    };
  }

  if (input.pushDestinationValid === false) {
    return {
      allowed: false,
      reason: 'Push destination blocked',
      reasonCode: 'DestinationBlocked',
    };
  }
  if (input.pushTargetDirectlyAhead === false) {
    return {
      allowed: false,
      reason: 'Push target must be directly ahead of attacker facing',
      reasonCode: 'TargetNotDirectlyAhead',
    };
  }
  return { allowed: true };
}

export function canBrushOffPhysical(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const brushOffRestriction = canBrushOff({
    attackerIsMek: !explicitNonMekUnitType(input.attackerUnitType),
    selectedArm: selectedBrushOffArm(input),
    targetIsSwarmingInfantryOnAttacker:
      input.targetIsSwarmingInfantryOnAttacker,
    targetIsINarcPod: input.targetIsINarcPod,
    attackerIsQuad: input.attackerIsQuad,
    armsFlipped: input.attackerArmsFlipped,
    selectedArmMissing: selectedBrushOffArmMissing(input),
    noMinimalArmsQuirk: hasNoArms(input.unitQuirks ?? []),
    shoulderWorking: !input.componentDamage.actuators[ActuatorType.SHOULDER],
    armWeaponFiredThisTurn: (input.weaponsFiredFromArm?.length ?? 0) > 0,
    targetMakingDfa: input.targetIsMakingDFA,
    attackerProne: input.attackerProne,
    targetIsBuildingFuelTankOrHex:
      input.targetObjectType !== undefined &&
      input.targetObjectType !== 'entity',
  });

  if (brushOffRestriction.allowed) return { allowed: true };

  return {
    allowed: false,
    reason: brushOffRestriction.reason,
    reasonCode: mapBrushOffInvalidReason(brushOffRestriction.reasonCode),
  };
}

export function canGrapplePhysical(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const grappleSide = selectedGrappleSide(input);
  const counterGrapple =
    input.attackerGrappledTargetId === input.targetId &&
    input.attackerIsGrappleAttacker === false;
  const attackerIsProtoMek = protoMekUnitType(input.attackerUnitType);
  const attackerIsBipedMek =
    !attackerIsProtoMek &&
    legacyOrMekUnitType(input.attackerUnitType) &&
    input.attackerIsQuad !== true;
  const targetIsProtoMek = protoMekUnitType(input.targetUnitType);
  const targetIsMek = !targetIsProtoMek && battleMekOrProtoMekTarget(input);

  const grappleRestriction = canGrapple({
    tacOpsGrapplingEnabled: grapplingEnabled(input),
    attackerIsAirborneVTOLorWIGE: input.attackerIsAirborne,
    commonImpossibleReasonCode:
      input.commonPhysicalImpossibleReasonCode ??
      (input.attackerGrappledTargetId !== undefined
        ? 'LockedInGrapple'
        : undefined),
    friendlyFireEnabled: false,
    targetIsFriendly: input.targetIsFriendly,
    attackerIsBipedMek,
    attackerIsProtoMek,
    targetIsMek,
    targetIsProtoMek,
    noMinimalArmsQuirk: hasNoArms(input.unitQuirks ?? []),
    grappleSide,
    leftArmPresent:
      !grappleSelectsLeft(grappleSide) ||
      !attackerLocationDestroyed(input, 'left_arm'),
    rightArmPresent:
      !grappleSelectsRight(grappleSide) ||
      !attackerLocationDestroyed(input, 'right_arm'),
    leftShoulderWorking:
      !grappleSelectsLeft(grappleSide) ||
      !input.componentDamage.actuators[ActuatorType.SHOULDER],
    rightShoulderWorking:
      !grappleSelectsRight(grappleSide) ||
      !input.componentDamage.actuators[ActuatorType.SHOULDER],
    counterGrapple,
    targetDistance: input.targetDistance,
    elevationDifference: input.elevationDifference,
    maxElevationChange: 1,
    targetInFrontArc: input.targetInFrontArc,
    attackerProne: input.attackerProne,
    targetProne: input.targetProne,
    weaponFiredThisTurn: (input.weaponsFiredFromArm?.length ?? 0) > 0,
    attackerGrappledTargetMatches:
      input.attackerGrappledTargetId === undefined
        ? undefined
        : input.attackerGrappledTargetId === input.targetId,
    targetIsGrappleAttacker: input.targetIsGrappleAttacker,
  });

  if (grappleRestriction.allowed) return { allowed: true };

  return {
    allowed: false,
    reason: grappleRestriction.reason,
    reasonCode: mapGrappleInvalidReason(grappleRestriction.reasonCode),
  };
}

export function canBreakGrapplePhysical(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction({
    ...input,
    targetDistance: undefined,
  });
  if (!sharedRestriction.allowed) return sharedRestriction;

  const attackerIsProtoMek = protoMekUnitType(input.attackerUnitType);
  const attackerIsMek =
    !attackerIsProtoMek && legacyOrMekUnitType(input.attackerUnitType);
  const breakGrappleRestriction = canBreakGrapple({
    tacOpsGrapplingEnabled: grapplingEnabled(input),
    attackerIsAirborneVTOLorWIGE: input.attackerIsAirborne,
    commonImpossibleReasonCode:
      input.commonPhysicalImpossibleReasonCode ??
      (input.attackerGrappledTargetId !== undefined
        ? 'LockedInGrapple'
        : undefined),
    attackerChainWhipGrappled: input.attackerChainWhipGrappled,
    attackerIsMek,
    attackerIsProtoMek,
    grappledTargetMatches: input.attackerGrappledTargetId === input.targetId,
  });

  if (breakGrappleRestriction.allowed) return { allowed: true };

  return {
    allowed: false,
    reason: breakGrappleRestriction.reason,
    reasonCode: mapBreakGrappleInvalidReason(
      breakGrappleRestriction.reasonCode,
    ),
  };
}

export function canTripPhysical(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const tripRestriction = canTrip({
    tacOpsTripAttackEnabled: tripAttackEnabled(input),
    attackerIsMek: !explicitNonMekUnitType(input.attackerUnitType),
    targetIsMek: tripTargetIsMek(input),
    attackerAlreadyGrappled: input.attackerAlreadyGrappled,
    targetIsFriendly: input.targetIsFriendly,
    attackerIsAirborneVTOLorWIGE: input.attackerIsAirborne,
    targetDistance: input.targetDistance,
    targetInFrontArc: input.targetInFrontArc,
    attackerProne: input.attackerProne,
    targetProne: input.targetProne,
    sameElevation:
      input.elevationDifference === undefined
        ? undefined
        : input.elevationDifference === 0,
    leftLegPresent: !attackerLocationDestroyed(input, 'left_leg'),
    rightLegPresent: !attackerLocationDestroyed(input, 'right_leg'),
    leftTripLimbUsable: tripLimbUsable(input, 'left'),
    rightTripLimbUsable: tripLimbUsable(input, 'right'),
  });

  if (tripRestriction.allowed) return { allowed: true };

  return {
    allowed: false,
    reason: tripRestriction.reason,
    reasonCode: mapTripInvalidReason(tripRestriction.reasonCode),
  };
}

export function canThrashPhysical(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const thrashRestriction = canThrash({
    targetIsFriendly: input.targetIsFriendly,
    attackerIsMek: !explicitNonMekUnitType(input.attackerUnitType),
    attackerProne: input.attackerProne,
    targetIsInfantry: standardInfantryUnitType(input.targetUnitType),
    targetIsSwarming: input.targetIsSwarming,
    targetDistance: input.targetDistance,
    sameElevation:
      input.elevationDifference === undefined
        ? undefined
        : input.elevationDifference === 0,
    blockingTerrains: input.thrashBlockingTerrains,
    targetIsBuildingFuelTankOrHex:
      input.targetObjectType !== undefined &&
      input.targetObjectType !== 'entity',
    weaponFiredThisTurn: (input.weaponsFiredFromArm?.length ?? 0) > 0,
    hasWorkingArmOrLeg: attackerHasWorkingThrashArmOrLeg(input),
  });

  if (thrashRestriction.allowed) return { allowed: true };

  return {
    allowed: false,
    reason: thrashRestriction.reason,
    reasonCode: mapThrashInvalidReason(thrashRestriction.reasonCode),
  };
}

export function canJumpJetAttackPhysical(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  const sharedRestriction = sharedPhysicalTargetRestriction(input);
  if (!sharedRestriction.allowed) return sharedRestriction;

  const selectedLeg = selectedJumpJetAttackLeg(input);
  const jumpJetRestriction = canJumpJetAttack({
    tacOpsJumpJetAttackEnabled: jumpJetAttackEnabled(input),
    attackerIsLandAirMek: input.attackerIsLandAirMek,
    attackerIsMekMode: input.attackerIsMekMode,
    selectedLeg,
    attackerIsMek: !explicitNonMekUnitType(input.attackerUnitType),
    attackerProne: input.attackerProne,
    leftLegPresent: !attackerLocationDestroyed(input, 'left_leg'),
    rightLegPresent: !attackerLocationDestroyed(input, 'right_leg'),
    leftReadyJumpJetCount: input.leftReadyJumpJetCount,
    rightReadyJumpJetCount: input.rightReadyJumpJetCount,
    attackerMovedJump: input.attackerJumpedThisTurn,
    leftLegWeaponFiredThisTurn: input.leftLegWeaponFiredThisTurn,
    rightLegWeaponFiredThisTurn: input.rightLegWeaponFiredThisTurn,
    targetDistance: input.targetDistance,
    standingAttackerHeightAboveTargetHeight:
      input.standingAttackerHeightAboveTargetHeight,
    proneTargetElevationInRange: input.proneTargetElevationInRange,
    targetDirectlyAheadOfFeet: input.targetDirectlyAheadOfFeet,
    targetDirectlyBehindFeet: input.targetDirectlyBehindFeet,
  });

  if (jumpJetRestriction.allowed) return { allowed: true };

  return {
    allowed: false,
    reason: jumpJetRestriction.reason,
    reasonCode: mapJumpJetAttackInvalidReason(jumpJetRestriction.reasonCode),
  };
}
