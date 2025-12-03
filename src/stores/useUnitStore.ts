/**
 * Unit Store Factory
 * 
 * Creates isolated Zustand stores for individual units.
 * Each unit has its own store instance with independent persistence.
 * 
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import { create, StoreApi, useStore } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { createContext, useContext } from 'react';

// =============================================================================
// Client-Safe Storage
// =============================================================================

/**
 * Storage wrapper that safely handles SSR (no localStorage on server)
 */
const clientSafeStorage: StateStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(name, value);
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
  },
};
import { TechBase } from '@/types/enums/TechBase';
import {
  TechBaseMode,
  TechBaseComponent,
  IComponentTechBases,
  createDefaultComponentTechBases,
} from '@/types/construction/TechBaseConfiguration';
import {
  UnitState,
  UnitActions,
  UnitStore,
  CreateUnitOptions,
  createDefaultUnitState,
  ISelectionMemory,
  ITechBaseMemory,
  createEmptySelectionMemory,
  IArmorAllocation,
  createEmptyArmorAllocation,
  getTotalAllocatedArmor,
  IMountedEquipmentInstance,
  createMountedEquipment,
} from './unitState';
import { IEquipmentItem } from '@/types/equipment';
import { generateUnitId } from '@/utils/uuid';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import {
  calculateArmorPoints,
  getMaxArmorForLocation,
  getMaxTotalArmor,
  calculateOptimalArmorAllocation,
} from '@/utils/construction/armorCalculations';
import { ArmorTypeEnum, getArmorDefinition } from '@/types/construction/ArmorType';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';
import {
  getValidatedSelectionUpdates,
  getFullyValidatedSelections,
  getSelectionWithMemory,
  ComponentSelections,
} from '@/utils/techBaseValidation';
import { JumpJetType, getMaxJumpMP, getJumpJetDefinition } from '@/utils/construction/movementCalculations';
import { JUMP_JETS, HEAT_SINKS, MiscEquipmentCategory } from '@/types/equipment/MiscEquipmentTypes';
import { HeatSinkType, getHeatSinkDefinition } from '@/types/construction/HeatSinkType';
import { calculateIntegralHeatSinks, calculateEngineWeight } from '@/utils/construction/engineCalculations';
import { EquipmentCategory } from '@/types/equipment';
import { equipmentCalculatorService, VARIABLE_EQUIPMENT } from '@/services/equipment/EquipmentCalculatorService';
import {
  getEquipmentDisplacedByEngineChange,
  getEquipmentDisplacedByGyroChange,
  applyDisplacement,
} from '@/utils/construction/displacementUtils';
import { 
  MovementEnhancementType,
  getMovementEnhancementDefinition,
} from '@/types/construction/MovementEnhancement';
import { 
  MOVEMENT_EQUIPMENT, 
  MYOMER_SYSTEMS,
} from '@/types/equipment/MiscEquipmentTypes';

// Re-export UnitStore type for convenience
export type { UnitStore } from './unitState';

// =============================================================================
// Jump Jet Equipment Helpers
// =============================================================================

/**
 * Get the correct jump jet equipment ID based on tonnage and jet type
 */
function getJumpJetEquipmentId(tonnage: number, jumpJetType: JumpJetType): string {
  const isImproved = jumpJetType === JumpJetType.IMPROVED;
  const prefix = isImproved ? 'improved-jump-jet' : 'jump-jet';
  
  if (tonnage <= 55) return `${prefix}-light`;
  if (tonnage <= 85) return `${prefix}-medium`;
  return `${prefix}-heavy`;
}

/**
 * Get the jump jet equipment item for a given tonnage and type
 */
function getJumpJetEquipment(tonnage: number, jumpJetType: JumpJetType) {
  const id = getJumpJetEquipmentId(tonnage, jumpJetType);
  return JUMP_JETS.find(jj => jj.id === id);
}

/**
 * Create jump jet equipment instances for the equipment array
 * These are configuration-based components and NOT removable via the loadout tray.
 */
function createJumpJetEquipmentList(
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
      category: EquipmentCategory.MOVEMENT, // Movement equipment category
      weight: jetEquip.weight,
      criticalSlots: jetEquip.criticalSlots,
      heat: 0,
      techBase: jetEquip.techBase,
      location: undefined,
      slots: undefined,
      isRearMounted: false,
      linkedAmmoId: undefined,
      isRemovable: false, // Configuration component - managed via Structure tab
    });
  }
  return result;
}

/**
 * Filter out jump jet equipment from the equipment array
 */
function filterOutJumpJets(equipment: readonly IMountedEquipmentInstance[]): IMountedEquipmentInstance[] {
  // Jump jet equipment IDs to filter out
  const jumpJetIds = JUMP_JETS.map(jj => jj.id);
  return equipment.filter(e => !jumpJetIds.includes(e.equipmentId));
}

// =============================================================================
// Internal Structure Equipment Helpers
// =============================================================================

import { 
  InternalStructureType, 
  getInternalStructureDefinition 
} from '@/types/construction/InternalStructureType';

/** Equipment ID prefix for internal structure slots */
const INTERNAL_STRUCTURE_EQUIPMENT_ID = 'internal-structure-slot';

/**
 * Create internal structure equipment items (e.g., Endo Steel slots)
 * Creates individual 1-slot items for each required critical slot.
 * These are configuration-based components and NOT removable via the loadout tray.
 */
function createInternalStructureEquipmentList(
  structureType: InternalStructureType
): IMountedEquipmentInstance[] {
  const structureDef = getInternalStructureDefinition(structureType);
  if (!structureDef || structureDef.criticalSlots === 0) {
    return [];
  }
  
  const result: IMountedEquipmentInstance[] = [];
  const slotCount = structureDef.criticalSlots;
  
  // Create individual 1-slot items for each required slot
  for (let i = 0; i < slotCount; i++) {
    result.push({
      instanceId: generateUnitId(),
      equipmentId: `${INTERNAL_STRUCTURE_EQUIPMENT_ID}-${structureType}`,
      name: structureDef.name,
      category: EquipmentCategory.STRUCTURAL,
      weight: 0, // Weight is calculated separately in structure weight
      criticalSlots: 1, // Each is 1 slot
      heat: 0,
      techBase: structureDef.techBase,
      location: undefined, // User assigns location
      slots: undefined,
      isRearMounted: false,
      linkedAmmoId: undefined,
      isRemovable: false, // Configuration component - managed via Structure tab
    });
  }
  return result;
}

/**
 * Filter out internal structure equipment from the equipment array
 */
function filterOutInternalStructure(equipment: readonly IMountedEquipmentInstance[]): IMountedEquipmentInstance[] {
  return equipment.filter(e => !e.equipmentId.startsWith(INTERNAL_STRUCTURE_EQUIPMENT_ID));
}

// =============================================================================
// Armor Equipment Helpers
// =============================================================================

/** Equipment ID prefix for armor slots */
const ARMOR_SLOTS_EQUIPMENT_ID = 'armor-slot';

/** Stealth armor locations (2 slots each in these 6 locations) */
const STEALTH_ARMOR_LOCATIONS: MechLocation[] = [
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
];

/**
 * Create armor equipment items (e.g., Ferro-Fibrous or Stealth slots)
 * Creates individual slot items for each required critical slot.
 * Stealth armor creates 6 × 2-slot items with pre-assigned locations.
 * Other armor types create individual 1-slot items.
 * These are configuration-based components and NOT removable via the loadout tray.
 */
function createArmorEquipmentList(
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
        weight: 0, // Weight is calculated separately in armor weight
        criticalSlots: 2, // Each stealth component is 2 slots
        heat: 0,
        techBase: armorDef.techBase,
        location, // Pre-assigned to specific location
        slots: undefined, // Specific slot indices assigned during placement
        isRearMounted: false,
        linkedAmmoId: undefined,
        isRemovable: false, // Configuration component - managed via Armor tab
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
      weight: 0, // Weight is calculated separately in armor weight
      criticalSlots: 1, // Each is 1 slot
      heat: 0,
      techBase: armorDef.techBase,
      location: undefined, // User assigns location
      slots: undefined,
      isRearMounted: false,
      linkedAmmoId: undefined,
      isRemovable: false, // Configuration component - managed via Armor tab
    });
  }
  return result;
}

/**
 * Filter out armor slot equipment from the equipment array
 */
function filterOutArmorSlots(equipment: readonly IMountedEquipmentInstance[]): IMountedEquipmentInstance[] {
  return equipment.filter(e => !e.equipmentId.startsWith(ARMOR_SLOTS_EQUIPMENT_ID));
}

// =============================================================================
// Heat Sink Equipment Helpers
// =============================================================================

/** Heat sink equipment IDs from MiscEquipmentTypes */
const HEAT_SINK_EQUIPMENT_IDS = HEAT_SINKS.map(hs => hs.id);

/**
 * Get the heat sink equipment ID for a given HeatSinkType
 */
function getHeatSinkEquipmentId(heatSinkType: HeatSinkType): string {
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
function getHeatSinkEquipment(heatSinkType: HeatSinkType) {
  const id = getHeatSinkEquipmentId(heatSinkType);
  return HEAT_SINKS.find(hs => hs.id === id);
}

/**
 * Create heat sink equipment instances for external heat sinks
 * External heat sinks are those that exceed the engine's integral capacity.
 * These are configuration-based components and NOT removable via the loadout tray.
 */
function createHeatSinkEquipmentList(
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
      category: EquipmentCategory.MISC_EQUIPMENT, // Heat sinks are categorized as misc equipment
      weight: 0, // Weight is calculated separately in heat sink weight (external only pay weight once)
      criticalSlots: hsEquip.criticalSlots,
      heat: 0,
      techBase: hsEquip.techBase,
      location: undefined,
      slots: undefined,
      isRearMounted: false,
      linkedAmmoId: undefined,
      isRemovable: false, // Configuration component - managed via Structure tab
    });
  }
  return result;
}

/**
 * Filter out heat sink equipment from the equipment array
 */
function filterOutHeatSinks(equipment: readonly IMountedEquipmentInstance[]): IMountedEquipmentInstance[] {
  return equipment.filter(e => !HEAT_SINK_EQUIPMENT_IDS.includes(e.equipmentId));
}

// =============================================================================
// Movement Enhancement Equipment Helpers
// =============================================================================

/** Equipment IDs for movement enhancements */
const ENHANCEMENT_EQUIPMENT_IDS = [
  'masc',
  'clan-masc',
  'supercharger',
  'tsm',
  'industrial-tsm',
];

/**
 * Get the correct enhancement equipment ID based on type and tech base
 */
function getEnhancementEquipmentId(
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
function getEnhancementEquipment(
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
 * - MASC (IS): ceil(engineRating / 20)
 * - MASC (Clan): ceil(engineRating / 25)
 * - Supercharger: ceil(engineWeight / 10) rounded to 0.5t
 * - TSM: 0
 */
function calculateEnhancementWeight(
  enhancementType: MovementEnhancementType,
  tonnage: number,
  techBase: TechBase,
  engineRating: number,
  engineWeight: number
): number {
  // Use EquipmentCalculatorService for MASC and Supercharger (variable equipment)
  if (enhancementType === MovementEnhancementType.MASC) {
    const equipId = techBase === TechBase.CLAN ? VARIABLE_EQUIPMENT.MASC_CLAN : VARIABLE_EQUIPMENT.MASC_IS;
    const result = equipmentCalculatorService.calculateProperties(equipId, { engineRating, tonnage });
    return result.weight;
  }
  
  if (enhancementType === MovementEnhancementType.SUPERCHARGER) {
    const result = equipmentCalculatorService.calculateProperties(VARIABLE_EQUIPMENT.SUPERCHARGER, { engineWeight });
    return result.weight;
  }
  
  // TSM and others use the definition
  const def = getMovementEnhancementDefinition(enhancementType);
  if (!def) return 0;
  return def.getWeight(tonnage);
}

/**
 * Calculate enhancement critical slots based on type and mech parameters
 * Uses EquipmentCalculatorService with correct formulas:
 * - MASC (IS): ceil(engineRating / 20) - same as weight
 * - MASC (Clan): ceil(engineRating / 25) - same as weight
 * - Supercharger: 1 (fixed)
 * - TSM: 6 (distributed)
 */
function calculateEnhancementSlots(
  enhancementType: MovementEnhancementType,
  tonnage: number,
  techBase: TechBase,
  engineRating: number,
  engineWeight: number
): number {
  // Use EquipmentCalculatorService for MASC (variable slots based on engine rating)
  if (enhancementType === MovementEnhancementType.MASC) {
    const equipId = techBase === TechBase.CLAN ? VARIABLE_EQUIPMENT.MASC_CLAN : VARIABLE_EQUIPMENT.MASC_IS;
    const result = equipmentCalculatorService.calculateProperties(equipId, { engineRating, tonnage });
    return result.criticalSlots;
  }
  
  // Supercharger has fixed 1 slot (not variable)
  if (enhancementType === MovementEnhancementType.SUPERCHARGER) {
    return 1;
  }
  
  // TSM and others use the definition
  const def = getMovementEnhancementDefinition(enhancementType);
  if (!def) return 0;
  return def.getCriticalSlots(tonnage);
}

/**
 * Create enhancement equipment instances for the equipment array
 * Creates a single item for MASC or TSM with calculated weight/slots.
 * These are configuration-based components and NOT removable via the loadout tray.
 * 
 * @param enhancementType - The type of enhancement (MASC, Supercharger, TSM)
 * @param tonnage - Mech tonnage (used for TSM and cost calculations)
 * @param techBase - Tech base (IS or Clan, affects MASC formula)
 * @param engineRating - Engine rating (required for MASC weight/slots)
 * @param engineWeight - Engine weight in tons (required for Supercharger weight)
 */
function createEnhancementEquipmentList(
  enhancementType: MovementEnhancementType | null,
  tonnage: number,
  techBase: TechBase,
  engineRating: number,
  engineWeight: number
): IMountedEquipmentInstance[] {
  if (!enhancementType) return [];
  
  const equip = getEnhancementEquipment(enhancementType, techBase);
  if (!equip) return [];
  
  const weight = calculateEnhancementWeight(enhancementType, tonnage, techBase, engineRating, engineWeight);
  const slots = calculateEnhancementSlots(enhancementType, tonnage, techBase, engineRating, engineWeight);
  
  // Map category to EquipmentCategory
  const category = equip.category === MiscEquipmentCategory.MYOMER
    ? EquipmentCategory.MISC_EQUIPMENT
    : EquipmentCategory.MOVEMENT;
  
  // For TSM, we need individual slots distributed across locations
  // For MASC, it's a single item that can be placed in legs
  if (enhancementType === MovementEnhancementType.TSM) {
    // Create individual 1-slot items for each TSM slot (similar to Endo Steel)
    const result: IMountedEquipmentInstance[] = [];
    for (let i = 0; i < slots; i++) {
      result.push({
        instanceId: generateUnitId(),
        equipmentId: equip.id,
        name: equip.name,
        category,
        weight: 0, // TSM has no weight
        criticalSlots: 1, // Each slot is 1 crit
        heat: 0,
        techBase: equip.techBase,
        location: undefined,
        slots: undefined,
        isRearMounted: false,
        linkedAmmoId: undefined,
        isRemovable: false, // Configuration component - managed via Structure tab
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
    isRemovable: false, // Configuration component - managed via Structure tab
  }];
}

/**
 * Filter out enhancement equipment from the equipment array
 */
function filterOutEnhancementEquipment(
  equipment: readonly IMountedEquipmentInstance[]
): IMountedEquipmentInstance[] {
  return equipment.filter(e => !ENHANCEMENT_EQUIPMENT_IDS.includes(e.equipmentId));
}

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Create an isolated Zustand store for a single unit
 * 
 * Each unit gets its own store instance that:
 * - Contains only that unit's state
 * - Persists independently to localStorage
 * - Has a clean API without tabId parameters
 */
export function createUnitStore(initialState: UnitState): StoreApi<UnitStore> {
  return create<UnitStore>()(
    persist(
      (set) => ({
        // Spread initial state
        ...initialState,
        
        // =================================================================
        // Identity Actions
        // =================================================================
        
        setName: (name) => set({
          name,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setChassis: (chassis) => set((state) => ({
          chassis,
          // Update derived name
          name: `${chassis}${state.model ? ' ' + state.model : ''}`,
          isModified: true,
          lastModifiedAt: Date.now(),
        })),
        
        setClanName: (clanName) => set({
          clanName,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setModel: (model) => set((state) => ({
          model,
          // Update derived name
          name: `${state.chassis}${model ? ' ' + model : ''}`,
          isModified: true,
          lastModifiedAt: Date.now(),
        })),
        
        setMulId: (mulId) => set({
          mulId,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setYear: (year) => set({
          year,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setRulesLevel: (rulesLevel) => set({
          rulesLevel,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        // =================================================================
        // Chassis Actions
        // =================================================================
        
        setTonnage: (tonnage) => set((state) => {
          // Recalculate engine rating to maintain same Walk MP
          const walkMP = Math.floor(state.engineRating / state.tonnage);
          const newEngineRating = tonnage * walkMP;
          // Clamp engine rating to valid range
          const clampedRating = Math.max(10, Math.min(500, newEngineRating));
          return {
            tonnage,
            engineRating: clampedRating,
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setConfiguration: (configuration) => set({
          configuration,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setIsOmni: (isOmni) => set({
          isOmni,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        // =================================================================
        // Tech Base Actions
        // =================================================================
        
        setTechBaseMode: (mode) => set((state) => {
          // When switching to non-mixed mode, reset all components to match
          const newTechBase = mode === TechBaseMode.CLAN ? TechBase.CLAN : TechBase.INNER_SPHERE;
          const newComponentTechBases = mode === TechBaseMode.MIXED
            ? state.componentTechBases
            : createDefaultComponentTechBases(newTechBase);
          
          // Determine old tech base for saving to memory
          const oldTechBase = state.techBaseMode === TechBaseMode.CLAN ? TechBase.CLAN : TechBase.INNER_SPHERE;
          const memoryTechBase = mode === TechBaseMode.MIXED ? undefined : newTechBase;
          
          const currentSelections: ComponentSelections = {
            engineType: state.engineType,
            gyroType: state.gyroType,
            internalStructureType: state.internalStructureType,
            cockpitType: state.cockpitType,
            heatSinkType: state.heatSinkType,
            armorType: state.armorType,
          };
          
          // Save current selections to memory for the OLD tech base (if not mixed)
          let updatedMemory = { ...state.selectionMemory };
          if (state.techBaseMode !== TechBaseMode.MIXED) {
            updatedMemory = {
              engine: { ...updatedMemory.engine, [oldTechBase]: state.engineType },
              gyro: { ...updatedMemory.gyro, [oldTechBase]: state.gyroType },
              structure: { ...updatedMemory.structure, [oldTechBase]: state.internalStructureType },
              cockpit: { ...updatedMemory.cockpit, [oldTechBase]: state.cockpitType },
              heatSink: { ...updatedMemory.heatSink, [oldTechBase]: state.heatSinkType },
              armor: { ...updatedMemory.armor, [oldTechBase]: state.armorType },
            };
          }
          
          // Validate and update all component selections for the new tech bases
          // Try to restore from memory if switching to a non-mixed mode
          const validatedSelections = getFullyValidatedSelections(
            newComponentTechBases,
            currentSelections,
            memoryTechBase ? updatedMemory : undefined,
            memoryTechBase
          );
          
          return {
            techBaseMode: mode,
            componentTechBases: newComponentTechBases,
            selectionMemory: updatedMemory,
            ...validatedSelections,
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setComponentTechBase: (component, techBase) => set((state) => {
          const oldTechBase = state.componentTechBases[component];
          
          const currentSelections: ComponentSelections = {
            engineType: state.engineType,
            gyroType: state.gyroType,
            internalStructureType: state.internalStructureType,
            cockpitType: state.cockpitType,
            heatSinkType: state.heatSinkType,
            armorType: state.armorType,
          };
          
          // Save current selections to memory for the OLD tech base
          const updatedMemory: ISelectionMemory = {
            ...state.selectionMemory,
          };
          
          // Map component to memory key and save current value using TechBase enum
          if (component === TechBaseComponent.ENGINE) {
            updatedMemory.engine = { ...updatedMemory.engine, [oldTechBase]: state.engineType };
          } else if (component === TechBaseComponent.GYRO) {
            updatedMemory.gyro = { ...updatedMemory.gyro, [oldTechBase]: state.gyroType };
          } else if (component === TechBaseComponent.CHASSIS) {
            updatedMemory.structure = { ...updatedMemory.structure, [oldTechBase]: state.internalStructureType };
            updatedMemory.cockpit = { ...updatedMemory.cockpit, [oldTechBase]: state.cockpitType };
          } else if (component === TechBaseComponent.HEATSINK) {
            updatedMemory.heatSink = { ...updatedMemory.heatSink, [oldTechBase]: state.heatSinkType };
          } else if (component === TechBaseComponent.ARMOR) {
            updatedMemory.armor = { ...updatedMemory.armor, [oldTechBase]: state.armorType };
          }
          
          // Get validated selection updates, using memory if available
          const selectionUpdates = getSelectionWithMemory(
            component as TechBaseComponent,
            techBase,
            currentSelections,
            updatedMemory
          );
          
          return {
            componentTechBases: {
              ...state.componentTechBases,
              [component]: techBase,
            },
            selectionMemory: updatedMemory,
            ...selectionUpdates,
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setAllComponentTechBases: (techBases) => set({
          componentTechBases: techBases,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        // =================================================================
        // Component Actions
        // =================================================================
        
        setEngineType: (type) => set((state) => {
          // Find equipment displaced by new engine's slot requirements
          const displaced = getEquipmentDisplacedByEngineChange(
            state.equipment,
            state.engineType,
            type,
            state.gyroType
          );
          
          // Unallocate displaced equipment
          let updatedEquipment = applyDisplacement(
            state.equipment,
            displaced.displacedEquipmentIds
          );
          
          // Re-sync heat sink equipment since integral capacity may have changed
          const integralHeatSinks = calculateIntegralHeatSinks(state.engineRating, type);
          const externalHeatSinks = Math.max(0, state.heatSinkCount - integralHeatSinks);
          const nonHeatSinkEquipment = filterOutHeatSinks(updatedEquipment);
          const heatSinkEquipment = createHeatSinkEquipmentList(state.heatSinkType, externalHeatSinks);
          updatedEquipment = [...nonHeatSinkEquipment, ...heatSinkEquipment];
          
          // Re-sync enhancement equipment since Supercharger depends on engine weight
          const engineWeight = calculateEngineWeight(state.engineRating, type);
          const nonEnhancementEquipment = filterOutEnhancementEquipment(updatedEquipment);
          const enhancementEquipment = createEnhancementEquipmentList(
            state.enhancement,
            state.tonnage,
            state.techBase,
            state.engineRating,
            engineWeight
          );
          updatedEquipment = [...nonEnhancementEquipment, ...enhancementEquipment];
          
          return {
            engineType: type,
            equipment: updatedEquipment,
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setEngineRating: (rating) => set((state) => {
          // Re-sync heat sink equipment since integral capacity changes with rating
          const integralHeatSinks = calculateIntegralHeatSinks(rating, state.engineType);
          const externalHeatSinks = Math.max(0, state.heatSinkCount - integralHeatSinks);
          const nonHeatSinkEquipment = filterOutHeatSinks(state.equipment);
          const heatSinkEquipment = createHeatSinkEquipmentList(state.heatSinkType, externalHeatSinks);
          
          // Re-sync enhancement equipment since MASC/Supercharger depend on engine
          const engineWeight = calculateEngineWeight(rating, state.engineType);
          const nonEnhancementEquipment = filterOutEnhancementEquipment([...nonHeatSinkEquipment, ...heatSinkEquipment]);
          const enhancementEquipment = createEnhancementEquipmentList(
            state.enhancement,
            state.tonnage,
            state.techBase,
            rating,
            engineWeight
          );
          
          return {
            engineRating: rating,
            equipment: [...nonEnhancementEquipment, ...enhancementEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setGyroType: (type) => set((state) => {
          // Find equipment displaced by new gyro's slot requirements
          const displaced = getEquipmentDisplacedByGyroChange(
            state.equipment,
            state.engineType,
            state.gyroType,
            type
          );
          
          // Unallocate displaced equipment
          const updatedEquipment = applyDisplacement(
            state.equipment,
            displaced.displacedEquipmentIds
          );
          
          return {
            gyroType: type,
            equipment: updatedEquipment,
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setInternalStructureType: (type) => set((state) => {
          // Sync equipment - remove old structure equipment, add new ones
          const nonStructureEquipment = filterOutInternalStructure(state.equipment);
          const structureEquipment = createInternalStructureEquipmentList(type);
          
          return {
            internalStructureType: type,
            equipment: [...nonStructureEquipment, ...structureEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setCockpitType: (type) => set({
          cockpitType: type,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setHeatSinkType: (type) => set((state) => {
          // Calculate external heat sinks based on engine capacity
          const integralHeatSinks = calculateIntegralHeatSinks(state.engineRating, state.engineType);
          const externalHeatSinks = Math.max(0, state.heatSinkCount - integralHeatSinks);
          
          // Sync equipment - remove old heat sinks, add new ones with new type
          const nonHeatSinkEquipment = filterOutHeatSinks(state.equipment);
          const heatSinkEquipment = createHeatSinkEquipmentList(type, externalHeatSinks);
          
          return {
            heatSinkType: type,
            equipment: [...nonHeatSinkEquipment, ...heatSinkEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setHeatSinkCount: (count) => set((state) => {
          // Calculate external heat sinks based on engine capacity
          const integralHeatSinks = calculateIntegralHeatSinks(state.engineRating, state.engineType);
          const externalHeatSinks = Math.max(0, count - integralHeatSinks);
          
          // Sync equipment - remove old heat sinks, add new ones with updated count
          const nonHeatSinkEquipment = filterOutHeatSinks(state.equipment);
          const heatSinkEquipment = createHeatSinkEquipmentList(state.heatSinkType, externalHeatSinks);
          
          return {
            heatSinkCount: count,
            equipment: [...nonHeatSinkEquipment, ...heatSinkEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setArmorType: (type) => set((state) => {
          // Sync equipment - remove old armor slot equipment, add new ones
          const nonArmorEquipment = filterOutArmorSlots(state.equipment);
          const armorEquipment = createArmorEquipmentList(type);
          
          return {
            armorType: type,
            equipment: [...nonArmorEquipment, ...armorEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setEnhancement: (enhancement) => set((state) => {
          // Sync equipment - remove old enhancement equipment, add new ones
          const nonEnhancementEquipment = filterOutEnhancementEquipment(state.equipment);
          const engineWeight = calculateEngineWeight(state.engineRating, state.engineType);
          const enhancementEquipment = createEnhancementEquipmentList(
            enhancement,
            state.tonnage,
            state.techBase,
            state.engineRating,
            engineWeight
          );
          
          return {
            enhancement,
            equipment: [...nonEnhancementEquipment, ...enhancementEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setJumpMP: (jumpMP) => set((state) => {
          // Calculate walk MP for validation
          const walkMP = Math.floor(state.engineRating / state.tonnage);
          const maxJump = getMaxJumpMP(walkMP, state.jumpJetType);
          const clampedJumpMP = Math.max(0, Math.min(jumpMP, maxJump));
          
          // Sync equipment - remove old jump jets, add new ones
          const nonJumpEquipment = filterOutJumpJets(state.equipment);
          const jumpJetEquipment = createJumpJetEquipmentList(state.tonnage, clampedJumpMP, state.jumpJetType);
          
          return {
            jumpMP: clampedJumpMP,
            equipment: [...nonJumpEquipment, ...jumpJetEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setJumpJetType: (jumpJetType) => set((state) => {
          // Calculate walk MP for validation
          const walkMP = Math.floor(state.engineRating / state.tonnage);
          const maxJump = getMaxJumpMP(walkMP, jumpJetType);
          
          // Clamp current jump MP to new max if needed
          const clampedJumpMP = Math.min(state.jumpMP, maxJump);
          
          // Sync equipment with new jet type
          const nonJumpEquipment = filterOutJumpJets(state.equipment);
          const jumpJetEquipment = createJumpJetEquipmentList(state.tonnage, clampedJumpMP, jumpJetType);
          
          return {
            jumpJetType,
            jumpMP: clampedJumpMP,
            equipment: [...nonJumpEquipment, ...jumpJetEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        // =================================================================
        // Armor Allocation Actions
        // =================================================================
        
        setArmorTonnage: (tonnage) => set({
          armorTonnage: Math.max(0, tonnage),
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setLocationArmor: (location, front, rear) => set((state) => {
          const newAllocation = { ...state.armorAllocation };
          const maxArmor = getMaxArmorForLocation(state.tonnage, location);
          
          // Clamp front armor to valid range
          const clampedFront = Math.max(0, Math.min(front, maxArmor));
          newAllocation[location] = clampedFront;
          
          // Handle rear armor for torso locations
          if (rear !== undefined) {
            // Front + rear cannot exceed location max
            const maxRear = maxArmor - clampedFront;
            const clampedRear = Math.max(0, Math.min(rear, maxRear));
            
            switch (location) {
              case MechLocation.CENTER_TORSO:
                newAllocation.centerTorsoRear = clampedRear;
                break;
              case MechLocation.LEFT_TORSO:
                newAllocation.leftTorsoRear = clampedRear;
                break;
              case MechLocation.RIGHT_TORSO:
                newAllocation.rightTorsoRear = clampedRear;
                break;
            }
          }
          
          return {
            armorAllocation: newAllocation,
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        autoAllocateArmor: () => set((state) => {
          const availablePoints = calculateArmorPoints(state.armorTonnage, state.armorType);
          
          // Use the optimal allocation algorithm
          // Priority: 1) Max head, 2) Weighted distribution, 3) Even remainder distribution
          const allocation = calculateOptimalArmorAllocation(availablePoints, state.tonnage);
          
          const newAllocation: IArmorAllocation = {
            [MechLocation.HEAD]: allocation.head,
            [MechLocation.CENTER_TORSO]: allocation.centerTorsoFront,
            centerTorsoRear: allocation.centerTorsoRear,
            [MechLocation.LEFT_TORSO]: allocation.leftTorsoFront,
            leftTorsoRear: allocation.leftTorsoRear,
            [MechLocation.RIGHT_TORSO]: allocation.rightTorsoFront,
            rightTorsoRear: allocation.rightTorsoRear,
            [MechLocation.LEFT_ARM]: allocation.leftArm,
            [MechLocation.RIGHT_ARM]: allocation.rightArm,
            [MechLocation.LEFT_LEG]: allocation.leftLeg,
            [MechLocation.RIGHT_LEG]: allocation.rightLeg,
          };
          
          return {
            armorAllocation: newAllocation,
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        maximizeArmor: () => set((state) => {
          // Calculate max armor points needed for the mech
          const maxTotalArmor = getMaxTotalArmor(state.tonnage);
          const armorDef = getArmorDefinition(state.armorType);
          const pointsPerTon = armorDef?.pointsPerTon ?? 16;
          
          // Calculate tonnage needed for max armor
          const tonnageNeeded = ceilToHalfTon(maxTotalArmor / pointsPerTon);
          
          return {
            armorTonnage: tonnageNeeded,
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        clearAllArmor: () => set({
          armorAllocation: createEmptyArmorAllocation(),
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        // =================================================================
        // Equipment Actions
        // =================================================================
        
        addEquipment: (item: IEquipmentItem) => {
          const instanceId = generateUnitId();
          const mountedEquipment = createMountedEquipment(item, instanceId);
          
          set((state) => ({
            equipment: [...state.equipment, mountedEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          }));
          
          return instanceId;
        },
        
        removeEquipment: (instanceId: string) => set((state) => ({
          equipment: state.equipment.filter(e => e.instanceId !== instanceId),
          isModified: true,
          lastModifiedAt: Date.now(),
        })),
        
        updateEquipmentLocation: (instanceId: string, location: MechLocation, slots: readonly number[]) => 
          set((state) => ({
            equipment: state.equipment.map(e => 
              e.instanceId === instanceId
                ? { ...e, location, slots }
                : e
            ),
            isModified: true,
            lastModifiedAt: Date.now(),
          })),
        
        bulkUpdateEquipmentLocations: (updates: ReadonlyArray<{ instanceId: string; location: MechLocation; slots: readonly number[] }>) =>
          set((state) => {
            // Create a map for O(1) lookup
            const updateMap = new Map(updates.map(u => [u.instanceId, u]));
            return {
              equipment: state.equipment.map(e => {
                const update = updateMap.get(e.instanceId);
                return update
                  ? { ...e, location: update.location, slots: update.slots }
                  : e;
              }),
              isModified: true,
              lastModifiedAt: Date.now(),
            };
          }),
        
        clearEquipmentLocation: (instanceId: string) => set((state) => ({
          equipment: state.equipment.map(e => 
            e.instanceId === instanceId
              ? { ...e, location: undefined, slots: undefined }
              : e
          ),
          isModified: true,
          lastModifiedAt: Date.now(),
        })),
        
        setEquipmentRearMounted: (instanceId: string, isRearMounted: boolean) => set((state) => ({
          equipment: state.equipment.map(e => 
            e.instanceId === instanceId
              ? { ...e, isRearMounted }
              : e
          ),
          isModified: true,
          lastModifiedAt: Date.now(),
        })),
        
        linkAmmo: (weaponInstanceId: string, ammoInstanceId: string | undefined) => set((state) => ({
          equipment: state.equipment.map(e => 
            e.instanceId === weaponInstanceId
              ? { ...e, linkedAmmoId: ammoInstanceId }
              : e
          ),
          isModified: true,
          lastModifiedAt: Date.now(),
        })),
        
        clearAllEquipment: () => set({
          equipment: [],
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        // =================================================================
        // Metadata Actions
        // =================================================================
        
        markModified: (modified = true) => set({
          isModified: modified,
          lastModifiedAt: Date.now(),
        }),
      }),
      {
        name: `megamek-unit-${initialState.id}`,
        storage: createJSONStorage(() => clientSafeStorage),
        skipHydration: true, // We manually hydrate after client mount
        // Only persist state, not actions
        partialize: (state) => ({
          id: state.id,
          name: state.name,
          chassis: state.chassis,
          clanName: state.clanName,
          model: state.model,
          mulId: state.mulId,
          year: state.year,
          rulesLevel: state.rulesLevel,
          tonnage: state.tonnage,
          techBase: state.techBase,
          unitType: state.unitType,
          configuration: state.configuration,
          isOmni: state.isOmni,
          techBaseMode: state.techBaseMode,
          componentTechBases: state.componentTechBases,
          selectionMemory: state.selectionMemory,
          engineType: state.engineType,
          engineRating: state.engineRating,
          gyroType: state.gyroType,
          internalStructureType: state.internalStructureType,
          cockpitType: state.cockpitType,
          heatSinkType: state.heatSinkType,
          heatSinkCount: state.heatSinkCount,
          armorType: state.armorType,
          armorTonnage: state.armorTonnage,
          armorAllocation: state.armorAllocation,
          enhancement: state.enhancement,
          jumpMP: state.jumpMP,
          jumpJetType: state.jumpJetType,
          equipment: state.equipment,
          isModified: state.isModified,
          createdAt: state.createdAt,
          lastModifiedAt: state.lastModifiedAt,
        }),
      }
    )
  );
}

/**
 * Create a new unit store from options
 */
export function createNewUnitStore(options: CreateUnitOptions): StoreApi<UnitStore> {
  const initialState = createDefaultUnitState(options);
  return createUnitStore(initialState);
}

// =============================================================================
// React Context
// =============================================================================

/**
 * Context for providing the active unit's store
 */
export const UnitStoreContext = createContext<StoreApi<UnitStore> | null>(null);

/**
 * Hook to access the unit store from context
 * 
 * This is the primary way components access unit state.
 * No tabId is needed - the context provides the active unit's store.
 * 
 * @example
 * const engineType = useUnitStore((s) => s.engineType);
 * const setEngineType = useUnitStore((s) => s.setEngineType);
 */
export function useUnitStore<T>(selector: (state: UnitStore) => T): T {
  const store = useContext(UnitStoreContext);
  
  if (!store) {
    throw new Error(
      'useUnitStore must be used within a UnitStoreProvider. ' +
      'Wrap your component tree with <UnitStoreProvider>.'
    );
  }
  
  return useStore(store, selector);
}

/**
 * Hook to get the entire unit store API
 * Useful when you need direct access to the store
 */
export function useUnitStoreApi(): StoreApi<UnitStore> {
  const store = useContext(UnitStoreContext);
  
  if (!store) {
    throw new Error(
      'useUnitStoreApi must be used within a UnitStoreProvider.'
    );
  }
  
  return store;
}

