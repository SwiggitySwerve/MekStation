/**
 * Weapon Attack Builder
 *
 * Translates a weaponId + the unit's simulation-level weapon inventory into
 * the richer `IWeaponAttack` shape consumed by the combat engine. Before
 * this helper landed, three separate call sites in `InteractiveSession.ts`
 * and `GameEngine.phases.ts` duplicated the shape with hardcoded fallbacks
 * (`?? 5`, `?? 3`, `?? 3/6/9`). If the weapon lookup failed, the attack
 * silently fired with Medium-Laser-equivalent stats, masking data bugs and
 * producing wrong combat outcomes.
 *
 * This helper centralizes that translation and makes a missing-weapon lookup
 * observable (console warning) while keeping combat execution resilient
 * (returns null → caller skips the weapon). The hardcoded fallback is gone.
 *
 * @spec openspec/changes/wire-real-weapon-data/proposal.md
 */

import type { IWeapon } from '@/simulation/ai/types';
import type { IWeaponAttack } from '@/types/gameplay/CombatInterfaces';

import { WeaponCategory } from '@/types/equipment/weapons/interfaces';
import { logger } from '@/utils/logger';

/**
 * Resolve a single weapon id against the attacker's weapon inventory and
 * produce the combat-facing `IWeaponAttack` shape. Returns `null` when the
 * weapon cannot be resolved, emitting a console warning so the miss is
 * observable in dev/test runs. Callers SHALL filter out nulls.
 *
 * This function does NOT provide hardcoded damage/heat/range fallbacks. If
 * the weapon exists on the unit, its real stats are used; if not, the
 * weapon does not fire.
 */
export function buildWeaponAttack(
  weaponId: string,
  unitWeapons: readonly IWeapon[],
  attackerId?: string,
): IWeaponAttack | null {
  const wData = unitWeapons.find((w) => w.id === weaponId);
  if (!wData) {
    logger.warn(
      `[weaponAttackBuilder] Weapon "${weaponId}" not found on unit${
        attackerId ? ` "${attackerId}"` : ''
      } — skipping fire. Check data pipeline: the declared weapon id should always match one entry in the unit's weapons list.`,
    );
    return null;
  }
  if (wData.destroyed) {
    logger.warn(
      `[weaponAttackBuilder] Weapon "${weaponId}" on unit${
        attackerId ? ` "${attackerId}"` : ''
      } is destroyed — skipping fire.`,
    );
    return null;
  }
  return {
    weaponId: wData.id,
    weaponName: wData.name,
    damage: wData.damage,
    heat: wData.heat,
    category: inferWeaponCategory(wData),
    minRange: wData.minRange,
    shortRange: wData.shortRange,
    mediumRange: wData.mediumRange,
    longRange: wData.longRange,
    isCluster: false,
  };
}

/**
 * Resolve a batch of weapon ids against a unit's inventory, dropping any
 * unresolved / destroyed weapons and preserving declaration order for the
 * survivors.
 */
export function buildWeaponAttacks(
  weaponIds: readonly string[],
  unitWeapons: readonly IWeapon[],
  attackerId?: string,
): IWeaponAttack[] {
  const resolved: IWeaponAttack[] = [];
  for (const wId of weaponIds) {
    const built = buildWeaponAttack(wId, unitWeapons, attackerId);
    if (built) resolved.push(built);
  }
  return resolved;
}

/**
 * Best-effort category inference. The simulation-level `IWeapon` shape does
 * NOT expose a category field, so we derive it from `ammoPerTon`:
 * - `ammoPerTon === -1` (no ammo, energy weapon) → ENERGY
 * - `ammoPerTon > 0` and name starts with a common ballistic prefix → BALLISTIC
 * - `ammoPerTon > 0` otherwise → MISSILE
 *
 * This is a best-effort view; no combat logic currently reads the category
 * field, so inaccuracy here is documentary, not behavioral. When the full
 * weapon-catalog integration lands (a follow-up change), this inference can
 * be replaced with direct catalog lookup.
 */
function inferWeaponCategory(weapon: IWeapon): WeaponCategory {
  if (weapon.ammoPerTon === -1) return WeaponCategory.ENERGY;
  const name = weapon.name.toLowerCase();
  if (
    name.includes('ac') ||
    name.includes('autocannon') ||
    name.includes('machine gun') ||
    name.includes('gauss')
  ) {
    return WeaponCategory.BALLISTIC;
  }
  return WeaponCategory.MISSILE;
}
