/**
 * Equipment List Utilities
 * 
 * Functions for creating and managing equipment lists for BattleMech components.
 * These functions handle jump jets, internal structure, armor, heat sinks,
 * and movement enhancements.
 * 
 * All created equipment items are configuration-based (isRemovable: false)
 * and are managed through their respective configuration tabs, not the loadout tray.
 */

import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import { IMountedEquipmentInstance } from '@/stores/unitState';
import { generateUnitId } from '@/utils/uuid';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { ArmorTypeEnum, getArmorDefinition } from '@/types/construction/ArmorType';
import { 
  InternalStructureType, 
  getInternalStructureDefinition 
} from '@/types/construction/InternalStructureType';
import { JumpJetType } from '@/utils/construction/movementCalculations';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { MiscEquipmentCategory, IMiscEquipment } from '@/types/equipment/MiscEquipmentTypes';
import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import { getEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { equipmentCalculatorService, VARIABLE_EQUIPMENT } from '@/services/equipment/EquipmentCalculatorService';
import { IElectronics, ElectronicsCategory } from '@/types/equipment/ElectronicsTypes';

// =============================================================================
// Constants
// =============================================================================

/** Equipment ID prefix for internal structure slots */
export const INTERNAL_STRUCTURE_EQUIPMENT_ID = 'internal-structure-slot';

/** Equipment ID prefix for armor slots */
export const ARMOR_SLOTS_EQUIPMENT_ID = 'armor-slot';

/** Stealth armor locations (2 slots each in these 6 locations) */
export const STEALTH_ARMOR_LOCATIONS: MechLocation[] = [
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
];

/** Equipment IDs for movement enhancements */
export const ENHANCEMENT_EQUIPMENT_IDS = [
  'masc',
  'clan-masc',
  'supercharger',
  'tsm',
  'industrial-tsm',
];

/** Heat sink equipment IDs - hardcoded since these are essential for construction */
export const HEAT_SINK_EQUIPMENT_IDS = [
  'single-heat-sink',
  'double-heat-sink',
  'clan-double-heat-sink',
  'compact-heat-sink',
  'laser-heat-sink',
];

/** Jump jet equipment IDs - hardcoded since these are essential for construction */
export const JUMP_JET_EQUIPMENT_IDS = [
  'jump-jet-light',
  'jump-jet-medium',
  'jump-jet-heavy',
  'improved-jump-jet-light',
  'improved-jump-jet-medium',
  'improved-jump-jet-heavy',
];

/** Targeting computer equipment IDs - hardcoded since these are essential for construction */
export const TARGETING_COMPUTER_IDS = [
  'targeting-computer',
  'clan-targeting-computer',
];

// =============================================================================
// Jump Jet Equipment Helpers
// =============================================================================

/**
 * Get the correct jump jet equipment ID based on tonnage and jet type
 */
export function getJumpJetEquipmentId(tonnage: number, jumpJetType: JumpJetType): string {
  const isImproved = jumpJetType === JumpJetType.IMPROVED;
  const prefix = isImproved ? 'improved-jump-jet' : 'jump-jet';
  
  if (tonnage <= 55) return `${prefix}-light`;
  if (tonnage <= 85) return `${prefix}-medium`;
  return `${prefix}-heavy`;
}

/**
 * Fallback jump jet equipment definitions
 * Used when the equipment loader hasn't loaded JSON data yet
 */
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

/**
 * Get the jump jet equipment item for a given tonnage and type
 * Uses JSON-loaded equipment from EquipmentLoaderService with fallback definitions
 */
export function getJumpJetEquipment(tonnage: number, jumpJetType: JumpJetType): IMiscEquipment | undefined {
  const id = getJumpJetEquipmentId(tonnage, jumpJetType);
  
  // Try to get from the loader first (JSON data)
  const loader = getEquipmentLoader();
  if (loader.getIsLoaded()) {
    const loaded = loader.getMiscEquipmentById(id);
    if (loaded) return loaded;
  }
  
  // Fallback to hardcoded definitions for essential jump jet equipment
  return JUMP_JET_FALLBACKS[id];
}

/**
 * Create jump jet equipment instances for the equipment array
 * These are configuration-based components and NOT removable via the loadout tray.
 */
export function createJumpJetEquipmentList(
  tonnage: number,
  jumpMP: number,
  jumpJetType: JumpJetType
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

/**
 * Filter out jump jet equipment from the equipment array
 */
export function filterOutJumpJets(equipment: readonly IMountedEquipmentInstance[]): IMountedEquipmentInstance[] {
  return equipment.filter(e => !JUMP_JET_EQUIPMENT_IDS.includes(e.equipmentId));
}

// =============================================================================
// Internal Structure Equipment Helpers
// =============================================================================

/**
 * Create internal structure equipment items (e.g., Endo Steel slots)
 * Creates individual 1-slot items for each required critical slot.
 * These are configuration-based components and NOT removable via the loadout tray.
 */
export function createInternalStructureEquipmentList(
  structureType: InternalStructureType
): IMountedEquipmentInstance[] {
  const structureDef = getInternalStructureDefinition(structureType);
  if (!structureDef || structureDef.criticalSlots === 0) {
    return [];
  }
  
  const result: IMountedEquipmentInstance[] = [];
  const slotCount = structureDef.criticalSlots;
  
  for (let i = 0; i < slotCount; i++) {
    result.push({
      instanceId: generateUnitId(),
      equipmentId: `${INTERNAL_STRUCTURE_EQUIPMENT_ID}-${structureType}`,
      name: structureDef.name,
      category: EquipmentCategory.STRUCTURAL,
      weight: 0,
      criticalSlots: 1,
      heat: 0,
      techBase: structureDef.techBase,
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

/**
 * Filter out internal structure equipment from the equipment array
 */
export function filterOutInternalStructure(equipment: readonly IMountedEquipmentInstance[]): IMountedEquipmentInstance[] {
  return equipment.filter(e => !e.equipmentId.startsWith(INTERNAL_STRUCTURE_EQUIPMENT_ID));
}

// =============================================================================
// Armor Equipment Helpers
// =============================================================================

/**
 * Create armor equipment items (e.g., Ferro-Fibrous or Stealth slots)
 * Creates individual slot items for each required critical slot.
 * Stealth armor creates 6 × 2-slot items with pre-assigned locations.
 * Other armor types create individual 1-slot items.
 * These are configuration-based components and NOT removable via the loadout tray.
 */
export function createArmorEquipmentList(
  armorType: ArmorTypeEnum
): IMountedEquipmentInstance[] {
  const armorDef = getArmorDefinition(armorType);
  if (!armorDef || armorDef.criticalSlots === 0) {
    return [];
  }
  
  const result: IMountedEquipmentInstance[] = [];
  
  // Stealth armor: 6 × 2-slot items with fixed locations
  if (armorType === ArmorTypeEnum.STEALTH) {
    for (const location of STEALTH_ARMOR_LOCATIONS) {
      result.push({
        instanceId: generateUnitId(),
        equipmentId: `${ARMOR_SLOTS_EQUIPMENT_ID}-${armorType}`,
        name: 'Stealth',
        category: EquipmentCategory.STRUCTURAL,
        weight: 0,
        criticalSlots: 2,
        heat: 0,
        techBase: armorDef.techBase,
        location,
        slots: undefined,
        isRearMounted: false,
        linkedAmmoId: undefined,
        isRemovable: false,
        isOmniPodMounted: false,
      });
    }
    return result;
  }

  // Other armor types: individual 1-slot items
  const slotCount = armorDef.criticalSlots;
  for (let i = 0; i < slotCount; i++) {
    result.push({
      instanceId: generateUnitId(),
      equipmentId: `${ARMOR_SLOTS_EQUIPMENT_ID}-${armorType}`,
      name: armorDef.name,
      category: EquipmentCategory.STRUCTURAL,
      weight: 0,
      criticalSlots: 1,
      heat: 0,
      techBase: armorDef.techBase,
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

/**
 * Filter out armor slot equipment from the equipment array
 */
export function filterOutArmorSlots(equipment: readonly IMountedEquipmentInstance[]): IMountedEquipmentInstance[] {
  return equipment.filter(e => !e.equipmentId.startsWith(ARMOR_SLOTS_EQUIPMENT_ID));
}

// =============================================================================
// Heat Sink Equipment Helpers
// =============================================================================

/**
 * Get the heat sink equipment ID for a given HeatSinkType
 */
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

/**
 * Fallback heat sink equipment definitions
 * Used when the equipment loader hasn't loaded JSON data yet
 */
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

/**
 * Get the heat sink equipment item for a given HeatSinkType
 * Uses JSON-loaded equipment from EquipmentLoaderService with fallback definitions
 */
export function getHeatSinkEquipment(heatSinkType: HeatSinkType): IMiscEquipment | undefined {
  const id = getHeatSinkEquipmentId(heatSinkType);
  
  // Try to get from the loader first (JSON data)
  const loader = getEquipmentLoader();
  if (loader.getIsLoaded()) {
    const loaded = loader.getMiscEquipmentById(id);
    if (loaded) return loaded;
  }
  
  // Fallback to hardcoded definitions for essential heat sink equipment
  return HEAT_SINK_FALLBACKS[id];
}

/**
 * Create heat sink equipment instances for external heat sinks
 * External heat sinks are those that exceed the engine's integral capacity.
 * These are configuration-based components and NOT removable via the loadout tray.
 */
export function createHeatSinkEquipmentList(
  heatSinkType: HeatSinkType,
  externalCount: number
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

/**
 * Filter out heat sink equipment from the equipment array
 */
export function filterOutHeatSinks(equipment: readonly IMountedEquipmentInstance[]): IMountedEquipmentInstance[] {
  return equipment.filter(e => !HEAT_SINK_EQUIPMENT_IDS.includes(e.equipmentId));
}

// =============================================================================
// Movement Enhancement Equipment Helpers
// =============================================================================

/**
 * Get the correct enhancement equipment ID based on type and tech base
 */
export function getEnhancementEquipmentId(
  enhancementType: MovementEnhancementType,
  techBase: TechBase
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

/**
 * Fallback enhancement equipment definitions
 * Used when the equipment loader hasn't loaded JSON data yet
 */
const ENHANCEMENT_FALLBACKS: Record<string, IMiscEquipment> = {
  'masc': {
    id: 'masc',
    name: 'MASC',
    category: MiscEquipmentCategory.MOVEMENT,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0, // Variable based on tonnage
    criticalSlots: 0, // Variable based on tonnage
    costCBills: 0, // Variable based on tonnage
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
  'supercharger': {
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
  'tsm': {
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

/**
 * Get the enhancement equipment item by type and tech base
 * Uses JSON-loaded equipment from EquipmentLoaderService with fallback definitions
 */
export function getEnhancementEquipment(
  enhancementType: MovementEnhancementType,
  techBase: TechBase
): IMiscEquipment | undefined {
  const id = getEnhancementEquipmentId(enhancementType, techBase);
  
  // Try to get from the loader first (JSON data)
  const loader = getEquipmentLoader();
  if (loader.getIsLoaded()) {
    const loaded = loader.getMiscEquipmentById(id);
    if (loaded) return loaded;
  }
  
  // Fallback to hardcoded definitions for essential enhancement equipment
  return ENHANCEMENT_FALLBACKS[id];
}

/**
 * Calculate enhancement weight based on type and mech parameters
 * Uses EquipmentCalculatorService with correct formulas:
 * - MASC (IS): tonnage / 20, rounded to nearest whole ton (e.g., 85t → 4t, 90t → 5t)
 * - MASC (Clan): tonnage / 25, rounded to nearest whole ton
 * - Supercharger: engineWeight × 10%, rounded up to 0.5t
 * - TSM: 0
 */
export function calculateEnhancementWeight(
  enhancementType: MovementEnhancementType,
  tonnage: number,
  techBase: TechBase,
  engineWeight: number
): number {
  if (enhancementType === MovementEnhancementType.MASC) {
    const equipId = techBase === TechBase.CLAN ? VARIABLE_EQUIPMENT.MASC_CLAN : VARIABLE_EQUIPMENT.MASC_IS;
    const result = equipmentCalculatorService.calculateProperties(equipId, { tonnage });
    return result.weight;
  }
  
  if (enhancementType === MovementEnhancementType.SUPERCHARGER) {
    const result = equipmentCalculatorService.calculateProperties(VARIABLE_EQUIPMENT.SUPERCHARGER, { engineWeight });
    return result.weight;
  }
  
  if (enhancementType === MovementEnhancementType.TSM) {
    const result = equipmentCalculatorService.calculateProperties(VARIABLE_EQUIPMENT.TSM, { tonnage });
    return result.weight;
  }
  
  if (enhancementType === MovementEnhancementType.PARTIAL_WING) {
    const result = equipmentCalculatorService.calculateProperties(VARIABLE_EQUIPMENT.PARTIAL_WING, { tonnage });
    return result.weight;
  }
  
  return 0;
}

/**
 * Calculate enhancement critical slots based on type and mech parameters
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
  _engineWeight: number
): number {
  if (enhancementType === MovementEnhancementType.MASC) {
    const equipId = techBase === TechBase.CLAN ? VARIABLE_EQUIPMENT.MASC_CLAN : VARIABLE_EQUIPMENT.MASC_IS;
    const result = equipmentCalculatorService.calculateProperties(equipId, { tonnage });
    return Math.ceil(result.criticalSlots);
  }
  
  if (enhancementType === MovementEnhancementType.SUPERCHARGER) {
    return 1;
  }
  
  if (enhancementType === MovementEnhancementType.TSM) {
    const result = equipmentCalculatorService.calculateProperties(VARIABLE_EQUIPMENT.TSM, { tonnage });
    return result.criticalSlots;
  }
  
  if (enhancementType === MovementEnhancementType.PARTIAL_WING) {
    const result = equipmentCalculatorService.calculateProperties(VARIABLE_EQUIPMENT.PARTIAL_WING, { tonnage });
    return result.criticalSlots;
  }
  
  return 0;
}

/**
 * Create enhancement equipment instances for the equipment array
 * Creates a single item for MASC or TSM with calculated weight/slots.
 * These are configuration-based components and NOT removable via the loadout tray.
 * 
 * @param enhancementType - The type of enhancement (MASC, Supercharger, TSM)
 * @param tonnage - Mech tonnage (used for MASC and TSM calculations)
 * @param techBase - Tech base (IS or Clan, affects MASC formula)
 * @param engineWeight - Engine weight in tons (required for Supercharger weight)
 */
export function createEnhancementEquipmentList(
  enhancementType: MovementEnhancementType | null,
  tonnage: number,
  techBase: TechBase,
  engineWeight: number
): IMountedEquipmentInstance[] {
  if (!enhancementType) return [];
  
  const equip = getEnhancementEquipment(enhancementType, techBase);
  if (!equip) return [];
  
  const weight = calculateEnhancementWeight(enhancementType, tonnage, techBase, engineWeight);
  const slots = calculateEnhancementSlots(enhancementType, tonnage, techBase, engineWeight);
  
  // Map category to EquipmentCategory
  const category = equip.category === MiscEquipmentCategory.MYOMER
    ? EquipmentCategory.MISC_EQUIPMENT
    : EquipmentCategory.MOVEMENT;
  
  // For TSM, we need individual slots distributed across locations
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
  return [{
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
  }];
}

/**
 * Filter out enhancement equipment from the equipment array
 */
export function filterOutEnhancementEquipment(
  equipment: readonly IMountedEquipmentInstance[]
): IMountedEquipmentInstance[] {
  return equipment.filter(e => !ENHANCEMENT_EQUIPMENT_IDS.includes(e.equipmentId));
}

// =============================================================================
// Targeting Computer Equipment Helpers
// =============================================================================

/** Targeting computer equipment IDs */
export const TARGETING_COMPUTER_EQUIPMENT_IDS = TARGETING_COMPUTER_IDS;

/**
 * Fallback targeting computer equipment definitions
 * Used when the equipment loader hasn't loaded JSON data yet
 */
const TARGETING_COMPUTER_FALLBACKS: Record<string, IElectronics> = {
  'targeting-computer': {
    id: 'targeting-computer',
    name: 'Targeting Computer',
    category: ElectronicsCategory.TARGETING,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0, // Variable
    criticalSlots: 0, // Variable
    costCBills: 0, // Variable
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
    weight: 0, // Variable
    criticalSlots: 0, // Variable
    costCBills: 0, // Variable
    battleValue: 0,
    introductionYear: 2860,
    variableEquipmentId: 'targeting-computer-clan',
  },
};

/**
 * Get the correct targeting computer equipment based on tech base
 * Uses JSON-loaded equipment from EquipmentLoaderService with fallback definitions
 * 
 * @param techBase - Tech base (IS or Clan)
 * @returns The targeting computer IElectronics definition
 */
export function getTargetingComputerEquipment(techBase: TechBase): IElectronics | undefined {
  const id = techBase === TechBase.CLAN ? 'clan-targeting-computer' : 'targeting-computer';
  
  // Try to get from the loader first (JSON data)
  const loader = getEquipmentLoader();
  if (loader.getIsLoaded()) {
    const loaded = loader.getElectronicsById(id);
    if (loaded) return loaded;
  }
  
  // Fallback to hardcoded definitions for essential targeting computer equipment
  return TARGETING_COMPUTER_FALLBACKS[id];
}

/**
 * Get the variable equipment ID for targeting computer based on tech base
 * 
 * @param techBase - Tech base (IS or Clan)
 * @returns The variable equipment ID for formula lookup
 */
export function getTargetingComputerFormulaId(techBase: TechBase): string {
  return techBase === TechBase.CLAN 
    ? VARIABLE_EQUIPMENT.TARGETING_COMPUTER_CLAN 
    : VARIABLE_EQUIPMENT.TARGETING_COMPUTER_IS;
}

/**
 * Calculate targeting computer weight based on direct fire weapon tonnage
 * 
 * Formula:
 * - IS: ceil(directFireWeaponTonnage / 4)
 * - Clan: ceil(directFireWeaponTonnage / 5)
 * 
 * @param directFireWeaponTonnage - Total tonnage of energy and ballistic weapons
 * @param techBase - Tech base (IS or Clan)
 * @returns Weight in tons (minimum 1)
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
 * Calculate targeting computer critical slots
 * Slots = weight (1 slot per ton)
 * 
 * @param directFireWeaponTonnage - Total tonnage of energy and ballistic weapons
 * @param techBase - Tech base (IS or Clan)
 * @returns Number of critical slots (minimum 1)
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
 * Calculate targeting computer cost
 * Cost = weight × 10,000 C-Bills
 * 
 * @param directFireWeaponTonnage - Total tonnage of energy and ballistic weapons
 * @param techBase - Tech base (IS or Clan)
 * @returns Cost in C-Bills
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

/**
 * Create targeting computer equipment instance for the equipment array
 * 
 * Weight and slots are variable based on direct fire weapon tonnage:
 * - IS: ceil(directFireWeaponTonnage / 4) tons, same number of slots
 * - Clan: ceil(directFireWeaponTonnage / 5) tons, same number of slots
 * 
 * The targeting computer must be placed in a single location (typically head or torso).
 * 
 * @param techBase - Tech base (IS or Clan)
 * @param directFireWeaponTonnage - Total tonnage of energy and ballistic weapons
 * @returns Array with single targeting computer equipment instance, or empty if no valid TC
 */
export function createTargetingComputerEquipmentList(
  techBase: TechBase,
  directFireWeaponTonnage: number
): IMountedEquipmentInstance[] {
  // No targeting computer if no direct fire weapons
  if (directFireWeaponTonnage <= 0) return [];
  
  const tcEquip = getTargetingComputerEquipment(techBase);
  if (!tcEquip) return [];
  
  const weight = calculateTargetingComputerWeight(directFireWeaponTonnage, techBase);
  const slots = calculateTargetingComputerSlots(directFireWeaponTonnage, techBase);
  
  // Targeting computer is a single contiguous item
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
    isRemovable: true, // Targeting computer can be removed from loadout
    isOmniPodMounted: false,
  }];
}

/**
 * Filter out targeting computer equipment from the equipment array
 */
export function filterOutTargetingComputer(
  equipment: readonly IMountedEquipmentInstance[]
): IMountedEquipmentInstance[] {
  return equipment.filter(e => !TARGETING_COMPUTER_IDS.includes(e.equipmentId));
}

