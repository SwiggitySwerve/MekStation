/**
 * Targeting Computer Equipment Utilities
 * 
 * Functions for creating and managing targeting computer equipment.
 * Weight and slots are variable based on direct fire weapon tonnage.
 */

import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import { IMountedEquipmentInstance } from '@/stores/unitState';
import { generateUnitId } from '@/utils/uuid';
import { getEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { equipmentCalculatorService, VARIABLE_EQUIPMENT } from '@/services/equipment/EquipmentCalculatorService';
import { IElectronics, ElectronicsCategory } from '@/types/equipment/ElectronicsTypes';
import { TARGETING_COMPUTER_IDS } from './equipmentConstants';

export const TARGETING_COMPUTER_EQUIPMENT_IDS = TARGETING_COMPUTER_IDS;

const TARGETING_COMPUTER_FALLBACKS: Record<string, IElectronics> = {
  'targeting-computer': {
    id: 'targeting-computer',
    name: 'Targeting Computer',
    category: ElectronicsCategory.TARGETING,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0,
    criticalSlots: 0,
    costCBills: 0,
    battleValue: 0,
    introductionYear: 3062,
    variableEquipmentId: 'targeting-computer-is',
  },
  'clan-targeting-computer': {
    id: 'clan-targeting-computer',
    name: 'Targeting Computer (Clan)',
    category: ElectronicsCategory.TARGETING,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0,
    criticalSlots: 0,
    costCBills: 0,
    battleValue: 0,
    introductionYear: 2860,
    variableEquipmentId: 'targeting-computer-clan',
  },
};

export function getTargetingComputerEquipment(techBase: TechBase): IElectronics | undefined {
  const id = techBase === TechBase.CLAN ? 'clan-targeting-computer' : 'targeting-computer';
  
  const loader = getEquipmentLoader();
  if (loader.getIsLoaded()) {
    const loaded = loader.getElectronicsById(id);
    if (loaded) return loaded;
  }
  
  return TARGETING_COMPUTER_FALLBACKS[id];
}

export function getTargetingComputerFormulaId(techBase: TechBase): string {
  return techBase === TechBase.CLAN 
    ? VARIABLE_EQUIPMENT.TARGETING_COMPUTER_CLAN 
    : VARIABLE_EQUIPMENT.TARGETING_COMPUTER_IS;
}

/**
 * Calculate targeting computer weight.
 * Formula:
 * - IS: ceil(directFireWeaponTonnage / 4)
 * - Clan: ceil(directFireWeaponTonnage / 5)
 */
export function calculateTargetingComputerWeight(
  directFireWeaponTonnage: number,
  techBase: TechBase
): number {
  if (directFireWeaponTonnage <= 0) return 0;
  
  const formulaId = getTargetingComputerFormulaId(techBase);
  const result = equipmentCalculatorService.calculateProperties(formulaId, { directFireWeaponTonnage });
  return Math.max(1, result.weight);
}

/**
 * Calculate targeting computer critical slots.
 * Slots = weight (1 slot per ton)
 */
export function calculateTargetingComputerSlots(
  directFireWeaponTonnage: number,
  techBase: TechBase
): number {
  if (directFireWeaponTonnage <= 0) return 0;
  
  const formulaId = getTargetingComputerFormulaId(techBase);
  const result = equipmentCalculatorService.calculateProperties(formulaId, { directFireWeaponTonnage });
  return Math.max(1, result.criticalSlots);
}

/**
 * Calculate targeting computer cost.
 * Cost = weight × 10,000 C-Bills
 */
export function calculateTargetingComputerCost(
  directFireWeaponTonnage: number,
  techBase: TechBase
): number {
  if (directFireWeaponTonnage <= 0) return 0;
  
  const formulaId = getTargetingComputerFormulaId(techBase);
  const result = equipmentCalculatorService.calculateProperties(formulaId, { directFireWeaponTonnage });
  return result.costCBills;
}

export function createTargetingComputerEquipmentList(
  techBase: TechBase,
  directFireWeaponTonnage: number
): IMountedEquipmentInstance[] {
  if (directFireWeaponTonnage <= 0) return [];
  
  const tcEquip = getTargetingComputerEquipment(techBase);
  if (!tcEquip) return [];
  
  const weight = calculateTargetingComputerWeight(directFireWeaponTonnage, techBase);
  const slots = calculateTargetingComputerSlots(directFireWeaponTonnage, techBase);
  
  return [{
    instanceId: generateUnitId(),
    equipmentId: tcEquip.id,
    name: tcEquip.name,
    category: EquipmentCategory.ELECTRONICS,
    weight,
    criticalSlots: slots,
    heat: 0,
    techBase: tcEquip.techBase,
    location: undefined,
    slots: undefined,
    isRearMounted: false,
    linkedAmmoId: undefined,
    isRemovable: true,
    isOmniPodMounted: false,
  }];
}

export function filterOutTargetingComputer(
  equipment: readonly IMountedEquipmentInstance[]
): IMountedEquipmentInstance[] {
  return equipment.filter(e => !TARGETING_COMPUTER_IDS.includes(e.equipmentId));
}
