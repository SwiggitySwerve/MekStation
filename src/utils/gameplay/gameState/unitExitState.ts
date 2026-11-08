import {
  GameSide,
  LockState,
  type IGameState,
  type IUnitGameState,
  type IMoraleShiftedPayload,
  type INeuralInterfaceStateChangedPayload,
  type IRetreatTriggeredPayload,
  type IUnitEjectedPayload,
  type IUnitRetreatedPayload,
  type IWithdrawalDeclaredPayload,
  type MoraleLevel,
} from '@/types/gameplay';

import { clearAttackLinks } from '../attackLinks';
import { getUnitOperability } from '../unitOperability';
import { updateUnitState } from './unitStatePatch';

/**
 * A unit leaves the battle once: destroyed, ejected or retreated, whichever
 * event lands first. Later exit or latch events for it are ignored here, so
 * emitters that do not guard (P2P translation, the store eject) cannot
 * stack exits.
 */
const hasLeftBattle = (unit: IUnitGameState): boolean =>
  !getUnitOperability(unit).onField;

export function applyRetreatTriggered(
  state: IGameState,
  payload: IRetreatTriggeredPayload,
): IGameState {
  return updateUnitState(state, payload.unitId, (unit) =>
    unit.isRetreating || hasLeftBattle(unit)
      ? undefined
      : {
          ...unit,
          isRetreating: true,
          // The retreat and withdrawal latches share one edge; the first
          // latch to arrive keeps it.
          retreatTargetEdge: unit.retreatTargetEdge ?? payload.edge,
        },
  );
}

export function applyUnitRetreated(
  state: IGameState,
  payload: IUnitRetreatedPayload,
): IGameState {
  const next = updateUnitState(state, payload.unitId, (unit) =>
    hasLeftBattle(unit)
      ? undefined
      : {
          ...unit,
          hasRetreated: true,
        },
  );
  return next === state ? state : clearAttackLinks(next, payload.unitId);
}

export function applyUnitEjected(
  state: IGameState,
  payload: IUnitEjectedPayload,
): IGameState {
  const next = updateUnitState(state, payload.unitId, (unit) =>
    hasLeftBattle(unit)
      ? undefined
      : {
          ...unit,
          hasEjected: true,
          lockState: LockState.Resolved,
          pendingAction: undefined,
        },
  );
  return next === state ? state : clearAttackLinks(next, payload.unitId);
}

export function applyNeuralInterfaceStateChanged(
  state: IGameState,
  payload: INeuralInterfaceStateChangedPayload,
): IGameState {
  return updateUnitState(state, payload.unitId, (unit) =>
    unit.neuralInterfaceActive === payload.active
      ? undefined
      : {
          ...unit,
          neuralInterfaceActive: payload.active,
        },
  );
}

const DEFAULT_BATTLE_MORALE: Readonly<Record<GameSide, MoraleLevel>> = {
  [GameSide.Player]: 'STEADY',
  [GameSide.Opponent]: 'STEADY',
};

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

export function applyWithdrawalDeclared(
  state: IGameState,
  payload: IWithdrawalDeclaredPayload,
): IGameState {
  return updateUnitState(state, payload.unitId, (unit) =>
    unit.isWithdrawing || hasLeftBattle(unit)
      ? undefined
      : {
          ...unit,
          isWithdrawing: true,
          retreatTargetEdge: unit.retreatTargetEdge ?? payload.edge,
        },
  );
}
