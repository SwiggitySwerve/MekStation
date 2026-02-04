/**
 * Unit Index and Query Types
 * 
 * Domain types for unit search, browsing, and filtering.
 * 
 * @spec openspec/specs/unit-services/spec.md
 */

import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/enums/Era';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

/**
 * Lightweight unit metadata for search and browsing
 */
export interface IUnitIndexEntry {
  readonly id: string;
  readonly name: string;
  readonly chassis: string;
  readonly variant: string;
  readonly tonnage: number;
  readonly techBase: TechBase;
  readonly era: Era;
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
  readonly fuzzy?: boolean;
  readonly limit?: number;
  readonly fields?: readonly string[];
}
