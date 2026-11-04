import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type {
  ICanonicalUnitService,
  IFullUnit,
} from '@/services/units/CanonicalUnitService';
import type {
  IUnitIndexEntry,
  IUnitQueryCriteria,
} from '@/types/unit/UnitIndex';

import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { Era } from '@/types/enums/Era';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { prewarmCatalogBV } from '../bvCatalogPrewarmer';

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'bv-prewarmer-proof-'));
}

function writeReport(
  filePath: string,
  entries: Array<{ unitId: string; calculatedBV: number }>,
): void {
  fs.writeFileSync(filePath, JSON.stringify({ allResults: entries }), 'utf8');
}

function fixtureEntry(id: string): IUnitIndexEntry {
  return {
    id,
    name: id,
    chassis: id,
    variant: 'Prime',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
    era: Era.CLAN_INVASION,
    weightClass: WeightClass.MEDIUM,
    unitType: UnitType.BATTLEMECH,
    filePath: `/units/${id}.json`,
  };
}

function unusedCatalogService(): ICanonicalUnitService {
  return {
    getIndex: async (): Promise<readonly IUnitIndexEntry[]> => [],
    getById: jest.fn(async (_id: string): Promise<IFullUnit | null> => null),
    getByIds: async (_ids: string[]): Promise<IFullUnit[]> => [],
    query: async (
      _criteria: IUnitQueryCriteria,
    ): Promise<readonly IUnitIndexEntry[]> => [],
  };
}

describe('prewarmCatalogBV public report and cache boundaries', () => {
  it('surfaces fallback calculation errors instead of recording zero BV', async () => {
    const service = unusedCatalogService();
    jest
      .mocked(service.getById)
      .mockRejectedValue(new Error('Missing required BV fact: movement'));
    await expect(
      prewarmCatalogBV([fixtureEntry('invalid-design')], service, 'test', {
        bvReportPath: 'does-not-exist.json',
        skipCache: true,
      }),
    ).rejects.toThrow(/movement/);
  });

  it('reads fresh report values even when index version and count are unchanged', async () => {
    const root = tempRoot();
    const service = unusedCatalogService();
    const first = fixtureEntry('fixture-alpha');
    const second = fixtureEntry('fixture-bravo');
    const catalog: readonly IUnitIndexEntry[] = [first, second];

    try {
      const reportPath = path.join(root, 'fixture-report.json');
      const cachePath = path.join(root, 'fixture-cache.json');

      writeReport(reportPath, [
        { unitId: first.id, calculatedBV: 101 },
        { unitId: second.id, calculatedBV: 202 },
      ]);
      const initial = await prewarmCatalogBV(catalog, service, 'catalog-v1', {
        bvReportPath: reportPath,
        cacheFilePath: cachePath,
      });

      expect(initial.fromCache).toBe(false);
      expect(initial.source).toBe('report');
      expect(initial.catalog.map((entry) => entry.bv)).toEqual([101, 202]);
      expect(fs.existsSync(cachePath)).toBe(false);

      writeReport(reportPath, [
        { unitId: first.id, calculatedBV: 303 },
        { unitId: second.id, calculatedBV: 404 },
      ]);
      const cacheHit = await prewarmCatalogBV(catalog, service, 'catalog-v1', {
        bvReportPath: reportPath,
        cacheFilePath: cachePath,
      });

      expect(cacheHit.fromCache).toBe(false);
      expect(cacheHit.source).toBe('report');
      expect(cacheHit.catalog.map((entry) => entry.bv)).toEqual([303, 404]);

      const versionMiss = await prewarmCatalogBV(
        catalog,
        service,
        'catalog-v2',
        {
          bvReportPath: reportPath,
          cacheFilePath: cachePath,
        },
      );

      expect(versionMiss.fromCache).toBe(false);
      expect(versionMiss.source).toBe('report');
      expect(versionMiss.catalog.map((entry) => entry.bv)).toEqual([303, 404]);

      const countMiss = await prewarmCatalogBV(
        catalog.slice(0, 1),
        service,
        'catalog-v2',
        {
          bvReportPath: reportPath,
          cacheFilePath: cachePath,
        },
      );

      expect(countMiss.fromCache).toBe(false);
      expect(countMiss.source).toBe('report');
      expect(countMiss.catalog.map((entry) => entry.bv)).toEqual([303]);
      expect(service.getById).not.toHaveBeenCalled();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
  it('ignores an old disk total and computes current pinned Java Atlas BV', async () => {
    const root = tempRoot(),
      service = getNodeCanonicalUnitService();
    const entry = service
      .getIndexSync()
      .find((unit) => unit.id === 'atlas-as7-d');
    expect(entry).toBeDefined();
    try {
      const cacheFilePath = path.join(root, 'stale.json');
      fs.writeFileSync(
        cacheFilePath,
        JSON.stringify({
          catalogVersion: '1.0.0',
          catalogTotalUnits: 1,
          bvByUnitId: { 'atlas-as7-d': 1 },
        }),
      );
      const result = await prewarmCatalogBV([entry!], service, '1.0.0', {
        cacheFilePath,
        bvReportPath: path.join(root, 'missing-report.json'),
      });
      expect(result.fromCache).toBe(false);
      expect(result.catalog[0].bv).toBe(1897);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
