import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { hasNoArms } from '@/utils/gameplay/quirkModifiers';
import { hasSPA } from '@/utils/gameplay/spaModifiers/canonicalize';

import { type BreakGrappleAttackInvalidReason } from './breakGrappleEligibility';
import { type BrushOffAttackInvalidReason } from './brushOffEligibility';
import {
  type GrappleAttackInvalidReason,
  type GrappleAttackSide,
} from './grappleEligibility';
import {
  type JumpJetAttackInvalidReason,
  type JumpJetAttackSelectedLeg,
} from './jumpJetAttackEligibility';
import {
  CHARGE_CAPABLE_UNIT_TYPES,
  DEFAULT_STANDING_MEK_HEIGHT,
  NO_HOVER_CHARGE_OPTION_KEYS,
  TACOPS_GRAPPLING_OPTIONS,
  TACOPS_JUMP_JET_ATTACK_OPTIONS,
  TACOPS_TRIP_ATTACK_OPTIONS,
  battleMekOrProtoMekTarget,
  blocked,
  canonicalUnitType,
  chargeCapableUnitType,
  explicitNonMekUnitType,
  infantryUnitType,
  knownMekUnitType,
  legacyOrMekUnitType,
  protoMekUnitType,
  standardInfantryUnitType,
  verticalBandsOverlap,
} from './restrictionValidationShared';
import { type ThrashAttackInvalidReason } from './thrashEligibility';
import { type TripAttackInvalidReason } from './tripEligibility';
import {
  type IPhysicalAttackInput,
  type IPhysicalAttackRestriction,
  type PhysicalAttackInvalidReason,
  type PhysicalAttackLimb,
  isZweihanderPhysicalAttackType,
} from './types';
import { normalizedLamConversionMode } from './unitState';

export function meleeWeaponIsArmMounted(
  attackType: IPhysicalAttackInput['attackType'],
): boolean {
  return attackType !== 'wrecking-ball';
}

export function meleeWeaponNeedsHand(
  attackType: IPhysicalAttackInput['attackType'],
): boolean {
  return (
    attackType !== 'flail' &&
    attackType !== 'lance' &&
    attackType !== 'wrecking-ball'
  );
}

export function meleeWeaponExtendedRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
  if (
    input.attackType === 'retractable-blade' &&
    input.retractableBladeExtended === false
  ) {
    return blocked(
      'Retractable blade is not extended',
      'RetractableBladeNotExtended',
    );
  }

  return undefined;
}

export function meleeWeaponFrameRestriction(
  input: IPhysicalAttackInput,
  armMounted: boolean,
): IPhysicalAttackRestriction | undefined {
  if (input.attackerIsQuad && input.attackType !== 'wrecking-ball') {
    return blocked(
      'Quad BattleMechs cannot use this melee weapon',
      'AttackerQuad',
    );
  }

  if (armMounted && hasNoArms(input.unitQuirks ?? [])) {
    return blocked(
      'No Arms quirk prevents arm-mounted melee attacks',
      'NoArmsQuirk',
    );
  }

  return undefined;
}

export function meleeWeaponPriorActionRestriction(
  input: IPhysicalAttackInput,
  armMounted: boolean,
): IPhysicalAttackRestriction | undefined {
  if (
    armMounted &&
    input.weaponsFiredFromArm &&
    input.weaponsFiredFromArm.length > 0
  ) {
    return blocked('Arm fired weapons this turn', 'WeaponFiredThisTurn');
  }

  if (armMounted && selectedArmCarryingCargo(input)) {
    return blocked('Arm is carrying cargo', 'AttackerCargoInteraction');
  }

  return undefined;
}

export function meleeWeaponArmRestriction(
  input: IPhysicalAttackInput,
  armMounted: boolean,
  needsHand: boolean,
): IPhysicalAttackRestriction | undefined {
  if (armMounted && selectedPunchArmDestroyed(input)) {
    return blocked('Melee weapon arm missing', 'LimbMissing');
  }

  if (
    armMounted &&
    selectedArmActuatorDestroyed(input, ActuatorType.SHOULDER)
  ) {
    return blocked('Shoulder actuator destroyed', 'ShoulderDestroyed');
  }

  if (
    armMounted &&
    selectedArmActuatorDestroyed(input, ActuatorType.LOWER_ARM)
  ) {
    return blocked('Lower arm actuator destroyed', 'MissingActuator');
  }

  if (
    armMounted &&
    needsHand &&
    selectedArmActuatorDestroyed(input, ActuatorType.HAND)
  ) {
    return blocked('Hand actuator destroyed', 'MissingActuator');
  }

  return undefined;
}

export function attackerLocationDestroyed(
  input: IPhysicalAttackInput,
  location: string,
): boolean {
  return input.attackerDestroyedLocations?.includes(location) ?? false;
}

export function attackerHasWorkingThrashArmOrLeg(
  input: IPhysicalAttackInput,
): boolean {
  if (input.hasWorkingThrashArmOrLeg !== undefined) {
    return input.hasWorkingThrashArmOrLeg;
  }

  return ['left_arm', 'right_arm', 'left_leg', 'right_leg'].some(
    (location) => !attackerLocationDestroyed(input, location),
  );
}

export function optionalRuleEnabled(
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

export function normalizedOptionalRuleKey(rule: string): string {
  return rule.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function hasNoHoverChargeOptionalRule(
  optionalRules: readonly string[] | undefined,
): boolean {
  return (optionalRules ?? []).some((rule) =>
    NO_HOVER_CHARGE_OPTION_KEYS.has(normalizedOptionalRuleKey(rule)),
  );
}

export function chargeBlockedByMovementMode(
  input: IPhysicalAttackInput,
): boolean {
  const conversionMode = normalizedLamConversionMode(
    input.attackerConversionMode,
  );
  const movementMode = input.attackerMovementMode?.toLowerCase();

  if (conversionMode === 'fighter') return true;
  if (conversionMode === 'airmek' && input.attackerIsAirborneVTOLOrWiGE) {
    return true;
  }

  switch (movementMode) {
    case 'vtol':
      return true;
    case 'wige':
      return !(
        conversionMode === 'airmek' && knownMekUnitType(input.attackerUnitType)
      );
    case 'hover':
      return hasNoHoverChargeOptionalRule(input.optionalRules);
    default:
      return false;
  }
}

export function chargeAttackerCapabilityRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
  if (!chargeCapableUnitType(input.attackerUnitType)) {
    return blocked("This unit type can't charge", 'AttackerCannotCharge');
  }

  if (chargeBlockedByMovementMode(input)) {
    return blocked("This movement mode can't charge", 'AttackerCannotCharge');
  }

  if (input.attackerVehicleCrewStunned === true) {
    return blocked("Stunned vehicle crew can't charge", 'AttackerCannotCharge');
  }

  return undefined;
}

export function chargeAttackerMovementRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
  if (input.attackerStuck) {
    return blocked('Cannot charge while stuck', 'AttackerStuck');
  }

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

  return undefined;
}

export function chargeTargetClassRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
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
    return undefined;
  }

  if (
    infantryUnitType(input.targetUnitType) ||
    canonicalUnitType(input.targetUnitType) === 'protomech'
  ) {
    return blocked(
      'Cannot charge Infantry or ProtoMech targets',
      'TargetInfantryOrProtoMek',
    );
  }

  return undefined;
}

export function chargeTargetStateRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction | undefined {
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

  return undefined;
}

export function tripAttackEnabled(input: IPhysicalAttackInput): boolean {
  return (
    input.tacOpsTripAttackEnabled === true ||
    optionalRuleEnabled(input.optionalRules, TACOPS_TRIP_ATTACK_OPTIONS)
  );
}

export function jumpJetAttackEnabled(input: IPhysicalAttackInput): boolean {
  return (
    input.tacOpsJumpJetAttackEnabled === true ||
    optionalRuleEnabled(input.optionalRules, TACOPS_JUMP_JET_ATTACK_OPTIONS)
  );
}

export function grapplingEnabled(input: IPhysicalAttackInput): boolean {
  return (
    input.tacOpsGrapplingEnabled === true ||
    optionalRuleEnabled(input.optionalRules, TACOPS_GRAPPLING_OPTIONS)
  );
}

export function selectedJumpJetAttackLeg(
  input: IPhysicalAttackInput,
): JumpJetAttackSelectedLeg {
  if (input.jumpJetAttackSelectedLeg) return input.jumpJetAttackSelectedLeg;
  return input.limb === 'leftLeg' ? 'left' : 'right';
}

export function tripTargetIsMek(input: IPhysicalAttackInput): boolean {
  if (
    input.targetObjectType !== undefined &&
    input.targetObjectType !== 'entity'
  ) {
    return false;
  }
  return !explicitNonMekUnitType(input.targetUnitType);
}

export function tripLimbUsable(
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

export function mapTripInvalidReason(
  reasonCode: TripAttackInvalidReason | undefined,
): PhysicalAttackInvalidReason | undefined {
  switch (reasonCode) {
    case 'LegMissing':
      return 'LimbMissing';
    default:
      return reasonCode;
  }
}

export function mapThrashInvalidReason(
  reasonCode: ThrashAttackInvalidReason | undefined,
): PhysicalAttackInvalidReason | undefined {
  switch (reasonCode) {
    case 'InvalidExplicitTarget':
      return 'InvalidPhysicalTarget';
    default:
      return reasonCode;
  }
}

export function mapJumpJetAttackInvalidReason(
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

export function mapBrushOffInvalidReason(
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

export function mapGrappleInvalidReason(
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

export function mapBreakGrappleInvalidReason(
  reasonCode: BreakGrappleAttackInvalidReason | undefined,
): PhysicalAttackInvalidReason | undefined {
  return reasonCode;
}

export function selectedPunchArmDestroyed(
  input: IPhysicalAttackInput,
): boolean {
  return attackerLocationDestroyed(input, selectedArmLocation(input));
}

export function selectedArmCarryingCargo(input: IPhysicalAttackInput): boolean {
  if (input.limb === 'leftArm' || input.arm === 'left') {
    return input.leftArmCarryingCargo === true;
  }
  return input.rightArmCarryingCargo === true;
}

export function eitherArmCarryingCargo(input: IPhysicalAttackInput): boolean {
  return (
    input.leftArmCarryingCargo === true || input.rightArmCarryingCargo === true
  );
}

export function bothArmsCarryingCargo(input: IPhysicalAttackInput): boolean {
  return (
    input.leftArmCarryingCargo === true && input.rightArmCarryingCargo === true
  );
}

export function anyPunchArmDestroyed(input: IPhysicalAttackInput): boolean {
  return (
    attackerLocationDestroyed(input, 'left_arm') ||
    attackerLocationDestroyed(input, 'right_arm')
  );
}

export function selectedArmLocation(
  input: IPhysicalAttackInput,
): 'left_arm' | 'right_arm' {
  if (input.limb === 'leftArm' || input.arm === 'left') return 'left_arm';
  return 'right_arm';
}

export function actuatorDestroyedAt(
  input: IPhysicalAttackInput,
  location: 'left_arm' | 'right_arm',
  actuator: ActuatorType,
): boolean {
  return (
    input.componentDamage.actuatorsByLocation?.[location]?.[actuator] === true
  );
}

export function selectedArmActuatorDestroyed(
  input: IPhysicalAttackInput,
  actuator: ActuatorType,
): boolean {
  const location = selectedArmLocation(input);
  const locationActuators = input.componentDamage.actuatorsByLocation;
  if (locationActuators !== undefined) {
    return locationActuators[location]?.[actuator] === true;
  }

  return input.componentDamage.actuators[actuator] === true;
}

export function eitherZweihanderHandActuatorDestroyed(
  input: IPhysicalAttackInput,
): boolean {
  return (
    input.componentDamage.actuators[ActuatorType.HAND] === true ||
    actuatorDestroyedAt(input, 'left_arm', ActuatorType.HAND) ||
    actuatorDestroyedAt(input, 'right_arm', ActuatorType.HAND)
  );
}

export function zweihanderDeclarationRestriction(
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  if (input.twoHandedZweihander !== true) return { allowed: true };

  if (!isZweihanderPhysicalAttackType(input.attackType)) {
    return blocked(
      'Two-handed Zweihander declaration requires punch or a supported physical weapon',
      'UnsupportedAttackType',
    );
  }

  if (!hasSPA(input.pilotAbilities ?? [], 'zweihander')) {
    return blocked(
      'Two-handed Zweihander declaration requires the Zweihander SPA',
      'RequiredSpaMissing',
    );
  }

  if (input.attackerProne) {
    return blocked(
      'Two-handed Zweihander declaration cannot be made while prone',
      'AttackerProne',
    );
  }

  if (anyPunchArmDestroyed(input)) {
    return blocked(
      'Two-handed Zweihander declaration requires both arms present',
      'LimbMissing',
    );
  }

  if (
    input.handActuatorPresent === false ||
    eitherZweihanderHandActuatorDestroyed(input)
  ) {
    return blocked(
      'Two-handed Zweihander declaration requires represented hand actuators',
      'MissingActuator',
    );
  }

  if (input.weaponsFiredFromArm && input.weaponsFiredFromArm.length > 0) {
    return blocked(
      'Two-handed Zweihander declaration requires both arms to be unfired',
      'WeaponFiredThisTurn',
    );
  }

  if (eitherArmCarryingCargo(input)) {
    return blocked(
      'Two-handed Zweihander declaration requires both arms free of carried cargo',
      'AttackerCargoInteraction',
    );
  }

  return { allowed: true };
}

export function anyKickLegDestroyed(input: IPhysicalAttackInput): boolean {
  return (
    attackerLocationDestroyed(input, 'left_leg') ||
    attackerLocationDestroyed(input, 'right_leg')
  );
}

export function selectedBrushOffArm(
  input: IPhysicalAttackInput,
): 'left' | 'right' {
  if (input.limb === 'leftArm' || input.arm === 'left') return 'left';
  return 'right';
}

export function selectedBrushOffArmMissing(
  input: IPhysicalAttackInput,
): boolean {
  return attackerLocationDestroyed(
    input,
    selectedBrushOffArm(input) === 'left' ? 'left_arm' : 'right_arm',
  );
}

export function selectedGrappleSide(
  input: IPhysicalAttackInput,
): GrappleAttackSide {
  if (input.grappleSide) return input.grappleSide;
  if (input.limb === 'leftArm' || input.arm === 'left') return 'left';
  if (input.limb === 'rightArm' || input.arm === 'right') return 'right';
  return 'both';
}

export function grappleSelectsLeft(side: GrappleAttackSide): boolean {
  return side === 'left' || side === 'both';
}

export function grappleSelectsRight(side: GrappleAttackSide): boolean {
  return side === 'right' || side === 'both';
}
