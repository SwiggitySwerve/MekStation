import type {
  IDamageAppliedPayload,
  IUnitDestroyedPayload,
} from '../../types/gameplay/GameSessionInterfaces';
import type { IParticipant, ISimulationRunResult } from '../runner/types';
import type {
  MutableChassisMatchup,
  MutableUnitPerformanceAcc,
} from './swarmAccumulatorTypes';

import { GameEventType } from '../../types/gameplay/GameSessionInterfaces';
import { tallyCombatFidelityForRun } from './combatFidelityTally';
import {
  ensureKey,
  winningSideId,
  groupBySide,
} from './swarmAccumulatorHelpers';

// =============================================================================
// Base rollup accumulators (damageMatrix, killCredits, unitPerformance)
// =============================================================================

/**
 * Accumulate the base rollups from a single run's event stream.
 * These rollups run regardless of schemaVersion.
 */
export function accumulateBaseRollups(
  result: ISimulationRunResult,
  damageMatrix: Record<string, Record<string, number>>,
  killCredits: Record<string, number>,
  unitPerformance: Record<string, MutableUnitPerformanceAcc>,
): void {
  const winner = result.winner;
  const unitIds = new Set<string>();

  for (const event of result.events) {
    if (event.type === GameEventType.DamageApplied) {
      const payload = event.payload as IDamageAppliedPayload;
      const targetId = payload.unitId;
      const sourceId = payload.sourceUnitId;
      unitIds.add(targetId);

      if (sourceId !== undefined) {
        unitIds.add(sourceId);
        const row = ensureKey<Record<string, number>>(
          damageMatrix,
          sourceId,
          () => ({}),
        );
        row[targetId] = (row[targetId] ?? 0) + payload.damage;
      }
    }

    if (event.type === GameEventType.UnitDestroyed) {
      const payload = event.payload as IUnitDestroyedPayload;
      unitIds.add(payload.unitId);
      if (payload.killerUnitId !== undefined) {
        unitIds.add(payload.killerUnitId);
        killCredits[payload.killerUnitId] =
          (killCredits[payload.killerUnitId] ?? 0) + 1;
      }
    }
  }

  // Per-unit damage dealt this run, summed across the matrix rows
  const damageByUnit: Record<string, number> = {};
  for (const [sourceId, targets] of Object.entries(damageMatrix)) {
    for (const dmg of Object.values(targets)) {
      damageByUnit[sourceId] = (damageByUnit[sourceId] ?? 0) + dmg;
    }
  }

  for (const unitId of Array.from(unitIds)) {
    const acc = ensureKey(unitPerformance, unitId, () => ({
      wins: 0,
      losses: 0,
      draws: 0,
      totalDamageDealt: 0,
    }));

    // Side association requires participants payload (handled in v2 path).
    // Base rollup conservatively records draws only when the run was a draw.
    if (winner === 'draw') {
      acc.draws++;
    }

    acc.totalDamageDealt += damageByUnit[unitId] ?? 0;
  }
}

// =============================================================================
// Schema-v2 rollup accumulators
// =============================================================================

/**
 * Empty `MutableChassisMatchup` factory — kept centralized so any new
 * fields added to the accumulator (Phase 5 added five combat-fidelity
 * totals + a runCount) get initialized in one place rather than at
 * each `ensureKey` call site.
 */
function emptyChassisMatchup(): MutableChassisMatchup {
  return {
    wins: 0,
    losses: 0,
    draws: 0,
    totalCriticalsLanded: 0,
    totalComponentsDestroyed: 0,
    totalAmmoExplosions: 0,
    totalShutdowns: 0,
    totalFalls: 0,
    runCount: 0,
  };
}

/**
 * Accumulate chassisMatrix for one run.
 *
 * Counting rule (per spec §"Multi-unit forces produce N×M cells per run"):
 *   Each UNIQUE chassis on side A is paired with each UNIQUE chassis on side B —
 *   one increment per unique-chassis-pair, regardless of how many unit instances
 *   of that chassis appear on each side.
 *
 * Phase 5 extension (per `combat-analytics` delta — "Per-Chassis
 * Aggregation Surfaces Combat Fidelity Metrics"): each cell additionally
 * accumulates per-run totals for criticals / components destroyed /
 * ammo explosions / shutdowns / falls, divided by `runCount` in the
 * freeze step to produce the per-record averages. The same per-run
 * totals are added to BOTH mirror cells (CA→CB and CB→CA) so the
 * matrix stays symmetric.
 */
export function accumulateChassisMatrix(
  participants: readonly IParticipant[],
  result: ISimulationRunResult,
  matrixAcc: Record<string, Record<string, MutableChassisMatchup>>,
): void {
  const winner = result.winner;
  const bySide = groupBySide(participants);
  const sideIds = Object.keys(bySide);
  if (sideIds.length !== 2) return;

  const [sideAId] = sideIds as [string, string];
  const winningSide = winningSideId(winner, participants);
  const fidelity = tallyCombatFidelityForRun(result);

  const chassisA = Array.from(
    new Set(bySide[sideIds[0]!]!.map((p) => p.chassisId)),
  );
  const chassisB = Array.from(
    new Set(bySide[sideIds[1]!]!.map((p) => p.chassisId)),
  );

  for (const ca of chassisA) {
    for (const cb of chassisB) {
      const rowCA = ensureKey<Record<string, MutableChassisMatchup>>(
        matrixAcc,
        ca,
        () => ({}),
      );
      const cellCA = ensureKey(rowCA, cb, emptyChassisMatchup);

      const rowCB = ensureKey<Record<string, MutableChassisMatchup>>(
        matrixAcc,
        cb,
        () => ({}),
      );
      const cellCB = ensureKey(rowCB, ca, emptyChassisMatchup);

      if (winner === 'draw' || winningSide === null) {
        cellCA.draws++;
        cellCB.draws++;
      } else if (winningSide === sideAId) {
        cellCA.wins++;
        cellCB.losses++;
      } else {
        cellCA.losses++;
        cellCB.wins++;
      }

      // Per-run combat-fidelity totals — added to BOTH mirror cells so
      // averages stay symmetric. `runCount` increments once per cell per
      // run; the freeze step uses it as the denominator for the five
      // *Avg fields.
      cellCA.totalCriticalsLanded += fidelity.criticals;
      cellCA.totalComponentsDestroyed += fidelity.components;
      cellCA.totalAmmoExplosions += fidelity.ammoExplosions;
      cellCA.totalShutdowns += fidelity.shutdowns;
      cellCA.totalFalls += fidelity.falls;
      cellCA.runCount++;

      cellCB.totalCriticalsLanded += fidelity.criticals;
      cellCB.totalComponentsDestroyed += fidelity.components;
      cellCB.totalAmmoExplosions += fidelity.ammoExplosions;
      cellCB.totalShutdowns += fidelity.shutdowns;
      cellCB.totalFalls += fidelity.falls;
      cellCB.runCount++;
    }
  }
}
