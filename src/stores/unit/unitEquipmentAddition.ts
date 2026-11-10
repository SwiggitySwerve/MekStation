import type { UnitState } from '@/stores/unitState';
import type { IEquipmentItem } from '@/types/equipment/EquipmentItem';

import {
  getEquipmentCalculatorService,
  VARIABLE_EQUIPMENT,
} from '@/services/equipment/EquipmentCalculatorService';
import {
  createMountedEquipment,
  type IMountedEquipmentInstance,
} from '@/types/equipment/MountedEquipment';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import {
  calculateTargetingComputerWeight,
  calculateTargetingComputerSlots,
} from '@/utils/equipment/equipmentListUtils';
import { calculateDirectFireWeaponTonnage } from '@/utils/equipment/weapons/utilities';

const TARGETING_COMPUTER_IDS = [
  'targeting-computer',
  'clan-targeting-computer',
];

type CalculationContext = Pick<UnitState, 'tonnage' | 'equipment'> &
  Partial<Pick<UnitState, 'configuration'>>;

export function createCalculatedEquipment(
  item: IEquipmentItem,
  instanceId: string,
  state: CalculationContext,
): IMountedEquipmentInstance {
  const mounted = createMountedEquipment(item, instanceId);
  if (!item.variableEquipmentId) return mounted;
  if (
    item.variableEquipmentId === VARIABLE_EQUIPMENT.TARGETING_COMPUTER_IS ||
    item.variableEquipmentId === VARIABLE_EQUIPMENT.TARGETING_COMPUTER_CLAN
  ) {
    const tonnage = calculateDirectFireWeaponTonnage(
      state.equipment.map((equipment) => equipment.equipmentId),
    );
    return {
      ...mounted,
      weight: calculateTargetingComputerWeight(tonnage, item.techBase),
      criticalSlots: calculateTargetingComputerSlots(tonnage, item.techBase),
    };
  }
  const properties = getEquipmentCalculatorService().calculateProperties(
    item.variableEquipmentId,
    {
      tonnage: state.tonnage,
      techBase: item.techBase,
      isQuad:
        state.configuration === MechConfiguration.QUAD ||
        state.configuration === MechConfiguration.QUADVEE,
    },
  );
  return {
    ...mounted,
    weight: properties.weight,
    criticalSlots: properties.criticalSlots,
  };
}

export function recalculateTargetingComputers(
  equipment: IMountedEquipmentInstance[],
): IMountedEquipmentInstance[] {
  const directFireTonnage = calculateDirectFireWeaponTonnage(
    equipment.map((item) => item.equipmentId),
  );
  return equipment.map((item) =>
    TARGETING_COMPUTER_IDS.includes(item.equipmentId)
      ? {
          ...item,
          weight: calculateTargetingComputerWeight(
            directFireTonnage,
            item.techBase,
          ),
          criticalSlots: calculateTargetingComputerSlots(
            directFireTonnage,
            item.techBase,
          ),
        }
      : item,
  );
}
