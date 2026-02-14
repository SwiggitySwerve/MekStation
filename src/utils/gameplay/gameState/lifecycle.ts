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

  return {
    ...state,
    status: GameStatus.Setup,
    units,
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
