/**
 * NodeCanonicalUnitService Tests
 *
 * Tasks 2.7 and 2.8 — integration + cache tests for the fs-based catalog
 * reader introduced in Phase 2 of `add-encounter-swarm-harness`.
 *
 * Test environment note: these tests run in the default Jest environment (jsdom
 * with Node.js internals available). `fs.readFileSync` works because Jest runs
 * in Node regardless of the DOM emulation layer. The service's `baseDir`
 * constructor argument is left undefined so it resolves against the actual
 * project root, where `public/data/units/battlemechs/` lives.
 *
 * @spec openspec/changes/add-encounter-swarm-harness/tasks.md § "Phase 2 — Node-Side Catalog Loader"
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { adaptUnitFromData } from '@/engine/adapters/CompendiumAdapter';

import {
  NodeCanonicalUnitService,
  resetNodeCanonicalUnitService,
} from '../NodeCanonicalUnitService';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Compute the project root (where `public/` lives) relative to this test file.
 * This is the same directory Jest uses as `process.cwd()` when running from
 * the repo root. Passing it explicitly to the service constructor guards
 * against any working-directory drift in CI.
 */
const PROJECT_ROOT = path.resolve(__dirname, '../../../../');

/**
 * 50 deterministically chosen unit IDs spread across the 4225-entry catalog.
 * Selected via stride = floor(4225 / 50) = 84 so every weight class, era, and
 * tech base is represented without relying on randomness.
 *
 * Regenerate with:
 *   node -e "const fs=require('fs'); const idx=JSON.parse(fs.readFileSync('./public/data/units/battlemechs/index.json','utf-8')); const s=Math.floor(idx.units.length/50); const ids=[]; for(let i=0;i<50;i++) ids.push(idx.units[i*s].id); console.log(JSON.stringify(ids))"
 */
const SAMPLE_50_IDS: readonly string[] = [
  'battle-tripod-r-h3l-2x',
  'archangel-c-ang-os-caelestis',
  'atlas-as7-s2',
  'banshee-bnc-12s',
  'battlemaster-blr-m3',
  'black-lanner-f',
  'bruin-unknown',
  'catapult-cplt-c5',
  'cestus-cts-6z',
  'commando-com-8s',
  'crossbow-t',
  'daedalus-gtx2a-stevedore',
  'dervish-dv-9d',
  'duan-gung-d9-g10',
  'fafnir-fnr-5b',
  'firestarter-fs9-oa',
  'gladiator-a',
  'grasshopper-ghr-7k-gravedigger',
  'guillotine-glt-3n-estridsen',
  'hatamoto-chi-htm-27t-lowenbrau',
  'hellion-g',
  'hoplite-hop-4a',
  'inquisitor-itw-85-securitymech',
  'jenner-iic-4',
  'kodiak-ii-unknown',
  'legionnaire-lgn-2d-raul',
  'loki-mk-ii-t',
  'mad-cat-mk-ii-enhanced',
  'marauder-mad-9d',
  'men-shen-ms1-od',
  'night-gyr-a',
  'omega-shp-5r',
  'ostsol-c',
  'patriot-pkm-2e',
  'phoenix-hawk-pxh-4m',
  'preta-c-prt-oe-eminus',
  'rattlesnake-jr7-31r-gideon',
  'rock-hound-am-prm-rh7-prospectormech',
  'scavenger-sc-v-salvagemech',
  'shadow-hawk-shd-4h',
  'space-hound-am-prm-sh1-prospectormech',
  'starslayer-sty-4c',
  'sun-spider-d',
  'thanatos-tns-6s2',
  'thunderbolt-tdr-5se',
  'turkina-b',
  'valkyrie-vlk-qt2',
  'von-rohrs-hebi-von-4rh-6',
  'warhammer-iic-3',
  'wolf-trap-tora-wft-b',
];

/** Well-known Atlas D — used for the adaptUnitFromData spot-check. */
const SPOT_CHECK_ID = 'atlas-as7-d';

function makeTempCatalogWithBVReport(): {
  readonly baseDir: string;
  readonly bvReportPath: string;
} {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mek-bv-index-'));
  const catalogDir = path.join(
    baseDir,
    'public',
    'data',
    'units',
    'battlemechs',
  );
  fs.mkdirSync(catalogDir, { recursive: true });

  fs.writeFileSync(
    path.join(catalogDir, 'index.json'),
    JSON.stringify({
      version: 'test-bv-index',
      generatedAt: '2026-07-08T00:00:00.000Z',
      totalUnits: 2,
      units: [
        {
          id: 'atlas-as7-d',
          chassis: 'Atlas',
          model: 'AS7-D',
          tonnage: 100,
          techBase: 'INNER_SPHERE',
          year: 3025,
          path: 'atlas.json',
        },
        {
          id: 'locust-lct-1v',
          chassis: 'Locust',
          model: 'LCT-1V',
          tonnage: 20,
          techBase: 'INNER_SPHERE',
          year: 3025,
          path: 'locust.json',
        },
      ],
    }),
  );

  const bvReportPath = path.join(baseDir, 'bv-validation-report.json');
  fs.writeFileSync(
    bvReportPath,
    JSON.stringify({
      allResults: [
        {
          unitId: 'atlas-as7-d',
          calculatedBV: 1897,
        },
      ],
    }),
  );

  return { baseDir, bvReportPath };
}

// =============================================================================
// Tests — Task 2.7: Index load + sample-load 50 units
// =============================================================================

describe('NodeCanonicalUnitService — index and unit loading (Task 2.7)', () => {
  let service: NodeCanonicalUnitService;

  beforeEach(() => {
    // Construct with explicit project root so the test is location-agnostic.
    service = new NodeCanonicalUnitService(PROJECT_ROOT);
    resetNodeCanonicalUnitService();
  });

  it('loads the index and returns ≥4000 entries with tonnage on every entry', async () => {
    // Task 2.7 Test 1 — verify index breadth
    const index = await service.getIndex();

    expect(index.length).toBeGreaterThanOrEqual(4000);

    // Every index entry the service produces must carry a tonnage value.
    // The `bv` field is optional on IUnitIndexEntry (not present in the raw
    // index JSON, only in individual unit files), so we only assert its type
    // when defined rather than asserting it is always non-null.
    for (const entry of index) {
      expect(typeof entry.tonnage).toBe('number');
      expect(entry.tonnage).toBeGreaterThan(0);
      // bv is optional — when present it must be numeric
      if (entry.bv !== undefined) {
        expect(typeof entry.bv).toBe('number');
      }
    }
  });

  it('sample-loads 50 representative units and all have a numeric tonnage', async () => {
    // Task 2.7 Test 2 — bulk parse 50 spread-sample units
    const loaded = await service.getByIds(SAMPLE_50_IDS as string[]);

    // All 50 must resolve — none may return null / be filtered out.
    expect(loaded.length).toBe(50);

    for (const unit of loaded) {
      // IFullUnit carries tonnage on every catalog unit.
      expect(typeof unit.tonnage).toBe('number');
      expect(unit.tonnage as number).toBeGreaterThan(0);
    }
  });

  it('adaptUnitFromData runs on a Node-loaded IFullUnit without error (Task 2.7 Test 3)', async () => {
    // Task 2.7 optional spot-check — proves Node end-to-end path.
    // adaptUnitFromData is the synchronous workhorse in CompendiumAdapter:465
    // per design D2. If it errors here, CompendiumAdapter has a browser-only dep
    // that must be isolated before Phase 5 can wire it.
    const unit = await service.getById(SPOT_CHECK_ID);

    expect(unit).not.toBeNull();

    // Run the synchronous adapter — should return a non-null IAdaptedUnit.
    const adapted = adaptUnitFromData(unit!);

    expect(adapted).not.toBeNull();
    // A valid adapted unit has at minimum an id and a non-negative walkMP.
    // (IAdaptedUnit does not carry tonnage directly — it extends IUnitGameState
    // which exposes movement and weapon data instead.)
    expect(typeof adapted.id).toBe('string');
    expect(adapted.walkMP).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// Tests — Task 2.8: Cache reference equality
// =============================================================================

describe('NodeCanonicalUnitService — cache (Task 2.8)', () => {
  let service: NodeCanonicalUnitService;

  beforeEach(() => {
    service = new NodeCanonicalUnitService(PROJECT_ROOT);
  });

  it('returns the same IFullUnit reference across two getById calls for the same id', async () => {
    // First call reads from disk and populates unitCache.
    const first = await service.getById(SPOT_CHECK_ID);
    // Second call must return the cached reference — strict (===) equality.
    const second = await service.getById(SPOT_CHECK_ID);

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    // This is the key assertion: reference identity, not deep equality.
    expect(first).toBe(second);
  });

  it('returns the same index array reference across two getIndex calls', async () => {
    // Verifies that the index cache also provides reference stability.
    const idx1 = await service.getIndex();
    const idx2 = await service.getIndex();

    expect(idx1).toBe(idx2);
  });

  it('clears caches and forces fresh disk reads on clearCache()', async () => {
    // Load once to populate caches.
    const before = await service.getById(SPOT_CHECK_ID);
    service.clearCache();
    // After clear, next call re-reads from disk — a new object reference.
    const after = await service.getById(SPOT_CHECK_ID);

    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    // Different object instances after clear (deep-equal content, not ===).
    expect(before).not.toBe(after);
  });
});

describe('NodeCanonicalUnitService - BV report merge', () => {
  let tempDir: string | null = null;

  afterEach(() => {
    jest.restoreAllMocks();
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('enriches a raw BV-free index from the validation report and caches the report read', () => {
    const fixture = makeTempCatalogWithBVReport();
    tempDir = fixture.baseDir;
    const service = new NodeCanonicalUnitService(fixture.baseDir, {
      bvReportPath: fixture.bvReportPath,
    });

    const rawIndex = service.getIndexSync();
    expect(rawIndex.find((entry) => entry.id === 'atlas-as7-d')?.bv).toBe(
      undefined,
    );

    const indexWithBV = service.getIndexSyncWithBV();

    expect(indexWithBV.find((entry) => entry.id === 'atlas-as7-d')?.bv).toBe(
      1897,
    );
    expect(indexWithBV.find((entry) => entry.id === 'locust-lct-1v')?.bv).toBe(
      undefined,
    );

    fs.writeFileSync(
      fixture.bvReportPath,
      JSON.stringify({
        allResults: [
          {
            unitId: 'atlas-as7-d',
            calculatedBV: 9999,
          },
        ],
      }),
    );
    const cachedIndexWithBV = service.getIndexSyncWithBV();
    expect(cachedIndexWithBV).toBe(indexWithBV);
    expect(
      cachedIndexWithBV.find((entry) => entry.id === 'atlas-as7-d')?.bv,
    ).toBe(1897);

    service.clearCache();
    expect(
      service.getIndexSyncWithBV().find((entry) => entry.id === 'atlas-as7-d')
        ?.bv,
    ).toBe(9999);
  });
});
