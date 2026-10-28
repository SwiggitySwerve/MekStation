import type { ITemporalEntity } from '@/types/core/ITemporalEntity';
import type { IAmmunition } from '@/types/equipment/AmmunitionTypes';
import type { IElectronics } from '@/types/equipment/ElectronicsTypes';
import type { IMiscEquipment } from '@/types/equipment/MiscEquipmentTypes';

import {
  WeaponCategory,
  type IWeapon,
} from '@/types/equipment/weapons/interfaces';

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

export interface IRawWeaponData extends Pick<
  ITemporalEntity,
  'introductionYear' | 'extinctionYear' | 'reintroductionYear'
> {
  id: string;
  name: string;
  category: string;
  subType: string;
  techBase: string;
  rulesLevel: string;
  damage: number | string;
  heat: number;
  // Optional: physical / melee weapons (physical.json) carry no ranges block.
  ranges?: {
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
  isExplosive?: boolean;
  special?: string[];
  allowedUnitTypes?: string[];
  flags?: string[];
  allowedLocations?: string[];
}

/** A physical.json row (PhysicalWeaponContract): sized by the 'Mech's tonnage. */
export interface IRawPhysicalWeaponData extends Pick<
  ITemporalEntity,
  'introductionYear' | 'extinctionYear' | 'reintroductionYear'
> {
  id: string;
  type: string;
  name: string;
  techBase: string;
  rulesLevel: string;
  allowedUnitTypes?: string[];
}

export interface IRawAmmunitionData extends Pick<
  ITemporalEntity,
  'introductionYear' | 'extinctionYear' | 'reintroductionYear'
> {
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
  damageModifier?: number;
  rangeModifier?: number;
  special?: string[];
  allowedUnitTypes?: string[];
  flags?: string[];
}

export interface IRawElectronicsData extends Pick<
  ITemporalEntity,
  'introductionYear' | 'extinctionYear' | 'reintroductionYear'
> {
  id: string;
  name: string;
  category: string;
  techBase: string;
  rulesLevel: string;
  weight: number;
  criticalSlots: number;
  costCBills: number;
  battleValue: number;
  special?: string[];
  variableEquipmentId?: string;
  allowedUnitTypes?: string[];
  flags?: string[];
  allowedLocations?: string[];
}

export interface IRawMiscEquipmentData extends Pick<
  ITemporalEntity,
  'introductionYear' | 'extinctionYear' | 'reintroductionYear'
> {
  id: string;
  name: string;
  category: string;
  techBase: string;
  rulesLevel: string;
  weight: number;
  criticalSlots: number;
  costCBills: number;
  battleValue: number;
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
    // Omit ranges entirely for rangeless (physical/melee) weapons rather than
    // setting `ranges: undefined`, keeping the object shape honest.
    ...(raw.ranges && { ranges: raw.ranges }),
    weight: raw.weight,
    criticalSlots: raw.criticalSlots,
    ...(raw.ammoPerTon && { ammoPerTon: raw.ammoPerTon }),
    costCBills: raw.costCBills,
    battleValue: raw.battleValue,
    introductionYear: raw.introductionYear,
    extinctionYear: raw.extinctionYear,
    reintroductionYear: raw.reintroductionYear,
    ...(raw.isExplosive && { isExplosive: raw.isExplosive }),
    ...(raw.special && { special: raw.special }),
    ...(allowedUnitTypes.length > 0 && { allowedUnitTypes }),
    ...(flags.length > 0 && { flags }),
    ...(raw.allowedLocations && { allowedLocations: raw.allowedLocations }),
  };
}

/**
 * Physical weapons have no fixed weight, slots or damage: each follows the
 * 'Mech's tonnage through its `variableEquipmentFormulas` entry, keyed by id.
 * Fixed fields are 0, as in the constants fallback (`equipmentAggregation`),
 * and physical attacks build no heat.
 */
export function convertPhysicalWeapon(raw: IRawPhysicalWeaponData): IWeapon {
  const allowedUnitTypes = parseAllowedUnitTypes(raw.allowedUnitTypes);

  return {
    id: raw.id,
    name: raw.name,
    category: WeaponCategory.PHYSICAL,
    subType: raw.type,
    techBase: parseTechBase(raw.techBase),
    rulesLevel: parseRulesLevel(raw.rulesLevel),
    damage: 'Variable',
    heat: 0,
    weight: 0,
    criticalSlots: 0,
    costCBills: 0,
    battleValue: 0,
    introductionYear: raw.introductionYear,
    extinctionYear: raw.extinctionYear,
    reintroductionYear: raw.reintroductionYear,
    ...(allowedUnitTypes.length > 0 && { allowedUnitTypes }),
    variableEquipmentId: raw.id,
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
    extinctionYear: raw.extinctionYear,
    reintroductionYear: raw.reintroductionYear,
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
    extinctionYear: raw.extinctionYear,
    reintroductionYear: raw.reintroductionYear,
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
    extinctionYear: raw.extinctionYear,
    reintroductionYear: raw.reintroductionYear,
    ...(raw.special && { special: raw.special }),
    ...(raw.variableEquipmentId && {
      variableEquipmentId: raw.variableEquipmentId,
    }),
    ...(allowedUnitTypes.length > 0 && { allowedUnitTypes }),
    ...(flags.length > 0 && { flags }),
    ...(raw.allowedLocations && { allowedLocations: raw.allowedLocations }),
  };
}
