import {
  GamePhase,
  GameStatus,
  IGameCreatedPayload,
  IGameEndedPayload,
  IGameStartedPayload,
  IGameState,
  IUnitGameState,
} from '@/types/gameplay';

import { buildConservativeC3NetworkStateFromUnits } from '../c3Network';
import { createInitialUnitState, deployPlacementsFor } from './initialization';

/**
 * Seeds every GameCreated unit at the placement deployPlacementsFor
 * returns for it (the deploy hex and facing), then copies the payload's
 * objectives, ground objects, minefields and C3 network onto the state.
 */
export function applyGameCreated(
  state: IGameState,
  payload: IGameCreatedPayload,
): IGameState {
  const units: Record<string, IUnitGameState> = {};
  const placements = deployPlacementsFor(payload.units);

  payload.units.forEach((unit, index) => {
    const { position, facing } = placements[index];
    units[unit.id] = createInitialUnitState(unit, position, facing);
  });

  const automaticC3Network = buildConservativeC3NetworkStateFromUnits(units);

  return {
    ...state,
    status: GameStatus.Setup,
    units,
    // Per `add-scenario-objective-engine`: seed the objective map from
    // the GameCreated payload so the derived state carries objectives
    // from sequence 0. Absent → markerless (destruction-only) scenario.
    ...(payload.objectives !== undefined
      ? { objectives: { ...payload.objectives } }
      : {}),
    ...(payload.groundObjects !== undefined
      ? { groundObjects: { ...payload.groundObjects } }
      : {}),
    ...(payload.minefields !== undefined
      ? { minefields: { ...payload.minefields } }
      : {}),
    ...(payload.c3Network !== undefined || automaticC3Network !== undefined
      ? { c3Network: payload.c3Network ?? automaticC3Network }
      : {}),
  };
}

export function applyGameStarted(
  state: IGameState,
  payload: IGameStartedPayload,
): IGameState {
  return {
    ...state,
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Initiative,
    firstMover: payload.firstSide,
    turnEvents: [],
  };
}

export function applyGameEnded(
  state: IGameState,
  payload: IGameEndedPayload,
): IGameState {
  return {
    ...state,
    status: GameStatus.Completed,
    result: {
      winner: payload.winner,
      reason: payload.reason,
    },
  };
}
