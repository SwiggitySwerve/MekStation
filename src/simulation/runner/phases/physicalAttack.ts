import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
  IHexGrid,
  MovementType,
  PSRTrigger,
} from '@/types/gameplay';
import { resolvePilotConsciousnessCheck } from '@/utils/gameplay/damage';
import { firedWeaponIdsFromMountedArm } from '@/utils/gameplay/gameSessionPhysicalHelpers';
import { hexDistance } from '@/utils/gameplay/hexMath';
import {
  chooseBestPhysicalAttack,
  computePushDisplacement,
  IPhysicalAttackInput,
  isTargetDirectlyAhead,
  isValidDisplacement,
  PhysicalAttackType,
  resolveDfaMissFallDamage,
  resolveDfaMissFallPilotDamageAvoidance,
  resolvePhysicalAttack,
  splitPhysicalDamageIntoClusters,
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
}): IGameState {
  const {
    botPlayer,
    events,
    gameId,
    grid,
    invariantRunner,
    random,
    state,
    violations,
  } = options;
  let currentState = { ...state, phase: GamePhase.PhysicalAttack };
  violations.push(...invariantRunner.runAll(currentState));

  const d6Roller = createD6Roller(random);

  for (const unitId of Object.keys(currentState.units)) {
    const unit = currentState.units[unitId];
    if (
      unit.destroyed ||
      unit.hasRetreated ||
      unit.hasEjected ||
      unit.shutdown ||
      !unit.pilotConscious ||
      (unit.prone ?? false)
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
    const hexesMoved = unit.hexesMovedThisTurn ?? 0;
    const attackerRanThisTurn = unit.movementThisTurn === MovementType.Run;
    const attackerJumpedThisTurn = unit.movementThisTurn === MovementType.Jump;
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
        grid,
        unit,
        target,
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
          leftLegHasTalons: unit.leftLegHasTalons,
          rightLegHasTalons: unit.rightLegHasTalons,
          leftArmHasClaw: unit.leftArmHasClaw,
          rightArmHasClaw: unit.rightArmHasClaw,
          canReachForCharge: attackerRanThisTurn && hexesMoved > 1,
          hexesMoved,
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
        },
      );
    }

    if (!bestAttack) continue;

    const targetMovementModifier = calculateTMM(
      target.movementThisTurn,
      target.hexesMovedThisTurn ?? 0,
    ).value;
    const attackerMovementModifier = calculateAttackerMovementModifier(
      unit.movementThisTurn,
    ).value;
    const isUnderwater =
      grid !== undefined &&
      (waterDepthAtPosition(grid, unit.position) > 0 ||
        waterDepthAtPosition(grid, target.position) > 0);
    const elevationDifference = elevationDifferenceBetween(grid, unit, target);
    const pushDestinationValid =
      bestAttack !== 'push' || !grid
        ? true
        : isValidDisplacement(
            grid,
            computePushDisplacement(target.position, unit.facing),
            target.id,
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
        bestAttack === 'push'
          ? weaponsFiredFromEitherArm
          : bestAttack === 'punch'
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
      leftArmHasClaw: unit.leftArmHasClaw,
      rightArmHasClaw: unit.rightArmHasClaw,
      isUnderwater,
      targetTonnage: DEFAULT_TONNAGE,
      targetProne: target.prone ?? false,
      targetMovementComplete: true,
      targetImmobile: target.shutdown ?? false,
      targetExists: true,
      targetDestroyed: target.destroyed,
      targetRetreated: target.hasRetreated,
      targetEjected: target.hasEjected,
      attackerBoardId: unit.boardId,
      targetBoardId: target.boardId,
      targetIsPassenger: target.isPassenger,
      targetIsSwarming: target.isSwarming,
      targetIsMakingDFA: target.isMakingDFA,
      targetIsMakingDisplacementAttack: target.isMakingDisplacementAttack,
      targetIsPushing: target.isPushing,
      targetDisplacementAttackTargetId: target.displacementAttackTargetId,
      targetedByDisplacementAttackerId: target.targetedByDisplacementAttackerId,
      targetIsAirborne: target.isAirborne,
      attackerOccupiedBuildingId: unit.occupiedBuildingId,
      targetOccupiedBuildingId: target.occupiedBuildingId,
      targetIsSelf: unit.id === target.id,
      targetIsFriendly: unit.side === target.side,
      targetDistance: hexDistance(unit.position, target.position),
      targetMovementModifier,
      attackerMovementModifier,
      attackerRanThisTurn,
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
            grid,
            attackType: bestAttack,
            attacker: unit,
            target,
            hit: result.hit,
            d6Roller,
          })
        : { displacements: [] };
    const displacements = displacementOutcome.displacements;
    const impossibleDisplacementDestroyedUnitId =
      displacementOutcome.impossibleDisplacementDestroyedUnitId;
    const chargeHitDisplacementBlocked =
      result.hit &&
      bestAttack === 'charge' &&
      Boolean(grid) &&
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

    for (const displacement of displacements) {
      currentState = displaceUnit(
        currentState,
        displacement.unitId,
        displacement.to,
      );
    }

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
