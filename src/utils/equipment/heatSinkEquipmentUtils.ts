/**
 * Heat Sink Equipment Utilities
 *
 * Functions for creating and managing heat sink equipment.
 * All created items are configuration-based (isRemovable: false).
 */

import { getEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import {
  MiscEquipmentCategory,
  IMiscEquipment,
} from '@/types/equipment/MiscEquipmentTypes';
import { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';
import { generateUnitId } from '@/utils/uuid';

import { HEAT_SINK_EQUIPMENT_IDS } from './equipmentConstants';

const HEAT_SINK_FALLBACKS: Record<string, IMiscEquipment> = {
  'single-heat-sink': {
    id: 'single-heat-sink',
    name: 'Single Heat Sink',
    category: MiscEquipmentCategory.HEAT_SINK,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    weight: 1.0,
    criticalSlots: 1,
    costCBills: 2000,
    battleValue: 0,
    introductionYear: 2022,
  },
  'double-heat-sink': {
    id: 'double-heat-sink',
    name: 'Double Heat Sink',
    category: MiscEquipmentCategory.HEAT_SINK,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 1.0,
    criticalSlots: 3,
    costCBills: 6000,
    battleValue: 0,
    introductionYear: 2567,
  },
  'clan-double-heat-sink': {
    id: 'clan-double-heat-sink',
    name: 'Double Heat Sink (Clan)',
    category: MiscEquipmentCategory.HEAT_SINK,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    weight: 1.0,
    criticalSlots: 2,
    costCBills: 6000,
    battleValue: 0,
    introductionYear: 2567,
  },
  'compact-heat-sink': {
    id: 'compact-heat-sink',
    name: 'Compact Heat Sink',
    category: MiscEquipmentCategory.HEAT_SINK,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.EXPERIMENTAL,
    weight: 1.5,
    criticalSlots: 1,
    costCBills: 3000,
    battleValue: 0,
    introductionYear: 3058,
  },
  'laser-heat-sink': {
    id: 'laser-heat-sink',
    name: 'Laser Heat Sink',
    category: MiscEquipmentCategory.HEAT_SINK,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.EXPERIMENTAL,
    weight: 1.0,
    criticalSlots: 2,
    costCBills: 6000,
    battleValue: 0,
    introductionYear: 3067,
  },
};

export function getHeatSinkEquipmentId(heatSinkType: HeatSinkType): string {
  switch (heatSinkType) {
    case HeatSinkType.SINGLE:
      return 'single-heat-sink';
    case HeatSinkType.DOUBLE_IS:
      return 'double-heat-sink';
    case HeatSinkType.DOUBLE_CLAN:
      return 'clan-double-heat-sink';
    case HeatSinkType.COMPACT:
      return 'compact-heat-sink';
    case HeatSinkType.LASER:
      return 'laser-heat-sink';
    default:
      return 'single-heat-sink';
  }
}

export function getHeatSinkEquipment(
  heatSinkType: HeatSinkType,
): IMiscEquipment | undefined {
  const id = getHeatSinkEquipmentId(heatSinkType);

  const loader = getEquipmentLoader();
  if (loader.getIsLoaded()) {
    const loaded = loader.getMiscEquipmentById(id);
    if (loaded) return loaded;
  }

  return HEAT_SINK_FALLBACKS[id];
}

export function createHeatSinkEquipmentList(
  heatSinkType: HeatSinkType,
  externalCount: number,
): IMountedEquipmentInstance[] {
  if (externalCount <= 0) return [];

  const hsEquip = getHeatSinkEquipment(heatSinkType);
  if (!hsEquip) return [];

  const result: IMountedEquipmentInstance[] = [];
  for (let i = 0; i < externalCount; i++) {
    result.push({
      instanceId: generateUnitId(),
      equipmentId: hsEquip.id,
      name: hsEquip.name,
      category: EquipmentCategory.MISC_EQUIPMENT,
      weight: hsEquip.weight,
      criticalSlots: hsEquip.criticalSlots,
      heat: 0,
      techBase: hsEquip.techBase,
      location: undefined,
      slots: undefined,
      isRearMounted: false,
      linkedAmmoId: undefined,
      isRemovable: false,
      isOmniPodMounted: false,
    });
  }
  return result;
}

export function filterOutHeatSinks(
  equipment: readonly IMountedEquipmentInstance[],
): IMountedEquipmentInstance[] {
  return equipment.filter(
    (e) => !HEAT_SINK_EQUIPMENT_IDS.includes(e.equipmentId),
  );
}
