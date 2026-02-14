/**
 * Jump Jet Equipment Utilities
 *
 * Functions for creating and managing jump jet equipment.
 * All created items are configuration-based (isRemovable: false).
 */

import { getEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import {
  MiscEquipmentCategory,
  IMiscEquipment,
} from '@/types/equipment/MiscEquipmentTypes';
import { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';
import { JumpJetType } from '@/utils/construction/movementCalculations';
import { generateUnitId } from '@/utils/uuid';

import { JUMP_JET_EQUIPMENT_IDS } from './equipmentConstants';

const JUMP_JET_FALLBACKS: Record<string, IMiscEquipment> = {
  'jump-jet-light': {
    id: 'jump-jet-light',
    name: 'Jump Jet (Light)',
    category: MiscEquipmentCategory.JUMP_JET,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0.5,
    criticalSlots: 1,
    costCBills: 200,
    battleValue: 0,
    introductionYear: 2471,
  },
  'jump-jet-medium': {
    id: 'jump-jet-medium',
    name: 'Jump Jet (Medium)',
    category: MiscEquipmentCategory.JUMP_JET,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 1.0,
    criticalSlots: 1,
    costCBills: 200,
    battleValue: 0,
    introductionYear: 2471,
  },
  'jump-jet-heavy': {
    id: 'jump-jet-heavy',
    name: 'Jump Jet (Heavy)',
    category: MiscEquipmentCategory.JUMP_JET,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 2.0,
    criticalSlots: 1,
    costCBills: 200,
    battleValue: 0,
    introductionYear: 2471,
  },
  'improved-jump-jet-light': {
    id: 'improved-jump-jet-light',
    name: 'Improved Jump Jet (Light)',
    category: MiscEquipmentCategory.JUMP_JET,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 1.0,
    criticalSlots: 2,
    costCBills: 500,
    battleValue: 0,
    introductionYear: 3069,
  },
  'improved-jump-jet-medium': {
    id: 'improved-jump-jet-medium',
    name: 'Improved Jump Jet (Medium)',
    category: MiscEquipmentCategory.JUMP_JET,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 2.0,
    criticalSlots: 2,
    costCBills: 500,
    battleValue: 0,
    introductionYear: 3069,
  },
  'improved-jump-jet-heavy': {
    id: 'improved-jump-jet-heavy',
    name: 'Improved Jump Jet (Heavy)',
    category: MiscEquipmentCategory.JUMP_JET,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 4.0,
    criticalSlots: 2,
    costCBills: 500,
    battleValue: 0,
    introductionYear: 3069,
  },
};

export function getJumpJetEquipmentId(
  tonnage: number,
  jumpJetType: JumpJetType,
): string {
  const isImproved = jumpJetType === JumpJetType.IMPROVED;
  const prefix = isImproved ? 'improved-jump-jet' : 'jump-jet';

  if (tonnage <= 55) return `${prefix}-light`;
  if (tonnage <= 85) return `${prefix}-medium`;
  return `${prefix}-heavy`;
}

export function getJumpJetEquipment(
  tonnage: number,
  jumpJetType: JumpJetType,
): IMiscEquipment | undefined {
  const id = getJumpJetEquipmentId(tonnage, jumpJetType);

  const loader = getEquipmentLoader();
  if (loader.getIsLoaded()) {
    const loaded = loader.getMiscEquipmentById(id);
    if (loaded) return loaded;
  }

  return JUMP_JET_FALLBACKS[id];
}

export function createJumpJetEquipmentList(
  tonnage: number,
  jumpMP: number,
  jumpJetType: JumpJetType,
): IMountedEquipmentInstance[] {
  if (jumpMP <= 0) return [];

  const jetEquip = getJumpJetEquipment(tonnage, jumpJetType);
  if (!jetEquip) return [];

  const result: IMountedEquipmentInstance[] = [];
  for (let i = 0; i < jumpMP; i++) {
    result.push({
      instanceId: generateUnitId(),
      equipmentId: jetEquip.id,
      name: jetEquip.name,
      category: EquipmentCategory.MOVEMENT,
      weight: jetEquip.weight,
      criticalSlots: jetEquip.criticalSlots,
      heat: 0,
      techBase: jetEquip.techBase,
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

export function filterOutJumpJets(
  equipment: readonly IMountedEquipmentInstance[],
): IMountedEquipmentInstance[] {
  return equipment.filter(
    (e) => !JUMP_JET_EQUIPMENT_IDS.includes(e.equipmentId),
  );
}
