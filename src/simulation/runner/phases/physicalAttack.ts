import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
  IHexGrid,
  IMovementCapability,
  MovementType,
  PSRTrigger,
} from '@/types/gameplay';
import { resolvePilotConsciousnessCheck } from '@/utils/gameplay/damage';
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
  computePushDisplacement,
  BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE,
  IPhysicalAttackInput,
  isPhysicalAirborneVtolOrWigeTarget,
  isTargetDirectlyAhead,
  isTargetInFrontArc,
  isValidDisplacement,
  physicalTargetObjectTypeForUnitType,
  PhysicalAttackType,
  resolveDfaMissFallDamage,
  resolveDfaMissFallPilotDamageAvoidance,
  resolvePhysicalAttack,
  sourceContainsGroundedDropShip,
  splitPhysicalDamageIntoClusters,
  thrashBlockingTerrainsForHexTerrain,
  translateHex,
} from '@/utils/gameplay/physicalAttacks';
import {
  calculateAttackerMovementModifier,
  calculateTMM,
} from '@/utils/gameplay/toHit/movementModifiers';
import { waterDepthAtPosition } from '@/utils/gameplay/waterDepth';

import type { IAIPlayer } from '../../ai/IAIPlayer';

import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import {
  DEFAULT_COMPONENT_DAMAGE,
  LETHAL_PILOT_WOUNDS,
  DEFAULT_PILOTING,
  DEFAULT_TONNAGE,
} from '../SimulationRunnerConstants';
import { toAIUnitState } from '../SimulationRunnerSupport';
import {
  applyPhysicalDamageClusterLocations,
  applyDfaAttackerLegDamage,
  applyPhysicalDamageClusters,
} from './physicalAttackDamage';
import {
  applyPhysicalDisplacementsToGrid,
  computePhysicalDisplacementOutcome,
  displaceUnit,
  elevationDifferenceBetween,
} from './physicalAttackDisplacement';
import {
  applyImpossibleDisplacementDestruction,
  emitPhysicalAttackDeclaredEvent,
  emitPhysicalAttackResolvedEvent,
} from './physicalAttackEvents';
import {
  attackerHitPSRForAttack,
  attackerMissPSRForAttack,
  dominoEffectPSRForDisplacement,
  queuePendingPSR,
  targetPSRForAttack,
} from './physicalAttackPsr';
import { createD6Roller, createGameEvent } from './utils';

function dfaMissDropsAttacker(
  displacements: readonly {
    readonly unitId: string;
    readonly reason: string;
  }[],
  attackerId: string,
): boolean {
  return displacements.some(
    (displacement) =>
      displacement.unitId === attackerId && displacement.reason === 'dfa_miss',
  );
}

function dominoEffectDisplacedUnitIds(
  displacements: readonly {
    readonly unitId: string;
    readonly reason: string;
  }[],
): readonly string[] {
  return displacements
    .filter((displacement) => displacement.reason === 'domino')
    .map((displacement) => displacement.unitId);
}

function friendlyUnitIdsForDisplacement(
  state: IGameState,
  displacedUnit: IGameState['units'][string],
): readonly string[] {
  return Object.values(state.units)
    .filter(
      (unit) =>
        unit.id !== displacedUnit.id && unit.side === displacedUnit.side,
    )
    .map((unit) => unit.id);
}

function terrainAtPosition(
  grid: IHexGrid | undefined,
  position: IGameState['units'][string]['position'],
): string | undefined {
  if (!grid) return undefined;
  return grid.hexes.get(`${position.q},${position.r}`)?.terrain;
}

function targetDirectlyBehindFeet(
  attacker: IGameState['units'][string],
  target: IGameState['units'][string],
): boolean {
  const oppositeFacing = ((attacker.facing + 3) % 6) as typeof attacker.facing;
  return isTargetDirectlyAhead(
    attacker.position,
    oppositeFacing,
    target.position,
  );
}

function canonicalBrushOffTargetUnitType(
  unit: IGameState['units'][string],
): string | undefined {
  if (unit.combatState?.kind === 'squad') return 'battlearmor';
  return unit.unitType?.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function swarmingHostId(unit: IGameState['units'][string]): string | undefined {
  if (unit.combatState?.kind !== 'squad') return undefined;
  return unit.combatState.state.swarmingUnitId;
}

function targetIsSwarmingInfantryOnAttacker(
  attackerId: string,
  target: IGameState['units'][string],
): boolean {
  if (target.isSwarming !== true) return false;

  const canonical = canonicalBrushOffTargetUnitType(target);
  if (canonical !== 'infantry' && canonical !== 'battlearmor') return false;

  const hostId = swarmingHostId(target);
  return hostId === undefined || hostId === attackerId;
}

function clearBrushOffSwarmingState(
  state: IGameState,
  unitId: string,
): IGameState {
  const unit = state.units[unitId];
  if (!unit) return state;

  const combatState =
    unit.combatState?.kind === 'squad'
      ? (() => {
          const { swarmingUnitId: _swarmingUnitId, ...squadState } =
            unit.combatState.state;
          return {
            ...unit.combatState,
            state: squadState,
          };
        })()
      : unit.combatState;

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        isSwarming: false,
        ...(combatState ? { combatState } : {}),
      },
    },
  };
}

function applyGrappleState(
  state: IGameState,
  attackerId: string,
  targetId: string,
): IGameState {
  const attacker = state.units[attackerId];
  const target = state.units[targetId];
  if (!attacker || !target) return state;

  return {
    ...state,
    units: {
      ...state.units,
      [attackerId]: {
        ...attacker,
        grappledUnitId: targetId,
        isGrappleAttacker: true,
        grappledThisRound: true,
        grappleSide: 'both',
        position: target.position,
      },
      [targetId]: {
        ...target,
        grappledUnitId: attackerId,
        isGrappleAttacker: false,
        grappledThisRound: true,
        grappleSide: 'both',
        facing: ((attacker.facing + 3) % 6) as typeof target.facing,
      },
    },
  };
}

function facingToward(
  source: IGameState['units'][string]['position'],
  destination: IGameState['units'][string]['position'],
  fallback: IGameState['units'][string]['facing'],
): IGameState['units'][string]['facing'] {
  for (let facing = 0; facing < 6; facing++) {
    const translated = translateHex(source, facing as typeof fallback);
    if (translated.q === destination.q && translated.r === destination.r) {
      return facing as typeof fallback;
    }
  }
  return fallback;
}

function applyBreakGrappleState(options: {
  readonly state: IGameState;
  readonly attackerId: string;
  readonly targetId: string;
  readonly displacements: readonly {
    readonly unitId: string;
    readonly reason: string;
  }[];
}): IGameState {
  const { attackerId, displacements, state, targetId } = options;
  const attacker = state.units[attackerId];
  const target = state.units[targetId];
  if (!attacker || !target) return state;

  const attackerMoved = displacements.some(
    (displacement) =>
      displacement.reason === 'break-grapple' &&
      displacement.unitId === attackerId,
  );
  const targetMoved = displacements.some(
    (displacement) =>
      displacement.reason === 'break-grapple' &&
      displacement.unitId === targetId,
  );

  return {
    ...state,
    units: {
      ...state.units,
      [attackerId]: {
        ...attacker,
        grappledUnitId: undefined,
        isGrappleAttacker: undefined,
        grappledThisRound: false,
        grappleSide: undefined,
        isChainWhipGrappled: false,
        facing: attackerMoved
          ? facingToward(attacker.position, target.position, attacker.facing)
          : attacker.facing,
      },
      [targetId]: {
        ...target,
        grappledUnitId: undefined,
        isGrappleAttacker: undefined,
        grappledThisRound: false,
        grappleSide: undefined,
        isChainWhipGrappled: false,
        facing: targetMoved
          ? facingToward(target.position, attacker.position, target.facing)
          : target.facing,
      },
    },
  };
}

function markUnitFallenAfterDfaMiss(
  state: IGameState,
  unitId: string,
  newFacing: IGameState['units'][string]['facing'],
): IGameState {
  const unit = state.units[unitId];
  if (!unit) return state;

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        prone: true,
        facing: newFacing,
        pendingPSRs: [],
      },
    },
  };
}

function applyDfaMissFallPilotDamage(options: {
  readonly state: IGameState;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly unitId: string;
  readonly pilotDamage: number;
  readonly d6Roller: () => number;
}): IGameState {
  const { d6Roller, events, gameId, pilotDamage, state, unitId } = options;
  if (pilotDamage <= 0) {
    return state;
  }

  const unit = state.units[unitId];
  if (!unit) {
    return state;
  }

  const totalWounds = unit.pilotWounds + pilotDamage;
  const consciousnessCheck = resolvePilotConsciousnessCheck(
    totalWounds,
    pilotDamage,
    unit.abilities ?? [],
    d6Roller,
  );
  const pilotConscious =
    totalWounds < LETHAL_PILOT_WOUNDS &&
    unit.pilotConscious &&
    (consciousnessCheck.conscious ?? true);
  const pilotKilled = totalWounds >= LETHAL_PILOT_WOUNDS && !unit.destroyed;

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.PilotHit,
      state.turn,
      GamePhase.PhysicalAttack,
      {
        unitId,
        wounds: pilotDamage,
        totalWounds,
        source: 'fall',
        consciousnessCheckRequired:
          consciousnessCheck.consciousnessCheckRequired,
        consciousnessCheckPassed: pilotConscious,
      },
      unitId,
    ),
  );

  if (pilotKilled) {
    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.UnitDestroyed,
        state.turn,
        GamePhase.PhysicalAttack,
        {
          unitId,
          cause: 'pilot_death',
        },
        unitId,
      ),
    );
  }

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        pilotWounds: totalWounds,
        pilotConscious,
        destroyed: pilotKilled ? true : unit.destroyed,
      },
    },
  };
}

export function runPhysicalAttackPhase(options: {
  state: IGameState;
  botPlayer?: IAIPlayer;
  invariantRunner: InvariantRunner;
  violations: IViolation[];
  events: IGameEvent[];
  gameId: string;
  random: SeededRandom;
  grid?: IHexGrid;
  movementCapabilitiesByUnit?: ReadonlyMap<string, IMovementCapability>;
  optionalRules?: readonly string[];
}): IGameState {
  const {
    botPlayer,
    events,
    gameId,
    grid,
    invariantRunner,
    movementCapabilitiesByUnit,
    optionalRules,
    random,
    state,
    violations,
  } = options;
  let currentState = { ...state, phase: GamePhase.PhysicalAttack };
  let physicalGrid = grid;
  violations.push(...invariantRunner.runAll(currentState));

  const d6Roller = createD6Roller(random);

  for (const unitId of Object.keys(currentState.units)) {
    const unit = currentState.units[unitId];
    if (
      unit.destroyed ||
      unit.hasRetreated ||
      unit.hasEjected ||
      unit.shutdown ||
      !unit.pilotConscious
    ) {
      continue;
    }

    const enemies = Object.values(currentState.units).filter(
      (otherUnit) =>
        !otherUnit.destroyed &&
        !otherUnit.hasRetreated &&
        !otherUnit.hasEjected &&
        otherUnit.side !== unit.side &&
        hexDistance(unit.position, otherUnit.position) <= 1,
    );
    if (enemies.length === 0) {
      continue;
    }

    const componentDamage = unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE;
    const weaponsFiredFromLeftArm = firedWeaponIdsFromMountedArm(unit, 'left');
    const weaponsFiredFromRightArm = firedWeaponIdsFromMountedArm(
      unit,
      'right',
    );
    const weaponsFiredFromEitherArm = firedWeaponIdsFromMountedArm(unit);
    const leftLegWeaponFiredThisTurn =
      firedWeaponIdsFromMountedLeg(unit, 'left').length > 0;
    const rightLegWeaponFiredThisTurn =
      firedWeaponIdsFromMountedLeg(unit, 'right').length > 0;
    const weaponsFiredThisTurn = unit.weaponsFiredThisTurn ?? [];
    const hexesMoved = unit.hexesMovedThisTurn ?? 0;
    const attackerRanThisTurn = unit.movementThisTurn === MovementType.Run;
    const attackerJumpedThisTurn = unit.movementThisTurn === MovementType.Jump;
    const baseMovementCapability = movementCapabilitiesByUnit?.get(unit.id);
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
    const attackerJumpMP = physicalMovementCapability?.jumpMP;
    let bestAttack: PhysicalAttackType | null = null;
    let target = enemies[0];

    if (botPlayer) {
      const declaration = botPlayer.playPhysicalAttackPhase(
        toAIUnitState(unit),
        enemies.map((enemy) => toAIUnitState(enemy)),
        {
          attackerTonnage: DEFAULT_TONNAGE,
          pilotingSkill: unit.piloting ?? DEFAULT_PILOTING,
        },
      );
      if (!declaration) continue;
      const declaredTarget = enemies.find(
        (enemy) => enemy.id === declaration.payload.targetId,
      );
      if (!declaredTarget) continue;
      bestAttack = declaration.payload.attackType;
      target = declaredTarget;
    } else {
      target = enemies[random.nextInt(enemies.length)];
      const elevationDifference = elevationDifferenceBetween(
        physicalGrid,
        unit,
        target,
      );
      const targetIsAirborneVTOLorWIGE = isPhysicalAirborneVtolOrWigeTarget(
        target.unitType,
        target.motionType,
        target.isAirborne,
      );
      bestAttack = chooseBestPhysicalAttack(
        DEFAULT_TONNAGE,
        unit.piloting ?? DEFAULT_PILOTING,
        componentDamage,
        {
          attackerProne: unit.prone ?? false,
          weaponsFiredFromLeftArm,
          weaponsFiredFromRightArm,
          heat: unit.heat,
          hasTSM: unit.hasTSM ?? false,
          attackerIsQuad: unit.isQuad,
          leftLegHasTalons: unit.leftLegHasTalons,
          rightLegHasTalons: unit.rightLegHasTalons,
          leftArmHasTalons: unit.leftArmHasTalons,
          rightArmHasTalons: unit.rightArmHasTalons,
          leftArmHasClaw: unit.leftArmHasClaw,
          rightArmHasClaw: unit.rightArmHasClaw,
          canReachForCharge: attackerRanThisTurn && hexesMoved > 1,
          hexesMoved,
          attackerMovedBackwardThisTurn: unit.movedBackwardThisTurn,
          attackerUsedMechanicalJumpBooster:
            unit.usedMechanicalJumpBoosterThisTurn,
          isJumping: attackerJumpedThisTurn,
          pilotAbilities: unit.abilities,
          unitQuirks: unit.unitQuirks,
          attackerEvading: unit.isEvading,
          attackerLoadingOrUnloadingCargo: unit.isLoadingOrUnloadingCargo,
          attackerId: unit.id,
          targetId: target.id,
          attackerTargetedByDisplacementAttackerId:
            unit.targetedByDisplacementAttackerId,
          attackerBoardId: unit.boardId,
          targetBoardId: target.boardId,
          targetIsMakingDisplacementAttack: target.isMakingDisplacementAttack,
          targetIsPushing: target.isPushing,
          targetDisplacementAttackTargetId: target.displacementAttackTargetId,
          targetedByDisplacementAttackerId:
            target.targetedByDisplacementAttackerId,
          elevationDifference,
          targetUnitType: target.unitType,
          targetDistance: hexDistance(unit.position, target.position),
          targetIsSwarming: target.isSwarming,
          targetIsSwarmingInfantryOnAttacker:
            targetIsSwarmingInfantryOnAttacker(unit.id, target),
          targetObjectType: physicalTargetObjectTypeForUnitType(
            target.unitType,
          ),
          weaponsFiredThisTurn,
          optionalRules,
          tacOpsGrapplingEnabled: optionalRules?.includes('tacops_grappling'),
          attackerGrappledTargetId: unit.grappledUnitId,
          targetGrappledTargetId: target.grappledUnitId,
          attackerIsGrappleAttacker: unit.isGrappleAttacker,
          targetIsGrappleAttacker: target.isGrappleAttacker,
          attackerChainWhipGrappled: unit.isChainWhipGrappled,
          tacOpsJumpJetAttackEnabled: optionalRules?.includes(
            'tacops_jump_jet_attack',
          ),
          jumpJetAttackSelectedLeg: 'right',
          rightReadyJumpJetCount: attackerJumpMP,
          leftLegWeaponFiredThisTurn,
          rightLegWeaponFiredThisTurn,
          standingAttackerHeightAboveTargetHeight:
            elevationDifference === undefined
              ? undefined
              : 1 - elevationDifference,
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
          thrashBlockingTerrains: thrashBlockingTerrainsForHexTerrain(
            terrainAtPosition(physicalGrid, unit.position),
          ),
          targetIsAirborne: target.isAirborne,
          targetIsAirborneVTOLorWIGE,
          attackerJumpMP,
        },
      );
    }

    if (!bestAttack) continue;
    if (
      (unit.prone ?? false) &&
      bestAttack !== 'thrash' &&
      bestAttack !== 'jump-jet-attack'
    )
      continue;

    const targetMovementModifier = calculateTMM(
      target.movementThisTurn,
      target.hexesMovedThisTurn ?? 0,
    ).value;
    const attackerMovementModifier = calculateAttackerMovementModifier(
      unit.movementThisTurn,
    ).value;
    const isUnderwater =
      physicalGrid !== undefined &&
      (waterDepthAtPosition(physicalGrid, unit.position) > 0 ||
        waterDepthAtPosition(physicalGrid, target.position) > 0);
    const attackerWaterDepth =
      physicalGrid !== undefined
        ? waterDepthAtPosition(physicalGrid, unit.position)
        : undefined;
    const elevationDifference = elevationDifferenceBetween(
      physicalGrid,
      unit,
      target,
    );
    const targetIsAirborneVTOLorWIGE = isPhysicalAirborneVtolOrWigeTarget(
      target.unitType,
      target.motionType,
      target.isAirborne,
    );
    const pushDestinationValid =
      bestAttack !== 'push' || !physicalGrid
        ? true
        : isValidDisplacement(
            physicalGrid,
            computePushDisplacement(target.position, unit.facing),
            {
              excludeUnitId: target.id,
              source: target.position,
              maxElevationChange: BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE,
            },
          );

    const attackInput: IPhysicalAttackInput = {
      attackerId: unit.id,
      targetId: target.id,
      attackerTonnage: DEFAULT_TONNAGE,
      pilotingSkill: unit.piloting ?? DEFAULT_PILOTING,
      componentDamage,
      attackType: bestAttack,
      arm: 'right',
      hexesMoved,
      attackerProne: unit.prone ?? false,
      weaponsFiredFromArm:
        bestAttack === 'thrash'
          ? weaponsFiredThisTurn
          : bestAttack === 'grapple'
            ? weaponsFiredThisTurn
            : bestAttack === 'push'
              ? weaponsFiredFromEitherArm
              : bestAttack === 'punch' || bestAttack === 'brush-off'
                ? weaponsFiredFromRightArm
                : undefined,
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
        terrainAtPosition(physicalGrid, unit.position),
      ),
      tacOpsJumpJetAttackEnabled: optionalRules?.includes(
        'tacops_jump_jet_attack',
      ),
      jumpJetAttackSelectedLeg: 'right',
      rightReadyJumpJetCount: attackerJumpMP,
      leftLegWeaponFiredThisTurn,
      rightLegWeaponFiredThisTurn,
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
      isUnderwater,
      attackerWaterDepth,
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
      targetIsMakingDFA: target.isMakingDFA,
      targetIsMakingDisplacementAttack: target.isMakingDisplacementAttack,
      targetIsPushing: target.isPushing,
      targetDisplacementAttackTargetId: target.displacementAttackTargetId,
      targetedByDisplacementAttackerId: target.targetedByDisplacementAttackerId,
      targetIsAirborne: target.isAirborne,
      targetIsAirborneVTOLorWIGE,
      attackerJumpMP,
      attackerOccupiedBuildingId: unit.occupiedBuildingId,
      targetOccupiedBuildingId: target.occupiedBuildingId,
      targetIsSelf: unit.id === target.id,
      targetIsFriendly: unit.side === target.side,
      targetDistance: hexDistance(unit.position, target.position),
      targetMovementModifier,
      attackerMovementModifier,
      attackerRanThisTurn,
      attackerMovedBackwardThisTurn: unit.movedBackwardThisTurn,
      attackerUsedMechanicalJumpBooster: unit.usedMechanicalJumpBoosterThisTurn,
      attackerJumpedThisTurn,
      pushDestinationValid,
      pushTargetDirectlyAhead: isTargetDirectlyAhead(
        unit.position,
        unit.facing,
        target.position,
      ),
      pilotAbilities: unit.abilities,
      unitQuirks: unit.unitQuirks,
      elevationDifference,
    };

    const result = resolvePhysicalAttack(attackInput, d6Roller);
    const displacementOutcome =
      result.restrictionReasonCode === undefined
        ? computePhysicalDisplacementOutcome({
            grid: physicalGrid,
            attackType: bestAttack,
            attacker: unit,
            target,
            hit: result.hit,
            d6Roller,
            targetFriendlyUnitIds: friendlyUnitIdsForDisplacement(
              currentState,
              target,
            ),
            targetSourceContainsGroundedDropShip:
              sourceContainsGroundedDropShip(
                Object.values(currentState.units),
                target,
              ),
          })
        : { displacements: [] };
    const displacements = displacementOutcome.displacements;
    const impossibleDisplacementDestroyedUnitId =
      displacementOutcome.impossibleDisplacementDestroyedUnitId;
    const chargeHitDisplacementBlocked =
      result.hit &&
      bestAttack === 'charge' &&
      Boolean(physicalGrid) &&
      displacements.length === 0;
    const dfaMissFall =
      !result.hit &&
      bestAttack === 'dfa' &&
      impossibleDisplacementDestroyedUnitId !== unitId &&
      dfaMissDropsAttacker(displacements, unitId)
        ? resolveDfaMissFallDamage(DEFAULT_TONNAGE, unit.facing, d6Roller)
        : undefined;

    emitPhysicalAttackDeclaredEvent({
      events,
      gameId,
      turn: currentState.turn,
      attackerId: unitId,
      targetId: target.id,
      attackType: bestAttack,
      toHitNumber: result.toHitNumber,
    });

    if (result.hit && result.targetDamage > 0 && result.hitLocation) {
      const targetClusters =
        bestAttack === 'charge' || bestAttack === 'dfa'
          ? splitPhysicalDamageIntoClusters(result.targetDamage)
          : [result.targetDamage];
      currentState = applyPhysicalDamageClusters({
        state: currentState,
        events,
        gameId,
        unitId: target.id,
        clusters: targetClusters,
        hitTable: bestAttack === 'kick' ? 'kick' : 'punch',
        d6Roller,
        sourceUnitId: unitId,
        firstHitLocation: result.hitLocation,
      });
    }

    if (result.hit && bestAttack === 'brush-off') {
      currentState = clearBrushOffSwarmingState(currentState, target.id);
    }

    if (result.hit && bestAttack === 'grapple') {
      currentState = applyGrappleState(currentState, unitId, target.id);
    }

    if (
      !result.hit &&
      bestAttack === 'brush-off' &&
      result.attackerDamage > 0 &&
      result.hitLocation
    ) {
      currentState = applyPhysicalDamageClusters({
        state: currentState,
        events,
        gameId,
        unitId,
        clusters: [result.attackerDamage],
        hitTable: 'punch',
        d6Roller,
        sourceUnitId: unitId,
        firstHitLocation: result.hitLocation,
      });
    }

    if (result.hit && bestAttack === 'charge' && result.attackerDamage > 0) {
      currentState = applyPhysicalDamageClusters({
        state: currentState,
        events,
        gameId,
        unitId,
        clusters: splitPhysicalDamageIntoClusters(result.attackerDamage),
        hitTable: 'punch',
        d6Roller,
      });
    }

    if (
      result.hit &&
      bestAttack === 'dfa' &&
      result.attackerLegDamagePerLeg > 0
    ) {
      const legClusters = splitPhysicalDamageIntoClusters(
        result.attackerLegDamagePerLeg * 2,
      );
      currentState = applyDfaAttackerLegDamage({
        state: currentState,
        events,
        gameId,
        unitId,
        clusters: legClusters,
        d6Roller,
      });
    }

    if (
      result.hit &&
      result.targetPSR &&
      impossibleDisplacementDestroyedUnitId !== target.id &&
      !chargeHitDisplacementBlocked
    ) {
      const psr = targetPSRForAttack(bestAttack, target.id);
      if (psr) currentState = queuePendingPSR(currentState, target.id, psr);
    }

    if (result.hit && result.attackerPSR && !chargeHitDisplacementBlocked) {
      const psr = attackerHitPSRForAttack(bestAttack, unitId, result);
      if (psr) currentState = queuePendingPSR(currentState, unitId, psr);
    }

    if (
      !result.hit &&
      result.attackerPSR &&
      impossibleDisplacementDestroyedUnitId !== unitId &&
      dfaMissFall === undefined
    ) {
      currentState = queuePendingPSR(
        currentState,
        unitId,
        attackerMissPSRForAttack(bestAttack, unitId, result),
      );
    }

    for (const dominoUnitId of dominoEffectDisplacedUnitIds(displacements)) {
      currentState = queuePendingPSR(
        currentState,
        dominoUnitId,
        dominoEffectPSRForDisplacement(dominoUnitId),
      );
    }

    for (const displacement of displacements) {
      currentState = displaceUnit(
        currentState,
        displacement.unitId,
        displacement.to,
      );
    }
    if (result.hit && bestAttack === 'break-grapple') {
      currentState = applyBreakGrappleState({
        state: currentState,
        attackerId: unitId,
        targetId: target.id,
        displacements,
      });
    }
    physicalGrid = applyPhysicalDisplacementsToGrid(
      physicalGrid,
      displacements,
    );

    if (dfaMissFall !== undefined) {
      currentState = applyPhysicalDamageClusterLocations({
        state: currentState,
        events,
        gameId,
        unitId,
        clusters: dfaMissFall.clusters,
        d6Roller,
      });
      const pilotDamageAvoidance = resolveDfaMissFallPilotDamageAvoidance(
        unit.piloting ?? DEFAULT_PILOTING,
        dfaMissFall.fallHeight,
        d6Roller,
        unit.abilities ?? [],
      );
      currentState = markUnitFallenAfterDfaMiss(
        currentState,
        unitId,
        dfaMissFall.newFacing,
      );
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.UnitFell,
          currentState.turn,
          GamePhase.PhysicalAttack,
          {
            unitId,
            fallDamage: dfaMissFall.fallDamage,
            newFacing: dfaMissFall.newFacing,
            pilotDamage: pilotDamageAvoidance.pilotDamage,
            location: 'dfa_miss',
            reason: 'Missed DFA',
            reasonCode: PSRTrigger.DFAMiss,
          },
          unitId,
        ),
      );
      currentState = applyDfaMissFallPilotDamage({
        state: currentState,
        events,
        gameId,
        unitId,
        pilotDamage: pilotDamageAvoidance.pilotDamage,
        d6Roller,
      });
    }

    currentState = applyImpossibleDisplacementDestruction({
      state: currentState,
      events,
      gameId,
      turn: currentState.turn,
      destroyedUnitId: impossibleDisplacementDestroyedUnitId,
      attackerId: unitId,
      targetId: target.id,
    });

    emitPhysicalAttackResolvedEvent({
      events,
      gameId,
      turn: currentState.turn,
      attackerId: unitId,
      targetId: target.id,
      attackType: bestAttack,
      result,
      displacements,
    });
  }

  violations.push(...invariantRunner.runAll(currentState));
  return currentState;
}
