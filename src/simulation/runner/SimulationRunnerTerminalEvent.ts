import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameEndedPayload,
  type IGameEvent,
  type IGameState,
} from '@/types/gameplay';
import { evaluateObjectiveOutcome } from '@/utils/gameplay/objectives/objectiveEngine';

import { createGameEvent } from './phases/utils';

type RunnerWinner = 'player' | 'opponent' | 'draw' | null;

function toGameEndedWinner(winner: RunnerWinner): GameSide | 'draw' {
  if (winner === 'player') return GameSide.Player;
  if (winner === 'opponent') return GameSide.Opponent;
  return 'draw';
}

function hasOperableUnit(state: IGameState, side: GameSide): boolean {
  return Object.values(state.units).some(
    (unit) =>
      unit.side === side &&
      !unit.destroyed &&
      !unit.hasRetreated &&
      !unit.hasEjected &&
      unit.pilotConscious !== false,
  );
}

function determineGameEndedReason(options: {
  readonly state: IGameState;
  readonly turnLimit: number;
  readonly haltedByCriticalAnomaly: boolean;
}): IGameEndedPayload['reason'] {
  const { state, turnLimit, haltedByCriticalAnomaly } = options;
  if (haltedByCriticalAnomaly) return 'aborted';

  const objectiveOutcome = evaluateObjectiveOutcome(state, turnLimit);
  const hasScenarioObjectives =
    state.objectives !== undefined && Object.keys(state.objectives).length > 0;
  if (objectiveOutcome !== null && hasScenarioObjectives) return 'objective';

  const playerOperable = hasOperableUnit(state, GameSide.Player);
  const opponentOperable = hasOperableUnit(state, GameSide.Opponent);
  if (!playerOperable || !opponentOperable) return 'destruction';

  return 'turn_limit';
}

export function appendRunnerGameEndedEvent(options: {
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly state: IGameState;
  readonly turnLimit: number;
  readonly winner: RunnerWinner;
  readonly haltedByCriticalAnomaly: boolean;
}): void {
  const { events, gameId, state, turnLimit, winner, haltedByCriticalAnomaly } =
    options;
  if (events.some((event) => event.type === GameEventType.GameEnded)) return;

  const payload: IGameEndedPayload = {
    winner: toGameEndedWinner(winner),
    reason: determineGameEndedReason({
      state,
      turnLimit,
      haltedByCriticalAnomaly,
    }),
    turns: state.turn,
  };

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.GameEnded,
      state.turn,
      state.phase ?? GamePhase.End,
      payload,
    ),
  );
}
