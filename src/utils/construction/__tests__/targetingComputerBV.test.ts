import { calculateOffensiveBVWithHeatTracking } from '../battleValueHeatTracking';
import { calculateOffensiveBV } from '../battleValueWeapons';
import { baseInput } from '../vehicle/__tests__/vehicleBV.test.helpers';
import { calculateVehicleOffensiveBV } from '../vehicle/vehicleBV';

describe('existing targeting-computer contracts', () => {
  it('preserves the legacy public missile guards and rear ordering', () => {
    expect(
      calculateOffensiveBV(
        [{ id: 'medium-laser', rear: true }, { id: 'lrm-10' }],
        true,
      ),
    ).toBe(118.75);
  });

  it('preserves the legacy public machine-gun boost', () => {
    expect(calculateOffensiveBV([{ id: 'machine-gun' }], true)).toBe(6.25);
  });

  it('applies the typed direct-fire flag before the heat cutoff', () => {
    const result = calculateOffensiveBVWithHeatTracking({
      weapons: [
        { id: 'ppc', name: 'PPC', bv: 176, heat: 10, isDirectFire: true },
        {
          id: 'medium-laser',
          name: 'Medium Laser',
          bv: 46,
          heat: 3,
          isDirectFire: true,
        },
        {
          id: 'machine-gun',
          name: 'Machine Gun',
          bv: 5,
          heat: 0,
          isDirectFire: false,
        },
      ],
      tonnage: 50,
      heatDissipation: 4,
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      hasTargetingComputer: true,
    });
    expect(result.weaponBV).toBe(253.75);
  });

  it('keeps vehicle TC precedence over support fire control', () => {
    const result = calculateVehicleOffensiveBV(
      baseInput({
        isSupportVehicle: true,
        chassisEquipment: ['istargeting-computer', 'basic-fire-control'],
        weapons: [{ id: 'medium-laser', location: 'Front' }],
      }),
    );
    expect(result.weaponBV).toBe(57.5);
  });
});
