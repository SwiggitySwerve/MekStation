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
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { IUnitIndexEntry, IUnitQueryCriteria } from '../common/types';
import { getUnitIndexWeightClass } from './unitWeightClass';

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

const TECH_BASE_BY_RAW_VALUE: Readonly<Record<string, TechBase>> = {
  CLAN: TechBase.CLAN,
  INNER_SPHERE: TechBase.INNER_SPHERE,
  MIXED: TechBase.INNER_SPHERE,
};

const ERA_BY_PATH_SEGMENT = [
  { segment: '1-age-of-war', era: Era.AGE_OF_WAR },
  { segment: '2-star-league', era: Era.STAR_LEAGUE },
  { segment: '3-succession-wars', era: Era.LATE_SUCCESSION_WARS },
  { segment: '4-clan-invasion', era: Era.CLAN_INVASION },
  { segment: '5-civil-war', era: Era.CIVIL_WAR },
  { segment: '6-dark-age', era: Era.DARK_AGE },
  { segment: '7-ilclan', era: Era.IL_CLAN },
] as const;

function techBaseFromRawValue(rawTechBase: string): TechBase {
  return TECH_BASE_BY_RAW_VALUE[rawTechBase] ?? TechBase.INNER_SPHERE;
}

function eraFromPath(filePath: string): Era {
  return (
    ERA_BY_PATH_SEGMENT.find(({ segment }) => filePath.includes(segment))
      ?.era ?? Era.LATE_SUCCESSION_WARS
  );
}

/**
 * Map raw index data to IUnitIndexEntry format
 */
function mapRawToIndexEntry(raw: RawUnitIndexEntry): IUnitIndexEntry {
  return {
    id: raw.id,
    name: `${raw.chassis} ${raw.model}`,
    chassis: raw.chassis,
    variant: raw.model,
    tonnage: raw.tonnage,
    techBase: techBaseFromRawValue(raw.techBase),
    era: eraFromPath(raw.path),
    weightClass: getUnitIndexWeightClass(raw.tonnage),
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
 *
 * Optional temporal fields (`currentVersion`, `createdAt`, `updatedAt`) carry
 * version metadata for custom units that have been persisted via the
 * `CustomUnitApiService` versioning endpoints. They are absent on canonical
 * (bundled) units and on unsaved drafts. Collapsed in here from the former
 * `IUnitWithVersion` extension — the wrapper added no architectural value
 * and forced ad-hoc casts at the API boundary.
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
  // Optional version metadata — present only on persisted custom units.
  readonly currentVersion?: number;
  readonly createdAt?: string;
  readonly updatedAt?: string;
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
    `http://localhost:${process.env.PORT || 3600}`;
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
  getIndex = async (): Promise<readonly IUnitIndexEntry[]> => {
    if (this.indexCache !== null) {
      return this.indexCache;
    }

    try {
      const data = await this.loadJson<{ units?: RawUnitIndexEntry[] }>(
        this.indexPath,
      );

      if (!data || !Array.isArray(data.units) || data.units.length === 0) {
        return [];
      }

      // Map raw index data to IUnitIndexEntry format
      this.indexCache = data.units.map(mapRawToIndexEntry);
      return this.indexCache;
    } catch {
      // Index not available - return empty array
      return [];
    }
  };

  /**
   * Get full unit data by ID (lazy loads from static JSON)
   */
  getById = async (id: string): Promise<IFullUnit | null> => {
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
  };

  /**
   * Get multiple units by ID (parallel loading)
   */
  getByIds = async (ids: string[]): Promise<IFullUnit[]> => {
    const results = await Promise.all(ids.map((id) => this.getById(id)));
    return results.filter((unit): unit is IFullUnit => unit !== null);
  };

  /**
   * Query units by criteria (filters index in memory)
   */
  query = async (
    criteria: IUnitQueryCriteria,
  ): Promise<readonly IUnitIndexEntry[]> => {
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
  };

  /**
   * Clear caches (for testing)
   */
  clearCache = (): void => {
    this.indexCache = null;
    this.unitCache.clear();
  };
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
