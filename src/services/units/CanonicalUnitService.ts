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
import {
  indexFamilies,
  parseUnitReference,
  unitFamilyKey,
  type UnitFamily,
  type UnitIndexOptions,
  type UnitLookupOptions,
} from '@/types/unit/UnitIndex';

import { IUnitIndexEntry, IUnitQueryCriteria } from '../common/types';
import { mapRawIndexRows, type RawUnitIndexEntry } from './unitIndexMapper';

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
  getIndex(options?: UnitIndexOptions): Promise<readonly IUnitIndexEntry[]>;
  getById(id: string, options?: UnitLookupOptions): Promise<IFullUnit | null>;
  getByIds(ids: string[], options?: UnitLookupOptions): Promise<IFullUnit[]>;
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

/** Catalog file names may contain `#`, so encode each path segment. */
function encodeSitePath(sitePath: string): string {
  return sitePath.split('/').map(encodeURIComponent).join('/');
}

function unitLoadKey(key: string, strict = false): string {
  return `${key}|${strict ? 'strict' : 'lenient'}`;
}

/** How long a family whose index 404'd is treated as absent before a retry. */
export const MISSING_FAMILY_TTL_MS = 30_000;

/**
 * Canonical Unit Service implementation
 */
export class CanonicalUnitService implements ICanonicalUnitService {
  private indexCache = new Map<UnitFamily, IUnitIndexEntry[]>();
  /** Families whose index 404'd, with the time the absence expires. */
  private missingFamilies = new Map<UnitFamily, number>();
  /**
   * In-flight loads. A load may cache its result only while it is still the
   * registered entry, so `clearCache` / `invalidateUnit` cancel stale writes.
   */
  private indexLoads = new Map<UnitFamily, Promise<IUnitIndexEntry[]>>();
  private unitLoads = new Map<string, Promise<IFullUnit | null>>();
  private unitCache: Map<string, IFullUnit> = new Map();

  private isFamilyMissing(family: UnitFamily): boolean {
    const expiresAt = this.missingFamilies.get(family);
    if (expiresAt === undefined) return false;
    if (Date.now() < expiresAt) return true;
    this.missingFamilies.delete(family);
    return false;
  }

  /**
   * Load JSON data - works on both server and client side using fetch
   */
  private async loadJson<T>(
    relativePath: string,
    strict = false,
    missingAllowed = false,
  ): Promise<T | null | undefined> {
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}${relativePath}`;
      const response = await fetch(url);
      if (!response.ok) {
        if (missingAllowed && response.status === 404) return undefined;
        if (strict)
          throw new Error(
            `Canonical source request failed (${response.status})`,
          );
        return null;
      }
      return (await response.json()) as T;
    } catch (error) {
      if (strict) throw error;
      return null;
    }
  }

  /**
   * Load the lightweight unit index
   */
  private async loadFamilyIndex(
    family: UnitFamily,
  ): Promise<IUnitIndexEntry[]> {
    const cached = this.indexCache.get(family);
    if (cached) return cached;
    if (this.isFamilyMissing(family)) return [];
    const pending = this.indexLoads.get(family);
    if (pending) return pending;
    const registered: { load?: Promise<IUnitIndexEntry[]> } = {};
    const load = (registered.load = (async () => {
      const data = await this.loadJson<{ units?: RawUnitIndexEntry[] }>(
        `/data/units/${family}/index.json`,
        true,
        true,
      );
      const current = this.indexLoads.get(family) === registered.load;
      if (data === undefined) {
        if (current)
          this.missingFamilies.set(family, Date.now() + MISSING_FAMILY_TTL_MS);
        return [];
      }
      if (!data || !Array.isArray(data.units))
        throw new Error('Canonical source index is invalid');
      const entries = mapRawIndexRows(data.units, family);
      if (current) this.indexCache.set(family, entries);
      return entries;
    })());
    this.indexLoads.set(family, load);
    try {
      return await load;
    } finally {
      if (this.indexLoads.get(family) === load) this.indexLoads.delete(family);
    }
  }

  getIndex = async (
    options: UnitIndexOptions = {},
  ): Promise<readonly IUnitIndexEntry[]> => {
    const indexes = await Promise.all(
      indexFamilies(options).map(async (family) => {
        try {
          return await this.loadFamilyIndex(family);
        } catch (error) {
          if (options.strict) throw error;
          return [];
        }
      }),
    );
    return indexes.length === 1 ? indexes[0] : indexes.flat();
  };

  /** Distinguishes an absent catalog from a present, empty family index. */
  async hasFamily(family: UnitFamily): Promise<boolean> {
    await this.loadFamilyIndex(family);
    return this.indexCache.has(family);
  }

  /**
   * Get full unit data by ID (lazy loads from static JSON)
   */
  getById = async (
    referenceId: string,
    options: UnitLookupOptions = {},
  ): Promise<IFullUnit | null> => {
    const { id, family } = parseUnitReference(referenceId, options.family);
    // Check cache first
    const key = unitFamilyKey(id, family);
    if (this.unitCache.has(key)) {
      return this.unitCache.get(key)!;
    }

    // Strict and lenient callers fail differently, so they never share a load.
    const loadKey = unitLoadKey(key, options.strict);
    const pending = this.unitLoads.get(loadKey);
    if (pending) return pending;
    const registered: { load?: Promise<IFullUnit | null> } = {};
    const load = (registered.load = (async () => {
      // Find in index to get file path
      const index = await this.getIndex(
        family ? { ...options, family } : options,
      );
      const entry = index.find((e) => e.id === id);

      if (!entry) {
        return null;
      }

      try {
        const unit = await this.loadJson<IFullUnit>(
          encodeSitePath(entry.filePath),
          options.strict,
        );
        if (!unit) {
          return null;
        }
        if (this.unitLoads.get(loadKey) === registered.load)
          this.unitCache.set(key, unit);
        return unit;
      } catch (error) {
        if (options.strict) throw error;
        return null;
      }
    })());
    this.unitLoads.set(loadKey, load);
    try {
      return await load;
    } finally {
      if (this.unitLoads.get(loadKey) === load) this.unitLoads.delete(loadKey);
    }
  };

  /**
   * Get multiple units by ID (parallel loading)
   */
  getByIds = async (
    ids: string[],
    options: UnitLookupOptions = {},
  ): Promise<IFullUnit[]> => {
    const results = await Promise.all(
      ids.map((id) => this.getById(id, options)),
    );
    return results.filter((unit): unit is IFullUnit => unit !== null);
  };

  /**
   * Query units by criteria (filters index in memory)
   */
  query = async (
    criteria: IUnitQueryCriteria,
  ): Promise<readonly IUnitIndexEntry[]> => {
    let results = await this.getIndex({ family: criteria.family });

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

  invalidateUnit = (id: string, family?: UnitFamily): void => {
    const reference = parseUnitReference(id, family);
    const key = unitFamilyKey(reference.id, reference.family);
    this.unitCache.delete(key);
    this.unitLoads.delete(unitLoadKey(key, true));
    this.unitLoads.delete(unitLoadKey(key, false));
  };

  /**
   * Clear caches (for testing)
   */
  clearCache = (): void => {
    this.indexCache.clear();
    this.indexLoads.clear();
    this.unitLoads.clear();
    this.missingFamilies.clear();
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
