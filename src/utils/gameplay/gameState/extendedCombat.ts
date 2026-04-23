import {
  IAmmoConsumedPayload,
  IGameState,
  IPhysicalAttackDeclaredPayload,
  IPhysicalAttackResolvedPayload,
  IPSRResolvedPayload,
  IPSRTriggeredPayload,
  IRetreatTriggeredPayload,
  IShutdownCheckPayload,
  IStartupAttemptPayload,
  IUnitFellPayload,
  IUnitRetreatedPayload,
  IUnitStoodPayload,
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

/**
 * Per `wire-piloting-skill-rolls` task 9.3: prone unit has passed an
 * `AttemptStand` PSR and returns upright. Clears prone flag;
 * pendingPSRs have already been resolved by the preceding
 * `PSRResolved` event.
 */
export function applyUnitStood(
  state: IGameState,
  payload: IUnitStoodPayload,
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
        prone: false,
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

/**
 * Per `wire-bot-ai-helpers-and-capstone`: latch the unit's `isRetreating`
 * flag and store the resolved retreat edge. One-way — once true, stays
 * true for the rest of the match. Subsequent triggers on the same unit
 * are no-ops, preserving the originally chosen edge so the move scorer
 * doesn't oscillate between targets.
 */
export function applyRetreatTriggered(
  state: IGameState,
  payload: IRetreatTriggeredPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }
  if (unit.isRetreating) {
    return state;
  }
  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        isRetreating: true,
        retreatTargetEdge: payload.edge,
      },
    },
  };
}

/**
 * Per `add-bot-retreat-behavior` § 7.4: latch `hasRetreated = true` on
 * the withdrawing unit so victory-check predicates can treat it as
 * no-longer-participating. Idempotent — re-applying does nothing. Does
 * NOT set `destroyed` so post-battle summaries can distinguish the
 * withdrawn unit from combat losses (see GameOutcomeCalculator for the
 * survival predicate that treats destroyed-OR-retreated as "out").
 */
export function applyUnitRetreated(
  state: IGameState,
  payload: IUnitRetreatedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }
  if (unit.hasRetreated) {
    return state;
  }
  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        hasRetreated: true,
      },
    },
  };
}
