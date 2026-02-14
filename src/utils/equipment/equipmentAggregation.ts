/**
 * Equipment Aggregation Utilities
 *
 * Functions that aggregate equipment from multiple type-definition arrays
 * into unified IEquipmentItem collections for browsing and lookup.
 *
 * Moved from src/types/equipment/index.ts to resolve types→utils
 * reverse dependency (these functions import from categoryRegistry).
 */

import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { ALL_AMMUNITION, IAmmunition } from '@/types/equipment/AmmunitionTypes';
import {
  ARTILLERY_WEAPONS,
  CAPITAL_WEAPONS,
} from '@/types/equipment/ArtilleryTypes';
import {
  ALL_ELECTRONICS,
  IElectronics,
} from '@/types/equipment/ElectronicsTypes';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { IEquipmentItem } from '@/types/equipment/EquipmentItem';
import {
  ALL_MISC_EQUIPMENT,
  IMiscEquipment,
  MiscEquipmentCategory,
} from '@/types/equipment/MiscEquipmentTypes';
import {
  PHYSICAL_WEAPON_DEFINITIONS,
  IPhysicalWeapon,
} from '@/types/equipment/PhysicalWeaponTypes';
import { ALL_STANDARD_WEAPONS, IWeapon } from '@/types/equipment/weapons';

import { weaponCategoryToEquipmentCategory } from './categoryRegistry';

/**
 * IDs of AMS weapons that should also appear in "Other" category
 */
const AMS_WEAPON_IDS = ['ams', 'clan-ams', 'laser-ams', 'clan-laser-ams'];

/**
 * Categories of misc equipment to exclude from browser
 * (handled by Structure tab configuration)
 */
const EXCLUDED_MISC_CATEGORIES: readonly MiscEquipmentCategory[] = [
  MiscEquipmentCategory.JUMP_JET,
  MiscEquipmentCategory.HEAT_SINK,
];

export function getAllWeapons(): readonly IWeapon[] {
  return [...ALL_STANDARD_WEAPONS, ...ARTILLERY_WEAPONS, ...CAPITAL_WEAPONS];
}

export function getAllAmmunition(): readonly IAmmunition[] {
  return ALL_AMMUNITION;
}

export function getAllElectronics(): readonly IElectronics[] {
  return ALL_ELECTRONICS;
}

export function getAllMiscEquipment(): readonly IMiscEquipment[] {
  return ALL_MISC_EQUIPMENT;
}

export function getAllPhysicalWeapons(): readonly IPhysicalWeapon[] {
  return PHYSICAL_WEAPON_DEFINITIONS;
}

/**
 * Get ALL equipment as unified items (for conversion/lookup purposes)
 * Includes Jump Jets and Heat Sinks that are excluded from browsing.
 */
export function getAllEquipmentItemsForLookup(): IEquipmentItem[] {
  const items: IEquipmentItem[] = [];

  // Weapons - use centralized category registry
  for (const weapon of getAllWeapons()) {
    const category = weaponCategoryToEquipmentCategory(weapon.category);

    const additionalCategories = AMS_WEAPON_IDS.includes(weapon.id)
      ? [EquipmentCategory.MISC_EQUIPMENT]
      : undefined;

    items.push({
      id: weapon.id,
      name: weapon.name,
      category,
      additionalCategories,
      techBase: weapon.techBase,
      rulesLevel: weapon.rulesLevel,
      weight: weapon.weight,
      criticalSlots: weapon.criticalSlots,
      costCBills: weapon.costCBills,
      battleValue: weapon.battleValue,
      introductionYear: weapon.introductionYear,
    });
  }

  // Ammunition
  for (const ammo of getAllAmmunition()) {
    items.push({
      id: ammo.id,
      name: ammo.name,
      category: EquipmentCategory.AMMUNITION,
      techBase: ammo.techBase,
      rulesLevel: ammo.rulesLevel,
      weight: ammo.weight,
      criticalSlots: ammo.criticalSlots,
      costCBills: ammo.costPerTon,
      battleValue: ammo.battleValue,
      introductionYear: ammo.introductionYear,
    });
  }

  // Electronics (including targeting computers with variable properties)
  for (const electronics of getAllElectronics()) {
    items.push({
      id: electronics.id,
      name: electronics.name,
      category: EquipmentCategory.ELECTRONICS,
      techBase: electronics.techBase,
      rulesLevel: electronics.rulesLevel,
      weight: electronics.weight,
      criticalSlots: electronics.criticalSlots,
      costCBills: electronics.costCBills,
      battleValue: electronics.battleValue,
      introductionYear: electronics.introductionYear,
      variableEquipmentId: electronics.variableEquipmentId,
    });
  }

  // ALL Misc Equipment (including Jump Jets and Heat Sinks for lookup)
  for (const misc of getAllMiscEquipment()) {
    items.push({
      id: misc.id,
      name: misc.name,
      category: EquipmentCategory.MISC_EQUIPMENT,
      techBase: misc.techBase,
      rulesLevel: misc.rulesLevel,
      weight: misc.weight,
      criticalSlots: misc.criticalSlots,
      costCBills: misc.costCBills,
      battleValue: misc.battleValue,
      introductionYear: misc.introductionYear,
      variableEquipmentId: misc.variableEquipmentId,
    });
  }

  // Physical Weapons (melee weapons - for lookup/conversion)
  for (const physicalWeapon of getAllPhysicalWeapons()) {
    const id = physicalWeapon.type.toLowerCase().replace(/\s+/g, '-');

    items.push({
      id,
      name: physicalWeapon.name,
      category: EquipmentCategory.PHYSICAL_WEAPON,
      techBase: physicalWeapon.techBase,
      rulesLevel: physicalWeapon.rulesLevel,
      weight: 0, // Variable: depends on mech tonnage
      criticalSlots: 0, // Variable: depends on mech tonnage
      costCBills: 0, // Variable
      battleValue: 0, // Variable
      introductionYear: physicalWeapon.introductionYear,
      variableEquipmentId: id, // Physical weapons use their ID as the formula ID
    });
  }

  return items;
}

/**
 * Get equipment as unified items (for browsing UI)
 * Excludes Jump Jets and Heat Sinks (configured via Structure tab).
 */
export function getAllEquipmentItems(): IEquipmentItem[] {
  const items: IEquipmentItem[] = [];

  // Weapons - use centralized category registry
  for (const weapon of getAllWeapons()) {
    const category = weaponCategoryToEquipmentCategory(weapon.category);

    // AMS weapons should also appear in "Other" (defensive systems)
    const additionalCategories = AMS_WEAPON_IDS.includes(weapon.id)
      ? [EquipmentCategory.MISC_EQUIPMENT]
      : undefined;

    items.push({
      id: weapon.id,
      name: weapon.name,
      category,
      additionalCategories,
      techBase: weapon.techBase,
      rulesLevel: weapon.rulesLevel,
      weight: weapon.weight,
      criticalSlots: weapon.criticalSlots,
      costCBills: weapon.costCBills,
      battleValue: weapon.battleValue,
      introductionYear: weapon.introductionYear,
    });
  }

  // Ammunition
  for (const ammo of getAllAmmunition()) {
    items.push({
      id: ammo.id,
      name: ammo.name,
      category: EquipmentCategory.AMMUNITION,
      techBase: ammo.techBase,
      rulesLevel: ammo.rulesLevel,
      weight: ammo.weight,
      criticalSlots: ammo.criticalSlots,
      costCBills: ammo.costPerTon,
      battleValue: ammo.battleValue,
      introductionYear: ammo.introductionYear,
    });
  }

  // Electronics (including targeting computers with variable properties)
  for (const electronics of getAllElectronics()) {
    items.push({
      id: electronics.id,
      name: electronics.name,
      category: EquipmentCategory.ELECTRONICS,
      techBase: electronics.techBase,
      rulesLevel: electronics.rulesLevel,
      weight: electronics.weight,
      criticalSlots: electronics.criticalSlots,
      costCBills: electronics.costCBills,
      battleValue: electronics.battleValue,
      introductionYear: electronics.introductionYear,
      variableEquipmentId: electronics.variableEquipmentId,
    });
  }

  // Misc Equipment (excluding Jump Jets and Heat Sinks - handled by Structure tab)
  for (const misc of getAllMiscEquipment()) {
    // Skip categories that are configured via Structure tab
    if (EXCLUDED_MISC_CATEGORIES.includes(misc.category)) {
      continue;
    }

    items.push({
      id: misc.id,
      name: misc.name,
      category: EquipmentCategory.MISC_EQUIPMENT,
      techBase: misc.techBase,
      rulesLevel: misc.rulesLevel,
      weight: misc.weight,
      criticalSlots: misc.criticalSlots,
      costCBills: misc.costCBills,
      battleValue: misc.battleValue,
      introductionYear: misc.introductionYear,
      variableEquipmentId: misc.variableEquipmentId,
    });
  }

  // Physical Weapons (melee weapons like Hatchet, Sword, Lance, etc.)
  // Weight and slots are variable based on mech tonnage - set to 0 to indicate variable
  for (const physicalWeapon of getAllPhysicalWeapons()) {
    // Generate ID from weapon type (lowercase, hyphenated)
    const id = physicalWeapon.type.toLowerCase().replace(/\s+/g, '-');

    items.push({
      id,
      name: physicalWeapon.name,
      category: EquipmentCategory.PHYSICAL_WEAPON,
      techBase: physicalWeapon.techBase,
      rulesLevel: physicalWeapon.rulesLevel,
      weight: 0, // Variable: depends on mech tonnage
      criticalSlots: 0, // Variable: depends on mech tonnage
      costCBills: 0, // Variable: calculated based on weight
      battleValue: 0, // Variable: calculated based on damage
      introductionYear: physicalWeapon.introductionYear,
      variableEquipmentId: id, // Physical weapons use their ID as the formula ID
    });
  }

  return items;
}

export function getEquipmentById(id: string): IEquipmentItem | undefined {
  return getAllEquipmentItems().find((e) => e.id === id);
}

export function filterEquipmentByTechBase(
  techBase: TechBase,
): IEquipmentItem[] {
  return getAllEquipmentItems().filter((e) => e.techBase === techBase);
}

export function filterEquipmentByRulesLevel(
  rulesLevel: RulesLevel,
): IEquipmentItem[] {
  return getAllEquipmentItems().filter((e) => e.rulesLevel === rulesLevel);
}

export function filterEquipmentByYear(year: number): IEquipmentItem[] {
  return getAllEquipmentItems().filter((e) => e.introductionYear <= year);
}

export function filterEquipmentByCategory(
  category: EquipmentCategory,
): IEquipmentItem[] {
  return getAllEquipmentItems().filter((e) => e.category === category);
}
