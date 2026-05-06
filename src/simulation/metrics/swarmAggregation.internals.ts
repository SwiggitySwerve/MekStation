/**
 * Swarm Aggregation — Internal accumulator helpers (Phase 6).
 *
 * Extracted into a leaf module so the main `swarmAggregation.ts` entry point
 * stays under the 400-line max-lines lint cap. Functions here are private to
 * the aggregation pipeline (not re-exported from `metrics/index.ts`).
 */

import type {
  IDamageAppliedPayload,
  IPilotHitPayload,
  IUnitDestroyedPayload,
} from '../../types/gameplay/GameSessionInterfaces';
import type { IParticipant, ISimulationRunResult } from '../runner/types';
import type { GunneryBracket } from './swarmAggregation.types';

import { GameEventType } from '../../types/gameplay/GameSessionInterfaces';

// =============================================================================
// Mutable accumulators (private — implementation detail)
// =============================================================================

export interface MutableChassisMatchup {
  wins: number;
  losses: number;
  draws: number;
}

export interface MutableGunneryBracketAcc {
  wins: number;
  losses: number;
  draws: number;
  totalDamage: number;
  participantRunCount: number;
}

export interface MutableAIVariantAcc {
  wins: number;
  losses: number;
  draws: number;
  totalTurns: number;
  runCount: number;
}

export interface MutablePilotAcc {
  runs: number;
  wins: number;
  kills: number;
  takenWounds: number;
}

export interface MutableUnitPerformanceAcc {
  wins: number;
  losses: number;
  draws: number;
  totalDamageDealt: number;
}

// =============================================================================
// Pure helpers (no state)
// =============================================================================

/** Resolve the gunnery skill bracket for a given gunnery value */
export function getGunneryBracket(gunnery: number): GunneryBracket {
  if (gunnery <= 2) return '1-2';
  if (gunnery <= 4) return '3-4';
  if (gunnery <= 6) return '5-6';
  return '7+';
}

/**
 * Produce the canonical head-to-head key: alphabetically-first variant comes
 * first. E.g., given "defensive" and "aggressive" → "aggressive_vs_defensive".
 */
export function canonicalVariantPairKey(
  variantA: string,
  variantB: string,
): string {
  return variantA <= variantB
    ? `${variantA}_vs_${variantB}`
    : `${variantB}_vs_${variantA}`;
}

/**
 * Synthesized pilot IDs are prefixed with 'synth-pilot-' (see randomPilotGenerator.ts).
 * Synthesized pilots are ephemeral and must be excluded from the pilotPerformance rollup.
 */
export function isSynthesizedPilot(pilotId: string): boolean {
  return pilotId.startsWith('synth-pilot-');
}

/** Ensure a nested Record key exists, initialising with a factory if absent. */
export function ensureKey<T>(
  record: Record<string, T>,
  key: string,
  factory: () => T,
): T {
  if (record[key] === undefined) {
    record[key] = factory();
  }
  return record[key] as T;
}

/**
 * Determine which sideId won based on the run winner field.
 * The simulation engine uses 'player' / 'opponent' labels; the participants
 * payload uses sideId strings (typically 'A' and 'B' per design D7).
 * Convention: participants on side 'A' correspond to the 'player' side;
 * participants on side 'B' correspond to the 'opponent' side.
 *
 * Returns null for draws / null outcomes.
 */
export function winningSideId(
  winner: 'player' | 'opponent' | 'draw' | null,
  participants: readonly IParticipant[],
): string | null {
  if (winner === null || winner === 'draw') return null;

  // Collect distinct sideIds in the order they first appear in participants
  const sides: string[] = [];
  for (const p of participants) {
    if (!sides.includes(p.sideId)) {
      sides.push(p.sideId);
    }
  }

  // Convention: first-seen sideId = player side, second-seen = opponent side
  if (winner === 'player') return sides[0] ?? null;
  if (winner === 'opponent') return sides[1] ?? null;
  return null;
}

/**
 * Group participants by sideId.
 */
export function groupBySide(
  participants: readonly IParticipant[],
): Record<string, IParticipant[]> {
  const result: Record<string, IParticipant[]> = {};
  for (const p of participants) {
    ensureKey(result, p.sideId, () => [] as IParticipant[]).push(p);
  }
  return result;
}

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
 * Accumulate chassisMatrix for one run.
 *
 * Counting rule (per spec §"Multi-unit forces produce N×M cells per run"):
 *   Each UNIQUE chassis on side A is paired with each UNIQUE chassis on side B —
 *   one increment per unique-chassis-pair, regardless of how many unit instances
 *   of that chassis appear on each side.
 */
export function accumulateChassisMatrix(
  participants: readonly IParticipant[],
  winner: 'player' | 'opponent' | 'draw' | null,
  matrixAcc: Record<string, Record<string, MutableChassisMatchup>>,
): void {
  const bySide = groupBySide(participants);
  const sideIds = Object.keys(bySide);
  if (sideIds.length !== 2) return;

  const [sideAId] = sideIds as [string, string];
  const winningSide = winningSideId(winner, participants);

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
      const cellCA = ensureKey(rowCA, cb, () => ({
        wins: 0,
        losses: 0,
        draws: 0,
      }));

      const rowCB = ensureKey<Record<string, MutableChassisMatchup>>(
        matrixAcc,
        cb,
        () => ({}),
      );
      const cellCB = ensureKey(rowCB, ca, () => ({
        wins: 0,
        losses: 0,
        draws: 0,
      }));

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
    }
  }
}

/**
 * Accumulate gunneryBracket for one run.
 *
 * avgDamageDealt per bracket is computed (in the freeze step) as:
 *   totalDamage / participantRunCount
 *
 * Damage per participant in this run = sum of DamageApplied events where
 * sourceUnitId matches the participant's unitId.
 */
export function accumulateGunneryBracket(
  participants: readonly IParticipant[],
  result: ISimulationRunResult,
  bracketAcc: Record<GunneryBracket, MutableGunneryBracketAcc>,
): void {
  const winner = result.winner;
  const bySide = groupBySide(participants);
  const sideIds = Object.keys(bySide);
  if (sideIds.length !== 2) return;

  const winningSide = winningSideId(winner, participants);

  // Per-unitId damage dealt from events
  const damageByUnitId: Record<string, number> = {};
  for (const event of result.events) {
    if (event.type === GameEventType.DamageApplied) {
      const payload = event.payload as IDamageAppliedPayload;
      if (payload.sourceUnitId !== undefined) {
        damageByUnitId[payload.sourceUnitId] =
          (damageByUnitId[payload.sourceUnitId] ?? 0) + payload.damage;
      }
    }
  }

  for (const participant of participants) {
    const bracket = getGunneryBracket(participant.gunnery);
    const acc = bracketAcc[bracket];

    if (winner === 'draw' || winningSide === null) {
      if (winner === 'draw') acc.draws++;
    } else if (winningSide === participant.sideId) {
      acc.wins++;
    } else {
      acc.losses++;
    }

    acc.totalDamage += damageByUnitId[participant.unitId] ?? 0;
    acc.participantRunCount++;
  }
}

/**
 * Accumulate aiVariantHeadToHead for one run.
 *
 * Mixed-variant runs (a side has >1 distinct aiVariant among its participants)
 * are excluded from head-to-head cells and counted in mixedVariantRuns instead.
 */
export function accumulateAIVariantHeadToHead(
  participants: readonly IParticipant[],
  result: ISimulationRunResult,
  h2hAcc: Record<string, MutableAIVariantAcc>,
  mixedCount: { value: number },
): void {
  const bySide = groupBySide(participants);
  const sideIds = Object.keys(bySide);
  if (sideIds.length !== 2) return;

  const [sideAId] = sideIds as [string, string];

  const variantsA = Array.from(
    new Set(bySide[sideIds[0]!]!.map((p) => p.aiVariant)),
  );
  const variantsB = Array.from(
    new Set(bySide[sideIds[1]!]!.map((p) => p.aiVariant)),
  );

  if (variantsA.length > 1 || variantsB.length > 1) {
    mixedCount.value++;
    return;
  }

  const variantA = variantsA[0]!;
  const variantB = variantsB[0]!;

  const pairKey = canonicalVariantPairKey(variantA, variantB);
  const acc = ensureKey(h2hAcc, pairKey, () => ({
    wins: 0,
    losses: 0,
    draws: 0,
    totalTurns: 0,
    runCount: 0,
  }));

  acc.totalTurns += result.turns;
  acc.runCount++;

  const winner = result.winner;
  const winningSide = winningSideId(winner, participants);

  if (winner === 'draw' || winningSide === null) {
    acc.draws++;
  } else {
    // wins/losses are from perspective of alphabetically-first variant.
    const winningVariant = winningSide === sideAId ? variantA : variantB;
    const alphaFirst = variantA <= variantB ? variantA : variantB;
    if (winningVariant === alphaFirst) {
      acc.wins++;
    } else {
      acc.losses++;
    }
  }
}

/**
 * Accumulate pilotPerformance for one run.
 * Synthesized pilots (pilotId starts with 'synth-pilot-') are skipped.
 */
export function accumulatePilotPerformance(
  participants: readonly IParticipant[],
  result: ISimulationRunResult,
  pilotAcc: Record<string, MutablePilotAcc>,
): void {
  const winner = result.winner;
  const bySide = groupBySide(participants);
  const sideIds = Object.keys(bySide);
  if (sideIds.length !== 2) return;

  const winningSide = winningSideId(winner, participants);

  const killsByUnitId: Record<string, number> = {};
  for (const event of result.events) {
    if (event.type === GameEventType.UnitDestroyed) {
      const payload = event.payload as IUnitDestroyedPayload;
      if (payload.killerUnitId !== undefined) {
        killsByUnitId[payload.killerUnitId] =
          (killsByUnitId[payload.killerUnitId] ?? 0) + 1;
      }
    }
  }

  const woundsByUnitId: Record<string, number> = {};
  for (const event of result.events) {
    if (event.type === GameEventType.PilotHit) {
      const payload = event.payload as IPilotHitPayload;
      woundsByUnitId[payload.unitId] =
        (woundsByUnitId[payload.unitId] ?? 0) + payload.wounds;
    }
  }

  for (const participant of participants) {
    if (isSynthesizedPilot(participant.pilotId)) continue;

    const acc = ensureKey(pilotAcc, participant.pilotId, () => ({
      runs: 0,
      wins: 0,
      kills: 0,
      takenWounds: 0,
    }));

    acc.runs++;

    const isWin =
      winner !== 'draw' &&
      winningSide !== null &&
      winningSide === participant.sideId;
    if (isWin) acc.wins++;

    acc.kills += killsByUnitId[participant.unitId] ?? 0;
    acc.takenWounds += woundsByUnitId[participant.unitId] ?? 0;
  }
}

/**
 * Initialize a fresh gunneryBracket accumulator with all four buckets present
 * at zero — required so empty brackets emit `{wins:0, losses:0, draws:0, avgDamageDealt:0}`
 * rather than missing keys (per spec §"Empty bracket produces zeroed entry").
 */
export function initGunneryBrackets(): Record<
  GunneryBracket,
  MutableGunneryBracketAcc
> {
  const empty = (): MutableGunneryBracketAcc => ({
    wins: 0,
    losses: 0,
    draws: 0,
    totalDamage: 0,
    participantRunCount: 0,
  });
  return {
    '1-2': empty(),
    '3-4': empty(),
    '5-6': empty(),
    '7+': empty(),
  };
}
