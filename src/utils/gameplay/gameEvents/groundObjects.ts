import {
  GameEventType,
  GamePhase,
  type GroundObjectCarryLocation,
  type IGameEvent,
  type IGroundObjectDroppedPayload,
  type IGroundObjectPickedUpPayload,
  type IHexCoordinate,
  type IRepresentedGroundObjectState,
} from '@/types/gameplay';

import { createEventBase } from './base';

export function createGroundObjectPickedUpEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  object: IRepresentedGroundObjectState,
  from: IHexCoordinate,
  carryLocation: GroundObjectCarryLocation,
  capacityTonnage: number,
  capacityMarginTonnage: number,
): IGameEvent {
  const payload: IGroundObjectPickedUpPayload = {
    unitId,
    objectId: object.id,
    object,
    from,
    carryLocation,
    capacityTonnage,
    capacityMarginTonnage,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.GroundObjectPickedUp,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createGroundObjectDroppedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  objectId: string,
  to: IHexCoordinate,
  reason: IGroundObjectDroppedPayload['reason'],
): IGameEvent {
  const payload: IGroundObjectDroppedPayload = {
    unitId,
    objectId,
    to,
    reason,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.GroundObjectDropped,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}
