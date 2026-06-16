import {
  GameEventType,
  type IGameEvent,
  type IGameState,
  type IGroundObjectDroppedPayload,
  type IGroundObjectPickedUpPayload,
  type IHexCoordinate,
} from '@/types/gameplay';
import {
  applyGroundObjectDropped,
  applyGroundObjectPickedUp,
} from '@/utils/gameplay/gameState/groundObjects';
import {
  validateGroundObjectDrop,
  validateGroundObjectPickup,
  type IGroundObjectPickupOptions,
} from '@/utils/gameplay/groundObjectActions';

import { createGameEvent } from './utils';

export interface IRunnerGroundObjectPickupOptions extends IGroundObjectPickupOptions {
  readonly state: IGameState;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly unitId: string;
  readonly objectId: string;
}

export interface IRunnerGroundObjectDropOptions {
  readonly state: IGameState;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly unitId: string;
  readonly objectId: string;
  readonly to?: IHexCoordinate;
}

export interface IRunnerGroundObjectThrowOptions extends Omit<
  IRunnerGroundObjectDropOptions,
  'to'
> {
  readonly to: IHexCoordinate;
}

export function applyRunnerGroundObjectPickup({
  abilities,
  carryLocation,
  events,
  gameId,
  objectId,
  state,
  tsmPickupModifier,
  unitId,
  unitTonnage,
}: IRunnerGroundObjectPickupOptions): IGameState {
  const validation = validateGroundObjectPickup(state, unitId, objectId, {
    abilities,
    carryLocation,
    tsmPickupModifier,
    unitTonnage,
  });

  if (
    !validation.ok ||
    validation.object === undefined ||
    validation.unit === undefined ||
    validation.carryLocation === undefined
  ) {
    return state;
  }

  const payload: IGroundObjectPickedUpPayload = {
    unitId,
    objectId,
    object: validation.object,
    from: validation.object.position ?? validation.unit.position,
    carryLocation: validation.carryLocation,
    capacityTonnage: validation.capacityTonnage ?? 0,
    capacityMarginTonnage: validation.capacityMarginTonnage ?? 0,
  };

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.GroundObjectPickedUp,
      state.turn,
      state.phase,
      payload,
      unitId,
    ),
  );

  return applyGroundObjectPickedUp(state, payload);
}

function applyRunnerGroundObjectRelease({
  events,
  gameId,
  objectId,
  reason,
  state,
  to,
  unitId,
}: IRunnerGroundObjectDropOptions & {
  readonly reason: IGroundObjectDroppedPayload['reason'];
}): IGameState {
  const validation = validateGroundObjectDrop(state, unitId, objectId);

  if (!validation.ok || validation.unit === undefined) {
    return state;
  }

  const payload: IGroundObjectDroppedPayload = {
    unitId,
    objectId,
    to: to ?? validation.unit.position,
    reason,
  };

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.GroundObjectDropped,
      state.turn,
      state.phase,
      payload,
      unitId,
    ),
  );

  return applyGroundObjectDropped(state, payload);
}

export function applyRunnerGroundObjectDrop(
  options: IRunnerGroundObjectDropOptions,
): IGameState {
  return applyRunnerGroundObjectRelease({ ...options, reason: 'drop' });
}

export function applyRunnerGroundObjectThrow(
  options: IRunnerGroundObjectThrowOptions,
): IGameState {
  return applyRunnerGroundObjectRelease({ ...options, reason: 'throw' });
}
