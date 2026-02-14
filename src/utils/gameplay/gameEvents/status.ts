import {
  Facing,
  GameEventType,
  GamePhase,
  ICriticalHitResolvedPayload,
  IGameEvent,
  IHeatPayload,
  IPilotHitPayload,
  IPSRResolvedPayload,
  IPSRTriggeredPayload,
  IShutdownCheckPayload,
  IStartupAttemptPayload,
  IUnitDestroyedPayload,
  IUnitFellPayload,
  IAmmoConsumedPayload,
} from '@/types/gameplay';

import { createEventBase } from './base';

export function createHeatGeneratedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  amount: number,
  source: 'movement' | 'weapons' | 'dissipation' | 'external',
  newTotal: number,
): IGameEvent {
  const payload: IHeatPayload = { unitId, amount, source, newTotal };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.HeatGenerated,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createHeatDissipatedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  amount: number,
  newTotal: number,
): IGameEvent {
  const payload: IHeatPayload = {
    unitId,
    amount: -Math.abs(amount),
    source: 'dissipation',
    newTotal,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.HeatDissipated,
      turn,
      GamePhase.Heat,
      unitId,
    ),
    payload,
  };
}

export function createPilotHitEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  wounds: number,
  totalWounds: number,
  source: 'head_hit' | 'ammo_explosion' | 'mech_destruction',
  consciousnessCheckRequired: boolean,
  consciousnessCheckPassed?: boolean,
): IGameEvent {
  const payload: IPilotHitPayload = {
    unitId,
    wounds,
    totalWounds,
    source,
    consciousnessCheckRequired,
    consciousnessCheckPassed,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.PilotHit,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createUnitDestroyedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  cause: 'damage' | 'ammo_explosion' | 'pilot_death' | 'shutdown',
): IGameEvent {
  const payload: IUnitDestroyedPayload = { unitId, cause };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.UnitDestroyed,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createCriticalHitResolvedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  location: string,
  slotIndex: number,
  componentType: string,
  componentName: string,
  effect: string,
  destroyed: boolean,
): IGameEvent {
  const payload: ICriticalHitResolvedPayload = {
    unitId,
    location,
    slotIndex,
    componentType,
    componentName,
    effect,
    destroyed,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.CriticalHitResolved,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createPSRTriggeredEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  reason: string,
  additionalModifier: number,
  triggerSource: string,
): IGameEvent {
  const payload: IPSRTriggeredPayload = {
    unitId,
    reason,
    additionalModifier,
    triggerSource,
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
): IGameEvent {
  const payload: IPSRResolvedPayload = {
    unitId,
    targetNumber,
    roll,
    modifiers,
    passed,
    reason,
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
): IGameEvent {
  const payload: IUnitFellPayload = {
    unitId,
    fallDamage,
    newFacing,
    pilotDamage,
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
