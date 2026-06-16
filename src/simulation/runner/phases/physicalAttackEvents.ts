import type {
  PhysicalAttackINarcPodSelection,
  IPhysicalAttackResult,
  PhysicalAttackLimb,
  PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks';

import {
  GameEventType,
  GamePhase,
  type IGameEvent,
  type IGameState,
  type IPhysicalDisplacement,
  type IPhysicalDominoStepOutDecisionPayload,
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
  readonly limb?: PhysicalAttackLimb;
  readonly toHitNumber: number;
  readonly twoHandedZweihander?: boolean;
  readonly selectedINarcPod?: PhysicalAttackINarcPodSelection;
  readonly blockerStepOutDecision?: IPhysicalDominoStepOutDecisionPayload;
}): void {
  const {
    attackType,
    attackerId,
    blockerStepOutDecision,
    events,
    gameId,
    limb,
    selectedINarcPod,
    targetId,
    toHitNumber,
    turn,
    twoHandedZweihander,
  } = options;
  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.PhysicalAttackDeclared,
      turn,
      GamePhase.PhysicalAttack,
      {
        attackerId,
        targetId,
        attackType,
        ...(limb !== undefined ? { limb } : {}),
        toHitNumber,
        ...(twoHandedZweihander === true ? { twoHandedZweihander } : {}),
        ...(selectedINarcPod !== undefined ? { selectedINarcPod } : {}),
        ...(blockerStepOutDecision !== undefined
          ? { blockerStepOutDecision }
          : {}),
      },
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
  readonly selectedINarcPod?: PhysicalAttackINarcPodSelection;
}): void {
  const {
    attackType,
    attackerId,
    displacements,
    events,
    gameId,
    result,
    selectedINarcPod,
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
        ...(selectedINarcPod !== undefined ? { selectedINarcPod } : {}),
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
