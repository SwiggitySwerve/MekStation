import type { IAmmunition } from '@/types/equipment/AmmunitionTypes';
import type { IElectronics } from '@/types/equipment/ElectronicsTypes';
import type { IMiscEquipment } from '@/types/equipment/MiscEquipmentTypes';
import type { IWeapon } from '@/types/equipment/weapons/interfaces';

import {
  parseAllowedUnitTypes,
  parseAmmoCategory,
  parseAmmoVariant,
  parseElectronicsCategory,
  parseFlags,
  parseMiscEquipmentCategory,
  parseRulesLevel,
  parseTechBase,
  parseWeaponCategory,
} from './EquipmentParsers';

export interface IRawWeaponData {
  id: string;
  name: string;
  category: string;
  subType: string;
  techBase: string;
  rulesLevel: string;
  damage: number | string;
  heat: number;
  ranges: {
    minimum: number;
    short: number;
    medium: number;
    long: number;
    extreme?: number;
  };
  weight: number;
  criticalSlots: number;
  ammoPerTon?: number;
  costCBills: number;
  battleValue: number;
  introductionYear: number;
  isExplosive?: boolean;
  special?: string[];
  allowedUnitTypes?: string[];
  flags?: string[];
  allowedLocations?: string[];
}

export interface IRawAmmunitionData {
  id: string;
  name: string;
  category: string;
  variant: string;
  techBase: string;
  rulesLevel: string;
  compatibleWeaponIds: string[];
  shotsPerTon: number;
  weight: number;
  criticalSlots: number;
  costPerTon: number;
  battleValue: number;
  isExplosive: boolean;
  introductionYear: number;
  damageModifier?: number;
  rangeModifier?: number;
  special?: string[];
  allowedUnitTypes?: string[];
  flags?: string[];
}

export interface IRawElectronicsData {
  id: string;
  name: string;
  category: string;
  techBase: string;
  rulesLevel: string;
  weight: number;
  criticalSlots: number;
  costCBills: number;
  battleValue: number;
  introductionYear: number;
  special?: string[];
  variableEquipmentId?: string;
  allowedUnitTypes?: string[];
  flags?: string[];
  allowedLocations?: string[];
}

export interface IRawMiscEquipmentData {
  id: string;
  name: string;
  category: string;
  techBase: string;
  rulesLevel: string;
  weight: number;
  criticalSlots: number;
  costCBills: number;
  battleValue: number;
  introductionYear: number;
  special?: string[];
  variableEquipmentId?: string;
  allowedUnitTypes?: string[];
  flags?: string[];
  allowedLocations?: string[];
}

export interface IEquipmentFile<T> {
  $schema?: string;
  version?: string;
  generatedAt?: string;
  count?: number;
  items: T[];
}

export function convertWeapon(raw: IRawWeaponData): IWeapon {
  const allowedUnitTypes = parseAllowedUnitTypes(raw.allowedUnitTypes);
  const flags = parseFlags(raw.flags);

  return {
    id: raw.id,
    name: raw.name,
    category: parseWeaponCategory(raw.category),
    subType: raw.subType,
    techBase: parseTechBase(raw.techBase),
    rulesLevel: parseRulesLevel(raw.rulesLevel),
    damage: raw.damage,
    heat: raw.heat,
    ranges: raw.ranges,
    weight: raw.weight,
    criticalSlots: raw.criticalSlots,
    ...(raw.ammoPerTon && { ammoPerTon: raw.ammoPerTon }),
    costCBills: raw.costCBills,
    battleValue: raw.battleValue,
    introductionYear: raw.introductionYear,
    ...(raw.isExplosive && { isExplosive: raw.isExplosive }),
    ...(raw.special && { special: raw.special }),
    ...(allowedUnitTypes.length > 0 && { allowedUnitTypes }),
    ...(flags.length > 0 && { flags }),
    ...(raw.allowedLocations && { allowedLocations: raw.allowedLocations }),
  };
}

export function convertAmmunition(raw: IRawAmmunitionData): IAmmunition {
  const allowedUnitTypes = parseAllowedUnitTypes(raw.allowedUnitTypes);
  const flags = parseFlags(raw.flags);

  return {
    id: raw.id,
    name: raw.name,
    category: parseAmmoCategory(raw.category),
    variant: parseAmmoVariant(raw.variant),
    techBase: parseTechBase(raw.techBase),
    rulesLevel: parseRulesLevel(raw.rulesLevel),
    compatibleWeaponIds: raw.compatibleWeaponIds,
    shotsPerTon: raw.shotsPerTon,
    weight: raw.weight,
    criticalSlots: raw.criticalSlots,
    costPerTon: raw.costPerTon,
    battleValue: raw.battleValue,
    isExplosive: raw.isExplosive,
    introductionYear: raw.introductionYear,
    ...(raw.damageModifier !== undefined && {
      damageModifier: raw.damageModifier,
    }),
    ...(raw.rangeModifier !== undefined && {
      rangeModifier: raw.rangeModifier,
    }),
    ...(raw.special && { special: raw.special }),
    ...(allowedUnitTypes.length > 0 && { allowedUnitTypes }),
    ...(flags.length > 0 && { flags }),
  };
}

export function convertElectronics(raw: IRawElectronicsData): IElectronics {
  const allowedUnitTypes = parseAllowedUnitTypes(raw.allowedUnitTypes);
  const flags = parseFlags(raw.flags);

  return {
    id: raw.id,
    name: raw.name,
    category: parseElectronicsCategory(raw.category),
    techBase: parseTechBase(raw.techBase),
    rulesLevel: parseRulesLevel(raw.rulesLevel),
    weight: raw.weight,
    criticalSlots: raw.criticalSlots,
    costCBills: raw.costCBills,
    battleValue: raw.battleValue,
    introductionYear: raw.introductionYear,
    ...(raw.special && { special: raw.special }),
    ...(raw.variableEquipmentId && {
      variableEquipmentId: raw.variableEquipmentId,
    }),
    ...(allowedUnitTypes.length > 0 && { allowedUnitTypes }),
    ...(flags.length > 0 && { flags }),
    ...(raw.allowedLocations && { allowedLocations: raw.allowedLocations }),
  };
}

export function convertMiscEquipment(
  raw: IRawMiscEquipmentData,
): IMiscEquipment {
  const allowedUnitTypes = parseAllowedUnitTypes(raw.allowedUnitTypes);
  const flags = parseFlags(raw.flags);

  return {
    id: raw.id,
    name: raw.name,
    category: parseMiscEquipmentCategory(raw.category),
    techBase: parseTechBase(raw.techBase),
    rulesLevel: parseRulesLevel(raw.rulesLevel),
    weight: raw.weight,
    criticalSlots: raw.criticalSlots,
    costCBills: raw.costCBills,
    battleValue: raw.battleValue,
    introductionYear: raw.introductionYear,
    ...(raw.special && { special: raw.special }),
    ...(raw.variableEquipmentId && {
      variableEquipmentId: raw.variableEquipmentId,
    }),
    ...(allowedUnitTypes.length > 0 && { allowedUnitTypes }),
    ...(flags.length > 0 && { flags }),
    ...(raw.allowedLocations && { allowedLocations: raw.allowedLocations }),
  };
}
