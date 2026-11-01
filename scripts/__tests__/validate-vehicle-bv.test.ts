import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { calculateBattleValueForUnit } from '../../src/utils/construction/battleValueCalculations';
import { contractUnitToBVUnit } from '../../src/utils/construction/contractBVUnitAdapter';
import { buildReport, exitCodeForReport } from '../validate-vehicle-bv';

// Pass-through wrappers: real behaviour by default, observable calls, and a
// per-test override for the dispatcher result.
jest.mock('../../src/utils/construction/contractBVUnitAdapter', () => {
  const actual = jest.requireActual(
    '../../src/utils/construction/contractBVUnitAdapter',
  );
  return {
    ...actual,
    contractUnitToBVUnit: jest.fn(actual.contractUnitToBVUnit),
  };
});
jest.mock('../../src/utils/construction/battleValueCalculations', () => {
  const actual = jest.requireActual(
    '../../src/utils/construction/battleValueCalculations',
  );
  return {
    ...actual,
    calculateBattleValueForUnit: jest.fn(actual.calculateBattleValueForUnit),
  };
});

const CATALOG = path.resolve(
  __dirname,
  '..',
  '..',
  'public',
  'data',
  'units',
  'vehicles',
);

function makeCatalog(files: Record<string, unknown>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vehicle-bv-'));
  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), JSON.stringify(body));
  }
  return dir;
}

// A raw catalog contract: the shape only the adapter can turn into a BV input.
const airCar = JSON.parse(
  fs.readFileSync(path.join(CATALOG, 'Air Car.json'), 'utf-8'),
);

describe('validate-vehicle-bv', () => {
  beforeEach(() => jest.mocked(contractUnitToBVUnit).mockClear());

  it('routes every catalog contract through contractUnitToBVUnit', () => {
    const spy = jest.mocked(contractUnitToBVUnit);
    const report = buildReport(makeCatalog({ 'Air Car.json': airCar }));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toMatchObject({ id: airCar.id });
    expect(report.errors).toEqual([]);
    expect(report.totalUnits).toBe(1);
    expect(Number.isFinite(report.units[0].computedBV)).toBe(true);
  });

  it('skips index.json and units-manifest.json instead of treating them as designs', () => {
    const report = buildReport(
      makeCatalog({
        'Air Car.json': airCar,
        'index.json': { version: '1', totalUnits: 1, units: [] },
        'units-manifest.json': { version: '1', units: [] },
      }),
    );

    expect(report.errors).toEqual([]);
    expect(report.totalUnits).toBe(1);
  });

  it('reports a non-finite BV as an error, not as a null-serialised unit', () => {
    jest.mocked(calculateBattleValueForUnit).mockReturnValueOnce({
      kind: 'vehicle',
      breakdown: { final: NaN },
    } as never);
    const report = buildReport(makeCatalog({ 'Air Car.json': airCar }));

    expect(report.units).toEqual([]);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0].message).toMatch(/non-finite/i);
  });

  it('exits non-zero for any adapter or calculation failure, zero for a clean run', () => {
    const adapterFailure = buildReport(
      makeCatalog({ 'Bad.json': { ...airCar, motionType: 'Teleport' } }),
    );
    expect(adapterFailure.errors).toHaveLength(1);
    expect(exitCodeForReport(adapterFailure)).toBe(1);

    const clean = buildReport(makeCatalog({ 'Air Car.json': airCar }));
    expect(exitCodeForReport(clean)).toBe(0);
  });

  it('keeps BV accuracy out of the gate: a MUL mismatch still exits zero', () => {
    const report = buildReport(
      makeCatalog({ 'Air Car.json': { ...airCar, mulBV: 1 } }),
    );

    expect(report.parityCoverage.withMulBV).toBe(1);
    expect(report.outliers).toHaveLength(1);
    expect(exitCodeForReport(report)).toBe(0);
  });
});
