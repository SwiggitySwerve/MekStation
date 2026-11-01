/**
 * Contract JSON -> BV dispatcher input (UL-17). Small hand-written units pin the
 * mapping rules copied from the BLK handlers; the converter-output fixture is
 * exercised in `scripts/__tests__/vehicle-aero-bv-delta.test.ts`.
 */
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { calculateBattleValueForUnit } from '../battleValueCalculations';
import {
  contractUnitToBVUnit,
  type IContractBVAerospace,
  type IContractBVSource,
  type IContractBVVehicle,
} from '../contractBVUnitAdapter';

const vehicle = (
  overrides: Partial<IContractBVSource> = {},
): IContractBVSource => ({
  id: 'test-vehicle',
  unitType: 'Vehicle',
  tonnage: 50,
  motionType: 'Tracked',
  movement: { cruiseMP: 4, flankMP: 6, jumpMP: 0 },
  armor: {
    type: 'STANDARD',
    byLocation: { FRONT: 40, RIGHT: 30, LEFT: 30, REAR: 20, TURRET: 25 },
  },
  equipment: [
    { id: 'medium-laser', location: 'FRONT' },
    { id: 'medium-laser', location: 'REAR' },
    { id: 'ac-10', location: 'TURRET' },
    { id: 'ac-10-ammo', location: 'BODY' },
  ],
  ...overrides,
});

const fighter = (
  overrides: Partial<IContractBVSource> = {},
): IContractBVSource => ({
  id: 'test-fighter',
  unitType: 'Aerospace',
  tonnage: 50,
  movement: { safeThrust: 6, maxThrust: 9 },
  structuralIntegrity: 6,
  armor: {
    type: 'FERRO_FIBROUS',
    byArc: { NOSE: 40, LEFT_WING: 30, RIGHT_WING: 30, AFT: 20 },
  },
  equipment: [
    { id: 'medium-laser', location: 'NOSE' },
    { id: 'medium-laser', location: 'LEFT_WING' },
  ],
  ...overrides,
});

describe('contractUnitToBVUnit (vehicles)', () => {
  it('copies the Tank handler flags: rear, turret and a single turret', () => {
    const unit = contractUnitToBVUnit(vehicle()) as IContractBVVehicle;
    expect(unit.unitType).toBe(UnitType.VEHICLE);
    expect(unit.motionType).toBe(GroundMotionType.TRACKED);
    expect(unit.totalArmorPoints).toBe(145);
    expect(unit.armorByLocation[VehicleLocation.TURRET]).toBe(25);
    expect(unit.turret).toEqual({ type: TurretType.SINGLE });
    const [front, rear, turret, ammo] = unit.equipment;
    expect(front).toMatchObject({
      equipmentId: 'medium-laser',
      isRearMounted: false,
    });
    expect(rear).toMatchObject({
      location: VehicleLocation.REAR,
      isRearMounted: true,
    });
    expect(turret).toMatchObject({
      isTurretMounted: true,
      isRearMounted: false,
    });
    expect(ammo.location).toBe(VehicleLocation.BODY);
  });

  it('gives a VTOL a chin turret and never rear-mounts its weapons', () => {
    const unit = contractUnitToBVUnit(
      vehicle({ unitType: 'VTOL', motionType: 'VTOL' }),
    ) as IContractBVVehicle;
    expect(unit.turret).toBeUndefined();
    expect(unit.chinTurret).toEqual({ type: TurretType.CHIN });
    expect(unit.equipment.some((e) => e.isRearMounted)).toBe(false);
  });

  it('keeps a Support Vehicle turretless and passes BAR through only when present', () => {
    const withBar = contractUnitToBVUnit(
      vehicle({
        unitType: 'Support Vehicle',
        armor: { type: 'BAR', barRating: 5, byLocation: { FRONT: 10 } },
      }),
    ) as IContractBVVehicle;
    expect(withBar.turret).toBeUndefined();
    expect(withBar.barRating).toBe(5);
    const withoutBar = contractUnitToBVUnit(
      vehicle({ unitType: 'Support Vehicle' }),
    ) as IContractBVVehicle;
    expect('barRating' in withoutBar).toBe(false);
  });

  it.each([
    [
      'unknown motion type',
      vehicle({ motionType: 'Walker' }),
      'Unknown motionType',
    ],
    [
      'unknown equipment location',
      vehicle({ equipment: [{ id: 'medium-laser', location: 'ROTOR' }] }),
      'Unknown vehicle location',
    ],
    [
      'unknown armor location',
      vehicle({ armor: { type: 'STANDARD', byLocation: { ROTOR: 2 } } }),
      'Unknown armor location',
    ],
  ])('throws on %s instead of defaulting', (_name, unit, message) => {
    expect(() => contractUnitToBVUnit(unit)).toThrow(message);
  });

  it('feeds the dispatcher and returns a vehicle breakdown', () => {
    const result = calculateBattleValueForUnit(contractUnitToBVUnit(vehicle()));
    expect(result?.kind).toBe('vehicle');
    expect(result?.breakdown.final).toBeGreaterThan(0);
  });
});

describe('contractUnitToBVUnit (aerospace)', () => {
  it('maps arcs to calculator arc strings and the armor type to a lookup key', () => {
    const unit = contractUnitToBVUnit(fighter()) as IContractBVAerospace;
    expect(unit.unitType).toBe(UnitType.AEROSPACE);
    expect(unit.armorType).toBe('ferro-fibrous');
    expect(unit.totalArmorPoints).toBe(120);
    expect(unit.equipment.map((e) => e.location)).toEqual([
      'Nose',
      'Left Wing',
    ]);
  });

  it('feeds the dispatcher for fighters, conventional fighters and small craft', () => {
    for (const unitType of [
      'Aerospace',
      'Conventional Fighter',
      'Small Craft',
    ]) {
      const result = calculateBattleValueForUnit(
        contractUnitToBVUnit(fighter({ unitType })),
      );
      expect(result?.kind).toBe('aerospace');
      expect(Number.isFinite(result?.breakdown.final)).toBe(true);
    }
  });

  it('throws when SI or the arc is missing from the source', () => {
    expect(() =>
      contractUnitToBVUnit(fighter({ structuralIntegrity: undefined })),
    ).toThrow('structuralIntegrity');
    expect(() =>
      contractUnitToBVUnit(
        fighter({ equipment: [{ id: 'medium-laser', location: 'BODY' }] }),
      ),
    ).toThrow('Unknown aerospace arc');
  });

  it('rejects unit types it does not adapt', () => {
    expect(() =>
      contractUnitToBVUnit(fighter({ unitType: 'DropShip' })),
    ).toThrow();
  });
});
