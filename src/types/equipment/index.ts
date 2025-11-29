/**
 * Equipment Types Barrel Export
 * 
 * Comprehensive equipment type system for BattleTech.
 * 
 * @spec openspec/changes/implement-phase3-equipment
 */

// Weapon Types (from weapons subfolder)
export * from './weapons';

// Ammunition Types
export * from './AmmunitionTypes';

// Artillery & Capital Weapons
export * from './ArtilleryTypes';

// Electronics Types
export * from './ElectronicsTypes';

// Physical Weapon Types
export * from './PhysicalWeaponTypes';

// Misc Equipment Types
export * from './MiscEquipmentTypes';

// Equipment Placement
export * from './EquipmentPlacement';

// ============================================================================
// UNIFIED EQUIPMENT ACCESS
// ============================================================================

import { TechBase } from '../enums/TechBase';
import { RulesLevel } from '../enums/RulesLevel';
import { ALL_STANDARD_WEAPONS, IWeapon, WeaponCategory } from './weapons';
import { ARTILLERY_WEAPONS, CAPITAL_WEAPONS } from './ArtilleryTypes';
import { ALL_AMMUNITION, IAmmunition } from './AmmunitionTypes';
import { ALL_ELECTRONICS, IElectronics } from './ElectronicsTypes';
import { ALL_MISC_EQUIPMENT, IMiscEquipment } from './MiscEquipmentTypes';
import { PHYSICAL_WEAPON_DEFINITIONS, IPhysicalWeapon } from './PhysicalWeaponTypes';

/**
 * Equipment categories for unified access
 */
export enum EquipmentCategory {
  ENERGY_WEAPON = 'Energy Weapon',
  BALLISTIC_WEAPON = 'Ballistic Weapon',
  MISSILE_WEAPON = 'Missile Weapon',
  ARTILLERY = 'Artillery',
  CAPITAL_WEAPON = 'Capital Weapon',
  AMMUNITION = 'Ammunition',
  ELECTRONICS = 'Electronics',
  PHYSICAL_WEAPON = 'Physical Weapon',
  MISC_EQUIPMENT = 'Misc Equipment',
}

/**
 * Unified equipment item (for listing/browsing)
 */
export interface IEquipmentItem {
  readonly id: string;
  readonly name: string;
  readonly category: EquipmentCategory;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly weight: number;
  readonly criticalSlots: number;
  readonly costCBills: number;
  readonly battleValue: number;
  readonly introductionYear: number;
}

/**
 * Get all weapons (standard + artillery + capital)
 */
export function getAllWeapons(): readonly IWeapon[] {
  return [...ALL_STANDARD_WEAPONS, ...ARTILLERY_WEAPONS, ...CAPITAL_WEAPONS];
}

/**
 * Get all ammunition
 */
export function getAllAmmunition(): readonly IAmmunition[] {
  return ALL_AMMUNITION;
}

/**
 * Get all electronics
 */
export function getAllElectronics(): readonly IElectronics[] {
  return ALL_ELECTRONICS;
}

/**
 * Get all misc equipment
 */
export function getAllMiscEquipment(): readonly IMiscEquipment[] {
  return ALL_MISC_EQUIPMENT;
}

/**
 * Get all physical weapons
 */
export function getAllPhysicalWeapons(): readonly IPhysicalWeapon[] {
  return PHYSICAL_WEAPON_DEFINITIONS;
}

/**
 * Get all equipment as unified items (for browsing)
 */
export function getAllEquipmentItems(): IEquipmentItem[] {
  const items: IEquipmentItem[] = [];

  // Weapons
  for (const weapon of getAllWeapons()) {
    let category: EquipmentCategory;
    switch (weapon.category) {
      case WeaponCategory.ENERGY:
        category = EquipmentCategory.ENERGY_WEAPON;
        break;
      case WeaponCategory.BALLISTIC:
        category = EquipmentCategory.BALLISTIC_WEAPON;
        break;
      case WeaponCategory.MISSILE:
        category = EquipmentCategory.MISSILE_WEAPON;
        break;
      case WeaponCategory.ARTILLERY:
        category = EquipmentCategory.ARTILLERY;
        break;
      default:
        category = EquipmentCategory.MISC_EQUIPMENT;
    }

    items.push({
      id: weapon.id,
      name: weapon.name,
      category,
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

  // Electronics
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
    });
  }

  // Misc Equipment
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
    });
  }

  return items;
}

/**
 * Get equipment by ID (searches all categories)
 */
export function getEquipmentById(id: string): IEquipmentItem | undefined {
  return getAllEquipmentItems().find(e => e.id === id);
}

/**
 * Filter equipment by tech base
 */
export function filterEquipmentByTechBase(techBase: TechBase): IEquipmentItem[] {
  return getAllEquipmentItems().filter(e => e.techBase === techBase);
}

/**
 * Filter equipment by rules level
 */
export function filterEquipmentByRulesLevel(rulesLevel: RulesLevel): IEquipmentItem[] {
  return getAllEquipmentItems().filter(e => e.rulesLevel === rulesLevel);
}

/**
 * Filter equipment by availability (introduction year)
 */
export function filterEquipmentByYear(year: number): IEquipmentItem[] {
  return getAllEquipmentItems().filter(e => e.introductionYear <= year);
}

/**
 * Filter equipment by category
 */
export function filterEquipmentByCategory(category: EquipmentCategory): IEquipmentItem[] {
  return getAllEquipmentItems().filter(e => e.category === category);
}
