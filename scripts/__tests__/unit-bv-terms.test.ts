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
test('per-mount weapon terms compare by location, not by equipment index or name', () => {
  const withWeapons = (
    java: Record<string, number>,
    mine: Record<string, number>,
  ) =>
    report(
      { ...ours, figure: { ...ours.figure, terms: { ...terms, ...mine } } },
      {
        ...ref,
        battleValue: { ...ref.battleValue, terms: { ...terms, ...java } },
      },
    ).rows[0].firstTermDifference;
  const java = {
    'weapon.6.LA.Medium Laser': 23,
    'weapon.8.RA.Medium Laser': 46,
    'weapon.9.RA.SRM 6': 59,
    'trooper.1.weapon.2.SSWM.ISSmallLaser': 9,
  };
  expect(
    withWeapons(java, {
      'weapon.0.LA.medium-laser': 23,
      'weapon.1.RA.srm-6': 59,
      'weapon.2.RA.medium-laser': 46,
      'trooper.1.weapon.0.SSWM.small-laser': 9,
    }),
  ).toBeNull();
  expect(
    withWeapons(java, {
      'weapon.0.LA.medium-laser': 46,
      'weapon.1.RA.srm-6': 59,
      'weapon.2.RA.medium-laser': 23,
      'trooper.1.weapon.0.SSWM.small-laser': 9,
    }),
  ).toEqual({ term: 'weapon.LA.#0', java: 23, ours: 46 });
  expect(
    withWeapons(java, {
      'weapon.0.LA.medium-laser': 23,
      'weapon.1.LA.small-laser': 9,
      'weapon.2.RA.srm-6': 59,
      'weapon.3.RA.medium-laser': 46,
      'trooper.1.weapon.0.SSWM.small-laser': 9,
    }),
  ).toEqual({ term: 'weapon.LA.count', java: 1, ours: 2 });
  expect(withWeapons(java, {})).toEqual({
    term: 'trooper.1.weapon.SSWM.#0',
    java: 9,
    ours: null,
  });
});

test('reports every term difference after the first, with separate omissions and numeric errors', () => {
  const result = report(
    {
      ...ours,
      figure: {
        ...ours.figure,
        terms: { ...terms, armorBV: 59, structureBV: 1 },
      },
    },
    {
      ...ref,
      battleValue: {
        ...ref.battleValue,
        terms: { ...terms, 'ammo.available.AC:5': 2 },
      },
    },
  );
  expect(result.rows[0]).toMatchObject({
    firstTermDifference: { term: 'armorBV', java: 60, ours: 59 },
    termDifferences: [
      { term: 'armorBV', java: 60, ours: 59, issues: ['different'] },
      { term: 'structureBV', java: 0, ours: 1, issues: ['different'] },
      {
        term: 'ammo.available.AC:5',
        java: 2,
        ours: null,
        issues: ['missingLocal'],
      },
    ],
  });
  expect(result.byFamily.vehicles).toMatchObject({
    exact: 1,
    termMatched: 0,
    termCoverage: {
      armorBV: { compared: 1, matched: 0, different: 1, missingLocal: 0 },
      ammoBV: { compared: 1, matched: 1, different: 0 },
      'ammo.available.AC:5': {
        compared: 1,
        matched: 0,
        missingLocal: 1,
        different: 0,
      },
    },
  });
});

test('term coverage preserves both-side omissions and nonfinite causes', () => {
  const referenceTerms: Record<string, number> = {
    ...terms,
    structureBV: Infinity,
  };
  delete referenceTerms.armorBV;
  const result = report(
    {
      ...ours,
      figure: {
        ...ours.figure,
        terms: {
          ...terms,
          armorBV: undefined,
          structureBV: NaN,
          ammoBV: Infinity,
        },
      },
    },
    {
      ...ref,
      battleValue: { ...ref.battleValue, terms: referenceTerms },
    },
  );
  expect(result.rows[0].termDifferences).toEqual([
    {
      term: 'armorBV',
      java: null,
      ours: null,
      issues: ['missingReference', 'missingLocal'],
    },
    {
      term: 'structureBV',
      java: Infinity,
      ours: NaN,
      issues: ['nonfiniteReference', 'nonfiniteLocal'],
    },
    { term: 'ammoBV', java: 0, ours: Infinity, issues: ['nonfiniteLocal'] },
  ]);
  expect(result.byFamily.vehicles.termCoverage).toMatchObject({
    armorBV: { compared: 1, matched: 0, missingReference: 1, missingLocal: 1 },
    structureBV: {
      compared: 1,
      matched: 0,
      nonfiniteReference: 1,
      nonfiniteLocal: 1,
    },
  });
});

test('term census excludes unjoined rows, retains missing figures and is opt-in', () => {
  const unjoined = { ...ours, sha256: 'b'.repeat(64) };
  expect(report(unjoined).rows[0].termDifferences).toEqual([]);
  expect(report(unjoined).byFamily.vehicles.termCoverage).toEqual({});
  const missing = report({ path: ours.path, sha256: ours.sha256 });
  expect(missing.byFamily.vehicles).toMatchObject({
    termMatched: 0,
    termCoverage: { armorBV: { compared: 1, matched: 0, missingLocal: 1 } },
  });
  expect(report().rows[0].termDifferences).toEqual([]);
  expect(report(ours, ref, false).rows[0]).not.toHaveProperty(
    'termDifferences',
  );
  expect(report(ours, ref, false).byFamily.vehicles).not.toHaveProperty(
    'termCoverage',
  );
  const paths = ['vehicles/a.blk', 'vehicles/b.blk', 'vehicles/c.blk'];
  const census = buildDeltaReport(
    paths.map((path, index) => ({
      ...ours,
      path,
      sha256: index === 2 ? 'b'.repeat(64) : ours.sha256,
      figure: {
        ...ours.figure,
        terms: { ...terms, armorBV: index === 1 ? 59 : terms.armorBV },
      },
    })),
    paths.map((path) => ({ ...ref, path })),
    ['vehicles'],
    true,
  );
  expect(census.byFamily.vehicles).toMatchObject({
    rows: 3,
    joined: 2,
    termMatched: 1,
    termCoverage: { armorBV: { compared: 2, matched: 1, different: 1 } },
  });
});
