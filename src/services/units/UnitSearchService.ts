/**
 * Unit Search Service
 *
 * MiniSearch-powered full-text search across all units.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import MiniSearch from 'minisearch';

import { IUnitIndexEntry, ISearchOptions } from '../common/types';
import { canonicalUnitService } from './CanonicalUnitService';
import { customUnitApiService } from './CustomUnitApiService';

/**
 * Unit search service interface
 */
export interface IUnitSearchService {
  initialize(): Promise<void>;
  search(query: string, options?: ISearchOptions): IUnitIndexEntry[];
  addToIndex(unit: IUnitIndexEntry): void;
  removeFromIndex(id: string): void;
  rebuildIndex(): Promise<void>;
}

/**
 * Unit Search Service implementation
 */
export class UnitSearchService implements IUnitSearchService {
  private searchIndex: MiniSearch<IUnitIndexEntry> | null = null;
  private allUnits: Map<string, IUnitIndexEntry> = new Map();
  private initialized = false;

  /**
   * Initialize the search index
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Create MiniSearch instance
    this.searchIndex = new MiniSearch<IUnitIndexEntry>({
      fields: ['name', 'chassis', 'variant'],
      storeFields: [
        'id',
        'name',
        'chassis',
        'variant',
        'tonnage',
        'techBase',
        'era',
        'weightClass',
        'unitType',
        'filePath',
      ],
      searchOptions: {
        boost: { name: 2, chassis: 1.5 },
        fuzzy: 0.2,
        prefix: true,
      },
    });

    // Load canonical units
    const canonicalUnits = await canonicalUnitService.getIndex();
    for (const unit of canonicalUnits) {
      this.allUnits.set(unit.id, unit);
    }

    // Load custom units from API
    const customUnits = await customUnitApiService.list();
    for (const customUnit of customUnits) {
      // Transform custom unit to IUnitIndexEntry format
      const unit: IUnitIndexEntry = {
        id: customUnit.id,
        name: `${customUnit.chassis} ${customUnit.variant}`,
        chassis: customUnit.chassis,
        variant: customUnit.variant,
        tonnage: customUnit.tonnage,
        techBase: customUnit.techBase,
        era: customUnit.era,
        weightClass: customUnit.weightClass,
        unitType: customUnit.unitType as IUnitIndexEntry['unitType'],
        filePath: '', // Custom units don't have file paths
      };
      this.allUnits.set(unit.id, unit);
    }

    // Add all to search index
    this.searchIndex.addAll(Array.from(this.allUnits.values()));
    this.initialized = true;
  }

  /**
   * Search units by query string
   */
  search(query: string, options?: ISearchOptions): IUnitIndexEntry[] {
    if (!this.searchIndex) {
      return [];
    }

    const searchOptions = {
      fuzzy: options?.fuzzy ?? 0.2,
      prefix: true,
      fields: options?.fields as string[] | undefined,
    };

    const results = this.searchIndex.search(query, searchOptions);

    let units = results
      .map((result) => this.allUnits.get(result.id))
      .filter((unit): unit is IUnitIndexEntry => unit !== undefined);

    if (options?.limit !== undefined) {
      units = units.slice(0, options.limit);
    }

    return units;
  }

  /**
   * Add a unit to the search index
   */
  addToIndex(unit: IUnitIndexEntry): void {
    if (!this.searchIndex) {
      return;
    }

    // Remove if exists (for updates)
    if (this.allUnits.has(unit.id)) {
      this.searchIndex.discard(unit.id);
    }

    this.allUnits.set(unit.id, unit);
    this.searchIndex.add(unit);
  }

  /**
   * Remove a unit from the search index
   */
  removeFromIndex(id: string): void {
    if (!this.searchIndex || !this.allUnits.has(id)) {
      return;
    }

    this.searchIndex.discard(id);
    this.allUnits.delete(id);
  }

  /**
   * Rebuild the entire search index
   */
  async rebuildIndex(): Promise<void> {
    this.initialized = false;
    this.searchIndex = null;
    this.allUnits.clear();
    await this.initialize();
  }
}

// Singleton instance
export const unitSearchService = new UnitSearchService();
