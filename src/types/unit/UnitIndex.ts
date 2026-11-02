/**
 * Unit Index and Query Types
 *
 * Domain types for unit search, browsing, and filtering.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import { Era } from '@/types/enums/Era';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

export const UNIT_FAMILIES = [
  'battlemechs',
  'vehicles',
  'aerospace',
  'capital',
  'battlearmor',
  'infantry',
  'protomechs',
] as const;
export type UnitFamily = (typeof UNIT_FAMILIES)[number];
export interface UnitLookupOptions {
  readonly family?: UnitFamily;
  readonly strict?: boolean;
}
export interface UnitIndexOptions extends Omit<UnitLookupOptions, 'family'> {
  readonly family?: UnitFamily | 'all';
}
export function isUnitFamily(value: unknown): value is UnitFamily {
  return UNIT_FAMILIES.some((family) => family === value);
}
export function unitFamilyKey(
  id: string,
  family: UnitFamily = 'battlemechs',
): string {
  return `${family}:${id}`;
}

/** Persistent string references share the family key; legacy bare IDs are Mechs. */
export function formatUnitReference(id: string, family?: UnitFamily): string {
  return family && family !== 'battlemechs' ? unitFamilyKey(id, family) : id;
}

export function parseUnitReference(
  reference: string,
  family?: UnitFamily,
): Pick<IUnitIndexEntry, 'id' | 'family'> {
  const separator = reference.indexOf(':');
  const prefix = reference.slice(0, separator);
  if (separator < 1 || !isUnitFamily(prefix))
    return { id: reference, ...(family ? { family } : {}) };
  if (family && family !== prefix)
    throw new Error('Unit reference family conflicts with requested family');
  const id = reference.slice(separator + 1);
  if (!id) throw new Error('Unit reference requires an id');
  return { id, family: prefix };
}
export function matchesUnitFamily(
  unit: { readonly family?: UnitFamily },
  family: UnitFamily | 'all' = 'battlemechs',
): boolean {
  return family === 'all' || (unit.family ?? 'battlemechs') === family;
}
export function indexFamilies({
  family = 'battlemechs',
}: UnitIndexOptions): readonly UnitFamily[] {
  return family === 'all' ? UNIT_FAMILIES : [family];
}

/**
 * Lightweight unit metadata for search and browsing
 */
export interface IUnitIndexEntry {
  readonly family?: UnitFamily;
  readonly id: string;
  readonly name: string;
  readonly chassis: string;
  readonly variant: string;
  readonly tonnage: number;
  readonly techBase: TechBase;
  /** Absent when the catalog has no usable introduction year. */
  readonly era?: Era;
  readonly weightClass: WeightClass;
  readonly unitType: UnitType;
  readonly filePath: string;
  /** Introduction year */
  readonly year?: number;
  /** Role (e.g., Juggernaut, Scout, Striker) */
  readonly role?: string;
  /** Rules level (INTRODUCTORY, STANDARD, ADVANCED, EXPERIMENTAL) */
  readonly rulesLevel?: string;
  /** C-Bill cost */
  readonly cost?: number;
  /** Battle Value 2.0 */
  readonly bv?: number;
}

/**
 * Query criteria for filtering units
 */
export interface IUnitQueryCriteria {
  readonly family?: UnitFamily;
  readonly techBase?: TechBase;
  readonly era?: Era;
  readonly weightClass?: WeightClass;
  readonly unitType?: UnitType;
  readonly minTonnage?: number;
  readonly maxTonnage?: number;
}

/**
 * Search options
 */
export interface ISearchOptions {
  readonly family?: UnitFamily | 'all';
  readonly fuzzy?: boolean;
  readonly limit?: number;
  readonly fields?: readonly string[];
}
