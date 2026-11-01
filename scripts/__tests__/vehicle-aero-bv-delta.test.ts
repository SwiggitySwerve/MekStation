import * as fs from 'fs';
import * as path from 'path';

import {
  aggregateDelta,
  buildDeltaReport,
  summarizeGroup,
  type IConvertedRow,
  type IDeltaRow,
  type IJavaReferenceRow,
} from '../vehicle-aero-bv-delta';

// Converter output (fluff stripped) for 31 pinned mm-data units plus their UL-16
// pinned-Java rows: Tank, SuperHeavy, SupportTank, VTOL, SupportVTOL, ASF,
// ConvFighter, FixedWingSupport (convfighter/) and SmallCraft.
const fixture = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'fixtures', 'vehicle_aero_contract_bv.json'),
    'utf-8',
  ),
) as { units: IConvertedRow[]; reference: IJavaReferenceRow[] };

describe('vehicle/aerospace BV delta harness', () => {
  const report = buildDeltaReport(fixture.units, fixture.reference);

  it('returns a BV number for every converter unit', () => {
    expect(report.total.units).toBe(fixture.units.length);
    expect(report.total.numeric).toBe(fixture.units.length);
    expect(report.rows.filter((r) => r.status !== 'number')).toEqual([]);
  });

  it('joins each unit to its Java row and records the signed delta', () => {
    for (const row of report.rows) {
      const java = fixture.reference.find((r) => r.path === row.path);
      expect(row.javaTotal).toBe(java?.battleValue.total);
      expect(row.delta).toBe((row.ourTotal ?? NaN) - (row.javaTotal ?? NaN));
    }
    const tamerlane = report.rows.find((r) =>
      r.path.endsWith('Tamerlane Strike Sled (Flamer).blk'),
    );
    expect(tamerlane?.javaTotal).toBe(436);
  });

  it('signs the percentage like the delta, relative to Java (#2443 review)', () => {
    const signed = report.rows.filter((r) => r.delta !== 0);
    expect(signed.length).toBeGreaterThan(0);
    for (const row of signed) {
      expect(row.deltaPct).toBe(
        ((row.delta ?? NaN) / (row.javaTotal ?? NaN)) * 100,
      );
    }
  });

  it('groups by Java class and by our unit type separately (#2443 review)', () => {
    const keys = (values: (string | null)[]) =>
      [...new Set(values.map((v) => v ?? '(none)'))].sort();
    expect(Object.keys(report.byJavaClass)).toEqual(
      keys(report.rows.map((r) => r.javaClass)),
    );
    expect(Object.keys(report.byUnitType)).toEqual(
      keys(report.rows.map((r) => r.unitType)),
    );
    expect(Object.keys(report.byJavaClass)).not.toEqual(
      Object.keys(report.byUnitType),
    );
  });

  it('reports a unit with no Java row and Java rows with no converter output', () => {
    const [first, ...rest] = fixture.units;
    const orphan = buildDeltaReport([first], fixture.reference.slice(1));
    expect(orphan.rows[0].status).toBe('no-java-row');
    expect(orphan.rows[0].ourTotal).toEqual(expect.any(Number));
    // A path mismatch must show in the headline, not only as zero comparisons.
    expect(orphan.total).toMatchObject({ numeric: 1, noJavaRow: 1 });
    const missing = buildDeltaReport([first], fixture.reference);
    expect(
      Object.values(missing.javaRowsWithNoConverterOutput).reduce(
        (a, b) => a + b,
        0,
      ),
    ).toBe(rest.length);
  });

  it('records an adapter failure as a throw row, not a crash', () => {
    const broken: IConvertedRow = {
      path: 'x.blk',
      unit: { ...fixture.units[0].unit, motionType: 'Walker' },
    };
    const result = buildDeltaReport([broken], []);
    expect(result.rows[0]).toMatchObject({ status: 'throw', ourTotal: null });
    expect(result.rows[0].error).toContain('Unknown motionType');
    expect(result.total.throws).toBe(1);
  });

  it.each([
    ['Tamerlane Strike Sled (Flamer).blk', 'movement', 'cruiseMP'],
    ['Tamerlane Strike Sled (Flamer).blk', 'armor', 'armor.byLocation'],
    ['Sabre SB-27b-EC.blk', 'movement', 'safeThrust'],
    ['Sabre SB-27b-EC.blk', 'armor', 'armor.byArc'],
  ])('records %s without %s as a failure', (file, missing, fact) => {
    const source = fixture.units.find((row) => row.path.endsWith(file));
    if (!source) throw new Error(`Missing fixture: ${file}`);
    const incomplete: IConvertedRow = {
      ...source,
      unit: {
        ...source.unit,
        ...(missing === 'movement'
          ? { movement: {} }
          : { armor: { type: source.unit.armor.type } }),
      },
    };
    const result = buildDeltaReport([incomplete], fixture.reference);
    expect(result.rows[0]).toMatchObject({ status: 'throw', ourTotal: null });
    expect(result.rows[0].error).toContain(fact);
    expect(result.total.numeric).toBe(0);
    expect(result.total.throws).toBe(1);
  });
});

describe('group summary buckets (#2443 review)', () => {
  const row = (deltaPct: number, delta: number): IDeltaRow => ({
    path: `${deltaPct}.blk`,
    id: `u${deltaPct}`,
    unitType: 'Vehicle',
    javaClass: 'Tank',
    status: 'number',
    javaConstructionValid: true,
    javaTotal: 100,
    ourTotal: 100 + delta,
    delta,
    deltaPct,
    defensive: null,
    offensive: null,
  });

  it('counts exact, the 1% boundary as within, and both signs over 1%', () => {
    const summary = summarizeGroup([
      row(0, 0),
      row(1, 1),
      row(-1, -1),
      row(1.5, 1.5),
      row(-4, -4),
      row(0.25, 0.25),
    ]);
    expect(summary).toMatchObject({
      exactTotal: 1,
      within1Pct: 4,
      over1Pct: 2,
      meanDeltaPct: (0 + 1 - 1 + 1.5 - 4 + 0.25) / 6,
    });
  });
});

describe('aggregate tolerance', () => {
  it('accepts a 2 ulp difference and rejects a visible one', () => {
    const base = 63.800000000000004;
    expect(
      aggregateDelta(base, base + 2 * Number.EPSILON * base).withinTolerance,
    ).toBe(true);
    expect(aggregateDelta(base, base + 0.05).withinTolerance).toBe(false);
  });
});
