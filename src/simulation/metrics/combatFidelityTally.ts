/**
 * Per-run combat-fidelity tallier — extracted from
 * `swarmAggregation.internals.ts` to keep that file under the 400-line
 * max-lines lint cap. Pure function with no state.
 *
 * Spec contract:
 *   `combat-analytics/spec.md` — "Per-Chassis Aggregation Surfaces
 *   Combat Fidelity Metrics"
 *
 * Counters returned here flow into the chassisMatrix per-cell averages
 * during `accumulateChassisMatrix` — one tally per run, applied to
 * every matchup cell that participated in the run.
 */

import type {
  ICriticalHitPayload,
  IHeatEffectAppliedPayload,
} from '../../types/gameplay/GameSessionInterfaces';
import type { ISimulationRunResult } from '../runner/types';

import { GameEventType } from '../../types/gameplay/GameSessionInterfaces';

/**
 * Per-run combat-fidelity totals. The caller adds these onto each
 * matchup cell that participated in the run (so a 1v1 run adds the
 * same totals to one mirror cell pair; an N×M run to N×M pairs).
 */
export interface ICombatFidelityRunTally {
  criticals: number;
  components: number;
  ammoExplosions: number;
  shutdowns: number;
  falls: number;
}

/**
 * Walk the run's event log once and tally the per-run combat-fidelity
 * counters. Mirrors the categorization in `MetricsCollector.recordGame`
 * so the per-game and per-chassis-matchup rollups derive from the same
 * event-type accounting.
 */
export function tallyCombatFidelityForRun(
  result: ISimulationRunResult,
): ICombatFidelityRunTally {
  let criticals = 0;
  let components = 0;
  let ammoExplosions = 0;
  let shutdowns = 0;
  let falls = 0;

  for (const event of result.events) {
    switch (event.type) {
      case GameEventType.CriticalHit: {
        const payload = event.payload as ICriticalHitPayload;
        // Per P3 emission convention: one event per resolved slot with
        // `count: 1`. Default to 1 when omitted (legacy emitters).
        criticals += payload.count ?? 1;
        break;
      }
      case GameEventType.ComponentDestroyed:
        components++;
        break;
      case GameEventType.AmmoExplosion:
        ammoExplosions++;
        break;
      case GameEventType.HeatEffectApplied: {
        const payload = event.payload as IHeatEffectAppliedPayload;
        if (payload.effect === 'shutdown') {
          shutdowns++;
        }
        break;
      }
      case GameEventType.UnitFell:
        falls++;
        break;
    }
  }

  return { criticals, components, ammoExplosions, shutdowns, falls };
}
