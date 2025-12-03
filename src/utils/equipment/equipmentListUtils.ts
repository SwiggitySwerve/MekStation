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
import { JUMP_JETS, HEAT_SINKS, MiscEquipmentCategory } from '@/types/equipment/MiscEquipmentTypes';
import { MOVEMENT_EQUIPMENT, MYOMER_SYSTEMS } from '@/types/equipment/MiscEquipmentTypes';
import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import { equipmentCalculatorService, VARIABLE_EQUIPMENT } from '@/services/equipment/EquipmentCalculatorService';

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

/** Heat sink equipment IDs from MiscEquipmentTypes */
export const HEAT_SINK_EQUIPMENT_IDS = HEAT_SINKS.map(hs => hs.id);

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
 * Get the jump jet equipment item for a given tonnage and type
 */
export function getJumpJetEquipment(tonnage: number, jumpJetType: JumpJetType) {
  const id = getJumpJetEquipmentId(tonnage, jumpJetType);
  return JUMP_JETS.find(jj => jj.id === id);
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
    });
  }
  return result;
}

/**
 * Filter out jump jet equipment from the equipment array
 */
export function filterOutJumpJets(equipment: readonly IMountedEquipmentInstance[]): IMountedEquipmentInstance[] {
  const jumpJetIds = JUMP_JETS.map(jj => jj.id);
  return equipment.filter(e => !jumpJetIds.includes(e.equipmentId));
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
 * Get the heat sink equipment item for a given HeatSinkType
 */
export function getHeatSinkEquipment(heatSinkType: HeatSinkType) {
  const id = getHeatSinkEquipmentId(heatSinkType);
  return HEAT_SINKS.find(hs => hs.id === id);
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
      weight: 0,
      criticalSlots: hsEquip.criticalSlots,
      heat: 0,
      techBase: hsEquip.techBase,
      location: undefined,
      slots: undefined,
      isRearMounted: false,
      linkedAmmoId: undefined,
      isRemovable: false,
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
 * Get the enhancement equipment item by type and tech base
 */
export function getEnhancementEquipment(
  enhancementType: MovementEnhancementType,
  techBase: TechBase
) {
  const id = getEnhancementEquipmentId(enhancementType, techBase);
  
  // Check MOVEMENT_EQUIPMENT first (MASC, Supercharger)
  const movementEquip = MOVEMENT_EQUIPMENT.find(e => e.id === id);
  if (movementEquip) return movementEquip;
  
  // Check MYOMER_SYSTEMS (TSM)
  return MYOMER_SYSTEMS.find(e => e.id === id);
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
  engineWeight: number
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

