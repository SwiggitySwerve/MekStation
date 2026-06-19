import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
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

type UnitEquipment = IUnitConfig['equipment'][number];
type WeaponLookupResult = NonNullable<ReturnType<typeof lookupWeapon>>;

export function extractEquipment(
  unit: IUnitConfig,
): readonly IRecordSheetEquipment[] {
  const allWeapons = getEquipmentLookupService().getAllWeapons();
  return unit.equipment
    .filter(isCombatRecordSheetEquipment)
    .map((eq) =>
      mapCombatEquipment(eq, lookupWeapon(allWeapons, eq.name, eq.id)),
    );
}

function isCombatRecordSheetEquipment(eq: UnitEquipment): boolean {
  if (eq.isWeapon || eq.isAmmo) return true;
  if (eq.ranges && (eq.ranges.short || eq.ranges.medium || eq.ranges.long)) {
    return true;
  }

  return isKnownCombatEquipment(eq.name);
}

function isKnownCombatEquipment(name: string): boolean {
  const lowerName = name.toLowerCase();
  return COMBAT_EQUIPMENT.some((ce) => lowerName.includes(ce.toLowerCase()));
}

function mapCombatEquipment(
  eq: UnitEquipment,
  weaponData: WeaponLookupResult | undefined,
): IRecordSheetEquipment {
  if (weaponData) {
    return mapWeaponEquipment(eq, weaponData);
  }

  if (isKnownCombatEquipment(eq.name)) {
    return mapNamedCombatEquipment(eq);
  }

  return mapFallbackCombatEquipment(eq);
}

function locationAbbr(location: string): string {
  return LOCATION_ABBREVIATIONS[location as MechLocation] || location;
}

function mapWeaponEquipment(
  eq: UnitEquipment,
  weaponData: WeaponLookupResult,
): IRecordSheetEquipment {
  const damageCode = getDamageCode(weaponData.category);
  const isMissile = weaponData.category === WeaponCategory.MISSILE;
  const formattedDamage = isMissile
    ? formatMissileDamage(eq.name, weaponData.damage)
    : String(weaponData.damage);

  return {
    id: eq.id,
    name: eq.name,
    location: eq.location,
    locationAbbr: locationAbbr(eq.location),
    heat: weaponData.heat,
    damage: formattedDamage,
    damageCode,
    minimum: weaponData.ranges?.minimum ?? 0,
    short: weaponData.ranges?.short ?? '-',
    medium: weaponData.ranges?.medium ?? '-',
    long: weaponData.ranges?.long ?? '-',
    quantity: 1,
    isWeapon: true,
    isAmmo: false,
    ammoCount: undefined,
  };
}

function mapNamedCombatEquipment(eq: UnitEquipment): IRecordSheetEquipment {
  return {
    id: eq.id,
    name: eq.name,
    location: eq.location,
    locationAbbr: locationAbbr(eq.location),
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

function mapFallbackCombatEquipment(eq: UnitEquipment): IRecordSheetEquipment {
  return {
    id: eq.id,
    name: eq.name,
    location: eq.location,
    locationAbbr: locationAbbr(eq.location),
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
}
