import {
  GameEventType,
  GamePhase,
  IAttackDeclaredPayload,
  IAttackInvalidPayload,
  IAttackLockedPayload,
  IAttackResolvedPayload,
  IGameEvent,
  IToHitModifier,
  IWeaponAttackData,
  RangeBracket,
} from '@/types/gameplay';

import { createEventBase } from './base';

interface ICombatEventContext {
  readonly gameId: string;
  readonly sequence: number;
  readonly turn: number;
}

export interface ICreateAttackDeclaredEventInput extends ICombatEventContext {
  readonly attackerId: string;
  readonly targetId: string;
  readonly weapons: readonly string[];
  readonly toHitNumber: number;
  readonly modifiers: readonly IToHitModifier[];
  readonly weaponAttacks?: readonly IWeaponAttackData[];
  readonly rangeBracket?: RangeBracket;
}

type AttackDeclaredLegacyArgs = [
  sequence: number,
  turn: number,
  attackerId: string,
  targetId: string,
  weapons: readonly string[],
  toHitNumber: number,
  modifiers: readonly IToHitModifier[],
  weaponAttacks?: readonly IWeaponAttackData[],
  rangeBracket?: RangeBracket,
];

function attackDeclaredInput(
  input: ICreateAttackDeclaredEventInput | string,
  legacy: [] | AttackDeclaredLegacyArgs,
): ICreateAttackDeclaredEventInput {
  if (typeof input !== 'string') return input;
  const args = legacy as AttackDeclaredLegacyArgs;
  const [
    sequence,
    turn,
    attackerId,
    targetId,
    weapons,
    toHitNumber,
    modifiers,
    weaponAttacks,
    rangeBracket,
  ] = args;
  return {
    gameId: input,
    sequence,
    turn,
    attackerId,
    targetId,
    weapons,
    toHitNumber,
    modifiers,
    weaponAttacks,
    rangeBracket,
  };
}

export function createAttackDeclaredEvent(
  input: ICreateAttackDeclaredEventInput | string,
  ...legacy: [] | AttackDeclaredLegacyArgs
): IGameEvent {
  const {
    attackerId,
    gameId,
    modifiers,
    rangeBracket,
    sequence,
    targetId,
    toHitNumber,
    turn,
    weaponAttacks,
    weapons,
  } = attackDeclaredInput(input, legacy);
  const payload: IAttackDeclaredPayload = {
    attackerId,
    targetId,
    weapons,
    toHitNumber,
    modifiers,
    weaponAttacks,
    range:
      rangeBracket === undefined || rangeBracket === RangeBracket.OutOfRange
        ? undefined
        : rangeBracket,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.AttackDeclared,
      turn,
      GamePhase.WeaponAttack,
      attackerId,
    ),
    payload,
  };
}

export function createAttackLockedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
): IGameEvent {
  const payload: IAttackLockedPayload = { unitId };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.AttackLocked,
      turn,
      GamePhase.WeaponAttack,
      unitId,
    ),
    payload,
  };
}

export interface ICreateAttackResolvedEventInput extends ICombatEventContext {
  readonly attackerId: string;
  readonly targetId: string;
  readonly weaponId: string;
  readonly roll: number;
  readonly toHitNumber: number;
  readonly hit: boolean;
  readonly location?: string;
  readonly damage?: number;
  readonly heat?: number;
  readonly attackerArc?: 'front' | 'left' | 'right' | 'rear';
  readonly ammoBinId?: string | null;
  readonly edge?: Pick<
    IAttackResolvedPayload,
    | 'edgeReroll'
    | 'edgeSuperseded'
    | 'edgeTrigger'
    | 'edgePointsRemaining'
    | 'edgeSupersededLocation'
    | 'edgeSupersededRoll'
  >;
}

type AttackResolvedLegacyArgs = [
  sequence: number,
  turn: number,
  attackerId: string,
  targetId: string,
  weaponId: string,
  roll: number,
  toHitNumber: number,
  hit: boolean,
  location?: string,
  damage?: number,
  heat?: number,
  attackerArc?: 'front' | 'left' | 'right' | 'rear',
  ammoBinId?: string | null,
  edge?: ICreateAttackResolvedEventInput['edge'],
];

function attackResolvedInput(
  input: ICreateAttackResolvedEventInput | string,
  legacy: [] | AttackResolvedLegacyArgs,
): ICreateAttackResolvedEventInput {
  if (typeof input !== 'string') return input;
  const args = legacy as AttackResolvedLegacyArgs;
  const [
    sequence,
    turn,
    attackerId,
    targetId,
    weaponId,
    roll,
    toHitNumber,
    hit,
    location,
    damage,
    heat,
    attackerArc,
    ammoBinId,
    edge,
  ] = args;
  return {
    gameId: input,
    sequence,
    turn,
    attackerId,
    targetId,
    weaponId,
    roll,
    toHitNumber,
    hit,
    location,
    damage,
    heat,
    attackerArc,
    ammoBinId,
    edge,
  };
}

export function createAttackResolvedEvent(
  input: ICreateAttackResolvedEventInput | string,
  ...legacy: [] | AttackResolvedLegacyArgs
): IGameEvent {
  const {
    ammoBinId,
    attackerArc,
    attackerId,
    damage,
    edge,
    gameId,
    heat,
    hit,
    location,
    roll,
    sequence,
    targetId,
    toHitNumber,
    turn,
    weaponId,
  } = attackResolvedInput(input, legacy);
  const payload: IAttackResolvedPayload = {
    attackerId,
    targetId,
    weaponId,
    roll,
    toHitNumber,
    hit,
    location,
    damage,
    heat,
    attackerArc,
    ammoBinId,
    ...(edge?.edgeReroll !== undefined ? { edgeReroll: edge.edgeReroll } : {}),
    ...(edge?.edgeSuperseded !== undefined
      ? { edgeSuperseded: edge.edgeSuperseded }
      : {}),
    ...(edge?.edgeTrigger !== undefined
      ? { edgeTrigger: edge.edgeTrigger }
      : {}),
    ...(edge?.edgePointsRemaining !== undefined
      ? { edgePointsRemaining: edge.edgePointsRemaining }
      : {}),
    ...(edge?.edgeSupersededLocation !== undefined
      ? { edgeSupersededLocation: edge.edgeSupersededLocation }
      : {}),
    ...(edge?.edgeSupersededRoll !== undefined
      ? { edgeSupersededRoll: edge.edgeSupersededRoll }
      : {}),
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.AttackResolved,
      turn,
      GamePhase.WeaponAttack,
      attackerId,
    ),
    payload,
  };
}

export interface ICreateAttackInvalidEventInput extends ICombatEventContext {
  readonly attackerId: string;
  readonly targetId: string;
  readonly reason: IAttackInvalidPayload['reason'];
  readonly weaponId?: string;
  readonly details?: string;
}

type AttackInvalidLegacyArgs = [
  sequence: number,
  turn: number,
  attackerId: string,
  targetId: string,
  reason: IAttackInvalidPayload['reason'],
  weaponId?: string,
  details?: string,
];

function attackInvalidInput(
  input: ICreateAttackInvalidEventInput | string,
  legacy: [] | AttackInvalidLegacyArgs,
): ICreateAttackInvalidEventInput {
  if (typeof input !== 'string') return input;
  const args = legacy as AttackInvalidLegacyArgs;
  const [sequence, turn, attackerId, targetId, reason, weaponId, details] =
    args;
  return {
    gameId: input,
    sequence,
    turn,
    attackerId,
    targetId,
    reason,
    weaponId,
    details,
  };
}

export function createAttackInvalidEvent(
  input: ICreateAttackInvalidEventInput | string,
  ...legacy: [] | AttackInvalidLegacyArgs
): IGameEvent {
  const {
    attackerId,
    details,
    gameId,
    reason,
    sequence,
    targetId,
    turn,
    weaponId,
  } = attackInvalidInput(input, legacy);
  const payload: IAttackInvalidPayload = {
    attackerId,
    targetId,
    reason,
    weaponId,
    details,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.AttackInvalid,
      turn,
      GamePhase.WeaponAttack,
      attackerId,
    ),
    payload,
  };
}
