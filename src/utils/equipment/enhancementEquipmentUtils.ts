/**
 * Movement Enhancement Equipment Utilities
 *
 * Functions for creating and managing MASC, Supercharger, and TSM equipment.
 * All created items are configuration-based (isRemovable: false).
 */

import {
  equipmentCalculatorService,
  VARIABLE_EQUIPMENT,
} from '@/services/equipment/EquipmentCalculatorService';
import { getEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';
import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import {
  MiscEquipmentCategory,
  IMiscEquipment,
} from '@/types/equipment/MiscEquipmentTypes';
import { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';
import { generateUnitId } from '@/utils/uuid';

import { ENHANCEMENT_EQUIPMENT_IDS } from './equipmentConstants';

const ENHANCEMENT_FALLBACKS: Record<string, IMiscEquipment> = {
  masc: {
    id: 'masc',
    name: 'MASC',
    category: MiscEquipmentCategory.MOVEMENT,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0,
    criticalSlots: 0,
    costCBills: 0,
    battleValue: 0,
    introductionYear: 2740,
    variableEquipmentId: 'masc-is',
  },
  'clan-masc': {
    id: 'clan-masc',
    name: 'MASC (Clan)',
    category: MiscEquipmentCategory.MOVEMENT,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0,
    criticalSlots: 0,
    costCBills: 0,
    battleValue: 0,
    introductionYear: 2827,
    variableEquipmentId: 'masc-clan',
  },
  supercharger: {
    id: 'supercharger',
    name: 'Supercharger',
    category: MiscEquipmentCategory.MOVEMENT,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 0,
    criticalSlots: 1,
    costCBills: 0,
    battleValue: 0,
    introductionYear: 3068,
    variableEquipmentId: 'supercharger',
  },
  tsm: {
    id: 'tsm',
    name: 'Triple Strength Myomer',
    category: MiscEquipmentCategory.MYOMER,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0,
    criticalSlots: 6,
    costCBills: 0,
    battleValue: 0,
    introductionYear: 3050,
    variableEquipmentId: 'tsm',
  },
};

export function getEnhancementEquipmentId(
  enhancementType: MovementEnhancementType,
  techBase: TechBase,
): string {
  switch (enhancementType) {
    case MovementEnhancementType.MASC:
      return techBase === TechBase.CLAN ? 'clan-masc' : 'masc';
    case MovementEnhancementType.SUPERCHARGER:
      return 'supercharger';
    case MovementEnhancementType.TSM:
      return 'tsm';
    default:
      return 'masc';
  }
}

export function getEnhancementEquipment(
  enhancementType: MovementEnhancementType,
  techBase: TechBase,
): IMiscEquipment | undefined {
  const id = getEnhancementEquipmentId(enhancementType, techBase);

  const loader = getEquipmentLoader();
  if (loader.getIsLoaded()) {
    const loaded = loader.getMiscEquipmentById(id);
    if (loaded) return loaded;
  }

  return ENHANCEMENT_FALLBACKS[id];
}

/**
 * Calculate enhancement weight based on type and mech parameters.
 * Uses EquipmentCalculatorService with correct formulas:
 * - MASC (IS): tonnage / 20, rounded to nearest whole ton
 * - MASC (Clan): tonnage / 25, rounded to nearest whole ton
 * - Supercharger: engineWeight × 10%, rounded up to 0.5t
 * - TSM: 0
 */
export function calculateEnhancementWeight(
  enhancementType: MovementEnhancementType,
  tonnage: number,
  techBase: TechBase,
  engineWeight: number,
): number {
  if (enhancementType === MovementEnhancementType.MASC) {
    const equipId =
      techBase === TechBase.CLAN
        ? VARIABLE_EQUIPMENT.MASC_CLAN
        : VARIABLE_EQUIPMENT.MASC_IS;
    const result = equipmentCalculatorService.calculateProperties(equipId, {
      tonnage,
    });
    return result.weight;
  }

  if (enhancementType === MovementEnhancementType.SUPERCHARGER) {
    const result = equipmentCalculatorService.calculateProperties(
      VARIABLE_EQUIPMENT.SUPERCHARGER,
      { engineWeight },
    );
    return result.weight;
  }

  if (enhancementType === MovementEnhancementType.TSM) {
    const result = equipmentCalculatorService.calculateProperties(
      VARIABLE_EQUIPMENT.TSM,
      { tonnage },
    );
    return result.weight;
  }

  if (enhancementType === MovementEnhancementType.PARTIAL_WING) {
    const result = equipmentCalculatorService.calculateProperties(
      VARIABLE_EQUIPMENT.PARTIAL_WING,
      { tonnage },
    );
    return result.weight;
  }

  return 0;
}

/**
 * Calculate enhancement critical slots based on type and mech parameters.
 * Uses EquipmentCalculatorService with correct formulas:
 * - MASC (IS): tonnage / 20, rounded to nearest (same as weight)
 * - MASC (Clan): tonnage / 25, rounded to nearest (same as weight)
 * - Supercharger: 1 (fixed)
 * - TSM: 6 (distributed)
 */
export function calculateEnhancementSlots(
  enhancementType: MovementEnhancementType,
  tonnage: number,
  techBase: TechBase,
  _engineWeight: number,
): number {
  if (enhancementType === MovementEnhancementType.MASC) {
    const equipId =
      techBase === TechBase.CLAN
        ? VARIABLE_EQUIPMENT.MASC_CLAN
        : VARIABLE_EQUIPMENT.MASC_IS;
    const result = equipmentCalculatorService.calculateProperties(equipId, {
      tonnage,
    });
    return Math.ceil(result.criticalSlots);
  }

  if (enhancementType === MovementEnhancementType.SUPERCHARGER) {
    return 1;
  }

  if (enhancementType === MovementEnhancementType.TSM) {
    const result = equipmentCalculatorService.calculateProperties(
      VARIABLE_EQUIPMENT.TSM,
      { tonnage },
    );
    return result.criticalSlots;
  }

  if (enhancementType === MovementEnhancementType.PARTIAL_WING) {
    const result = equipmentCalculatorService.calculateProperties(
      VARIABLE_EQUIPMENT.PARTIAL_WING,
      { tonnage },
    );
    return result.criticalSlots;
  }

  return 0;
}

export function createEnhancementEquipmentList(
  enhancementType: MovementEnhancementType | null,
  tonnage: number,
  techBase: TechBase,
  engineWeight: number,
): IMountedEquipmentInstance[] {
  if (!enhancementType) return [];

  const equip = getEnhancementEquipment(enhancementType, techBase);
  if (!equip) return [];

  const weight = calculateEnhancementWeight(
    enhancementType,
    tonnage,
    techBase,
    engineWeight,
  );
  const slots = calculateEnhancementSlots(
    enhancementType,
    tonnage,
    techBase,
    engineWeight,
  );

  const category =
    equip.category === MiscEquipmentCategory.MYOMER
      ? EquipmentCategory.MISC_EQUIPMENT
      : EquipmentCategory.MOVEMENT;

  // TSM creates individual slots distributed across locations
  if (enhancementType === MovementEnhancementType.TSM) {
    const result: IMountedEquipmentInstance[] = [];
    for (let i = 0; i < slots; i++) {
      result.push({
        instanceId: generateUnitId(),
        equipmentId: equip.id,
        name: equip.name,
        category,
        weight: 0,
        criticalSlots: 1,
        heat: 0,
        techBase: equip.techBase,
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

  // MASC and Supercharger are single items
  return [
    {
      instanceId: generateUnitId(),
      equipmentId: equip.id,
      name: equip.name,
      category,
      weight,
      criticalSlots: slots,
      heat: 0,
      techBase: equip.techBase,
      location: undefined,
      slots: undefined,
      isRearMounted: false,
      linkedAmmoId: undefined,
      isRemovable: false,
      isOmniPodMounted: false,
    },
  ];
}

export function filterOutEnhancementEquipment(
  equipment: readonly IMountedEquipmentInstance[],
): IMountedEquipmentInstance[] {
  return equipment.filter(
    (e) => !ENHANCEMENT_EQUIPMENT_IDS.includes(e.equipmentId),
  );
}
