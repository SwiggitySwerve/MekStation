import type {
  IGameSession,
  IHexGrid,
  IPhysicalAttackDeclaredPayload,
} from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';

import type { IPhysicalAttackContext } from './gameSessionPhysicalHelpers';

import { buildDefaultComponentDamageState } from './gameSessionAttackResolutionHelpers';
import { buildTargetGeometryFields } from './gameSessionPhysicalInputGeometry';
import {
  jumpJetAttackSelectedLegForLimb,
  legWeaponFiredThisTurn,
  terrainAtPosition,
  weaponsFiredFromArmForAttack,
} from './gameSessionPhysicalSupport';
import { hexDistance } from './hexMath';
import {
  isPhysicalAirborneVtolOrWigeTarget,
  physicalAttackLimbsUsedThisTurn,
  physicalTargetObjectTypeForUnitType,
  thrashBlockingTerrainsForHexTerrain,
  type IPhysicalAttackInput,
  type PhysicalAttackType,
} from './physicalAttacks';
import { waterDepthAtPosition } from './waterDepth';

type UnitState = IGameSession['currentState']['units'][string];

export interface IBuildPhysicalAttackInputOptions {
  readonly session: IGameSession;
  readonly attackerId: string;
  readonly targetId: string;
  readonly attackType: PhysicalAttackType;
  readonly context: IPhysicalAttackContext;
  readonly attackerState: UnitState;
  readonly targetState?: UnitState;
  readonly targetContext?: IPhysicalAttackContext;
  readonly limb?: IPhysicalAttackDeclaredPayload['limb'];
  readonly twoHandedZweihander?: boolean;
  readonly hitTableOverride?: IPhysicalAttackInput['hitTableOverride'];
  readonly grid?: IHexGrid;
  readonly deriveLimbsUsedFromEvents?: boolean;
  readonly deriveThrashBlockingTerrains?: boolean;
}

export function buildPhysicalAttackInput(
  options: IBuildPhysicalAttackInputOptions,
): IPhysicalAttackInput {
  const { attackType, attackerId, context, session, targetId } = options;
  const attackerUnit = session.units.find((unit) => unit.id === attackerId);
  const targetUnit = session.units.find((unit) => unit.id === targetId);
  const targetObjectType =
    context.targetObjectType ??
    physicalTargetObjectTypeForUnitType(options.targetState?.unitType);

  return {
    attackerId,
    targetId,
    attackerTonnage: context.attackerTonnage,
    pilotingSkill: context.pilotingSkill,
    componentDamage:
      options.attackerState.componentDamage ??
      buildDefaultComponentDamageState(),
    attackType,
    arm: context.arm,
    twoHandedZweihander:
      options.twoHandedZweihander ?? context.twoHandedZweihander,
    hexesMoved: context.hexesMoved,
    hasTSM: context.hasTSM,
    targetObjectType,
    ...buildWaterFields(options),
    ...buildAttackerStateFields(options, attackerUnit),
    ...buildTargetStateFields(options, targetUnit, targetObjectType),
    ...buildMovementFields(options),
    ...buildLimbStateFields(options),
    ...buildGrappleFields(options),
    ...buildTacOpsFields(options),
    ...buildTargetGeometryFields(options),
    ...buildPilotEnvironmentFields(options),
    hitTableOverride: options.hitTableOverride,
  };
}

function buildWaterFields(
  options: IBuildPhysicalAttackInputOptions,
): Partial<IPhysicalAttackInput> {
  const { attackerState, context, grid, targetContext } = options;
  return {
    heat: attackerState.heat,
    isUnderwater:
      (context.isUnderwater ?? false) || (targetContext?.isUnderwater ?? false),
    attackerWaterDepth: resolveAttackerWaterDepth(context, grid, attackerState),
  };
}

function resolveAttackerWaterDepth(
  context: IPhysicalAttackContext,
  grid: IHexGrid | undefined,
  attackerState: UnitState,
): number | undefined {
  if (context.attackerWaterDepth !== undefined) {
    return context.attackerWaterDepth;
  }
  if (!grid) return undefined;
  return waterDepthAtPosition(grid, attackerState.position);
}

function buildAttackerStateFields(
  options: IBuildPhysicalAttackInputOptions,
  attackerUnit: IGameSession['units'][number] | undefined,
): Partial<IPhysicalAttackInput> {
  const { attackerState, attackType, context } = options;
  return {
    weaponsFiredFromArm: weaponsFiredFromArmForAttack(
      attackerState,
      attackType,
      context,
    ),
    attackerDestroyedLocations: attackerState.destroyedLocations,
    attackerUnitType:
      context.attackerUnitType ??
      attackerState.unitType ??
      attackerUnit?.unitType,
    attackerMovementMode:
      context.attackerMovementMode ?? attackerState.motionType,
    attackerConversionMode:
      context.attackerConversionMode ?? attackerState.conversionMode,
    attackerIsAirborneVTOLOrWiGE: context.attackerIsAirborneVTOLOrWiGE,
    attackerVehicleCrewStunned:
      attackerState.combatState?.kind === 'vehicle'
        ? attackerState.combatState.state.motive.crewStunnedPhases > 0
        : undefined,
    attackerIsQuad: attackerState.isQuad,
    attackerIsAirborne: attackerState.isAirborne,
    attackerArmsFlipped: attackerState.armsFlipped,
    attackerEvading: attackerState.isEvading,
    attackerSpotting: attackerState.isSpotting,
    attackerLoadingOrUnloadingCargo: attackerState.isLoadingOrUnloadingCargo,
    attackerTargetedByDisplacementAttackerId:
      attackerState.targetedByDisplacementAttackerId,
    attackerProne: attackerState.prone,
    attackerHullDown: attackerState.hullDown,
    attackerStuck: attackerState.isStuck,
    attackerBoardId: attackerState.boardId,
    attackerOccupiedBuildingId: attackerState.occupiedBuildingId,
  };
}

function buildTargetStateFields(
  options: IBuildPhysicalAttackInputOptions,
  targetUnit: IGameSession['units'][number] | undefined,
  targetObjectType: IPhysicalAttackInput['targetObjectType'],
): Partial<IPhysicalAttackInput> {
  const { attackerId, attackerState, context, targetId, targetState } = options;
  return {
    targetUnitType:
      context.targetUnitType ?? targetState?.unitType ?? targetUnit?.unitType,
    targetPilotingSkill: targetState?.piloting,
    targetProne: targetState?.prone,
    targetMovementComplete: context.targetMovementComplete,
    targetImmobile: targetState?.shutdown,
    targetExists: targetState !== undefined || targetObjectType !== undefined,
    targetDestroyed: targetState?.destroyed,
    targetRetreated: targetState?.hasRetreated,
    targetEjected: targetState?.hasEjected,
    targetBoardId: targetState?.boardId,
    targetIsPassenger: targetState?.isPassenger,
    targetIsSwarming: targetState?.isSwarming,
    targetIsMakingDFA: targetState?.isMakingDFA,
    targetIsMakingDisplacementAttack: targetState?.isMakingDisplacementAttack,
    targetIsPushing: targetState?.isPushing,
    targetDisplacementAttackTargetId: targetState?.displacementAttackTargetId,
    targetedByDisplacementAttackerId:
      targetState?.targetedByDisplacementAttackerId,
    targetIsAirborne: targetState?.isAirborne,
    targetIsAirborneVTOLorWIGE: targetIsAirborneVtolOrWige(options),
    targetOccupiedBuildingId: targetState?.occupiedBuildingId,
    targetIsSelf: attackerId === targetId,
    targetIsFriendly: targetState
      ? attackerState.side === targetState.side
      : undefined,
    targetDistance: targetState
      ? hexDistance(attackerState.position, targetState.position)
      : undefined,
    targetTonnage: context.targetTonnage,
    targetMovementModifier: context.targetMovementModifier,
    targetEvading: targetState?.isEvading,
    targetEvasionBonus: targetState?.evasionBonus,
  };
}

function targetIsAirborneVtolOrWige(
  options: IBuildPhysicalAttackInputOptions,
): boolean {
  const { context, targetState } = options;
  return (
    context.attackerJumpMP !== undefined &&
    context.elevationDifference !== undefined &&
    isPhysicalAirborneVtolOrWigeTarget(
      targetState?.unitType,
      targetState?.motionType,
      targetState?.isAirborne,
    )
  );
}

function buildMovementFields(
  options: IBuildPhysicalAttackInputOptions,
): Partial<IPhysicalAttackInput> {
  const { attackerId, attackerState, context, session } = options;
  return {
    attackerMovementModifier: context.attackerMovementModifier,
    retractableBladeExtended: context.retractableBladeExtended,
    attackerJumpedThisTurn:
      context.attackerJumpedThisTurn ??
      attackerState.movementThisTurn === MovementType.Jump,
    attackerUsedMechanicalJumpBooster:
      context.attackerUsedMechanicalJumpBooster ??
      attackerState.usedMechanicalJumpBoosterThisTurn,
    attackerRanThisTurn: context.attackerRanThisTurn,
    attackerMovedBackwardThisTurn:
      context.attackerMovedBackwardThisTurn ??
      attackerState.movedBackwardThisTurn,
    limbsUsedThisTurn: resolveLimbsUsedThisTurn(
      options,
      session.currentState.turn,
      attackerId,
    ),
  };
}

function resolveLimbsUsedThisTurn(
  options: IBuildPhysicalAttackInputOptions,
  turn: number,
  attackerId: string,
): IPhysicalAttackInput['limbsUsedThisTurn'] {
  if (options.deriveLimbsUsedFromEvents !== true) {
    return options.context.limbsUsedThisTurn;
  }
  return (
    options.context.limbsUsedThisTurn ??
    physicalAttackLimbsUsedThisTurn(options.session.events, turn, attackerId)
  );
}

function buildLimbStateFields(
  options: IBuildPhysicalAttackInputOptions,
): Partial<IPhysicalAttackInput> {
  const { attackerState, context } = options;
  return {
    limb: options.limb,
    lowerArmActuatorPresent: context.lowerArmActuatorPresent,
    handActuatorPresent: context.handActuatorPresent,
    upperLegActuatorPresent: context.upperLegActuatorPresent,
    footActuatorPresent: context.footActuatorPresent,
    leftLegHasTalons:
      context.leftLegHasTalons ?? attackerState.leftLegHasTalons,
    rightLegHasTalons:
      context.rightLegHasTalons ?? attackerState.rightLegHasTalons,
    leftArmHasTalons:
      context.leftArmHasTalons ?? attackerState.leftArmHasTalons,
    rightArmHasTalons:
      context.rightArmHasTalons ?? attackerState.rightArmHasTalons,
    leftFootActuatorPresent: context.leftFootActuatorPresent,
    rightFootActuatorPresent: context.rightFootActuatorPresent,
    leftArmFootActuatorPresent: context.leftArmFootActuatorPresent,
    rightArmFootActuatorPresent: context.rightArmFootActuatorPresent,
    leftArmHasClaw: context.leftArmHasClaw ?? attackerState.leftArmHasClaw,
    rightArmHasClaw: context.rightArmHasClaw ?? attackerState.rightArmHasClaw,
    leftArmCarryingCargo:
      context.leftArmCarryingCargo ?? attackerState.leftArmCarryingCargo,
    rightArmCarryingCargo:
      context.rightArmCarryingCargo ?? attackerState.rightArmCarryingCargo,
  };
}

function buildGrappleFields(
  options: IBuildPhysicalAttackInputOptions,
): Partial<IPhysicalAttackInput> {
  const { attackerState, context, targetState } = options;
  return {
    grappleSide: context.grappleSide,
    attackerGrappledTargetId:
      context.attackerGrappledTargetId ?? attackerState.grappledUnitId,
    targetGrappledTargetId:
      context.targetGrappledTargetId ?? targetState?.grappledUnitId,
    attackerIsGrappleAttacker:
      context.attackerIsGrappleAttacker ?? attackerState.isGrappleAttacker,
    targetIsGrappleAttacker:
      context.targetIsGrappleAttacker ?? targetState?.isGrappleAttacker,
    attackerChainWhipGrappled:
      context.attackerChainWhipGrappled ?? attackerState.isChainWhipGrappled,
    attackerWeightClass: context.attackerWeightClass,
    targetWeightClass: context.targetWeightClass,
    attackerAlreadyGrappled: context.attackerAlreadyGrappled,
  };
}

function buildTacOpsFields(
  options: IBuildPhysicalAttackInputOptions,
): Partial<IPhysicalAttackInput> {
  const { attackerState, context, grid } = options;
  return {
    optionalRules:
      context.optionalRules ?? options.session.config.optionalRules,
    tacOpsTripAttackEnabled: context.tacOpsTripAttackEnabled,
    tacOpsGrapplingEnabled: context.tacOpsGrapplingEnabled,
    leftArmAesFunctional: context.leftArmAesFunctional,
    rightArmAesFunctional: context.rightArmAesFunctional,
    leftTripLimbUsable: context.leftTripLimbUsable,
    rightTripLimbUsable: context.rightTripLimbUsable,
    legAesFunctional: context.legAesFunctional,
    thrashBlockingTerrains: resolveThrashBlockingTerrains(options, grid),
    hasWorkingThrashArmOrLeg: context.hasWorkingThrashArmOrLeg,
    tacOpsJumpJetAttackEnabled: context.tacOpsJumpJetAttackEnabled,
    jumpJetAttackSelectedLeg: jumpJetAttackSelectedLegForLimb(
      options.limb,
      context,
    ),
    leftReadyJumpJetCount: context.leftReadyJumpJetCount,
    rightReadyJumpJetCount: context.rightReadyJumpJetCount,
    leftLegWet: context.leftLegWet,
    rightLegWet: context.rightLegWet,
    leftLegWeaponFiredThisTurn: legWeaponFiredThisTurn(
      attackerState,
      context,
      'left',
    ),
    rightLegWeaponFiredThisTurn: legWeaponFiredThisTurn(
      attackerState,
      context,
      'right',
    ),
  };
}

function resolveThrashBlockingTerrains(
  options: IBuildPhysicalAttackInputOptions,
  grid: IHexGrid | undefined,
): IPhysicalAttackInput['thrashBlockingTerrains'] {
  if (options.deriveThrashBlockingTerrains !== true) {
    return options.context.thrashBlockingTerrains;
  }
  return (
    options.context.thrashBlockingTerrains ??
    thrashBlockingTerrainsForHexTerrain(
      terrainAtPosition(grid, options.attackerState.position),
    )
  );
}

function buildPilotEnvironmentFields(
  options: IBuildPhysicalAttackInputOptions,
): Partial<IPhysicalAttackInput> {
  const { attackerState, context, session } = options;
  return {
    pilotAbilities: context.pilotAbilities ?? attackerState.abilities,
    unitQuirks: context.unitQuirks ?? attackerState.unitQuirks,
    designatedEnvironment:
      context.designatedEnvironment ?? attackerState.designatedEnvironment,
    environmentalLight:
      context.environmentalLight ??
      session.config.environmentalConditions?.light,
    targetIlluminated: context.targetIlluminated,
    elevationDifference: context.elevationDifference,
    elevationContext: context.elevationContext,
    terrainContext: context.terrainContext,
  };
}
