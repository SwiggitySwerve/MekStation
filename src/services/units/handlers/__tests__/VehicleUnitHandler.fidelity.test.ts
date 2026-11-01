import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { WeightClass } from '@/types/enums';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import { computeStoredVehicleEngineRating } from '@/utils/construction/vehicle/engine';

import { SupportVehicleUnitHandler } from '../SupportVehicleUnitHandler';
import { VTOLUnitHandler } from '../VTOLUnitHandler';
import { createMockBlkDocument } from './SupportVehicleUnitHandler.test-helpers';
import { createMockBlkDocument as createVTOLDocument } from './VTOLUnitHandler.test-helpers';

describe('vehicle source fidelity', () => {
  // BLKSupportTankFile:125-126 and BLKLargeSupportTankFile:128-129:
  // presence, including zero armor, installs a turret independently of equipment.
  it.each([
    ['SupportTank', [8, 6, 6, 4], undefined],
    ['SupportTank', [8, 6, 6, 4, 0], TurretType.SINGLE],
    ['SupportTank', [8, 6, 6, 4, 0, 0], TurretType.DUAL],
    ['LargeSupportTank', [8, 6, 6, 4, 4, 4, 0], TurretType.SINGLE],
    ['LargeSupportTank', [8, 6, 6, 4, 4, 4, 0, 0], TurretType.DUAL],
  ] as const)('loads %s armor %j with turret %s', (unitType, armor, type) => {
    const result = new SupportVehicleUnitHandler().parse(
      createMockBlkDocument({ unitType, armor: [...armor] }),
    );
    if (!result.success) throw new Error(JSON.stringify(result.error));
    if (type === undefined)
      expect(result.data.unit).not.toHaveProperty('turret.type');
    else
      expect(result.data.unit).toMatchObject({
        turret: { type, currentWeight: 0, rotationArc: 360 },
      });
  });

  it('retains support turret equipment without an armor turret entry', () => {
    const result = new SupportVehicleUnitHandler().parse(
      createMockBlkDocument({ equipmentByLocation: { Turret: ['Crane'] } }),
    );
    expect(result.data?.unit).toMatchObject({
      turret: { type: TurretType.SINGLE },
      equipment: [{ name: 'Crane', isTurretMounted: true }],
    });
  });

  it('loads the optional SupportVTOL chin turret from zero armor', () => {
    const result = new SupportVehicleUnitHandler().parse(
      createMockBlkDocument({
        unitType: 'SupportVTOL',
        motionType: 'VTOL',
        armor: [8, 6, 6, 4, 2, 0],
      }),
    );
    expect(result.data?.unit).toMatchObject({
      turret: { type: TurretType.CHIN, rotationArc: 180 },
    });
  });

  it.each([
    [35, WeightClass.LIGHT],
    [40, WeightClass.MEDIUM],
    [55, WeightClass.MEDIUM],
    [60, WeightClass.HEAVY],
  ])(
    'classifies a %s ton VTOL as %s through the shared owner',
    (tonnage, weightClass) => {
      const result = new VTOLUnitHandler().parse(
        createVTOLDocument({ tonnage }),
      );
      expect(result.data?.unit.weightClass).toBe(weightClass);
    },
  );

  // UL-16 oracle engine.ownerAwareRating, not engine.rating (stored sentinel 0).
  it('carries a fractional support engine rating through the contract to the editor', () => {
    expect(
      mapToVehicleState({
        id: 'fractional-support',
        unitType: 'Support Vehicle',
        chassis: 'Boreas',
        tonnage: 0.75,
        motionType: 'Hover',
        movement: { cruiseMP: 14 },
        engine: { type: 'FUEL_CELL', rating: 10.5 },
        armor: { type: 'BAR', barRating: 8, byLocation: { FRONT: 0 } },
      }).engineRating,
    ).toBe(10.5);
  });

  it.each([
    ['SupportTank', 4.999, 6, 29.994],
    ['SupportVTOL', 4.999, 6, 29.994],
    ['LargeSupportTank', 120, 3, 360],
    ['SupportTank', 200, 4, 500],
    ['LargeSupportTank', 1000, 4, 500],
    ['SupportTank', 20, 0, 0],
  ] as const)(
    'uses the effective %s engine rating at %s t and %s MP',
    (unitType, tonnage, cruiseMP, rating) => {
      const result = new SupportVehicleUnitHandler().parse(
        createMockBlkDocument({ unitType, tonnage, cruiseMP }),
      );
      expect(result.data?.unit.engineRating).toBeCloseTo(rating, 8);
      expect(
        computeStoredVehicleEngineRating(
          tonnage,
          cruiseMP,
          GroundMotionType.TRACKED,
          true,
        ),
      ).toBeCloseTo(rating, 8);
    },
  );
});
