/**
 * Battle Armor Damage Module
 *
 * Implements BA-specific damage resolution:
 *  - One hit = one random surviving trooper takes the whole damage.
 *  - Excess kills that trooper; subsequent hits pick a new random survivor.
 *  - Cluster attacks: squad-size used as cluster input, each resolved hit
 *    routes through the same one-trooper-at-a-time rule.
 *  - Area-effect weapons (Inferno) apply full damage to every surviving
 *    trooper (no random selection).
 *  - Flamer damage is doubled per the TW anti-infantry/anti-BA rule.
 *  - No mech-style crits — trooper death is the only structural consequence.
 *
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/combat-resolution/spec.md
 */

import type {
  IBattleArmorCombatState,
  IBattleArmorHit,
  IBattleArmorResolveDamageResult,
} from '@/types/gameplay';

import { lookupClusterHits } from '../clusterWeapons/hitTable';
import { D6Roller, defaultD6Roller, roll2d6 } from '../diceTypes';
import {
  adjustTrooperArmor,
  getSurvivingTrooperIndices,
  killTrooper,
} from './state';

// =============================================================================
// One-hit-at-a-time distribution
// =============================================================================

/**
 * Options for `battleArmorResolveDamage`.
 */
export interface IBattleArmorResolveDamageOptions {
  /**
   * Injectable d6 roller for trooper selection. Tests pass a deterministic
   * roller so the selection sequence is reproducible. Defaults to `Math.random`.
   */
  readonly diceRoller?: D6Roller;
  /**
   * If the weapon is a flamer, double each hit's damage per the TW anti-BA
   * rule (spec scenario "Flamer damage doubles per TW anti-BA rule").
   */
  readonly isFlamer?: boolean;
}

/**
 * Pick a uniformly-random surviving trooper index, driven by the injected
 * d6 roller. Returns `-1` if no survivors remain.
 */
function pickRandomSurvivor(
  state: IBattleArmorCombatState,
  diceRoller: D6Roller,
): number {
  const alive = getSurvivingTrooperIndices(state);
  if (alive.length === 0) return -1;
  // Roll a d6 and reduce modulo len — fine for small squads (1-6 troopers).
  const die = diceRoller();
  return alive[die % alive.length];
}

/**
 * Apply a single atomic hit of `damage` damage to the squad. One random
 * surviving trooper takes the full hit; overflow is discarded (a trooper
 * dies and the rest of the shot is lost — per TW anti-infantry).
 */
function applyOneHit(
  state: IBattleArmorCombatState,
  damage: number,
  diceRoller: D6Roller,
): { readonly state: IBattleArmorCombatState; readonly hit: IBattleArmorHit } {
  const trooperIndex = pickRandomSurvivor(state, diceRoller);
  if (trooperIndex === -1 || damage <= 0) {
    return {
      state,
      hit: {
        trooperIndex: -1,
        damage: 0,
        armorRemaining: 0,
        killed: false,
      },
    };
  }

  const trooper = state.troopers[trooperIndex];
  const armorBefore = trooper.armorRemaining;
  const absorb = Math.min(armorBefore, damage);
  const overflow = damage - absorb;

  let next = adjustTrooperArmor(state, trooperIndex, -absorb);
  let killed = false;
  // Overflow kills the trooper (rest of shot lost per TW).
  if (overflow > 0 || next.troopers[trooperIndex].armorRemaining <= 0) {
    next = killTrooper(next, trooperIndex);
    killed = true;
  }

  return {
    state: next,
    hit: {
      trooperIndex,
      damage,
      armorRemaining: next.troopers[trooperIndex].armorRemaining,
      killed,
    },
  };
}

/**
 * Resolve a list of atomic damage events against a BA squad. Each entry in
 * `perHitDamage` represents one shot that should pick its own trooper.
 * Cluster weapons reduce their missile count via `battleArmorResolveCluster`
 * before calling this — this function does not consult the cluster table.
 */
export function battleArmorResolveDamage(
  state: IBattleArmorCombatState,
  perHitDamage: readonly number[],
  options: IBattleArmorResolveDamageOptions = {},
): IBattleArmorResolveDamageResult {
  const diceRoller = options.diceRoller ?? defaultD6Roller;
  const multiplier = options.isFlamer ? 2 : 1;

  let current = state;
  const hits: IBattleArmorHit[] = [];
  const trooperKills: number[] = [];

  for (const rawDmg of perHitDamage) {
    if (current.destroyed) break;
    const dmg = rawDmg * multiplier;
    const { state: next, hit } = applyOneHit(current, dmg, diceRoller);
    if (hit.trooperIndex !== -1) {
      hits.push(hit);
      if (hit.killed) {
        trooperKills.push(hit.trooperIndex);
      }
    }
    current = next;
  }

  return {
    state: current,
    hits,
    trooperKills,
    squadEliminated: current.destroyed,
  };
}

// =============================================================================
// Cluster resolution (LRM, SRM, etc. into a squad)
// =============================================================================

/**
 * Resolve a cluster weapon into a BA squad. Uses the cluster-hits table with
 * `squadSize` as the cluster input (per spec scenario "Cluster attacks treat
 * squad as cluster table input"). Each resolved missile applies `damagePerMissile`
 * damage via the one-hit-at-a-time distribution.
 */
export function battleArmorResolveCluster(
  state: IBattleArmorCombatState,
  params: {
    /** Missile count declared (LRM-10 = 10). */
    readonly missileCount: number;
    /** Damage per missile (LRM = 1, SRM = 2, etc.). */
    readonly damagePerMissile: number;
    /**
     * Override the cluster-size input. Defaults to `missileCount` (standard
     * missile behaviour). The "squad used as cluster input" spec clause is
     * honoured when callers pass the squad size explicitly; most callers use
     * the weapon's cluster size (the two happen to match in common cases).
     */
    readonly clusterSize?: number;
    readonly diceRoller?: D6Roller;
    readonly isFlamer?: boolean;
  },
): IBattleArmorResolveDamageResult {
  const diceRoller = params.diceRoller ?? defaultD6Roller;
  const clusterSize = params.clusterSize ?? params.missileCount;
  // Roll 2d6 to get the hits count from the cluster table.
  const { total: roll } = roll2d6(diceRoller);
  const missilesHit = lookupClusterHits(roll, clusterSize);
  const perHit: number[] = [];
  for (let i = 0; i < missilesHit; i++) {
    perHit.push(params.damagePerMissile);
  }
  return battleArmorResolveDamage(state, perHit, {
    diceRoller,
    isFlamer: params.isFlamer,
  });
}

// =============================================================================
// Area-effect / anti-infantry (inferno)
// =============================================================================

/**
 * Apply `damage` to EVERY surviving trooper simultaneously (no random
 * selection). Inferno and area-effect weapons use this path.
 *
 * Per spec scenario: "Area-effect weapons (Inferno) apply to all alive
 * troopers equally".
 */
export function battleArmorResolveAreaEffect(
  state: IBattleArmorCombatState,
  damagePerTrooper: number,
): IBattleArmorResolveDamageResult {
  if (damagePerTrooper <= 0 || state.destroyed) {
    return {
      state,
      hits: [],
      trooperKills: [],
      squadEliminated: state.destroyed,
    };
  }

  let current = state;
  const hits: IBattleArmorHit[] = [];
  const trooperKills: number[] = [];

  for (let i = 0; i < state.troopers.length; i++) {
    const trooper = state.troopers[i];
    if (!trooper.alive || trooper.armorRemaining <= 0) continue;

    const armorBefore = trooper.armorRemaining;
    const absorb = Math.min(armorBefore, damagePerTrooper);
    const overflow = damagePerTrooper - absorb;

    let next = adjustTrooperArmor(current, i, -absorb);
    let killed = false;
    if (overflow > 0 || next.troopers[i].armorRemaining <= 0) {
      next = killTrooper(next, i);
      killed = true;
      trooperKills.push(i);
    }
    hits.push({
      trooperIndex: i,
      damage: damagePerTrooper,
      armorRemaining: next.troopers[i].armorRemaining,
      killed,
    });
    current = next;
  }

  return {
    state: current,
    hits,
    trooperKills,
    squadEliminated: current.destroyed,
  };
}
