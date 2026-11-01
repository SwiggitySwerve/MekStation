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

import {
  indexFamilies,
  unitFamilyKey,
  type UnitFamily,
  type UnitIndexOptions,
  type UnitLookupOptions,
} from '@/types/unit/UnitIndex';
import { logger } from '@/utils/logger';

import type { IUnitIndexEntry, IUnitQueryCriteria } from '../common/types';

import {
  type ICanonicalUnitService,
  type IFullUnit,
} from './CanonicalUnitService';
import { mapRawIndexRows, type RawUnitIndexEntry } from './unitIndexMapper';
import { parseUnit } from './unitLoaderService/unitContractAdapter';

const isJestRuntime =
  typeof process !== 'undefined' &&
  (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined);

if (typeof window !== 'undefined' && !isJestRuntime) {
  throw new Error(
    'NodeCanonicalUnitService is server-only and cannot be imported into a browser bundle.',
  );
}

// =============================================================================
// Raw index shapes (matches the on-disk index.json format)
// =============================================================================

type RawIndexUnit = RawUnitIndexEntry;

/**
 * Top-level shape of `public/data/units/battlemechs/index.json`.
 */
interface RawIndexFile {
  version: string;
  generatedAt: string;
  totalUnits: number;
  units: RawIndexUnit[];
}

interface BVReportEntry {
  readonly unitId: string;
  readonly calculatedBV: number | null;
}

interface BVReportFile {
  readonly allResults?: readonly BVReportEntry[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export interface NodeCanonicalUnitServiceOptions {
  readonly bvReportPath?: string;
}

export interface GetIndexWithBVOptions extends UnitIndexOptions {
  readonly bvReportPath?: string;
}

const DEFAULT_MEGAMEK_BV_CACHE_PATH =
  'scripts/data-migration/megamek-bv-cache.json';

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
  private readonly projectRoot: string;

  /**
   * Base directory for catalog data files, resolved at construction time so
   * every unit load uses a consistent absolute path rooted at cwd.
   */
  private readonly baseDir: string;

  private readonly defaultBVReportPath?: string;

  /** Cached parsed index entries (null = not yet loaded). */
  private indexCache = new Map<UnitFamily, IUnitIndexEntry[]>();

  /** First entry per id for each loaded family, built with `indexCache`. */
  private readonly entryIndex = new Map<
    UnitFamily,
    ReadonlyMap<string, IUnitIndexEntry>
  >();

  /** Families whose index file is absent (ENOENT); cleared by `clearCache`. */
  private readonly missingFamilies = new Set<UnitFamily>();

  /** Cached version stamp from the index file (populated when index loads). */
  private indexVersionCache: string | null = null;

  /** Per-unit IFullUnit cache — avoids re-reading disk on repeated getById calls. */
  private readonly unitCache: Map<string, IFullUnit> = new Map();

  private readonly bvLookupCache = new Map<
    string,
    ReadonlyMap<string, number>
  >();

  private readonly indexWithBVCache = new Map<string, IUnitIndexEntry[]>();

  constructor(
    /** Override base directory for testing; defaults to `process.cwd()`. */
    baseDir?: string,
    options: NodeCanonicalUnitServiceOptions = {},
  ) {
    // Resolve once so all subsequent reads use a stable absolute path.
    // Hydration explicitly ships public catalogs and the BV cache; tracing a
    // dynamic project root would also copy unrelated checkout contents.
    this.projectRoot = path.resolve(
      /* turbopackIgnore: true */ baseDir ?? process.cwd(),
    );
    this.baseDir = path.resolve(this.projectRoot, 'public/data/units');
    this.defaultBVReportPath = options.bvReportPath;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Load and cache the raw index file from disk.
   * Called lazily by the first public method that needs index data.
   * Subsequent calls return the cached version immediately.
   */
  private loadRawIndex(family: UnitFamily): IUnitIndexEntry[] {
    const cached = this.indexCache.get(family);
    if (cached) return cached;
    if (this.missingFamilies.has(family)) return [];
    let contents: string;
    try {
      contents = fs.readFileSync(
        path.join(this.baseDir, family, 'index.json'),
        'utf-8',
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.missingFamilies.add(family);
        return [];
      }
      throw error;
    }
    const rawFile = JSON.parse(contents) as RawIndexFile;
    if (!rawFile || !Array.isArray(rawFile.units))
      throw new Error('Canonical source index is invalid');
    const entries = mapRawIndexRows(rawFile.units, family);
    this.indexCache.set(family, entries);
    const byId = new Map<string, IUnitIndexEntry>();
    for (const entry of entries) {
      if (!byId.has(entry.id)) byId.set(entry.id, entry);
    }
    this.entryIndex.set(family, byId);
    if (family === 'battlemechs')
      this.indexVersionCache = rawFile.version ?? 'unknown';
    return entries;
  }

  private resolveBVSource(overridePath?: string): {
    readonly path: string;
    readonly kind: 'megamek-cache' | 'report';
  } {
    const reportPath = overridePath ?? this.defaultBVReportPath;
    const sourcePath = reportPath ?? DEFAULT_MEGAMEK_BV_CACHE_PATH;
    return {
      path: path.isAbsolute(sourcePath)
        ? sourcePath
        : path.resolve(this.projectRoot, sourcePath),
      kind: reportPath === undefined ? 'megamek-cache' : 'report',
    };
  }

  private loadBVReportLookup(
    bvReportPath: string,
  ): ReadonlyMap<string, number> {
    const cacheKey = `report:${bvReportPath}`;
    const cached = this.bvLookupCache.get(cacheKey);
    if (cached) return cached;

    const bvByUnitId = new Map<string, number>();
    try {
      if (fs.existsSync(bvReportPath)) {
        const parsed = JSON.parse(
          fs.readFileSync(bvReportPath, 'utf-8'),
        ) as BVReportFile;
        for (const entry of parsed.allResults ?? []) {
          if (
            typeof entry.unitId === 'string' &&
            typeof entry.calculatedBV === 'number' &&
            entry.calculatedBV > 0
          ) {
            bvByUnitId.set(entry.unitId, entry.calculatedBV);
          }
        }
      }
    } catch {
      // Match bvCatalogPrewarmer's graceful fallback: a missing or malformed
      // report leaves raw BV values untouched instead of failing the caller.
    }

    this.bvLookupCache.set(cacheKey, bvByUnitId);
    return bvByUnitId;
  }

  private loadMegaMekBVLookup(cachePath: string): ReadonlyMap<string, number> {
    const cacheKey = `megamek-cache:${cachePath}`;
    const cached = this.bvLookupCache.get(cacheKey);
    if (cached) return cached;

    const bvByUnitId = new Map<string, number>();
    try {
      if (fs.existsSync(cachePath)) {
        const parsed: unknown = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
        const entries = isRecord(parsed) ? parsed.entries : undefined;
        if (isRecord(entries)) {
          for (const [unitId, rawEntry] of Object.entries(entries)) {
            if (!isRecord(rawEntry)) continue;
            const megamekBV = rawEntry.megamekBV;
            if (typeof megamekBV === 'number' && megamekBV > 0) {
              bvByUnitId.set(unitId, megamekBV);
            }
          }
        }
      }
    } catch {
      // Missing or malformed cache leaves raw index BV values untouched.
    }

    this.bvLookupCache.set(cacheKey, bvByUnitId);
    return bvByUnitId;
  }

  // ---------------------------------------------------------------------------
  // ICanonicalUnitService implementation
  // ---------------------------------------------------------------------------

  getIndexSync = (
    options: UnitIndexOptions = {},
  ): readonly IUnitIndexEntry[] => {
    const indexes = indexFamilies(options).map((family) => {
      try {
        return this.loadRawIndex(family);
      } catch (error) {
        if (options.strict) throw error;
        return [];
      }
    });
    return indexes.length === 1 ? indexes[0] : indexes.flat();
  };

  getIndexSyncWithBV = (
    options: GetIndexWithBVOptions = {},
  ): readonly IUnitIndexEntry[] => {
    const index = this.getIndexSync(options);
    if (index.length === 0) return index;
    const source = this.resolveBVSource(options.bvReportPath);
    const cacheKey = `${options.family ?? 'battlemechs'}:${source.kind}:${source.path}`;
    const cached = this.indexWithBVCache.get(cacheKey);
    if (cached) return cached;

    const bvByUnitId =
      source.kind === 'megamek-cache'
        ? this.loadMegaMekBVLookup(source.path)
        : this.loadBVReportLookup(source.path);
    const enriched = index.map(
      (entry): IUnitIndexEntry => ({
        ...entry,
        bv:
          (entry.family === undefined || entry.family === 'battlemechs'
            ? bvByUnitId.get(entry.id)
            : undefined) ?? entry.bv,
      }),
    );

    this.indexWithBVCache.set(cacheKey, enriched);
    return enriched;
  };

  /**
   * Return all index entries. Loads and caches the index on first call.
   */
  getIndex = async (
    options: UnitIndexOptions = {},
  ): Promise<readonly IUnitIndexEntry[]> => {
    return this.getIndexSync(options);
  };

  /**
   * Return the version stamp from the catalog index file.
   * Used as a cache key by `bvCatalogPrewarmer` so the BV cache invalidates
   * automatically when the catalog regenerates with a new version.
   */
  getCatalogVersion = (): string => {
    if (this.indexVersionCache === null) {
      try {
        this.loadRawIndex('battlemechs');
      } catch (error) {
        logger.warn(
          'Canonical mech index is unreadable; version unknown',
          error,
        );
      }
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
  getByIdSync = (
    id: string,
    options: UnitLookupOptions = {},
  ): IFullUnit | null => {
    // Return cached reference immediately — this also satisfies Task 2.8's
    // requirement that two calls for the same id return the same object.
    const key = unitFamilyKey(id, options.family);
    if (this.unitCache.has(key)) {
      return this.unitCache.get(key)!;
    }

    const family = options.family ?? 'battlemechs';
    try {
      this.loadRawIndex(family);
    } catch (error) {
      if (options.strict) throw error;
    }
    const entry = this.entryIndex.get(family)?.get(id);
    if (!entry) {
      return null;
    }

    // Resolve the file path against the catalog base directory.
    // pattern: scripts/validate-bv.ts:5173 `path.join(basePath, iu.path)`
    const unitFilePath = path.join(this.projectRoot, 'public', entry.filePath);

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
    parseUnit(parsedJson, entry.filePath);

    // The validated value is structurally an `IFullUnit` (the contract is a
    // permissive superset of the index shape, and `IFullUnit` carries a
    // `[key: string]: unknown` catchall). Keep the original parsed object as
    // the cached value so no schema-side field coercion changes the data.
    const unit = parsedJson as IFullUnit;

    // Cache and return the parsed unit.
    this.unitCache.set(key, unit);
    return unit;
  };

  getById = async (
    id: string,
    options: UnitLookupOptions = {},
  ): Promise<IFullUnit | null> => {
    return this.getByIdSync(id, options);
  };

  /**
   * Bulk load units by id list. Returns only those that resolved successfully.
   */
  getByIds = async (
    ids: string[],
    options: UnitLookupOptions = {},
  ): Promise<IFullUnit[]> => {
    const results: IFullUnit[] = [];
    for (const id of ids) {
      const unit = await this.getById(id, options);
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

  /**
   * Clear all caches. Useful in tests that need fresh disk reads.
   */
  clearCache = (): void => {
    this.indexCache.clear();
    this.entryIndex.clear();
    this.missingFamilies.clear();
    this.indexVersionCache = null;
    this.bvLookupCache.clear();
    this.indexWithBVCache.clear();
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
