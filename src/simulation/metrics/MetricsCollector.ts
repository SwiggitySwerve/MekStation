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

import { sideFromUnitId } from '../core/sideFromActor';
import { ISimulationResult } from '../core/types';
import { IAggregateMetrics, ISimulationMetrics } from './types';

/**
 * Per `add-event-log-query-and-unified-readable-format` (combat-analytics
 * delta): the canonical `sideFromUnitId` lookup lives at
 * `src/simulation/core/sideFromActor.ts` so consumers in
 * `src/simulation/core/` (e.g. `EventLogQuery`) can reuse it without
 * pulling the metrics module. Re-exported here so the documented
 * `MetricsCollector.sideFromUnitId` surface stays stable for downstream
 * consumers (specs, scenario tests, future UI replays).
 */
export { sideFromUnitId };

type DerivedEventMetrics = {
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
};

type EventMetricsRecorder = (
  event: IGameEvent,
  metrics: DerivedEventMetrics,
) => void;

function registerUnit(
  metrics: DerivedEventMetrics,
  unitId: string | undefined,
): void {
  if (unitId === undefined) return;
  const side = sideFromUnitId(unitId);
  if (side === 'player') metrics.playerUnits.add(unitId);
  else if (side === 'opponent') metrics.opponentUnits.add(unitId);
}

function recordDamageApplied(
  event: IGameEvent,
  metrics: DerivedEventMetrics,
): void {
  const payload = event.payload as IDamageAppliedPayload;
  registerUnit(metrics, payload.unitId);
  registerUnit(metrics, payload.sourceUnitId);
  if (payload.sourceUnitId === undefined) return;

  const sourceSide = sideFromUnitId(payload.sourceUnitId);
  if (sourceSide === 'player') {
    metrics.totalDamageDealtByPlayer += payload.damage;
  } else if (sourceSide === 'opponent') {
    metrics.totalDamageDealtByOpponent += payload.damage;
  }
}

function recordUnitDestroyed(
  event: IGameEvent,
  metrics: DerivedEventMetrics,
): void {
  const payload = event.payload as IUnitDestroyedPayload;
  registerUnit(metrics, payload.unitId);
  registerUnit(metrics, payload.killerUnitId);
  metrics.destroyedUnits.add(payload.unitId);
}

function recordCriticalHit(
  event: IGameEvent,
  metrics: DerivedEventMetrics,
): void {
  const payload = event.payload as ICriticalHitPayload;
  registerUnit(metrics, payload.unitId);
  registerUnit(metrics, payload.sourceUnitId);
  metrics.criticalHitsLanded += payload.count ?? 1;
}

function recordComponentDestroyed(
  event: IGameEvent,
  metrics: DerivedEventMetrics,
): void {
  const payload = event.payload as IComponentDestroyedPayload;
  registerUnit(metrics, payload.unitId);
  metrics.componentDestroyedCount++;
}

function recordAmmoExplosion(
  event: IGameEvent,
  metrics: DerivedEventMetrics,
): void {
  const payload = event.payload as IAmmoExplosionPayload;
  registerUnit(metrics, payload.unitId);
  metrics.ammoExplosions++;
}

function recordHeatEffectApplied(
  event: IGameEvent,
  metrics: DerivedEventMetrics,
): void {
  const payload = event.payload as IHeatEffectAppliedPayload;
  registerUnit(metrics, payload.unitId);
  if (payload.effect === 'shutdown') {
    metrics.shutdowns++;
  }
}

function recordUnitFell(event: IGameEvent, metrics: DerivedEventMetrics): void {
  const payload = event.payload as IUnitFellPayload;
  registerUnit(metrics, payload.unitId);
  metrics.falls++;
}

function recordPilotHit(event: IGameEvent, metrics: DerivedEventMetrics): void {
  const payload = event.payload as IPilotHitPayload;
  registerUnit(metrics, payload.unitId);
  metrics.pilotHits++;
}

function recordDefaultEvent(
  event: IGameEvent,
  metrics: DerivedEventMetrics,
): void {
  const payload = event.payload as { readonly unitId?: string };
  if (typeof payload.unitId === 'string') {
    registerUnit(metrics, payload.unitId);
  }
  if (event.actorId !== undefined) {
    registerUnit(metrics, event.actorId);
  }
}

const EVENT_METRIC_RECORDERS: Partial<
  Record<GameEventType, EventMetricsRecorder>
> = {
  [GameEventType.DamageApplied]: recordDamageApplied,
  [GameEventType.UnitDestroyed]: recordUnitDestroyed,
  [GameEventType.CriticalHit]: recordCriticalHit,
  [GameEventType.ComponentDestroyed]: recordComponentDestroyed,
  [GameEventType.AmmoExplosion]: recordAmmoExplosion,
  [GameEventType.HeatEffectApplied]: recordHeatEffectApplied,
  [GameEventType.UnitFell]: recordUnitFell,
  [GameEventType.PilotHit]: recordPilotHit,
};

/**
 * Walk the event log once and produce all derived counters in a single
 * pass. Returns the populated subset of `ISimulationMetrics` so
 * `recordGame` can splice it onto the run-level fields.
 */
function deriveMetricsFromEvents(
  events: readonly IGameEvent[],
): DerivedEventMetrics {
  const metrics: DerivedEventMetrics = {
    playerUnits: new Set<string>(),
    opponentUnits: new Set<string>(),
    destroyedUnits: new Set<string>(),
    totalDamageDealtByPlayer: 0,
    totalDamageDealtByOpponent: 0,
    criticalHitsLanded: 0,
    componentDestroyedCount: 0,
    ammoExplosions: 0,
    shutdowns: 0,
    falls: 0,
    pilotHits: 0,
  };

  for (const event of events) {
    const record = EVENT_METRIC_RECORDERS[event.type] ?? recordDefaultEvent;
    record(event, metrics);
  }

  return metrics;
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
