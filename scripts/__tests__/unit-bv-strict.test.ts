import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import blackHawk from '../../public/data/units/battlemechs/3-succession-wars/advanced/Black Hawk A.json';
import { BlkParserService } from '../../src/services/conversion/BlkParserService';
import { resetEquipmentLoader } from '../../src/services/equipment/EquipmentLoaderService';
import {
  getEquipmentLookupService,
  resetEquipmentLookupService,
} from '../../src/services/equipment/EquipmentLookupService';
import {
  getEquipmentRegistry,
  resetEquipmentRegistry,
} from '../../src/services/equipment/EquipmentRegistry';
import aeroCapital from '../../src/services/units/handlers/__tests__/fixtures/aerospace-capital-validity.json';
import fixedWing from '../../src/services/units/handlers/__tests__/fixtures/fixed-wing-support.json';
import protos from '../../src/services/units/handlers/__tests__/fixtures/native-protomek.json';
import personnel from '../../src/services/units/handlers/__tests__/fixtures/personnel-validity.json';
import vehicles from '../../src/services/units/handlers/__tests__/fixtures/vehicle-handler-locations.pinned-sources.json';
import {
  areHandlersInitialized,
  initializeUnitTypeHandlers,
  resetHandlerInitialization,
} from '../../src/services/units/handlers/initializeHandlers';
import { ProtoMechUnitHandler } from '../../src/services/units/handlers/ProtoMechUnitHandler';
import { UnitLoaderService } from '../../src/services/units/unitLoaderService/unitLoader';
import {
  getUnitTypeRegistry,
  resetUnitTypeRegistry,
} from '../../src/services/units/UnitTypeRegistry';
import * as orchestrator from '../../src/services/validation/UnitValidationOrchestrator';
import { UnitCategory } from '../../src/types/unit/UnitTypeHandler';
import * as dispatcher from '../../src/utils/construction/battleValueCalculations';
import { aggregateDelta } from '../unit-bv-parity';
import { buildQuantityReport } from '../unit-construction-quantities';
import { buildWeightReport } from '../unit-construction-weights';
import {
  buildDeltaReport,
  calculateRow,
  calculateSources,
  captureConstructionValidity,
  compareFigures,
  FAMILIES,
  prepareConstructionValidity,
  sourceHash,
  type IFigure,
  type IJavaReferenceRow,
  type IComputedRow,
} from '../vehicle-aero-bv-delta';
import fixture from './fixtures/vehicle_aero_contract_bv.json';
import overweight from './fixtures/vehicle_overweight_pinned.json';

// The equipment catalog reads public/ from disk; the pinned weight tests mock
// the reader the same way because jsdom has a window and would use fetch.
let mockCatalogAvailable = true;
jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    mockCatalogAvailable
      ? JSON.parse(
          jest
            .requireActual('node:fs')
            .readFileSync(
              jest
                .requireActual('node:path')
                .join(process.cwd(), 'public/data/equipment/official', file),
              'utf8',
            ),
        )
      : null,
}));

jest.mock('../../src/utils/construction/battleValueCalculations', () => {
  const actual = jest.requireActual(
    '../../src/utils/construction/battleValueCalculations',
  );
  return {
    ...actual,
    calculateBattleValueForUnit: jest.fn(actual.calculateBattleValueForUnit),
  };
});

const sha256 = 'a'.repeat(64);
const figure = (total = 100) => ({ total, defensive: 60, offensive: 40 });
const java = (family = 'vehicles'): IJavaReferenceRow => ({
  path: `${family}/unit.blk`,
  sha256,
  concreteFamily: family,
  battleValue: {
    total: 100,
    aggregates: { defensiveValue: 60, offensiveValue: 40 },
  },
});
const java0 = (): IJavaReferenceRow => ({
  ...java(),
  battleValue: {
    total: 100,
    aggregates: { defensiveValue: 60, offensiveValue: 0 },
  },
});
const computed = (family = 'vehicles'): IComputedRow => ({
  path: java(family).path,
  sha256,
  figure: figure(),
});
const report = (ours: IComputedRow[], refs = [java()]) =>
  buildDeltaReport(ours, refs, ['vehicles']);

const personnelRow = (folder: string, type: string): IComputedRow =>
  calculateRow({
    path: `${folder}/unit.blk`,
    sha256,
    unit: null,
    sourceText: Object.entries({
      UnitType: type,
      Name: 'Pinned source probe',
      year: '3064',
      type: 'IS Level 2',
      motion_type: 'Jump',
      cruiseMP: '1',
      jumpingMP: '3',
      armor: '6',
      'Trooper Count': '4',
      weightclass: '1',
      chassis: 'biped',
      squad_size: '7',
      squadn: '4',
      Primary: 'Submachine Gun',
      // A BA with no armed mount has zero offense, which the strict rules reject.
      ...(type === 'BattleArmor' && {
        'Squad Equipment': 'BADavidLightGaussRifle:RA\nBABasicManipulator:RA',
      }),
    })
      .map(([key, value]) => `<${key}>\n${value}\n</${key}>`)
      .join('\n'),
  });
const oracleFor = (
  folder: string,
  f: IFigure,
  total = f.total ?? NaN,
): IJavaReferenceRow => ({
  path: `${folder}/unit.blk`,
  sha256,
  concreteFamily: folder,
  battleValue: {
    total,
    aggregates: {
      defensiveValue: f.defensive,
      offensiveValue: f.offensive ?? NaN,
    },
  },
});

it('transports ProtoMech stages and reports a compensating offense error', () => {
  const source = protos[0];
  const row = calculateRow({
    path: source.path.replace('data/mekfiles/', ''),
    sha256: source.sha256,
    unit: null,
    sourceText: source.content,
  });
  const figure = row.figure as IFigure;
  expect(figure.terms?.physicalWeaponBV).toBe(0);
  expect(figure.terms?.armorBV).toEqual(expect.any(Number));
  const stages = {
    armorBV: 0,
    structureBV: 0,
    defensiveEquipmentBV: 0,
    explosivePenalty: 0,
    typeModifier: 1,
    defensiveFactor: 1,
    weaponBV: 40,
    ammoBV: 0,
    offensiveEquipmentBV: 0,
    weightBV: 0,
    speedFactor: 1,
    offensiveTypeModifier: 1,
    summaryModifier: 1,
    adjustment: 0,
  };
  const reference = {
    path: row.path,
    sha256: row.sha256,
    concreteFamily: 'ProtoMek',
    battleValue: {
      total: figure.total ?? 0,
      aggregates: {
        defensiveValue: figure.defensive,
        offensiveValue: figure.offensive ?? 0,
      },
      terms: stages,
    },
  };
  const result = buildDeltaReport(
    [
      {
        ...row,
        figure: { ...figure, terms: { ...stages, weaponBV: 39, ammoBV: 1 } },
      },
    ],
    [reference],
    ['protomeks'],
    true,
  );
  expect(result.ok).toBe(false);
  expect(result.rows[0].firstTermDifference?.term).toBe('weaponBV');
});

describe.each([
  ['battlearmor', 'BattleArmor'],
  ['infantry', 'Infantry'],
])('%s source rows use the real dispatcher path', (folder, type) => {
  const row = personnelRow(folder, type);
  const ours = row.figure as IFigure;

  it('transports numeric breakdown terms and fails on compensating term errors', () => {
    expect(ours.terms?.armorBV ?? ours.terms?.primaryBV).toEqual(
      expect.any(Number),
    );
    const terms = {
      armorBV: 0,
      structureBV: 0,
      defensiveEquipmentBV: 0,
      explosivePenalty: 0,
      typeModifier: 1,
      defensiveFactor: 1,
      weaponBV: 40,
      ammoBV: 0,
      offensiveEquipmentBV: 0,
      weightBV: 0,
      speedFactor: 1,
      offensiveTypeModifier: 1,
      summaryModifier: 1,
      adjustment: 0,
    };
    const reference = {
      ...oracleFor(folder, ours),
      battleValue: { ...oracleFor(folder, ours).battleValue, terms },
    };
    const changed = {
      ...row,
      figure: { ...ours, terms: { ...terms, weaponBV: 39, ammoBV: 1 } },
    };
    const result = buildDeltaReport([changed], [reference], [folder], true);
    expect(result.ok).toBe(false);
    expect(result.rows[0].firstTermDifference?.term).toBe('weaponBV');
  });

  it('counts an oracle with the same figures as exact', () => {
    expect(row.reason).toBeUndefined();
    expect(ours.total).toBe(row.handlerTotal);
    const result = buildDeltaReport([row], [oracleFor(folder, ours)], [folder]);
    expect(result.rows[0].status).toBe('exact');
    expect(result.ok).toBe(true);
    expect(result.byFamily[folder]).toMatchObject({
      exact: 1,
      notComputable: 0,
      handlerExact: 1,
      runtimeExact: 1,
    });
  });

  it('counts a different oracle total as a miss', () => {
    const result = buildDeltaReport(
      [row],
      [oracleFor(folder, ours, (ours.total ?? 0) * 2)],
      [folder],
    );
    expect(result.rows[0].status).toBe('farther');
    expect(result.ok).toBe(false);
    expect(result.byFamily[folder]).toMatchObject({ exact: 0, farther: 1 });
  });

  it('rejects a non-finite dispatcher aggregate instead of matching it', () => {
    const real = jest.requireActual<typeof dispatcher>(
      '../../src/utils/construction/battleValueCalculations',
    );
    const mocked = jest.mocked(dispatcher.calculateBattleValueForUnit);
    mocked.mockImplementation((unit, options) => {
      const result = real.calculateBattleValueForUnit(unit, options);
      // BA reads `defensive`, infantry reads `defensiveBV`.
      const breakdown = {
        ...result?.breakdown,
        defensive: NaN,
        defensiveBV: NaN,
      };
      return { ...result, breakdown } as typeof result;
    });
    let nan: IComputedRow;
    try {
      nan = personnelRow(folder, type);
    } finally {
      mocked.mockImplementation(real.calculateBattleValueForUnit);
    }
    const result = buildDeltaReport([nan], [oracleFor(folder, ours)], [folder]);
    expect(result.rows[0].status).toBe('invalid');
    expect(result.byFamily[folder]).toMatchObject({ exact: 0, invalid: 1 });
    expect(result.ok).toBe(false);
  });
});

it('compares integer totals exactly, with inclusive signed 1% boundaries', () => {
  for (const [total, status] of [
    [100, 'exact'],
    [99, 'within1Pct'],
    [101, 'within1Pct'],
    [98, 'farther'],
    [102, 'farther'],
  ] as const) {
    expect(compareFigures(figure(), figure(total)).status).toBe(status);
  }
  expect(compareFigures(figure(1000000), figure(1000001)).status).toBe(
    'within1Pct',
  );
});

it.each([0, NaN, Infinity, -Infinity, -1])(
  'rejects invalid values on either side: %s',
  (bad) => {
    for (const key of ['total', 'defensive', 'offensive'] as const) {
      if (bad === 0 && key !== 'total') continue; // a real zero aggregate; see below
      expect(compareFigures({ ...figure(), [key]: bad }, figure()).status).toBe(
        'invalid',
      );
      expect(compareFigures(figure(), { ...figure(), [key]: bad }).status).toBe(
        'invalid',
      );
    }
  },
);

describe('a zero aggregate is a real value, a zero total is not', () => {
  const unarmed = { ...figure(), offensive: 0 };

  it('compares normally when Java and ours are both zero', () => {
    const result = compareFigures(unarmed, unarmed);
    expect(result.status).toBe('exact');
    expect(result.offensive?.withinTolerance).toBe(true);
    expect(report([{ ...computed(), figure: unarmed }], [java0()]).ok).toBe(
      true,
    );
  });

  it.each([
    ['Java', unarmed, figure()],
    ['ours', figure(), unarmed],
  ])('is a mismatch, not invalid, when only %s is zero', (_, a, b) => {
    const result = compareFigures(a, b);
    expect(result.status).toBe('exact');
    expect(result.offensive?.withinTolerance).toBe(false);
  });

  it('still rejects a NaN aggregate or a zero total beside a zero aggregate', () => {
    expect(compareFigures(unarmed, { ...unarmed, offensive: NaN }).status).toBe(
      'invalid',
    );
    expect(compareFigures({ ...unarmed, total: 0 }, unarmed).status).toBe(
      'invalid',
    );
    expect(compareFigures(unarmed, { ...unarmed, total: 0 }).status).toBe(
      'invalid',
    );
  });
});

it('uses tolerance only for aggregates and rejects fractional totals', () => {
  expect(
    compareFigures(figure(), { ...figure(), defensive: 60 + 1e-12 }).defensive
      ?.withinTolerance,
  ).toBe(true);
  expect(
    compareFigures(figure(), { ...figure(), defensive: 61 }).defensive
      ?.withinTolerance,
  ).toBe(false);
  expect(compareFigures(figure(), figure(100.1)).status).toBe('invalid');
});

it.each([
  ['Mad Cat Mk II 6', 2663, 119.99999999999999, 119.99999999999997],
  ["Vulpes VLP-1DX 'Beast'", 1229, 28.950000000000003, 28.95],
] as const)(
  'nightly keeps totals exact while accepting the observed 1-ulp sub-term: %s',
  (_, total, freshTerm, committedTerm) => {
    expect(aggregateDelta(freshTerm, committedTerm).withinTolerance).toBe(true);
    expect(aggregateDelta(1, 1 + 0.99e-9).withinTolerance).toBe(true);
    expect(aggregateDelta(1, 1 + 1.01e-9).withinTolerance).toBe(false);
    expect(aggregateDelta(freshTerm, freshTerm + 0.001).withinTolerance).toBe(
      false,
    );
    expect(compareFigures(figure(total), figure(total)).status).toBe('exact');
    expect(compareFigures(figure(total), figure(total + 1)).status).not.toBe(
      'exact',
    );
  },
);

it('compares capital defense without counting a total match or miss', () => {
  const result = report([
    {
      ...computed(),
      figure: { defensive: 60, calculationScope: 'defensive-only' },
    },
  ]);
  expect(result.rows[0]).toMatchObject({
    status: 'not-complete',
    comparison: { defensive: { withinTolerance: true } },
  });
  expect(result.byFamily.vehicles).toMatchObject({
    exact: 0,
    within1Pct: 0,
    farther: 0,
    notComplete: 1,
  });
  expect(result.ok).toBe(false);
  expect(
    compareFigures(
      { defensive: 60 },
      { defensive: 60, calculationScope: 'defensive-only' },
    ).status,
  ).toBe('not-complete');
});

it('preserves the pinned Java source-hash convention and real converter adapters', () => {
  expect(sourceHash(Buffer.from('a\r\nb\rc'))).toBe(
    sourceHash(Buffer.from('a\nb\rc')),
  );
  expect(sourceHash(Buffer.from('a\nb\rc'))).not.toBe(
    sourceHash(Buffer.from('a\nbc')),
  );
  for (const input of fixture.units) {
    const row = calculateRow({ ...input, sha256 });
    expect(row.reason).toBeUndefined();
    expect(row.figure?.total).toBeGreaterThan(0);
  }
});

it('fails closed on hash disagreement, missing units, missing families and noJavaRow', () => {
  expect(
    report([{ ...computed(), sha256: 'b'.repeat(64) }]).errors.join(),
  ).toContain('hash-mismatch');
  expect(report([]).errors.join()).toContain('unjoined-oracle');
  expect(buildDeltaReport([], [], FAMILIES).errors.join()).toContain(
    'missing-family',
  );
  expect(
    report([{ ...computed(), path: 'vehicles/other.blk' }]).errors.join(),
  ).toContain('noJavaRow');
});

it('counts unsupported rows with their reason and rejects duplicates', () => {
  const result = report([
    { ...computed(), figure: undefined, reason: 'No pinned-source TS adapter' },
  ]);
  expect(result.byFamily.vehicles.notComputable).toBe(1);
  expect(result.rows[0].reason).toBe('No pinned-source TS adapter');
  expect(result.ok).toBe(false);
  expect(report([computed(), computed()]).errors.join()).toContain('duplicate');
});

it('requires aggregate parity too and produces deterministic ordering', () => {
  expect(report([computed()]).ok).toBe(true);
  expect(
    report([{ ...computed(), figure: { ...figure(), defensive: 61 } }]).ok,
  ).toBe(false);
  const refs = [java(), { ...java(), path: 'vehicles/second.blk' }];
  const rows = [computed(), { ...computed(), path: 'vehicles/second.blk' }];
  expect(JSON.stringify(report(rows, refs))).toBe(
    JSON.stringify(report([...rows].reverse(), [...refs].reverse())),
  );
});

it('exposes the real ProtoMech handler breakdown without changing its total', () => {
  const handler = new ProtoMechUnitHandler();
  for (const source of protos) {
    const document = new BlkParserService().parse(source.content);
    if (!document.success) throw new Error(document.error.errors.join('; '));
    const parsed = handler.parse(document.data.document);
    if (!parsed.success) throw new Error(parsed.error.errors.join('; '));
    const breakdown = handler.calculateBVBreakdown(parsed.data.unit);
    const row = calculateRow({
      path: source.path.replace('data/mekfiles/', ''),
      sha256: source.sha256,
      unit: null,
      sourceText: source.content,
    });
    for (const key of [
      'armorBV',
      'structureBV',
      'weaponBV',
      'ammoBV',
      'offensiveEquipmentBV',
      'speedFactor',
    ] as const)
      expect(row.figure?.terms?.[key]).toBe(breakdown[key]);
    expect(breakdown.final).toBe(handler.calculateBV(parsed.data.unit));
    expect(breakdown.defensiveBV).toBeGreaterThan(0);
    expect(breakdown.offensiveBV).toBeGreaterThan(0);
  }
});

test.each(personnel.rows)(
  'projects actual source validity for $path',
  (source) => {
    const input = { ...source, unit: null, sourceText: source.content };
    const projected = calculateRow(input, true);
    expect(projected.constructionValidity).toMatchObject({
      isValid: source.valid,
    });
    const { constructionValidity, ...bv } = projected;
    expect(constructionValidity).toBeDefined();
    expect(bv).toEqual(calculateRow(input));
    expect(calculateRow(input)).not.toHaveProperty('constructionValidity');
  },
);

test('projects the existing ProtoMech handler without changing its BV result', () => {
  const source = protos[0];
  const input = {
    path: source.path.replace('data/mekfiles/', ''),
    sha256: source.sha256,
    unit: null,
    sourceText: source.content,
  };
  const { constructionValidity, ...bv } = calculateRow(input, true);
  expect(constructionValidity).toMatchObject({
    isValid: expect.any(Boolean),
    errors: expect.any(Array),
    warnings: expect.any(Array),
    infos: expect.any(Array),
  });
  expect(bv).toEqual(calculateRow(input));
});

test('captures a thrown construction-validator failure separately from validity', () => {
  expect(
    captureConstructionValidity(() => {
      throw new Error('Validation unavailable');
    }),
  ).toEqual({ failure: 'Error: Validation unavailable' });
});

describe('opt-in BLK validity uses actual pinned bytes and the public handler', () => {
  let root: string;
  const source = (type = 'Tank', tonnage = 20) =>
    `<UnitType>\n${type}\n</UnitType>\n<Name>\nValidity probe\n</Name>\n<tonnage>\n${tonnage}\n</tonnage>\n<type>\nIS Level 2\n</type>\n<year>\n3060\n</year>\n<motion_type>\nTracked\n</motion_type>\n<cruiseMP>\n0\n</cruiseMP>\n<armor>\n1\n1\n1\n1\n0\n</armor>\n`;
  function write(content: string, relative = 'vehicles/probe.blk') {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    // The BV payload is intentionally independent: validity must use pinned
    // source bytes, never reconstruct a source from converted BV JSON.
    return {
      path: relative,
      sha256: sourceHash(Buffer.from(content)),
      unit: fixture.units[0].unit,
    };
  }
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'vehicle-validity-'));
    resetHandlerInitialization();
    resetUnitTypeRegistry();
  });
  afterEach(() => {
    jest.restoreAllMocks();
    mockCatalogAvailable = true;
    resetEquipmentLookupService();
    resetEquipmentRegistry();
    resetEquipmentLoader();
    resetHandlerInitialization();
    resetUnitTypeRegistry();
    fs.rmSync(root, { recursive: true, force: true });
  });
  const validity = ['node', 'delta.ts', '--construction-validity'];
  test('does no catalog work without the validity opt-in', async () => {
    await prepareConstructionValidity(['node', 'delta.ts']);
    expect(getEquipmentLookupService().isInitialized()).toBe(false);
    expect(getEquipmentRegistry().isReady()).toBe(false);
  });
  test('loads the JSON equipment catalog under the validity opt-in', async () => {
    await prepareConstructionValidity(validity);
    expect(getEquipmentLookupService().getDataSource()).toBe('json');
    expect(getEquipmentRegistry().isReady()).toBe(true);
  });
  test('stops rather than validating against the hardcoded fallback catalog', async () => {
    mockCatalogAvailable = false;
    await expect(prepareConstructionValidity(validity)).rejects.toThrow(
      'Equipment catalog unavailable',
    );
  });
  test.each(overweight)(
    'rejects the independently known overweight total once the catalog is loaded: $path',
    async (row) => {
      const input = write(row.content, row.path);
      await prepareConstructionValidity(validity);
      const fact = calculateSources([input], root, true)[0]
        .constructionValidity;
      expect(fact).toMatchObject({ isValid: false });
      expect((fact as { errors: string[] }).errors).toContainEqual(
        expect.stringMatching(/^Total weight \(\d+\.\d\dt\) exceeds tonnage/),
      );
    },
  );
  test.each(vehicles.rows)(
    'transports the actual public validation for $path',
    (row) => {
      const input = write(row.content, row.path.replace('data/mekfiles/', ''));
      const plain = calculateSources([input], root)[0];
      const projected = calculateSources([input], root, true)[0];
      const document = new BlkParserService().parse(row.content);
      if (!document.success) throw new Error('Pinned fixture did not parse');
      const handler = getUnitTypeRegistry().getHandlerForDocument(
        document.data.document,
      );
      if (!handler) throw new Error('Public vehicle handler absent');
      expect(handler.category).toBe(UnitCategory.VEHICLE);
      const parsed = handler.parse(document.data.document);
      if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
      expect(projected.constructionValidity).toEqual(
        handler.validate(parsed.data.unit),
      );
      const { constructionValidity, ...unchanged } = projected;
      expect(constructionValidity).toBeDefined();
      expect(unchanged).toEqual(plain);
      expect(plain.figure?.total).toBeGreaterThan(0);
    },
  );
  test.each(aeroCapital.rows)(
    'transports the actual public aerospace/capital validation for $path',
    (row) => {
      const input = write(row.content, row.path);
      const plain = calculateSources([input], root)[0];
      const projected = calculateSources([input], root, true)[0];
      const document = new BlkParserService().parse(row.content);
      if (!document.success) throw new Error('Pinned fixture did not parse');
      const handler = getUnitTypeRegistry().getHandlerForDocument(
        document.data.document,
      );
      if (!handler) throw new Error('Public aerospace handler absent');
      expect(handler.category).toBe(UnitCategory.AEROSPACE);
      const parsed = handler.parse(document.data.document);
      if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
      const expected = handler.validate(parsed.data.unit);
      expect(projected.constructionValidity).toEqual(expected);
      // The pinned Java verdict is retained in the fixture; agreement here is
      // the capital/aerospace slice of the full-corpus validity proof.
      expect(expected.isValid).toBe(row.valid);
      const { constructionValidity, ...unchanged } = projected;
      expect(constructionValidity).toBeDefined();
      expect(unchanged).toEqual(plain);
    },
  );
  test.each(fixedWing.rows.filter((row) => row.path.startsWith('vehicles/')))(
    'validates FixedWingSupport under vehicles through the aerospace handler: $path',
    (row) => {
      const input = write(row.content, row.path);
      const document = new BlkParserService().parse(row.content);
      if (!document.success) throw new Error('Pinned fixture did not parse');
      initializeUnitTypeHandlers();
      const handler = getUnitTypeRegistry().getHandlerForDocument(
        document.data.document,
      );
      if (!handler) throw new Error('Public subtype handler absent');
      expect(handler.category).toBe(UnitCategory.AEROSPACE);
      const validate = jest.spyOn(handler, 'validate');
      const fact = calculateSources([input], root, true)[0]
        .constructionValidity;
      expect(validate).toHaveBeenCalled();
      expect(fact).toHaveProperty('isValid', row.valid);
      expect(fact).not.toHaveProperty('failure');
    },
  );
  test('does no registry/parser work without opt-in', () => {
    const parse = jest.spyOn(BlkParserService.prototype, 'parse');
    expect(calculateSources([write(source())], root)[0]).not.toHaveProperty(
      'constructionValidity',
    );
    expect(areHandlersInitialized()).toBe(false);
    expect(parse).not.toHaveBeenCalled();
  });
  test.each([
    ['Tank', 20],
    ['SupportTank', 100000],
    ['VTOL', 20],
  ] as const)(
    'records a successfully loaded invalid %s as invalid, not a parse failure',
    (type, tonnage) => {
      const fact = calculateSources(
        [write(source(type, tonnage))],
        root,
        true,
      )[0].constructionValidity;
      expect(fact).toMatchObject({
        isValid: false,
        errors: expect.any(Array),
        warnings: expect.any(Array),
        infos: expect.any(Array),
      });
      expect(fact).not.toHaveProperty('failure');
    },
  );
  test('preserves a valid stationary support design rather than inferring invalidity from zero MP', () => {
    expect(
      calculateSources([write(source('SupportTank'))], root, true)[0]
        .constructionValidity,
    ).toHaveProperty('isValid', true);
  });
  test('selects a vehicle by public category even outside the vehicles folder', () => {
    expect(
      calculateSources([write(source(), 'fighters/probe.blk')], root, true)[0]
        .constructionValidity,
    ).toHaveProperty('isValid', false);
  });
  test.each([
    ['not a BLK source', 'blk-source-parser'],
    [source('Tank', 0), 'blk-handler-parser'],
  ])('retains %s as an explicit staged failure', (content, reason) => {
    expect(
      calculateSources([write(content)], root, true)[0].constructionValidity,
    ).toEqual({ failure: expect.stringContaining(reason) });
  });
  test('keeps unavailable handlers as failures', () => {
    initializeUnitTypeHandlers();
    jest
      .spyOn(getUnitTypeRegistry(), 'getHandlerForDocument')
      .mockReturnValue(undefined);
    expect(
      calculateSources([write(source())], root, true)[0].constructionValidity,
    ).toEqual({
      failure: expect.stringContaining('blk-handler-unavailable'),
    });
  });
  test('retains a thrown validator as a distinct failure, not invalidity', () => {
    initializeUnitTypeHandlers();
    const document = new BlkParserService().parse(source());
    if (!document.success) throw new Error('Source did not parse');
    const handler = getUnitTypeRegistry().getHandlerForDocument(
      document.data.document,
    );
    if (!handler) throw new Error('Handler absent');
    const parsed = handler.parse(document.data.document);
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    jest.spyOn(handler, 'parse').mockReturnValue(parsed);
    jest.spyOn(handler, 'validate').mockImplementation(() => {
      throw new Error('validator unavailable');
    });
    expect(
      calculateSources([write(source())], root, true)[0].constructionValidity,
    ).toEqual({
      failure: expect.stringContaining(
        'blk-validator: Error: validator unavailable',
      ),
    });
  });
  test('retains all invalidity diagnostic arrays from the selected validator', () => {
    initializeUnitTypeHandlers();
    const document = new BlkParserService().parse(source());
    if (!document.success) throw new Error('Source did not parse');
    const handler = getUnitTypeRegistry().getHandlerForDocument(
      document.data.document,
    );
    if (!handler) throw new Error('Handler absent');
    const invalid = {
      isValid: false,
      errors: ['invalid'],
      warnings: ['warning'],
      infos: ['info'],
    };
    jest.spyOn(handler, 'validate').mockReturnValue(invalid);
    expect(
      calculateSources([write(source())], root, true)[0].constructionValidity,
    ).toEqual(invalid);
  });
  test('keeps hash rejection before any validation work', () => {
    const input = write(source());
    fs.appendFileSync(path.join(root, input.path), 'changed');
    expect(() => calculateSources([input], root, true)).toThrow(
      'Source hash mismatch',
    );
    expect(areHandlersInitialized()).toBe(false);
  });
});

describe('opt-in MTF validity uses the converted mech through the editor projection', () => {
  let root: string;
  const validity = ['node', 'delta.ts', '--construction-validity'];
  // The converted unit carries the design; the MTF bytes are only hash-checked.
  function write(unit: unknown, relative = 'meks/probe.mtf') {
    const content = 'MTF bytes are hash-checked, never reparsed for validity\n';
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return {
      path: relative,
      sha256: sourceHash(Buffer.from(content)),
      unit,
    };
  }
  const fact = (unit: unknown) =>
    calculateSources([write(unit)], root, true)[0].constructionValidity;
  beforeEach(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mech-validity-'));
    await prepareConstructionValidity(validity);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    mockCatalogAvailable = true;
    resetEquipmentLookupService();
    resetEquipmentRegistry();
    resetEquipmentLoader();
    fs.rmSync(root, { recursive: true, force: true });
  });
  test('records a legal mech as valid without changing its BV result', () => {
    const input = write(blackHawk);
    const plain = calculateSources([input], root)[0];
    const projected = calculateSources([input], root, true)[0];
    expect(projected.constructionValidity).toEqual({
      isValid: true,
      errors: [],
      warnings: expect.any(Array),
      infos: expect.any(Array),
    });
    const { constructionValidity, ...unchanged } = projected;
    expect(constructionValidity).toBeDefined();
    expect(unchanged).toEqual(plain);
    expect(plain).not.toHaveProperty('constructionValidity');
  });
  test('records an overweight mech as invalid with the universal weight rule', () => {
    const result = fact({ ...blackHawk, tonnage: 20 });
    expect(result).toMatchObject({ isValid: false });
    expect((result as { errors: string[] }).errors).toContainEqual(
      expect.stringContaining('VAL-UNIV-014'),
    );
    expect(result).not.toHaveProperty('failure');
  });
  test('is deterministic across runs', () => {
    expect(fact(blackHawk)).toEqual(fact(blackHawk));
  });
  test('validates even when the BV path could not use the converted unit', () => {
    const row = calculateSources(
      [write({ ...blackHawk, tonnage: 20 })],
      root,
      true,
    )[0];
    expect(row.constructionValidity).toMatchObject({ isValid: false });
  });
  test('keeps a missing converted unit as an explicit staged failure', () => {
    expect(fact(null)).toEqual({
      failure: expect.stringContaining('mtf-converted-unit'),
    });
  });
  test('keeps a loader throw as a failure, not invalidity', () => {
    jest
      .spyOn(UnitLoaderService.prototype, 'mapToUnitState')
      .mockImplementation(() => {
        throw new Error('unmappable');
      });
    expect(fact(blackHawk)).toEqual({
      failure: expect.stringContaining('mtf-load: Error: unmappable'),
    });
  });
  test('keeps a thrown validator as a failure, not invalidity', () => {
    jest
      .spyOn(orchestrator.getUnitValidationOrchestrator(), 'validate')
      .mockImplementation(() => {
        throw new Error('validator unavailable');
      });
    expect(fact(blackHawk)).toEqual({
      failure: expect.stringContaining(
        'mtf-validator: Error: validator unavailable',
      ),
    });
  });
  test('does no mech projection work without opt-in', () => {
    const load = jest.spyOn(UnitLoaderService.prototype, 'mapToUnitState');
    expect(calculateSources([write(blackHawk)], root)[0]).not.toHaveProperty(
      'constructionValidity',
    );
    expect(load).not.toHaveBeenCalled();
  });
  test('keeps hash rejection before any projection work', () => {
    const input = write(blackHawk);
    fs.appendFileSync(path.join(root, input.path), 'changed');
    const load = jest.spyOn(UnitLoaderService.prototype, 'mapToUnitState');
    expect(() => calculateSources([input], root, true)).toThrow(
      'Source hash mismatch',
    );
    expect(load).not.toHaveBeenCalled();
  });
});

describe('opt-in construction weights ride along without moving anything else', () => {
  let root: string;
  const weights = ['node', 'delta.ts', '--construction-weights'];
  const puma = () =>
    vehicles.rows.find((row) =>
      row.path.endsWith('Puma Assault Tank PAT-001.blk'),
    )!;
  // The BV payload is independent: weights use the pinned source bytes.
  function write() {
    const row = puma();
    const relative = row.path.replace('data/mekfiles/', '');
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, row.content);
    return {
      path: relative,
      sha256: sourceHash(Buffer.from(row.content)),
      unit: null,
      reason: 'BV payload is independent of the weight capture',
    };
  }
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'weights-'));
    resetHandlerInitialization();
    resetUnitTypeRegistry();
  });
  afterEach(() => {
    mockCatalogAvailable = true;
    resetEquipmentLookupService();
    resetEquipmentRegistry();
    resetEquipmentLoader();
    resetHandlerInitialization();
    resetUnitTypeRegistry();
    fs.rmSync(root, { recursive: true, force: true });
  });
  test('--construction-weights loads the JSON catalog, and stops on the fallback', async () => {
    await prepareConstructionValidity(weights);
    expect(getEquipmentLookupService().getDataSource()).toBe('json');
    expect(getEquipmentRegistry().isReady()).toBe(true);
    resetEquipmentLookupService();
    resetEquipmentRegistry();
    resetEquipmentLoader();
    mockCatalogAvailable = false;
    await expect(prepareConstructionValidity(weights)).rejects.toThrow(
      'Equipment catalog unavailable',
    );
  });
  test('adds only constructionWeights, byte-identical otherwise, with and without validity', async () => {
    await prepareConstructionValidity(weights);
    const raw = write();
    for (const validity of [false, true]) {
      const plain = calculateSources([raw], root, validity)[0];
      const withWeights = calculateSources([raw], root, validity, true)[0];
      const { constructionWeights, ...unchanged } = withWeights;
      expect(constructionWeights).toBeDefined();
      expect(JSON.stringify(unchanged)).toBe(JSON.stringify(plain));
      expect(plain).not.toHaveProperty('constructionWeights');
    }
  });
  test('the captured fact feeds the comparator end to end', async () => {
    await prepareConstructionValidity(weights);
    const raw = write();
    const row = calculateSources([raw], root, false, true)[0];
    const report = buildWeightReport(
      [row],
      [
        {
          path: raw.path,
          sha256: raw.sha256,
          concreteFamily: 'Tank',
          battleValue: {
            total: 1,
            aggregates: { defensiveValue: 0, offensiveValue: 0 },
          },
          construction: {
            weightTerms: {
              getWeightEngine: 25,
              getWeightStructure: 9.5,
              getWeightWeapon: 32,
              getWeightAmmo: 4,
            },
            weightTotal: 95,
          },
        },
      ],
      ['vehicles'],
    );
    expect(report.rows[0].terms.map((t) => t.status)).toEqual([
      'exact',
      'exact',
      'grouped:mountedEquipment',
      'grouped:mountedEquipment',
    ]);
    expect(report.rows[0].groups[0]).toMatchObject({
      java: 36,
      status: 'exact',
    });
  });
  test('keeps hash rejection before any weight work', () => {
    const raw = write();
    fs.appendFileSync(path.join(root, raw.path), 'changed');
    expect(() => calculateSources([raw], root, false, true)).toThrow(
      'Source hash mismatch',
    );
  });
});

describe('opt-in verifier quantities ride along without moving anything else', () => {
  let root: string;
  const flag = ['node', 'delta.ts', '--construction-quantities'];
  const puma = () =>
    vehicles.rows.find((row) =>
      row.path.endsWith('Puma Assault Tank PAT-001.blk'),
    )!;
  function write() {
    const row = puma();
    const relative = row.path.replace('data/mekfiles/', '');
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, row.content);
    return {
      path: relative,
      sha256: sourceHash(Buffer.from(row.content)),
      unit: null,
      reason: 'BV payload is independent of the quantity capture',
    };
  }
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'quantities-'));
    resetHandlerInitialization();
    resetUnitTypeRegistry();
  });
  afterEach(() => {
    mockCatalogAvailable = true;
    resetEquipmentLookupService();
    resetEquipmentRegistry();
    resetEquipmentLoader();
    resetHandlerInitialization();
    resetUnitTypeRegistry();
    fs.rmSync(root, { recursive: true, force: true });
  });
  test('--construction-quantities loads the JSON catalog, and stops on the fallback', async () => {
    await prepareConstructionValidity(flag);
    expect(getEquipmentLookupService().getDataSource()).toBe('json');
    expect(getEquipmentRegistry().isReady()).toBe(true);
    resetEquipmentLookupService();
    resetEquipmentRegistry();
    resetEquipmentLoader();
    mockCatalogAvailable = false;
    await expect(prepareConstructionValidity(flag)).rejects.toThrow(
      'Equipment catalog unavailable',
    );
  });
  test('adds only constructionQuantities, byte-identical otherwise, alone and with the other modes', async () => {
    await prepareConstructionValidity(flag);
    const raw = write();
    for (const [validity, weights] of [
      [false, false],
      [true, false],
      [false, true],
      [true, true],
    ]) {
      const plain = calculateSources([raw], root, validity, weights)[0];
      const withQuantities = calculateSources(
        [raw],
        root,
        validity,
        weights,
        true,
      )[0];
      const { constructionQuantities, ...unchanged } = withQuantities;
      expect(constructionQuantities).toBeDefined();
      expect(JSON.stringify(unchanged)).toBe(JSON.stringify(plain));
      expect(plain).not.toHaveProperty('constructionQuantities');
    }
  });
  test('one weight capture feeds both comparators', async () => {
    await prepareConstructionValidity(flag);
    const row = calculateSources([write()], root, false, true, true)[0];
    const weights = row.constructionWeights as { total: number };
    const quantities = row.constructionQuantities as {
      values: { weightExact: number };
    };
    expect(quantities.values.weightExact).toBe(weights.total);
  });
  test('the captured fact feeds the comparator end to end', async () => {
    await prepareConstructionValidity(flag);
    const raw = write();
    const row = calculateSources([raw], root, false, false, true)[0];
    // Java: P1 vehicles/2750 IS Land/Puma Assault Tank PAT-001.blk (sha bee08713...).
    const java = {
      weightExact: { value: 95, unit: 't' },
      weightRounded: { value: 95, unit: 't' },
      weightDesign: { value: 95, unit: 't' },
      armorPoints: { value: 184, unit: 'points' },
      criticalSlots: { value: 150, unit: 'slots' },
    };
    const settings = Object.fromEntries([
      ['ammoTechLevel', 0],
      ['gameYear', -1],
      ['getIntroYearMargin', 5],
      ['getMaxOverweight', 0],
      ['getMinUnderweight', 1],
      ['getPrintSize', 70],
      ['getTargetingComputerCrits', 0],
      ...[
        'Armor',
        'Controls',
        'Engine',
        'Gyro',
        'Lifting',
        'PowerAmp',
        'Structure',
        'Turret',
      ].map((name) => [`getWeightCeiling${name}`, 'HALF_TON']),
      ['getWeightCeilingTargComp', 'TON'],
      ['getWeightCeilingWeapons', 'TON'],
      ['showCorrectArmor', true],
      ['showCorrectCritical', true],
      ['showFailedEquip', true],
      ['showIncorrectIntroYear', true],
      ['showOverweightedEntity', true],
      ['showUnderweightEntity', false],
      ['skip', false],
    ]);
    const report = buildQuantityReport(
      [row],
      [
        {
          path: raw.path,
          sha256: raw.sha256,
          concreteFamily: 'Tank',
          battleValue: {
            total: 1,
            aggregates: { defensiveValue: 0, offensiveValue: 0 },
          },
          construction: {
            valid: true,
            verifierClass: 'megamek.common.verifier.TestTank',
            verifierQuantities: java,
            settings,
          },
        },
      ],
      ['vehicles'],
    );
    expect(
      Object.fromEntries(
        report.rows[0].quantities.map((q) => [q.key, q.status]),
      ),
    ).toEqual({
      weightExact: 'exact',
      weightRounded: 'missing-local',
      weightDesign: 'exact',
      armorPoints: 'exact',
      criticalSlots: 'missing-local',
    });
    expect(report.rows[0].status).toBe('incomplete');
    const cell = report.settings.cells[0];
    const status = (key: string) =>
      cell.results.find((result) => result.key === key)?.status;
    expect(cell).toMatchObject({
      family: 'vehicles',
      verifierClass: 'TestTank',
    });
    expect(status('getMaxOverweight')).toBe('matched');
    expect(status('showOverweightedEntity')).toBe('matched');
    expect(status('getWeightCeilingControls')).toBe('matched');
    expect(status('getIntroYearMargin')).toBe('matched');
    expect(status('skip')).toBe('missing-local');
    expect(status('getWeightCeilingEngine')).toBe('inapplicable-candidate');
    expect(report.ok).toBe(false);
  });
  test('keeps hash rejection before any quantity work', () => {
    const raw = write();
    fs.appendFileSync(path.join(root, raw.path), 'changed');
    expect(() => calculateSources([raw], root, false, false, true)).toThrow(
      'Source hash mismatch',
    );
  });
});
