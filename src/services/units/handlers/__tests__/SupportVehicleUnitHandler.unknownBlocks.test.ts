/** @spec openspec/changes/preserve-combat-vehicle-turret-source-facts/specs/vehicle-unit-system/spec.md */
import { BlkParserService } from '@/services/conversion/BlkParserService';
import {
  SuperHeavyVehicleLocation,
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';

import { SupportVehicleUnitHandler } from '../SupportVehicleUnitHandler';
import { createMockBlkDocument } from './SupportVehicleUnitHandler.test-helpers';

const handler = new SupportVehicleUnitHandler();
it('rejects a real-parser Nose block instead of moving its equipment into Body', () => {
  const parsed = new BlkParserService().parse(
    '<UnitType>SupportTank</UnitType><Name>Unknown block</Name><year>3050</year><type>IS Level 2</type><tonnage>20</tonnage><motion_type>Wheeled</motion_type><cruiseMP>4</cruiseMP><armor>0\n0\n0\n0</armor><Nose Equipment>ISMediumLaser</Nose Equipment>',
  );
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  const doc = parsed.data.document;
  expect(Object.keys(doc.equipmentByLocation)).toContain('Nose');
  const before = JSON.stringify(doc);
  expect(() => handler.parse(doc)).not.toThrow();
  const result = handler.parse(doc);
  expect(result.success).toBe(false);
  if (result.success) throw new Error('unknown equipment relocated');
  expect(result.error.errors.join('; ')).toMatch(/unknown.*Nose/i);
  expect(JSON.stringify(doc)).toBe(before);
});
it.each(['Unmapped Equipment', 'constructor', '__proto__'])(
  'reports the original nonempty block %s explicitly',
  (name) => {
    const doc = createMockBlkDocument({
      equipmentByLocation: Object.fromEntries([[name, ['ISMediumLaser']]]),
    });
    const before = JSON.stringify(doc);
    expect(() => handler.parse(doc)).not.toThrow();
    const result = handler.parse(doc);
    expect(result.success).toBe(false);
    if (result.success) throw new Error('unknown equipment relocated');
    expect(result.error.errors).toContain(
      `Unknown support vehicle equipment block: ${name}`,
    );
    expect(JSON.stringify(doc)).toBe(before);
  },
);
it.each(['Unmapped Equipment', 'constructor', '__proto__'])(
  'ignores an empty unknown block %s',
  (name) => {
    const doc = createMockBlkDocument({
      equipmentByLocation: Object.fromEntries([
        [name, []],
        ['Body Equipment', ['ISMediumLaser']],
      ]),
    });
    const result = handler.parse(doc);
    if (!result.success) throw new Error(JSON.stringify(result.error));
    expect(result.data.unit.equipment).toEqual([
      expect.objectContaining({
        location: VehicleLocation.BODY,
        equipmentId: 'ISMediumLaser',
      }),
    ]);
  },
);
it.each([
  [
    'SupportTank',
    'Front Turret Equipment',
    VehicleLocation.TURRET_2,
    [0, 0, 0, 0, 0, 0],
  ],
  [
    'SupportTank',
    'Rear Turret Equipment',
    VehicleLocation.TURRET,
    [0, 0, 0, 0, 0, 0],
  ],
  ['SupportVTOL', 'Rotor Equipment', VTOLLocation.ROTOR, [0, 0, 0, 0, 0]],
  [
    'LargeSupportTank',
    'Front Right Equipment',
    SuperHeavyVehicleLocation.FRONT_RIGHT,
    [0, 0, 0, 0, 0, 0],
  ],
] as const)(
  'retains supported %s %s identity',
  (unitType, block, location, armor) => {
    const doc = createMockBlkDocument({
      unitType,
      motionType: unitType === 'SupportVTOL' ? 'VTOL' : 'Wheeled',
      armor: [...armor],
      equipmentByLocation: { [block]: ['ISMediumLaser'] },
    });
    const result = handler.parse(doc);
    if (!result.success) throw new Error(JSON.stringify(result.error));
    expect(result.data.unit.equipment).toEqual([
      expect.objectContaining({ location }),
    ]);
  },
);
