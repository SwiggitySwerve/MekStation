import { IComponentDamageState } from '@/types/gameplay';

import { collectPhysicalAttackCandidates } from './decisionCandidates';
import {
  IChooseBestPhysicalAttackOptions,
  IPhysicalAttackInput,
  PhysicalAttackType,
} from './types';

export function chooseBestPhysicalAttack(
  attackerTonnage: number,
  pilotingSkill: number,
  componentDamage: IComponentDamageState,
  options: IChooseBestPhysicalAttackOptions = {},
): PhysicalAttackType | null {
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

  const candidates = collectPhysicalAttackCandidates(baseInput, options);

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.expectedDamage - a.expectedDamage);
  return candidates[0].type;
}
