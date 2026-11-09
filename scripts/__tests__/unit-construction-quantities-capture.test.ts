import blackHawk from '../../public/data/units/battlemechs/3-succession-wars/advanced/Black Hawk A.json';
import { resetEquipmentLoader } from '../../src/services/equipment/EquipmentLoaderService';
import {
  getEquipmentLookupService,
  resetEquipmentLookupService,
} from '../../src/services/equipment/EquipmentLookupService';
import {
  getEquipmentRegistry,
  resetEquipmentRegistry,
} from '../../src/services/equipment/EquipmentRegistry';
import aeroCapital from '../../src/services/units/handlers/__tests__/fixtures/aerospace-capital-validity.json';
import protos from '../../src/services/units/handlers/__tests__/fixtures/native-protomek.json';
import personnel from '../../src/services/units/handlers/__tests__/fixtures/personnel-validity.json';
import vehicles from '../../src/services/units/handlers/__tests__/fixtures/vehicle-handler-locations.pinned-sources.json';
import { resetHandlerInitialization } from '../../src/services/units/handlers/initializeHandlers';
import { resetUnitTypeRegistry } from '../../src/services/units/UnitTypeRegistry';
import {
  captureConstructionQuantities,
  QUANTITY_KEYS,
  type ILocalQuantities,
} from '../unit-construction-quantities';
import {
  defaultLocalSetting,
  type ISettingContext,
} from '../unit-construction-settings';

// The equipment catalog reads public/ from disk; jsdom would otherwise fetch.
jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      jest
        .requireActual('node:fs')
        .readFileSync(
          jest
            .requireActual('node:path')
            .join(process.cwd(), 'public/data/equipment/official', file),
          'utf8',
        ),
    ),
}));

// Deliberately no import of vehicle-aero-bv-delta (it reaches a child process
// and would make this test repo-wide in the CI cache census); the CLI seam is
// tested in unit-bv-strict.test.ts.
const fact = (value: unknown) => value as ILocalQuantities;
const near = (value: number | undefined, expected: number) =>
  expect(value).toBeCloseTo(expected, 9);
const fixture = <T extends { path: string }>(
  rows: readonly T[],
  name: string,
) => rows.find((row) => row.path.endsWith(name)) as T;
const blk = (row: { path: string; content: string }) =>
  captureConstructionQuantities(
    { path: row.path.replace('data/mekfiles/', '') },
    Buffer.from(row.content),
  );

beforeEach(async () => {
  resetHandlerInitialization();
  resetUnitTypeRegistry();
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});
afterEach(() => {
  resetEquipmentLookupService();
  resetEquipmentRegistry();
  resetEquipmentLoader();
  resetHandlerInitialization();
  resetUnitTypeRegistry();
});

describe('BattleMech: the editor state and the same total the validator sums', () => {
  // Java: P1 meks/3050U/Black Hawk (Nova) A.mtf: design 50, exact 50,
  // armor 160, slots 78 (sha 9b990780…).
  const mech = (unit: unknown) =>
    captureConstructionQuantities(
      { path: 'meks/probe.mtf', unit },
      Buffer.from('mtf bytes are hash-checked only'),
    );
  test('reads design weight, armor points and slot capacity from existing owners', () => {
    const result = fact(mech(blackHawk));
    near(result.values.weightDesign, 50);
    near(result.values.armorPoints, 160);
    near(result.values.criticalSlots, 78);
    near(result.values.weightExact, 50);
  });
  test('weightRounded has no local owner and says so', () => {
    const result = fact(mech(blackHawk));
    expect(result.values).not.toHaveProperty('weightRounded');
    expect(result.gaps.weightRounded).toContain('no local owner');
    expect(result.gaps.weightRounded).toContain('WeightOverflowValidation');
  });
  test('probes the real overweight rule: zero tolerance', () => {
    expect(fact(mech(blackHawk)).probes?.overweightTolerance).toBe(0);
  });
  test('an absent converted unit is an explicit staged failure', () => {
    expect(mech(null)).toEqual({
      failure: expect.stringContaining('mtf-converted-unit'),
    });
  });
});

describe('Tank: handler fields and the native weight total', () => {
  // Java: P1 vehicles/2750 IS Land/Puma Assault Tank PAT-001.blk (sha bee08713…):
  // design 95, exact 95, armor 184, slots 150.
  const puma = fixture(vehicles.rows, 'Puma Assault Tank PAT-001.blk');
  test('maps what the handler exposes and names what it does not', () => {
    const result = fact(blk(puma));
    near(result.values.weightDesign, 95);
    near(result.values.armorPoints, 184);
    near(result.values.weightExact, 95);
    expect(result.gaps.criticalSlots).toContain('itemSlots.ts');
    expect(result.gaps.weightRounded).toContain('no local owner');
    expect(result.probes?.overweightTolerance).toBe(0);
  });
  test('uses the weights fact it is given, so one owner feeds both comparators', () => {
    const result = fact(
      captureConstructionQuantities(
        { path: puma.path.replace('data/mekfiles/', '') },
        Buffer.from(puma.content),
        { terms: {}, total: 77 },
      ),
    );
    near(result.values.weightExact, 77);
  });
  test('an unavailable weights fact leaves weightExact missing with the reason', () => {
    const result = fact(
      captureConstructionQuantities(
        { path: puma.path.replace('data/mekfiles/', '') },
        Buffer.from(puma.content),
        { terms: {}, unavailable: 'because the weight owner said so' },
      ),
    );
    expect(result.values).not.toHaveProperty('weightExact');
    expect(result.gaps.weightExact).toBe('because the weight owner said so');
  });
  test('a staged weights failure is a failed quantity, not a gap', () => {
    const result = captureConstructionQuantities(
      { path: puma.path.replace('data/mekfiles/', '') },
      Buffer.from(puma.content),
      { failure: 'blk-weights: boom' },
    );
    expect(result).toEqual({
      failure: expect.stringContaining('blk-weights: boom'),
    });
  });
  test('unparseable source bytes are a staged failure', () => {
    expect(
      captureConstructionQuantities(
        { path: 'vehicles/bad.blk' },
        Buffer.from('not a blk'),
      ),
    ).toEqual({ failure: expect.stringContaining('blk-') });
  });
});

describe('aerospace and capital: handler tonnage and armor points', () => {
  const rowOf = (name: string) => fixture(aeroCapital.rows, name);
  test.each([
    ['fighters/TRO3075/Centurion CNT-1A.blk'],
    ['smallcraft/XTRO/Primitives IV/Intrepid Assault Craft (2331).blk'],
    ['dropships/TRO3067/Clan/Outpost (3070).blk'],
    ['jumpships/3057R/IS/Scout JumpShip (2712).blk'],
    ['warship/3057/IS/Impavido Destroyer (3058).blk'],
    ['spacestation/TRO 3057R/Alliance Space Station (2713).blk'],
  ])('%s', (name) => {
    const result = fact(blk(rowOf(name)));
    expect(Number.isFinite(result.values.weightDesign)).toBe(true);
    expect(result.values.weightDesign).toBeGreaterThan(0);
    expect(Number.isFinite(result.values.armorPoints)).toBe(true);
    expect(result.gaps.weightExact).toContain('Aerospace/capital');
    expect(result.gaps.criticalSlots).toBeDefined();
    expect(result.gaps.weightRounded).toBeDefined();
  });
});

describe('battle armor, infantry and ProtoMechs expose none of the five', () => {
  test.each([
    personnel.rows[0], // battlearmor
    personnel.rows[3], // infantry
    protos[0],
  ])('$path', (row) => {
    const result = fact(blk(row));
    expect(result.values).toEqual({});
    expect(Object.keys(result.gaps).sort()).toEqual([...QUANTITY_KEYS].sort());
    expect(result.probes).toBeUndefined();
  });
});

describe('default local settings: sentinel probes of the existing owners', () => {
  const ctx = (
    verifierClass: string,
    family: string,
    probes: ISettingContext['probes'] = [{ overweightTolerance: 0 }],
  ): ISettingContext => ({
    family,
    verifierClass,
    javaOptions: {},
    probes,
  });
  test.each([
    ['getWeightCeilingStructure', 'TestMek', 'battlemechs'],
    ['getWeightCeilingArmor', 'TestMek', 'battlemechs'],
    ['getWeightCeilingArmor', 'TestTank', 'vehicles'],
    ['getWeightCeilingControls', 'TestTank', 'vehicles'],
    ['getWeightCeilingLifting', 'TestTank', 'vehicles'],
    ['getWeightCeilingTurret', 'TestTank', 'vehicles'],
    ['getWeightCeilingPowerAmp', 'TestTank', 'vehicles'],
  ])('%s for %s observes the half-ton step', (name, cls, family) => {
    expect(defaultLocalSetting(name, ctx(cls, family))).toMatchObject({
      value: 'HALF_TON',
    });
  });
  test('the gyro owner only emits multiples of 0.5 t, so its step is not observable', () => {
    expect(
      defaultLocalSetting(
        'getWeightCeilingGyro',
        ctx('TestMek', 'battlemechs'),
      ),
    ).toMatchObject({ gap: expect.stringContaining('not observable') });
  });
  test('owners that do not exist are gaps, not guesses', () => {
    expect(
      defaultLocalSetting(
        'getWeightCeilingPowerAmp',
        ctx('TestMek', 'battlemechs'),
      ),
    ).toHaveProperty('gap');
    expect(
      defaultLocalSetting(
        'getWeightCeilingStructure',
        ctx('TestTank', 'vehicles'),
      ),
    ).toHaveProperty('gap');
  });
  test('the intro-year margin is the named constant where a local check uses it', () => {
    for (const [cls, family] of [
      ['TestTank', 'vehicles'],
      ['TestSupportVehicle', 'vehicles'],
      ['TestAero', 'aerospace'],
    ])
      expect(
        defaultLocalSetting('getIntroYearMargin', ctx(cls, family)),
      ).toMatchObject({ value: 5 });
    expect(
      defaultLocalSetting('getIntroYearMargin', ctx('TestMek', 'battlemechs')),
    ).toHaveProperty('gap');
  });
  test('the overweight tolerance comes from the probes of the rows in the cell', () => {
    expect(
      defaultLocalSetting('getMaxOverweight', ctx('TestAero', 'aerospace')),
    ).toMatchObject({ value: 0 });
    expect(
      defaultLocalSetting(
        'getMaxOverweight',
        ctx('TestBattleArmor', 'battlearmor', [
          { overweightTolerance: 'no-check' },
        ]),
      ),
    ).toMatchObject({
      gap: expect.stringContaining('no overweight check ran'),
    });
    expect(
      defaultLocalSetting(
        'getMaxOverweight',
        ctx('TestMek', 'battlemechs', [
          { overweightTolerance: 0 },
          { overweightTolerance: 0.25 },
        ]),
      ),
    ).toMatchObject({ gap: expect.stringContaining('differ between rows') });
  });
});
