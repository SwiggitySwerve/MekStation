import { BlkParserService } from '../../src/services/conversion/BlkParserService';
import protos from '../../src/services/units/handlers/__tests__/fixtures/native-protomek.json';
import personnel from '../../src/services/units/handlers/__tests__/fixtures/personnel-validity.json';
import { ProtoMechUnitHandler } from '../../src/services/units/handlers/ProtoMechUnitHandler';
import * as dispatcher from '../../src/utils/construction/battleValueCalculations';
import {
  buildDeltaReport,
  calculateRow,
  captureConstructionValidity,
  compareFigures,
  FAMILIES,
  sourceHash,
  type IFigure,
  type IJavaReferenceRow,
  type IComputedRow,
} from '../vehicle-aero-bv-delta';
import fixture from './fixtures/vehicle_aero_contract_bv.json';

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
