import { createHash } from 'node:crypto';

import type { VehicleWeightBreakdown } from '../../src/utils/construction/vehicle/weightComposition';

import blackHawk from '../../public/data/units/battlemechs/3-succession-wars/advanced/Black Hawk A.json';
import { BlkParserService } from '../../src/services/conversion/BlkParserService';
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
import support from '../../src/services/units/handlers/__tests__/fixtures/support-handler-locations.pinned-sources.json';
import vehicles from '../../src/services/units/handlers/__tests__/fixtures/vehicle-handler-locations.pinned-sources.json';
import { resetHandlerInitialization } from '../../src/services/units/handlers/initializeHandlers';
import { createSupportRegistryMass } from '../../src/services/units/handlers/supportRegistryMass';
import { SupportVehicleUnitHandler } from '../../src/services/units/handlers/SupportVehicleUnitHandler';
import { computeNativeVTOLWeight } from '../../src/services/units/handlers/vehicleHandlerWeight';
import { VTOLUnitHandler } from '../../src/services/units/handlers/VTOLUnitHandler';
import { resetUnitTypeRegistry } from '../../src/services/units/UnitTypeRegistry';
import { computeSupportVehicleWeight } from '../../src/utils/construction/vehicle/supportWeight';
import {
  captureConstructionWeights,
  type ILocalWeights,
} from '../unit-construction-weights';
import pinnedSupport from './fixtures/unit-construction-weights-support.pinned.json';
import pinnedVTOL from './fixtures/unit-construction-weights-vtol.pinned.json';

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

// Deliberately no import of vehicle-aero-bv-delta: it reaches a child process
// (unit-bv-provenance), which makes a test repo-wide in the CI cache census.
// The CLI seam is tested in unit-bv-strict.test.ts.
const fact = (value: unknown) => value as ILocalWeights;
const near = (value: number | undefined, expected: number) =>
  expect(value).toBeCloseTo(expected, 9);
const fixture = <T extends { path: string }>(
  rows: readonly T[],
  name: string,
) => rows.find((row) => row.path.endsWith(name)) as T;

beforeEach(async () => {
  resetHandlerInitialization();
  resetUnitTypeRegistry();
  // Weight mounts resolve through the JSON catalog, as under the opt-in flag.
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

describe('BattleMech: the editor projection, in tons', () => {
  // Java: P1 meks/3050U/Black Hawk (Nova) A.mtf (sha 9b990780…), the same design.
  const mech = (unit: unknown) =>
    captureConstructionWeights(
      { path: 'meks/probe.mtf', unit },
      Buffer.from('mtf bytes are hash-checked only'),
    );
  test('matches Java on the terms the editor exposes one-to-one', () => {
    const result = fact(mech(blackHawk));
    near(result.terms.getWeightEngine, 6.5);
    near(result.terms.getWeightStructure, 5);
    near(result.terms.getWeightControls, 6); // cockpit 3 + gyro 3
    near(result.terms.getWeightHeatSinks, 4);
    near(result.terms.getWeightMisc, 0); // LAM/QuadVee conversion only
  });
  test('lumps jump jets and mounted equipment, which Java splits', () => {
    const result = fact(mech(blackHawk));
    expect(result.groups?.mountedEquipment.members).toEqual([
      'getWeightMiscEquip',
      'getWeightWeapon',
      'getWeightAmmo',
      'getWeightPowerAmp',
      'getWeightCarryingSpace',
      'getArmoredComponentWeight',
    ]);
    expect(Number.isFinite(result.groups?.mountedEquipment.ours)).toBe(true);
    // Jump jets (2.5 t) are part of the lump, never of getWeightMisc.
    expect(result.groups?.mountedEquipment.ours).toBeGreaterThanOrEqual(2.5);
  });
  test('the independent local total is structure + equipment, as the validator sums it', () => {
    const result = fact(mech(blackHawk));
    const lump = result.groups?.mountedEquipment.ours ?? NaN;
    const named = [
      'getWeightEngine',
      'getWeightStructure',
      'getWeightControls',
      'getWeightHeatSinks',
      'getWeightArmor',
      'getWeightMisc',
    ].reduce((sum, key) => sum + result.terms[key], 0);
    near(result.total, named + lump);
  });
  test('an absent converted unit is an explicit staged failure', () => {
    expect(mech(null)).toEqual({
      failure: expect.stringContaining('mtf-converted-unit'),
    });
  });
});

describe('Tank: the native weight breakdown', () => {
  // Java: P1 vehicles/2750 IS Land/Puma Assault Tank PAT-001.blk (sha bee08713…).
  const puma = fixture(vehicles.rows, 'Puma Assault Tank PAT-001.blk');
  const capture = (content: string, relative: string) =>
    captureConstructionWeights(
      { path: relative.replace('data/mekfiles/', '') },
      Buffer.from(content),
    );
  test('maps the breakdown onto the Java keys it matches one-to-one', () => {
    const result = fact(capture(puma.content, puma.path));
    near(result.terms.getWeightEngine, 25);
    near(result.terms.getWeightStructure, 9.5);
    near(result.terms.getWeightControls, 5);
    near(result.terms.getWeightHeatSinks, 7);
    near(result.terms.getWeightArmor, 11.5);
    near(result.terms.getWeightMisc, 1); // turret + secondary turret + lift
    near(result.terms.getWeightPowerAmp, 0);
    near(result.terms.getWeightCarryingSpace, 0);
  });
  test('lumps mounted equipment and reports tonnage minus remaining as the total', () => {
    const result = fact(capture(puma.content, puma.path));
    expect(result.groups?.mountedEquipment.members).toEqual([
      'getWeightMiscEquip',
      'getWeightWeapon',
      'getWeightAmmo',
      'getArmoredComponentWeight',
    ]);
    near(result.groups?.mountedEquipment.ours, 36); // Java 0 + 32 + 4 + 0
    near(result.total, 95);
  });
  test('the parsed document classifies the unit, never its folder', () => {
    const result = fact(capture(puma.content, 'infantry/misfiled.blk'));
    near(result.terms.getWeightEngine, 25);
    near(result.total, 95);
  });
  test('a malformed source is a staged failure, not a silent gap', () => {
    expect(capture('not a blk', 'vehicles/x.blk')).toEqual({
      failure: expect.stringContaining('blk-'),
    });
  });
});

describe('combat VTOL: capture complete typed mass only', () => {
  const directFields = {
    engine: 'getWeightEngine',
    structure: 'getWeightStructure',
    controls: 'getWeightControls',
    heatSinks: 'getWeightHeatSinks',
    armor: 'getWeightArmor',
    powerAmplifiers: 'getWeightPowerAmp',
    carryingSpace: 'getWeightCarryingSpace',
  } satisfies Partial<Record<keyof VehicleWeightBreakdown, string>>;
  const groupedFields = [
    'turret',
    'secondaryTurret',
    'lift',
    'equipment',
  ] as const;
  const nonAdditive = {
    turretEquipment: 'Mechanism basis, already represented by turret mass',
    secondaryTurretEquipment:
      'Mechanism basis, already represented by secondary turret mass',
    turretMounted: 'Equipment subset, already included in equipment',
    secondaryTurretMounted: 'Equipment subset, already included in equipment',
    energyWeapons: 'Amplifier basis, already included in equipment',
    remaining: 'Remaining budget, not an additive construction term',
  } satisfies Partial<Record<keyof VehicleWeightBreakdown, string>>;
  const capture = (content: string, path = pinnedVTOL.rows[0].path) =>
    fact(captureConstructionWeights({ path }, Buffer.from(content)));
  const load = (content: string) => {
    const document = new BlkParserService().parse(content);
    if (!document.success) throw Error(JSON.stringify(document.error));
    const handler = new VTOLUnitHandler();
    const parsed = handler.parse(document.data.document);
    if (!parsed.success) throw Error(JSON.stringify(parsed.error));
    return {
      document: document.data.document,
      handler,
      unit: parsed.data.unit,
    };
  };
  test.each([
    pinnedVTOL.rows[0],
    fixture(vehicles.rows, 'Skadi Swift Attack VTOL.blk'),
  ])(
    '$path matches the published total and accounts for every numeric output',
    ({ path, content, sha256 }) => {
      expect(createHash('sha256').update(content).digest('hex')).toBe(sha256);
      const { document, handler, unit } = load(content);
      const weights = computeNativeVTOLWeight(document, unit);
      if (!weights) throw Error('Pinned complete VTOL has no typed mass');
      const result = capture(content, path);
      expect(result.total).toBe(unit.totalWeight);
      for (const [field, key] of Object.entries(directFields))
        expect(result.terms[key]).toBe(
          weights[field as keyof typeof directFields],
        );
      expect(result.groups?.mountedEquipment.ours).toBe(weights.equipment);
      expect(result.groups?.mountedEquipment.members).toEqual([
        'getWeightMiscEquip',
        'getWeightWeapon',
        'getWeightAmmo',
        'getArmoredComponentWeight',
      ]);
      expect(
        Object.keys(weights)
          .filter(
            (field) =>
              typeof weights[field as keyof typeof weights] === 'number',
          )
          .sort(),
      ).toEqual(
        [
          ...Object.keys(directFields),
          ...groupedFields,
          ...Object.keys(nonAdditive),
        ].sort(),
      );
      expect(
        Object.values(nonAdditive).every((reason) => reason.length > 0),
      ).toBe(true);
      expect(result.unavailable).toBeUndefined();
      expect(() => handler.calculateWeight(unit)).toThrow(
        /weight.*incomplete/i,
      );
    },
  );
  test('Marten uses published 13.5 t rather than its nominal 15 t', () => {
    expect(capture(pinnedVTOL.rows[0].content).total).toBe(13.5);
  });
  test('Skadi retains the existing combined chin and rotor term', () => {
    const row = fixture(vehicles.rows, 'Skadi Swift Attack VTOL.blk');
    near(capture(row.content, row.path).terms.getWeightMisc, 4);
  });
  test('unresolved mounted mass stays missing-local with the handler reason', () => {
    const content =
      pinnedVTOL.rows[0].content +
      '\n<Body Equipment>\nUnresolved source mount\n</Body Equipment>\n';
    const { document, handler, unit } = load(content);
    expect(computeNativeVTOLWeight(document, unit)).toBeUndefined();
    expect(unit.totalWeight).toBe(15); // the common parser's nominal default is not a result
    let reason = '';
    try {
      handler.calculateWeight(unit);
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
    }
    expect(reason).not.toBe('');
    expect(capture(content)).toEqual({ terms: {}, unavailable: reason });
  });
  test('a handler-rejected source keeps its parse diagnostics as missing-local', () => {
    const content = pinnedVTOL.rows[0].content.replace(
      /<cruiseMP>\s*[^<]*<\/cruiseMP>/i,
      '<cruiseMP>\ninvalid\n</cruiseMP>',
    );
    const parsed = new BlkParserService().parse(content);
    if (!parsed.success) throw Error(JSON.stringify(parsed.error));
    const loaded = new VTOLUnitHandler().parse(parsed.data.document);
    expect(loaded.success).toBe(false);
    if (loaded.success) throw Error('Expected incomplete handler parse');
    expect(capture(content)).toEqual({
      terms: {},
      unavailable: loaded.error.errors.join('; '),
    });
  });
});

describe('support vehicles: capture the existing typed owner', () => {
  const numericFields = {
    engine: 'getWeightEngine',
    structure: 'getWeightStructure',
    controls: 'getWeightControls',
    heatSinks: 'getWeightHeatSinks',
    armor: 'getWeightArmor',
    misc: 'getWeightMisc',
    miscEquipment: 'getWeightMiscEquip',
    weapons: 'getWeightWeapon',
    ammo: 'getWeightAmmo',
    powerAmplifiers: 'getWeightPowerAmp',
    carryingSpace: 'getWeightCarryingSpace',
    fuel: 'getFuelTonnage',
  } satisfies Partial<
    Record<keyof ReturnType<typeof computeSupportVehicleWeight>, string>
  >;
  const cases = [
    ...pinnedSupport.rows,
    ...[
      'Air Car.blk',
      'Dromedary Water Transport.blk',
      'Lexan Surveillance VTOL.blk',
    ].map((name) => fixture(support.rows, name)),
  ];
  test.each(cases)('$path', ({ path, content, sha256 }) => {
    expect(createHash('sha256').update(content).digest('hex')).toBe(sha256);
    const parsed = new BlkParserService().parse(content);
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    const handler = new SupportVehicleUnitHandler();
    const loaded = handler.parse(parsed.data.document);
    if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
    const unit = loaded.data.unit;
    const weights = computeSupportVehicleWeight(
      unit,
      createSupportRegistryMass(unit.techBase),
    );
    const captured = fact(
      captureConstructionWeights({ path }, Buffer.from(content)),
    );
    expect(captured.total).toBe(handler.calculateWeight(unit));
    expect(captured.terms).toEqual(
      Object.fromEntries(
        Object.entries(numericFields).map(([field, key]) => [
          key,
          weights[field as keyof typeof numericFields],
        ]),
      ),
    );
    // Adding an owner field keeps compilation compatible, but fails this coverage
    // assertion until it is mapped or explicitly recorded as an unsupported field.
    expect(
      Object.keys(weights)
        .filter(
          (field) => typeof weights[field as keyof typeof weights] === 'number',
        )
        .sort(),
    ).toEqual([...Object.keys(numericFields), 'total'].sort());
    expect(captured.unresolved).toEqual(weights.unresolved);
    expect(captured.terms).not.toHaveProperty('getArmoredComponentWeight');
    expect(captured.gaps?.getArmoredComponentWeight).toMatch(
      /no typed.*armored/i,
    );
    expect(captured.unavailable).toBeUndefined();
  });
  test('classification uses the document even in a non-vehicle folder', () => {
    const row = pinnedSupport.rows[0];
    const capture = (path: string) =>
      captureConstructionWeights({ path }, Buffer.from(row.content));
    expect(capture('infantry/misfiled.blk')).toEqual(capture(row.path));
  });
});

describe('families without an additive local seam say so instead of guessing', () => {
  // computeTrooperMass needs editor-model mounts with massKg; no BLK-source
  // adapter builds them on main, and W1 builds no new seams.
  const cases: [string, string, RegExp][] = [
    [
      'battlearmor/probe.blk',
      fixture(personnel.rows, 'Achileus BA (Sqd 4) [David].blk').content,
      /battlearmor.*computeTrooperMass|computeTrooperMass.*editor/i,
    ],
    [
      'infantry',
      fixture(personnel.rows, 'Mob (Huge).blk').content,
      /infantry/i,
    ],
    [
      'protomeks/probe.blk',
      (protos as unknown as { content: string }[])[0].content,
      /protomech/i,
    ],
    [
      'dropships/probe.blk',
      fixture(aeroCapital.rows, 'Arcadia (3080).blk').content,
      /aerospace|capital|bound/i,
    ],
    [
      'fighters/probe.blk',
      fixture(aeroCapital.rows, 'Scytha A.blk').content,
      /aerospace|capital|bound/i,
    ],
  ];
  test.each(cases)('%s', (relative, content, reason) => {
    const prefix = relative.includes('/') ? relative : `${relative}/probe.blk`;
    // Classification comes from the parsed document, never from the folder.
    const result = fact(
      captureConstructionWeights({ path: prefix }, Buffer.from(content)),
    );
    expect(result.terms).toEqual({});
    expect(result.unavailable).toMatch(reason);
    expect(result.total).toBeUndefined();
  });
});
