import { buildValidityReport } from '../unit-construction-validity';

const sourceKey = { path: 'battlearmor/unit.blk', sha256: 'a'.repeat(64) };
const reference = (valid = false) => ({
  ...sourceKey,
  concreteFamily: 'BattleArmor',
  battleValue: {
    total: 100,
    aggregates: { defensiveValue: 60, offensiveValue: 40 },
  },
  construction: {
    valid,
    diagnostics: 'Native diagnostic',
    weightTerms: { getWeightArmor: 1 },
  },
});
const local = (isValid = false) => ({
  ...sourceKey,
  constructionValidity: {
    isValid,
    errors: ['Local diagnostic'],
    warnings: [],
    infos: [],
  },
});
const report = (ours = local(), ref: unknown = reference()) =>
  buildValidityReport([ours], [ref], ['battlearmor']);

test.each([true, false])(
  'compares actual validity %s independently of BV availability',
  (valid) => {
    const result = report(local(valid), reference(valid));
    expect(result.ok).toBe(true);
    expect(result.rows[0]).toMatchObject({
      status: 'matched',
      reference: { diagnostics: 'Native diagnostic' },
      local: { errors: ['Local diagnostic'] },
    });
    expect(result.byFamily.battlearmor).toMatchObject({
      matched: 1,
      nativeWeightMaps: 1,
      weightCompared: 0,
      quantitiesCompared: 0,
      settingsCompared: 0,
    });
  },
);

test('distinguishes disagreeing validity and missing reference/local results', () => {
  expect(report(local(true)).rows[0].status).toBe('different');
  expect(
    buildValidityReport([sourceKey], [reference()], ['battlearmor']).rows[0]
      .status,
  ).toBe('missing-local');
  expect(
    report(local(), { ...reference(), construction: undefined }).rows[0].status,
  ).toBe('missing-reference');
  expect(
    report({ ...local(), sha256: 'b'.repeat(64) }).byFamily.battlearmor.matched,
  ).toBe(0);
  expect(
    buildValidityReport([local(), local()], [reference()], ['battlearmor'])
      .errors,
  ).toContain('duplicate: battlearmor/unit.blk');
});

test('compares BattleMech MTF validity like any other family and keeps a disagreement visible', () => {
  const mtf = { path: 'meks/unit.mtf', sha256: 'c'.repeat(64) };
  const mech = (javaValid: boolean, localValid: boolean) =>
    buildValidityReport(
      [
        {
          ...mtf,
          constructionValidity: {
            isValid: localValid,
            errors: [],
            warnings: [],
            infos: [],
          },
        },
      ],
      [
        {
          ...mtf,
          concreteFamily: 'BipedMek',
          battleValue: {
            total: 100,
            aggregates: { defensiveValue: 60, offensiveValue: 40 },
          },
          construction: { valid: javaValid },
        },
      ],
      ['battlemechs'],
    );
  expect(mech(true, true)).toMatchObject({ ok: true });
  expect(mech(true, true).byFamily.battlemechs).toMatchObject({
    matched: 1,
    missingLocal: 0,
  });
  const javelin = mech(false, true);
  expect(javelin.ok).toBe(false);
  expect(javelin.rows[0].status).toBe('different');
  expect(javelin.errors).toContain('different: meks/unit.mtf');
});

test('preserves captured validation failure and unsupported-weight reasons without a match', () => {
  const failure = { failure: 'Error: Validation unavailable' };
  const result = buildValidityReport(
    [{ ...sourceKey, constructionValidity: failure }],
    [
      {
        ...reference(),
        construction: {
          valid: false,
          weightTermsStatus: {
            status: 'unsupported',
            reason: 'Native static weight probe pending',
          },
        },
      },
    ],
    ['battlearmor'],
  );
  expect(result.ok).toBe(false);
  expect(result.rows[0]).toMatchObject({
    status: 'failed-local',
    local: { failure: 'Error: Validation unavailable' },
    reference: {
      weightTermsStatus: { reason: 'Native static weight probe pending' },
    },
  });
  expect(result.byFamily.battlearmor).toMatchObject({
    matched: 0,
    nativeUnsupportedWeights: 1,
    weightCompared: 0,
  });
});
