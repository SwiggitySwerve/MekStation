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
  ['flail', PhysicalWeaponType.FLAIL, 20, 5, 4],
  ['flail', PhysicalWeaponType.FLAIL, 100, 5, 4],
  ['wrecking-ball', PhysicalWeaponType.WRECKING_BALL, 20, 4, 5],
  ['wrecking-ball', PhysicalWeaponType.WRECKING_BALL, 100, 4, 5],
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

// MiscType.java:4017-4021,7869-7878: fixed tools have fixed construction cost.
it.each(['flail', 'wrecking-ball'])(
  '%s retains its fixed native cost',
  (id) => {
    expect(
      getEquipmentCalculatorService().calculateProperties(id, { tonnage: 75 })
        .costCBills,
    ).toBe(110000);
  },
);

// MiscType.java:688-689,1256-1258,4310-4316 (48fcb2f64).
it.each([
  [20, false, 2, 4],
  [60, false, 4, 4],
  [100, false, 7, 4],
  [20, true, 2, 8],
  [60, true, 4, 8],
  [100, true, 7, 8],
] as const)(
  'sizes one Talons mount at %d tons, quad=%s',
  (tonnage, isQuad, weight, criticalSlots) => {
    const context = { tonnage, isQuad };
    expect(
      getEquipmentCalculatorService().calculateProperties('talons', context),
    ).toMatchObject({ weight, criticalSlots });
    expect(
      calculatePhysicalWeaponWeight(PhysicalWeaponType.TALONS, tonnage),
    ).toBe(weight);
    expect(
      calculatePhysicalWeaponSlots(PhysicalWeaponType.TALONS, tonnage, isQuad),
    ).toBe(criticalSlots);
  },
);
