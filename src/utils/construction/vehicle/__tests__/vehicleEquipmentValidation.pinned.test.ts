/** @spec openspec/changes/establish-all-unit-data-parity/specs/unit-entity-model/spec.md */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IUnitTypeHandler } from '@/types/unit/UnitTypeHandler';

import { BlkParserService } from '@/services/conversion/BlkParserService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { SupportVehicleUnitHandler } from '@/services/units/handlers/SupportVehicleUnitHandler';
import { VehicleUnitHandler } from '@/services/units/handlers/VehicleUnitHandler';
import { VTOLUnitHandler } from '@/services/units/handlers/VTOLUnitHandler';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import {
  validateCombatVehicleEquipment,
  validateSupportVehicleEquipment,
} from '../vehicleValidation';

// MegaMek 48fcb2f64: TestTank:979-980,1079-1093 (body equipment),
// TestSupportVehicle:1618-1640 (ammo starts at 5 t). Synthetic BLKs were
// loaded by the pinned Java verifier; no Java weight or validity is mocked.
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

function source(tags: Record<string, string | number | readonly string[]>) {
  return Object.entries({
    Name: 'FU-106 synthetic vehicle',
    Model: '',
    year: 3100,
    type: 'IS Level 3',
    ...tags,
  })
    .map(
      ([key, value]) =>
        `<${key}>\n${Array.isArray(value) ? value.join('\n') : value}\n</${key}>`,
    )
    .join('\n');
}

function load(handler: IUnitTypeHandler, content: string) {
  const parsed = new BlkParserService().parse(content);
  if (!parsed.success) throw Error(JSON.stringify(parsed.error));
  const loaded = handler.parse(parsed.data.document);
  if (!loaded.success) throw Error(JSON.stringify(loaded.error));
  return {
    unit: loaded.data.unit,
    validation: handler.validate(loaded.data.unit),
  };
}

it('rejects the source-loaded 5 t support ammo overrun without losing its load', () => {
  const result = load(
    new SupportVehicleUnitHandler(),
    source({
      UnitType: 'SupportTank',
      tonnage: 5,
      motion_type: 'Wheeled',
      cruiseMP: 0,
      engine_type: 1,
      armor_type: 45,
      armor_tech_rating: 3,
      structural_tech_rating: 3,
      engine_tech_rating: 3,
      armor: ['0', '0', '0', '0'],
      barrating: 6,
      'Body Equipment': ['IS Ammo MG - Full'],
      'Front Equipment': Array<string>(5).fill('Machine Gun'),
      fuel: 0,
    }),
  );
  expect(result.unit.tonnage).toBe(5);
  expect(result.validation.errors).toEqual([
    'Not enough item slots available! Using 1 slot(s) too many.',
  ]);
  expect(result.validation.isValid).toBe(false);
});

it('rejects source-loaded misplaced fire control beside variable cargo', () => {
  const result = load(
    new SupportVehicleUnitHandler(),
    source({
      UnitType: 'LargeSupportTank',
      tonnage: 150,
      motion_type: 'Wheeled',
      cruiseMP: 3,
      engine_type: 1,
      armor_type: 47,
      armor_tech_rating: 2,
      armor_tech_level: 1,
      structural_tech_rating: 3,
      engine_tech_rating: 3,
      armor: ['21', '13', '13', '13', '13', '10'],
      'Body Equipment': ['ISOffRoadChassis'],
      'Front Equipment': ['Basic Fire Control'],
      'Rear Equipment': ['Dumper (Rear)', 'Cargo:SIZE:50.0'],
      barrating: 6,
      fuel: 4,
    }),
  );
  expect(result.unit.tonnage).toBe(150);
  expect(result.validation.errors).toEqual([
    'Basic Fire Control must be mounted in the body.',
  ]);
  expect(result.validation.isValid).toBe(false);
});

it.each([
  ['Tank', new VehicleUnitHandler(), ['10', '6', '6', '2']],
  ['VTOL', new VTOLUnitHandler(), ['10', '6', '6', '2', '1']],
] as const)(
  '%s keeps body placement independent of slot availability',
  (unitType, handler, armor) => {
    const result = load(
      handler,
      source({
        UnitType: unitType,
        tonnage: 50,
        motion_type: unitType === 'VTOL' ? 'VTOL' : 'Tracked',
        cruiseMP: 3,
        engine_type: 0,
        armor_type: 0,
        armor,
        'Body Equipment': ['Blue Shield Particle Field Damper'],
        'Front Equipment': ['Advanced Fire Control'],
      }),
    );
    expect(result.validation.errors).toContain(
      'Advanced Fire Control must be mounted in the body.',
    );
  },
);

const base = {
  tonnage: 50,
  movement: { jumpMP: 0 },
  engineType: 0,
  engineRating: 150,
  armorType: 0,
  motionType: GroundMotionType.TRACKED,
};
const validators = [
  validateCombatVehicleEquipment,
  validateSupportVehicleEquipment,
];

describe.each(validators)(
  '%p checks independent placement rules',
  (validate) => {
    it.each(['Basic Fire Control', 'Advanced Fire Control'])(
      '%s reports once despite unrelated unknown or null slot costs',
      (equipmentId) => {
        for (const companion of [
          'Medium Laser',
          'Not A Real Item',
          'Cargo:SIZE:50.0',
          'Blue Shield Particle Field Damper',
        ]) {
          const equipment = [
            { equipmentId, location: 'Front' },
            { equipmentId: companion, location: 'Body' },
          ];
          expect(validate({ ...base, equipment })).toEqual([
            `${equipmentId} must be mounted in the body.`,
          ]);
          expect(
            validate({
              ...base,
              equipment: equipment.map((item) => ({
                ...item,
                location: 'Body',
              })),
            }),
          ).toEqual([]);
        }
      },
    );

    it('retains CASE and motive errors when slot costs are unknown', () => {
      const errors = validate({
        ...base,
        equipment: [
          { equipmentId: 'Basic Fire Control:OMNI', location: 'Rear' },
          { equipmentId: 'ISCASE', location: 'Front' },
          { equipmentId: 'ISInfraredImager', location: 'Body' },
          { equipmentId: 'Not A Real Item', location: 'Body' },
        ],
      });
      expect(errors).toContain(
        'Basic Fire Control must be mounted in the body.',
      );
      expect(errors).toContain('CASE must be mounted in the body.');
      expect(errors.join('\n')).toContain(
        'Satellite Imager (Infrared Imager) is incompatible with Tracked',
      );
    });
  },
);
