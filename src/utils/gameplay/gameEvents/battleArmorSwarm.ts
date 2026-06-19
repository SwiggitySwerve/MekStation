import type {
  ISwarmAttachedPayload,
  ISwarmDamagePayload,
  ISwarmDismountedPayload,
} from '@/types/gameplay';

import { GameEventType, GamePhase, IGameEvent } from '@/types/gameplay';

import {
  createBattleArmorEventBase as createBattleArmorSwarmEventBase,
  type IBattleArmorEventContext,
} from './battleArmorCommon';

/**
 * Emitted when a BA squad successfully swarms a mech (roll passed).
 */
export interface ICreateSwarmAttachedEventInput extends IBattleArmorEventContext {
  readonly targetUnitId: string;
  readonly rollTotal: number;
  readonly targetNumber: number;
}

type SwarmAttachedLegacyArgs = [
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  targetUnitId: string,
  rollTotal: number,
  targetNumber: number,
];

function swarmAttachedInput(
  input: ICreateSwarmAttachedEventInput | string,
  legacy: [] | SwarmAttachedLegacyArgs,
): ICreateSwarmAttachedEventInput {
  if (typeof input !== 'string') return input;
  const [sequence, turn, phase, unitId, targetUnitId, rollTotal, targetNumber] =
    legacy as SwarmAttachedLegacyArgs;
  return {
    gameId: input,
    sequence,
    turn,
    phase,
    unitId,
    targetUnitId,
    rollTotal,
    targetNumber,
  };
}

export function createSwarmAttachedEvent(
  input: ICreateSwarmAttachedEventInput | string,
  ...legacy: [] | SwarmAttachedLegacyArgs
): IGameEvent {
  const eventInput = swarmAttachedInput(input, legacy);
  const payload: ISwarmAttachedPayload = {
    unitId: eventInput.unitId,
    targetUnitId: eventInput.targetUnitId,
    rollTotal: eventInput.rollTotal,
    targetNumber: eventInput.targetNumber,
  };
  return {
    ...createBattleArmorSwarmEventBase(eventInput, GameEventType.SwarmAttached),
    payload,
  };
}

/**
 * Emitted for every per-turn swarm damage tick while attached.
 */
export interface ICreateSwarmDamageEventInput extends IBattleArmorEventContext {
  readonly targetUnitId: string;
  readonly damage: number;
  readonly locationLabel: string;
}

type SwarmDamageLegacyArgs = [
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  targetUnitId: string,
  damage: number,
  locationLabel: string,
];

function swarmDamageInput(
  input: ICreateSwarmDamageEventInput | string,
  legacy: [] | SwarmDamageLegacyArgs,
): ICreateSwarmDamageEventInput {
  if (typeof input !== 'string') return input;
  const [sequence, turn, phase, unitId, targetUnitId, damage, locationLabel] =
    legacy as SwarmDamageLegacyArgs;
  return {
    gameId: input,
    sequence,
    turn,
    phase,
    unitId,
    targetUnitId,
    damage,
    locationLabel,
  };
}

export function createSwarmDamageEvent(
  input: ICreateSwarmDamageEventInput | string,
  ...legacy: [] | SwarmDamageLegacyArgs
): IGameEvent {
  const eventInput = swarmDamageInput(input, legacy);
  const payload: ISwarmDamagePayload = {
    unitId: eventInput.unitId,
    targetUnitId: eventInput.targetUnitId,
    damage: eventInput.damage,
    locationLabel: eventInput.locationLabel,
  };
  return {
    ...createBattleArmorSwarmEventBase(eventInput, GameEventType.SwarmDamage),
    payload,
  };
}

/**
 * Emitted when a swarming BA squad detaches.
 */
export interface ICreateSwarmDismountedEventInput extends IBattleArmorEventContext {
  readonly targetUnitId: string;
  readonly cause: ISwarmDismountedPayload['cause'];
  readonly dismountDamage: number;
}

type SwarmDismountedLegacyArgs = [
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  targetUnitId: string,
  cause: ISwarmDismountedPayload['cause'],
  dismountDamage: number,
];

function swarmDismountedInput(
  input: ICreateSwarmDismountedEventInput | string,
  legacy: [] | SwarmDismountedLegacyArgs,
): ICreateSwarmDismountedEventInput {
  if (typeof input !== 'string') return input;
  const [sequence, turn, phase, unitId, targetUnitId, cause, dismountDamage] =
    legacy as SwarmDismountedLegacyArgs;
  return {
    gameId: input,
    sequence,
    turn,
    phase,
    unitId,
    targetUnitId,
    cause,
    dismountDamage,
  };
}

export function createSwarmDismountedEvent(
  input: ICreateSwarmDismountedEventInput | string,
  ...legacy: [] | SwarmDismountedLegacyArgs
): IGameEvent {
  const eventInput = swarmDismountedInput(input, legacy);
  const payload: ISwarmDismountedPayload = {
    unitId: eventInput.unitId,
    targetUnitId: eventInput.targetUnitId,
    cause: eventInput.cause,
    dismountDamage: eventInput.dismountDamage,
  };
  return {
    ...createBattleArmorSwarmEventBase(
      eventInput,
      GameEventType.SwarmDismounted,
    ),
    payload,
  };
}
