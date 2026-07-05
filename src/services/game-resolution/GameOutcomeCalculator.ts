/**
 * Game Outcome Calculator
 * Shared logic for calculating game outcomes across quick games and campaign games.
 * Extracts and centralizes victory determination logic.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 * @spec openspec/changes/add-victory-and-post-battle-summary/design.md (D3)
 */

import {
  IGameState,
  IGameEvent,
  GameEventType,
  GameSide,
  IGameConfig,
  IUnitGameState,
  IUnitDestroyedPayload,
  IDamageAppliedPayload,
} from '@/types/gameplay';
import { ScenarioObjectiveType } from '@/types/scenario/ScenarioInterfaces';
import { isTurnLimitDraw } from '@/utils/gameplay/gameSessionCore';
import { deriveState } from '@/utils/gameplay/gameState';
import { evaluateObjectiveOutcome } from '@/utils/gameplay/objectives/objectiveEngine';

// =============================================================================
// Types
// =============================================================================

/**
 * Reason for game ending.
 */
export type VictoryReason =
  | 'elimination'
  | 'mutual_destruction'
  | 'turn_limit'
  | 'objective'
  | 'concede'
  | 'timeout';

/**
 * Game outcome result.
 */
export interface IGameOutcome {
  readonly winner: 'player' | 'opponent' | 'draw';
  readonly reason: VictoryReason;
  readonly description: string;
  readonly playerUnitsDestroyed: number;
  readonly opponentUnitsDestroyed: number;
  readonly playerUnitsSurviving: number;
  readonly opponentUnitsSurviving: number;
  readonly playerDamageDealt: number;
  readonly opponentDamageDealt: number;
  readonly turnsPlayed: number;
  readonly durationMs: number;
}

type OutcomeWinner = IGameOutcome['winner'];

interface IOutcomeDecision {
  readonly winner: OutcomeWinner;
  readonly reason: VictoryReason;
}

/**
 * Combat statistics extracted from game events.
 */
export interface ICombatStats {
  readonly playerDamageDealt: number;
  readonly opponentDamageDealt: number;
  readonly killsByUnit: Record<string, string[]>;
  readonly criticalHits: number;
}

/**
 * Input for calculating game outcome.
 */
export interface IOutcomeCalculationInput {
  readonly state: IGameState;
  readonly events: readonly IGameEvent[];
  readonly config: IGameConfig;
  readonly startedAt: string;
  readonly endedAt: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function countSurvivingUnits(state: IGameState, side: GameSide): number {
  return Object.values(state.units).filter(
    (u) => !u.destroyed && !u.hasRetreated && !u.hasEjected && u.side === side,
  ).length;
}

function countDestroyedUnits(state: IGameState, side: GameSide): number {
  return Object.values(state.units).filter(
    (u) => u.destroyed && u.side === side,
  ).length;
}

function isSideEliminated(state: IGameState, side: GameSide): boolean {
  return countSurvivingUnits(state, side) === 0;
}

/**
 * Per `add-victory-and-post-battle-summary` design D3: sum total damage
 * dealt by each side from `DamageApplied` events. Damage is attributed
 * to the opposite side of the unit that received it. Used by the
 * turn-limit tie-break which compares total damage between sides.
 */
function sumDamageBySide(
  events: readonly IGameEvent[],
  units: Record<string, IUnitGameState>,
): { playerDamageDealt: number; opponentDamageDealt: number } {
  let playerDamageDealt = 0;
  let opponentDamageDealt = 0;
  for (const event of events) {
    if (event.type !== GameEventType.DamageApplied) continue;
    const payload = event.payload as IDamageAppliedPayload;
    const target = units[payload.unitId];
    if (!target) continue;
    if (target.side === GameSide.Opponent) {
      playerDamageDealt += payload.damage;
    } else if (target.side === GameSide.Player) {
      opponentDamageDealt += payload.damage;
    }
  }
  return { playerDamageDealt, opponentDamageDealt };
}

function generateVictoryDescription(
  winner: OutcomeWinner,
  reason: VictoryReason,
  playerSurviving: number,
  opponentSurviving: number,
): string {
  switch (reason) {
    case 'elimination':
      if (winner === 'player') {
        return `Victory! All enemy units destroyed or exited combat. ${playerSurviving} units survived.`;
      } else {
        return `Defeat. All friendly units destroyed or exited combat.`;
      }

    case 'mutual_destruction':
      return 'Mutual destruction. Both forces were annihilated.';

    case 'turn_limit':
      if (winner === 'draw') {
        return 'Turn limit reached. Damage within 5% tolerance - match is a draw.';
      } else if (winner === 'player') {
        return `Victory! Turn limit reached with ${playerSurviving} vs ${opponentSurviving} units surviving (player dealt more damage).`;
      } else {
        return `Defeat. Turn limit reached with ${playerSurviving} vs ${opponentSurviving} units surviving (opponent dealt more damage).`;
      }

    case 'objective':
      if (winner === 'player') {
        return 'Victory! Objective completed.';
      } else {
        return 'Defeat. Enemy completed their objective.';
      }

    case 'concede':
      if (winner === 'player') {
        return 'Victory! Enemy forces withdrew.';
      } else {
        return 'Player conceded the battle.';
      }

    case 'timeout':
      return 'Game timed out. No winner determined.';

    default:
      return 'Game ended.';
  }
}

function objectiveOutcomeDecision(
  state: IGameState,
  turnLimit: number,
): IOutcomeDecision | null {
  const objectiveOutcome = evaluateObjectiveOutcome(state, turnLimit);
  if (
    objectiveOutcome === null ||
    objectiveOutcome.objectiveType === ScenarioObjectiveType.Destroy
  ) {
    return null;
  }

  return {
    winner:
      objectiveOutcome.winningSide === GameSide.Player ? 'player' : 'opponent',
    reason: 'objective',
  };
}

function eliminationOutcomeDecision(
  playerEliminated: boolean,
  opponentEliminated: boolean,
): IOutcomeDecision | null {
  if (playerEliminated && opponentEliminated) {
    return { winner: 'draw', reason: 'mutual_destruction' };
  }

  if (opponentEliminated) {
    return { winner: 'player', reason: 'elimination' };
  }

  if (playerEliminated) {
    return { winner: 'opponent', reason: 'elimination' };
  }

  return null;
}

function turnLimitOutcomeDecision(
  state: IGameState,
  events: readonly IGameEvent[],
  turnLimit: number,
): IOutcomeDecision | null {
  if (turnLimit <= 0 || state.turn < turnLimit) {
    return null;
  }

  const { playerDamageDealt, opponentDamageDealt } = sumDamageBySide(
    events,
    state.units,
  );
  if (isTurnLimitDraw(playerDamageDealt, opponentDamageDealt)) {
    return { winner: 'draw', reason: 'turn_limit' };
  }

  return {
    winner: playerDamageDealt > opponentDamageDealt ? 'player' : 'opponent',
    reason: 'turn_limit',
  };
}

function survivorComparisonOutcomeDecision(
  playerSurviving: number,
  opponentSurviving: number,
): IOutcomeDecision {
  if (playerSurviving > opponentSurviving) {
    return { winner: 'player', reason: 'objective' };
  }

  if (opponentSurviving > playerSurviving) {
    return { winner: 'opponent', reason: 'objective' };
  }

  return { winner: 'draw', reason: 'objective' };
}

// =============================================================================
// Main Calculator
// =============================================================================

/**
 * Calculate game outcome from state and events.
 * This is the primary entry point for determining game results.
 */
export function calculateGameOutcome(
  input: IOutcomeCalculationInput,
): IGameOutcome {
  const { state, events, config, startedAt, endedAt } = input;

  const startTime = new Date(startedAt).getTime();
  const endTime = new Date(endedAt).getTime();
  const durationMs = endTime - startTime;

  const playerSurviving = countSurvivingUnits(state, GameSide.Player);
  const opponentSurviving = countSurvivingUnits(state, GameSide.Opponent);
  const playerDestroyed = countDestroyedUnits(state, GameSide.Player);
  const opponentDestroyed = countDestroyedUnits(state, GameSide.Opponent);
  const playerEliminated = playerSurviving === 0;
  const opponentEliminated = opponentSurviving === 0;
  const { playerDamageDealt, opponentDamageDealt } = sumDamageBySide(
    events,
    state.units,
  );

  // Objective wins are evaluated before destruction and turn-limit paths.
  // Markerless destroy scenarios fall through to the richer elimination labels.
  const decision =
    objectiveOutcomeDecision(state, config.turnLimit) ??
    eliminationOutcomeDecision(playerEliminated, opponentEliminated) ??
    turnLimitOutcomeDecision(state, events, config.turnLimit) ??
    survivorComparisonOutcomeDecision(playerSurviving, opponentSurviving);
  const { winner, reason } = decision;

  const description = generateVictoryDescription(
    winner,
    reason,
    playerSurviving,
    opponentSurviving,
  );

  return {
    winner,
    reason,
    description,
    playerUnitsDestroyed: playerDestroyed,
    opponentUnitsDestroyed: opponentDestroyed,
    playerUnitsSurviving: playerSurviving,
    opponentUnitsSurviving: opponentSurviving,
    playerDamageDealt,
    opponentDamageDealt,
    turnsPlayed: state.turn,
    durationMs,
  };
}

/**
 * Calculate outcome directly from events (derives state internally).
 */
export function calculateOutcomeFromEvents(
  gameId: string,
  events: readonly IGameEvent[],
  config: IGameConfig,
  startedAt: string,
  endedAt: string,
): IGameOutcome {
  const state = deriveState(gameId, events);
  return calculateGameOutcome({
    state,
    events,
    config,
    startedAt,
    endedAt,
  });
}

/**
 * Calculate combat statistics from events.
 */
export function calculateCombatStats(
  events: readonly IGameEvent[],
  units: Record<string, IUnitGameState>,
): ICombatStats {
  let playerDamageDealt = 0;
  let opponentDamageDealt = 0;
  const killsByUnit: Record<string, string[]> = {};
  let criticalHits = 0;

  for (const event of events) {
    switch (event.type) {
      case GameEventType.DamageApplied: {
        const payload = event.payload as { unitId: string; damage: number };
        const targetUnit = units[payload.unitId];
        if (targetUnit) {
          if (targetUnit.side === GameSide.Opponent) {
            playerDamageDealt += payload.damage;
          } else {
            opponentDamageDealt += payload.damage;
          }
        }
        break;
      }

      case GameEventType.UnitDestroyed: {
        const _payload = event.payload as IUnitDestroyedPayload;
        void _payload; // Intentionally unused until kill tracking is implemented.
        break;
      }

      case GameEventType.CriticalHit: {
        criticalHits++;
        break;
      }
    }
  }

  return {
    playerDamageDealt,
    opponentDamageDealt,
    killsByUnit,
    criticalHits,
  };
}

/**
 * Check if a game has ended based on current state.
 */
export function isGameEnded(state: IGameState, config: IGameConfig): boolean {
  // Per `add-scenario-objective-engine` (task 5): an objective win
  // ends the game even with units alive on both sides.
  if (evaluateObjectiveOutcome(state, config.turnLimit) !== null) {
    return true;
  }

  const playerEliminated = isSideEliminated(state, GameSide.Player);
  const opponentEliminated = isSideEliminated(state, GameSide.Opponent);

  if (playerEliminated || opponentEliminated) {
    return true;
  }

  if (config.turnLimit > 0 && state.turn >= config.turnLimit) {
    return true;
  }

  return false;
}

/**
 * Determine the winning side (without full outcome calculation).
 */
export function determineWinner(
  state: IGameState,
  config: IGameConfig,
): 'player' | 'opponent' | 'draw' | null {
  // Per `add-scenario-objective-engine` (task 5): consult the objective
  // evaluator first so an objective win is reported even while units
  // survive on both sides.
  const objectiveOutcome = evaluateObjectiveOutcome(state, config.turnLimit);
  if (objectiveOutcome !== null) {
    return objectiveOutcome.winningSide === GameSide.Player
      ? 'player'
      : 'opponent';
  }

  const playerSurviving = countSurvivingUnits(state, GameSide.Player);
  const opponentSurviving = countSurvivingUnits(state, GameSide.Opponent);

  const playerEliminated = playerSurviving === 0;
  const opponentEliminated = opponentSurviving === 0;

  if (playerEliminated && opponentEliminated) {
    return 'draw';
  }

  if (opponentEliminated) {
    return 'player';
  }

  if (playerEliminated) {
    return 'opponent';
  }

  if (config.turnLimit > 0 && state.turn >= config.turnLimit) {
    if (playerSurviving > opponentSurviving) {
      return 'player';
    } else if (opponentSurviving > playerSurviving) {
      return 'opponent';
    }
    return 'draw';
  }

  return null;
}
