import {
  LockState,
  PSRTrigger,
  type IGameState,
  type IPhysicalAttackDeclaredPayload,
  type IPSRResolvedPayload,
  type IPSRTriggeredPayload,
  type IUnitFellPayload,
  type IUnitStoodPayload,
  type IUnitStuckPayload,
} from '@/types/gameplay';
import { applyFallPosture } from '@/utils/gameplay/movement/fallPosture';
import { clearStuck } from '@/utils/gameplay/movement/stuckState';

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
  return updateUnitState(state, payload.unitId, (unit) => {
    const resolved = {
      ...unit,
      pendingPSRs: (unit.pendingPSRs ?? []).filter(
        (psr) => psr.reason !== payload.reason,
      ),
    };
    // A passed movement-start swamp recovery roll frees the unit (MegaMek
    // TWGameManager.doTryUnstuck); a failed one leaves it stuck.
    return payload.passed && payload.reasonCode === PSRTrigger.SwampUnstuck
      ? clearStuck(resolved)
      : resolved;
  });
}

export function applyUnitFell(
  state: IGameState,
  payload: IUnitFellPayload,
): IGameState {
  return updateUnitState(state, payload.unitId, (unit) => ({
    ...applyFallPosture(unit),
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
    ...(payload.canUnstickByJumping === true
      ? { canUnstickByJumping: true }
      : {}),
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
