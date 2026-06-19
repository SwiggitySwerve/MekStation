import type { IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';
import type {
  IIndirectFireForwardObserverPayload,
  IIndirectFireNarcOverridePayload,
  IIndirectFireSpotterLostPayload,
  IIndirectFireSpotterSelectedPayload,
} from '@/types/gameplay/IndirectFireInterfaces';

import { GameEventType, GamePhase, IGameEvent } from '@/types/gameplay';

import { createEventBase } from './base';

interface ICombatEventContext {
  readonly gameId: string;
  readonly sequence: number;
  readonly turn: number;
}

interface IIndirectFireDispatchInput extends ICombatEventContext {
  readonly attackerId: string;
  readonly weaponId: string;
  readonly targetHex: IHexCoordinate;
  readonly toHitPenalty: number;
  readonly ammoId?: string;
}

export interface ICreateIndirectFireSpotterSelectedEventInput extends IIndirectFireDispatchInput {
  readonly spotterId: string;
  readonly spotterAttackedThisTurn?: boolean;
}

type SpotterSelectedLegacyArgs = [
  sequence: number,
  turn: number,
  attackerId: string,
  spotterId: string,
  weaponId: string,
  targetHex: IHexCoordinate,
  toHitPenalty: number,
  ammoId?: string,
  spotterAttackedThisTurn?: boolean,
];

function spotterSelectedInput(
  input: ICreateIndirectFireSpotterSelectedEventInput | string,
  legacy: [] | SpotterSelectedLegacyArgs,
): ICreateIndirectFireSpotterSelectedEventInput {
  if (typeof input !== 'string') return input;
  const args = legacy as SpotterSelectedLegacyArgs;
  const [
    sequence,
    turn,
    attackerId,
    spotterId,
    weaponId,
    targetHex,
    toHitPenalty,
    ammoId,
    spotterAttackedThisTurn,
  ] = args;
  return {
    gameId: input,
    sequence,
    turn,
    attackerId,
    spotterId,
    weaponId,
    targetHex,
    toHitPenalty,
    ammoId,
    spotterAttackedThisTurn,
  };
}

/**
 * Emitted when a friendly LOS spotter is elected for an indirect-fire attack.
 * Payload mirrors IIndirectFireSpotterSelectedPayload (basis='los',
 * spotterId always non-null).
 */
export function createIndirectFireSpotterSelectedEvent(
  input: ICreateIndirectFireSpotterSelectedEventInput | string,
  ...legacy: [] | SpotterSelectedLegacyArgs
): IGameEvent {
  const {
    ammoId,
    attackerId,
    gameId,
    sequence,
    spotterAttackedThisTurn,
    spotterId,
    targetHex,
    toHitPenalty,
    turn,
    weaponId,
  } = spotterSelectedInput(input, legacy);
  const payload: IIndirectFireSpotterSelectedPayload = {
    attackerId,
    spotterId,
    weaponId,
    ammoId,
    targetHex,
    toHitPenalty,
    spotterAttackedThisTurn,
    basis: 'los',
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.IndirectFireSpotterSelected,
      turn,
      GamePhase.WeaponAttack,
      attackerId,
    ),
    payload,
  };
}

export interface ICreateIndirectFireNarcOverrideEventInput extends IIndirectFireDispatchInput {
  readonly basis: 'narc' | 'inarc';
}

type NarcOverrideLegacyArgs = [
  sequence: number,
  turn: number,
  attackerId: string,
  weaponId: string,
  targetHex: IHexCoordinate,
  basis: 'narc' | 'inarc',
  toHitPenalty: number,
  ammoId?: string,
];

function narcOverrideInput(
  input: ICreateIndirectFireNarcOverrideEventInput | string,
  legacy: [] | NarcOverrideLegacyArgs,
): ICreateIndirectFireNarcOverrideEventInput {
  if (typeof input !== 'string') return input;
  const args = legacy as NarcOverrideLegacyArgs;
  const [
    sequence,
    turn,
    attackerId,
    weaponId,
    targetHex,
    basis,
    toHitPenalty,
    ammoId,
  ] = args;
  return {
    gameId: input,
    sequence,
    turn,
    attackerId,
    weaponId,
    targetHex,
    basis,
    toHitPenalty,
    ammoId,
  };
}

/**
 * Emitted when indirect fire is permitted via NARC/iNarc beacon instead of a
 * LOS spotter.
 */
export function createIndirectFireNarcOverrideEvent(
  input: ICreateIndirectFireNarcOverrideEventInput | string,
  ...legacy: [] | NarcOverrideLegacyArgs
): IGameEvent {
  const {
    ammoId,
    attackerId,
    basis,
    gameId,
    sequence,
    targetHex,
    toHitPenalty,
    turn,
    weaponId,
  } = narcOverrideInput(input, legacy);
  const payload: IIndirectFireNarcOverridePayload = {
    attackerId,
    spotterId: null,
    weaponId,
    ammoId,
    targetHex,
    toHitPenalty,
    basis,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.IndirectFireNarcOverride,
      turn,
      GamePhase.WeaponAttack,
      attackerId,
    ),
    payload,
  };
}

export type ICreateIndirectFireForwardObserverEventInput =
  ICreateIndirectFireSpotterSelectedEventInput;

/**
 * Emitted in addition to IndirectFireSpotterSelected when the spotter's pilot
 * holds the FORWARD_OBSERVER SPA and the +1 spotter-walked penalty is
 * cancelled.
 */
export function createIndirectFireForwardObserverEvent(
  input: ICreateIndirectFireForwardObserverEventInput | string,
  ...legacy: [] | SpotterSelectedLegacyArgs
): IGameEvent {
  const {
    ammoId,
    attackerId,
    gameId,
    sequence,
    spotterAttackedThisTurn,
    spotterId,
    targetHex,
    toHitPenalty,
    turn,
    weaponId,
  } = spotterSelectedInput(input, legacy);
  const payload: IIndirectFireForwardObserverPayload = {
    attackerId,
    spotterId,
    weaponId,
    ammoId,
    targetHex,
    toHitPenalty,
    spotterAttackedThisTurn,
    basis: 'los',
    penaltyCancelled: 1,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.IndirectFireForwardObserver,
      turn,
      GamePhase.WeaponAttack,
      attackerId,
    ),
    payload,
  };
}

export interface ICreateIndirectFireSpotterLostEventInput extends ICombatEventContext {
  readonly attackerId: string;
  readonly spotterId: string;
  readonly weaponId: string;
  readonly targetHex: IHexCoordinate;
  readonly basis: 'los' | 'narc' | 'inarc' | 'semi-guided-tag';
  readonly reason: string;
  readonly ammoId?: string;
}

type SpotterLostLegacyArgs = [
  sequence: number,
  turn: number,
  attackerId: string,
  spotterId: string,
  weaponId: string,
  targetHex: IHexCoordinate,
  basis: ICreateIndirectFireSpotterLostEventInput['basis'],
  reason: string,
  ammoId?: string,
];

function spotterLostInput(
  input: ICreateIndirectFireSpotterLostEventInput | string,
  legacy: [] | SpotterLostLegacyArgs,
): ICreateIndirectFireSpotterLostEventInput {
  if (typeof input !== 'string') return input;
  const args = legacy as SpotterLostLegacyArgs;
  const [
    sequence,
    turn,
    attackerId,
    spotterId,
    weaponId,
    targetHex,
    basis,
    reason,
    ammoId,
  ] = args;
  return {
    gameId: input,
    sequence,
    turn,
    attackerId,
    spotterId,
    weaponId,
    targetHex,
    basis,
    reason,
    ammoId,
  };
}

/**
 * Emitted when the elected spotter is destroyed between to-hit time and damage
 * resolution, forcing an auto-miss.
 */
export function createIndirectFireSpotterLostEvent(
  input: ICreateIndirectFireSpotterLostEventInput | string,
  ...legacy: [] | SpotterLostLegacyArgs
): IGameEvent {
  const {
    ammoId,
    attackerId,
    basis,
    gameId,
    reason,
    sequence,
    spotterId,
    targetHex,
    turn,
    weaponId,
  } = spotterLostInput(input, legacy);
  const payload: IIndirectFireSpotterLostPayload = {
    attackerId,
    spotterId,
    weaponId,
    ammoId,
    targetHex,
    toHitPenalty: 0,
    basis,
    reason,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.IndirectFireSpotterLost,
      turn,
      GamePhase.WeaponAttack,
      attackerId,
    ),
    payload,
  };
}
