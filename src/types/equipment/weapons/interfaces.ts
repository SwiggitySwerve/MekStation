/**
 * Weapon Type Interfaces and Enumerations
 * 
 * Core types shared across all weapon categories.
 * 
 * @spec openspec/specs/weapon-system/spec.md
 */

import { TechBase } from '../../enums/TechBase';
import { RulesLevel } from '../../enums/RulesLevel';
import { EquipmentFlag } from '../../enums/EquipmentFlag';
import { UnitType } from '../../unit/BattleMechInterfaces';

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
  ER_LASER = 'ER Laser',
  PULSE_LASER = 'Pulse Laser',
  ER_PULSE_LASER = 'ER Pulse Laser',
  HEAVY_LASER = 'Heavy Laser',
  PPC = 'PPC',
  FLAMER = 'Flamer',
  PLASMA_RIFLE = 'Plasma Rifle',
  AMS = 'Anti-Missile System',
}

/**
 * Ballistic weapon sub-types
 */
export enum BallisticWeaponType {
  AUTOCANNON = 'Autocannon',
  ULTRA_AC = 'Ultra AC',
  LB_X_AC = 'LB-X AC',
  ROTARY_AC = 'Rotary AC',
  LIGHT_AC = 'Light AC',
  HYPER_VELOCITY_AC = 'Hyper-Velocity AC',
  MACHINE_GUN = 'Machine Gun',
  GAUSS = 'Gauss Rifle',
  AMS = 'Anti-Missile System',
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
  ATM = 'ATM',
  MML = 'MML',
  THUNDERBOLT = 'Thunderbolt',
  NARC = 'NARC',
  INARC = 'iNARC',
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
  readonly damage: number | string;
  readonly heat: number;
  readonly ranges: WeaponRanges;
  readonly weight: number;
  readonly criticalSlots: number;
  readonly ammoPerTon?: number;
  readonly costCBills: number;
  readonly battleValue: number;
  readonly introductionYear: number;
  readonly isExplosive?: boolean;
  readonly special?: readonly string[];

  /**
   * Unit types that can mount this weapon.
   * If empty or undefined, defaults to [BATTLEMECH, VEHICLE, AEROSPACE] for backwards compatibility.
   */
  readonly allowedUnitTypes?: readonly UnitType[];

  /**
   * Equipment flags defining behavior and properties.
   * @see EquipmentFlag
   */
  readonly flags?: readonly EquipmentFlag[];

  /**
   * Locations where this weapon can be mounted.
   * If undefined, weapon can be mounted in any valid weapon location for the unit type.
   */
  readonly allowedLocations?: readonly string[];
}

