/**
 * Ammunition Type Definitions
 * 
 * Defines ammunition types and compatibility rules.
 * 
 * @spec openspec/changes/implement-phase3-equipment/specs/ammunition-system/spec.md
 */

import { TechBase } from '../enums/TechBase';
import { RulesLevel } from '../enums/RulesLevel';

/**
 * Ammunition interface
 */
export interface IAmmunition {
  readonly id: string;
  readonly name: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly compatibleWeaponIds: readonly string[];
  readonly shotsPerTon: number;
  readonly weight: number; // Usually 1 ton
  readonly criticalSlots: number; // Usually 1
  readonly costPerTon: number;
  readonly battleValue: number;
  readonly isExplosive: boolean;
  readonly damageModifier?: number;
  readonly rangeModifier?: number;
  readonly introductionYear: number;
}

/**
 * Standard ammunition types
 */
export const AMMUNITION_TYPES: readonly IAmmunition[] = [
  // AC Ammo
  {
    id: 'ac-2-ammo',
    name: 'AC/2 Ammo',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    compatibleWeaponIds: ['ac-2'],
    shotsPerTon: 45,
    weight: 1,
    criticalSlots: 1,
    costPerTon: 1000,
    battleValue: 5,
    isExplosive: true,
    introductionYear: 2290,
  },
  {
    id: 'ac-5-ammo',
    name: 'AC/5 Ammo',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    compatibleWeaponIds: ['ac-5'],
    shotsPerTon: 20,
    weight: 1,
    criticalSlots: 1,
    costPerTon: 4500,
    battleValue: 9,
    isExplosive: true,
    introductionYear: 2250,
  },
  {
    id: 'ac-10-ammo',
    name: 'AC/10 Ammo',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    compatibleWeaponIds: ['ac-10'],
    shotsPerTon: 10,
    weight: 1,
    criticalSlots: 1,
    costPerTon: 6000,
    battleValue: 15,
    isExplosive: true,
    introductionYear: 2443,
  },
  {
    id: 'ac-20-ammo',
    name: 'AC/20 Ammo',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    compatibleWeaponIds: ['ac-20'],
    shotsPerTon: 5,
    weight: 1,
    criticalSlots: 1,
    costPerTon: 10000,
    battleValue: 22,
    isExplosive: true,
    introductionYear: 2500,
  },
  // Gauss Ammo
  {
    id: 'gauss-ammo',
    name: 'Gauss Ammo',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    compatibleWeaponIds: ['gauss-rifle', 'clan-gauss-rifle'],
    shotsPerTon: 8,
    weight: 1,
    criticalSlots: 1,
    costPerTon: 20000,
    battleValue: 40,
    isExplosive: false, // Gauss ammo doesn't explode
    introductionYear: 2590,
  },
  // MG Ammo
  {
    id: 'mg-ammo',
    name: 'MG Ammo',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    compatibleWeaponIds: ['machine-gun'],
    shotsPerTon: 200,
    weight: 1,
    criticalSlots: 1,
    costPerTon: 1000,
    battleValue: 1,
    isExplosive: true,
    introductionYear: 1950,
  },
  // Half-ton MG Ammo
  {
    id: 'mg-ammo-half',
    name: 'MG Ammo (Half)',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    compatibleWeaponIds: ['machine-gun'],
    shotsPerTon: 100,
    weight: 0.5,
    criticalSlots: 1,
    costPerTon: 500,
    battleValue: 1,
    isExplosive: true,
    introductionYear: 1950,
  },
  // LRM Ammo
  {
    id: 'lrm-ammo',
    name: 'LRM Ammo',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    compatibleWeaponIds: ['lrm-5', 'lrm-10', 'lrm-15', 'lrm-20'],
    shotsPerTon: 120, // 120 missiles, usage varies by launcher
    weight: 1,
    criticalSlots: 1,
    costPerTon: 30000,
    battleValue: 17,
    isExplosive: true,
    introductionYear: 2295,
  },
  // SRM Ammo
  {
    id: 'srm-ammo',
    name: 'SRM Ammo',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    compatibleWeaponIds: ['srm-2', 'srm-4', 'srm-6'],
    shotsPerTon: 100, // 100 missiles
    weight: 1,
    criticalSlots: 1,
    costPerTon: 27000,
    battleValue: 12,
    isExplosive: true,
    introductionYear: 2370,
  },
  // Streak SRM Ammo
  {
    id: 'streak-srm-ammo',
    name: 'Streak SRM Ammo',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    compatibleWeaponIds: ['streak-srm-2', 'streak-srm-4', 'streak-srm-6'],
    shotsPerTon: 100,
    weight: 1,
    criticalSlots: 1,
    costPerTon: 54000,
    battleValue: 17,
    isExplosive: true,
    introductionYear: 2647,
  },
] as const;

/**
 * Get ammunition by ID
 */
export function getAmmunitionById(id: string): IAmmunition | undefined {
  return AMMUNITION_TYPES.find(a => a.id === id);
}

/**
 * Get compatible ammunition for a weapon
 */
export function getCompatibleAmmunition(weaponId: string): IAmmunition[] {
  return AMMUNITION_TYPES.filter(a => a.compatibleWeaponIds.includes(weaponId));
}

/**
 * Check if ammunition is compatible with weapon
 */
export function isAmmoCompatible(ammoId: string, weaponId: string): boolean {
  const ammo = getAmmunitionById(ammoId);
  return ammo?.compatibleWeaponIds.includes(weaponId) ?? false;
}

/**
 * CASE (Cellular Ammunition Storage Equipment) protection rules
 */
export interface CASEProtection {
  readonly type: 'CASE' | 'CASE_II';
  readonly techBase: TechBase;
  readonly weight: number;
  readonly criticalSlots: number;
  readonly protectsAdjacentLocations: boolean;
  readonly preventsTorsoDestruction: boolean;
}

export const CASE_DEFINITIONS: readonly CASEProtection[] = [
  {
    type: 'CASE',
    techBase: TechBase.INNER_SPHERE,
    weight: 0.5,
    criticalSlots: 1,
    protectsAdjacentLocations: false,
    preventsTorsoDestruction: true,
  },
  {
    type: 'CASE_II',
    techBase: TechBase.INNER_SPHERE,
    weight: 1,
    criticalSlots: 1,
    protectsAdjacentLocations: true,
    preventsTorsoDestruction: true,
  },
  {
    type: 'CASE',
    techBase: TechBase.CLAN,
    weight: 0, // Free for Clan
    criticalSlots: 0, // Integrated
    protectsAdjacentLocations: false,
    preventsTorsoDestruction: true,
  },
] as const;

