/**
 * Battle Armor combat event factories.
 *
 * Per `add-battlearmor-combat-behavior`: emits the BA-specific events
 * (SwarmAttached, SwarmDamage, SwarmDismounted, LegAttack, TrooperKilled,
 * SquadEliminated, MimeticBonus, StealthBonus) so consumers (replay, UI, AI)
 * can react without inspecting combat state directly.
 *
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/combat-resolution/spec.md
 */

import type {
  ILegAttackPayload,
  IMimeticBonusPayload,
  ISquadEliminatedPayload,
  IStealthBonusPayload,
  ISwarmAttachedPayload,
  ISwarmDamagePayload,
  ISwarmDismountedPayload,
  ITrooperKilledPayload,
} from '@/types/gameplay';

import { GameEventType, GamePhase, IGameEvent } from '@/types/gameplay';

import { createEventBase } from './base';

/**
 * Emitted for every trooper casualty inside a BA squad. `survivingTroopers`
 * is the count AFTER this casualty (so a 4→3 transition carries `3`).
 */
export function createTrooperKilledEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  trooperIndex: number,
  survivingTroopers: number,
): IGameEvent {
  const payload: ITrooperKilledPayload = {
    unitId,
    trooperIndex,
    survivingTroopers,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.TrooperKilled,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

/**
 * Emitted once when the final trooper in a squad dies.
 * Consumers should stop routing damage / attacks at this unit after this.
 */
export function createSquadEliminatedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
): IGameEvent {
  const payload: ISquadEliminatedPayload = { unitId };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.SquadEliminated,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

/**
 * Emitted when a BA squad successfully swarms a mech (roll passed).
 */
export function createSwarmAttachedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  targetUnitId: string,
  rollTotal: number,
  targetNumber: number,
): IGameEvent {
  const payload: ISwarmAttachedPayload = {
    unitId,
    targetUnitId,
    rollTotal,
    targetNumber,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.SwarmAttached,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

/**
 * Emitted for every per-turn swarm damage tick while attached.
 */
export function createSwarmDamageEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  targetUnitId: string,
  damage: number,
  locationLabel: string,
): IGameEvent {
  const payload: ISwarmDamagePayload = {
    unitId,
    targetUnitId,
    damage,
    locationLabel,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.SwarmDamage,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

/**
 * Emitted when a swarming BA squad detaches (dismount roll, squad destroyed,
 * or target mech destroyed).
 */
export function createSwarmDismountedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  targetUnitId: string,
  cause: ISwarmDismountedPayload['cause'],
  dismountDamage: number,
): IGameEvent {
  const payload: ISwarmDismountedPayload = {
    unitId,
    targetUnitId,
    cause,
    dismountDamage,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.SwarmDismounted,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

/**
 * Emitted for every resolved leg-attack (success or failure).
 */
export function createLegAttackEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  targetUnitId: string,
  success: boolean,
  damageToLeg: number,
  selfDamage: number,
  survivingTroopers: number,
): IGameEvent {
  const payload: ILegAttackPayload = {
    unitId,
    targetUnitId,
    success,
    damageToLeg,
    selfDamage,
    survivingTroopers,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.LegAttack,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

/**
 * Emitted when a mimetic to-hit bonus is applied to an incoming attack.
 */
export function createMimeticBonusEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  attackerId: string,
  toHitBonus: number,
): IGameEvent {
  const payload: IMimeticBonusPayload = { unitId, attackerId, toHitBonus };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.MimeticBonus,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

/**
 * Emitted when a stealth to-hit bonus is applied to an incoming attack.
 */
export function createStealthBonusEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  attackerId: string,
  toHitBonus: number,
  source: IStealthBonusPayload['source'],
): IGameEvent {
  const payload: IStealthBonusPayload = {
    unitId,
    attackerId,
    toHitBonus,
    source,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.StealthBonus,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}
