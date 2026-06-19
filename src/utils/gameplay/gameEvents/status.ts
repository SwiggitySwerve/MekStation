import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IMinefieldChangedPayload,
  ISpottingDeclaredPayload,
  ITerrainChangedPayload,
} from '@/types/gameplay';

import { createEventBase } from './base';

export {
  createAmmoExplosionEvent,
  createCriticalHitEvent,
  createCriticalHitResolvedEvent,
} from './statusCritical';
export type {
  ICreateAmmoExplosionEventInput,
  ICreateCriticalHitEventInput,
  ICreateCriticalHitResolvedEventInput,
} from './statusCritical';
export {
  createHeatDissipatedEvent,
  createHeatGeneratedEvent,
} from './statusHeat';
export type {
  ICreateHeatDissipatedEventInput,
  ICreateHeatGeneratedEventInput,
} from './statusHeat';
export {
  createPilotHitEvent,
  createUnitDestroyedEvent,
} from './statusLifecycle';
export type {
  ICreatePilotHitEventInput,
  ICreateUnitDestroyedEventInput,
} from './statusLifecycle';

export function createSpottingDeclaredEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  targetId: string,
): IGameEvent {
  const payload: ISpottingDeclaredPayload = { unitId, targetId, turn };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.SpottingDeclared,
      turn,
      GamePhase.WeaponAttack,
      unitId,
    ),
    payload,
  };
}

export function createTerrainChangedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  payload: ITerrainChangedPayload,
): IGameEvent {
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.TerrainChanged,
      turn,
      phase,
      payload.sourceUnitId,
    ),
    payload,
  };
}

export function createMinefieldChangedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  payload: IMinefieldChangedPayload,
): IGameEvent {
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.MinefieldChanged,
      turn,
      phase,
      payload.sourceUnitId,
    ),
    payload,
  };
}

export {
  createAmmoConsumedEvent,
  createPSRResolvedEvent,
  createPSRTriggeredEvent,
  createShutdownCheckEvent,
  createStartupAttemptEvent,
  createUnitFellEvent,
  createUnitStoodEvent,
} from './statusChecks';

export {
  createPhysicalAttackDeclaredEvent,
  createPhysicalAttackResolvedEvent,
  createRetreatTriggeredEvent,
  createUnitRetreatedEvent,
} from './statusPhysical';
