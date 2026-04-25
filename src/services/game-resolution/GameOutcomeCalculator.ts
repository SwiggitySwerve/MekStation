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
import { isTurnLimitDraw } from '@/utils/gameplay/gameSessionCore';
import { deriveState } from '@/utils/gameplay/gameState';

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
  readonly turnsPlayed: number;
  readonly durationMs: number;
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
    (u) => !u.destroyed && u.side === side,
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
 * to the OPPOSITE side of the unit that received it. Used by the
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
  winner: 'player' | 'opponent' | 'draw',
  reason: VictoryReason,
  playerSurviving: number,
  opponentSurviving: number,
): string {
  switch (reason) {
    case 'elimination':
      if (winner === 'player') {
        return `Victory! All enemy units destroyed. ${playerSurviving} units survived.`;
      } else {
        return `Defeat. All friendly units destroyed.`;
      }

    case 'mutual_destruction':
      return 'Mutual destruction. Both forces were annihilated.';

    case 'turn_limit':
      if (winner === 'draw') {
        return 'Turn limit reached. Damage within 5% tolerance — match is a draw.';
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

  // Calculate duration
  const startTime = new Date(startedAt).getTime();
  const endTime = new Date(endedAt).getTime();
  const durationMs = endTime - startTime;

  // Count units
  const playerSurviving = countSurvivingUnits(state, GameSide.Player);
  const opponentSurviving = countSurvivingUnits(state, GameSide.Opponent);
  const playerDestroyed = countDestroyedUnits(state, GameSide.Player);
  const opponentDestroyed = countDestroyedUnits(state, GameSide.Opponent);

  // Determine outcome
  const playerEliminated = playerSurviving === 0;
  const opponentEliminated = opponentSurviving === 0;

  let winner: 'player' | 'opponent' | 'draw';
  let reason: VictoryReason;

  if (playerEliminated && opponentEliminated) {
    // Both eliminated
    winner = 'draw';
    reason = 'mutual_destruction';
  } else if (opponentEliminated) {
    // Opponent eliminated
    winner = 'player';
    reason = 'elimination';
  } else if (playerEliminated) {
    // Player eliminated
    winner = 'opponent';
    reason = 'elimination';
  } else if (config.turnLimit > 0 && state.turn >= config.turnLimit) {
    // Turn limit reached. Per `add-victory-and-post-battle-summary`
    // design D3 + spec scenario "Turn limit with near-equal damage is
    // draw": tie-break by total damage dealt with a 5% tolerance.
    // Replaces the previous surviving-unit-count branch which
    // diverged from the spec.
    reason = 'turn_limit';
    const { playerDamageDealt, opponentDamageDealt } = sumDamageBySide(
      events,
      state.units,
    );
    if (isTurnLimitDraw(playerDamageDealt, opponentDamageDealt)) {
      // Within 5% (or both zero) → draw.
      winner = 'draw';
    } else if (playerDamageDealt > opponentDamageDealt) {
      winner = 'player';
    } else {
      winner = 'opponent';
    }
  } else {
    // Game ended for other reason (concede, objective, etc.)
    // Default to comparing survivors
    if (playerSurviving > opponentSurviving) {
      winner = 'player';
    } else if (opponentSurviving > playerSurviving) {
      winner = 'opponent';
    } else {
      winner = 'draw';
    }
    reason = 'objective'; // Default assumption
  }

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
            // Player dealt damage to opponent
            playerDamageDealt += payload.damage;
          } else {
            // Opponent dealt damage to player
            opponentDamageDealt += payload.damage;
          }
        }
        break;
      }

      case GameEventType.UnitDestroyed: {
        // Track kills by the unit that destroyed this one
        // Note: This would need the attacker info from the previous damage event
        // For now, we just count destroyed units (payload not used yet)
        const _payload = event.payload as IUnitDestroyedPayload;
        void _payload; // Intentionally unused until kill tracking is implemented
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
  const playerEliminated = isSideEliminated(state, GameSide.Player);
  const opponentEliminated = isSideEliminated(state, GameSide.Opponent);

  // Either side eliminated
  if (playerEliminated || opponentEliminated) {
    return true;
  }

  // Turn limit reached
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

  // Check turn limit
  if (config.turnLimit > 0 && state.turn >= config.turnLimit) {
    if (playerSurviving > opponentSurviving) {
      return 'player';
    } else if (opponentSurviving > playerSurviving) {
      return 'opponent';
    }
    return 'draw';
  }

  return null; // Game not over yet
}
