import type { IParticipant } from '../runner/types';
import type { MutableGunneryBracketAcc } from './swarmAccumulatorTypes';
import type { GunneryBracket } from './swarmAggregation.types';

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
