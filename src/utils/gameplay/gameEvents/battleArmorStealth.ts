import type {
  IMimeticBonusPayload,
  IStealthBonusPayload,
} from '@/types/gameplay';

import { GameEventType, GamePhase, IGameEvent } from '@/types/gameplay';

import {
  createBattleArmorEventBase as createBattleArmorStealthEventBase,
  type IBattleArmorEventContext,
} from './battleArmorCommon';

/**
 * Emitted when a mimetic to-hit bonus is applied to an incoming attack.
 */
export interface ICreateMimeticBonusEventInput extends IBattleArmorEventContext {
  readonly attackerId: string;
  readonly toHitBonus: number;
}

type MimeticBonusLegacyArgs = [
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  attackerId: string,
  toHitBonus: number,
];

function mimeticBonusInput(
  input: ICreateMimeticBonusEventInput | string,
  legacy: [] | MimeticBonusLegacyArgs,
): ICreateMimeticBonusEventInput {
  if (typeof input !== 'string') return input;
  const [sequence, turn, phase, unitId, attackerId, toHitBonus] =
    legacy as MimeticBonusLegacyArgs;
  return {
    gameId: input,
    sequence,
    turn,
    phase,
    unitId,
    attackerId,
    toHitBonus,
  };
}

export function createMimeticBonusEvent(
  input: ICreateMimeticBonusEventInput | string,
  ...legacy: [] | MimeticBonusLegacyArgs
): IGameEvent {
  const eventInput = mimeticBonusInput(input, legacy);
  const payload: IMimeticBonusPayload = {
    unitId: eventInput.unitId,
    attackerId: eventInput.attackerId,
    toHitBonus: eventInput.toHitBonus,
  };
  return {
    ...createBattleArmorStealthEventBase(
      eventInput,
      GameEventType.MimeticBonus,
    ),
    payload,
  };
}

/**
 * Emitted when a stealth to-hit bonus is applied to an incoming attack.
 */
export interface ICreateStealthBonusEventInput extends IBattleArmorEventContext {
  readonly attackerId: string;
  readonly toHitBonus: number;
  readonly source: IStealthBonusPayload['source'];
}

type StealthBonusLegacyArgs = [
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  attackerId: string,
  toHitBonus: number,
  source: IStealthBonusPayload['source'],
];

function stealthBonusInput(
  input: ICreateStealthBonusEventInput | string,
  legacy: [] | StealthBonusLegacyArgs,
): ICreateStealthBonusEventInput {
  if (typeof input !== 'string') return input;
  const [sequence, turn, phase, unitId, attackerId, toHitBonus, source] =
    legacy as StealthBonusLegacyArgs;
  return {
    gameId: input,
    sequence,
    turn,
    phase,
    unitId,
    attackerId,
    toHitBonus,
    source,
  };
}

export function createStealthBonusEvent(
  input: ICreateStealthBonusEventInput | string,
  ...legacy: [] | StealthBonusLegacyArgs
): IGameEvent {
  const eventInput = stealthBonusInput(input, legacy);
  const payload: IStealthBonusPayload = {
    unitId: eventInput.unitId,
    attackerId: eventInput.attackerId,
    toHitBonus: eventInput.toHitBonus,
    source: eventInput.source,
  };
  return {
    ...createBattleArmorStealthEventBase(
      eventInput,
      GameEventType.StealthBonus,
    ),
    payload,
  };
}
