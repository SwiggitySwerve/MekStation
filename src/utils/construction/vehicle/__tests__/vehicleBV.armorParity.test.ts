import { createMockBlkDocument } from '@/services/units/handlers/__tests__/VTOLUnitHandler.test-helpers';
import { VehicleUnitHandler } from '@/services/units/handlers/VehicleUnitHandler';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { calculateBattleValueForUnit } from '../../battleValueCalculations';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '../../contractBVUnitAdapter';
import { calculateVehicleDefensiveBV } from '../vehicleBV';
import { baseInput } from './vehicleBV.test.helpers';

/** @spec establish-all-unit-data-parity/battle-value-system */
describe('Pinned vehicle armor BV', () => {
  // mm-data 50f7efef: original locations and armor types, including installed turret.
  it.each([
    ['Mamono IFV', 'REFLECTIVE', [40, 30, 30, 30, 30], 600],
    ['Ballista Artillery Trailer', 'HARDENED', [30, 30, 30, 30, 32], 760],
  ] as const)(
    '%s preserves its armor type through the contract dispatcher',
    (id, type, points, expected) => {
      const source: IContractBVSource = {
        id,
        unitType: 'Vehicle',
        tonnage: 100,
        motionType: 'Tracked',
        movement: { cruiseMP: 0, flankMP: 0 },
        armor: {
          type,
          byLocation: Object.fromEntries(
            ['FRONT', 'RIGHT', 'LEFT', 'REAR', 'TURRET'].map((l, i) => [
              l,
              points[i],
            ]),
          ),
        },
      };
      const result = calculateBattleValueForUnit(contractUnitToBVUnit(source));
      if (result?.kind !== 'vehicle') throw new Error('Expected vehicle');
      expect(result.breakdown.armorBV).toBe(expected);
    },
  );

  it.each([
    [0, 1],
    [1, 1],
    [2, 1.5],
    [3, 1.5],
    [4, 2],
    [5, 1],
    [6, 1],
    [16, 1.2],
    [23, 1.2],
    [24, 1.1],
    [26, 1.5],
  ])(
    'values native armor code %s with multiplier %s',
    (armorType, multiplier) => {
      const parsed = new VehicleUnitHandler().parse(
        createMockBlkDocument({
          unitType: 'Tank',
          mappedUnitType: UnitType.VEHICLE,
          armorType,
          armor: [10, 10, 10, 10],
          equipmentByLocation: {},
        }),
      );
      if (!parsed.success) throw new Error('Expected vehicle');
      const result = calculateBattleValueForUnit(parsed.data.unit);
      if (result?.kind !== 'vehicle') throw new Error('Expected vehicle');
      expect(result.breakdown.armorBV).toBeCloseTo(100 * multiplier, 8);
    },
  );

  it.each(['Vehicle', 'VTOL', 'Support Vehicle'])(
    'values patchwork locations and BAR for %s',
    (unitType) => {
      const source = {
        id: 'patchwork',
        unitType,
        tonnage: 20,
        motionType: unitType === 'VTOL' ? 'VTOL' : 'Tracked',
        movement: { cruiseMP: 4, flankMP: 6 },
        armor: {
          type: 'PATCHWORK',
          byLocation: {
            FRONT: 10,
            RIGHT: 10,
            LEFT: 0,
            REAR: 10,
            TURRET: 10,
            ...(unitType === 'VTOL' ? { ROTOR: 2 } : {}),
          },
          typeByLocation: {
            FRONT: 3,
            RIGHT: 4,
            LEFT: 2,
            REAR: 16,
            TURRET: 26,
            ROTOR: 0,
          },
          barRatingByLocation: {
            FRONT: unitType === 'Support Vehicle' ? 6 : 10,
            RIGHT: 10,
            LEFT: 10,
            REAR: 10,
            TURRET: 10,
            ROTOR: 10,
          },
        },
      };
      const result = calculateBattleValueForUnit(contractUnitToBVUnit(source));
      if (result?.kind !== 'vehicle') throw new Error('Expected vehicle');
      expect(result.breakdown.armorBV).toBeCloseTo(
        ((unitType === 'Support Vehicle' ? 9 : 15) +
          20 +
          12 +
          15 +
          (unitType === 'VTOL' ? 2 : 0)) *
          2.5,
        8,
      );
    },
  );

  it('preserves Air Car without a source BAR rating (Java armor BV zero)', () => {
    const result = calculateBattleValueForUnit(
      contractUnitToBVUnit({
        id: 'air-car',
        unitType: 'Support Vehicle',
        tonnage: 40,
        motionType: 'Hover',
        movement: { cruiseMP: 11, flankMP: 17 },
        armor: {
          type: 'STANDARD',
          byLocation: { FRONT: 8, RIGHT: 8, LEFT: 8, REAR: 8 },
        },
      }),
    );
    if (result?.kind !== 'vehicle') throw new Error('Expected vehicle');
    expect(result.breakdown.armorBV).toBe(0);
    expect(result.breakdown.defensive).toBeCloseTo(23.52, 8);
    expect(result.breakdown.final).toBe(75);
  });

  it('adds Blue Shield to the armor multiplier before BAR without rounding', () => {
    const result = calculateVehicleDefensiveBV(
      baseInput({
        totalArmorPoints: 3,
        armorType: 'reflective',
        barRating: 6,
        chassisEquipment: ['ISBlueShieldParticleFieldDamper'],
      }),
    );
    expect(result.armorBV).toBeCloseTo(3 * 2.5 * 1.7 * 0.6, 10);
  });

  it('counts undamaged modular armor and applies HarJel only at its location', () => {
    const input = baseInput({
      armorByLocation: { Front: 10, Rear: 10 },
      armorEquipment: [
        { id: 'ISModularArmor', location: 'Front' },
        { id: 'HarJel II Self-Repair System', location: 'Front' },
        { id: 'HarJel III Self-Repair System', location: 'Front' },
      ],
    });
    expect(calculateVehicleDefensiveBV(input).armorBV).toBeCloseTo(
      (20 * 1.1 * 1.2 + 10) * 2.5,
      8,
    );
  });

  it('fails clearly when patchwork location types are missing', () => {
    expect(() =>
      calculateVehicleDefensiveBV(
        baseInput({ armorType: 'patchwork', armorByLocation: { Front: 10 } }),
      ),
    ).toThrow('Missing patchwork armor type: Front');
  });
});
