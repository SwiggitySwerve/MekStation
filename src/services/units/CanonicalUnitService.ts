/**
 * Canonical Unit Service
 *
 * Provides read-only access to bundled canonical unit data.
 * Uses lazy loading for full unit data.
 * Supports both server-side (Node.js) and client-side (browser) loading.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import {
  createSingleton,
  type SingletonFactory,
} from '@/services/core/createSingleton';
import { Era } from '@/types/enums/Era';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { IUnitIndexEntry, IUnitQueryCriteria } from '../common/types';

/**
 * Raw unit index entry from index.json
 */
interface RawUnitIndexEntry {
  id: string;
  chassis: string;
  model: string; // This is 'variant' in our system
  tonnage: number;
  techBase: string;
  year: number;
  role?: string;
  rulesLevel?: string;
  cost?: number;
  bv?: number;
  path: string;
}

/**
 * Map raw index data to IUnitIndexEntry format
 */
function mapRawToIndexEntry(raw: RawUnitIndexEntry): IUnitIndexEntry {
  // Map techBase string to TechBase enum
  let techBase: TechBase = TechBase.INNER_SPHERE;
  if (raw.techBase === 'CLAN') {
    techBase = TechBase.CLAN;
  } else if (raw.techBase === 'MIXED') {
    techBase = TechBase.INNER_SPHERE; // Default mixed to IS
  }

  // Determine weight class from tonnage
  let weightClass: WeightClass;
  if (raw.tonnage <= 35) {
    weightClass = WeightClass.LIGHT;
  } else if (raw.tonnage <= 55) {
    weightClass = WeightClass.MEDIUM;
  } else if (raw.tonnage <= 75) {
    weightClass = WeightClass.HEAVY;
  } else {
    weightClass = WeightClass.ASSAULT;
  }

  // Map era from file path (e.g., "2-star-league/standard/...")
  let era: Era = Era.LATE_SUCCESSION_WARS;
  if (raw.path.includes('1-age-of-war')) {
    era = Era.AGE_OF_WAR;
  } else if (raw.path.includes('2-star-league')) {
    era = Era.STAR_LEAGUE;
  } else if (raw.path.includes('3-succession-wars')) {
    era = Era.LATE_SUCCESSION_WARS;
  } else if (raw.path.includes('4-clan-invasion')) {
    era = Era.CLAN_INVASION;
  } else if (raw.path.includes('5-civil-war')) {
    era = Era.CIVIL_WAR;
  } else if (raw.path.includes('6-dark-age')) {
    era = Era.DARK_AGE;
  } else if (raw.path.includes('7-ilclan')) {
    era = Era.IL_CLAN;
  }

  return {
    id: raw.id,
    name: `${raw.chassis} ${raw.model}`,
    chassis: raw.chassis,
    variant: raw.model,
    tonnage: raw.tonnage,
    techBase,
    era,
    weightClass,
    unitType: UnitType.BATTLEMECH,
    filePath: `/data/units/battlemechs/${raw.path}`,
    year: raw.year,
    role: raw.role,
    rulesLevel: raw.rulesLevel,
    cost: raw.cost,
    bv: raw.bv,
  };
}

/**
 * Full unit data structure (placeholder - will be defined in types)
 */
export interface IFullUnit {
  readonly id: string;
  readonly chassis: string;
  readonly variant: string;
  readonly tonnage: number;
  readonly techBase: string;
  readonly era: string;
  readonly unitType: string;
  // Additional fields for complete unit data
  readonly equipment?: unknown[];
  readonly armor?: Record<string, number>;
  readonly structure?: Record<string, number>;
  [key: string]: unknown;
}

/**
 * Canonical unit service interface
 */
export interface ICanonicalUnitService {
  getIndex(): Promise<readonly IUnitIndexEntry[]>;
  getById(id: string): Promise<IFullUnit | null>;
  getByIds(ids: string[]): Promise<IFullUnit[]>;
  query(criteria: IUnitQueryCriteria): Promise<readonly IUnitIndexEntry[]>;
}

/**
 * Get the base URL for fetching data
 * On server-side, we need an absolute URL
 * On client-side, relative URLs work fine
 */
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use relative URL
    return '';
  }
  // Server-side: construct absolute URL
  // Use NEXT_PUBLIC_BASE_URL if set, otherwise default to localhost
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    `http://localhost:${process.env.PORT || 3000}`;
  return baseUrl;
}

/**
 * Canonical Unit Service implementation
 */
export class CanonicalUnitService implements ICanonicalUnitService {
  private indexCache: IUnitIndexEntry[] | null = null;
  private unitCache: Map<string, IFullUnit> = new Map();
  private indexPath = '/data/units/battlemechs/index.json';

  /**
   * Load JSON data - works on both server and client side using fetch
   */
  private async loadJson<T>(relativePath: string): Promise<T | null> {
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}${relativePath}`;
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }
      return (await response.json()) as T;
    } catch {
      return null;
    }
  }

  /**
   * Load the lightweight unit index
   */
  async getIndex(): Promise<readonly IUnitIndexEntry[]> {
    if (this.indexCache) {
      return this.indexCache;
    }

    try {
      const data = await this.loadJson<{ units?: RawUnitIndexEntry[] }>(
        this.indexPath,
      );

      if (!data) {
        this.indexCache = [];
        return this.indexCache;
      }

      // Map raw index data to IUnitIndexEntry format
      this.indexCache = (data.units || []).map(mapRawToIndexEntry);
      return this.indexCache;
    } catch {
      // Index not available - return empty array
      this.indexCache = [];
      return this.indexCache;
    }
  }

  /**
   * Get full unit data by ID (lazy loads from static JSON)
   */
  async getById(id: string): Promise<IFullUnit | null> {
    // Check cache first
    if (this.unitCache.has(id)) {
      return this.unitCache.get(id)!;
    }

    // Find in index to get file path
    const index = await this.getIndex();
    const entry = index.find((e) => e.id === id);

    if (!entry) {
      return null;
    }

    try {
      const unit = await this.loadJson<IFullUnit>(entry.filePath);
      if (!unit) {
        return null;
      }
      this.unitCache.set(id, unit);
      return unit;
    } catch {
      return null;
    }
  }

  /**
   * Get multiple units by ID (parallel loading)
   */
  async getByIds(ids: string[]): Promise<IFullUnit[]> {
    const results = await Promise.all(ids.map((id) => this.getById(id)));
    return results.filter((unit): unit is IFullUnit => unit !== null);
  }

  /**
   * Query units by criteria (filters index in memory)
   */
  async query(
    criteria: IUnitQueryCriteria,
  ): Promise<readonly IUnitIndexEntry[]> {
    let results = await this.getIndex();

    if (criteria.techBase !== undefined) {
      results = results.filter((e) => e.techBase === criteria.techBase);
    }

    if (criteria.era !== undefined) {
      results = results.filter((e) => e.era === criteria.era);
    }

    if (criteria.weightClass !== undefined) {
      results = results.filter((e) => e.weightClass === criteria.weightClass);
    }

    if (criteria.unitType !== undefined) {
      results = results.filter((e) => e.unitType === criteria.unitType);
    }

    if (criteria.minTonnage !== undefined) {
      results = results.filter((e) => e.tonnage >= criteria.minTonnage!);
    }

    if (criteria.maxTonnage !== undefined) {
      results = results.filter((e) => e.tonnage <= criteria.maxTonnage!);
    }

    return results;
  }

  /**
   * Clear caches (for testing)
   */
  clearCache(): void {
    this.indexCache = null;
    this.unitCache.clear();
  }
}

// Singleton instance with lazy initialization
const canonicalUnitServiceFactory: SingletonFactory<CanonicalUnitService> =
  createSingleton((): CanonicalUnitService => new CanonicalUnitService());

export function getCanonicalUnitService(): CanonicalUnitService {
  return canonicalUnitServiceFactory.get();
}

export function resetCanonicalUnitService(): void {
  canonicalUnitServiceFactory.reset();
}

/** @internal Legacy alias */
export function _resetCanonicalUnitService(): void {
  canonicalUnitServiceFactory.reset();
}

// Legacy export for backward compatibility
// @deprecated Use getCanonicalUnitService() instead
export const canonicalUnitService = getCanonicalUnitService();
