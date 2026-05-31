import {
  Facing,
  GameEventType,
  GamePhase,
  IAmmoConsumedPayload,
  IGameEvent,
  IPSRResolvedPayload,
  IPSRTriggeredPayload,
  IShutdownCheckPayload,
  IStartupAttemptPayload,
  IUnitFellPayload,
  IUnitStoodPayload,
  IUnitStuckPayload,
  PSRTrigger,
} from '@/types/gameplay';

import { createEventBase } from './base';

export function createPSRTriggeredEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  reason: string,
  additionalModifier: number,
  triggerSource: string,
  basePilotingSkill?: number,
  reasonCode?: PSRTrigger,
  fixedTargetNumber?: number,
): IGameEvent {
  const payload: IPSRTriggeredPayload = {
    unitId,
    reason,
    additionalModifier,
    triggerSource,
    ...(basePilotingSkill !== undefined ? { basePilotingSkill } : {}),
    ...(reasonCode !== undefined ? { reasonCode } : {}),
    ...(fixedTargetNumber !== undefined ? { fixedTargetNumber } : {}),
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.PSRTriggered,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createPSRResolvedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  targetNumber: number,
  roll: number,
  modifiers: number,
  passed: boolean,
  reason: string,
  reasonCode?: PSRTrigger,
): IGameEvent {
  const payload: IPSRResolvedPayload = {
    unitId,
    targetNumber,
    roll,
    modifiers,
    passed,
    reason,
    ...(reasonCode !== undefined ? { reasonCode } : {}),
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.PSRResolved,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createUnitFellEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  fallDamage: number,
  newFacing: Facing,
  pilotDamage: number,
  location?: string,
  reason?: string,
  reasonCode?: PSRTrigger,
): IGameEvent {
  const payload: IUnitFellPayload = {
    unitId,
    fallDamage,
    newFacing,
    pilotDamage,
    ...(location !== undefined ? { location } : {}),
    ...(reason !== undefined ? { reason } : {}),
    ...(reasonCode !== undefined ? { reasonCode } : {}),
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.UnitFell,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createUnitStuckEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  reason?: string,
  reasonCode?: PSRTrigger,
): IGameEvent {
  const payload: IUnitStuckPayload = {
    unitId,
    ...(reason !== undefined ? { reason } : {}),
    ...(reasonCode !== undefined ? { reasonCode } : {}),
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.UnitStuck,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

/**
 * Per `wire-piloting-skill-rolls` task 9.3: fired when a prone unit
 * successfully passes an `AttemptStand` PSR and returns upright.
 */
export function createUnitStoodEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  roll: number,
  targetNumber: number,
): IGameEvent {
  const payload: IUnitStoodPayload = {
    unitId,
    turn,
    roll,
    targetNumber,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.UnitStood,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createShutdownCheckEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  heatLevel: number,
  targetNumber: number,
  roll: number,
  shutdownOccurred: boolean,
): IGameEvent {
  const payload: IShutdownCheckPayload = {
    unitId,
    heatLevel,
    targetNumber,
    roll,
    shutdownOccurred,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.ShutdownCheck,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createStartupAttemptEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  targetNumber: number,
  roll: number,
  success: boolean,
): IGameEvent {
  const payload: IStartupAttemptPayload = {
    unitId,
    targetNumber,
    roll,
    success,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.StartupAttempt,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createAmmoConsumedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  binId: string,
  weaponType: string,
  roundsConsumed: number,
  roundsRemaining: number,
): IGameEvent {
  const payload: IAmmoConsumedPayload = {
    unitId,
    binId,
    weaponType,
    roundsConsumed,
    roundsRemaining,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.AmmoConsumed,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}
