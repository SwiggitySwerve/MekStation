import { createCalculatedEquipment } from '@/stores/unit/unitEquipmentAddition';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import {
  calculatePhysicalWeaponSlots,
  calculatePhysicalWeaponWeight,
  PhysicalWeaponType,
} from '@/types/equipment/PhysicalWeaponTypes';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

import { getEquipmentCalculatorService } from '../EquipmentCalculatorService';
import {
  getVariableEquipmentFormulas,
  getVariableEquipmentIds,
} from '../variableEquipmentFormulas';

it('preserves registry enumeration and the shared Claw alias definition', () => {
  expect(getVariableEquipmentIds()).toEqual([
    'targeting-computer-is',
    'targeting-computer-clan',
    'masc-is',
    'masc-clan',
    'supercharger',
    'partial-wing',
    'tsm',
    'hatchet',
    'sword',
    'mace',
    'claw',
    'claws',
    'lance',
    'talons',
    'retractable-blade',
    'flail',
    'wrecking-ball',
  ]);
  expect(getVariableEquipmentFormulas('claw')).toBe(
    getVariableEquipmentFormulas('claws'),
  );
});

// Characterization before moving the physical formula ASTs to shared JSON.
it.each([
  ['hatchet', 45, 3, 3, 15000, 9],
  ['sword', 45, 2.5, 3, 25000, 5],
  ['mace', 45, 5, 5, 37500, 11],
  ['claw', 45, 3, 3, 9000, 6],
  ['claws', 45, 3, 3, 9000, 6],
  ['lance', 45, 3, 3, 45000, 10],
  ['talons', 45, 3, 4, 18000, 6],
  ['retractable-blade', 45, 3, 4, 30000, 4],
  ['flail', 45, 5, 4, 110000, 13],
  ['wrecking-ball', 45, 4, 5, 110000, 12],
  ['hatchet', 15, 1, 1, 5000, 3],
  ['hatchet', 16, 2, 2, 10000, 3],
  ['sword', 16, 1, 2, 10000, 2],
  ['mace', 105, 11, 11, 82500, 26],
  ['retractable-blade', 16, 1.5, 2, 15000, 1],
] as const)(
  'preserves %s construction and combat properties at %d tons',
  (id, tonnage, weight, criticalSlots, costCBills, damage) => {
    expect(
      getEquipmentCalculatorService().calculateProperties(id, { tonnage }),
    ).toMatchObject({ weight, criticalSlots, costCBills, damage });
  },
);

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

it.each([
  [MechConfiguration.BIPED, 4],
  [MechConfiguration.QUAD, 8],
  [MechConfiguration.QUADVEE, 8],
] as const)(
  'forwards chassis context when adding Talons to %s',
  (configuration, slots) => {
    const item = {
      id: 'talons',
      name: 'Talons',
      category: EquipmentCategory.PHYSICAL_WEAPON,
      techBase: TechBase.INNER_SPHERE,
      rulesLevel: RulesLevel.EXPERIMENTAL,
      weight: 0,
      criticalSlots: 0,
      costCBills: 0,
      battleValue: 0,
      introductionYear: 3072,
      variableEquipmentId: 'talons',
    };
    expect(
      createCalculatedEquipment(item, 'talons', {
        tonnage: 60,
        equipment: [],
        configuration,
      }),
    ).toMatchObject({ weight: 4, criticalSlots: slots });
  },
);
