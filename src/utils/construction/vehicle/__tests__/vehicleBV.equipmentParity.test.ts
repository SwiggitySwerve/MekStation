import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { getNativeAmmoBVGroup } from '../../battleValueAmmo';
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

// MegaMek 48fcb2f64 AmmoType.java:13376-13386 defines sensors as ammo;
// BVCalculator.java:1045-1086 caps it by the launcher's native type/rack pool.
describe.each(['contract', 'store'])(
  '%s C3 remote sensor ammunition',
  (mode) => {
    it.each([1, 3, 6])('classifies and caps %s native bins', (bins) => {
      const b = calculate(
        [
          'ISC3RemoteSensorLauncher',
          ...Array<string>(bins).fill('ISC3Sensors'),
        ],
        mode,
      );
      expect(b.weaponBV).toBe(30);
      expect(b.ammoBV).toBe(Math.min(bins * 6, 30));
      expect(b.offensiveEquipmentBV).toBe(0);
    });
    it('omits ammunition without its matching launcher', () => {
      const b = calculate(['ISC3Sensors'], mode);
      expect(b.ammoBV).toBe(0);
      expect(b.offensiveEquipmentBV).toBe(0);
    });
  },
);

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
    it('Watchdog is excluded from offensive equipment by its probe flag', () => {
      const b = calculate(['WatchdogECMSuite'], mode);
      expect(b.defensiveEquipmentBV).toBe(68);
      expect(b.weaponBV).toBe(0);
      expect(b.offensiveEquipmentBV).toBe(0);
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

// MegaMek 48fcb2f64 BVCalculator.java:690-699,835-887,1000-1031,1159-1188.
describe('part 4 native vehicle weapon rules', () => {
  it('links each Artemis to the first available compatible launcher in its location', () => {
    const b = calculate(
      ['lrm-15', 'ISArtemisIV', 'ISArtemisV', 'lrm-15'],
      'contract',
    );
    expect(b.weaponBV).toBeCloseTo(136 * 1.2 + 136 * 1.3, 10);
  });
  it('Artemis respects location, existing links and incompatible Streak launchers', () => {
    const b = calculate(['lrm-15', 'ISArtemisIV'], 'contract', {
      equipment: [
        { id: 'lrm-15', location: 'FRONT' },
        { id: 'ISArtemisIV', location: 'REAR' },
        { id: 'isstreaksrm2', location: 'REAR' },
      ],
    });
    expect(b.weaponBV).toBe(151);
  });
  it('standard Artemis-capable ammo aliases retain native type/rack and listed caps', () => {
    const b = calculate(
      [
        'lrm-15',
        'ISArtemisIV',
        ...Array<string>(10).fill('is-ammo-lrm-15-artemis-capable'),
      ],
      'contract',
    );
    expect(b.ammoBV).toBe(136);
  });
  it('Anhur BA rear weapons are halved even without a rear flag', () => {
    const b = calculateVehicleBV(
      baseInput({
        weapons: [
          { id: 'clermediumlaser', location: 'Front' },
          { id: 'clapgaussrifle', location: 'Front' },
          { id: 'clermediumlaser', location: 'Rear' },
          { id: 'clapgaussrifle', location: 'Rear' },
        ],
      }),
    );
    expect(b.weaponBV).toBe(193.5);
  });
  it('rear selection halves fixed side/front mounts, preserves turrets, and keeps ties front', () => {
    const b = calculateVehicleBV(
      baseInput({
        weapons: [
          { id: 'ac-5', location: 'Front' },
          { id: 'ppc', location: 'Rear' },
          { id: 'medium-laser', location: 'Left' },
          { id: 'ppc', location: 'Turret' },
        ],
      }),
    );
    expect(b.weaponBV).toBe(410);
  });
  it.each(['contract', 'store'])(
    '%s moves tools and mine dispensers to unscaled offensive equipment',
    (mode) => {
      const b = calculate(
        ['machine-gun', 'combine', 'isvehicularminedispenser'],
        mode,
        { unitType: 'Support Vehicle' },
      );
      expect(b.weaponBV).toBe(4);
      expect(b.offensiveEquipmentBV).toBe(13);
    },
  );
  it('drone weapon reduction precedes summary adjustment and leaves weight unscaled', () => {
    const b = calculateVehicleBV(
      baseInput({
        tonnage: 40,
        cruiseMP: 9,
        flankMP: 14,
        chassisEquipment: ['ISDroneOperatingSystem'],
        weapons: [{ id: 'medium-laser', location: 'Front' }],
      }),
    );
    expect(b.weaponBV).toBeCloseTo(36.8, 10);
    expect(b.offensive).toBeCloseTo((36.8 + 20) * b.speedFactor, 10);
    expect(b.final).toBe(Math.round((b.defensive + b.offensive) * 0.95));
  });
});

// Java AmmoType/rack observations from the pinned part4 probe; independent of BV data.
it.each([
  ['light-auto-cannon-5', 'LAC:5'],
  ['cllightmg', 'MG_LIGHT:1'],
  ['issbgr', 'SBGAUSS:15'],
  ['ISLongTom', 'LONG_TOM:25'],
  ['ISLongTomCannonAmmo', 'LONG_TOM_CANNON:20'],
  ['ISThumperAmmo', 'THUMPER:15'],
  ['ISSniperCannonAmmo', 'SNIPER_CANNON:10'],
  ['IS Ammo MML-7 LRM', 'MML:7'],
  ['IS Ammo MML-7 SRM', 'MML:7'],
  ['ISStreakSRM2', 'SRM_STREAK:2'],
  ['CLHAG30', 'HAG:30'],
  ['ISVehicleFlamer', 'VEHICLE_FLAMER:2'],
  ['Clan Heavy Flamer Ammo', 'HEAVY_FLAMER:2'],
  ['IS Ammo LRTorpedo-10', 'LRM_TORPEDO:10'],
  ['IS Ammo SRM-6', 'SRM:6'],
  ['IS Ammo Thunderbolt-10', 'TBOLT_10:1'],
  ['IS Ammo HVAC/5', 'HYPER_VELOCITY:5'],
  ['CLAPGaussRifle Ammo', 'APGAUSS:0'],
  ['ISMagshotGR Ammo', 'MAGSHOT:0'],
  ['CLLargeChemLaserAmmo', 'CHEMICAL_LASER:1'],
  ['CLMediumChemLaserAmmo', 'CHEMICAL_LASER:5'],
  ['IS Machine Gun Ammo - Half', 'MG:2'],
  ['IS Ammo AC/20 Primitive', 'AC_PRIMITIVE:20'],
])('%s has native group %s', (id, expected) =>
  expect(getNativeAmmoBVGroup(id)).toBe(expected),
);

it('one-shot launchers do not supply external ammunition caps', () => {
  expect(
    calculateVehicleBV(
      baseInput({
        weapons: [{ id: 'srm-4-os', location: 'Front', bvOverride: 8 }],
        ammo: [{ id: 'IS Ammo SRM-4', location: 'Body', bvOverride: 12 }],
      }),
    ).ammoBV,
  ).toBe(0);
});
it('equal front/rear pools keep side weapons at full value', () => {
  expect(
    calculateVehicleBV(
      baseInput({
        weapons: [
          { id: 'ac-5', location: 'Front' },
          { id: 'ac-5', location: 'Rear' },
          { id: 'medium-laser', location: 'Left' },
        ],
      }),
    ).weaponBV,
  ).toBe(151);
});

it('native torpedo launchers retain Artemis compatibility', () => {
  expect(
    calculate(['lrtorpedo10', 'ISArtemisIV'], 'contract').weaponBV,
  ).toBeCloseTo(109 * 1.2, 10);
});

it('explicit ammo routing uses the same group contract as its represented launcher', () => {
  expect(
    calculateVehicleBV(
      baseInput({
        weapons: [{ id: 'srm-6', location: 'Front', bvOverride: 20 }],
        ammo: [
          {
            id: 'custom-bin',
            location: 'Body',
            bvOverride: 50,
            weaponTypeOverride: 'srm-6',
          },
        ],
      }),
    ).ammoBV,
  ).toBe(20);
});

it.each(['light', 'medium', 'heavy'])(
  '%s physical rifle bin retains its native group',
  (size) => {
    expect(
      calculateVehicleBV(
        baseInput({
          weapons: [
            { id: 'rifle-cannon,-' + size, location: 'Front', bvOverride: 20 },
          ],
          ammo: [
            {
              id: 'is-ammo-' + size + '-rifle',
              location: 'Body',
              bvOverride: 50,
            },
          ],
        }),
      ).ammoBV,
    ).toBe(20);
  },
);
