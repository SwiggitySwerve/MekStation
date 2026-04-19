/**
 * Battle Armor Squad Fire Resolution
 *
 * Each trooper fires independently — the squad's effective shot count and
 * total raw damage scale with the number of surviving troopers. BA has no
 * heat track so `heatGenerated` is always zero.
 *
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/combat-resolution/spec.md
 *   (Section 4: Squad Fire Resolution)
 */

import type {
  IBattleArmorCombatState,
  IBattleArmorSquadFireResult,
} from '@/types/gameplay';

import { getSurvivingTroopers } from './state';

/**
 * A single weapon mounted on the BA squad (same weapon replicated on each
 * trooper — BA weapons are squad-wide).
 */
export interface IBattleArmorSquadWeapon {
  readonly id: string;
  readonly damagePerShot: number;
  /**
   * Shots per trooper per attack (usually 1 — weapons like "Single Trooper
   * Weapon Mount" restrict to one trooper). When omitted defaults to 1.
   */
  readonly shotsPerTrooper?: number;
}

/**
 * Resolve a squad-fire attack. Returns the scaled shot count and total raw
 * damage. Individual weapon-to-hit, clustering, and location resolution are
 * handled downstream by the caller using the returned aggregates.
 *
 * Spec contract (per Section 4):
 *   - number of attack dice = surviving troopers (4.1)
 *   - weapon damage scales with surviving count (4.2)
 *   - heat exemption: BA has no heat (4.3)
 */
export function resolveBattleArmorSquadFire(
  state: IBattleArmorCombatState,
  weapons: readonly IBattleArmorSquadWeapon[],
): IBattleArmorSquadFireResult {
  const survivors = getSurvivingTroopers(state);

  // Sum the per-weapon contribution. "Effective shots" counts each trooper's
  // weapon as one shot; multiple weapons sum.
  let effectiveShots = 0;
  let totalDamage = 0;

  for (const w of weapons) {
    const shotsPerTrooper = w.shotsPerTrooper ?? 1;
    const weaponShots = shotsPerTrooper * survivors;
    effectiveShots += weaponShots;
    totalDamage += weaponShots * w.damagePerShot;
  }

  return {
    survivingTroopers: survivors,
    effectiveShots,
    totalDamage,
    heatGenerated: 0,
  };
}
