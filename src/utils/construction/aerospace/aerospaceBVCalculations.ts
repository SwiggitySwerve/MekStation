import type {
  IAerospaceBVAmmo,
  IAerospaceBVEquipment,
} from './aerospaceBVTypes';

import {
  addBVToAmmoCapGroup,
  getNativeAmmoBVGroup,
  sumCappedAmmoBV,
} from '../battleValueAmmo';
import { isAmmunitionEquipmentId } from '../equipmentBV/catalogLoader';
import { getEquipmentEntry, resolveEquipmentBV } from '../equipmentBVResolver';
import { getAerospaceDefensiveEquipmentKind } from './aerospaceBVEquipment';

export function sumWeaponBV(items: readonly IAerospaceBVEquipment[]): number {
  let total = 0;

  for (const item of items) {
    if (getAerospaceDefensiveEquipmentKind(item.id)) continue;
    const resolved = resolveEquipmentBV(item.id);

    if (resolved.resolved) {
      total += resolved.battleValue;
    }
  }

  return total;
}

/**

 * Cap ammo BV against matching weapon BV, per TechManual.

 * The aerospace calculator reuses the same bucket-by-weapon-type approach

 * as the mech offensive calculator — weapons in ALL arcs count toward the

 * cap, since ammo serves any launcher regardless of firing arc.

 */

export function calculateAerospaceAmmoBV(
  equipment: readonly IAerospaceBVEquipment[],

  ammo: readonly IAerospaceBVAmmo[],
  nativeGroups = false,
): number {
  if (ammo.length === 0) return 0;

  // Bucket weapon BV by normalized equipment id so ammo entries can match.

  const weaponBVByType: Record<string, number> = {};

  for (const item of equipment) {
    if (nativeGroups && (item.isAmmo ?? isAmmunitionEquipmentId(item.id)))
      continue;
    if (getAerospaceDefensiveEquipmentKind(item.id)) continue;
    const resolved = resolveEquipmentBV(item.id);

    if (!resolved.resolved) continue;

    // BVCalculator.java:1190-1240: native ammo type/rack crosses tech bases.
    const entry = nativeGroups ? getEquipmentEntry(item.id) : undefined;
    const key =
      (nativeGroups
        ? (getNativeAmmoBVGroup(item.id) ??
          getNativeAmmoBVGroup(entry?.id ?? '') ??
          getNativeAmmoBVGroup(entry?.name ?? ''))
        : undefined) ?? item.id.toLowerCase();

    addBVToAmmoCapGroup(weaponBVByType, key, resolved.battleValue);
  }

  // Bucket ammo BV by weapon type.

  const ammoBVByType: Record<string, number> = {};

  for (const entry of ammo) {
    if (
      getAerospaceDefensiveEquipmentKind(entry.id) ||
      getAerospaceDefensiveEquipmentKind(entry.weaponType)
    )
      continue;
    const key =
      (nativeGroups
        ? (getNativeAmmoBVGroup(entry.weaponType) ??
          getNativeAmmoBVGroup(entry.id))
        : undefined) ?? entry.weaponType.toLowerCase();

    addBVToAmmoCapGroup(ammoBVByType, key, entry.bv);
  }

  // Cap each bucket at the matching weapon BV total.

  return sumCappedAmmoBV(ammoBVByType, (key) => {
    const weaponBV = weaponBVByType[key] ?? 0;

    return weaponBV === 0 ? undefined : weaponBV;
  });
}

// ============================================================================

// Defensive BV

// ============================================================================

/**

 * Compute the aerospace defensive BV components.

 *

 * armorBV = totalArmor × 2.5 × armorMultiplier

 * siBV = SI × 2 (pinned MegaMek AeroBVCalculator.java:64-70)

 * defensiveFactor = 1 (no thrust multiplier)

 * defensive = (armorBV + siBV + defEquipBV − explosive) × aircraftTypeModifier × defensiveFactor

 *

 * Small Craft inherits the ordinary 2.5 BV per armor point (BVCalculator.java:461-463).

 *

 * @spec battle-value-system spec: Aerospace Defensive BV

 */
