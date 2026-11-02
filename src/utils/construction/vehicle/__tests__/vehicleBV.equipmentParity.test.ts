import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { calculateBattleValueForUnit } from '../../battleValueCalculations';
import { getDefensiveEquipmentKind } from '../../battleValueEquipment';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '../../contractBVUnitAdapter';
import { calculateVehicleBV } from '../vehicleBV';
import { toVehicleBVInput } from '../vehicleBVAdapter';
import { baseInput } from './vehicleBV.test.helpers';

function calculate(
  ids: string[],
  mode: string,
  overrides: Partial<IContractBVSource> = {},
): ReturnType<typeof calculateVehicleBV> {
  const source: IContractBVSource = {
    id: 'partition-probe',
    unitType: 'Vehicle',
    tonnage: 30,
    motionType: 'Tracked',
    movement: { cruiseMP: 4, flankMP: 6 },
    armor: { type: 'STANDARD', byLocation: { FRONT: 0 } },
    equipment: ids.map((id) => ({ id, location: 'FRONT' })),
    ...overrides,
  };
  const unit = contractUnitToBVUnit(source);
  if (!('motionType' in unit)) throw new Error('Expected vehicle');
  if (mode === 'contract') {
    const result = calculateBattleValueForUnit(unit);
    if (result?.kind !== 'vehicle') throw new Error('Expected vehicle BV');
    return result.breakdown;
  }
  return calculateVehicleBV(
    toVehicleBVInput({
      unitType: unit.unitType,
      tonnage: unit.tonnage,
      cruiseMP: unit.movement.cruiseMP,
      motionType: GroundMotionType.TRACKED,
      armorType: 'standard',
      armorAllocation: {},
      structureType: 'standard',
      turret: { type: TurretType.NONE },
      secondaryTurret: null,
      barRating: null,
      equipment: unit.equipment,
    }),
  );
}

describe.each(['contract', 'store'])(
  '%s vehicle defensive equipment',
  (mode) => {
    it.each<[string, number]>([
      ['ISGuardianECMSuite', 61],
      ['CLActiveProbe', 12],
      ['ISAngelECMSuite', 100],
      ['ISAntiMissileSystem', 32],
      ['ISLaserAntiMissileSystem', 45],
      ['ISAPDS', 64],
      ['Bulldozer', 10],
      ['ISMineSweeper', 30],
      ['HeavyBridgeLayer', 20],
      ['ISChaffPod', 19],
      ['ISAntiPersonnelPod', 1],
      ['ISMPod', 5],
      ['ISBPod', 2],
      ['risc-viral-jammer-decoy', 284],
      ['risc-viral-jammer-homing', 284],
    ])('%s is defensive before type and TMM, never offensive', (id, bv) => {
      const b = calculate([id], mode);
      const control = calculate([], mode);
      expect(b.defensiveEquipmentBV).toBe(bv);
      expect(b.defensive - control.defensive).toBeCloseTo(bv * 0.9 * 1.2, 10);
      expect(b.weaponBV).toBe(0);
      expect(b.offensive).toBe(control.offensive);
    });
    it('preserves duplicate mounts and caps defensive ammo without support FCS', () => {
      const b = calculate(
        [
          'ams',
          ...Array<string>(4).fill('ams-ammo'),
          'guardian-ecm',
          'guardian-ecm',
        ],
        mode,
        {
          unitType: UnitType.SUPPORT_VEHICLE,
          armor: { type: 'BAR', byLocation: { FRONT: 0 }, barRating: 10 },
        },
      );
      expect(b.defensiveEquipmentBV).toBe(64 + 122);
      expect(b.defensive).toBeCloseTo(
        (b.armorBV + b.structureBV + 186) * 1.08,
        10,
      );
      expect(b.weaponBV).toBe(0);
      expect(b.ammoBV).toBe(0);
      expect(calculate(['ams-ammo'], mode).defensiveEquipmentBV).toBe(0);
      expect(
        calculate(['laser-ams', 'ams-ammo'], mode).defensiveEquipmentBV,
      ).toBe(45);
    });
    it("Watchdog also supplies Java's separate seven offensive BV", () => {
      const b = calculate(['WatchdogECMSuite'], mode);
      expect(b.defensiveEquipmentBV).toBe(68);
      expect(b.weaponBV).toBe(0);
      expect(b.offensiveEquipmentBV).toBe(7);
    });
  },
);

it('Buffel VII Cargo recovers 333 with its 40-BV engineering defensive pool', () => {
  const b = calculate(
    [
      'machine-gun',
      'machine-gun',
      'machine-gun',
      'Bulldozer',
      'ISMineSweeper',
      'is-ammo-mg-full',
    ],
    'contract',
    {
      unitType: 'Support Vehicle',
      tonnage: 70,
      movement: { cruiseMP: 3, flankMP: 5 },
      armor: {
        type: 'BAR',
        byLocation: { FRONT: 20, LEFT: 20, RIGHT: 20, REAR: 24, TURRET: 14 },
        barRating: 7,
      },
    },
  );
  expect(b.defensiveEquipmentBV).toBe(40);
  expect(b.weaponBV).toBe(12);
  expect(b.final).toBe(333);
});

it.each([
  'harjel-repair-systems-harjel-ii',
  'harjel-repair-systems-harjel-iii',
  'smallshield',
  'mass',
  'spikes',
])('%s has the represented native defensive flag', (id) => {
  expect(getDefensiveEquipmentKind(id)).toBe('equipment');
});
it.each(['blue-shield-particle-field-damper', 'harjel', 'unresolved-ecm'])(
  '%s is not inferred defensive from its name',
  (id) => {
    expect(getDefensiveEquipmentKind(id)).toBeUndefined();
  },
);
// MiscType.java:1373-1386: only a VTOL rotor sensor with a rotor mast gains 10.
it.each([
  [GroundMotionType.VTOL, 'Rotor', 'Rotor', 'clactiveprobe', 22],
  [GroundMotionType.VTOL, 'Front', 'Rotor', 'clactiveprobe', 12],
  [GroundMotionType.TRACKED, 'Rotor', 'Rotor', 'clactiveprobe', 12],
  [GroundMotionType.VTOL, 'Rotor', '', 'clactiveprobe', 12],
  [GroundMotionType.VTOL, 'Rotor', 'Front', 'clactiveprobe', 12],
  [GroundMotionType.VTOL, 'Rotor', 'Rotor', 'ams', 32],
] as const)(
  'mast bonus: %s sensor at %s, installed %s',
  (motionType, location, mast, id, expected) => {
    const b = calculateVehicleBV(
      baseInput({
        motionType,
        armorEquipment: mast ? [{ id: 'mast-mount', location: mast }] : [],
        defensiveEquipment: [{ id, location }],
      }),
    );
    expect(b.defensiveEquipmentBV).toBe(expected);
  },
);
