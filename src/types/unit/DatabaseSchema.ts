/**
 * Database Schema Types
 *
 * Defines database schema for equipment and unit templates.
 *
 * @spec openspec/specs/database-schema/spec.md
 */

import { TechBase, RulesLevel, Era } from '../enums';

/**
 * Equipment database record
 */
export interface IEquipmentRecord {
  readonly id: string;
  readonly internalName: string;
  readonly displayName: string;
  readonly category: string;
  readonly subCategory?: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly introductionYear: number;
  readonly extinctionYear?: number;
  readonly reintroductionYear?: number;
  readonly weight: number;
  readonly criticalSlots: number;
  readonly costCBills: number;
  readonly battleValue: number;
  readonly heat?: number;
  readonly damage?: number | string;
  readonly rangeMin?: number;
  readonly rangeShort?: number;
  readonly rangeMedium?: number;
  readonly rangeLong?: number;
  readonly rangeExtreme?: number;
  readonly ammoPerTon?: number;
  readonly isExplosive: boolean;
  readonly flags: string[];
  readonly sourceBook?: string;
  readonly pageReference?: number;
}

/**
 * Unit template database record
 */
export interface IUnitTemplateRecord {
  readonly id: string;
  readonly chassis: string;
  readonly model: string;
  readonly variant?: string;
  readonly unitType: string;
  readonly configuration: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly era: Era;
  readonly year: number;
  readonly tonnage: number;
  readonly role?: string;
  readonly bv2: number;
  readonly cost: number;
  readonly source?: string;
  readonly templateData: string; // JSON blob of full unit data
  readonly isCanon: boolean;
  readonly isCustom: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Database query options
 */
export interface IQueryOptions {
  readonly offset?: number;
  readonly limit?: number;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Equipment filter criteria
 */
export interface IEquipmentFilter {
  readonly category?: string | string[];
  readonly techBase?: TechBase | TechBase[];
  readonly rulesLevel?: RulesLevel | RulesLevel[];
  readonly maxYear?: number;
  readonly minYear?: number;
  readonly maxWeight?: number;
  readonly minWeight?: number;
  readonly maxSlots?: number;
  readonly minSlots?: number;
  readonly searchText?: string;
  readonly flags?: string[];
}

/**
 * Unit filter criteria
 */
export interface IUnitFilter {
  readonly unitType?: string | string[];
  readonly techBase?: TechBase | TechBase[];
  readonly rulesLevel?: RulesLevel | RulesLevel[];
  readonly era?: Era | Era[];
  readonly maxYear?: number;
  readonly minYear?: number;
  readonly minTonnage?: number;
  readonly maxTonnage?: number;
  readonly searchText?: string;
  readonly isCanon?: boolean;
  readonly isCustom?: boolean;
}

/**
 * Query result
 */
export interface IQueryResult<T> {
  readonly items: readonly T[];
  readonly totalCount: number;
  readonly offset: number;
  readonly limit: number;
  readonly hasMore: boolean;
}

/**
 * Equipment database interface
 */
export interface IEquipmentDatabase {
  getById(id: string): Promise<IEquipmentRecord | null>;
  getByIds(ids: string[]): Promise<IEquipmentRecord[]>;
  query(
    filter: IEquipmentFilter,
    options?: IQueryOptions,
  ): Promise<IQueryResult<IEquipmentRecord>>;
  getCategories(): Promise<string[]>;
  getByCategory(category: string): Promise<IEquipmentRecord[]>;
  search(
    text: string,
    options?: IQueryOptions,
  ): Promise<IQueryResult<IEquipmentRecord>>;
}

/**
 * Unit database interface
 */
export interface IUnitDatabase {
  getById(id: string): Promise<IUnitTemplateRecord | null>;
  getByIds(ids: string[]): Promise<IUnitTemplateRecord[]>;
  query(
    filter: IUnitFilter,
    options?: IQueryOptions,
  ): Promise<IQueryResult<IUnitTemplateRecord>>;
  search(
    text: string,
    options?: IQueryOptions,
  ): Promise<IQueryResult<IUnitTemplateRecord>>;
  save(unit: IUnitTemplateRecord): Promise<string>;
  delete(id: string): Promise<boolean>;
}

/**
 * Database migration interface
 */
export interface IDatabaseMigration {
  readonly version: string;
  readonly description: string;
  up(): Promise<void>;
  down(): Promise<void>;
}

/**
 * Database migration manager
 */
export interface IDatabaseMigrationManager {
  getCurrentVersion(): Promise<string>;
  getPendingMigrations(): Promise<IDatabaseMigration[]>;
  migrate(targetVersion?: string): Promise<string[]>;
  rollback(steps?: number): Promise<string[]>;
}
