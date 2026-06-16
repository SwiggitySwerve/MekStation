import { IComponentDamageState } from '@/types/gameplay';

import {
  calculateBrushOffDamage,
  calculateChargeDamageToTarget,
  calculateDFADamageToTarget,
  calculateFlailDamage,
  calculateHatchetDamage,
  calculateJumpJetAttackDamage,
  calculateKickDamage,
  calculateLanceDamage,
  calculateMaceDamage,
  calculatePunchDamage,
  calculateRetractableBladeDamage,
  calculateSwordDamage,
  calculateThrashDamage,
  calculateWreckingBallDamage,
} from './damage';
import {
  canBrushOffPhysical,
  canBreakGrapplePhysical,
  canCharge,
  canDFA,
  canGrapplePhysical,
  canKick,
  canJumpJetAttackPhysical,
  canMeleeWeapon,
  canPunch,
  canThrashPhysical,
} from './restrictions';
import {
  IChooseBestPhysicalAttackOptions,
  IPhysicalAttackCandidate,
  IPhysicalAttackInput,
  PhysicalAttackType,
} from './types';

export function chooseBestPhysicalAttack(
  attackerTonnage: number,
  pilotingSkill: number,
  componentDamage: IComponentDamageState,
  options: IChooseBestPhysicalAttackOptions = {},
): PhysicalAttackType | null {
  const candidates: IPhysicalAttackCandidate[] = [];

  const baseInput: IPhysicalAttackInput = {
    attackerId: options.attackerId,
    targetId: options.targetId,
    attackerTonnage,
    pilotingSkill,
    componentDamage,
    attackType: 'punch',
    heat: options.heat,
    hasTSM: options.hasTSM,
    attackerProne: options.attackerProne,
    attackerStuck: options.attackerStuck,
    pilotAbilities: options.pilotAbilities,
    unitQuirks: options.unitQuirks,
    attackerIsQuad: options.attackerIsQuad,
    leftLegHasTalons: options.leftLegHasTalons,
    rightLegHasTalons: options.rightLegHasTalons,
    leftArmHasTalons: options.leftArmHasTalons,
    rightArmHasTalons: options.rightArmHasTalons,
    leftFootActuatorPresent: options.leftFootActuatorPresent,
    rightFootActuatorPresent: options.rightFootActuatorPresent,
    leftArmFootActuatorPresent: options.leftArmFootActuatorPresent,
    rightArmFootActuatorPresent: options.rightArmFootActuatorPresent,
    leftArmHasClaw: options.leftArmHasClaw,
    rightArmHasClaw: options.rightArmHasClaw,
    leftArmCarryingCargo: options.leftArmCarryingCargo,
    rightArmCarryingCargo: options.rightArmCarryingCargo,
    attackerEvading: options.attackerEvading,
    attackerLoadingOrUnloadingCargo: options.attackerLoadingOrUnloadingCargo,
    attackerTargetedByDisplacementAttackerId:
      options.attackerTargetedByDisplacementAttackerId,
    attackerBoardId: options.attackerBoardId,
    targetBoardId: options.targetBoardId,
    elevationDifference: options.elevationDifference,
    targetIsAirborne: options.targetIsAirborne,
    targetIsAirborneVTOLorWIGE: options.targetIsAirborneVTOLorWIGE,
    targetIsFriendly: options.targetIsFriendly,
    targetIsSwarming: options.targetIsSwarming,
    targetIsSwarmingInfantryOnAttacker:
      options.targetIsSwarmingInfantryOnAttacker,
    targetIsINarcPod: options.targetIsINarcPod,
    targetDistance: options.targetDistance,
    targetObjectType: options.targetObjectType,
    targetUnitType: options.targetUnitType,
    attackerJumpMP: options.attackerJumpMP,
    attackerUsedMechanicalJumpBooster:
      options.attackerUsedMechanicalJumpBooster,
    targetIsMakingDisplacementAttack: options.targetIsMakingDisplacementAttack,
    targetIsPushing: options.targetIsPushing,
    targetDisplacementAttackTargetId: options.targetDisplacementAttackTargetId,
    targetedByDisplacementAttackerId: options.targetedByDisplacementAttackerId,
    optionalRules: options.optionalRules,
    tacOpsGrapplingEnabled: options.tacOpsGrapplingEnabled,
    grappleSide: options.grappleSide,
    attackerGrappledTargetId: options.attackerGrappledTargetId,
    targetGrappledTargetId: options.targetGrappledTargetId,
    attackerIsGrappleAttacker: options.attackerIsGrappleAttacker,
    targetIsGrappleAttacker: options.targetIsGrappleAttacker,
    attackerChainWhipGrappled: options.attackerChainWhipGrappled,
    leftArmAesFunctional: options.leftArmAesFunctional,
    rightArmAesFunctional: options.rightArmAesFunctional,
    attackerWeightClass: options.attackerWeightClass,
    targetWeightClass: options.targetWeightClass,
    tacOpsJumpJetAttackEnabled: options.tacOpsJumpJetAttackEnabled,
    jumpJetAttackSelectedLeg: options.jumpJetAttackSelectedLeg,
    leftReadyJumpJetCount: options.leftReadyJumpJetCount,
    rightReadyJumpJetCount: options.rightReadyJumpJetCount,
    leftLegWeaponFiredThisTurn: options.leftLegWeaponFiredThisTurn,
    rightLegWeaponFiredThisTurn: options.rightLegWeaponFiredThisTurn,
    standingAttackerHeightAboveTargetHeight:
      options.standingAttackerHeightAboveTargetHeight,
    proneTargetElevationInRange: options.proneTargetElevationInRange,
    targetDirectlyAheadOfFeet: options.targetDirectlyAheadOfFeet,
    targetDirectlyBehindFeet: options.targetDirectlyBehindFeet,
    thrashBlockingTerrains: options.thrashBlockingTerrains,
    hasWorkingThrashArmOrLeg: options.hasWorkingThrashArmOrLeg,
  };

  const thrashInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'thrash',
    weaponsFiredFromArm: options.weaponsFiredThisTurn,
  };
  if (canThrashPhysical(thrashInput).allowed) {
    candidates.push({
      type: 'thrash',
      expectedDamage: calculateThrashDamage(thrashInput),
    });
  }

  const jumpJetInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'jump-jet-attack',
    limb: options.jumpJetAttackSelectedLeg === 'left' ? 'leftLeg' : 'rightLeg',
  };
  if (canJumpJetAttackPhysical(jumpJetInput).allowed) {
    candidates.push({
      type: 'jump-jet-attack',
      expectedDamage: calculateJumpJetAttackDamage(jumpJetInput),
    });
  }

  const brushOffInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'brush-off',
    arm: 'right',
    limb: 'rightArm',
    weaponsFiredFromArm: options.weaponsFiredFromRightArm,
  };
  if (canBrushOffPhysical(brushOffInput).allowed) {
    candidates.push({
      type: 'brush-off',
      expectedDamage: calculateBrushOffDamage(brushOffInput),
    });
  }

  const grappleInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'grapple',
    weaponsFiredFromArm: options.weaponsFiredThisTurn,
  };
  if (canGrapplePhysical(grappleInput).allowed) {
    candidates.push({
      type: 'grapple',
      expectedDamage: 0,
    });
  }

  const breakGrappleInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'break-grapple',
  };
  if (canBreakGrapplePhysical(breakGrappleInput).allowed) {
    candidates.push({
      type: 'break-grapple',
      expectedDamage: 0,
    });
  }

  const kickInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'kick',
  };
  const kickRestriction = canKick(kickInput);
  if (kickRestriction.allowed) {
    const kickDamage = calculateKickDamage(kickInput);
    candidates.push({ type: 'kick', expectedDamage: kickDamage });
  }

  const leftPunchInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'punch',
    arm: 'left',
    weaponsFiredFromArm: options.weaponsFiredFromLeftArm,
  };
  const rightPunchInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'punch',
    arm: 'right',
    weaponsFiredFromArm: options.weaponsFiredFromRightArm,
  };

  if (canPunch(leftPunchInput).allowed || canPunch(rightPunchInput).allowed) {
    const punchDamage = Math.max(
      canPunch(leftPunchInput).allowed
        ? calculatePunchDamage(leftPunchInput)
        : 0,
      canPunch(rightPunchInput).allowed
        ? calculatePunchDamage(rightPunchInput)
        : 0,
    );
    candidates.push({ type: 'punch', expectedDamage: punchDamage });
  }

  if (options.isJumping) {
    const dfaInput: IPhysicalAttackInput = {
      ...baseInput,
      attackType: 'dfa',
      attackerJumpedThisTurn: true,
    };
    if (canDFA(dfaInput).allowed) {
      const dfaDamage = calculateDFADamageToTarget(dfaInput);
      candidates.push({ type: 'dfa', expectedDamage: dfaDamage });
    }
  }

  if (options.canReachForCharge && (options.hexesMoved ?? 0) > 1) {
    const chargeInput: IPhysicalAttackInput = {
      ...baseInput,
      attackType: 'charge',
      hexesMoved: options.hexesMoved,
      attackerJumpedThisTurn: options.isJumping,
      attackerRanThisTurn: true,
      attackerMovedBackwardThisTurn: options.attackerMovedBackwardThisTurn,
    };
    if (canCharge(chargeInput).allowed) {
      const chargeDamage = calculateChargeDamageToTarget(chargeInput);
      candidates.push({ type: 'charge', expectedDamage: chargeDamage });
    }
  }

  if (options.hasMeleeWeapon) {
    const meleeInput: IPhysicalAttackInput = {
      ...baseInput,
      attackType: options.hasMeleeWeapon,
    };
    const meleeRestriction = canMeleeWeapon(meleeInput);
    if (meleeRestriction.allowed) {
      let meleeDamage = 0;
      switch (options.hasMeleeWeapon) {
        case 'hatchet':
          meleeDamage = calculateHatchetDamage(meleeInput);
          break;
        case 'sword':
          meleeDamage = calculateSwordDamage(meleeInput);
          break;
        case 'mace':
          meleeDamage = calculateMaceDamage(meleeInput);
          break;
        case 'lance':
          meleeDamage = calculateLanceDamage(meleeInput);
          break;
        case 'retractable-blade':
          meleeDamage = calculateRetractableBladeDamage(meleeInput);
          break;
        case 'flail':
          meleeDamage = calculateFlailDamage(meleeInput);
          break;
        case 'wrecking-ball':
          meleeDamage = calculateWreckingBallDamage(meleeInput);
          break;
      }
      candidates.push({
        type: options.hasMeleeWeapon,
        expectedDamage: meleeDamage,
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.expectedDamage - a.expectedDamage);
  return candidates[0].type;
}
