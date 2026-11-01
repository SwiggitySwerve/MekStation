import { createMockBlkDocument } from '@/services/units/handlers/__tests__/VTOLUnitHandler.test-helpers';
import { SupportVehicleUnitHandler } from '@/services/units/handlers/SupportVehicleUnitHandler';
import { VehicleUnitHandler } from '@/services/units/handlers/VehicleUnitHandler';
import { VTOLUnitHandler } from '@/services/units/handlers/VTOLUnitHandler';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import fixture from '../../../../../scripts/__tests__/fixtures/vehicle_aero_contract_bv.json';
import { calculateBattleValueForUnit } from '../../battleValueCalculations';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '../../contractBVUnitAdapter';
import { computeVehicleBVStructurePoints } from '../structure';
import { calculateVehicleBV } from '../vehicleBV';
import { toVehicleBVInput } from '../vehicleBVAdapter';
import { baseInput } from './vehicleBV.test.helpers';

/** @spec establish-all-unit-data-parity/battle-value-system */
describe('Pinned MegaMek vehicle structure BV', () => {
  it('matches Tamerlane structure 15 and defense 141.75 through the dispatcher', () => {
    const result = calculateBattleValueForUnit(
      contractUnitToBVUnit(fixture.units[0].unit as IContractBVSource),
    );
    if (result?.kind !== 'vehicle') throw new Error('Expected vehicle');
    expect(result.breakdown.structureBV).toBe(15);
    expect(result.breakdown.defensive).toBeCloseTo(141.75, 8);
    expect(result.breakdown.offensive).toBeCloseTo(293.76, 8);
    expect(result.breakdown.final).toBe(436);
  });

  it.each([
    [0, 1],
    [1, 0.5],
    [2, 1],
    [3, 1],
    [4, 2],
    [5, 0.5],
    [6, 1],
    [-1, 1],
  ])(
    'transports internal type %s and applies multiplier %s',
    (internalType, multiplier) => {
      const source = fixture.units[0].unit as IContractBVSource;
      const result = calculateBattleValueForUnit(
        contractUnitToBVUnit({ ...source, internalType }),
      );
      if (result?.kind !== 'vehicle') throw new Error('Expected vehicle');
      expect(result.breakdown.structureBV).toBe(15 * multiplier);
    },
  );

  it.each([
    [
      'Vehicle',
      GroundMotionType.TRACKED,
      20,
      ['FRONT', 'LEFT', 'RIGHT', 'REAR'],
      12,
    ],
    [
      'Vehicle',
      GroundMotionType.TRACKED,
      20,
      ['FRONT', 'LEFT', 'RIGHT', 'REAR', 'TURRET', 'TURRET_2'],
      18,
    ],
    [
      'Vehicle',
      GroundMotionType.TRACKED,
      150,
      [
        'FRONT',
        'FRONT_RIGHT',
        'FRONT_LEFT',
        'REAR_RIGHT',
        'REAR_LEFT',
        'REAR',
        'TURRET',
        'TURRET_2',
      ],
      180,
    ],
    [
      'VTOL',
      GroundMotionType.VTOL,
      20,
      ['FRONT', 'LEFT', 'RIGHT', 'REAR', 'ROTOR'],
      15,
    ],
    [
      'VTOL',
      GroundMotionType.VTOL,
      20,
      ['FRONT', 'LEFT', 'RIGHT', 'REAR', 'ROTOR', 'TURRET'],
      18,
    ],
    [
      UnitType.SUPPORT_VEHICLE,
      GroundMotionType.WHEELED,
      10.1,
      ['FRONT', 'LEFT', 'RIGHT', 'REAR'],
      12,
    ],
    [
      UnitType.SUPPORT_VEHICLE,
      GroundMotionType.VTOL,
      20,
      ['FRONT', 'LEFT', 'RIGHT', 'REAR', 'ROTOR', 'TURRET'],
      18,
    ],
  ] as const)(
    'values zero-armor installed locations for %s/%s',
    (unitType, motionType, tonnage, locations, expected) => {
      const source = fixture.units[0].unit as IContractBVSource;
      const result = calculateBattleValueForUnit(
        contractUnitToBVUnit({
          ...source,
          unitType,
          motionType,
          tonnage,
          equipment: [],
          armor: {
            type: 'STANDARD',
            byLocation: Object.fromEntries(locations.map((l) => [l, 0])),
          },
        }),
      );
      if (result?.kind !== 'vehicle') throw new Error('Expected vehicle');
      expect(result.breakdown.structureBV).toBe(expected);
      expect(result.breakdown.armorBV).toBe(0);
    },
  );

  it('uses store turret metadata and the motion-specific SuperHeavy boundary', () => {
    const state = {
      motionType: GroundMotionType.HOVER,
      tonnage: 55,
      cruiseMP: 4,
      armorType: 'standard',
      armorAllocation: {},
      structureType: 'industrial',
      turret: { type: TurretType.DUAL },
      secondaryTurret: { type: TurretType.SINGLE },
      barRating: null,
      equipment: [],
    };
    const input = toVehicleBVInput(state);
    expect(input.totalStructurePoints).toBe(48);
    expect(
      toVehicleBVInput({ ...state, secondaryTurret: null })
        .totalStructurePoints,
    ).toBe(48);
    expect(
      toVehicleBVInput({
        ...state,
        turret: { type: TurretType.SPONSON_LEFT },
        secondaryTurret: null,
      }).totalStructurePoints,
    ).toBe(36);
    expect(calculateVehicleBV(input).structureBV).toBe(36);
    expect(
      toVehicleBVInput({ ...state, tonnage: 50 }).totalStructurePoints,
    ).toBe(30);
    expect(
      computeVehicleBVStructurePoints({
        tonnage: 20,
        motionType: GroundMotionType.TRACKED,
        structureLocations: ['Body', 'Front', 'Front', 'Rear'],
      }),
    ).toBe(4);
  });

  it('adds Blue Shield to the structure multiplier without changing other raw terms', () => {
    const input = baseInput({ structureType: 'composite' });
    const before = calculateVehicleBV(input);
    const after = calculateVehicleBV({
      ...input,
      chassisEquipment: ['ISBlueShieldParticleFieldDamper'],
    });
    expect(after.structureBV).toBe(30 * 1.5 * 0.7);
    expect(after.armorBV).toBe(before.armorBV);
    expect(after.offensive).toBe(before.offensive);
  });
  it.each([
    ['Tank', UnitType.VEHICLE, new VehicleUnitHandler()],
    ['VTOL', UnitType.VTOL, new VTOLUnitHandler()],
    ['SupportTank', UnitType.SUPPORT_VEHICLE, new SupportVehicleUnitHandler()],
  ] as const)(
    'preserves structure facts through the %s handler',
    (unitType, mappedUnitType, handler) => {
      const parsed = handler.parse(
        createMockBlkDocument({
          unitType,
          mappedUnitType,
          tonnage: 20,
          internalType: 5,
          motionType: mappedUnitType === UnitType.VTOL ? 'VTOL' : 'Tracked',
          armor: [0, 0, 0, 0, 0, 0],
          equipmentByLocation: {},
        }),
      );
      if (!parsed.success) throw new Error('Expected parsed vehicle');
      expect(parsed.data.unit.structureLocations).toHaveLength(6);
      const result = calculateBattleValueForUnit(parsed.data.unit);
      if (result?.kind !== 'vehicle') throw new Error('Expected vehicle');
      expect(result.breakdown.structureBV).toBe(9);
    },
  );
});
