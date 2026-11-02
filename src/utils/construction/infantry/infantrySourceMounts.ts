import type { IUnitContract } from '@/types/contracts';

import { UnitContract } from '@/types/contracts';
import { InfantryMotive } from '@/types/unit/InfantryInterfaces';
import { InfantryArmorKit } from '@/types/unit/PersonnelInterfaces';

import type { InfantryFieldGunMount } from './infantryBV';
import type {
  InfantryStateLike,
  resolveInfantryProtection,
} from './infantryBVAdapter';

import {
  getAmmunitionEntry,
  getEquipmentEntry,
  resolveEquipmentBV,
} from '../equipmentBVResolver';
import { resolveInfantryOffenseSource } from './platoonComposition';

// BLKInfantryFile.java:229-230; BLKFile.java:252-365 (48fcb2f64).
// @spec establish-all-unit-data-parity: Infantry Field Gun BV Addition
// Bins belong to the platoon: the shared ammo owner matches and caps them.
export function infantrySourceFieldGuns(
  names: readonly string[],
): InfantryFieldGunMount[] {
  const guns: InfantryFieldGunMount[] = [];
  const ammo: NonNullable<InfantryFieldGunMount['ammo']> = [];
  for (const name of names) {
    const id = name.replace(/:Shots\d+#/i, '');
    const entry = getEquipmentEntry(id);
    // Generic lookup preserves weapon precedence for colliding catalog IDs.
    if (entry?.shotsPerTon !== undefined) {
      const bin = getAmmunitionEntry(id);
      if (bin) ammo.push({ id: bin.id });
    } else if (entry) guns.push({ id: entry.id });
    else resolveEquipmentBV(id); // Preserve the resolver's unresolved diagnostic.
  }
  if (guns[0]) guns[0].ammo = ammo;
  return guns;
}

/** Project validated converter records through the same source-fact owners. */
export function infantryCatalogFacts(
  value: unknown,
): ReturnType<typeof catalogFacts> | undefined {
  if (typeof value !== 'object' || value === null || !('platoon' in value))
    return;
  const unit = UnitContract.parse(value);
  if (unit.unitType !== 'Infantry')
    throw new Error('Expected infantry catalog unit');
  return catalogFacts(unit as Extract<IUnitContract, { unitType: 'Infantry' }>);
}
function catalogFacts(unit: Extract<IUnitContract, { unitType: 'Infantry' }>) {
  if (!unit.platoon || !unit.primaryWeapon || !unit.motiveType)
    throw new Error('Missing infantry catalog source facts');
  const tags: Record<string, string | string[]> = {
    motion_type: unit.beastMount ?? unit.motiveType,
    squadn: String(unit.platoon.squadCount),
    Primary:
      typeof unit.primaryWeapon === 'string'
        ? unit.primaryWeapon
        : unit.primaryWeapon.name,
    armordivisor: String(unit.customArmorDamageDivisor ?? 1),
    specialization: String(unit.specializations ?? 0),
    augmentation: unit.augmentations ?? [],
    'Field Guns Equipment': (unit.equipment ?? [])
      .filter((mount) => mount.location === 'FIELD_GUNS')
      .map((mount) => mount.name ?? mount.id),
    ...(unit.armorKit ? { 'Troopers Equipment': [unit.armorKit] } : {}),
    ...(unit.secondaryWeapon
      ? {
          Secondary: unit.secondaryWeapon.name,
          secondn: String(unit.secondaryWeapon.count ?? 0),
        }
      : {}),
  };
  for (const flag of unit.armorFlags ?? []) tags[flag.toLowerCase()] = '';
  for (const [key, name] of Object.entries(unit.prostheticEnhancements ?? {}))
    tags[key] = name;
  for (const [key, count] of Object.entries(
    unit.prostheticEnhancementCounts ?? {},
  ))
    tags[key] = String(count);
  return { unit, tags };
}
export function infantryCatalogState(
  { unit, tags }: ReturnType<typeof catalogFacts>,
  protection: ReturnType<typeof resolveInfantryProtection>,
): InfantryStateLike {
  if (!unit.platoon || !unit.primaryWeapon)
    throw new Error('Missing infantry catalog platoon');
  return {
    ...protection,
    bvOffense: resolveInfantryOffenseSource(
      tags,
      protection.isArmorEncumbering,
    ),
    infantryMotive: InfantryMotive.FOOT,
    platoonComposition: {
      squads: unit.platoon.squadCount,
      troopersPerSquad: unit.platoon.squadSize,
    },
    armorKit: InfantryArmorKit.NONE,
    hasAntiMechTraining: false,
    primaryWeapon:
      typeof unit.primaryWeapon === 'string'
        ? unit.primaryWeapon
        : unit.primaryWeapon.name,
    secondaryWeapon: unit.secondaryWeapon?.name,
    secondaryWeaponCount: unit.secondaryWeapon?.count ?? 0,
    fieldGuns: [],
  };
}
