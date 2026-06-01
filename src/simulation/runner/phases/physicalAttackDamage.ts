import {
  CombatLocation,
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
} from '@/types/gameplay';
import { resolveDamage } from '@/utils/gameplay/damage';
import { isHeadHit } from '@/utils/gameplay/hitLocation';
import {
  determinePhysicalHitLocation,
  type IPhysicalDamageCluster,
} from '@/utils/gameplay/physicalAttacks';

import { HEAD_HIT_DAMAGE_CAP } from '../SimulationRunnerConstants';
import {
  applyDamageResultToState,
  buildDamageState,
} from '../SimulationRunnerState';
import { createGameEvent } from './utils';

function capPhysicalDamageForLocation(
  hitLocation: CombatLocation,
  damage: number,
): number {
  if (isHeadHit(hitLocation) && damage > HEAD_HIT_DAMAGE_CAP) {
    return HEAD_HIT_DAMAGE_CAP;
  }
  return damage;
}

function applyPhysicalDamage(options: {
  state: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  hitLocation: CombatLocation;
  damage: number;
  d6Roller: () => number;
  sourceUnitId?: string;
}): IGameState {
  const {
    d6Roller,
    damage,
    events,
    gameId,
    hitLocation,
    sourceUnitId,
    state,
    unitId,
  } = options;
  const unitBefore = state.units[unitId];
  if (!unitBefore || unitBefore.destroyed) return state;

  const cappedDamage = capPhysicalDamageForLocation(hitLocation, damage);
  const dmgResult = resolveDamage(
    buildDamageState(unitBefore),
    hitLocation,
    cappedDamage,
    d6Roller,
  );
  const nextState = applyDamageResultToState(
    state,
    unitId,
    dmgResult.state,
    dmgResult.result,
  );

  for (const locationDamage of dmgResult.result.locationDamages) {
    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.DamageApplied,
        nextState.turn,
        GamePhase.PhysicalAttack,
        {
          unitId,
          location: locationDamage.location,
          damage: locationDamage.damage,
          armorRemaining: locationDamage.armorRemaining,
          structureRemaining: locationDamage.structureRemaining,
          locationDestroyed: locationDamage.destroyed,
          ...(sourceUnitId !== undefined ? { sourceUnitId } : {}),
        },
        sourceUnitId ?? unitId,
      ),
    );
  }

  const unitAfter = nextState.units[unitId];
  if (unitAfter.destroyed && !unitBefore.destroyed) {
    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.UnitDestroyed,
        nextState.turn,
        GamePhase.PhysicalAttack,
        {
          unitId,
          cause: dmgResult.result.destructionCause ?? 'damage',
          ...(sourceUnitId !== undefined && sourceUnitId !== unitId
            ? { killerUnitId: sourceUnitId }
            : {}),
        },
        sourceUnitId ?? unitId,
      ),
    );
  }

  return nextState;
}

export function applyPhysicalDamageClusters(options: {
  state: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  clusters: readonly number[];
  hitTable: 'punch' | 'kick';
  d6Roller: () => number;
  sourceUnitId?: string;
  firstHitLocation?: CombatLocation;
}): IGameState {
  let currentState = options.state;
  for (let i = 0; i < options.clusters.length; i++) {
    const hitLocation =
      i === 0 && options.firstHitLocation
        ? options.firstHitLocation
        : determinePhysicalHitLocation(options.hitTable, options.d6Roller);
    currentState = applyPhysicalDamage({
      state: currentState,
      events: options.events,
      gameId: options.gameId,
      unitId: options.unitId,
      hitLocation,
      damage: options.clusters[i],
      d6Roller: options.d6Roller,
      ...(options.sourceUnitId !== undefined
        ? { sourceUnitId: options.sourceUnitId }
        : {}),
    });
  }
  return currentState;
}

export function applyPhysicalDamageClusterLocations(options: {
  state: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  clusters: readonly IPhysicalDamageCluster[];
  d6Roller: () => number;
  sourceUnitId?: string;
}): IGameState {
  let currentState = options.state;
  for (const cluster of options.clusters) {
    currentState = applyPhysicalDamage({
      state: currentState,
      events: options.events,
      gameId: options.gameId,
      unitId: options.unitId,
      hitLocation: cluster.location,
      damage: cluster.damage,
      d6Roller: options.d6Roller,
      ...(options.sourceUnitId !== undefined
        ? { sourceUnitId: options.sourceUnitId }
        : {}),
    });
  }
  return currentState;
}

export function applyDfaAttackerLegDamage(options: {
  state: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  clusters: readonly number[];
  d6Roller: () => number;
}): IGameState {
  return options.clusters.reduce((nextState, clusterDamage, index) => {
    const leg: CombatLocation = index % 2 === 0 ? 'left_leg' : 'right_leg';
    return applyPhysicalDamage({
      state: nextState,
      events: options.events,
      gameId: options.gameId,
      unitId: options.unitId,
      hitLocation: leg,
      damage: clusterDamage,
      d6Roller: options.d6Roller,
    });
  }, options.state);
}
