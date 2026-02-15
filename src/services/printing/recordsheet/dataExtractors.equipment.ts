import { equipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { WeaponCategory } from '@/types/equipment';
import {
  IRecordSheetEquipment,
  LOCATION_ABBREVIATIONS,
} from '@/types/printing';

import type { IUnitConfig } from './types';

import { COMBAT_EQUIPMENT } from './constants';
import {
  getDamageCode,
  formatMissileDamage,
  lookupWeapon,
} from './equipmentUtils';

export function extractEquipment(
  unit: IUnitConfig,
): readonly IRecordSheetEquipment[] {
  const allWeapons = equipmentLookupService.getAllWeapons();

  const combatEquipment = unit.equipment.filter((eq) => {
    if (eq.isWeapon) return true;
    if (eq.isAmmo) return true;
    if (eq.ranges && (eq.ranges.short || eq.ranges.medium || eq.ranges.long))
      return true;

    const lowerName = eq.name.toLowerCase();
    if (COMBAT_EQUIPMENT.some((ce) => lowerName.includes(ce.toLowerCase())))
      return true;

    return false;
  });

  return combatEquipment.map((eq) => {
    const weaponData = lookupWeapon(allWeapons, eq.name, eq.id);

    if (weaponData) {
      const damageCode = getDamageCode(weaponData.category);
      const isMissile = weaponData.category === WeaponCategory.MISSILE;
      const formattedDamage = isMissile
        ? formatMissileDamage(eq.name, weaponData.damage)
        : String(weaponData.damage);

      return {
        id: eq.id,
        name: eq.name,
        location: eq.location,
        locationAbbr:
          LOCATION_ABBREVIATIONS[eq.location as MechLocation] || eq.location,
        heat: weaponData.heat,
        damage: formattedDamage,
        damageCode,
        minimum: weaponData.ranges.minimum,
        short: weaponData.ranges.short,
        medium: weaponData.ranges.medium,
        long: weaponData.ranges.long,
        quantity: 1,
        isWeapon: true,
        isAmmo: false,
        ammoCount: undefined,
      };
    }

    const lowerName = eq.name.toLowerCase();
    const isCombatEquipment = COMBAT_EQUIPMENT.some((ce) =>
      lowerName.includes(ce.toLowerCase()),
    );

    if (isCombatEquipment) {
      return {
        id: eq.id,
        name: eq.name,
        location: eq.location,
        locationAbbr:
          LOCATION_ABBREVIATIONS[eq.location as MechLocation] || eq.location,
        heat: '-',
        damage: '-',
        damageCode: '[E]',
        minimum: '-',
        short: '-',
        medium: '-',
        long: '-',
        quantity: 1,
        isWeapon: false,
        isAmmo: false,
        isEquipment: true,
        ammoCount: undefined,
      };
    }

    return {
      id: eq.id,
      name: eq.name,
      location: eq.location,
      locationAbbr:
        LOCATION_ABBREVIATIONS[eq.location as MechLocation] || eq.location,
      heat: eq.heat || 0,
      damage: eq.damage || '-',
      minimum: eq.ranges?.minimum || 0,
      short: eq.ranges?.short || '-',
      medium: eq.ranges?.medium || '-',
      long: eq.ranges?.long || '-',
      quantity: 1,
      isWeapon: eq.isWeapon || false,
      isAmmo: eq.isAmmo || false,
      ammoCount: eq.ammoCount,
    };
  });
}
