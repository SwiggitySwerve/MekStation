/**
 * NodeCanonicalUnitService
 *
 * Node-side (fs-based) implementation of ICanonicalUnitService.
 * Reads catalog units directly from disk using `fs.readFileSync`, bypassing
 * the fetch-based singleton (`getCanonicalUnitService()`), which routes through
 * Next.js / browser infrastructure that is unavailable in bare Node scripts.
 *
 * Design choice — Option A (separate factory, no singleton swap):
 *   This file exports `getNodeCanonicalUnitService()` as a standalone factory.
 *   The fetch-based singleton in `CanonicalUnitService.ts` is left completely
 *   untouched. CLI consumers (Phase 5 swarm runner) explicitly import this
 *   factory; browser/Next.js code never touches it.
 *   If `NODE_CATALOG_LOADER=fs` env flag is preferred in Phase 5, Phase 5 can
 *   wire this service at its entry point — no global swap needed.
 *
 * Loader pattern lifted from `scripts/validate-bv.ts:4648-5193`.
 *
 * @see openspec/changes/add-encounter-swarm-harness/design.md D2
 */

import * as fs from 'fs';
import * as path from 'path';

import { Era } from '@/types/enums/Era';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import type { IUnitIndexEntry, IUnitQueryCriteria } from '../common/types';

import {
  type ICanonicalUnitService,
  type IFullUnit,
} from './CanonicalUnitService';
import { parseUnit } from './unitLoaderService/unitContractAdapter';
import { getUnitIndexWeightClass } from './unitWeightClass';

// =============================================================================
// Raw index shapes (matches the on-disk index.json format)
// =============================================================================

/**
 * Raw unit entry as written in `public/data/units/battlemechs/index.json`.
 * Mirrors `RawUnitIndexEntry` in CanonicalUnitService.ts — kept local to avoid
 * coupling to that module's private type.
 */
interface RawIndexUnit {
  id: string;
  chassis: string;
  model: string;
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
 * Top-level shape of `public/data/units/battlemechs/index.json`.
 */
interface RawIndexFile {
  version: string;
  generatedAt: string;
  totalUnits: number;
  units: RawIndexUnit[];
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Derive an Era enum value from the unit's relative file path.
 * Path segments like "4-clan-invasion/..." encode era directly.
 */
function eraFromPath(filePath: string): Era {
  if (filePath.includes('1-age-of-war')) return Era.AGE_OF_WAR;
  if (filePath.includes('2-star-league')) return Era.STAR_LEAGUE;
  if (filePath.includes('3-succession-wars')) return Era.LATE_SUCCESSION_WARS;
  if (filePath.includes('4-clan-invasion')) return Era.CLAN_INVASION;
  if (filePath.includes('5-civil-war')) return Era.CIVIL_WAR;
  if (filePath.includes('6-dark-age')) return Era.DARK_AGE;
  if (filePath.includes('7-ilclan')) return Era.IL_CLAN;
  return Era.LATE_SUCCESSION_WARS;
}

/**
 * Map raw techBase string to TechBase enum.
 * Mixed units default to INNER_SPHERE to match CanonicalUnitService behaviour.
 */
function techBaseFromString(raw: string): TechBase {
  if (raw === 'CLAN') return TechBase.CLAN;
  return TechBase.INNER_SPHERE;
}

/**
 * Convert a raw index unit entry to the canonical IUnitIndexEntry shape.
 */
function mapRawToIndexEntry(raw: RawIndexUnit): IUnitIndexEntry {
  return {
    id: raw.id,
    name: `${raw.chassis} ${raw.model}`,
    chassis: raw.chassis,
    variant: raw.model,
    tonnage: raw.tonnage,
    techBase: techBaseFromString(raw.techBase),
    era: eraFromPath(raw.path),
    weightClass: getUnitIndexWeightClass(raw.tonnage),
    unitType: UnitType.BATTLEMECH,
    // filePath uses the same "/data/..." prefix as the fetch-based service so
    // any code that reads `entry.filePath` gets a consistent shape.
    filePath: `/data/units/battlemechs/${raw.path}`,
    year: raw.year,
    role: raw.role,
    rulesLevel: raw.rulesLevel,
    cost: raw.cost,
    bv: raw.bv,
  };
}

// =============================================================================
// NodeCanonicalUnitService
// =============================================================================

/**
 * Synchronous, fs-based catalog reader.
 *
 * Lifecycle:
 *   - Index and unit JSONs are loaded lazily on first access.
 *   - Both the parsed index and individual IFullUnit objects are cached in
 *     memory for the lifetime of the service instance, so batch loops that
 *     call `getById` repeatedly pay the disk cost only once per unit.
 *   - No top-level side effects — nothing is read at import time.
 *
 * Thread safety: this is a single-threaded Node service; no locking is needed.
 */
export class NodeCanonicalUnitService implements ICanonicalUnitService {
  /**
   * Base directory for catalog data files, resolved at construction time so
   * every unit load uses a consistent absolute path rooted at cwd.
   */
  private readonly baseDir: string;

  /** Absolute path to the index JSON file. */
  private readonly indexFilePath: string;

  /** Cached parsed index entries (null = not yet loaded). */
  private indexCache: IUnitIndexEntry[] | null = null;

  /** Map from raw RawIndexUnit entries keyed by unit id (for path lookups). */
  private rawIndexCache: Map<string, RawIndexUnit> | null = null;

  /** Cached version stamp from the index file (populated when index loads). */
  private indexVersionCache: string | null = null;

  /** Per-unit IFullUnit cache — avoids re-reading disk on repeated getById calls. */
  private readonly unitCache: Map<string, IFullUnit> = new Map();

  constructor(
    /** Override base directory for testing; defaults to `process.cwd()`. */
    baseDir?: string,
  ) {
    // Resolve once so all subsequent reads use a stable absolute path.
    this.baseDir = path.resolve(
      baseDir ?? process.cwd(),
      'public/data/units/battlemechs',
    );
    this.indexFilePath = path.resolve(this.baseDir, 'index.json');
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Load and cache the raw index file from disk.
   * Called lazily by the first public method that needs index data.
   * Subsequent calls return the cached version immediately.
   */
  private loadRawIndex(): {
    entries: IUnitIndexEntry[];
    raw: Map<string, RawIndexUnit>;
  } {
    if (this.indexCache !== null && this.rawIndexCache !== null) {
      return { entries: this.indexCache, raw: this.rawIndexCache };
    }

    let rawFile: RawIndexFile;
    try {
      rawFile = JSON.parse(
        fs.readFileSync(this.indexFilePath, 'utf-8'),
      ) as RawIndexFile;
    } catch (_err) {
      // Return empty gracefully so callers can propagate null / empty rather
      // than crashing the whole batch runner on a missing index.
      this.indexCache = [];
      this.rawIndexCache = new Map();
      return { entries: this.indexCache, raw: this.rawIndexCache };
    }

    const rawMap = new Map<string, RawIndexUnit>();
    for (const unit of rawFile.units) {
      rawMap.set(unit.id, unit);
    }

    this.indexCache = rawFile.units.map(mapRawToIndexEntry);
    this.rawIndexCache = rawMap;
    this.indexVersionCache = rawFile.version ?? 'unknown';
    return { entries: this.indexCache, raw: this.rawIndexCache };
  }

  // ---------------------------------------------------------------------------
  // ICanonicalUnitService implementation
  // ---------------------------------------------------------------------------

  /**
   * Return all index entries. Loads and caches the index on first call.
   */
  getIndex = async (): Promise<readonly IUnitIndexEntry[]> => {
    return this.loadRawIndex().entries;
  };

  /**
   * Return the version stamp from the catalog index file.
   * Used as a cache key by `bvCatalogPrewarmer` so the BV cache invalidates
   * automatically when the catalog regenerates with a new version.
   */
  getCatalogVersion = (): string => {
    if (this.indexVersionCache === null) {
      this.loadRawIndex();
    }
    return this.indexVersionCache ?? 'unknown';
  };

  /**
   * Load a single unit by id.
   * Resolves the file path from the raw index entry, reads + parses the JSON,
   * and caches the result in `unitCache` for subsequent calls.
   *
   * Returns null when the unit id is not found in the index or the file
   * cannot be read (missing / unreadable file, malformed JSON), so batch
   * loops can skip gracefully on a true "not found" condition.
   *
   * Boundary validation (`validation-patterns` — Zod Schema Validation at I/O
   * Boundaries): unit JSON is a bundled data file, so a *schema* violation is
   * a build/data bug, not a user condition. Once the file is read and JSON-
   * parsed successfully, it is validated through the generated `UnitContract`
   * via `parseUnit`; a schema mismatch throws a `UnitContractParseError`
   * naming the offending field path, failing loud at the loader boundary
   * instead of corrupting downstream domain code with a malformed unit.
   */
  getById = async (id: string): Promise<IFullUnit | null> => {
    // Return cached reference immediately — this also satisfies Task 2.8's
    // requirement that two calls for the same id return the same object.
    if (this.unitCache.has(id)) {
      return this.unitCache.get(id)!;
    }

    const { raw } = this.loadRawIndex();
    const entry = raw.get(id);
    if (!entry) {
      return null;
    }

    // Resolve the file path against the catalog base directory.
    // pattern: scripts/validate-bv.ts:5173 `path.join(basePath, iu.path)`
    const unitFilePath = path.join(this.baseDir, entry.path);

    // A missing / unreadable file or malformed JSON is a "not found" — return
    // null so batch loops skip it. A *schema* violation is handled separately
    // below and deliberately throws loud.
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(fs.readFileSync(unitFilePath, 'utf-8'));
    } catch {
      return null;
    }

    // Validate the on-disk shape against `UnitContract`. `parseUnit` throws a
    // `UnitContractParseError` naming the offending field path on a schema
    // mismatch — the bundled-data "fail loud" boundary behaviour.
    parseUnit(parsedJson, entry.path);

    // The validated value is structurally an `IFullUnit` (the contract is a
    // permissive superset of the index shape, and `IFullUnit` carries a
    // `[key: string]: unknown` catchall). Keep the original parsed object as
    // the cached value so no schema-side field coercion changes the data.
    const unit = parsedJson as IFullUnit;

    // Cache and return the parsed unit.
    this.unitCache.set(id, unit);
    return unit;
  };

  /**
   * Bulk load units by id list. Returns only those that resolved successfully.
   */
  getByIds = async (ids: string[]): Promise<IFullUnit[]> => {
    const results: IFullUnit[] = [];
    for (const id of ids) {
      const unit = await this.getById(id);
      if (unit !== null) {
        results.push(unit);
      }
    }
    return results;
  };

  /**
   * Filter the index by the given criteria. Mirrors the fetch-based service's
   * query() so Phase 4's random force generator can swap implementations.
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
   * Clear all caches. Useful in tests that need fresh disk reads.
   */
  clearCache = (): void => {
    this.indexCache = null;
    this.rawIndexCache = null;
    this.indexVersionCache = null;
    this.unitCache.clear();
  };
}

// =============================================================================
// Factory
// =============================================================================

/** Singleton holder — one instance per process unless overridden. */
let _nodeServiceInstance: NodeCanonicalUnitService | null = null;

/**
 * Return the process-singleton `NodeCanonicalUnitService`.
 *
 * Option A (per design D2): this is a *separate* factory that Node CLI scripts
 * call explicitly. The fetch-based `getCanonicalUnitService()` is NOT replaced.
 * Phase 5 (CLI runner) imports and calls this when running in Node.
 */
export function getNodeCanonicalUnitService(): NodeCanonicalUnitService {
  if (!_nodeServiceInstance) {
    _nodeServiceInstance = new NodeCanonicalUnitService();
  }
  return _nodeServiceInstance;
}

/**
 * Reset the process singleton. Useful in tests that construct the service
 * with a custom `baseDir` and need a fresh instance afterward.
 */
export function resetNodeCanonicalUnitService(): void {
  _nodeServiceInstance = null;
}
