import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import { calculateVehicleBV, calculateVehicleOffensiveBV } from '../vehicleBV';
import { baseInput } from './vehicleBV.test.helpers';

// Source excerpts: mm-data 50f7efef0c9f775b0258f8283525ed4f906e1985.
// Expected terms: VehicleProbe against MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587.
const mounts = (id: string, count = 1, location = 'Body') =>
  Array.from({ length: count }, () => ({ id, location }));

describe('vehicle ammunition source parity', () => {
  it.each<[string, string, number]>([
    ['rac-5', 'isrotaryac5-ammo', 31],
    ['heavy-gauss-rifle', 'isheavygauss-ammo', 43],
    ['ap-gauss-rifle', 'clapgaussrifle-ammo', 3],
    ['light-machine-gun', 'light-machine-gun-ammo-full', 1],
    ['atm-6', 'clan-ammo-atm-6-er', 26],
    ['iatm-9', 'clan-ammo-iatm-9-he', 54],
  ])('matches represented %s ammunition %s', (weapon, ammo, expected) => {
    expect(
      calculateVehicleOffensiveBV(
        baseInput({
          weapons: mounts(weapon),
          ammo: mounts(ammo),
        }),
      ).ammoBV,
    ).toBe(expected);
  });

  it.each([
    ['atm-6', 'clan-ammo-atm-9'],
    ['light-machine-gun', 'heavy-machine-gun-ammo-full'],
  ])('keeps incompatible %s / %s groups separate', (weapon, ammo) => {
    expect(
      calculateVehicleOffensiveBV(
        baseInput({ weapons: mounts(weapon), ammo: mounts(ammo) }),
      ).ammoBV,
    ).toBe(0);
  });

  it('vehicles/3058Uu/Alacorn Heavy Tank Mk VI.blk: native Gauss bins', () => {
    const result = calculateVehicleBV(
      baseInput({
        tonnage: 95,
        cruiseMP: 3,
        flankMP: 5,
        totalArmorPoints: 208,
        totalStructurePoints: 50,
        weapons: mounts('isgaussrifle', 3, 'Turret'),
        ammo: mounts('is-gauss-ammo', 5),
      }),
    );
    expect(result.weaponBV).toBe(960);
    expect(result.ammoBV).toBe(200);
    expect(result.offensive).toBe(1207.5);
    expect(result.final).toBe(1850);
  });

  it('vehicles/3039u/APC (Tracked MG).blk: full MG bin matches MG weapons', () => {
    const result = calculateVehicleBV(
      baseInput({
        tonnage: 10,
        cruiseMP: 6,
        flankMP: 9,
        totalArmorPoints: 40,
        totalStructurePoints: 5,
        weapons: mounts('machine-gun', 3, 'Turret'),
        ammo: mounts('is-ammo-mg-full'),
      }),
    );
    expect(result.ammoBV).toBe(1);
    expect(result.offensive).toBe(31.5);
    expect(result.final).toBe(157);
  });

  it('vehicles/3050U/Chaparral (ERML).blk: Arrow IV internal ammo name', () => {
    const result = calculateVehicleOffensiveBV(
      baseInput({
        tonnage: 50,
        weapons: [
          ...mounts('isarrowiv', 1, 'Front'),
          ...mounts('isermediumlaser', 2, 'Left'),
          { id: 'srm-6', location: 'Rear', isRearMounted: true },
        ],
        ammo: [...mounts('is-ammo-srm-6'), ...mounts('isarrowivammo', 3)],
      }),
    );
    expect(result.weaponBV).toBe(393.5);
    expect(result.ammoBV).toBe(97);
    expect(result.total).toBeCloseTo(577.36, 9);
  });

  it('vehicles/3058Uu/Bandit (C) Hovercraft E.blk: ATM variants share a rack', () => {
    const result = calculateVehicleBV(
      baseInput({
        motionType: GroundMotionType.HOVER,
        tonnage: 50,
        cruiseMP: 9,
        flankMP: 14,
        totalArmorPoints: 172,
        totalStructurePoints: 25,
        weapons: mounts('clatm9:omni', 1, 'Turret'),
        ammo: [
          'clan-ammo-atm-9:omni',
          'clan-ammo-atm-9-er:omni',
          'clan-ammo-atm-9-he:omni',
        ].flatMap((id) => mounts(id)),
      }),
    );
    expect(result.ammoBV).toBe(108);
    expect(result.offensive).toBeCloseTo(604.8, 9);
    expect(result.final).toBe(1063);
  });

  it('caps the combined LB-X slug/cluster pool at the unmodified weapon BV', () => {
    const result = calculateVehicleOffensiveBV(
      baseInput({
        weapons: [
          {
            id: 'lb-10-x-ac',
            location: 'Rear',
            isRearMounted: true,
            bvOverride: 25,
          },
        ],
        ammo: [
          { id: 'is-lb-10-x-ac-ammo', location: 'Body', bvOverride: 20 },
          { id: 'is-lb-10-x-cluster-ammo', location: 'Body', bvOverride: 20 },
        ],
      }),
    );
    expect(result.weaponBV).toBe(12.5);
    expect(result.ammoBV).toBe(25);
  });

  it('retains explicit caller-supplied ammo family and BV overrides', () => {
    const result = calculateVehicleOffensiveBV(
      baseInput({
        weapons: [{ id: 'custom-weapon', location: 'Front', bvOverride: 12 }],
        ammo: [
          {
            id: 'custom-bin',
            location: 'Body',
            bvOverride: 15,
            weaponTypeOverride: 'custom-weapon',
          },
        ],
      }),
    );
    expect(result.ammoBV).toBe(12);
  });
});
