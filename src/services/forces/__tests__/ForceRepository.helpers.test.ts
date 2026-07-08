import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ForcePosition, type IAssignment } from '@/types/force';

const mockCustomUnitGet = jest.fn();
const mockCalculateBV = jest.fn();

jest.mock('@/services/persistence/SQLiteService', () => ({
  getSQLiteService: () => ({
    getDatabase: () => ({
      prepare: () => ({
        get: (...args: unknown[]) => mockCustomUnitGet(...args),
      }),
    }),
  }),
}));

jest.mock('@/utils/construction/bvAdapter', () => ({
  calculateUnitBV: (...args: unknown[]) => mockCalculateBV(...args),
}));

import {
  type CanonicalUnitStatsResolver,
  calculateStats,
  calculateUnitBV,
} from '@/services/forces/ForceRepository.helpers';
import { NodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';

function makeTempCatalogWithBVReport(): {
  readonly baseDir: string;
  readonly service: NodeCanonicalUnitService;
} {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mek-force-bv-'));
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
      version: 'force-bv-test',
      generatedAt: '2026-07-08T00:00:00.000Z',
      totalUnits: 1,
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

  return {
    baseDir,
    service: new NodeCanonicalUnitService(baseDir, { bvReportPath }),
  };
}

function assignment(unitId: string | null, slot: number): IAssignment {
  return {
    id: `assignment-${slot}`,
    pilotId: slot === 1 ? 'pilot-1' : null,
    unitId,
    position: ForcePosition.Member,
    slot,
  };
}

function canonicalStatsResolver(
  service: NodeCanonicalUnitService,
): CanonicalUnitStatsResolver {
  return (unitId) => {
    const entry = service
      .getIndexSyncWithBV()
      .find((candidate) => candidate.id === unitId);

    if (!entry) {
      return null;
    }

    return {
      bv: entry.bv ?? 0,
      tonnage: entry.tonnage,
    };
  };
}

describe('ForceRepository.helpers unit stat resolution', () => {
  let tempDir: string | null = null;
  let nodeService: NodeCanonicalUnitService;

  beforeEach(() => {
    mockCustomUnitGet.mockReset();
    mockCalculateBV.mockReset();
    const fixture = makeTempCatalogWithBVReport();
    tempDir = fixture.baseDir;
    nodeService = fixture.service;
  });

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('uses the custom-unit BV path before canonical fallback', () => {
    mockCustomUnitGet.mockReturnValue({
      data: JSON.stringify({
        unitType: 'BattleMech',
        tonnage: 55,
      }),
      tonnage: 55,
    });
    mockCalculateBV.mockReturnValue(1_234);
    const resolver = jest.fn<
      ReturnType<CanonicalUnitStatsResolver>,
      [string]
    >();

    expect(
      calculateUnitBV('custom-unit-1', {
        canonicalUnitStatsResolver: resolver,
      }),
    ).toBe(1_234);
    expect(mockCalculateBV).toHaveBeenCalledWith({
      unitType: 'BattleMech',
      tonnage: 55,
    });
    expect(resolver).not.toHaveBeenCalled();
  });

  it('defaults canonical unit refs to zero stats without an injected resolver', () => {
    mockCustomUnitGet.mockReturnValue(undefined);

    const stats = calculateStats([assignment('atlas-as7-d', 1)]);

    expect(stats.totalBV).toBe(0);
    expect(stats.totalTonnage).toBe(0);
    expect(stats.assignedUnits).toBe(1);
  });

  it('uses injected validation-report BV and canonical tonnage for canonical unit refs', () => {
    mockCustomUnitGet.mockReturnValue(undefined);
    expect(nodeService.getIndexSync()[0]?.bv).toBeUndefined();

    const stats = calculateStats(
      [assignment('atlas-as7-d', 1), assignment(null, 2)],
      {
        canonicalUnitStatsResolver: canonicalStatsResolver(nodeService),
      },
    );

    expect(stats.totalBV).toBe(1_897);
    expect(stats.totalTonnage).toBe(100);
    expect(stats.assignedPilots).toBe(1);
    expect(stats.assignedUnits).toBe(1);
    expect(stats.emptySlots).toBe(1);
    expect(mockCalculateBV).not.toHaveBeenCalled();
  });
});
