import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  IGameCreatedPayload,
  IGameEndedPayload,
  IGameStartedPayload,
  IGameState,
  IHexCoordinate,
  IUnitGameState,
} from '@/types/gameplay';

import { buildConservativeC3NetworkStateFromUnits } from '../c3Network';
import {
  createInitialUnitState,
  OPPONENT_DEPLOY_ROW,
  PLAYER_DEPLOY_ROW,
} from './initialization';

export function applyGameCreated(
  state: IGameState,
  payload: IGameCreatedPayload,
): IGameState {
  const units: Record<string, IUnitGameState> = {};
  let playerIndex = 0;
  let opponentIndex = 0;

  for (const unit of payload.units) {
    const isPlayer = unit.side === GameSide.Player;
    const col = isPlayer ? playerIndex++ : opponentIndex++;
    const row = isPlayer ? PLAYER_DEPLOY_ROW : OPPONENT_DEPLOY_ROW;

    const position: IHexCoordinate = { q: col - 2, r: row };
    const facing = isPlayer ? Facing.North : Facing.South;

    units[unit.id] = createInitialUnitState(unit, position, facing);
  }

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
