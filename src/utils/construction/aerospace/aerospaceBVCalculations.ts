import type {
  IAerospaceBVAmmo,
  IAerospaceBVEquipment,
} from './aerospaceBVTypes';

import { addBVToAmmoCapGroup, sumCappedAmmoBV } from '../battleValueAmmo';
import { resolveEquipmentBV } from '../equipmentBVResolver';

export function sumWeaponBV(items: readonly IAerospaceBVEquipment[]): number {
  let total = 0;

  for (const item of items) {
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
): number {
  if (ammo.length === 0) return 0;

  // Bucket weapon BV by normalized equipment id so ammo entries can match.

  const weaponBVByType: Record<string, number> = {};

  for (const item of equipment) {
    const resolved = resolveEquipmentBV(item.id);

    if (!resolved.resolved) continue;

    const key = item.id.toLowerCase();

    addBVToAmmoCapGroup(weaponBVByType, key, resolved.battleValue);
  }

  // Bucket ammo BV by weapon type.

  const ammoBVByType: Record<string, number> = {};

  for (const entry of ammo) {
    const key = entry.weaponType.toLowerCase();

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

 * defensive = (armorBV × smallCraftBonus + siBV + defEquipBV − explosive) × defensiveFactor

 *

 * Small Craft apply a 1.2× armor bonus inside the defensive block to reflect

 * their heavy armor tonnage allotment.

 *

 * @spec battle-value-system spec: Aerospace Defensive BV

 */
