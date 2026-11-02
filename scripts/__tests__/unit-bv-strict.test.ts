import { BlkParserService } from '../../src/services/conversion/BlkParserService';
import protos from '../../src/services/units/handlers/__tests__/fixtures/native-protomek.json';
import { ProtoMechUnitHandler } from '../../src/services/units/handlers/ProtoMechUnitHandler';
import {
  buildDeltaReport,
  calculateRow,
  compareFigures,
  FAMILIES,
  sourceHash,
  type IJavaReferenceRow,
  type IComputedRow,
} from '../vehicle-aero-bv-delta';
import fixture from './fixtures/vehicle_aero_contract_bv.json';

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
const computed = (family = 'vehicles'): IComputedRow => ({
  path: java(family).path,
  sha256,
  figure: figure(),
});
const report = (ours: IComputedRow[], refs = [java()]) =>
  buildDeltaReport(ours, refs, ['vehicles']);

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
      expect(compareFigures({ ...figure(), [key]: bad }, figure()).status).toBe(
        'invalid',
      );
      expect(compareFigures(figure(), { ...figure(), [key]: bad }).status).toBe(
        'invalid',
      );
    }
  },
);

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
    expect(breakdown.final).toBe(handler.calculateBV(parsed.data.unit));
    expect(breakdown.defensiveBV).toBeGreaterThan(0);
    expect(breakdown.offensiveBV).toBeGreaterThan(0);
  }
});
