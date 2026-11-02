import { isDirectFireBVWeapon } from '../../battleValueWeapons';

// Characterize the unchanged Mech classifier before reusing its owning rule.
describe('shared direct-fire BV classification', () => {
  it.each<[string, boolean]>([
    ['ppc', true],
    ['clan-heavy-medium-laser', true],
    ['rac-5', true],
    ['lrm-10', false],
    ['atm-9', false],
    ['machine-gun', false],
    ['flamer', false],
    ['arrow-iv-launcher', false],
    ['tag', false],
  ])('%s direct-fire flag is %s', (id, expected) => {
    expect(isDirectFireBVWeapon(id)).toBe(expected);
  });
});

import { GroundMotionType as Motion } from '@/types/unit/BaseUnitInterfaces';

import { calculateVehicleBV, calculateVehicleOffensiveBV } from '../vehicleBV';
import {
  calculateVehicleSpeedFactor,
  calculateVehicleBVDefensiveTMM,
} from '../vehicleBVMovement';
import { baseInput } from './vehicleBV.test.helpers';

// Native source excerpts and expected terms: pins and hashes in part2/SOURCE-NOTES.md.
const gun = (count = 1) =>
  Array.from({ length: count }, () => ({
    id: 'machine-gun',
    location: 'Turret',
  }));
const jets = (count: number) =>
  Array.from({ length: count }, () => 'vehiclejumpjet');
describe('vehicle code-side residuals', () => {
  it('Hanse MBT boosted run also reaches defensive TMM 3', () => {
    expect(
      calculateVehicleBVDefensiveTMM(
        baseInput({
          cruiseMP: 4,
          flankMP: 6,
          chassisEquipment: ['supercharger'],
        }),
      ),
    ).toBe(3);
  });
  it('Sherpa MASH recovers its Java total 141 without fire control', () => {
    const b = calculateVehicleBV(
      baseInput({
        isSupportVehicle: true,
        tonnage: 35,
        totalArmorPoints: 31,
        totalStructurePoints: 20,
        barRating: 10,
        weapons: gun(),
        ammo: [{ id: 'is-ammo-mg-full', location: 'Body' }],
      }),
    );
    expect(b.weaponBV).toBe(4);
    expect(b.ammoBV).toBeCloseTo(0.8, 12);
    expect(b.offensive).toBeCloseTo(24.976, 12);
    expect(b.final).toBe(141);
  });
  it('Chi-Ha Original recovers its Java total 115 with basic fire control', () => {
    const b = calculateVehicleBV(
      baseInput({
        isSupportVehicle: true,
        tonnage: 22,
        cruiseMP: 3,
        flankMP: 5,
        totalArmorPoints: 48,
        totalStructurePoints: 15,
        barRating: 5,
        chassisEquipment: ['basic-fire-control'],
        weapons: gun(3),
        ammo: [{ id: 'is-ammo-mg-full', location: 'Body' }],
      }),
    );
    expect(b.weaponBV).toBe(13.5);
    expect(b.ammoBV).toBeCloseTo(0.9, 12);
    expect(b.offensive).toBeCloseTo(25.4, 12);
    expect(b.final).toBe(115);
  });
  it.each<[string[], number, number]>([
    [[], 56, 7.2],
    [['basic-fire-control'], 63, 8.1],
    [['advanced-fire-control'], 70, 9],
    [['advanced-fire-control', 'basic-fire-control'], 63, 8.1],
  ])(
    'support FCS %s scales weapons and capped ammo',
    (equipment, weapons, ammo) => {
      const b = calculateVehicleOffensiveBV(
        baseInput({
          isSupportVehicle: true,
          chassisEquipment: equipment,
          weapons: [{ id: 'ac-5', location: 'Front' }],
          ammo: [{ id: 'is-ammo-ac-5', location: 'Body' }],
        }),
      );
      expect(b.weaponBV).toBeCloseTo(weapons, 12);
      expect(b.ammoBV).toBeCloseTo(ammo, 12);
    },
  );
  it('support ammo scaling follows the listed-weapon excessive cap', () => {
    const b = calculateVehicleOffensiveBV(
      baseInput({
        isSupportVehicle: true,
        weapons: [{ id: 'ac-5', location: 'Front', bvOverride: 4 }],
        ammo: [{ id: 'is-ammo-ac-5', location: 'Body' }],
      }),
    );
    expect(b.ammoBV).toBeCloseTo(3.2, 12);
  });
  it('TC direct fire takes precedence over support FCS; infantry skips FCS', () => {
    const b = calculateVehicleOffensiveBV(
      baseInput({
        isSupportVehicle: true,
        chassisEquipment: ['targeting-computer'],
        weapons: [
          { id: 'ac-5', location: 'Front' },
          { id: 'lrm-10', location: 'Front' },
          {
            id: 'infantry-test',
            location: 'Front',
            isInfantry: true,
            bvOverride: 10,
          },
        ],
        ammo: [{ id: 'is-ammo-ac-5', location: 'Body' }],
      }),
    );
    expect(b.weaponBV).toBe(172);
    expect(b.ammoBV).toBeCloseTo(7.2, 12);
    expect(
      calculateVehicleOffensiveBV(
        baseInput({
          isSupportVehicle: true,
          weapons: [
            {
              id: 'infantry-test',
              location: 'Front',
              isInfantry: true,
              bvOverride: 10,
            },
          ],
        }),
      ).weaponBV,
    ).toBe(10);
  });
  it('Badger H transports its installed Clan TC and excludes Streak SRMs', () => {
    const b = calculateVehicleOffensiveBV(
      baseInput({
        chassisEquipment: ['cltargeting-computer:omni'],
        weapons: [
          { id: 'clheavymediumlaser:omni', location: 'Turret' },
          { id: 'clstreaksrm2:omni', location: 'Turret' },
        ],
      }),
    );
    expect(b.weaponBV).toBe(135);
  });
  it.each<[Motion, number, number, string[], number]>([
    [Motion.HOVER, 10, 15, jets(7), 2.86],
    [Motion.HOVER, 9, 14, jets(8), 2.72],
    [Motion.HOVER, 8, 12, jets(6), 2.3],
    [Motion.TRACKED, 3, 5, ['supercharger'], 1.12],
    [Motion.TRACKED, 7, 11, ['supercharger:omni'], 2.16],
    [Motion.VTOL, 8, 12, ['isvtoljetbooster'], 2.44],
    [Motion.WHEELED, 0, 0, [], 0.54],
    [Motion.RAIL, 0, 0, [], 0.54],
    [Motion.RAIL, 12, 18, [], 1.89],
    [Motion.MAGLEV, 12, 18, [], 1.89],
    [Motion.NAVAL, 6, 9, ['hydrofoilchassismod'], 1.89],
    [Motion.WHEELED, 2, 3, ['issvdunebuggychassis'], 0.65],
  ])(
    'assembles %s cruise %s / supplied flank %s with %s',
    (motionType, cruiseMP, flankMP, chassisEquipment, expected) => {
      expect(
        calculateVehicleSpeedFactor(
          baseInput({ motionType, cruiseMP, flankMP, chassisEquipment }),
        ),
      ).toBe(expected);
    },
  );
});

// BVCalculator.processWeapon applies TC/FCS only inside its WeaponType branch.
it.each<[string[]]>([[[]], [['istargeting-computer']]])(
  'Hesiod combine keeps misc BV with %s',
  (equipment) => {
    const b = calculateVehicleOffensiveBV(
      baseInput({
        isSupportVehicle: true,
        chassisEquipment: equipment,
        weapons: [{ id: 'combine:omni', location: 'Front' }],
      }),
    );
    expect(b.weaponBV).toBe(5);
  },
);
