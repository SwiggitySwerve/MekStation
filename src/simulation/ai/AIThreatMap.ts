/**
 * Multi-unit threat aggregation for AI lance coordination.
 *
 * Per `add-ai-coordination-tactics` design D1: where the per-unit bot scores
 * a target from one attacker's view, this module aggregates threat across the
 * *whole* friendly lance. For every enemy it sums that enemy's threat against
 * each friendly unit — producing a single ranked threat list the whole lance
 * shares, rather than four separate per-unit views.
 *
 * The aggregation reuses A2's `scoreTarget` so the numbers stay consistent
 * with single-unit reasoning. `scoreTarget(attacker, target)` returns the
 * *target's* danger (its weapon damage scaled by remaining HP and gunnery)
 * multiplied by how killable it is from the attacker's position — so
 * `scoreTarget(friendly, enemy)` is exactly "how threatening is this enemy,
 * scored from this friendly unit's vantage". Summing that across every
 * friendly lance unit gives the enemy's aggregate threat against the lance.
 *
 * The aggregation is a pure, deterministic function of the unit set and is
 * independent of the order of either input list (design D1) — entries are
 * ranked by aggregate threat descending, ties broken by canonical
 * lexicographic `enemyId` order. No `SeededRandom` is consumed.
 *
 * @spec openspec/changes/add-ai-coordination-tactics/specs/simulation-system/spec.md
 *   Requirement: Multi-Unit Threat Aggregation
 */

import { hexDistance } from '@/utils/gameplay/hexMath';

import type { IAIUnitState } from './types';

import { scoreTarget } from './AttackAI';

/**
 * One entry in the lance-wide threat ranking — an enemy unit, the threat it
 * poses summed across every friendly lance unit, and the friendly units that
 * can engage it this turn.
 */
export interface IThreatEntry {
  /** The enemy unit this entry describes. */
  readonly enemyId: string;
  /** Summed threat this enemy poses across all friendly lance units. */
  readonly aggregateThreat: number;
  /**
   * Friendly unit ids that can engage this enemy this turn — the enemy lies
   * within at least one of the friendly unit's live weapons' long range.
   * Sorted by canonical lexicographic id order for determinism.
   */
  readonly engageableBy: readonly string[];
}

/**
 * True when `friendly` can engage `enemy` this turn — the enemy sits within
 * the friendly unit's longest live-weapon range.
 *
 * Mirrors the reach gate in `AttackAI.getValidTargets` so `engageableBy`
 * agrees with the per-unit valid-target set. A unit with no live weapons (or
 * only zero-range weapons) can engage nothing.
 */
function canEngage(friendly: IAIUnitState, enemy: IAIUnitState): boolean {
  if (friendly.destroyed || enemy.destroyed) return false;
  if (friendly.unitId === enemy.unitId) return false;

  let maxRange = 0;
  for (const weapon of friendly.weapons) {
    if (weapon.destroyed) continue;
    const range = weapon.extremeRange ?? weapon.longRange;
    if (range > maxRange) maxRange = range;
  }
  if (maxRange <= 0) return false;

  return hexDistance(friendly.position, enemy.position) <= maxRange;
}

/**
 * Aggregate every enemy's threat across the whole friendly lance into a
 * single ranked list of `IThreatEntry` records.
 *
 * For each living enemy:
 *   - `aggregateThreat` = sum over living friendly units of
 *     `scoreTarget(enemy, friendly)` — the enemy's threat posture against
 *     each friendly, reusing A2's threat scorer.
 *   - `engageableBy` = the living friendly units that can reach the enemy
 *     this turn, sorted by lexicographic id.
 *
 * The result is ranked by `aggregateThreat` descending; ties break by
 * lexicographic `enemyId` so the ordering is fully deterministic and
 * independent of the order of the input lists. Destroyed units on either
 * side are skipped.
 *
 * Pure function — no state mutation, no `SeededRandom` consumption.
 */
export function buildThreatMap(
  friendly: readonly IAIUnitState[],
  enemies: readonly IAIUnitState[],
): readonly IThreatEntry[] {
  const livingFriendly = friendly.filter((u) => !u.destroyed);
  const livingEnemies = enemies.filter((u) => !u.destroyed);

  const entries: IThreatEntry[] = livingEnemies.map((enemy) => {
    let aggregateThreat = 0;
    const engageableBy: string[] = [];

    for (const ally of livingFriendly) {
      // `scoreTarget(ally, enemy)` reads the friendly unit as the attacker
      // and the enemy as the target — its `threat` term reflects the
      // ENEMY's weapon damage, scaled by how killable the enemy is from this
      // ally's vantage. Summing across the lance gives the enemy's aggregate
      // threat against the whole friendly lance.
      aggregateThreat += scoreTarget(ally, enemy);
      if (canEngage(ally, enemy)) {
        engageableBy.push(ally.unitId);
      }
    }

    // Canonical ordering for the engageable list keeps the entry — and any
    // downstream consumer that iterates it — deterministic.
    engageableBy.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

    return { enemyId: enemy.unitId, aggregateThreat, engageableBy };
  });

  // Rank by aggregate threat descending; canonical id tie-break makes the
  // ranking independent of the order the enemy list was supplied in.
  entries.sort((a, b) => {
    if (b.aggregateThreat !== a.aggregateThreat) {
      return b.aggregateThreat - a.aggregateThreat;
    }
    return a.enemyId < b.enemyId ? -1 : a.enemyId > b.enemyId ? 1 : 0;
  });

  return entries;
}
