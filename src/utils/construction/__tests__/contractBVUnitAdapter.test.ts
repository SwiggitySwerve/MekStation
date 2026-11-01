/**
 * Contract JSON -> BV dispatcher input (UL-17). Small hand-written units pin the
 * mapping rules shared with the Tank handler; the converter-output fixture is
 * exercised in `scripts/__tests__/vehicle-aero-bv-delta.test.ts`.
 */
import { VehicleUnitHandler } from '@/services/units/handlers/VehicleUnitHandler';
import {
  SuperHeavyVehicleLocation,
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import fixture from '../../../../scripts/__tests__/fixtures/vehicle_aero_contract_bv.json';
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

describe('Converted vehicle location vocabulary', () => {
  it.each([
    ['FRONT_LEFT', SuperHeavyVehicleLocation.FRONT_LEFT],
    ['FRONT_RIGHT', SuperHeavyVehicleLocation.FRONT_RIGHT],
    ['REAR_LEFT', SuperHeavyVehicleLocation.REAR_LEFT],
    ['REAR_RIGHT', SuperHeavyVehicleLocation.REAR_RIGHT],
    ['ROTOR', VTOLLocation.ROTOR],
  ])('preserves %s in both armor and equipment', (tag, location) => {
    const unit = contractUnitToBVUnit(
      vehicle({
        armor: { type: 'STANDARD', byLocation: { [tag]: 7 } },
        equipment: [{ id: 'medium-laser', location: tag }],
      }),
    ) as IContractBVVehicle;
    expect(unit.armorByLocation).toEqual({ [location]: 7 });
    expect(unit.equipment[0].location).toBe(location);
    expect(unit.totalArmorPoints).toBe(7);
  });
});

describe('contractUnitToBVUnit (vehicles)', () => {
  it('keeps a secondary turret mount independent of the primary turret', () => {
    const unit = contractUnitToBVUnit(
      vehicle({
        armor: {
          type: 'STANDARD',
          byLocation: { FRONT: 40, RIGHT: 30, LEFT: 30, REAR: 20 },
        },
        equipment: [{ id: 'medium-laser', location: 'TURRET_2' }],
      }),
    ) as IContractBVVehicle;
    expect(unit.turret).toBeUndefined();
    expect(unit.equipment[0]).toMatchObject({
      location: VehicleLocation.TURRET_2,
      isTurretMounted: true,
    });
  });

  // MegaMek installs turrets from the armor layout, not from equipment: a
  // Turret armor entry (even 0) is a turret, Turret 2 makes it dual
  // (BLKTankFile.java:180-192). The adapter must pass that fact on.
  it.each([
    ['armor-only turret', { TURRET: 25 }, TurretType.SINGLE],
    ['explicit zero turret armor', { TURRET: 0 }, TurretType.SINGLE],
    ['dual-turret layout', { TURRET: 25, TURRET_2: 0 }, TurretType.DUAL],
    ['no turret armor', {}, undefined],
  ])(
    'takes the turret from the armor layout: %s',
    (_label, turretArmor, type) => {
      const unit = contractUnitToBVUnit(
        vehicle({
          armor: {
            type: 'STANDARD',
            byLocation: {
              FRONT: 40,
              RIGHT: 30,
              LEFT: 30,
              REAR: 20,
              ...turretArmor,
            },
          },
          equipment: [{ id: 'medium-laser', location: 'FRONT' }],
        }),
      ) as IContractBVVehicle;
      expect(unit.turret?.type).toBe(type);
    },
  );

  it('matches the handler for a Tamerlane that keeps its Turret armor and has a sponson laser', () => {
    const source = fixture.units.find((row) =>
      row.path.endsWith('Tamerlane Strike Sled (Flamer).blk'),
    );
    if (!source) throw new Error('Missing Tamerlane fixture');
    const unit = source.unit;
    const armorByLocation = unit.armor.byLocation as Readonly<
      Record<string, number>
    >;
    const parsed = new VehicleUnitHandler().parse({
      blockVersion: 1,
      version: 'MAM0',
      unitType: 'Tank',
      mappedUnitType: UnitType.VEHICLE,
      name: unit.chassis,
      model: unit.model,
      year: unit.year,
      type: 'IS Level 2',
      tonnage: unit.tonnage,
      motionType: unit.motionType,
      cruiseMP: unit.movement.cruiseMP,
      armor: ['FRONT', 'RIGHT', 'LEFT', 'REAR', 'TURRET'].map(
        (tag) => armorByLocation[tag] ?? 0,
      ),
      equipmentByLocation: { 'Sponson Turret Equipment': ['Medium Laser'] },
      rawTags: {},
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error('Tamerlane handler parse failed');
    const adapted = contractUnitToBVUnit({
      ...unit,
      armor: { type: unit.armor.type, byLocation: armorByLocation },
      equipment: [{ id: 'medium-laser', location: 'SPONSON' }],
    }) as IContractBVVehicle;
    expect(adapted.turret).toEqual({ type: TurretType.SINGLE });
    expect(calculateBattleValueForUnit(adapted)?.breakdown).toEqual(
      calculateBattleValueForUnit(parsed.data.unit)?.breakdown,
    );
  });

  it('matches the handler for a Tamerlane with one sponson Medium Laser', () => {
    const source = fixture.units.find((row) =>
      row.path.endsWith('Tamerlane Strike Sled (Flamer).blk'),
    );
    if (!source) throw new Error('Missing Tamerlane fixture');
    const unit = source.unit;
    // Drop the Turret armor value: MegaMek installs a turret from a Turret
    // armor entry (BLKTankFile.java:185), and this case checks that a sponson
    // alone does not.
    const { TURRET: _turret, ...armorByLocation } = unit.armor
      .byLocation as Readonly<Record<string, number>>;
    const parsed = new VehicleUnitHandler().parse({
      blockVersion: 1,
      version: 'MAM0',
      unitType: 'Tank',
      mappedUnitType: UnitType.VEHICLE,
      name: unit.chassis,
      model: unit.model,
      year: unit.year,
      type: 'IS Level 2',
      tonnage: unit.tonnage,
      motionType: unit.motionType,
      cruiseMP: unit.movement.cruiseMP,
      armor: ['FRONT', 'RIGHT', 'LEFT', 'REAR'].map(
        (tag) => armorByLocation[tag] ?? 0,
      ),
      equipmentByLocation: { 'Sponson Turret Equipment': ['Medium Laser'] },
      rawTags: {},
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error('Tamerlane handler parse failed');
    const adapted = contractUnitToBVUnit({
      ...unit,
      armor: { type: unit.armor.type, byLocation: armorByLocation },
      equipment: [{ id: 'medium-laser', location: 'SPONSON' }],
    }) as IContractBVVehicle;
    expect(adapted.equipment[0]).toMatchObject({
      location: VehicleLocation.BODY,
      isTurretMounted: true,
      isSponsonMounted: true,
    });
    const actual = calculateBattleValueForUnit(adapted);
    const expected = calculateBattleValueForUnit(parsed.data.unit);
    expect(actual?.breakdown.final).toBe(265);
    expect(actual?.breakdown).toEqual(expected?.breakdown);
    expect(adapted.turret).toBeUndefined();
  });

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
      vehicle({ equipment: [{ id: 'medium-laser', location: 'UNKNOWN' }] }),
      'Unknown vehicle location',
    ],
    [
      'unknown armor location',
      vehicle({ armor: { type: 'STANDARD', byLocation: { UNKNOWN: 2 } } }),
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

describe('required BV source facts', () => {
  it.each([
    ['cruiseMP', vehicle({ movement: { flankMP: 6 } })],
    ['flankMP', vehicle({ movement: { cruiseMP: 4 } })],
    ['armor.byLocation', vehicle({ armor: { type: 'STANDARD' } })],
    ['safeThrust', fighter({ movement: { maxThrust: 9 } })],
    ['maxThrust', fighter({ movement: { safeThrust: 6 } })],
    ['armor.byArc', fighter({ armor: { type: 'STANDARD' } })],
  ])('rejects absent %s', (fact, unit) => {
    expect(() => contractUnitToBVUnit(unit)).toThrow(fact);
  });

  it.each(['Vehicle', 'VTOL', 'Support Vehicle'])(
    'preserves explicit ground zeros and empty armor for %s',
    (unitType) => {
      const adapted = contractUnitToBVUnit(
        vehicle({
          unitType,
          movement: { cruiseMP: 0, flankMP: 0 },
          armor: { type: 'STANDARD', byLocation: {} },
        }),
      ) as IContractBVVehicle;
      expect(adapted.movement).toEqual({ cruiseMP: 0, flankMP: 0, jumpMP: 0 });
      expect(adapted.totalArmorPoints).toBe(0);
      expect(adapted.armorByLocation).toEqual({});
    },
  );

  it.each(['Aerospace', 'Conventional Fighter', 'Small Craft'])(
    'preserves explicit thrust zeros and empty armor for %s',
    (unitType) => {
      const adapted = contractUnitToBVUnit(
        fighter({
          unitType,
          movement: { safeThrust: 0, maxThrust: 0 },
          armor: { type: 'STANDARD', byArc: {} },
        }),
      ) as IContractBVAerospace;
      expect(adapted.movement).toEqual({ safeThrust: 0, maxThrust: 0 });
      expect(adapted.totalArmorPoints).toBe(0);
    },
  );
});

describe('contractUnitToBVUnit (aerospace)', () => {
  it.each([
    ['FixedWingSupport', true],
    ['ConventionalFighter', false],
    [undefined, false],
  ] as const)(
    'preserves the support-aircraft fact for %s',
    (subType, expected) => {
      const unit = contractUnitToBVUnit(
        fighter({ unitType: 'Conventional Fighter', subType }),
      ) as IContractBVAerospace;
      expect(unit.isSupportVehicle).toBe(expected);
    },
  );

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
