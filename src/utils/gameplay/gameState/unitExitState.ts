import {
  GameSide,
  LockState,
  type IGameState,
  type IMoraleShiftedPayload,
  type INeuralInterfaceStateChangedPayload,
  type IRetreatTriggeredPayload,
  type IUnitEjectedPayload,
  type IUnitRetreatedPayload,
  type IWithdrawalDeclaredPayload,
  type MoraleLevel,
} from '@/types/gameplay';

import { updateUnitState } from './unitStatePatch';

export function applyRetreatTriggered(
  state: IGameState,
  payload: IRetreatTriggeredPayload,
): IGameState {
  return updateUnitState(state, payload.unitId, (unit) =>
    unit.isRetreating
      ? undefined
      : {
          ...unit,
          isRetreating: true,
          retreatTargetEdge: payload.edge,
        },
  );
}

export function applyUnitRetreated(
  state: IGameState,
  payload: IUnitRetreatedPayload,
): IGameState {
  return updateUnitState(state, payload.unitId, (unit) =>
    unit.hasRetreated
      ? undefined
      : {
          ...unit,
          hasRetreated: true,
        },
  );
}

export function applyUnitEjected(
  state: IGameState,
  payload: IUnitEjectedPayload,
): IGameState {
  return updateUnitState(state, payload.unitId, (unit) =>
    unit.hasEjected
      ? undefined
      : {
          ...unit,
          hasEjected: true,
          lockState: LockState.Resolved,
          pendingAction: undefined,
        },
  );
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
    unit.isWithdrawing
      ? undefined
      : {
          ...unit,
          isWithdrawing: true,
          retreatTargetEdge: payload.edge,
        },
  );
}
