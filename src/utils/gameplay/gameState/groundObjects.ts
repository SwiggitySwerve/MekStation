import {
  type GroundObjectCarryLocation,
  type IGameState,
  type IGroundObjectDroppedPayload,
  type IGroundObjectPickedUpPayload,
  type IUnitGameState,
} from '@/types/gameplay';

function carriedIdsWithout(
  unit: IUnitGameState,
  objectId: string,
): readonly string[] {
  return (unit.carriedGroundObjectIds ?? []).filter((id) => id !== objectId);
}

function armCargoStateForPickup(
  unit: IUnitGameState,
  carryLocation: GroundObjectCarryLocation,
): Pick<IUnitGameState, 'leftArmCarryingCargo' | 'rightArmCarryingCargo'> {
  return {
    leftArmCarryingCargo:
      unit.leftArmCarryingCargo === true ||
      carryLocation === 'leftArm' ||
      carryLocation === 'both',
    rightArmCarryingCargo:
      unit.rightArmCarryingCargo === true ||
      carryLocation === 'rightArm' ||
      carryLocation === 'both',
  };
}

function armCargoStateForDrop(
  state: IGameState,
  unit: IUnitGameState,
  droppedObjectId: string,
): Pick<IUnitGameState, 'leftArmCarryingCargo' | 'rightArmCarryingCargo'> {
  const remainingObjectIds = carriedIdsWithout(unit, droppedObjectId);
  const remainingObjects = remainingObjectIds
    .map((id) => state.groundObjects?.[id])
    .filter((object) => object !== undefined);

  return {
    leftArmCarryingCargo: remainingObjects.some(
      (object) =>
        object.carryLocation === 'leftArm' || object.carryLocation === 'both',
    ),
    rightArmCarryingCargo: remainingObjects.some(
      (object) =>
        object.carryLocation === 'rightArm' || object.carryLocation === 'both',
    ),
  };
}

export function applyGroundObjectPickedUp(
  state: IGameState,
  payload: IGroundObjectPickedUpPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) return state;

  const carriedGroundObjectIds = [
    ...carriedIdsWithout(unit, payload.objectId),
    payload.objectId,
  ];

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        ...armCargoStateForPickup(unit, payload.carryLocation),
        carriedGroundObjectIds,
        isLoadingOrUnloadingCargo: true,
      },
    },
    groundObjects: {
      ...(state.groundObjects ?? {}),
      [payload.objectId]: {
        ...payload.object,
        position: undefined,
        carriedByUnitId: payload.unitId,
        carryLocation: payload.carryLocation,
      },
    },
  };
}

export function applyGroundObjectDropped(
  state: IGameState,
  payload: IGroundObjectDroppedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  const object = state.groundObjects?.[payload.objectId];
  if (!unit || !object || object.carriedByUnitId !== payload.unitId) {
    return state;
  }

  const carriedGroundObjectIds = carriedIdsWithout(unit, payload.objectId);

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        ...armCargoStateForDrop(state, unit, payload.objectId),
        carriedGroundObjectIds,
        isLoadingOrUnloadingCargo: true,
      },
    },
    groundObjects: {
      ...(state.groundObjects ?? {}),
      [payload.objectId]: {
        ...object,
        position: payload.to,
        carriedByUnitId: undefined,
        carryLocation: undefined,
      },
    },
  };
}
