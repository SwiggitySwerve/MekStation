import {
  GameEventType,
  GamePhase,
  ICriticalHitResolvedPayload,
  IAmmoExplosionPayload,
  IGameEvent,
  IHeatPayload,
  IPilotHitPayload,
  IUnitDestroyedPayload,
} from '@/types/gameplay';

import { createEventBase } from './base';

export function createHeatGeneratedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  amount: number,
  source: IHeatPayload['source'],
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
  breakdown?: IHeatPayload['breakdown'],
): IGameEvent {
  const payload: IHeatPayload = {
    unitId,
    amount: -Math.abs(amount),
    source: 'dissipation',
    newTotal,
    ...(breakdown ? { breakdown } : {}),
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
  source: IPilotHitPayload['source'],
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
  cause: IUnitDestroyedPayload['cause'],
  options?: {
    readonly killerUnitId?: string;
  },
): IGameEvent {
  const payload: IUnitDestroyedPayload = {
    unitId,
    cause,
    ...(options?.killerUnitId !== undefined
      ? { killerUnitId: options.killerUnitId }
      : {}),
  };

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

/**
 * Per `wire-heat-generation-and-effects` task 11.4: emitted when an
 * explosive ammo bin detonates. `source` distinguishes heat-induced
 * (rolled during the heat phase) from crit-induced explosions.
 */
export function createAmmoExplosionEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  location: string,
  damage: number,
  source: IAmmoExplosionPayload['source'],
  options?: {
    readonly binId?: string;
    readonly weaponType?: string;
    readonly roundsDestroyed?: number;
    readonly caseProtection?: IAmmoExplosionPayload['caseProtection'];
  },
): IGameEvent {
  const payload: IAmmoExplosionPayload = {
    unitId,
    location,
    damage,
    source,
    ...(options?.binId !== undefined ? { binId: options.binId } : {}),
    ...(options?.weaponType !== undefined
      ? { weaponType: options.weaponType }
      : {}),
    ...(options?.roundsDestroyed !== undefined
      ? { roundsDestroyed: options.roundsDestroyed }
      : {}),
    ...(options?.caseProtection !== undefined
      ? { caseProtection: options.caseProtection }
      : {}),
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.AmmoExplosion,
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
  ammoBinId?: string,
): IGameEvent {
  const payload: ICriticalHitResolvedPayload = {
    unitId,
    location,
    slotIndex,
    componentType,
    componentName,
    ...(ammoBinId !== undefined ? { ammoBinId } : {}),
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

export {
  createAmmoConsumedEvent,
  createPSRResolvedEvent,
  createPSRTriggeredEvent,
  createShutdownCheckEvent,
  createStartupAttemptEvent,
  createUnitFellEvent,
  createUnitStoodEvent,
  createUnitStuckEvent,
} from './statusChecks';

export {
  createPhysicalAttackDeclaredEvent,
  createPhysicalAttackResolvedEvent,
  createRetreatTriggeredEvent,
  createUnitEjectedEvent,
  createUnitRetreatedEvent,
} from './statusPhysical';
