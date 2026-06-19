import {
  GameEventType,
  type GroundObjectCarryLocation,
  type IGameEvent,
  type IGroundObjectDroppedPayload,
  type IGroundObjectPickedUpPayload,
  type IHexCoordinate,
  type IRepresentedGroundObjectState,
} from '@/types/gameplay';

import type {
  GameplayEventContextArgs,
  IGameplayEventContext,
} from './eventContext';

import { createEventBase } from './base';

type GroundObjectPickedUpEventArgs = [
  ...GameplayEventContextArgs,
  object: IRepresentedGroundObjectState,
  from: IHexCoordinate,
  carryLocation: GroundObjectCarryLocation,
  capacityTonnage: number,
  capacityMarginTonnage: number,
];

export interface ICreateGroundObjectPickedUpEventInput extends IGameplayEventContext {
  readonly object: IRepresentedGroundObjectState;
  readonly from: IHexCoordinate;
  readonly carryLocation: GroundObjectCarryLocation;
  readonly capacityTonnage: number;
  readonly capacityMarginTonnage: number;
}

type GroundObjectDroppedEventArgs = [
  ...GameplayEventContextArgs,
  objectId: string,
  to: IHexCoordinate,
  reason: IGroundObjectDroppedPayload['reason'],
];

export interface ICreateGroundObjectDroppedEventInput extends IGameplayEventContext {
  readonly objectId: string;
  readonly to: IHexCoordinate;
  readonly reason: IGroundObjectDroppedPayload['reason'];
}

export function createGroundObjectPickedUpEvent(
  ...args:
    | [ICreateGroundObjectPickedUpEventInput]
    | GroundObjectPickedUpEventArgs
): IGameEvent {
  const input = normalizeGroundObjectPickedUpEventInput(args);
  const payload: IGroundObjectPickedUpPayload = {
    unitId: input.unitId,
    objectId: input.object.id,
    object: input.object,
    from: input.from,
    carryLocation: input.carryLocation,
    capacityTonnage: input.capacityTonnage,
    capacityMarginTonnage: input.capacityMarginTonnage,
  };

  return {
    ...createEventBase(
      input.gameId,
      input.sequence,
      GameEventType.GroundObjectPickedUp,
      input.turn,
      input.phase,
      input.unitId,
    ),
    payload,
  };
}

export function createGroundObjectDroppedEvent(
  ...args: [ICreateGroundObjectDroppedEventInput] | GroundObjectDroppedEventArgs
): IGameEvent {
  const input = normalizeGroundObjectDroppedEventInput(args);
  const payload: IGroundObjectDroppedPayload = {
    unitId: input.unitId,
    objectId: input.objectId,
    to: input.to,
    reason: input.reason,
  };

  return {
    ...createEventBase(
      input.gameId,
      input.sequence,
      GameEventType.GroundObjectDropped,
      input.turn,
      input.phase,
      input.unitId,
    ),
    payload,
  };
}

function normalizeGroundObjectPickedUpEventInput(
  args: [ICreateGroundObjectPickedUpEventInput] | GroundObjectPickedUpEventArgs,
): ICreateGroundObjectPickedUpEventInput {
  if (typeof args[0] !== 'string') {
    return args[0];
  }

  const [
    gameId,
    sequence,
    turn,
    phase,
    unitId,
    object,
    from,
    carryLocation,
    capacityTonnage,
    capacityMarginTonnage,
  ] = args as GroundObjectPickedUpEventArgs;

  return {
    gameId,
    sequence,
    turn,
    phase,
    unitId,
    object,
    from,
    carryLocation,
    capacityTonnage,
    capacityMarginTonnage,
  };
}

function normalizeGroundObjectDroppedEventInput(
  args: [ICreateGroundObjectDroppedEventInput] | GroundObjectDroppedEventArgs,
): ICreateGroundObjectDroppedEventInput {
  if (typeof args[0] !== 'string') {
    return args[0];
  }

  const [gameId, sequence, turn, phase, unitId, objectId, to, reason] =
    args as GroundObjectDroppedEventArgs;

  return {
    gameId,
    sequence,
    turn,
    phase,
    unitId,
    objectId,
    to,
    reason,
  };
}
