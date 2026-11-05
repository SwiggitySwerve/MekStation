import {
  calculatePhysicalWeaponSlots,
  calculatePhysicalWeaponWeight,
  PhysicalWeaponType,
} from '@/types/equipment/PhysicalWeaponTypes';

import { getEquipmentCalculatorService } from '../EquipmentCalculatorService';

// MegaMek 48fcb2f64, MiscType.java:512-517,1075-1083.
it.each([
  ['sword', PhysicalWeaponType.SWORD, 20, 1, 2],
  ['sword', PhysicalWeaponType.SWORD, 45, 2.5, 3],
  ['sword', PhysicalWeaponType.SWORD, 55, 3, 4],
  ['retractable-blade', PhysicalWeaponType.RETRACTABLE_BLADE, 20, 1.5, 2],
  ['retractable-blade', PhysicalWeaponType.RETRACTABLE_BLADE, 45, 3, 4],
  ['retractable-blade', PhysicalWeaponType.RETRACTABLE_BLADE, 55, 3.5, 4],
] as const)(
  '%s/%s at %d tons uses pinned mass and slots',
  (id, type, tonnage, weight, criticalSlots) => {
    expect(
      getEquipmentCalculatorService().calculateProperties(id, { tonnage }),
    ).toMatchObject({ weight, criticalSlots });
    expect(calculatePhysicalWeaponWeight(type, tonnage)).toBe(weight);
    expect(calculatePhysicalWeaponSlots(type, tonnage)).toBe(criticalSlots);
  },
);
