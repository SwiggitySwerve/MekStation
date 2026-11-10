import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory, type IEquipmentItem } from '@/types/equipment';

import { createNewUnitStore } from '../useUnitStore';

beforeEach(() => localStorage.clear());

// 48fcb2f64 MiscType.java:498-503,2248-2306. These four weight/critical
// vectors are also in the retained direct-Java WingSizingProbe results.
it.each([
  [50, TechBase.CLAN, TechBase.INNER_SPHERE, 2.5, 6],
  [100, TechBase.CLAN, TechBase.INNER_SPHERE, 5, 6],
  [50, TechBase.INNER_SPHERE, TechBase.CLAN, 3.5, 8],
  [100, TechBase.INNER_SPHERE, TechBase.CLAN, 7, 8],
] as const)(
  'manually adds a %st %s wing using equipment tech on a %s chassis',
  (tonnage, equipmentTech, chassisTech, weight, criticalSlots) => {
    const item: IEquipmentItem = {
      id:
        equipmentTech === TechBase.CLAN ? 'clan-partial-wing' : 'partial-wing',
      name: 'Partial Wing',
      category: EquipmentCategory.MOVEMENT,
      techBase: equipmentTech,
      rulesLevel: RulesLevel.ADVANCED,
      weight: 0,
      criticalSlots,
      costCBills: 0,
      battleValue: 0,
      introductionYear: 3067,
      variableEquipmentId: 'partial-wing',
    };
    const store = createNewUnitStore({
      name: 'Native partial wing store addition',
      tonnage,
      techBase: chassisTech,
    });
    const instanceId = store.getState().addEquipment(item);
    expect(
      store
        .getState()
        .equipment.find((mount) => mount.instanceId === instanceId),
    ).toMatchObject({
      equipmentId: item.id,
      techBase: equipmentTech,
      weight,
      criticalSlots,
    });
  },
);
