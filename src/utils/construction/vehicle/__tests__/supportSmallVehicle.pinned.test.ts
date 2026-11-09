/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { createSupportRegistryMass } from '@/services/units/handlers/supportRegistryMass';
import { SupportVehicleUnitHandler } from '@/services/units/handlers/SupportVehicleUnitHandler';

import { computeSupportVehicleWeight } from '../supportWeight';
import {
  getMountSourceSize,
  resolveVehicleVariableMass,
} from '../variableEquipmentMass';
import { supportChassisBlk } from './supportChassisBlk.test.helpers';
import sources from './supportSmallVehicle.pinned.json';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});

const handler = new SupportVehicleUnitHandler();
const unitFor = (content: string) => {
  const parsed = new BlkParserService().parse(content);
  if (!parsed.success) throw new Error('fixture parse');
  const result = handler.parse(parsed.data.document);
  if (!result.success) throw new Error('handler parse');
  return result.data.unit;
};
// The handler's own wiring: the service-built registry lookup feeds the pure rule.
const weigh = (content: string) => {
  const unit = unitFor(content);
  return computeSupportVehicleWeight(
    unit,
    createSupportRegistryMass(unit.techBase),
  );
};

/**
 * Construction excerpts: mm-data 50f7efef, CC BY-NC-SA 4.0 (prose removed; the
 * paths and hashes identify the complete pinned sources). Expected terms are
 * the pinned MegaMek 48fcb2f64 TestSupportVehicle verifier values, probed from
 * the original classes: getWeightWeapon, getWeightMiscEquip, calculateWeight.
 * Under 5 t, TestEntity weighs weapons at their type tonnage (kilogram
 * rounding, TestSupportVehicle.java:760-770) and the Omni Boreas rows carry a
 * fixed chassis fire-control mass (MiscType.java:707-711).
 */
const closed = sources.filter((row) => row.closed);
const open = sources.filter((row) => !row.closed);

it.each(closed)('$path equals the pinned Java small-vehicle terms', (row) => {
  const weight = weigh(row.content);
  expect(weight.unresolved).toEqual([]);
  expect(weight.weapons).toBeCloseTo(row.java.weapons, 9);
  expect(weight.miscEquipment).toBeCloseTo(row.java.miscEquipment, 9);
  expect(weight.total).toBeCloseTo(row.java.total, 9);
});

// Honest residuals: reported as unresolved, never guessed.
it('reports the battle-armor gun on the Ibex RV as a misidentified mount, not a mass', () => {
  const row = open.find((r) => r.path.includes('Ibex RV (Militarized MG)'));
  if (!row) throw new Error('fixture');
  const weight = weigh(row.content);
  expect(weight.unresolved).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        'Machine Gun (Light)(PT):SIZE:1.0 (not a support-vehicle weapon)',
      ),
    ]),
  );
  // balightmg weighs 0.075 t each; charging it would overshoot Java's 1.999 t.
  expect(weight.weapons).toBe(0);
  expect(weight.total).toBeLessThan(row.java.total);
});

it('reports the clip ammunition mass of a size-2 Support Laser as unresolved (Java 0.003 t)', () => {
  const row = open.find((r) => r.path.includes('RRV (Speed)'));
  if (!row) throw new Error('fixture');
  const weight = weigh(row.content);
  expect(weight.unresolved).toEqual([
    'Support Laser:SIZE:2.0 (clip ammunition mass)',
  ]);
  // TestSupportVehicle.java:980-988: (size - 1) x 0.003 t, the whole gap to Java.
  expect(row.java.total - weight.total).toBeCloseTo(0.003, 9);
});

// internal_type -1 is MegaMek's T_STRUCTURE_UNKNOWN. A support vehicle's structure
// mass never reads the structure type (TestSupportVehicle.java:778-797), so the
// pinned Java gives 13.5 t and 59.5 t for -1, 0 and an absent tag alike.
it.each(['-1', '0'])(
  'ignores internal_type %s in the structure mass',
  (type) => {
    const content = supportChassisBlk('Medium Laser\nMedium Laser').replace(
      '<fuel>',
      `<internal_type>\n${type}\n</internal_type>\n\n<fuel>`,
    );
    const unit = unitFor(content);
    const weight = computeSupportVehicleWeight(
      unit,
      createSupportRegistryMass(unit.techBase),
    );
    expect(weight.structure).toBe(13.5);
    expect(weight.total).toBe(59.5);
  },
);

// Pure owners.
it.each([
  ['Cargo:SIZE:20.0', 20],
  ['Support Laser:SIZE:2.0', 2],
  ['Communications Equipment:OMNI:SIZE:7.0', 7],
  ['LRT 10', 1],
])('reads the %s mount size as %s', (token, size) => {
  expect(getMountSourceSize(token)).toBe(size);
});

describe('fire control mass owner', () => {
  const advanced = { id: 'advanced-fire-control', weight: 0 };
  const base = { tonnage: 0.75, isSupportVehicle: true };
  it('uses the fixed Omni chassis mass when positive, whatever the weapons weigh', () => {
    expect(
      resolveVehicleVariableMass(advanced, 'Advanced Fire Control', {
        ...base,
        weaponWeight: 0.4,
        baseChassisFireConWeight: 0.01,
      }),
    ).toBe(0.01);
  });
  it.each([0, undefined])(
    'falls back to a tenth of the weapon mass when the chassis mass is %s',
    (fixed) => {
      expect(
        resolveVehicleVariableMass(advanced, 'Advanced Fire Control', {
          ...base,
          weaponWeight: 0.4,
          baseChassisFireConWeight: fixed,
        }),
      ).toBe(0.04);
    },
  );
});
