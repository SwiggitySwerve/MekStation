import {
  Facing,
  GameEventType,
  IGameEvent,
  IUnitFellPayload,
  IUnitStoodPayload,
  IUnitStuckPayload,
  PSRTrigger,
} from '@/types/gameplay';

import type { GameplayEventContextArgs } from './eventContext';

import * as statusCheckCommon from './statusChecksCommon';

type UnitFellEventArgs = [
  ...GameplayEventContextArgs,
  fallDamage: number,
  newFacing: Facing,
  pilotDamage: number,
  location?: string,
  reason?: string,
  reasonCode?: PSRTrigger,
];

export interface ICreateUnitFellEventInput
  extends statusCheckCommon.IStatusCheckEventContext {
  readonly fallDamage: number;
  readonly newFacing: Facing;
  readonly pilotDamage: number;
  readonly location?: string;
  readonly reason?: string;
  readonly reasonCode?: PSRTrigger;
}

type UnitStuckEventArgs = [
  ...GameplayEventContextArgs,
  reason?: string,
  reasonCode?: PSRTrigger,
];

export interface ICreateUnitStuckEventInput
  extends statusCheckCommon.IStatusCheckEventContext {
  readonly reason?: string;
  readonly reasonCode?: PSRTrigger;
}

type UnitStoodEventArgs = [
  ...GameplayEventContextArgs,
  roll: number,
  targetNumber: number,
  automaticSuccessReason?: string,
];

export interface ICreateUnitStoodEventInput
  extends statusCheckCommon.IStatusCheckEventContext {
  readonly roll: number;
  readonly targetNumber: number;
  readonly automaticSuccessReason?: string;
}

export function createUnitFellEvent(
  ...args: [ICreateUnitFellEventInput] | UnitFellEventArgs
): IGameEvent {
  const input = normalizeUnitFellEventInput(args);
  const payload: IUnitFellPayload = {
    unitId: input.unitId,
    fallDamage: input.fallDamage,
    newFacing: input.newFacing,
    pilotDamage: input.pilotDamage,
    ...(input.location !== undefined ? { location: input.location } : {}),
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
    ...(input.reasonCode !== undefined ? { reasonCode: input.reasonCode } : {}),
  };

  return statusCheckCommon.createStatusCheckEvent(
    GameEventType.UnitFell,
    input,
    payload,
  );
}

export function createUnitStuckEvent(
  ...args: [ICreateUnitStuckEventInput] | UnitStuckEventArgs
): IGameEvent {
  const input = normalizeUnitStuckEventInput(args);
  const payload: IUnitStuckPayload = {
    unitId: input.unitId,
    ...(input.reason !== undefined ? { reason: input.reason } : {}),
    ...(input.reasonCode !== undefined ? { reasonCode: input.reasonCode } : {}),
  };

  return statusCheckCommon.createStatusCheckEvent(
    GameEventType.UnitStuck,
    input,
    payload,
  );
}

/**
 * Per `wire-piloting-skill-rolls` task 9.3: fired when a prone unit
 * successfully passes an `AttemptStand` PSR and returns upright.
 */
export function createUnitStoodEvent(
  ...args: [ICreateUnitStoodEventInput] | UnitStoodEventArgs
): IGameEvent {
  const input = normalizeUnitStoodEventInput(args);
  const payload: IUnitStoodPayload = {
    unitId: input.unitId,
    turn: input.turn,
    roll: input.roll,
    targetNumber: input.targetNumber,
    ...(input.automaticSuccessReason !== undefined
      ? { automaticSuccessReason: input.automaticSuccessReason }
      : {}),
  };

  return statusCheckCommon.createStatusCheckEvent(
    GameEventType.UnitStood,
    input,
    payload,
  );
}

function normalizeUnitFellEventInput(
  args: [ICreateUnitFellEventInput] | UnitFellEventArgs,
): ICreateUnitFellEventInput {
  if (typeof args[0] !== 'string') {
    return args[0];
  }

  const [
    gameId,
    sequence,
    turn,
    phase,
    unitId,
    fallDamage,
    newFacing,
    pilotDamage,
    location,
    reason,
    reasonCode,
  ] = args as UnitFellEventArgs;

  return {
    gameId,
    sequence,
    turn,
    phase,
    unitId,
    fallDamage,
    newFacing,
    pilotDamage,
    ...(location !== undefined ? { location } : {}),
    ...(reason !== undefined ? { reason } : {}),
    ...(reasonCode !== undefined ? { reasonCode } : {}),
  };
}

function normalizeUnitStuckEventInput(
  args: [ICreateUnitStuckEventInput] | UnitStuckEventArgs,
): ICreateUnitStuckEventInput {
  if (typeof args[0] !== 'string') {
    return args[0];
  }

  const [gameId, sequence, turn, phase, unitId, reason, reasonCode] =
    args as UnitStuckEventArgs;

  return {
    gameId,
    sequence,
    turn,
    phase,
    unitId,
    ...(reason !== undefined ? { reason } : {}),
    ...(reasonCode !== undefined ? { reasonCode } : {}),
  };
}

function normalizeUnitStoodEventInput(
  args: [ICreateUnitStoodEventInput] | UnitStoodEventArgs,
): ICreateUnitStoodEventInput {
  if (typeof args[0] !== 'string') {
    return args[0];
  }

  const [
    gameId,
    sequence,
    turn,
    phase,
    unitId,
    roll,
    targetNumber,
    automaticSuccessReason,
  ] = args as UnitStoodEventArgs;

  return {
    gameId,
    sequence,
    turn,
    phase,
    unitId,
    roll,
    targetNumber,
    ...(automaticSuccessReason !== undefined ? { automaticSuccessReason } : {}),
  };
}
