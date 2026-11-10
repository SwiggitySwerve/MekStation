import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server.node';

import { useUnitValidation } from '../../src/hooks/useUnitValidation';
import { getEquipmentLookupService } from '../../src/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '../../src/services/equipment/EquipmentRegistry';
import {
  UnitLoaderService,
  type IRawSerializedUnit,
} from '../../src/services/units/unitLoaderService';
import { validateUnit } from '../../src/services/validation/UnitValidationOrchestrator';
import {
  createUnitStore,
  UnitStoreContext,
} from '../../src/stores/useUnitStore';
import {
  buildValidityReport,
  captureMechValidity,
  renderMechCalculations,
} from '../unit-construction-validity';

// Exercise the committed catalog through the file boundary instead of jsdom fetch.
jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string, base: string) =>
    JSON.parse(readFileSync(join(process.cwd(), 'public', base, file), 'utf8')),
}));

jest.mock('@/services/validation/UnitValidationOrchestrator', () => {
  const actual = jest.requireActual<
    typeof import('../../src/services/validation/UnitValidationOrchestrator')
  >('@/services/validation/UnitValidationOrchestrator');
  return { ...actual, validateUnit: jest.fn(actual.validateUnit) };
});

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

describe('mech capture consumes the app projection', () => {
  const mech: IRawSerializedUnit = {
    id: 'cv1',
    chassis: 'CV1',
    unitType: 'BattleMech',
    techBase: 'MIXED',
    year: 2750,
    tonnage: 50,
    engine: { type: 'STANDARD', rating: 200 },
    gyro: { type: 'STANDARD' },
    cockpit: 'STANDARD',
    structure: { type: 'STANDARD' },
    armor: { type: 'STANDARD', allocation: {} },
    heatSinks: { type: 'SINGLE', count: 10 },
    movement: { walk: 4, jump: 0 },
    equipment: [
      { id: 'clan-er-medium-laser', location: 'RightArm', slots: [4] },
    ],
  };
  beforeAll(async () => {
    await getEquipmentRegistry().initialize();
    await getEquipmentLookupService().initialize();
  });
  afterEach(() => jest.restoreAllMocks());

  test('Mixed mode rejects future opposite-tech equipment', () => {
    const result = captureMechValidity(mech, 'mixed.mtf');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'VAL-BM-011: ER Medium Laser (Clan) has intro date of 2817',
    );
  });

  test('armor identity rejects armor before its introduction', () => {
    const result = captureMechValidity(
      {
        ...mech,
        techBase: 'INNER_SPHERE',
        year: 3025,
        equipment: [],
        armor: { type: 'STEALTH', allocation: {} },
      },
      'armor.mtf',
    );
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'VAL-BM-011: Stealth has intro date of 3063',
    );
  });

  test('unchanged IS control stays valid', () => {
    expect(
      captureMechValidity(
        { ...mech, techBase: 'INNER_SPHERE', year: 3025, equipment: [] },
        'is.mtf',
      ),
    ).toMatchObject({ isValid: true, errors: [] });
  });

  test('hook and capture submit identical complete input for the same state', () => {
    const state = new UnitLoaderService().mapToUnitState(mech, true);
    jest
      .spyOn(UnitLoaderService.prototype, 'mapToUnitState')
      .mockReturnValue(state);
    const Probe = () => {
      useUnitValidation();
      return null;
    };
    jest.mocked(validateUnit).mockClear();
    renderToStaticMarkup(
      createElement(
        UnitStoreContext.Provider,
        { value: createUnitStore(state) },
        createElement(Probe),
      ),
    );
    const [editorInput] = jest.mocked(validateUnit).mock.calls[0];
    jest.mocked(validateUnit).mockClear();
    captureMechValidity(mech, 'same-state.mtf');
    expect(jest.mocked(validateUnit).mock.calls[0][0]).toStrictEqual(
      editorInput,
    );
  });

  test('slot diagnostics stay deterministic without relabeling mount ids', () => {
    const invalidSlots = {
      ...mech,
      equipment: [
        { id: 'clan-er-medium-laser', location: 'RightArm', slots: [0] },
      ],
    };
    expect(captureMechValidity(invalidSlots, 'slots.mtf')).toEqual(
      captureMechValidity(invalidSlots, 'slots.mtf'),
    );
  });

  test('the existing calculation seam still forwards bimodal LAM subtype', () => {
    const state = new UnitLoaderService().mapToUnitState(
      { ...mech, configuration: 'LAM', lamType: 'Bimodal', equipment: [] },
      true,
    );
    expect(renderMechCalculations(state).totalStructuralWeight).toBe(26.5);
  });
});
