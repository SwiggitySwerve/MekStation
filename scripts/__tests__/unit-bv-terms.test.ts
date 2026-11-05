import {
  buildDeltaReport,
  type IComputedRow,
  type IJavaReferenceRow,
} from '../unit-bv-parity';
import { calculateRow } from '../vehicle-aero-bv-delta';
import fixture from './fixtures/vehicle_aero_contract_bv.json';

test('aerospace adapter transports existing SI, weapon-pool and penalty terms', () => {
  const source = fixture.units.find((row) => row.path.startsWith('fighters/'));
  expect(source).toBeDefined();
  const result = calculateRow({ ...source, sha256: 'a'.repeat(64) });
  expect(result.reason).toBeUndefined();
  const terms = result.figure?.terms;
  expect(terms?.structureBV).toEqual(expect.any(Number));
  expect(terms?.structureBV).toBe(terms?.siBV);
  expect(terms?.explosivePenalty).toBe(terms?.explosivePenalties);
  expect(terms?.weaponBV).toBe(
    (terms?.weaponFirePoolBV ?? NaN) + (terms?.fuselageWeaponBV ?? NaN),
  );
  expect(terms?.summaryModifier).toBe(1);
});

test('vehicle adapter emits per-mount weapons and native ammo pools like the Java trace', () => {
  const source = fixture.units.find((row) =>
    row.path.includes('Prime Mover (Original)'),
  );
  expect(source).toBeDefined();
  const result = calculateRow({ ...source, sha256: 'a'.repeat(64) });
  expect(result.reason).toBeUndefined();
  const terms = result.figure?.terms ?? {};
  const mounts = Object.entries(terms).filter(([key]) =>
    key.startsWith('weapon.'),
  );
  // Tank.java:174 abbreviations: Front FR, Turret TU.
  expect(mounts.map(([key]) => key.split('.')[2]).sort()).toEqual([
    'FR',
    'FR',
    'TU',
  ]);
  expect(mounts.reduce((sum, [, value]) => sum + (value ?? NaN), 0)).toBe(
    terms.weaponBV,
  );
  expect(terms['ammo.available.SRM:4']).toEqual(expect.any(Number));
  expect(terms['ammo.cap.SRM:4']).toEqual(expect.any(Number));
});

const terms = {
  armorBV: 60,
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
const ref = {
  path: 'vehicles/unit.blk',
  sha256: 'a'.repeat(64),
  concreteFamily: 'Tank',
  battleValue: {
    total: 100,
    aggregates: { defensiveValue: 60, offensiveValue: 40 },
    terms,
  },
};
const ours = {
  path: ref.path,
  sha256: ref.sha256,
  figure: { total: 100, defensive: 60, offensive: 40, terms },
};
const report = (
  input: IComputedRow = ours,
  java: IJavaReferenceRow = ref,
  strict = true,
) => buildDeltaReport([input], [java], ['vehicles'], strict);

test('per-term mode detects compensating errors hidden by exact aggregates', () => {
  const result = report({
    ...ours,
    figure: {
      ...ours.figure,
      terms: { ...terms, armorBV: 59, structureBV: 1 },
    },
  });
  expect(result.ok).toBe(false);
  expect(result.rows[0].firstTermDifference?.term).toBe('armorBV');
  expect(result.errors).toContain('term-mismatch: vehicles/unit.blk: armorBV');
});

test('family summaries count complete term matches and first differences separately', () => {
  expect(report().byFamily.vehicles).toMatchObject({
    termMatched: 1,
    firstTermDifferences: {},
  });
  const missing = report({ ...ours, figure: { ...ours.figure, terms: {} } });
  expect(missing.byFamily.vehicles).toMatchObject({
    exact: 1,
    termMatched: 0,
    firstTermDifferences: { armorBV: 1 },
  });
  expect(report(ours, ref, false).byFamily.vehicles).not.toHaveProperty(
    'termMatched',
  );
  expect(
    buildDeltaReport([], [ref], ['vehicles'], true).byFamily.vehicles,
  ).toMatchObject({ termMatched: 0, firstTermDifferences: {} });
});
test('per-term mode fails closed on missing maps, required terms, and detail terms', () => {
  for (const missing of [undefined, {}, { ...terms, armorBV: undefined }]) {
    expect(
      report({ ...ours, figure: { ...ours.figure, terms: missing } }).ok,
    ).toBe(false);
  }
  expect(
    report(ours, {
      ...ref,
      battleValue: {
        ...ref.battleValue,
        terms: { ...terms, 'ammo.group.AC': 2 },
      },
    }).ok,
  ).toBe(false);
  expect(
    report(ours, {
      ...ref,
      battleValue: { ...ref.battleValue, terms: undefined },
    }).ok,
  ).toBe(false);
});
test('per-term mode retains aggregate gates, tolerates float order, and is opt-in', () => {
  expect(report().ok).toBe(true);
  expect(
    report({
      ...ours,
      figure: { ...ours.figure, terms: { ...terms, armorBV: 60 + 1e-12 } },
    }).ok,
  ).toBe(true);
  expect(
    report({
      ...ours,
      figure: { ...ours.figure, terms: { ...terms, armorBV: NaN } },
    }).ok,
  ).toBe(false);
  expect(report({ ...ours, figure: { ...ours.figure, total: 99 } }).ok).toBe(
    false,
  );
  expect(
    report(
      { ...ours, figure: { ...ours.figure, terms: undefined } },
      ref,
      false,
    ).ok,
  ).toBe(true);
});
