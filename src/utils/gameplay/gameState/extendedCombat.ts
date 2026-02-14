import {
  IAmmoConsumedPayload,
  IGameState,
  IPhysicalAttackDeclaredPayload,
  IPhysicalAttackResolvedPayload,
  IPSRResolvedPayload,
  IPSRTriggeredPayload,
  IShutdownCheckPayload,
  IStartupAttemptPayload,
  IUnitFellPayload,
  LockState,
} from '@/types/gameplay';

export function applyPSRTriggered(
  state: IGameState,
  payload: IPSRTriggeredPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }

  const pendingPSRs = unit.pendingPSRs ?? [];

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        pendingPSRs: [
          ...pendingPSRs,
          {
            entityId: payload.unitId,
            reason: payload.reason,
            additionalModifier: payload.additionalModifier,
            triggerSource: payload.triggerSource,
          },
        ],
      },
    },
  };
}

export function applyPSRResolved(
  state: IGameState,
  payload: IPSRResolvedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }

  const pendingPSRs = unit.pendingPSRs ?? [];
  const remaining = pendingPSRs.filter((psr) => psr.reason !== payload.reason);

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        pendingPSRs: remaining,
      },
    },
  };
}

export function applyUnitFell(
  state: IGameState,
  payload: IUnitFellPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        prone: true,
        facing: payload.newFacing,
        pendingPSRs: [],
      },
    },
  };
}

export function applyPhysicalAttackDeclared(
  state: IGameState,
  payload: IPhysicalAttackDeclaredPayload,
): IGameState {
  const unit = state.units[payload.attackerId];
  if (!unit) {
    return state;
  }

  return {
    ...state,
    units: {
      ...state.units,
      [payload.attackerId]: {
        ...unit,
        lockState: LockState.Planning,
      },
    },
  };
}

export function applyPhysicalAttackResolved(
  state: IGameState,
  payload: IPhysicalAttackResolvedPayload,
): IGameState {
  if (!payload.hit) {
    return state;
  }

  const target = state.units[payload.targetId];
  if (!target) {
    return state;
  }

  const currentDamageThisPhase = target.damageThisPhase ?? 0;

  return {
    ...state,
    units: {
      ...state.units,
      [payload.targetId]: {
        ...target,
        damageThisPhase: currentDamageThisPhase + (payload.damage ?? 0),
      },
    },
  };
}

export function applyShutdownCheck(
  state: IGameState,
  payload: IShutdownCheckPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }

  if (!payload.shutdownOccurred) {
    return state;
  }

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        shutdown: true,
      },
    },
  };
}

export function applyStartupAttempt(
  state: IGameState,
  payload: IStartupAttemptPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }

  if (!payload.success) {
    return state;
  }

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        shutdown: false,
      },
    },
  };
}

export function applyAmmoConsumed(
  state: IGameState,
  payload: IAmmoConsumedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }

  const ammoState = unit.ammoState ?? {};
  const bin = ammoState[payload.binId];
  if (!bin) {
    return state;
  }

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        ammoState: {
          ...ammoState,
          [payload.binId]: {
            ...bin,
            remainingRounds: payload.roundsRemaining,
          },
        },
      },
    },
  };
}
