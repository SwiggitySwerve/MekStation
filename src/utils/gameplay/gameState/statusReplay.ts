import {
  LockState,
  type IAMSInterceptionPayload,
  type IAmmoConsumedPayload,
  type IDesignatorMarkerAppliedPayload,
  type IEmpMinefieldEffectAppliedPayload,
  type IGameState,
  type IShutdownCheckPayload,
  type ISpottingDeclaredPayload,
  type IStartupAttemptPayload,
} from '@/types/gameplay';

import { updateUnitState } from './unitStatePatch';

export function applyShutdownCheck(
  state: IGameState,
  payload: IShutdownCheckPayload,
): IGameState {
  if (!payload.shutdownOccurred) {
    return state;
  }

  return updateUnitState(state, payload.unitId, (unit) => ({
    ...unit,
    shutdown: true,
  }));
}

export function applyStartupAttempt(
  state: IGameState,
  payload: IStartupAttemptPayload,
): IGameState {
  if (!payload.success) {
    return state;
  }

  return updateUnitState(state, payload.unitId, (unit) => ({
    ...unit,
    shutdown: false,
  }));
}

export function applyEmpMinefieldEffectApplied(
  state: IGameState,
  payload: IEmpMinefieldEffectAppliedPayload,
): IGameState {
  if (payload.effect === 'none') {
    return state;
  }

  return updateUnitState(state, payload.unitId, (unit) => ({
    ...unit,
    ...(payload.effect === 'interference'
      ? { empInterferenceTurns: payload.durationTurns ?? 0 }
      : {}),
    ...(payload.effect === 'shutdown'
      ? {
          shutdown: true,
          empShutdownTurns: payload.durationTurns ?? 0,
        }
      : {}),
  }));
}

export function applyAmmoConsumed(
  state: IGameState,
  payload: IAmmoConsumedPayload,
): IGameState {
  return updateUnitState(state, payload.unitId, (unit) => {
    const ammoState = unit.ammoState ?? {};
    const bin = ammoState[payload.binId];
    if (!bin) {
      return undefined;
    }

    return {
      ...unit,
      ammoState: {
        ...ammoState,
        [payload.binId]: {
          ...bin,
          remainingRounds: payload.roundsRemaining,
        },
      },
    };
  });
}

export function applyAMSInterception(
  state: IGameState,
  payload: IAMSInterceptionPayload,
): IGameState {
  return updateUnitState(state, payload.defenderId, (defender) => ({
    ...defender,
    weaponsFiredThisTurn: [
      ...(defender.weaponsFiredThisTurn ?? []),
      payload.amsWeaponId,
    ],
  }));
}

export function applyDesignatorMarkerApplied(
  state: IGameState,
  payload: IDesignatorMarkerAppliedPayload,
): IGameState {
  return updateUnitState(state, payload.targetId, (target) => {
    if (payload.marker === 'tag') {
      return target.tagDesignated
        ? undefined
        : {
            ...target,
            tagDesignated: true,
          };
    }

    if (!payload.teamId) {
      return undefined;
    }

    if (payload.marker === 'inarc') {
      const podType = payload.podType ?? 'homing';
      const iNarcPods = target.iNarcPods ?? [];
      if (
        iNarcPods.some(
          (pod) => pod.teamId === payload.teamId && pod.podType === podType,
        )
      ) {
        return undefined;
      }

      return {
        ...target,
        iNarcPods: [
          ...iNarcPods,
          {
            teamId: payload.teamId,
            podType,
            ...(payload.location !== undefined
              ? { location: payload.location }
              : {}),
          },
        ],
      };
    }

    const narcedBy = target.narcedBy ?? [];
    return narcedBy.includes(payload.teamId)
      ? undefined
      : {
          ...target,
          narcedBy: [...narcedBy, payload.teamId],
        };
  });
}

export function applySpottingDeclared(
  state: IGameState,
  payload: ISpottingDeclaredPayload,
): IGameState {
  return updateUnitState(state, payload.unitId, (unit) => ({
    ...unit,
    isSpotting: true,
    spotTargetId: payload.targetId,
    lockState: LockState.Locked,
  }));
}
