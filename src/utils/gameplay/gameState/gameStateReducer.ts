import {
  GameSide,
  GameStatus,
  type IGameConfig,
  type IGameEvent,
  type IGameState,
  type IUnitGameState,
  LockState,
} from '@/types/gameplay';
import { evaluateObjectiveOutcome } from '@/utils/gameplay/objectives/objectiveEngine';

import { applyEvent } from './eventDispatch';
import {
  createInitialGameState,
  createInitialUnitState,
} from './initialization';

export { applyEvent };

export function deriveState(
  gameId: string,
  events: readonly IGameEvent[],
): IGameState {
  let state = createInitialGameState(gameId);

  for (const event of events) {
    state = applyEvent(state, event);
  }

  return state;
}

export function deriveStateAtSequence(
  gameId: string,
  events: readonly IGameEvent[],
  sequence: number,
): IGameState {
  const eventsUpTo = events.filter((event) => event.sequence <= sequence);
  return deriveState(gameId, eventsUpTo);
}

export function deriveStateAtTurn(
  gameId: string,
  events: readonly IGameEvent[],
  turn: number,
): IGameState {
  const eventsUpTo = events.filter((event) => event.turn <= turn);
  return deriveState(gameId, eventsUpTo);
}

export function getActiveUnits(
  state: IGameState,
  side: GameSide,
): readonly IUnitGameState[] {
  return Object.values(state.units).filter(
    (unit) =>
      unit.side === side &&
      !unit.destroyed &&
      !unit.shutdown &&
      !unit.hasRetreated &&
      !unit.hasEjected &&
      unit.pilotConscious,
  );
}

export function getUnitsAwaitingAction(
  state: IGameState,
): readonly IUnitGameState[] {
  return Object.values(state.units).filter(
    (unit) =>
      !unit.destroyed &&
      !unit.shutdown &&
      !unit.hasRetreated &&
      !unit.hasEjected &&
      unit.pilotConscious &&
      unit.lockState === LockState.Pending,
  );
}

export function allUnitsLocked(state: IGameState): boolean {
  const activeUnits = Object.values(state.units).filter(
    (unit) =>
      !unit.destroyed &&
      !unit.shutdown &&
      !unit.hasRetreated &&
      !unit.hasEjected &&
      unit.pilotConscious,
  );

  return activeUnits.every(
    (unit) =>
      unit.lockState === LockState.Locked ||
      unit.lockState === LockState.Revealed ||
      unit.lockState === LockState.Resolved,
  );
}

export function isGameOver(state: IGameState): boolean {
  return (
    state.status === GameStatus.Completed ||
    state.status === GameStatus.Abandoned
  );
}

function getSurvivingUnitsForSide(
  state: IGameState,
  side: GameSide,
): readonly IUnitGameState[] {
  // Per `add-bot-retreat-behavior` § 7.4: a unit that has emitted
  // `UnitRetreated` (i.e., crossed a map edge during retreat) is
  // considered withdrawn and SHALL NOT count toward its side's
  // remaining-unit total — even though `destroyed` stays false so that
  // post-battle summaries can distinguish withdrawal from combat loss.
  return Object.values(state.units).filter(
    (unit) =>
      !unit.destroyed &&
      !unit.hasRetreated &&
      !unit.hasEjected &&
      unit.side === side,
  );
}

function countSurvivingUnits(state: IGameState, side: GameSide): number {
  return getSurvivingUnitsForSide(state, side).length;
}

function isSideEliminated(state: IGameState, side: GameSide): boolean {
  return countSurvivingUnits(state, side) === 0;
}

function determineWinnerByForces(state: IGameState): GameSide | 'draw' {
  const playerCount = countSurvivingUnits(state, GameSide.Player);
  const opponentCount = countSurvivingUnits(state, GameSide.Opponent);

  if (playerCount > opponentCount) {
    return GameSide.Player;
  }

  if (opponentCount > playerCount) {
    return GameSide.Opponent;
  }

  return 'draw';
}

export function checkVictoryConditions(
  state: IGameState,
  config: IGameConfig,
): GameSide | 'draw' | null {
  // Per `add-scenario-objective-engine` (design.md D4 / task 5): the
  // objective evaluator is consulted FIRST. When it decides a scenario
  // (Capture / Defend / Breakthrough — and a markerless map routed
  // through `destroy`) its outcome takes precedence over the
  // turn-limit draw below. `null` means undecided → fall through to
  // the destruction / turn-limit path so markerless scenarios still
  // end on elimination exactly as before.
  const objectiveOutcome = evaluateObjectiveOutcome(state, config.turnLimit);
  if (objectiveOutcome !== null) {
    return objectiveOutcome.winningSide;
  }

  const playerEliminated = isSideEliminated(state, GameSide.Player);
  const opponentEliminated = isSideEliminated(state, GameSide.Opponent);

  if (playerEliminated && opponentEliminated) {
    return 'draw';
  }

  if (playerEliminated) {
    return GameSide.Opponent;
  }

  if (opponentEliminated) {
    return GameSide.Player;
  }

  if (config.turnLimit > 0 && state.turn > config.turnLimit) {
    return determineWinnerByForces(state);
  }

  return null;
}

export { createInitialGameState, createInitialUnitState };
