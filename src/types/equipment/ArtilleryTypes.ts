/**
 * Artillery & Capital Weapon Type Definitions
 * 
 * Defines artillery, capital, and support weapons.
 * 
 * @spec openspec/changes/implement-phase3-equipment/specs/weapon-system/spec.md
 */

import { TechBase } from '../enums/TechBase';
import { RulesLevel } from '../enums/RulesLevel';
import { WeaponCategory, IWeapon } from './weapons';

/**
 * Artillery weapon sub-types
 */
export enum ArtilleryWeaponType {
  THUMPER = 'Thumper',
  SNIPER = 'Sniper',
  LONG_TOM = 'Long Tom',
  ARROW_IV = 'Arrow IV',
  MORTAR = 'Mortar',
}

/**
 * Capital weapon sub-types
 */
export enum CapitalWeaponType {
  NAVAL_LASER = 'Naval Laser',
  NAVAL_PPC = 'Naval PPC',
  NAVAL_AUTOCANNON = 'Naval Autocannon',
  NAVAL_GAUSS = 'Naval Gauss',
  CAPITAL_MISSILE = 'Capital Missile',
  MASS_DRIVER = 'Mass Driver',
}

// ============================================================================
// ARTILLERY WEAPONS
// ============================================================================

/**
 * Standard Artillery
 */
export const STANDARD_ARTILLERY: readonly IWeapon[] = [
  {
    id: 'thumper',
    name: 'Thumper',
    category: WeaponCategory.ARTILLERY,
    subType: ArtilleryWeaponType.THUMPER,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    damage: 15,
    heat: 6,
    ranges: { minimum: 0, short: 0, medium: 0, long: 21 },
    weight: 15,
    criticalSlots: 15,
    ammoPerTon: 20,
    costCBills: 187500,
    battleValue: 43,
    introductionYear: 2315,
    special: ['Artillery', 'Indirect fire'],
  },
  {
    id: 'sniper',
    name: 'Sniper',
    category: WeaponCategory.ARTILLERY,
    subType: ArtilleryWeaponType.SNIPER,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    damage: 20,
    heat: 10,
    ranges: { minimum: 0, short: 0, medium: 0, long: 18 },
    weight: 20,
    criticalSlots: 20,
    ammoPerTon: 10,
    costCBills: 300000,
    battleValue: 59,
    introductionYear: 2465,
    special: ['Artillery', 'Indirect fire'],
  },
  {
    id: 'long-tom',
    name: 'Long Tom',
    category: WeaponCategory.ARTILLERY,
    subType: ArtilleryWeaponType.LONG_TOM,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    damage: 25,
    heat: 20,
    ranges: { minimum: 0, short: 0, medium: 0, long: 30 },
    weight: 30,
    criticalSlots: 30,
    ammoPerTon: 5,
    costCBills: 450000,
    battleValue: 85,
    introductionYear: 2443,
    special: ['Artillery', 'Indirect fire'],
  },
] as const;

/**
 * Arrow IV Missile Artillery
 */
export const ARROW_IV_SYSTEMS: readonly IWeapon[] = [
  {
    id: 'arrow-iv',
    name: 'Arrow IV',
    category: WeaponCategory.ARTILLERY,
    subType: ArtilleryWeaponType.ARROW_IV,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    damage: 20,
    heat: 10,
    ranges: { minimum: 0, short: 0, medium: 0, long: 8 },
    weight: 15,
    criticalSlots: 15,
    ammoPerTon: 5,
    costCBills: 450000,
    battleValue: 171,
    introductionYear: 2593,
    special: ['Artillery', 'Homing capable'],
  },
  {
    id: 'clan-arrow-iv',
    name: 'Arrow IV (Clan)',
    category: WeaponCategory.ARTILLERY,
    subType: ArtilleryWeaponType.ARROW_IV,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    damage: 20,
    heat: 10,
    ranges: { minimum: 0, short: 0, medium: 0, long: 8 },
    weight: 12,
    criticalSlots: 12,
    ammoPerTon: 5,
    costCBills: 450000,
    battleValue: 171,
    introductionYear: 2850,
    special: ['Artillery', 'Homing capable'],
  },
] as const;

/**
 * Mortars
 */
export const MORTARS: readonly IWeapon[] = [
  {
    id: 'light-mortar',
    name: 'Light Mortar',
    category: WeaponCategory.ARTILLERY,
    subType: ArtilleryWeaponType.MORTAR,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    damage: 3,
    heat: 1,
    ranges: { minimum: 1, short: 2, medium: 4, long: 6 },
    weight: 0.5,
    criticalSlots: 1,
    ammoPerTon: 24,
    costCBills: 5000,
    battleValue: 11,
    introductionYear: 1950,
    special: ['Indirect fire'],
  },
  {
    id: 'heavy-mortar',
    name: 'Heavy Mortar',
    category: WeaponCategory.ARTILLERY,
    subType: ArtilleryWeaponType.MORTAR,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    damage: 8,
    heat: 3,
    ranges: { minimum: 1, short: 2, medium: 4, long: 6 },
    weight: 3,
    criticalSlots: 3,
    ammoPerTon: 8,
    costCBills: 30000,
    battleValue: 28,
    introductionYear: 1950,
    special: ['Indirect fire'],
  },
] as const;

/**
 * All artillery weapons combined
 */
export const ARTILLERY_WEAPONS: readonly IWeapon[] = [
  ...STANDARD_ARTILLERY,
  ...ARROW_IV_SYSTEMS,
  ...MORTARS,
] as const;

// ============================================================================
// CAPITAL WEAPONS (for Aerospace/Naval)
// ============================================================================

/**
 * Naval Lasers
 */
export const NAVAL_LASERS: readonly IWeapon[] = [
  {
    id: 'nl-35',
    name: 'Naval Laser 35',
    category: WeaponCategory.ARTILLERY,
    subType: CapitalWeaponType.NAVAL_LASER,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    damage: 35,
    heat: 52,
    ranges: { minimum: 0, short: 11, medium: 22, long: 33 },
    weight: 200,
    criticalSlots: 1,
    costCBills: 600000,
    battleValue: 560,
    introductionYear: 2305,
    special: ['Capital weapon'],
  },
  {
    id: 'nl-45',
    name: 'Naval Laser 45',
    category: WeaponCategory.ARTILLERY,
    subType: CapitalWeaponType.NAVAL_LASER,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    damage: 45,
    heat: 68,
    ranges: { minimum: 0, short: 12, medium: 24, long: 36 },
    weight: 500,
    criticalSlots: 1,
    costCBills: 900000,
    battleValue: 720,
    introductionYear: 2305,
    special: ['Capital weapon'],
  },
  {
    id: 'nl-55',
    name: 'Naval Laser 55',
    category: WeaponCategory.ARTILLERY,
    subType: CapitalWeaponType.NAVAL_LASER,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    damage: 55,
    heat: 85,
    ranges: { minimum: 0, short: 13, medium: 26, long: 39 },
    weight: 900,
    criticalSlots: 1,
    costCBills: 1200000,
    battleValue: 880,
    introductionYear: 2305,
    special: ['Capital weapon'],
  },
] as const;

/**
 * Naval PPCs
 */
export const NAVAL_PPCS: readonly IWeapon[] = [
  {
    id: 'nppc-light',
    name: 'Light Naval PPC',
    category: WeaponCategory.ARTILLERY,
    subType: CapitalWeaponType.NAVAL_PPC,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    damage: 7,
    heat: 105,
    ranges: { minimum: 0, short: 11, medium: 22, long: 33 },
    weight: 1400,
    criticalSlots: 1,
    costCBills: 2100000,
    battleValue: 532,
    introductionYear: 2305,
    special: ['Capital weapon'],
  },
  {
    id: 'nppc-medium',
    name: 'Medium Naval PPC',
    category: WeaponCategory.ARTILLERY,
    subType: CapitalWeaponType.NAVAL_PPC,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    damage: 9,
    heat: 135,
    ranges: { minimum: 0, short: 12, medium: 24, long: 36 },
    weight: 1800,
    criticalSlots: 1,
    costCBills: 2700000,
    battleValue: 684,
    introductionYear: 2305,
    special: ['Capital weapon'],
  },
  {
    id: 'nppc-heavy',
    name: 'Heavy Naval PPC',
    category: WeaponCategory.ARTILLERY,
    subType: CapitalWeaponType.NAVAL_PPC,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    damage: 11,
    heat: 165,
    ranges: { minimum: 0, short: 13, medium: 26, long: 39 },
    weight: 2200,
    criticalSlots: 1,
    costCBills: 3300000,
    battleValue: 836,
    introductionYear: 2305,
    special: ['Capital weapon'],
  },
] as const;

/**
 * Naval Gauss
 */
export const NAVAL_GAUSS: readonly IWeapon[] = [
  {
    id: 'light-naval-gauss',
    name: 'Light Naval Gauss',
    category: WeaponCategory.ARTILLERY,
    subType: CapitalWeaponType.NAVAL_GAUSS,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    damage: 35,
    heat: 1,
    ranges: { minimum: 2, short: 12, medium: 24, long: 36 },
    weight: 5500,
    criticalSlots: 1,
    ammoPerTon: 25,
    costCBills: 35000000,
    battleValue: 5824,
    introductionYear: 2440,
    special: ['Capital weapon'],
  },
  {
    id: 'medium-naval-gauss',
    name: 'Medium Naval Gauss',
    category: WeaponCategory.ARTILLERY,
    subType: CapitalWeaponType.NAVAL_GAUSS,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    damage: 25,
    heat: 1,
    ranges: { minimum: 2, short: 13, medium: 26, long: 39 },
    weight: 6000,
    criticalSlots: 1,
    ammoPerTon: 25,
    costCBills: 55000000,
    battleValue: 4160,
    introductionYear: 2440,
    special: ['Capital weapon'],
  },
  {
    id: 'heavy-naval-gauss',
    name: 'Heavy Naval Gauss',
    category: WeaponCategory.ARTILLERY,
    subType: CapitalWeaponType.NAVAL_GAUSS,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    damage: 40,
    heat: 1,
    ranges: { minimum: 2, short: 14, medium: 28, long: 42 },
    weight: 8000,
    criticalSlots: 1,
    ammoPerTon: 25,
    costCBills: 75000000,
    battleValue: 6656,
    introductionYear: 2440,
    special: ['Capital weapon'],
  },
] as const;

/**
 * All capital weapons combined
 */
export const CAPITAL_WEAPONS: readonly IWeapon[] = [
  ...NAVAL_LASERS,
  ...NAVAL_PPCS,
  ...NAVAL_GAUSS,
] as const;

/**
 * Get artillery weapon by ID
 */
export function getArtilleryById(id: string): IWeapon | undefined {
  return [...ARTILLERY_WEAPONS, ...CAPITAL_WEAPONS].find(w => w.id === id);
}

