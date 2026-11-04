import { EquipmentCategory as C } from '@/types/equipment';

import { getVehicleHeatNeutralWeaponHeat } from '../heatSinks';

// MegaMek 48fcb2f64a1b TestEntity.java:945-950. These are raw weapon heats,
// without BV's one-shot, rotary, ultra or streak adjustments.
it.each([
  [C.ENERGY_WEAPON, 'PPC', 10, undefined, 10],
  [C.ENERGY_WEAPON, 'Medium Laser', 3, undefined, 3],
  [C.ENERGY_WEAPON, 'Vehicle Flamer', 3, ['Requires ammo'], 0],
  [C.ENERGY_WEAPON, 'Chemical Laser', 6, ['Requires ammo'], 0],
  [C.ENERGY_WEAPON, 'Plasma Rifle', 10, ['Requires ammo'], 10],
  [C.BALLISTIC_WEAPON, 'AC/20', 7, undefined, 0],
  [C.MISSILE_WEAPON, 'LRM 20', 6, undefined, 0],
] as const)(
  '%s %s contributes %s raw heat',
  (category, name, heat, special, expected) => {
    expect(
      getVehicleHeatNeutralWeaponHeat({ category, name, heat, special }),
    ).toBe(expected);
  },
);
