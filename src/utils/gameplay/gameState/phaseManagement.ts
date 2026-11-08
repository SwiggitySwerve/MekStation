import {
  GamePhase,
  IGameEvent,
  IGameState,
  IInitiativeOrderSetPayload,
  IInitiativeRolledPayload,
  IPhaseChangedPayload,
  LockState,
} from '@/types/gameplay';
import { resetPerTurnMovementState } from '@/utils/gameplay/movement/perTurnMovementState';
import { resetPerTurnUnitFields } from '@/utils/gameplay/perTurnUnitFields';

export function applyPhaseChanged(
  state: IGameState,
  event: IGameEvent,
  payload: IPhaseChangedPayload,
): IGameState {
  const startsNextTurn =
    payload.toPhase === GamePhase.Initiative && event.turn > state.turn;
  const phaseState = startsNextTurn ? applyTurnStarted(state, event) : state;
  const units = { ...phaseState.units };
  for (const unitId of Object.keys(units)) {
    units[unitId] = {
      ...units[unitId],
      lockState: LockState.Pending,
      pendingAction: undefined,
      damageThisPhase: 0,
    };
  }

  if (payload.toPhase === GamePhase.Movement) {
    for (const unitId of Object.keys(units)) {
      units[unitId] = {
        ...resetPerTurnMovementState(units[unitId], {
          advanceBoosterCounters: false,
        }),
        isSpotting: false,
        spotTargetId: undefined,
      };
    }
  }

  return {
    ...phaseState,
    phase: payload.toPhase,
    activationIndex: 0,
    units,
    turnEvents: startsNextTurn
      ? phaseState.turnEvents
      : [...state.turnEvents, event],
  };
}

export function applyTurnStarted(
  state: IGameState,
  event: IGameEvent,
): IGameState {
  if (event.turn <= state.turn) return state;

  const units = { ...state.units };
  for (const unitId of Object.keys(units)) {
    // Per `wire-piloting-skill-rolls` task 1.3: clear any PSRs that
    // survived the prior turn's End phase (a defensive reset — the
    // End phase's `resolvePendingPSRs` should have drained them, but
    // if a caller advanced past End without resolving, a stale queue
    // would carry into a fresh turn). TW p.52: PSRs do not persist
    // across turn boundaries.
    units[unitId] = resetPerTurnUnitFields(units[unitId], {
      presence: 'explicit',
    });
  }

  return {
    ...state,
    turn: event.turn,
    phase: GamePhase.Initiative,
    activationIndex: 0,
    units,
    turnEvents: [event],
  };
}

export function applyInitiativeRolled(
  state: IGameState,
  payload: IInitiativeRolledPayload,
): IGameState {
  return {
    ...state,
    initiativeWinner: payload.winner,
    firstMover: payload.movesFirst,
  };
}

export function applyInitiativeOrderSet(
  state: IGameState,
  payload: IInitiativeOrderSetPayload,
): IGameState {
  return {
    ...state,
    initiativeWinner: payload.winner,
    firstMover: payload.firstMover,
    activationIndex: 0,
  };
}
