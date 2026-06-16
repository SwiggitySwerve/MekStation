import {
  type GroundObjectCarryLocation,
  type IGameSession,
  type IGameState,
  type IHexCoordinate,
  type IRepresentedGroundObjectState,
  type IUnitGameState,
} from '@/types/gameplay';
import { checkGroundObjectLiftCapacity } from '@/utils/gameplay/spaModifiers';

import {
  createGroundObjectDroppedEvent,
  createGroundObjectPickedUpEvent,
} from './gameEvents';
import { appendEvent } from './gameSessionEvents';

export type GroundObjectActionFailureReason =
  | 'unit-missing'
  | 'object-missing'
  | 'object-destroyed'
  | 'object-already-carried'
  | 'object-not-at-unit-position'
  | 'unit-tonnage-missing'
  | 'carry-location-unavailable'
  | 'object-too-heavy'
  | 'object-not-carried-by-unit';

export type GroundObjectActionResult =
  | {
      readonly ok: true;
      readonly session: IGameSession;
    }
  | {
      readonly ok: false;
      readonly session: IGameSession;
      readonly reason: GroundObjectActionFailureReason;
    };

export interface IGroundObjectPickupOptions {
  readonly carryLocation?: GroundObjectCarryLocation;
  readonly unitTonnage?: number;
  readonly abilities?: readonly string[];
  readonly tsmPickupModifier?: number;
}

export interface IGroundObjectPickupValidation {
  readonly ok: boolean;
  readonly reason?: GroundObjectActionFailureReason;
  readonly unit?: IUnitGameState;
  readonly object?: IRepresentedGroundObjectState;
  readonly carryLocation?: GroundObjectCarryLocation;
  readonly capacityTonnage?: number;
  readonly capacityMarginTonnage?: number;
}

function sameHex(
  left: IHexCoordinate | undefined,
  right: IHexCoordinate | undefined,
): boolean {
  return (
    left !== undefined &&
    right !== undefined &&
    left.q === right.q &&
    left.r === right.r
  );
}

function isLeftArmRequested(carryLocation: GroundObjectCarryLocation): boolean {
  return carryLocation === 'leftArm' || carryLocation === 'both';
}

function isRightArmRequested(
  carryLocation: GroundObjectCarryLocation,
): boolean {
  return carryLocation === 'rightArm' || carryLocation === 'both';
}

function isCarryLocationAvailable(
  unit: IUnitGameState,
  carryLocation: GroundObjectCarryLocation,
): boolean {
  if (isLeftArmRequested(carryLocation) && unit.leftArmCarryingCargo === true) {
    return false;
  }
  if (
    isRightArmRequested(carryLocation) &&
    unit.rightArmCarryingCargo === true
  ) {
    return false;
  }
  return true;
}

function defaultCarryLocation(unit: IUnitGameState): GroundObjectCarryLocation {
  if (unit.leftArmCarryingCargo === true) return 'rightArm';
  if (unit.rightArmCarryingCargo === true) return 'leftArm';
  return 'both';
}

function tsmPickupModifierForUnit(unit: IUnitGameState): number {
  return unit.hasTSM === true && unit.heat >= 9 ? 2 : 1;
}

export function validateGroundObjectPickup(
  state: IGameState,
  unitId: string,
  objectId: string,
  options: IGroundObjectPickupOptions = {},
): IGroundObjectPickupValidation {
  const unit = state.units[unitId];
  if (!unit) return { ok: false, reason: 'unit-missing' };

  const object = state.groundObjects?.[objectId];
  if (!object) return { ok: false, reason: 'object-missing', unit };
  if (object.destroyed === true) {
    return { ok: false, reason: 'object-destroyed', unit, object };
  }
  if (object.carriedByUnitId !== undefined) {
    return { ok: false, reason: 'object-already-carried', unit, object };
  }
  if (!sameHex(object.position, unit.position)) {
    return { ok: false, reason: 'object-not-at-unit-position', unit, object };
  }

  const unitTonnage = options.unitTonnage ?? unit.tonnage;
  if (unitTonnage === undefined || unitTonnage <= 0) {
    return { ok: false, reason: 'unit-tonnage-missing', unit, object };
  }

  const carryLocation = options.carryLocation ?? defaultCarryLocation(unit);
  if (!isCarryLocationAvailable(unit, carryLocation)) {
    return {
      ok: false,
      reason: 'carry-location-unavailable',
      unit,
      object,
      carryLocation,
    };
  }

  const capacityCheck = checkGroundObjectLiftCapacity({
    objectTonnage: object.tonnage,
    unitTonnage,
    abilities: options.abilities ?? unit.abilities,
    leftHandAvailable: isLeftArmRequested(carryLocation),
    rightHandAvailable: isRightArmRequested(carryLocation),
    tsmPickupModifier:
      options.tsmPickupModifier ?? tsmPickupModifierForUnit(unit),
  });

  if (!capacityCheck.allowed) {
    return {
      ok: false,
      reason: 'object-too-heavy',
      unit,
      object,
      carryLocation,
      capacityTonnage: capacityCheck.capacityTonnage,
      capacityMarginTonnage: capacityCheck.capacityMarginTonnage,
    };
  }

  return {
    ok: true,
    unit,
    object,
    carryLocation,
    capacityTonnage: capacityCheck.capacityTonnage,
    capacityMarginTonnage: capacityCheck.capacityMarginTonnage,
  };
}

export function validateGroundObjectDrop(
  state: IGameState,
  unitId: string,
  objectId: string,
): IGroundObjectPickupValidation {
  const unit = state.units[unitId];
  if (!unit) return { ok: false, reason: 'unit-missing' };

  const object = state.groundObjects?.[objectId];
  if (!object) return { ok: false, reason: 'object-missing', unit };
  if (object.carriedByUnitId !== unitId) {
    return { ok: false, reason: 'object-not-carried-by-unit', unit, object };
  }

  return {
    ok: true,
    unit,
    object,
    carryLocation: object.carryLocation,
  };
}

export function declareGroundObjectPickup(
  session: IGameSession,
  unitId: string,
  objectId: string,
  options: IGroundObjectPickupOptions = {},
): GroundObjectActionResult {
  const validation = validateGroundObjectPickup(
    session.currentState,
    unitId,
    objectId,
    options,
  );
  if (!validation.ok || !validation.object || !validation.carryLocation) {
    return {
      ok: false,
      session,
      reason: validation.reason ?? 'object-missing',
    };
  }

  const sequence = session.events.length;
  const { turn, phase } = session.currentState;
  return {
    ok: true,
    session: appendEvent(
      session,
      createGroundObjectPickedUpEvent(
        session.id,
        sequence,
        turn,
        phase,
        unitId,
        validation.object,
        validation.object.position ??
          session.currentState.units[unitId].position,
        validation.carryLocation,
        validation.capacityTonnage ?? 0,
        validation.capacityMarginTonnage ?? 0,
      ),
    ),
  };
}

export function declareGroundObjectDrop(
  session: IGameSession,
  unitId: string,
  objectId: string,
  to?: IHexCoordinate,
  reason: 'drop' | 'throw' = 'drop',
): GroundObjectActionResult {
  const validation = validateGroundObjectDrop(
    session.currentState,
    unitId,
    objectId,
  );
  if (!validation.ok) {
    return {
      ok: false,
      session,
      reason: validation.reason ?? 'object-not-carried-by-unit',
    };
  }

  const sequence = session.events.length;
  const { turn, phase } = session.currentState;
  return {
    ok: true,
    session: appendEvent(
      session,
      createGroundObjectDroppedEvent(
        session.id,
        sequence,
        turn,
        phase,
        unitId,
        objectId,
        to ?? session.currentState.units[unitId].position,
        reason,
      ),
    ),
  };
}

export function declareGroundObjectThrow(
  session: IGameSession,
  unitId: string,
  objectId: string,
  to: IHexCoordinate,
): GroundObjectActionResult {
  return declareGroundObjectDrop(session, unitId, objectId, to, 'throw');
}
