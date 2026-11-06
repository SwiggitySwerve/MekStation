import protos from '../../src/services/units/handlers/__tests__/fixtures/native-protomek.json';
import personnel from '../../src/services/units/handlers/__tests__/fixtures/personnel-validity.json';
import { buildValidityReport } from '../unit-construction-validity';
import { calculateRow } from '../vehicle-aero-bv-delta';
import { captureConstructionValidity } from '../vehicle-aero-bv-delta';

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

test('preserves thrown validation and upstream unsupported-weight reasons without a match', () => {
  const failure = captureConstructionValidity(() => {
    throw new Error('Validation unavailable');
  });
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
