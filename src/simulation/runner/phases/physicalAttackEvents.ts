import type {
  IPhysicalAttackResult,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks';

import {
  GameEventType,
  GamePhase,
  type IGameEvent,
  type IGameState,
  type IPhysicalDisplacement,
  type IUnitDestroyedPayload,
} from '@/types/gameplay';

import { createGameEvent } from './utils';

export function emitPhysicalAttackDeclaredEvent(options: {
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly turn: number;
  readonly attackerId: string;
  readonly targetId: string;
  readonly attackType: PhysicalAttackType;
  readonly toHitNumber: number;
}): void {
  const {
    attackType,
    attackerId,
    events,
    gameId,
    targetId,
    toHitNumber,
    turn,
  } = options;
  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.PhysicalAttackDeclared,
      turn,
      GamePhase.PhysicalAttack,
      { attackerId, targetId, attackType, toHitNumber },
      attackerId,
    ),
  );
}

export function emitPhysicalAttackResolvedEvent(options: {
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly turn: number;
  readonly attackerId: string;
  readonly targetId: string;
  readonly attackType: PhysicalAttackType;
  readonly result: IPhysicalAttackResult;
  readonly displacements: readonly IPhysicalDisplacement[];
}): void {
  const {
    attackType,
    attackerId,
    displacements,
    events,
    gameId,
    result,
    targetId,
    turn,
  } = options;
  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.PhysicalAttackResolved,
      turn,
      GamePhase.PhysicalAttack,
      {
        attackerId,
        targetId,
        attackType,
        toHitNumber: result.toHitNumber,
        hit: result.hit,
        damage: result.targetDamage,
        location: result.hit
          ? result.hitLocation
          : result.restrictionReasonCode,
        roll: result.roll,
        displacements: displacements.length > 0 ? displacements : undefined,
        automaticHit: result.automaticHit,
        automaticHitReason: result.automaticHitReason,
      },
      attackerId,
    ),
  );
}

function markUnitDestroyed(state: IGameState, unitId: string): IGameState {
  const unit = state.units[unitId];
  if (!unit || unit.destroyed) return state;

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        destroyed: true,
      },
    },
  };
}

export function applyImpossibleDisplacementDestruction(options: {
  readonly state: IGameState;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly turn: number;
  readonly destroyedUnitId?: string;
  readonly attackerId: string;
  readonly targetId: string;
}): IGameState {
  const { attackerId, destroyedUnitId, events, gameId, state, targetId, turn } =
    options;
  if (destroyedUnitId === undefined) {
    return state;
  }

  const destroyedUnit = state.units[destroyedUnitId];
  if (!destroyedUnit || destroyedUnit.destroyed) {
    return state;
  }

  const killerUnitId = destroyedUnitId === targetId ? attackerId : undefined;
  const payload: IUnitDestroyedPayload = {
    unitId: destroyedUnitId,
    cause: 'impossible_displacement',
    ...(killerUnitId !== undefined ? { killerUnitId } : {}),
  };
  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.UnitDestroyed,
      turn,
      GamePhase.PhysicalAttack,
      payload,
      killerUnitId ?? destroyedUnitId,
    ),
  );

  return markUnitDestroyed(state, destroyedUnitId);
}
