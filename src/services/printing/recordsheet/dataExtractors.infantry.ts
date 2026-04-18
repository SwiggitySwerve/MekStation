/**
 * Infantry Record Sheet Data Extractor
 *
 * Produces `IInfantryRecordSheetData` from an infantry platoon unit configuration.
 */

import {
  IInfantryRecordSheetData,
  IInfantryFieldGunSheet,
} from '@/types/printing';

import { extractHeader } from './dataExtractors';

/** Infantry-specific unit config fields. */
export interface IInfantryUnitConfig {
  id: string;
  name: string;
  chassis: string;
  model: string;
  tonnage: number;
  techBase: string;
  rulesLevel: string;
  era: string;
  battleValue?: number;
  cost?: number;
  /** Total troopers in the platoon. */
  platoonSize?: number;
  /** Movement mode. */
  motiveType?: IInfantryRecordSheetData['motiveType'];
  /** Primary weapon name. */
  primaryWeapon?: string;
  /** Secondary weapons with anti-personnel ratio. */
  secondaryWeapons?: Array<{ name: string; perTrooperRatio: number }>;
  /** Field gun block — 1 gun per 7 men. */
  fieldGun?: {
    name: string;
    count: number;
    damage: number | string;
    minimumRange: number;
    shortRange: number;
    mediumRange: number;
    longRange: number;
  };
  /** Specialization badge string (anti-mech, marine, scuba, mountain, xct). */
  specialization?: string;
  /** Gunnery skill (default 5). */
  gunnery?: number;
  /** Anti-mech skill (default 6). */
  antiMech?: number;
}

/**
 * Extract infantry record sheet data.
 */
export function extractInfantryData(
  unit: IInfantryUnitConfig,
): IInfantryRecordSheetData {
  const fieldGun: IInfantryFieldGunSheet | undefined = unit.fieldGun
    ? {
        name: unit.fieldGun.name,
        count: unit.fieldGun.count,
        damage: unit.fieldGun.damage,
        minimumRange: unit.fieldGun.minimumRange,
        shortRange: unit.fieldGun.shortRange,
        mediumRange: unit.fieldGun.mediumRange,
        longRange: unit.fieldGun.longRange,
      }
    : undefined;

  return {
    unitType: 'infantry',
    header: extractHeader(unit as Parameters<typeof extractHeader>[0]),
    platoonSize: unit.platoonSize ?? 28,
    motiveType: unit.motiveType ?? 'Foot',
    primaryWeapon: unit.primaryWeapon ?? 'Auto Rifle',
    secondaryWeapons: unit.secondaryWeapons ?? [],
    fieldGun,
    specialization: unit.specialization,
    gunnery: unit.gunnery ?? 5,
    antiMech: unit.antiMech ?? 6,
  };
}
