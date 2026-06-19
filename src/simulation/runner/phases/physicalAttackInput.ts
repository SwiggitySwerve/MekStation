import { IGameState, IHexGrid } from '@/types/gameplay';
import { hexDistance } from '@/utils/gameplay/hexMath';
import {
  BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE,
  computePushDisplacement,
  isPhysicalAirborneVtolOrWigeTarget,
  isTargetDirectlyAhead,
  isTargetInFrontArc,
  isValidDisplacement,
  physicalTargetObjectTypeForUnitType,
  thrashBlockingTerrainsForHexTerrain,
  type IPhysicalAttackInput,
  type PhysicalAttackLimb,
  type PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks';
import {
  calculateAttackerMovementModifier,
  calculateTMM,
} from '@/utils/gameplay/toHit/movementModifiers';
import { waterDepthAtPosition } from '@/utils/gameplay/waterDepth';

import type { PhysicalAttackSelection } from './physicalAttackSelection';

import {
  DEFAULT_PILOTING,
  DEFAULT_TONNAGE,
} from '../SimulationRunnerConstants';
import { elevationDifferenceBetween } from './physicalAttackDisplacement';
import {
  armForPhysicalLimb,
  defaultPhysicalAttackLimb,
  targetDirectlyBehindFeet,
  targetHasBrushOffINarcPods,
  targetIsSwarmingInfantryOnAttacker,
  terrainAtPosition,
  weaponsFiredFromPhysicalAttackArm,
} from './physicalAttackHelpers';

type PhysicalAttackUnit = IGameState['units'][string];

export interface BuiltPhysicalAttackInput {
  readonly attackInput: IPhysicalAttackInput;
  readonly effectiveLimb?: PhysicalAttackLimb;
  readonly targetHasINarcPods: boolean;
}

export function buildPhysicalAttackInput(options: {
  readonly state: IGameState;
  readonly grid?: IHexGrid;
  readonly unit: PhysicalAttackUnit;
  readonly selection: PhysicalAttackSelection;
  readonly optionalRules?: readonly string[];
}): BuiltPhysicalAttackInput {
  const { grid, optionalRules, selection, unit } = options;
  const { attackType, target } = selection;
  const targetMovementModifier = calculateTMM(
    target.movementThisTurn,
    target.hexesMovedThisTurn ?? 0,
  ).value;
  const attackerMovementModifier = calculateAttackerMovementModifier(
    unit.movementThisTurn,
  ).value;
  const elevationDifference = elevationDifferenceBetween(grid, unit, target);
  const targetHasINarcPods = targetHasBrushOffINarcPods(target);
  const targetIsAirborneVTOLorWIGE = isPhysicalAirborneVtolOrWigeTarget(
    target.unitType,
    target.motionType,
    target.isAirborne,
  );
  const effectiveLimb =
    selection.declaredLimb ?? defaultPhysicalAttackLimb(attackType);

  return {
    attackInput: {
      attackerId: unit.id,
      targetId: target.id,
      attackerTonnage: DEFAULT_TONNAGE,
      pilotingSkill: unit.piloting ?? DEFAULT_PILOTING,
      componentDamage: selection.componentDamage,
      attackType,
      arm: armForPhysicalLimb(effectiveLimb),
      limb: effectiveLimb,
      twoHandedZweihander: selection.declaredTwoHandedZweihander,
      hexesMoved: selection.movement.hexesMoved,
      attackerProne: unit.prone ?? false,
      attackerStuck: unit.isStuck ?? false,
      weaponsFiredFromArm: weaponsFiredFromPhysicalAttackArm({
        attackType,
        declaredTwoHandedZweihander: selection.declaredTwoHandedZweihander,
        limb: effectiveLimb,
        weaponsFiredFromEitherArm:
          selection.weaponUsage.weaponsFiredFromEitherArm,
        weaponsFiredFromLeftArm: selection.weaponUsage.weaponsFiredFromLeftArm,
        weaponsFiredFromRightArm:
          selection.weaponUsage.weaponsFiredFromRightArm,
        weaponsFiredThisTurn: selection.weaponUsage.weaponsFiredThisTurn,
      }),
      attackerDestroyedLocations: unit.destroyedLocations,
      attackerUnitType: unit.unitType,
      attackerIsQuad: unit.isQuad,
      attackerIsAirborne: unit.isAirborne,
      attackerArmsFlipped: unit.armsFlipped,
      targetUnitType: target.unitType,
      targetPilotingSkill: target.piloting,
      attackerEvading: unit.isEvading,
      attackerLoadingOrUnloadingCargo: unit.isLoadingOrUnloadingCargo,
      attackerTargetedByDisplacementAttackerId:
        unit.targetedByDisplacementAttackerId,
      heat: unit.heat,
      hasTSM: unit.hasTSM ?? false,
      leftLegHasTalons: unit.leftLegHasTalons,
      rightLegHasTalons: unit.rightLegHasTalons,
      leftArmHasTalons: unit.leftArmHasTalons,
      rightArmHasTalons: unit.rightArmHasTalons,
      leftArmHasClaw: unit.leftArmHasClaw,
      rightArmHasClaw: unit.rightArmHasClaw,
      leftArmCarryingCargo: unit.leftArmCarryingCargo,
      rightArmCarryingCargo: unit.rightArmCarryingCargo,
      optionalRules,
      tacOpsGrapplingEnabled: optionalRules?.includes('tacops_grappling'),
      attackerGrappledTargetId: unit.grappledUnitId,
      targetGrappledTargetId: target.grappledUnitId,
      attackerIsGrappleAttacker: unit.isGrappleAttacker,
      targetIsGrappleAttacker: target.isGrappleAttacker,
      attackerChainWhipGrappled: unit.isChainWhipGrappled,
      targetInFrontArc: isTargetInFrontArc(
        unit.position,
        unit.facing,
        target.position,
      ),
      thrashBlockingTerrains: thrashBlockingTerrainsForHexTerrain(
        terrainAtPosition(grid, unit.position),
      ),
      tacOpsJumpJetAttackEnabled: optionalRules?.includes(
        'tacops_jump_jet_attack',
      ),
      jumpJetAttackSelectedLeg: 'right',
      rightReadyJumpJetCount: selection.movement.attackerJumpMP,
      leftLegWeaponFiredThisTurn:
        selection.weaponUsage.leftLegWeaponFiredThisTurn,
      rightLegWeaponFiredThisTurn:
        selection.weaponUsage.rightLegWeaponFiredThisTurn,
      standingAttackerHeightAboveTargetHeight:
        elevationDifference === undefined ? undefined : 1 - elevationDifference,
      proneTargetElevationInRange:
        elevationDifference === undefined
          ? undefined
          : elevationDifference === 0,
      targetDirectlyAheadOfFeet: isTargetDirectlyAhead(
        unit.position,
        unit.facing,
        target.position,
      ),
      targetDirectlyBehindFeet: targetDirectlyBehindFeet(unit, target),
      isUnderwater: isPhysicalAttackUnderwater(grid, unit, target),
      attackerWaterDepth: physicalAttackWaterDepth(grid, unit),
      targetTonnage: DEFAULT_TONNAGE,
      targetProne: target.prone ?? false,
      targetEvading: target.isEvading,
      targetEvasionBonus: target.evasionBonus,
      targetMovementComplete: true,
      targetImmobile: target.shutdown ?? false,
      targetExists: true,
      targetObjectType: physicalTargetObjectTypeForUnitType(target.unitType),
      targetDestroyed: target.destroyed,
      targetRetreated: target.hasRetreated,
      targetEjected: target.hasEjected,
      attackerBoardId: unit.boardId,
      targetBoardId: target.boardId,
      targetIsPassenger: target.isPassenger,
      targetIsSwarming: target.isSwarming,
      targetIsSwarmingInfantryOnAttacker: targetIsSwarmingInfantryOnAttacker(
        unit.id,
        target,
      ),
      targetIsINarcPod: targetHasINarcPods,
      targetIsMakingDFA: target.isMakingDFA,
      targetIsMakingDisplacementAttack: target.isMakingDisplacementAttack,
      targetIsPushing: target.isPushing,
      targetDisplacementAttackTargetId: target.displacementAttackTargetId,
      targetedByDisplacementAttackerId: target.targetedByDisplacementAttackerId,
      targetIsAirborne: target.isAirborne,
      targetIsAirborneVTOLorWIGE,
      attackerJumpMP: selection.movement.attackerJumpMP,
      attackerOccupiedBuildingId: unit.occupiedBuildingId,
      targetOccupiedBuildingId: target.occupiedBuildingId,
      targetIsSelf: unit.id === target.id,
      targetIsFriendly: unit.side === target.side,
      targetDistance: hexDistance(unit.position, target.position),
      targetMovementModifier,
      attackerMovementModifier,
      attackerRanThisTurn: selection.movement.attackerRanThisTurn,
      attackerMovedBackwardThisTurn: unit.movedBackwardThisTurn,
      attackerUsedMechanicalJumpBooster: unit.usedMechanicalJumpBoosterThisTurn,
      attackerJumpedThisTurn: selection.movement.attackerJumpedThisTurn,
      pushDestinationValid: physicalAttackPushDestinationValid({
        attackType,
        grid,
        target,
        attackerFacing: unit.facing,
      }),
      pushTargetDirectlyAhead: isTargetDirectlyAhead(
        unit.position,
        unit.facing,
        target.position,
      ),
      pilotAbilities: unit.abilities,
      unitQuirks: unit.unitQuirks,
      elevationDifference,
    },
    effectiveLimb,
    targetHasINarcPods,
  };
}

function isPhysicalAttackUnderwater(
  grid: IHexGrid | undefined,
  attacker: PhysicalAttackUnit,
  target: PhysicalAttackUnit,
): boolean {
  return (
    grid !== undefined &&
    (waterDepthAtPosition(grid, attacker.position) > 0 ||
      waterDepthAtPosition(grid, target.position) > 0)
  );
}

function physicalAttackWaterDepth(
  grid: IHexGrid | undefined,
  unit: PhysicalAttackUnit,
): number | undefined {
  return grid === undefined
    ? undefined
    : waterDepthAtPosition(grid, unit.position);
}

function physicalAttackPushDestinationValid(options: {
  readonly attackType: PhysicalAttackType;
  readonly grid?: IHexGrid;
  readonly target: PhysicalAttackUnit;
  readonly attackerFacing: PhysicalAttackUnit['facing'];
}): boolean {
  if (options.attackType !== 'push' || !options.grid) return true;
  return isValidDisplacement(
    options.grid,
    computePushDisplacement(options.target.position, options.attackerFacing),
    {
      excludeUnitId: options.target.id,
      source: options.target.position,
      maxElevationChange: BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE,
    },
  );
}
