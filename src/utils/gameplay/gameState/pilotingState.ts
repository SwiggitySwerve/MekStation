import {
  LockState,
  type IGameState,
  type IPhysicalAttackDeclaredPayload,
  type IPSRResolvedPayload,
  type IPSRTriggeredPayload,
  type IUnitFellPayload,
  type IUnitStoodPayload,
  type IUnitStuckPayload,
} from '@/types/gameplay';

import { updateUnitState } from './unitStatePatch';

export function applyPSRTriggered(
  state: IGameState,
  payload: IPSRTriggeredPayload,
): IGameState {
  return updateUnitState(state, payload.unitId, (unit) => {
    const pendingPSRs = unit.pendingPSRs ?? [];

    return {
      ...unit,
      pendingPSRs: [
        ...pendingPSRs,
        {
          entityId: payload.unitId,
          reason: payload.reason,
          additionalModifier: payload.additionalModifier,
          triggerSource: payload.triggerSource,
          ...(payload.reasonCode !== undefined
            ? { reasonCode: payload.reasonCode }
            : {}),
          ...(payload.fixedTargetNumber !== undefined
            ? { fixedTargetNumber: payload.fixedTargetNumber }
            : {}),
        },
      ],
    };
  });
}

export function applyPSRResolved(
  state: IGameState,
  payload: IPSRResolvedPayload,
): IGameState {
  return updateUnitState(state, payload.unitId, (unit) => ({
    ...unit,
    pendingPSRs: (unit.pendingPSRs ?? []).filter(
      (psr) => psr.reason !== payload.reason,
    ),
  }));
}

export function applyUnitFell(
  state: IGameState,
  payload: IUnitFellPayload,
): IGameState {
  return updateUnitState(state, payload.unitId, (unit) => ({
    ...unit,
    prone: true,
    facing: payload.newFacing,
    pendingPSRs: [],
  }));
}

export function applyUnitStuck(
  state: IGameState,
  payload: IUnitStuckPayload,
): IGameState {
  return updateUnitState(state, payload.unitId, (unit) => ({
    ...unit,
    isStuck: true,
    pendingPSRs: [],
  }));
}

export function applyUnitStood(
  state: IGameState,
  payload: IUnitStoodPayload,
): IGameState {
  return updateUnitState(state, payload.unitId, (unit) => ({
    ...unit,
    prone: false,
  }));
}

export function applyPhysicalAttackDeclared(
  state: IGameState,
  payload: IPhysicalAttackDeclaredPayload,
): IGameState {
  return updateUnitState(state, payload.attackerId, (unit) => ({
    ...unit,
    lockState: LockState.Planning,
  }));
}
