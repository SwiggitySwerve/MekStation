import * as fs from 'fs';
import * as path from 'path';

import {
  aggregateDelta,
  buildDeltaReport,
  type IConvertedRow,
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

  it('reports a unit with no Java row and Java rows with no converter output', () => {
    const [first, ...rest] = fixture.units;
    const orphan = buildDeltaReport([first], fixture.reference.slice(1));
    expect(orphan.rows[0].status).toBe('no-java-row');
    expect(orphan.rows[0].ourTotal).toEqual(expect.any(Number));
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
