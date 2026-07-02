/**
 * Battle Armor Vibro-Claw Physical Attack
 *
 * BA with Vibro-Claws can declare a Vibro-Claw Attack in the physical phase.
 * Damage model (MegaMek parity — `BAVibroClawAttackAction.getDamageFor`):
 *
 *   totalDamage = missilesHit(shootingStrength) × vibroClaws
 *
 * where `missilesHit` is a 2d6 cluster-table lookup against the squad's
 * surviving trooper count, and the total applies in claw-sized clusters
 * (each cluster rolls its own hit location downstream — the MegaMek
 * `min(vibroClaws, remaining)` damage loop).
 *
 * The earlier deterministic `1 + ceil(0.5 × troopers)` per-claw formula
 * (archived `add-battlearmor-combat-behavior` § 8) was NOT MegaMek parity —
 * it coincidentally matched at 4 troopers under average rolls. The living
 * `battle-armor-combat` spec's cluster-table requirement is canonical.
 *
 * @spec openspec/specs/battle-armor-combat/spec.md (Requirement: Vibroclaw Attack)
 */

import type {
  IBattleArmorCombatState,
  IBattleArmorVibroClawResult,
} from '@/types/gameplay';
import type { D6Roller } from '@/utils/gameplay/diceTypes';

import { lookupClusterHits } from '../clusterWeapons/hitTable';
import { getSurvivingTroopers } from './state';

/**
 * Valid target types for a vibro-claw attack. The damage math is
 * target-agnostic (cluster hits × claws); the type gates which damage
 * pipeline the dispatch layer routes into.
 */
export type VibroClawTargetType = 'mech' | 'vehicle' | 'protomech';

const defaultD6Roller: D6Roller = () => Math.floor(Math.random() * 6) + 1;

export interface IResolveVibroClawParams {
  readonly state: IBattleArmorCombatState;
  /** Target unit class. */
  readonly targetType: VibroClawTargetType;
  /**
   * Number of claws being used this attack. Defaults to the squad's
   * construction-time `vibroClawCount` (0, 1, or 2) — callers can override
   * for "use one claw only" play.
   */
  readonly clawsOverride?: number;
  /** Optional D6 roller override (test determinism / engine-owned dice). */
  readonly diceRoller?: D6Roller;
}

/**
 * Split the total vibro-claw damage into MegaMek's application clusters:
 * chunks of `claws` damage, with a final smaller remainder chunk. Each
 * cluster rolls its own hit location downstream.
 */
export function splitVibroClawDamageIntoClusters(
  totalDamage: number,
  claws: number,
): readonly number[] {
  if (totalDamage <= 0 || claws <= 0) return [];
  const clusters: number[] = [];
  let remaining = totalDamage;
  while (remaining > 0) {
    const chunk = Math.min(claws, remaining);
    clusters.push(chunk);
    remaining -= chunk;
  }
  return clusters;
}

/**
 * Resolve a BA vibro-claw attack: 2d6 cluster-table lookup against the
 * squad's surviving trooper count, multiplied by the claw count.
 *
 * Note: this module reports damage values only — the dispatch layer
 * applies the clusters to the target via the standard damage pipeline.
 */
export function resolveVibroClawAttack(
  params: IResolveVibroClawParams,
): IBattleArmorVibroClawResult {
  const survivors = getSurvivingTroopers(params.state);

  // Reject if squad cannot attack.
  if (!params.state.hasVibroClaws || survivors <= 0) {
    return {
      missileHits: 0,
      claws: 0,
      totalDamage: 0,
      clusters: [],
      survivingTroopers: survivors,
    };
  }

  const claws = Math.max(
    0,
    Math.min(
      params.clawsOverride ?? params.state.vibroClawCount,
      params.state.vibroClawCount,
    ),
  );
  if (claws <= 0) {
    return {
      missileHits: 0,
      claws: 0,
      totalDamage: 0,
      clusters: [],
      survivingTroopers: survivors,
    };
  }

  const roll = params.diceRoller ?? defaultD6Roller;
  const clusterRoll = roll() + roll();
  const missileHits = lookupClusterHits(clusterRoll, survivors);
  const totalDamage = missileHits * claws;

  return {
    missileHits,
    claws,
    totalDamage,
    clusters: splitVibroClawDamageIntoClusters(totalDamage, claws),
    survivingTroopers: survivors,
  };
}
