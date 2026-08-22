import { ActuatorType } from '@/types/construction/MechConfigurationSystem';

import { type BreakGrappleAttackInvalidReason } from './breakGrappleEligibility';
import { type BrushOffAttackInvalidReason } from './brushOffEligibility';
import { type GrappleAttackInvalidReason } from './grappleEligibility';
import {
  type JumpJetAttackInvalidReason,
  type JumpJetAttackSelectedLeg,
} from './jumpJetAttackEligibility';
import { optionalRuleEnabled } from './restrictionChargeValidationHelpers';
import { attackerLocationDestroyed } from './restrictionLimbValidationHelpers';
import {
  TACOPS_GRAPPLING_OPTIONS,
  TACOPS_JUMP_JET_ATTACK_OPTIONS,
  TACOPS_TRIP_ATTACK_OPTIONS,
  explicitNonMekUnitType,
} from './restrictionValidationShared';
import { type ThrashAttackInvalidReason } from './thrashEligibility';
import { type TripAttackInvalidReason } from './tripEligibility';
import {
  type IPhysicalAttackInput,
  type PhysicalAttackInvalidReason,
} from './types';

/** TacOps trip attack enabled via flag or optional-rule aliases. */
export function tripAttackEnabled(input: IPhysicalAttackInput): boolean {
  return (
    input.tacOpsTripAttackEnabled === true ||
    optionalRuleEnabled(input.optionalRules, TACOPS_TRIP_ATTACK_OPTIONS)
  );
}

/** TacOps jump-jet attack enabled via flag or optional-rule aliases. */
export function jumpJetAttackEnabled(input: IPhysicalAttackInput): boolean {
  return (
    input.tacOpsJumpJetAttackEnabled === true ||
    optionalRuleEnabled(input.optionalRules, TACOPS_JUMP_JET_ATTACK_OPTIONS)
  );
}

/** TacOps grappling enabled via flag or optional-rule aliases. */
export function grapplingEnabled(input: IPhysicalAttackInput): boolean {
  return (
    input.tacOpsGrapplingEnabled === true ||
    optionalRuleEnabled(input.optionalRules, TACOPS_GRAPPLING_OPTIONS)
  );
}

/** Resolves selected jump-jet attack leg from explicit selection or limb. */
export function selectedJumpJetAttackLeg(
  input: IPhysicalAttackInput,
): JumpJetAttackSelectedLeg {
  if (input.jumpJetAttackSelectedLeg) return input.jumpJetAttackSelectedLeg;
  return input.limb === 'leftLeg' ? 'left' : 'right';
}

/** Trip targets must be standing Mechs (entity targets). */
export function tripTargetIsMek(input: IPhysicalAttackInput): boolean {
  if (
    input.targetObjectType !== undefined &&
    input.targetObjectType !== 'entity'
  ) {
    return false;
  }
  return !explicitNonMekUnitType(input.targetUnitType);
}

/** Whether a trip limb is usable (explicit flag, hip, or location). */
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

/** Maps trip eligibility reason codes onto physical-attack invalid reasons. */
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

/** Maps thrash eligibility reason codes onto physical-attack invalid reasons. */
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

/** Maps jump-jet eligibility reason codes onto physical-attack invalid reasons. */
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

/** Maps brush-off eligibility reason codes onto physical-attack invalid reasons. */
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

/** Maps grapple eligibility reason codes onto physical-attack invalid reasons. */
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

/** Maps break-grapple eligibility reason codes (pass-through). */
export function mapBreakGrappleInvalidReason(
  reasonCode: BreakGrappleAttackInvalidReason | undefined,
): PhysicalAttackInvalidReason | undefined {
  return reasonCode;
}
