import { type IUnitGameState, MovementType } from '@/types/gameplay';

import type { IEligibilityContext } from './eligibilityContext';

import { isTargetDirectlyAhead, isTargetInFrontArc } from './displacement';
import {
  type IPhysicalAttackInput,
  isPhysicalAirborneVtolOrWigeTarget,
  physicalTargetObjectTypeForUnitType,
} from './types';
import {
  isAirborneVTOLOrWiGEForPhysicalAttack,
  isVehicleCrewStunned,
} from './unitState';

export type EligibilityBaseInput = Omit<IPhysicalAttackInput, 'attackType'>;

function canonicalBrushOffTargetUnitType(
  unit: IUnitGameState,
): string | undefined {
  if (unit.combatState?.kind === 'squad') return 'battlearmor';
  return unit.unitType?.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function swarmingHostId(unit: IUnitGameState): string | undefined {
  if (unit.combatState?.kind !== 'squad') return undefined;
  return unit.combatState.state.swarmingUnitId;
}

function targetIsSwarmingInfantryOnAttacker(
  attackerId: string,
  target: IUnitGameState,
): boolean {
  if (target.isSwarming !== true) return false;

  const canonical = canonicalBrushOffTargetUnitType(target);
  if (canonical !== 'infantry' && canonical !== 'battlearmor') return false;

  const hostId = swarmingHostId(target);
  return hostId === undefined || hostId === attackerId;
}

function attackerAirborneVtolOrWige(
  attacker: IUnitGameState,
  context: IEligibilityContext,
): IPhysicalAttackInput['attackerIsAirborneVTOLOrWiGE'] {
  return (
    context.attackerIsAirborneVTOLOrWiGE ??
    isAirborneVTOLOrWiGEForPhysicalAttack(
      attacker,
      context.attackerMovementMode,
    )
  );
}

function targetAirborneVtolOrWigeReachable(
  target: IUnitGameState,
  context: IEligibilityContext,
): boolean {
  if (context.attackerJumpMP === undefined) return false;
  if (context.elevationDifference === undefined) return false;
  return isPhysicalAirborneVtolOrWigeTarget(
    target.unitType,
    target.motionType,
    target.isAirborne,
  );
}

function attackerMovementFields(
  attacker: IUnitGameState,
  context: IEligibilityContext,
): Partial<EligibilityBaseInput> {
  return {
    attackerMovedBackwardThisTurn:
      context.attackerMovedBackwardThisTurn ?? attacker.movedBackwardThisTurn,
    attackerJumpedThisTurn:
      context.attackerJumpedThisTurn ??
      attacker.movementThisTurn === MovementType.Jump,
    attackerUsedMechanicalJumpBooster:
      context.attackerUsedMechanicalJumpBooster ??
      attacker.usedMechanicalJumpBoosterThisTurn,
  };
}

function mountedPhysicalEquipmentFields(
  attacker: IUnitGameState,
  context: IEligibilityContext,
): Partial<EligibilityBaseInput> {
  return {
    leftLegHasTalons: context.leftLegHasTalons ?? attacker.leftLegHasTalons,
    rightLegHasTalons: context.rightLegHasTalons ?? attacker.rightLegHasTalons,
    leftArmHasTalons: context.leftArmHasTalons ?? attacker.leftArmHasTalons,
    rightArmHasTalons: context.rightArmHasTalons ?? attacker.rightArmHasTalons,
    leftArmHasClaw: context.leftArmHasClaw ?? attacker.leftArmHasClaw,
    rightArmHasClaw: context.rightArmHasClaw ?? attacker.rightArmHasClaw,
    leftArmCarryingCargo:
      context.leftArmCarryingCargo ?? attacker.leftArmCarryingCargo,
    rightArmCarryingCargo:
      context.rightArmCarryingCargo ?? attacker.rightArmCarryingCargo,
  };
}

function grappleStateFields(
  attacker: IUnitGameState,
  target: IUnitGameState,
  context: IEligibilityContext,
): Partial<EligibilityBaseInput> {
  return {
    attackerGrappledTargetId:
      context.attackerGrappledTargetId ?? attacker.grappledUnitId,
    targetGrappledTargetId:
      context.targetGrappledTargetId ?? target.grappledUnitId,
    attackerIsGrappleAttacker:
      context.attackerIsGrappleAttacker ?? attacker.isGrappleAttacker,
    targetIsGrappleAttacker:
      context.targetIsGrappleAttacker ?? target.isGrappleAttacker,
    attackerChainWhipGrappled:
      context.attackerChainWhipGrappled ?? attacker.isChainWhipGrappled,
  };
}

function facingAndProjectionFields(
  attacker: IUnitGameState,
  target: IUnitGameState,
  context: IEligibilityContext,
): Partial<EligibilityBaseInput> {
  const targetDirectlyAhead = isTargetDirectlyAhead(
    attacker.position,
    attacker.facing,
    target.position,
  );

  return {
    targetInFrontArc: isTargetInFrontArc(
      attacker.position,
      attacker.facing,
      target.position,
    ),
    targetDirectlyAheadOfFeet:
      context.targetDirectlyAheadOfFeet ?? targetDirectlyAhead,
    targetDirectlyBehindFeet: context.targetDirectlyBehindFeet,
    targetIsSwarmingInfantryOnAttacker:
      context.targetIsSwarmingInfantryOnAttacker ??
      targetIsSwarmingInfantryOnAttacker(attacker.id, target),
    pushTargetDirectlyAhead: targetDirectlyAhead,
  };
}

function pilotTraitFields(
  attacker: IUnitGameState,
  context: IEligibilityContext,
): Partial<EligibilityBaseInput> {
  return {
    pilotAbilities: context.pilotAbilities ?? attacker.abilities,
    unitQuirks: context.unitQuirks ?? attacker.unitQuirks,
  };
}

export function buildEligibilityBaseInput(options: {
  readonly attacker: IUnitGameState;
  readonly target: IUnitGameState;
  readonly context: IEligibilityContext;
  readonly targetDistance: number;
}): EligibilityBaseInput {
  const { attacker, context, target, targetDistance } = options;
  const componentDamage = attacker.componentDamage ?? {
    engineHits: 0,
    gyroHits: 0,
    sensorHits: 0,
    lifeSupport: 0,
    cockpitHit: false,
    actuators: {},
    weaponsDestroyed: [],
    heatSinksDestroyed: 0,
    jumpJetsDestroyed: 0,
  };

  const baseInput = {
    attackerId: attacker.id,
    targetId: target.id,
    attackerTonnage: context.attackerTonnage,
    pilotingSkill: context.attackerPilotingSkill,
    componentDamage,
    heat: attacker.heat,
    attackerDestroyedLocations: attacker.destroyedLocations,
    attackerUnitType: context.attackerUnitType ?? attacker.unitType,
    attackerMovementMode: context.attackerMovementMode,
    attackerConversionMode:
      context.attackerConversionMode ?? attacker.conversionMode,
    attackerIsAirborneVTOLOrWiGE: attackerAirborneVtolOrWige(attacker, context),
    attackerVehicleCrewStunned: isVehicleCrewStunned(attacker),
    attackerIsQuad: attacker.isQuad,
    attackerIsAirborne: attacker.isAirborne,
    attackerArmsFlipped: attacker.armsFlipped,
    targetUnitType: context.targetUnitType ?? target.unitType,
    targetPilotingSkill: target.piloting,
    attackerEvading: attacker.isEvading,
    attackerSpotting: attacker.isSpotting,
    attackerLoadingOrUnloadingCargo: attacker.isLoadingOrUnloadingCargo,
    retractableBladeExtended: context.retractableBladeExtended,
    attackerTargetedByDisplacementAttackerId:
      attacker.targetedByDisplacementAttackerId,
    attackerProne: attacker.prone,
    attackerStuck: attacker.isStuck,
    targetProne: target.prone,
    targetMovementComplete: context.targetMovementComplete,
    targetImmobile: target.shutdown,
    targetExists: true,
    targetObjectType: physicalTargetObjectTypeForUnitType(target.unitType),
    targetDestroyed: target.destroyed,
    targetRetreated: target.hasRetreated,
    targetEjected: target.hasEjected,
    targetIsPassenger: target.isPassenger,
    attackerBoardId: attacker.boardId,
    targetBoardId: target.boardId,
    targetIsSwarming: target.isSwarming,
    targetIsMakingDFA: target.isMakingDFA,
    targetIsMakingDisplacementAttack: target.isMakingDisplacementAttack,
    targetIsPushing: target.isPushing,
    targetDisplacementAttackTargetId: target.displacementAttackTargetId,
    targetedByDisplacementAttackerId: target.targetedByDisplacementAttackerId,
    targetIsAirborne: target.isAirborne,
    targetIsAirborneVTOLorWIGE: targetAirborneVtolOrWigeReachable(
      target,
      context,
    ),
    attackerJumpMP: context.attackerJumpMP,
    attackerOccupiedBuildingId: attacker.occupiedBuildingId,
    targetOccupiedBuildingId: target.occupiedBuildingId,
    targetIsSelf: attacker.id === target.id,
    targetIsFriendly: attacker.side === target.side,
    targetDistance,
    hexesMoved: attacker.hexesMovedThisTurn,
    targetTonnage: context.targetTonnage,
    targetMovementModifier: context.targetMovementModifier,
    targetEvading: target.isEvading,
    targetEvasionBonus: target.evasionBonus,
    attackerMovementModifier: context.attackerMovementModifier,
    hasTSM: context.hasTSM,
    attackerRanThisTurn: context.attackerRanThisTurn,
    ...attackerMovementFields(attacker, context),
    limbsUsedThisTurn: context.limbsUsedThisTurn,
    lowerArmActuatorPresent: context.lowerArmActuatorPresent,
    handActuatorPresent: context.handActuatorPresent,
    upperLegActuatorPresent: context.upperLegActuatorPresent,
    footActuatorPresent: context.footActuatorPresent,
    ...mountedPhysicalEquipmentFields(attacker, context),
    leftFootActuatorPresent: context.leftFootActuatorPresent,
    rightFootActuatorPresent: context.rightFootActuatorPresent,
    leftArmFootActuatorPresent: context.leftArmFootActuatorPresent,
    rightArmFootActuatorPresent: context.rightArmFootActuatorPresent,
    optionalRules: context.optionalRules,
    tacOpsTripAttackEnabled: context.tacOpsTripAttackEnabled,
    tacOpsGrapplingEnabled: context.tacOpsGrapplingEnabled,
    grappleSide: context.grappleSide,
    ...grappleStateFields(attacker, target, context),
    leftArmAesFunctional: context.leftArmAesFunctional,
    rightArmAesFunctional: context.rightArmAesFunctional,
    attackerWeightClass: context.attackerWeightClass,
    targetWeightClass: context.targetWeightClass,
    attackerAlreadyGrappled: context.attackerAlreadyGrappled,
    ...facingAndProjectionFields(attacker, target, context),
    leftTripLimbUsable: context.leftTripLimbUsable,
    rightTripLimbUsable: context.rightTripLimbUsable,
    legAesFunctional: context.legAesFunctional,
    thrashBlockingTerrains: context.thrashBlockingTerrains,
    hasWorkingThrashArmOrLeg: context.hasWorkingThrashArmOrLeg,
    tacOpsJumpJetAttackEnabled: context.tacOpsJumpJetAttackEnabled,
    leftReadyJumpJetCount: context.leftReadyJumpJetCount,
    rightReadyJumpJetCount: context.rightReadyJumpJetCount,
    leftLegWet: context.leftLegWet,
    rightLegWet: context.rightLegWet,
    leftLegWeaponFiredThisTurn: context.leftLegWeaponFiredThisTurn,
    rightLegWeaponFiredThisTurn: context.rightLegWeaponFiredThisTurn,
    standingAttackerHeightAboveTargetHeight:
      context.standingAttackerHeightAboveTargetHeight,
    proneTargetElevationInRange: context.proneTargetElevationInRange,
    targetIsINarcPod: context.targetIsINarcPod,
    armAesFunctional: context.armAesFunctional,
    torsoMountedCockpit: context.torsoMountedCockpit,
    headSensorHits: context.headSensorHits,
    centerTorsoSensorHits: context.centerTorsoSensorHits,
    defenderHasMagneticClaws: context.defenderHasMagneticClaws,
    pushDestinationValid: context.pushDestinationValid,
    ...pilotTraitFields(attacker, context),
    elevationDifference: context.elevationDifference,
    elevationContext: context.elevationContext,
    terrainContext: context.terrainContext,
  } as const;

  return baseInput;
}
