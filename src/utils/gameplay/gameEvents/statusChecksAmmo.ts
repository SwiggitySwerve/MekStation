import {
  GameEventType,
  IAmmoConsumedPayload,
  IGameEvent,
} from '@/types/gameplay';

import type { GameplayEventContextArgs } from './eventContext';

import * as statusCheckCommon from './statusChecksCommon';

type AmmoConsumedEventArgs = [
  ...GameplayEventContextArgs,
  binId: string,
  weaponType: string,
  roundsConsumed: number,
  roundsRemaining: number,
];

export interface ICreateAmmoConsumedEventInput
  extends statusCheckCommon.IStatusCheckEventContext {
  readonly binId: string;
  readonly weaponType: string;
  readonly roundsConsumed: number;
  readonly roundsRemaining: number;
}

export function createAmmoConsumedEvent(
  ...args: [ICreateAmmoConsumedEventInput] | AmmoConsumedEventArgs
): IGameEvent {
  const input = normalizeAmmoConsumedEventInput(args);
  const payload: IAmmoConsumedPayload = {
    unitId: input.unitId,
    binId: input.binId,
    weaponType: input.weaponType,
    roundsConsumed: input.roundsConsumed,
    roundsRemaining: input.roundsRemaining,
  };

  return statusCheckCommon.createStatusCheckEvent(
    GameEventType.AmmoConsumed,
    input,
    payload,
  );
}

function normalizeAmmoConsumedEventInput(
  args: [ICreateAmmoConsumedEventInput] | AmmoConsumedEventArgs,
): ICreateAmmoConsumedEventInput {
  if (typeof args[0] !== 'string') {
    return args[0];
  }

  const [
    gameId,
    sequence,
    turn,
    phase,
    unitId,
    binId,
    weaponType,
    roundsConsumed,
    roundsRemaining,
  ] = args as AmmoConsumedEventArgs;

  return {
    gameId,
    sequence,
    turn,
    phase,
    unitId,
    binId,
    weaponType,
    roundsConsumed,
    roundsRemaining,
  };
}
