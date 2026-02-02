/**
 * MetricsCollector - Records and aggregates simulation statistics
 */

import { ISimulationResult } from '../core/types';
import { ISimulationMetrics, IAggregateMetrics } from './types';

export class MetricsCollector {
  private games: ISimulationMetrics[] = [];

  recordGame(result: ISimulationResult): void {
    const metrics: ISimulationMetrics = {
      seed: result.seed,
      timestamp: new Date().toISOString(),
      winner: result.winner,
      turns: result.turns,
      durationMs: result.durationMs,
      violations: [],
      playerUnitsStart: 0,
      playerUnitsEnd: 0,
      opponentUnitsStart: 0,
      opponentUnitsEnd: 0,
      totalDamageDealt: {
        player: 0,
        opponent: 0,
      },
    };

    this.games.push(metrics);
  }

  getMetrics(): ISimulationMetrics[] {
    return [...this.games];
  }

  getAggregate(): IAggregateMetrics {
    if (this.games.length === 0) {
      return {
        totalGames: 0,
        playerWins: 0,
        opponentWins: 0,
        draws: 0,
        incompleteGames: 0,
        avgTurns: 0,
        avgDurationMs: 0,
        avgPlayerUnitsDestroyed: 0,
        avgOpponentUnitsDestroyed: 0,
        totalViolations: 0,
        violationsByType: {},
        violationsBySeverity: {
          critical: 0,
          warning: 0,
        },
        playerWinRate: 0,
        opponentWinRate: 0,
        drawRate: 0,
      };
    }

    let playerWins = 0;
    let opponentWins = 0;
    let draws = 0;
    let incompleteGames = 0;
    let totalTurns = 0;
    let totalDurationMs = 0;
    let totalPlayerUnitsDestroyed = 0;
    let totalOpponentUnitsDestroyed = 0;
    let totalViolations = 0;
    const violationsByType: Record<string, number> = {};
    let criticalViolations = 0;
    let warningViolations = 0;

    for (const game of this.games) {
      if (game.winner === 'player') {
        playerWins++;
      } else if (game.winner === 'opponent') {
        opponentWins++;
      } else if (game.winner === 'draw') {
        draws++;
      } else {
        incompleteGames++;
      }

      totalTurns += game.turns;
      totalDurationMs += game.durationMs;
      totalPlayerUnitsDestroyed += game.playerUnitsStart - game.playerUnitsEnd;
      totalOpponentUnitsDestroyed += game.opponentUnitsStart - game.opponentUnitsEnd;

      for (const violation of game.violations) {
        totalViolations++;
        violationsByType[violation.invariant] = (violationsByType[violation.invariant] || 0) + 1;
        
        if (violation.severity === 'critical') {
          criticalViolations++;
        } else {
          warningViolations++;
        }
      }
    }

    const totalGames = this.games.length;
    const completedGames = totalGames - incompleteGames;

    const playerWinRate = completedGames > 0 ? (playerWins / completedGames) * 100 : 0;
    const opponentWinRate = completedGames > 0 ? (opponentWins / completedGames) * 100 : 0;
    const drawRate = completedGames > 0 ? (draws / completedGames) * 100 : 0;

    return {
      totalGames,
      playerWins,
      opponentWins,
      draws,
      incompleteGames,
      avgTurns: totalTurns / totalGames,
      avgDurationMs: totalDurationMs / totalGames,
      avgPlayerUnitsDestroyed: totalPlayerUnitsDestroyed / totalGames,
      avgOpponentUnitsDestroyed: totalOpponentUnitsDestroyed / totalGames,
      totalViolations,
      violationsByType,
      violationsBySeverity: {
        critical: criticalViolations,
        warning: warningViolations,
      },
      playerWinRate,
      opponentWinRate,
      drawRate,
    };
  }

  reset(): void {
    this.games = [];
  }
}
