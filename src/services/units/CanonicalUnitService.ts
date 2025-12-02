/**
 * Canonical Unit Service
 * 
 * Provides read-only access to bundled canonical unit data.
 * Uses lazy loading for full unit data.
 * 
 * @spec openspec/specs/unit-services/spec.md
 */

import { IUnitIndexEntry, IUnitQueryCriteria } from '../common/types';
import { NotFoundError } from '../common/errors';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/enums/Era';
import { WeightClass } from '@/types/enums/WeightClass';

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
  let era: Era = Era.SUCCESSION_WARS;
  if (raw.path.includes('1-age-of-war')) {
    era = Era.AGE_OF_WAR;
  } else if (raw.path.includes('2-star-league')) {
    era = Era.STAR_LEAGUE;
  } else if (raw.path.includes('3-succession-wars')) {
    era = Era.SUCCESSION_WARS;
  } else if (raw.path.includes('4-clan-invasion')) {
    era = Era.CLAN_INVASION;
  } else if (raw.path.includes('5-civil-war')) {
    era = Era.CIVIL_WAR;
  } else if (raw.path.includes('6-dark-age')) {
    era = Era.DARK_AGE;
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
    unitType: 'BattleMech',
    filePath: `/data/units/battlemechs/${raw.path}`,
    year: raw.year,
    role: raw.role,
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
 * Canonical Unit Service implementation
 */
export class CanonicalUnitService implements ICanonicalUnitService {
  private indexCache: IUnitIndexEntry[] | null = null;
  private unitCache: Map<string, IFullUnit> = new Map();
  private indexPath = '/data/units/battlemechs/index.json';

  /**
   * Load the lightweight unit index
   */
  async getIndex(): Promise<readonly IUnitIndexEntry[]> {
    if (this.indexCache) {
      return this.indexCache;
    }

    try {
      const response = await fetch(this.indexPath);
      if (!response.ok) {
        // Index doesn't exist yet - return empty array
        this.indexCache = [];
        return this.indexCache;
      }
      
      const data = await response.json() as { units?: RawUnitIndexEntry[] };
      
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
    const entry = index.find(e => e.id === id);
    
    if (!entry) {
      return null;
    }

    try {
      const response = await fetch(entry.filePath);
      if (!response.ok) {
        return null;
      }
      
      const unit: IFullUnit = await response.json();
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
    const results = await Promise.all(
      ids.map(id => this.getById(id))
    );
    return results.filter((unit): unit is IFullUnit => unit !== null);
  }

  /**
   * Query units by criteria (filters index in memory)
   */
  async query(criteria: IUnitQueryCriteria): Promise<readonly IUnitIndexEntry[]> {
    let results = await this.getIndex();

    if (criteria.techBase !== undefined) {
      results = results.filter(e => e.techBase === criteria.techBase);
    }

    if (criteria.era !== undefined) {
      results = results.filter(e => e.era === criteria.era);
    }

    if (criteria.weightClass !== undefined) {
      results = results.filter(e => e.weightClass === criteria.weightClass);
    }

    if (criteria.unitType !== undefined) {
      results = results.filter(e => e.unitType === criteria.unitType);
    }

    if (criteria.minTonnage !== undefined) {
      results = results.filter(e => e.tonnage >= criteria.minTonnage!);
    }

    if (criteria.maxTonnage !== undefined) {
      results = results.filter(e => e.tonnage <= criteria.maxTonnage!);
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

// Singleton instance
export const canonicalUnitService = new CanonicalUnitService();

