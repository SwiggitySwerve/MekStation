/**
 * Weapon Type Definitions
 * 
 * Defines all standard BattleTech weapon types and categories.
 * 
 * @spec openspec/changes/implement-phase3-equipment/specs/weapon-system/spec.md
 */

import { TechBase } from '../enums/TechBase';
import { RulesLevel } from '../enums/RulesLevel';

/**
 * Weapon category enumeration
 */
export enum WeaponCategory {
  ENERGY = 'Energy',
  BALLISTIC = 'Ballistic',
  MISSILE = 'Missile',
  PHYSICAL = 'Physical',
  ARTILLERY = 'Artillery',
}

/**
 * Energy weapon sub-types
 */
export enum EnergyWeaponType {
  LASER = 'Laser',
  PPC = 'PPC',
  PULSE_LASER = 'Pulse Laser',
  ER_LASER = 'ER Laser',
  FLAMER = 'Flamer',
  PLASMA_RIFLE = 'Plasma Rifle',
}

/**
 * Ballistic weapon sub-types
 */
export enum BallisticWeaponType {
  AUTOCANNON = 'Autocannon',
  MACHINE_GUN = 'Machine Gun',
  GAUSS = 'Gauss Rifle',
  LB_X_AC = 'LB-X AC',
  ULTRA_AC = 'Ultra AC',
  ROTARY_AC = 'Rotary AC',
}

/**
 * Missile weapon sub-types
 */
export enum MissileWeaponType {
  LRM = 'LRM',
  SRM = 'SRM',
  MRM = 'MRM',
  STREAK_SRM = 'Streak SRM',
  STREAK_LRM = 'Streak LRM',
  NARC = 'NARC',
  ATM = 'ATM',
}

/**
 * Range bracket values
 */
export interface WeaponRanges {
  readonly minimum: number;
  readonly short: number;
  readonly medium: number;
  readonly long: number;
  readonly extreme?: number;
}

/**
 * Weapon interface
 */
export interface IWeapon {
  readonly id: string;
  readonly name: string;
  readonly category: WeaponCategory;
  readonly subType: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly damage: number | string; // string for "special" weapons like LRMs
  readonly heat: number;
  readonly ranges: WeaponRanges;
  readonly weight: number;
  readonly criticalSlots: number;
  readonly ammoPerTon?: number;
  readonly costCBills: number;
  readonly battleValue: number;
  readonly introductionYear: number;
}

/**
 * Standard weapon definitions - Energy weapons
 */
export const ENERGY_WEAPONS: readonly IWeapon[] = [
  // Standard Lasers
  {
    id: 'small-laser',
    name: 'Small Laser',
    category: WeaponCategory.ENERGY,
    subType: EnergyWeaponType.LASER,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: 3,
    heat: 1,
    ranges: { minimum: 0, short: 1, medium: 2, long: 3 },
    weight: 0.5,
    criticalSlots: 1,
    costCBills: 11250,
    battleValue: 9,
    introductionYear: 2300,
  },
  {
    id: 'medium-laser',
    name: 'Medium Laser',
    category: WeaponCategory.ENERGY,
    subType: EnergyWeaponType.LASER,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: 5,
    heat: 3,
    ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
    weight: 1,
    criticalSlots: 1,
    costCBills: 40000,
    battleValue: 46,
    introductionYear: 2300,
  },
  {
    id: 'large-laser',
    name: 'Large Laser',
    category: WeaponCategory.ENERGY,
    subType: EnergyWeaponType.LASER,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: 8,
    heat: 8,
    ranges: { minimum: 0, short: 5, medium: 10, long: 15 },
    weight: 5,
    criticalSlots: 2,
    costCBills: 100000,
    battleValue: 123,
    introductionYear: 2316,
  },
  // ER Lasers
  {
    id: 'er-small-laser',
    name: 'ER Small Laser',
    category: WeaponCategory.ENERGY,
    subType: EnergyWeaponType.ER_LASER,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    damage: 3,
    heat: 2,
    ranges: { minimum: 0, short: 2, medium: 4, long: 5 },
    weight: 0.5,
    criticalSlots: 1,
    costCBills: 11250,
    battleValue: 17,
    introductionYear: 3058,
  },
  {
    id: 'er-medium-laser',
    name: 'ER Medium Laser',
    category: WeaponCategory.ENERGY,
    subType: EnergyWeaponType.ER_LASER,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    damage: 5,
    heat: 5,
    ranges: { minimum: 0, short: 4, medium: 8, long: 12 },
    weight: 1,
    criticalSlots: 1,
    costCBills: 80000,
    battleValue: 62,
    introductionYear: 3058,
  },
  {
    id: 'er-large-laser',
    name: 'ER Large Laser',
    category: WeaponCategory.ENERGY,
    subType: EnergyWeaponType.ER_LASER,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    damage: 8,
    heat: 12,
    ranges: { minimum: 0, short: 7, medium: 14, long: 19 },
    weight: 5,
    criticalSlots: 2,
    costCBills: 200000,
    battleValue: 163,
    introductionYear: 3037,
  },
  // Clan ER Lasers
  {
    id: 'clan-er-small-laser',
    name: 'ER Small Laser (Clan)',
    category: WeaponCategory.ENERGY,
    subType: EnergyWeaponType.ER_LASER,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    damage: 5,
    heat: 2,
    ranges: { minimum: 0, short: 2, medium: 4, long: 6 },
    weight: 0.5,
    criticalSlots: 1,
    costCBills: 11250,
    battleValue: 31,
    introductionYear: 2825,
  },
  {
    id: 'clan-er-medium-laser',
    name: 'ER Medium Laser (Clan)',
    category: WeaponCategory.ENERGY,
    subType: EnergyWeaponType.ER_LASER,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    damage: 7,
    heat: 5,
    ranges: { minimum: 0, short: 5, medium: 10, long: 15 },
    weight: 1,
    criticalSlots: 1,
    costCBills: 80000,
    battleValue: 108,
    introductionYear: 2824,
  },
  {
    id: 'clan-er-large-laser',
    name: 'ER Large Laser (Clan)',
    category: WeaponCategory.ENERGY,
    subType: EnergyWeaponType.ER_LASER,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    damage: 10,
    heat: 12,
    ranges: { minimum: 0, short: 8, medium: 15, long: 25 },
    weight: 4,
    criticalSlots: 1,
    costCBills: 200000,
    battleValue: 248,
    introductionYear: 2820,
  },
  // PPCs
  {
    id: 'ppc',
    name: 'PPC',
    category: WeaponCategory.ENERGY,
    subType: EnergyWeaponType.PPC,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: 10,
    heat: 10,
    ranges: { minimum: 3, short: 6, medium: 12, long: 18 },
    weight: 7,
    criticalSlots: 3,
    costCBills: 200000,
    battleValue: 176,
    introductionYear: 2460,
  },
  {
    id: 'er-ppc',
    name: 'ER PPC',
    category: WeaponCategory.ENERGY,
    subType: EnergyWeaponType.PPC,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    damage: 10,
    heat: 15,
    ranges: { minimum: 0, short: 7, medium: 14, long: 23 },
    weight: 7,
    criticalSlots: 3,
    costCBills: 300000,
    battleValue: 229,
    introductionYear: 2751,
  },
  {
    id: 'clan-er-ppc',
    name: 'ER PPC (Clan)',
    category: WeaponCategory.ENERGY,
    subType: EnergyWeaponType.PPC,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    damage: 15,
    heat: 15,
    ranges: { minimum: 0, short: 7, medium: 14, long: 23 },
    weight: 6,
    criticalSlots: 2,
    costCBills: 300000,
    battleValue: 412,
    introductionYear: 2824,
  },
  // Flamers
  {
    id: 'flamer',
    name: 'Flamer',
    category: WeaponCategory.ENERGY,
    subType: EnergyWeaponType.FLAMER,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: 2,
    heat: 3,
    ranges: { minimum: 0, short: 1, medium: 2, long: 3 },
    weight: 1,
    criticalSlots: 1,
    costCBills: 7500,
    battleValue: 6,
    introductionYear: 2025,
  },
] as const;

/**
 * Standard weapon definitions - Ballistic weapons
 */
export const BALLISTIC_WEAPONS: readonly IWeapon[] = [
  // Autocannons
  {
    id: 'ac-2',
    name: 'AC/2',
    category: WeaponCategory.BALLISTIC,
    subType: BallisticWeaponType.AUTOCANNON,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: 2,
    heat: 1,
    ranges: { minimum: 4, short: 8, medium: 16, long: 24 },
    weight: 6,
    criticalSlots: 1,
    ammoPerTon: 45,
    costCBills: 75000,
    battleValue: 37,
    introductionYear: 2290,
  },
  {
    id: 'ac-5',
    name: 'AC/5',
    category: WeaponCategory.BALLISTIC,
    subType: BallisticWeaponType.AUTOCANNON,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: 5,
    heat: 1,
    ranges: { minimum: 3, short: 6, medium: 12, long: 18 },
    weight: 8,
    criticalSlots: 4,
    ammoPerTon: 20,
    costCBills: 125000,
    battleValue: 70,
    introductionYear: 2250,
  },
  {
    id: 'ac-10',
    name: 'AC/10',
    category: WeaponCategory.BALLISTIC,
    subType: BallisticWeaponType.AUTOCANNON,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: 10,
    heat: 3,
    ranges: { minimum: 0, short: 5, medium: 10, long: 15 },
    weight: 12,
    criticalSlots: 7,
    ammoPerTon: 10,
    costCBills: 200000,
    battleValue: 123,
    introductionYear: 2443,
  },
  {
    id: 'ac-20',
    name: 'AC/20',
    category: WeaponCategory.BALLISTIC,
    subType: BallisticWeaponType.AUTOCANNON,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: 20,
    heat: 7,
    ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
    weight: 14,
    criticalSlots: 10,
    ammoPerTon: 5,
    costCBills: 300000,
    battleValue: 178,
    introductionYear: 2500,
  },
  // Gauss Rifles
  {
    id: 'gauss-rifle',
    name: 'Gauss Rifle',
    category: WeaponCategory.BALLISTIC,
    subType: BallisticWeaponType.GAUSS,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    damage: 15,
    heat: 1,
    ranges: { minimum: 2, short: 7, medium: 15, long: 22 },
    weight: 15,
    criticalSlots: 7,
    ammoPerTon: 8,
    costCBills: 300000,
    battleValue: 320,
    introductionYear: 2590,
  },
  {
    id: 'clan-gauss-rifle',
    name: 'Gauss Rifle (Clan)',
    category: WeaponCategory.BALLISTIC,
    subType: BallisticWeaponType.GAUSS,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    damage: 15,
    heat: 1,
    ranges: { minimum: 2, short: 7, medium: 15, long: 22 },
    weight: 12,
    criticalSlots: 6,
    ammoPerTon: 8,
    costCBills: 300000,
    battleValue: 320,
    introductionYear: 2828,
  },
  // Machine Guns
  {
    id: 'machine-gun',
    name: 'Machine Gun',
    category: WeaponCategory.BALLISTIC,
    subType: BallisticWeaponType.MACHINE_GUN,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: 2,
    heat: 0,
    ranges: { minimum: 0, short: 1, medium: 2, long: 3 },
    weight: 0.5,
    criticalSlots: 1,
    ammoPerTon: 200,
    costCBills: 5000,
    battleValue: 5,
    introductionYear: 1950,
  },
] as const;

/**
 * Standard weapon definitions - Missile weapons
 */
export const MISSILE_WEAPONS: readonly IWeapon[] = [
  // LRMs
  {
    id: 'lrm-5',
    name: 'LRM 5',
    category: WeaponCategory.MISSILE,
    subType: MissileWeaponType.LRM,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: '1/missile',
    heat: 2,
    ranges: { minimum: 6, short: 7, medium: 14, long: 21 },
    weight: 2,
    criticalSlots: 1,
    ammoPerTon: 24,
    costCBills: 30000,
    battleValue: 45,
    introductionYear: 2295,
  },
  {
    id: 'lrm-10',
    name: 'LRM 10',
    category: WeaponCategory.MISSILE,
    subType: MissileWeaponType.LRM,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: '1/missile',
    heat: 4,
    ranges: { minimum: 6, short: 7, medium: 14, long: 21 },
    weight: 5,
    criticalSlots: 2,
    ammoPerTon: 12,
    costCBills: 100000,
    battleValue: 90,
    introductionYear: 2295,
  },
  {
    id: 'lrm-15',
    name: 'LRM 15',
    category: WeaponCategory.MISSILE,
    subType: MissileWeaponType.LRM,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: '1/missile',
    heat: 5,
    ranges: { minimum: 6, short: 7, medium: 14, long: 21 },
    weight: 7,
    criticalSlots: 3,
    ammoPerTon: 8,
    costCBills: 175000,
    battleValue: 136,
    introductionYear: 2295,
  },
  {
    id: 'lrm-20',
    name: 'LRM 20',
    category: WeaponCategory.MISSILE,
    subType: MissileWeaponType.LRM,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: '1/missile',
    heat: 6,
    ranges: { minimum: 6, short: 7, medium: 14, long: 21 },
    weight: 10,
    criticalSlots: 5,
    ammoPerTon: 6,
    costCBills: 250000,
    battleValue: 181,
    introductionYear: 2295,
  },
  // SRMs
  {
    id: 'srm-2',
    name: 'SRM 2',
    category: WeaponCategory.MISSILE,
    subType: MissileWeaponType.SRM,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: '2/missile',
    heat: 2,
    ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
    weight: 1,
    criticalSlots: 1,
    ammoPerTon: 50,
    costCBills: 10000,
    battleValue: 21,
    introductionYear: 2370,
  },
  {
    id: 'srm-4',
    name: 'SRM 4',
    category: WeaponCategory.MISSILE,
    subType: MissileWeaponType.SRM,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: '2/missile',
    heat: 3,
    ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
    weight: 2,
    criticalSlots: 1,
    ammoPerTon: 25,
    costCBills: 60000,
    battleValue: 39,
    introductionYear: 2370,
  },
  {
    id: 'srm-6',
    name: 'SRM 6',
    category: WeaponCategory.MISSILE,
    subType: MissileWeaponType.SRM,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: '2/missile',
    heat: 4,
    ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
    weight: 3,
    criticalSlots: 2,
    ammoPerTon: 15,
    costCBills: 80000,
    battleValue: 59,
    introductionYear: 2370,
  },
  // Streak SRMs
  {
    id: 'streak-srm-2',
    name: 'Streak SRM 2',
    category: WeaponCategory.MISSILE,
    subType: MissileWeaponType.STREAK_SRM,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    damage: '2/missile',
    heat: 2,
    ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
    weight: 1.5,
    criticalSlots: 1,
    ammoPerTon: 50,
    costCBills: 15000,
    battleValue: 30,
    introductionYear: 2647,
  },
] as const;

/**
 * All standard weapons combined
 */
export const ALL_STANDARD_WEAPONS: readonly IWeapon[] = [
  ...ENERGY_WEAPONS,
  ...BALLISTIC_WEAPONS,
  ...MISSILE_WEAPONS,
] as const;

/**
 * Get weapon by ID
 */
export function getWeaponById(id: string): IWeapon | undefined {
  return ALL_STANDARD_WEAPONS.find(w => w.id === id);
}

/**
 * Get weapons by category
 */
export function getWeaponsByCategory(category: WeaponCategory): IWeapon[] {
  return ALL_STANDARD_WEAPONS.filter(w => w.category === category);
}

/**
 * Get weapons by tech base
 */
export function getWeaponsByTechBase(techBase: TechBase): IWeapon[] {
  return ALL_STANDARD_WEAPONS.filter(w => w.techBase === techBase);
}

