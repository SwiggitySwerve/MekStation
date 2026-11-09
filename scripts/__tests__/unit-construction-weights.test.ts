import { buildWeightReport } from '../unit-construction-weights';

const key = { path: 'meks/unit.mtf', sha256: 'a'.repeat(64) };
const WEIGHT_TERMS = { getWeightEngine: 100, getWeightStructure: 5 };
const reference = (
  terms: Record<string, number> = WEIGHT_TERMS,
  total = 105,
  extra: Record<string, unknown> = {},
) => ({
  ...key,
  concreteFamily: 'BipedMek',
  battleValue: {
    total: 100,
    aggregates: { defensiveValue: 60, offensiveValue: 40 },
  },
  construction: {
    valid: true,
    weightTerms: terms,
    weightTotal: total,
    ...extra,
  },
});
const local = (fact: unknown, row = key) => ({
  ...row,
  constructionWeights: fact,
});
const run = (
  fact: unknown,
  ref: unknown = reference(),
  extra: readonly unknown[] = [],
  families: readonly string[] = ['battlemechs'],
) => buildWeightReport([local(fact)] as never, [ref], families, extra);
const terms = (value: Record<string, number>, total = 105) => ({
  terms: value,
  total,
});
const statuses = (result: ReturnType<typeof run>) =>
  Object.fromEntries(result.rows[0].terms.map((t) => [t.key, t.status]));

describe('strict 1% rule', () => {
  test('exact match', () => {
    const result = run(terms({ ...WEIGHT_TERMS }));
    expect(result.ok).toBe(true);
    expect(statuses(result)).toEqual({
      getWeightEngine: 'exact',
      getWeightStructure: 'exact',
    });
    expect(result.rows[0].total).toMatchObject({ status: 'exact' });
    expect(result.rows[0].status).toBe('matched');
  });
  test.each([
    [100.99, 'within1Pct'],
    [101, 'different'], // exactly 1.00% is not strictly less
    [101.01, 'different'],
    [99.01, 'within1Pct'],
    [99, 'different'],
  ])('engine local %s is %s', (ours, status) => {
    const result = run(
      terms({ getWeightEngine: ours, getWeightStructure: 5 }),
      reference({ ...WEIGHT_TERMS }, 105),
    );
    expect(statuses(result).getWeightEngine).toBe(status);
    expect(result.ok).toBe(status !== 'different');
  });
  test('a zero reference needs a zero local value', () => {
    const ref = reference({ getWeightEngine: 0 }, 0);
    expect(run(terms({ getWeightEngine: 0 }, 0), ref).ok).toBe(true);
    const off = run(terms({ getWeightEngine: 0.001 }, 0), ref);
    expect(statuses(off).getWeightEngine).toBe('different');
    expect(off.ok).toBe(false);
  });
  test('reports delta and relative percent per term', () => {
    const result = run(
      terms({ getWeightEngine: 103, getWeightStructure: 5 }),
      reference({ ...WEIGHT_TERMS }, 105),
    );
    expect(result.rows[0].terms[0]).toMatchObject({
      key: 'getWeightEngine',
      java: 100,
      ours: 103,
      delta: 3,
      relPct: 3,
      status: 'different',
    });
  });
});

describe('missing and nonfinite values fail', () => {
  test('an unsupported armored-component field stays missing with its reason', () => {
    const gaps = {
      getArmoredComponentWeight:
        'computeSupportVehicleWeight has no typed armored-component output',
    };
    const fact = {
      ...terms({ ...WEIGHT_TERMS }),
      gaps,
      unresolved: ['unresolved source input'],
    };
    const result = run(
      fact,
      reference({ ...WEIGHT_TERMS, getArmoredComponentWeight: 0 }),
    );
    expect(statuses(result).getArmoredComponentWeight).toBe('missing-local');
    expect(
      result.rows[0].terms.find(
        (entry) => entry.key === 'getArmoredComponentWeight',
      )?.ours,
    ).toBeNull();
    expect(result.rows[0].local).toEqual(fact);
    expect(result.rows[0].status).toBe('incomplete');
    expect(result.ok).toBe(false);
  });
  test('a missing local term is missing-local and fails', () => {
    const result = run(terms({ getWeightEngine: 100 }));
    expect(statuses(result).getWeightStructure).toBe('missing-local');
    expect(result.ok).toBe(false);
    expect(result.rows[0].status).toBe('incomplete');
    expect(result.errors).toContain('incomplete: meks/unit.mtf');
  });
  test.each([NaN, Infinity, -Infinity])('local %s is nonfinite-local', (n) => {
    const result = run(terms({ getWeightEngine: n, getWeightStructure: 5 }));
    expect(statuses(result).getWeightEngine).toBe('nonfinite-local');
    expect(result.ok).toBe(false);
  });
  test('a nonfinite local total fails', () => {
    const result = run(terms({ ...WEIGHT_TERMS }, NaN));
    expect(result.rows[0].total).toMatchObject({ status: 'nonfinite-local' });
    expect(result.ok).toBe(false);
  });
  test('a missing local total fails', () => {
    const result = run({ terms: { ...WEIGHT_TERMS } });
    expect(result.rows[0].total).toMatchObject({ status: 'missing-local' });
    expect(result.ok).toBe(false);
  });
  test('a nonfinite reference value is rejected by the schema', () => {
    expect(() =>
      run(
        terms({ ...WEIGHT_TERMS }),
        reference({ getWeightEngine: Infinity, getWeightStructure: 5 }),
      ),
    ).toThrow();
  });
  test('an unavailable local fact keeps its reason and marks every term missing', () => {
    const result = run({ terms: {}, unavailable: 'no local seam' });
    expect(result.rows[0]).toMatchObject({
      status: 'missing-local',
      unavailable: 'no local seam',
    });
    expect(result.ok).toBe(false);
    expect(result.byFamily.battlemechs).toMatchObject({
      missingLocal: 1,
      terms: { missingLocal: 3 },
    });
  });
  test('a captured local failure is failed-local with its reason', () => {
    const result = run({ failure: 'Error: boom' });
    expect(result.rows[0]).toMatchObject({
      status: 'failed-local',
      local: { failure: 'Error: boom' },
    });
    expect(result.ok).toBe(false);
  });
  test('a row with no captured weights is missing-local', () => {
    const result = buildWeightReport([key], [reference()], ['battlemechs']);
    expect(result.rows[0].status).toBe('missing-local');
    expect(result.ok).toBe(false);
  });
  test('a local-only term is informational, not a failure', () => {
    const result = run(terms({ ...WEIGHT_TERMS, getWeightMisc: 9 }));
    expect(result.ok).toBe(true);
    expect(result.rows[0].localOnly).toEqual(['getWeightMisc']);
  });
  test('hash-mismatched rows are unjoined', () => {
    const result = buildWeightReport(
      [
        local(terms({ ...WEIGHT_TERMS }), { ...key, sha256: 'b'.repeat(64) }),
      ] as never,
      [reference()],
      ['battlemechs'],
    );
    expect(result.rows[0].status).toBe('unjoined');
    expect(result.ok).toBe(false);
  });
});

describe('armor aliasing', () => {
  test('a patchwork reference row compares allocated armor against the local armor term', () => {
    const result = run(
      terms({ getWeightArmor: 7 }, 7),
      reference({ getWeightAllocatedArmor: 7 }, 7),
    );
    expect(statuses(result)).toEqual({ getWeightAllocatedArmor: 'exact' });
    expect(result.ok).toBe(true);
  });
});

describe('grouped lumps', () => {
  const grouped = (value: number) => ({
    terms: { getWeightEngine: 100 },
    groups: {
      mountedEquipment: {
        members: ['getWeightWeapon', 'getWeightAmmo'],
        ours: value,
      },
    },
    total: 105,
  });
  const ref = () =>
    reference(
      { getWeightEngine: 100, getWeightWeapon: 3, getWeightAmmo: 2 },
      105,
    );
  test('members are grouped and the group carries the verdict', () => {
    const result = run(grouped(5), ref());
    expect(statuses(result)).toEqual({
      getWeightEngine: 'exact',
      getWeightWeapon: 'grouped:mountedEquipment',
      getWeightAmmo: 'grouped:mountedEquipment',
    });
    expect(result.rows[0].groups).toEqual([
      expect.objectContaining({
        name: 'mountedEquipment',
        java: 5,
        ours: 5,
        status: 'exact',
      }),
    ]);
    expect(result.ok).toBe(true);
  });
  test('a wrong lump fails on the group', () => {
    const result = run(grouped(4), ref());
    expect(result.rows[0].groups[0]).toMatchObject({ status: 'different' });
    expect(result.rows[0].status).toBe('different');
    expect(result.ok).toBe(false);
    expect(result.byComponent.battlemechs.mountedEquipment.different).toBe(1);
  });
  test('only members present in the reference are summed', () => {
    const result = run(
      grouped(3),
      reference({ getWeightEngine: 100, getWeightWeapon: 3 }, 103),
    );
    expect(result.rows[0].groups[0]).toMatchObject({
      java: 3,
      status: 'exact',
    });
  });
});

describe('BattleArmor trooper keys', () => {
  const ba = { path: 'battlearmor/unit.blk', sha256: 'c'.repeat(64) };
  const refBa = {
    ...ba,
    concreteFamily: 'BattleArmor',
    battleValue: {
      total: 100,
      aggregates: { defensiveValue: 60, offensiveValue: 40 },
    },
    construction: {
      weightTerms: {
        'trooper.0.getWeightArmor': 0.1,
        'trooper.1.getWeightArmor': 0.1,
      },
      weightTotal: 0.2,
    },
  };
  test('component counts collapse the trooper index', () => {
    const result = buildWeightReport(
      [
        local(
          {
            terms: {
              'trooper.0.getWeightArmor': 0.1,
              'trooper.1.getWeightArmor': 0.2,
            },
            total: 0.2,
          },
          ba,
        ),
      ] as never,
      [refBa],
      ['battlearmor'],
    );
    expect(
      result.byComponent.battlearmor['trooper.*.getWeightArmor'],
    ).toMatchObject({
      compared: 2,
      exact: 1,
      different: 1,
    });
  });
});

describe('infantry awaits the W2 additive export', () => {
  const inf = { path: 'infantry/unit.blk', sha256: 'd'.repeat(64) };
  const unsupported = {
    ...inf,
    concreteFamily: 'ConvInfantry',
    battleValue: {
      total: 100,
      aggregates: { defensiveValue: 60, offensiveValue: 40 },
    },
    construction: {
      valid: true,
      weightTermsStatus: {
        status: 'unsupported',
        reason: 'detailed probe pending',
      },
    },
  };
  const extraRow = (patch: Record<string, unknown> = {}) => ({
    ...inf,
    construction: {
      weightTerms: { 'platoon.getWeightWeapon': 2 },
      weightTotal: 2,
      reconstruction: { ok: true },
    },
    ...patch,
  });
  const infantry = (
    extra: readonly unknown[] = [],
    ours: unknown = undefined,
  ) =>
    buildWeightReport(
      [
        {
          ...inf,
          ...(ours ? { constructionWeights: ours } : {}),
        },
      ] as never,
      [unsupported],
      ['infantry'],
      extra,
    );
  test('fails with a clearly labelled pending input and is never a pass', () => {
    const result = infantry();
    expect(result.ok).toBe(false);
    expect(result.rows[0].status).toBe('reference-unsupported');
    expect(result.errors).toContain('reference-unsupported: infantry/unit.blk');
    expect(result.byFamily.infantry.referenceUnsupported).toBe(1);
    expect(result.pendingInputs).toEqual([
      expect.objectContaining({
        input: '--weight-terms-extra',
        family: 'infantry',
        rows: 1,
      }),
    ]);
  });
  test('the extra input supplies the reference map', () => {
    const result = infantry(
      [extraRow()],
      terms({ 'platoon.getWeightWeapon': 2 }, 2),
    );
    expect(result.ok).toBe(true);
    expect(result.pendingInputs).toEqual([]);
    expect(result.extraInput).toMatchObject({ rows: 1, accepted: 1 });
  });
  test('an accepted extra row is still compared strictly', () => {
    const result = infantry(
      [extraRow()],
      terms({ 'platoon.getWeightWeapon': 3 }, 2),
    );
    expect(result.rows[0].status).toBe('different');
    expect(result.ok).toBe(false);
  });
  test.each([
    [
      'duplicate',
      [extraRow(), extraRow()],
      'extra-duplicate: infantry/unit.blk',
    ],
    [
      'unknown path',
      [extraRow({ path: 'infantry/other.blk' })],
      'extra-unknown: infantry/other.blk',
    ],
    [
      'hash mismatch',
      [extraRow({ sha256: 'e'.repeat(64) })],
      'extra-hash-mismatch: infantry/unit.blk',
    ],
    [
      'unreconstructed',
      [
        extraRow({
          construction: {
            weightTerms: { 'platoon.getWeightWeapon': 2 },
            weightTotal: 2,
            reconstruction: { ok: false },
          },
        }),
      ],
      'extra-rejected: infantry/unit.blk',
    ],
  ])('rejects %s', (_name, extra, error) => {
    const result = infantry(extra as never);
    expect(result.errors).toContain(error);
    expect(result.ok).toBe(false);
    expect(result.rows[0].status).toBe('reference-unsupported');
  });
  test('rejects an extra row that overlaps a native map', () => {
    const result = buildWeightReport(
      [local(terms({ ...WEIGHT_TERMS }))] as never,
      [reference()],
      ['battlemechs'],
      [
        {
          ...key,
          construction: {
            weightTerms: { x: 1 },
            weightTotal: 1,
            reconstruction: { ok: true },
          },
        },
      ],
    );
    expect(result.errors).toContain('extra-overlap: meks/unit.mtf');
  });
});

describe('report shape', () => {
  test('is deterministic and names what it omits', () => {
    const a = run(terms({ ...WEIGHT_TERMS }));
    expect(run(terms({ ...WEIGHT_TERMS }))).toEqual(a);
    expect(a).toMatchObject({
      scope: 'construction-weight-terms',
      omittedComparisons: ['verifierQuantities', 'settings'],
      tolerance: { absolute: 1e-9, relativeLimit: 0.01 },
    });
    expect(a.byFamily.battlemechs).toMatchObject({
      rows: 1,
      nativeMaps: 1,
      matched: 1,
    });
    expect(a.byComponent.battlemechs.getWeightEngine).toMatchObject({
      compared: 1,
      exact: 1,
      maxAbsDelta: 0,
    });
    expect(a.byComponent.battlemechs.weightTotal).toMatchObject({
      compared: 1,
    });
  });
});
