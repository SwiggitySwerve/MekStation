import {
  IGameState,
  IHexGrid,
  IMovementCapability,
  type IPhysicalDominoStepOutDecisionPayload,
  MovementType,
} from '@/types/gameplay';
import {
  firedWeaponIdsFromMountedArm,
  firedWeaponIdsFromMountedLeg,
} from '@/utils/gameplay/gameSessionPhysicalHelpers';
import { hexDistance } from '@/utils/gameplay/hexMath';
import {
  applyJumpJetCriticalDamage,
  applyPartialWingJumpBonus,
} from '@/utils/gameplay/movement/calculations';
import {
  chooseBestPhysicalAttack,
  isPhysicalAirborneVtolOrWigeTarget,
  isTargetDirectlyAhead,
  physicalTargetObjectTypeForUnitType,
  thrashBlockingTerrainsForHexTerrain,
  type IPhysicalAttackInput,
  type PhysicalAttackINarcPodSelection,
  type PhysicalAttackLimb,
  type PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks';

import type { IAIPlayer } from '../../ai/IAIPlayer';

import { SeededRandom } from '../../core/SeededRandom';
import {
  DEFAULT_COMPONENT_DAMAGE,
  DEFAULT_PILOTING,
  DEFAULT_TONNAGE,
} from '../SimulationRunnerConstants';
import { toAIUnitState } from '../SimulationRunnerSupport';
import { elevationDifferenceBetween } from './physicalAttackDisplacement';
import {
  physicalDeclarationSelectedINarcPod,
  targetDirectlyBehindFeet,
  targetHasBrushOffINarcPods,
  targetIsSwarmingInfantryOnAttacker,
  terrainAtPosition,
} from './physicalAttackHelpers';

type PhysicalAttackUnit = IGameState['units'][string];
type PhysicalAttackComponentDamage = IPhysicalAttackInput['componentDamage'];

export interface PhysicalAttackWeaponUsage {
  readonly weaponsFiredFromLeftArm: readonly string[];
  readonly weaponsFiredFromRightArm: readonly string[];
  readonly weaponsFiredFromEitherArm: readonly string[];
  readonly weaponsFiredThisTurn: readonly string[];
  readonly leftLegWeaponFiredThisTurn: boolean;
  readonly rightLegWeaponFiredThisTurn: boolean;
}

export interface PhysicalAttackMovementContext {
  readonly hexesMoved: number;
  readonly attackerRanThisTurn: boolean;
  readonly attackerJumpedThisTurn: boolean;
  readonly attackerJumpMP?: number;
}

export interface PhysicalAttackSelection {
  readonly attackType: PhysicalAttackType;
  readonly target: PhysicalAttackUnit;
  readonly declaredLimb?: PhysicalAttackLimb;
  readonly declaredTwoHandedZweihander: boolean;
  readonly selectedINarcPod?: PhysicalAttackINarcPodSelection;
  readonly blockerStepOutDecision?: IPhysicalDominoStepOutDecisionPayload;
  readonly componentDamage: PhysicalAttackComponentDamage;
  readonly weaponUsage: PhysicalAttackWeaponUsage;
  readonly movement: PhysicalAttackMovementContext;
}

export function isInactivePhysicalAttackUnit(
  unit: PhysicalAttackUnit,
): boolean {
  return (
    unit.destroyed ||
    unit.hasRetreated ||
    unit.hasEjected ||
    unit.shutdown ||
    !unit.pilotConscious
  );
}

export function physicalAttackEnemyUnits(
  state: IGameState,
  attacker: PhysicalAttackUnit,
): readonly PhysicalAttackUnit[] {
  return Object.values(state.units).filter((target) =>
    isEligiblePhysicalAttackTarget(attacker, target),
  );
}

export function isPronePhysicalAttackBlocked(
  unit: PhysicalAttackUnit,
  attackType: PhysicalAttackType,
): boolean {
  return (
    (unit.prone ?? false) &&
    attackType !== 'thrash' &&
    attackType !== 'jump-jet-attack'
  );
}

export function selectPhysicalAttack(options: {
  readonly unit: PhysicalAttackUnit;
  readonly enemies: readonly PhysicalAttackUnit[];
  readonly botPlayer?: IAIPlayer;
  readonly random: SeededRandom;
  readonly grid?: IHexGrid;
  readonly movementCapabilitiesByUnit?: ReadonlyMap<
    string,
    IMovementCapability
  >;
  readonly optionalRules?: readonly string[];
}): PhysicalAttackSelection | undefined {
  const componentDamage =
    options.unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE;
  const weaponUsage = physicalAttackWeaponUsage(options.unit);
  const movement = physicalAttackMovementContext({
    unit: options.unit,
    movementCapabilitiesByUnit: options.movementCapabilitiesByUnit,
  });

  if (options.botPlayer) {
    return botPhysicalAttackSelection({
      ...options,
      botPlayer: options.botPlayer,
      componentDamage,
      movement,
      weaponUsage,
    });
  }
  return automaticPhysicalAttackSelection({
    ...options,
    componentDamage,
    movement,
    weaponUsage,
  });
}

function isEligiblePhysicalAttackTarget(
  attacker: PhysicalAttackUnit,
  target: PhysicalAttackUnit,
): boolean {
  return (
    !target.destroyed &&
    !target.hasRetreated &&
    !target.hasEjected &&
    target.side !== attacker.side &&
    hexDistance(attacker.position, target.position) <= 1
  );
}

function physicalAttackWeaponUsage(
  unit: PhysicalAttackUnit,
): PhysicalAttackWeaponUsage {
  return {
    weaponsFiredFromLeftArm: firedWeaponIdsFromMountedArm(unit, 'left'),
    weaponsFiredFromRightArm: firedWeaponIdsFromMountedArm(unit, 'right'),
    weaponsFiredFromEitherArm: firedWeaponIdsFromMountedArm(unit),
    weaponsFiredThisTurn: unit.weaponsFiredThisTurn ?? [],
    leftLegWeaponFiredThisTurn:
      firedWeaponIdsFromMountedLeg(unit, 'left').length > 0,
    rightLegWeaponFiredThisTurn:
      firedWeaponIdsFromMountedLeg(unit, 'right').length > 0,
  };
}

function physicalAttackMovementContext(options: {
  readonly unit: PhysicalAttackUnit;
  readonly movementCapabilitiesByUnit?: ReadonlyMap<
    string,
    IMovementCapability
  >;
}): PhysicalAttackMovementContext {
  const { unit } = options;
  const hexesMoved = unit.hexesMovedThisTurn ?? 0;
  const baseMovementCapability = options.movementCapabilitiesByUnit?.get(
    unit.id,
  );
  const jumpDamageCapability =
    baseMovementCapability === undefined
      ? undefined
      : applyJumpJetCriticalDamage(
          baseMovementCapability,
          unit.componentDamage?.jumpJetsDestroyed,
        );
  const physicalMovementCapability =
    jumpDamageCapability === undefined
      ? undefined
      : applyPartialWingJumpBonus(
          jumpDamageCapability,
          unit.partialWingJumpBonus,
        );

  return {
    hexesMoved,
    attackerRanThisTurn: unit.movementThisTurn === MovementType.Run,
    attackerJumpedThisTurn: unit.movementThisTurn === MovementType.Jump,
    attackerJumpMP: physicalMovementCapability?.jumpMP,
  };
}

function botPhysicalAttackSelection(options: {
  readonly unit: PhysicalAttackUnit;
  readonly enemies: readonly PhysicalAttackUnit[];
  readonly botPlayer: IAIPlayer;
  readonly componentDamage: PhysicalAttackComponentDamage;
  readonly weaponUsage: PhysicalAttackWeaponUsage;
  readonly movement: PhysicalAttackMovementContext;
}): PhysicalAttackSelection | undefined {
  const declaration = options.botPlayer.playPhysicalAttackPhase(
    toAIUnitState(options.unit),
    options.enemies.map((enemy) => toAIUnitState(enemy)),
    {
      attackerTonnage: DEFAULT_TONNAGE,
      pilotingSkill: options.unit.piloting ?? DEFAULT_PILOTING,
    },
  );
  if (!declaration) return undefined;

  const target = options.enemies.find(
    (enemy) => enemy.id === declaration.payload.targetId,
  );
  if (!target) return undefined;

  return {
    attackType: declaration.payload.attackType,
    target,
    declaredLimb: declaration.payload.limb,
    declaredTwoHandedZweihander:
      declaration.payload.twoHandedZweihander === true,
    selectedINarcPod: physicalDeclarationSelectedINarcPod(declaration.payload),
    blockerStepOutDecision: declaration.payload.blockerStepOutDecision,
    componentDamage: options.componentDamage,
    weaponUsage: options.weaponUsage,
    movement: options.movement,
  };
}

function automaticPhysicalAttackSelection(options: {
  readonly unit: PhysicalAttackUnit;
  readonly enemies: readonly PhysicalAttackUnit[];
  readonly random: SeededRandom;
  readonly grid?: IHexGrid;
  readonly optionalRules?: readonly string[];
  readonly componentDamage: PhysicalAttackComponentDamage;
  readonly weaponUsage: PhysicalAttackWeaponUsage;
  readonly movement: PhysicalAttackMovementContext;
}): PhysicalAttackSelection | undefined {
  const target =
    options.enemies[options.random.nextInt(options.enemies.length)];
  const elevationDifference = elevationDifferenceBetween(
    options.grid,
    options.unit,
    target,
  );
  const attackType = chooseBestPhysicalAttack(
    DEFAULT_TONNAGE,
    options.unit.piloting ?? DEFAULT_PILOTING,
    options.componentDamage,
    {
      attackerProne: options.unit.prone ?? false,
      attackerStuck: options.unit.isStuck ?? false,
      weaponsFiredFromLeftArm: options.weaponUsage.weaponsFiredFromLeftArm,
      weaponsFiredFromRightArm: options.weaponUsage.weaponsFiredFromRightArm,
      heat: options.unit.heat,
      hasTSM: options.unit.hasTSM ?? false,
      attackerIsQuad: options.unit.isQuad,
      leftLegHasTalons: options.unit.leftLegHasTalons,
      rightLegHasTalons: options.unit.rightLegHasTalons,
      leftArmHasTalons: options.unit.leftArmHasTalons,
      rightArmHasTalons: options.unit.rightArmHasTalons,
      leftArmHasClaw: options.unit.leftArmHasClaw,
      rightArmHasClaw: options.unit.rightArmHasClaw,
      leftArmCarryingCargo: options.unit.leftArmCarryingCargo,
      rightArmCarryingCargo: options.unit.rightArmCarryingCargo,
      canReachForCharge:
        options.movement.attackerRanThisTurn && options.movement.hexesMoved > 1,
      hexesMoved: options.movement.hexesMoved,
      attackerMovedBackwardThisTurn: options.unit.movedBackwardThisTurn,
      attackerUsedMechanicalJumpBooster:
        options.unit.usedMechanicalJumpBoosterThisTurn,
      isJumping: options.movement.attackerJumpedThisTurn,
      pilotAbilities: options.unit.abilities,
      unitQuirks: options.unit.unitQuirks,
      attackerEvading: options.unit.isEvading,
      attackerLoadingOrUnloadingCargo: options.unit.isLoadingOrUnloadingCargo,
      attackerId: options.unit.id,
      targetId: target.id,
      attackerTargetedByDisplacementAttackerId:
        options.unit.targetedByDisplacementAttackerId,
      attackerBoardId: options.unit.boardId,
      targetBoardId: target.boardId,
      targetIsMakingDisplacementAttack: target.isMakingDisplacementAttack,
      targetIsPushing: target.isPushing,
      targetDisplacementAttackTargetId: target.displacementAttackTargetId,
      targetedByDisplacementAttackerId: target.targetedByDisplacementAttackerId,
      elevationDifference,
      targetUnitType: target.unitType,
      targetDistance: hexDistance(options.unit.position, target.position),
      targetIsSwarming: target.isSwarming,
      targetIsSwarmingInfantryOnAttacker: targetIsSwarmingInfantryOnAttacker(
        options.unit.id,
        target,
      ),
      targetIsINarcPod: targetHasBrushOffINarcPods(target),
      targetObjectType: physicalTargetObjectTypeForUnitType(target.unitType),
      weaponsFiredThisTurn: options.weaponUsage.weaponsFiredThisTurn,
      optionalRules: options.optionalRules,
      tacOpsGrapplingEnabled:
        options.optionalRules?.includes('tacops_grappling'),
      attackerGrappledTargetId: options.unit.grappledUnitId,
      targetGrappledTargetId: target.grappledUnitId,
      attackerIsGrappleAttacker: options.unit.isGrappleAttacker,
      targetIsGrappleAttacker: target.isGrappleAttacker,
      attackerChainWhipGrappled: options.unit.isChainWhipGrappled,
      tacOpsJumpJetAttackEnabled: options.optionalRules?.includes(
        'tacops_jump_jet_attack',
      ),
      jumpJetAttackSelectedLeg: 'right',
      rightReadyJumpJetCount: options.movement.attackerJumpMP,
      leftLegWeaponFiredThisTurn:
        options.weaponUsage.leftLegWeaponFiredThisTurn,
      rightLegWeaponFiredThisTurn:
        options.weaponUsage.rightLegWeaponFiredThisTurn,
      standingAttackerHeightAboveTargetHeight:
        elevationDifference === undefined ? undefined : 1 - elevationDifference,
      proneTargetElevationInRange:
        elevationDifference === undefined
          ? undefined
          : elevationDifference === 0,
      targetDirectlyAheadOfFeet: isTargetDirectlyAhead(
        options.unit.position,
        options.unit.facing,
        target.position,
      ),
      targetDirectlyBehindFeet: targetDirectlyBehindFeet(options.unit, target),
      thrashBlockingTerrains: thrashBlockingTerrainsForHexTerrain(
        terrainAtPosition(options.grid, options.unit.position),
      ),
      targetIsAirborne: target.isAirborne,
      targetIsAirborneVTOLorWIGE: isPhysicalAirborneVtolOrWigeTarget(
        target.unitType,
        target.motionType,
        target.isAirborne,
      ),
      attackerJumpMP: options.movement.attackerJumpMP,
    },
  );
  if (!attackType) return undefined;

  return {
    attackType,
    target,
    declaredTwoHandedZweihander: false,
    componentDamage: options.componentDamage,
    weaponUsage: options.weaponUsage,
    movement: options.movement,
  };
}
