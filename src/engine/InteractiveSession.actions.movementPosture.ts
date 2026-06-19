import type { IComponentDamageState } from '@/types/gameplay';
import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';
import type { IMovementInvalidPayload } from '@/types/gameplay/GameSessionMovementEvents';

import { getHeatMovementPenalty } from '@/constants/heat';
import {
  Facing,
  MovementType,
  type IHexCoordinate,
  type IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';
import { createMovementInvalidEvent } from '@/utils/gameplay/gameEvents';
import { appendEvent } from '@/utils/gameplay/gameSession';
import { isGyroDestroyedForType } from '@/utils/gameplay/gyroRules';
import { hexEquals } from '@/utils/gameplay/hexMath';
import {
  getHullDownEntryCost,
  getMaxMP,
  hullDownSupportDestroyedReason,
  isMekStyleHullDownExitCapability,
} from '@/utils/gameplay/movement';

const DEFAULT_COMPONENT_DAMAGE: IComponentDamageState = {
  engineHits: 0,
  gyroHits: 0,
  sensorHits: 0,
  lifeSupport: 0,
  cockpitHit: false,
  actuators: {},
  weaponsDestroyed: [],
  heatSinksDestroyed: 0,
  jumpJetsDestroyed: 0,
};

export function hullDownEntryInvalidDetails(input: {
  readonly unit: IGameSession['currentState']['units'][string];
  readonly movementCapability?: IMovementCapability;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly facing: Facing;
  readonly movementType: MovementType;
  readonly optionalRules?: readonly string[];
}): string | null {
  if (input.movementType !== MovementType.Walk) {
    return 'Enter hull-down is a same-hex walk posture action';
  }
  if (!hexEquals(input.from, input.to) || input.facing !== input.unit.facing) {
    return 'Enter hull-down must stay in the current hex and facing';
  }
  if (input.unit.hullDown === true) {
    return 'Unit is already hull-down';
  }
  if (
    !input.movementCapability ||
    !isMekStyleHullDownExitCapability(input.movementCapability)
  ) {
    return 'Hull-down entry is only available for Mek-style movement';
  }
  if (
    isGyroDestroyedForType(
      input.unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE,
      input.unit.gyroType,
      { optionalRules: input.optionalRules },
    )
  ) {
    return 'Cannot enter hull-down with a destroyed gyro';
  }

  const destroyedSupportReason = hullDownSupportDestroyedReason(
    input.unit,
    input.movementCapability,
  );
  if (destroyedSupportReason) {
    return destroyedSupportReason;
  }

  const hullDownEntryCost = getHullDownEntryCost(
    input.unit,
    input.movementCapability,
  );
  const heatPenalty = getHeatMovementPenalty(input.unit.heat);
  const effectiveWalkMP = getMaxMP(
    input.movementCapability,
    MovementType.Walk,
    heatPenalty,
  );
  if (effectiveWalkMP < hullDownEntryCost) {
    return heatPenalty > 0
      ? `Needs ${hullDownEntryCost} MP to enter hull-down after heat penalty`
      : `Needs ${hullDownEntryCost} MP to enter hull-down`;
  }

  return null;
}

export function hullDownGoProneInvalidDetails(input: {
  readonly unit: IGameSession['currentState']['units'][string];
  readonly movementCapability?: IMovementCapability;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly facing: Facing;
  readonly movementType: MovementType;
}): string | null {
  if (input.movementType !== MovementType.Stationary) {
    return 'Go Prone from hull-down is a stationary posture action';
  }
  if (!hexEquals(input.from, input.to) || input.facing !== input.unit.facing) {
    return 'Go Prone from hull-down must stay in the current hex and facing';
  }
  if (input.unit.prone === true) {
    return 'Unit is already prone';
  }
  if (input.unit.hullDown !== true) {
    return 'Unit must be hull-down before going prone';
  }
  if (
    !input.movementCapability ||
    !isMekStyleHullDownExitCapability(input.movementCapability)
  ) {
    return 'Hull-down go-prone is only available for Mek-style movement';
  }
  return null;
}

export function appendInteractiveMovementInvalid(input: {
  readonly session: IGameSession;
  readonly unitId: string;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly facing: Facing;
  readonly movementType: MovementType;
  readonly reason: IMovementInvalidPayload['reason'];
  readonly details?: string;
  readonly mpCost?: number;
  readonly heatGenerated?: number;
}): IGameSession {
  return appendEvent(
    input.session,
    createMovementInvalidEvent(
      input.session.id,
      input.session.events.length,
      input.session.currentState.turn,
      input.unitId,
      input.from,
      input.to,
      input.facing,
      input.movementType,
      input.reason,
      input.details,
      input.mpCost,
      input.heatGenerated,
    ),
  );
}
