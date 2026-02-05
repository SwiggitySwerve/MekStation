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

export {
  INTERNAL_STRUCTURE_EQUIPMENT_ID,
  ARMOR_SLOTS_EQUIPMENT_ID,
  STEALTH_ARMOR_LOCATIONS,
  ENHANCEMENT_EQUIPMENT_IDS,
  HEAT_SINK_EQUIPMENT_IDS,
  JUMP_JET_EQUIPMENT_IDS,
  TARGETING_COMPUTER_IDS,
} from './equipmentConstants';

export {
  getJumpJetEquipmentId,
  getJumpJetEquipment,
  createJumpJetEquipmentList,
  filterOutJumpJets,
} from './jumpJetUtils';

export {
  createInternalStructureEquipmentList,
  filterOutInternalStructure,
} from './internalStructureSlotUtils';

export {
  createArmorEquipmentList,
  filterOutArmorSlots,
} from './armorSlotUtils';

export {
  getHeatSinkEquipmentId,
  getHeatSinkEquipment,
  createHeatSinkEquipmentList,
  filterOutHeatSinks,
} from './heatSinkEquipmentUtils';

export {
  getEnhancementEquipmentId,
  getEnhancementEquipment,
  calculateEnhancementWeight,
  calculateEnhancementSlots,
  createEnhancementEquipmentList,
  filterOutEnhancementEquipment,
} from './enhancementEquipmentUtils';

export {
  TARGETING_COMPUTER_EQUIPMENT_IDS,
  getTargetingComputerEquipment,
  getTargetingComputerFormulaId,
  calculateTargetingComputerWeight,
  calculateTargetingComputerSlots,
  calculateTargetingComputerCost,
  createTargetingComputerEquipmentList,
  filterOutTargetingComputer,
} from './targetingComputerUtils';
