import {
  GameEventType,
  IGameEvent,
  IShutdownCheckPayload,
  IStartupAttemptPayload,
} from '@/types/gameplay';

import type { GameplayEventContextArgs } from './eventContext';

import * as statusCheckCommon from './statusChecksCommon';

type ShutdownCheckEventArgs = [
  ...GameplayEventContextArgs,
  heatLevel: number,
  targetNumber: number,
  roll: number,
  shutdownOccurred: boolean,
];

export interface ICreateShutdownCheckEventInput
  extends statusCheckCommon.IStatusCheckEventContext {
  readonly heatLevel: number;
  readonly targetNumber: number;
  readonly roll: number;
  readonly shutdownOccurred: boolean;
}

type StartupAttemptEventArgs = [
  ...GameplayEventContextArgs,
  targetNumber: number,
  roll: number,
  success: boolean,
];

export interface ICreateStartupAttemptEventInput
  extends statusCheckCommon.IStatusCheckEventContext {
  readonly targetNumber: number;
  readonly roll: number;
  readonly success: boolean;
}

export function createShutdownCheckEvent(
  ...args: [ICreateShutdownCheckEventInput] | ShutdownCheckEventArgs
): IGameEvent {
  const input = normalizeShutdownCheckEventInput(args);
  const payload: IShutdownCheckPayload = {
    unitId: input.unitId,
    heatLevel: input.heatLevel,
    targetNumber: input.targetNumber,
    roll: input.roll,
    shutdownOccurred: input.shutdownOccurred,
  };

  return statusCheckCommon.createStatusCheckEvent(
    GameEventType.ShutdownCheck,
    input,
    payload,
  );
}

export function createStartupAttemptEvent(
  ...args: [ICreateStartupAttemptEventInput] | StartupAttemptEventArgs
): IGameEvent {
  const input = normalizeStartupAttemptEventInput(args);
  const payload: IStartupAttemptPayload = {
    unitId: input.unitId,
    targetNumber: input.targetNumber,
    roll: input.roll,
    success: input.success,
  };

  return statusCheckCommon.createStatusCheckEvent(
    GameEventType.StartupAttempt,
    input,
    payload,
  );
}

function normalizeShutdownCheckEventInput(
  args: [ICreateShutdownCheckEventInput] | ShutdownCheckEventArgs,
): ICreateShutdownCheckEventInput {
  if (typeof args[0] !== 'string') {
    return args[0];
  }

  const [
    gameId,
    sequence,
    turn,
    phase,
    unitId,
    heatLevel,
    targetNumber,
    roll,
    shutdownOccurred,
  ] = args as ShutdownCheckEventArgs;

  return {
    gameId,
    sequence,
    turn,
    phase,
    unitId,
    heatLevel,
    targetNumber,
    roll,
    shutdownOccurred,
  };
}

function normalizeStartupAttemptEventInput(
  args: [ICreateStartupAttemptEventInput] | StartupAttemptEventArgs,
): ICreateStartupAttemptEventInput {
  if (typeof args[0] !== 'string') {
    return args[0];
  }

  const [gameId, sequence, turn, phase, unitId, targetNumber, roll, success] =
    args as StartupAttemptEventArgs;

  return {
    gameId,
    sequence,
    turn,
    phase,
    unitId,
    targetNumber,
    roll,
    success,
  };
}
