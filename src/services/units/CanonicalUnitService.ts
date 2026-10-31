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
import { logger } from '@/utils/logger';

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
  private async loadJson<T>(
    relativePath: string,
    strict = false,
  ): Promise<T | null> {
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}${relativePath}`;
      const response = await fetch(url);
      if (!response.ok) {
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
  getIndex = async (
    options: { readonly strict?: boolean } = {},
  ): Promise<readonly IUnitIndexEntry[]> => {
    if (this.indexCache !== null) {
      return this.indexCache;
    }

    try {
      const data = await this.loadJson<{ units?: RawUnitIndexEntry[] }>(
        this.indexPath,
        options.strict,
      );

      if (!data || !Array.isArray(data.units)) {
        if (options.strict)
          throw new Error('Canonical source index is invalid');
        return [];
      }
      if (data.units.length === 0) return [];

      const { entries, skipped } = mapRawIndexRows(data.units);
      if (skipped.length > 0) {
        if (options.strict) throw skipped[0];
        for (const error of skipped) {
          logger.warn(`Skipping unit index row: ${error.message}`);
        }
        // Not cached, so a later strict load still sees the bad row.
        return entries;
      }
      this.indexCache = entries;
      return this.indexCache;
    } catch (error) {
      if (options.strict) throw error;
      // Index not available - return empty array
      return [];
    }
  };

  /**
   * Get full unit data by ID (lazy loads from static JSON)
   */
  getById = async (
    id: string,
    options: { readonly strict?: boolean } = {},
  ): Promise<IFullUnit | null> => {
    // Check cache first
    if (this.unitCache.has(id)) {
      return this.unitCache.get(id)!;
    }

    // Find in index to get file path
    const index = await this.getIndex(options);
    const entry = index.find((e) => e.id === id);

    if (!entry) {
      return null;
    }

    try {
      const unit = await this.loadJson<IFullUnit>(
        entry.filePath,
        options.strict,
      );
      if (!unit) {
        return null;
      }
      this.unitCache.set(id, unit);
      return unit;
    } catch (error) {
      if (options.strict) throw error;
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

  invalidateUnit = (id: string): void => {
    this.unitCache.delete(id);
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
