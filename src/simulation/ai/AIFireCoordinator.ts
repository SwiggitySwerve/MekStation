/**
 * Focus-fire coordination for AI lance tactics.
 *
 * Per `add-ai-coordination-tactics` design D2: a pure module that assigns
 * friendly units to targets so the lance concentrates damage rather than
 * spreading it. The objective is to **finish targets** — it prefers an
 * assignment where the combined expected damage of the units assigned to a
 * target meets or exceeds that target's remaining durability.
 *
 * The algorithm is a deterministic greedy walk over the threat ranking:
 *
 *   1. Iterate enemies in threat-rank order (highest aggregate threat first).
 *   2. For each, pull the engageable friendly units not yet assigned, in
 *      canonical id order, accumulating their expected damage until the
 *      target's remaining durability is met — at which point the target is
 *      *finishable* and the surplus units are released to the next target.
 *   3. When no target is finishable, the lance concentrates on the
 *      highest-aggregate-threat target the most units can engage.
 *
 * No `SeededRandom` is consumed — ties break on canonical unit-id order
 * (design D6).
 *
 * @spec openspec/changes/add-ai-coordination-tactics/specs/simulation-system/spec.md
 *   Requirement: Focus-Fire Coordination
 */

import { hexDistance } from '@/utils/gameplay/hexMath';

import type { IThreatEntry } from './AIThreatMap';
import type { IAIUnitState } from './types';

/**
 * The output of a focus-fire pass — which friendly unit fires on which
 * target, and which targets the lance's assigned firepower can finish.
 */
export interface IFireAssignment {
  /** friendlyUnitId -> assigned targetId. */
  readonly assignments: ReadonlyMap<string, string>;
  /** Targets the lance's assigned firepower can finish this turn. */
  readonly finishableTargets: readonly string[];
}

/**
 * A friendly unit's expected single-turn damage output against a target at a
 * given range.
 *
 * Sums the damage of every live weapon whose long range covers the distance,
 * scaled by a coarse hit-probability estimate from the attacker's gunnery and
 * a range modifier — the same estimate `scoreTarget`'s `killProbability`
 * uses, kept consistent with single-unit reasoning. A weapon out of range
 * contributes nothing.
 *
 * Pure function.
 */
export function expectedDamage(
  attacker: IAIUnitState,
  target: IAIUnitState,
): number {
  if (attacker.destroyed || target.destroyed) return 0;

  const distance = hexDistance(attacker.position, target.position);
  const rangeMod = rangeModifierForDistance(distance);
  const tn = attacker.gunnery + rangeMod;
  // Clamp to [0, 1]: a TN of 12+ yields zero expected damage.
  const hitProbability = Math.max(0, Math.min(1, 1 - tn / 12));
  if (hitProbability <= 0) return 0;

  let rawDamage = 0;
  for (const weapon of attacker.weapons) {
    if (weapon.destroyed) continue;
    if (distance > (weapon.extremeRange ?? weapon.longRange)) continue;
    if (weapon.ammoPerTon > 0) {
      const ammoCount = attacker.ammo[weapon.id];
      if (ammoCount !== undefined && ammoCount <= 0) continue;
    }
    rawDamage += weapon.damage;
  }

  return rawDamage * hitProbability;
}

function rangeModifierForDistance(distance: number): number {
  if (distance <= 3) return 0;
  if (distance <= 6) return 2;
  if (distance <= 9) return 4;
  return 6;
}

/**
 * A target's remaining durability — the total armour plus internal structure
 * an attacker must chew through to destroy it.
 *
 * Read from the unit's `structureState` when present (the production wiring
 * populates it from the live armour / internal maps). When a unit carries no
 * structure state — legacy fixtures — we fall back to its
 * `remainingHpFraction` scaled by a canonical reference durability, so the
 * coordinator still has a finite, monotone number to reason about.
 *
 * Pure function.
 */
export function remainingDurability(target: IAIUnitState): number {
  const structure = target.structureState;
  if (structure) {
    let total = 0;
    for (const points of Object.values(structure.armorByLocation)) {
      total += Math.max(0, points);
    }
    for (const points of Object.values(structure.internalByLocation)) {
      total += Math.max(0, points);
    }
    return total;
  }

  // Legacy fallback: no per-location data. A canonical 65-ton 'Mech carries
  // roughly 150 points of armour + internal structure; scaling by the
  // remaining-HP fraction gives a usable monotone estimate.
  const fraction = clamp01(target.remainingHpFraction ?? 1);
  return REFERENCE_DURABILITY * fraction;
}

/** Canonical armour+internal total used when a unit has no structure data. */
const REFERENCE_DURABILITY = 150;

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Assign friendly lance units to targets, concentrating fire to finish
 * targets.
 *
 * Inputs:
 *   - `friendly` — the friendly lance.
 *   - `enemies` — the enemy units.
 *   - `threatMap` — the ranked threat list from `AIThreatMap.buildThreatMap`;
 *     drives the order targets are considered in.
 *
 * Algorithm (deterministic greedy):
 *
 *   - Walk the threat ranking highest-first. For each target, take its
 *     engageable, not-yet-assigned friendly units in canonical id order and
 *     accumulate their `expectedDamage`. As soon as the accumulated damage
 *     meets the target's `remainingDurability`, the target is recorded in
 *     `finishableTargets` and **no further units are assigned to it** — the
 *     surplus is released to the next-ranked target (design D2 risk
 *     mitigation: no dog-piling).
 *   - When the walk finishes with units still unassigned (no remaining
 *     target was finishable by them), each leftover unit is assigned to the
 *     highest-aggregate-threat target it can engage — concentrating residual
 *     fire on the single biggest threat the most units can reach.
 *
 * The output `assignments` map is a *bias*, not a mandate — `playAttackPhase`
 * falls back to the unit's own pick when the assigned target is out of arc or
 * range. Pure function — no `SeededRandom` consumption.
 */
export function coordinateFire(
  friendly: readonly IAIUnitState[],
  enemies: readonly IAIUnitState[],
  threatMap: readonly IThreatEntry[],
): IFireAssignment {
  const assignments = new Map<string, string>();
  const finishableTargets: string[] = [];

  const enemyById = new Map(enemies.map((e) => [e.unitId, e]));
  const friendlyById = new Map(friendly.map((f) => [f.unitId, f]));

  const assigned = new Set<string>();

  // Pass 1 — walk the threat ranking, concentrating fire to finish targets.
  for (const entry of threatMap) {
    const target = enemyById.get(entry.enemyId);
    if (!target || target.destroyed) continue;

    const durability = remainingDurability(target);

    // Engageable friendly units not yet assigned, in canonical id order
    // (`engageableBy` is already sorted by `buildThreatMap`).
    const available = entry.engageableBy.filter((id) => !assigned.has(id));
    if (available.length === 0) continue;

    let accumulated = 0;
    let finished = false;
    for (const friendlyId of available) {
      const ally = friendlyById.get(friendlyId);
      if (!ally) continue;
      assignments.set(friendlyId, entry.enemyId);
      assigned.add(friendlyId);
      accumulated += expectedDamage(ally, target);
      if (accumulated >= durability && durability > 0) {
        // Target is finishable with the units assigned so far — stop here
        // and release the rest of `available` to the next-ranked target.
        finished = true;
        break;
      }
    }
    if (finished) {
      finishableTargets.push(entry.enemyId);
    }
  }

  // Pass 2 — any friendly unit still unassigned (released surplus, or units
  // no finishable target took) concentrates on the highest-aggregate-threat
  // target it can engage. Targets already finishable are SKIPPED — they have
  // enough assigned firepower, so the surplus must go to the next-ranked
  // threat rather than dog-piling (design D2 risk mitigation).
  const finished = new Set(finishableTargets);
  for (const entry of threatMap) {
    if (finished.has(entry.enemyId)) continue;
    const target = enemyById.get(entry.enemyId);
    if (!target || target.destroyed) continue;
    for (const friendlyId of entry.engageableBy) {
      if (assigned.has(friendlyId)) continue;
      assignments.set(friendlyId, entry.enemyId);
      assigned.add(friendlyId);
    }
  }

  return { assignments, finishableTargets };
}
