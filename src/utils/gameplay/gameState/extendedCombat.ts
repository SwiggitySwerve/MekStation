import {
  GameSide,
  IAMSInterceptionPayload,
  IAmmoConsumedPayload,
  IDesignatorMarkerAppliedPayload,
  IEmpMinefieldEffectAppliedPayload,
  IGameState,
  INeuralInterfaceStateChangedPayload,
  IMoraleShiftedPayload,
  IPhysicalAttackDeclaredPayload,
  IPhysicalAttackResolvedPayload,
  IPSRResolvedPayload,
  IPSRTriggeredPayload,
  IRetreatTriggeredPayload,
  IShutdownCheckPayload,
  ISpottingDeclaredPayload,
  IStartupAttemptPayload,
  IUnitEjectedPayload,
  IUnitFellPayload,
  IUnitRetreatedPayload,
  IUnitStoodPayload,
  IUnitStuckPayload,
  IWithdrawalDeclaredPayload,
  LockState,
  type MoraleLevel,
} from '@/types/gameplay';
import { removeEquivalentINarcPod } from '@/utils/gameplay/specialWeaponMechanics';

import { hexNeighbor } from '../hexMath';

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
            ...(payload.reasonCode !== undefined
              ? { reasonCode: payload.reasonCode }
              : {}),
            ...(payload.fixedTargetNumber !== undefined
              ? { fixedTargetNumber: payload.fixedTargetNumber }
              : {}),
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

export function applyUnitStuck(
  state: IGameState,
  payload: IUnitStuckPayload,
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
        isStuck: true,
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

function facingToward(
  source: IGameState['units'][string]['position'],
  destination: IGameState['units'][string]['position'],
  fallback: IGameState['units'][string]['facing'],
): IGameState['units'][string]['facing'] {
  for (let facing = 0; facing < 6; facing++) {
    const neighbor = hexNeighbor(source, facing as typeof fallback);
    if (neighbor.q === destination.q && neighbor.r === destination.r) {
      return facing as typeof fallback;
    }
  }
  return fallback;
}

export function applyPhysicalAttackResolved(
  state: IGameState,
  payload: IPhysicalAttackResolvedPayload,
): IGameState {
  if (!payload.hit && (payload.displacements?.length ?? 0) === 0) {
    return state;
  }

  let units: IGameState['units'] = state.units;

  if (payload.hit) {
    const target = state.units[payload.targetId];
    if (target) {
      const currentDamageThisPhase = target.damageThisPhase ?? 0;
      const brushOffINarcPods =
        payload.attackType === 'brush-off' && target.iNarcPods
          ? payload.selectedINarcPod
            ? removeEquivalentINarcPod(
                target.iNarcPods,
                payload.selectedINarcPod,
              )
            : target.iNarcPods.slice(1)
          : undefined;
      const brushOffState =
        payload.attackType === 'brush-off'
          ? (() => {
              const combatState =
                target.combatState?.kind === 'squad'
                  ? (() => {
                      const { swarmingUnitId: _swarmingUnitId, ...squadState } =
                        target.combatState.state;
                      return { ...target.combatState, state: squadState };
                    })()
                  : target.combatState;

              return {
                isSwarming: false,
                ...(brushOffINarcPods !== undefined
                  ? { iNarcPods: brushOffINarcPods }
                  : {}),
                ...(combatState ? { combatState } : {}),
              };
            })()
          : {};
      units = {
        ...units,
        [payload.targetId]: {
          ...target,
          ...brushOffState,
          damageThisPhase: currentDamageThisPhase + (payload.damage ?? 0),
        },
      };
    }

    if (payload.attackType === 'grapple') {
      const attacker = units[payload.attackerId];
      const grappleTarget = units[payload.targetId];
      if (attacker && grappleTarget) {
        units = {
          ...units,
          [payload.attackerId]: {
            ...attacker,
            grappledUnitId: payload.targetId,
            isGrappleAttacker: true,
            grappledThisRound: true,
            grappleSide: 'both',
            position: grappleTarget.position,
          },
          [payload.targetId]: {
            ...grappleTarget,
            grappledUnitId: payload.attackerId,
            isGrappleAttacker: false,
            grappledThisRound: true,
            grappleSide: 'both',
            facing: ((attacker.facing + 3) % 6) as typeof grappleTarget.facing,
          },
        };
      }
    }
  }

  for (const displacement of payload.displacements ?? []) {
    const displacedUnit = units[displacement.unitId];
    if (!displacedUnit) continue;
    units = {
      ...units,
      [displacement.unitId]: {
        ...displacedUnit,
        position: displacement.to,
      },
    };
  }

  if (payload.hit && payload.attackType === 'break-grapple') {
    const attacker = units[payload.attackerId];
    const target = units[payload.targetId];
    if (attacker && target) {
      const movedUnitIds = new Set(
        (payload.displacements ?? [])
          .filter((displacement) => displacement.reason === 'break-grapple')
          .map((displacement) => displacement.unitId),
      );
      units = {
        ...units,
        [payload.attackerId]: {
          ...attacker,
          grappledUnitId: undefined,
          isGrappleAttacker: undefined,
          grappledThisRound: false,
          grappleSide: undefined,
          isChainWhipGrappled: false,
          facing: movedUnitIds.has(payload.attackerId)
            ? facingToward(attacker.position, target.position, attacker.facing)
            : attacker.facing,
        },
        [payload.targetId]: {
          ...target,
          grappledUnitId: undefined,
          isGrappleAttacker: undefined,
          grappledThisRound: false,
          grappleSide: undefined,
          isChainWhipGrappled: false,
          facing: movedUnitIds.has(payload.targetId)
            ? facingToward(target.position, attacker.position, target.facing)
            : target.facing,
        },
      };
    }
  }

  return { ...state, units };
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

export function applyEmpMinefieldEffectApplied(
  state: IGameState,
  payload: IEmpMinefieldEffectAppliedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit || payload.effect === 'none') {
    return state;
  }

  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
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

export function applyAMSInterception(
  state: IGameState,
  payload: IAMSInterceptionPayload,
): IGameState {
  const defender = state.units[payload.defenderId];
  if (!defender) {
    return state;
  }

  return {
    ...state,
    units: {
      ...state.units,
      [payload.defenderId]: {
        ...defender,
        weaponsFiredThisTurn: [
          ...(defender.weaponsFiredThisTurn ?? []),
          payload.amsWeaponId,
        ],
      },
    },
  };
}

export function applyDesignatorMarkerApplied(
  state: IGameState,
  payload: IDesignatorMarkerAppliedPayload,
): IGameState {
  const target = state.units[payload.targetId];
  if (!target) {
    return state;
  }

  if (payload.marker === 'tag') {
    if (target.tagDesignated) {
      return state;
    }
    return {
      ...state,
      units: {
        ...state.units,
        [payload.targetId]: {
          ...target,
          tagDesignated: true,
        },
      },
    };
  }

  if (!payload.teamId) {
    return state;
  }

  if (payload.marker === 'inarc') {
    const podType = payload.podType ?? 'homing';
    const iNarcPods = target.iNarcPods ?? [];
    if (
      iNarcPods.some(
        (pod) => pod.teamId === payload.teamId && pod.podType === podType,
      )
    ) {
      return state;
    }

    return {
      ...state,
      units: {
        ...state.units,
        [payload.targetId]: {
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
        },
      },
    };
  }

  const narcedBy = target.narcedBy ?? [];
  if (narcedBy.includes(payload.teamId)) {
    return state;
  }

  return {
    ...state,
    units: {
      ...state.units,
      [payload.targetId]: {
        ...target,
        narcedBy: [...narcedBy, payload.teamId],
      },
    },
  };
}

export function applySpottingDeclared(
  state: IGameState,
  payload: ISpottingDeclaredPayload,
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
        isSpotting: true,
        spotTargetId: payload.targetId,
        lockState: LockState.Locked,
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

/**
 * Ejection removes the pilot from combat without damaging the chassis. The
 * unit no longer blocks turn rotation, objective control, or targetability,
 * but post-battle damage accounting can still inspect the preserved armor and
 * structure values.
 */
export function applyUnitEjected(
  state: IGameState,
  payload: IUnitEjectedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }
  if (unit.hasEjected) {
    return state;
  }
  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        hasEjected: true,
        lockState: LockState.Resolved,
        pendingAction: undefined,
      },
    },
  };
}

/**
 * Default in-battle morale — every side starts a battle at `STEADY`
 * (per `add-combat-morale-and-withdrawal` D1).
 */
export function applyNeuralInterfaceStateChanged(
  state: IGameState,
  payload: INeuralInterfaceStateChangedPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }
  if (unit.neuralInterfaceActive === payload.active) {
    return state;
  }
  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        neuralInterfaceActive: payload.active,
      },
    },
  };
}

const DEFAULT_BATTLE_MORALE: Readonly<Record<GameSide, MoraleLevel>> = {
  [GameSide.Player]: 'STEADY',
  [GameSide.Opponent]: 'STEADY',
};

/**
 * Per `add-combat-morale-and-withdrawal` (D1 / D2): apply a
 * `MoraleShifted` event to the derived state's per-side `battleMorale`.
 * The event payload already carries the resolved `to` level — the
 * morale-shift arithmetic lives in the morale evaluation pass, so the
 * reducer is a pure state write. `battleMorale` is bootstrapped to all
 * `STEADY` on the first shift if a producer never seeded it.
 */
export function applyMoraleShifted(
  state: IGameState,
  payload: IMoraleShiftedPayload,
): IGameState {
  const battleMorale = state.battleMorale ?? DEFAULT_BATTLE_MORALE;
  return {
    ...state,
    battleMorale: {
      ...battleMorale,
      [payload.side]: payload.to,
    },
  };
}

/**
 * Per `add-combat-morale-and-withdrawal` (D4 / D6): apply a
 * `WithdrawalDeclared` event. Latches the unit's `isWithdrawing` flag
 * and records the player-chosen `retreatTargetEdge` so the unit is
 * routed through the SAME edge-ward movement + `UnitRetreated` exit the
 * bot uses. The flag is sticky — re-applying does nothing, and the
 * edge is locked on the first declaration so a withdrawing unit cannot
 * be re-aimed.
 */
export function applyWithdrawalDeclared(
  state: IGameState,
  payload: IWithdrawalDeclaredPayload,
): IGameState {
  const unit = state.units[payload.unitId];
  if (!unit) {
    return state;
  }
  if (unit.isWithdrawing) {
    return state;
  }
  return {
    ...state,
    units: {
      ...state.units,
      [payload.unitId]: {
        ...unit,
        isWithdrawing: true,
        retreatTargetEdge: payload.edge,
      },
    },
  };
}
