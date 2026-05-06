/**
 * MetricsCollector - Records and aggregates simulation statistics
 *
 * Per `add-combat-fidelity-suite` Phase 5 (`combat-analytics` delta):
 * `recordGame` parses the typed event log on each `ISimulationResult`
 * and populates the previously-stub fields (`playerUnitsStart`,
 * `playerUnitsEnd`, `opponentUnitsStart`, `opponentUnitsEnd`,
 * `totalDamageDealt`) plus the new combat-fidelity counters
 * (`criticalHitsLanded`, `componentDestroyedCount`, `ammoExplosions`,
 * `shutdowns`, `falls`, `pilotHits`).
 *
 * Side resolution: events use the runner's `player-N` / `opponent-N`
 * unit-id prefix to attribute a unitId to a side. This avoids a
 * dependency on `ISimulationRunResult.participants` (which is only set
 * on the schemaVersion-2 batch path) so the legacy single-run path
 * keeps producing populated metrics without a schema bump.
 */

import {
  GameEventType,
  IAmmoExplosionPayload,
  IComponentDestroyedPayload,
  ICriticalHitPayload,
  IDamageAppliedPayload,
  IGameEvent,
  IHeatEffectAppliedPayload,
  IPilotHitPayload,
  IUnitDestroyedPayload,
  IUnitFellPayload,
} from '@/types/gameplay/GameSessionInterfaces';

import { ISimulationResult } from '../core/types';
import { IAggregateMetrics, ISimulationMetrics } from './types';

/**
 * Side derivation from a runner unit id. Returns `null` for ids that
 * don't follow the canonical `player-` / `opponent-` prefix (e.g.,
 * test fixtures with synthetic ids); those units don't contribute to
 * either side's roster count.
 */
function sideFromUnitId(unitId: string): 'player' | 'opponent' | null {
  if (unitId.startsWith('player-')) return 'player';
  if (unitId.startsWith('opponent-')) return 'opponent';
  return null;
}

/**
 * Walk the event log once and produce all derived counters in a single
 * pass. Returns the populated subset of `ISimulationMetrics` so
 * `recordGame` can splice it onto the run-level fields.
 */
function deriveMetricsFromEvents(events: readonly IGameEvent[]): {
  playerUnits: Set<string>;
  opponentUnits: Set<string>;
  destroyedUnits: Set<string>;
  totalDamageDealtByPlayer: number;
  totalDamageDealtByOpponent: number;
  criticalHitsLanded: number;
  componentDestroyedCount: number;
  ammoExplosions: number;
  shutdowns: number;
  falls: number;
  pilotHits: number;
} {
  const playerUnits = new Set<string>();
  const opponentUnits = new Set<string>();
  const destroyedUnits = new Set<string>();
  let totalDamageDealtByPlayer = 0;
  let totalDamageDealtByOpponent = 0;
  let criticalHitsLanded = 0;
  let componentDestroyedCount = 0;
  let ammoExplosions = 0;
  let shutdowns = 0;
  let falls = 0;
  let pilotHits = 0;

  /**
   * Helper: register a unit id against its derived side. Called for
   * every payload that carries a `unitId` so the start counts reflect
   * every unit that participated in any event — not just damaged ones.
   */
  const registerUnit = (unitId: string | undefined): void => {
    if (unitId === undefined) return;
    const side = sideFromUnitId(unitId);
    if (side === 'player') playerUnits.add(unitId);
    else if (side === 'opponent') opponentUnits.add(unitId);
  };

  for (const event of events) {
    switch (event.type) {
      case GameEventType.DamageApplied: {
        const payload = event.payload as IDamageAppliedPayload;
        registerUnit(payload.unitId);
        registerUnit(payload.sourceUnitId);
        // Total damage is attributed to the SOURCE (attacker) side per
        // the spec scenario "Atlas-vs-Atlas mirror records non-zero
        // damage" — `totalDamageDealt.player` is the damage the player
        // dealt to opponent, not damage the player took.
        if (payload.sourceUnitId !== undefined) {
          const sourceSide = sideFromUnitId(payload.sourceUnitId);
          if (sourceSide === 'player') {
            totalDamageDealtByPlayer += payload.damage;
          } else if (sourceSide === 'opponent') {
            totalDamageDealtByOpponent += payload.damage;
          }
          // Self-damage (ammo cookoff, falls) carries an undefined
          // sourceUnitId and is intentionally NOT counted as offensive
          // damage by either side.
        }
        break;
      }

      case GameEventType.UnitDestroyed: {
        const payload = event.payload as IUnitDestroyedPayload;
        registerUnit(payload.unitId);
        registerUnit(payload.killerUnitId);
        destroyedUnits.add(payload.unitId);
        break;
      }

      case GameEventType.CriticalHit: {
        const payload = event.payload as ICriticalHitPayload;
        registerUnit(payload.unitId);
        registerUnit(payload.sourceUnitId);
        // Per P3 emission convention each `CriticalHit` event carries
        // `count: 1` (one event per resolved slot). When `count` is
        // omitted (legacy session-side emitters), default to 1.
        criticalHitsLanded += payload.count ?? 1;
        break;
      }

      case GameEventType.ComponentDestroyed: {
        const payload = event.payload as IComponentDestroyedPayload;
        registerUnit(payload.unitId);
        componentDestroyedCount++;
        break;
      }

      case GameEventType.AmmoExplosion: {
        const payload = event.payload as IAmmoExplosionPayload;
        registerUnit(payload.unitId);
        ammoExplosions++;
        break;
      }

      case GameEventType.HeatEffectApplied: {
        const payload = event.payload as IHeatEffectAppliedPayload;
        registerUnit(payload.unitId);
        // Per `IHeatEffectAppliedPayload.effect` doc-comment: `'shutdown'`
        // is the auto-shutdown band (heat ≥ 30); `'shutdown_check'` is
        // the avoidable band (heat ≥ 14). The spec scenario "Game with
        // shutdowns records the count" specifies SHUTDOWNS — units that
        // actually shut down — so we count `'shutdown'` only. Failed
        // avoidance rolls during `'shutdown_check'` surface via the
        // separate `ShutdownCheck` event but we do not double-count
        // them here; the audit trail for failed checks lives at the
        // event-log level.
        if (payload.effect === 'shutdown') {
          shutdowns++;
        }
        break;
      }

      case GameEventType.UnitFell: {
        const payload = event.payload as IUnitFellPayload;
        registerUnit(payload.unitId);
        falls++;
        break;
      }

      case GameEventType.PilotHit: {
        const payload = event.payload as IPilotHitPayload;
        registerUnit(payload.unitId);
        pilotHits++;
        break;
      }

      default: {
        // Other event types still register their unitId when the
        // payload carries one — keeps `playerUnitsStart` /
        // `opponentUnitsStart` complete even when a unit only appears
        // in lifecycle / movement events. The cast is safe because we
        // narrow by the optional shape rather than by the discriminated
        // union member.
        const payload = event.payload as { readonly unitId?: string };
        if (typeof payload.unitId === 'string') {
          registerUnit(payload.unitId);
        }
        if (event.actorId !== undefined) {
          registerUnit(event.actorId);
        }
        break;
      }
    }
  }

  return {
    playerUnits,
    opponentUnits,
    destroyedUnits,
    totalDamageDealtByPlayer,
    totalDamageDealtByOpponent,
    criticalHitsLanded,
    componentDestroyedCount,
    ammoExplosions,
    shutdowns,
    falls,
    pilotHits,
  };
}

export class MetricsCollector {
  private games: ISimulationMetrics[] = [];

  recordGame(result: ISimulationResult): void {
    const derived = deriveMetricsFromEvents(result.events);

    const playerUnitsStart = derived.playerUnits.size;
    const opponentUnitsStart = derived.opponentUnits.size;

    // End count = start count - destroyed count for each side. We don't
    // intersect the destroyed set with the side set because every
    // UnitDestroyed.unitId is also passed through registerUnit, so the
    // destroyed unit is guaranteed to live in the appropriate side set
    // when its id carries the canonical prefix.
    let playerUnitsEnd = playerUnitsStart;
    let opponentUnitsEnd = opponentUnitsStart;
    // Array.from avoids ES5 Set-iteration downlevelIteration requirement —
    // the project tsconfig targets ES5 and downlevelIteration is off.
    for (const destroyedId of Array.from(derived.destroyedUnits)) {
      const side = sideFromUnitId(destroyedId);
      if (side === 'player') playerUnitsEnd--;
      else if (side === 'opponent') opponentUnitsEnd--;
    }

    const metrics: ISimulationMetrics = {
      seed: result.seed,
      timestamp: new Date().toISOString(),
      winner: result.winner,
      turns: result.turns,
      durationMs: result.durationMs,
      violations: [],
      playerUnitsStart,
      playerUnitsEnd,
      opponentUnitsStart,
      opponentUnitsEnd,
      totalDamageDealt: {
        player: derived.totalDamageDealtByPlayer,
        opponent: derived.totalDamageDealtByOpponent,
      },
      criticalHitsLanded: derived.criticalHitsLanded,
      componentDestroyedCount: derived.componentDestroyedCount,
      ammoExplosions: derived.ammoExplosions,
      shutdowns: derived.shutdowns,
      falls: derived.falls,
      pilotHits: derived.pilotHits,
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
      totalOpponentUnitsDestroyed +=
        game.opponentUnitsStart - game.opponentUnitsEnd;

      for (const violation of game.violations) {
        totalViolations++;
        violationsByType[violation.invariant] =
          (violationsByType[violation.invariant] || 0) + 1;

        if (violation.severity === 'critical') {
          criticalViolations++;
        } else {
          warningViolations++;
        }
      }
    }

    const totalGames = this.games.length;
    const completedGames = totalGames - incompleteGames;

    const playerWinRate =
      completedGames > 0 ? (playerWins / completedGames) * 100 : 0;
    const opponentWinRate =
      completedGames > 0 ? (opponentWins / completedGames) * 100 : 0;
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
